---
title: "Gemma 4 31B vs GPT / Claude / Gemini：闭源主力全面横评"
description: "Gemma 4 31B 与 GPT-4o、GPT-4.1、o3、o4-mini、Claude 3.7/Sonnet 4/4.5、Gemini 2.5 Pro/Flash 在 GPQA、AIME、LiveCodeBench、SWE-bench、BFCL、GAIA、Chatbot Arena 上的全维度对比，含价格与上下文窗口"
---

# Gemma 4 31B vs GPT / Claude / Gemini：闭源主力全面横评

> 数据来源：OpenAI / Anthropic / Google 官方技术报告及模型卡（2025–2026）、Berkeley BFCL、SWE-bench.com、LiveCodeBench、GAIA HuggingFace Leaderboard、lmarena.ai Chatbot Arena
> 标注说明：⚠️ = 社区估算或非官方数据；† = 扩展思考 / Thinking 模式下的分数；✓ = 官方数据
> 写作时间：2026-04-03

## 速查卡

| 项目 | 内容 |
|---|---|
| 文章类型 | 横向 Benchmark 对比 |
| 对比主角 | Gemma 4 31B（开源）vs 闭源主力 11 款模型 |
| 核心结论 | Thinking 模式下 Gemma 4 31B 达到 Claude Sonnet 4.5 级别；代码 Agent 数据缺失是最大信息空白 |
| 适合谁看 | 技术选型、私有化部署决策、开源 vs 闭源成本对比 |

---

## 前言：为什么要把开源模型和闭源旗舰放在一起比

Google 发布 Gemma 4 时用了一句话定位：**"Byte for byte, the most capable open models."**

这句话的潜台词很清楚——我们不只在开源圈内卷，我们要和闭源旗舰一起比。

那就来比。

本文覆盖 11 款闭源/半开源主力模型，在 7 个主流 Benchmark 维度做完整对比，并附上定价和上下文窗口数据。所有数字均标注来源和置信度。

---

## 重要前提：Standard vs Thinking 模式

Gemma 4 的官方发布数字使用的是 **"IT Thinking"（开启推理链）** 模式。闭源阵营也有类似设定：Claude 的 Extended Thinking、o3/o4-mini 的 Reasoning 模式、Gemini 2.5 的 Thinking Budget。

**为了公平，每个关键 Benchmark 同时提供两种条件：**

- **标准模式**：不开推理链，考察模型的"基础智力"
- **最佳模式**：模型允许的最强推理设置，考察"天花板"

---

## 一、科学推理：GPQA Diamond

> 博士级科学问题（物理 / 化学 / 生物），代表模型的硬知识推理上限。

| 模型 | GPQA Diamond | 条件 | 来源 |
|---|:---:|---|---|
| **Gemma 4 31B** | 53.7% | 标准 IT | 官方 ✓ |
| **Gemma 4 31B Thinking** | **84.3%** | IT + Thinking | 官方 ✓ |
| GPT-4o | 53.6% | 标准 | 官方（OpenAI）✓ |
| GPT-4.1 | 66.3% | 标准 | 官方（OpenAI）✓ |
| o4-mini | 81.4% | Reasoning | 官方（OpenAI System Card）✓ |
| o3 | **87.7%** | Reasoning | 官方（OpenAI System Card）✓ |
| Claude 3.7 Sonnet | 68.0% | 标准 | 官方（Anthropic）✓ |
| Claude 3.7 Sonnet | 84.8% | Extended Thinking † | 官方（Anthropic）✓ |
| Claude Sonnet 4 | 80.0% | 标准 | 官方（Anthropic）✓ |
| Claude Sonnet 4.5 | 84.2% | 标准 | 官方（Anthropic）✓ |
| Gemini 2.0 Flash | 62.1% | 标准 | 官方（Google）✓ |
| Gemini 2.5 Flash | 72.0% | Thinking | 官方（Google）✓ |
| Gemini 2.5 Pro | **86.4%** | Thinking | 官方（Google DeepMind）✓ |

**解读：**

- **标准模式**：Gemma 4 31B（53.7%）与 GPT-4o（53.6%）几乎持平。但 GPT-4.1 已达 66.3%，比 Gemma 4 31B 高出约 13pp——说明标准模式下 Gemma 4 仍是上一代旗舰水平。
- **Thinking 模式**：Gemma 4 31B 跳到 84.3%，直接进入 Claude Sonnet 4.5（84.2%）/ Claude 3.7 Thinking（84.8%）梯队，比 Claude Sonnet 4 标准模式（80.0%）还略高。
- **顶部梯队**：o3（87.7%）> Gemini 2.5 Pro（86.4%）> Claude 3.7 Thinking（84.8%）≈ Gemma 4 Thinking（84.3%）≈ Claude Sonnet 4.5（84.2%）。Gemma 4 Thinking 已经是这个梯队的成员。

---

## 二、数学能力：AIME 2024 / AIME 2025 / AIME 2026

> AIME 是美国最高级别数学竞赛题。AI 模型在这里的得分从 2023 年几乎为零，到 2025 年开始"制霸"人类参赛者均值。

| 模型 | AIME 2024 | AIME 2025 / 2026 | 条件 | 来源 |
|---|:---:|:---:|---|---|
| **Gemma 4 31B** | 16.7% | — | 标准 IT | 官方 ✓ |
| **Gemma 4 31B Thinking** | — | **89.2%**（AIME 2026）| IT + Thinking | 官方 ✓ |
| GPT-4o | 9.3% | — | 标准 | 官方（OpenAI）✓ |
| GPT-4.1 | 26.7% | — | 标准 | 官方（OpenAI）✓ |
| o4-mini | 93.4% | **92.7%** | Reasoning | 官方（OpenAI System Card）✓ |
| o3 | **96.7%** | 88.9% | Reasoning | 官方（OpenAI System Card）✓ |
| Claude 3.7 Sonnet | 16.0% | — | 标准 | 官方（Anthropic）✓ |
| Claude 3.7 Sonnet | 80.0% | 80.0% | Extended Thinking † | 官方（Anthropic）✓ |
| Claude Sonnet 4 | — | 55.0% | 标准 | 官方（Anthropic）✓ |
| Claude Sonnet 4.5 | — | 72.0% | 标准 | 官方（Anthropic）✓ |
| Gemini 2.0 Flash | 22.0% | — | 标准 | 官方（Google）✓ |
| Gemini 2.5 Flash | — | 73.3% | Thinking | 官方（Google）✓ |
| Gemini 2.5 Pro | — | **86.7%** | Thinking | 官方（Google DeepMind）✓ |

**解读：**

- **标准模式的分水岭**：Claude 3.7（16.0%）、Gemma 4 31B（16.7%）、GPT-4.1（26.7%）——这三者在标准模式下都"不会做"AIME 题。说明不开推理链，旗舰非推理模型在顶级数学竞赛面前依然力不从心。
- **Thinking 模式完全逆转格局**：Gemma 4 31B Thinking（AIME 2026 89.2%）超过 Gemini 2.5 Pro（86.7%），与 o3（88.9%）几乎持平。一个 31B 开源模型的数学推理比肩 OpenAI 旗舰推理模型——这是本次发布最具震撼力的单个数字。
- ⚠️ **重要注意**：Google 使用的是 AIME **2026** 题目，其他模型多用 AIME 2024/2025，难度体系存在差异，不能直接画等号。但即便如此，这个数字仍然是一个强烈信号。

---

## 三、编程能力：LiveCodeBench / HumanEval

> LiveCodeBench 基于竞赛平台实时题目，难以通过训练数据污染，是目前最可靠的编程能力指标。HumanEval 因题目泄露已大量失真，仅作参考。

| 模型 | LiveCodeBench（版本）| HumanEval | 条件 | 来源 |
|---|:---:|:---:|---|---|
| **Gemma 4 31B** | 50.0%（v5）| 82.9% | 标准 IT | 官方 ✓ |
| **Gemma 4 31B Thinking** | **80.0%**（v6）| — | IT + Thinking | 官方 ✓ |
| GPT-4o | 32.3% | 90.2% | 标准 | 官方（OpenAI）✓ |
| GPT-4.1 | 54.4% | — | 标准 | 官方（OpenAI）✓ |
| o4-mini | 79.0% | ~93% ⚠️ | Reasoning | 官方 / 社区 |
| o3 | **82.1%** | ~95% ⚠️ | Reasoning | 官方 / 社区 |
| Claude 3.7 Sonnet | 55.6% | — | 标准 | 第三方（LiveCodeBench）✓ |
| Claude Sonnet 4.5 | 64.2% | — | 标准 | 官方（Anthropic）✓ |
| Gemini 2.0 Flash | 34.5% | 89.7% | 标准 | 官方（Google）✓ |
| Gemini 2.5 Flash | 57.8% | — | Thinking | 官方（Google）✓ |
| Gemini 2.5 Pro | 70.4% | — | Thinking | 官方（Google DeepMind）✓ |

**解读：**

- **标准模式**：Gemma 4 31B（50.0%）大幅超过 GPT-4o（32.3%），接近 GPT-4.1（54.4%）和 Claude 3.7（55.6%）。注意 LiveCodeBench 版本号有差异（v5 vs v6），但趋势清晰。
- **Thinking 模式**：80.0% 直追 o3（82.1%），略超 o4-mini（79.0%），大幅领先 Gemini 2.5 Pro（70.4%）和 Claude Sonnet 4.5（64.2%）。编程是 Gemma 4 Thinking 模式最耀眼的维度。
- **HumanEval 的陷阱**：GPT-4o 的 90.2% 看起来比 Gemma 4 的 82.9% 高，但 HumanEval 早已被训练数据污染，数字已失去参考价值。LiveCodeBench 才是真实战场。

---

## 四、代码 Agent：SWE-bench Verified

> 在真实 GitHub issue 上修复 bug，是代码 Agent 能力的金标准 benchmark。

| 模型 | SWE-bench Verified | 条件 | 来源 |
|---|:---:|---|---|
| **Gemma 4 31B** | **—** | — | **无官方数据** |
| GPT-4o | 38.8% | 标准 | 官方（OpenAI）✓ |
| GPT-4.1 | 54.6% | 标准 | 官方（OpenAI）✓ |
| o4-mini | 68.1% | Reasoning | 官方（OpenAI）✓ |
| o3 | 71.7% | Reasoning | 官方（OpenAI）✓ |
| Claude 3.7 Sonnet | 62.3% | 标准 | 官方（Anthropic）✓ |
| Claude 3.7 Sonnet | 70.3% | Extended Thinking † | 官方（Anthropic）✓ |
| Claude Sonnet 4 | 72.7% | 标准 | 官方（Anthropic）✓ |
| Claude Sonnet 4.5 | **75.1%** | 标准 | 官方（Anthropic）✓ |
| Gemini 2.0 Flash | 38.6% | 标准 | 官方（Google）✓ |
| Gemini 2.5 Flash | 38.0% | 标准 | 官方（Google）✓ |
| Gemini 2.5 Pro | 63.8% | 标准 | 官方（Google DeepMind）✓ |

**解读：**

- **Gemma 4 31B 没有 SWE-bench 官方数据**——这是本次发布最值得注意的信息缺口。Google 选择了自家的 τ2-bench 而非 SWE-bench，可能是因为 SWE-bench 高度依赖代码执行、文件操作等工具链整合，而不是纯语言能力。
- **闭源阵营里，Claude 系列在 SWE-bench 上碾压 Gemini 系列**：Gemini 2.5 Pro（63.8%）vs Claude Sonnet 4.5（75.1%），差距超过 11pp。这是 Claude 被普遍认为"代码 Agent 最强"的核心数据支撑。
- **GPT-4.1 vs Claude 3.7 对比值得注意**：GPT-4.1 标准模式（54.6%）< Claude 3.7 标准模式（62.3%），说明 Claude 在代码 Agent 任务上的优势不只来自推理链，而是模型本质就更懂代码修复。

---

## 五、工具调用与 Agent 能力：τ2-bench / BFCL / GAIA

### 5.1 τ2-bench（Google 内部 Agent 基准）

Google 专门为 Agentic 工作流设计的多步骤工具使用评测。

| 模型 | τ2-bench | 条件 |
|---|:---:|---|
| **Gemma 4 31B Thinking** | **86.4%** | IT + Thinking |
| **Gemma 4 26B MoE Thinking** | 85.5% | IT + Thinking |
| Gemma 3 27B IT | 6.6% | 标准 IT |

> ⚠️ τ2-bench 目前**只有 Gemma 系列的 Google 内部数据**，缺乏 Claude / GPT / Gemini 闭源模型的横向对比。86.4% 的绝对数值很高，但没有参照系。Gemma 3 → Gemma 4 的 +79.8pp 跳跃（6.6% → 86.4%）说明 Agentic 能力是质的突破，但独立验证还需要等第三方评测。

### 5.2 BFCL v3（Berkeley Function Calling Leaderboard）

测试模型按照 JSON Schema 准确调用工具的能力。

| 模型 | BFCL Overall | 来源 |
|---|:---:|---|
| **Gemma 4 31B** | — | 暂无数据 |
| GPT-4.1 | **79.3%** | 第三方（Berkeley）✓ |
| Claude 3.7 Sonnet | 74.5% | 第三方（Berkeley）✓ |
| GPT-4o | 72.0% | 第三方（Berkeley）✓ |
| Gemini 2.5 Pro | 71.2% | 第三方（Berkeley）✓ |
| Gemini 2.0 Flash | 69.8% | 第三方（Berkeley）✓ |

### 5.3 GAIA（通用 AI 助手真实世界任务）

测试模型完成真实世界多步骤任务（搜索 + 文件处理 + 推理组合）。

| 模型 | GAIA (test avg) | 来源 |
|---|:---:|---|
| **Gemma 4 31B** | — | 暂无数据 |
| Gemini 2.5 Pro | **72.0%** | 官方 / 第三方 ✓ |
| o3 | 67.6% | 官方（OpenAI）✓ |
| GPT-4.1 | 54.4% | 第三方（HF Leaderboard）✓ |
| Claude 3.7 Sonnet | 49.3% | 第三方（HF Leaderboard）✓ |
| GPT-4o | ~38% ⚠️ | 社区估算 |

**综合解读：**

- Gemma 4 在 BFCL 和 GAIA 上**均无官方数据**，这是判断其实际 Agent 能力的最大障碍。
- Gemini 2.5 Pro 在 GAIA 遥遥领先（72%），核心原因是原生 Google Search 集成——多步骤信息检索任务强依赖实时搜索能力。
- GPT-4.1 在 BFCL 排名第一（79.3%），主要来自 Strict Mode 函数调用的格式可靠性。

---

## 六、综合对话质量：Chatbot Arena ELO

> 来源：[lmarena.ai](https://lmarena.ai) 人类盲评排行榜，数据约 2025 年中期

| 全榜排名 | 模型 | Arena ELO | 备注 |
|:---:|---|:---:|---|
| 1 | Gemini 2.5 Pro | **1422** | 全球第一 |
| 2 | o3 | 1383 | |
| 3 | GPT-4.1 | 1369 | |
| 4 | Claude Sonnet 4.5 | 1359 | |
| 5 | Gemini 2.5 Flash | 1345 | |
| 6 | Claude 3.7 Sonnet | 1316 | |
| 7 | GPT-4o | 1285 | |
| 开源 #3 | **Gemma 4 27B（31B）** | **~1270** ⚠️ | 开源榜前三 |
| — | Gemini 2.0 Flash | 1228 | |

**解读：**

- Gemma 4 在**全模型榜**上约为 ~1270，低于全部闭源旗舰（1285–1422），但领先 Gemini 2.0 Flash（1228）。
- 在**开源模型专榜**（Arena AI 开源子榜）上，Gemma 4 31B 是 #3（1452 分），击败 Llama 4 Maverick（400B）等对手——这就是 Google 原文"开源 #3"的数据来源。两个榜单体系不同，不能混用。

---

## 七、价格与性价比全景

| 模型 | 输入价格 | 输出价格 | 上下文窗口 | 备注 |
|---|:---:|:---:|:---:|---|
| **Gemma 4 31B** | **免费**（自托管）/ $0.35 | **免费** / $1.05 | 128K | 开源权重；Vertex AI 商用定价 |
| Gemini 2.0 Flash | $0.10 | $0.40 | 1M | API 最低成本 |
| Gemini 2.5 Flash | $0.15 | $0.60–$3.50 | 1M | 思考输出另计 |
| o4-mini | $1.10 | $4.40 | 200K | |
| GPT-4.1 | $2.00 | $8.00 | 1M | 缓存输入 $0.50 |
| GPT-4o | $2.50 | $10.00 | 128K | |
| Claude 3.7 / Sonnet 4 / 4.5 | $3.00 | $15.00 | 200K | 三版本同价 |
| Gemini 2.5 Pro | $1.25–$2.50 | $10.00–$15.00 | 1M | 按 token 量分段计费 |
| o3 | $10.00 | $40.00 | 200K | 最贵 |

**关键性价比洞察：**

1. **Gemma 4 31B 的成本优势是结构性的**：自托管情况下只有算力成本，没有 token 费用。对于私有化部署，这不是"便宜一点"，而是"完全不同量级"。
2. **标准模式 Gemma 4 ≈ GPT-4o 能力，但 GPT-4o 收 $2.50/$10**：如果业务不需要 Thinking 模式，Gemma 4 自托管可以零 API 成本获得等效能力。
3. **Gemini 2.5 Flash（$0.15/$0.60）是商用 API 性价比最高方案**：GPQA 72%、AIME 73.3%、SWE-bench 38%，1M token 上下文，Thinking 按需。
4. **Claude 三版本同价（$3/$15）**：Claude 3.7 → Sonnet 4 → Sonnet 4.5 性能持续提升，定价不变，Anthropic 在守住中端市场。
5. **o3（$10/$40）适合高价值低频任务**：成本是 Claude 的 3–4 倍，适合复杂规划、一次性高强度分析。

---

## 八、综合横评表（全维度速览）

> ✓ = 官方数据；⚠️ = 估算；† = Thinking 模式；‡ = AIME 2026（其他模型多用 2024/2025）；— = 无数据

| 模型 | GPQA ◆ | AIME | LiveCode | SWE-bench | BFCL | GAIA | Arena ELO | 价格（in/out）| 上下文 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Gemma 4 31B（标准）** | 53.7%✓ | 16.7%✓ | 50.0%✓ | —  | — | — | ~1270⚠️ | **开源 / $0.35/$1.05** | 128K |
| **Gemma 4 31B（Thinking）** | **84.3%**✓† | **89.2%**✓†‡ | **80.0%**✓† | — | — | — | — | 同上 | 128K |
| GPT-4o | 53.6%✓ | 9.3%✓ | 32.3%✓ | 38.8%✓ | 72.0%✓ | ~38%⚠️ | 1285✓ | $2.50/$10 | 128K |
| GPT-4.1 | 66.3%✓ | 26.7%✓ | 54.4%✓ | 54.6%✓ | **79.3%**✓ | 54.4%✓ | 1369✓ | $2/$8 | 1M |
| o4-mini | 81.4%✓ | **92.7%**✓ | 79.0%✓ | 68.1%✓ | — | 62.0%⚠️ | — | $1.10/$4.40 | 200K |
| o3 | **87.7%**✓ | 88.9%✓ | **82.1%**✓ | 71.7%✓ | — | 67.6%✓ | 1383✓ | $10/$40 | 200K |
| Claude 3.7 Sonnet | 68.0% / 84.8%†✓ | 16.0% / 80.0%†✓ | 55.6%✓ | 62.3% / 70.3%†✓ | 74.5%✓ | 49.3%✓ | 1316✓ | $3/$15 | 200K |
| Claude Sonnet 4 | 80.0%✓ | 55.0%✓ | ~64%⚠️ | 72.7%✓ | — | — | — | $3/$15 | 200K |
| Claude Sonnet 4.5 | 84.2%✓ | 72.0%✓ | 64.2%✓ | **75.1%**✓ | — | — | 1359✓ | $3/$15 | 200K |
| Gemini 2.5 Flash | 72.0%✓ | 73.3%✓ | 57.8%✓ | 38.0%✓ | 71.2%⚠️ | — | 1345✓ | $0.15/$0.60 | 1M |
| Gemini 2.5 Pro | **86.4%**✓ | 86.7%✓ | 70.4%✓ | 63.8%✓ | — | **72.0%**✓ | **1422**✓ | $1.25/$10 | 1M |
| Gemini 2.0 Flash | 62.1%✓ | 22.0%✓ | 34.5%✓ | 38.6%✓ | 69.8%✓ | — | 1228✓ | $0.10/$0.40 | 1M |

---

## 九、Gemma 4 31B 的真实位置

| 维度 | Gemma 4 31B 的位置 | 最近的闭源参照点 |
|---|---|---|
| 标准科学推理（GPQA） | GPT-4o 级别 | 比 GPT-4.1 差 12pp |
| Thinking 科学推理（GPQA） | Claude Sonnet 4.5 / Claude 3.7 Thinking 级别 | 比 Gemini 2.5 Pro 差 2pp |
| 数学（AIME，Thinking） | 接近 Gemini 2.5 Pro，与 o3 持平 | 仅次于 o4-mini |
| 编程（LiveCode，Thinking） | o4-mini 级别 | 超越 Gemini 2.5 Pro |
| 代码 Agent（SWE-bench） | **无数据，无法评估** | Claude 系列领先 |
| 工具调用 / GAIA | **无数据，无法评估** | Gemini 2.5 Pro + GPT-4.1 领先 |
| 综合对话（Arena） | GPT-4o 与 Gemini 2.0 Flash 之间 | 全闭源旗舰之下 |
| 价格 | **开源完全免费** | 最贵的 o3 贵出约 28 倍（Vertex AI 定价比） |

---

## 十、三条核心结论

**1. Gemma 4 31B Thinking 是目前最强的开源数学 / 科学推理模型**

GPQA 84.3% ≈ Claude Sonnet 4.5（84.2%），AIME 2026 89.2% 接近甚至超越 Gemini 2.5 Pro（86.7%）。距离 o3（87.7% GPQA）仅差 3pp。作为一个可以免费自托管的开源模型，这已经突破了大多数人对"开源能力上限"的认知。

**2. 代码 Agent 能力存在显著数据空白，不能轻易接受"顶级 Agent"的叙事**

Google 发布时没有提供 SWE-bench、BFCL、GAIA 的数字，用自家 τ2-bench（缺乏横向对比基准）替代。这不一定代表 Gemma 4 在这些维度表现差——但作为技术选型依据，数据不在就不能断言。代码 Agent 场景当前能确定领先的仍是 Claude Sonnet 4.5（SWE-bench 75.1%）。

**3. 性价比是无法被正面竞争的护城河**

对于私有化部署需求，开源权重的结构性成本优势无法被任何商业 API 正面对抗。问题从来不是"Gemma 4 够不够好"，而是"它在哪些场景足够好"。答案目前已经很清楚：数学、科学推理、竞赛编程——在 Thinking 模式下已经达到闭源旗舰水平，而成本差出一个数量级。

---

*数据来源：[OpenAI GPT-4.1](https://openai.com/index/gpt-4-1/) · [o3/o4-mini System Card](https://openai.com/index/o3-and-o4-mini-system-card/) · [Anthropic Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet) · [Gemini 2.5 Pro](https://deepmind.google/technologies/gemini/pro/) · [Gemma 4 HuggingFace 模型卡](https://huggingface.co/google/gemma-4-31b-it) · [Berkeley BFCL](https://gorilla.cs.berkeley.edu/leaderboard.html) · [SWE-bench](https://www.swebench.com) · [LiveCodeBench](https://livecodebench.github.io) · [GAIA Leaderboard](https://huggingface.co/spaces/gaia-benchmark/leaderboard) · [Chatbot Arena](https://lmarena.ai)*
