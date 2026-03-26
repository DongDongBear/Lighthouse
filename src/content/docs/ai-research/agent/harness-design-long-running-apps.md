---
title: '深度解读：Harness Design for Long-Running Application Development'
description: 'Anthropic 工程博客深度解读——如何用多 Agent 架构（Planner-Generator-Evaluator）让 Claude 自主构建完整应用，以及 Harness 设计随模型能力演进的迭代方法论'
---

> 原文：[Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
> 作者：Prithvi Rajasekaran（Anthropic Labs 团队）
> 发布日期：2026 年 3 月 24 日

## 一、这篇文章在讲什么

这篇文章是 Anthropic 工程博客的一篇重磅技术文章。作者 Prithvi Rajasekaran 来自 Anthropic Labs 团队，他在过去几个月里一直在解决两个相互关联的问题：**让 Claude 生成高质量的前端设计**，以及**让 Claude 在无人干预的情况下构建完整的应用程序**。

文章的核心贡献是一个**三 Agent 架构**——Planner（规划者）、Generator（生成者）、Evaluator（评估者）——能够在多小时的自主编码会话中生成功能丰富的全栈应用。

这不是一篇空谈理论的论文。作者直接展示了：
- 用一句话 prompt 让系统自主构建了一个 **2D 复古游戏制作器**（RetroForge）
- 用一句话 prompt 构建了一个**浏览器端 DAW（数字音频工作站）**
- 详细的成本和时间数据（4 小时、$124）
- 真实的失败案例和评估者抓到的 bug 清单

## 二、核心问题：为什么朴素实现会失败

作者首先指出了单 Agent 长时运行的两个根本性失败模式：

### 2.1 上下文窗口退化（Context Anxiety）

随着上下文窗口填满，模型会逐渐失去连贯性。更要命的是，某些模型（如 Sonnet 4.5）会表现出**"上下文焦虑"**——当它们认为自己接近上下文限制时，会过早地开始收尾工作，即便实际上还有大量工作未完成。

**关键区分**：作者在这里做了一个非常重要的概念区分——**Compaction（压缩）** vs **Context Reset（上下文重置）**：

| | Compaction | Context Reset |
|--|-----------|--------------|
| 做法 | 将对话历史早期部分原地压缩摘要 | 完全清空上下文窗口，启动一个全新的 Agent |
| 连续性 | 保留（同一个 Agent 继续工作） | 断裂（新 Agent 从结构化交接文件恢复状态） |
| 能否解决 Context Anxiety | 不能——Agent 仍然"记得"自己已经工作很久了 | 能——Agent 获得一个全新的干净起点 |
| 代价 | 低 | 高——需要编排复杂度、token 开销、交接延迟 |

这个区分有深刻的工程意义。Compaction 看起来更优雅（保持同一个 Agent 的连续性），但在 Sonnet 4.5 上的实测证明它不够。只有 Context Reset 才能彻底消除 Context Anxiety。

不过到了 Opus 4.6，由于模型本身的长上下文能力大幅提升，作者**完全去掉了 Context Reset**，回归了单会话 + 自动 Compaction 的模式。这说明 Harness 设计必须随模型能力演进而不断简化。

### 2.2 自我评估失效

当 Agent 被要求评估自己的工作时，它倾向于**自信地夸赞自己的成果**——即使输出质量在人类观察者看来明显平庸。这种现象在主观任务（如设计）上尤其严重，因为不存在像测试通过/失败那样的二元验证。

作者的核心洞察：**把做工作的 Agent 和判断工作的 Agent 分开，是解决这个问题的强力杠杆**。分离本身并不会立即消除 LLM 对 LLM 输出的宽容倾向，但调优一个独立的评估者使其变得苛刻，远比让生成者对自己的工作变得挑剔要容易得多。

## 三、前端设计实验：让主观质量可评分

### 3.1 GAN 灵感

作者从 **GAN（生成对抗网络）** 中获得灵感，设计了 Generator-Evaluator 的对抗结构。这不是说他真的在训练一个 GAN，而是借用了其核心思想——生成器和判别器的博弈推动整体质量提升。

### 3.2 四维评分标准

这是文章的一个重要贡献。作者将"设计好不好"这种主观判断，分解为四个可评分的维度：

1. **Design Quality（设计质量）**：设计是否感觉是一个连贯的整体，而非拼凑的零件？颜色、排版、布局、意象是否组合出了独特的氛围和身份？
2. **Originality（原创性）**：是否有自主的设计决策，还是模板布局、库默认值、AI 生成模式？未修改的库存组件——或典型的 AI 生成标志（如白色卡片上的紫色渐变）——在这里会失分。
3. **Craft（工艺）**：排版层级、间距一致性、色彩和谐、对比度。这是能力检查而非创意检查。
4. **Functionality（功能性）**：独立于美学的可用性。用户能否理解界面功能、找到主要操作、完成任务？

**权重设计的哲学**：作者刻意将 Design Quality 和 Originality 的权重设得更高。原因是 Claude 在 Craft 和 Functionality 上默认表现就不错，但在设计和原创性上往往产出平庸的"AI 泔水"。通过加重这两个维度的权重，推动模型承担更多美学风险。

### 3.3 评估者的工作方式

评估者不是看截图打分，而是通过 **Playwright MCP** 实际操作运行中的页面——导航、截屏、仔细研究实现——然后才给出评估。这种"用户视角评估"比静态分析有效得多。

### 3.4 迭代过程中的发现

- 每次生成运行 **5-15 轮迭代**，每轮都推动生成器向更独特的方向发展
- 全量运行最长可达**四小时**
- 评分通常随迭代改善，但**并非线性**——作者多次发现自己更喜欢中间某轮的结果而非最终轮
- 实现复杂度随迭代递增
- 即使第一轮（无评估者反馈），有评分标准的输出就已明显优于完全无 prompt 的基线

最惊艳的例子：一个荷兰艺术博物馆网站的生成。前9轮迭代产出了一个干净的暗色主题落地页，符合预期但在预期之内。然后**第10轮**，生成器完全推翻了方案，将网站重新构想为一个**空间体验**——一个用 CSS 透视渲染的 3D 房间，格子地板，画作以自由位置挂在墙上，通过门廊导航在画廊房间之间切换。作者说这是他之前从未从单轮生成中见过的创造性飞跃。

这个例子说明了评估者驱动的迭代可以突破 LLM 的"安全区"，产生真正出人意料的创意输出。

## 四、全栈编码：三 Agent 架构

### 4.1 三个 Agent 的职责

| Agent | 角色 | 核心设计 |
|-------|------|---------|
| **Planner** | 将 1-4 句 prompt 扩展为完整的产品规格说明书 | 被指示要"雄心勃勃"、聚焦产品上下文和高层技术设计，而非细粒度实现细节。因为如果 Planner 在前期指定了错误的细粒度技术细节，这些错误会级联到下游实现中。 |
| **Generator** | 按 Sprint 逐个功能实现，使用 React + Vite + FastAPI + SQLite/PostgreSQL 技术栈 | 每个 Sprint 结束后自我评估，然后交给 QA。有 git 版本控制。 |
| **Evaluator** | 通过 Playwright MCP 像用户一样点击运行中的应用进行测试 | 对每个 Sprint 按标准评分，低于阈值则 Sprint 失败，给出详细反馈。 |

### 4.2 Sprint Contract 机制

在每个 Sprint 开始前，Generator 和 Evaluator 会**协商一份 Sprint Contract**——在写任何代码之前，先就"完成的定义"达成一致。

这个设计解决了一个实际问题：产品规格说明书是故意写得高层次的（避免细节错误级联），但 Evaluator 需要具体的可测试行为。Sprint Contract 就是这个桥梁——Generator 提出要构建什么以及如何验证成功，Evaluator 审查这个提案确保 Generator 在构建正确的东西。两者迭代直到达成一致。

### 4.3 通信方式：文件

Agent 之间的通信通过**文件**进行——一个 Agent 写一个文件，另一个 Agent 读取并回应。这种基于文件的通信方式简单、可审计、可持久化，比内存共享或消息传递更稳健。

### 4.4 Solo vs Full Harness 实测对比

用同一个 prompt——"创建一个 2D 复古游戏制作器"：

| 维度 | Solo（单 Agent） | Full Harness（三 Agent） |
|------|-----------------|------------------------|
| 时间 | 20 分钟 | 6 小时 |
| 成本 | $9 | $200 |
| 功能范围 | 基本编辑器+损坏的播放模式 | 16 个功能、10 个 Sprint，包括精灵动画、行为模板、音效音乐、AI 辅助生成、游戏导出等 |
| 布局 | 浪费空间，固定高度面板 | 全视口 Canvas，合理的面板尺寸，一致的视觉语言 |
| 核心功能 | **游戏实际上无法运行**——实体出现在屏幕上但不响应输入 | 能够实际移动角色并游玩 |

Solo 运行最致命的问题：核心功能（游戏可玩性）是坏的，而且没有任何表面指示告诉你哪里坏了。代码深处的布线断裂。

而 Full Harness 的 Evaluator 在每个 Sprint 都用 Playwright 实际测试运行中的应用，抓住了大量真实 bug。文章给了几个具体例子：

| Sprint Contract 条款 | Evaluator 发现 |
|---------------------|---------------|
| 矩形填充工具应允许点击拖动填充区域 | FAIL — 工具只在拖动起始/结束点放置瓷砖，而非填充区域。`fillRectangle` 函数存在但在 `mouseUp` 时未正确触发。 |
| 用户可以选择并删除已放置的实体生成点 | FAIL — `LevelEditor.tsx:892` 的 Delete 键处理需要同时设置 `selection` 和 `selectedEntityId`，但点击实体只设置了后者。条件应为 `selection \|\| (selectedEntityId && activeLayer === 'entity')`。 |
| 用户可以通过 API 重新排列动画帧 | FAIL — `PUT /frames/reorder` 路由定义在 `/{frame_id}` 路由之后。FastAPI 将 'reorder' 匹配为 frame_id 整数并返回 422。 |

注意 Evaluator 给出的反馈精确到了**具体文件、具体行号、具体条件表达式**。这不是泛泛的"有 bug"，而是可直接采取行动的诊断。

### 4.5 调优 Evaluator 的艰难过程

作者坦言：**Claude 开箱即用是一个糟糕的 QA Agent**。在早期运行中，他观察到 Evaluator 识别出了合理的问题，然后说服自己这些问题"不是什么大问题"就批准了。它还倾向于表面测试，而非探测边界情况。

调优循环是：
1. 阅读 Evaluator 的日志
2. 找到它的判断与自己判断不一致的地方
3. 更新 QA 的 prompt 来解决这些问题
4. 重复多轮

这再次印证了一个深刻的工程原则：**Prompt 工程不是一次性的，它是一个持续的校准过程**，需要人类在循环中不断对齐 Agent 的判断与自己的标准。

## 五、Harness 随模型进化而简化

这是文章最有方法论价值的部分。

### 5.1 核心原则

> "Harness 中的每个组件都编码了一个关于模型不能独立完成什么的假设，这些假设值得压力测试，既因为它们可能是错误的，也因为它们可能随着模型改进而迅速过时。"

这与 Anthropic 之前在 [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) 中的原则一脉相承：**找到最简单的可行方案，只在需要时增加复杂度**。

### 5.2 从 Opus 4.5 到 Opus 4.6 的简化

| 组件 | Opus 4.5 版本 | Opus 4.6 版本 | 变化原因 |
|------|-------------|-------------|---------|
| Context Reset | 必需（解决 Context Anxiety） | 去掉 | Opus 4.6 大幅改善了长上下文能力，Context Anxiety 基本消失 |
| Sprint 分解 | 必需（分解工作为可管理的块） | 去掉 | Opus 4.6 能原生处理不分解的长任务 |
| Planner | 保留 | 保留 | 没有 Planner，Generator 会范围不足 |
| Evaluator | 每个 Sprint 评估 | 仅在最后做一次 pass | 对于 4.6 能力范围内的任务，Evaluator 是不必要的开销；只对边缘任务仍有价值 |

### 5.3 Evaluator 的动态价值

作者对 Evaluator 的分析特别微妙：

> "Evaluator 不是一个固定的 yes-or-no 决策。当任务处于当前模型不能可靠独立完成的边界时，它才值得花这个成本。"

这意味着 Evaluator 的价值是**相对于模型能力的**。模型越强，Evaluator 有价值的场景越少，但它的价值边界也在同步外移——因为更强的模型让你可以尝试更复杂的任务。

### 5.4 简化后的 DAW 实测

简化后的 Harness 用一句话 prompt 构建了一个浏览器端 DAW：

| Agent 与阶段 | 时间 | 成本 |
|-------------|------|------|
| Planner | 4.7 分钟 | $0.46 |
| Build（第1轮） | 2 小时 7 分钟 | $71.08 |
| QA（第1轮） | 8.8 分钟 | $3.24 |
| Build（第2轮） | 1 小时 2 分钟 | $36.89 |
| QA（第2轮） | 6.8 分钟 | $3.09 |
| Build（第3轮） | 10.9 分钟 | $5.88 |
| QA（第3轮） | 9.6 分钟 | $4.06 |
| **总计** | **3 小时 50 分钟** | **$124.70** |

Generator 在没有 Sprint 分解的情况下连贯地运行了**超过两小时**。这在 Opus 4.5 上是不可能的。

QA 仍然抓到了真实的问题——比如音频录制仍然是 stub、片段不能拖动调整大小、效果可视化只是数字滑块而非图形化的 EQ 曲线。

## 六、更广泛的启示

### 6.1 Harness 设计是一门持续的工程

文章的结论部分有一句话值得反复品味：

> "随着模型改进，有趣的 Harness 组合空间不会缩小。它会移动，AI 工程师的有趣工作是不断找到下一个新组合。"

这意味着 AI 工程不会因为模型变强而变得无聊。相反，每次模型升级都打开了新的 Harness 设计空间，让你可以尝试以前不可能的任务。

### 6.2 Evaluator 模式的普适性

Generator-Evaluator 分离不仅适用于编码，它可以推广到任何需要质量控制的 Agent 工作流：
- 写作：生成者写、评估者从读者视角审
- 研究：收集者找、评估者验证
- 数据分析：分析者做、评估者交叉验证

### 6.3 Sprint Contract 的启发

Sprint Contract 机制——在动手之前先就"完成的定义"达成一致——是一种非常实用的 Agent 间协调模式。它避免了两种极端：
- 极端一：产品规格写得太细，细节错误级联
- 极端二：完全不规范，Agent 各做各的

### 6.4 文件通信 vs 消息传递

Agent 间通过文件通信的选择看似低技术，但有深刻的好处：
- **可审计**：所有通信都是持久化的
- **可重启**：如果某个 Agent 崩溃，从文件恢复状态
- **可调试**：人类可以直接阅读文件理解发生了什么
- **无并发问题**：一次一个 Agent 写，另一个读

### 6.5 与之前工作的关系

这篇文章是 Anthropic 一系列 Agent 工程文章的最新一篇，构成了一条清晰的演进线：

1. [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)（2025.09）——上下文工程基础
2. [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)——Agent 设计原则
3. [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)（2025.11）——初版 Harness（Initializer + Coder + Context Reset）
4. **本文**（2026.03）——演进为三 Agent 架构，随模型升级简化

## 七、技术细节备忘

- **技术栈**：React + Vite + FastAPI + SQLite → PostgreSQL
- **使用的 SDK**：Claude Agent SDK
- **评估工具**：Playwright MCP
- **模型演进**：Sonnet 4.5 → Opus 4.5 → Opus 4.6
- **成本量级**：简单任务 ~$9，复杂任务 $124-$200
- **时间量级**：20 分钟（Solo）到 6 小时（Full Harness）
- **Evaluator 校准**：使用 few-shot examples + 详细分数分解

## 八、我的评价

这是一篇**极其扎实的工程文章**。它不是在推销产品，而是在诚实地分享失败模式、迭代过程和权衡取舍。

最有价值的贡献：
1. **Context Anxiety 的概念化**和 Compaction vs Reset 的清晰区分
2. **将主观质量（设计好坏）转化为可评分维度**的方法论
3. **Harness 应随模型进化而简化**的原则——每个组件都是一个关于模型能力边界的假设
4. **Sprint Contract 机制**——Agent 间在动手前协商完成定义

不足之处：
- 成本仍然很高（$124 构建一个 DAW），对于大多数开发者来说不太实际
- 没有讨论如何处理 Evaluator 与 Generator 之间可能的"共谋"——两个都是 Claude，可能共享相同的盲点
- 缺少与其他模型（如 GPT-5、Gemini）的对比，无法判断这些技术是否 Claude 特异的

但整体而言，这是目前公开可见的**关于 Agent 编排最深入的一手工程经验分享**之一。值得反复阅读。
