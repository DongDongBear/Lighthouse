# 第十二章：原生模块与跨平台开发

## 目录

- [跨平台差异全景](#跨平台差异全景)
- [文件路径与系统目录](#文件路径与系统目录)
- [快捷键差异与 CmdOrCtrl](#快捷键差异与-cmdorctrl)
- [原生模块](#原生模块)
- [平台特有功能](#平台特有功能)
- [条件编码模式](#条件编码模式)
- [跨平台 CI 构建矩阵](#跨平台-ci-构建矩阵)
- [常见跨平台坑位对照表](#常见跨平台坑位对照表)
- [实践建议](#实践建议)
- [本章小结](#本章小结)

---

## 跨平台差异全景

Electron 号称"一次编写，三端运行"，但三个操作系统在窗口行为、系统集成上有显著差异，不处理好这些差异，应用在某个平台上就会显得格格不入。

```
┌──────────────────────────────────────────────────────────────┐
│             macOS vs Windows vs Linux 核心差异                 │
│                                                              │
│  维度            macOS          Windows        Linux         │
│  ──────────────────────────────────────────────────────────  │
│  关闭窗口        应用继续运行    应用退出       应用退出      │
│  应用生命周期    Dock 常驻       任务栏 + 托盘  依桌面环境    │
│  菜单栏          屏幕顶部全局    窗口内部       窗口内部      │
│  通知            通知中心        Toast          libnotify     │
│  文件路径分隔    /              \              /             │
│  快捷键修饰符    Cmd (⌘)        Ctrl           Ctrl          │
│  托盘图标        菜单栏图标      系统托盘       系统托盘      │
│  窗口圆角        系统自带        无             依主题        │
└──────────────────────────────────────────────────────────────┘
```

### 窗口关闭 ≠ 退出：macOS 的特殊行为

macOS 用户习惯关闭所有窗口后应用仍在 Dock 中运行，点击 Dock 图标可以重新打开窗口。Windows 和 Linux 用户则期望关闭最后一个窗口等于退出应用。

```
macOS:   窗口关闭 → 应用仍在 Dock → 点击 Dock → 重新创建窗口
Win/Lin: 窗口关闭 → 应用完全退出（进程结束）
```

```js
// main.js — 标准跨平台窗口关闭处理
app.on('window-all-closed', () => {
  // macOS：不退出应用，保持 Dock 图标
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS：点击 Dock 图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### Dock vs 任务栏 vs 系统托盘

```
┌──────────────────────────────────────────────────────────────┐
│              系统托盘 / Dock 行为差异                          │
│                                                              │
│  macOS:                                                      │
│  • 菜单栏右侧 Tray 图标，建议用 Template Image（适配深色）   │
│  • Dock 图标常驻，可设置右键菜单和角标                        │
│  • 图标尺寸：16x16 @2x                                      │
│                                                              │
│  Windows:                                                    │
│  • 托盘在右下角，左键/右键均可触发菜单                        │
│  • 图标格式 .ico，尺寸 16x16 / 32x32                        │
│  • 支持气泡通知（balloon）和双击事件                          │
│                                                              │
│  Linux:                                                      │
│  • 托盘行为取决于桌面环境（GNOME / KDE / XFCE）              │
│  • GNOME 默认隐藏托盘图标，需安装 AppIndicator 扩展          │
│  • 建议同时提供任务栏入口作为后备                             │
└──────────────────────────────────────────────────────────────┘
```

```js
// 跨平台托盘图标
function createTray() {
  let iconPath;
  if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'assets/tray-iconTemplate.png');
  } else if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'assets/tray-icon.ico');
  } else {
    iconPath = path.join(__dirname, 'assets/tray-icon.png');
  }

  const tray = new Tray(iconPath);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]));

  // Windows：双击托盘图标显示窗口
  if (process.platform === 'win32') {
    tray.on('double-click', () => mainWindow.show());
  }
}
```

---

## 文件路径与系统目录

不同操作系统将用户数据、缓存、日志存放在完全不同的位置。硬编码路径是跨平台的大忌，必须使用 `app.getPath()`。

```
┌──────────────────────────────────────────────────────────────┐
│       app.getPath() 在三平台上的实际路径                       │
│                                                              │
│  参数       macOS                     Windows                │
│  ────────────────────────────────────────────────────────    │
│  userData  ~/Library/App Support/X    AppData\Roaming\X      │
│  temp      /var/folders/.../T/        AppData\Local\Temp     │
│  desktop   ~/Desktop                  ~\Desktop              │
│  documents ~/Documents                ~\Documents            │
│  downloads ~/Downloads                ~\Downloads            │
│  logs      ~/Library/Logs/X           AppData\Roaming\X\logs │
│  cache     ~/Library/Caches/X         AppData\Local\X\Cache  │
│                                                              │
│  参数       Linux                                            │
│  ────────────────────────────────────────────────────────    │
│  userData  ~/.config/X                                        │
│  temp      /tmp                                              │
│  logs      ~/.config/X/logs                                  │
│  cache     ~/.cache/X                                        │
└──────────────────────────────────────────────────────────────┘
```

```js
// 正确做法：始终用 app.getPath
const dbPath = path.join(app.getPath('userData'), 'data.db');
const logPath = path.join(app.getPath('logs'), 'app.log');

// 错误做法 ❌ — 硬编码路径
const dbPath = '/Users/xxx/Library/Application Support/MyApp/data.db';
```

### 路径分隔符

```
Windows 使用反斜杠 \，macOS/Linux 使用正斜杠 /

  // 错误 ❌
  const filePath = baseDir + '\\config\\settings.json';

  // 正确 ✅
  const filePath = path.join(baseDir, 'config', 'settings.json');

  注意：URL 协议始终使用正斜杠，即使在 Windows 上
  file:///C:/Users/xxx/app/index.html   ✅
  file:///C:\Users\xxx\app\index.html   ❌
```

---

## 快捷键差异与 CmdOrCtrl

macOS 用 `Cmd (⌘)` 作为主修饰键，Windows/Linux 用 `Ctrl`。Electron 提供 `CmdOrCtrl` 修饰符来统一处理。

```
┌──────────────────────────────────────────────────────────────┐
│              快捷键映射关系                                    │
│                                                              │
│  功能        macOS          Windows / Linux                  │
│  ──────────────────────────────────────────────────────      │
│  复制        Cmd+C          Ctrl+C                           │
│  保存        Cmd+S          Ctrl+S                           │
│  撤销        Cmd+Z          Ctrl+Z                           │
│  设置        Cmd+,          Ctrl+,                           │
│  退出        Cmd+Q          Alt+F4                           │
│  隐藏        Cmd+H          无对应                           │
│                                                              │
│  Electron 方案：                                              │
│  'CmdOrCtrl+S' → macOS 映射 Cmd+S，其他平台映射 Ctrl+S      │
└──────────────────────────────────────────────────────────────┘
```

```js
// 菜单中使用 accelerator
const menuTemplate = [
  {
    label: '文件',
    submenu: [
      { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => saveFile() },
      { label: '另存为', accelerator: 'CmdOrCtrl+Shift+S', click: () => saveFileAs() },
    ],
  },
];

// macOS 特有菜单：应用名称菜单（第一个菜单项）
if (process.platform === 'darwin') {
  menuTemplate.unshift({
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'hide' },         // Cmd+H（macOS 独有）
      { role: 'hideOthers' },   // Cmd+Opt+H
      { type: 'separator' },
      { role: 'quit' },         // Cmd+Q
    ],
  });
}

// 全局快捷键
globalShortcut.register('CmdOrCtrl+Shift+I', () => {
  mainWindow.webContents.toggleDevTools();
});
```

```
其他修饰符映射：

  CmdOrCtrl    macOS → Cmd     Win/Linux → Ctrl
  Alt          macOS → Option  Win/Linux → Alt
  Super/Meta   macOS → Cmd     Win/Linux → Win 键
```

---

## 原生模块

### 什么时候需要原生模块

Electron 运行在 Node.js 之上，大部分逻辑用 JS 就能完成。但有些场景必须使用 C/C++ 编写的原生模块：

```
┌──────────────────────────────────────────────────────────────┐
│              何时需要原生模块                                  │
│                                                              │
│  场景                           典型模块                     │
│  ──────────────────────────────────────────────              │
│  嵌入式数据库（高性能 SQLite）    better-sqlite3              │
│  系统密钥链 / 凭据管理           keytar                      │
│  终端模拟器                      node-pty                    │
│  串口通信                        serialport                  │
│  系统级文件监听                   fsevents (macOS)            │
│  图像处理                        sharp                       │
│  硬件访问（USB / HID）           node-hid、usb               │
│  操作系统 API 调用               ffi-napi、edge-js           │
│                                                              │
│  判断原则：                                                  │
│  ✓ JS 性能不够 / 需调用 OS C API → 用原生模块               │
│  ✗ 有纯 JS 替代方案且性能可接受 → 优先用 JS                  │
└──────────────────────────────────────────────────────────────┘
```

### 原生模块技术栈演进

```
┌──────────────────────────────────────────────────────────────┐
│          Node.js 原生模块技术栈                               │
│                                                              │
│  时代      技术              特点                             │
│  ──────────────────────────────────────────────              │
│  早期      NAN               V8 API 直接调用，每个 Node      │
│                              版本都要重新编译，维护成本高     │
│                                                              │
│  过渡      node-addon-api    NAN 的 C++ 友好封装             │
│                              仍需针对版本编译                 │
│                                                              │
│  现在      N-API (推荐)      ABI 稳定，跨版本兼容            │
│                              编译一次，多版本运行             │
│                                                              │
│  N-API 的核心优势：                                          │
│  传统：源码 → 编译 for Node18 / Node20 / Node22（各一份）    │
│  N-API：源码 → 编译一次 → addon.node → 全版本通用           │
└──────────────────────────────────────────────────────────────┘
```

### electron-rebuild — 解决 ABI 兼容问题

Electron 内置的 Node.js 与系统 Node.js 的 ABI 不同。直接 `npm install` 的原生模块是针对系统 Node 编译的，在 Electron 中会崩溃。

```
┌──────────────────────────────────────────────────────────────┐
│             为什么需要 electron-rebuild                        │
│                                                              │
│  npm install better-sqlite3                                  │
│       │                                                      │
│       ▼                                                      │
│  用系统 Node (v20) 头文件编译 → ABI = Node v20               │
│       │                                                      │
│       ▼                                                      │
│  Electron 加载时：                                            │
│  ┌──────────────────────────────────────────┐                │
│  │  Error: The module was compiled against  │                │
│  │  a different Node.js version using       │                │
│  │  NODE_MODULE_VERSION 115. This version   │                │
│  │  requires NODE_MODULE_VERSION 119.       │                │
│  └──────────────────────────────────────────┘                │
│                                                              │
│  解决：npx electron-rebuild                                  │
│  → 用 Electron 内置 Node 的头文件重新编译 → ✅ 加载成功      │
└──────────────────────────────────────────────────────────────┘
```

```bash
# 安装
npm install -D @electron/rebuild

# 每次安装原生模块后执行
npx electron-rebuild

# 推荐：在 package.json 中自动化
# "scripts": { "postinstall": "electron-rebuild" }

# 仅重新编译指定模块
npx electron-rebuild --only better-sqlite3
```

```
构建工具集成：

  Electron Forge → 打包时自动 rebuild，无需额外配置
  electron-builder → 自带 rebuild（npmRebuild: true）
```

### 常见原生模块一览

```
┌───────────────────┬─────────────────────────────────────────┐
│ 模块              │ 用途                                     │
├───────────────────┼─────────────────────────────────────────┤
│ better-sqlite3    │ 同步 SQLite，本地数据库首选              │
│ keytar            │ 系统密钥链（Keychain / Credential Vault）│
│ node-pty          │ 伪终端，内置终端模拟器                   │
│ sharp             │ 高性能图像处理（缩放、裁剪、转格式）     │
│ serialport        │ 串口通信，IoT 设备连接                   │
│ node-hid          │ USB HID 设备访问                         │
│ fsevents          │ macOS 高效文件监听                       │
│ robotjs           │ 模拟鼠标键盘操作                         │
└───────────────────┴─────────────────────────────────────────┘
```

---

## 平台特有功能

### macOS：Touch Bar

MacBook Pro 的 Touch Bar 可以显示自定义控件（注意：新款 MacBook 已移除，但存量设备仍多）。

```js
const { TouchBar } = require('electron');
const { TouchBarButton, TouchBarSpacer } = TouchBar;

const playBtn = new TouchBarButton({
  label: '▶ 播放',
  backgroundColor: '#4CAF50',
  click: () => mainWindow.webContents.send('transport', 'play'),
});
const stopBtn = new TouchBarButton({
  label: '⏹ 停止',
  click: () => mainWindow.webContents.send('transport', 'stop'),
});

mainWindow.setTouchBar(new TouchBar({
  items: [playBtn, new TouchBarSpacer({ size: 'small' }), stopBtn],
}));
```

### macOS：Dock 菜单与角标

```js
if (process.platform === 'darwin') {
  app.dock.setMenu(Menu.buildFromTemplate([
    { label: '新建窗口', click: () => createWindow() },
  ]));
  app.dock.setBadge('3');              // 角标显示未读数
  app.dock.bounce('informational');    // 弹跳一次吸引注意
}
```

### Windows：缩略图工具栏（Thumbnail Toolbar）

任务栏预览窗口中显示操作按钮，适合音乐播放器等场景。

```js
if (process.platform === 'win32') {
  mainWindow.setThumbarButtons([
    {
      tooltip: '上一曲',
      icon: nativeImage.createFromPath('assets/prev.png'),
      click: () => mainWindow.webContents.send('transport', 'prev'),
    },
    {
      tooltip: '播放',
      icon: nativeImage.createFromPath('assets/play.png'),
      click: () => mainWindow.webContents.send('transport', 'play'),
    },
    {
      tooltip: '下一曲',
      icon: nativeImage.createFromPath('assets/next.png'),
      click: () => mainWindow.webContents.send('transport', 'next'),
    },
  ]);
}
```

### Windows：Jump List（跳转列表）

任务栏右键菜单，显示最近文件和自定义任务。

```js
if (process.platform === 'win32') {
  app.setJumpList([
    {
      type: 'custom',
      name: '最近的项目',
      items: [
        { type: 'task', title: '打开项目 A',
          program: process.execPath, args: '--open-project=a' },
      ],
    },
    {
      type: 'custom',
      name: '快捷操作',
      items: [
        { type: 'task', title: '新建窗口',
          program: process.execPath, args: '--new-window' },
      ],
    },
  ]);
}
```

### Windows：Toast 通知 & 进度条

```js
// Windows 10+ 需要设置 AppUserModelID 才能正常显示通知
if (process.platform === 'win32') {
  app.setAppUserModelId('com.mycompany.myapp');
}

new Notification({
  title: '下载完成',
  body: '文件已保存到下载文件夹',
  icon: path.join(__dirname, 'assets/icon.png'),
}).show();

// 任务栏进度条（Windows & macOS 均支持）
mainWindow.setProgressBar(0.5);    // 50%
mainWindow.setProgressBar(-1);     // 移除
```

### Linux：Unity Launcher & libnotify

```js
// Ubuntu Unity / GNOME 启动器角标
if (process.platform === 'linux') {
  app.setBadgeCount(5);  // 需要 .desktop 文件注册
}
```

```
Linux 通知系统：

  Electron Notification API → libnotify → 桌面通知守护进程

  注意事项：
  • 必须安装 libnotify-bin
  • 某些桌面环境样式差异大
  • 部分功能（action button）不一定支持
```

---

## 条件编码模式

### process.platform 分支

```js
// 模式一：简单 if 分支
if (process.platform === 'darwin') { /* macOS */ }
else if (process.platform === 'win32') { /* Windows */ }
else { /* Linux */ }

// 模式二：布尔常量（推荐，代码更清晰）
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const isLinux = process.platform === 'linux';

const menuTemplate = [
  ...(isMac ? [{ label: app.getName(), submenu: [{ role: 'about' }] }] : []),
  {
    label: '文件',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  },
];
```

### 平台特定文件模式

当平台差异代码较多时，拆分到独立文件中：

```
src/main/platform/
├── index.js          # 根据平台加载对应文件
├── darwin.js         # macOS 专属
├── win32.js          # Windows 专属
└── linux.js          # Linux 专属
```

```js
// platform/index.js — 统一导出
module.exports = require(`./${process.platform}`);

// platform/darwin.js
module.exports = {
  setupSystemIntegration(mainWindow) {
    const { app, Menu } = require('electron');
    app.dock.setMenu(Menu.buildFromTemplate([
      { label: '新建窗口', click: () => { /* ... */ } },
    ]));
  },
};

// platform/win32.js
module.exports = {
  setupSystemIntegration(mainWindow) {
    const { app } = require('electron');
    app.setAppUserModelId('com.mycompany.myapp');
    // Jump List、Thumbnail Toolbar 等
  },
};

// main/index.js — 使用
const platform = require('./platform');
platform.setupSystemIntegration(mainWindow);
```

### 选择性依赖

```js
// 某些原生模块只在特定平台有效（如 fsevents 仅 macOS）
// package.json: "optionalDependencies": { "fsevents": "^2.3.3" }

let fsevents;
try {
  fsevents = require('fsevents');
} catch {
  // 非 macOS 平台，静默忽略
}
```

---

## 跨平台 CI 构建矩阵

使用 GitHub Actions 的 matrix 策略在三个平台上同时构建和测试：

```yaml
# .github/workflows/build.yml
name: Build & Test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    strategy:
      fail-fast: false   # 一个平台失败不影响其他平台继续
      matrix:
        include:
          - os: macos-latest
            platform: mac
          - os: windows-latest
            platform: win
          - os: ubuntu-latest
            platform: linux

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      # Linux 安装原生模块编译依赖
      - name: 安装 Linux 构建依赖
        if: matrix.platform == 'linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libnotify-dev \
            libnss3 libxss1 libasound2-dev

      - run: npx electron-rebuild
        name: Rebuild 原生模块

      - run: npx vitest run
        name: 单元测试

      # E2E（Linux 需要 xvfb）
      - name: E2E 测试 (Linux)
        if: matrix.platform == 'linux'
        run: xvfb-run --auto-servernum npm run test:e2e

      - name: E2E 测试 (macOS / Windows)
        if: matrix.platform != 'linux'
        run: npm run test:e2e

      - name: 构建应用
        run: npx electron-builder --${{ matrix.platform }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/upload-artifact@v4
        with:
          name: dist-${{ matrix.platform }}
          path: dist/*.{dmg,exe,AppImage,deb}
```

```
构建矩阵执行流程：

  git push / PR
       │
       ▼
  ┌──────────────────────────────────────────────────────┐
  │  GitHub Actions — 三平台并行                          │
  │                                                      │
  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
  │  │ macOS      │  │ Windows    │  │ Linux      │    │
  │  │ npm ci     │  │ npm ci     │  │ npm ci     │    │
  │  │ rebuild    │  │ rebuild    │  │ apt-get    │    │
  │  │ test       │  │ test       │  │ rebuild    │    │
  │  │ build      │  │ build      │  │ xvfb test  │    │
  │  │ → .dmg     │  │ → .exe     │  │ → .AppImage│    │
  │  └────────────┘  └────────────┘  └────────────┘    │
  │                                                      │
  │  ✅ 三平台全部通过 → 合并 PR / 发布                    │
  │  ❌ 任一平台失败 → 阻止合并                           │
  └──────────────────────────────────────────────────────┘
```

### 交叉编译注意事项

```
原生模块无法交叉编译！

  ❌ 在 macOS 上编译 Windows 的 .node 文件
  ❌ 在 Linux 上编译 macOS 的 .node 文件

  原因：原生模块需要目标平台的编译工具链和头文件

  解决方案：
  1. CI 矩阵 — 在每个平台上分别构建（推荐）
  2. prebuild — 预编译二进制，npm install 时自动下载
     better-sqlite3、sharp 等已提供 prebuild
  3. Docker — Linux 交叉编译不同架构（x86_64 / arm64）
```

---

## 常见跨平台坑位对照表

```
┌─────────────────────────────────────────────────────────────────┐
│                  跨平台常见坑位对照表                             │
│                                                                 │
│  坑位              表现                    解决方案              │
│  ───────────────────────────────────────────────────────────    │
│  路径分隔符        Win 用 \ 其他用 /       path.join/resolve    │
│  文件名大小写      macOS/Win 不敏感        统一小写，CI 跑 Lin  │
│  行尾符号          Win: CRLF 其他: LF      .gitattributes eol=lf│
│  窗口关闭行为      macOS 关闭不退出        window-all-closed    │
│  菜单栏位置        macOS 屏幕顶部          unshift 应用名称菜单 │
│  快捷键            macOS: Cmd 其他: Ctrl   CmdOrCtrl 统一       │
│  原生模块 ABI      Electron ≠ 系统 Node    electron-rebuild     │
│  托盘图标格式      macOS: Template PNG     按平台提供不同图标   │
│                    Win: .ico Lin: PNG                            │
│  通知 API          三平台底层不同          Electron Notification│
│  文件权限          Win chmod 无效          平台分支处理         │
│  Shell 命令        Win: cmd/PS 其他: sh    cross-env 等工具     │
│  字体渲染          三平台差异大            避免依赖特定字体     │
│  开机自启          各平台方式不同          setLoginItemSettings │
│  拖放文件路径      Win 返回 \              path.normalize       │
│  系统代理          三平台配置不同          session.setProxy     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 实践建议

```
┌──────────────────────────────────────────────────────────────┐
│          原生模块与跨平台开发最佳实践                          │
│                                                              │
│  1. 从第一天就在三平台上测试                                  │
│     不要等到发布前才在 Windows/Linux 上跑一下                 │
│     CI 矩阵是最低成本的三平台覆盖方案                        │
│                                                              │
│  2. 绝对不要硬编码路径                                       │
│     用 path.join / path.resolve 拼接路径                     │
│     用 app.getPath() 获取系统目录                            │
│                                                              │
│  3. 统一使用 CmdOrCtrl                                       │
│     菜单 accelerator 和全局快捷键都用 CmdOrCtrl              │
│     不要写死 Cmd 或 Ctrl                                     │
│                                                              │
│  4. 原生模块必须 electron-rebuild                            │
│     在 postinstall 脚本中自动执行                            │
│     CI 中也要执行 rebuild                                    │
│     优先选择提供 prebuild 的模块                             │
│                                                              │
│  5. 平台逻辑集中管理                                         │
│     小差异用 process.platform 三元表达式                     │
│     大差异抽到 platform/ 目录的独立文件                      │
│     避免平台判断散落在代码各处                                │
│                                                              │
│  6. 优先使用 Electron 跨平台 API                             │
│     Notification、dialog、Tray 等 API 已封装好差异           │
│     只在 API 不够用时才走平台分支                            │
│                                                              │
│  7. 原生模块选型原则                                         │
│     有纯 JS 方案 → 优先用纯 JS（零编译问题）                │
│     必须原生 → 选 N-API 实现（ABI 稳定）                    │
│     必须原生 → 选有 prebuild 的模块（免编译）                │
│                                                              │
│  8. .gitattributes 必须配置                                  │
│     * text=auto eol=lf                                       │
│     *.{png,ico,jpg} binary                                   │
│     避免行尾符号问题导致跨平台文件哈希不一致                  │
│                                                              │
│  9. 文件名大小写                                             │
│     macOS/Win 不区分大小写，Linux 区分                       │
│     import './MyComponent' 在 Linux 上可能找不到              │
│     统一使用 kebab-case 或全小写文件名                       │
│                                                              │
│  10. 无框窗口需三平台验证                                     │
│      titleBarStyle / titleBarOverlay 在各平台效果不同         │
│      macOS 的交通灯按钮、Windows 的系统按钮需分别处理         │
└──────────────────────────────────────────────────────────────┘
```

---

## 本章小结

```
┌──────────────────────────────────────────────────────────────┐
│                    本章核心要点                                │
│                                                              │
│  跨平台差异：                                                │
│  • macOS 关闭窗口 ≠ 退出，需处理 window-all-closed          │
│  • macOS 菜单在屏幕顶部，需 unshift 应用名称菜单             │
│  • 快捷键统一用 CmdOrCtrl                                    │
│  • 路径用 path.join + app.getPath，禁止硬编码                │
│                                                              │
│  原生模块：                                                  │
│  • OS 底层 API 或性能敏感场景才用原生模块                    │
│  • electron-rebuild 解决 ABI 不兼容                          │
│  • 优先选 N-API 实现 + prebuild 的模块                       │
│                                                              │
│  平台特有功能：                                              │
│  • macOS: Touch Bar、Dock 菜单与角标                         │
│  • Windows: Thumb Bar、Jump List、Toast 通知                 │
│  • Linux: Unity Launcher 角标、libnotify                     │
│                                                              │
│  条件编码：                                                  │
│  • 小差异 → process.platform 判断                            │
│  • 大差异 → platform/ 目录独立文件                           │
│                                                              │
│  CI 构建：                                                   │
│  • GitHub Actions matrix 覆盖三平台                          │
│  • 原生模块不能交叉编译，必须在目标平台构建                   │
└──────────────────────────────────────────────────────────────┘
```

---

**上一章**：签名、公证与生产发布 ←
