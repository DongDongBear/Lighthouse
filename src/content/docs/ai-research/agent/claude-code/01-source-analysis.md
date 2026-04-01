---
title: "Claude Code 深读（一）：系统总览与启动序列"
description: "基于 1884 个 TypeScript 源文件，对 Claude Code 的入口编排、启动序列、全局状态、模块依赖与五层架构做代码级拆解。"
date: "2026-03-31"
---

# Claude Code 深读（一）：系统总览与启动序列

:::note[系列导航]
本文是 Claude Code 源码深度研究系列的第一篇。

1. **系统总览与启动序列**（本文）— 入口、全局状态、模块依赖、五层架构
2. [QueryEngine 与 query.ts](../02-query-engine-deep-dive/) — 会话主循环、上下文压缩、API 集成
3. [Tool 协议、权限系统与工具调度](../03-tools-permissions-orchestration/) — 工具协议、23 种攻击检测、并发调度
4. [Skills/Commands/MCP 注入 Runtime](../04-runtime-injection-skills-commands-mcp/) — 能力加载、命令注册、MCP transport
5. [Anthropic 内部如何使用 Skills](../05-skills-lessons/) — 官方实践
6. [源码泄漏深度技术解读](../06-source-leak-deep-analysis/) — 全景式 11 维度硬核分析
:::

> 这篇文章基于 `@anthropic-ai/claude-code` v2.1.88 的 npm source map 还原出的 1884 个 TypeScript 源文件。所有文件路径、函数签名、常量值均来自实际源码阅读。

---

## 一、为什么 Claude Code 值得拆

Claude Code 不是一个普通的聊天 CLI。从源码结构看，它更接近一个**面向终端与本地开发工作流的 Agent Runtime**，同时具备：

- CLI / slash command 系统（55+ 命令）
- 会话主循环（`QueryEngine` + `query.ts`，合计 3024 行）
- 40+ 工具注册与 6 层权限系统
- MCP 集成（7 种 transport）
- Skills / Plugins 机制（17 个内置技能）
- React/Ink TUI 界面（定制 fork，45+ 文件）
- 远程会话、桥接、工作树、任务与多 Agent 协作

---

## 二、源码树总览

```text
src/
  entrypoints/          # 6 个入口模块（cli, init, mcp, sdk, sandbox, control）
  bootstrap/            # 全局状态与启动引导（state.ts: 1600+ 行）
  main.tsx              # 巨型编排器（3806+ 行）
  QueryEngine.ts        # 会话主循环内核（1295 行）
  query.ts              # query loop 状态机（1729 行）
  Tool.ts               # 工具类型系统（793 行）
  tools.ts              # 工具注册中心（390 行）
  commands.ts           # 命令注册中心（755 行）
  tools/                # 40+ 工具实现
  commands/             # 70+ 命令实现（含子目录）
  skills/               # Skills 体系与 17 个内置技能
  services/             # API / MCP / compact / analytics 等服务层
  state/                # AppState 与 Store（454 行）
  context/              # 上下文拼装
  constants/            # 零依赖常量（betas, apiLimits, xml, system, oauth, toolLimits）
  utils/                # 300+ 工具函数
  assistant/            # Kairos 助手模式
  coordinator/          # Coordinator 多 Agent 编排
  bridge/ remote/       # IDE 桥接与远程会话
  buddy/                # 电子宠物系统（16 种物种）
  memdir/               # Kairos 长期记忆
  ink/                  # 定制版 Ink 渲染器（45+ 文件）
  plugins/              # 插件基础设施
```

---

## 三、五层架构

```text
[1] Entrypoint / CLI Layer
    entrypoints/cli.tsx → main.tsx → commands.ts

[2] Session Runtime Layer
    QueryEngine.ts → query.ts → processUserInput(...)

[3] Tool Protocol Layer
    Tool.ts → tools.ts → tools/*

[4] Service / Integration Layer
    services/* → MCP / API / auth / plugins / skills / analytics

[5] UI / Interaction Layer
    ink/ → components/ → REPL.tsx（895KB）
```

核心设计取向：**把"模型循环"当作核心，但绝不把整个系统都塞进模型循环里。**

---

## 四、入口：两阶段启动序列

### 4.1 CLI 快速路径（`entrypoints/cli.tsx`，302 行）

`cli.tsx` 是二进制入口。它在加载 `main.tsx` 之前，先做了大量**快速路径优化**——对于不需要完整 runtime 的命令，在导入重模块之前就直接返回：

| 快速路径 | Feature Gate | 说明 |
|---------|-------------|------|
| `--version` / `-v` | 无 | 零导入，写 `MACRO.VERSION` 后退出 |
| `--dump-system-prompt` | ant-only | 导出系统提示 |
| `--claude-in-chrome-mcp` | 无 | Chrome MCP 服务 |
| `--daemon-worker` | `DAEMON` | 守护进程 worker |
| `remote-control` / `rc` / `bridge` | `BRIDGE_MODE` | IDE 桥接 |
| `daemon` | `DAEMON` | 守护进程管理 |
| `ps` / `logs` / `attach` / `kill` / `--bg` | `BG_SESSIONS` | 后台会话 |
| `new` / `list` / `reply` | `TEMPLATES` | 模板系统 |
| `environment-runner` | `BYOC_ENVIRONMENT_RUNNER` | BYOC 环境 |
| `self-hosted-runner` | `SELF_HOSTED_RUNNER` | 自托管 runner |

每个快速路径都有显式 `return`，确保不触发完整 CLI 加载。

### 4.2 主初始化（`entrypoints/init.ts`，341 行）

初始化分为**两个阶段**——遥测只在用户明确信任后才启动。

**Phase 1 — 主初始化（不依赖信任状态，行 57-214）：**

```typescript
export const init = memoize(async (): Promise<void> => {
  profileCheckpoint('init_function_start')
  enableConfigs()                          // 1. 配置系统启用
  applySafeConfigEnvironmentVariables()    // 2. 安全环境变量（信任前子集）
  applyExtraCACertsFromConfig()            // 3. CA 证书（Bun 要求 NODE_EXTRA_CA_CERTS）
  setupGracefulShutdown()                  // 4. 优雅退出处理
  // 5-8. Fire-and-forget 异步任务（并行启动）
  //   - 1P 事件日志、OAuth 填充、JetBrains 检测、GitHub 仓库检测
  // 9-10. loadRemoteManagedSettings(), loadPolicyLimits()（非阻塞）
  recordFirstStartTime()                   // 11. 首次启动时间
  configureGlobalMTLS()                    // 12. mTLS
  configureGlobalAgents()                  // 13. HTTP Agent（代理/mTLS）
  preconnectAnthropicApi()                 // 14. ⚡ TCP+TLS 预连接（性能优化）
  // 15-18: 上游代理、Windows 适配、LSP、团队清理、Scratchpad
})
```

第 14 步的 `preconnectAnthropicApi()` 提前建立 TCP+TLS 连接，让首次 API 调用跳过握手延迟。

**Phase 2 — 信任后遥测初始化（行 247-340）：**

```typescript
export function initializeTelemetryAfterTrust(): void {
  // 有远程设置资格 → 等待设置加载 → 重新应用环境变量 → 初始化遥测
  // 无远程设置资格 → 直接初始化遥测
}
async function setMeterState(): Promise<void> {
  // 延迟加载 OpenTelemetry（400KB+ 模块推迟到此刻）
  const { metrics, logs } = await import('@opentelemetry/api')
  // 创建 counter: session, loc, pr, commit, cost, token, codeEditToolDecision, activeTime
}
```

### 4.3 主编排器（`main.tsx`，3806+ 行）

`main.tsx` 是**系统 bootloader + runtime assembler**，执行序列：

```text
1. profileCheckpoint('main_function_start')          // 行 586
2. 信号处理器 & 警告初始化
3. Direct Connect URL 解析（DIRECT_CONNECT feature）
4. 预动作钩子阶段（行 910-967）：
   ├─ ensureMdmSettingsLoaded() + ensureKeychainPrefetchCompleted()
   ├─ await init()          ← Phase 1 完成
   ├─ initSinks()           ← 日志 sink 附加
   ├─ 注入 --plugin-dir 内联插件
   ├─ runMigrations()
   └─ 后台启动远程设置 & 策略限制加载
5. 信任对话阶段（行 2239-2242）：
   └─ await showSetupScreens()  ← 用户信任确认
6. 信任后设置（行 2593-2607）：
   ├─ applyConfigEnvironmentVariables()   ← 完整环境变量
   ├─ initializeTelemetryAfterTrust()     ← Phase 2 完成
   └─ processSessionStartHooks('startup')
7. 模型/功能解析 → 工具/命令/MCP 装配 → 进入交互或 headless 模式
```

**Feature Gate 清单**（`main.tsx` 中出现的 `feature('...')`）：

`COORDINATOR_MODE`, `KAIROS`, `BRIDGE_MODE`, `DAEMON`, `VOICE_MODE`, `WORKFLOW_SCRIPTS`, `HISTORY_SNIP`, `TORCH`, `BUDDY`, `BG_SESSIONS`, `TEMPLATES`, `UPLOAD_USER_SETTINGS`, `AGENT_MEMORY_SNAPSHOT`, `ULTRAPLAN`, `FORK_SUBAGENT`, `PROACTIVE`, `UDS_INBOX` ...

这意味着 Claude Code 不是单一产品形态，而是**多产品模式共用同一运行时底座**。

---

## 五、全局状态

### 5.1 `bootstrap/state.ts`（1600+ 行）

文件顶部有两道防线：

```typescript
// DO NOT ADD MORE STATE HERE - BE JUDICIOUS WITH GLOBAL STATE  // 行 31
// ALSO HERE - THINK THRICE BEFORE MODIFYING                     // 行 259
```

`State` 类型目前 **257 行**，包含以下类别：

| 类别 | 代表字段 | 说明 |
|------|---------|------|
| 会话元数据 | `originalCwd`, `projectRoot`, `sessionId`, `parentSessionId`, `kairosActive`, `isRemoteMode` | 入口时确定 |
| 成本追踪 | `totalCostUSD`, `totalAPIDuration`, `totalAPIDurationWithoutRetries`, `totalToolDuration` | 实时累计 |
| 轮次统计 | `turnHookDurationMs`, `turnToolDurationMs`, `turnClassifierDurationMs`, `turnToolCount`, `turnHookCount` | 每轮重置 |
| 模型信息 | `modelUsage: { [name]: ModelUsage }`, `mainLoopModelOverride`, `initialMainLoopModel`, `modelStrings` | 动态切换 |
| 遥测 | `meter`, `sessionCounter`, `locCounter`, `prCounter`, `commitCounter`, `costCounter`, `tokenCounter` | Phase 2 后填充 |
| 缓存 | `cachedClaudeMdContent`, `systemPromptSectionCache`, `planSlugCache`, `promptCache1hAllowlist` | 热缓存 |
| 特性开关 | `scheduledTasksEnabled`, `sessionBypassPermissionsMode` | 运行时切换 |
| Prompt Cache 控制 | `afkModeHeaderLatched`, `fastModeHeaderLatched`, `cacheEditingHeaderLatched`, `thinkingClearLatched` | 锁存器模式 |

初始状态工厂（行 260-299）通过 `realpathSync(rawCwd).normalize('NFC')` 解析符号链接，确保路径一致性。

### 5.2 `AppState`（`state/AppStateStore.ts`，454 行）

与全局 `State` 不同，`AppState` 是 **React 感知的运行时状态**，使用 `DeepImmutable<{...}>` 类型标记：

```typescript
export type AppState = DeepImmutable<{
  settings: SettingsJson
  mainLoopModel: ModelSetting
  toolPermissionContext: ToolPermissionContext
  remoteConnectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  replBridgeEnabled / replBridgeConnected / ...  // Bridge 6 字段
  selectedIPAgentIndex: number                   // Agent Swarm
  viewSelectionMode: 'none' | 'selecting-agent' | 'viewing-agent'
  mcp: { commands: Command[] }                   // MCP 命令
  loadedPlugins: LoadedPlugin[]
  speculationState: SpeculationState             // 推测执行
  // ...（共 150+ 属性）
}>
```

`SpeculationState` 透露了未公开的优化——用户思考时推测性预执行：

```typescript
export type CompletionBoundary =
  | { type: 'complete'; completedAt: number; outputTokens: number }
  | { type: 'bash'; command: string; completedAt: number }
  | { type: 'edit'; toolName: string; filePath: string; completedAt: number }
  | { type: 'denied_tool'; toolName: string; detail: string; completedAt: number }
```

---

## 六、模块依赖关系

```text
entrypoints/              ← 入口层
  ↓
bootstrap/ (state, init)  ← 引导层
  ↓
main.tsx                  ← 编排层
  ↓
QueryEngine.ts / query.ts ← 运行时内核
  ↓
services/ (api, compact, tools, mcp, auth)  ← 服务层
  ↓
tools/ (40+ 工具实现)     ← 工具层
  ↓
utils/ (permissions, sandbox, hooks, worktree)  ← 函数层
  ↓
constants/ (零依赖叶子节点)  ← 常量层
```

`constants/` 下的文件被特意保持零依赖，防止循环引用。部分模块用运行时 `require()` 替代静态 `import` 来打破循环依赖（如 `TeamCreateTool`、`SendMessageTool`）。

---

## 七、关键常量

### 7.1 Beta Headers（`constants/betas.ts`，53 行）

18 个 beta header，相当于 Anthropic API 的内部路线图：

```typescript
CLAUDE_CODE_20250219_BETA_HEADER      = 'claude-code-20250219'
INTERLEAVED_THINKING_BETA_HEADER      = 'interleaved-thinking-2025-05-14'
CONTEXT_1M_BETA_HEADER                = 'context-1m-2025-08-07'
CONTEXT_MANAGEMENT_BETA_HEADER        = 'context-management-2025-06-27'
STRUCTURED_OUTPUTS_BETA_HEADER        = 'structured-outputs-2025-12-15'
WEB_SEARCH_BETA_HEADER                = 'web-search-2025-03-05'
TOOL_SEARCH_BETA_HEADER_1P            = 'advanced-tool-use-2025-11-20'
TOOL_SEARCH_BETA_HEADER_3P            = 'tool-search-tool-2025-10-19'
EFFORT_BETA_HEADER                    = 'effort-2025-11-24'
TASK_BUDGETS_BETA_HEADER              = 'task-budgets-2026-03-13'
PROMPT_CACHING_SCOPE_BETA_HEADER      = 'prompt-caching-scope-2026-01-05'
FAST_MODE_BETA_HEADER                 = 'fast-mode-2026-02-01'
REDACT_THINKING_BETA_HEADER           = 'redact-thinking-2026-02-12'
TOKEN_EFFICIENT_TOOLS_BETA_HEADER     = 'token-efficient-tools-2026-03-28'
ADVISOR_BETA_HEADER                   = 'advisor-tool-2026-03-01'
// Feature-gated:
SUMMARIZE_CONNECTOR_TEXT_BETA_HEADER   // CONNECTOR_TEXT feature
AFK_MODE_BETA_HEADER                   // TRANSCRIPT_CLASSIFIER feature
CLI_INTERNAL_BETA_HEADER               // ant-only
```

Bedrock 兼容：`BEDROCK_EXTRA_PARAMS_HEADERS` 集合定义了哪些 header 需通过 `extraBodyParams` 发送。

### 7.2 API 限制（`constants/apiLimits.ts`，97 行）

```typescript
API_IMAGE_MAX_BASE64_SIZE  = 5 * 1024 * 1024     // 5 MB
IMAGE_MAX_WIDTH / HEIGHT   = 2000                 // px
PDF_TARGET_RAW_SIZE        = 20 * 1024 * 1024     // 20 MB
API_PDF_MAX_PAGES          = 100
PDF_MAX_PAGES_PER_READ     = 20
API_MAX_MEDIA_PER_REQUEST  = 100
```

### 7.3 工具结果限制（`constants/toolLimits.ts`，57 行）

```typescript
DEFAULT_MAX_RESULT_SIZE_CHARS      = 50_000       // 单工具结果字符上限
MAX_TOOL_RESULT_TOKENS             = 100_000      // 单工具结果 token 上限
BYTES_PER_TOKEN                    = 4
MAX_TOOL_RESULT_BYTES              = 400_000      // = 100K × 4
MAX_TOOL_RESULTS_PER_MESSAGE_CHARS = 200_000      // 每条消息所有工具结果总限
TOOL_SUMMARY_MAX_LENGTH            = 50
```

### 7.4 系统提示前缀（`constants/system.ts`，96 行）

```typescript
const DEFAULT_PREFIX = "You are Claude Code, Anthropic's official CLI for Claude."
const AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX = 
  "You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK."
const AGENT_SDK_PREFIX = "You are a Claude agent, built on Anthropic's Claude Agent SDK."
```

选择逻辑：Vertex 固定 `DEFAULT_PREFIX`；非交互模式根据 `hasAppendSystemPrompt` 选择 SDK 前缀。

### 7.5 Attribution Header

```text
x-anthropic-billing-header: cc_version={version}; cc_entrypoint={entrypoint}; cch=00000; cc_workload={workload};
```

`cch=00000` 是 `NATIVE_CLIENT_ATTESTATION` feature gate 下的原生客户端认证占位符。`cc_workload` 提供 QoS 路由提示。

### 7.6 XML Tag 体系（`constants/xml.ts`，87 行，26+ 常量）

```typescript
// 命令元数据
COMMAND_NAME_TAG, COMMAND_MESSAGE_TAG, COMMAND_ARGS_TAG
// 终端输出
BASH_INPUT_TAG, BASH_STDOUT_TAG, BASH_STDERR_TAG
LOCAL_COMMAND_STDOUT_TAG, LOCAL_COMMAND_STDERR_TAG, LOCAL_COMMAND_CAVEAT_TAG
// 任务通知
TASK_NOTIFICATION_TAG, TASK_ID_TAG, TOOL_USE_ID_TAG, STATUS_TAG, SUMMARY_TAG
// 工作树
WORKTREE_TAG, WORKTREE_PATH_TAG, WORKTREE_BRANCH_TAG
// 远程与 Swarm
ULTRAPLAN_TAG, TEAMMATE_MESSAGE_TAG, CHANNEL_MESSAGE_TAG, CROSS_SESSION_MESSAGE_TAG
// Fork
FORK_BOILERPLATE_TAG, FORK_DIRECTIVE_PREFIX = 'Your directive: '
```

### 7.7 OAuth 配置（`constants/oauth.ts`，235 行）

```typescript
CLIENT_ID: '9d1c250a-e61b-44d9-88ed-5944d1962f5e'   // 生产
// Staging (ant-only): '22422756-60c9-4084-8eb7-27705fd5cf9a'

// OAuth Scopes
CLAUDE_AI_OAUTH_SCOPES = [
  'user:profile', 'user:inference', 'user:sessions:claude_code',
  'user:mcp_servers', 'user:file_upload'
]
```

---

## 八、`QueryEngine.ts`：会话运行时内核

### 8.1 类定义（行 184-207）

```typescript
export class QueryEngine {
  private config: QueryEngineConfig
  private mutableMessages: Message[]
  private abortController: AbortController
  private permissionDenials: SDKPermissionDenial[]
  private totalUsage: NonNullableUsage
  private hasHandledOrphanedPermission = false
  private readFileState: FileStateCache
  private discoveredSkillNames = new Set<string>()
  private loadedNestedMemoryPaths = new Set<string>()
}
```

### 8.2 `QueryEngineConfig`（行 130-173）

```typescript
export type QueryEngineConfig = {
  cwd: string
  tools: Tools
  commands: Command[]
  mcpClients: MCPServerConnection[]
  agents: AgentDefinition[]
  canUseTool: CanUseToolFn
  getAppState: () => AppState
  setAppState: (f: (prev: AppState) => AppState) => void
  initialMessages?: Message[]
  readFileCache: FileStateCache
  customSystemPrompt?: string
  appendSystemPrompt?: string
  userSpecifiedModel?: string
  fallbackModel?: string
  thinkingConfig?: ThinkingConfig
  maxTurns?: number
  maxBudgetUsd?: number
  taskBudget?: { total: number }
  jsonSchema?: Record<string, unknown>
  handleElicitation?: ToolUseContext['handleElicitation']
  // ... replayUserMessages, includePartialMessages, setSDKStatus, abortController, snipReplay
}
```

### 8.3 `submitMessage()`（行 209-212）

```typescript
async *submitMessage(
  prompt: string | ContentBlockParam[],
  options?: { uuid?: string; isMeta?: boolean },
): AsyncGenerator<SDKMessage, void, unknown>
```

返回 `AsyncGenerator<SDKMessage>` 而非 `Promise<string>`——在内核层就选择了**事件流式 agent runtime**。

---

## 九、工具与命令概览

### 9.1 工具注册表（`tools.ts`，390 行）

`getAllBaseTools()` 按加载策略分三类：

**直接导入**（核心工具）：AgentTool, BashTool, FileReadTool, FileEditTool, FileWriteTool, GlobTool, GrepTool, NotebookEditTool, WebFetchTool, TodoWriteTool, WebSearchTool, AskUserQuestionTool, SkillTool, EnterPlanModeTool

**条件加载**（feature gate）：

| 工具 | 条件 |
|------|------|
| `REPLTool` | `USER_TYPE === 'ant'` |
| `SleepTool` | `PROACTIVE` \| `KAIROS` |
| `CronTools` | `AGENT_TRIGGERS` |
| `WebBrowserTool` | `WEB_BROWSER_TOOL` |
| `WorkflowTool` | `WORKFLOW_SCRIPTS` |
| `SnipTool` | `HISTORY_SNIP` |

### 9.2 工具过滤管道

```text
getAllBaseTools()
  → getTools(permissionContext)
    → CLAUDE_CODE_SIMPLE 模式（只保留 Bash/Read/Edit）
    → filterToolsByDenyRules()
    → .isEnabled() 过滤
  → assembleToolPool(permissionContext, mcpTools)
    → 合并 MCP 工具，按名称去重（内置优先）
    → 稳定排序（保持 prompt cache 命中率）
```

### 9.3 commands 与 tools 分离

Claude Code 维护两套平面：

- **commands**（`commands.ts`）：给用户控制 runtime（`/config`, `/status`, `/memory`, `/permissions`...）
- **tools**（`tools.ts`）：给模型在 query loop 中执行

详细分析见[第三篇](../03-tools-permissions-orchestration/)和[第四篇](../04-runtime-injection-skills-commands-mcp/)。

---

## 十、调用链图

```text
User Input
  │
  ▼
cli.tsx → 快速路径检查 → 若命中直接返回
  │
  ▼
main.tsx → 两阶段初始化 → 信任确认 → 工具/命令/MCP 装配
  │
  ▼
QueryEngine.submitMessage(prompt, options)
  ├─ 包装 canUseTool 记录权限拒绝
  ├─ 解析主模型与 thinking 配置
  ├─ fetchSystemPromptParts() → { defaultSystemPrompt, userContext, systemContext }
  ├─ 构造 ProcessUserInputContext
  └─ 调用 processUserInput(...)
        │
        ▼
processUserInput(...) → slash command 拦截 / attachments / hooks / allowedTools 覆写
  │ → 决定是否进入 query loop
  ▼
query(params) → queryLoop(params) → while (true)
  ├─ memory prefetch + skill discovery prefetch
  ├─ applyToolResultBudget() → snipCompactIfNeeded() → microcompact()
  ├─ contextCollapse.applyCollapsesIfNeeded() → autocompact()
  ├─ 构建 full system prompt → queryModelWithStreaming()
  └─ runTools() / StreamingToolExecutor
        │
        ▼
工具执行 → contextModifier 回写 → 结果注入消息流 → 继续循环或退出
```

---

## 十一、技术选型

| 维度 | 选择 | 说明 |
|------|------|------|
| 运行时 | Node.js >= 18 | Bun bundler 打包，编译时 feature gate 死代码消除 |
| UI 框架 | Ink（React 终端渲染器） | 定制 fork：`src/ink/` 含自定义 reconciler、布局引擎 |
| Schema 校验 | Zod | 与 TypeScript 类型系统深度集成 |
| 状态管理 | 自研 `createStore()` | 类 Zustand 模式 |
| 依赖管理 | **零运行时依赖** | 全部 bundle 进 `cli.js`（16667 行 minified），仅 Sharp 为 optional |

---

## 十二、对 Agent 工程的 6 条启发

1. **主循环必须是一等公民** — 独立成 runtime kernel（`QueryEngine`），不埋在 UI 或 handler 里
2. **工具协议先于工具实现** — 先定义 context / permission / progress 协议（`Tool.ts` 793 行）
3. **用户控制面和模型执行面分开** — commands 与 tools 分离是长期可维护性的关键
4. **会话是对象，不是数组** — 单纯的 message array 对 coding agent 很快不够用
5. **性能工程要前置** — `preconnectAnthropicApi()`, keychain 预取, 快速路径优化
6. **Agent 系统最终会长成操作系统** — session, tools, commands, plugins, remote, policies 已超出 "LLM app" 范畴

---

## 附：核心源文件索引

| 文件 | 行数 | 角色 |
|------|------|------|
| `entrypoints/cli.tsx` | 302 | 二进制入口，快速路径分发 |
| `entrypoints/init.ts` | 341 | 两阶段初始化（memoized） |
| `main.tsx` | 3806+ | 系统 bootloader + runtime assembler |
| `bootstrap/state.ts` | 1600+ | 全局状态中心（257 行类型定义） |
| `state/AppStateStore.ts` | 454 | React 感知的运行时状态（`DeepImmutable`） |
| `QueryEngine.ts` | 1295 | 会话主循环内核 |
| `query.ts` | 1729 | query loop 状态机 |
| `Tool.ts` | 793 | 工具类型系统 |
| `tools.ts` | 390 | 工具注册中心 |
| `commands.ts` | 755 | 命令注册中心 |
| `constants/betas.ts` | 53 | 18 个 Beta Header |
| `constants/system.ts` | 96 | 系统提示前缀 + Attribution |
| `constants/toolLimits.ts` | 57 | 工具结果限制 |
| `constants/apiLimits.ts` | 97 | API 尺寸限制 |
| `constants/oauth.ts` | 235 | OAuth 配置 |
| `constants/xml.ts` | 87 | 26+ XML Tag 常量 |
