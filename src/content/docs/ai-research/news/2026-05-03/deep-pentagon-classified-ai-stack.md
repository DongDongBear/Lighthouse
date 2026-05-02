---
title: "深度解读 | 五角大楼把 frontier AI 真正推入 IL6/IL7：美国军方正在搭多供应商机密 AI 栈"
description: "Pentagon, IL6, IL7, classified networks, GenAI.mil, Nvidia, Microsoft, AWS, Reflection AI, Anthropic"
---

# 深度解读 | 五角大楼把 frontier AI 真正推入 IL6/IL7：美国军方正在搭多供应商机密 AI 栈

> 2026-05-03 · 深度解读 · 编辑：Lighthouse
>
> 已核验原始信源：
> 1. TechCrunch：https://techcrunch.com/2026/05/01/pentagon-inks-deals-with-nvidia-microsoft-and-aws-to-deploy-ai-on-classified-networks/
> 2. 美国国防部公告：https://www.war.gov/News/Releases/Release/Article/4475177/classified-networks-ai-agreements/
> 3. TechCrunch 背景文（Google 扩容）：https://techcrunch.com/2026/04/28/google-expands-pentagons-access-to-its-ai-after-anthropics-refusal/
> 4. TechCrunch 背景文（OpenAI 协议）：https://techcrunch.com/2026/03/01/openai-shares-more-details-about-its-agreement-with-the-pentagon/
> 5. TechCrunch 背景文（xAI / SpaceX 入场争议）：https://techcrunch.com/2026/03/16/warren-presses-pentagon-over-decision-to-grant-xai-access-to-classified-networks/
>
> 核对说明：已通读以上原文。本文只依据已公开的官方公告与原始报道整理，不臆造合同金额、模型名称或具体部署架构细节。

## 速查卡

| 维度 | 结论 |
|---|---|
| 这是什么 | 不是又一笔普通采购，而是 DoD 把 frontier AI 正式扩展到 IL6 / IL7 机密网络环境的多供应商扩容动作。 |
| 一句话总结 | 五角大楼正在把“单点模型试用”升级成“多模型 + 多云 + 多算力 + 可替换接口”的机密 AI 栈。 |
| 大白话版 | 军方不再只让某一家模型公司先进去试，而是把 Nvidia、Microsoft、AWS、Reflection 连同更早的 Google、OpenAI、SpaceX、Oracle 一起拉进来，准备在真正高密级网络里长期跑。 |
| 核心数字 | 已公开纳入 8 家 frontier AI 公司；覆盖 IL6 与 IL7；GenAI.mil 五个月内已有 130 万+ 人员使用、产生数千万 prompts、部署数十万 agents。 |
| 影响评级 | A — 这不是“AI 进军政府”的新闻，而是美国国防 AI 基础设施进入控制面、供应商治理与架构层竞争。 |
| 最大看点 | “prevents AI vendor lock-in” 被官方写进公告，说明采购逻辑已经从单一模型能力，转向体系级可替换性。 |

## 一、先说结论：最重要的不是“又签了几家公司”，而是军方采购逻辑变了

这次事件真正的分水岭，不在 Nvidia、Microsoft、AWS、Reflection AI 这四个名字本身，而在美国国防部官方公告里那句非常硬的话：

“继续建设防止 AI vendor lock-in、确保长期灵活性的架构。”

这意味着五角大楼对 frontier AI 的使用方式，已经不再是“挑一个最好模型给它开门”，而是开始按国防体系的老逻辑做新一代 AI 基础设施：

1. 不能被单一供应商卡死；
2. 模型、云、算力、代理层必须可替换；
3. 分类网络里的 AI 能力必须成为长期底座，而不是短期试验；
4. 真正的竞争焦点会从“模型分数”转到“谁能在高密级环境里稳定、合规、可审计地落地”。

这和消费级 AI 市场完全不是一回事。普通企业可以忍受“一家模型厂 + 一家云 + 一套接口”的便利；国防体系不行。军方天然更关心冗余、韧性、替代路径和供应链可控性。

所以这条新闻的本质，是 DoD 正把 frontier AI 当成像卫星、通信、ISR、作战软件一样的长期基础设施，而不是一次性买一批 API 调用额度。

## 二、为什么 IL6 / IL7 是整条新闻里最关键的技术词

很多报道会把重点放在“classified networks”这个大词，但真正决定事情重量级的是 IL6 和 IL7。

从 DoD 公告给出的表述看，这批公司的 AI 硬件与模型将被部署到 IL6 与 IL7 网络环境，用于：

- streamline data synthesis
- elevate situational understanding
- augment warfighter decision-making

翻成人话：不是拿来做宣传演示，而是要进入真正服务于数据整合、态势理解和作战决策辅助的高密级工作流。

IL6 / IL7 的含义可以粗暴理解为：

- 这不是开放办公环境；
- 这不是普通政府 SaaS；
- 这不是“允许分析一些敏感但未分类数据”的低风险试点；
- 这是对物理隔离、访问控制、审计、身份链路、数据流向都极其敏感的环境。

一旦 frontier AI 真正进了这一层，行业竞争就会被改写成三层：

第一层是模型能力。
有没有足够强的总结、检索、规划、代理执行与工具调用能力。

第二层是部署能力。
能不能在 classified 环境里跑，能不能适配军方已有身份与安全边界，能不能过审计。

第三层是体系能力。
谁能跟云、算力、代理编排、日志、治理和跨系统连接一起工作，而不是只提供一个“聪明模型”。

这也是为什么这次入场名单很值得看：

- Nvidia：不是“又一家模型厂”，而是算力和推理底座；
- Microsoft / AWS：控制面、身份、安全、云承载、运维面；
- Reflection AI：代表 agent / 新模型公司的前沿试验位；
- 更早的 Google、OpenAI、SpaceX、Oracle：补的是模型、云、通信与已有国防合作关系。

DoD 不是在买一个产品，而是在拼一个组合拳。

## 三、从 Anthropic 纠纷到“八家公司并行”：这条时间线说明了什么

如果只看 5 月 1 日这条，会低估它的分量。把过去几个月串起来，才知道 DoD 在做什么。

### 时间线

- 2026-02 末：Anthropic 与 Pentagon 因使用边界发生公开冲突。核心争点不是能不能合作，而是能否允许 domestic mass surveillance、autonomous weapons 等高风险用途。
- 2026-03-01：OpenAI 快速签下协议，并公开强调自己的红线与 safeguards。
- 2026-03 中：xAI / Grok 获准进入 classified setting，但随即引发 Elizabeth Warren 对 guardrails、数据安全和 national security risk 的公开质疑。
- 2026-04-28：Google 扩大 Pentagon 对其 AI 的访问，进一步填补 Anthropic 拒绝后的空位。
- 2026-05-01：DoD 官方公告直接把名单扩到八家公司，并首次把“防 vendor lock-in 的架构”说得如此直白。

这条时间线说明两件事。

第一，DoD 的核心优先级不是和某一家实验室在伦理边界上反复拉扯，而是尽快形成“可用的、多家的、能进 classified 网络的 AI 供给面”。

第二，Anthropic 事件意外地加速了市场分层。谁愿意在军方条件下交付更多能力、谁能接受更强的政府工作流约束，谁就更有机会进入 DoD 的长期供应链。

## 四、技术上到底在买什么：模型、算力、云，还是 agent？

答案是：全都要，而且彼此绑定。

### 1）模型层

OpenAI、Google、Reflection AI 这类参与方，本质上提供的是模型推理与任务能力。军方关心的不只是聊天，而是能否在高密级数据环境里完成：

- 大规模文本/情报整理
- 多源信息综合
- 工作流自动化
- 决策支持
- 代理式执行链

### 2）算力层

Nvidia 的意义不只是“AI 龙头入选”，而是 DoD 在承认：军方 AI 不只是 SaaS 问题，还是部署形态与推理底座问题。尤其在 classified 环境里，很多工作负载未必适合简单公网 API；本地或私有环境中的推理硬件、驱动栈、加速库和调度能力会直接决定性能与可控性。

### 3）云与控制面

Microsoft 与 AWS 的价值，在于它们天然更接近身份、安全、日志、权限、审计与多环境运维。模型再强，如果无法被纳入军方的访问控制、合规边界和运维体系，照样进不了长期主流程。

### 4）agent / orchestration 层

DoD 公告里最被低估的是 GenAI.mil 已经部署“数十万 agents”。这说明军方内部思路已经明显从“给人用的聊天工具”升级到“可自动执行部分任务链的代理系统”。

这会把下一个竞争焦点推到 agent runtime：

- 代理如何拿权限
- 代理如何记录动作
- 代理如何做工具调用审计
- 代理如何在多供应商模型间切换
- 代理如何在网络隔离环境中运行

也就是说，真正吃到长期预算的，可能不只是模型 API，而是整个 agent control plane。

## 五、最重要的产业信号：军方正在把 AI 市场从“模型竞赛”拉向“体系竞赛”

对民用市场来说，大家还在聊哪个模型更聪明、便宜、快；但对 DoD 来说，真正的问题早就变成：

“这套 AI 能不能成为关键任务系统的一部分？”

从这个角度看，这次事件对产业链的影响可以画成下面这条链：

```text
多供应商 classified AI 协议
  ├─> 模型厂获得国防级入口
  ├─> 云厂获得 control plane 与运维位置
  ├─> 算力厂进入私有/机密推理底座
  ├─> agent 编排与治理需求上升
  └─> 审计、身份、日志、策略控制成为高价值配套层
```

谁会受益？

1. 模型层里愿意接受政府部署约束、并具备 cleared delivery 能力的公司；
2. 云和安全控制面厂商；
3. 做私有化推理、隔离环境部署、可审计 agent runtime 的基础设施团队；
4. 长期具备政府关系、合规流程和项目交付经验的供应商。

谁会受损？

1. 只擅长做前台 demo、没有国防级交付能力的 AI 公司；
2. 押注“单模型一家通吃”的公司；
3. 在伦理边界和政府需求之间无法给出稳定可执行交易结构的实验室。

## 六、DoD 为什么强调“不锁定单一供应商”

这不是一句套话，而是非常现实的 architecture 选择。

在军方视角里，vendor lock-in 至少有四种风险：

1. 政策风险：某家实验室未来改变使用条款；
2. 技术风险：某个模型路径被证明不适合关键任务；
3. 供应链风险：某家厂商在地缘政治、资本结构或审查上出问题；
4. 运营风险：系统一旦高度耦合，替换成本会高到不可接受。

因此，多供应商不是“想多给几家公司机会”，而是国防系统的基本韧性要求。

从这个角度看，Anthropic 和 Pentagon 的那场纠纷其实给所有厂商上了一课：

你再强，只要 DoD 觉得自己不能在关键时刻稳定使用你，军方就会主动扩容更多替代项。

## 七、批判性分析：热闹背后真正未解的问题

### 1. 官方没有披露最关键的 operational detail

我们知道名单、方向、环境级别和总体目标，但仍不知道：

- 具体哪些模型被批准；
- 谁跑在本地、谁跑在云端；
- 哪些任务允许 autonomous execution；
- 这些 safeguards 最终由谁执法；
- 供应商之间是否有统一接口层。

所以现在能确认的是“战略方向”，还不能确认“具体技术栈形态”。

### 2. Guardrails 冲突不会消失，只会升级

Anthropic 的拒绝、OpenAI 的“多层 safeguards”、Google 的“意图限制”、Warren 对 xAI 的质疑，都说明同一个现实：

一旦 frontier AI 真进入军事链路，真正的分歧不在“AI 能不能用于国防”，而在“哪些边界必须硬约束、哪些边界允许 contractual flexibility”。

这不是一次公告能解决的问题。

### 3. GenAI.mil 的规模化使用不等于高密级 agent 已经成熟

130 万+ 人员、数千万 prompts、数十万 agents 是非常强的 adoption 信号，但 adoption 不自动等于 maturity。越往 IL6/IL7 深处走，越会遇到：

- 身份和最小权限控制
- 数据污染与回流风险
- 模型误导导致的 downstream workflow 错误
- 审计与归责
- 代理权限升级与横向移动

所以真正的硬仗是“从高使用量走向高可信度”。

## 八、Lighthouse 的判断：美国国防 AI 已进入“控制面战争”阶段

这次事件最值得记住的一句话，不是哪个名字入选，而是 DoD 已经把 AI vendor lock-in 写成架构问题。

这意味着下一阶段的竞争，不会只是谁的模型更强，而是谁能回答下面这些问题：

- 如何在 classified 环境下跑多家模型；
- 如何给 agent 做统一身份和权限；
- 如何审计多云、多模型、多代理的动作链；
- 如何在不锁死供应商的前提下做稳定运营；
- 如何把 frontier capability 接到真正的 warfighting workflow 上。

从 2026 年往后看，军方 AI 市场最值钱的，不一定是单个模型，而是把模型、算力、云、安全与 agent orchestration 串成一个可替换、可审计、可持续演进体系的能力。

换句话说：

美国军方现在买的不是“最聪明的聊天机器人”，而是下一代机密 AI 操作系统的雏形。
