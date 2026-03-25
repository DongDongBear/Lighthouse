---
title: "Attention Residuals：Kimi 团队用注意力机制重新定义残差连接"
description: "Attention Residuals, AttnRes, 残差连接, PreNorm, 隐状态增长, Kimi, 线性注意力"
---

# Attention Residuals

> 原文链接：https://arxiv.org/abs/2603.15031
> 作者：Kimi Team — Guangyu Chen, Yu Zhang, Jianlin Su, Weixin Xu 等
> 机构：Moonshot AI (Kimi)
> 发布日期：2026-03-16

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 用 softmax 注意力替代 Transformer 的固定权重残差累加，让每层动态选择要聚合哪些前序层的输出 |
| 大白话版 | Transformer 里的残差连接就像把每层的"意见"等权重地叠加，越深的模型这些"意见"就被稀释得越厉害。AttnRes 让每层用注意力机制"选择性地听取"之前各层的意见，效果更好 |
| 核心数字 | • 在 Kimi Linear 架构上（48B 总参/3B 激活）预训练 1.4T token 验证 • Scaling law 实验确认改进在各模型规模上一致 • 梯度分布和输出幅度显著更均匀 |
| 评级 | B — 重要的架构改进，直指 LLM 深度扩展的基础问题 |
| 代码 | 暂未开源 |
| 关键词 | Attention Residuals, AttnRes, Block AttnRes, PreNorm, Residual Connection, Kimi Linear, 深度扩展 |

## 核心 Insight

现代 LLM 几乎都使用 PreNorm + 残差连接的标准配方。但这个看似无害的设计有一个隐含问题：**固定权重为 1 的残差累加导致隐状态随深度不可控增长，逐渐稀释每层的贡献。**

想象一下：如果你有 100 层，每层的输出都以等权重加到一起，那第 1 层的贡献在最终输出中只占 1/100。这不仅在信息论上是低效的，还会导致梯度分布不均匀。

AttnRes 的核心思路：用 **softmax 注意力** 替代固定的 "加 1" 残差，让每层通过学习到的、输入依赖的权重来选择性聚合之前各层的输出。

### 为什么这个想法 work？

1. **自适应深度选择**：不是所有前序层对当前层都同等重要。AttnRes 让模型学习"哪些层的表示对当前计算最有用"
2. **softmax 归一化**：权重和为 1，自动控制隐状态的幅度，避免无界增长
3. **内容依赖**：不同输入可以激活不同的跨层聚合模式，增加了模型的表达能力

## 方法详解

### 标准残差连接的问题

标准 PreNorm 残差：

$$h_l = h_{l-1} + F_l(\text{Norm}(h_{l-1}))$$

展开后：$h_L = h_0 + \sum_{l=1}^{L} F_l(\text{Norm}(h_{l-1}))$

问题：所有层输出以固定单位权重累加，$h_L$ 的幅度随 $L$ 不可控增长，每层的边际贡献 $F_l$ 相对于总和被逐渐稀释。

### AttnRes 设计

**Full AttnRes：** 每层不再直接加上一层的输出，而是对所有前序层的输出做注意力聚合：

$$h_l = \text{Attn}(q_l, [h_0, h_1, ..., h_{l-1}]) + F_l(\text{Norm}(\cdot))$$

其中 $q_l$ 是当前层的查询，注意力权重通过 softmax 归一化。

**Block AttnRes（实用版本）：** Full AttnRes 需要存储所有前序层的输出，内存和通信开销太大。Block AttnRes 将层分组为块，只在块级别做注意力：

- 块内：标准残差连接
- 块间：对各块的代表性输出做注意力聚合

配合 cache-based pipeline 通信和两阶段计算策略，Block AttnRes 成为标准残差连接的**即插即用替换**，额外开销极小。

### 训练策略

将 AttnRes 整合到 Kimi Linear 架构（48B 总参/3B 激活参数的线性注意力模型），在 1.4T token 上预训练。

## 实验结果

### Scaling Law 验证

Scaling law 实验确认：AttnRes 带来的改进在各模型规模上**一致存在**，不是小模型的特有现象。

### 主要效果

AttnRes 在 Kimi Linear 架构上的改进：
- **更均匀的输出幅度**：各层输出的 norm 分布更均匀，缓解了 PreNorm 稀释问题
- **更均匀的梯度分布**：梯度在深度方向上分布更均匀，有利于深层学习
- **所有评估任务上的一致提升**

### 消融实验

消融验证了**内容依赖的深度选择**（content-dependent depth-wise selection）是关键——固定权重的跨层聚合不如学习到的注意力权重有效。

## 批判性分析

### 局限性

1. **仅在 Kimi Linear 架构上验证**：论文未报告在标准 Transformer（如 LLaMA 架构）上的效果。线性注意力模型的特性可能放大了 PreNorm 稀释问题，使 AttnRes 的收益在标准 Transformer 上可能不同。

2. **缺少绝对性能数据**：论文是技术报告性质，scaling law 曲线说明了趋势，但缺少在标准基准上的绝对数字与其他方法的直接对比。

3. **计算开销未充分量化**：虽然声称 Block AttnRes 开销"极小"，但没有给出具体的训练/推理速度对比数据。

### 改进方向

1. **与其他深度信号路由方法结合**：如 LayerSkip、early exit 等——AttnRes 的注意力权重可以自然地指示哪些层可以跳过。
2. **在标准 Transformer 架构上验证**：最重要的后续工作。
3. **动态深度分配**：基于 AttnRes 的注意力模式，自适应地分配不同输入到不同的有效深度。

### 独立观察

1. **Jianlin Su 是 RoPE 的发明者**，他出现在作者列表中暗示这可能与位置编码有某种内在联系——层级间的"位置"类似于序列中的"位置"。

2. **与 DenseNet 的精神联系**：DenseNet（2017）也是让每层访问前序层的输出，但用的是拼接而非注意力。AttnRes 可以看作"attention-based dense connection"的 LLM 版本。

3. **对模型深度扩展的影响**：如果 AttnRes 确实解决了 PreNorm 稀释问题，它可能为训练更深的 LLM 打开大门——目前大多数模型的深度增长已经趋缓（宽度增长更多）。

4. **Kimi 团队的架构创新能力**：从 Kimi Linear（线性注意力）到 AttnRes（跨层注意力），Moonshot AI 在模型架构层面持续输出有价值的工作。
