---
title: "Anthropic数据泄露曝光超级模型Mythos/Capybara：比Opus更强的新层级"
description: "Anthropic, Claude Mythos, Capybara, 数据泄露, 超级模型, 网络安全风险, Opus之上"
---

# Anthropic Data Leak Reveals Unreleased Model "Mythos" / "Capybara": A New Tier Above Opus

> 主要信源：https://fortune.com/2026/03/26/anthropic-says-testing-mythos-powerful-new-ai-model-after-data-leak-reveals-its-existence-step-change-in-capabilities/
> 交叉验证：https://fortune.com/2026/03/26/anthropic-leaked-unreleased-model-exclusive-event-security-issues-cybersecurity-unsecured-data-store/
> 事件日期：2026-03-26

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Anthropic CMS配置失误泄露近3000份未发布文档，曝光超越Opus的新模型层级Mythos/Capybara |
| 大白话版 | Anthropic 的内容管理系统配置出了bug，把草稿和内部文件放在了公开可搜索的地方，被安全研究员发现了。最劲爆的发现是一个叫 Mythos（水豚/Capybara）的新超级模型——比现有最强的 Opus 还要强 |
| 核心数字 | ~3000份未发布文档 / 新模型层级 Capybara > Opus / "阶跃式进步" / "迄今训练的最强大模型" |
| 影响评级 | A — 改变行业对 Anthropic 产品线和能力上限的认知 |
| 利益相关方 | Anthropic（品牌损害+模型曝光）/ OpenAI、Google（竞争情报）/ 企业客户（安全信任）/ AI安全社区（网安风险）|

## 事件全貌

### 发生了什么？

2026年3月26日，Fortune 独家报道了 Anthropic 的一次严重数据安全事件。Cambridge 大学的 Alexandre Pauwels 和 LayerX Security 的高级研究员 Roy Paz 独立发现，Anthropic 的内容管理系统（CMS）中有近 3000 份未发布资产——包括草稿博客、图片、PDF——存储在一个**公开可搜索的数据存储**中。

这些文件中最引人注目的是一篇**草稿博客文章**，详细介绍了一个名为 **Claude Mythos** 的新模型。同一文档中还提到了 **Capybara**（水豚）——一个全新的模型层级，定位于 Opus 之上。

### 时间线

- **2026年初（具体日期未知）**：Anthropic 在 CMS 中创建 Mythos/Capybara 的发布草稿
- **2026年3月26日前**：Cambridge 和 LayerX 研究员独立发现公开数据
- **2026年3月26日**：Fortune 联系 Anthropic，Anthropic 当晚移除公开访问
- **2026年3月26日**：Fortune 发布独家报道
- **2026年3月27日**：Anthropic 确认正在开发和测试新模型
- **2026年3月31日**：36氪报道 Claude Code 源码泄露事件中发现 KAIROS 主动 Agent 计划

### Anthropic 官方声明

Anthropic 的官方声明极为克制但信息量巨大：

> "We're developing a general purpose model with meaningful advances in reasoning, coding, and cybersecurity. Given the strength of its capabilities, we're being deliberate about how we release it. As is standard practice across the industry, we're working with a small group of early access customers to test the model. We consider this model **a step change** and **the most capable we've built to date**."

关键措辞拆解：
- **"step change"**（阶跃式进步）：不是渐进式提升，而是跳跃式的能力飞跃
- **"the most capable we've built to date"**（迄今训练的最强大模型）：超越了 Opus 4.6
- **"being deliberate about how we release it"**（审慎发布）：暗示存在安全顾虑
- **"meaningful advances in cybersecurity"**（网络安全领域的重大进步）：直接呼应 CVE-2026-4747 事件

## 技术解析

### Capybara 层级：产品线重构

根据泄露的草稿博客：

> "'Capybara' is a new name for a new tier of model: larger and more intelligent than our Opus models—which were, until now, our most powerful."

这意味着 Anthropic 的模型产品线将从三层扩展为四层：

| 层级 | 定位 | 特点 |
|---|---|---|
| **Capybara（新）** | 超旗舰 | 比 Opus 更大更强，更昂贵 |
| Opus | 旗舰 | 最大最强（此前的顶级） |
| Sonnet | 平衡 | 速度和能力的折中 |
| Haiku | 轻量 | 最小最快最便宜 |

### 性能描述

草稿博客明确提到：

> "Compared to our previous best model, Claude Opus 4.6, Capybara gets **dramatically higher scores** on tests of software coding, academic reasoning, and cybersecurity, among others."

"Dramatically higher" 而非 "incrementally better"——这暗示的不是 5-10% 的提升，而可能是 20%+ 甚至更大的跳跃。

### 网络安全风险的特别强调

草稿中最令人关注的部分是关于网络安全风险的描述：

> "In particular, we want to understand the model's potential near-term risks in the realm of cybersecurity—and share the results to help cyber defenders prepare."

> Anthropic 认为该模型 **"currently far ahead of any other AI model in cyber capabilities"**，并警告 **"it presages an upcoming wave of models that can exploit vulnerabilities in ways that far outpace the efforts of defenders."**

这段话的含义极其严重：
1. Mythos 在网络安全能力上**远超所有其他 AI 模型**
2. 它预示着一波 AI 驱动的漏洞利用浪潮
3. Anthropic 计划优先向**网络安全防守方**提供早期访问

结合 CVE-2026-4747（Claude 自主发现 FreeBSD 内核 RCE 完整利用链）事件，Mythos 的网络安全能力如果真的实现了"阶跃式进步"，其双刃剑效应将被大幅放大。

## 竞争格局变化

### 变化前

2026年3月前的前沿模型格局：

| 厂商 | 最强模型 | 定位 |
|---|---|---|
| Anthropic | Claude Opus 4.6 | 编程和推理最强 |
| OpenAI | GPT-5.4 | 功能最全面（1M上下文+Computer Use） |
| Google | Gemini 3 Pro | 多模态最强 |

### 变化后

如果 Mythos/Capybara 如泄露所述实现"阶跃式进步"：

| 维度 | 影响 |
|---|---|
| 前沿能力 | Anthropic 可能重新拉开与 OpenAI、Google 的差距 |
| 定价 | Capybara 作为 Opus 之上的新层级，预计定价将创 AI API 新高 |
| 安全叙事 | "最强安全公司做出最强网安风险模型"的悖论将更加尖锐 |
| 企业市场 | 优先向安全防守方提供早期访问 = 安全领域成为杀手应用 |

### 预期各方反应

- **OpenAI** 可能加速 GPT-6 / "Orion" 的发布时间表
- **Google** 可能提前发布 Gemini 3 Ultra
- **DeepSeek** 的 V4 发布（传闻4月）将成为开源阵营的关键对标
- **企业客户** 在安全领域可能优先选择 Anthropic（如果 Capybara 在网安上真的"远超"竞争对手）

## 历史脉络

### Anthropic 的模型迭代节奏

- 2024年3月：Claude 3（Opus/Sonnet/Haiku 三层结构首次引入）
- 2024年6月：Claude 3.5 Sonnet
- 2024年10月：Claude 3.5 Haiku
- 2025年2月：Claude 4 系列
- 2025年10月：Claude Opus 4.5
- 2026年2月：Claude Opus 4.6（BrowseComp 评测中展现出极强的自主信息获取能力）
- 2026年3月：**Mythos/Capybara 泄露**（"step change"）

每一代的进步幅度在加速。从 3 到 3.5 是渐进式提升，从 4 到 4.5 是显著提升，4.5 到 4.6 是网安能力的突破。如果 Mythos 真的是"step change"，这可能是 Anthropic 史上最大的单次能力跃升。

## 批判性分析

### 安全公司的安全事件——讽刺中的信号

Anthropic 一直以"安全优先"作为核心品牌叙事。但在不到一周内：

1. **3月25日**：npm 发包带出 Claude Code 源码（51.2万行 TypeScript + KAIROS 主动 Agent 计划曝光）
2. **3月26日**：CMS 配置错误泄露近 3000 份未发布文档（含 Mythos 模型信息）
3. **计费 Bug**：社区发现缓存 sentinel 替换导致实际多收 10-20 倍费用

作为一家强调"responsible AI"的公司，连续暴露基础运维失误（npm source map、CMS 配置），这对 Anthropic 的品牌伤害是实质性的。

> 36氪评论："你连核心客户端的 source map 都能带着源码一起发出去，那你内部的 release review、artifact audit、supply chain hygiene 到底做得怎么样？"

### 泄露信息的可信度

需要注意的是：
1. Fortune 看到的是**草稿博客**，正式发布版本可能有重大修改
2. "step change" 的措辞可能是营销导向的夸张
3. Capybara 层级的正式发布时间和定价仍不明确

### 被忽略的风险

1. **Capybara 的能耗和成本**：草稿中提到"expensive to run and not yet ready for general release"——如果成本过高，可能限制其实际应用范围
2. **安全能力的不对称性**：优先向防守方提供访问是好的，但攻击者获取模型的速度可能更快
3. **IPO 影响**：36氪指出 Anthropic 可能在 2026 年 IPO。连续的安全事件对资本市场的"管理成熟度"评估不利

### 独立观察

- **KAIROS + Mythos 的协同效应被低估了。** 如果 Mythos 模型驱动 KAIROS 主动 Agent 系统（7×24 在线、GitHub webhook 订阅、cron 定时任务、跨会话记忆），那组合起来就是一个**全天候自主运行的超级 Agent**。这不是简单的聊天机器人升级，而是 Agent 范式的质变。
- **"先向安全防守方开放"的策略是精明的。** 这既是负责任的做法，也是绝佳的商业策略——安全是企业支付意愿最高的领域之一，Capybara 如果在网安上真的"远超"竞争对手，将直接切入高价值企业市场。
- **对动动的建议：** 密切关注 Anthropic 未来 2-4 周的动态。Mythos/Capybara 的正式发布可能随时到来，考虑到泄露已经发生，Anthropic 可能选择提前发布以控制叙事。
