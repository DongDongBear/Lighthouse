---
title: "LLM 入门路线图：从零到读懂前沿论文"
---

# LLM 入门路线图：从零到读懂前沿论文

> 本系列文章的目标：让一个有编程基础但没有 ML 背景的开发者，能够读懂 KARL 这样的前沿 Agent RL 论文。

---

## 为什么写这个系列

KARL 论文涉及大量概念：Transformer、Token、预训练、后训练、强化学习、KL 散度、on-policy/off-policy、向量搜索、Agent、rollout、test-time compute... 如果没有基础，读起来像天书。

这个系列不会深入数学推导，而是**建立直觉**——让你理解每个概念"是什么"、"为什么重要"、"在 KARL 里怎么用"。

---

## 学习路线

### 第一站：LLM 基础

**[01. 大语言模型是什么](./01-what-is-llm)**

从最基本的问题开始：LLM 到底在做什么？Token 是什么？Transformer 架构的核心思想是什么？为什么"下一个 token 预测"能产生智能？

读完你会理解：模型参数、Token、上下文窗口、Transformer、注意力机制、MoE

### 第二站：训练范式

**[02. LLM 的三阶段训练](./02-training-pipeline)**

一个模型从"什么都不会"到"像 ChatGPT 一样对话"，经历了哪三个阶段？每个阶段在做什么、为什么需要？

读完你会理解：预训练、SFT（监督微调）、RLHF、后训练、合成数据

### 第三站：强化学习

**[03. LLM 中的强化学习](./03-rl-for-llm)**

KARL 的核心是用 RL 训练 Agent。什么是策略（Policy）？什么是奖励（Reward）？On-policy 和 Off-policy 有什么区别？KL 散度是什么？GRPO 和 OAPL 在做什么？

读完你会理解：策略、奖励、KL 正则化、GRPO、off-policy RL、OAPL

### 第四站：检索增强生成

**[04. RAG 与向量搜索](./04-rag-and-vector-search)**

为什么模型需要"搜索"？Embedding 是什么？向量搜索怎么工作？RAG 的基本流程是什么？

读完你会理解：Embedding、向量数据库、相似度搜索、RAG pipeline、chunk

### 第五站：Agent

**[05. 从 LLM 到 Agent](./05-llm-to-agent)**

Agent 和普通 LLM 对话有什么区别？工具调用怎么实现？多步推理的"轨迹"（trajectory/rollout）是什么？上下文压缩为什么重要？

读完你会理解：Tool Use、ReAct、Rollout/Trajectory、上下文管理、压缩

### 第六站：推理时计算

**[06. 推理时计算扩展](./06-test-time-compute)**

为什么在推理时"花更多算力"能得到更好的答案？Parallel Thinking、Best-of-N、Value-Guided Search 分别是什么？

读完你会理解：Test-time Compute、采样策略、聚合策略、Value Model

---

## 读完之后

学完这 6 篇，你应该能：
- 理解 KARL 论文中的每一个技术术语
- 明白 KARL 的四大贡献各自解决了什么问题
- 理解实验结果为什么重要
- 对 LLM 领域的研究前沿有整体认知

然后回去重读 [KARL 深度解读](./karl-knowledge-agents-rl)，感受应该完全不一样。

---

*本系列持续更新中。如果你在阅读过程中遇到任何不理解的概念，告诉我，我会补充说明。*
