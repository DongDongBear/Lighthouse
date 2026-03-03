# Rust 从入门到精通：面向 TypeScript/JavaScript 开发者

> 推荐阅读路径：Part 1 → Part 2 → Part 3 → Part 4
>
> 本教程专为有 TypeScript/JavaScript 经验的 Web 开发者打造，用你熟悉的概念映射 Rust 世界。

## 关于本教程

如果你已经熟悉 TypeScript/JavaScript，用 React、Vue 或 Node.js 构建过 Web 应用，但想学习 Rust —— 这个教程就是为你量身打造的。我们不会从零讲编程基础，而是会不断地把 Rust 概念**映射**到你已有的 Web 开发知识上。

**最终目标**：掌握 Rust 语言核心技能，能够独立开发高性能 CLI 工具、Web 服务、WASM 模块，并理解 Rust 在系统编程领域的优势。

## 学习路线图

```
Part 1：基础入门（第 00-06 章）≈ 3-4 周
  ├── Rust 全景概览与环境搭建
  ├── 变量、类型与函数（对比 TS）
  ├── 所有权与借用（Rust 灵魂）
  ├── 结构体与枚举（对比 interface/union）
  ├── 模式匹配与错误处理
  └── 模块系统与 Cargo（对比 npm）

Part 2：核心进阶（第 07-12 章）≈ 3-4 周
  ├── 泛型与 Trait（对比 TS 泛型/接口）
  ├── 生命周期深度解析
  ├── 集合与迭代器（对比 Array 方法）
  ├── 闭包与函数式编程
  ├── 智能指针与内存管理
  └── 并发编程（对比 async/await）

Part 3：实战应用（第 13-18 章）≈ 3-4 周
  ├── 项目实战：CLI 工具开发
  ├── 文件 I/O 与序列化
  ├── 网络编程与 HTTP（对比 Express/Koa）
  ├── Actix-Web / Axum 实战
  ├── 数据库操作（SQLx/Diesel）
  └── WebAssembly 实战

Part 4：高级主题与生态（第 19-24 章）≈ 3-4 周
  ├── 宏编程（声明宏与过程宏）
  ├── unsafe Rust 与 FFI
  ├── 异步运行时深入（Tokio）
  ├── 性能优化与 Profiling
  ├── Rust 设计模式与最佳实践
  └── 开源项目贡献指南与生态全景
```

**预计总学习时间：12-16 周（每周 10-15 小时）**

---

## Part 1：基础入门

| 章节 | 主题 | 预计时间 | 难度 |
|------|------|----------|------|
| [第 00 章](00-overview.md) | 全景概览：从 Web 到 Systems 的思维转变 | 60-90 分钟 | ⭐ |
| [第 01 章](01-setup.md) | 环境搭建：Rustup + Cargo + VS Code | 2 小时 | ⭐ |
| [第 02 章](02-variables-types.md) | 变量、类型与函数（对比 TypeScript） | 4 小时 | ⭐⭐ |
| [第 03 章](03-ownership.md) | 所有权与借用 —— Rust 的灵魂 | 6 小时 | ⭐⭐⭐ |
| [第 04 章](04-structs-enums.md) | 结构体与枚举（对比 interface / union type） | 5 小时 | ⭐⭐ |
| [第 05 章](05-pattern-matching.md) | 模式匹配与错误处理（告别 try/catch） | 5 小时 | ⭐⭐⭐ |
| [第 06 章](06-modules-cargo.md) | 模块系统与 Cargo（对比 ES Modules / npm） | 4 小时 | ⭐⭐ |

---

## Part 2：核心进阶

| 章节 | 主题 | 预计时间 | 难度 |
|------|------|----------|------|
| [第 07 章](07-generics-traits.md) | 泛型与 Trait（对比 TS 泛型与接口） | 6 小时 | ⭐⭐⭐ |
| [第 08 章](08-lifetimes.md) | 生命周期深度解析 | 6 小时 | ⭐⭐⭐⭐ |
| [第 09 章](09-collections-iterators.md) | 集合与迭代器（对比 Array/Map/Set） | 5 小时 | ⭐⭐⭐ |
| [第 10 章](10-closures.md) | 闭包与函数式编程 | 4 小时 | ⭐⭐⭐ |
| [第 11 章](11-smart-pointers.md) | 智能指针与内存管理（Box/Rc/Arc/RefCell） | 6 小时 | ⭐⭐⭐⭐ |
| [第 12 章](12-concurrency.md) | 并发编程（对比 JS async/await） | 6 小时 | ⭐⭐⭐⭐ |

---

## Part 3：实战应用

| 章节 | 主题 | 预计时间 | 难度 |
|------|------|----------|------|
| [第 13 章](13-cli-project.md) | 项目实战：构建 CLI 工具（clap + tokio） | 6 小时 | ⭐⭐⭐ |
| [第 14 章](14-file-io-serde.md) | 文件 I/O 与序列化（serde 全解析） | 5 小时 | ⭐⭐⭐ |
| [第 15 章](15-networking.md) | 网络编程与 HTTP（对比 Express/Koa） | 5 小时 | ⭐⭐⭐ |
| [第 16 章](16-web-framework.md) | Axum 实战：构建 REST API | 8 小时 | ⭐⭐⭐⭐ |
| [第 17 章](17-database.md) | 数据库操作（SQLx / SeaORM） | 6 小时 | ⭐⭐⭐⭐ |
| [第 18 章](18-wasm.md) | WebAssembly 实战：Rust → 浏览器 | 6 小时 | ⭐⭐⭐⭐ |

---

## Part 4：高级主题与生态

| 章节 | 主题 | 预计时间 | 难度 |
|------|------|----------|------|
| [第 19 章](19-macros.md) | 宏编程：声明宏与过程宏 | 6 小时 | ⭐⭐⭐⭐ |
| [第 20 章](20-unsafe-ffi.md) | unsafe Rust 与 FFI | 5 小时 | ⭐⭐⭐⭐ |
| [第 21 章](21-async-deep-dive.md) | 异步运行时深入（Tokio 原理） | 6 小时 | ⭐⭐⭐⭐⭐ |
| [第 22 章](22-performance.md) | 性能优化与 Profiling | 5 小时 | ⭐⭐⭐⭐ |
| [第 23 章](23-design-patterns.md) | Rust 设计模式与最佳实践 | 5 小时 | ⭐⭐⭐⭐ |
| [第 24 章](24-ecosystem.md) | 开源贡献指南与生态全景 | 4 小时 | ⭐⭐⭐ |

---

## 技术栈

- **语言**：Rust（最新稳定版）
- **构建工具**：Cargo
- **IDE**：VS Code + rust-analyzer 扩展
- **版本控制**：Git
- **目标平台**：Linux / macOS / Windows / WASM

## 前置要求

- 有 JavaScript/TypeScript 编程经验
- 了解前端或全栈开发流程（React/Vue/Node.js 等）
- 基本的命令行操作能力
- 了解 HTTP、JSON 等基础 Web 概念

## 学习建议

1. **边学边写**：每章都有实操练习，务必动手敲代码
2. **拥抱编译器**：Rust 编译器是你最好的老师，认真读错误信息
3. **不要跳过所有权**：第 03 章是 Rust 的灵魂，花多少时间都值得
4. **用 TS 类比理解**：每当遇到新概念，先想想 TS 里对应什么
5. **善用 Rust Playground**：在线运行代码片段，快速验证想法

## 约定说明

- 💡 **TS 类比**：将 Rust 概念与 TypeScript 概念对比
- ⚠️ **常见坑**：容易犯的错误
- 🎯 **最佳实践**：推荐的做法
- 🔥 **进阶**：可选的深入内容
- 📦 **crate 推荐**：相关的常用 crate

---

*开始你的 Rust 之旅 → [第 00 章：全景概览](00-overview.md)*
