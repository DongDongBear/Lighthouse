# 第一章：整体架构设计

## 本章目标

读完本章，你将：

1. 理解 OpenClaw macOS 原生版的完整架构——从 `@main` 入口到每个子系统的职责划分
2. 掌握 OpenClaw 中大量使用的单例模式（`.shared`）及其背后的设计取舍
3. 学会将 Swift/AppKit 架构映射到 Electron 主进程 + 渲染进程架构
4. 完成一个 Electron 桌面 AI 助手的项目骨架搭建

## 学习路线图

```
源码阅读 → 架构全景图 → 组件职责 → 单例分析 → Electron 映射 → 项目搭建
```

---

## 1.1 OpenClaw macOS 版架构全景

### 1.1.1 应用入口：MenuBar.swift

OpenClaw macOS 版是一个**纯菜单栏应用**（Menu Bar App），没有传统的 Dock 图标和主窗口。整个应用的入口在 `MenuBar.swift`：

```swift
@main
struct OpenClawApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var state: AppState
    private let gatewayManager = GatewayProcessManager.shared
    private let controlChannel = ControlChannel.shared
    private let activityStore = WorkActivityStore.shared
    private let connectivityCoordinator = GatewayConnectivityCoordinator.shared
    @State private var statusItem: NSStatusItem?
    @State private var isMenuPresented = false
    @State private var isPanelVisible = false

    var body: some Scene {
        MenuBarExtra { MenuContent(...) } label: {
            CritterStatusLabel(...)
        }
        .menuBarExtraStyle(.menu)
        .menuBarExtraAccess(isPresented: self.$isMenuPresented) { item in
            self.statusItem = item
            // 安装自定义鼠标处理器：左键打开聊天面板，右键打开菜单
            self.installStatusItemMouseHandler(for: item)
        }

        Settings { SettingsRootView(...) }
    }
}
```

**关键设计决策**：

- 使用 SwiftUI 的 `MenuBarExtra` 作为整个应用的容器（macOS 13+）
- 通过 `@NSApplicationDelegateAdaptor` 桥接传统的 `NSApplicationDelegate` 生命周期
- `@State private var state: AppState` 是整个应用的状态中枢
- 所有子系统通过 `.shared` 单例初始化，在 `init()` 时就引用完毕

### 1.1.2 组件关系全景图

```
┌──────────────────────────────────────────────────────────────────┐
│                    OpenClawApp (@main)                           │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│  │ MenuBarExtra │  │  AppDelegate     │  │  Settings Scene   │   │
│  │ (菜单栏图标) │  │  (生命周期管理)   │  │  (设置窗口)       │   │
│  └──────┬───────┘  └────────┬─────────┘  └───────────────────┘   │
│         │                   │                                     │
│  ┌──────▼───────────────────▼─────────────────────────────────┐  │
│  │                    AppState (@Observable)                   │  │
│  │  isPaused / connectionMode / canvasEnabled / swabbleEnabled │  │
│  │  → UserDefaults 持久化  → ConfigFileWatcher 文件监听       │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
│                             │                                     │
│  ┌──────────────────────────┼─────────────────────────────────┐  │
│  │              核心子系统 (全部 .shared 单例)                  │  │
│  │                          │                                  │  │
│  │  ┌─────────────────┐  ┌─▼──────────────────┐               │  │
│  │  │ GatewayProcess  │  │ GatewayConnection  │               │  │
│  │  │ Manager         │──│ (actor)            │               │  │
│  │  │ 进程生命周期     │  │ WebSocket RPC      │               │  │
│  │  └─────────────────┘  └──────────┬─────────┘               │  │
│  │                                  │                          │  │
│  │  ┌─────────────────┐  ┌─────────▼─────────┐               │  │
│  │  │ ControlChannel  │  │ WebChatManager    │               │  │
│  │  │ 事件流/健康检查   │  │ 聊天窗口管理       │               │  │
│  │  └─────────────────┘  └───────────────────┘               │  │
│  │                                                            │  │
│  │  ┌─────────────────┐  ┌───────────────────┐               │  │
│  │  │ CanvasManager   │  │ WorkActivityStore │               │  │
│  │  │ 画布系统         │  │ 工作状态追踪       │               │  │
│  │  └─────────────────┘  └───────────────────┘               │  │
│  │                                                            │  │
│  │  ┌─────────────────┐  ┌───────────────────┐               │  │
│  │  │ HealthStore     │  │ ConfigStore       │               │  │
│  │  │ 健康监控         │  │ 配置读写           │               │  │
│  │  └─────────────────┘  └───────────────────┘               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   外部进程                                  │  │
│  │  Gateway Daemon (Node.js) ← launchd 管理                   │  │
│  │  └── WebSocket Server (端口 18789)                         │  │
│  │  └── Unix Domain Socket (control.sock)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.1.3 启动时序

```
应用启动
  │
  ├─ OpenClawApp.init()
  │   ├─ OpenClawLogging.bootstrapIfNeeded()
  │   ├─ AppStateStore.shared  ← 触发 AppState.init()
  │   │   ├─ 从 UserDefaults 加载所有持久化状态
  │   │   ├─ 从 OpenClawConfigFile 加载配置文件
  │   │   ├─ ConnectionModeResolver.resolve() 确定连接模式
  │   │   ├─ startConfigWatcher() 开始监听配置文件变化
  │   │   └─ VoiceWakeRuntime/TalkModeController 初始化
  │   └─ 各 .shared 单例被引用，触发 lazy 初始化
  │
  ├─ AppDelegate.applicationDidFinishLaunching()
  │   ├─ isDuplicateInstance() 检查是否重复启动
  │   ├─ AppActivationPolicy.apply() 设置 Dock 图标策略
  │   ├─ ConnectionModeCoordinator.apply() 根据模式启动 Gateway
  │   ├─ TerminationSignalWatcher / NodePairing / ExecApprovals 启动
  │   ├─ PresenceReporter / HealthStore / PortGuardian 启动
  │   └─ CLIInstallPrompter 检查 CLI 安装状态
  │
  └─ MenuBarExtra 渲染
      ├─ CritterStatusLabel 显示状态图标
      ├─ installStatusItemMouseHandler 安装鼠标事件
      └─ onChange 监听状态变化 → 联动各子系统
```

---

## 1.2 源码分析：核心架构模式

### 1.2.1 @MainActor 与线程安全

OpenClaw 的几乎所有 UI 相关类都标注了 `@MainActor`：

```swift
@MainActor
@Observable
final class AppState { ... }

@MainActor
@Observable
final class GatewayProcessManager { ... }

@MainActor
@Observable
final class ControlChannel { ... }

@MainActor
final class CanvasManager { ... }

@MainActor
final class WebChatManager { ... }
```

**设计意图**：Swift 的 `@MainActor` 确保这些类的所有属性和方法只在主线程访问，消除了数据竞争。这是 Swift 并发模型的核心优势——在编译期就保证线程安全。

唯一的例外是 `GatewayConnection`，它使用了 **actor**（而非 `@MainActor`）：

```swift
actor GatewayConnection {
    static let shared = GatewayConnection()
    // ...
}
```

这意味着 `GatewayConnection` 有自己的隔离域，WebSocket 通信不会阻塞主线程。调用它的方法需要 `await`：

```swift
// 从 @MainActor 上下文调用 actor 方法
let ok = try await GatewayConnection.shared.healthOK(timeoutMs: 8000)
```

### 1.2.2 单例模式（.shared）的大量使用

OpenClaw 中几乎每个子系统都是单例：

| 类名 | 单例写法 | 线程隔离 |
|------|---------|---------|
| `AppStateStore` | `static let shared = AppState()` | @MainActor |
| `GatewayProcessManager` | `static let shared = GatewayProcessManager()` | @MainActor |
| `GatewayConnection` | `static let shared = GatewayConnection()` | actor |
| `ControlChannel` | `static let shared = ControlChannel()` | @MainActor |
| `CanvasManager` | `static let shared = CanvasManager()` | @MainActor |
| `WebChatManager` | `static let shared = WebChatManager()` | @MainActor |
| `HealthStore` | `static let shared = HealthStore()` | @MainActor |
| `WorkActivityStore` | `static let shared = WorkActivityStore()` | @MainActor |

**为什么用单例？** 这是一个菜单栏应用，全局只有一个 Gateway 进程、一个 WebSocket 连接、一组窗口。单例简化了组件间的通信——任何地方都可以直接访问 `CanvasManager.shared`，不需要依赖注入。

**单例的缺点**：

- 测试困难（OpenClaw 通过 `#if DEBUG` 注入测试替身来缓解）
- 模块间高耦合（如 `GatewayProcessManager` 内部直接调用 `CanvasManager.shared.refreshDebugStatus()`）
- 初始化顺序隐式（依赖 Swift 的 lazy static）

### 1.2.3 @Observable 响应式状态管理

OpenClaw 使用 Swift 5.9 的 `@Observable` 宏实现响应式更新：

```swift
@MainActor
@Observable
final class AppState {
    var isPaused: Bool {
        didSet { self.ifNotPreview { UserDefaults.standard.set(self.isPaused, forKey: pauseDefaultsKey) } }
    }
    var connectionMode: ConnectionMode {
        didSet {
            self.ifNotPreview { UserDefaults.standard.set(self.connectionMode.rawValue, forKey: connectionModeKey) }
            self.syncGatewayConfigIfNeeded()
        }
    }
    // ...
}
```

**关键模式**：每个属性的 `didSet` 做两件事：
1. **持久化**：写入 UserDefaults
2. **联动**：触发相关子系统的状态同步

这相当于一个简化版的单向数据流：用户操作 → 修改 AppState 属性 → didSet 触发持久化 + 副作用 → SwiftUI 自动重新渲染。

### 1.2.4 数据流全景

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│ 用户操作     │────▶│ AppState     │────▶│ SwiftUI View      │
│ (点击/输入)  │     │ (@Observable)│     │ (自动重渲染)       │
└─────────────┘     └──────┬───────┘     └───────────────────┘
                           │
                    ┌──────▼───────┐
                    │ didSet 副作用 │
                    ├──────────────┤
                    │ UserDefaults  │ (持久化)
                    │ ConfigFile    │ (同步到磁盘)
                    │ Gateway RPC   │ (通知 Gateway)
                    │ VoiceWake     │ (刷新语音唤醒)
                    └──────────────┘

┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│ Gateway 推送 │────▶│ ControlChannel│───▶│ WorkActivityStore │
│ (WebSocket)  │     │ (事件分发)    │     │ (图标状态)        │
└─────────────┘     └──────────────┘     └───────────────────┘

┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│ 配置文件变化 │────▶│ConfigFileWatcher│──▶│ applyConfigOverrides│
│ (FSEvents)   │     │(文件监听)     │     │ (热更新状态)       │
└─────────────┘     └──────────────┘     └───────────────────┘
```

---

## 1.3 设计决策分析

### 1.3.1 为什么选择 Menu Bar App？

OpenClaw 是一个**常驻后台的 AI 助手**，用户期望它：
- 始终可用（一键唤起聊天面板）
- 不占用 Dock 空间
- 能显示实时状态（工作中/暂停/睡眠）

macOS 的 Menu Bar App 完美匹配这些需求。OpenClaw 甚至支持可选的 Dock 图标（`showDockIcon` 设置），但默认关闭。

### 1.3.2 为什么 Gateway 是独立进程？

OpenClaw 的架构核心是**桌面应用 + 独立 Gateway 进程**：

```
OpenClaw.app (Swift/AppKit) ←── WebSocket ──→ Gateway (Node.js)
```

而非把所有逻辑放在一个进程里。原因：

1. **Gateway 是跨平台的**：同一个 Node.js Gateway 服务于 macOS 桌面端、CLI、Web、iOS 等所有客户端
2. **生命周期独立**：Gateway 通过 launchd 管理，即使 App 关闭也能继续运行（处理 Heartbeat、Cron 等）
3. **语言优势**：AI 集成逻辑（LLM 调用、工具执行、会话管理）在 Node.js 中实现更高效
4. **热更新**：Gateway 可以独立于 App 更新

### 1.3.3 为什么不用 Electron 自己的架构？

OpenClaw 选择 Swift 原生而非 Electron，是因为：
- macOS 上原生 Menu Bar 体验无可替代
- 内存占用和启动速度要求苛刻（常驻进程）
- 需要深度系统集成（launchd、Camera、ScreenRecord、Accessibility）

但如果你的目标是**跨平台**，Electron 是更务实的选择。接下来我们看如何用 Electron 重建同级别的架构。

---

## 1.4 Electron 版整体架构设计

### 1.4.1 架构映射

将 OpenClaw 的 Swift 架构映射到 Electron：

```
┌─ OpenClaw Swift ──────────────────┐    ┌─ Electron 等价物 ──────────────────┐
│                                    │    │                                     │
│ @main OpenClawApp                  │───▶│ main.js (主进程入口)                │
│ AppState (@Observable)             │───▶│ AppState 类 + EventEmitter          │
│ GatewayProcessManager (@MainActor) │───▶│ GatewayProcessManager (child_process)│
│ GatewayConnection (actor)          │───▶│ GatewayConnection (ws 库)           │
│ ControlChannel (@MainActor)        │───▶│ ControlChannel 类                   │
│ WebChatManager (@MainActor)        │───▶│ WebChatManager (BrowserWindow)      │
│ CanvasManager (@MainActor)         │───▶│ CanvasManager (BrowserWindow + protocol)│
│ HealthStore (@MainActor)           │───▶│ HealthStore 类                      │
│ WorkActivityStore (@MainActor)     │───▶│ WorkActivityStore 类                │
│ ConfigFileWatcher                  │───▶│ chokidar / fs.watch                 │
│ UserDefaults                       │───▶│ electron-store                      │
│ MenuBarExtra + NSStatusItem        │───▶│ Tray + Menu                         │
│ NSPanel (WebChat)                  │───▶│ BrowserWindow (frameless)           │
│ WKWebView (Canvas)                 │───▶│ BrowserWindow + custom protocol     │
│ launchd (Gateway 管理)             │───▶│ child_process.spawn                 │
│ @Observable → SwiftUI              │───▶│ IPC → React/Vue 状态管理            │
│ Swift actor                        │───▶│ Node.js 单线程 (无需)               │
│ @MainActor                         │───▶│ 主进程单线程 (天然保证)              │
└────────────────────────────────────┘    └─────────────────────────────────────┘
```

### 1.4.2 跨平台差异：并发模型

**Swift**：多线程 + actor 隔离
```swift
// Swift: 编译器强制线程安全
@MainActor class Foo {           // 只能在主线程
    func bar() { ... }
}
actor Baz {                       // 独立隔离域
    func qux() { ... }
}
// 跨隔离域调用必须 await
await baz.qux()
```

**Node.js**：单线程事件循环
```javascript
// Node.js: 天然单线程，不需要线程隔离
class Foo {
    bar() { ... }  // 不会被并发调用
}
// 异步操作通过 Promise/async-await，但回调在同一线程
await baz.qux()    // 语法相同，但没有线程切换
```

这意味着 Electron 版**不需要** actor 或 @MainActor——Node.js 的事件循环天然保证了执行顺序。但要注意：长时间同步操作会阻塞事件循环，需要用 `child_process` 或 Worker Thread 处理。

### 1.4.3 项目目录结构

```
ai-desktop/
├── package.json
├── electron-builder.yml          # 打包配置
├── src/
│   ├── main/                     # 主进程 (Node.js)
│   │   ├── index.ts              # 入口
│   │   ├── app-state.ts          # 状态管理 (≈ AppState.swift)
│   │   ├── gateway/
│   │   │   ├── process-manager.ts    # ≈ GatewayProcessManager
│   │   │   ├── connection.ts         # ≈ GatewayConnection
│   │   │   ├── environment.ts        # ≈ GatewayEnvironment
│   │   │   └── control-channel.ts    # ≈ ControlChannel
│   │   ├── windows/
│   │   │   ├── tray.ts              # ≈ MenuBar (Tray)
│   │   │   ├── chat-manager.ts      # ≈ WebChatManager
│   │   │   └── canvas-manager.ts    # ≈ CanvasManager
│   │   ├── stores/
│   │   │   ├── health-store.ts      # ≈ HealthStore
│   │   │   ├── config-store.ts      # ≈ ConfigStore
│   │   │   └── activity-store.ts    # ≈ WorkActivityStore
│   │   ├── ipc/
│   │   │   └── handlers.ts          # ipcMain 处理器
│   │   └── utils/
│   │       ├── config-watcher.ts    # ≈ ConfigFileWatcher
│   │       └── store.ts            # electron-store 封装
│   ├── renderer/                 # 渲染进程 (React/Vue)
│   │   ├── chat/                 # 聊天界面
│   │   │   ├── App.tsx
│   │   │   └── index.html
│   │   ├── canvas/               # Canvas 界面
│   │   │   ├── App.tsx
│   │   │   └── index.html
│   │   └── settings/             # 设置界面
│   │       ├── App.tsx
│   │       └── index.html
│   └── preload/                  # 预加载脚本
│       └── index.ts              # contextBridge API
├── resources/                    # 图标、托盘图标等
│   ├── icon.png
│   ├── tray-idle.png
│   ├── tray-working.png
│   └── tray-paused.png
└── tsconfig.json
```

---

## 1.5 Electron 实现：应用骨架

### 1.5.1 主进程入口

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron';
import { AppState } from './app-state';
import { TrayManager } from './windows/tray';
import { GatewayProcessManager } from './gateway/process-manager';
import { GatewayConnection } from './gateway/connection';
import { ControlChannel } from './gateway/control-channel';
import { ChatManager } from './windows/chat-manager';
import { CanvasManager } from './windows/canvas-manager';
import { HealthStore } from './stores/health-store';
import { setupIPC } from './ipc/handlers';

// 单例引用（对应 OpenClaw 的 .shared 模式）
let appState: AppState;
let tray: TrayManager;
let gatewayManager: GatewayProcessManager;
let gateway: GatewayConnection;
let controlChannel: ControlChannel;
let chatManager: ChatManager;
let canvasManager: CanvasManager;
let healthStore: HealthStore;

// 防止重复启动（对应 isDuplicateInstance）
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 第二个实例启动时，聚焦到已有窗口
    chatManager?.togglePanel();
  });
}

app.whenReady().then(async () => {
  // 隐藏 Dock 图标（对应 AppActivationPolicy）
  if (process.platform === 'darwin') {
    app.dock?.hide();
  }

  // 初始化所有子系统（对应 OpenClawApp.init + applicationDidFinishLaunching）
  appState = new AppState();
  gateway = new GatewayConnection(appState);
  controlChannel = new ControlChannel(gateway);
  gatewayManager = new GatewayProcessManager(appState, gateway);
  chatManager = new ChatManager(appState, gateway);
  canvasManager = new CanvasManager(appState, gateway);
  healthStore = new HealthStore(controlChannel);
  tray = new TrayManager(appState, chatManager, canvasManager);

  // 设置 IPC 处理器
  setupIPC({ appState, gateway, chatManager, canvasManager, healthStore });

  // 根据连接模式启动 Gateway
  if (appState.connectionMode === 'local' && !appState.isPaused) {
    await gatewayManager.setActive(true);
  }

  // 启动健康检查循环
  healthStore.start();
});

app.on('window-all-closed', (e: Event) => {
  // 菜单栏应用不因窗口关闭而退出
  e.preventDefault();
});

app.on('before-quit', () => {
  gateway.shutdown();
  gatewayManager.stop();
  healthStore.stop();
});
```

### 1.5.2 AppState 实现

```typescript
// src/main/app-state.ts
import { EventEmitter } from 'events';
import Store from 'electron-store';
import { ConfigWatcher } from '../utils/config-watcher';

interface AppStateData {
  isPaused: boolean;
  connectionMode: 'unconfigured' | 'local' | 'remote';
  remoteTransport: 'ssh' | 'direct';
  canvasEnabled: boolean;
  heartbeatsEnabled: boolean;
  iconAnimationsEnabled: boolean;
  showDockIcon: boolean;
  launchAtLogin: boolean;
  remoteTarget: string;
  remoteUrl: string;
  remoteIdentity: string;
}

/**
 * 对应 OpenClaw 的 AppState + AppStateStore。
 *
 * Swift 用 @Observable + didSet 实现响应式；
 * Electron 用 EventEmitter + Proxy 实现类似效果。
 */
export class AppState extends EventEmitter {
  private store: Store<AppStateData>;
  private configWatcher: ConfigWatcher;
  private data: AppStateData;

  constructor() {
    super();

    // electron-store 对应 UserDefaults
    this.store = new Store<AppStateData>({
      defaults: {
        isPaused: false,
        connectionMode: 'unconfigured',
        remoteTransport: 'ssh',
        canvasEnabled: true,
        heartbeatsEnabled: true,
        iconAnimationsEnabled: true,
        showDockIcon: false,
        launchAtLogin: false,
        remoteTarget: '',
        remoteUrl: '',
        remoteIdentity: '',
      },
    });

    // 加载持久化状态
    this.data = this.store.store;

    // 配置文件监听（对应 ConfigFileWatcher）
    this.configWatcher = new ConfigWatcher(this.getConfigPath());
    this.configWatcher.on('change', () => this.applyConfigFromDisk());
    this.configWatcher.start();
  }

  // Proxy 模式实现属性变更通知（对应 @Observable + didSet）
  get isPaused(): boolean { return this.data.isPaused; }
  set isPaused(value: boolean) {
    if (this.data.isPaused === value) return;
    this.data.isPaused = value;
    this.store.set('isPaused', value);
    this.emit('change', 'isPaused', value);
    this.emit('change:isPaused', value);
  }

  get connectionMode(): string { return this.data.connectionMode; }
  set connectionMode(value: 'unconfigured' | 'local' | 'remote') {
    if (this.data.connectionMode === value) return;
    this.data.connectionMode = value;
    this.store.set('connectionMode', value);
    this.emit('change', 'connectionMode', value);
    this.emit('change:connectionMode', value);
    // 对应 syncGatewayConfigIfNeeded()
    this.syncGatewayConfig();
  }

  // ... 其他属性类似

  private getConfigPath(): string {
    const home = process.env.HOME || '';
    return `${home}/.config/openclaw/config.yaml`;
  }

  private applyConfigFromDisk(): void {
    // 对应 applyConfigOverrides()
    // 读取配置文件，更新状态
    this.emit('config-changed');
  }

  private syncGatewayConfig(): void {
    // 对应 syncGatewayConfigIfNeeded()
    // 将 UI 状态变更同步回配置文件
  }

  destroy(): void {
    this.configWatcher.stop();
  }
}
```

### 1.5.3 单例 vs 依赖注入

OpenClaw 用 `static let shared` 实现单例。在 Electron 版中，我们选择**依赖注入**模式：

```typescript
// OpenClaw 风格（全局单例）
class GatewayProcessManager {
  static readonly shared = new GatewayProcessManager();
  // 内部直接引用其他单例
  private connection = GatewayConnection.shared;
}

// Electron 推荐风格（依赖注入）
class GatewayProcessManager {
  constructor(
    private appState: AppState,
    private connection: GatewayConnection,
  ) {}
}
```

**为什么 Electron 版选择依赖注入？**

1. **可测试性**：可以注入 mock 对象
2. **显式依赖**：构造函数声明了所有依赖
3. **Electron 的测试工具**（Spectron、Playwright）更适合 DI 风格
4. **但仍然是"伪单例"**：在 `main/index.ts` 中只创建一个实例

---

## 1.6 深入理解：Electron 主进程 vs Swift @MainActor

### 1.6.1 线程模型对比

```
┌── Swift ──────────────────┐    ┌── Electron/Node.js ────────────┐
│                            │    │                                 │
│  Main Thread (@MainActor)  │    │  Main Process (单线程事件循环)   │
│  ├── UI 更新               │    │  ├── 主进程逻辑                 │
│  ├── AppState 操作         │    │  ├── IPC 处理                  │
│  └── Window 管理           │    │  └── Tray/Menu 操作            │
│                            │    │                                 │
│  Background Thread         │    │  Worker Thread (可选)           │
│  ├── 文件 I/O              │    │  ├── CPU 密集任务              │
│  └── 网络请求              │    │  └── 很少使用                   │
│                            │    │                                 │
│  Actor (GatewayConnection) │    │  异步 I/O (libuv)              │
│  ├── 独立隔离域             │    │  ├── WebSocket                 │
│  └── 异步消息传递           │    │  ├── 文件监听                  │
│                            │    │  └─ 子进程通信                  │
│                            │    │                                 │
│  Renderer (WKWebView)      │    │  Renderer Process              │
│  ├── 独立进程               │    │  ├── Chromium 独立进程          │
│  └── JS Bridge 通信        │    │  └── IPC 通信                  │
└────────────────────────────┘    └─────────────────────────────────┘
```

### 1.6.2 关键区别

| 特性 | Swift | Electron |
|-----|-------|---------|
| 线程安全 | 编译器检查（actor/MainActor） | 单线程，无竞争 |
| 异步 | async/await + Task | async/await + Promise |
| UI 更新 | @Observable 自动 | IPC → 渲染进程手动 |
| 内存隔离 | actor 隔离域 | 进程隔离（主/渲染） |
| 状态共享 | 直接属性访问 | IPC 序列化传输 |

---

## 1.7 常见问题与陷阱

### Q1: 为什么 Electron 不需要 actor？
Node.js 是单线程的，所有代码（包括异步回调）都在同一线程执行。不存在两个方法同时修改同一变量的情况。Swift 的 actor 是为了解决多线程数据竞争，在单线程环境中不需要。

### Q2: Electron 的菜单栏应用如何实现"无 Dock 图标"？
```typescript
// macOS 上隐藏 Dock 图标
if (process.platform === 'darwin') {
  app.dock?.hide();
}
// 或在 package.json 中设置
// "mac": { "type": "distribution" }  // 但这不等同
```

### Q3: 多窗口如何共享状态？
OpenClaw 中所有窗口共享同一个进程的 AppState。Electron 中主进程持有状态，渲染进程通过 IPC 获取和修改：
```typescript
// 渲染进程
const state = await window.electronAPI.getState('isPaused');
window.electronAPI.setState('isPaused', true);
```

### Q4: OpenClaw 为什么不直接用 SwiftUI 的 @Environment？
因为 `CanvasManager`、`GatewayProcessManager` 等不是 SwiftUI View，无法使用 @Environment。单例是最直接的方式让非 UI 代码访问共享状态。

---

## 1.8 章节小结

| 维度 | OpenClaw (Swift) | Electron 版 |
|------|------------------|-------------|
| 入口 | `@main struct OpenClawApp: App` | `app.whenReady()` |
| 状态 | `@Observable AppState` + UserDefaults | `AppState` + electron-store |
| 响应式 | `@Observable` → SwiftUI 自动更新 | EventEmitter → IPC → React |
| 并发 | `@MainActor` + `actor` | 单线程事件循环 |
| 单例 | `static let shared` | 依赖注入 + 模块级实例 |
| 进程 | App + Gateway (launchd) | Main + Renderer + Gateway (spawn) |
| 窗口 | NSWindow/NSPanel/WKWebView | BrowserWindow |
| 托盘 | MenuBarExtra + NSStatusItem | Tray + Menu |
| 配置 | UserDefaults + config.yaml + FSEvents | electron-store + chokidar |

下一章将深入 `GatewayProcessManager`，解析 OpenClaw 如何管理 Gateway 进程的完整生命周期。
