---
title: "Google Antigravity：Agent-First 的新一代开发平台"
description: "Google, Antigravity, Agent, IDE, 开发平台, Gemini"
---

# Build with Google Antigravity, Our New Agentic Development Platform

> 原文链接：https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/
> 来源：Google Developers Blog
> 发布日期：2025-11-20（公开预览），2026-03 持续迭代

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Google 推出 Agent-First 开发平台 Antigravity，将编辑器和 Agent 调度界面合二为一 |
| 大白话版 | Google 做了一个新的编程工具，里面的 AI 助手不是只在侧边栏聊天，而是有自己的工作空间——可以同时操作编辑器、终端和浏览器，自己完成完整任务 |
| 核心要点 | • Editor View（传统 IDE 体验）+ Manager Surface（Agent 调度界面）• Agent 跨编辑器/终端/浏览器自主工作 • 通过 Artifacts（截图/录屏/任务清单）汇报进度 • 支持 Gemini 3 Pro + Claude Sonnet 4.5 + GPT-OSS • 已在公开预览中 |
| 价值评级 | A — Google 对 AI 编程工具的全新定义 |
| 适用场景 | 所有需要 AI 辅助编程的开发者 |

## 文章背景

Google Antigravity 的命名来自 Python 的著名彩蛋 `import antigravity`——一个关于"让事情起飞"的幽默致敬。但 Antigravity 的野心远不止于此：它代表了 Google 对"AI 编程工具应该是什么样子"的重新定义。

在 OpenAI Codex（200 万+ 周活）和 Cursor 主导的市场中，Google 选择了一条差异化路线：不是做"更好的编辑器"或"更好的模型"，而是做一个"Agent-First"的全新平台——Agent 不再是编辑器的附属品，而是平台的一等公民。

## 完整内容还原

### 核心设计哲学

> "Agent 不应该只是侧边栏里的聊天机器人，它们应该有自己的专属工作空间。"

这句话是 Antigravity 整个设计哲学的凝练。当前主流 AI 编程工具（Cursor、Copilot、Codex）都将 AI 放在"侧边栏"或"对话框"中——本质上仍是"人类驱动、AI 辅助"的模式。Antigravity 提出了一种新范式："人类指挥、Agent 自主执行"。

### 两种交互界面

**Editor View —— 同步编码模式**
- 传统 AI 增强 IDE 体验
- Tab 补全和内联命令
- 适合需要精确控制的编码工作
- 本质上和 Cursor/Copilot 类似

**Manager Surface —— Agent 调度模式（核心创新）**
- 专用的 Agent 管理界面
- 可以启动、编排和观察多个 Agent
- Agent 在不同工作空间中异步工作
- 人类角色从"编码者"转变为"管理者"

### 三个典型工作流

1. **委托复杂多工具任务**：Agent 自主规划并跨编辑器/终端/浏览器执行任务——例如编写新功能代码 → 用终端启动应用 → 用浏览器测试验证，全程无需人工干预

2. **任务级 UI 迭代**：请求 UI 变更，Agent 自主修改代码并通过 Artifacts（截图、操作录屏）展示结果。人类只需查看 Artifacts 判断是否满意

3. **后台长时间任务**：将 Bug 修复或维护任务分派给 Agent 在后台运行（复现问题 → 生成测试 → 实现修复），同时人类专注于主要工作

### Artifacts 验证机制

这是 Antigravity 的关键设计创新之一：

传统方式：Agent 做了什么 → 看代码 diff / 看日志 → 理解发生了什么（高认知负担）

Antigravity 方式：Agent 做了什么 → 生成 Artifacts（截图、录屏、任务清单、实现计划）→ 一目了然

Artifacts 类型包括：
- 截图：UI 变更的视觉证据
- 浏览器录屏：完整的操作回放
- 任务清单：结构化的进度报告
- 实现计划：Agent 的思考过程文档

人类可以直接在 Artifact 上留言反馈（类似在文档上批注），Agent 会据此调整——无需中断执行流程。

### 学习机制

Agent 将学习作为核心原语：
- Agent 可以保存有用的上下文和代码片段到知识库
- 后续任务可以利用之前的学习成果
- 随着使用时间增长，Agent 越来越"了解"你的项目

### 平台开放性

| 维度 | 详情 |
|---|---|
| 平台 | macOS / Windows / Linux |
| 模型支持 | Gemini 3 Pro（免费慷慨额度）+ Claude Sonnet 4.5 + GPT-OSS |
| 定价 | 个人免费 |
| 状态 | 公开预览 |

## 核心技术洞察

### "编辑器 + 管理器" 双界面范式

Antigravity 最深层的洞察是：**编程工作的两种模式需要两种不同的界面。**

同步编码（你写代码）= Editor View
异步管理（Agent 干活）= Manager Surface

当前所有 AI 编程工具都试图用一个界面服务两种模式，结果是两边都不理想：
- 侧边栏太小，无法有效展示 Agent 的工作进度
- 编辑器被 Agent 的输出干扰
- 用户在"自己写代码"和"看 Agent 写代码"之间频繁切换

### 多模型选择 vs 模型绑定

Antigravity 支持 Gemini、Claude、GPT-OSS 三家模型，这是一个有意义的战略选择——承认没有单一模型在所有任务上最优，给用户选择权。相比之下，OpenAI Codex 只能用 OpenAI 模型，Cursor 虽支持多模型但核心体验围绕单一模型优化。

## 竞争格局分析

| 维度 | Google Antigravity | OpenAI Codex | Cursor | GitHub Copilot |
|---|---|---|---|---|
| 核心差异 | Agent-First 双界面 | 全栈工具链（+Astral） | 编辑器体验 | GitHub 生态 |
| 模型 | 多模型（Gemini/Claude/GPT） | 仅 OpenAI | 多模型 | 仅 GitHub/OpenAI |
| Agent 自主性 | 高（独立工作空间） | 中（任务驱动） | 中（侧边栏） | 低（补全为主） |
| Artifacts 验证 | ✅ 原生支持 | ❌ | ❌ | ❌ |
| 定价 | 个人免费 | 付费 | 付费 | 付费 |

## 批判性分析

### 局限性

1. **实际 Agent 可靠性未知**：公告展示了愿景但缺乏大规模用户数据验证。"Agent 自主跨编辑器/终端/浏览器工作"在实践中的成功率可能不如演示中理想
2. **依赖 Google 生态**：虽然声称开放，但核心体验可能仍围绕 Gemini 优化
3. **Enterprise 就绪度**：公开预览状态意味着安全、合规和可靠性还未达到企业级要求

### 适用边界

- **最适合**：需要频繁进行 UI 迭代、多工具协调的全栈开发
- **不太适合**：需要极致编辑器定制的用户（VS Code 插件生态更丰富）

### 独立观察

- Google 选择"免费+多模型"策略，本质上是用 Antigravity 作为 Gemini 的推广载体——如果开发者在 Antigravity 中使用免费 Gemini 额度并形成习惯，这比任何广告都有效
- "Manager Surface" 的概念预示了 AI 编程的下一个范式：开发者的角色从"写代码的人"变为"管理 Agent 的人"。这与 Karpathy 描述的"AI 精神病"状态（不再直接编码，花数小时向 AI 表达意图）不谋而合
- Artifacts 验证机制可能是 Antigravity 最有持久价值的创新——它解决的不是"AI 能不能写代码"的问题，而是"我怎么信任 AI 写的代码"的问题
