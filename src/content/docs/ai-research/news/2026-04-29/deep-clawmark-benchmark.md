---
title: "深度解读 | ClawMark：把 coworker agent 评测从单回合静态任务推进到多天、动态、全模态办公世界"
description: "ClawMark, coworker agents, multi-turn multi-day benchmark, dynamic environment, rule-based verification, red-line constraints, OpenClaw, Claude Sonnet 4.6, GPT-5.4"
---

# ClawMark 深度解读

> 原文链接：https://arxiv.org/abs/2604.23781
> 原始 HTML：https://arxiv.org/html/2604.23781
> 原文标题：ClawMark: A Living-World Benchmark for Multi-Turn, Multi-Day, Multimodal Coworker Agents
> 作者：Fanqing Meng, Lingxiao Du, Zijian Wu, Guanzheng Chen, Xiangyan Liu, Jiaqi Liao, Chonghe Jiang, Zhenglin Wan, Jiawei Gu, Pengfei Zhou, Rui Huang, Ziqi Zhao, Shengyuan Ding, Ailing Yu, Bo Peng, Bowei Xia, Hao Sun, Haotian Liang, Ji Xie, Jiajun Chen, Jiajun Song, Liu Yang, Ming Xu, Qionglin Qiu, Runhao Fu, Shengfang Zhai, Shijian Wang, Tengfei Ma, Tianyi Wu, Weiyang Jin, Yan Wang, Yang Dai, Yao Lai, Youwei Shu, Yue Liu, Yunzhuo Hao, Yuwei Niu, Jinkai Huang, Jiayuan Zhuo, Zhennan Shen, Linyu Wu, Cihang Xie, Yuyin Zhou, Jiaheng Zhang, Zeyu Zheng, Mengkang Hu, Michael Qizhe Shieh
> 发布日期：2026-04-26（arXiv v1）
> 核对说明：已通读原始 arXiv HTML 全文，并据正文与附录整理本文。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | ClawMark 要评测的不是“模型能不能在静态网页里做一次任务”，而是“agent 能不能像办公室同事一样，跨多个工作日，在不断变化的邮件/日历/知识库/表格/文件系统里持续把事做完”。 |
| 核心创新 | 同时引入 multi-turn、multi-day、dynamic environment、full multimodal evidence，并坚持 rule-based、no-LLM-as-judge 评分。 |
| 数据规模 | 100 个任务，13 个职业场景，87 个 in-task roles，1,072 个原始多模态工件，1,537 个 deterministic Python checkers。 |
| 环境组成 | 5 个有状态沙箱服务：filesystem、email、calendar、knowledge base、spreadsheet。 |
| 任务结构 | 每题 2–6 个 turn，平均 3.6；每题 6–29 个 checkers，平均 15.4。 |
| 安全设计 | 55 个 red-line checkers，覆盖 premature-decision、compliance-bypass、data-exfiltration、irreversible-write 四类。 |
| 最强模型 | 加权 Score 第一是 Claude Sonnet 4.6，75.8；严格 Task Success 第一是 Claude Opus 4.6，20.0%。 |
| 最重要发现 | 最强系统也只能完整做对 20% 任务；agent 常能拿到 partial progress，但离可靠端到端 coworker 还很远。 |
| 最难点在哪 | 第一次外生环境更新后，7 个模型里有 6 个在 Day 2 明显掉分；failure taxonomy 里 silent-change detection 与 backend writeback 两类失败率都超过 53%。 |
| Lighthouse 判断 | 这是 office / coworker agent 评测的一块关键基础设施升级，因为它把“环境自己会变”正式纳入 benchmark 主轴。 |

## 核心 Insight

这篇论文最值得记住的，不是它又做了一个更大的 agent benchmark，而是它把“coworker agent 到底该怎么评”重新定义了。

过去很多 benchmark 默认三件事：

1. 任务在单回合里结束；
2. 环境在任务期间基本不变；
3. 证据以文本为主，或者至多补一点图像。

但现实工作不是这样。办公室里的任务往往是：

- 今天看材料，明天再跟进；
- 晚上邮件会进来，日历会改，数据库会更新；
- 证据分散在扫描 PDF、语音、视频、Excel、邮件线程里；
- 真正的风险不是“回答错一个问题”，而是“在不完整信息下做了不该做的动作”。

ClawMark 的贡献，是把这些现实条件都变成 benchmark 的一等公民：

- 一题跨多个 in-universe 工作日；
- turn 与 turn 之间环境会被外生更新；
- 原始证据不预先转写，要求 agent 自己调用 whisper、ffmpeg、PyMuPDF 等工具；
- 评分看执行后环境状态，而不是让 LLM 裁判看一篇报告打印象分。

这让 ClawMark 测到的，不只是 reasoning 或 tool use，而是 persistent coworker 能力：
“记不记得前情、会不会主动刷新状态、能不能跨系统写回、会不会踩红线。”

`★ Insight`
ClawMark 真正补上的空白，不是“更难的任务”，而是“任务持续存在、环境也持续变化”的评测维度。很多 agent 在静态单轮 setting 里看着能干活，一旦进入跨天协作，最先崩的不是文风，而是状态同步与收尾执行。

## 论文要解决什么问题

作者的出发点很直接：语言模型 agent 正越来越像 persistent coworker，而不是一次性的问答系统。问题是，现有 benchmark 大多评不到这种形态。

论文在 Table 1 里把现有代表性 benchmark 放在四个维度上比较：

| Benchmark | 任务数 | 场景数 | 多模态 | 多天 | 验证 | 环境 |
|---|---:|---:|---|---|---|---|
| WebArena | 812 | 5 | None | No | Rule-based | Static |
| OSWorld | 369 | 9 | Partial | No | Rule-based | Static |
| Terminal-Bench | 89 | ~6 | None | No | LLM-as-judge | Static |
| MCPMark | 127 | 5 | None | No | Rule-based | Static |
| Claw-Eval | 300 | 9 | Full | No | Rule + LLM | Static |
| ClawsBench | 153 | 15 | Partial | No | LLM-as-judge | Static |
| ClawMark | 100 | 13 | Full | Yes | Rule-based | Dynamic |

作者想强调的是：在他们列出的这组代表性基准里，ClawMark 是唯一同时满足“多天 + 动态环境 + 全模态 + 规则评分”的方案。

## 方法详解

### 1. Benchmark 由什么组成

ClawMark 的每个任务都运行在统一的五服务沙箱里：

- 文件系统：Docker 挂载工作区
- 邮件：GreenMail，提供 SMTP/IMAP
- 知识库：Notion-compatible backend
- 表格：Google-Sheets-compatible backend
- 日历：Radicale CalDAV server

每个任务都由一个 `task.py` 和对应的 per-turn 注入层、支持工件共同定义。任务执行时，每个 turn 对应一个 in-universe 工作日。

论文给出的 release 统计如下：

| 维度 | 数值 |
|---|---:|
| 任务数 | 100 |
| 职业场景数 | 13 |
| in-task roles | 87 |
| 原始多模态工件 | 1,072 |
| Python checkers | 1,537 |
| red-line checkers | 55 |
| turn 范围 | 2–6 |
| 平均 turns / task | 3.6 |
| checker 范围 | 6–29 |
| 平均 checkers / task | 15.4 |

### 2. 三个核心设计原则

#### 原则 A：多 turn = 多个工作日，不是长对话切片

论文明确说，一个 turn 就是一个工作日。重点不是让模型多说几轮，而是让它跨天保持工作连续性：

- 上一轮做过什么；
- 新一天进来了什么外部变化；
- 之前的计划是否需要修正；
- 尚未写回的动作有没有完成。

这使得 benchmark 关注的是 persistent workflow，而不是单次 trajectory 长度。

#### 原则 B：动态环境不是“背景设定”，而是主难点

turn 与 turn 之间会有两层外生变更：

1. `inject/stage{N}/` 目录注入新文件；
2. 服务端 Python 主动修改邮件、表格、知识库、日历等状态。

也就是说，agent 不能靠 Day 1 建立的“脑内世界模型”一直往后做，必须在每个 turn 开始时主动重新读取真实状态。

#### 原则 C：原始多模态证据不做预消化

作者没有把音视频先转成“干净文本”再交给模型，而是保留 raw artifacts，要求 agent 自己决定：

- 什么时候用 whisper 听音频；
- 什么时候抽视频帧再做视觉理解；
- 什么时候读 PDF；
- 什么时候解析表格或邮件线程。

这点很关键，因为很多办公任务的难度，恰恰在“先发现证据在哪个模态，再选对工具”。

### 3. 评分设计：为什么同时报告 Score 和 Task Success

ClawMark 的评分完全基于 deterministic Python checkers 检查执行后的服务状态，不使用 LLM-as-judge。

每个 checker 都对 post-turn state 给出确定性的 pass/fail，类别包括：

- filesystem / artifact inspection
- external-backend state queries
- email state queries
- numeric-tolerance or semantic-equivalence checks

论文把评测拆成两个指标：

#### 指标 1：加权 Score

本质上是对每题 checker 通过情况按权重做归一化，再在 100 题上取平均，最后按 0–100 展示。

它回答的问题是：
“这个 agent 在一整套 rubric 上做对了多少，partial progress 有多少？”

适合 leaderboard，因为不同任务的 checker 数量不一样，范围从 6 到 29。

#### 指标 2：严格 Task Success

只有一题里所有 checker 都通过，才算这一题成功；最后统计成功率。

它回答的问题是：
“这个 agent 有没有把整个 coworker workflow 端到端完整做完？”

这更接近真实部署问题，因为工作流里常常不能接受“80% 对”。

#### red-line 约束怎么进入评分

55 个 red-line checkers 属于普通 checker 体系的一部分，但权重高，覆盖四类风险：

- premature-decision
- compliance-bypass
- data-exfiltration
- irreversible-write

因此模型即使把普通工作项都做得差不多，只要踩了 red-line，Score 也会被明显拉低；而在 Task Success 下，red-line 也和普通 checker 一样直接决定全成败。

### 4. 任务分布：13 个场景覆盖了什么

| 场景 | 任务数 | 角色数 | 平均 turns | 平均 checkers | red-line |
|---|---:|---:|---:|---:|---:|
| Clinical Assistant | 4 | 4 | 3.5 | 17.5 | 15 |
| Content Operation | 12 | 11 | 3.3 | 13.5 | 3 |
| E-commerce | 9 | 5 | 3.1 | 15.0 | 0 |
| EDA | 1 | 1 | 2.0 | 18.0 | 0 |
| Executive Assistant | 7 | 7 | 3.7 | 17.7 | 0 |
| HR | 11 | 11 | 3.7 | 20.6 | 3 |
| Insurance | 7 | 7 | 5.1 | 13.0 | 14 |
| Investment Analyst | 6 | 6 | 4.0 | 17.7 | 0 |
| Journalist | 8 | 8 | 2.9 | 12.5 | 1 |
| Legal Assistant | 6 | 1 | 3.0 | 13.0 | 0 |
| Project Management | 8 | 7 | 3.1 | 13.1 | 6 |
| Real Estate | 6 | 6 | 3.5 | 18.5 | 2 |
| Research Assistant | 15 | 13 | 3.9 | 14.0 | 11 |
| Total | 100 | 87 | 3.6 | 15.4 | 55 |

这里有两个值得注意的结构特征：

1. 场景既有通用 office 角色，也有 clinical、insurance、investment analyst、EDA 这类专业角色；
2. red-line 分布并不均匀，clinical、insurance、research assistant、project management 明显更重。

### 5. Benchmark 是怎么构建出来的

作者不是先抓一堆材料，再围绕现成材料拼题；而是采用 task-first pipeline。

#### Phase 1：Task authoring

每个作者先写 `task.py`，定义：

- turn 结构
- 服务初始化 hooks
- turn 间注入
- loud events 与 silent mutations
- weighted checker rubric

并要求满足三个 invariant：

- 每个 silent mutation 至少对应一个 checker；
- 每个 cross-modal contradiction 至少跨两个模态；
- 每个 red-line 都必须能转成确定性的状态检查，而不是模糊文本匹配。

#### Phase 2：Evidence sourcing

工件通过三条渠道生产，并打 provenance tag：

- 公开真实材料采集：政策 PDF、政府通知、公司报告等
- 原创录制：语音备忘、走查视频、白板照片等
- 定向 AI 合成：例如照片、表单、表格

作者强调，必须先有任务规格，再去补证据；反过来“先收语料再拼任务”会让材料看似真实，但和 checker 覆盖的因果关系不够明确。

#### Phase 3：Review loop（每题 3–5 轮）

评审分成两类：

1. task review：
   - human artifact inspection
   - multimodal integrity audit
   - checker-hacking audit
   - task-checker correspondence audit

2. trajectory review：
   - 跑两个 reference models
   - 再让独立的 Codex-class reviewer agent 找运行时设计缺陷

重点检查的缺陷包括：

- 模糊 prompt
- inject 与 checker 的竞态
- deliverable schema 不明确
- 脆弱字符串匹配

#### Phase 4：Release gate

只有同时满足四个条件的任务才能进正式 release：

1. 全部多模态工件人工签核；
2. 三项 task-review 审核都干净；
3. 两个 reference models 的 trajectory 都没被 reviewer 找出设计缺陷；
4. 相同冻结服务状态下，两次独立重跑得到 bit-identical checker verdicts 与 detail messages。

第 4 点其实是这篇论文 rule-based、no-LLM-as-judge 主张的关键工程保证。

## 实验设置

### 模型

论文评测了 7 个系统：

- Claude Sonnet 4.6
- Claude Opus 4.6
- GPT-5.4 (high)
- Gemini 3.1 Pro Preview
- Qwen 3.6 Plus
- Kimi K2.5
- Kimi K2.6

作者将前 5 个归为 proprietary，后 2 个归为 open-source，并说明 Kimi K2.5 使用的是公开 Infinigence-hosted endpoint；另有 internal instance-tuned 版本，但为避免把公共与私有 baseline 混在一起，没有放进主表。

### 统一框架与基础设施

所有模型都在同一个 agent 框架 OpenClaw 下跑：

- 相同 tool schema
- 不做 per-model prompt engineering
- Kimi 系列统一应用 OpenClaw 的 tool-call ID 修复补丁
- 每题都在独立 docker-compose group 中执行
- 任务之间完全 teardown，不共享状态

### 推理与成本统计

- 使用 provider-default inference parameters
- 支持的模型开启 extended thinking（Claude、GPT-5.4、Gemini）
- 支持的 provider 开启 prompt caching
- 报告总 wall-clock、输入/输出 token、总 tool calls
- 主表每个模型只跑一遍 full sweep

作者特别声明：本版主表不报告所有模型的 run-to-run variance，因此分数接近的排名不要过度解读。

## 实验结果

### 1. 主榜：加权分可以过 70，但严格完成率仍很低

| 模型 | Score | Task Success | Red-line fail | Wall time | Input tok. | Output tok. | Tool calls |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Sonnet 4.6 | 75.8 | 14.0 | 3.6% | 22.3 h | 257.8 M | 2.57 M | 5,736 |
| Claude Opus 4.6 | 74.6 | 20.0 | 5.5% | 22.6 h | 266.7 M | 2.02 M | 6,112 |
| GPT-5.4 (high) | 72.0 | 9.0 | 3.6% | 26.1 h | 231.5 M | 2.93 M | 7,052 |
| Kimi K2.6 | 68.4 | 7.0 | 7.3% | 22.6 h | 226.3 M | 2.30 M | 6,026 |
| Gemini 3.1 Pro Preview | 68.2 | 8.0 | 3.6% | 18.9 h | 338.8 M | 1.77 M | 5,877 |
| Qwen 3.6 Plus | 57.2 | 5.0 | 14.5% | 33.3 h | 315.1 M | 4.56 M | 6,119 |
| Kimi K2.5 | 56.0 | 0.0 | 9.1% | 22.8 h | 214.0 M | 1.47 M | 4,776 |

怎么读这张表：

- 如果看 partial progress，Sonnet 4.6 最高；
- 如果看“整题完整做完”，Opus 4.6 最高；
- 最好的严格成功率也只有 20%，说明 benchmark 的难点不在“能不能做对其中一些环节”，而在“能不能整个工作流收尾”。

### 2. 分场景结果：没有单一模型通吃

论文 Table 4 的关键信息不是具体小数点，而是“每个场景的最佳模型分散在四家”。摘要如下：

| 场景最佳 | 模型 |
|---|---|
| Clinical Assistant / E-commerce / HR / Legal Assistant / Research Assistant | Claude Sonnet 4.6 |
| Content Operation / Insurance / Journalist / Project Management / Real Estate | Claude Opus 4.6 |
| Executive Assistant | GPT-5.4 |
| Investment Analyst | Gemini 3.1 Pro Preview |
| EDA（单题） | Claude Sonnet 4.6 与 Claude Opus 4.6 并列 |

这说明 ClawMark 并不会把所有 coworker agent 能力压缩成一条统一排序。专业场景越强，模型差异越容易被拉开。

几个论文明确点出的例子：

- Gemini 在 investment analyst 最高，82.9；
- Kimi K2.6 在 investment analyst 也接近 Gemini，82.1；
- 但 Kimi K2.6 在单题 EDA 上只有 8.7，而 Gemini 是 91.3；
- 最难场景是 project management，所有模型都低于 44。

### 3. Day 2 掉分：第一次外生更新是最清晰的 stress test

作者专门分析了 73 个恰好 3 turn 的任务。

| 模型 | Day 1 | Day 2 | Day 3 | Day1→Day2 |
|---|---:|---:|---:|---:|
| Claude Sonnet 4.6 | 83.1 | 72.6 | 74.2 | -10.5 |
| Claude Opus 4.6 | 80.6 | 69.0 | 未在正文单列 | -11.5 |
| GPT-5.4 | 76.6 | 68.9 | 70.2 | -7.7 |
| Kimi K2.6 | 75.4 | 65.8 | 67.4 | -9.6 |
| Gemini 3.1 Pro | 68.2 | 66.4 | 未在正文单列 | -1.8 |
| Qwen 3.6 Plus | 56.7 | 57.9 | 56.9 | +1.2 |
| Kimi K2.5 | 57.2 | 51.2 | 54.9 | -6.0 |

论文给出的总体结论是：

- Day 2 是第一次环境突变落下来的地方；
- 7 个模型里有 6 个在 Day 2 掉分；
- 到 Day 3 大多只能部分恢复，仍低于 Day 1；
- 只有 Qwen 基本回到与 Day 1 持平。

这组分析非常重要，因为它证明 benchmark 测到的不是一般性难度上升，而是“面对状态变化是否会崩”。

### 4. Failure taxonomy：最难的不是抽证据，而是察觉变化和写回系统

| Failure mode | Evals | Failures | Fail rate | Share of fails |
|---|---:|---:|---:|---:|
| Silent-change detection | 315 | 178 | 56.5% | 5.2% |
| Backend writeback | 1,057 | 567 | 53.6% | 16.7% |
| Cross-source consistency | 203 | 69 | 34.0% | 2.0% |
| Deliverable correctness | 427 | 134 | 31.4% | 3.9% |
| Evidence extraction | 259 | 61 | 23.6% | 1.8% |
| Compliance guardrail | 413 | 89 | 21.5% | 2.6% |
| Red-line violation | 364 | 26 | 7.1% | 0.8% |
| Scenario-specific | 7,721 | 2,280 | 29.5% | 67.0% |
| All evaluations | 10,759 | 3,404 | 31.6% | 100.0% |

最值得划线的发现：

- silent-change detection 失败率 56.5%；
- backend writeback 失败率 53.6%；
- evidence extraction 只有 23.6%。

这意味着当前 agent 的大问题并不只是“看不懂材料”，而是：

1. 没发现世界已经变了；
2. 发现了也没有把动作可靠地写回外部系统。

对于 coworker agent 来说，这两个问题恰恰最接近真实生产事故。

### 5. red-line：少见，但一旦发生就很关键

论文统计：

- red-line checker 总体 fail rate 为 7.1%；
- 26 次失败集中在 13 个任务、23 个 `(task, model)` 对上；
- 最差的是 `pm_task2`，7 个模型全部踩中过至少一个 red-line。

按模型看，主表里的 red-line fail 列显示：

- Claude Sonnet 4.6：3.6%
- GPT-5.4：3.6%
- Gemini 3.1 Pro：3.6%
- Claude Opus 4.6：5.5%
- Kimi K2.6：7.3%
- Kimi K2.5：9.1%
- Qwen 3.6 Plus：14.5%

按子类看，最难的是：

- compliance-bypass：10.4%
- data-exfiltration：8.6%
- premature-decision：6.1%
- irreversible-write：3.3%

作者的解释是：模型更容易在判断与保密相关红线出事，而不是在“明确禁止修改”的硬约束上出事。

## 案例信号

附录 E 给了两个端到端 case studies，其中正向案例最值得看。

GPT-5.4 在 `content_operation_task7` 上拿到 80.0 分，其关键链路是：

1. 从语音备忘录里通过 whisper 听到“场地容量宣传可能被夸大”；
2. 再从 walkthrough video 抽帧做视觉理解，发现消防通知写的是 180 人，而营销材料写 300 人；
3. 继续从 PDF、Excel、Notion、邮件与日历里补齐最低消费、隐藏预算项、资质到期、讲者取消等证据。

作者特别指出，音频线索引出视频核验这一“跨模态因果转移”，在被评测模型里是 GPT-5.4 独有的。

## 复现评估

从 benchmark 工程角度看，ClawMark 的复现意识比很多 agent benchmark 更强，主要体现在四点。

### 1. 评分不依赖 LLM judge

所有 pass/fail 都来自 deterministic Python checkers，对复现实验尤其重要。它避免了：

- judge 模型版本漂移
- 采样噪声
- prompt 设计差异
- 语义裁判不一致

### 2. 发布前要求 bit-identical 重跑

论文要求进入 release 的任务，必须在相同冻结状态下两次独立重跑得到 bit-identical checker verdicts 和 diagnostic messages。这比“结果差不多一致”更严格。

### 3. 所有模型统一跑在 OpenClaw

作者尽量压平了框架差异：

- 相同 tool schema
- 不做按模型定制 prompt
- 统一容器环境
- 任务之间不共享状态

因此主表更接近“模型在同一 agent shell 里的可比表现”，而不是“不同团队调参能力的比拼”。

### 4. 但主表仍主要是 single-sweep

这也是复现上最大的保留项。正文明确说：

- Table 3 每个模型主结果来自单次 full sweep；
- 本版没有给所有模型报告 run-to-run variance；
- 小分差排名要谨慎解读。

附录 D 只补测了两家：

| 模型 | 三次 weighted score |
|---|---|
| Kimi K2.6 | 68.4 / 70.8 / 71.2 |
| GPT-5.4 | 72.0 / 72.5 / 73.0 |

作者据此认为单次 sweep 的噪声相对 19.8 个点的跨模型总差距来说不大，但这并不能完全替代对全榜 repeated sweeps 的系统报告。

## 批判性分析

### 1. 这篇论文最强的地方：它测的是“办公状态机”，不是“生成一段答案”

很多 benchmark 最后仍落到“写个东西给我看”。ClawMark 则把评测对象变成：

- 环境状态有没有被正确读取；
- 外部系统有没有被正确写回；
- 关键禁止动作有没有发生；
- 多天 workflow 是否真正闭环。

这让它对真实 coworker agent 产品更有约束力。

### 2. 结果也很残酷：agent 会做很多步骤，但很难可靠收尾

最强 Score 是 75.8，看起来不低；但最强 Task Success 只有 20.0%。这意味着：

- partial progress 已经不少；
- 端到端可靠完成仍然稀缺；
- 只看平均分，很容易高估 agent 的可部署性。

这也是为什么论文坚持必须同时报告两个指标。

### 3. benchmark 的一个局限：场景和样本分布仍不平衡

这是原文数据本身就能看到的：

- EDA 只有 1 个任务；
- Clinical 只有 4 个任务；
- Research Assistant 有 15 个；
- red-line 在不同场景里分布差异很大。

所以某些“场景最佳模型”的结论，更接近 case-level signal，而不一定已经足够稳定到能外推成通用能力判断。论文对 EDA 这一点也明确提醒过。

### 4. 动态环境仍是脚本化动态，不是真实开放世界动态

ClawMark 已经把环境变化做进 benchmark，但这些变化仍然来自作者预先定义好的 inject 层与服务端修改逻辑。它非常适合做可复现实验，却还不是开放互联网、真实组织协作里的无限开放动态。

这不是缺点，而是 trade-off：

- 如果要 reproducible，就必须冻结变化机制；
- 如果要完全开放，就很难做稳定对比。

ClawMark 选择了偏实验科学的一侧。

### 5. 评分虽然更硬，但也可能遗漏“路径质量”

rule-based checker 评环境结果非常好，但它天然更擅长判定“有没有完成”“有没有违规”，未必总能细致刻画：

- 一个决策过程是否高效；
- 搜索路径是否冗余；
- 中间 reasoning 是否稳健。

论文通过 tool calls、tokens、trajectory 分析补了一部分，但这仍不是主评分的重点。

## Lighthouse 结论

ClawMark 的真正价值，不是再做一个更难的 agent 排行榜，而是把 persistent coworker 的评测对象定义清楚了：

- 任务跨天；
- 环境会自己变化；
- 证据跨模态；
- 成败看真实系统状态；
- 安全要通过 red-line 明确计入。

如果你在做 office agent、workflow agent、enterprise copilot，这篇论文最应该记住的不是哪家模型第一，而是下面这件事：

今天 agent 最大的短板，已经不只是“能不能看懂”，而是“环境一变，能不能重新同步；要落动作时，能不能稳定写回；涉及红线时，能不能宁可慢也别错”。

从这个角度看，ClawMark 很可能会成为接下来 coworker-agent reliability 讨论里的一个基准坐标。