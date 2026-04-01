---
title: 从源码拆解 Claude Code：一个 AI Agent CLI 的系统设计
description: 基于 npm 发布包与 source map 还原结果，对 Claude Code 的入口、主循环、工具系统、命令系统与架构取舍做工程级分析。
date: "2026-03-31"
---

# 从源码拆解 Claude Code：一个 AI Agent CLI 的系统设计

> 狠一点版本：这不是一篇“看了几个文件后的印象流笔记”，而是一篇把 Claude Code 当成 **Agent Runtime 系统** 来拆的工程分析。本文会尽量把入口、主循环、消息流、工具协议、命令系统、skills、MCP、权限与产品化取舍串成一张完整地图。

> 这篇文章基于 `@anthropic-ai/claude-code` 的 npm 发布包与 `cli.js.map` source map 还原结果撰写。分析对象不是 GitHub 原始仓库，而是 **可运行的发行版源码树**。但由于 source map 中包含了大量 `sourcesContent`，我们仍然可以恢复出一套相当完整的 `src/` 结构，并据此做较高可信度的架构分析。

## 一、为什么 Claude Code 值得拆

Claude Code 不是一个普通的聊天 CLI。

从还原后的源码结构看，它更接近一个 **面向终端与本地开发工作流的 Agent Runtime**。它同时具备：

- CLI / slash command 系统
- 会话主循环（QueryEngine）
- 工具注册与权限系统
- MCP 集成
- Skills / plugins 机制
- REPL / TUI 界面
- 远程会话、桥接、工作树、任务与代理协作等扩展能力

也就是说，它的本质不是“一个 prompt 包一层 shell”，而是：

> **一个以本地开发、工具调用和持续会话为核心的 Agent OS 雏形。**

如果你正在设计自己的 Agent 基础设施，Claude Code 值得看的地方，不是它用了哪个模型，而是它怎样把以下这些东西系统性地拼起来：

- 输入入口
- 状态管理
- 工具协议
- 命令与技能
- 权限与安全
- 会话与恢复
- 插件与扩展

---

## 二、我们还原出了什么

通过 `cli.js.map`，我们恢复出了 **4756 个文件**，其中包括大量真实的 `src/` 源文件，例如：

- `src/main.tsx`
- `src/QueryEngine.ts`
- `src/Tool.ts`
- `src/commands.ts`
- `src/tools.ts`
- `src/tools/*`
- `src/skills/*`
- `src/services/*`
- `src/context/*`
- `src/state/*`
- `src/assistant/*`
- `src/server/*`

这意味着我们能分析的不只是打包后的大 bundle，而是一套接近原始工程边界的源码树。

从目录上看，Claude Code 的结构大概是：

```text
src/
  main.tsx                # 巨型入口 / CLI 初始化 / REPL 编排
  QueryEngine.ts          # 会话主循环内核
  Tool.ts                 # 工具类型系统与运行上下文协议
  tools.ts                # 工具注册中心
  commands.ts             # slash/CLI 命令注册中心
  tools/                  # 各类工具实现
  commands/               # 各类命令实现
  skills/                 # skills 体系
  services/               # API/MCP/analytics 等服务层
  state/                  # 应用状态管理
  context/                # 上下文拼装
  assistant/              # assistant mode / kairos 等
  bridge/ remote/ server/ # 远程、桥接、会话等扩展能力
```

仅看这个结构就能知道：

> Claude Code 不是把所有东西堆进一个 query loop，而是围绕“主循环 + 插件化外设”构建了一整套系统边界。

---

## 三、系统总图：Claude Code 的 5 层结构

基于源码，我们可以把 Claude Code 抽象成 5 层：

```text
[1] Entrypoint / CLI Layer
    main.tsx
    commands.ts

[2] Session Runtime Layer
    QueryEngine.ts
    query.ts
    processUserInput(...)

[3] Tool Protocol Layer
    Tool.ts
    tools.ts
    tools/*

[4] Service / Integration Layer
    services/*
    MCP / API / auth / plugins / skills / analytics

[5] UI / Interaction Layer
    ink/
    components/
    interactiveHelpers.tsx
    REPL / dialogs / notifications
```

这个分层非常关键，因为它体现了 Claude Code 的一个核心设计取向：

> **把“模型循环”当作核心，但绝不把整个系统都塞进模型循环里。**

这是很多 Agent 项目做不好的地方。

---

## 四、入口：`main.tsx` 是一个巨型编排器

### 1. 它不是薄入口，而是“启动总调度”

还原后的 `src/main.tsx` 非常大，导入了大量模块。仅看前几百行，就能看到它做了这些事情：

- 启动性能 profiling
- 预取 MDM / keychain / auth / fast mode / analytics / policy / MCP 资源
- 初始化全局配置与 settings
- 处理 CLI 参数
- 选择 REPL / assistant / bridge / remote session 等模式
- 初始化 tools / commands / plugins / skills
- 准备上下文、session、cwd、model、permissions
- 最后进入交互式渲染或 headless 逻辑

这说明 `main.tsx` 的角色不是纯入口，而是：

> **系统 bootloader + runtime assembler**

### 2. 它的优化意识很强

源码一开头就有非常典型的启动期并行优化：

- `profileCheckpoint('main_tsx_entry')`
- 提前触发 MDM 读取
- 提前触发 keychain 预取

注释里明确写了这些预取是为了和后续 import 并行，减少 macOS 启动时的串行等待成本。

这很说明问题：

Claude Code 团队不是只关心功能可用，而是已经进入了 **“大型 CLI 启动性能工程化”** 阶段。

这也是它和很多个人 Agent 工具的差别：
- 不是 demo
- 不是 prompt wrapper
- 而是一个使用频率很高、启动成本很敏感的常驻工作台

### 3. 它有大量 feature gate

`main.tsx` 里出现了很多 `feature('...')` 条件导入，例如：

- `COORDINATOR_MODE`
- `KAIROS`
- `BRIDGE_MODE`
- `DAEMON`
- `VOICE_MODE`
- `WORKFLOW_SCRIPTS`
- `HISTORY_SNIP`
- `TORCH`
- `BUDDY`

这意味着 Claude Code 不是一个单一产品形态，而更像一个：

> **多产品模式共用同一运行时底座**

这也是为什么 `main.tsx` 会这么大：它负责在很多模式之间做启动期装配。

### 4. 入口的优点与代价

**优点：**
- 所有启动装配逻辑集中
- 容易做性能与初始化优化
- feature gate 与不同产品模式都能统一调度

**代价：**
- 入口文件过于庞大
- 架构理解成本高
- 新人很难直接判断“最核心路径在哪”

这也是为什么我们在分析时，必须尽快把注意力从 `main.tsx` 转向 `QueryEngine.ts`。

---

## 五、内核：`QueryEngine.ts` 是会话主循环

如果说 `main.tsx` 是 bootloader，
那么 `QueryEngine.ts` 就是 Claude Code 的 **runtime kernel**。

### 1. QueryEngine 负责什么

从类型定义和构造参数来看，它管理：

- 当前会话消息列表 `mutableMessages`
- 当前工作目录 `cwd`
- commands / tools / mcpClients / agents
- `canUseTool` 权限决策
- app state 的读写
- 初始消息与缓存
- system prompt 与追加 prompt
- model / fallback model / thinkingConfig
- 预算（turn、USD、taskBudget）
- replay / partial message / structured output / elicitation

这基本覆盖了一个 agent 会话真正需要的所有运行态信息。

### 2. `submitMessage()` 是真正的 agent loop 入口

`submitMessage(prompt, options)` 返回的是一个 `AsyncGenerator<SDKMessage>`。

这个设计非常关键。

它说明 Claude Code 的内核不是传统：

```text
input -> await result -> return whole response
```

而是：

```text
input -> async stream of SDKMessage -> turn lifecycle events / tool events / status / partial output
```

这让它天然适合：

- 终端流式输出
- REPL UI
- SDK 模式
- 工具调用中间态
- compact / snip / resume 等复杂事件

也就是说，Claude Code 在内核层就选择了：

> **事件流式 agent runtime，而不是单次 completion wrapper**

### 3. QueryEngine 不是直接写死业务，而是收配置执行

`QueryEngineConfig` 很长，但这恰恰说明它的设计思想是：

- 让外层把运行时依赖装好
- 内核只负责驱动会话

这是一种非常成熟的写法。它把系统分成：

- **装配期**：`main.tsx`
- **执行期**：`QueryEngine.ts`

如果你自己做 Agent 系统，这个分层很值得借鉴。

### 4. QueryEngine 的强点：状态跨 turn 持续存在

构造时会持有：

- `mutableMessages`
- `permissionDenials`
- `readFileState`
- `totalUsage`
- 技能发现集合、nested memory 路径等

也就是说，它并不是“每轮都全新创建的纯函数式 pipeline”，而是：

> **一个带长期会话状态的 conversation runtime object**

这对 coding agent 非常重要。因为 coding agent 真正难的地方不是单轮回答，而是：

- 连续上下文
- 预算累计
- 文件状态追踪
- 权限历史
- 插件/工具发现状态
- resume / replay / compact

### 5. QueryEngine 的本质

如果用一句话总结：

> `QueryEngine` 是 Claude Code 的“对话内核 + 工具调度内核 + 状态机核心”。

这就是为什么它是最值得研究的文件之一。

---

## 六、工具协议：`Tool.ts` 定义了 Agent 外设总线

很多 Agent 项目都有 tools，但做得浅。
Claude Code 的工具层之所以强，是因为它不是“工具数组”，而是 **工具协议层**。

### 1. `Tool.ts` 不是工具实现，而是工具语言

从 `Tool.ts` 的类型可以看出，它定义的是：

- `ToolInputJSONSchema`
- `ToolUseContext`
- `ToolPermissionContext`
- 进度事件类型
- 权限模式、上下文状态、消息结构
- 与 app state / readFileState / notifications / sdk status 的连接点

这说明工具在 Claude Code 里不是孤立函数，而是系统一级对象。

### 2. `ToolUseContext` 很厚，说明工具被当作“有系统访问权的 actor”

`ToolUseContext` 里不仅有：
- commands
- tools
- mcpClients
- thinkingConfig
- refreshTools

还有：
- `getAppState()` / `setAppState()`
- `appendSystemMessage()`
- `sendOSNotification()`
- `setToolJSX()`
- `setSDKStatus()`
- `updateFileHistoryState()`
- `updateAttributionState()`
- `toolDecisions`
- `loadedNestedMemoryPaths`
- `discoveredSkillNames`
- `handleElicitation()`

换句话说，在 Claude Code 里，工具不是“帮模型执行一个动作”那么简单，
而是：

> **工具 = 可以与会话运行时深度耦合的执行单元**

这就是它和“OpenAI function call + 一层 switch case”的根本差别。

### 3. 权限系统不是外插的，而是工具协议的一部分

`ToolPermissionContext` 直接进了核心类型层。

这意味着 Claude Code 从架构上就认为：

- 工具可用性
- 风险级别
- 可展示/不可展示的权限 prompt
- 自动决策/回退规则

都属于工具协议的一部分，而不是事后再加的防火墙。

这是非常成熟的安全工程思路。

---

## 七、工具注册：`tools.ts` 是能力表，不是随便 import 一堆 class

### 1. `getAllBaseTools()` 是“系统能力总表”

从 `tools.ts` 可以看到，Claude Code 维护了一套清晰的工具注册中心，包括：

- `AgentTool`
- `BashTool`
- `FileReadTool`
- `FileEditTool`
- `FileWriteTool`
- `GlobTool`
- `GrepTool`
- `WebFetchTool`
- `WebSearchTool`
- `SkillTool`
- `AskUserQuestionTool`
- `TodoWriteTool`
- `Task*Tool`
- `LSPTool`
- `ListMcpResourcesTool`
- `ReadMcpResourceTool`
- `ToolSearchTool`
- `EnterPlanModeTool`
- `EnterWorktreeTool` / `ExitWorktreeTool`
- `SendMessageTool`
- `WorkflowTool`
- `SleepTool`
- `RemoteTriggerTool`
- `MonitorTool`
- `WebBrowserTool`
- `REPLTool`（条件开启）

这个列表非常能说明它的产品定位：

> Claude Code 的目标不是“回答问题”，而是“在本地环境里完成工作”。

### 2. 工具注册带 feature gate 与环境约束

不是所有工具都默认启用，而是根据：

- `feature(...)`
- `process.env.USER_TYPE`
- worktree mode
- todo v2
- LSP 开关
- browser / workflow / proactive 等模式

动态组装。

这再次说明 Claude Code 的工具系统更像一个 **capability graph**，而不是固定列表。

### 3. 值得借鉴的点

如果你在做自己的 agent runtime，`tools.ts` 给你的启发是：

- 工具应该有一个统一注册层
- 工具开启条件必须工程化
- 不能把 feature flag 与工具内部实现纠缠在一起
- 工具发现、权限、可见性、可搜索性，都应该统一管理

---

## 八、命令系统：`commands.ts` 是第二套控制面

Claude Code 很特别的一点是：

它不仅有 tools，还有一整套 **commands**。

### 1. commands 和 tools 不是一回事

从 `commands.ts` 看，Claude Code 有大量命令，例如：

- `/help`
- `/config`
- `/status`
- `/memory`
- `/mcp`
- `/skills`
- `/permissions`
- `/files`
- `/branch`
- `/model`
- `/effort`
- `/output-style`
- `/review`
- `/plan`
- `/fast`
- `/resume`
- `/session`
- `/tasks`
- `/chrome`
- `/advisor`
- `/stats`

还包括大量 feature-gated 的高级命令。

### 2. 它本质上构建了“用户控制面”和“模型执行面”的分离

- **commands**：给用户显式控制 runtime
- **tools**：给模型在主循环中执行动作

这是一个非常重要的架构边界。

很多 Agent 系统会把所有东西都做成模型可调用工具，结果是：
- 用户控制困难
- 系统边界混乱
- 权限与调试很难做

Claude Code 的做法更像操作系统：

- commands 是 shell 命令 / 控制平面
- tools 是 runtime 外设 / 执行平面

这是一个非常值得借鉴的划分。

### 3. 命令来源不止内建，还有 skill/plugin 动态扩展

`commands.ts` 里不仅加载 builtin commands，还会拼入：

- `getSkillDirCommands()`
- `getBundledSkills()`
- `getPluginCommands()`
- `getPluginSkills()`

这说明 Claude Code 的命令系统并非封闭，而是支持：

> **从 skill/plugin 侧向控制平面注入新命令与能力。**

这也是它为什么能持续扩展但不至于彻底失控。

---

## 九、Claude Code 的真正强项：不是某个模块，而是“统一 runtime 观”

读完这些核心文件后，你会发现 Claude Code 真正厉害的地方，不在某一个算法，而在它有一套很完整的 runtime worldview：

### 1. 会话不是聊天记录，而是运行时对象
- 有状态
- 可恢复
- 可 compact
- 可 replay
- 有预算
- 有工具权限历史

### 2. 工具不是函数，而是系统能力
- 有协议
- 有上下文
- 有权限
- 有 UI/notification/status 通道
- 可接入 runtime

### 3. 命令不是 prompt 技巧，而是控制平面
- 用户显式可控
- 独立于模型回路
- 可以做 admin / config / inspect / debug

### 4. feature gate 不是枝节，而是产品化手段
- 同一底座支持多模式
- 控制不同 build / 用户类型 / 实验能力

### 5. CLI 不是外壳，而是产品本体
- 启动优化
- TUI/REPL
- 会话恢复
- 本地工具深集成

这五点凑在一起，才构成了 Claude Code 的“系统感”。

---

## 十、它的问题与代价

这套架构也不是没有代价。

### 1. 入口过大
`main.tsx` 过于庞大，理解门槛高。

### 2. 系统边界多，认知成本也高
commands、tools、skills、plugins、services、assistant mode、coordinator mode、bridge、remote session……
对于维护者来说，这是非常重的系统。

### 3. feature gate 多会加剧复杂性
feature gate 是产品化利器，但也容易带来：
- 隐式分支
- 测试矩阵膨胀
- 构建差异难排查

### 4. 大量运行时耦合不可避免
`ToolUseContext` 很强大，但也意味着工具和 runtime 的耦合很深。
这对扩展很爽，但对纯净抽象并不友好。

不过，这些代价某种程度上也是这类产品不可避免的。
因为 Claude Code 不是在做“最漂亮的架构”，而是在做：

> **能长期支撑真实高频开发工作的 agent runtime。**

---

## 十一、对 AI Agent 工程的启发

如果把 Claude Code 当成一个参考样本，它给 Agent 工程的启发至少有 6 条。

### 启发 1：主循环必须是一等公民
不要把 agent loop 埋在 UI、HTTP handler 或 prompt wrapper 里。
应该像 `QueryEngine` 一样，把它独立成真正的 runtime kernel。

### 启发 2：工具协议要先于工具实现
在能力变多之前，先把：
- context
- permission
- progress
- state hooks
- message protocol

这些协议定义清楚。

### 启发 3：用户控制面和模型执行面要分开
commands 与 tools 分离，是一个非常重要的系统设计。

### 启发 4：会话是对象，不是数组
如果你要做 coding agent、table agent、workspace agent，
单纯的 message array 会很快不够用。

### 启发 5：性能工程要前置
Claude Code 连 keychain 预取和启动并行化都做了，说明当系统成为“高频工作台”后，启动与循环性能会立刻变成产品问题。

### 启发 6：Agent 系统最终会长成操作系统，而不是 prompt 模板
Claude Code 之所以值得研究，就是因为它已经在朝这个方向演化：
- session
- tools
- commands
- plugins
- remote
- policies
- state
- UI

这些都已经超出了“LLM app”的范畴。

---

## 十二、如果你要做自己的 Agent Runtime，最值得抄哪三点

### 第一：`QueryEngine` 这种 runtime kernel 分层
这是整个系统最值得借鉴的骨架。

### 第二：`Tool.ts` 这种厚工具协议
工具如果不做成系统一级对象，后面会非常难扩展。

### 第三：`commands.ts` 与 `tools.ts` 的双平面架构
一个给人控制，一个给模型执行。这是长期可维护性的关键。

---

## 十三、继续向下拆：真正的消息流发生在 `query.ts`

如果说 `QueryEngine.submitMessage()` 是对外 API，
那 `query.ts` 才是 Claude Code 的 **真正采样循环与状态转移引擎**。

### 1. `query()` 不是单一请求，而是一个 while(true) 状态机

从源码可以直接看到：

- `query()` 返回 `AsyncGenerator`
- 内部委托给 `queryLoop(...)`
- `queryLoop(...)` 里维护了一个可变 `State`
- 然后进入 `while (true)` 持续推进当前 turn

这里的 `State` 包括：

- `messages`
- `toolUseContext`
- `autoCompactTracking`
- `maxOutputTokensRecoveryCount`
- `hasAttemptedReactiveCompact`
- `maxOutputTokensOverride`
- `pendingToolUseSummary`
- `stopHookActive`
- `turnCount`
- `transition`

这说明 Claude Code 的 query loop 根本不是：

```text
prompt -> model -> maybe tools -> finish
```

而是：

```text
messages -> preprocess -> compact/snip/collapse -> sample -> tool orchestration -> recovery / continue -> next iteration
```

这是一个真正意义上的 **agent turn state machine**。

### 2. 它在每轮采样前做大量上下文整形

从 `query.ts` 的主循环里，至少能看到这些步骤：

- `startRelevantMemoryPrefetch(...)`
- `skillPrefetch?.startSkillDiscoveryPrefetch(...)`
- `applyToolResultBudget(...)`
- `snipCompactIfNeeded(...)`
- `microcompact(...)`
- `contextCollapse.applyCollapsesIfNeeded(...)`
- `autocompact(...)`

这特别值得注意。

很多 Agent 系统只关心“把 messages 发给模型”，但 Claude Code 真正做的是：

> **在每一轮采样前主动重写、压缩、投影、约束上下文。**

这说明它的模型调用不是原始的聊天 API，而是一个 **被前置上下文管线严密包裹的采样阶段**。

### 3. 上下文管理是 Claude Code 的核心竞争力之一

仅从 `query.ts` 暴露出来的名字，就能看出它有多重上下文治理机制：

- auto compact
- reactive compact
- snip compact
- microcompact
- context collapse
- token budget
- tool result budget
- max output token recovery

这是非常不简单的。

因为 coding agent 最大的问题之一就是上下文失控：

- 对话越来越长
- 工具输出越来越大
- 重复内容越来越多
- 模型越用越“糊”

Claude Code 的思路不是简单 truncate，而是做了一整套：

> **多阶段 context management pipeline**

这也是它比很多“会调用工具的聊天助手”更像一个真正 runtime 的原因。

---

## 十四、输入处理不是附属逻辑，而是 `processUserInput(...)` 管线

`processUserInput(...)` 这层也很值得看。

### 1. 它负责把“用户输入”变成“系统可执行输入”

从源码看，它至少处理这些事：

- slash command 识别与执行
- pasted content / image / attachment
- bridge 场景下的安全命令处理
- meta message / hidden prompt
- 用户 prompt submit hooks
- 是否真的进入 query
- allowedTools / model / effort 的动态改写
- nextInput / submitNextInput 链式输入

这意味着 Claude Code 不是把用户原始输入直接送进 query loop，
而是先经过一层 **input normalization + command interception + policy hooks**。

### 2. 它把“显式命令”和“普通 prompt”统一收口

这是非常好的设计。

一方面，用户输入 `/memory`、`/config`、`/skills` 这类 slash command 时，
它可以完全走控制面逻辑，不进入模型循环。

另一方面，普通 prompt 仍然能在进入 query 前统一经过：
- hooks
- attachment 处理
- meta 标记
- tool 限制
- model/effort 覆写

这样一来，Claude Code 的输入系统不会裂成两套。

### 3. 这给 Agent 工程一个重要启发

如果你在做自己的 agent CLI 或桌面 runtime，
最好不要把：

- slash command
- plain prompt
- pasted file/image
- system-generated prompt
- remote ingress prompt

拆成彼此孤立的入口。

更好的做法，就是像 Claude Code 这样：

> **先统一进入 input processing pipeline，再决定是否进入主循环。**

---

## 十五、skills 不是 prompt 片段，而是受治理的可加载能力单元

`src/skills/loadSkillsDir.ts` 非常值得认真看，因为它暴露了 Claude Code 对 skills 的理解。

### 1. skills 是带 frontmatter 的文件型能力单元

从 loader 可以看出，一个 skill 可以包含这些元信息：

- `name`
- `description`
- `whenToUse`
- `allowedTools`
- `argumentHint`
- `argumentNames`
- `model`
- `effort`
- `hooks`
- `executionContext`
- `agent`
- `shell`
- `user-invocable`
- `paths`

这说明 skill 在 Claude Code 里不是“加几段 system prompt”，而更像：

> **一种带声明式元数据、可路由、可治理、可约束的任务模板/能力模块。**

### 2. skills 是多来源加载的

源码中 `LoadedFrom` 包括：

- `skills`
- `plugin`
- `managed`
- `bundled`
- `mcp`
- 以及旧的 `commands_DEPRECATED`

这意味着 skill 系统不只是本地 markdown 文件，而是一层统一抽象：

- 用户技能
- 项目技能
- 平台内置技能
- 插件技能
- MCP skill builder 注入技能

都被放进了同一条能力加载链。

### 3. 它做了不少“工程上该做的事”

从 loader 可以看到它还处理了：

- symlink / realpath 去重
- gitignore 与路径可访问性判断
- markdown frontmatter 解析
- token 估算
- 参数替换
- hooks 校验
- path 范围限制
- model / effort 约束

也就是说，Claude Code 的 skills 不是“好玩的扩展”，而是：

> **正式进入 runtime 调度体系的一等能力对象。**

如果你在设计自己的 skill system，这一层的工程化深度特别值得借鉴。

---

## 十六、MCP 在 Claude Code 里不是外挂，而是原生二级能力总线

`src/services/mcp/client.ts` 的信息量很大。

### 1. Claude Code 同时支持多种 MCP transport

从源码里能看到它直接引入了：

- `SSEClientTransport`
- `StdioClientTransport`
- `StreamableHTTPClientTransport`
- `WebSocketTransport`
- 甚至 `SdkControlClientTransport`

这说明它不是“适配一种 MCP”，而是把 MCP 当成标准外部能力接口，认真做了 transport 层。

### 2. MCP 集成是 deeply integrated，而不是“把工具列表塞进模型”

在 `client.ts` 里我们能看到很多和 MCP 深度绑定的逻辑：

- OAuth / unauthorized / 401 refresh
- session expired 检测
- elicitation 流程
- tool result truncation / persistence
- binary content persistence
- MCP tool name normalization
- MCP skills 注入
- MCP 资源列表与读取
- 与 app state / message / telemetry 的接驳

这说明在 Claude Code 里，MCP 的地位不是：

> “外部工具协议”

而更像：

> **运行时的远程能力总线**

### 3. MCP 资源和 MCP 工具是被区别对待的

源码中单独存在：

- `ListMcpResourcesTool`
- `ReadMcpResourceTool`
- `MCPTool`
- `createMcpAuthTool(...)`

这意味着 Claude Code 非常明确地区分了：

- 可调用动作（tools）
- 可读取资源（resources）
- 认证与登录补链（auth）

这是一个相当成熟的抽象层次。

### 4. Claude Code 对 MCP 的判断

如果只用一句话概括：

> Claude Code 把 MCP 当成“外部能力基础设施”，而不是“某个插件协议”。

这对今天所有做 Agent OS / Agent IDE / Agent Runtime 的系统都很重要。

---

## 十七、Claude Code 为什么不像“工具调用聊天机器人”，而像操作系统

看到这里，应该已经能感受到一个事实：

Claude Code 不只是会话 + 工具，而是开始具备一种 **OS 化倾向**。

### 它像操作系统的地方在于：

#### 1. 有 bootloader
- `main.tsx`
- 各种启动期预取与装配

#### 2. 有 kernel
- `QueryEngine.ts`
- `query.ts`

#### 3. 有 syscalls / devices
- `Tool.ts`
- `tools.ts`
- `tools/*`

#### 4. 有 control plane
- `commands.ts`
- `/config` `/status` `/permissions` `/skills` `/mcp` 等

#### 5. 有 package / extension system
- skills
- plugins
- MCP

#### 6. 有 runtime governance
- permissions
- token budgets
- compact / collapse / snip
- auth / policy / settings

#### 7. 有 userland interface
- REPL
- ink components
- dialogs
- bridge / remote session

从系统设计角度讲，这就是它最值钱的地方。

很多 AI Agent 产品停留在：
- prompt
- tool call
- memory
- chat UI

Claude Code 已经明显往：

> **runtime + control plane + capability system + lifecycle management**

这个方向走了。

---

## 十八、如果你要做 table / editor / local agent infra，Claude Code 哪些思路最值得抄

这里我不只做“源码赏析”，而是站在工程实践角度给结论。

### 1. 抄 QueryEngine，不要抄表面 UI
真正值得学的是它的 runtime kernel，而不是终端长什么样。

### 2. 抄工具协议，不要只抄工具列表
最值钱的是 `ToolUseContext` 这类协议设计，而不是 BashTool / FileReadTool 名字本身。

### 3. 抄 commands 与 tools 分离
这是长期系统可维护性的核心之一。

### 4. 抄 context pipeline
你后面做 table 也会遇到同样的问题：
- 数据越来越多
- 输出越来越大
- 历史越来越长

Claude Code 在 query.ts 里展示的 context 压缩治理思路，非常值得迁移到其他 agent 场景。

### 5. 抄 skill 系统的工程化
如果未来你的 table agent / page agent / workflow agent 要支持“任务模板”或“技能卡片”，那 `loadSkillsDir.ts` 这种 frontmatter + loader + policy 的做法，比硬编码 prompt 强太多。

---

## 十九、再往里一层：tool orchestration 为什么是 Claude Code 的关键肌肉

只看 `Tool.ts` 和 `tools.ts` 还不够，真正的执行策略藏在：

- `src/services/tools/toolOrchestration.ts`
- `src/services/tools/StreamingToolExecutor.ts`

### 1. Claude Code 不是“工具来了就一个个跑”

`toolOrchestration.ts` 的核心很清楚：

- 先根据 `isConcurrencySafe(...)` 对 tool calls 分组
- 可并发安全的工具批量并发执行
- 不可并发安全的工具串行执行
- 执行过程中还能收集 context modifier，回写到 `ToolUseContext`

这很重要，因为它说明 Claude Code 的工具系统不是：

> “模型吐一个 tool_use，运行一下，再继续”

而是：

> **在工具层做并发策略、上下文回写、顺序控制和批处理调度。**

这已经明显超出 function calling demo 范畴了。

### 2. 它把“并发安全性”做成了工具自身声明的一部分

`partitionToolCalls(...)` 会读取每个工具的 `isConcurrencySafe(input)`。

这个设计非常聪明：

- 并发规则不是硬编码在总调度器里
- 而是工具自己声明“我能不能并发”
- 调度器只负责根据声明做 batching

这样一来，不同工具可以自然分成两类：

- **读型工具**：适合并发
- **写型工具 / 副作用工具**：必须串行或独占

这对任何真正有副作用的 agent runtime 都是必需的。

### 3. `StreamingToolExecutor` 更进一步：它支持“边流式到达边执行”

这个类特别值得注意。

从源码上看，它处理了：

- 工具队列
- 工具状态（queued / executing / completed / yielded）
- 并发执行条件
- sibling abort
- user interrupted
- streaming fallback
- progress message 提前吐出
- 按接收顺序吐结果

一句话概括：

> **Claude Code 不只是支持 tool execution，它支持 streaming tool execution。**

这意味着模型输出 tool_use block 时，系统可以更快进入执行态，而不是必须等整个 assistant message 完整结束后再统一处理。

### 4. 为什么这很重要

因为高质量 agent runtime 的体验，不只是“最后能做完事”，而是：

- 有没有中间进度
- 工具之间能不能合理并发
- 一个 Bash 工具炸了能不能及时取消兄弟工具
- fallback 时能不能丢弃已经过期的流式执行结果
- 结果顺序和状态是不是稳定

这些问题，很多 Agent 产品表面看不出来，但一做复杂工作流就全部暴露。

Claude Code 在这里明显已经进入了：

> **把工具执行当作一套任务调度系统来设计**

的阶段。

---

## 二十、调用链图：一次用户输入如何穿过整个系统

为了把前面的模块串起来，我们给 Claude Code 画一张“单次输入的系统调用链图”。

```text
User Input
  │
  ▼
main.tsx
  ├─ 启动期装配（config / auth / policy / tools / commands / skills / mcp）
  └─ 创建或进入会话 runtime
        │
        ▼
QueryEngine.submitMessage(...)
  ├─ 构造 ProcessUserInputContext
  ├─ 获取 system prompt / user context / system context
  ├─ 处理 transcript 持久化 / resume / permission 状态
  └─ 调用 processUserInput(...)
        │
        ▼
processUserInput(...)
  ├─ slash command 拦截
  ├─ pasted content / attachments / images
  ├─ hooks / blocking checks
  ├─ allowedTools / model / effort 覆写
  └─ 决定是否进入 query loop
        │
        ▼
query(...)
  ├─ relevant memory prefetch
  ├─ skill discovery prefetch
  ├─ tool result budget
  ├─ snip / microcompact / context collapse / autocompact
  ├─ 构建 API query config
  ├─ 触发模型采样
  └─ 收到 assistant/tool_use 后进入工具编排
        │
        ▼
runTools(...) / StreamingToolExecutor
  ├─ 并发安全工具批量执行
  ├─ 非并发安全工具串行执行
  ├─ progress 消息流式产出
  ├─ context modifier 回写
  └─ 结果重新注入消息流
        │
        ▼
QueryEngine / REPL / SDK Consumer
  ├─ 持续更新消息
  ├─ 记录 transcript / usage / permission denials
  ├─ 渲染 UI 或输出 SDK stream
  └─ 等待下一轮输入
```

这张图最重要的意义是：

> Claude Code 的设计从来不是“问模型一次”，而是“驱动一个有生命周期的运行时系统”。

---

## 二十一、运行时时序图：Claude Code 真正关心什么

如果从时间顺序看，Claude Code 真正优化和治理的点主要在 6 个阶段：

### Phase 1：启动装配
- 预取 keychain / MDM
- 初始化 settings / policy / auth
- 装配 tools / commands / skills / plugins / MCP

### Phase 2：输入整形
- slash commands
- attachments
- hook checks
- permission / model / effort 改写

### Phase 3：上下文治理
- memory prefetch
- skill discovery
- tool result budget
- compact / collapse / snip

### Phase 4：模型采样
- 生成 assistant / tool_use / partial messages
- 控制 token budget / max output recovery / fallback

### Phase 5：工具执行
- concurrency-safe batching
- serial execution for side effects
- streaming progress
- abort / discard / retry / error propagation

### Phase 6：会话落盘与继续
- transcript
- usage
- permission denials
- file state / attribution / read cache
- 下一轮输入

从这个视角看，Claude Code 的重点从来不只是 LLM API。

它更像在做：

> **面向 agent work session 的完整生命周期管理。**

---

## 二十二、`QueryConfig` 透露出的一个关键信号：它在为“可提纯的 step 引擎”铺路

`src/query/config.ts` 很短，但很有味道。

里面写得很明确：

- query() 入口会 snapshot immutable config
- 把这些与 per-iteration state 分开
- 未来更容易把 step 提纯成 `(state, event, config)` 这样的 reducer 结构

这段注释其实很值钱。

因为它说明维护者已经意识到：

- 当前 query loop 很复杂
- 需要把 mutable state 和 immutable config 明确分离
- 这样未来才能更容易提炼为纯状态机/step engine

换句话说，Claude Code 的当前实现虽然已经很强，但它的开发者其实也在继续往更可维护的 runtime 形态逼近。

这给我们的启发是：

> 真正成熟的系统，不只是功能堆得多，而是维护者持续在为“未来可重构性”留路。

---

## 二十三、为什么 Claude Code 的架构特别适合复杂 Agent，而不是轻聊天助手

现在可以回答一个更本质的问题：

为什么 Claude Code 这种架构适合 coding agent / local agent / tool-heavy agent？

### 原因 1：它把会话变成了 runtime object
轻聊天助手只需要 message array。
复杂 agent 需要：
- file state
- permission state
- tool context
- replay / resume
- budget / usage
- dynamic capabilities

Claude Code 选了后者。

### 原因 2：它把工具变成了调度对象，而不是 call site
复杂 agent 里的工具不是“调一下 API”，而是：
- 可能要并发
- 可能要串行
- 可能要中断
- 可能要产出进度
- 可能要持久化
- 可能要回写上下文

Claude Code 的 tool orchestration 正好服务这一点。

### 原因 3：它高度重视 context governance
复杂 agent 最大的问题不是“模型不够强”，而是上下文和工具输出会失控。
Claude Code 在这点上明显投入很深。

### 原因 4：它把控制平面和执行平面分开
commands 给人控制，tools 给模型执行。这样系统边界会稳定很多。

### 原因 5：它天然适合产品化扩展
因为它已经有：
- feature gate
- plugin
- skills
- MCP
- remote / bridge / daemon
- analytics / policy / managed settings

这些都是产品化 runtime 才会真正需要的东西。

---

## 二十四、这篇分析的一个总判断

Claude Code 最值得敬畏的地方，不是某个单点 feature，
而是它已经把很多人脑中模糊的 Agent 系统，做成了一个清晰的工程对象：

- 有启动期
- 有运行期
- 有控制平面
- 有执行平面
- 有能力注册
- 有状态治理
- 有预算与权限
- 有扩展与远程能力

这就是为什么它值得源码级分析。

因为它展示的不是“怎么做一个 AI 工具”，而是：

> **怎么做一个能长期工作的 Agent Runtime。**

---

## 二十、结论

Claude Code 的源码给人的最强烈感受，不是“代码多”，也不是“功能全”，而是：

> **它真的把 AI Agent 当作一个运行时系统在做。**

它的核心不是“如何让模型更聪明”，而是：
- 如何让会话可持续
- 如何让工具可治理
- 如何让命令可控
- 如何让能力可扩展
- 如何让系统在真实开发工作流里稳定运行

这也是它最值得研究的地方。

如果把 Claude Code 的架构抽象出来，它更像：

> **一个面向开发者的 Agent Operating Layer**

而不是一个单纯的 AI 聊天程序。

---

## 附：本次分析重点参考的还原源码文件

- `src/main.tsx`
- `src/QueryEngine.ts`
- `src/query.ts`
- `src/utils/processUserInput/processUserInput.ts`
- `src/Tool.ts`
- `src/tools.ts`
- `src/commands.ts`
- `src/skills/loadSkillsDir.ts`
- `src/services/mcp/client.ts`

---

## 后续可继续深挖的方向

这篇文章现在已经拆到“核心骨架 + 运行时主干”层级了。继续往下，还可以分别单写：

1. `QueryEngine + query.ts` 的 turn lifecycle 与状态转移
2. Claude Code 的 permission system 设计
3. MCP 集成方式与工具/资源/认证三层抽象
4. skills / plugins / commands 如何共同注入 runtime
5. REPL / Ink UI 与 agent runtime 的耦合方式
6. assistant mode / coordinator mode / remote mode 的差异化装配

如果你在做自己的 AI Agent 基础设施，这些部分几乎都值得逐篇研究。
