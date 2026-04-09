---
title: "Hermes Agent 深读（二）：memory、skills、state 与 gateway，为什么它更像个人 Agent OS"
description: "Hermes Agent, memory architecture, skills, session search, state store, gateway, personal agent OS"
---

# Hermes Agent 深读（二）：memory、skills、state 与 gateway，为什么它更像个人 Agent OS

> 原文链接：https://github.com/NousResearch/hermes-agent
> 关键参考：
> - https://github.com/NousResearch/hermes-agent/blob/main/hermes_state.py
> - https://github.com/NousResearch/hermes-agent/blob/main/agent/memory_manager.py
> - https://github.com/NousResearch/hermes-agent/blob/main/tools/memory_tool.py
> - https://github.com/NousResearch/hermes-agent/blob/main/tools/session_search_tool.py
> - https://github.com/NousResearch/hermes-agent/blob/main/tools/skill_manager_tool.py
> - https://github.com/NousResearch/hermes-agent/blob/main/agent/skill_utils.py
> - https://github.com/NousResearch/hermes-agent/blob/main/gateway/run.py
> - https://github.com/NousResearch/hermes-agent/blob/main/gateway/session.py
> 来源：Nous Research
> 发布日期：基于 2026-04-09 仓库状态解读

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Hermes 真正值钱的不是“又能调多少工具”，而是它把 memory、skills、session state、gateway 组织成了一套长期运行的个人 Agent 基础设施。 |
| 大白话版 | 很多 agent 会做事，但做完就忘。Hermes 想做的是一个会长期记住你、会沉淀做事方法、能跨平台接续上下文的 AI 分身底座。 |
| 核心要点 | • memory / session search / skills 三层分工很成熟 • SQLite + FTS5 让历史变成可搜索状态层 • gateway 让 agent 不再依赖单一终端 • 这套架构比 prompt 技巧更有壁垒 |
| 价值评级 | A，尤其适合研究“长期 agent”而不是“一次性 task runner” |
| 适用场景 | 个人 AI 助理、长期自动化 agent、多入口消息 agent、需要记忆与技能沉淀的系统 |

## 文章背景

上一篇我们主要从 runtime 全景看 Hermes，结论很明确，它不是普通 repo，而是在往个人 agent 操作系统那个方向走。

但如果只停在 runtime 大图层面，其实还没碰到 Hermes 最硬的部分。真正把它和大量 agent 项目区分开的，不是某个命令、某个 provider、某个 flashy release feature，而是它对以下四件事的处理：

1. **什么应该记住，什么不该记住**
2. **过去发生过的事情，怎样变成可检索状态，而不是散落日志**
3. **一次成功的方法，怎样从临场发挥变成下次可复用技能**
4. **agent 为什么不能只活在一个终端里，而要变成跨平台存在的“持续身份”**

这篇就专门拆这四个问题。

## 文章背景：为什么 memory / skill / state 是 agent 的真正分水岭

现在很多 Agent 项目，看起来也都支持：
- 长上下文
- RAG
- tool calling
- memory
- profile

但真正上线跑一阵子以后，很快就会碰到几个老问题：

### 问题 1：什么都叫 memory，最后 memory 变成垃圾场

很多系统把用户偏好、临时任务、调试日志、错误信息、会议摘要、运行状态全都往同一个“memory”容器里塞。结果就是：
- 记忆越来越脏
- 召回越来越不准
- 真正重要的信息被埋掉
- 模型开始把旧垃圾当新事实

### 问题 2：历史记录存在，但不可用

很多产品当然“保存了聊天记录”，但只是简单 append 到 JSON 或数据库里。你真的要让 agent 回忆“上周我们怎么修那个 bug”，它其实找不回来，或者找回来一堆无关片段。

### 问题 3：会做事，但不会积累做事方法

一次成功完成一个复杂任务，通常意味着 agent 已经探索出一条工作流了。但如果这条工作流不能被结构化沉淀，下次还是得重新摸。

### 问题 4：agent 的身份绑定在 UI，而不是绑定在 state

很多 agent 一旦换入口就像换了一个人：
- 在 CLI 里记得你
- 到 Telegram 就忘了
- 到 IDE 又是另一套上下文

Hermes 最值得研究的，就是它不是把这些问题当 feature checklist，而是把它们当成 **系统边界问题** 来处理。

## 完整内容还原

### 1. Hermes 把“记忆”拆成三层，而不是一个大口袋

这是它最成熟的设计之一。

从 `agent/prompt_builder.py`、`agent/memory_manager.py`、`tools/memory_tool.py`、`tools/session_search_tool.py` 可以看出，Hermes 实际上在使用三种不同性质的“过去”：

1. **Persistent memory**
2. **Session search / transcript recall**
3. **Skills / procedural memory**

这三者不是同义词，而是三种不同类型的信息结构。

#### 第一层：Persistent memory，记的是“长期事实”

prompt builder 里直接写得很清楚：

- 保存 durable facts
- 用户偏好、环境细节、工具 quirks、稳定约定
- 不要把 task progress、completed-work logs、temporary TODO state 存进去

这意味着 Hermes 对 memory 的定义不是“只要以后可能有用都存”，而是：

> 只有那些**未来多次复用、且用户不想反复重新说明**的东西，才配进入长期记忆。

这个定义非常关键。因为它天然过滤掉大量低价值噪音。

例如：
- “用户喜欢我叫他动动”适合存
- “今天修了哪个 PR”不适合存
- “这个服务部署目录在哪”适合存
- “刚刚跑测试失败过一次”不适合存

#### 第二层：Session search，记的是“发生过什么”

`tools/session_search_tool.py` + `hermes_state.py` 的组合，让 Hermes 有能力从过去会话中检索语义相关的历史。

这里的重点不是长期事实，而是**历史经历**：
- 我们上次讨论过什么
- 上个月那个 bug 是怎么修的
- 某个对话里用户曾经怎么说过
- 某个结论是在什么上下文里得出的

这种信息不应该进入 curated memory，因为它们太具体、太多、太易变。但它们又经常对当前任务有帮助。

#### 第三层：Skills，记的是“怎么做”

这是 Hermes 最有意思的一层。

它不是保存“过去说了什么”，而是保存：
- 某类任务的步骤
- 某种问题的解决法
- 某个环境的操作套路
- 某种工作流的最佳实践

也就是程序性记忆，procedural memory。

这三层一拆开，Hermes 的 memory architecture 就一下子比大量 agent 项目成熟很多。因为它不再问：

> 这段内容以后有用吗？

而是问：

> 这段内容到底属于哪种“过去”？

这个问题问对了，系统才不容易烂掉。

### 2. MemoryManager 是一个 orchestration 层，而不是简单文件读写

`agent/memory_manager.py` 很值得细看。

它不是把 memory 直接写死成某个文件系统实现，而是定义了一个 MemoryManager，负责：
- built-in provider
- 最多一个 external memory provider
- system prompt block 组装
- prefetch
- queue_prefetch
- sync_turn
- tool schema 汇总

这里最成熟的点有两个。

#### 点 1：Builtin provider 永远存在，但 external provider 最多一个

这说明 Hermes 团队非常清楚，memory provider 不是越多越好。

如果一个 agent 同时挂多个外部 memory backend，最容易出现：
- schema 膨胀
- 数据源冲突
- 同类信息多头写入
- 召回来源不透明

Hermes 直接硬性限制“只有一个 external provider”，本质上是在做**架构收敛**。

这个决策很像真实系统设计，而不是为了炫可扩展性把接口开无限大。

#### 点 2：memory context 被显式 fenced

`build_memory_context_block()` 会把召回内容放进：

```text
<memory-context>
[System note: ... recalled memory context, NOT new user input ...]
...
</memory-context>
```

这个细节说明 Hermes 不是随手把 recalled text 拼回 prompt，而是非常清楚地告诉模型：

> 这不是新的用户输入，而是背景信息。

这能降低两类风险：
1. 模型把 recall 当成当前用户显式意图
2. 被 recall 内容里的文本污染当前 turn 的语义边界

这件事看起来小，其实很重要。因为一旦 memory 没有边界，agent 很容易出现“把旧话当新话”的错位。

### 3. Builtin memory provider 的本质，是 curated memory file，不是向量数据库神话

Hermes 目前 built-in memory 走的是非常务实的路线：
- `MEMORY.md`
- `USER.md`
- bounded / file-based / curated memory

这里体现出一种和很多“AI native memory”产品不同的审美。

很多项目上来就把 memory 设计成 embedding + vector retrieval + auto summarization pipeline，听起来很现代，但实际往往有两个问题：
- 内容不可审计
- 用户无法明确控制“到底记住了什么”

Hermes 选择保留 markdown 文件作为 memory 载体，本质上是在强调：

**长期记忆首先要可读、可改、可审计，其次才是 fancy。**

这是非常对的。

对私人助理来说，memory 是一种高信任层数据。用户迟早会想知道：
- 你到底记了我什么
- 这些记忆是从哪来的
- 能不能删
- 能不能改

Markdown memory 虽然土，但透明。透明本身就是产品价值。

### 4. Session state 不是“聊天记录功能”，而是 agent 的 episodic memory 层

`hermes_state.py` 是另一个核心文件。

它定义了：
- `sessions` 表
- `messages` 表
- `messages_fts` FTS5 virtual table
- WAL mode
- session metadata
- message token / finish_reason / reasoning 等字段

如果把 persistent memory 理解成“事实记忆”，那这个 SQLite state store 就是 **episodic memory**，也就是事件记忆层。

这意味着 Hermes 不只是把 session 当作连续文本，而是当作结构化可检索对象。

### 5. FTS5 的选择非常聪明，它说明 Hermes 在做“能工作的 recall”，而不是追热点架构

Hermes 没有把 transcript recall 设计成一个炫技的向量数据库系统，而是先用 SQLite FTS5 做高效文本搜索。

这其实很聪明，理由有三点：

#### 理由 1：本地可用，部署便宜

FTS5 是 SQLite 原生能力，不需要额外服务。

对于 Hermes 这种强调：
- 跑在 VPS 上
- 跑在个人环境里
- 要求低成本长期运行

的系统来说，这比强绑定外部向量库现实太多。

#### 理由 2：很多个人历史检索，本来就更适合 lexical retrieval

例如用户问：
- 我上次提到 `LongCat` 是哪天？
- 之前那次 `Mistral` 数据中心融资你怎么判断的？
- 找下提过 `daytona` 的会话

这种需求，FTS5 本来就很强，不需要大动干戈上 dense retrieval。

#### 理由 3：可以逐步叠加 LLM summarization，而不是一开始把一切都 embedding 化

Hermes 的 session search 工具是 FTS5 + summarization 组合，这个路线很对。因为它承认一个事实：

- **召回** 和 **理解** 是两步

先把相关片段找出来，再让模型总结，比“先把所有历史都做 embedding，再赌相似度会命中”更稳。

### 6. skills 体系，是它对“agent 学习”最工程化的回答

Hermes 的 skills 不是一句口号，而是一整套文件和工具系统。

从 `tools/skill_manager_tool.py`、`agent/skill_utils.py` 能看出，skill 大致有这些特征：

- 存在于 `~/.hermes/skills/`
- 每个 skill 是一个目录
- 入口文件是 `SKILL.md`
- 可以有 `references/`, `templates/`, `scripts/`, `assets/`
- 有 YAML frontmatter
- 支持 create / edit / patch / delete / write_file / remove_file

这意味着 skill 并不是简短 snippet，而是可以成长成一个小型知识包。

### 7. 为什么说 skill 是 procedural memory，而不是“另一个文档系统”

关键在于它的触发语义。

Hermes 在 prompt guidance 里明确鼓励：
- 完成复杂任务后，把方法写成 skill
- 使用 skill 时发现过时或错误，立刻 patch

这说明 skill 生命周期长这样：

1. 完成任务时产生经验
2. 经验提炼成结构化操作方法
3. 下次在相关情境中被再次注入
4. 发现偏差后再修补

这几乎就是人类 procedural memory 的文本版实现。

与普通笔记不同，skill 的目标不是保存“我知道什么”，而是保存“我该怎么做”。

### 8. skill_utils 的设计，反映了 Hermes 在做“技能发现和条件激活”

`agent/skill_utils.py` 里有不少细节很说明问题：

- frontmatter parsing
- platform matching
- disabled skill config
- external skill dirs
- conditional activation fields

这意味着 Hermes 不是把 skill 当死文档，而是在逐步做：

**skill routing / skill resolution / skill compatibility filtering**

举例说：
- 某 skill 只适用于 macOS
- 某 skill 只对某些工具集生效
- 某 skill 来自外部目录
- 某 skill 在某平台被禁用

这些都让 skill 更像“运行时可调度能力单元”，而不是随便塞在磁盘里的 markdown。

### 9. skill_manager 很严格，说明它在防“技能污染”

`tools/skill_manager_tool.py` 里有很多 guard rail：

- name validation
- frontmatter validation
- size limit
- allowed subdirs
- security scan via `skills_guard`
- path safety

这是非常必要的。因为一旦 agent 能自己写 skill，如果没有这些约束，技能库很快就会变成：
- 文件命名混乱
- frontmatter 失真
- 路径越界
- 引入恶意脚本
- 一堆不可读的大文本垃圾

也就是说，Hermes 团队已经意识到：

> Skill 自我积累不是“生成一点文本”那么简单，而是一个会逐渐污染系统的入口。

所以它必须像 package manager 一样治理，而不是像便签纸一样随便写。

### 10. Gateway 的价值，不只是“接了很多平台”，而是让 agent 变成持续存在的社交通道身份

`gateway/run.py`、`gateway/session.py`、`gateway/channel_directory.py` 一起看，Hermes 的 gateway 真正解决的是：

**用户不应该因为切入口，就切到另一个 agent。**

这句话很重要。

在很多系统里：
- terminal 里的 agent 是一个世界
- Telegram bot 是另一个世界
- 编辑器里的 assistant 又是第三个世界

Hermes 想做的是把这些入口汇到同一个身份和 state 系统里。

### 11. SessionSource / SessionContext 的设计，说明 Hermes 很重视“消息来自哪里”

`gateway/session.py` 里有：
- `SessionSource`
- `SessionContext`
- source description
- connected platforms
- home channels
- session metadata
- PII redaction helpers

这说明 Hermes 不只是把平台接入当 transport，而是把“上下文来源”作为系统 prompt 的重要组成部分。

这非常关键，因为 agent 的行为高度依赖场景：
- 在 DM 里和在群聊里，发言边界不同
- 在 thread 里和在 channel 里，回复语义不同
- 在 home channel 里和在 reply thread 里，cron delivery 策略不同

Hermes 的做法相当于让 agent 永远知道自己当前“站在哪里”。这比普通 bot 强太多。

### 12. PII redaction 的存在，说明它已经开始认真对待多平台身份安全

`gateway/session.py` 里有：
- phone regex
- user/chat id hashing
- 平台级安全白名单
- 在某些平台上对 raw ID 做 redaction

这是一种典型的系统成熟信号。

因为一旦 agent 进入 WhatsApp、Signal、Telegram 等个人通信渠道，ID 和号码就不再只是“技术字段”，而是用户身份数据。

如果这些数据被模型原样处理、记忆、复述，就会带来非常现实的隐私风险。

Hermes 的处理说明它已经不是“先能用再说”，而是开始思考：

- 模型需要知道多少身份信息才足够完成任务
- 哪些 ID 对 routing 必要，但对 LLM 不必要
- 哪些平台的 mention 机制必须保留 raw id
- 哪些平台可以做 hash 替代

这类设计，比加一个隐私按钮要深得多。

### 13. Channel directory 让“发消息”从盲打变成可路由系统

`gateway/channel_directory.py` 的存在，也很有意思。

它本质上在缓存：
- reachable channels
- contacts per platform
- human-friendly label 到真实 ID 的映射

这意味着 Hermes 在尝试解决一个很真实的问题：

> agent 想给某个平台、某个频道、某个人发消息时，怎么知道“发到哪里去”？

这个问题如果只靠用户每次手写 chat id，系统永远做不成真正的 personal assistant。

channel directory 的意义就在于，它把平台世界里的地址簿抽象出来，逐渐让 agent 拥有“联系人和通道地图”。

### 14. cron 与 gateway 的组合，让 Hermes 不再是反应式 agent，而是主动式 agent

虽然这篇重点不是 cron，但必须提一句：Hermes 的 cron 之所以重要，不是因为“能定时执行任务”这个功能本身，而是因为它能把结果再通过 gateway 送回真实消息入口。

这意味着它从：
- 你问我，我答你

进化成：
- 我在后台做事
- 做完以后去正确的平台、正确的线程、正确的频道通知你

这件事一旦和 session context、origin routing、home channel 结合起来，agent 就不再只是一个被动工具，而开始像一个有持续存在感的协作者。

### 15. 这整套设计共同指向一个结论：Hermes 在做的是“长期身份”，不是“单轮智能”

把这些模块拼起来看，就很清楚了：

- `MEMORY.md` / `USER.md` 保持长期事实
- SQLite + FTS5 保持历史经历
- skills 保持程序性方法
- gateway 保持多入口身份连续性
- channel directory 保持可路由世界模型
- cron 保持主动触达能力

这几层叠起来，形成的就不是“一个会调用工具的模型”，而是：

**一个持续存在、带自我延续能力的数字人格 runtime。**

这也是为什么我会说它更像 personal agent OS，而不是普通 AI app。

## 核心技术洞察

### 1. **Hermes 最强的不是记忆能力，而是记忆分类能力**

它厉害的地方不在“能不能记”，而在：
- 事实进 memory
- 过程进 session state
- 方法进 skills

这比“我也支持 memory”高了一个层级。

### 2. **state store 是它的战略资产**

很多 agent 项目的状态层很薄，因为大家还把 agent 当对话工具。Hermes 的状态层已经在向操作系统里的用户态记录迁移。以后很多高阶能力都能从这层长出来：
- better recall
- relationship timeline
- cost analytics
- self-audit
- task retrospection

### 3. **skills 是最现实的 agent 自我进化路径**

模型参数自我更新既危险又不现实，但文本化 procedural memory 非常实用。Hermes 其实是在用文件系统和 tool API，替代那些过于理想化的“agent 自动训练自己”叙事。

### 4. **gateway 让 agent 从工具升级成存在**

一个只活在 terminal 里的 agent，更像高级命令行工具。一个能在 Telegram、Discord、Slack 里持续存在并保持身份连续性的 agent，才更接近真正的数字助理。

## 实践指南

### 🟢 立即可用

1. **如果你在设计 agent memory，先抄 Hermes 的三层分工**
   - persistent facts
   - episodic transcript recall
   - procedural skills

2. **如果你在做 transcript recall，不要一上来就卷向量数据库**
   - 先用 FTS5 + summary，往往更实用

3. **如果你想让 agent 真正“长期可用”，要把 gateway 当核心层，不是附属层**
   - 身份连续性和消息入口是 product surface，不只是 transport

### 🟡 需要适配

1. **skill 自动沉淀一定要做治理**
   - 否则技能库会迅速污染

2. **memory 的 curated 层适合个人助手，不一定适合大团队共享 agent**
   - 团队场景可能还需要更细权限和 namespace

3. **SQLite FTS5 很适合单用户/小规模部署**
   - 更大规模时可能要再往外拆，但对 Hermes 当前定位已经非常合适

### 🔴 注意事项

1. **长期身份越强，隐私和误记忆风险越高**
2. **多平台入口越多，session routing 越容易出现边界 bug**
3. **skills 体系越强，prompt surface 和安全面也越大**

## 横向对比

| 维度 | Hermes | 常见 agent 框架 | 纯 coding agent |
|---|---|---|---|
| 长期事实记忆 | 有，且是 curated | 常有，但常混乱 | 弱 |
| 历史会话检索 | 强，SQLite + FTS5 + tool | 常常较弱 | 弱 |
| 技能沉淀 | 强，文件化 procedural memory | 少见或很轻 | 很弱 |
| 多平台身份连续性 | 强 | 通常没有 | 没有 |
| 主动通知 / 调度 | 强 | 一般 | 一般很弱 |

## 批判性分析

### 局限性

**1. 记忆分层正确，不代表记忆质量天然好。**

Hermes 搭好了架子，但 memory 的内容质量仍然取决于 agent 何时写、怎么写、写得克不克制。

**2. skill 体系会天然带来维护成本。**

skills 越多，越需要：
- 去重
- 版本治理
- 失效清理
- 依赖校验

否则系统最后会被自己沉淀出来的“经验”拖慢。

**3. gateway 越强，产品面越分裂。**

CLI、IDE、Telegram、Discord 各自都想要最优体验，统一 runtime 很难，但分化 UX 又会抬高维护成本。这是 Hermes 长期一定会面对的 tension。

### 适用边界

最适合：
- 私人长期助理
- 高级用户 personal OS
- 个人知识工作流自动化
- 多消息入口、高自主性 agent

不太适合：
- 一次性任务执行器
- 超轻量 SaaS chat widget
- 对长期状态零需求的临时 agent

### 潜在风险

**1. 记忆污染风险**
如果 memory 写得太勤、skills 补得太多，系统会越来越“自以为懂你”，反而更容易误判。

**2. 跨平台上下文错配**
同一身份跨多个入口持续存在，看起来很美，但也最容易发生上下文误路由、错误线程回复、错误目标发送等事故。

**3. 复杂度复利**
单独看 memory、skills、gateway、cron 都合理，但放在一起，任何一个边角 case 都可能变成系统性问题。

### 独立观察

**观察 1：Hermes 很像在用传统软件工程方法，重写“数字人格”这个概念。**
不是 mystical AI being，而是 files + state + scheduler + channel routing。

**观察 2：它比很多 agent 项目更接近“第二大脑的执行层”。**
很多工具在管信息，Hermes 在试图管“信息 + 行动 + 记忆 +通道”。

**观察 3：如果未来个人 AI 助理真的成为一个新计算层，Hermes 这类项目的 state / memory / gateway 设计，比模型本身更可能留下长期价值。**

## 对领域的影响

Hermes 这套设计最重要的启发是，它把 Agent 的竞争维度从“谁更会答”拉到了“谁更会持续存在”。

而一旦竞争转到这条线上，真正重要的就不再只是：
- 模型多强
- benchmark 多高
- UI 多顺滑

而是：
- 记忆是否可信
- 技能是否可积累
- 历史是否可检索
- 跨平台身份是否连续
- 调度与主动通知是否可靠

这才是 personal agent 真正会变成基础设施时必须回答的问题。

Hermes 至少已经在认真回答了，而且回答得比大多数项目都更系统。
