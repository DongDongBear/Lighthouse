---
title: "Claude Code 深读（四）：Skills、Commands 与 MCP 如何共同注入 Runtime"
description: "逐行拆解 Claude Code 的 Skills 加载器、Command 注册流程、MCP transport 实现与能力分层架构。"
date: "2026-03-31"
---

# Claude Code 深读（四）：Skills、Commands 与 MCP 如何共同注入 Runtime

:::note[系列导航]
1. [系统总览与启动序列](../01-source-analysis/) — 入口、全局状态、模块依赖
2. [QueryEngine 与 query.ts](../02-query-engine-deep-dive/) — 会话主循环、上下文压缩
3. [Tool 协议、权限系统与工具调度](../03-tools-permissions-orchestration/) — 工具协议、23 种攻击检测
4. **Skills/Commands/MCP 注入 Runtime**（本文）— 能力加载、命令注册、MCP transport
5. [Anthropic 内部如何使用 Skills](../05-skills-lessons/) — 官方实践
6. [源码泄漏深度技术解读](../06-source-leak-deep-analysis/) — 全景式硬核分析
:::

---

## 一、四类能力来源

Claude Code 的能力来源不是"一锅粥"，而是分成四类，各有不同的注入路径：

```text
[1] Built-in       — 内建 commands / tools / bundled skills
[2] File-based     — .claude/skills, 用户配置目录, 项目设置
[3] Plugin-based   — 插件注入 commands / skills / hooks / MCP / LSP
[4] MCP-based      — 外部 server 提供 tools / resources / auth flows
```

注入后进入不同层级：

| 层级 | 接收对象 | 面向 |
|------|---------|------|
| 控制面 | commands | 用户显式操作 |
| 执行面 | tools | 模型在 query loop 中调用 |
| 任务模板层 | skills | 包装 prompt + metadata + constraints |
| 远程能力层 | MCP | 外部 server 提供的工具/资源 |

---

## 二、Commands：控制面注册中心

### 2.1 Command 类型（`types/command.ts`，行 175-206）

```typescript
export type CommandBase = {
  name: string
  description: string
  hasUserSpecifiedDescription?: boolean
  isEnabled?: () => boolean        // 默认 true
  isHidden?: boolean               // 默认 false
  aliases?: string[]
  isMcp?: boolean
  argumentHint?: string
  whenToUse?: string
  version?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  loadedFrom?: LoadedFrom          // 'commands_DEPRECATED' | 'skills' | 'plugin' | 'managed' | 'bundled' | 'mcp'
  kind?: 'workflow'
  immediate?: boolean
  isSensitive?: boolean
  availability?: CommandAvailability[]
}

export type Command = CommandBase & (PromptCommand | LocalCommand | LocalJSXCommand)
```

### 2.2 内建命令清单（`commands.ts`，行 258-346）

`COMMANDS()` 函数（memoized）注册的命令：

```text
addDir, advisor, agents, branch, btw, chrome, clear, color, compact, config,
copy, desktop, context, contextNonInteractive, cost, diff, doctor, effort,
exit, fast, files, heapDump, help, ide, init, keybindings, installGitHubApp,
installSlackApp, mcp, memory, mobile, model, outputStyle, remoteEnv, plugin,
pr_comments, releaseNotes, reloadPlugins, rename, resume, session, skills,
stats, status, statusline, stickers, tag, theme, feedback, review,
ultrareview, rewind, securityReview, terminalSetup, upgrade, extraUsage,
extraUsageNonInteractive, rateLimitOptions, usage, usageReport, vim
```

**Feature-gated 命令**（条件导入）：

| 命令 | Feature Gate |
|------|-------------|
| `webCmd` | `CCR_REMOTE_SETUP` |
| `forkCmd` | `FORK_SUBAGENT` |
| `buddy` | `BUDDY` |
| `proactive` | `PROACTIVE` \| `KAIROS` |
| `briefCommand` | `KAIROS` \| `KAIROS_BRIEF` |
| `assistantCommand` | `KAIROS` |
| `bridge` | `BRIDGE_MODE` |
| `voiceCommand` | `VOICE_MODE` |
| `forceSnip` | `HISTORY_SNIP` |
| `workflowsCmd` | `WORKFLOW_SCRIPTS` |
| `ultraplan` | `ULTRAPLAN` |
| `torch` | `TORCH` |
| `peersCmd` | `UDS_INBOX` |

### 2.3 命令合并顺序（`loadAllCommands()`，行 449-469）

```typescript
return [
  ...bundledSkills,           // getBundledSkills() — 内置技能
  ...builtinPluginSkills,     // getBuiltinPluginSkillCommands() — 内置插件技能
  ...skillDirCommands,        // getSkillDirCommands(cwd) — 用户/项目技能目录
  ...workflowCommands,        // 工作流命令
  ...pluginCommands,          // getPluginCommands() — 插件命令
  ...pluginSkills,            // getPluginSkills() — 插件技能
  ...COMMANDS(),              // 内建命令（最后，优先级最低）
]
```

**`getCommands()`（行 476-517）** 在此基础上额外：
- 通过 `meetsAvailabilityRequirement()` 和 `isCommandEnabled()` 过滤
- 插入 `getDynamicSkills()`（路径条件激活的技能）
- 对动态技能去重（已有同名命令的跳过）

### 2.4 为什么 commands 不能简化成 tools

如果把 commands 做成 tools，会导致：
1. 用户控制面被模型执行面污染
2. `status`/`config`/`permissions` 等管理动作被错误当成"模型可调用外设"

Claude Code 的做法更像操作系统：
- **commands** = shell 命令 / 控制平面
- **tools** = runtime 外设 / 执行平面

### 2.5 Bridge/Remote 安全命令

```typescript
REMOTE_SAFE_COMMANDS = new Set([/* 11 个在 --remote 模式下安全的命令 */])
BRIDGE_SAFE_COMMANDS = new Set([/* 6 个通过 bridge 安全的 'local' 命令 */])
```

`isBridgeSafeCommand()`（行 672-676）阻止 `local-jsx` 类型命令通过 bridge，允许 `prompt` 类型。

---

## 三、Skills：受治理的能力单元

### 3.1 Frontmatter 字段（`frontmatterParser.ts`，行 10-59）

一个 skill 的完整元信息：

```typescript
export type FrontmatterData = {
  description?: string | null
  'allowed-tools'?: string | string[] | null    // 工具白名单
  'argument-hint'?: string | null
  when_to_use?: string | null
  model?: string | null                          // 模型别名或 'inherit'
  effort?: string | null                         // 'low' | 'medium' | 'high' | 'max'
  'user-invocable'?: string | null               // 是否用户可调用
  hooks?: HooksSettings | null                   // 钩子配置
  context?: 'inline' | 'fork' | null             // 执行上下文
  agent?: string | null                          // fork 时的 agent 类型
  paths?: string | string[] | null               // 路径条件（glob 模式）
  shell?: string | null                          // 'bash' | 'powershell'
  skills?: string | null                         // 预加载的技能（逗号分隔）
  type?: string | null                           // 记忆类型
  version?: string | null
  'hide-from-slash-command-tool'?: string | null
}
```

Skill 在 Claude Code 里不是"几段 prompt 文本"，而是**可路由、可约束、可描述、可执行的能力对象**。

### 3.2 加载来源（`LoadedFrom` 类型）

```typescript
export type LoadedFrom =
  | 'commands_DEPRECATED'   // 旧格式兼容
  | 'skills'                // 用户/项目技能目录
  | 'plugin'                // 插件提供
  | 'managed'               // 托管（企业）
  | 'bundled'               // 内置
  | 'mcp'                   // MCP server 提供
```

### 3.3 加载管线（`loadSkillsDir.ts`，638 行入口）

`getSkillDirCommands()` 从 **5 个平行来源**加载：

```typescript
const [managed, user, project, additional, legacy] = await Promise.all([
  // 1. 托管技能: getManagedFilePath()/.claude/skills
  // 2. 用户技能: getClaudeConfigHomeDir()/skills
  // 3. 项目技能: getProjectDirsUpToHome('skills', cwd)（多个目录向上遍历）
  // 4. 额外目录: getAdditionalDirectoriesForClaudeMd()
  // 5. 旧格式: loadSkillsFromCommandsDir(cwd)
])
```

### 3.4 加载格式

- **目录格式**（`loadSkillsFromSkillsDir`，行 407）：`skill-name/SKILL.md`
- **旧格式**（`loadSkillsFromCommandsDir`，行 549）：支持 `.md` 文件和 `SKILL.md` 目录

### 3.5 路径去重

```typescript
async function getFileIdentity(filePath: string): Promise<string | null> {
  // 使用 realpath() 解析符号链接到规范路径
  // 返回 null 如果文件不存在
}
```

去重策略（行 725-763）：**先到先得**，后续重复路径被跳过并记录日志。处理了 symlink、重叠目录、同一 skill 从不同路径被重复扫描的场景。

### 3.6 Token 估算

```typescript
function estimateSkillFrontmatterTokens(skill: Command): number {
  // 使用 roughTokenCountEstimation() 对 name + description + whenToUse 估算
}
```

连 skill 被放进上下文时的 token 成本都考虑到了——runtime 持续围绕"上下文治理"设计。

### 3.7 条件技能（基于路径）

```typescript
activateConditionalSkillsForPaths(paths: string[])   // 行 997
discoverSkillDirsForPaths(paths: string[])            // 行 861
```

当用户操作特定文件时，匹配 `paths` glob 模式的技能自动激活。使用 `ignore` 库（gitignore 风格匹配）。

### 3.8 动态技能发现

```typescript
getDynamicSkills(): Command[]            // 行 981
addSkillDirectories(dirs: string[]): void // 行 923
```

运行时动态注入的技能，通过 `dynamicSkillDirs` Set 和 `dynamicSkills` Map 管理，`skillsLoaded` 信号触发缓存清理。

---

## 四、内置技能（`skills/bundled/`，17 个文件）

### 4.1 `BundledSkillDefinition` 类型

```typescript
export type BundledSkillDefinition = {
  name: string
  description: string
  aliases?: string[]
  whenToUse?: string
  argumentHint?: string
  allowedTools?: string[]
  model?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  isEnabled?: () => boolean
  hooks?: HooksSettings
  context?: 'inline' | 'fork'
  agent?: string
  files?: Record<string, string>   // 首次调用时提取到磁盘的参考文件
  getPromptForCommand: (args: string, context: ToolUseContext) => Promise<ContentBlockParam[]>
}
```

### 4.2 注册清单（`bundled/index.ts`，行 24-79）

**无条件注册**：updateConfig, keybindings, verify, debug, loremIpsum, skillify, remember, simplify, batch, stuck

**条件注册**：

| 技能 | Feature Gate |
|------|-------------|
| dream | `KAIROS` \| `KAIROS_DREAM` |
| hunter | `REVIEW_ARTIFACT` |
| loop | `AGENT_TRIGGERS` |
| scheduleRemoteAgents | `AGENT_TRIGGERS_REMOTE` |
| claudeApi | `BUILDING_CLAUDE_APPS` |
| claudeInChrome | 动态：`shouldAutoEnableClaudeInChrome()` |
| runSkillGenerator | `RUN_SKILL_GENERATOR` |

### 4.3 文件提取机制

`extractBundledSkillFiles()`（行 131）在首次调用时将 `files` map 懒提取到磁盘（`getBundledSkillsRoot()/{skillName}/`）。闭包 memoization 防止并发提取竞争。

---

## 五、SkillTool：技能执行入口

### 5.1 技能加载与过滤（`SkillTool.ts`，行 81-94）

```typescript
async function getAllCommands(context: ToolUseContext): Promise<Command[]> {
  // 包含 MCP skills (loadedFrom === 'mcp', type === 'prompt')
  const mcpSkills = context.getAppState().mcp.commands
    .filter(cmd => cmd.type === 'prompt' && cmd.loadedFrom === 'mcp')
  if (mcpSkills.length === 0) return getCommands(getProjectRoot())
  const localCommands = await getCommands(getProjectRoot())
  return uniqBy([...localCommands, ...mcpSkills], 'name')
}
```

### 5.2 Fork 执行流（行 122-289）

当 `context === 'fork'` 时，`executeForkedSkill()` 创建隔离子 agent：

1. 设置 `agentId` 和执行上下文
2. 记录分析事件 `tengu_skill_tool_invocation`
3. 调用 `prepareForkedCommandContext()` 构建 agent 定义
4. 合并 skill 的 `effort` 设置
5. 遍历 `runAgent()` yield 消息
6. 通过 `onProgress()` 报告工具使用进度
7. 返回 `{ success: true, commandName, status: 'forked', agentId, result }`

### 5.3 输入 Schema

```typescript
z.object({
  skill: z.string().describe('The skill name. E.g., "commit", "review-pr"'),
  args: z.string().optional().describe('Optional arguments for the skill'),
})
```

---

## 六、Plugins：能力注入渠道

### 6.1 插件组件模型（`builtinPlugins.ts`，160 行）

```typescript
type BuiltinPluginDefinition = {
  name: string
  description: string
  version: string
  defaultEnabled?: boolean
  isAvailable?: () => boolean       // 条件可见性
  hooks?: HooksSettings
  mcpServers?: ScopedMcpServerConfig[]
  skills?: BundledSkillDefinition[]
}
```

插件 ID 格式：`{name}@builtin`

插件可同时注入：
- **Skills** — 通过 `getBuiltinPluginSkillCommands()` 进入命令系统
- **Hooks** — 生命周期钩子
- **MCP Servers** — MCP 连接配置
- **LSP Servers** — 语言服务器

### 6.2 启用/禁用控制

```typescript
// 用户设置覆盖
const userSetting = settings.enabledPlugins[pluginId]
// 默认值
const defaultEnabled = definition.defaultEnabled ?? true
// 可用性检查
if (!definition.isAvailable?.()) → 不显示
```

---

## 七、MCP：远程能力总线

### 7.1 支持的 Transport（`services/mcp/client.ts`）

```typescript
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { WebSocketTransport } from '../../utils/mcpWebSocketTransport.js'
```

**7 种 Transport 类型**：

| Transport | 实现 | 用途 |
|-----------|------|------|
| `stdio` | `StdioClientTransport` | 子进程通信 |
| `sse` | `SSEClientTransport` | HTTP Server-Sent Events |
| `sse-ide` | `SSEClientTransport` | IDE 专用 SSE |
| `http` | `StreamableHTTPClientTransport` | HTTP 流式传输 |
| `ws` | `WebSocketTransport` | WebSocket |
| `ws-ide` | `WebSocketTransport` | IDE 专用 WebSocket |
| `sdk` | `SdkControlClientTransport` | 进程内 SDK |
| `claudeai-proxy` | HTTP 代理 | Claude.ai 代理配置 |

### 7.2 配置作用域（`services/mcp/types.ts`）

```typescript
type ConfigScope = 'local' | 'user' | 'project' | 'dynamic' | 'enterprise' | 'claudeai' | 'managed'
```

**配置源**：

| 作用域 | 来源 |
|--------|------|
| enterprise | `getManagedFilePath()/managed-mcp.json` |
| user | `~/.claude/settings.json` |
| project | `.claude/settings.json` |
| dynamic | 运行时发现（如 Claude.ai） |
| managed | 托管配置 |

### 7.3 Server 连接状态（联合类型）

```typescript
type MCPServerConnection =
  | ConnectedMCPServer    // 已连接：client, capabilities, serverInfo, instructions
  | FailedMCPServer       // 失败：error
  | NeedsAuthMCPServer    // 需要认证
  | PendingMCPServer      // 连接中：reconnectAttempt, maxReconnectAttempts
  | DisabledMCPServer     // 已禁用
```

**ConnectedMCPServer 详细类型**：

```typescript
type ConnectedMCPServer = {
  client: Client
  name: string
  type: 'connected'
  capabilities: ServerCapabilities
  serverInfo?: { name: string; version: string }
  instructions?: string
  config: ScopedMcpServerConfig
  cleanup: () => Promise<void>
}
```

### 7.4 配置写入（`config.ts`，行 88-131）

```typescript
async function writeMcpjsonFile(filePath: string, config: McpJsonConfig): Promise<void> {
  // 原子写入：temp file + datasync + rename
}
```

### 7.5 错误处理

```typescript
McpAuthError          // 401 OAuth token 过期
McpSessionExpiredError // 404 Session 不存在
McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS  // 工具返回 isError=true
```

### 7.6 MCP 注入后如何进入运行时

MCP server 不直接操控 runtime，而是通过本地抽象层转译：

- `MCPTool` — MCP 工具的本地包装
- `ListMcpResourcesTool` — 列出 MCP 资源
- `ReadMcpResourceTool` — 读取 MCP 资源
- `createMcpAuthTool(...)` — OAuth 认证补链

运行时保持主权。

---

## 八、能力注入总图

```text
                    ┌─────────────────────────────┐
                    │      commands.ts             │
                    │   loadAllCommands(cwd)       │
                    │                              │
                    │  1. bundledSkills             │ ← skills/bundled/
                    │  2. builtinPluginSkills       │ ← plugins/builtinPlugins.ts
                    │  3. skillDirCommands          │ ← .claude/skills + ~/skills
                    │  4. workflowCommands          │ ← WORKFLOW_SCRIPTS feature
                    │  5. pluginCommands            │ ← 外部插件
                    │  6. pluginSkills              │ ← 外部插件技能
                    │  7. COMMANDS()                │ ← 55+ 内建命令
                    │  +  getDynamicSkills()        │ ← 路径条件激活
                    │  +  getMcpSkillCommands()     │ ← MCP prompt 命令
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  用户控制面（slash commands）   │
                    │  /config /status /memory ...  │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  SkillTool（模型可调用）       │
                    │  getSkillToolCommands()      │
                    │  → type === 'prompt' 的命令   │
                    │  → 非 builtin 内建命令        │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  tools.ts + assembleToolPool  │
                    │  内置工具 + MCP 工具           │
                    │  → 去重（内置优先）             │
                    │  → 稳定排序（prompt cache）     │
                    └─────────────────────────────┘
```

---

## 九、commands、skills、MCP 的分层关系

这三套东西不是三选一，而是三层不同抽象：

| 层 | 面向 | 特点 |
|----|------|------|
| **commands** | 用户 | 显式控制 runtime，用于 status/config/admin |
| **skills** | 任务组织 | 封装 prompt + metadata + constraints，连接 commands/tools/model |
| **MCP** | 外部能力接入 | 提供 tools/resources/auth，通过本地抽象层转译 |

Claude Code 最厉害的地方：**把三者都纳入了同一 runtime 观。**

---

## 十、为什么这套注入方式比"全都做成工具"更强

"全都做成工具"虽然简单，但长期必然遇到：
- 用户控制面不清晰
- prompt 模板和真实工具混在一起
- 外部能力缺少治理层
- 插件能力没有明确落点

Claude Code 承认不同能力属于不同层次：有些给人控制、有些给模型执行、有些是任务模板、有些来自远程 server。

---

## 十一、对 Agent Runtime 的启发

1. **用户控制面要有独立命令层** — 不要把 `/config` 做成 tool
2. **Skills 应该是受治理的能力包装层** — 带 frontmatter + schema + token 估算，不只是 prompt 文件
3. **外部能力要有本地抽象层** — MCP server 不能直接操控 runtime
4. **能力注入最好分层** — commands / skills / tools / MCP 各有归属
5. **Loader 体系要工程化** — 路径去重（`realpath`）、token 估算、条件激活、缓存管理
6. **插件可同时注入多种能力** — skills + hooks + MCP servers + LSP servers，不只是命令
