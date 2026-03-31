---
title: AI Research
---

# AI Research

AI 领域研究笔记与论文分析，按主题分类整理。

## 目录

- [LLM 零基础入门](./fundamentals/) — 从零开始理解大语言模型，10 篇系列教程
- [LLM 进阶研究](./llm-research/) — 强化学习、推理扩展、搜索蒸馏等进阶专题与论文解读
- [Agent 研究](./agent/) — AI Agent 架构分析、工具源码解读、论文导读

## 最新加入

- [从源码拆解 Claude Code：一个 AI Agent CLI 的系统设计](./agent/framework/claude-code-source-analysis/) — 基于 npm 发布包与 source map 还原结果，分析 Claude Code 的入口、主循环、工具协议、命令系统与整体架构。
- [Claude Code 深读（二）：QueryEngine 与 query.ts 如何驱动一个 Agent Runtime](./agent/framework/claude-code-query-engine-deep-dive/) — 专门拆解输入处理、主循环、上下文治理、工具执行回流与 turn 状态机。
- [Claude Code 深读（三）：Tool 协议、权限系统与工具调度](./agent/framework/claude-code-tools-permissions-orchestration/) — 详细分析 Tool.ts、权限上下文、工具注册中心与流式工具执行调度。
- [Claude Code 深读（四）：skills、commands 与 MCP 如何共同注入 runtime](./agent/framework/claude-code-runtime-injection-skills-commands-mcp/) — 分析控制面、任务包装层与远程能力层如何共同构成 Claude Code 的能力注入模型。
