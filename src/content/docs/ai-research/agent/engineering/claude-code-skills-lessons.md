---
title: "深度解读 | Anthropic 内部如何使用 Claude Code Skills：9 类模式、写作技巧与分发策略"
description: "Thariq（Anthropic Claude Code 团队）分享了 Anthropic 内部数百个 Skills 的实战经验：9 种 Skill 分类体系、7 条写作最佳实践、分发与市场管理策略。这是目前最权威的 Agent Skill 工程实践指南。"
---

## 速查卡

| 项目 | 内容 |
|------|------|
| **标题** | Lessons from Building Claude Code: How We Use Skills |
| **作者** | Thariq（@trq212），Anthropic Claude Code 团队 |
| **发布日期** | 2026-03-17 |
| **来源** | [X/Twitter 长文](https://x.com/trq212/status/2033949937936085378) |
| **热度** | 16K likes · 2.2K retweets · 43.7K bookmarks · 663 万 views |
| **关键词** | Claude Code, Skills, Agent 工程, 上下文工程, 渐进式披露 |
| **核心论点** | Skills 不是"只是 markdown 文件"——它们是包含脚本、资产、数据的文件夹，Anthropic 内部有数百个在活跃使用 |

---

## 一、为什么这篇文章重要

这篇文章的作者 Thariq 是 Anthropic Claude Code 团队的核心成员（YC W20，前 MIT Media Lab），他直接参与了 Claude Code Skills 系统的设计和内部推广。文章基于 **Anthropic 内部数百个 Skills 的实际使用经验**，而非理论推测。

43.7K 的收藏量说明了一切——这是当前 Agent 工程领域信息密度最高的一手实践文档。

对我们来说，这篇文章的价值在于：
1. **揭示了 Anthropic 内部的 Agent 工作方式**——他们自己是 Claude Code 最重的用户
2. **提供了一套完整的 Skill 分类体系**——9 种类型覆盖了企业 AI 编程的所有场景
3. **给出了可直接复用的工程模式**——从文件夹结构到 Hook 机制到分发策略

---

## 二、核心概念纠偏：Skill 不是 Markdown 文件

Thariq 开篇就纠正了一个普遍误解：

> "A common misconception we hear about skills is that they are 'just markdown files', but the most interesting part of skills is that they're not just text files. They're folders that can include scripts, assets, data, etc. that the agent can discover, explore and manipulate."

这个区分至关重要。很多人把 Skill 等同于一段 system prompt 文本，但 Anthropic 内部最有趣的 Skill 都充分利用了：

- **文件夹结构**：references/、scripts/、assets/、examples/ 等子目录
- **配置选项**：[frontmatter 配置](https://code.claude.com/docs/en/skills#frontmatter-reference)中的各种元数据
- **动态 Hook**：PreToolUse、PostToolUse 等 Hook 注册机制

这意味着一个好的 Skill 更像是一个"迷你应用"，而不是一份说明书。

---

## 三、9 种 Skill 分类体系（完整拆解）

Thariq 说他们对内部所有 Skill 做了编目（cataloging），发现它们自然聚集为 9 个类别。**最好的 Skill 清晰地属于一个类别；让人困惑的 Skill 往往横跨多个。**

这个发现本身就很有洞察力——它暗示 Skill 设计的第一原则是**单一职责**。

### 3.1 Library & API Reference（库和 API 参考）

**定义：** 教 Claude 如何正确使用某个库、CLI 或 SDK 的 Skill。

**关键细节：**
- 适用于内部库和 Claude 容易出错的公共库
- 通常包含一个 **reference code snippets 文件夹**
- 包含一个 **gotchas 列表**（Claude 使用该库时常犯的错误）

**示例：**
- `billing-lib` — 内部计费库的边界情况和陷阱
- `internal-platform-cli` — 内部 CLI 的每个子命令及使用场景
- `frontend-design` — 让 Claude 更好地理解你的设计系统

**深层含义：** 这类 Skill 解决的是**模型知识缺口**问题。Claude 的训练数据中可能没有你的内部 API，或者对某些库有过时的理解。通过 Skill 注入最新、最准确的参考文档，相当于给 Claude 做了一次针对性的"微调"——但成本是零，效果是即时的。

### 3.2 Product Verification（产品验证）

**定义：** 描述如何测试或验证代码是否正常工作的 Skill。

**关键细节：**
- 通常与外部工具配对：Playwright（浏览器自动化）、tmux（终端模拟）等
- Thariq 特别强调：**"Verification skills are extremely useful for ensuring Claude's output is correct. It can be worth having an engineer spend a week just making your verification skills excellent."**
- 建议技巧：让 Claude **录制输出视频**以便回看测试过程；在每一步**强制执行编程断言**

**示例：**
- `signup-flow-driver` — 在 headless 浏览器中跑完注册→邮件验证→引导流程，每一步都有状态断言 Hook
- `checkout-verifier` — 用 Stripe 测试卡驱动结账 UI，验证发票最终落到正确状态
- `tmux-cli-driver` — 需要 TTY 的交互式 CLI 测试

**深层含义：** 这是 Thariq 唯一用"值得一个工程师花一整周来做"来强调的类别。这说明 Anthropic 认为 **验证是 Agent 工程中 ROI 最高的投资**——因为 Agent 的输出不确定性高，而自动化验证可以把"不确定"变成"可量化"。

### 3.3 Data Fetching & Analysis（数据获取与分析）

**定义：** 连接到你的数据和监控栈的 Skill。

**关键细节：**
- 包含带凭证的数据获取库
- 包含特定的 dashboard ID
- 包含常见工作流和数据获取方式

**示例：**
- `funnel-query` — "从注册→激活→付费需要 join 哪些事件表" + canonical user_id 在哪个表
- `cohort-compare` — 对比两个用户群的留存/转化，标记统计显著差异，链接到分群定义
- `grafana` — 数据源 UID、集群名称、"问题→看哪个 dashboard"的查找表

**深层含义：** 这类 Skill 的核心价值是**消除组织暗知识的壁垒**。每个公司都有一堆"你得问老张才知道这个数据在哪"的隐性知识，Skill 把这些知识编码化，让任何工程师（通过 Claude）都能立即使用。

### 3.4 Business Process & Team Automation（业务流程与团队自动化）

**定义：** 把重复性工作流自动化为一条命令的 Skill。

**关键细节：**
- 通常指令本身比较简单，但依赖其他 Skill 或 MCP 工具
- **关键技巧：把历次执行结果保存到日志文件中**，让模型保持一致性并能反思之前的执行情况

**示例：**
- `standup-post` — 聚合 ticket tracker、GitHub 活动、之前的 Slack 消息 → 格式化站会报告，只展示增量
- `create-<ticket-system>-ticket` — 强制 schema（合法枚举值、必填字段）+ 创建后的工作流（ping reviewer、发 Slack）
- `weekly-recap` — 合并的 PR + 关闭的 ticket + 部署 → 格式化周报

**深层含义：** "保存历次执行结果"这个建议非常具体。它意味着 Skill 不仅是无状态的指令集，而是可以有**持久化记忆**的。standup-post 读自己的历史记录来计算增量——这是一种轻量级的"Agent 记忆"实现。

### 3.5 Code Scaffolding & Templates（代码脚手架与模板）

**定义：** 为代码库中特定功能生成框架样板代码的 Skill。

**关键细节：**
- 可以将 Skill 与可组合的脚本结合
- 特别适用于**脚手架中有自然语言需求、无法纯粹用代码覆盖的场景**

**示例：**
- `new-<framework>-workflow` — 用你的注解脚手架一个新的 service/workflow/handler
- `new-migration` — 你的迁移文件模板 + 常见陷阱
- `create-app` — 新内部应用，预装你的 auth、logging 和 deploy 配置

**深层含义：** "自然语言需求无法纯用代码覆盖"这个说法值得深思。传统的代码生成器（yeoman、cookiecutter）只能处理结构化模板，而 Skill 可以包含类似"如果这是一个面向客户的服务，多加一层速率限制和审计日志"这样的自然语言规则——这是传统脚手架做不到的。

### 3.6 Code Quality & Review（代码质量与审查）

**定义：** 在组织内部执行代码质量标准并辅助代码审查的 Skill。

**关键细节：**
- 可以包含确定性脚本或工具以获得最大鲁棒性
- 建议作为 Hook 的一部分自动运行，或放到 GitHub Action 中

**示例：**
- `adversarial-review` — **生成一个全新视角的子 Agent 来批评代码**，实施修复，迭代直到发现退化为"吹毛求疵"级别
- `code-style` — 执行代码风格，特别是 Claude 默认做不好的风格
- `testing-practices` — 如何写测试、测什么

**深层含义：** `adversarial-review` 这个例子极其精彩。它描述了一种**多 Agent 自我对抗**的模式：一个 Agent 写代码，另一个 Agent（fresh-eyes subagent）专门找茬，然后迭代修复直到只剩下小问题。这不是理论——Anthropic 内部真的在用。这证实了"Agent 审查 Agent"是一个已经落地的工程模式。

### 3.7 CI/CD & Deployment（持续集成与部署）

**定义：** 帮助你获取、推送和部署代码的 Skill。

**示例：**
- `babysit-pr` — 监控 PR → 重试 flaky CI → 解决合并冲突 → 启用 auto-merge
- `deploy-<service>` — 构建 → 冒烟测试 → 渐进流量切换 + 错误率对比 → 回归时自动回滚
- `cherry-pick-prod` — 隔离 worktree → cherry-pick → 冲突解决 → 带模板的 PR

**深层含义：** `babysit-pr` 这个 Skill 名字本身就说明了一切——PR 流程中有大量无聊但必须有人盯着的工作（CI 重试、冲突解决），Agent 可以完全接管。`deploy-<service>` 展示的是一个**完整的 canary deployment 自动化**，包含错误率对比和自动回滚——这已经不是辅助编码，而是辅助运维了。

### 3.8 Runbooks（运维手册）

**定义：** 接收一个症状（Slack 线程、告警或错误签名），走完多工具调查流程，输出结构化报告的 Skill。

**示例：**
- `<service>-debugging` — 症状→工具→查询模式的映射，针对最高流量服务
- `oncall-runner` — 拉取告警 → 检查常见嫌疑 → 格式化发现
- `log-correlator` — 给定请求 ID，从每个可能经手的系统中拉取匹配日志

**深层含义：** Runbook 本质上是把运维工程师的"直觉"编码化。"收到这个告警→先查这三个 dashboard→如果指标异常就查那个日志"——这个思维链以前只存在于资深工程师的脑子里，现在通过 Skill 变成了可复制、可传承的组织资产。

### 3.9 Infrastructure Operations（基础设施运维）

**定义：** 执行日常维护和运维操作的 Skill，其中一些涉及需要护栏的破坏性操作。

**示例：**
- `<resource>-orphans` — 找到孤儿 pod/volume → 发 Slack → 浸泡期 → 用户确认 → 级联清理
- `dependency-management` — 组织的依赖审批工作流
- `cost-investigation` — "为什么存储/出口带宽账单激增" + 具体的 bucket 和查询模式

**深层含义：** 注意 `<resource>-orphans` 的流程设计：发现 → 通知 → **浸泡期** → 人类确认 → 才执行清理。这是一个教科书式的"人在环中"（human-in-the-loop）设计，用于 Agent 执行破坏性操作的场景。Skill 不是要替代人类决策，而是自动化决策前后的所有繁琐步骤。

---

## 四、7 条 Skill 写作最佳实践（逐条拆解）

### 4.1 Don't State the Obvious（别写 Claude 已经知道的）

> "Claude Code knows a lot about your codebase, and Claude knows a lot about coding, including many default opinions. If you're publishing a skill that is primarily about knowledge, try to focus on information that pushes Claude out of its normal way of thinking."

**具体例子：** Thariq 提到了 [frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) Skill——由一位 Anthropic 工程师与客户反复迭代打造，核心目标是**改善 Claude 的设计品味、避免经典 AI 生成风格**（Inter 字体 + 紫色渐变）。

**启示：** Skill 的价值不在于告诉 Claude "如何写 Python"（它已经会了），而在于告诉它"在我们公司，Python 项目要这样组织，这个库的 v3 API 跟 v2 完全不同，别用旧写法"。好的 Skill 应该写那些 Claude **不知道的**或**默认会做错的**事情。

### 4.2 Build a Gotchas Section（维护一个"陷阱"清单）

> "The highest-signal content in any skill is the Gotchas section. These sections should be built up from common failure points that Claude runs into when using your skill."

**关键点：** Gotchas 不是一次性写好的，而是**随时间持续积累**的。每次 Claude 犯错，就把那个错误模式加进 Gotchas。

**启示：** 这透露了 Anthropic 内部的 Skill 维护方式——它是一个**活文档**，不断从实践中学习。这跟我们维护 MEMORY.md 的思路完全一致：从错误中提取教训，写下来防止重犯。

### 4.3 Use the File System & Progressive Disclosure（善用文件系统和渐进式披露）

> "You should think of the entire file system as a form of context engineering and progressive disclosure. Tell Claude what files are in your skill, and it will read them at appropriate times."

**具体技术：**
- **最简形式：** 在 SKILL.md 中指向其他 markdown 文件。比如把详细的函数签名和用法示例拆到 `references/api.md`
- **模板文件：** 如果输出是 markdown，可以在 `assets/` 中放一个模板文件让 Claude 复制使用
- **多级目录：** references/、scripts/、examples/ 等，Claude 会在需要时自己去读

**深层含义：** 这就是 **上下文工程**（Context Engineering）在 Skill 层面的具体实现。不是把所有信息都塞进一个 prompt，而是构建一个信息层次结构，让 Agent 按需拉取。这样做的好处是：
1. 减少初始 context 占用
2. 让 Agent 根据任务类型自主决定读哪些参考文件
3. 信息更新只需改对应文件，不用重写整个 Skill

### 4.4 Avoid Railroading Claude（避免过度约束 Claude）

> "Claude will generally try to stick to your instructions, and because Skills are so reusable you'll want to be careful of being too specific in your instructions. Give Claude the information it needs, but give it the flexibility to adapt to the situation."

**启示：** 这条建议看似简单但很深刻。因为 Skill 会在**无数不同的上下文**中被复用，过于死板的步骤指令（"第一步做 X，第二步做 Y"）会在某些场景下适得其反。更好的方式是：描述**目标**和**约束**，而不是**步骤**。

### 4.5 Think through the Setup（想清楚初始化流程）

有些 Skill 需要用户提供配置信息（比如 Slack channel、API key）。

**推荐模式：**
- 在 Skill 目录中放一个 `config.json`
- 如果配置不存在，Agent 会自动询问用户
- 如果需要结构化的多选问题，可以指示 Claude 使用 `AskUserQuestion` 工具

**启示：** 这说明好的 Skill 有"自举"能力——第一次运行时引导用户完成配置，之后的运行直接读取存储的配置，实现零配置体验。

### 4.6 The Description Field Is For the Model（描述字段是写给模型看的）

> "When Claude Code starts a session, it builds a listing of every available skill with its description. This listing is what Claude scans to decide 'is there a skill for this request?' Which means the description field is not a summary — it's a description of when to trigger this skill."

**启示：** 这是一个容易被忽略但至关重要的设计点。description 不是给人类看的"这个 Skill 做什么"，而是给模型看的"什么情况下应该调用这个 Skill"。好的 description 应该包含**触发关键词**和**适用场景**，就像搜索引擎的元描述一样。

### 4.7 Memory & Storing Data（记忆与数据存储）

Skill 可以通过存储数据来实现记忆：

- **简单方式：** 追加写入的文本日志、JSON 文件
- **复杂方式：** SQLite 数据库
- **例子：** `standup-post` 维护一个 `standups.log`，记录每次生成的站会报告，下次运行时 Claude 读历史来计算增量
- **注意：** Skill 目录中的数据在升级时可能被删除，应使用 `${CLAUDE_PLUGIN_DATA}` 作为稳定的存储路径

**启示：** 这进一步证实了 Skill 是"有状态的 Agent 组件"这一定位。每次执行的输出成为下次执行的输入，形成一个自我改善的反馈循环。

---

## 五、高级模式：脚本、Hook 与组合

### 5.1 Store Scripts & Generate Code（存储脚本，让 Claude 生成代码来组合）

> "One of the most powerful tools you can give Claude is code. Giving Claude scripts and libraries lets Claude spend its turns on composition, deciding what to do next rather than reconstructing boilerplate."

**具体做法：** 在数据分析 Skill 中，提供一组数据获取的 helper 函数。Claude 不需要每次从头写 SQL 连接代码，只需**组合**这些函数来回答"周二发生了什么？"

**启示：** 这是一个关键的效率优化——把 Agent 的"算力"从重复编写基础代码转移到高层决策和组合上。就像人类程序员用库而不是从头实现所有功能。

### 5.2 On Demand Hooks（按需 Hook）

Skill 可以注册只在被调用时激活的 Hook，持续到 session 结束。

**示例：**
- `/careful` — 通过 PreToolUse matcher 拦截 `rm -rf`、`DROP TABLE`、`force-push`、`kubectl delete`。只在操作生产环境时启用——全程开着会让人抓狂
- `/freeze` — 阻止对特定目录以外的任何 Edit/Write。调试时有用："我只想加日志，但 Claude 老是'顺手修'不相关的代码"

**深层含义：** 这是一种**动态安全围栏**机制。不同的工作场景需要不同的安全等级，On Demand Hook 让用户可以按需切换——日常开发宽松，生产操作严格。这比全局固定策略灵活得多。

`/freeze` 这个例子特别有共鸣——这是 Agent 编程中一个极其常见的痛点：你让 Agent 做 A，它"顺便"把 B、C 也改了。通过 Hook 限定可写范围，从根本上解决这个问题。

---

## 六、分发策略与市场管理

### 6.1 两种分发方式

1. **代码仓库内：** 放在 `./.claude/skills` 目录下，适合小团队、少量仓库
2. **Plugin 市场：** 通过 [Plugin Marketplace](https://code.claude.com/docs/en/plugin-marketplaces) 分发，用户自行选择安装

**权衡：** 仓库内的每个 Skill 都会增加一点模型的 context 开销。随着规模扩大，市场模式让团队自主选择需要的 Skill，避免 context 膨胀。

### 6.2 市场管理策略

Anthropic 内部的做法：

1. **没有中央团队审批**——让最有用的 Skill 自然涌现
2. **沙盒期：** 新 Skill 先上传到 GitHub 的 sandbox 文件夹，在 Slack 或论坛中推广
3. **准入标准：** Skill 获得足够 traction 后（由 owner 自行判断），提交 PR 进入正式市场
4. **策展很重要：** "It can be quite easy to create bad or redundant skills, so making sure you have some method of curation before release is important."

### 6.3 Skill 组合与依赖

当前 Skill 之间的依赖管理还没有原生支持，但可以通过在 Skill 中**按名引用其他 Skill**来实现——模型会在需要时自动调用已安装的 Skill。

### 6.4 度量 Skill 效果

Anthropic 使用 PreToolUse Hook 记录 Skill 使用日志（[示例代码](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5)），可以发现：
- 哪些 Skill 最受欢迎
- 哪些 Skill 的触发率低于预期

---

## 七、与 MiniMax Skills 的对比

我们之前分析过 [MiniMax Skills 项目](/ai-research/agent/engineering/minimax-skills-deep-analysis/)（287 文件，7.5 万行），两者有很好的对照关系：

| 维度 | Anthropic Skills（本文） | MiniMax Skills |
|------|------------------------|----------------|
| **定位** | 内部实践分享，方法论层面 | 开源项目，具体实现层面 |
| **分类** | 9 种功能类型 | 11 个 Skill + 1 个 Plugin |
| **重点** | Skill 的设计哲学和组织管理 | 跨平台兼容和具体工具链 |
| **上下文工程** | 渐进式披露、文件夹结构 | 包括 references/、scripts/ 等 |
| **验证** | 强调 Playwright/tmux 测试 | Office 套件有内置验证逻辑 |
| **分发** | repo 内或 Plugin 市场 | Claude Code/Cursor/Codex/OpenCode 四平台 |

两篇结合来看，我们得到了一个完整的画面：**Anthropic 文章给出了"为什么"和"什么"，MiniMax 项目给出了"怎么做"**。

---

## 八、对我们的启示

### 8.1 Skill 是 Agent 工程的核心基础设施

从 Anthropic 内部有"数百个 Skills 在活跃使用"来看，Skill 不是一个边缘功能——它是 Agent 工程的**核心抽象层**。每一个团队的特定知识、流程、工具链都可以且应该被 Skill 化。

### 8.2 "值得花一周做好验证 Skill"

这可能是全文最关键的一句话。在所有类型中，Thariq 唯独对 Verification Skill 说"值得一个工程师花一整周来做"。这说明在 Anthropic 的实践中，**验证能力是限制 Agent 产出质量的最大瓶颈**。

### 8.3 Gotchas 文档 > 详细指令

与其写一长串步骤让 Claude 严格遵循，不如维护一个持续更新的"Claude 常犯错误"列表。这更高效，因为它只纠正 Claude 的偏差，而不是重新教它怎么编程。

### 8.4 渐进式披露是上下文工程的实践形态

"整个文件系统就是一种上下文工程"——这句话把抽象的 Context Engineering 概念落地成了具体可操作的工程实践：用文件夹层次结构来管理信息密度，让 Agent 按需加载。

### 8.5 有状态 Skill 是 Agent 记忆的轻量实现

不需要复杂的向量数据库或知识图谱——一个 JSON 文件或 SQLite 就够了。关键是让每次执行的结果成为下次执行的输入，形成持续改善的循环。

---

## 九、延伸阅读

- [Claude Code Skills 官方文档](https://code.claude.com/docs/en/skills)
- [Anthropic Skilljar 课程：Agent Skills](https://anthropic.skilljar.com/introduction-to-agent-skills)
- [Skill Creator](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills) — Anthropic 推出的 Skill 创建工具
- [frontend-design Skill 源码](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) — 文中提到的设计品味 Skill
- [Skill 使用度量 Gist](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5) — PreToolUse Hook 记录用量的示例代码
- [Plugin Marketplace 文档](https://code.claude.com/docs/en/plugin-marketplaces) — Skill 分发平台

---

*本文基于 Thariq (@trq212) 2026-03-17 发布的 X 长文，原文 663 万阅读、4.37 万收藏。*
