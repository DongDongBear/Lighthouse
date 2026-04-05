---
title: "深度解读：NVIDIA 与 Marvell 通过 NVLink Fusion 扩展合作 — $20 亿投资锁定定制硅片生态"
---

# 深度解读：NVIDIA × Marvell NVLink Fusion — 把定制硅片吸纳进机架级栈

> 信源：[NVIDIA Newsroom](https://nvidianews.nvidia.com/news/nvidia-ai-ecosystem-expands-as-marvell-joins-forces-through-nvlink-fusion)
> 公告日期：2026-03-31
> 解读日期：2026-04-06

## 一、为什么这件事重要

NVIDIA 宣布与 Marvell 通过 NVLink Fusion 扩展战略合作，并向 Marvell 投资 $20 亿。这不只是技术合作新闻——它是 NVIDIA 基础设施生态战略的重要一步：**把定制硅片合作伙伴吸纳进自己的机架级技术栈，而不是将这一层拱手让出。**

Jensen Huang 的表态进一步强化了推理侧基础设施叙事："推理拐点已至，token 生成需求激增，全球正在竞建 AI 工厂。"

## 二、合作架构

### NVLink Fusion 平台

NVLink Fusion 是 NVIDIA 的一个机架级平台，允许客户使用 NVIDIA 的 NVLink 高速互联生态来开发半定制 AI 基础设施。在此合作中：

| 角色 | 提供方 | 组件 |
|------|--------|------|
| **定制 XPU** | Marvell | 定制加速器芯片 |
| **Scale-up 网络** | Marvell | NVLink Fusion 兼容的互联 |
| **CPU** | NVIDIA | Vera CPU |
| **NIC** | NVIDIA | ConnectX |
| **DPU** | NVIDIA | BlueField |
| **互联** | NVIDIA | NVLink |
| **交换机** | NVIDIA | Spectrum-X |
| **机架计算** | NVIDIA | 整体机架级方案 |

NVLink Fusion 的核心价值：**让第三方定制硅片能直接接入 NVIDIA 的高速互联体系，而不必走传统 PCIe 瓶颈。**

### 扩展合作领域

合作不限于数据中心：

- **Silicon Photonics**：光互联技术，面向下一代数据中心的光学传输
- **AI-RAN**：将电信网络转化为 AI 基础设施（NVIDIA Aerial AI-RAN for 5G/6G）

## 三、战略分析

### $20 亿投资的含义

NVIDIA 向 Marvell 投资 $20 亿，这种资本关系远比技术合作协议更难拆解。它意味着：

1. **深度绑定**：Marvell 成为 NVIDIA 生态的长期战略合作伙伴，不是可以轻易更换的供应商
2. **利益一致**：NVIDIA 作为 Marvell 的重要股东，双方在技术路线和市场策略上有更强的协调动机
3. **对竞争对手的信号**：其他定制硅片厂商（Broadcom、AWS Trainium 等）面临"被吸纳"还是"独立竞争"的路线选择

### NVLink Fusion 的生态意义

过去，想使用定制 AI 加速器的客户，往往需要在 NVIDIA 生态和定制方案之间做二选一。NVLink Fusion 改变了这个逻辑：

> 以前：NVIDIA GPU **或** 定制 XPU
> 现在：NVIDIA 基础设施 **加上** 定制 XPU（通过 NVLink Fusion 兼容）

这让 NVIDIA 从"GPU 供应商"变成了"AI 基础设施生态的网关"——即使客户选择定制芯片，仍然在 NVIDIA 的互联和软件生态中运行。

### 推理侧基础设施叙事

Jensen Huang 的"推理拐点"表态值得重视。随着 AI 应用从训练向推理迁移：

- **训练**：集中在少数大型集群，客户相对集中
- **推理**：分散在大量企业和边缘场景，对异构硬件、低延迟和成本效率的需求更多样化

NVLink Fusion 正是面向推理时代的产品：允许更多样化的硬件组合，同时保持 NVIDIA 的互联和软件栈作为公共层。

## 四、对定制硅片市场的影响

### 当前定制硅片格局

| 厂商 | 路线 | 与 NVIDIA 关系 |
|------|------|---------------|
| **Marvell** | 通过 NVLink Fusion 接入 NVIDIA 生态 | 深度合作 + 资本绑定 |
| **Broadcom** | 为 Google TPU 等提供定制互联 | 竞争关系 |
| **AWS（Trainium/Inferentia）** | 自研 AI 芯片 | 独立竞争 |
| **Google（TPU）** | 完全自研 | 独立竞争 |
| **Microsoft（Maia）** | 自研 AI 芯片 | 竞争中合作 |

Marvell 选择了"被吸纳"路线——通过接入 NVIDIA 生态获取更大市场，代价是在架构层与 NVIDIA 深度绑定。对其他定制硅片厂商，这是一个路线选择的参照：**加入 NVIDIA 生态获取互联优势，还是保持独立性但承担兼容成本？**

## 五、局限与待观察

### 已确认的信息

- NVIDIA 向 Marvell 投资 $20 亿（来自 NVIDIA 官方新闻稿）
- 合作通过 NVLink Fusion 平台实现，Marvell 提供定制 XPU 和互联组件
- 合作延伸到 silicon photonics 和 AI-RAN
- Jensen Huang 和 Matt Murphy 分别代表两家公司发表了声明

### 需要审慎对待的方面

- **实际产品交付时间未公布**：新闻稿更多是战略框架宣布，具体的硬件产品何时上市、性能指标如何，均未披露
- **NVLink Fusion 的客户采用规模尚不清楚**：是否有大型客户已在部署或计划部署
- **Marvell 在 NVIDIA 生态中的实际差异化**：定制 XPU 相对于 NVIDIA 自有 GPU 的具体优势场景，需要更多技术细节

## 六、总结判断

NVIDIA × Marvell 的合作，本质上是 NVIDIA 在做一件事：**把机架级基础设施的每一层都纳入自己的技术栈和资本关系网。**

从 GPU（计算）→ NVLink（互联）→ Spectrum-X（网络）→ NVLink Fusion（第三方兼容层）→ Silicon Photonics（光互联），NVIDIA 正在构建一个从计算到连接到光传输的完整基础设施生态。

对行业而言，这意味着 NVIDIA 生态的吸纳力越来越强，但也意味着对其单一依赖的系统性风险在增大。推理时代的基础设施竞争，正在从芯片层上升到生态层。
