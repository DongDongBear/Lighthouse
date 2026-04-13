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

---

## 附录：Gemma 4 31B vs 闭源主力模型全面横评

> 数据来源：OpenAI / Anthropic / Google 官方技术报告及模型卡（2025–2026）、Berkeley BFCL、SWE-bench.com、LiveCodeBench、GAIA HuggingFace Leaderboard、lmarena.ai Chatbot Arena
> 标注说明：⚠️ = 社区估算或非官方数据；† = 扩展思考/Thinking 模式下的分数；✓ = 官方数据

### 为什么要把 Gemma 4 31B 和闭源模型放在一起比？

因为 Google 自己说了——"Byte for byte, the most capable open models"。这句话的潜台词是：我们不仅在开源里赢，我们要和闭源旗舰一起比。

那就来比。

### 重要前提：Standard vs Thinking 模式

Gemma 4 的官方发布数字用的是 **"IT Thinking"（开启推理链）**模式，其他闭源模型里也存在类似情况（Claude 的 Extended Thinking、o3/o4-mini 的 Reasoning 模式、Gemini 2.5 系列的 Thinking Budget）。

为了公平，本节对每个关键 benchmark 都同时提供两种条件的对比：**标准模式**（不开启推理链）和**最佳模式**（模型允许的最强推理设置）。

---

### 一、科学推理：GPQA Diamond

> 测量内容：博士级科学问题（物理/化学/生物），代表模型的"硬知识推理"上限。

| 模型 | GPQA Diamond | 条件 | 数据来源 |
|---|:---:|---|---|
| **Gemma 4 31B** | **53.7%** | 标准 IT | 官方（HuggingFace 模型卡）✓ |
| **Gemma 4 31B Thinking** | **84.3%** | IT + Thinking | 官方（Google 发布博客）✓ |
| GPT-4o | 53.6% | 标准 | 官方（OpenAI）✓ |
| GPT-4.1 | 66.3% | 标准 | 官方（OpenAI）✓ |
| o4-mini | 81.4% | Reasoning | 官方（OpenAI System Card）✓ |
| o3 | **87.7%** | Reasoning | 官方（OpenAI System Card）✓ |
| Claude 3.7 Sonnet | 68.0% | 标准 | 官方（Anthropic）✓ |
| Claude 3.7 Sonnet | 84.8% | Extended Thinking† | 官方（Anthropic）✓ |
| Claude Sonnet 4 | 80.0% | 标准 | 官方（Anthropic）✓ |
| Claude Sonnet 4.5 | **84.2%** | 标准 | 官方（Anthropic）✓ |
| Gemini 2.5 Flash | 72.0% | Thinking | 官方（Google）✓ |
| Gemini 2.5 Pro | **86.4%** | Thinking | 官方（Google DeepMind）✓ |
| Gemini 2.0 Flash | 62.1% | 标准 | 官方（Google）✓ |

**解读：**

- **标准模式**：Gemma 4 31B（53.7%）和 GPT-4o（53.6%）几乎并列，是 GPT-4o 级别的科学推理能力。但 GPT-4.1 已经达到 66.3%，比 Gemma 4 31B 高出约 13pp。
- **Thinking 模式**：Gemma 4 31B 开启 Thinking 后跳到 84.3%，直接进入 Claude Sonnet 4.5（84.2%）和 Claude 3.7 Thinking（84.8%）的梯队，比 Claude Sonnet 4（80.0%）还略高，但仍然低于 Gemini 2.5 Pro（86.4%）和 o3（87.7%）。
- **核心结论**：在 GPQA 这个维度，Gemma 4 31B Thinking ≈ Claude Sonnet 4.5（标准），作为开源模型意义重大。

---

### 二、数学能力：AIME 2024 / AIME 2026

> AIME 是美国最高级别数学竞赛题。AI 模型在此的得分从 2023 年几乎接近 0，到 2025 年已经"制霸"人类竞赛选手。

| 模型 | AIME 2024 | AIME 2025/2026 | 条件 | 数据来源 |
|---|:---:|:---:|---|---|
| **Gemma 4 31B** | 16.7% | — | 标准 IT | 官方（HuggingFace 模型卡）✓ |
| **Gemma 4 31B Thinking** | — | **89.2%**（AIME 2026）| IT + Thinking | 官方（Google 发布博客）✓ |
| GPT-4o | 9.3% | — | 标准 | 官方（OpenAI）✓ |
| GPT-4.1 | 26.7% | — | 标准 | 官方（OpenAI）✓ |
| o4-mini | 93.4% | **92.7%** | Reasoning | 官方（OpenAI System Card）✓ |
| o3 | **96.7%** | 88.9% | Reasoning | 官方（OpenAI System Card）✓ |
| Claude 3.7 Sonnet | 16.0% | — | 标准 | 官方（Anthropic）✓ |
| Claude 3.7 Sonnet | **80.0%** | 80.0% | Extended Thinking† | 官方（Anthropic）✓ |
| Claude Sonnet 4 | — | 55.0% | 标准 | 官方（Anthropic）✓ |
| Claude Sonnet 4.5 | — | 72.0% | 标准 | 官方（Anthropic）✓ |
| Gemini 2.5 Flash | — | 73.3% | Thinking | 官方（Google）✓ |
| Gemini 2.5 Pro | — | **86.7%** | Thinking | 官方（Google DeepMind）✓ |
| Gemini 2.0 Flash | 22.0% | — | 标准 | 官方（Google）✓ |

**解读：**

- **标准模式的分水岭极其明显**：Claude 3.7（16%）、Gemma 4 31B（16.7%）、GPT-4.1（26.7%）——这三者在标准模式下都"不会做"AIME 题。这说明不开推理链，2026 年旗舰模型对顶级数学题依然力不从心。
- **Thinking 模式把格局完全扭转**：Gemma 4 31B Thinking（89.2% AIME 2026）直接超过 Gemini 2.5 Pro（86.7%），跟 o3（88.9%）几乎持平。这是本次发布最令人震惊的数字——一个 31B 开源模型在数学推理上比肩 OpenAI 旗舰推理模型？
- ⚠️ **重要注意**：Google 使用的是 AIME **2026** 数据，其他模型多用 AIME 2024/2025，难度和评测协议存在差异，不能直接做等号比较。即便如此，AIME 2026 89.2% 仍然是一个非常强烈的信号。

---

### 三、编程能力：LiveCodeBench v5/v6 / HumanEval

> LiveCodeBench 基于竞赛平台实时题目，比 HumanEval 更难伪造、更贴近真实能力。

| 模型 | LiveCodeBench | HumanEval | 条件 | 数据来源 |
|---|:---:|:---:|---|---|
| **Gemma 4 31B** | 50.0%（v5）| 82.9% | 标准 IT | 官方（HuggingFace 模型卡）✓ |
| **Gemma 4 31B Thinking** | **80.0%**（v6）| — | IT + Thinking | 官方（Google 发布博客）✓ |
| GPT-4o | 32.3% | 90.2% | 标准 | 官方（OpenAI）✓ |
| GPT-4.1 | 54.4% | — | 标准 | 官方（OpenAI）✓ |
| o4-mini | 79.0% | ~93% ⚠️ | Reasoning | 官方/社区 |
| o3 | **82.1%** | ~95% ⚠️ | Reasoning | 官方/社区 |
| Claude 3.7 Sonnet | 55.6% | — | 标准 | 第三方（LiveCodeBench）✓ |
| Claude Sonnet 4.5 | 64.2% | — | 标准 | 官方（Anthropic）✓ |
| Gemini 2.5 Flash | 57.8% | — | Thinking | 官方（Google）✓ |
| Gemini 2.5 Pro | 70.4% | — | Thinking | 官方（Google DeepMind）✓ |
| Gemini 2.0 Flash | 34.5% | 89.7% | 标准 | 官方（Google）✓ |

**解读：**

- **标准模式**：Gemma 4 31B（50.0%）> GPT-4o（32.3%），约与 GPT-4.1（54.4%）接近。这个数字意味着 Gemma 4 的代码能力已经是 GPT-4.1 级别的，只是 LiveCodeBench 版本号有差异（v5 vs v6）。
- **Thinking 模式**：80.0% 直追 o3（82.1%）和 o4-mini（79.0%），大幅超越 Gemini 2.5 Pro（70.4%）和 Claude Sonnet 4.5（64.2%）。
- **HumanEval 的局限性**：GPT-4o 的 90.2% 其实比 Gemma 4 的 82.9% 高，但 HumanEval 题目已经被训练数据污染，LiveCodeBench 才是更可信的编程能力指标。

---

### 四、代码 Agent：SWE-bench Verified

> 在真实 GitHub issue 上修复 bug，是代码 Agent 能力的金标准。

| 模型 | SWE-bench Verified | 条件 | 数据来源 |
|---|:---:|---|---|
| **Gemma 4 31B** | — | — | **无官方数据** |
| GPT-4o | 38.8% | 标准 | 官方（OpenAI）✓ |
| GPT-4.1 | 54.6% | 标准 | 官方（OpenAI）✓ |
| o4-mini | 68.1% | Reasoning | 官方（OpenAI）✓ |
| o3 | 71.7% | Reasoning | 官方（OpenAI）✓ |
| Claude 3.7 Sonnet | 62.3% / 70.3%† | 标准/Thinking | 官方（Anthropic）✓ |
| Claude Sonnet 4 | 72.7% | 标准 | 官方（Anthropic）✓ |
| Claude Sonnet 4.5 | **75.1%** | 标准 | 官方（Anthropic）✓ |
| Gemini 2.5 Flash | 38.0% | 标准 | 官方（Google）✓ |
| Gemini 2.5 Pro | 63.8% | 标准 | 官方（Google DeepMind）✓ |
| Gemini 2.0 Flash | 38.6% | 标准 | 官方（Google）✓ |

**解读：**

- **Gemma 4 31B 没有 SWE-bench 官方数据**，这是一个值得注意的缺失。Google 在发布时选择了 τ2-bench（自家 Agent 基准）而非 SWE-bench，可能原因是 SWE-bench 更依赖工具链集成（代码执行、文件操作），而不是纯语言能力。
- 闭源模型里，**Claude 系列在 SWE-bench 上碾压 Gemini 系列**——Gemini 2.5 Pro（63.8%）vs Claude Sonnet 4.5（75.1%），差距超过 11pp。这也是 Claude 被普遍认为是"代码 Agent 最强"的核心数据来源。
- **GPT-4.1 vs Claude 3.7 的对比很有意思**：GPT-4.1 标准模式（54.6%）< Claude 3.7 标准模式（62.3%），说明在代码 Agent 任务上 Claude 的优势不只来自推理链。

---

### 五、工具调用与 Agent 能力：τ2-bench / BFCL / GAIA

#### 5.1 τ2-bench（Google 内部 Agent 基准）

这是 Google 专门为 Agentic 工作流设计的评测，测试模型在多步骤工具使用场景下的表现。

| 模型 | τ2-bench | 条件 |
|---|:---:|---|
| **Gemma 4 31B Thinking** | **86.4%** | IT + Thinking |
| **Gemma 4 26B MoE Thinking** | 85.5% | IT + Thinking |
| **Gemma 3 27B IT** | 6.6% | 标准 IT |

> ⚠️ 注：τ2-bench 目前**只有 Google 内部数据**，缺乏对 Claude/GPT/Gemini 系列的横向对比结果。但 86.4% 的绝对值和 Gemma 3 的 6.6% 之间的跳跃（+79.8pp）说明 Gemma 4 的 Agentic 能力是质的突破。

#### 5.2 BFCL v3（Berkeley Function Calling Leaderboard）

测试模型按照 JSON Schema 准确调用工具的能力。

| 模型 | BFCL Overall | 数据来源 |
|---|:---:|---|
| **Gemma 4 31B** | — | 暂无数据 |
| GPT-4.1 | **79.3%** | 第三方（Berkeley）✓ |
| Claude 3.7 Sonnet | 74.5% | 第三方（Berkeley）✓ |
| GPT-4o | 72.0% | 第三方（Berkeley）✓ |
| Gemini 2.5 Pro | 71.2% | 第三方（Berkeley）✓ |
| Gemini 2.0 Flash | 69.8% | 第三方（Berkeley）✓ |

#### 5.3 GAIA（通用 AI 助手真实任务）

测试模型完成真实世界多步骤任务（搜索 + 文件处理 + 推理组合）。

| 模型 | GAIA (test avg) | 数据来源 |
|---|:---:|---|
| **Gemma 4 31B** | — | 暂无数据 |
| Gemini 2.5 Pro | **72.0%** | 官方/第三方✓ |
| o3 | 67.6% | 官方（OpenAI）✓ |
| GPT-4.1 | 54.4% | 第三方（HF Leaderboard）✓ |
| Claude 3.7 Sonnet | 49.3% | 第三方（HF Leaderboard）✓ |
| GPT-4o | ~38% ⚠️ | 社区估算 |

**综合 Agent 能力解读：**

- Gemma 4 在 BFCL 和 GAIA 上目前均无官方数据，这是一个真实的信息缺口。
- Gemini 2.5 Pro 在 GAIA 上遥遥领先（72%），核心原因是其原生 Google Search 工具集成——多步骤信息检索任务对原生搜索能力的依赖极高。
- GPT-4.1 以 Strict Mode 函数调用为核心优势，在 BFCL 排名第一（79.3%）。

---

### 六、综合对话质量：Chatbot Arena ELO

> 来源：[lmarena.ai](https://lmarena.ai) 人类盲评排行榜，数据约为 2025 年中期

| 排名（全模型） | 模型 | Arena ELO | 说明 |
|:---:|---|:---:|---|
| 1 | Gemini 2.5 Pro | **1422** | 全球第一 |
| 2 | o3 | 1383 | |
| 3 | GPT-4.1 | 1369 | |
| 4 | Claude Sonnet 4.5 | 1359 | |
| 5 | Gemini 2.5 Flash | 1345 | |
| 6 | Claude 3.7 Sonnet | 1316 | |
| 7 | GPT-4o | 1285 | |
| **开源 #3** | **Gemma 4 27B（31B）** | **~1270** ⚠️ | 开源模型中位居前列 |
| 8 | Gemini 2.0 Flash | 1228 | |

**解读：**

- Gemma 4 在全模型榜的绝对位置（~1270）低于所有闭源旗舰（1285-1422），但是领先 Gemini 2.0 Flash。
- 在**开源模型专榜**上，Gemma 4 31B 是 #3（1452 Arena AI 开源榜分），击败了 Llama 4 Maverick（400B）和 Qwen3.6-Plus 等对手。这是 Google 原文"开源 #3"的数据来源——两个榜单用的是不同评分体系，不能混用。

---

### 七、价格与性价比全景

| 模型 | 输入价格 | 输出价格 | 上下文窗口 | 定价类型 |
|---|:---:|:---:|:---:|---|
| **Gemma 4 31B** | **免费**（自托管）/ $0.35 | **免费** / $1.05 | 128K | 开源权重；Vertex AI 商用定价 |
| Gemini 2.0 Flash | $0.10 | $0.40 | 1M | 最低成本商用 API |
| Gemini 2.5 Flash | $0.15 | $0.60–$3.50 | 1M | 非思考/思考输出差价 |
| GPT-4o | $2.50 | $10.00 | 128K | |
| GPT-4.1 | $2.00 | $8.00 | 1M | 缓存输入 $0.50 |
| Claude 3.7 / Sonnet 4 / 4.5 | $3.00 | $15.00 | 200K | 三版本同价 |
| Gemini 2.5 Pro | $1.25–$2.50 | $10.00–$15.00 | 1M | 按 token 量分段计费 |
| o4-mini | $1.10 | $4.40 | 200K | |
| o3 | $10.00 | $40.00 | 200K | 最贵 |

**关键性价比洞察：**

1. **Gemma 4 31B 的成本优势是结构性的**：自托管情况下边际成本接近零（只有算力成本）。对于私有化部署需求，这不是"便宜一点"，而是"商业模型完全另一个量级"。

2. **GPT-4o 与 Gemma 4 31B Thinking 的能力比较**：两者 GPQA 分数几乎持平（标准模式），但 GPT-4o 要收 $2.50/$10，Gemma 4 可以免费自托管。

3. **Gemini 2.5 Flash（$0.15/$0.60）是商用 API 里性价比最高的方案**：GPQA 72%、AIME 73.3%、SWE-bench 38%，而且有 1M token 上下文，Thinking 模式按需付费。

4. **Claude 系列三版本同价（$3/$15）**：Claude 3.7 → Sonnet 4 → Sonnet 4.5 性能在持续提升，但定价不变，说明 Anthropic 的策略是"锁定中端市场"。

5. **o3（$10/$40）的使用场景**：成本是 Claude 的 3-4 倍，适合对推理质量极度敏感且任务量不大的场景（复杂规划、一次性分析）。

---

### 八、综合横评表（全维度速览）

> ✓ = 官方数据；⚠️ = 估算；† = 扩展思考/Thinking 模式；— = 无公开数据

| 模型 | GPQA ◆ | AIME 2025 | LiveCode | SWE-bench | BFCL | GAIA | Arena ELO | 价格（in/out） | 上下文 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Gemma 4 31B（标准）** | 53.7%✓ | —  | 50.0%✓ | — | — | — | ~1270⚠️ | **开源/$0.35/$1.05** | 128K |
| **Gemma 4 31B（Thinking）** | **84.3%**✓† | **89.2%**✓†‡ | **80.0%**✓† | — | — | — | — | 同上 | 128K |
| GPT-4o | 53.6%✓ | — | 32.3%✓ | 38.8%✓ | 72.0%✓ | ~38%⚠️ | 1285✓ | $2.50/$10 | 128K |
| GPT-4.1 | 66.3%✓ | — | 54.4%✓ | 54.6%✓ | **79.3%**✓ | 54.4%✓ | 1369✓ | $2/$8 | 1M |
| o4-mini | 81.4%✓ | **92.7%**✓ | 79.0%✓ | 68.1%✓ | — | 62.0%⚠️ | — | $1.10/$4.40 | 200K |
| o3 | **87.7%**✓ | 88.9%✓ | **82.1%**✓ | 71.7%✓ | — | 67.6%✓ | 1383✓ | $10/$40 | 200K |
| Claude 3.7 Sonnet | 68.0%/84.8%†✓ | 80.0%†✓ | 55.6%✓ | 62.3%/70.3%†✓ | 74.5%✓ | 49.3%✓ | 1316✓ | $3/$15 | 200K |
| Claude Sonnet 4 | 80.0%✓ | 55.0%✓ | ~64%⚠️ | 72.7%✓ | — | — | — | $3/$15 | 200K |
| Claude Sonnet 4.5 | 84.2%✓ | 72.0%✓ | 64.2%✓ | **75.1%**✓ | — | — | 1359✓ | $3/$15 | 200K |
| Gemini 2.5 Flash | 72.0%✓ | 73.3%✓ | 57.8%✓ | 38.0%✓ | 71.2%⚠️ | — | 1345✓ | $0.15/$0.60 | 1M |
| Gemini 2.5 Pro | **86.4%**✓ | 86.7%✓ | 70.4%✓ | 63.8%✓ | — | **72.0%**✓ | **1422**✓ | $1.25/$10 | 1M |
| Gemini 2.0 Flash | 62.1%✓ | — | 34.5%✓ | 38.6%✓ | 69.8%✓ | — | 1228✓ | $0.10/$0.40 | 1M |

> ‡ Google 使用 AIME 2026 题目，其他模型多用 AIME 2024/2025，难度体系略有不同。

---

### 九、基于数据的定性结论

**Gemma 4 31B 的真实位置：**

| 维度 | Gemma 4 31B 的水平 | 闭源参照点 |
|---|---|---|
| 标准科学推理（GPQA） | GPT-4o 级别 | 比 GPT-4.1 差 12pp |
| Thinking 科学推理（GPQA） | Claude Sonnet 4.5 / Claude 3.7 Thinking 级别 | 比 Gemini 2.5 Pro 差 2pp |
| 数学（AIME，Thinking） | 接近 Gemini 2.5 Pro 级别 | 仅次于 o3/o4-mini |
| 编程（LiveCode，Thinking） | o4-mini 级别 | 超越 Gemini 2.5 Pro |
| 代码 Agent（SWE-bench） | **无数据，无法评估** | Claude 系列领先 |
| 工具调用 / Agent（BFCL/GAIA） | **无数据，无法评估** | Gemini 2.5 Pro + GPT-4.1 领先 |
| 对话质量（Arena） | 介于 GPT-4o 和 Gemini 2.0 Flash 之间 | 全闭源旗舰之下 |
| 价格 | **开源完全免费** | 最贵的 o3 贵出 28x（如用 Vertex AI 定价算） |

**三条最核心的结论：**

1. **Gemma 4 31B Thinking 是目前最强的开源数学/科学推理模型**：在 GPQA 和 AIME 上达到或超越 Claude Sonnet 4.5 标准模式，与 Gemini 2.5 Pro（闭源旗舰）差距在 2pp 以内。这一点已经超出了很多人的预期。

2. **代码 Agent 能力存在显著数据空白**：Google 没有提供 SWE-bench、BFCL、GAIA 的官方数字。这不一定意味着 Gemma 4 在这些方面表现差，但作为一个声称"顶级 Agent 能力"的模型，缺乏最权威的 Agent 基准数据，让"Agent 能力爆发"的叙事无法被独立验证。

3. **性价比是无法竞争的护城河**：对于私有化部署需求，任何闭源方案都无法在价格上与开源权重竞争。问题从来不是"Gemma 4 够不够好"，而是"它在哪些场景好到足够用"。答案已经很清楚：数学、科学推理、编程——够用，而且价格差出一个数量级。

---

*数据来源与完整引用：[OpenAI GPT-4.1 发布](https://openai.com/index/gpt-4-1/) · [o3/o4-mini System Card](https://openai.com/index/o3-and-o4-mini-system-card/) · [Anthropic Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet) · [Google Gemini 2.5 Pro](https://deepmind.google/technologies/gemini/pro/) · [Gemma 4 HuggingFace 模型卡](https://huggingface.co/google/gemma-4-31b-it) · [Berkeley BFCL](https://gorilla.cs.berkeley.edu/leaderboard.html) · [SWE-bench](https://www.swebench.com) · [LiveCodeBench](https://livecodebench.github.io) · [GAIA Leaderboard](https://huggingface.co/spaces/gaia-benchmark/leaderboard) · [Chatbot Arena](https://lmarena.ai)*
