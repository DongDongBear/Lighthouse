---
title: Anthropic 多 Agent Harness 设计：长时运行应用开发
---

# Anthropic 多 Agent Harness 设计：长时运行应用开发

> **来源**: Prithvi Rajasekaran (Anthropic Labs) — [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
> **日期**: 2026-03
> **标签**: `Agent` `Multi-Agent` `Harness Design` `Long-running Tasks` `Frontend Design` `QA`

---

## 1. 问题背景

作者此前参与了两个方向的工作：让 Claude 产出高质量前端设计，以及让它在无人干预下构建完整应用。之前的方案（prompt engineering + harness 设计）虽然比基线好很多，但都撞到了天花板。

为了突破瓶颈，他借鉴 **GAN（生成对抗网络）** 的思路，设计了"生成器 + 评估器"的多 Agent 架构，最终发展为三 Agent 系统：**Planner、Generator、Evaluator**。

---

## 2. 朴素方案的两个核心失败模式

### 2.1 上下文退化（Context Anxiety）

随着 context window 填满，模型会失去连贯性，甚至"提前收工"——它以为自己快到上下文极限了就急着结束任务。

**Compaction vs Context Reset**：
- **Compaction**：把历史对话压缩后继续。保留了连续性，但 context anxiety 仍然存在
- **Context Reset**：完全清空上下文，用结构化 artifact 把状态交接给全新 Agent。提供干净环境，但增加编排复杂度

Sonnet 4.5 的 context anxiety 非常严重，compaction 不够用，必须做 context reset。而 Opus 4.5 基本消除了这个行为，不再需要 context reset。

### 2.2 自我评估偏差

Agent 评价自己的输出时，天然倾向于"自卖自夸"——即使质量明显平庸也会给高分。设计类任务尤其严重，因为没有像测试通过/失败那样的客观判定标准。

**解决方案**：把"做事的"和"评判的"分开。单独调教评估器的严格度比让生成器自我批评容易得多，而一旦有了外部反馈，生成器就有了具体的迭代方向。

---

## 3. 前端设计实验：让主观质量可打分

### 3.1 核心思路

审美不能完全量化，但可以通过编码设计原则来改善。"这个设计好不好？"很难回答，但"它符不符合我们的设计原则？"可以具体评分。

### 3.2 四个评分维度

| 维度 | 定义 | 权重 |
|------|------|------|
| **设计质量** | 整体是否连贯？色彩、排版、布局是否形成统一的风格和氛围？ | 高 |
| **原创性** | 是否有刻意的创意决策？是否避免了模板默认值和"AI slop"（紫色渐变+白色卡片等 AI 味设计）？ | 高 |
| **工艺** | 排版层级、间距一致性、色彩和谐、对比度等技术执行 | 低 |
| **功能性** | 可用性——用户能否理解界面并完成任务？ | 低 |

设计质量和原创性权重更高，因为 Claude 默认在工艺和功能上就不错，但设计和原创性经常平庸。

### 3.3 实现架构

- 基于 **Claude Agent SDK** 构建
- **生成器**：创建 HTML/CSS/JS 页面
- **评估器**：通过 **Playwright MCP** 实际操作页面（不是看截图），导航、截图、仔细研究后打分并写详细反馈
- 评估器用 **few-shot 示例 + 详细打分说明** 校准，确保判断与作者偏好一致
- 每轮生成器根据反馈迭代，5-15 轮，整个过程最长 4 小时
- 生成器会做**战略决策**：分数趋势好就继续打磨，不行就整个推翻换方向

### 3.4 关键观察

- 评分标准的措辞直接影响输出风格——写"最好的设计是博物馆级别"会把所有设计往那个方向推
- 分数通常随迭代提升，但不是线性的——有时中间某轮比最后一轮更好
- 复杂度随迭代增加，生成器会越来越大胆
- 即使第一轮（还没收到评估反馈），有评分标准的输出就已经比无 prompt 基线好很多

**惊艳案例**：生成荷兰美术馆网站，前 9 轮是常规暗色主题。第 10 轮突然彻底重构——变成 CSS 3D 透视渲染的空间体验：棋盘地板、墙上挂画、门道导航。这种创意跳跃在单次生成中从未出现过。

---

## 4. 扩展到全栈开发：三 Agent 架构

### 4.1 三个 Agent 角色

**Planner（规划器）**
- 接收 1-4 句话的简单 prompt，扩展成完整产品 spec
- 刻意只做高层设计，不指定技术细节——如果规划阶段定错了细节，错误会级联到下游
- 主动往 spec 里加 AI 功能

**Generator（生成器）**
- 按 sprint 逐个功能开发
- 技术栈：React + Vite + FastAPI + SQLite（后改 PostgreSQL）
- 每个 sprint 结束先自评再交给 QA
- 有 git 做版本控制

**Evaluator（评估器）**
- 用 Playwright MCP 像真实用户一样点击测试
- 打分维度：产品深度、功能性、视觉设计、代码质量
- 每个维度有硬阈值，任何一个不过就打回重做

### 4.2 Sprint Contract 机制

每个 sprint 开始前，生成器和评估器先"谈判"达成合约，定义"完成"标准：

1. 生成器提出要构建什么、如何验证成功
2. 评估器审核提案，确保方向正确
3. 双方反复直到达成一致
4. 然后才开始写代码

Agent 间通过**文件通信**：一个写文件，另一个读后回应。

---

## 5. 对比实验：Solo vs 全 Harness

测试 prompt："创建一个 2D 复古游戏制作器"

| 方案 | 时长 | 成本 |
|------|------|------|
| Solo（单 Agent） | 20 分钟 | $9 |
| 全 Harness | 6 小时 | $200 |

### Solo 结果
界面能出来，但核心功能直接坏了——实体出现在屏幕上但不响应任何输入，底层连接完全断裂，且没有任何表面提示告诉你问题在哪。

### Harness 结果
- Planner 把一句话扩展成 **16 个功能、10 个 sprint** 的完整 spec
- 包含精灵动画系统、行为模板、音效、AI 辅助精灵生成等远超 Solo 的功能
- 游戏能玩，物理引擎有粗糙边缘但核心可用
- 内置 Claude 集成，可以通过 prompt 生成游戏的各部分

### 评估器的 QA 能力

Sprint 3 的关卡编辑器就有 **27 条验收标准**。评估器能精确定位到具体代码行和具体原因：

| 合约标准 | 评估发现 |
|----------|----------|
| 矩形填充工具支持拖拽填充 | FAIL — 只在拖拽起止点放置 tile，fillRectangle 函数存在但 mouseUp 没正确触发 |
| 用户可以选择和删除实体生成点 | FAIL — Delete 处理器要求同时设置 selection 和 selectedEntityId，但点击只设置了后者 |
| 用户可以通过 API 重排动画帧 | FAIL — PUT /frames/reorder 路由定义在 /{frame_id} 之后，FastAPI 把 'reorder' 当整数解析，返回 422 |

### 调教评估器的过程

开箱即用的 Claude 做 QA 很差——会发现问题然后自己说服自己"其实没那么严重"就放过了，测试也偏浅，不探索边界情况。需要反复读评估日志，找到判断偏差的地方，更新 prompt，好几轮才调到合理水平。

---

## 6. Harness 迭代简化

### 6.1 核心原则

> harness 的每个组件都是对"模型自己做不到什么"的假设，这些假设需要持续验证——可能本身就是错的，也可能随模型进步而过时。
> — 引用自 Anthropic [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)

### 6.2 Opus 4.6 带来的简化

Opus 4.6 发布后，作者逐个组件测试移除效果：

**移除 Sprint 结构**：
- Opus 4.6 能自主连贯工作 2+ 小时，不需要分块
- 评估器改为最后一次性评估而非每个 sprint 评估

**保留 Planner**：
- 没有 Planner 时，生成器会 under-scope——直接开始写代码，功能覆盖度明显不如有 Planner 的版本

**评估器的价值判断**：
- 取决于任务是否在模型能可靠完成的边界之外
- 4.5 时代，大多数构建任务都在边界上，评估器几乎总是有价值
- 4.6 时代，边界外移，简单任务不再需要评估器，但复杂任务仍然需要
- **评估器不是固定的 yes/no 决策，而是根据任务复杂度按需启用**

---

## 7. 更新后的实测：浏览器 DAW

prompt："构建一个功能完整的浏览器端 DAW（数字音频工作站）"

| 阶段 | 时长 | 成本 |
|------|------|------|
| Planner | 4.7 分钟 | $0.46 |
| Build 轮次1 | 2小时7分 | $71.08 |
| QA 轮次1 | 8.8 分钟 | $3.24 |
| Build 轮次2 | 1小时2分 | $36.89 |
| QA 轮次2 | 6.8 分钟 | $3.09 |
| Build 轮次3 | 10.9 分钟 | $5.88 |
| QA 轮次3 | 9.6 分钟 | $4.06 |
| **总计** | **3小时50分** | **$124.70** |

生成器连贯工作超过 2 小时（不需要 sprint 分块）。

QA 仍然抓到实质性问题：
- 核心 DAW 交互只有展示没有实际功能（片段不能拖拽、没有合成器旋钮、没有 EQ 曲线可视化）
- 录音功能只是 stub（按钮切换但没有真正的麦克风捕获）
- 片段边缘拖拽调整大小和分割未实现

最终产出了一个能工作的编曲视图 + 混音器 + 内置 AI Agent，可以通过 prompt 设置节奏、调性、编写旋律、构建鼓点、调整混音和添加混响。

---

## 8. 核心 Takeaway

1. **模型自评偏差是真实问题** — 分离生成和评估是强有力的杠杆
2. **主观质量可以编码成可打分标准** — 通过设计原则把"好不好"变成"符不符合原则"
3. **Harness 组件不是固定的** — 随模型进步要持续做减法，每个组件都是可测试的假设
4. **Planner 的价值在于 scope 扩展** — 但不应过度指定技术细节，避免错误级联
5. **评估器按需启用** — 取决于任务是否在模型能力边界上
6. **有趣的 harness 组合空间不是在缩小，而是在移动** — 模型进步不会让 AI 工程变得无意义，只是工作的焦点在移动

---

## 9. 架构演进对比

### V1 Harness（Opus 4.5）

```
User Prompt → Planner → [Sprint 1: Generator ↔ Evaluator] → [Sprint 2: ...] → ... → Final App
                              ↑ Context Reset 每个 sprint
```

- 需要 sprint 分块 + context reset
- 评估器每个 sprint 都介入
- Sprint Contract 机制协调两个 Agent
- 6 小时 / $200（游戏制作器）

### V2 Harness（Opus 4.6）

```
User Prompt → Planner → Generator (连续构建) → Evaluator → Generator (修复) → Evaluator → ... → Final App
```

- 移除 sprint 结构，生成器连续工作
- 评估器在最后做整体评估
- 自动 compaction 处理上下文增长
- 3小时50分 / $124.70（DAW）

---

## 参考链接

- [原文: Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [前作: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Frontend Design Skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)
