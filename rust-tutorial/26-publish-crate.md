# 第二十六章：发布 crate —— 从本地项目到 crates.io

> **本章目标**
>
> - 理解 crate 文档体系（README、rustdoc、examples、API 文档）
> - 掌握文档测试（doctest）与示例测试的写法
> - 走通 crates.io 发布全流程（注册、登录、打包、发布）
> - 理解语义化版本（SemVer）在 Rust 生态中的具体实践
> - 学会配置 GitHub Actions 进行 CI/CD 自动发布
> - 建立 crate 长期维护策略（兼容性、安全、弃用、发布节奏）
> - 能独立把一个 Rust 库从 0 发布到 1，并稳定迭代

> **预计学习时间：120 - 180 分钟**（建议边看边在自己的 crate 上实操）

---

## 26.1 为什么要发布 crate？

在 JavaScript/TypeScript 世界，你会把包发布到 npm；在 Rust 世界，对应平台就是 **crates.io**。

发布 crate 的价值：

1. **复用**：你的工具函数不需要每个项目复制粘贴。
2. **协作**：团队内可以统一依赖版本。
3. **影响力**：别人可以直接 `cargo add your-crate` 使用你的成果。
4. **质量提升**：一旦公开发布，你会更重视 API 设计和测试。
5. **职业加分**：高质量开源 crate 是非常直观的能力证明。

对比：

| 生态 | 包管理 | 发布平台 | 安装命令 |
|---|---|---|---|
| JS/TS | npm/pnpm/yarn | npmjs.com | `npm i package` |
| Rust | Cargo | crates.io | `cargo add crate` |

---

## 26.2 crate 文档（rustdoc）

### 26.2.1 文档是 API 的一部分

在 Rust 生态，文档质量几乎和代码质量同等重要。高质量文档至少包含：

- crate 级说明（做什么、为什么、快速开始）
- 每个公开类型/函数的用途
- 参数和返回值语义
- 错误行为
- 示例代码
- 边界条件说明

### 26.2.2 crate 顶层文档

在 `src/lib.rs` 顶部写 crate 文档：

```rust
//! # fast-id
//!
//! 一个高性能的分布式 ID 生成器。
//!
//! ## 特性
//!
//! - 线程安全
//! - 无外部依赖
//! - 支持自定义 worker_id
//!
//! ## 快速开始
//!
//! ```
//! use fast_id::IdGenerator;
//!
//! let mut gen = IdGenerator::new(1).unwrap();
//! let id = gen.next_id().unwrap();
//! assert!(id > 0);
//! ```
```

### 26.2.3 函数级文档

```rust
/// 生成下一个唯一 ID。
///
/// # Errors
///
/// 当系统时钟回拨且超过容忍范围时返回错误。
///
/// # Examples
///
/// ```
/// use fast_id::IdGenerator;
///
/// let mut gen = IdGenerator::new(1).unwrap();
/// let id = gen.next_id().unwrap();
/// assert!(id > 0);
/// ```
pub fn next_id(&mut self) -> Result<u64, Error> {
    // ...
    todo!()
}
```

### 26.2.4 常用 rustdoc 区块

建议统一使用：

- `# Examples`
- `# Panics`
- `# Errors`
- `# Safety`（unsafe API 必须写）

```rust
/// 从字节切片解析 header。
///
/// # Errors
/// 当输入长度不足 8 字节时返回错误。
///
/// # Panics
/// 本函数不会 panic。
pub fn parse_header(data: &[u8]) -> Result<Header, ParseError> {
    // ...
    todo!()
}
```

### 26.2.5 生成本地文档

```bash
# 生成文档
cargo doc --no-deps

# 生成并打开浏览器
cargo doc --open --no-deps

# 文档中包含私有项（调试用）
cargo doc --document-private-items
```

### 26.2.6 README 与 docs.rs 对齐

Rust 社区常见做法：README 与 crate 文档保持一致，避免两套文档漂移。

你可以在 `lib.rs` 中直接 include README：

```rust
#![doc = include_str!("../README.md")]
```

这样 docs.rs 展示的首页和 GitHub README 内容一致。

---

## 26.3 文档测试（doctest）

### 26.3.1 doctest 是什么

Rust 文档中的代码块默认会被当作测试执行（可编译、可运行）。

这意味着：**文档示例不会过时**，因为 CI 会持续验证。

```rust
/// 计算两数之和。
///
/// ```
/// use my_math::add;
/// assert_eq!(add(1, 2), 3);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

运行：

```bash
cargo test
# 会包含 unit tests + integration tests + doctests
```

### 26.3.2 控制代码块行为

```rust
/// 这个示例只检查能否编译，不运行。
///
/// ```no_run
/// # use std::net::TcpListener;
/// let _listener = TcpListener::bind("127.0.0.1:8080").unwrap();
/// ```

/// 这个示例只做编译失败测试。
///
/// ```compile_fail
/// let x: i32 = "hello";
/// ```

/// 这个示例会被忽略（不建议常用）。
///
/// ```ignore
/// // 某些平台相关代码
/// ```
```

### 26.3.3 隐藏样板代码

```rust
/// 从环境变量读取配置。
///
/// ```
/// # use my_crate::Config;
/// # std::env::set_var("APP_PORT", "8080");
/// let cfg = Config::from_env().unwrap();
/// assert_eq!(cfg.port, 8080);
/// ```
```

`#` 开头行会参与编译，但不会显示给读者。

### 26.3.4 文档测试最佳实践

1. 每个公开 API 至少一个示例。
2. 示例要贴近真实使用场景，不要只写 `assert_eq!(1, 1)`。
3. 对可能失败的 API 展示 `Result` 处理方式。
4. 对 async API 给出 `tokio::main` 或 runtime 示例。
5. 保持示例最小可运行。

---

## 26.4 crates.io 发布流程

### 26.4.1 发布前准备清单

发布前请逐项检查：

- [ ] `Cargo.toml` 填写完整元信息
- [ ] `README.md` 清晰
- [ ] `LICENSE` 存在（MIT/Apache-2.0 常见）
- [ ] `cargo test` 全通过
- [ ] `cargo clippy -- -D warnings` 无警告
- [ ] `cargo fmt --check` 通过
- [ ] `cargo package` 成功
- [ ] `cargo publish --dry-run` 成功

### 26.4.2 Cargo.toml 元信息示例

```toml
[package]
name = "fast-id"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <you@example.com>"]
description = "高性能分布式 ID 生成器"
license = "MIT OR Apache-2.0"
repository = "https://github.com/yourname/fast-id"
homepage = "https://github.com/yourname/fast-id"
documentation = "https://docs.rs/fast-id"
readme = "README.md"
keywords = ["id", "snowflake", "uuid", "generator"]
categories = ["algorithms", "data-structures"]
rust-version = "1.75"

[dependencies]
thiserror = "1"
```

### 26.4.3 登录 crates.io

步骤：

1. 打开 <https://crates.io>
2. 使用 GitHub 登录
3. 到账户设置生成 API Token
4. 本地登录：

```bash
cargo login <YOUR_TOKEN>
```

Token 会保存到本地 Cargo 凭据文件。

### 26.4.4 打包检查

```bash
# 检查将被打包的内容
cargo package --list

# 进行打包验证
cargo package

# 模拟发布（推荐）
cargo publish --dry-run
```

如果某些大文件不想上传，可在 `Cargo.toml` 中设置：

```toml
[package]
exclude = [
  "assets/*",
  "scripts/*",
  "benchmarks/raw-data/*"
]
```

### 26.4.5 正式发布

```bash
cargo publish
```

发布成功后：

- crates.io 页面几分钟内可见
- docs.rs 会自动构建文档

### 26.4.6 撤回版本（yank）

Rust 生态**不允许删除**已发布版本（保证可复现构建），但可以 yank：

```bash
# 撤回某个版本（不再用于新解析）
cargo yank --vers 0.1.0

# 取消撤回
cargo yank --vers 0.1.0 --undo
```

说明：已锁定该版本的项目仍可继续构建，yank 只影响新的依赖解析。

---

## 26.5 语义化版本（SemVer）

### 26.5.1 SemVer 基本规则

版本格式：`MAJOR.MINOR.PATCH`

- **PATCH**：向后兼容的 bug 修复（`1.2.3 -> 1.2.4`）
- **MINOR**：向后兼容的新功能（`1.2.3 -> 1.3.0`）
- **MAJOR**：不向后兼容的变更（`1.2.3 -> 2.0.0`）

### 26.5.2 Rust 中的兼容性判断

以下变更通常算 breaking change：

1. 删除 public API。
2. 修改函数参数类型。
3. 修改返回类型。
4. 修改 trait 方法签名。
5. 提高 `rust-version` 最低版本。
6. 改变公开结构体字段。
7. 调整错误枚举导致匹配分支失效。

### 26.5.3 示例：版本升级判断

```rust
// v1.2.0
pub fn parse(input: &str) -> Result<Value, Error> { ... }

// v1.2.1（PATCH）
// 修复解析边界 bug，签名不变 ✅

// v1.3.0（MINOR）
pub fn parse_with_opts(input: &str, opts: Options) -> Result<Value, Error> { ... }
// 新增 API，不破坏旧 API ✅

// v2.0.0（MAJOR）
pub fn parse(input: &[u8]) -> Result<Value, Error> { ... }
// 参数类型从 &str 改为 &[u8]，破坏兼容 ❌
```

### 26.5.4 依赖版本约束

在 Cargo.toml 中：

```toml
[dependencies]
serde = "1.0"      # ^1.0，允许 1.x.y
tokio = "1.37"     # ^1.37，允许 1.x.y >=1.37
regex = "=1.10.4"  # 锁定精确版本
```

语义：

- `1.2` 等价 `^1.2`
- `^1.2` 允许 `<2.0.0`
- `~1.2` 允许 `<1.3.0`

### 26.5.5 0.x 版本的特殊规则

SemVer 对 `0.x` 更严格：

- `0.1 -> 0.2` 可能被视为 breaking
- 建议尽早稳定到 `1.0`，给使用者更清晰预期

### 26.5.6 版本发布策略建议

1. 公共 crate 尽量遵守“兼容优先”。
2. API 改动前先 `deprecated` 一两个小版本。
3. 提供迁移指南（Upgrade Guide）。
4. 保持 `CHANGELOG.md` 清晰可读。

---

## 26.6 CI/CD（GitHub Actions）

你至少需要两类 workflow：

1. **CI**：每次 PR/Push 自动测试。
2. **Release/Publish**：打 tag 后自动发布。

### 26.6.1 基础 CI 工作流

`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        toolchain: [stable, beta]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: ${{ matrix.toolchain }}

      - name: Cache Cargo
        uses: Swatinem/rust-cache@v2

      - name: Format check
        run: cargo fmt --all --check

      - name: Clippy
        run: cargo clippy --all-targets --all-features -- -D warnings

      - name: Test
        run: cargo test --all-features

      - name: Doc test
        run: cargo test --doc

      - name: Build release
        run: cargo build --release
```

### 26.6.2 发布工作流（Tag 触发）

`.github/workflows/publish.yml`

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Cache Cargo
        uses: Swatinem/rust-cache@v2

      - name: Verify
        run: |
          cargo fmt --all --check
          cargo clippy --all-targets --all-features -- -D warnings
          cargo test --all-features
          cargo publish --dry-run

      # 方案 A：传统 token 发布
      - name: Publish to crates.io
        env:
          CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN }}
        run: cargo publish
```

### 26.6.3 使用 Trusted Publishing（推荐）

crates.io 支持 OIDC Trusted Publishing（减少长期 token 暴露风险）。

高层流程：

1. 在 crates.io 配置 GitHub 仓库为受信任发布者。
2. workflow 里启用 `id-token: write`。
3. 使用对应 action 完成无 token 发布。

如果你团队安全要求高，优先采用该方案。

### 26.6.4 多 crate（workspace）发布

如果项目是 workspace：

```bash
cargo publish -p crate-a
cargo publish -p crate-b
```

发布顺序要考虑依赖关系：先底层库，再上层库。

### 26.6.5 自动版本发布工具

可以引入：

- `cargo-release`
- `release-plz`

用于自动 bump 版本、打 tag、生成 changelog、发布。

示例（cargo-release）：

```bash
cargo install cargo-release
cargo release patch --execute
```

---

## 26.7 维护最佳实践

### 26.7.1 稳定 API 设计

1. 尽量隐藏实现细节，暴露最小 public API。
2. 对外 API 使用明确类型，不要泄漏内部结构。
3. 谨慎公开 struct 字段；优先 getter/setter。
4. 错误类型要可扩展（避免未来破坏性改动）。

### 26.7.2 错误处理策略

库代码建议：

- 不要随意 panic
- 用 `Result<T, E>` 返回可恢复错误
- 错误类型实现 `std::error::Error`
- 用 `thiserror` 简化错误定义

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum IdError {
    #[error("worker_id 超出范围: {0}")]
    InvalidWorkerId(u16),

    #[error("系统时钟回拨")]
    ClockMovedBackwards,
}
```

### 26.7.3 弃用流程（deprecate）

不要直接删除 API，先标记弃用：

```rust
#[deprecated(
    since = "1.4.0",
    note = "请使用 `new_with_options`，该函数将在 2.0 移除"
)]
pub fn new(worker_id: u16) -> Result<Self, IdError> {
    Self::new_with_options(worker_id, Default::default())
}
```

### 26.7.4 CHANGELOG 管理

建议采用 Keep a Changelog 风格：

```markdown
## [1.3.0] - 2026-03-01
### Added
- 新增 `IdGenerator::new_with_options`

### Changed
- 优化内部时间戳计算，降低锁竞争

### Fixed
- 修复并发场景下序列号边界 bug

### Deprecated
- `IdGenerator::new` 标记为 deprecated
```

### 26.7.5 安全响应

如果发现安全漏洞：

1. 先私下修复，不要立即公开 exploit 细节。
2. 发布修复版本（PATCH/MINOR 视兼容性）。
3. 在 release note 中给出影响范围与升级建议。
4. 必要时申请 CVE。

### 26.7.6 最低 Rust 版本（MSRV）

建议明确声明 MSRV：

```toml
[package]
rust-version = "1.75"
```

并在 CI 中加入 MSRV 检查（可选）：

```yaml
- name: Check MSRV
  uses: dtolnay/rust-toolchain@master
  with:
    toolchain: 1.75.0

- name: Build with MSRV
  run: cargo check
```

### 26.7.7 依赖治理

1. 定期 `cargo update`。
2. 用 `cargo audit` 扫描漏洞。
3. 避免无维护依赖。
4. 减少依赖数量，降低供应链风险。

```bash
cargo install cargo-audit
cargo audit
```

---

## 26.8 从 0 到 1：完整发布实战

下面给你一个实际操作脚本（假设 crate 名为 `tiny-cache`）。

### 26.8.1 初始化项目

```bash
cargo new tiny-cache --lib
cd tiny-cache
```

### 26.8.2 编写基础 API

`src/lib.rs`

```rust
//! # tiny-cache
//!
//! 一个极简线程安全内存缓存。
//!
//! ## 示例
//!
//! ```
//! use tiny_cache::Cache;
//!
//! let cache = Cache::new();
//! cache.set("lang", "rust");
//! assert_eq!(cache.get("lang"), Some("rust".to_string()));
//! ```

use std::collections::HashMap;
use std::sync::RwLock;

pub struct Cache {
    inner: RwLock<HashMap<String, String>>,
}

impl Cache {
    /// 创建一个空缓存。
    pub fn new() -> Self {
        Self {
            inner: RwLock::new(HashMap::new()),
        }
    }

    /// 写入键值。
    pub fn set(&self, key: impl Into<String>, value: impl Into<String>) {
        let mut guard = self.inner.write().expect("锁中毒");
        guard.insert(key.into(), value.into());
    }

    /// 读取键值。
    pub fn get(&self, key: &str) -> Option<String> {
        let guard = self.inner.read().expect("锁中毒");
        guard.get(key).cloned()
    }

    /// 删除键。
    pub fn remove(&self, key: &str) -> Option<String> {
        let mut guard = self.inner.write().expect("锁中毒");
        guard.remove(key)
    }

    /// 当前元素个数。
    pub fn len(&self) -> usize {
        let guard = self.inner.read().expect("锁中毒");
        guard.len()
    }

    /// 是否为空。
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

impl Default for Cache {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::Cache;

    #[test]
    fn basic_ops() {
        let cache = Cache::new();
        assert!(cache.is_empty());

        cache.set("a", "1");
        assert_eq!(cache.get("a"), Some("1".to_string()));
        assert_eq!(cache.len(), 1);

        assert_eq!(cache.remove("a"), Some("1".to_string()));
        assert_eq!(cache.get("a"), None);
    }
}
```

### 26.8.3 填写 Cargo.toml

```toml
[package]
name = "tiny-cache"
version = "0.1.0"
edition = "2021"
description = "A tiny thread-safe in-memory cache"
license = "MIT OR Apache-2.0"
repository = "https://github.com/yourname/tiny-cache"
readme = "README.md"
keywords = ["cache", "in-memory"]
categories = ["caching", "data-structures"]
rust-version = "1.75"
```

### 26.8.4 本地质量门禁

```bash
cargo fmt --all
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo test --doc
cargo package
cargo publish --dry-run
```

### 26.8.5 正式发布

```bash
cargo login <TOKEN>
cargo publish
```

### 26.8.6 发布后验证

新建测试项目：

```bash
cargo new cache-demo
cd cache-demo
cargo add tiny-cache
```

`src/main.rs`：

```rust
use tiny_cache::Cache;

fn main() {
    let cache = Cache::new();
    cache.set("hello", "world");
    println!("{:?}", cache.get("hello"));
}
```

运行：

```bash
cargo run
```

---

## 26.9 CI 发布流程（你要求的重点）

这里给一个更完整的“可直接落地”流程。

### 26.9.1 分支与版本管理约定

- 开发在 `main`。
- 每个 PR 必须通过 CI。
- 发布时由维护者执行：
  1. 更新 `Cargo.toml` 版本
  2. 更新 `CHANGELOG.md`
  3. 提交并打 tag：`vX.Y.Z`
  4. push tag 触发自动发布

### 26.9.2 发布前检查脚本

`scripts/release-check.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "===> fmt"
cargo fmt --all --check

echo "===> clippy"
cargo clippy --all-targets --all-features -- -D warnings

echo "===> test"
cargo test --all-features

echo "===> doctest"
cargo test --doc

echo "===> package"
cargo package

echo "===> publish dry-run"
cargo publish --dry-run

echo "✅ release check passed"
```

### 26.9.3 GitHub Action：CI

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - run: bash scripts/release-check.sh
```

### 26.9.4 GitHub Action：Publish

```yaml
name: publish

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2

      - name: Verify version matches tag
        run: |
          TAG="${GITHUB_REF_NAME#v}"
          VER=$(grep '^version = ' Cargo.toml | head -n1 | cut -d '"' -f2)
          echo "tag=$TAG cargo=$VER"
          test "$TAG" = "$VER"

      - name: Run checks
        run: bash scripts/release-check.sh

      - name: Publish
        env:
          CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN }}
        run: cargo publish
```

### 26.9.5 发布失败回滚策略

如果发布步骤失败：

1. 不要重复多次盲目重试。
2. 查看失败点：网络、权限、版本冲突、元信息缺失。
3. 如果版本已发布部分工件（通常 crates.io 原子性较好），检查 crates.io 状态。
4. 修复后 bump patch 版本再发布（避免 tag/版本混乱）。

---

## 26.10 常见发布问题排查

### 26.10.1 名称冲突

报错：crate 名称已被占用。

处理：换一个更具体名称，比如：

- `util` -> `dd-util-kit`
- `cache` -> `tiny-cache-rs`

### 26.10.2 缺少 license

crates.io 要求可识别许可证。

```toml
license = "MIT OR Apache-2.0"
```

并确保仓库中有 `LICENSE-MIT` 与 `LICENSE-APACHE`（或单 LICENSE 文件）。

### 26.10.3 发布包太大

检查：

```bash
cargo package --list
```

排除不必要文件：

```toml
exclude = [
  "tests/fixtures/huge.bin",
  "screenshots/*",
  "tmp/*"
]
```

### 26.10.4 docs.rs 构建失败

常见原因：

1. 文档依赖系统库缺失。
2. 某 feature 组合下编译失败。
3. 使用 nightly-only API。

可在 Cargo.toml 中增加 docs.rs 配置：

```toml
[package.metadata.docs.rs]
all-features = true
# 或者指定：features = ["serde", "tokio"]
```

### 26.10.5 token 权限问题

如果 `cargo publish` 提示无权限：

1. 确认 token 没过期。
2. 确认是正确账户创建。
3. 仓库 Secrets 中变量名拼写正确：`CARGO_REGISTRY_TOKEN`。
4. 本地测试 `cargo login` 后 `cargo publish --dry-run`。

---

## 26.11 API 稳定性设计细节

### 26.11.1 避免公开内部字段

```rust
// 不推荐
pub struct Config {
    pub timeout_ms: u64,
    pub retries: u8,
}

// 推荐
pub struct Config {
    timeout_ms: u64,
    retries: u8,
}

impl Config {
    pub fn timeout_ms(&self) -> u64 { self.timeout_ms }
    pub fn retries(&self) -> u8 { self.retries }
}
```

这样未来新增校验或更改存储布局时，不会直接破坏外部代码。

### 26.11.2 builder 模式降低 breaking 风险

```rust
pub struct ClientBuilder {
    timeout_ms: u64,
    retries: u8,
}

impl ClientBuilder {
    pub fn new() -> Self {
        Self { timeout_ms: 3000, retries: 2 }
    }

    pub fn timeout_ms(mut self, v: u64) -> Self {
        self.timeout_ms = v;
        self
    }

    pub fn retries(mut self, v: u8) -> Self {
        self.retries = v;
        self
    }

    pub fn build(self) -> Client {
        Client {
            timeout_ms: self.timeout_ms,
            retries: self.retries,
        }
    }
}

pub struct Client {
    timeout_ms: u64,
    retries: u8,
}
```

新增配置项时只需扩展 builder，不会破坏旧调用链。

---

## 26.12 发布节奏建议

建议采用固定节奏（示例）：

- 每周：合并常规 PR
- 每两周：发布一个 MINOR/PATCH
- 紧急 bug：立即 PATCH
- 大改动：提前预告并提供迁移指南

发布模板（每次 release note）：

1. 新增功能
2. 修复问题
3. 兼容性说明
4. 升级步骤
5. 感谢贡献者

---

## 26.13 Rust 与 npm 发布思维差异

面向 TS/JS 开发者重点对比：

1. npm 常见“先发再修”；Rust 更强调发布前质量门禁。
2. Rust 文档测试是强约束，示例必须可运行。
3. crates.io 不允许删除版本，只能 yank。
4. SemVer 在 Rust 生态中执行更严格（尤其 trait/API 改动）。
5. Rust 用户非常看重 docs.rs 文档质量和错误类型设计。

---

## 26.14 发布前最终 Checklist（可复制）

```markdown
## Release Checklist

- [ ] 版本号已更新（Cargo.toml）
- [ ] CHANGELOG 已更新
- [ ] README 示例已验证
- [ ] cargo fmt --all --check
- [ ] cargo clippy --all-targets --all-features -- -D warnings
- [ ] cargo test --all-features
- [ ] cargo test --doc
- [ ] cargo package
- [ ] cargo publish --dry-run
- [ ] tag 与 Cargo.toml 版本一致
- [ ] GitHub Actions 全绿
- [ ] 已 push tag：vX.Y.Z
```

---

## 26.15 练习题

### 练习 1：发布你的第一个 crate

要求：

1. 新建一个 `string-case-tools` 库，提供 `to_snake_case` 和 `to_kebab_case`。
2. 每个公开函数写至少 2 个 doctest。
3. 配置 CI（fmt、clippy、test、doctest）。
4. 在本地跑通 `cargo publish --dry-run`。
5. 正式发布到 crates.io。

### 练习 2：语义化版本演练

给出以下改动，判断应 bump PATCH/MINOR/MAJOR：

1. 修复某函数 panic 的 bug。
2. 新增一个不影响旧 API 的函数。
3. 将 `pub fn parse(&str)` 改成 `pub fn parse(&[u8])`。
4. 给 `enum Error` 新增一个变体。
5. 删除一个旧函数并无替代。

### 练习 3：写一个 publish workflow

编写 `.github/workflows/publish.yml`，要求：

- 仅在 `v*.*.*` tag 触发。
- 发布前必须执行 fmt/clippy/test/doctest。
- 版本号与 tag 不一致时直接失败。
- 使用 `CARGO_REGISTRY_TOKEN` secret 发布。

### 练习 4：维护实践

在你的 crate 中：

1. 将一个旧 API 标记 `deprecated`。
2. 新增替代 API。
3. 写一段迁移文档（旧 -> 新）。
4. 发布一个 MINOR 版本。

### 练习 5：思考题

1. 为什么 crates.io 不允许删除已发布版本？
2. 文档测试为什么能显著提升维护质量？
3. 在 1.0 之后，什么样的改动最容易误判版本号？
4. 你的 crate 最小公开 API 应该如何界定？
5. 当你必须做 breaking change 时，如何降低用户痛苦？

---

## 26.16 本章小结

```
┌──────────────────────────────────────────────────────┐
│               发布 crate 小结                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. 文档先行：                                         │
│     - rustdoc + README + doctest                      │
│                                                      │
│  2. 发布流程：                                         │
│     - cargo package                                   │
│     - cargo publish --dry-run                         │
│     - cargo publish                                   │
│                                                      │
│  3. 版本策略：                                         │
│     - PATCH/MINOR/MAJOR 严格遵守 SemVer               │
│     - breaking change 要谨慎                           │
│                                                      │
│  4. CI/CD：                                            │
│     - PR 必跑质量门禁                                  │
│     - tag 驱动自动发布                                 │
│                                                      │
│  5. 长期维护：                                         │
│     - changelog、deprecate、msrv、安全响应             │
│                                                      │
│  你已经完成从“会写 Rust”到“能交付 Rust 生态资产”的升级。   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

恭喜你完成《Rust 从入门到精通》主线教程。

如果你愿意，下一步可以继续进阶：

- 无锁数据结构
- 编译器原理（rustc MIR/LLVM）
- 嵌入式 Rust
- WebAssembly 高级优化
- Rust 安全审计

你已经具备把 Rust 用在生产环境的核心能力了。
