---
title: "深度解读 | Anthropic《An update on recent Claude Code quality reports》：一次把 Coding Agent 真实故障面掀开的复盘"
description: "Anthropic, Claude Code, postmortem, reasoning effort, prompt caching, system prompt, verbosity, v2.1.116, agent reliability"
---

# An update on recent Claude Code quality reports

> 原文链接：https://www.anthropic.com/engineering/april-23-postmortem
> 来源：Anthropic Engineering
> 发布日期：2026-04-23
> 核对说明：已完整阅读原文全文，并检索过去 14 天 `deep-*.md`，未发现同一事件的 deep 重复稿。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Anthropic 这次承认的不是“模型本身突然变差”，而是 Claude Code 外围系统同时在 reasoning 默认值、长闲置 session 的 thinking 清理逻辑、以及 system prompt 压缩输出三条线上出了问题。 |
| 大白话版 | 用户以为是 Claude 变笨了，Anthropic 说真正的问题是：默认思考深度调低了、长会话记忆被 bug 持续清掉了、还顺手把话说太短，三件事叠在一起把 coding 体验砸坏了。 |
| 原文确认的关键点 | API 与 inference layer 未受影响；三项问题已在 2026-04-20 的 `v2.1.116` 前后修复；缓存相关 bug 在 `v2.1.101` 修复；一个更广泛的 eval 中观察到 system prompt 改动带来 3% drop；Anthropic 于 2026-04-23 为所有订阅用户重置 usage limits。 |
| 影响范围 | Claude Code、Claude Agent SDK、Claude Cowork；不包括 API。 |
| 最值得记住的结论 | 2026 年 coding agent 的真实可靠性，越来越取决于“模型 + prompt + session 管理 + 缓存 + UI 默认值”的系统协同，而不是只看底模参数。 |
| 适合谁看 | 做 coding agent、终端助手、IDE copilot、长会话工作流、工具调用编排、AI 产品评测的人。 |

## 为什么这篇复盘值得深读

Anthropic 这篇工程博文的真正价值，不是“承认出了 bug”这么简单，而是它把一个行业里最容易被模糊处理的问题拆开了：当用户说“模型最近明显变差”，到底是在说模型权重退化，还是产品层和代理层的工程系统失真？

这篇文章给出的答案很明确：这次主要不是 API 层，也不是 inference 层，更不是 Anthropic 主动把模型降级，而是三类不同机制在不同时间影响了不同流量切片，最后被用户统一感知成“Claude Code 质量下滑”。

这其实比单点故障更有代表性。因为真实世界里的 agent 产品，本来就不是一个纯模型问题，而是一个复合系统问题。

## 完整内容还原

### 1. Anthropic 先划清边界：问题存在，但 API 没坏

原文开头先给了一个很关键的框架：过去一个月，他们一直在调查“Claude 响应变差”的报告，最终将其追溯到三个彼此独立的变化。这些变化影响了 Claude Code、Claude Agent SDK 和 Claude Cowork，但 API 没有受到影响。

这句话很重要，因为它把讨论边界定死了：

1. 不是全平台普遍性的底模退化；
2. 不是推理服务层的整体劣化；
3. 是围绕 Claude Code 这类 agent 产品层的多点失真。

Anthropic 同时说，三项问题截至 2026-04-20 均已解决，对应公开版本口径是 `v2.1.116`。

### 2. 第一处变更：把默认 reasoning effort 从 high 调到 medium

Anthropic 说，2026 年 2 月在 Claude Code 中发布 Opus 4.6 时，默认 reasoning effort 是 `high`。随后他们收到用户反馈：高 effort 模式下，Claude Opus 4.6 有时思考过久，UI 看起来像卡死，延迟和 token 消耗也不成比例。

于是他们在 2026-03-04 做了一个产品层判断：把 Claude Code 默认 effort 从 `high` 改成 `medium`，希望换来更低延迟、更少 usage limit 消耗，并通过产品内提示解释这项变化。

原文对 reasoning effort 的解释非常直白：
- 想得越久，通常输出越好；
- 但代价是更高延迟和更多 usage 消耗；
- effort 本质上就是 test-time-compute 曲线上的一个权衡点；
- Claude Code 在产品层选一个默认点，再通过 `/effort` 暴露其他选项。

Anthropic 的内部 eval 结论是：`medium` 只带来“略低”的智能下降，但能显著降低大多数任务延迟，还能减少极端长尾思考时间，并帮助用户更好保留 usage limits。

问题在于，这个产品层最优解和真实用户预期不一致。改完以后，用户开始反馈 Claude Code “感觉没那么聪明了”。Anthropic 尝试过多轮界面修正，让用户更清楚当前 effort 设置，包括：
- 启动提示；
- 内联 effort selector；
- 把 `ultrathink` 带回来。

但原文承认，大多数用户仍然保留了 `medium` 默认值。最后 Anthropic 在 2026-04-07 撤回这个决定：
- Opus 4.7 默认 `xhigh`；
- 其他模型默认 `high`。

这里最重要的不是具体哪个档位，而是 Anthropic 明确承认：他们原先为了改善延迟和成本，做了一个违背核心用户价值排序的默认值决策。

### 3. 第二处变更：一次缓存优化，把旧 reasoning 持续清没了

这是整篇文章里最有工程含量、也最像“真实 agent bug”的部分。

Anthropic 解释说，Claude 在执行任务时，其 reasoning 通常会保留在会话历史中，这样后续每一轮都能看到：为什么自己做了某些编辑、为何调用了某些工具。

2026-03-26，他们上线了一项本意是提效的改动。逻辑原本很简单：
- 如果一个 session 闲置超过 1 小时；
- 该 session 恢复时本来就会 cache miss；
- 那么可以只在恢复时清理旧 thinking 段，减少未命中缓存时需要重新发送的 token 数，降低恢复成本；
- 之后再继续发送完整 reasoning 历史。

为此，他们使用了 `clear_thinking_20251015` API header 和 `keep:1`。

真正出错的地方在实现，而不是设计目标。原文明确说：
- 这个逻辑本该只执行一次；
- 实际 bug 却让它在该 session 之后的每一轮都持续执行；
- 一旦某个 session 触发过闲置阈值，之后每次请求都会只保留最近一段 reasoning，丢弃更早内容；
- 如果用户在 Claude 正处于工具调用中途时又发送 follow-up，这个 broken flag 还会让当前轮 reasoning 也被一起丢掉。

结果就是：Claude 表面上还在继续执行，但它越来越失去“为什么自己这样做”的连续记忆。用户看到的体感则变成：
- 健忘；
- 重复；
- 工具选择变怪；
- usage limits 掉得比预期更快。

Anthropic 进一步解释，持续丢掉 thinking block 还会让后续请求不断 cache miss，这也是他们认为 usage limits 异常消耗更快的原因之一。

这部分最有意思的细节有三个。

第一，问题非常像真实 agent 产品中的“链路内存损坏”，而不是传统聊天机器人的回答波动。

第二，Anthropic 承认有两个无关实验让复现更难：
- 一个是仅内部使用的 server-side message queuing 实验；
- 一个是 thinking 展示方式的正交改动，它在大多数 CLI session 中把这个 bug 给“遮住了”。

第三，他们说这个改动穿过了多层防线：
- 人工 code review；
- 自动 code review；
- unit tests；
- end-to-end tests；
- automated verification；
- dogfooding。

也就是说，这不是“根本没测”导致的低级错误，而是一个位于 context management、Anthropic API、extended thinking 三者交界处的 corner case，且很难在内部环境中稳定重现。

Anthropic 还补了一个很值得行业注意的细节：他们回测了相关 pull request，结果是 Opus 4.7 在提供完整代码仓上下文时能找到这个 bug，而 Opus 4.6 不能。于是他们决定把“代码评审时支持更多 repository context”落成新的改进方向。

这个 bug 最终在 2026-04-10 的 `v2.1.101` 修复。

### 4. 第三处变更：为了减少 verbosity 的 system prompt 改动，意外伤到 coding 质量

第三个问题来自 prompt 层。

Anthropic 说，Claude Opus 4.7 相比前代有个明显行为特征：更 verbose。它在硬问题上更聪明，但也会产生更多输出 token。因此在发布 Opus 4.7 前几周，他们一直在为 Claude Code 做适配，想通过模型训练、prompting、thinking UX 等多种手段压缩 verbosity。

真正造成负面影响的是 system prompt 新增的一段限制：

“Length limits: keep text between tool calls to ≤25 words. Keep final responses to ≤100 words unless the task requires more detail.”

Anthropic 说，这项改动在内部测试数周后，没有在当时所跑的 eval 中出现回归，于是和 Opus 4.7 一起在 2026-04-16 上线。

但在本次调查中，他们做了更广泛的 ablation：通过删除 system prompt 里的单行指令，观察每一行的影响。其中一个更广的评测集合显示，这条长度限制让 Opus 4.6 和 4.7 都出现了 3% drop。于是他们把这项 prompt 改动纳入 2026-04-20 的回滚。

这段内容极其关键，因为它说明：
- prompt 微调不是“风格无害层”；
- 过度压缩 tool call 之间的自然语言，会伤到实际编码智能；
- 这种伤害未必能被窄 eval 及时捕捉；
- 同样一条 prompt line，可能跨模型生效，但负面影响并不容易提前暴露。

### 5. 收尾：Anthropic 打算怎么改

原文最后给了几条非常具体的“以后怎么做”：

1. 让更大比例的内部员工使用和公众完全一致的 Claude Code build，而不是内部用于试验新功能的版本；
2. 改进内部 Code Review 工具，并把改进后的版本也推给客户；
3. 对 system prompt 变化上更严格控制；
4. 对每次 system prompt 修改，都跑更广的 per-model eval；
5. 持续做 ablation，理解每一行 prompt 的影响；
6. 新建 prompt change review / audit 工具；
7. 在 `CLAUDE.md` 中加入指导，确保 model-specific 改动只作用于目标模型；
8. 凡是可能和 intelligence 做 tradeoff 的改动，都增加 soak period、更广 eval 和 gradual rollout；
9. 在 X 的 `@ClaudeDevs` 和 GitHub 集中线程中更透明地更新产品决策。

最后，Anthropic 也明确感谢用户通过 `/feedback` 和公开复现案例提供线索，并宣布在 2026-04-23 为所有订阅用户重置 usage limits。

## 核心技术洞察

## 1. 用户感知到的“模型退化”，经常是代理系统退化

这篇文章最重要的技术洞察，是把“模型能力下降”拆回到系统层。

用户感受到的是统一结果：
- 没以前聪明；
- 不连贯；
- 老忘事；
- 工具乱用；
- 更费额度。

但 Anthropic 最终拆出来的是三个不同层次的问题：
- 默认推理强度配置问题；
- session / cache / reasoning 历史管理 bug；
- system prompt 风格控制问题。

这说明 coding agent 的产品质量，已经不能用“模型版本号”单独解释。底模、默认参数、会话记忆、工具调用上下文、prompt harness、产品 UI 文案，任何一层同时轻微偏移，都可能在用户端被放大成“模型崩了”。

## 2. 静态 eval 足够好，不代表真实 workflow 足够好

Anthropic 原文多次承认：
- 内部 usage 和 eval 一开始没有复现出问题；
- 多周内部测试没有看到 verbosity prompt 的回归；
- cache bug 在多种 review 和测试体系里都漏过去了。

这不是 Anthropic 独有的问题，而是所有 agent 产品都面临的结构性问题：

真实 coding workflow 具备下面这些特征：
- 长时序；
- 会跨空闲期恢复；
- 会穿插工具调用；
- 会产生并发 follow-up；
- 会被 UI 与默认值塑形；
- 对“为什么上一步这么做”的过程连续性极其敏感。

而很多 eval 更擅长测：
- 单轮任务；
- 短上下文；
- 明确定义的 pass/fail；
- 相对稳定的输入分布。

这次复盘其实在提醒整个行业：不补 workflow-native eval，agent 产品就会反复出现“实验室正常、用户现场失真”。

## 3. 默认值本身就是产品策略，不只是 UI 参数

Anthropic 原文很坦率：把默认 effort 从 `high` 改成 `medium`，是为了平衡延迟、token 和使用额度；但最后发现，核心用户更愿意接受“默认更聪明，必要时自己降档”，而不是“默认更省”。

这意味着对于 coding agent 来说，默认值并不是一个可随手调的小参数，而是产品哲学：
- 你到底优先保障任务成功率，还是优先保障流畅度与成本；
- 你默认把用户视为“要省资源”，还是“要完成复杂任务”；
- 你是否愿意让高价值用户承担更高的默认推理成本。

对开发者工具尤其如此，因为用户会把“智能不够”看作根本性背叛，而不会把“多等一点”当作同等严重的问题。

## 4. Prompt 改动已经进入“需要审计”的工程时代

最值得行业警惕的一点，是 Anthropic 不再把 system prompt 改动当成低风险配置层，而是明确说要：
- 做更严格控制；
- 做逐行 ablation；
- 建 review 和 audit tooling；
- 做 gradual rollout。

这说明 2026 年的领先 agent 产品里，prompt 已经不是临时试验文本，而是正式的生产配置资产。它和代码一样需要版本管理、审计、回归测试、定向生效边界和发布策略。

## 实践指南：做 Agent 产品的人应该学到什么

### 1. 别只测“能不能完成任务”，要测“跨空闲期还能不能延续任务”

Anthropic 这次最伤的 bug，发生在 idle 超过 1 小时后的恢复路径。很多团队会重点测首轮成功率、多工具链成功率，却忽略 session 恢复和长闲置重入。

最低限度应该补的测试面包括：
- 超过固定 idle 阈值后的恢复；
- tool use 进行中插入 follow-up；
- session 跨版本、跨配置恢复；
- cache miss / cache hit 两种路径差异；
- reasoning block 被裁剪后的连续性。

### 2. 对“更短、更省 token”的改动一律保持怀疑

任何试图压缩 verbosity、减少 token、缩短等待时间的改动，都可能在 coding 场景里伤到真正重要的东西：
- 中间状态表达；
- tool call 选择理由；
- 人机协同中的可解释性；
- 对复杂任务的思维展开空间。

经验上，这类改动不能只看成本收益，还要看：
- 是否损害复杂任务成功率；
- 是否让 agent 更容易重复和乱跳；
- 是否让用户更难 steer；
- 是否让失败模式更隐蔽。

### 3. 把用户反馈系统当成在线观测基础设施，而不是客服渠道

Anthropic 最后公开感谢 `/feedback` 和线上可复现案例，这一点很真实。很多 agent 问题不是靠离线 eval 最先发现，而是靠高频用户在真实生产任务中率先踩出来。

所以真正有效的反馈体系，不是收集情绪，而是收集：
- 具体仓库；
- 具体命令；
- 具体会话阶段；
- 是否经过 idle；
- 是否发生 tool use；
- 具体版本号；
- 是否出现 usage limit 异常。

### 4. 内部 dogfood 必须尽量接近公共 build

Anthropic 特别提到，要让更多内部员工使用“exact public build”。这句话很关键。因为只要内部大多数人跑的不是和用户完全相同的产线版本，就很容易出现：
- 内部环境把 bug 遮住；
- 实验性改动与正式版本相互干扰；
- 复现路径与用户现场不一致。

Agent 产品尤其需要做到“用户真实路径优先”，否则 dogfood 只能证明内部环境健康，不能证明正式产品健康。

## 横向对比

| 维度 | 默认 effort 调整 | thinking 清理 bug | system prompt 限长 |
|---|---|---|---|
| 发生时间 | 2026-03-04 | 2026-03-26 | 2026-04-16 |
| 原始目的 | 降低长尾延迟与 usage 消耗 | 降低长闲置 session 恢复成本 | 降低 verbosity 与输出 token |
| 影响对象 | Sonnet 4.6、Opus 4.6 | Sonnet 4.6、Opus 4.6 | Sonnet 4.6、Opus 4.6、Opus 4.7 |
| 用户体感 | 感觉没以前聪明 | 健忘、重复、工具选择异常、额度掉更快 | coding 质量下滑、表达过短 |
| 本质问题 | 默认值选错了用户偏好 | session 连续记忆被持续破坏 | prompt 风格约束越界伤到能力 |
| 为什么难发现 | 内部认为智能下降很小且换来明显延迟收益 | corner case，且被其他内部实验与 CLI 展示逻辑掩盖 | 早期 eval 没测出回归 |
| 最终动作 | 2026-04-07 回滚，恢复更高默认 effort | 2026-04-10 在 `v2.1.101` 修复 | 2026-04-20 回滚，纳入更严格 prompt 控制 |

再往高一层看，这三件事分别代表三种典型 agent 失真来源：
- 策略层失真：默认配置改错；
- 状态层失真：上下文记忆链断裂；
- 提示层失真：系统 prompt 为了风格牺牲任务质量。

这也是这篇 postmortem 比普通事故公告更值钱的地方：它几乎把 coding agent 常见故障面的三大类都展示了一遍。

## 批判性分析

### 1. 最值得肯定的地方：Anthropic 说得足够具体

这篇文章最值得肯定的是透明度。Anthropic 没有停留在“我们注意到用户反馈并已修复”，而是给出了：
- 三项问题的具体日期；
- 涉及产品范围；
- 默认值怎么改、何时撤回；
- 哪个 header 与哪个参数组合出问题；
- 哪条 system prompt 造成回归；
- 哪个版本修复了缓存 bug；
- 哪个更广泛 eval 看到 3% drop。

对行业来说，这种粒度远比公关式“持续优化体验”更有价值。

### 2. 但更大的问题也被暴露了：Anthropic 的 eval 仍不够贴地

这篇文章最令人不安的并不是 bug 本身，而是 Anthropic 自己承认：
- internal usage 和 eval 起初都没复现；
- 多种 review/test/dogfood 都没挡住；
- prompt 改动数周内测仍没测出问题。

如果一家顶级实验室在 coding agent 方向都还难以稳定评估真实退化，那说明整个行业对“真实开发流评测”的掌握程度仍远未成熟。

换句话说，这次 postmortem 不是 Anthropic 一家翻车，而是整个 AI coding 行业都应该感到压力的信号。

### 3. “API 未受影响”很重要，但也提醒我们别只盯模型 API 指标

Anthropic 很强调 API 和 inference layer 没有问题。这当然重要，但从用户角度看，用户买到的不是抽象 API，而是一个能连续完成工作、能稳定调用工具、不会莫名忘事的产品体验。

所以这篇文章反而强化了一个现实：
- 只看 API benchmark，不足以判断 agent 产品质量；
- 只看模型胜率，不足以解释真实开发体验；
- 只看延迟和 token，也可能做错产品决策。

未来行业真正要比的，是端到端任务可靠性。

### 4. 独立观察：这不是一次“Claude 变差”事件，而是一次“代理系统复杂度失控”事件

如果只看社交媒体争议，这件事很容易被总结成“Claude Code 最近质量下滑”。但读完原文全文，更准确的判断应该是：

这不是一个单一的模型质量事故，而是一个高复杂度 agent 产品在参数默认值、上下文生命周期管理、prompt harness 约束三处同时漂移后，被用户集中放大的系统性可靠性事故。

这也是为什么它值得写成深度稿。因为它讲的不是 Anthropic 独有的失败，而是所有正在做 coding agent 的团队几乎都会撞上的问题：
- 你会不会为省成本改错默认值；
- 你会不会在上下文压缩里悄悄弄丢连续推理；
- 你会不会为了“少说点”把智能一起剪掉；
- 你会不会以为 eval 绿了就等于真实世界没事。

## 结论

Anthropic 这篇《An update on recent Claude Code quality reports》最重要的意义，不是它证明 Claude 没有“故意变笨”，而是它第一次相当系统地把 coding agent 产品质量的真实故障面暴露在公众面前。

结论可以压缩成三句：

1. 用户感知到的“模型退化”，往往是代理系统多层小改动叠加后的端到端退化；
2. 真实 coding workflow 的评测难度，远高于传统静态 eval；
3. 2026 年最强的 coding agent，不只是谁模型更聪明，而是谁更能稳住默认值、上下文、prompt 和工具链之间的协同。
