---
title: "Tree Search Distillation：用 MCTS + PPO 蒸馏搜索策略到语言模型"
---

# Tree Search Distillation：用 MCTS + PPO 蒸馏搜索策略到语言模型

> 原文：[Tree Search Distillation for Language Models using PPO](https://ayushtambde.com/blog/tree-search-distillation-for-language-models-using-ppo/)
>
> 作者：Ayush Tambde
>
> 代码：[github.com/at2005/llm-mcts](https://github.com/at2005/llm-mcts)
>
> 核心思想：将 AlphaZero 的"搜索→蒸馏"范式迁移到语言模型推理——在训练时用 MCTS 搜索更优的推理轨迹，再通过在线 PPO 循环将搜索策略蒸馏回模型权重。在 Countdown 任务上，蒸馏后的模型（推理时无需搜索）mean@16 达 11.3%，优于 GRPO（8.4%）和 Best-of-N（7.7%）。

---

## 一、这篇文章在解决什么问题

### 1.1 背景：AlphaZero 范式与 LLM 的鸿沟

AlphaZero 在围棋、国际象棋等棋类游戏中取得了超人表现，其核心范式非常清晰：

1. **搜索增强**：推理时用 MCTS 搜索，得到比原始策略更强的增强策略
2. **策略蒸馏**：将搜索增强后的策略蒸馏回网络权重
3. **迭代提升**：重复上述过程，模型不断进化

这个范式在棋类游戏中大获成功，但在语言模型领域却一直没有成功复现。DeepSeek-R1 的作者明确提到他们在 MCTS 方向上[收效甚微](https://arc.net/l/quote/caevdneg)。Finbarr Timbers 在其[博客](https://finbarr.ca/request-for-research-puct/)中指出，一个可能的原因是 DeepSeek 使用了 UCT 而非 pUCT——后者利用策略先验引导搜索，对高分支因子的环境至关重要。

### 1.2 核心问题

这篇文章要回答两个问题：

1. **搜索蒸馏是否真的能提升语言模型的推理能力？**
2. **它与标准的语言模型 RL 方法（如 GRPO）相比表现如何？**

### 1.3 为什么棋类方法不能直接照搬

棋类游戏和语言模型推理之间存在根本性差异：

| 维度 | 棋类游戏 | 语言模型推理 |
|------|---------|------------|
| 动作空间 | 有限且离散（每步几十到几百个合法走法） | 极大（词表级别，~100K tokens） |
| 动作语义 | 每一步对胜负影响显著 | 大量 token 是语法填充，对推理路径无实质影响 |
| 分支多样性 | 不同走法通常导向不同局面 | "but"/"however"/"yet" 等同义 token 导向相同推理 |
| 搜索开销 | 可控 | token 级搜索树会爆炸性增长 |

如果在 token 级别做 MCTS，大量计算资源会浪费在语义等价的分支上，搜索树规模爆炸但实际探索有效推理路径的能力很差。

---

## 二、方法：怎么解决的

### 2.1 核心设计：推理步级别的 MCTS

作者采用了 [Tree-of-Thoughts (Yao et al., 2023)](https://arxiv.org/abs/2305.10601) 的思路，**在推理步（reasoning step）级别而非 token 级别构建搜索树**：

- **根节点** = 输入 prompt
- **中间节点** = 一个完整的推理步（`<step>...</step>` 标签内的连续 token 序列）
- **终端节点** = 最终答案

这个设计绕开了 token 级搜索的核心痛点：每个搜索分支都是一个完整的推理步，语义差异显著，搜索资源不会浪费在同义词上。

### 2.2 搜索过程

在每个叶节点，模型生成 K=4 个候选推理步（直到遇到 `</step>` 停止标签）。这 K 个序列构成该节点的动作空间。

#### pUCT 与策略先验

MCTS 需要平衡探索与利用，作者使用 pUCT（AlphaZero 中使用的变体）而非普通 UCT。关键区别在于 pUCT 利用**策略先验**引导搜索：

- 对每个候选推理步计算序列级别的 summed logprobs
- 通过 softmax 转换为相对先验概率
- 使用相对概率而非原始累积概率，避免长序列概率趋近于零的数值问题

#### 并行 MCTS

作者引入了**并行搜索**作为额外的 scaling 维度：N=16 个 agent 共享同一棵搜索树，使用 virtual loss 机制鼓励搜索多样性。virtual loss 的原理是：当一个 agent 正在探索某个分支时，临时增加该分支的访问计数，使其他 agent 倾向于探索别的分支。

#### Value Head

MCTS 需要价值函数 V(s_t) 评估中间状态，作者在 transformer 最后一层 hidden state 上接了一个 MLP + tanh 作为 value head，随训练同步更新。

### 2.3 蒸馏：从搜索策略到模型权重

搜索完成后，需要将搜索结果转化为模型的训练信号。这里存在一个关键问题：**粒度不匹配**。

在棋类中，蒸馏是通过最小化搜索策略（根节点的 visit count 分布）与模型原始策略之间的 KL 散度实现的。但这里的搜索动作空间（推理步）和模型原始动作空间（token）粒度不同，无法直接计算 KL 散度。

作者的解决方案：**轨迹选择 + PPO**

1. 所有 worker 完成 M=100 次 MCTS 迭代后，从根节点开始按最大访问计数贪心选择轨迹
2. 将选中的轨迹提交到共享 buffer
3. "trainer" 进程从 buffer 中异步拉取样本，用 PPO 训练模型

### 2.4 训练目标

总损失函数：

$$L_{total} = c_{ppo} \cdot L_{ppo} + c_{value} \cdot L_{value} + c_{KL} \cdot D_{KL}(\pi_\theta \| \pi_{ref})$$

其中：
- **PPO 目标**使用 CISPO 变体（clipped importance sampling policy optimization）
- **Value 目标**是标准均方误差：$L_{value} = \mathbb{E}[(V(s_t) - r)^2]$
- **KL 惩罚**使用 DeepSeek-R1 论文中的非对称 KL 形式，防止策略偏离参考模型太远

#### Advantage 计算

作者没有使用 GAE（Generalized Advantage Estimation），原因是推理轨迹可能长达数千个 token，在只有终端奖励的情况下，早期 token 的折扣值会指数衰减到可忽略。替代方案是直接使用：

$$A_t = r_{terminal} - \text{sg}(V_{old}(s_t))$$

对轨迹中每个 token 赋予相同的终端奖励。

### 2.5 奖励函数设计

训练使用**密集奖励**避免不稳定：

$$r = 1.0 - 2 \cdot \min\left(\frac{|t - p|}{t},\; 1.0\right)$$

其中 t 是目标值，p 是预测值。格式错误直接 -1.0。

评估使用**稀疏奖励**（0/1 正确性），保持直觉可解释性。

### 2.6 基础设施

在 8×H100 节点上运行：
- 6 块 GPU 做 generator（负责 MCTS 搜索和生成）
- 2 块 GPU 做 trainer（负责 PPO 训练）
- Rust worker 负责任务调度和 gRPC 通信
- Redis stream 做轨迹 buffer，Redis pub/sub 做权重同步（每 8 个梯度步同步一次）

---

## 三、实验任务：Countdown

作者选择了 **Countdown** 游戏作为实验环境，而非 GSM8K。

Countdown 规则：给定 N=4 个正整数（范围 [1,13]），用四则运算（+、-、×、÷）凑出一个目标数。

选择 Countdown 而非 GSM8K 的理由：**组合问题更能体现树搜索的优势**。GSM8K 是顺序推理任务，一步步算就行；Countdown 需要探索多种运算组合，天然适合并行搜索。

- 训练集：20,000 个样本
- 评估集：820 个样本
- 基础模型：Qwen-2.5-1.5B-Instruct

---

## 四、结果分析

### 4.1 主要结果

评估指标为 **mean@16**（对每个问题生成 16 次，计算平均正确率）：

| 方法 | mean@16 | 相对提升（vs 基线 3.1%） |
|------|---------|----------------------|
| 基线（Instruct 模型） | 3.1% | — |
| Best-of-N 蒸馏 (N=64) | 7.7% | +4.6pp |
| GRPO/CISPO | 8.4% | +5.3pp |
| **MCTS + PPO 蒸馏** | **11.3%** | **+8.2pp** |

MCTS 蒸馏在推理时不使用任何搜索增强，纯靠模型本身的 forward pass，仍然显著优于 GRPO。

### 4.2 Best-of-N 蒸馏为什么最差

一个反直觉的发现：Best-of-N 的**训练奖励最高**，但评估性能却最差。

作者的解释非常精彩：

> 如果模型在推理过程中有 98% 的概率犯至少一个错误，那么 64 次采样中至少有一次正确的概率是 $1 - 0.98^{64} \approx 72.6\%$。但如果模型知道自己可以"多次考试"，它就没有动力发展出每次都稳健推理的策略。

Best-of-N 本质上是"挑最好的"，它教会模型"运气好就行"，而不是"学会可靠地推理"。相比之下，MCTS 蒸馏通过树结构识别出系统性更优的推理路径，训练信号质量更高。

### 4.3 MCTS vs GRPO 的本质差异

GRPO 对每个问题采样一组轨迹，用组内相对排名计算 advantage。它的搜索是**无结构的**——每次采样独立，无法复用之前的搜索信息。

MCTS 则构建了一棵**有结构的搜索树**：
- 分支点明确（每个推理步是一个决策点）
- 好的中间推理步被不同轨迹复用
- 搜索资源集中在最有潜力的方向

这使得在相同的推理步探索预算下，MCTS 能找到更优的轨迹。

---

## 五、方法与相关工作的对比

### 5.1 与 TS-LLM 的关系

本方法与 [TS-LLM (Feng et al., 2023)](https://arxiv.org/html/2309.17179v2) 最为接近，后者也将 AlphaZero 式树搜索与 sentence-level 动作结合。关键差异：

| 维度 | TS-LLM | 本方法 |
|------|--------|-------|
| 蒸馏方式 | SFT（行为克隆） | 在线 RL（CISPO/PPO） |
| 搜索并行 | 无 | 并行 MCTS + virtual loss |

使用 PPO 而非 SFT 蒸馏的优势在于：PPO 可以动态调整策略，不受固定数据集限制；advantage 信号比简单模仿更具信息量。

### 5.2 与 DeepSeek-R1 的关系

DeepSeek-R1 报告 MCTS 效果不佳，可能原因：
- 使用了 UCT 而非 pUCT（无策略先验引导，在高分支因子空间中搜索效率低）
- 可能在 token 级别搜索（搜索树爆炸，有效搜索差）
- 大模型的基础策略已经很强，搜索带来的边际收益可能递减

### 5.3 与 Marco-o1 v2 的关系

Marco-o1 v2 也探索了 MCTS + 蒸馏的方向，但侧重于用 tree-based CoT 生成更高质量的蒸馏数据，是 SFT 范式。本文则走的是在线 RL 路线。

---

## 六、局限性与开放问题

作者坦诚地指出了几个局限：

### 6.1 规模问题

实验只在 **1.5B 模型**上进行，绝对分数很低（11.3%）。这可能是"小模型现象"——小模型的基础策略弱，搜索增强空间大；大模型基础策略强，搜索的边际收益可能递减。

### 6.2 计算公平性

MCTS 在训练时每个样本使用的推理计算量远超 GRPO（16 个并行 worker × 100 次迭代 × 每次 4 个候选）。作者的回应是：目标不是计算等价比较，而是探索 MCTS 提供的**额外 scaling 维度**（worker 数、迭代数）能否突破 GRPO 的性能天花板。

### 6.3 GRPO 调参空间

GRPO 是否通过更好的超参数调优能追平 MCTS？作者引用 ScaleRL 的结论认为 GRPO 的大多数超参数影响的是计算效率而非最终性能天花板，但这仍是一个开放问题。

### 6.4 任务泛化性

只在 Countdown 上验证，GSM8K 上没有观察到显著差异。组合问题 vs 顺序推理问题的搜索收益可能有本质差异。

---

## 七、核心 Insight 总结

### 7.1 搜索蒸馏的核心价值

搜索蒸馏的关键不在于"搜索时用了更多计算"，而在于它产生了**结构化的训练信号**：

- GRPO 的信号：无结构的随机采样 → 组内排名
- Best-of-N 的信号：挑最好的 → 鼓励"碰运气"
- MCTS 的信号：有结构的搜索树 → 系统性地找到更优路径

### 7.2 粒度选择至关重要

从 token 级搜索到推理步级搜索，这个粒度选择是整篇文章最关键的设计决策。它直接决定了搜索树的有效性——在语义有意义的粒度上分支，而不是在词汇表级别分支。

### 7.3 新的 Scaling 维度

MCTS 引入了两个 GRPO 没有的 scaling 旋钮：
- **并行 worker 数**：增加搜索多样性
- **MCTS 迭代数**：增加搜索深度

初步实验显示增加这两个值都能提升性能。这意味着除了 model scale 和 data scale，**search scale** 可能是第三个 scaling axis。

---

## 八、与 Lighthouse 其他文章的关联

- **[V₀.₅](./v05-value-model-prior-sparse-rl-rollouts)**：同样在改进 RLVR 训练，但从 baseline estimation 角度解决稀疏 rollout 问题。本文的 value head 本质上也在做类似的事——提供中间状态的价值估计。
- **[DCPO](./dcpo-decoupling-reasoning-calibration-rlvr)**：关注 RLVR 训练中推理与校准的解耦，与本文的 advantage 计算设计（不使用 GAE，直接用终端奖励减 value）有理论呼应。
- **[OPSDC](./opsdc-self-distillation-reasoning-compression)**：同样是蒸馏方法改进推理，但方向相反——OPSDC 压缩推理链，本文扩展搜索空间。

---

## 九、一句话总结

> 将 AlphaZero 的"搜索→蒸馏"范式成功迁移到 LLM：在推理步粒度做并行 MCTS，用 PPO 在线蒸馏搜索策略，初步证明结构化搜索信号优于无结构的 GRPO 采样——为 LLM 推理能力的提升开辟了 search scale 这一新维度。
