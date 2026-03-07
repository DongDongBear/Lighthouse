# 第七章：数据存储

## 目录

- [Electron 数据存储全景](#electron-数据存储全景)
- [electron-store 配置管理](#electron-store-配置管理)
- [SQLite 数据库集成](#sqlite-数据库集成)
- [IndexedDB 和 localStorage](#indexeddb-和-localstorage)
- [文件系统操作](#文件系统操作)
- [安全存储（Keychain/Credential）](#安全存储keychaincredential)
- [数据迁移策略](#数据迁移策略)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## Electron 数据存储全景

```
Electron 数据存储方案选择：

┌──────────────────────────────────────────────────────────────┐
│                    数据类型 → 推荐方案                        │
│                                                               │
│  用户配置/设置        → electron-store (JSON)                │
│  结构化业务数据       → SQLite (better-sqlite3)              │
│  临时缓存/会话状态    → localStorage / sessionStorage        │
│  离线数据库           → IndexedDB                            │
│  用户文档/文件        → fs (文件系统)                        │
│  密码/Token/密钥      → Keychain / safeStorage               │
│  大型二进制文件       → fs + app.getPath('userData')         │
└──────────────────────────────────────────────────────────────┘

存储位置：
┌─────────────────────────────────────────────────────────────┐
│  app.getPath('userData')                                     │
│                                                              │
│  macOS:   ~/Library/Application Support/<app-name>/          │
│  Windows: %APPDATA%/<app-name>/                              │
│  Linux:   ~/.config/<app-name>/                              │
│                                                              │
│  这是 Electron 应用数据的标准存放位置                        │
│  卸载应用时通常不会删除，保留用户数据                        │
└─────────────────────────────────────────────────────────────┘
```

---

## electron-store 配置管理

`electron-store` 是 Electron 生态中最流行的配置存储方案，使用 JSON 文件持久化。

### 安装和基本使用

```bash
npm install electron-store
```

```javascript
// main.js
const Store = require('electron-store')

// 创建 store 实例
const store = new Store()

// 基本读写
store.set('theme', 'dark')
store.get('theme')             // 'dark'
store.get('theme', 'light')    // 如果不存在，返回默认值 'light'

// 嵌套路径
store.set('window.width', 1200)
store.set('window.height', 800)
store.get('window.width')      // 1200
store.get('window')            // { width: 1200, height: 800 }

// 检查和删除
store.has('theme')             // true
store.delete('theme')
store.clear()                  // 清除所有
```

### Schema 校验

```javascript
const Store = require('electron-store')

const store = new Store({
  // JSON Schema 校验
  schema: {
    theme: {
      type: 'string',
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    fontSize: {
      type: 'number',
      minimum: 10,
      maximum: 30,
      default: 14,
    },
    window: {
      type: 'object',
      properties: {
        width: { type: 'number', default: 1200 },
        height: { type: 'number', default: 800 },
        x: { type: 'number' },
        y: { type: 'number' },
      },
      default: {},
    },
    recentFiles: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 20,
      default: [],
    },
    autoUpdate: {
      type: 'boolean',
      default: true,
    }
  },
})

// 现在 set 时会自动校验
store.set('theme', 'dark')        // ✅ OK
// store.set('theme', 'purple')   // ❌ 抛出 Schema 校验错误
// store.set('fontSize', 50)      // ❌ 超出 maximum
```

### 加密存储

```javascript
const Store = require('electron-store')

const store = new Store({
  encryptionKey: 'your-encryption-key',
  // 注意：这只是简单的对称加密（AES-256-CBC）
  // 密钥硬编码在代码中，不适合存储高敏感数据
  // 高敏感数据应使用系统 Keychain
})

// 使用方式不变，但文件内容会被加密
store.set('apiKey', 'sk-1234567890')
```

### 监听变化

```javascript
// 监听特定键的变化
store.onDidChange('theme', (newValue, oldValue) => {
  console.log(`主题从 ${oldValue} 变为 ${newValue}`)
  // 通知所有窗口更新主题
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('theme-changed', newValue)
  })
})

// 监听任何变化
store.onDidAnyChange((newStore, oldStore) => {
  console.log('配置已更新')
})
```

### 通过 IPC 在渲染进程中使用

```javascript
// main.js — 注册 IPC 处理器
const Store = require('electron-store')
const store = new Store({ /* schema... */ })

ipcMain.handle('store:get', (_, key, defaultValue) => {
  return store.get(key, defaultValue)
})

ipcMain.handle('store:set', (_, key, value) => {
  store.set(key, value)
})

ipcMain.handle('store:getAll', () => {
  return store.store  // 返回整个配置对象
})

// preload.js
contextBridge.exposeInMainWorld('settings', {
  get: (key, defaultValue) => ipcRenderer.invoke('store:get', key, defaultValue),
  set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  getAll: () => ipcRenderer.invoke('store:getAll'),
})

// renderer.js
const theme = await window.settings.get('theme', 'system')
await window.settings.set('fontSize', 16)
```

---

## SQLite 数据库集成

### 为什么选 SQLite

```
SQLite 的优势：

  ✅ 无服务器：直接读写本地文件
  ✅ 零配置：不需要安装数据库服务
  ✅ 单文件：整个数据库就是一个 .db 文件
  ✅ 高性能：对于中等数据量，比 JSON 快得多
  ✅ 事务支持：ACID 兼容
  ✅ SQL 查询：复杂查询能力
  ✅ 被 VS Code、Slack、Discord 等大型 Electron 应用验证

  适用场景：
  - 需要复杂查询的结构化数据
  - 数据量 > 10MB
  - 需要索引加速查询
  - 需要事务保障
```

### better-sqlite3 集成

```bash
# better-sqlite3 是同步 API 的 SQLite 绑定
# 性能比异步方案更好（避免了 IPC 开销）
npm install better-sqlite3
```

```javascript
// database.js
const Database = require('better-sqlite3')
const path = require('node:path')
const { app } = require('electron')

class AppDatabase {
  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'app-data.db')
    
    this.db = new Database(dbPath, {
      // verbose: console.log,  // 开发时开启 SQL 日志
    })

    // 性能优化：开启 WAL 模式
    this.db.pragma('journal_mode = WAL')
    
    // 启用外键约束
    this.db.pragma('foreign_keys = ON')

    // 初始化表结构
    this.migrate()
  }

  migrate() {
    // 创建版本表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // 迁移列表
    const migrations = [
      {
        name: '001_create_notes',
        sql: `
          CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            is_deleted INTEGER DEFAULT 0
          );
          CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
        `
      },
      {
        name: '002_create_tags',
        sql: `
          CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
          );
          CREATE TABLE IF NOT EXISTS note_tags (
            note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
            tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (note_id, tag_id)
          );
        `
      }
    ]

    // 执行未应用的迁移
    const applied = this.db.prepare(
      'SELECT name FROM _migrations'
    ).all().map(r => r.name)

    for (const migration of migrations) {
      if (!applied.includes(migration.name)) {
        this.db.transaction(() => {
          this.db.exec(migration.sql)
          this.db.prepare(
            'INSERT INTO _migrations (name) VALUES (?)'
          ).run(migration.name)
        })()
        console.log(`Applied migration: ${migration.name}`)
      }
    }
  }

  // CRUD 操作
  createNote(title, content = '') {
    return this.db.prepare(`
      INSERT INTO notes (title, content) VALUES (?, ?)
    `).run(title, content)
  }

  getNotes(limit = 50, offset = 0) {
    return this.db.prepare(`
      SELECT * FROM notes 
      WHERE is_deleted = 0 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset)
  }

  searchNotes(query) {
    return this.db.prepare(`
      SELECT * FROM notes 
      WHERE is_deleted = 0 
        AND (title LIKE ? OR content LIKE ?)
      ORDER BY updated_at DESC
    `).all(`%${query}%`, `%${query}%`)
  }

  updateNote(id, title, content) {
    return this.db.prepare(`
      UPDATE notes 
      SET title = ?, content = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, content, id)
  }

  // 软删除
  deleteNote(id) {
    return this.db.prepare(`
      UPDATE notes SET is_deleted = 1 WHERE id = ?
    `).run(id)
  }

  // 关闭数据库连接
  close() {
    this.db.close()
  }
}

module.exports = AppDatabase
```

### 打包注意事项

`better-sqlite3` 是原生模块（C++ 编译），打包时需要特别处理：

```json
// package.json — electron-builder 配置
{
  "build": {
    "files": [
      "**/*",
      "!node_modules/better-sqlite3/build/Release/*.node"
    ],
    "asarUnpack": [
      "node_modules/better-sqlite3/**"
    ]
  }
}
```

```
为什么需要 asarUnpack？

  asar 是 Electron 的打包格式，把所有文件合并为一个归档文件。
  但原生模块（.node 文件）不能从 asar 内部直接加载，
  必须解压到文件系统上。

  asarUnpack 告诉 electron-builder：
  "把这些文件解压出来，不要放进 asar"

  最终结构：
  app.asar                      ← 你的 JS/HTML/CSS 代码
  app.asar.unpacked/            ← 原生模块
    node_modules/
      better-sqlite3/
        build/Release/
          better_sqlite3.node   ← 原生二进制
```

---

## IndexedDB 和 localStorage

### localStorage（渲染进程）

```javascript
// renderer.js
// localStorage: 简单的键值存储，同步 API

// 存储（只能存字符串）
localStorage.setItem('lastOpenedFile', '/path/to/file.md')
localStorage.setItem('viewPreferences', JSON.stringify({
  sidebarWidth: 250,
  showLineNumbers: true,
}))

// 读取
const lastFile = localStorage.getItem('lastOpenedFile')
const prefs = JSON.parse(localStorage.getItem('viewPreferences') || '{}')

// 限制：
// - 只能存字符串
// - 容量通常 5-10MB
// - 同步操作，大数据量会阻塞 UI
// - 不适合存敏感数据（明文存储）
// - 数据跟随 session，清除缓存时会丢失
```

### IndexedDB（渲染进程）

```javascript
// IndexedDB: 浏览器内置的 NoSQL 数据库
// 适合在渲染进程存储大量结构化数据

class IndexedDBStore {
  constructor(dbName = 'AppDB', version = 1) {
    this.dbName = dbName
    this.version = version
    this.db = null
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // 创建 object store（类似表）
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { 
            keyPath: 'id', 
            autoIncrement: true 
          })
          store.createIndex('title', 'title', { unique: false })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }

      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }

      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }

  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.add({ ...data, updatedAt: new Date().toISOString() })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

// 使用
const db = new IndexedDBStore()
await db.open()
await db.add('documents', { title: 'Hello', content: 'World' })
const docs = await db.getAll('documents')
```

### 方案对比

```
┌──────────────┬──────────────┬───────────────┬────────────────┐
│              │ electron-store│ SQLite        │ IndexedDB      │
├──────────────┼──────────────┼───────────────┼────────────────┤
│ 运行位置     │ 主进程       │ 主进程        │ 渲染进程       │
│ API 风格     │ 同步 key-val │ 同步 SQL      │ 异步 NoSQL     │
│ 查询能力     │ 简单         │ 强（SQL）     │ 中等（索引）   │
│ 数据量       │ < 10MB       │ < 数 GB       │ < 数百 MB      │
│ 适用场景     │ 配置/设置    │ 业务数据      │ 离线缓存       │
│ 打包难度     │ 无           │ 中（原生模块）│ 无             │
│ 并发安全     │ 单进程 OK    │ WAL 模式      │ 事务支持       │
└──────────────┴──────────────┴───────────────┴────────────────┘
```

---

## 文件系统操作

### 路径选择

```javascript
const { app } = require('electron')

// Electron 提供的标准路径
const paths = {
  // 应用数据目录（最常用）
  userData: app.getPath('userData'),
  // → ~/Library/Application Support/MyApp/  (macOS)
  // → %APPDATA%/MyApp/                      (Windows)
  
  // 应用临时目录
  temp: app.getPath('temp'),
  
  // 用户桌面
  desktop: app.getPath('desktop'),
  
  // 用户文档
  documents: app.getPath('documents'),
  
  // 下载目录
  downloads: app.getPath('downloads'),
  
  // 应用日志目录
  logs: app.getPath('logs'),
  // → ~/Library/Logs/MyApp/  (macOS)
}
```

### 安全的文件操作

```javascript
const fs = require('node:fs')
const path = require('node:path')
const { app } = require('electron')

class FileManager {
  constructor() {
    this.baseDir = app.getPath('userData')
    this.docsDir = path.join(this.baseDir, 'documents')
    
    // 确保目录存在
    fs.mkdirSync(this.docsDir, { recursive: true })
  }

  // 安全的路径解析（防止路径穿越）
  safePath(relativePath) {
    const resolved = path.resolve(this.docsDir, relativePath)
    if (!resolved.startsWith(this.docsDir)) {
      throw new Error('Path traversal detected')
    }
    return resolved
  }

  readFile(relativePath) {
    const filePath = this.safePath(relativePath)
    return fs.readFileSync(filePath, 'utf-8')
  }

  writeFile(relativePath, content) {
    const filePath = this.safePath(relativePath)
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    
    // 原子写入：先写临时文件，再重命名
    const tmpPath = filePath + '.tmp'
    fs.writeFileSync(tmpPath, content, 'utf-8')
    fs.renameSync(tmpPath, filePath)
  }

  deleteFile(relativePath) {
    const filePath = this.safePath(relativePath)
    if (fs.existsSync(filePath)) {
      // 使用 trash 而非 rm（可恢复）
      const { shell } = require('electron')
      shell.trashItem(filePath)
    }
  }

  listFiles(relativePath = '') {
    const dirPath = this.safePath(relativePath)
    if (!fs.existsSync(dirPath)) return []
    
    return fs.readdirSync(dirPath, { withFileTypes: true }).map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.relative(this.docsDir, path.join(dirPath, entry.name)),
    }))
  }
}
```

---

## 安全存储（Keychain/Credential）

### Electron safeStorage

Electron 内置了 `safeStorage` API，使用操作系统的加密设施：

```javascript
const { safeStorage } = require('electron')

// 检查是否可用
if (safeStorage.isEncryptionAvailable()) {
  // 加密
  const encrypted = safeStorage.encryptString('my-secret-token')
  // encrypted 是 Buffer
  
  // 保存加密后的数据（存到文件或 electron-store）
  store.set('encryptedToken', encrypted.toString('base64'))
  
  // 解密
  const stored = store.get('encryptedToken')
  const decrypted = safeStorage.decryptString(Buffer.from(stored, 'base64'))
  // decrypted === 'my-secret-token'
}
```

```
safeStorage 底层机制：

  macOS:   使用 Keychain Services (SecItemAdd/SecItemCopyMatching)
  Windows: 使用 DPAPI (CryptProtectData/CryptUnprotectData)
  Linux:   使用 libsecret (GNOME Keyring / KWallet)

  特点：
  - 加密绑定到当前用户账户
  - 其他用户或应用无法解密
  - 不需要额外安装依赖
```

### keytar（更丰富的 Keychain 操作）

```bash
npm install keytar
```

```javascript
const keytar = require('keytar')

const SERVICE = 'com.myapp.credentials'

// 存储凭据
await keytar.setPassword(SERVICE, 'github-token', 'ghp_xxxxxxxxxxxx')
await keytar.setPassword(SERVICE, 'api-key', 'sk-xxxxxxxxxxxx')

// 读取凭据
const token = await keytar.getPassword(SERVICE, 'github-token')

// 删除凭据
await keytar.deletePassword(SERVICE, 'github-token')

// 列出所有凭据
const credentials = await keytar.findCredentials(SERVICE)
// [{ account: 'github-token', password: '...' }, ...]
```

---

## 数据迁移策略

### 版本化迁移

```javascript
const Store = require('electron-store')

const store = new Store({
  // 迁移配置
  migrations: {
    // 从版本 0 迁移到版本 1
    '1.0.0': (store) => {
      // 重命名键
      if (store.has('darkMode')) {
        store.set('theme', store.get('darkMode') ? 'dark' : 'light')
        store.delete('darkMode')
      }
    },
    
    // 从版本 1 迁移到版本 2
    '2.0.0': (store) => {
      // 将扁平配置转为嵌套
      const fontSize = store.get('fontSize')
      const fontFamily = store.get('fontFamily')
      if (fontSize || fontFamily) {
        store.set('editor', {
          fontSize: fontSize || 14,
          fontFamily: fontFamily || 'monospace',
        })
        store.delete('fontSize')
        store.delete('fontFamily')
      }
    },
  },
})
```

### 数据库迁移

```javascript
// SQLite 迁移（在 database.js 的 migrate() 方法中）

// 添加新迁移时，只需追加到列表末尾
const migrations = [
  { name: '001_initial', sql: `CREATE TABLE ...` },
  { name: '002_add_tags', sql: `CREATE TABLE tags ...` },
  // 新增：
  { name: '003_add_full_text_search', sql: `
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts 
    USING fts5(title, content, content='notes', content_rowid='id');
    
    -- 填充全文索引
    INSERT INTO notes_fts(rowid, title, content)
    SELECT id, title, content FROM notes WHERE is_deleted = 0;
    
    -- 自动同步触发器
    CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
    END;
  `},
]
```

### 数据备份

```javascript
// 自动备份策略
class BackupManager {
  constructor(dbPath) {
    this.dbPath = dbPath
    this.backupDir = path.join(path.dirname(dbPath), 'backups')
    fs.mkdirSync(this.backupDir, { recursive: true })
  }

  createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(this.backupDir, `backup-${timestamp}.db`)
    fs.copyFileSync(this.dbPath, backupPath)
    
    // 保留最近 5 个备份
    this.cleanOldBackups(5)
    
    return backupPath
  }

  cleanOldBackups(keepCount) {
    const backups = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('backup-'))
      .sort()
      .reverse()
    
    for (const backup of backups.slice(keepCount)) {
      fs.unlinkSync(path.join(this.backupDir, backup))
    }
  }

  restoreBackup(backupPath) {
    // 先备份当前数据
    this.createBackup()
    // 恢复
    fs.copyFileSync(backupPath, this.dbPath)
  }
}
```

---

## 深入理解

### electron-store 的存储位置和格式

```
electron-store 默认存储文件：

  macOS:   ~/Library/Application Support/<app>/config.json
  Windows: %APPDATA%/<app>/config.json
  Linux:   ~/.config/<app>/config.json

  文件内容（明文 JSON）：
  {
    "theme": "dark",
    "fontSize": 14,
    "window": {
      "width": 1200,
      "height": 800
    }
  }

  加密模式下（encryptionKey 启用）：
  文件内容是 AES-256-CBC 加密的不可读数据
```

### SQLite WAL 模式

```
WAL (Write-Ahead Logging) 模式：

  默认模式 (rollback journal):
    写入时锁定整个数据库
    读取也会被阻塞
    ┌──────┐
    │ 写入 │──→ 锁定 DB ──→ 其他操作等待
    └──────┘

  WAL 模式:
    写入到单独的 WAL 文件
    读取不受影响
    ┌──────┐     ┌─────────┐
    │ 写入 │──→  │ WAL 文件│
    └──────┘     └─────────┘
    ┌──────┐     ┌──────┐
    │ 读取 │──→  │ DB   │  ← 不冲突
    └──────┘     └──────┘

  this.db.pragma('journal_mode = WAL')

  优势：
  - 读写并发
  - 写入性能提升
  - 崩溃恢复更可靠
```

### 数据存储安全层级

```
安全层级（从低到高）：

  Level 0: localStorage / sessionStorage
  ├── 明文存储
  ├── 任何能打开 DevTools 的人都能看到
  └── 适合：非敏感的 UI 状态

  Level 1: electron-store (JSON 文件)
  ├── 明文文件，有文件系统权限的人可以读取
  ├── 路径可预测
  └── 适合：用户偏好、非敏感配置

  Level 2: electron-store + encryptionKey
  ├── AES-256 加密
  ├── 密钥在代码中（可以被逆向）
  └── 适合：不太敏感的数据，防普通用户查看

  Level 3: safeStorage
  ├── 操作系统级加密
  ├── 绑定用户账户
  └── 适合：API Token、用户凭据

  Level 4: keytar (系统 Keychain)
  ├── 操作系统密钥管理器
  ├── 可能需要用户确认
  └── 适合：密码、加密密钥、高敏感数据
```

---

## 常见问题

### Q1: better-sqlite3 打包后无法加载

确保在 `electron-builder` 配置中设置了 `asarUnpack`。原生模块必须解压到文件系统。

### Q2: electron-store 文件被损坏

通常是应用崩溃时写入不完整导致的。electron-store 内部使用原子写入（写临时文件再重命名），但极端情况下仍可能损坏。建议定期备份。

### Q3: 应该在主进程还是渲染进程存储数据？

- **主进程**：electron-store, SQLite, fs, safeStorage
- **渲染进程**：localStorage, sessionStorage, IndexedDB
- 推荐：将所有持久化逻辑放在主进程，通过 IPC 提供接口

### Q4: 数据量很大时 electron-store 变慢

electron-store 每次写入都序列化整个 JSON。数据量超过几 MB 时，改用 SQLite。

### Q5: 如何处理跨版本数据格式变化？

使用迁移策略：electron-store 的 `migrations` 选项或 SQLite 的版本化迁移。

---

## 实践建议

### 1. 选型决策树

```
你需要存什么数据？
  │
  ├── 应用设置/配置 → electron-store
  │
  ├── 需要查询的结构化数据 → SQLite
  │
  ├── 密码/Token → safeStorage 或 keytar
  │
  ├── 临时 UI 状态 → localStorage
  │
  ├── 大量离线数据（渲染进程） → IndexedDB
  │
  └── 用户文件 → fs + app.getPath
```

### 2. 数据安全原则

- 永远不要在 localStorage 存密码或 Token
- 使用 safeStorage 加密敏感数据
- 数据库文件权限设置正确（0600）
- 实现自动备份机制
- 提供数据导出/导入功能

### 3. 性能建议

- electron-store：数据量控制在 1MB 以内
- SQLite：开启 WAL 模式
- 大文件用流式读写（fs.createReadStream）
- 批量数据库操作用事务包裹

---

## 本章小结

Electron 提供了丰富的数据存储选择：

1. **electron-store**：轻量配置管理
2. **SQLite**：强大的本地数据库
3. **IndexedDB/localStorage**：浏览器内置存储
4. **文件系统**：直接文件操作
5. **safeStorage/keytar**：安全凭据存储

关键是根据数据特性选择合适的方案，并始终注意安全性。

---

> **上一篇**：[06 - 安全](./06-security.md)  
> **下一篇**：[08 - 打包与分发](./08-packaging.md)
