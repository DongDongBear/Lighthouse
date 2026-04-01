---
title: "Claude Code 源码泄漏深度技术解读：1884 个文件、51 万行代码揭示的 AI 编程工具架构全貌"
description: "Claude Code, npm source map 泄漏, 深度分析, 工具系统, Agent Loop, 多Agent协调, 安全架构, Buddy电子宠物, Kairos长期记忆, Ultraplan"
---

# Claude Code 源码泄漏深度技术解读：1884 个文件、51 万行代码揭示的 AI 编程工具架构全貌

> - GitHub 镜像仓库：多个社区成员已从 npm source map 中还原并上传
> - Hacker News 讨论：持续热议中
> - 来源：npm 包 `@anthropic-ai/claude-code@2.1.88` 中意外包含的 `.map` 文件
> - 发布时间：2026-03-31

## 速查卡

| 维度 | 内容 |
|------|------|
| **一句话总结** | Anthropic 旗舰 CLI 工具 Claude Code 因 npm 包中遗留 source map，导致全部 1884 个 TypeScript 源文件完整暴露，揭示了业界最复杂的 AI 编程助手内部架构 |
| **大白话版** | 相当于把整个 Claude Code 的设计图纸、安全锁的钥匙模型、还没发布的电子宠物、长期记忆系统全部摊在桌上给大家看了 |
| **核心数字** | 1884 个 `.ts/.tsx` 文件；版本 2.1.88；40+ 内置工具；20+ feature flags；16 种电子宠物；6 层安全管道；55+ 内置命令 |
| **影响评级** | **A** — 这是 AI 编程工具领域迄今最大规模的源码暴露事件，直接揭示了行业标杆产品的完整架构思路 |
| **最值得盯的点** | Fork Subagent 的 prompt cache 复用机制、Kairos 长期记忆架构、多层安全决策管道、Coordinator Mode 多 agent 编排 |

## 关键判断

1. **Claude Code 不是一个简单的 CLI wrapper，而是一个完整的 AI Agent 操作系统。** 它有自己的进程模型、沙箱、权限系统、插件生态、IDE 桥接协议，复杂度远超外界预期。

2. **多 Agent 协调已从实验走向生产。** Coordinator Mode、Fork Subagent、In-Process Teammate、Remote Agent 四种 agent 派生模式并存，说明 Anthropic 在 agent 编排上做了大量工程投入。

3. **安全是一等公民，不是事后补丁。** 6 层纵深防御（输入校验 → 静态分析 → 规则匹配 → Hook 拦截 → ML 分类器 → 沙箱）的设计思路，比同类产品成熟至少一代。

4. **隐藏功能透露了 Anthropic 的产品愿景：** Kairos 长期记忆 + Buddy 电子宠物 + Voice 语音模式 + Ultraplan，这些隐藏功能共同指向一个方向——Claude Code 正在从「对话式编程助手」进化为「持续在线的 AI 开发伙伴」。

5. **工程质量整体很高，但也有明显的技术债。** 全局状态对象膨胀到 100+ 字段并标注了 "DO NOT ADD MORE STATE HERE"，`cli.js` 单文件 16667 行的 minified 输出，部分模块超过 100KB——这些都是快速迭代的代价。

---

## 一、整体架构：一个 AI Agent 操作系统

### 1.1 项目元数据

从 `package.json` 看，Claude Code v2.1.88 的外观极其简洁：

- **零运行时依赖**——所有代码 bundle 进单一 `cli.js`（16667 行 minified）
- **仅有的 optional dependencies** 是 9 个平台的 `@img/sharp-*` 包（用于图片压缩）
- ESM 模块，要求 Node >= 18.0.0
- 二进制入口：`"claude": "cli.js"`

`cli.js` 顶部有一行有趣的注释：

```
// Want to see the unminified source? We're hiring!
```

讽刺的是，现在所有人都不用应聘就看到了。

### 1.2 入口与启动流程

源码在 `src/entrypoints/` 下定义了 6 个入口模块：

| 入口 | 用途 |
|------|------|
| `cli.tsx` | 主 CLI 交互界面（React/Ink） |
| `init.ts` | 启动初始化（341 行，memoized） |
| `mcp.ts` | MCP (Model Context Protocol) 服务端 |
| `agentSdkTypes.ts` | Agent SDK 公开类型 |
| `sandboxTypes.ts` | 沙箱配置 Zod schema |
| `sdk/controlSchemas.ts` | SDK 控制协议 |

`init.ts` 中的启动序列是理解整个系统的钥匙。初始化分为两个阶段：

**Phase 1 — 主初始化（不依赖信任状态）：**
1. 校验配置 (`enableConfigs()`)
2. 注入安全环境变量
3. 配置 CA 证书 (`NODE_EXTRA_CA_CERTS`)
4. 注册优雅退出处理
5. 异步初始化事件日志
6. 异步填充 OAuth 账户信息
7. JetBrains IDE 检测
8. GitHub 仓库检测
9. 拉取远程 Managed Settings
10. 配置 mTLS
11. 配置全局 HTTP Agent（代理/mTLS）
12. **预连接 Anthropic API**（性能优化：提前建立 TCP 连接）
13. 初始化上游代理（CCR 模式下的凭据注入）
14. Windows Git-bash 适配
15. LSP 服务管理器注册
16. 会话团队清理注册
17. Scratchpad 目录初始化

**Phase 2 — 信任后的遥测初始化：**
1. 等待远程 Managed Settings 就绪
2. 重新应用环境变量
3. 初始化 OpenTelemetry 仪表
4. 创建 attributed counter 工厂
5. 累加 session 计数器

这种两阶段设计体现了 Anthropic 对用户隐私的谨慎——遥测只在用户明确信任后才启动。

### 1.3 全局状态管理

`src/bootstrap/state.ts`（367+ 行）是整个系统的全局状态中心。它包含：

- **文件系统状态**：`originalCwd`, `projectRoot`, `cwd`
- **成本追踪**：`totalCostUSD`, `totalAPIDuration`
- **模型状态**：`modelUsage`, `mainLoopModelOverride`, `modelStrings`
- **会话标识**：`sessionId`, `parentSessionId`（父子 agent 谱系）
- **遥测**：OpenTelemetry 的 meter、counter、logger、tracer
- **缓存**：`cachedClaudeMdContent`, `systemPromptSectionCache`, `planSlugCache`
- **特性开关**：`kairosActive`, `scheduledTasksEnabled`
- **prompt cache 控制**：`afkModeHeaderLatched`, `fastModeHeaderLatched`, `cacheEditingHeaderLatched`

值得注意的是，文件顶部有一段注释："DO NOT ADD MORE STATE HERE - BE JUDICIOUS WITH GLOBAL STATE"——显然开发团队自己也意识到了这个上帝对象的问题。100+ 字段的全局 mutable state 是技术债的明显信号。

### 1.4 模块依赖关系

从目录结构看，模块依赖形成清晰的分层：

```
entrypoints/
  ↓
bootstrap/ (state, init)
  ↓
services/ (api, compact, tools, mcp, auth)
  ↓
tools/ (40+ 工具实现)
  ↓
utils/ (permissions, sandbox, hooks, worktree)
  ↓
constants/ (零依赖叶子节点)
```

`constants/` 目录下的文件（如 `apiLimits.ts`）被特意保持为零依赖，防止循环引用——这是一个值得借鉴的工程实践。

---

## 二、工具系统：40+ 工具的统一抽象

### 2.1 Tool 接口设计

`src/Tool.ts`（793 行）定义了整个工具系统的核心抽象。每个 Tool 是一个丰富的接口：

```typescript
type Tool<Input, Output> = {
  // 核心方法
  call(args, context, canUseTool, parentMessage, onProgress?): Promise<ToolResult>
  description(input, options): Promise<string>
  prompt(options): Promise<string>
  checkPermissions(input, context): Promise<PermissionResult>
  
  // Schema
  inputSchema: ZodSchema      // Zod 校验
  inputJSONSchema?: JSONSchema // JSON Schema（给 API 用）
  
  // 能力标记
  isEnabled(): boolean
  isConcurrencySafe(input): boolean  // 能否并发执行
  isReadOnly(input): boolean         // 是否只读
  isDestructive?(input): boolean     // 是否有破坏性
  
  // UI 渲染（React/Ink）
  renderToolUseMessage(input): ReactNode
  renderToolResultMessage(output): ReactNode
  
  // 搜索 & 懒加载
  searchHint?: string
  shouldDefer?: boolean    // 是否延迟加载
  alwaysLoad?: boolean     // 是否始终加载
}
```

工具通过 `buildTool()` 构建器模式创建，提供类型安全的默认值：`isEnabled=true`, `isConcurrencySafe=false`, `isReadOnly=false`。

**设计亮点**：`isConcurrencySafe` 标记使得工具编排器能自动判断哪些工具可以并行执行——只读工具并发跑（最多 10 个），写入工具串行跑。这比粗暴地全部串行化要高效得多。

### 2.2 工具注册表

`src/tools.ts`（390 行）是主注册表，`getAllBaseTools()` 函数返回所有可用工具。工具按加载策略分为三类：

**直接导入（核心工具，始终可用）：**
- AgentTool, SkillTool, BashTool, FileEditTool, FileReadTool, FileWriteTool
- GlobTool, GrepTool, NotebookEditTool, WebFetchTool, TodoWriteTool
- WebSearchTool, AskUserQuestionTool, EnterPlanModeTool, ExitPlanModeTool

**延迟 require（打破循环依赖）：**
- TeamCreateTool, TeamDeleteTool, SendMessageTool（通过 lazy getter）

**条件加载（feature gate 控制）：**

| 工具 | 条件 |
|------|------|
| REPLTool | `USER_TYPE === 'ant'`（仅 Anthropic 内部） |
| SleepTool | `PROACTIVE` 或 `KAIROS` |
| CronTools | `AGENT_TRIGGERS` |
| RemoteTriggerTool | `AGENT_TRIGGERS_REMOTE` |
| MonitorTool | `MONITOR_TOOL` |
| WebBrowserTool | `WEB_BROWSER_TOOL` |
| WorkflowTool | `WORKFLOW_SCRIPTS` |
| PowerShellTool | 通过工具函数判断 |

### 2.3 延迟加载与 ToolSearch

这是一个巧妙的优化。并非所有 40+ 工具的 JSON Schema 都需要在每次 API 调用时发送——那会浪费大量 token。Claude Code 引入了 **ToolSearch** 机制：

**判断逻辑** `isDeferredTool()`——一个工具被延迟加载的条件：
1. 不是 `alwaysLoad === true` 的工具
2. 是 MCP 工具（第三方工具始终延迟）
3. 不是 ToolSearch 自身、Agent、Brief 等关键工具
4. 标记了 `shouldDefer === true`

**被延迟的内置工具：** AskUserQuestion, Config, EnterPlanMode, ExitPlanMode, EnterWorktree, ExitWorktree, LSP, ListMcpResource, ReadMcpResource, NotebookEdit, RemoteTrigger。

当 Claude 需要这些工具时，它调用 ToolSearch（支持关键词搜索或 `select:name1,name2` 精确选择），ToolSearch 返回完整的 JSON Schema，之后这些工具就可以正常调用了。

**工程意义**：这直接节省了每次 API 调用的 token 开销。对于有大量 MCP 工具的场景，这种「按需加载」模式尤其重要。它对应 API 的 `tool-search-2025-01-16` beta header。

### 2.4 工具过滤管道

从注册到最终可用，工具经过多层过滤：

```
getAllBaseTools()
  → getTools(permissionContext)
    → 应用 CLAUDE_CODE_SIMPLE 模式（只保留 Bash/Read/Edit）
    → 应用 REPL 模式（隐藏基础工具，显示 REPL 包装器）
    → filterToolsByDenyRules()（移除被规则禁止的工具）
    → .isEnabled() 过滤
  → assembleToolPool(permissionContext, mcpTools)
    → 合并内置工具和 MCP 工具
    → 按名称去重（内置优先）
    → 排序以保持 prompt cache 稳定性
```

最后一步的排序值得注意——工具列表的顺序会影响 prompt cache 的命中率，Claude Code 通过稳定排序来最大化缓存复用。

---

## 三、Agent Loop：对话引擎的核心

### 3.1 主循环结构

`src/query.ts` 是整个对话引擎的心脏。入口函数 `query()` 是一个 **AsyncGenerator**：

```typescript
export async function* query(params: QueryParams): AsyncGenerator<
  StreamEvent | RequestStartEvent | Message | TombstoneMessage | ToolUseSummaryMessage,
  Terminal
>
```

使用 Generator 而非普通 async 函数是一个关键设计决策——它允许调用方逐步消费事件流，实现真正的流式体验。

**主循环每轮（`queryLoop`）的执行步骤：**

1. **记忆预取** — 异步开始相关记忆的检索
2. **技能发现预取** — 实验性的技能自动发现
3. **发射流开始事件** — `yield { type: 'stream_request_start' }`
4. **工具结果预算控制** — `applyToolResultBudget()` 限制每条消息的工具结果大小
5. **Snip 压缩** — 可选的消息片段裁剪（`HISTORY_SNIP` 特性）
6. **Microcompact** — 每轮的工具结果微压缩
7. **Context Collapse** — 可选的上下文折叠
8. **Auto-Compact 检查** — token 超限时触发完整对话压缩
9. **API 调用** — 带流式输出的模型查询
10. **工具执行** — 并发/串行执行工具块
11. **Stop Hook 处理** — 检查是否触发停止钩子
12. **循环判断** — 有工具调用则继续，否则退出

伪代码表达：

```
while true:
  messages = microcompact(messages)
  if shouldAutoCompact(messages):
    messages = autoCompact(messages)
  
  for event in queryModelWithStreaming(messages, tools):
    yield event
    collect toolUseBlocks
  
  if toolUseBlocks.empty():
    break  // 没有工具调用，对话结束
  
  toolResults = runTools(toolUseBlocks)
  messages.append(toolResults)
  
  if tokenBudgetExhausted():
    break  // 预算用尽
```

### 3.2 依赖注入

`src/query/deps.ts` 通过依赖注入实现可测试性：

```typescript
export type QueryDeps = {
  callModel: typeof queryModelWithStreaming
  microcompact: typeof microcompactMessages
  autocompact: typeof autoCompactIfNeeded
  uuid: () => string
}
```

生产环境用 `productionDeps()`，测试可以注入 mock。这是一个简洁务实的 DI 实现——没有用 IoC 容器，只用了 TypeScript 的类型系统。

### 3.3 上下文压缩：三级压缩体系

这是 Claude Code 最精巧的工程之一。面对有限的上下文窗口（即使是 1M context），长时间编码会话必然需要压缩。Claude Code 设计了三级压缩：

**第一级：Microcompact（每轮微压缩）**

`src/services/compact/microCompact.ts` 在每次 API 调用前执行：

- 针对特定工具的结果进行压缩：FileRead、Bash、Grep、Glob、WebSearch、WebFetch、FileEdit、FileWrite
- 基于时间的内容清理（`TIME_BASED_MC`）：超过阈值的旧工具结果替换为 `'[Old tool result content cleared]'`
- 缓存感知的微压缩（`CACHED_MICROCOMPACT`）：利用 prompt cache 断点检测，只重发必要的编辑

**第二级：Auto-Compact（自动全量压缩）**

`src/services/compact/autoCompact.ts` 在 token 接近上限时触发：

```
触发条件 = tokenCount > (contextWindow - MAX_OUTPUT_TOKENS - AUTOCOMPACT_BUFFER)
  其中 MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20,000
       AUTOCOMPACT_BUFFER_TOKENS = 13,000
```

执行流程：
1. **先尝试 Session Memory Compaction**（轻量级，优先）
2. 失败则触发**完整对话摘要**
3. 剥离图片（避免摘要时 prompt too long）
4. 按 API 轮次分组消息 (`groupMessagesByApiRound()`)
5. 调用 Claude 生成对话摘要
6. **恢复关键文件**（最多 5 个文件，每个 5KB）
7. **恢复技能内容**（25KB 预算）
8. 执行 PostCompact hooks
9. 插入压缩边界消息

**熔断器设计**：连续 3 次压缩失败后停止尝试（`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`），避免死循环。

**第三级：手动 /compact 命令**

用户可以随时触发，缓冲区更小（`MANUAL_COMPACT_BUFFER_TOKENS = 3,000`）。

**Token 预警系统**：

```typescript
calculateTokenWarningState(tokenUsage, model) → {
  percentLeft,
  isAboveWarningThreshold,    // 黄色警告
  isAboveErrorThreshold,       // 红色警告
  isAboveAutoCompactThreshold, // 触发自动压缩
  isAtBlockingLimit            // 阻止继续
}
```

### 3.4 Token 预算追踪

`src/query/tokenBudget.ts` 实现了 per-agent 的 token 预算控制：

```typescript
COMPLETION_THRESHOLD = 0.9  // 使用 90% 预算时停止
DIMINISHING_THRESHOLD = 500 // 连续 3 轮产出 < 500 token 判定为收益递减
```

当检测到收益递减（agent 在原地打转），系统会主动停止，而不是浪费剩余预算。

### 3.5 API 集成

`src/services/api/claude.ts` 是与 Anthropic API 的对接层：

- **Prompt Caching**：支持标准和 1 小时 TTL 缓存（`should1hCacheTTL()`）
- **Beta Headers 管理**：26 个 beta header，包括 `CONTEXT_1M_2025_08_07`、`FAST_MODE_2026_02_01`、`TOKEN_EFFICIENT_TOOLS_2026_03_28` 等
- **自动重试**：指数退避重试（`withRetry()`）
- **Reactive Compact**：遇到 `prompt_too_long` 错误时自动触发压缩重试
- **Usage 追踪**：累计每个模型的 token 使用量

### 3.6 工具编排

`src/services/tools/toolOrchestration.ts` 中的 `runTools()` 是工具调用的调度器：

```typescript
export async function* runTools(
  toolUseBlocks, assistantMessages, canUseTool, toolUseContext
): AsyncGenerator<MessageUpdate, void>
```

**并发策略**：
- 将工具调用分批：`isConcurrencySafe()` 为 true 的并发，其余串行
- 并发上限：`CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY = 10`
- 典型的并发安全工具：FileRead, Grep, Glob（只读操作）
- 典型的串行工具：FileEdit, FileWrite, Bash（有副作用）

每个工具执行经过完整管道：输入校验 → 权限检查 → PreToolUse Hook → 执行 → PostToolUse Hook → 结果处理 → 大结果持久化（> 20KB 存磁盘）。

---

## 四、多 Agent 协调：四种 Agent 派生模式

这是 Claude Code 架构中最令人印象深刻的部分。系统支持四种不同的 agent 派生模式，每种针对不同场景。

### 4.1 Fork Subagent（fork 子 agent）

**文件**：`src/tools/AgentTool/forkSubagent.ts`
**特性门控**：`FORK_SUBAGENT`

核心创新在于 **prompt cache 复用**。Fork 子 agent 继承父 agent 的完整对话 + 系统提示，并且：

- 所有 fork 使用相同的 `FORK_PLACEHOLDER_RESULT = "Fork started — processing in background"` 作为工具结果占位符
- 这使得所有 fork 的 API 请求前缀**字节级相同**，从而命中 prompt cache
- 每个 fork 只在最后的文本块中有差异（具体任务指令）

**工程意义**：如果你派生 5 个子 agent 做并行调研，它们共享 prompt cache，实际 API 成本只比单个 agent 多一点。这是一个非常聪明的优化。

### 4.2 Async Background Agent（异步后台 agent）

**文件**：`src/tasks/LocalAgentTask/LocalAgentTask.tsx`

- 在后台运行，不阻塞父 agent
- 自动拒绝权限请求（`shouldAvoidPermissionPrompts`）——后台 agent 不能弹交互对话框
- 通过通知队列报告结果（`enqueuePendingNotification()`）
- 完成时生成 XML 通知：

```xml
<task-notification>
  <task-id>{agentId}</task-id>
  <status>completed|failed|killed</status>
  <summary>{摘要}</summary>
  <result>{agent 最终输出}</result>
  <usage>
    <total_tokens>N</total_tokens>
    <tool_uses>N</tool_uses>
    <duration_ms>N</duration_ms>
  </usage>
</task-notification>
```

### 4.3 In-Process Teammate（进程内队友）

**文件**：`src/utils/swarm/inProcessRunner.ts`

这是 "Agent Swarm" 的实现基础：

- 在同一 Node.js 进程中运行，通过 `AsyncLocalStorage` 做上下文隔离
- **邮箱系统**（`src/utils/teammateMailbox.ts`）：teammate 以 500ms 间隔轮询 `readMailbox()`
- 支持消息类型：纯文本、shutdown_request、shutdown_response、plan_approval_response
- 权限请求可以"冒泡"到 leader 的终端（`permissionMode='bubble'`）
- 通过 `SendMessageTool` 进行 agent 间通信

### 4.4 Remote Agent（远程 agent）

**文件**：`src/tasks/RemoteAgentTask/RemoteAgentTask.tsx`

- 在独立的 CCR（Cloud Code Runner）会话中运行
- 通过 `pollRemoteSessionEvents()` 轮询完成状态
- 适用于需要独立环境的长时间任务

### 4.5 上下文隔离

`src/utils/forkedAgent.ts` 中的 `createSubagentContext()` 精细控制了什么状态被隔离、什么被共享：

| 状态类型 | 策略 |
|----------|------|
| `readFileState`（文件缓存） | 克隆（独立副本） |
| `abortController` | 链接到父（父 abort 时子也 abort） |
| `localDenialTracking` | 独立（每个 agent 单独的拒绝计数器） |
| `updateAttributionState` | 共享（React 队列安全） |
| `fileReadingLimits` | 冻结（只读共享） |

### 4.6 Coordinator Mode

**文件**：`src/coordinator/coordinatorMode.ts`
**特性门控**：`COORDINATOR_MODE`

Coordinator 模式将 Claude 变成一个**纯调度者**：

- 只允许 Agent、TaskStop、SendMessage、SyntheticOutput 四种工具
- Coordinator 自己不写代码——它只负责拆分任务、分派 worker、综合结果
- Worker 完成的通知以 `<task-notification>` XML 块注入 coordinator 的对话

系统提示明确要求：**"Never thank workers"**（不要感谢 worker）——因为 task notification 只是内部信号，不需要社交礼仪。这个小细节体现了对 token 效率的极致追求。

### 4.7 Worktree 隔离

**文件**：`src/utils/worktree.ts`

Agent 可以在 git worktree 中运行，获得完整的代码库副本而不影响主工作区：

1. 校验 slug（字母数字，最长 64 字符，禁止 `..` 和路径穿越）
2. 创建 `.claude/worktrees/{slug}/` 目录
3. 执行 `git worktree add`
4. 符号链接 `node_modules` 等大目录（避免重复安装）

Fork 子 agent 进入 worktree 后收到一个注意事项：

> "You've inherited context from parent at {parentCwd}. You're in isolated worktree at {worktreeCwd} — same repo, separate copy. Translate inherited paths. Re-read files before editing."

---

## 五、安全架构：六层纵深防御

### 5.1 权限模型

`src/utils/permissions/PermissionMode.ts` 定义了 6 种权限模式：

| 模式 | 说明 |
|------|------|
| `default` | 标准模式，敏感操作需确认 |
| `plan` | 规划模式，限制操作范围 |
| `acceptEdits` | 自动接受工作目录内的文件编辑 |
| `bypassPermissions` | 绕过权限检查（高风险） |
| `auto` | ML 分类器自动判断（仅内部） |
| `dontAsk` | 不询问直接拒绝 |

**规则来源（优先级从高到低）：**
1. `policySettings` — 企业管控策略（最高优先级）
2. `flagSettings` — CLI 参数
3. `projectSettings` — 项目级 `.claude/settings.local.json`
4. `userSettings` — 用户级 `~/.claude/settings.json`
5. `localSettings` — 本地会话设置
6. `command` — 运行时命令
7. `session` — 会话级规则

### 5.2 权限决策管道

权限检查是一个 **10 步管道**：

1. **输入校验** — `Tool.validateInput()` Zod schema 校验
2. **安全检查** — Bash 命令的静态分析（注入检测、元字符检查）
3. **危险模式检测** — 拦截高危模式（解释器链、系统调用）
4. **策略执行** — deny 规则优先检查
5. **规则匹配** — 对 allow/deny/ask 规则做精确和通配符匹配
6. **工具特定逻辑** — 每个工具的 `checkPermissions()` 自定义检查
7. **分类器决策** — Auto 模式下 ML 模型评估安全性
8. **Hook 执行** — 用户自定义钩子可修改决策
9. **用户确认** — 需要时弹出交互确认
10. **沙箱限制** — 检查文件系统/网络沙箱规则

**核心设计原则：Fail-Closed**——任何环节出错，默认拒绝。

### 5.3 Bash 命令安全：23 种攻击向量检测

`src/tools/BashTool/bashSecurity.ts` 是整个安全系统中最复杂的模块，检测 23 种攻击向量：

```
1.  INCOMPLETE_COMMANDS        — 不完整的命令
2.  JQ_SYSTEM_FUNCTION        — jq 的 system() 函数调用
3.  JQ_FILE_ARGUMENTS         — jq 的文件参数注入
4.  OBFUSCATED_FLAGS          — 混淆的命令行参数
5.  SHELL_METACHARACTERS      — Shell 元字符
6.  DANGEROUS_VARIABLES       — 危险的环境变量
7.  NEWLINES                  — 换行注入
8.  COMMAND_SUBSTITUTION      — 命令替换 $(, ${}, $[])
9.  INPUT_REDIRECTION         — 输入重定向 <, >(
10. OUTPUT_REDIRECTION        — 输出重定向 >, >>
11. IFS_INJECTION             — IFS 变量注入
12. GIT_COMMIT_SUBSTITUTION   — git commit 消息中的命令替换
13. PROC_ENVIRON_ACCESS       — /proc/environ 访问
14. MALFORMED_TOKEN_INJECTION — 畸形 token 注入
15. BACKSLASH_ESCAPED_WHITESPACE — 反斜杠转义空白
16. BRACE_EXPANSION           — 大括号展开
17. CONTROL_CHARACTERS        — 控制字符
18. UNICODE_WHITESPACE        — Unicode 空白字符
19. MID_WORD_HASH             — 词中 # 号
20. ZSH_DANGEROUS_COMMANDS    — Zsh 特有危险命令
21. BACKSLASH_ESCAPED_OPERATORS — 反斜杠转义运算符
22. COMMENT_QUOTE_DESYNC      — 注释引号失同步
23. QUOTED_NEWLINE            — 引号内换行
```

**命令注入防护**的细节值得深究：

- **随机盐值**：解析命令时生成 8 字节随机数作为占位符盐，防止通过字面占位符字符串进行注入
- **引号内容提取**：分离引号内外内容，跟踪引号上下文（单引号、双引号、转义）
- **重定向分析**：只接受静态重定向目标，拒绝包含 `$vars`、`$(cmd)`、`!history`、`~expansion`、glob `*?[]` 的目标
- **行继续处理**：将 `\<换行>` 续行合并后再解析，防止 `tr\<NL>aceroute` → `traceroute` 绕过
- **危险命令黑名单**：Python、Node、Ruby 等解释器；npm/yarn/pnpm 的 run 命令；ssh、eval、exec、sudo 等

### 5.4 Auto-Mode 分类器

`src/utils/permissions/yoloClassifier.ts` 实现了基于 ML 的自动权限决策：

- 进入 Auto 模式时，**自动剥离危险的宽泛规则**：例如 `Bash` 级别的全局 allow、`python:*` 这样的解释器通配符
- 用 Claude 模型作为分类器，分析每个操作的安全性
- 分类器输出 `{ behavior: 'allow'|'deny', reason, confidence }`
- **出错时 fail-closed**（拒绝）
- 只读工具（FileRead、Grep、Glob 等）跳过分类器
- 每 30 分钟自动刷新一次 gate

### 5.5 沙箱系统

`src/utils/sandbox/sandbox-adapter.ts` 封装了 `@anthropic-ai/sandbox-runtime`：

**文件系统沙箱：**
- `allowWrite`：可写路径白名单
- `denyWrite`：受保护路径黑名单（`.claude/`, `.git/`, 敏感文件）
- `denyWithinAllow`：白名单路径中的黑名单例外

**网络沙箱：**
- `allowManagedDomainsOnly`：只允许白名单域名
- `allowedDomains`：允许的主机/模式
- `deniedDomains`：黑名单域名

**默认保护的危险文件：**
```
.gitconfig, .gitmodules, .bashrc, .bash_profile, .zshrc,
.zprofile, .profile, .ripgreprc, .mcp.json, .claude.json
```

### 5.6 路径安全

`src/utils/permissions/pathValidation.ts` 实现了多层路径安全检查：

- **大小写不敏感比较**（防止 macOS/Windows 绕过）
- **路径穿越检测**（`..` 模式）
- **符号链接解析**（follow symlink 到真实路径再校验）
- **UNC 路径检测**（防止 Windows NTLM hash 泄漏）
- **空字节检测**
- **URL 编码穿越防护**（`%2e%2e%2f`）
- **Unicode 规范化攻击防护**（全角字符）

---

## 六、隐藏功能：未来产品路线图的预览

### 6.1 Buddy — AI 电子宠物

**目录**：`src/buddy/`

这可能是整个泄漏中最出人意料的发现。Claude Code 内置了一个完整的**电子宠物系统**。

**CompanionSprite.tsx** 渲染宠物精灵，**companion.ts** 是宠物生成引擎，使用 Mulberry32 哈希的确定性 PRNG。

**16 种宠物物种**：duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk

**稀有度系统**：
- Common（60%）
- Uncommon（25%）
- Rare（10%）
- Epic（4%）
- Legendary（1%）
- **Shiny 变体**：1% 概率获得闪光宠物

**属性系统**：每只宠物有 5 项属性——DEBUGGING、PATIENCE、CHAOS、WISDOM、SNARK，随稀有度随机生成。

**装饰品**：
- 眼型：`·`, `✦`, `×`, `◉`, `@`, `°`
- 帽子：crown, tophat, propeller, halo, wizard, beanie, tinyduck

**生成机制**：宠物的"骨骼"（species, eyes, hat, stats）从 userId hash 确定性生成，持久化的只有"灵魂"（name, personality, hatched timestamp）。这意味着换设备登录同一账号，会得到同一只宠物。

**发布时间线**：代码中有一个彩虹色的 teaser 窗口——2026 年 4 月 1-7 日在终端显示彩虹色的 `/buddy` 提示。这说明这个功能原定在愚人节前后公开。

**特性门控**：`feature('BUDDY')`

### 6.2 Kairos — 长期记忆系统

**目录**：`src/memdir/`

Kairos 是 Claude Code 从「无状态对话」进化为「有记忆的伙伴」的关键基础设施。

**四种记忆类型**：
| 类型 | 用途 |
|------|------|
| `user` | 用户角色、偏好、知识水平 |
| `feedback` | 用户对工作方式的反馈（纠正 + 确认） |
| `project` | 项目进展、目标、截止日期 |
| `reference` | 外部系统中信息的指针 |

**记忆存储**：文件系统上的 Markdown 文件，带 YAML frontmatter（name, description, type），由 MEMORY.md 索引文件汇总（200 行 / 25KB 限制）。

**记忆检索**：`findRelevantMemories.ts` 使用 **Claude Sonnet** 作为侧查询，语义选择最多 5 条相关记忆。不是简单的关键词匹配，而是调用一次 LLM 来判断哪些记忆与当前上下文最相关。

**Kairos 模式（助手模式）特有：**
- 每日追加式日志：`logs/YYYY/MM/YYYY-MM-DD.md`
- 夜间 `/dream` 技能：自动蒸馏当天日志为长期记忆
- 会话恢复：支持 `--session-id` 和 `--continue` 标志
- 频道支持（`KAIROS_CHANNELS`）
- GitHub webhook 集成（`KAIROS_GITHUB_WEBHOOKS`）
- 推送通知（`KAIROS_PUSH_NOTIFICATION`）

**团队记忆**（`TEAMMEM` feature）：
- 共享记忆目录 `<auto-mem>/team/`
- 符号链接逃逸检测
- 路径穿越防护

**安全防护**：
- 空字节检测
- URL 编码穿越防护
- Unicode 规范化攻击防护
- 悬挂符号链接检测
- 符号链接循环检测
- 进程 nonce 防止文件覆盖竞争

### 6.3 Ultraplan — 多 Agent 规划与执行

**文件**：`src/commands/ultraplan.tsx`（450+ 行）

Ultraplan 是一个自动化的多 agent 规划系统，配合 Claude Code 的 Web 版本（CCR）使用：

1. `/ultraplan` 启动一个远程 CCR 会话
2. 浏览器中的 PlanModal 让用户审查和优化计划（"Reject" 或 "Approve"）
3. 选择本地或远程执行
4. 结果自动归档，附带会话 URL

**技术细节**：
- 模型选择通过 `tengu_ultraplan_model` flag 配置（默认 Opus 4.6）
- 30 分钟超时
- 跟踪 'running'/'needs_input' 阶段
- PR 自动集成

### 6.4 Voice — 语音输入模式

**目录**：`src/voice/`

按住说话（hold-to-talk）的语音输入功能：

- 要求 Anthropic OAuth 认证（API key 不支持）
- 依赖 SoX 进行音频捕获
- 可配置的 STT 语言
- 紧急关闭开关：`tengu_amber_quartz_disabled` GrowthBook flag
- 快捷键：空格（可自定义）
- 分平台的麦克风权限指引

### 6.5 Moreright — 内部专属模块

**目录**：`src/moreright/`

外部版本只有一个 stub：

```typescript
{
  onBeforeQuery: async () => true,
  onTurnComplete: async () => {},
  render: () => null
}
```

注释明确说明："the real hook is internal only"——这是一个只在 Anthropic 内部版本中存在的功能钩子。

### 6.6 Feature Flag 体系

整个系统通过 GrowthBook 管理 feature flags：

| Flag 命名模式 | 示例 | 说明 |
|---------------|------|------|
| `tengu_*` | `tengu_amber_quartz_disabled` | 运行时动态 flag |
| `feature('*')` | `feature('BUDDY')` | 编译时 flag（Bun bundle） |

有趣的 flag 命名规律：`tengu_` 前缀后跟两个英文单词（通常是颜色/材质 + 动物/植物/物品），如 `tengu_herring_clock`（团队记忆）、`tengu_coral_fern`（过去上下文搜索）、`tengu_passport_quail`（记忆提取后台 agent）。这种命名策略使得 flag 名称在代码搜索中高度唯一，同时不泄漏功能含义。

---

## 七、IDE 桥接与远程控制

### 7.1 双路径 Bridge 架构

Claude Code 的 IDE 集成通过 Remote Control 机制实现，有两套实现路径：

**v1 — 环境 API（`src/bridge/replBridge.ts`，100KB）：**
- 注册环境 → 轮询工作 → 生成会话 → WebSocket 连接
- 完整生命周期管理：确认、心跳、注销
- 多会话支持，worktree 隔离

**v2 — 无环境 API（`src/bridge/remoteBridgeCore.ts`，39KB）：**
- 直接创建会话，不经过 Environments API
- 更简单：POST /code/sessions → JWT → SSE/CCRClient
- 主动 token 刷新（无独立心跳）
- 通过 `tengu_bridge_repl_v2` GrowthBook flag 控制

### 7.2 通信协议

- WebSocket 地址：`wss://.../v1/sessions/ws/{sessionId}/subscribe`
- 认证消息：`{ type: 'auth', credential: { type: 'oauth', token: '...' } }`
- 消息格式：NDJSON 流
- 支持权限请求/响应的桥接

### 7.3 可信设备

`src/bridge/trustedDevice.ts` 实现设备信任机制：
- 90 天滚动过期
- 登录时注册设备
- Keychain 持久化存储

---

## 八、插件与技能系统

### 8.1 插件架构

`src/plugins/builtinPlugins.ts` 定义了插件的组件模型：

| 组件类型 | 说明 |
|----------|------|
| Commands | 自定义斜杠命令 |
| Agents | 自主 agent |
| Skills | 技能定义 |
| Hooks | 生命周期钩子 |
| MCP Servers | Model Context Protocol 服务 |
| LSP Servers | Language Server Protocol 服务 |
| Output Styles | 自定义终端渲染 |

插件错误处理使用 15 种类型的**判别联合**（discriminated union），覆盖路径/文件、Git 认证/超时、网络、manifest 校验、MCP/LSP 配置等场景。

### 8.2 内置技能

`src/skills/bundled/` 包含 17+ 内置技能：

| 技能 | 说明 | 门控 |
|------|------|------|
| update-config | 配置 Claude Code | 公开 |
| keybindings | 自定义快捷键 | 公开 |
| verify | 验证代码正确性 | 公开 |
| debug | 调试工具 | 公开 |
| simplify | 代码审查/简化 | 公开 |
| batch | 批量操作 | 公开 |
| stuck | 解困助手 | 公开 |
| remember | 保存到记忆系统 | 公开 |
| lorem-ipsum | Lorem Ipsum 生成 | 隐藏彩蛋 |
| /dream | 记忆蒸馏 | KAIROS |
| /hunter | Bug 猎手 | REVIEW_ARTIFACT |
| /loop | 循环任务 | AGENT_TRIGGERS |
| /schedule | 定时远程 agent | AGENT_TRIGGERS_REMOTE |
| /claude-api | Claude API 集成 | BUILDING_CLAUDE_APPS |
| /run-skill-generator | 技能生成器 | RUN_SKILL_GENERATOR |

技能可以指定模型覆盖、工具白名单、系统提示，支持 `userInvocable: false` 从用户列表中隐藏。

---

## 九、有趣的工程细节

### 9.1 技术选型

- **运行时**：Node.js（要求 >= 18），但使用 Bun 的 bundler 打包（`bun:bundle` 特性门控的编译时死代码消除）
- **UI 框架**：Ink（React 的终端渲染器），而且是**高度定制的 fork**——`src/ink/` 包含 45+ 文件，包括自定义的 reconciler、布局引擎、键盘输入处理
- **Schema 校验**：Zod（而非 Joi/Yup），与 TypeScript 类型系统深度集成
- **状态管理**：自研的 `createStore()`（类 Zustand 模式），而非 Redux
- **依赖管理**：**零运行时依赖**——全部 bundle 进单文件，仅 Sharp 图片处理为 optional
- **包管理**：Bun（`bun.lock`）

### 9.2 代码质量亮点

**不可变权限上下文**：`ToolPermissionContext` 使用 `DeepImmutable` 类型标记，防止运行时意外修改权限状态。这是 TypeScript 类型系统的精妙运用。

**防缓存抖动的系统提示**：`systemPromptSection()` 创建 memoized 的提示段落，只在 `/clear` 或 `/compact` 时失效。对于频繁变化的部分（如日期），使用 `DANGEROUS_uncachedSystemPromptSection()` 并在命名中标记危险性。

**错误 ID 系统**：`src/constants/errorIds.ts` 为每种错误分配唯一数字 ID（当前到 346），确保错误追踪的确定性。

**tool result 大小预算**：

```typescript
DEFAULT_MAX_RESULT_SIZE_CHARS: 50,000
MAX_TOOL_RESULT_TOKENS: 100,000
MAX_TOOL_RESULT_BYTES: 400,000
MAX_TOOL_RESULTS_PER_MESSAGE_CHARS: 200,000
```

这些限制防止单个工具结果占用过多上下文窗口。

### 9.3 代码质量槽点

**巨型文件**：
- `src/components/REPL.tsx`：895KB
- `src/bridge/bridgeMain.ts`：115KB
- `src/bridge/replBridge.ts`：100KB
- `src/services/mcp/auth.ts`：88KB
- `src/cli/print.ts`：212KB
- `src/ink/ink.tsx`：251KB

这些文件远超通常的模块大小建议。895KB 的 REPL 组件说明 UI 逻辑没有被充分拆分。

**上帝对象**：`src/bootstrap/state.ts` 的全局状态包含 100+ 字段，尽管有 "DO NOT ADD MORE STATE" 的注释，但 Kairos、prompt cache 控制、SDK beta、remote mode 等新增状态仍在不断膨胀。

**循环依赖的 workaround**：部分模块使用运行时 `require()` 而非静态 `import` 来打破循环依赖（如 TeamCreateTool、SendMessageTool）。这是 ESM 模块体系中的技术债。

**OAuth 配置的硬编码**：`src/constants/oauth.ts` 中直接硬编码了 `CLIENT_ID: '9d1c250a-e61b-44d9-88ed-5944d1962f5e'` 和各种端点 URL。虽然不是安全漏洞（OAuth 2.0 的 public client ID 本身是公开的），但与配置外部化的最佳实践相违。

### 9.4 Beta Headers 揭示的 API 能力

`src/constants/betas.ts` 列出了 26 个 beta header，揭示了 Anthropic API 的内部能力演进：

```
CLAUDE_CODE_20250219
INTERLEAVED_THINKING_2025_05_14
CONTEXT_1M_2025_08_07
CONTEXT_MANAGEMENT_2025_06_27
STRUCTURED_OUTPUTS_2025_12_15
WEB_SEARCH_2025_03_05
TASK_BUDGETS_2026_03_13
PROMPT_CACHING_SCOPE_2026_01_05
FAST_MODE_2026_02_01
REDACT_THINKING_2026_02_12
TOKEN_EFFICIENT_TOOLS_2026_03_28
ADVISOR_2026_03_01
```

这些日期几乎就是 Anthropic API 的内部路线图。`TOKEN_EFFICIENT_TOOLS_2026_03_28` 说明就在泄漏前 3 天，工具调用的 token 效率优化刚上线。`ADVISOR_2026_03_01` 暗示了一个尚未公开的 "顾问" 模式。

### 9.5 API 限制数字

```typescript
API_IMAGE_MAX_BASE64_SIZE: 5 MB
IMAGE_MAX_WIDTH / HEIGHT: 2000px
PDF_TARGET_RAW_SIZE: 20 MB
API_PDF_MAX_PAGES: 100
PDF_MAX_PAGES_PER_READ: 20
API_MAX_MEDIA_PER_REQUEST: 100
```

### 9.6 二进制文件检测

`src/constants/files.ts` 中的二进制扩展名集合包含 112 种格式，覆盖图片、视频、音频、归档、可执行文件、文档、字体、字节码、数据库、设计/3D、Flash 等类别。还有一个内容级检测：如果前 8KB 中有空字节或 > 10% 非打印字符，也判定为二进制。

---

## 十、对行业的意义

### 10.1 AI 编程工具的复杂度已经远超想象

外界通常将 AI 编程助手视为 "LLM + 工具调用" 的简单组合。Claude Code 的源码告诉我们，实际的工程复杂度比这高出一个数量级。仅权限系统就有 24 个文件、250KB+ 代码；仅上下文压缩就有三级体系。这不是一个周末项目能复制的。

### 10.2 多 Agent 编排即将成为行业标配

Claude Code 同时支持 4 种 agent 派生模式（Fork、Async、In-Process、Remote），加上 Coordinator Mode 和 Agent Swarm，说明 Anthropic 已经在多 agent 协调上积累了大量实践经验。Fork Subagent 的 prompt cache 复用更是一个直接的竞争优势——它使得并行 agent 的成本接近线性而非倍数增长。

### 10.3 安全投入将成为护城河

6 层纵深防御、23 种 Bash 攻击向量检测、ML 分类器辅助决策——这些安全工程投入不是竞争对手能快速复制的。在 AI agent 能直接执行代码的场景下，安全不是可选项，而是决定产品可用性的基础。

### 10.4 产品方向：从工具到伙伴

Buddy 电子宠物 + Kairos 长期记忆 + Voice 语音模式 + Proactive Mode，这些隐藏功能共同指向一个清晰的愿景：Claude Code 不再只是一个"你问我答"的编程工具，而是一个**持续在线、有记忆、有个性、主动工作**的开发伙伴。

这与 Cursor、Windsurf 等竞品的"编辑器嵌入"路线形成了鲜明的差异化。Claude Code 选择了"独立 agent"的路线，而这些隐藏功能表明，Anthropic 正在把这个 agent 打造成一个有持久性和情感连接的存在。

### 10.5 对开源社区的启示

虽然这是一次意外泄漏，但暴露的架构模式——延迟工具加载、prompt cache 优化、三级上下文压缩、fork-and-cache 子 agent——这些都是经过生产验证的设计。开源 AI 编程工具可以从中学到大量经验，而不必重新踩坑。

---

## 十一、我们的判断

1. **短期影响有限**。源码暴露的是架构设计而非可直接利用的安全漏洞。OAuth client ID 本身就是公开的，API key 也未泄漏。竞争对手能看到设计思路，但缺乏 Anthropic 的 API 能力和模型优势来复制。

2. **长期价值在于行业标杆效应**。这份源码将成为 AI 编程工具架构的参考实现。权限系统、上下文压缩、多 agent 编排的设计模式将影响整个行业。

3. **Buddy 会是一次有趣的营销事件**。一个 AI 编程工具内置电子宠物，这在产品差异化上是一个聪明的手笔。16 种物种、稀有度系统、Shiny 变体——这些游戏化元素可能会增加用户粘性。

4. **Kairos 是真正的战略棋子**。长期记忆使 Claude Code 能在多次会话间积累上下文，理解用户偏好，追踪项目进度。这是把 AI 助手从「无状态工具」变成「有状态伙伴」的关键能力。一旦用户的工作习惯、项目知识、反馈偏好都沉淀在 Kairos 中，迁移成本将显著提高。

5. **工程团队的速度令人印象深刻，但技术债也在积累**。895KB 的 REPL 组件、100+ 字段的全局状态、循环依赖的 runtime require workaround——这些都是快速迭代的代价。在当前的 AI 工具军备竞赛中，这种 trade-off 是合理的，但终究需要偿还。

6. **这次泄漏对 Anthropic 的 npm 发布流程是一个教训**。`prepare` 脚本中有 `AUTHORIZED` 环境变量检查来防止意外发布，但 source map 的遗留说明 CI/CD 流程中缺少对产物的完整性检查。这也提醒了整个行业：你的 npm 包里可能有你不知道的东西。

---

*本文基于 Claude Code v2.1.88 source map 泄漏的源码分析。所有引用的文件路径、函数名、常量值均来自实际源码阅读。分析截至 2026 年 3 月 31 日。*
