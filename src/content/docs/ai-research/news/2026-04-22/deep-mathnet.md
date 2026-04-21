---
title: "MathNet 深度解读：把数学 AI 评测从“会做题”推进到“会检索结构相似题”"
description: "MathNet, mathematical reasoning, retrieval, multimodal benchmark, olympiad, RAG, structural resonance, 17 languages"
---

# MathNet: a global multimodal benchmark for mathematical reasoning and retrieval

> 原文链接：https://arxiv.org/abs/2604.18584
> 作者：Shaden Alshammari, Kevin Wen, Abrar Zainal, Mark Hamilton, Navid Safaei, Sultan Albarakati, William T. Freeman, Antonio Torralba
> 机构：MIT, KAUST, HUMAIN 等
> 发布日期：2026-04-21

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | MathNet 第一次把高难数学评测拆成“求解 + 数学检索 + 检索增强求解”三联任务，让 benchmark 更接近真实数学 agent 工作流。 |
| 大白话版 | 以前大家只问模型会不会做题；这篇论文开始问：它会不会先找到结构上类似的题，再借着那些思路把题做出来。 |
| 核心数字 | 30,676 题；47 个国家；17 种语言；143 个竞赛；Gemini 3.1 Pro 在 solve 上 78.4；最好检索模型 R@1 只有约 5%；DeepSeek-V3.2-Speciale 在 Expert-RAG 下 97.3 |
| 评级 | A — benchmark 本身不是新模型，但对“数学 agent 应该怎么评”提出了很重要的新范式。 |
| 代码 | 论文主站提供 benchmark 信息，代码/leaderboard 需继续追踪 |
| 关键词 | Math benchmark、retrieval、RAG、Olympiad、multilingual、multimodal、structural resonance、math agents |

## 核心 Insight

MathNet 最核心的洞察是：真正有用的数学 AI，不只是一个会输出答案的求解器，而更像一个“先找相似结构、再迁移方法、最后给出可验证解答”的工作系统。

这和过去大多数数学 benchmark 的 framing 很不同。传统 benchmark 默认把数学能力理解成“看到题之后直接做出来”。但真实数学工作——尤其是竞赛训练、辅导、研究启发、proof assistant——往往会先经历一个检索阶段：你会想，这题像不像某道见过的题？有没有一个共享引理？是不是能化到某个熟悉结构？

MathNet 的贡献不是造了更难的题，而是把这个“找结构相似题”的过程正式拉进 benchmark 里，并把它与最终求解增益连接起来。论文最有力量的数据，也恰恰说明这个洞察是对的：顶级生成模型已经能把 solve 分数做上去，但 embedding 检索的 Recall@1 还惨得只有 5% 左右，说明“会做题”和“会找结构等价题”根本不是同一能力。

### 为什么这个想法成立？

因为数学里的“相似”并不是普通语义相似。它可能是：

- 同一道题的变量替换；
- 不同领域下的同构结构；
- 共享关键引理；
- 需要同一种结构归约；
- 一道题是另一道题的推广或特例。

文本 embedding 擅长抓语义邻近，但未必能抓数学结构同一性。MathNet 正是把这个差别显性化了。

## 方法详解

### 整体架构

MathNet 不是提出求解模型，而是提出一个由三块组成的数据与评测框架：

```text
官方竞赛题册 / PDF
   ↓ OCR + LLM 抽取 + 三重验证
MathNet-Solve（求解）
   ├─→ MathNet-Retrieve（结构检索）
   └─→ MathNet-RAG（检索增强求解）
```

### 组件 1：MathNet-Solve —— 高可信、多语种数学题库

**做什么：**
构建一个覆盖全球数学竞赛、带官方解答、高质量证明型答案的主 benchmark。

**怎么做：**
论文从 47 个国家、143 个竞赛、1985-2025 时间跨度中收集官方题册，累计 1595 本 PDF、超过 25,000 页。随后通过三阶段 pipeline 抽取题目与解答：

1. 用 OCR 把 PDF 转成 markdown；
2. 用 LLM 识别题目/解答片段并抽取为更 LaTeX 友好的表示；
3. 用规则检查 + GPT-4.1 judge + 人工复核做三重验证。

这一步很关键，因为过去很多数学 benchmark 的短板不在“题不够难”，而在“解答不够权威、不够整洁、题解对不齐”。MathNet 的价值首先来自官方来源与高质量抽取。

### 组件 2：MathNet-Retrieve —— 把数学检索正式变成任务

**做什么：**
评估模型是否能在候选题里找到数学上等价或高度结构相似的问题。

**怎么做：**
从 10,000 个 anchor 出发，为每个 anchor 构造：

- 1 个 equivalent positive
- 3 个 adversarial hard negatives

作者引入三层数学相似性 taxonomy：

1. Invariance：严格等价，只是表述变化；
2. Resonance：不严格等价，但共享关键解法结构；
3. Affinity：主题相近但未必共享方法。

这里最有价值的是 Resonance 概念。因为真实数学启发最常发生在这一层：不是“同一道题改写”，而是“这题和我以前见过的那题，结构上在同一个家族里”。

### 组件 3：MathNet-RAG —— 检索是否真的能帮求解

**做什么：**
测试“给模型一题相关例题及其官方解答”后，是否能提升最终求解效果。

**怎么做：**
论文构造了三种模式：

- Zero-shot：只给目标题；
- Embed-RAG：用 embedding 检到相关题，再给该题及官方解；
- Expert-RAG：直接给专家手工配对的结构共鸣题与官方解。

这个实验设计非常漂亮，因为它把两个问题拆开了：

1. 如果给对例题，模型会不会用？
2. 今天的检索器能不能真正找对例题？

### 与现有方法的关键区别

| 维度 | 过去 benchmark | MathNet | 为什么更好 |
|---|---|---|---|
| 数据来源 | AoPS/网络题库较多 | 官方国家题册 + 官方解答 | 可信度更高 |
| 语言覆盖 | 以英语为主 | 17 语言、47 国 | 更接近真实全球分布 |
| 任务定义 | 只测求解 | 求解 + 检索 + RAG | 更像数学 agent |
| 相似性定义 | 常按文本/语义近邻 | 引入 invariance/resonance/affinity | 更像数学结构 |
| RAG 评估 | 常缺失 | 专门测检索对求解的真实帮助 | 能分离 retriever 与 solver 瓶颈 |

## 实验结果

### 主实验：MathNet-Solve

| 方法 | Solve 分数 |
|---|---:|
| Gemini-3.1-Pro | 78.4 |
| Gemini-3-Flash | 70.4 |
| GPT-5 | 69.3 |
| GPT-5-mini | 57.0 |
| Claude Opus 4.6 | 45.7 |
| Gemini-2.5-Flash | 41.1 |
| DeepSeek-V3.2 | 40.1 |
| Grok-3 | 28.5 |
| GPT-4.1 | 21.4 |
| GPT-4o | 6.8 |

**解读：**
- 顶级模型已经能把 solve 推到 70%+，说明纯生成式数学能力确实在进步；
- 但 Geometry、Discrete 仍明显更难；
- 这也意味着数学 benchmark 不能只停留在“谁 solve 最高”，因为 solve 一项已经不足以暴露能力结构差异。

### 数学检索实验：MathNet-Retrieve

| 方法 | R@1 | R@5 |
|---|---:|---:|
| qwen3-embedding-4B | 4.96 | 64.95 |
| gemini-embedding-001 | 4.83 | 68.88 |
| all-mpnet-base-v2 | 3.78 | 57.70 |
| text-embedding-3-large | 2.74 | 54.23 |
| cohere-embed-v4.0 | 2.24 | 44.81 |

**解读：**
- 这是全篇最值得反复看的表：最强 embedding 的 top-1 检索率也只有约 5%；
- 说明通用 embedding 在数学结构检索上远未过关；
- Recall@5 看起来有所改善，但对真正的自动系统来说，“第一个就得找对”通常才是关键。

### RAG 实验：真正瓶颈在 retriever

| 方法 | Zero-shot | Embed-RAG | Expert-RAG |
|---|---:|---:|---:|
| DeepSeek-V3.2-Speciale | 84.8 | 89.5 | 97.3 |
| Gemini-3-Pro | 89.1 | 92.9 | 87.5 |
| GPT-5 | 76.8 | 75.2 | 86.6 |
| Grok-4.1-Fast | 75.4 | 83.8 | 83.2 |
| Claude-4.5-Opus | 46.8 | 55.5 | 52.4 |

**关键发现：**
1. Expert-RAG 常常比 Embed-RAG 更强，说明“好例题”本身确实有用；
2. Embed-RAG 有时反而拖后腿，说明错误检索会污染推理；
3. 这篇论文真正打中的痛点，不是 solver 不够强，而是 retriever 不够懂数学结构。

### 可扩展性与多样性分析

MathNet 还同时拉开了国家、语言和多模态维度。论文本身不是 scaling law 论文，但它已经给后续研究搭好了一个更真实的扩展坐标：未来如果要做数学 agent，不只要问“做对多少题”，还要问：

- 在不同国家题风上稳不稳；
- 多语言表述下行不行；
- 带图形、几何、证明时是否掉队；
- 检索和求解是否能共同进步。

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐⭐⭐⭐ | benchmark 定义清晰、数据规模大、来源官方，但完整分发与清洗细节仍需继续看仓库开放程度 |
| 代码可得性 | ⭐⭐⭐ | 论文方法更多是 benchmark/pipeline，后续仍要看评测脚本和 leaderboard 完整开放情况 |
| 算力需求 | ⭐⭐⭐ | 评测顶级闭源模型成本不低，但作为 benchmark 使用本身不是难以承受 |
| 工程复杂度 | ⭐⭐⭐⭐ | 官方题册抽取 + OCR + judge pipeline 复杂，完整复刻数据构建并不轻松 |
| 预期收益 | ⭐⭐⭐⭐⭐ | 对数学 tutor、proof assistant、math RAG、教育 AI 都很有参考价值 |

**复现建议：**
先用公开子集或 test split 复跑 solve / retrieve / RAG 三个任务，重点看自己的 retriever 是否真的能抓住 resonance 级相似题，而不是只做文本近邻。

## 批判性分析

### 局限性

论文承认的局限包括：

1. visual augmentation 对符号数学帮助有限；
2. MathNet-RAG 规模仍较小，需要人工评分；
3. MathNet-Retrieve 的正负样本中有一部分是 LLM 合成构造的，不等于真实检索全分布。

我们额外看到的问题：

1. 检索任务仍偏向“找题”，而不是“找引理/找技巧/找部分结构”。真实数学工作中，这些中间粒度对象同样重要；
2. benchmark 虽然更全球化，但仍主要集中在竞赛数学，和科研级长证明问题还有距离；
3. top-1 检索过低也说明现有 embedding 可能需要更结构化的公式表示，而不是继续只堆文本语义。

### 改进方向

1. 公式结构感知检索：引入图结构、符号树或 theorem graph；
2. 中间对象检索：不只检题，还检关键引理、常见构造、证明模板；
3. 更大规模人类 RAG 配对：把 resonance 层级配对做得更丰富、更像真实教学和研究启发。

### 独立观察

- MathNet 其实在重新定义“数学智能”的边界：不是会算就够，而是要能在结构空间里导航。
- 这对未来的 deep research agent 很重要，因为很多专业推理任务都不是“看完材料直接答”，而是“先找结构相似案例，再迁移”。
- 如果把这种思想推广到代码、法律、科研文献，都会得到比单纯 QA 更真实的 agent benchmark。

## 对领域的影响

MathNet 不会像新模型发布那样马上刷屏，但它很可能会悄悄改变接下来一年的研究方向。因为它把一个行业里常被混在一起的问题拆开了：求解、检索、RAG 利用。这种拆解一旦成立，未来数学 agent 的进步就不再只是“解题率涨了几个点”，而会变成“是否真的更会找结构、会用结构、会把外部知识迁移进来”。这比继续造一个更难的做题榜，价值大得多。
