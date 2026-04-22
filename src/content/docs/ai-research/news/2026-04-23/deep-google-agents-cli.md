---
title: "Google Agents CLI：把 Agent 开发链路从散装云组件压成一条可编排流水线"
description: "Google Agents CLI, Agent Platform, ADLC, Cloud Run, A2A Integration, eval, deploy"
---

# Agents CLI in Agent Platform: create to production in one CLI

> 原文链接：https://developers.googleblog.com/agents-cli-in-agent-platform-create-to-production-in-one-cli/
> 来源：Google Developers Blog
> 发布日期：2026-04-22

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Google 用一个专门给 coding agents 用的 CLI，把 agent 的脚手架、评测、基础设施和部署链路打通。 |
| 大白话版 | Google 想让 Claude Code、Gemini CLI、Cursor 这种代码助手不用翻一堆云文档，直接通过命令行把 agent 从本地做进生产。 |
| 核心要点 | • 面向 AI coding agents 的 machine-readable 云入口 • 把 setup/create/eval/deploy/publish 做成一条链 • 覆盖 Agent Platform、Cloud Run、A2A Integration • 同时支持 Agent Mode 与 Human Mode |
| 价值评级 | A=必读级 |
| 适用场景 | 企业 agent 平台、云上部署链路、评测驱动开发、面向开发者的 agent 工程体系 |

## 文章背景

这篇文章背后的真实问题不是“再发一个 CLI”，而是 agent 工程已经进入一个尴尬阶段：模型能写代码了，但从本地原型到生产服务之间的云基础设施仍然碎成一地。框架、部署、IaC、CI/CD、评测、权限、运行时、协议，全都分散在不同文档和服务里。

Google 在文中非常直接地说，今天开发者和 coding assistants 最大的问题之一是 isolation 和 context overload——为了把本地逻辑接上云，他们得把大量文档、接口和操作步骤喂进模型，浪费时间也浪费 token。

所以 Agents CLI 的角色不是“给人类多一个命令工具”，而是给 AI coding agents 一个 machine-readable 的云侧主入口。这和传统 CLI 完全不是一个定位。

## 完整内容还原

### 问题定义：模型更聪明，基础设施仍然碎片化

文章一开头先定调：
- AI agents 正从实验脚本走向生产服务
- 但构建、评测和部署所需基础设施依然 fragmented
- coding assistants 为了理解本地到云的桥接方式，要吞大量文档
- 这会造成 token 浪费和 endless loops

Google 这里非常精准地点破了当前 agent 工程的现实：不是大家不会写 agent，而是 agent 很难可靠地跨过“本地 demo → 可上线服务”这条沟。

### 核心定位：ADLC 的 programmatic backbone

Google 给 Agents CLI 的定义是：
- unified programmatic backbone
- for the Agent Development Lifecycle (ADLC)
- on Google Cloud

并明确说它面向的对象不是一般脚本作者，而是 AI coding agents，例如：
- Gemini CLI
- Claude Code
- Cursor

它提供的是一条 direct, machine-readable line 到 Google Cloud 的整套 agent stack，文中明确列出包括：
- Agent Platform
- Cloud Run
- A2A Integration

这句话很关键。Google 不是在卖“一个 CLI”，而是在卖“让上层 coding agent 能直接理解并操作 Google agent stack 的标准入口”。

### 第一段：Build Agents with Agents

Google 先解决脚手架问题。

原文说，最大障碍是 context overload：coding agent 不知道不同云组件怎么拼，就会不断猜，导致循环和 token 浪费。

为此，Agents CLI 提供一个 setup 命令，把 bundled skills 直接注入 coding environment：

```bash
uvx google-agents-cli setup
```

这一步的重点不是安装，而是“inject bundled skills”。也就是说，它试图把 coding assistant 需要的 API reference、工作流约定、组件关系，用 machine-readable 的方式直接放进环境里，而不是让模型自己从海量网页文档里摸索。

接着文章给了一个自然语言需求示例：
“做一个 travel expense agent，50 美元以下自动批准，50 美元以上或异常支出需要 human-in-the-loop 审批。”

然后给出自动脚手架命令：

```bash
agents-cli create finance-agent -y --deployment-target agent_engine
cd finance-agent
```

这里有三个值得注意的点：
1. `-y` 说明 Google 明确在为 agent 自动执行场景优化，减少交互阻塞。
2. `--deployment-target agent_engine` 说明目标运行时已经被显式产品化。
3. 示例不再是“hello world chatbot”，而是带 HITL 规则的企业审批 agent，更贴近真正的业务流。

### 第二段：Local Simulation and Rigorous Evaluation

这是文章最重要的一层，因为它显示 Google 想把 eval 变成 agent 开发的默认环节，而不是上线前补做。

文章说：
- 写出逻辑只是半场
- 真正的另一半是确保行为正确
- 上线前要知道 agent 是否达到准确率阈值

Agents CLI 提供两类命令：

```bash
agents-cli eval run
agents-cli eval compare evals/run_v1.json evals/run_v2.json
```

这说明 Google 至少想把以下动作标准化：
- 跑 ground-truth datasets
- 做 trajectory scoring
- 比较两个 evaluation run 的指标差异

也就是说，agent 在 Google 这里不应该只是“能跑”，而要有可重复、可比对、可审查的评测过程。

这和传统云函数 / 微服务部署思路有本质区别：agent 的核心不是 uptime，而是行为质量与轨迹质量。

### 第三段：Seamless Deployment to Production

文章接着处理部署链路。

原文一句话很猛：
“Going from a local prototype to a secure, globally distributed service shouldn't take 70 days.”

然后给出三步：

```bash
agents-cli infra single-project
agents-cli deploy
agents-cli publish gemini-enterprise
```

这三步分别对应：
1. Provision production infrastructure
2. Ship the agent to Google Cloud
3. Register the deployed agent with Gemini Enterprise for distribution

这里最关键的是 `publish gemini-enterprise`。它说明 Google 不只关心把服务部署起来，还关心把 agent 注册进自己的企业分发面和平台生态里。

也就是说，Google 在做的是一条闭环：
本地创建 → 评测 → IaC / CI/CD → 云运行时 → 企业分发

文章还明确提到部署阶段可自动注入：
- Infrastructure as Code
- CI/CD pipelines
- 直接部署到 Agent Runtime / Cloud Run / GKE

这说明它想吃掉的不只是 runtime，而是整个 delivery pipeline。

### 第四段：Human Intent + Agent Execution

Google 没把 Agents CLI 只做成 agent-only 黑盒，而是保留了 Human Mode。

原文说：
- CLI optimized for agent consumption（Agent Mode）
- 但 fully supports a Human Mode
- 开发者可以自己直接在 terminal 或脚本里运行命令
- 在需要时介入，给 AI 提供“hands and eyes”上的确定性控制

这一段其实很重要，因为它表明 Google 不是要让开发者完全退出环路，而是承认：高价值 agent 开发仍然需要人能随时接管。

### 收尾：Documentation、GitHub、Community

最后，Google 把几个外部连接点摆出来：
- 下载 Agents CLI
- 运行 `uvx google-agents-cli`
- 查 Documentation
- 看 GitHub repository
- 去 Reddit / Agent Ecosystems Google Group 分享

这说明他们想把这东西做成生态入口，而不是一次性博文发布。

## 核心技术洞察

1. **Google 正把“给人用的 CLI”升级成“给 agent 用的 CLI”**
   这不是措辞差异，而是接口设计哲学差异。以前 CLI 服务人类开发者，现在开始服务上层 coding agents。

2. **Google 把 agent 工程分成可编排的生命周期，而不是零散步骤**
   setup、create、eval、infra、deploy、publish 被压成一条链，这就是 ADLC 真正的含义。

3. **评测正在成为 agent 平台的原生能力**
   `eval run` 和 `eval compare` 说明 Google 认为 agent 开发的核心资产不只是代码，还有轨迹和行为质量。

## 实践指南

### 🟢 立即可用

1. **把脚手架与部署知识从 prompt 中拿出来**
   - 做什么：让 coding agent 通过 CLI / skills 而不是海量自然语言提示构建项目
   - 为什么：减少上下文膨胀与不确定性
   - 注意：不要把 CLI 当成说明书，而应当当成执行层

2. **把 eval compare 变成迭代默认动作**
   - 做什么：每轮 agent 逻辑变更都对比 run_v1 / run_v2
   - 为什么：agent 退化往往不是编译错误，而是行为漂移
   - 注意：ground-truth 设计决定了评测价值上限

3. **把 deploy 与 publish 分开理解**
   - 做什么：先部署，再决定是否挂进 Gemini Enterprise 分发层
   - 为什么：运行成功不等于适合分发给组织用户
   - 注意：企业分发前要补权限、审计和 HITL 设计

### 🟡 需要适配

1. **跨云 / 多模型团队**
   - 适配条件：并不想被单一云完全绑定
   - 调整方向：把业务逻辑和评测集保持平台无关，把部署层交给 CLI

2. **复杂企业系统集成**
   - 适配条件：涉及审批、身份、ERP、工单等系统
   - 调整方向：优先建立 A2A / agent runtime 边界，再谈生成逻辑

### 🔴 注意事项

1. **别把 CLI 当成平台中立工具**
   它本质上是 Google Cloud agent stack 的统一入口，天然带平台绑定。

2. **别忽略评测集质量**
   CLI 能帮你运行 eval，但不能自动帮你定义“什么是对的 agent 行为”。

3. **别只看 create 和 deploy**
   真正的长期价值在中间那层 eval + infra + publish 的闭环。

## 横向对比

| 话题 | 传统云上 agent 开发 | 本文 Agents CLI 路线 | 为什么更强 |
|---|---|---|---|
| 上下文获取 | 模型自己查文档 | CLI 提供 machine-readable skills | 少走弯路、少烧 token |
| 项目创建 | 手工拼脚手架 | `agents-cli create` | 初始结构更标准 |
| 质量验证 | 测试零散、评测可选 | `eval run / compare` | 更适合 agent 行为开发 |
| 部署 | IaC、CI/CD、Runtime 分散 | `infra + deploy + publish` 串联 | 生命周期更完整 |
| 人机协同 | 常常二选一 | Agent Mode + Human Mode 共存 | 更贴近真实开发流程 |

## 批判性分析

### 局限性

第一，文章没有公开更细的 CLI 架构、协议边界和开源程度，也没说明它与 ADK、Vertex AI、Gemini Enterprise Agent Platform 各自的职责边界。现在看上去很完整，但具体分层还偏营销视角。

第二，文中示例很顺滑，但没有给出真实复杂企业项目的失败案例、回滚策略和故障恢复流程。生产级 agent 真正难的通常是这些角落。

第三，Google 强调面向 Claude Code、Cursor 等第三方 coding agents，但实际体验是否真足够顺滑，还要看外部工具与这套 skills / command model 的兼容性。

### 适用边界

最适合：
- 已经在 Google Cloud 上做 agent 的团队
- 需要部署链路标准化的企业
- 想让 coding agent 真正“会部署”的团队
- 希望把 eval 做成默认流程的组织

不一定最适合：
- 极度强调跨云中立的团队
- 非 Google 生态企业
- 只需本地原型、没有分发需求的小团队

### 潜在风险

- 平台入口统一后，开发者迁移成本会从模型 API 层上移到整条工程链路层。
- 如果 CLI 的底层抽象不够稳定，外层 coding agent 的自动化会很脆弱。
- 如果组织过度依赖自动脚手架，可能会错把“能部署”当成“可治理、可维护”。

### 独立观察

1. 这篇文章真正传达的是：Google 不满足于卖模型，它要卖“agent 工程操作系统”。
2. ADK、A2A、A2UI、Enterprise Agent Platform、Agents CLI 这几条线开始收束成同一战略——把 Google 变成 agent 的默认生产平台。
3. 如果 OpenAI 更像在补 agent runtime，Google 更像在补 agent SDLC。两家的竞争已经不只是模型层了。