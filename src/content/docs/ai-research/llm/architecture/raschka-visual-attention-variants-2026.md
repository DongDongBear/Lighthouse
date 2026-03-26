---
title: "Sebastian Raschka：现代 LLM 注意力变体可视化指南"
description: "MHA, GQA, MLA, 滑动窗口注意力, 稀疏注意力, 混合架构, LLM注意力机制演进"
---

# Sebastian Raschka：现代 LLM 注意力变体可视化指南

> 原文：[A Visual Guide to Attention Variants in Modern LLMs](https://magazine.sebastianraschka.com/p/visual-attention-variants)
> 作者：Sebastian Raschka
> 日期：2026-03-22 | Ahead of AI Newsletter

---

## 速查卡

| 项目 | 内容 |
|------|------|
| 一句话 | 系统梳理从 MHA 到 GQA、MLA、滑动窗口、稀疏注意力、混合架构的全部注意力变体 |
| 大白话 | 一篇图文并茂的"注意力机制进化史"，帮你理清 Llama、Qwen、DeepSeek、Gemma 等模型在注意力层面到底有什么不同 |
| 核心价值 | 教育性极强的参考资源，配合 45+ 架构的 LLM Architecture Gallery 使用 |
| 影响评级 | **B+** — 优秀的综述/教育资源，非原创研究但对理解现代 LLM 架构极有帮助 |

---

## 文章全貌

Raschka 此文从注意力机制的 RNN 时代起源讲起，逐步推进到现代 LLM 的各种注意力变体。文章附带大量手绘/精心设计的架构图，是其一贯的教育风格。

### 涵盖的注意力变体

**1. Multi-Head Attention (MHA)**
- 经典 Transformer 注意力：每个 head 拥有独立的 Q/K/V 投影
- 代表架构：GPT-2, OLMo 2 7B, OLMo 3 7B
- 优点：建模能力最强；缺点：KV cache 随 head 数线性增长

**2. Grouped-Query Attention (GQA)**
- 多个 query head 共享同一组 K/V 投影
- 代表架构：Llama 3 8B, Qwen3 4B, Gemma 3 27B, Mistral Small 3.1 24B, SmolLM3 3B
- MoE 变体：Llama 4 Maverick, Qwen3 235B-A22B, Step 3.5 Flash 196B
- Raschka 评价：GQA 已成为 MHA 的"事实标准替代品"——在 KV cache 成本和建模质量之间取得了最佳实用平衡

**3. Multi-Head Latent Attention (MLA)**
- DeepSeek 系列的核心创新：将 K/V 压缩到低秩隐空间
- 代表架构：DeepSeek V3, DeepSeek R1
- 比 GQA 更激进的压缩，但实现复杂度更高

**4. Sliding Window Attention (SWA)**
- 每个 token 只看固定大小的局部窗口
- 通常与全局注意力层交替使用（如 Gemma 3 的混合策略）
- 关键优势：推理时 KV cache 大小固定，不随序列长度增长

**5. 稀疏注意力变体**
- 包括 Block Sparse Attention、Hash-based Sparse Attention 等
- 部分层用稀疏注意力处理长距离依赖，其余用全密集或滑动窗口

**6. 混合架构**
- Transformer + SSM（状态空间模型）混合，如 Jamba
- 不同层使用不同注意力策略的异构设计

### 关键洞察

1. **GQA 是当前的"甜蜜点"**：绝大多数 2025-2026 年的开源模型都采用 GQA，从密集模型到 MoE 模型。它的实现简单性和推理效率优势使其成为默认选择。

2. **MLA 是更激进的未来方向**：DeepSeek 的 MLA 在压缩比上远超 GQA，但其特殊的投影结构需要定制的推理优化，生态适配成本更高。

3. **混合策略正在成为主流**：Gemma 3 等模型不是全局统一使用一种注意力，而是在不同层混合使用滑动窗口 + 全局注意力。这种"按层定制"的思路可能是未来的标准做法。

4. **注意力设计的核心权衡是 KV cache**：所有变体归根结底都在优化同一个问题——如何在不损失太多建模质量的前提下减小 KV cache 的内存占用和带宽需求。

---

## 配套资源

- **LLM Architecture Gallery**: [sebastianraschka.com/llm-architecture-gallery/](https://sebastianraschka.com/llm-architecture-gallery/) — 45+ 架构的可视化模型卡
- **海报版本**: 通过 Redbubble 提供打印版
- **自注意力详解**: [Understanding and Coding Self-Attention](https://magazine.sebastianraschka.com/p/understanding-and-coding-self-attention)
- **KV Cache 编码详解**: [Coding the KV Cache in LLMs](https://magazine.sebastianraschka.com/p/coding-the-kv-cache-in-llms)

---

## 评价

Raschka 作为 AI 教育领域最顶级的内容创作者之一，这篇文章延续了他一贯的高质量标准。对于以下读者特别推荐：

- 需要快速理解不同 LLM 架构差异的工程师
- 准备面试需要系统梳理注意力变体的候选人
- 需要选型参考的模型团队（GQA vs MLA vs 混合策略）

建议配合 Architecture Gallery 一起使用——先看 Gallery 了解各模型的宏观架构差异，再回到本文深入理解注意力层面的细节。

---

> 📅 2026-03-25 | Lighthouse AI Research
