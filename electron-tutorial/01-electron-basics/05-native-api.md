# 第五章：原生系统 API

## 目录

- [概述](#概述)
- [Menu 菜单系统](#menu-菜单系统)
- [dialog 对话框](#dialog-对话框)
- [Notification 系统通知](#notification-系统通知)
- [clipboard 剪贴板](#clipboard-剪贴板)
- [shell 模块](#shell-模块)
- [globalShortcut 全局快捷键](#globalshortcut-全局快捷键)
- [nativeTheme 主题](#nativetheme-主题)
- [powerMonitor 电源监控](#powermonitor-电源监控)
- [screen 屏幕信息](#screen-屏幕信息)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## 概述

Electron 提供了一系列原生 API，让你的应用能深度融入操作系统。这些 API 是桌面应用相比 Web 应用的核心优势。

```
Electron 原生 API 全景：

┌───────────────────────────────────────────────────────────┐
│                      主进程可用                            │
│                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  Menu    │ │ dialog   │ │ Notifi-  │ │ clipboard  │  │
│  │ 菜单系统 │ │ 对话框   │ │ cation   │ │ 剪贴板     │  │
│  └──────────┘ └──────────┘ │ 通知     │ └────────────┘  │
│                             └──────────┘                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  shell   │ │ global   │ │ native   │ │  power     │  │
│  │ 系统交互 │ │ Shortcut │ │ Theme    │ │  Monitor   │  │
│  └──────────┘ │ 全局快捷键│ │ 主题     │ │  电源监控  │  │
│               └──────────┘ └──────────┘ └────────────┘  │
│                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │  screen  │ │ systemPre│ │ nativeImg│                 │
│  │ 屏幕信息 │ │ ferences │ │ age 图片 │                 │
│  └──────────┘ └──────────┘ └──────────┘                 │
└───────────────────────────────────────────────────────────┘
```

> **重要**：大多数原生 API 只能在主进程中使用。渲染进程需要通过 IPC 调用主进程来间接使用。

---

## Menu 菜单系统

### 应用菜单（Application Menu）

应用菜单是出现在屏幕顶部（macOS）或窗口顶部（Windows/Linux）的菜单栏。

```javascript
const { Menu, app, shell, BrowserWindow } = require('electron')

function createApplicationMenu() {
  const isMac = process.platform === 'darwin'

  const template = [
    // macOS 上第一个菜单项是应用名称
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },           // 关于
        { type: 'separator' },
        { role: 'services' },        // 服务（macOS）
        { type: 'separator' },
        { role: 'hide' },            // 隐藏
        { role: 'hideOthers' },      // 隐藏其他
        { role: 'unhide' },          // 全部显示
        { type: 'separator' },
        { role: 'quit' },            // 退出
      ]
    }] : []),

    // 文件菜单
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          accelerator: 'CmdOrCtrl+N',  // 快捷键
          click: (menuItem, browserWindow) => {
            // menuItem: 被点击的菜单项
            // browserWindow: 当前聚焦的窗口
            browserWindow?.webContents.send('menu:new-file')
          }
        },
        {
          label: '打开...',
          accelerator: 'CmdOrCtrl+O',
          click: async (_, browserWindow) => {
            const { dialog } = require('electron')
            const result = await dialog.showOpenDialog(browserWindow, {
              properties: ['openFile']
            })
            if (!result.canceled) {
              browserWindow?.webContents.send('menu:open-file', result.filePaths[0])
            }
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: (_, browserWindow) => {
            browserWindow?.webContents.send('menu:save-file')
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // 编辑菜单
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ]
    },

    // 视图菜单
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },

    // 帮助菜单
    {
      label: '帮助',
      submenu: [
        {
          label: '文档',
          click: () => shell.openExternal('https://electronjs.org/docs')
        },
        {
          label: '报告问题',
          click: () => shell.openExternal('https://github.com/your-repo/issues')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
```

### 上下文菜单（Context Menu / 右键菜单）

```javascript
// 主进程
const { ipcMain, Menu } = require('electron')

ipcMain.on('show-context-menu', (event, params) => {
  const template = [
    {
      label: '复制',
      role: 'copy',
      enabled: params.hasSelection,
    },
    {
      label: '粘贴',
      role: 'paste',
    },
    { type: 'separator' },
    {
      label: '检查元素',
      click: () => {
        event.sender.inspectElement(params.x, params.y)
      }
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
})

// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  showContextMenu: (params) => ipcRenderer.send('show-context-menu', params)
})

// renderer.js
window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  window.electronAPI.showContextMenu({
    x: e.x,
    y: e.y,
    hasSelection: window.getSelection().toString().length > 0
  })
})
```

### 菜单项类型

```javascript
// 所有可用的菜单项类型
const menuItems = [
  { label: '普通项', type: 'normal', click: () => {} },
  { type: 'separator' },                          // 分割线
  { label: '复选框', type: 'checkbox', checked: true },
  { label: '单选 A', type: 'radio' },
  { label: '单选 B', type: 'radio' },
  {
    label: '子菜单',
    type: 'submenu',
    submenu: [
      { label: '子项 1' },
      { label: '子项 2' },
    ]
  }
]
```

### 内置角色（role）

Electron 提供了许多内置角色，自动处理平台差异：

```javascript
// 常用 role 列表
const roles = [
  'undo', 'redo',               // 编辑
  'cut', 'copy', 'paste',       // 剪贴板
  'delete', 'selectAll',        // 选择
  'reload', 'forceReload',      // 页面
  'toggleDevTools',             // 开发
  'resetZoom', 'zoomIn', 'zoomOut', // 缩放
  'togglefullscreen',           // 全屏
  'minimize', 'close',          // 窗口
  'quit',                       // 退出
  'about',                      // 关于 (macOS)
  'hide', 'hideOthers', 'unhide', // 显隐 (macOS)
  'startSpeaking', 'stopSpeaking', // 语音 (macOS)
  'windowMenu',                 // 窗口菜单 (macOS)
]
```

---

## dialog 对话框

### 所有对话框类型

```javascript
const { dialog, BrowserWindow } = require('electron')

// ═══════════════════════════════════════════
// 1. 打开文件对话框
// ═══════════════════════════════════════════
async function openFile(win) {
  const result = await dialog.showOpenDialog(win, {
    title: '选择文件',
    defaultPath: app.getPath('documents'),
    buttonLabel: '选择',                    // 自定义确认按钮文字
    filters: [
      { name: '图片', extensions: ['jpg', 'png', 'gif'] },
      { name: '文档', extensions: ['md', 'txt', 'pdf'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    properties: [
      'openFile',           // 允许选择文件
      // 'openDirectory',   // 允许选择文件夹
      // 'multiSelections', // 允许多选
      // 'showHiddenFiles', // 显示隐藏文件
      // 'createDirectory', // macOS: 允许创建目录
    ]
  })
  
  // result.canceled: boolean
  // result.filePaths: string[]
  return result
}

// ═══════════════════════════════════════════
// 2. 保存文件对话框
// ═══════════════════════════════════════════
async function saveFile(win) {
  const result = await dialog.showSaveDialog(win, {
    title: '保存文件',
    defaultPath: path.join(app.getPath('documents'), 'untitled.md'),
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: '文本', extensions: ['txt'] },
    ]
  })
  
  // result.canceled: boolean
  // result.filePath: string | undefined
  return result
}

// ═══════════════════════════════════════════
// 3. 消息对话框
// ═══════════════════════════════════════════
async function showMessage(win) {
  const result = await dialog.showMessageBox(win, {
    type: 'question',    // 'none' | 'info' | 'error' | 'question' | 'warning'
    title: '确认退出',
    message: '你有未保存的更改',
    detail: '退出前要保存吗？',
    buttons: ['保存', '不保存', '取消'],
    defaultId: 0,        // 默认选中的按钮索引
    cancelId: 2,         // 按 Esc 时的按钮索引
    noLink: true,        // Windows: 不使用链接样式按钮
    
    // macOS 特有
    checkboxLabel: '下次不再提醒',
    checkboxChecked: false,
  })
  
  // result.response: number (按钮索引)
  // result.checkboxChecked: boolean
  return result
}

// ═══════════════════════════════════════════
// 4. 错误对话框（同步，可在 ready 前调用）
// ═══════════════════════════════════════════
dialog.showErrorBox('致命错误', '应用无法启动，请联系技术支持。')
```

---

## Notification 系统通知

```javascript
const { Notification } = require('electron')

// ═══════════════════════════════════════════
// 基本通知
// ═══════════════════════════════════════════
function showBasicNotification() {
  const notification = new Notification({
    title: '下载完成',
    body: 'update-v2.0.0.dmg 已下载到"下载"文件夹',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    silent: false,    // 是否静音
  })

  notification.on('click', () => {
    console.log('用户点击了通知')
    // 打开下载文件夹
    shell.showItemInFolder(downloadPath)
  })

  notification.on('close', () => {
    console.log('通知已关闭')
  })

  notification.show()
}

// ═══════════════════════════════════════════
// 交互式通知（macOS 支持按钮）
// ═══════════════════════════════════════════
function showInteractiveNotification() {
  const notification = new Notification({
    title: '新版本可用',
    body: 'v2.1.0 包含重要安全修复',
    
    // macOS 交互式通知
    actions: [
      { type: 'button', text: '立即更新' },
      { type: 'button', text: '稍后提醒' },
    ],
    closeButtonText: '忽略',
    hasReply: false,  // 是否显示回复框
  })

  notification.on('action', (event, index) => {
    if (index === 0) {
      startUpdate()
    } else {
      scheduleReminder()
    }
  })

  notification.show()
}

// 检查通知权限
if (Notification.isSupported()) {
  showBasicNotification()
}
```

---

## clipboard 剪贴板

```javascript
const { clipboard, nativeImage } = require('electron')

// ═══════════════════════════════════════════
// 文本操作
// ═══════════════════════════════════════════
clipboard.writeText('Hello, World!')
const text = clipboard.readText()

// ═══════════════════════════════════════════
// HTML 操作
// ═══════════════════════════════════════════
clipboard.writeHTML('<b>粗体文本</b>')
const html = clipboard.readHTML()

// ═══════════════════════════════════════════
// 图片操作
// ═══════════════════════════════════════════
const image = nativeImage.createFromPath('/path/to/image.png')
clipboard.writeImage(image)

const clipImage = clipboard.readImage()
if (!clipImage.isEmpty()) {
  const pngBuffer = clipImage.toPNG()
  fs.writeFileSync('pasted-image.png', pngBuffer)
}

// ═══════════════════════════════════════════
// 富文本（同时写入多种格式）
// ═══════════════════════════════════════════
clipboard.write({
  text: '纯文本备选',
  html: '<b>富文本</b>内容',
  // rtf: '...',
  // bookmark: '标题',
})

// ═══════════════════════════════════════════
// 读取可用格式
// ═══════════════════════════════════════════
const formats = clipboard.availableFormats()
// ['text/plain', 'text/html', 'image/png', ...]
```

### 通过 IPC 在渲染进程中使用

```javascript
// 主进程
ipcMain.handle('clipboard:read-text', () => clipboard.readText())
ipcMain.handle('clipboard:write-text', (_, text) => clipboard.writeText(text))
ipcMain.handle('clipboard:read-image', () => {
  const img = clipboard.readImage()
  if (img.isEmpty()) return null
  return img.toPNG()  // 返回 Buffer
})

// preload.js
contextBridge.exposeInMainWorld('clipboard', {
  readText: () => ipcRenderer.invoke('clipboard:read-text'),
  writeText: (text) => ipcRenderer.invoke('clipboard:write-text', text),
  readImage: () => ipcRenderer.invoke('clipboard:read-image'),
})
```

---

## shell 模块

`shell` 模块提供与操作系统 Shell 交互的功能：

```javascript
const { shell } = require('electron')

// 在默认浏览器中打开 URL
shell.openExternal('https://electronjs.org')

// 打开文件（用系统默认程序）
shell.openPath('/path/to/document.pdf')

// 在文件管理器中显示文件
shell.showItemInFolder('/path/to/file.txt')

// 将文件移到回收站
const success = await shell.trashItem('/path/to/file.txt')

// 发出系统提示音
shell.beep()
```

> **安全注意**：`shell.openExternal` 不要传入用户输入的未验证 URL。恶意 URL（如 `file://`、`javascript:` 等）可能造成安全问题。

```javascript
// ✅ 安全用法
function safeOpenExternal(url) {
  try {
    const parsed = new URL(url)
    if (['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
      shell.openExternal(url)
    }
  } catch {
    // 无效 URL，忽略
  }
}
```

---

## globalShortcut 全局快捷键

全局快捷键在应用失去焦点时也能触发，非常强大但也需要谨慎使用。

```javascript
const { globalShortcut, app } = require('electron')

app.whenReady().then(() => {
  // 注册全局快捷键
  const success = globalShortcut.register('CmdOrCtrl+Shift+Space', () => {
    console.log('全局快捷键触发！')
    // 常见用法：显示/隐藏应用窗口
    const win = BrowserWindow.getAllWindows()[0]
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })

  if (!success) {
    console.warn('快捷键注册失败（可能被其他应用占用）')
  }

  // 检查快捷键是否已注册
  console.log(globalShortcut.isRegistered('CmdOrCtrl+Shift+Space'))  // true
})

// 退出时注销所有全局快捷键（重要！）
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
```

### 快捷键修饰符

```
快捷键语法：

  修饰符:
    CmdOrCtrl  → macOS: Cmd, Windows/Linux: Ctrl
    Cmd        → macOS 专用
    Ctrl       → 所有平台
    Alt        → Alt/Option
    Shift      → Shift
    Super      → Windows键/Cmd键

  按键:
    A-Z, 0-9
    F1-F24
    Plus, Space, Tab, Backspace, Delete
    Insert, Return/Enter
    Up, Down, Left, Right
    Home, End, PageUp, PageDown
    Escape/Esc
    VolumeUp, VolumeDown, VolumeMute
    MediaNextTrack, MediaPreviousTrack, MediaStop, MediaPlayPause
    PrintScreen

  示例:
    'CmdOrCtrl+Shift+Z'      全平台重做
    'Alt+Shift+F5'            自定义功能键
    'MediaPlayPause'          媒体键（无修饰符）
```

### 冲突处理

```javascript
// 优雅处理快捷键冲突
function registerSafely(accelerator, callback) {
  const success = globalShortcut.register(accelerator, callback)
  if (!success) {
    // 尝试备用快捷键
    const fallback = accelerator.replace('CmdOrCtrl', 'Alt+CmdOrCtrl')
    const fallbackSuccess = globalShortcut.register(fallback, callback)
    if (!fallbackSuccess) {
      console.warn(`无法注册快捷键 ${accelerator} 或备用 ${fallback}`)
      return null
    }
    return fallback
  }
  return accelerator
}
```

---

## nativeTheme 主题

```javascript
const { nativeTheme } = require('electron')

// 获取当前系统主题
console.log('暗色模式:', nativeTheme.shouldUseDarkColors)
console.log('高对比度:', nativeTheme.shouldUseHighContrastColors)
console.log('系统主题源:', nativeTheme.themeSource) // 'system' | 'light' | 'dark'

// 设置应用主题
nativeTheme.themeSource = 'dark'    // 强制暗色
nativeTheme.themeSource = 'light'   // 强制亮色
nativeTheme.themeSource = 'system'  // 跟随系统

// 监听主题变化
nativeTheme.on('updated', () => {
  const isDark = nativeTheme.shouldUseDarkColors
  console.log('主题变化:', isDark ? '暗色' : '亮色')
  
  // 通知所有窗口
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('theme-changed', isDark)
  })
})

// 通过 IPC 让渲染进程控制主题
ipcMain.handle('theme:toggle', () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = 'light'
  } else {
    nativeTheme.themeSource = 'dark'
  }
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('theme:set', (_, theme) => {
  nativeTheme.themeSource = theme  // 'system' | 'light' | 'dark'
})
```

### 渲染进程中的主题支持

```css
/* 利用 CSS 媒体查询自动响应主题 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #1e1e1e;
    --text-color: #d4d4d4;
    --border-color: #404040;
  }
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-color: #ffffff;
    --text-color: #333333;
    --border-color: #e0e0e0;
  }
}

body {
  background: var(--bg-color);
  color: var(--text-color);
}
```

---

## powerMonitor 电源监控

```javascript
const { powerMonitor } = require('electron')

// 必须在 app ready 之后使用
app.whenReady().then(() => {
  // 系统挂起（休眠/合盖）
  powerMonitor.on('suspend', () => {
    console.log('系统挂起')
    // 适合：暂停后台任务、保存状态
    pauseBackgroundSync()
  })

  // 系统恢复
  powerMonitor.on('resume', () => {
    console.log('系统恢复')
    // 适合：恢复后台任务、重新连接
    resumeBackgroundSync()
    checkForUpdates()
  })

  // 电源状态变化
  powerMonitor.on('on-ac', () => console.log('接入电源'))
  powerMonitor.on('on-battery', () => console.log('使用电池'))

  // 锁屏/解锁
  powerMonitor.on('lock-screen', () => {
    console.log('屏幕锁定')
    // 适合：暂停敏感操作
  })
  
  powerMonitor.on('unlock-screen', () => {
    console.log('屏幕解锁')
  })

  // 获取电池状态
  const batteryLevel = powerMonitor.isOnBatteryPower()
  console.log('使用电池:', batteryLevel)

  // 获取系统空闲时间（秒）
  const idleTime = powerMonitor.getSystemIdleTime()
  console.log('空闲时间:', idleTime, '秒')

  // 获取电池热状态 (macOS)
  // 'unknown' | 'nominal' | 'fair' | 'serious' | 'critical'
  const thermal = powerMonitor.getCurrentThermalState()
  console.log('热状态:', thermal)
})
```

---

## screen 屏幕信息

```javascript
const { screen } = require('electron')

app.whenReady().then(() => {
  // 获取所有显示器
  const displays = screen.getAllDisplays()
  displays.forEach((display, i) => {
    console.log(`显示器 ${i}:`, {
      id: display.id,
      bounds: display.bounds,           // { x, y, width, height }
      workArea: display.workArea,       // 减去任务栏的可用区域
      scaleFactor: display.scaleFactor, // 缩放比 (1, 1.5, 2, ...)
      rotation: display.rotation,       // 0, 90, 180, 270
      internal: display.internal,       // 是否内置显示器
      size: display.size,               // { width, height }
    })
  })

  // 获取主显示器
  const primary = screen.getPrimaryDisplay()

  // 获取鼠标位置
  const cursor = screen.getCursorScreenPoint()
  console.log('鼠标位置:', cursor)  // { x, y }

  // 获取鼠标所在的显示器
  const mouseDisplay = screen.getDisplayNearestPoint(cursor)

  // 监听显示器变化（外接显示器插拔）
  screen.on('display-added', (event, newDisplay) => {
    console.log('新显示器连接:', newDisplay.id)
  })

  screen.on('display-removed', (event, oldDisplay) => {
    console.log('显示器断开:', oldDisplay.id)
    // 检查窗口是否还在可见区域内
    ensureWindowsVisible()
  })

  screen.on('display-metrics-changed', (event, display, changedMetrics) => {
    console.log('显示器参数变化:', changedMetrics)
    // changedMetrics: ['bounds', 'workArea', 'scaleFactor', 'rotation']
  })
})
```

---

## 深入理解

### 原生 API 的调用路径

```
渲染进程中使用原生 API 的完整路径：

  renderer.js
    │
    │ window.electronAPI.showNotification(...)
    │
    ▼
  preload.js (contextBridge)
    │
    │ ipcRenderer.invoke('show-notification', ...)
    │
    ▼
  ═══════ IPC 边界 (进程间通信) ═══════
    │
    ▼
  main.js (ipcMain.handle)
    │
    │ new Notification({ ... }).show()
    │
    ▼
  Electron Native Binding (C++)
    │
    ▼
  操作系统 API
    │
    ├── macOS: NSUserNotificationCenter / UNUserNotificationCenter
    ├── Windows: WinRT Toast Notifications
    └── Linux: libnotify / D-Bus
```

### 跨平台差异总结

```
┌──────────────────┬──────────┬──────────┬──────────┐
│ API              │ macOS    │ Windows  │ Linux    │
├──────────────────┼──────────┼──────────┼──────────┤
│ 应用菜单         │ 屏幕顶部 │ 窗口顶部 │ 窗口顶部 │
│ 通知按钮         │ ✅       │ ⚠️ 有限  │ ⚠️ 有限  │
│ 通知回复框       │ ✅       │ ❌       │ ❌       │
│ Tray 文字        │ ✅       │ ❌       │ ❌       │
│ vibrancy 毛玻璃  │ ✅       │ ❌       │ ❌       │
│ titleBarStyle    │ 多种     │ hidden   │ hidden   │
│ Touch Bar        │ ✅       │ ❌       │ ❌       │
│ globalShortcut   │ ✅       │ ✅       │ ⚠️ 部分  │
└──────────────────┴──────────┴──────────┴──────────┘
```

---

## 常见问题

### Q1: globalShortcut 注册失败

**原因**：快捷键已被其他应用占用。  
**解决**：提供用户可配置的快捷键设置，并处理注册失败。

### Q2: macOS 上通知不显示

检查系统设置 → 通知 → 确认你的应用被允许发送通知。开发阶段使用 `electron .` 时，通知权限属于 Electron 本身。

### Q3: dialog 在渲染进程中调用报错

`dialog` 只能在主进程中使用。渲染进程必须通过 IPC 调用。

### Q4: 剪贴板在 Linux 上不稳定

Linux 有两个剪贴板：`clipboard`（Ctrl+C/V）和 `selection`（鼠标选中）。Electron 的 `clipboard` 模块有第二个参数指定：

```javascript
clipboard.readText('selection')  // Linux 鼠标选择剪贴板
clipboard.readText('clipboard')  // 标准剪贴板（默认）
```

---

## 实践建议

### 1. 菜单设计

- 遵循各平台的菜单习惯（macOS 第一项是 app 名称）
- 使用内置 `role` 而非手动实现标准功能
- 为常用操作设置 `accelerator` 快捷键
- 动态更新菜单状态（`enabled`、`checked`）

### 2. 对话框使用

- 始终传入 `parentWindow` 参数（模态对话框）
- 提供合理的 `defaultPath`
- 文件过滤器要包含 "所有文件" 选项
- 错误对话框用 `dialog.showErrorBox`（可在 ready 前使用）

### 3. 全局快捷键

- 不要占用常见系统快捷键
- 提供自定义快捷键的设置界面
- 退出前一定注销所有快捷键
- 优雅处理注册失败

### 4. 主题支持

- 使用 CSS `prefers-color-scheme` 媒体查询
- 提供 "跟随系统 / 浅色 / 深色" 三个选项
- 监听 `nativeTheme.on('updated')` 动态切换
- 持久化用户的主题偏好

---

## 本章小结

Electron 的原生 API 让桌面应用能深度融入操作系统：

1. **Menu** 提供应用菜单和上下文菜单
2. **dialog** 提供各种系统对话框
3. **Notification** 提供系统级通知
4. **clipboard** 提供剪贴板读写
5. **shell** 提供系统交互能力
6. **globalShortcut** 提供全局快捷键
7. **nativeTheme** 提供主题跟随
8. **powerMonitor** 提供电源状态监控
9. **screen** 提供屏幕信息

掌握这些 API，你的应用就能提供真正的"原生体验"。

---

> **上一篇**：[04 - 窗口管理](./04-window-management.md)  
> **下一篇**：[06 - 安全](./06-security.md)
