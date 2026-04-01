---
title: "Claude Code 源码深度研究"
description: "基于 2026 年 3 月 npm source map 泄漏事件，对 Anthropic Claude Code CLI 工具的全方位源码级分析。"
---

# Claude Code 源码深度研究

> 2026 年 3 月 31 日，Anthropic 的旗舰 AI 编程工具 Claude Code 因 npm 包中意外包含 source map 文件，导致 1884 个 TypeScript 源文件、约 51 万行代码完整泄漏。这是 AI 编程工具领域最大规模的源码暴露事件。
>
> 本章节是对 Claude Code 源码的系统性深度研究，从架构总览到每个核心模块的逐层拆解。

---

## 📖 文章索引

### 基于真实源码的深度技术分析

| # | 文章 | 重点 |
|---|------|------|
| 06 | [**源码泄漏深度技术解读**](./06-source-leak-deep-analysis/) | 🔥 基于 1884 个 TypeScript 源文件的硬核分析，覆盖 11 个技术维度：架构、工具系统、Agent Loop、多 Agent 协调、安全架构（23 种攻击检测）、Buddy 电子宠物、Kairos 长期记忆、Ultraplan、IDE Bridge、插件系统、工程细节 |

### 架构设计哲学系列

| # | 文章 | 重点 |
|---|------|------|
| 01 | [**系统总览：一个 AI Agent CLI 的系统设计**](./01-source-analysis/) | 五层架构、入口编排、runtime kernel 设计哲学、工具协议层、命令与工具双平面分离、对 Agent 工程的 6 条启发 |
| 02 | [**QueryEngine 与 query.ts 如何驱动 Agent Runtime**](./02-query-engine-deep-dive/) | 会话主循环状态机、多阶段上下文治理管线、工具回流机制、turn lifecycle |
| 03 | [**Tool 协议、权限系统与工具调度**](./03-tools-permissions-orchestration/) | 厚工具协议设计、权限系统集成、并发安全分类、StreamingToolExecutor |
| 04 | [**Skills/Commands/MCP 如何共同注入 Runtime**](./04-runtime-injection-skills-commands-mcp/) | 四类能力来源、Skills 治理、Commands 控制面、MCP 二级能力总线 |

### 官方实践与外部参考

| # | 文章 | 重点 |
|---|------|------|
| 05 | [**Anthropic 内部如何使用 Claude Code Skills**](./05-skills-lessons/) | 基于 Thariq（Claude Code 团队成员）分享：9 种 Skill 分类、7 条写作最佳实践、分发与市场策略 |

---

## 🗺️ 阅读建议

**如果你只有 15 分钟**：直接读 06（源码泄漏深度技术解读），它基于真实源码、信息密度最高。

**如果你想理解设计哲学**：按 01 → 02 → 03 → 04 的顺序读，它们从系统总览逐步深入到每个子系统。

**如果你在做自己的 Agent 系统**：01 的"最值得抄的三点"和"对 AI Agent 工程的 6 条启发"是最实用的。

**如果你关注 Skills 生态**：05 是 Anthropic 官方团队的一手实践总结。

---

## 📊 关键数字

| 指标 | 数值 |
|------|------|
| 源文件数 | 1,884 个 .ts/.tsx |
| 总代码量 | ~512,000 行 |
| 内置工具 | 40+ |
| 内置命令 | 55+ |
| Feature Flags | 20+ 编译时 + 120+ 运行时 |
| 安全检测向量 | 23 种 Bash 攻击模式 |
| 电子宠物物种 | 16 种 |
| 记忆类型 | 4 种 (user/feedback/project/reference) |
| Agent 派生模式 | 4 种 (Fork/Async/In-Process/Remote) |
| Beta API Headers | 26 个 |
