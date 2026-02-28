# 第四章：窗口管理

## 目录

- [BrowserWindow 完整生命周期](#browserwindow-完整生命周期)
- [窗口事件详解](#窗口事件详解)
- [多窗口管理策略](#多窗口管理策略)
- [无边框窗口（Frameless）实现](#无边框窗口frameless实现)
- [自定义标题栏](#自定义标题栏)
- [模态窗口与子窗口](#模态窗口与子窗口)
- [BrowserView vs webview vs iframe](#browserview-vs-webview-vs-iframe)
- [Tray 系统托盘完整实现](#tray-系统托盘完整实现)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## BrowserWindow 完整生命周期

### 创建到销毁的完整流程

```
BrowserWindow 生命周期：

  new BrowserWindow(options)
       │
       ▼
  ┌─────────────────────┐
  │  原生窗口创建        │ ← OS 层面创建窗口句柄
  │  渲染进程启动        │ ← 独立进程
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  preload 脚本执行    │
  └──────────┬──────────┘
             │
       loadFile / loadURL
             │
             ▼
  ┌─────────────────────┐
  │  did-start-loading   │ ← 开始加载
  │  did-start-navigation│
  │  dom-ready          │ ← DOM 可用
  │  did-finish-load    │ ← 加载完成
  └──────────┬──────────┘
             │
       ready-to-show ← 推荐在这里 show()
             │
             ▼
  ┌─────────────────────┐
  │  窗口可见，用户交互   │ ← 正常运行阶段
  │  focus / blur        │
  │  resize / move       │
  │  minimize / maximize │
  └──────────┬──────────┘
             │
        用户点击关闭
             │
             ▼
  ┌─────────────────────┐
  │  close 事件          │ ← 可以 preventDefault
  │  closed 事件         │ ← 窗口已销毁
  │  渲染进程终止        │
  └─────────────────────┘
```

### 创建窗口的最佳实践

```javascript
const { BrowserWindow } = require('electron')
const path = require('node:path')

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,                    // 关键：先隐藏
    backgroundColor: '#1e1e1e',     // 设背景色防白闪
    
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    
    // macOS 特定
    titleBarStyle: 'hiddenInset',   // 内嵌标题栏
    trafficLightPosition: { x: 15, y: 15 },
    vibrancy: 'under-window',      // 毛玻璃效果
  })

  // 优雅显示
  win.once('ready-to-show', () => {
    win.show()
  })

  // 保存窗口位置和尺寸
  win.on('close', () => {
    saveWindowBounds(win.getBounds())
  })

  win.loadFile('index.html')
  return win
}
```

---

## 窗口事件详解

### 重要事件分类

```javascript
const win = new BrowserWindow({ /* ... */ })

// ═══════════════════════════════════════════
// 加载事件（来自 webContents）
// ═══════════════════════════════════════════

win.webContents.on('did-start-loading', () => {
  console.log('开始加载')
})

win.webContents.on('dom-ready', () => {
  console.log('DOM 已就绪')
  // 适合注入 CSS
  win.webContents.insertCSS('body { background: #1e1e1e; }')
})

win.webContents.on('did-finish-load', () => {
  console.log('加载完成')
})

win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
  console.error('加载失败:', errorCode, errorDescription)
  // 常见错误码：
  // -3: ERR_ABORTED（请求被中止）
  // -6: ERR_FILE_NOT_FOUND
  // -105: ERR_NAME_NOT_RESOLVED
  // -106: ERR_INTERNET_DISCONNECTED
})

// ═══════════════════════════════════════════
// 窗口状态事件
// ═══════════════════════════════════════════

win.on('focus', () => console.log('窗口获得焦点'))
win.on('blur', () => console.log('窗口失去焦点'))

win.on('maximize', () => console.log('最大化'))
win.on('unmaximize', () => console.log('取消最大化'))
win.on('minimize', () => console.log('最小化'))
win.on('restore', () => console.log('从最小化恢复'))

win.on('enter-full-screen', () => console.log('进入全屏'))
win.on('leave-full-screen', () => console.log('退出全屏'))

win.on('resize', () => {
  const [width, height] = win.getSize()
  console.log(`尺寸变化: ${width}x${height}`)
})

win.on('move', () => {
  const [x, y] = win.getPosition()
  console.log(`位置变化: (${x}, ${y})`)
})

// ═══════════════════════════════════════════
// 关闭事件（最重要）
// ═══════════════════════════════════════════

// close: 窗口即将关闭（可以阻止）
win.on('close', (event) => {
  // 常见用法：关闭时最小化到托盘而非退出
  if (shouldMinimizeToTray) {
    event.preventDefault()
    win.hide()
    return
  }
  
  // 常见用法：未保存数据时确认
  if (hasUnsavedChanges) {
    event.preventDefault()
    showSaveDialog(win)
  }
})

// closed: 窗口已销毁（此时不能再操作窗口）
win.on('closed', () => {
  // 清理引用，让 GC 回收
  mainWindow = null
})
```

### ready-to-show 的重要性

```
有 ready-to-show:
  创建窗口 → 加载页面 → 渲染完成 → 显示窗口
  用户看到: [完整的界面]

没有 ready-to-show:
  创建窗口 → [白屏!] → 加载页面 → [闪烁!] → 渲染完成
  用户看到: [白屏] → [闪烁] → [完整界面]
```

---

## 多窗口管理策略

### 窗口管理器模式

```javascript
// window-manager.js

class WindowManager {
  constructor() {
    this.windows = new Map()  // id → BrowserWindow
  }

  create(id, options = {}) {
    if (this.windows.has(id)) {
      // 已有同 id 窗口，聚焦它
      const existing = this.windows.get(id)
      if (existing.isMinimized()) existing.restore()
      existing.focus()
      return existing
    }

    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      show: false,
      ...options,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        ...options.webPreferences,
      }
    })

    win.once('ready-to-show', () => win.show())

    win.on('closed', () => {
      this.windows.delete(id)
    })

    this.windows.set(id, win)
    return win
  }

  get(id) {
    return this.windows.get(id) || null
  }

  getAll() {
    return Array.from(this.windows.values())
  }

  closeAll() {
    this.windows.forEach(win => win.close())
  }

  // 向所有窗口广播消息
  broadcast(channel, ...args) {
    this.windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    })
  }
}

module.exports = new WindowManager()
```

### 窗口状态持久化

```javascript
// window-state.js
const Store = require('electron-store')
const { screen } = require('electron')

const store = new Store()

function getWindowState(windowName, defaults) {
  const key = `windowState.${windowName}`
  const saved = store.get(key, defaults)
  
  // 验证保存的位置是否仍在可用的显示器范围内
  const displays = screen.getAllDisplays()
  const inBounds = displays.some(display => {
    const { x, y, width, height } = display.bounds
    return (
      saved.x >= x &&
      saved.y >= y &&
      saved.x + saved.width <= x + width &&
      saved.y + saved.height <= y + height
    )
  })
  
  if (!inBounds) {
    // 如果保存的位置不在任何显示器内（比如外接显示器拔掉了）
    return defaults
  }
  
  return saved
}

function saveWindowState(windowName, win) {
  if (win.isMaximized() || win.isMinimized()) return
  
  const bounds = win.getBounds()
  store.set(`windowState.${windowName}`, {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  })
}

module.exports = { getWindowState, saveWindowState }
```

---

## 无边框窗口（Frameless）实现

### 基本无边框窗口

```javascript
const win = new BrowserWindow({
  frame: false,  // 移除系统标题栏和边框
  
  // 透明背景（可选，用于圆角等效果）
  transparent: true,
  backgroundColor: '#00000000',
  
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
  }
})
```

### 窗口拖拽区域

无边框窗口默认不能拖拽。需要用 CSS 指定可拖拽区域：

```css
/* 标题栏区域可拖拽 */
.title-bar {
  -webkit-app-region: drag;     /* 可拖拽 */
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 10px;
}

/* 标题栏内的按钮不可拖拽（否则点不了） */
.title-bar button,
.title-bar input {
  -webkit-app-region: no-drag;  /* 不可拖拽 */
}
```

```
无边框窗口布局：

  ┌──────────────────────────────────────────┐
  │  .title-bar (-webkit-app-region: drag)   │ ← 可拖拽
  │  ┌──────┐  ┌─────────────┐  ┌─┬─┬─┐    │
  │  │ Logo │  │ Search...   │  │-│□│×│    │ ← 按钮区域 no-drag
  │  └──────┘  └─────────────┘  └─┴─┴─┘    │
  ├──────────────────────────────────────────┤
  │                                          │
  │         应用内容区域                      │
  │         (-webkit-app-region: no-drag)    │ ← 正常交互
  │                                          │
  └──────────────────────────────────────────┘
```

### macOS hiddenInset 风格

macOS 上更推荐使用 `titleBarStyle: 'hiddenInset'` 而非完全无边框：

```javascript
const win = new BrowserWindow({
  titleBarStyle: 'hiddenInset',  // 隐藏标题栏但保留红绿灯按钮
  trafficLightPosition: { x: 15, y: 15 }, // 调整红绿灯位置
  
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
  }
})
```

```
macOS hiddenInset 效果：

  ┌──────────────────────────────────────────┐
  │ ● ● ●   自定义标题栏内容                │
  │ (红绿灯)                                │
  ├──────────────────────────────────────────┤
  │                                          │
  │              应用内容                     │
  │                                          │
  └──────────────────────────────────────────┘

  优势：保留了 macOS 原生的窗口控制按钮
  劣势：只适用于 macOS
```

---

## 自定义标题栏

### 完整实现

```javascript
// main.js
const win = new BrowserWindow({
  frame: false,
  width: 1200,
  height: 800,
  minWidth: 600,
  minHeight: 400,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
  }
})

// IPC：窗口控制
ipcMain.on('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.minimize()
})

ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.on('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.close()
})

// 通知渲染进程最大化状态变化
function setupWindowEvents(win) {
  win.on('maximize', () => {
    win.webContents.send('window:maximized', true)
  })
  win.on('unmaximize', () => {
    win.webContents.send('window:maximized', false)
  })
}
```

```javascript
// preload.js
contextBridge.exposeInMainWorld('windowAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  onMaximized: (callback) => {
    ipcRenderer.on('window:maximized', (_, isMaximized) => callback(isMaximized))
  },
})
```

```html
<!-- 自定义标题栏 HTML -->
<div class="titlebar" id="titlebar">
  <div class="titlebar-drag">
    <img src="./icon.png" class="titlebar-icon" />
    <span class="titlebar-title">My Application</span>
  </div>
  <div class="titlebar-controls">
    <button class="titlebar-btn" id="btn-minimize">
      <svg width="10" height="1"><rect width="10" height="1" fill="currentColor"/></svg>
    </button>
    <button class="titlebar-btn" id="btn-maximize">
      <svg width="10" height="10"><rect width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/></svg>
    </button>
    <button class="titlebar-btn titlebar-btn-close" id="btn-close">
      <svg width="10" height="10">
        <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/>
        <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </button>
  </div>
</div>

<style>
.titlebar {
  -webkit-app-region: drag;
  height: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #323233;
  color: #cccccc;
  font-size: 13px;
  user-select: none;
}

.titlebar-drag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 10px;
}

.titlebar-icon {
  width: 16px;
  height: 16px;
}

.titlebar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.titlebar-btn {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  color: #cccccc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.titlebar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.titlebar-btn-close:hover {
  background: #e81123;
  color: white;
}
</style>

<script>
document.getElementById('btn-minimize').onclick = () => window.windowAPI.minimize()
document.getElementById('btn-maximize').onclick = () => window.windowAPI.maximize()
document.getElementById('btn-close').onclick = () => window.windowAPI.close()
</script>
```

---

## 模态窗口与子窗口

### 模态窗口

模态窗口会阻塞父窗口的交互，直到模态窗口关闭。

```javascript
function showSettingsModal(parentWin) {
  const modal = new BrowserWindow({
    parent: parentWin,      // 指定父窗口
    modal: true,            // 设为模态
    width: 600,
    height: 400,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  })

  modal.once('ready-to-show', () => modal.show())
  modal.loadFile('settings.html')
  
  return modal
}
```

### 子窗口（非模态）

```javascript
function createChildWindow(parentWin) {
  const child = new BrowserWindow({
    parent: parentWin,      // 指定父窗口
    // modal: false,        // 默认就是非模态
    width: 400,
    height: 300,
    
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  })

  // 子窗口特性：
  // - 始终在父窗口上方
  // - 父窗口关闭时子窗口也关闭
  // - 但不会阻塞父窗口交互（非模态）

  child.loadFile('child.html')
  return child
}
```

```
窗口层级关系：

  父窗口 ─┬─ 子窗口 A（非模态，可以同时交互）
           ├─ 子窗口 B（非模态）
           └─ 模态窗口（父窗口不可交互）
```

---

## BrowserView vs webview vs iframe

### 三者对比

```
┌────────────────┬──────────────────┬──────────────────┬─────────────┐
│                │   BrowserView    │   <webview>      │   <iframe>  │
├────────────────┼──────────────────┼──────────────────┼─────────────┤
│ 独立进程       │ ✅ 是            │ ✅ 是            │ ❌ 同进程   │
│ 性能隔离       │ ✅ 完全          │ ✅ 完全          │ ❌ 共享     │
│ Node.js 访问   │ ✅ 可配置        │ ✅ 可配置        │ ❌ 不可     │
│ API 丰富度     │ 高               │ 中               │ 低          │
│ DOM 嵌入       │ ❌ 浮动层        │ ✅ DOM 元素      │ ✅ DOM 元素 │
│ 推荐度         │ ⚠️ 已不推荐      │ ⚠️ 有限支持      │ ✅ 推荐     │
│ 替代方案       │ 用 webContentsView│                  │             │
└────────────────┴──────────────────┴──────────────────┴─────────────┘
```

### 推荐做法：iframe + preload

对于嵌入第三方内容的场景，推荐使用 iframe：

```javascript
// 主进程：配置 webPreferences
const win = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    // 允许 iframe 加载远程内容
    webSecurity: true,
  }
})
```

```html
<!-- 渲染进程：使用 iframe -->
<iframe 
  src="https://example.com" 
  sandbox="allow-scripts allow-same-origin"
  style="width: 100%; height: 400px; border: none;"
></iframe>
```

### WebContentsView（新 API）

Electron 30+ 推荐使用 `WebContentsView` 替代 `BrowserView`：

```javascript
const { BaseWindow, WebContentsView } = require('electron')

const win = new BaseWindow({ width: 800, height: 600 })

const leftView = new WebContentsView()
win.contentView.addChildView(leftView)
leftView.setBounds({ x: 0, y: 0, width: 400, height: 600 })
leftView.webContents.loadURL('https://example.com')

const rightView = new WebContentsView()
win.contentView.addChildView(rightView)
rightView.setBounds({ x: 400, y: 0, width: 400, height: 600 })
rightView.webContents.loadFile('sidebar.html')
```

---

## Tray 系统托盘完整实现

### 基本托盘

```javascript
const { app, Tray, Menu, nativeImage, BrowserWindow } = require('electron')
const path = require('node:path')

let tray = null

function createTray(mainWindow) {
  // 创建托盘图标
  // macOS: 建议用 Template 图片（自动适应明暗主题）
  // 尺寸建议: 16x16 (标准), 32x32 (@2x)
  const iconPath = path.join(__dirname, 'assets', 
    process.platform === 'darwin' ? 'tray-iconTemplate.png' : 'tray-icon.png'
  )
  
  tray = new Tray(iconPath)
  
  // 设置 tooltip
  tray.setToolTip('My Electron App')

  // 构建右键菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: '● 已连接',
      enabled: false,  // 灰色不可点击
    },
    { type: 'separator' },  // 分割线
    {
      label: '设置',
      submenu: [
        {
          label: '开机自启',
          type: 'checkbox',
          checked: app.getLoginItemSettings().openAtLogin,
          click: (menuItem) => {
            app.setLoginItemSettings({
              openAtLogin: menuItem.checked
            })
          }
        },
        {
          label: '最小化到托盘',
          type: 'checkbox',
          checked: true,
        }
      ]
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // 单击托盘图标：显示/隐藏窗口（Windows/Linux 常见行为）
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // 双击托盘图标（Windows）
  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  return tray
}

// 配合 close 事件实现"关闭到托盘"
function setupCloseToTray(mainWindow) {
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}
```

### 动态更新托盘

```javascript
// 更新图标（如有新消息）
function updateTrayIcon(hasNotification) {
  const iconName = hasNotification ? 'tray-icon-notification.png' : 'tray-icon.png'
  const icon = nativeImage.createFromPath(
    path.join(__dirname, 'assets', iconName)
  )
  tray.setImage(icon)
}

// 更新 tooltip
function updateTrayTooltip(text) {
  tray.setToolTip(text)
}

// macOS: 设置标题（显示在图标旁边的文字）
if (process.platform === 'darwin') {
  tray.setTitle('3')  // 显示数字
}
```

### macOS Template 图标说明

```
macOS Template 图标规范：

  文件名: xxxTemplate.png / xxxTemplate@2x.png
  颜色: 纯黑色 + 透明通道
  尺寸: 16x16 (@1x) / 32x32 (@2x)

  macOS 会自动处理：
  - 浅色模式 → 黑色图标
  - 深色模式 → 白色图标
  - 高亮状态 → 系统高亮色

  ┌─────────────────────────────┐
  │  tray-iconTemplate.png      │  16x16, 纯黑+透明
  │  tray-iconTemplate@2x.png   │  32x32, 纯黑+透明
  └─────────────────────────────┘
```

---

## 深入理解

### 窗口与渲染进程的对应关系

```
一个 BrowserWindow = 一个渲染进程

  BrowserWindow #1 (visible)
    └→ Renderer Process #1 (PID: 2001, 内存: ~80MB)

  BrowserWindow #2 (minimized)  
    └→ Renderer Process #2 (PID: 2002, 内存: ~60MB)
       ⚠️ 最小化的窗口渲染进程仍在运行

  BrowserWindow #3 (hidden, win.hide())
    └→ Renderer Process #3 (PID: 2003, 内存: ~60MB)
       ⚠️ 隐藏的窗口渲染进程仍在运行

优化技巧：
  - 不需要的窗口用 win.destroy() 彻底销毁
  - 经常需要的窗口可以 hide/show 而非 destroy/create
  - backgroundThrottling: true 可以降低不可见窗口的资源消耗
```

### 窗口 Z 轴层级

```
窗口层级（从底到顶）：

  ┌─── 普通窗口 ──────────────────────────────┐
  │                                            │
  │  BrowserWindow (默认)                      │
  │                                            │
  ├─── alwaysOnTop 窗口 ──────────────────────┤
  │                                            │
  │  BrowserWindow({ alwaysOnTop: true })      │
  │  ⚠️ 不同 level 有不同优先级 (macOS)        │
  │  win.setAlwaysOnTop(true, 'floating')      │
  │  win.setAlwaysOnTop(true, 'screen-saver')  │
  │                                            │
  ├─── 模态窗口 ──────────────────────────────┤
  │                                            │
  │  BrowserWindow({ parent, modal: true })    │
  │  始终在父窗口上方                          │
  │                                            │
  └────────────────────────────────────────────┘
```

### 多显示器处理

```javascript
const { screen } = require('electron')

// 获取所有显示器
const displays = screen.getAllDisplays()
console.log('显示器数量:', displays.length)

// 获取主显示器
const primary = screen.getPrimaryDisplay()
console.log('主显示器:', primary.bounds)  // { x, y, width, height }
console.log('缩放比:', primary.scaleFactor)

// 获取鼠标所在的显示器
const cursor = screen.getCursorScreenPoint()
const currentDisplay = screen.getDisplayNearestPoint(cursor)

// 在鼠标所在的显示器上创建窗口
function createWindowOnCurrentDisplay() {
  const { bounds } = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint()
  )
  
  return new BrowserWindow({
    x: bounds.x + Math.round((bounds.width - 800) / 2),
    y: bounds.y + Math.round((bounds.height - 600) / 2),
    width: 800,
    height: 600,
  })
}
```

---

## 常见问题

### Q1: macOS 上红绿灯按钮消失了

使用 `frame: false` 时红绿灯会消失。改用 `titleBarStyle: 'hiddenInset'` 来保留。

### Q2: 窗口大小不对（高 DPI 屏幕）

Electron 的窗口尺寸是**逻辑像素**，不是物理像素。在 2x 缩放的 Retina 屏上，`width: 800` 实际渲染 1600 物理像素。

### Q3: 关闭窗口后 app 没退出

检查是否有隐藏的窗口或 Tray 阻止了退出。确保在 `window-all-closed` 事件中调用 `app.quit()`。

### Q4: Tray 图标在 macOS 上太大/太小

使用 `Template` 后缀的 16x16 图片，并提供 @2x 版本。

### Q5: 无边框窗口在 Windows 上不能调整大小

需要手动实现窗口边缘的拖拽调整。或者使用 `resizable: true` + CSS 自定义。

---

## 实践建议

### 1. 窗口管理清单

```
□ 使用 show: false + ready-to-show 避免白屏
□ 设置 backgroundColor 匹配应用主题
□ 设置 minWidth/minHeight 防止窗口过小
□ 持久化窗口位置和尺寸
□ 处理多显示器场景（外接显示器拔出）
□ macOS 使用 titleBarStyle 而非 frame: false
□ 实现关闭到托盘（如适用）
□ 单实例锁防止多开
```

### 2. 性能优化

- 只创建必要的窗口，不用时 destroy
- 利用 `backgroundThrottling` 降低后台窗口资源消耗
- 大量数据的窗口间传输用 MessagePort
- 避免在 resize/move 事件中做重计算（用 debounce）

### 3. 跨平台注意事项

```
macOS:
  - 使用 titleBarStyle: 'hiddenInset'
  - Tray 图标用 Template
  - 遵循 macOS 的"关闭窗口但不退出应用"规范

Windows:
  - 自定义标题栏要处理 Aero Snap
  - Tray 图标用 .ico 格式效果最好
  - 注意任务栏缩略图预览

Linux:
  - 不同桌面环境的 Tray 支持差异大
  - 某些 Wayland 环境下 Tray 可能不工作
  - 窗口管理器差异导致行为不一致
```

---

## 本章小结

窗口管理是 Electron 应用的"门面"：

1. **BrowserWindow** 有丰富的配置项和完整的生命周期
2. **多窗口** 需要统一管理，持久化状态
3. **无边框 / 自定义标题栏** 提升应用品质感
4. **Tray** 是后台应用的标配
5. 跨平台差异不容忽视

下一章我们将探索 Electron 提供的原生系统 API。

---

> **上一篇**：[03 - 进程模型深入](./03-process-model.md)  
> **下一篇**：[05 - 原生系统 API](./05-native-api.md)
