---
title: KARL：用强化学习训练知识搜索 Agent 的完整工程实践
---

# KARL：用强化学习训练知识搜索 Agent 的完整工程实践

> **来源**: Databricks — [Knowledge Agents via Reinforcement Learning](https://arxiv.org/abs/2603.05218)
> **日期**: 2026-03-05
> **标签**: `Agent` `Reinforcement Learning` `Enterprise Search` `Synthetic Data` `Grounded Reasoning`
> **规模**: 77 页，43 图，17 表，26 位作者

---

## 一句话总结

Databricks 提出了 KARL（Knowledge Agents via Reinforcement Learning），通过多任务强化学习 + Agentic 合成数据 + 迭代离线 RL 训练，将 GLM 4.5 Air 训练成在 6 类企业搜索任务上超越 Claude 4.6 和 GPT 5.2 的知识 Agent，且成本更低、延迟更低。

---

## 为什么这篇论文重要

1. **首个完整的 Agent RL 训练工程实践**：从数据合成到 RL 训练到推理时计算扩展，全链条开源细节
2. **解决了真实企业场景的核心问题**：不是在公开网页上搜索，而是在企业私有数据（财报、医学文献、内部会议纪要）上做 grounded reasoning
3. **证明了多任务 RL 的泛化优势**：只在 2 个任务上训练，在 4 个未见过的任务上也有显著提升，比多专家蒸馏效果好
4. **提出了可复现的训练范式**：OAPL 不需要 GRPO 的各种 trick（importance weighting、数据删除、router replay），对 MoE 大模型也能稳定训练

---

## 核心架构：四大贡献详解

### 1. KARLBench：6 类搜索能力的评估套件

这篇论文的第一个贡献是定义了"什么是好的知识 Agent"。KARLBench 覆盖 6 种结构性不同的搜索任务：

| 任务 | 能力 | 规模 | 难点 |
|------|------|------|------|
| **BrowseComp-Plus** | 约束驱动的实体搜索 | 830 问题，100K 文档 | 多属性交叉约束，需逐步过滤候选 |
| **TREC-Biogen** | 跨文档报告综合 | 65 问题，2680 万文档 | 从分散的生物医学文献中整合连贯报告 |
| **FinanceBench** | 表格数值推理 | 150 问题，53K 文档 | 在超过 100 页的财报中定位并计算 |
| **QAMPARI** | 穷举实体搜索 | 1000 问题，256K 文档 | 找出所有满足条件的实体，不能遗漏 |
| **FreshStack** | 技术文档程序性推理 | 203 问题，49K 文档 | 从代码和文档中组合分步解决方案 |
| **PMBench** | 企业内部笔记事实搜索 | 57 问题，3.4K 文档 | 在非结构化会议纪要中聚合分散事实 |

设计哲学：
- **闭合语料库**：不依赖活的网页搜索，消除外部变量，确保可控对比
- **单工具约束**：Agent 只能用 vector search，隔离检索和推理能力，不测工具编排
- **Nugget-based 评估**：将答案拆解为独立的信息单元（nugget），逐个评分，比二元对错更精细

关键洞察：**BrowseComp-Plus 要求"深搜"（反复缩小搜索范围直到找到唯一实体），TREC-Biogen 要求"广搜"（大范围收集分散信息）**。这两种搜索行为结构性不同，在单一任务上优化的模型无法覆盖另一种。

---

### 2. Agentic 合成数据管线

训练数据的质量直接决定 RL 的上限。KARL 的数据合成管线有两个阶段：

**Stage I：问题-答案合成**

```
输入：文档语料库 + 少量种子示例
    ↓
问题-答案合成 Agent 探索语料库（vector search，最多 50-60 步）
    ↓
生成 8 个候选 QA 对
    ↓
去重管线（精确匹配 + LMSys 去污染流程 + 近似重复检测）
    ↓
干净的合成训练数据
```

核心设计：合成 Agent 不是在静态文档上条件生成，而是**动态探索语料库**——它自己执行 vector search，发现有趣的文档组合，然后基于发现的证据生成问题。这比 SPICE、NaturalReasoning 等先前工作更有表达力。

**Stage II：解决方案合成 + 难度过滤**

```
每个合成问题 → 8 个 Solver Agent 独立尝试回答
    ↓
计算每题的通过率（pass rate）
    ↓
过滤掉全对（太简单，无学习信号）和全错（太难或问题有误）
    ↓
Quality Filter Agent 检查：
  - 问题是否有歧义？
  - 参考答案是否有事实错误？
    ↓
最终训练数据 + 每题 8 个 rollout
```

难度过滤的直觉：RL 的学习信号来自"有的对有的错"的样本——模型可以从正确和错误的尝试对比中学到什么行为更好。全对或全错的样本不提供有效的梯度信号。

**迭代自举（Iterative Bootstrapping）**：第一轮用 GLM 4.5 Air 合成数据并训练得到 KARL Iter.1，然后用 KARL Iter.1 重新合成更高质量的数据，再训练得到 KARL Iter.2。每轮迭代，合成 Agent 更强，数据更难，模型更好——形成正向飞轮。

训练数据量统计：

| 迭代 | BrowseComp-Plus | TREC-Biogen |
|------|-----------------|-------------|
| Iter.1（GLM 4.5 Air 合成） | 1,218 | 6,270 |
| Iter.2（KARL Iter.1 合成） | 1,336 | 11,371 |

BrowseComp-Plus 的平均轨迹长度是 TREC-Biogen 的一个数量级，所以通过增加 TREC-Biogen 的 prompt 数量来平衡总训练 token。

一个有趣的观察：**Iter.2 的 BrowseComp-Plus 轨迹显著短于 Iter.1**（中位数 20 步 vs 50 步），说明模型学会了更高效地搜索。

---

### 3. OAPL：迭代大批次离线策略 RL

这是论文最核心的技术贡献。OAPL（Optimal Advantage-based Policy Optimization with Lagged Inference policy）是一个全新的后训练范式。

**核心思路**

从 KL 正则化的 RL 目标出发：

```
max_π E[r(x,y) - β * KL(π || π_ref)]
```

这个目标有闭合形式的最优策略 π*：

```
π*(y|x) ∝ π_ref(y|x) * exp(r(x,y) / β)
```

重排后得到最优优势函数：

```
β * ln(π*(y|x) / π_ref(y|x)) = r(x,y) - V*(x)
```

OAPL 的训练目标就是让当前策略 π 去拟合这个关系，使用最小二乘回归损失：

```
min_π Σ (β * ln(π(y_i|x) / π_ref(y_i|x)) - (r(x,y_i) - V̂*(x)))²
```

其中 V̂*(x) 用 group rollouts 估计。

**为什么比在线 GRPO 好？**

| 对比维度 | GRPO（在线 RL） | OAPL（离线 RL） |
|----------|-----------------|-----------------|
| 数据生成 | 训练过程中实时生成 | 提前大批量生成，多次复用 |
| 稳定性 | 需要 importance weighting、数据删除、router replay 等 trick | 天然稳定，不需要额外 trick |
| MoE 支持 | 已知不稳定，需要专门处理 | 直接可训练大规模 MoE |
| 超参搜索 | 每次都要重新生成数据 | 一份数据可跑多组超参 |
| 计算成本 | 高（数据生成和训练耦合） | 低（数据生成成本分摊） |

**多步 Agentic 场景的处理**

Agent 的 rollout 是多步的：搜索查询 → 检索结果 → 压缩 → 搜索查询 → ... → 最终答案。OAPL 的处理方式：

1. **Token 掩码**：只计算模型生成的 token 的 log-probability，跳过 prompt 和工具返回的 token
2. **轨迹分段**：在每个压缩步骤处切分长轨迹，每段独立计算损失，避免训练超长序列（节省 GPU 内存）
3. **压缩端到端优化**：压缩步骤也纳入 RL 训练——模型自己决定如何压缩历史信息，目标是最大化最终奖励。不是用独立模型或预训练的摘要器，而是让 Agent 自己学会压缩

---

### 4. 多任务 RL 与泛化

KARL 的核心发现之一：**在异构任务上联合训练比在单任务上训练泛化效果好得多。**

训练设置：
- **分布内任务（训练）**：BrowseComp-Plus（深搜）+ TREC-Biogen（广搜）
- **分布外任务（测试）**：FinanceBench、QAMPARI、FreshStack、PMBench

多任务 RL 的实现非常简单：直接合并两个任务的损失，按总训练 token 平衡两个数据集的比例。

**多任务 RL vs 多专家蒸馏**

论文还对比了另一种方案：分别训练 BrowseComp-Plus 专家和 TREC-Biogen 专家，然后通过 SFT 蒸馏合并（这是 DeepSeek-V3.2 和 GLM-5 使用的方案）。结果：

- 分布内性能：两种方案相当
- 分布外泛化：**多任务 RL 显著优于多专家蒸馏**

这说明 RL 训练过程中的探索和优化本身带来了蒸馏无法复制的泛化能力。

---

## 推理时计算扩展（Test-Time Compute）

KARL 探索了两种推理时计算策略：

### Parallel Thinking（通用策略）

```
给定问题 x
    ↓
并行生成 N 个独立 rollout → N 个答案
    ↓
将 N 个答案喂给同一个模型做 aggregation
    ↓
输出最终答案
```

关键发现：aggregator 不只是投票选择，它会**使用工具合成新答案**。在 PMBench 上，23.7% 的时候 aggregator 生成了比任何单个 rollout 都好的答案。这使得 Parallel Thinking 比简单的 Best-of-N 或多数投票更有表达力。

### Value-Guided Search（任务特定策略）

训练一个小的 value model（Qwen3-4B），预测每个 partial rollout 的未来成功概率，然后用它引导搜索：

```
每个 Agent 步骤：
  1. 并行生成 k=2 个候选动作
  2. value model 评分选最优
  3. 继续到下一步
重复 N 次 → N 条轨迹
    ↓
Best-of-N 或加权投票
```

实验表明：3 个并行 rollout 的 KARL 就超过了 Sonnet 4.6，10 个并行 rollout 匹配 Opus 4.6。

---

## Agent 基础设施

论文在工程基础设施上也有大量细节，这在学术论文中很少见：

### 高吞吐 Vector Search

- 使用嵌入式向量数据库（不是 client-server 架构），消除网络 I/O
- 每台机器 500+ QPS
- 语料库离线处理：分块 → embedding → 建索引 → 缓存到共享存储
- 每个 worker 进程加载自己的内存索引副本

### Agentic Rollout 框架（aroll）

三层抽象：
1. **Exploration Strategy**：管理并发，分发 prompt，收集完成的 rollout
2. **Environment**：拥有完整交互循环，执行工具调用，计算任务特定奖励
3. **Agent**：封装每步的生成决策

通过 **Lifecycle Plugins** 处理横切关注点：
- 上下文压缩（token 超阈值时触发）
- 步数预算控制
- 工具调用网关

关键设计原则：**从数据收集到训练到评估到推理，同一套代码路径**，消除分布偏移。

---

## 实验结果

### 主实验：KARL vs 闭源模型

KARL 在成本-质量和延迟-质量两个维度上都是 Pareto 最优的：

- **无推理时扩展**：KARL 在多数任务上已经接近或超过 Sonnet 4.6，成本更低
- **3x Parallel Thinking**：超过 Sonnet 4.6
- **10x Parallel Thinking**：匹配 Opus 4.6

### 消融实验关键发现

1. **多任务 RL > 单任务 RL**：在训练任务上性能相当，但分布外泛化显著更好
2. **多任务 RL > 多专家蒸馏**：分布外泛化更好，说明 RL 探索过程本身很重要
3. **迭代训练有效**：Iter.2 比 Iter.1 在所有任务上都好，且 Agent 学会了更高效地搜索（更短轨迹）
4. **端到端压缩优于固定压缩**：让模型通过 RL 学习如何压缩，比预定义的压缩策略效果好

### 训练效率

- 基础模型：GLM 4.5 Air
- 每轮迭代只需 1,200-11,000 条合成 prompt
- 最多 3 次迭代
- 数据合成和训练完全解耦，超参搜索成本低

---

## 对实践者的启示

### 如果你在做 RAG / 搜索 Agent

1. **不要只在一种搜索任务上优化**：多任务训练带来的泛化效果远好于单任务 + 蒸馏
2. **合成数据管线值得投入**：Agentic synthesis 比静态文档条件生成质量高得多
3. **难度过滤是关键**：全对和全错的样本都没用，只保留"有的对有的错"的数据

### 如果你在做 RL 后训练

1. **OAPL 是 GRPO 的更简单替代方案**：不需要 importance weighting 等 trick，对 MoE 稳定
2. **离线大批次比在线小批次更实用**：数据生成成本分摊，超参搜索方便
3. **把压缩纳入 RL**：不要用独立的压缩模型，让 Agent 自己学习如何压缩

### 如果你在做 Agent 基础设施

1. **训练和推理用同一套代码**：消除分布偏移
2. **嵌入式向量数据库**：消除网络 I/O，RL 数据生成需要极高吞吐
3. **Lifecycle Plugin 模式**：压缩、预算控制等横切逻辑通过插件注入，不改核心代码

---

## 局限性与开放问题

1. **KARLBench 是自建 benchmark**：虽然包含了多个公开数据集，但整体套件的可比性需要社区验证
2. **只测试了 vector search**：实际场景中 Agent 可能需要 SQL、API 调用、代码执行等多种工具
3. **基础模型限制**：论文基于 GLM 4.5 Air，在更强的基础模型上效果如何未验证
4. **闭合语料库限制**：没有测试开放网络搜索场景
5. **PMBench 未公开**：企业内部 benchmark，外部无法复现

---

## 延伸阅读

- [OAPL: Optimal Advantage-based Policy Optimization](https://arxiv.org) — KARL 使用的 RL 训练算法的详细论文
- [BrowseComp-Plus](https://arxiv.org) — 约束驱动实体搜索 benchmark
- [AgentIR](https://arxiv.org/abs/2603.04384) — 另一种 Agent 检索方案，将 reasoning trace 联合嵌入 query

---

*本文基于 arXiv:2603.05218 原文（77 页）整理，重点提取工程实践细节和可复现的技术方案。*
