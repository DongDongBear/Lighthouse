---
title: Claude Code 深读（二）：QueryEngine 与 query.ts 如何驱动一个 Agent Runtime
description: 专门拆解 Claude Code 的 QueryEngine、query.ts、输入处理与工具回流机制，理解一次 agent turn 如何真正被执行。
date: "2026-03-31"
---

# Claude Code 深读（二）：QueryEngine 与 query.ts 如何驱动一个 Agent Runtime

> 这是 Claude Code 系列的第二篇。第一篇从系统总览角度分析了入口、工具、命令、skills 与 MCP。这一篇只做一件事：**把 QueryEngine 与 query.ts 拆到底**，看一次 agent turn 在 Claude Code 里究竟是怎么被执行的。

## 一、为什么要单独写 QueryEngine

在很多 Agent 系统里，“主循环”会被埋在：

- UI 组件里
- HTTP handler 里
- 某个 `ask()` 函数里
- 一段边写边长的 orchestration 脚本里

结果就是：
- 结构不清晰
- 生命周期难追踪
- 难做 resume / compact / permissions / tool streaming
- 最后什么都能做一点，但系统感很弱

Claude Code 值得研究的原因之一，就是它把这部分硬生生拔出来，做成了：

- `QueryEngine.ts`：对外会话内核
- `query.ts`：真正的 query loop / turn state machine
- `processUserInput(...)`：输入预处理与控制面分流

如果说第一篇讲的是“Claude Code 的城市地图”，
那这一篇讲的就是：

> **这座城市里，电流是怎么流的。**

---

## 二、先说结论：Claude Code 的 turn 执行不是函数调用，而是状态机推进

很多人脑子里对 agent turn 的模型还是：

```text
用户输入
  -> 模型回答
  -> 如有工具调用就执行
  -> 返回结果
```

Claude Code 真正做的事要复杂得多。它更像：

```text
用户输入
  -> 输入整形/命令分流/附件注入
  -> QueryEngine 组装运行时
  -> query.ts 进入 while(true) 状态机
  -> 多阶段上下文治理
  -> 模型采样
  -> 工具调度/流式执行/上下文回写
  -> 错误恢复/compact/retry/继续下一迭代
  -> turn 收尾与会话状态落盘
```

所以更准确地说：

> Claude Code 不是在“发一次请求”，而是在“推进一次 agent turn runtime”。

---

## 三、`QueryEngine` 的定位：对外的会话控制器

### 1. QueryEngine 是“每个会话一个实例”的 runtime object

从源码可以直接看出，`QueryEngine` 持有这些长期状态：

- `mutableMessages`
- `abortController`
- `permissionDenials`
- `totalUsage`
- `readFileState`
- `discoveredSkillNames`
- `loadedNestedMemoryPaths`

这说明它不是一个无状态 helper，也不是纯函数工具箱，而是：

> **conversation-scoped runtime object**

这点非常重要。

因为 coding agent / local agent 真正麻烦的点，从来不是单次输出，而是会话持续性：

- 前几轮消息要留着
- 权限拒绝历史要累计
- read file cache 要复用
- usage / budget 要累积
- skill discovery 不能每轮都从零算

Claude Code 用一个 class 把这些 runtime concerns 全都包住了。

### 2. `submitMessage()` 是会话级 API，不是模型 API

`submitMessage(prompt, options)` 返回的是 `AsyncGenerator<SDKMessage>`。

它不是 `Promise<string>`，也不是 `Promise<Response>`。

这意味着 QueryEngine 面向的不是“文本 completion”，而是：

- 流式事件
- 中间状态
- tool 进度
- compact boundary
- request start / finish
- user replay / assistant replay
- SDK consumers

也就是说，`submitMessage()` 的抽象层级是：

> **一轮会话推进的事件流接口**

而不是“问一次模型”的接口。

### 3. QueryEngine 构造时已经把运行时依赖注入完了

`QueryEngineConfig` 很长，但这恰恰说明它把系统依赖注入得很彻底：

- `cwd`
- `tools`
- `commands`
- `mcpClients`
- `agents`
- `canUseTool`
- `getAppState` / `setAppState`
- `readFileCache`
- `customSystemPrompt`
- `appendSystemPrompt`
- `userSpecifiedModel`
- `fallbackModel`
- `thinkingConfig`
- `maxTurns`
- `maxBudgetUsd`
- `taskBudget`
- `jsonSchema`
- `handleElicitation`

这说明 QueryEngine 的工作前提是：

- **外层负责装配**
- **内层负责执行**

这也是它和“大一统 ask() 函数”的最大区别。

---

## 四、一次 `submitMessage()` 到底做了什么

我们按顺序拆。

### Step 1：包装 `canUseTool`，记录权限拒绝

`submitMessage()` 一开始会把 `canUseTool` 包一层，用来收集 `permissionDenials`。

这一步很说明问题：

Claude Code 不是把权限系统看成“弹个确认框”而已，
而是把权限拒绝视为会话运行态的一部分，需要进入 SDK 报告与后续逻辑。

### Step 2：解析主模型与 thinking 配置

它会决定：

- 当前主模型是什么
- thinkingConfig 是 adaptive 还是 disabled
- fallback model 是否启用

这一步发生在 QueryEngine，而不是散落在 UI 层。

说明模型选择对 Claude Code 来说是：

> **runtime decision**

而不是简单配置项。

### Step 3：获取 system prompt parts

`fetchSystemPromptParts(...)` 会产出：

- `defaultSystemPrompt`
- `userContext`
- `systemContext`

这非常关键。

很多人会把 system prompt 当成一段静态字符串。Claude Code 明显不是。
它把 prompt 分成了：

- system prompt 本体
- user context
- system context
- coordinator 附加上下文
- memory mechanics prompt（条件注入）
- appendSystemPrompt

这意味着 Claude Code 的提示词体系更像：

> **runtime-assembled prompt graph**

而不是单段文本。

### Step 4：构造 `ProcessUserInputContext`

这里会塞进：

- 当前 messages
- tools / commands / mcpClients
- app state 读写
- file history / attribution 更新器
- nested memory / discovered skills 追踪集合
- `setSDKStatus`
- `handleElicitation`

也就是说，在真正开始处理用户输入之前，Claude Code 先把“输入处理所需的一整套系统上下文”装出来。

### Step 5：调用 `processUserInput(...)`

这一步极其重要，因为它把：

- slash command
- attachments
- images
- pasted content
- meta message
- user submit hooks

统一收口了。

然后它会返回：

- `messages`
- `shouldQuery`
- `allowedTools`
- `model`
- `resultText`
- `nextInput` 等信息

也就是说，QueryEngine 在真正进入 query loop 之前，会先问一句：

> “这条输入到底是不是该进入模型主循环，还是应该被控制面截走？”

### Step 6：把用户消息持久化到 transcript

源码里有一段很工程化的注释：

如果不在进入 query loop 前就把用户消息写入 transcript，那么一旦进程在 API 返回前被杀掉，`--resume` 可能连用户刚发的这条消息都恢复不回来。

这个细节很值钱。

因为它说明 Claude Code 把“会话可恢复性”当成了底线能力，而不是锦上添花。

### Step 7：更新 permission context / main loop model

用户输入处理完以后，Claude Code 还会：

- 更新 tool permission context
- 决定 `mainLoopModel`
- 重建 `processUserInputContext`

然后才真正进入 `query(...)`。

从系统角度说，这一步的意义是：

> **输入处理不仅会产出消息，还会改写 runtime config。**

这也是为什么输入层不能简化成字符串预处理。

---

## 五、`processUserInput(...)` 的角色：输入管线，而不是字符串 parser

`processUserInput(...)` 特别值得研究，因为它解决的是 Agent 系统里常见却容易被低估的问题：

> 如何把“各种来源的输入”统一转成“可执行的会话事件”？

### 它处理的东西包括：

- 普通文本 prompt
- slash command
- pasted text / pasted image
- IDE selection
- bridge 远程消息
- meta message
- hooks 结果
- 是否 shouldQuery
- allowedTools 限制
- model / effort 改写
- nextInput 链式输入

这意味着它本质上不是 parser，而是：

> **input normalization + policy gate + control-plane router**

### 这层为什么不能少

因为在成熟 Agent runtime 里，输入不是只有一种来源：

- 用户手打
- UI 按钮生成
- slash 命令
- 自动触发任务
- bridge / remote 传入
- 工具回注的系统消息

如果没有统一输入管线，后面会很快演化成一堆 if-else 噩梦。

Claude Code 在这里的做法是对的：

- 统一处理入口
- 再决定是否进入 query
- 再决定如何更新 runtime

---

## 六、真正的主循环在 `query.ts`

### 1. `query()` 是 generator，`queryLoop()` 是 while(true) 状态机

`query()` 本身返回 `AsyncGenerator<StreamEvent | RequestStartEvent | Message | ...>`，
内部核心是 `queryLoop(...)`。

`queryLoop(...)` 的关键结构是：

- 一份 immutable params
- 一份 mutable `State`
- 一个 `while (true)` 循环
- 每轮迭代读取当前 state
- 然后不断推进

这个设计已经足够说明：

> Claude Code 不是 request/response 模型，而是 state machine 模型。

### 2. `State` 包含什么

源码里的 `State` 至少包括：

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

也就是说，一轮 turn 真正关心的状态不只是消息本身，还有：

- compact 轨迹
- error recovery 轨迹
- token 恢复轨迹
- 工具总结
- 停止钩子状态
- 轮次与转移原因

这就是成熟 runtime 和 demo agent 的分水岭。

---

## 七、query loop 每轮都在做什么

### 阶段 1：预取和准备

每轮一开始会做：

- `startRelevantMemoryPrefetch(...)`
- `startSkillDiscoveryPrefetch(...)`
- `yield { type: 'stream_request_start' }`

这很有意思。

Claude Code 的思路不是“需要 memory 时再读”，而是尽量把：

- memory prefetch
- skill discovery

隐藏到模型流式响应和工具执行的时间窗口里。

这是非常典型的 runtime latency engineering。

### 阶段 2：构造本轮 query tracking

每轮都会更新 `queryTracking`：

- `chainId`
- `depth`

也就是说 Claude Code 把多轮/多子链调用当成显式结构来追踪，而不是隐含在日志里。

### 阶段 3：上下文治理

这是 query.ts 最值得敬畏的地方之一。

它会依次处理：

- `applyToolResultBudget(...)`
- `snipCompactIfNeeded(...)`
- `microcompact(...)`
- `contextCollapse.applyCollapsesIfNeeded(...)`
- `autocompact(...)`

而且源码注释写得很清楚：
- 某些阶段是为了在进入更重的 compact 之前先做轻量治理
- 某些阶段是为了避免 server 侧错误计数
- 某些阶段是为了让 collapse 比 autocompact 更早生效

这说明 Claude Code 的上下文治理不是“想到哪里砍哪里”，而是：

> **一条分层明确、目的明确、顺序敏感的 context pipeline。**

### 阶段 4：构建 full system prompt

在这一阶段，它会把：

- `systemPrompt`
- `systemContext`

合成真正要喂给模型的 system prompt。

这一步看似普通，实际上是整个 runtime prompt 组装的最后一步。

### 阶段 5：模型采样与结果消费

这一层源码在还原文件里很长，但从结构和引用就能看出，Claude Code 同时关心：

- request start event
- stream event
- tool use summary
- max output token recovery
- fallback triggered error
- stop hooks
- token budgets

换句话说，Claude Code 不是把采样当成黑箱，而是：

> **把采样过程本身纳入 runtime 管理。**

---

## 八、工具回流：tool result 不是旁路，而是主循环的一部分

这部分是很多人最容易低估的。

Claude Code 的 tool execution 不是一个独立旁路，而是 query loop 的延长线。

### 1. `runTools(...)` 会做批分组

`toolOrchestration.ts` 会：

- 根据 `isConcurrencySafe(input)` 判断工具可否并发
- 把相邻的只读安全工具组成批次
- 并发跑安全批次
- 串行跑不安全批次

这个策略非常适合 coding agent，因为：

- 读文件/查找/grep 类工具大量存在
- 编辑/写文件/bash 之类副作用工具需要更谨慎

### 2. 工具不只是产消息，还会修改 context

源码里会收集 `contextModifier`，并在工具执行后回写 `ToolUseContext`。

这意味着工具执行的结果不仅是：
- 一条 `tool_result`

还可能是：
- 对 runtime 的结构性修改

这是一个非常重要的点。它说明：

> 工具是 runtime 中的活跃 actor，而不是纯函数。

### 3. `StreamingToolExecutor` 负责边流式到达边执行

它管理：

- 队列中的工具
- 工具状态（queued / executing / completed / yielded）
- progress message
- sibling abort
- user interruption
- streaming fallback discard
- 按收到顺序产出结果

这意味着 Claude Code 并不是等所有 tool_use 都生成完再一起处理。

它更接近：

> **边采样边执行，边执行边反馈，边反馈边推进 turn。**

这是一个真正 agent runtime 才会去做的优化。

---

## 九、为什么说 Claude Code 的 query loop 更像任务调度器而不是聊天循环

把前面的东西串起来，你会发现：

### 聊天循环通常只有：
- 输入
- 模型输出
- 展示

### Claude Code 的 query loop 有：
- 输入规范化
- policy / hooks
- transcript 持久化
- context budgeting
- compact / collapse / snip
- query tracking
- tool orchestration
- streaming execution
- interruption / fallback / recovery
- permission denial tracking
- session continuation

所以更准确的说法应该是：

> `query.ts` 是 Claude Code 的 turn scheduler / runtime dispatcher。

这也是为什么它适合 coding agent，而不只是聊天机器人。

---

## 十、`QueryConfig` 暗示的未来：可提纯的 step engine

`src/query/config.ts` 这个文件虽然不大，但注释特别有价值。

它明确说：

- 要把 immutable config 和 per-iteration state 分开
- 这样未来更容易把 step 抽成 `(state, event, config)` 的 reducer 形式

这件事特别值得注意。

因为它说明 Claude Code 的维护者已经意识到：

- 当前 query loop 很强，但也很复杂
- 如果想长期维护，必须继续朝“更可提纯的状态机结构”演化

这不是小事。

因为真正优秀的系统，往往不是一开始就抽象完美，
而是会在跑起来之后，持续为未来重构铺路。

Claude Code 这段注释就是这种“工程成熟度”的证据。

---

## 十一、给 Agent 工程的直接启发

### 启发 1：主循环必须是一等公民
不要把 agent 核心埋在 UI、API handler 或 prompt helper 里。

### 启发 2：输入处理必须独立成管线
输入不仅是文本，它是控制面入口。

### 启发 3：上下文治理必须前置
复杂 Agent 迟早会被 context 问题反噬。

### 启发 4：工具执行必须有调度层
一旦工具带副作用、并发和进度，就不能再靠简单 `switch-case`。

### 启发 5：会话持久化要在真正调用模型之前就考虑
否则 resume 迟早出问题。

### 启发 6：runtime 设计比 prompt 技巧重要得多
Claude Code 值得研究，不是因为 prompt 多巧，而是因为 runtime 足够完整。

---

## 十二、总结：QueryEngine + query.ts 才是 Claude Code 的心脏

如果只看工具列表、功能列表，Claude Code 看起来像一个“很强的开发者 CLI”。

但如果你认真拆 `QueryEngine.ts` 与 `query.ts`，你会发现它真正厉害的是：

> **它把一次 agent turn 做成了一个可治理、可恢复、可扩展、可持续推进的 runtime 过程。**

它处理的不是“文本问答”，而是：

- 输入路由
- 会话状态
- 上下文治理
- 模型采样
- 工具调度
- 错误恢复
- 会话持久化

这就是为什么 Claude Code 的 QueryEngine 值得单独写一篇。

因为它展示的是：

> **Agent Runtime 的心脏，应该长什么样。**

---

## 相关阅读

- [从源码拆解 Claude Code：一个 AI Agent CLI 的系统设计](./claude-code-source-analysis/) — 系统总览篇
