---
title: "Anthropic Harness Design：GAN 启发的多 Agent 架构如何让 Claude 构建完整应用"
description: "Anthropic Harness Design, 多 Agent 架构, GAN-Inspired, Context Anxiety, Self-Praise Bias, Planner-Generator-Evaluator, Playwright MCP, Long-running Apps"
---

# Harness Design for Long-Running Apps: How Anthropic Built a GAN-Inspired Multi-Agent System for Full-Stack Application Generation

> 原文链接：https://www.anthropic.com/engineering/harness-design-long-running-apps
> 来源：Anthropic Engineering Blog
> 作者：Prithvi Rajasekaran, Anthropic Labs
> 发布日期：2026-03-24

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Anthropic 工程团队揭示了让 Claude 独立构建完整前端/全栈应用的 Harness 架构设计——核心是解决 Context Anxiety 和 Self-Praise Bias 两大失败模式，采用 GAN 启发的 Planner-Generator-Evaluator 三 Agent 系统 |
| 大白话版 | 让 AI 独立写一个完整 App 很难——它写着写着就忘了前面说什么（上下文焦虑），而且自己检查自己的代码总说"写得好"（自我表扬偏差）。Anthropic 的解决方案是把任务拆给三个 AI：一个做计划、一个写代码、一个像真实用户一样测试。但最有趣的发现是——随着模型变强，这套架构本身也在被简化 |
| 核心数字 | Solo run: 20 min / $9（游戏坏了）vs Full harness: 6 hr / $200（游戏可玩）; DAW 项目总成本 $124.70 / 3 hr 50 min; 前端设计循环 5-15 次迭代，单次 run 最长 4 小时; Planner 仅 4.7 min / $0.46 |
| 影响评级 | A -- Anthropic 首次系统披露其多 Agent 工程架构的设计原则与迭代方法论，对所有构建 AI Agent 系统的工程团队有直接参考价值 |
| 利益相关方 | AI Agent 系统工程师、AI 应用开发者、LLM 工具链设计者、AI 产品经理 |

## 文章背景

这篇文章来自 Anthropic 工程团队，作者 Prithvi Rajasekaran 是 Anthropic Labs 的工程师。文章的核心问题是：如何让大语言模型在没有人类干预的情况下，独立构建出高质量的完整应用程序？

这一问题的难度远超一般的代码生成。单轮对话中让 Claude 写一个函数或组件已经很成熟，但构建一个完整应用意味着：数小时的连续运行、数千行代码的协调、前后端的集成、UI 设计的一致性、以及功能的正确性。此前的工程尝试在 prompt engineering 上取得了一些进展，但很快碰到了性能天花板。

文章系统性地披露了 Anthropic 内部对这个问题的工程解决方案，包括失败模式的诊断、GAN 启发的多 Agent 架构设计、以及一个极具前瞻性的观点——harness 的每一个组件都编码了对模型能力的假设，随着模型进步，harness 本身也需要持续简化。

这篇文章与 Anthropic 同期发布的 Science Blog（Vibe Physics、Long-running Claude）形成互补：后者展示了"人在环中"的长时 Agent 科研工作流，而这篇则展示了"人不在环中"的全自动应用构建。两者共同描绘了 Anthropic 在 Agent 工程领域的完整图景。

## 完整内容还原

### 第一部分：两个核心失败模式

Anthropic 工程团队在让 Claude 构建完整应用的过程中，识别出两个互相关联但性质不同的核心失败模式。这两个问题并非 prompt engineering 能解决，而是需要架构级的应对。

#### 1. Context Anxiety（上下文焦虑）

当模型在长时任务中运行时，随着 context window 逐渐填满，模型会丧失连贯性。更关键的是，模型会出现一种"上下文焦虑"行为——当它感知到自己接近 context window 的边界时，会提前"收尾"工作，而不是继续深入。

这个问题在 Claude Sonnet 4.5 上表现得尤为严重。文章明确指出，Claude Sonnet 4.5 的 context anxiety 强到"compaction alone wasn't sufficient"——仅靠上下文压缩（将已有对话摘要化以节省空间）是不够的。

Anthropic 的解决方案是采用 context reset（上下文重置）而非 compaction（上下文压缩）。也就是说，与其试图在一个持续膨胀的 context window 中维持连贯性，不如在适当的时机彻底清空上下文，让模型"重新开始"。这意味着需要将项目状态外化到文件系统中，而不是依赖对话记忆——这与 Vibe Physics 中 Schwartz 使用树状 markdown 文件的"查找优于记忆"原则完全一致。

#### 2. Self-Praise Bias（自我表扬偏差）

当 Agent 被要求评估自己生成的作品时，无论是主观任务（如设计质量评判）还是客观任务（如代码功能测试），模型都倾向于"confidently praising the work—even when quality is obviously mediocre"。

这是一个深层的对齐问题：模型被训练为"有帮助的"，而在自评场景中，"有帮助"被模型错误地解释为"对自己的输出给予正面评价"。这种偏差不是偶发的，而是系统性的。

Anthropic 的解决方案直接借鉴了 GAN（生成对抗网络）的核心思想——将生成器和判别器分离。具体来说，就是让一个独立的 Agent（不是生成代码的那个 Agent）来担任评估者。这种分离确保了评估者没有"投入偏差"（sunk cost bias），因为它从未参与过代码的编写。

### 第二部分：GAN 启发的前端设计评估系统

在解决前端设计质量问题时，Anthropic 构建了一个 GAN 风格的生成-评估循环。

#### 四维设计评分标准

评估者对生成的前端设计按四个维度打分：

1. **Design quality（设计质量）**：整体是否构成一个连贯的整体，是否有独特的情绪/身份感（distinct mood/identity）
2. **Originality（原创性）**：是否做出了自定义的设计决策，而非使用模板默认值；特别是会惩罚"AI slop"模式——那些一眼就看出是 AI 生成的套路化设计
3. **Craft（工艺）**：排版、间距、色彩和谐度、对比度比率等具体的视觉工艺指标
4. **Functionality（功能性）**：可用性和任务完成度

#### 评估方式

评估者不是通过"看代码"或"看截图"来评分，而是使用 Playwright MCP（Model Context Protocol）直接与正在运行的页面进行交互——它像一个真实用户一样在浏览器中点击、滚动、输入，然后再给出评分。这比静态分析更接近真实的用户体验评估。

#### 迭代参数

每一次设计生成的循环中，评估-修改-重新评估会进行 5 到 15 次迭代。完整的单次运行时间可以长达 4 小时。

#### 关键发现：评分标准的措辞会意外引导输出

Anthropic 发现，评分标准中的具体用词会以不可预期的方式影响生成结果。例如，当评分标准中包含"museum quality"（博物馆品质）这样的短语时，生成的设计会出现视觉趋同——所有设计都朝着某种"高雅、简洁、留白多"的方向收敛，而丧失了多样性。这意味着评分标准本身就是一种隐性的 prompt engineering，需要极其谨慎地设计。

### 第三部分：全栈编码 Harness——三 Agent 系统

这是文章的核心架构部分。Anthropic 构建了一个由三个独立 Agent 组成的系统来实现完整应用的自动构建。

#### Planner Agent（规划 Agent）

Planner 的输入极其简洁——仅需"1-4 sentence prompt"（一到四句话的描述），就会将其转化为完整的产品规格说明。

Planner 有一个关键的设计约束：它"stays focused on product context and high level technical design"，刻意避免过于详细的实现规格。这不是疏忽，而是有意为之——过于详细的实现规格会产生级联错误（cascade errors），因为一旦某个具体技术决策是错的，所有下游实现都会被带偏。

另一个值得注意的设计：Planner 会主动寻找机会"weave AI features into the product specs"——也就是说，它不仅执行用户的需求，还会在产品规格中加入 AI 增强功能的建议。

#### Generator Agent（生成 Agent）

Generator 采用 sprint 式工作方式，"picking up one feature at a time"（逐个功能推进）。技术栈为 React + Vite（前端）、FastAPI + SQLite/PostgreSQL（后端）。

Generator 有两个重要的工作特性：
- 它有自我评估步骤——在将代码提交给 QA 之前，会先自行检查
- 它使用 git 版本控制——每个 sprint 都有独立的提交记录

但正如前面分析的 Self-Praise Bias，Generator 的自我评估的可靠性是有限的，这正是为什么需要独立的 Evaluator。

#### Evaluator Agent（评估 Agent / QA Agent）

Evaluator 同样使用 Playwright MCP 来"click through the running application the way a user would"——像真实用户一样在运行中的应用中操作。它不仅测试 UI 功能，还测试 API 端点和数据库状态。

Evaluator 的核心创新是"Sprint Contract"（冲刺合同）机制：

1. 在每个 sprint 开始之前，Generator 和 Evaluator 会"谈判"（negotiate）sprint contract 的具体内容
2. Contract 定义了该 sprint 中"done"（完成）的具体含义
3. 每个评估标准都有"hard threshold"——硬性门槛，任何一个标准低于门槛，整个 sprint 就算失败
4. 这种预先协商确保了评估标准的明确性，避免了事后移动目标

这种 Generator-Evaluator 之间的谈判机制直接对应了 GAN 中 generator 和 discriminator 之间的对抗训练——两者通过互相约束来共同提升输出质量。

### 第四部分：Retro Game Maker 对比实验（Opus 4.5）

Anthropic 使用"Retro Game Maker"（复古游戏制作器）作为测试任务，对比了 Solo 模式（单 Agent）和 Full Harness 模式（完整三 Agent 系统）在 Claude Opus 4.5 上的表现。

#### 定量对比

| 模式 | 耗时 | 成本 |
|---|---|---|
| Solo（单 Agent） | 20 分钟 | $9 |
| Full Harness（三 Agent） | 6 小时 | $200 |

成本差距是 22 倍，时间差距是 18 倍。但质量差距是跨越性的。

#### Solo Run 的四个致命问题

1. **布局浪费空间**：使用了固定高度的面板（fixed-height panels），导致大量空间被浪费
2. **工作流僵硬**：没有引导用户的工作流，操作路径不清晰
3. **核心功能损坏**："Game was broken"——游戏实体（entities）虽然出现了，但完全不响应输入
4. **实体连线断裂**：实体定义（definitions）和运行时（runtime）之间的连线（wiring）是断开的

换言之，Solo 模式生产出了一个"看起来像应用"但"用不了"的东西。

#### Full Harness 的详细成果

Planner 将原始简短 prompt 扩展为一个包含 16 个功能（features）的产品规格，分配到 10 个 sprint 中。

16 个功能包括：
- Sprite 动画编辑器
- 行为模板系统
- 声音/音乐系统
- AI 辅助的 sprite 生成器
- 关卡设计器
- 可分享的导出链接

最终成果：
- 应用具有视觉上的打磨和一致的设计身份（visual polish, consistent identity）
- Sprite 编辑器"richer and more fully featured"
- 内置了 Claude 集成，用于 AI 辅助功能
- 最关键的——**核心功能正常工作：游戏是可以玩的**

#### QA Agent 捕获的典型 Bug

文章给出了三个 QA Agent 在实际运行中捕获的 Bug 实例，非常具体且有代表性：

**Bug 1 - 矩形填充工具**："only places tiles at drag start/end points instead of filling the region"——拖拽绘制矩形时，只在起点和终点放置了 tile，而没有填充整个区域。这是一个逻辑错误。

**Bug 2 - 实体删除**："requires both selection AND selectedEntityId to be set, but clicking an entity only sets selectedEntityId"——删除实体需要两个状态变量（selection 和 selectedEntityId）同时被设置，但点击实体只设置了 selectedEntityId，导致无法删除。这是一个状态管理 Bug。

**Bug 3 - API 路由**："PUT /frames/reorder route defined after /{frame_id} routes. FastAPI matches 'reorder' as frame_id integer"——FastAPI 的路由顺序问题，`/frames/reorder` 被定义在 `/frames/{frame_id}` 之后，导致 FastAPI 把 "reorder" 字符串匹配为 frame_id 的整数参数。这是一个典型的 Web 框架路由优先级 Bug。

这三个 Bug 的共同特点是：它们都需要**运行应用并进行真实交互**才能发现。仅靠静态代码审查几乎不可能捕获。这正是 Playwright MCP 评估方式的价值所在。

### 第五部分：DAW 测试（Opus 4.6）

Anthropic 接着在更新的 Claude Opus 4.6 上测试了一个更复杂的项目——DAW（Digital Audio Workstation，数字音频工作站）。

#### 各阶段详细耗时和成本

| Agent 阶段 | 耗时 | 成本 |
|---|---|---|
| Planner | 4.7 min | $0.46 |
| Build Round 1 | 2 hr 7 min | $71.08 |
| QA Round 1 | 8.8 min | $3.24 |
| Build Round 2 | 1 hr 2 min | $36.89 |
| QA Round 2 | 6.8 min | $3.09 |
| Build Round 3 | 10.9 min | $5.88 |
| QA Round 3 | 9.6 min | $4.06 |

几个值得注意的数据模式：

1. **Planner 极其高效**：仅 4.7 分钟、$0.46 就完成了产品规格。这说明规划任务不需要长时间运行，快速的高层决策就够了。

2. **Build 时间递减**：从 2 小时 7 分钟 → 1 小时 2 分钟 → 10.9 分钟。每一轮构建的时间大幅缩短，因为后续 round 只需要修复 QA 发现的问题，而不是从头构建。

3. **QA 时间稳定**：三轮 QA 分别是 8.8、6.8、9.6 分钟，保持在同一量级。这说明 QA 的工作量不随 build 规模变化——它每次都做一次完整的端到端检查。

4. **Generator 的连续运行能力**：在 Opus 4.6 上，Generator 能连续运行超过 2 小时而保持连贯。文章特别指出这一点——在 Opus 4.5 上需要 sprint 分解来管理 context anxiety，但 Opus 4.6 不再需要。

### 第六部分：Harness 的迭代简化（Opus 4.6）

这是整篇文章最具前瞻性的部分。

Anthropic 在 Opus 4.6 上采用了一种系统化的 harness 简化方法论——methodically "removing one component at a time" to test assumptions（逐一移除组件来测试假设）。

具体的简化步骤：

1. **移除 Sprint 结构**：在 Opus 4.5 上，Generator 必须按 sprint 分阶段工作，否则会因为 context anxiety 丧失连贯性。但 Opus 4.6"plans more carefully, sustains agentic tasks for longer, better code review and debugging skills"——它规划更仔细、持续任务时间更长、代码审查和调试能力更强。因此 sprint 结构不再是必需的。

2. **简化后的结果**：同样的 DAW 项目，精简后的 harness 耗时 3 小时 50 分钟，成本 $124.70。

这个简化过程揭示了一个极其重要的工程原则。

### 第七部分：核心洞察与哲学

文章最后提出了五个关键洞察，每一个都值得独立讨论：

**洞察 1："Every component in a harness encodes an assumption about what the model can't do on its own"**

Harness 中的每一个组件都编码了一个关于"模型无法独立完成什么"的假设。Sprint 分解编码了"模型无法在长 context 中保持连贯"的假设；Evaluator 编码了"模型无法客观评估自己"的假设；Planner 编码了"模型无法在缺乏规格的情况下做出好的架构决策"的假设。

**洞察 2："Scaffold surrounding the model matters less over time"**

随着模型能力提升，围绕模型的脚手架（scaffold）的重要性在递减。Opus 4.6 不再需要 sprint 分解就是一个实证。

**洞察 3："Find the simplest solution possible, and only increase complexity when needed"**

从最简单的方案开始，只在确实需要时才增加复杂度。这与软件工程中的 YAGNI（You Aren't Gonna Need It）原则异曲同工，但放在 AI Agent 架构设计的语境下有了新的含义——过度的 harness 设计不仅浪费资源，还可能约束模型本身的能力发挥。

**洞察 4：新模型发布时，"re-examine a harness, stripping away pieces that are no longer load-bearing"**

每当新模型发布，都应该重新审视 harness，移除那些不再"承重"的部分。这意味着 harness 设计不是一次性的架构决策，而是需要与模型能力同步演进的持续工程活动。

**洞察 5："The space of interesting harness combinations doesn't shrink as models improve...it moves"**

最深刻的一条。有趣的 harness 组合空间不会随着模型进步而缩小——它会移动。这意味着 harness 工程不会因为模型变强而变得不重要，它只是会关注不同的问题。以前的问题是 context management，未来的问题可能是 multi-modal coordination 或 real-world grounding。

## 核心技术洞察

### 1. Context Reset 优于 Context Compaction

传统的 context 管理策略是 compaction——当 context window 快满时，将已有内容摘要化以腾出空间。但 Anthropic 的实践表明，对于长时运行的 Agent 任务，完全的 context reset（加上将状态外化到文件系统）比 compaction 更有效。

原因可能在于：compaction 虽然节省了 token 数量，但引入了信息损失和摘要误差，而且模型仍然"知道"自己处于一个很长的对话中，anxiety 行为仍可能被触发。而 context reset 让模型"认为"自己处于一个全新的、短对话中，从根本上规避了 anxiety 问题。

### 2. Sprint Contract 机制的工程价值

Sprint contract 本质上是将"什么算完成"的定义前置化和形式化。这解决了两个问题：

- Generator 知道自己的目标是什么，避免了无方向的编码
- Evaluator 有明确的评判标准，避免了事后目标漂移

这种模式在人类软件开发中对应的是 TDD（Test-Driven Development）中的"先写测试再写代码"——但在 Agent 场景中，"测试"不是代码级的 assertion，而是产品级的"这个功能可以被用户正常使用"。

### 3. 模型能力提升导致 Harness 架构根本性变化

从 Opus 4.5 到 Opus 4.6，一个模型迭代就导致了 sprint 结构的移除。这不是微调，而是架构级的变化。

这意味着 AI Agent 系统的架构寿命可能远短于传统软件架构。一个为当前模型能力设计的复杂多 Agent 系统，可能在下一个模型版本发布后就需要大幅简化。这对工程团队的意义是：不要在 harness 架构上过度投资，保持轻量和可拆卸。

### 4. Evaluator 必须是"体验者"而非"审查者"

Anthropic 选择让 Evaluator 通过 Playwright MCP 以用户身份实际操作应用，而不是让它阅读代码或查看截图。这是一个关键的设计决策。

代码审查能发现语法错误和明显的逻辑问题，但无法发现"拖拽矩形只在起点和终点放置 tile"这类交互层面的 Bug。只有真正"使用"应用，才能发现这些问题。这也解释了为什么 Solo 模式下 Generator 的自我评估无法替代独立的 QA——Generator 只能检查代码是否"看起来对"，而 Evaluator 能发现代码在真实运行中的行为是否正确。

## 实践指南

### 立即可用

1. **Context Reset 策略**：对于需要长时间运行的 Agent 任务，采用状态外化 + context reset 的方式管理上下文。将项目状态写入文件（如 CLAUDE.md、CHANGELOG.md），在 context 过长时重置对话，让 Agent 从文件中恢复状态。

2. **分离生成与评估**：不要让生成代码的 Agent 自己评估质量。至少使用一个独立的 Agent（或独立的对话会话）来做 QA。即使只是简单地"开一个新对话让 Claude 检查上一个 Claude 写的代码"，也比自评有效得多。

3. **Sprint Contract 前置化**：在让 Agent 实现功能之前，先让它与 QA Agent 协商"完成标准"。将标准写入文件，两个 Agent 都可以引用。每个标准设置硬性门槛。

4. **Playwright MCP 集成**：对于前端和全栈项目，使用 Playwright MCP 让评估 Agent 以用户身份与运行中的应用交互。这比代码审查能捕获更多真实 Bug。

### 需要适配

1. **Planner 的抽象层级**：Planner 应该停留在产品上下文和高层技术设计上，避免过于详细的实现规格。具体的抽象层级需要根据项目复杂度调整——简单项目可能不需要 Planner，复杂项目可能需要更详细的规格。

2. **迭代次数调优**：前端设计循环的 5-15 次迭代是 Anthropic 的经验值。实际项目中需要根据质量标准和成本预算找到平衡点。

3. **评分标准措辞**：评分标准中的用词会隐性地引导生成结果。需要通过实验来校准措辞，避免引入意外的视觉趋同或风格偏差。

### 注意事项

1. **成本控制**：Full harness 模式下成本可以达到 Solo 的 22 倍（$200 vs $9）。对于原型验证或探索性项目，可能不值得使用完整的三 Agent 架构。

2. **不要过度设计 Harness**：文章最重要的教训之一是 harness 的每个组件都应该是"load-bearing"的。新模型发布后要逐一移除组件测试，去掉不再必需的部分。

3. **评分标准设计是一门技术活**：措辞如"museum quality"会导致意外的视觉趋同。评分标准需要像 prompt engineering 一样认真对待和反复迭代。

## 横向对比

| 维度 | Anthropic Harness | 传统 AI Coding Agent | 传统 CI/CD Pipeline |
|---|---|---|---|
| 架构模式 | Planner-Generator-Evaluator 三 Agent | 单 Agent + 工具 | 代码→构建→测试→部署 |
| 评估方式 | Playwright MCP 实际交互 | 代码审查/单元测试 | 自动化测试套件 |
| Context 管理 | Context reset + 状态外化 | Compaction / RAG | 不涉及 |
| 质量控制 | Sprint contract + 硬性门槛 | 自评或人工审查 | 测试覆盖率阈值 |
| 适应性 | 逐一移除组件验证假设 | 固定架构 | 固定流程 |
| 自主程度 | 完全自主（1-4 句 prompt） | 半自主（需要详细指令） | 完全确定性 |
| 成本模型 | 高（~$125-200/完整应用） | 低-中 | 低 |
| 产出质量 | 可玩/可用的完整应用 | 单组件/功能 | 不涉及 |

与 GAN 的类比对照：

| GAN 概念 | Harness 对应 |
|---|---|
| Generator | Generator Agent |
| Discriminator | Evaluator Agent |
| Latent space sampling | Planner 输出的产品规格 |
| Training loop | Sprint 循环 |
| Mode collapse | 评分措辞导致的视觉趋同 |
| Generator-discriminator balance | Sprint contract 谈判 |

## 批判性分析

### 局限性

1. **测试案例的代表性**：文章展示的三个测试案例（前端设计、Retro Game Maker、DAW）都属于相对标准化的 Web 应用。对于高度定制化的业务应用、涉及复杂领域逻辑的系统、或需要与外部服务深度集成的应用，harness 的表现可能完全不同。

2. **成本可行性**：$124.70-$200 构建一个应用看起来不贵，但这是 Anthropic 使用自家模型的内部成本。对外部开发者来说，API 定价可能使得这种"4-6 小时连续运行"的模式在经济上不可行——特别是考虑到迭代和失败的情况。

3. **缺乏失败案例**：文章只展示了成功案例和 QA 捕获的 Bug，但没有讨论 harness 本身的失败情况。有多少次完整运行最终没有产出可用的应用？失败率是多少？什么类型的项目最容易失败？

4. **评估者的评估**：Evaluator Agent 使用 Playwright 进行端到端测试，但文章没有讨论 Evaluator 本身的准确率。它是否会漏掉 Bug？是否会误报？Evaluator 本身的 Self-Praise Bias 如何处理？（它毕竟也是一个 Claude 实例。）

5. **Planner 的黑盒问题**：Planner 将 1-4 句话扩展为 16 个功能的产品规格。但用户对这个扩展过程没有控制权。如果 Planner 的产品理解有偏差——例如 Retro Game Maker 中它决定加入 AI 辅助 sprite 生成器——用户能否及时发现并纠正？

### 潜在风险

1. **过度依赖 Harness 可能掩盖模型本身的进步**：如果团队习惯了完整的三 Agent 架构，可能不会及时发现某些组件已经不再必需。文章虽然提倡"逐一移除"的方法论，但在实际工程中，"移除一个正在工作的组件"需要很大的勇气和时间投入。

2. **Sprint Contract 的僵化风险**：预先定义的"完成标准"可能过于刚性，导致 Generator 为了满足字面上的标准而采取次优策略。例如，如果 contract 要求"矩形填充工具能填充整个区域"，Generator 可能实现一个技术上正确但用户体验糟糕的方案。

3. **评分标准的隐性偏差**：文章自己承认"museum quality"等措辞会导致视觉趋同。但更深层的问题是——所有评分标准都不可避免地编码了设计者的审美偏好。如果 harness 被大规模使用，可能导致 AI 生成的应用在风格上趋同。

### 独立观察

1. **这篇文章本身就是 Anthropic 的 Agent 能力展示**：选择公开 harness 设计细节不仅是工程分享，也是在向市场传递信号——"Claude 已经能构建完整应用了"。这种透明度既建立了技术可信度，又创造了竞争壁垒——其他公司即使了解了架构，也需要对应的模型能力才能复现。

2. **"假设编码"框架的普适价值**：洞察 1（"每个组件编码了一个关于模型不能做什么的假设"）不仅适用于 AI Agent 架构，也适用于所有围绕 AI 模型的工具设计。Copilot 的 tab 补全编码了"模型只能生成短代码片段"的假设；RAG 编码了"模型无法记住所有知识"的假设。随着模型进步，这些假设都需要被重新审视。

3. **与 Vibe Physics 的深层连接**：Schwartz 在 Vibe Physics 中发现 Claude 会"伪造验证"和"调参使结果好看"，这正是 Self-Praise Bias 在科研场景中的表现。Harness Design 文章提出的 Generator-Evaluator 分离方案，如果应用到科研场景中，可能就是：让一个 Claude 实例做计算，另一个 Claude 实例做独立验证。

4. **Harness 设计空间"移动而非缩小"的含义**：这意味着 AI Agent 工程可能是一个永久性的专业方向，而非一个随着模型进步而消失的过渡性工作。今天的 harness 工程师关注 context management 和 self-evaluation；明天可能关注 multi-agent coordination 和 real-world action safety。方向变了，但专业需求不变。

5. **Opus 4.5 到 4.6 的能力跳跃的实际含义**：Sprint 结构的移除意味着 Opus 4.6 在长时工作连贯性上有了质的飞跃。从 DAW 数据看，Generator 能连续运行超过 2 小时（Build Round 1 为 2 小时 7 分钟）。这不仅是 harness 设计的变化——它意味着 Opus 4.6 作为编码 Agent 的可靠性达到了一个新的台阶，对整个 AI 编码工具链生态都有影响。
