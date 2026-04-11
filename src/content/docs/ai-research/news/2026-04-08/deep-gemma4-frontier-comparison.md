---
title: "Gemma 4 31B vs 闭源主力全面横评：GPT / Claude / Gemini 数据对比"
description: "Gemma 4 31B 与 GPT-4o、GPT-4.1、o3、o4-mini、Claude 3.7/Sonnet 4/4.5、Gemini 2.0/2.5 Flash/Pro 在 GPQA、AIME、MMLU、LiveCodeBench、SWE-bench、Chatbot Arena 上的全维度数据对比，含价格与上下文窗口"
---

# Gemma 4 31B vs 闭源主力全面横评：GPT / Claude / Gemini 数据对比

> 数据来源：OpenAI / Anthropic / Google 官方技术报告（2025–2026）、HuggingFace Gemma 4 Blog、Berkeley BFCL、SWE-bench.com、lmarena.ai Chatbot Arena
> 写作时间：2026-04-03
> 标注：【官方】= 提供商官方页面；【第三方】= 独立评测；⚠️ = 估算值

## 速查卡

| 项目 | 内容 |
|---|---|
| 对比主角 | Gemma 4 31B（开源）vs 闭源主力 10 款 |
| 核心结论 | Thinking 模式下进入顶级梯队；代码 Agent 数据缺失；价格优势结构性不可复制 |
| 关键 Benchmark | GPQA / AIME / MMLU / LiveCodeBench / SWE-bench / Arena ELO |

---

## 前言：Google 自己定了比较对象

Google 发布 Gemma 4 时用了一句话定位——**"Byte for byte, the most capable open models."**

不是"开源里最强"，而是"每个参数产出最高"。潜台词很清楚：我们要跟闭源旗舰比。

那就来比。本文覆盖 10 款主力闭源模型，在 6 大 Benchmark 维度完整对比，附价格和上下文窗口数据，所有数字注明来源。

---

## 重要前提：Standard vs Thinking 模式

Gemma 4 的官方发布数字使用 **"IT Thinking"**（开启推理链）模式。闭源阵营也有类似设定：Claude 的 Extended Thinking、o3/o4-mini 的 Reasoning、Gemini 2.5 的 Thinking Budget。

**每个 Benchmark 同时列出两个条件：**
- **标准模式**：不开推理链，考察模型基础能力
- **最佳模式**：允许的最强推理设置，考察天花板

---

## 一、科学推理：GPQA Diamond

> 博士级科学问题（物理/化学/生物），代表模型硬知识推理上限。人类专家均值约 70%。

| 模型 | GPQA Diamond | 条件 | 来源 |
|---|:---:|---|---|
| **Gemma 4 31B** | **84.3%** | IT + Thinking | 【官方】HuggingFace Gemma 4 Blog |
| GPT-4o | 53.6% | 标准 | 【官方】OpenAI 技术报告 |
| GPT-4.1 | 62.3% | 标准 | 【官方】OpenAI 发布页 2025.04 |
| o4-mini | 79.3% | Reasoning | 【官方】OpenAI 技术报告 2025.04 |
| o3 | **87.7%** | Reasoning | 【官方】OpenAI 技术报告 2025.04 |
| Claude 3.7 Sonnet | 84.8% | Extended Thinking | 【官方】Anthropic 发布页 |
| Claude Sonnet 4 | 70.0% | 标准 | 【官方】anthropic.com/news/claude-4 |
| Claude Sonnet 4.5 | 83.4% | Extended Thinking | 【官方】Anthropic 发布页 |
| Gemini 2.0 Flash | 61.7% | 标准 | 【官方】Google 技术报告 |
| Gemini 2.5 Flash | 82.8% | Thinking | 【官方】Google DeepMind |
| Gemini 2.5 Pro | **86.4%** | Thinking | 【官方】Google DeepMind |

**解读：**

标准模式的分水岭非常清晰——GPT-4o（53.6%）、GPT-4.1（62.3%）、Claude Sonnet 4（70.0%）、Gemini 2.0 Flash（61.7%），这是"不开推理链"时普通旗舰的天花板。

开启推理链后，Gemma 4 31B 的 84.3% 直接进入顶级梯队：Claude 3.7 Thinking（84.8%）≈ Gemma 4 Thinking（84.3%）≈ Claude Sonnet 4.5（83.4%）≈ Gemini 2.5 Flash Thinking（82.8%）。比 Claude Sonnet 4 标准模式高出整整 14pp。

与此同时，Gemini 2.5 Pro（86.4%）和 o3（87.7%）仍然领先约 2-3pp，是当前的绝对上限。

---

## 二、数学能力：AIME 2024 / 2025 / 2026

> AIME 是美国最高级别数学竞赛。人类参赛者均值约 15-20%，顶尖选手约 50-60%。AI 在 2024 年后开始全面超越人类参赛者均值。

| 模型 | AIME 2024 | AIME 2025/2026 | 条件 | 来源 |
|---|:---:|:---:|---|---|
| **Gemma 4 31B** | — | **89.2%**（AIME 2026）| IT + Thinking | 【官方】HuggingFace Gemma 4 Blog |
| GPT-4o | 13.4% | ~20%⚠️ | 标准 | 【官方】OpenAI 技术报告 |
| GPT-4.1 | — | ~50%⚠️ | 标准 | 【估算】基于 OpenAI 发布对比 |
| o4-mini | — | **93.4%** | Reasoning | 【官方】OpenAI 技术报告 2025.04 |
| o3 | — | 83.3% | Reasoning | 【官方】OpenAI 技术报告 2025.04 |
| Claude 3.7 Sonnet | ~60% | — | Extended Thinking | 【官方】Anthropic 研究页 |
| Claude Sonnet 4 | — | 33.1% | 标准 | 【官方】anthropic.com/news/claude-4 |
| Claude Sonnet 4.5 | — | **87.0%** | Extended Thinking | 【官方】Anthropic 发布页 |
| Gemini 2.0 Flash | — | ~25%⚠️ | 标准 | 【估算】 |
| Gemini 2.5 Flash | — | 72.0% | no tools | 【官方】Google DeepMind |
| Gemini 2.5 Pro | — | 88.0% | no tools | 【官方】Google DeepMind |

**解读：**

这里有一个非常重要的方法论说明：**Gemma 4 用的是 AIME 2026 题目，其他模型多用 AIME 2024/2025，难度体系不同，不能直接画等号。**

即便如此，Gemma 4 31B Thinking（89.2%）与 Gemini 2.5 Pro（88.0%）、Claude Sonnet 4.5 Thinking（87.0%）处于同一梯队，超过了 o3（83.3%）。o4-mini 的 93.4% 是当前最高点。

标准模式下，Claude Sonnet 4 仅 33.1%、GPT-4.1 约 50%——说明不开推理链的主力模型在顶级数学竞赛面前依然力不从心。Gemma 4 31B 标准模式没有公布 AIME 数字，但从 HumanEval 和 LiveCodeBench 的标准/Thinking 差距来看，标准模式预计也在 20-30% 左右。

---

## 三、知识广度：MMLU / MMMLU

> MMLU 测试多学科知识（大学水平），MMMLU 是多语言版本。注意各家测试协议有差异，直接对比需谨慎。

| 模型 | 分数 | 类型 | 来源 |
|---|:---:|---|---|
| **Gemma 4 31B** | 85.2% | MMLU Pro | 【官方】HuggingFace Blog |
| GPT-4o | 88.7% | MMLU | 【官方】OpenAI 技术报告 |
| GPT-4.1 | 89.0% | MMLU | 【官方】OpenAI 发布页 2025.04 |
| o3 | **90.2%** | MMLU | 【官方】OpenAI 技术报告 2025.04 |
| o4-mini | 87.4% | MMLU | 【官方】OpenAI 技术报告 2025.04 |
| Claude 3.7 Sonnet | 87.0% | MMLU | 【估算】基于 Anthropic 发布对比 |
| Claude Sonnet 4 | 85.4% | MMMLU（无 ET）| 【官方】anthropic.com/news/claude-4 |
| Claude Sonnet 4.5 | 77.8% | MMMLU（14语言）| 【官方】Anthropic 发布页 |
| Gemini 2.0 Flash | 89.7% | MMLU | 【官方】Google 技术报告 |
| Gemini 2.5 Flash | 79.2% | MMMLU | 【官方】Google DeepMind |
| Gemini 2.5 Pro | 83.6% | MMMLU | 【官方】Google DeepMind |

**解读：**

MMLU 这个维度有较大的测试协议差异——MMLU、MMLU Pro、MMMLU 难度不同，直接比较数字需要谨慎。Gemma 4 的 85.2%（MMLU Pro）在这个维度处于中等偏上水平，与 Claude Sonnet 4（85.4%）非常接近。GPT-4.1（89.0%）和 o3（90.2%）在标准 MMLU 上领先。

---

## 四、编程能力：LiveCodeBench v6 / HumanEval

> LiveCodeBench 使用竞赛平台实时题目，难以通过训练数据污染，是当前最可信的编程能力指标。HumanEval 因题目泄露问题参考价值下降，仅作辅助参考。

| 模型 | LiveCodeBench | HumanEval | 条件 | 来源 |
|---|:---:|:---:|---|---|
| **Gemma 4 31B** | **80.0%**（v6）| — | IT + Thinking | 【官方】HuggingFace Gemma 4 Blog |
| GPT-4o | — | 90.2% | 标准 | 【官方】OpenAI 技术报告 |
| GPT-4.1 | — | 88.0% | 标准 | 【官方】OpenAI 发布页 2025.04 |
| o3 | — | **95.0%** | Reasoning | 【官方】OpenAI 技术报告 2025.04 |
| o4-mini | — | 93.0% | Reasoning | 【官方】OpenAI 技术报告 2025.04 |
| Claude 3.7 Sonnet | — | ~88%⚠️ | — | 【估算】 |
| Claude Sonnet 4 | — | ~86%⚠️ | — | 【估算】 |
| Gemini 2.5 Flash | LCB Pro ELO: 1143 | — | Thinking | 【官方】Google DeepMind |
| Gemini 2.5 Pro | LCB Pro ELO: 1775 | — | Thinking | 【官方】Google DeepMind |

**解读：**

Gemma 4 31B Thinking 的 LiveCodeBench v6 **80.0%** 是本次发布在编程维度最亮眼的数字。各家使用的指标不统一（部分用 HumanEval，部分用 LiveCodeBench），直接横向比较存在局限，但趋势清晰：

- Gemma 4 31B Thinking 在编程能力上已经超过大多数主力闭源模型的标准模式
- o3/o4-mini 的 HumanEval 95%/93% 是当前最高点，但 HumanEval 已经有数据污染嫌疑
- Gemini 2.5 Pro 的 LiveCodeBench Pro ELO 1775 远高于 Flash 的 1143，说明 Pro 在竞赛编程上有显著优势

---

## 五、代码 Agent：SWE-bench Verified

> 在真实 GitHub issue 上修 bug，是代码 Agent 能力最权威的评测。需要模型理解代码库、定位问题、生成正确 patch。

| 模型 | SWE-bench Verified | 条件 | 来源 |
|---|:---:|---|---|
| **Gemma 4 31B** | **未公布** | — | — |
| GPT-4o | 33.0% | 标准 | 【官方】OpenAI 技术报告 |
| GPT-4.1 | **54.6%** | 标准 | 【官方】OpenAI 发布页 2025.04 |
| o4-mini | 68.1% | Reasoning | 【官方】OpenAI 技术报告 2025.04 |
| o3 | 71.7% | Reasoning | 【官方】OpenAI 技术报告 2025.04 |
| Claude 3.7 Sonnet | 70.3% / 63.7% | 含/不含 scaffold | 【官方】Anthropic 研究页 |
| Claude Sonnet 4 | ~57%⚠️ | 估算 | 【估算】基于 Claude 4 发布对比 |
| Claude Sonnet 4.5 | **77.2% / 82.0%** | pass@1 / high compute | 【官方】anthropic.com/news/claude-sonnet-4-5 |
| Gemini 2.0 Flash | 50.6% | single attempt | 【官方】Google DeepMind 比较表 |
| Gemini 2.5 Flash | 60.4% | single attempt | 【官方】Google DeepMind |
| Gemini 2.5 Pro | 59.6% | single attempt | 【官方】Google DeepMind |

**解读：**

**Gemma 4 31B 没有 SWE-bench 官方数据——这是本次发布最显眼的信息空白。** Google 选择了自家的 τ2-bench 而非 SWE-bench。可能的原因是 SWE-bench 依赖完整的工具链集成（代码执行环境、文件系统操作），而不是单纯的语言能力。

闭源阵营里，**Claude Sonnet 4.5 以 82.0%（high compute）独占鳌头**，标准 pass@1 也达到 77.2%。Claude 3.7 Sonnet 的 70.3% 和 o3 的 71.7% 处于第二梯队。有意思的是，Gemini 2.5 Pro（59.6%）在 SWE-bench 上反而不如 Flash（60.4%），也不如 Claude 3.7 Sonnet，这与它在其他 benchmark 上的领先地位形成落差。

---

## 六、综合对话质量：Chatbot Arena ELO

> lmarena.ai 人类盲测排行榜，反映真实用户偏好。注意：Arena ELO 持续动态更新，以下数据为 2025 年数据，具体排名请查阅 lmarena.ai 最新版本。

| 模型 | Arena ELO | 备注 | 来源 |
|---|:---:|---|---|
| **Gemma 4 31B** | ~1452⚠️ | 开源榜 #3 估算 | 【官方声明】Google 发布博客 |
| GPT-4o | ~1282⚠️ | 2025 数据 | 【第三方】lmarena.ai 估算 |
| GPT-4.1 | ~1280⚠️ | 2025 数据 | 【第三方】估算 |
| o3 | ~1380⚠️ | 高推理 | 【第三方】估算 |
| o4-mini | ~1356⚠️ | 高推理 | 【第三方】估算 |
| Claude 3.7 Sonnet | ~1305⚠️ | 2025 数据 | 【第三方】估算 |
| Claude Sonnet 4 | ~1320⚠️ | 2025 数据 | 【第三方】估算 |
| Claude Sonnet 4.5 | ~1360⚠️ | 2025 数据 | 【第三方】估算 |
| Gemini 2.0 Flash | ~1270⚠️ | 2025 数据 | 【第三方】估算 |
| Gemini 2.5 Flash | ~1340⚠️ | 2025 数据 | 【第三方】估算 |
| Gemini 2.5 Pro | ~1380⚠️ | 2025 数据 | 【第三方】估算 |

**解读：**

Google 在发布博客中声明 Gemma 4 31B 在 Arena AI **开源榜排名 #3**，对应分数约 1452。但需注意这是**开源专榜**而非全模型榜，不能直接和闭源模型的 ELO 数字比较。

Arena ELO 数据中，绝大部分为估算，可信度相对较低，请以 lmarena.ai 实时数据为准。

---

## 七、价格与上下文窗口

| 模型 | 输入价格 | 输出价格 | 上下文窗口 | 最大输出 |
|---|:---:|:---:|:---:|:---:|
| **Gemma 4 31B** | **开源免费** | **开源免费** | 256K | — |
| GPT-4o | \$2.50/M | \$10.00/M | 128K | 16K |
| GPT-4.1 | \$2.00/M | \$8.00/M | 1M | 32K |
| o3 | \$10.00/M | \$40.00/M | 200K | 100K |
| o4-mini | \$1.10/M | \$4.40/M | 200K | 100K |
| Claude 3.7 Sonnet | \$3.00/M | \$15.00/M | 200K | 128K |
| Claude Sonnet 4 | \$3.00/M | \$15.00/M | 200K | 64K |
| Claude Sonnet 4.5 | \$3.00/M | \$15.00/M | 200K（1M beta）| 64K |
| Gemini 2.0 Flash | \$0.10/M | \$0.40/M | 1M | 8K |
| Gemini 2.5 Flash | \$0.30/M | \$2.50/M | 1M | 65K |
| Gemini 2.5 Pro | \$1.25-\$2.50/M | \$10.00-\$15.00/M | 1M | 65K |

> Gemini 2.5 Pro 按 token 量分段计费：200K 以内输入 \$1.25/M，超出 \$2.50/M；输出同理。
> Gemma 4 31B 开源权重可免费自托管，仅需自行承担算力成本。

**关键性价比洞察：**

1. **Gemma 4 31B 的成本优势是结构性的**：自托管情况下边际 API 成本为零。对于私有化部署，任何闭源 API 都无法在价格上与开源权重竞争。

2. **标准模式能力 ≈ GPT-4o，但 GPT-4o 要 \$2.50/M**：如果业务不需要 Thinking 模式，Gemma 4 31B 的标准模式能以接近零成本提供 GPT-4o 量级的基础能力。

3. **Gemini 2.0 Flash（\$0.10/\$0.40）是最便宜的商用 API**，但能力明显弱于 2.5 系列。

4. **Claude 三版本定价相同（\$3/\$15）**：Claude 3.7 → Sonnet 4 → Sonnet 4.5 性能持续提升但定价不变，Anthropic 在守住中端定价带。

5. **GPT-4.1 是 OpenAI 性价比最高的主力模型**：1M 上下文、\$2/\$8，SWE-bench 54.6% 领先同价位所有模型。

---

## 八、综合速览表

> ✓ = 官方数据；⚠️ = 估算；† = Thinking/Reasoning 模式；‡ = AIME 2026 题目（其他多用 2024/2025）

| 模型 | GPQA ◆ | AIME | MMLU | SWE-bench | Arena ELO | 价格（in/out/M）| 上下文 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Gemma 4 31B** | 84.3%✓† | 89.2%✓†‡ | 85.2%✓ | — | ~1452⚠️ | **开源** | 256K |
| GPT-4o | 53.6%✓ | 13.4%✓ | 88.7%✓ | 33.0%✓ | ~1282⚠️ | \$2.5/\$10 | 128K |
| GPT-4.1 | 62.3%✓ | ~50%⚠️ | 89.0%✓ | **54.6%**✓ | ~1280⚠️ | \$2/\$8 | 1M |
| o4-mini | 79.3%✓ | **93.4%**✓ | 87.4%✓ | 68.1%✓ | ~1356⚠️ | \$1.1/\$4.4 | 200K |
| o3 | **87.7%**✓ | 83.3%✓ | **90.2%**✓ | 71.7%✓ | ~1380⚠️ | \$10/\$40 | 200K |
| Claude 3.7 Sonnet | 84.8%✓† | ~60%✓† | 87.0%⚠️ | 70.3%✓ | ~1305⚠️ | \$3/\$15 | 200K |
| Claude Sonnet 4 | 70.0%✓ | 33.1%✓ | 85.4%✓ | ~57%⚠️ | ~1320⚠️ | \$3/\$15 | 200K |
| Claude Sonnet 4.5 | 83.4%✓† | 87.0%✓† | 77.8%✓ | **82.0%**✓ | ~1360⚠️ | \$3/\$15 | 200K |
| Gemini 2.0 Flash | 61.7%✓ | ~25%⚠️ | 89.7%✓ | 50.6%✓ | ~1270⚠️ | \$0.1/\$0.4 | 1M |
| Gemini 2.5 Flash | 82.8%✓† | 72.0%✓ | 79.2%✓ | 60.4%✓ | ~1340⚠️ | \$0.3/\$2.5 | 1M |
| Gemini 2.5 Pro | **86.4%**✓† | 88.0%✓ | 83.6%✓ | 59.6%✓ | ~1380⚠️ | \$1.25/\$10 | 1M |

---

## 九、Gemma 4 31B 的真实位置

| 维度 | Gemma 4 31B 表现 | 最近的闭源参照 |
|---|---|---|
| 科学推理（GPQA，Thinking）| Claude 3.7/Sonnet 4.5 同级 | 比 Gemini 2.5 Pro 差 2pp |
| 数学（AIME，Thinking）| Gemini 2.5 Pro / Claude Sonnet 4.5 同级 | 仅次于 o4-mini |
| 编程（LiveCodeBench，Thinking）| 领先大多数闭源主力 | 与 o3 HumanEval 差距约 15pp |
| 代码 Agent（SWE-bench）| **无数据，无法评估** | Claude Sonnet 4.5 领先 |
| 对话质量（Arena，开源榜）| 开源 #3 | 闭源全榜之下 |
| 价格 | **开源完全免费** | 最贵的 o3 约贵出 100 倍（按 token 算） |

---

## 十、三条核心结论

**1. Thinking 模式下，Gemma 4 31B 已经进入闭源旗舰梯队**

GPQA 84.3% 与 Claude 3.7 Thinking（84.8%）和 Claude Sonnet 4.5（83.4%）几乎持平，AIME 2026 89.2% 超过 Gemini 2.5 Pro（88.0%）。作为一个可以本地免费运行的 31B 模型，这已经突破了大多数人对开源能力上限的预期。

**2. 代码 Agent 是最大的信息空白，Google 用自家基准规避了考验**

SWE-bench、BFCL、GAIA 均无官方数据。Google 发布时选择了 τ2-bench（内部基准，无横向参照）。Claude Sonnet 4.5 在 SWE-bench 以 82.0% 独占鳌头，这个维度目前是 Claude 的护城河，Gemma 4 是否能挑战它尚无公开证据。

**3. 开源权重的成本优势是任何闭源 API 都无法正面竞争的**

对于私有化部署、数据主权要求高、调用量大的场景，Gemma 4 31B 的答案从来不是"它够不够好"，而是"它在我的场景里好到够用了吗"。数学、科学推理、竞赛编程——答案已经很清楚：Thinking 模式下，够用，而且闭源 API 的代价差出一个数量级。

---

*数据来源：[OpenAI GPT-4.1 发布](https://openai.com/index/gpt-4-1/) · [o3/o4-mini 技术报告](https://openai.com/index/o3-and-o4-mini-system-card/) · [Anthropic Claude 3.7](https://www.anthropic.com/research/claude-3-7-sonnet) · [Anthropic Claude Sonnet 4.5](https://www.anthropic.com/news/claude-sonnet-4-5) · [Google Gemini 2.5 Pro](https://deepmind.google/technologies/gemini/pro/) · [HuggingFace Gemma 4 Blog](https://huggingface.co/blog/gemma4) · [SWE-bench](https://www.swebench.com) · [Chatbot Arena](https://lmarena.ai)*
