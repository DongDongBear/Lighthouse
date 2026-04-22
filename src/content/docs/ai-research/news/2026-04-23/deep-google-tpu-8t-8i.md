---
title: "Google TPU 8t / 8i：训练与推理双路线，正式为 Agentic Era 重构芯片与网络"
description: "TPU 8t, TPU 8i, Boardfly, Virgo, SparseCore, CAE, FP4, AI Hypercomputer"
---

# TPU 8t and TPU 8i technical deep dive

> 原文链接：https://cloud.google.com/blog/products/compute/tpu-8t-and-tpu-8i-technical-deep-dive
> 关联官宣：https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/tpus-8t-8i-cloud-next/
> 来源：Google Cloud
> 发布日期：2026-04-22

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Google 第八代 TPU 不再试图“一颗芯片打天下”，而是把训练做成 TPU 8t、把采样/推理/后训练做成 TPU 8i。 |
| 大白话版 | 以前像一把大锤兼顾所有活；现在 Google 承认训练和 agent 推理根本不是同一种工作，于是分成两种专用机器。 |
| 核心数字 | TPU 8t：216GB HBM、128MB SRAM、12.6 PFLOPs FP4；TPU 8i：288GB HBM、384MB SRAM、10.1 PFLOPs FP4；8t 训练性价比较 Ironwood 提升最高 2.7x；8i 推理性价比提升最高 80%；两者能效最高 2x；8i pod 最多 1,024 active chips / 1,152 chips 连接规模；8t 单 fabric 可连超 134,000 颗芯片。 |
| 评级 | A — 基础设施范式级更新 |
| 代码 / 可用性 | Google Cloud 即将提供；需提交 interest form |
| 关键词 | TPU 8t, TPU 8i, Boardfly, Virgo Network, SparseCore, CAE, FP4, AI Hypercomputer |

## 核心 Insight

Google 这次真正的新意不是“第八代 TPU 更快”，而是它明确承认：预训练、后训练、实时 serving、reasoning-heavy agent、MoE 路由、长上下文解码，已经不再共享同一组硬件瓶颈。

以前行业还习惯讨论“训练芯片”和“推理芯片”是一个连续体，只是在软件栈上做不同调度；Google 这次直接在芯片、互连和系统拓扑上把两条路线拆开。TPU 8t 追求的是大规模训练吞吐、embedding-heavy 负载和跨超大集群扩展；TPU 8i 追求的是高并发推理、autoregressive decoding、reasoning / MoE 的 all-to-all 延迟。

这背后的直觉很简单：
- 训练最怕吞吐不够、数据搬运慢、embedding / collectives 拖垮矩阵算力
- agent 推理最怕 KV cache 放不下、collective 同步太慢、跨 chip hop 太多、tail latency 爆炸

Google 的答案不是继续堆 FLOPS，而是把系统设计从“通用计算”转向“工作负载专用基础设施”。

### 为什么这个想法 work？

因为训练和推理的“最贵环节”已经明显分化：
- 在大规模训练里，核心是如何让数千到数十万芯片持续高利用率地并行推进参数更新。
- 在 agentic inference 里，核心是如何让每一步采样、同步、KV cache 访问和专家路由都尽可能低延迟。

如果还强行用同一种互连拓扑、同一种片上资源分配、同一种专用单元去覆盖两类任务，结果往往是两边都不是最优。

## 方法详解

### 整体架构

Google 把第八代 TPU 作为 AI Hypercomputer 的两个关键部件推出：

```text
训练/预训练路径：
数据 + 存储 → Axion CPU header → TPU 8t + SparseCore + Virgo → 超大训练集群

采样/推理路径：
请求/上下文/KV cache → Axion CPU header → TPU 8i + CAE + Boardfly → 高并发推理/后训练/思维链解码
```

两者都延续 Google 的系统级协同设计，但关键组件明显分叉。

### 关键技术组件

#### 组件 1：TPU 8t（pre-training powerhouse）

**做什么：** 专为大规模预训练、embedding-heavy 工作负载和跨超大训练集群扩展而设计。

**怎么做：**
- 采用 3D torus 网络拓扑
- 单 superpod 规模扩大到 9,600 chips
- 使用 SparseCore 处理 embedding lookup 与数据依赖型 collectives
- 强化 VPU/MXU overlap
- 引入 native FP4
- 借助 Virgo Network 实现更大规模的 scale-out fabric

##### 8t 的 SparseCore

**做什么：** 把 embedding lookup 这类不规则内存访问、all-gather 等工作从矩阵乘单元中剥离出来。

**为什么重要：**
MoE、推荐、embedding-heavy 模型里，真正卡住系统的经常不是矩阵乘，而是稀疏访问与数据重排。SparseCore 的意义，就是让 MXU 专心做 dense math，不要被零操作与数据依赖拖慢。

##### 8t 的 VPU/MXU overlap

原文强调通过更平衡的 VPU scaling，减少 vector ops 暴露时间，从而把 quantization、softmax、layernorm 更好地与 MXU 的矩阵乘重叠。

直白说就是：不要让矩阵乘单元干完后站着等向量处理收尾，而是尽量并发起来，让芯片空转更少。

##### 8t 的 native FP4

原文说法非常明确：
- 引入原生 4-bit floating point
- 主要为了缓解 memory bandwidth bottleneck
- MXU throughput 翻倍
- 在低比特量化下仍尽可能保持大模型精度

它背后的机制是：
- 参数占用更小
- 数据搬运更少
- 更多 layer 能放进局部 buffer
- 因而更容易把算力喂满

##### 8t 的 Virgo Network

这是 8t 另一块核心升级。

原文给出的关键点：
- 数据中心网络带宽最高 4x 提升
- 采用 high-radix switches
- 两层 non-blocking topology
- 多平面独立控制域
- 单 fabric 可连超过 134,000 个 TPU 8t 芯片
- 单 fabric 提供最高 47 Pb/s non-blocking bi-sectional bandwidth
- 可实现 1.6M ExaFlops 以上并保持近线性扩展

这说明 Google 不只在造芯片，而是在把 scale-out fabric 做成训练超级集群的第一等资产。

##### 8t 的存储路径：TPUDirect RDMA + TPUDirect Storage

这是整篇里最容易被忽略、但非常关键的一部分。

Google 引入：
- TPUDirect RDMA：NIC 直接与 TPU HBM 通信，绕过 CPU / DRAM
- TPUDirect Storage：TPU 直接访问高速托管存储（如 10T Lustre）

原文给的结论是：
- 让数据以 line rate 进入 silicon
- 训练大规模多模态数据时让 MXU 持续饱和
- 与 Managed Lustre 10T 搭配时，相比 Ironwood，训练存储访问速度可提升 10x

这说明 Google 把“喂数据”看成和“算得快”同样关键的问题。

#### 组件 2：TPU 8i（sampling and serving specialist）

**做什么：** 为 post-training、高并发推理、reasoning、MoE 和长上下文解码优化。

**怎么做：**
- 更大的片上 SRAM
- 新的 Collectives Acceleration Engine（CAE）
- 新的 Boardfly serving-optimized interconnect topology

##### 8i 的大 SRAM

原文给出的数字：
- 相比上代，片上 SRAM 提高 3x
- 8i 总片上 SRAM（Vmem）达到 384MB

其直接用途是：
- 更大的 KV cache 可以更多留在 on-silicon
- 减少长上下文 decoding 时 core 的 idle time

这非常符合 reasoning / agent workload 的痛点，因为这类任务往往不是一次性大吞吐，而是持续解码、持续看历史、持续同步。

##### 8i 的 CAE（Collectives Acceleration Engine）

这是 8i 最有辨识度的新单元。

**做什么：**
专门加速 auto-regressive decoding 和 chain-of-thought 处理中常见的 reduction / synchronization。

原文给出的结构信息：
- 每颗 8i 有两个 Tensor Cores on-core dies
- 一个 CAE 在 chiplet die 上
- 取代了 Ironwood 中四个 SparseCore 的位置
- 使片上 collective latency 降低 5x

**为什么重要：**
推理尤其是 reasoning / MoE，不是每一步都在做大矩阵乘；它经常被各种同步、聚合和 token 路由的等待卡住。CAE 的作用就是给这种“不是计算不够、而是同步太慢”的场景开专门快车道。

##### 8i 的 Boardfly 拓扑

这是本文最值得细看的系统设计。

Google 说，3D torus 适合 dense training 的邻近通信，但对 reasoning / MoE 这种 all-to-all 工作负载来说，mesh 太大意味着 hop 太多、延迟太高。

于是 8i 改成 Boardfly：
- fully connected boards 再组成 group
- high-radix 设计
- 最多连接 1,152 chips
- 最终 pod 结构支持 36 groups
- 1,024 active chips
- 任意 chip 间最大延迟为 7 hops

相比之下，原文还做了 torus vs Boardfly 数学对比。

对于 8 x 8 x 16 的 1024-chip 3D torus：

```text
3D torus diameter = 8/2 + 8/2 + 16/2 = 16 hops
```

Boardfly 把这个 network diameter 从 16 hops 降到 7 hops。

Google 明确给出：
- network diameter 降低 56%
- communication-intensive workload latency 最多改善 50%

这件事之所以关键，是因为 MoE 和 reasoning 模型最怕 token 在专家和芯片之间绕太久。Boardfly 不是更抽象的拓扑名词，而是在直接解决“代理越聪明、跨芯片通信越拖后腿”的现实瓶颈。

### 训练策略 / 软件栈

Google 在软件侧强调两个层次：

1. **同一套性能优先软件栈**
   - JAX
   - PyTorch（native PyTorch for TPUs in preview）
   - Keras
   - XLA
   - Pallas
   - Mosaic
   - Pathways
   - vLLM

2. **针对专用硬件暴露更细粒度控制**
   - Pallas 用 Python 写硬件感知 kernel
   - 能更充分利用 8i 的 CAE 和 8t 的 SparseCore

这说明 Google 不想让新架构成为“只有内部团队能吃满”的黑盒，而是试图把定制内核能力也外放给开发者。

### 与现有方法的关键区别

| 维度 | Ironwood / 传统统一路线 | TPU 8t / TPU 8i 双路线 | 为什么更好 |
|---|---|---|---|
| 设计理念 | 一代芯片覆盖大多数阶段 | 训练与采样/推理明确分拆 | 减少两类负载互相妥协 |
| 训练核心瓶颈 | 更偏通用吞吐优化 | SparseCore + Virgo + FP4 + Direct Storage | 训练集群更易喂满 |
| 推理核心瓶颈 | 依赖通用互连与缓存 | 大 SRAM + CAE + Boardfly | 长上下文与 MoE 延迟更低 |
| 集群扩展 | 强 | 更强且更专用 | 8t 面向超大训练、8i 面向低延迟推理 |

## 实验结果

### 主规格与性能表

| 项目 | TPU 8t | TPU 8i |
|---|---:|---:|
| 主工作负载 | 大规模预训练 | 采样、serving、reasoning |
| 网络拓扑 | 3D torus | Boardfly |
| 专用单元 | SparseCore | CAE |
| HBM 容量 | 216 GB | 288 GB |
| 片上 SRAM | 128 MB | 384 MB |
| 峰值 FP4 | 12.6 PFLOPs | 10.1 PFLOPs |
| HBM 带宽 | 6,528 GB/s | 8,601 GB/s |
| CPU header | Arm Axion | Arm Axion |

### 相比上代的关键提升

| 指标 | 提升幅度 | 解读 |
|---|---:|---|
| TPU 8t 训练 price-performance | 最高 2.7x | Google 正在用成本曲线争训练单 |
| TPU 8i 推理 price-performance | 最高 80% | 尤其针对低延迟大 MoE 推理 |
| 性能/瓦 | 最高 2x | AI 工厂时代的关键指标 |
| 8t scale-out DCN 带宽 | 最高 4x | 训练不再轻易被 fabric 卡住 |
| 8i 片上 collectives latency | 5x 降低 | CAE 直击 reasoning 同步瓶颈 |
| 8i 通信密集型延迟 | 最高 50% 改善 | Boardfly 对 all-to-all 更友好 |
| 8t 存储访问 | 最高 10x | TPUDirect + Managed Lustre 10T 的结果 |

### 可扩展性分析

原文给出两条扩展线：

1. **TPU 8t 训练扩展**
   - 单 superpod：9,600 chips
   - 单 Virgo fabric：>134,000 chips
   - JAX + Pathways：理论上单训练集群可扩到 100 万+ TPU chips

2. **TPU 8i 推理 / 后训练扩展**
   - 单 pod：1,024 active chips
   - 连接规模：1,152 chips
   - 重点不在更大绝对规模，而在更低通信直径与更低 tail latency

### SOTA / 行业对照矩阵

| 路线 | 代表设计 | 本轮关键信号 |
|---|---|---|
| NVIDIA | Blackwell / Rubin，机架级 NVL72 | 更强调通用超大系统与 token/MW |
| Google | TPU 8t / 8i 双路线 | 训练/推理正式硬件分叉 |
| AWS | Trainium 系列 | 继续冲云内自研训练 / 推理闭环 |
| 行业整体 | 通用加速器逐步专用化 | agentic workload 正推动硬件重新分层 |

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐ | 不适用，属于云侧专有硬件体系 |
| 代码可得性 | ⭐⭐ | 软件栈可用，但硬件本身不可复现 |
| 算力需求 | ⭐⭐⭐⭐⭐ | 企业与超大研究机构级别，普通团队只可能租用 |
| 工程复杂度 | ⭐⭐⭐⭐⭐ | 需要深度理解分布式训练、互连、kernel 优化 |
| 预期收益 | ⭐⭐⭐⭐⭐ | 对前沿训练和 agentic 推理工作负载有决定性价值 |

**复现建议：**
如果你是普通团队，复现的实际路径不是“复刻硬件设计”，而是：
1. 先用 JAX / PyTorch / Pallas 理解其软件抽象；
2. 把自己的 workload 分类到更像 8t 还是 8i；
3. 评估你到底是被吞吐卡住，还是被 KV cache / collectives / all-to-all 延迟卡住；
4. 再决定是否值得迁移到 TPU 8 系列。

## 批判性分析

### 局限性（原文承认的 + 额外发现）

原文没有回避一个事实：这是高度专用化架构。专用化带来高效率，也带来更强的平台锁定和工作负载选择性。

我们额外看到的几个问题：
1. **双路线意味着开发与采购决策更复杂。** 训练用 8t、推理用 8i 很合理，但也意味着团队要更精细地拆 workload，不能再只看单一 SKU。
2. **软件抽象是否足够好仍然关键。** 再好的 CAE、SparseCore、Boardfly，如果最终只被内部工程师吃满，生态效果会打折。
3. **Google 把“agentic era”写进芯片叙事，但真正的 agent benchmark 还没统一。** 今天更多还是用系统指标在推断 agent 收益，而不是直接拿统一 agent workload 基准来比较。

### 改进方向

1. **公开更细的 workload-level benchmark：** 最好直接给 reasoning、MoE、长上下文 decode、RL post-training 等维度的对比。
2. **降低迁移摩擦：** 如果 native PyTorch TPU 体验足够成熟，8i/8t 的采用速度会快很多。
3. **形成行业标准化 agent infra 指标：** 比如 token latency、KV residency、MoE route latency、token/MW 等，帮助客户真正比较平台。

### 独立观察

- 这次发布说明“agentic AI”已经不是上层应用口号，而是能反向改写底层芯片与网络架构的 workload reality。
- Google 不是单纯模仿 NVIDIA 的系统化路线，而是在 TPU 8i 上押注更激进的 serving-specific topology。这是明显的差异化选择。
- 8i 的 Boardfly 与 CAE 组合，本质上是在为 MoE + reasoning 的 all-to-all 通信税开刀；这恰好是未来 agent 时代最贵的一类隐性成本。
- 如果 TPU 8 系列真能兑现文中这些数字，Google 在“训练之外的 agent 推理基础设施”上会比很多人想象得更凶。