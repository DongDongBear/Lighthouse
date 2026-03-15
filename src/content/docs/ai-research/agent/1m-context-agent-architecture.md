---
title: '1M 上下文 GA — 长上下文如何重塑 Agent 架构'
---

# 1M 上下文 GA — 长上下文如何重塑 Agent 架构

Anthropic 在 Claude Opus 4.6 和 Sonnet 4.6 中将 **1M token 上下文窗口正式 GA**（之前 Sonnet 4.5/4 需要 beta header 才能解锁，且仅限 Tier 4 用户）。这不只是一个数字变大了——它从根本上改变了 Agent 的架构设计思路。

## 核心事实

| 项目 | 之前 (Opus 4.5 及更早) | 现在 (Opus 4.6 / Sonnet 4.6) |
|------|---------------------|---------------------------|
| 默认上下文窗口 | 200K tokens | **1M tokens** |
| 访问方式 | Beta header + Tier 4 限制 | 直接可用，GA |
| 最大输出 | 32K-64K | Opus 128K / Sonnet 64K |
| Extended Thinking | 是 | 是 + Adaptive Thinking |

1M tokens 约等于 **75 万字**或 **340 万 Unicode 字符**——这意味着一个中等规模的代码库、一本完整的技术书籍、或数百页的文档，都可以一次性放进上下文。

## 为什么不能简单地"把所有东西塞进去"

Anthropic 在 [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) 中明确指出了一个关键概念：**Context Rot（上下文腐烂）**。

> 随着上下文窗口中的 token 数量增加，模型从中准确召回信息的能力会下降。

这源于 Transformer 的架构约束：

1. **注意力是 O(n²)**：每个 token 要 attend 到每个其他 token，n 个 token 产生 n² 个配对关系
2. **训练分布偏差**：模型在较短序列上训练得更多，对长距离依赖的处理经验更少
3. **位置编码插值**的精度损失

所以即使窗口够大，**Context 必须被当作有限资源对待**，存在边际递减效应。Anthropic 用了一个精准的类比：LLM 和人一样有"注意力预算"（Attention Budget），每多一个 token 就消耗一点预算。

## 长上下文对 Agent 架构的三个根本影响

### 1. 从 RAG-First 转向 Just-in-Time 检索

**之前（200K 时代）**：Agent 系统大量依赖 embedding + 向量检索（RAG）来在推理前预处理上下文。这是因为上下文装不下所有相关信息，必须提前筛选。

**现在（1M 时代）**：Agent 可以持有轻量级标识符（文件路径、查询语句、链接），在运行时按需动态加载数据。Claude Code 就是这个模式——它不预加载整个代码库，而是用 `glob`、`grep`、`head`、`tail` 等命令在需要时才把数据拉进上下文。

这更接近人类认知：我们不会记住整个图书馆，而是建立索引系统（文件夹、书签、目录），需要时再去查。

**架构含义**：
- 复杂的预处理 pipeline 可以简化
- 向量数据库不再是必需组件，而是可选优化
- Agent 需要更好的**导航工具**（文件系统操作、搜索）而非更大的预加载数据集

### 2. Compaction 成为核心基础设施

长上下文不意味着不需要压缩——恰恰相反，1M 的上下文让 Compaction 变得**更重要且更可行**。

**Compaction 的核心做法**：当对话接近上下文窗口上限时，让模型总结当前内容，用压缩后的摘要重新初始化上下文窗口。

Claude Code 的实现细节：
- 将消息历史传给模型进行总结压缩
- **保留**：架构决策、未解决的 bug、实现细节
- **丢弃**：冗余的工具输出、过时的消息
- 压缩后保留最近访问的 5 个文件继续工作

还有一种轻量级 Compaction：**Tool Result Clearing**——一旦工具调用完成且结果已被消化，原始的工具返回内容可以从历史中清除。这是 Anthropic 官方平台已经支持的功能。

**关键洞察**：更大的窗口让 Compaction 有更多缓冲空间来做精细化的"保留 vs 丢弃"决策，而不是像小窗口时代那样被迫激进压缩。

### 3. 多 Agent 架构获得真正的运行空间

**之前**：200K 的窗口让单个 Agent 在复杂任务上很快就捉襟见肘，多 Agent 更多是"不得不分"。

**现在**：1M 窗口下的多 Agent 架构变成了一种**主动的架构选择**：

- **主 Agent**：用大窗口维持全局计划和上下文，协调子任务
- **子 Agent**：每个带着干净的上下文窗口处理专项任务
- 子 Agent 可能消耗数万 token 做深度探索，但只返回 1,000-2,000 token 的精炼摘要

这实现了关注点分离——子 Agent 内部的搜索、试错上下文被隔离，主 Agent 只看到高质量的结论。

## Extended Thinking 与上下文窗口的协同

一个容易被忽视的设计：**Extended Thinking 的 token 不会累积到后续轮次的上下文中**。

具体机制：
- 思考 block 在生成时计入窗口和输出 token 计费
- 但在后续轮次中，API **自动剥离**之前的思考 block
- 有效上下文 = `input_tokens - previous_thinking_tokens + current_turn_tokens`

这意味着模型可以在每一轮进行大量推理思考，但不会因此消耗上下文空间。1M 窗口 + Extended Thinking 自动清理 = Agent 可以在更长的时间跨度上保持高质量推理。

**唯一例外**：Tool Use 场景中，思考 block 必须和对应的工具结果一起传回（API 用加密签名验证完整性），完成工具调用循环后才能被剥离。

## Context Awareness — 模型的自我感知

Sonnet 4.6 引入了 **Context Awareness**：模型能够追踪自己还剩多少上下文预算。这让 Agent 可以：

- 主动决定何时触发 Compaction
- 在上下文紧张时选择更精简的工具输出格式
- 动态调整信息检索的粒度

这是一个从"被动使用上下文"到"主动管理上下文"的根本转变。

## 对 Agent 开发者的实操建议

Anthropic 给出的核心原则：**找到最小的高信号 token 集合，最大化期望结果的概率。**

具体来说：

**System Prompt 的"正确高度"**：
- 不要写脆弱的 if-else 硬编码逻辑（太低）
- 不要写模糊的高层指导（太高）
- 找到中间地带：足够具体以引导行为，足够灵活以提供启发式规则

**工具设计**：
- 工具集要精简，功能不重叠
- 如果人类工程师都分不清该用哪个工具，Agent 也分不清
- 工具返回要 token-efficient（别把整个数据库表返回来）

**少样本示例**：
- 不要塞满边界情况清单
- 精选少量典型、多样的示例
- 对 LLM 来说，示例是"抵一千字的图"

**"做最简单有效的事"**：这是 Anthropic 对当前阶段最实在的建议。模型能力在快速提升，过度工程化的方案会很快过时。

## 结论

1M 上下文 GA 的真正意义不在于"能装更多东西"，而在于它改变了 Agent 架构设计的基本权衡：

1. **检索策略**：从预计算的 RAG 转向运行时按需加载
2. **上下文管理**：Compaction 从应急手段变成核心基础设施
3. **架构模式**：多 Agent 从无奈之举变成主动设计选择
4. **元认知**：模型开始能自我感知和管理上下文

理解这些转变，是未来半年做好 Agent 系统设计的关键认知基础。

## 参考资料

- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) — 模型参数与上下文窗口规格
- [Context Windows Documentation](https://platform.claude.com/docs/en/build-with-claude/context-windows) — 上下文窗口工作机制详解
- [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Anthropic 官方 Context Engineering 指南（2025.09）
