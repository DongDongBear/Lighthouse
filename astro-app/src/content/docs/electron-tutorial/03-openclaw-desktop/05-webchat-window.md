# 第五章：WebChat 窗口管理

## 本章目标

1. 理解 `WebChatManager` 的 Window/Panel 双模式设计
2. 分析 NSPanel 无边框面板的实现细节和锚定定位
3. 掌握 SwiftUI → NSHostingController → NSWindow 的嵌套架构
4. 用 Electron BrowserWindow 实现等效的聊天面板

## 学习路线图

```
双模式设计 → NSPanel → 锚定定位 → 会话管理 → 动画效果 → Electron 实现
```

---

## 5.1 为什么需要双模式？

OpenClaw 的聊天窗口有两种呈现方式：

```
┌── Panel 模式 ──────────────┐    ┌── Window 模式 ─────────────┐
│                             │    │                             │
│  • 无边框、浮动面板         │    │  • 标准窗口（有标题栏）      │
│  • 锚定在菜单栏图标下方     │    │  • 可最小化、调整大小        │
│  • 点击外部自动关闭         │    │  • 不随外部点击关闭          │
│  • 像 macOS Wi-Fi 面板     │    │  • 像常规 App 窗口           │
│  • 通过左键点击 Tray 唤起   │    │  • 通过菜单 "Open Chat" 打开 │
│                             │    │                             │
│  适合：快速查看/回复        │    │  适合：长时间对话            │
└─────────────────────────────┘    └─────────────────────────────┘
```

---

## 5.2 源码分析：WebChatManager

### 5.2.1 核心架构

```swift
@MainActor
final class WebChatManager {
    static let shared = WebChatManager()

    private var windowController: WebChatSwiftUIWindowController?   // Window 模式
    private var windowSessionKey: String?
    private var panelController: WebChatSwiftUIWindowController?    // Panel 模式
    private var panelSessionKey: String?
    private var cachedPreferredSessionKey: String?

    var onPanelVisibilityChanged: ((Bool) -> Void)?
}
```

**关键设计**：Window 和 Panel 可以同时存在，但各自只有一个实例。这意味着用户可以：
- Panel 模式快速回复一个会话
- 同时 Window 模式打开另一个会话进行长对话

### 5.2.2 show() — Window 模式

```swift
func show(sessionKey: String) {
    self.closePanel()  // 关闭 Panel（互斥）

    if let controller = self.windowController {
        if self.windowSessionKey == sessionKey {
            controller.show()  // 同一会话，直接显示
            return
        }
        // 不同会话，关闭旧的再创建新的
        controller.close()
        self.windowController = nil
        self.windowSessionKey = nil
    }

    let controller = WebChatSwiftUIWindowController(sessionKey: sessionKey, presentation: .window)
    controller.onVisibilityChanged = { [weak self] visible in
        self?.onPanelVisibilityChanged?(visible)
    }
    self.windowController = controller
    self.windowSessionKey = sessionKey
    controller.show()
}
```

### 5.2.3 togglePanel() — Panel 模式

```swift
func togglePanel(sessionKey: String, anchorProvider: @escaping () -> NSRect?) {
    if let controller = self.panelController {
        if self.panelSessionKey != sessionKey {
            // 不同会话：关闭旧 Panel，创建新的
            controller.close()
            self.panelController = nil
            self.panelSessionKey = nil
        } else {
            // 同一会话：切换可见性
            if controller.isVisible {
                controller.close()
            } else {
                controller.presentAnchored(anchorProvider: anchorProvider)
            }
            return
        }
    }

    // 创建新 Panel
    let controller = WebChatSwiftUIWindowController(
        sessionKey: sessionKey,
        presentation: .panel(anchorProvider: anchorProvider))
    controller.onClosed = { [weak self] in
        self?.panelHidden()
    }
    self.panelController = controller
    self.panelSessionKey = sessionKey
    controller.presentAnchored(anchorProvider: anchorProvider)
}
```

### 5.2.4 preferredSessionKey

```swift
func preferredSessionKey() async -> String {
    if let cachedPreferredSessionKey { return cachedPreferredSessionKey }
    let key = await GatewayConnection.shared.mainSessionKey()
    self.cachedPreferredSessionKey = key
    return key
}
```

这里通过 Gateway 的 `config.get` RPC 获取主会话的完整 key。缓存避免每次打开面板都发 RPC 请求。

---

## 5.3 源码分析：WebChatSwiftUIWindowController

### 5.3.1 Window 创建

```swift
private static func makeWindow(
    for presentation: WebChatPresentation,
    contentViewController: NSViewController) -> NSWindow
{
    switch presentation {
    case .window:
        let window = NSWindow(
            contentRect: NSRect(origin: .zero, size: WebChatSwiftUILayout.windowSize),
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered, defer: false)
        window.title = "OpenClaw Chat"
        window.minSize = WebChatSwiftUILayout.windowMinSize  // 480x360
        // ...
        return window

    case .panel:
        let panel = WebChatPanel(
            contentRect: NSRect(origin: .zero, size: WebChatSwiftUILayout.panelSize),
            styleMask: [.borderless],           // 无边框！
            backing: .buffered, defer: false)
        panel.level = .statusBar                // 浮在其他窗口上面
        panel.hidesOnDeactivate = true          // App 失焦时隐藏
        panel.hasShadow = true
        panel.isMovable = false                 // 不可拖动
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.titleVisibility = .hidden
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.becomesKeyOnlyIfNeeded = true
        // ...
        return panel
    }
}
```

**WebChatPanel** 继承 NSPanel 并覆盖了 `canBecomeKey`：

```swift
final class WebChatPanel: NSPanel {
    override var canBecomeKey: Bool { true }    // 允许键盘输入
    override var canBecomeMain: Bool { true }
}
```

没有这个覆盖，无边框面板无法接收键盘事件——用户就无法在聊天框里打字。

### 5.3.2 面板锚定与动画

```swift
func presentAnchored(anchorProvider: () -> NSRect?) {
    guard case .panel = self.presentation, let window else { return }
    self.installDismissMonitor()
    let target = self.reposition(using: anchorProvider)

    if !self.isVisible {
        // 入场动画：从上方 8px 处滑入，同时渐显
        let start = target.offsetBy(dx: 0, dy: 8)
        window.setFrame(start, display: true)
        window.alphaValue = 0
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.18
            context.timingFunction = CAMediaTimingFunction(name: .easeOut)
            window.animator().setFrame(target, display: true)
            window.animator().alphaValue = 1
        }
    } else {
        window.makeKeyAndOrderFront(nil)
    }
    self.onVisibilityChanged?(true)
}
```

**锚定定位算法**：

```swift
private func reposition(using anchorProvider: () -> NSRect?) -> NSRect {
    guard let anchor = anchorProvider() else {
        // 没有锚点，默认右上角
        return WindowPlacement.topRightFrame(size: panelSize, padding: anchorPadding)
    }
    // 找到锚点所在的屏幕
    let screen = NSScreen.screens.first { screen in
        screen.frame.contains(anchor.origin) ||
        screen.frame.contains(NSPoint(x: anchor.midX, y: anchor.midY))
    } ?? NSScreen.main
    // 在可见区域内定位
    let bounds = (screen?.visibleFrame ?? .zero).insetBy(dx: anchorPadding, dy: anchorPadding)
    return WindowPlacement.anchoredBelowFrame(
        size: panelSize, anchor: anchor, padding: anchorPadding, in: bounds)
}
```

定位逻辑：面板在锚点（菜单栏图标）正下方居中，确保不超出屏幕边界。

### 5.3.3 外部点击关闭

```swift
private func installDismissMonitor() {
    guard self.dismissMonitor == nil else { return }
    self.dismissMonitor = NSEvent.addGlobalMonitorForEvents(
        matching: [.leftMouseDown, .rightMouseDown, .otherMouseDown])
    { [weak self] _ in
        guard let self, let win = self.window else { return }
        let pt = NSEvent.mouseLocation
        if !win.frame.contains(pt) {
            self.close()  // 点击面板外部 → 关闭
        }
    }
}
```

这个全局事件监听器让 Panel 表现得像 macOS 原生的弹出面板——点击任何外部区域都会关闭它。

### 5.3.4 毛玻璃背景

```swift
private static func makeContentController(...) -> NSViewController {
    let effectView = NSVisualEffectView()
    effectView.material = .sidebar              // macOS 侧边栏风格
    effectView.blendingMode = switch presentation {
    case .panel: .withinWindow
    case .window: .behindWindow
    }
    effectView.state = .active
    effectView.layer?.cornerRadius = cornerRadius  // 16px (Panel) / 0 (Window)
    effectView.layer?.cornerCurve = .continuous     // 连续曲率圆角
    // ...
}
```

Panel 模式使用圆角 + 毛玻璃效果，看起来像 macOS 系统面板；Window 模式使用标准窗口外观。

---

## 5.4 源码分析：MacGatewayChatTransport

聊天界面通过 `OpenClawChatTransport` 协议与 Gateway 通信：

```swift
struct MacGatewayChatTransport: OpenClawChatTransport, Sendable {
    func requestHistory(sessionKey: String) async throws -> OpenClawChatHistoryPayload {
        try await GatewayConnection.shared.chatHistory(sessionKey: sessionKey)
    }

    func sendMessage(sessionKey: String, message: String, ...) async throws -> OpenClawChatSendResponse {
        try await GatewayConnection.shared.chatSend(
            sessionKey: sessionKey, message: message, ...)
    }

    func events() -> AsyncStream<OpenClawChatTransportEvent> {
        AsyncStream { continuation in
            let task = Task {
                try? await GatewayConnection.shared.refresh()
                let stream = await GatewayConnection.shared.subscribe()
                for await push in stream {
                    if let evt = Self.mapPushToTransportEvent(push) {
                        continuation.yield(evt)
                    }
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
```

这是一个**适配器模式**：将 Gateway 的通用推送流过滤为聊天相关的事件（chat、agent、health）。

---

## 5.5 Electron 实现

### 5.5.1 ChatManager

```typescript
// src/main/windows/chat-manager.ts
import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { AppState } from '../app-state';
import { GatewayConnection } from '../gateway/connection';

export class ChatManager {
  private panel: BrowserWindow | null = null;
  private window: BrowserWindow | null = null;
  private panelSessionKey: string | null = null;
  private windowSessionKey: string | null = null;

  constructor(
    private appState: AppState,
    private gateway: GatewayConnection,
  ) {}

  /**
   * Panel 模式：无边框浮动面板，对应 NSPanel。
   */
  togglePanel(trayBounds?: Electron.Rectangle): void {
    if (this.panel && !this.panel.isDestroyed()) {
      if (this.panel.isVisible()) {
        this.panel.hide();
      } else {
        this.positionPanel(trayBounds);
        this.panel.show();
      }
      return;
    }

    this.panel = new BrowserWindow({
      width: 480,
      height: 640,
      frame: false,               // 无边框（对应 .borderless）
      transparent: true,          // 透明背景
      resizable: false,
      movable: false,             // 不可拖动
      alwaysOnTop: true,          // 浮在最上层（对应 .statusBar level）
      skipTaskbar: true,
      show: false,
      vibrancy: 'sidebar',        // macOS 毛玻璃（对应 NSVisualEffectView）
      roundedCorners: true,
      webPreferences: {
        preload: path.join(__dirname, '../../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.panel.loadFile(path.join(__dirname, '../../renderer/chat/index.html'));

    // 外部点击关闭（对应 installDismissMonitor）
    this.panel.on('blur', () => {
      // macOS 上 blur 相当于点击外部
      if (process.platform === 'darwin') {
        this.panel?.hide();
      }
    });

    this.panel.once('ready-to-show', () => {
      this.positionPanel(trayBounds);
      this.panel?.show();
    });
  }

  /**
   * Window 模式：标准窗口。
   */
  showSession(sessionKey: string): void {
    this.closePanel();

    if (this.window && !this.window.isDestroyed()) {
      if (this.windowSessionKey === sessionKey) {
        this.window.show();
        this.window.focus();
        return;
      }
      this.window.close();
    }

    this.window = new BrowserWindow({
      width: 500,
      height: 840,
      minWidth: 480,
      minHeight: 360,
      title: 'AI Chat',
      vibrancy: 'sidebar',
      webPreferences: {
        preload: path.join(__dirname, '../../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.windowSessionKey = sessionKey;
    this.window.loadFile(
      path.join(__dirname, '../../renderer/chat/index.html'),
      { query: { session: sessionKey } },
    );
  }

  closePanel(): void {
    if (this.panel && !this.panel.isDestroyed()) {
      this.panel.hide();
    }
  }

  /**
   * 面板定位算法。
   * 对应 WindowPlacement.anchoredBelowFrame。
   */
  private positionPanel(trayBounds?: Electron.Rectangle): void {
    if (!this.panel || !trayBounds) return;

    const panelWidth = 480;
    const panelHeight = 640;
    const padding = 8;

    // 居中在 Tray 图标下方
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - panelWidth / 2);
    let y = trayBounds.y + trayBounds.height + padding;

    // 确保不超出屏幕
    const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
    const workArea = display.workArea;

    if (x + panelWidth > workArea.x + workArea.width) {
      x = workArea.x + workArea.width - panelWidth - padding;
    }
    if (x < workArea.x + padding) {
      x = workArea.x + padding;
    }
    if (y + panelHeight > workArea.y + workArea.height) {
      y = workArea.y + workArea.height - panelHeight - padding;
    }

    this.panel.setBounds({ x, y, width: panelWidth, height: panelHeight });
  }

  destroy(): void {
    this.panel?.destroy();
    this.window?.destroy();
  }
}
```

### 5.5.2 入场动画

OpenClaw 有优雅的滑入 + 渐显动画。Electron 版可以通过 CSS 或逐帧方式实现：

```typescript
private async showPanelWithAnimation(): Promise<void> {
  if (!this.panel) return;
  const targetBounds = this.panel.getBounds();
  const startY = targetBounds.y - 8;

  // 起始位置（上移 8px）+ 透明
  this.panel.setBounds({ ...targetBounds, y: startY });
  this.panel.setOpacity(0);
  this.panel.show();

  // 10 帧动画，180ms
  const frames = 10;
  const duration = 180;
  const interval = duration / frames;

  for (let i = 1; i <= frames; i++) {
    const progress = this.easeOut(i / frames);
    const currentY = Math.round(startY + (targetBounds.y - startY) * progress);
    this.panel.setBounds({ ...targetBounds, y: currentY });
    this.panel.setOpacity(progress);
    await new Promise((r) => setTimeout(r, interval));
  }

  // 确保最终位置精确
  this.panel.setBounds(targetBounds);
  this.panel.setOpacity(1);
}

private easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
```

---

## 5.6 设计决策

### 5.6.1 为什么 Panel 缓存而非销毁？

```swift
private func panelHidden() {
    self.onPanelVisibilityChanged?(false)
    // Keep panel controller cached so reopening doesn't re-bootstrap.
}
```

Panel 关闭时**不销毁**，只是隐藏。下次打开时直接显示，避免：
- 重新创建 NSHostingController 和 SwiftUI View
- 重新建立 WebSocket 订阅
- 重新加载聊天历史

这让面板的打开/关闭感觉是瞬时的。

### 5.6.2 为什么 Window 和 Panel 分开管理？

它们的生命周期和行为完全不同：
- Panel 跟随 Tray 点击切换，失焦自动隐藏
- Window 是独立应用窗口，用户手动关闭

分开管理让代码更清晰，也允许同时使用两种模式。

---

## 5.7 常见问题与陷阱

### Q1: Electron 的 frameless 窗口在 Windows 上可拖动吗？
默认不可拖动。需要在 HTML 中添加拖动区域：
```css
.titlebar { -webkit-app-region: drag; }
.content { -webkit-app-region: no-drag; }
```

### Q2: Panel 模式如何实现"点击外部关闭"？
macOS 上 `BrowserWindow` 的 `blur` 事件在点击外部时触发。Windows 上需要使用全局鼠标监听：
```typescript
if (process.platform !== 'darwin') {
  // Windows: 使用 electron-edge 或定时检查焦点
  setInterval(() => {
    if (!panel.isFocused() && panel.isVisible()) {
      panel.hide();
    }
  }, 200);
}
```

### Q3: `vibrancy` 在非 macOS 平台上怎么办？
`vibrancy` 只在 macOS 上生效。Windows/Linux 用 CSS 模拟：
```css
.panel-bg {
  background: rgba(30, 30, 30, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
```

### Q4: 如何传递 sessionKey 给渲染进程？
```typescript
// 方法 1: URL 参数
panel.loadFile('chat.html', { query: { session: 'main' } });
// 渲染进程：new URLSearchParams(location.search).get('session')

// 方法 2: IPC
panel.webContents.send('set-session', sessionKey);
```

---

## 5.8 章节小结

| 功能 | OpenClaw (Swift) | Electron |
|------|-----------------|----------|
| Panel 模式 | NSPanel (borderless, statusBar level) | BrowserWindow (frame: false, alwaysOnTop) |
| Window 模式 | NSWindow (titled, closable, resizable) | BrowserWindow (标准配置) |
| 毛玻璃 | NSVisualEffectView (.sidebar) | vibrancy: 'sidebar' (macOS) / CSS |
| 入场动画 | NSAnimationContext (0.18s ease-out) | 逐帧动画 / CSS transition |
| 外部关闭 | NSEvent.addGlobalMonitorForEvents | blur 事件 / 定时检查 |
| 锚定定位 | WindowPlacement.anchoredBelowFrame | 手动计算 tray bounds |
| 内容 | SwiftUI OpenClawChatView | React/Vue 聊天组件 |
| 通信 | MacGatewayChatTransport (AsyncStream) | IPC + EventEmitter |
| 缓存 | 隐藏不销毁 | hide() 而非 close() |

下一章将深入 Canvas 系统，分析 OpenClaw 如何实现自定义 URL scheme 和 A2UI 自动导航。
