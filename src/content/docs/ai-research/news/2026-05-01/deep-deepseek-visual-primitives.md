---
title: "深度解读 | DeepSeek《Thinking with Visual Primitives》：让多模态模型在推理时直接“指图思考”"
description: "DeepSeek, Thinking with Visual Primitives, Reference Gap, visual primitives, multimodal reasoning, GRPO, topological reasoning"
---

# 深度解读 | DeepSeek《Thinking with Visual Primitives》：让多模态模型在推理时直接“指图思考”

> 原文链接（技术报告 PDF）：https://raw.githubusercontent.com/mitkox/Thinking-with-Visual-Primitives/main/Thinking_with_Visual_Primitives.pdf
> 项目地址（36Kr 报道给出的仓库名）：https://github.com/deepseek-ai/Thinking-with-Visual-Primitives
> 作者：Ruijie Lu, Yiyang Ma, Xiaokang Chen, Lingxiao Luo, Zhiyu Wu, Zizheng Pan, Xingchao Liu, Yutong Lin, Hao Li, Wen Liu, Zhewen Hao, Xi Gao, Shaoheng Nie, Yixuan Wei, Zhenda Xie, Ting Chen, Gang Zeng
> 机构：DeepSeek-AI、北京大学、清华大学
> 发布日期：2026-04-30

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | DeepSeek 把坐标点和框直接塞进 CoT，让模型一边“指”一边“想”，专治多模态空间推理里的指代漂移。 |
| 大白话版 | 以前模型看图推理像嘴上说“左边那个红色的”，说着说着自己也晕；这篇工作让它在思考时直接写出坐标和框，把“我指的是谁”钉死在图上。 |
| 核心数字 | Pixmo-Count 89.2；MIHBench 85.3；SpatialMQA 69.4；DS_Maze_Navigation 66.9；DS_Path_Tracing 56.7 |
| 评级 | A — 不是普通多模态增强，而是在“视觉引用如何进入推理链”上给出了一套完整范式。 |
| 代码 | 项目页已公开，技术报告 PDF 可获取；仓库官方归属链接在媒体报道中给出。 |
| 关键词 | Reference Gap、Visual Primitives、Bounding Box CoT、Point-based Reasoning、GRPO、On-Policy Distillation、Topological Reasoning |

## 核心 Insight

这篇论文最重要的洞察，不是“多模态模型需要看更清楚”，而是“多模态模型需要在推理时说得更准”。

过去一年多模态系统的主流补法，大多围绕 Perception Gap：分更高分辨率、切更多 patch、喂更多视觉 token、做更强 OCR。DeepSeek 这篇文章直接反手指出：很多失败根本不是没看见，而是没法在复杂场景里稳定地指代目标对象。论文把这个问题命名为 Reference Gap。

Reference Gap 的意思很直白：自然语言里的“左边那个”“靠近中间的红色物体”“顺着这条线往下走”天然有歧义。对人类来说，我们会一边看图一边用手指、一边目光跟踪；但传统 MLLM 的 CoT 仍是纯文本的，导致它虽然“看见了”，推理链却可能在中途漂移，最终逻辑坍塌。

### 为什么这个想法 work？

DeepSeek 的解法是把视觉原语变成“最小思维单元”：

1. 用 bounding box 表示“我现在锁定的是哪个对象”；
2. 用 point 表示“我现在沿着哪条路径、哪个坐标继续走”；
3. 让这些视觉原语不是出现在答案末尾，而是直接出现在推理链内部。

这样做的直觉非常强：
- 文本 CoT 负责逻辑；
- box / point 负责消歧；
- 两者交错，模型就不再只是“描述图”，而是在“贴着图思考”。

这本质上把多模态推理从“语言代理视觉”改成“语言 + 坐标共治”。对数数、空间关系、迷宫、路径跟踪这种任务尤其关键，因为它们最怕引用对象变来变去。

## 方法详解

### 整体架构

论文路线可以概括成下面这条链：

输入图像 → ViT 编码 → 3×3 空间压缩 → V4-Flash 语言骨干 + CSA 压缩 KV → 视觉原语冷启动数据 → 专家化 SFT → 专家化 RL（GRPO）→ Unified RFT → On-Policy Distillation → 统一模型

其中最关键的不是单一模块，而是三层协同：
- 表达层：用 `<|box|>` / `<|point|>` 进入 CoT；
- 数据层：专门构造视觉原语冷启动任务；
- 训练层：先分开学 box 和 point，再合并成统一模型。

### 关键技术组件

#### 组件 1：Reference Gap 定义

**做什么：** 给多模态空间推理失败找出真正瓶颈。

**怎么做：** 论文区分了两个 gap：
- Perception Gap：看不清细节；
- Reference Gap：即便看清了，也无法用不歧义的方式持续指向目标。

**直觉解释：**
如果让模型回答“图里一共有几只蓝衣服的人”，它不是只要分辨蓝色和人，还要在逐个计数时持续记住“刚才数的是哪一个、接下来还剩哪一个”。纯语言 CoT 容易在这种过程中漂移。

#### 组件 2：Visual Primitives as Thought Units

**做什么：** 把框和点从“输出标注”升级成“思考部件”。

**怎么做：**
论文定义两类原语：
- box：用于对象定位与多实例计数；
- point：用于路径、拓扑、轨迹等连续空间推理。

推理过程中，模型不再只说“发现一只熊”，而是像这样交错输出：
- `<|ref|>bear<|/ref|><|box|>[[x1,y1,x2,y2]]<|/box|>`
- `<|point|>[[x1,y1],[x2,y2],...]<|/point|>`

**关键设计：** 坐标被归一化到 0–999 的离散整数空间，保证训练和验证都可以规则化处理。

**数值例子：**
假设模型在一张图里数人：
- 第一步框出左上角第 1 个人；
- 第二步框出右下角第 2 个人；
- 第三步继续扫描未覆盖区域；
- 最终把“计数”和“已经锁定的对象集合”绑定，减少重复数和漏数。

#### 组件 3：极致视觉压缩

**做什么：** 在不堆超多视觉 token 的情况下保住空间推理能力。

**怎么做：**
论文基于 DeepSeek V4-Flash：
- 先由 ViT 产生 2916 个图像块 token；
- 再做 3×3 空间压缩，降到 324 token；
- 再利用 Compressed Sparse Attention（CSA）把视觉 KV cache 继续压缩 4 倍；
- 最终只剩 81 个视觉 KV 条目。

**直觉解释：**
他们赌的不是“看得更多”，而是“锚得更准”。如果 reasoning 过程能持续用点和框固定引用对象，就不必靠海量 patch 硬顶。

**关键数字：**
- 输入示例：756×756 图像
- 原始像素：571,536
- 视觉 token：2916 → 324
- KV 再压缩：324 → 81
- 论文给出的总体压缩量级：7056 倍

#### 组件 4：冷启动数据构造

**做什么：** 给模型系统性灌输“如何用视觉原语思考”。

**怎么做：**
论文先从近 10 万个 object detection 相关数据源爬取候选，经过两轮语义与几何质量筛选，最后保留约 31,700 个高质量来源，构造出 4000 万+ 训练样本。

专门为 visual primitives 设计的冷启动任务有四类：

1. 计数
- 粗粒度计数
- 细粒度计数（带属性约束）

2. 空间推理 / VQA
- 基于 GQA 与 CLEVR 派生多跳样本
- 强迫每一步都锁定相关对象

3. 迷宫导航
- 46 万样本
- 用 DFS、Prim、Kruskal 生成矩形、圆形、六边形拓扑
- 包含“看似可解但其实不可解”的 hard case

4. 路径跟踪
- 12.5 万样本
- 通过多条相交贝塞尔曲线测试拓扑连续性判断

### 训练策略

#### Phase 1：Specialized SFT

训练数据配比：
- 70% 通用多模态 + 纯文本数据
- 30% visual primitives 专项数据

然后分成两条专家路线：
- FTwG：thinking with grounding
- FTwP：thinking with pointing

这么做是为了避免少量专项数据下，box 和 point 两种模式互相干扰。

#### Phase 2：Specialized RL

RL 使用 GRPO。

奖励模型拆成三层：
- Format RM：格式对不对，是否重复框选；
- Quality RM：推理是否自洽，是否自相矛盾，是否 reward hacking；
- Accuracy RM：按任务分别设计。

其中计数任务的奖励最值得写出来：

$$
R(\hat{y}, y)=\alpha \cdot \exp\left(-\beta \cdot \frac{|\hat{y}-y|}{|y|+1}\right)
$$

论文设定：
- $\alpha = 0.7$
- $\beta = 3$

这个设计的意义是：
- 不是答错就全罚没；
- 大场景下小偏差容忍更高；
- 给 RL 提供更平滑的学习信号。

Maze Navigation 和 Path Tracing 的 Accuracy RM 也很工程化：
- 是否撞墙；
- 是否完成合法探索；
- 是否输出连续有效路径；
- 终点是否正确；
- 轨迹是否完整覆盖。

#### Phase 3：Unified RFT + OPD

完成两条专家模型 ETwG / ETwP 后，论文再做两步：

1. Unified RFT
- 用专家模型 rollout 生成更大、更丰富的 RFT 数据
- 保留所有 Normal-Level 样本 + 5% Easy-Level 样本
- 从 base pretrained model 重新初始化训练统一模型 F

2. On-Policy Distillation
- 让统一学生模型沿着自己的轨迹学习专家分布
- 损失函数是 reverse-KL 蒸馏：

$$
L_{OPD}(\theta)=\sum_{i=1}^{N} w_i \cdot D_{KL}(\pi_\theta \parallel \pi_{E_i})
$$

这里两个 teacher 就是 ETwG 与 ETwP。

### 与现有方法的关键区别

| 维度 | 之前的方法 | 本文方法 | 为什么更好 |
|---|---|---|---|
| 视觉引用 | 靠自然语言描述对象 | 直接把 box / point 塞进 CoT | 消歧更强，降低引用漂移 |
| 视觉扩容路线 | 主要堆更高分辨率和更多 token | 低 token + 强引用锚点 | 效率更高，思维链更稳 |
| 训练方式 | 通用 SFT/RL 为主 | 专家化 SFT → 专家化 RL → 统一蒸馏 | 先分治再合流，避免模式冲突 |
| 拓扑推理 | 通常缺少专门冷启动数据 | 迷宫 / 路径追踪专项构造 | 补齐最弱能力面 |

## 实验结果

### 主实验：对比 frontier 模型

| Benchmark | Gemini-3-Flash | GPT-5.4 | Claude Sonnet 4.6 | Gemma4-31B | Qwen3-VL | Ours |
|---|---:|---:|---:|---:|---:|---:|
| Pixmo-Count (EM) | 88.2 | 76.6 | 68.7 | 82.9 | 77.2 | **89.2** |
| DS_Finegrained_Counting (EM) | 79.1 | 84.2 | 82.6 | 79.5 | 87.2 | **88.7** |
| MIHBench (ACC) | 83.2 | 83.5 | 81.7 | 82.2 | 75.1 | **85.3** |
| SpatialMQA (ACC) | 67.0 | 61.9 | 58.2 | 60.6 | 54.5 | **69.4** |
| DS_Maze_Navigation (ACC) | 49.4 | 50.6 | 48.9 | 49.8 | 49.6 | **66.9** |
| DS_Path_Tracing (ACC) | 41.4 | 46.5 | 30.6 | 33.9 | 24.5 | **56.7** |

**解读：**
- 计数不是最大惊喜，真正的断层在拓扑推理。
- Maze Navigation 上，66.9 相比 GPT-5.4 的 50.6，差了 16.3 分；对 Claude Sonnet 4.6 更是高出 18.0 分。
- Path Tracing 上，56.7 比 GPT-5.4 的 46.5 高 10.2 分，说明 point-based reasoning 不是花架子，而是真把“沿线追踪”学进去了。

### 任务集构造与规模

| 项目 | 数字 |
|---|---:|
| 高质量数据来源 | 31,700 |
| 总训练样本 | 40M+ |
| 迷宫冷启动样本 | 460,000 |
| 路径跟踪冷启动样本 | 125,000 |
| DS_Finegrained_Counting 测试集 | 600 |
| DS_Maze_Navigation 评测集 | 2,000 |
| DS_Path_Tracing 评测集 | 2,000 |

### 消融与训练机制观察

论文没有给出大而全的每模块 ablation 总表，但从方法描述可以提炼出三条核心贡献：

1. **Specialized SFT 分流是必要的**
- box 与 point 两套数据在早期共同训练容易发生模式冲突；
- 先学专家模型，再合并统一模型，是这篇工作能成立的关键工程策略。

2. **Smooth reward 比 exact match 更适合计数**
- 计数任务的误差是连续的，不该简单二元化；
- 指数衰减奖励让“差一点”的答案也能贡献学习信号。

3. **OPD 负责把两个专家真正焊进一套统一模型**
- 若没有 unified RFT + OPD，最终模型容易停留在“两个局部强项”的拼接，而不是统一的多模态 reasoning core。

## 复现评估

| 维度 | 评分 | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐⭐☆☆☆ | 论文说明了大量数据构造逻辑，但 31,700 来源筛选与 40M+ 数据池并未完整公开。 |
| 代码可得性 | ⭐⭐⭐☆☆ | 项目页与 PDF 已公开，但要复刻全流程仍需等待更多训练脚本与 verifier 细节。 |
| 算力需求 | ⭐☆☆☆☆ | 背后是 DeepSeek V4-Flash 系统，长上下文、专家模型、GRPO、多阶段训练都很重。 |
| 工程复杂度 | ⭐⭐⭐⭐⭐ | 难点不只是模型，而是数据、规则奖励、迷宫/路径生成器、统一蒸馏流水线。 |
| 预期收益 | ⭐⭐⭐⭐☆ | 如果你做的是视觉 agent、空间推理、GUI 或机器人规划，这条路线非常值得学。 |

**复现建议：**
先别想着复刻完整大模型。最现实的路径是：
1. 在较小 VLM 上复现 `<|box|>` / `<|point|>` CoT 格式；
2. 只做计数 + 路径跟踪两类任务；
3. 先验证“引用锚点是否稳定提升”，再决定是否上专家化 RL 和统一蒸馏。

## 批判性分析

### 局限性

论文自述与可见局限主要有四个：

1. 目前最强增益集中在特定空间/拓扑任务，不等于所有多模态任务全面领先。
2. DS 系列自建 benchmark 很强，但也带来了“命题者优势”质疑。
3. 视觉原语 CoT 的 token 开销虽然远小于大规模 patch，但在长推理链下仍会抬高解码长度。
4. 论文证明了“point/box 能帮忙”，但还没解决视频长时序、多图跨页、多窗口 GUI 的统一引用问题。

### 我额外关注的问题

1. **离散坐标的泛化边界**
把坐标统一到 0–999 很工程，但当图像比例极端变化、对象极小、跨帧移动时，这套表示是否仍足够稳定，值得继续看。

2. **奖励模型会不会反向塑造“格式正确但思维空洞”**
只要 box / point 格式带奖励，就天然存在“学会摆姿势”的风险。Quality RM 已经在防 reward hacking，但长期是否足够，还要看更开放场景。

3. **它更像 reasoning scaffold，而不是万能视觉架构**
这篇论文真正新的是“推理接口设计”，不是从底层视觉编码器彻底颠覆全栈。所以它可能更适合作为 agent / VLM 的 reasoning layer augmentation，而非替代全部视觉 pipeline。

## 对领域的影响

这篇工作对行业最重要的启发，是把多模态推理的竞争点从“谁喂的图更多”转到了“谁在思考时更会引用图”。

短期看，它会直接刺激几条线：
- 视觉 CoT 从纯文本向坐标化、结构化迁移；
- GUI agent、网页 agent、机器人路径规划开始更认真地引入 point / box 级 reasoning；
- 奖励模型从只看最终答案，转向看 reasoning trajectory 的合法性。

中期看，它可能推动一个更大的变化：
- 多模态 agent 的推理轨迹会越来越像“程序执行痕迹”，而不是自然语言散文；
- 人类调试模型时，也会更容易检查“它究竟指错了哪一步”。

我的判断很直接：这不是一篇靠刷榜取胜的多模态论文，而是一篇在“推理表示层”上给出新范式的工作。DeepSeek 这次真正放出来的，不只是一个会看图的新模型，而是一条值得被整个行业复制、简化、商品化的思路。