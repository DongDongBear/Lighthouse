---
title: "深度解读 | UniT：把人类动作蒸馏成“统一物理语言”，让 humanoid policy 与 world model 共用一套跨具身 token"
description: "UniT, VLA-UniT, WM-UniT, humanoid, latent action tokenizer, visual anchoring, RoboCasa, real robot, world modeling"
---

# UniT 深度解读

## 原始标题

UniT: Toward a Unified Physical Language for Human-to-Humanoid Policy Learning and World Modeling

## 原文链接

- arXiv：https://arxiv.org/abs/2604.19734
- 项目页：https://xpeng-robotics.github.io/unit/

## 作者机构日期

- 作者：Boyu Chen, Yi Chen, Lu Qiu, Jerry Bai, Yuying Ge, Yixiao Ge
- 机构：XPENG Robotics、Tsinghua University、The University of Hong Kong
- 日期：2026-04-21（arXiv v1；原始 HTML 亦标注为 21 Apr 2026）

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | UniT 不是直接把人类动作 retarget 到机器人关节，而是先学一套“跨具身统一物理语言”，再让 policy 和 world model 都围绕这套 token 工作。 |
| 核心机制 | 三分支 tokenizer：视觉分支、动作分支、融合分支；三者共用一个 RQ-VAE 离散码本，并被双向 cross-reconstruction 约束。 |
| 为什么重要 | 论文抓住了一个很关键的判断：不同身体的关节空间不一致，但“同一意图造成的视觉后果”往往一致，所以视觉可当跨具身锚点。 |
| 下游一 | VLA-UniT：VLM 不再硬回归异构原始动作，而是先预测 UniT token，再由轻量动作 expert 生成具身特定控制。 |
| 下游二 | WM-UniT：世界模型不再直接吃 raw action，而是吃 UniT 的动作分支特征，从而让 human data 也能变成 humanoid video generation 的可控条件。 |
| 最硬政策结果 | RoboCasa 全数据成功率 66.7%，比 FLARE 的 55.0% 高 11.7 个点；比同架构但无 UniT 的 GR00T-Qwen2.5 47.8% 高 18.9 个点。 |
| 最硬真实世界结果 | IRON-R01-1.11 上，加入人类数据后 Pick & Place 从 70% 提到 78%，Pouring 从 35% 提到 75%；零样本 stacking 达到 60%。 |
| 最硬世界模型结果 | RoboCasa-GR1 上，WM-UniT 相比 Raw Action 从 PSNR 13.45→17.66、SSIM 0.590→0.718、LPIPS 0.259→0.142、FVD 237.13→166.50、EPE 0.558→0.453。 |

## 核心 Insight

这篇论文真正新的地方，不是“又做了一个 latent action tokenizer”，而是把跨具身对齐的锚点从关节学改成了视觉后果。

作者的基本判断是：

1. 人和 humanoid 的自由度、控制模式、动作参数化都不一样，直接在 action space 对齐非常困难。
2. 但如果两者执行的是相近意图，它们在环境中造成的可观察物理变化往往更相近。
3. 因此，最适合作为统一语义中介的，不是原始动作本身，而是“被视觉约束过的动作表征”。

这就把 UniT 的目标从“学一个压缩动作 token”抬升成“学一个具身无关的物理意图 token”。这也是论文把它叫 unified physical language 的原因。

## 方法详解

### 1. Tri-branch tokenizer：不是单流编码，而是三路同时逼近同一意图

UniT 输入的是：

- 观察对 `(o_t, o_{t+k})`
- 当前状态 `s_t`
- 动作 chunk `a_{t:t+k}`

然后走三条并行分支：

1. 视觉分支 `E_v`
   - 以 frozen DINOv2 特征作为输入
   - 本质上是 inverse dynamics model
   - 目标是从前后帧提取“发生了什么物理变化”

2. 动作分支 `E_a`
   - 输入状态 `s_t` 与动作 chunk `a_{t:t+k}`
   - 不同具身的 raw action 先 pad 到统一最大长度，再经具身特定 MLP 投影
   - 目的是抽取控制层面的紧凑表示

3. 融合分支 `E_m`
   - 以视觉和动作分支特征为输入
   - 学一个 visuo-motor fused latent

这里最重要的一点是：作者没有把视觉和动作做成两个互不相干的 tokenizer，再在下游“顺便一起用”；他们要的是三条支路在离散空间里共享一套物理意图语义。

### 2. Shared RQ-VAE codebook：统一空间不是口头说统一，而是三支路量化到同一码本

三条支路的连续 latent 都进入共享的 RQ-VAE 码本 `\mathcal{C}`：

`\hat{z}_{i}=\operatorname{RQ}(z_{i};\mathcal{C}),\quad i\in\{v,a,m\}`

这一步是 UniT 的结构性关键。

如果视觉、动作、融合三路各自用各自词表，那么系统仍然只是“多模态并存”；只有把三路都压进同一离散空间，才可能得到真正共享的 token vocabulary。

作者还强调 residual quantization 的作用是逐层逼近，既保留 coarse physical intent，也保留 finer motion detail。

### 3. Cross-reconstruction：UniT 的灵魂，不是联合编码，而是双向互相证明

每个量化后的 token `\hat{z}_i` 都要同时经过：

- 共享视觉解码器 `D_v`
- 具身特定动作解码器 `D_a`

形式上：

`\hat{f}_{t+k}^{(i)}=D_v(\hat{z}_i,f_t),\qquad \hat{a}_{t:t+k}^{(i)}=D_a(\hat{z}_i,s_t)`

总损失为：

`\mathcal{L}=\sum_{i\in\{v,a,m\}}\Big[\lambda_v\mathcal{L}_{cos}(\hat{f}_{t+k}^{(i)},f_{t+k})+\lambda_a\mathcal{L}_{act}(\hat{a}_{t:t+k}^{(i)},a_{t:t+k})\Big]+\mathcal{L}_{RQ}`

直白说，这个设计要求每一种 token 都要同时解释：

- 它导致了怎样的视觉变化
- 它对应了怎样的低层动作

于是有两个净化效应：

- 动作去重心化：动作表征不能只记住具身特有的关节细节，因为它还得解释视觉后果。
- 视觉去杂讯化：视觉表征不能只记住纹理、光照、背景，因为它还得重构动作。

作者把这个过程称为 visual anchoring。我认为这正是 UniT 最值得记住的思想：不是让视觉替代动作，而是让视觉给动作去偏。

### 4. VLA-UniT：先预测 UniT token，再生成具身特定动作

在 policy learning 中，作者把 UniT 接到 GR00T n1.5 框架上，并以 Qwen2.5-VL 作为视觉语言骨干。

VLA-UniT 的两步分解是：

1. VLM 先预测离散 UniT code
   - 目标代码由预训练 UniT tokenizer 从 `(o_t, o_{t+k}, a_{t:t+k}, s_t)` 编出
   - token loss 为
   - `\hat{p}_t=f_{\text{VLM}}(o_t,\ell,q_t),\qquad \mathcal{L}_{\text{token}}=\mathrm{CE}(\hat{p}_t,c_t)`

2. 再由轻量 flow-matching head 生成连续动作
   - `\mathcal{L}_{fm}=\mathbb{E}_{\tau,\epsilon}[\|V_\theta(A_t^\tau\mid x_t,\mathrm{Enc}(o_t),\tau)-(A_t-\epsilon)\|_2^2]`

最终：

`\mathcal{L}_{\text{VLA}}=\mathcal{L}_{\text{token}}+\lambda_{fm}\mathcal{L}_{fm}`

这背后的关键不是“多加一个 auxiliary loss”，而是让 VLM 的预测目标从高度异构的 raw action 变成跨具身共享的 intent token。作者在后文用 t-SNE 证明，这会反过来拉齐下游 VLA 的内部表示。

### 5. WM-UniT：世界模型用 UniT action feature 当统一条件

世界模型部分建立在 Cosmos Predict 2.5 上，但不再直接用 raw action 做条件，而是用动作分支编码器产生的 pre-quantization 特征：

`\tilde{z}^{a}_{t}=E_a(s_t,a_{t:t+k})`

训练目标写成：

`\mathcal{L}_{WM}=\mathbb{E}_{\tau,\epsilon}[\|V_\phi(X_t^\tau\mid o_t,\operatorname{MLP}(\tilde{z}^{a}_{t}),\tau)-(X_t-\epsilon)\|_2^2]`

作者特意解释了为什么 world model 不直接吃 fusion token：因为生成未来帧时，未来视觉本身并不在输入侧，所以部署时只能使用不泄漏未来观测的动作分支特征。

这一步很重要。它说明 UniT 不是只为 policy 设计的 tokenizer，而是真想成为 policy 与 world model 共同复用的中间接口。

## 实验结果

### 1. 表征对齐与抗噪声：先证明 unified language 真的存在

作者先做了 t-SNE：

- raw action 空间里，人类与 humanoid 明显分离
- UniT token embedding 中，两者高度重叠
- 这种重叠还进一步传导到 VLA hidden states 和 WM cross-attention context embeddings

抗噪上，作者给 EgoDex 动作注入高斯噪声，并比较重建退化。`σ=0.2` 时：

- FAST：退化 `10.7×`
- Action Tokenizer：退化 `2.7×`
- UniT：退化 `1.7×`

这说明 visual anchoring 不只是帮助跨具身对齐，也在做隐式去噪。

### 2. RoboCasa policy：全数据、少样本、人类共训三条线都占优

| 设置 | 指标 | 数值 |
|---|---|---:|
| RoboCasa 全数据 | VLA-UniT overall success | 66.7% |
| RoboCasa 全数据 | Pick & Place | 67.3% |
| RoboCasa 全数据 | Articulated | 64.7% |
| 对比基线 | FLARE overall | 55.0% |
| 对比基线 | GR00T-Qwen2.5 overall | 47.8% |
| RoboCasa 少样本 | VLA-UniT overall | 45.5% |

作者特别强调一个点：只用 10% 数据时，VLA-UniT 已经做到 45.5%，接近 GR00T baseline 在全数据下的 47.8%。也就是说，UniT 让样本效率接近提升到“少十倍数据还能摸到基线天花板”。

### 3. 人类数据共训：不只是 in-domain 提升，OOD 也一起上升

少样本 RoboCasa + EgoDex 共训后：

| 场景 | 无人类共训 | 加入人类共训 |
|---|---:|---:|
| In-domain average | 45.5% | 50.0% |
| Pick & Place | 41.7% | 49.4% |
| Unseen Appearance | 37.0% | 42.7% |
| Unseen Combinations | 40.7% | 43.0% |
| Unseen Object Types | 29.0% | 33.0% |
| OOD average | 34.7% | 38.5% |

这组结果说明 UniT 的价值不只是把 human data 当额外数据量，而是把 human data 变成了 robot 真能消费的结构化先验。

### 4. 真实机器人：最有说服力的是 pouring 与零样本 stacking

作者在 IRON-R01-1.11 humanoid 上做了两类真实任务与五类 OOD。

#### 4.1 In-domain

| 任务 | GR00T baseline | VLA-UniT（仅机器人数据） | VLA-UniT（加人类数据） |
|---|---:|---:|---:|
| Pick & Place | 30% | 70% | 78% |
| Pouring | 5% | 35% | 75% |

Pouring 的提升尤其大，因为这是更依赖双臂协同的任务，刚好能验证 human bimanual prior 是否真被迁移进来。

#### 4.2 OOD generalization

文中给出最醒目的几项是：

| OOD 维度 | 无人类共训 | 加入人类共训 |
|---|---:|---:|
| Geometry | 23.3% | 63.3% |
| Distractor | 26.7% | 60.0% |
| Combinational | 10% | 70% |

作者对 Target 与 Background 也报告了同向提升，但在正文里没有给出具体百分比，因此这里不擅自补数。

#### 4.3 Zero-shot task transfer

未见过的 stacking 任务上：

| 模型 | 成功率 |
|---|---:|
| GR00T baseline | 0% |
| VLA-UniT w/o Cross-Reconstruction | 0% |
| VLA-UniT w/o Human Data | 10% |
| VLA-UniT + Human Co-training | 60% |

这可能是全文最亮眼的结果之一。它说明 transfer 过来的不只是“抓放”模板，而是更高层的 stacking logic 与上半身协调模式。

### 5. 世界模型：WM-UniT 在 controllability 与跨具身迁移上都更强

#### 5.1 可控生成结果

| 数据集 | 方法 | PSNR↑ | SSIM↑ | LPIPS↓ | FVD↓ | EPE↓ |
|---|---|---:|---:|---:|---:|---:|
| DROID | Raw Action | 21.02 | 0.820 | 0.097 | 76.38 | 0.2662 |
| DROID | WM-Action | 20.86 | 0.819 | 0.102 | 80.30 | 0.2593 |
| DROID | WM-UniT | 21.32 | 0.823 | 0.095 | 76.44 | 0.2588 |
| EgoDex | Raw Action | 24.84 | 0.800 | 0.164 | 171.37 | 0.706 |
| EgoDex | WM-UniT | 28.06 | 0.858 | 0.086 | 130.87 | 0.519 |
| RoboCasa-GR1 | Raw Action | 13.45 | 0.590 | 0.259 | 237.13 | 0.558 |
| RoboCasa-GR1 | WM-UniT | 17.66 | 0.718 | 0.142 | 166.50 | 0.453 |

DROID 上提升不算夸张，但在人类+humanoid 混合训练场景中，WM-UniT 对 EgoDex 与 RoboCasa-GR1 都是全面改善。

#### 5.2 人类预训练对 humanoid WM 的迁移

| 配置 | PSNR↑ | SSIM↑ | LPIPS↓ | FVD↓ | EPE↓ |
|---|---:|---:|---:|---:|---:|
| WM-UniT w/o Human Pre-training | 16.34 | 0.678 | 0.168 | 180.51 | 0.478 |
| WM-UniT (Full) | 18.06 | 0.713 | 0.135 | 153.31 | 0.446 |

这意味着 world model 也能吃到 human prior，而不是只有 policy learning 受益。

#### 5.3 跨具身 conditioning 一致性

| 方向 | 方法 | Semantic↑ | Temporal↑ | Geometric↑ | Overall↑ |
|---|---|---:|---:|---:|---:|
| Robot-to-Human | Raw Action | 2.96 | 3.12 | 2.74 | 2.92 |
| Robot-to-Human | WM-UniT | 3.91 | 3.98 | 3.66 | 3.84 |
| Human-to-Robot | Raw Action | 2.98 | 3.16 | 2.72 | 2.95 |
| Human-to-Robot | WM-UniT | 3.28 | 3.43 | 3.09 | 3.27 |

作者用 Gemini-3-Pro 做 MLLM judge。虽然这不是最硬的物理指标，但它至少补上了“跨具身动作语义是否真的被保住”的量化证据。

### 6. Ablation：UniT 赢在“视觉+动作+双向对齐”三者缺一不可

| 变体 | 指标 | 数值 |
|---|---|---:|
| VLA-UniT | OOD average | 49.9% |
| VLA-Vision | OOD average | 45.2% |
| VLA-Action | OOD average | 42.1% |
| VLA-UniT w/o Cross-Recon | OOD average | 30.3% |
| VLA-UniT | In-domain Pick & Place | 66.8% |
| VLA-Villa | In-domain Pick & Place | 63.1% |

这张表把论文的论点压得很实：

- 只有 vision，没有精细 motor detail，不够。
- 只有 action，没有视觉锚点，跨具身分布偏移太大，也不够。
- 视觉+动作都给了，但不做 cross-reconstruction，还是不够。

## 复现评估

从复现角度看，这篇论文的优点和难点都很明显。

### 优点

1. 方法分层清楚
   - tokenizer、VLA、world model 是可分开实现和验证的。
2. 数学对象明确
   - 三分支编码、共享 RQ-VAE、双解码 cross-reconstruction、两类下游目标都写得比较完整。
3. ablation 足够关键
   - action-only、vision-only、w/o cross-recon、V2A 单向版本都做了，便于社区定位贡献来源。

### 难点

1. 训练链条很长
   - 先训 tokenizer，再训 VLA 或接 world model，工程开销不小。
2. 数据异构处理复杂
   - human/humanoid 动作需要统一 pad、具身特定 MLP、具身特定 action decoder。
3. 大模型依赖偏重
   - VLA-UniT 用的是 GR00T n1.5 + Qwen2.5-VL，WM-UniT 建在 Cosmos Predict 2.5 上，复现实门槛不低。
4. 真实世界结果门槛高
   - IRON-R01-1.11、32k proprietary robot trajectories 等外部条件，不是普通学术组能轻松重现。

我对复现性的判断是：

- 核心 tokenizer 思路：可复现。
- 同等规模真实机器人结果：较难复现。
- 最值得社区先复现的部分：RoboCasa few-shot + human co-training + tokenizer ablation。

## 批判性分析

### 1. 这篇论文最强的地方，是把“跨具身统一”从 action matching 改成 outcome grounding

这是它比很多 latent action 工作更深的一步。它不是只说“离散 token 更好学”，而是给出了一个跨具身合理性更强的锚点：视觉后果。

### 2. 但视觉锚点也有边界

论文最适合的任务类型，仍然是视觉可观测且目标后果清晰的 manipulation。若进入以下场景，visual anchoring 可能变弱：

- 高速接触动力学
- 力控主导任务
- 视觉几乎看不出差异、但接触力差异极大的任务
- 全身 locomotion 稳定性与平衡恢复

换句话说，UniT 更像“上半身操作统一语言”的强起点，而不是已经解决所有 humanoid control 的统一接口。

### 3. 世界模型部分很有前景，但目前仍偏“conditioning interface upgrade”

WM-UniT 的结果确实漂亮，尤其在人类+humanoid 混训上。但从这篇论文能证明的范围看，它主要证明了：

- UniT feature 比 raw action 更适合作为 world model 条件
- 跨具身条件迁移更稳

它还没有完全证明基于这套统一语言的长时规划、反事实搜索、policy-world-model 闭环优化已经成立。论文在结论里其实也只是把这当作未来方向。

### 4. 自动评审指标仍有争议

表 3 的 Gemini-3-Pro 评估能补足人类肉眼难以大规模打分的问题，但它仍然属于 model-as-judge。这里最稳的证据依旧是前面的 PSNR/SSIM/LPIPS/FVD/EPE 与真实机器人成功率。

## 对领域影响

UniT 对具身智能领域的影响，可能体现在三层。

### 第一层：human data 终于不再只是“弱监督视觉预训练材料”

过去很多工作用 human video 只是学视觉 backbone，真正动作层仍严重依赖机器人数据。UniT 把 human data 推进到了更靠近 control interface 的位置。

### 第二层：policy 与 world model 有机会共享中间语言

这是我觉得最重要的中期价值。很多 embodied 系统的问题，不是 policy 不强，也不是 world model 不强，而是两者根本不说同一种“动作语言”。UniT 至少给出了一种把两边接上同一接口的可行路径。

### 第三层：为 humanoid foundation model 打开了更现实的扩数据路线

真正稀缺的不是“再多收几千条机器人演示”，而是如何把海量人类行为资产转成机器人可用的物理先验。如果 UniT 这条路线继续成立，那么未来 humanoid foundation model 的主配方很可能变成：

- 大规模人类数据学 unified physical language
- 少量机器人数据做具身校准
- policy / world model / planning 共用同一 latent interface

如果是这样，UniT 的意义就不只是一个 tokenizer，而可能是 humanoid pretraining stack 的中间层雏形。
