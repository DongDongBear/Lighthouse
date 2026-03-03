# 第一章：Mac 环境搭建 —— 从零配置 Unity 开发环境

> **本章目标**
>
> - 安装 Unity Hub 并理解其作用
> - 安装 Unity Editor 2022 LTS 版本
> - 配置 VS Code + C# Dev Kit 作为代码编辑器
> - 使用 URP 模板创建第一个 Unity 项目
> - 设置 Git LFS 进行版本控制
> - 深入理解 Unity 项目的文件夹结构

> **预计学习时间：90 - 120 分钟**（包含下载等待时间）

---

## 1.1 开始之前

### 1.1.1 系统要求

在开始安装之前，请确认你的 Mac 满足以下最低要求：

| 要求 | 最低配置 | 推荐配置 |
|---|---|---|
| macOS 版本 | macOS 12 (Monterey) | macOS 13+ (Ventura / Sonoma) |
| 处理器 | Intel Core i5 / Apple M1 | Apple M1 Pro 或更高 |
| 内存 | 8 GB | 16 GB 或更多 |
| 磁盘空间 | 20 GB 可用 | 50 GB+ 可用（SSD）|
| 显卡 | 支持 Metal 的 GPU | Apple Silicon 集成 GPU 即可 |

> **Apple Silicon 用户注意**：如果你使用 M1/M2/M3 系列芯片的 Mac，Unity 已经原生支持 Apple Silicon，运行效率非常好。

### 1.1.2 类比理解：安装过程

对于 Web 开发者来说，安装过程可以这样类比：

```
Web 开发                    Unity 开发
─────────                    ──────────
nvm (Node 版本管理器)    →   Unity Hub（Unity 版本管理器）
Node.js (运行时)          →   Unity Editor（编辑器 + 运行时）
VS Code (代码编辑器)     →   VS Code（同样使用 VS Code！）
npm / yarn / pnpm        →   Unity Package Manager
create-react-app         →   Unity 项目模板
```

---

## 1.2 安装 Unity Hub

Unity Hub 是 Unity 的版本管理器和项目管理器，类似于 `nvm` 管理不同版本的 Node.js。通过 Unity Hub，你可以：

- 安装和管理多个 Unity Editor 版本
- 创建和打开项目
- 管理 Unity 许可证
- 下载学习资源

### 1.2.1 下载 Unity Hub

1. 打开浏览器，访问 [Unity 官网下载页面](https://unity.com/download)

[截图：Unity 官网下载页面，突出 "Download for Mac" 按钮]

2. 点击 **"Download for Mac"** 按钮
3. 等待 `UnityHubSetup.dmg` 下载完成

### 1.2.2 安装 Unity Hub

1. 双击下载好的 `UnityHubSetup.dmg` 文件
2. 将 Unity Hub 图标拖拽到 Applications 文件夹

[截图：macOS 标准的 DMG 安装界面，显示拖拽 Unity Hub 到 Applications]

3. 打开 Launchpad 或 Applications 文件夹，找到并启动 Unity Hub
4. 如果 macOS 提示"无法验证开发者"，前往 **系统设置 → 隐私与安全性**，点击 **"仍要打开"**

[截图：macOS 安全提示对话框]

### 1.2.3 创建 Unity 账户并登录

1. 首次打开 Unity Hub，会提示你登录或创建账户
2. 点击 **"Create account"** 或 **"Sign in"**
3. 使用邮箱注册一个 Unity ID（建议使用你常用的邮箱）
4. 完成邮箱验证
5. 回到 Unity Hub，使用刚注册的账号登录

[截图：Unity Hub 登录界面]

### 1.2.4 激活个人许可证

登录后，Unity Hub 会要求你激活许可证：

1. 点击左下角的齿轮图标（设置）
2. 选择 **"Licenses"** 选项卡
3. 点击 **"Add"** 或 **"Activate New License"**
4. 选择 **"Unity Personal"**（免费个人版）
5. 确认你符合使用条件（年收入低于 $200,000）

[截图：Unity Hub 许可证激活界面，选择 Personal 选项]

> **许可证说明**：Unity Personal 完全免费，功能与 Pro 版本基本一致。唯一的限制是启动画面会显示 "Made with Unity" 标识。对于学习和小型项目来说完全足够。

---

## 1.3 安装 Unity Editor

### 1.3.1 为什么选择 2022 LTS？

Unity 的版本发布策略类似 Node.js：

```
Node.js 版本策略:
├── LTS (Long Term Support)  ← 推荐用于生产
└── Current                  ← 最新特性，但可能不稳定

Unity 版本策略:
├── LTS (2022.3.x)          ← 推荐用于生产和学习
├── Tech Stream (2023.x)    ← 新特性预览
└── Alpha / Beta (6.x)      ← 实验性
```

我们选择 **Unity 2022.3 LTS** 的理由：
- **稳定性最好**：经过长期维护和 bug 修复
- **支持周期长**：官方长期维护
- **教程兼容性好**：大部分学习资源基于 LTS 版本
- **URP 成熟度高**：Universal Render Pipeline 在此版本已经非常稳定

### 1.3.2 安装步骤

1. 在 Unity Hub 中，点击左侧的 **"Installs"** 选项卡
2. 点击右上角的 **"Install Editor"** 按钮
3. 在弹出的版本列表中，找到 **"2022.3.x LTS"**（x 为最新的补丁版本）
4. 点击 **"Install"**

[截图：Unity Hub 的 Installs 页面，显示可用版本列表，2022.3 LTS 高亮]

### 1.3.3 选择安装模块

在安装过程中，Unity Hub 会让你选择额外的模块。请勾选以下选项：

```
安装模块（建议选择）:
├── ✅ Dev Tools
│   └── ✅ Visual Studio Code Editor   -- VS Code 集成支持
├── ✅ Platforms
│   ├── ✅ iOS Build Support           -- iOS 打包（需要 Xcode）
│   ├── ✅ Android Build Support        -- Android 打包
│   │   ├── ✅ Android SDK & NDK Tools  -- Android 开发工具
│   │   └── ✅ OpenJDK                  -- Java 运行环境
│   └── ❌ 其他平台（暂不需要）
└── ✅ Documentation                    -- 本地文档
```

[截图：Unity Hub 模块选择界面，标注推荐勾选的模块]

> **磁盘空间提示**：完整安装（含 iOS 和 Android 支持）大约需要 15-20 GB。如果磁盘空间紧张，可以先只安装核心编辑器，后续通过 **"Add Modules"** 添加平台支持。

### 1.3.4 等待安装

安装过程可能需要 30-60 分钟，取决于你的网络速度。在等待期间，我们可以先配置 VS Code。

[截图：Unity Hub 安装进度条]

---

## 1.4 配置 VS Code 作为代码编辑器

### 1.4.1 为什么用 VS Code 而不是 Visual Studio？

作为前端开发者，你已经对 VS Code 非常熟悉了。好消息是 Unity 完全支持 VS Code 作为外部代码编辑器。相比 Visual Studio for Mac（已经停止维护），VS Code 的优势是：

- 你已经熟悉了它的快捷键和插件生态
- 更轻量、启动更快
- 跨平台一致的体验
- C# Dev Kit 提供了完整的 C# 开发支持

### 1.4.2 安装必要的 VS Code 扩展

打开 VS Code，安装以下扩展：

**必须安装：**

1. **C# Dev Kit**（Microsoft 官方出品）
   - 扩展 ID：`ms-dotnettools.csdevkit`
   - 提供：智能补全、代码导航、重构、调试支持

[截图：VS Code 扩展市场，搜索 "C# Dev Kit" 的结果]

2. **Unity**（Microsoft 官方出品）
   - 扩展 ID：`visualstudiotoolsforunity.vstuc`
   - 提供：Unity 特定的代码补全、Shader 高亮、Unity 消息方法补全

3. **.NET Install Tool**（通常会随 C# Dev Kit 自动安装）
   - 扩展 ID：`ms-dotnettools.vscode-dotnet-runtime`

**推荐安装：**

4. **Unity Code Snippets**
   - 快速生成 Unity 常用代码模板
   - 输入 `mono` 自动生成 MonoBehaviour 模板

5. **C# XML Documentation Comments**
   - 输入 `///` 自动生成 XML 文档注释

你可以通过命令行一次性安装这些扩展：

```bash
# 在终端中执行
code --install-extension ms-dotnettools.csdevkit
code --install-extension visualstudiotoolsforunity.vstuc
code --install-extension ms-dotnettools.vscode-dotnet-runtime
```

### 1.4.3 安装 .NET SDK

C# Dev Kit 需要 .NET SDK。如果尚未安装：

```bash
# 使用 Homebrew 安装（推荐）
brew install dotnet-sdk

# 验证安装
dotnet --version
# 应该输出类似 8.0.x 的版本号
```

如果你没有安装 Homebrew：

```bash
# 先安装 Homebrew（如果还没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 然后安装 .NET SDK
brew install dotnet-sdk
```

### 1.4.4 VS Code 设置优化

在 VS Code 的 `settings.json` 中添加以下配置，优化 Unity C# 开发体验：

```json
{
  // Unity C# 相关设置
  "omnisharp.useModernNet": true,
  "dotnet.defaultSolution": "disable",

  // 文件关联
  "files.associations": {
    "*.shader": "hlsl",
    "*.cginc": "hlsl",
    "*.compute": "hlsl"
  },

  // 排除 Unity 生成的文件，避免干扰搜索
  "files.exclude": {
    "**/*.meta": true,
    "**/Library": true,
    "**/Temp": true,
    "**/Logs": true,
    "**/obj": true
  },

  // 搜索排除
  "search.exclude": {
    "**/Library": true,
    "**/Temp": true,
    "**/Logs": true,
    "**/*.asset": true,
    "**/*.unity": true
  },

  // C# 格式化
  "editor.formatOnSave": true,
  "[csharp]": {
    "editor.defaultFormatter": "ms-dotnettools.csharp",
    "editor.tabSize": 4,
    "editor.insertSpaces": true
  }
}
```

> **注意**：这些设置可以添加到项目级别的 `.vscode/settings.json` 中，这样不会影响你其他的 Web 项目。

---

## 1.5 创建第一个 Unity 项目

### 1.5.1 什么是 URP？

在创建项目之前，我们需要了解 Unity 的渲染管线：

```
Unity 渲染管线:
├── Built-in Render Pipeline  -- 旧版默认管线（不推荐）
├── URP (Universal RP)        -- 通用渲染管线 ← 我们用这个
└── HDRP (High Definition RP) -- 高清渲染管线（PC/主机 3A 大作）
```

**URP (Universal Render Pipeline)** 是我们的选择，原因是：
- 专为**跨平台**设计，特别是移动端
- **性能优秀**：针对移动端 GPU 优化
- **Shader Graph**：可视化着色器编辑
- **功能够用**：支持 PBR 材质、后处理效果、阴影等
- **社区主流**：大量教程和资源基于 URP

类比 Web 开发：
```
URP  ≈ Next.js（平衡性能和功能，适合大多数场景）
HDRP ≈ 完全自定义的 SSR 方案（极致性能，但复杂）
Built-in ≈ jQuery（老旧但仍有项目在用）
```

### 1.5.2 创建项目步骤

1. 打开 Unity Hub
2. 点击左侧的 **"Projects"** 选项卡
3. 点击右上角的 **"New project"** 按钮
4. 在模板选择界面中进行如下配置：

[截图：Unity Hub 新建项目界面，标注各个配置选项]

配置详情：

```
Editor Version: 2022.3.x LTS（选择你安装的版本）
Template:       3D (URP)          ← 选择 "3D (URP)" 模板
Project name:   BellLabOpenWorld  ← 项目名称（无空格）
Location:       /Users/你的用户名/Unity/Projects  ← 项目保存路径
```

> **命名规范**：Unity 项目名建议使用 PascalCase（大驼峰），不包含空格和特殊字符。这类似于创建一个新的 npm 包时的命名习惯。

5. 点击 **"Create project"** 按钮
6. 等待 Unity 创建项目并首次打开编辑器（可能需要几分钟）

[截图：Unity 正在创建项目的加载界面]

### 1.5.3 首次打开 —— 不要慌

第一次打开 Unity Editor，你可能会被大量的面板和选项吓到。**这完全正常**。

[截图：Unity Editor 首次打开的默认布局]

回想一下你第一次打开 VS Code 或 Chrome DevTools 的感觉 —— 刚开始也会觉得复杂，但用过几次就熟悉了。我们将在下一章详细介绍 Unity Editor 的每一个面板。

现在，只需要确认以下几点：
- Unity Editor 成功打开了
- 你能看到一个默认的场景（蓝色天空、灰色地面）
- 没有红色的错误信息在 Console 中

### 1.5.4 设置 VS Code 为默认编辑器

1. 在 Unity Editor 中，点击菜单栏的 **Unity → Settings**（Mac）或 **Edit → Preferences**
2. 在 Preferences 窗口中，选择左侧的 **"External Tools"**
3. 在 **"External Script Editor"** 下拉菜单中，选择 **"Visual Studio Code"**
4. 确保以下选项已勾选：
   - ✅ Generate .csproj files for: Embedded packages, Local packages
   - ✅ Registry packages（可选）

[截图：Unity Preferences 的 External Tools 设置页面，VS Code 被选中]

5. 点击 **"Regenerate project files"** 按钮

现在，在 Unity 中双击任何 C# 脚本文件，都会自动用 VS Code 打开。

---

## 1.6 验证安装：Hello Unity

让我们创建第一个脚本来验证整个开发环境是否正常工作。

### 1.6.1 创建 C# 脚本

1. 在 Unity Editor 底部的 **Project** 窗口中，找到 **Assets** 文件夹
2. 右键点击 Assets 文件夹 → **Create → Folder**，命名为 `Scripts`
3. 双击进入 Scripts 文件夹
4. 右键点击空白区域 → **Create → C# Script**，命名为 `HelloUnity`

[截图：Unity Project 窗口中创建 C# 脚本的右键菜单]

> **重要**：创建脚本时请直接输入正确的名字。Unity 会根据文件名自动生成类名。如果后续重命名文件，需要手动修改脚本内的类名以保持一致。

### 1.6.2 编写第一个脚本

双击 `HelloUnity.cs`，VS Code 会自动打开。将内容替换为：

```csharp
// HelloUnity.cs
// 我们的第一个 Unity 脚本 —— 验证开发环境

using UnityEngine; // 引入 Unity 引擎命名空间（类似 import）

/// <summary>
/// 这是我们的第一个 MonoBehaviour 脚本。
/// MonoBehaviour 是所有 Unity 脚本的基类，
/// 类似于 React 中的 Component 基类。
/// </summary>
public class HelloUnity : MonoBehaviour
{
    // [SerializeField] 让私有变量在 Unity Inspector 中可见
    // 类似 React 的 props —— 可以在编辑器中调整
    [SerializeField] private string playerName = "BellLab 开发者";
    [SerializeField] private float rotationSpeed = 50f;

    // Start() 在脚本生效后的第一帧执行，只执行一次
    // 类似 React 的 componentDidMount 或 useEffect(() => {}, [])
    void Start()
    {
        // Debug.Log 是 Unity 的 console.log
        Debug.Log($"🎮 Hello Unity! 欢迎, {playerName}!");
        Debug.Log($"当前 Unity 版本: {Application.unityVersion}");
        Debug.Log($"当前平台: {Application.platform}");
        Debug.Log($"屏幕分辨率: {Screen.width} x {Screen.height}");

        // 改变 GameObject 的名字
        gameObject.name = $"Player_{playerName}";
    }

    // Update() 每帧执行一次
    // 类似 requestAnimationFrame 的回调
    void Update()
    {
        // 让对象绕 Y 轴旋转
        // Time.deltaTime 确保旋转速度与帧率无关
        transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime);

        // 检测键盘输入
        if (Input.GetKeyDown(KeyCode.Space))
        {
            Debug.Log("空格键被按下！（类似 addEventListener('keydown', ...)）");
        }
    }

    // OnDestroy() 在对象被销毁时调用
    // 类似 React 的 componentWillUnmount 或 useEffect 的 cleanup
    void OnDestroy()
    {
        Debug.Log($"👋 {playerName} 离开了游戏世界");
    }
}
```

### 1.6.3 将脚本挂载到 GameObject

在 Unity 中，脚本需要**挂载（Attach）**到一个 GameObject 上才能运行。这类似于 React 中需要将组件渲染到 DOM 上。

1. 在 Unity Editor 的 **Hierarchy** 窗口中，右键 → **3D Object → Cube**（创建一个立方体）

[截图：Hierarchy 窗口中创建 3D Object 的菜单]

2. 选中新创建的 Cube
3. 在右侧的 **Inspector** 窗口中，点击底部的 **"Add Component"** 按钮
4. 搜索 `HelloUnity`，选中我们刚创建的脚本
5. 你应该能在 Inspector 中看到 HelloUnity 组件，以及 `Player Name` 和 `Rotation Speed` 两个可编辑的属性

[截图：Inspector 窗口中显示的 HelloUnity 组件，标注可编辑的属性]

### 1.6.4 运行测试

1. 点击 Unity Editor 顶部中央的 **▶ Play** 按钮（或按 `Cmd + P`）
2. 观察以下现象：
   - **Cube 开始旋转**（因为 Update() 中的旋转逻辑）
   - **Console 窗口**（Window → General → Console）显示了 Debug.Log 的输出
   - 按下**空格键**，Console 会显示按键消息

[截图：游戏运行中的画面 —— 旋转的 Cube，以及 Console 中的 Log 输出]

3. 点击 **▶ Play** 按钮停止运行（或再次按 `Cmd + P`）

> **重要提示**：在 Play 模式下对场景做的任何修改，退出 Play 模式后都会**丢失**。这是 Unity 初学者最常遇到的 "坑"。养成习惯：先停止运行，再修改场景。
>
> 类比 Web 开发：这就像在 Chrome DevTools 中直接修改 DOM/CSS —— 刷新页面后修改就没了。

### 1.6.5 验证 VS Code 集成

确认以下功能正常工作：

- ✅ 双击 Unity 中的脚本文件可以自动打开 VS Code
- ✅ VS Code 中有代码智能补全（输入 `transform.` 能看到提示列表）
- ✅ 能够跳转到 Unity API 的定义（Cmd + 点击 `MonoBehaviour`）
- ✅ 没有红色的错误波浪线（如果有，可能需要等待 OmniSharp 初始化）

如果 IntelliSense（智能补全）不工作，尝试：

```bash
# 在项目根目录执行，强制 VS Code 重新加载解决方案
# 也可以在 VS Code 中按 Cmd + Shift + P，搜索 "Restart OmniSharp"
```

或者在 Unity 中：**Edit → Preferences → External Tools → Regenerate project files**

---

## 1.7 Git 版本控制设置

### 1.7.1 为什么需要 Git LFS？

Unity 项目包含大量二进制文件（纹理、模型、音频、场景文件），这些文件不适合用 Git 的标准方式管理。Git LFS（Large File Storage）是专门处理大文件的 Git 扩展。

类比 Web 开发：
```
Web 项目的 node_modules → .gitignore 忽略
Unity 项目的 Library 文件夹 → .gitignore 忽略

Web 项目的大图片 → 可能用 CDN
Unity 项目的大文件 → Git LFS 管理
```

### 1.7.2 安装 Git LFS

```bash
# 使用 Homebrew 安装 Git LFS
brew install git-lfs

# 初始化 Git LFS（全局设置，只需执行一次）
git lfs install
```

### 1.7.3 初始化 Git 仓库

在终端中导航到你的 Unity 项目文件夹：

```bash
# 进入项目目录
cd ~/Unity/Projects/BellLabOpenWorld

# 初始化 Git 仓库
git init

# 设置主分支名为 main
git branch -M main
```

### 1.7.4 创建 .gitignore

Unity 项目有很多不需要提交的文件。创建 `.gitignore`：

```bash
# 推荐使用 GitHub 官方的 Unity gitignore 模板
curl -o .gitignore https://raw.githubusercontent.com/github/gitignore/main/Unity.gitignore
```

或者手动创建，以下是核心内容：

```gitignore
# Unity 生成的文件夹（类比 Web 的 node_modules、.next、dist）
/[Ll]ibrary/
/[Tt]emp/
/[Oo]bj/
/[Bb]uild/
/[Bb]uilds/
/[Ll]ogs/
/[Uu]ser[Ss]ettings/

# MemoryCaptures
/[Mm]emoryCaptures/

# Asset 导入生成的文件
*.pidb.meta
*.pdb.meta
*.mdb.meta

# Unity3D 生成的 Meta 文件（不要忽略 .meta 文件！它们很重要）
# .meta 文件包含了资源的导入设置和引用 GUID
# 忽略 .meta 文件会导致团队协作时资源引用丢失

# IDE 相关
.vs/
.vscode/
*.csproj
*.sln
*.suo
*.tmp
*.user
*.userprefs
*.pidb
*.booproj
*.svd
*.pdb
*.mdb
*.opendb
*.VC.db

# OS 文件
.DS_Store
Thumbs.db

# Crashlytics
crashlytics-build.properties

# Builds
*.apk
*.aab
*.unitypackage
*.app
```

> **重要：不要忽略 .meta 文件！** Unity 用 `.meta` 文件来追踪资源的唯一 ID（GUID）。如果忽略了 `.meta` 文件，团队协作时会出现资源引用丢失的严重问题。这和 Web 开发中不能忽略 `package-lock.json` 是一个道理。

### 1.7.5 配置 Git LFS 追踪规则

创建 `.gitattributes` 文件来指定哪些文件类型应该由 Git LFS 管理：

```bash
# 创建 .gitattributes 文件
cat > .gitattributes << 'EOF'
# Unity LFS 配置
# 3D 模型文件
*.fbx filter=lfs diff=lfs merge=lfs -text
*.obj filter=lfs diff=lfs merge=lfs -text
*.blend filter=lfs diff=lfs merge=lfs -text
*.dae filter=lfs diff=lfs merge=lfs -text
*.3ds filter=lfs diff=lfs merge=lfs -text

# 纹理和图片
*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.jpeg filter=lfs diff=lfs merge=lfs -text
*.psd filter=lfs diff=lfs merge=lfs -text
*.tga filter=lfs diff=lfs merge=lfs -text
*.tif filter=lfs diff=lfs merge=lfs -text
*.tiff filter=lfs diff=lfs merge=lfs -text
*.exr filter=lfs diff=lfs merge=lfs -text
*.hdr filter=lfs diff=lfs merge=lfs -text

# 音频
*.mp3 filter=lfs diff=lfs merge=lfs -text
*.wav filter=lfs diff=lfs merge=lfs -text
*.ogg filter=lfs diff=lfs merge=lfs -text
*.aif filter=lfs diff=lfs merge=lfs -text

# 视频
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.mov filter=lfs diff=lfs merge=lfs -text

# Unity 特有的大文件
*.unitypackage filter=lfs diff=lfs merge=lfs -text
*.asset filter=lfs diff=lfs merge=lfs -text

# 字体
*.ttf filter=lfs diff=lfs merge=lfs -text
*.otf filter=lfs diff=lfs merge=lfs -text

# 压缩文件
*.zip filter=lfs diff=lfs merge=lfs -text
*.7z filter=lfs diff=lfs merge=lfs -text
*.gz filter=lfs diff=lfs merge=lfs -text

# 确保 Unity YAML 文件以文本方式合并
*.unity text merge=unityyamlmerge
*.prefab text merge=unityyamlmerge
*.mat text merge=unityyamlmerge
*.controller text merge=unityyamlmerge
*.anim text merge=unityyamlmerge
EOF
```

### 1.7.6 首次提交

```bash
# 添加所有文件
git add .

# 首次提交
git commit -m "初始化 Unity 项目: BellLabOpenWorld (URP 模板)"
```

### 1.7.7 连接远程仓库（可选）

如果你想把项目托管到 GitHub：

```bash
# 创建 GitHub 仓库（需要先安装 gh CLI）
# brew install gh
# gh auth login

gh repo create BellLabOpenWorld --private --source=. --push

# 或者手动添加远程仓库
# git remote add origin https://github.com/你的用户名/BellLabOpenWorld.git
# git push -u origin main
```

---

## 1.8 Unity 项目文件夹结构详解

让我们深入了解 Unity 项目的文件夹结构，并与 Web 项目做对比：

```
BellLabOpenWorld/                   # 项目根目录
│
├── Assets/                         # ★ 核心：所有游戏资源（≈ src/）
│   ├── Scenes/                     # 场景文件（≈ pages/）
│   │   └── SampleScene.unity       # 默认场景
│   ├── Scripts/                    # C# 脚本（≈ src/components/）
│   │   └── HelloUnity.cs           # 我们刚创建的脚本
│   ├── Materials/                  # 材质文件（≈ styles/）
│   ├── Textures/                   # 纹理贴图（≈ public/images/）
│   ├── Models/                     # 3D 模型
│   ├── Prefabs/                    # 预制体（≈ 可复用组件模板）
│   ├── Animations/                 # 动画文件
│   ├── Audio/                      # 音频文件
│   ├── Plugins/                    # 第三方插件
│   ├── Resources/                  # 运行时动态加载的资源
│   ├── StreamingAssets/            # 原样复制到构建的资源
│   └── Settings/                   # URP 渲染管线设置
│
├── Packages/                       # 包管理（≈ node_modules/ 的配置）
│   ├── manifest.json               # 包依赖声明（≈ package.json）
│   └── packages-lock.json          # 锁定版本（≈ package-lock.json）
│
├── ProjectSettings/                # 项目设置（≈ 各种 config 文件）
│   ├── ProjectSettings.asset       # 项目总设置
│   ├── QualitySettings.asset       # 画质设置
│   ├── InputManager.asset          # 输入设置
│   ├── TagManager.asset            # 标签和层设置
│   ├── Physics2DSettings.asset     # 2D 物理设置
│   └── ...                         # 其他设置文件
│
├── Library/                        # ★ 缓存（≈ node_modules/ + .next/）
│   └── ...                         # Unity 自动生成，不提交到 Git
│
├── Temp/                           # 临时文件（≈ .cache/）
│   └── ...                         # 不提交到 Git
│
├── Logs/                           # 日志文件
│   └── ...                         # 不提交到 Git
│
├── UserSettings/                   # 用户个人设置
│   └── ...                         # 不提交到 Git（个人偏好）
│
├── .gitignore                      # Git 忽略配置
├── .gitattributes                  # Git LFS 配置
└── BellLabOpenWorld.sln            # VS Code / IDE 解决方案文件
```

### 1.8.1 核心文件夹详解

#### Assets/ —— 你的 "src" 目录

这是你 99% 的时间都在打交道的文件夹。所有游戏内容都在这里。

**推荐的子目录组织方式：**

```
Assets/
├── _Project/                  # 用下划线前缀让它排在最前面
│   ├── Scripts/
│   │   ├── Player/            # 按功能模块划分
│   │   ├── NPC/
│   │   ├── UI/
│   │   ├── Systems/
│   │   └── Utils/
│   ├── Scenes/
│   │   ├── MainMenu.unity
│   │   ├── GameWorld.unity
│   │   └── Testing.unity
│   ├── Prefabs/
│   │   ├── Characters/
│   │   ├── Environment/
│   │   └── UI/
│   ├── Materials/
│   ├── Textures/
│   ├── Models/
│   ├── Animations/
│   ├── Audio/
│   │   ├── Music/
│   │   └── SFX/
│   ├── ScriptableObjects/
│   └── Settings/
│       ├── URP-HighQuality.asset
│       ├── URP-MediumQuality.asset
│       └── URP-LowQuality.asset
└── Third-Party/               # 第三方资源和插件
    ├── TextMeshPro/
    └── ...
```

> **命名建议**：使用 `_Project` 前缀可以让你的项目文件夹始终排在 Asset Store 导入的资源之前，保持整洁。

#### Packages/manifest.json —— 你的 "package.json"

```json
{
  "dependencies": {
    "com.unity.render-pipelines.universal": "14.0.8",
    "com.unity.textmeshpro": "3.0.6",
    "com.unity.inputsystem": "1.7.0",
    "com.unity.cinemachine": "2.9.7"
  }
}
```

类比 Web 的 `package.json`：

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "next": "^14.0.0",
    "tailwindcss": "^3.3.0"
  }
}
```

你可以通过 **Window → Package Manager** 在 Unity Editor 中管理包（类似于使用 npm/yarn 的 GUI 工具）。

#### ProjectSettings/ —— 你的配置文件集合

这些文件存储了项目的全局设置，类似于 Web 项目中的 `tsconfig.json`、`tailwind.config.js`、`.eslintrc` 等配置文件。

> **重要**：`ProjectSettings/` 文件夹**需要**提交到 Git，因为这些是项目级别的配置，所有团队成员都需要共享。

#### Library/ —— 你的 "node_modules"

这个文件夹由 Unity 自动生成和管理，包含了编译后的资源、缓存等。

- **绝对不要手动修改**这个文件夹的内容
- **不要提交到 Git**（已在 .gitignore 中排除）
- 如果遇到莫名其妙的问题，可以**安全地删除**这个文件夹，Unity 会自动重建（类似于删除 `node_modules` 后重新 `npm install`）

```bash
# Unity 版的 "rm -rf node_modules && npm install"
# 关闭 Unity，然后：
rm -rf Library/
# 重新打开 Unity，它会自动重建 Library
```

### 1.8.2 .meta 文件的重要性

你会注意到 Assets 文件夹中每个文件和文件夹旁边都有一个同名的 `.meta` 文件。这些文件极其重要：

```
Assets/
├── Scripts/
├── Scripts.meta          ← 文件夹的 meta 文件
├── Scripts/
│   ├── HelloUnity.cs
│   └── HelloUnity.cs.meta  ← 脚本的 meta 文件
├── Textures/
│   ├── player.png
│   └── player.png.meta     ← 纹理的 meta 文件（包含导入设置）
```

`.meta` 文件包含：
- **GUID**：全局唯一标识符，Unity 用它来追踪资源间的引用关系
- **导入设置**：纹理的压缩格式、模型的缩放比例等

```yaml
# HelloUnity.cs.meta 示例
fileFormatVersion: 2
guid: 1a2b3c4d5e6f7890abcdef1234567890  # 唯一标识符
MonoImporter:
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
```

> **类比**：`.meta` 文件中的 GUID 类似于数据库中的主键。如果你在文件系统中重命名或移动文件（而不通过 Unity Editor），GUID 引用会断裂，导致 "Missing Reference" 错误。**永远通过 Unity Editor 来移动和重命名资源**。

---

## 1.9 常见问题排查

### Q1：Unity Hub 下载速度慢

**解决方案**：

```bash
# 可以在 Unity Hub 设置中更换下载源为国内镜像
# 或者使用 VPN/代理
```

### Q2：VS Code IntelliSense 不工作

**排查步骤**：

1. 确认 .NET SDK 已安装：`dotnet --version`
2. 确认 C# Dev Kit 扩展已安装并启用
3. 在 Unity 中重新生成项目文件：Edit → Preferences → External Tools → Regenerate project files
4. 在 VS Code 中按 `Cmd + Shift + P`，搜索 "Restart Language Server"
5. 检查 VS Code 底部状态栏是否显示项目加载进度

### Q3：Play 模式下修改被丢失

**这是设计如此，不是 bug。** 养成习惯：
- 先**停止 Play 模式**，再修改场景
- 如果需要在运行时调试值，可以在 Inspector 中修改，但要**记下**最终的值，退出 Play 模式后再设置回去

### Q4：Unity 打开项目时间很长

**这是正常的**，特别是首次打开或从 Git 克隆后：
- Unity 需要重建 Library 缓存
- 需要编译所有 C# 脚本
- 需要导入所有资源

**优化方法**：
- 使用 SSD（固态硬盘）
- 增加内存
- 不要把项目放在外置硬盘或网络驱动器上

### Q5：Apple Silicon (M1/M2/M3) 相关问题

```bash
# 确认 Unity Hub 和 Unity Editor 是以原生模式运行
# 而不是通过 Rosetta 2 转译

# 查看进程架构
file /Applications/Unity\ Hub.app/Contents/MacOS/Unity\ Hub
# 应该包含 arm64

# 如果某些包有兼容性问题，可以尝试：
# 在 Unity Hub 的 Installs 中选择 Silicon 版本的编辑器
```

---

## 1.10 本章练习

### 练习 1：环境验证清单

确认以下所有项目都正常工作，在每一项后面标注 ✅：

```
[ ] Unity Hub 已安装并登录
[ ] Unity 2022.3 LTS 已安装
[ ] iOS Build Support 已安装
[ ] Android Build Support 已安装
[ ] VS Code C# Dev Kit 已安装
[ ] .NET SDK 已安装
[ ] 使用 URP 模板创建了新项目
[ ] VS Code 被设置为默认编辑器
[ ] HelloUnity 脚本创建成功
[ ] 脚本挂载到 Cube 上
[ ] Play 模式运行正常（Cube 旋转）
[ ] Console 正常输出日志
[ ] VS Code IntelliSense 正常工作
[ ] Git 仓库已初始化
[ ] .gitignore 已配置
[ ] .gitattributes (Git LFS) 已配置
[ ] 首次 Git 提交成功
```

### 练习 2：修改 HelloUnity 脚本

在 `HelloUnity.cs` 的基础上，添加以下功能：

1. 添加一个 `[SerializeField] private Color cubeColor = Color.red;` 字段
2. 在 `Start()` 中，获取 `Renderer` 组件并设置颜色：

```csharp
// 提示代码
void Start()
{
    // ... 现有代码 ...

    // 获取渲染器组件并修改颜色
    Renderer renderer = GetComponent<Renderer>();
    if (renderer != null)
    {
        renderer.material.color = cubeColor;
    }
}
```

3. 在 Inspector 中修改颜色值，观察 Cube 颜色的变化
4. 在 `Update()` 中添加按键 `R`、`G`、`B` 切换颜色的功能

### 练习 3：项目结构规划

按照 1.8.1 节推荐的目录结构，在你的项目中创建以下文件夹：

```
Assets/
├── _Project/
│   ├── Scripts/
│   │   ├── Player/
│   │   ├── NPC/
│   │   ├── UI/
│   │   ├── Systems/
│   │   └── Utils/
│   ├── Scenes/
│   ├── Prefabs/
│   ├── Materials/
│   ├── Textures/
│   ├── Models/
│   ├── Animations/
│   ├── Audio/
│   │   ├── Music/
│   │   └── SFX/
│   └── ScriptableObjects/
└── Third-Party/
```

> **注意**：在 Unity 中创建空文件夹后，它不会自动生成 `.meta` 文件，直到文件夹里有内容。你可以在每个文件夹中创建一个空的 `.gitkeep` 文件来确保 Git 能追踪空文件夹。

---

## 1.11 下一章预告

在下一章 **《第 02 章：Unity 编辑器深度导览》** 中，我们将：

- 深入了解 Unity Editor 的每一个面板
- 掌握 Scene 视图的导航操作
- 学习 Inspector 的使用技巧
- 了解 Console 窗口的调试方法
- 自定义编辑器布局
- 与 Chrome DevTools 和 VS Code 做对比

你的开发环境已经准备就绪，接下来让我们真正熟悉这个强大的工具！

---

> **本章小结**
>
> 在本章中，我们完成了整个 Unity 开发环境的搭建：Unity Hub、Unity Editor、VS Code、Git LFS。我们创建了第一个 URP 项目，编写并运行了第一个 C# 脚本，验证了整个工具链的正常工作。我们还深入了解了 Unity 项目的文件夹结构，建立了与 Web 项目结构的对应关系。
>
> 从下一章开始，我们将深入 Unity Editor，真正开始游戏开发之旅。
