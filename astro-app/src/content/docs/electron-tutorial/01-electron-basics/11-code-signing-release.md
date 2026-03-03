# 第十一章：签名、公证与生产发布

## 目录

- [为什么必须签名](#为什么必须签名)
- [macOS 签名与公证](#macos-签名与公证)
- [Windows 签名](#windows-签名)
- [Linux 分发注意事项](#linux-分发注意事项)
- [自动更新的发布流程](#自动更新的发布流程)
- [崩溃上报](#崩溃上报)
- [CI/CD 完整流水线](#cicd-完整流水线)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## 为什么必须签名

未签名的应用在现代操作系统上会被拦截，用户体验极差：

```
未签名应用的用户体验：

  macOS (Gatekeeper):
  ┌─────────────────────────────────────┐
  │  ⚠️ "MyApp" 无法打开，因为          │
  │     无法验证开发者。                 │
  │                                     │
  │            [移到废纸篓]  [取消]      │
  │                                     │
  │  用户必须：系统偏好设置 → 安全性     │
  │  → "仍要打开" 才能运行               │
  └─────────────────────────────────────┘

  Windows (SmartScreen):
  ┌─────────────────────────────────────┐
  │  ⚠️ Windows 已保护你的电脑          │
  │                                     │
  │  SmartScreen 阻止了一个未识别的      │
  │  应用启动。运行此应用可能有风险。     │
  │                                     │
  │  [不运行]     [更多信息 → 仍要运行]  │
  └─────────────────────────────────────┘

  签名后：
  ✅ macOS: 双击直接打开，无任何警告
  ✅ Windows: SmartScreen 不拦截（EV 证书）或仅提示发布者名称
```

```
签名的作用：

  1. 身份验证 — 证明应用来自可信开发者
  2. 完整性保障 — 确保代码未被篡改
  3. 平台要求 — macOS/Windows 强制要求
  4. 自动更新 — 更新包必须签名才能安装

  签名流程概览：

  源代码 → 构建 → 签名 → 公证(macOS) → 分发
                    │       │
                    │       └─ Apple 服务器扫描恶意软件
                    └─ 用开发者证书对二进制签名
```

---

## macOS 签名与公证

### 前置条件

```
macOS 签名需要：

  1. Apple Developer Program 会员（$99/年）
     https://developer.apple.com/programs/

  2. 两个证书（在 Keychain Access 中管理）：
     ┌──────────────────────────────────────────────┐
     │  Developer ID Application  — 签名应用本体    │
     │  Developer ID Installer    — 签名 .pkg 安装包│
     └──────────────────────────────────────────────┘

  3. Apple ID 的 App-Specific Password
     https://appleid.apple.com → 安全 → App 专用密码

  4. Team ID（在 Apple Developer 后台查看）
```

### @electron/osx-sign + @electron/notarize

```bash
npm install -D @electron/osx-sign @electron/notarize
```

```js
// 手动签名（了解原理用）
const { signAsync } = require('@electron/osx-sign');
const { notarize } = require('@electron/notarize');

// 第一步：签名
await signAsync({
  app: 'dist/MyApp.app',
  identity: 'Developer ID Application: Your Name (TEAM_ID)',
  optionsForFile: (filePath) => ({
    // Hardened Runtime 是公证的前提条件
    hardenedRuntime: true,
    entitlements: 'entitlements.plist',
    entitlementsInherit: 'entitlements.plist',
  }),
});

// 第二步：公证
await notarize({
  appPath: 'dist/MyApp.app',
  appleId: process.env.APPLE_ID,
  appleIdPassword: process.env.APPLE_APP_PASSWORD,
  teamId: process.env.APPLE_TEAM_ID,
});
```

### Hardened Runtime 与 Entitlements

macOS 公证要求启用 Hardened Runtime，某些 Electron 功能需要额外授权：

```xml
<!-- entitlements.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- 允许 JIT（V8 引擎需要） -->
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <!-- 允许加载未签名的内存页（某些原生模块需要） -->
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <!-- 允许 DYLD 环境变量（调试用，生产可移除） -->
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

### Electron Forge 配置方式

如果使用 Electron Forge，签名和公证可以在配置中一体化完成：

```js
// forge.config.js
module.exports = {
  packagerConfig: {
    osxSign: {
      identity: 'Developer ID Application: Your Name (TEAM_ID)',
      optionsForFile: () => ({
        hardenedRuntime: true,
        entitlements: 'entitlements.plist',
        entitlementsInherit: 'entitlements.plist',
      }),
    },
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    },
  },
  // makers 配置...
};
```

### electron-builder 配置方式

```yaml
# electron-builder.yml
mac:
  category: public.app-category.developer-tools
  hardenedRuntime: true
  entitlements: build/entitlements.plist
  entitlementsInherit: build/entitlements.plist

afterSign: scripts/notarize.js  # 签名后自动公证
```

```js
// scripts/notarize.js — afterSign 钩子
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;

  await notarize({
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
```

```
macOS 签名+公证完整流程：

  构建 .app
      │
      ▼
  代码签名 (codesign)
  ├─ 对每个二进制文件签名
  ├─ 嵌入 Hardened Runtime 标记
  └─ 应用 entitlements
      │
      ▼
  提交公证 (notarytool)
  ├─ 上传到 Apple 服务器
  ├─ Apple 自动扫描恶意软件
  └─ 返回公证结果（通常 2-5 分钟）
      │
      ▼
  Staple 公证票据
  ├─ 将公证凭据附加到 .app
  └─ 离线也能验证签名
      │
      ▼
  打包为 .dmg 或 .pkg
```

---

## Windows 签名

### EV 代码签名证书

自 2023 年起，微软要求新发布者使用 EV（Extended Validation）代码签名证书才能立即获得 SmartScreen 信任：

```
Windows 签名证书类型：

  ┌─────────────┬────────────────────┬──────────────────────┐
  │ 类型        │ 标准代码签名       │ EV 代码签名          │
  ├─────────────┼────────────────────┼──────────────────────┤
  │ 价格        │ ~$200/年           │ ~$400/年             │
  │ SmartScreen │ 需要积累信誉       │ 立即信任             │
  │ 存储要求    │ 可以软件存储       │ 必须硬件存储(USB/HSM)│
  │ CI 友好     │ 好                 │ 需要云签名方案       │
  │ 推荐场景    │ 个人/小团队        │ 正式商业发布         │
  └─────────────┴────────────────────┴──────────────────────┘

  主流证书提供商：
  • DigiCert  — 企业首选，提供 KeyLocker 云签名
  • Sectigo   — 性价比高
  • GlobalSign — 企业级方案
```

### @electron/windows-sign

```bash
npm install -D @electron/windows-sign
```

```js
const { sign } = require('@electron/windows-sign');

await sign({
  appDirectory: 'dist/win-unpacked',
  // 使用 signtool 签名
  signToolPath: 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\signtool.exe',
  certificateFile: process.env.WIN_CERT_FILE,
  certificatePassword: process.env.WIN_CERT_PASSWORD,
  timestampServer: 'http://timestamp.digicert.com',
});
```

### 云签名方案（CI 环境推荐）

EV 证书存储在硬件令牌中，CI 环境无法插 USB。解决方案是使用云签名服务：

```
云签名架构：

  CI 服务器 (GitHub Actions)
       │
       │  API 调用（证书密钥在云端）
       ▼
  ┌──────────────────────┐
  │  云签名服务           │
  │  DigiCert KeyLocker  │
  │  Azure Trusted Sign  │
  │  AWS CloudHSM        │
  ├──────────────────────┤
  │  HSM (硬件安全模块)   │
  │  私钥永不离开硬件     │
  └──────────────────────┘
       │
       ▼
  签名后的二进制文件
```

```yaml
# electron-builder.yml — Windows 签名配置
win:
  target:
    - nsis
    - zip
  signingHashAlgorithms:
    - sha256
  # 使用 DigiCert KeyLocker
  sign: scripts/windows-sign.js
```

```js
// scripts/windows-sign.js
exports.default = async function(configuration) {
  // DigiCert KeyLocker 签名示例
  const { execSync } = require('child_process');
  execSync(`smctl sign --keypair-alias ${process.env.SM_KEYPAIR_ALIAS} \
    --certificate ${process.env.SM_CLIENT_CERT_FILE} \
    --input "${configuration.path}"`, { stdio: 'inherit' });
};
```

---

## Linux 分发注意事项

Linux 不要求代码签名，但分发有自身的复杂性：

```
Linux 分发格式：

  ┌──────────┬──────────────────────────────┬──────────────────┐
  │ 格式     │ 说明                         │ 适用发行版       │
  ├──────────┼──────────────────────────────┼──────────────────┤
  │ AppImage │ 单文件，下载即用             │ 通用             │
  │ .deb     │ Debian 包管理器              │ Ubuntu/Debian    │
  │ .rpm     │ Red Hat 包管理器             │ Fedora/RHEL      │
  │ snap     │ Canonical 沙箱分发           │ Ubuntu           │
  │ flatpak  │ 跨发行版沙箱分发             │ 通用             │
  └──────────┴──────────────────────────────┴──────────────────┘

  推荐策略：
  • AppImage — 作为通用格式，必出
  • .deb     — Ubuntu 用户量大，建议出
  • snap     — 如果需要自动更新功能
```

```yaml
# electron-builder.yml — Linux 配置
linux:
  target:
    - AppImage
    - deb
    - rpm
  category: Development
  icon: build/icons/  # 需要提供多个尺寸的 PNG

# AppImage 注意事项
appImage:
  artifactName: '${name}-${version}.AppImage'

# deb 注意事项
deb:
  depends:
    - libgtk-3-0
    - libnotify4
    - libnss3
    - libxss1
```

---

## 自动更新的发布流程

### electron-updater 元数据文件

`electron-builder` 配合 `electron-updater` 使用时，会自动生成更新元数据文件：

```
构建产物目录：

  dist/
  ├── MyApp-1.2.0.dmg              # macOS 安装包
  ├── MyApp-1.2.0-mac.zip          # macOS 自动更新用
  ├── latest-mac.yml               # macOS 更新元数据 ←
  ├── MyApp-Setup-1.2.0.exe        # Windows 安装包
  ├── latest.yml                   # Windows 更新元数据 ←
  ├── MyApp-1.2.0.AppImage         # Linux
  └── latest-linux.yml             # Linux 更新元数据 ←
```

```yaml
# latest.yml 示例（自动生成，不要手动编辑）
version: 1.2.0
files:
  - url: MyApp-Setup-1.2.0.exe
    sha512: abc123...
    size: 85000000
path: MyApp-Setup-1.2.0.exe
sha512: abc123...
releaseDate: '2025-01-15T10:30:00.000Z'
```

### 更新服务器选择

```
┌────────────────────┬───────────────────────────────────────────┐
│ 方案               │ 说明                                     │
├────────────────────┼───────────────────────────────────────────┤
│ GitHub Releases    │ 免费，适合开源项目。electron-updater 原生支持│
│ S3 / R2 / OSS     │ 适合商业项目，成本低，速度可控             │
│ 自建更新服务器      │ 完全自控，可实现灰度发布等高级功能         │
│ Hazel / Nuts       │ 开源的更新服务器，部署在 Vercel/Heroku     │
└────────────────────┴───────────────────────────────────────────┘
```

```js
// main.js — 配置自动更新
const { autoUpdater } = require('electron-updater');

// GitHub Releases
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-org',
  repo: 'your-app',
});

// 或 S3
autoUpdater.setFeedURL({
  provider: 's3',
  bucket: 'my-app-updates',
  region: 'us-east-1',
});

// 或自建服务器
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://updates.myapp.com/releases',
});
```

### 灰度发布（Staged Rollout）

灰度发布可以先让一部分用户更新，确认无问题后再全量推送：

```
灰度发布策略：

  新版本 v1.3.0 发布
       │
       ▼
  阶段1: 5% 用户更新  ──→  监控崩溃率、反馈
       │                    正常 ✅
       ▼
  阶段2: 20% 用户更新 ──→  继续监控
       │                    正常 ✅
       ▼
  阶段3: 50% 用户更新 ──→  观察一天
       │                    正常 ✅
       ▼
  全量推送: 100%

  如果任何阶段发现问题 → 暂停推送，修复后重新发布
```

```yaml
# latest.yml — 灰度发布配置
version: 1.3.0
files:
  - url: MyApp-Setup-1.3.0.exe
    sha512: abc123...
    size: 85000000
stagingPercentage: 20  # 只有 20% 的用户能看到此更新
```

```js
// electron-updater 会自动根据 stagingPercentage 决定是否提示更新
// 判断逻辑：对用户标识取 hash，hash % 100 < stagingPercentage 则更新
```

---

## 崩溃上报

### crashReporter 模块

Electron 内置了崩溃上报能力，底层基于 Crashpad（Chromium 使用的崩溃收集器）：

```js
// main.js — 配置崩溃上报
const { crashReporter } = require('electron');

crashReporter.start({
  productName: 'MyApp',
  companyName: 'MyCompany',
  submitURL: 'https://sentry.io/api/PROJECT_ID/minidump/?sentry_key=KEY',
  uploadToServer: true,
  extra: {
    appVersion: app.getVersion(),
    platform: process.platform,
  },
});
```

### Sentry 集成

Sentry 是最常用的崩溃上报服务，对 Electron 有完善的支持：

```bash
npm install @sentry/electron
```

```js
// main.js
const Sentry = require('@sentry/electron/main');
Sentry.init({
  dsn: 'https://xxx@sentry.io/yyy',
  release: `my-app@${app.getVersion()}`,
});

// renderer (preload 暴露后在渲染进程初始化)
// renderer.js
const Sentry = require('@sentry/electron/renderer');
Sentry.init({});
```

```
崩溃上报流程：

  应用崩溃
      │
      ▼
  Crashpad 生成 minidump 文件
      │
      ▼
  ┌────────────────┐     上传      ┌──────────────────┐
  │  本地崩溃目录   │ ──────────►  │  Sentry / 自建    │
  │  .dmp 文件      │              │  崩溃收集服务器   │
  └────────────────┘              └──────────────────┘
                                          │
                                          ▼
                                  解析 stack trace
                                  聚合同类崩溃
                                  通知开发者
```

---

## CI/CD 完整流水线

### GitHub Actions 全平台构建、签名、发布

```yaml
# .github/workflows/release.yml
name: Build & Release

on:
  push:
    tags:
      - 'v*'  # 推送 tag 时触发（如 v1.2.0）

jobs:
  build:
    strategy:
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

      # ── macOS: 导入证书 ──
      - name: 导入 macOS 签名证书
        if: matrix.platform == 'mac'
        env:
          CERT_BASE64: ${{ secrets.MAC_CERT_BASE64 }}
          CERT_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
        run: |
          echo "$CERT_BASE64" | base64 --decode > cert.p12
          security create-keychain -p "" build.keychain
          security import cert.p12 -k build.keychain -P "$CERT_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple: -s -k "" build.keychain
          security default-keychain -s build.keychain
          rm cert.p12

      # ── 构建 + 签名 + 公证 + 发布（一条命令搞定） ──
      - name: 构建并发布
        env:
          # macOS 签名 & 公证
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CSC_LINK: ${{ secrets.MAC_CERT_BASE64 }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
          # Windows 签名
          WIN_CSC_LINK: ${{ secrets.WIN_CERT_BASE64 }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
          # GitHub Token（发布到 Releases）
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx electron-builder --publish always

      # ── 上传构建产物 ──
      - uses: actions/upload-artifact@v4
        with:
          name: release-${{ matrix.platform }}
          path: |
            dist/*.dmg
            dist/*.zip
            dist/*.exe
            dist/*.AppImage
            dist/*.deb
            dist/*.yml
```

```
CI/CD 流水线全景：

  开发者 push tag v1.2.0
         │
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │  GitHub Actions（并行三平台）                              │
  │                                                          │
  │  macOS Runner        Windows Runner     Linux Runner     │
  │  ┌──────────┐       ┌──────────┐       ┌──────────┐    │
  │  │ npm ci   │       │ npm ci   │       │ npm ci   │    │
  │  │ build    │       │ build    │       │ build    │    │
  │  │ sign     │       │ sign     │       │ package  │    │
  │  │ notarize │       │          │       │          │    │
  │  │ publish  │       │ publish  │       │ publish  │    │
  │  └──────────┘       └──────────┘       └──────────┘    │
  │       │                  │                  │           │
  │       └──────────────────┼──────────────────┘           │
  │                          ▼                               │
  │              GitHub Releases v1.2.0                      │
  │              ├── MyApp-1.2.0.dmg                        │
  │              ├── MyApp-1.2.0-mac.zip                    │
  │              ├── MyApp-Setup-1.2.0.exe                  │
  │              ├── MyApp-1.2.0.AppImage                   │
  │              ├── latest-mac.yml                         │
  │              ├── latest.yml                             │
  │              └── latest-linux.yml                       │
  └──────────────────────────────────────────────────────────┘
         │
         ▼
  用户应用内收到自动更新通知
```

---

## 常见问题

### 1. macOS 公证失败

```
常见错误及解决方案：

  "The signature does not include a secure timestamp"
  → 签名时使用 --timestamp 标志（@electron/osx-sign 默认已处理）

  "The executable does not have the hardened runtime enabled"
  → 确保 hardenedRuntime: true

  "The signature is invalid"
  → 检查 entitlements.plist 是否正确
  → 确保所有 .node 原生模块也被签名

  公证超时（> 10 分钟）
  → Apple 服务器繁忙，稍后重试
  → 确认网络连接正常
```

### 2. Windows SmartScreen 仍然报警

```
原因：标准代码签名证书需要积累信誉
  • 新证书签名的应用初期仍会被 SmartScreen 标记
  • 需要足够多的用户下载运行后才能建立信任

解决方案：
  • 使用 EV 代码签名证书（立即信任）
  • 提交到 Microsoft 进行手动审查
  • 确保签名包含时间戳（防止证书过期后失效）
```

### 3. CI 环境中如何安全管理证书

```
原则：证书私钥绝不能明文出现在代码仓库中

  推荐做法：
  ┌──────────────────────────────────────────────────┐
  │  1. 将 .p12 证书文件 base64 编码                  │
  │     cat cert.p12 | base64 > cert_base64.txt      │
  │                                                   │
  │  2. 存入 GitHub Secrets                           │
  │     Settings → Secrets → New repository secret    │
  │     MAC_CERT_BASE64 = <粘贴 base64 内容>          │
  │     MAC_CERT_PASSWORD = <证书密码>                 │
  │                                                   │
  │  3. CI 中还原                                     │
  │     echo "$CERT_BASE64" | base64 --decode > cert  │
  └──────────────────────────────────────────────────┘
```

### 4. electron-builder vs Electron Forge 的签名配置差异

```
electron-builder:
  • 通过 CSC_LINK / CSC_KEY_PASSWORD 环境变量自动签名
  • afterSign 钩子处理公证
  • 配置在 electron-builder.yml

Electron Forge:
  • 在 forge.config.js 的 packagerConfig 中配置
  • osxSign + osxNotarize 字段
  • 更贴近 Electron 生态
```

---

## 实践建议

```
┌──────────────────────────────────────────────────────────────┐
│           签名与发布最佳实践                                  │
│                                                              │
│  1. 从第一天就签名                                           │
│     不要等到发布时才处理签名问题                              │
│     在 CI 中尽早配置签名流程                                 │
│                                                              │
│  2. 证书管理                                                 │
│     • 证书存储在 CI Secrets 中，不入代码库                    │
│     • 记录证书到期日，提前续期                                │
│     • EV 证书选择支持云签名的提供商                           │
│                                                              │
│  3. macOS 公证不可跳过                                       │
│     macOS 10.15+ 强制要求公证                                │
│     没有公证的应用在 macOS 上几乎无法使用                     │
│                                                              │
│  4. 自动更新必须签名                                         │
│     electron-updater 会验证更新包的签名                       │
│     未签名的更新包会被拒绝安装                                │
│                                                              │
│  5. 灰度发布降低风险                                         │
│     新版本先推给 5-10% 用户                                   │
│     监控崩溃率稳定后再全量推送                                │
│                                                              │
│  6. 崩溃上报必须有                                           │
│     至少集成 Sentry 或类似服务                                │
│     崩溃日志是修复线上问题的唯一途径                          │
│                                                              │
│  7. 版本号规范                                                │
│     遵循 SemVer（major.minor.patch）                          │
│     electron-updater 依赖版本号判断更新                       │
│                                                              │
│  8. 发布清单                                                 │
│     □ 更新版本号（package.json）                              │
│     □ 更新 CHANGELOG                                         │
│     □ 创建 git tag（v1.2.0）                                 │
│     □ 推送 tag 触发 CI                                       │
│     □ CI 自动构建 → 签名 → 公证 → 发布                       │
│     □ 验证 GitHub Releases 产物                               │
│     □ 手动下载安装验证                                        │
│     □ 验证自动更新推送正常                                    │
└──────────────────────────────────────────────────────────────┘
```

---

**下一章**：我们将学习 Electron 的跨平台差异与原生模块开发 →
