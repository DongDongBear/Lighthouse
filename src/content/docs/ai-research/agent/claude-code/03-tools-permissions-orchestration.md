---
title: "Claude Code 深读（三）：Tool 协议、权限系统与工具调度"
description: "逐行拆解 Claude Code 的 Tool.ts 协议、23 种 Bash 攻击检测、6 层权限管道、并发调度与 StreamingToolExecutor。"
date: "2026-03-31"
---

# Claude Code 深读（三）：Tool 协议、权限系统与工具调度

:::note[系列导航]
1. [系统总览与启动序列](../01-source-analysis/) — 入口、全局状态、模块依赖
2. [QueryEngine 与 query.ts](../02-query-engine-deep-dive/) — 会话主循环、上下文压缩
3. **Tool 协议、权限系统与工具调度**（本文）— 工具协议、23 种攻击检测、并发调度
4. [Skills/Commands/MCP 注入 Runtime](../04-runtime-injection-skills-commands-mcp/) — 能力加载、MCP transport
5. [Anthropic 内部如何使用 Skills](../05-skills-lessons/) — 官方实践
6. [源码泄漏深度技术解读](../06-source-leak-deep-analysis/) — 全景式硬核分析
:::

---

## 一、`Tool.ts`（793 行）：工具不是函数，而是协议对象

### 1.1 Tool 类型定义（行 362-695）

Claude Code 先定义了一整套工具协议，再写实现。`Tool<Input, Output, P>` 的关键字段和方法：

```typescript
export type Tool<Input, Output, P extends ToolProgressData> = {
  // 核心
  readonly name: string
  call(args, context: ToolUseContext, canUseTool, parentMessage, onProgress?): Promise<ToolResult<Output>>
  description(input, options): Promise<string>
  prompt(options): Promise<string>

  // Schema
  readonly inputSchema: Input                  // Zod schema
  readonly inputJSONSchema?: ToolInputJSONSchema // JSON Schema（给 API）

  // 能力标记
  isEnabled(): boolean
  isConcurrencySafe(input): boolean            // 能否并发（默认 false）
  isReadOnly(input): boolean                   // 是否只读（默认 false）
  isDestructive?(input): boolean               // 是否有破坏性（默认 false）
  interruptBehavior?(): 'cancel' | 'block'     // 中断时取消还是阻塞

  // 权限
  validateInput?(input, context): Promise<ValidationResult>
  checkPermissions(input, context): Promise<PermissionResult>
  getPath?(input): string                      // 提取操作路径
  preparePermissionMatcher?(input): Promise<(pattern: string) => boolean>

  // 搜索 & 懒加载
  searchHint?: string
  readonly shouldDefer?: boolean               // 是否延迟加载
  readonly alwaysLoad?: boolean                // 是否始终加载

  // MCP
  isMcp?: boolean
  mcpInfo?: { serverName: string; toolName: string }

  // 大小限制
  maxResultSizeChars: number

  // UI 渲染（React/Ink）
  renderToolUseMessage(input): React.ReactNode
  renderToolResultMessage?(output): React.ReactNode
  renderToolUseProgressMessage?(data): React.ReactNode
  renderToolUseQueuedMessage?(): React.ReactNode
  renderToolUseRejectedMessage?(reason): React.ReactNode
  renderToolUseErrorMessage?(error): React.ReactNode

  // 分析 & 分类
  toAutoClassifierInput(input): unknown        // 给 auto-mode 分类器
  getToolUseSummary?(input, output): string | null
  getActivityDescription?(input): string | null
}
```

### 1.2 `buildTool()`（行 783-792）

构建器模式创建工具，应用 `TOOL_DEFAULTS`（行 757-769）：

```typescript
// 默认值
isEnabled → true
isConcurrencySafe → false      // 默认不安全
isReadOnly → false
isDestructive → false
checkPermissions → { behavior: 'allow', updatedInput }
toAutoClassifierInput → ''
userFacingName → name
```

### 1.3 `ToolUseContext`（行 158-300）

这个类型很厚，因为工具在 Claude Code 里不是"离线纯函数"，而是 **session-aware actor**：

```typescript
export type ToolUseContext = {
  options: {
    commands: Command[]
    tools: Tools
    mcpClients: MCPServerConnection[]
    mcpResources: MCPResource[]
    thinkingConfig: ThinkingConfig
    mainLoopModel: string
  }
  abortController: AbortController
  readFileState: FileStateCache
  getAppState: () => AppState
  setAppState: (f: (prev: AppState) => AppState) => void
  handleElicitation: (url: string) => Promise<boolean>
  setToolJSX: SetToolJSXFn           // UI 渲染回调
  messages: Message[]                 // 当前对话历史
  addNotification: (notif: Notification) => void
  appendSystemMessage: (msg: string) => void
  sendOSNotification: (title: string, body: string) => void
  setSDKStatus: (status: SDKStatus) => void
  updateFileHistoryState: (path: string, state: FileState) => void
  updateAttributionState: (attr: Attribution) => void
  toolDecisions: Map<string, ToolDecision>
  loadedNestedMemoryPaths: Set<string>
  discoveredSkillNames: Set<string>
  inProgressToolUseIds: Set<string>
  responseLength: number
  // ... 以及 fileReadingLimits, globLimits, conversationId, agentId 等
}
```

### 1.4 `ToolPermissionContext`（行 123-138）

使用 `DeepImmutable` 防止运行时意外修改：

```typescript
export type ToolPermissionContext = DeepImmutable<{
  mode: PermissionMode
  additionalWorkingDirectories: Map<string, AdditionalWorkingDirectory>
  alwaysAllowRules: ToolPermissionRulesBySource
  alwaysDenyRules: ToolPermissionRulesBySource
  alwaysAskRules: ToolPermissionRulesBySource
  isBypassPermissionsModeAvailable: boolean
  isAutoModeAvailable?: boolean
  strippedDangerousRules?: ToolPermissionRulesBySource   // auto mode 剥离的危险规则
  shouldAvoidPermissionPrompts?: boolean                  // 后台 agent 不弹框
  awaitAutomatedChecksBeforeDialog?: boolean
  prePlanMode?: PermissionMode                           // plan mode 前的原始模式
}>
```

---

## 二、权限系统：多状态策略上下文

### 2.1 权限模式（`types/permissions.ts`，行 16-39）

```typescript
// 5 个外部模式 + 2 个内部模式
export type PermissionMode = 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions' | 'dontAsk' | 'auto' | 'bubble'
```

| 模式 | 说明 |
|------|------|
| `default` | 标准模式，敏感操作需确认 |
| `plan` | 规划模式，限制操作范围 |
| `acceptEdits` | 自动接受工作目录内的文件编辑 |
| `bypassPermissions` | 绕过权限检查（高风险） |
| `dontAsk` | 不询问直接拒绝 |
| `auto` | ML 分类器自动判断（仅 `ant`） |
| `bubble` | 权限冒泡到 leader（进程内 teammate） |

### 2.2 权限规则类型

```typescript
type PermissionRule = {
  source: PermissionRuleSource      // 来源
  ruleBehavior: PermissionBehavior  // 'allow' | 'deny' | 'ask'
  ruleValue: PermissionRuleValue    // 工具名 + 可选内容模式
}

type PermissionRuleSource = 
  'policySettings' | 'flagSettings' | 'projectSettings' | 'userSettings' 
  | 'localSettings' | 'cliArg' | 'command' | 'session'
```

**优先级从高到低**：policySettings → flagSettings → projectSettings → userSettings → localSettings → command → session

### 2.3 权限决策管道（10 步）

`utils/permissions/permissions.ts`（行 473-956）的 `hasPermissionsToUseTool` 实现完整管道：

```text
1a. 整个工具被 deny 规则禁止 → deny
1b. 整个工具有 ask 规则 → ask（除非沙箱自动允许）
1c. 工具特定权限检查 (tool.checkPermissions)
1d. 工具实现返回 deny → deny
1f. 内容特定 ask 规则 → ask
1g. 安全检查（bypass-immune）→ ask
2.  dontAsk 模式转换：ask → deny
3.  acceptEdits 模式：文件编辑自动允许
4.  bypassPermissions 模式：全部允许
5.  auto 模式：ML 分类器判断
6.  用户交互确认（fallback）
```

**核心原则：Fail-Closed** — 任何环节出错，默认拒绝。

### 2.4 权限决策原因追踪

```typescript
type PermissionDecisionReason =
  | { type: 'rule', rule: PermissionRule }
  | { type: 'mode', mode: PermissionMode }
  | { type: 'subcommandResults', reasons: Map<string, PermissionResult> }
  | { type: 'hook', hookName: string, hookSource?: string, reason?: string }
  | { type: 'classifier', classifier: string, reason: string }
  | { type: 'safetyCheck', reason: string, classifierApprovable: boolean }
  | { type: 'sandboxOverride', reason: string }
  | { type: 'workingDir', reason: string }
  | { type: 'other', reason: string }
```

每个权限决策都带原因，使得 SDK 报告、resume 和用户可见状态保持一致。

---

## 三、Bash 安全：23 种攻击向量检测

`tools/BashTool/bashSecurity.ts`（2593 行）是整个安全系统中最复杂的模块。

### 3.1 攻击向量 ID 枚举（行 77-101）

```typescript
const BASH_SECURITY_CHECK_IDS = {
  INCOMPLETE_COMMANDS: 1,
  JQ_SYSTEM_FUNCTION: 2,
  JQ_FILE_ARGUMENTS: 3,
  OBFUSCATED_FLAGS: 4,
  SHELL_METACHARACTERS: 5,
  DANGEROUS_VARIABLES: 6,
  NEWLINES: 7,
  DANGEROUS_PATTERNS_COMMAND_SUBSTITUTION: 8,
  DANGEROUS_PATTERNS_INPUT_REDIRECTION: 9,
  DANGEROUS_PATTERNS_OUTPUT_REDIRECTION: 10,
  IFS_INJECTION: 11,
  GIT_COMMIT_SUBSTITUTION: 12,
  PROC_ENVIRON_ACCESS: 13,
  MALFORMED_TOKEN_INJECTION: 14,
  BACKSLASH_ESCAPED_WHITESPACE: 15,
  BRACE_EXPANSION: 16,
  CONTROL_CHARACTERS: 17,
  UNICODE_WHITESPACE: 18,
  MID_WORD_HASH: 19,
  ZSH_DANGEROUS_COMMANDS: 20,
  BACKSLASH_ESCAPED_OPERATORS: 21,
  COMMENT_QUOTE_DESYNC: 22,
  QUOTED_NEWLINE: 23,
}
```

### 3.2 验证函数一览

每个攻击向量对应一个验证函数：

| ID | 函数名 | 行号 | 检测目标 |
|----|-------|------|---------|
| - | `validateEmpty` | 233 | 空命令（允许） |
| 1 | `validateIncompleteCommands` | 244 | 不完整命令 |
| - | `validateSafeCommandSubstitution` | 585 | 安全 heredoc 快速通过 |
| 12 | `validateGitCommit` | 612 | git commit 消息中的命令替换 |
| 2,3 | `validateJqCommand` | 742 | jq 的 `system()` 调用 / 文件参数注入 |
| 5 | `validateShellMetacharacters` | 783 | Shell 元字符 |
| 6 | `validateDangerousVariables` | 823 | 危险环境变量 |
| 8,9,10 | `validateDangerousPatterns` | 846 | 命令替换 `$()` / 输入重定向 `<(` / 输出重定向 |
| 7 | `validateNewlines` | 905 | 换行注入 |
| - | `validateCarriageReturn` | 971 | 回车符误解析 |
| 11 | `validateIFSInjection` | 1017 | IFS 变量注入 |
| 13 | `validateProcEnvironAccess` | 1041 | `/proc/environ` 访问 |
| 14 | `validateMalformedTokenInjection` | 1082 | 畸形 token 注入 |
| 4 | `validateObfuscatedFlags` | 1130 | 混淆的命令行参数 |
| 15 | `validateBackslashEscapedWhitespace` | 1583 | 反斜杠转义空白 |
| 21 | `validateBackslashEscapedOperators` | 1696 | 反斜杠转义运算符 |
| 16 | `validateBraceExpansion` | 1751 | 大括号展开 `{a,b}` |
| 18 | `validateUnicodeWhitespace` | 1902 | Unicode 空白字符 |
| 19 | `validateMidWordHash` | 1919 | 词中 `#` 号 |
| 22 | `validateCommentQuoteDesync` | 1990 | 注释引号失同步 |
| 23 | `validateQuotedNewline` | 2109 | 引号内换行 |
| 20 | `validateZshDangerousCommands` | 2186 | Zsh 特有危险命令 |

### 3.3 危险模式常量

**命令替换模式**（`COMMAND_SUBSTITUTION_PATTERNS`，行 12-41）— 11 个正则，检测 `$()`, `>()`, `=()`, `${}` 等。

**Zsh 危险命令**（`ZSH_DANGEROUS_COMMANDS`，行 45-74）— 27 个命令：

```typescript
// 模块加载
'zmodload', 'emulate'
// 系统 I/O
'sysopen', 'sysread', 'syswrite', 'sysseek'
// 伪终端
'zpty'
// 网络
'ztcp', 'zsocket'
// 文件操作（绕过沙箱）
'zf_rm', 'zf_mv', 'zf_ln', 'zf_chmod', 'zf_chown', 'zf_mkdir', 'zf_rmdir', 'zf_chgrp'
```

### 3.4 验证上下文（`ValidationContext`，行 103-117）

```typescript
type ValidationContext = {
  originalCommand: string
  baseCommand: string                // 去除引号后的基础命令
  unquotedContent: string            // 引号外的内容
  fullyUnquotedContent: string       // 完全去引号
  fullyUnquotedPreStrip: string      // 去引号但不去重定向
  unquotedKeepQuoteChars: string     // 保留引号字符
  treeSitter?: TreeSitterAnalysis    // 可选的 AST 分析
}
```

### 3.5 执行顺序

**早期验证器**（行 2308-2313）— 返回 `'allow'` 触发提前退出，跳过全部后续验证：

```typescript
const earlyValidators = [
  validateEmpty,
  validateIncompleteCommands,
  validateSafeCommandSubstitution,   // 安全 heredoc 快速路径
  validateGitCommit,
]
```

**主验证器**（行 2348-2378）分两组：
1. **误解析关注组**：检测可能导致命令被错误解析的模式
2. **常规关注组**：检测已确认的危险模式

**关键安全设计**：
- **随机盐值**：解析命令时生成 8 字节随机数作为占位符盐，防止字面占位符注入
- **行继续处理**：合并 `\<换行>` 续行后再解析（防止 `tr\<NL>aceroute` → `traceroute` 绕过）
- **引号上下文追踪**：分离引号内外内容，跟踪单引号、双引号、转义状态
- **Tree-sitter 回退**：可选的 AST 级分析，精度更高

### 3.6 Bash 权限（`bashPermissions.ts`）

**安全环境变量白名单**（`SAFE_ENV_VARS`，行 378-430）— 54 个：

```typescript
// Go: GOEXPERIMENT, GOOS, GOARCH, CGO_ENABLED, GO111MODULE
// Rust: RUST_BACKTRACE, RUST_LOG
// Python: PYTHONUNBUFFERED, PYTHONDONTWRITEBYTECODE
// Locale: LANG, LC_ALL, LC_CTYPE, CHARSET
// Terminal: TERM, COLORTERM, NO_COLOR, FORCE_COLOR, TZ
// API: ANTHROPIC_API_KEY
```

**裸 shell 前缀黑名单**（`BARE_SHELL_PREFIXES`，行 196-226）— 24 个命令不能用于前缀规则：

```typescript
// Shells: sh, bash, zsh, fish, csh, tcsh, ksh, dash, cmd, powershell, pwsh
// Wrappers: env, xargs, nice, stdbuf, nohup, timeout, time
// 提权: sudo, doas, pkexec
```

**复杂命令限制**：

```typescript
MAX_SUBCOMMANDS_FOR_SECURITY_CHECK = 50   // 超过则整体拒绝
MAX_SUGGESTED_RULES_FOR_COMPOUND = 5      // 复合命令建议规则上限
```

---

## 四、工具调度

### 4.1 `runTools()`（`toolOrchestration.ts`，行 19-82）

```typescript
export async function* runTools(
  toolUseMessages: ToolUseBlock[],
  assistantMessages: AssistantMessage[],
  canUseTool: CanUseToolFn,
  toolUseContext: ToolUseContext,
): AsyncGenerator<MessageUpdate, void>
```

`MessageUpdate` 包含 `message?: Message` 和 `newContext: ToolUseContext`。

### 4.2 `partitionToolCalls()`（行 91-116）

分组逻辑：

```typescript
type Batch = { isConcurrencySafe: boolean; blocks: ToolUseBlock[] }
```

- **单个非只读工具** → 批大小 1，`isConcurrencySafe = false`
- **连续只读工具** → 合并成一批，`isConcurrencySafe = true`
- 使用 `tool.isConcurrencySafe(parsedInput)` 判断——**并发规则由工具自己声明，不是调度器硬编码**
- 异常安全：`isConcurrencySafe` 抛异常时视为 `false`

### 4.3 并发限制

```typescript
function getMaxToolUseConcurrency(): number {
  return parseInt(process.env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY || '', 10) || 10
}
```

默认 **10 个并发**。

### 4.4 执行策略

- `runToolsSerially()`（行 118）：非只读工具顺序执行
- `runToolsConcurrently()`（行 152）：只读工具并发执行（受限于 `getMaxToolUseConcurrency()`）

### 4.5 `contextModifier` 处理

`contextModifier` 只在**非并发批次**执行后回写——并发执行的工具不能修改共享上下文（避免竞态）。

---

## 五、`StreamingToolExecutor`（531 行）

### 5.1 工具状态

```typescript
type ToolStatus = 'queued' | 'executing' | 'completed' | 'yielded'

type TrackedTool = {
  id: string
  block: ToolUseBlock
  assistantMessage: AssistantMessage
  status: ToolStatus
  isConcurrencySafe: boolean
  promise?: Promise<void>
  results?: Message[]
  pendingProgress: Message[]
  contextModifiers?: Array<(context: ToolUseContext) => ToolUseContext>
}
```

### 5.2 关键方法

| 方法 | 行号 | 功能 |
|------|------|------|
| `addTool()` | 76 | 加入队列，条件满足时立即开始执行 |
| `canExecuteTool()` | 129 | 检查并发状态是否允许执行 |
| `processQueue()` | 140 | 启动满足条件的队列工具 |
| `executeTool()` | 265 | 执行单个工具，收集 contextModifier |
| `getCompletedResults()` | 412 | 非阻塞产出已完成结果 |
| `getRemainingResults()` | 453 | 异步等待剩余工具完成 |

### 5.3 并发规则

- **非并发工具**拥有**独占访问权**（不能与其他工具同时执行）
- **并发工具**只能和其他并发工具并行
- 非并发工具阻塞队列

### 5.4 中断处理

- `siblingAbortController`：Bash 出错时取消兄弟子进程
- `getAbortReason()`：检查 `streaming_fallback` / `sibling_error` / `user_interrupted`
- `interruptBehavior`：`'cancel'`（终止执行）vs `'block'`（保持运行）

---

## 六、工具集约束

`constants/tools.ts`（行 36-112）定义了不同 agent 模式的工具白名单/黑名单：

```typescript
// Agent 不可用的工具
ALL_AGENT_DISALLOWED_TOOLS = new Set([
  TASK_OUTPUT_TOOL_NAME,
  EXIT_PLAN_MODE_V2_TOOL_NAME,
  ENTER_PLAN_MODE_TOOL_NAME,
  ASK_USER_QUESTION_TOOL_NAME,
  TASK_STOP_TOOL_NAME,
  // ant 用户除外的: AGENT_TOOL_NAME
])

// 异步后台 Agent 可用
ASYNC_AGENT_ALLOWED_TOOLS = new Set([
  FILE_READ, WEB_SEARCH, TODO_WRITE, GREP, WEB_FETCH, GLOB,
  ...SHELL_TOOL_NAMES, FILE_EDIT, FILE_WRITE, NOTEBOOK_EDIT,
  SKILL, SYNTHETIC_OUTPUT, TOOL_SEARCH, ENTER_WORKTREE, EXIT_WORKTREE
])

// Coordinator Mode（纯调度者）
COORDINATOR_MODE_ALLOWED_TOOLS = new Set([
  AGENT_TOOL_NAME,
  TASK_STOP_TOOL_NAME,
  SEND_MESSAGE_TOOL_NAME,
  SYNTHETIC_OUTPUT_TOOL_NAME,
])
```

---

## 七、为什么工具层像"执行平面"而不是"工具插件"

把这几层串起来：

| 层 | 文件 | 职责 |
|----|------|------|
| 协议层 | `Tool.ts` | 定义工具的完整 runtime contract |
| 治理层 | `ToolPermissionContext` + `permissions.ts` | 多源规则 + ML 分类器 + 10 步管道 |
| 注册层 | `tools.ts` | 统一注册 + feature gate + 动态过滤 |
| 调度层 | `toolOrchestration.ts` | 批次分组 + 并发策略 + contextModifier |
| 执行层 | `StreamingToolExecutor.ts` | 流式执行 + 状态管理 + 中断传播 |
| 安全层 | `bashSecurity.ts` | 23 种攻击向量 + 随机盐 + tree-sitter |

这不是"插件系统"——插件只需解决挂进去、被发现、被调用。执行平面必须解决：调用协议、权限模型、并发策略、状态传播、错误传播、UI 进度、顺序语义、resume / transcript / session 兼容。

---

## 八、对 Agent 工程的启发

1. **先定义 Tool 协议，再写 Tool 实现** — `Tool.ts` 的 793 行定义是系统稳定性的基石
2. **权限系统必须进入 Tool Context** — 不是外插的防火墙，而是协议的一部分
3. **并发能力由工具声明，不是调度器硬编码** — `isConcurrencySafe(input)` 比按工具名分类强得多
4. **流式工具执行是高阶能力** — 做成后体验拉开差距，但需要处理中断、fallback、顺序保持
5. **安全是一等公民** — 23 种攻击检测、随机盐、tree-sitter 回退，不是事后补丁
6. **工具不是 RPC 调用，而是 runtime actors** — 可修改上下文、触发 UI、影响后续工具可见性
