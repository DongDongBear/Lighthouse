# 第四章：系统托盘与菜单栏

## 本章目标

1. 理解 OpenClaw 的菜单栏交互设计——左键聊天、右键菜单、悬浮 HUD
2. 分析 `CritterStatusLabel` 如何实现动态状态图标和动画
3. 掌握 `StatusItemMouseHandlerView` 的事件拦截机制
4. 用 Electron 的 Tray API 实现等效的交互体验

## 学习路线图

```
MenuBarExtra → 状态图标 → 鼠标处理 → HoverHUD → 菜单内容 → Electron Tray
```

---

## 4.1 OpenClaw 的菜单栏设计

OpenClaw 不是一个普通的菜单栏应用。它的 Status Item 有三种交互模式：

```
┌─────────────────────────────────────────────────────┐
│ 菜单栏交互设计                                       │
│                                                      │
│  左键点击 → 切换聊天面板（WebChatManager.togglePanel）│
│  右键点击 → 显示下拉菜单（会话列表、设置等）          │
│  鼠标悬停 → 显示 HoverHUD（状态摘要）                │
│                                                      │
│  图标状态：                                           │
│  😊 空闲（呼吸动画）                                  │
│  🔨 工作中（工具图标：bash/read/write/edit）          │
│  😴 睡眠（Gateway 不可达）                            │
│  ⏸️  暂停（灰色，无动画）                             │
└─────────────────────────────────────────────────────┘
```

---

## 4.2 源码分析：MenuBarExtra

### 4.2.1 应用入口

```swift
var body: some Scene {
    MenuBarExtra { MenuContent(state: self.state, updater: self.delegate.updaterController) } label: {
        CritterStatusLabel(
            isPaused: self.state.isPaused,
            isSleeping: self.isGatewaySleeping,
            isWorking: self.state.isWorking,
            earBoostActive: self.state.earBoostActive,
            blinkTick: self.state.blinkTick,
            sendCelebrationTick: self.state.sendCelebrationTick,
            gatewayStatus: self.gatewayManager.status,
            animationsEnabled: self.state.iconAnimationsEnabled && !self.isGatewaySleeping,
            iconState: self.effectiveIconState)
    }
    .menuBarExtraStyle(.menu)          // 使用原生菜单样式
    .menuBarExtraAccess(isPresented: self.$isMenuPresented) { item in
        self.statusItem = item         // 获取 NSStatusItem 引用
        MenuSessionsInjector.shared.install(into: item)
        self.applyStatusItemAppearance(paused: self.state.isPaused, sleeping: self.isGatewaySleeping)
        self.installStatusItemMouseHandler(for: item)
    }
}
```

`menuBarExtraAccess` 来自第三方库，让我们获得底层 `NSStatusItem` 的引用——这是实现自定义鼠标处理的关键。

### 4.2.2 isGatewaySleeping 状态判断

```swift
private var isGatewaySleeping: Bool {
    if self.state.isPaused { return false }  // 暂停不等于睡眠
    switch self.state.connectionMode {
    case .unconfigured:
        return true                          // 未配置 = 睡眠
    case .remote:
        if case .connected = self.controlChannel.state { return false }
        return true                          // 远程但未连接 = 睡眠
    case .local:
        switch self.gatewayManager.status {
        case .running, .starting, .attachedExisting:
            if case .connected = self.controlChannel.state { return false }
            return true                      // Gateway 运行但 ControlChannel 断开
        case .failed, .stopped:
            return true
        }
    }
}
```

**设计思路**：只有当 Gateway 运行且 ControlChannel 连接成功时，图标才"醒着"。这给用户一个直觉的视觉反馈。

### 4.2.3 effectiveIconState

```swift
private var effectiveIconState: IconState {
    let selection = self.state.iconOverride
    if selection == .system {
        return self.activityStore.iconState  // 自动跟踪工作状态
    }
    let overrideState = selection.toIconState()
    // ... 处理用户手动覆盖
}
```

`IconState` 来自 `WorkActivityStore`，追踪当前 agent 是否在工作以及使用什么工具：

```
IconState:
  .idle                    → 空闲图标
  .workingMain(.bash)      → 主会话执行 bash，显示终端图标
  .workingMain(.read)      → 主会话读文件，显示文件图标
  .workingOther(.write)    → 其他会话写文件，显示铅笔图标
  .overridden(.edit)       → 用户手动覆盖
```

---

## 4.3 源码分析：自定义鼠标处理

### 4.3.1 StatusItemMouseHandlerView

这是实现"左键聊天、右键菜单"的核心：

```swift
private final class StatusItemMouseHandlerView: NSView {
    var onLeftClick: (() -> Void)?
    var onRightClick: (() -> Void)?
    var onHoverChanged: ((Bool) -> Void)?
    private var tracking: NSTrackingArea?

    override func mouseDown(with event: NSEvent) {
        if let onLeftClick {
            onLeftClick()                   // 左键 → 聊天面板
        } else {
            super.mouseDown(with: event)    // 回退到默认行为
        }
    }

    override func rightMouseDown(with event: NSEvent) {
        self.onRightClick?()               // 右键 → 菜单
        // 注意：不调用 super，菜单由 isMenuPresented 绑定驱动
    }

    override func mouseEntered(with event: NSEvent) {
        self.onHoverChanged?(true)          // 鼠标进入 → HoverHUD
    }

    override func mouseExited(with event: NSEvent) {
        self.onHoverChanged?(false)         // 鼠标离开 → 关闭 HoverHUD
    }
}
```

### 4.3.2 安装鼠标处理器

```swift
private func installStatusItemMouseHandler(for item: NSStatusItem) {
    guard let button = item.button else { return }
    // 防止重复安装
    if button.subviews.contains(where: { $0 is StatusItemMouseHandlerView }) { return }

    // 连接回调
    WebChatManager.shared.onPanelVisibilityChanged = { [self] visible in
        self.isPanelVisible = visible
        self.updateStatusHighlight()
    }
    CanvasManager.shared.onPanelVisibilityChanged = { [self] visible in
        self.state.canvasPanelVisible = visible
    }
    CanvasManager.shared.defaultAnchorProvider = { [self] in self.statusButtonScreenFrame() }

    let handler = StatusItemMouseHandlerView()
    handler.onLeftClick = { [self] in
        HoverHUDController.shared.dismiss(reason: "statusItemClick")
        self.toggleWebChatPanel()
    }
    handler.onRightClick = { [self] in
        HoverHUDController.shared.dismiss(reason: "statusItemRightClick")
        WebChatManager.shared.closePanel()
        self.isMenuPresented = true
    }
    handler.onHoverChanged = { [self] inside in
        HoverHUDController.shared.statusItemHoverChanged(
            inside: inside,
            anchorProvider: { [self] in self.statusButtonScreenFrame() })
    }

    // 覆盖整个 button 区域
    button.addSubview(handler)
    NSLayoutConstraint.activate([
        handler.leadingAnchor.constraint(equalTo: button.leadingAnchor),
        handler.trailingAnchor.constraint(equalTo: button.trailingAnchor),
        handler.topAnchor.constraint(equalTo: button.topAnchor),
        handler.bottomAnchor.constraint(equalTo: button.bottomAnchor),
    ])
}
```

**关键技巧**：在 `NSStatusBarButton` 上叠加一个透明的 NSView，拦截所有鼠标事件。这让我们能区分左键和右键，而标准的 `MenuBarExtra` 只支持点击打开菜单。

### 4.3.3 toggleWebChatPanel

```swift
private func toggleWebChatPanel() {
    HoverHUDController.shared.setSuppressed(true)
    self.isMenuPresented = false            // 关闭菜单（如果打开的话）
    Task { @MainActor in
        let sessionKey = await WebChatManager.shared.preferredSessionKey()
        WebChatManager.shared.togglePanel(
            sessionKey: sessionKey,
            anchorProvider: { [self] in self.statusButtonScreenFrame() })
    }
}
```

注意 `anchorProvider`：聊天面板会**锚定到菜单栏图标下方**，就像 macOS 原生的 Wi-Fi 或蓝牙面板一样。

---

## 4.4 源码分析：HoverHUD

当鼠标悬停在菜单栏图标上时，OpenClaw 显示一个小型信息卡片：

```
┌─────────────────────┐
│ OpenClaw  Connected │
│ 2 active sessions   │
│ main: idle          │
└─────────────────────┘
```

这通过 `HoverHUDController` 实现：鼠标进入 → 延迟显示 → 鼠标离开 → 延迟消失。如果用户点击了（打开聊天或菜单），HUD 立即消失（`dismiss`）。

---

## 4.5 源码分析：onChange 联动

```swift
.onChange(of: self.state.isPaused) { _, paused in
    self.applyStatusItemAppearance(paused: paused, sleeping: self.isGatewaySleeping)
    if self.state.connectionMode == .local {
        self.gatewayManager.setActive(!paused)      // 暂停时停止 Gateway
    } else {
        self.gatewayManager.stop()
    }
}
.onChange(of: self.state.connectionMode) { _, mode in
    Task { await ConnectionModeCoordinator.shared.apply(mode: mode, paused: self.state.isPaused) }
}
```

每个 `onChange` 将 UI 状态变化传导到子系统：
- `isPaused` 变化 → 启动/停止 Gateway + 更新图标外观
- `connectionMode` 变化 → 重新配置连接协调器
- `controlChannel.state` 变化 → 更新图标外观
- `gatewayManager.status` 变化 → 更新图标外观

---

## 4.6 Electron 实现

### 4.6.1 TrayManager

```typescript
// src/main/windows/tray.ts
import { Tray, Menu, nativeImage, app, NativeImage } from 'electron';
import path from 'path';
import { AppState } from '../app-state';
import { ChatManager } from './chat-manager';

type TrayIconState = 'idle' | 'working' | 'paused' | 'sleeping';

export class TrayManager {
  private tray: Tray;
  private icons: Record<TrayIconState, NativeImage>;
  private currentState: TrayIconState = 'idle';
  private animationTimer: ReturnType<typeof setInterval> | null = null;
  private animationFrame = 0;

  constructor(
    private appState: AppState,
    private chatManager: ChatManager,
  ) {
    // 加载图标
    this.icons = {
      idle: this.loadIcon('tray-idle'),
      working: this.loadIcon('tray-working'),
      paused: this.loadIcon('tray-paused'),
      sleeping: this.loadIcon('tray-sleeping'),
    };

    // 创建 Tray
    this.tray = new Tray(this.icons.idle);
    this.tray.setToolTip('AI Desktop');

    // 左键点击 → 聊天面板（对应 onLeftClick）
    this.tray.on('click', (_event, bounds) => {
      this.chatManager.togglePanel(bounds);
    });

    // 右键点击 → 菜单（对应 onRightClick）
    this.tray.on('right-click', () => {
      this.chatManager.closePanel();
      const menu = this.buildContextMenu();
      this.tray.popUpContextMenu(menu);
    });

    // 监听状态变化
    this.appState.on('change:isPaused', (paused: boolean) => {
      this.updateIcon();
    });
    this.appState.on('change:connectionMode', () => {
      this.updateIcon();
    });
  }

  updateIcon(): void {
    const newState = this.resolveIconState();
    if (newState === this.currentState) return;
    this.currentState = newState;

    // 停止旧动画
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }

    if (newState === 'working') {
      this.startWorkingAnimation();
    } else {
      this.tray.setImage(this.icons[newState]);
    }
  }

  /**
   * 工作动画：循环切换图标帧。
   * OpenClaw 用 SwiftUI 动画实现眨眼/庆祝等复杂效果，
   * Electron 只能通过定时切换图片模拟。
   */
  private startWorkingAnimation(): void {
    const frames = this.loadAnimationFrames('tray-working');
    let frameIdx = 0;
    this.animationTimer = setInterval(() => {
      this.tray.setImage(frames[frameIdx % frames.length]);
      frameIdx++;
    }, 500);
  }

  private resolveIconState(): TrayIconState {
    if (this.appState.isPaused) return 'paused';
    // 对应 isGatewaySleeping 逻辑
    if (this.appState.connectionMode === 'unconfigured') return 'sleeping';
    // ... 检查 Gateway 和 ControlChannel 状态
    return 'idle';
  }

  /**
   * 构建右键菜单。
   * 对应 MenuContent SwiftUI View。
   */
  private buildContextMenu(): Menu {
    return Menu.buildFromTemplate([
      {
        label: this.appState.isPaused ? '▶ Resume' : '⏸ Pause',
        click: () => {
          this.appState.isPaused = !this.appState.isPaused;
        },
      },
      { type: 'separator' },
      {
        label: 'Sessions',
        submenu: [
          { label: 'main', click: () => this.chatManager.showSession('main') },
          // 动态从 Gateway 获取会话列表
        ],
      },
      { type: 'separator' },
      {
        label: 'Settings…',
        click: () => {
          // 打开设置窗口
          this.openSettings();
        },
      },
      {
        label: 'Check for Updates…',
        click: () => { /* autoUpdater.checkForUpdates() */ },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);
  }

  private loadIcon(name: string): NativeImage {
    const iconPath = path.join(__dirname, '../../resources', `${name}.png`);
    const img = nativeImage.createFromPath(iconPath);
    // macOS 模板图标（自动适应明暗模式）
    img.setTemplateImage(true);
    return img;
  }

  private loadAnimationFrames(prefix: string): NativeImage[] {
    const frames: NativeImage[] = [];
    for (let i = 0; i < 4; i++) {
      frames.push(this.loadIcon(`${prefix}-${i}`));
    }
    return frames;
  }

  private openSettings(): void {
    // 通过 IPC 或直接创建 BrowserWindow
  }

  destroy(): void {
    if (this.animationTimer) clearInterval(this.animationTimer);
    this.tray.destroy();
  }
}
```

### 4.6.2 关键差异：Electron Tray 的限制

| 功能 | macOS 原生 (OpenClaw) | Electron Tray |
|------|---------------------|---------------|
| 左/右键区分 | ✓ (StatusItemMouseHandlerView) | ✓ (click/right-click 事件) |
| 鼠标悬停 | ✓ (mouseEntered/Exited) | ✗ (不支持 hover 事件) |
| 自定义渲染 | ✓ (任意 NSView) | ✗ (只能设置图片/标题) |
| 动画 | ✓ (SwiftUI Animation) | △ (定时切换图片) |
| 模板图标 | ✓ (自动明暗) | ✓ (setTemplateImage) |
| HoverHUD | ✓ | ✗ (需要自己实现悬浮窗) |

### 4.6.3 实现 HoverHUD（Electron 版）

Electron 不支持 Tray 的 hover 事件，但可以用定时器轮询鼠标位置：

```typescript
import { screen, BrowserWindow } from 'electron';

class HoverHUD {
  private window: BrowserWindow | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  startTracking(trayBounds: Electron.Rectangle): void {
    this.pollTimer = setInterval(() => {
      const mousePos = screen.getCursorScreenPoint();
      const isOver = this.isMouseOverTray(mousePos, trayBounds);
      if (isOver && !this.window) {
        this.show(trayBounds);
      } else if (!isOver && this.window) {
        this.hide();
      }
    }, 200);
  }

  private show(trayBounds: Electron.Rectangle): void {
    this.window = new BrowserWindow({
      width: 250,
      height: 80,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      x: trayBounds.x,
      y: trayBounds.y + trayBounds.height + 4,
    });
    this.window.loadURL('data:text/html,...'); // 或加载 HTML 文件
  }

  private hide(): void {
    this.window?.close();
    this.window = null;
  }

  private isMouseOverTray(pos: Electron.Point, bounds: Electron.Rectangle): boolean {
    return pos.x >= bounds.x && pos.x <= bounds.x + bounds.width &&
           pos.y >= bounds.y && pos.y <= bounds.y + bounds.height;
  }

  destroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.hide();
  }
}
```

---

## 4.7 设计决策

### 4.7.1 为什么左键打开聊天而非菜单？

传统菜单栏应用点击打开菜单。OpenClaw 反转了这个约定：

- **左键** = 最常用操作 = 聊天（用户和 AI 的主要交互方式）
- **右键** = 次要操作 = 菜单（设置、会话管理）

这是 AI 助手特有的设计——用户 99% 的时间想要聊天，而不是看菜单。

### 4.7.2 为什么状态图标用动画而非颜色？

图标动画传达了"活着"的感觉：
- 空闲时的微小呼吸动画 → "我在这里，随时可用"
- 工作时的工具图标切换 → "我正在做事"
- 睡眠时的静止 → "我不可用"

纯颜色变化（绿/黄/红）太抽象，不如动画直观。

---

## 4.8 常见问题与陷阱

### Q1: Electron 的 Tray 在 Windows 上表现不同吗？
是的。Windows 的系统托盘（System Tray）和 macOS 的菜单栏行为差异很大：
- Windows: 左键单击通常打开应用窗口，左键双击是默认操作
- macOS: 单击是默认操作
- Linux: 依赖桌面环境，行为不统一

建议用平台检测处理差异：
```typescript
if (process.platform === 'darwin') {
  tray.on('click', () => togglePanel());
} else {
  tray.on('double-click', () => togglePanel());
  tray.on('click', () => tray.popUpContextMenu(menu));
}
```

### Q2: macOS 模板图标如何制作？
模板图标必须是**黑色 + 透明**的 PNG，macOS 会自动处理明暗模式：
```
规格：22x22 像素 @1x，44x44 @2x
颜色：纯黑（#000000）+ 透明背景
格式：PNG，使用 alpha 通道
命名：xxxTemplate.png 或 xxxTemplate@2x.png
```

### Q3: 如何在 Electron 中实现 macOS 风格的面板定位？
面板应该出现在 Tray 图标正下方：
```typescript
tray.on('click', (_event, bounds) => {
  const { x, y, width, height } = bounds;
  const panelWidth = 480;
  const panelHeight = 640;
  const windowX = Math.round(x + width / 2 - panelWidth / 2);
  const windowY = y + height + 8;
  chatWindow.setBounds({ x: windowX, y: windowY, width: panelWidth, height: panelHeight });
});
```

---

## 4.9 章节小结

| 功能 | OpenClaw (Swift) | Electron |
|------|-----------------|----------|
| 菜单栏驻留 | MenuBarExtra | Tray |
| 左/右键区分 | StatusItemMouseHandlerView | click/right-click 事件 |
| 动态图标 | CritterStatusLabel (SwiftUI) | 定时切换 NativeImage |
| 悬浮提示 | HoverHUD (NSPanel) | BrowserWindow (frameless) |
| 下拉菜单 | MenuContent (SwiftUI) | Menu.buildFromTemplate |
| 图标动画 | SwiftUI Animation | setInterval + setImage |
| 状态追踪 | WorkActivityStore → IconState | EventEmitter 联动 |
| 面板锚定 | anchorProvider (NSRect) | Tray bounds 计算 |

下一章将深入 WebChatManager，分析聊天窗口的双模式设计。
