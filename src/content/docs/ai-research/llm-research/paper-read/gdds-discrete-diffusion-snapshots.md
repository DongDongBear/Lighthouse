---
title: "GDDS：离散扩散首次在大规模任务上击败自回归模型"
description: "Generalized Discrete Diffusion from Snapshots, 离散扩散, dLLM, snapshot ELBO, 语义感知噪声, 自回归替代"
---

# GDDS：离散扩散首次在大规模任务上击败自回归模型

> 论文：[Generalized Discrete Diffusion from Snapshots](https://arxiv.org/abs/2603.21342)
> 作者：Oussama Zekri, Théo Uscidda, Nicolas Boullé, Anna Korba
> 日期：2026-03-22 | 投稿 ICML 2026

---

## 速查卡

| 项目 | 内容 |
|------|------|
| 一句话 | 统一框架支持任意离散扩散噪声过程，首次在大词汇表生成任务上击败自回归模型 |
| 大白话 | 以前离散扩散只能用简单的 mask 或 uniform 噪声，GDDS 让你用任何噪声（包括语义感知的），而且训练时只需要看"快照"而不是完整路径，又快又好 |
| 核心数字 | Text8 BPC 1.01（SOTA），OpenWebText PPL 超越 AR 基线，零样本迁移 PPL 全面最低 |
| 评级 | **A** — 理论优雅 + 实验扎实 + 突破性结果（首次超越 AR） |

---

## 核心 Insight：为什么这个想法 work

### 问题诊断

现有离散扩散（dLLM）有两个瓶颈：

1. **噪声过程太简单**：只有 mask（吸收态）和 uniform（均匀替换）两种选择。这些噪声对离散空间的语义结构完全无感——把 "cat" 变成 "dog" 和变成 "quantum" 的代价一样。
2. **逆过程参数化太受限**：mean parametrization 将去噪不确定性紧紧绑定在特定逆过程动力学上，超出 uniform/mask 噪声后变得越来越不灵活。

### GDDS 的三板斧

**1. 广义插值离散扩散（Generalized Interpolating Discrete Diffusion）**

GDDS 将前向噪声过程统一为：

$$K_t = \alpha_t I_m + (1 - \alpha_t) \Pi_t$$

其中 $\alpha_t$ 是从 1 衰减到 0 的混合率，$\Pi_t$ 是时间相关的列随机混合矩阵。当 $\Pi_t = \frac{1}{m}\mathbf{1}\mathbf{1}^\top$ 时退化为 uniform diffusion，当 $\Pi_t = \delta_{\text{[MASK]}}\mathbf{1}^\top$ 时退化为 masked diffusion。但 $\Pi_t$ 可以是**任意**列随机矩阵——比如基于词嵌入语义相似度的高斯核。

**直觉：** 想象你在模糊一幅画。Uniform 噪声是随机涂鸦，mask 噪声是用橡皮擦擦掉。而 GDDS 的语义感知噪声（Semantic-Informed Kernel, SIK）是把蓝色慢慢变成青色再变成绿色——按照颜色的语义邻近关系来模糊。逆过程因此有了更好的"线索"来恢复原始内容。

**2. 通过均匀化（Uniformization）实现高效前向噪声**

对于任意率矩阵 $Q_t$，直接计算矩阵指数在大词汇表（50K+）上不可行。GDDS 利用连续时间马尔可夫链的均匀化技巧：将连续时间过程转化为泊松时钟触发的离散跳跃序列，只需要**列访问**率矩阵，复杂度从 $O(m^2)$ 降到 $O(m \cdot k)$（$k$ 为泊松跳跃次数）。

**数值例子：** GPT-2 词汇表 $m = 50,257$。存储稠密 $F$ 矩阵需要 $2.5 \times 10^9$ 参数（~20GB）。GDDS 通过均匀化只需 $O(m)$ 的列访问，将前向噪声的计算成本降低了 4-5 个数量级。

**3. Snapshot ELBO：不看路径，只看快照**

传统离散扩散的路径式（path-wise）ELBO 需要追踪完整的噪声轨迹，计算开销大且方差高。GDDS 提出 snapshot ELBO：

$$\mathcal{L}_{\text{snapshot}} = \mathbb{E}_{t, x_0, x_t} \left[ -\log p_\theta(x_0 | x_t, t) \right]$$

只需采样一个时间点 $t$，得到噪声快照 $(x_t, t)$，然后让模型直接预测原始 token $x_0$。

**为什么这足够了？** 论文证明了 snapshot ELBO 可以分解为信息项（information term）和校准项（calibration term），前者衡量模型的去噪能力，后者衡量预测置信度的校准程度。关键定理表明，snapshot ELBO 的最优解与 path-wise ELBO 的最优解一致——用更简单的目标就能达到同等效果。

---

## 技术细节

### Semantic-Informed Kernel (SIK)

这是 GDDS 最具创新性的实际应用。SIK 使用预训练词嵌入（如 GPT-2 embeddings）构建语义感知的跳跃核：

$$F_{\text{Gauss}}(i, j) \propto \exp\left(-\frac{\|e_i - e_j\|^2}{2\sigma^2}\right)$$

其中 $e_i, e_j$ 是 token $i, j$ 的嵌入向量。这意味着前向噪声过程中，一个 token 更可能被语义相似的 token 替换，而不是随机替换。

**实现挑战：** 50K × 50K 的核矩阵无法完整存储。GDDS 使用两种策略：
1. **KNN 稀疏化**：只保留每个 token 的 top-K 近邻
2. **KeOps 延迟计算**：利用 GPU 核函数库 KeOps，在需要时动态计算核值而不存储完整矩阵

### 实验关键数据

#### Language Modeling (NLL/BPC)

| 模型 | Text8 BPC ↓ | OWT PPL ↓ |
|------|------------|-----------|
| GPT-2 (AR baseline) | 1.06 | — |
| MDLM (masked) | 1.09 | — |
| UDLM (uniform) | 1.10 | — |
| GDDS Uniform | 1.05 | — |
| GDDS Absorb | 1.04 | — |
| **GDDS Gauss (SIK)** | **1.01** | **最低** |

#### Language Generation Quality

| 模型 | Gen PPL ↓ | Seq Entropy | Distinct-3 |
|------|-----------|-------------|------------|
| AR baseline | — | — | — |
| MDLM | 高 | 低 | 低 |
| **GDDS Gauss** | **最低** | **最接近真实分布** | **最高** |

#### 零样本迁移

在 PTB、LM1B、Wikitext 三个未见过的数据集上，GDDS Gauss 的零样本 PPL 全面最低，说明语义感知噪声带来了更强的泛化能力。

---

## 复现评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 数据 | ⭐⭐⭐⭐⭐ | Text8 和 OpenWebText 均公开 |
| 代码 | ⭐⭐⭐⭐⭐ | 已开源，含完整实验配置 |
| 算力 | ⭐⭐⭐⭐ | 中等规模实验，A100 可复现 |
| 工程复杂度 | ⭐⭐⭐ | 均匀化采样和 SIK 实现需要一定工程量 |
| 收益 | ⭐⭐⭐⭐⭐ | 首次超越 AR，开创性意义 |

---

## 批判性分析

### 局限性

1. **规模问题**：实验在 ~100M 参数级别进行，Text8 和 OpenWebText 也是相对较小的数据集。能否在 1B+ 参数、万级序列长度上保持优势，是最关键的待验证问题。

2. **推理速度**：离散扩散需要多步去噪采样，推理延迟远高于 AR 模型的单次前向传播。论文未报告推理时间对比。

3. **SIK 的嵌入依赖**：语义感知核依赖预训练词嵌入的质量。如果嵌入空间的语义结构不准确，SIK 的优势可能消失。

4. **非 mask 扩散的采样困难**：论文坦言 SIK 和 uniform 核的祖先采样（ancestral sampling）比 mask 扩散复杂得多，实际采样需要近似计算。

### 改进方向

1. **扩展到更大规模**：在 1B+ 参数和 16K+ 序列上验证
2. **推理加速**：结合 consistency distillation 或 progressive distillation 减少采样步数
3. **自适应 SIK**：让语义核随训练动态更新而非使用固定预训练嵌入
4. **条件生成**：将 GDDS 应用于条件文本生成（摘要、翻译）

### 独立观察

GDDS 的意义不在于立即替代 AR 模型，而在于**打破了一个长期假设**——离散扩散在离散序列生成上天然劣于自回归。Snapshot ELBO 的简化使得离散扩散可以直接复用标准 Transformer 架构进行训练，消除了之前需要特殊架构设计的障碍。如果这一结果在更大规模上成立，离散扩散可能成为 LLM 的一个严肃替代范式——特别是在需要并行解码的场景（如实时翻译、代码补全）。

---

> 📅 2026-03-25 | Lighthouse AI Research
