# 第二章：从零搭建你的第一个 Electron 应用

## 目录

- [概述](#概述)
- [环境准备](#环境准备)
- [项目初始化](#项目初始化)
- [项目结构详解](#项目结构详解)
- [package.json 每个字段详解](#packagejson-每个字段详解)
- [main.js 启动流程详解](#mainjs-启动流程详解)
- [app 生命周期事件详解](#app-生命周期事件详解)
- [BrowserWindow 配置项详解](#browserwindow-配置项详解)
- [加载 HTML 的多种方式](#加载-html-的多种方式)
- [preload 脚本入门](#preload-脚本入门)
- [完整示例：带 IPC 的应用](#完整示例带-ipc-的应用)
- [开发工作流](#开发工作流)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## 概述

本章将从 `npm init` 开始，一步步创建一个完整的 Electron 应用。我们不只是"跑起来"，而是要理解每一行代码背后的含义。

读完本章你将掌握：
- Electron 项目的标准结构
- `package.json` 中 Electron 相关配置的含义
- `main.js` 的启动流程和 `app` 生命周期
- `BrowserWindow` 的配置项和工作原理
- 如何正确加载页面内容
- preload 脚本的基本用法

---

## 环境准备

### 必要工具

```bash
# 1. Node.js (建议 v18+，推荐 v20 LTS)
node --version    # 确认版本
npm --version     # 确认 npm 可用

# 2. Git (用于版本控制)
git --version

# 3. 编辑器 (推荐 VS Code，它本身就是 Electron 应用)
code --version
```

### 为什么需要 Node.js 18+

Electron 从 v25 起要求 Node.js >= 18，原因包括：
- V8 引擎版本需要匹配
- 需要 ESM 模块支持
- 需要 `fetch` API（Node 18 内置）
- npm workspace 等现代特性

### 网络环境（中国大陆）

Electron 的预编译二进制文件托管在 GitHub，在国内下载可能很慢。配置镜像：

```bash
# 方式 1：设置环境变量
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

# 方式 2：.npmrc 文件（推荐，项目级）
echo 'electron_mirror=https://npmmirror.com/mirrors/electron/' >> .npmrc

# 方式 3：全局 .npmrc
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
```

---

## 项目初始化

### 第一步：创建项目目录

```bash
# 创建项目目录
mkdir my-electron-app
cd my-electron-app

# 初始化 npm 项目
npm init -y
```

`npm init -y` 会创建一个默认的 `package.json`。`-y` 表示接受所有默认值。

### 第二步：安装 Electron

```bash
# 安装 Electron 为开发依赖
npm install electron --save-dev
```

> **为什么是 `--save-dev`？**
> 
> Electron 是开发和打包工具，不是应用的运行时依赖。最终用户安装你的应用时，
> Electron 二进制文件会被打包工具（electron-builder）内嵌到安装包中，
> 而不是通过 npm install 安装。

安装过程中，npm 会：
1. 下载 `electron` npm 包（小，只有 JS 代码）
2. 在 `postinstall` 脚本中下载 Electron 预编译二进制（大，~80MB）
3. 二进制文件存放在 `node_modules/electron/dist/`

```
node_modules/electron/
├── dist/                    # Electron 二进制文件
│   ├── Electron.app/        # macOS
│   ├── electron.exe         # Windows  
│   ├── electron             # Linux
│   ├── libchromiumcontent.dylib
│   ├── libnode.dylib
│   └── ...
├── index.js                 # 导出 Electron 路径
├── install.js               # 下载二进制的脚本
└── package.json
```

### 第三步：创建项目文件

```bash
# 创建必要文件
touch main.js         # 主进程入口
touch preload.js      # 预加载脚本
touch index.html      # 页面文件
```

---

## 项目结构详解

一个最小的 Electron 项目结构如下：

```
my-electron-app/
│
├── package.json          # 项目配置（入口、依赖、脚本）
├── package-lock.json     # 依赖锁定文件
├── .npmrc                # npm 配置（镜像等）
│
├── main.js               # 主进程入口文件
├── preload.js            # preload 脚本（渲染进程桥接）
├── index.html            # 应用页面
│
├── node_modules/         # 依赖包
│   └── electron/         # Electron 框架
│
└── .gitignore            # Git 忽略配置
```

随着项目成长，建议演化为更清晰的结构：

```
my-electron-app/
│
├── package.json
├── .npmrc
├── .gitignore
│
├── src/                           # 源代码目录
│   ├── main/                      # 主进程代码
│   │   ├── main.js                # 入口
│   │   ├── window-manager.js      # 窗口管理
│   │   ├── ipc-handlers.js        # IPC 处理
│   │   └── menu.js                # 菜单配置
│   │
│   ├── preload/                   # preload 脚本
│   │   └── preload.js
│   │
│   └── renderer/                  # 渲染进程代码（前端）
│       ├── index.html
│       ├── styles.css
│       ├── app.js
│       └── components/
│
├── assets/                        # 静态资源
│   ├── icons/                     # 应用图标
│   └── images/
│
├── build/                         # 打包配置和资源
│   ├── icon.icns                  # macOS 图标
│   ├── icon.ico                   # Windows 图标
│   └── icon.png                   # Linux 图标
│
└── dist/                          # 构建输出（.gitignore）
```

### 架构映射

```
文件结构与进程的对应关系：

  src/main/          ──→  主进程 (Main Process)
       │                    │
       │ 启动时加载          │ 通过 IPC 通信
       │                    │
  src/preload/       ──→  preload 上下文 (Bridge)
       │                    │
       │ contextBridge      │ 暴露安全 API
       │                    │
  src/renderer/      ──→  渲染进程 (Renderer Process)
```

---

## package.json 每个字段详解

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "description": "我的第一个 Electron 应用",
  "main": "src/main/main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --enable-logging",
    "build": "electron-builder"
  },
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "electron": "^34.0.0",
    "electron-builder": "^25.0.0"
  },
  "dependencies": {
    "electron-store": "^10.0.0"
  }
}
```

### 逐字段解析

| 字段 | 含义 | Electron 特殊说明 |
|------|------|-------------------|
| `name` | 项目名称 | 会成为安装后的应用标识符 |
| `version` | 版本号 | 自动更新时用于比较版本 |
| `description` | 描述 | 某些打包工具会读取 |
| `main` | **入口文件** | **Electron 启动时执行的脚本** |
| `scripts.start` | 启动命令 | `electron .` 以当前目录为项目根启动 |
| `author` | 作者 | 打包时写入应用元信息 |
| `license` | 许可证 | 打包时写入 |

### `main` 字段的重要性

`main` 字段是 Electron 唯一用来确定"从哪里开始执行"的依据。当你运行 `electron .` 时：

```
electron .
    │
    ▼
读取当前目录的 package.json
    │
    ▼
找到 "main" 字段 → "src/main/main.js"
    │
    ▼
在主进程中执行这个文件
```

如果 `main` 字段缺失，Electron 会尝试加载 `index.js`。如果也不存在，应用启动失败。

### scripts 详解

```json
{
  "scripts": {
    // 基础启动
    "start": "electron .",
    
    // 开发模式：启用日志输出
    "dev": "electron . --enable-logging",
    
    // 开发模式：启用远程调试
    "debug": "electron . --inspect=5858",
    
    // 开发模式：等待调试器连接后再执行
    "debug:brk": "electron . --inspect-brk=5858",
    
    // 构建
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux"
  }
}
```

---

## main.js 启动流程详解

现在让我们写主进程入口文件。每一行都有详细注释：

```javascript
// main.js - Electron 主进程入口

// ============================================================
// 模块导入
// ============================================================

// app: 控制应用生命周期（启动、退出、事件等）
// BrowserWindow: 创建和管理浏览器窗口
const { app, BrowserWindow } = require('electron')

// path: Node.js 内置模块，用于处理文件路径
// 在 Electron 中特别重要，因为打包后路径会变化
const path = require('node:path')

// ============================================================
// 窗口创建函数
// ============================================================

function createWindow() {
  // 创建一个新的浏览器窗口实例
  // BrowserWindow 是 Electron 最核心的类之一
  const mainWindow = new BrowserWindow({
    // 窗口尺寸
    width: 1200,                    // 窗口宽度（像素）
    height: 800,                    // 窗口高度（像素）
    
    // webPreferences: 渲染进程的配置
    // 这是安全设置的核心区域
    webPreferences: {
      // preload 脚本路径
      // 在渲染进程的页面加载之前执行
      // 是主进程和渲染进程之间的"桥梁"
      preload: path.join(__dirname, 'preload.js'),
      
      // 上下文隔离（默认 true，Electron 12+）
      // 让 preload 脚本在独立的 JS 上下文中运行
      // 防止网页代码访问 preload 暴露的内部实现
      contextIsolation: true,
      
      // 禁止在渲染进程中使用 Node.js API（默认 false）
      // 永远不要设为 true，除非你完全信任加载的内容
      nodeIntegration: false,
    }
  })

  // 加载页面文件
  // loadFile 加载本地文件，loadURL 加载远程或本地 URL
  mainWindow.loadFile('index.html')

  // 开发时打开 DevTools（生产环境应该移除）
  // mainWindow.webContents.openDevTools()
}

// ============================================================
// 应用生命周期
// ============================================================

// app.whenReady() 返回一个 Promise
// 当 Electron 初始化完成时 resolve
// 这是创建窗口的最早时机
app.whenReady().then(() => {
  createWindow()
  
  // macOS 特殊处理：
  // 点击 Dock 图标时，如果没有打开的窗口，重新创建一个
  // 这是 macOS 应用的标准行为
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时的处理
app.on('window-all-closed', () => {
  // macOS 下，应用通常在所有窗口关闭后仍然保持运行
  // 直到用户通过 Cmd+Q 明确退出
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

### 启动流程时序图

```
app 启动时序：

  时间 ──────────────────────────────────────────────────→

  ┌─────┐  ┌──────────────┐  ┌──────────┐  ┌───────────┐
  │ 加载 │→│ will-finish-  │→│  ready   │→│ 创建窗口  │
  │ main │  │ launching    │  │ (可以创  │  │ BW.new()  │
  │ .js  │  │              │  │  建窗口) │  │           │
  └─────┘  └──────────────┘  └──────────┘  └─────┬─────┘
                                                   │
                                                   ▼
                              ┌──────────────────────────┐
                              │  渲染进程启动              │
                              │  1. 执行 preload.js       │
                              │  2. 加载 index.html       │
                              │  3. 执行页面 JS            │
                              └──────────────────────────┘
```

---

## app 生命周期事件详解

`app` 模块是 Electron 应用的"控制中心"，它触发一系列生命周期事件：

```javascript
// ============================================================
// app 完整生命周期事件
// ============================================================

// 1. will-finish-launching
// 最早的事件，在这之前几乎什么都不能做
// 常用于：设置崩溃报告、处理 open-file/open-url（macOS）
app.on('will-finish-launching', () => {
  console.log('1. will-finish-launching')
  
  // macOS: 用户双击文件打开应用时触发
  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    // 保存 filePath，等 ready 后处理
  })
  
  // macOS: 通过自定义协议打开应用时触发
  app.on('open-url', (event, url) => {
    event.preventDefault()
    // 保存 url，等 ready 后处理
  })
})

// 2. ready
// Electron 初始化完成，可以创建窗口和使用大多数 API
// app.whenReady() 是更推荐的 Promise 风格用法
app.on('ready', () => {
  console.log('2. ready')
})

// 等效的 Promise 方式（推荐）
app.whenReady().then(() => {
  console.log('2. ready (Promise)')
})

// 3. activate (仅 macOS)
// 用户点击 Dock 图标时触发
// 如果没有打开的窗口，通常应该创建一个
app.on('activate', (event, hasVisibleWindows) => {
  console.log('3. activate, hasVisibleWindows:', hasVisibleWindows)
  if (!hasVisibleWindows) {
    createWindow()
  }
})

// 4. browser-window-created
// 每当创建新窗口时触发
app.on('browser-window-created', (event, window) => {
  console.log('4. browser-window-created, id:', window.id)
})

// 5. before-quit
// 应用开始关闭前触发
// 调用 event.preventDefault() 可以阻止退出
app.on('before-quit', (event) => {
  console.log('5. before-quit')
  // 可以在这里保存数据
  // event.preventDefault()  // 阻止退出
})

// 6. will-quit
// 所有窗口已关闭，应用即将退出
// 在这之后无法阻止退出
app.on('will-quit', (event) => {
  console.log('6. will-quit')
  // 注销全局快捷键等清理工作
})

// 7. quit
// 应用已退出
app.on('quit', (event, exitCode) => {
  console.log('7. quit, exitCode:', exitCode)
})

// 8. window-all-closed
// 所有窗口关闭时（在 before-quit 之前）
app.on('window-all-closed', () => {
  console.log('8. window-all-closed')
  // macOS 下不退出，其他平台退出
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

### 生命周期流程图

```
                        应用启动
                          │
                          ▼
               will-finish-launching
                          │
                          ▼
                        ready ─────→ 创建窗口 ─→ 正常运行
                          │                          │
                          │                     用户关闭窗口
                          │                          │
                          │                          ▼
                          │              window-all-closed
                          │                    │
                     (macOS: activate)     (非 macOS)
                          │                    │
                          │                    ▼
                          │              before-quit
                          │                    │
                          │                    ▼
                          │               will-quit
                          │                    │
                          │                    ▼
                          │                  quit
                          │
                     等待下次 activate
```

### 常用 app 方法

```javascript
// 获取应用相关路径
app.getPath('userData')    // 用户数据目录
// macOS: ~/Library/Application Support/<app-name>/
// Windows: %APPDATA%/<app-name>/
// Linux: ~/.config/<app-name>/

app.getPath('temp')        // 系统临时目录
app.getPath('home')        // 用户主目录
app.getPath('desktop')     // 桌面目录
app.getPath('documents')   // 文档目录
app.getPath('downloads')   // 下载目录
app.getPath('exe')         // 应用可执行文件路径
app.getPath('appData')     // 应用数据根目录

// 获取应用信息
app.getName()              // 应用名称
app.getVersion()           // 版本号 (来自 package.json)
app.getLocale()            // 系统语言 (如 'zh-CN')
app.isReady()              // 是否已初始化

// 应用控制
app.quit()                 // 退出应用
app.relaunch()             // 重启应用
app.focus()                // 让应用获得焦点

// 单实例锁定（防止多开）
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  // 已经有实例在运行，退出
  app.quit()
} else {
  // 第二个实例尝试启动时触发
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 聚焦到已有窗口
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}
```

---

## BrowserWindow 配置项详解

`BrowserWindow` 是创建应用窗口的核心类。它的配置项非常丰富：

```javascript
const win = new BrowserWindow({
  // ═══════════════════════════════════════════
  // 窗口尺寸与位置
  // ═══════════════════════════════════════════
  width: 1200,                  // 宽度（像素）
  height: 800,                  // 高度（像素）
  minWidth: 600,                // 最小宽度
  minHeight: 400,               // 最小高度
  maxWidth: undefined,          // 最大宽度（不限制）
  maxHeight: undefined,         // 最大高度（不限制）
  x: undefined,                 // 窗口 x 坐标（默认居中）
  y: undefined,                 // 窗口 y 坐标（默认居中）
  center: true,                 // 是否居中显示
  
  // ═══════════════════════════════════════════
  // 窗口外观
  // ═══════════════════════════════════════════
  title: 'My App',              // 窗口标题（会被 HTML <title> 覆盖）
  icon: 'path/to/icon.png',     // 窗口图标（Windows/Linux）
  show: true,                   // 创建后是否立即显示
  frame: true,                  // 是否有窗口边框（标题栏+按钮）
  titleBarStyle: 'default',     // 标题栏样式
    // 'default'   - 标准系统标题栏
    // 'hidden'    - 隐藏标题栏但保留窗口控制按钮
    // 'hiddenInset' - macOS 特有，按钮内嵌
    // 'customButtonsOnHover' - macOS 特有
  
  backgroundColor: '#ffffff',   // 窗口背景色（加载前可见）
  opacity: 1.0,                 // 窗口透明度 (0.0 - 1.0)
  transparent: false,           // 是否完全透明
  
  // ═══════════════════════════════════════════
  // 窗口行为
  // ═══════════════════════════════════════════
  resizable: true,              // 是否可以调整大小
  movable: true,                // 是否可以移动
  minimizable: true,            // 是否可以最小化
  maximizable: true,            // 是否可以最大化
  closable: true,               // 是否可以关闭
  focusable: true,              // 是否可以聚焦
  alwaysOnTop: false,           // 是否始终在最上层
  fullscreen: false,            // 是否全屏
  fullscreenable: true,         // 是否允许全屏
  skipTaskbar: false,           // 是否在任务栏中隐藏
  
  // ═══════════════════════════════════════════
  // 父子窗口
  // ═══════════════════════════════════════════
  parent: null,                 // 父窗口引用（使其成为子窗口）
  modal: false,                 // 是否为模态窗口（需配合 parent）
  
  // ═══════════════════════════════════════════
  // Web 偏好设置（安全相关，最重要的部分）
  // ═══════════════════════════════════════════
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    
    // 安全设置
    nodeIntegration: false,       // ❌ 永远不要设为 true
    contextIsolation: true,       // ✅ 永远保持 true
    sandbox: true,                // ✅ 启用沙箱
    webSecurity: true,            // ✅ 永远保持 true
    
    // 功能开关
    devTools: true,               // 是否允许打开 DevTools
    spellcheck: true,             // 拼写检查
    enableWebSQL: false,          // WebSQL（已废弃）
    
    // 性能
    backgroundThrottling: true,   // 后台标签页节流
    
    // 高级
    additionalArguments: [],      // 传递给渲染进程的参数
    defaultEncoding: 'utf-8',     // 默认编码
    defaultFontFamily: {},        // 默认字体
    defaultFontSize: 16,          // 默认字号
    defaultMonospaceFontSize: 13, // 等宽字体字号
  }
})
```

### 窗口创建到显示的过程

```
new BrowserWindow(options)
         │
         ▼
  ┌──────────────────┐
  │ 创建原生窗口     │    ← 操作系统层面创建窗口句柄
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 启动渲染进程     │    ← 创建独立进程（继承 Chromium）
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 执行 preload.js  │    ← 在渲染进程中，页面加载前执行
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ loadFile/loadURL │    ← 开始加载页面内容
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 页面渲染完成     │    ← did-finish-load 事件
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 窗口显示         │    ← show: true 或 win.show()
  └──────────────────┘
```

### 避免白屏闪烁

当 `show: true`（默认）时，窗口创建后立即显示，但页面可能还没加载完成，用户会看到白屏。解决方案：

```javascript
const win = new BrowserWindow({
  show: false,              // 先不显示
  backgroundColor: '#2e2e2e', // 设置背景色，减少白屏感
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
  }
})

// 方案 1：页面加载完成后显示
win.once('ready-to-show', () => {
  win.show()
})

// 方案 2：带渐显效果
win.once('ready-to-show', () => {
  win.show()
  // Windows 上可以用 setOpacity 做渐显
})

win.loadFile('index.html')
```

---

## 加载 HTML 的多种方式

### 方式 1：加载本地文件（推荐）

```javascript
// 加载本地 HTML 文件
// 相对于应用根目录解析路径
win.loadFile('index.html')

// 也可以用绝对路径
win.loadFile(path.join(__dirname, 'renderer', 'index.html'))

// 支持传递查询参数和 hash
win.loadFile('index.html', {
  query: { page: 'settings' },    // → index.html?page=settings
  hash: 'section1'                // → index.html#section1
})
```

> `loadFile` 内部使用 `file://` 协议，但帮你处理了路径解析，比手动构造 `file://` URL 更安全。

### 方式 2：加载 URL

```javascript
// 加载远程 URL（注意安全风险！）
win.loadURL('https://example.com')

// 加载开发服务器（开发模式常用）
win.loadURL('http://localhost:3000')

// 加载 data URL
win.loadURL('data:text/html,<h1>Hello!</h1>')
```

### 方式 3：开发/生产环境切换

```javascript
// 常见模式：开发时用 dev server，生产时用本地文件
function loadContent(win) {
  if (process.env.NODE_ENV === 'development') {
    // 开发模式：加载 Vite/Webpack dev server
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // 生产模式：加载打包后的文件
    win.loadFile(path.join(__dirname, '../renderer/dist/index.html'))
  }
}
```

### 方式 4：自定义协议（最安全）

```javascript
const { protocol } = require('electron')

// 注册自定义协议
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'app', 
    privileges: { 
      secure: true,      // 视为安全来源
      standard: true,    // 遵循标准 URL 解析规则
      supportFetchAPI: true,
      corsEnabled: true
    } 
  }
])

app.whenReady().then(() => {
  // 拦截 app:// 协议，映射到本地文件
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    const filePath = path.join(__dirname, 'renderer', url.pathname)
    return new Response(fs.readFileSync(filePath))
  })
  
  const win = new BrowserWindow({ /* ... */ })
  win.loadURL('app://./index.html')
})
```

### index.html 示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  
  <!-- 安全：Content Security Policy -->
  <!-- 限制页面可以加载哪些资源 -->
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
  
  <title>我的 Electron 应用</title>
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    
    h1 {
      color: #569cd6;
    }
    
    #info {
      background: #2d2d2d;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
    }
  </style>
</head>
<body>
  <h1>🚀 Hello Electron!</h1>
  <p>欢迎来到你的第一个 Electron 应用。</p>
  
  <div id="info">
    <!-- 版本信息将通过 preload 脚本注入 -->
    <p>Chrome: <span id="chrome-version"></span></p>
    <p>Node.js: <span id="node-version"></span></p>
    <p>Electron: <span id="electron-version"></span></p>
  </div>
  
  <!-- 注意：这里不能直接 require()，因为 nodeIntegration: false -->
  <script src="./renderer.js"></script>
</body>
</html>
```

---

## preload 脚本入门

preload 脚本是 Electron 安全模型的核心组件。它运行在渲染进程中，但在页面代码之前执行，且拥有一些特殊能力。

```javascript
// preload.js
// 这个脚本在渲染进程中执行，在页面 JS 之前运行

const { contextBridge, ipcRenderer } = require('electron')

// contextBridge.exposeInMainWorld 安全地向页面暴露 API
// 页面代码通过 window.electronAPI 访问这些方法
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取版本信息（同步属性）
  versions: {
    chrome: process.versions.chrome,
    node: process.versions.node,
    electron: process.versions.electron,
  },
  
  // 发送消息到主进程（单向）
  sendMessage: (channel, data) => {
    // 白名单机制：只允许特定的 channel
    const validChannels = ['save-file', 'open-dialog']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  
  // 调用主进程方法并等待结果（双向）
  invoke: (channel, ...args) => {
    const validChannels = ['get-app-version', 'read-file']
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
  },
  
  // 监听主进程消息
  onMessage: (channel, callback) => {
    const validChannels = ['update-available', 'file-opened']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args))
    }
  }
})
```

### preload 的执行时机

```
渲染进程启动：

  ┌────────────────────────────┐
  │ 1. 渲染进程创建            │
  │    (新的 OS 进程)          │
  └──────────────┬─────────────┘
                 │
                 ▼
  ┌────────────────────────────┐
  │ 2. V8 初始化               │
  │    创建隔离的 JS 上下文    │
  └──────────────┬─────────────┘
                 │
                 ▼
  ┌────────────────────────────┐
  │ 3. preload.js 执行  ←──── │─── 此时 document 尚未创建
  │    contextBridge 暴露 API  │    但 window 对象已存在
  └──────────────┬─────────────┘
                 │
                 ▼
  ┌────────────────────────────┐
  │ 4. HTML 解析和渲染         │
  │    DOM 构建                │
  └──────────────┬─────────────┘
                 │
                 ▼
  ┌────────────────────────────┐
  │ 5. 页面 JS 执行            │
  │    可以使用 window.electronAPI │
  └────────────────────────────┘
```

---

## 完整示例：带 IPC 的应用

让我们把所有部分组合起来，创建一个有实际功能的应用：

### main.js

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.loadFile('index.html')
}

// IPC 处理器：获取应用版本
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// IPC 处理器：打开文件对话框
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (result.canceled) return null
  
  const filePath = result.filePaths[0]
  const content = fs.readFileSync(filePath, 'utf-8')
  return { path: filePath, content }
})

// IPC 处理器：保存文件
ipcMain.handle('save-file', async (event, { path: filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// 应用生命周期
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

### preload.js

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  versions: {
    chrome: process.versions.chrome,
    node: process.versions.node,
    electron: process.versions.electron,
  },
  
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openFile: () => ipcRenderer.invoke('open-file-dialog'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
})
```

### renderer.js（页面脚本）

```javascript
// 这个脚本在页面中运行，通过 window.electronAPI 与主进程通信

// 显示版本信息
document.getElementById('chrome-version').textContent = 
  window.electronAPI.versions.chrome
document.getElementById('node-version').textContent = 
  window.electronAPI.versions.node
document.getElementById('electron-version').textContent = 
  window.electronAPI.versions.electron

// 打开文件按钮
document.getElementById('open-btn').addEventListener('click', async () => {
  const result = await window.electronAPI.openFile()
  if (result) {
    document.getElementById('file-path').textContent = result.path
    document.getElementById('file-content').textContent = result.content
  }
})
```

---

## 开发工作流

### 启动应用

```bash
# 基础启动
npm start

# 或者直接调用
npx electron .

# 带日志输出
npx electron . --enable-logging

# 带远程调试（可在 Chrome DevTools 中调试主进程）
npx electron . --inspect=5858
# 然后在 Chrome 中打开 chrome://inspect
```

### 热重载配置

Electron 本身不支持热重载。手动方式是每次修改后 Ctrl+C 重启。更好的方式是使用工具：

```bash
# 方式 1：electron-reloader（简单）
npm install electron-reloader --save-dev
```

```javascript
// main.js 顶部添加
try {
  require('electron-reloader')(module, {
    debug: true,
    watchRenderer: true
  })
} catch (_) { /* 生产环境忽略 */ }
```

```bash
# 方式 2：配合 Vite（前端开发体验最好）
# 使用 electron-vite 或手动配置
npm install vite electron-vite --save-dev
```

### 调试技巧

```javascript
// 1. 打开渲染进程 DevTools
mainWindow.webContents.openDevTools()

// 2. 主进程日志
console.log('主进程日志会输出到终端')

// 3. 渲染进程日志
// 在页面 JS 中 console.log 会输出到 DevTools Console

// 4. 监听渲染进程崩溃
mainWindow.webContents.on('render-process-gone', (event, details) => {
  console.error('渲染进程崩溃:', details.reason)
  // 'clean-exit' | 'abnormal-exit' | 'killed' | 'crashed' | 'oom' | 'launch-failed'
})

// 5. 监听页面加载失败
mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
  console.error('页面加载失败:', errorCode, errorDescription)
})
```

---

## 深入理解

### 为什么 main.js 不能写 DOM 操作？

main.js 运行在**主进程**中。主进程没有 Chromium 渲染引擎（Blink），所以：

```
主进程 (main.js):
  ✅ require('fs')            // Node.js API
  ✅ require('electron').app  // Electron API
  ✅ new BrowserWindow()      // 创建窗口
  ❌ document.querySelector() // 没有 DOM！
  ❌ window.alert()           // 没有 window！

渲染进程 (页面 JS):
  ✅ document.querySelector() // DOM 操作
  ✅ fetch('https://...')     // Web API
  ❌ require('fs')            // 没有 Node.js！（默认）
  ❌ require('electron')      // 不直接可用
  ✅ window.electronAPI.xxx() // 通过 preload 桥接
```

### BrowserWindow 的本质

每个 `BrowserWindow` 背后是一个 **Chromium 渲染进程**。创建 10 个窗口就会有 10 个独立的渲染进程。它们：

- 各自有独立的内存空间
- 各自有独立的 V8 实例
- 互相之间不能直接通信（只能通过主进程中转）
- 一个崩溃不影响其他

```
主进程
  │
  ├── BrowserWindow #1 → 渲染进程 #1 (PID: 1001)
  │                       独立的 V8, Blink, 内存
  │
  ├── BrowserWindow #2 → 渲染进程 #2 (PID: 1002)
  │                       独立的 V8, Blink, 内存
  │
  └── BrowserWindow #3 → 渲染进程 #3 (PID: 1003)
                          独立的 V8, Blink, 内存
```

### __dirname 在打包前后的变化

这是一个常见的坑：

```javascript
// 开发环境
console.log(__dirname)
// → /Users/you/my-app/src/main

// 打包后（asar 内部）
console.log(__dirname)
// → /Applications/MyApp.app/Contents/Resources/app.asar/src/main

// 所以要用 path.join 而不是字符串拼接
// ❌ 错误
const preloadPath = __dirname + '/preload.js'

// ✅ 正确
const preloadPath = path.join(__dirname, 'preload.js')
```

---

## 常见问题

### Q1: `electron .` 报错 "Cannot find module"

```
Error: Cannot find module '/path/to/app/main.js'
```

原因：`package.json` 中 `main` 字段指向了不存在的文件。
解决：检查路径是否正确。

### Q2: 窗口显示白屏

可能原因：
1. `loadFile` 路径错误
2. HTML 文件中的 CSP 阻止了资源加载
3. renderer.js 有语法错误

调试方法：
```javascript
mainWindow.webContents.openDevTools()
// 查看 Console 和 Network 面板
```

### Q3: 安装 Electron 特别慢或失败

```bash
# 使用淘宝镜像
npm config set electron_mirror https://npmmirror.com/mirrors/electron/

# 或设置代理
npm config set proxy http://127.0.0.1:7890
npm config set https-proxy http://127.0.0.1:7890

# 重新安装
npm install electron --save-dev
```

### Q4: macOS 上 app 图标不显示

macOS 的应用图标需要 `.icns` 格式，在开发阶段（`electron .`）使用的是 Electron 默认图标。只有打包后才会显示自定义图标。详见第八章。

### Q5: 窗口关闭后应用没退出（Windows/Linux）

确保添加了 `window-all-closed` 处理：

```javascript
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

---

## 实践建议

### 1. 项目初始化清单

```
□ npm init
□ 安装 electron (--save-dev)
□ 配置 .npmrc (electron 镜像)
□ 创建 main.js, preload.js, index.html
□ 设置 package.json main 字段
□ 添加 start 脚本
□ 配置 .gitignore (node_modules, dist)
□ 确认安全设置 (contextIsolation, nodeIntegration)
□ 测试 npm start 能否正常启动
```

### 2. .gitignore 模板

```gitignore
node_modules/
dist/
out/
.DS_Store
*.log
.env
```

### 3. TypeScript 项目模板

```bash
# 推荐使用 electron-vite 快速创建 TS 项目
npm create @electron-vite/electron-vite

# 或者 Electron Forge + TypeScript
npx create-electron-app@latest my-app -- --template=vite-typescript
```

### 4. 关键原则

1. **始终使用 `contextIsolation: true`** — 这是默认值，不要改
2. **始终使用 `preload` 脚本** — 不要直接在渲染进程用 Node API
3. **路径使用 `path.join`** — 跨平台兼容
4. **先不显示窗口** — `show: false` + `ready-to-show` 避免白屏
5. **开发时打开 DevTools** — 但生产环境关闭
6. **单实例锁** — 防止用户多次打开应用

---

## 本章小结

我们从零创建了一个 Electron 应用，理解了：

- 项目结构和各文件的职责
- `package.json` 中 `main` 字段如何指定入口
- `main.js` 的启动流程
- `app` 的完整生命周期事件
- `BrowserWindow` 的丰富配置项
- 加载页面的多种方式
- `preload` 脚本的作用和时机

下一章将深入探讨 Electron 的进程模型——这是整个框架最核心的概念。

---

> **上一篇**：[01 - Electron 是什么](./01-what-is-electron.md)  
> **下一篇**：[03 - 进程模型深入](./03-process-model.md)
