---
title: "IndexCache：跨层索引复用，砍掉 75% 稀疏注意力 Indexer 开销"
description: "针对 DeepSeek Sparse Attention 的 Lightning Indexer 跨层冗余问题，提出 Training-free 贪心搜索和 Training-aware 多层蒸馏两种方案，保留 1/4 Indexer 即可获得 1.82× prefill 加速"
---

# IndexCache：跨层索引复用，砍掉 75% 稀疏注意力 Indexer 开销

> 论文：[IndexCache: Accelerating Sparse Attention via Cross-Layer Index Reuse](https://arxiv.org/abs/2603.12201)
>
> 作者：Yushi Bai, Qian Dong, Ting Jiang, Xin Lv, Zhengxiao Du, Aohan Zeng, Jie Tang, Juanzi Li（清华 & Z.ai）
>
> 一句话：DeepSeek Sparse Attention 的 Indexer 在相邻层之间产出 70-100% 相同的 top-k 索引——IndexCache 利用这个冗余，只保留 1/4 的 Indexer，在 GLM-5（744B）上获得 ~1.2× 端到端加速且几乎无损。

---

## 一、这篇论文在解决什么问题

### 1.1 背景

DeepSeek Sparse Attention（DSA）是当前最成熟的生产级稀疏注意力方案。它在每一层引入一个轻量的 **Lightning Indexer**，对所有前序 token 打分后选出 top-k（k=2048），然后核心注意力只在这 k 个 token 上计算，将每层的核心注意力从 O(L²) 降到 O(Lk)。

问题在于：Indexer 本身仍然是 O(L²) 的。虽然单层 Indexer 比主注意力便宜一个量级（低秩投影 + FP8），但跨 N 层的总开销是 O(NL²)，在长上下文场景下快速膨胀。Profiling 数据显示，在 200K token 的 prefill 阶段，Indexer 已经占据了总延迟的主要份额。

### 1.2 核心问题

能否在不降低模型质量的前提下，消除大部分层的 Indexer 计算？具体地：
1. 相邻层的 Indexer 输出是否存在跨层稳定性？
2. 如果存在，最大复用率是多少？
3. 如何在激进复用下保持模型性能？

---

## 二、方法：怎么解决的

### 2.1 核心 Insight

**相邻层的 Indexer 选出的 top-k token 集合几乎相同**——pairwise overlap 热力图显示相邻层 70-100% 重叠，且层间形成了明显的聚类结构。这意味着大部分 Indexer 在做重复计算。

把这种冗余利用起来极其简单：将 N 层分为 **F 层**（Full，保留 Indexer）和 **S 层**（Shared，直接复用上一个 F 层的 top-k 索引）。推理时只需在每层增加一个 `if` 分支：F 层正常运行 Indexer 并缓存结果；S 层跳过 Indexer，直接读取缓存。

关键问题变成：**哪些层保留 Indexer？**

### 2.2 Training-free IndexCache：贪心层选择

最直觉的方案——均匀间隔（每 4 层保留 1 个）——效果不好，因为不同层的 Indexer 重要性差异很大（早期层和过渡层更敏感）。

贪心搜索算法：

1. 初始状态：所有层都是 F（保留 Indexer）
2. 每一步：遍历所有当前的 F 层（第 1 层始终保留），逐个尝试将其翻转为 S，在校准集上计算 LM loss
3. 选择翻转后 loss 增加最小的层，将其设为 S
4. 重复直到达到目标保留率（如 1/4）

**复杂度**：N(N-1)/2 次前向传播。利用 Pipeline Parallelism 可分块搜索，加速约 P×。

贪心搜索的三个好的性质：
- 始终优于均匀间隔
- 搜索过程中的 loss 曲线显示清晰的"easy 层"和"critical 层"分界
- 结果跨不同校准集稳定

### 2.3 Training-aware IndexCache：多层蒸馏

如果可以训练（从头或 continue pre-training），能做得更好：让保留的 Indexer 显式地为多层服务。

标准 DSA 训练中，每层 Indexer 的蒸馏目标是本层的注意力分布 p^(ℓ)：

$$\mathcal{L}^I = \sum_t D_{KL}(p_t^{(\ell)} \| q_t^{(\ell)})$$

多层蒸馏将目标扩展为本层 + 所有复用该 Indexer 的 S 层：

$$\mathcal{L}^I_{multi} = \sum_{j=0}^{m} \frac{1}{m+1} \sum_t D_{KL}(p_t^{(\ell+j)} \| q_t^{(\ell)})$$

**数学上的优雅性**：论文证明了 $\nabla_\theta \mathcal{L}^I_{multi} = \nabla_\theta \mathcal{L}^I_{avg}$，即多层蒸馏的梯度恰好等价于对"目标层注意力分布均值"做蒸馏。Indexer 学到的是一个"共识 top-k"——同时服务多层的最优折中。

### 2.4 方法对比

| 方案 | 需要训练 | 保留率 | 长上下文 Avg | 推理/通用 Avg |
|------|---------|--------|-------------|--------------|
| 标准 DSA | — | 100% | 50.2 | 74.6 |
| 均匀间隔 1/4 | ❌ | 25% | 43.0（-7.2） | 73.7 |
| 贪心搜索 1/4 | ❌ | 25% | 49.9（-0.3） | 74.9 |
| Training-aware 1/4 | ✅ | 25% | 50.0 | 74.3 |

贪心搜索在无需训练的前提下已接近满分，Training-aware 方案的优势在于可以使用简单的均匀模式。

---

## 三、实验结果

### 3.1 实验设置

- **模型**：GLM-4.7-Flash 的 30B-A3B MoE 变体（47 层，MLA 注意力），以及 GLM-5（744B，production scale）
- **评估**：5 个长上下文 benchmark（MRCR v2, GraphWalks, LongBench v2, RULER, AA-LCR）+ 4 个通用推理 benchmark（AIME 2025, GPQA-Diamond, LiveCodeBench v6, IFBench）
- **推理框架**：SGLang，H100 × 8

### 3.2 端到端推理加速

| 上下文长度 | Prefill 加速（1/4） | Decode 加速（1/4） | 全吞吐加速（1/4） |
|-----------|--------------------|--------------------|-------------------|
| 10K | 1.27× | 1.09× | 1.10× |
| 60K | 1.48× | 1.22× | 1.22× |
| 120K | 1.66× | 1.36× | 1.38× |
| 200K | **1.82×** | **1.48×** | **1.51×** |

Prefill 加速随上下文长度增长最为显著——正是因为 Indexer 的 O(L²) 开销在 prefill 阶段占比最大。200K 时 prefill 从 19.5s 降到 10.7s，直接节省 ~9 秒的首 token 延迟。

### 3.3 质量评估

贪心搜索 1/4 保留率：
- 长上下文 Avg：49.9 vs 50.2（-0.6%）
- 通用推理 Avg：74.9 vs 74.6（+0.4%）
- AIME 2025：**92.6 vs 91.0**（+1.6%），移除冗余 Indexer 反而有轻微正则化效果

极端压缩（1/8 保留率）：
- 均匀间隔：长上下文暴跌到 35.3
- 贪心搜索：可恢复到 46.1，但仍有 4 分差距——1/8 是 Training-free 的下限

### 3.4 GLM-5 初步结果

在 GLM-5（744B）上保留 50% Indexer：端到端加速 ~1.2×，所有 benchmark（包括 AIME、LongBench v2、RULER 等）表现与完整模型可比。更激进的 1/4 保留率实验待发布。

---

## 四、复现与落地评估

### 4.1 复现难度评估

| 维度 | 评级 | 说明 |
|------|------|------|
| 代码开源 | ⚠️ | 论文未提及开源计划，但方法极其简单（贪心搜索 + 条件分支） |
| 数据可得性 | ✅ | 校准集只需少量 SFT 数据，无特殊数据依赖 |
| 算力需求 | 中 | 贪心搜索需 ~N²/2 次前向传播，30B 模型约几小时 H100 |
| 依赖复杂度 | 低 | 仅需修改推理循环中的一个 if 分支 |
| 复现总评 | ⭐⭐⭐⭐ | Training-free 方案几乎可以照搬，核心难度在于获取 DSA 模型 |

### 4.2 工业落地可行性

- **适用场景**：所有使用 DSA 的长上下文推理场景（聊天、Agent、RAG）
- **性能开销**：零额外开销——仅是跳过计算
- **集成难度**：非常低，推理循环中增加一个分支判断
- **风险点**：贪心搜索得到的 pattern 是否在模型更新后需要重新搜索？
- **落地总评**：⭐⭐⭐⭐⭐（对 DSA 用户来说是"free lunch"）

---

## 五、SOTA 对照矩阵

| 方法 | 核心思路 | Prefill 加速 | 质量损失 | 需要训练 |
|------|---------|-------------|---------|---------|
| **IndexCache**（本文） | 跨层 Indexer 索引复用 | 1.82× | 几乎无 | 可选 |
| DSA 原版 | 每层独立 Indexer | 基线 | 基线 | ✅ |
| Gao et al. 2026 | Full Attention 锚定层复用 | ~1.5× | 低 | ❌ |
| Deshmukh et al. 2025 | 跨层 token 选择稳定性 | ~1.3× | 低 | ❌ |
| FlashAttention-4 | GPU kernel 优化 | 正交（可叠加） | 无 | ❌ |

IndexCache 是**第一个针对 DSA Indexer 的跨层优化**，与 kernel 级优化（FlashAttention）正交可叠加。

---

## 六、讨论与局限

### 6.1 论文自身讨论的局限

- 1/8 保留率时质量下降显著，跨层共享存在下限
- GLM-5 实验标注为 preliminary
- 贪心搜索的全局最优性无法保证

### 6.2 我的额外观察

- **层选择 pattern 的可迁移性**：如果 DSA 模型做了后续微调（如 RLHF），之前搜索的 pattern 是否仍然最优？论文未讨论
- **与 MoE 路由的交互**：GLM-4.7 是 MoE 模型，不同专家激活下 Indexer 输出的跨层稳定性是否一致？
- **动态 pattern**：能否根据输入内容动态决定哪些层需要 Full Indexer？比如在 needle-in-haystack 场景下可能需要更多 F 层
- **缺乏与 IonAttention（本期早报条目）的对比**：两者都在优化长上下文推理，技术路径不同但目标重叠

---

## 七、对我们的启示

1. **谁应该关注**：所有在部署 DSA 或类 DSA 稀疏注意力方案的推理工程师
2. **核心 takeaway**：
   - 稀疏注意力的 Indexer 是一个被忽视的瓶颈——其 O(NL²) 总开销在长上下文下非平凡
   - 跨层稳定性是 Transformer 的一个基本结构性质，不只存在于 full attention 中
   - Training-free 方案的实用性极高：只需一个小校准集 + 几小时搜索
3. **实践建议**：
   - 如果你在用 DSA，立即跑一次贪心层搜索——这是 free performance
   - 如果你在设计新的稀疏注意力方案，从一开始就考虑跨层共享

---

## 论文速查卡

| 项目 | 内容 |
|------|------|
| **标题** | IndexCache: Accelerating Sparse Attention via Cross-Layer Index Reuse |
| **作者** | Yushi Bai, Qian Dong 等, 清华大学 & Z.ai |
| **链接** | [arXiv:2603.12201](https://arxiv.org/abs/2603.12201) |
| **发表** | 预印本 (2026-03-12) |
| **一句话总结** | 利用 DSA Indexer 跨层 70-100% 的 top-k 重叠，保留 1/4 Indexer 获得 1.82× prefill 加速且几乎无损 |
| **大白话版** | 想象一栋 47 层楼，每层都有一个安检员检查同样的包裹。IndexCache 发现相邻楼层检查结果几乎一样，所以只留 12 个安检员、其他楼层直接用邻居的检查结果，安检速度快了一倍，漏检率几乎没变 |
| **核心数字** | 75% Indexer 删除、1.82× prefill 加速、GLM-5（744B）验证 |
| **复现评级** | ⭐⭐⭐⭐ |
| **落地评级** | ⭐⭐⭐⭐⭐ |
