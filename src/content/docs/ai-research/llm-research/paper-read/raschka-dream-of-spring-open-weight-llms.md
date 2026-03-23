---
title: "深度解读 | 2026年春季开源LLM架构全景：10个模型的技术演化"
description: "Sebastian Raschka 开源LLM架构对比 Trinity Large Kimi K2.5 GLM-5 Qwen3.5 MiniMax M2.5 Gated DeltaNet MoE MLA 滑动窗口注意力"
---

# 深度解读 — 2026年春季开源LLM架构全景

原文：[A Dream of Spring for Open-Weight LLMs: 10 Architectures from Jan-Feb 2026](https://magazine.sebastianraschka.com/p/a-dream-of-spring-for-open-weight)
作者：Sebastian Raschka | 发表于 2026-02-25（含后续更新至 Mar 6）

---

## 速查卡

| 维度 | 内容 |
|------|------|
| 一句话总结 | 对 2026 年 1-2 月发布的 10 个主流开源 LLM 进行架构级别的横向对比，揭示当前开源模型的技术趋势 |
| 大白话版 | 最近两个月冒出了一大堆开源大模型，Raschka 把它们的"骨架"拆开来一个个比较，告诉你谁抄了谁的作业、谁做了创新 |
| 覆盖模型 | Trinity Large 400B, Kimi K2.5 1T, Step 3.5 Flash 196B, Qwen3-Coder-Next 80B, GLM-5 744B, MiniMax M2.5 230B, Nanbeige 4.1 3B, Qwen3.5 397B, Ling 2.5 1T, Tiny Aya 3.35B, Sarvam 30B/105B |
| 重要性 | A（必读） — 这是目前最全面、最技术化的开源 LLM 架构横评 |

---

## 核心洞察

Raschka 通过逐一拆解每个模型的架构图，揭示了 2026 年初开源 LLM 的几个重大趋势：

**1. DeepSeek 架构成为事实标准**

几乎所有大模型都在不同程度上借鉴了 DeepSeek V3 的设计：
- **MoE（混合专家）**：大量小专家 + 共享专家的模式被广泛采用（Trinity、Kimi K2.5、GLM-5、Step 3.5 Flash、Qwen3.5）
- **MLA（多头潜在注意力）**：从 DeepSeek V2 引入，现在被 GLM-5、Ling 2.5、Sarvam 105B 采用，用于压缩 KV cache
- **DeepSeek 稀疏注意力**：GLM-5 直接采用

**2. 混合注意力机制崛起**

纯 Transformer 注意力不再是唯一选择。Qwen3.5 和 Qwen3-Next 系列采用 **Gated DeltaNet + Gated Attention** 混合架构（3:1 比例），Ling 2.5 采用 **Lightning Attention**（线性注意力）。这些机制的核心目的：降低长上下文推理的内存消耗，使序列长度从 O(n²) 降到接近线性。

DeltaNet 可以理解为 Mamba 的替代方案——两者都属于"线性时间、无缓存"家族，但实现路径不同：Mamba 用状态空间滤波器，DeltaNet 用快速权重记忆更新。

**3. 滑动窗口注意力（SWA）成为标配**

Trinity Large、Step 3.5 Flash 等模型采用交替的 local:global 注意力层。典型配比是 3:1 到 5:1（local:global），滑动窗口大小 4096。核心收益：将每层注意力成本从 O(n²) 降到 O(n·t)，适合长上下文场景。

**4. 小模型赛道竞争白热化**

Nanbeige 4.1 3B、Tiny Aya 3.35B 在 3B 参数量级展开竞争。Tiny Aya 的亮点是并行 Transformer 块（attention 和 MLP 并行计算再合并到残差），这种设计减少了层内串行依赖，提高计算吞吐。

---

## 关键技术细节

### Gated Attention（门控注意力）

Trinity Large 和 Qwen3-Next 都在标准 scaled dot-product attention 之后加了一个 sigmoid 门控：

```
output = sigmoid(gate) * attention_output
```

作用：减少 attention sink（注意力集中在无意义 token 上的现象），改善长序列泛化，同时增强训练稳定性。

### Multi-Token Prediction (MTP)

Step 3.5 Flash 是个值得注意的案例——它使用 MTP-3（同时预测未来 3 个 token），**不仅在训练中使用，还在推理中使用**（多数模型只在训练时用 MTP）。结果：196B 参数的模型在建模性能上超过了 671B 的 DeepSeek V3.2，推理速度 100 tokens/sec vs 33 tokens/sec。

### 深度缩放 RMSNorm

Trinity Large 的第二个 RMSNorm 的增益初始化为 `1 / sqrt(L)`（L 为总层数），训练早期残差更新幅度小，随训练逐渐增大。这是一种简洁的训练稳定性技巧。

---

## 架构演化趋势总结

| 技术组件 | 采用情况 |
|----------|----------|
| MoE（混合专家） | Trinity, Kimi K2.5, Step 3.5, Qwen3-Next, GLM-5, Qwen3.5 |
| MLA（多头潜在注意力） | GLM-5, Ling 2.5, Sarvam 105B |
| Gated DeltaNet | Qwen3-Next, Qwen3.5 |
| 滑动窗口注意力 | Trinity, Step 3.5 Flash |
| Gated Attention | Trinity, Qwen3-Next, Step 3.5 Flash |
| Multi-Token Prediction | Step 3.5 Flash (MTP-3), GLM-4.7 |
| QK-Norm | Trinity, Qwen3-Next（Tiny Aya 反而去掉了） |
| 并行 Transformer 块 | Tiny Aya |
| 经典 GQA（无其他优化） | MiniMax M2.5, Nanbeige 4.1 |

---

## 模型性能速览

文章中提到的几个关键对比：

- **GLM-5** (744B) 在多数基准上略胜 **Kimi K2.5** (1T)，尽管参数量少 26%
- **Step 3.5 Flash** (196B) 超过 **DeepSeek V3.2** (671B)，同时推理速度快 3x
- **Qwen3-Coder-Next** (80B, 3B 活跃) 编程能力接近 Claude Sonnet 4.5
- **MiniMax M2.5** (230B) 在 OpenRouter 上使用量远超 GLM-5 和 Kimi K2.5——性价比是关键
- **Sarvam 105B** 在 agentic reasoning (Tau2) 上甚至超过 DeepSeek R1 0528

---

## 批判性分析

**文章优势：**
- 目前最全面的开源 LLM 架构横评，每个模型都有手绘架构对比图
- 清晰的技术层次：不是简单罗列参数，而是真正解释每个架构选择的原因
- 交叉引用做得好，读者可以追踪到每个技术概念的详细解释

**值得注意的局限：**
- 基准测试主要来自各团队自报数据，缺少统一的独立评测（幻觉排行榜是个好的补充，但只有 GLM-5 的数据）
- 文章主要关注架构差异，对训练数据和训练流程（Raschka 自己也承认这才是性能差异的主因）几乎没有讨论
- SWE-Bench Verified 已经出现饱和问题（OpenAI 专门写了文章说明），但文中仍大量使用该基准做比较
- 缺少推理成本的系统性对比——不同模型在相同硬件上的实际 cost/token 是实际部署时更关心的

**独立观察：**

开源 LLM 的架构创新周期已经从"年"缩短到"月"。Qwen 团队的路线很能说明问题：Qwen3-Next 作为实验性分支引入 Gated DeltaNet，仅几个月后就并入主线 Qwen3.5。这种快速迭代意味着，对于想部署开源模型的团队来说，架构选型的窗口期正在急剧缩短。

---

## 延伸阅读

- Raschka 的完整 [LLM Architecture Gallery](https://sebastianraschka.com/llm-architecture-gallery/) — 所有模型架构图和 fact sheet 的集中展示
- [The Big LLM Architecture Comparison](https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison) — 前作，覆盖更早期的模型
- [Beyond Standard LLMs](https://magazine.sebastianraschka.com/p/beyond-standard-llms) — Gated DeltaNet 和 Qwen3-Next 的详细解释
- [From DeepSeek V3 to V3.2](https://magazine.sebastianraschka.com/p/technical-deepseek) — DeepSeek 稀疏注意力的技术细节
