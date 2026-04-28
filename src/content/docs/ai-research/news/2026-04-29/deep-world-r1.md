---
title: "World-R1 深读：用强化学习把视频基础模型从会画，推到更像会建世界"
description: "World-R1, text-to-video, reinforcement learning, 3D consistency, Flow-GRPO, camera control, world model, Wan 2.1"
---

# World-R1 深度解读

> 原文链接：https://arxiv.org/html/2604.24764
> arXiv 摘要页：https://arxiv.org/abs/2604.24764
> 项目页：https://aka.ms/world-r1
> 原文标题：World-R1: Reinforcing 3D Constraints for Text-to-Video Generation
> 作者：Weijie Wang、Xiaoxuan He、Youping Gu、Yifan Yang、Zeyu Zhang、Yefei He、Yanbo Ding、Xirui Hu、Donny Y. Chen、Zhiyuan He、Yuqing Yang、Bohan Zhuang
> 机构：Zhejiang University、Microsoft Research、Independent Researcher
> arXiv 提交日期：2026-04-27
> 论文落款日期：January 2026
> 核对说明：已通读 arXiv HTML 全文与附录，并据原文表格整理本文；未使用论文中未给出的数值。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | World-R1 不改视频基础模型架构，而是用 RL + 3D 基础模型反馈，把文本到视频生成对齐到更稳定的 3D 几何约束上。 |
| 解决的核心问题 | 现有视频基础模型画面好看，但一遇到大相机运动、长视角变化或复杂场景，容易出现物体变形、消失、墙体扭曲、空间关系漂移。 |
| 方法关键词 | Flow-GRPO、隐式相机条件注入、3D-aware reward、meta-view 评价、periodic decoupled training、纯文本 world-simulation 数据集。 |
| 最大特点 | 不引入推理时的 3D 控制模块，不要求 3D 监督数据，也不改 backbone 结构。 |
| 训练对象 | 基于 Wan2.1-T2V-1.3B 和 Wan2.1-T2V-14B，得到 World-R1-Small / World-R1-Large。 |
| 数据 | 约 3,000 条 Gemini 生成的纯文本 prompt；另有约 500 条高动态 prompt 用于动态保持阶段。 |
| 主要收益 | 在 3D 一致性指标上，相比 Wan2.1 基座显著提升，同时 VBench 通用视频质量不降反升。 |
| 最关键数字 | World-R1-Small 相比 Wan2.1-1.3B：PSNR 17.40 → 27.63；World-R1-Large 相比 Wan2.1-14B：19.76 → 27.67。 |
| 适合关注的人 | 做 world model、视频生成后训练、camera control、可控 T2V、3D-aware generative modeling 的研究者。 |
| Lighthouse 判断 | 这是篇很有代表性的“后训练对齐替代架构重做”论文：真正新意不在于多一个 reward，而在于把 3D 基础模型变成视频模型的 RL 教师。 |

## 核心 Insight

这篇论文的核心判断很清楚：

1. 现有视频基础模型并不是完全不懂 3D，而是缺少把潜在 3D 几何能力稳定外化出来的训练机制。
2. 与其重做一个重型 3D-aware 架构，不如把预训练视频模型当成一个已经有潜力、但没有被约束好的生成策略，再用强化学习把它往“几何一致”方向拉。
3. 3D 一致性不能只看正视角帧质量，必须通过“重建之后还能不能成立”来检验，所以他们采用了 analysis-by-synthesis：先从生成视频恢复 3DGS，再用新视角、重渲染和轨迹对齐来反推视频是否真的有一致世界结构。

换句话说，World-R1 不是“教模型生成更像 3D 的画面”，而是“用可重建、可换视角、可对齐轨迹的反馈，逼模型学会更接近世界模拟的生成习惯”。

## 这篇论文要回答什么问题

论文想回答的是一个越来越关键的问题：

“能不能在不牺牲开放域视频生成能力的前提下，把视频基础模型提升成更像 world model 的东西？”

作者给出的约束条件也很苛刻：

- 不改 backbone 架构；
- 不引入推理时重型 3D 模块；
- 不依赖昂贵 3D 资产监督；
- 仍然保留原始 foundation model 的视觉质量和生成开放性。

在这个前提下，World-R1 的答案是：可以，但要把优化目标从“像素看着像视频”改成“视频背后能否支撑一个稳定的 3D 世界”。

## 方法详解

### 1. 总体框架

World-R1 的整体流程可分成三段：

1. 从文本 prompt 中解析相机运动，构造相机轨迹；
2. 用 noise wrapping 把相机先验隐式注入扩散/flow 模型的初始噪声；
3. 生成视频后，通过 3D 基础模型和 VLM 计算复合奖励，再用 Flow-GRPO-Fast 做在线 RL 更新。

论文图 2 对应的是一个典型的 post-training alignment pipeline：

- 左边：文本 prompt → 相机轨迹 → 噪声注入；
- 中间：Wan 2.1 backbone 采样视频；
- 右边：3DGS 重建、meta-view 评估、重渲染一致性、轨迹一致性、通用美学质量 → 复合奖励。

### 2. 隐式相机条件：不加控制网络，直接改初始噪声

这是论文很重要的设计。

过去很多 camera control 方法要么训练额外网络编码位姿，要么在推理期加入显式控制模块。World-R1 选择更轻的路线：直接把相机轨迹信息写进 latent noise。

具体过程：

- 先用关键词检测函数扫描 prompt 里的相机指令；
- 支持的动作包括 `push_in`、`pull_out`、`move_left`、`move_right`、`orbit_left`、`orbit_right`、`pan_left`、`pan_right`、`pull_left`、`pull_right`、`fixed`；
- 把这些动作展开为一串相机外参矩阵；
- 再把 3D 轨迹投影成 2D 稠密光流；
- 最后用 Go-with-the-Flow 风格的 discrete noise transport，把噪声随光流搬运，但通过归一化保持标准正态分布性质。

这件事的意义是：

- 它不改模型结构；
- 但给生成过程加入了“运动先验”；
- 相机控制从硬控制，变成了生成起点上的 inductive bias。

### 3. 复合奖励：把“几何成立”拆成三个 3D 子项 + 一个通用质量项

论文的总奖励写成：

`R = R_3D + λ_gen * R_gen`

其中，`R_3D` 由三项组成：

`R_3D = S_meta + S_recon + S_traj`

#### 3.1 Meta-view score：看正视图之外的“破绽”

生成视频先被提升成 3D Gaussian Splatting 表示。然后作者从一个 novel meta-view 重新观察该场景，再用 Qwen3-VL 评估：

- 文本语义是否还成立；
- 几何结构是否可靠；
- 是否有在 canonical view 下看不见、但一换角度就暴露的“纸板布景效应”。

这一步特别重要，因为很多视频模型在单视图里看似正常，一旦换视角就露馅。

附录里说明，这个分数最后乘以 0.1，归一到 `[0,1]` 范围。

#### 3.2 Reconstruction score：能不能被稳定重建回来

作者把生成视频经 3DGS 重建后，再沿估计轨迹重渲染，和原始视频比 LPIPS，使用 `1 - LPIPS` 作为重建保真项。

它衡量的是：

- 视频是否真的自洽到足以支撑一个稳定 3D 表示；
- 而不是单帧看起来像、跨帧却无法形成一致结构。

#### 3.3 Trajectory score：镜头有没有按要求走

第三项奖励看用户指定轨迹 `E` 与从视频反推出的轨迹 `Ê` 是否一致。

- 平移用 L2 距离；
- 旋转用 geodesic distance；
- 再转成负指数形式的对齐分数。

这项约束非常关键，因为否则模型可能通过“尽量少动”去骗过 3D 一致性指标，形成 reward hacking。

#### 3.4 General reward：避免 3D 对齐把视频美学拖垮

除了 3D 奖励，作者还用 HPSv3 对前 K 帧做平均美学评分，形成 `R_gen`。

目的不是提升几何，而是给 RL 一个“不要为了几何而把视频质量练坏”的护栏。

### 4. 为什么要用 Flow-GRPO

论文建立在 Flow-GRPO 上。它的作用是把原本确定性的 flow matching 采样过程改写成带随机性的 SDE 过程，好让视频生成模型能够用 RL 在线优化。

关键点有两个：

- 采样过程要有探索性，否则无法做 advantage estimation；
- 更新又不能偏离原始参考策略太远，所以目标里带 KL 约束。

作者使用的是 Flow-GRPO-Fast，并采用 denoise reduction 来降低训练时步数，加速 rollout。

## 训练策略

### 1. 训练基座与算力

论文训练了两个模型：

- World-R1-Small：初始化自 Wan2.1-T2V-1.3B；
- World-R1-Large：初始化自 Wan2.1-T2V-14B。

训练配置：

- 分辨率：832 × 480；
- Small：48 张 NVIDIA H200；
- Large：96 张 NVIDIA H200；
- RL：48 个并行 group；
- GRPO group size：`G = 8`。

### 2. 纯文本 world-simulation 数据集

作者没有用大规模 3D 标注数据，而是自己构造了一个约 3,000 条的纯文本数据集。

数据特点：

- 由 Gemini-3 生成；
- 要求场景物理可解释、空间关系清晰；
- 同时指定相机动作；
- 覆盖 Natural Landscapes、Urban & Architecture、Micro World、Fantasy 等域；
- 覆盖单动作、复合动作、固定镜头等不同控制难度。

这套数据的设计逻辑很值得注意：作者故意把“学习 3D 约束”与“依赖既有视频分布偏见”分开。也就是说，他们希望模型面对的是文字描述的世界结构，而不是仅仅记住公开视频数据里常见镜头套路。

### 3. 周期性解耦训练：防止模型学成“僵硬静态世界”

如果只强化 3D 一致性，模型容易朝“越稳越好”的方向塌缩，导致：

- 非刚体运动被压制；
- 流体、火焰、人群等动态内容变弱；
- 模型可能更倾向于生成方便重建的近静态视频。

为此，作者引入 periodic decoupled training：

- 主阶段：在混合数据上，用完整奖励 `R_3D + λ_gen * R_gen` 训练；
- 每 100 steps：切入一个动态保持阶段；
- 此时关闭 `R_3D`，只在约 500 条高动态 prompt 上用 `R_gen` 继续优化。

作者把这看成一个 regularizer：

- 主阶段教几何；
- 周期性动态阶段保住自然运动能力。

## 与现有方法的关键区别

### 1. 与 3D-aware 架构方法的区别

一些已有方法会：

- 在推理时加入 3D 先验；
- 或直接改网络结构；
- 或用 image-to-video 管线做受限生成。

World-R1 的差异在于：

- 它是 post-training framework；
- 不要求推理阶段新增结构；
- 不依赖 3D supervision；
- 可直接套在已有 T2V foundation model 上。

### 2. 与 camera-control 方法的区别

像 GCD、Trajectory-Attention、DAS、ReCamMaster 一类方法，更强调“镜头能按轨迹走”。

World-R1 的重点不是单纯轨迹控制，而是：

- 镜头按要求走；
- 同时走动过程中物体和空间不能散；
- 还要保持通用视频质量。

所以它把 camera control 纳入 world consistency 的一个子目标，而不是最终目标本身。

### 3. 与传统监督微调的区别

它不是用目标视频做 imitation fine-tuning，而是在线采样、在线重建、在线打分、在线做 policy update。这里 3D foundation model 与 VLM 更像 reward teacher，而不是数据标签提供者。

## 实验结果

### 1. 通用视频质量：VBench 没有因为 3D 对齐而明显受损

原文 Table 1：

| 方法 | Aesthetic ↑ | Imaging ↑ | Motion Smoothness ↑ | Subject Consistency ↑ | Background Consistency ↑ |
|---|---:|---:|---:|---:|---:|
| CogVideoX-1.5-5B | 62.07 | 65.34 | 98.15 | 96.56 | 96.81 |
| Wan2.1-T2V-1.3B | 62.43 | 66.51 | 97.44 | 96.34 | 97.29 |
| GCD | 38.21 | 41.56 | 98.37 | 88.94 | 92.00 |
| Trajectory-Attention | 38.50 | 51.00 | 98.21 | 90.60 | 92.83 |
| DAS | 39.86 | 51.55 | 99.14 | 90.34 | 92.03 |
| ReCamMaster | 42.70 | 53.97 | 99.28 | 92.05 | 93.83 |
| World-R1-Small | 65.74 | 67.53 | 98.55 | 97.58 | 96.67 |

解读：

- World-R1-Small 在 Aesthetic、Imaging、Subject Consistency 上都优于基座 Wan2.1-1.3B；
- Background Consistency 略低于 Wan2.1-1.3B（96.67 vs 97.29）；
- 说明 RL 对齐不是简单拿画质换几何，整体通用视频能力仍然保持强势。

### 2. 3D 一致性：这是论文最强结果

原文 Table 2：

| 方法 | PSNR ↑ | SSIM ↑ | LPIPS ↓ |
|---|---:|---:|---:|
| CogVideoX-1.5-5B | 24.44 | 0.783 | 0.242 |
| Wan2.2-T2V-14B | 23.47 | 0.779 | 0.253 |
| Wan2.2-T2V-5B | 22.36 | 0.716 | 0.303 |
| Wan2.1-T2V-14B | 19.76 | 0.629 | 0.405 |
| Wan2.1-T2V-1.3B | 17.40 | 0.550 | 0.467 |
| World-R1-Small | 27.63 | 0.858 | 0.201 |
| World-R1-Large | 27.67 | 0.865 | 0.162 |

关键结论：

- World-R1-Small 相比 Wan2.1-1.3B，PSNR 提升 10.23 dB；
- World-R1-Large 相比 Wan2.1-14B，PSNR 提升 7.91 dB；
- LPIPS 也显著下降，说明并非只是在某一个单指标上取巧。

这说明他们的训练信号确实把视频从“帧能看”推向了“跨视角、跨时间更像一个可重建场景”。

### 3. 用户研究：人也更喜欢它

原文 Table A：

| 指标 | World-R1 对 Wan 2.1 的胜率 |
|---|---:|
| Geometric Consistency | 92% |
| Camera Control Accuracy | 76% |
| Overall Preference | 86% |

实验设置：

- 30 个复杂 prompt；
- 25 名参与者；
- 随机双盲并排比较。

这组结果很重要，因为它表明自动 3D 指标上的提升，不只是“重建系统更喜欢”，在人类主观判断里也成立。

### 4. 自动指标与人类感知的一致性验证

原文 Table B：

| 研究 | 参与者 | 视频对数 | Agreement ↑ |
|---|---:|---:|---:|
| 3D-consistency metric validation | 20 | 30 | 91.17% |

这能一定程度上回应“你们的 3D 指标会不会只是重建偏好”的质疑。

## 消融 / 可扩展性

### 1. 奖励组件消融

原文 Table I：

| Variant | PSNR ↑ | SSIM ↑ | LPIPS ↓ | VBench AVG ↑ |
|---|---:|---:|---:|---:|
| Full pipeline (World-R1-Small) | 27.63 | 0.858 | 0.201 | 85.21 |
| w/o S_meta | 26.91 | 0.841 | 0.218 | 83.67 |
| w/o S_recon | 25.14 | 0.798 | 0.271 | 84.35 |
| w/o S_traj | 26.27 | 0.829 | 0.237 | 84.53 |

结论很直接：

- `S_recon` 对几何一致性的贡献最大之一；
- `S_traj` 不只是控制项，也是在防止模型塌到静态解；
- `S_meta` 提供了视角外一致性的补充监督。

### 2. 训练与条件机制消融

原文 Table J：

| Variant | PSNR ↑ | SSIM ↑ | LPIPS ↓ | VBench AVG ↑ | S_recon ↑ | S_traj ↑ | S_meta ↑ | S_gen ↑ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Full | 27.63 | 0.858 | 0.201 | 85.21 | 0.342 | 0.296 | 0.307 | 0.37 |
| w/o noise wrapping | 24.46 | 0.745 | 0.298 | 76.39 | 0.312 | 0.213 | 0.275 | -0.42 |
| w/o periodic decoupled training | 27.89 | 0.898 | 0.192 | 82.64 | 0.348 | 0.310 | 0.298 | 0.18 |
| w/o 3D-aware reward | 18.93 | 0.502 | 0.496 | 84.96 | – | – | – | 0.33 |
| w/o general reward | 27.57 | 0.849 | 0.206 | 83.44 | 0.388 | 0.231 | 0.305 | – |

这里最值得注意的是：

- 去掉 periodic decoupled training 后，重建型指标甚至还能更高一点，但 VBench 从 85.21 掉到 82.64；
- 这正好支持作者论点：如果只追几何，模型会朝“更 rigid、更好重建”的方向偏，但动态自然性会受损；
- 去掉 noise wrapping 后几乎全线下滑，说明隐式相机注入不是可有可无的技巧，而是优化起点上的关键偏置。

### 3. 数据规模扩展

原文 Table E：

| 数据规模 | PSNR ↑ | SSIM ↑ | LPIPS ↓ | VBench AVG ↑ |
|---|---:|---:|---:|---:|
| 1K | 25.82 | 0.812 | 0.258 | 83.23 |
| 2K | 26.54 | 0.839 | 0.223 | 84.76 |
| 3K | 27.63 | 0.858 | 0.201 | 85.21 |

说明：

- 纯文本数据从 1K 到 3K 基本单调提升；
- 这个 post-training 框架对数据扩展是敏感的；
- 也意味着 prompt generation 本身可能是一个值得继续放大的杠杆。

### 4. 长视频泛化

原文 Table F：

| 方法 | PSNR ↑ | SSIM ↑ | LPIPS ↓ |
|---|---:|---:|---:|
| Wan2.1-T2V-14B | 18.32 | 0.558 | 0.534 |
| World-R1-Large | 26.32 | 0.828 | 0.257 |

作者只在短视频上训练，但在 121 帧长视频上仍然显著优于基座，说明学到的不是纯粹的短程 overfit。

### 5. 重建无关的多视图一致性验证

原文 Table D：

| 方法 | MVCS ↑ |
|---|---:|
| Wan2.1-T2V-1.3B | 0.974 |
| World-R1-Small | 0.989 |
| Wan2.1-T2V-14B | 0.963 |
| World-R1-Large | 0.993 |

这一步降低了“是不是因为同一个 3DGS 重建器给了自己人偏好分”的疑虑。

### 6. 场景复杂度分解

原文 Table G：

| 场景类型 | 占比 N | 方法 | PSNR ↑ | SSIM ↑ | LPIPS ↓ | MVCS ↑ |
|---|---:|---|---:|---:|---:|---:|
| Static Scene | 30.11% | Wan2.1-1.3B | 20.14 | 0.632 | 0.389 | 0.981 |
| Static Scene | 30.11% | World-R1-Small | 30.52 | 0.912 | 0.142 | 0.994 |
| Single-obj Dynamic | 29.03% | Wan2.1-1.3B | 17.86 | 0.563 | 0.452 | 0.976 |
| Single-obj Dynamic | 29.03% | World-R1-Small | 28.17 | 0.869 | 0.189 | 0.991 |
| Multi-obj Dynamic | 21.51% | Wan2.1-1.3B | 15.23 | 0.487 | 0.528 | 0.968 |
| Multi-obj Dynamic | 21.51% | World-R1-Small | 25.41 | 0.812 | 0.248 | 0.985 |
| Non-rigid Motion | 19.35% | Wan2.1-1.3B | 14.58 | 0.462 | 0.548 | 0.965 |
| Non-rigid Motion | 19.35% | World-R1-Small | 24.73 | 0.793 | 0.267 | 0.982 |
| Long-horizon Dynamics | 12.89% | Wan2.1-1.3B | 12.53 | 0.382 | 0.683 | 0.951 |
| Long-horizon Dynamics | 12.89% | World-R1-Small | 23.59 | 0.781 | 0.299 | 0.974 |

World-R1 在所有子类都提升，说明它不是只会做静态建筑场景。

### 7. 相机控制精度

原文 Table C：

| 方法 | RotErr ↓ | TransErr ↓ | CamMC ↓ |
|---|---:|---:|---:|
| ReCamMaster | 1.53 | 3.12 | 4.17 |
| TrajectoryCrafter | 3.08 | 7.46 | 10.22 |
| CamCloneMaster | 1.36 | 2.02 | 3.05 |
| Wan2.1-T2V-1.3B | 9.29 | 62.94 | 66.21 |
| Wan2.1-T2V-14B | 17.01 | 60.90 | 70.55 |
| World-R1-Small | 1.50 | 2.76 | 3.39 |
| World-R1-Large | 1.21 | 1.30 | 2.95 |

这很能说明 World-R1 的定位：它虽然不是专门的 camera-control 架构，却已经接近甚至达到专门方法的控制精度区间。

### 8. 与 3D-aware / camera-control 方法的综合对比

原文 Table H：

| 类型 | 方法 | PSNR ↑ | SSIM ↑ | LPIPS ↓ | MVCS ↑ | Aesthetic ↑ | BG Cons. ↑ | Subject Cons. ↑ | Motion Smooth. ↑ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 3D-Cond. | ViewCrafter | 23.15 | 0.724 | 0.291 | 0.979 | 55.52 | 92.09 | 94.25 | 97.86 |
| 3D-Cond. | Voyager | 21.38 | 0.678 | 0.334 | 0.975 | 49.80 | 92.31 | 91.55 | 99.39 |
| 3D-Cond. | FlashWorld | 22.46 | 0.702 | 0.312 | 0.977 | 53.72 | 91.88 | 94.44 | 98.81 |
| 3D-Cond. | VerseCrafter | 23.82 | 0.748 | 0.268 | 0.981 | 54.78 | 94.88 | 95.55 | 97.62 |
| Cam. Ctrl. | GCD | 18.26 | 0.582 | 0.438 | 0.966 | 38.21 | 92.00 | 88.94 | 98.37 |
| Cam. Ctrl. | Traj.-Attn. | 18.87 | 0.598 | 0.421 | 0.969 | 38.50 | 92.83 | 90.60 | 98.21 |
| Cam. Ctrl. | DAS | 19.42 | 0.618 | 0.398 | 0.971 | 39.86 | 92.03 | 90.34 | 99.14 |
| Cam. Ctrl. | ReCamMaster | 20.58 | 0.653 | 0.368 | 0.975 | 42.70 | 93.83 | 92.05 | 99.28 |
| Foundation | Wan2.1-1.3B | 17.40 | 0.550 | 0.467 | 0.974 | 62.43 | 97.29 | 96.34 | 97.44 |
| Ours | World-R1-Small | 27.63 | 0.858 | 0.201 | 0.989 | 65.74 | 96.67 | 97.58 | 98.55 |

这张表基本奠定了论文主张：不用改成 3D-aware 生成架构，靠 post-training RL 也可以把几何一致性拉到更强位置，同时保住基础模型的视频质量基线。

## 复现评估

从复现角度看，这篇论文“思路清晰，但工程门槛不低”。

### 复现优势

- 方法闭环完整：数据、条件注入、奖励、训练策略、指标都有说明；
- 使用的核心组件较明确：Wan 2.1、Depth Anything 3、Qwen3-VL、HPSv3、3DGS、Flow-GRPO-Fast；
- 附录把数据构造逻辑、相机动作 taxonomy、动态子集、用户实验都交代得比较详细。

### 复现难点

1. RL 训练成本很高
   - Small 需要 48 张 H200，Large 需要 96 张 H200。

2. Reward pipeline 很重
   - 每个 rollout 后还要做 3DGS 重建、meta-view 渲染、VLM 评估和轨迹估计。

3. 纯文本数据虽然规模不大，但质量很关键
   - 不是随便生成 3K prompt 就行，重点在 camera-scene matching 和几何结构设计。

4. 一些细节仍有实现自由度
   - 比如 reward 权重、轨迹参数化、3DGS 具体配置、meta-view prompt 模板等，论文没有全部展开成可直接运行的 recipe。

### 复现结论

如果研究团队具备较强视频 RL 与 3D 重建基础，World-R1 是“可以照着做研究复现”的；但如果资源有限，它更像一个高成本方向性成果，而不是低门槛 recipe。

## 批判性分析

### 1. 这篇论文最强的地方

最强点不是某一个指标，而是方法论上的转向：

- 它证明了 3D world consistency 可以通过 post-training alignment 学出来；
- 而不是只能靠架构设计或 3D 数据监督硬塞进去；
- 这给未来视频基础模型的“后训练世界化”打开了路径。

### 2. 奖励设计很聪明，但也带来教师偏置

World-R1 本质上是在把 3D foundation model 和 VLM 的偏好蒸馏进视频模型。

这意味着：

- 如果 3D 重建器在某些纹理、动态场景或透明/反射物体上有系统偏差；
- 如果 VLM 对 meta-view 的语义判断存在偏见；
- 那么这些偏差也可能被 RL 放大。

作者已经用 MVCS 和 metric validation user study 做了一定缓解，但并没有彻底解决“奖励教师自身并不完美”的问题。

### 3. 动态世界仍是最难点

论文已经意识到严格 3D 约束会压制动态性，所以专门加了 periodic decoupled training。但从表格也能看出：

- Non-rigid Motion 和 Long-horizon Dynamics 仍然是最难类别；
- 改善很明显，但仍远未到“真实物理模拟器”的程度。

所以它更准确的定位是“更几何一致的视频模型”，而不是成熟 world simulator。

### 4. 评测仍偏几何可重建性

虽然作者加入了 reconstruction-independent MVCS 和人类实验，但主评测核心仍建立在“能否通过 3DGS 重建”上。对于以下情况，现有指标未必完全覆盖：

- 高动态可变形对象；
- 拓扑变化；
- 复杂遮挡；
- 透明、反射、烟雾、火焰等难重建现象。

这意味着 World-R1 目前更像在推动“几何稳定世界”，还不是完整物理世界建模。

### 5. 但它已经足够重要

即使有这些限制，这篇论文依然很重要，因为它提出了一个清晰可扩展的研究方向：

“让视频模型通过 RL 去对齐外部世界模型教师。”

如果后续把：

- 更强的 4D / dynamics reward，
- 更鲁棒的重建器，
- 更长时程的轨迹反馈，
- 更低成本的 rollout 训练

叠加进去，那么这条路线很可能会成为 world model 后训练的一条主线。

## Lighthouse 结论

World-R1 的真正价值，不只是把 Wan 2.1 指标拉高，而是给出了一个很强的范式信号：

- 视频基础模型已经隐含一部分 3D 能力；
- 关键不是一定要重造架构，而是要找到能把这部分能力“训练出来”的奖励与优化路径；
- 3D foundation model、VLM 和 RL 的组合，可以作为把生成模型推向 world modeling 的桥梁。

如果你只看结果，它是一篇“几何一致性提升很大”的论文；
如果你看方法论，它更像是一篇“视频世界模型后训练路线图”。