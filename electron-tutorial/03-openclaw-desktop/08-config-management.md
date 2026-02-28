# 第八章：配置管理

## 本章目标

1. 理解 OpenClaw 的多层配置架构——UserDefaults、配置文件、Gateway 配置
2. 分析 `AppState` 的 `didSet` 驱动的双向同步机制
3. 掌握 `ConfigFileWatcher` 的文件监听和热更新流程
4. 用 `electron-store` + `chokidar` 实现等效功能

## 学习路线图

```
配置层次 → AppState didSet → 文件监听 → 双向同步 → ConfigStore → Electron 实现
```

---

## 8.1 配置层次全景

OpenClaw 有三层配置，从低到高：

```
┌────────────────────────────────────────────────────────────┐
│ 层级 3: Gateway 运行时配置                                  │
│ 来源: Gateway 进程内存                                      │
│ 读写: config.get / config.set RPC                          │
│ 场景: 远程模式下修改远程 Gateway 的配置                      │
├────────────────────────────────────────────────────────────┤
│ 层级 2: 配置文件 (~/.config/openclaw/config.yaml)           │
│ 来源: 磁盘文件                                              │
│ 读写: OpenClawConfigFile.loadDict / saveDict               │
│ 场景: Gateway 启动参数、连接模式、远程配置                    │
│ 监听: ConfigFileWatcher (FSEvents)                          │
├────────────────────────────────────────────────────────────┤
│ 层级 1: 应用偏好设置 (UserDefaults)                          │
│ 来源: macOS 偏好设置系统                                     │
│ 读写: UserDefaults.standard.set / get                       │
│ 场景: UI 偏好（暂停、动画、Voice Wake、Dock 图标等）          │
│ 特点: 快速、可靠、自动持久化                                 │
└────────────────────────────────────────────────────────────┘
```

### 配置流动方向

```
用户在 UI 修改设置
  │
  ├─ 写入 UserDefaults (层级 1)
  │     AppState.isPaused.didSet → UserDefaults.set(...)
  │
  ├─ 某些设置同步到配置文件 (层级 2)
  │     AppState.connectionMode.didSet → syncGatewayConfigIfNeeded()
  │     → OpenClawConfigFile.saveDict(...)
  │
  └─ 某些设置通过 RPC 同步到 Gateway (层级 3)
        AppState.heartbeatsEnabled.didSet → GatewayConnection.setHeartbeatsEnabled(...)

配置文件被外部修改（如 CLI 编辑）
  │
  ├─ ConfigFileWatcher 检测到变化
  │     → applyConfigFromDisk()
  │     → applyConfigOverrides(root)
  │
  └─ 更新 AppState 属性（不触发反向同步）
```

---

## 8.2 源码分析：AppState 的 didSet 驱动

### 8.2.1 基本模式

每个 AppState 属性都遵循相同的模式：

```swift
var isPaused: Bool {
    didSet {
        self.ifNotPreview {
            UserDefaults.standard.set(self.isPaused, forKey: pauseDefaultsKey)
        }
    }
}
```

`ifNotPreview` 是一个守卫，在 SwiftUI Preview 和测试中跳过副作用：

```swift
private func ifNotPreview(_ action: () -> Void) {
    guard !self.isPreview else { return }
    action()
}
```

### 8.2.2 复杂联动

某些属性的 didSet 不只是持久化，还触发子系统更新：

```swift
var connectionMode: ConnectionMode {
    didSet {
        // 1. 持久化
        self.ifNotPreview {
            UserDefaults.standard.set(self.connectionMode.rawValue, forKey: connectionModeKey)
        }
        // 2. 同步到配置文件
        self.syncGatewayConfigIfNeeded()
    }
}

var heartbeatsEnabled: Bool {
    didSet {
        self.ifNotPreview {
            // 1. 持久化
            UserDefaults.standard.set(self.heartbeatsEnabled, forKey: heartbeatsEnabledKey)
            // 2. 通知 Gateway
            Task { _ = await GatewayConnection.shared.setHeartbeatsEnabled(self.heartbeatsEnabled) }
        }
    }
}

var swabbleEnabled: Bool {
    didSet {
        self.ifNotPreview {
            // 1. 持久化
            UserDefaults.standard.set(self.swabbleEnabled, forKey: swabbleEnabledKey)
            // 2. 刷新语音唤醒运行时
            Task { await VoiceWakeRuntime.shared.refresh(state: self) }
        }
    }
}
```

### 8.2.3 didSet 联动全景

```
┌─ 属性 ────────────┬─ 持久化 ─────────┬─ 联动 ────────────────────────────┐
│ isPaused           │ UserDefaults     │ -                                │
│ connectionMode     │ UserDefaults     │ syncGatewayConfigIfNeeded()      │
│ remoteTransport    │ -                │ syncGatewayConfigIfNeeded()      │
│ remoteTarget       │ UserDefaults     │ syncGatewayConfigIfNeeded()      │
│ remoteUrl          │ -                │ syncGatewayConfigIfNeeded()      │
│ heartbeatsEnabled  │ UserDefaults     │ GatewayConnection.setHeartbeats  │
│ swabbleEnabled     │ UserDefaults     │ VoiceWakeRuntime.refresh         │
│ swabbleTriggerWords│ UserDefaults     │ VoiceWakeRuntime.refresh +       │
│                    │                  │ voiceWakeGlobalSync              │
│ talkEnabled        │ UserDefaults     │ TalkModeController.setEnabled    │
│ showDockIcon       │ UserDefaults     │ AppActivationPolicy.apply        │
│ debugPaneEnabled   │ UserDefaults     │ CanvasManager.refreshDebugStatus │
│ canvasEnabled      │ UserDefaults     │ -                                │
│ peekabooBridgeEnabled│ UserDefaults   │ PeekabooBridgeHostCoordinator    │
│ iconOverride       │ UserDefaults     │ -                                │
│ iconAnimationsEnabled│ UserDefaults   │ -                                │
└────────────────────┴──────────────────┴──────────────────────────────────┘
```

---

## 8.3 源码分析：配置文件监听

### 8.3.1 ConfigFileWatcher

```swift
private func startConfigWatcher() {
    let configUrl = OpenClawConfigFile.url()
    self.configWatcher = ConfigFileWatcher(url: configUrl) { [weak self] in
        Task { @MainActor in
            self?.applyConfigFromDisk()
        }
    }
    self.configWatcher?.start()
}
```

`ConfigFileWatcher` 底层使用 macOS 的 FSEvents API（通过 `DispatchSource.makeFileSystemObjectSource` 或类似机制）。当配置文件被任何进程修改时，回调被触发。

### 8.3.2 applyConfigOverrides

```swift
private func applyConfigOverrides(_ root: [String: Any]) {
    let gateway = root["gateway"] as? [String: Any]
    let modeRaw = (gateway?["mode"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
    let remoteUrl = GatewayRemoteConfig.resolveUrlString(root: root)
    let remoteTransport = GatewayRemoteConfig.resolveTransport(root: root)

    // 根据配置文件内容更新 AppState
    let desiredMode: ConnectionMode? = switch modeRaw {
    case "local": .local
    case "remote": .remote
    case "unconfigured": .unconfigured
    default: nil
    }

    if let desiredMode, desiredMode != self.connectionMode {
        self.connectionMode = desiredMode
    } else if hasRemoteUrl, self.connectionMode != .remote {
        self.connectionMode = .remote  // 有远程 URL 就自动切换到远程模式
    }

    if remoteTransport != self.remoteTransport {
        self.remoteTransport = remoteTransport
    }
    // ...
}
```

**重要细节**：修改 `self.connectionMode` 会触发它的 `didSet`，进而调用 `syncGatewayConfigIfNeeded()`。为了避免无限循环（文件变化 → 读取 → 更新状态 → 写回文件 → 文件变化...），OpenClaw 在 `syncGatewayConfigIfNeeded` 中检查值是否真的变了：

```swift
private static func updateGatewayString(_ dictionary: inout [String: Any], key: String, value: String?) -> Bool {
    let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if (dictionary[key] as? String) != trimmed {
        dictionary[key] = trimmed
        return true   // 只在值真正改变时返回 true
    }
    return false
}
```

---

## 8.4 源码分析：ConfigStore（远程配置）

`ConfigStore` 处理远程模式下的配置读写：

```swift
enum ConfigStore {
    @MainActor
    static func load() async -> [String: Any] {
        if await self.isRemoteMode() {
            // 远程模式：从 Gateway RPC 加载
            return await self.loadFromGateway() ?? [:]
        }
        // 本地模式：优先 Gateway，回退到文件
        if let gateway = await self.loadFromGateway() {
            return gateway
        }
        return OpenClawConfigFile.loadDict()
    }

    @MainActor
    static func save(_ root: [String: Any]) async throws {
        if await self.isRemoteMode() {
            try await self.saveToGateway(root)
        } else {
            do {
                try await self.saveToGateway(root)  // 优先通过 Gateway
            } catch {
                OpenClawConfigFile.saveDict(root)    // 回退到直接写文件
            }
        }
    }
}
```

### 乐观并发控制（baseHash）

```swift
private static func saveToGateway(_ root: [String: Any]) async throws {
    if self.lastHash == nil {
        _ = await self.loadFromGateway()  // 确保有 hash
    }
    let data = try JSONSerialization.data(withJSONObject: root, ...)
    var params: [String: AnyCodable] = ["raw": AnyCodable(raw)]
    if let baseHash = self.lastHash {
        params["baseHash"] = AnyCodable(baseHash)  // 乐观锁
    }
    _ = try await GatewayConnection.shared.requestRaw(method: .configSet, params: params)
    _ = await self.loadFromGateway()  // 刷新 hash
}
```

`baseHash` 是简单的乐观并发控制：保存时带上上次读取的 hash，Gateway 检查 hash 匹配后才写入。如果配置在读取后被其他客户端修改，保存会失败。

---

## 8.5 Electron 实现

### 8.5.1 AppState（配置管理部分）

```typescript
// src/main/app-state.ts (配置相关部分)
import Store from 'electron-store';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

export class AppState extends EventEmitter {
  private store: Store;
  private configWatcher: chokidar.FSWatcher | null = null;
  private isApplyingConfig = false; // 防止循环

  constructor() {
    super();
    this.store = new Store({ name: 'preferences' });
    this.startConfigWatcher();
  }

  /**
   * 配置文件路径。
   * 对应 OpenClawConfigFile.url()
   */
  private get configPath(): string {
    return path.join(
      process.env.HOME || '',
      '.config', 'openclaw', 'config.yaml'
    );
  }

  /**
   * 启动配置文件监听。
   * 对应 startConfigWatcher + ConfigFileWatcher。
   */
  private startConfigWatcher(): void {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    this.configWatcher = chokidar.watch(this.configPath, {
      ignoreInitial: true,
      // debounce：多次快速写入只触发一次回调
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this.configWatcher.on('change', () => {
      this.applyConfigFromDisk();
    });
  }

  /**
   * 从配置文件读取并应用。
   * 对应 applyConfigFromDisk + applyConfigOverrides。
   */
  private applyConfigFromDisk(): void {
    if (this.isApplyingConfig) return;
    this.isApplyingConfig = true;

    try {
      const content = fs.readFileSync(this.configPath, 'utf8');
      const root = yaml.load(content) as Record<string, any> || {};
      const gateway = root.gateway || {};

      // 更新连接模式
      if (gateway.mode && gateway.mode !== this.connectionMode) {
        this._data.connectionMode = gateway.mode;
        this.store.set('connectionMode', gateway.mode);
        this.emit('change', 'connectionMode', gateway.mode);
      }

      // 更新远程 URL
      const remoteUrl = gateway.remote?.url;
      if (remoteUrl && remoteUrl !== this.remoteUrl) {
        this._data.remoteUrl = remoteUrl;
        this.emit('change', 'remoteUrl', remoteUrl);
      }

      // 自动推断模式
      if (!gateway.mode && remoteUrl && this.connectionMode !== 'remote') {
        this._data.connectionMode = 'remote';
        this.store.set('connectionMode', 'remote');
        this.emit('change', 'connectionMode', 'remote');
      }
    } catch (err) {
      // 配置文件不存在或解析失败：忽略
    } finally {
      this.isApplyingConfig = false;
    }
  }

  /**
   * UI 变更同步回配置文件。
   * 对应 syncGatewayConfigIfNeeded。
   */
  syncGatewayConfig(): void {
    if (this.isApplyingConfig) return;

    try {
      let root: Record<string, any> = {};
      if (fs.existsSync(this.configPath)) {
        root = yaml.load(fs.readFileSync(this.configPath, 'utf8')) as any || {};
      }

      let gateway = root.gateway || {};
      let changed = false;

      // 同步 mode
      if (this.connectionMode !== 'unconfigured') {
        if (gateway.mode !== this.connectionMode) {
          gateway.mode = this.connectionMode;
          changed = true;
        }
      } else if (gateway.mode) {
        delete gateway.mode;
        changed = true;
      }

      // 同步远程配置
      if (this.connectionMode === 'remote') {
        gateway.remote = gateway.remote || {};
        if (this.remoteUrl && gateway.remote.url !== this.remoteUrl) {
          gateway.remote.url = this.remoteUrl;
          changed = true;
        }
      }

      if (!changed) return;

      root.gateway = gateway;
      const yamlStr = yaml.dump(root, { lineWidth: -1 });
      fs.writeFileSync(this.configPath, yamlStr, 'utf8');
    } catch (err) {
      console.error('Failed to sync gateway config:', err);
    }
  }

  destroy(): void {
    this.configWatcher?.close();
  }
}
```

### 8.5.2 electron-store vs UserDefaults

| 特性 | UserDefaults (macOS) | electron-store |
|------|---------------------|---------------|
| 格式 | Property List (XML/Binary) | JSON |
| 位置 | ~/Library/Preferences/ | app.getPath('userData') |
| 性能 | 内存缓存 + 定期写磁盘 | 同步 JSON 读写 |
| 类型 | 原生类型 (Bool, Int, String, Array, Dict) | JSON 类型 |
| 加密 | ✗ (明文) | 可选加密 |
| 迁移 | 需要手动 | 支持 schema migration |
| 观察 | KVO / didSet | 自带 onDidChange |
| 跨平台 | 仅 macOS | 全平台 |

---

## 8.6 设计决策

### 8.6.1 为什么配置分两层（UserDefaults + 文件）？

- **UserDefaults**：App 自身的 UI 偏好。快速、原子性、不需要人类阅读
- **配置文件**：与 Gateway 共享的配置。人类可读（YAML）、CLI 可编辑、可版本控制

如果所有配置都放 UserDefaults，CLI 用户无法编辑。如果都放文件，UI 偏好（如动画开关）写文件太重了。

### 8.6.2 为什么 applyConfigOverrides 不怕循环？

三重保护：
1. `isApplyingConfig` 标志（Electron 版）/ `isInitializing` 标志（Swift 版）
2. `updateGatewayString` 只在值变化时返回 true
3. ConfigFileWatcher 的 debounce（连续写入只触发一次）

---

## 8.7 常见问题与陷阱

### Q1: chokidar 和 fs.watch 的区别？
`fs.watch` 在某些平台上行为不一致（如 macOS 上不报告文件名）。`chokidar` 封装了平台差异，提供可靠的文件监听。建议生产环境用 chokidar。

### Q2: 配置文件格式选择？
OpenClaw 使用 YAML。替代选项：
- **YAML**：人类友好，支持注释，但缩进敏感
- **TOML**：更严格，不易出错，Rust 生态常用
- **JSON**：最通用，但不支持注释
- **JSON5**：支持注释的 JSON，折中方案

### Q3: 如何处理配置文件不存在的情况？
OpenClaw 的做法：不存在就不读，使用默认值。首次写入时才创建文件。这避免了初始化时创建大量空配置文件。

### Q4: electron-store 的性能？
每次 `set()` 都会同步写磁盘。高频写入（如滑块调整）应该 debounce：
```typescript
let saveTimer: ReturnType<typeof setTimeout>;
function debouncedSave(key: string, value: any) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.set(key, value), 300);
}
```

---

## 8.8 章节小结

| 概念 | OpenClaw (Swift) | Electron |
|------|-----------------|----------|
| UI 偏好存储 | UserDefaults | electron-store |
| 配置文件格式 | YAML (OpenClawConfigFile) | YAML (js-yaml) |
| 文件监听 | ConfigFileWatcher (FSEvents) | chokidar |
| 响应式更新 | @Observable + didSet | EventEmitter |
| 双向同步 | applyConfigOverrides ↔ syncGatewayConfig | 相同模式 |
| 远程配置 | ConfigStore (config.get/set RPC) | Gateway RPC |
| 并发控制 | baseHash 乐观锁 | 相同 |
| 循环防护 | isInitializing + 值比较 | isApplyingConfig + 值比较 |

下一章将分析 OpenClaw 的自动更新机制（Sparkle 集成），以及 Electron 的 electron-updater 等价实现。
