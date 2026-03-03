# 第七章：IPC 桥接层

## 本章目标

1. 理解 OpenClaw 的 IPC 架构——Gateway 如何通过 Unix Domain Socket 控制桌面端
2. 深入分析 `IPC.swift` 的完整 Request/Response 类型系统
3. 掌握 Capability 权限模型
4. 用 Electron 的 `ipcMain/ipcRenderer` 设计安全的 API 暴露

## 学习路线图

```
IPC 概述 → Request/Response → Unix Socket → Capability → Electron IPC → 安全设计
```

---

## 7.1 IPC 的角色

OpenClaw 有两层 IPC：

```
┌─────────────────────────────────────────────────────────┐
│ 层级 1: Gateway ←→ 桌面端                               │
│                                                          │
│  Gateway (Node.js) ──── Unix Domain Socket ────→ App    │
│  "请通知用户"       control.sock              "好的"     │
│  "请打开 Canvas"                              "已打开"   │
│  "请拍照"                                     "照片数据" │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ 层级 2: 主进程 ←→ 渲染进程 (Electron 特有)               │
│                                                          │
│  Main Process ──── ipcMain/ipcRenderer ────→ Renderer   │
│  "聊天历史数据"                              "显示消息"  │
│  "状态变更"                                  "更新 UI"   │
└─────────────────────────────────────────────────────────┘
```

层级 1 在 OpenClaw 原生版中通过 `control.sock`（Unix Domain Socket）实现。层级 2 是 Electron 特有的。

---

## 7.2 源码分析：IPC.swift Request 类型

`IPC.swift` 定义了 Gateway 可以向桌面端发送的所有请求类型：

```swift
public enum Request: Sendable {
    // 通知
    case notify(title: String, body: String, sound: String?,
                priority: NotificationPriority?, delivery: NotificationDelivery?)

    // 权限检查
    case ensurePermissions([Capability], interactive: Bool)

    // Shell 执行
    case runShell(command: [String], cwd: String?, env: [String: String]?,
                  timeoutSec: Double?, needsScreenRecording: Bool)

    // 状态查询
    case status
    case rpcStatus

    // Agent 消息
    case agent(message: String, thinking: String?, session: String?,
               deliver: Bool, to: String?)

    // Canvas 操作
    case canvasPresent(session: String, path: String?, placement: CanvasPlacement?)
    case canvasHide(session: String)
    case canvasEval(session: String, javaScript: String)
    case canvasSnapshot(session: String, outPath: String?)
    case canvasA2UI(session: String, command: CanvasA2UICommand, jsonl: String?)

    // 节点管理
    case nodeList
    case nodeDescribe(nodeId: String)
    case nodeInvoke(nodeId: String, command: String, paramsJSON: String?)

    // 摄像头
    case cameraSnap(facing: CameraFacing?, maxWidth: Int?, quality: Double?, outPath: String?)
    case cameraClip(facing: CameraFacing?, durationMs: Int?, includeAudio: Bool, outPath: String?)

    // 屏幕录制
    case screenRecord(screenIndex: Int?, durationMs: Int?, fps: Double?,
                      includeAudio: Bool, outPath: String?)
}
```

### 7.2.1 请求类型分类

```
IPC 请求类型分类:
│
├── 系统交互
│   ├── notify          → 发送系统通知/overlay
│   ├── ensurePermissions → 检查/请求 TCC 权限
│   └── runShell        → 执行 shell 命令
│
├── 状态查询
│   ├── status          → 应用状态
│   └── rpcStatus       → RPC 连接状态
│
├── Agent 交互
│   └── agent           → 发送消息给 agent
│
├── Canvas 操作
│   ├── canvasPresent   → 显示 Canvas
│   ├── canvasHide      → 隐藏 Canvas
│   ├── canvasEval      → 执行 JavaScript
│   ├── canvasSnapshot  → 截图
│   └── canvasA2UI      → A2UI 操作 (pushJSONL/reset)
│
├── 节点管理
│   ├── nodeList        → 列出已配对节点
│   ├── nodeDescribe    → 描述节点详情
│   └── nodeInvoke      → 调用节点命令
│
└── 硬件访问
    ├── cameraSnap      → 拍照
    ├── cameraClip      → 录像片段
    └── screenRecord    → 屏幕录制
```

### 7.2.2 Response 结构

```swift
public struct Response: Codable, Sendable {
    public var ok: Bool
    public var message: String?
    public var payload: Data?    // 可选的二进制数据（PNG、stdout 等）
}
```

简洁而通用：`ok` 表示成功/失败，`message` 给出描述，`payload` 携带二进制数据。

### 7.2.3 Codable 序列化

`Request` 使用手动 `Codable` 实现（而非自动合成），因为 Swift enum 的 associated values 不支持自动 Codable：

```swift
extension Request: Codable {
    private enum Kind: String, Codable {
        case notify, ensurePermissions, runShell, status, agent, rpcStatus
        case canvasPresent, canvasHide, canvasEval, canvasSnapshot, canvasA2UI
        case nodeList, nodeDescribe, nodeInvoke
        case cameraSnap, cameraClip, screenRecord
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .notify(title, body, sound, priority, delivery):
            try container.encode(Kind.notify, forKey: .type)
            try container.encode(title, forKey: .title)
            try container.encode(body, forKey: .body)
            try container.encodeIfPresent(sound, forKey: .sound)
            // ...
        case let .runShell(command, cwd, env, timeoutSec, needsSR):
            try container.encode(Kind.runShell, forKey: .type)
            try container.encode(command, forKey: .command)
            // ...
        // ... 每种类型都有对应的编码逻辑
        }
    }
}
```

线上协议格式（JSON）：
```json
{
  "type": "canvasPresent",
  "session": "main",
  "path": "/dashboard",
  "placement": { "x": 100, "y": 200, "width": 800, "height": 600 }
}
```

---

## 7.3 源码分析：Capability 权限系统

```swift
public enum Capability: String, Codable, CaseIterable, Sendable {
    case appleScript        // AppleScript / 自动化
    case notifications      // 通知权限
    case accessibility      // 辅助功能
    case screenRecording    // 屏幕录制
    case microphone         // 麦克风
    case speechRecognition  // 语音识别
    case camera             // 摄像头
    case location           // 位置
}
```

Gateway 通过 `ensurePermissions` 请求检查或申请权限：

```json
{
  "type": "ensurePermissions",
  "caps": ["camera", "microphone"],
  "interactive": true
}
```

`interactive: true` 表示如果权限未授予，App 应该弹出系统权限对话框。`false` 则只检查不弹窗。

这个设计让 Gateway（运行在后台的 Node.js 进程）能够触发 macOS 的权限申请——这只有 GUI 应用才能做到。

---

## 7.4 源码分析：Unix Domain Socket

```swift
public let controlSocketPath: String = {
    let home = FileManager().homeDirectoryForCurrentUser
    return home
        .appendingPathComponent("Library/Application Support/OpenClaw/control.sock")
        .path
}()
```

通信方式：

```
Gateway (Node.js)                    App (Swift)
     │                                    │
     │ connect(control.sock)              │ listen(control.sock)
     │──────────────────────────────────▶ │
     │                                    │
     │ send JSON Request                  │
     │──────────────────────────────────▶ │ decode → 执行
     │                                    │
     │           JSON Response            │
     │ ◀──────────────────────────────── │ encode → 返回
     │                                    │
```

为什么用 Unix Domain Socket 而非 TCP/HTTP？
1. **性能**：无网络栈开销，直接内核通信
2. **安全**：只有同一用户可以连接（文件权限控制）
3. **简洁**：不需要端口分配
4. **macOS 惯例**：很多系统服务用 socket 文件通信

---

## 7.5 Electron 实现

### 7.5.1 IPC Handler（主进程）

```typescript
// src/main/ipc/handlers.ts
import { ipcMain, Notification, dialog } from 'electron';
import { AppState } from '../app-state';
import { GatewayConnection } from '../gateway/connection';
import { ChatManager } from '../windows/chat-manager';
import { CanvasManager } from '../windows/canvas-manager';
import { HealthStore } from '../stores/health-store';

interface Deps {
  appState: AppState;
  gateway: GatewayConnection;
  chatManager: ChatManager;
  canvasManager: CanvasManager;
  healthStore: HealthStore;
}

export function setupIPC(deps: Deps): void {
  const { appState, gateway, chatManager, canvasManager, healthStore } = deps;

  // === 状态查询 (渲染进程 → 主进程) ===

  ipcMain.handle('get-state', (_event, key: string) => {
    return (appState as any)[key];
  });

  ipcMain.handle('set-state', (_event, key: string, value: any) => {
    (appState as any)[key] = value;
  });

  // === Gateway RPC (渲染进程 → Gateway) ===

  ipcMain.handle('gateway-request', async (_event, method: string, params: any) => {
    return gateway.request(method, params);
  });

  // === Canvas 操作 ===

  ipcMain.handle('canvas-present', async (_event, session: string, target?: string) => {
    return canvasManager.show(session, target);
  });

  ipcMain.handle('canvas-hide', async (_event, session: string) => {
    canvasManager.hide();
  });

  ipcMain.handle('canvas-eval', async (_event, session: string, js: string) => {
    return canvasManager.eval(js);
  });

  ipcMain.handle('canvas-snapshot', async (_event, session: string, outPath?: string) => {
    return canvasManager.snapshot(outPath);
  });

  // === 通知 ===

  ipcMain.handle('notify', (_event, title: string, body: string) => {
    new Notification({ title, body }).show();
    return { ok: true };
  });

  // === 聊天 ===

  ipcMain.handle('chat-open', (_event, sessionKey: string) => {
    chatManager.showSession(sessionKey);
  });

  // === 健康状态 ===

  ipcMain.handle('health-snapshot', () => {
    return healthStore.snapshot;
  });

  // === A2UI 动作回传 ===

  ipcMain.on('canvas-a2ui-action', async (_event, action: any) => {
    const message = `CANVAS_A2UI action=${action.name} session=main`;
    await gateway.request('agent', {
      message,
      sessionKey: 'main',
      thinking: 'low',
      deliver: false,
    });
  });
}
```

### 7.5.2 Preload 脚本（安全 API 暴露）

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

/**
 * 安全 API 暴露。
 *
 * 关键安全原则（对应 OpenClaw 的 Capability 权限模型）：
 * 1. 只暴露必要的方法
 * 2. 参数类型检查
 * 3. 不暴露 ipcRenderer.send（防止任意消息发送）
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 状态
  getState: (key: string) => ipcRenderer.invoke('get-state', key),
  setState: (key: string, value: any) => ipcRenderer.invoke('set-state', key, value),

  // Gateway RPC
  gatewayRequest: (method: string, params?: any) =>
    ipcRenderer.invoke('gateway-request', method, params),

  // Canvas
  canvasPresent: (session: string, target?: string) =>
    ipcRenderer.invoke('canvas-present', session, target),
  canvasSnapshot: (session: string, outPath?: string) =>
    ipcRenderer.invoke('canvas-snapshot', session, outPath),

  // 通知
  notify: (title: string, body: string) =>
    ipcRenderer.invoke('notify', title, body),

  // 事件监听
  onGatewayPush: (callback: (push: any) => void) => {
    const handler = (_event: any, push: any) => callback(push);
    ipcRenderer.on('gateway-push', handler);
    return () => ipcRenderer.removeListener('gateway-push', handler);
  },

  onStateChange: (callback: (key: string, value: any) => void) => {
    const handler = (_event: any, key: string, value: any) => callback(key, value);
    ipcRenderer.on('state-change', handler);
    return () => ipcRenderer.removeListener('state-change', handler);
  },
});
```

### 7.5.3 Gateway → Electron IPC（对应 Unix Socket）

在 Electron 架构中，Gateway 通过 WebSocket 与主进程通信（而非 Unix Socket）。但如果需要 Socket 兼容：

```typescript
// src/main/ipc/socket-server.ts
import { createServer, Server, Socket } from 'net';
import path from 'path';
import { app } from 'electron';

/**
 * Unix Domain Socket 服务器。
 * 对应 OpenClaw 的 control.sock。
 *
 * Gateway 可以通过这个 socket 发送 IPC 请求。
 */
export class IPCSocketServer {
  private server: Server | null = null;
  private socketPath: string;

  constructor(private handler: (request: any) => Promise<any>) {
    this.socketPath = path.join(app.getPath('userData'), 'control.sock');
  }

  start(): void {
    // 清理旧 socket 文件
    try { require('fs').unlinkSync(this.socketPath); } catch {}

    this.server = createServer((socket: Socket) => {
      let buffer = '';
      socket.on('data', (data) => {
        buffer += data.toString();
        // 简单的换行分隔协议
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          this.handleRequest(socket, line);
        }
      });
    });

    this.server.listen(this.socketPath);

    // 设置文件权限（只有当前用户可访问）
    require('fs').chmodSync(this.socketPath, 0o600);
  }

  private async handleRequest(socket: Socket, raw: string): Promise<void> {
    try {
      const request = JSON.parse(raw);
      const response = await this.handler(request);
      socket.write(JSON.stringify(response) + '\n');
    } catch (err: any) {
      socket.write(JSON.stringify({
        ok: false,
        message: err.message,
      }) + '\n');
    }
  }

  stop(): void {
    this.server?.close();
    try { require('fs').unlinkSync(this.socketPath); } catch {}
  }
}
```

---

## 7.6 设计决策

### 7.6.1 为什么 IPC 请求是枚举而非字符串？

Swift 的 enum 提供了：
- **穷举检查**：编译器确保你处理了所有请求类型
- **类型安全**：每种请求的参数有明确类型
- **自文档化**：枚举定义就是协议规范

Electron/TypeScript 版用 discriminated union 实现类似效果：
```typescript
type IPCRequest =
  | { type: 'notify'; title: string; body: string }
  | { type: 'canvasPresent'; session: string; path?: string }
  | { type: 'cameraSnap'; facing?: 'front' | 'back' };
```

### 7.6.2 为什么通知有 delivery 选项？

```swift
case notify(title: String, body: String, sound: String?,
            priority: NotificationPriority?, delivery: NotificationDelivery?)
```

`delivery` 有三个选项：
- `.system`：使用 macOS 通知中心（会留在通知列表中）
- `.overlay`：使用应用内 overlay（不留痕迹）
- `.auto`：优先 system，权限不足时回退 overlay

这是因为 macOS 的通知权限需要用户授予。在权限未授予的情况下，overlay 是有用的回退。

---

## 7.7 深入理解：Electron IPC 安全模型

```
┌── 安全层次 ──────────────────────────────────────────────────┐
│                                                               │
│  1. contextIsolation: true                                    │
│     渲染进程无法直接访问 Node.js API                           │
│                                                               │
│  2. contextBridge.exposeInMainWorld                            │
│     只暴露白名单内的方法                                       │
│                                                               │
│  3. ipcMain.handle (而非 ipcMain.on)                           │
│     invoke/handle 模式自动处理错误传播                          │
│                                                               │
│  4. 参数验证                                                   │
│     主进程验证所有来自渲染进程的参数                            │
│                                                               │
│  5. 不暴露 ipcRenderer.send                                    │
│     防止渲染进程发送任意消息                                    │
│                                                               │
│  对应 OpenClaw 的 Capability 系统：                            │
│  Gateway 请求 ensurePermissions → App 检查 + 弹窗              │
└───────────────────────────────────────────────────────────────┘
```

### 反模式（不安全）：

```typescript
// ❌ 危险：暴露整个 ipcRenderer
contextBridge.exposeInMainWorld('ipc', ipcRenderer);

// ❌ 危险：允许任意方法调用
contextBridge.exposeInMainWorld('api', {
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
});
```

### 正确做法：

```typescript
// ✅ 安全：只暴露特定操作
contextBridge.exposeInMainWorld('api', {
  getHealth: () => ipcRenderer.invoke('health-snapshot'),
  sendChat: (session: string, message: string) =>
    ipcRenderer.invoke('chat-send', session, message),
});
```

---

## 7.8 常见问题与陷阱

### Q1: Unix Domain Socket 在 Windows 上可用吗？
Windows 10 1803+ 支持 Unix Domain Socket（AF_UNIX）。但更稳定的跨平台方案是 Named Pipe（Windows）或直接用 TCP localhost。

### Q2: IPC 消息的大小限制？
Electron 的 IPC 通过序列化传输，大的二进制数据（如截图 PNG）应该写入文件后传路径，而非直接通过 IPC 传输。OpenClaw 的 `Response.payload` 用于小数据（如 stdout），大文件用 `outPath`。

### Q3: 如何调试 IPC 通信？
```typescript
// 主进程：记录所有 IPC 请求
ipcMain.handle('gateway-request', async (event, method, params) => {
  console.log(`[IPC] gateway-request: ${method}`, params);
  const result = await gateway.request(method, params);
  console.log(`[IPC] gateway-response: ${method}`, result);
  return result;
});
```

### Q4: 渲染进程崩溃会影响主进程吗？
不会。Electron 的渲染进程运行在独立的 Chromium 进程中。一个渲染进程崩溃不影响其他窗口和主进程。这对应 OpenClaw 中 WKWebView 的进程隔离。

---

## 7.9 章节小结

| 概念 | OpenClaw (Swift) | Electron |
|------|-----------------|----------|
| Gateway → App | Unix Domain Socket | WebSocket (已有) + 可选 Socket |
| App 内部 | 直接方法调用（同进程） | ipcMain/ipcRenderer |
| 请求类型 | enum Request (Codable) | TypeScript discriminated union |
| 响应 | struct Response (ok/message/payload) | JSON 对象 |
| 权限 | Capability enum + TCC | Electron permissions API |
| 安全 | Socket 文件权限 (0o600) | contextIsolation + contextBridge |
| 二进制数据 | Response.payload (Data) | 文件路径 + 读取 |
| 通知 | UNUserNotificationCenter / Overlay | Notification API |
| Shell 执行 | Process() | child_process.exec |

下一章将深入配置管理，分析 OpenClaw 如何实现配置热更新和双向同步。
