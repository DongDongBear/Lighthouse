---
title: "深度解读 | Google《Building with Gemini Embedding 2》：把多模态检索底座直接对准 agentic RAG"
description: "Gemini Embedding 2, multimodal embeddings, agentic RAG, Matryoshka, visual search, vector retrieval"
---

# 深度解读 | Google《Building with Gemini Embedding 2》：把多模态检索底座直接对准 agentic RAG

> 原文链接：https://developers.googleblog.com/building-with-gemini-embedding-2/
> 来源：Google Developers Blog
> 作者：Patrick Löber、Lucia Loher、Roberto Santana
> 发布日期：2026-04-30

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Google 不是只发了一个 embedding 新 SKU，而是在把文本、图像、视频、音频、文档统一进同一个向量空间，直接服务 agentic multimodal RAG。 |
| 大白话版 | 以前企业做知识检索，经常文档一套、图片一套、音频再一套；Gemini Embedding 2 想让这些东西都进同一个“记忆坐标系”。 |
| 核心要点 | • 单空间多模态向量 • 支持 interleaved 输入 • Matryoshka 降维节省存储 • 直接面向检索、搜索、重排、聚类 |
| 价值评级 | A — 这是 Google 在 agent 基础设施层补短板，不是表面功能更新。 |
| 适用场景 | 企业知识库、multimodal RAG、视觉搜索、搜索重排、跨语言检索、内容理解 |

## 文章背景

这篇文章的重要性不在“embedding 也进入 GA 了”，而在它出现的时间点。

过去一年 Google 在聊天、代码、图像生成、Workspace 入口上都打得很热闹，但对真正做系统的开发者来说，最关键的问题反而常常更底层：如果我要做一个多模态 agent，它如何统一理解 PDF、截图、图片、音频、视频和文本？这不是聊天界面的事，而是检索与记忆层的事。

Gemini Embedding 2 的定位，就是把这层补起来。文章一开头就把口径说得很直：
- 这是 Gemini API 中第一个把 text / images / video / audio / documents 映射到同一 embedding space 的模型；
- 支持 100+ 语言；
- 明确面向 agentic multimodal RAG、visual search 和更广泛的检索场景。

这不是“开发者也可以顺手玩玩”的能力，而是 Google 想把多模态检索底座纳入 Gemini 平台体系的信号。

## 完整内容还原

### 1. 统一向量空间是这篇文章的主角

文章最先强调的不是 benchmark，而是“同一 embedding space”。

Gemini Embedding 2 支持单次请求处理：
- 最多 8,192 text tokens
- 6 张图片
- 120 秒视频
- 180 秒音频
- 6 页 PDF

这意味着它不是只做文本 embedding 扩展版，而是从接口定义上就假设：真实知识资产本来就是异构的。

### 2. interleaved multimodal input 是最关键的产品定义

文章专门强调，Gemini Embedding 2 的真正威力在于能够处理 interleaved inputs——例如文本和图像混合组成一个查询。

给的示例很清楚：

```python
from google import genai
from google.genai import types

client = genai.Client()
with open('dog.png', 'rb') as f:
    image_bytes = f.read()

result = client.models.embed_content(
    model='gemini-embedding-2',
    contents=[
        "An image of a dog",
        types.Part.from_bytes(
            data=image_bytes,
            mime_type='image/png',
        ),
    ]
)
print(result.embeddings)
```

这段代码的价值不在“Python API 很方便”，而在它明确说明：输入可以天然地是多模态组合，而不是先拆成各自 embedding 再硬拼。

### 3. Agentic RAG 是第一落点

文章把 agentic retrieval-augmented generation 放在第一类重点用例，说明 Google 眼里 embedding 不再只是“搜索向量”，而是 agent memory 的底层接口。

它建议使用 task prefixes 来优化不同任务：
- `task: question answering | query: {content}`
- `task: fact checking | query: {content}`
- `task: code retrieval | query: {content}`
- `task: search result | query: {content}`

文档侧则建议写成：
- `title: {title} | text: {content}`

这个设计其实很有意思：Google 不是把 embedding 当成纯粹的静态语义压缩，而是把 task intent 也编码进向量构造过程。换句话说，同一段文本，在“问答”“事实核查”“代码检索”里，可以拥有略微不同的语义投影。

### 4. 真实客户案例比模型口号更重要

文章举了三个例子：

1. **Harvey**
- 法律研究平台
- 相比之前 embedding，在法律专用 benchmark 上 Recall@20 precision 提升 3%
- 带来更准确的 citation 和答案

2. **Supermemory**
- 做“memory vector database”
- Recall@1 提升 40%
- 被用于 indexing、search、Q&A 核心检索链路

3. **Nuuly**
- 用于仓库服装识别的视觉搜索
- Match@20 从 60% 拉到接近 87%
- 总体成功识别率从 74% 提到 90%+

这三个案例共同说明一件事：Google 不只是想证明 embedding 语义更强，而是想证明它能在垂直工作流里直接提高检索命中率和业务结果。

### 5. 搜索重排与分类是“基础设施的基础设施”

文章后半段没有只停在 RAG，而是继续讲：
- search reranking
- clustering
- classification
- anomaly detection

并给出用 cosine similarity / dot product 重排结果的例子。这里的重点不是算法本身，而是 Google 在暗示：Gemini Embedding 2 不是一招鲜，而是所有 retrieval / ranking / grouping / anomaly pipeline 的公用底座。

### 6. Matryoshka 是成本层亮点

文章最后抛出的最硬工程信息，是 Matryoshka Representation Learning（MRL）。

默认向量维度是 3072，但可以通过 `output_dimensionality` 截断到更小：
- 推荐 1536
- 或 768

示例：

```python
result = client.models.embed_content(
    model="gemini-embedding-2",
    contents="What is the meaning of life?",
    config={"output_dimensionality": 768}
)
```

同时文章明确说：
- 更低维可以降成本；
- Batch API 在 embedding 场景可以做到默认价格的 50% 并提供更高吞吐。

这说明 Google 很清楚 embedding 市场不是只看精度，还得看：
- 存储成本
- 检索延迟
- 向量库扩容压力
- 线上吞吐

## 核心技术洞察

### 1. 统一语义空间比“再强一点文本 embedding”更重要

这篇文章真正定义的不是一个更强 embedding 模型，而是一种更统一的多模态 memory substrate。对 agent 来说，这比单纯提升文本检索分数更关键。

### 2. task prefix 本质上是在做“任务条件化检索”

Google 在这里的设计很聪明：同一内容，在不同任务下投影到不同检索语义。这样做能缩短 query 和 document 在目标任务上的语义距离，尤其适合 asymmetric retrieval。

### 3. Matryoshka 让“精度 vs 成本”不必是二选一

3072 维给你上限，1536/768 给你部署弹性。这让一个模型可以覆盖从高精度企业检索到成本敏感在线服务的多层场景。

## 实践指南

### 🟢 今天就能用

1. **企业知识库做统一向量底座**
- 把 PDF、截图、图片、音频说明统一入库
- 先用同一 embedding space 打通 recall
- 再在上层做 rerank / answer generation

2. **多模态工单 / 文档助手**
- 把报错截图 + 日志说明一起 embed
- 解决“图和文不在一套检索系统里”的老问题

3. **视觉搜索与资产识别**
- 以图片 + 文本联合查询为核心接口
- 比纯文本标签检索更适合非结构化资产场景

### 🟡 需要适配

1. **task prefixes 不要偷懒**
如果你把所有查询都当 `question answering`，会损失效果。必须按 retrieval / fact checking / code retrieval 等任务切前缀。

2. **维度要按业务选，不要默认 3072**
- 高价值法律 / 合规 / 高风险检索：3072 或 1536
- 大规模在线搜索：先试 768
- 要结合召回、存储和延迟做 AB

### 🔴 注意事项

1. 多模态统一空间很强，但不等于所有模态都天然同质，索引策略仍需要按数据类型调。
2. 文章给的是用例与客户成绩，不是完整 benchmark 白皮书；真正上生产还要自己测。
3. interleaved input 能力很关键，但也会逼你重新设计 query 构造，而不是继续沿用旧文本检索接口。

## 横向对比

| 话题 | 本文观点 | 常见旧方案 | 为什么本文更进一步 |
|---|---|---|---|
| 模态组织 | 文本/图像/视频/音频/文档统一空间 | 每种模态单独建库 | 降低跨模态桥接成本 |
| 检索目标 | 直接面向 agentic multimodal RAG | 主要面向传统语义搜索 | 更贴近 agent memory 需求 |
| 成本控制 | Matryoshka 可降维 | 维度固定，迁移成本高 | 同一模型支持不同成本档 |
| 任务适配 | task prefixes 条件化 | 通用 embedding 一把梭 | 检索语义更贴近真实任务 |

## 批判性分析

### 局限性

1. **缺少完整公开 benchmark**
文章给了客户案例，但没有一张足够系统的公开大表来证明它在各类 embedding 基准上全面领先。

2. **更像产品定义文，不是研究报告**
对开发者够用了，但对严肃技术评估来说，仍缺更多训练、对比、失效案例。

3. **企业治理问题没展开**
统一多模态向量空间固然方便，但数据权限、删除、审计、隔离策略会更复杂，文章没讲这部分。

### 适用边界

最适合：
- 企业知识库
- 多模态搜索
- 视觉 + 文本联合检索
- agent memory / document understanding

不一定立刻适合：
- 极低延迟、极低成本且只做短文本检索的场景
- 已经 heavily optimized 的单模态搜索系统

## 对领域的影响

这篇文章最值得重视的地方，是它把 embedding 从“检索配角”重新抬回了系统中心。

2026 年很多人还在盯聊天窗口、智能体外显行为，但真正决定 agent 上限的，往往是它背后的 memory substrate。Google 这次显然是在抢这一层：
- 前端可以是 Gemini；
- 运行平台可以是 Agent Platform；
- 底层多模态记忆与检索，也尽量收拢到 Gemini Embedding 2。

短期看，这会推动更多团队把 RAG 从“文本 RAG”升级成“多模态 RAG”。

中期看，如果这套 embedding 底座和 Workspace、Vertex、Agent Platform 继续打通，Google 会在“企业多模态记忆层”建立比聊天功能更难替代的壁垒。

我的判断：Gemini Embedding 2 不是最显眼的 headline，但它很可能是 Google 这波 agent 基础设施里最实的一块砖。谁把记忆层做成统一多模态，谁就更有资格谈下一代 agent 系统。