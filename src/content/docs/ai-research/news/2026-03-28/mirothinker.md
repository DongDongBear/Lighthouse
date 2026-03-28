---
title: "MiroThinker：三阶段训练 + 交互 Scaling 把开源 Research Agent 推到 GAIA 81.9%"
description: "MiroThinker, Research Agent, ReAct, Agentic RL, GRPO, GAIA, BrowseComp, HLE, Interaction Scaling, MiroMind"
---

# MiroThinker: Pushing the Performance Boundaries of Open-Source Research Agents via Model, Context, and Interactive Scaling

> 原文链接：https://arxiv.org/abs/2511.11793
> 作者：MiroMind Team（54+ 位作者，包括 Song Bai、Lidong Bing）
> 机构：MiroMind AI
> 发布日期：2025-11（v1），持续更新
> 代码：https://github.com/MiroMindAI/MiroThinker
> 权重：https://huggingface.co/miromind-ai/MiroThinker-v1.0-72B

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 三阶段 Agentic 训练（SFT → DPO → RL）+ 256K 上下文内 600 次工具调用的交互 Scaling，72B 开源模型在 GAIA 上达到 81.9%，HLE 上超越 GPT-5-high |
| 大白话版 | 让一个 72B 的开源模型学会像"超级研究助理"一样工作：先模仿专家的搜索轨迹（SFT），再学会分辨好轨迹和差轨迹（DPO），最后通过在线强化学习自我进化（RL）。模型可以在一次对话中调用 600 次工具，在 256K 上下文窗口内持续推理，且准确率随交互深度呈对数增长 |
| 核心数字 | GAIA 81.9%（开源 SOTA，vs MiniMax-M2 75.7%）、HLE 37.7%（超越 GPT-5-high 35.2%）、BrowseComp 47.1%、BrowseComp-ZH 55.6%、FRAMES 87.1%、最大 600 次工具调用、256K 上下文、SFT→RL 增益 8-10pp |
| 评级 | A- — 开源 Research Agent 领域的系统性工程力作。三维 Scaling（模型/上下文/交互）框架扎实，在 8 个基准上全面领先，且开源权重和代码 |
| 代码 | 代码 + 模型权重均开源 |
| 关键词 | Research Agent, ReAct, Agentic SFT, Agentic DPO, Agentic RL, GRPO, Interaction Scaling, MiroVerse, GAIA, HLE, BrowseComp |

## 核心 Insight

**Research Agent 的性能不是只由模型智力决定的，而是模型能力、上下文管理和交互深度三者的联合函数。**

MiroThinker 的核心贡献在于将这三个维度统一到一个框架中，并在每个维度上做到了极致：

1. **模型 Scaling**：从 8B 到 72B，GAIA 从 66.4% → 81.9%（+15.5pp），性能随模型规模稳定增长
2. **上下文 Scaling**：256K 窗口 + Recency-Based Context Retention（K=5），让模型在超长交互中不丢失关键信息
3. **交互 Scaling**：最多 600 次工具调用，且准确率随交互深度呈**对数关系**增长——这是一个重要的经验发现

### 为什么这个想法 work？

三阶段训练流水线的设计逻辑非常清晰：

1. **SFT 建立基础能力**：教模型"怎么使用工具、怎么搜索、怎么推理"。这是从零到一的阶段。
2. **DPO 建立偏好**：教模型分辨"好的搜索策略 vs 差的搜索策略"。偏好标签仅基于最终答案正确性——简单但有效。
3. **RL（GRPO）实现自我进化**：让模型在线探索，用奖励信号持续优化。RL 阶段带来 8-10pp 的增益，且模型学会生成更长、更深入的探索轨迹。

关键的工程洞察是 **Interaction Scaling 的对数规律**：准确率随交互深度的增长速度递减但持续正增长。这意味着给模型更多的"思考和行动时间"始终有益，但收益是边际递减的。这一发现对推理时 compute 分配有直接指导意义。

## 方法详解

### 整体架构

```
Qwen2.5 / Qwen3 基础模型
    ↓
[ReAct 单 Agent 范式]
Thought → Action → Observation → 循环
6 种工具 + 256K 上下文 + K=5 上下文保留
    ↓
[Stage 1: Agentic SFT]
专家轨迹模仿学习
    ↓
[Stage 2: Agentic DPO]
基于答案正确性的偏好学习
    ↓
[Stage 3: Agentic RL (GRPO)]
在线强化学习 + 流式 Rollout
    ↓
MiroThinker (8B / 30B / 72B)
```

### Agent 架构

**核心循环（ReAct 范式）：**

在第 t 步：

$$T_t = f_\theta(q, H_t) \quad \text{(Thought: 基于问题和历史的推理)}$$

$$A_t = \pi_\theta(H_t, T_t) \quad \text{(Action: 基于推理选择工具调用)}$$

$$O_t = \text{Tool}(A_t) \quad \text{(Observation: 工具返回结果)}$$

$$H_{t+1} = H_t \cup \{(T_t, A_t, O_t)\} \quad \text{(历史累积)}$$

这是经典的 ReAct 单 Agent 范式——没有多 Agent 协作，没有复杂的调度器，一切都在一个模型的一次推理中完成。简单但有效。

**工具接口（6 种工具）：**

| 工具 | 类别 | 功能 |
|---|---|---|
| `create_sandbox` / `run_command` / `run_python_code` | Linux 沙箱 | 代码执行和系统操作 |
| `upload_file` / `download_file` / `download_from_internet` | 文件管理 | 文件上传下载 |
| `google_search` | 网络搜索 | Google 搜索 |
| `scrape_and_extract_info` | URL 提取 | 使用 Qwen3-14B 做 LLM-powered 的网页内容提取 |

注意：HuggingFace 访问被禁用，以防止基准泄漏——这是一个值得尊敬的实验设计决策。

### Interaction Scaling：256K 上下文中的 600 次工具调用

这是本文最关键的工程创新之一。600 次工具调用在 256K 上下文中要正常工作，必须解决上下文爆炸问题。

**Recency-Based Context Retention（K=5）：**

- 只保留最近 K=5 次工具调用的完整 Observation 输出
- 更早的 Observation 被替换为空占位符
- **所有的 Thought-Action 序列完整保留**——模型永远可以看到自己"想了什么、做了什么"
- 只是看不到旧的工具返回结果

这个设计很精妙：模型的推理链（what I thought and did）是完整的，只有外部环境反馈（what the tool returned）会被压缩。这保留了"我为什么走到这一步"的完整逻辑链条。

**结果截断：** 过长的工具输出用 `[Result truncated]` 截断，进一步控制上下文占用。

### 三阶段训练流水线

#### Stage 1: Agentic SFT（监督微调）

**训练数据：** $(x_i, H_i)$ 对，其中 $x_i$ 是查询，$H_i$ 是专家轨迹。

**数据质量控制（关键）：**

| 过滤策略 | 目的 |
|---|---|
| 删除内部重复响应 | 去除同一轨迹内的循环模式 |
| 删除跨响应重复 | 去除不同轨迹间的相似内容 |
| 删除无效工具调用 | 去除格式错误或不存在的工具调用 |

**损失函数：**

$$\mathcal{L}_{\text{SFT}} = -\mathbb{E}\left[\sum_t \log \pi_\theta(T_t, A_t \mid x, H_{<t})\right]$$

标准的 next-token prediction loss，但在 Thought 和 Action token 上计算。注意这里不对 Observation token 计算损失——模型只学"怎么想"和"怎么做"，不学"工具会返回什么"。

#### Stage 2: Agentic DPO（直接偏好优化）

**训练数据：** $(x_i, H_i^+, H_i^-)$ 三元组——同一个查询的优选轨迹和劣选轨迹。

**偏好标签规则：** 仅基于最终答案正确性。答案正确的轨迹是 $H^+$，答案错误的轨迹是 $H^-$。

这看似粗暴，实际上非常实用：不需要人工逐步标注轨迹质量（成本极高），只需要验证最终答案是否正确。

**损失函数：**

$$\mathcal{L}_{\text{PO}} = \mathbb{E}[\mathcal{L}_{\text{DPO}}] + \lambda \cdot \mathcal{L}_{\text{SFT}}^{(+)}$$

DPO 损失加上正样本的 SFT 正则项。$\lambda$ 控制正则强度，防止偏好学习偏离太远导致能力退化。

#### Stage 3: Agentic RL（GRPO 强化学习）

**算法：** Group Relative Policy Optimization（GRPO），完全在线。

**奖励函数：**

$$R(x, H) = \alpha_c \cdot R_{\text{correct}} - \alpha_f \cdot R_{\text{format}}$$

- $R_{\text{correct}}$：答案正确性奖励，由 judge 模型（gpt-4.1-2025-04-14）判定
- $R_{\text{format}}$：格式违规惩罚
- $\alpha_c, \alpha_f$：权重系数

**基础设施：**
- 数千个并发 rollout
- 流式 rollout 加速 + 任务队列
- 轨迹筛选（curation）：过滤病态轨迹（如无限循环、工具调用失败率过高的轨迹）

**RL 阶段的关键发现：**
- RL 训练后，模型产生的轨迹显著变长（更多探索步骤）
- SFT → RL 带来 8-10 个百分点的稳定增益
- 模型学会了"不轻易放弃"——遇到初始搜索失败会尝试更多策略

### MiroVerse v1.0 数据集

**MultiDocQA 合成流水线（5 步）：**

```
文档采样 → 超链接跟踪 → Markdown 转换 → 事实提取 → 约束模糊化 + 问题生成
```

**多范式覆盖：**

| 范式 | 说明 |
|---|---|
| ReAct | 标准的 Thought-Action-Observation 循环 |
| MiroFlow | 多 Agent 协作范式 |
| Function Calling + MCP | 结构化函数调用 |

**数据来源多样化：**
- LLM 生成：GPT-OSS、DeepSeek-V3.1
- 开源数据集：MuSiQue、HotpotQA、WebWalkerQA-Silver 等

## 实验结果

### 模型规模 Scaling

| 模型 | 基座 | GAIA | BrowseComp |
|---|---|---|---|
| MiroThinker-8B | Qwen2.5-8B | 66.4% | 31.1% |
| MiroThinker-30B | Qwen3-30B | 73.5% | 41.2% |
| MiroThinker-72B | Qwen2.5-72B | 81.9% | 47.1% |

从 8B 到 72B，GAIA 提升 +15.5pp，BrowseComp 提升 +16.0pp。规模效应非常显著且稳定。

### 主实验：72B 全基准对比

| Benchmark | MiroThinker-72B | 最佳开源对手 | GPT-5-high |
|---|---|---|---|
| **GAIA** | **81.9%** | MiniMax-M2 75.7% | ~85% |
| **HLE** | **37.7%** | 通义 32.9% | 35.2% |
| **BrowseComp** | **47.1%** | MiniMax-M2 45.1% | -- |
| **BrowseComp-ZH** | **55.6%** | GLM-4.6 49.5% | -- |
| **xbench-DeepSearch** | **77.8%** | -- | -- |
| **FRAMES** | **87.1%** | -- | -- |
| **SEAL-0** | **51.0%** | -- | -- |
| **WebWalkerQA** | **62.1%** | -- | -- |

**关键发现：**

1. **GAIA 81.9%**：超越所有开源模型 6.2pp 以上，距 GPT-5-high（~85%）仅差约 3pp。
2. **HLE 37.7% 超越 GPT-5-high（35.2%）**：这是最令人惊讶的结果——一个 72B 开源模型在 Humanity's Last Exam 上击败了闭源旗舰。HLE 被设计为"人类最后的考试"，包含各领域顶尖专家出的最难题目。
3. **BrowseComp/BrowseComp-ZH 双双开源 SOTA**：47.1% 和 55.6%，均领先第二名 2-6pp。
4. **覆盖面广**：在 8 个基准上报告了结果，不是只打几个"有利"的基准。

### Interaction Scaling 分析

这是本文最有理论价值的部分。

**核心发现：准确率与交互深度呈对数关系。**

具体表现：
- 浅层交互（前 50 次工具调用）带来最大的准确率增长
- 深层交互（100-600 次）仍有正增益，但斜率递减
- RL 模型比 SFT 模型产生更长的轨迹——RL 教会了模型"坚持探索"
- SFT → RL 在各交互深度上都带来 8-10pp 的增益

**含义：** 给 Research Agent 更多的"思考时间"（更多工具调用）始终有用，但效用递减。这为推理时 compute 预算分配提供了量化依据。

### 推理配置

| 参数 | 值 |
|---|---|
| Temperature | 1.0 |
| Top-p | 0.95 |
| 最大轮次 | 600 |
| 上下文窗口 | 256K |
| 上下文保留 K | 5 |
| 最大输出长度 | 16384 tokens |
| 评估策略 | avg@3（多数基准）, avg@8（GAIA/xbench/SEAL-0） |

注意 Temperature 1.0 和 avg@3/avg@8 的组合：高温度增加多样性，多次评估取平均降低方差。这是一种"用推理时 compute 换准确率"的策略。

### 后续版本

| 版本 | 亮点 |
|---|---|
| v1.5 | 金融预测优化。235B 模型：39.2% HLE, 69.8% BrowseComp |
| v1.7 | BrowseComp 74.0% |
| H1 | BrowseComp 88.2% |

从 v1.0 到 H1，BrowseComp 从 47.1% 飙升至 88.2%（+41.1pp）。这暗示了 Interaction Scaling + 模型迭代的巨大潜力。

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | 3/5 | MiroVerse 数据集的开源程度不明确，论文描述了合成方法但未确认完整数据集是否公开 |
| 代码可得性 | 4/5 | GitHub 仓库和 HuggingFace 权重均已开源，但训练流水线的完整代码不确定 |
| 算力需求 | 2/5 | 72B 模型的三阶段训练（尤其 RL 阶段需要数千并发 rollout）要求极大的 GPU 集群；8B 版本相对可行 |
| 工程复杂度 | 2/5 | 三阶段训练 + 流式 RL + 沙箱环境 + Judge 模型集成，工程量极大 |
| 预期收益 | 5/5 | 直接可用（权重已开放）。作为 Research Agent 的基线或直接部署均有价值 |

**复现建议：** 对于大多数团队，建议直接使用开源的 72B 权重进行推理和微调，而非从头训练。如果要复现训练流程，从 8B 版本开始验证流水线是更现实的选择。RL 阶段的基础设施（数千并发 rollout + Judge 模型调用）是最大的工程瓶颈。

## 批判性分析

### 局限性

**论文自述：**
1. 工具使用质量：部分工具调用是边际的（marginal），对最终结果贡献不大
2. CoT 冗长：RL 训练导致思维链过度 verbose，增加了推理成本
3. 语言混杂：非英语任务中出现语言混用
4. 沙箱代码质量：生成的代码有时存在质量问题

**我们额外发现的问题：**

1. **评估策略的高推理成本**：avg@8 意味着同一道题要跑 8 次取平均。对于 72B 模型、最长 600 次工具调用、256K 上下文的配置，单道题的评估成本极高。实际部署中用户不会等 8 次推理，单次推理的性能数字会低于报告值。

2. **K=5 上下文保留的信息损失**：只保留最近 5 次工具返回的完整内容，更早的信息被丢弃。对于需要综合 20+ 次搜索结果才能回答的复杂问题，这种策略可能导致关键信息丢失。论文未分析 K 值对不同类型问题的影响。

3. **Judge 模型依赖**：RL 阶段使用 gpt-4.1-2025-04-14 作为 Judge。这引入了对闭源模型的依赖：(a) Judge 的偏差会传导到训练模型，(b) 无法完全复现训练过程，(c) API 成本和可用性是现实约束。

4. **对数 Scaling 的可持续性**：对数关系意味着要获得下一个 1% 的提升，需要指数级增加交互次数。当交互深度从 300 增加到 600 时的边际收益可能不值得 2 倍的推理成本。论文未给出推理成本与收益的量化权衡。

5. **基准饱和度差异**：GAIA 81.9% 和 FRAMES 87.1% 已经接近或进入高分区，进一步提升的空间有限。相比之下 BrowseComp 47.1% 和 SEAL-0 51.0% 仍有大量改进空间，暗示模型在深度信息检索上的能力仍然不足。

### 独立观察

1. **单 Agent vs 多 Agent 的路线之争**：MiroThinker 坚持使用 ReAct 单 Agent 范式，不用多 Agent 编排。这是一个值得注意的架构选择——在多 Agent 框架（如 AutoGen、CrewAI）大行其道的今天，MiroThinker 证明了单 Agent + 充足的交互预算可以达到极高的性能。这降低了系统复杂度，也减少了 Agent 间通信的信息损失。

2. **RL 的不可替代性**：SFT → RL 带来 8-10pp 的稳定增益，这与 OpenSeeker 的"纯 SFT 也能很强"的叙事形成对比。两者并不矛盾：SFT 的数据质量决定下限，RL 的探索能力决定上限。MiroThinker 的 RL 增益说明，对于需要长程规划和错误恢复的 Agent 任务，RL 提供了 SFT 无法覆盖的能力。

3. **Interaction Scaling 作为新的 Scaling Law**：模型 Scaling（参数量）和数据 Scaling（训练数据量）已被广泛研究。MiroThinker 提出的 Interaction Scaling（推理时的交互深度）是第三个维度，且它的对数关系为推理时 compute 分配提供了理论依据。这可能催生新的"推理预算优化"研究方向。

4. **后续版本的跳跃式进步**：v1.0 到 H1 的 BrowseComp 从 47.1% → 88.2%，这种跳跃暗示 v1.0 的框架远未达到其潜力上限。可能的原因包括：更好的训练数据、更多的 RL 迭代、或搜索策略的改进。这也意味着开源社区在此基础上的改进空间很大。

5. **与 GPT-5 的距离在快速缩小**：GAIA 上 MiroThinker（81.9%）vs GPT-5-high（~85%）仅差 3pp。在 HLE 上甚至超越了 GPT-5-high。考虑到 MiroThinker 是 72B 的开源模型，而 GPT-5 是规模远大于此的闭源模型，这个差距的缩小具有重要的产业意义。

### 对领域的影响

**短期：** MiroThinker 的开源权重将成为 Research Agent 的新基线。预计很快会有团队在其基础上微调或改进，尤其是在中文搜索和垂直领域（金融、法律、医学）方面。

**中期：** Interaction Scaling 的对数规律为"推理时计算"（inference-time compute）的研究提供了新的经验基础。如何在有限的推理预算下最大化 Agent 性能，将成为一个独立的优化问题。

**长期：** 如果开源 Agent 持续逼近闭源水平（如 v1.7/H1 的 BrowseComp 已大幅超越早期闭源模型），这可能重塑 AI 搜索产品的竞争格局——任何团队都可以部署接近前沿水平的 Research Agent，而不再依赖 OpenAI 或 Google 的 API。
