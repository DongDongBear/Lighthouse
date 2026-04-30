---
title: "深度解读 | ClawGym：把个人工作流 Agent 的训练、数据和评测做成一条流水线"
description: "ClawGym, OpenClaw, personal agents, synthetic data, agent training, benchmark, ClawGym-Bench, PinchBench"
---

# 深度解读 | ClawGym：把个人工作流 Agent 的训练、数据和评测做成一条流水线

> 原文链接：https://arxiv.org/abs/2604.26904
> HTML 全文：https://arxiv.org/html/2604.26904v1
> 作者：Fei Bai, Huatong Song, Shuang Sun, Daixuan Cheng, Yike Yang, Chuan Hao, Renyuan Li, Feng Chang, Yuan Wei, Ran Tao 等
> 发布日期：2026-04-29

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | ClawGym 试图把“个人/工作流 Agent 训练”从手搓 demo，升级成“数据集 + rollout + SFT/RL + benchmark”的系统工程。 |
| 大白话版 | 以前做 Claw 类 Agent 很像做手工艺：凑几个任务、跑几条样例、玄学调 prompt；ClawGym 想把这件事变成可量产、可比较、可持续优化的工业流程。 |
| 核心数字 | 13.5K SynData；200 条 ClawGym-Bench；Qwen3-8B 在 ClawGym-Bench 提升 43.46%；Qwen3-30A3B 提升 25.96% |
| 评级 | A — 不是单点模型增强，而是把 workspace-grounded agent 的上游数据和评测基础设施补齐了。 |
| 代码 | 论文称相关资源将发布到 https://github.com/ClawGym |
| 关键词 | OpenClaw、Synthetic Task Generation、Black-box Rollout、SFT、Sandbox-parallel RL、Benchmark Construction |

## 核心 Insight

ClawGym 的真正价值，不是再证明一个模型能完成多少桌面任务，而是指出：个人工作流 Agent 迟迟做不强，核心原因往往不在“模型太笨”，而在“训练数据、环境构造、验证标准和评测基线都太松散”。

论文把问题看得很准：Claw-style 任务和普通 benchmark 完全不是一回事。它们不是静态文本问答，也不是干净的 agent loop，而是带着本地文件、工作区状态、模糊指令、工具报错和长链路依赖的环境问题。你不先解决数据和验证，就很难系统提升 agent。

### 为什么这个想法 work？

ClawGym 的思路是把 agent 开发拆成三层资产：

1. **SynData**：生成大量可执行任务；
2. **Agents**：用 rollout 轨迹做监督微调，再试 RL；
3. **Bench**：用更严格的方式筛出真正有诊断价值的任务。

这比单纯调大模型有效，因为它把“训练什么”“怎么验证”“如何横向比较”一次性连起来了。对于 Claw 这种环境绑定型 agent，这种 data-centric 路线比继续拼 prompt 更对症。

## 方法详解

### 问题定义

论文把 Claw-style task 定义为一个环境接地的 instruction-execution 问题。形式化地，一个任务是：

$$
\tau = \langle p, s_0, \mathcal{A}, \mathcal{F}, \mathcal{V}_{\tau} \rangle
$$

其中：
- $p$：用户指令
- $s_0$：初始工作区状态
- $\mathcal{A}$：可用动作 / 工具集合
- $\mathcal{F}$：工具调用后状态转移规则
- $\mathcal{V}_{\tau}$：任务级 verifier

这一定义很关键，因为它明确告诉你：Claw-style agent 不是只输出一段答案，而是要在真实 workspace 中留下可验证的结果。

### 整体架构

ClawGym 可以概括成一条 3 段式流水线：

任务合成 → 资源准备与验证 → rollout 收集 → 轨迹筛选 → SFT / RL → benchmark 构建与评测

更细一点：

1. Persona-driven 任务生成
2. Skill-grounded 任务生成
3. 自动构造 mock workspace 与资源文件
4. Hybrid verification（规则 + rubric）
5. 在 OpenClaw 上做 black-box rollouts
6. 聚合高质量轨迹并做 supervised fine-tuning
7. 用 sandbox-parallel 方式做 RL 扩展
8. 再从 SynData 中筛出 200 条 benchmark 任务

### 关键技术组件

#### 组件 1：Dual-route Task Synthesis

**做什么：** 同时保证任务“像人真实会提的”和“能被工具执行验证”。

**怎么做：**
- Persona-driven top-down：从角色、场景、意图出发生成任务；
- Skill-grounded bottom-up：从具体可执行技能组合出发生成任务。

**为什么要两条路一起上：**
- 只有 persona-driven，容易有真实性但不够可执行；
- 只有 skill-grounded，容易可执行但像人造 benchmark；
- 两条路结合，才更像真实工作流。

#### 组件 2：Workspace-grounded Resource Preparation

**做什么：** 让任务不是停在文字上，而是带着文件、目录、网页、配置等真实上下文运行。

**怎么做：**
针对每个任务，自动生成 mock files 与辅助资源，形成专属工作区初始状态。这样 agent 不再面对抽象文本，而是面对可以被工具真正读写的环境。

**直觉解释：**
这一步很像给 benchmark “加地板”。没有地板，agent 只是在空中挥拳；有了 workspace，它才真的要对文件系统、脚本、网页交互负责。

#### 组件 3：Hybrid Verification

**做什么：** 既保证可自动判定，又保留对复杂任务结果的质量判断。

**怎么做：**
- deterministic code-based checkers：检查文件是否存在、格式是否对、输出是否满足规则；
- rubric-based verifiers：处理定性结果，避免只看形式不看质量。

**为什么重要：**
很多真实 agent 任务并不存在单一 exact match。如果只有规则验证，会偏向表面可过；如果只有 LLM 评审，又容易松。Hybrid verification 是折中点。

#### 组件 4：Black-box Rollout + Trajectory Selection

**做什么：** 用模型在 OpenClaw 环境里的真实交互轨迹来训练，而不是人工编答案。

**怎么做：**
- 用现有模型在合成任务上大量跑 rollout；
- 收集动作—观察轨迹；
- 再筛出高保真轨迹做 SFT。

这本质上是把 agent 训练 supervision 从“人写步骤”换成“环境里跑出来的可执行行为”。

#### 组件 5：Sandbox-parallel RL

**做什么：** 把 RL 引入 Claw-style 任务，同时控制 rollout 成本。

**怎么做：**
论文提出轻量的 sandbox-parallel pipeline：不同任务在独立 sandbox 中并行 rollout，减少环境冲突，也提高数据吞吐。

这一步非常实用，因为 workspace task 的 RL 最怕：
- 环境污染
- 长链路串扰
- rollout 太慢

用 per-task sandbox 并行，至少让 RL 在工程上可跑起来，而不是停留在概念上。

## 数据与基准构造

### ClawGym-SynData

| 项目 | 数值 |
|---|---:|
| 总任务数 | 13.5K |
| 任务来源 | persona-driven + skill-grounded |
| 任务属性 | executable、verifiable、workspace-grounded |

论文强调，SynData 的意义不只是规模，而是“任务可执行 + 环境可落地 + 验证可自动化”。这三件事同时成立，才让它有资格成为训练数据，而不只是任务描述集合。

### ClawGym-Bench

| 项目 | 数值 |
|---|---:|
| benchmark 任务数 | 200 |
| 类别数 | 6 |
| 构造方式 | 从 SynData 剔除训练集后，经 difficulty-aware filtering + human-LLM review 得到 |

这说明作者没有把 benchmark 当成“随手抽样”，而是刻意保留有区分度、难度合适、验证稳的实例。

## 实验结果

### 主实验：与现有模型对比

| 模型 | PinchBench | ClawGym-Bench | Avg. |
|---|---:|---:|---:|
| Qwen3-8B | 54.50 | 37.46 | 35.02 |
| Qwen3-30A3B | 55.60 | 42.47 | 45.11 |
| Qwen3-235A23B | 60.60 | 53.66 | 54.48 |
| ClawGym-4B | 76.40 | 45.21 | 47.73 |
| ClawGym-8B | 75.70 | 49.47 | 50.24 |
| ClawGym-30A3B | **86.00** | **52.98** | **56.82** |

### 提升幅度

| 基座模型 | PinchBench 提升 | ClawGym-Bench 提升 |
|---|---:|---:|
| Qwen3-8B → ClawGym-8B | +38.90% | +43.46% |
| Qwen3-30A3B → ClawGym-30A3B | +54.68% | +25.96% |

**解读：**
- 小模型吃数据红利最明显。8B 档在 ClawGym-Bench 上直接多出 43.46%。
- 大模型也涨，但弹性小一些，说明这套数据更像“补课”而不是“无限增益器”。
- 30A3B 版本在 PinchBench 冲到 86.0，很说明环境型训练数据确实能把模型从“会一点工具”推到“更会干活”。

### 分类维度表现

论文还按六大类给了 ClawGym-Bench 分项：
- Product. & Collab.
- Systems & Auto.
- Analysis & Reason.
- Content & Domain
- Planning & Knowl.
- Software Dev.

ClawGym-30A3B 分别拿到：
- 50.97
- 64.64
- 61.46
- 57.90
- 56.13

从分项看，它在 Systems & Automation、Analysis & Reason. 这种更像真实工作流的任务上拉升尤其明显，这和论文的数据构造目标是对齐的。

### 数据构造消融

| Base Model | Training Data Source | ClawGym-Bench | PinchBench |
|---|---|---:|---:|
| Qwen3-8B | Only Persona-driven | 49.44 | 73.51 |
| Qwen3-8B | Only Skill-grounded | 49.06 | 68.23 |
| Qwen3-8B | Mixed Synthesis | **50.24** | **75.68** |
| Qwen3-30A3B | Only Persona-driven | 53.65 | 84.92 |
| Qwen3-30A3B | Only Skill-grounded | 52.27 | 80.05 |
| Qwen3-30A3B | Mixed Synthesis | **56.82** | **86.00** |

**关键发现：**
1. persona 和 skill 两路都重要，单独一条都不如混合；
2. mixed synthesis 证明作者的 dual-route 设计不是装饰；
3. 说明“真实性”和“可执行性”确实需要兼得。

## 复现评估

| 维度 | 评分 | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐⭐⭐⭐☆ | 论文承诺公开 SynData / Bench / 资源，若按文中描述开放，复用价值很高。 |
| 代码可得性 | ⭐⭐⭐☆☆ | 需要看 OpenClaw 集成、verifier、sandbox pipeline 是否完整开源。 |
| 算力需求 | ⭐⭐☆☆☆ | 比起 frontier pretrain 便宜很多，但 rollout + RL + sandbox 并行仍不轻。 |
| 工程复杂度 | ⭐⭐⭐⭐☆ | 难点在环境构造、任务验证、轨迹筛选，不只是训模型。 |
| 预期收益 | ⭐⭐⭐⭐⭐ | 对做桌面 agent、终端 agent、browser agent 的团队，几乎是现成基础设施。 |

**复现建议：**
最现实的做法不是全量复现，而是：
1. 先抄 ClawGym-Bench 的筛选逻辑；
2. 再抄 Mixed Synthesis 的任务构造思路；
3. 最后才考虑是否上 RL。

对大多数团队来说，仅仅把 benchmark 和 SynData workflow 搭起来，就已经比继续盲调 prompt 强很多。

## 批判性分析

### 论文解决了什么

它解决的不是“agent 已经够强”，而是“agent 训练终于有基础设施了”。

这很重要，因为过去很多个人 agent 论文都停在两种极端：
- 要么只讲一个很花的系统设计；
- 要么只给一个 benchmark；
- 但很少把数据、训练、评测三件事串成闭环。

ClawGym 正是在补这个闭环。

### 局限性

1. **合成数据和真实用户 workspace 仍有鸿沟**
13.5K 再大，也未必能覆盖真实工作区里那些脏文件、权限冲突、命名混乱和跨天记忆问题。

2. **black-box rollout 继承了 teacher bias**
用已有模型生成轨迹，本质上会把已有模型的动作偏好也一并蒸进去。若 teacher 本身常犯某类错误，student 也可能学到。

3. **benchmark 规模仍偏小**
200 条 benchmark 已经比随便抽样强很多，但对于复杂 personal agent 生态，诊断覆盖还远远不够。

4. **SFT + RL 的收益边界未完全展开**
论文已经证明这条路有效，但还没完全说明：
- 什么时候 SFT 已经够了；
- 什么时候 RL 才值得加；
- 哪些任务更适合哪种训练方式。

## 对领域的影响

ClawGym 最值得重视的地方，是它可能把 Claw-style agent 从“演示文化”推向“训练文化”。

短期影响：
- OpenClaw / browser agent / terminal agent 研究会更重视训练数据，而不是只卷 orchestration；
- 评测会更看重 workspace-grounded benchmark，而不是纯文本 benchmark 外推；
- 小模型 agent 的提升空间会重新被看见。

中期影响：
- 个人工作流 agent 的竞争，可能从“谁写得更会 demo”变成“谁的任务池、验证器、轨迹质量更硬”；
- 企业版 agent 也会借鉴这种 framework，把真实 SOP 和 sandbox rollout 合进训练回路。

我的判断：ClawGym 不一定是最 flashy 的 agent 论文，但它很可能是最有基础设施气质的一篇。它回答的不是“模型今天会不会用工具”，而是“明天我们该如何系统地把这类 agent 训强、测准、持续迭代”。这比再多一个单点 benchmark 分数更值钱。