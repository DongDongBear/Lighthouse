---
title: "深度解读 | SpecGuard：把 speculative decoding 从 token 验收改成 step 验收，能否更快更稳地做多步推理？"
description: "SpecGuard, verification-aware speculative decoding, ABGV/LPBV 双内置信号, Algorithm 1 逐步解释, 形式化保证, Qwen2.5-Math-Instruct 上 MATH500 85.4 / GSM8K 95.8 / Gaokao 69.4 / Olympiad 41.2, 对比 RSD / 搜索式方法 / 消融 / 复现评估"
---

> 2026-04-18 · 深度解读 · 编辑：Lighthouse
>
> 原文：[arxiv.org/abs/2604.15244](https://arxiv.org/abs/2604.15244) — From Tokens to Steps: Verification-Aware Speculative Decoding for Efficient Multi-Step Reasoning
>
> 作者：Kiran Purohit, Ramasuri Narayanam, Soumyabrata Pal（IIT Kharagpur / Adobe Research）

---

## 速查卡

| 维度 | 内容 |
|------|------|
| 一句话总结 | SpecGuard 的核心不是“让 draft 多吐 token 再让 target 对 token 逐个验收”，而是把推理单元提升到“step”，再用两个来自模型内部的轻量信号——注意力归因 grounding 和 token log-prob 置信度——决定这个 step 是否可信。 |
| 大白话版 | 它想解决一个老问题：普通 speculative decoding 很快，但只会看 token 像不像 target，会把“局部像样、整体跑偏”的中间步骤一路放过去；RSD 虽然会在 step 上打分，但要外挂 PRM，慢、贵、还未必泛化。SpecGuard 试图只靠模型内部信号做出一个更便宜的“过程守门员”。 |
| 关键数据 | 在 Qwen2.5-Math-Instruct（1.5B draft / 7B target）上，SpecGuard 达到 MATH500 85.4、GSM8K 95.8、Gaokao 69.4、Olympiad 41.2；相对 RSD Majority 分别高 7.4 / 7.1 / 4.5 / 2.5 个点。 |
| 效率结论 | 论文主张整体相对 SOTA 方法“最高 +3.6% 准确率、约 11% 降时延”；图 2 的具体例子中，GSM8K 上 SpecGuard 95.8% 用时 34 分钟，而 RSD Majority 88.7% 超过 41 分钟。 |
| 方法关键词 | ABGV（Attention-Based Grounding Verification）、LPBV（Log Probability-Based Verification）、Self-Consistency Selector、step-level acceptance、formal guarantees。 |
| 影响评级 | A- — 不是再造一个更大的 verifier，而是把 speculative reasoning 的验证信号“内生化”。如果这个方向成立，它对 test-time compute 的意义比单纯堆 PRM 更可持续。 |

---

## 核心 Insight

这篇论文真正有价值的点，不只是“SpecGuard 比 RSD 分数高”，而是它把 speculative decoding 的验证对象、验证信号和计算分配方式一起改了。

**① 从 token acceptance 改成 step acceptance，才真正对准了多步推理的错误形态。**
普通 SD 的问题不是它不能加速，而是它验证得太细碎：token 对了，不代表这个推理 step 对。论文一上来就把矛头对准这个 mismatch：token-centric SD 在 reasoning 任务里会让错误 step 传播。SpecGuard 改成“step 级候选 + step 级验收 + step 级回退 target”，这比继续在 token acceptance 上修修补补更像是针对 reasoning 的结构性修复。

**② 它试图用模型内部信号替代外部 PRM，这让效率和泛化变成同一个问题的解。**
RSD 的主要卖点是 step-level guidance，但代价是外挂一个 process reward model。SpecGuard 的判断是：如果能直接从 target/draft 自己的 attention 和 log-prob 里抽到足够强的 verifier 信号，就能同时避开 PRM 额外延迟、额外训练和任务专用性。论文所有实验都在为这个命题服务。

**③ 最关键的不是“多采样”，而是“多采样后怎么挑一个最代表性的 step，再决定要不要信它”。**
论文不是简单 majority voting。它先采样 k 个 candidate step，再用 sentence transformer 的 embedding 相似度找“最不离群”的那个候选，然后再对该 step 做 ABGV + LPBV 验证。这意味着它把 test-time compute 拆成两个层次：
- 候选多样性：让 draft 多探索几个可能 step；
- 验证选择性：只把“最一致、且同时高置信 + 高 grounding”的 step 直接放过。

`★ Insight ─────────────────────────────────────`
这篇论文最值得记住的一句话是：SpecGuard 不是在“优化 speculative decoding 的 token 接受率”，而是在“优化 reasoning step 的可信接受率”。这个问题定义一变，后面的 verifier、复杂度、消融和 formal guarantees 才都成立。
`─────────────────────────────────────────────────`

---

## 方法详解

### 1. ABGV：Attention-Based Grounding Verification

作者把“一个推理 step 是否 grounded”定义为：这个 step 里的每个 token，是否都把足够多的注意力归因到输入 prompt 和先前已验证通过的 step 上。

设输入为 `x`，第 `i` 个推理 step 为：

`y_i = (y_{i,1}, y_{i,2}, ..., y_{i,T})`

每层每头的 attention 矩阵记为：

`A^(l,h) ∈ R^((t_input + t_output) × (t_input + t_output))`

先对 head 求平均，得到每层的 `A^(l)`；再用 attention rollout 计算跨层累计归因：

`R = A^(L) A^(L-1) ... A^(1)`

令 `I` 表示输入 token 与先前已接受 step 的 token 集合，则某个输出 token 的 grounding score 为：

`G(y_{i,t}) = Σ_{j∈I} R_{y_{i,t}}[j]`

ABGV 采用非常严格的 step-level 判据，不是取平均，而是取该 step 中最差 token：

`G_min-step = min_t G(y_{i,t})`

也就是说，只要这个 step 里有某个 token 几乎没“看”输入或已验证上下文，整个 step 的 grounding 就会被拉低。作者认为这能避免“不 grounded 的坏 token 被平均值掩盖”。

论文还做了两个工程化近似来控内存和时延：
- 只存最后 3 层 attention，而不是所有层；
- 对 attention head 中小于 0.01 的值直接稀疏化丢弃。

这两个决定后面都做了消融。

### 2. LPBV：Log Probability-Based Verification

第二个 verifier 更直观：如果一个 step 是模型自己都不太有把握吐出来的，那就不该轻易接受。

对 step 中每个 token：

`L(y_{i,t}) = log p(y_{i,t} | x, y_{i,<t})`

同样，step 级别也采用最严格的 min 判据：

`L_min-step = min_t L(y_{i,t})`

这里的直觉是：一个 step 只要有一个 token 概率极低，就说明这条推理链上存在明显不稳定点。

### 3. ABGV + LPBV 的集成打分

作者把两个分数先做 Min-Max 归一化：

`l̃_i = (l_i - l_min) / (l_max - l_min)`

`g̃_i = (g_i - g_min) / (g_max - g_min)`

再组合成 ensemble verifier score：

`r_i = β · l̃_i + (1 - β) · g̃_i`

当 `r_i ≥ τ` 时，接受 draft step；否则调用 target 重新生成该 step。

在主实验里，作者使用：
- `β = 0.3`
- `τ = 0.7`

这组选择的含义很明确：grounding 权重更大，log-prob 只是辅助信号，而不是主导信号。

### 4. Self-Consistency Selector：先选“最代表性的 step”，再验证

SpecGuard 不直接对 k 个 step 做打分再选最高，而是先做一个语义一致性选择。

给定 `k` 个候选 `y^(1), ..., y^(k)`，用 sentence transformer `E` 编码成归一化 embedding `e^(j)`，再计算余弦相似度矩阵：

`S_ij = <e^(i), e^(j)>`

然后做 row-wise softmax：

`S̃_ij = exp(S_ij) / Σ_l exp(S_il)`

取对角元素：

`d_j = S̃_jj`

最后选择：

`j* = argmin_j d_j`

这一点很有意思：选的是“自对齐分数最小”的候选。因为如果一个候选和其他候选也都相似，它的相似度质量会分散到其他样本上，反而不会只集中在自己身上；真正的离群点才会对自己特别像、对别人都不像，因此 `d_j` 更高。作者据此把 `argmin d_j` 当成“最语义一致”的 step。

### 5. Algorithm 1 逐步解释

论文的 Algorithm 1 可以压缩成下面这 6 步：

1. 用 draft 模型在当前 step 采样 `k` 个候选 step。
2. 用 self-consistency selector 选出最不离群、最代表性的 draft step。
3. 计算该 step 的最小 log-prob `l_i` 与最小 grounding `g_i`。
4. 归一化后计算 ensemble score `r_i`。
5. 若 `r_i ≥ τ`，直接接受该 draft step；否则调用 target 也采样 `k` 个 step，再用同样 selector 选出 target step。
6. 重复，直到出现 EOS 或达到最大长度 `N`。

换句话说，SpecGuard 的计算策略是：
- draft 负责“便宜地探索”；
- verifier 负责“便宜地筛错”；
- target 只在 verifier 不放心时介入。

这就是论文所谓的 adaptive inference-time compute allocation。

---

## 正式保证：论文到底证明了什么？

论文给了三个理论结果，重点不是证明“绝对正确”，而是证明“这套 acceptance 机制在概率上有声音、而且 target 调用数可控”。

### Lemma 1：Soundness Guarantee

设正确 step 的集合为 `C`。若对任意正确 step，都有：

`Pr[l̃_i ≥ α | y_i ∈ C] ≥ 1 - ε_l`

`Pr[g̃_i ≥ α | y_i ∈ C] ≥ 1 - ε_g`

则：

`Pr[V(y_i)=accept | y_i ∈ C] ≥ 1 - (ε_l + ε_g)`

直觉上，这是个 union bound 风格的结果：如果 log-prob 信号和 grounding 信号对正确 step 都较少误杀，那么两者组成的 verifier 也不会太容易错杀正确 step。

### Lemma 2：Efficiency Guarantee

设 `π_i = Pr[V(y_i)=accept]`，则 target 调用次数 `C_T` 的期望满足：

`E[C_T] = Σ_{i=1}^T (1 - π_i)`

如果每一步都有 `π_i ≥ π_min`，则：

`E[C_T] ≤ T · (1 - π_min)`

这基本就是把“acceptance rate 高”直接翻译成“target call 少”。

### Theorem 1：Accuracy–Efficiency Trade-off

如果正确 step 满足 Lemma 1，同时错误 step 至少以 `1 - δ` 的概率被拒绝，则长度为 `T` 的序列满足：

`Pr[all accepted steps are correct] ≥ (1 - ε_l - ε_g)^T · (1 - δ)^(C_T)`

论文据此声称：SpecGuard 可以在“接受正确 step”与“减少 target 调用”之间建立一个可解释的概率下界。

需要注意的是，这些保证依赖于对信号质量的假设，属于条件性保证，不是无条件 correctness theorem。但在这类 inference-time verification 论文里，这已经是相当完整的写法。

---

## 实验设置

### 数据集与指标

四个 benchmark，统一用 exact match：

| 数据集 | 测试规模 | 任务类型 |
|--------|----------|----------|
| MATH500 | 500 | 竞赛数学多步推理 |
| GSM8K | 1319 | 小学/初中算术 word problem |
| Gaokao-2023-En | 385 | 高考英文翻译版数学题 |
| OlympiadBench | 675 | 奥数/科学竞赛级高难题 |

### 模型与服务设置

论文覆盖 math-specific 与 general-purpose 模型；除特别说明外，主结果默认使用 Qwen2.5-Math-Instruct。

主配置：
- target：Qwen2.5-Math-Instruct 7B
- draft：Qwen2.5-Math-Instruct 1.5B
- RSD 的 PRM：Skywork-o1-OpenPRM
- serving backend：vLLM
- 硬件：NVIDIA A100

reasoning step 的定义是：以 `\n\n` 截断的一段生成。

多采样设置：
- `temperature = 0.7`
- `top_p = 0.8`
- `n = 16`

Greedy 版本：
- `temperature = 0`
- `top_p = 1`
- `n = 1`

主超参：
- `β = 0.3`
- `τ = 0.7`

---

## 主实验表：Qwen2.5-Math-Instruct 是这篇论文最重要的结果

### 1. 论文要求你记住的核心数字

在 Qwen2.5-Math-Instruct（7B target / 1.5B draft）上，SpecGuard 的主结果是：

| 方法 | MATH500 | GSM8K | Gaokao 2023 En | Olympiad Bench |
|------|---------|-------|----------------|----------------|
| Target Model | 83.0 | 94.7 | 66.8 | 40.6 |
| Target-only Majority | 84.9 | 95.2 | 68.8 | 41.0 |
| Draft-only Majority | 79.0 | 88.9 | 67.9 | 40.9 |
| Best-of-N | 82.2 | 93.3 | 67.4 | 40.7 |
| SD | 82.4 | 94.2 | 66.3 | 39.4 |
| RSD | 82.4 | 94.4 | 68.5 | 39.6 |
| RSD Majority | 78.0 | 88.7 | 64.9 | 38.7 |
| SC + LPBV | 83.2 | 94.5 | 67.5 | 39.7 |
| SpecGuard Greedy | 83.6 | 95.6 | 68.8 | 40.7 |
| SpecGuard | 85.4 | 95.8 | 69.4 | 41.2 |

### 2. 相对 RSD Majority 的表现

这是用户最关心、也是论文最醒目的对照之一。SpecGuard 相对 RSD Majority 的提升为：

| 数据集 | SpecGuard | RSD Majority | 绝对提升 |
|--------|-----------|--------------|----------|
| MATH500 | 85.4 | 78.0 | +7.4 |
| GSM8K | 95.8 | 88.7 | +7.1 |
| Gaokao 2023 En | 69.4 | 64.9 | +4.5 |
| Olympiad Bench | 41.2 | 38.7 | +2.5 |

如果换成相对增幅，大约是：
- MATH500：+9.5%
- GSM8K：+8.0%
- Gaokao：+6.9%
- Olympiad：+6.5%

这组数据说明一个重要事实：RSD Majority 并不是“RSD + 多采样 = 更强”，反而可能因为 PRM 在 step 级打分时把噪声不断累加，导致多采样带来的不是稳定增益，而是放大误导。

### 3. 与 target-only majority 的关系

SpecGuard 不是简单“超过单 target”而已，它甚至略高于 target-only majority：
- MATH500：85.4 vs 84.9
- GSM8K：95.8 vs 95.2
- Gaokao：69.4 vs 68.8
- Olympiad：41.2 vs 41.0

作者对此的核心论点是：target-only majority 虽然也能准，但每一步都要让 target 多次采样，计算代价明显更高，不符合“减少 target calls”的目标。

---

## 与搜索式方法对比：为什么作者说“别再只靠 search”

论文单独拿 Qwen2.5-Math-Instruct 做了搜索式方法对比。

| 方法 | 设置 | MATH500 | GSM8K |
|------|------|---------|-------|
| Draft Model (1.5B) | - | 73.8 | 85.0 |
| Process Best-of-N | N=8 | 75.8 | 87.8 |
| Process Best-of-N | N=16 | 76.0 | 87.9 |
| Beam Search | bs=4 | 78.2 | 88.9 |
| Beam Search | bs=8 | 78.2 | 88.4 |
| RSD (1.5B/7B/1.5B) | - | 82.4 | 94.4 |
| SpecGuard Greedy | - | 83.6 | 95.6 |
| SpecGuard | maj@16 | 85.4 | 95.8 |

这里能看到三个层级：

1. 纯 search（beam / process BoN）明显不够。
2. 加 PRM 的 RSD 已经比 search 强很多。
3. 仅靠模型内部 verifier 的 SpecGuard 又进一步超过 RSD。

论文对这个结果的解释是：当 reasoning step 很复杂时，search 方法面临组合爆炸，很难在巨大路径空间里稳定找到最好路径；SpecGuard 不是单纯“搜更多”，而是让大模型 target 作为必要时的强纠错器，再配合 step-level verifier 进行 selective compute。

用更直白的话说：search-based 方法主要赌“候选里总会有一个对的”；SpecGuard 则赌“先用小模型便宜探索，再让 verifier 判断哪些候选值得保留，剩下交给大模型兜底”。

---

## 样本数与时间：SpecGuard 为什么比 RSD Majority 更像一个可部署方案

论文在 Figure 2 的结论有两层：

### 1. 样本数增加时，SpecGuard 比 RSD Majority 更能吃到收益

作者观察到：
- SpecGuard 随着每个 step 的采样数增加，准确率稳步提升，但高样本下收益会逐渐饱和；
- RSD Majority 在大样本下会出现 diminishing returns，甚至变差，因为 PRM 噪声会在更多候选上被不断累积。

这其实和主结果表里的现象一致：多采样不是天然有利，关键是 verifier 能不能稳定识别“对的多样性”和“错的多样性”。

### 2. 具体 runtime 例子

论文给出的硬数字是：
- GSM8K 上，SpecGuard：95.8%，34 分钟；
- RSD Majority：88.7%，超过 41 分钟。

也就是说，SpecGuard 在这个例子里不只是“更准”，还节省了至少 7 分钟；如果以 41 分钟为基准，保守算相对节省约 17.1%。

论文摘要与附录 A.3 的总体表述则更保守：相对 RSD，“最高约 11% 更低 runtime，同时带来 1–3% 的精度提升”。两者并不矛盾，前者是具体 benchmark 个例，后者是论文整体总结口径。

---

## 消融：ABGV 到底值不值？

### 1. 去掉 ABGV，只保留 SC + LPBV

最关键的消融其实已经藏在主表里：

| 方法 | MATH500 | GSM8K | Gaokao | Olympiad |
|------|---------|-------|--------|----------|
| SC + LPBV | 83.2 | 94.5 | 67.5 | 39.7 |
| SpecGuard | 85.4 | 95.8 | 69.4 | 41.2 |
| 提升 | +2.2 | +1.3 | +1.9 | +1.5 |

这基本就是在回答一个核心问题：只看模型“自信不自信”不够，必须再看它“有没有 grounded 到输入与已验证上下文”。

作者在正文里直说：LPBV 能捕捉 confidence，但缺少 grounding，因此会让“高置信但不 grounded”的 step 漏过去；SpecGuard 更高的结果说明 ABGV 正是在拦这种错误。

### 2. 最后 3 层 vs 所有层 vs 中间层 vs 前 3 层

附录 A.2.1 的结论是：
- 前 3 层明显更差；
- 中间 3 层优于前层，但仍不如深层；
- 所有层与最后 3 层都很强；
- 但所有层 runtime 开销更高。

因此作者选“最后 3 层”作为最佳准确率/时延折中。

### 3. attention sparsity 阈值 0.01

正文 Figure 3 指出，把 attention 中小于 0.01 的值删掉，既提升运行效率，也没有带来性能损失。作者的解释是：稀疏化让 verifier 更聚焦于真正相关的注意力模式。

### 4. β 与 τ 的敏感性

附录 A.2.2 给出超参敏感性：

`β` 消融（Qwen2.5-Math-Instruct）：
- `β = 0.3`：85.4 / 95.8 / 69.4 / 41.2
- `β = 0.5`：85.0 / 95.7 / 68.5 / 40.4
- `β = 0.7`：84.4 / 95.6 / 65.5 / 40.2

可见 `β` 越大，log-prob 权重越高，Gaokao 和 Olympiad 掉得更明显，说明 grounding 对复杂推理更关键。

`τ` 消融：
- `τ = 0.6`：83.6 / 93.5 / 67.4 / 39.7
- `τ = 0.7`：85.4 / 95.8 / 69.4 / 41.2
- `τ = 0.8`：84.2 / 94.6 / 68.7 / 40.4
- `τ = 0.9`：85.1 / 95.6 / 69.2 / 41.0

作者的总结是：`τ = 0.7` 最稳定，过低会放过更多坏 step，过高则会更频繁触发 target，未必换来更好结果。

---

## 定性案例：为什么论文认为 PRM 会“局部看着都对，最后却错”

附录 A.2.3 给了两个特别重要的例子：

1. 宝石计数题里，PRM 给每个中间 step 都打了约 0.96 的高分，但最终答案却是错误的 `535`；而 SpecGuard 最终能走到正确答案 `595`。
2. 分水题里，PRM 同样让每一步都高分通过，但在“先扣掉两个女孩，再扣男孩”这个关键顺序上出错，最后答案给成 `2`；SpecGuard 则得到正确答案 `10`。

这两个例子很能说明作者的立场：PRM 可能擅长判断“这一步像不像合理自然语言推理”，却不一定能确保整个链条在约束传播上始终正确；SpecGuard 更强调“step 必须 grounded 到输入和已验证历史”。

---

## 复现评估

这部分很关键。就现有笔记信息看，论文给出的复现友好度属于“中等，可做，但还不算一键复现”。

### 1. 有利于复现的部分

论文明确披露了：
- benchmark 与测试规模；
- 主模型组合（Qwen2.5-Math-Instruct / Qwen2.5-Instruct / Llama-3.x）；
- serving backend 是 vLLM；
- 硬件是 A100；
- 多采样参数：`temperature=0.7, top_p=0.8, n=16`；
- greedy 参数：`temperature=0, top_p=1, n=1`；
- 超参：`β=0.3, τ=0.7`；
- step 划分规则：以 `\n\n` 为界；
- RSD 使用的 PRM：Skywork-o1-OpenPRM；
- self-consistency selector 使用 sentence transformer embedding；
- 因 vLLM 不暴露中间 hidden states，所以 selector embedding 外部计算。

这意味着一个熟悉 vLLM 和 reasoning benchmark 的团队，理论上已经能照着搭出大致实验框架。

### 2. 复现难点

但笔记中没有看到以下信息：
- 代码仓库链接；
- 具体 sentence transformer 型号；
- ABGV 中 attention rollout 的全部工程细节；
- Min-Max 归一化区间 `[l_min, l_max]`、`[g_min, g_max]` 的具体统计方式；
- runtime 统计口径与 batch/并发细节；
- 多模型下 prompt 模板是否完全一致。

这些都会影响“能不能精确复现实验表里的数值”。

### 3. 我的复现结论

如果目标是“方向级复现”，这篇论文的信息量够用；
如果目标是“逐点复现表 1 / 图 2 / 图 3 的全部数字”，当前披露还差若干工程细节，尤其是 verifier 实现与归一化统计口径。

所以更准确的评价是：
- 研究思想可复现；
- 工程细节部分可复现；
- 结果级严格复现仍依赖作者补代码或补 appendix 细节。

---

## 局限与我认同的保留意见

论文自己的 limitation 写得比较克制，主要有两点：

### 1. 评测范围仍集中在“结构化多步推理”

作者承认，实验覆盖的是 math/structured reasoning benchmark，没有显式评测 open-ended generation、长对话、创意写作等任务。在这些任务里，“step-level verification”的定义本身就没这么自然。

这意味着 SpecGuard 现在更像“reasoning inference 框架”，还不能直接外推出“通用生成加速框架”。

### 2. 论文主要考察单实例推理，不涉及大规模部署侧问题

作者明确说，分析集中在 single-instance inference，没有系统讨论大 batch、生产级调度、硬件特定优化等问题。所以“per-instance latency 更低”不等于“线上吞吐一定更高”。

### 3. 我认为还应补充的一点：formal guarantees 与实际信号质量之间仍有距离

理论部分证明得很工整，但前提是 `l̃_i` 和 `g̃_i` 对正确/错误 step 的概率性质足够好。现实里，这两个信号并不总是稳定：
- log-prob 可能偏好熟悉但错误的模式；
- attention grounding 也不自动等于因果正确性。

所以我会把论文的 formal guarantees 理解为“给 acceptance 规则提供了清晰的统计框架”，而不是“已经证明 ABGV + LPBV 就足够判真伪”。

---

## 这篇论文在谱系里的位置

如果把相关工作按“验证器从外部到内部”排一条线，大致可以这样看：

- 传统 SD：几乎不做语义级验证，只做 token-level target consistency。
- RSD：引入外部 PRM，在 step 级做 reward-guided verification。
- 搜索式方法：扩大候选空间，再靠 PRM 或搜索策略找好轨迹。
- SpecGuard：不再外挂 verifier，而是把 verifier 收回模型内部，用 grounding + confidence 做 step acceptance。

所以 SpecGuard 的真正贡献不只是“指标更高”，而是提出了一个值得继续追的方向：

“在 reasoning inference 中，外部 PRM 也许不是唯一的 verifier 形式；模型内部信号经过合适聚合，可能已经足够承担相当一部分过程验证职责。”

如果后续工作把 entropy、uncertainty calibration、hidden-state consistency 之类信号也加入进来，这条路线是有机会继续扩展的。作者在结论里也明确把这一点列为未来工作。

---

## Lighthouse 总结

我会把这篇论文概括成一句话：

SpecGuard 不是在 speculative decoding 上“再加一个 judge”，而是在重写 reasoning 场景下“什么才算一个值得直接接受的 draft step”。

它最强的地方有三点：
1. 问题定义改得对：从 token 迁移到 step；
2. 信号选择够克制：不用外挂 PRM，只用模型内部可取到的 grounding + confidence；
3. 结果确实站得住：尤其在 Qwen2.5-Math-Instruct 上，85.4 / 95.8 / 69.4 / 41.2 这组数已经说明它不是纸上谈兵。

但也要看到，它仍然主要验证“结构化数学推理”，而且工程复现还缺一些关键公开细节。真正的长期价值，不在于这篇论文的单次 leaderboard，而在于它把 speculative reasoning 的验证范式往“轻量、内生、step-aware”方向推了一步。
