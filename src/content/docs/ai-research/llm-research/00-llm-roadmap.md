---
title: "LLM 入门路线图：从零到读懂前沿论文"
---

# LLM 入门路线图：从零到读懂前沿论文

> 本系列目标：让一个有编程基础但没有 ML 背景的开发者，能够读懂 KARL 这样的前沿 Agent RL 论文。
>
> 一共 4 篇，每篇都写得够深够透。

---

## 学习路线

### [01. LLM 核心原理：从 Transformer 到训练全流程](../01-llm-core-principles)

Token、Embedding、Self-Attention 的完整计算过程、Multi-Head Attention、因果掩码、FFN 与知识存储、MoE 架构与 Router 难题、预训练/SFT/后训练三阶段、生成策略（温度/Top-p）、上下文窗口与 KV Cache。

### [02. 强化学习与后训练：从 RLHF 到 OAPL](../02-rl-and-post-training)

RL 基本框架、Policy/Reward/Rollout/Advantage、KL 正则化的数学直觉、On-policy vs Off-policy 的本质区别、GRPO 的做法与局限、OAPL 的完整推导直觉、多步 Agent 的 Token 掩码与轨迹分段、迭代自举、多任务 RL vs 蒸馏、RL beyond sharpening（max@k 分析）。

### [03. RAG、Agent 与推理扩展](../03-rag-agent-and-inference-scaling)

Embedding 与向量检索原理、Chunking 策略、单轮 RAG 的局限、Agent 循环与 Tool Use 实现、Rollout/Trajectory 概念、上下文压缩的端到端训练、Best-of-N / Majority Vote / Parallel Thinking / Value-Guided Search 四种 TTC 方法、合成数据管线（Agentic Synthesis + 难度过滤）、Agent 基础设施（aroll）、全链路串联。

### [04. KARL 逐段导读](../04-karl-guided-reading)

带着前三章的知识，按原文 Section 1-8 逐段标出核心论点、关键证据、该看的图表。读完能回答：解决了什么问题、方法为什么有效、证据是否充分。

---

## 读完之后

→ [KARL 深度解读全文](../karl-knowledge-agents-rl)
