---
title: "03. RAG、Agent 与推理扩展：从检索原理到 Test-Time Compute"
---

# 03. RAG、Agent 与推理扩展：从检索原理到 Test-Time Compute

前两章讲了模型本身和训练方法。这一章讲模型如何与外部世界交互——检索文档、使用工具、管理上下文——以及如何在推理时花更多算力换更好的答案。

---

## 一、Embedding 的数学原理

### 1.1 从 Word2Vec 到现代 Embedding

Embedding 的核心思想：**用"上下文"定义"含义"**。

Word2Vec（2013）的训练任务：

```
给定 "巴黎 是 法国 的 ___"，预测中间的词。
给定 "___"，预测周围的词。
```

训练完成后，经常出现在相似上下文中的词，其向量自然接近。

现代 Embedding 模型（如 KARL 使用的 Qwen3-8B Embeddings）不是词级别的，而是**段落级别的**：输入一整段文本，输出一个向量。

### 1.2 余弦相似度

两个向量 a, b 的余弦相似度：

$$
\cos(a, b) = \frac{a \cdot b}{\|a\| \cdot \|b\|} = \frac{\sum_i a_i b_i}{\sqrt{\sum_i a_i^2} \cdot \sqrt{\sum_i b_i^2}}
$$

数值例子（简化为 4 维）：

```
a = [0.8, 0.3, 0.1, 0.5]    ("法国首都")
b = [0.7, 0.4, 0.2, 0.4]    ("巴黎")
c = [0.1, 0.9, 0.8, 0.0]    ("量子力学")

cos(a, b) = (0.56 + 0.12 + 0.02 + 0.20) / (0.990 * 0.906) = 0.90 / 0.897 = 0.998
cos(a, c) = (0.08 + 0.27 + 0.08 + 0.00) / (0.990 * 1.208) = 0.43 / 1.196 = 0.360
```

"法国首都"和"巴黎"相似度 0.998（很高），和"量子力学"相似度 0.360（很低）。

### 1.3 向量检索的实现

**暴力搜索**：计算 query 和所有文档的相似度，返回 top-k。复杂度 O(N)。当 N = 2600 万（TREC-Biogen 的规模）时，每次查询要计算 2600 万次点积。

**近似最近邻（ANN）**：

主流方法是 **HNSW（Hierarchical Navigable Small World）**：

```
构建一个多层图:
  最顶层: 少数节点，长距离连接（快速定位大致区域）
  中间层: 更多节点，中等距离连接
  最底层: 所有节点，短距离连接（精确搜索）

查询时:
  从顶层开始 → 贪心走向最近邻 → 降到下一层 → 继续 → 到底层返回 top-k
```

HNSW 的查询复杂度约 O(log N)，召回率通常 > 95%。

KARL 使用**嵌入式向量数据库**：不走网络，直接在进程内存中查询。每机 500+ QPS，消除了网络 I/O 瓶颈。

---

## 二、Chunking 策略

### 2.1 为什么要分块

一篇 50 页的财报约 25000 token。直接做 embedding：

- 信息被稀释（一个向量要编码太多内容）
- 检索粒度太粗（你需要的可能是第 45 页的一个表格）

分块后，每个 chunk 的信息密度更高，检索更精确。

### 2.2 分块方法

**固定长度分块**：

```
文档 → 每 512 token 切一块
优点: 简单
缺点: 可能切断句子或段落
```

**语义分块**：

```
文档 → 检测段落/章节边界 → 在边界处切分
优点: 保持语义完整性
缺点: chunk 长度不均匀
```

**滑动窗口分块**：

```
文档 → 每 512 token 一块，相邻块有 128 token 重叠
优点: 不丢边界信息
缺点: 数据冗余
```

### 2.3 KARL 的分块策略

KARL 对每个数据集使用不同但固定的策略，不做针对性优化：

| 数据集 | 分块方式 | 每个 chunk 大小 |
|--------|---------|---------------|
| BrowseComp-Plus | 文档前 512 token | 最多 512 token |
| TREC-Biogen | 摘要级别 | 短摘要 |
| FinanceBench | 按页切分 | 一页 |
| FreshStack | 语义分割（已提供） | 最多 2048 token |
| QAMPARI | 句子级别 | 约 100 词 |
| PMBench | 文档前 2048 token | 最多 2048 token |

---

## 三、从 RAG 到 Agent

### 3.1 单轮 RAG 的完整流程

```
用户问: "X 公司 2024 年营收同比变化？"

Step 1: Embedding
  query_emb = EmbeddingModel("X 公司 2024 年营收同比变化")

Step 2: 向量检索
  results = VectorDB.search(query_emb, top_k=5)
  → chunk_1: "X 公司 2024 年年报... 营业收入 128.3 亿元..."
  → chunk_2: "X 公司 2023 年年报... 营业收入 114.2 亿元..."
  → chunk_3: "X 公司 2024 年... 净利润..."
  → chunk_4: (不相关)
  → chunk_5: (不相关)

Step 3: 构建 prompt
  prompt = f"""根据以下文档回答问题：
  {chunk_1}
  {chunk_2}
  {chunk_3}
  问题：X 公司 2024 年营收同比变化？"""

Step 4: 模型生成
  answer = LLM(prompt)
  → "根据文档，X 公司 2024 年营收 128.3 亿元，2023 年 114.2 亿元，
     同比增长 (128.3-114.2)/114.2 = 12.3%。"
```

### 3.2 单轮 RAG 的四个局限

**局限 1：查询表达不精确**

用户问"那个拿了诺贝尔物理奖的出生在卡夫卡同城的人是谁"——直接搜索这句话，很难同时匹配到"诺贝尔物理奖获得者列表"和"卡夫卡出生地"两个信息源。

**局限 2：答案分散在多个文档**

TREC-Biogen 的报告综合任务需要从 50+ 个文档中提取信息。单次 top-5 检索根本不够。

**局限 3：需要推理后再检索**

BrowseComp-Plus 的约束搜索：先搜"诺贝尔物理奖获得者" → 得到候选列表 → 再搜每个候选的出生地 → 排除不在布拉格的 → 再验证是否在高等研究院工作过。

**局限 4：无法判断何时停止**

模型不知道自己已经收集了足够的信息，可能过早回答（遗漏信息）或过度搜索（浪费资源）。

### 3.3 Agent 循环的完整实现

```python
def agent_loop(question, max_steps=200):
    history = [{"role": "user", "content": question}]

    for step in range(max_steps):
        # 1. 模型决策
        response = LLM(history)

        # 2. 解析响应
        if response.has_tool_call():
            # 执行工具
            tool_name = response.tool_call.name       # "vector_search"
            query = response.tool_call.arguments      # 搜索查询
            results = execute_tool(tool_name, query)

            # 追加到历史
            history.append({"role": "assistant", "content": response.text})
            history.append({"role": "tool", "content": results})

            # 检查是否需要压缩
            if count_tokens(history) > COMPRESSION_THRESHOLD:
                summary = LLM(compress_prompt(history))
                history = [{"role": "system", "content": summary}]

        elif response.has_final_answer():
            return response.final_answer

        else:
            # 继续思考
            history.append({"role": "assistant", "content": response.text})

    return "达到最大步数，无法回答"
```

### 3.4 一条 BrowseComp-Plus rollout 的具体过程

问题："哪位诺贝尔物理学家出生在《审判》作者同一城市，后来在高等研究院工作？"

```
Step 1: 搜索 "《审判》作者"
  → 结果: 弗朗茨·卡夫卡，出生于布拉格

Step 2: 搜索 "诺贝尔物理学奖获得者 出生 布拉格"
  → 结果: 几个候选人

Step 3: 搜索 "Peter Higgs 出生地"
  → 结果: 纽卡斯尔 → 排除

Step 4: 搜索 "Niels Bohr 出生地"
  → 结果: 哥本哈根 → 排除

Step 5-20: 逐个检查候选人...

Step 21: 搜索 "Albert Einstein 出生地"
  → 结果: 乌尔姆，德国 → 排除（不是布拉格）

Step 22-50: [上下文压缩] 模型总结已排除的候选和剩余线索

Step 51: 搜索 "Christian Doppler 出生地"
  → 结果: 不是诺贝尔获奖者

Step 52-100: 继续搜索更多候选...

Step 101-155: 逐步缩小范围...

Step 155: 搜索 "Ernst Mach 出生地"
  → 结果: 布尔诺（当时属于奥匈帝国，靠近布拉格但不是布拉格）
  但注意到 Philipp Lenard 出生在布拉迪斯拉发...

最终: 确认答案是某位满足所有约束的物理学家
```

这说明为什么 BrowseComp-Plus 需要 200 步预算——多约束交叉搜索本质上是一个排除法过程。

---

## 四、上下文压缩的详细机制

### 4.1 触发条件

```python
if count_tokens(history) > THRESHOLD:  # 例如 16K token
    trigger_compression()
```

### 4.2 压缩 Prompt

```
你是一个研究助手。你正在回答以下问题：
{原始问题}

以下是你到目前为止的搜索历史和发现：
{完整历史（可能 16K+ token）}

请将以上搜索历史压缩成一个简洁但完整的摘要，保留：
1. 所有与回答问题相关的发现
2. 已排除的假设（避免重复搜索）
3. 下一步搜索的线索

压缩后的摘要将替代完整历史，用于后续搜索。
```

### 4.3 RL 训练压缩能力

压缩步骤在 RL 训练中被当作独立的 (x, y) 对：

```
x = 待压缩的完整历史
y = 模型生成的摘要
r = 整条轨迹最终的任务奖励
```

如果压缩后模型最终答对了 → 高 r → 这种压缩方式被鼓励
如果压缩丢失了关键信息导致最终答错 → 低 r → 这种压缩方式被抑制

经过大量轨迹的训练，模型学会了：
- 保留"已排除的候选"（避免重复搜索）
- 保留"尚未验证的线索"（指导后续搜索方向）
- 丢弃"已确认不相关的文档细节"

### 4.4 压缩与搜索的交叉实验

Table 6 的设计很巧妙——把搜索和压缩分开测试：

```
实验: 用模型 A 做搜索决策，用模型 B 做历史压缩

                    搜索 = GLM Air    搜索 = KARL
压缩 = GLM Air      0.44            0.46
压缩 = KARL          0.54            0.57
```

分析：
- 列方向（搜索）：KARL 搜索 vs Air 搜索，在 Air 压缩下 +0.02，在 KARL 压缩下 +0.03
- 行方向（压缩）：KARL 压缩 vs Air 压缩，在 Air 搜索下 +0.10，在 KARL 搜索下 +0.11

**结论：RL 训练的压缩能力 (+0.10) 比搜索能力 (+0.02) 的独立贡献更大。** 这很反直觉——你可能以为"搜更好"比"压缩更好"重要，但实际上"管理好已有信息"同样关键。

---

## 五、Agentic 合成数据管线

### 5.1 Stage I：问题-答案合成

```python
def synthesize_qa(corpus, seed_examples, seed_docs=None):
    """
    输入:
      corpus: 文档语料库（可通过 vector search 访问）
      seed_examples: 4 个种子 QA pair（来自验证集）
      seed_docs: 10 个种子文档（BrowseComp-Plus 特有）

    过程:
      合成 Agent 进行最多 60 步的 vector search 探索
      基于发现的文档组合，生成 8 个候选 QA pair
      每个 QA pair 包含: 问题, nugget 化的答案, 引用证据

    输出:
      8 个候选 QA pair
    """
```

**为什么让 Agent 动态探索而不是静态给文档？**

静态方法："这里是文档 A, B, C，请基于它们出题"
动态方法："这里是整个语料库的搜索工具，你自己去发现有趣的文档组合，然后出题"

动态方法生成的问题更自然、更多样，且自动覆盖更多的语料库区域。BrowseComp-Plus 的种子文档引导使语料库覆盖率提升 25%。

### 5.2 Stage II：Pass-Rate 过滤

```
对每个合成 QA pair:
  运行 8 个 Solver Agent 独立尝试

  pass_rate = 正确次数 / 8

  如果 pass_rate == 1.0: 删除（太简单，无学习信号）
  如果 pass_rate == 0.0: 删除（太难或有质量问题）
  否则: 保留（有学习信号）
```

为什么"半对半错"最有价值？

```
prompt A: 8 条全对
  优势 = [0, 0, 0, 0, 0, 0, 0, 0]  → 梯度方向不明确

prompt B: 8 条全错
  优势 = [0, 0, 0, 0, 0, 0, 0, 0]  → 无法区分（都一样差）

prompt C: 4 对 4 错
  优势 = [+, +, +, +, -, -, -, -]  → 清晰的正负对比 → 强学习信号
```

对于 TREC-Biogen（连续分数 [0,1]），需要先二值化：

```
Iter.1: 阈值 0.6 → 分数 > 0.6 算"对"
Iter.2: 阈值 0.7 → 模型变强了，提高标准
Expert Iter.3: 阈值 0.9 → 更高标准
```

### 5.3 去重防泄漏

两阶段去重确保训练数据不包含测试集的问题：

```
Stage 1: 精确匹配
  对每个合成问题 q:
    if q in test_set or q in already_synthesized:
      删除

Stage 2: 近似重复检测
  对每个测试集问题 t:
    candidates = embedding_search(t, top_k=20, pool=synthetic_questions)
    for c in candidates:
      if gpt_4o_mini_judge(t, c) == "paraphrase":
        删除 c
```

用 gpt-4o-mini 作为释义判断器（paraphrase judge）比纯向量相似度更准确——两个问题在表述上可能很不同但语义相同。

### 5.4 训练数据统计

| 迭代 | 合成模型 | BCP prompt 数 | TREC prompt 数 | BCP 中位轨迹步数 | TREC 中位轨迹步数 |
|------|---------|-------------|--------------|---------------|---------------|
| Iter.1 | GLM 4.5 Air | 1,218 | 6,270 | ~50 | ~5 |
| Iter.2 | KARL Iter.1 | 1,336 | 11,371 | ~20 | ~5 |

关键观察：Iter.2 的 BCP 轨迹显著短于 Iter.1（50 → 20 步）。KARL Iter.1 已经学会了更高效的搜索策略，不再需要用满 200 步预算。

---

## 六、推理时计算扩展（Test-Time Compute）

### 6.1 Best-of-N

```
输入: 问题 x
参数: N (采样数), scoring_function

过程:
  for i in 1..N:
    y_i = Agent(x)    # 独立 rollout
    s_i = scoring_function(y_i)

  return y_{argmax(s)}    # 返回最高分
```

缺点：需要一个可靠的 scoring function。对开放式任务（如报告综合），自动评分很困难。

### 6.2 Majority Voting

```
for i in 1..N:
    y_i = Agent(x)
    answer_i = extract_answer(y_i)

answer_counts = Counter(answer_1, ..., answer_N)
return answer_counts.most_common(1)    # 返回出现最多的答案
```

适合离散答案。不适合长文本生成（两条不同的报告很难判断是否"相同"）。

### 6.3 Parallel Thinking（KARL 的主要 TTC 方案）

```
Phase 1: 并行搜索
  for i in 1..N:
    y_i = Agent(x)    # N 条独立 rollout，并行执行

Phase 2: 聚合
  aggregation_prompt = f"""
  以下是 {N} 个独立搜索 Agent 对同一个问题的回答：
  {y_1}
  {y_2}
  ...
  {y_N}

  请综合以上所有信息，给出最终答案。
  你也可以使用搜索工具补充信息。
  """

  final_answer = Agent(aggregation_prompt)    # Aggregator 也可以用工具
```

**为什么 Aggregator 能超越所有单条 rollout？**

```
rollout_1 找到了证据 A 和 B
rollout_2 找到了证据 B 和 C
rollout_3 找到了证据 A 和 D

单条最好的也只有 2/4 的证据。

Aggregator 看到所有结果后:
  综合 A + B + C + D = 4/4 的证据 → 更完整的答案
```

PMBench 上 23.7% 的情况下 Aggregator 生成了比任何单条 rollout 都好的答案。

**Aggregation 的开销**：Table 7 显示 aggregation 步骤平均只需 1.3-3.7 个 LLM 步（远短于搜索本身），是轻量的。

**N 的选择**：

```
N=1:  58.9 (无 TTC)
N=3:  64.1 (+5.2)
N=5:  65.8 (+1.7)
N=10: 67.5 (+1.7)
N=15: 67.8 (+0.3)
N=20: 68.1 (+0.3)
```

收益在 N=10-15 后显著递减。可能原因：(1) pass@k 饱和，(2) N 个答案拼在一起上下文太长。

### 6.4 Value-Guided Search（VGS）

#### Value Model 训练

```
训练数据: KARL 生成的大量 rollout {(trajectory, final_reward)}

对每条轨迹:
  对每个模型生成的 token 位置 t:
    label = 1 if 该轨迹最终得到正确答案 else 0
    loss += BCELoss(ValueModel(trajectory[:t]), label)

模型: Qwen3-4B-Thinking（小但够用）
```

Value Model 学到的是：给定当前部分轨迹，预测"从这里继续下去最终答对的概率"。

#### 搜索过程

```
for each rollout:
    trajectory = [initial_prompt]

    for step in range(max_steps):
        # 并行生成 k 个候选动作
        candidates = []
        for j in range(k):    # k=2
            action_j = LLM(trajectory, temperature=T)
            value_j = ValueModel(trajectory + action_j)
            candidates.append((action_j, value_j))

        # 选最高价值的候选
        best = max(candidates, key=lambda x: x[1])
        trajectory.append(best[0])

        # 执行工具调用等
        if best[0].has_tool_call():
            result = execute_tool(...)
            trajectory.append(result)

    rollouts.append(trajectory)
```

每步生成 2 个候选，选价值更高的。相当于宽度为 2 的 beam search，但不是基于概率，而是基于"预测最终成功概率"。

#### 聚合策略对比

```
BrowseComp-Plus 上 (N=10):
  Majority Voting (MV):            65.2
  Best-of-N (BoN):                 67.8
  Weighted Majority Voting (WMV):  70.4
```

WMV > BoN > MV。WMV 用 Value Model 的预测值作为投票权重——不只是"数票数"，还考虑"哪条轨迹更可信"。

#### 意外发现

VGS 同时提升了文档召回率，尽管 Value Model 从未被训练来预测召回率。

解释：价值高的轨迹方向往往也是证据丰富的方向——Value Model 隐式学到了"证据充分 → 成功概率高"。

---

## 七、Agent 基础设施：aroll 框架

### 7.1 三层抽象

```
Exploration Strategy（编排层）
│
├── 接收 prompt 批次
├── 实例化 Environment-Agent 对
├── 编排并发执行
└── 收集完成的 rollout

Environment（交互层）
│
├── 维护当前状态（历史、步数、token 数）
├── 每步: 呈现历史 → 调 Agent → 执行工具 → 计算奖励
├── 奖励函数通过配置声明
└── 新增任务 = 新增奖励配置文件

Agent（决策层）
│
├── 标准: 每步一次 LLM 调用
└── VGS: 每步 k 个候选 + Value Model（即插即用替换）
```

### 7.2 Lifecycle Plugins

横切关注点通过插件注入：

```python
class CompressionPlugin:
    """当 token 数超阈值时触发压缩"""
    def before_step(self, env):
        if env.token_count > THRESHOLD:
            summary = env.agent.compress(env.history)
            env.history = [summary]

class BudgetPlugin:
    """限制最大步数"""
    def after_step(self, env):
        if env.step_count >= MAX_STEPS:
            env.force_answer()

class ToolGatewayPlugin:
    """控制工具调用权限和参数"""
    def on_tool_call(self, env, tool_call):
        tool_call.top_k = min(tool_call.top_k, MAX_K)
```

关键设计：**所有环境（数据收集、训练、评估、线上推理）使用完全相同的插件配置。**

### 7.3 为什么同构很重要

如果训练和推理的代码路径不同：

```
训练时: 压缩阈值 = 16K, 最大步数 = 200, k = 20
推理时: 压缩阈值 = 12K, 最大步数 = 100, k = 10  (开发者不小心改了)

→ 模型在训练时学到的策略和推理时的环境不匹配 → 性能下降
```

aroll 的同构设计从架构层面消除了这类问题。

### 7.4 高吞吐向量检索

RL 训练的数据量：

```
假设:
  5000 个 prompt × 8 条 rollout × 平均 50 步 × 每步 20 个检索 = 4000 万次检索

如果用 client-server 向量数据库:
  假设每次检索 5ms (网络 + 计算) → 4000 万 × 5ms = 200,000 秒 ≈ 55 小时

KARL 的嵌入式方案:
  每次检索 < 1ms (纯内存计算) → 4000 万 × 1ms = 40,000 秒 ≈ 11 小时
```

实际中通过多 worker 并行，进一步缩短到数小时。

---

## 八、搜索环境消融实验

### 8.1 搜索步数

```
BrowseComp-Plus (KARL):
  10 步: 0.35
  50 步: 0.48
  100 步: 0.53
  200 步: 0.57
  400 步: 0.58  (几乎不再增长)
```

200 → 400 步几乎没有增长。模型学会了在 200 步内完成搜索。

### 8.2 检索文档数 k

```
BrowseComp-Plus (KARL):
  k=10: 0.56
  k=20: 0.57
  k=40: 0.39  (急剧下降!)
```

k=40 时性能崩溃。原因：每次检索返回 40 个文档，每个 ~500 token，一次就是 20K token，几步就填满上下文。没空间做多步推理了。

### 8.3 Embedding 模型替换

```
Qwen3-8B (训练时用的): 0.570
GTE-large (换一个):    0.568
```

几乎不变。说明 KARL 学到的搜索策略没有过拟合到特定 retriever——它是通用的"怎么搜"策略，不依赖"用哪个 retriever"。

### 8.4 压缩工具移除

```
有压缩: 0.570
无压缩: 0.389  (下降 31.7%)
```

压缩是必不可少的——没有它，长轨迹搜索根本无法进行。

---

## 本章总结

你现在应该能理解：

1. **Embedding 原理**：文本到向量的映射，余弦相似度衡量语义距离
2. **向量检索**：HNSW 近似最近邻，嵌入式数据库消除网络 I/O
3. **Chunking**：分块策略影响检索粒度和质量
4. **RAG → Agent**：从单次检索到多步循环搜索
5. **上下文压缩**：RL 端到端训练，任务导向而非通用摘要
6. **合成数据管线**：Agentic synthesis + pass-rate 过滤 + 质量过滤
7. **Test-Time Compute**：Best-of-N / Voting / Parallel Thinking / VGS
8. **aroll 基础设施**：三层抽象 + 同构设计 + lifecycle plugins

**下一篇：[04. KARL 逐段导读](../04-karl-guided-reading)** — 带着知识读原文
