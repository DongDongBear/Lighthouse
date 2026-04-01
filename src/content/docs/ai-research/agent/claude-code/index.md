---
title: "Claude Code 源码深度研究"
description: "基于 2026 年 3 月 npm source map 泄漏事件，对 Anthropic Claude Code CLI 工具的全方位源码级分析。"
---

# Claude Code 源码深度研究

> 2026 年 3 月 31 日，Anthropic 的旗舰 AI 编程工具 Claude Code 因 npm 包中意外包含 source map 文件，导致 1884 个 TypeScript 源文件、约 51 万行代码完整泄漏。这是 AI 编程工具领域最大规模的源码暴露事件。
>
> 本章节是对 Claude Code 源码的系统性深度研究，从架构总览到每个核心模块的逐层拆解。所有文件路径、函数签名、常量值均来自实际源码阅读。

---

## 文章索引

### 全景分析

| # | 文章 | 重点 |
|---|------|------|
| 06 | [**源码泄漏深度技术解读**](./06-source-leak-deep-analysis/) | 基于 1884 个 TypeScript 源文件的硬核分析，覆盖 11 个技术维度：架构、工具系统、Agent Loop、多 Agent 协调、安全架构（23 种攻击检测）、Buddy 电子宠物、Kairos 长期记忆、Ultraplan、IDE Bridge、插件系统、工程细节 |

### 模块深读系列

| # | 文章 | 重点 |
|---|------|------|
| 01 | [**系统总览与启动序列**](./01-source-analysis/) | 两阶段启动序列（`init.ts` 341 行）、快速路径优化（12 种）、全局状态（257 行类型定义）、五层架构、模块依赖、18 个 Beta Header、关键常量 |
| 02 | [**QueryEngine 与 query.ts**](./02-query-engine-deep-dive/) | `QueryEngine`（1295 行）对外会话内核、`query.ts`（1729 行）状态机、`State` 类型 11 字段、while(true) 循环 13 步操作、三级压缩体系（Microcompact/Auto-Compact/Manual）、API 请求结构、4 种 Continue 站点 |
| 03 | [**Tool 协议、权限系统与工具调度**](./03-tools-permissions-orchestration/) | `Tool.ts`（793 行）协议定义、23 种 Bash 攻击向量检测（`bashSecurity.ts` 2593 行）、`ToolPermissionContext` 多源规则、10 步权限管道、`toolOrchestration.ts` 并发调度、`StreamingToolExecutor`（531 行）流式执行 |
| 04 | [**Skills/Commands/MCP 注入 Runtime**](./04-runtime-injection-skills-commands-mcp/) | `FrontmatterData` 15 字段定义、6 种 `LoadedFrom` 来源、5 平行源加载管线、55+ 命令注册与合并顺序、7 种 MCP transport、`MCPServerConnection` 5 种连接状态、插件组件模型 |

### 官方实践与外部参考

| # | 文章 | 重点 |
|---|------|------|
| 05 | [**Anthropic 内部如何使用 Claude Code Skills**](./05-skills-lessons/) | 基于 Thariq（Claude Code 团队成员）分享：9 种 Skill 分类、7 条写作最佳实践、分发与市场策略 |

---

## 阅读建议

**如果你只有 15 分钟**：直接读 06（源码泄漏深度技术解读），它是全景分析、信息密度最高。

**如果你想深入每个子系统**：按 01 → 02 → 03 → 04 的顺序读。01 是入口与全局视图，02 深入运行时内核，03 深入工具与安全，04 深入能力注入。每篇都包含精确到行号的源码引用。

**如果你在做自己的 Agent 系统**：每篇末尾的"对 Agent 工程的启发"章节是最实用的。

**如果你关注 Skills 生态**：05 是 Anthropic 官方团队的一手实践总结。

---

## 关键数字

| 指标 | 数值 |
|------|------|
| 源文件数 | 1,884 个 `.ts/.tsx` |
| 总代码量 | ~512,000 行 |
| 内置工具 | 40+ |
| 内置命令 | 55+ |
| 内置技能 | 17 个（10 无条件 + 7 条件） |
| Feature Flags | 20+ 编译时 + 120+ 运行时 |
| 安全检测向量 | 23 种 Bash 攻击模式 |
| MCP Transport | 7 种（stdio, sse, http, ws, sdk + IDE 变体） |
| Beta API Headers | 18 个（14 固定 + 4 条件） |
| 电子宠物物种 | 16 种 |
| 记忆类型 | 4 种 (user/feedback/project/reference) |
| Agent 派生模式 | 4 种 (Fork/Async/In-Process/Remote) |
| 权限模式 | 7 种 (5 外部 + 2 内部) |
| 全局状态字段 | 257 行类型定义 |
| 压缩级别 | 3 级 (Micro/Auto/Manual) |
