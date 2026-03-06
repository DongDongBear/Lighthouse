# 第十章：打包与发布

## 本章目标

1. 理解 OpenClaw macOS 版的构建和发布流程
2. 掌握 Electron 多平台构建配置（electron-builder）
3. 学会代码签名、公证、和自动更新发布
4. 设计完整的 CI/CD pipeline

## 学习路线图

```
OpenClaw 构建分析 → Electron 打包配置 → 代码签名 → CI/CD → 发布流程
```

---

## 10.1 OpenClaw macOS 版的构建流程

### 10.1.1 项目结构

```
openclaw-src/apps/macos/
├── Package.swift                  # Swift Package Manager 配置
├── Sources/
│   ├── OpenClaw/                  # 主 App 代码
│   │   ├── MenuBar.swift          # @main 入口
│   │   ├── AppState.swift
│   │   ├── GatewayProcessManager.swift
│   │   └── ...
│   └── OpenClawIPC/               # IPC 库（可独立）
│       └── IPC.swift
├── Resources/
│   ├── Assets.xcassets            # App 图标
│   └── Info.plist                 # App 元数据
└── Tests/
    └── ...
```

### 10.1.2 构建步骤

```
OpenClaw macOS 构建:
  │
  ├─ 1. Swift Package 解析依赖
  │     ├── Sparkle (自动更新)
  │     ├── MenuBarExtraAccess (菜单栏扩展)
  │     └── 内部包 (OpenClawKit, OpenClawChatUI, etc.)
  │
  ├─ 2. Swift 编译 (Release 模式)
  │     ├── 优化级别：-O (Speed)
  │     ├── 目标：arm64 + x86_64 (Universal Binary)
  │     └── 最低部署版本：macOS 14.0
  │
  ├─ 3. 资源打包
  │     ├── App 图标 (1024x1024 → 各种尺寸)
  │     ├── Info.plist (版本号、权限声明)
  │     └── Sparkle 公钥
  │
  ├─ 4. 代码签名
  │     ├── Developer ID Application 签名
  │     ├── Hardened Runtime 启用
  │     └── Entitlements (权限声明)
  │
  ├─ 5. 公证 (Notarization)
  │     ├── 上传到 Apple 服务器
  │     ├── 等待扫描完成
  │     └── Staple ticket 到 App
  │
  └─ 6. 分发
        ├── DMG 打包
        ├── 上传到更新服务器
        └── 更新 appcast.xml
```

---

## 10.2 Electron 多平台打包

### 10.2.1 electron-builder 配置

```yaml
# electron-builder.yml
appId: com.your-org.ai-desktop
productName: AI Desktop
copyright: Copyright © 2024

directories:
  output: dist
  buildResources: resources

files:
  - "src/**/*"
  - "!src/**/*.ts"      # 不打包源码
  - "package.json"

# === macOS 配置 ===
mac:
  category: public.app-category.developer-tools
  icon: resources/icon.icns
  target:
    - target: dmg
      arch: [universal]    # arm64 + x64
    - target: zip
      arch: [universal]
  identity: "Developer ID Application: Your Name (TEAM_ID)"
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize: true         # 自动公证

dmg:
  sign: false
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications

# === Windows 配置 ===
win:
  icon: resources/icon.ico
  target:
    - target: nsis
      arch: [x64, arm64]
  certificateSubjectName: "Your Company"
  signDlls: true

nsis:
  oneClick: false
  perMachine: true
  allowToChangeInstallationDirectory: true
  installerIcon: resources/installer.ico

# === Linux 配置 ===
linux:
  icon: resources/icon.png
  category: Development
  target:
    - AppImage
    - deb
    - rpm

# === 自动更新 ===
publish:
  - provider: github
    owner: your-org
    repo: ai-desktop
    releaseType: release
```

### 10.2.2 macOS Entitlements

```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Hardened Runtime 例外 -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>

    <!-- 摄像头访问 -->
    <key>com.apple.security.device.camera</key>
    <true/>

    <!-- 麦克风访问 -->
    <key>com.apple.security.device.audio-input</key>
    <true/>

    <!-- 网络访问 -->
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
</dict>
</plist>
```

### 10.2.3 项目脚本

```json
// package.json
{
  "name": "ai-desktop",
  "version": "1.0.0",
  "main": "src/main/index.js",
  "scripts": {
    "dev": "electron .",
    "build": "tsc && electron-builder",
    "build:mac": "tsc && electron-builder --mac",
    "build:win": "tsc && electron-builder --win",
    "build:linux": "tsc && electron-builder --linux",
    "build:all": "tsc && electron-builder -mwl",
    "publish": "tsc && electron-builder --publish always",
    "postinstall": "electron-builder install-app-deps"
  },
  "devDependencies": {
    "electron": "^31.0.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "electron-store": "^8.0.0",
    "electron-updater": "^6.0.0",
    "ws": "^8.0.0",
    "chokidar": "^3.0.0",
    "js-yaml": "^4.0.0"
  }
}
```

---

## 10.3 代码签名深度指南

### 10.3.1 macOS 签名流程

```
代码签名流程:
  │
  ├─ 1. Apple Developer Account ($99/年)
  │     └─ 创建 Developer ID Application 证书
  │
  ├─ 2. 下载并安装证书到 Keychain
  │     └─ 或在 CI 中用 base64 编码的 .p12 文件
  │
  ├─ 3. electron-builder 自动签名
  │     ├─ 搜索 Keychain 中的 "Developer ID Application" 证书
  │     ├─ 签名所有 .dylib、.framework、.app
  │     └─ 应用 Hardened Runtime
  │
  ├─ 4. 公证
  │     ├─ electron-builder 自动上传到 Apple
  │     ├─ Apple 扫描（通常 2-10 分钟）
  │     └─ Staple ticket 到 .dmg
  │
  └─ 5. 验证
        └─ spctl --assess --verbose --type install AI\ Desktop.app
```

### 10.3.2 Windows 签名

```
Windows 签名选项:
  │
  ├─ 传统方式: EV Code Signing Certificate (USB 令牌)
  │   ├─ 物理设备，不适合 CI
  │   └─ 即时 SmartScreen 信誉
  │
  ├─ 云签名: Azure Trusted Signing (推荐)
  │   ├─ 无需物理令牌
  │   ├─ CI 友好
  │   └─ Microsoft 身份验证
  │
  └─ 自签名: 不推荐
      └─ 用户会看到 SmartScreen 警告
```

### 10.3.3 CI 中的证书管理

```yaml
# GitHub Actions: macOS 签名
- name: Import certificates
  env:
    CERTIFICATE_P12: ${{ secrets.MAC_CERTIFICATE_P12 }}
    CERTIFICATE_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
  run: |
    echo "$CERTIFICATE_P12" | base64 --decode > certificate.p12
    security create-keychain -p "" build.keychain
    security default-keychain -s build.keychain
    security unlock-keychain -p "" build.keychain
    security import certificate.p12 -k build.keychain \
      -P "$CERTIFICATE_PASSWORD" -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple: \
      -s -k "" build.keychain
```

---

## 10.4 CI/CD Pipeline

### 10.4.1 GitHub Actions 完整配置

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

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
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Build TypeScript
        run: npm run build:ts

      # macOS 签名
      - name: Import macOS certificates
        if: matrix.platform == 'mac'
        env:
          CERTIFICATE_P12: ${{ secrets.MAC_CERTIFICATE_P12 }}
          CERTIFICATE_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
        run: |
          echo "$CERTIFICATE_P12" | base64 --decode > cert.p12
          security create-keychain -p "" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "" build.keychain
          security import cert.p12 -k build.keychain \
            -P "$CERTIFICATE_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple: \
            -s -k "" build.keychain

      # 构建 + 发布
      - name: Build and publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CSC_LINK: ${{ secrets.MAC_CERTIFICATE_P12 }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
        run: npx electron-builder --${{ matrix.platform }} --publish always

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.platform }}-build
          path: dist/*
```

### 10.4.2 发布流程

```
发布流程:
  │
  ├─ 1. 开发完成
  │     ├─ 更新 package.json 版本号
  │     └─ 更新 CHANGELOG.md
  │
  ├─ 2. 创建 Git Tag
  │     └─ git tag v1.2.3 && git push --tags
  │
  ├─ 3. CI 自动触发
  │     ├─ macOS: 构建 → 签名 → 公证 → DMG
  │     ├─ Windows: 构建 → 签名 → NSIS 安装包
  │     └─ Linux: 构建 → AppImage + deb + rpm
  │
  ├─ 4. 上传到 GitHub Releases
  │     └─ electron-builder --publish always
  │
  ├─ 5. 已安装用户收到更新
  │     └─ electron-updater 检测到新版本
  │
  └─ 6. 验证
        ├─ 下载各平台安装包测试
        ├─ 检查自动更新是否工作
        └─ 检查代码签名和公证
```

---

## 10.5 打包优化

### 10.5.1 包体积优化

```yaml
# electron-builder.yml
asar: true                    # 将源码打包为 asar 归档
asarUnpack:
  - "**/*.node"               # 原生模块不打入 asar

files:
  - "!**/*.ts"                # 排除 TypeScript 源码
  - "!**/*.map"               # 排除 source map
  - "!**/node_modules/.cache"
  - "!**/*.md"
  - "!**/test/**"
  - "!**/tests/**"

# 使用 pnpm 减少 node_modules 体积
npmRebuild: true
```

### 10.5.2 启动速度优化

```
优化策略:
│
├── 延迟加载：非核心模块在首次使用时加载
│   const { autoUpdater } = require('electron-updater');  // 延迟到需要时
│
├── V8 快照：Electron 支持自定义 V8 snapshot
│   └── 预编译常用模块，减少解析时间
│
├── 预编译原生模块：确保原生模块与 Electron 版本匹配
│   └── npm run postinstall → electron-builder install-app-deps
│
└── 最小化渲染进程加载：
    ├── 首屏只加载必要的 CSS/JS
    └── 聊天历史异步加载
```

---

## 10.6 设计决策

### 10.6.1 DMG vs PKG vs ZIP

| 格式 | 优点 | 缺点 | 适用 |
|------|-----|------|------|
| DMG | 直观的拖拽安装 | macOS 专用 | 推荐 |
| PKG | 可自定义安装路径 | 安装过程不透明 | 企业分发 |
| ZIP | 最小、最简 | 无安装引导 | 自动更新增量 |
| NSIS | Windows 标准安装器 | Windows 专用 | 推荐 |
| AppImage | 无需安装 | 不集成桌面环境 | Linux 推荐 |

### 10.6.2 Universal Binary vs 分架构

macOS 有两种 CPU 架构（Intel x64 + Apple Silicon arm64）。

- **Universal Binary**：一个包含两种架构，文件更大但用户体验最好
- **分架构发布**：两个安装包，文件更小但用户可能下错

推荐 Universal Binary——electron-builder 的 `arch: [universal]` 自动处理。

---

## 10.7 常见问题与陷阱

### Q1: macOS 公证失败怎么排查？
```bash
# 查看公证日志
xcrun notarytool log <submission-id> \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID"

# 常见原因：
# - Hardened Runtime 未启用
# - 包含未签名的 .dylib
# - 使用了被禁止的 API
```

### Q2: Windows SmartScreen 警告怎么消除？
- EV 代码签名证书：立即建立信誉
- 标准证书：需要积累足够的下载量
- 无证书：总是显示警告

### Q3: Linux 如何处理原生依赖？
```yaml
# 使用 AppImage：包含所有依赖
linux:
  target:
    - AppImage  # 自包含，无需安装依赖
```

### Q4: 如何处理不同 Electron 版本的 ABI 兼容性？
```bash
# electron-builder 自动处理
npm run postinstall
# 等同于
npx electron-rebuild
```

### Q5: 如何做 staged rollout（分批发布）？
electron-updater 不原生支持 staged rollout。可以通过：
- 控制 `latest.yml` 的发布时机
- 使用 feature flag 控制更新检查
- 先发布 beta 渠道，验证后推 stable

---

## 10.8 完整的构建脚本

```bash
#!/bin/bash
# scripts/release.sh
set -euo pipefail

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh 1.2.3"
  exit 1
fi

echo "🔖 Releasing v${VERSION}..."

# 1. 更新版本号
npm version "$VERSION" --no-git-tag-version

# 2. 构建
npm run build:ts

# 3. 提交
git add -A
git commit -m "release: v${VERSION}"
git tag "v${VERSION}"

# 4. 推送（触发 CI）
git push && git push --tags

echo "✅ Release v${VERSION} pushed. CI will build and publish."
echo "   Monitor: https://github.com/your-org/ai-desktop/actions"
```

---

## 10.9 章节小结

| 环节 | OpenClaw (Swift/macOS) | Electron (跨平台) |
|------|----------------------|-------------------|
| 构建系统 | Xcode / Swift PM | electron-builder |
| 目标平台 | macOS only | macOS + Windows + Linux |
| 打包格式 | DMG | DMG / NSIS / AppImage |
| 代码签名 | Developer ID (Xcode) | CSC_LINK 环境变量 |
| 公证 | xcrun notarytool | electron-builder notarize |
| 自动更新 | Sparkle + appcast.xml | electron-updater + GitHub |
| CI/CD | Xcode Cloud / GitHub Actions | GitHub Actions |
| 架构 | Universal Binary (arm64+x64) | 同 |
| 包体积 | ~30-50 MB | ~80-150 MB (含 Chromium) |
| 启动速度 | <1s | 2-5s |

---

## 全书总结

通过 10 章的深入分析，我们完成了从 OpenClaw macOS 原生版到 Electron 版的完整架构映射：

```
Part 3 知识图谱:

第 1 章: 整体架构 ─── App 入口、组件关系、单例模式
第 2 章: Gateway 管理 ─── 进程生命周期、launchd vs spawn
第 3 章: WebSocket ─── RPC 协议、推送订阅、自动恢复
第 4 章: 系统托盘 ─── 菜单栏交互、状态图标、HoverHUD
第 5 章: 聊天窗口 ─── 双模式设计、面板锚定、毛玻璃
第 6 章: Canvas ─── 自定义 scheme、文件服务、A2UI
第 7 章: IPC 桥接 ─── Unix Socket、权限模型、安全设计
第 8 章: 配置管理 ─── 多层配置、文件监听、双向同步
第 9 章: 自动更新 ─── Sparkle vs electron-updater
第10章: 打包发布 ─── 代码签名、CI/CD、多平台
```

核心收获：
1. **架构映射**：Swift @MainActor → Node.js 单线程；Swift actor → 天然无竞争
2. **产品设计**：理解了 AI 桌面助手为什么需要这些功能
3. **实现细节**：从源码级别理解每个设计决策的原因
4. **Electron 实践**：不是照搬，而是针对 Electron 的特点重新设计
