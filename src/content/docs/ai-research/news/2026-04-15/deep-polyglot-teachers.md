---
title: "Polyglot Teachers：多语种合成数据教师模型终于从'谁大谁上'走向可验证工程"
description: "Polyglot Teachers, multilingual synthetic data, teacher model selection, PG-Score, Gemma 3 27B, Aya Expanse 32B, multilingual SFT, data quality"
---

# Evaluating Language Models for Multilingual Synthetic Data Generation

> 原文链接：https://arxiv.org/abs/2604.11290
> 作者：Louis-Jean V. Miranda、Akshat Kothari 等
> 机构：University of Cambridge、Microsoft Research 等
> 发布日期：2026-04-13

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 这篇论文证明，多语种合成数据里“最大模型当老师”并不可靠，真正该看的其实是数据多样性、流畅度和师生家族匹配。 |
| 大白话版 | 给小模型喂“AI 生成的训练数据”时，老师不一定越大越好，关键是谁更会用目标语言出题、答题、写得自然。 |
| 核心数字 | 10 个教师模型，6 种语言，140 万+ SFT 样本，240 个学生模型，PG-Score 前两名为 Gemma 3 27B（0.726）与 Aya Expanse 32B（0.706）。 |
| 评级 | A — 这是多语种蒸馏和合成数据工程里少见的系统性实证工作。 |
| 代码 | 论文称已开放 code / data / models |
| 关键词 | multilingual synthetic data, teacher model, PG-Score, Gemma 3, Aya Expanse, SFT, distillation, data quality |

## 核心 Insight

这篇论文最有价值的地方，不是又做了一个“合成数据有效”的结论，而是把**“老师模型怎么选”**从拍脑袋变成了可量化问题。

过去很多团队做多语种 SFT，都默认直接拿手头最大的 teacher 生成数据。但论文指出，这个默认动作有两个根本问题。第一，大模型在英文 benchmark 上强，不等于在阿拉伯语、印尼语、捷克语上也适合当老师。第二，teacher 的价值不是自己会不会答题，而是它生成的数据能不能把学生教出来。

所以作者把问题重新定义成，**好老师 = 既能生成高质量多样化数据，又能让学生在真实下游任务上变强**。这就是 Polyglot Score 的核心，它同时看 intrinsic data quality 和 extrinsic student performance，而不是只看其中一边。

### 为什么这个想法 work？

因为 synthetic data pipeline 的真正目标不是“生成一些看起来不错的文本”，而是“让学生学到东西”。

只看文本表面质量，会忽略 teacher 可能在某些语言里知识空心、风格单一、提示模板僵化。只看学生最终分数，又会很贵，因为每测一个老师都要真的训学生。论文的折中做法是先把内在指标和外在指标绑在一个统一框架里，再进一步研究哪些 intrinsic 指标最能预测 extrinsic 收益。这让 teacher selection 第一次有了工程上的可操作性。

## 方法详解

### 整体架构

论文的完整 pipeline 可以概括成：

```text
多语种种子数据集
  → 用 teacher 按 3 种方法生成合成 SFT 数据
  → 计算 intrinsic data quality
  → 用这些数据训练 student
  → 在多语种 benchmark 上测 student
  → 合成为 PG-Score
```

其中最关键的是三层设计：
1. teacher 不只比一个任务，而是比三种常见合成策略。
2. 数据质量不是人工主观打分，而是 embedding diversity + perplexity + reward model 联合衡量。
3. teacher 最终不是靠“自己强”胜出，而是靠“教出来的学生强”胜出。

### 关键技术组件

#### 组件 1：三种 synthetic data 生成范式

**做什么：**覆盖现实里最常见的多语种 SFT 数据生成路径。

**怎么做：**
- **Generate**：从目标语言 seed dataset 抽 few-shot 样例，让 teacher 直接生成全新的 prompt-response 对。
- **Translate**：把英文 prompt 翻译到目标语言，再让 teacher 回答。
- **Respond**：直接拿目标语言 prompt，让 teacher 只生成 response。

这三种方法对应现实里三类团队：
- 高资源语言团队，喜欢直接扩写 prompt 池。
- 英文资源强、目标语言弱的团队，喜欢先翻译 prompt。
- 已有 prompt、缺 response 的团队，偏爱 respond。

论文没把它们混成一锅，而是单独建模，这点很关键。

#### 组件 2：Intrinsic 质量指标

**做什么：**在不训练 student 的情况下，先估计这批 synthetic data 有没有成为“好教材”的潜力。

**怎么做：**作者定义了四个核心指标：
- prompt diversity：提示多样性
- response diversity：回答多样性
- perplexity：base model 条件下 response 的流畅性
- multilingual reward score：多语种 reward model 对 instruction-following、自然度的评分

他们把这些指标 z-score 标准化后求平均，形成 intrinsic score：

$$
Intrinsic_{T,\ell} = \frac{1}{|M|}\sum_{m \in M} z(m(\mathcal{D}_{T,\ell}))
$$

其中：
- $T$ 表示 teacher
- $\ell$ 表示目标语言
- $M = \{d_x, d_y, -\log(1+PPL), R\}$

这里有个细节值得注意，perplexity 不是直接取负，而是用 $-\log(1+PPL)$，避免极端高 PPL 把分布拉坏。

#### 组件 3：Extrinsic 学生表现

**做什么：**衡量 teacher 生成的数据，是否真的让学生更强。

**怎么做：**作者用 synthetic data 微调 student，再在三类任务上评估：
- Culture：Global-MMLU Lite
- Chat：M-RewardBench
- Math：M-GSM

他们没有直接看 raw score，而是定义了 PGR（Performance Gap Recovered）：

$$
Extrinsic_{T,\ell} = \frac{1}{|B|}\sum_{b \in B}\frac{score_b(S_{T,\ell}) - score_b(S_{\phi})}{score_b(S_{REF}) - score_b(S_{\phi})}
$$

其中：
- $S_{\phi}$ 是 base student
- $S_{T,\ell}$ 是用 teacher 生成数据训出来的 student
- $S_{REF}$ 是参考模型

直觉上，这个量衡量的是，student 在 teacher 帮助下，追回了多少和参考模型之间的差距。

#### 组件 4：PG-Score

最后，作者把 intrinsic 和 extrinsic 合并：

$$
PG\text{-}Score_{T,\ell} = z(Intrinsic_{T,\ell} + Extrinsic_{T,\ell})
$$

它的优点是，既不让“学生分数”一票否决，也不让“文本好看”掩盖真实训练价值。

### 训练策略

- **教师模型**：10 个，包括 Llama 3.1 8B/70B、Gemma 3 4B/12B/27B、Aya Expanse 32B、Command A、IBM Granite、GPT-4o mini。
- **语言**：阿拉伯语、捷克语、德语、西班牙语、印尼语、日语。
- **每个 teacher-language 对**：10.5k 样本，三种方法大致均分。
- **随机性控制**：每组生成重复 3 次。
- **学生训练主设置**：OLMo 3 7B。
- **泛化设置**：Llama 3.1 8B、Gemma 3 4B PT、Qwen 3 8B Base。

如果粗算主实验量级，10 teachers × 6 languages × 3 seeds × 10.5k 样本，正好落在 140 万级别，这和摘要一致。

### 与现有方法的关键区别

| 维度 | 之前的方法 | 本文方法 | 为什么更好 |
|---|---|---|---|
| teacher 选择 | 谁大选谁、凭经验 | 系统评估 10 个模型 | 避免英文强者在低资源语言误导结果 |
| 数据评估 | 只看文本质量或只看学生分数 | intrinsic + extrinsic 联合 | 兼顾成本与真实教学价值 |
| 语言覆盖 | 常偏英语或少量语言 | 6 个类型差异大的语言 | 结论更能代表多语种场景 |
| 方法比较 | 常混合策略不拆分 | Generate / Translate / Respond 分开测 | 能看出不同语言的最优 recipe |

## 实验结果

### 主实验

| 方法/模型 | 平均 PG-Score |
|---|---:|
| Llama 3.1 8B | -0.160 |
| Llama 3.1 70B | 0.140 |
| IBM Granite Micro | 0.164 |
| IBM Granite 4.0 | 0.283 |
| Gemma 3 4B | 0.469 |
| Command A | 0.459 |
| Gemma 3 12B | 0.595 |
| **Gemma 3 27B** | **0.726** |
| **Aya Expanse 32B** | **0.706** |
| GPT-4o mini | 0.551 |

**解读：**
- 最大的惊喜不是 Gemma 3 27B 排第一，而是 **Llama 3.1 70B 明显不行**。这直接打脸“参数量越大越适合做 teacher”的粗暴直觉。
- Gemma 3 4B、12B 也都排得很靠前，说明小模型如果语言覆盖和输出风格对路，也能当好老师。
- 语言维度上，德语、西班牙语整体最好，阿拉伯语最难。这意味着 teacher quality 不是模型常数，而是模型 × 语言的交互项。

### 泛化实验

作者把 student base model 换成 Llama、Gemma、Qwen 三条线后，结论没有塌：Gemma 3 27B 和 Aya Expanse 32B 仍然稳定居前。

更关键的是，论文观察到**师生家族匹配**是强启发式。比如 Gemma teacher 配 Gemma student，PG-Score 至少比最差组合高 20.5% 以上。

这背后可能有两个原因：
1. tokenizer 和 subword 切分更接近。
2. pretraining 分布与语言风格更接近。

这不是严格因果证明，但已经足够变成工程规则。

### 方法对比实验

论文把三种生成方式拆开后，得到一个很实用的结论：
- **高资源语言（如德语）**：Generate 最好。
- **低资源或较弱语言（如阿拉伯语、印尼语）**：Respond / Translate 更优。

这非常合理，因为 Generate 更依赖 seed data 的 few-shot 质量。如果目标语言原始种子质量一般，先翻译英文 prompt 或直接基于已有 prompt 生成 response，稳定性更高。

### 解释性分析

PCA 分析显示，前 4 个主成分解释了 **93.3%** 的 intrinsic 方差。

其中：
- PC1（42.2%）偏向 response 流畅度和 distinctiveness
- PC2（22.1%）偏向 prompt diversity 和长度
- PC3/PC4（16.5% / 12.6%）继续补充 prompt length 与 diversity

然后用这些主成分预测 extrinsic student performance，作者得到：
- **$R^2 = 0.664$**
- **RMSE = 0.440$**

这意味着便宜的 intrinsic 指标，已经可以比较靠谱地预测后面昂贵的训练收益。

### SOTA 对照矩阵

| 方法 | 关注点 | 是否多语种系统评估 | 是否训学生验证 | 是否给出 recipe |
|---|---|---|---|---|
| 传统 synthetic data 论文 | 证明 synthetic data 有用 | 部分 | 部分 | 弱 |
| OpenDataArena 等 | 数据价值 | 部分 | 否/弱 | 弱 |
| 英文 teacher eval | teacher selection | 否 | 是 | 部分 |
| **本文** | teacher + language + method 联合评估 | **是** | **是** | **是** |

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐⭐⭐⭐ | seed datasets 多来自公开 multilingual instruction 数据集，可获得性较高 |
| 代码可得性 | ⭐⭐⭐⭐ | 论文声称开放 code/data/models，但真实可用性还要看 release 完整度 |
| 算力需求 | ⭐ | 240 个 student 微调不是个人开发者项目，明显偏实验室级 |
| 工程复杂度 | ⭐⭐⭐ | 单次复现不难，完整复现实验矩阵很重 |
| 预期收益 | ⭐⭐⭐⭐⭐ | 对所有做 multilingual distillation / synthetic data 的团队都很实用 |

**复现建议：**别傻复现全矩阵。最现实的路线是，先在你的目标语言上抽 3 到 5 个 candidate teachers，只算 intrinsic 指标做预筛，再对 top-2 真的训 student 验证。

## 批判性分析

### 局限性

论文自述局限主要有三类：
1. 只测了 6 个语言，虽然是类型学上有代表性，但远远不够覆盖全球低资源语言。
2. Translate 方法默认可以把英文 prompt 有意义地迁移到目标语言，这会带来 translationese 问题。
3. synthetic pipeline 会把 teacher 的偏见继续传给 student。

我们额外看到的约束有：
1. **任务分布仍偏传统 instruction/chat/math。** 对 agent、多轮工具使用、代码、RAG 类任务是否仍然成立，论文没有回答。
2. **teacher 评价仍依赖单一 student family 设置。** 尽管做了泛化实验，但主实验核心还是围绕 OLMo 3 7B，可能高估了某些 teacher 的跨体系稳定性。
3. **reward model 也是模型。** M-Prometheus 14B 虽强，但其多语种偏置会直接影响 intrinsic score。

### 改进方向

1. **把 agent/task-use benchmark 纳入 PG-Score。** 现实里企业更关心 workflow completion，而不只是 chat/math。
2. **增加 truly low-resource languages。** 现在最难的语言仍然只是“相对难”，还不是最边缘语言。
3. **加入成本维度。** 如果 Aya 32B 和 Gemma 27B 只比某个 12B 模型好一点，但推理成本高很多，teacher 选择结论就要重写。

### 独立观察

- 这篇论文对 Lighthouse 这类内容流水线也有启发，**真正高价值的不只是模型强不强，而是它产出的中间数据能不能稳定喂给后续系统**。
- “师生家族匹配”很像编译器世界里的 ABI/IR 兼容问题，本质不是玄学，而是表示空间更接近。
- 它也说明一件事，未来合成数据平台真正的 moat 不是“有个最大的 frontier API”，而是**有一套可验证的 teacher routing 与 dataset QA 体系**。

### 对领域的影响

短期看，这篇论文会直接改变很多多语种团队选 teacher 的默认动作，从“最大模型”改成“先做小规模 PG-Score 风格评估”。

中期看，它可能推动 synthetic data 工程从“模型中心”转向“数据质量中心”。如果 intrinsic 指标真的能较好预测下游收益，那么 teacher selection 会越来越像数据工程，而不是纯模型崇拜。

长期看，这类工作会逼着大家承认一个现实：**多语种 AI 的瓶颈往往不是没有更大的模型，而是没有更懂目标语言、也更会教的老师。**
