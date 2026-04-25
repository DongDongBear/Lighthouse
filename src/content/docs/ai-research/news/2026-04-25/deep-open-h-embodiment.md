---
title: "深度解读 | Open-H-Embodiment：770 小时、20 种机器人平台，医疗机器人终于开始拥有 foundation model 级数据底座"
description: "Open-H-Embodiment, medical robotics, surgical VLA, GR00T-H, Cosmos-H-Surgical-Simulator, dataset, multi-embodiment, surgical autonomy"
---

# Open-H-Embodiment 深度解读

> 原文链接：https://arxiv.org/abs/2604.21017
> 作者：Open-H consortium 等
> 发布日期：2026-04-22
> 核对说明：已通读原文全文，并检索过去 14 天 `deep-*.md`，未发现同主题 deep 稿件，因此新建本文。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 这篇论文做的不是又一个手术机器人 policy，而是先补医疗机器人最缺的底座：一个跨 49+ 机构、20 种平台、770 小时视频+运动学配对数据集，然后用它训练出手术 VLA GR00T-H，并展示跨平台和长时序收益。 |
| 数据集规模 | 119 个子数据集，770 小时，124,019 episodes，20 个机器人平台，33 类任务，5 类环境。 |
| 模型贡献 | 基于 GR00T-N1.6-3B post-train 得到 GR00T-H；另有 2B latent video diffusion 世界模型 Cosmos-H-Surgical-Simulator。 |
| 最硬结果 | SutureBot 端到端缝合上，GR00T-H 是唯一完成全流程的模型，20 次里完成 5 次（25%）；其余 ACT、GR00T-N1.6、LingBot-VA 都是 0/20。 |
| 最强行业意义 | 医疗机器人终于开始拥有类似 Open-X-Embodiment 在通用机器人中的那种“跨机构、跨平台、跨任务”的 foundation data substrate。 |

## 这篇论文要解决什么问题

作者的起点非常明确：医疗机器人一直缺数据，而不是只缺模型。

与通用机器人不同，医疗机器人数据长期有四个问题：

- 数据集小
- 通常单一平台
- 很少公开
- 视觉、运动学、注释格式高度异构

因此，通用机器人那种“先靠大规模多平台数据学出通用表征，再少量下游数据微调”的路线，一直很难真正迁移到手术和医疗场景。Open-H 的目标就是补这块：先造出一个足够大、足够异构、又能标准化消费的数据层，再用它验证 foundation VLA 在医疗机器人里是否也成立。

## 方法详解

### 1. Open-H 数据集：先把医疗机器人数据统一成可训练资产

论文的第一项贡献是 Open-H-Embodiment 数据集。它汇集来自 49+ 机构的数据，覆盖：

- 手术机器人
- 机器人超声
- 柔性内窥镜
- 临床、仿真、台架、离体等多种环境

数据统一到 LeRobot v2.1 格式，并要求每个子数据集附带结构化 README，说明：

- 机器人类型
- 数据采集方式
- 操作者技能水平
- 同步策略
- 运动学表示
- 平台特有注意事项

这件事非常关键，因为医疗机器人真正难的不是“把文件放在一起”，而是每个平台的 clutch、相机、器械、腕部、坐标系、磨损状态都不同。论文把“可用性”当成和“规模”一样重要的设计目标。

### 2. GR00T-H：基于通用 VLA 做医疗后训练

GR00T-H 建在 NVIDIA GR00T-N1.6-3B 上，属于 post-training 而不是从零训练。

作者选择该底模的原因包括：

- 已有大规模真实/仿真操作预训练
- Cosmos-2B VLM backbone 支持灵活分辨率
- 有 embodiment-specific action heads，适合多平台动作空间

#### GR00T-H 的核心训练设计

- 只取 Open-H 中 601 小时“真实世界手术”子集做 post-training
- 不把超声、内镜、仿真全部一起混进 GR00T-H 训练
- 为避免 Versius-500 数据量过大压制其他平台，其采样频率封顶 20%
- 其他数据按规模比例采样

#### 动作建模

- 统一转成 relative end-effector control
- 姿态用 6D rotation matrix 表示
- 每个 robot configuration 单独一个 action head

作者特别强调，不按平台共享 action head，因为同平台不同机器、不同器械之间都可能有 cable stretch、hysteresis、wear 差异；如果共享投影层，会把这些实例级误差混在一起。

### 3. Cosmos-H-Surgical-Simulator：多平台手术世界模型

第三项贡献是 C-H-S-S（Cosmos-H-Surgical-Simulator）：

- 基于 Cosmos-Predict 2.5 的 2B latent video diffusion transformer
- 在 Open-H 的 9 个平台、32 个数据集上 fine-tune
- 输入单帧视频 + 一串动作向量
- 自回归生成未来手术画面

作者把它定位为：

- in silico policy evaluation 工具
- synthetic data generation 工具
- 多平台手术世界模型基座

这一步很像把通用机器人里“policy + world model”的组合复制进医疗场景。

## 数据 / 训练细节

### Open-H 规模

| 项目 | 数值 |
|---|---:|
| 子数据集数 | 119 |
| 总时长 | 770 小时 |
| Episodes | 124,019 |
| 机构数 | 49+ |
| 机器人平台 | 20 |
| 任务家族 | 33 |
| 环境类型 | 5 |

### 与既有公开数据集对比

| 数据集 | 小时数 | Episodes | 平台数 |
|---|---:|---:|---:|
| JIGSAWS | ~3 | 103 | 1 |
| Exp. CRCD | ~7 | 80 | 1 |
| SutureBot | ~6 | 1,890 | 1 |
| ImitateCholec | ~20 | ~18,000 | 1 |
| Open-H | 770 | 124,019 | 20 |

这张表已经能说明问题：Open-H 不只是“更大一点”，而是第一次把医疗机器人带到跨 embodiment 的数量级。

### 训练超参数（GR00T-H）

| 参数 | 数值 |
|---|---|
| 初始化 | nvidia/GR00T-N1.6-3B |
| Frozen backbone | false |
| Action horizon | 50 |
| Image size | 224 × 392 |
| Optimizer | AdamW |
| Learning rate | 3e-5 |
| Weight decay | 1e-5 |
| LR schedule | Cosine decay |
| Warmup | 5% |
| Global batch size | 1024 |
| Training steps | 65,000 |
| 训练算力 | 32 × A100 80GB，约 1.5 天 |

### 数据增强与正则

- random crop：95%
- random rotation：5 度
- coarse pixel dropout：0.5
- color jitter：亮度 0.12、对比 0.15、饱和 0.15、色相 0.02
- multi-view dropout：0.25
- state dropout：100%

### 数据混合策略

GR00T-H 的 601 小时训练混合里，JHU dVRK-Si 占比最高（0.3498），CMR Versius 设上限后占 0.1920，其余还包括 Stanford dVRK、Obuda dVRK、Rob Surgical、Hamlyn dVRK 等多平台来源。这说明作者不是单纯追求“大一统池子”，而是刻意做平台去偏置。

## 实验结果

### 1. 端到端缝合：GR00T-H 是唯一跑完全流程的模型

SutureBot 任务被拆成：

- needle-pickup
- handover
- throw
- extraction
- knot-tying

每种 setup 下，GR00T-N1.6、GR00T-H、ACT 各尝试一次；LingBot-VA 单独 session 评测。

| 模型 | 完整端到端完成数 / 20 | 完成率 |
|---|---:|---:|
| GR00T-H | 5/20 | 25% |
| ACT | 0/20 | 0% |
| GR00T-N1.6 | 0/20 | 0% |
| LingBot-VA | 0/20 | 0% |

中间阶段更能看出差距：

- GR00T-H 在 pickup 和 handover 阶段保持 20/20
- 到 throw 阶段仍保留 12/20
- ACT 与 GR00T-N1.6 在 throw 阶段都只剩 4/20
- LingBot-VA 仅 1/20

这说明 Open-H post-training 的价值，不只是单步动作更准，而是长时序误差积累更慢。

### 2. OOD 泛化：未见 wound 配置和光照下，GR00T-H 平均成功率 54%

| 模型 | OOD 三子任务平均成功率 |
|---|---:|
| GR00T-H | 54% |
| GR00T-N1.6 | 30% |
| ACT | 5% |

细项上：

- Pick Up + Handover：70% vs 40%（GR00T-H vs GR00T-N1.6）
- Throw + Extract：42.5% vs 5%
- Knot-tying：GR00T-N1.6 50%，GR00T-H 45%，两者接近

这说明医疗后训练尤其增强了视觉分布偏移下的鲁棒性，但不同子技能收益并不完全均匀。

### 3. 数据效率：少量微调数据下，GR00T-H 已接近 ACT；满数据后明显拉开

作者把下游微调数据设成两档：

- 33%（约 2 小时）
- 100%（约 6 小时）

| 模型 | 33% 微调数据 | 100% 微调数据 |
|---|---:|---:|
| GR00T-H | ~47% | ~73% |
| ACT | ~47% | ~50% |
| GR00T-N1.6 | ~20% | ~37% |

结论非常明确：

- 在小样本阶段，GR00T-H 已经追平 ACT
- 数据一多，GR00T-H 继续上涨，而 ACT 增益更有限

这说明 Open-H post-training 不只是“暖启动”，更像让模型获得了更可扩展的医疗先验。

### 4. 多平台迁移：跨 dVRK-Si、Versius、MIRA 都显著优于 base model

作者把 GR00T-H 与 GR00T-N1.6 在三种系统上比较：

- dVRK-Si
- CMR Versius
- Virtual Incision MIRA

并报告 overall average 提升具有统计显著性：`p < 0.001`。

虽然正文没有把所有逐项数值都写成表格，但结论已经很强：Open-H post-training 带来的改进不是只在单平台成立，而是跨 embodiment 成立。

### 5. 离体真实组织实验：29 个子任务平均成功率约 64%

作者在 skin-on pork belly 上做 ex vivo suturing，完整序列共有 29 个 subtasks，涵盖：

- needle manipulation
- wound opening
- suture passing
- knot tying
- suture cutting

| 任务设置 | 结果 |
|---|---|
| 总评测数 | 29 subtasks × 每项 10 次 = 290 次 |
| 整体平均成功率 | ~64% |
| 表现最好 | needle pickup 10/10；多次 handover 9/10、10/10；set-down needle 10/10；三步 knot tying 均 10/10 |
| 主要失败点 | readjust 4/10、open wound 4/10、部分 wrapping 4/10、grab suture tail 最低到 3/10、cut suture 两步仅 2/10 和 3/10 |

作者的解释也很合理：模型在结构化 manipulation primitive 上非常强，但在细致接触、组织交互、快速切割这些高精度步骤上还不够稳。

### 6. 世界模型：C-H-S-S 在 72 帧 rollout 上保持可用视觉一致性

作者用 held-out 25 个 Open-H 数据集做 open-loop replay，对 72 帧自回归生成结果用：

- L1
- SSIM

进行评价。

结论是：

- benchtop 场景 L1 更低、SSIM 更高，生成更稳定
- tissue-based 场景误差更大、seed 间方差更高
- 但 chunk 边界 sawtooth 效应较轻，说明跨 chunk 场景状态保持尚可

这里没有一个“单数字冠军”，但结论足够清楚：多平台 action-conditioned surgical world model 已经可行，只是复杂组织场景仍更难建模。

## 这篇论文最重要的发现

### 1. 医疗机器人也开始出现 foundation model scaling 迹象

GR00T-H 相对 base model 在长时序、OOD、少样本、多平台上都更强，这很像通用机器人过去几年看到的那条规律：数据多样性和多 embodiment 共享，真的能换来迁移收益。

### 2. 真正缺的不是“再做一个 policy”，而是“可复用的数据底座”

Open-H 的最大贡献不是某个单项指标，而是让领域第一次拥有类似 Open-X-Embodiment 的共享基础设施。今后别人可以在其上训练：

- policy
- world model
- visual encoder
- language-conditioned planner

### 3. 医疗后训练对现实世界硬件漂移也有帮助

讨论部分提到，评测期间器械磨损和相机替换造成硬件漂移，ACT 在这种变化下性能低于既有报告，而 GR00T-H 仍维持 25% 端到端完成率。这说明多样数据可能不仅提升泛化，也提升对设备老化的容忍度。

## 消融与局限

### 消融

原文没有传统意义上极细颗粒度的模块消融，例如：

- 去掉 multi-embodiment 数据会怎样
- 不使用 configuration-specific action heads 会怎样
- 不做 relative EEF normalization 会怎样
- Versius cap=20% 改成不封顶会怎样

作者更多给的是“比较实验”而不是“组件消融”。因此严格说，原文消融不充分。

### 局限

作者在 Discussion 里写得很坦率，核心限制包括：

1. 端到端能力仍远未达到临床可用
   - SutureBot 端到端只有 25%
   - ex vivo 全 29 步平均也只有 64%

2. 评测仍在受控环境
   - 主要是 tissue phantom、bench、ex vivo
   - 对 live tissue、出血、运动、患者扰动的表现未知

3. 缺少异常检测与安全应对
   - 不能处理 tissue tearing、instrument failure、patient movement 等关键风险

4. 失败集中在 fine-contact 与 cutting
   - 说明数据和控制策略在精细接触上仍明显不足

5. 世界模型评测指标仍不理想
   - L1/SSIM 只能衡量像素保真，不能充分评价器械位置与 tool-tissue interaction 物理合理性

6. 数据偏成功案例
   - failure trajectories 不足，不利于训练更真实的手术世界模型

## Lighthouse 结论

这篇论文最值得重视的，不只是 GR00T-H 在 SutureBot 上赢了 ACT，而是医疗机器人终于开始拥有“foundation model 级基础设施”——大规模、跨平台、可公开共享的数据与模型底座。

如果你做医疗机器人，这篇论文的启示非常明确：

- 先别只盯某个手术子任务 SOTA
- 真正决定行业上限的，是跨机构、跨 embodiment、跨环境的数据基础设施
- 在这个基础上，VLA 与 world model 才可能像通用机器人那样出现持续复利

当然，距离临床 автономy 还很远；但这篇论文至少把“为什么过去一直远”和“下一步该往哪投资源”都说清楚了。