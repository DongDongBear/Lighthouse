# 第九章：自动化测试

## 目录

- [Electron 测试分层](#electron-测试分层)
- [单元测试：Vitest 测试纯逻辑](#单元测试vitest-测试纯逻辑)
- [E2E 测试：WebdriverIO（官方推荐）](#e2e-测试webdriverio官方推荐)
- [E2E 测试：Playwright（备选方案）](#e2e-测试playwright备选方案)
- [CI 集成：GitHub Actions](#ci-集成github-actions)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## Electron 测试分层

Electron 应用横跨主进程、preload 脚本和渲染进程，测试策略需要分层覆盖：

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron 测试金字塔                        │
│                                                              │
│                        ╱╲                                    │
│                       ╱  ╲         E2E 测试                  │
│                      ╱ E2E╲        完整应用交互               │
│                     ╱      ╲       数量少，运行慢             │
│                    ╱────────╲                                 │
│                   ╱          ╲     集成测试                   │
│                  ╱  集成测试   ╲    IPC 通信、多进程协作        │
│                 ╱              ╲   数量中等                   │
│                ╱────────────────╲                             │
│               ╱                  ╲  单元测试                  │
│              ╱     单元测试       ╲  纯逻辑函数               │
│             ╱                      ╲ 数量多，运行快           │
│            ╱────────────────────────╲                         │
│                                                              │
│  测试层级          目标                    工具               │
│  ─────────────────────────────────────────────────           │
│  单元测试          工具函数、数据处理       Vitest / Jest      │
│  集成测试          IPC 通信、preload 桥接   Vitest + mock      │
│  E2E 测试          完整用户交互流程         WebdriverIO / PW   │
└──────────────────────────────────────────────────────────────┘
```

### 每层测什么

```
单元测试 — 不需要启动 Electron：
  ✓ 工具函数（路径处理、数据转换、校验逻辑）
  ✓ 状态管理逻辑（store、reducer）
  ✓ preload 脚本中的纯函数部分

集成测试 — 可能需要 mock Electron API：
  ✓ IPC handler 的请求-响应逻辑
  ✓ preload 暴露的 API 是否正确桥接
  ✓ 数据库操作（SQLite 读写）

E2E 测试 — 启动完整应用：
  ✓ 窗口是否正确创建和显示
  ✓ 菜单点击后的行为
  ✓ 用户操作完整流程（打开文件 → 编辑 → 保存）
  ✓ 对话框交互、系统托盘行为
```

---

## 单元测试：Vitest 测试纯逻辑

### 为什么选 Vitest

Vitest 基于 Vite，启动快、配置简单，天然支持 ESM 和 TypeScript，非常适合 Electron 项目中的纯逻辑测试。

### 安装与配置

```bash
npm install -D vitest
```

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试文件匹配模式
    include: ['src/**/*.test.{js,ts}', 'tests/unit/**/*.test.{js,ts}'],
    // 运行环境 — 主进程逻辑用 node，渲染进程逻辑用 jsdom
    environment: 'node',
  },
});
```

### 测试主进程工具函数

```js
// src/main/utils.js — 被测代码
const path = require('path');

function sanitizePath(userInput) {
  // 防止路径穿越攻击
  const resolved = path.resolve(userInput);
  const appDir = path.resolve(__dirname, '../../data');
  if (!resolved.startsWith(appDir)) {
    throw new Error('路径越界');
  }
  return resolved;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

module.exports = { sanitizePath, formatFileSize };
```

```js
// tests/unit/utils.test.js — 测试代码
import { describe, it, expect } from 'vitest';
import { formatFileSize, sanitizePath } from '../../src/main/utils';

describe('formatFileSize', () => {
  it('格式化字节为可读单位', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });

  it('保留一位小数', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('sanitizePath', () => {
  it('拒绝路径穿越', () => {
    expect(() => sanitizePath('../../etc/passwd')).toThrow('路径越界');
  });
});
```

### 测试 preload 桥接逻辑

preload 脚本依赖 `electron` 模块，在单元测试中需要 mock：

```js
// tests/unit/preload.test.js
import { describe, it, expect, vi } from 'vitest';

// mock electron 模块
vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
  },
}));

import { contextBridge, ipcRenderer } from 'electron';

describe('preload 桥接', () => {
  it('应该通过 contextBridge 暴露 API', async () => {
    // 导入 preload 脚本，触发 exposeInMainWorld
    await import('../../src/preload/index.js');

    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'electronAPI',
      expect.objectContaining({
        openFile: expect.any(Function),
        saveFile: expect.any(Function),
      })
    );
  });

  it('openFile 应该调用正确的 IPC channel', async () => {
    await import('../../src/preload/index.js');

    // 获取暴露的 API 对象
    const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
    await exposedAPI.openFile();

    expect(ipcRenderer.invoke).toHaveBeenCalledWith('dialog:openFile');
  });
});
```

### 测试 IPC Handler（集成测试）

```js
// tests/integration/ipc-handlers.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock electron
vi.mock('electron', () => {
  const handlers = new Map();
  return {
    ipcMain: {
      handle: vi.fn((channel, handler) => {
        handlers.set(channel, handler);
      }),
      _getHandler: (channel) => handlers.get(channel),
    },
    dialog: {
      showOpenDialog: vi.fn(),
    },
    BrowserWindow: vi.fn(),
  };
});

import { ipcMain, dialog } from 'electron';
import { registerHandlers } from '../../src/main/ipc-handlers';

describe('IPC handlers', () => {
  beforeEach(() => {
    registerHandlers(); // 注册所有 handler
  });

  it('dialog:openFile 返回选中的文件路径', async () => {
    dialog.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/home/user/doc.txt'],
    });

    const handler = ipcMain._getHandler('dialog:openFile');
    const result = await handler({}, { filters: [] });

    expect(result).toEqual(['/home/user/doc.txt']);
  });

  it('dialog:openFile 用户取消时返回空', async () => {
    dialog.showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    const handler = ipcMain._getHandler('dialog:openFile');
    const result = await handler({});

    expect(result).toEqual([]);
  });
});
```

---

## E2E 测试：WebdriverIO（官方推荐）

WebdriverIO 搭配 `@wdio/electron-service` 是 Electron 官方文档当前推荐的 E2E 测试方案。

```
┌─────────────────────────────────────────────────────────────┐
│               WebdriverIO + Electron 架构                    │
│                                                              │
│  测试脚本 (Node.js)                                          │
│       │                                                      │
│       │  WebDriver 协议                                      │
│       ▼                                                      │
│  ┌──────────────┐     ChromeDriver     ┌──────────────────┐ │
│  │  WDIO Runner │ ◄──────────────────► │ Electron 应用     │ │
│  │              │                      │ (Chromium 内核)   │ │
│  │  断言 & 报告  │                      │                   │ │
│  └──────────────┘                      └──────────────────┘ │
│                                                              │
│  @wdio/electron-service 自动管理：                           │
│  • 启动/关闭 Electron 应用                                   │
│  • ChromeDriver 版本匹配                                     │
│  • 提供 browser.electron.* API                               │
└─────────────────────────────────────────────────────────────┘
```

### 安装配置

推荐使用交互式初始化：

```bash
npm init wdio@latest
# 选择 "Desktop Testing - of Electron Applications"
# 会自动安装 @wdio/electron-service 及相关依赖
```

手动安装：

```bash
npm install -D @wdio/cli @wdio/local-runner @wdio/mocha-framework \
  @wdio/spec-reporter @wdio/electron-service
```

### wdio.conf.js 配置

```js
// wdio.conf.js
export const config = {
  runner: 'local',
  framework: 'mocha',
  reporters: ['spec'],

  // 测试文件
  specs: ['./tests/e2e/**/*.spec.js'],

  // 使用 electron service
  services: ['electron'],

  // Electron 应用配置
  capabilities: [{
    browserName: 'electron',
    'wdio:electronServiceOptions': {
      // 指向你的应用入口
      appBinaryPath: './out/my-app-darwin-arm64/my-app.app/Contents/MacOS/my-app',
      // 或使用 appEntryPoint 直接从源码启动（开发模式）
      appEntryPoint: './src/main/index.js',
      appArgs: ['--no-sandbox'],
    },
  }],

  // Mocha 超时（Electron 启动较慢）
  mochaOpts: {
    timeout: 30000,
  },
};
```

### 基础 E2E 测试

```js
// tests/e2e/app.spec.js
describe('应用启动', () => {
  it('应该创建主窗口', async () => {
    // 获取窗口标题
    const title = await browser.getTitle();
    expect(title).toBe('我的 Electron 应用');
  });

  it('窗口尺寸应该正确', async () => {
    const { width, height } = await browser.getWindowSize();
    expect(width).toBeGreaterThanOrEqual(800);
    expect(height).toBeGreaterThanOrEqual(600);
  });

  it('应该显示欢迎信息', async () => {
    const heading = await $('h1');
    await expect(heading).toHaveText('欢迎使用');
  });
});
```

### 用 browser.electron API 访问 Electron 能力

`@wdio/electron-service` 提供了 `browser.electron` 命名空间，可以在测试中直接调用 Electron API：

```js
describe('Electron API 交互', () => {
  it('通过 execute 在主进程执行代码', async () => {
    // 在主进程中执行代码，获取 app 信息
    const appName = await browser.electron.execute((electron) => {
      return electron.app.getName();
    });
    expect(appName).toBe('my-app');
  });

  it('获取应用版本', async () => {
    const version = await browser.electron.execute((electron) => {
      return electron.app.getVersion();
    });
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('检查窗口数量', async () => {
    const windowCount = await browser.electron.execute((electron) => {
      return electron.BrowserWindow.getAllWindows().length;
    });
    expect(windowCount).toBe(1);
  });
});
```

### 测试菜单交互

```js
describe('应用菜单', () => {
  it('点击菜单项触发操作', async () => {
    // 通过 Electron API 模拟菜单点击
    await browser.electron.execute((electron) => {
      const menu = electron.Menu.getApplicationMenu();
      // 找到 "文件 → 新建" 菜单项并点击
      const fileMenu = menu.items.find(item => item.label === '文件');
      const newItem = fileMenu.submenu.items.find(item => item.label === '新建');
      newItem.click();
    });

    // 验证新建操作的效果
    const editor = await $('#editor');
    await expect(editor).toHaveText('');
  });
});
```

### 测试对话框

原生对话框（`dialog.showOpenDialog` 等）无法通过 UI 自动化直接操控，需要 mock：

```js
describe('文件对话框', () => {
  it('mock 打开文件对话框', async () => {
    // 在主进程中替换 dialog 实现
    await browser.electron.execute((electron) => {
      const { dialog } = electron;
      // 保存原始方法
      dialog._originalShowOpenDialog = dialog.showOpenDialog;
      // mock 返回值
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: ['/tmp/test-file.txt'],
      });
    });

    // 触发打开文件操作（点击按钮或菜单）
    const openBtn = await $('#open-file');
    await openBtn.click();

    // 验证文件内容已加载
    const content = await $('#file-content');
    await expect(content).toBeDisplayed();

    // 恢复原始实现
    await browser.electron.execute((electron) => {
      const { dialog } = electron;
      dialog.showOpenDialog = dialog._originalShowOpenDialog;
    });
  });
});
```

---

## E2E 测试：Playwright（备选方案）

Playwright 通过 `_electron.launch()` 直接启动 Electron 应用，不需要 WebDriver 协议中转，启动更快。

```
┌─────────────────────────────────────────────────────────────┐
│               Playwright + Electron 架构                     │
│                                                              │
│  测试脚本 (Node.js)                                          │
│       │                                                      │
│       │  CDP (Chrome DevTools Protocol)                      │
│       ▼                                                      │
│  ┌──────────────┐       直连        ┌──────────────────────┐ │
│  │  Playwright   │ ◄──────────────► │ Electron 应用         │ │
│  │  Test Runner  │                  │ (内置 Chromium)       │ │
│  │              │                   │                       │ │
│  └──────────────┘                   └──────────────────────┘ │
│                                                              │
│  特点：                                                      │
│  • 直连 CDP，无需 ChromeDriver                               │
│  • 支持截图、视频录制                                         │
│  • Playwright 的选择器引擎和自动等待                          │
│  • 注意：_electron 是实验性 API                               │
└─────────────────────────────────────────────────────────────┘
```

### 安装与基础使用

```bash
npm install -D @playwright/test playwright
```

```js
// tests/e2e/app.pw.spec.js
const { test, expect, _electron } = require('@playwright/test');

let electronApp;
let window;

test.beforeAll(async () => {
  // 启动 Electron 应用
  electronApp = await _electron.launch({
    args: ['./src/main/index.js'],  // 指向主进程入口
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  // 获取第一个窗口
  window = await electronApp.firstWindow();
  // 等待页面加载完毕
  await window.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();
});

test('窗口标题正确', async () => {
  const title = await window.title();
  expect(title).toBe('我的应用');
});

test('页面显示欢迎文字', async () => {
  const heading = window.locator('h1');
  await expect(heading).toHaveText('欢迎使用');
});

test('点击按钮触发操作', async () => {
  await window.click('#action-btn');
  const result = await window.locator('#result');
  await expect(result).toBeVisible();
});
```

### 在主进程中求值

```js
test('获取主进程信息', async () => {
  // evaluate 在主进程执行代码
  const appPath = await electronApp.evaluate(async ({ app }) => {
    return app.getAppPath();
  });
  expect(appPath).toContain('my-app');
});

test('检查窗口是否可见', async () => {
  const isVisible = await electronApp.evaluate(async ({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    return win.isVisible();
  });
  expect(isVisible).toBe(true);
});
```

### 截图与调试

```js
test('应用外观截图对比', async () => {
  // 整页截图
  await window.screenshot({ path: 'tests/screenshots/main-window.png' });

  // 元素截图
  const sidebar = window.locator('.sidebar');
  await sidebar.screenshot({ path: 'tests/screenshots/sidebar.png' });
});
```

### WebdriverIO vs Playwright 对比

```
┌─────────────────────┬──────────────────────┬─────────────────────┐
│                     │ WebdriverIO          │ Playwright          │
├─────────────────────┼──────────────────────┼─────────────────────┤
│ 官方推荐            │ ✅ Electron 官方推荐  │ 社区方案            │
│ 协议                │ WebDriver            │ CDP 直连            │
│ 启动速度            │ 稍慢（经过 Driver）   │ 快                  │
│ API 稳定性          │ 稳定                  │ _electron 实验性    │
│ Electron API 访问   │ browser.electron.*   │ app.evaluate()      │
│ 多浏览器            │ 支持                  │ 支持                │
│ 截图/视频           │ 支持                  │ 原生支持            │
│ 社区 & 文档         │ 丰富                  │ 丰富                │
│ 适合场景            │ 正式项目、CI 流水线   │ 快速验证、原型期    │
└─────────────────────┴──────────────────────┴─────────────────────┘
```

---

## CI 集成：GitHub Actions

Electron 测试在 CI 上有特殊要求：需要显示服务器（Display Server）来渲染窗口。

### Linux 上的 xvfb

Linux CI 通常没有图形界面，需要 `xvfb`（X Virtual Framebuffer）模拟显示器：

```
┌──────────────────────────────────────────────────────┐
│                  CI 环境对比                          │
│                                                      │
│  macOS CI:     自带 Display Server  → 直接运行       │
│  Windows CI:   自带 Desktop         → 直接运行       │
│  Linux CI:     无显示服务器         → 需要 xvfb      │
│                                                      │
│  xvfb 原理：                                         │
│  ┌──────────┐    虚拟帧缓冲    ┌──────────────────┐ │
│  │ Electron │ ──────────────► │ xvfb (内存显示器) │ │
│  │   应用   │  渲染到内存      │   不需要物理屏幕  │ │
│  └──────────┘                  └──────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### GitHub Actions 完整配置

```yaml
# .github/workflows/test.yml
name: Electron Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run
        name: 运行单元测试

  e2e-test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      # 先构建应用（E2E 测试需要打包后的二进制）
      - run: npm run build
        name: 构建应用

      # Linux 需要 xvfb
      - name: E2E 测试 (Linux)
        if: runner.os == 'Linux'
        run: xvfb-run --auto-servernum npx wdio run wdio.conf.js

      # macOS / Windows 直接运行
      - name: E2E 测试 (macOS / Windows)
        if: runner.os != 'Linux'
        run: npx wdio run wdio.conf.js

      # 上传失败截图
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-screenshots-${{ matrix.os }}
          path: tests/screenshots/
```

### Playwright 的 CI 配置

```yaml
      # Playwright 同样需要 xvfb
      - name: Playwright E2E (Linux)
        if: runner.os == 'Linux'
        run: xvfb-run --auto-servernum npx playwright test

      - name: Playwright E2E (其他平台)
        if: runner.os != 'Linux'
        run: npx playwright test
```

---

## 常见问题

### 1. sandbox 对测试的影响

Electron 默认启用 sandbox，某些测试场景可能受限：

```js
// 问题：sandbox 阻止某些 Node.js API
// 解决：在测试时禁用 sandbox（仅测试环境）

// wdio.conf.js
capabilities: [{
  browserName: 'electron',
  'wdio:electronServiceOptions': {
    appArgs: ['--no-sandbox'],  // CI 环境通常需要
  },
}]

// Playwright
electronApp = await _electron.launch({
  args: ['./main.js', '--no-sandbox'],
});
```

> **注意**：`--no-sandbox` 仅在测试/CI 环境使用，生产环境必须保持 sandbox 开启。

### 2. 如何 mock 原生对话框

原生对话框（文件选择、消息弹窗）无法通过 UI 自动化操控，有两种策略：

```
策略一：在测试中替换 dialog 模块（见前文 WebdriverIO 示例）
  优点：简单直接
  缺点：修改了运行时状态

策略二：通过环境变量让应用自行 mock
  ┌──────────────────────────────────────┐
  │  // main.js                          │
  │  if (process.env.E2E_TEST) {         │
  │    dialog.showOpenDialog = async () =>│
  │      ({ canceled: false,             │
  │         filePaths: [testFixture] }); │
  │  }                                   │
  └──────────────────────────────────────┘
  优点：测试代码更干净
  缺点：生产代码中混入测试逻辑
```

### 3. 测试覆盖率

```bash
# Vitest 内置覆盖率支持
npx vitest run --coverage

# vitest.config.js 中配置
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',       // 或 'istanbul'
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/**/*.test.{js,ts}'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
```

### 4. 测试运行缓慢

```
问题：E2E 测试每个用例都启动 / 关闭 Electron 应用

优化方案：
  ✓ 合理使用 beforeAll / afterAll，一次启动，多个用例复用
  ✓ 用例间清理状态而不是重启应用
  ✓ 并行运行独立的测试文件
  ✗ 不要在 beforeEach 中启动应用
```

### 5. Spectron 已废弃

```
⚠️ Spectron 是早期的 Electron 测试方案，已于 2022 年停止维护。
   不支持 Electron 15+。
   迁移方向：WebdriverIO + @wdio/electron-service（官方推荐）
```

---

## 实践建议

```
┌──────────────────────────────────────────────────────────────┐
│                   Electron 测试最佳实践                       │
│                                                              │
│  1. 分层测试，重心下沉                                        │
│     把尽量多的逻辑抽为纯函数，用单元测试覆盖                   │
│     E2E 只测关键用户路径，不要试图覆盖所有边界                  │
│                                                              │
│  2. 隔离 Electron 依赖                                       │
│     业务逻辑不要直接 require('electron')                      │
│     通过依赖注入或模块分层，让纯逻辑代码可独立测试              │
│                                                              │
│  3. E2E 选型                                                 │
│     正式项目 → WebdriverIO（官方推荐，稳定性好）               │
│     快速验证 → Playwright（启动快，API 直觉）                  │
│                                                              │
│  4. CI 必备                                                  │
│     Linux 上用 xvfb-run 包裹测试命令                          │
│     配置 matrix 覆盖三平台                                    │
│     失败时上传截图 artifact                                    │
│                                                              │
│  5. 测试数据隔离                                              │
│     E2E 测试使用独立的 userData 目录                           │
│     app.setPath('userData', testDataDir)                      │
│     每次测试前清理，避免状态污染                               │
│                                                              │
│  6. 不要过度 mock                                             │
│     mock 太多会让测试失去意义                                  │
│     只 mock 外部依赖（对话框、网络请求、文件系统边界）          │
│     内部逻辑让它真实运行                                       │
│                                                              │
│  7. 推荐测试比例                                              │
│     单元测试 70% / 集成测试 20% / E2E 测试 10%                │
│                                                              │
│  8. package.json scripts                                     │
│     "test":      "vitest run"                                │
│     "test:watch": "vitest"                                   │
│     "test:e2e":  "wdio run wdio.conf.js"                     │
│     "test:coverage": "vitest run --coverage"                 │
└──────────────────────────────────────────────────────────────┘
```

---

**下一章**：我们将学习如何诊断和优化 Electron 应用的性能 →
