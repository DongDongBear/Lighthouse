---
title: "深度解读 | WorldMark：把交互式视频世界模型第一次放到同一条跑道上"
description: "WorldMark 统一动作接口、500 个标准化测试案例、8 项评测指标，系统比较第一人称与第三人称交互式 I2V 世界模型。"
---

> 2026-04-26 · 深度解读 · 编辑：Lighthouse
>
> 已核验原始信源：WorldMark 论文摘录

## 原始标题

WorldMark: A Unified Benchmark Suite for Interactive Video World Models

## 原文链接

- arXiv：https://arxiv.org/abs/2604.21686
- 项目页：https://alaya-studio.github.io/WorldMark/
- 代码 / Arena：https://warena.ai/

## 作者机构日期

- 机构：Alaya Studio、Shanda AI Research Tokyo、The University of Tokyo、Shanghai Innovation Institute
- 日期：源文本未给出明确发布日期
- 通讯信息：源文本脚注给出对应作者邮箱，但未给出完整作者名单

## 速查卡

| 维度 | 结论 |
|---|---|
| 论文要解决的问题 | 交互式世界模型各自用私有场景、私有轨迹、私有动作接口评测，导致跨模型结果不可比。 |
| 核心方案 | 用统一 WASD+L/R 动作词表、统一图像-动作测试集、统一评测流程，把 6 个模型放到同一标准条件下比较。 |
| 数据规模 | 50 张参考图像，扩展为第一人称/第三人称共 100 张测试图；每张图配 5 条上下文合理动作序列，总计约 500 个评测案例。 |
| 难度设计 | Easy 20 s 单段轨迹，Medium 40 s 双段轨迹，Hard 60 s 三段轨迹。 |
| 评测维度 | 3 大类 8 指标：Visual Quality 2 项、Control Alignment 2 项、World Consistency 4 项。 |
| 关键发现 1 | 视觉质量与世界一致性基本不相关：YUME 1.5 画面最好，但长时一致性不强；Genie 3 一致性最好，但画面 fidelity 仅中等。 |
| 关键发现 2 | 第三人称是明显难点，部分模型控制精度显著下降。 |
| 关键发现 3 | Open-Oasis 在真实/风格化非 Minecraft 场景中几乎全线落后，说明域内训练不等于通用迁移。 |

## 核心 Insight

WorldMark 最重要的贡献，不是又造了一套新指标，而是把“可比性”本身当成基准设计的第一原则。

论文明确指出，当前世界模型评测真正缺的不是指标，而是标准化测试条件：同样的场景、同样的动作序列、同样的语义控制。如果每个模型都在自己的私有 benchmark 上展示结果，那么哪怕都报告轨迹误差、审美分数或 VLM 判断，这些数字也无法横向比较。

因此，WorldMark 的价值在于先统一输入，再讨论输出。它用一个共享动作语义层，把 caption prompt、6-DoF pose、gamepad、action function、25 维动作向量这些异构控制接口，压到同一套 WASD+L/R 交互语义上。这样一来，模型差异终于可以被解释为“模型能力差异”，而不是“测试条件差异”。

## 方法详解

### 1. Benchmark 设计：不是堆数量，而是把变量锁死

WorldMark 由五部分组成：

1. Evaluation Dimension Suite：8 个指标，覆盖 Visual Quality、Control Alignment、World Consistency。
2. Image Suite：50 张参考图像，扩展为 100 张测试图像。
3. Action Suite：15 条标准动作轨迹。
4. Unified Action Interface：把统一动作映射到不同模型原生接口。
5. Evaluation Workflow：从图像选择、动作映射、视频生成到指标评估的完整流程。

论文的设计重点很清楚：不是追求无限大的数据集，而是在高成本交互式生成条件下，构造一个可复用、可扩展、且跨模型公平的最小充分集合。

### 2. 图像与视角设计：第一人称 + 第三人称一起测

论文从 WorldScore 数据集整理出 50 张参考图像，去重后保留视觉多样性；再用 Nano-Banana-2 为每张图合成一个第三人称版本，因此得到：

- 50 张原始第一人称图像
- 50 张对应第三人称图像
- 总计 100 张测试图像

这些图像覆盖：

- 场景类别：Nature、City、Indoor
- 风格：Real、Stylized
- 视角：First-person、Third-person

这里最值得注意的是第三人称设计。很多世界模型论文默认第一人称，因为更接近 egocentric camera；但实际开放世界交互里，第三人称常常更难，因为模型不仅要控制相机，还要稳定角色实体与背景关系。WorldMark 把这个难点显式做成 benchmark split，因此能直接暴露模型的视角泛化弱点。

### 3. 动作设计：15 条轨迹、3 个难度层级

Action Suite 共 15 条标准动作序列，使用统一词表：

- 平移：W / A / S / D
- 偏航旋转：L / R

难度分为三层：

- Easy：20 s，单段轨迹
- Medium：40 s，双段组合
- Hard：60 s，三段复杂轨迹

覆盖的动作包括：

- 单向平移
- 单向旋转
- 平移+旋转组合轨迹
- 循环或重复轨迹
- 360° 旋转与 patrol route

并不是所有动作都强行施加到每张图上。论文先让 VLM 基于图像语境筛掉不合理动作，例如狭窄室内空间不适合长时间横移。这个设计的好处是：既保留标准化，又避免 benchmark 因明显不合理动作而失真。

### 4. Unified Action Interface：这才是 WorldMark 的真正“基础设施层”

WorldMark 把统一动作表示定义为 6 个离散原语：

- forward (W)
- backward (S)
- strafe-left (A)
- strafe-right (D)
- yaw-left (L)
- yaw-right (R)

每个动作带 duration，然后由 adapter 翻译到各模型原生格式：

| 模型 | 原生格式 | 映射策略 |
|---|---|---|
| YUME 1.5 | Caption prompts | 在文本里嵌入方向关键词 |
| HY-World 1.5 | 6-DoF pose params | latent timescale matching |
| HY-GameCraft | 6-DoF pose params | Pose → Plücker ray embeddings |
| Genie 3 | Gamepad controls | 方向按键映射 |
| Matrix-Game 2.0 | Action functions | 调用对应 action API |
| Open-Oasis | 25-dim action vectors | 设置对应运动维度 |

论文还特别强调：不同模型的步长、角速度并不一致，所以 adapter 不是机械翻译，而是做 per-model 校准，让“语义等价”尽可能接近“物理等价”。这点很关键，因为如果不校准，所谓统一接口依然可能暗含不同的运动强度偏置。

### 5. 8 个评测指标：从画面、控制到世界记忆三层拆开

WorldMark 的 8 项指标如下：

| 类别 | 指标 |
|---|---|
| Visual Quality | Aesthetic Quality、Imaging Quality |
| Control Alignment | Translation Error、Rotation Error |
| World Consistency | Reprojection Error、State Consistency、Content Consistency、Style Consistency |

其中最关键的几个公式，论文原样给出如下。

平移误差：

e_t = ‖t_gt - s t‖_2

其中 t_gt 与 t ∈ R^3 分别是真值与估计相机位置，s 为最小二乘尺度因子。

旋转误差：

e_r = arccos((tr(R_gt R^T) - 1) / 2) · 180 / π

其中 R_gt, R ∈ SO(3) 为真值与估计旋转矩阵。

重投影误差：

e_reproj = (1 / |V|) Σ_(i,j)∈V ‖p*_{ij} - Π(P_{ij})‖_2

其中 V 是共视像素对集合，p*_{ij} 是观测 2D 坐标，P_{ij} 是重建 3D 点，Π(·) 是相机投影。

这套设计体现了一个很成熟的分层思路：

- 画面是否好看，不等于动作是否听话；
- 动作是否听话，不等于世界是否长期稳定；
- 长时世界一致性，不能只看几何，也要看对象状态、内容是否突然冒出/消失、风格是否漂移。

## 实验结果

### 1. 测试设置

论文评测 6 个交互式 I2V 世界模型：

- YUME 1.5
- Matrix-Game 2.0
- HY-World 1.5
- HY-GameCraft
- Open-Oasis
- Genie 3

其中第一人称测试覆盖全部 6 个模型；第三人称测试只评测原生支持第三人称的 3 个模型：

- Matrix-Game 2.0
- HY-World 1.5
- Genie 3

### 2. 第一人称 Real：最“好看”的不一定最“稳”

| 指标 | YUME 1.5 | Matrix-Game 2.0 | HY-World 1.5 | HY-Game | Oasis | Genie 3 |
|---|---:|---:|---:|---:|---:|---:|
| Aesthetic Quality ↑ | 56.94 | 49.40 | 54.79 | 46.59 | 29.31 | 45.58 |
| Imaging Quality ↑ | 74.36 | 68.11 | 69.37 | 49.31 | 28.08 | 64.14 |
| Translation Error ↓ | 0.199 | 0.222 | 0.191 | 0.159 | 0.376 | 0.498 |
| Rotation Error ↓ | 2.107 | 1.324 | 2.079 | 6.019 | 4.892 | 4.247 |
| Reprojection Error ↓ | 0.549 | 0.688 | 0.702 | 0.447 | 1.938 | 0.441 |
| State Consistency ↑ | 5.344 | 4.151 | 5.913 | 4.073 | 2.585 | 6.416 |
| Content Consistency ↑ | 3.820 | 7.415 | 6.352 | 5.814 | 3.748 | 6.914 |
| Style Consistency ↑ | 7.119 | 3.181 | 5.142 | 3.726 | 1.797 | 8.158 |

解读：

- YUME 1.5 在审美与成像质量上第一，但并没有拿下一致性最优。
- HY-Game 的 Translation Error 最低，为 0.159，说明它最“听动作”；但视觉质量很弱。
- Genie 3 在 Reprojection Error、State Consistency、Style Consistency 上都很强，说明它在维持长时世界结构方面最成熟。

### 3. 第一人称 Stylized：风格化场景进一步拉开一致性差距

| 指标 | YUME 1.5 | Matrix-Game 2.0 | HY-World 1.5 | HY-Game | Oasis | Genie 3 |
|---|---:|---:|---:|---:|---:|---:|
| Aesthetic Quality ↑ | 57.03 | 47.74 | 58.50 | 44.02 | 30.84 | 46.84 |
| Imaging Quality ↑ | 69.15 | 64.24 | 64.78 | 40.91 | 28.44 | 53.27 |
| Translation Error ↓ | 0.223 | 0.182 | 0.244 | 0.116 | 0.350 | 0.261 |
| Rotation Error ↓ | 2.732 | 1.561 | 4.316 | 0.932 | 3.808 | 2.835 |
| Reprojection Error ↓ | 0.638 | 0.672 | 0.638 | 0.640 | 1.877 | 0.256 |
| State Consistency ↑ | 5.891 | 2.873 | 6.408 | 4.782 | 3.523 | 6.835 |
| Content Consistency ↑ | 5.362 | 6.457 | 7.159 | 5.196 | 3.114 | 7.306 |
| Style Consistency ↑ | 4.216 | 4.934 | 6.817 | 4.051 | 2.435 | 7.523 |

解读：

- HY-World 1.5 在风格化场景拿到最高 Aesthetic Quality 58.50。
- HY-Game 在 stylized 里控制最强，Translation Error 0.116、Rotation Error 0.932。
- 但 Genie 3 以 Reprojection Error 0.256、State 6.835、Content 7.306、Style 7.523 统治一致性指标。

### 4. 第三人称：真正暴露模型世界建模短板

| 指标 | Real Matrix-Game | Real HY-World | Real Genie 3 | Stylized Matrix-Game | Stylized HY-World | Stylized Genie 3 |
|---|---:|---:|---:|---:|---:|---:|
| Aesthetic Quality ↑ | 52.78 | 57.69 | 51.04 | 51.60 | 60.57 | 53.76 |
| Imaging Quality ↑ | 67.26 | 70.76 | 60.20 | 65.24 | 66.45 | 63.98 |
| Translation Error ↓ | 0.284 | 0.206 | 0.212 | 0.230 | 0.220 | 0.129 |
| Rotation Error ↓ | 27.606 | 2.137 | 14.905 | 9.211 | 5.285 | 8.823 |
| Reprojection Error ↓ | 0.814 | 0.640 | 0.584 | 0.744 | 0.713 | 1.148 |
| State Consistency ↑ | 5.136 | 6.628 | 7.082 | 3.625 | 5.274 | 7.565 |
| Content Consistency ↑ | 3.405 | 5.707 | 7.424 | 2.083 | 5.147 | 7.109 |
| Style Consistency ↑ | 1.659 | 4.491 | 8.247 | 2.942 | 7.236 | 8.541 |

这里最有代表性的数字是 Matrix-Game 2.0 的 Rotation Error：

- 第一人称 Real：1.324
- 第三人称 Real：27.606

论文据此总结，切换到第三人称会让部分模型的旋转控制误差放大近一个数量级，甚至对 Matrix-Game 2.0 约为 ∼20×。这说明第三人称不是“第一人称任务的轻微变体”，而是一个显著更难的控制与一致性问题。

### 5. 人类偏好一致性验证

作者还做了 20 名志愿者、50 组第一人称视频的人类排序实验。自动评测与人工排序的 Spearman 相关达到 ρ > 0.9，说明 WorldMark 的自动指标组合与人类感知有较强一致性。

## 复现评估

从复现角度看，WorldMark 的优势和门槛同样明显。

优势：

1. 标准输入是可复用的。图像、动作序列、adapter 设计一旦公开，后续模型可以直接接入。
2. 指标体系是模块化的。论文明确允许研究者在相同输入上替换自定义 metric。
3. 增加新模型的主要工作量集中在 adapter，而不是重建整个 benchmark。

门槛：

1. 交互式视频生成推理成本高，尤其是 20 s / 40 s / 60 s 长序列。
2. 3D 几何指标依赖 DROID-SLAM 与 DBA，工程复现不算轻量。
3. 第三人称图像来自生成模型合成，这会把第三人称数据质量的一部分前置到图像生成环节。

总体上，这篇工作更像“benchmark infrastructure paper”，其复现难点不是公式，而是数据、adapter、评测流水线三者一起对齐。

## 批判性分析

### 1. 这篇论文解决的是“可比性”，不是“终局评测”

WorldMark 的第一贡献是统一测试条件，但这不等于它已经覆盖了所有世界模型能力。比如：

- 目前主要是相机/角色动作控制，不是复杂任务规划；
- 重点仍在 interactive I2V，不是纯 3D simulator 式闭环环境；
- 动作词表是 WASD+L/R，足够标准，但表达能力有限。

所以它更像第一代跨模型公共跑道，而不是世界模型评测的最终版本。

### 2. 第三人称数据并非原生采集

第三人称视角是通过 Nano-Banana-2 合成的。这是实用且现实的做法，但也意味着第三人称 benchmark 含有一个额外生成层。若第三人称图像先天地带有视觉先验偏差，那么模型表现的一部分可能在测“对合成 third-person reference 的适配能力”。

### 3. VLM 既参与动作筛选，也参与部分一致性判断

论文用 VLM 做 scene-aware action filtering，也用 VLM 做 State / Content / Style Consistency 评分。这能提高自动化程度，但会把 VLM judge 的偏好带进 benchmark。作者用 ρ > 0.9 的人工一致性结果缓解了这个担忧，但长期来看，评测最好仍需要多 judge、多评估器交叉验证。

### 4. 开源/闭源差距被第一次用同一基准真正量化

论文一个非常有价值的地方，是让 Genie 3 与多个开源模型在同一条件下比较，结果显示闭源模型在长时世界一致性上仍明显领先。这不是宣传语，而是统一输入后的量化证据。对社区来说，这比各家在私有 benchmark 上各自“领先”更有意义。

## 对领域影响

WorldMark 对领域的意义至少有四层。

第一，它把交互式世界模型 benchmark 从“展示型评测”推进到“对照实验型评测”。

第二，它首次把第一人称与第三人称差异系统化量化，直接指出第三人称是当前世界模型的脆弱点。

第三，它把一个经常被忽略的事实讲清楚了：高视觉质量、强动作跟随、长时世界一致性，不是同一个能力轴。后续模型不可能再用单一 demo 掩盖结构性短板。

第四，它提供了一个很现实的社区接口：如果以后出现新的世界模型，只要接上 action adapter，就可以直接放到同一坐标系中比较。这会显著提升世界模型研究的累积性。

一句话总结：WorldMark 真正建立的不是一组分数，而是一套让“世界模型之间终于可以公平比较”的公共基础设施。
