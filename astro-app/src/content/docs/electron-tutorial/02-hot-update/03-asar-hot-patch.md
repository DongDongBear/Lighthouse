# 第三章：asar 热补丁

## 目录

- [asar 文件结构深入解析](#asar-文件结构深入解析)
- [运行时 asar 替换原理](#运行时-asar-替换原理)
- [动态加载渲染层代码](#动态加载渲染层代码)
- [版本管理与校验](#版本管理与校验)
- [无需重启的局部更新方案](#无需重启的局部更新方案)
- [与主进程更新的区别](#与主进程更新的区别)
- [安全风险与防护](#安全风险与防护)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## asar 文件结构深入解析

### asar 格式剖析

asar 是 Electron 特有的归档格式，在第一章打包中我们简要介绍过。现在深入看它的内部结构：

```
asar 文件二进制布局：

  偏移量    内容
  ────────  ────────────────────────────────
  0x00      Header Size (4 bytes, uint32 LE)
            表示 header JSON 的大小
  
  0x04      Header Padding
            对齐到 4 字节边界
  
  0x08+     Header JSON (变长)
            描述文件树结构和每个文件的位置
  
  Header后  File Data
            所有文件内容连续存储
            没有压缩，原样存放


  Header JSON 示例：
  {
    "files": {
      "package.json": {
        "size": 512,
        "offset": "0",          // 相对于 data 区域的偏移
        "integrity": {
          "algorithm": "SHA256",
          "hash": "abc123...",
          "blockSize": 4194304,
          "blocks": ["abc123..."]
        }
      },
      "src": {
        "files": {
          "main": {
            "files": {
              "main.js": {
                "size": 2048,
                "offset": "512"
              }
            }
          }
        }
      },
      "node_modules": {
        "files": {
          "electron-store": {
            "files": { ... }
          }
        }
      }
    }
  }
```

### asar 读取机制

```
Electron 如何读取 asar 中的文件：

  require('./module.js')
       │
       ▼
  Node.js 模块系统
       │
       ▼
  Electron 拦截文件系统调用
       │
       ├── 检测路径是否在 .asar 内
       │     │
       │     ├── 是 → 从 asar header 查找文件信息
       │     │         获取 offset + size
       │     │         直接 seek 读取（不解压整个归档）
       │     │
       │     └── 否 → 正常文件系统读取
       │
       ▼
  返回文件内容

  关键点：
  - Electron 在底层 hook 了 fs 模块
  - 对上层代码来说，asar 内的文件和普通文件没有区别
  - require(), fs.readFileSync() 等都能透明地读取 asar 内容
  - 但 fs.writeFileSync() 不能写入 asar（只读归档）
```

### asar 的限制

```
asar 的已知限制：

  1. 只读
     - 不能修改 asar 内的文件
     - 需要替换整个 asar 文件

  2. 原生模块不能放在 asar 内
     - .node 文件必须在文件系统上
     - 这就是 asarUnpack 的原因

  3. 不是所有 Node.js API 都支持
     - child_process.exec 不能执行 asar 内的文件
     - 某些第三方库可能不兼容

  4. 不提供加密
     - 任何人都可以 asar extract 查看内容
```

---

## 运行时 asar 替换原理

### 核心思路

```
asar 热补丁的核心思路：

  初始状态:
  Resources/
  ├── app.asar              ← 原始版本 (v1.0)
  └── app.asar.unpacked/    ← 原生模块

  更新过程:
  1. 下载新版本 asar
  2. 保存到临时位置
  3. 校验完整性
  4. 替换 app.asar
  5. 重启应用（或刷新渲染进程）

  更新后:
  Resources/
  ├── app.asar              ← 新版本 (v1.1)  ← 已替换
  ├── app.asar.backup       ← 备份旧版本 (用于回滚)
  └── app.asar.unpacked/    ← 原生模块 (未变)
```

### 实现代码

```javascript
// hot-patcher.js — 主进程
const { app } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const https = require('node:https')

class AsarHotPatcher {
  constructor(options = {}) {
    this.updateUrl = options.updateUrl || 'https://updates.yourapp.com'
    this.currentVersion = app.getVersion()
    
    // asar 文件路径
    // 注意：打包后 app.getAppPath() 返回 asar 内部路径
    // 我们需要 asar 文件本身的路径
    this.asarPath = path.join(
      process.resourcesPath, 'app.asar'
    )
    this.backupPath = this.asarPath + '.backup'
    this.tempPath = this.asarPath + '.update'
    
    // 版本信息存储
    this.patchInfoPath = path.join(
      app.getPath('userData'), 'patch-info.json'
    )
  }

  // 检查是否有新的 asar 补丁
  async checkForPatch() {
    try {
      const response = await fetch(
        `${this.updateUrl}/api/patch/check?` +
        `version=${this.currentVersion}&` +
        `platform=${process.platform}&` +
        `arch=${process.arch}`
      )
      
      if (!response.ok) return null
      
      const info = await response.json()
      // info: { version, url, sha256, size }
      
      if (info.version === this.currentVersion) return null
      
      return info
    } catch (err) {
      console.error('检查补丁失败:', err)
      return null
    }
  }

  // 下载新的 asar
  async downloadPatch(patchInfo) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(this.tempPath)
      
      https.get(patchInfo.url, (response) => {
        response.pipe(file)
        
        file.on('finish', () => {
          file.close()
          resolve(this.tempPath)
        })
      }).on('error', (err) => {
        fs.unlinkSync(this.tempPath)
        reject(err)
      })
    })
  }

  // 校验下载的文件
  verifyPatch(filePath, expectedHash) {
    const fileBuffer = fs.readFileSync(filePath)
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    return hash === expectedHash
  }

  // 应用补丁
  applyPatch(patchInfo) {
    try {
      // 1. 备份当前 asar
      if (fs.existsSync(this.asarPath)) {
        fs.copyFileSync(this.asarPath, this.backupPath)
      }
      
      // 2. 原子替换：重命名临时文件为正式文件
      fs.renameSync(this.tempPath, this.asarPath)
      
      // 3. 记录补丁信息
      fs.writeFileSync(this.patchInfoPath, JSON.stringify({
        version: patchInfo.version,
        appliedAt: new Date().toISOString(),
        previousVersion: this.currentVersion,
      }))
      
      return true
    } catch (err) {
      console.error('应用补丁失败:', err)
      this.rollback()
      return false
    }
  }

  // 回滚到上一个版本
  rollback() {
    try {
      if (fs.existsSync(this.backupPath)) {
        fs.copyFileSync(this.backupPath, this.asarPath)
        console.log('已回滚到上一个版本')
        return true
      }
    } catch (err) {
      console.error('回滚失败:', err)
    }
    return false
  }

  // 完整的更新流程
  async update() {
    // 1. 检查
    const patchInfo = await this.checkForPatch()
    if (!patchInfo) {
      console.log('没有可用的补丁')
      return false
    }
    
    console.log(`发现补丁: v${patchInfo.version}`)
    
    // 2. 下载
    await this.downloadPatch(patchInfo)
    
    // 3. 校验
    if (!this.verifyPatch(this.tempPath, patchInfo.sha256)) {
      console.error('补丁校验失败')
      fs.unlinkSync(this.tempPath)
      return false
    }
    
    // 4. 应用（需要重启才能生效）
    const success = this.applyPatch(patchInfo)
    
    if (success) {
      console.log('补丁已应用，将在重启后生效')
    }
    
    return success
  }
}

module.exports = AsarHotPatcher
```

---

## 动态加载渲染层代码

### 不替换 asar 的方案

如果只想更新渲染层（前端代码），可以不替换整个 asar，而是让渲染进程从外部目录加载代码：

```javascript
// main.js — 动态选择加载路径
const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

function getRendererPath() {
  // 检查是否有热更新的渲染层代码
  const hotUpdateDir = path.join(
    app.getPath('userData'), 'hot-update', 'renderer'
  )
  const hotUpdateIndex = path.join(hotUpdateDir, 'index.html')
  
  if (fs.existsSync(hotUpdateIndex)) {
    // 使用热更新版本
    console.log('使用热更新渲染层')
    return hotUpdateIndex
  }
  
  // 使用默认版本（asar 内部）
  return path.join(__dirname, '..', 'renderer', 'index.html')
}

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  })
  
  const rendererPath = getRendererPath()
  win.loadFile(rendererPath)
}
```

```
目录结构：

  Resources/
  └── app.asar
      ├── src/main/main.js          ← 主进程（稳定，不常更新）
      ├── src/main/preload.js
      └── src/renderer/             ← 默认渲染层
          ├── index.html
          ├── app.js
          └── styles.css

  ~/Library/Application Support/MyApp/
  └── hot-update/
      └── renderer/                  ← 热更新的渲染层
          ├── index.html
          ├── app.js                 ← 新版本前端代码
          └── styles.css

  优先级: hot-update 目录 > asar 内的默认版本
```

---

## 版本管理与校验

### 版本信息结构

```javascript
// patch-manifest.json — 补丁清单
{
  "latestVersion": "1.2.3",
  "minAppVersion": "1.0.0",   // 最低支持的 Electron 壳版本
  "patches": [
    {
      "version": "1.2.3",
      "releaseDate": "2024-01-20",
      "files": {
        "app.asar": {
          "url": "https://cdn.yourapp.com/patches/v1.2.3/app.asar",
          "sha256": "abc123def456...",
          "size": 5242880
        }
      },
      "releaseNotes": "修复了xxx问题",
      "mandatory": false
    }
  ]
}
```

### 签名校验

```javascript
const crypto = require('node:crypto')
const fs = require('node:fs')

class PatchVerifier {
  constructor(publicKey) {
    // 使用 Ed25519 公钥验证
    this.publicKey = publicKey
  }

  // 验证文件哈希
  verifyHash(filePath, expectedHash) {
    const data = fs.readFileSync(filePath)
    const hash = crypto.createHash('sha256').update(data).digest('hex')
    return hash === expectedHash
  }

  // 验证数字签名
  verifySignature(data, signature) {
    const verify = crypto.createVerify('SHA256')
    verify.update(data)
    return verify.verify(this.publicKey, signature, 'base64')
  }

  // 完整的验证流程
  async verifyPatch(filePath, manifest) {
    // 1. 验证文件大小
    const stats = fs.statSync(filePath)
    if (stats.size !== manifest.size) {
      throw new Error('文件大小不匹配')
    }

    // 2. 验证 SHA256 哈希
    if (!this.verifyHash(filePath, manifest.sha256)) {
      throw new Error('文件哈希不匹配')
    }

    // 3. 验证签名（如果有）
    if (manifest.signature) {
      const data = fs.readFileSync(filePath)
      if (!this.verifySignature(data, manifest.signature)) {
        throw new Error('数字签名验证失败')
      }
    }

    return true
  }
}
```

---

## 无需重启的局部更新方案

### 方案：替换渲染层文件 + 刷新页面

```javascript
// 主进程
class LiveUpdater {
  constructor(win) {
    this.win = win
    this.hotUpdateDir = path.join(app.getPath('userData'), 'hot-update')
  }

  // 下载并应用渲染层更新
  async applyRendererUpdate(patchInfo) {
    const tempDir = path.join(this.hotUpdateDir, 'temp')
    const targetDir = path.join(this.hotUpdateDir, 'renderer')
    
    // 1. 下载更新包 (zip)
    await this.downloadAndExtract(patchInfo.url, tempDir)
    
    // 2. 校验
    if (!this.verifyFiles(tempDir, patchInfo.checksums)) {
      throw new Error('文件校验失败')
    }
    
    // 3. 替换文件
    if (fs.existsSync(targetDir)) {
      // 备份
      const backupDir = targetDir + '.backup'
      fs.renameSync(targetDir, backupDir)
    }
    fs.renameSync(tempDir, targetDir)
    
    // 4. 刷新渲染进程（不重启应用）
    this.win.loadFile(path.join(targetDir, 'index.html'))
    
    // 或者更温和的方式：通知渲染进程自己刷新
    this.win.webContents.send('hot-update-ready')
  }
}

// 渲染进程
window.electronAPI.onHotUpdate(() => {
  // 保存当前状态
  const state = saveCurrentState()
  
  // 刷新页面
  location.reload()
  
  // 页面加载后恢复状态
  // (通过 localStorage 或 sessionStorage 传递)
})
```

### 限制

```
无需重启方案的限制：

  ✅ 可以更新的:
  - HTML 页面结构
  - CSS 样式
  - 渲染进程的 JavaScript
  - 图片/字体等资源

  ❌ 不能更新的:
  - main.js (主进程代码) — 已经加载到内存中
  - preload.js — 在窗口创建时就执行了
  - 原生模块 (.node 文件)
  - package.json 的 main 字段变更

  原因: Node.js 的模块缓存机制
  require() 加载的模块会被缓存在 require.cache 中
  即使文件被替换，已加载的模块仍然是旧版本
  只有重启进程才能加载新代码
```

---

## 与主进程更新的区别

```
渲染层热更新 vs 主进程更新：

  ┌────────────────┬──────────────────┬──────────────────────┐
  │                │ 渲染层热更新     │ 主进程更新           │
  ├────────────────┼──────────────────┼──────────────────────┤
  │ 更新内容       │ HTML/CSS/JS 资源 │ main.js/preload.js   │
  │ 更新方式       │ 替换文件+刷新    │ 替换 asar + 重启     │
  │ 需要重启       │ 不需要（刷新）   │ 需要                 │
  │ 用户感知       │ 低（页面闪烁）   │ 高（应用重启）       │
  │ 风险           │ 低               │ 中（重启失败）       │
  │ 回滚           │ 容易             │ 需要备份机制         │
  │ 适合频率       │ 高频（每天）     │ 低频（每周/月）      │
  └────────────────┴──────────────────┴──────────────────────┘

  推荐的组合策略：

  ┌─────────────────────────────────────────────────────────┐
  │                                                          │
  │  前端 bug 修复、UI 调整    → 渲染层热更新（高频、无感） │
  │  新功能（含 IPC 变更）     → asar 替换 + 重启           │
  │  Electron 版本升级         → electron-updater 全量更新  │
  │  安全修复                  → 强制全量更新               │
  │                                                          │
  └─────────────────────────────────────────────────────────┘
```

---

## 安全风险与防护

### 风险分析

```
asar 热补丁的安全风险：

  风险 1: 中间人攻击
  ┌──────────────────────────────────────────┐
  │  如果下载使用 HTTP 而非 HTTPS            │
  │  攻击者可以替换 asar 文件               │
  │  注入恶意代码到你的应用中               │
  │                                          │
  │  防护: 始终使用 HTTPS                    │
  └──────────────────────────────────────────┘

  风险 2: 文件篡改
  ┌──────────────────────────────────────────┐
  │  下载完成后、应用前被篡改               │
  │                                          │
  │  防护: SHA256 校验 + 数字签名            │
  └──────────────────────────────────────────┘

  风险 3: 服务器被入侵
  ┌──────────────────────────────────────────┐
  │  攻击者控制了更新服务器                  │
  │  推送恶意的 asar 文件                    │
  │                                          │
  │  防护: 代码签名（私钥不在服务器上）      │
  └──────────────────────────────────────────┘

  风险 4: 降级攻击
  ┌──────────────────────────────────────────┐
  │  攻击者推送旧版本（含已知漏洞）          │
  │                                          │
  │  防护: 版本号只增不减 + 最低版本检查     │
  └──────────────────────────────────────────┘
```

### 安全最佳实践

```javascript
// 安全的热补丁流程

async function securePatchUpdate(patchInfo) {
  // 1. 验证 HTTPS
  if (!patchInfo.url.startsWith('https://')) {
    throw new Error('Only HTTPS is allowed')
  }

  // 2. 验证版本号（不允许降级）
  if (compareVersions(patchInfo.version, currentVersion) <= 0) {
    throw new Error('Downgrade not allowed')
  }

  // 3. 下载到临时目录
  const tempFile = await download(patchInfo.url)

  // 4. 验证文件大小
  const stats = fs.statSync(tempFile)
  if (stats.size !== patchInfo.size) {
    fs.unlinkSync(tempFile)
    throw new Error('Size mismatch')
  }

  // 5. 验证 SHA256
  const hash = calculateSHA256(tempFile)
  if (hash !== patchInfo.sha256) {
    fs.unlinkSync(tempFile)
    throw new Error('Hash mismatch')
  }

  // 6. 验证数字签名
  if (!verifySignature(tempFile, patchInfo.signature, PUBLIC_KEY)) {
    fs.unlinkSync(tempFile)
    throw new Error('Invalid signature')
  }

  // 7. 备份当前版本
  backup()

  // 8. 原子替换
  fs.renameSync(tempFile, asarPath)

  // 9. 验证新版本能正常启动
  // (通过 sentinel 文件实现)
  writeSentinel(patchInfo.version)

  return true
}
```

### Sentinel（哨兵）机制

```javascript
// 防止更新后应用无法启动的保护机制

const sentinelPath = path.join(app.getPath('userData'), '.update-sentinel')

// 应用启动时检查
function checkSentinel() {
  if (fs.existsSync(sentinelPath)) {
    const sentinel = JSON.parse(fs.readFileSync(sentinelPath, 'utf-8'))
    
    if (sentinel.status === 'pending') {
      // 上次更新后的首次启动
      // 如果能到达这里，说明启动成功
      sentinel.status = 'success'
      fs.writeFileSync(sentinelPath, JSON.stringify(sentinel))
      // 清理备份
      cleanBackup()
    } else if (sentinel.status === 'failed') {
      // 上次启动失败（通过崩溃处理器设置）
      rollback()
    }
  }
}

// 更新后写入哨兵
function writeSentinel(version) {
  fs.writeFileSync(sentinelPath, JSON.stringify({
    version,
    status: 'pending',
    timestamp: Date.now()
  }))
}

// 崩溃处理器
process.on('uncaughtException', (err) => {
  const sentinel = readSentinel()
  if (sentinel && sentinel.status === 'pending') {
    sentinel.status = 'failed'
    fs.writeFileSync(sentinelPath, JSON.stringify(sentinel))
    rollback()
    app.relaunch()
  }
  app.exit(1)
})
```

---

## 深入理解

### asar 替换的时机问题

```
替换 asar 的最佳时机：

  时机 1: 应用运行中
  ├── ⚠️ 风险：正在读取 asar 中的文件时替换
  ├── Windows 特别问题：文件被锁定，无法替换
  ├── 解决：下载到临时路径，标记为"待应用"
  └── 下次启动时执行替换

  时机 2: 应用启动前（推荐）
  ├── 在 main.js 的最开始检查是否有待应用的补丁
  ├── 如果有，先执行替换，再继续正常启动流程
  └── 用户感知：启动稍慢（1-2秒）

  时机 3: 应用退出后
  ├── 使用辅助进程在主应用退出后执行替换
  └── 更复杂但更安全
```

### 版本管理策略

```
asar 补丁的版本管理：

  app 版本 (package.json):  1.0.0  (Electron 壳版本)
  asar 补丁版本:            1.0.0-patch.3

  版本兼容性矩阵：
  ┌─────────────┬────────────────┬──────────────┐
  │ App 版本    │ 兼容的补丁     │ 说明         │
  ├─────────────┼────────────────┼──────────────┤
  │ 1.0.x       │ patch.1-10     │ 主要 bug 修复│
  │ 1.1.x       │ patch.1-8      │ 新功能+修复  │
  │ 2.0.x       │ patch.1-5      │ 大版本，不兼 │
  └─────────────┴────────────────┴──────────────┘

  关键规则：
  - 补丁版本必须兼容对应的 app 壳版本
  - 如果主进程 API 有变更，需要新的壳版本
  - 补丁只包含渲染层和配置文件的变更
```

---

## 常见问题

### Q1: Windows 上替换 asar 失败

Windows 会锁定正在使用的文件。解决方案：
1. 下载到临时路径
2. 在下次启动时（应用还未读取 asar 前）执行替换
3. 或使用 `electron-updater` 的 NSIS 安装方式

### Q2: asar 替换后旧代码仍在运行

Node.js 的模块缓存问题。`require.cache` 中缓存了已加载的模块。对于主进程代码，必须重启应用。对于渲染进程，`location.reload()` 即可。

### Q3: 如何确保补丁和壳版本兼容？

在补丁 manifest 中声明 `minAppVersion` 和 `maxAppVersion`。客户端检查当前壳版本是否在范围内，不兼容则跳过补丁。

### Q4: 热补丁和 electron-updater 冲突吗？

不冲突。推荐组合使用：
- electron-updater 负责壳版本更新（含 Electron 升级）
- asar 热补丁负责快速修复和前端更新

### Q5: asar 补丁会增加安装包大小吗？

不会。补丁是运行时下载的，不影响初始安装包。但会占用用户的磁盘空间（备份 + 新版本）。建议定期清理旧备份。

---

## 实践建议

### 1. 架构分层

```
推荐的项目架构（为热补丁优化）：

  app.asar
  ├── src/main/              ← 壳层（稳定，低频更新）
  │   ├── main.js            # 应用入口
  │   ├── preload.js         # preload 脚本
  │   ├── hot-patcher.js     # 热补丁逻辑
  │   └── ipc-handlers.js    # IPC 处理
  │
  └── src/renderer/          ← 渲染层（活跃，高频更新）
      ├── index.html
      ├── app.js             # 可热替换
      └── styles.css         # 可热替换

  设计原则：
  - 主进程尽量薄，IPC 接口稳定
  - 业务逻辑尽量放在渲染层
  - preload 只暴露稳定的 API
```

### 2. 补丁服务器

```
补丁服务器需要提供的 API：

  GET /api/patch/check?version=1.0.0&platform=darwin&arch=arm64
  → 返回可用的补丁信息

  GET /api/patch/download/{version}/app.asar
  → 下载 asar 文件

  GET /api/patch/manifest
  → 返回所有版本的补丁清单
```

### 3. 监控

```
需要监控的指标：
  □ 补丁下载成功率
  □ 补丁校验通过率
  □ 补丁应用成功率
  □ 补丁回滚率
  □ 各版本的用户分布
```

---

## 本章小结

asar 热补丁提供了比 electron-updater 更轻量的更新方式：

1. **asar 是可替换的归档文件**，替换后重启即可生效
2. **渲染层代码**可以通过外部目录加载，实现免重启更新
3. **安全校验**（哈希 + 签名）是必需的
4. **版本管理**和**回滚机制**保障稳定性
5. 与 electron-updater 组合使用，覆盖不同场景

下一章我们将探索更细粒度的方案：Web Bundle 更新。

---

> **上一篇**：[02 - electron-updater 详解](./02-electron-updater.md)  
> **下一篇**：[04 - Web Bundle 更新](./04-web-bundle-update.md)
