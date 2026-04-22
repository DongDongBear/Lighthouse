---
title: "Anthropic Economic Index Survey：模型公司开始争夺 AI 劳动力温度计的话语权"
description: "Anthropic Economic Index, 81k survey, observed exposure, job displacement, monthly survey, AI labor economics"
---

# Anthropic 把 Economic Index 升级成持续劳动力测量体系

> 主要信源：https://www.anthropic.com/research/81k-economics
> 交叉验证：https://www.anthropic.com/research/economic-index-survey-announcement
> 事件日期：2026-04-22

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Anthropic 不再满足于发布一次性 AI 经济报告，而是把 8.1 万份用户访谈和月度追踪调查拼成持续观测 AI 劳动力变化的测量体系。 |
| 大白话版 | 他们不只想知道 Claude 被拿来干什么，还想持续知道“人们因为 AI 到底更爽了，还是更慌了”。 |
| 核心数字 | 8.1 万份 Claude 用户访谈；每增加 10 个百分点 observed exposure，感知岗位威胁上升约 1.3 个百分点；高暴露职业的威胁表达频率约为低暴露职业的 3 倍；平均 productivity rating 为 5.1/7。 |
| 影响评级 | A=改变行业格局 |
| 利益相关方 | Anthropic、政策制定者、企业 HR、劳工经济学研究者、AI 厂商、公民社会组织 |

## 事件全貌

Anthropic Research 在同一天连发两篇文章：
- 《What 81,000 people told us about the economics of AI》
- 《Announcing the Anthropic Economic Index Survey》

前者是对 80,508 份 Claude 用户开放式回答做经济学视角再分析；后者则宣布把这种观察升级成每月一次的 Anthropic Economic Index Survey，由 Anthropic Interviewer 向随机抽中的 Claude 用户发出调查。

这两篇放在一起看，意义就完全不一样了。单看第一篇，它像一份高质量研究 brief；再加上第二篇，它就变成了一套持续运行的“AI 经济观测基础设施”。Anthropic 试图同时掌握两种数据：
- 使用数据：Claude 在实际工作里被拿来做什么
- 主观感受：用户如何看待 AI 对自己工作、岗位和未来的影响

## 时间线

- 2026-03：Anthropic 发布 Economic Index March 2026 Report，继续用 usage telemetry 描述 Claude 在劳动任务中的渗透
- 2026-04-22：发布 81k economics 报告，把 8.1 万开放问答映射到经济感受、岗位威胁与 productivity gain
- 2026-04-22：同步宣布 Economic Index Survey 月度化，开始持续抽样追踪 Claude 用户感受
- 后续待观察：是否公开行业拆分、地区拆分、连续月份趋势、与 usage telemetry 的联动指标

## 关键人物/机构说了什么

Anthropic 在两篇文章里说得很直接：
- 传统 usage / diffusion metrics 只能告诉我们 AI 被如何部署
- 传统劳动力指标（就业率、工资、layoff）通常滞后
- 但这些都不能捕捉“人们正在如何体验 AI 对经济的改变”

因此他们要做的是：
- 以月度节奏收集第一手 qualitative corpus
- 与 Claude 使用数据以 privacy-preserving way 结合
- 尽可能在宏观劳动力统计反映出来之前，提前看到变化苗头

## 技术解析

这不是传统硬科技文章，但其方法论其实很技术。

### 数据与方法

在 81k 报告中，Anthropic 做了几件关键事：

1. **使用开放式调查文本而不是结构化问卷**
   用户自由回答对 AI 的想法、恐惧与体验。

2. **使用 Claude-powered classifiers 从文本中推断属性**
   包括：
   - occupation
   - career stage
   - job displacement concern
   - productivity gain
   - speedup level
   - benefit recipient

3. **把主观回答与 observed exposure 对齐**
   observed exposure 指某职业中 Claude 已经被观察到承担多少任务份额，是 Anthropic 早期劳动研究里的一个核心指标。

4. **用 privacy-preserving 方式连接 usage 与 survey**
   这使它能够把“人们说自己感受到的变化”与“Claude 真实被拿来做了多少工作”放进同一分析框架。

### 关键指标

| 指标 | 数值 | 对比 / 含义 | 说明 |
|---|---|---|---|
| 样本数 | 80,508 | Claude personal account 用户 | 规模已经远超很多学术调查 |
| 岗位威胁表达占比 | 约 20% | 五分之一受访者提到经济性岗位替代担忧 | 非抽象担心，而是针对自己角色 |
| observed exposure 斜率 | +1.3 个百分点 / 每 +10pp exposure | 暴露度越高，威胁感越强 | 说明主观感知与实际使用分布相关 |
| 顶部四分位 vs 底部四分位 | 约 3 倍 | 高暴露职业更常提到担忧 | 典型如软件工程 vs 小学教师 |
| 平均 productivity rating | 5.1 / 7 | 对应“substantially more productive” | 样本天然偏向活跃 Claude 用户 |
| productivity benefit 主要形式 | 48% 提 scope；40% 提 speed | 扩展能力比单纯加速更常见 | AI 更像在拓展任务边界 |

### 与之前方法的区别

| 维度 | 传统 AI 劳动力研究 | Anthropic 本次方法 | 为什么不同 |
|---|---|---|---|
| 数据源 | 就业统计、工资、裁员、问卷 | 实时使用数据 + 开放式访谈 | 更快、更贴近微观体验 |
| 频率 | 月度/季度/年度，且滞后 | 可月度持续更新 | 对快速变化的 AI 更合适 |
| 粒度 | 宏观行业/职业 | 任务级 usage + 个体感受 | 更能捕捉细微变化 |
| 主观体验 | 往往缺失 | 通过 Interviewer 收集 | 能看焦虑、希望、角色变化 |

## 产业影响链

```text
Anthropic 月度 Economic Index Survey
  ├→ 更快发现 AI 对岗位与生产率的早期信号
  │    ├→ 政策讨论更多引用 Anthropic 指标
  │    └→ 企业 HR / 组织设计开始跟踪 AI 暴露度
  ├→ 模型公司从“能力供应商”扩展成“经济测量者”
  │    ├→ 影响公共叙事
  │    └→ 影响监管与采购话术
  └→ 其他前沿实验室被迫补齐劳动影响测量层
       ├→ OpenAI / Google 可能推出类似指标
       └→ 第三方研究机构需加速做独立校准
```

### 谁受益？

1. **Anthropic：** 它获得了一个高壁垒叙事位置——不仅定义模型能力，还定义 AI 如何改变工作。
2. **政策制定者与研究者：** 拿到比传统劳动力指标更早、更细的变化信号。
3. **企业采购与 HR 团队：** 可以用更细粒度框架理解哪些岗位受到影响，哪些收益更大。

### 谁受损？

1. **仅靠宏观滞后数据做判断的研究框架：** 在 AI 快速扩散场景中显得反应过慢。
2. **其他模型公司：** 如果没有相似数据资产，就会在“谁更懂 AI 经济影响”这件事上被动。

### 对开发者/用户的影响

对开发者而言，这意味着“自己感受到的提效和焦虑”开始被前沿实验室系统性量化，不再只是社交媒体情绪。对普通用户而言，这可能影响未来组织如何定义岗位、培训路径和绩效期望。

## 竞争格局变化

### 变化前

大多数 AI 公司主要争论：
- 模型更强多少
- benchmark 更高多少
- 企业案例更多多少

关于劳动影响的讨论更多由学术界、政策圈、媒体和咨询机构主导。

### 变化后

Anthropic 正在把“劳动经济监测”纳入自身核心产品叙事的外围系统。它的独特优势在于：
- 有真实使用数据
- 有足够大的活跃用户基数
- 有可重复触达的 survey surface
- 有自己的 privacy-preserving data story

这让它更像一个同时拥有“实验室 + 平台 + 研究所”三重身份的机构。

### 预期各方反应

- **OpenAI** 可能会用 ChatGPT Enterprise / workspace agents 的使用数据，做更偏组织生产率的指标体系。
- **Google** 可能会把 Workspace、Search、Cloud 上的 agent 使用痕迹串成企业效率叙事。
- **独立研究机构** 会更强调第三方校准，以抵消模型厂商数据自带的样本偏置。

## 历史脉络

如果把时间线拉长看，这件事代表 AI 公司正在重复一个经典平台化过程：

第一阶段，先提供能力；
第二阶段，掌握流量和使用数据；
第三阶段，开始用这些数据定义“现实本身”。

Anthropic 的 Economic Index 最初只是解释 Claude 在做什么工作；现在它开始解释“这些工作变化意味着什么”。从“usage analytics”升级到“经济温度计”，话语权明显更强。

## 批判性分析

### 被忽略的风险

最大的风险是样本偏置。调查对象来自 Claude personal account 用户，本身就不是劳动力市场的随机样本。软件、知识工作者、主动拥抱 AI 的群体，天然占比更高。

第二个风险是分类器偏差。occupation、career stage、productivity gain 等变量有不少是从开放回答中推断出来的，而不是用户明确结构化填写。Claude-powered classifiers 可以很有用，但也可能把表达风格当成职业特征。

### 乐观预期的合理性

乐观派会说：这是比传统统计更快、更灵活的劳动力观测工具，这个判断是对的。尤其在 AI 变化快到季度报表都显得太慢的阶段，月度第一手语料极有价值。

### 悲观预期的合理性

悲观派会说：这仍是平台公司用自家数据讲自家故事，也完全合理。Anthropic 同时掌握调查入口、分类器、usage telemetry 和发布口径，天然会引发“既当裁判又当运动员”的担忧。

### 独立观察

- 最值得注意的不是“8.1 万样本”这个大数字，而是 Anthropic 把这个过程常态化了。一次性研究不能形成制度性影响，月度化才可以。
- 报告里最有穿透力的发现不是“AI 提升生产率”，而是“提效最大的人往往也最担心被替代”。这比乐观 / 悲观二分法更符合真实组织氛围。
- 如果这套体系持续运行，未来很多关于岗位、培训、工资和组织设计的公共讨论，都会越来越多地引用平台公司自己的度量框架。
- 对动动最值得盯的后续不是又一篇摘要，而是 Anthropic 会不会公布更细的行业、地区、年龄、职业带宽和连续月份变化曲线。那才是真正能开始影响政策和企业决策的部分。