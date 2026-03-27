---
title: "Arm 历史性转型：从芯片设计到自产 AGI CPU，Meta/OpenAI 成首批客户"
description: "Arm, AGI CPU, 芯片制造, Meta, OpenAI, Cerebras, 数据中心, TSMC 3nm"
---

# Arm Is Now Making Its Own Chips

> 原文链接：https://www.wired.com/story/chip-design-firm-arm-is-making-its-own-ai-cpu/
> 来源：Wired
> 作者：Lauren Goode
> 发布日期：2026-03-24

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Arm 打破 30 年纯 IP 授权模式，宣布自产 AI CPU 芯片，Meta/OpenAI/Cerebras 成为首批客户 |
| 大白话版 | 全世界每个人平均有 3 个 Arm 芯片但都是别人造的，现在 Arm 自己也要造了——专门给 AI Agent 用的 |
| 核心数字 | TSMC 3nm 工艺、2026 H2 量产、$25B→$100B 数据中心 CPU 市场（2030） |
| 影响评级 | A — 改变行业格局：数据中心 CPU 从 Intel/AMD 双寡头走向三方竞争 |
| 利益相关方 | Meta(首批客户)、OpenAI(首批客户)、Cerebras、Cloudflare、软银(90%控股) |

## 事件全貌

### 发生了什么？

2026 年 3 月 24 日，Arm CEO Rene Haas 在旧金山面向现场观众宣布："让我说清楚——我们现在进入了新业务，我们在供应 CPU。"他手持一块全新的 Arm AGI CPU 芯片。

这标志着 Arm 过去 30 年商业模式的根本转变：

- **1990 年代至今：** Arm 只做芯片设计（IP 授权），把设计图卖给 Apple、Qualcomm、NVIDIA、Samsung 等公司，由它们自己制造芯片
- **2026 年 3 月：** Arm 首次自己制造芯片——由台积电（TSMC）用 3nm 工艺代工

### 时间线

- **1978 年** — Arm 前身 Acorn 成立，生产微处理器
- **1990 年代** — 改名 ARM，开始 IP 授权模式
- **2010 年代** — 移动革命，Apple/Qualcomm/NVIDIA 等全部使用 Arm 架构
- **2016 年** — 软银以 $320 亿收购 Arm
- **2020 年** — NVIDIA 试图以 $400 亿收购 Arm，最终失败
- **2023 年** — Arm 在纳斯达克 IPO
- **2026 年 3 月 24 日** — 宣布自产 AGI CPU
- **2026 年下半年** — 预计量产

### 关键人物说了什么？

**Rene Haas (Arm CEO)：** "我们现在进入了新业务——供应 CPU。"

**Santosh Janardhan (Meta 基础设施负责人)：** 已收到 Arm CPU 样品。认为 Arm 芯片将"在多个维度扩展芯片产业"。Meta 追求"个人超级智能"需要更多硅片，对能效尤为关注。

**Kevin Weil (OpenAI VP)：** "在 OpenAI 内部最常听到的话就是：'我需要更多算力。'算力是我们这个领域的硬通货。"

**Jensen Huang / James Hamilton / Amin Vahdat (NVIDIA/Amazon/Google AI)：** 以录播视频形式赞扬 Arm 硬件，但**没有承诺购买**。

## 技术解析

### 技术方案

- **命名：** Arm AGI CPU（"AGI"是市场叙事）
- **定位：** 数据中心高性能服务器中的 AI CPU，专门处理 Agentic AI 任务
- **工艺：** TSMC 3nm
- **核心优势：** 性能功耗比（Performance per Watt）——Arm 声称比 Intel/AMD 的 x86 芯片更高效

### 关键指标

| 指标 | Arm AGI CPU | Intel x86 (数据中心) | AMD x86 (数据中心) |
|---|---|---|---|
| 架构 | Arm (RISC) | x86 (CISC) | x86 (CISC) |
| 工艺 | TSMC 3nm | Intel 18A | TSMC 3/4nm |
| 能效 | 声称最优 | 标准 | 较好 |
| 生态成熟度 | 发展中 | 最成熟 | 成熟 |
| 定位 | AI Agent 专用 | 通用 | 通用 |

### 与之前的区别

Arm 之前的角色是"卖图纸的建筑师"——设计了世界上最多的芯片架构，但从不自己盖房子。现在它要"自己盖房子并卖给住户"——同时继续卖图纸给其他建筑公司。

## 产业影响链

```
Arm 自产 AGI CPU
  ├→ 直接影响：数据中心 CPU 从双寡头(Intel/AMD)变为三方竞争
  │   → 推动 CPU 价格下降和创新加速
  ├→ 生态影响：Arm 授权客户可能视其为竞争对手
  │   → Apple/Qualcomm/NVIDIA 可能加速 RISC-V 替代探索
  ├→ AI 行业：AI Agent 工作负载获得更高效的 CPU 选择
  │   → 推理成本可能进一步下降
  └→ 地缘政治：软银(日本)→Arm(英国)→TSMC(台湾)的供应链增加了非美国选项
```

### 谁受益？

1. **Meta/OpenAI：** 获得了更多 CPU 供应商选择，有利于降低基础设施成本和避免单一供应商依赖
2. **Arm/软银：** 从纯 IP 授权收入转向更高利润的芯片销售收入。Creative Strategies 预测数据中心 CPU 市场到 2030 年将达 $60-100B
3. **Cerebras/Cloudflare：** 作为首批客户获得了竞争优势——Cloudflare 的 Dynamic Workers 配合 Arm 高效能 CPU 可能是 Agent 边缘部署的最佳组合

### 谁受损？

1. **Intel/AMD：** x86 数据中心 CPU 的双寡头地位受到直接挑战。Intel 正在经历最困难的时期（代工业务亏损、市场份额下降），Arm 的入局雪上加霜
2. **Arm 的现有授权客户：** Apple、Qualcomm、Samsung 等公司此前信赖 Arm 不会与它们竞争。现在 Arm 从合作伙伴变成了竞争对手——特别是如果 Arm 后续扩展到通用 CPU 领域
3. **NVIDIA Grace CPU：** NVIDIA 的 Arm 架构数据中心 CPU 与 Arm 自产 CPU 直接竞争

## 竞争格局变化

### 变化前

数据中心 CPU 格局：
- **Intel x86（~65% 份额）** + **AMD x86（~25%）** + **Arm 授权CPU（~10%，主要是 AWS Graviton 和 NVIDIA Grace）**
- Arm 只收取 IP 授权费，不直接参与芯片销售竞争

### 变化后

- **Intel** + **AMD** + **Arm 自产** + **Arm 授权CPU（AWS/NVIDIA/Qualcomm 等）** + **潜在的 RISC-V 替代**
- 竞争维度从"x86 vs Arm 架构"转变为"谁的芯片对 AI 工作负载最优化"

### 预期各方反应

- **Apple** — 最有可能加速 RISC-V 研发作为 Arm 的替代方案。Apple 是 Arm 最重要的授权客户，如果感到威胁可能成为 RISC-V 最大推动力
- **AWS** — 已经有自研 Graviton（Arm 架构），可能既是 Arm 的客户又是竞争对手
- **NVIDIA** — Jensen Huang 在录播视频中赞扬但未承诺购买——可能在观望

## 批判性分析

### 被忽略的风险

1. **信任危机：** Arm 30 年来的商业模式建立在"我们不与客户竞争"的承诺上。一旦这个承诺被打破，授权客户可能加速去 Arm 化——RISC-V 可能是最大受益者。

2. **生态系统碎片化：** Arm 生态的统一性是其最大优势。如果授权客户开始分化（部分转向 RISC-V、部分自研），整个生态可能削弱。

3. **执行风险：** 设计芯片和制造芯片是完全不同的能力。Arm 在供应链管理、客户支持、质量保证等方面缺乏经验。

### 独立观察

- "AGI CPU"这个命名是聪明的市场策略——利用 AGI 热度吸引注意力，但实际上是一款面向 AI Agent 工作负载的数据中心 CPU。它既不能实现 AGI，也不是 GPU——但名字会被记住。

- Ben Bajarin（Creative Strategies CEO）指出了一个关键动态：目前 Arm 只做少量核心的 Agent 专用 CPU。但如果成功，它会扩展到更通用的 CPU——**那时才是与 Intel/AMD 的真正正面战争**。

- 软银拥有 Arm 90% 股份。孙正义的 AI 芯片布局现在覆盖了从 IP 授权到自产 CPU 的完整链条。如果 Arm AGI CPU 成功，软银在 AI 基础设施中的战略地位将大幅提升。
