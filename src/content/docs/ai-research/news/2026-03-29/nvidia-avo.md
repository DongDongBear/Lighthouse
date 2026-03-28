---
title: "AVO：NVIDIA 用自主 Coding Agent 替代进化搜索算子，7 天写出最快 Attention Kernel"
description: "AVO, Agentic Variation Operators, 进化搜索, CUDA Kernel, FlashAttention, Blackwell GPU, Warp Specialization, NVIDIA"
---

# AVO: Agentic Variation Operators for Autonomous Evolutionary Search

> 原文链接：https://arxiv.org/abs/2603.24517
> 作者：Terry Chen, Zhifan Ye, Bing Xu, Zihao Ye, Timmy Liu, Ali Hassani, Tianqi Chen, Andrew Kerr, Haicheng Wu 等（共 23 位作者）
> 机构：NVIDIA（全员）
> 发布日期：2026-03-25

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 用自主 coding agent 替代进化搜索中的固定 mutation/crossover 算子，7 天连续进化出超越 cuDNN 和 FlashAttention-4 的 attention kernel |
| 大白话版 | 传统进化算法靠固定规则"变异"代码，AVO 让一个会写 CUDA 的 AI agent 自己读代码、查文档、跑测试、改 bug，像一个不眠不休的高级工程师一样连续优化 7 天，最终在 NVIDIA 最新 Blackwell GPU 上写出了目前最快的 attention 实现 |
| 核心数字 | 峰值 1668 TFLOPS (BF16)；causal MHA vs FA4 最高 +10.5%；GQA vs cuDNN 最高 +7.0%；7 天产出 40 个 kernel 版本，探索 500+ 候选方向 |
| 评级 | A- — 方法论创新性强（agent-in-the-loop evolution），工程结果令人信服，但作为 NVIDIA 内部工作，外部复现门槛极高 |
| 代码 | 未开源 |
| 关键词 | Evolutionary Search, Agentic Variation, CUDA Kernel Optimization, FlashAttention, Blackwell B200, Warp Specialization, Attention |

## 核心 Insight

进化搜索（Evolutionary Search）是一种经典的优化范式：维护一组候选解，通过 mutation 和 crossover 产生新候选，按适应度筛选。但在高度结构化的工程优化问题中（如 GPU kernel 优化），传统的变异算子面临根本性困境：

**有效的 mutation 需要对问题域的深度理解，而固定的算子无法编码这种理解。**

一个 CUDA kernel 的性能瓶颈可能来自寄存器溢出、warp 同步开销、内存访问模式、指令流水线气泡等截然不同的原因。盲目的代码变异几乎不可能同时理解这些约束并产生有意义的改进。

AVO 的核心洞察是：**将"变异"这一步从固定算子升级为自主 agent 循环。** Agent 不是单次生成候选代码，而是一个完整的工作循环——阅读历史代码谱系、对比 profiling 数据、查阅硬件文档、实现优化、运行测试、诊断失败、迭代修正——只有在正确性通过且性能提升时才提交。

形式化地：

- 传统进化：`Vary(P_t) = Generate(Sample(P_t))` — 从当前种群采样，单次生成
- AVO：`Vary(P_t) = Agent(P_t, K, f)` — agent 访问完整谱系 P_t、领域知识库 K、评分函数 f

这个范式转换的意义在于：agent 将进化搜索从"随机探索 + 选择压力"变成了"知识引导的探索 + 选择压力"。变异不再是盲目的，而是由对问题结构的理解驱动的。

### 为什么这个想法 work？

三个关键要素的结合：

1. **完整的谱系信息**：Agent 不只看当前最优解，而是看所有历史版本及其分数。这让它能识别哪些方向有潜力（分数上升趋势）、哪些是死胡同（反复尝试但无进展）。
2. **领域知识库 K**：包含 CUDA 编程指南、PTX ISA 文档、Blackwell 架构规格。这是传统进化算子完全不具备的——agent 可以根据具体瓶颈查阅相关文档来设计优化策略。
3. **闭环反馈 f**：评分函数同时检查正确性和吞吐量（TFLOPS）。Agent 可以在一次变异步骤内进行多轮"尝试-测试-修正"循环，而不是像传统进化那样每次变异只产生一个候选。

## 方法详解

### 整体架构

```
种群 P_t（历史版本 + 分数，以 git commits 形式存储）
    ↓
[Agent 变异循环]
├─ 1. 检查谱系中多个历史版本
├─ 2. 对比 profiling 特征，识别瓶颈
├─ 3. 查阅硬件文档（CUDA guide, PTX ISA, arch specs）
├─ 4. 实现候选优化
├─ 5. 调用评分函数 f = correctness + throughput(TFLOPS)
├─ 6. 失败 → 诊断并修正 → 回到步骤 4
└─ 7. 通过 → 提交为新版本（git commit + score）
    ↓
[自监督机制]
├─ 检测停滞/非生产性循环
└─ Supervisor 审查轨迹，引导探索新方向
    ↓
连续运行 7 天 → 40 个 kernel 版本，500+ 候选方向
```

### 关键技术组件

#### 组件 1: Agent 内部的变异工作流

**做什么：** 在单次变异步骤内完成一个完整的"理解-优化-验证"循环。

**怎么做：**

Agent 在每次变异中执行以下步骤：

1. **谱系分析**：检查种群中多个历史实现，不仅看最优版本，还看次优版本和失败版本。通过对比不同版本的代码和性能特征，理解哪些修改有效、哪些无效。
2. **瓶颈识别**：比较 profiling 数据（寄存器使用、内存访问模式、warp 占用率等），定位当前版本的性能瓶颈。
3. **知识检索**：根据识别到的瓶颈，查阅知识库 K 中的相关文档。例如发现寄存器溢出时查阅 PTX ISA 中的寄存器分配规则。
4. **实现优化**：基于分析和知识编写具体的代码修改。
5. **评估**：运行评分函数，检查正确性和吞吐量。
6. **诊断与修正**：如果失败（正确性不通过或性能下降），分析原因并修改方案。这一步可能循环多次。
7. **提交**：只有正确性通过且性能有改善时才将版本提交到种群中。

**关键区别：** 传统进化中一次变异 = 一次代码修改。AVO 中一次变异 = 一个完整的多轮优化会话。Agent 在内部已经完成了"试错-修正"循环，提交到种群的是经过验证的改进。

#### 组件 2: Blackwell GPU Warp Specialization 架构

**做什么：** 定义了 agent 优化的目标 kernel 架构——Blackwell GPU 上的 warp-specialized attention。

**架构细节：**

不同的 warp 组被分配了专门的角色：

| Warp 组 | 职责 | 关键操作 |
|---|---|---|
| MMA warps | 执行矩阵乘法 | QK GEMM 和 PV GEMM，使用 tensor core 指令 |
| Softmax warps | 计算注意力权重 | 使用 online softmax 算法 |
| Correction warps | 修正输出累加器 | 当 running maximum 变化时重新缩放 |
| Load/Epilogue warps | 数据搬运 | 通过 Tensor Memory Accelerator (TMA) 加载数据 |

整体采用 dual Q-stage pipeline，同时处理两个 query tile，最大化硬件利用率。

**意义：** 这种高度专业化的架构意味着优化空间极其复杂——每个 warp 组的寄存器分配、流水线时序、同步策略都相互耦合。这正是传统进化算子难以处理而 agent 可以有效应对的问题类型。

#### 组件 3: Agent 发现的三个代表性优化

以下三个优化展示了 agent 在进化过程中自主发现的微架构级改进。每一个都需要对 GPU 硬件行为的深度理解。

**优化 1: Branchless Accumulator Rescaling (v19 -> v20)**

- **问题**：Online softmax 算法中，当 running maximum 更新时需要对累加器进行 rescaling。原始实现使用条件分支（if maximum changed, then rescale）。这个条件分支导致每次迭代都产生 warp 同步开销——因为不同线程可能走不同分支路径。
- **解决方案**：改为 branchless speculative 路径——无论 maximum 是否变化，总是计算 rescale factor。当不需要 rescaling 时，通过 predicated select 将 factor 设为 1.0。消除了条件分支和相应的 warp 同步。
- **性能影响**：non-causal +8.1%，causal +1.6%
- **分析**：这是最大的单次提升。Non-causal 提升远大于 causal 的原因可能是：non-causal attention 中 maximum 更新频率更高（需要遍历所有 KV），分支预测失败的代价更大。

**优化 2: Correction/MMA Pipeline Overlap (v29 -> v30)**

- **问题**：在 dual Q-stage pipeline 中，correction warp 在第二个 PV GEMM 期间处于空闲状态。MMA warp 到 correction warp 的边界是串行化的——必须等 GEMM 完全完成才开始 correction。
- **解决方案**：重构流水线，让 correction warp 在第二个 PV GEMM 执行期间就开始处理第一个 stage 的 normalization。两个操作重叠执行而非串行。
- **性能影响**：non-causal +1.1%，causal +0.4%
- **分析**：这是一个经典的指令级并行优化，需要理解 warp 间的依赖关系和数据流。Agent 识别出了 correction warp 的空闲窗口并利用了它。

**优化 3: Register Rebalancing (v32 -> v33)**

- **问题**：寄存器在不同 warp 组间的分配不均衡。Correction group 只有 80 个寄存器，导致溢出到 local memory（高延迟）。而 softmax group 有 192 个寄存器，存在余量。
- **解决方案**：重新分配寄存器：
  - Softmax group：192 -> 184（释放 8 个）
  - Correction group：80 -> 88（获得 8 个，消除溢出）
  - Load/Epilogue group：48 -> 56（获得 8 个）
- **性能影响**：non-causal +2.1%，causal ~0%
- **分析**：寄存器分配是一个需要全局视野的优化——改变一个 warp 组的分配会影响整个 kernel 的占用率和溢出行为。Agent 通过分析 profiling 数据发现了溢出瓶颈，并找到了从富余组向不足组转移的方案。

### 持续进化机制

| 维度 | 详情 |
|---|---|
| 运行时长 | 7 天连续 |
| 产出版本 | 40 个 kernel 版本 |
| 探索方向 | 500+ 候选方向（绝大多数不成功） |
| 版本管理 | 每个版本作为 git commit 持久化，附带分数 |
| 停滞检测 | 自监督机制检测非生产性循环 |
| 方向引导 | Supervisor 审查轨迹，在停滞时引导向新方向探索 |
| 进化模式 | v1-v20 粗粒度大幅提升；v21-v40 微架构级小幅复合改进 |
| 关键拐点 | 5 个主要架构拐点：v8, v13, v20, v30, v33 |

## 实验结果

### 实验设置

| 项目 | 详情 |
|---|---|
| 硬件 | NVIDIA B200 GPU |
| 软件环境 | CUDA 13.1, PyTorch 2.10.0 |
| 基线 | cuDNN 9.19.1, FlashAttention-4 (commit 71bf77c) |
| Head dimension | 128 |
| 精度 | BF16 |
| 序列长度 | {4096, 8192, 16384, 32768} |
| 总 token 数 | 32,768（batch size 随序列长度调整） |
| MHA 配置 | 16 heads, causal & non-causal |
| GQA 配置 | 32 query heads, 4 KV heads (group=8) 和 8 KV heads (group=4) |
| 统计方法 | 每配置 10 次运行，报告均值和标准差 |

### MHA 性能结果

峰值吞吐量：**1668 TFLOPS** (BF16)

**Causal Attention：**

| 序列长度 | vs cuDNN | vs FA4 |
|---|---|---|
| 4096 | +0.4% | +5.0% |
| 8192 | — | — |
| 16384 | — | — |
| 32768 | +3.5% | +10.5% |
| 趋势 | 序列越长增益越大 | 序列越长增益越大 |

- vs cuDNN：+0.4% 到 +3.5%
- vs FA4：+5.0% 到 +10.5%
- 在长序列上增益最大

**Non-Causal Attention：**

| 序列长度 | vs cuDNN | vs FA4 |
|---|---|---|
| 短序列 (<=8192) | within noise | within noise |
| 长序列 (>=16384) | +1.8% to +2.4% | +1.8% to +2.4% |

- 短序列上差异在噪声范围内
- 长序列（>=16384）上有 +1.8% 到 +2.4% 的稳定增益

### GQA 迁移结果

Agent 从 MHA kernel 迁移到 GQA 仅用了 **30 分钟**适配时间。

**Causal GQA：**

| 基线 | 最大增益 |
|---|---|
| vs cuDNN | +7.0% |
| vs FA4 | +9.3% |

**Non-Causal GQA：**

| 基线 | 最大增益 |
|---|---|
| vs cuDNN | +6.0% |
| vs FA4 | +4.5% |

GQA 上的增益普遍大于 MHA，表明 AVO 发现的优化在 grouped query 场景下有更好的泛化效果。

### Appendix A: FA4 论文基线对比

论文还与 FA4 原始论文报告的数字进行了对比（消除实现差异的影响）：

| 模式 | vs cuDNN | vs FA4 |
|---|---|---|
| Non-causal | +1.4% to +3.4% | +2.3% to +3.9% |
| Causal | +3.6% to +7.5% | +3.7% to +8.8% |

### 进化轨迹分析

| 阶段 | 版本范围 | 特征 |
|---|---|---|
| 早期 | v1 - v8 | 基础架构探索，建立 warp specialization 框架 |
| 中期 | v8 - v20 | 粗粒度优化，大幅性能跳跃（如 v20 branchless rescaling +8.1%） |
| 后期 | v21 - v40 | 微架构级精细优化，单次改进幅度小但持续复合 |
| 拐点 | v8, v13, v20, v30, v33 | 五个主要架构拐点，每个对应一类关键优化发现 |

整体呈现收益递减模式——这与人类工程师优化 kernel 的经验一致：早期的"低垂果实"容易获得大幅提升，后期需要越来越精细的微架构理解才能榨取剩余性能。

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | N/A | 不涉及训练数据，目标是 kernel 优化 |
| 代码可得性 | 1/5 | 未开源。生成的 kernel 和 agent 系统均未公开 |
| 算力需求 | 1/5 | 需要 Blackwell B200 GPU（目前极难获取）+ 7 天连续 agent 运行 |
| 工程复杂度 | 1/5 | 需要构建完整的 agent 进化框架、CUDA profiling 集成、domain knowledge 管道 |
| 预期收益 | 3/5 | 方法论可迁移到其他 kernel 优化场景，但具体 kernel 结果只对 B200 用户有价值 |

**复现建议：** 严格意义上几乎无法复现——需要 B200 硬件、闭源的 agent 系统、以及 NVIDIA 内部的 CUDA 知识库。但方法论层面，可以在更小的规模上验证核心思想：用 LLM agent 替代传统进化算子来优化 CUDA kernel。可参考的开源框架包括 TritonBench + 开源 LLM，在 consumer GPU 上的 Triton kernel 优化中尝试类似流程。

## 批判性分析

### 局限性

**论文本身的局限：**

1. **单一任务验证**：AVO 只在 attention kernel 这一个任务上验证。虽然 attention 是最重要的 kernel 之一，但无法确认该方法在其他 kernel 类型（如 convolution、scan、reduction）上是否同样有效。
2. **收益递减**：40 个版本的进化轨迹显示明显的收益递减。v20 之后的 20 个版本累计提升可能不超过 v19-v20 单次提升。长时间运行的成本效益比值得审视。
3. **单一硬件平台**：所有实验在 B200 上进行。不同 GPU 架构（如 AMD MI300X、Intel Gaudi）的优化空间和有效策略可能完全不同。

**我们额外发现的问题：**

1. **Agent 能力的不透明性**：论文没有详细说明使用了什么 LLM 作为 agent 的基础模型，也没有分析 agent 的 failure mode。500+ 候选方向中的 460+ 个失败方向是什么样的？Agent 犯了哪些系统性错误？这些信息对理解方法的适用边界至关重要。

2. **Supervisor 的角色模糊**：论文提到 "supervisor reviews trajectory, steers toward fresh directions"，但没有说明 supervisor 是人类还是另一个 AI 系统。如果是人类，那 AVO 的"自主性"就需要打折扣——人类引导可能才是跨越关键拐点的真正原因。

3. **与 cuDNN/FA4 的比较公平性**：cuDNN 和 FA4 需要兼容多种硬件和配置，而 AVO 的 kernel 是为特定硬件（B200）、特定配置（head_dim=128, BF16）专门优化的。在通用性 vs 峰值性能的取舍上，两者不在同一维度竞争。

4. **可重复性问题**：Agent 的行为具有随机性（LLM 采样），7 天的进化轨迹是否可重复？不同运行是否会收敛到相似的性能水平和相似的优化策略？论文完全没有讨论这一点。

### 改进方向

1. **多 Agent 协作进化**：当前是单 agent 串行进化。可以引入多个 agent 并行探索不同优化方向（如一个专注寄存器优化、一个专注流水线重排、一个专注内存访问模式），通过种群选择机制整合最优方案。

2. **可迁移的优化知识**：Agent 在一次进化中积累的优化知识（如 "branchless rescaling 比 conditional rescaling 快"）应该被形式化并存入知识库 K，供后续在其他 kernel 上复用。目前的知识库似乎只包含静态文档。

3. **自动化硬件适配**：将 AVO 框架扩展为给定新硬件（如下一代 GPU），自动从已有 kernel 出发进行适配性进化。这比从零开始优化更高效。

4. **开放评估**：发布 AVO 生成的 kernel 代码（即使不开放 agent 系统），让社区在相同硬件上验证性能数据。

### 独立观察

1. **"AI 写 AI 基础设施"的闭环正在形成**：AVO 的核心场景——用 AI agent 优化 GPU kernel——意味着 AI 正在优化运行 AI 的底层硬件软件栈。结合最近 Google 用 AI 设计 TPU、DeepMind 用 AlphaCode 优化排序算法等工作，AI 自我改进底层基础设施的趋势越来越明显。

2. **对 kernel 工程师的影响**：这篇论文的潜台词是：顶级 CUDA kernel 优化——一个需要多年经验积累的高度专业化技能——可以被 agent 在 7 天内达到甚至超越。如果方法泛化成功，kernel 工程师的角色可能从"手写优化"转向"设计 agent 的搜索空间和评估指标"。

3. **进化搜索 + Agent 的范式价值**：AVO 的方法论不限于 kernel 优化。任何可以用代码表达、有明确评分函数的工程优化问题（编译器 pass 设计、网络协议调优、数据库查询优化）都可以套用这个框架。核心公式 `Vary(P_t) = Agent(P_t, K, f)` 是一个通用的"agent-augmented evolution"范式。

4. **与 FlashAttention 系列的竞合关系**：FA 系列（FA1 -> FA2 -> FA3 -> FA4）由 Tri Dao 等人通过人类专家洞察驱动。AVO 在 FA4 基础上进一步优化 5-10%，说明 agent 可以在人类专家的工作之上继续压榨性能。但值得注意的是，AVO 的初始 kernel（v1）很可能就是基于 FA4 的架构设计——agent 的贡献更多是微架构级的精细调优，而非全新的算法设计。

### 对领域的影响

**短期：** AVO 产出的 kernel 可能直接集成到 NVIDIA 的 cuDNN 中，成为 Blackwell GPU 上的默认 attention 实现。这对所有在 B200 上运行 LLM 推理/训练的用户意味着免费的性能提升。

**中期：** "Agent-augmented evolution" 作为 kernel 优化方法论可能被更广泛采用。预计其他硬件厂商（AMD、Intel、国产 GPU 厂商）会尝试类似方法来加速自己的 kernel 库开发。

**长期：** 如果 AVO 的框架泛化成功，它可能改变高性能计算软件的开发模式——从"人类工程师手动优化"变为"人类定义搜索空间和评估指标，agent 自动搜索最优实现"。这将大幅降低为新硬件编写高性能 kernel 的时间和人力成本。
