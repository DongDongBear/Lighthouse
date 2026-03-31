---
title: Claude Code 深读（四）：skills、commands 与 MCP 如何共同注入 runtime
description: 详细拆解 Claude Code 的 commands、skills、plugins 与 MCP 能力是如何被加载、过滤、治理并最终注入运行时的。
date: 2026-03-31
---

# Claude Code 深读（四）：skills、commands 与 MCP 如何共同注入 runtime

> 这是 Claude Code 系列的第四篇。前面几篇已经讲了总体结构、主循环以及 tools/permissions/orchestration。这一篇专门回答一个关键问题：**Claude Code 那么多能力，到底是怎样被装进 runtime 的？**

## 一、为什么“能力注入”值得单独写一篇

很多 Agent 项目到了一定规模就会遇到同一个问题：

- 内置能力越来越多
- 用户自定义能力越来越多
- 插件想注入能力
- MCP 服务器也想注入能力
- slash commands 还想保留一套用户控制面

最后系统就会变成：
- 一堆散落的注册代码
- 一堆 prompt 拼接
- 一堆 if-else 动态判断
- 没人说得清“能力到底从哪来的”

Claude Code 在这件事上的做法很值得研究，因为它没有把这些能力塞成一锅粥，而是分成了几条清晰的注入路径：

- commands
- tools
- skills
- plugins
- MCP

然后再在运行时把它们拼起来。

---

## 二、先立一个大图：Claude Code 的四类能力来源

从源码看，Claude Code 的能力来源至少可以概括为四类：

```text
[1] Built-in
    内建 commands / tools / bundled skills

[2] File-based / User-defined
    .claude/skills, 用户配置目录, project settings

[3] Plugin-based
    插件注入 commands / skills / 功能扩展

[4] MCP-based
    外部 server 提供 tools / resources / skills / auth flows
```

注意，这四类东西并不会直接“平铺到模型面前”，而是要分别进入：

- 用户控制平面（commands）
- 模型执行平面（tools）
- 任务模板/能力封装层（skills）
- 远程能力总线（MCP）

这就是 Claude Code 的厉害之处：

> **它不是把一切都变成 tools，而是给不同类型的能力安排了不同层级。**

---

## 三、commands：用户控制面的注入系统

### 1. `commands.ts` 是控制平面总装表

在 `commands.ts` 里，Claude Code 会注册大量内建命令，例如：

- `/help`
- `/config`
- `/status`
- `/memory`
- `/skills`
- `/mcp`
- `/permissions`
- `/files`
- `/branch`
- `/model`
- `/effort`
- `/review`
- `/plan`
- `/resume`
- `/session`
- `/tasks`
- `/chrome`
- `/stats`

但更重要的是，它不只加载内建命令，还会拼接：

- `getSkillDirCommands()`
- `getBundledSkills()`
- `getBuiltinPluginSkillCommands()`
- `getPluginCommands()`
- `getPluginSkills()`

这说明 `commands.ts` 不是内建命令清单，而是：

> **Claude Code 控制平面的统一注入入口。**

### 2. 为什么 commands 不能被简化成 tools

这是一个非常重要的架构判断。

如果把 commands 也都做成 tools，会出现两个问题：

1. 用户控制面会被模型执行面污染
2. 运行时管理动作（如 status/config/permissions）会被错误地当成“模型可调用外设”

Claude Code 的做法是把两者明确分开：

- commands：给用户显式控制 runtime
- tools：给模型在 query loop 中执行动作

这让系统边界非常清楚。

---

## 四、skills：为什么它们不是“prompt snippets”，而是受治理的能力单元

### 1. `loadSkillsDir.ts` 暴露了 Claude Code 对 skill 的真正理解

从 loader 的类型和解析流程看，一个 skill 会携带大量 frontmatter 元信息：

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

这意味着 skill 在 Claude Code 里不是“几段 prompt 文本”，而是：

> **一个可路由、可约束、可描述、可执行的能力对象。**

### 2. skill 的来源不止一个目录

源码里 `LoadedFrom` 明确有：

- `skills`
- `plugin`
- `managed`
- `bundled`
- `mcp`
- 以及旧的 `commands_DEPRECATED`

这说明 Claude Code 的 skill 系统本质上是一层统一抽象，底下可以挂：

- 用户 skill
- 项目 skill
- 平台内置 skill
- 插件 skill
- MCP 构建出的 skill

换句话说：

> **skill 是 Claude Code 的“能力包装层”。**

### 3. 为什么这种设计很强

因为它把很多原本容易散乱的东西统一进来了：

- prompt 模板
- 参数替换
- 工具白名单
- 指定模型/effort
- path 范围
- hooks
- 是否允许用户主动调用

这让 skill 既能面向用户，也能面向 runtime 调度。

---

## 五、skills loader 做了哪些真正工程化的事

### 1. 文件去重与 canonical path 识别

`loadSkillsDir.ts` 里专门通过 `realpath` 做文件身份识别，用于处理：

- symlink
- 重叠目录
- 同一个 skill 从不同路径被重复扫描

这种细节很容易被忽视，但对于用户目录 / 项目目录 / 插件目录同时存在时，非常重要。

### 2. frontmatter 解析不是装饰，而是 schema 化治理

Claude Code 不只是读取 markdown 正文，而是解析：

- description
- hooks
- model
- effort
- paths
- shell
- user-invocable

其中很多字段还会做验证和兜底。

这说明 skill 加载不是“读文档”，而是“装配能力对象”。

### 3. 它还会估算 token 开销

`estimateSkillFrontmatterTokens(...)` 这样的逻辑，说明 Claude Code 连 skill 被放进上下文时的大概 token 成本都考虑到了。

这再次证明：

> Claude Code 的 runtime 是持续围绕“上下文治理”来设计的。

---

## 六、plugins：为什么它们不是一层额外装饰，而是能力注入渠道

从 commands.ts 可以看出，plugin 不只是 UI 扩展或者小工具，而是可以注入：

- plugin commands
- plugin skills
- builtin plugin skill commands

也就是说，plugin 可以同时进入：

- 控制平面
- skill 层
- 甚至通过其他 runtime hook 影响执行体验

Claude Code 在这里的设计取向很明确：

> plugin 不是插件市场意义上的“挂件”，而是 runtime capability injection channel。

这也解释了为什么它对 plugin 有：

- cache
- versioned plugin manager
- managed plugins
- orphaned plugin cleanup

这已经是比较正式的插件基础设施了。

---

## 七、MCP：Claude Code 的远程能力总线

### 1. MCP 注入的不只是 tools

很多人一提 MCP，就只想到 tool calling。

Claude Code 的做法明显更完整。通过 `services/mcp/client.ts` 以及相关工具可以看到，MCP 注入的至少包括：

- tools
- resources
- auth flow
- skills（条件开启时）
- 与 session/runtime 交互的远程能力

这意味着在 Claude Code 里，MCP 更像：

> **远程能力基础设施层**

而不是单一协议适配器。

### 2. 它支持多 transport，说明是认真把 MCP 当基建做

源码里直接支持：

- SSE
- stdio
- streamable HTTP
- WebSocket
- 以及额外控制 transport

这不是“先适配一个 demo server”的姿势，而是认真在做一层通用连接基础设施。

### 3. MCP 注入后如何进入运行时

MCP 能力并不是自动裸露给模型，而是被组织成：

- `MCPTool`
- `ListMcpResourcesTool`
- `ReadMcpResourceTool`
- auth/elicitation/supporting hooks

也就是说，MCP server 并不是直接操控 runtime，
而是通过 Claude Code 的本地抽象层被转译进来。

这是一个非常健康的边界：

- 外部能力很强
- 但运行时仍然保持主权

---

## 八、commands、skills、MCP 不是替代关系，而是分层关系

这里是这篇最核心的判断。

Claude Code 的这三套东西，不是三选一，而是三层不同抽象：

### commands
- 面向用户
- 控制 runtime
- 显式可见
- 用于 status/config/admin/操作入口

### skills
- 面向任务组织
- 封装 prompt + metadata + constraints
- 可以连接 commands、tools、plugins、model 选择

### MCP
- 面向外部能力接入
- 提供 tools/resources/auth/integration
- 是远程能力底座

所以如果用一句话概括：

> commands 是控制面，skills 是任务包装层，MCP 是远程能力层。

而 Claude Code 最厉害的地方，就是把三者都纳入了同一 runtime 观。

---

## 九、为什么这套注入方式比“全都做成工具”更强

因为“全都做成工具”虽然一开始简单，但长期一定会遇到问题：

- 用户控制面不清晰
- prompt 模板和真实工具能力混在一起
- 外部能力接入缺少治理层
- 插件能力没有明确落点

Claude Code 的设计更成熟，因为它承认不同能力本来就属于不同层次：

- 有些是人来控制的
- 有些是模型来执行的
- 有些是任务模板来组织的
- 有些是远程 server 来提供的

这就是系统设计，而不是“能跑起来就行”。

---

## 十、对你自己做 Agent Runtime 的直接启发

### 启发 1：用户控制面要有独立命令层

### 启发 2：skills 应该是受治理的能力包装层，不只是 prompt 文件

### 启发 3：外部能力接入要有本地抽象层，不能直接裸暴露

### 启发 4：能力注入最好分层，而不是全挤进 tools

### 启发 5：loader 体系要工程化，尤其是 metadata / path / model / token / hooks

---

## 十一、总结

Claude Code 在“能力如何进入 runtime”这件事上的成熟度非常高。

它没有走最偷懒的路：
- 一切皆 prompt
- 一切皆 plugin
- 一切皆 tool

而是认真区分了：

- 用户控制面：commands
- 任务包装层：skills
- 远程能力层：MCP
- 内建/插件/配置来源：bundled / plugin / managed / user/project

这就是为什么 Claude Code 看起来不是“功能多”，而是“系统感强”。

因为它真正解决了一个困难问题：

> **复杂 Agent 的能力，应该怎样被注入运行时而不失控。**

---

## 相关阅读

- [从源码拆解 Claude Code：一个 AI Agent CLI 的系统设计](./claude-code-source-analysis/)
- [Claude Code 深读（二）：QueryEngine 与 query.ts 如何驱动一个 Agent Runtime](./claude-code-query-engine-deep-dive/)
- [Claude Code 深读（三）：Tool 协议、权限系统与工具调度](./claude-code-tools-permissions-orchestration/)
