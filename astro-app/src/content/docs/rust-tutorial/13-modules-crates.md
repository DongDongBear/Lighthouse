# 第十三章：模块系统与 Crate —— 组织你的 Rust 代码

> **本章目标**
>
> - 理解 mod 关键字与模块树
> - 掌握文件与模块的对应关系（对比 ESM import/export）
> - 理解 pub 可见性规则
> - 熟练使用 use 和路径
> - 区分 crate、package 和 workspace（对比 npm）
> - 掌握 Cargo.toml 依赖管理
> - 了解发布到 crates.io 的流程

> **预计学习时间：90 - 120 分钟**

---

## 13.1 Rust 模块系统概览

### 13.1.1 与 JavaScript 模块系统的对比

如果你用过 ES Modules，Rust 的模块系统会有很多似曾相识的地方：

| JavaScript (ESM) | Rust |
|---|---|
| `export` | `pub` |
| `import { x } from './module'` | `use crate::module::x` |
| `export default` | 无对应（Rust 没有默认导出） |
| `import * as mod` | `use crate::module` |
| `package.json` | `Cargo.toml` |
| `npm` | `cargo` |
| `node_modules/` | `~/.cargo/registry/` |
| `npmjs.com` | `crates.io` |
| `npm publish` | `cargo publish` |
| monorepo (workspaces) | Cargo workspace |

### 13.1.2 模块系统的层次

```
Workspace（工作空间）
├── Package（包）       ← 由 Cargo.toml 定义
│   ├── Crate（编译单元）
│   │   ├── Module（模块）
│   │   │   ├── 函数
│   │   │   ├── 结构体
│   │   │   ├── 枚举
│   │   │   ├── Trait
│   │   │   ├── 常量
│   │   │   └── 子模块
│   │   └── Module
│   └── Crate
└── Package
```

---

## 13.2 mod 关键字

### 13.2.1 内联模块

最简单的模块定义方式——直接在文件中写：

```rust
// 定义模块
mod math {
    pub fn add(a: i32, b: i32) -> i32 {
        a + b
    }

    pub fn multiply(a: i32, b: i32) -> i32 {
        a * b
    }

    // 没有 pub 的函数是私有的
    fn secret() {
        println!("这是私有函数");
    }
}

fn main() {
    // 使用模块中的函数
    println!("{}", math::add(1, 2));       // 3
    println!("{}", math::multiply(3, 4));  // 12

    // math::secret(); // ❌ 编译错误！secret 是私有的
}
```

**对比 JavaScript：**

```javascript
// JavaScript 没有内联模块的概念
// 但你可以用对象模拟：
const math = {
    add: (a, b) => a + b,
    multiply: (a, b) => a * b,
};
```

### 13.2.2 嵌套模块

```rust
mod network {
    pub mod http {
        pub fn get(url: &str) -> String {
            format!("GET {}", url)
        }

        pub fn post(url: &str, body: &str) -> String {
            format!("POST {} with {}", url, body)
        }
    }

    pub mod tcp {
        pub fn connect(host: &str, port: u16) {
            println!("连接到 {}:{}", host, port);
        }
    }

    // 私有模块：外部不可访问
    mod internal {
        pub fn helper() {
            println!("内部帮助函数");
        }
    }
}

fn main() {
    println!("{}", network::http::get("https://example.com"));
    network::tcp::connect("localhost", 8080);

    // network::internal::helper(); // ❌ internal 模块是私有的
}
```

---

## 13.3 文件与模块的对应关系

### 13.3.1 模块 = 文件

在实际项目中，你不会把所有模块都写在一个文件里。Rust 有两种文件组织方式：

**方式一：单文件模块（推荐用于小模块）**

```
src/
├── main.rs
├── math.rs        ← mod math
└── network.rs     ← mod network
```

```rust
// src/main.rs
mod math;      // 告诉编译器：去找 src/math.rs
mod network;   // 告诉编译器：去找 src/network.rs

fn main() {
    println!("{}", math::add(1, 2));
    network::connect();
}
```

```rust
// src/math.rs
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

pub fn subtract(a: i32, b: i32) -> i32 {
    a - b
}
```

```rust
// src/network.rs
pub fn connect() {
    println!("连接网络");
}
```

**对比 ESM：**

```javascript
// JavaScript
// main.js
import { add } from './math.js';
import { connect } from './network.js';

// Rust 的 mod 声明类似于 import，但有区别：
// 1. Rust 用 mod 声明模块，用 use 引入具体项
// 2. JavaScript 直接 import 具体项
```

**方式二：目录模块（用于有子模块的模块）**

```
src/
├── main.rs
└── network/
    ├── mod.rs       ← mod network 的入口
    ├── http.rs      ← mod network::http
    └── tcp.rs       ← mod network::tcp
```

```rust
// src/main.rs
mod network;

fn main() {
    network::http::get("https://example.com");
    network::tcp::connect("localhost", 8080);
}
```

```rust
// src/network/mod.rs
pub mod http;  // 声明子模块
pub mod tcp;   // 声明子模块

pub fn status() -> &'static str {
    "网络正常"
}
```

```rust
// src/network/http.rs
pub fn get(url: &str) -> String {
    format!("GET {}", url)
}

pub fn post(url: &str, body: &str) -> String {
    format!("POST {} body={}", url, body)
}
```

```rust
// src/network/tcp.rs
pub fn connect(host: &str, port: u16) {
    println!("TCP 连接到 {}:{}", host, port);
}
```

### 13.3.2 新式目录模块（Rust 2018+）

Rust 2018 引入了一种新的组织方式，不再需要 `mod.rs`：

```
src/
├── main.rs
├── network.rs       ← mod network 的入口（替代 network/mod.rs）
└── network/
    ├── http.rs      ← mod network::http
    └── tcp.rs       ← mod network::tcp
```

```rust
// src/network.rs（替代 src/network/mod.rs）
pub mod http;
pub mod tcp;
```

两种方式都可以，但不能混用。**推荐使用新式。**

### 13.3.3 模块路径查找规则总结

```
声明 mod foo; 时，编译器按以下顺序查找：

1. src/foo.rs
2. src/foo/mod.rs

如果在 src/bar.rs 中声明 mod baz;，查找：

1. src/bar/baz.rs
2. src/bar/baz/mod.rs
```

---

## 13.4 pub 可见性

### 13.4.1 默认私有

Rust 的所有项默认是**私有的**，这与 JavaScript 正好相反：

```javascript
// JavaScript：默认公开，需要显式 export
export function publicFn() { }  // 公开
function privateFn() { }        // 未导出但模块内可用
```

```rust
// Rust：默认私有，需要显式 pub
pub fn public_fn() { }  // 公开
fn private_fn() { }      // 私有
```

### 13.4.2 pub 的各种粒度

```rust
mod outer {
    // pub：完全公开
    pub fn public_function() {}

    // pub(crate)：只在当前 crate 内公开
    pub(crate) fn crate_function() {}

    // pub(super)：只对父模块公开
    pub(super) fn parent_function() {}

    // pub(in path)：只对指定模块公开
    pub(in crate::outer) fn specific_function() {}

    // 无 pub：只在当前模块内可见
    fn private_function() {}

    pub mod inner {
        // 这里可以访问 outer 的私有项吗？
        // 子模块可以访问父模块的私有项！
        pub fn call_parent_private() {
            super::private_function(); // ✅ 可以！
        }
    }
}

fn main() {
    outer::public_function();       // ✅
    outer::crate_function();        // ✅ 同一个 crate
    // outer::parent_function();    // ❌ main 不是 outer 的父模块
    // outer::private_function();   // ❌ 私有

    outer::inner::call_parent_private(); // ✅
}
```

### 13.4.3 结构体的字段可见性

```rust
mod config {
    pub struct AppConfig {
        pub name: String,          // 公开字段
        pub(crate) version: String, // crate 内公开
        secret_key: String,        // 私有字段！
    }

    impl AppConfig {
        // 因为有私有字段，必须提供构造函数
        pub fn new(name: &str) -> Self {
            AppConfig {
                name: name.to_string(),
                version: "1.0.0".to_string(),
                secret_key: "super_secret".to_string(),
            }
        }

        pub fn secret(&self) -> &str {
            &self.secret_key
        }
    }
}

fn main() {
    let app = config::AppConfig::new("MyApp");
    println!("名称: {}", app.name);     // ✅ pub 字段
    println!("版本: {}", app.version);   // ✅ pub(crate) 字段

    // 不能直接访问私有字段
    // println!("{}", app.secret_key);   // ❌
    println!("密钥: {}", app.secret());  // ✅ 通过方法访问

    // 不能用结构体字面量创建（因为有私有字段）
    // let app2 = config::AppConfig {
    //     name: "Test".into(),
    //     version: "2.0".into(),
    //     secret_key: "hack".into(),  // ❌ 私有字段
    // };
}
```

### 13.4.4 枚举的可见性

枚举与结构体不同：**枚举只要 pub 了，它的所有变体都是 pub 的。**

```rust
mod shapes {
    // 整个枚举 pub，所有变体自动 pub
    pub enum Shape {
        Circle(f64),
        Rectangle(f64, f64),
        Triangle(f64, f64, f64),
    }
}

fn main() {
    let s = shapes::Shape::Circle(5.0); // ✅ 可以直接使用变体
}
```

---

## 13.5 use 和路径

### 13.5.1 绝对路径 vs 相对路径

```rust
mod a {
    pub mod b {
        pub fn hello() {
            println!("hello from a::b");
        }
    }

    pub fn call_b() {
        // 绝对路径（从 crate 根开始）
        crate::a::b::hello();

        // 相对路径（从当前模块开始）
        b::hello();

        // 或者用 self
        self::b::hello();
    }
}

mod c {
    pub fn call_ab() {
        // 从另一个模块访问，用绝对路径
        crate::a::b::hello();

        // 或者用 super 访问父模块
        super::a::b::hello();
    }
}
```

### 13.5.2 use 语句

`use` 让你把路径引入当前作用域，不用每次写完整路径：

```rust
// 引入具体项
use std::collections::HashMap;
use std::io::Read;

// 引入多个
use std::collections::{HashMap, HashSet, BTreeMap};

// 引入所有公开项（不推荐，可能造成命名冲突）
use std::collections::*;

// 重命名（避免冲突）
use std::fmt::Result as FmtResult;
use std::io::Result as IoResult;

// 重新导出
pub use crate::internal::PublicApi;
```

**对比 JavaScript：**

```javascript
// JavaScript
import { HashMap } from 'std/collections';
import { HashMap, HashSet } from 'std/collections';
import * as collections from 'std/collections';
import { Result as FmtResult } from 'std/fmt';
export { PublicApi } from './internal';
```

### 13.5.3 use 的惯用风格

```rust
// ✅ 推荐：引入函数的父模块
use std::fmt;
fmt::Display  // 清楚知道 Display 来自 fmt

// ✅ 推荐：引入结构体/枚举/Trait 的完整路径
use std::collections::HashMap;
let map = HashMap::new();

// ❌ 不推荐：引入函数本身（不清楚来源）
use std::fmt::format;
format(...)  // 不清楚 format 从哪来的

// ❌ 不推荐：用 * 通配导入
use std::collections::*;
```

### 13.5.4 pub use 重新导出

`pub use` 让你可以调整公开 API 的结构，而不改变内部实现：

```rust
// src/lib.rs
mod internal {
    pub mod deep {
        pub mod nested {
            pub struct Config {
                pub name: String,
            }
        }
    }
}

// 重新导出，让用户不需要知道内部结构
pub use internal::deep::nested::Config;

// 用户代码
// use my_crate::Config;  // 而不是 my_crate::internal::deep::nested::Config
```

**对比 JavaScript：**

```javascript
// index.js（JavaScript 的重导出）
export { Config } from './internal/deep/nested/config';
```

这个模式在 Rust 生态中非常常见。比如 `tokio::sync::Mutex` 实际上可能定义在很深的内部模块中。

---

## 13.6 Crate 与 Package

### 13.6.1 Crate

**Crate 是 Rust 的最小编译单元。** 有两种类型：

```
二进制 crate（Binary crate）
├── 有 main 函数
├── 编译成可执行文件
└── 入口文件：src/main.rs

库 crate（Library crate）
├── 没有 main 函数
├── 编译成库（.rlib）
└── 入口文件：src/lib.rs
```

### 13.6.2 Package

**Package 是由 Cargo.toml 定义的一组 crate。** 规则：

- 最多一个库 crate
- 可以有多个二进制 crate
- 至少有一个 crate

```
my-project/                    ← Package
├── Cargo.toml                 ← Package 配置
├── src/
│   ├── main.rs                ← 默认二进制 crate（与 package 同名）
│   ├── lib.rs                 ← 库 crate
│   └── bin/
│       ├── tool1.rs           ← 额外的二进制 crate: tool1
│       └── tool2.rs           ← 额外的二进制 crate: tool2
├── tests/                     ← 集成测试
├── benches/                   ← 性能测试
└── examples/                  ← 示例代码
```

**对比 npm package：**

```
my-project/                    ← npm package
├── package.json               ← 类似 Cargo.toml
├── src/
│   └── index.js               ← 入口文件
├── bin/
│   └── cli.js                 ← CLI 入口（package.json 的 "bin" 字段）
└── test/                      ← 测试
```

### 13.6.3 一个典型的 Cargo.toml

```toml
[package]
name = "my-awesome-project"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <you@example.com>"]
description = "一个很棒的 Rust 项目"
license = "MIT"
repository = "https://github.com/you/my-awesome-project"

# 依赖
[dependencies]
serde = { version = "1.0", features = ["derive"] }   # 指定 features
tokio = { version = "1", features = ["full"] }
reqwest = "0.11"                                       # 简写
uuid = { version = "1", features = ["v4"] }

# 开发依赖（只在测试和示例中使用）
[dev-dependencies]
pretty_assertions = "1.0"
criterion = "0.5"

# 构建依赖（只在构建脚本中使用）
[build-dependencies]
cc = "1.0"

# 二进制目标
[[bin]]
name = "my-tool"
path = "src/bin/tool.rs"
```

**对比 package.json：**

```json
{
    "name": "my-awesome-project",
    "version": "0.1.0",
    "description": "一个很棒的 Node.js 项目",
    "license": "MIT",
    "dependencies": {
        "express": "^4.18.0",
        "uuid": "^9.0.0"
    },
    "devDependencies": {
        "jest": "^29.0.0"
    }
}
```

---

## 13.7 依赖管理

### 13.7.1 添加依赖

```bash
# 用命令行添加（推荐）
cargo add serde --features derive
cargo add tokio --features full
cargo add reqwest

# 添加开发依赖
cargo add --dev pretty_assertions

# 删除依赖
cargo remove serde
```

**对比 npm：**

```bash
npm install express
npm install --save-dev jest
npm uninstall express
```

### 13.7.2 版本规范

```toml
[dependencies]
# 精确版本
exact = "=1.2.3"

# 兼容更新（默认，等价于 ^1.2.3）
compatible = "1.2.3"    # ≥1.2.3, <2.0.0

# 通配符
wildcard = "1.2.*"      # ≥1.2.0, <1.3.0

# 范围
range = ">=1.0, <2.0"

# 从 Git 仓库
from_git = { git = "https://github.com/user/repo", branch = "main" }

# 从本地路径
from_path = { path = "../my-other-crate" }
```

**Cargo.lock 的角色：**

```
Cargo.toml  → 你声明的依赖范围（"给我 serde 1.x"）
Cargo.lock  → 实际锁定的版本（"用 serde 1.0.197"）
```

- **二进制项目：** 提交 Cargo.lock 到 Git（确保所有人用相同版本）
- **库项目：** 不提交 Cargo.lock（让使用者决定具体版本）

与 npm 的对比：`Cargo.toml` = `package.json`，`Cargo.lock` = `package-lock.json`

### 13.7.3 Features（功能开关）

Rust 的 features 系统允许条件编译：

```toml
# Cargo.toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }
```

```rust
// 在代码中使用条件编译
#[cfg(feature = "json")]
pub fn parse_json(input: &str) -> Result<Value, Error> {
    // ...
}
```

这类似于 npm 包的可选依赖，但更加灵活和精细。

---

## 13.8 Workspace（工作空间）

### 13.8.1 什么是 Workspace？

Workspace 让你在一个仓库中管理多个相关的 crate，类似于 JavaScript 的 monorepo。

**对比 JavaScript monorepo：**

```
# JavaScript monorepo (pnpm/yarn workspace)
my-project/
├── package.json          # { "workspaces": ["packages/*"] }
├── pnpm-workspace.yaml
└── packages/
    ├── core/
    │   └── package.json
    ├── cli/
    │   └── package.json
    └── web/
        └── package.json
```

```
# Rust workspace
my-project/
├── Cargo.toml            # [workspace] members = ["crates/*"]
└── crates/
    ├── core/
    │   ├── Cargo.toml
    │   └── src/lib.rs
    ├── cli/
    │   ├── Cargo.toml
    │   └── src/main.rs
    └── web/
        ├── Cargo.toml
        └── src/lib.rs
```

### 13.8.2 配置 Workspace

```toml
# 根 Cargo.toml
[workspace]
members = [
    "crates/core",
    "crates/cli",
    "crates/web",
]

# 共享的依赖版本
[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
```

```toml
# crates/core/Cargo.toml
[package]
name = "my-core"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { workspace = true }  # 使用 workspace 中定义的版本
```

```toml
# crates/cli/Cargo.toml
[package]
name = "my-cli"
version = "0.1.0"
edition = "2021"

[dependencies]
my-core = { path = "../core" }  # 引用同一 workspace 中的 crate
tokio = { workspace = true }
```

### 13.8.3 Workspace 命令

```bash
# 构建整个 workspace
cargo build

# 只构建某个 crate
cargo build -p my-cli

# 运行某个二进制 crate
cargo run -p my-cli

# 测试整个 workspace
cargo test

# 只测试某个 crate
cargo test -p my-core
```

**Workspace 的优势：**
1. 共享 `Cargo.lock`（所有 crate 用同一版本的依赖）
2. 共享编译缓存（target/ 目录）
3. 统一的依赖版本管理
4. 方便本地开发和测试

---

## 13.9 发布到 crates.io

### 13.9.1 准备工作

```toml
# Cargo.toml —— 发布前必须填写的字段
[package]
name = "my-awesome-crate"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <you@example.com>"]
description = "一句话描述你的 crate"  # 必须
license = "MIT OR Apache-2.0"         # 必须
repository = "https://github.com/you/my-crate"
documentation = "https://docs.rs/my-awesome-crate"
readme = "README.md"
keywords = ["keyword1", "keyword2"]   # 最多 5 个
categories = ["development-tools"]     # 从官方列表中选
```

### 13.9.2 发布流程

```bash
# 1. 注册 crates.io 账号并获取 API token
cargo login <your-api-token>

# 2. 检查是否可以发布
cargo publish --dry-run

# 3. 发布！
cargo publish

# 4. 发布新版本时，修改 Cargo.toml 中的 version，然后再次 publish
```

**对比 npm publish：**

```bash
# npm
npm login
npm publish --dry-run
npm publish
```

### 13.9.3 语义化版本

```
版本号: MAJOR.MINOR.PATCH

MAJOR（主版本）: 不兼容的 API 变更     → 2.0.0
MINOR（次版本）: 向后兼容的新功能       → 1.1.0
PATCH（补丁版本）: 向后兼容的 bug 修复  → 1.0.1

0.x.y: 初始开发阶段，任何变更都可能不兼容
```

与 npm 的语义化版本完全相同。

### 13.9.4 yanking 版本

如果发布了一个有问题的版本，可以 yank（撤回）：

```bash
# 撤回版本（不再出现在搜索中，但已使用的项目不受影响）
cargo yank --version 0.1.1

# 取消撤回
cargo yank --version 0.1.1 --undo
```

注意：yank 不会删除已发布的代码。已经依赖这个版本的项目仍然可以正常编译。这跟 npm unpublish 不同（npm 在一定条件下可以完全删除）。

---

## 13.10 实战：项目结构示例

### 13.10.1 小型项目

```
my-tool/
├── Cargo.toml
├── src/
│   ├── main.rs        # 入口
│   ├── config.rs      # 配置模块
│   ├── cli.rs         # 命令行解析
│   └── utils.rs       # 工具函数
└── tests/
    └── integration.rs # 集成测试
```

```rust
// src/main.rs
mod config;
mod cli;
mod utils;

fn main() {
    let cfg = config::load();
    let args = cli::parse();
    // ...
}
```

### 13.10.2 中型项目

```
my-app/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── lib.rs          # 库入口（可以同时有 main.rs 和 lib.rs）
│   ├── config.rs
│   ├── error.rs        # 自定义错误类型
│   ├── models/
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   └── post.rs
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   └── api.rs
│   └── db/
│       ├── mod.rs
│       ├── connection.rs
│       └── queries.rs
├── tests/
│   ├── auth_test.rs
│   └── api_test.rs
└── examples/
    └── basic_usage.rs
```

### 13.10.3 大型项目（Workspace）

```
lighthouse/
├── Cargo.toml                 # workspace 根配置
├── crates/
│   ├── lighthouse-core/       # 核心逻辑
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── scanner.rs
│   │       └── analyzer.rs
│   ├── lighthouse-cli/        # 命令行工具
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── main.rs
│   ├── lighthouse-web/        # Web API
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   └── lighthouse-common/     # 共享类型和工具
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── types.rs
│           └── utils.rs
└── docs/
    └── architecture.md
```

---

## 13.11 常用 Cargo 命令

```bash
# 创建项目
cargo new my-project          # 创建二进制项目
cargo new my-lib --lib        # 创建库项目
cargo init                    # 在当前目录初始化

# 构建
cargo build                   # Debug 构建
cargo build --release         # Release 构建（优化）
cargo check                   # 只检查不编译（更快）

# 运行
cargo run                     # 构建并运行
cargo run -- arg1 arg2        # 传递命令行参数
cargo run --example basic     # 运行示例

# 测试
cargo test                    # 运行所有测试
cargo test test_name          # 运行特定测试
cargo test -- --nocapture     # 显示 println! 输出

# 文档
cargo doc                     # 生成文档
cargo doc --open              # 生成并打开文档

# 依赖
cargo add serde               # 添加依赖
cargo update                  # 更新依赖
cargo tree                    # 显示依赖树

# 其他
cargo fmt                     # 格式化代码
cargo clippy                  # 代码 lint
cargo bench                   # 运行性能测试
cargo clean                   # 清理构建产物
```

**Cargo vs npm 命令对照：**

| Cargo | npm/npx | 说明 |
|---|---|---|
| `cargo new` | `npm init` | 创建项目 |
| `cargo build` | `npm run build` | 构建 |
| `cargo run` | `npm start` / `node .` | 运行 |
| `cargo test` | `npm test` | 测试 |
| `cargo add` | `npm install` | 添加依赖 |
| `cargo update` | `npm update` | 更新依赖 |
| `cargo publish` | `npm publish` | 发布 |
| `cargo fmt` | `npx prettier --write .` | 格式化 |
| `cargo clippy` | `npx eslint .` | Lint |
| `cargo doc` | `npx typedoc` | 生成文档 |
| `cargo tree` | `npm ls` | 依赖树 |
| `cargo bench` | 无内置 | 性能测试 |
| `cargo clean` | `rm -rf node_modules` | 清理 |

---

## 13.12 小结

| 概念 | Rust | JavaScript/Node.js |
|---|---|---|
| 模块定义 | `mod name { }` 或文件 | 文件 = 模块 |
| 导出 | `pub` | `export` |
| 导入 | `use path::to::item` | `import { item } from './path'` |
| 包配置 | `Cargo.toml` | `package.json` |
| 包管理器 | `cargo` | `npm` / `pnpm` / `yarn` |
| 包仓库 | `crates.io` | `npmjs.com` |
| 锁文件 | `Cargo.lock` | `package-lock.json` |
| Monorepo | `[workspace]` | workspaces |
| 默认可见性 | 私有 | 公开（模块内） |
| 条件编译 | `features` | 无内置 |

**核心要点：**
1. Rust 默认私有，需要 `pub` 显式公开
2. `mod` 声明模块，`use` 引入路径
3. 文件组织与模块树一一对应
4. `pub use` 重新导出可以简化公开 API
5. Workspace 管理多 crate 项目，类似 monorepo
6. `cargo` 集成了构建、测试、发布等全部功能

---

## 13.13 练习题

### 练习 1：模块组织

将以下代码拆分成多个文件的模块结构：

```rust
// 当前全在一个文件里
struct User { name: String, email: String }
struct Post { title: String, content: String, author: User }
fn create_user(name: &str, email: &str) -> User { todo!() }
fn create_post(title: &str, content: &str, author: User) -> Post { todo!() }
fn validate_email(email: &str) -> bool { todo!() }
fn hash_password(password: &str) -> String { todo!() }
```

画出你的文件结构，并写出每个文件中的 `mod` 和 `use` 语句。

### 练习 2：可见性控制

修复以下代码的可见性问题：

```rust
mod database {
    struct Connection {
        url: String,
    }

    impl Connection {
        fn new(url: &str) -> Self {
            Connection { url: url.to_string() }
        }

        fn query(&self, sql: &str) -> Vec<String> {
            vec![format!("结果: {}", sql)]
        }
    }

    mod pool {
        struct Pool {
            connections: Vec<super::Connection>,
        }

        impl Pool {
            fn new(url: &str, size: usize) -> Self {
                let connections = (0..size)
                    .map(|_| super::Connection::new(url))
                    .collect();
                Pool { connections }
            }
        }
    }
}

fn main() {
    let pool = database::pool::Pool::new("postgres://localhost/db", 5);
}
```

### 练习 3：创建 Workspace

设计一个 TODO 应用的 workspace 结构：
- `todo-core`：核心数据类型和逻辑
- `todo-cli`：命令行界面
- `todo-web`：Web API

写出根 `Cargo.toml` 和每个 crate 的 `Cargo.toml`。

### 练习 4：pub use 重构

你有一个库，内部结构是：

```
src/
├── lib.rs
├── internal/
│   ├── mod.rs
│   ├── parser/
│   │   ├── mod.rs
│   │   ├── json.rs    → pub struct JsonParser
│   │   └── xml.rs     → pub struct XmlParser
│   └── formatter/
│       ├── mod.rs
│       └── pretty.rs  → pub fn format_output()
```

用户不应该知道内部结构。用 `pub use` 在 `lib.rs` 中重新导出，让用户可以这样使用：

```rust
use my_crate::JsonParser;
use my_crate::XmlParser;
use my_crate::format_output;
```

### 练习 5：Cargo.toml 配置

为一个 Web 爬虫项目编写完整的 `Cargo.toml`，需要以下依赖：
- HTTP 请求：`reqwest`（需要 `json` feature）
- HTML 解析：`scraper`
- 异步运行时：`tokio`（需要 `full` feature）
- 序列化：`serde` 和 `serde_json`
- 命令行参数：`clap`（需要 `derive` feature）
- 日志：`tracing` 和 `tracing-subscriber`

加上合适的 `[package]` 信息和 `[dev-dependencies]`。

---

> **恭喜！** 你已经完成了 Rust 模块系统的学习。到这里，你已经掌握了 Rust 的核心语言特性。接下来的章节将进入更高级的主题：错误处理、并发编程、异步 I/O 等。继续加油！ 🦀
