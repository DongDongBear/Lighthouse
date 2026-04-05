---
title: "深度解读：NVIDIA × Marvell NVLink Fusion — $20 亿投资锁定定制硅片生态"
---

# 深度解读：NVIDIA 与 Marvell 通过 NVLink Fusion 扩展合作

> 信源：[NVIDIA 官方新闻稿](https://nvidianews.nvidia.com/news/nvidia-ai-ecosystem-expands-as-marvell-joins-forces-through-nvlink-fusion)（2026-03-31）
> 解读日期：2026-04-06

## 一、为什么这件事重要

NVIDIA 宣布与 Marvell 通过 NVLink Fusion 扩展战略合作，同时向 Marvell 投资 20 亿美元。这不只是一次技术合作——它是 NVIDIA 在推理时代将定制硅片合作伙伴系统性地吸纳进自己机架级技术栈的关键动作。

Jensen Huang 的表态直接点明了背景：**"推理拐点已至，token 生成需求激增，全球正在竞建 AI 工厂。"**

## 二、合作架构详解

### NVLink Fusion 的核心价值

NVLink Fusion 是 NVIDIA 的机架级平台，其核心功能是：**让第三方定制硅片能直接接入 NVIDIA 的高速互联体系，绕过传统 PCIe 瓶颈。**

这意味着客户可以在 NVIDIA 架构内构建异构 AI 基础设施——使用 Marvell 的定制 XPU 同时无缝集成 NVIDIA 的 GPU、网络和存储。

### 双方贡献

| 角色 | NVIDIA 提供 | Marvell 提供 |
|------|-----------|------------|
| 计算 | Vera CPU、机架级 AI 计算 | 定制 XPU |
| 网络 | ConnectX NIC、BlueField DPU、NVLink 互联、Spectrum-X 交换机 | NVLink Fusion 兼容的 scale-up 网络 |
| 先进互联 | 参与 silicon photonics 合作 | 光互联 DSP、silicon photonics |
| 电信 | Aerial AI-RAN | 高速连接 |

### $20 亿投资的含义

- NVIDIA 向 Marvell 投资 20 亿美元
- 这不是风投式的财务投资，而是**锁定深度绑定的战略筹码**
- 资本关系比纯技术合作更难拆解——Marvell 在短中期内很难转向与 NVIDIA 竞争的阵营

## 三、推理拐点下的基础设施逻辑

### 为什么 NVIDIA 需要 Marvell

随着推理需求爆发，客户的需求正在分化：

1. **标准化训练集群**：用 NVIDIA 标准 GPU 即可满足
2. **定制推理基础设施**：不同客户对延迟、吞吐、功耗的要求差异巨大，需要定制硅片

NVLink Fusion 的战略是：**与其让定制硅片客户流向 Broadcom 或自研方案，不如把它们拉进 NVIDIA 生态内，让定制硅片也跑在 NVLink 互联上。**

### 对定制硅片市场的影响

当前 AI 定制硅片市场的主要路线：

| 路线 | 代表 | 与 NVIDIA 关系 |
|------|------|--------------|
| 被吸纳进 NVIDIA 生态 | **Marvell（NVLink Fusion）** | 深度绑定 |
| 独立竞争 | Broadcom（TPU 协同处理器） | 竞争 |
| 云厂商自研 | AWS Trainium、Google TPU | 替代 |

Marvell 选择"被吸纳"路线，换取的是 NVIDIA 生态的技术支持和市场准入。对 Broadcom 等独立竞争者而言，这是一个压力信号——NVIDIA 正在用资本和技术双重手段锁定供应链伙伴。

## 四、向 Silicon Photonics 和 AI-RAN 延伸

合作范围不限于数据中心内部：

- **Silicon Photonics**：光互联技术，用于解决 AI 集群中日益严峻的电互联带宽和功耗瓶颈
- **AI-RAN（5G/6G）**：将电信基础设施转化为 AI 基础设施

这说明 NVIDIA 的布局已经从"数据中心内的计算"扩展到"数据中心之间的传输"和"网络边缘的推理"，生态边界在持续扩张。

## 五、对不同参与方的影响

### 对 NVIDIA

- 进一步强化机架级生态的完整性
- 通过吸纳定制硅片伙伴，把潜在竞争者转化为生态成员
- $20 亿投资在资本层面锁定了长期合作

### 对 Marvell

- 获得 NVIDIA 生态的技术支持和客户渠道
- 但也意味着其定制硅片方向与 NVIDIA 深度捆绑，独立性受限

### 对客户

- **好处**：在 NVIDIA 架构内获得了定制化选择，不必完全依赖标准 GPU
- **风险**：对 NVIDIA 的整体生态依赖可能进一步加深

### 对行业

- NVIDIA 生态吸纳力越强，行业对其单一依赖的风险越大
- 但也推动了推理基础设施的快速标准化和部署

## 六、局限与观察要点

- **NVLink Fusion 生态的开放度**：除 Marvell 外，是否会有更多定制硅片厂商加入，还是会形成排他性绑定
- **实际部署节奏**：从合作宣布到产品化部署通常需要 12-18 个月
- **客户真实需求**：定制硅片 + NVLink 的组合在推理集群中的实际性价比和适用场景，需要更多部署数据验证
- **后续关注**：NVLink Fusion 的技术规格文档公开程度、首批客户部署案例、以及竞争对手的回应
