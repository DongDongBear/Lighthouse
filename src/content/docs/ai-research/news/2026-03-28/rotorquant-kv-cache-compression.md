---
title: "RotorQuant: Clifford 代数旋子实现 KV Cache 极端压缩"
description: "RotorQuant, Clifford代数, 旋子, KV Cache压缩, TurboQuant, Triton kernel, 3-bit量化, 长上下文推理, MIT License"
---

# RotorQuant: Clifford Algebra KV Cache Compression

> GitHub：https://github.com/scrya-com/rotorquant
> 作者：John D. Pope
> 许可证：MIT License
> 发布日期：2026-03-28

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 用 Clifford 代数旋子（rotor）替代旋转矩阵实现 KV Cache 量化，参数量减少 44 倍，FMA 运算减少 7 倍 |
| 大白话版 | 数据压缩前需要"旋转对齐"——传统方法用笨重的旋转矩阵，RotorQuant 用数学上等价但轻量得多的"旋子"来做同样的事，省了大量计算 |
| 核心数字 | 44x 参数削减、7x FMA 削减、~2,064 vs 16,384 FMA/向量、Triton kernel 12.7x 加速、4-bit 困惑度退化 3.2%-10.1% |
| 评级 | B — 开源工程项目（MIT），在 TurboQuant 理论框架上提供了高效工程替代方案 |
| 代码 | https://github.com/scrya-com/rotorquant（MIT License，可直接使用） |
| 关键词 | RotorQuant, Clifford Algebra, Rotor, KV Cache, TurboQuant, Triton Kernel, Grade Elimination |

## 核心 Insight

KV Cache 量化的标准流程包含一个关键步骤：在量化之前对向量进行旋转变换（rotation），使数据分布更均匀、更适合量化。Google 的 TurboQuant（PolarQuant 组件）使用标准的旋转矩阵来执行这一步骤。

**RotorQuant 的核心洞察：三维空间中的旋转可以用 Clifford 代数的旋子（rotor）来表示，而旋子比旋转矩阵在参数和计算上高效得多。**

这个洞察来自数学物理中一个已知但在 ML 领域鲜少应用的事实：

- **旋转矩阵：** 一个 d x d 的矩阵，包含 d^2 个参数，执行矩阵-向量乘法需要 d^2 次 FMA
- **Clifford 旋子：** 表示相同旋转仅需 O(d) 个参数，执行旋转仅需 O(d) 次 FMA

对于高维 KV Cache 向量（通常 d = 128），差距巨大：

| 表示方式 | 参数量 | FMA/向量 |
|---|---|---|
| 旋转矩阵（TurboQuant） | ~16,384 | ~16,384 |
| Clifford 旋子（RotorQuant） | ~372 | ~2,064 |
| **倍数差异** | **44x** | **7x** |

### 为什么旋子更高效？

直觉解释：旋转矩阵是"过度参数化"的——一个 d 维空间中的旋转只有 d(d-1)/2 个自由度（选择旋转平面 + 旋转角度），但旋转矩阵用了 d^2 个参数来表示它。多出来的参数受正交约束绑定，既浪费存储又浪费计算。

Clifford 旋子直接在旋转的内在自由度上参数化：选择一个旋转平面（bivector）和一个角度，旋子就确定了。没有冗余参数，没有浪费的计算。

### RotorQuant 在技术栈中的位置

RotorQuant 不是 TurboQuant 的替代品，而是其旋转步骤的高效替代实现：

```
KV Cache 向量 → [旋转对齐] → [标量量化] → [残差纠错] → 压缩 KV Cache
                    ^
                    |
           TurboQuant: 旋转矩阵
           RotorQuant: Clifford 旋子（本文）
```

量化和残差纠错步骤保持不变，RotorQuant 只替换了旋转这一个环节——但这个环节在整个流程中占据了大部分参数和计算。

## 方法详解

### Clifford 代数基础

Clifford 代数是一种扩展了向量空间的代数结构。在三维空间 R^3 中，Clifford 代数 Cl(3,0) 包含以下元素：

- **标量（grade 0）：** 普通数字
- **向量（grade 1）：** 三维向量 e_1, e_2, e_3
- **双向量/bivector（grade 2）：** 表示平面方向 e_12, e_23, e_31
- **三向量/trivector（grade 3）：** 伪标量 e_123

**旋子的构造：** 给定旋转平面 B（一个 bivector）和旋转角度 theta，旋子为：

R = cos(theta/2) - sin(theta/2) * B

**旋转操作：** 对向量 v 的旋转为：

v' = R * v * R_tilde

其中 R_tilde 是 R 的逆（对于单位旋子，就是 R 的 reversion）。

### Grade Elimination（阶消除）

RotorQuant 的第一个技术贡献是利用 Clifford 代数的阶结构来减少计算：

**观察：** 旋子 R 只包含 grade 0 和 grade 2 的分量。当执行"旋子三明治"运算 R * v * R_tilde 时，中间结果会产生所有阶的分量（grade 0 到 grade 3），但最终结果只包含 grade 1 分量（因为旋转不改变向量的阶）。

**优化：** 通过代数推导，可以直接跳过偶数阶（grade 0 和 grade 2）的中间计算，只计算奇数阶（grade 1 和 grade 3）的分量，然后提取 grade 1 部分作为结果。

**量化效果：** 在 Cl(3,0) 中：
- 完整计算需要遍历所有 2^3 = 8 个基元素的组合 → 344 个索引对
- Grade elimination 后只需计算奇数阶 → 129 个索引对
- **减少约 62% 的乘加运算**

### Norm Separation（范数分离）

RotorQuant 的第二个技术贡献是将向量的范数和方向分离处理：

**步骤：**
1. 计算 KV 向量的范数 ||v||
2. 将向量归一化到单位球面：v_hat = v / ||v||
3. 对单位向量 v_hat 应用旋子旋转
4. 对旋转后的单位向量进行标量量化
5. 范数单独存储（高精度，因为只有一个标量）

**为什么有效：** 量化误差与向量的尺度成正比。归一化后所有向量的"尺度"都是 1，量化器可以在已知的固定范围内工作，不需要动态调整量化参数——这与 TurboQuant 的 PolarQuant 思路一致。

### Post-Prefill Quantization（预填充后量化）

RotorQuant 采用了一个实用的工程策略：

1. **Prefill 阶段：** 以 FP16 精度处理整个输入提示，生成完整的 KV Cache
2. **第一次 decode 时：** 批量将所有 KV Cache 从 FP16 量化到目标精度（3-bit 或 4-bit）
3. **后续 decode：** 新生成的 KV 直接以量化精度追加

**为什么不在 prefill 期间逐步量化？** 因为 prefill 阶段的 KV Cache 一次性生成，可以利用全局统计信息（如向量范数的分布）来优化量化参数。逐步量化则只能看到局部信息。

### Triton Kernel 实现

RotorQuant 提供了基于 Triton 的 GPU kernel 实现：

**关键性能特征：**
- 旋子旋转的计算时间与上下文长度**无关**：约 0.024ms，无论是 2K 还是 32K token
- 这是因为旋子参数是全局共享的——所有 KV 向量使用同一个旋子进行旋转
- 相比之下，FP32 基线的旋转时间随上下文长度线性增长

## 实验结果

### 困惑度评估（wikitext-2, 4-bit 量化）

| 模型 | FP16 困惑度 | 4-bit 困惑度 | 退化幅度 |
|---|---|---|---|
| Mistral-7B | 4.80 | 5.16 | +7.4% |
| Gemma-2-2b | 8.87 | 9.77 | +10.1% |
| Qwen2.5-3B | 9.81 | 10.13 | +3.2% |

**解读：**

- **Qwen2.5-3B 表现最佳：** 仅 3.2% 的困惑度退化，说明该模型的 KV Cache 向量分布对量化更友好
- **Gemma-2-2b 退化最大：** 10.1% 的退化虽然是三者中最高的，但考虑到 4-bit 量化带来的 3.7 倍内存压缩，这个交换比仍然合理
- **Mistral-7B 居中：** 7.4% 的退化在可接受范围内

### 高上下文长度吞吐量（Qwen2.5-3B, 3-bit 量化）

| 上下文长度 | 吞吐量(tok/s) | 内存占用 |
|---|---|---|
| 2K | 6.9 | 2.4 GB |
| 32K | 5.0 | 5.9 GB |
| 65K | 2.1 | 9.6 GB |

**解读：**

- **2K 上下文：** 6.9 tok/s 配合仅 2.4 GB 内存，意味着 3-bit RotorQuant 可以在消费级 GPU（甚至高端手机）上运行 3B 模型
- **32K 上下文：** 5.0 tok/s 仍然是可用的交互速度，5.9 GB 内存在 8GB 显存的 GPU 上可以运行
- **65K 上下文：** 2.1 tok/s 较慢但仍可用于非实时场景，9.6 GB 需要 12GB+ 显存

### Triton Kernel 性能

| 指标 | 数值 |
|---|---|
| 旋子旋转延迟 | ~0.024ms（与上下文长度无关） |
| vs FP32 在 32K 上下文 | 12.7x 加速 |
| 计算量 | ~2,064 FMA/向量 |
| vs TurboQuant 旋转矩阵 | 16,384 FMA/向量（7.9x 减少） |

**关键特征：** 0.024ms 的恒定延迟是旋子方法的核心优势。旋转矩阵方法的延迟随上下文长度线性增长（因为需要对每个 KV 向量独立做矩阵乘法），而旋子的参数量极小，可以完全放在 GPU 寄存器中，几乎零访存开销。

### 与 FP16 基线的速度对比

| 上下文长度 | RotorQuant vs FP16 |
|---|---|
| 短上下文（<100 tokens） | 慢 17% |
| ~60 tokens | 慢 12% |
| 长上下文（>1K tokens） | 由于内存节省带来的带宽优势，差距进一步缩小 |

**解读：** 短上下文下 RotorQuant 比 FP16 稍慢，因为量化/反量化的固定开销在短序列上无法被摊销。但随着上下文增长，内存带宽成为瓶颈，压缩后的 KV Cache 传输更快，RotorQuant 的相对劣势缩小。

### 压缩比总结

| 量化精度 | 压缩比 | 适用场景 |
|---|---|---|
| 4-bit | 3.7x | 质量优先：困惑度退化最小，适合对精度敏感的任务 |
| 3-bit | 4.9x | 容量优先：更极端的压缩，适合长上下文或内存受限场景 |

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | 5/5 | wikitext-2 公开可用，评估完全可复现 |
| 代码可得性 | 5/5 | MIT License 完整开源，包含 Triton kernel |
| 算力需求 | 5/5 | 评估仅需单卡消费级 GPU |
| 工程复杂度 | 3/5 | Clifford 代数实现需要理解数学背景，但代码已封装 |
| 预期收益 | 4/5 | 对长上下文部署和边缘设备推理有直接价值 |

**复现建议：** 直接 clone GitHub 仓库即可运行。建议从 Qwen2.5-3B + 4-bit 量化开始（退化最小），验证困惑度数据后再尝试 3-bit 和更长上下文的配置。Triton kernel 需要 NVIDIA GPU + Triton 编译环境。

## 批判性分析

### 局限性

1. **困惑度 vs 下游任务：** 论文仅报告了 wikitext-2 上的困惑度指标。困惑度退化（3.2%-10.1%）在下游任务（如 QA、摘要、代码生成）上可能被放大或缩小——目前缺乏这方面的评估。对于 KV Cache 压缩方法，长上下文 QA 精度和 Needle-In-A-Haystack 测试是更有说服力的评估，但论文未包含。

2. **与 TurboQuant 的不完整对比：** RotorQuant 声称在旋转步骤上比 TurboQuant 更高效，但没有在相同模型和数据集上进行端到端的困惑度对比。TurboQuant 声称"零精度损失"，而 RotorQuant 有 3.2%-10.1% 的退化——这个差距来自旋子近似还是其他原因，论文未澄清。

3. **3D 旋子的维度限制：** 论文在 Cl(3,0)（三维 Clifford 代数）中实现旋子。但 KV Cache 向量通常是 128 维的——如何将 128 维向量映射到 3 维旋子空间？论文的具体处理方式（分块、嵌套旋转等）需要更多技术细节。

4. **单一作者项目的可靠性：** 作为单一作者的开源项目，代码质量和持续维护存在风险。没有同行评审的论文支撑，技术正确性完全依赖社区验证。

5. **模型覆盖有限：** 仅在 3 个相对较小的模型（2B-7B）上评估。对于 70B+ 规模的模型，KV Cache 的维度和分布可能不同，RotorQuant 的效果需要额外验证。

### 与 TurboQuant 的关系

RotorQuant 和 TurboQuant 之间的关系值得仔细分析：

| 维度 | TurboQuant | RotorQuant |
|---|---|---|
| 来源 | Google Research, ICLR 2026 | 个人开源项目 |
| 理论基础 | 极坐标分解 + JL 变换 | Clifford 代数旋子 |
| 旋转参数量 | ~16,384 | ~372（44x 少） |
| 旋转 FMA | ~16,384 | ~2,064（7x 少） |
| 精度声明 | 零精度损失（3-bit） | 3.2%-10.1% 退化（4-bit） |
| 硬件加速 | H100 注意力 8x 加速 | Triton kernel 12.7x 旋转加速 |
| 代码 | 未开源 | MIT License 开源 |

**关键洞察：** TurboQuant 在精度上更优，但代码未开源；RotorQuant 在效率上更优，且已完整开源。对于实际部署，RotorQuant 目前是唯一可用的选项。两者的旋转步骤理论上可以互换——如果 TurboQuant 开源后将其旋转矩阵替换为 RotorQuant 的旋子，可能同时获得两者的优势。

### 独立观察

- **Clifford 代数在 ML 中的复兴：** RotorQuant 是 Clifford 代数在机器学习工程中的一个具体应用案例。此前 Clifford 代数主要在物理模拟和计算机图形学中使用——将其引入 LLM 推理优化是一个有趣的跨领域迁移。如果 RotorQuant 被广泛采用，可能激发更多 Clifford 代数在 ML 中的应用。

- **KV Cache 压缩竞赛的格局：** 在不到两天时间内，我们看到了 TurboQuant（Google, 理论驱动）和 RotorQuant（个人开发者, 工程驱动）两个 KV Cache 压缩方案。这反映了 KV Cache 压缩已经成为 LLM 部署优化的核心战场——谁能在不损失精度的前提下最大限度地压缩 KV Cache，谁就能在长上下文和大规模并发场景中获得成本优势。

- **开源 vs 闭源的实用性倒挂：** TurboQuant 理论上更优但代码未开源，RotorQuant 精度稍差但 MIT License 完全开放。对于需要立即部署的团队，RotorQuant 是现在就能用的方案。这再次说明了在快速发展的 AI 领域，开源的"可用性溢价"有时超过了理论上的性能差距。

- **边缘设备部署前景：** 3-bit 量化下 Qwen2.5-3B 仅需 2.4 GB 内存处理 2K 上下文——这意味着 RotorQuant 可以将 3B 参数的 LLM 塞进手机或嵌入式设备。结合 GGML/llama.cpp 等推理引擎，端侧 LLM 的实用性可能因此迈过一个门槛。

### 对领域的影响

短期：为需要长上下文推理但内存受限的部署场景提供了即时可用的开源方案。

中期：如果 Clifford 旋子方法被验证在更大模型上同样有效，可能成为 KV Cache 量化流程的标准组件，替代传统的旋转矩阵方法。

长期：推动数学物理中的代数工具（Clifford 代数、几何代数）在 ML 工程中的更广泛应用，为 ML 系统优化开辟新的数学工具箱。
