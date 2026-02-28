# 第六章：Canvas 系统

## 本章目标

1. 理解 Canvas 的产品设计——为什么 AI 助手需要一个可编程的画布
2. 分析 `CanvasManager` + `CanvasWindowController` 的完整实现
3. 掌握自定义 URL scheme（`canvas://`）和本地文件服务
4. 理解 A2UI（Agent-to-UI）自动导航机制
5. 用 Electron 的 `protocol.handle` 实现等效功能

## 学习路线图

```
产品设计 → CanvasManager → URL scheme → WKWebView → A2UI → 文件监听 → Electron 实现
```

---

## 6.1 Canvas 的产品设计

Canvas 是 OpenClaw 独特的功能：**AI agent 可以动态生成和展示 Web 内容**。

```
┌── 传统聊天 ────────────┐    ┌── Canvas ──────────────────────┐
│                         │    │                                 │
│  用户: 画一个饼图       │    │  Agent 生成 HTML/JS/CSS         │
│  AI: 这是一段代码...    │    │  → 写入 canvas 目录             │
│  (用户需要自己运行)     │    │  → 自动在 Canvas 面板中渲染      │
│                         │    │  → 用户看到交互式饼图            │
│                         │    │  → 可以点击、缩放、导出          │
└─────────────────────────┘    └─────────────────────────────────┘
```

Canvas 的本质：一个由 AI 控制的 WebView，可以展示：
- Agent 生成的静态/动态网页
- A2UI（Agent-to-UI）交互组件
- 任意外部 URL（http/https）
- 本地文件

---

## 6.2 源码分析：CanvasManager

### 6.2.1 核心结构

```swift
@MainActor
final class CanvasManager {
    static let shared = CanvasManager()

    private var panelController: CanvasWindowController?
    private var panelSessionKey: String?
    private var lastAutoA2UIUrl: String?
    private var gatewayWatchTask: Task<Void, Never>?

    var onPanelVisibilityChanged: ((Bool) -> Void)?
    var defaultAnchorProvider: (() -> NSRect?)?

    private static let canvasRoot: URL = {
        let base = FileManager().urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        return base.appendingPathComponent("OpenClaw/canvas", isDirectory: true)
    }()
}
```

Canvas 文件存储在 `~/Library/Application Support/OpenClaw/canvas/` 下，每个会话一个子目录：

```
~/Library/Application Support/OpenClaw/canvas/
├── main/
│   ├── index.html          ← Agent 生成的页面
│   ├── style.css
│   └── chart.js
├── agent-abc123-subagent-xyz/
│   └── report.html
└── ...
```

### 6.2.2 showDetailed() — 核心展示方法

```swift
func showDetailed(
    sessionKey: String,
    target: String? = nil,
    placement: CanvasPlacement? = nil) throws -> CanvasShowResult
{
    let session = sessionKey.trimmingCharacters(in: .whitespacesAndNewlines)
    let normalizedTarget = target?.trimmingCharacters(in: .whitespacesAndNewlines).nonEmpty

    // 1. 复用已有的 Controller
    if let controller = self.panelController, self.panelSessionKey == session {
        controller.presentAnchoredPanel(anchorProvider: anchorProvider)
        if let normalizedTarget {
            controller.load(target: normalizedTarget)  // 有明确目标才导航
        }
        self.maybeAutoNavigateToA2UIAsync(controller: controller)
        return ...
    }

    // 2. 创建新的 Controller
    self.panelController?.close()
    try FileManager().createDirectory(at: Self.canvasRoot, withIntermediateDirectories: true)
    let controller = try CanvasWindowController(
        sessionKey: session, root: Self.canvasRoot,
        presentation: .panel(anchorProvider: anchorProvider))
    self.panelController = controller
    self.panelSessionKey = session

    // 3. 默认导航到 "/"（如果没有明确目标）
    let effectiveTarget = normalizedTarget ?? "/"
    controller.showCanvas(path: effectiveTarget)

    // 4. 尝试 A2UI 自动导航
    if normalizedTarget == nil {
        self.maybeAutoNavigateToA2UIAsync(controller: controller)
    }
    return ...
}
```

**目标解析优先级**：

```
target 解析:
  │
  ├─ "https://..." or "http://..." → 直接加载 URL
  ├─ "file://..." → 加载本地文件
  ├─ "/absolute/path" (文件存在) → 加载本地文件
  ├─ "/relative/path" → canvas://<session>/relative/path
  └─ nil → "/" → 显示 index.html 或欢迎页
```

### 6.2.3 Gateway 推送驱动的 A2UI 自动导航

```swift
private init() {
    self.startGatewayObserver()  // 构造时就开始监听
}

private func startGatewayObserver() {
    self.gatewayWatchTask = Task { [weak self] in
        let stream = await GatewayConnection.shared.subscribe(bufferingNewest: 1)
        for await push in stream {
            self?.handleGatewayPush(push)
        }
    }
}

private func handleGatewayPush(_ push: GatewayPush) {
    guard case let .snapshot(snapshot) = push else { return }
    let raw = snapshot.canvasHostUrl?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let a2uiUrl = Self.resolveA2UIHostUrl(from: raw)
    guard let controller = self.panelController else { return }
    self.maybeAutoNavigateToA2UI(controller: controller, a2uiUrl: a2uiUrl)
}

private static func resolveA2UIHostUrl(from raw: String?) -> String? {
    let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard !trimmed.isEmpty, let base = URL(string: trimmed) else { return nil }
    return base.appendingPathComponent("__openclaw__/a2ui/").absoluteString + "?platform=macos"
}
```

当 Gateway 推送新的 snapshot 时，Canvas 会自动导航到 A2UI 页面（`http://localhost:18789/__openclaw__/a2ui/?platform=macos`）。这让 Canvas 始终显示最新的 Agent UI。

---

## 6.3 源码分析：CanvasWindowController

### 6.3.1 自定义 URL Scheme

```swift
let config = WKWebViewConfiguration()
self.schemeHandler = CanvasSchemeHandler(root: root)
for scheme in CanvasScheme.allSchemes {
    config.setURLSchemeHandler(self.schemeHandler, forURLScheme: scheme)
}
```

`canvas://` 是自定义的 URL scheme，将 URL 路径映射到本地文件：

```
canvas://main/index.html
  → ~/Library/Application Support/OpenClaw/canvas/main/index.html

canvas://main/chart.js
  → ~/Library/Application Support/OpenClaw/canvas/main/chart.js
```

`CanvasSchemeHandler` 实现了 `WKURLSchemeHandler` 协议，拦截所有 `canvas://` 请求，从本地文件系统读取内容并返回。

### 6.3.2 文件监听与自动刷新

```swift
self.watcher = CanvasFileWatcher(url: sessionDir) { [weak webView] in
    Task { @MainActor in
        guard let webView else { return }
        // 只在显示本地 canvas 内容时自动刷新
        guard let scheme = webView.url?.scheme,
              CanvasScheme.allSchemes.contains(scheme) else { return }
        // 根路径：只在 index.html 存在时刷新
        let path = webView.url?.path ?? ""
        if path == "/" || path.isEmpty {
            let indexA = sessionDir.appendingPathComponent("index.html")
            if !FileManager().fileExists(atPath: indexA.path) { return }
        }
        webView.reload()
    }
}
```

当 Agent 写入新文件到 canvas 目录时，文件监听器检测到变化并自动刷新 WebView。这实现了"Agent 写代码 → 用户立即看到结果"的无缝体验。

### 6.3.3 A2UI Bridge 脚本

CanvasWindowController 注入一个 JavaScript 桥接脚本，让 A2UI 组件的用户操作（点击按钮等）可以回传给 Agent：

```swift
let bridgeScript = """
(() => {
  if (globalThis.__openclawA2UIBridgeInstalled) return;
  globalThis.__openclawA2UIBridgeInstalled = true;

  globalThis.addEventListener('a2uiaction', (evt) => {
    const payload = evt?.detail ?? evt?.payload ?? null;
    if (!payload || payload.eventType !== 'a2ui.action') return;
    const action = payload.action ?? null;
    if (!action?.name) return;

    // 优先用 WKScriptMessageHandler
    const handler = globalThis.webkit?.messageHandlers?.openclawCanvasA2UIAction;
    if (handler?.postMessage) {
      handler.postMessage({ userAction: {...} });
      return;
    }

    // 回退：通过 deep link
    location.href = 'openclaw://agent?' + params.toString();
  }, true);
})();
"""
config.userContentController.addUserScript(
    WKUserScript(source: bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
```

A2UI 事件流：

```
用户点击 A2UI 按钮
  │
  ├─ DOM: 触发 'a2uiaction' 自定义事件
  │
  ├─ Bridge Script 捕获
  │   │
  │   ├─ webkit.messageHandlers 可用
  │   │   └─ postMessage → CanvasA2UIActionMessageHandler → Gateway RPC
  │   │
  │   └─ 回退: deep link
  │       └─ openclaw://agent?message=CANVAS_A2UI...
  │           └─ DeepLinkHandler → Gateway agent RPC
  │
  └─ Agent 收到操作 → 处理 → 可能更新 Canvas
```

### 6.3.4 快照功能

```swift
func snapshot(to outPath: String?) async throws -> String {
    let image: NSImage = try await withCheckedThrowingContinuation { cont in
        self.webView.takeSnapshot(with: nil) { image, error in
            if let error { cont.resume(throwing: error); return }
            guard let image else { cont.resume(throwing: ...); return }
            cont.resume(returning: image)
        }
    }
    guard let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:])
    else { throw ... }
    try png.write(to: URL(fileURLWithPath: path), options: [.atomic])
    return path
}
```

Agent 可以请求 Canvas 的截图（PNG），用于视觉分析或记录。

---

## 6.4 Electron 实现

### 6.4.1 自定义 Protocol

```typescript
// src/main/windows/canvas-manager.ts
import { BrowserWindow, protocol, app } from 'electron';
import { readFile, existsSync, mkdirSync, watch } from 'fs';
import path from 'path';
import { lookup } from 'mime-types';

const CANVAS_ROOT = path.join(app.getPath('userData'), 'canvas');

export class CanvasManager {
  private window: BrowserWindow | null = null;
  private sessionKey: string | null = null;
  private watcher: ReturnType<typeof watch> | null = null;

  constructor() {
    this.registerProtocol();
  }

  /**
   * 注册自定义 protocol。
   * 对应 WKURLSchemeHandler + CanvasSchemeHandler。
   */
  private registerProtocol(): void {
    protocol.handle('canvas', (request) => {
      const url = new URL(request.url);
      const session = url.hostname;
      let filePath = decodeURIComponent(url.pathname);

      // 默认 index.html
      if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
      }

      const fullPath = path.join(CANVAS_ROOT, session, filePath);

      // 安全检查：防止路径穿越
      if (!fullPath.startsWith(path.join(CANVAS_ROOT, session))) {
        return new Response('Forbidden', { status: 403 });
      }

      if (!existsSync(fullPath)) {
        // 返回欢迎页面
        return new Response(this.welcomeHTML(session), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      const mimeType = lookup(fullPath) || 'application/octet-stream';
      return new Response(require('fs').readFileSync(fullPath), {
        headers: { 'Content-Type': mimeType },
      });
    });
  }

  async show(sessionKey: string, target?: string): Promise<string> {
    const sessionDir = path.join(CANVAS_ROOT, this.sanitize(sessionKey));
    mkdirSync(sessionDir, { recursive: true });

    if (this.window && !this.window.isDestroyed() && this.sessionKey === sessionKey) {
      this.window.show();
      if (target) this.navigate(target);
      return sessionDir;
    }

    // 创建新窗口
    this.window?.destroy();
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, '../../preload/canvas.js'),
        contextIsolation: true,
      },
    });

    this.sessionKey = sessionKey;

    // 导航
    const effectiveTarget = target || '/';
    this.navigate(effectiveTarget);

    // 文件监听（对应 CanvasFileWatcher）
    this.startFileWatcher(sessionDir);

    return sessionDir;
  }

  private navigate(target: string): void {
    if (!this.window) return;

    // HTTP(S) URL → 直接加载
    if (target.startsWith('http://') || target.startsWith('https://')) {
      this.window.loadURL(target);
      return;
    }

    // 本地文件
    if (target.startsWith('/') && existsSync(target)) {
      this.window.loadFile(target);
      return;
    }

    // Canvas scheme
    const session = this.sanitize(this.sessionKey || 'main');
    this.window.loadURL(`canvas://${session}${target.startsWith('/') ? '' : '/'}${target}`);
  }

  /**
   * 文件监听自动刷新。
   * 对应 CanvasFileWatcher。
   */
  private startFileWatcher(dir: string): void {
    this.watcher?.close();
    this.watcher = watch(dir, { recursive: true }, (_event, filename) => {
      if (!this.window || this.window.isDestroyed()) return;
      // 只在显示 canvas:// 内容时刷新
      const currentUrl = this.window.webContents.getURL();
      if (currentUrl.startsWith('canvas://')) {
        this.window.webContents.reload();
      }
    });
  }

  /**
   * 快照功能。
   * 对应 CanvasWindowController.snapshot()。
   */
  async snapshot(outPath?: string): Promise<string> {
    if (!this.window) throw new Error('Canvas not available');

    const image = await this.window.webContents.capturePage();
    const png = image.toPNG();
    const finalPath = outPath || `/tmp/canvas-snapshot-${Date.now()}.png`;
    require('fs').writeFileSync(finalPath, png);
    return finalPath;
  }

  async eval(javaScript: string): Promise<string> {
    if (!this.window) return '';
    const result = await this.window.webContents.executeJavaScript(javaScript);
    return String(result ?? '');
  }

  hide(): void {
    this.window?.hide();
  }

  private sanitize(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private welcomeHTML(session: string): string {
    return `<!DOCTYPE html>
<html><body style="font-family:system-ui;padding:40px;background:#1a1a2e;color:#e0e0e0">
  <h2>Canvas: ${session}</h2>
  <p>Waiting for content... The agent will write files here.</p>
  <p style="color:#888">${path.join(CANVAS_ROOT, session)}/</p>
</body></html>`;
  }

  destroy(): void {
    this.watcher?.close();
    this.window?.destroy();
  }
}
```

### 6.4.2 A2UI Bridge（Electron 版）

```typescript
// preload/canvas.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openclawCanvas', {
  // A2UI 动作回传
  sendA2UIAction: (action) => {
    ipcRenderer.send('canvas-a2ui-action', action);
  },
});

// 注入桥接脚本（对应 Swift 版的 bridgeScript）
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('a2uiaction', (evt) => {
    const detail = evt.detail || evt.payload;
    if (!detail || detail.eventType !== 'a2ui.action') return;
    window.openclawCanvas.sendA2UIAction(detail.action);
  });
});
```

---

## 6.5 设计决策

### 6.5.1 为什么用自定义 scheme 而非 file://？

1. **安全性**：`file://` 可以访问整个文件系统；`canvas://` 被限制在 canvas 目录
2. **路由控制**：可以实现 SPA 风格的路由（`canvas://main/dashboard` → 同一个 index.html）
3. **CORS**：`file://` 的同源策略限制严格；自定义 scheme 可以控制
4. **虚拟路径**：可以映射到不存在的路径（如欢迎页）

### 6.5.2 为什么文件变化只触发刷新而非热更新？

全量 reload 简单可靠。Agent 通常一次写入多个文件（HTML + CSS + JS），partial 热更新（如 HMR）过于复杂且容易出错。

---

## 6.6 常见问题与陷阱

### Q1: Canvas 文件谁来写？
Gateway 中的 Agent 通过 IPC 请求 `canvasPresent`，然后工具（write tool）直接写入 canvas 目录。桌面端只负责显示。

### Q2: Electron 的 `protocol.handle` 和 `protocol.registerFileProtocol` 有什么区别？
`protocol.handle`（Electron 25+）返回标准 `Response` 对象，更现代。旧的 `registerFileProtocol` 使用回调模式。推荐用 `handle`。

### Q3: 文件监听的性能问题？
macOS 的 FSEvents 非常高效。Node.js 的 `fs.watch` 在 macOS 上也用 FSEvents。但如果 canvas 目录文件很多，建议：
- 使用 `chokidar` 替代 `fs.watch`（更可靠）
- 添加 debounce（避免连续写入触发多次刷新）
- 忽略 `.DS_Store` 等无关文件

### Q4: 路径穿越攻击防护？
必须验证解析后的文件路径仍在 canvas 根目录内：
```typescript
const fullPath = path.resolve(CANVAS_ROOT, session, filePath);
if (!fullPath.startsWith(CANVAS_ROOT)) {
  return new Response('Forbidden', { status: 403 });
}
```

---

## 6.7 章节小结

| 功能 | OpenClaw (Swift) | Electron |
|------|-----------------|----------|
| 自定义 scheme | WKURLSchemeHandler | protocol.handle |
| 文件服务 | CanvasSchemeHandler | 读文件 + Response |
| WebView | WKWebView | BrowserWindow |
| 文件监听 | CanvasFileWatcher (FSEvents) | fs.watch / chokidar |
| 自动刷新 | webView.reload() | webContents.reload() |
| 快照 | takeSnapshot → PNG | capturePage → toPNG |
| JS 执行 | evaluateJavaScript | executeJavaScript |
| A2UI Bridge | WKScriptMessageHandler | contextBridge + IPC |
| 存储目录 | ~/Library/Application Support/OpenClaw/canvas/ | app.getPath('userData')/canvas/ |

下一章将深入 IPC 桥接层，分析 OpenClaw 如何通过 Unix Domain Socket 让 Gateway 控制桌面端。
