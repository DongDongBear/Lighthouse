---
title: Claude Code 深读（三）：Tool 协议、权限系统与工具调度
description: 详细拆解 Claude Code 的 Tool.ts、tools.ts、toolOrchestration.ts 与 StreamingToolExecutor，理解它如何把工具做成一个可治理的执行平面。
date: 2026-03-31
---

# Claude Code 深读（三）：Tool 协议、权限系统与工具调度

> 这是 Claude Code 系列的第三篇。前两篇分别讨论了系统总览与 QueryEngine / query.ts。这一篇只盯一条主线：**Claude Code 如何把 tool use 做成一个真正的执行平面**。

## 一、为什么工具系统是 Claude Code 的半条命

如果没有工具，Claude Code 只是一个强一点的终端聊天器。

它真正与普通聊天 CLI 拉开距离的地方在于：

- 本地文件操作
- shell / bash
- grep / glob / web fetch
- task / agent / message / worktree
- MCP tool / MCP resource
- skill 驱动工具调用
- runtime 内的权限治理与并发调度

所以 Claude Code 的强，不只是“会调用工具”，而是：

> **它把工具做成了 runtime 的正式执行平面。**

---

## 二、`Tool.ts`：Claude Code 的工具不是函数，而是协议对象

### 1. 工具协议先于工具实现

很多项目的工具系统长这样：

```ts
if (tool.name === 'read_file') ...
if (tool.name === 'bash') ...
```

Claude Code 不是。它先定义了一整套工具协议，包括：

- `ToolInputJSONSchema`
- `ToolUseContext`
- `ToolPermissionContext`
- `ValidationResult`
- progress 事件类型
- 与 app state / sdk status / messages / attribution / file history 的接缝

这说明 Claude Code 的工具系统不是“随便组织一堆 handler”，而是：

> **一套 runtime-level execution contract**

### 2. `ToolUseContext` 为什么这么厚

从源码看，`ToolUseContext` 至少包含：

- commands / tools / mcpClients / mcpResources
- thinkingConfig / mainLoopModel
- getAppState / setAppState
- handleElicitation
- setToolJSX / addNotification / appendSystemMessage
- sendOSNotification
- nested memory / dynamic skill / discovered skill 跟踪
- in-progress tool ids
- response length / stream mode / sdk status
- file history / attribution / conversation id
- tool decisions / fileReadingLimits / globLimits

很多人第一次看到会觉得它“太厚了”。

但从系统角度，它其实非常合理，因为工具在 Claude Code 里不是一个“离线纯函数”，而是：

- 可能读写 runtime 状态
- 可能触发 UI
- 可能触发通知
- 可能修改权限上下文
- 可能需要与消息流合并
- 可能引入新的 skill / memory / tool visibility

换句话说：

> 工具在 Claude Code 里是 **session-aware actors**，不是 stateless helpers。

### 3. 这是成熟 Agent Runtime 必然会走到的方向

只要你的系统有：
- 文件系统
- shell
- 网络
- 权限确认
- tool progress
- resume / replay

你迟早会发现，工具需要看到的不只是 input，而是整个运行时环境。

Claude Code 只是很早把这件事做明白了。

---

## 三、权限系统不是外挂，而是工具协议的一部分

`ToolPermissionContext` 的存在非常关键。

### 1. 权限上下文里包含什么

源码里可以看到它至少持有：

- `mode`
- `additionalWorkingDirectories`
- `alwaysAllowRules`
- `alwaysDenyRules`
- `alwaysAskRules`
- `isBypassPermissionsModeAvailable`
- `isAutoModeAvailable`
- `strippedDangerousRules`
- `shouldAvoidPermissionPrompts`
- `awaitAutomatedChecksBeforeDialog`
- `prePlanMode`

这说明 Claude Code 不是“工具执行前弹个确认框”那么简单，而是：

> **把权限模型做成了 runtime state machine 的一部分。**

### 2. 为什么这点很重要

在真实 agent 场景里，权限不是单次判断问题，而是：

- 当前 mode 是什么
- 某些路径是不是额外允许的 working dir
- 某类工具是不是永远 allow / deny / ask
- coordinator / background worker 能不能展示 UI
- auto mode 下危险规则是不是要剥离
- plan mode 前后的权限是不是要恢复

这些都不是“一个 boolean canRun”能解决的。

Claude Code 在这里的设计说明了一件事：

> 复杂 agent 的权限系统，本质上是一个 **多状态、多规则、多来源的策略上下文**。

### 3. 权限与工具执行是强耦合而非旁路关系

在 QueryEngine 里，`canUseTool` 会被包装以记录 permission denials；在工具协议里，permission context 又是工具上下文的一部分。

这说明权限判断与工具执行不是两条线，而是一条线的不同节点。

这也是它在 SDK reporting、resume、用户可见状态里都能保持一致的原因。

---

## 四、`tools.ts`：它不是一个 import 列表，而是能力表

### 1. `getAllBaseTools()` 是“执行平面的注册中心”

`tools.ts` 里注册的工具包括：

- `AgentTool`
- `BashTool`
- `FileReadTool`
- `FileEditTool`
- `FileWriteTool`
- `GlobTool`
- `GrepTool`
- `WebFetchTool`
- `WebSearchTool`
- `AskUserQuestionTool`
- `SkillTool`
- `TodoWriteTool`
- `TaskCreateTool` / `TaskGetTool` / `TaskUpdateTool` / `TaskListTool`
- `ListMcpResourcesTool`
- `ReadMcpResourceTool`
- `ToolSearchTool`
- `EnterPlanModeTool`
- `EnterWorktreeTool` / `ExitWorktreeTool`
- `SendMessageTool`
- `WorkflowTool`
- `SleepTool`
- `MonitorTool`
- `WebBrowserTool`
- `REPLTool`（部分模式下）

这些名字本身就说明 Claude Code 的边界非常清晰：

> 它的目标不是“回答问题”，而是“完成工作”。

### 2. 工具可见性是动态计算的

不是所有工具都默认出现，而是会受到：

- feature gate
- env flag
- worktree mode
- todo v2
- browser / workflow / proactive 模式
- embedded tools 是否存在

等条件影响。

这说明工具系统不是静态常量，而是：

> **按当前 runtime 组装出的 capability set**

### 3. 这对 Agent 系统设计的启发

如果你要做自己的 runtime，最好别把工具列表写死在 prompt 拼接逻辑里。

更好的做法是像 Claude Code 这样：

- 统一注册
- 条件启用
- 统一命名
- 统一过滤
- 统一权限裁剪

---

## 五、真正的执行策略在 `toolOrchestration.ts`

### 1. 工具调度不是“顺序遍历执行”

`runTools(...)` 的设计很值得学习。它会：

1. 读取模型产出的 `tool_use` blocks
2. 根据每个工具的 `isConcurrencySafe(input)` 判断是否能并发
3. 把连续的并发安全工具归成一批
4. 对安全批次并发执行
5. 对不安全批次串行执行
6. 收集 `contextModifier` 并在批次后统一回写 context

这说明 Claude Code 的工具调度层已经具备：

- concurrency model
- execution batching
- order preservation
- context mutation control

它不是“for 循环调函数”，而是一个真正的 **tool scheduler**。

### 2. 为什么 `isConcurrencySafe` 很聪明

这点特别值得抄。

Claude Code 没有在调度器里写死：
- 哪些工具能并发
- 哪些工具不能并发

而是让工具自己声明：

```text
给定当前 input，我是否 concurrency-safe？
```

这比纯按工具名分类强得多，因为：

- 同一个工具在不同输入下风险不同
- 有些工具虽然通常只读，但某些参数组合可能带副作用
- 工具自身最了解自己的并发边界

这是一个非常成熟的责任划分。

### 3. `contextModifier` 暗示工具不只是产出文本

`runTools(...)` 会把工具执行过程中产生的 `contextModifier` 收集起来，并修改 `currentContext`。

这件事很重要，因为它说明工具执行的后果不只是：

- 生成一条 `tool_result`

还可能是：
- 改变 runtime context
- 改变后续工具可见性或行为
- 改变消息流的解释环境

这就是为什么 Claude Code 的工具不是“RPC 调用”，而是 **runtime actors**。

---

## 六、`StreamingToolExecutor`：为什么它是 Claude Code 很强的一块肌肉

### 1. 它解决的是“流式工具执行”问题

在很多系统里，模型输出完整 assistant message 后，再统一扫一遍 tool_use 并执行。

Claude Code 明显在往更高级的路径走：

> **工具随着流式消息到达就可以进入执行态。**

`StreamingToolExecutor` 管的东西很多：

- tool queue
- tool status（queued / executing / completed / yielded）
- progress message
- sibling abort
- user interruption
- streaming fallback discard
- 结果顺序保持

### 2. 为什么这很难

因为一旦工具流式执行，就必须同时解决：

- 哪些工具可以先跑
- 哪些工具必须等前一个完成
- 用户中途打断怎么办
- 某个 Bash/tool 出错是否要终止兄弟工具
- fallback 后已执行的工具结果要不要丢弃
- progress 要何时显示、以什么顺序显示

这些问题，几乎都不是 function calling demo 会涉及的。

Claude Code 在这里说明：

> 它把工具执行当成了一个 **带并发、取消、顺序与错误传播的调度问题**。

### 3. 这对 coding agent 至关重要

coding agent 很多时候会同时需要：

- 查文件
- grep
- list dirs
- read resources

这些读型操作明明可以并发。

但：
- edit
- bash
- write
- side-effect heavy commands

又必须谨慎串行。

Claude Code 的这个模型恰好切中了生产级 coding agent 的痛点。

---

## 七、为什么说 Claude Code 的工具层像“执行平面”而不是“工具插件”

把这几层串起来看：

- `Tool.ts` 定义协议
- `ToolPermissionContext` 定义治理模型
- `tools.ts` 统一注册能力
- `toolOrchestration.ts` 负责批次与并发
- `StreamingToolExecutor.ts` 负责执行时序与中断

你会发现 Claude Code 的工具层本质上已经接近：

> **execution plane / capability plane**

它和“插件系统”最大的区别是：

### 插件系统通常只解决：
- 怎么挂进去
- 怎么被发现
- 怎么被调用

### 执行平面必须解决：
- 调用协议
- 权限模型
- 并发策略
- 状态传播
- 错误传播
- UI 进度
- 顺序语义
- resume / transcript / session 兼容

Claude Code 明显是后者。

---

## 八、这套设计给 Agent 工程的直接启发

### 启发 1：先定义 Tool 协议，再写 Tool 实现

### 启发 2：权限系统必须进入 Tool Context，而不是外插

### 启发 3：工具注册中心应该与工具实现解耦

### 启发 4：并发能力应该由工具声明，而不是调度器硬编码

### 启发 5：流式工具执行是高阶能力，但一旦做成，体验会拉开差距

### 启发 6：工具不是 plugin callback，而是 runtime actors

---

## 九、总结

Claude Code 的工具系统之所以强，不在于它“工具多”，而在于它已经完成了三层跨越：

1. 从 **工具函数** 到 **工具协议**
2. 从 **工具列表** 到 **能力平面**
3. 从 **串行调用** 到 **可治理的执行调度系统**

这就是为什么它值得源码级深读。

因为它真正展示的是：

> **复杂 Agent 的工具层，应该如何被系统化。**

---

## 相关阅读

- [从源码拆解 Claude Code：一个 AI Agent CLI 的系统设计](./claude-code-source-analysis/)
- [Claude Code 深读（二）：QueryEngine 与 query.ts 如何驱动一个 Agent Runtime](./claude-code-query-engine-deep-dive/)
