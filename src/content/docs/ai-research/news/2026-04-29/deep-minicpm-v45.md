---
title: "MiniCPM-V 4.5 深读：把多模态模型的效率瓶颈拆成架构、数据和训练三件事"
description: "MiniCPM-V 4.5, 3D-Resampler, OCR, document understanding, hybrid RL, OpenCompass, VideoMME"
---

# MiniCPM-V 4.5 深度解读

> 原文链接：https://huggingface.co/openbmb/MiniCPM-V-4_5
> 技术报告：MiniCPM-V 4.5: Cooking Efficient MLLMs via Architecture, Data and Training Recipes
> 来源：OpenBMB / MiniCPM-V Team
> 发布日期：2026-04-28（技术报告公开传播窗口）
> 核对说明：已通读本轮落库保存的技术报告全文，并据正文实验表整理本文；未引用报告外未给出的数值。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | MiniCPM-V 4.5 的核心不是再堆参数，而是把多模态效率问题拆成视觉 token 压缩、文档学习范式、推理模式控制三层一起优化。 |
| 大白话版 | 别再让模型用一大坨图像/视频 token 硬吃显存，也别再靠脆弱 parser 先把 PDF 拆碎；直接把视觉编码压缩掉，把 OCR 和文档知识一起学，再让模型既会短答也会长想。 |
| 核心数字 | 8B 参数；6 秒 2fps 448×448 视频可压到 128 visual tokens；3D-Resampler 下 6 帧可联合压到 64 token、报告称视频 token 压缩率可达 96×；VideoMME 上仅用 Qwen2.5-VL 7B 46.7% 显存和 8.7% 推理时间。 |
| 评级 | A — 不是绝对能力革命，但它把“高性能 MLLM 必然昂贵”这个前提拆得很干净。 |
| 代码 | 模型与代码均已公开 |
| 关键词 | MLLM efficiency, 3D-Resampler, document OCR, hybrid RL, short reasoning, long reasoning, VideoMME, OpenCompass |

## 核心 Insight

MiniCPM-V 4.5 最值得记住的 insight 是：多模态模型的效率问题并不是单点瓶颈，而是三种成本同时失控。

第一层是视觉 token 太多。传统 MLLM 为了吃高分辨率图像和视频，往往把 encoder 输出的大量 patch token 直接喂给 LLM，结果训练和推理都被上下文长度拖死。第二层是文档训练太依赖外部解析器。论文明确指出，科学论文、教材、复杂 PDF 的真实价值恰恰在混排结构里，但 parser 一旦失败，知识学习和 OCR 都会被错误中间表示污染。第三层是 reasoning mode 单一化。只练长推理模式虽然能刷复杂题，但会把简单任务也拖成长篇大论，训练和推理两头都浪费。

MiniCPM-V 4.5 的思路是把这三层一起改：用 3D-Resampler 压缩 image/video token，用动态视觉扰动把 OCR 与 document knowledge learning 融成同一个学习目标，再用 hybrid RL 同时训练 short reasoning 和 long reasoning。也就是说，它不接受“更强多模态 = 更大更慢”这个默认设定，而是试图把效率本身做成模型竞争力。

## 方法详解

### 整体架构

报告把系统分成三块：

输入图像/视频 → 轻量视觉编码器 → Unified 3D-Resampler → LLM Decoder → 短推理/长推理输出

其中最关键的是中间这个 Unified 3D-Resampler。它不是只对静态图像做 2D 压缩，而是把视频里的时空冗余一起压掉，让 image 和 video 共用一套统一视觉编码通道。

### 组件 1：Unified 3D-Resampler

**做什么：** 把高分辨率图片和长视频压成紧凑得多的视觉 token 序列。

**怎么做：**
- 对图片：沿用 image partitioning，把不同长宽比图片切成多个 slice，再用带 2D 位置编码的 learnable queries 做 cross-attention，生成固定长度表示。
- 对视频：先按时间维度把相邻帧打包成 package，再用同时带 2D 空间位置编码和 temporal 位置编码的 learnable queries 对整包帧特征做联合重采样。
- 对统一训练：同一套 3D-Resampler 同时服务 image/video，因此 image 的知识也更容易迁移到 video。

**关键数字：**
- 448×448 图片可压到 64 visual tokens；
- 6 秒、2fps、448×448 视频可压到 128 visual tokens；
- 报告给出的极限表述是 6 帧 448×448 视频联合压到 64 token，相比多数 MLLM 常见的 1536–3072 token，视频 token 压缩率可达 96×；
- 相比旧 2D-Resampler，视频方向额外得到 6× temporal compression。

**为什么这个设计 work：**
视频最浪费的不是“信息不够”，而是“重复信息太多”。连续帧里背景、主体结构、文档页面布局往往大量重复。3D-Resampler 等于承认视频不是静态图片的简单拼接，而是可以先在时空联合空间里做一次稀疏化，再交给 LLM 做语言推理。

### 组件 2：文档知识与 OCR 的统一学习范式

**做什么：** 不再依赖脆弱外部 parser 去把 PDF/文档切成 image-text pair，而是让模型直接从文档图像里学会 OCR 与知识抽取。

**怎么做：**
- 选取文档中的文本区域作为训练目标；
- 对这些区域随机施加不同强度的 corruption；
- 低扰动时，任务更像 OCR；
- 中扰动时，需要结合视觉线索与上下文恢复；
- 高扰动时，模型必须依赖文档上下文和知识推断补全文本。

报告明确把这套方案总结为：用 dynamic visual corruption 建一个从 OCR 到 contextual reasoning 的连续谱，而不是把 OCR、parser、document QA 分成完全割裂的流水线。

**为什么这点重要：**
很多文档 MLLM 的真实问题不是模型不会读，而是训练样本先被 parser 弄坏了。MiniCPM-V 4.5 的方案等于把“先解析再学习”改成“直接从原始文档视觉面学习”，减少 brittle preprocessing 对上游能力的限制。

### 组件 3：Hybrid RL，同步支持 short reasoning 与 long reasoning

**做什么：** 让模型既能在简单题上快速输出，也能在复杂题上展开显式长推理。

**怎么做：**
- RL rollout 时随机交替 short reasoning 与 long reasoning 两种模式；
- 对短答案倾向用规则验证，报告称简单短答案验证准确率可达 98%；
- 对复杂自然语言答案用 reward model，但只给 final answer 打分，不惩罚中间 think token；
- 这样既保证复杂 reasoning 的梯度信号，又避免“每题都说太多”。

**关键数字：**
- 报告称 hybrid post-training 只用 long-reasoning-only 策略 70.5% 的训练 token 成本，就取得更好综合表现；
- 在 OpenCompass 综合评测上，short/long 双模式能力都能提升，同时推理时间仅为并发 thinking baseline 的 42.9%–68.2%。

## 训练策略

报告把训练拆成 progressive multi-stage pipeline：
- 早期阶段冻结 LLM，强化视觉侧和 OCR-rich data；
- 中期开始引入 image-text interleaving、videos 和更高质量指令数据；
- 视觉与语言逐步解冻，配合 Warmup-Stable-Decay 学习率调度；
- 后训练阶段再上 hybrid RL，分别处理效率型短答和复杂长推理。

值得注意的是，作者强调统一 resampler 也让 2D→3D 扩展可以通过较轻量 SFT 完成，而不是整套重训，这对后续模型族演进很有工程意义。

## 实验结果

### 主实验

| 方法 | 参数规模 | OpenCompass | MMMU | MathVista | OCRBench | VideoMME 结论 |
|---|---:|---:|---:|---:|---:|---|
| Qwen2.5-VL 7B | 7B | 70.5 | 58.6 | 68.2 | 86.4 | 作为主要效率对比基线 |
| Qwen2.5-VL 72B | 72B | 76.1 | 68.2 | 74.2 | 88.2 | 大模型强基线 |
| InternVL3 | 8B | 73.6 | 62.7 | 71.6 | - | 同尺寸开源基线 |
| GLM-4.1V | 9B | 76.6 | 68.0 | 80.7 | - | thinking 型同代基线 |
| GPT-4o-latest | proprietary | 75.4 | 72.9 | 71.6 | - | 闭源参考 |
| **MiniCPM-V 4.5** | **8B** | **77.0** | **67.7** | **79.9** | **89.0** | **30B 以下 SOTA；同等表现下仅需 Qwen2.5-VL 7B 的 46.7% 显存与 8.7% 推理时间** |

**解读：**
- 最硬的不是单个榜单第一，而是 8B 体量在 OpenCompass 上压过 GPT-4o-latest 与 Qwen2.5-VL 72B。
- 在 OCRBench 上到 89.0，说明它的 document/OCR 统一训练不是口号。
- 在 MathVista 上 79.9，接近 GLM-4.1V 的 80.7，说明“效率路线”没有明显牺牲复杂多模态推理。
- 真正的王牌是 VideoMME 方向的效率-性能比：同等视频理解表现下，推理时间缩到先前强基线的 9.9%。

### 关键消融与机制验证

| 模块 | 论文主张 | 作用 |
|---|---|---|
| 3D-Resampler | 时空联合压缩优于简单 2D 图像压缩外推到视频 | 让长视频/高帧率输入首次真正进入低成本区间 |
| 动态视觉扰动 | 把 OCR 与 document knowledge learning 合流 | 减少 parser 依赖，降低复杂布局文档的数据工程成本 |
| Hybrid RL | short/long 模式联合训练优于只练长推理 | 把复杂任务能力留下来，同时抑制简单任务 verbosity |

### 与现有方法的关键区别

| 维度 | 常见多模态模型 | MiniCPM-V 4.5 | 为什么更好 |
|---|---|---|---|
| 视频编码 | 帧 token 很长，主要靠更大显存硬扛 | 3D-Resampler 做时空联合压缩 | 先减少无效冗余，再谈理解 |
| 文档学习 | 依赖 parser 转成 interleaved data | 直接从文档图像学 OCR + 知识 | 避免 parser 误差污染训练 |
| 推理模式 | 非想即想，要么全短要么全长 | short/long 双模式联合优化 | 不让简单题为复杂题买单 |

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐⭐⭐ | 模型与报告公开，但完整训练数据未完全开源，尤其文档/OCR构造细节仍有门槛。 |
| 代码可得性 | ⭐⭐⭐⭐ | 模型、代码、Hugging Face 权重都在，有较强落地可行性。 |
| 算力需求 | ⭐⭐⭐⭐ | 8B 体量本身友好，单机部署门槛明显低于多数同代 MLLM；但完整训练/后训练仍非个人级。 |
| 工程复杂度 | ⭐⭐⭐ | resampler、文档训练、hybrid RL 都有实现复杂度，但方向明确。 |
| 预期收益 | ⭐⭐⭐⭐⭐ | 对任何想做 video/document MLLM 且不想被成本拖死的团队都很有启发。 |

## 批判性分析

### 论文承认与隐含局限

1. 它主要证明“效率不掉太多能力”，但未完全回答超长视频、复杂交互式 agent 场景下的稳定性边界。
2. 统一 OCR/document 范式很漂亮，但如果真实企业 PDF 含有更重扫描噪声、表格旋转、手写混排，效果还需要更多外部验证。
3. Hybrid RL 的核心收益来自模式切换与 selective reward；但这也意味着 reward 设计质量对最终体验影响很大，泛化到别家模型未必即插即用。

### 我们的独立观察

- MiniCPM-V 4.5 的真正价值，在于它把“便宜模型也能打多模态”从部署口号推进到训练方法论。
- 这套路线对端侧/消费级 GPU 尤其重要，因为它瞄准的不是单次 benchmark 冠军，而是总拥有成本。
- 如果后续 MiniCPM 团队能把这套 3D-Resampler 思路迁到更强 agentic multimodal setting，它会比单纯刷图文榜更有产业穿透力。

## 对领域的影响

这篇报告不会像新架构那样马上改写研究方向，但它会持续影响“下一代开源 MLLM 应该把钱花在哪”。过去很多团队默认先冲更大的 vision encoder、更长上下文、更复杂 parser。MiniCPM-V 4.5 给出的答案相反：先压 token、先修文档学习路径、先让推理模式可控。对开源多模态生态来说，这是一条更务实、也更容易规模化扩散的路线。