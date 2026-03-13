---
title: "RetroAgent：从"解题"到"进化"——回顾式双重内在反馈驱动 Agent 在线 RL"
---

# RetroAgent：从"解题"到"进化"——回顾式双重内在反馈驱动 Agent 在线 RL

> 论文：[RetroAgent: From Solving to Evolving via Retrospective Dual Intrinsic Feedback](https://arxiv.org/abs/2603.08561)
>
> 作者：Xiaoying Zhang, Zichen Liu, Yipeng Zhang, Xia Hu, Wenqi Shao（上海 AI Lab + NUS）
>
> Agent 不应只是"解一道题"就停——它应该从每次交互中进化。RetroAgent 用双重内在反馈（数值 + 语言）让 Agent 在复杂交互环境中持续适应，在 ALFWorld/WebShop/Sokoban/MineSweeper 上超 GRPO 基线 8-27%。

---

## 一、这篇论文在解决什么问题

### 1.1 背景

LLM-based Agent 用 RL 训练已经成为主流范式——让 Agent 在环境中交互，用 reward 信号更新策略。但当前 RL 训练存在一个根本性的理念问题：它优化的是 **"学会解某道题"**，而非 **"学会持续适应"**。

体现在两个具体缺陷：

1. **探索不足，过早收敛**：标准 RL（如 GRPO）倾向于 exploitation——一旦发现一个"能拿分"的策略就收敛，不再探索可能更好的替代方案。在复杂环境中，这很容易卡在次优策略。

2. **经验不可复用**：Agent 从环境中学到的知识全部隐式编码在参数里。过去的成功经验和失败教训无法被显式检索——哪怕上一轮刚处理过完全相同类型的任务。

这两个问题实际上是同一枚硬币的两面：Agent 缺乏**元认知能力**——不会回顾自己做了什么、为什么成功或失败、下次该怎么改进。

### 1.2 核心问题

**如何让 LLM Agent 从"解题者"变成"进化者"——在在线 RL 训练中同时解决探索不足和经验浪费的问题？**

---

## 二、方法：怎么解决的

### 2.1 核心 Insight

给 Agent 一种 **"回顾式元认知"** 能力：每个 episode 结束后，Agent 回顾自己的交互轨迹，产生两种内在反馈信号——

- **数值反馈**（Intrinsic Numerical Feedback）：量化"相比上次，我在子任务上进步了多少"→ 奖励有前景的探索行为
- **语言反馈**（Intrinsic Language Feedback）：提炼"这次的经验教训是什么"→ 存入记忆库，下次类似任务时检索使用

这两种反馈形成闭环：数值反馈驱动探索（exploration），语言反馈支撑经验利用（exploitation），两者共同推动策略的持续进化。

### 2.2 技术细节

#### 自省机制（Self-Reflection Mechanism）

每个 episode 结束后，Agent 分析其轨迹 $\tau$，生成一个反思元组：

$$z = f_{\text{reflect}}(\tau) = (\phi_{(x,\tau)}, c, m)$$

三个输出：
- $\phi_{(x,\tau)} \in [0,1]$：**潜力分数**——子任务完成率的估计（比如在购物任务中，虽然最终购买失败了，但成功找到了目标商品，潜力分数可能是 0.6）
- $c \in \{\text{success}, \text{failure}\}$：成功预测
- $m$：自然语言经验教训

论文提供两种实现：
- **In-Context 版**：用 pairwise induction——给 Agent 一个成功和一个失败的对比轨迹，让它从对比中提炼教训
- **RL-Trained 版**：自省能力与决策策略联合优化，自省准确度也有专门的 reward：$R^{\text{reflect}} = R^{\text{ext}} \cdot \mathbb{1}(c = I^{\text{ext}})$

#### 内在数值反馈：Capability-Evolution Reward

对每个任务 $x$，维护一个历史基线 $\Phi_x$（该任务上观察到的最高组均值成功率），内在奖励为相对于基线的进步量：

$$R^{\text{int}}_k = \max(0, \phi_{(x,\tau),k} - \Phi_x)$$

直觉：如果 Agent 这次在子任务上比历史最好表现有进步（哪怕最终任务失败了），就给正奖励。这鼓励 Agent 探索新策略——"虽然没成功，但你进步了，这个方向值得继续"。

$\max$ 操作确保基线只升不降，防止被偶然的好运气骗到。

#### 内在语言反馈：SimUtil-UCB 记忆检索

经验教训存入记忆库 $\mathcal{B}$，每条记录包含：任务描述 $x_i$、教训 $m_i$、原始轨迹 $\tau_i$、效用分数 $u_i$、被检索次数 $n_i$、成败标记 $d_i$。

检索时需要平衡三个因素：

**1. 语义相关性**（这条教训和当前任务有多相关？）

$$s_{\text{rel}}(x, x_i) = \frac{\mathcal{E}(x) \cdot \mathbf{v}_i}{\|\mathcal{E}(x)\| \|\mathbf{v}_i\|}$$

用 sentence-transformers 编码，相似度 < 0.4 直接过滤。

**2. 历史效用**（这条教训历史上有多有用？）

$$u_i := (1 - \beta_{\text{util}}) u_i + \beta_{\text{util}} \hat{u}_t$$

指数移动平均更新——被检索后如果任务成功了，效用分上升。

**3. 探索覆盖**（有没有被忽略的好教训？）

$$u_{\text{UCB}}^{(i)} = u_i + \kappa \sqrt{\frac{\ln N}{n_i}}$$

UCB 公式——被检索次数少的教训获得探索奖励，避免总是用同一条"万金油"教训。

最终检索分数：$S(b_i | x) = \alpha \cdot s_{\text{rel}} + (1-\alpha) \cdot u_{\text{UCB}}^{(i)}$

```mermaid
flowchart LR
    A[Episode 完成] --> B[自省: 生成 φ, c, m]
    B --> C[数值反馈: R_int = max(0, φ - Φ_x)]
    B --> D[语言反馈: 存入记忆库 B]
    C --> E[下一轮 RL 优化: R = R_ext + R_int]
    D --> F[SimUtil-UCB 检索相关教训]
    F --> G[50% rollout 用记忆增强 prompt]
    G --> E
```

#### 策略优化

基于 GRPO，生成 $N$ 条轨迹——前一半用 base policy，后一半用记忆增强 policy（检索教训拼入 prompt）。RL-Trained 版本的联合优化目标：

$$\mathcal{J} = \underbrace{\mathbb{E}\left[\sum_t \gamma^t (R^{\text{ext}} + R^{\text{int}})\right]}_{\text{决策}} + \underbrace{\lambda_{\text{reflect}} \cdot \mathbb{E}[R^{\text{reflect}}]}_{\text{自省}}$$

### 2.3 方法对比

| 方法 | 探索机制 | 经验复用 | 内在反馈 | 在线 RL |
|------|---------|---------|---------|--------|
| ReAct/Reflexion | ❌ 冻结模型 | Prompt 内 | ❌ | ❌ |
| GRPO | 组内采样 | ❌ | ❌ | ✅ |
| LAMER (Meta-RL) | 跨 episode | ❌ | 外在 | ✅ |
| **RetroAgent** | **数值内在奖励** | **UCB 记忆检索** | **双重（数值+语言）** | ✅ |

---

## 三、实验结果

### 3.1 实验设置

- **模型**：Qwen-2.5-7B-Instruct、Llama-3.1-8B-Instruct
- **环境**：ALFWorld（家庭交互）、WebShop（网络购物）、Sokoban（推箱子）、MineSweeper（扫雷）
- **对比基线**：GRPO、LAMER (Meta-RL)、AgentTrek (SFT+RL)、Reflexion、ReAct

### 3.2 主要结果

在 Qwen-2.5-7B-Instruct 上的结果：

| 环境 | GRPO | LAMER | AgentTrek | **RetroAgent (IC)** | **RetroAgent (RL)** |
|------|------|-------|-----------|---------------------|---------------------|
| ALFWorld | 62.7% | 73.9% | 55.2% | 79.5% | **81.0%** |
| WebShop | 63.3% | 60.1% | 66.5% | **78.7%** | 76.9% |
| Sokoban | 38.1% | 43.2% | 34.6% | 65.1% | **65.2%** |
| MineSweeper | 54.0% | 54.1% | 52.9% | **62.9%** | 62.1% |

**关键数字**：
- WebShop：+15.4pp vs GRPO（成功率从 63.3% → 78.7%）
- Sokoban：+27.1pp vs GRPO（从 38.1% → 65.2%）——这是一个需要深度规划的环境，提升幅度惊人
- ALFWorld：+18.3pp vs GRPO

### 3.3 消融实验

| 配置 | ALFWorld | WebShop |
|------|----------|---------|
| RetroAgent (full) | **81.0%** | **78.7%** |
| - 去掉数值反馈 | 75.6% (-5.4) | 73.2% (-5.5) |
| - 去掉语言反馈 | 71.3% (-9.7) | 70.1% (-8.6) |
| - 去掉两者（= GRPO） | 62.7% (-18.3) | 63.3% (-15.4) |

**语言反馈的贡献 > 数值反馈**——经验教训的显式检索对 Agent 的帮助比进步奖励更大。这符合直觉：在复杂交互环境中，"知道该怎么做"比"知道自己在进步"更重要。

#### OOD 泛化

在 ALFWorld 上用训练集（seen tasks）训练，测试 unseen tasks：

| 方法 | Seen | Unseen | 下降幅度 |
|------|------|--------|---------|
| GRPO | 62.7% | 50.2% | -12.5pp |
| RetroAgent | 81.0% | 72.4% | **-8.6pp** |

RetroAgent 在 OOD 场景下下降更少，说明记忆库中的经验教训有助于泛化——教训是抽象的策略知识，不只是特定任务的模式记忆。

---

## 四、复现与落地评估

### 4.1 复现难度评估

| 维度 | 评级 | 说明 |
|------|------|------|
| 代码开源 | ✅ | [github.com/zhangxy-2019/RetroAgent](https://github.com/zhangxy-2019/RetroAgent) |
| 数据可得性 | ✅ | ALFWorld/WebShop/Sokoban/MineSweeper 均为公开环境 |
| 算力需求 | 中 | 7B 模型 RL 训练，需要多卡但不极端 |
| 依赖复杂度 | 中 | 需要环境模拟器 + sentence-transformers + 标准 RL pipeline |
| 复现总评 | ⭐⭐⭐⭐ | 代码开源 + 公开环境 + 方法清晰，复现门槛较低 |

### 4.2 工业落地可行性

- **适用场景**：任何需要 Agent 在复杂交互环境中持续学习的场景——客服系统、自动化测试、游戏 AI、家庭 Agent
- **性能开销**：自省步骤增加约 1 次额外 LLM 推理/episode；记忆库检索用 embedding 相似度，开销很小
- **集成难度**：需要在 RL 训练 loop 中增加自省模块和记忆库，工程量中等
- **风险点**：记忆库质量依赖自省能力——如果 Agent 的反思不准确，记忆库会被低质量教训污染
- **落地总评**：⭐⭐⭐⭐（对 Agent RL 训练团队来说非常实用）

---

## 五、SOTA 对照矩阵

| 方法 | 核心思路 | ALFWorld | WebShop | Sokoban | 优势 | 劣势 |
|------|---------|----------|---------|---------|------|------|
| **RetroAgent** | 双重内在反馈 + UCB 记忆检索 | **81.0%** | **78.7%** | **65.2%** | 持续进化、OOD 泛化强 | 记忆质量依赖自省能力 |
| GRPO | 组内相对优势 | 62.7% | 63.3% | 38.1% | 简单通用 | 探索不足、无经验复用 |
| LAMER | Meta-RL 跨 episode | 73.9% | 60.1% | 43.2% | 跨 episode 适应 | 计算开销大、WebShop 不强 |
| AgentTrek | SFT + RL | 55.2% | 66.5% | 34.6% | 有 SFT 初始化 | 需要专家数据 |
| Reflexion | 冻结模型 + 语言反思 | N/A | N/A | N/A | 无需训练 | 能力天花板低 |

RetroAgent 在 Agent RL 这条线上是**显著的突破**——它不只是调 reward 或改 advantage 估计，而是从"解题范式"升级到"进化范式"。

---

## 六、讨论与局限

### 6.1 论文自身讨论的局限

- 自省 reward 的设计（$R^{\text{reflect}} = R^{\text{ext}} \cdot \mathbb{1}(c = I^{\text{ext}})$）较简单，可能有更好的替代
- 记忆库大小和管理策略未深入探讨

### 6.2 我的额外观察

1. **自省能力的 bootstrap 问题**：Agent 一开始不会反思（尤其是 base model），早期生成的教训质量可能很差。In-Context 版用 pairwise contrast 缓解了这个问题，但 RL-Trained 版的早期阶段如何避免 "垃圾教训污染记忆库" 值得关注。

2. **与 OpenClaw-RL 的对比很有意义**：OpenClaw-RL 用在线对话反馈做 RL，RetroAgent 用 Agent 自己的回顾做 RL。前者依赖外部（人类）反馈信号，后者完全自洽。两者的融合——"人类给反馈 + Agent 自己也回顾"——可能是更强的方案。

3. **Sokoban 27% 的提升很惊人但需要冷静看**：Sokoban 需要深度规划，38% → 65% 仍然意味着 35% 的失败率。在真正需要完美执行的工业场景中，65% 的成功率可能不够用。

4. **SimUtil-UCB 的 $\alpha$ 和 $\kappa$ 敏感性**：论文固定 $\kappa = 1.0$，但不同环境的最优 UCB 参数可能差异很大。缺少系统的超参敏感性分析。

5. **50/50 的 base/memory-augmented 混合比例**：这个比例是否最优？在训练后期 Agent 已经很强时，是否应该减少 base policy 的比例以更充分利用记忆？

---

## 七、对我们的启示

1. **谁应该关注？** Agent RL 训练方向的研究者和工程师——尤其是做复杂交互环境（网页操作、家庭 Agent、工具调用）的团队
2. **核心 takeaway**：
   - 内在反馈（intrinsic reward + experiential memory）是 Agent RL 的关键 missing piece
   - UCB-based 记忆检索比简单 similarity 检索有效得多——要平衡 exploitation 和 exploration
   - **语言反馈比数值反馈更重要**——给 Agent 具体的"教训"比给一个"进步分数"更有用
   - OOD 泛化受益于抽象化的经验教训
3. **实践建议**：
   - 如果你在训练 Agent，即使不用 RetroAgent 的完整框架，也可以试试简单版本：每个 episode 结束后让 Agent 自我反思，把教训存下来给后续 episode 参考
   - 代码已开源，建议在自己的 Agent 环境中跑一轮 baseline 对比

---

## 论文速查卡

| 项目 | 内容 |
|------|------|
| **标题** | RetroAgent: From Solving to Evolving via Retrospective Dual Intrinsic Feedback |
| **作者** | Xiaoying Zhang 等, 上海 AI Lab + NUS |
| **链接** | [arXiv:2603.08561](https://arxiv.org/abs/2603.08561) |
| **发表** | arXiv 预印本, 2026.03 |
| **一句话总结** | 通过回顾式双重内在反馈（数值进步信号 + UCB 记忆检索的语言教训），让 Agent 从"解题"升级为"持续进化"，在 4 个交互环境上大幅超越 GRPO 基线 |
| **大白话版** | 就像一个新员工每天下班后写工作日志——记录"今天学到了什么"和"下次遇到类似情况该怎么办"——然后第二天上班前先翻翻日志，所以越干越好 |
| **核心数字** | ALFWorld +18.3pp, WebShop +15.4pp, Sokoban +27.1pp vs GRPO |
| **复现评级** | ⭐⭐⭐⭐ |
| **落地评级** | ⭐⭐⭐⭐ |
