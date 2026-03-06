---
title: "09. KARL 逐段导读（Section 1-8 中文版）"
---

# 09. KARL 逐段导读（Section 1-8 中文版）

这篇不是复述，而是“带你读原文”。每节只回答三个问题：

1. 这一节在说什么
2. 它解决了什么问题
3. 你该重点看哪一句/哪张图

---

## Section 1 Introduction

### 在说什么

作者定义了 grounded reasoning，并指出现有 deep research 不足以代表企业搜索能力。

### 解决什么

先把问题边界划清：不是通用聊天，而是“多步检索 + 基于证据推理”。

### 重点看

- 四个贡献列表（KARLBench / Agentic synthesis / OAPL / TTC）
- Figure 1（直接看结果上限）

---

## Section 2 KARLBench

### 在说什么

构建了 6 类任务的评测套件，覆盖深搜、广搜、表格推理、穷举检索、技术文档推理、企业笔记聚合。

### 解决什么

避免“只在单一 benchmark 上刷分”的问题，测试泛化能力。

### 重点看

- Table 1（任务类型）
- Table 2（数据规模，尤其 TREC-Biogen 规模极大）

---

## Section 3 Agent Harness

### 在说什么

Agent 只有一个工具：vector search；并设计了上下文压缩机制。

### 解决什么

在可控环境下隔离“检索+推理”能力；并解决长轨迹上下文爆炸。

### 重点看

- “compression is trained end-to-end with RL” 这句是关键

---

## Section 4 Training KARL

### 4.1 Agentic Synthesis

- Stage I：合成问题-答案
- Stage II：多次求解 + pass-rate 过滤 + 质量过滤

核心：保留“半对半错”样本，提升学习信号密度。

### 4.2 OAPL

核心是 off-policy 大批量迭代训练，用稳定目标做策略优化，不靠 GRPO 那套复杂技巧。

### 4.3 Multi-task RL

把 BrowseComp-Plus（深搜）和 TREC-Biogen（广搜）一起训，提升分布外泛化。

### 重点看

- Eq.(1) 不用硬推导，只要看懂“奖励驱动 + KL 约束”

---

## Section 5 Test-time Compute

### 在说什么

两种推理扩展：

- Parallel Thinking（通用）
- Value-Guided Search（任务特化）

### 解决什么

在不改模型参数下，提升解题上限。

### 重点看

- PMBench 上 23.7% 的“聚合器优于所有单轨迹”

---

## Section 6 Infrastructure

### 在说什么

介绍 aroll 框架和高吞吐向量检索实现。

### 解决什么

把“可训练、可扩展、训练推理一致性”落到工程架构上。

### 重点看

- 500+ QPS/host
- lifecycle plugins（压缩、预算、工具治理）

---

## Section 7 Experiments

### 在说什么

主结果 + 成本延迟 + 蒸馏对比 + 迭代训练 + beyond sharpening + 消融实验。

### 解决什么

证明不是“单点提升”，而是系统性优势。

### 重点看

1. **Table 4**（主结果）
2. **Figure 8**（蒸馏 vs RL）
3. **Figure 10/11**（RL beyond sharpening）
4. **Table 5/6**（压缩能力和环境泛化）

---

## Section 8 Understanding RL Impact

### 在说什么

通过行为分析解释模型为什么变强：
- 搜索更高效
- 搜索更有多样性
- 后检索阶段浪费更少

### 重点看

- Figure 19（91 步 → 32 步）

---

## 最后：你现在应该怎么重读 KARL

推荐顺序：

1. Introduction（贡献）
2. Table 4（结果）
3. Section 4（方法）
4. Section 7.3.3 / 7.3.5（关键论证）
5. Section 8（行为解释）

按这个顺序，你会比线性从头读快很多。
