# 第十三章：React 开发者的 Electron 速通指南

## 目录

- [心智模型转换：Web React vs Electron React](#心智模型转换web-react-vs-electron-react)
- [最快起步：electron-vite + React + TypeScript](#最快起步electron-vite--react--typescript)
- [React 开发者最需要学的 3 件事](#react-开发者最需要学的-3-件事)
- [React 生态在 Electron 中的适配](#react-生态在-electron-中的适配)
- [常见踩坑：React 老手容易犯的错](#常见踩坑react-老手容易犯的错)
- [Mini 项目：React + Electron 笔记应用](#mini-项目react--electron-笔记应用)
- [实践建议](#实践建议)
- [本章小结](#本章小结)

---

## 心智模型转换：Web React vs Electron React

你写了多年 React，已经习惯了这样的世界：浏览器里跑 React，fetch 请求打到后端 API，后端处理文件、数据库等系统操作。现在进入 Electron，最关键的一步不是学新 API，而是**转换心智模型**。

### 你的 React 其实没变

先说好消息：你的 React 代码几乎不需要改。JSX、hooks、组件、状态管理——全部照搬。因为 Electron 的渲染进程本质就是一个 Chromium 浏览器标签页，你的 React 应用就跑在里面。

```
Web 时代：  React 应用 ──fetch──→ 后端 Server ──→ 文件/数据库/系统
Electron：  React 应用 ──IPC───→ 主进程(Node.js) ──→ 文件/数据库/系统
                          ↑
                     preload 桥梁
```

```
Electron 应用完整结构：

┌──────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐    │
│  │            渲染进程（就是 Chrome 标签页）                │    │
│  │    ┌──────────────────────────────────────────┐      │    │
│  │    │         你的 React 应用（不用改）           │      │    │
│  │    │    组件 → Hooks → State → UI              │      │    │
│  │    └───────────────────┬──────────────────────┘      │    │
│  │                        │ window.electronAPI           │    │
│  │  ┌─────────────────────┴──────────────────────────┐  │    │
│  │  │     preload 脚本（contextBridge 暴露白名单 API） │  │    │
│  │  └─────────────────────┬──────────────────────────┘  │    │
│  └────────────────────────┼─────────────────────────────┘    │
│                           │ IPC（进程间通信）                  │
│  ┌────────────────────────┴─────────────────────────────┐    │
│  │    主进程（Node.js）— 文件 │ SQLite │ 通知 │ 窗口管理    │    │
│  └───────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 三个关键概念的对应关系

| Web React 世界 | Electron React 世界 | 说明 |
|---------------|---------------------|------|
| 浏览器标签页 | 渲染进程（BrowserWindow） | 你的 React 跑在这里 |
| 后端 API Server | 主进程（Main Process） | Node.js 环境，处理系统操作 |
| fetch / HTTP 请求 | IPC 通信 | 进程间调用，不走网络 |
| 无 | preload 脚本 | 安全桥梁，连接渲染进程和主进程 |

一句话总结：**Electron = Chrome 标签页（跑你的 React）+ 内置的 Node.js 后端（不用另起服务器）+ 一座桥（preload）**。

### 为什么不能在 React 里直接用 Node.js？

React 老手最容易困惑的问题：既然 Electron 里有 Node.js，为什么我不能在 React 组件里直接 `require('fs')` 读文件？

答案是**安全**。渲染进程加载的可能是远程内容（想想 Electron 应用里的 webview），如果渲染进程有完整的 Node.js 权限，一个 XSS 漏洞就能让攻击者读你整个硬盘。所以 Electron 的安全模型是：

```
渲染进程（React）    →  沙箱化，没有 Node.js 能力
         │
    preload 脚本      →  有限的 Node.js 能力 + contextBridge 暴露白名单 API
         │
主进程（Node.js）     →  完整系统权限
```

你只需要记住：**React 组件通过 preload 暴露的 API 间接调用主进程能力，永远不要绕过这座桥。**

---

## 最快起步：electron-vite + React + TypeScript

作为 React 开发者，你大概率用过 Vite。`electron-vite` 就是专为 Electron 定制的 Vite 版本，开发体验和你写 Web React 几乎一样。

### 一行命令创建项目

```bash
npm create @quick-start/electron@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

执行完，你就能看到一个带有 Electron 窗口的 React 应用，支持热更新。

### 项目结构解析

```
my-app/
├── electron.vite.config.ts      ← Vite 配置（管三个构建目标）
├── package.json
├── src/
│   ├── main/                    ← 主进程代码（Node.js 环境）
│   │   └── index.ts             ← 入口：创建窗口、注册 IPC
│   ├── preload/                 ← preload 脚本（桥梁）
│   │   └── index.ts             ← contextBridge 暴露 API
│   └── renderer/                ← 渲染进程（你的 React 应用）
│       ├── src/
│       │   ├── App.tsx          ← 你熟悉的 React 组件
│       │   ├── main.tsx         ← React 入口（createRoot）
│       │   └── components/
│       └── index.html
├── resources/                   ← 静态资源（图标等）
└── out/                         ← 构建输出
```

注意三个目录的对应关系：

```
src/main/       →  编译后跑在 Node.js 里      →  管理窗口、系统 API
src/preload/    →  编译后注入到渲染进程之前    →  暴露安全 API
src/renderer/   →  编译后跑在 Chromium 里      →  你的 React 应用
```

### electron.vite.config.ts 配置要点

```ts
// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 主进程配置
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  // preload 配置
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  // 渲染进程配置 — 这部分和你写 Web Vite 项目完全一样
  renderer: {
    plugins: [react()],
    // 可以加 resolve alias、CSS 配置等，和 Web 项目一样
  }
})
```

关键点：`externalizeDepsPlugin()` 确保 Node.js 原生模块不会被 Vite 打包，这是 Electron 特有的需求。渲染进程的配置和你写 Web 项目完全一样。

### 开发体验

```bash
npm run dev     # 启动开发模式，渲染进程支持 HMR 热更新
npm run build   # 构建生产版本
npm run preview # 预览构建结果
```

主进程代码修改后会自动重启 Electron，渲染进程代码修改后热更新，体验和 Web 开发一致。

---

## React 开发者最需要学的 3 件事

React 的知识你已经有了。进入 Electron 只需要额外学三件事：IPC 通信、窗口管理、本地能力。

### 一、IPC 通信 — React 组件怎么调主进程能力

这是最核心的新概念。在 Web 世界你用 `fetch` 调后端 API，在 Electron 里你用 IPC 调主进程。

#### 第一步：主进程注册处理函数

```ts
// src/main/index.ts
import { ipcMain, dialog } from 'electron'

// 类似后端定义一个 API 路由
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Text', extensions: ['txt', 'md'] }]
  })
  return result.filePaths[0] ?? null
})
```

#### 第二步：preload 暴露给渲染进程

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),

  // 监听主进程主动推送的事件
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action)
    ipcRenderer.on('menu:action', handler)
    // 返回清理函数，供 React useEffect 的 cleanup 使用
    return () => ipcRenderer.removeListener('menu:action', handler)
  }
})
```

#### 第三步：React 组件里调用

```tsx
// src/renderer/src/App.tsx

function App() {
  const handleOpen = async () => {
    // 就像调后端 API 一样简单
    const filePath = await window.electronAPI.openFile()
    if (filePath) {
      const content = await window.electronAPI.readFile(filePath)
      console.log(content)
    }
  }

  return <button onClick={handleOpen}>打开文件</button>
}
```

#### useEffect 里监听主进程事件

主进程可能主动向渲染进程推送事件（比如菜单点击、快捷键触发）。在 React 里用 `useEffect` 监听：

```tsx
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    // 注册监听，返回清理函数
    const cleanup = window.electronAPI.onMenuAction((action) => {
      if (action === 'save') handleSave()
      if (action === 'open') handleOpen()
    })
    // React 卸载时移除监听 — 和你处理 DOM 事件一样
    return cleanup
  }, [])

  // ...
}
```

#### 自定义 Hook 封装 IPC（useIPC 模式）

React 开发者的本能：重复逻辑 → 抽 Hook。可以封装一个通用的 `useIPC`，自带 loading / error 状态，用法类似 `useSWR`。具体实现见后面 Mini 项目中的 `useNotes` hook。

#### IPC 通信的完整流程

```
React 组件                    preload                     主进程
    │                            │                           │
    │ window.electronAPI.xxx()   │                           │
    ├───────────────────────────►│                           │
    │                            │ ipcRenderer.invoke(ch)    │
    │                            ├──────────────────────────►│
    │                            │                           │ 执行 Node.js 操作
    │                            │                           │ （读文件、弹对话框等）
    │                            │      返回结果             │
    │                            │◄──────────────────────────┤
    │      Promise resolve       │                           │
    │◄───────────────────────────┤                           │
    │                            │                           │
```

### 二、窗口管理 — BrowserWindow 创建和控制

Web 开发里，你只有一个浏览器标签页。在 Electron 里，你可以创建任意多个窗口。

#### 创建窗口

```ts
// src/main/index.ts
import { BrowserWindow } from 'electron'

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true     // 安全：启用沙箱
    }
  })

  // 开发模式加载 dev server，生产模式加载打包后的 HTML
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
```

#### React Router 多路由 vs 多窗口

这是 React 开发者常纠结的设计决策：

```
方案 A：单窗口 + React Router（推荐大多数场景）
┌───────────────────────────────────┐
│         BrowserWindow              │
│  ┌─────────────────────────────┐  │
│  │  React App                  │  │
│  │  ┌────┐ ┌────┐ ┌────────┐  │  │
│  │  │ /  │ │/set│ │/editor │  │  │
│  │  │首页│ │设置│ │编辑器  │  │  │
│  │  └────┘ └────┘ └────────┘  │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘

方案 B：多窗口（独立窗口有独立生命周期）
┌────────────────┐  ┌────────────────┐
│  主窗口          │  │  设置窗口        │
│  BrowserWindow  │  │  BrowserWindow  │
│  React App #1   │  │  React App #2   │
│  (首页 + 编辑器) │  │  (设置页)        │
└────────────────┘  └────────────────┘
```

| 场景 | 推荐方案 |
|------|---------|
| 一般应用（设置、关于页） | 单窗口 + React Router |
| 需要独立拖拽的面板 | 多窗口 |
| 需要独立关闭/最小化 | 多窗口 |
| 类似 VS Code 的标签页 | 单窗口 + 自定义标签管理 |

### 三、本地能力 — 文件读写、数据库、系统通知

这是 Electron 相比 Web 的核心优势。所有本地操作都在主进程完成，通过 IPC 暴露给 React。

```ts
// src/main/index.ts — 注册各种本地能力
import { ipcMain, Notification, shell } from 'electron'
import { readFile, writeFile } from 'fs/promises'

// 文件读写
ipcMain.handle('fs:readFile', async (_event, path: string) => {
  return readFile(path, 'utf-8')
})

ipcMain.handle('fs:writeFile', async (_event, path: string, content: string) => {
  await writeFile(path, content, 'utf-8')
})

// 系统通知
ipcMain.handle('notify', async (_event, title: string, body: string) => {
  new Notification({ title, body }).show()
})

// 用默认程序打开链接（不在 Electron 窗口内打开）
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url)
})
```

preload 暴露和 React 调用方式与前面 IPC 章节完全相同，在此不再重复。核心模式：**主进程 `ipcMain.handle` → preload `contextBridge` → React `window.electronAPI.xxx()`**。

---

## React 生态在 Electron 中的适配

好消息：React 生态里你用的大部分工具都能直接用。但有几个需要注意适配的地方。

### React Router：必须用 HashRouter

这是最常见的坑。Electron 生产环境下通过 `file://` 协议加载 HTML，而 `BrowserRouter` 依赖浏览器的 History API 和 URL 路径，在 `file://` 协议下无法工作。

```tsx
// ✗ 错误 — 生产环境白屏
import { BrowserRouter } from 'react-router-dom'
<BrowserRouter><App /></BrowserRouter>

// ✓ 正确 — Electron 推荐
import { HashRouter } from 'react-router-dom'
<HashRouter><App /></HashRouter>
```

```
BrowserRouter URL:  file:///app/index.html/settings   ← 文件系统找不到这个路径
HashRouter URL:     file:///app/index.html#/settings   ← 正常工作，# 后面是前端路由
```

### 状态管理：Zustand / Jotai / Redux 照用

单窗口应用中，状态管理完全不需要适配，和 Web 项目一模一样。

```tsx
// Zustand 示例 — 完全无需修改
import { create } from 'zustand'

const useStore = create((set) => ({
  notes: [],
  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
}))
```

但如果是**多窗口应用**，每个窗口是独立的渲染进程，有各自独立的内存空间。窗口之间的状态同步需要通过 IPC：

```
窗口 A (Zustand Store)  ←──IPC──→  主进程  ←──IPC──→  窗口 B (Zustand Store)
```

典型方案是在主进程维护一份权威状态，窗口的状态变更通过 IPC 通知主进程，主进程再广播给所有窗口。

### UI 库：全部可用

Electron 渲染进程就是标准的 Chromium 环境，所有 Web UI 库都能正常工作：

| UI 库 | 兼容性 | 备注 |
|-------|--------|------|
| Ant Design | 完全兼容 | 无需任何配置 |
| Radix UI | 完全兼容 | 无需任何配置 |
| shadcn/ui | 完全兼容 | 配合 Tailwind 使用 |
| Material UI | 完全兼容 | 无需任何配置 |
| Headless UI | 完全兼容 | 无需任何配置 |

### CSS：Tailwind 完全兼容

Tailwind CSS 在 Electron 中无需任何特殊配置，按 Web 项目正常安装（`npm install -D tailwindcss @tailwindcss/vite`），在渲染进程的 Vite 配置中加入插件即可。

---

## 常见踩坑：React 老手容易犯的错

以下是 React 开发者初入 Electron 时最常犯的错误，每个都配了解决方案。

### 坑 1：在渲染进程直接 require('fs')

```tsx
// ✗ 这样写会直接报错
import fs from 'fs'
const content = fs.readFileSync('/path/to/file', 'utf-8')
```

**原因**：渲染进程是沙箱化的浏览器环境，没有 Node.js 内置模块。

**解决**：通过 preload 暴露文件读写 API，React 组件通过 `window.electronAPI` 调用。

### 坑 2：把 nodeIntegration 设为 true

```ts
// ✗ 严重安全隐患
new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,       // 不要这样做
    contextIsolation: false,     // 不要这样做
  }
})
```

**原因**：这样做等于给渲染进程完整的 Node.js 权限。如果渲染进程加载了任何不受信任的内容（包括第三方 npm 包的 XSS 漏洞），攻击者就能操作你的文件系统。

**正确做法**：保持默认值（`nodeIntegration: false`，`contextIsolation: true`，`sandbox: true`），通过 preload + contextBridge 暴露最小权限的 API。

### 坑 3：用 BrowserRouter 导致白屏

```
开发模式：正常工作（因为用的是 http://localhost:5173）
生产模式：白屏（因为用的是 file:///...）

开发模式 OK ≠ 生产模式 OK，这是 Electron 特有的陷阱。
```

**解决**：始终使用 `HashRouter`。参考上一节。

### 坑 4：忽略主进程报错

React 开发者习惯在 DevTools Console 里看错误。但主进程的错误**不会出现在 DevTools 里**，它们打印在启动 Electron 的终端窗口中。

```
┌──────────────────────────────────────────────────┐
│  DevTools Console（渲染进程）                       │
│  ✓ 能看到 React 组件里的 console.log              │
│  ✓ 能看到渲染进程的报错                            │
│  ✗ 看不到主进程的报错                              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  终端 / Terminal（运行 npm run dev 的那个窗口）     │
│  ✓ 能看到主进程的 console.log                      │
│  ✓ 能看到主进程的报错                              │
│  ✗ 看不到渲染进程的输出                             │
└──────────────────────────────────────────────────┘
```

**建议**：开发时保持终端窗口可见。IPC 调用失败时，先去终端看主进程有没有报错。

### 坑 5：React 开发服务器代理配置无效

Web 项目中你可能在 `vite.config.ts` 配了 `server.proxy`。在 Electron 中这没有意义——你的"后端"是主进程，通过 IPC 通信，不走 HTTP。删掉代理配置，用 IPC 替代所有"前后端通信"。

---

## Mini 项目：React + Electron 笔记应用

用一个完整的小项目串联上面所有知识点。这是一个简单的 Markdown 笔记应用：能创建、编辑、保存笔记到本地文件。

### 项目文件结构

```
notes-app/
├── electron.vite.config.ts
├── package.json
├── src/
│   ├── main/
│   │   └── index.ts              ← 窗口创建 + 文件读写 IPC
│   ├── preload/
│   │   └── index.ts              ← 暴露 fileAPI
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx           ← React 入口
│           ├── App.tsx            ← 主组件
│           ├── hooks/
│           │   └── useNotes.ts    ← 笔记 CRUD hook
│           └── components/
│               ├── NoteList.tsx   ← 笔记列表
│               └── Editor.tsx     ← 编辑器
└── notes/                         ← 笔记存储目录（运行时创建）
```

### 主进程：窗口 + 文件读写 API

```ts
// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readdir, readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { is } from '@electron-toolkit/utils'

const NOTES_DIR = join(app.getPath('userData'), 'notes')

// 确保笔记目录存在
async function ensureNotesDir() {
  await mkdir(NOTES_DIR, { recursive: true })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 注册 IPC 处理函数
function registerIPC() {
  ipcMain.handle('notes:list', async () => {
    await ensureNotesDir()
    const files = await readdir(NOTES_DIR)
    return files.filter(f => f.endsWith('.md'))
  })

  ipcMain.handle('notes:read', async (_event, filename: string) => {
    const filePath = join(NOTES_DIR, filename)
    return readFile(filePath, 'utf-8')
  })

  ipcMain.handle('notes:write', async (_event, filename: string, content: string) => {
    await ensureNotesDir()
    await writeFile(join(NOTES_DIR, filename), content, 'utf-8')
  })

  ipcMain.handle('notes:delete', async (_event, filename: string) => {
    await unlink(join(NOTES_DIR, filename))
  })
}

app.whenReady().then(() => {
  registerIPC()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

### preload：暴露 fileAPI

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('fileAPI', {
  listNotes: () => ipcRenderer.invoke('notes:list'),
  readNote: (filename: string) => ipcRenderer.invoke('notes:read', filename),
  writeNote: (filename: string, content: string) =>
    ipcRenderer.invoke('notes:write', filename, content),
  deleteNote: (filename: string) => ipcRenderer.invoke('notes:delete', filename),
})
```

### TypeScript 类型声明

```ts
// src/preload/index.d.ts — 让 React 组件获得类型提示
export interface FileAPI {
  listNotes: () => Promise<string[]>
  readNote: (filename: string) => Promise<string>
  writeNote: (filename: string, content: string) => Promise<void>
  deleteNote: (filename: string) => Promise<void>
}

declare global {
  interface Window {
    fileAPI: FileAPI
  }
}
```

### React：useNotes Hook

```tsx
// src/renderer/src/hooks/useNotes.ts
import { useState, useEffect, useCallback } from 'react'

export function useNotes() {
  const [notes, setNotes] = useState<string[]>([])
  const [currentNote, setCurrentNote] = useState<string | null>(null)
  const [content, setContent] = useState('')

  // 加载笔记列表
  const loadNotes = useCallback(async () => {
    const list = await window.fileAPI.listNotes()
    setNotes(list)
  }, [])

  // 打开笔记
  const openNote = useCallback(async (filename: string) => {
    const text = await window.fileAPI.readNote(filename)
    setCurrentNote(filename)
    setContent(text)
  }, [])

  // 保存笔记
  const saveNote = useCallback(async () => {
    if (!currentNote) return
    await window.fileAPI.writeNote(currentNote, content)
  }, [currentNote, content])

  // 新建笔记
  const createNote = useCallback(async (title: string) => {
    const filename = `${title}.md`
    await window.fileAPI.writeNote(filename, `# ${title}\n\n`)
    await loadNotes()
    await openNote(filename)
  }, [loadNotes, openNote])

  // 删除笔记
  const deleteNote = useCallback(async (filename: string) => {
    await window.fileAPI.deleteNote(filename)
    if (currentNote === filename) {
      setCurrentNote(null)
      setContent('')
    }
    await loadNotes()
  }, [currentNote, loadNotes])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  return { notes, currentNote, content, setContent, openNote, saveNote, createNote, deleteNote }
}
```

### React：App 组件

```tsx
// src/renderer/src/App.tsx
import { useNotes } from './hooks/useNotes'
import { NoteList } from './components/NoteList'
import { Editor } from './components/Editor'

function App() {
  const {
    notes, currentNote, content, setContent,
    openNote, saveNote, createNote, deleteNote
  } = useNotes()

  // 标准 React 组件写法，没有任何 Electron 特殊代码
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <NoteList notes={notes} currentNote={currentNote}
        onSelect={openNote} onCreate={createNote} onDelete={deleteNote} />
      <Editor content={content} onChange={setContent}
        onSave={saveNote} disabled={!currentNote} />
    </div>
  )
}
```

### 项目数据流全景

```
┌───────────────────────────────────────────────────────────┐
│                     渲染进程（React）                       │
│                                                           │
│   NoteList                    Editor                      │
│   ┌──────────┐               ┌──────────────────────┐    │
│   │ note1.md │ ← onSelect → │  # 标题               │    │
│   │ note2.md │               │  正文内容...           │    │
│   │ + 新建   │               │         [保存] 按钮    │    │
│   └──────────┘               └──────────┬───────────┘    │
│        │                                │                 │
│        │        useNotes Hook           │                 │
│        └────────────┬───────────────────┘                 │
│                     │ window.fileAPI.xxx()                 │
└─────────────────────┼─────────────────────────────────────┘
                      │ IPC
┌─────────────────────┼─────────────────────────────────────┐
│                 preload（桥梁）                              │
│          contextBridge.exposeInMainWorld('fileAPI', ...)   │
└─────────────────────┼─────────────────────────────────────┘
                      │ IPC
┌─────────────────────┼─────────────────────────────────────┐
│               主进程（Node.js）                              │
│                     │                                      │
│     ipcMain.handle('notes:list')  → readdir(NOTES_DIR)   │
│     ipcMain.handle('notes:read')  → readFile(...)         │
│     ipcMain.handle('notes:write') → writeFile(...)        │
│     ipcMain.handle('notes:delete') → unlink(...)          │
│                     │                                      │
│              ┌──────┴──────┐                               │
│              │  文件系统     │                               │
│              │  ~/notes/   │                               │
│              └─────────────┘                               │
└───────────────────────────────────────────────────────────┘
```

---

## 实践建议

### 从 Web 到 Electron 的渐进式迁移路径

如果你有一个现成的 React Web 项目想迁移到 Electron：

```
第 1 步：用 electron-vite 创建空项目
第 2 步：把 React 代码复制到 src/renderer/
第 3 步：BrowserRouter → HashRouter
第 4 步：把 fetch API 调用替换为 IPC 调用
第 5 步：在主进程实现原来后端做的事（文件、数据库等）
第 6 步：在 preload 中暴露需要的 API
```

### 开发工作流建议

| 阶段 | 建议 |
|------|------|
| 界面开发 | 先在浏览器里调试 UI，用 mock 数据替代 IPC 调用 |
| IPC 调试 | 终端和 DevTools Console 同时看 |
| 类型安全 | 为 preload 暴露的 API 写 `.d.ts` 类型声明 |
| 状态管理 | 先用 Zustand/Jotai，需要跨窗口时再加 IPC 同步层 |
| 打包测试 | 不要只在 dev 模式测试，定期 `npm run build` 验证生产包 |

### 推荐的学习顺序

```
已有 React 知识 → 本章（速通） → 第三章（IPC 深入）→ 第六章（安全）
                                → 第四章（窗口）→ 第五章（原生 API）
                                → 第七章（数据存储）→ 第八章（打包发布）
```

---

## 本章小结

| 概念 | Web React 开发者的理解方式 |
|------|--------------------------|
| 渲染进程 | 就是你熟悉的 Chrome 标签页，React 跑在这里 |
| 主进程 | 就是你的"后端"，但不用另起服务器 |
| preload | 就是"API 网关"，决定 React 能调什么 |
| IPC | 就是 `fetch`，但不走网络，走进程间通信 |
| BrowserWindow | 就是 `window.open()`，但功能强大得多 |
| contextBridge | 就是"白名单"，只暴露你允许的 API |

**最核心的一句话**：你的 React 技能完全可复用，只需要多学一层"React ←→ 主进程"的通信模式，就能构建功能完整的桌面应用。
