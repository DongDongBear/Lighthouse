---
title: "Attention Residuals：Kimi 团队用注意力机制重新设计残差连接"
description: "AttnRes, 残差连接, Transformer架构, Kimi, 月之暗面, PreNorm, 架构创新"
---

# Attention Residuals

> 原文链接：https://arxiv.org/abs/2603.15031
> 作者：Kimi Team（Guangyu Chen, Yu Zhang, Jianlin Su, Weixin Xu 等 36 人）
> 机构：月之暗面（Moonshot AI）
> 发布日期：2026-03-16

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 用 softmax 注意力替代 Transformer 中固定权重的残差连接，让每层可以选择性聚合前面层的输出 |
| 大白话版 | Transformer 的"层间跳线"一直是简单的"全部加起来"，Kimi 团队改成了"有选择地挑重点加"——类似从"所有人投票等权"变为"让专家意见权重更高" |
| 核心数字 | Kimi Linear 48B（3B 激活参数），1.4T tokens 预训练，所有评估任务均有提升 |
| 评级 | B+ — 对 Transformer 基础架构的重要改进，但工业验证尚需更大规模 |
| 代码 | 暂未开源 |
| 关键词 | Attention Residuals, PreNorm, Residual Connection, Kimi Linear, Architecture |

## 核心 Insight

### 问题：PreNorm 残差的"隐藏状态增长"

现代 LLM 标准采用 PreNorm 残差连接：

$$h_{l+1} = h_l + F_l(\text{Norm}(h_l))$$

其中 $h_l$ 是第 $l$ 层的隐藏状态，$F_l$ 是该层的变换函数。

**问题在于**：每层输出被等权重（权重=1）累加到隐藏状态中。随着层数增加：
- 隐藏状态 $h_l$ 的范数不断增长（因为不断累加）
- 每层的新贡献 $F_l(\cdot)$ 相对于庞大的累积状态变得越来越"稀释"
- 深层层的信号被早期累积淹没

直觉类比：想象一杯水，每层向里面滴一滴墨水。前几滴颜色变化很明显，但到第 100 滴时，一滴墨水几乎看不出变化——不是因为墨水不重要，而是因为水已经太"浓"了。

### 解决方案：Attention Residuals (AttnRes)

核心思想：用 **softmax 注意力** 替代固定的等权累加。

$$h_{l+1} = \sum_{i=0}^{l} \alpha_{l,i} \cdot o_i$$

其中 $\alpha_{l,i}$ 是第 $l$ 层对第 $i$ 层输出的注意力权重，通过 softmax 计算，是**可学习的、输入依赖的**权重。

**关键区别：**

| 维度 | 标准残差 | AttnRes |
|---|---|---|
| 聚合权重 | 固定 = 1 | 可学习，输入依赖 |
| 聚合方式 | 等权累加 | softmax 注意力 |
| 状态增长 | 无控制（随层数线性增长） | 受控（注意力权重归一化） |
| 每层贡献 | 随深度被稀释 | 可自适应维持 |

### 实用变体：Block AttnRes

完整的 AttnRes 需要每层存储所有前面层的输出——对于大规模模型训练来说内存和通信开销过大。

Block AttnRes 的解决方案：
1. 将层分成块（blocks），例如每 4-8 层为一块
2. 在块内使用标准残差
3. 在块之间使用注意力聚合
4. 配合基于缓存的流水线通信和两阶段计算策略

这使 Block AttnRes 成为标准残差连接的**实用 drop-in 替代**，开销最小。

## 实验结果

### Scaling Law 验证

论文通过 Scaling Law 实验确认改进在不同模型规模上一致存在——AttnRes 不是小模型的 trick，而是可扩展的架构改进。

### Kimi Linear 48B 集成

将 AttnRes 集成到 Kimi Linear 架构（48B 总参数 / 3B 激活参数）中，在 1.4T tokens 上预训练：

**效果：**
- 更均匀的输出幅度分布（across depth）
- 更均匀的梯度分布（across depth）
- **所有评估任务均有提升**

消融实验验证了"内容依赖的深度选择"（content-dependent depth-wise selection）的收益。

## 与现有方法的关键区别

| 维度 | 标准 PreNorm 残差 | Post-Norm | AttnRes |
|---|---|---|---|
| 训练稳定性 | ✅ 好 | ⚠️ 较差 | ✅ 好 |
| 深层贡献 | ❌ 被稀释 | ✅ 相对稳定 | ✅ 可自适应 |
| 实现复杂度 | 极简 | 极简 | 中等 |
| 内存开销 | 基准 | 基准 | Block 版本：+少量 |
| 可扩展性 | ✅ | ✅ | ✅（Block 版本） |

## 批判性分析

### 局限性

1. **单一验证点**：目前只在 Kimi Linear 48B（3B 激活参数，线性注意力架构）上进行了大规模验证。是否对标准 dense Transformer（如 Llama、GPT 架构）同样有效尚不确定
2. **1.4T tokens 可能不够**：相比业界主流的 10T+ tokens 预训练，1.4T tokens 的验证规模相对有限
3. **未公开代码**：社区无法独立验证和复现

### 改进方向

1. **跨架构验证**：在 Llama/Qwen/DeepSeek 等主流架构上验证
2. **超大规模训练**：在 10T+ tokens 上验证改进是否持续
3. **与其他架构创新的兼容性**：AttnRes 与 MLA（DeepSeek）、GQA、稀疏注意力等技术的兼容性如何？

### 独立观察

- Kimi 团队的核心成员之一苏剑林（Jianlin Su）是 RoPE（旋转位置编码）的发明者。RoPE 改变了位置编码的标准，AttnRes 可能对残差连接做同样的事情——但需要更广泛的社区验证
- 论文的发布时机值得注意：Kimi K2.5 刚刚创造了"20 天收入超全年"的商业奇迹。在商业成功的同时发布架构创新论文，显示 Moonshot AI 在基础研究上的持续投入
- Sebastian Raschka 同期发布的 "LLM Architecture Gallery" 和注意力变体指南中提到了此工作，说明它已经引起了社区的关注
- 如果 AttnRes 的收益在更大规模上被确认，它可能成为继 RMSNorm、RoPE 之后的又一个"标准组件"
