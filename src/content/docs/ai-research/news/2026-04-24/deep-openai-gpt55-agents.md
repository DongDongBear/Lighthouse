---
title: "深度解读 | OpenAI GPT-5.5：旗舰模型不再只卷智商，而是把 agent 完成率、监督成本和运行效率一起抬上台面"
description: "OpenAI GPT-5.5, GPT-5.5 Pro, agentic coding, Terminal-Bench 2.0, SWE-Bench Pro, GDPval, system card, Codex, ChatGPT"
---

# Introducing GPT-5.5

> 原文链接：https://openai.com/index/introducing-gpt-5-5/
> 系统卡：https://openai.com/index/gpt-5-5-system-card/
> 生物安全计划：https://openai.com/index/gpt-5-5-bio-bug-bounty/
> 来源：OpenAI
> 发布日期：2026-04-23
> 取文说明：openai.com 直连与浏览器会命中 Cloudflare challenge；本文基于 `r.jina.ai` 成功抓取并完整阅读上述 3 篇 OpenAI 官方正文，不再只依赖 X 帖摘要。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | GPT-5.5 的核心变化不是“又强了一点”，而是 OpenAI 明确把旗舰模型卖点切成了“更少人盯、更会用工具、更能把长任务做完”。 |
| 大白话版 | 以前你得一步步带着模型干活；现在 OpenAI 想卖的是一个更像同事的东西：你把一团乱麻交过去，它能自己规划、查资料、跑工具、回头检查，然后尽量把整件事做完。 |
| 最关键数字 | Terminal-Bench 2.0 82.7%；SWE-Bench Pro 58.6%；Expert-SWE 73.1%；GDPval 84.9%；OSWorld-Verified 78.7%；BrowseComp 84.4%；Tau2-bench Telecom 98.0%；Codex 上下文 400K；API 上下文 1M；API 定价 $5/$30 per 1M input/output tokens。 |
| 价值评级 | A — 这是一次明确的 agent 平台总升级，而不只是模型迭代。 |
| 适合谁看 | 做 coding agent、企业工作流 agent、电脑使用代理、长任务编排、模型评测与安全治理的人。 |
| 本文核心判断 | GPT-5.5 标志着 OpenAI 正把旗舰模型的竞争焦点，从“回答更聪明”改写成“执行更完整 + 监督更省 + 部署更经济”。 |

## 为什么这次发布值得单独拆

OpenAI 这次最值得注意的，不是 GPT-5.5 这个版本号，而是它选择怎样定义“更强”。

如果沿用旧叙事，它完全可以把 GPT-5.5 讲成一轮常规能力升级：更强推理、更高 benchmark、更低幻觉。但 OpenAI 官方正文一开头就把主轴钉死在另一套语言上：

- understand what you’re trying to do faster
- carry more of the work itself
- use tools
- check its work
- keep going until a task is finished
- little micromanagement
- low latency
- fewer tokens

这已经不是聊天模型的语言，而是 agent 系统的语言。

也就是说，OpenAI 正在公开承认：2026 年最重要的竞争，不再只是“谁答得更聪明”，而是“谁更像一个可托付执行链条的工作模型”。

## OpenAI 官方到底发布了什么

### 1. GPT-5.5 是“real work and agents”优先的新旗舰

官方原文第一段写得非常直白：GPT-5.5 是 “our smartest and most intuitive to use model yet”，并强调它擅长：

- 写代码与调试代码
- 在线研究
- 数据分析
- 生成文档和表格
- 操作软件
- 跨工具移动直到任务完成

这里最关键的不是列举场景，而是 OpenAI 对能力结构的描述：

1. 更早理解任务意图
2. 更少依赖用户逐步微操
3. 更会调用工具
4. 更会自查
5. 更能在长链条任务里坚持到完成

这五点拼起来，正好构成了一个成熟 agent loop 的核心：理解目标、规划步骤、调用外部能力、校验中间结果、持续推进到结束。

### 2. OpenAI 把“监督成本”第一次摆到和智能同等重要的位置

如果只看模型名字，很多人会以为这还是常规迭代；但官方整篇文章的真正亮点在于，它反复强调的不是单点智力，而是使用成本结构。

OpenAI 明确说：

- GPT-5.5 matches GPT-5.4 per-token latency in real-world serving
- 在同类 Codex 任务里使用 significantly fewer tokens
- larger, more capable models are often slower to serve，但 GPT-5.5 尽量没有让速度为能力买单

这说明 OpenAI 对旗舰模型的目标函数已经变了。

过去旗舰模型更像“能力最大化”的产物；现在 GPT-5.5 更像“能力 × 速度 × token 效率 × 监督负担”联合优化后的结果。真正想卖给企业和高频用户的，不是更华丽的回答，而是：

- 少返工
- 少 retries
- 少 prompt 微操
- 少 token 浪费
- 更稳定地走完整个执行过程

## benchmark 信号：OpenAI 想证明它不只会聊天

### 一、最硬的主战场是 coding agent

官方文章把 coding 摆在了第一优先级，而且给出了三组非常明确的 benchmark：

| 评测 | GPT-5.5 | GPT-5.4 | Claude Opus 4.7 | Gemini 3.1 Pro |
|---|---:|---:|---:|---:|
| Terminal-Bench 2.0 | 82.7% | 75.1% | 69.4% | 68.5% |
| SWE-Bench Pro (Public) | 58.6% | 57.7% | 64.3% | 54.2% |
| Expert-SWE (Internal) | 73.1% | 68.5% | — | — |

这里最值得注意的是 Terminal-Bench 2.0。因为这个 benchmark 不测“会不会写一个函数”，而是测复杂命令行工作流中的规划、迭代和工具协调。GPT-5.5 从 75.1% 拉到 82.7%，这说明它真正增强的是执行链条，而不是只增强了单步代码生成。

SWE-Bench Pro 上 58.6% 只比 GPT-5.4 提升 0.9 个点，看起来没有特别夸张，但 OpenAI 强调的是：它在这些任务里能用更少 token 完成，而且 single pass end-to-end resolve 的能力更强。对真实生产使用来说，这往往比纸面涨点更值钱。

### 二、第二战场是知识工作与电脑使用

OpenAI 还给出了一组更贴近企业办公与 computer-use 的指标：

| 评测 | GPT-5.5 | GPT-5.4 | GPT-5.5 Pro | Claude Opus 4.7 | Gemini 3.1 Pro |
|---|---:|---:|---:|---:|---:|
| GDPval | 84.9% | 83.0% | 82.3% | 80.3% | 67.3% |
| OSWorld-Verified | 78.7% | 75.0% | — | 78.0% | — |
| BrowseComp | 84.4% | 82.7% | 90.1% | 79.3% | 85.9% |
| Toolathlon | 55.6% | 54.6% | — | — | 48.8% |
| Tau2-bench Telecom | 98.0% | 92.8% | — | — | — |

这些指标连起来看，OpenAI 的策略很清楚：

- GDPval 证明它能做职业化知识工作
- OSWorld-Verified 证明它能更稳地操作真实电脑环境
- BrowseComp 和 Toolathlon 证明它不是纸上谈兵，而是真会找资料、会调工具
- Tau2-bench Telecom 这种任务流 benchmark 则更像企业工作流的缩略图

这套指标组合说明 OpenAI 正在把 GPT-5.5 定义成“可工作的计算机使用模型”，而不是“能回答问题的模型”。

### 三、学术与科学研究被当成第三增长曲线

OpenAI 还把 scientific research 明确写成 GPT-5.5 的重点突破方向之一。官方给出的公开结果包括：

| 评测 | GPT-5.5 | GPT-5.4 | GPT-5.5 Pro | Claude Opus 4.7 | Gemini 3.1 Pro |
|---|---:|---:|---:|---:|---:|
| GeneBench | 25.0% | 19.0% | 33.2% | — | — |
| BixBench | 80.5% | 74.0% | — | — | — |
| FrontierMath Tier 1-3 | 51.7% | 47.6% | 52.4% | 43.8% | 36.9% |
| FrontierMath Tier 4 | 35.4% | 27.1% | 39.6% | 22.9% | 16.7% |

OpenAI 在正文里用的不是“答题更强”，而是“persisting across the loop of scientific work”。这很关键。它想强调的不是能不能给出一个漂亮结论，而是能不能：

- 探索问题
- 收集证据
- 检查假设
- 解释结果
- 决定下一步实验

这本质上仍然是 agent 能力，只不过场景从 coding 和企业工作流扩展到了科研。

## 产品与商业层：OpenAI 在卖一整套 agent 入口

### 1. ChatGPT、Codex、API 三个入口被统一成同一叙事

官方这次没有把 GPT-5.5 局限在单一产品中，而是同时铺向三个面：

- ChatGPT：GPT-5.5 Thinking
- ChatGPT：GPT-5.5 Pro
- Codex：GPT-5.5
- API：即将上线 gpt-5.5 与 gpt-5.5-pro

其中最值得注意的是 Codex 的定位。OpenAI 明确写到：

- GPT-5.5 在 Codex 中可用于 implementation、refactor、debugging、testing、validation
- Codex 中 GPT-5.5 可处理 documents、spreadsheets、slide presentations
- Codex 的 computer use skill 正把模型推向真正使用电脑

这等于把 Codex 从“代码工具”扩成了“工作执行界面”。

### 2. 上下文窗口与定价都在为 agent 化服务

官方给出的关键产品参数是：

- Codex 中 GPT-5.5：400K context window
- API 中 GPT-5.5：1M context window
- API 价格：$5 / 1M input tokens，$30 / 1M output tokens
- gpt-5.5-pro：$30 / 1M input，$180 / 1M output
- Fast mode：1.5x 更快，成本 2.5x

这说明 OpenAI 正在围绕不同 agent 场景分层：

- 普通生产工作：GPT-5.5
- 更高精度、更高容忍成本的任务：GPT-5.5 Pro
- 需要更大吞吐与更高交互速度的场景：Fast mode

这里最重要的是上下文窗口。400K 和 1M 并不只是数字炫耀，而是对长任务、多文档、多工具、持续上下文 agent 的直接支持。没有长上下文，你很难把“任务做到完成”这套叙事真正落到复杂工作流里。

## 安全侧：OpenAI 为什么同时发 system card 和 bio bug bounty

### 1. GPT-5.5 的发布方式本身就在说明风险边界

OpenAI 不是只发了一篇产品博文，而是同步发了：

- GPT-5.5 System Card
- GPT-5.5 Bio Bug Bounty

这说明它对外想传达的不是“我们有更强模型了”，而是“我们知道这次能力提升已经碰到需要额外治理的边界”。

System Card 里最关键的两句是：

- GPT-5.5 and GPT-5.5 Pro were evaluated under the Preparedness Framework
- biological/chemical and cybersecurity capabilities of GPT-5.5 are treated as High

也就是说，OpenAI 认为 GPT-5.5 虽未达到 Critical cyber capability level，但在 cyber 与 bio 两条线上都已经上到了需要更强缓释措施的 High 档。

### 2. Bio Bug Bounty 把安全测试从“评估”推进到“对抗性竞赛”

OpenAI 同步开放了 GPT-5.5 的 Bio Bug Bounty，重点信息包括：

- scope：GPT-5.5 in Codex Desktop only
- challenge：寻找一个 universal jailbreak，绕过五道 bio safety challenge
- reward：首个全通用 jailbreak 奖金 $25,000
- 时间：4 月 23 日开放申请，6 月 22 日截止报名，4 月 28 日开始测试，7 月 27 日结束
- 所有 prompts、completions、findings 受 NDA 保护

这意味着 OpenAI 已不满足于内部红队和标准评估，而是开始主动邀请外部 bio / red-team 研究者对其 safeguard 做通用越狱攻击测试。这是 frontier 模型治理进入“持续攻防”阶段的明确信号。

### 3. 网络安全侧则强调 trusted access，而不是一刀切收紧

官方正文还专门强调：

- GPT-5.5 的 cyber 能力较 GPT-5.4 又上了一阶
- 会部署 stricter classifiers for potential cyber risk
- 但同时通过 Trusted Access for Cyber 给验证过的防御方更少限制

这套思路不是“因为风险高就全封”，而是“提高默认防护，同时给可信防御场景更强能力”。这很符合 agent 模型时代的现实：一味收紧会直接伤害正当高价值工作流。

## 从产品哲学看，GPT-5.5 真正变了什么

### 1. 从“回答引擎”转向“任务推进引擎”

GPT-5.5 整体叙事里的最大变化，是 OpenAI 不再主要围绕问答能力定义旗舰模型，而是围绕任务推进能力定义旗舰模型。

这会带来三个行业级后果：

1. benchmark 结构会继续从纯智力测试转向 workflow 测试
2. 模型价值会更多由监督成本、完成率、效率决定
3. 工具调用、长期上下文和电脑操作会从附属功能变成主能力

### 2. OpenAI 正在把“模型层、执行层、分发层”绑定

GPT-5.5 本身是模型层；Codex、ChatGPT 和 API 是分发层；computer use、tool use、long context 和 trusted access 是执行层与治理层。OpenAI 这次不是在卖一个单点技术，而是在把三层拼起来卖：

- 更强 agent 模型
- 更完整 agent 入口
- 更现实 agent 治理

### 3. 对竞争对手的直接压力是什么

这次发布给 Anthropic、Google、GitHub、Cursor、以及中国大厂都提了同一类问题：

- 你的模型到底能不能把长任务做完？
- 你是不是还要用户一直盯着？
- 你的 token 成本和延迟能不能撑住高频使用？
- 你有没有 system card 之外的持续攻防治理机制？

以后再只讲“模型更聪明”会越来越不够，因为 OpenAI 已经把市场语言切到了“模型是否像一个能干活的协作者”。

## 批判性分析

### 1. OpenAI 的证据里，仍有不少 internal eval 与精选案例

虽然这次官方材料已经比 X 帖完整得多，但仍要看到它的局限：

- Expert-SWE、investment banking modeling、部分 cyber/coding 结果是 internal eval
- 大量客户证言来自精选 early testers
- system card 页面公开信息相对简短，很多安全细节仍在外链 PDF / deployment safety 页面

所以这次发布已经足够支撑深读，但仍不能把所有数字都当成完全等权的第三方结论。

### 2. GPT-5.5 在部分学术 benchmark 上并非全线碾压

例如 Humanity’s Last Exam 上，GPT-5.5 并没有压过所有竞争对手；GPQA Diamond 也不是绝对领先。这进一步说明 OpenAI 已经有意把主叙事从“学术考试王者”转向“现实工作王者”。

这不是缺点，但它意味着市场以后要用不同尺子看它。

### 3. 最值得观察的不是首日分数，而是 API 落地后的真实经济性

OpenAI 反复强调更少 token、更低 micromanagement、更高完成率。真正的商业检验不在首发文章，而在接下来两件事：

- API 上线后，开发者在真实工作流里能否用更少 retries 达到更高完成率
- 企业是否愿意为 GPT-5.5 Pro 的高价位，持续支付精度溢价

如果这两点成立，GPT-5.5 就不是一次短期营销胜利，而会成为 agent 商业化的重要拐点。

## 结论

GPT-5.5 最重要的意义，不是 OpenAI 又出了一版更强模型，而是它把旗舰模型的价值函数彻底改写了。

从这次官方材料看，OpenAI 真正想让市场记住的已经不是：

- 它更会答题
- 它更会写一段代码
- 它更会推理一步

而是：

- 它能理解复杂目标
- 它能更自然地使用工具
- 它能更长时间保持在任务上
- 它能减少人工微操
- 它能在速度和成本不炸的情况下，把更多工作一路推到完成

这就是 GPT-5.5 的核心：OpenAI 正在把“模型竞争”推进到“agent 完成率竞争”。

对 Lighthouse 来说，这条不是普通模型新闻，而是一个明确信号：前沿模型公司的主战场，正在从静态智力，转向执行型智能。