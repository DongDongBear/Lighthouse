---
title: "Attention Residuals：用深度方向注意力替代固定残差累加"
description: "Attention Residuals, Kimi Linear, Moonshot AI, PreNorm 稀释, Block AttnRes, Scaling Law, MoE, 残差连接, 深度方向注意力"
---

# Attention Residuals

> 原文链接：https://arxiv.org/abs/2603.15031
> 作者：Kimi Team / Moonshot AI（Guangyu Chen, Yu Zhang, Jianlin Su, Weixin Xu, Siyuan Pan, Yaoyu Wang, Yucheng Wang 等 35+ 人）
> 机构：Moonshot AI（月之暗面）
> 发布日期：2026-03-16
> 代码：https://github.com/MoonshotAI/Attention-Residuals

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 用 softmax 注意力替代固定权重的残差连接，让每层通过学习到的、输入依赖的权重选择性聚合之前各层的输出，以解决 PreNorm 下隐藏状态 O(L) 增长的问题 |
| 大白话版 | 传统 Transformer 的残差连接就像把所有层的输出无差别地堆在一起，越深的层看到的"噪音"越多。AttnRes 给每层一个"偏好向量"，让它可以从之前的层中挑选真正需要的信息——需要谁就多看谁，不需要的就忽略 |
| 核心数字 | Block AttnRes 等效于 1.25x 计算量提升；48B/3B MoE 模型 GPQA-Diamond +7.5, Math +3.6, HumanEval +3.1；训练开销 <4%，推理延迟 <2% |
| 评级 | A -- 对 Transformer 最后一个未被改进的核心组件的优雅改进，理论分析深刻（结构化矩阵视角），工程实现极简（每层仅增加一个 pseudo-query 向量 + 一个 RMSNorm），大规模验证充分 |
| 代码 | https://github.com/MoonshotAI/Attention-Residuals（开源） |
| 关键词 | Residual Connection, Depth-wise Attention, PreNorm Dilution, Scaling Law, Block AttnRes, MoE, Semiseparable Matrix |

## 核心 Insight

残差连接自 2015 年 ResNet 以来，更新规则 $h_{l+1} = h_l + f_l(h_l)$ 几乎从未被根本性改变。Kimi 团队的关键洞察是将残差展开后审视其结构：

$$h_l = h_0 + \sum_{i=0}^{l-1} f_i(h_i)$$

每一层接收的是之前**所有层输出的均匀加权求和**，权重固定为 1。这产生了三个根本性问题：

**1. 幅值不可控增长。** 在 PreNorm（当前主流范式）下，隐藏状态的幅值随深度以 $O(L)$ 增长。每个新层的贡献相对于累积状态的比例越来越小——深层的"声音"被淹没在越来越响的"背景噪音"中。

**2. 无选择性访问。** 不同类型的层（注意力层 vs MLP 层）以及不同功能的层（语法层 vs 语义层 vs 推理层）接收到完全相同的混合状态。没有机制让某一层选择性地放大或抑制来自特定前置层的信息。

**3. 深度-时间对偶。** 论文揭示了一个深刻的类比：残差连接在"深度"维度上扮演的角色，与 RNN 在"时间"维度上扮演的角色完全一致——都是通过固定递推将历史压缩为单一向量。在序列建模中，Transformer 用注意力机制替代了 RNN；**AttnRes 在深度维度上做了完全相同的事情**。

### 结构化矩阵视角

论文给出了一个统一框架：所有残差变体都可以表示为深度混合矩阵 $M \in \mathbb{R}^{L \times L}$：

- **标准残差** = 深度方向线性注意力（固定、输入无关），$M$ 是全 1 的下三角矩阵
- **DenseFormer 等变体** = 可学习但输入无关的混合系数
- **AttnRes** = 深度方向 softmax 注意力（学习的、输入依赖的），$M$ 的每一行由 softmax 归一化

Semiseparable rank 提供了比较这些变体表达能力的统一度量。标准残差的 semiseparable rank 为 1（最受限），而 AttnRes 可以表达任意深度混合模式。

这完成了与序列维度相同的"线性注意力 -> softmax 注意力"的转换。

## 方法详解

### Full Attention Residuals

核心公式：

$$h_l = \sum_{i=0}^{l-1} \alpha_{i \to l} \cdot v_i$$

其中注意力权重定义为：

$$\alpha_{i \to l} = \frac{\exp(w_l^\top \cdot \text{RMSNorm}(v_i))}{\sum_{j=0}^{l-1} \exp(w_l^\top \cdot \text{RMSNorm}(v_j))}$$

各组件的角色：

- **$w_l \in \mathbb{R}^d$**：第 $l$ 层的 pseudo-query 向量，每层一个可学习参数向量。这是唯一新增的参数——每层仅增加 $d$ 个参数
- **$v_i$**：前置层的输出，同时充当 key 和 value（$v_0 = h_0$ 为 token embedding，$v_i = f_i(h_i)$ 为第 $i$ 层的输出）
- **RMSNorm**：无参数的 key 归一化。防止输出幅值大的层在 softmax 中占据主导地位。这一点至关重要——没有 RMSNorm，深层累积的大幅值表示会使 softmax 退化

**关键初始化策略：** 所有 pseudo-query 向量 $w_l$ 初始化为**零向量**。此时 $w_l^\top \cdot \text{RMSNorm}(v_i) = 0$ 对所有 $i$ 成立，softmax 输出为均匀分布 $\alpha_{i \to l} = 1/l$。这意味着**在初始化时刻，AttnRes 等价于标准残差连接的归一化版本**——训练从一个已知良好的起点开始，然后逐步学习到选择性的深度混合模式。

**开销分析：**
- 计算：每个 token 需要 $O(L^2 d)$，但因为深度 $L$（通常 50-100）远小于序列长度（数千到数万），实际开销微乎其微
- 内存：在标准训练（无激活重计算）中，各层输出本来就要为反向传播保存，所以无额外内存开销
- 参数：每层仅增加一个 $d$ 维向量 + 一个无参数 RMSNorm，相对于 Transformer 层的参数量完全可以忽略

### Block Attention Residuals（工程核心）

Full AttnRes 在大规模分布式训练（流水线并行 + 激活重计算）下面临实际问题：需要将所有 $L$ 个层输出跨流水线阶段传输和缓存，通信量 $O(Ld)$ 不可接受。

Block AttnRes 的解决方案：

**步骤 1：分块。** 将 $L$ 层分成 $N$ 个块，每块 $S$ 层。Block 边界设置在每 $(S/2)$ 层处。

**步骤 2：块内标准残差。** 在每个块内部使用传统的残差累加，将块内所有层输出求和为一个块级表示：

$$b_n = \sum_{j \in B_n} f_j(h_j)$$

**步骤 3：块间 softmax 注意力。** 对 $N$ 个块表示（加上 token embedding）应用 softmax 注意力，与 Full AttnRes 公式相同，但 key/value 变为块级表示。

PyTorch 伪代码：

```python
V = torch.stack(blocks + [partial_block])  # [N+1, B, T, D]
K = RMSNorm(V)
logits = einsum('d, n b t d -> n b t', proj.weight, K)
h = einsum('n b t, n b t d -> b t d', softmax(logits, dim=0), V)
```

**内存与通信：** 从 $O(Ld)$ 降至 $O(Nd)$。以 Kimi Linear 为例，54 层分为 9 个块，通信量减少约 6 倍。

### Kimi Linear 模型架构

AttnRes 在以下架构上验证：

| 组件 | 配置 |
|---|---|
| 总参数 | 48B |
| 激活参数 | 3B（MoE） |
| Transformer 块数 | 27 块 = 54 层（每块含 attention + MLP 子层） |
| Attention 类型 | KDA 与 MLA 交替，比例 3:1 |
| MoE 配置 | 8/256 routed experts + 1 shared expert per MoE layer |
| Block AttnRes | 6 层/块，共 9 个块 |
| AttnRes 参数开销 | 每层一个 RMSNorm + 一个 pseudo-query 向量（可忽略） |

### 训练配置

| 阶段 | 数据量 |
|---|---|
| WSD 预训练 | 1T tokens |
| Mid-training annealing（高质量数据） | ~400B tokens |
| 总计 | 1.4T tokens |
| 最大序列长度 | 32K |
| 训练开销 | <4%（流水线并行下） |
| 推理延迟开销 | <2% |

### 工程优化细节

**跨阶段缓存（Cross-stage Caching）：** 流水线并行中，每个物理阶段处理多个虚拟阶段。缓存策略让已接收的块表示在后续虚拟阶段中被复用，通信开销从 $O(C^2)$ 降至 $O(P^2)$（$V$ 倍改进，$V$ 为虚拟阶段数）。

**两阶段推理（Two-phase Computation）：** 利用 pseudo-query $w_l$ 与层计算解耦的特性：
- Phase 1：批量计算一个块内所有层的块间注意力（可并行化）
- Phase 2：顺序计算块内注意力，通过 Online Softmax 合并两个阶段的结果

## 实验结果

### Scaling Law 实验

在 5 个模型规模（194M 到 528M 激活参数）上拟合 scaling law：

| 方法 | Scaling Law 拟合公式 | 5.6 PFLOP/s-days 处的 Loss |
|---|---|---|
| Baseline (PreNorm) | $L = 1.891 \times C^{-0.057}$ | 1.714 |
| Block AttnRes | $L = 1.870 \times C^{-0.058}$ | 1.692 |

两个关键数字：

- **Loss 差距：** 1.714 vs 1.692，差 0.022。在 scaling law 的尺度上这是一个非常显著的差距
- **等效计算倍数：1.25x。** Baseline 需要额外 25% 的计算量才能达到 Block AttnRes 的同等 loss。这意味着 AttnRes 提供了一个近乎"免费午餐"级别的收益——以 <4% 的训练开销换取 25% 的等效计算量提升

Block AttnRes 的 scaling 指数（-0.058）略优于 baseline（-0.057），意味着随着计算规模增大，优势会进一步扩大。

### 48B 模型主实验

在 Kimi Linear（48B/3B MoE）上，使用 1.4T tokens 预训练后的评测结果：

| 类别 | 基准测试 | Baseline | AttnRes | 提升 |
|---|---|---|---|---|
| 通用 | MMLU | 73.5 | 74.6 | +1.1 |
| 通用/推理 | GPQA-Diamond | 36.9 | **44.4** | **+7.5** |
| 通用/推理 | BBH | 76.3 | 78.0 | +1.7 |
| 知识 | TriviaQA | 69.9 | 71.8 | +1.9 |
| 数学 | Math | 53.5 | **57.1** | **+3.6** |
| 代码 | HumanEval | 59.1 | **62.2** | **+3.1** |
| 代码 | MBPP | 72.0 | 73.9 | +1.9 |
| 中文 | CMMLU | 82.0 | 82.9 | +0.9 |
| 中文 | C-Eval | 79.6 | **82.5** | **+2.9** |

**结果分析：**

1. **全面提升，无一退步。** 9 个基准测试中全部正向。这对于一个架构级改动来说很难得——通常总会在某些任务上有回退
2. **多步推理任务收益最大。** GPQA-Diamond（+7.5）、Math（+3.6）、HumanEval（+3.1）是提升最显著的三个基准。这些任务都需要多步逻辑链条，与"改进深度方向信息流有利于组合式推理"的假设高度一致
3. **知识型任务也有稳定提升。** MMLU（+1.1）、TriviaQA（+1.9）、CMMLU（+0.9）表明 AttnRes 不仅改善推理能力，对知识提取也有帮助
4. **中文基准提升明显。** C-Eval +2.9 超过了多数英文基准的提升幅度

### 消融实验

论文的消融实验非常全面，逐一验证了每个设计决策的必要性：

| 变体 | Val Loss | 与 Full AttnRes 的差距 | 说明 |
|---|---|---|---|
| Full AttnRes | 1.737 | -- | 完整方法 |
| + 输入依赖 query | 1.731 | -0.006 | 更好但需要额外 $d \times d$ 投影矩阵 |
| 输入无关混合（去掉 query/key） | 1.749 | +0.012 | 输入依赖性是关键 |
| 用 sigmoid 替换 softmax | 1.741 | +0.004 | softmax 的竞争性归一化更优 |
| 去掉 RMSNorm | 1.743 | +0.006 | RMSNorm 防止大幅值层主导 |
| 多头注意力（H=16） | 1.752 | +0.015 | 单头比多头好——深度方向最优混合跨通道一致 |
| Block AttnRes (S=4) | 1.746 | +0.009 | 绝大部分收益保留 |
| DenseFormer | 1.767 | +0.030 | 固定系数远不够 |
| mHC | 1.747 | +0.010 | AttnRes 以更少 I/O 达到更好效果 |
| Baseline (PreNorm) | 1.766 | +0.029 | 基线 |

**关键发现逐项解析：**

**1. 输入依赖权重是核心。** 从固定系数（DenseFormer, 1.767）到可学习但输入无关的系数（mHC, 1.747），再到输入依赖的 softmax 注意力（AttnRes, 1.737），每一步都带来了显著的 loss 下降。这证明了"让每个 token 自主决定如何在深度方向聚合信息"是 AttnRes 成功的根本原因。

**2. 单头优于多头。** 深度方向 16 头注意力（1.752）反而不如单头（1.737）。直觉上这意味着：当一个层的输出对当前计算有用时，它的所有通道都有用——不存在"一部分通道有用、另一部分无用"的情况。这也解释了为什么每层只需一个标量 pseudo-query 就够了。

**3. softmax 优于 sigmoid。** sigmoid（1.741）虽然也是非线性门控，但缺少 softmax 的竞争性归一化——各层权重不需要"争抢"注意力份额。softmax 的"零和博弈"特性迫使模型做出更清晰的选择。

**4. RMSNorm 不可或缺。** 去掉 RMSNorm（1.743）导致显著退化。在 Block AttnRes 中尤其关键，因为块级表示是多层输出的累加，幅值差异比单层输出更大。

**5. Block 大小优雅退化。** $S = 2, 4, 8$ 的效果都接近 Full AttnRes。$N \approx 8$ 个块就能恢复几乎全部收益。更粗的分块逐渐趋近 baseline，但退化是平滑的。

### 最优架构分析

在固定计算量和参数量下的 25 种架构配置搜索中：

- **Baseline 最优点：** $d_{\text{model}} / L_b \approx 60$（更宽更浅）
- **AttnRes 最优点：** $d_{\text{model}} / L_b \approx 45$（更窄更深）

这意味着 AttnRes 能更有效地利用深度。当深度方向的信息流被改善后，增加深度的边际收益变大了——模型可以通过更多层的组合式计算来换取更好的结果，而不必依赖更宽的单层表示。

### 梯度分布改善

AttnRes 对训练动态的改善：

- **输出幅值有界：** 标准残差下隐藏状态幅值随深度 $O(L)$ 增长，AttnRes 通过 softmax 归一化使其有界
- **梯度范数更均匀：** 各层梯度范数的方差显著减小，深层和浅层的更新速度更一致
- **缓解 PreNorm 稀释：** PreNorm 下深层贡献被稀释的问题被直接解决
- **深层稳定性：** 即使在数百层的深度下也能保持训练稳定

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | 3/5 | 论文使用内部训练数据（1.4T tokens），但方法对数据分布不敏感，可用 RedPajama / Pile 等公开数据集验证核心 scaling law |
| 代码可得性 | 5/5 | GitHub 开源，论文 Figure 2 的 PyTorch 伪代码可直接使用。Block AttnRes 的实现不到 20 行代码 |
| 算力需求 | 2/5 | 完整复现 48B 模型需要大量 GPU。但 scaling law 实验（194M-528M）在单机 8 卡上可完成 |
| 工程复杂度 | 4/5 | Block AttnRes 是 drop-in replacement，集成到现有训练框架的复杂度很低。主要注意点：pseudo-query 零初始化、Block 边界位置、流水线并行下的通信优化 |
| 预期收益 | 5/5 | 1.25x 等效计算量提升，<4% 训练开销，<2% 推理延迟——成本收益比极高 |

**复现建议：**
1. 从 scaling law 实验开始——在 200M-500M 规模上验证 loss 趋势，不需要大算力
2. pseudo-query 必须零初始化，这是训练稳定性的关键
3. Block 大小设置为 6-8 层/块，$N \approx 8$ 块即可
4. 如果不需要流水线并行，Full AttnRes 实现更简单且效果等价

## 批判性分析

### 局限性

论文自述的局限：
1. 48B 模型仅训练了 1.4T tokens——与当前主流的 10T+ 训练量相比仍是早期。在更长训练下 AttnRes 的优势是否持续、扩大还是收窄，需要进一步验证
2. 最优架构搜索在固定计算预算下进行，不同预算下的结论可能不同

额外发现的问题：

**1. 超长上下文场景未验证。** 论文训练到 32K 序列长度，但未在 128K+ 的超长上下文下系统评测。Block 表示在 prefill 阶段占用 $N \cdot T \cdot d$ 的内存，当 $T$ 极大时（如 1M context），这可能成为新的瓶颈。

**2. 与其他架构创新的交互效果未知。** 论文仅在 Kimi Linear（MoE + KDA/MLA 混合）上验证。AttnRes 与 State Space Models（Mamba 等）、线性注意力、Mixture of Depths 等其他架构创新的交互效果完全未知。理论上 AttnRes 应该与任何使用残差连接的架构兼容，但实际效果需要验证。

**3. 训练稳定性的边界条件。** 论文强调 pseudo-query 必须零初始化以保证训练稳定性，但没有深入分析为什么其他初始化策略会失败。在更大规模（100B+ dense model）、更深网络（200+ 层）、或特殊训练策略（如极大学习率的 WSD 训练）下，是否还有其他稳定性隐患？

**4. Post-training 阶段的影响未验证。** AttnRes 只在预训练中验证。它对 SFT、RLHF、DPO 等后训练阶段的影响完全未知。深度方向的注意力权重在后训练中是否会被大幅修改？如果后训练改变了层间信息流模式，是否会导致预训练中学到的深度混合模式失效？

### 与外部分析的交叉验证

Ziming Liu 的独立分析提供了一个有价值的补充视角：

- **结构化任务表现优异：** AttnRes 在需要选择性层跳跃的结构化任务上表现突出——这与"深度方向注意力让模型学会跳过不相关的层"的假设一致
- **记忆任务收益有限：** 对于纯粹的知识记忆任务，AttnRes 的帮助较少——这也符合直觉，因为记忆主要依赖参数量而非计算路径
- **稳定性-表达力权衡：** softmax 归一化在提供稳定性的同时也引入了约束（权重和为 1），在某些场景下可能限制表达力

### 改进方向

**1. 自适应 Block 大小。** 当前 Block 大小是固定超参数。不同深度区域可能需要不同粒度的跨层访问——浅层可能需要更细粒度（因为功能分化更细），深层可能需要更粗粒度（因为信息已经被充分整合）。可以通过可学习的 Block 边界位置来实现自适应。

**2. 输入依赖 query 的高效实现。** 消融实验显示输入依赖 query（loss 1.731）比固定 pseudo-query（loss 1.737）更好，但需要额外的 $d \times d$ 投影矩阵。是否可以用低秩投影（$d \times r \times d$, $r \ll d$）来逼近输入依赖 query，在不显著增加参数的情况下获得更好的效果？

**3. 推广到更多"固定累加"场景。** 论文揭示的深度-时间对偶可能在更多场景中适用：
- MoE 中的专家输出聚合（当前也是简单的 top-k 加权求和）
- 多模态融合中的模态混合
- Ensemble 方法中的模型输出聚合

### 独立观察

**对 Transformer 架构演进的定位。** 如果将 Transformer 的核心组件列举出来——位置编码（RoPE）、注意力效率（GQA/MLA）、前馈网络（MoE）、归一化（RMSNorm）——残差连接是唯一一个自 2015 年以来几乎未被改进的组件。AttnRes 填补了这个空白。如果社区广泛验证了其收益，它可能成为未来 LLM 的标准配置。

**对模型理解的启示。** AttnRes 学到的注意力权重模式（论文 Figure 8）展示了强烈的对角主导（局部性）+ 选择性跳跃连接 + 持续的 embedding 权重。这意味着模型确实在深度方向上需要非均匀的信息访问模式，而传统的均匀残差累加是一种浪费。这也暗示传统的逐层剪枝（layer pruning）可能会丢失重要的跨层信息路径。

**参数效率极高。** 每层仅增加一个 $d$ 维向量（pseudo-query）和一个无参数 RMSNorm。对于 $d = 4096$ 的模型，每层增加 16KB 参数。54 层总共增加不到 1MB——相对于 48B 的总参数量，增加比例为 $2 \times 10^{-5}$。这可能是 Transformer 架构改进中参数效率最高的方法之一。
