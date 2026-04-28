---
title: "深度解读 | Omni Context Unrolling：统一多模态模型不只是在看更多模态，而是在输出前先跨模态“展开上下文”"
description: "Omni, Context Unrolling, multimodal reasoning, GenEval2, MMSI, depth estimation, MoE, 3B active parameters"
---

# Omni Context Unrolling 深度解读

## 原始标题

Context Unrolling in Omni Models

## 原文链接

- arXiv：https://arxiv.org/abs/2604.21921
- 项目页：https://omni-model.com/

## 作者机构日期

- 作者：Ceyuan Yang, Zhijie Lin, Yang Zhao, Fei Xiao, Hao He, Qi Zhao, Chaorui Deng, Kunchang Li, Zihan Ding, Yuwei Guo, Fuyun Wang, Fangqi Zhu, Xiaonan Nie, Shenhan Zhu, Shanchuan Lin, Hongsheng Li, Weiling Huang, Guang Shi, Haoqi Fan
- 机构：当前提供的论文抽取文本与本地 HTML 片段列出了作者名单与日期，但未显式展开作者机构；为避免臆测，本文不补写未在源文中直接出现的 affiliations
- 日期：2026-04-23（arXiv v1；原始 HTML 标注为 23 Apr 2026）

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 这篇论文的中心论点是：统一多模态模型的价值，不只是“把文本、图像、视频、3D 放在同一个 backbone 里”，而是模型会在输出前主动调用不同模态作为中间上下文，形成作者所说的 Context Unrolling。 |
| 模型本体 | Omni 是一个 any-to-any unified multimodal model，原生训练于文本、图像、视频、3D geometry 和 hidden representations；采用 MoE 架构，活跃参数量为 3B。 |
| 核心方程 | `C_{t+1}=C_t\oplus\phi_t(x,C_t),\qquad y=\psi(x\mid C_T)`，即先迭代构造上下文，再做 context-conditioned decoding。 |
| 关键主张 | 任务不是终点，而是“生成上下文的原子操作”：文本思维链、视觉 token rollout、相机位姿估计、新视角合成、深度估计，都可以先被调用来扩展工作空间。 |
| 文本上下文收益 | 内部理解基准上，MMSI 从 31.5 提到 32.6；MMStar 从 59.4 提到 66.5；AI2D 从 90.2 提到 92.3。 |
| 视觉上下文收益 | GenEval-2 的 TIFA GM 从 29.25 提到 48.02；若配合 long text + visual，进一步到 53.44。 |
| 3D 上下文收益 | MMSI 空间推理 Overall Score 从 27.14 提到 34.17；深度估计 `\delta_1` 从 83.21% 提到 84.01%，AbsRel 从 0.2028 降到 0.1970。 |
| 最值得记住的判断 | 统一模型最宝贵的不是参数共享，而是让不同能力变成可以相互调用的“中间草稿纸”。 |

## 核心 Insight

这篇论文最值得记住的一句话，可以概括成：

统一多模态模型的优势，不在输入通道变多，而在推理时能把不同模态当作中间上下文来反复展开。

作者把这个现象命名为 Context Unrolling。它不是传统意义上的 chain-of-thought，也不是简单的先 caption 再 answer，而是一种更广义的“多模态工作空间扩展”：

- 文本可以先变成更细粒度的语义约束
- 图像 token 可以先变成结构 scaffold
- 3D 模块可以先给出位姿、深度或新视角
- 然后最终答案或最终生成结果，再建立在这些中间上下文上

所以论文真正反对的，是把 unified model 理解成“一个容器里塞多个任务头”。作者认为更准确的理解是：统一训练把各项能力变成了可被调度的原子 primitive，而这些 primitive 会先写入共享上下文，再决定最终输出。

## 方法详解

### 1. Omni 模型本体：不是专门为单一 benchmark 调的 VLM，而是原生 any-to-any 多模态模型

按论文定义，Omni：

- 原生训练于 text、image、video、3D geometry、hidden representations
- 扩展自 BAGEL 的 interleaved multimodal data paradigm
- 额外引入 reasoning-oriented multimodal content
- 还加入 hidden reasoning space 作为潜在推理空间
- 采用 mixture-of-experts 架构
- 活跃参数量为 3B

这几个要点合在一起，意味着 Omni 不是“图像理解模型外挂一个生成头”，而是想把理解、生成、编辑、视频、3D 放进一个统一训练分布。

作者在引言里特别强调，Omni 统一了：

- image / video / text 的 understanding
- image / video 的 generation 与 editing
- 3D geometry 中的 camera estimation 与 depth estimation

因此，它讨论 Context Unrolling 才有说服力：如果模型本来只会单一输出模态，就谈不上多模态上下文互相展开。

### 2. Context Unrolling 的正式定义：先构造上下文，再做条件解码

作者把推理过程写成：

`C_{t+1}=C_t\oplus\phi_t(x,C_t),\qquad y=\psi\left(x\mid C_T\right)`

其中：

- `x` 是多模态输入
- `\phi_t` 是原子 primitive
  - 例如 describe、predict pose、roll out visual tokens、synthesize a novel view、estimate depth
- `\oplus` 是上下文组合操作
- `C_T` 是若干轮展开后的共享上下文
- `\psi` 才是最终输出解码器

这个方程有两层含义。

第一层，它把 unified model 的推理看成迭代式 context construction，而不是一次性前向映射。

第二层，它把“能力”重新定义成可生成上下文的操作，而不是只能直接产出最终答案的 endpoint。

### 3. 三类上下文：文本、视觉、3D，不是互斥关系，而是互补约束

论文的实验基本围绕三种上下文展开。

#### 3.1 文本上下文

最轻量的展开方式，是先让模型 think，再给最终回答或最终生成。

作者在图像生成里区分：

- short thinking：平均约 100 token
- long thinking：平均约 250 token

在深度估计里又区分：

- detailed caption：泛化图像描述
- depth caption：专门描述空间深度关系

这说明作者并不认为“更长文本一定更好”，而是认为“更任务相关的文本约束更好”。

#### 3.2 视觉上下文

视觉上下文主要有两种体现：

1. 视觉 token rollout
   - 作为结构化中间表示，帮助图像生成保持 count、verb、position 等结构约束
2. 新视角合成结果
   - 在空间推理里先 synthesize novel views，再拿这些 imagined evidence 去答题

这就是作者所谓的 thinking with images：不是只看现有图，而是让模型先“想象出”辅助视觉证据。

#### 3.3 3D 上下文

3D 上下文是这篇论文最有辨识度的部分，因为它把传统上会被当成独立任务的几何能力，改造成 reasoning primitive。

具体包括：

- camera pose estimation 结果，作为 textural context
- novel view synthesis 结果，作为 visual context
- depth estimation 或 depth-aware caption，作为 geometry-aware constraint

作者的关键论断是：这些都不应被看作“额外任务头”，而应该被看作“先产出上下文，再帮助最终决策”的中间算子。

## 实验结果

### 1. 视觉理解：单纯加 thinking，上限就能抬一截

作者先在内部 downsampled visual understanding benchmark 上验证“文本展开”是否有收益。

| Context | BLINK↑ | MMStar↑ | MMBench-V11↑ | SimpleVQA↑ | AI2D↑ | ChartQA↑ | DocVQA↑ | HallusionBench↑ | Erqa↑ | MMSI↑ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Omni | 60.8 | 59.4 | 76.2 | 50.4 | 90.2 | 85.5 | 93.5 | 69.6 | 41.5 | 31.5 |
| + thinking | 61.6 | 66.5 | 77.1 | 51.4 | 92.3 | 88.0 | 94.0 | 71.3 | 44.5 | 32.6 |

这张表有两个重点。

第一，提升不是只出现在一个指标上，而是几乎全面提升。

第二，MMSI 从 31.5 到 32.6 的增幅不算最大，但它很重要，因为这已经触到后面“空间理解也能被上下文展开改善”的主线。

### 2. 图像生成：Context Unrolling 在 GenEval-2 上最容易看懂

作者把 text-to-image 当作最标准的分析场景，因为它最容易观察“上下文展开”是否真减少了生成歧义。

#### 2.1 GenEval-2 主结果

| Context | TIFA GM | Object | Attribute | Count | Position | Verb |
|---|---:|---:|---:|---:|---:|---:|
| Omni | 29.25 | 91.64 | 90.00 | 52.03 | 77.67 | 26.25 |
| + short | 37.35 | 93.18 | 92.45 | 60.14 | 76.92 | 38.83 |
| + long | 43.94 | 91.86 | 91.13 | 67.03 | 77.03 | 38.31 |
| + visual | 48.02 | 94.42 | 92.96 | 66.92 | 79.28 | 53.96 |
| + short and visual | 49.16 | 93.13 | 92.68 | 68.36 | 76.83 | 43.34 |
| + long and visual | 53.44 | 92.34 | 92.32 | 72.98 | 80.23 | 42.81 |
| + oracle | 52.20 | 95.72 | 87.35 | 67.91 | 91.69 | 43.31 |
| + oracle and visual | 57.21 | 94.77 | 97.89 | 69.47 | 90.64 | 56.00 |

这张表几乎把全文论点压实了：

- 只加 short text，TIFA GM 从 29.25 提到 37.35
- 换 long text，到 43.94
- 只加 visual context，直接到 48.02
- long + visual 进一步到 53.44
- oracle + visual 达到 57.21

也就是说，作者想证明的不是“Omni 本身生成就很强”，而是“越能展开更高质量的上下文，生成越接近正确语义组合”。

#### 2.2 为什么 visual context 特别强

从细项能看到，`+ visual` 在 Verb 上从 26.25 拉到 53.96，Count 也从 52.03 提到 66.92。作者的解释是：视觉 token 比纯文本更擅长注入结构约束，所以在动作、计数、空间关系上帮助更大。

这也解释了为什么 text-only CoT 在多模态场景不够：文字可以明确要求，但未必能稳稳保住结构。

### 3. 空间理解：文本 CoT 不够，3D context 才是真增益来源

作者从 MMSI benchmark 中选了 200 个更偏 3D spatial reasoning 的问题做测试。

| Context | Overall Score | MSR | Motion | Positional Relationship |
|---|---:|---:|---:|---:|
| Omni | 27.14 | 17.65 | 0.0 | 19.63 |
| + thinking | 28.15 | 17.65 | 33.33 | 30.25 |
| + textural contexts | 30.15 | 11.76 | 33.33 | 33.95 |
| + visual contexts | 34.17 | 26.47 | 33.33 | 35.80 |

这张表里最值得注意的是：

- 纯 thinking：Overall 只从 27.14 到 28.15
- 加 geometry-grounded textual context：到 30.15
- 加 NVS-derived visual context：到 34.17

也就是说，几何问题上，文字推理链本身帮助有限；真正有用的是具备 3D 约束的信息。

这与作者的理论完全一致：空间歧义不是“多写几句文字”就能消掉的，而需要位姿、视角、场景补全这类结构证据。

### 4. 深度估计：不是长 caption 有用，而是 depth-aware context 有用

作者把单目深度估计写成 depth-map generation，并测试不同上下文。

| Context | `\delta_1`↑ | AbsRel↓ |
|---|---:|---:|
| Omni | 83.21% | 0.2028 |
| + detailed caption | 83.27% | 0.2029 |
| + depth caption | 83.88% | 0.1988 |
| + visual contexts | 84.01% | 0.1970 |

这里有一个非常漂亮的结论：

- 泛化 detailed caption 几乎没帮助
- 专门描述几何关系的 depth caption 才有效
- visual context 进一步更强

这说明 Context Unrolling 不是“多想就好”，而是“多想对了才好”。中间上下文必须与目标任务约束同向，才能真正改善预测。

作者在文中还把这个范式写成：

`D=\mathrm{Depth}(I\mid C_{\text{text}},C_{\text{vis}})`

也就是把深度估计从直接回归 `I\rightarrow D` 改成 context-conditioned inference。

### 5. 标准 benchmark 定位：Omni 不是只会讲机制，主模型成绩也站得住

#### 5.1 多模态理解 benchmark

论文把 Omni 与 Qwen3-VL-30B-A3B-Instruct、InternVL3.5-30B-A3B 做对比。Omni 的代表性分数包括：

- VlmsAreBlind：76.4
- RealWorldQA：76.0
- TextVQA：81.0
- AI2D：91.5
- HallusionBench：70.1
- MMSI-Bench：31.5

作者的主张不是所有点都 SOTA，而是在 3B active MoE 的前提下，做到跨理解、生成、视频、3D 的统一能力。

#### 5.2 图像生成 benchmark

| 模型 | GenEval2↑ | DPG↑ | LongText-EN↑ | LongText-CN↑ | Inhouse↑ |
|---|---:|---:|---:|---:|---:|
| Qwen-Image | 30.67 | 88.32 | 94.3 | 94.6 | 55.16 |
| Z-Image | 41.83 | 88.14 | 93.5 | 93.6 | 55.19 |
| Flux | 34.59 | 83.84 | 60.7 | 0.5 | 49.91 |
| Omni | 54.12 | 88.55 | 97.5 | 96.8 | 63.87 |

Omni 在 GenEval2 上的 54.12，本身就已经高于文中列出的 Qwen-Image、Z-Image 和 Flux。再结合前面的 context-unrolling 分析表，你能看出作者的完整叙事：

- 基础模型已经够强
- 但真正更强的来源，是它还能继续自我展开上下文

#### 5.3 3D 几何 benchmark

Camera pose estimation：

| 方法 | RealEstate10K AUC@30↑ | RPE trans↓ | RPE rot↓ | CO3Dv2 AUC@30↑ | RPE trans↓ | RPE rot↓ |
|---|---:|---:|---:|---:|---:|---:|
| Flare | 84.42 | 0.4215 | 0.0532 | 72.23 | 2.1242 | 0.0342 |
| Cut3r | 85.32 | 0.4023 | 0.0424 | 75.62 | 1.5321 | 0.0331 |
| VGGT | 88.23 | 0.3886 | 0.0386 | 86.23 | 1.1432 | 0.0285 |
| Omni | 88.32 | 0.3766 | 0.0289 | 75.21 | 1.5955 | 0.0269 |

Monocular depth estimation：

| 方法 | NYU `\delta_1`↑ | NYU AbsRel↓ | KITTI `\delta_1`↑ | KITTI AbsRel↓ | SINTEL `\delta_1`↑ | SINTEL AbsRel↓ | ETH3D `\delta_1`↑ | ETH3D AbsRel↓ | DIODE `\delta_1`↑ | DIODE AbsRel↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Marigold | 92.75 | 0.0781 | 87.87 | 0.1108 | 62.24 | 0.4666 | 97.12 | 0.0564 | 81.64 | 0.2266 |
| Cut3r | 91.64 | 0.0824 | 86.42 | 0.1253 | 55.64 | 0.4723 | 95.34 | 0.0632 | 75.21 | 0.3521 |
| DA3 giant | 94.78 | 0.0579 | 93.96 | 0.0824 | 66.54 | 0.3821 | 98.79 | 0.0324 | 82.69 | 0.2050 |
| VGGT | 96.10 | 0.0499 | 94.29 | 0.0803 | 66.11 | 0.4551 | 98.35 | 0.0326 | 82.15 | 0.2115 |
| Omni | 96.22 | 0.0542 | 96.92 | 0.0621 | 74.27 | 0.3340 | 98.91 | 0.0312 | 83.83 | 0.2034 |

单看这张表，Omni 的 3D 几何能力已经不是“顺手能做”，而是很多点上接近甚至超过 specialist baseline。

## 复现评估

这篇论文的复现价值很高，但严格说，复现门槛也不低。

### 可复现之处

1. 概念框架清楚
   - Context Unrolling 用统一方程定义，实验围绕 text / visual / 3D context 展开，非常利于做 ablation。
2. 任务拆分明确
   - 理解、图像生成、空间理解、深度估计、视频、3D geometry 各自有对应 benchmark。
3. 上下文类型可局部复现
   - 例如单独验证“生成前先让模型写 short/long think”或“深度前先写 depth caption”，不需要完整复现所有 Omni 训练。

### 难复现之处

1. 训练分布极宽
   - 原生多模态训练覆盖 text/image/video/3D/hidden representations，不是普通实验室轻易能重建的数据配方。
2. any-to-any 统一架构成本高
   - 要同时具备理解、生成、编辑、3D 能力，远高于单一 VLM 或单一 diffusion model。
3. 上下文展开质量高度依赖底模能力
   - 如果基础统一模型不够强，rollout 出来的中间上下文可能只会放大噪声。

所以我认为，这篇论文最现实的复现路径不是“一比一训出 Omni”，而是：

- 在现有 unified multimodal model 上复现 context-unrolling inference recipe
- 分别验证 text-only、visual-only、3D-only context 对下游任务的边际收益

## 批判性分析

### 1. 这篇论文最强的地方，是把 unified model 的价值从“参数共享”升级成“工作空间扩展”

这是它最有理论价值的贡献。过去很多统一模型论文，本质上仍然是在做 task aggregation；而这篇论文明确提出，统一模型的关键收益来自可以把不同能力当作 primitive 来相互调用。

这使它比“一个大而全模型”更接近“一个能自我组织中间推理过程的系统”。

### 2. Context Unrolling 目前更像经验性机制，而非严格可证的内部因果模型

尽管论文给出了统一方程和大量实验，但从严格科学表述看，它仍主要是在证明：

- 当模型先生成某些中间上下文时，性能会提高
- 因此 unified model 的优势部分来自这些可展开的上下文

但它还没有完全证明模型内部真实推理路径一定按照这个抽象图式运作。换句话说，这更像是一个非常强的 operational theory，而不是神经内部机制的完备解释。

### 3. Oracle context 的结果很有启发，也暴露了当前瓶颈并不完全在 decoder

在 GenEval-2 中：

- `+ long and visual` 是 53.44
- `+ oracle and visual` 是 57.21

这说明当前上限不完全由图像生成器决定，更多在于“能不能构造出更准、更密、更少幻觉的上下文”。

这会把研究重心往 inference-time context construction 推，而不是只推更大 decoder。

### 4. 论文对视频与 3D 的论证是加分项，但主证据仍集中在 image / spatial / depth

虽然 Omni 覆盖视频生成编辑与 3D reconstruction，但真正最完整地支撑 Context Unrolling 论点的，还是：

- 图像生成中的 text/visual context
- MMSI 中的 3D context
- 深度估计中的 task-specific textual/visual context

因此，Context Unrolling 目前更像一个已在若干关键任务上成立的统一原则，而不是所有多模态任务都已被充分验证的普适定律。

## 对领域影响

### 1. 多模态推理可能会从“text CoT 中心主义”转向“多模态草稿纸”

这篇论文的最大外溢影响，是让人重新思考 chain-of-thought 的载体。未来强模型未必只通过文字思考，还可能通过：

- 文字列约束
- 视觉 token 列结构
- 3D 模块补几何
- 生成新视角做反证

也就是从单模态 CoT 转向 multimodal context construction。

### 2. 统一模型的核心竞争力，可能从单项 SOTA 变成“中间上下文生产能力”

若这一路线继续成立，那么未来大家比较 unified model，不该只比最终 answer 或最终图片，而要比：

- 它能生成哪些中间上下文
- 这些上下文质量如何
- 它是否能根据任务选择最合适的上下文展开策略

这更像把模型从“答题者”变成“先搭工作台、再做题的人”。

### 3. 对 agent、机器人、空间智能都很关键

因为一旦任务需要：

- 长链规划
- 多视角空间理解
- 复杂环境操作
- 视频与 3D 联动推断

text-only reasoner 很快会不够。Omni 这篇论文给出的方向是：真正强的 agent，内部要能让文本、图像、视频、3D 互相展开、互相校验。

如果未来 embodied agent 走向这条路线，那么 Context Unrolling 可能会成为多模态 agent inference stack 的核心概念之一。
