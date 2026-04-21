---
title: "OneVL 深度解读：把自动驾驶的显式链式推理压进 latent token，速度和解释性第一次同时要"
description: "OneVL, latent reasoning, autonomous driving, VLA, world model, Qwen3-VL, NAVSIM, ROADWork, Impromptu, APR1"
---

# OneVL: One-Step Latent Reasoning and Planning with Vision-Language Explanation

> 原文链接：https://arxiv.org/abs/2604.18486
> 作者：Xiaomi Embodied Intelligence Team
> 机构：Xiaomi Embodied Intelligence Team
> 发布日期：2026-04-21

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | OneVL 用“语言辅助解码器 + 视觉世界模型解码器”双监督 latent token，让自动驾驶 VLA 在接近 answer-only 延迟下，第一次超过显式 CoT。 |
| 大白话版 | 以前要么让模型把思考过程全说出来，但太慢；要么把思考藏起来，可速度快了又不够强。OneVL 的办法是把“想什么”和“未来场景会怎样”一起压进 latent token，训练时看得见，推理时却能很快。 |
| 核心数字 | NAVSIM：88.84 PDM-score，超过显式 CoT 的 88.29；延迟 4.46s，几乎等于 answer-only 的 4.49s；去掉 staged training 后分数跌到 67.13 |
| 评级 | A — 这是具身/驾驶 latent reasoning 路线上非常强的系统论文。 |
| 代码 | 需继续追踪公开计划 |
| 关键词 | latent CoT、VLA、world model、autonomous driving、visual decoder、Qwen3-VL、planning |

## 核心 Insight

OneVL 的核心洞察是：自动驾驶里的“思考”不能只理解成语言链式推理。真正决定规划质量的，是模型是否在内部学到一个压缩过的世界模型——既能表达语言解释，也能表达未来场景动态。如果 latent token 只压缩文本 CoT，它往往打不过显式 CoT；但如果 latent token 同时被“可解释语言”与“未来视觉世界”双重监督，它就有机会既快又强。

这就是 OneVL 和之前 latent CoT 方法最大的分野。过去很多 latent CoT 工作，核心是“把显式 reasoning trace 压缩成更短的内部表示”。OneVL 则在说：对驾驶任务而言，真正该压缩的是“未来场景演化 + 行为选择依据”，而不只是自然语言。

### 为什么这个想法 work？

因为驾驶规划的本质不是写一段漂亮解释，而是预测：

- 前车会怎么动；
- 我该走哪条轨迹；
- 路况接下来 0.5s / 1.0s 会发生什么；
- 哪个行动更安全、更平滑、更高分。

如果 latent token 里只有语言解释，它更像“会说自己为什么这么开”；如果再加上视觉世界模型监督，它才更像“真的在脑内预演前方会发生什么”。

## 方法详解

### 整体架构

```text
当前多模态输入
   ↓
Qwen3-VL-4B 主干
   ↓
插入两类 latent token
   ├─ visual latent tokens (承载未来世界动态)
   └─ language latent tokens (承载语言解释)
   ↓
训练时双辅助解码器监督
   ├─ language decoder：从 latent 恢复 CoT
   └─ visual decoder：从 latent 预测未来帧 token
   ↓
推理时丢弃辅助解码器，只保留主干 + latent prefill
```

### 关键技术组件

#### 组件 1：双类 latent token 设计

**做什么：**
把 reasoning 拆成两种潜变量：语言解释与未来视觉世界。

**怎么做：**
论文设计了：

- 2 个 language latent tokens
- 4 个 visual latent tokens

实际实现上并不是向词表硬加新 special tokens，而是使用原词表中的 token 序列作为 latent 占位结构。作者指出，真正新增专用 token 反而会伤性能。

**为什么重要：**
这表明 OneVL 很务实：不是为了概念优雅去硬造 token 类型，而是围绕实际性能做工程折中。

#### 组件 2：语言辅助解码器

**做什么：**
强迫 language latent 中保留可恢复的 CoT 语义。

**怎么做：**
从主干取出 language latent hidden states $H_l$，再与当前帧视觉特征 $V$ 经过映射后拼接，送入语言辅助解码器，损失为：

$$L_l = - \sum_i \log P(T^y_{t,i} \mid Z_l, T^y_{t,<i})$$

其中 $Z_l = [W_l(V), W_l(H_l)]$。

**直觉解释：**
这一步确保 latent 不是完全黑盒，它得包含足够多的语义信息，至少能被辅助 decoder 重新解释成文字推理。

#### 组件 3：视觉辅助解码器 = 世界模型监督

**做什么：**
让 visual latent 学会预测未来场景。

**怎么做：**
从主干取出 visual latent hidden states $H_v$ 与当前帧视觉特征 $V$，拼接为：

$$Z_v = [W_v(V), W_v(H_v)]$$

再预测未来两帧视觉 token（0.5s 与 1.0s），损失为：

$$L_v = - \sum_t \log P(T^v_{y,t} \mid Z_v, T^v_{y,<t})$$

这部分使用视觉 tokenizer，把未来图像离散为 token 序列。

**直觉解释：**
语言解释让模型“会说自己在想什么”；视觉未来预测让模型“真的在内部预演会发生什么”。后者正是自动驾驶任务里更本质的 reasoning。

#### 组件 4：联合目标

总损失为：

$$L = L_c + \lambda_l L_l + \lambda_v L_v$$

其中：

- $L_c$：轨迹预测主任务
- $\lambda_l = 1.0$
- $\lambda_v = 0.1$

视觉损失权重较低，是为了避免难度更高的视觉重建主导整个训练过程。

#### 组件 5：Prefill inference

**做什么：**
在保留 latent reasoning 的同时，把延迟压到接近 answer-only。

**怎么做：**
推理时丢弃辅助解码器，只保留主干模型，并把 visual latent + language latent 一次性 prefill 进 prompt。由于 transformer prefill 可并行计算，这些 latent token 不需要像显式 CoT 那样逐 token 自回归生成。

**直觉解释：**
OneVL 不是去掉推理，而是把原本显式慢慢说出来的推理过程，转移到并行可计算的 latent 瓶颈里。

### 三阶段训练策略

论文非常强调 staged training，这不是小技巧，而是方法成立的必要条件：

1. Preliminary：先让视觉 decoder 学会无条件未来帧预测，建立世界模型先验；
2. Stage 0：只训练主干，让 latent 先学会承载轨迹相关信息；
3. Stage 1：冻结主干，只训练语言/视觉辅助 decoder；
4. Stage 2：解冻全部组件，端到端联合微调。

如果跳过 staged training，模型会严重崩掉。这一点后来在消融里有非常醒目的体现。

## 实验结果

### 主实验：NAVSIM

| 方法 | PDM-score | 延迟 |
|---|---:|---:|
| AR Answer | 87.47 | 4.49s |
| AR CoT+Answer | 88.29 | 6.58s |
| COCONUT | 84.84 | 5.93s |
| CODI | 83.92 | 8.62s |
| SIM-CoT | 84.21 | 10.86s |
| **OneVL** | **88.84** | **4.46s** |

**解读：**
- OneVL 首次超过显式 CoT；
- 延迟却几乎等于 answer-only；
- 这正是论文最核心的 claim：不是只是更快，也不是只是更准，而是第一次把两者一起拿到。

### ROADWork / Impromptu / APR1

论文在多个 benchmark 上都维持类似趋势：

- ROADWork：OneVL 的 ADE/FDE 都优于显式 CoT，延迟却更低；
- Impromptu：OneVL 的平均轨迹误差最低；
- APR1：4B OneVL 几乎逼近 10B Cosmos-Reason 的 FDE，同时明显优于其他 4B latent/AR baseline。

这说明 OneVL 不是只在一个 benchmark 上碰巧好看，而是对复杂施工路况、通用驾驶规划等不同场景都有稳定收益。

### 消融实验（Ablation Study）

| 变体 | NAVSIM PDM-score | 与完整方法差距 | 说明 |
|---|---:|---:|---|
| 完整方法 | 88.84 | — | 双 decoder + staged training |
| 去掉 visual decoder | 87.97 | -0.87 | 世界模型监督最关键 |
| 去掉 language decoder | 88.53 | -0.31 | 语言解释也有帮助，但次于视觉监督 |
| 去掉 staged training | 67.13 | -21.71 | 训练流程不是可选项，是方法成立前提 |

**关键发现：**
1. 视觉世界模型监督比语言监督更重要；
2. 语言解释仍然有价值，说明“会说清楚”对 latent 表示也有正则作用；
3. staged training 是刚需，否则多目标训练会直接把系统搞崩。

### 文本解释质量

论文还评估了语言解释质量。OneVL 的语言解释分数略低于显式 CoT，但明显优于此前 latent CoT 方法。这很好理解：OneVL 的首要目标不是生成最漂亮的解释，而是在不牺牲速度的前提下，保住足够强的可解释性。

## SOTA 对照矩阵

| 方法 | 机构 | 参数量 | 核心优势 | 延迟 |
|---|---|---:|---|---:|
| AR Answer | 基线 | 4B | 最快 answer-only | 快 |
| AR CoT+Answer | 基线 | 4B | 显式推理、较强性能 | 慢 |
| COCONUT / CODI / SIM-CoT | 各类 latent CoT | 4B | 尝试 latent reasoning | 中到慢 |
| **OneVL** | Xiaomi | 4B | 双监督 latent reasoning + world model | 接近最快 |

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐⭐⭐ | benchmark 与驾驶数据复现门槛较高 |
| 代码可得性 | ⭐⭐ | 还需继续追踪开源实现 |
| 算力需求 | ⭐⭐ | 自动驾驶多模态训练成本不低 |
| 工程复杂度 | ⭐⭐⭐⭐ | 主干、双 decoder、视觉 tokenizer、三阶段训练都不简单 |
| 预期收益 | ⭐⭐⭐⭐⭐ | 若复现成立，对实时 VLA/机器人规划非常有价值 |

**复现建议：**
如果要追这条线，最现实的路径不是先追求完整大系统，而是先验证：

1. visual decoder 的世界模型监督是否在你的场景也比语言监督更值钱；
2. prefill latent 是否真的能保住速度优势；
3. staged training 是否在别的 VLM 主干上也必要。

## 批判性分析

### 局限性

论文承认也暗含了几个限制：

1. benchmark 与真实闭环路测仍有距离；
2. latent token 的成功部分依赖训练流程极其精细；
3. 解释性虽然保住了，但仍略低于显式 CoT。

我们额外看到的风险：

1. 视觉 tokenizer 与世界模型监督的选择很可能高度任务依赖；
2. 驾驶场景里的 latency 优势能否原封不动迁移到机器人或通用 embodied tasks，还不好说；
3. 若未来数据分布变化很大，latent bottleneck 学到的世界先验可能需要经常重训。

### 改进方向

1. 把未来预测从两帧扩到更长 horizon；
2. 让 latent bottleneck 适配更通用的 embodied/world-model 任务；
3. 研究检测/解释机制，让 latent reasoning 在部署时更可诊断。

### 独立观察

OneVL 最有启发性的地方，是它把“latent reasoning 为什么过去不够强”说透了：问题不只是 latent 不够大，而是监督目标错了。对自动驾驶这种任务，真正应该压进 latent 的，不是漂亮的文字，而是世界动态。只要这个判断成立，OneVL 的思想就不止适用于驾驶，也可能适用于机器人、视频 agent、甚至 UI agent 中的未来状态预演。

## 对领域的影响

OneVL 会让 latent CoT 这条线重新变得很有说服力。过去很多人对 latent reasoning 的印象是“快一点，但总打不过显式 CoT”。现在 OneVL 给出了一个更强的答案：如果你让 latent 同时承担世界模型和语言解释，显式 CoT 不再天然占优。对于所有想做实时规划系统的人，这篇论文都很值得认真读，因为它不是在二选一地逼你选“解释性”或“速度”，而是在证明两者第一次有可能一起拿。
