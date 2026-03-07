# 第一章：环境搭建 —— 从零配置 Rust 开发环境

> **本章目标**
>
> - 安装 rustup 并理解 Rust 工具链管理
> - 掌握 Cargo 包管理器的基本使用（对比 npm）
> - 配置 VS Code + rust-analyzer 开发环境
> - 创建并运行第一个 Rust 项目
> - 深入理解 Cargo.toml 配置文件（对比 package.json）
> - 掌握常用 cargo 命令
> - 使用 rustfmt 和 clippy 保证代码质量

> **预计学习时间：60 - 90 分钟**

---

## 1.1 开始之前

### 1.1.1 为什么学 Rust？

作为一个 TypeScript/JavaScript 开发者，你可能会问：为什么要学 Rust？

**Rust 能给你什么 JS/TS 给不了的东西：**

- **真正的系统级性能**：没有 GC（垃圾回收）暂停，没有 JIT 预热，编译后直接运行机器码
- **内存安全**：编译器在编译时就能捕获空指针、数据竞争、内存泄漏等问题
- **零成本抽象**：高级语言的表达力，C/C++ 级别的性能
- **WebAssembly**：Rust 是编译到 WASM 的最佳语言之一，可以在浏览器中运行
- **跨平台**：从嵌入式到服务器，从 CLI 工具到游戏引擎

**Rust 在现实世界中的应用：**

```
工具/项目              用途
─────────              ────
Deno                   JavaScript/TypeScript 运行时（替代 Node.js）
SWC                    超快的 JS/TS 编译器（替代 Babel）
Turbopack              超快的打包工具（替代 Webpack）
Rome/Biome             代码格式化和 Lint 工具
rspack                 基于 Rust 的打包工具
Tauri                  桌面应用框架（替代 Electron）
Cloudflare Workers     边缘计算运行时
Firefox                浏览器引擎 Servo
ripgrep                超快的文本搜索工具（替代 grep）
```

如你所见，**前端工具链正在被 Rust 重写**。学会 Rust，你不仅能理解这些工具的原理，还能参与构建下一代开发工具。

### 1.1.2 类比理解：Rust 工具链

对于 Web 开发者来说，Rust 的工具链可以这样类比：

```
Web 开发                        Rust 开发
─────────                        ──────────
nvm (Node 版本管理器)         →  rustup（Rust 版本管理器）
Node.js (运行时)              →  rustc（编译器）
npm / yarn / pnpm (包管理器)  →  Cargo（包管理器 + 构建工具）
package.json                  →  Cargo.toml
node_modules/                 →  ~/.cargo/registry/ + target/
npmjs.com                     →  crates.io
npx                           →  cargo install + 直接运行
ESLint                        →  Clippy
Prettier                      →  rustfmt
TypeScript 编译器 (tsc)       →  rustc（Rust 本身就是强类型的）
tsconfig.json                 →  Cargo.toml 的 [profile] 配置
VS Code + TS 插件             →  VS Code + rust-analyzer
```

### 1.1.3 系统要求

Rust 对系统要求非常低，几乎可以在任何现代操作系统上运行：

| 要求 | 最低配置 | 推荐配置 |
|---|---|---|
| 操作系统 | Linux / macOS / Windows 10+ | 任意现代 OS |
| 磁盘空间 | 2 GB | 5 GB+（含编译缓存）|
| 内存 | 2 GB | 8 GB+（大型项目编译需要）|
| 网络 | 需要（安装和下载依赖）| - |

> **好消息**：不像 Unity 或 Android Studio 那样吃资源，Rust 工具链非常轻量。你的前端开发机器完全够用。

---

## 1.2 安装 rustup

`rustup` 是 Rust 的官方版本管理器，类似于 Node.js 世界的 `nvm`。通过 rustup，你可以：

- 安装和管理多个 Rust 版本（stable、beta、nightly）
- 切换默认工具链版本
- 安装交叉编译目标（比如编译到 WebAssembly）
- 更新 Rust 到最新版本
- 安装额外的组件（如 rustfmt、clippy）

### 1.2.1 Linux / macOS 安装

打开终端，执行以下命令：

```bash
# 官方推荐的安装方式（一行命令搞定）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

安装过程中会提示你选择安装选项：

```
Welcome to Rust!

This will download and install the official compiler for the Rust
programming language, and its package manager, Cargo.

Rustup metadata and toolchains will be installed into the Rustup
home directory, located at:

  /home/你的用户名/.rustup

This can be modified with the RUSTUP_HOME environment variable.

The Cargo home directory is located at:

  /home/你的用户名/.cargo

This can be modified with the CARGO_HOME environment variable.

The cargo, rustc, rustup and other commands will be added to
Cargo's bin directory, located at:

  /home/你的用户名/.cargo/bin

...

1) Proceed with standard installation (default - just press enter)
2) Customize installation
3) Cancel installation

>
```

**直接按回车**选择默认安装即可。安装完成后，你会看到：

```
Rust is installed now. Great!

To get started you may need to restart your current shell.
This would reload your PATH environment variable to include
Cargo's bin directory ($HOME/.cargo/bin).

To configure your current shell, run:
source "$HOME/.cargo/env"
```

**重要：让环境变量生效**

```bash
# 方法 1：重新加载 shell 环境（推荐）
source "$HOME/.cargo/env"

# 方法 2：重新打开终端窗口

# 方法 3：手动添加到 PATH（如果上面的方法不行）
# 在 ~/.bashrc 或 ~/.zshrc 中添加：
export PATH="$HOME/.cargo/bin:$PATH"
```

> **类比 nvm**：就像 `nvm` 会修改你的 shell 配置文件来管理 PATH，rustup 也做了同样的事情。`~/.cargo/bin` 目录就类似于 `nvm` 管理的 node 二进制目录。

### 1.2.2 macOS 额外步骤

在 macOS 上，Rust 编译器需要 C 语言链接器。如果你还没有安装 Xcode Command Line Tools：

```bash
# 安装 Xcode 命令行工具（如果还没有的话）
xcode-select --install
```

如果你已经安装了 Homebrew，这一步通常已经完成了。

> **注意**：你不需要安装完整的 Xcode（好几个 GB），只需要 Command Line Tools（几百 MB）。

### 1.2.3 Windows 安装

Windows 用户有两种选择：

**方法 1：使用官方安装程序（推荐）**

1. 访问 [https://rustup.rs](https://rustup.rs)
2. 下载 `rustup-init.exe`
3. 双击运行安装程序
4. 按照提示完成安装

**方法 2：使用 winget（Windows 11+）**

```powershell
# 使用 Windows 包管理器
winget install Rustlang.Rustup
```

**Windows 特殊要求：** Rust 在 Windows 上需要 MSVC（Microsoft Visual C++）构建工具。安装过程中会提示你安装 Visual Studio Build Tools。你需要：

1. 下载 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. 在安装程序中选择 **"C++ 桌面开发"** 工作负载
3. 确保以下组件被选中：
   - MSVC v143（或更新版本）
   - Windows 10/11 SDK
   - C++ CMake 工具

```
Web 开发者可能会觉得：为什么 Rust 需要 C++ 构建工具？
这是因为 Rust 需要一个链接器来将编译后的代码组合成可执行文件。
在 Linux/macOS 上这个工具（gcc/clang）通常已经预装了，
Windows 上则需要手动安装 MSVC。

类比：就像有些 npm 包（如 node-sass、sharp）需要原生编译环境一样。
```

> **WSL 用户**：如果你在 Windows 上使用 WSL (Windows Subsystem for Linux)，可以直接按照 Linux 的方式安装，通常更简单。

### 1.2.4 验证安装

安装完成后，打开一个**新的**终端窗口，验证安装是否成功：

```bash
# 检查 Rust 编译器版本
rustc --version
# 输出类似：rustc 1.75.0 (82e1608df 2023-12-21)

# 检查 Cargo 版本
cargo --version
# 输出类似：cargo 1.75.0 (1d8b05cdd 2023-11-20)

# 检查 rustup 版本
rustup --version
# 输出类似：rustup 1.26.0 (5af9b9484 2023-04-05)

# 查看当前安装的工具链
rustup show
# 输出类似：
# Default host: aarch64-apple-darwin
# rustup home:  /Users/你的用户名/.rustup
#
# stable-aarch64-apple-darwin (default)
# rustc 1.75.0 (82e1608df 2023-12-21)
```

如果所有命令都能正常输出版本号，恭喜你，Rust 安装成功！🎉

### 1.2.5 理解 Rust 版本频道

Rust 有三个发布频道，类似于浏览器的发布策略：

```
Rust 频道              类比                更新周期
──────────              ────                ────────
stable（稳定版）      ≈ Chrome 正式版      每 6 周
beta（测试版）        ≈ Chrome Beta        每 6 周
nightly（每日构建）   ≈ Chrome Canary      每天

Node.js 类比：
stable  ≈ Node.js LTS
beta    ≈ Node.js Current
nightly ≈ Node.js 夜间构建
```

**日常开发使用 stable 就够了。** 只有在需要使用实验性特性时才需要 nightly。

```bash
# 管理 Rust 版本（类似 nvm 的操作）

# 更新到最新稳定版（类似 nvm install --lts）
rustup update stable

# 更新所有已安装的工具链
rustup update

# 安装 nightly 版本（如果需要）
rustup install nightly

# 切换默认版本
rustup default stable    # 类似 nvm alias default lts/*
rustup default nightly   # 类似 nvm alias default node

# 仅在当前目录使用特定版本（类似项目级 .nvmrc）
rustup override set nightly

# 查看已安装的工具链
rustup toolchain list
```

### 1.2.6 安装额外组件

rustup 可以安装额外的组件，最重要的两个是 `rustfmt`（代码格式化）和 `clippy`（代码检查）：

```bash
# 安装 rustfmt（代码格式化器，类似 Prettier）
rustup component add rustfmt

# 安装 clippy（代码检查工具，类似 ESLint）
rustup component add clippy

# 安装 rust-src（Rust 标准库源码，IDE 需要）
rustup component add rust-src

# 安装 rust-analyzer（语言服务器，IDE 智能补全需要）
# 注意：VS Code 的 rust-analyzer 扩展会自动管理这个
rustup component add rust-analyzer

# 查看已安装的组件
rustup component list --installed
```

### 1.2.7 安装 WebAssembly 编译目标（可选）

作为前端开发者，你可能特别感兴趣的是将 Rust 编译到 WebAssembly：

```bash
# 安装 WASM 编译目标
rustup target add wasm32-unknown-unknown

# 安装 wasm-pack（Rust → WASM 的构建工具）
cargo install wasm-pack

# 以后你可以这样编译 Rust 到 WASM：
# cargo build --target wasm32-unknown-unknown
```

> **这就是 SWC、Turbopack 等工具的秘密武器**：它们用 Rust 编写核心逻辑，然后编译成原生代码或 WASM，实现了比纯 JavaScript 快 10-100 倍的性能。

---

## 1.3 认识 Cargo —— Rust 的 npm

Cargo 是 Rust 的构建系统和包管理器，它是你日常开发中最常用的工具。如果说 rustc 是 Rust 的编译器，那么 Cargo 就是把一切粘合在一起的"胶水"。

### 1.3.1 Cargo vs npm 功能对比

```
npm / pnpm / yarn 命令          Cargo 等价命令
──────────────────────          ──────────────
npm init                      → cargo init / cargo new
npm install                   → cargo build（自动下载依赖）
npm install <包名>            → 手动编辑 Cargo.toml 或 cargo add <包名>
npm uninstall <包名>          → cargo remove <包名>
npm run build                 → cargo build --release
npm run dev                   → cargo run（开发时）/ cargo watch
npm test                      → cargo test
npm run lint                  → cargo clippy
npx prettier --write .        → cargo fmt
npx <工具>                    → cargo install <工具> + 直接运行
npm publish                   → cargo publish
npm search <关键词>           → 在 crates.io 搜索
npm ls                        → cargo tree
npm audit                     → cargo audit（需安装 cargo-audit）
npm outdated                  → cargo outdated（需安装 cargo-outdated）
npm ci                        → cargo build（Cargo.lock 保证一致性）
```

### 1.3.2 Cargo 的核心功能

Cargo 不仅仅是包管理器，它集成了构建系统的所有功能：

```
Cargo 的角色:
├── 包管理器（下载和管理依赖）      ≈ npm
├── 构建工具（编译项目）            ≈ webpack / esbuild / tsc
├── 测试运行器（运行测试）          ≈ jest / vitest
├── 文档生成器（生成 API 文档）     ≈ typedoc / jsdoc
├── 基准测试运行器（性能测试）      ≈ benchmark.js
└── 发布工具（发布到 crates.io）    ≈ npm publish
```

> **对比 Web 开发的碎片化工具链**：在 Web 开发中，你需要 npm + webpack/vite + jest + prettier + eslint + typedoc + ... 而 Cargo 一个工具就搞定了大部分！这也是很多前端开发者喜欢 Rust 的原因之一 —— 工具链的一致性和统一性。

### 1.3.3 crates.io —— Rust 的 npm Registry

[crates.io](https://crates.io) 是 Rust 的官方包注册表，相当于 [npmjs.com](https://www.npmjs.com)。

在 Rust 中，包被称为 **crate**（读作 /kreɪt/，意思是"板条箱"）。

```
npm 术语              Rust 术语
────────              ────────
package（包）       → crate（板条箱）
dependency（依赖）  → dependency（依赖，一样的）
devDependency       → dev-dependency
peerDependency      → 无直接对应（Rust 用 feature flags 实现类似功能）
scope（@org/包名）  → 无直接对应（crate 名全局唯一）
registry            → registry（默认 crates.io）
```

一些你作为 Web 开发者可能会用到的热门 crate：

```
功能           crate 名       类比 npm 包
────           ──────────       ──────────
HTTP 客户端    reqwest        ≈ axios / node-fetch
HTTP 服务器    actix-web      ≈ Express.js
HTTP 服务器    axum           ≈ Fastify / Hono
JSON 处理      serde_json     ≈ JSON.parse/stringify（但更强大）
序列化/反序列  serde          ≈ zod + JSON（类型安全的序列化）
异步运行时     tokio          ≈ libuv（Node.js 的事件循环）
CLI 参数解析   clap           ≈ commander / yargs
环境变量       dotenv         ≈ dotenv
日志           tracing        ≈ winston / pino
正则表达式     regex          ≈ 内置 RegExp（但更快）
UUID           uuid           ≈ uuid
日期时间       chrono         ≈ dayjs / date-fns
错误处理       anyhow         ≈ （JS 没有好的等价物）
数据库 ORM     diesel / sqlx  ≈ Prisma / Drizzle
模板引擎       tera           ≈ Handlebars / EJS
```

---

## 1.4 IDE 配置 —— VS Code + rust-analyzer

### 1.4.1 为什么是 VS Code + rust-analyzer？

好消息：你不需要学习新的 IDE！VS Code 通过 rust-analyzer 扩展提供了世界级的 Rust 开发体验。

```
前端开发环境                    Rust 开发环境
──────────                      ──────────
VS Code                       → VS Code（同一个！）
TypeScript Language Server     → rust-analyzer
ESLint 扩展                   → rust-analyzer 内置检查 + clippy
Prettier 扩展                 → rust-analyzer 内置格式化 + rustfmt
Error Lens 扩展               → 同样适用于 Rust！
```

### 1.4.2 安装 rust-analyzer 扩展

打开 VS Code，安装以下扩展：

**必须安装：**

1. **rust-analyzer**（官方 Rust 语言支持）
   - 扩展 ID：`rust-lang.rust-analyzer`
   - 提供：智能补全、类型推断显示、错误检查、代码导航、重构、调试支持
   - ⚠️ 注意：**不要**安装旧版的 "Rust" 扩展（`rust-lang.rust`），那个已经废弃了

你可以通过命令行安装：

```bash
code --install-extension rust-lang.rust-analyzer
```

**强烈推荐安装：**

2. **Even Better TOML**
   - 扩展 ID：`tamasfe.even-better-toml`
   - 提供：Cargo.toml 的语法高亮、自动补全、错误检查
   - 类比：在编辑 package.json 时的智能提示

3. **Error Lens**
   - 扩展 ID：`usernamehw.errorlens`
   - 提供：在代码行内直接显示错误和警告信息
   - 如果你写前端时已经在用，它对 Rust 一样好使

4. **CodeLLDB**
   - 扩展 ID：`vadimcn.vscode-lldb`
   - 提供：Rust 调试支持（断点、变量查看、单步执行）
   - 类比：Chrome DevTools 的 debugger

5. **crates**
   - 扩展 ID：`serayuzgur.crates`
   - 提供：在 Cargo.toml 中显示 crate 的最新版本
   - 类比：npm 的版本检查提示

```bash
# 一次性安装所有推荐扩展
code --install-extension rust-lang.rust-analyzer
code --install-extension tamasfe.even-better-toml
code --install-extension usernamehw.errorlens
code --install-extension vadimcn.vscode-lldb
code --install-extension serayuzgur.crates
```

### 1.4.3 VS Code 设置优化

在 VS Code 的 `settings.json` 中添加以下 Rust 开发相关的配置：

```json
{
  // ======== rust-analyzer 设置 ========

  // 保存时自动检查（类似 ESLint 的自动检查）
  // 使用 clippy 而不是默认的 cargo check，能检查出更多问题
  "rust-analyzer.check.command": "clippy",

  // 显示内联类型提示（类似 TypeScript 的 inlay hints）
  "rust-analyzer.inlayHints.typeHints.enable": true,
  "rust-analyzer.inlayHints.parameterHints.enable": true,
  "rust-analyzer.inlayHints.chainingHints.enable": true,

  // 自动导入（类似 TypeScript 的 auto-import）
  "rust-analyzer.completion.autoimport.enable": true,

  // 在补全时显示函数参数类型
  "rust-analyzer.completion.callable.snippets": "fill_arguments",

  // ======== 编辑器设置 ========

  // 保存时自动格式化（使用 rustfmt）
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer",
    "editor.formatOnSave": true,
    "editor.tabSize": 4,
    "editor.insertSpaces": true
  },

  // TOML 文件格式化
  "[toml]": {
    "editor.defaultFormatter": "tamasfe.even-better-toml",
    "editor.formatOnSave": true
  },

  // ======== 文件排除 ========

  // 排除 Rust 编译产物，避免干扰搜索
  "files.exclude": {
    "**/target": true
  },
  "search.exclude": {
    "**/target": true
  }
}
```

> **类型提示对比**：
> ```
> TypeScript:  const x: number = 42;     // 你必须写类型或者 hover 查看
> Rust:        let x = 42;               // rust-analyzer 会在旁边显示 ": i32"
> ```
> rust-analyzer 的 inlay hints 让你在不显式标注类型的情况下也能清楚看到每个变量的类型。

### 1.4.4 调试配置

创建 `.vscode/launch.json` 来配置调试器：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug 运行",
      "cargo": {
        "args": [
          "build",
          "--bin=${workspaceFolderBasename}",
          "--package=${workspaceFolderBasename}"
        ],
        "filter": {
          "name": "${workspaceFolderBasename}",
          "kind": "bin"
        }
      },
      "args": [],
      "cwd": "${workspaceFolder}"
    },
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug 测试",
      "cargo": {
        "args": [
          "test",
          "--no-run",
          "--bin=${workspaceFolderBasename}",
          "--package=${workspaceFolderBasename}"
        ],
        "filter": {
          "name": "${workspaceFolderBasename}",
          "kind": "bin"
        }
      },
      "args": [],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

这样你就可以在 VS Code 中像调试 JavaScript 一样调试 Rust 了：设断点、查看变量值、单步执行。

---

## 1.5 第一个 Rust 项目 —— cargo new & cargo run

### 1.5.1 创建新项目

让我们创建第一个 Rust 项目：

```bash
# 创建一个新的 Rust 二进制项目（类似 npm init）
cargo new hello-rust
# 输出：Created binary (application) `hello-rust` package

# 进入项目目录
cd hello-rust

# 用 VS Code 打开
code .
```

`cargo new` 做了什么？让我们看看生成的文件结构：

```
hello-rust/                     # 项目根目录
├── Cargo.toml                  # 项目配置文件（≈ package.json）
├── .gitignore                  # Git 忽略文件（自动生成）
└── src/                        # 源代码目录（≈ src/）
    └── main.rs                 # 入口文件（≈ index.ts / main.ts）
```

> **对比 npm init**：
> ```bash
> # JavaScript
> mkdir hello-js && cd hello-js
> npm init -y
> # 创建 package.json，但你还需要手动创建 src/index.js
>
> # Rust
> cargo new hello-rust
> # 创建 Cargo.toml + src/main.rs + .gitignore，开箱即用！
> ```
> Cargo 比 npm init 更"贴心"——它直接帮你创建了源文件和 .gitignore。

### 1.5.2 cargo new 的选项

```bash
# 创建二进制项目（可执行程序）—— 默认行为
cargo new hello-rust
# 等价于
cargo new hello-rust --bin

# 创建库项目（给别人用的包）
cargo new my-library --lib
# 类比：创建一个 npm 包供别人 import

# 在现有目录中初始化项目（类似 npm init）
mkdir existing-dir && cd existing-dir
cargo init

# 创建时指定名称（如果目录名和包名不同）
cargo new my-dir --name my-package
```

**二进制项目 vs 库项目的区别：**

```
二进制项目 (--bin):
├── src/main.rs      ← 入口点，有 fn main()
├── 编译后生成可执行文件
└── 类比：一个 Node.js CLI 工具或 Web 服务器

库项目 (--lib):
├── src/lib.rs       ← 库入口，没有 fn main()
├── 编译后生成 .rlib（给其他项目引用）
└── 类比：一个发布到 npm 的包（如 lodash、axios）
```

### 1.5.3 查看生成的代码

打开 `src/main.rs`：

```rust
// src/main.rs
// Rust 的入口文件，类似 JavaScript 的 index.js

fn main() {
    println!("Hello, world!");
}
```

是不是非常简洁？我们后面会详细分析每一行的含义。

### 1.5.4 运行项目

```bash
# 编译并运行（类似 npx ts-node index.ts）
cargo run
# 输出：
#    Compiling hello-rust v0.1.0 (/path/to/hello-rust)
#     Finished dev [unoptimized + debuginfo] target(s) in 0.52s
#      Running `target/debug/hello-rust`
# Hello, world!
```

**发生了什么？** `cargo run` 实际上做了两件事：

```
cargo run = cargo build（编译） + 运行编译后的二进制文件

类比 Web 开发：
cargo run ≈ tsc && node dist/index.js    （TypeScript）
cargo run ≈ npm run dev                   （开发模式运行）
```

第一次编译会比较慢（需要编译标准库等），后续增量编译会快很多。

### 1.5.5 理解编译输出

```bash
# 看看编译生成了什么
ls -la target/debug/
# 你会看到：
# hello-rust        ← 编译后的可执行文件
# hello-rust.d      ← 依赖信息
# build/            ← 构建脚本的输出
# deps/             ← 编译后的依赖

# 可以直接运行编译后的文件
./target/debug/hello-rust
# 输出：Hello, world!
```

**debug vs release 构建：**

```bash
# Debug 构建（默认，编译快，运行慢，包含调试信息）
cargo build
# 输出到 target/debug/

# Release 构建（编译慢，运行快，优化后的代码）
cargo build --release
# 输出到 target/release/

# 类比 Web：
# cargo build          ≈ npm run dev（开发模式，source map 等）
# cargo build --release ≈ npm run build（生产模式，压缩优化）
```

> **性能差异巨大**：Debug 构建和 Release 构建的性能差距可以达到 10-100 倍！所以不要用 Debug 构建的性能来评判 Rust 的速度。永远用 `--release` 做性能测试。

---

## 1.6 Cargo.toml 详解 —— 对比 package.json

### 1.6.1 默认的 Cargo.toml

打开 `Cargo.toml`：

```toml
[package]
name = "hello-rust"
version = "0.1.0"
edition = "2021"

# 查看更多配置选项：https://doc.rust-lang.org/cargo/reference/manifest.html

[dependencies]
```

### 1.6.2 Cargo.toml vs package.json 完整对比

让我们并排对比这两个配置文件：

**package.json（JavaScript/TypeScript）：**

```json
{
  "name": "hello-js",
  "version": "0.1.0",
  "description": "我的第一个项目",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write ."
  },
  "keywords": ["hello", "example"],
  "author": "DongDong <dong@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/hello-js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "~4.17.21"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/express": "^4.17.0"
  }
}
```

**Cargo.toml（Rust）：**

```toml
[package]
name = "hello-rust"                            # 包名
version = "0.1.0"                              # 版本号（遵循 semver）
edition = "2021"                               # Rust 版次（类似 ES6/ES2020）
description = "我的第一个 Rust 项目"             # 项目描述
authors = ["DongDong <dong@example.com>"]       # 作者
license = "MIT"                                # 开源协议
repository = "https://github.com/user/hello-rust"  # 仓库地址
keywords = ["hello", "example"]                # 关键词（最多 5 个）
categories = ["command-line-utilities"]         # 分类
readme = "README.md"                           # README 文件

# Rust 不需要 "scripts" 字段！
# 因为 cargo build / cargo test / cargo fmt / cargo clippy 都是内置命令

[dependencies]
# 生产依赖（类似 dependencies）
serde = "1.0"                    # 指定大版本（≈ "^1.0"）
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"] }  # 带可选特性的依赖
tokio = { version = "1", features = ["full"] }

[dev-dependencies]
# 开发依赖（类似 devDependencies）
criterion = "0.5"                # 基准测试框架

[build-dependencies]
# 构建时依赖（JS 没有直接对应）
cc = "1.0"

[profile.dev]
# Debug 构建配置（类似 webpack 的 development 模式）
opt-level = 0      # 不优化（编译快）
debug = true        # 包含调试信息

[profile.release]
# Release 构建配置（类似 webpack 的 production 模式）
opt-level = 3       # 最高优化级别
lto = true          # 链接时优化（Link-Time Optimization）
strip = true        # 去除调试符号，减小二进制体积
```

### 1.6.3 版本号语法对比

```
npm 版本语法         Cargo 版本语法      含义
──────────────         ──────────────      ────
"^1.2.3"            → "1.2.3"            兼容 1.x.x（默认行为）
"~1.2.3"            → "~1.2.3"           兼容 1.2.x
"1.2.3"（精确）     → "=1.2.3"           精确版本
">=1.0.0 <2.0.0"    → ">=1.0.0, <2.0.0"  范围
"*"                 → "*"                任意版本（不推荐）
```

> **关键区别**：在 npm 中，`"1.2.3"` 表示精确版本。但在 Cargo 中，`"1.2.3"` 等价于 `"^1.2.3"`，即兼容 1.x.x 的任何版本。如果要精确锁定版本，要写 `"=1.2.3"`。

### 1.6.4 Cargo.lock —— 对比 package-lock.json

```
npm 的锁文件:
package-lock.json / yarn.lock / pnpm-lock.yaml
→ 锁定所有依赖的精确版本

Cargo 的锁文件:
Cargo.lock
→ 锁定所有依赖的精确版本（完全相同的概念！）
```

**规则：**
- **二进制项目**（可执行程序）：**提交** Cargo.lock 到 Git ✅
- **库项目**（给别人用的包）：**不提交** Cargo.lock 到 Git ❌

### 1.6.5 edition 字段 —— Rust 的"ES 版本"

`edition` 是 Rust 独特的概念，可以类比为 JavaScript 的 ECMAScript 版本：

```
JavaScript:
├── ES5  (2009)   ← 古老的 JS
├── ES6  (2015)   ← let/const, 箭头函数, class
├── ES2020        ← optional chaining (?.)
└── ES2024        ← 最新

Rust:
├── 2015          ← 第一个稳定版
├── 2018          ← async/await, 模块系统改进
├── 2021          ← 更好的闭包捕获, 新的 prelude ← 当前推荐
└── 2024          ← 最新（unsafe 改进等）
```

**关键区别**：不同于 JavaScript 需要 Babel/SWC 转译新语法，Rust 的 edition 之间完全兼容。使用 edition 2021 的 crate 可以和使用 edition 2018 的 crate 无缝协作。

### 1.6.6 features —— Rust 的条件编译

Cargo 的 `features` 系统是 npm 没有的概念。它允许 crate 提供可选功能，用户按需启用：

```toml
# 在 Cargo.toml 中
[dependencies]
# 默认只安装核心功能（减小编译体积）
reqwest = "0.11"

# 启用 JSON 支持
reqwest = { version = "0.11", features = ["json"] }

# 启用多个功能
tokio = { version = "1", features = ["full"] }
# 或者只启用需要的功能
tokio = { version = "1", features = ["rt-multi-thread", "macros", "net"] }
```

类比 JavaScript 的 tree-shaking：
```javascript
// JavaScript：导入整个 lodash（但打包工具会 tree-shake）
import _ from 'lodash';

// JavaScript：只导入需要的函数
import { debounce } from 'lodash-es';

// Rust：通过 features 在编译时就决定只编译需要的模块
// 比 tree-shaking 更彻底 —— 不需要的代码根本不会被编译
```

---

## 1.7 常用 Cargo 命令速查表

### 1.7.1 日常开发命令

```bash
# ======== 项目管理 ========
cargo new my-project          # 创建二进制项目
cargo new my-lib --lib        # 创建库项目
cargo init                    # 在当前目录初始化项目

# ======== 编译与运行 ========
cargo build                   # Debug 编译
cargo build --release         # Release 编译（生产用）
cargo run                     # Debug 模式运行
cargo run --release           # Release 模式运行
cargo run -- arg1 arg2        # 传递命令行参数（注意 -- 分隔符）
cargo check                   # 只检查语法错误（不生成二进制，更快）

# ======== 依赖管理 ========
cargo add serde               # 添加依赖（类似 npm install serde）
cargo add serde --features derive  # 添加依赖并启用 feature
cargo add tokio -F full       # -F 是 --features 的缩写
cargo add my-dev-dep --dev    # 添加开发依赖
cargo remove serde            # 移除依赖
cargo update                  # 更新 Cargo.lock
cargo tree                    # 查看依赖树（类似 npm ls）

# ======== 测试 ========
cargo test                    # 运行所有测试
cargo test my_test            # 运行名称包含 "my_test" 的测试
cargo test -- --nocapture     # 运行测试并显示 println! 输出

# ======== 代码质量 ========
cargo fmt                     # 格式化代码（类似 prettier）
cargo fmt -- --check          # 检查格式（CI 用）
cargo clippy                  # 代码检查（类似 eslint）
cargo clippy -- -D warnings   # 警告视为错误（CI 用）

# ======== 文档 ========
cargo doc --open              # 生成并打开项目文档

# ======== 清理 ========
cargo clean                   # 删除 target/ 目录
```

### 1.7.2 实用的 Cargo 子命令（需额外安装）

```bash
# cargo-watch：文件变化时自动重新编译/运行（类似 nodemon）
cargo install cargo-watch
cargo watch -x run            # 文件变化时自动 cargo run
cargo watch -x test           # 文件变化时自动 cargo test

# cargo-audit：安全漏洞检查（类似 npm audit）
cargo install cargo-audit
cargo audit

# cargo-outdated：检查过期依赖（类似 npm outdated）
cargo install cargo-outdated
cargo outdated

# cargo-expand：展开宏（查看宏展开后的代码）
cargo install cargo-expand
cargo expand

# cargo-bloat：分析二进制体积
cargo install cargo-bloat
cargo bloat --release
```

> **推荐安装 cargo-watch**：在开发阶段，它就像 `nodemon` 一样好用，每次保存文件都会自动重新编译和运行。

---

## 1.8 rustfmt —— Rust 的 Prettier

### 1.8.1 什么是 rustfmt？

rustfmt 是 Rust 官方的代码格式化工具，功能类似 JavaScript 世界的 Prettier。和 Prettier 一样，rustfmt 的哲学是**约定大于配置** —— 它有一套标准的代码风格，尽量减少格式化方面的争论。

```bash
# 格式化当前项目的所有代码
cargo fmt

# 只检查不修改（在 CI 中使用）
cargo fmt -- --check

# 格式化单个文件
rustfmt src/main.rs
```

### 1.8.2 配置 rustfmt

虽然 rustfmt 开箱即用就很好，但你也可以在项目根目录创建 `rustfmt.toml` 来自定义配置：

```toml
# rustfmt.toml —— 类似 .prettierrc

# 最大行宽（默认 100）
max_width = 100

# 使用 Unix 行尾（默认 "Auto"）
newline_style = "Unix"

# Tab 宽度（默认 4）
tab_spaces = 4

# 使用空格而不是 Tab（默认 false，即使用空格）
hard_tabs = false
```

> **对比 Prettier**：
> ```
> Prettier 配置         rustfmt 配置
> ──────────────         ──────────────
> printWidth: 80       → max_width = 100
> tabWidth: 2          → tab_spaces = 4（Rust 社区标准是 4 空格）
> useTabs: false       → hard_tabs = false
> semi: true           → Rust 语句必须以分号结尾，无需配置
> singleQuote: true    → Rust 字符串只能用双引号，无需配置
> ```
> 注意：Rust 社区标准缩进是 **4 空格**，不是前端常见的 2 空格。

### 1.8.3 VS Code 集成

如果你按照 1.4.3 节配置了 VS Code，rustfmt 已经在你保存文件时自动运行了。你不需要手动执行 `cargo fmt`。

---

## 1.9 Clippy —— Rust 的 ESLint

### 1.9.1 什么是 Clippy？

Clippy 是 Rust 官方的代码检查工具（linter），命名源自微软旧版 Office 助手的回形针"Clippy"。它能检查出：

- **代码风格问题**：不地道的写法
- **性能问题**：不必要的拷贝、低效的迭代
- **正确性问题**：可能的 bug、边界情况
- **复杂度问题**：可以简化的代码

```bash
# 运行 clippy
cargo clippy

# 警告视为错误（CI 用）
cargo clippy -- -D warnings

# 更严格的检查级别
cargo clippy -- -W clippy::pedantic

# 自动修复可以自动修复的问题
cargo clippy --fix
```

### 1.9.2 Clippy 示例

看看 Clippy 能检查出什么问题：

```rust
// ❌ Clippy 会警告：使用 if let 代替 match 只有一个分支的情况
match some_option {
    Some(x) => do_something(x),
    _ => (),
}

// ✅ Clippy 建议的写法
if let Some(x) = some_option {
    do_something(x);
}

// ❌ Clippy 会警告：可以用更简洁的写法
if x == true {
    // ...
}

// ✅ 直接写
if x {
    // ...
}

// ❌ Clippy 会警告：手动实现了标准库已有的功能
let mut sum = 0;
for i in &vec {
    sum += i;
}

// ✅ 使用迭代器
let sum: i32 = vec.iter().sum();
```

> **类比 ESLint**：
> ```
> ESLint: "prefer-const"        → Clippy: 建议使用不可变绑定
> ESLint: "no-unused-vars"      → Rust 编译器自带警告（前缀 _ 消除）
> ESLint: "eqeqeq"             → Rust 没有 == 和 === 的区别
> ESLint: "no-var"              → Rust 没有 var，只有 let / let mut
> ```

### 1.9.3 推荐的 CI 配置

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt, clippy

      - name: Check formatting
        run: cargo fmt -- --check

      - name: Run clippy
        run: cargo clippy -- -D warnings

      - name: Build
        run: cargo build

      - name: Test
        run: cargo test
```

---

## 1.10 Rust 项目目录结构详解

让我们看看一个完整的 Rust 项目结构，并与 Web 项目对比：

```
my-project/                         # 项目根目录
│
├── Cargo.toml                      # 项目配置（≈ package.json）
├── Cargo.lock                      # 依赖锁文件（≈ package-lock.json）
├── .gitignore                      # Git 忽略（Cargo 自动生成）
│
├── src/                            # 源代码（≈ src/）
│   ├── main.rs                     # 二进制入口（≈ index.ts）
│   ├── lib.rs                      # 库入口（≈ lib/index.ts）
│   ├── config.rs                   # 模块文件（≈ config.ts）
│   └── utils/                      # 子模块目录（≈ utils/）
│       ├── mod.rs                  # 模块入口（≈ utils/index.ts）
│       └── helpers.rs              # 子模块（≈ utils/helpers.ts）
│
├── tests/                          # 集成测试（≈ __tests__/）
│   └── integration_test.rs
│
├── benches/                        # 基准测试（≈ benchmarks/）
│   └── my_benchmark.rs
│
├── examples/                       # 示例代码
│   └── basic_usage.rs              # cargo run --example basic_usage
│
├── target/                         # 编译产物（≈ dist/ + node_modules/）
│   ├── debug/                      # Debug 编译输出
│   └── release/                    # Release 编译输出
│
├── .cargo/                         # Cargo 本地配置
│   └── config.toml                 # 构建配置（代理、镜像源等）
│
├── build.rs                        # 构建脚本（可选）
├── rustfmt.toml                    # 格式化配置（≈ .prettierrc）
├── clippy.toml                     # 代码检查配置（≈ .eslintrc）
└── README.md                       # 项目说明
```

### 1.10.1 配置国内镜像源（可选但推荐）

如果你在中国大陆，下载 crates.io 的依赖可能很慢。配置镜像源可以加速：

```bash
# 创建 Cargo 全局配置文件
mkdir -p ~/.cargo
cat > ~/.cargo/config.toml << 'EOF'
# 使用字节跳动镜像源（推荐，速度快且稳定）
[source.crates-io]
replace-with = "rsproxy"

[source.rsproxy]
registry = "https://rsproxy.cn/crates.io-index"

[source.rsproxy-sparse]
registry = "sparse+https://rsproxy.cn/index/"

[registries.rsproxy]
index = "https://rsproxy.cn/crates.io-index"

[net]
git-fetch-with-cli = true
EOF
```

> **类比**：这就像配置 npm 的淘宝镜像 `npm config set registry https://registry.npmmirror.com`

---

## 1.11 常见问题排查

### Q1：cargo build 非常慢

**首次编译确实会慢**（需要编译所有依赖）。后续增量编译会快很多。

**优化方法：**

```bash
# 1. 使用 cargo check 而不是 cargo build（只检查语法，不生成二进制）
cargo check

# 2. 使用 sccache 缓存编译结果
cargo install sccache
export RUSTC_WRAPPER=sccache

# 3. Linux 上使用 mold 链接器加速链接
```

### Q2：rust-analyzer 占用大量内存

这是正常的，特别是大型项目。可以在 VS Code settings 中禁用部分功能：

```json
{
  "rust-analyzer.cargo.buildScripts.enable": false,
  "rust-analyzer.procMacro.enable": false
}
```

### Q3：Cannot find -lxxx（链接错误）

```bash
# Linux 上可能缺少系统库
# Ubuntu / Debian:
sudo apt-get install build-essential pkg-config libssl-dev

# macOS:
xcode-select --install
```

---

## 1.12 本章练习

### 练习 1：环境验证清单

确认以下所有项目都正常工作：

```
[ ] rustup 已安装（rustup --version）
[ ] Rust stable 已安装（rustc --version）
[ ] Cargo 已安装（cargo --version）
[ ] rustfmt 已安装（rustfmt --version）
[ ] clippy 已安装（cargo clippy --version）
[ ] VS Code rust-analyzer 扩展已安装
[ ] VS Code Even Better TOML 扩展已安装
[ ] cargo new 创建项目成功
[ ] cargo run 运行成功（看到 Hello, world!）
[ ] cargo check 检查通过
[ ] cargo fmt 格式化正常
[ ] cargo clippy 检查通过
[ ] VS Code 智能补全正常工作
```

### 练习 2：创建并运行你的项目

1. 创建一个新项目：`cargo new lighthouse-practice`
2. 修改 `src/main.rs`，让它输出你的名字
3. 在 `Cargo.toml` 中添加 description 和 authors 字段
4. 运行 `cargo fmt` 格式化代码
5. 运行 `cargo clippy` 检查代码
6. 运行 `cargo build --release` 创建发布版本
7. 直接运行编译后的二进制文件（在 `target/release/` 中）

### 练习 3：探索 Cargo 命令

```bash
# 尝试以下命令，观察输出：
cargo tree                    # 查看依赖树
cargo doc --open              # 生成并查看项目文档
cargo test                    # 运行测试
cargo clean && cargo build    # 清理并重新构建
```

### 练习 4：安装 cargo-watch 并体验热重载

```bash
# 安装 cargo-watch
cargo install cargo-watch

# 启动热重载开发模式
cargo watch -x run

# 在另一个终端修改 src/main.rs，观察自动重新编译和运行
# 按 Ctrl+C 退出 watch 模式
```

---

## 1.13 下一章预告

在下一章 **《第 02 章：第一个 Rust 项目》** 中，我们将：

- 深入解析 Hello World 程序的每一行
- 学习 Rust 的函数定义和调用
- 掌握变量、可变性和基本数据类型
- 理解 String 和 &str 的区别（Rust 最让新手困惑的概念之一）
- 学习控制流语句
- 完成多个练习题

你的 Rust 开发环境已经准备就绪，是时候开始写真正的 Rust 代码了！

---

> **本章小结**
>
> 在本章中，我们完成了整个 Rust 开发环境的搭建：rustup、Cargo、VS Code + rust-analyzer。我们创建并运行了第一个 Rust 项目，深入了解了 Cargo.toml 的配置（与 package.json 对比），掌握了常用的 Cargo 命令，并配置了 rustfmt 和 clippy 来保证代码质量。
>
> 从工具链的角度来看，Rust 的开发体验比前端的碎片化工具链更加统一和一致。Cargo 一个工具就涵盖了 npm + webpack + jest + prettier + eslint 的功能。
>
> 从下一章开始，我们将深入 Rust 语言本身，开始真正的编程之旅。
