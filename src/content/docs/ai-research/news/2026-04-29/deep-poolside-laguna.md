---
title: "深度解读 | Poolside Laguna：欧洲终于把模型、终端 Agent 和云端开发环境一起推上台面"
description: "Poolside, Laguna M.1, Laguna XS.2, agentic coding, pool, Shimmer, open weights, MoE"
---

# Poolside Laguna 深度解读

> 原文链接：https://poolside.ai/blog/introducing-laguna-xs2-m1
> 来源：Poolside 官方博客
> 发布日期：2026-04-28
> 核对说明：已通读官方发布博文全文，并据文中 benchmark 说明与产品描述整理本文。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Poolside 这次不是单发模型，而是把大模型、小模型、终端 coding agent 与云端 dev sandbox 一次性打包成 agentic coding 产品栈。 |
| 大白话版 | 他们想卖的不是“我们也有一个模型”，而是“你可以直接拿我们的模型在终端里写代码，或者在云端沙箱里开工”。 |
| 核心要点 | • Laguna M.1：225B 总参数 / 23B 激活 • Laguna XS.2：33B / 3B 激活、Apache 2.0 开权重、单卡可跑 • pool + Shimmer 同日进入 preview |
| 价值评级 | A — 对欧洲 AI 公司来说，这比“发论文”更重要，因为它是完整面向开发者工作流的产品化动作。 |
| 适用场景 | coding agent、长链路软件任务、希望本地/云端混合试模型的开发者与团队 |

## 文章背景

Poolside 过去的外部形象更像一家“拿到大额融资、强调 model factory 与 agent RL 的欧洲/北美混合新锐实验室”。这次发布是它第一次真正把成果公开卖给外部开发者。时点也很微妙：2026 年上半年的 coding agent 竞争，已经从“谁能做代码补全”升级到“谁能占住终端、工作区和长任务执行层”。

因此这篇博文的意义，不是一个实验室终于对外放模型，而是 Poolside 终于决定正面参与 agentic coding 的产品战。

## 完整内容还原

### 1. 一次放出两个 foundation model + 两个产品

原文开头直接把信息讲透了：
- 发布 Laguna M.1，225B 总参数、23B 激活参数，定位是最强模型，面向 agentic coding 与 long-horizon work；
- 发布 Laguna XS.2，33B 总参数、3B 激活参数，Apache 2.0 开权重，可在单 GPU 运行；
- 两个产品同步 preview：终端 coding agent `pool`，以及云端开发体验 `Shimmer`。

这件事非常关键。很多模型公司发布模型时，开发者要自己找推理服务、自己配工具链、自己写 agent harness。Poolside 这里反过来：先给模型，再把“最佳使用方式”一并打包。

### 2. Laguna M.1：大模型负责长链路 coding

官方对 M.1 的叙述比较克制，但指向很明确：
- 225B total / 23B active，说明它走的是 MoE 方向；
- 明确服务 agentic coding 和 long-horizon work，而不是通用闲聊；
- Benchmark 里把它拿去和 Devstral 2、GLM-4.7、DeepSeek-V4-Flash、Qwen3.5、Claude Sonnet 4.6 这类强 coding 对手同台比较。

这说明 Poolside 自己对标的不是“欧洲模型里最好”，而是直接对标全球 coding 模型主力梯队。

### 3. Laguna XS.2：真正更有意思的小模型

原文把 XS.2 称作 "(Extra) Small model, big story"，这个表述挺准。因为 XS.2 的亮点不在绝对参数，而在组合属性：
- 33B total / 3B active；
- 单 GPU 可跑；
- Apache 2.0 开权重；
- 同时号称在 agentic coding 上能站住脚。

官方还补了一个很硬的信息：XS.2 从 5 周前开始预训练，到今天已完成后训练并公开发布。意思是 Poolside 想传达两件事：
1. 他们的 model factory 已经能跑出快速迭代节奏；
2. 他们愿意把开源开放生态当成真实增长路径，而不只是 API 营销漏斗。

### 4. 为什么要给 XS.2 开权重

原文这一段几乎是在公开表达战略选择：
- 他们想看社区会拿 XS.2 做什么；
- 认为西方 open-weight 生态还处在早期；
- 希望通过把模型放到外部开发者手里，加速自身迭代和 frontier 进展。

这跟很多“只开小模型做品牌曝光”的公司不一样。Poolside 这里更像是在赌：只要 agentic coding 的最佳产品形态还没定型，社区反馈本身就是研发资产。

### 5. 产品层：pool 与 Shimmer

原文对产品层给得不短，说明这不是附属品。

`pool`：
- 定位是 terminal-based coding agent；
- 官方明确说“for the best agent experience with our models”；
- 本地侧甚至给出 `ollama launch pool --model laguna-xs.2` 这类上手路径。

`Shimmer`：
- 定位是 instant-on VM sandbox；
- 用来迭代 web apps、APIs、CLIs；
- 预装 Poolside Agent，直接把模型与工作区绑定起来。

这意味着 Poolside 的野心不是只做“模型 API 供应商”，而是要占住两个入口：本地终端入口 + 云端隔离开发环境入口。

### 6. 基准说明和工程口径

原文脚注给了几个很重要的工程信号：
- benchmark 采用 Laude Institute 的 Harbor Framework；
- 使用自家 agent harness；
- 最大 500 steps；
- 默认沙箱为 8GB RAM / 2 CPUs，Terminal-Bench 2.0 例外用 48GB RAM / 32 CPUs；
- sampling 统一 `temperature=0.7` 与 `top_k=20`；
- 部分 task images 和 verifiers 做过基础设施补丁，以修复第三方依赖限流等问题。

这段话很值钱，因为它至少说明 Poolside 意识到了 agent benchmark 的环境敏感性，并没有把结果写成脱离执行条件的营销数字。

## 核心技术洞察

1. **模型层与产品层同步发布，才说明团队真的要打工作流入口。**
   只发模型，说明还在研究阶段；模型、CLI agent、cloud sandbox 一起发，才说明要争日用位置。

2. **小模型开权重，比大模型封闭 API 更适合拉动 agent 生态。**
   coding agent 场景太依赖本地迭代、sandbox 控制、工具定制。XS.2 这种单卡可跑且 Apache 2.0 的模型，更容易被开发者拿去魔改、塞进自定义工作流。

3. **Poolside 在卖“组织化研发能力”，不只是在卖某个分数。**
   文中多次提到 model factory、pre-training、post-training、agent RL、Titan training codebase、async on-policy RL、synthetic data、automixing。真正想传达的是：他们有一套能持续迭代 coding 模型与 agent 产品的机器。

## 实践指南

### 🟢 立即可用

1. 如果你想测试欧洲阵营在 coding agent 上的真实可用性，XS.2 是最值得试的入口。
2. 如果你要本地跑，单 GPU + Ollama 的路径比大多数 frontier coding 模型更友好。
3. 如果你想看产品完成度，不要只测 API，直接测 `pool` 和 `Shimmer` 的工作流完整性。

### 🟡 需要继续验证

1. M.1 的真实长链路表现要看第三方复评，不只看自家 Harbor Framework。
2. Shimmer 能否形成壁垒，取决于权限、审计、状态持久化、协作能力，而不只是“能开个云端 VM”。
3. 开源 XS.2 能否形成社区网络效应，要看后续 examples、微调、部署与 issue 活跃度。

## 横向对比

| 话题 | Poolside 本次动作 | 典型闭源模型厂 | 典型开源模型厂 |
|---|---|---|---|
| 模型发布 | 大模型 + 小模型同发 | 常常只发旗舰闭源 API | 常只发权重，缺产品入口 |
| 产品入口 | 终端 agent + 云端 sandbox | 倾向做 web/chat 入口或 IDE 插件 | 往往需要社区自搭 |
| 开放策略 | 小模型 Apache 2.0 | 更强调 API 锁定 | 更强调社区，但产品层较弱 |
| 战略重点 | agentic coding 工作流 | 通用模型商业化 | 开源生态扩散 |

## 批判性分析

### 局限性

- 官方博文本质仍是发布稿，外部验证还不充分。
- M.1 与 XS.2 的 benchmark 细节不如完整技术报告丰富。
- `pool` 与 `Shimmer` 的企业级权限、审计、多人协作信息仍少。

### 适用边界

- 如果你的目标是本地或半本地 coding agent，XS.2 很有吸引力。
- 如果你的目标是超复杂企业开发流程，真正的成败不在模型，而在产品层控制面。

### 独立观察

Poolside 这次最重要的，不是证明“欧洲也能做模型”，而是证明“欧洲公司也能做完整开发者产品栈”。如果它后续能把 XS.2 社区拉起来，再用 M.1 承接更复杂的长链路任务，那它会比很多单纯拼 leaderboard 的模型厂更危险。