---
title: "MADQA：Agent 文档推理还是暴力搜索？18% 的 Oracle 差距"
description: "Snowflake 联合多机构发布 2,250 题 × 800 篇 PDF 的 Agent 文档推理 benchmark，用 Classical Test Theory 驱动设计，首次系统对比人类与 Agent 的文档搜索行为——结论是 Agent 靠暴力搜索而非策略规划"
---

# MADQA：Agent 文档推理还是暴力搜索？18% 的 Oracle 差距

> 论文：[Strategic Navigation or Stochastic Search? How Agents and Humans Reason Over Document Collections](https://arxiv.org/abs/2603.12180)
>
> 作者：Łukasz Borchmann, Jordy Van Landeghem, Ryan Othniel Kearns 等（Snowflake AI Research / UNC-Chapel Hill / Oxford / HuggingFace）
>
> 当最强 Agent 在文档集上的准确率追上人类搜索者时，看起来问题已解决——但深入分析发现，Agent 做对的题和人类完全不同，它们在靠暴力搜索而非策略规划，距 oracle 仍有 ~18% 的不可逾越鸿沟。

---

## 一、这篇论文在解决什么问题

### 1.1 背景

多模态 Agent 越来越多地被用于企业级文档密集型工作流——合同审查、财报分析、合规检查。但当前评估 Agent 文档推理能力的 benchmark 存在三大缺陷：

1. **格式碎片化**：BRIGHT、Researchy Questions 等 Agent benchmark 用 HTML/纯文本，忽略了真实 PDF 的视觉理解需求
2. **范围受限**：FinRAGBench-V 等局限于特定垂直领域，或只测单步检索
3. **数据完整性不足**：ViDoRE、VIMDoc 等用 MLLM 生成问题（引入偏差）或回收旧数据集（数据泄漏风险）

### 1.2 核心问题

1. 当前多模态 Agent 在文档集上的推理行为是**策略性导航**还是**随机搜索**？
2. Agent 和人类在解决文档问题时的行为模式有什么本质差异？
3. 如何设计一个高区分度的 benchmark 来可靠测量 Agent 的文档推理能力？

---

## 二、方法：怎么解决的

### 2.1 核心 Insight

**准确率相当 ≠ 能力相当。** Agent 和人类在 MADQA 上可以达到相似的整体准确率，但它们做对的题集合几乎不重叠——Agent 在简单定位任务上碾压人类，但在需要跨文档推理的复杂问题上比人类差 ~20%。Agent 用暴力搜索弥补策略规划的不足，代价是大量的无效计算。

### 2.2 技术细节

**Benchmark 设计**

MADQA 包含 **2,250 个人工编写问题 + 800 篇异构 PDF 文档**，覆盖 13 个高级领域、63 个细分类别。六个核心属性定义了任务：

| 属性 | 含义 |
|------|------|
| Extractive | 答案必须在证据页面中逐字出现 |
| Multi-Hop | 证据可能跨页或跨文档 |
| Closed-World | 仅从语料库推导，不依赖外部知识 |
| Grounded | 证据必须最小化（不多引不少引） |
| Agentic | 不存在单一检索查询能一次获取所有证据 |
| Visual | 回答可能需要非文本信息（表格、图表、布局） |

**Classical Test Theory 驱动的数据集划分**

这是与其他 benchmark 的关键差异。论文用 CTT 计算每道题的 **Difficulty**（平均准确率）和 **Discrimination**（与总分的 point-biserial 相关性），优先选择高区分度的题目进入测试集。同时保留 20% "Sentinel Pool"——当前没有任何模型能做对的题——确保 benchmark 不会被快速饱和。

最终划分：Test 500 题、Dev 200 题、Train 1550 题。Test 与完整 benchmark 的 Spearman ρ > 0.85。

**评估协议（三维度）**

1. **Answer Correctness**：LLM-based 评估（与人类判断 Cohen's κ = 0.88），校准后做偏差校正
2. **Retrieval Attribution**：Page F1（页级精确匹配）+ Doc F1（文档级宽松匹配）
3. **Effort Calibration**：用 **Kuiper 统计量** 衡量"准确率-努力"的依赖关系

Kuiper 统计量的直觉：

$$K = \max_{0 \leq k \leq N} D_k - \min_{0 \leq k \leq N} D_k, \quad D_k = \sum_{j=1}^{k}(y_{\pi(j)} - \bar{y})$$

其中样本按搜索步数排序。$K$ 值越高 = 准确率和搜索步数的关系越强 = Agent 越不"节制"。低 $K$ 意味着 Agent 在简单和复杂问题上都能校准自己的搜索投入。

### 2.3 基线系统

论文评估了三大类系统：

| 类别 | 代表 | 特点 |
|------|------|------|
| 非 Agentic | Gemini File Search, GPT File Search | 黑盒 RAG 服务，固定计算预算 |
| BM25 MLLM Agent | GPT-5/Claude/Gemini + BM25 搜索 | 文本检索 + 视觉推理，迭代式 |
| RLM (Recursive Language Models) | GPT/Claude + 程序化分解 | 任务无关的递归处理，不受限 |

---

## 三、实验结果

### 3.1 主要结果

**Table 3 核心数据：**

| 系统 | 整体准确率 | X-Page | X-Doc | Page F1 | Kuiper ↓ |
|------|-----------|--------|-------|---------|---------|
| **Human Oracle** | **99.4%** | **100%** | **98%** | — | — |
| **Human BM25 Agent** | **82.2%** | 79.6% | 72.0% | 79.3% | **14.6** |
| Gemini 3 Pro BM25 Agent | 82.2% | 66.8% | 73.0% | 78.5% | 25.8 |
| Claude Sonnet 4.5 BM25 Agent | 80.6% | 66.8% | 82.0% | 79.1% | 35.1 |
| GPT-5 BM25 Agent | 77.7% | 60.1% | 74.0% | 74.2% | 52.6 |
| Gemini 3 Pro (Non-Agentic) | 78.6% | 74.1% | 75.0% | 70.1% | — |

**关键解读：**

1. **最强 Agent（82.2%）追平了人类搜索者（82.2%）**——但距离 Human Oracle（99.4%）仍有 **17.2% 的差距**。这个差距来自检索，不是推理。
2. **X-Page/X-Doc 子集上差距巨大**：人类在跨页问题上 79.6%，Gemini/Claude Agent 只有 66.8%——Agent 在多跳推理上弱了 ~13 个百分点。
3. **Kuiper 统计量揭示效率差距**：人类 14.6 vs GPT-5 Agent 52.6——Agent 在复杂问题上消耗了大量无效搜索步骤却仍然做错。
4. **非 Agentic Gemini 3 Pro File Search（78.6%）几乎追平了 Agentic 系统**——说明在某些场景下，好的 RAG 基线可以免去 Agent 的复杂性。

### 3.2 关键图表解读

**视觉理解需求（Figure 4）**：仅 42% 的问题可以从纯文本回答——58% 需要理解结构化布局、表格或视觉工件。这验证了 PDF benchmark 必须是多模态的。

**Agent vs 人类行为差异**：Agent 和人类做对的问题集合有极低的重叠度。Agent 擅长的是"给出确切关键词就能找到"的简单定位，而人类擅长的是"需要理解文档结构和跨文档关系"的推理型任务。

### 3.3 消融实验

**非 Agentic vs Agentic**：Agent 系统一致优于同模型的非 Agentic 版本（如 GPT-5 Agent 77.7% vs GPT-5 File Search 49.6%），证明迭代搜索的价值。但代价是计算量增加 10-50×。

**RLM 的问题**：Recursive Language Models（如 Gemini 3 Pro RLM，73.8%）表现不错但计算开销巨大，且容易陷入递归深度爆炸。受限的 Agent（BM25 Agent）在性价比上更优。

---

## 四、复现与落地评估

### 4.1 复现难度评估

| 维度 | 评级 | 说明 |
|------|------|------|
| 代码开源 | ✅ | [Snowflake-Labs/MADQA](https://github.com/Snowflake-Labs/MADQA) 已开源评估框架 |
| 数据可得性 | ✅ | 2,250 问题 + 800 PDF 全部公开 |
| 算力需求 | 中 | 评估需要 API 调用，不需要训练 |
| 依赖复杂度 | 低 | 标准 Python + LLM API |
| 复现总评 | ⭐⭐⭐⭐⭐ | 完整公开，可直接使用 |

### 4.2 工业落地可行性

- **适用场景**：任何文档密集型 Agent 的评估（法律、金融、合规审计）
- **性能开销**：评估 500 道测试题需要 ~500 次 Agent 调用，成本取决于 Agent 使用的模型
- **集成难度**：可直接作为评估套件集成到 CI/CD 中
- **风险点**：800 篇 PDF 的规模在企业场景中偏小，可能低估真实部署中的检索困难
- **落地总评**：⭐⭐⭐⭐ （作为评估工具直接可用，作为训练信号价值更高）

---

## 五、SOTA 对照矩阵

| Benchmark | 文档类型 | 多模态 | 人工标注 | Agentic 评估 | 数据新鲜度 |
|-----------|---------|-------|---------|-------------|-----------|
| **MADQA** | **800 异构 PDF** | **✅** | **✅ 全人工** | **✅ 含效率指标** | **✅ 全新文档** |
| ViDoRE v3 | PDF 集合 | ✅ | ✅/❌ | ❌ 单步检索 | ⚠️ |
| BRIGHT | HTML/文本 | ❌ | ✅ | ✅ | ✅ |
| FinRAGBench-V | 金融 PDF | ✅ | ✅ | ❌ | ⚠️ 单领域 |
| Researchy Questions | 文本集合 | ❌ | ✅/❌ | ✅ | ✅ |
| M3DocRAG | 网页转 PDF | ⚠️ | ❌ | ❌ | ❌ |

MADQA 是目前唯一同时满足"异构 PDF + 全人工标注 + Agentic 评估 + 全新文档"四个条件的 benchmark，填补了一个明确的空白。

---

## 六、讨论与局限

### 6.1 论文自身讨论的局限

- 800 篇文档在规模上仍偏小（企业场景可能是万级）
- 人类 baseline 的搜索者并非领域专家
- Kuiper 统计量对 effort 的定义（tool calls 数量）可能不够精确——不同 tool call 的计算成本差异很大
- 未评估结合了视觉检索的 Agent（如 ColPali-based 系统）

### 6.2 我的额外观察

**非 Agentic Gemini 的强表现值得深思。** Gemini 3 Pro File Search（78.6%）几乎追平了 Agentic 系统（82.2%），而计算成本可能低 10-50×。这说明在很多实际场景中，"先把 RAG 做好"比"上 Agent"更务实。

**82.2% vs 99.4% 的差距是检索问题，不是推理问题。** Human Oracle（给人类完美证据）达到 99.4%——说明一旦找到正确证据，回答几乎不出错。Agent 的瓶颈不是"读不懂文档"，而是"找不到正确的文档/页面"。

**Classical Test Theory 的 benchmark 设计值得推广。** 用 Difficulty × Discrimination 矩阵来筛选高质量测试题、用 Sentinel Pool 保留长期 headroom——这种方法论应该被更多 benchmark 采用，而不只是随机划分。

**Kuiper 统计量是一个有趣的新指标。** 传统 benchmark 只看准确率，MADQA 引入了"效率校准"维度。在实际部署中，一个准确率 75% 但 Kuiper=15 的 Agent（高效且校准）可能比准确率 82% 但 Kuiper=53 的 Agent（浪费大量 token 在注定失败的搜索上）更有价值。

---

## 七、对我们的启示

**谁应该关注这篇论文？**
- 构建文档处理 Agent 的工程师（直接评估工具）
- RAG 系统开发者（baseline 对比）
- Benchmark 设计者（方法论参考）

**核心 takeaway：**
1. Agent 在文档集上的"高准确率"是暴力搜索换来的，不是策略规划
2. 检索（找到正确页面）是比推理（理解页面内容）更大的瓶颈
3. 跨文档多跳推理是 Agent 的核心弱点——比人类差 ~13 个百分点
4. 好的 RAG 基线（Gemini File Search）可以在 1/10 成本下达到 Agent 95% 的效果
5. Kuiper 效率指标值得在 Agent 评估中推广

**实践建议：**
1. 在你的文档 Agent 管线中加入"搜索策略模块"——不只是优化检索召回率，更要优化"何时停止搜索"
2. 用 MADQA 作为评估套件：[github.com/Snowflake-Labs/MADQA](https://github.com/Snowflake-Labs/MADQA)
3. 在部署前对比你的 Agent 和简单 RAG baseline——如果差距不大，可能不需要 Agent 的复杂性

---

## 论文速查卡

| 项目 | 内容 |
|------|------|
| **标题** | Strategic Navigation or Stochastic Search? How Agents and Humans Reason Over Document Collections |
| **作者** | Łukasz Borchmann 等, Snowflake / UNC-Chapel Hill / Oxford / HuggingFace |
| **链接** | [arXiv:2603.12180](https://arxiv.org/abs/2603.12180) |
| **发表** | 预印本 (2026-03-12) |
| **一句话总结** | MADQA 用 2,250 个人工问题 × 800 篇 PDF 首次系统证明：Agent 在文档集推理中靠暴力搜索弥补策略规划不足，准确率追平人类但行为路径完全不同，距 oracle 仍有 18% 差距 |
| **大白话版** | 想象一个在图书馆找资料的实习生——他很勤快，把每本书都翻一遍就能找到答案。但图书馆管理员只需翻三本书就搞定了。实习生和管理员的正确率差不多，但实习生浪费了 10 倍的时间 |
| **核心数字** | 最强 Agent 82.2% vs Human Oracle 99.4%（18% 差距）；Agent 跨页准确率 66.8% vs 人类 79.6% |
| **复现评级** | ⭐⭐⭐⭐⭐ |
| **落地评级** | ⭐⭐⭐⭐ |
