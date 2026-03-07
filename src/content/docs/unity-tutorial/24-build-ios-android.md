# 第24章：iOS 与 Android 构建发布

## 本章目标

通过本章学习，你将掌握：

1. 理解 Unity 跨平台构建的核心概念和流程
2. 配置 Android 构建环境（JDK、Android SDK、NDK）
3. 配置 iOS 构建环境（Xcode、Apple Developer 账号）
4. 掌握 Player Settings 中的关键移动端设置
5. 生成 Android APK/AAB 并签名发布
6. 生成 iOS Xcode 项目并归档上传
7. 使用 TestFlight 和 Google Play Console 进行测试分发
8. 解决 Mac 上常见的构建错误
9. 编写自动化构建辅助工具 BuildHelper.cs

## 预计学习时间

约 3-4 小时（含环境配置时间，首次配置可能需要更长）

---

## 24.1 跨平台构建概述

### 24.1.1 Unity 的跨平台优势

如果你来自前端/全栈开发背景，你可能熟悉"一次编写，到处运行"的理念——React Native、Flutter 都在追求这个目标。Unity 在游戏领域做到了类似的事情：**一套 C# 代码，构建到 30+ 个平台**。

但这并不意味着零成本。移动端构建涉及：

- **平台特定的 SDK 和工具链**：Android 需要 JDK + SDK + NDK，iOS 需要 Xcode
- **性能优化**：移动端的 GPU、内存、电量都有限制
- **发布流程**：每个应用商店都有自己的审核规则和发布流程
- **签名和证书**：Android 需要 Keystore，iOS 需要 Provisioning Profile

> **前端类比**：这类似于你在 Web 开发中需要处理不同浏览器的兼容性，但复杂度更高——你需要处理操作系统级别的差异。

### 24.1.2 构建流程总览

```
Unity 项目
    │
    ├── 切换构建平台 (Switch Platform)
    │       │
    │       ├── Android ──→ Gradle 项目 ──→ APK/AAB ──→ Google Play
    │       │
    │       └── iOS ──→ Xcode 项目 ──→ Archive ──→ App Store / TestFlight
    │
    └── Player Settings (每个平台独立配置)
            ├── Bundle Identifier
            ├── 版本号
            ├── 图标和启动画面
            ├── 脚本后端 (Mono / IL2CPP)
            └── 最低系统版本
```

---

## 24.2 切换构建平台

### 24.2.1 打开 Build Settings

在 Unity 编辑器中：

1. 点击菜单 **File → Build Settings**（快捷键 `Cmd + Shift + B`）
2. 你会看到所有支持的平台列表

[截图：Build Settings 窗口，显示平台列表，当前选中 PC/Mac/Linux Standalone]

### 24.2.2 安装平台模块

如果你还没有安装 Android 或 iOS 构建模块：

1. 打开 **Unity Hub**
2. 点击左侧 **Installs**
3. 找到你的 Unity 版本，点击齿轮图标 → **Add Modules**
4. 勾选以下模块：
   - **Android Build Support**（包含 Android SDK & NDK Tools、OpenJDK）
   - **iOS Build Support**

[截图：Unity Hub Add Modules 界面，勾选 Android 和 iOS 模块]

> **注意**：在 Mac 上，iOS Build Support 会自动可用（前提是你已安装 Xcode）。Android Build Support 建议让 Unity Hub 帮你安装 SDK 和 JDK，避免版本兼容问题。

### 24.2.3 切换到目标平台

回到 Build Settings 窗口：

1. 在平台列表中选择 **Android** 或 **iOS**
2. 点击右下角 **Switch Platform**
3. Unity 会重新导入所有资源——这可能需要几分钟到几十分钟不等

[截图：切换平台时的进度条]

> **重要提示**：切换平台会重新编译所有 Shader 和重新压缩纹理。对于大型项目，建议在空闲时间进行。你也可以使用 Asset Pipeline v2（默认已启用），它会缓存不同平台的导入结果，加速后续切换。

---

## 24.3 Player Settings 配置

### 24.3.1 通用设置

在 Build Settings 窗口中点击 **Player Settings**，或通过 **Edit → Project Settings → Player** 打开。

[截图：Player Settings 面板概览]

#### Company Name 和 Product Name

```
Company Name: YourCompanyName    // 你的公司/团队名称
Product Name: My Open World Game  // 游戏名称（会显示在设备上）
```

#### Bundle Identifier（包名）

这是你的应用在全球范围内的唯一标识符，格式为反向域名：

```
com.yourcompany.yourgame
```

> **前端类比**：类似于 npm 包的 scope + name（如 `@yourcompany/yourgame`），但一旦发布到商店就**不能更改**。

#### Version 和 Build Number

```
Version: 1.0.0                    // 用户可见的版本号 (语义化版本)
Android: Bundle Version Code: 1   // Android 内部构建号（每次上传必须递增）
iOS: Build Number: 1              // iOS 内部构建号
```

### 24.3.2 图标设置

Unity 要求你提供多个分辨率的图标：

**Android 图标要求：**
- 48x48, 72x72, 96x96, 144x144, 192x192 像素
- 自适应图标（Adaptive Icon）：前景层 + 背景层

**iOS 图标要求：**
- 从 20x20 到 1024x1024 的多种尺寸
- 不需要圆角（系统自动添加）
- 不能包含 Alpha 通道

[截图：Player Settings 中的 Icon 配置区域，展示不同分辨率的图标槽位]

> **实用技巧**：准备一张 1024x1024 的高分辨率图标源文件，Unity 会自动缩放到各个尺寸。推荐使用 Figma 或 Sketch 设计图标。

### 24.3.3 启动画面（Splash Screen）

Unity 免费版会显示 "Made with Unity" 的启动画面。付费版（Unity Pro/Enterprise）可以自定义或移除。

```
Player Settings → Splash Image
├── Show Splash Screen: ✓ (免费版强制开启)
├── Splash Style: Light/Dark
├── Animation: Static/Dolly/Custom
└── Logos: 可以添加自己的 Logo
```

[截图：Splash Screen 设置面板]

### 24.3.4 屏幕方向

```
Player Settings → Resolution and Presentation
├── Default Orientation
│   ├── Portrait          // 竖屏
│   ├── Portrait Upside Down  // 倒置竖屏
│   ├── Landscape Right   // 横屏（Home键在右）
│   ├── Landscape Left    // 横屏（Home键在左）
│   └── Auto Rotation     // 自动旋转
└── Allowed Orientations for Auto Rotation
    ├── Portrait: ✓
    ├── Portrait Upside Down: ✗
    ├── Landscape Right: ✓
    └── Landscape Left: ✓
```

对于开放世界游戏，通常选择 **Landscape Left + Landscape Right**（横屏双向）。

---

## 24.4 Android 构建详解

### 24.4.1 Android 环境配置

#### 通过 Unity Hub 安装（推荐）

Unity Hub 会自动安装匹配版本的：
- **OpenJDK**（Java Development Kit）
- **Android SDK**（Software Development Kit）
- **Android NDK**（Native Development Kit）

你可以在 **Unity → Preferences → External Tools** 中查看和修改路径：

[截图：External Tools 设置，展示 JDK、SDK、NDK 路径]

```
JDK:  /Applications/Unity/Hub/Editor/2022.3.x/PlaybackEngines/AndroidPlayer/OpenJDK
SDK:  /Applications/Unity/Hub/Editor/2022.3.x/PlaybackEngines/AndroidPlayer/SDK
NDK:  /Applications/Unity/Hub/Editor/2022.3.x/PlaybackEngines/AndroidPlayer/NDK
```

> **前端类比**：这类似于 Node.js 开发中需要安装 node、npm、以及各种 native 编译工具（如 node-gyp 需要的 Python 和 C++ 编译器）。Unity Hub 帮你管理了这些依赖，类似于 nvm 管理 Node 版本。

#### 手动配置（仅在需要时）

如果你需要使用特定版本的 SDK：

1. 安装 [Android Studio](https://developer.android.com/studio)
2. 通过 Android Studio 的 SDK Manager 安装所需 SDK 版本
3. 在 Unity 的 External Tools 中取消勾选 "Installed with Unity"，手动指定路径

### 24.4.2 Android Player Settings 详解

#### Scripting Backend（脚本后端）

```
Player Settings → Other Settings → Configuration
├── Scripting Backend
│   ├── Mono     // 快速编译，适合开发阶段
│   └── IL2CPP   // 更好的性能，Google Play 要求 64位 必须用
```

**Mono vs IL2CPP 对比：**

| 特性 | Mono | IL2CPP |
|------|------|--------|
| 编译速度 | 快 | 慢（需要转换为 C++ 再编译） |
| 运行性能 | 一般 | 更好（原生代码） |
| 包体大小 | 较小 | 较大 |
| 64位支持 | 有限 | 完整 |
| 反编译难度 | 容易 | 困难 |
| Google Play | 不支持上架（仅32位） | 必须使用 |

> **推荐**：开发阶段用 Mono 加快迭代速度，发布时切换到 IL2CPP。

#### Target Architecture（目标架构）

```
Player Settings → Other Settings → Configuration
└── Target Architectures
    ├── ARMv7  // 32位 ARM（旧设备）
    ├── ARM64  // 64位 ARM（现代设备，Google Play 强制要求）
    └── x86    // x86 模拟器（一般不需要）
```

**Google Play 要求**：从 2019 年 8 月开始，所有新应用和更新必须支持 **ARM64**。建议同时勾选 ARMv7 和 ARM64。

#### Minimum API Level（最低 API 级别）

```
Player Settings → Other Settings → Identification
├── Minimum API Level: Android 7.0 'Nougat' (API Level 24)  // 推荐最低值
└── Target API Level: Automatic (Highest Installed)           // 目标最新
```

> Google Play 要求 Target API Level 必须满足其当年的最低要求（2024 年要求 API 34+）。

#### 其他重要 Android 设置

```
Player Settings → Other Settings
├── Rendering
│   ├── Color Space: Linear (推荐) 或 Gamma
│   ├── Auto Graphics API: ✗ (手动控制更好)
│   └── Graphics APIs: Vulkan, OpenGLES3
├── Configuration
│   ├── Install Location: Automatic
│   ├── Internet Access: Required (如果游戏需要联网)
│   └── Write Permission: External (SDCard)
└── Optimization
    ├── Managed Stripping Level: Medium 或 High
    └── Strip Engine Code: ✓
```

### 24.4.3 创建 Android Keystore（签名文件）

Android 应用必须使用数字证书签名才能安装和发布。

#### 在 Unity 中创建 Keystore

1. 打开 **Player Settings → Publishing Settings**
2. 勾选 **Custom Keystore**
3. 点击 **Keystore Manager**
4. 选择 **Create New → Anywhere**

[截图：Keystore Manager 界面]

填写以下信息：

```
Keystore（密钥库）：
├── Password: ********          // 密钥库密码（务必记住！）
└── Confirm Password: ********

Key（密钥）：
├── Alias: release-key          // 密钥别名
├── Password: ********          // 密钥密码
├── Validity (years): 25        // 有效期（建议25年以上）
├── First and Last Name: Your Name
├── Organizational Unit: Dev
├── Organization: Your Company
├── City: Your City
├── State: Your State
└── Country Code: CN
```

> **极其重要**：Keystore 文件和密码一旦丢失，你将**永远无法**更新已发布的应用！建议：
> 1. 将 Keystore 文件备份到安全位置（不要放在 Git 仓库中）
> 2. 将密码保存在密码管理器中（如 1Password、Bitwarden）
> 3. 使用 Google Play App Signing 作为额外保障

#### 配置签名

```
Player Settings → Publishing Settings
├── Custom Keystore: ✓
├── Keystore Path: /path/to/your.keystore
├── Keystore Password: ********
├── Key Alias: release-key
└── Key Password: ********
```

[截图：Publishing Settings 中的 Keystore 配置]

### 24.4.4 构建 APK 和 AAB

#### APK vs AAB

| 格式 | 用途 | 说明 |
|------|------|------|
| APK | 测试、直接安装 | 完整的安装包 |
| AAB | Google Play 上架 | Google Play 会根据设备生成优化的 APK |

**Google Play 自 2021 年 8 月起要求新应用必须使用 AAB 格式。**

#### 构建步骤

**构建 APK（测试用）：**

1. **File → Build Settings**
2. 确保平台为 Android
3. 勾选 **Development Build**（开发版，包含调试信息）
4. 点击 **Build**
5. 选择保存路径，等待构建完成

[截图：Build Settings 中的 Android 构建选项]

**构建 AAB（发布用）：**

1. **File → Build Settings**
2. 取消勾选 **Development Build**
3. 勾选 **Build App Bundle (Google Play)**
4. 点击 **Build**
5. 选择保存路径

#### ProGuard / R8 代码混淆

ProGuard（或其继任者 R8）用于：
- 缩小 Java/Kotlin 代码体积
- 混淆代码，增加反编译难度
- 移除未使用的代码

在 Unity 中启用：

```
Player Settings → Publishing Settings
├── Minify
│   ├── Use R8: ✓
│   ├── Release: ✓
│   └── Debug: ✗ (调试时不混淆)
└── Custom Proguard File: (可选，自定义混淆规则)
```

如果遇到 R8 导致的运行时错误，你可能需要创建自定义 ProGuard 规则文件：

```
# proguard-user.txt
# 保留 Unity 相关类
-keep class com.unity3d.** { *; }
-keep class bitter.jnibridge.* { *; }

# 保留你的网络相关类（如果使用反射）
-keep class com.yourcompany.yourgame.network.** { *; }

# 保留 JSON 序列化相关类
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
```

### 24.4.5 在真机上测试

#### 通过 USB 安装 APK

1. 在 Android 设备上启用 **开发者选项** 和 **USB 调试**
2. 用 USB 线连接设备到 Mac
3. 在 Build Settings 中勾选 **Build And Run**
4. Unity 会自动安装并启动应用

#### 使用 adb 命令行

```bash
# 查看连接的设备
adb devices

# 安装 APK
adb install -r path/to/your.apk

# 查看日志（带 Unity 过滤）
adb logcat -s Unity

# 卸载应用
adb uninstall com.yourcompany.yourgame
```

> **前端类比**：`adb logcat` 类似于浏览器的 Console 面板，`adb install` 类似于 `npm run deploy`。

---

## 24.5 iOS 构建详解

### 24.5.1 iOS 环境要求

iOS 构建**只能在 Mac 上**完成（Apple 的限制）。你需要：

1. **macOS**：最新或次新版本
2. **Xcode**：从 Mac App Store 安装（大约 12-15 GB）
3. **Apple Developer 账号**：
   - **免费账号**：可以在真机上调试，但不能上架 App Store
   - **付费账号**（$99/年）：可以上架 App Store，获取证书和 Provisioning Profile

#### 安装 Xcode 命令行工具

```bash
# 安装 Xcode 命令行工具
xcode-select --install

# 确认 Xcode 路径
xcode-select -p
# 输出应为: /Applications/Xcode.app/Contents/Developer

# 接受 Xcode 许可协议
sudo xcodebuild -license accept

# 安装 iOS 模拟器（可选）
xcodebuild -downloadPlatform iOS
```

[截图：终端中执行 xcode-select --install 的结果]

### 24.5.2 iOS Player Settings 详解

```
Player Settings → Other Settings (iOS)
├── Identification
│   ├── Bundle Identifier: com.yourcompany.yourgame
│   ├── Version: 1.0.0
│   ├── Build: 1
│   ├── Signing Team ID: XXXXXXXXXX  // 你的 Apple 开发者团队 ID
│   └── Automatically Sign: ✓ (推荐)
├── Configuration
│   ├── Scripting Backend: IL2CPP   // iOS 必须使用 IL2CPP
│   ├── Target SDK: Device SDK      // 或 Simulator SDK（模拟器调试）
│   ├── Target minimum iOS Version: 15.0  // 推荐最低 iOS 15
│   └── Architecture: ARM64         // 所有现代 iOS 设备
├── Rendering
│   ├── Color Space: Linear
│   ├── Auto Graphics API: ✓
│   └── Graphics APIs: Metal         // iOS 优先使用 Metal
└── Optimization
    ├── Managed Stripping Level: Medium
    ├── Strip Engine Code: ✓
    └── Script Call Optimization: Slow and Safe (调试) / Fast But No Exceptions (发布)
```

#### 关于 Bitcode

> **更新说明**：Apple 从 Xcode 14 开始已经**废弃了 Bitcode**。如果你使用的是 Xcode 14+，不需要关心 Bitcode 设置。对于旧版本 Xcode：

```
Player Settings → Other Settings
└── Enable Bitcode: ✗  // 建议关闭，很多第三方库不支持
```

Bitcode 是 Apple 的中间代码格式，允许 Apple 为特定设备重新优化二进制。但由于许多第三方 SDK（广告、分析等）不支持 Bitcode，在实践中关闭它更省事。

### 24.5.3 iOS 签名配置

#### 自动签名（推荐新手使用）

1. 在 Xcode 中登录你的 Apple ID
2. Unity Player Settings 中勾选 **Automatically Sign**
3. 填入你的 **Signing Team ID**

[截图：Xcode → Preferences → Accounts 中登录 Apple ID]

#### 手动签名（团队协作时使用）

1. 登录 [Apple Developer Portal](https://developer.apple.com)
2. 创建 **Certificates**（开发证书和发布证书）
3. 注册 **Devices**（测试设备的 UDID）
4. 创建 **App ID**
5. 创建 **Provisioning Profiles**

> **前端类比**：iOS 签名系统类似于 HTTPS 证书的概念——你需要一个由 Apple 颁发的证书来证明你的身份，Provisioning Profile 则定义了哪些设备可以运行你的应用。

### 24.5.4 构建 Xcode 项目

1. **File → Build Settings**
2. 确保平台为 **iOS**
3. 配置选项：
   - **Run in Xcode as**: Release（发布）或 Debug（调试）
   - **Development Build**: 勾选（调试时）或不勾选（发布时）
4. 点击 **Build**
5. 选择输出目录（建议创建专门的 `Builds/iOS` 文件夹）

[截图：iOS Build Settings 配置]

Unity 会生成一个 Xcode 项目（`.xcodeproj` 文件）。

### 24.5.5 在 Xcode 中归档和上传

#### 打开 Xcode 项目

```bash
# 在终端中打开生成的 Xcode 项目
open /path/to/Unity-iPhone.xcodeproj
```

#### 配置 Xcode 项目

1. 选择 **Unity-iPhone** target
2. 在 **Signing & Capabilities** 中确认签名配置
3. 在 **General** 中确认版本号和 Bundle Identifier

[截图：Xcode 项目中的 Signing & Capabilities 配置]

#### 真机测试

1. 用 USB 连接 iPhone/iPad
2. 在 Xcode 顶部选择你的设备
3. 点击 **Run**（▶ 按钮）或 `Cmd + R`
4. 首次在设备上运行需要在 **设置 → 通用 → VPN与设备管理** 中信任开发者证书

#### 归档（Archive）上传

1. 在 Xcode 中选择设备为 **Any iOS Device (arm64)**
2. 菜单 **Product → Archive**
3. 等待归档完成（可能需要 5-30 分钟）
4. 归档完成后自动打开 **Organizer** 窗口
5. 选择刚才的归档，点击 **Distribute App**
6. 选择 **App Store Connect**
7. 按提示上传

[截图：Xcode Organizer 窗口，显示已归档的应用]

---

## 24.6 测试分发

### 24.6.1 TestFlight（iOS 测试）

TestFlight 是 Apple 官方的 Beta 测试平台：

1. 在 [App Store Connect](https://appstoreconnect.apple.com) 创建应用
2. 从 Xcode 上传构建
3. 等待 Apple 处理（通常 15-30 分钟）
4. 添加内部测试者（同一团队成员，最多 25 人）或外部测试者（最多 10000 人）
5. 测试者通过 TestFlight App 安装测试版

[截图：App Store Connect 中的 TestFlight 界面]

> **外部测试**需要经过 Apple 的 Beta App Review，通常 24-48 小时。

### 24.6.2 Google Play Console（Android 测试）

1. 注册 [Google Play Console](https://play.google.com/console)（一次性费用 $25）
2. 创建应用
3. 上传 AAB 文件到以下测试轨道之一：

```
Google Play Console 测试轨道：
├── Internal Testing    // 内部测试（最多 100 人，即时生效）
├── Closed Testing      // 封闭测试（通过邮箱邀请）
├── Open Testing        // 公开测试（任何人都能加入）
└── Production          // 正式发布
```

> **推荐流程**：Internal Testing → Closed Testing → Open Testing → Production

### 24.6.3 App Store 和 Play Store 提交概览

#### App Store 提交清单

- [ ] App Store Connect 中创建应用信息
- [ ] 准备截图（6.7"、6.5"、5.5" iPhone + iPad）
- [ ] 编写应用描述、关键词
- [ ] 设置价格和可用地区
- [ ] 配置 App Privacy（隐私标签）
- [ ] 上传构建并选择版本
- [ ] 提交审核（通常 1-3 天）

#### Google Play Store 提交清单

- [ ] 完成 Play Console 中的应用信息
- [ ] 准备截图（手机、7" 平板、10" 平板）
- [ ] 编写应用描述（简短描述 + 完整描述）
- [ ] 设置内容分级（回答问卷）
- [ ] 配置 Data Safety（数据安全声明）
- [ ] 设置价格和分发国家
- [ ] 上传 AAB 到 Production 轨道
- [ ] 提交审核（通常数小时到几天）

---

## 24.7 常见构建错误与解决方案（Mac）

### 24.7.1 Android 构建常见错误

#### 错误1：Gradle Build Failed

```
CommandInvokationFailure: Gradle build failed.
```

**解决方案：**
```
1. 删除 Library/Bee 文件夹，重新构建
2. 检查 Gradle 版本兼容性
3. 在 Preferences → External Tools 中确认 JDK 路径正确
4. 尝试：File → Build Settings → 勾选 "Export Project"，
   在 Android Studio 中构建以获得更详细的错误信息
```

#### 错误2：SDK/NDK 版本不匹配

```
Unable to detect NDK version
Android SDK is not setup correctly
```

**解决方案：**
```
1. 优先使用 Unity Hub 安装的 SDK/NDK
2. 在 Preferences → External Tools 中重新指定路径
3. 确保 Android SDK Platform 版本与 Target API Level 匹配
```

#### 错误3：Keystore 错误

```
Keystore was tampered with, or password was incorrect
```

**解决方案：**
```
1. 确认密码输入正确（注意大小写和特殊字符）
2. 确认 Keystore 文件没有损坏（用 keytool 验证）
3. 确认 Key Alias 名称正确
```

```bash
# 验证 Keystore
keytool -list -keystore /path/to/your.keystore
```

#### 错误4：IL2CPP 编译错误

```
IL2CPP error for type 'XXX'
```

**解决方案：**
```
1. 检查是否有不兼容的第三方库
2. 创建 link.xml 文件保留必要的类型（防止被 stripping 移除）
3. 将 Managed Stripping Level 降低到 Minimal
```

### 24.7.2 iOS 构建常见错误

#### 错误1：Code Signing 失败

```
Code signing is required for product type 'Application'
```

**解决方案：**
```
1. 在 Xcode 中确认签名配置正确
2. 登录正确的 Apple ID
3. 刷新 Provisioning Profile
4. 如果是团队项目，确认你有正确的证书权限
```

#### 错误2：Xcode 版本不兼容

```
Unsupported Xcode version
```

**解决方案：**
```
1. 更新 Xcode 到 Unity 要求的最低版本
2. 或者降级 Unity 到兼容当前 Xcode 的版本
3. 检查 Unity 发布说明中的 Xcode 兼容性信息
```

#### 错误3：CocoaPods 相关错误

```
Pod install failed
```

**解决方案：**
```bash
# 安装 CocoaPods
sudo gem install cocoapods

# 进入 Xcode 项目目录
cd /path/to/xcode/project

# 重新安装 Pods
pod deintegrate
pod install

# 如果 M1/M2 Mac 遇到问题
arch -x86_64 pod install
```

#### 错误4：内存不足

```
Killed: 9 (during IL2CPP compilation)
```

**解决方案：**
```
1. 关闭其他占用内存的应用
2. 增加虚拟内存/交换空间
3. 减少同时编译的文件数量（在 Il2CppCompilerConfiguration 中调整）
4. 考虑升级 Mac 的内存
```

---

## 24.8 BuildHelper.cs 自动化构建工具

下面是一个完整的构建辅助工具，放在 `Assets/Editor` 目录中：

```csharp
// ============================================================
// BuildHelper.cs — 自动化构建辅助工具
// 放置路径：Assets/Editor/BuildHelper.cs
// 功能：提供菜单项和命令行接口来自动化 Android/iOS 构建
// ============================================================

using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;
using System;
using System.IO;
using System.Linq;

/// <summary>
/// 构建辅助工具类
/// 提供自动化构建 Android APK/AAB 和 iOS Xcode 项目的功能
/// 支持通过 Unity 菜单或命令行调用
/// </summary>
public class BuildHelper
{
    // ========================================
    // 构建配置常量
    // ========================================

    /// <summary>构建输出根目录</summary>
    private const string BUILD_ROOT = "Builds";

    /// <summary>Android APK 输出子目录</summary>
    private const string ANDROID_APK_DIR = "Android/APK";

    /// <summary>Android AAB 输出子目录</summary>
    private const string ANDROID_AAB_DIR = "Android/AAB";

    /// <summary>iOS Xcode 项目输出子目录</summary>
    private const string IOS_DIR = "iOS";

    // ========================================
    // 菜单项 — 通过 Unity 编辑器菜单调用
    // ========================================

    /// <summary>
    /// 构建 Android APK（开发版，用于测试）
    /// 从 Unity 菜单 Build → Android APK (Development) 调用
    /// </summary>
    [MenuItem("Build/Android APK (Development)")]
    public static void BuildAndroidAPKDevelopment()
    {
        BuildAndroidAPK(isDevelopment: true);
    }

    /// <summary>
    /// 构建 Android APK（发布版）
    /// 从 Unity 菜单 Build → Android APK (Release) 调用
    /// </summary>
    [MenuItem("Build/Android APK (Release)")]
    public static void BuildAndroidAPKRelease()
    {
        BuildAndroidAPK(isDevelopment: false);
    }

    /// <summary>
    /// 构建 Android AAB（用于 Google Play 上架）
    /// 从 Unity 菜单 Build → Android AAB (Google Play) 调用
    /// </summary>
    [MenuItem("Build/Android AAB (Google Play)")]
    public static void BuildAndroidAAB()
    {
        BuildAndroid(isAAB: true, isDevelopment: false);
    }

    /// <summary>
    /// 构建 iOS Xcode 项目（开发版）
    /// 从 Unity 菜单 Build → iOS Xcode (Development) 调用
    /// </summary>
    [MenuItem("Build/iOS Xcode (Development)")]
    public static void BuildIOSDevelopment()
    {
        BuildIOS(isDevelopment: true);
    }

    /// <summary>
    /// 构建 iOS Xcode 项目（发布版）
    /// 从 Unity 菜单 Build → iOS Xcode (Release) 调用
    /// </summary>
    [MenuItem("Build/iOS Xcode (Release)")]
    public static void BuildIOSRelease()
    {
        BuildIOS(isDevelopment: false);
    }

    // ========================================
    // Android 构建方法
    // ========================================

    /// <summary>
    /// 构建 Android APK
    /// </summary>
    /// <param name="isDevelopment">是否为开发版（包含调试信息和性能分析器）</param>
    private static void BuildAndroidAPK(bool isDevelopment)
    {
        BuildAndroid(isAAB: false, isDevelopment: isDevelopment);
    }

    /// <summary>
    /// Android 构建核心方法
    /// </summary>
    /// <param name="isAAB">true=构建 AAB（Google Play），false=构建 APK（测试）</param>
    /// <param name="isDevelopment">是否为开发版</param>
    private static void BuildAndroid(bool isAAB, bool isDevelopment)
    {
        Debug.Log($"[BuildHelper] 开始 Android 构建 - 格式:{(isAAB ? "AAB" : "APK")}, " +
                  $"模式:{(isDevelopment ? "Development" : "Release")}");

        // 确保切换到 Android 平台
        if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.Android)
        {
            Debug.Log("[BuildHelper] 切换到 Android 平台...");
            EditorUserBuildSettings.SwitchActiveBuildTarget(
                BuildTargetGroup.Android, BuildTarget.Android);
        }

        // 配置 Android 特定设置
        ConfigureAndroidSettings(isAAB, isDevelopment);

        // 确定输出路径
        string outputDir = isAAB ? ANDROID_AAB_DIR : ANDROID_APK_DIR;
        string extension = isAAB ? "aab" : "apk";
        string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        string fileName = $"{Application.productName}_{timestamp}.{extension}";
        string outputPath = Path.Combine(BUILD_ROOT, outputDir, fileName);

        // 确保输出目录存在
        EnsureDirectoryExists(Path.GetDirectoryName(outputPath));

        // 获取所有启用的场景
        string[] scenes = GetEnabledScenes();
        if (scenes.Length == 0)
        {
            Debug.LogError("[BuildHelper] 没有找到启用的场景！请在 Build Settings 中添加场景。");
            return;
        }

        // 配置构建选项
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = outputPath,
            target = BuildTarget.Android,
            options = isDevelopment
                ? BuildOptions.Development | BuildOptions.ConnectWithProfiler
                : BuildOptions.None
        };

        // 执行构建
        ExecuteBuild(options, "Android");
    }

    /// <summary>
    /// 配置 Android 平台特定的构建设置
    /// </summary>
    /// <param name="isAAB">是否构建 AAB 格式</param>
    /// <param name="isDevelopment">是否为开发版</param>
    private static void ConfigureAndroidSettings(bool isAAB, bool isDevelopment)
    {
        // 设置构建格式：AAB 或 APK
        EditorUserBuildSettings.buildAppBundle = isAAB;

        // 发布版使用 IL2CPP 获得更好的性能和安全性
        // 开发版使用 Mono 加快编译速度
        PlayerSettings.SetScriptingBackend(
            BuildTargetGroup.Android,
            isDevelopment ? ScriptingImplementation.Mono2x : ScriptingImplementation.IL2CPP);

        // 设置目标架构为 ARM64（Google Play 要求）
        // 开发版可以只构建当前设备架构以加快编译
        if (isDevelopment)
        {
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
        }
        else
        {
            // 发布版同时支持 ARMv7 和 ARM64
            PlayerSettings.Android.targetArchitectures =
                AndroidArchitecture.ARMv7 | AndroidArchitecture.ARM64;
        }

        // 设置最低 API Level
        PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel24;

        Debug.Log($"[BuildHelper] Android 配置完成 - " +
                  $"后端:{(isDevelopment ? "Mono" : "IL2CPP")}, " +
                  $"架构:{PlayerSettings.Android.targetArchitectures}, " +
                  $"AAB:{isAAB}");
    }

    // ========================================
    // iOS 构建方法
    // ========================================

    /// <summary>
    /// iOS 构建核心方法
    /// </summary>
    /// <param name="isDevelopment">是否为开发版</param>
    private static void BuildIOS(bool isDevelopment)
    {
        Debug.Log($"[BuildHelper] 开始 iOS 构建 - 模式:{(isDevelopment ? "Development" : "Release")}");

        // macOS 检查
#if !UNITY_EDITOR_OSX
        Debug.LogError("[BuildHelper] iOS 构建只能在 macOS 上执行！");
        return;
#endif

        // 确保切换到 iOS 平台
        if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.iOS)
        {
            Debug.Log("[BuildHelper] 切换到 iOS 平台...");
            EditorUserBuildSettings.SwitchActiveBuildTarget(
                BuildTargetGroup.iOS, BuildTarget.iOS);
        }

        // 配置 iOS 特定设置
        ConfigureIOSSettings(isDevelopment);

        // 确定输出路径
        string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        string outputPath = Path.Combine(BUILD_ROOT, IOS_DIR, $"Build_{timestamp}");

        // 确保输出目录存在
        EnsureDirectoryExists(outputPath);

        // 获取所有启用的场景
        string[] scenes = GetEnabledScenes();
        if (scenes.Length == 0)
        {
            Debug.LogError("[BuildHelper] 没有找到启用的场景！请在 Build Settings 中添加场景。");
            return;
        }

        // 配置构建选项
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = outputPath,
            target = BuildTarget.iOS,
            options = isDevelopment
                ? BuildOptions.Development | BuildOptions.ConnectWithProfiler
                : BuildOptions.None
        };

        // 执行构建
        ExecuteBuild(options, "iOS");
    }

    /// <summary>
    /// 配置 iOS 平台特定的构建设置
    /// </summary>
    /// <param name="isDevelopment">是否为开发版</param>
    private static void ConfigureIOSSettings(bool isDevelopment)
    {
        // iOS 必须使用 IL2CPP
        PlayerSettings.SetScriptingBackend(
            BuildTargetGroup.iOS,
            ScriptingImplementation.IL2CPP);

        // 设置目标 iOS 最低版本
        PlayerSettings.iOS.targetOSVersionString = "15.0";

        // 设置架构为 ARM64
        PlayerSettings.SetArchitecture(BuildTargetGroup.iOS, 1); // 1 = ARM64

        // 自动签名（推荐）
        PlayerSettings.iOS.appleEnableAutomaticSigning = true;

        // 开发版优化编译速度
        if (isDevelopment)
        {
            // 开发版降低优化等级以加快编译
            PlayerSettings.SetManagedStrippingLevel(
                BuildTargetGroup.iOS,
                ManagedStrippingLevel.Minimal);
        }
        else
        {
            // 发布版使用较高的 stripping 等级来减小包体
            PlayerSettings.SetManagedStrippingLevel(
                BuildTargetGroup.iOS,
                ManagedStrippingLevel.Medium);
        }

        Debug.Log($"[BuildHelper] iOS 配置完成 - " +
                  $"最低版本:iOS {PlayerSettings.iOS.targetOSVersionString}, " +
                  $"自动签名:{PlayerSettings.iOS.appleEnableAutomaticSigning}");
    }

    // ========================================
    // 构建执行与报告
    // ========================================

    /// <summary>
    /// 执行构建并输出结果报告
    /// </summary>
    /// <param name="options">构建选项</param>
    /// <param name="platformName">平台名称（用于日志）</param>
    private static void ExecuteBuild(BuildPlayerOptions options, string platformName)
    {
        Debug.Log($"[BuildHelper] 开始构建 {platformName}...");
        Debug.Log($"[BuildHelper] 输出路径: {options.locationPathName}");
        Debug.Log($"[BuildHelper] 场景数量: {options.scenes.Length}");

        // 记录开始时间
        DateTime startTime = DateTime.Now;

        // 执行构建
        BuildReport report = BuildPipeline.BuildPlayer(options);
        BuildSummary summary = report.summary;

        // 计算构建时间
        TimeSpan buildTime = DateTime.Now - startTime;

        // 输出构建报告
        switch (summary.result)
        {
            case BuildResult.Succeeded:
                Debug.Log($"[BuildHelper] === {platformName} 构建成功 ===");
                Debug.Log($"[BuildHelper] 输出路径: {summary.outputPath}");
                Debug.Log($"[BuildHelper] 包体大小: {FormatFileSize(summary.totalSize)}");
                Debug.Log($"[BuildHelper] 构建时间: {buildTime:hh\\:mm\\:ss}");
                Debug.Log($"[BuildHelper] 警告数量: {summary.totalWarnings}");
                Debug.Log($"[BuildHelper] 错误数量: {summary.totalErrors}");

                // 在 Finder 中打开输出目录
                EditorUtility.RevealInFinder(summary.outputPath);
                break;

            case BuildResult.Failed:
                Debug.LogError($"[BuildHelper] === {platformName} 构建失败 ===");
                Debug.LogError($"[BuildHelper] 错误数量: {summary.totalErrors}");

                // 输出详细错误信息
                foreach (var step in report.steps)
                {
                    foreach (var message in step.messages)
                    {
                        if (message.type == LogType.Error)
                        {
                            Debug.LogError($"[BuildHelper] 错误: {message.content}");
                        }
                    }
                }
                break;

            case BuildResult.Cancelled:
                Debug.LogWarning($"[BuildHelper] {platformName} 构建被取消");
                break;

            case BuildResult.Unknown:
                Debug.LogWarning($"[BuildHelper] {platformName} 构建结果未知");
                break;
        }
    }

    // ========================================
    // 命令行接口 — 用于 CI/CD 自动化构建
    // ========================================

    /// <summary>
    /// 通过命令行构建 Android APK
    /// 调用方式：
    /// Unity -batchmode -quit -executeMethod BuildHelper.CLI_BuildAndroidAPK
    /// </summary>
    public static void CLI_BuildAndroidAPK()
    {
        Debug.Log("[BuildHelper] CLI: 构建 Android APK...");
        BuildAndroidAPK(isDevelopment: false);
    }

    /// <summary>
    /// 通过命令行构建 Android AAB
    /// 调用方式：
    /// Unity -batchmode -quit -executeMethod BuildHelper.CLI_BuildAndroidAAB
    /// </summary>
    public static void CLI_BuildAndroidAAB()
    {
        Debug.Log("[BuildHelper] CLI: 构建 Android AAB...");
        BuildAndroid(isAAB: true, isDevelopment: false);
    }

    /// <summary>
    /// 通过命令行构建 iOS
    /// 调用方式：
    /// Unity -batchmode -quit -executeMethod BuildHelper.CLI_BuildIOS
    /// </summary>
    public static void CLI_BuildIOS()
    {
        Debug.Log("[BuildHelper] CLI: 构建 iOS Xcode 项目...");
        BuildIOS(isDevelopment: false);
    }

    // ========================================
    // 辅助方法
    // ========================================

    /// <summary>
    /// 获取 Build Settings 中所有启用的场景路径
    /// </summary>
    /// <returns>启用的场景路径数组</returns>
    private static string[] GetEnabledScenes()
    {
        return EditorBuildSettings.scenes
            .Where(scene => scene.enabled)     // 只取启用的场景
            .Select(scene => scene.path)       // 获取场景路径
            .ToArray();
    }

    /// <summary>
    /// 确保目录存在，如果不存在则创建
    /// </summary>
    /// <param name="path">目录路径</param>
    private static void EnsureDirectoryExists(string path)
    {
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
            Debug.Log($"[BuildHelper] 创建目录: {path}");
        }
    }

    /// <summary>
    /// 格式化文件大小为人类可读的格式
    /// </summary>
    /// <param name="bytes">字节数</param>
    /// <returns>格式化的文件大小字符串（如 "123.4 MB"）</returns>
    private static string FormatFileSize(ulong bytes)
    {
        string[] sizes = { "B", "KB", "MB", "GB" };
        double len = bytes;
        int order = 0;

        while (len >= 1024 && order < sizes.Length - 1)
        {
            order++;
            len /= 1024;
        }

        return $"{len:0.##} {sizes[order]}";
    }

    // ========================================
    // 构建前验证
    // ========================================

    /// <summary>
    /// 验证当前项目的构建配置是否正确
    /// 通过菜单 Build → Validate Build Settings 调用
    /// </summary>
    [MenuItem("Build/Validate Build Settings")]
    public static void ValidateBuildSettings()
    {
        Debug.Log("[BuildHelper] ===== 开始验证构建设置 =====");
        bool hasIssues = false;

        // 检查 Bundle Identifier
        string bundleId = PlayerSettings.applicationIdentifier;
        if (string.IsNullOrEmpty(bundleId) || bundleId.Contains("com.Company.ProductName"))
        {
            Debug.LogWarning("[BuildHelper] Bundle Identifier 未设置或使用了默认值！" +
                           $"当前值: {bundleId}");
            hasIssues = true;
        }
        else
        {
            Debug.Log($"[BuildHelper] Bundle Identifier: {bundleId} ✓");
        }

        // 检查版本号
        string version = PlayerSettings.bundleVersion;
        if (string.IsNullOrEmpty(version) || version == "0.1")
        {
            Debug.LogWarning($"[BuildHelper] 版本号可能需要更新: {version}");
            hasIssues = true;
        }
        else
        {
            Debug.Log($"[BuildHelper] 版本号: {version} ✓");
        }

        // 检查场景列表
        var scenes = EditorBuildSettings.scenes;
        int enabledSceneCount = scenes.Count(s => s.enabled);
        if (enabledSceneCount == 0)
        {
            Debug.LogError("[BuildHelper] Build Settings 中没有启用的场景！");
            hasIssues = true;
        }
        else
        {
            Debug.Log($"[BuildHelper] 启用的场景数量: {enabledSceneCount} ✓");
            foreach (var scene in scenes.Where(s => s.enabled))
            {
                Debug.Log($"  - {scene.path}");
            }
        }

        // Android 特定检查
        Debug.Log("[BuildHelper] --- Android 设置检查 ---");

        // 检查 Keystore（如果目标是 Android）
        if (!string.IsNullOrEmpty(PlayerSettings.Android.keystoreName))
        {
            if (File.Exists(PlayerSettings.Android.keystoreName))
            {
                Debug.Log($"[BuildHelper] Keystore 路径: {PlayerSettings.Android.keystoreName} ✓");
            }
            else
            {
                Debug.LogError($"[BuildHelper] Keystore 文件不存在: " +
                             $"{PlayerSettings.Android.keystoreName}");
                hasIssues = true;
            }
        }
        else
        {
            Debug.LogWarning("[BuildHelper] 未配置 Keystore（使用调试签名）");
        }

        // 检查 Android 最低 API Level
        Debug.Log($"[BuildHelper] Android 最低 API: " +
                  $"{PlayerSettings.Android.minSdkVersion}");

        // 检查架构设置
        var arch = PlayerSettings.Android.targetArchitectures;
        if ((arch & AndroidArchitecture.ARM64) == 0)
        {
            Debug.LogWarning("[BuildHelper] 未包含 ARM64 架构！Google Play 要求支持 64位。");
            hasIssues = true;
        }
        else
        {
            Debug.Log($"[BuildHelper] Android 架构: {arch} ✓");
        }

        // iOS 特定检查
        Debug.Log("[BuildHelper] --- iOS 设置检查 ---");
        Debug.Log($"[BuildHelper] iOS 最低版本: {PlayerSettings.iOS.targetOSVersionString}");
        Debug.Log($"[BuildHelper] 自动签名: {PlayerSettings.iOS.appleEnableAutomaticSigning}");

        if (string.IsNullOrEmpty(PlayerSettings.iOS.appleDeveloperTeamID))
        {
            Debug.LogWarning("[BuildHelper] 未设置 Apple Developer Team ID！");
            hasIssues = true;
        }
        else
        {
            Debug.Log($"[BuildHelper] Team ID: {PlayerSettings.iOS.appleDeveloperTeamID} ✓");
        }

        // 总结
        if (hasIssues)
        {
            Debug.LogWarning("[BuildHelper] ===== 验证完成：发现问题，请检查上方警告 =====");
        }
        else
        {
            Debug.Log("[BuildHelper] ===== 验证完成：所有设置看起来正常 =====");
        }
    }

    // ========================================
    // 版本号管理
    // ========================================

    /// <summary>
    /// 自动递增构建号
    /// 每次构建前调用，确保构建号唯一递增
    /// </summary>
    [MenuItem("Build/Increment Build Number")]
    public static void IncrementBuildNumber()
    {
        // Android Bundle Version Code 递增
        int androidCode = PlayerSettings.Android.bundleVersionCode;
        PlayerSettings.Android.bundleVersionCode = androidCode + 1;

        // iOS Build Number 递增
        string iosBuild = PlayerSettings.iOS.buildNumber;
        if (int.TryParse(iosBuild, out int iosBuildNum))
        {
            PlayerSettings.iOS.buildNumber = (iosBuildNum + 1).ToString();
        }
        else
        {
            PlayerSettings.iOS.buildNumber = "1";
        }

        Debug.Log($"[BuildHelper] 构建号递增 - " +
                  $"Android: {androidCode} → {PlayerSettings.Android.bundleVersionCode}, " +
                  $"iOS: {iosBuild} → {PlayerSettings.iOS.buildNumber}");
    }
}
```

### 24.8.1 使用 BuildHelper

#### 通过 Unity 菜单使用

安装好 BuildHelper.cs 后，Unity 菜单栏会出现 **Build** 菜单：

```
Build
├── Android APK (Development)     // 快速测试用 APK
├── Android APK (Release)         // 正式 APK
├── Android AAB (Google Play)     // Google Play 发布用
├── iOS Xcode (Development)       // iOS 开发版
├── iOS Xcode (Release)           // iOS 发布版
├── Validate Build Settings       // 验证构建配置
└── Increment Build Number        // 递增构建号
```

[截图：Unity 菜单栏中的 Build 菜单]

#### 通过命令行使用（CI/CD）

```bash
# 构建 Android APK
/Applications/Unity/Hub/Editor/2022.3.x/Unity.app/Contents/MacOS/Unity \
  -batchmode -quit -nographics \
  -projectPath /path/to/your/project \
  -executeMethod BuildHelper.CLI_BuildAndroidAPK \
  -logFile build_android.log

# 构建 Android AAB
/Applications/Unity/Hub/Editor/2022.3.x/Unity.app/Contents/MacOS/Unity \
  -batchmode -quit -nographics \
  -projectPath /path/to/your/project \
  -executeMethod BuildHelper.CLI_BuildAndroidAAB \
  -logFile build_aab.log

# 构建 iOS Xcode 项目
/Applications/Unity/Hub/Editor/2022.3.x/Unity.app/Contents/MacOS/Unity \
  -batchmode -quit -nographics \
  -projectPath /path/to/your/project \
  -executeMethod BuildHelper.CLI_BuildIOS \
  -logFile build_ios.log
```

> **前端类比**：这类似于在 CI/CD 中运行 `npm run build`。`-batchmode` 表示无 GUI 运行，`-quit` 表示构建完成后退出，`-executeMethod` 指定要调用的静态方法。

---

## 24.9 构建优化技巧

### 24.9.1 减小包体大小

```
1. 移除未使用的资源（Assets → 右键 → Select Dependencies 检查引用）
2. 压缩纹理（使用 ASTC 格式，见第26章）
3. 优化音频（降低采样率、使用 Vorbis 压缩）
4. 启用 Strip Engine Code（移除未使用的 Unity 模块代码）
5. 使用 Managed Stripping Level: High（需要配合 link.xml）
6. 使用 Addressables 实现按需下载（见第26章）
```

### 24.9.2 加速构建过程

```
1. 开发阶段使用 Mono 而不是 IL2CPP
2. 只构建单一架构（ARM64）
3. 使用增量构建（不要每次 Clean Build）
4. 关闭不需要的 Unity 模块
5. 使用 Asset Pipeline v2 缓存
6. 考虑使用 Unity Accelerator（团队共享构建缓存）
```

### 24.9.3 link.xml 示例

当使用 High Stripping Level 时，某些通过反射调用的代码可能被误删。使用 `link.xml` 保留必要的类型：

```xml
<!-- Assets/link.xml -->
<linker>
    <!-- 保留整个命名空间 -->
    <assembly fullname="Assembly-CSharp">
        <!-- 保留所有网络相关类 -->
        <namespace fullname="YourGame.Networking" preserve="all"/>
        <!-- 保留特定类 -->
        <type fullname="YourGame.Data.SaveData" preserve="all"/>
    </assembly>

    <!-- 保留 JSON 序列化需要的类型 -->
    <assembly fullname="Newtonsoft.Json" preserve="all"/>

    <!-- 保留 Unity UI 相关 -->
    <assembly fullname="UnityEngine.UI" preserve="all"/>
</linker>
```

---

## 24.10 完整构建流程检查清单

### Android 发布检查清单

- [ ] Bundle Identifier 设置正确
- [ ] 版本号和 Bundle Version Code 已更新
- [ ] 图标已配置（包括自适应图标）
- [ ] Scripting Backend 设为 IL2CPP
- [ ] Target Architecture 包含 ARM64
- [ ] Minimum API Level 设置合理（建议 API 24+）
- [ ] Keystore 已配置并已备份
- [ ] ProGuard/R8 已启用（可选但推荐）
- [ ] Development Build 已取消勾选
- [ ] Build App Bundle 已勾选（Google Play）
- [ ] 在真机上测试通过
- [ ] Google Play Console 内部测试通过

### iOS 发布检查清单

- [ ] Bundle Identifier 设置正确
- [ ] 版本号和 Build Number 已更新
- [ ] 图标已配置（所有尺寸）
- [ ] Signing 配置正确（Team ID、自动签名）
- [ ] Minimum iOS Version 设置合理（建议 iOS 15+）
- [ ] Development Build 已取消勾选
- [ ] Script Call Optimization 设为 Fast But No Exceptions
- [ ] 在真机上测试通过
- [ ] Xcode 归档和上传成功
- [ ] TestFlight 测试通过

---

## 练习题

### 练习1：基础构建（难度：简单）
创建一个简单的 Unity 项目（包含一个场景和一个旋转的立方体），分别构建 Android APK 和 iOS Xcode 项目。记录构建时间和包体大小。

### 练习2：自动化构建（难度：中等）
扩展 BuildHelper.cs，添加以下功能：
1. 构建前自动递增版本号
2. 构建完成后自动将 APK 复制到指定的共享文件夹
3. 生成包含版本号、构建时间、Git Commit Hash 的构建日志文件

### 练习3：多渠道构建（难度：高级）
修改 BuildHelper.cs，支持多渠道构建：
1. 根据命令行参数读取不同的构建配置（如 `dev`、`staging`、`production`）
2. 每个配置使用不同的 Bundle Identifier（如 `com.company.game.dev`）
3. 每个配置连接不同的服务器地址

### 练习4：CI/CD 集成（难度：高级）
创建一个 GitHub Actions workflow 文件，实现：
1. 当推送到 `release` 分支时自动触发构建
2. 分别构建 Android AAB 和 iOS Xcode 项目
3. 将构建产物上传为 GitHub Actions Artifacts

> **提示**：可以使用 [GameCI](https://game.ci) 提供的 GitHub Actions 来简化 Unity CI/CD 配置。

---

## 下一章预告

在下一章**第25章：网络基础**中，我们将学习：
- 多人游戏网络架构（客户端-服务器、P2P、中继）
- Unity Netcode for GameObjects 基础
- 网络变量同步和 RPC 调用
- REST API 集成（连接后端服务）
- 构建基础的大厅和匹配系统

作为有前端/全栈经验的开发者，你会发现网络编程中很多概念（如 REST API、WebSocket）都有你熟悉的对应物，但游戏网络的实时性和状态同步带来了独特的挑战。让我们开始探索多人游戏的世界吧！
