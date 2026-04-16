---
title: "深度解读 | HORIZON：长时序 Agent 为何崩溃 —— 从“掉成功率”到“失效结构性转移”"
description: "HORIZON 诊断框架, 7 类长时序失效分类, FMEA 方法论, 3132 条轨迹, GPT-5-mini vs Claude-4-Sonnet, LLM-as-a-Judge, 规划错误, 灾难性遗忘"
---

> 2026-04-17 · 深度解读 · 编辑：Lighthouse
>
> 原文：[arxiv.org/abs/2604.11978](https://arxiv.org/abs/2604.11978) — *The Long-Horizon Task Mirage? Diagnosing Where and Why Agentic Systems Break*
>
> 作者：Xinyu Jessica Wang, Haoyue Bai（共同一作）, Yiyou Sun, Haorui Wang, Shuibai Zhang, Wenjie Hu, Mya Schroder, Bilge Mutlu, Dawn Song, Robert D. Nowak（UW–Madison / UC Berkeley / Georgia Tech）

---

## 速查卡

| 维度 | 内容 |
|------|------|
| **一句话总结** | 长时序 Agent 的崩溃不是"成功率均匀下降"，而是**失效构成的结构性转移**——规划类与记忆/遗忘类失效在 horizon 增长时迅速变成主导 |
| **大白话版** | 把任务步数从 3 拉到 10，Agent 的失败模式会从"偶尔点错按钮"变成"根本忘了最初的约束 / 没做子规划"。光靠把底座模型做大无法解决，必须在**记忆、规划、执行期校验**三处做方法级改造 |
| **核心数字** | 3,132 条轨迹（1,995 失败 / 1,137 成功）；整体任务成功率 36.3%；GPT-5-mini 33.4% vs Claude-4-Sonnet 39.9%；过程级 PFMEA 占失效 72.5%，设计级 DFMEA 占 27.5% |
| **基准规模** | 4 个领域（Web/OS/DB/Embodied）× 2 模型家族 × 700+ 任务，配合 LLM-as-a-Judge + 40 条人类标注的 pilot 验证 |
| **验证强度** | 标注员间一致性 κ=0.61（substantial）；人类–LLM 判官一致性 κ=0.84（strong） |
| **影响评级** | **A** — 首个把 horizon 当作**受控自变量**而非副产品的跨域基准，且配套 FMEA 级失效分类体系，对后续长时序 Agent 研究提供统一坐标 |

---

## 核心 Insight

论文里藏着三个真正值得划重点的结论：

**① 长时序崩溃是"失效构成"在变，不是成功率在跌。**
跨 4 个领域、3,132 条轨迹，作者给出的核心定性结论是：

> *Long-horizon failure is not merely a drop in success rate, but a structural shift in failure composition: planning-related failures (e.g., subplanning errors) and memory-related failures (e.g., catastrophic forgetting) become dominant as horizon increases.*

换句话说：horizon 短的时候各种错都可能有（环境、指令、规划……），horizon 长了以后**规划错误 + 灾难性遗忘 + 记忆极限**三家合计占绝大多数。这意味着"给更多样本"、"加大模型"都不是对应的解法——要改的是 Agent 的**架构**，而非底模能力。

**② "breaking point 不存在通用阈值，只存在转移区间"。**
作者明确反对业界常见的"某模型在 N 步之后崩了"的说法。他们观察到成功率下降是**非线性的**：在小 s 时轻微下降，到某个点后**急剧塌陷**，并且不同领域塌陷的位置差异极大——

> *Web collapses at very small s, OS and Database domains sustain moderate performance until later extension levels, and Embodied tasks degrade steeply even with minimal increases in s.*

更反直觉的是：**模型间差距在崩溃区间之后会收敛**——GPT-5-mini 和 Claude-4-Sonnet 在长 horizon 上的表现越来越接近。作者因此建议把 breaking point 视为"转移区间"（transition region），而不是一个具体的步数。

**③ 失效分类是 FMEA 七类，而非传统 Agent 论文里的三四类粗标签。**
作者把七类分成两组：

- **PFMEA（过程级风险，72.5%）**：环境、指令、规划、历史错误累积——在执行过程中产生
- **DFMEA（设计级风险，27.5%）**：记忆极限、灾难性遗忘、错误假设——源于 Agent 架构本身的限制

这个划分直接对应不同的**工程干预方向**：PFMEA 类要加"执行期校验 / 重新观察 / 重规划"，DFMEA 类要加"长程记忆 / 约束持久化 / 假设显式化"。

`★ Insight ─────────────────────────────────────`
论文在 §1 特意指出：一个 Agent 即使每步错误率很小，只要**步间相互依赖**，复合错误率会以几何速度吞掉成功率。这是"长时序失效不是加性而是乘性"的根本原因——也是 HORIZON 要刻意把 horizon 作为受控自变量的动机。
`─────────────────────────────────────────────────`

---

## 方法详解

### 1. 任务 horizon 的两层定义

作者主张 horizon 必须和"Agent 低效"解耦：一个在简单任务里反复 fail 50 次的 Agent，不是在解长时序问题，而是在解短时序问题而已。为此他们提出三个**智能体无关**的任务结构指标（§3.1）：

| 指标 | 记号 | 含义 |
|------|------|------|
| **内在 horizon** | H\* | 最优策略完成任务所需的最小有效动作数，由专家演示或形式化规约给出 |
| **组合深度** | s | 路径上决策节点（嵌套子目标 / 条件分支）最大数 |
| **扩展级别** | s（受控变量） | 实验中调节的"强度旋钮"，要求 H\*(s) 对 s 单调递增 |

论文举了一个具体例子：web 任务 "find and purchase wireless headphones under \$200" 的 H\* = 8（搜索→价格筛选→评分排序→……→结算）。这个值**不随 Agent 的重试次数改变**。

### 2. 两种任务扩展策略

为了在不同领域里让 H\*(s) 可控地增长，作者设计了两种扩展：

- **Depth Extension（深度扩展）**：在相邻动作之间**插入不可跳过的中间步骤**。每一次 s→s+1 都加入 Δ(s) 个必做子任务，且 Δ(s) 严格递增。论文指出 OS 领域每次扩展一般加 1–2 个权限校验，DB 领域加 2–3 个过滤操作。适合**初始状态固定**的域（OS / DB）。
- **Breadth Extension（广度扩展）**：把 k 个独立的基线任务拼成复合任务，额外加入协调开销 ε(s)（任务切换、子任务间校验、跨子任务状态跟踪）。论文给的例子是 embodied 场景中"堆叠积木后还要检查黄色圆柱体是否被碰倒"。适合**初始状态可变**的域（Web / Embodied）。

### 3. 七类失效分类（FMEA 视角）

作者围绕 Agent 的执行循环（observe → plan → act → update memory）构建了如下**正交**的七类：

| 编号 | 类别 | 类型标签 | 典型机制 |
|------|------|-----------|----------|
| 1 | Environment Error | [S] | 环境扰动 / 无法检测环境变化（permission denial 未捕捉、页面未渲染完成、schema drift） |
| 2 | Instruction Error | [S] | 指令不明 / 部分理解（忽略 "except"、"mismatching" 等修饰词） |
| 3 | Catastrophic Forgetting | **[L]** | 约束仍在 context 内但执行时没再关注（"never touch payments schema" 被后续步骤违反） |
| 4 | False Assumption | [S] | 把先验当普适事实（假设每张表都有 created_at 列、假设颜色匹配模式） |
| 5 | Planning Error | [S] | 子规划 / 动作选择错（先 drop backup 再迁移数据） |
| 6 | History Error Accumulation | **[L]** | 早期小错在下游复用并放大（中间表忘加 is_deleted=false） |
| 7 | Memory Limitation | **[L]** | 上下文超窗导致早期观察被截断或摘要 |

> 标签含义：**[L]** = 主要出现在长时序任务（短时序几乎不见）；**[S]** = 短/长时序都可能出现但在长 horizon 下被放大。

一个重要设计点是：这些类别**不是互斥的**。同一条失败轨迹可能同时呈现 *Catastrophic Forgetting*（丢约束）+ *False Assumption*（环境状态误判）+ *History Error Accumulation*（早期错误复合）。这种**正交多标签**视角让 "planning error" 不再是一个万能标签，而可以进一步解释为"由遗忘引起的规划错"——直接对应不同干预手段（架构级 vs. 训练级）。

### 4. LLM-as-a-Judge 管道（Figure 2）

由于长轨迹人类标注不可规模化，作者搭建了一个**轨迹锚定**（trajectory-grounded）的 LLM 判官流水线：

1. 收集长 trajectory 与上下文
2. 与专家合作开发分类（含标注员间一致性校准）
3. 构建 HORIZON 诊断套件
4. 用 40 条轨迹做 LLM 判官校准
5. 对全部 3,132 条 trajectory 进行规模化失效归因

**验证强度**：两名专家独立标 40 条，κ=0.61（substantial）；LLM 判官与人类 κ=0.84（strong）。论文明确在 Ethics Statement 里按 COLM 2026 披露了 LLM 作为自动评估者的使用。

`★ Insight ─────────────────────────────────────`
"trajectory-grounded" 的意思是判官不只看最终结果，而是看**全轨迹**并定位到"turning point"（第一次不可逆偏差）。这和把 LLM 当 rubric scorer 的常见用法不一样——它其实是一个"事后故事分析师"，要在多步动作里标出"就是这一步开始错的"，这也是 κ=0.84 相对可信的原因。
`─────────────────────────────────────────────────`

---

## 训练 / 数据策略

这是一篇**纯诊断/评测**论文，**不训练新模型**，也没提出新的记忆模块。作者特别强调：

> *We do not add a memory module; we report how memory-related failures appear in labeled trajectories when horizon extends.*

数据层面的关键设计（§4、§D.1）：

### 基线任务筛选

作者采用**"baseline 必须能过"**的严格过滤：每个领域的基线任务都先用 GPT-5-mini 跑一遍，只保留 **100% 成功**的任务作为 s=1 基线。这样保证后续看到的性能下降**来自 horizon 增长，而非任务本身难度或 Agent 配置问题**。

### 嵌套任务集构造

为降低混杂变量，作者采用**嵌套构造**：horizon 级别 h+1 的任务集 **包含** h 级的所有任务，再加入更长的任务。这使得相邻级别之间的对比"by construction 受控"，主要变量就是 horizon 长度。

### 四个领域的承载

| 领域 | 基础环境 | 基准 | 关键设计 |
|------|----------|------|----------|
| **Web** | 网页导航 | WebArena | 广度扩展为主 |
| **OS** | Shell 操作 | AgentBench | 深度扩展为主 |
| **Database** | Text-to-SQL | MAC-SQL（Selector+Decomposer+Refiner 三模块） | 深度扩展为主 |
| **Embodied** | 双臂 IsaacSim 5.0 | 自建（Franka Emika Panda + Tesollo DG-3F-B 三指夹爪） | 广度扩展为主 |

Embodied 环境只开放 4 个原语：`home`、`move_to_pose(arm, pose)`、`grasp(arm)`、`release(arm)`，桌面三个积木（红/蓝/绿）。Agent 输出 JSON 计划再在仿真里执行，人工评估成功。

### 模型

- **GPT-5-mini**（OpenAI 2025a）
- **Claude-4-Sonnet**（Anthropic 2025）

每个 horizon 设定跑 **3 次独立 run**，报告均值 ± 标准差。

---

## 与现有方法的关键区别

| 维度 | 常见做法 | HORIZON 的做法 |
|------|----------|----------------|
| **Horizon 度量** | 交互步数 / 工具调用数 / 推理步数，各家不一致 | **任务结构层面的 H\*** 与 **s**，Agent 独立 |
| **评估口径** | 只报 terminal success rate | 同时报 horizon 曲线 + 失效归因 **二维结果** |
| **失效分类粒度** | 高层标签（hallucination / planning）或领域特有 | FMEA 启发的 **七类正交分类**，跨四个域可用 |
| **分类验证** | 往往只作者自己标 | **κ=0.61 标注员间 + κ=0.84 人-机** 双验证 |
| **可规模化** | 纯人标，几百条量级 | LLM-as-a-Judge，3,000+ 条轨迹 |
| **研究对象** | 多以"怎么让 Agent 更强"为目标 | 以 "**horizon 增长时哪类失效成为主导**" 为目标 |
| **多 Agent 失效** | Cemri et al. 2025 做多 Agent 协作分类 | HORIZON 专注**单 Agent 跨域** horizon 条件下的失效 |

论文在 §2 Related Work 里明确区分：前人工作（AgentBench、WebArena 等）"still foregrounds terminal success"；而 HORIZON 的贡献在于把 horizon 当**受控自变量**来 sweep。

---

## 实验结果

### 整体规模

| 总量 | 数值 |
|------|------|
| 轨迹总数 | **3,132** |
| 失败轨迹 | **1,995** |
| 成功轨迹 | **1,137** |
| 整体任务成功率 | **36.3%** |

### 按领域拆分（成功率 & 失败轨迹数）

| 领域 | 成功率 | 样本（成功 / 总数） |
|------|--------|---------------------|
| **Web** | **24.1%** | 185 / 767 |
| **OS** | **40.3%** | 864 / 2,146 |
| **Database** | **36.9%** | 31 / 84 |
| **Embodied** | **42.2%** | 57 / 135 |

### 按模型拆分

| 模型 | 成功率 | 样本（成功 / 总数） |
|------|--------|---------------------|
| **GPT-5-mini** | **33.4%** | 573 / 1,718 |
| **Claude-4-Sonnet** | **39.9%** | 564 / 1,414 |

### 按领域的失效构成（占该域失败轨迹的比例）

| 领域 | 主失效（> 50%） | 次失效 | 备注 |
|------|-------------------|--------|------|
| **Embodied** | Planning Error **94.9%** | — | 几乎全是规划错 |
| **Database** | Planning Error **79.3%** | False Assumption 7.5% | 结构化动作空间让规划成为瓶颈 |
| **Web** | Planning Error **74.9%** | Environment 11.3% / Memory Limit 6.2% | 页面状态动态变化 |
| **OS** | Planning Error **36.7%** | Instruction 25.9% / Environment 17.3% / Memory 15.1% | 失效最多样化的领域 |

一个特殊发现：**History Error Accumulation 只在 OS 中被观察到（0.1%）**——论文未细说原因，但从定义看，shell 命令链的"早期错误被后续步骤复用"在其他域很难这么"干净地"显现。

### 按模型的失效构成（聚合所有域）

> *注：论文 Figure 7 原文 caption 把模型写为 "GPT-4o-mini vs Claude 3.5 Sonnet"，但正文与 §D.2 一致使用 GPT-5-mini 和 Claude-4-Sonnet。我们按正文数字口径复述，并在"批判性分析"里标注此矛盾。*

| 失效类型 | GPT-5-mini | Claude-4-Sonnet |
|----------|------------|------------------|
| Planning Error | **64.9%** | **46.5%** |
| Memory Limitation | **18.3%** | 2.2% |
| Environment | 6.1% 左右* | **32.5%** |
| Instruction | — | **16.5%** |
| **DFMEA 总计**（Memory + Forgetting + False Assumption） | **20.8%** | **6.6%** |

*Environment 值由其他类补全推算，论文未逐一给出 GPT-5-mini 每类百分比，只给出了总体画像与领域分解。*

两模型的失效画像**质的不同**：

- **GPT-5-mini**："规划 + 记忆"型失效占主导，反映长 context 下状态保持困难
- **Claude-4-Sonnet**："环境 + 指令"型失效占主导，但**Memory Limitation 仅 2.2%** — Claude 的长程上下文保持能力显著更强，但对环境反馈和指令歧义更敏感

### Embodied 领域横向扩展成功率（mean ± std over 3 runs）

| 扩展级别（约等于子任务数） | GPT-5-mini | Claude-4-Sonnet |
|---------------------------|------------|------------------|
| 短 horizon（基线） | **0.926 ± 0.064** | **0.963 ± 0.064** |
| 级别 2 | 0.407 ± 0.170 | 0.259 ± 0.064 |
| 级别 3 | 0.259 ± 0.231 | 0.111 ± 0.111 |
| 级别 4 | **0.074 ± 0.064** | **0.037 ± 0.064** |

这张表生动印证了"sharp drop + 非线性下降"的主论点：从基线到级别 2，GPT-5-mini 已经掉了 **57 个百分点**；到级别 4，两个 SOTA 模型都塌陷到 **< 8%**，且差距几乎消失。

### 过程级 vs 设计级风险的总体比例

| 风险类别 | 占全部失败轨迹 |
|----------|----------------|
| **PFMEA**（Environment + Instruction + Planning + History Accumulation） | **72.5%** |
| **DFMEA**（Memory + Forgetting + False Assumption） | **27.5%** |

---

## 消融与分析

### 1. 横向 horizon 扩展的三个跨域规律

论文在 §4 "Main Results" 里抽象出：

- **非线性下降**：小 s 时变化平缓，跨过某阈值后断崖式塌陷——意味着"均匀采样 horizon 级别"低效，评测应加密采样在 transition 附近
- **跨域难度错配**：同一个 s 在不同域的实际难度差异巨大（Web 很早就崩，OS/DB 能撑更久，Embodied 掉得最陡）——印证"无法用一个通用 breaking point 描述所有域"
- **模型差异在崩溃区间收敛**：进入失败主导后，模型差距变小——暗示 base model capacity 不是瓶颈

### 2. 纵向分类学的可复用性

所有 3,132 条轨迹的失败模式**都能归入七类**，且 LLM 判官与人类标注吻合良好（κ=0.84）——作者把这作为 taxonomy **generalizable** 的证据。

### 3. OpenClaw 现实世界映射（§7）

作者在附录中把七类映射到 OpenClaw 实际部署中出现的"Agents of Chaos" 事件（Shapira et al. 2026, arXiv:2602.20021）：

| 七类 | OpenClaw 实际事件 | 机制 |
|------|-------------------|------|
| Environment | **Concurrent Modification** — 云同步中途重命名目录 | Agent 把 "file not found" 当作瞬时错误继续执行 |
| Instruction | **Forwarded Inbox** — "share" 拒绝但"forward" 同意 | 语义等价指令被当作不同任务 |
| Planning | **Infinite Loop** — 两个 Agent 互相转发消息 | 缺 termination check |
| **Catastrophic Forgetting** | **Policy Override** — "不要回外部域"在数百轮后被遗忘 | 约束仍在 context 内但 generation 不再关注 |
| False Assumption | **Identity Hijack** — 接受冒名通信渠道 | 误把声称的身份当作真实身份 |
| History Accumulation | **Guilt Trip** — 情感压力下逐步让步 | 决策边界被累积的"对攻击者友好"历史侵蚀 |
| Memory Limit | **Storage Exhaustion** — Agent 不断存附件直到邮箱爆满 | 缺乏对自身累积存储行为的持久记忆 |

**这是此论文的"甜点"**：一个纯仿真/基准的分类学，能被现实世界的 red-team 报告一一对上——可信度显著上升。

### 4. 子规划错误为何"特别致命"

作者特别解释（§5）：规划错误有三层复合危险——

1. **早发生**：在轨迹开端就可能偏离
2. **下游耦合**：后续动作基于错误规划展开
3. **不可逆**：把本可局部修复的错误转为轨迹级崩溃

这也是为什么 planning error 在 Embodied（94.9%）和 Database（79.3%）的结构化动作空间里会**一骑绝尘**。

---

## 复现评估

如果你想复现或在自家 Agent 上跑这个 benchmark，以下是门槛与陷阱：

| 复现维度 | 难度 | 备注 |
|----------|------|------|
| **Web（WebArena）** | 低 | 开源，官方 docker；只需写 horizon extension 脚本 |
| **OS（AgentBench）** | 低–中 | 开源；主要工作量在人工构造深度扩展任务 |
| **Database（MAC-SQL）** | 中 | 三模块 pipeline 已开源；但原论文评估只有 84 条轨迹，**样本偏小** |
| **Embodied（IsaacSim 5.0 + Franka + Tesollo）** | **高** | 需要 GPU、IsaacSim 许可证、仿真资产；且成功评估是**人工打分**，非自动 |
| **LLM-as-a-Judge** | 中 | 流水线结构清晰，但 prompt / rubric **论文未完整公布**，需按 §F 描述重建 |
| **人类标注验证** | 高 | 需两名 Agent 领域专家对 40 条长 trajectory 做盲标，时间成本高 |

**已知痛点**：

- 论文未公开 prompt / judge rubric 的完整文本（至少文本中未见）
- 嵌套任务集构造意味着不同 s 级别之间不是**独立**样本，**统计检验的自由度**需要重新估计
- 三次 run 的方差在 Embodied 中间级别（s=2, s=3）**非常大**（std 达 0.17~0.23），意味着单次评测不可信

**成本估算**（粗）：

- 3,132 条 trajectory × 两个模型家族 × 3 runs ≈ 频繁的长 trajectory 推理，保守估计需要 **数千美元**的 API 预算
- 人类标注 40 条 trajectory ≈ 每人 10–15 小时（trajectory 很长）

---

## 批判性分析

这篇论文方向和方法都很扎实，但也有几处值得谨慎对待的地方。

### 1. 模型版本表述的内部矛盾

正文 §4、§D.2 写的是 **GPT-5-mini 和 Claude-4-Sonnet**，但 **Figure 7 的 caption**（附录 F）写成 "GPT-4o-mini vs Claude 3.5 Sonnet"。虽然数字（33.4% / 39.9%）与正文一致，但命名不一致会让读者在复现时产生歧义。这可能是草稿迭代遗漏的 errata，审稿版有望修正。

### 2. 样本规模在 DB 和 Embodied 过小

| 域 | 总轨迹 | 问题 |
|----|--------|------|
| Web | 767 | OK |
| OS | 2,146 | 充足 |
| **Database** | **84** | 结论（规划 79.3%）基于 ~30 条失败 |
| **Embodied** | **135** | 结论（规划 94.9%）基于 ~78 条失败 |

对 DB 和 Embodied 下的结论应当视为**初步**，尤其是"Planning Error 近乎全部"的断言。

### 3. 只覆盖两个模型家族，缺少小模型与开源模型

GPT-5-mini 和 Claude-4-Sonnet 都是专有 SOTA。缺少对比的是：

- **开源模型**（Llama / Qwen / DeepSeek 系）在同一 horizon 下的表现
- **更小的底座**以直接验证 "scaling 不管用" 这个主论点
- **专门做 planning 的 Agent**（e.g. ReAct+Reflexion, Plan-and-Act）在 taxonomy 上是否表现为不同的失效画像

如果后续扩展这两条，论文的 "scaling alone won't fix" 的说法会更有力。

### 4. LLM-as-a-Judge 的 40 条校准集偏小

40 条 trajectory 做 κ 校准是下限级的。虽然 κ=0.84 数值很漂亮，但**置信区间较宽**。更稳妥的做法是至少 100~150 条跨域 trajectory，且分层采样（每类 10+ 条）。

### 5. 基线严格筛选可能过度乐观化 baseline

"只保留 GPT-5-mini 100% 成功的任务作为 s=1 基线"意味着——对于底模能力差的 Agent，所谓"基线"本身就不是基线。这会导致**下降曲线的斜率对 GPT-5-mini 有利**（它起点被人为抬高），而 Claude-4-Sonnet 可能在 s=1 就并非 100%。跨模型横向对比时需要考虑这个偏差。

### 6. 嵌套任务集会放大相关性

s+1 级的任务集**包含** s 级任务，这让"adjacent levels 受控"的说法更像"公共子集确保单调"而非"独立采样"。如果要做统计显著性检验，需要对共享任务做 paired 设计或层级效应模型，而论文只报 ±1 std。

### 7. 七类分类的"正交性"更像理论期许

作者强调七类正交可叠加（一条轨迹可同时标多类），但 Figure 6/7/8 的 stacked bar 呈现的是**单主因归因**的比例，对多标签现象的分析不足。多标签共现矩阵（哪两类最常一起出现？）是下一步的明显补强。

### 8. "Breaking point 是区间而非阈值"的工程可用性

这个洞察虽然漂亮，但**操作层面**留下空白：工程团队到底应该在哪个 s 投入测试预算？论文建议"识别失效动态质变的区间"，但没有给出**自动化检测转移区的统计方法**（例如变点检测、贝叶斯变化分析）。后续工作补上这一步，会让 HORIZON 从评测框架升级为部署前的决策工具。

### 9. 实验所用 Embodied 环境极简

红/蓝/绿三个积木、4 个原语动作的桌面摆弄，虽然适合做可控实验，但距离真实 Embodied AI 的长程任务（open-world 导航、多物体交互、视觉-语言-动作耦合）还很远。因此 "Embodied 里 94.9% 是 Planning Error" 的强断言**只适用于结构化仿真动作空间**。

### 10. 对"方法级改进"只提方向未提方案

论文呼吁 "hierarchical subplanning、execution-time plan verification and repair、长程记忆" 三方向，但**未给出任何具体算法或架构提案**。这是诊断论文的惯例，但也意味着 HORIZON 的下一步——"基于诊断设计修复方法"——还留给社区。

---

## 延伸阅读

- **论文主页与 Leaderboard**：作者在文中提及 "HORIZON Leaderboard"，将持续接受社区贡献的 trajectory 与模型
- **方法论同源**：FMEA 原版参考 AIAG & VDA (2019)，这是第一次把汽车业的故障模式分析思路系统搬到 Agent 评测
- **现实世界对照**：Shapira et al. 2026 *Agents of Chaos*（arXiv:2602.20021）——HORIZON 七类失效的现实红队报告
- **对比阅读**：
  - Sinha et al. 2025 *The illusion of diminishing returns: measuring long horizon execution in LLMs*（arXiv:2509.09677）— 纯执行视角的 horizon 度量
  - Chen et al. 2025a *Reinforcement learning for long-horizon interactive LLM agents*（arXiv:2502.01600）— 从训练侧解决
  - Cemri et al. 2025 *Why do multi-agent LLM systems fail?*（arXiv:2503.13657）— 多 Agent 协作侧失效分类
  - Kang et al. 2025 *ACON: optimizing context compression for long-horizon LLM agents*（arXiv:2510.00615）— 直接针对 Memory Limitation 的方法

---

## 写在最后

HORIZON 最大的意义不在于具体数字，而在于提供了一个**共同坐标系**：以后再说"我的 Agent 在长时序上更好"，至少可以回答三个问题——

1. 你把 horizon 定义在哪一层（H\* 还是 step count）？
2. 你观察到的是成功率下降，还是**失效构成的转移**？
3. 失效具体落在七类里的哪几类，对应的干预是 PFMEA 还是 DFMEA？

如果这三个问题在 2026 年下半年的 Agent 论文里开始被默认回答，HORIZON 就已经做到了它想做的事。

> *"Understanding long-horizon failure is a prerequisite for building reliable agentic AI systems."* —— §6 Conclusion
