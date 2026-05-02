---
title: "RecursiveMAS 深度解读：把多智能体协作变成可递归缩放的潜空间计算"
description: "Recursive Multi-Agent Systems, RecursiveMAS, latent recursion, multi-agent systems, recursive reasoning, RecursiveLink, latent collaboration, test-time scaling"
---

# Recursive Multi-Agent Systems 深度解读

> 原文链接：https://arxiv.org/html/2604.25917
> arXiv 摘要页：https://arxiv.org/abs/2604.25917
> 项目页：https://recursivemas.github.io/
> 原文标题：Recursive Multi-Agent Systems
> 作者：Xiyuan Yang、Jiaru Zou、Rui Pan、Ruizhong Qiu、Pan Lu、Shizhe Diao、Jindong Jiang、Hanghang Tong、Tong Zhang、Markus J. Buehler、Jingrui He、James Zou
> 机构：UIUC、Stanford University、NVIDIA、MIT
> arXiv 提交日期：2026-04-28
> 核对说明：已基于论文全文与附录撰写；涉及基线具体数值时仅引用原文表格中明确给出的数据，未对原文未列出的 baseline 数值做臆测补全。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 用轻量潜变量接口把多个异构 agent 串成一个“递归回路”，让整个 MAS 像单个递归模型一样整体优化。 |
| 大白话版 | 以前多智能体靠“你一句我一句”传文字，慢、贵、难训练；这篇论文改成让 agent 直接传隐藏状态，并把整套协作反复循环几轮，所以系统既更快，也更容易随着递归变强。 |
| 核心数字 | 9 个 benchmark；相对最强 baseline 平均准确率 +8.3%；端到端推理 1.2x–2.4x 加速；token 使用减少 34.6%–75.6%。 |
| 评级 | A- — 不是单点技巧，而是在“如何扩展 MAS”这个问题上提出了一个很完整的新范式。 |
| 代码 | 论文给出项目页；正文未明确写出代码仓库链接，开源状态以项目页为准。 |
| 关键词 | multi-agent systems、latent recursion、RecursiveLink、heterogeneous agents、credit assignment、recursive training、latent communication、test-time scaling |

## 核心 Insight

这篇论文最重要的洞察是：多智能体系统的“扩展”不一定只能靠增加 agent 数量、提示词工程或更复杂的对话拓扑，还可以像递归语言模型那样，把“整个系统”视为一个可重复展开的统一计算图。换句话说，作者不是把单个 agent 做得更强，而是把“agent 之间如何协作”本身变成一个可递归、可训练、可缩放的计算对象。

过去 MAS 的主流做法基本都建立在文本通信上：Planner 产出文字、Critic 读文字、Solver 再读文字。这样做直观，但有两个老问题。第一，效率差：每轮协作都要经历解码、输出、再编码。第二，训练难：一旦中间通信经过离散 token，梯度就会变弱甚至消失，整个系统很难做端到端的共享 credit assignment。于是很多工作最后只能优化单个 agent，或者只优化 prompt/context，而不是优化“整个协作回路”。

RecursiveMAS 的不同点在于，它把中间通信媒介从 text 改成 latent states，再用一个很轻的 RecursiveLink 把 agent 内部的 latent thought 生成，与 agent 之间的跨模型传递，统一到同一套递归接口里。这样一来，多个 agent 不再只是轮流说话，而是像递归网络中的多层模块一样，被串成一个循环系统，前一轮递归得到的系统状态会直接喂给下一轮递归继续修正。

### 为什么这个想法 work？

因为它同时解决了 MAS 最难啃的两块骨头：通信成本和系统级优化。

先看通信成本。文本通信本质上需要把隐藏状态投影到词表空间，再采样成 token，再由下一个 agent 重新嵌入回隐藏空间。这个过程多了一个巨大的词表投影开销，而且还会引入离散化损失。潜空间递归则跳过了这一步，直接让一个 agent 的隐藏表示经过轻量映射后送给下一个 agent。

再看训练稳定性。文本递归里的 softmax 在高置信 token 区域会让梯度 Jacobian 接近 0，递归几轮后几乎传不回去。作者的理论分析说明，带残差的 RecursiveLink 在合理初始化下，梯度范数能维持在接近常数的水平。这意味着系统能真正做“整套回路一起学”，而不是每个 agent 各练各的。

可以把它类比成两种团队协作方式：

- text recursion 像每个成员都必须先写完整报告，下一位再通读并总结，流程清楚但慢，而且信息损耗大；
- latent recursion 像成员之间直接共享白板上的草稿、结构图和中间状态，外部读者看不懂，但团队内部流转更高效，也更容易连续修改。

## 方法详解

### 整体架构

RecursiveMAS 把整个多智能体系统视为一个递归回路。每个 agent 都做两件事：

1. 在自己内部生成一小段 latent thoughts；
2. 把这段 latent thoughts 通过跨 agent 的映射，交给下一个 agent 继续处理。

最后一个 agent 在本轮递归结束后，不是立刻输出文本，而是把自己的 latent outputs 再送回第一个 agent，形成闭环。只有在最后一轮递归结束时，最后一个 agent 才真正解码出最终答案。

对应论文图 2，可以用下面的文字结构理解：

```text
问题 x + 各 agent 指令
  → Agent A1: 内部 latent 生成
  → outer RecursiveLink
  → Agent A2: 条件化 latent 生成
  → outer RecursiveLink
  → ...
  → Agent AN: latent 生成
  → 回传到 Agent A1
  → 进入下一轮 recursion
  → 最后一轮由 Agent AN 解码文本答案
```

这个设计有两个关键点：

- agent 内部递归：让单个 agent 不只是“一次性出一句话”，而是先在潜空间里展开若干步 latent thinking；
- agent 之间递归：让整套 MAS 的系统状态能跨轮反复修正，而不是只走一遍固定流水线。

### 四种 collaboration patterns

论文强调 RecursiveMAS 不是绑定单一 MAS 拓扑，而是支持 4 种常见协作模式：

1. Sequential Style：Planner → Critic → Solver，适合分步推理。
2. Mixture Style：Math / Code / Science specialist 并行推理，再由 Summarizer 汇总。
3. Distillation Style：Expert + Learner，目标是在保留速度优势的同时蒸馏专家能力。
4. Deliberation Style：Reflector + Tool-Caller，适合带工具调用的反思式协作。

这点很重要，因为它说明作者要解决的不是“某一种 agent workflow 的优化”，而是“递归是否能成为通用 MAS scaling law”的问题。

### 关键技术组件

#### 组件 1：Inner RecursiveLink

**做什么：**
把某个 agent 当前生成出来的最后层隐藏状态，变成这个 agent 下一步还能继续消费的输入嵌入，从而在 agent 内部进行 latent thoughts generation。

**怎么做：**
对最后层隐藏向量 h 经过一个两层 MLP + GELU，再加回原向量本身，形成残差映射。它本质上是在学“从输出语义空间回到输入嵌入空间”的轻量桥接器。

**关键公式：**

$$
\mathcal{R}_{\text{in}}(h)=h+W_2\,\sigma(W_1 h)
$$

其中：
- $h$ 是 agent 当前步最后层隐藏状态；
- $W_1, W_2$ 是两层线性层；
- $\sigma(\cdot)$ 是 GELU；
- 残差项 $h$ 负责保留原始语义。

这就是论文公式 (3)。

**直觉解释：**
如果没有残差，映射层要“完整重写”隐藏表示，容易学不稳；有了残差后，它只需要学习“应该怎么微调才能回到可继续递归的输入分布”。这和 ResNet 的直觉一样：保留主体信息，只拟合 distribution shift。

**数值例子：**

假设某 agent 的隐藏维度 $d_h=1024$：
- 步骤 1：当前最后层输出一个 $h \in \mathbb{R}^{1024}$；
- 步骤 2：$W_1$ 把它投影到中间空间，GELU 激活后再经 $W_2$ 拉回 1024 维；
- 步骤 3：把这部分增量加回原始 $h$；
- 最终结果：得到一个语义基本不丢、但分布更适合继续作为“下一步输入”的 embedding。

论文把这个过程叫 dense-to-shallow transition：从“深层隐藏状态”回到“浅层输入嵌入”。

#### 组件 2：Outer RecursiveLink

**做什么：**
在不同 agent 之间传递 latent state，尤其用于隐藏维度不同、模型家族不同的异构 agent 连接。

**怎么做：**
在 Inner Link 的两层映射基础上，再加一条跨维度线性投影 $W_3$，把源 agent 的隐藏状态映射到目标 agent 的输入空间。

**关键公式：**

$$
\mathcal{R}_{\mathrm{out}}(h)=W_3 h+W_2\,\sigma(W_1 h)
$$

其中：
- $W_3$ 负责跨模型、跨维度的主映射；
- 第二项负责学习更细的语义修正；
- 相比 inner link，这里的“残差”不再是恒等映射，而是换成了可变换的线性主干。

这就是论文公式 (4)。

**直觉解释：**
如果两个 agent 维度不同，没法直接做 $h + \Delta h$。所以 outer link 用 $W_3 h$ 代替 identity，让“保留主要语义”与“做少量非线性修正”仍然同时成立。它不是简单 adapter，而是 RecursiveMAS 异构协作成立的核心接口。

**数值例子：**

假设 Agent A 的隐藏维度是 1536，Agent B 的输入维度是 2048：
- 步骤 1：$W_3$ 先把 $h \in \mathbb{R}^{1536}$ 投影到 2048 维；
- 步骤 2：$W_1, W_2$ 再学习一个非线性修正项；
- 步骤 3：两部分相加，得到可被 Agent B 直接消费的条件嵌入。

这就是论文所说的 cross-model transition。

#### 组件 3：系统级递归回路

**做什么：**
把所有 agent 串成 loop，让整个 MAS 能像递归网络一样多轮 refinement。

**怎么做：**
对输入问题 $x$，第一个 agent 先根据输入与角色指令生成 latent thoughts；之后每个 agent 都消费“自己的上下文 + 前一个 agent 传来的 latent thoughts”；最后一个 agent 的输出再返回给第一个 agent，进入下一轮 recursion。中间轮次不解码文本，只在最后一轮输出答案。

**关键机制：**
- 每个 agent 在一轮内部生成长度为 $m$ 的 latent thoughts；
- 系统共展开 $n$ 轮 recursion；
- 第 $r$ 轮的系统状态会影响第 $r+1$ 轮的所有 agent。

**直觉解释：**
普通 MAS 更像一次性的 DAG 流水线；RecursiveMAS 则把它变成 RNN/looped model。前一轮系统犯的错，可以在后一轮由整个协作回路共同修正。

#### 组件 4：两阶段 inner-outer 训练

**做什么：**
先让每个 agent 学会“在自己内部做 latent thinking”，再让整个系统学会“跨 agent 递归协作”。

**怎么做：**
训练分两步：

1. inner loop：逐 agent 训练 inner link，对齐 latent thoughts 与真实答案的输入 embedding；
2. outer loop：固定 base LLM，只训练 outer links，并把整个系统沿 recursion rounds 展开，用最终答案监督所有 outer links。

##### 4.1 内层训练目标

论文公式 (5)：

$$
\mathcal{L}_{\mathrm{in}} = 1 - \cos\big(\mathcal{R}_{\mathrm{in}}(H), \mathrm{Emb}_{\theta_i}(y)\big)
$$

其中：
- $H$ 是 agent 生成的 latent thoughts；
- $\mathrm{Emb}_{\theta_i}(y)$ 是把 ground-truth 文本 $y$ 送入 agent 自身 embedding 层得到的目标表示；
- 目标是让 inner link 生成的 latent 表达，靠近标准文本输入 embedding 的语义分布。

**直觉解释：**
这一步相当于先教每个 agent：你未来别急着输出 token，请先学会在潜空间里生成“像正确文本 embedding 一样”的中间状态。它是一个 warm start，不是最终任务目标。

##### 4.2 外层训练目标

论文公式 (6)：

$$
\mathcal{L}_{\mathrm{out}} = \mathrm{CE}\Big(\mathcal{S}^{(n)}\big(\mathcal{S}^{(n-1)}(\cdots\mathcal{S}^{(1)}(x))\big), y\Big)
$$

其中：
- $\mathcal{S}^{(r)}$ 表示第 $r$ 轮递归后的系统状态；
- 最后一轮文本输出与真实答案 $y$ 做交叉熵损失；
- 计算图沿整个递归路径保留，使 outer links 共享同一个最终 credit signal。

**直觉解释：**
这相当于把整个 MAS 当作一个大网络来反向传播。不是单独问 Planner 好不好、Critic 好不好，而是问“这整套循环合作最后有没有把答案做对”，再把责任分回每条跨 agent 的 link。

### 关键公式总览与解释

#### 公式 (3)：inner RecursiveLink

$$
\mathcal{R}_{\text{in}}(h)=h+W_2\sigma(W_1 h)
$$

作用：保语义、学小修正、把隐藏状态重新变成可递归输入。

#### 公式 (4)：outer RecursiveLink

$$
\mathcal{R}_{\text{out}}(h)=W_3 h+W_2\sigma(W_1 h)
$$

作用：跨异构 agent 传递 latent state，同时保留主语义与适配目标分布。

#### 公式 (5)：inner-loop 对齐损失

$$
\mathcal{L}_{\mathrm{in}} = 1 - \cos\big(\mathcal{R}_{\mathrm{in}}(H), \mathrm{Emb}_{\theta_i}(y)\big)
$$

作用：让 agent 的 latent thoughts 分布靠近“正确答案文本在 embedding 空间中的位置”。

#### 公式 (6)：outer-loop 系统损失

$$
\mathcal{L}_{\mathrm{out}} = \mathrm{CE}\Big(\mathcal{S}^{(n)}\big(\mathcal{S}^{(n-1)}(\cdots\mathcal{S}^{(1)}(x))\big), y\Big)
$$

作用：把整个递归 MAS 视为单个展开计算图，用最终任务监督统一训练。

#### 公式 (7)：梯度稳定性结论

$$
\left\|\frac{\partial \mathcal{R}_{\text{text}}(h)}{\partial h}\right\|_2 \le O(\epsilon) \ll 1,
\qquad
\left\|\frac{\partial \mathcal{R}(h)}{\partial h}\right\|_2 \ge \Omega\left(1-\sqrt{\frac{1}{d_h}\log\frac{1}{\delta}}\right)
$$

这是论文 Theorem 4.1 对应的核心结论。

含义是：
- 文本递归里，如果 token 分布很确定，softmax Jacobian 很小，梯度会随递归快速衰减；
- latent recursion 里的 RecursiveLink 因为带残差，Jacobian 更接近 identity，所以梯度能稳定穿过多轮 recursion。

### 为什么 latent recursion 比 text recursion 更稳？

这是整篇论文最值得记住的技术论点。

text recursion 的问题不只是慢，而是“难以优化”。如果一个 agent 每轮都必须把隐藏状态投到词表、采样 token、再由下一个 agent 读回来，那么中间实际经过的是离散瓶颈。作者在附录中把这种文本 SFT 式递归近似写成：

$$
\mathcal{R}_{\text{text}}(h)=W_{\text{in}}\operatorname{softmax}(W_{\text{out}}h)
$$

它的梯度核心受 softmax 协方差矩阵控制；当模型很自信时，熵 $\epsilon$ 很小，梯度范数上界就会接近 $O(\epsilon)$，于是几轮以后几乎没法传。

latent recursion 更稳，是因为 RecursiveLink 本质上是：

$$
J = I + W_2 \Sigma' W_1
$$

也就是“单位映射 + 有界修正”。只要初始化合理、非线性导数有界，整体 Jacobian 就不会远离 1 太多。直白说，文本递归像每次都要穿过一个很窄的门；latent recursion 像沿着一条带扶手的通道前进，信息与梯度都更不容易散掉。

### 训练策略

论文给出的训练设置相对克制，重点是“冻结 base model，只训练 link”：

- 数据：来自 4 个来源，分别覆盖数学、医学/科学、代码、工具增强场景：s1K、m1K、OpenCodeReasoning、ARPO-SFT。
- 数据构造：作者按不同 collaboration pattern 重写 role-specific targets，比如 Sequential 风格里为 Planner、Critic、Solver 分别准备不同监督目标。
- 优化器：AdamW。
- 学习率：5e-4。
- 调度：cosine scheduler。
- batch size：4。
- 最大序列长度：4096 tokens。
- 训练参数：冻结所有 LLM agent 参数，只更新 inner/outer RecursiveLink。
- 推理温度：大多数推理任务 0.6，代码任务 0.2，top-p 0.95。
- 推理长度：MATH500 2000；MedQA、GPQA、LiveCodeBench、MBPP+ 为 4000；AIME2025/2026 为 16000。
- 实验硬件：H100 和 A100 GPU。

值得注意的是，这个方案把“训练整个 MAS”降维成“训练一层很薄的连接器”，所以它比 LoRA 或 Full-SFT 更像一种系统接口学习，而不是模型本体微调。

### 与现有方法的关键区别

| 维度 | 之前的方法 | 本文方法 | 为什么更好 |
|---|---|---|---|
| 通信媒介 | 多数 MAS 用显式文本传递 | 直接传递 latent states | 避免反复 decode / re-encode，速度更快、token 更省 |
| 优化对象 | 优化单个 agent、prompt 或文本反馈 | 优化整个递归协作回路 | 真正学到“系统级协作”，而不是局部补丁 |
| 递归位置 | 通常只在单模型内部递归 | 在整个多 agent 系统级递归 | 扩展的是 collaboration depth，而不仅是 model depth |
| 异构性支持 | 文字虽然通用，但端到端难训练 | 用 outer RecursiveLink 连接不同模型族与维度 | 保留异构组合优势，同时可统一训练 |
| 训练稳定性 | 文本中介导致梯度衰减 | 残差式 latent link 保持稳定梯度 | 更适合多轮递归训练 |

## 实验结果

### Benchmark 设置

论文总共评估了 9 个 benchmark：

1. MATH500
2. AIME2025
3. AIME2026
4. GPQA-Diamond
5. MedQA
6. LiveCodeBench-v6
7. MBPP Plus
8. HotpotQA
9. Bamboogle

覆盖数学、科学、医学、代码生成与搜索问答。注意：主表 Table 2 主要展示了 7 个核心任务，其中代码任务按 Light/Scaled 分别落在 MBPP+ 与 LiveCodeBench；HotpotQA 与 Bamboogle 主要出现在 deliberation-style 的附录结果中。

### 主实验

先看论文在递归深度 $r=3$ 时，与更广泛 baseline 的整体对比。以下表格完全取自原文 Table 3 中明确列出的数值。

| 方法 | MATH500 | AIME2025 | AIME2026 | GPQA-D | LiveCodeBench | MedQA |
|---|---:|---:|---:|---:|---:|---:|
| Single Agent (w/ LoRA) | 83.1 | 70.0 | 73.3 | 62.0 | 37.4 | 76.1 |
| Single Agent (w/ Full-SFT) | 83.2 | 73.3 | 76.7 | 62.8 | 38.6 | 77.0 |
| Mixture-of-Agents (MoA) | 79.8 | 60.0 | 63.3 | 47.6 | 27.0 | 57.5 |
| TextGrad | 84.9 | 73.3 | 76.7 | 62.5 | 39.8 | 77.2 |
| LoopLM | 84.6 | 66.7 | 63.3 | 48.1 | 24.9 | 56.4 |
| Recursive-TextMAS | 85.8 | 73.3 | 73.3 | 61.6 | 38.7 | 77.0 |
| **RecursiveMAS** | **88.0** | **86.7** | **86.7** | **66.2** | **42.9** | **79.3** |

**解读：**
- 论文明确声称：RecursiveMAS 相对“每个 benchmark 上最强 baseline”平均提升 8.3%。
- 提升最大的是高强度推理任务，尤其是 AIME2025 和 AIME2026，说明递归协作更像是在补 reasoning depth，而不是简单补常识记忆。
- 相比 TextGrad、MoA、LoopLM，这个方法的优势在于同时抓住了两件事：系统级协作与 latent-space recursion；只做其一都不够。

### 递归深度带来的性能与效率变化

论文 Table 2 还展示了 RecursiveMAS 与 Recursive-TextMAS 在不同 recursion round 下的对比。这里不逐格抄 12 列主表，而提炼最关键的论文结论：

| 递归轮数 | 平均准确率提升（相对 Recursive-TextMAS） | 平均推理加速 | token 降幅 |
|---|---:|---:|---:|
| r=1 | 原文报告平均 improve 8.1% | 1.2x | 34.6% |
| r=2 | 原文报告平均 improve 19.6% | 1.9x | 65.5% |
| r=3 | 原文报告平均 improve 20.2% | 2.4x | 75.6% |

这里有两个很强的信号：

1. 递归加深后，性能没有塌，反而继续提升；
2. 递归加深后，latent recursion 相对 text recursion 的效率优势还会放大。

这和论文的复杂度分析完全一致：递归越深，文本中间表示反复解码的代价越夸张，而潜空间传递的优势越明显。

### 不同 collaboration patterns 的泛化结果

作者还验证了 RecursiveMAS 是否只适用于 sequential style。结论是否定的：它在另外三种模式里也有收益。

#### Mixture Style

原文 Table 7：

| 方法 | AIME2026 | GPQA-Diamond | LiveCodeBench | MedQA |
|---|---:|---:|---:|---:|
| Math Specialist | 43.3 | 37.4 | 18.9 | 29.0 |
| Code Specialist | 13.3 | 26.2 | 21.5 | 43.3 |
| Science Specialist | 10.0 | 27.0 | 7.6 | 48.1 |
| **RecursiveMAS** | **46.7** | **43.0** | **23.8** | **61.7** |

论文总结为：相对每个任务上的最强 specialist，平均提升 6.2%。这说明 latent recursion 不是简单选一个最强专家，而是真能做跨专家的信息合成。

#### Distillation Style

原文 Table 6：

| 方法 | AIME2026 | GPQA-D | LiveCodeBench | MBPP+ | MedQA | 说明 |
|---|---:|---:|---:|---:|---:|---|
| Expert Model | 90.0 | 72.7 | 46.2 | 73.4 | 86.0 | 最强但最慢 |
| Learner Model | 76.7 | 61.4 | 38.4 | 67.5 | 77.9 | 更快但更弱 |
| **RecursiveMAS** | **83.3** | **70.0** | **40.1** | **71.9** | **83.0** | 在保留效率优势下向 expert 靠近 |

论文给出的归纳是：RecursiveMAS 相比 Learner 平均提升 8.0%，同时仍然保有相对 Expert 的 1.5x 端到端速度优势。

#### Deliberation Style

原文 Table 8：

| 方法 | AIME2026 | GPQA-Diamond | HotpotQA | Bamboogle |
|---|---:|---:|---:|---:|
| Reflector | 76.7 | 61.2 | 27.5 | 40.9 |
| Tool-Caller | 86.7 | 63.1 | 39.6 | 49.8 |
| **RecursiveMAS** | **90.0** | **65.0** | **41.4** | **53.7** |

论文正文总结为：相对原始 tool-calling agent，平均提升 4.8%。这说明 latent recursion 与工具调用并不冲突，反而能让“反思 agent”和“执行 agent”的协作更紧。

### 消融实验（Ablation Study）

#### 1. RecursiveLink 结构设计

原文 Table 4：

| 变体 | Math500 | GPQA-D | LiveCodeBench | 说明 |
|---|---:|---:|---:|---|
| 1-Layer | 84.4 | 63.2 | 40.1 | 最简单线性映射 |
| Res + 1-Layer | 86.7 | 65.3 | 41.4 | 加残差后明显提升 |
| 2-Layer | 85.6 | 64.5 | 40.5 | 仅加深但无残差 |
| **Res + 2-Layer（完整方法）** | **88.0** | **66.2** | **42.9** | 最优 |

**关键发现：**
1. 残差比单纯加深更关键。1-layer 加残差后，甚至比无残差的 2-layer 还强。
2. 完整方法最优，说明“残差保语义 + 两层非线性修正”两者都有贡献。
3. 这和理论部分完全吻合：稳定训练不只是参数多，而是要让映射保留 identity-like 通道。

#### 2. Latent thoughts 长度 m

原文 Table 9：

| Latent Steps m | 0 | 16 | 32 | 48 | 64 | 80 | 96 | 112 | 128 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Math500 | 83.3 | 84.9 | 85.2 | 85.6 | 86.8 | 86.8 | 86.5 | 86.9 | 86.7 |
| GPQA-D | 61.4 | 62.0 | 62.8 | 63.6 | 64.1 | 64.2 | 64.5 | 64.3 | 64.4 |
| LiveCodeBench | 38.1 | 40.3 | 40.7 | 41.4 | 42.0 | 42.5 | 42.2 | 42.6 | 42.6 |

**关键发现：**
1. 从 m=0 到 m≈80，性能持续上涨，说明 latent thinking 预算确实有用。
2. m≈80 后基本进入平台期，说明不需要很长的潜变量链条也能形成有效协作。
3. 这对工程很重要：意味着性能提升不是靠无限拉长隐式 CoT，而是在“适中的 latent budget”里就能见效。

### 效率分析

论文对效率给出了三类明确信号。

#### 1. 理论复杂度优势

文本式 Recursive MAS：

$$
\Theta\big(N(m|V|d_h + (t+m)d_h^2 + (t+m)^2 d_h)\big)
$$

RecursiveMAS：

$$
\Theta\big(N(md_h^2 + (t+m)d_h^2 + (t+m)^2 d_h)\big)
$$

区别在于：前者有每步词表投影的 $m|V|d_h$，后者把这部分替换成潜空间映射的 $md_h^2$。由于实践中 $d_h \ll |V|$，所以 latent recursion 理论上更省。

#### 2. 推理速度

论文正文明确给出：
- r=1：平均 1.2x speedup；
- r=2：平均 1.9x speedup；
- r=3：平均 2.4x speedup。

#### 3. token 使用

论文正文明确给出：
- r=1：34.6% token reduction；
- r=2：65.5% token reduction；
- r=3：75.6% token reduction。

它背后的原因非常直接：RecursiveMAS 只在最终轮末尾输出文本，而 Recursive-TextMAS 每轮、每个 agent 都要把中间结果显式写成文字。

### 可扩展性分析

论文的 scaling 结论主要有两层。

第一层是 recursion depth scaling：
随着推理轮数从 1 增加到 3，RecursiveMAS 在准确率、速度优势、token 优势上都持续改善，没有出现常见的“多轮协作后收益递减到几乎为零”的问题。

第二层是 train-time × inference-time 双重 scaling：
论文 Figure 1 上半部分显示，更深的训练递归会把整条性能前沿整体抬高，而更深的推理递归则继续在这条更高前沿上获得 test-time gain。作者将其解释为：训练递归教会系统形成更适合后续 refinement 的 latent states，推理递归再把这种能力继续释放出来。

### SOTA / 代表方法对照矩阵

注意：以下矩阵中的“成本”与“是否开源”，仅在论文直接提及处填写；未直接给出者明确标注为“正文未说明”。

| 方法 | 类别 | 参数/系统形态 | 核心特点 | 开源 | 成本 |
|---|---|---|---|---|---|
| LoopLM | 单模型递归 | 单模型 latent recursion | 扩展单模型推理深度 | 正文未说明 | 正文未说明 |
| TextGrad | 多智能体优化 | 文本反馈式系统优化 | 用 textual gradients 优化 agent system | 正文未说明 | 正文未说明 |
| MoA | 多智能体架构 | 分层 agent 聚合 | 更偏架构集成，而非递归优化 | 正文未说明 | 正文未说明 |
| Recursive-TextMAS | 文本递归 MAS | 与本文同结构但走文本通信 | 是最直接的 apples-to-apples baseline | 论文实现基线 | 推理成本更高 |
| **RecursiveMAS** | 潜空间递归 MAS | 异构 agents + RecursiveLink + inner/outer training | 把 MAS 整体变成可递归、可训练的 latent computation | 项目页已给出 | 更优 cost-performance |

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐⭐⭐⭐ | benchmark 全是公开任务；训练数据来源公开，但作者还做了 role-specific target 重写，这部分需自行重建。 |
| 代码可得性 | ⭐⭐⭐ | 有项目页，但正文未明确代码仓库链接；复现便利性取决于项目页后续开放程度。 |
| 算力需求 | ⭐⭐⭐ | 推理层面不算离谱，因为只训练 link；但要复现全文多模型、多模式实验，仍需 H100/A100 级资源。 |
| 工程复杂度 | ⭐⭐⭐⭐ | 真正难点不在训练，而在异构 agent 编排、latent state 对接、vLLM/HF 双后端以及评测流水线。 |
| 预期收益 | ⭐⭐⭐⭐⭐ | 如果你的场景已经在做 MAS，这篇工作给的是非常直接的系统级升级路线：更快、更省 token、还能整体提精度。 |

**复现建议：**
最实际的路径不是一次复现全部 4 种 collaboration patterns，而是先从 sequential-style 开始，只做 3 个中小模型 agent，冻结 backbone，仅实现 inner/outer RecursiveLink 与 r=1/2 的训练推理闭环。等验证 latent recursion 能稳定提升后，再扩展到 distillation 或 tool-calling 场景。

## 批判性分析

### 局限性（论文承认的 + 我们发现的）

论文自述与正文可见局限：
1. 主表虽然覆盖多个领域，但 9 个 benchmark 中并不是每个 setting 都完整横向列在一张统一总表里，阅读和对比门槛较高。
2. 整体方法依赖 latent-space 兼容性，虽然 outer RecursiveLink 已经支持异构模型，但是否能跨更大规模、更多架构差异的 agent 稳定泛化，论文还没有完全展开。

我们额外发现的问题：
1. 方法强依赖“最后层隐藏状态是好通信介质”这一假设。对 instruction-tuned LLM 来说这通常成立，但不同模型族最后层表征几何并不一致，outer link 是否会在更极端异构条件下失真，值得继续验证。
2. 训练目标仍然最终靠最后一轮文本答案监督，所以系统能否学到更细粒度的 agent 级分工，仍然部分依赖人工设定 collaboration pattern。
3. 整篇论文主要证明“latent recursion 优于 text recursion”，但与更强的 cache sharing、 KV communication 或其他 latent communication 框架的对比还不充分。

### 改进方向

1. **动态递归深度：** 当前 r 多为固定 1/2/3。下一步可以让系统按题目难度自适应决定递归轮数，避免简单问题过度计算。
2. **更细粒度的 credit assignment：** 现在 outer loop 用最终 CE 做统一反馈，未来可以叠加 agent-level 或 round-level auxiliary objectives，让责任归因更清晰。
3. **更强跨模型接口：** RecursiveLink 目前是轻量 MLP/linear 设计，后续可尝试加入 low-rank routing、token-wise gating、或 KV-cache level transfer，提高极端异构场景的对齐能力。

### 独立观察（论文没说但我们注意到的）

- 这篇论文某种意义上把 MAS 从“prompt orchestration”推向了“differentiable system design”。如果这个方向继续走下去，多智能体系统可能会越来越像神经网络，而不是越来越像聊天脚本。
- RecursiveMAS 与传统 ensemble 最大的区别不是 agent 多，而是 agent 之间存在跨轮、可训练的信息循环。这让它更接近 recurrent computation，而不是一次性投票。
- 如果把这个思路和工具使用、检索、执行环境状态也都 latent 化，未来可能出现“只有最终答案文本化、中间全部隐式协作”的 agent operating system。

### 对领域的影响

这篇论文最可能带来的中期影响，是把 MAS 研究重点从“怎么设计更花哨的 agent 拓扑”转移到“怎么让整个协作系统像一个可训练模型那样缩放”。

短期看，它给了一个很强的工程结论：文本式 agent 对话不是唯一选择，而且很可能不是效率最优选择。中期看，它把 latent reasoning 的 scaling 逻辑从单模型扩展到了系统级 agent collaboration。长期看，如果这条路线成立，那么未来的 agent 系统可能不会主要通过外显对话来协作，而会越来越多地通过潜表示、缓存、状态和可微接口来协作。
