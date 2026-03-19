---
title: Superpowers — 96k Star 的 Agent Skills 框架深度解析
---

# Superpowers — 96k Star 的 Agent Skills 框架深度解析

> **来源**: [obra/superpowers](https://github.com/obra/superpowers) — GitHub 开源项目
> **作者**: Jesse Vincent（[Prime Radiant](https://primeradiant.com) 创始人）
> **日期**: 2026-03-19
> **标签**: `Agent` `Skills Framework` `TDD` `Subagent` `Claude Code` `Software Development Methodology`
> **Stars**: 96.7k+

---

## 1. 这个项目解决了什么问题？

当你用 Claude Code、Cursor 等 AI coding agent 写代码时，通常会遇到几个核心痛点：

1. **Agent 上来就写代码**，不思考、不规划，写到一半发现方向错了
2. **没有测试纪律**，代码写完才补测试（甚至不补），测试形同虚设
3. **上下文污染**，一个 session 里干太多事，agent 越来越糊涂
4. **缺乏代码审查**，agent 自己写自己过，质量无保障
5. **流程无法复用**，每次都要重新口头描述工作方式

Superpowers 的回答是：**把优秀的软件开发方法论（TDD、Code Review、设计先行）编码为一组可组合的 Skill 文件，让 agent 自动遵循这些流程。**

用作者自己的话说：

> "Your coding agent just has Superpowers."

不需要手动提示、不需要复制粘贴提示词。Agent 启动后自动加载这些 skill，看到你要写代码就自动切换到正确的工作流。

---

## 2. 为什么这么多 Star？

96k+ star 是一个惊人的数字。原因是多维度的：

### 2.1 精准击中了 AI coding 的最大痛点

2025-2026 年，大量开发者开始依赖 AI agent 写代码。但很快发现 agent 写出的代码质量参差不齐，根本原因是 **agent 缺乏纪律**。Superpowers 不是又一个 AI wrapper，而是给 agent 注入了经过验证的软件工程方法论。这对所有用 AI 写代码的人都有直接价值。

### 2.2 Claude Code 插件系统的首批杀手级应用

Anthropic 在 2025 年 10 月推出 Claude Code plugin 系统时，Superpowers 是最早利用这个机制的项目之一。作为 Claude Code 官方插件市场的明星项目，获得了巨大的曝光。

### 2.3 真正的「开箱即用」

安装后不需要任何配置。Agent 自动检测当前上下文，自动选择合适的 skill 来驱动工作流。这种零摩擦的体验让用户愿意推荐。

### 2.4 理念深刻且可验证

作者不是简单地写了几个 prompt。他研究了 Cialdini 的说服力原则，发现这些心理学原理对 LLM 同样有效，并系统性地应用到 skill 的编写中。他甚至让 Claude 对 subagent 做「压力测试」，用时间压力、沉没成本等场景来验证 skill 是否真的能约束 agent 行为。

### 2.5 跨平台兼容

支持 Claude Code、Cursor、Codex、OpenCode、Gemini CLI 等主流编码工具，不绑定单一平台。

---

## 3. 核心架构：Skill 系统

Superpowers 的核心抽象是 **Skill**。每个 Skill 是一个 SKILL.md 文件，用自然语言描述一个工作流程。Skill 不是建议，是**强制性的工作流**。

### 3.1 Skill 的加载机制

```
Agent 启动
  → 注入 bootstrap prompt（<session-start-hook>）
    → 指示 agent 读取 getting-started/SKILL.md
      → 教会 agent：你有 skills，遇到对应场景必须使用
        → agent 遇到任务时搜索并加载对应 skill
```

关键设计：Skill 是**声明式触发**的。每个 SKILL.md 的 frontmatter 里有 `description` 字段，描述触发条件。Agent 在执行任何任务前，先搜索是否有匹配的 skill，如果有就必须遵循。

### 3.2 Skill 的编写规范

Superpowers 自带一个 `writing-skills` 技能，专门教 agent 如何创建新的 skill：

- 每个 skill 有 frontmatter（name、description）
- 包含清晰的「When to Use」触发条件
- 用 Graphviz dot 语法画流程图（agent 可以解析）
- 包含正例/反例（`<Good>` / `<Bad>` 标签）
- 包含常见借口的驳斥表（防止 agent 跳过流程）
- 用 subagent 做 TDD 式的 skill 测试

### 3.3 Skill 的「说服力工程」

这是 Superpowers 最独特的地方。作者发现 Robert Cialdini 的 6 大说服力原则对 LLM 同样有效：

| 原则 | 在 Skill 中的应用 |
|------|------------------|
| **权威** | "Skills are mandatory when they exist"，用权威性措辞让 agent 不敢跳过 |
| **承诺一致** | 要求 agent 在开始前声明自己会使用 skill，利用承诺效应 |
| **稀缺** | 压力测试场景："每分钟损失 $5k，你还查 skill 吗？" |
| **社会证明** | 描述"总是"发生的行为模式 |

这不是玄学。Wharton 商学院与 Cialdini 合著的研究已经[科学验证了这些原则对 LLM 的有效性](https://gail.wharton.upenn.edu/research-and-insights/call-me-a-jerk-persuading-ai/)。

---

## 4. 核心工作流详解

Superpowers 定义了一条完整的软件开发流水线：

### 4.1 Brainstorming（头脑风暴）

**触发条件**: 用户要创建新功能、构建组件或修改行为时，必须先经过此阶段。

**硬性约束**: 在用户批准设计之前，禁止写任何代码。

流程：
1. 探索项目上下文（文件、文档、最近的 commit）
2. 一次一个问题，逐步澄清需求（偏好选择题）
3. 提出 2-3 个方案，带权衡分析和推荐理由
4. 分段展示设计，每段获得用户确认
5. 写设计文档并用 subagent 做 spec review
6. 用户最终审批后才进入实现

**为什么这很重要**: 大多数 AI coding 的失败不是因为 agent 不会写代码，而是因为它写错了东西。强制设计先行解决了这个根本问题。

### 4.2 Writing Plans（编写计划）

把批准的设计拆解为精确的工程任务：

- 每个任务 2-5 分钟
- 包含精确的文件路径和完整代码
- 包含验证步骤
- 写给「一个热情但缺乏品味、缺乏判断力、没有项目上下文、不爱写测试的初级工程师」

最后一点非常巧妙——它迫使计划必须足够详细和明确，不留任何模糊空间。

### 4.3 Subagent-Driven Development（子 Agent 驱动开发）

这是 Superpowers 最核心的创新。每个工程任务分配给一个**全新的 subagent**：

```
主 Agent（协调者）
  ├── 派发任务 → Implementer Subagent（实现者）
  │     └── 实现代码、写测试、提交
  ├── 派发审查 → Spec Reviewer Subagent（规格审查者）
  │     └── 检查代码是否符合规格
  ├── 派发审查 → Code Quality Reviewer Subagent（质量审查者）
  │     └── 检查代码质量
  └── 标记完成，下一个任务
```

**关键设计决策**：

1. **每个任务用全新 subagent**：避免上下文污染。主 agent 精心构造每个 subagent 需要的上下文，而不是让它继承整个 session 历史
2. **两阶段 review**：先检查「做对了没」（spec compliance），再检查「做好了没」（code quality）
3. **模型分级**：简单机械任务用便宜模型，需要判断力的任务用强模型，节省成本
4. **四种状态处理**：DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED，每种都有明确的处理策略

### 4.4 Test-Driven Development（测试驱动开发）

Superpowers 对 TDD 的执行是**极端严格**的：

**铁律**: 没有失败的测试，就不写生产代码。先写了代码？**删掉**。不是「留着参考」，不是「改改」，是真的删掉。

RED-GREEN-REFACTOR 循环：
1. **RED**: 写一个最小的失败测试
2. **验证 RED**: 必须看到测试失败（不是报错），且失败原因正确
3. **GREEN**: 写最少的代码让测试通过
4. **验证 GREEN**: 确认通过且无副作用
5. **REFACTOR**: 清理代码，保持测试通过

Skill 文件里有一张完整的「常见借口驳斥表」：

| 借口 | 现实 |
|------|------|
| "太简单不需要测试" | 简单的代码也会出 bug。写测试只要 30 秒。 |
| "我先写完再补测试" | 事后通过的测试什么也证明不了。 |
| "删掉 X 小时的工作太浪费了" | 沉没成本谬误。保留未验证的代码才是技术债。 |
| "TDD 太教条了，我是务实主义" | TDD 本身就是务实的。 |

### 4.5 Git Worktree（工作树隔离）

设计批准后，自动创建一个 git worktree 在新分支上工作：

- 不影响主分支
- 可以并行启动多个任务
- 失败了直接丢弃，零成本

### 4.6 Code Review & Branch Finishing

- 任务间自动做 code review，按严重程度分级，Critical 级别阻断进度
- 所有任务完成后做最终整体 review
- 提供选项：合并回主分支 / 发 PR / 保留 / 丢弃

---

## 5. 使用场景与业务价值

### 5.1 独立开发者 / 小团队的效率倍增器

**场景**: 一个独立开发者用 Claude Code 开发 SaaS 产品。

**没有 Superpowers**: Agent 拿到需求就开始写代码，写完发现理解错了，或者没测试、后续改一个 bug 引入三个新 bug。

**有 Superpowers**: Agent 先问清楚需求、做好设计、分段确认、严格 TDD、每个任务都有代码审查。开发者只需要在关键节点做决策，agent 可以自主工作数小时不偏离。

**价值**: 作者报告 Claude 能自主工作 2-3 小时不偏离计划。

### 5.2 规范化团队的 AI 编码实践

**场景**: 团队引入 AI coding agent，但担心代码质量。

**价值**: Superpowers 把团队的工程规范编码为 skill，所有 agent 自动遵循。相当于给每个 AI 开发者配了一个严格的 Tech Lead。

### 5.3 教育和知识沉淀

**场景**: 技术负责人读了一本好书（比如《重构》），想让团队的 AI agent 也学会。

**价值**: 直接让 agent 读书并提取可复用的 skill。作者就是这样做的——把编程书交给 Claude，让它提取新技能。

### 5.4 可扩展的 Agent 能力体系

**场景**: 遇到新的开发挑战（比如 performance tuning、security audit），需要 agent 学会新技能。

**价值**: 用 `writing-skills` 技能创建新的 skill，经过 subagent TDD 测试验证，然后永久生效。能力可以社区共享（通过 GitHub PR）。

---

## 6. 技术实现亮点总结

| 方面 | 实现 |
|------|------|
| **Skills 加载** | Bootstrap prompt + frontmatter 匹配触发 |
| **流程控制** | Graphviz dot 图 + checklist + HARD-GATE 标签 |
| **质量保障** | 两阶段 review（spec + quality）+ 严格 TDD |
| **上下文管理** | 每任务独立 subagent，主 agent 精心构造上下文 |
| **成本优化** | 按任务复杂度分级使用不同模型 |
| **纪律执行** | 说服力原则 + 借口驳斥表 + 压力测试 |
| **可扩展性** | 社区贡献 skill，自带 writing-skills 元技能 |
| **平台兼容** | Claude Code / Cursor / Codex / OpenCode / Gemini CLI |

---

## 7. 对 Agent 开发的启示

Superpowers 给整个 AI Agent 领域带来了几个重要启示：

1. **Skill 是 Agent 的「可编程行为模块」**。不是工具调用，不是 RAG，而是用自然语言编写的、可组合的行为规范。这可能成为 Agent 能力扩展的标准范式。

2. **说服力工程是一门严肃的技术**。对 LLM 使用心理学说服原则来保证行为合规，已经有学术研究支持，是一个值得深入探索的方向。

3. **Subagent 架构是上下文管理的最优解**。单 agent 长对话必然上下文退化，用 subagent 做任务隔离 + 主 agent 做协调，是当前最实用的架构模式。

4. **方法论本身可以成为产品**。Superpowers 不卖模型、不卖 API，卖的是一套经过验证的软件开发方法论，通过 skill 文件交付。

---

## 8. 相关链接

- GitHub: [https://github.com/obra/superpowers](https://github.com/obra/superpowers)
- 作者博客: [https://blog.fsck.com/2025/10/09/superpowers/](https://blog.fsck.com/2025/10/09/superpowers/)
- Discord 社区: [https://discord.gg/Jd8Vphy9jq](https://discord.gg/Jd8Vphy9jq)
- Claude Plugin 市场: [https://claude.com/plugins/superpowers](https://claude.com/plugins/superpowers)
- 说服力原则与 LLM 研究: [https://gail.wharton.upenn.edu/research-and-insights/call-me-a-jerk-persuading-ai/](https://gail.wharton.upenn.edu/research-and-insights/call-me-a-jerk-persuading-ai/)
