---
title: "Google DeepMind Decoupled DiLoCo 深读：把大模型训练从同生共死，改造成可容错的跨数据中心系统"
description: "Decoupled DiLoCo, Google DeepMind, distributed training, DiLoCo, Pathways, fault tolerance, bandwidth, convergence"
---

# Decoupled DiLoCo: Resilient, Distributed AI Training at Scale

> 原文链接：https://deepmind.google/blog/decoupled-diloco/
> 技术报告：https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/decoupled-diloco-a-new-frontier-for-resilient-distributed-ai-training/decoupled-diloco-for-resilient-distributed-pre-training.pdf
> 来源：Google DeepMind
> 发布日期：2026-04-23

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Google DeepMind 想把前沿模型训练从“所有芯片必须同时跟上”的单体同步模式，改造成“分岛训练、异步汇总、局部故障不拖垮全局”的可容错分布式系统。 |
| 大白话版 | 以前一块机房里有一台机器掉链子，整场训练都得等；现在把训练拆成多个 learner island，各自先跑，中央 syncer 只收够最小法定人数就继续推进。 |
| 核心创新 | learner/syncer 双层架构、最小法定人数 quorum、adaptive grace window、自愈式 rejoin、token-weighted merge、基于 Pathways 的异步数据流。 |
| 与传统同步训练区别 | 不再每步全局同步；优先 availability 和 partition tolerance，而不是把 consistency 放到绝对第一。 |
| 与原版 DiLoCo 区别 | 原版/streaming DiLoCo 主要解决低通信，但仍有 lock-step 同步约束；Decoupled DiLoCo 进一步把 learner 彼此彻底解耦。 |
| 关键数字 | 原文图示给出：8 个数据中心下所需带宽从 198 Gbps 降到 0.84 Gbps；1.2M 芯片失效率模拟下 goodput 约 88% vs 传统 27%；12B 模型跨 4 个美国区域用 2-5 Gbps WAN 完成训练，速度比传统同步方法快 20 倍以上。 |
| 价值评级 | A=基础设施级必读 |
| 适用场景 | 跨地域训练、算力碎片回收、混合硬件代际训练、主权 AI/多园区部署、故障率随规模上升的大规模 pretraining。 |

## 这篇文章真正回答了什么问题

Google 这篇文章不是在讨论“怎样把训练再提速 3%”，而是在回答一个越来越现实的问题：

当前大模型训练默认假设是 SPMD 风格的强同步集群，也就是：
- 大量相同芯片
- 高质量、低延迟互联
- 所有人按同一个节拍前进
- 任意一处故障都会影响全局 step

这个范式在单园区、强网络、强运维条件下很好用，但模型越大、训练越久、部署园区越分散，这个假设就越脆弱。芯片数量一上去，局部故障就不是“小概率事件”，而是常态化事件。

DeepMind 的判断非常直接：未来训练系统的核心瓶颈，已经不只是 FLOPs 不够，而是“同步耦合过强”。

## 原文的核心主张

原文把 Decoupled DiLoCo 定义成一种更 resilient、more flexible 的大规模训练架构。它建立在两条旧路线之上：

1. Pathways：提供异步分布式数据流与更松耦合的系统思路
2. DiLoCo：证明低通信训练可以显著降低跨数据中心带宽需求

但这次 Google 不是简单延续 DiLoCo，而是往前再走一步：

- 以前 DiLoCo 解决的是“少通信”
- 这次 Decoupled DiLoCo 解决的是“少同步”

这两个目标听起来接近，实际上不是一回事。

少通信，意味着你不必每一步都交换全部参数。
少同步，意味着即使某一组机器慢了、挂了、网络抖了，其他组也不用停下来等。

真正让 Decoupled DiLoCo 值得深读的，就是它把后者做成了训练系统的默认能力。

## 架构拆解：它到底怎么工作

### 1. 从一个大集群，拆成多个 learner islands

在传统 data-parallel / SPMD 训练里，外层是一个全局同步的大作业。所有副本每一步都得参加梯度聚合。

Decoupled DiLoCo 则把全局计算拆成多个独立 learner。每个 learner 都像一个缩小版训练作业：
- 有自己的数据分片
- 有自己的本地参数副本
- 用自己的 inner optimizer 持续做本地更新
- 不等待别的 learner 进入同一步

这就是所谓的 decoupled islands of compute。

最关键的一点不是“多 learner”，而是 learner 之间没有直接强同步依赖。一个 learner 慢了，别的 learner 不需要陪它卡住。

### 2. 中间加一个轻量中央 syncer

既然 learner 不再彼此每步同步，就需要一个新的协调者。Google 给出的角色是 syncer：
- 维护全局参数片段与 outer optimizer 状态
- 异步接收 learner 发来的参数 fragment / metadata
- 达到一定条件后执行 outer merge
- 再把更新后的 fragment 异步发回 learner

它本质上有点像参数服务器，但不是老式 parameter server 的简单复刻，而是为 DiLoCo 的外层优化专门设计的异步协调层。

原论文里进一步说明：
- learner 跑在 TPU 侧
- syncer 运行在 CPU-only 资源上
- syncer 做的是参数与 optimizer state 管理，不负责重型激活计算
- 因而故障面更小，成本也更低

这点很重要。Google 不是把复杂性全塞回 GPU/TPU 侧，而是故意把“协调”从“计算”里剥离出来。

### 3. 参数不是整块同步，而是分 fragment 流水传输

Decoupled DiLoCo 继承了 Streaming DiLoCo 的关键做法：
- 把模型参数切成多个 fragment
- 每次只同步其中一块
- 同步与计算尽量重叠

这样做的收益有两个：

第一，峰值带宽被显著压低。
以前是某个同步点需要一口气交换大量参数；现在是每步只处理一个 fragment，通信更平滑。

第二，通信更容易被隐藏在计算期间。
如果同步时间能塞进后续若干步计算窗口里，那么 WAN 延迟就不会直接变成全局阻塞。

### 4. 论文里给出的关键实现参数，不只是概念图

技术报告最有价值的一点，是它没有只停在架构示意图，而是给了具体工程设定。默认实验里：

- 模型被切成 P=24 个 fragments
- 每个 fragment 每 H=24 步同步一次
- 通信与训练重叠 tau=2 步，相当于双缓冲
- 默认最小 quorum 取 K=1
- grace window 最多可延长到约 1 个 step

这组参数背后的含义很明确：

- 不是每一步全量同步，而是把同步摊薄到 fragment 流水线上
- syncer 的等待上限必须被后续计算窗口吃掉
- quorum 可以极低，但质量问题再靠自适应等待和加权 merge 拉回来

另外，论文还强调了两个很工程化但非常关键的细节：

1. balanced tensor fragmentation
不是按层粗暴切块，而是用类似 greedy bin-packing 的方式把张量打包成大小更均衡的 fragments，既保模型质量，也压峰值带宽。

2. Radial-Directional Averaging, RDA
他们没有直接对 outer gradients 做朴素平均，而是把“方向”和“范数”拆开处理，以提升多 learner 异步聚合下的超参稳定性。

这说明 Decoupled DiLoCo 不是一句“异步训练”就结束，而是一整套 system + optimizer co-design。

## 它和传统同步训练到底差在哪

### 传统同步训练：强一致性优先

传统 data-parallel / SPMD 的逻辑是：
- 每一步都有统一全局视图
- 所有人看到相同权重
- 一个人掉队，大家都等
- 一处失败，可能整个 step 重来或整个 job 重配

优点是算法语义很干净，系统假设也简单。
缺点是规模一大，系统把最慢节点、最坏链路、最脆弱机架都暴露成全局瓶颈。

### Decoupled DiLoCo：可用性优先

DeepMind 在技术报告里甚至用了类似 CAP 的表达来重新框定 pretraining：
- Consistency：所有设备保持全局一致权重视图
- Availability：有故障时训练还能继续
- Partition tolerance：链路不稳、地域分散时系统还能工作

他们的结论是，传统 SPMD 过度偏向 consistency；而 Decoupled DiLoCo 则主动把 availability 与 partition tolerance 提到更高优先级。

这是一种很典型的基础设施视角转向：
不是先问“每一步是否绝对一致”，而是先问“在真实世界大规模故障条件下，训练有没有持续产出有效学习”。

## 它和原版 DiLoCo 的区别，不能只理解成“异步版”

很多人看到名字会以为：Decoupled DiLoCo = DiLoCo + async。

这只对了一半。

### 原版 DiLoCo 的价值

原版 DiLoCo 的核心是 low-communication：
- learner 先做多步本地优化
- 隔一段时间才做外层权重/参数空间上的同步
- 从而把跨站点通信需求大幅降下来

这已经非常关键，因为它让跨数据中心训练第一次在带宽上变得现实。

### 但原版/streaming DiLoCo 仍保留了 lock-step 约束

技术报告讲得很清楚：即使是 streaming DiLoCo，虽然通信可以跨步重叠，但 learner 之间总体上还是 lock-step 的。

也就是说：
- 通信更省了
- 但系统仍可能被 straggler 或故障 learner 拖住

### Decoupled DiLoCo 的本质升级

它新增的不是“小优化”，而是架构层切换：
- learner 不再要求并步前进
- syncer 不等全员到齐
- 故障 learner 可以暂时缺席
- 恢复后还能无缝重新并入全局轨迹

所以更准确的理解是：
DiLoCo 解决“跨站训练太贵”；
Decoupled DiLoCo 解决“跨站训练虽然便宜了，但仍然太脆”。

## 容错机制：这篇文章最该看的部分

### 1. minimum quorum：不等全员，只等够用的人

syncer 在做一次 fragment 聚合时，不要求所有 learner 都报告成功，只要求至少有 K 个 learner 到场。

这意味着：
- 某个 learner 离线，不会阻断全局训练
- 某个 learner 变慢，不会把所有人都拖进 idle
- 系统可以在部分缺席状态下继续前进

这是 Decoupled DiLoCo 能从“低通信方法”变成“容错系统”的第一个支点。

### 2. adaptive grace window：在不阻塞的前提下，多等一小会儿

如果只看 minimum quorum，很容易担心另一个问题：
“那 syncer 会不会老是只收到 1 个 learner 的更新，导致外层更新噪声太大？”

Google 的做法是 adaptive grace window：
- 先满足最小 quorum
- 如果当前通信窗口还有 slack，就再等一小段自适应时间
- 尽量把更多 learner 的更新纳入本次 merge
- 但整个等待上限必须落在可被计算重叠隐藏的窗口内

这实际上就是在系统层做一个精细权衡：
- 太早合并，收敛样本不足
- 太晚合并，会重新引入阻塞

所以它不是盲目追求最小等待，而是在“不卡住训练”的前提下，尽量提高每次同步的样本效率。

### 3. token-weighted merge：快 learner 贡献更大，但不是无脑偏置

异步系统会天然出现速度差：
- 快 learner 在一次同步间隔里处理更多 token
- 慢 learner 可能刚从故障中恢复

如果简单平均，不同 learner 的有效训练贡献会被错误对待。

因此论文里使用了基于 step/token 统计的动态加权 merge。直觉上：
- 处理了更多 token 的 learner 应该更有份量
- 但如果它为此跨了太多本地 step，更新“新鲜度/质量”又不能无脑视为最好

Google 进一步配合 Radial-Directional Averaging 来稳定 outer merge，目的是降低异步、多 learner 场景下的超参脆弱性。

### 4. self-healing：掉线 learner 可恢复并重新加入

原文明确提到，他们用 chaos engineering 人为注入硬件故障，结果是：
- learner unit 整块失效后，其他 learner 继续训练
- 失效 learner 恢复上线后，可以重新并入训练

这点很关键。很多系统说自己“容错”，本质只是“出事后能重启”；Decoupled DiLoCo 强调的是“局部坏掉期间，全局不中断，回来后还能接着融回去”。

这才是真正面向超大规模、长时长训练的 resilience。

## 带宽与收敛：DeepMind 这次最聪明的取舍

这类系统最容易被质疑的地方只有两个：
1. 带宽是不是确实降了
2. 训练质量是不是偷偷掉了

Google 这次正面给了两组回答。

### 带宽侧：从“专线级奢侈品”降到“互联网级可操作”

原文图示中，8 个数据中心场景下：
- 传统 data-parallel 所需带宽约 198 Gbps
- DiLoCo/Decoupled DiLoCo 路线约 0.84 Gbps

这不是普通优化，而是数量级级别的变化。

更重要的是，他们还给了一个真实跨区域实验：
- 12B 参数模型
- 跨 4 个美国区域训练
- 使用 2-5 Gbps 的 wide-area networking
- 训练速度比传统同步方法快 20 倍以上

这句话的战略含义非常大。
它等于在说：以后跨区域训练未必要等定制化高带宽基础设施先修好，现有数据中心间相对可获得的网络条件也能开始承载生产级预训练。

### 收敛/质量侧：不是零代价，但论文给出的结论是“可比”

Google 的说法不是“更好”，而是更克制的“equalled / comparable”。

从博客和技术报告里能看到几层证据：
- Gemma 4 相关实验中，Decoupled DiLoCo 的 benchmark 表现与常规训练相当
- dense 与 MoE 架构都做了实验
- text 与 vision benchmark 都覆盖到了
- 规模往上走到 9B dense、3.8B activated MoE 时，仍保持可比表现

这说明它的卖点并不是让模型更聪明，而是在“工程条件更恶劣”的前提下，尽量不牺牲最终模型质量。

### 真正的 trade-off 在哪

如果用一句话概括权衡关系，那就是：
Decoupled DiLoCo 用更弱的一致性，换更强的可用性和更低的 WAN 带宽门槛；再通过 quorum、grace window、weighted merge 等机制，把收敛损失尽量压回去。

所以它不是“没有代价”，而是“把代价从同步停顿和网络豪华配置，转移到更复杂的异步协调算法与系统设计上”。

这对 Google 这种有 Pathways、TPU、自研调度基础的大厂来说是很合理的交换。

## 为什么 goodput 比吞吐更重要

这篇文章反复强调一个词：goodput。

原因很简单：
在大规模训练里，账单按总机器时间算，但真正有价值的是“多少时间在做有效学习”。

如果一个系统理论吞吐很高，但频繁因为故障、重配、同步等待而闲着，那么它的经济性会快速恶化。

技术报告里的模拟结果非常直观：
- 在 1.2M 芯片、MTBI per chip 设为 1 年的高故障压力模拟下
- 无弹性 data-parallel goodput 约 27%
- 带弹性的 data-parallel goodput 约 58%
- Decoupled DiLoCo 在 M=8 learner 时 goodput 约 88%
- 同一设置下，M=8 与 M=16 的系统 uptime 基本可到 100%

也就是说，它不只是比“完全刚性”的同步训练好，也显著强于已经加入 elasticity 的 data-parallel 基线。

这也是为什么 Google 把焦点从 MFU/step speed 部分转向 availability-first training。

对未来超大规模 pretraining 来说，真正昂贵的不是某一步慢 5%，而是整群机器经常一起等。

## 潜在适用场景：哪些地方会最先需要它

### 1. 跨地域数据中心联合训练

这是最直接的落地场景。
当算力分散在多个区域、多个园区甚至多个司法辖区时，强同步训练会迅速变得不现实。Decoupled DiLoCo 则天然适合把这些分散资源编成一个更松耦合的训练系统。

### 2. 主权 AI / 区域合规部署

未来越来越多国家和大企业不会接受“所有训练都在单一超大园区”这个设定。合规、主权、能源、电价、地理冗余都会推动多地部署。

Decoupled DiLoCo 的价值就在于：它不是把多地部署当灾备，而是把多地部署直接纳入训练主路径。

### 3. 算力碎片回收与 scavenging

技术报告专门讨论了 scavenging：
把临时可用、位置分散、带宽有限的额外计算资源动态并入训练。

这很像云时代的“捡漏算力”能力。对拥有大量分散资源的大厂来说，这可能比单纯追求最整齐的集群更经济。

### 4. 混合硬件代际训练

Google 明确展示了跨 TPU 代际的实验能力。原文点名提到 TPU v6e 与 TPU v5p，技术报告里也做了异构速度差实验。

这意味着未来训练系统不必再坚持“所有芯片同代、同速、同配置”这一理想条件。旧硬件不只是做边角料推理，也可以重新参与训练主流程。

### 5. 故障已成常态的超大规模 pretraining

当训练规模继续上升，局部失败概率几乎必然继续上升。此时最有价值的系统，不是“理论最整齐”的系统，而是“故障本来就会发生，也不至于全局停摆”的系统。

从这个角度看，Decoupled DiLoCo 更像是为下一阶段训练规模提前修路。

## 仍然要保留的三个技术疑问

Google 这次给的证据已经比普通博客扎实，但离“行业公认定论”还有几步。

### 1. 真实 frontier 规模还没有完全公开

论文主实验覆盖到 9B dense、3.8B activated MoE，以及一个跨区域的 12B 真实分布式实验。这已经足够说明方法成立，但还不能直接等价成“数千亿到万亿级训练也已完全验证”。

### 2. 系统复杂度被转移，而不是消失

同步阻塞少了，不代表复杂度少了。相反，复杂度从全局 barrier 转移到了：
- fragment 调度
- syncer 状态管理
- recovery 协议
- 异步 merge 稳定性
- 各类 clock / quorum / grace window 超参

对 Google 这种有 Pathways 和 TPU 全栈控制力的团队来说，这个复杂度可管理；对普通团队来说，门槛并不低。

### 3. 开源可复现性仍有限

目前官方给了博客与 PDF，但没有同步放出一套社区可直接复用的完整训练栈。也就是说，这更像一篇“Google 内部训练基础设施方向公开”，而不是一个大家明天就能一键复现的工业方案。

## 这篇文章最值得记住的 5 个判断

1. Google 正在把大模型训练的核心目标，从“全局强同步”改写成“高 goodput 的持续学习”。
2. Decoupled DiLoCo 真正的新意不只是 low-communication，而是把 learner 之间的 lock-step 彻底打散。
3. minimum quorum + adaptive grace window 是这套系统的灵魂：一个保可用性，一个保样本效率。
4. 带宽门槛的下降不是线性优化，而是数量级变化，这让跨数据中心训练第一次更接近工程常态。
5. 这套范式最重要的长期价值，不是让今天的单园区训练更快，而是让未来分布式、异构、跨区域的训练成为默认可能。

## Lighthouse 结论

如果只看表面，Decoupled DiLoCo 像是一篇“分布式训练新方法”文章；但更准确地说，它是在重写前沿训练基础设施的默认假设。

过去十年，大模型训练系统的主旋律一直是：
把更多芯片绑得更紧。

DeepMind 这次给出的方向是：
当规模继续扩大时，更合理的路可能不是继续把所有东西绑得更紧，而是承认网络、硬件、地域和故障的真实世界约束，然后让系统在这些约束下依然能稳定学习。

这不是对同步训练的彻底替代，而更像是一个明确的信号：
当前沿训练走向跨园区、跨区域、跨代际硬件时，availability-first 很可能会从“高级选项”变成“基础要求”。
