# 第三章：WebSocket 通信层

## 本章目标

1. 理解 `GatewayConnection` actor 的完整设计——请求-响应、推送订阅、配置热切换
2. 掌握 WebSocket RPC 协议的所有 Method 和数据流
3. 学会实现渐进重试的自动恢复机制
4. 用 `ws` 库构建等价的 Electron WebSocket 客户端

## 学习路线图

```
actor 设计 → RPC 协议 → 请求-响应 → 推送订阅 → 自动恢复 → Electron 实现
```

---

## 3.1 为什么用 actor？

`GatewayConnection` 是 OpenClaw 中唯一使用 Swift `actor`（而非 `@MainActor`）的核心类：

```swift
actor GatewayConnection {
    static let shared = GatewayConnection()
    // ...
}
```

**原因**：WebSocket 通信是 I/O 密集型操作，不应阻塞主线程。`actor` 让 `GatewayConnection` 拥有独立的隔离域——所有 WebSocket 操作在后台线程执行，但 actor 保证同一时间只有一个方法在执行（串行化）。

```
┌─── Main Thread (@MainActor) ────┐    ┌─── actor 隔离域 ──────┐
│                                  │    │                        │
│  AppState                        │    │  GatewayConnection     │
│  GatewayProcessManager           │    │  ├── client (WS)       │
│  ControlChannel                  │    │  ├── subscribers       │
│  WebChatManager                  │    │  ├── lastSnapshot      │
│                                  │    │  └── pending requests  │
│  await connection.request(...)  ─┼───▶│  → 在 actor 线程执行   │
│                                  │    │                        │
└──────────────────────────────────┘    └────────────────────────┘
```

---

## 3.2 源码分析：RPC 协议

### 3.2.1 Method 枚举

`GatewayConnection.Method` 定义了所有 RPC 方法：

```swift
enum Method: String, Sendable {
    // 核心
    case agent                          // 发送 agent 消息
    case status                         // 获取状态
    case health                         // 健康检查
    case setHeartbeats = "set-heartbeats"
    case systemEvent = "system-event"

    // 配置
    case configGet = "config.get"
    case configSet = "config.set"
    case configPatch = "config.patch"
    case configSchema = "config.schema"

    // 向导
    case wizardStart = "wizard.start"
    case wizardNext = "wizard.next"
    case wizardCancel = "wizard.cancel"
    case wizardStatus = "wizard.status"

    // 语音
    case talkConfig = "talk.config"
    case talkMode = "talk.mode"

    // 认证
    case webLoginStart = "web.login.start"
    case webLoginWait = "web.login.wait"
    case channelsLogout = "channels.logout"
    case channelsStatus = "channels.status"

    // 模型
    case modelsList = "models.list"

    // 聊天
    case chatHistory = "chat.history"
    case chatSend = "chat.send"
    case chatAbort = "chat.abort"
    case sessionsPreview = "sessions.preview"

    // 技能
    case skillsStatus = "skills.status"
    case skillsInstall = "skills.install"
    case skillsUpdate = "skills.update"

    // 语音唤醒
    case voicewakeGet = "voicewake.get"
    case voicewakeSet = "voicewake.set"

    // 节点配对
    case nodePairApprove = "node.pair.approve"
    case nodePairReject = "node.pair.reject"
    case devicePairApprove = "device.pair.approve"
    case devicePairReject = "device.pair.reject"

    // 执行审批
    case execApprovalResolve = "exec.approval.resolve"

    // Cron 任务
    case cronList = "cron.list"
    case cronRuns = "cron.runs"
    case cronRun = "cron.run"
    case cronRemove = "cron.remove"
    case cronUpdate = "cron.update"
    case cronAdd = "cron.add"
    case cronStatus = "cron.status"
}
```

### 3.2.2 RPC 请求-响应模型

WebSocket 上的 RPC 协议是**基于 JSON 的请求-响应**：

```
客户端 → Gateway:
{
  "id": "uuid-123",
  "method": "health",
  "params": {}
}

Gateway → 客户端:
{
  "id": "uuid-123",
  "result": { "ok": true, "ts": 1706000000, ... }
}

或错误:
{
  "id": "uuid-123",
  "error": { "code": 1008, "message": "unauthorized" }
}
```

底层实现在 `GatewayChannelActor` 中（`GatewayConnection` 委托给它）。每个请求生成唯一 ID，存入 `pending` Map，收到同 ID 的响应时 resolve 对应的 Promise。

### 3.2.3 推送模型

Gateway 还会主动推送事件（不需要客户端请求）：

```
Gateway → 客户端 (snapshot):
{
  "type": "hello",
  "snapshot": { "health": {...}, "sessions": {...}, ... },
  "server": { "version": "1.2.3", ... },
  "canvasHostUrl": "http://localhost:18789"
}

Gateway → 客户端 (event):
{
  "type": "event",
  "event": "agent",
  "payload": { "runId": "...", "stream": "tool", "data": {...} }
}

Gateway → 客户端 (event):
{
  "type": "event",
  "event": "chat",
  "payload": { "sessionKey": "main", "messages": [...] }
}
```

### 3.2.4 推送分发（Subscriber 模式）

```swift
private var subscribers: [UUID: AsyncStream<GatewayPush>.Continuation] = [:]
private var lastSnapshot: HelloOk?

func subscribe(bufferingNewest: Int = 100) -> AsyncStream<GatewayPush> {
    let id = UUID()
    let snapshot = self.lastSnapshot
    return AsyncStream(bufferingPolicy: .bufferingNewest(bufferingNewest)) { continuation in
        // 立即发送最新快照（如果有）
        if let snapshot {
            continuation.yield(.snapshot(snapshot))
        }
        self.subscribers[id] = continuation
        continuation.onTermination = { @Sendable _ in
            Task { await connection.removeSubscriber(id) }
        }
    }
}

private func broadcast(_ push: GatewayPush) {
    if case let .snapshot(snapshot) = push {
        self.lastSnapshot = snapshot  // 缓存最新快照
    }
    for (_, continuation) in self.subscribers {
        continuation.yield(push)
    }
}
```

**设计要点**：

1. **AsyncStream**：Swift 的异步流，订阅者通过 `for await` 消费事件
2. **缓冲策略**：`bufferingNewest(100)` 只保留最新 100 条，避免慢消费者内存溢出
3. **首次快照**：新订阅者立即收到最后一次 snapshot，不需要等下一次推送
4. **自动清理**：AsyncStream 被取消时自动移除订阅

---

## 3.3 源码分析：配置热切换

当用户修改连接配置（URL/token）时，`GatewayConnection` 需要重建 WebSocket 连接：

```swift
private func configure(url: URL, token: String?, password: String?) async {
    // 只在配置实际变化时重建
    if self.client != nil, self.configuredURL == url, self.configuredToken == token,
       self.configuredPassword == password
    {
        return  // 没变，直接返回
    }
    // 关闭旧连接
    if let client {
        await client.shutdown()
    }
    // 清除缓存的快照
    self.lastSnapshot = nil
    // 创建新连接
    self.client = GatewayChannelActor(
        url: url,
        token: token,
        password: password,
        session: self.sessionBox,
        pushHandler: { [weak self] push in
            await self?.handle(push: push)
        })
    self.configuredURL = url
    self.configuredToken = token
    self.configuredPassword = password
}
```

配置来自 `configProvider` 闭包，默认实现是 `GatewayEndpointStore.shared.requireConfig()`，它从配置文件或 UserDefaults 读取。

---

## 3.4 源码分析：自动恢复机制

这是 `GatewayConnection` 最关键的设计之一。当请求失败时，根据连接模式采用不同的恢复策略：

```swift
func request(method: String, params: [String: AnyCodable]?, timeoutMs: Double? = nil) async throws -> Data {
    let cfg = try await self.configProvider()
    await self.configure(url: cfg.url, token: cfg.token, password: cfg.password)
    guard let client else { throw ... }

    do {
        return try await client.request(method: method, params: params, timeoutMs: timeoutMs)
    } catch {
        // 请求失败 → 根据模式恢复
        let mode = await MainActor.run { AppStateStore.shared.connectionMode }
        switch mode {
        case .local:
            // 本地模式：启动 Gateway + 渐进重试
            await MainActor.run { GatewayProcessManager.shared.setActive(true) }
            var lastError: Error = error
            for delayMs in [150, 400, 900] {
                try await Task.sleep(nanoseconds: UInt64(delayMs) * 1_000_000)
                do {
                    return try await client.request(method: method, params: params, timeoutMs: timeoutMs)
                } catch {
                    lastError = error
                }
            }
            throw lastError

        case .remote:
            // 远程模式：重建 SSH 隧道 + 渐进重试
            await RemoteTunnelManager.shared.stopAll()
            _ = try await GatewayEndpointStore.shared.ensureRemoteControlTunnel()
            var lastError: Error = error
            for delayMs in [150, 400, 900] {
                try await Task.sleep(nanoseconds: UInt64(delayMs) * 1_000_000)
                do {
                    let cfg = try await self.configProvider()
                    await self.configure(url: cfg.url, token: cfg.token, password: cfg.password)
                    return try await self.client!.request(...)
                } catch {
                    lastError = error
                }
            }
            throw lastError

        case .unconfigured:
            throw error
        }
    }
}
```

恢复策略时序图：

```
本地模式自动恢复:
  request 失败
    │
    ├─ GatewayProcessManager.setActive(true)  ← 确保 Gateway 启动
    │
    ├─ 等待 150ms → 重试 ── 成功 → 返回
    │                     └── 失败
    ├─ 等待 400ms → 重试 ── 成功 → 返回
    │                     └── 失败
    ├─ 等待 900ms → 重试 ── 成功 → 返回
    │                     └── 失败
    └─ 抛出最后一个错误

远程模式自动恢复:
  request 失败
    │
    ├─ RemoteTunnelManager.stopAll()            ← 停止旧隧道
    ├─ ensureRemoteControlTunnel()              ← 建立新 SSH 隧道
    │
    ├─ 等待 150ms → reconfigure → 重试 ...
    ├─ 等待 400ms → reconfigure → 重试 ...
    └─ 等待 900ms → reconfigure → 重试 ...
```

**为什么是 [150, 400, 900]ms？**

这是一个**渐进退避**策略：
- 150ms：Gateway 可能只是临时不可达（网络抖动），快速重试
- 400ms：Gateway 可能在重启，等稍微久一点
- 900ms：给 Gateway 充分时间完成启动

总等待时间 1450ms，不到 2 秒。如果 2 秒后还不行，那确实有问题需要报告给用户。

---

## 3.5 源码分析：Session Key 规范化

`canonicalizeSessionKey` 处理多种 session key 别名：

```swift
private func canonicalizeSessionKey(_ raw: String) -> String {
    let trimmed = raw.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return trimmed }
    guard let defaults = self.lastSnapshot?.snapshot.sessiondefaults else { return trimmed }
    let mainSessionKey = self.sessionDefaultString(defaults, key: "mainSessionKey")
    guard !mainSessionKey.isEmpty else { return trimmed }
    let mainKey = self.sessionDefaultString(defaults, key: "mainKey")
    let defaultAgentId = self.sessionDefaultString(defaults, key: "defaultAgentId")

    // 以下别名都映射到 mainSessionKey
    let isMainAlias =
        trimmed == "main" ||
        (!mainKey.isEmpty && trimmed == mainKey) ||
        trimmed == mainSessionKey ||
        (!defaultAgentId.isEmpty &&
            (trimmed == "agent:\(defaultAgentId):main" ||
                (mainKey.isEmpty == false && trimmed == "agent:\(defaultAgentId):\(mainKey)")))

    return isMainAlias ? mainSessionKey : trimmed
}
```

**为什么需要这个？**

OpenClaw 支持多种方式引用"主会话"：
- `"main"` — 最简单的名字
- `mainKey` — 配置中定义的键
- `mainSessionKey` — 完整的内部键（如 `"agent:abc123:main"`）
- `"agent:{agentId}:main"` — 带 agent ID 的完整格式

这个方法将所有别名统一为内部标准形式，避免创建重复会话。

---

## 3.6 Electron 实现

### 3.6.1 完整的 WebSocket 客户端

```typescript
// src/main/gateway/connection.ts
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { AppState } from '../app-state';

interface RpcRequest {
  id: string;
  method: string;
  params?: Record<string, any>;
}

interface RpcResponse {
  id?: string;
  result?: any;
  error?: { code: number; message: string };
}

interface GatewayPush {
  type: 'hello' | 'event' | 'seqGap';
  event?: string;
  payload?: any;
  snapshot?: any;
  server?: Record<string, any>;
  canvasHostUrl?: string;
}

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface GatewayConfig {
  url: string;
  token?: string;
  password?: string;
}

/**
 * 对应 GatewayConnection actor。
 *
 * 核心差异：
 * - Swift actor 保证串行访问；Node.js 单线程天然串行
 * - Swift 用 AsyncStream 分发推送；这里用 EventEmitter
 * - 自动恢复逻辑完全复刻 Swift 版
 */
export class GatewayConnection extends EventEmitter {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private configuredUrl: string | null = null;
  private configuredToken: string | null = null;
  private lastSnapshot: any = null;
  private reconnecting = false;

  constructor(private appState: AppState) {
    super();
  }

  /** 对应 Swift 版的 requestRaw */
  async request(
    method: string,
    params: Record<string, any> | null,
    timeoutMs = 15000,
  ): Promise<any> {
    await this.ensureConnected();

    try {
      return await this.sendRequest(method, params, timeoutMs);
    } catch (error) {
      // 自动恢复（对应 Swift 版的 catch 块）
      return this.autoRecover(method, params, timeoutMs, error as Error);
    }
  }

  /** 对应 Swift 版的 subscribe */
  getLastSnapshot(): any {
    return this.lastSnapshot;
  }

  /** 对应 Swift 版的 shutdown */
  shutdown(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.configuredUrl = null;
    this.configuredToken = null;
    this.lastSnapshot = null;
    // Reject 所有 pending 请求
    for (const [id, req] of this.pending) {
      clearTimeout(req.timer);
      req.reject(new Error('Connection shut down'));
    }
    this.pending.clear();
  }

  // --- 内部实现 ---

  private async ensureConnected(): Promise<void> {
    const config = this.resolveConfig();
    if (!config) throw new Error('Gateway not configured');

    // 对应 configure()：只在配置变化时重建
    if (this.ws?.readyState === WebSocket.OPEN &&
        this.configuredUrl === config.url &&
        this.configuredToken === (config.token ?? null)) {
      return;
    }

    await this.connect(config);
  }

  private connect(config: GatewayConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // 关闭旧连接
      if (this.ws) {
        this.ws.removeAllListeners();
        this.ws.close();
      }
      this.lastSnapshot = null;

      // 构建 URL（带认证）
      const url = new URL(config.url);
      const headers: Record<string, string> = {};
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }

      this.ws = new WebSocket(url.toString(), { headers });
      this.configuredUrl = config.url;
      this.configuredToken = config.token ?? null;

      this.ws.once('open', () => resolve());
      this.ws.once('error', (err) => reject(err));

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        this.emit('disconnected');
      });
    });
  }

  private handleMessage(raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // RPC 响应（有 id）
    if (msg.id && this.pending.has(msg.id)) {
      const req = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      clearTimeout(req.timer);

      if (msg.error) {
        req.reject(new Error(msg.error.message || 'RPC error'));
      } else {
        req.resolve(msg.result);
      }
      return;
    }

    // 推送消息（无 id）
    if (msg.type === 'hello') {
      this.lastSnapshot = msg;
      this.emit('snapshot', msg);
      return;
    }
    if (msg.type === 'event') {
      this.emit('push', {
        type: 'event',
        event: msg.event,
        payload: msg.payload,
      });
      return;
    }
  }

  private sendRequest(
    method: string,
    params: Record<string, any> | null,
    timeoutMs: number,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket not connected'));
      }

      const id = randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timed out: ${method}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });

      const msg: RpcRequest = { id, method };
      if (params) msg.params = params;

      this.ws.send(JSON.stringify(msg));
    });
  }

  /**
   * 自动恢复机制，完全复刻 Swift 版。
   * 本地模式：[150, 400, 900]ms 渐进重试
   */
  private async autoRecover(
    method: string,
    params: Record<string, any> | null,
    timeoutMs: number,
    originalError: Error,
  ): Promise<any> {
    const mode = this.appState.connectionMode;

    if (mode === 'unconfigured') throw originalError;

    if (mode === 'local') {
      // 触发 Gateway 启动
      this.emit('gateway-needed');

      let lastError: Error = originalError;
      for (const delayMs of [150, 400, 900]) {
        await this.sleep(delayMs);
        try {
          await this.ensureConnected();
          return await this.sendRequest(method, params, timeoutMs);
        } catch (err) {
          lastError = err as Error;
        }
      }
      throw lastError;
    }

    if (mode === 'remote') {
      this.emit('tunnel-rebuild-needed');

      let lastError: Error = originalError;
      for (const delayMs of [150, 400, 900]) {
        await this.sleep(delayMs);
        try {
          await this.ensureConnected();
          return await this.sendRequest(method, params, timeoutMs);
        } catch (err) {
          lastError = err as Error;
        }
      }
      throw lastError;
    }

    throw originalError;
  }

  private resolveConfig(): GatewayConfig | null {
    const mode = this.appState.connectionMode;
    if (mode === 'unconfigured') return null;

    const port = 18789; // 从 appState 或环境读取
    if (mode === 'local') {
      return { url: `ws://127.0.0.1:${port}` };
    }
    if (mode === 'remote') {
      return {
        url: this.appState.remoteUrl || `ws://127.0.0.1:${port}`,
        token: undefined, // 从配置读取
      };
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 3.6.2 推送订阅（EventEmitter 版）

Swift 用 `AsyncStream`，Electron 版用 `EventEmitter`：

```typescript
// 订阅推送事件
gateway.on('snapshot', (snapshot) => {
  console.log('Gateway snapshot:', snapshot);
  tray.updateStatus(snapshot);
});

gateway.on('push', (push) => {
  if (push.event === 'agent') {
    activityStore.handleAgentEvent(push.payload);
  }
  if (push.event === 'chat') {
    chatWindow?.webContents.send('chat-event', push.payload);
  }
});

gateway.on('disconnected', () => {
  controlChannel.markDegraded('WebSocket disconnected');
});
```

---

## 3.7 设计决策

### 3.7.1 为什么缓存 lastSnapshot？

```swift
private var lastSnapshot: HelloOk?

func subscribe(bufferingNewest: Int = 100) -> AsyncStream<GatewayPush> {
    // ...
    if let snapshot {
        continuation.yield(.snapshot(snapshot))  // 立即发送缓存
    }
    // ...
}
```

Gateway 在 WebSocket 连接建立时发送一次 `hello` snapshot。如果订阅者在 `hello` 之后才注册（很常见），它们会错过这个初始快照。缓存确保**晚来的订阅者也能获得完整状态**。

### 3.7.2 为什么请求和推送共用同一个 WebSocket？

替代方案是分开两个连接——一个用于 RPC 请求，一个用于推送。OpenClaw 选择单连接因为：

1. **简化认证**：一次握手即可
2. **减少资源消耗**：一个连接 vs 两个连接
3. **状态一致性**：`hello` snapshot 和后续事件在同一连接上保证有序
4. **通过 `id` 字段区分**：有 `id` 的是 RPC 响应，无 `id` 的是推送

---

## 3.8 深入理解：WebSocket vs HTTP RPC

```
┌──────────────┬──────────────────┬──────────────────────────┐
│ 特性          │ HTTP RPC         │ WebSocket RPC            │
├──────────────┼──────────────────┼──────────────────────────┤
│ 请求-响应     │ ✓                │ ✓（通过 id 匹配）        │
│ 服务端推送    │ ✗（需 SSE/轮询）  │ ✓（原生支持）            │
│ 连接复用     │ HTTP/2 多路复用    │ 单连接全双工              │
│ 握手开销     │ 每次请求          │ 一次握手                  │
│ 状态性       │ 无状态            │ 有状态（连接持续）         │
│ 断线检测     │ 需要心跳          │ ping/pong + close 事件    │
│ 适用场景     │ 低频请求          │ 高频双向通信              │
└──────────────┴──────────────────┴──────────────────────────┘
```

OpenClaw 选择 WebSocket 因为它需要**实时推送**（agent 事件、聊天消息、健康状态变化）。

---

## 3.9 常见问题与陷阱

### Q1: 请求超时后 pending 会泄漏吗？
不会。超时 timer 会从 `pending` Map 中移除条目并 reject Promise。在 Swift 版中，`GatewayChannelActor` 也有类似机制。

### Q2: WebSocket 断线后推送会丢失吗？
会。OpenClaw 通过以下方式缓解：
- 重连后 Gateway 发送新的 `hello` snapshot（包含完整状态）
- 如果检测到 `seqGap`（序列号不连续），通知订阅者刷新
- 聊天界面收到 `seqGap` 后会重新加载历史

### Q3: Electron 版需要 WebSocket 心跳吗？
`ws` 库支持 ping/pong。建议开启：
```typescript
const ws = new WebSocket(url);
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.ping();
}, 30000);
ws.on('close', () => clearInterval(pingInterval));
```

### Q4: 多个渲染进程如何共享 WebSocket？
Electron 的渲染进程不能直接访问 WebSocket。所有通信通过主进程中转：
```typescript
// 主进程
gateway.on('push', (push) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('gateway-push', push);
  });
});

// 渲染进程 (preload)
contextBridge.exposeInMainWorld('gateway', {
  onPush: (cb: Function) => ipcRenderer.on('gateway-push', (_e, push) => cb(push)),
  request: (method: string, params: any) => ipcRenderer.invoke('gateway-request', method, params),
});
```

---

## 3.10 完整代码示例：类型安全的 RPC 包装

```typescript
// 对应 Swift 版的 typed gateway API
class TypedGatewayAPI {
  constructor(private connection: GatewayConnection) {}

  async health(timeoutMs = 8000): Promise<{ ok: boolean }> {
    return this.connection.request('health', null, timeoutMs);
  }

  async chatHistory(sessionKey: string, limit?: number) {
    return this.connection.request('chat.history', { sessionKey, limit });
  }

  async chatSend(params: {
    sessionKey: string;
    message: string;
    thinking: string;
    idempotencyKey: string;
    attachments?: any[];
  }) {
    return this.connection.request('chat.send', params, 30000);
  }

  async chatAbort(sessionKey: string, runId: string) {
    return this.connection.request('chat.abort', { sessionKey, runId });
  }

  async setHeartbeats(enabled: boolean) {
    return this.connection.request('set-heartbeats', { enabled });
  }

  async configGet() {
    return this.connection.request('config.get', null, 8000);
  }

  async cronList(includeDisabled = true) {
    return this.connection.request('cron.list', { includeDisabled });
  }

  async sendAgent(params: {
    message: string;
    sessionKey?: string;
    thinking?: string;
    deliver?: boolean;
  }) {
    return this.connection.request('agent', {
      message: params.message,
      sessionKey: params.sessionKey || 'main',
      thinking: params.thinking || 'default',
      deliver: params.deliver ?? false,
      idempotencyKey: randomUUID(),
    });
  }
}
```

---

## 3.11 章节小结

| 概念 | OpenClaw (Swift actor) | Electron (Node.js) |
|------|----------------------|-------------------|
| 线程隔离 | `actor` 独立隔离域 | 单线程，无需隔离 |
| WebSocket 库 | URLSessionWebSocketTask | `ws` npm 包 |
| 请求匹配 | pending Map + UUID | 相同 |
| 推送分发 | AsyncStream + subscribers | EventEmitter |
| 自动恢复 | [150, 400, 900]ms 渐进重试 | 相同 |
| 配置热切换 | configure() 比较后重建 | 相同 |
| Session 规范化 | canonicalizeSessionKey | 相同逻辑 |
| 快照缓存 | lastSnapshot | 相同 |
| 超时处理 | Task.sleep + 超时 | setTimeout + Promise |

下一章将分析 MenuBar.swift，看 OpenClaw 如何实现丰富的系统托盘交互。
