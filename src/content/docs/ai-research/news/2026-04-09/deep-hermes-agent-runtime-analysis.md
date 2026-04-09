---
title: "Hermes Agent 深度解读：一个把个人 AI 助理做成操作系统的 runtime"
description: "Hermes Agent, Nous Research, agent runtime, memory, skills, gateway, ACP, OpenClaw migration"
---

# Hermes Agent 深度解读：一个把个人 AI 助理做成操作系统的 runtime

> 原文链接：https://github.com/NousResearch/hermes-agent
> 关键参考：
> - https://github.com/NousResearch/hermes-agent/blob/main/README.md
> - https://github.com/NousResearch/hermes-agent/blob/main/AGENTS.md
> - https://github.com/NousResearch/hermes-agent/blob/main/docs/acp-setup.md
> - https://github.com/NousResearch/hermes-agent/blob/main/docs/migration/openclaw.md
> - https://github.com/NousResearch/hermes-agent/blob/main/RELEASE_v0.8.0.md
> 仓库状态：2026-04-09 抓取，GitHub Star 约 3.78 万，Fork 约 4.8 千
> 来源：Nous Research
> 发布形态：开源仓库 + 官方文档 + 持续 release notes

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Hermes Agent 不是单点 agent，而是在把“个人 AI 助理”做成一个跨终端、带记忆、带技能、带调度、带运行时隔离的完整操作系统。 |
| 大白话版 | 它想做的不是一个会聊天的壳子，而是一个能长期活在 VPS 上、能接 Telegram/Discord/CLI、能记住你、能自己沉淀技能、还能异步跑任务的 AI 管家。 |
| 核心要点 | • Agent loop、tool registry、gateway、memory、cron、ACP 是一整套体系 • 设计重心是“长期运行”和“跨会话延续” • 相比单纯 coding agent，它更像 personal agent runtime |
| 价值评级 | A，当前开源个人 Agent 基础设施里非常值得研究的一条线 |
| 适用场景 | 想搭长期运行私人助理、想研究 agent runtime、想做多入口自动化和记忆体系的人 |

## 文章背景

Hermes Agent 的出现，踩在一个很明确的行业拐点上。

过去一年，Agent 产品大致分成两类。一类是 Claude Code、Codex、Cursor 这类“任务型 agent”，核心发生在 IDE 或终端里，强项是一次性完成编码任务。另一类是 Telegram/Discord bot 式“陪伴型 agent”，强项是入口多、使用轻，但通常缺少真正严肃的工具系统、长期记忆和工程 runtime。

Hermes 想把这两类东西合并，而且野心更大。它要同时满足几件事：

1. **不是绑死在一台笔记本上的 agent**，而是能长期跑在 VPS、容器、远程环境甚至 serverless 后端上。
2. **不是一次性 task runner**，而是能跨 session 积累记忆、技能、用户画像、历史搜索的 agent。
3. **不是单入口产品**，而是同时支持 CLI、Telegram、Discord、Slack、WhatsApp、Signal 等多种入口。
4. **不是“调用工具”这么简单**，而是把工具组织成 runtime、toolset、审批流、后台任务、环境隔离、计划系统。

如果把很多 agent 项目理解成“给 LLM 接几把刀”，那 Hermes 的目标更像是：**给 LLM 造一整间工坊，再配一套收纳系统、身份系统、消息总线和长期记忆层。**

## 完整内容还原

⚠️ 以下内容基于 README、开发文档、迁移文档、ACP 文档、release notes 和源码目录结构综合还原，不是只看首页简介做摘要。

### 1. 它的产品定义，不是 chat app，而是 personal agent runtime

README 一上来就把定位写得非常清楚，关键词是：

- self-improving AI agent
- built-in learning loop
- creates skills from experience
- improves them during use
- persists knowledge
- searches its own past conversations
- builds a deepening model of who you are across sessions

这段表述的重点不在“会不会调用工具”，而在三个连续动作：

**经验 → 沉淀 → 复用。**

也就是说，Hermes 想解决的是 agent 最麻烦的老问题：
- 做完一次任务以后，经验会不会消失？
- 下次遇到类似问题，是否还得从零开始？
- 用户是否每次都得重新解释偏好、环境、习惯、工作流？

从这个角度看，Hermes 的对手并不只是另一个 agent CLI，而是所有“每次醒来都像失忆”的 assistant。

### 2. 它的真正产品边界，是“入口 + runtime + state”三位一体

README 和架构文档共同说明，Hermes 至少包含六层：

1. **交互层**：CLI、Telegram、Discord、Slack、WhatsApp、Signal 等。
2. **Agent 层**：`run_agent.py` 里的 `AIAgent` conversation loop。
3. **Tool 层**：`model_tools.py` + `tools/registry.py` + 各类工具实现。
4. **State 层**：`hermes_state.py` 的 SQLite session store + FTS5 搜索。
5. **Memory/Skill 层**：memory manager、skill manager、session search、SOUL/AGENTS/context files。
6. **Automation 层**：cron、background process、delegate subagents、ACP adapter。

这套分层里，最值得注意的是第 4 层和第 5 层。很多 agent 项目只做到 interaction + tools，也就是“说一句，做一下”。Hermes 明显更在意 **state continuity**，也就是上下文延续和身份连续性。

### 3. 核心 agent loop 仍然是经典 tool-calling 范式，但工程补丁做得很重

从 `run_agent.py` 可以看出，Hermes 的主循环本质上仍然是经典的：

```python
while api_call_count < self.max_iterations:
    response = client.chat.completions.create(...)
    if response.tool_calls:
        for tool_call in response.tool_calls:
            result = handle_function_call(...)
            messages.append(tool_result_message(result))
    else:
        return response.content
```

单看这一层，它并不神奇，甚至很“朴素”。真正拉开差距的是围绕这个 loop 叠加的工程约束：

- `IterationBudget` 控制 parent/subagent 的迭代预算
- destructive command 检测和 approval 流
- tool result persistence，避免大结果直接塞爆上下文
- context compression
- prompt caching
- smart model routing
- auxiliary client 处理视觉/摘要等副任务
- OpenAI/Codex/Gemini/Grok 等特定模型的执行纪律提示

这里能看出 Hermes 团队的一个明显风格：

**不是重新发明一个全新的 agent 算法，而是在“经典 loop”外面不断加工程护栏，让它在真实世界里更不容易翻车。**

这个思路其实很务实。现在很多 agent 失败，不是因为 loop 理论错了，而是因为：
- tool schema 不稳定
- 返回结果太大
- 模型半路停工
- async client 清理炸 event loop
- 消息入口与 session 绑定错乱
- command approval、上下文注入、路径隔离存在安全问题

Hermes 在这些地方下了很多真功夫。

### 4. Tool registry 是它的关键中枢，不是随手拼几个函数

`tools/registry.py` 和 `model_tools.py` 很值得看。

Hermes 的工具系统不是“在某处维护一个大 dict”，而是让每个 tool module 在 import 时自注册：

- schema
- handler
- check_fn
- requires_env
- is_async
- emoji
- result budget
- toolset 归属

然后 `model_tools.py` 统一负责：

- 触发工具发现 `_discover_tools()`
- 构造模型可见 schema `get_tool_definitions()`
- sync/async bridging `_run_async()`
- dispatch 到具体 handler
- 与 toolset alias 做绑定

这种设计的好处有三层。

**第一，工具组织可扩展。**
新工具不必去改一个巨型 central switch，而是模块级自注册。

**第二，toolset 是一等公民。**
Hermes 不是简单暴露 40 多个工具，而是通过 `toolsets.py` 预先打包成不同使用场景，例如：
- `web`
- `browser`
- `file`
- `delegation`
- `hermes-acp`
- `hermes-api-server`

这意味着不同入口、不同平台、不同 profile 可以看到不同能力面。

**第三，它把“工具可用性”内建进 runtime。**
每个工具可以有 `check_fn`，比如依赖某个 env var、某个外部服务、某个二进制。这使 Hermes 更像一个“能力协商系统”，而不只是 schema 列表。

### 5. 它对 async/tool 调用里的脏活累活，下了不少底层修补

`model_tools.py` 里有一段很关键的说明：

它没有直接每次 `asyncio.run()`，而是维护 persistent event loop，区分 main thread 和 worker thread，用来避免 cached httpx/AsyncOpenAI client 在 loop 被关闭后抛出 `Event loop is closed`。

这个细节特别说明一件事：Hermes 团队已经不是在写“demo 级 agent”，而是在处理**长时间、多线程、多入口、多工具**运行时的稳定性问题。

很多人低估这一点。Agent 一旦从“本地跑 5 分钟”升级成“网关常驻数周”，真正难的就不是 prompt，而是这些看上去不起眼的 runtime 细节：

- 事件循环生命周期
- 缓存 client 的线程归属
- background process 的注册与唤醒
- gateway 的 session 并发
- SQLite WAL contention

Hermes 在这些地方到处都能看到“踩过坑以后修出来的痕迹”。这反而是它成熟的重要证据。

### 6. Session state 不是附属功能，而是基础设施核心

`hermes_state.py` 定义的是一个 SQLite-backed state store，带：

- `sessions` 表
- `messages` 表
- FTS5 全文搜索表
- WAL 模式
- session metadata
- token/cost fields
- parent_session_id，用于 compression 后链式延续

这里最关键的不是“用 SQLite 很轻量”，而是它把 **conversation history 变成可检索、可统计、可链式延续的结构化状态**。

这会直接带来几个能力：

1. **session_search 不只是字符串 grep**，而是 FTS + LLM summarization 的组合。
2. **记忆与历史分层**。长期事实放 memory，过程性经历留在 session store。
3. **多平台统一历史**。用户从 CLI 切到 Telegram，本质上可接同一套 state。
4. **成本与 usage 可追踪**。后续分析哪些任务最贵、哪些模型最有效，都有基础数据。

这一层也是 Hermes 跟很多“对话记录只是 JSONL append”的项目拉开差距的地方。

### 7. 它对“记忆”这件事的理解，比大多数 agent 项目更成熟

从 `agent/prompt_builder.py` 可以看到它对 memory 的定位非常克制。

它明确区分：

- **persistent memory**，保存用户偏好、稳定习惯、环境细节、长期事实
- **session search**，用于找过去任务过程与历史对话
- **skills**，用于保存可复用的工作流和操作方法

它还明确写着：

- 不要把任务进度、一次性结果、临时 TODO 直接存 memory
- 真正有复用价值的“做法”应该沉淀成 skill

这是很对的分层。

很多 agent 项目的 memory 失败，就是把所有东西一股脑塞进“长期记忆”，最后 memory 既脏又大，反而不可靠。Hermes 的三层分工其实很像人类认知结构：

- 事实性长期记忆
- 情节性经历回忆
- 程序性技能记忆

如果说很多 agent 只是“有 memory 功能”，那 Hermes 已经开始在做 **memory architecture** 了。

### 8. Skill system 是它最接近“自我进化”叙事的部分

README 里最抓眼球的是“creates skills from experience, improves them during use”。

从 `tools/skill_manager_tool.py`、`agent/skill_commands.py`、skills hub 相关代码看，Hermes 把 skill 当成一种带 frontmatter 的可管理文档单元。它不是模型权重层面的自我学习，而是**程序化记忆**：

- 任务结束后把方法写成 skill
- skill 可 patch、可 edit、可 view、可 list
- skill 可以被再次注入 runtime
- 还兼容 agentskills.io 生态

这套机制的意义，在于它把“经验沉淀”从 vague narrative 变成具体文件系统和工具 API。

当然，这种“自我改进”本质上还是文本层和流程层，不是模型参数层。但对个人助理来说，这已经非常实用了。因为用户真正需要的不是 agent 重新训练自己，而是：

- 下次别忘了怎么连我的服务
- 别忘了我习惯的部署方式
- 别忘了这个仓库的特殊约定
- 别忘了上次踩过的坑

Hermes 用 skills 去做这件事，工程上比“自动 finetune 自己”现实得多。

### 9. Gateway 是它区别于纯 CLI agent 的另一条护城河

`gateway/run.py`、`gateway/session.py`、`gateway/pairing.py`、各个平台 adapter 说明一件事：Hermes 并不满足于做个命令行 agent。

它真正在做的是：

**一个多消息入口统一接入的 agent gateway。**

也就是：
- Telegram 发消息可以触发同一个 runtime
- Discord 也可以
- Slack/Signal/WhatsApp 也可以
- session、history、model switch、tool progress 这些能力最好跨平台一致

这件事非常难，因为每个平台的交互语义都不一样：

- Telegram 有按钮和回复链
- Discord 有线程和频道
- Slack 有 slash command 与 block kit
- Signal/WhatsApp 的格式和附件能力更弱

而 Hermes 不只是“接入”，还在 release note 里持续修这些平台差异，例如：
- live model switching
- approval buttons on Slack & Telegram
- reply mode、thread context preservation
- Matrix / Signal / Mattermost 的平台级增强

这说明他们的目标不是“有个 bot 能回消息”，而是让不同入口都能成为 agent 的一等交互界面。

### 10. ACP 支持说明它想进编辑器，但不是只做编码 agent

`docs/acp-setup.md` 写得很明确，Hermes 可通过 ACP 接入：

- VS Code
- Zed
- JetBrains

ACP 模式下，它会以 editor-native 的方式展示：
- chat panel
- file diffs
- terminal commands
- approval flow

这其实是在补齐 Hermes 相对 Claude Code/Codex 的一块短板，也就是“进入 IDE 原生工作流”。

但它的方式跟纯 coding agent 仍然不同。

文档里明确指出 ACP 默认使用 `hermes-acp` toolset，刻意排除了：
- messaging delivery
- cronjob management
- audio-first UX
- clarify 等偏交互式能力

这说明 Hermes 的设计哲学是：

**编辑器只是它的一个入口，不是整个产品的中心。**

这点很关键。Claude Code/Codex 从 IDE/terminal 出发向外扩；Hermes 则是从“长期 personal agent runtime”出发，顺便进入 IDE。

### 11. OpenClaw migration 不是小功能，而是战略姿态

`docs/migration/openclaw.md` 很有意思。

它支持：
- 导入 SOUL.md
- 导入 MEMORY.md / USER.md
- 导入 skills
- 导入 command allowlist
- 导入 messaging settings
- 导入 API keys
- 导入 workspace instructions

这不是普通迁移脚本，而是在公开宣告：

**Hermes 想把 OpenClaw 的用户、配置哲学和 agent identity 体系一起收编过来。**

尤其是导入 `SOUL.md`、`AGENTS.md`、memory、skills 这些内容，说明它继承的不是某个配置文件，而是一整套“人格 + 记忆 + 工作流上下文”的产品观。

这也解释了为什么仓库 topics 里同时有 `openclaw`、`codex`、`claude-code`、`anthropic`、`openai`。

Hermes 的野心显然不是只服务 Nous 自家模型，而是想当一个跨模型、跨入口、跨工作流的通用 agent runtime。

### 12. Release cadence 说明它已经进入高速复杂系统阶段

v0.8.0 的 release note 很长，重点包括：

- background task auto-notifications
- live `/model` switching
- GPT/Codex tool-use guidance 自优化
- Google AI Studio native provider
- inactivity-based timeouts
- approval buttons
- MCP OAuth 2.1
- centralized logging
- plugin system expansion
- platform hardening
- security hardening

这些 feature 有个明显共同点：

**它们大多不是“表演型功能”，而是复杂系统进入规模化之后必须补齐的中台能力。**

比如：
- auto-notification 解决后台任务完成后如何唤醒 agent
- inactivity timeout 解决长任务被误杀
- structured logging 解决线上排障
- config validation 解决复杂 YAML 配置出错
- MCP OAuth 解决第三方扩展接入的权限问题

也就是说，Hermes 已经从“做功能”进入“做系统治理”的阶段了。

## 核心技术洞察

### 1. **Hermes 真正的创新不是单个能力，而是能力编排方式**

它的价值不在某一个工具、某一条 prompt、某一条命令，而在于把这些东西编排成统一 runtime：

- tools 有 registry
- tools 有 toolset
- sessions 有 state store
- memory 有层级边界
- skills 有 CRUD 生命周期
- gateway 有平台适配
- ACP 有编辑器入口
- cron 有定时执行
- delegate 有子 agent

这是一种典型的“系统产品”思路。

### 2. **它把“agent 的延续性”放在产品中心，而不是附加功能**

很多 agent 产品默认假设一次会话就是一次任务。Hermes 的假设恰好相反：

> 用户和 agent 的关系是长期的，任务只是这段长期关系中的切片。

因此它才会如此重视：
- persistent memory
- session search
- skill accumulation
- SOUL/AGENTS/context files
- cross-platform continuity

这套设计对个人助理尤其成立。

### 3. **它在做“个人 agent OS”，不是单纯 AI app**

如果用操作系统的类比，Hermes 已经具备了很多 OS 味道：

- CLI / gateway / ACP 像输入输出设备层
- tool registry 像 syscall/driver registry
- session db 像状态存储层
- memory/skills 像用户配置和程序库
- cron 像 scheduler
- approval / security / isolation 像 permission model

它当然还不是一个真正操作系统，但产品哲学已经明显朝那个方向走了。

## 实践指南

### 🟢 立即可用

1. **如果你要搭私人 AI 助理，Hermes 值得作为架构参考蓝本**
   - 重点抄它的 state + memory + skill 分层
   - 不要只抄聊天壳子和工具调用

2. **如果你在做多入口 agent，重点看 gateway 设计**
   - 不同平台统一 session 语义怎么处理
   - slash command、reply mode、approval flow 怎么抽象

3. **如果你在做 coding agent 之外的长驻 agent，重点看 tool/runtime 治理**
   - persistent event loop
   - WAL mode state store
   - tool availability check
   - result persistence

### 🟡 需要适配

1. **Skill 自优化机制需要克制使用**
   - 它很适合沉淀工作流
   - 但如果让 agent 过度自写技能，容易形成技能垃圾堆

2. **Persistent memory 需要强约束**
   - Hermes 的 guidance 写得已经不错
   - 真正落地时还需要更强的 memory review 机制

3. **多平台入口适合重度用户，不一定适合极简产品**
   - 如果你只做一个窄场景 bot，Hermes 这套可能过重

### 🔴 注意事项

1. **系统复杂度非常高**
   不是那种半天就能完全读懂、两天就能稳定魔改的仓库。

2. **Issue 数量很多，说明扩张速度快也说明系统面很大**
   这类项目常见问题是 feature velocity 非常强，但 consistency 和维护成本会越来越重。

3. **“self-improving” 要理性看待**
   它更像 procedural self-improvement，不是模型层面的自主进化。宣传上很抓眼球，工程上则要拆开看。

## 横向对比

| 话题 | Hermes Agent | Claude Code / Codex | 普通 Telegram Bot Agent |
|---|---|---|---|
| 产品中心 | 长期 personal agent runtime | IDE/terminal 内任务完成 | 消息入口交互 |
| 持久记忆 | 强，内建 memory + session search + skills | 相对弱，偏任务上下文 | 通常很弱 |
| 多平台入口 | 强 | 弱或没有 | 有，但 runtime 弱 |
| 工具系统 | registry + toolset + gating + async bridging | 强，但更偏 coding | 通常简单 |
| 自动化/定时 | 有 cron、background task | 一般较弱 | 偶尔有 |
| IDE 集成 | 有 ACP，但不是唯一中心 | 核心强项 | 基本没有 |
| 系统复杂度 | 很高 | 中高 | 低到中 |

## 批判性分析

### 局限性

**1. 过于庞大，学习和维护门槛都高。**

Hermes 现在已经不是“读 README 就能掌控”的项目。对于普通开发者来说，光是理解：
- model provider
- gateway
- toolsets
- skills
- memory
- migration
- ACP
- cron
- plugins

就已经够重了。

**2. 产品叙事很大，容易让外界误判其成熟度。**

“self-improving”“grows with you”“agent that lives on a VPS”这些叙事非常吸引人，但用户真正关心的是：
- 稳不稳定
- 记忆会不会串
- 安全边界够不够硬
- 多平台是否容易炸

Hermes 在这些地方确实下了工夫，但系统越大，边角 case 就越多。

**3. 它的最佳用户，不一定是大众用户。**

这个项目特别适合：
- 愿意折腾基础设施的高级用户
- 真正想长期养一个 agent 的人
- 需要多个入口和自动化能力的用户

但对只想“我问一句，你答一句”的普通用户来说，它可能明显过配。

### 适用边界

最适合：
- 私人长期助理
- 研究型 agent platform
- 多消息入口自动化
- 远程常驻 agent
- 希望把 memory/skills 做成严肃基础设施的团队

不太适合：
- 极简聊天产品
- 单一 IDE 内 coding tool
- 只做一次性 workflow automation 的轻量项目

### 潜在风险

**1. 复杂度债务**

当一个系统同时做 CLI、gateway、ACP、cron、skills、plugins、memory、MCP 时，模块边界很容易被长期侵蚀。

**2. 安全面扩大**

多平台消息入口 + terminal + memory + plugins + MCP + remote runtime，这个组合天然扩大攻击面。Hermes 已经在做硬化，但后续安全维护压力只会越来越大。

**3. 社区期望管理困难**

Star 增长很快以后，社区会同时期待：
- 更稳
- 更多 provider
- 更多平台
- 更好 UX
- 更强 coding
- 更强 personal memory

这几乎是多条产品线并行，路线稍不聚焦就容易摊大饼。

### 独立观察

**观察 1：Hermes 最值得学的不是功能，而是“分层意识”。**
它把 history、memory、skill、tool、gateway、ACP 分成不同层，而不是揉成一个“万能 agent”。这一点很成熟。

**观察 2：它很像 OpenClaw、Claude Code、传统 bot framework 的一次合流。**
你能明显看到它在吸收几条路线：
- OpenClaw 的人格/记忆/workspace 文件体系
- Claude Code/Codex 的 coding-agent 工作流
- bot framework 的多平台接入能力
- LangChain/agent framework 世界的 tool / memory / MCP 思想

**观察 3：它不是“更好的聊天机器人”，而是“更像人的数字分身底座”。**
这句话听起来有点大，但确实更接近它真实的方向。

## 对领域的影响

短期看，Hermes 会继续抬高开源个人 agent 项目的基线。

以前大家比的是：
- 谁接的模型多
- 谁工具多
- 谁 UI 好看

以后更值得比的是：
- 谁的 state 架构更稳定
- 谁的 memory 真能长期用
- 谁的 skill accumulation 更可控
- 谁的多入口 runtime 真能长期跑

中期看，这类项目会推动“个人 AI 助理”从应用层玩具，变成真正有 runtime、状态层、调度层的工程系统。

长期看，如果 Hermes 这条路线能持续压住复杂度，它最有机会占到的位置，不是某个垂类 app，而是：

**开源个人 agent runtime 的基础设施层。**

这也是为什么这个仓库现在非常值得盯。它不只是一个火的 repo，而是在尝试定义：

> 一个长期、跨平台、可记忆、可成长、可编排的个人 AI 助理，到底应该长什么样。
