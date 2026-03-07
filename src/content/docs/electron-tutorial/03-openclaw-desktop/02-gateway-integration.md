# 第二章：Gateway 进程管理

## 本章目标

1. 理解 OpenClaw 如何管理 Gateway 守护进程的完整生命周期
2. 深入分析 `GatewayProcessManager` 的状态机和自动恢复机制
3. 掌握 `GatewayEnvironment` 的环境检测逻辑（Node.js 版本、CLI 路径）
4. 用 Electron 的 `child_process` 实现等价的进程管理

## 学习路线图

```
状态机分析 → 启动流程 → 环境检测 → 健康检查 → 自动恢复 → Electron 实现
```

---

## 2.1 Gateway 的角色

在 OpenClaw 架构中，Gateway 是一个**独立的 Node.js 守护进程**，负责：

- AI 模型调用（LLM API、工具执行）
- 多渠道消息路由（Telegram、Discord、WhatsApp 等）
- 会话管理和持久化
- Heartbeat 和 Cron 调度
- WebSocket 服务（供桌面端和其他客户端连接）

桌面应用的职责是**管理这个进程的生命周期**并通过 WebSocket 与之通信。

```
┌──────────────────┐      WebSocket       ┌──────────────────┐
│ OpenClaw.app     │ ◀──────────────────▶ │ Gateway Daemon   │
│ (Swift/Electron) │      (RPC + Push)    │ (Node.js)        │
│                  │                       │                  │
│ • UI 渲染        │                       │ • LLM 调用       │
│ • 进程管理       │                       │ • 工具执行        │
│ • 用户交互       │                       │ • 会话管理        │
└──────────────────┘                       └──────────────────┘
         │                                          ▲
         │ launchd (macOS)                          │
         │ child_process (Electron)                  │
         └──────────────────────────────────────────┘
              进程管理
```

---

## 2.2 源码分析：GatewayProcessManager

### 2.2.1 状态机

`GatewayProcessManager` 用一个枚举定义了 Gateway 进程的所有状态：

```swift
@MainActor
@Observable
final class GatewayProcessManager {
    static let shared = GatewayProcessManager()

    enum Status: Equatable {
        case stopped
        case starting
        case running(details: String?)
        case attachedExisting(details: String?)
        case failed(String)
    }

    private(set) var status: Status = .stopped {
        didSet { CanvasManager.shared.refreshDebugStatus() }
    }
    private var desiredActive = false
}
```

状态转换图：

```
                        setActive(true)
              ┌────────────────────────────┐
              │                            ▼
          ┌───────┐                   ┌──────────┐
          │stopped│                   │ starting  │
          └───┬───┘                   └────┬──────┘
              ▲                            │
   setActive  │               ┌────────────┼────────────┐
    (false)   │               │            │            │
              │               ▼            ▼            ▼
          ┌───┴───┐    ┌──────────┐  ┌──────────┐  ┌────────┐
          │stopped│◀───│ attached │  │ running  │  │ failed │
          └───────┘    │ Existing │  │          │  │        │
                       └──────────┘  └──────────┘  └────┬───┘
                                                        │
                                          重试 ─────────┘
```

**关键点**：`attachedExisting` 和 `running` 是两种不同的"运行中"状态：
- `running`：由本 App 通过 launchd 启动的新进程
- `attachedExisting`：已有 Gateway 在运行（可能是 CLI 启动的），直接附着上去

### 2.2.2 完整启动流程

`setActive(true)` 触发的完整流程：

```swift
func setActive(_ active: Bool) {
    // 远程模式不启动本地 Gateway
    if CommandResolver.connectionModeIsRemote() {
        self.desiredActive = false
        self.stop()
        self.status = .stopped
        return
    }
    self.desiredActive = active
    self.refreshEnvironmentStatus()
    if active {
        self.startIfNeeded()
    } else {
        self.stop()
    }
}
```

```
setActive(true)
  │
  ├─ 检查是否远程模式 → 是 → 跳过，stop()
  │
  ├─ refreshEnvironmentStatus()  ← 异步检查环境
  │
  └─ startIfNeeded()
      │
      ├─ 检查 desiredActive → false → 返回
      ├─ 检查是否远程模式 → 是 → status = .stopped
      ├─ 检查当前状态 → starting/running/attached → 返回（防重入）
      │
      ├─ status = .starting
      │
      └─ Task (异步)
          │
          ├─ attachExistingGatewayIfAvailable()
          │   │
          │   ├─ PortGuardian.describe(port) → 检查端口是否有进程
          │   │
          │   ├─ 尝试 3 次 health 请求（每次间隔 250ms）
          │   │   │
          │   │   ├─ 成功 → status = .attachedExisting
          │   │   │         refreshControlChannelIfNeeded()
          │   │   │         return true
          │   │   │
          │   │   └─ 失败 + 有监听者 → status = .failed
          │   │                        return true
          │   │
          │   └─ 无监听者 → return false（继续到 enableLaunchdGateway）
          │
          └─ enableLaunchdGateway()
              │
              ├─ GatewayEnvironment.resolveGatewayCommand()
              │   检查 Node.js + openclaw CLI 是否可用
              │
              ├─ 命令解析失败 → status = .failed
              │
              ├─ 检查 launchd 是否被禁用 → status = .failed
              │
              ├─ GatewayLaunchAgentManager.set(enabled: true)
              │   写入 plist 并加载到 launchd
              │
              └─ 轮询等待 Gateway 就绪（最多 6 秒）
                  │
                  ├─ health 请求成功 → status = .running
                  │                    refreshControlChannelIfNeeded()
                  │
                  └─ 超时 → status = .failed("did not start in time")
```

### 2.2.3 "先附着后启动" 策略

这是 OpenClaw 的一个重要设计：**先尝试连接已有 Gateway，再考虑启动新的**。

```swift
private func attachExistingGatewayIfAvailable() async -> Bool {
    let port = GatewayEnvironment.gatewayPort()
    let instance = await PortGuardian.shared.describe(port: port)
    let hasListener = instance != nil

    for attempt in 0..<(hasListener ? 3 : 1) {
        do {
            let data = try await self.connection.requestRaw(method: .health, timeoutMs: 2000)
            let snap = decodeHealthSnapshot(from: data)
            let details = self.describe(details: instanceText, port: port, snap: snap)
            self.status = .attachedExisting(details: details)
            return true
        } catch {
            if attempt < 2, hasListener {
                try? await Task.sleep(nanoseconds: 250_000_000) // 250ms 重试
                continue
            }
            // ...
        }
    }
    return false
}
```

**为什么这样设计？**

1. 用户可能从 CLI 启动了 `openclaw gateway start`，App 不应该再启动一个
2. Gateway 可能在更新后重启，App 重新附着比重新启动更快
3. 多个 App 实例（如测试版和正式版）可以共享同一个 Gateway

### 2.2.4 PortGuardian 端口检查

在尝试附着之前，OpenClaw 先用 `PortGuardian` 检查端口上是否有进程在监听：

```swift
let instance = await PortGuardian.shared.describe(port: port)
```

`PortGuardian` 使用 `lsof -iTCP:$port -sTCP:LISTEN` 来发现端口占用者。如果端口被非 Gateway 进程占用（如另一个开发服务器），OpenClaw 能给出有意义的错误信息。

### 2.2.5 认证失败检测

```swift
private func isGatewayAuthFailure(_ error: Error) -> Bool {
    if let urlError = error as? URLError, urlError.code == .dataNotAllowed {
        return true
    }
    let ns = error as NSError
    if ns.domain == "Gateway", ns.code == 1008 { return true }
    let lower = ns.localizedDescription.lowercased()
    return lower.contains("unauthorized") || lower.contains("auth")
}
```

当 Gateway 设置了 `auth.token` 但 App 的 token 不匹配时，WebSocket 握手会返回 1008 错误。OpenClaw 专门检测这种情况并给出友好提示。

---

## 2.3 源码分析：GatewayEnvironment

### 2.3.1 环境检测

`GatewayEnvironment.check()` 检查运行 Gateway 所需的环境：

```swift
static func check() -> GatewayEnvironmentStatus {
    let expected = self.expectedGatewayVersion()
    let projectRoot = CommandResolver.projectRoot()
    let projectEntrypoint = CommandResolver.gatewayEntrypoint(in: projectRoot)

    // 1. 检查 Node.js
    switch RuntimeLocator.resolve(searchPaths: CommandResolver.preferredPaths()) {
    case let .failure(err):
        return GatewayEnvironmentStatus(kind: .missingNode, ...)

    case let .success(runtime):
        // 2. 检查 openclaw CLI
        let gatewayBin = CommandResolver.openclawExecutable()
        if gatewayBin == nil, projectEntrypoint == nil {
            return GatewayEnvironmentStatus(kind: .missingGateway, ...)
        }

        // 3. 版本兼容性检查
        let installed = gatewayBin.flatMap { self.readGatewayVersion(binary: $0) }
        if let expected, let installed, !installed.compatible(with: expected) {
            return GatewayEnvironmentStatus(kind: .incompatible(...), ...)
        }

        return GatewayEnvironmentStatus(kind: .ok, ...)
    }
}
```

检测流程：

```
环境检测
  │
  ├─ 1. Node.js 存在？
  │     └─ 否 → missingNode
  │
  ├─ 2. openclaw CLI 存在？
  │     ├─ 全局安装 (npm -g)
  │     └─ 本地项目 (package.json)
  │     └─ 都没有 → missingGateway
  │
  └─ 3. 版本兼容？
        ├─ App 版本 vs CLI 版本
        ├─ Semver 兼容性检查 (同 major + >= required)
        └─ 不兼容 → incompatible
```

### 2.3.2 命令解析

```swift
static func resolveGatewayCommand() -> GatewayCommandResolution {
    let status = self.check()
    guard case .ok = status.kind else {
        return GatewayCommandResolution(status: status, command: nil)
    }

    let port = self.gatewayPort()
    if let gatewayBin = CommandResolver.openclawExecutable() {
        let bind = self.preferredGatewayBind() ?? "loopback"
        return GatewayCommandResolution(
            status: status,
            command: [gatewayBin, "gateway-daemon", "--port", "\(port)", "--bind", bind])
    }
    // 本地开发模式：node ./src/gateway-daemon.js
    // ...
}
```

最终解析出的命令类似：
```
/opt/homebrew/bin/openclaw gateway-daemon --port 18789 --bind loopback
```

### 2.3.3 端口配置优先级

```swift
static func gatewayPort() -> Int {
    // 1. 环境变量（最高优先级）
    if let raw = ProcessInfo.processInfo.environment["OPENCLAW_GATEWAY_PORT"] {
        if let parsed = Int(raw), parsed > 0 { return parsed }
    }
    // 2. 配置文件
    if let configPort = OpenClawConfigFile.gatewayPort(), configPort > 0 {
        return configPort
    }
    // 3. UserDefaults
    let stored = UserDefaults.standard.integer(forKey: "gatewayPort")
    return stored > 0 ? stored : 18789  // 4. 默认值
}
```

---

## 2.4 源码分析：launchd 管理

### 2.4.1 macOS launchd vs 直接 spawn

OpenClaw 在 macOS 上使用 **launchd**（而非 `Process()`）来管理 Gateway：

```
launchd 优势：
├── Gateway 即使 App 退出也能继续运行
├── 系统级崩溃恢复（KeepAlive）
├── 标准化的日志收集（stdout/stderr → 文件）
└── 系统级的资源管理

直接 spawn 的问题：
├── App 退出 = Gateway 死亡
├── Heartbeat/Cron 需要 Gateway 存活
└── 子进程管理复杂（僵尸进程、信号处理）
```

launchd 通过 plist 文件控制 Gateway，典型配置：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.gateway</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/openclaw</string>
        <string>gateway-daemon</string>
        <string>--port</string>
        <string>18789</string>
        <string>--bind</string>
        <string>loopback</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/xxx/Library/Logs/OpenClaw/gateway.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/xxx/Library/Logs/OpenClaw/gateway.log</string>
</dict>
</plist>
```

### 2.4.2 日志收集

```swift
private func appendLog(_ chunk: String) {
    self.log.append(chunk)
    if self.log.count > self.logLimit {  // logLimit = 20000 字符
        self.log = String(self.log.suffix(self.logLimit))
    }
}
```

这是一个**环形缓冲区**的简化实现：当日志超过 20000 字符时，截取最后 20000 字符。用于在 UI 中显示最近的日志。

---

## 2.5 设计决策

### 2.5.1 "先附着后启动" 的价值

```
场景 1: 开发者通过 CLI 启动 Gateway
  用户: openclaw gateway start
  App:  检测到端口有进程 → attachExisting → 不启动新的

场景 2: App 重启
  App:  之前通过 launchd 启动的 Gateway 仍在运行
  App:  检测到端口有进程 → attachExisting → 秒级恢复

场景 3: 全新安装
  App:  端口无进程 → enableLaunchdGateway → 启动新 Gateway
```

### 2.5.2 为什么状态机不用 Swift enum + associated value？

OpenClaw 的 `Status` enum 确实使用了关联值（`running(details:)`），但状态转换逻辑是命令式的（直接赋值 `self.status = .running(...)`）。这比形式化的状态机库更简单直接，适合这种线性的状态流。

---

## 2.6 Electron 实现

### 2.6.1 GatewayProcessManager

```typescript
// src/main/gateway/process-manager.ts
import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { GatewayConnection } from './connection';
import { GatewayEnvironment } from './environment';
import { AppState } from '../app-state';

type Status =
  | { type: 'stopped' }
  | { type: 'starting' }
  | { type: 'running'; details?: string }
  | { type: 'attachedExisting'; details?: string }
  | { type: 'failed'; reason: string };

export class GatewayProcessManager extends EventEmitter {
  private _status: Status = { type: 'stopped' };
  private desiredActive = false;
  private gatewayProcess: ChildProcess | null = null;
  private log = '';
  private readonly LOG_LIMIT = 20000;

  constructor(
    private appState: AppState,
    private connection: GatewayConnection,
  ) {
    super();
  }

  get status(): Status { return this._status; }

  private setStatus(status: Status): void {
    this._status = status;
    this.emit('status-changed', status);
  }

  async setActive(active: boolean): Promise<void> {
    if (this.appState.connectionMode === 'remote') {
      this.desiredActive = false;
      this.stop();
      this.setStatus({ type: 'stopped' });
      return;
    }

    this.desiredActive = active;

    if (active) {
      await this.startIfNeeded();
    } else {
      this.stop();
    }
  }

  private async startIfNeeded(): Promise<void> {
    if (!this.desiredActive) return;
    if (this.appState.connectionMode === 'remote') {
      this.setStatus({ type: 'stopped' });
      return;
    }

    // 防重入
    const s = this._status.type;
    if (s === 'starting' || s === 'running' || s === 'attachedExisting') return;

    this.setStatus({ type: 'starting' });

    // 先尝试附着已有 Gateway
    const attached = await this.attachExistingIfAvailable();
    if (attached) return;

    // 启动新 Gateway
    await this.spawnGateway();
  }

  /**
   * 对应 attachExistingGatewayIfAvailable。
   * 尝试连接已运行的 Gateway。
   */
  private async attachExistingIfAvailable(): Promise<boolean> {
    const port = GatewayEnvironment.gatewayPort();

    // 尝试最多 3 次 health 请求
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await this.connection.request('health', null, 2000);
        const details = `port ${port}`;
        this.setStatus({ type: 'attachedExisting', details });
        this.appendLog(`[gateway] using existing instance on port ${port}\n`);
        return true;
      } catch (err) {
        if (attempt < 2) {
          await this.sleep(250);
          continue;
        }
        // 最后一次失败，检查端口是否有进程
        const hasProcess = await this.checkPortInUse(port);
        if (hasProcess) {
          this.setStatus({ type: 'failed', reason: `Port ${port} in use but health check failed` });
          return true; // 不要继续尝试 spawn
        }
        return false; // 端口空闲，继续 spawn
      }
    }
    return false;
  }

  /**
   * 对应 enableLaunchdGateway。
   *
   * Electron 版不使用 launchd，而是用 child_process.spawn。
   * 这是最大的架构差异之一。
   */
  private async spawnGateway(): Promise<void> {
    // 1. 解析命令
    const resolution = GatewayEnvironment.resolveCommand();
    if (!resolution.command) {
      this.setStatus({ type: 'failed', reason: resolution.status.message });
      return;
    }

    const [cmd, ...args] = resolution.command;
    this.appendLog(`[gateway] spawning: ${resolution.command.join(' ')}\n`);

    // 2. 启动子进程
    try {
      this.gatewayProcess = spawn(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // 确保 Node.js 和 openclaw 可被发现
          PATH: GatewayEnvironment.buildPath(),
        },
        detached: false, // 跟随主进程退出
      });

      // 日志收集
      this.gatewayProcess.stdout?.on('data', (chunk: Buffer) => {
        this.appendLog(chunk.toString());
      });
      this.gatewayProcess.stderr?.on('data', (chunk: Buffer) => {
        this.appendLog(chunk.toString());
      });

      this.gatewayProcess.on('exit', (code) => {
        this.appendLog(`[gateway] process exited with code ${code}\n`);
        if (this.desiredActive) {
          this.setStatus({ type: 'failed', reason: `Gateway exited (code ${code})` });
          // 自动重启
          setTimeout(() => this.startIfNeeded(), 3000);
        } else {
          this.setStatus({ type: 'stopped' });
        }
        this.gatewayProcess = null;
      });

    } catch (err: any) {
      this.setStatus({ type: 'failed', reason: err.message });
      return;
    }

    // 3. 等待 Gateway 就绪（对应 Swift 版的 6 秒轮询）
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      if (!this.desiredActive) return;
      try {
        await this.connection.request('health', null, 1500);
        this.setStatus({ type: 'running', details: `pid ${this.gatewayProcess?.pid}` });
        return;
      } catch {
        await this.sleep(400);
      }
    }

    this.setStatus({ type: 'failed', reason: 'Gateway did not start in time' });
  }

  stop(): void {
    this.desiredActive = false;
    if (this.gatewayProcess) {
      this.gatewayProcess.kill('SIGTERM');
      this.gatewayProcess = null;
    }
    this.setStatus({ type: 'stopped' });
  }

  getLog(): string { return this.log; }

  clearLog(): void { this.log = ''; }

  private appendLog(chunk: string): void {
    this.log += chunk;
    if (this.log.length > this.LOG_LIMIT) {
      this.log = this.log.slice(-this.LOG_LIMIT);
    }
    this.emit('log', chunk);
  }

  private async checkPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      server.once('error', () => resolve(true));
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      server.listen(port, '127.0.0.1');
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 2.6.2 GatewayEnvironment

```typescript
// src/main/gateway/environment.ts
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface EnvironmentStatus {
  kind: 'ok' | 'missingNode' | 'missingGateway' | 'incompatible' | 'error';
  nodeVersion?: string;
  gatewayVersion?: string;
  message: string;
}

interface CommandResolution {
  status: EnvironmentStatus;
  command: string[] | null;
}

export class GatewayEnvironment {
  private static DEFAULT_PORT = 18789;

  static gatewayPort(): number {
    // 优先级：环境变量 > 配置文件 > 默认值
    const envPort = process.env.OPENCLAW_GATEWAY_PORT;
    if (envPort) {
      const parsed = parseInt(envPort, 10);
      if (parsed > 0) return parsed;
    }
    return this.DEFAULT_PORT;
  }

  static check(): EnvironmentStatus {
    // 1. 检查 Node.js
    const nodeVersion = this.getNodeVersion();
    if (!nodeVersion) {
      return { kind: 'missingNode', message: 'Node.js not found in PATH' };
    }

    // 2. 检查 openclaw CLI
    const cliBin = this.findOpenClawBin();
    if (!cliBin) {
      return {
        kind: 'missingGateway',
        nodeVersion,
        message: 'openclaw CLI not found; run: npm install -g openclaw',
      };
    }

    // 3. 版本兼容性
    const cliVersion = this.getCliVersion(cliBin);

    return {
      kind: 'ok',
      nodeVersion,
      gatewayVersion: cliVersion || 'unknown',
      message: `Node ${nodeVersion}; gateway ${cliVersion || 'unknown'}`,
    };
  }

  static resolveCommand(): CommandResolution {
    const status = this.check();
    if (status.kind !== 'ok') {
      return { status, command: null };
    }

    const port = this.gatewayPort();
    const cliBin = this.findOpenClawBin()!;
    return {
      status,
      command: [cliBin, 'gateway-daemon', '--port', `${port}`, '--bind', 'loopback'],
    };
  }

  static buildPath(): string {
    const extra = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      `${process.env.HOME}/.nvm/versions/node`,
    ].filter(existsSync);
    return [...extra, process.env.PATH].filter(Boolean).join(':');
  }

  private static getNodeVersion(): string | null {
    try {
      return execSync('node --version', { encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  }

  private static findOpenClawBin(): string | null {
    try {
      const result = execSync('which openclaw', { encoding: 'utf8' }).trim();
      return result || null;
    } catch {
      return null;
    }
  }

  private static getCliVersion(bin: string): string | null {
    try {
      return execSync(`${bin} --version`, { encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  }
}
```

---

## 2.7 设计决策：launchd vs child_process

| 维度 | macOS launchd | Electron child_process |
|------|---------------|----------------------|
| Gateway 生命周期 | 独立于 App | 跟随 App（可配置 detached） |
| 崩溃恢复 | 系统级 KeepAlive | 需要自己实现 |
| 日志 | 自动写文件 | 需要自己 pipe |
| 跨平台 | 仅 macOS | 全平台 |
| 复杂度 | plist 文件管理 | spawn + 事件监听 |
| 启动速度 | 系统缓存 plist | 每次重新 resolve |

### Electron 版的折中方案

对于 Electron 版，我们选择 **detached 模式 + PID 文件**：

```typescript
// detached: true 让 Gateway 独立于 App
this.gatewayProcess = spawn(cmd, args, {
  detached: true,
  stdio: ['ignore', logFd, logFd],
});
// unref 允许 App 退出而 Gateway 继续运行
this.gatewayProcess.unref();
// 写入 PID 文件，下次启动时可以附着
fs.writeFileSync(pidFile, String(this.gatewayProcess.pid));
```

这样可以：
1. App 退出后 Gateway 继续运行
2. App 重启时通过 PID 文件找到已有进程
3. 接近 launchd 的行为

---

## 2.8 深入理解：进程管理的底层原理

### 2.8.1 端口检查的正确方式

OpenClaw 用 `lsof` 检查端口占用。在 Node.js 中有更优雅的方式：

```typescript
// 方法 1: 尝试绑定端口
async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.once('error', () => resolve(false)); // 端口被占用
    server.once('listening', () => {
      server.close();
      resolve(true); // 端口可用
    });
    server.listen(port, '127.0.0.1');
  });
}

// 方法 2: 尝试连接（检查是否有服务在监听）
async function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = require('net').createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}
```

### 2.8.2 信号处理

```typescript
// Gateway 进程的优雅退出
gatewayProcess.on('exit', (code, signal) => {
  if (signal === 'SIGTERM') {
    // 正常终止（我们 kill 的）
  } else if (code !== 0) {
    // 异常退出，需要重启
  }
});

// App 退出时清理
app.on('before-quit', () => {
  if (gatewayProcess && !gatewayProcess.killed) {
    gatewayProcess.kill('SIGTERM');
  }
});

// 防止 App 崩溃后 Gateway 变成孤儿进程
process.on('uncaughtException', () => {
  gatewayProcess?.kill('SIGTERM');
  process.exit(1);
});
```

---

## 2.9 常见问题与陷阱

### Q1: Gateway 端口被占用怎么办？
OpenClaw 的方案：先检查是否是 Gateway 在监听（通过 health 请求），如果是就附着；如果是其他进程就报错。Electron 版应该同样实现这个逻辑。

### Q2: Node.js 路径在哪里？
macOS 上 Node.js 可能安装在 `/opt/homebrew/bin`（Homebrew）、`/usr/local/bin`、`~/.nvm/...` 等位置。GUI 应用的 PATH 通常不包含这些路径，需要显式构建。OpenClaw 的 `RuntimeLocator` 和 `CommandResolver` 就是解决这个问题的。

### Q3: Electron 的 `detached` 进程如何管理？
```typescript
// 写 PID 文件
const pidPath = path.join(app.getPath('userData'), 'gateway.pid');
fs.writeFileSync(pidPath, String(proc.pid));

// 下次启动时检查
function findExistingGateway(): number | null {
  if (!fs.existsSync(pidPath)) return null;
  const pid = parseInt(fs.readFileSync(pidPath, 'utf8'), 10);
  try {
    process.kill(pid, 0); // 检查进程是否存在（不发信号）
    return pid;
  } catch {
    fs.unlinkSync(pidPath);
    return null;
  }
}
```

### Q4: 为什么健康检查要轮询而不是等事件？
Gateway 启动需要时间（加载模块、建立连接）。没有可靠的方式知道它"何时就绪"，所以用 health 端点轮询是最稳健的方式。OpenClaw 给了 6 秒超时，每 400ms 检查一次。

---

## 2.10 完整代码示例：自动恢复

```typescript
class GatewayProcessManager {
  // ... 上面的代码 ...

  /**
   * 自动恢复机制。
   * 当检测到 Gateway 不可达时，按策略重启。
   */
  async autoRecover(): Promise<void> {
    if (!this.desiredActive) return;

    this.appendLog('[gateway] auto-recovery triggered\n');

    // 先尝试重新附着
    const attached = await this.attachExistingIfAvailable();
    if (attached) {
      this.appendLog('[gateway] auto-recovery: re-attached existing\n');
      return;
    }

    // 清理旧进程
    if (this.gatewayProcess) {
      this.gatewayProcess.kill('SIGTERM');
      this.gatewayProcess = null;
    }

    // 指数退避重试
    const delays = [1000, 2000, 5000, 10000];
    for (const delay of delays) {
      if (!this.desiredActive) return;

      await this.sleep(delay);
      this.appendLog(`[gateway] auto-recovery: retrying after ${delay}ms\n`);

      await this.spawnGateway();
      if (this._status.type === 'running') {
        this.appendLog('[gateway] auto-recovery: succeeded\n');
        return;
      }
    }

    this.appendLog('[gateway] auto-recovery: exhausted retries\n');
    this.setStatus({ type: 'failed', reason: 'Auto-recovery failed after multiple retries' });
  }
}
```

---

## 2.11 章节小结

| 关键概念 | OpenClaw 实现 | Electron 等价 |
|---------|-------------|-------------|
| 进程管理 | launchd plist | child_process.spawn |
| 状态机 | enum Status + @Observable | Status 类型 + EventEmitter |
| 启动策略 | 先附着后启动 | 相同（PID 文件辅助） |
| 环境检测 | RuntimeLocator + CommandResolver | which + execSync |
| 版本检查 | Semver.parse + compatible() | semver npm 包 |
| 端口检查 | PortGuardian (lsof) | net.createServer 探测 |
| 日志收集 | 环形缓冲区 (20K chars) | 相同 |
| 健康检查 | health RPC 轮询 (6s timeout) | 相同 |
| 进程独立 | launchd KeepAlive | detached + unref + PID 文件 |

下一章将深入 `GatewayConnection`，解析 WebSocket RPC 协议的完整实现。
