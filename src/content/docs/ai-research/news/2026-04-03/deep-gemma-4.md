---
title: "Google Gemma 4 开源发布：每参数智能密度之王，Apache 2.0 许可证"
description: "Google DeepMind, Gemma 4, 开源模型, Apache 2.0, 31B, MoE, 边缘AI, Agentic"
---

# Gemma 4: Byte for byte, the most capable open models

> 原文链接：https://deepmind.google/models/gemma/gemma-4/
> 博客全文：https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/
> 作者：Clement Farabet（VP of Research, Google DeepMind）、Olivier Lacombe（Group Product Manager）
> 机构：Google DeepMind
> 发布日期：2026-04-02

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Google 发布最强开源模型家族 Gemma 4，基于 Gemini 3 技术，采用 Apache 2.0 许可证 |
| 大白话版 | Google 把自家最厉害的 AI 模型技术下放到开源版本，而且换成了真正的开源许可证，任何人都能免费商用 |
| 核心数字 | 31B 模型 Arena AI 开源 #3；AIME 2026 数学 89.2%；击败 20 倍大小的模型；400M+ 累计下载 |
| 评级 | **A** — 必读级发布。开源模型能力天花板的又一次提升，Apache 2.0 切换是对整个开源 AI 生态的重大利好 |
| 代码 | HuggingFace: google/gemma-4 / Kaggle: google/gemma-4 / Ollama: gemma4 |
| 关键词 | Gemma 4, 开源, Apache 2.0, 31B Dense, 26B MoE, E4B, E2B, 边缘计算, Agentic |

## 核心 Insight

Gemma 4 的核心叙事不是"又一个大模型"，而是 **"每参数智能密度"（intelligence-per-parameter）的极致追求 + 真正的开源许可证**。

这两点合在一起的意义是革命性的：

1. **能力密度**：31B 参数的 Gemma 4 在 Arena AI 排名全球开源 #3，击败了参数量 20 倍以上的模型。26B MoE 变体推理时只激活 3.8B 参数就能排到 #6。这意味着单张 H100（80GB）甚至消费级 GPU 就能运行世界级智能。

2. **Apache 2.0**：Gemma 3 时代的自定义许可证是社区的一大痛点——虽然免费但附带各种限制条款，企业法务团队对此心存疑虑。切换到 Apache 2.0 彻底消除了这个障碍，意味着：完全自由商用、可修改、可再分发、无需向 Google 报告、无需担心许可证变更风险。

3. **从云到端的完整覆盖**：四个尺寸（31B Dense → 26B MoE → E4B → E2B）覆盖从数据中心到树莓派的全场景，而且边缘模型（E2B/E4B）支持视觉+音频多模态输入。这不是一个模型，而是一个"可到处部署的 AI 引擎家族"。

### 为什么 Gemma 4 能用更少的参数做到更多？

从技术角度看，这得益于 Gemini 3 的研究成果下放：

- **更好的架构设计**：虽然 Google 没有公开 Gemma 4 的完整技术报告（截至发布日），但从 Gemini 3 的已知信息推断，更高效的注意力机制、改进的位置编码、优化的 FFN 结构都贡献了能力密度的提升
- **更高质量的训练数据**：Google 坐拥全球最大的网页索引+知识图谱+多语言数据，数据质量是能力密度的关键因素
- **MoE 架构的高效利用**：26B MoE 只需激活 3.8B 参数即可推理，本质上是用"专家路由"机制让不同类型的输入由不同的"专家子网络"处理，避免了密集模型中大量参数"空转"的浪费
- **从 Gemini 3 到 Gemma 4 的"蒸馏+优化"路径**：大模型的知识通过精心设计的训练流程压缩到小模型中，这比从零训练小模型效果好得多

## 模型规格与架构

### 完整模型家族

| 模型 | 参数量 | 推理激活参数 | 定位 | 上下文窗口 | 多模态 | Arena AI 排名 |
|---|---|---|---|---|---|---|
| **Gemma 4 31B Dense** | 31B | 31B | 旗舰，最高质量 | 256K | 视觉 | 开源 #3 (1452) |
| **Gemma 4 26B MoE (A4B)** | 26B | 3.8B | 速度优先，低延迟 | 256K | 视觉 | 开源 #6 (1441) |
| **Gemma 4 E4B** | — | ~4B | 移动端/IoT | 128K | 视觉+音频 | — |
| **Gemma 4 E2B** | — | ~2B | 超轻量边缘 | 128K | 视觉+音频 | — |

### 硬件需求映射

| 模型 | 最低硬件 | 推荐硬件 | 典型场景 |
|---|---|---|---|
| 31B Dense (bf16) | 单张 H100 80GB | H100/A100 | 服务端部署、微调基座 |
| 31B Dense (量化) | 消费级 GPU (24GB+) | RTX 4090 / 3090 | 本地 IDE 助手、Agent |
| 26B MoE | 同上，但更快 | 任何 24GB+ GPU | 低延迟 API 服务 |
| E4B | 手机/树莓派 | Pixel / 骁龙 8 系 | 端侧 Agent、离线助手 |
| E2B | IoT 设备 | Jetson Orin Nano | 嵌入式 AI |

### 关键能力特性

**高级推理与 Agentic 工作流：**
- 原生函数调用（function calling）：模型天然支持调用外部工具和 API
- 结构化 JSON 输出：直接生成符合 schema 的 JSON，无需后处理
- 原生系统指令（system instructions）：无需在 prompt 中模拟系统角色
- 多步规划与深度逻辑推理

**多模态能力：**
- 所有模型支持图像/视频输入（可变分辨率）
- E2B/E4B 额外支持音频输入（语音识别+理解）
- 擅长 OCR、图表理解等视觉任务

**多语言：**
- 原生训练覆盖 140+ 语言
- 不仅是翻译，还理解文化语境

## Benchmark 详细结果

| Benchmark | 测量内容 | 31B IT Thinking | 26B A4B IT Thinking | E4B IT Thinking | E2B IT Thinking | Gemma 3 27B IT |
|---|---|---|---|---|---|---|
| Arena AI (text) | 综合对话质量 | **1452** | **1441** | — | — | 1365 |
| MMLU | 多语言问答 | **85.2%** | 82.6% | 69.4% | 60.0% | 67.6% |
| MMMU Pro | 多模态推理 | **76.9%** | 73.8% | 52.6% | 44.2% | 49.7% |
| AIME 2026 | 数学竞赛题 | **89.2%** | 88.3% | 42.5% | 37.5% | 20.8% |
| LiveCodeBench v6 | 竞赛编程 | **80.0%** | 77.1% | 52.0% | 44.0% | 29.1% |
| GPQA Diamond | 科学知识 | **84.3%** | 82.3% | 58.6% | 43.4% | 42.4% |
| τ2-bench | Agent 工具使用 | **86.4%** | 85.5% | 57.5% | 29.4% | 6.6% |

**解读：**

- **数学能力飞跃**：AIME 2026 从 Gemma 3 的 20.8% 直接跳到 89.2%（+68.4pp），这不是渐进提升，是质变。即使是 26B MoE 也达到了 88.3%，表明数学推理能力不依赖于密集参数。

- **Agent 工具使用能力爆发**：τ2-bench 从 6.6% 到 86.4%（+79.8pp），Gemma 3 几乎不能做 Agent 任务，Gemma 4 直接成为顶级 Agent 基座。这是最具实际价值的提升——意味着 Gemma 4 可以直接用于构建自主 Agent。

- **编程能力翻倍有余**：LiveCodeBench 从 29.1% 到 80.0%（+50.9pp），直接进入竞赛级编程能力范围。

- **MoE 与 Dense 的性能差距极小**：26B MoE 在所有 benchmark 上仅比 31B Dense 低 1-3 个百分点，但推理时只用 3.8B 参数。这意味着在速度敏感的场景中，MoE 是更优选择。

### 与竞品的横向对比

| 模型 | 机构 | 参数量 | 开源许可 | AIME 2026 | LiveCodeBench v6 | Arena AI |
|---|---|---|---|---|---|---|
| **Gemma 4 31B** | Google | 31B | Apache 2.0 | 89.2% | 80.0% | 1452 |
| **Gemma 4 26B MoE** | Google | 26B (A4B) | Apache 2.0 | 88.3% | 77.1% | 1441 |
| Qwen3.6-Plus | 阿里 | <100B | 商用许可 | — | — | — |
| Llama 4 Scout | Meta | 109B (A17B) | Llama License | — | — | — |
| Llama 4 Maverick | Meta | 400B (A17B) | Llama License | — | — | — |
| Gemma 3 27B | Google | 27B | 自定义许可 | 20.8% | 29.1% | 1365 |

**注：** Qwen3.6-Plus 和 Llama 4 的部分 benchmark 数据缺失或不可直接对比。Arena AI 排名 Gemma 4 31B 为开源 #3，击败了包括 Llama 4 Maverick（400B）在内的大模型。

## 生态系统与工具链

### Day-1 支持的框架和平台

| 类别 | 工具 |
|---|---|
| 推理引擎 | vLLM, llama.cpp, SGLang, NVIDIA NIM, LiteRT-LM |
| 本地运行 | Ollama, LM Studio, MLX |
| 训练/微调 | HuggingFace TRL, Keras, Unsloth, NeMo |
| 前端集成 | Transformers.js, Candle |
| 云平台 | Vertex AI, Cloud Run, GKE |
| 移动端 | AICore Developer Preview, ML Kit GenAI |
| 硬件平台 | NVIDIA (Jetson → Blackwell), AMD ROCm, Google TPU (Trillium/Ironwood) |

### 下载与快速开始

```bash
# Ollama（最简单）
ollama run gemma4

# HuggingFace
# pip install transformers
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained("gg-hf-gg/gemma-4-31B-it")

# Google AI Studio（在线体验）
# https://aistudio.google.com/prompts/new_chat?model=gemma-4-31b-it
```

## Apache 2.0 许可证的意义

这次许可证变更值得单独分析，因为它对整个开源 AI 生态的影响可能比模型本身更深远。

### 许可证对比

| 维度 | Gemma 3 自定义许可 | Gemma 4 Apache 2.0 | Llama License |
|---|---|---|---|
| 商业使用 | ✅ 但有条件 | ✅ 完全自由 | ✅ 但有月活限制 |
| 修改/再分发 | ✅ 但需保留条款 | ✅ 完全自由 | ✅ 但需保留归属 |
| 专利授权 | 有限 | ✅ 明确授予 | 有限 |
| 法务友好度 | 中等（需审阅） | ⭐⭐⭐⭐⭐（标准许可） | 中等 |
| 社区接受度 | 争议较大 | 广泛欢迎 | 争议中等 |

### 为什么 Apache 2.0 是"金标准"？

1. **企业法务零摩擦**：Apache 2.0 是全球最被广泛理解和接受的开源许可证之一，几乎所有企业的法务部门都已审阅过，不需要额外的许可证审查流程
2. **明确的专利授权**：Apache 2.0 包含明确的专利授权条款，保护使用者不会因使用模型而遭到专利诉讼
3. **真正的"数字主权"**：Google 在博客中强调 "digital sovereignty"——各国政府和企业可以完全掌控自己的数据、基础设施和模型，无需依赖 Google 的许可
4. **社区信号效应**：Google 明确写了 "You gave us feedback, and we listened"——这向社区传递了积极信号，可能推动 Meta 等也考虑更宽松的许可

## 批判性分析

### 局限性

1. **缺少完整技术报告**：截至发布日，Google 没有公开 Gemma 4 的完整技术报告（仅有 model card）。对于一个声称"每参数最聪明"的模型，缺少训练细节（数据混合、训练策略、架构改进）是一个遗憾。这使得独立验证其声明更加困难。

2. **Benchmark 选择性展示**：官方只展示了最有利的 benchmark 结果。在某些任务（如长上下文检索、代码完成等具体工程任务）上的表现可能不如数字看起来那么亮眼。社区独立评测的结果可能会揭示不同的画面。

3. **边缘模型（E2B/E4B）的实际可用性**：虽然声称支持"从手机到树莓派"，但在实际部署中，E2B 的 2B 有效参数在复杂任务上的能力仍然有限。128K 上下文在 2GB RAM 设备上是否真能保持性能？

4. **Thinking 模式的依赖性**：所有 benchmark 数字都标注了 "IT Thinking"（带推理链的版本），这意味着模型需要生成额外的推理 token 来达到这些分数。实际延迟和成本会比"裸"推理高很多。没有 Thinking 模式的 benchmark 数字缺失。

### 适用边界

- **最佳场景**：需要高质量推理的本地/私有部署、Agent 工作流、多语言应用、边缘设备 AI
- **不适用场景**：需要超长上下文（>256K）的任务、需要最高保密级别的政府应用（虽然有 Sovereign Cloud 选项）、需要自定义模态的特殊任务

### 独立观察

- **Gemma 4 vs Qwen3.6-Plus 的赛道碰撞**：两者在同一天发布，都主打"小模型大能力"+编程+Agent。Qwen3.6-Plus 拿出 100 万上下文的杀手锏，Gemma 4 拿出 Apache 2.0+更完整的尺寸矩阵。这是 2026 年开源模型赛道最精彩的正面对决。

- **Google 的"开源-闭源双引擎"战略**：Gemma 4 与 Gemini 3 形成互补——开源版本吸引社区和生态，闭源版本在 Cloud 上变现。这比 Meta 的纯开源策略（缺乏 API 营收）和 OpenAI 的纯闭源策略（缺乏社区生态）都更可持续。

- **400M 下载量 + 10 万社区变体的生态飞轮**：Gemma 已经形成了强大的社区生态——微调版本、领域特化版本（如保加利亚语 BgGPT、癌症治疗发现 Cell2Sentence-Scale）。Apache 2.0 将进一步加速这个飞轮。

### 对领域的影响

**短期（1-3 个月）：** 开源社区将涌现大量 Gemma 4 微调版本。在 HuggingFace Trending 上预计会持续霸榜数周。Ollama / LM Studio 用户将大规模迁移到 Gemma 4。

**中期（3-12 个月）：** Gemma 4 将成为 Agent 框架（LangChain、AutoGPT 等）的默认开源选择之一。边缘部署（手机、IoT）将进入实用阶段。Apache 2.0 可能推动 Meta 在 Llama 5 时采用更开放的许可。

**长期（1-2 年）：** "每参数智能密度"的竞赛将加速——这比"参数量竞赛"对实际应用更有价值。如果 Gemma 4 的社区微调版本能在特定垂直领域达到 GPT-5 级别，将彻底改变 AI 产业的成本结构。
