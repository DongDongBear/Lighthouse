# 第八章：打包与分发

## 目录

- [打包概述](#打包概述)
- [electron-builder vs electron-forge](#electron-builder-vs-electron-forge)
- [electron-builder 配置详解](#electron-builder-配置详解)
- [多平台构建](#多平台构建)
- [asar 打包原理](#asar-打包原理)
- [代码签名](#代码签名)
- [自动更新准备](#自动更新准备)
- [CI/CD 集成](#cicd-集成)
- [深入理解](#深入理解)
- [常见问题](#常见问题)
- [实践建议](#实践建议)

---

## 打包概述

### 打包做了什么

```
打包前 (开发):                      打包后 (分发):

  my-app/                            MyApp-1.0.0.dmg (macOS)
  ├── package.json                   MyApp-Setup-1.0.0.exe (Windows)
  ├── main.js                        MyApp-1.0.0.AppImage (Linux)
  ├── preload.js                     
  ├── index.html                     
  ├── node_modules/ (数百 MB)        
  │   ├── electron/ (开发依赖)       
  │   ├── better-sqlite3/            
  │   └── ...                        
  └── assets/                        

打包过程：

  源代码 + 依赖
       │
       ▼
  ┌─────────────────────────┐
  │ 1. 清理开发依赖         │  去掉 electron、typescript 等
  │ 2. 打包为 asar          │  合并文件为归档
  │ 3. 原生模块处理         │  针对目标平台重编译
  │ 4. 嵌入 Electron 二进制  │  自带运行时
  │ 5. 生成安装包           │  DMG/EXE/AppImage
  │ 6. 代码签名             │  数字签名认证
  └─────────────────────────┘
       │
       ▼
  可分发的安装包 (~80-200MB)
```

---

## electron-builder vs electron-forge

```
┌────────────────────┬──────────────────────┬──────────────────────┐
│                    │ electron-builder     │ electron-forge       │
├────────────────────┼──────────────────────┼──────────────────────┤
│ 维护者             │ 社区（develar）      │ Electron 官方        │
│ 配置方式           │ package.json 或 yml  │ forge.config.js      │
│ 学习曲线           │ 中                   │ 中高                 │
│ 安装包格式         │ 非常丰富             │ 丰富                 │
│ 自动更新           │ 内置 electron-updater│ 需要配置             │
│ 发布集成           │ GitHub/S3/自建       │ GitHub/S3            │
│ 插件系统           │ 有                   │ 有（更灵活）         │
│ 社区使用量         │ ⭐⭐⭐⭐⭐               │ ⭐⭐⭐⭐                │
│ Vite/Webpack 集成  │ 需要额外配置         │ 官方模板             │
│ monorepo 支持      │ 好                   │ 好                   │
│ 适合               │ 快速打包，成熟项目   │ 新项目，全套工具链   │
└────────────────────┴──────────────────────┴──────────────────────┘
```

**本教程使用 electron-builder**，因为它配置直观、功能全面、社区文档丰富。

---

## electron-builder 配置详解

### 安装

```bash
npm install electron-builder --save-dev
```

### 完整配置

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "main": "src/main/main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux",
    "build:all": "electron-builder -mwl"
  },
  "build": {
    "appId": "com.yourcompany.myapp",
    "productName": "My App",
    "copyright": "Copyright © 2024 Your Company",
    
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },

    "files": [
      "src/**/*",
      "assets/**/*",
      "!src/**/*.ts",
      "!**/*.map"
    ],

    "extraResources": [
      {
        "from": "extra/",
        "to": "extra/",
        "filter": ["**/*"]
      }
    ],

    "asar": true,
    "asarUnpack": [
      "node_modules/better-sqlite3/**",
      "**/*.node"
    ],

    "mac": {
      "category": "public.app-category.developer-tools",
      "icon": "build/icon.icns",
      "target": [
        { "target": "dmg", "arch": ["x64", "arm64"] },
        { "target": "zip", "arch": ["x64", "arm64"] }
      ],
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "darkModeSupport": true,
      "minimumSystemVersion": "10.15"
    },

    "dmg": {
      "contents": [
        { "x": 130, "y": 220 },
        { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
      ],
      "window": {
        "width": 540,
        "height": 380
      }
    },

    "win": {
      "icon": "build/icon.ico",
      "target": [
        { "target": "nsis", "arch": ["x64", "ia32"] }
      ],
      "signingHashAlgorithms": ["sha256"],
      "publisherName": "Your Company"
    },

    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "build/icon.ico",
      "uninstallerIcon": "build/icon.ico",
      "installerHeaderIcon": "build/icon.ico",
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "My App",
      "perMachine": false
    },

    "linux": {
      "icon": "build/icons",
      "category": "Development",
      "target": [
        "AppImage",
        "deb"
      ],
      "desktop": {
        "StartupWMClass": "my-app"
      }
    },

    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "my-app"
    }
  }
}
```

### 配置字段解析

```
build 配置结构：

  build
  ├── appId              应用唯一标识符（反向域名格式）
  ├── productName        应用显示名称
  ├── files              要包含的文件（glob 模式）
  ├── extraResources     额外资源（不放在 asar 内）
  ├── asar               是否使用 asar 打包
  ├── asarUnpack         从 asar 中排除的文件
  │
  ├── mac                macOS 特定配置
  │   ├── category       App Store 分类
  │   ├── target         构建目标 (dmg/zip/pkg)
  │   ├── arch           架构 (x64/arm64/universal)
  │   ├── hardenedRuntime 加固运行时（签名必须）
  │   └── entitlements   权限声明文件
  │
  ├── dmg                DMG 安装包配置
  │   ├── contents       拖拽安装窗口布局
  │   └── window         窗口尺寸
  │
  ├── win                Windows 特定配置
  │   ├── target         构建目标 (nsis/msi/portable)
  │   └── signingHash    签名算法
  │
  ├── nsis               NSIS 安装向导配置
  │   ├── oneClick       是否一键安装
  │   └── perMachine     是否安装到全系统
  │
  ├── linux              Linux 特定配置
  │   ├── target         构建目标 (AppImage/deb/rpm/snap)
  │   └── category       桌面环境分类
  │
  └── publish            发布配置
      ├── provider       发布平台 (github/s3/generic)
      └── url            自建服务器 URL
```

---

## 多平台构建

### macOS 构建

```bash
# DMG（拖拽安装）
electron-builder --mac dmg

# ZIP（用于自动更新）
electron-builder --mac zip

# pkg（完整安装包）
electron-builder --mac pkg

# Universal Binary（同时支持 Intel + Apple Silicon）
electron-builder --mac --universal
```

#### macOS 图标准备

```
build/icon.icns 需要包含以下尺寸：
  16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024

生成方法：
  # 从 1024x1024 PNG 生成 icns
  mkdir icon.iconset
  sips -z 16 16 icon-1024.png --out icon.iconset/icon_16x16.png
  sips -z 32 32 icon-1024.png --out icon.iconset/icon_16x16@2x.png
  sips -z 32 32 icon-1024.png --out icon.iconset/icon_32x32.png
  sips -z 64 64 icon-1024.png --out icon.iconset/icon_32x32@2x.png
  sips -z 128 128 icon-1024.png --out icon.iconset/icon_128x128.png
  sips -z 256 256 icon-1024.png --out icon.iconset/icon_128x128@2x.png
  sips -z 256 256 icon-1024.png --out icon.iconset/icon_256x256.png
  sips -z 512 512 icon-1024.png --out icon.iconset/icon_256x256@2x.png
  sips -z 512 512 icon-1024.png --out icon.iconset/icon_512x512.png
  sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png
  iconutil -c icns icon.iconset
```

### Windows 构建

```bash
# NSIS 安装向导（最常用）
electron-builder --win nsis

# MSI（企业部署）
electron-builder --win msi

# 便携版（不需要安装）
electron-builder --win portable
```

### Linux 构建

```bash
# AppImage（通用，不需要安装）
electron-builder --linux AppImage

# deb（Debian/Ubuntu）
electron-builder --linux deb

# rpm（Fedora/RHEL）
electron-builder --linux rpm

# snap（Snap Store）
electron-builder --linux snap
```

### 交叉编译

```
交叉编译支持：

  从 macOS 构建:
    ✅ macOS (dmg, zip, pkg)
    ✅ Windows (nsis, portable) — 需要 Wine
    ✅ Linux (AppImage, deb)

  从 Windows 构建:
    ❌ macOS — 不支持
    ✅ Windows (nsis, msi, portable)
    ❌ Linux — 有限支持

  从 Linux 构建:
    ❌ macOS — 不支持
    ✅ Windows (nsis) — 需要 Wine
    ✅ Linux (AppImage, deb, rpm)

  推荐方案: 使用 GitHub Actions 在各平台的 runner 上构建
```

---

## asar 打包原理

### asar 是什么

asar（Atom Shell Archive）是 Electron 特有的打包格式，类似于 tar，但支持随机访问。

```
不用 asar:
  Resources/
  └── app/
      ├── package.json
      ├── main.js
      ├── preload.js
      ├── index.html
      ├── node_modules/
      │   └── (数千个文件和目录)
      └── assets/
          └── (图片等资源)

  问题：
  - 数千个小文件，安装/复制很慢
  - Windows 上路径长度限制 (260 字符)
  - 文件可以直接被查看和修改

用 asar:
  Resources/
  ├── app.asar              ← 单个归档文件 (~10MB)
  └── app.asar.unpacked/    ← 原生模块（必须解压）
      └── node_modules/
          └── better-sqlite3/

  优势：
  - 单文件，安装快
  - 解决 Windows 路径长度问题
  - 文件不能直接修改（但可以解包查看！）
```

### asar 内部结构

```
asar 文件格式：

  ┌──────────────────────────────────────────┐
  │  Header Size (4 bytes, uint32)           │
  ├──────────────────────────────────────────┤
  │  Header (JSON, 描述文件树和偏移量)       │
  │  {                                       │
  │    "files": {                            │
  │      "package.json": {                   │
  │        "size": 512,                      │
  │        "offset": "0"                     │
  │      },                                  │
  │      "main.js": {                        │
  │        "size": 2048,                     │
  │        "offset": "512"                   │
  │      },                                  │
  │      ...                                 │
  │    }                                     │
  │  }                                       │
  ├──────────────────────────────────────────┤
  │  File Data (各文件内容连续存储)          │
  │  [package.json 内容][main.js 内容]...    │
  └──────────────────────────────────────────┘

  读取文件时：
  1. 读取 header
  2. 在 header 中查找文件的 offset 和 size
  3. 直接 seek 到对应位置读取
  → 不需要解压整个归档，性能好
```

### asar 操作命令

```bash
# 安装 asar 工具
npm install -g @electron/asar

# 打包目录为 asar
asar pack app/ app.asar

# 解包 asar
asar extract app.asar app-extracted/

# 列出 asar 内容
asar list app.asar
```

> **安全提醒**：asar 不提供任何加密或保护。任何人都可以 `asar extract` 查看你的源码。不要在代码中硬编码密钥。

---

## 代码签名

### 为什么需要代码签名

```
没有签名:
  用户下载 → 操作系统警告 "来自不明开发者" → 用户可能放弃安装
  macOS: Gatekeeper 直接阻止运行
  Windows: SmartScreen 显示蓝色警告

有签名:
  用户下载 → 操作系统验证签名 → 正常安装
  用户体验: 看到开发者名称，增加信任
```

### macOS 签名和公证

```bash
# 前提：
# 1. Apple Developer 账号 ($99/年)
# 2. Developer ID Application 证书
# 3. Developer ID Installer 证书（pkg 需要）

# electron-builder 自动签名配置
# 环境变量：
export CSC_LINK="path/to/Developer_ID_Application.p12"
export CSC_KEY_PASSWORD="certificate-password"

# Apple 公证 (notarization) — 必须，否则 macOS 10.15+ 无法运行
export APPLE_ID="your@apple.id"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

macOS entitlements 文件：

```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" 
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <!-- 如果需要网络访问 -->
  <key>com.apple.security.network.client</key>
  <true/>
  <!-- 如果需要文件访问 -->
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
</dict>
</plist>
```

### Windows 签名

```bash
# Windows 代码签名选项：
# 1. OV (Organization Validation) 证书 — ~$200-400/年
# 2. EV (Extended Validation) 证书 — ~$400-600/年（SmartScreen 信任更快）

# 环境变量
export CSC_LINK="path/to/certificate.pfx"
export CSC_KEY_PASSWORD="certificate-password"

# electron-builder 会自动使用 signtool.exe 签名
```

---

## 自动更新准备

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "my-app"
    },
    
    "mac": {
      "target": [
        { "target": "dmg" },
        { "target": "zip" }
      ]
    },
    
    "win": {
      "target": [
        { "target": "nsis" }
      ]
    }
  }
}
```

```
自动更新需要的文件：

  GitHub Releases 上传的文件：
  ├── MyApp-1.0.0.dmg              macOS 安装包
  ├── MyApp-1.0.0-mac.zip          macOS 自动更新包 (必须)
  ├── MyApp-1.0.0-mac.zip.blockmap blockmap (差分更新)
  ├── latest-mac.yml               macOS 更新元数据
  ├── MyApp-Setup-1.0.0.exe        Windows 安装包
  ├── MyApp-Setup-1.0.0.exe.blockmap
  ├── latest.yml                   Windows 更新元数据
  ├── MyApp-1.0.0.AppImage         Linux
  └── latest-linux.yml             Linux 更新元数据
```

---

## CI/CD 集成

### GitHub Actions 完整配置

```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'  # 当推送 v 开头的 tag 时触发

jobs:
  # macOS 构建
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build:mac
        env:
          # 签名
          CSC_LINK: ${{ secrets.MAC_CERTIFICATE_P12 }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
          # 公证
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          # 发布
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: mac-build
          path: dist/*.dmg

  # Windows 构建
  build-win:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build:win
        env:
          CSC_LINK: ${{ secrets.WIN_CERTIFICATE_PFX }}
          CSC_KEY_PASSWORD: ${{ secrets.WIN_CERTIFICATE_PASSWORD }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: win-build
          path: dist/*.exe

  # Linux 构建
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build:linux
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: linux-build
          path: dist/*.AppImage

  # 创建 Release 并上传所有平台的包
  release:
    needs: [build-mac, build-win, build-linux]
    runs-on: ubuntu-latest
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
      
      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            mac-build/*
            win-build/*
            linux-build/*
          draft: true
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 发布流程

```bash
# 1. 更新版本号
npm version patch  # 1.0.0 → 1.0.1
# 或
npm version minor  # 1.0.0 → 1.1.0
# 或
npm version major  # 1.0.0 → 2.0.0

# 2. 推送 tag
git push --follow-tags

# 3. GitHub Actions 自动构建并创建 Draft Release

# 4. 在 GitHub 上检查 Release，确认后发布
```

---

## 深入理解

### 打包后的文件结构

```
macOS (.app 包内部):

  MyApp.app/
  └── Contents/
      ├── Info.plist              # 应用元信息
      ├── PkgInfo
      ├── MacOS/
      │   └── MyApp               # 可执行文件
      ├── Frameworks/
      │   ├── Electron Framework.framework/
      │   │   ├── Electron Framework  # Chromium + Node.js
      │   │   └── Resources/
      │   │       ├── icudtl.dat
      │   │       └── v8_context_snapshot.bin
      │   └── ...
      └── Resources/
          ├── app.asar            # 你的应用代码
          ├── app.asar.unpacked/  # 原生模块
          ├── electron.icns       # 应用图标
          └── ...

Windows (安装后):

  C:\Users\<user>\AppData\Local\Programs\MyApp\
  ├── MyApp.exe                   # 可执行文件
  ├── d3dcompiler_47.dll          # DirectX
  ├── ffmpeg.dll                  # 多媒体
  ├── libEGL.dll                  # OpenGL
  ├── chrome_100_percent.pak      # Chromium 资源
  ├── resources/
  │   ├── app.asar                # 你的应用代码
  │   └── app.asar.unpacked/
  └── locales/                    # 国际化
```

### 包体积优化

```
典型包体积构成：

  Electron 运行时:  ~80MB   (不可压缩，必须包含)
  你的应用代码:     ~1-10MB (asar 内)
  node_modules:     ~5-50MB (生产依赖)
  原生模块:         ~1-10MB
  ────────────────────────
  总计:             ~90-150MB

优化策略：

  1. 减少依赖
     npm install --production  # 只安装生产依赖
     或在 package.json 中正确分类 dependencies vs devDependencies

  2. 排除不需要的文件
     "build": {
       "files": [
         "!**/*.ts",          // 排除 TypeScript 源文件
         "!**/*.map",         // 排除 source map
         "!**/test/**",       // 排除测试
         "!**/docs/**",       // 排除文档
         "!**/*.md"           // 排除 markdown
       ]
     }

  3. 使用 compression
     "build": {
       "compression": "maximum"  // store | normal | maximum
     }

  4. 审查大依赖
     npx depcheck             # 找出未使用的依赖
     du -sh node_modules/*/   # 查看各依赖大小
```

---

## 常见问题

### Q1: 打包后运行报错 "Cannot find module"

原因：模块被错误地放在了 devDependencies，或 asar 排除了需要的文件。

解决：
```json
// 确保运行时需要的模块在 dependencies 而非 devDependencies
{
  "dependencies": {
    "electron-store": "^10.0.0",     // ✅ 运行时需要
    "better-sqlite3": "^11.0.0"      // ✅ 运行时需要
  },
  "devDependencies": {
    "electron": "^34.0.0",            // ✅ 只在开发时需要
    "electron-builder": "^25.0.0"     // ✅ 只在打包时需要
  }
}
```

### Q2: macOS 签名失败

常见原因：
- 证书过期
- Keychain 访问权限问题
- entitlements 文件配置错误

```bash
# 检查证书
security find-identity -v -p codesigning

# 解锁 Keychain（CI 中需要）
security unlock-keychain -p "$KEYCHAIN_PASSWORD" login.keychain
```

### Q3: Windows SmartScreen 警告

新证书或新应用需要积累信誉度。解决方案：
- 使用 EV 证书（更快获得信任）
- 提交到 Microsoft SmartScreen 信誉库
- 等待自然积累（每次用户选择"仍要运行"都在积累）

### Q4: AppImage 在某些 Linux 发行版上不能运行

```bash
# 需要 FUSE
# Ubuntu/Debian:
sudo apt install libfuse2

# 或使用 --appimage-extract-and-run 参数运行
./MyApp.AppImage --appimage-extract-and-run
```

### Q5: 原生模块打包后无法加载

确保：
1. `asarUnpack` 包含了原生模块
2. 原生模块针对目标平台编译（electron-rebuild）
3. 使用 `@electron/rebuild` 重新编译

```bash
npx @electron/rebuild
```

---

## 实践建议

### 1. 打包清单

```
□ package.json 中 dependencies 和 devDependencies 正确分类
□ build 配置完整（appId, productName, icon）
□ 图标文件准备好（icns, ico, png）
□ asar 启用，原生模块设置 asarUnpack
□ 本地构建测试通过
□ 代码签名配置正确
□ macOS 公证配置正确
□ CI/CD 工作流就绪
□ 自动更新配置就绪
□ 发布流程文档化
```

### 2. 版本号策略

```
遵循 Semantic Versioning (语义化版本):

  MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── 修复 bug（用户无感知）
  │     └──────── 新功能（向后兼容）
  └────────────── 破坏性变更

  1.0.0 → 1.0.1 (bug fix)
  1.0.1 → 1.1.0 (新功能)
  1.1.0 → 2.0.0 (破坏性变更，如数据格式不兼容)
```

### 3. 发布节奏

- **补丁版本**：随时发布（bug 修复）
- **小版本**：每 2-4 周（新功能）
- **大版本**：每季度或更长（重大变更）
- **Electron 升级**：每季度，跟进 Chromium 安全更新

---

## 本章小结

打包和分发是 Electron 应用上线的最后一公里：

1. **electron-builder** 提供了全面的打包能力
2. **asar** 打包提升安装体验
3. **代码签名**是 macOS/Windows 上的必需品
4. **CI/CD** 自动化构建和发布
5. **多平台支持**需要在各平台 runner 上构建

至此，Part 1 (Electron 基础) 全部完成。下一部分我们将深入热更新机制。

---

> **上一篇**：[07 - 数据存储](./07-data-storage.md)  
> **下一篇**：[Part 2: 01 - 热更新概述](../02-hot-update/01-update-overview.md)
