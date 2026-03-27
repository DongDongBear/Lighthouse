---
title: "Karpathy 的 autoresearch：630 行代码开启自主 AI 研究新范式"
description: "Karpathy, autoresearch, 自主研究, AI Agent, Karpathy Loop, 自动化实验"
---

# The Karpathy Loop: autoresearch 与自主 AI 研究的未来

> 原文链接：https://github.com/karpathy/autoresearch
> 来源：Andrej Karpathy（前 OpenAI/Tesla AI 负责人，Eureka Labs 创始人）
> 交叉验证：Fortune / VentureBeat / The New Stack / No Priors Podcast
> 发布日期：2026-03-07

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 630 行 Python 脚本让 AI Agent 在两天内自主运行 700 个 ML 实验，发现 20 个改进使训练速度提升 11% |
| 大白话版 | Karpathy 写了一个简单的脚本，让 AI 自己当研究员——它读代码、提出假设、改参数、跑实验、看结果、再改。一晚上跑了几百个实验，找到了人类研究员两年都没发现的优化 |
| 核心数字 | 700 个实验/2 天，20 个有效优化，11% 训练速度提升 |
| 影响评级 | A — 预示了 AI 研究方法论的根本转变 |
| 代码 | https://github.com/karpathy/autoresearch（MIT 许可） |

## 事件全貌

### 发生了什么？

2026 年 3 月 7 日，Andrej Karpathy 在 X 上发布了 autoresearch——一个 630 行的 Python 脚本。它的运作方式极其简单：

```
AI Agent（如 Claude/GPT）
    ├→ 读取训练脚本源代码
    ├→ 形成改进假设（如"调整学习率"或"改变架构深度"）
    ├→ 修改代码
    ├→ 运行实验（固定 5 分钟 GPU 预算）
    ├→ 评估结果（验证损失 val_bpb）
    ├→ 如果改善 → 保留改动
    ├→ 如果未改善 → 回滚
    └→ 重复
```

### 结果数据

**第一次过夜运行（~12 小时）：**
- 完成 126 个实验
- 验证损失从 0.9979 降到 0.9697

**两天持续运行：**
- 完成约 700 个自主实验
- 发现约 20 个可叠加的改进
- 将 "Time to GPT-2" 基准从 2.02 小时降到 1.80 小时（**11% 提升**）
- Agent 发现了注意力缩放和正则化方面的疏忽——Karpathy 本人在"20 年的工作中"都没注意到

### 病毒式传播

Karpathy 的帖子获得 860 万+ 浏览。多个知名人物立即复现和扩展：

**Shopify CEO Tobias Lütke：**
- 用 autoresearch 优化内部 AI 模型
- 过夜运行 37 个实验
- 获得 **19% 性能提升**

**Hyperspace AI（Varun Mathur）：**
- 将单 Agent 循环扩展到点对点网络
- 35 个 Agent 同时运行，一夜完成 333 个实验
- 发现 Kaiming 初始化使损失降低 21%，通过 GossipSub 协议在 Agent 间传播
- 不同硬件（H100 vs CPU 笔记本）产生了不同但互补的优化策略

**营销领域（Eric Siu，Single Grain 创始人）：**
- 提出将 autoresearch 应用于营销优化
- "当前营销团队每年 ~30 个实验，下一代将运行 36,500+"
- 将训练脚本替换为营销资产（落地页、广告创意），将 val_bpb 替换为"正向回复率"

### Karpathy 的关键引用

> "看到 Agent 完全自主地完成这整个工作流……太疯狂了。"

> "所有前沿 LLM 实验室都会这样做。这是最终的 Boss 战。"

> "下一步是让 autoresearch 变成异步的、大规模协作的 Agent 系统。目标不是模拟单个博士生，而是模拟一个博士生研究社区。"

> "主要瓶颈不再是技术实现，而是你能多快表达你想要什么。"

在 No Priors 播客中，Karpathy 描述自己处于"AI 精神病"（AI psychosis）状态——不再直接编码，花数小时"向 AI 系统表达意图"。

## 技术解析

### "Karpathy Loop" 的三要素

Janakiram MSV 在 The New Stack 中将其提炼为三个核心组件：

1. **Agent + 单文件**：Agent 有权限读写一个代码文件
2. **单一可测指标**：一个客观可评估的优化目标（如 val_bpb）
3. **固定时间预算**：每次实验的运行时间上限（如 5 分钟）

Karpathy 给 Agent 的指令文件包含：
- **Instructions**：做什么
- **Constraints**：不做什么 / 不改什么
- **Stopping criteria**：何时停止循环并报告结果

### 与 AutoML 的关键区别

批评者认为 autoresearch 不过是 AutoML 的翻版。Karpathy 的回应：

| 维度 | 传统 AutoML/NAS | autoresearch |
|---|---|---|
| 搜索方式 | 随机变异 / 进化算法 | **LLM 阅读代码、理解语义、形成假设** |
| 知识利用 | 无（blind search） | **可阅读研究论文、利用训练经验** |
| 修改范围 | 预定义的超参空间 | **任意代码修改** |
| 推理能力 | 无 | **可从之前实验中学习** |
| 互联网访问 | 无 | **可搜索和参考文献** |

Karpathy 的原话：
> "Neural architecture search 作为存在过的东西，与此相比完全无用，根本不在一个类别。这是一个 *真正的* LLM 在写任意代码、从之前的实验中学习、还能上网。根本不是一回事。"

### 自我改进的边界

autoresearch 的一个微妙之处：**它不是在改进自身。** Agent 改进的是一个独立的、更小的语言模型的训练代码——不是 Agent 自己的代码或训练过程。

但 Karpathy 指出，从 autoresearch 到"前沿模型自我优化"只是工程规模的差异：

> "在规模上当然复杂得多——我的 autoresearcher 只需要处理 630 行 Python 代码，而前沿 AI 模型的训练代码库大了几个数量级。但做到这一点'只是工程问题'，而且它会奏效。"

## 批判性分析

### 过拟合风险

最重要的批评来自 alexisthual：

> "运行这么多实验，最终不会'污染'验证集吗？"

700 个实验都在同一个验证集上评估——这在统计学上可能导致间接的过拟合（选择偏差）。Karpathy 回应："我们只是在优化每单位计算的性能……这些是真实和实质性的提升。" 但这个担忧在更大规模上会更加突出。

### "11% 提升" 的含金量

在一个 Karpathy 自己认为"已经调好了"的基准上提升 11%——这本身就说明了手动调参的局限性和自动化的潜力。但需要注意：
- 这些优化是否迁移到更大模型？Karpathy 说迁移了（"20 个改进完美迁移到更大模型"）
- 是否迁移到不同架构？未验证
- 是否迁移到不同任务？未验证

### 社会影响

Karpathy 在 No Priors 播客中的描述——"AI 精神病"、"不再直接编码"——与 Sam Altman 被嘲讽的"感谢程序员"推文形成呼应。编程从"手工活"变为"意图表达"的趋势正在加速，但这对程序员就业的影响是真实的担忧。

### 独立观察

- autoresearch 的真正革命性不在于它做了什么，而在于它**多么简单**。630 行代码就够了——这意味着任何有 API 访问权限的人都可以做同样的事。"AI 研究的民主化"从未如此触手可及
- 与 OpenAI 收购 Astral 结合来看：如果 Codex + Astral 的工具链 + autoresearch 的循环模式整合在一起，AI 不仅能写代码，还能自主优化代码——形成闭环
- Karpathy 提出的"模拟研究社区"愿景——多 Agent 异步协作探索不同优化路径——与 Hyperspace AI 的 35 Agent 实验已经初步验证了可行性
- "任何可高效评估的指标都可以被 Agent 群自动研究"——这句话的含义远超 ML：药物筛选、材料设计、算法优化……只要能定义"好"的客观标准，autoresearch 范式就适用
