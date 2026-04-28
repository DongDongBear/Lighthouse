---
title: "深度解读 | Poolside Laguna：欧洲 agentic coding 公司第一次把模型、终端 Agent、云开发环境一起推到台前"
description: "Poolside, Laguna M.1, Laguna XS.2, pool, Shimmer, agentic coding, MoE, open weights, Muon, async RL, Harbor Framework"
---

# Introducing Laguna XS.2 and Laguna M.1 / Laguna XS.2 and M.1: A Deeper Dive

> 主原文：https://poolside.ai/blog/introducing-laguna-xs2-m1
> 技术补充：https://poolside.ai/blog/laguna-a-deeper-dive
> 来源：Poolside Blog
> 发布日期：2026-04-28
> 核对说明：已完整通读 Poolside 当天发布的两篇原文；第一篇是产品/发布公告，第二篇是技术补充。Poolside 明确说更完整 technical report “即将发布”，因此本文只使用这两篇官方已公开材料中的事实与数字。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Poolside 不是单独发两个模型，而是把“模型 + 终端 coding agent + 云开发环境”打成一整套 agentic coding 栈，正式从融资叙事切到产品叙事。 |
| 大白话版 | 过去大家只知道 Poolside 很会讲“AI 写代码”的故事；这次它第一次把可公开用的模型、CLI agent 和在线开发沙箱一起放出来，意思是：我不只卖未来愿景，我要直接抢开发者入口。 |
| 核心发布 | Laguna M.1：225B 总参数 / 23B 激活；Laguna XS.2：33B 总参数 / 3B 激活，Apache 2.0 开权重；配套产品为 `pool` 和 `Shimmer`。 |
| 核心成绩 | Laguna M.1：SWE-bench Pro 46.9%，Terminal-Bench 2.0 40.7%；Laguna XS.2：SWE-bench Pro 44.5%，Terminal-Bench 2.0 30.1%。 |
| 最关键的产业动作 | XS.2 直接开权重；M.1 与 XS.2 都可经 Poolside API / OpenRouter 使用；XS.2 还支持 Ollama、本地单卡、MLX、Day-1 TensorRT-LLM。 |
| 方法关键词 | MoE、30T tokens、synthetic + automixing、Muon、async on-policy agent RL、GPUDirect RDMA checkpoint transfer、agent harness / ACP server。 |
| 价值评级 | A — 不是单一模型首发，而是 agentic coding 的全栈首发。 |
| 适合谁看 | 做 coding agent、开发者工具、私有部署开源模型、终端智能体、Agent RL 基础设施的人。 |

## 文章背景

Poolside 这次发布最值得注意的，不是单个 benchmark 数字，而是时间点和组合方式。

过去一年，Poolside 更像一家“被高额融资和 agentic coding 愿景包围的实验室公司”。外界知道它在做大模型、做 coding、做高安全环境部署，但看不到公开可用的完整产品栈。这次不同：

1. 它第一次公开发模型；
2. 第一次公开发终端 agent；
3. 第一次公开发云端开发环境；
4. 第一次把自己的训练哲学、优化器、RL 训练环路、数据混配方法讲出来；
5. 第一次明确把“西方 open-weight agentic coding 生态太弱”当成自己出手的理由之一。

这意味着 Poolside 不再满足于“做一家具备国防/政企部署能力的闭门实验室”，而是在争更硬的一层：
“谁来定义 agentic coding 的默认模型栈与默认使用入口？”

## 完整内容还原

### 1. 第一篇原文在宣布什么：两模型 + 两产品一起进 preview

公告文的结构很直白：

- 发布两个 foundation models：Laguna M.1 与 Laguna XS.2；
- 发布两个产品体验：`pool` 与 `Shimmer`；
- 两模型都可通过 Poolside API 和 OpenRouter 免费限时试用；
- XS.2 同时开权重，Apache 2.0；
- Poolside 将这次事件定义为“第一次公开发模型”。

这里有个非常重要的定位信号：Poolside 不是把模型和产品拆开发，而是故意捆在一起。它在原文里反复强调，模型与 agent 应被“一起看待和一起使用”，因为两者之间的边界正在缩小。

这句话不是营销话术，而是它整个技术路线的前提：Poolside 认为评估 coding model，不能只看静态代码补全，而要看模型在 agent harness 里，经过数百步工具调用、真实沙箱执行和任务闭环后还能不能稳定完成工作。

### 2. Laguna M.1：大模型路线，瞄准长链路 agentic coding

Poolside 对 M.1 的定位非常明确：

- 225B 总参数；
- 23B 激活参数；
- MoE 架构；
- 上一代完成预训练的“大底座”；
- 主要面向 long-horizon agentic coding。

技术补充文给出更具体细节：

- 完全从零训练；
- 30T tokens；
- 使用 6,144 张互联的 NVIDIA Hopper GPU；
- 在 SWE-bench Pro 上 46.9%；
- 在 Terminal-Bench 2.0 上 40.7%。

这组数字背后真正重要的不是“225B”本身，而是 Poolside 在强调一种效率哲学：
它多次用“dense 模型虽然参数更少，但激活参数往往更大”来提醒读者，不应该只看总参数，而要看 MoE 的激活效率与 agent 场景下的真实吞吐/成本结构。

### 3. Laguna XS.2：小得多，但要打开放生态和单卡可跑

XS.2 是这次发布里更关键的产品化动作。

官方口径：

- 33B 总参数；
- 3B 激活；
- 第一个 open-weight 模型；
- Apache 2.0；
- 可单 GPU 运行；
- 预训练 5 周前才开始，当天已经以“fully post-trained”状态发布。

技术补充文进一步给出：

- 同样训练在 30T tokens 上；
- 融合了他们从 M.1 学到的数据、synthetic 与 RL 经验；
- SWE-bench Pro 44.5%；
- Terminal-Bench 2.0 30.1%；
- Day-1 支持 TensorRT-LLM；
- 提供 NVFP4 版本；
- 本地可通过 Ollama / MLX 跑。

这里的核心不是“一个 33B 模型又刷了多少分”，而是 Poolside 明确把 XS.2 设计成“生态扩散器”：

1. 单卡可跑，降低试用门槛；
2. 开权重，降低部署/微调/蒸馏门槛；
3. Apache 2.0，降低商业采用门槛；
4. 配套 `pool` 与 `Shimmer`，降低真正动手体验门槛。

这是一套很典型的“先抢开发者心智，再谈模型收费”的打法。

### 4. 为什么 Poolside 反复强调 software 而不是 tool calling

技术补充文有一句非常值得记住的话：

“Today, most agents interact with the world through tool calling... We think this is a transitional pattern. Software is a much more expressive interface.”

Poolside 的判断是：

- tool calling 本质上是预定义动作集合；
- 软件代码才是通用接口；
- 如果 agent 能写代码、跑代码、并行化代码、自己搭临时系统，它跟现实世界交互的上限会远高于固定工具接口。

这就是它为什么把长期主战场押在 coding capability 上，而不是普通对话或泛用问答。

换句话说，在 Poolside 眼里，coding 不是一个垂直场景，而是 agent 获得“通用行动力”的母能力。

## 核心技术洞察

### 1. Poolside 在做的不是单模型，而是 agent runtime-first 的模型体系

公告文表面看是发模型，深挖后其实是在发三层东西：

- 底层：Laguna M.1 / XS.2 模型；
- 中层：agent harness（ACP server）；
- 上层：`pool` 终端体验和 `Shimmer` 云端体验。

他们甚至明确说，agent harness 就是自己内部用于 agent RL 训练和评测的同一套载体。这意味着 Poolside 的模型能力不是脱离运行时环境定义的，而是从训练阶段就按 agent runtime 来塑形。

这和很多“先训练一个通用模型，再临时包一层 agent 壳”完全不同。

### 2. Data pipeline 的重点不是纯提纯，而是“质量 × 多样性”的联合优化

Poolside 在数据部分讲得非常坦白：

- 他们确实重视高质量数据；
- 但不把“只留最优质数据”当真理；
- 因为那会过度偏向 STEM / reasoning，损伤数据多样性；
- 因此他们会保留一部分中低质量 bucket，维持泛化。

原文给出的一个关键结论是：
这种做法能在保持性能的同时拿到约 2× 更多 unique tokens。

这反映的是 2026 年预训练的一个重要共识变化：
数据不只是越干净越好，还要考虑分布覆盖与长期训练中的信息熵供给。

### 3. Synthetic data 不再只是补角料，而是常驻混配成分

Laguna 系列使用约 4.4T+ synthetic tokens；在 XS.2 里，synthetic data 约占最终训练混合的 13%，而且不是最后补一层，而是“贯穿所有预训练阶段持续参与”。

这点很关键。它说明 Poolside 不把 synthetic data 当一次性增强，而是当基础数据生产系统的一部分。它还强调 synthetic 不是只做窄领域高信号样本，而是扩展到更广的 data mix。

这意味着 Poolside 想把 synthetic 从“技巧”变成“数据工业化能力”。

### 4. Automixing = 用代理模型群搜索数据配方，而不是人工拍脑袋

Poolside 的 automixing 方法很有信息量：

- 每轮自动混配训练约 60 个 proxy models；
- 每个代理模型对应一套不同 data mix；
- 再在 code、math、STEM、common sense 等能力组上测；
- 用 surrogate regressors 近似“数据配比 → 下游性能”的映射；
- 再从这个近似映射里反推更优混合方案。

这相当于把“数据怎么配”从经验主义变成一个低成本黑盒优化问题。

### 5. Muon 优化器在这里不是学术噱头，而是系统级效率工程

Poolside 原文说，Muon 在他们的预训练消融里：

- 相比 AdamW，可在约 15% 更少 steps 达到相同 training loss；
- 最终模型 eval 还更好；
- 能在模型尺度间做学习率迁移。

但 Muon 的问题是算子重、通信多。Poolside 的工程点在于：

- 将参数/梯度计算分摊到 shard rank；
- 把 Newton-Schulz 正交化放到指定 rank 上做；
- 再把正交化梯度 shard 发回去；
- 重叠 batched communication 与 Newton-Schulz 计算；
- 对小模型启用 CUDA graphs 降低 CPU kernel launch 开销；
- 通过周期性哈希校验，同时防 silent data corruption 和 replica divergence。

最硬的一句是：M.1 预训练里，优化器额外开销不到单步时间的 1%。

这说明 Poolside 不是“会用 Muon”，而是把 Muon 真正驯化进了大规模分布式训练生产线。

### 6. Async on-policy agent RL 才是它最像“Agent 公司”的部分

Poolside 对 RL 环路的描述很具体：

- trainer 发布新 checkpoint；
- inference cluster 热更新 checkpoint；
- actors 从任务集拉任务；
- 在沙箱容器中跑 production agent binary；
- 轨迹评分、过滤、写入 Iceberg tables；
- trainer 持续消费这些 records，生成下一 checkpoint。

重点有三个：

1. 完全异步，避免长轨迹拖慢训练 GPU；
2. 显式控制 off-policyness，而不是假装纯在线；
3. 用 GPUDirect RDMA 在数秒内转运数百 GB 权重；对 M.1，可在 5 秒内跨节点转 BF16 权重。

这套系统告诉你，Poolside 在意的不是“把 RL 概念贴在模型上”，而是如何把长链路 coding tasks 的 rollout 真正吞进训练闭环。

## 横向对比

| 维度 | Poolside 这次做法 | 常见模型发布 | 差异点 |
|---|---|---|---|
| 交付对象 | 模型 + agent harness + CLI + cloud dev sandbox | 只发模型/只发 API | Poolside 直接交付“可干活的栈” |
| 开源策略 | XS.2 开权重，M.1 仍偏托管/申请获取 | 常见是全闭源或单一开源 | 双路线：大模型守住、轻量模型扩散 |
| 评测逻辑 | Harbor Framework + 自家 agent harness，最多 500 steps | 静态 benchmark 或简化 harness | 更接近真实 agentic coding 执行链 |
| 数据策略 | quality × diversity + synthetic + automixing | 纯精选 or 纯规模化 | 更强调“混配系统工程” |
| 后训练 | async on-policy RL，生产级沙箱回路 | SFT 为主，RL 口径模糊 | Poolside 更像把 agent RL 当核心资产 |

## 实践指南

### 🟢 今天就能借鉴

1. 不要把 coding model 和 agent runtime 分开设计
   - 如果你的真实产品是 agent，就该用 agent harness 来训练和评测，而不是只测静态补全。

2. 数据混配别只追 top-quality
   - 过度提纯会导致分布塌缩，尤其对长周期预训练不利。

3. 开源小模型比开源大模型更像“生态杠杆”
   - XS.2 这种 3B active 的模型，更适合拿来抢框架适配、社区反馈和本地部署生态。

### 🟡 需要项目适配

1. Muon 不适合没有通信优化能力的团队
   - 原文所有收益都建立在复杂的 distributed implementation 上。没有大规模训练基础设施，直接照抄可能得不偿失。

2. Async RL 需要可靠沙箱与轨迹打分系统
   - 如果任务环境噪声大、评分不稳、checkpoint 传输慢，异步 RL 只会把噪音放大。

### 🔴 可能踩的坑

1. 公布的 benchmark 很强，但公开细表仍有限
   - 两篇文章给了若干 headline 分数和评测设置，但更系统的 technical report 仍未发布。

2. XS.2 的“单卡可跑”不等于“企业可直接上生产”
   - 单卡可跑解决的是试用门槛，不是权限、审计、长期稳定性、团队协作等生产问题。

3. 大部分工程壁垒仍在 Poolside 内部
   - Titan、完整 agent harness 演化、更多 RL 细节与自动混配细节，目前官方仍只放出一部分。

## 批判性分析

### 局限性

1. 这次公开材料更偏“会做什么”和“做到什么”，但不是完整技术报告。
2. 评测主要围绕 agentic coding，尚不能直接推出它在更广泛 office agent / multimodal agent 场景的表现。
3. M.1 权重没有像 XS.2 一样直接开放，生态扩散仍主要靠小模型路线。

### 适用边界

- 最适合：coding agent、终端 agent、需要 on-prem / 高安全部署的开发者场景。
- 未必最适合：纯聊天、轻办公、低步骤短任务场景。

### 独立观察

1. Poolside 这次最强的信号不是“模型分数”，而是它把 agent runtime、训练基础设施和开发者入口看成同一个产品问题。
2. XS.2 开源说明它很清楚：在今天的西方开源 agent 生态里，真正稀缺的不是又一个 chat model，而是“能跑 agentic coding、还能让社区拿回去自己折腾”的开放底座。
3. 如果后续 technical report 能把 Harbor Framework、ACP harness、automixing 与 async RL 继续讲透，Poolside 很可能会从“欧洲新贵”变成 2026 下半年 agentic coding 栈里最值得持续盯的一家公司。

## 对领域的影响

这次发布对行业的真正影响，不在于 M.1 或 XS.2 谁多刷了几个点，而在于它把一个越来越清楚的趋势推到台前：

未来 coding agent 的竞争单位，不再只是单个模型，而是“模型 + runtime + 沙箱 + 训练闭环 + 分发界面”。

OpenAI、Anthropic、Google、Poolside、Mistral 这些玩家，表面上看都在发模型或发 agent，实质上争的是同一件事：
谁能占住开发者工作流的默认入口。

Poolside 这次第一次拿出了足够完整的一套回答。对欧洲 AI 公司来说，这比再发一篇宏大愿景文章更重要。