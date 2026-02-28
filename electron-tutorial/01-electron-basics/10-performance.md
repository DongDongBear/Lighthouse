# 第十章：性能优化与诊断

## 目录

- [性能三要素](#性能三要素)
- [启动优化](#启动优化)
- [运行时优化](#运行时优化)
- [内存诊断](#内存诊断)
- [性能分析工具](#性能分析工具)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## 性能三要素

Electron 应用的性能优化围绕三个核心指标：

```
┌──────────────────────────────────────────────────────────────┐
│                  Electron 性能三角                            │
│                                                              │
│                    启动速度                                   │
│                   ╱        ╲                                  │
│                  ╱          ╲                                 │
│                 ╱   用户感知  ╲                               │
│                ╱    的性能     ╲                              │
│               ╱                ╲                              │
│         运行时响应 ──────── 内存占用                           │
│                                                              │
│  启动速度：   从双击图标到窗口可交互的时间                     │
│  运行时响应：  操作反馈的即时性（点击、滚动、输入）            │
│  内存占用：   长时间运行后的内存稳定性                         │
│                                                              │
│  用户感知基准：                                               │
│  ┌────────────┬────────────┬────────────────────┐            │
│  │ 指标       │ 良好       │ 需要优化            │            │
│  ├────────────┼────────────┼────────────────────┤            │
│  │ 冷启动     │ < 3 秒     │ > 5 秒              │            │
│  │ 操作响应   │ < 100 ms   │ > 300 ms            │            │
│  │ 内存占用   │ < 200 MB   │ > 500 MB            │            │
│  └────────────┴────────────┴────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

Electron 官方性能文档总结了 8 条核心建议，我们逐一展开。

---

## 启动优化

### 1. 延迟加载模块 — 不要在启动时贪婪 require

这是 Electron 官方最强调的一条：**Carelessly including modules**。

```
问题：启动时加载所有模块

  // main.js — 错误示范 ❌
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');
  const sharp = require('sharp');           // 大型原生模块
  const sqlite3 = require('better-sqlite3'); // 大型原生模块
  const marked = require('marked');          // Markdown 解析
  const hljs = require('highlight.js');      // 代码高亮

  启动时间线：
  ┌─────────────────────────────────────────────┐
  │ require sharp     ████████  120ms           │
  │ require sqlite3   ██████    90ms            │
  │ require marked    ███       45ms            │
  │ require hljs      █████     75ms            │
  │                              ─────          │
  │                    总计:     330ms 浪费!     │
  │                                             │
  │ 这些模块在用户打开文件之前根本不需要         │
  └─────────────────────────────────────────────┘
```

**解决方案：用到时再加载**

```js
// main.js — 正确做法 ✅

// 启动时只加载必要模块
const { app, BrowserWindow } = require('electron');

// 其他模块延迟加载
let _sharp;
function getSharp() {
  if (!_sharp) {
    _sharp = require('sharp');  // 首次调用时才加载
  }
  return _sharp;
}

// IPC handler 中按需使用
ipcMain.handle('image:resize', async (event, imagePath, width) => {
  const sharp = getSharp();  // 用户真正需要时才加载
  return sharp(imagePath).resize(width).toBuffer();
});
```

更优雅的写法 — 用 ESM 动态 import：

```js
// 使用动态 import（推荐）
ipcMain.handle('markdown:render', async (event, text) => {
  const { marked } = await import('marked');  // 按需动态加载
  return marked(text);
});
```

### 2. 预热窗口 — Hidden Window Trick

窗口创建和页面加载是启动过程中最耗时的部分。通过预先创建隐藏窗口来消除感知延迟：

```
传统方式（用户可见白屏）：

  双击图标 → [创建窗口 200ms] → [加载HTML 300ms] → [渲染 200ms] → 显示
                                                                    │
              ◄──────── 用户看到白屏 700ms ────────────────────────►│

预热方式（窗口就绪后才显示）：

  双击图标 → [创建隐藏窗口] → [加载HTML] → [渲染完成] → 显示!
                │                                          │
                └── 用户看到的：启动画面 / 无感知 ──────────┘
```

```js
// main.js — 预热窗口
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,              // 关键：先不显示
    backgroundColor: '#1e1e1e', // 避免白色闪烁
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');

  // 等页面完全渲染后再显示
  win.once('ready-to-show', () => {
    win.show();
  });

  return win;
}
```

### 3. V8 Snapshot 与 Code Cache

V8 引擎支持将编译后的字节码缓存起来，减少下次启动的解析时间：

```
首次启动:
  源代码.js → [解析] → [编译为字节码] → [执行]
              ████████████████████████
              较慢

后续启动（有 Code Cache）:
  缓存的字节码 → [直接执行]
                  ████████
                  快得多
```

```js
// Electron 自动管理渲染进程的 code cache
// 主进程可以通过 v8-compile-cache 加速
// 安装: npm install v8-compile-cache

// main.js 顶部
require('v8-compile-cache');

// Electron 还支持自定义 V8 snapshot（高级用法）
// 适合大型应用，将初始化代码打入 snapshot
// 参考：electron-link + mksnapshot
```

### 4. 启动性能度量

```js
// main.js — 记录启动各阶段耗时
const startTime = Date.now();

app.on('ready', () => {
  console.log(`app ready: ${Date.now() - startTime}ms`);

  const win = createWindow();

  win.webContents.once('dom-ready', () => {
    console.log(`DOM ready: ${Date.now() - startTime}ms`);
  });

  win.webContents.once('did-finish-load', () => {
    console.log(`页面加载完成: ${Date.now() - startTime}ms`);
  });

  win.once('ready-to-show', () => {
    console.log(`可以显示: ${Date.now() - startTime}ms`);
    win.show();
    console.log(`总启动时间: ${Date.now() - startTime}ms`);
  });
});
```

---

## 运行时优化

### 1. 不要阻塞主进程

这是 Electron 官方反复强调的一条：**Blocking the main process**。

主进程负责窗口管理、IPC 调度和系统事件响应。如果主进程被长任务阻塞，整个应用会卡死：

```
主进程被阻塞的效果：

  主进程:  [处理IPC] [████████ CPU密集计算 ████████] [处理IPC]
                      │                              │
  窗口响应: 正常      │   冻结！不响应鼠标和键盘     │ 恢复
                      │                              │
  用户感受:           "应用卡死了"                    "终于好了"
```

**解决方案：长任务放到 Worker 或 Utility Process**

```js
// ❌ 错误：在主进程中做 CPU 密集计算
ipcMain.handle('data:analyze', (event, data) => {
  // 这会阻塞主进程！
  const result = heavyComputation(data);
  return result;
});

// ✅ 方案一：使用 Worker Thread
const { Worker } = require('worker_threads');

ipcMain.handle('data:analyze', (event, data) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./workers/analyzer.js', {
      workerData: data,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
});

// ✅ 方案二：使用 Utility Process（Electron 推荐）
const { utilityProcess } = require('electron');

let analyzerProcess;

function getAnalyzer() {
  if (!analyzerProcess) {
    analyzerProcess = utilityProcess.fork(
      path.join(__dirname, 'workers/analyzer.js')
    );
  }
  return analyzerProcess;
}

ipcMain.handle('data:analyze', (event, data) => {
  return new Promise((resolve) => {
    const analyzer = getAnalyzer();
    analyzer.postMessage({ type: 'analyze', data });
    analyzer.once('message', (result) => resolve(result));
  });
});
```

### 2. IPC 批量化

频繁的跨进程通信有开销。如果渲染进程需要大量数据，批量传输比逐条请求高效得多：

```
❌ 逐条请求（每条 IPC 都有序列化/反序列化开销）：

  渲染进程        主进程
  getItem(1) ──► 查询 ──► 返回
  getItem(2) ──► 查询 ──► 返回
  getItem(3) ──► 查询 ──► 返回
  ...
  getItem(100) ─► 查询 ──► 返回     总计: 100次 IPC × ~0.5ms = 50ms

✅ 批量请求：

  渲染进程                  主进程
  getItems([1..100]) ────► 批量查询 ──► 返回全部     总计: 1次 IPC = ~2ms
```

```js
// ❌ 逐条 IPC
async function loadAllItems() {
  const items = [];
  for (const id of ids) {
    const item = await window.electronAPI.getItem(id);
    items.push(item);
  }
  return items;
}

// ✅ 批量 IPC
async function loadAllItems() {
  return window.electronAPI.getItems(ids); // 一次传输
}

// 主进程 handler
ipcMain.handle('db:getItems', (event, ids) => {
  // 一次查询返回所有结果
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(`SELECT * FROM items WHERE id IN (${placeholders})`).all(...ids);
});
```

### 3. 渲染进程优化

渲染进程就是一个 Chromium 页面，Web 性能优化的经验完全适用：

```js
// 虚拟滚动 — 大列表只渲染可见部分
// 使用 react-virtualized、vue-virtual-scroller 等库
// 原理：
//
// 传统列表（10000 项全部渲染）：
//   DOM 节点: 10000 个  → 内存高、渲染慢
//
// 虚拟滚动（只渲染可见的 ~20 项）：
//   ┌──────────────┐
//   │ 缓冲区 (5项)  │ ← 即将滚入视野
//   │ ════════════ │
//   │ 可见区 (10项) │ ← 用户看到的
//   │ ════════════ │
//   │ 缓冲区 (5项)  │ ← 刚滚出视野
//   └──────────────┘
//   DOM 节点: ~20 个   → 内存低、渲染快

// requestIdleCallback — 在浏览器空闲时执行低优先级任务
function processBackgroundTasks(tasks) {
  function doWork(deadline) {
    while (deadline.timeRemaining() > 0 && tasks.length > 0) {
      const task = tasks.shift();
      task();
    }
    if (tasks.length > 0) {
      requestIdleCallback(doWork);
    }
  }
  requestIdleCallback(doWork);
}

// 示例：空闲时预加载缩略图
const thumbnailTasks = fileList.map(file => () => {
  preloadThumbnail(file);
});
processBackgroundTasks(thumbnailTasks);
```

---

## 内存诊断

### Chrome DevTools Memory 面板

Electron 内置了完整的 Chrome DevTools，是诊断内存问题的首选工具：

```
打开方式：
  开发时: win.webContents.openDevTools()
  运行时: Ctrl+Shift+I (Windows/Linux) 或 Cmd+Option+I (macOS)

Memory 面板功能：

  ┌─────────────────────────────────────────────────────┐
  │  Memory                                              │
  │                                                      │
  │  ○ Heap snapshot      — 堆快照，查看内存中所有对象   │
  │  ○ Allocation timeline — 分配时间线，发现分配高峰    │
  │  ○ Allocation sampling — 采样，找出分配热点函数      │
  │                                                      │
  │  诊断步骤：                                          │
  │  1. 拍摄快照 A（操作前）                             │
  │  2. 执行怀疑有泄漏的操作                             │
  │  3. 拍摄快照 B（操作后）                             │
  │  4. 对比两次快照，找增长的对象                       │
  └─────────────────────────────────────────────────────┘
```

### process.memoryUsage() 监控

```js
// main.js — 定期上报内存使用
function logMemory(label) {
  const mem = process.memoryUsage();
  console.log(`[Memory:${label}]`, {
    rss: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`,       // 常驻内存
    heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`, // V8 堆已用
    heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`, // V8 堆总量
    external: `${(mem.external / 1024 / 1024).toFixed(1)} MB`,  // C++ 对象
  });
}

// 定期检测
setInterval(() => logMemory('periodic'), 30000);

// 关键节点检测
app.on('ready', () => logMemory('app-ready'));
app.on('browser-window-created', () => logMemory('window-created'));
```

渲染进程也可以监控：

```js
// renderer.js — 使用 Performance API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'measure') {
      console.log(`${entry.name}: ${entry.duration.toFixed(1)}ms`);
    }
  }
});
observer.observe({ entryTypes: ['measure'] });

// 监控内存（需要开启 performance.measureUserAgentSpecificMemory）
async function checkRendererMemory() {
  if (performance.measureUserAgentSpecificMemory) {
    const result = await performance.measureUserAgentSpecificMemory();
    console.log('渲染进程内存:', (result.bytes / 1024 / 1024).toFixed(1), 'MB');
  }
}
```

### 常见内存泄漏模式

```
┌──────────────────────────────────────────────────────────────┐
│                  常见内存泄漏模式                             │
│                                                              │
│  1. 事件监听未移除                                           │
│     ┌──────────────────────────────────────────────┐        │
│     │ // ❌ 泄漏：每次调用都新增监听器             │        │
│     │ function setup() {                            │        │
│     │   ipcMain.on('data', handler);  // 累积!     │        │
│     │ }                                             │        │
│     │                                               │        │
│     │ // ✅ 修复：先移除再添加，或用 once           │        │
│     │ function setup() {                            │        │
│     │   ipcMain.removeListener('data', handler);   │        │
│     │   ipcMain.on('data', handler);               │        │
│     │ }                                             │        │
│     └──────────────────────────────────────────────┘        │
│                                                              │
│  2. 闭包持有大对象                                           │
│     ┌──────────────────────────────────────────────┐        │
│     │ // ❌ 泄漏：闭包持有 largeData 引用          │        │
│     │ function processFile(path) {                  │        │
│     │   const largeData = fs.readFileSync(path);   │        │
│     │   return () => {                              │        │
│     │     // 即使只用 largeData.length              │        │
│     │     return largeData.length; // 但整个对象被持有│       │
│     │   };                                          │        │
│     │ }                                             │        │
│     │                                               │        │
│     │ // ✅ 修复：只保留需要的值                    │        │
│     │ function processFile(path) {                  │        │
│     │   const largeData = fs.readFileSync(path);   │        │
│     │   const size = largeData.length;             │        │
│     │   // largeData 可被 GC 回收                  │        │
│     │   return () => size;                          │        │
│     │ }                                             │        │
│     └──────────────────────────────────────────────┘        │
│                                                              │
│  3. BrowserWindow 未正确销毁                                 │
│     ┌──────────────────────────────────────────────┐        │
│     │ // ❌ 泄漏：窗口关闭但引用未释放              │        │
│     │ let settingsWindow = new BrowserWindow({...});│        │
│     │ // 窗口关闭后，settingsWindow 仍然引用已销毁对象│       │
│     │                                               │        │
│     │ // ✅ 修复：监听 closed 事件，置空引用        │        │
│     │ settingsWindow.on('closed', () => {          │        │
│     │   settingsWindow = null;                     │        │
│     │ });                                           │        │
│     └──────────────────────────────────────────────┘        │
│                                                              │
│  4. 定时器未清理                                             │
│     ┌──────────────────────────────────────────────┐        │
│     │ // ❌ 页面卸载但 setInterval 仍在运行         │        │
│     │ setInterval(pollServer, 5000);               │        │
│     │                                               │        │
│     │ // ✅ 修复：在适当时机清除                    │        │
│     │ const timer = setInterval(pollServer, 5000); │        │
│     │ window.addEventListener('beforeunload', () => │       │
│     │   clearInterval(timer);                       │        │
│     │ });                                           │        │
│     └──────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

---

## 性能分析工具

### 1. Chrome Tracing

Chrome Tracing 是最底层的性能分析工具，可以捕获 Chromium 内核的所有事件：

```
使用方式：
  1. 在 Electron 中打开: chrome://tracing
  2. 点击 Record → 选择分类 → 操作应用 → Stop
  3. 分析时间线

  ┌─────────────────────────────────────────────────┐
  │  chrome://tracing 时间线                         │
  │                                                  │
  │  Browser Process  ┃████░░████░░░████░░░░░░      │
  │  GPU Process      ┃░░░░████░░░░░░████░░░░      │
  │  Renderer (pid)   ┃██████████░░░░░░██████      │
  │                   ┃                             │
  │  ─────────────────┃─────────────────────── t    │
  │                   0ms               500ms       │
  └─────────────────────────────────────────────────┘
```

### 2. Electron contentTracing 模块

用代码控制追踪，适合自动化性能分析：

```js
const { contentTracing } = require('electron');

async function traceStartup() {
  // 开始追踪
  await contentTracing.startRecording({
    included_categories: ['*'],  // 追踪所有分类
    // 或精确指定：['v8', 'blink', 'cc', 'gpu']
  });

  // ... 执行需要分析的操作 ...

  // 停止追踪，保存文件
  const path = await contentTracing.stopRecording();
  console.log('追踪文件已保存到:', path);
  // 在 chrome://tracing 中打开此文件分析
}

app.whenReady().then(traceStartup);
```

### 3. Performance Observer API（渲染进程）

```js
// renderer.js — 监控长任务
const longTaskObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // 超过 50ms 的任务被视为 "长任务"
    console.warn(`⚠️ 长任务检测: ${entry.duration.toFixed(1)}ms`, entry);
  }
});
longTaskObserver.observe({ entryTypes: ['longtask'] });

// 监控自定义性能指标
performance.mark('render-start');
// ... 渲染操作 ...
performance.mark('render-end');
performance.measure('渲染耗时', 'render-start', 'render-end');
```

### 4. 主进程性能追踪

```js
// main.js — 用 perf_hooks 分析主进程
const { PerformanceObserver, performance } = require('perf_hooks');

const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`[Perf] ${entry.name}: ${entry.duration.toFixed(1)}ms`);
  });
});
obs.observe({ entryTypes: ['measure'] });

// 包装 IPC handler，自动测量耗时
function measuredHandle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    performance.mark(`${channel}-start`);
    const result = await handler(event, ...args);
    performance.mark(`${channel}-end`);
    performance.measure(channel, `${channel}-start`, `${channel}-end`);
    return result;
  });
}

// 使用
measuredHandle('db:query', async (event, sql) => {
  return db.prepare(sql).all();
});
```

---

## 常见问题

### 1. 应用启动慢（> 5 秒）

```
排查清单：
  □ 是否在启动时加载了大型原生模块？  → 延迟加载
  □ 是否在 main.js 顶部 require 了很多模块？ → 按需 import
  □ 渲染页面是否加载了大型 JS bundle？ → 代码分割
  □ 是否在 ready 事件前做了网络请求？ → 移到 ready 之后
  □ 是否启用了复杂的 DevTools 扩展？ → 生产环境移除
```

### 2. 应用越用越卡

```
通常是内存泄漏。排查步骤：
  1. 打开 DevTools → Memory → 拍摄 Heap Snapshot
  2. 正常使用应用 5 分钟
  3. 再拍一次 Heap Snapshot
  4. 对比两次快照，按 "Retained Size" 排序
  5. 找到增长最大的对象类型

  常见原因：
  • 事件监听器累积（检查 MaxListenersExceededWarning）
  • WebContents 未销毁
  • 全局缓存无上限增长 → 加 LRU 策略
```

### 3. IPC 通信感觉慢

```
IPC 性能参考：
  单次 invoke 往返: ~0.1-0.5ms（小数据）
  传输 1MB 数据:    ~5-10ms（需要序列化）
  传输 100MB 数据:  ~500ms+（应该避免）

优化方向：
  • 批量化请求（减少往返次数）
  • 减小传输数据体积（只传必要字段）
  • 大文件传路径而非内容（让对方进程自行读取）
  • 使用 MessagePort 建立直连通道（避免主进程中转）
```

### 4. 渲染进程内存持续增长

```
渲染进程是 Chromium 页面，Web 端的内存问题同样适用：
  • 未解绑的事件监听（addEventListener 无对应 remove）
  • 游离 DOM 节点（JS 仍引用已移除的 DOM 元素）
  • 闭包捕获大作用域
  • console.log 保留对象引用（生产环境应移除）
```

---

## 实践建议

```
┌──────────────────────────────────────────────────────────────┐
│              Electron 性能优化最佳实践                        │
│                                                              │
│  ── 启动优化 ──                                              │
│  1. 延迟加载非必要模块（最重要的一条！）                      │
│     只在 main.js 顶部 require 创建窗口所必需的模块            │
│                                                              │
│  2. 使用 show: false + ready-to-show                         │
│     消除白屏闪烁，提升感知速度                                │
│                                                              │
│  3. 渲染进程代码做代码分割                                    │
│     首屏只加载必要的 JS，其余懒加载                           │
│                                                              │
│  ── 运行时优化 ──                                            │
│  4. 永远不要阻塞主进程                                       │
│     CPU 密集任务 → Worker Thread 或 Utility Process           │
│     大文件操作 → 流式处理                                     │
│                                                              │
│  5. IPC 通信批量化                                           │
│     合并多次小请求为一次批量请求                              │
│     大数据传路径，不传内容                                    │
│                                                              │
│  6. 渲染进程遵循 Web 性能最佳实践                             │
│     虚拟滚动、防抖节流、requestIdleCallback                   │
│                                                              │
│  ── 内存管理 ──                                              │
│  7. 窗口关闭时置空引用                                       │
│     win.on('closed', () => { win = null; })                  │
│                                                              │
│  8. 事件监听成对出现                                          │
│     on ↔ removeListener，确保生命周期对称                     │
│                                                              │
│  ── 度量与监控 ──                                            │
│  9. 建立性能基线                                              │
│     记录启动时间、内存占用，作为优化参照                      │
│                                                              │
│ 10. CI 性能回归检测                                           │
│     在 CI 中运行性能测试，启动时间超阈值则报警                 │
│                                                              │
│  Electron 官方的 8 条建议总结:                                │
│  ① 谨慎引入模块  ② 不要过早加载代码  ③ 不要阻塞主进程        │
│  ④ 不要阻塞渲染进程  ⑤ 不要用 polyfill  ⑥ 不要发无必要的网络请求│
│  ⑦ 不要打包不需要的资源  ⑧ 使用正确的工具分析性能              │
└──────────────────────────────────────────────────────────────┘
```

---

**下一章**：我们将学习如何为 Electron 应用进行代码签名、公证和生产发布 →
