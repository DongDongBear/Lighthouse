---
title: "Hermes、OpenClaw、Claude Code、Codex 架构级对比：四条 Agent 路线，四种产品哲学"
description: "Hermes Agent, OpenClaw, Claude Code, Codex, architecture comparison, agent runtime, memory, coding agent, personal assistant"
---

# Hermes、OpenClaw、Claude Code、Codex 架构级对比：四条 Agent 路线，四种产品哲学

> 对比对象：Hermes Agent、OpenClaw、Claude Code、Codex
> 说明：本文是架构级对比，不是功能清单对比；重点看系统边界、运行时组织方式、记忆与状态模型、入口形态和产品哲学。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 这四个系统表面都叫 Agent，但底层不是同一类产品。Hermes 在做长期 personal agent runtime，OpenClaw 在做多平台私人助理操作层，Claude Code 在做顶级 coding agent runtime，Codex 则更偏聚焦任务执行的代码代理。 |
| 大白话版 | 如果把 Agent 比作职业角色，Hermes 像长期驻场 CTO 助理，OpenClaw 像你的私人数字管家，Claude Code 像最强编程搭子，Codex 像高执行力代码外包工程师。 |
| 核心结论 | • Hermes 最像 agent OS • OpenClaw 最像 personal assistant substrate • Claude Code 最强项是代码工作流，不是长期人格系统 • Codex 最强项是高强度 coding loop，不是多入口个人助理 |
| 价值评级 | A，适合任何在搭 agent 产品、agent runtime、个人助理系统的人通读 |
| 推荐读者 | 做 AI infra、agent 产品、coding agent、personal assistant、automation runtime 的人 |

## 为什么这四个东西必须放在一起比较

这四个系统经常被放进同一个讨论池里，原因很简单：
- 都是“能调用工具”的 agent
- 都能通过模型完成复杂任务
- 都和 coding / assistant / automation 有关系

但如果真的把它们放进同一张架构图里看，就会发现它们解决的问题根本不一样。

很多误判，都是从“都叫 agent，所以应该按同一标准比”开始的。

真正更准确的问法应该是：

1. 这个系统的**第一性目标**是什么？
2. 它的**状态和记忆**怎么组织？
3. 它默认活在哪个**入口与运行环境**里？
4. 它最在意的是**长期关系**还是**单次任务完成**？
5. 它把 agent 当成一种**工具**、一种**助手**，还是一种**持续身份**？

只有这五个问题分清楚，比较才不至于失真。

## 先给结论：四个系统其实分属四条路线

### 路线 1：Hermes，长期 personal agent runtime / agent OS

Hermes 的核心，不是某个模型，也不是某个 CLI，而是一个长期运行的 agent runtime：
- 有 session state
- 有 memory 分层
- 有 skills 沉淀
- 有 gateway
- 有 cron
- 有 ACP
- 有多终端入口
- 有 tools registry 和 toolsets

它在解决的是：

> 一个 agent 如何长期活着、持续记住、跨入口存在、异步做事，并逐步积累能力。

### 路线 2：OpenClaw，多平台 personal assistant substrate

OpenClaw 的核心非常鲜明：
- workspace 中心化
- SOUL / USER / MEMORY / AGENTS 这类人格与上下文文件
- 多消息入口
- heartbeats / cron / channel routing
- 很强的“助理身份感”

它更像在做：

> 一个贴身私人助理的操作层和生活层基座。

OpenClaw 跟 Hermes 有相邻地带，但它的人格化、workspace continuity、消息渠道一体化味道更重。

### 路线 3：Claude Code，顶级 coding agent runtime

Claude Code 的本质不是 personal assistant，而是：

> 面向真实代码工作流的高质量 agent runtime。

它最强的地方是：
- coding task 分解
- 工具执行与反馈循环
- 文件编辑体验
- 权限模型
- 开发者交互设计
- 在代码仓库里的稳定性和效率

它不是围绕“记住你这个人”设计的，而是围绕“高质量完成代码工作”设计的。

### 路线 4：Codex，聚焦任务执行的代码代理

Codex 这一路通常更偏：
- 直接执行编码任务
- 高效率 code loop
- 比较干脆的 task-oriented behavior
- 更少强调长期人格和多平台存在

它的中心不是“长期关系”，而是：

> 给你一个能把 coding 任务推进下去的执行代理。

所以这四个东西放一起时，真正的关系不是“谁全方位吊打谁”，而是：

- Hermes 和 OpenClaw 更靠近长期助理和运行时基础设施
- Claude Code 和 Codex 更靠近 coding agent 和任务执行器

## 一、产品定位对比：它们到底把自己当成什么

### Hermes，把 agent 当“长期存在的数字个体”

Hermes 的产品叙事里最突出的关键词是：
- grows with you
- memory across sessions
- skills from experience
- multi-platform continuity
- server-based persistence

这说明 Hermes 从一开始就不把自己理解为“一次性帮你做点事”的 agent。

它想做的是一个：
- 有历史
- 有持续身份
- 有工作记忆与程序记忆
- 有多个接触面
- 可以异步替你跑任务

的长期系统。

### OpenClaw，把 agent 当“私人助理本人”

OpenClaw 的人格味更强。

它天然假设：
- agent 住在 workspace 里
- 有 SOUL / USER / MEMORY 这样的身份与关系文件
- 会读今天和昨天的记忆
- 会接群聊、私聊、心跳、cron
- 需要知道什么时候该说话、什么时候不该说话

所以 OpenClaw 的 agent，不像一个抽象 runtime，更像一个住在你数字生活里的助理角色。

如果说 Hermes 更像基础设施产品，OpenClaw 更像一个已经带 personality layer 的助理系统。

### Claude Code，把 agent 当“代码工作流上的主力工具”

Claude Code 没有那么强的“长期人格”诉求。

它关心的是：
- 你现在在哪个 repo
- 当前任务是什么
- 文件怎么改最合理
- 命令如何安全执行
- 上下文如何压缩与保持正确性
- 如何让开发者愿意持续把真实工作交给它

它不是住在你生活里，它是住在你的代码工作流里。

### Codex，把 agent 当“高执行力 coding worker”

Codex 通常更少做人格叙事，也更少强调生活层或长期私人助理层。

它的核心价值更简单直接：
- 接任务
- 读代码
- 改代码
- 跑命令
- 给结果

这条路线的好处是聚焦，坏处是通常不会天然长出完整的个人助理形态。

## 二、runtime 架构对比：谁在做系统，谁在做工作流

### Hermes：runtime 是第一公民

Hermes 的架构核心是一整套 runtime：
- `run_agent.py` conversation loop
- `model_tools.py` orchestration
- `tools/registry.py` registry
- `toolsets.py` capability packaging
- `hermes_state.py` state store
- `gateway/` messaging runtime
- `cron/` scheduler
- `acp_adapter/` editor runtime

Hermes 最大的特征就是：

**几乎所有东西都被组织成运行时组件，而不是散落的 feature。**

### OpenClaw：workspace + session + channel 是 runtime 主轴

OpenClaw 的 runtime 组织方式更像：
- 以 workspace 为中心
- 以上下文文件为持续底座
- 以消息平台和主会话为外部接口
- 以 skills 和 memory 为能力延伸
- 以 heartbeats / cron 为主动工作机制

它也有 runtime，但更明显地把 runtime 扎在“助理所处环境”里，而不是像 Hermes 那样更像通用 runtime substrate。

### Claude Code：repo-centric runtime

Claude Code 的 runtime 是非常典型的 repo-centric runtime。

也就是说，它的世界模型默认建立在：
- 当前代码仓库
- 当前命令执行环境
- 当前编辑任务
- 当前 diff 和工作区

之上。

它是围绕开发流程做了极强优化的 agent runtime，但这个 runtime 本质上还是**代码仓库上下文专用 runtime**。

### Codex：task-centric runtime

Codex 更像是 task-centric runtime。

它也有环境、上下文、工具和执行循环，但很多时候它最核心的假设不是：
- 我长期住在这里

而是：
- 我现在要把这个任务做掉

这种设计对 coding loop 很有效，因为减少了与长期 state 有关的复杂性。但代价是，它往往不天然具备 personal assistant 级延续性。

## 三、memory / state 对比：这是分水岭中的分水岭

### Hermes：三层分工最成熟

Hermes 最成熟的地方之一，是把“过去”拆成三层：
- persistent memory
- session search / transcript recall
- skills

再加上 SQLite + FTS5 state store，它实际上有：
- curated facts
- episodic history
- procedural memory

这是一种非常成熟的认知架构映射。

### OpenClaw：人格连续性和工作连续性更强

OpenClaw 的记忆体系更强依赖：
- MEMORY.md
- USER.md
- daily memories
- SOUL.md
- AGENTS.md

它的厉害之处在于：
- 不只是记事实
- 还记身份关系、表达风格、工作偏好、互动边界

也就是说，OpenClaw 的 memory 不是纯信息检索，而是更接近**人格连续性系统**。

从 personal assistant 角度，这很强。
从通用 runtime 角度，它的抽象层次没 Hermes 那么“平台化”。

### Claude Code：状态强，但更多是任务状态，不是人格状态

Claude Code 当然也有上下文管理、历史、压缩、工具结果回流等状态机制。

但它的重点是：
- 当前任务状态
- 当前仓库上下文
- 当前工作流连续性

而不是：
- 长期记住用户本人
- 跨平台持续扮演同一个私人助理

这不是缺点，而是选择。

### Codex：状态更轻，更有利于执行，但不适合做长期个人助理

Codex 的状态通常更偏即时执行服务。

好处：
- 轻
- 聚焦
- 不容易被长期状态污染

坏处：
- 很难天然长出深层 personal memory system
- 很难承担多入口、多天、多任务演进的私人助理角色

## 四、tool use 架构对比：谁在卷工具，谁在卷工具治理

### Hermes：tool registry + toolset + availability + async bridging，明显在卷治理

Hermes 的工具系统很成熟：
- 每个 tool 自注册
- schema / handler / check_fn 分离
- toolset 是一等公民
- sync/async bridging 做了大量底层修补
- result budget、availability gating、plugin discovery 都在体系内

它不只是“工具多”，而是工具治理能力很强。

### OpenClaw：tools 和 skills 关系更紧，重在助理工作流可用性

OpenClaw 的工具体系也强，但它的设计重点常常不只是“让工具本身更强”，而是：
- 工具如何服务一个有身份和工作边界的助理
- skills 如何调动工具
- 消息渠道和工具能力怎样衔接

它比起纯 runtime，更像在做“助理工作编排”。

### Claude Code：tool use 的强点在真实 coding workflow 贴合度

Claude Code 的工具执行强项不是 registry 花活，而是：
- 真正懂开发者当前要什么
- 编辑/命令/反馈闭环很顺
- 权限和交互 UX 打磨得非常好

换句话说，Claude Code 不是最像“agent 平台”的那个，但很可能是**最像成熟开发工具**的那个。

### Codex：tool use 更偏 execution-first

Codex 的优势通常在：
- 快速执行
- 比较直接
- 在 coding task 上不拖泥带水

它不一定会在 personal agent 治理层做很复杂的设计，因为它本来就更专注 task completion。

## 五、gateway / 入口形态对比：谁活在一个窗口里，谁活在你的数字世界里

### Hermes：真正多入口，且想保持统一身份

Hermes 很强调：
- CLI
- Telegram
- Discord
- Slack
- WhatsApp
- Signal
- ACP editor integration

这些入口不是装饰，而是产品定义的一部分。

它希望无论你从哪进来，都是同一个 agent runtime 在接你。

### OpenClaw：这方面是原生强项

OpenClaw 天然就是把消息入口、会话上下文、群聊边界、心跳、跨 session 延续放在中心位置的。

如果目标是“私人助理真的存在于多个聊天渠道里”，OpenClaw 这条路线非常对味。

### Claude Code：入口核心还是 terminal / editor

Claude Code 的入口世界非常明确：
- terminal
- IDE
- code review / file diff / command execution

它不需要同时活在一堆社交平台里，因为它主要不是为那个场景设计的。

### Codex：也是典型 coding surface 优先

Codex 的自然入口同样更像开发环境，而不是生活渠道。

所以如果你要做“每天在 Telegram 找 agent 干活”，Codex 路线通常不是自然选择。

## 六、skills / extensibility 对比：谁在做自我积累，谁在做任务能力

### Hermes：skills 是 procedural memory 的正式层

Hermes 的 skills 不是插件小玩具，而是：
- 有 frontmatter
- 有 supporting files
- 可 create/edit/patch/delete
- 可被再次注入 runtime
- 可以逐步形成 agent 的程序性知识库

这条线很像长期 agent 学习系统的文本化实现。

### OpenClaw：skills 跟 persona / workspace / assistant identity 耦合更强

OpenClaw 里的 skill 往往不是孤立能力，而是和助理角色、工作习惯、workspace 规则高度耦合。

因此它非常适合个人定制，但通用性抽象层会略低于 Hermes 这种更 platform-minded 的体系。

### Claude Code：扩展性强点不在“skills 体系”，而在对 coding workflow 的深适配

Claude Code 的能力沉淀更多体现在：
- 模型能力
- prompt / system design
- 工具和交互模式
- 命令/编辑/审批 UX

而不是像 Hermes / OpenClaw 那样把“技能文档层”作为长期结构去经营。

### Codex：通常更偏模型和执行能力，而不是长期技能知识库

Codex 的扩展更可能体现在：
- 模型升级
- tool affordance
- task planner 改进

而不是一个很重的 skill substrate。

## 七、安全边界对比：复杂度越高，安全问题越不是附属项

### Hermes：安全面最大，但也最有意识在做系统级硬化

Hermes 因为同时拥有：
- terminal
- gateway
- memory
- plugins
- MCP
- cron
- 多平台消息入口

所以攻击面很大。

但从 release notes 和代码能看出，它已经明显在做：
- approval flow
- SSRF hardening
- path traversal hardening
- OAuth / MCP security
- platform-specific approval UX
- prompt/context injection guard

也就是说，它知道自己风险大，而且在补。

### OpenClaw：最大的风险不是某个单点漏洞，而是“助理过于贴身”

OpenClaw 最大的安全特点，是它很贴近用户真实生活与真实渠道。

因此风险点往往是：
- 群聊误发
- 跨会话泄漏
- persona/context 文件被污染
- 过度访问私人环境

它不是传统意义上“infra attack surface 最大”的那个，但它的人身边界离用户最近。

### Claude Code：安全模型更像高质量开发工具的权限体系

Claude Code 的安全重点更集中：
- 命令执行审批
- 文件编辑可审查
- 开发工作区边界
- coding task 的误操作防护

因为它场景更聚焦，安全边界更清楚，也更容易打磨到极致。

### Codex：聚焦带来更小的边界，但也意味着能力面较窄

Codex 通常因为产品边界更窄，安全问题更像：
- 代码执行风险
- 文件改动风险
- 任务执行越权

而不是 Hermes / OpenClaw 那种跨平台、跨身份、跨生命周期风险。

## 八、长期运行能力对比：谁是 sprint runner，谁是 resident system

### Hermes：最像 resident system

Hermes 明显是为长期运行设计的：
- VPS / container / remote backend
- background tasks
- auto notifications
- cron scheduler
- persistent sessions
- multi-platform gateway

它不是那种“开一下跑一会儿”的工具，而是有 resident system 味道。

### OpenClaw：同样很强，但更强调“持续陪伴”和“持续处理”

OpenClaw 也非常适合常驻运行，只是它的常驻感更像“助理一直在”，而不是“一个通用 runtime 守护进程一直在”。

### Claude Code：强在工作会话长期性，不强在生活层常驻性

Claude Code 当然可以长时间处理复杂任务，但它的长期性更多体现在：
- 一整个 coding session
- 一次复杂项目修改
- 一个 repo 的持续上下文

不是“全天候数字助理”那种常驻。

### Codex：更像高强度执行器，不像 resident personal system

Codex 的强点在 burst execution，不在长期助理陪伴。

## 九、适合场景对比：别拿不适合的东西做错误期待

### 适合选 Hermes 的场景

- 想要长期 personal agent runtime
- 想让 agent 同时存在于多个平台
- 想做 memory + skills + gateway + cron 一体化系统
- 想研究开源 personal agent infra

### 适合选 OpenClaw 的场景

- 想做真正私人化、多渠道存在的数字助理
- 非常重视 persona、workspace continuity、human-like assistant interaction
- 想把 agent 嵌进自己长期数字生活

### 适合选 Claude Code 的场景

- 核心目标就是写代码、改代码、查代码、推进软件工程任务
- 要求极强交互体验和 coding workflow 贴合度
- 不追求把它做成长期私人助理

### 适合选 Codex 的场景

- 需要高执行力代码代理
- 追求直接、聚焦、任务导向
- 不打算让它承担复杂 personal assistant 角色

## 十、谁的短板是什么

### Hermes 的短板

- 太大，复杂度很高
- 很容易进入“什么都做”的扩张压力
- 维护难度会随着平台和插件继续上升
- 不是每个用户都需要这么重的系统

### OpenClaw 的短板

- 对个人化、workspace 化假设较强
- 某些能力的抽象层不一定像 Hermes 那样“平台化”
- 一旦人格层和工作层耦合太深，也会抬高系统管理成本

### Claude Code 的短板

- 不是为长期 personal memory / multi-platform assistant 设计的
- 如果拿它做“数字管家”，会觉得很多层是空的
- 它的最优解空间主要在 coding，而不是 personal OS

### Codex 的短板

- 很难天然长出深层个人助理形态
- memory / persona / gateway / long-running assistant 不是它的强项
- 如果要做生活层或渠道层 agent，通常需要外面再包很多系统

## 最终结论：不是谁更强，而是谁更像你要的那个系统

如果只问“哪个最强”，问题本身就错了。

更准确的结论是：

### 如果你要的是“个人 agent 操作系统”
第一看 Hermes，第二看 OpenClaw。

但两者也不同：
- **Hermes 更像 runtime / infrastructure first**
- **OpenClaw 更像 assistant identity / workspace continuity first**

### 如果你要的是“最强 coding agent 体验”
Claude Code 大概率还是最对味的那个。

因为它不是想兼顾所有事，而是把代码工作流这一件事做得极深。

### 如果你要的是“高执行力代码代理”
Codex 路线依然很有竞争力，尤其适合 task-oriented coding execution。

## 我自己的判断

如果站在 2026 年这个时间点看，这四条路线最值得记住的不是孰优孰劣，而是它们分别代表了 agent 产业的四种未来：

1. **Hermes 代表 runtime 化未来**
2. **OpenClaw 代表人格化私人助理未来**
3. **Claude Code 代表专业工作流 agent 未来**
4. **Codex 代表高执行力任务代理未来**

而真正可能改变下一代个人计算体验的，不会只是其中某一个功能，而是：

> 谁能把长期状态、工具执行、身份连续性、工作流质量和安全边界，揉成一个真正可持续使用的系统。

从这个标准看：
- Hermes 最像在搭基础设施
- OpenClaw 最像在塑造助理本人
- Claude Code 最像成熟专业工具
- Codex 最像执行力极强的 worker

四个都不是彼此的简单替代品。

真正成熟的判断，不是选边站，而是先搞清楚：

**你想要的到底是一个会做事的 agent，还是一个能长期存在的数字系统。**
