# 第二章：electron-updater 详解

## 目录

- [autoUpdater 事件生命周期](#autoupdater-事件生命周期)
- [electron-updater 配置详解](#electron-updater-配置详解)
- [发布到 GitHub Releases](#发布到-github-releases)
- [发布到 S3/自建服务器](#发布到-s3自建服务器)
- [差分更新（blockmap）](#差分更新blockmap)
- [进度展示与用户交互](#进度展示与用户交互)
- [静默更新 vs 强制更新](#静默更新-vs-强制更新)
- [错误处理与日志](#错误处理与日志)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## autoUpdater 事件生命周期

### 完整事件流

```
electron-updater 事件生命周期：

  autoUpdater.checkForUpdates()
       │
       ▼
  ┌─────────────────────┐
  │ checking-for-update │ ← 开始检查
  └──────────┬──────────┘
             │
       ┌─────┴─────┐
       │           │
       ▼           ▼
  ┌────────┐  ┌──────────────┐
  │ update-│  │ update-      │
  │ not-   │  │ available    │ ← 发现新版本
  │ available│ └──────┬───────┘
  └────────┘         │
                     ▼
            ┌────────────────┐
            │ download-      │ ← 下载进度
            │ progress       │    (多次触发)
            │ { percent,     │
            │   bytesPerSec, │
            │   transferred, │
            │   total }      │
            └───────┬────────┘
                    │
                    ▼
            ┌────────────────┐
            │ update-        │ ← 下载完成
            │ downloaded     │
            └───────┬────────┘
                    │
            autoUpdater.quitAndInstall()
                    │
                    ▼
            ┌────────────────┐
            │ before-quit-   │ ← 准备安装
            │ for-update     │
            └───────┬────────┘
                    │
                    ▼
              应用退出并安装
              → 重启后进入新版本

  任何阶段出错:
            ┌────────────────┐
            │ error          │ ← 错误事件
            │ { message,     │
            │   stack }      │
            └────────────────┘
```

### 代码实现

```javascript
// updater.js — 主进程
const { autoUpdater } = require('electron-updater')
const { app, BrowserWindow, ipcMain } = require('electron')
const log = require('electron-log')

// 配置日志
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'

class AppUpdater {
  constructor() {
    // 配置
    autoUpdater.autoDownload = false    // 不自动下载，让用户决定
    autoUpdater.autoInstallOnAppQuit = true  // 退出时自动安装
    
    this.setupEvents()
  }

  setupEvents() {
    // 1. 开始检查
    autoUpdater.on('checking-for-update', () => {
      log.info('正在检查更新...')
      this.sendToRenderer('update-status', { status: 'checking' })
    })

    // 2. 有更新可用
    autoUpdater.on('update-available', (info) => {
      log.info('发现新版本:', info.version)
      // info 包含:
      // {
      //   version: '2.0.0',
      //   releaseDate: '2024-01-15T10:00:00Z',
      //   releaseNotes: '## 更新内容\n- 修复xxx',
      //   files: [{ url, sha512, size }],
      // }
      this.sendToRenderer('update-status', {
        status: 'available',
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      })
    })

    // 3. 没有更新
    autoUpdater.on('update-not-available', (info) => {
      log.info('当前已是最新版本:', info.version)
      this.sendToRenderer('update-status', {
        status: 'not-available',
        currentVersion: app.getVersion(),
      })
    })

    // 4. 下载进度
    autoUpdater.on('download-progress', (progress) => {
      // progress:
      // {
      //   total: 52428800,        // 总大小 (bytes)
      //   delta: 1048576,         // 本次增量
      //   transferred: 10485760,  // 已传输
      //   percent: 20,            // 百分比
      //   bytesPerSecond: 2097152 // 速度 (bytes/s)
      // }
      log.info(`下载进度: ${progress.percent.toFixed(1)}%`)
      this.sendToRenderer('update-status', {
        status: 'downloading',
        percent: progress.percent,
        speed: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      })
    })

    // 5. 下载完成
    autoUpdater.on('update-downloaded', (info) => {
      log.info('更新下载完成:', info.version)
      this.sendToRenderer('update-status', {
        status: 'downloaded',
        version: info.version,
      })
    })

    // 6. 错误
    autoUpdater.on('error', (error) => {
      log.error('更新错误:', error)
      this.sendToRenderer('update-status', {
        status: 'error',
        message: error.message,
      })
    })
  }

  // 检查更新
  async checkForUpdates() {
    try {
      return await autoUpdater.checkForUpdates()
    } catch (err) {
      log.error('检查更新失败:', err)
    }
  }

  // 开始下载
  async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      log.error('下载更新失败:', err)
    }
  }

  // 退出并安装
  quitAndInstall() {
    autoUpdater.quitAndInstall(
      false,  // isSilent: false = 显示安装进度
      true    // isForceRunAfter: 安装后自动启动
    )
  }

  // 发送消息到渲染进程
  sendToRenderer(channel, data) {
    const wins = BrowserWindow.getAllWindows()
    wins.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    })
  }
}

module.exports = AppUpdater
```

---

## electron-updater 配置详解

### 基本配置

```javascript
const { autoUpdater } = require('electron-updater')

// ═══════════════════════════════════════════
// 核心配置
// ═══════════════════════════════════════════

// 是否自动下载（默认 true）
autoUpdater.autoDownload = false

// 退出时自动安装（默认 true）
autoUpdater.autoInstallOnAppQuit = true

// 是否允许降级（默认 false）
autoUpdater.allowDowngrade = false

// 是否允许预发布版本（默认 false）
autoUpdater.allowPrerelease = false

// 更新检查间隔的最小时间（默认无限制）
// 避免频繁检查
autoUpdater.autoRunAppAfterInstall = true

// 更新渠道（对应 package.json 版本号后缀）
// 'latest' | 'beta' | 'alpha'
autoUpdater.channel = 'latest'

// 自定义请求头（用于认证）
autoUpdater.requestHeaders = {
  'Authorization': 'Bearer your-token'
}
```

### package.json 中的 publish 配置

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "your-org",
        "repo": "your-app",
        "releaseType": "release"
      }
    ]
  }
}
```

### 运行时覆盖配置

```javascript
// 可以在运行时动态修改更新服务器地址
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://your-update-server.com/releases',
  channel: 'stable',
})

// 或者使用 GitHub
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-org',
  repo: 'your-app',
  token: process.env.GH_TOKEN,  // 私有仓库需要 token
})

// 或者使用 S3
autoUpdater.setFeedURL({
  provider: 's3',
  bucket: 'your-bucket',
  region: 'us-east-1',
  acl: 'public-read',
})
```

---

## 发布到 GitHub Releases

### 完整流程

```
GitHub Releases 发布流程：

  1. 开发者提交代码
       │
       ▼
  2. 打 tag: git tag v1.1.0 && git push --tags
       │
       ▼
  3. CI 构建各平台安装包
       │
       ▼
  4. CI 自动上传到 GitHub Release
       │
       │  上传的文件：
       │  ├── MyApp-1.1.0.dmg
       │  ├── MyApp-1.1.0-mac.zip
       │  ├── MyApp-1.1.0-mac.zip.blockmap
       │  ├── latest-mac.yml          ← 元数据
       │  ├── MyApp-Setup-1.1.0.exe
       │  ├── MyApp-Setup-1.1.0.exe.blockmap
       │  ├── latest.yml              ← 元数据
       │  ├── MyApp-1.1.0.AppImage
       │  └── latest-linux.yml        ← 元数据
       │
       ▼
  5. 客户端 autoUpdater 检查 latest.yml
       │
       ▼
  6. 发现新版本 → 下载 → 安装
```

### latest.yml 文件格式

```yaml
# latest.yml (Windows)
version: 1.1.0
files:
  - url: MyApp-Setup-1.1.0.exe
    sha512: base64编码的SHA512哈希
    size: 85000000
    blockMapSize: 200000
path: MyApp-Setup-1.1.0.exe
sha512: base64编码的SHA512哈希
releaseDate: '2024-01-15T10:00:00.000Z'

# latest-mac.yml (macOS)
version: 1.1.0
files:
  - url: MyApp-1.1.0-mac.zip
    sha512: base64编码的SHA512哈希
    size: 90000000
    blockMapSize: 180000
path: MyApp-1.1.0-mac.zip
sha512: base64编码的SHA512哈希
releaseDate: '2024-01-15T10:00:00.000Z'
```

### 发布脚本

```json
{
  "scripts": {
    "release": "electron-builder --publish always",
    "release:draft": "electron-builder --publish onTagOrDraft"
  }
}
```

```bash
# 发布流程
npm version patch              # 1.0.0 → 1.0.1
git push --follow-tags         # 推送代码和 tag
# CI 自动执行 npm run release
```

---

## 发布到 S3/自建服务器

### 自建服务器（Generic Provider）

```javascript
// 主进程配置
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://updates.yourapp.com/releases',
})
```

服务器目录结构：

```
https://updates.yourapp.com/releases/
├── latest.yml              # Windows 元数据
├── latest-mac.yml          # macOS 元数据
├── latest-linux.yml        # Linux 元数据
├── MyApp-Setup-1.1.0.exe   # Windows 安装包
├── MyApp-Setup-1.1.0.exe.blockmap
├── MyApp-1.1.0-mac.zip     # macOS 更新包
├── MyApp-1.1.0-mac.zip.blockmap
└── MyApp-1.1.0.AppImage    # Linux
```

### 最简单的更新服务器

```javascript
// update-server.js — 用 Express 实现
const express = require('express')
const path = require('path')

const app = express()
const RELEASES_DIR = path.join(__dirname, 'releases')

// 静态文件服务
app.use('/releases', express.static(RELEASES_DIR))

// 可选：版本检查 API
app.get('/api/check-update', (req, res) => {
  const { platform, version } = req.query
  
  const ymlFile = platform === 'darwin' ? 'latest-mac.yml' : 'latest.yml'
  const ymlPath = path.join(RELEASES_DIR, ymlFile)
  
  try {
    const content = fs.readFileSync(ymlPath, 'utf-8')
    res.type('text/yaml').send(content)
  } catch {
    res.status(404).send('No update available')
  }
})

app.listen(3000, () => {
  console.log('Update server running on port 3000')
})
```

### S3 配置

```json
{
  "build": {
    "publish": {
      "provider": "s3",
      "bucket": "my-app-releases",
      "region": "ap-southeast-1",
      "acl": "public-read",
      "path": "/releases/"
    }
  }
}
```

---

## 差分更新（blockmap）

### blockmap 工作原理

```
blockmap 差分更新原理：

  旧版本文件被分割成固定大小的块 (block)，每个块有 hash：

  旧版本 (v1.0):                    新版本 (v1.1):
  ┌──────┬──────┬──────┬──────┐    ┌──────┬──────┬──────┬──────┐
  │ 块A  │ 块B  │ 块C  │ 块D  │    │ 块A  │ 块B' │ 块C  │ 块E  │
  │ hash1│ hash2│ hash3│ hash4│    │ hash1│ hash5│ hash3│ hash6│
  └──────┴──────┴──────┴──────┘    └──────┴──────┴──────┴──────┘

  对比两个版本的 blockmap：
  - 块A: hash1 == hash1 → 不需要下载 ✓
  - 块B: hash2 != hash5 → 需要下载 ↓
  - 块C: hash3 == hash3 → 不需要下载 ✓
  - 块D: hash4 → 不存在于新版本 (删除)
  - 块E: hash6 → 新增，需要下载 ↓

  结果：只下载 块B' 和 块E，节省 50% 下载量

  实际效果：
  ┌──────────────────────────────────────────┐
  │  全量下载:    85MB                        │
  │  差分下载:    10-30MB (取决于变更量)      │
  │  节省:        60-90%                      │
  └──────────────────────────────────────────┘
```

### blockmap 自动生成

electron-builder 在构建时会自动生成 `.blockmap` 文件：

```bash
# 构建后的输出
dist/
├── MyApp-Setup-1.1.0.exe
├── MyApp-Setup-1.1.0.exe.blockmap    ← 自动生成
├── MyApp-1.1.0-mac.zip
├── MyApp-1.1.0-mac.zip.blockmap      ← 自动生成
└── latest.yml                        ← 包含 blockMapSize
```

无需额外配置，electron-updater 会自动：
1. 下载新版本的 blockmap
2. 与本地旧版本的 blockmap 对比
3. 只下载差异的块
4. 与本地旧文件合并生成新文件

---

## 进度展示与用户交互

### 渲染进程 UI

```javascript
// preload.js
contextBridge.exposeInMainWorld('updater', {
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onStatus: (callback) => {
    ipcRenderer.on('update-status', (_, data) => callback(data))
  },
})

// renderer.js — 更新 UI 逻辑
class UpdateUI {
  constructor() {
    window.updater.onStatus((data) => this.handleStatus(data))
  }

  handleStatus(data) {
    switch (data.status) {
      case 'checking':
        this.showMessage('正在检查更新...')
        break

      case 'available':
        this.showUpdateDialog(data)
        break

      case 'not-available':
        this.showMessage('当前已是最新版本')
        break

      case 'downloading':
        this.showProgress(data)
        break

      case 'downloaded':
        this.showInstallDialog(data)
        break

      case 'error':
        this.showError(data.message)
        break
    }
  }

  showProgress(data) {
    const percent = data.percent.toFixed(1)
    const speed = this.formatSpeed(data.speed)
    const transferred = this.formatSize(data.transferred)
    const total = this.formatSize(data.total)

    document.getElementById('progress-bar').style.width = `${percent}%`
    document.getElementById('progress-text').textContent = 
      `${transferred} / ${total}  (${speed})  ${percent}%`
  }

  showUpdateDialog(data) {
    // 显示更新内容和确认按钮
    const dialog = document.getElementById('update-dialog')
    dialog.querySelector('.version').textContent = `v${data.version}`
    dialog.querySelector('.notes').innerHTML = data.releaseNotes || '无更新说明'
    dialog.style.display = 'block'
  }

  showInstallDialog(data) {
    const msg = `v${data.version} 已下载完成，是否立即安装？`
    if (confirm(msg)) {
      window.updater.installUpdate()
    }
  }

  formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  formatSpeed(bytesPerSec) {
    return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
  }
}
```

---

## 静默更新 vs 强制更新

### 静默更新

```javascript
// 后台自动下载，下次启动时安装
class SilentUpdater {
  constructor() {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    
    // 定期检查（每 4 小时）
    setInterval(() => {
      autoUpdater.checkForUpdates()
    }, 4 * 60 * 60 * 1000)
    
    // 启动时检查
    autoUpdater.checkForUpdates()

    autoUpdater.on('update-downloaded', (info) => {
      log.info(`v${info.version} 已在后台下载，将在下次启动时安装`)
      // 可选：通知用户
      this.showSubtleNotification(info)
    })
  }

  showSubtleNotification(info) {
    new Notification({
      title: '更新就绪',
      body: `v${info.version} 已下载，下次启动时自动安装`,
      silent: true,
    }).show()
  }
}
```

### 强制更新

```javascript
// 低于最低版本时强制更新
class ForceUpdater {
  constructor() {
    this.minVersion = null  // 从服务器获取
  }

  async checkMinVersion() {
    try {
      const response = await fetch('https://api.yourapp.com/min-version')
      const { minVersion } = await response.json()
      this.minVersion = minVersion
      
      const currentVersion = app.getVersion()
      if (this.compareVersions(currentVersion, minVersion) < 0) {
        this.forceUpdate()
      }
    } catch (err) {
      log.error('检查最低版本失败:', err)
    }
  }

  forceUpdate() {
    // 禁用应用主功能，只显示更新界面
    const win = BrowserWindow.getAllWindows()[0]
    win.loadFile('force-update.html')
    
    // 自动开始下载
    autoUpdater.autoDownload = true
    autoUpdater.checkForUpdates()
    
    autoUpdater.on('update-downloaded', () => {
      // 5 秒后自动安装
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true)
      }, 5000)
    })
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1
      if (parts1[i] < parts2[i]) return -1
    }
    return 0
  }
}
```

---

## 错误处理与日志

```javascript
const log = require('electron-log')

// 配置日志
autoUpdater.logger = log
log.transports.file.level = 'info'
log.transports.file.maxSize = 5 * 1024 * 1024  // 5MB
log.transports.file.format = '{h}:{i}:{s} {text}'

// 日志文件位置：
// macOS: ~/Library/Logs/<app-name>/main.log
// Windows: %USERPROFILE%\AppData\Roaming\<app-name>\logs\main.log
// Linux: ~/.config/<app-name>/logs/main.log

// 错误处理
autoUpdater.on('error', (error) => {
  log.error('更新错误:', error)
  
  // 分类处理
  if (error.message.includes('net::ERR_INTERNET_DISCONNECTED')) {
    // 网络断开
    scheduleRetry(5 * 60 * 1000)  // 5 分钟后重试
  } else if (error.message.includes('sha512 checksum mismatch')) {
    // 文件损坏
    log.error('更新文件校验失败，可能被篡改')
    // 清理下载缓存
    cleanUpdateCache()
  } else if (error.message.includes('ENOSPC')) {
    // 磁盘空间不足
    notifyUser('磁盘空间不足，无法下载更新')
  } else {
    // 其他错误
    notifyUser('更新失败，将在下次启动时重试')
  }
})

// 重试机制
let retryCount = 0
const MAX_RETRIES = 3

function scheduleRetry(delay) {
  if (retryCount >= MAX_RETRIES) {
    log.warn('更新重试次数已达上限')
    return
  }
  retryCount++
  setTimeout(() => {
    autoUpdater.checkForUpdates()
  }, delay)
}
```

---

## 深入理解

### 更新服务器协议

```
electron-updater 的更新检查协议：

  1. 客户端请求 latest.yml (或 latest-mac.yml)
     GET https://server/releases/latest.yml
     Headers:
       User-Agent: MyApp/1.0.0
       Cache-Control: no-cache

  2. 服务器返回 YAML
     200 OK
     Content-Type: text/yaml
     ---
     version: 1.1.0
     files:
       - url: MyApp-Setup-1.1.0.exe
         sha512: xxxx
         size: 85000000

  3. 客户端比较版本号
     当前: 1.0.0  <  服务器: 1.1.0
     → 有更新可用

  4. 客户端下载更新文件
     GET https://server/releases/MyApp-Setup-1.1.0.exe
     支持 Range 请求（断点续传和差分下载）

  5. 校验
     计算下载文件的 SHA512
     与 yml 中的 sha512 对比
```

### 更新文件的下载位置

```
下载的更新文件存放位置：

  macOS:
    ~/Library/Caches/<app-name>-updater/

  Windows:
    %LOCALAPPDATA%\<app-name>-updater\

  Linux:
    ~/.cache/<app-name>-updater/

  目录内容：
  ├── pending/
  │   └── MyApp-Setup-1.1.0.exe  (下载中)
  ├── MyApp-Setup-1.1.0.exe      (下载完成)
  └── update-info.json            (元数据缓存)
```

### 安装过程

```
各平台的安装过程：

  macOS:
  1. 解压 .zip 到临时目录
  2. 替换 .app 包
  3. 重启应用
  (如果在 /Applications 下，可能需要权限提升)

  Windows (NSIS):
  1. 启动 NSIS 安装程序（静默模式）
  2. 安装程序替换文件
  3. 重启应用
  (通常不需要管理员权限，因为安装在用户目录)

  Linux (AppImage):
  1. 替换 .AppImage 文件
  2. 重启应用
```

---

## 常见问题

### Q1: 开发环境怎么测试自动更新？

```javascript
// 方法 1：使用 dev-app-update.yml
// 在项目根目录创建 dev-app-update.yml
// provider: generic
// url: http://localhost:8080/releases

// 方法 2：代码中指定
if (process.env.NODE_ENV === 'development') {
  autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
  // 或
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'http://localhost:8080/releases',
  })
}
```

### Q2: macOS 签名验证失败

确保：
1. 更新的 zip 文件已签名
2. 签名证书与当前版本一致
3. entitlements 配置正确

### Q3: Windows 下更新后没有重启

确保调用 `quitAndInstall` 时传递正确参数：
```javascript
autoUpdater.quitAndInstall(false, true)
// isSilent: false (显示安装进度)
// isForceRunAfter: true (安装后启动应用)
```

### Q4: 如何实现多渠道（beta/stable）？

```javascript
// package.json 版本号带后缀
// "version": "1.1.0-beta.1"  → beta 渠道
// "version": "1.1.0"          → stable 渠道

// 主进程中设置渠道
autoUpdater.channel = store.get('updateChannel', 'latest')
// 'latest' = stable, 'beta' = beta, 'alpha' = alpha
```

### Q5: 下载很慢怎么办？

1. 使用 CDN 加速（CloudFront、Cloudflare）
2. 启用 blockmap 差分更新
3. 选择离用户近的服务器区域

---

## 实践建议

### 1. 更新策略模板

```javascript
// 推荐的更新策略
const updateStrategy = {
  // 普通更新：后台下载，提示安装
  normal: {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    checkInterval: 4 * 60 * 60 * 1000,  // 4小时
    userPrompt: 'optional',  // 用户可选
  },
  
  // 重要更新：提示下载，强烈建议安装
  important: {
    autoDownload: false,
    userPrompt: 'recommended',
    dismissible: true,
    remindLater: 24 * 60 * 60 * 1000,  // 24小时后再提醒
  },
  
  // 强制更新：必须安装才能继续使用
  critical: {
    autoDownload: true,
    userPrompt: 'mandatory',
    dismissible: false,
    blockApp: true,
  },
}
```

### 2. 监控指标

```
应该监控的更新指标：

  □ 更新检查成功率
  □ 更新下载成功率
  □ 更新安装成功率
  □ 各版本的用户分布
  □ 更新失败的错误分类
  □ 平均更新耗时
  □ 差分更新的节省比例
```

### 3. 上线检查清单

```
□ latest.yml 可以正常访问
□ 安装包 SHA512 匹配
□ blockmap 文件已上传
□ 代码签名验证通过
□ 从旧版本升级到新版本测试通过
□ 错误处理和重试逻辑正常
□ 日志记录正常
□ 用户 UI 展示正确
```

---

## 本章小结

electron-updater 是 Electron 生态中最成熟的更新方案：

1. **完整的事件生命周期**让你精确控制每个阶段
2. **blockmap 差分更新**大幅减少下载量
3. **多种发布方式**（GitHub/S3/自建服务器）
4. **静默和强制更新**满足不同场景
5. **内置签名校验**保障安全性

下一章我们将探索更激进的方案：asar 热补丁，实现无需重新下载整个应用的快速更新。

---

> **上一篇**：[01 - 热更新概述](./01-update-overview.md)  
> **下一篇**：[03 - asar 热补丁](./03-asar-hot-patch.md)
