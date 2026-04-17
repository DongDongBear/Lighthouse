---
title: "深度解读 | DR3-Eval：把 Deep Research 评测从“上网跑一次”变成可复现实验"
description: "DR3-Eval 基准, 100 个真实多模态任务, 反向构造 query, 静态 sandbox 语料, DR3-Agent 分层多智能体, Table 2/3 主结果, bootstrap 显著性, LLM-as-judge 与人评一致性"
---

> 2026-04-18 · 深度解读 · 编辑：Lighthouse
>
> 原文：[arxiv.org/abs/2604.14683](https://arxiv.org/abs/2604.14683) — *DR3-Eval: Towards Realistic and Reproducible Deep Research Evaluation*
>
> 作者：Qianqian Xie, Qingheng Xiong, He Zhu, Tiantian Xia, Xueming Han, Fanyu Meng, Jiakai Wang, Zhiqi Bai, Chengkang Jiang, Zhaohui Wang, Yubin Guo, Yuqing Wen, Jiayang Mao, Zijie Zhang, Shihao Li, Yanghai Wang, Yuxiang Ren, Junlan Feng, Jiaheng Liu 等

---

## 速查卡

| 维度 | 内容 |
|------|------|
| 一句话总结 | DR3-Eval 试图解决 deep research 评测里最棘手的三角矛盾：既要像真实研究一样有多模态文件、噪声和误导信息，又要像 benchmark 一样可复现、可验证、可显著性检验。 |
| 大白话版 | 以前很多 deep research benchmark 不是直接上实时网页、难复现，就是把任务做得太“干净”、不像真实调研。DR3-Eval 的思路是：把每个任务都配一个静态 sandbox，把“有用网页 / 干扰网页 / 噪声网页”提前冻住，再倒推出 query，这样既像真实研究，又能稳定比较模型。 |
| 核心数据 | 100 个独立任务，英中各 50；覆盖 Technology / Economy / Humanities 三大域、13 个原子子域；68% 任务为多模态；平均每题 2.24 个用户文件，最多 6 个；512k 配置下平均每题 465.5 个网页。 |
| 数据来源与筛选 | 初始 280 个候选任务，经 leave-one-out 验证与难度过滤后保留 100 个，最终通过率 35.7%。 |
| 关键设计 | 任务由真实用户文件出发，经“发散-收敛”关键词生成、supportive/distractor/noise 三类网页构造、再反向生成 query，确保每题有唯一、可验证的证据链。 |
| 评测维度 | 五类评测维度在主表中展开为 6 个显示列：IR_UF、IR_SC、CC、FA、IF、DQ；其中 IR 被拆成用户文件与 sandbox 两部分分别统计。 |
| 最佳模型 | Table 2 中 Claude Sonnet 4 在 64k / 128k / 512k 三档总分均为第一，Avg 分别为 70.7 / 67.5 / 65.6。 |
| 影响评级 | A- —— 更重要的贡献不在于新 agent 本身，而在于提出了一个现实性、可控性、可复现性兼顾的 deep research 评测坐标系。 |

---

## 核心 Insight

这篇论文最值得记住的，不是“又出了一个新 benchmark”，而是它对 deep research 评测对象本身做了重新定义。

### 1. 真正难的不是“网页很多”，而是“证据、误导、噪声混在一起”

论文在数据构造里明确把网页分成三类：

- Supportive Web Pages：真正构成答案证据链的网页
- Distractor Web Pages：主题相关，但内容过时、片面或不准确
- Noise Web Pages：由 noise keywords 拉来的背景噪声

这比传统“relevant / irrelevant”二元划分更接近真实调研。现实中的难点，从来不是把随机垃圾过滤掉，而是区分“看上去相关但其实会把你带偏”的内容。DR3-Eval 的价值就在于，它把这种困难显式做进 benchmark。

### 2. 可复现的关键，不是把网页缓存下来，而是“反向构造 query”

作者最聪明的设计其实不是 sandbox，而是 reverse construction。不是先拍脑袋出一个开放问题，再去看网上能不能回答；而是先确认 supportive evidence，再基于证据链和 signal keywords 反推 query。

这样做带来两个直接好处：

- 每道题都有明确、可验证的解路径；
- 自动评测不会因为 query 过于开放而失去锚点。

换句话说，DR3-Eval 不是在考“模型能不能写一篇看起来像样的报告”，而是在考“模型能否在多模态输入 + 固定证据环境里，稳定地找到并组织正确证据”。

### 3. long-context 下最先崩的不是文风，而是信息获取能力

Table 2 的总体趋势非常一致：从 64k 增长到 512k，几乎所有模型 Avg 都下降。更细看会发现，掉得最明显的是 IR_SC 和 CC，而 FA 相对更稳定。

这意味着当前 deep research agent 的主要瓶颈并不只是“生成时会不会胡说”，而是更早的环节：

- 能不能从更长、更脏的语料里定位到关键证据；
- 拿到证据后，能不能在报告中正确引用和覆盖。

论文自己的总结也非常明确：一些模型 IF 不低，但 FA 很差，说明它们更擅长“写得像完成任务”，而不是“真的完成研究”。

`★ Insight ─────────────────────────────────────`
DR3-Eval 其实把 deep research agent 拆成了两个问题：
1) 你是否真的找到了该找的证据？
2) 你是否基于这些证据写出了可信报告？
很多现有系统在第二个问题上“看起来不错”，但在第一个问题上远没有想象中强。
`─────────────────────────────────────────────────`

---

## 方法详解

### 1. 五阶段数据构造管线

论文的数据构造分五步完成。

#### Stage 1：从真实用户需求和真实文件出发

作者招募付费志愿者，收集其真实遇到过的研究材料，覆盖文本、结构化数据、图片、视频、音频、HTML 等多模态形式。最终得到：

- 100 个文档集合
- 英文 50、中文 50
- 3 大域：Technology、Economy、Humanities
- 细分到 13 个子领域

隐私方面采用两阶段清洗：先自动脚本脱敏，再由另一组标注者人工交叉检查，去除 PII 和商业/专有敏感信息。

#### Stage 2：发散-收敛式搜索路径蒸馏

作者借鉴 double diamond / divergent-convergent 思路：

- 先用 Gemini-2.5-Pro 从源文件生成 10 个候选关键词；
- 再把关键词划分为 signal keywords 与 noise keywords。

其中：
- signal keywords 指向核心解路径；
- noise keywords 与主题相关，但会导向无关或误导信息。

这一步的意义很大：benchmark 不只是考“给定 query 做检索”，而是把“如何制定检索路径”也纳入挑战。

#### Stage 3：为每题建立独立静态 sandbox

每个任务都有独立、静态的 research sandbox corpus：

- 每个关键词最多抓取 100 条 web result；
- URL 去重后统一抓取与清洗；
- 去掉导航栏、广告等模板内容；
- 再按 supportive / distractor / noise 三类组织。

难度则通过 context length 控制，共五档：

- 32k
- 64k
- 128k
- 256k
- 512k

所有配置都包含完整 supportive pages；随上下文变长，distractor pages 按比例增加，剩余 token 用 noise pages 填满。三类网页最后随机打散混合。

#### Stage 4：基于证据反向生成 query

这是整篇论文的关键设计。query 不是开放式脑暴产生，而是从“已知证据链 + signal keywords”反推出来。作者希望确保：

- query 的答案完全可以在 sandbox 中验证；
- 任务必须同时结合用户文件和 web evidence；
- 无法通过一步公共搜索直接得到核心结论。

#### Stage 5：四维质量控制

候选 query 还要通过四项 QC：

1. Implicit Guidance：能引导到 signal keywords，但不能直接泄露答案；
2. Synthesis Necessity：必须同时整合用户文件和 web 证据；
3. Insight Novelty：核心结论不能直接被公开搜索一把搜到；
4. Interpretative Unambiguity：必须只有单一、明确解释。

最终从 280 个候选任务筛到 100 个：

- 105 个在 leave-one-out 阶段被剔除
- 75 个因事实难度不足被剔除
- 最终通过率 35.7%

### 2. 数据集统计：它为什么比“纯文本 query benchmark”更像现实

根据论文统计：

| 维度 | 数值 |
|------|------|
| 任务数 | 100 |
| 语言分布 | 英文 50 / 中文 50 |
| 多模态任务占比 | 68% |
| 文件类型占比 | 文档 45.98%，图像 27.68%，视频 13.84%，另含表格、音频、HTML |
| 平均用户文件数 | 2.24 |
| 单题用户文件上限 | 6 |
| PDF 平均长度 | 11.21 页 |
| Excel 平均规模 | 215.14 行 |
| 视频平均时长 | 3 分 27 秒 |
| 512k 档平均网页数 | 465.5 页 / 题 |

可以看到，这不是“给你一个问题、让你检索十几段文本”的轻量任务，而是接近真实 analyst / researcher 的工作形态。

### 3. DR3-Agent：为 closed-world deep research 适配的分层多智能体

为了证明 benchmark 不是空中楼阁，作者还实现了 DR3-Agent，基于 MiroFlow 框架，专门适配“用户文件 + 静态 sandbox”场景。

架构分三层：

- 主智能体：带感知工具和 Python 执行环境，维护全局上下文，执行 Plan-Act-Observe 循环；
- RAG 搜索子智能体：在 sandbox 中做迭代式 dense retrieval；
- 文件阅读子智能体：对长文本用户文件做关键词检索和按页读取。

其中特别值得注意的是 RAG 子智能体并非传统 single-shot top-k，而是基于 ReAct 的 Agentic-RAG：

- 用 text-embedding-3-small 建库；
- 按多轮迭代方式不断改写 query；
- 在不完整甚至冲突证据中调整搜索方向。

作者把这个过程类比为在超链接图上的启发式探索，这个比喻是成立的：它更像“研究路径搜索”，而不是标准向量检索。

### 4. 五项评测指标：把“找证据”和“写报告”拆开

DR3-Eval 把指标分成两大类。

#### 信息获取类

1. IR_UF：用户文件信息召回
   - 从 user files 中抽取 insight set，再看报告是否完整覆盖。

2. IR_SC：sandbox 信息召回
   - 从 sandbox corpus 中抽取 insight set，再看报告是否完整覆盖。

3. CC：Citation Coverage
   - 比较报告实际引用的文档集合，与任务真正必需的文档集合之间的覆盖率。

#### 报告生成类

4. FA：Factual Accuracy
   - 对报告里的 claim-source pair 做支持性校验。
   - 文本 claim 由 GPT-5.1 judge，音视频 claim 由 Gemini-2.5-Pro 辅助校验。

5. IF：Instruction Following
   - 先从 query 生成 checklist，再检查报告是否满足各项要求。

6. DQ：Depth Quality
   - 用 rubric 对分析深度与逻辑严谨性评分。

这里面最有价值的是：它没有把所有东西粗暴压成一个“报告质量总分”，而是允许研究者区分“证据没找全”与“报告写得不扎实”这两类失败。

---

## 训练 / 构造策略

这篇论文的重点不是训练新底模，而是 benchmark 构造策略和 agent 配置策略。

### 1. Benchmark 构造策略

| 策略 | 具体做法 | 解决的问题 |
|------|----------|------------|
| 真实需求 grounding | 从真实用户文件和真实研究情境出发 | 避免任务过于人工化 |
| 发散-收敛关键词蒸馏 | 先广覆盖，再拆 signal/noise | 把 query strategy 难度显式加入评测 |
| 三类网页设计 | supportive / distractor / noise | 不再把难度简化为 relevant / irrelevant |
| 反向构造 query | 先证据、后问题 | 避免开放任务评测歧义 |
| 多档 context 扩展 | 32k→512k | 测试噪声与长上下文鲁棒性 |
| 独立 per-task sandbox | 每题单独静态语料 | 保障复现、避免任务间干扰 |

### 2. DR3-Agent 运行设置

论文 4.1 节给出的主要实验配置：

- 主 agent 最大交互轮数：10
- RAG 子 agent 最大轮数：5
- 文件阅读子 agent 最大轮数：3
- 向量化模型：OpenAI text-embedding-3-small
- 文本 judge：GPT-5.1
- 多模态辅助 judge：Gemini-2.5-Pro
- 所有 judge 温度固定为 0

评测基线包括：

- Claude Sonnet 4
- GPT-4.1
- Gemini-2.5-Pro
- GLM-4.6 / GLM-4.7
- Qwen3-235B-A22B
- Qwen3-32B
- Qwen3-30B-A3B

这套设置说明作者想比较的不是“谁提示词更花”，而是不同强模型在同一闭环 research setting 下的系统性能力差异。

---

## 与现有方法的关键区别

| 维度 | 既有 deep research benchmark 常见做法 | DR3-Eval 的做法 |
|------|--------------------------------------|----------------|
| 检索环境 | 直接访问实时 web，结果随时间漂移 | 每题配静态 sandbox，保证可复现 |
| 任务输入 | 纯文本 query 为主 | query + 真实用户文件，多模态输入 |
| 噪声建模 | 常把网页分为 relevant / irrelevant | 显式区分 supportive / distractor / noise |
| 任务答案 | 开放式，难界定唯一证据路径 | 反向构造，保证可验证的证据链 |
| 评测重心 | 偏最终报告质量 | 同时评估信息获取与报告生成 |
| 适配场景 | 更像开放问答或网页检索 | 更像真实 analyst/research assistant 的报告生成 |

和 Table 1 对照，DR3-Eval 是少数同时满足这些条件的 benchmark：

- 支持 user files
- 支持 sandbox corpus
- 多模态
- 真实场景
- 多文件上传
- reverse construction

这也是作者为什么认为它补上了 DRBench、DeepResearchGym、Deep Research Bench 等方案之间的空缺。

---

## 实验结果主表

### 1. Table 2：总榜结果

论文比较了多个强基线在 64k / 128k / 512k sandbox 下的表现。最核心结论是：Claude Sonnet 4 三档总分都第一，GLM-4.7 基本稳定排第二。

| 模型 | Avg@64k | Avg@128k | Avg@512k | 备注 |
|------|---------|----------|----------|------|
| Claude Sonnet 4 | 70.7 | 67.5 | 65.6 | 三档第一 |
| GLM-4.7 | 69.8 | 66.9 | 64.1 | 三档接近第二 |
| GLM-4.6 | 66.8 | 64.5 | 62.3 | 第三梯队 |
| Gemini-2.5-Pro | 61.5 | 60.6 | 57.0 | 中上，但随上下文变长下降明显 |
| GPT-4.1 | 51.9 | 51.3 | 50.9 | IF 不差，但整体偏低 |
| Qwen3-235B-A22B | 51.1 | 49.6 | 48.7 | 大模型规模不等于 research 能力领先 |
| Qwen3-32B | 45.9 | 46.7 | 45.2 | 明显更弱 |
| Qwen3-30B-A3B | 42.2 | 44.3 | 42.8 | 表现垫底 |

### 2. Claude Sonnet 4 的关键细项表现

用户特别值得关注的是最佳模型在六项指标上的细分数据，因为它揭示了当前最强系统到底强在哪、又弱在哪。

| 指标 | 64k | 128k | 512k |
|------|-----|------|------|
| IR_UF | 58.8 | 60.4 | 60.8 |
| IR_SC | 55.3 | 46.6 | 41.8 |
| CC | 64.7 | 54.8 | 48.5 |
| FA | 87.0 | 82.7 | 82.1 |
| IF | 87.4 | 89.2 | 88.5 |
| DQ | 70.7 | 71.5 | 72.0 |
| Avg. | 70.7 | 67.5 | 65.6 |

从这张表能读出两个很关键的现象：

- IR_SC 和 CC 随 context 增长下滑最明显；
- DQ 与 IF 并没有同步崩，甚至 DQ 在 Claude 上略升。

这再次说明长上下文 deep research 里的主问题是“检索和证据组织”，不是单纯的语言生成质量。

### 3. 论文作者对主结果的四点总结

论文在 Table 2 和 Figure 4 后给出四个结论：

1. DR3-Eval 很难，Claude Sonnet 4 最优；
2. context 越长，整体性能越差；
3. 更好的 Instruction Following 不代表更高 Factual Accuracy；
4. 不同 domain、不同模型之间存在明显异质性。

其中第 3 点非常重要：像 GPT-4.1、Qwen3-235B-A22B 这类模型，IF 并不低，但 FA 偏低，说明它们更容易写出“形式上完整”的报告，而不是事实层面扎实的报告。

### 4. Table 3：sandbox 与实时 web 的相关性

作者专门做了一个很重要的验证：静态 sandbox 会不会和真实 web 差得很远？

在英文子集上，他们让 Qwen3-235B-A22B 与 Gemini-2.5-Pro 分别跑 baseline sandbox 与实时 web 搜索，结果如下：

| 模型 | 设置 | IR_SC | IR_UF | CC | FA | IF | DQ | Avg. |
|------|------|------:|------:|---:|---:|---:|---:|----:|
| Qwen3-235B-A22B | Baseline | 33.2 | 23.9 | 36.3 | 59.0 | 73.6 | 63.8 | 48.3 |
| Qwen3-235B-A22B | w/ Web | 38.5 | 20.2 | 28.0 | 60.3 | 79.2 | 62.0 | 48.0 |
| Gemini-2.5-Pro | Baseline | 40.4 | 27.4 | 50.4 | 76.3 | 80.1 | 67.8 | 57.1 |
| Gemini-2.5-Pro | w/ Web | 41.9 | 25.4 | 49.0 | 75.9 | 84.1 | 70.4 | 57.8 |

作者据此认为：

- 两种设置总体分数接近；
- Citation Coverage 一致性尤其高；
- 没观察到明显系统性偏差。

这说明 sandbox 虽然不是 live web，但在决定任务成败的核心证据难度上，确实保留了相当高的真实性。

---

## 复现评估

这篇论文在“benchmark 是否站得住”上做了比一般论文更完整的自证。

### 1. bootstrap 显著性与稳定性

作者做了 10,000 次 bootstrap 分析，得到：

- 前两名模型的 95% 置信区间不重叠；
- Wilcoxon 检验 p = 0.0046，说明头名与第二名差异显著；
- repeated evaluations 的 total score variance 仅 0.874；
- 重采样下模型排名的 Kendall’s τ = 0.969；
- Spearman’s ρ = 0.991。

另外，三次重复运行的标准差也很低：

- Claude Sonnet 4：0.83
- GLM-4.7：0.85
- GLM-4.6：1.33

这说明它不只是“能排出榜单”，而且榜单具有统计稳定性。

### 2. LLM-as-judge 与人评的一致性

作者随机抽取 50 篇报告，由 4 位专家独立评审，并与自动评分做相关性比较。Table 4 给出：

| 方法 | Pearson r | Spearman ρ | Pairwise Agreement |
|------|-----------|------------|--------------------|
| DR3-Eval 自动评分 | 0.78 | 0.73 | 0.89 |
| Inter-Human | 0.83 | 0.76 | 0.91 |

这个结果相当强：自动评分与人评的一致性已经接近人类之间的一致性。

此外，针对 FA 的自动 claim extraction，论文还报告：

- Precision = 0.924
- Recall = 0.960

说明自动事实核查链路并不是完全脆弱的“黑箱打分”。

### 3. judge 模型替换的鲁棒性

作者还把 GPT-5.1 judge 换成：

- Claude Sonnet 4
- Gemini-2.5-Pro
- Qwen-Max

重新给 6 个模型排序，和 GPT-5.1 版本相比：

- 平均 Spearman’s ρ = 0.924

多模态辅助 judge Gemini-2.5-Pro 再替换为 Qwen3-VL-Plus 与 Kimi-k2 时：

- 平均 Spearman’s ρ = 0.864
- 最终分数平均差异 < 2 分
- p > 0.05

这说明评测不强依赖某一个 judge 的“个人口味”。

### 4. retriever 与 Agentic-RAG 配置分析

论文还做了若干实用层面的复现实验。

#### 不同 retriever

Table 5 比较了 128k 语料下三种检索策略在 CC 上的效果：

| 模型 | OpenAI-Emb | Qwen-Emb | BM25 |
|------|-----------:|---------:|-----:|
| GLM-4.7 | 56.58 | 53.61 | 50.71 |
| GPT-4.1 | 36.15 | 35.64 | 22.60 |
| Gemini-2.5-Pro | 49.51 | 37.16 | 31.25 |

结论很清楚：

- text-embedding-3-small 最稳；
- Qwen embedding 稍弱；
- BM25 明显不适合这个 setting。

#### RAG 最大迭代轮数

Table 6 显示，增加 Agentic-RAG 轮数通常会提升 IR 和 CC，但不是无限增长：

| Turns | Qwen3-235B IR | Qwen3-235B CC | Gemini-2.5-Pro IR | Gemini-2.5-Pro CC |
|------|---------------:|--------------:|------------------:|------------------:|
| 1 | 27.2 | 14.8 | 32.4 | 21.0 |
| 3 | 34.7 | 27.1 | 39.6 | 47.6 |
| 5 | 33.9 | 27.1 | 44.6 | 51.0 |
| 7 | 44.0 | 32.9 | 38.1 | 48.1 |

作者的解释是：轮数增加能改善信息获取，但到一定程度后会出现收益见顶甚至回落。这和真实 agent 系统一样，更多 step 不一定等于更高质量，可能也会带来搜索漂移与上下文污染。

---

## 批判性分析

### 1. 这篇论文最大的优点：终于把“真实性”和“可复现性”同时往前推了一步

很多 deep research benchmark 都只解决了其中一边：

- live web benchmark 更真实，但几乎必然有时间漂移；
- offline benchmark 更稳定，但常常任务过干净、过文本化。

DR3-Eval 的贡献在于，它不是简单缓存网页，而是从任务构造逻辑上保证：

- 题目来自真实多模态研究场景；
- 证据环境是静态可复现的；
- query 是围绕可验证证据链反推出来的。

这比“做一个更大的题库”更重要，因为它定义了 deep research benchmark 应该怎么设计。

### 2. 它揭示了一个很现实的问题：最强模型也没有真正解决 noisy research

即便是 Table 2 第一名 Claude Sonnet 4，在 512k 下：

- IR_SC 只有 41.8
- CC 只有 48.5
- Avg 为 65.6

这说明最强模型在“深研究”上的真实状态仍然是：

- 写作层面成熟；
- 事实层面相对稳；
- 但面对大规模噪声语料时，证据召回与引用覆盖仍然远不够好。

如果把 deep research agent 理解为“能替你完成复杂调研”，这套结果实际上相当保守，并不乐观。

### 3. 论文也有几个值得保留意见的地方

#### (1) 任务规模仍然偏小

100 个任务对一篇 benchmark paper 来说不算少，但若要成为长期行业基准，这个量级仍偏有限。尤其 deep research 的领域分布非常长尾，100 题还不足以覆盖更复杂的专业工作流。

#### (2) sandbox 终究不是 live web

虽然 Table 3 说明 sandbox 与实时 web 的总体分数接近，但这仍只能证明“在作者选取的英文子集和两个模型上，系统性偏差不明显”。它并不能完全替代 live web 中以下变量：

- 页面更新速度
- 搜索引擎排序变化
- 站点可访问性差异
- 临时热度与舆论偏见

也就是说，DR3-Eval 更像是“强可复现的近似现实环境”，而不是现实本身。

#### (3) judge 体系虽然强，但仍是 LLM judge 体系

论文在人评一致性、judge 替换鲁棒性上做得很好，这比很多同类工作扎实得多。但最终 IR / IF / DQ 等核心维度仍依赖 judge 模型。只要是 LLM judge，就仍有潜在风险：

- 对特定报告风格的偏好；
- 对自家模型系列的轻微偏置；
- 对“分析深度”这类高层概念的主观性。

作者其实也承认了 model bias 现象，只是认为对最终排名影响不大。

#### (4) DR3-Agent 的强弱，不应和 benchmark 设计贡献混为一谈

论文同时提出 benchmark 和 agent。前者的学术贡献更稳健；后者更像一个展示 benchmark utility 的 reference system。未来如果社区采用 DR3-Eval，真正会被持续迭代和超越的，大概率是 agent 体系，而不是 benchmark 构造原则。

### 4. 我对这篇论文的最终判断

如果你关心的是“下一个更强的 research agent 怎么做”，这篇论文给你的不是现成答案；
但如果你关心的是“research agent 到底该怎么被公平地评估”，那它很可能是 2026 年目前最值得读的一篇。

它把 deep research benchmarking 从“跑一次 demo、贴一篇漂亮报告”推进到了“有固定语料、有证据路径、有显著性检验、有 judge 校准”的阶段。这种基础设施工作，往往比单次 SOTA 更有长期价值。
