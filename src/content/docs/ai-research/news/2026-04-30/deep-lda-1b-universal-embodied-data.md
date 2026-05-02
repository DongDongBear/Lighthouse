---
title: "LDA-1B 深度解读：把机器人基础模型从“只学专家动作”，推进到“分角色吞下 3 万小时具身数据”"
description: "LDA-1B, EI-30k, universal embodied data ingestion, latent dynamics action model, MM-DiT, RoboCasa-GR1, π0.5"
---

# LDA-1B 深度解读

> 原文链接：https://arxiv.org/abs/2602.12215
> 项目页面：https://pku-epic.github.io/LDA/
> 论文标题：LDA-1B: Scaling Latent Dynamics Action Model via Universal Embodied Data Ingestion
> 来源：Peking University / Galbot / CASIA / BAAI / Tsinghua / NVIDIA 等
> 核对说明：已通读落库保存的论文全文与项目页；本文只引用原文明确给出的数字与结论，不补写作者未公开报告的数据。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | LDA-1B 的核心不是再做一个更大的 BC 机器人策略，而是把“高质量动作数据学 policy、低质量轨迹学 dynamics、无动作人类视频学 visual forecasting”三件事放进一个统一 latent world model 里。 |
| 大白话版 | 以前很多机器人基础模型只爱“干净专家演示”，脏一点、弱一点、没动作标签的数据基本浪费。LDA-1B 的思路是别浪费：不同质量的数据干不同活，让模型先学世界怎么变，再学动作怎么出。 |
| 最关键数据资产 | EI-30k，总量超过 30k 小时，包含 8.03k 小时真实机器人、8.6k 小时仿真机器人、7.2k 小时带动作人类演示、10k 小时无人类动作标注视频。 |
| 最关键训练数字 | 48 张 NVIDIA H800，训练 400k iterations，总计算成本 4608 GPU hours。 |
| 最重要实验结论 | 论文报告 LDA-1B 相比 π0.5 在 contact-rich、dexterous、long-horizon 任务上最高分别提升 +21% / +48% / +23%；混合质量微调再带来 +10%。 |
| 模拟基准代表结果 | RoboCasa-GR1 上，GR00T-N1.6 为 47.6%，GR00T-EI10k 为 51.3%，LDA-1B 为 55.4%。 |
| 这篇论文真正的新东西 | 不是单纯“更多数据”或“更大模型”，而是把异构具身数据按监督质量分工，并把预测目标从像素空间换到 DINO latent 空间。 |
| 评级 | A — 这篇工作把“机器人基础模型怎么真正吃下混合质量数据”讲得非常完整，而且实验上给出了足够硬的支撑。 |

## 核心 Insight

LDA-1B 最值得记住的 insight 是：机器人基础模型的瓶颈，不只是数据不够，而是数据使用方式太粗暴。

过去很多路线默认“高质量专家动作 = 有用数据；低质量轨迹或无动作视频 = 噪声”。所以主流做法还是围着 behavior cloning 打转：把专家动作当唯一目标，其他数据最多做点弱监督或干脆扔掉。论文认为这会浪费大量真正可迁移的知识，尤其是 interaction dynamics，也就是“动作会怎样改变世界”的知识。

LDA-1B 的答案是把异构数据重新分工：

- 高质量机器人/人类动作轨迹，同时训练 policy 和 dynamics；
- 低质量或次优轨迹，不强行拿来模仿动作，而是主要训练 dynamics 和 visual forecasting；
- 没有动作标签的人类视频，则拿来监督 instruction-conditioned visual forecasting。

这一步很关键，因为它把“数据质量不齐”从训练障碍，改成了训练资源。模型不再要求所有数据都长得像专家示范，而是允许每类数据只在自己可靠的监督维度上发挥价值。

再往下一层看，作者还做了第二个重要决定：未来状态不在像素空间预测，而在结构化 DINO latent 空间里预测。这样模型学的是语义和交互变化，而不是背景纹理、光照和外观细节。对于想扩展到 1B 级别、吃下 30k+ 小时异构数据的机器人模型来说，这个选择非常重要。

## 方法详解

### 1. 总体框架：一个统一模型，同时学动作、动力学和视觉前瞻

论文从 Unified World Model 出发，把机器人学习统一成四个目标：

1. Policy：根据当前观测预测未来 action chunk；
2. Forward Dynamics：给定当前观测和动作，预测未来状态；
3. Inverse Dynamics：给定状态变化，反推动作；
4. Visual Forecasting：只根据当前观测与指令，预测未来视觉状态。

LDA-1B 的总体形式不是“一个 policy + 若干辅助 loss”，而是一个统一扩散式模型，在同一套 backbone 里联合建模动作流与未来视觉 latent。

这意味着作者不是把 dynamics 当配角，而是把它提升为与 policy 并列的核心预训练目标。对机器人来说，这种设计的含义很直接：模型不仅要会输出动作，还要内部形成“这个动作会把环境推向哪里”的表征。

### 2. Universal Embodied Data Ingestion：按数据质量分角色，而不是一锅炖

这是整篇论文最核心的方法贡献。

作者把 heterogeneous embodied data 分成不同角色：

- 高质量 robot/human demonstrations：训练 policy、forward dynamics、inverse dynamics、visual forecasting；
- 低质量轨迹：不拿来强行学习最优动作，主要用于 dynamics 和 visual forecasting；
- 无动作的人类 manipulation videos：只用于 visual forecasting。

为了让一个模型支持不同监督配置，论文引入了：

- 4 个 learnable task embeddings，对应 policy / forward / inverse / visual forecasting；
- 2 个 learnable register tokens，给缺失模态占位。

例如只做 policy 时，未来视觉输入缺失，就用 visual register token 占位；只做 visual forecasting 时，动作输入缺失，就用 action register token 占位。这样不同任务不需要改网络结构，只需要改 task condition。

这套设计的意义是：作者把“数据不完整”视为统一建模问题，而不是数据清洗失败。只要某类数据在某个目标上可靠，它就能被纳入训练。

### 3. 预测目标表示：为什么一定要放弃 pixel-space，转向 DINO latent

论文非常明确地反对在像素空间学未来状态，原因也很实在：

- 像素目标会把大量训练预算浪费在外观重建；
- 光照、背景、纹理、视角变化会干扰 dynamics 学习；
- 大规模异构数据下，这种干扰会更严重。

所以 LDA-1B 用预训练 DINO encoder 抽取未来视觉 latent，再在这个空间中做预测。作者认为这种 latent 更强调高层语义和空间结构，更适合学习 interaction-relevant dynamics。

动作空间也被统一了。论文把不同 embodiment 的动作统一成 hand-centric end-effector motion：

- 并爪夹爪用 wrist pose 增量 + gripper width；
- 灵巧手用 wrist 坐标系下的 finger keypoints / hand configuration。

同时，视觉流与动作流采用不同采样频率：

- visual observations：3 Hz；
- actions：10 Hz。

这个 mixed-frequency 设计本质上是在承认视觉变化比控制信号慢，没必要每一帧都高频预测视觉，但动作必须保留足够时间分辨率。

### 4. 架构：MM-DiT 负责把异步视觉流和动作流放进同一 Transformer

LDA-1B 采用的是 Multi-Modal Diffusion Transformer，论文简称 MM-DiT。

它的关键点不是“用了 Transformer”这么简单，而是把 action tokens 和 future visual tokens 当成两个并行时间流处理：

- 两个模态先经过各自线性投影；
- 在共享 self-attention 里交互；
- 但保留各自 modality-specific QKV projections 与 FFNs；
- 语言和当前观测由预训练 VLM 编码后，通过 cross-attention 提供条件信息；
- diffusion timestep 和 task embedding 通过 AdaLN 注入每层。

从工程角度看，这个设计在“共享跨模态信息”与“保留模态归纳偏置”之间做了折中。作者的实验也说明，简单把 UWM 放大到 1B 或只换 backbone，收益都有限；但 LDA 的 latent 目标 + MM-DiT 组合才真正把性能拉起来。

### 5. EI-30k：论文不是只有模型，也把数据底座一起做了

LDA-1B 成立的前提，是 EI-30k 这套统一具身数据集。

论文给出的 EI-30k 组成是：

- 8.03k 小时真实机器人数据；
- 8.6k 小时仿真机器人数据；
- 7.2k 小时带动作的人类演示；
- 10k 小时无动作人类视频。

合计超过 30k 小时。

作者还强调了三件配套工作：

1. 全部转成统一格式 LeRobot；
2. 对不同人手/机械臂/夹爪坐标系做手工对齐，统一成 end-effector-centric representation；
3. 保留质量标签，而不是激进过滤掉低质量轨迹。

这很重要。很多机器人论文的“更多数据”其实只是把高质量子集继续堆大；LDA-1B 更像是在做一套真正能吞下 heterogeneous supervision 的数据操作系统。

### 6. 训练与后训练：大规模预训练，轻量化混合质量微调

论文给出的预训练配置很清楚：

- 48 张 NVIDIA H800；
- 400k iterations；
- 总成本 4608 GPU hours。

训练时冻结了预训练 VLM 和 DINO encoder，只更新 MM-DiT 与动作编码/解码模块。这样做的目的是保留基础视觉与跨模态能力，把主要学习压力集中在 latent dynamics 建模上。

后训练阶段则继续沿用 mixed-quality data regime。作者强调，现实世界部署并不要求全部是精心筛过的专家数据，LDA-1B 可以直接利用自然采集到的混合质量 teleoperation data，这也是它在 data-efficient finetuning 上能领先的重要原因。

## 实验结果

### 实验结果表格

| 实验设置 | 对比项 | 论文报告结果 | 我们的解读 |
|---|---|---:|---|
| RoboCasa-GR1 模拟基准 | GR00T-N1.6 | 47.6% | 原始 3B baseline 已不弱，但仍低于 LDA。 |
| RoboCasa-GR1 模拟基准 | GR00T-EI10k | 51.3% | 说明更好的高质量预训练数据本身就有帮助。 |
| RoboCasa-GR1 模拟基准 | LDA-1B | 55.4% | 在同类设定下最好，说明“联合学 dynamics + policy”比单纯吃高质量数据更进一步。 |
| RoboCasa-GR1 消融 | UWM | 14.3% | 直接像素/纠缠式 latent world model 很难扩到 foundation 级。 |
| RoboCasa-GR1 消融 | UWM-XL | 19.3% | 仅放大参数帮助有限。 |
| RoboCasa-GR1 消融 | UWM + MM-DiT | 20.0% | 只换 backbone 也不能解决根问题。 |
| RoboCasa-GR1 消融 | LDA (DiT) | 48.9% | 没有 MM-DiT 会明显掉点，证明多模态扩散骨干有效。 |
| 表征消融 | 20.0% → 55.4% | 使用 DINO latent 替代 VAE latent 后显著提升 | 真正的决定性变量之一是 latent space 是否结构化。 |
| 真实世界分类结果 | 相比 π0.5 | contact-rich 最高 +21% | 复杂接触任务最受益于 dynamics 建模。 |
| 真实世界分类结果 | 相比 π0.5 | dexterous 最高 +48% | 大规模人类数据对灵巧手先验很关键。 |
| 真实世界分类结果 | 相比 π0.5 | long-horizon 最高 +23% | 长时序误差累积，是 BC 路线最容易失守的地方。 |
| 混合质量微调 | LDA-1B | 加入低质量轨迹后 +10% | 低质量数据不再只是噪声，而能成为有效监督。 |
| 泛化测试 | LDA-1B | 未见物体/背景/OOD 位置下保持 60.0% | 说明 latent dynamics 预训练确实提升了鲁棒泛化。 |
| 长时任务案例 | Throw Rubbish | LDA 35.0%，两条 baseline 0.0% | 长链路、多阶段任务最能体现 world model 的价值。 |
| 灵巧手案例 | Pull Nail | LDA 80%，GR00T 40%，π0.5 0% | 对力方向与稳定接触的建模明显更强。 |
| 高 DoF 灵巧手案例 | Flip Bread | LDA 90%，GR00T 10%，π0.5 10% | 在高维控制和连续接触推理上优势非常大。 |

### 怎么看这些结果

先看 RoboCasa-GR1。47.6% → 51.3% → 55.4% 这一串结果很有信息量：

- 从 GR00T 到 GR00T-EI10k，说明更好的具身预训练数据能提升策略；
- 从 GR00T-EI10k 到 LDA-1B，说明提升不只来自“数据更大”，还来自“训练目标更对”。

再看消融。UWM 从 14.3% 到 19.3% 再到 20.0%，几乎说明只靠把旧 world model 做大、换个 Transformer，不足以解决扩展问题；而 LDA 一旦换成 DINO latent，并配套 MM-DiT，性能直接到 55.4%。这基本就是作者整篇方法论的 strongest evidence。

真实世界结果更能体现它为什么不是“又一个模拟器论文”。作者没有只强调平均分，而是挑了最难的几类任务：

- contact-rich 任务最高比 π0.5 多 21%；
- dexterous 任务最高多 48%；
- long-horizon 任务最高多 23%；
- 混合质量微调还能再拿到 +10%。

这些数字背后其实都指向同一个命题：如果模型内部没有足够好的 action-conditioned dynamics 表征，它在接触、灵巧操作和长时链路任务上就很容易崩。

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐⭐⭐ | 论文公开了 EI-30k 的构成与项目页，但完整 30k+ 小时数据聚合、清洗、质量标注与坐标对齐成本极高。 |
| 代码可得性 | ⭐⭐⭐ | 项目页公开，论文描述较完整，但完整训练管线、数据处理细节和大规模调度并不等于低门槛可复现。 |
| 算力需求 | ⭐⭐ | 48 张 H800、400k iterations、4608 GPU hours，对多数研究组都不算便宜。 |
| 工程复杂度 | ⭐⭐ | 数据统一、坐标对齐、混合监督、多任务扩散训练都很重，工程门槛高。 |
| 预期收益 | ⭐⭐⭐⭐⭐ | 对想做机器人基础模型的人来说，这篇论文提供了非常清晰的下一代训练范式。 |

## 批判性分析

### 论文承认与隐含局限

1. 视觉表示依赖固定 DINO feature。
   论文结论部分明确承认，固定的 DINO 视觉特征可能限制新视角和更多模态下的泛化。也就是说，它现在的优势建立在“先用一个很强的 frozen visual prior，再学 latent dynamics”上，但视觉表征本身还不是 jointly optimized 的。

2. 主要视觉输入还是 egocentric RGB。
   这让结果更接近现实 humanoid 视角，但也意味着多视角、触觉、力觉等多模态信号还没有真正纳入统一建模。

3. 方法很强，但代价不低。
   论文强调数据利用效率，尤其是 finetuning 阶段；但从预训练端看，EI-30k 的清洗、标注、坐标对齐和质量标注本身就是极高成本工程。

### 我们的独立观察

- LDA-1B 最有价值的地方，不是“world model for robotics”这句口号，而是它终于把 world model 为什么能吃杂数据、怎么吃杂数据讲清楚了。
- 机器人基础模型过去常见的矛盾是：想扩数据规模，就会牺牲动作监督质量；想保动作监督质量，就很难扩规模。LDA-1B 的 role-aware ingestion 等于提供了第三条路。
- 这篇论文也说明，未来机器人 foundation model 的竞争，未必只是“谁的 policy loss 更强”，而会越来越变成“谁能更便宜地提炼 heterogeneous embodied data 里的 dynamics knowledge”。

## 对领域的影响

LDA-1B 很可能会影响未来机器人基础模型的三个方向。

第一，数据观会变。之后大家可能不会再把低质量轨迹和无动作视频简单视为垃圾数据，而会先问：它们能不能在 dynamics、forecasting 或 representation learning 上发挥作用。

第二，表征观会变。论文已经很清楚地给出一个信号：在 foundation 级机器人模型里，未来状态预测如果还强依赖 pixel/VAE latent，很可能会在扩展性上吃亏；结构化语义 latent 会更重要。

第三，world model 会从“辅助模块”升级为“训练主线”。LDA-1B 的结果表明，world model 不是为了好看的视频预测，而是为了更强的 contact reasoning、dexterous control 和 long-horizon robustness。如果后续工作继续沿这个方向推进，机器人基础模型和视频生成/latent dynamics 建模之间的边界会越来越模糊。