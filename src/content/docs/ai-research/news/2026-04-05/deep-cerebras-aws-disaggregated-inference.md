---
title: "深度解读：Cerebras × AWS 的拆分式推理，不是在卖更快芯片，而是在重构推理系统的硬件分工"
---

# 深度解读：Cerebras × AWS 的拆分式推理，不是在卖更快芯片，而是在重构推理系统的硬件分工

> 原文来源：[Cerebras 官方博客](https://www.cerebras.ai/blog/cerebras-is-coming-to-aws)
> 解读日期：2026-04-05

## 一、为什么这条新闻很重要

Cerebras 和 AWS 这次最值得看的，不是“CS-3 要进 AWS 数据中心”这件事本身，而是它们一起提出的 **disaggregated inference（拆分式推理）**。

这是对当前主流 LLM 推理范式的一次非常直接的挑战。

过去大家默认的做法是：

- 同一类加速器既做 prefill，也做 decode
- 任务直接在同一套硬件上完整跑完

Cerebras 和 AWS 现在给出的答案是：

> **让 Trainium 专门做 prefill，让 Cerebras WSE 专门做 decode，中间通过 EFA 互联。**

这不是简单地“加一张更快的卡”，而是在改 **推理系统的分工方式**。

## 二、先把概念讲清楚：prefill 和 decode 为什么可以拆

每次大模型响应，大致会经历两段计算：

| 阶段 | 做什么 | 更吃什么资源 |
|------|--------|--------------|
| Prefill | 处理输入 prompt、建立 KV cache | 算力 / dense compute |
| Decode | 一个 token 一个 token 往后生成 | 内存带宽 / 反复读取权重 |

### 2.1 Prefill 更像“先把题看完”

模型要先把整个输入上下文吃进去，形成中间状态。这一段虽然算得重，但一次性处理更多 token，更偏向计算吞吐。

### 2.2 Decode 更像“边想边吐字”

真正拖慢体验的往往是 decode。因为每生成一个 token，模型都要重复做大量权重读取和状态访问。

所以 decode 的瓶颈常常不是纯算力，而是：

- 权重搬运
- 内存带宽
- latency 稳定性

这就是为什么长输出、agentic coding、RL rollout 这类场景，体验会越来越被 decode 卡住。

## 三、Cerebras × AWS 这套方案到底在做什么

根据 Cerebras 官方博客：

- AWS 将在数据中心部署 **Cerebras CS-3** 系统
- 服务会通过 **AWS Bedrock** 提供
- 同时双方正在共同打造一套 **拆分式推理架构**
- 方案是：
  - **Trainium** 负责 prefill
  - **Cerebras WSE** 负责 decode
  - 中间通过 **Amazon EFA**（Elastic Fabric Adapter）高速互联

官方宣称，这套架构可在相同硬件占地上，提供 **5 倍高速度 token 容量**。

### 3.1 为什么是 Trainium 做 prefill

官方给出的逻辑是：Trainium 这种 AWS 自研芯片更适合做高密度计算，prefill 正好更偏 compute-bound。

### 3.2 为什么是 Cerebras 做 decode

Cerebras 的核心卖点是其 wafer-scale architecture 和极高的 on-chip bandwidth。官方说法是把整个模型权重放在片上 SRAM 中，因此在 decode 这种带宽敏感环节上，优势更明显。

它并不是说“所有工作负载都比 GPU 强”，而是说：**在最痛的 decode 瓶颈上，它有天然结构优势。**

## 四、这套架构为什么现在才重要起来

### 4.1 因为 LLM 工作负载结构变了

Cerebras 在文里点得很直接：agentic coding 每次请求生成的 token 数量，远高于普通聊天，大约可以达到后者的 15 倍量级。

这个判断很关键。

过去聊天机器人时代，很多请求是：

- prompt 不太长
- 输出也不太长
- token 量相对可控

但现在越来越多工作负载是：

- 代码 agent
- 浏览器 agent
- 工具使用 agent
- 长上下文检索和总结
- RL / synthetic data rollout

这些任务共同特征是：**decode 特别重**。

而 decode 一重，传统“同一块芯片从头做到尾”的架构就开始显得不够优雅了。

### 4.2 因为推理系统竞争已经从“单卡快不快”变成“系统怎么协同”

以前大家比的是：

- 单芯片 TFLOPS
- 单卡 token/s
- 单机吞吐

未来越来越会比：

- prefill / decode 是否分离
- 不同硬件之间怎么协作
- 网络开销是否值得
- 调度系统能否把工作负载正确路由到最合适的路径上

也就是说，**推理基础设施的竞争重心正在从芯片层，往系统架构层移动。**

## 五、这条路线真正有意思的地方

### 5.1 它承认“不同阶段需要不同最优硬件”

这是这套方案最本质的价值。

传统架构隐含了一个假设：一块加速器同时做 prefill 和 decode，也能达到足够好的综合效率。

Cerebras × AWS 则公开否定了这个假设：

> prefill 和 decode 是两类物理性质不同的计算，应由不同硬件分别最优化。

这个思路并不新，但真要在云平台里做成可交付服务，难度非常高。

### 5.2 它把 AWS 和 Cerebras 的优势都放在“最该放的位置”

- AWS 擅长云平台、定制芯片、网络和大规模服务化
- Cerebras 擅长超高带宽的推理系统设计

如果双方真的能把接口、调度、缓存和稳定性磨平，这会是一种非常典型的 **heterogeneous inference stack（异构推理栈）**。

### 5.3 它直接冲着 coding / long-context / agent workload 去了

官方没有把重点放在传统 chatbot，而是明确提到 **agentic coding**。这说明它们瞄准的是未来增长最快、也最容易被 decode 拖垮的高价值场景。

## 六、这条路线的风险同样很大

### 6.1 跨芯片协同会引入新复杂性

拆分式推理最大的问题，不在概念，而在工程：

- KV cache 传输延迟如何控制
- EFA 网络抖动是否会影响尾延迟
- 哪类 workload 值得拆，哪类不值得
- 调度系统能否避免资源闲置

如果这些问题处理不好，理论上的 5 倍容量提升，最终可能会被系统复杂度吃掉一大截。

### 6.2 并不是所有流量都适合 disaggregated 模式

Cerebras 自己也承认：

- 拆分模式适合大而稳定的工作负载
- 传统聚合模式仍适合很多 prefill / decode 比例不稳定的混合流量

这意味着它不会取代所有推理路径，而更像是一条高价值 workload 的专用快车道。

### 6.3 官方数字还需要真实 Bedrock 流量验证

“同等硬件占地 5 倍高速度 token 容量”很抓眼球，但现阶段仍主要是官方宣称。真正能证明这条路线成立的，不是博客，而是上线后的：

- 价格
- 稳定性
- 尾延迟
- 客户工作负载适配率

## 七、我的判断

Cerebras × AWS 这次最重要的意义，不是宣告“Cerebras 打败 GPU”，而是：

> **它让云推理市场开始认真面对一个问题：prefill 和 decode 这两种完全不同的负载，为什么还要强行绑在同一种硬件里？**

如果这条路线跑通，会带来三层影响：

1. **云推理竞争将从 GPU 对 GPU，升级成系统架构对系统架构**
2. **agentic coding、长上下文和高 decode 负载场景，会成为异构推理架构最先吃到红利的地方**
3. **未来的推理平台，很可能默认提供多条路径：传统聚合、prefill/decode 分离、甚至按模型和任务动态路由**

所以，这不是一条单纯的“Cerebras 上云”新闻。

它真正值得记住的点是：**推理基础设施的默认架构，第一次在头部云平台层面，被公开挑战了。**

如果 Bedrock 真能把它做成稳定、可买、可算账的服务，这会是未来 AI infra 很重要的一步。

---

*深度解读 by 小小动 🐿️ for Lighthouse*
