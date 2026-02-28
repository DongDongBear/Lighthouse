# 第四章：Web Bundle 更新

## 目录

- [前端资源独立更新思路](#前端资源独立更新思路)
- [检查-下载-替换流程](#检查-下载-替换流程)
- [版本号管理策略](#版本号管理策略)
- [增量更新：只下载变更文件](#增量更新只下载变更文件)
- [本地缓存与回滚机制](#本地缓存与回滚机制)
- [灰度发布实现](#灰度发布实现)
- [与 CDN 结合的方案](#与-cdn-结合的方案)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## 前端资源独立更新思路

### 核心思想

Web Bundle 更新的核心思想是：**将前端构建产物（HTML/CSS/JS/资源）从 Electron 壳中分离出来，独立管理和更新**。

```
传统方式：前端代码打包在 asar 内

  app.asar
  ├── main.js
  ├── preload.js
  └── renderer/          ← 前端代码和 Electron 壳混在一起
      ├── index.html
      ├── app.abc123.js  ← 每次前端更新都要更新整个 asar
      └── style.def456.css

Web Bundle 方式：前端代码独立存放

  app.asar
  ├── main.js            ← 壳（很少更新）
  ├── preload.js
  └── (不含前端代码)

  userData/bundles/
  └── v1.2.3/            ← 前端代码独立管理
      ├── index.html
      ├── app.abc123.js
      └── style.def456.css

  主进程动态加载：
  win.loadFile(bundlePath + '/index.html')
```

### 架构图

```
Web Bundle 更新架构：

  ┌─────────────────────────────────────────────────────┐
  │                    更新服务器                         │
  │                                                      │
  │  /bundles/                                           │
  │  ├── manifest.json       ← 版本清单                 │
  │  ├── v1.2.3.zip         ← 全量包                    │
  │  ├── v1.2.3-diff.json   ← 增量包（变更文件列表）    │
  │  └── v1.2.3/            ← 单独文件（增量下载）      │
  │      ├── app.abc123.js                               │
  │      └── style.def456.css                            │
  └──────────────────────┬──────────────────────────────┘
                         │
                    HTTPS 下载
                         │
                         ▼
  ┌─────────────────────────────────────────────────────┐
  │                  Electron 应用                       │
  │                                                      │
  │  主进程:                                             │
  │  ┌──────────────────────────────────────────────┐   │
  │  │ BundleManager                                │   │
  │  │  - 检查更新                                  │   │
  │  │  - 下载 bundle                               │   │
  │  │  - 校验完整性                                │   │
  │  │  - 切换版本                                  │   │
  │  │  - 管理本地缓存                              │   │
  │  └──────────────────────────────────────────────┘   │
  │           │                                          │
  │           │ loadFile(bundlePath)                     │
  │           ▼                                          │
  │  渲染进程:                                           │
  │  ┌──────────────────────────────────────────────┐   │
  │  │  从 userData/bundles/v1.2.3/ 加载前端代码    │   │
  │  └──────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────┘
```

---

## 检查-下载-替换流程

### 完整实现

```javascript
// bundle-manager.js — 主进程
const { app } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const AdmZip = require('adm-zip')  // npm install adm-zip

class BundleManager {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'https://bundles.yourapp.com'
    this.bundlesDir = path.join(app.getPath('userData'), 'bundles')
    this.manifestPath = path.join(this.bundlesDir, 'local-manifest.json')
    
    // 确保目录存在
    fs.mkdirSync(this.bundlesDir, { recursive: true })
    
    // 加载本地清单
    this.localManifest = this.loadLocalManifest()
  }

  // 获取当前 bundle 路径
  getCurrentBundlePath() {
    const currentVersion = this.localManifest.currentVersion
    if (currentVersion) {
      const bundlePath = path.join(this.bundlesDir, currentVersion)
      if (fs.existsSync(path.join(bundlePath, 'index.html'))) {
        return bundlePath
      }
    }
    // 回退到 asar 内的默认版本
    return path.join(app.getAppPath(), 'renderer')
  }

  // 检查更新
  async checkForUpdate() {
    try {
      const response = await fetch(`${this.serverUrl}/manifest.json`)
      const remoteManifest = await response.json()
      
      const currentVersion = this.localManifest.currentVersion || '0.0.0'
      const latestVersion = remoteManifest.latest
      
      if (this.isNewerVersion(latestVersion, currentVersion)) {
        return {
          hasUpdate: true,
          currentVersion,
          latestVersion,
          bundle: remoteManifest.bundles[latestVersion],
        }
      }
      
      return { hasUpdate: false, currentVersion }
    } catch (err) {
      console.error('检查 bundle 更新失败:', err)
      return { hasUpdate: false, error: err.message }
    }
  }

  // 下载 bundle
  async downloadBundle(bundleInfo) {
    const { version, url, sha256, size } = bundleInfo
    const tempPath = path.join(this.bundlesDir, `${version}.zip.tmp`)
    const zipPath = path.join(this.bundlesDir, `${version}.zip`)
    const targetDir = path.join(this.bundlesDir, version)

    // 1. 下载
    const response = await fetch(url)
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(tempPath, buffer)

    // 2. 校验
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    if (hash !== sha256) {
      fs.unlinkSync(tempPath)
      throw new Error('Bundle hash mismatch')
    }

    // 3. 重命名（原子操作）
    fs.renameSync(tempPath, zipPath)

    // 4. 解压
    const zip = new AdmZip(zipPath)
    zip.extractAllTo(targetDir, true)

    // 5. 清理 zip
    fs.unlinkSync(zipPath)

    // 6. 更新本地清单
    this.localManifest.versions = this.localManifest.versions || {}
    this.localManifest.versions[version] = {
      downloadedAt: new Date().toISOString(),
      sha256,
      size,
    }
    this.saveLocalManifest()

    return targetDir
  }

  // 切换到新版本
  activateVersion(version) {
    const bundlePath = path.join(this.bundlesDir, version, 'index.html')
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle ${version} not found`)
    }
    
    this.localManifest.previousVersion = this.localManifest.currentVersion
    this.localManifest.currentVersion = version
    this.saveLocalManifest()
    
    return path.join(this.bundlesDir, version)
  }

  // 回滚到上一个版本
  rollback() {
    const previousVersion = this.localManifest.previousVersion
    if (previousVersion) {
      return this.activateVersion(previousVersion)
    }
    // 回退到 asar 内的默认版本
    this.localManifest.currentVersion = null
    this.saveLocalManifest()
    return path.join(app.getAppPath(), 'renderer')
  }

  // 清理旧版本（保留最近 N 个）
  cleanup(keepCount = 3) {
    const versions = Object.keys(this.localManifest.versions || {})
      .sort()
      .reverse()
    
    const toDelete = versions.slice(keepCount)
    for (const version of toDelete) {
      const dir = path.join(this.bundlesDir, version)
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true })
      }
      delete this.localManifest.versions[version]
    }
    this.saveLocalManifest()
  }

  // 版本比较
  isNewerVersion(v1, v2) {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      if ((parts1[i] || 0) > (parts2[i] || 0)) return true
      if ((parts1[i] || 0) < (parts2[i] || 0)) return false
    }
    return false
  }

  // 本地清单管理
  loadLocalManifest() {
    try {
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'))
    } catch {
      return { currentVersion: null, versions: {} }
    }
  }

  saveLocalManifest() {
    fs.writeFileSync(this.manifestPath, JSON.stringify(this.localManifest, null, 2))
  }
}

module.exports = BundleManager
```

### 在主进程中使用

```javascript
// main.js
const BundleManager = require('./bundle-manager')

const bundleManager = new BundleManager({
  serverUrl: 'https://bundles.yourapp.com'
})

function createWindow() {
  const win = new BrowserWindow({ /* ... */ })
  
  // 加载当前 bundle
  const bundlePath = bundleManager.getCurrentBundlePath()
  win.loadFile(path.join(bundlePath, 'index.html'))
  
  return win
}

// 后台检查更新
async function checkAndUpdate(win) {
  const result = await bundleManager.checkForUpdate()
  
  if (result.hasUpdate) {
    console.log(`新 bundle 可用: ${result.latestVersion}`)
    
    // 后台下载
    const bundlePath = await bundleManager.downloadBundle(result.bundle)
    
    // 激活新版本
    bundleManager.activateVersion(result.latestVersion)
    
    // 刷新页面（无需重启应用）
    win.loadFile(path.join(bundlePath, 'index.html'))
    
    // 清理旧版本
    bundleManager.cleanup(3)
  }
}

app.whenReady().then(() => {
  const win = createWindow()
  
  // 启动后 5 秒检查更新
  setTimeout(() => checkAndUpdate(win), 5000)
  
  // 每 2 小时检查一次
  setInterval(() => checkAndUpdate(win), 2 * 60 * 60 * 1000)
})
```

---

## 版本号管理策略

### semver 策略

```
Bundle 版本号策略 (遵循 Semantic Versioning):

  App壳版本: 1.0.0 (Electron + 主进程，低频更新)
  Bundle版本: 1.0.0-bundle.15 (前端资源，高频更新)

  或者完全独立的版本号：
  App壳版本:   1.0.0
  Bundle版本:  2024.01.15.1  (日期+序号)

  版本号设计：

  方案 A: semver
    1.2.3 → 1.2.4 (bug fix)
    1.2.4 → 1.3.0 (new feature)
    简单，通用

  方案 B: 日期版本
    2024.01.15.1 → 2024.01.16.1
    直观，能看出发布时间

  方案 C: 构建号
    build.100 → build.101 → build.102
    简单递增，适合 CI/CD
```

### 版本兼容性

```javascript
// manifest.json — 服务器端
{
  "latest": "1.3.0",
  "bundles": {
    "1.3.0": {
      "url": "https://cdn.yourapp.com/bundles/v1.3.0.zip",
      "sha256": "abc123...",
      "size": 2097152,
      "minAppVersion": "1.0.0",   // 最低壳版本
      "maxAppVersion": "1.x.x",   // 最高壳版本
      "releaseNotes": "新增深色模式支持",
      "releaseDate": "2024-01-20T10:00:00Z"
    },
    "1.2.5": {
      "url": "https://cdn.yourapp.com/bundles/v1.2.5.zip",
      "sha256": "def456...",
      "size": 2000000,
      "minAppVersion": "1.0.0",
      "maxAppVersion": "1.x.x"
    }
  }
}
```

```javascript
// 客户端版本兼容检查
function isCompatible(bundleInfo, appVersion) {
  const { minAppVersion, maxAppVersion } = bundleInfo
  
  if (minAppVersion && compareVersions(appVersion, minAppVersion) < 0) {
    return false  // 壳版本太旧
  }
  
  if (maxAppVersion) {
    // 支持通配符: "1.x.x" 表示任何 1.x 版本
    const maxParts = maxAppVersion.split('.')
    const appParts = appVersion.split('.')
    for (let i = 0; i < 3; i++) {
      if (maxParts[i] === 'x') continue
      if (Number(appParts[i]) > Number(maxParts[i])) return false
    }
  }
  
  return true
}
```

---

## 增量更新：只下载变更文件

### 文件级增量

```javascript
// 增量更新：只下载变更的文件

// 服务器端生成 diff manifest
// diff-1.2.5-to-1.3.0.json
{
  "from": "1.2.5",
  "to": "1.3.0",
  "added": [
    { "path": "dark-theme.css", "sha256": "xxx", "size": 1024 }
  ],
  "modified": [
    { "path": "app.js", "sha256": "yyy", "size": 50000 }
  ],
  "deleted": [
    { "path": "old-component.js" }
  ],
  "totalSize": 51024  // 需要下载的总大小
}

// 客户端增量更新逻辑
async function incrementalUpdate(diffManifest) {
  const currentDir = bundleManager.getCurrentBundlePath()
  const newVersion = diffManifest.to
  const newDir = path.join(bundlesDir, newVersion)
  
  // 1. 复制当前版本作为基础
  fs.cpSync(currentDir, newDir, { recursive: true })
  
  // 2. 下载新增和修改的文件
  for (const file of [...diffManifest.added, ...diffManifest.modified]) {
    const url = `${serverUrl}/bundles/${newVersion}/${file.path}`
    const response = await fetch(url)
    const data = Buffer.from(await response.arrayBuffer())
    
    // 校验
    const hash = crypto.createHash('sha256').update(data).digest('hex')
    if (hash !== file.sha256) {
      throw new Error(`Hash mismatch for ${file.path}`)
    }
    
    // 写入文件
    const filePath = path.join(newDir, file.path)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, data)
  }
  
  // 3. 删除已移除的文件
  for (const file of diffManifest.deleted) {
    const filePath = path.join(newDir, file.path)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
  
  return newDir
}
```

### 决策逻辑

```javascript
// 选择全量还是增量更新
async function smartUpdate(currentVersion, latestVersion) {
  // 尝试获取增量包
  const diffUrl = `${serverUrl}/diffs/${currentVersion}-to-${latestVersion}.json`
  
  try {
    const response = await fetch(diffUrl)
    if (response.ok) {
      const diff = await response.json()
      
      // 如果增量包小于全量包的 50%，用增量
      const fullBundle = await getBundleInfo(latestVersion)
      if (diff.totalSize < fullBundle.size * 0.5) {
        console.log('使用增量更新')
        return incrementalUpdate(diff)
      }
    }
  } catch {
    // 增量包不可用，回退到全量
  }
  
  console.log('使用全量更新')
  return fullUpdate(latestVersion)
}
```

---

## 本地缓存与回滚机制

### 缓存管理

```
本地 bundle 目录结构：

  userData/bundles/
  ├── local-manifest.json    ← 版本元数据
  ├── v1.1.0/                ← 旧版本（保留用于回滚）
  │   ├── index.html
  │   ├── app.js
  │   └── style.css
  ├── v1.2.5/                ← 上一个版本
  │   └── ...
  └── v1.3.0/                ← 当前版本 ★
      └── ...

  本地清单 (local-manifest.json):
  {
    "currentVersion": "1.3.0",
    "previousVersion": "1.2.5",
    "versions": {
      "1.1.0": { "downloadedAt": "...", "size": 1500000 },
      "1.2.5": { "downloadedAt": "...", "size": 1800000 },
      "1.3.0": { "downloadedAt": "...", "size": 2000000 }
    }
  }
```

### 回滚机制

```javascript
// 多级回滚策略

class RollbackManager {
  constructor(bundleManager) {
    this.bm = bundleManager
  }

  // 回滚到上一个版本
  rollbackToPrevious() {
    const prev = this.bm.localManifest.previousVersion
    if (prev) {
      return this.bm.activateVersion(prev)
    }
    return this.rollbackToDefault()
  }

  // 回滚到 asar 内的默认版本
  rollbackToDefault() {
    this.bm.localManifest.currentVersion = null
    this.bm.saveLocalManifest()
    return path.join(app.getAppPath(), 'renderer')
  }

  // 自动回滚检测
  // 如果新版本启动后 10 秒内崩溃，自动回滚
  setupAutoRollback() {
    const startTime = Date.now()
    const currentVersion = this.bm.localManifest.currentVersion
    
    // 记录启动
    const launchLog = path.join(app.getPath('userData'), 'launch-log.json')
    const log = this.readLaunchLog(launchLog)
    
    if (log.lastVersion === currentVersion && log.crashes >= 2) {
      // 连续崩溃 2 次，自动回滚
      console.warn('检测到连续崩溃，回滚到上一个版本')
      return this.rollbackToPrevious()
    }
    
    // 记录本次启动
    log.lastVersion = currentVersion
    log.lastLaunch = startTime
    log.crashes = (log.lastVersion === currentVersion) ? (log.crashes || 0) + 1 : 0
    fs.writeFileSync(launchLog, JSON.stringify(log))
    
    // 10 秒后标记为成功启动
    setTimeout(() => {
      log.crashes = 0
      fs.writeFileSync(launchLog, JSON.stringify(log))
    }, 10000)
    
    return null  // 不需要回滚
  }

  readLaunchLog(logPath) {
    try {
      return JSON.parse(fs.readFileSync(logPath, 'utf-8'))
    } catch {
      return {}
    }
  }
}
```

---

## 灰度发布实现

```javascript
// 灰度发布：通过 manifest 控制

// 服务器端 manifest.json
{
  "latest": "1.3.0",
  "channels": {
    "stable": {
      "version": "1.2.5",
      "percentage": 100
    },
    "beta": {
      "version": "1.3.0",
      "percentage": 100
    },
    "canary": {
      "version": "1.3.1-rc.1",
      "percentage": 100
    }
  },
  "gradual": {
    "1.3.0": {
      "percentage": 20,           // 20% 的用户
      "whitelist": ["user-123"],  // 白名单用户
      "startDate": "2024-01-20",
      "endDate": "2024-01-25"     // 5 天内逐步推到 100%
    }
  }
}

// 客户端灰度判断
function shouldReceiveUpdate(userId, gradualConfig) {
  // 白名单优先
  if (gradualConfig.whitelist?.includes(userId)) {
    return true
  }
  
  // 百分比判断：用 userId 的 hash 确保同一用户总是得到相同结果
  const hash = crypto.createHash('md5').update(userId).digest('hex')
  const userBucket = parseInt(hash.substring(0, 8), 16) % 100
  
  return userBucket < gradualConfig.percentage
}
```

---

## 与 CDN 结合的方案

```
CDN 加速方案：

  构建流程：
  npm run build → 前端构建产物
       │
       ▼
  打包为 zip → 计算 hash → 生成 manifest
       │
       ▼
  上传到 CDN (CloudFront / Cloudflare R2 / 阿里云 OSS)

  CDN 目录结构：
  https://cdn.yourapp.com/
  ├── manifest.json                ← 版本元数据（短缓存 1min）
  ├── bundles/
  │   ├── v1.3.0.zip              ← 全量包（长缓存 1year）
  │   ├── v1.3.0/                 ← 单文件（增量用）
  │   │   ├── app.abc123.js       ← 文件名带 hash，永不过期
  │   │   └── style.def456.css
  │   └── diffs/
  │       └── 1.2.5-to-1.3.0.json ← 增量清单
  └── ...

  缓存策略：
  - manifest.json:   Cache-Control: max-age=60   (1 分钟)
  - zip 包:          Cache-Control: max-age=31536000, immutable
  - 单文件 (带hash): Cache-Control: max-age=31536000, immutable

  优势：
  - 全球加速，用户就近下载
  - 文件级缓存，节省带宽
  - CDN 自动处理高并发
```

---

## 深入理解

### Web Bundle vs asar 热补丁

```
┌──────────────────┬───────────────────┬───────────────────┐
│                  │ Web Bundle 更新   │ asar 热补丁       │
├──────────────────┼───────────────────┼───────────────────┤
│ 更新粒度         │ 单文件级别        │ 整个 asar          │
│ 下载量           │ 极小（增量）      │ 较大（整个 asar）  │
│ 需要重启         │ 不需要（刷新页面）│ 需要              │
│ 实现复杂度       │ 高                │ 中                 │
│ 支持增量         │ ✅ 天然支持       │ ❌ 全量替换        │
│ 灰度发布         │ 容易实现          │ 容易实现           │
│ 回滚             │ 切换目录          │ 恢复备份           │
│ 安全校验         │ 每个文件独立校验  │ 整个 asar 校验     │
│ 对架构要求       │ 前后端分离        │ 无特殊要求         │
└──────────────────┴───────────────────┴───────────────────┘
```

### 前端构建集成

```javascript
// 构建脚本：生成 bundle 包和 manifest
// scripts/build-bundle.js

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')
const AdmZip = require('adm-zip')

// 1. 构建前端
execSync('npm run build:renderer', { stdio: 'inherit' })

const distDir = path.join(__dirname, '../dist/renderer')
const version = require('../package.json').version

// 2. 计算文件 hash
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(content).digest('hex')
}

// 3. 生成文件清单
function generateFileManifest(dir, baseDir = dir) {
  const manifest = {}
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(baseDir, fullPath)
    
    if (entry.isDirectory()) {
      Object.assign(manifest, generateFileManifest(fullPath, baseDir))
    } else {
      manifest[relativePath] = {
        sha256: getFileHash(fullPath),
        size: fs.statSync(fullPath).size,
      }
    }
  }
  
  return manifest
}

// 4. 打包为 zip
const zip = new AdmZip()
zip.addLocalFolder(distDir)
const zipPath = path.join(__dirname, `../releases/v${version}.zip`)
zip.writeZip(zipPath)

// 5. 计算 zip 的 hash
const zipHash = getFileHash(zipPath)
const zipSize = fs.statSync(zipPath).size

// 6. 更新 manifest.json
const manifest = {
  latest: version,
  bundles: {
    [version]: {
      url: `https://cdn.yourapp.com/bundles/v${version}.zip`,
      sha256: zipHash,
      size: zipSize,
      files: generateFileManifest(distDir),
      releaseDate: new Date().toISOString(),
    }
  }
}

fs.writeFileSync(
  path.join(__dirname, '../releases/manifest.json'),
  JSON.stringify(manifest, null, 2)
)

console.log(`Bundle v${version} 构建完成`)
console.log(`  ZIP: ${(zipSize / 1024 / 1024).toFixed(2)} MB`)
console.log(`  SHA256: ${zipHash}`)
```

---

## 常见问题

### Q1: loadFile 路径变化后，相对路径资源加载失败

```javascript
// 问题：前端代码中的相对路径可能失效
// 解决：使用 <base> 标签或绝对路径

// 方案 1：在 index.html 中设置 base
// <base href="./">

// 方案 2：使用自定义协议
protocol.handle('bundle', (request) => {
  const url = new URL(request.url)
  const filePath = path.join(currentBundlePath, url.pathname)
  return new Response(fs.readFileSync(filePath))
})
win.loadURL('bundle://./index.html')
```

### Q2: 如何处理前端路由（SPA）？

对于使用 React Router / Vue Router 的 SPA，确保配置了 hash 模式或在 Electron 中正确处理：

```javascript
// 使用 hash 路由模式（推荐，最简单）
// React: <HashRouter>
// Vue: createRouter({ history: createWebHashHistory() })
```

### Q3: 下载大文件时应用卡顿

使用流式下载，不要一次性加载到内存：

```javascript
const { pipeline } = require('node:stream/promises')

async function downloadStream(url, destPath) {
  const response = await fetch(url)
  const fileStream = fs.createWriteStream(destPath)
  await pipeline(response.body, fileStream)
}
```

### Q4: 如何回退到 asar 中的默认版本？

将 `currentVersion` 设为 `null`，BundleManager 会自动回退到 `app.getAppPath()` 下的默认渲染层。

---

## 实践建议

### 1. 前后端分离架构

```
为 Web Bundle 更新优化的项目结构：

  src/
  ├── main/                  ← 壳层（稳定）
  │   ├── main.js
  │   ├── preload.js
  │   └── bundle-manager.js
  │
  └── renderer/              ← 前端（独立构建、独立更新）
      ├── index.html
      ├── src/
      │   ├── App.vue / App.tsx
      │   └── ...
      ├── package.json       ← 独立的 package.json
      └── vite.config.js     ← 独立的构建配置
```

### 2. 发布流水线

```
CI/CD 发布流程：

  git push (前端代码变更)
       │
       ▼
  CI: npm run build:renderer
       │
       ▼
  CI: node scripts/build-bundle.js
       │
       ├── 生成 zip 包
       ├── 计算 hash
       └── 更新 manifest.json
       │
       ▼
  CI: 上传到 CDN
       │
       ▼
  客户端自动检测到新版本 → 下载 → 刷新
```

### 3. 核心原则

1. **前后端接口稳定** — IPC API 变更时需要同步更新壳
2. **每次构建生成文件 hash** — 用于增量更新和缓存
3. **manifest 单独管理** — 短缓存，快速生效
4. **始终保留回退路径** — asar 内的默认版本永远可用
5. **监控更新成功率** — 及时发现问题

---

## 本章小结

Web Bundle 更新是最细粒度的热更新方案：

1. **前端资源独立管理**，与 Electron 壳分离
2. **增量更新**只下载变更文件，极小的下载量
3. **免重启**，刷新页面即可生效
4. **多版本缓存 + 回滚**保障稳定性
5. **灰度发布**可精确控制推送范围
6. **CDN 加速**提供全球分发能力

下一章将汇总所有更新方案的最佳实践。

---

> **上一篇**：[03 - asar 热补丁](./03-asar-hot-patch.md)  
> **下一篇**：[05 - 更新最佳实践](./05-update-best-practices.md)
