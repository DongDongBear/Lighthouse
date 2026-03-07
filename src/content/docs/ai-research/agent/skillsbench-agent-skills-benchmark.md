---
title: "SkillsBench 深度解读：Agent Skills 到底有多大用？"
---

# SkillsBench 深度解读：Agent Skills 到底有多大用？

> 论文：[SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks](https://arxiv.org/abs/2602.12670)
>
> 作者：Wenbo Chen, Yimin Liu 等 38 人
>
> 这是第一篇系统性量化 Agent Skills 效果的论文。结论对所有使用 Claude Code / Codex / Gemini CLI 的开发者都有直接指导意义。

---

## 一、这篇论文在解决什么问题

### 1.1 背景：什么是 Agent Skills

如果你用过 Claude Code 或 OpenClaw，你已经在用 Skills 了。

**Agent Skills** 是一种结构化的知识包，在推理时注入给 LLM agent，增强它在特定领域的能力。一个 Skill 通常包含：

- **SKILL.md**：自然语言的操作指南（怎么做某类任务）
- **Resources**：可执行脚本、代码模板、参考文档、示例

关键区别——Skills **不是**：

| 容易混淆的概念 | 与 Skills 的区别 |
|---|---|
| System Prompt | 没有结构和资源文件 |
| Few-shot 示例 | 声明式的，不是过程性的 |
| RAG 检索 | 检索的是事实，不是流程 |
| 工具文档 | 描述能力，不是描述操作步骤 |

**Skills 的独特之处**：它编码的是**过程性知识**（procedural knowledge）——标准操作流程、领域约定、任务特定的经验法则。

### 1.2 问题：没人量化过 Skills 到底有没有用

Skills 生态增长飞快——社区仓库已经有成千上万的用户贡献 Skills。但有几个关键问题一直没有答案：

1. Skills 到底能提升多少性能？
2. 什么样的 Skills 最有效？
3. 模型能不能自己生成有效的 Skills？
4. 不同领域的 Skills 效果差异有多大？

现有的 Agent Benchmark（SWE-bench、AgentBench 等）评估的是"模型本身有多强"，而不是"Skills 能帮模型提升多少"。

**SkillsBench 是第一个把 Skills 作为一等公民来评估的 Benchmark。**

---

## 二、SkillsBench 怎么设计的

### 2.1 评估框架

```
三种条件对比（paired evaluation）：

条件 A: No Skills        → agent 只拿到任务说明，没有 Skills
条件 B: Curated Skills   → agent 拿到人工精心编写的 Skills
条件 C: Self-Gen Skills  → 让 agent 自己生成 Skills 再做任务

同一个任务，三种条件都跑一遍，直接对比效果差异
```

### 2.2 数据集规模

- **84 个任务**，覆盖 **11 个领域**
- **7 个模型-harness 组合**：
  - Claude Code + Opus 4.5 / Opus 4.6 / Sonnet 4.5 / Haiku 4.5
  - Gemini CLI + Gemini 3 Pro / Gemini 3 Flash
  - Codex CLI + GPT-5.2
- **7,308 条有效轨迹**（每个任务每种条件跑 5 次取平均）
- **确定性验证器**（不用 LLM-as-judge，用 pytest 断言）

### 2.3 11 个领域

覆盖面非常广：

- 软件工程、数据分析、金融
- 医疗保健、制造业、科学计算
- 网络安全、地理空间
- 数学、多媒体处理等

### 2.4 质量控制（非常严格）

论文在质量控制上花了大量篇幅，这本身就值得学习：

**防泄露审计**：
- Skills 不能包含任务特定的文件名、路径
- 不能包含解决任务的精确命令序列
- 不能包含测试用例或预期输出的引用
- 有 CI 自动检测 Skill-Solution 泄露

**确定性验证**：
- 所有成功标准必须通过程序化断言测试
- 最小化测试数量，避免人为压低通过率

**人工审核（五项标准）**：
1. 数据有效性（必须反映真实复杂度）
2. 任务真实性（必须是真实工作流）
3. 参考答案质量
4. Skills 质量（无错误、内部一致）
5. 反作弊（防止走捷径）

---

## 三、核心发现

### 发现 1：Skills 平均提升 16.2 个百分点，但差异巨大

```
7 种配置的平均提升: +16.2pp
最低提升: +13.6pp (Gemini CLI + Gemini 3 Pro)
最高提升: +23.3pp (Claude Code + Opus 4.5)
```

**这个数字非常显著。** 16.2pp 的提升意味着，如果原来 100 个任务能做对 30 个，加了 Skills 后能做对 46 个——提升超过 50%。

但关键信息是：**效果因配置而异**。不是所有模型 + harness 组合都能同等受益。

### 发现 2：自己生成的 Skills 基本没用（甚至有害）

这是最震撼的发现：

```
Curated Skills（人工编写）:  +16.2pp
Self-Generated Skills（模型自己写）: -1.3pp ← 负数！
```

详细拆分：

| 配置 | Self-Gen 效果 |
|---|---|
| Claude Code + Opus 4.6 | +1.4pp（唯一正数） |
| Claude Code + Opus 4.5 | -0.1pp |
| Claude Code + Sonnet 4.5 | -1.4pp |
| Claude Code + Haiku 4.5 | -0.7pp |
| Codex + GPT-5.2 | **-5.6pp**（严重退化）|

**模型不能可靠地自己写出它们能从中受益的过程性知识。**

失败模式有两种：
1. **知道需要但写不好**：模型识别出需要领域知识，但生成的流程不精确、不完整（比如只写"用 pandas 处理数据"，没有具体的 API 模式）
2. **根本没意识到需要**：对高领域知识的任务（制造业、金融），模型试图用通用方法蛮力解决

### 发现 3：领域差异巨大——最高差 10 倍

```
最大受益领域:
  Healthcare（医疗）:      +51.9pp
  Manufacturing（制造业）:  +41.9pp

最小受益领域:
  Mathematics（数学）:           +6.0pp
  Software Engineering（软件工程）: +4.5pp
```

**规律非常清晰**：模型预训练数据中覆盖少的领域（医疗流程、制造工艺），Skills 提升巨大；模型本身就强的领域（代码、数学），Skills 提升有限。

**直觉**：Skills 填补的是**过程性知识的空白**。模型已经"懂"的东西，再给它 Skills 帮助不大；模型"不懂"的领域专业流程，Skills 价值极高。

### 发现 4：2-3 个 Skills 最优，多了反而不好

```
1 个 Skill:    +14.8pp
2-3 个 Skills: +18.6pp  ← 最优！
4+ 个 Skills:  +5.9pp   ← 反而下降
```

**少即是多。** 过多的 Skills 可能产生信息过载或指导冲突。

### 发现 5：精炼的 Skills 比全面的文档好

按 Skills 复杂度分层：

```
Detailed（详细但聚焦）:        +18.8pp  ← 最好
Compact（紧凑简洁）:           +17.1pp
Comprehensive（全面冗长文档）:  -2.9pp   ← 反而有害！
```

**Agent 不擅长从冗长文档中提取关键信息。** 聚焦的、有步骤的操作指南比面面俱到的手册有效得多。

过于详尽的 Skills 还会挤占上下文预算（context budget），消耗 token 但不提供可操作的指导。

### 发现 6：小模型 + Skills ≈ 大模型裸跑

```
Claude Haiku 4.5 + Skills:  27.7%
Claude Opus 4.5 无 Skills:  22.0%

→ 小模型配好 Skills 比大模型裸跑还强！
```

这对成本优化有直接指导意义——**与其升级到更贵的模型，不如先写好 Skills**。

### 发现 7：16/84 个任务中 Skills 有负面效果

不是所有任务都从 Skills 中受益：

```
负面效果最大的任务:
  taxonomy-tree-merge:              -39.3pp
  energy-ac-optimal-power-flow:     -14.3pp
  trend-anomaly-causal-inference:   -12.9pp
  exoplanet-detection-period:       -11.4pp
```

**Skills 可能引入冲突的指导或不必要的复杂性。** 对于模型本来就能处理好的任务，多余的 Skills 可能让它"想太多"。

---

## 四、不同 Harness 的表现差异

### 4.1 Claude Code：Skills 利用率最高

- 改进范围：+13.9pp 到 +23.3pp
- 所有 Claude 模型都一致受益
- 原因：Claude Code 对 Agent Skills 规范有**原生集成**，专门优化了 Skills 的发现和应用流程

### 4.2 Gemini CLI：裸性能最强

- Gemini 3 Flash 达到了最高绝对性能（48.7%）
- 改进范围：+13.6pp 到 +17.4pp
- Flash 的策略：用更多 token（比 Pro 多 2.3 倍输入 token）来弥补推理深度不足

### 4.3 Codex CLI：经常忽略 Skills

- GPT-5.2 原始性能不错（44.7%）
- 但 Codex 经常**确认了 Skills 内容却不使用它**——看了但没用
- 这说明 harness 的 Skills 集成质量直接影响效果

---

## 五、对我们的启示

### 5.1 写 Skills 的最佳实践

根据论文数据，有效的 Skills 应该：

1. **聚焦步骤，不要写手册**——详细的操作步骤 > 全面的参考文档
2. **2-3 个模块最优**——每个模块解决一个具体的子问题
3. **包含至少一个可用示例**——光说不练效果打折
4. **面向一类任务，不是单个实例**——通用性是 Skills 的核心价值
5. **匹配 harness 的约束**——如果 harness 要求 JSON 输出，Skills 里就要反复提醒格式

### 5.2 什么时候该写 Skills

```
高价值场景（Skills 效果 > 20pp）:
  ✅ 专业领域流程（医疗、制造、金融合规）
  ✅ 模型不擅长的操作性任务
  ✅ 有明确标准操作流程（SOP）的工作

低价值场景（Skills 效果 < 5pp）:
  ⚠️ 通用编程任务
  ⚠️ 数学推理
  ⚠️ 模型预训练数据覆盖充分的领域
```

### 5.3 成本优化策略

**先写 Skills，再考虑升级模型。** 论文证明 Haiku + Skills > Opus 裸跑。在实际项目中：

1. 先用便宜的模型 + 好的 Skills 试一遍
2. 如果效果不够，再考虑换更大的模型
3. 不要指望模型自己生成 Skills——必须人工编写

### 5.4 对 Skills 生态的影响

论文的"自生成 Skills 无效"结论意味着：

- **Skills 社区（如 ClawHub）的价值被验证**——人工策展的 Skills 是不可替代的
- **不能用 AI 批量生成 Skills 来凑数**——质量 > 数量
- **Skills 的设计和维护需要领域专家参与**——这不是纯 AI 能解决的问题

---

## 六、方法论亮点

### 6.1 Paired Evaluation（配对评估）

论文最重要的方法论贡献：**同一个任务，同一个模型，有 Skills vs 无 Skills 直接对比**。

这避免了"不同 benchmark 用不同任务"导致的不可比问题。

### 6.2 Normalized Gain（归一化增益）

借鉴物理教育研究的 Hake 增益公式：

$$
g = \frac{\text{pass}_{\text{skill}} - \text{pass}_{\text{vanilla}}}{1 - \text{pass}_{\text{vanilla}}}
$$

这个指标衡量"在可提升空间中实际提升了多少比例"。一个 90% → 95% 的提升和 10% → 55% 的提升，虽然绝对值不同（5pp vs 45pp），但归一化增益都是 0.5——它们在各自的可提升空间中都提升了一半。

### 6.3 容器化 + 确定性验证

每个任务都跑在 Docker 容器里，验证用 pytest 断言而不是 LLM-as-judge。这保证了结果的可复现性。

---

## 七、局限性

论文自身也讨论了局限：

1. **只覆盖终端任务**——不包含 GUI agent、多 agent 协作、超长时间跨度的任务
2. **上下文长度的干扰**——Skills 注入增加了上下文长度，部分收益可能来自"更多上下文"而非"过程性知识"。不过自生成 Skills 的失败说明结构确实重要
3. **只测了 3 个商业 harness**——开源 harness 可能表现不同
4. **没有测 Skills 组合效应**——多个 Skills 是互补还是冲突，需要更多研究

---

## 八、论文信息

- **标题**：SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks
- **作者**：Wenbo Chen, Yimin Liu 等 38 人
- **机构**：多机构合作
- **链接**：[arXiv:2602.12670](https://arxiv.org/abs/2602.12670)
- **数据规模**：84 tasks × 7 configs × 3 conditions × 5 trials = 7,308 trajectories

---

## 本文总结

| 发现 | 数据 | 启示 |
|------|------|------|
| Skills 平均提升 16.2pp | 范围 +13.6 到 +23.3pp | Skills 值得投入，但效果因配置而异 |
| 自生成 Skills 无效 | 平均 -1.3pp | 必须人工编写，不能靠 AI 自动生成 |
| 领域差异 10 倍 | 医疗 +51.9pp vs 软件 +4.5pp | 优先在专业领域写 Skills |
| 2-3 个 Skills 最优 | 4+ 个反而下降到 +5.9pp | 少而精，不要贪多 |
| 精炼 > 全面 | 详细 +18.8pp vs 全面 -2.9pp | 聚焦步骤，别写手册 |
| 小模型+Skills ≈ 大模型 | Haiku+Skills > Opus 裸跑 | 先写 Skills，再升级模型 |
