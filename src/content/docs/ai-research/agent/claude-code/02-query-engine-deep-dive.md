---
title: "Claude Code 深读（二）：QueryEngine 与 query.ts 如何驱动 Agent Runtime"
description: "逐行拆解 Claude Code 的 QueryEngine、query.ts 状态机、三级压缩体系、API 集成与输入处理管线。"
date: "2026-03-31"
---

# Claude Code 深读（二）：QueryEngine 与 query.ts 如何驱动 Agent Runtime

:::note[系列导航]
1. [系统总览与启动序列](../01-source-analysis/) — 入口、全局状态、模块依赖
2. **QueryEngine 与 query.ts**（本文）— 会话主循环、上下文压缩、API 集成
3. [Tool 协议、权限系统与工具调度](../03-tools-permissions-orchestration/) — 工具协议、23 种攻击检测
4. [Skills/Commands/MCP 注入 Runtime](../04-runtime-injection-skills-commands-mcp/) — 能力加载、MCP transport
5. [Anthropic 内部如何使用 Skills](../05-skills-lessons/) — 官方实践
6. [源码泄漏深度技术解读](../06-source-leak-deep-analysis/) — 全景式硬核分析
:::

---

## 一、为什么要单独写 QueryEngine

在很多 Agent 系统里，"主循环"会被埋在 UI 组件、HTTP handler 或某个 `ask()` 函数里。Claude Code 的做法是把这部分硬生生拔出来，做成两个文件：

- `QueryEngine.ts`（1295 行）：对外会话内核
- `query.ts`（1729 行）：真正的 query loop 状态机

如果说第一篇讲的是"Claude Code 的城市地图"，这一篇讲的是：**电流是怎么流的**。

---

## 二、`QueryEngine`：conversation-scoped runtime object

### 2.1 核心实例字段（行 184-198）

```typescript
export class QueryEngine {
  private mutableMessages: Message[]              // 会话消息（跨 turn 持续）
  private abortController: AbortController        // 取消控制器
  private permissionDenials: SDKPermissionDenial[] // 权限拒绝历史（累积）
  private totalUsage: NonNullableUsage            // token 使用量（累积）
  private readFileState: FileStateCache           // 文件读取缓存（复用）
  private discoveredSkillNames = new Set<string>() // 已发现的技能（不重复搜索）
  private loadedNestedMemoryPaths = new Set<string>() // 已加载的嵌套记忆路径
}
```

这不是一个无状态 helper——coding agent 真正麻烦的点是会话持续性：前几轮消息要留着、权限历史要累计、read file cache 要复用、usage/budget 要累积。

### 2.2 `submitMessage()` 是会话级 API（行 209-212）

```typescript
async *submitMessage(
  prompt: string | ContentBlockParam[],
  options?: { uuid?: string; isMeta?: boolean },
): AsyncGenerator<SDKMessage, void, unknown>
```

返回 `AsyncGenerator<SDKMessage>`——面向的不是"文本 completion"，而是**一轮会话推进的事件流接口**。

---

## 三、一次 `submitMessage()` 到底做了什么

### Step 1：包装权限追踪

一开始把 `canUseTool` 包一层，用来收集 `permissionDenials`。权限拒绝不只是"弹个确认框"，而是会话运行态的一部分，需要进入 SDK 报告。

### Step 2：解析模型与 thinking 配置

决定当前主模型、thinkingConfig（adaptive / disabled）、fallback model。这发生在 QueryEngine 而不是 UI 层——模型选择是 **runtime decision**。

### Step 3：获取系统提示（`fetchSystemPromptParts`）

来自 `utils/queryContext.ts`（行 44-74）：

```typescript
export async function fetchSystemPromptParts({
  tools, mainLoopModel, additionalWorkingDirectories, mcpClients, customSystemPrompt,
}): Promise<{
  defaultSystemPrompt: string[]
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
}>
```

系统提示不是单段文本，而是 **runtime-assembled prompt graph**：system prompt 本体 + user context + system context + coordinator 附加 + memory mechanics prompt + appendSystemPrompt。

### Step 4：构造 `ProcessUserInputContext`

塞入当前 messages、tools/commands/mcpClients、app state 读写、file history、nested memory/discovered skills 追踪集合、`handleElicitation` 等——在处理输入之前先把"输入处理所需的一整套系统上下文"装出来。

### Step 5：调用 `processUserInput(...)`

这一步收口了 slash command、attachments、images、pasted content、meta message、user submit hooks，然后返回：

```typescript
export type ProcessUserInputBaseResult = {
  messages: (UserMessage | AssistantMessage | AttachmentMessage | SystemMessage | ProgressMessage)[]
  shouldQuery: boolean        // 是否进入模型主循环
  allowedTools?: string[]     // 工具白名单覆写
  model?: string              // 模型覆写
  effort?: EffortValue        // 推理力度覆写
  resultText?: string
  nextInput?: string          // 链式输入
  submitNextInput?: boolean
}
```

QueryEngine 在进入 query loop 之前会问：**"这条输入该进入模型主循环，还是被控制面截走？"**

### Step 6：transcript 持久化

源码有一段注释：如果不在进入 query loop 前就把用户消息写入 transcript，一旦进程在 API 返回前被杀掉，`--resume` 可能连用户刚发的消息都恢复不回来。**会话可恢复性**是底线能力。

### Step 7：更新 permission context / main loop model

输入处理完后还会更新 `toolPermissionContext` 和 `mainLoopModel`——**输入处理不仅产出消息，还会改写 runtime config**。

---

## 四、`processUserInput(...)`：输入管线

位于 `utils/processUserInput/processUserInput.ts`（行 85-140），签名：

```typescript
export async function processUserInput({
  input,                    // string | ContentBlockParam[]
  preExpansionInput,
  mode,                     // PromptInputMode
  setToolJSX,
  context,                  // ProcessUserInputContext
  pastedContents,
  ideSelection,             // IDE 选区
  messages,
  uuid,
  isAlreadyProcessing,
  querySource,
  canUseTool,
  skipSlashCommands,
  bridgeOrigin,             // 是否来自 bridge
  isMeta,
  skipAttachments,
}): Promise<ProcessUserInputBaseResult>
```

它处理的输入来源：普通文本、slash command、pasted text/image、IDE selection、bridge 远程消息、meta message、hooks 结果。

本质上不是 parser，而是 **input normalization + policy gate + control-plane router**。

---

## 五、真正的主循环在 `query.ts`

### 5.1 `query()` 函数签名（行 219-239）

```typescript
export async function* query(
  params: QueryParams,
): AsyncGenerator<
  | StreamEvent
  | RequestStartEvent
  | Message
  | TombstoneMessage
  | ToolUseSummaryMessage,
  Terminal
>
```

### 5.2 `QueryParams` 类型（行 181-199）

```typescript
export type QueryParams = {
  messages: Message[]
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  canUseTool: CanUseToolFn
  toolUseContext: ToolUseContext
  fallbackModel?: string
  querySource: QuerySource
  maxOutputTokensOverride?: number
  maxTurns?: number
  skipCacheWrite?: boolean
  taskBudget?: { total: number }
  deps?: QueryDeps
}
```

### 5.3 `queryLoop()` 的 `State` 类型（行 204-217）

```typescript
type State = {
  messages: Message[]
  toolUseContext: ToolUseContext
  autoCompactTracking: AutoCompactTrackingState | undefined
  maxOutputTokensRecoveryCount: number
  hasAttemptedReactiveCompact: boolean
  maxOutputTokensOverride: number | undefined
  pendingToolUseSummary: Promise<ToolUseSummaryMessage | null> | undefined
  stopHookActive: boolean | undefined
  turnCount: number
  transition: Continue | undefined
}
```

一轮 turn 关心的不只是消息本身，还有：compact 轨迹、error recovery 轨迹、token 恢复轨迹、工具总结 Promise、停止钩子状态、轮次计数与转移原因。

### 5.4 依赖注入（`query/deps.ts`，行 21-31）

```typescript
export type QueryDeps = {
  callModel: typeof queryModelWithStreaming
  microcompact: typeof microcompactMessages
  autocompact: typeof autoCompactIfNeeded
  uuid: () => string
}
```

生产用 `productionDeps()`，测试注入 mock。简洁务实的 DI，没用 IoC 容器。

### 5.5 `QueryConfig`（`query/config.ts`，行 15-27）

```typescript
export type QueryConfig = {
  sessionId: SessionId
  gates: {
    streamingToolExecution: boolean
    emitToolUseSummaries: boolean
    isAnt: boolean
    fastModeEnabled: boolean
  }
}
```

注释明确说：要把 immutable config 和 per-iteration state 分开，未来更容易提纯成 `(state, event, config)` reducer。**维护者在为未来重构铺路。**

---

## 六、while(true) 循环每轮做什么

`queryLoop()` 行 307 进入 `while (true)`，每轮操作按顺序（行 307-427）：

```text
1. yield { type: 'stream_request_start' }                    // 行 337
2. queryCheckpoint('query_fn_entry')                          // 行 339
3. 初始化 queryTracking (chainId, depth)                      // 行 346-355
4. applyToolResultBudget(messages, toolUseContext)            // 行 365-394
5. snipModule.snipCompactIfNeeded(messages, ...)              // 行 400-410（HISTORY_SNIP feature）
6. deps.microcompact(messages, toolUseContext, querySource)   // 行 413-426
7. contextCollapse.applyCollapsesIfNeeded(messages, ...)      // 行 440-447
8. deps.autocompact(messages, toolUseContext, ...)            // 行 453-468
9. 构建 full system prompt
10. deps.callModel() → queryModelWithStreaming()               // 行 554
11. 处理 assistant message + tool_use blocks
12. runTools() / StreamingToolExecutor                         // 工具执行
13. 状态转移判断
```

### 状态转移类型（Continue Sites）

`query.ts` 有 4 种 `continue` 站点，每个代表不同的重试/恢复场景：

| 转移标签 | 行号 | 触发条件 |
|---------|------|---------|
| `collapse_drain_retry` | 1115 | context collapse 排水后重试 |
| `reactive_compact_retry` | 1165 | 遇到 `prompt_too_long` 后触发压缩重试 |
| `max_output_tokens_escalate` | 1220 | 升级到更高的 max_tokens |
| `max_output_tokens_recovery` | 1250 | 发送恢复消息让模型继续 |

---

## 七、三级上下文压缩体系

面对有限的上下文窗口（即使是 1M context），长时间编码会话必然需要压缩。Claude Code 设计了三级压缩：

### 7.1 第一级：Microcompact（每轮微压缩）

`services/compact/microCompact.ts`（行 253-293）在每次 API 调用前执行。

**可压缩的工具**（`COMPACTABLE_TOOLS`，行 41-50）：

```typescript
const COMPACTABLE_TOOLS = new Set([
  FILE_READ_TOOL_NAME,
  ...SHELL_TOOL_NAMES,       // Bash 及相关
  GREP_TOOL_NAME,
  GLOB_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
])
```

**两条压缩路径**：

1. **基于时间的清理**（`TIME_BASED_MC`）：超过阈值的旧工具结果替换为 `'[Old tool result content cleared]'`
2. **缓存感知压缩**（`CACHED_MICROCOMPACT`）：利用 prompt cache 断点检测，只重发必要的编辑

```typescript
export async function microcompactMessages(
  messages: Message[],
  toolUseContext?: ToolUseContext,
  querySource?: QuerySource,
): Promise<MicrocompactResult>

// MicrocompactResult:
{ messages: Message[], compactionInfo?: { pendingCacheEdits?: PendingCacheEdits } }
```

### 7.2 第二级：Auto-Compact（自动全量压缩）

`services/compact/autoCompact.ts`（行 241-252）在 token 接近上限时触发。

**关键常量**：

```typescript
MAX_OUTPUT_TOKENS_FOR_SUMMARY   = 20_000   // 行 30，为压缩输出预留
AUTOCOMPACT_BUFFER_TOKENS       = 13_000   // 行 62，触发缓冲
WARNING_THRESHOLD_BUFFER_TOKENS = 20_000   // 行 63，黄色警告
ERROR_THRESHOLD_BUFFER_TOKENS   = 20_000   // 行 64，红色警告
MANUAL_COMPACT_BUFFER_TOKENS    = 3_000    // 行 65，手动 /compact
MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3   // 行 70，熔断器
```

**触发条件**：

```text
tokenCount > (contextWindow - MAX_OUTPUT_TOKENS - AUTOCOMPACT_BUFFER_TOKENS)
```

**执行流程**：

1. 先尝试 **Session Memory Compaction**（轻量级，优先）
2. 失败则触发**完整对话摘要**
3. 剥离图片（避免摘要时 prompt too long）
4. 按 API 轮次分组消息（`groupMessagesByApiRound()`）
5. 调用 Claude 生成对话摘要（预留 `MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000`）
6. 恢复关键文件（最多 5 个文件，每个 5KB）
7. 恢复技能内容（25KB 预算）
8. 执行 PostCompact hooks
9. 插入压缩边界消息

**熔断器设计**：连续 3 次压缩失败后停止尝试，避免死循环。

```typescript
export type AutoCompactTrackingState = {
  compacted: boolean
  turnCounter: number
  turnId: string
  consecutiveFailures?: number
}
```

### 7.3 第三级：手动 `/compact` 命令

缓冲区更小（`MANUAL_COMPACT_BUFFER_TOKENS = 3_000`），由用户显式触发。

### 7.4 Token 预警系统

```typescript
calculateTokenWarningState(tokenUsage, model) → {
  percentLeft,
  isAboveWarningThreshold,       // 黄色警告
  isAboveErrorThreshold,          // 红色警告
  isAboveAutoCompactThreshold,    // 触发自动压缩
  isAtBlockingLimit               // 阻止继续
}
```

### 7.5 Token 预算追踪（`query/tokenBudget.ts`）

```typescript
COMPLETION_THRESHOLD  = 0.9    // 使用 90% 预算时停止
DIMINISHING_THRESHOLD = 500    // 连续 3 轮产出 < 500 token 判定为收益递减
```

检测到收益递减（agent 在原地打转）时主动停止，而不是浪费剩余预算。

---

## 八、API 集成

### 8.1 `queryModelWithStreaming()`（`services/api/claude.ts`，行 752-779）

```typescript
export async function* queryModelWithStreaming({
  messages, systemPrompt, thinkingConfig, tools, signal, options,
}): AsyncGenerator<StreamEvent | AssistantMessage | SystemAPIErrorMessage, void>
```

### 8.2 `Options` 类型（行 676-707）

```typescript
export type Options = {
  getToolPermissionContext: () => Promise<ToolPermissionContext>
  model: string
  toolChoice?: BetaToolChoiceTool | BetaToolChoiceAuto
  isNonInteractiveSession: boolean
  maxOutputTokensOverride?: number
  fallbackModel?: string
  querySource: QuerySource
  agents: AgentDefinition[]
  enablePromptCaching?: boolean
  skipCacheWrite?: boolean
  effortValue?: EffortValue
  mcpTools: Tools
  queryTracking?: QueryChainTracking
  fastMode?: boolean
  advisorModel?: string
  taskBudget?: { total: number; remaining?: number }
  // ... extraToolSchemas, temperatureOverride, outputFormat, agentId 等
}
```

### 8.3 API 请求结构（`paramsFromContext()`，行 1699-1728）

```typescript
const params = {
  model: normalizedModelString,
  messages: messagesWithCacheBreakpoints,
  system: systemPromptBlocks,
  tools: allToolSchemas,
  tool_choice: toolChoice,
  betas: mergedBetaHeaders,        // 18 个 beta header
  metadata: apiMetadata,
  max_tokens: maxOutputTokens,
  thinking: thinkingConfig,
  temperature: temperatureValue,
  context_management: {             // 上下文管理 API
    // ... 由 CONTEXT_MANAGEMENT_BETA_HEADER 启用
  },
  speed: fastModeSpeed,            // FAST_MODE_BETA_HEADER
}
```

### 8.4 Prompt Caching

- 标准缓存：`getCacheControl()` 为消息添加 `cache_control` 标记
- 1 小时 TTL 缓存：`should1hCacheTTL()` 基于 `querySource` 决定
- **防缓存抖动**：`systemPromptSection()` 创建 memoized 的提示段落，只在 `/clear` 或 `/compact` 时失效。对于频繁变化的部分（如日期），使用 `DANGEROUS_uncachedSystemPromptSection()` 并在命名中标记危险性

### 8.5 自动重试与 Reactive Compact

- **指数退避重试**：`withRetry()` 封装
- **Reactive Compact**：遇到 `prompt_too_long` 错误时，`query.ts` 在 `reactive_compact_retry` 站点自动触发压缩后重试
- **Fallback Model**：主模型失败时可降级到 fallback model

---

## 九、工具回流机制

工具执行不是旁路，而是 query loop 的延长线。

### 9.1 `runTools(...)` 的批分组

`toolOrchestration.ts` 会根据 `isConcurrencySafe(input)` 判断工具可否并发，把连续的只读安全工具组成批次并发跑、副作用工具串行跑。

### 9.2 工具不只产消息，还修改 context

工具执行后收集 `contextModifier`，回写 `ToolUseContext`。工具执行的结果不仅是一条 `tool_result`，还可能是对 runtime 的结构性修改。

### 9.3 `StreamingToolExecutor`

管理边流式到达边执行：

- 工具状态：`'queued'` | `'executing'` | `'completed'` | `'yielded'`
- progress 消息提前吐出
- sibling abort（Bash 出错时取消兄弟工具）
- user interruption 处理
- streaming fallback discard
- 按接收顺序产出结果

详细分析见[第三篇](../03-tools-permissions-orchestration/)。

---

## 十、上下文治理管线总结

把压缩和预算机制串起来，Claude Code 的上下文治理是一条**分层明确、顺序敏感的 pipeline**：

```text
┌─────────────────────────────────────────────────┐
│              每轮 API 调用前                      │
├─────────────────────────────────────────────────┤
│ 1. applyToolResultBudget()                      │  ← 单条结果大小裁剪
│ 2. snipCompactIfNeeded()                        │  ← HISTORY_SNIP 片段裁剪
│ 3. microcompact()                               │  ← 旧工具结果清理
│ 4. contextCollapse.applyCollapsesIfNeeded()      │  ← 上下文折叠
│ 5. autocompact()                                │  ← 全量压缩（仅在超限时）
├─────────────────────────────────────────────────┤
│              API 调用后                          │
├─────────────────────────────────────────────────┤
│ 6. reactive compact（遇 prompt_too_long 时）     │  ← 紧急压缩重试
│ 7. max_output_tokens recovery                   │  ← token 限制恢复
├─────────────────────────────────────────────────┤
│              跨轮                                │
├─────────────────────────────────────────────────┤
│ 8. token budget tracking                        │  ← 预算耗尽 / 收益递减检测
│ 9. circuit breaker (3 次失败后停止 autocompact)  │  ← 熔断保护
└─────────────────────────────────────────────────┘
```

---

## 十一、给 Agent 工程的启发

1. **主循环必须是一等公民** — 不要把 agent 核心埋在 UI 或 API handler 里
2. **输入处理必须独立成管线** — 输入不仅是文本，它是控制面入口
3. **上下文治理必须前置** — 复杂 Agent 迟早被 context 问题反噬
4. **工具执行必须有调度层** — 一旦工具带副作用、并发和进度，就不能靠简单 switch-case
5. **会话持久化要在调用模型之前就做** — 否则 resume 迟早出问题
6. **把 immutable config 和 mutable state 分开** — 为未来的 `(state, event, config)` reducer 铺路
