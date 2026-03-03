# Rust 从入门到精通：面向 TS/JS 开发者

> 专为有 TypeScript/JavaScript 经验的 Web 开发者打造，零 Rust 基础，目标：掌握系统级编程能力。

## 关于本教程

本教程假设你已经有 JavaScript/TypeScript 和前端/全栈开发经验，但从未接触过 Rust。我们将利用你已有的编程知识，通过类比和对比的方式，快速带你进入 Rust 系统编程的世界。

**最终目标**：掌握 Rust 语言核心技能，能够独立开发高性能 CLI 工具、Web 服务和 WASM 模块。

## 学习路线图

```
Part 1：基础入门（第 00-06 章）≈ 3-4 周
  ├── 理解 Rust 设计哲学与生态
  ├── 搭建开发环境
  ├── 掌握变量、类型、函数
  ├── 理解所有权与借用机制
  ├── 结构体、枚举与模式匹配
  └── 模块系统与 Cargo 包管理

Part 2：核心进阶（第 07-12 章）≈ 3-4 周
  ├── 泛型与 Trait 系统
  ├── 生命周期
  ├── 集合与迭代器
  ├── 闭包与函数式编程
  ├── 智能指针
  └── 并发编程

Part 3：实战应用（第 13-18 章）≈ 3-4 周
  ├── CLI 工具开发
  ├── 文件 I/O 与序列化
  ├── 网络编程
  ├── Web 框架实战
  ├── 数据库操作
  └── WebAssembly

Part 4：高级主题（第 19-24 章）≈ 3-4 周
  ├── 宏编程
  ├── unsafe 与 FFI
  ├── 异步运行时原理
  ├── 性能优化
  ├── 设计模式
  └── 生态与开源贡献
```

**预计总学习时间：12-16 周（每周 10-15 小时）**

## 目录

### Part 1：基础入门

| 章节 | 主题 | 预计时间 | 难度 |
|------|------|----------|------|
| [第 00 章](00-overview.md) | 全景概览：从 Web 到 Systems 的思维转变 | 60-90 分钟 | ⭐ |
| [第 01 章](01-setup.md) | 环境搭建：Rustup + Cargo + VS Code | 2 小时 | ⭐ |
| [第 02 章](02-first-program.md) | 变量、类型与函数（对比 TypeScript） | 4 小时 | ⭐⭐ |
| [第 03 章](03-type-system.md) | 所有权与借用 —— Rust 的灵魂 | 6 小时 | ⭐⭐⭐ |
| [第 04 章](04-ownership.md) | 结构体与枚举（对比 interface / union type） | 5 小时 | ⭐⭐ |
| [第 05 章](05-borrowing.md) | 模式匹配与错误处理（告别 try/catch） | 5 小时 | ⭐⭐⭐ |
| [第 06 章](06-structs-enums.md) | 模块系统与 Cargo（对比 ES Modules / npm） | 4 小时 | ⭐⭐ |

### Part 2：核心进阶

| 章节 | 主题 | 预计时间 | 难度 |
|------|------|----------|------|
| [第 07 章](07-pattern-matching.md) | 泛型与 Trait（对比 TS 泛型与接口） | 6 小时 | ⭐⭐⭐ |
| [第 08 章](08-error-handling.md) | 生命周期深度解析 | 6 小时 | ⭐⭐⭐⭐ |
| [第 09 章](09-collections.md) | 集合与迭代器（对比 Array/Map/Set） | 5 小时 | ⭐⭐⭐ |
| [第 10 章](10-generics-traits.md) | 闭包与函数式编程 | 4 小时 | ⭐⭐⭐ |
| [第 11 章](11-lifetime.md) | 智能指针与内存管理（Box/Rc/Arc/RefCell） | 6 小时 | ⭐⭐⭐⭐ |
| [第 12 章](12-closures-iterators.md) | 并发编程（对比 JS async/await） | 6 小时 | ⭐⭐⭐⭐ |

### Part 3：实战应用

| 章节 | 主题 | 预计时间 | 难度 |
|------|------|----------|------|
| [第 13 章](13-modules-crates.md) | 项目实战：构建 CLI 工具（clap + tokio） | 6 小时 | ⭐⭐⭐ |
| [第 14 章](14-smart-pointers.md) | 文件 I/O 与序列化（serde 全解析） | 5 小时 | ⭐⭐⭐ |
| [第 15 章](15-concurrency.md) | 网络编程与 HTTP（对比 Express/Koa） | 5 小时 | ⭐⭐⭐ |
| [第 16 章](16-async-await.md) | Axum 实战：构建 REST API | 8 小时 | ⭐⭐⭐⭐ |
| [第 17 章](17-macros.md) | 数据库操作（SQLx / SeaORM） | 6 小时 | ⭐⭐⭐⭐ |
| [第 18 章](18-cli-tool.md) | WebAssembly 实战：Rust → 浏览器 | 6 小时 | ⭐⭐⭐⭐ |

### Part 4：高级主题与生态

| 章节 | 主题 | 预计时间 | 难度 |
|------|------|----------|------|
| [第 19 章](19-web-api.md) | 宏编程：声明宏与过程宏 | 6 小时 | ⭐⭐⭐⭐ |
| [第 20 章](20-wasm.md) | unsafe Rust 与 FFI | 5 小时 | ⭐⭐⭐⭐ |
| [第 21 章](21-ffi.md) | 异步运行时深入（Tokio 原理） | 6 小时 | ⭐⭐⭐⭐⭐ |
| [第 22 章](22-unsafe.md) | 性能优化与 Profiling | 5 小时 | ⭐⭐⭐⭐ |
| [第 23 章](23-advanced-types.md) | Rust 设计模式与最佳实践 | 5 小时 | ⭐⭐⭐⭐ |
| [第 24 章](24-tokio-deep-dive.md) | 开源贡献指南与生态全景 | 4 小时 | ⭐⭐⭐ |

## 约定说明

- 💡 **TS 类比**：将 Rust 概念与 TypeScript 概念对比
- ⚠️ **常见坑**：容易犯的错误
- 🎯 **最佳实践**：推荐的做法
- 🔥 **进阶**：可选的深入内容
- 📦 **crate 推荐**：相关的常用 crate

---

*开始你的 Rust 之旅 → [第 00 章：全景概览](00-overview.md)*


- [第 25 章](25-performance.md) 性能优化
- [第 26 章](26-publish-crate.md) 发布 crate
