---
title: "深度解读 | Deep FinResearch Bench：AI 离专业投研报告还有多远，JPMorgan 给出了一套可复用的金融深研评测框架"
description: "Deep FinResearch Bench, financial investment research, deep research agents, equity research, JPMorgan, valuation, verifiability, SMAPE"
---

# Deep FinResearch Bench 深度解读

> 原文链接：https://arxiv.org/abs/2604.21006
> 作者：Mirazul Haque 等，JPMorganChase AI Research
> 发布日期：2026-04-22
> 核对说明：已通读原文全文，并检索过去 14 天 `deep-*.md`，未发现同主题 deep 稿件，因此新建本文。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 论文把职业 equity research 报告拆成质性分析、量化预测、可验证性三大维度，用真实分析师报告和四家 DR agent 正面对比。 |
| 最关键数据 | 100 份职业报告；25 家 S&P 500 公司；3 个行业；2025 年 Q1/Q2；OpenAI、Gemini、Grok、Perplexity 四个 DR agent。 |
| 最重要结论 | AI 已能写出“像样的研究报告”，但在叙事连贯性、核心财务预测、假设严谨性和低幻觉引用上仍落后于职业分析师。 |
| 谁表现最好 | 质性维度 Gemini 最强；核心财务预测中 Grok 在 DR agent 里最好；引用事实性 OpenAI 最强。 |

## 论文要解决什么问题

作者认为，现有 deep research benchmark 不是太泛，就是和职业投研工作流不够像。真正的卖方研究报告不仅要写得像报告，还要同时完成：

- 公司与行业信息收集
- 投资逻辑与风险分析
- 财务预测
- 目标价与买卖建议
- 引用与事实可核验

因此论文要评测的不是“AI 能不能回答金融问题”，而是“AI 能不能写出接近职业分析师标准的完整投研报告”。

## 方法详解

### 1. 数据构建：先收真实职业报告，再让 AI 对位写同题报告

论文通过 Yahoo Finance 付费订阅拿到两家机构的 pre-earnings equity research 报告，记作 Firm A 和 Firm B；随后：

- 从 S&P 500 随机抽取 25 家公司
- 覆盖信息技术、金融、医疗健康 3 个行业
- 关注 2025 年 Q1、Q2
- 共收集 100 份职业报告

然后让 DR agent 在相同公司、相同时期、相近发布时间条件下写对应 AI 报告，保证比较尽量公平。

### 2. AI 报告生成：不是裸 prompt，而是先抽取机构 rubric

作者测试两种方法：

1. 简单 prompt：给任务、公司、时期，让 DR agent 自己组织报告
2. rubric prompt：先用 OpenAI o3 从 Firm A / B 报告中提取详细写作 rubric，再嵌入 prompt

论文最终采用第二种，因为它生成的报告更完整，更接近职业格式，也更适合公平比较。

### 3. 三大评测维度

#### A. 质性分析

四个 1-4 分维度：

- Comprehensiveness
- Coherence
- Assumption quality
- Analytical depth

#### B. 量化分析

三类指标：

1. 财务预测准确率：对 revenue、EBITDA、operating income、net income、FCF、EPS 用 SMAPE 评估
2. 目标价准确率：Hit Rate、MAE、Mean Bias
3. 投资建议准确率：Directional Accuracy、Signed Recommendation Loss（SRL）

#### C. 可验证性与可信度

作者设计了 claim-level 流水线：

- GPT-5 抽取 claim 与 citation
- GPT-4.1 对 claim 和引用页面做核验
- 抽取失败时用 GPT-4o + web search 兜底
- 汇总 factuality `F(R)`、hallucination `H(R)`、non-verification `NV(R)`

### 4. LLM-as-a-judge 选择

作者用 8 位领域专家的小样本人工标注对比 GPT-5、Gemini 2.5 Pro、Sonnet 4 三个 judge，pairwise agreement 分别为：

- GPT-5：80.0%
- Gemini 2.5 Pro：53.8%
- Sonnet 4：31.2%

因此后续质性评估主要采用 GPT-5。

## 数据 / 训练细节

### 评测对象

| 系统 | 底层模型 | 搜索 | 额外能力 |
|---|---|---|---|
| OpenAI DR | GPT-o3 | Proprietary | Python code execution |
| Gemini DR | Gemini 2.5 Pro | Google | Multimodal reasoning |
| Grok DR | Grok 4 | Proprietary | Real-time Twitter/X data |
| Perplexity DR | Sonar Reasoning | Proprietary | Multi-document synthesis |

### 数据规模

| 项目 | 数值 |
|---|---:|
| 公司数 | 25 |
| 行业数 | 3 |
| 时间范围 | 2025 Q1 / Q2 |
| 职业报告数 | 100 |
| 职业机构数 | 2 |
| 人工对齐评测 | 8 家公司 × 每家 4 份报告 |
| 专家人数 | 8 |

## 实验结果

### 1. 质性质量：职业分析师明显领先，Gemini 是 DR 里最好的一家

| 报告 | 完整性 | 假设质量 | 连贯性 | 分析深度 | 总分 |
|---|---:|---:|---:|---:|---:|
| OpenAI DR | 2.00 | 1.45 | 2.10 | 2.60 | 2.02 |
| Gemini DR | 2.09 | 2.00 | 2.20 | 3.00 | 2.31 |
| Grok DR | 2.00 | 1.70 | 1.80 | 2.60 | 2.02 |
| Perplexity DR | 2.00 | 1.90 | 2.20 | 2.40 | 2.12 |
| Firm A 分析师 | 2.73 | 1.91 | 3.00 | 3.73 | 2.84 |

解读：Gemini 在 DR agent 中总分最高，但职业分析师在 coherence 和 depth 上仍明显领先。

### 2. 财务预测：职业分析师最稳，Grok 是 DR 里最强预测者

| 指标 SMAPE↓ | OpenAI | Gemini | Grok | Perplexity | Firm A |
|---|---:|---:|---:|---:|---:|
| Revenue | 24.73 | 22.63 | 18.65 | 23.92 | 10.64 |
| EBITDA | 12.13 | 22.52 | 10.82 | 38.60 | 6.58 |
| Operating Income | 16.78 | 29.18 | 19.27 | 29.90 | 5.32 |
| Net Income | 16.62 | 21.58 | 14.32 | 18.76 | 7.43 |
| Free Cash Flow | 18.54 | 9.51 | 12.58 | 15.64 | 51.93 |
| EPS | 39.06 | 27.23 | 27.23 | 33.60 | 27.64 |
| Overall | 21.52 | 23.05 | 17.49 | 27.56 | 17.14 |

解读：Firm A 在总体上最好；Grok 在 DR agent 中 overall 最低（17.49），是最强量化预测者。

### 3. 目标价与推荐：AI 已追近人类，但校准仍不稳定

| 系统 | 3m Hit Rate | 3m MAE | 6m Hit Rate | 6m MAE |
|---|---:|---:|---:|---:|
| OpenAI | 33.3% | 26.4% | 46.2% | 27.4% |
| Gemini | 31.8% | 28.2% | 57.1% | 28.0% |
| Perplexity | 29.3% | 22.3% | 56.4% | 19.1% |
| Grok | 20.0% | 50.3% | 44.1% | 49.3% |
| Firm A | 25.8% | 24.4% | 40.0% | 30.2% |

| 系统 | 3m Directional Accuracy | 3m SRL↓ | 6m Directional Accuracy | 6m SRL↓ |
|---|---:|---:|---:|---:|
| OpenAI | 63.3% | 0.045 | 76.9% | 0.052 |
| Gemini | 72.7% | 0.037 | 61.9% | 0.060 |
| Perplexity | 68.3% | 0.051 | 71.8% | 0.061 |
| Grok | 51.4% | 0.071 | 61.8% | 0.088 |
| Firm A | 64.5% | 0.036 | 53.3% | 0.070 |

解读：stock-level 指标上 AI 与人类差距缩小，但职业分析师在 valuation calibration 上更稳。

### 4. 可验证性：OpenAI 最靠谱，Grok 幻觉最重

| 指标 | OpenAI | Gemini | Grok | Perplexity |
|---|---:|---:|---:|---:|
| 平均 claims 数 | 23.4 | 27.4 | 19.1 | 24.7 |
| overall F(R) | 86.0% | 69.6% | 53.2% | 75.6% |
| numeric F(R) | 84.9% | 68.8% | 50.2% | 73.7% |
| descriptive F(R) | 89.4% | 75.4% | 61.9% | 88.7% |
| overall H(R) | 11.2% | 17.3% | 34.1% | 18.5% |
| overall NV(R) | 2.9% | 13.1% | 12.7% | 5.9% |

解读：OpenAI 的 factuality 和低 hallucination 最强；Grok 的 hallucination rate 达到 34.1%，在真实投研流程里风险很高。

## 这篇论文最重要的发现

1. AI 已经很会写“像报告”的报告，但还不够会做“像分析师”的分析。
2. DR agent 在目标价与买卖建议这类 stock-level 任务上已追近职业分析师，但在核心财务预测上仍落后。
3. 金融场景里“有 citation”不等于“可核验”，把 verifiability 单独拆出来是这篇论文最有实务价值的设计。

## 消融与局限

### 消融

原文没有大规模机制消融，但有两类重要对照：

- 简单 prompt vs rubric-enhanced prompt
- GPT-5 / Gemini 2.5 Pro / Sonnet 4 judge 一致率对照

严格说，这更像评测流程对照，而不是 DR agent 内部 planner、search、synthesis 的机制消融。

### 局限

作者在 Appendix A.1 明确承认：

1. 只研究商业 DR agents，未系统覆盖开源方案
2. 只覆盖 equity research，未扩展到 credit、commodity、macro 等资产类别
3. 质性评估虽自动化，但仍依赖 LLM judge
4. benchmark 主要基于公开/可订阅数据环境，与真实机构私有数据条件仍有差距

## Lighthouse 结论

这篇论文的价值不只是得出“AI 还不如分析师”这个并不意外的结论，而是第一次把职业级金融深研拆成一套可复用、可自动化扩展的评测框架。

如果你在做金融 agent，这篇论文最值得记住的是：

- 不要只追求报告篇幅和结构
- 要单独跟踪财务预测、估值建议和 claim verifiability
- AI 在“看起来像分析师”这件事上已经很强，但在“真正替代分析师”这件事上还远没到位