---
title: "深度解读 | Z.ai《Scaling Pain》：GLM-5 的瓶颈不再是模型分数，而是高负载下 KV Cache 一致性"
description: "Z.ai, GLM-5, Scaling Pain, Coding Agent Serving, KV Cache, PD disaggregation, HiCache, LayerSplit"
---

# 深度解读 | Z.ai《Scaling Pain》：GLM-5 的瓶颈不再是模型分数，而是高负载下 KV Cache 一致性

> 2026-05-02 · 深度解读 · 编辑：Lighthouse
>
> 已核验原始信源：
> 1. Z.ai 官方技术博客：https://z.ai/blog/scaling-pain
>
> 核对说明：已通读官方博客全文。本文只依据原文给出的系统设计、故障现象、修复路径与性能数字整理分析，不引入未经原文确认的额外技术细节。

## 速查卡

| 维度 | 结论 |
|---|---|
| 这是什么 | 一篇罕见把大模型线上推理事故“摊开讲”的官方工程复盘。 |
| 一句话总结 | GLM-5 在长上下文 Coding Agent 高并发服务里出现乱码、重复和罕见字符，根因不是模型退化，而是推理基础设施中的 KV Cache 状态一致性 bug。 |
| 大白话版 | 模型本身没“变笨”，是服务器在极端负载下把某个请求的记忆块写乱了，后面的请求读到了脏数据，于是输出开始抽风。 |
| 最关键数字 | 每天数亿次 Coding Agent 调用；离线压测下约每 1 万请求出现 3-5 个异常；修复第一个 bug 后异常率从约 0.1% 降到 0.03% 以下；LayerSplit 在 40K-120K 上下文、90% cache hit 下带来 10%-132% 吞吐提升。 |
| 价值评级 | A — 这不是普通“优化日志”，而是前沿 agent serving 进入系统正确性时代的信号。 |
| 适合谁读 | 做大模型推理平台、长上下文服务、KV Cache / speculative decoding / agent infra 的工程团队。 |

## 一、先说结论：这篇文章最重要的，不是“修了几个 bug”，而是它承认了一个现实

过去大家讨论大模型线上稳定性，常用的话术还是“模型能力”“量化损失”“上下文退化”“benchmark 不够稳”。Z.ai 这篇文章最有价值的地方，是它公开承认：当应用形态从聊天转向长时 Coding Agent 后，真正让输出变坏的东西，可能根本不是模型权重，而是推理基础设施里那些在低负载下看不见、在高负载下才爆炸的状态一致性问题。

这等于把行业讨论重心从“模型是否足够强”推进到了“系统是否足够正确”。

原文给出的背景很明确：GLM-5 系列每天承受数亿次 Coding Agent 调用，随着任务从短对话升级为长上下文、长生命周期、多请求并发的 agent workload，团队在 3 月以来陆续观察到三类异常输出：

1. garbled output（乱码/错乱输出）
2. repetition（重复生成）
3. rare-character generation（罕见字符生成）

这些症状的诡异之处在于：平常推理设置下不出现，只在高并发、长上下文 Coding Agent 场景中出现，而且很难稳定复现。这就意味着问题不是“模型天生不会”，而是“系统在压力下偶发性读错状态”。

## 二、为什么这篇复盘值得当 A 级深读

因为它揭示了 frontier inference 的下一层难题：

- 传统指标如 throughput、latency、availability 已经不够；
- 在 agent 场景里，系统还必须保证 generation 背后的 model state 始终正确；
- 一旦 KV Cache、跨节点传输、异步取消、分层缓存这些基础设施组件出现微小乱序，最终表现出来的不是 500 错，而是“模型像中邪一样输出错误内容”。

这类错误比服务宕机更危险。宕机大家知道重试，输出错乱则更容易被误判成模型能力退化，甚至被下游 agent 当成正常推理结果继续执行。

换句话说，长时 agent 的真正门槛不是“能不能跑”，而是“跑出来的每一步是不是基于正确状态”。

## 三、完整内容还原：Z.ai 到底发现了什么

## 1. 从“离线复现不了”到“终于找到可观测信号”

团队一开始的判断逻辑很干净：

- 如果问题来自模型本身，那么特定输入应当稳定复现；
- 如果问题和系统压力或运行时状态相关，那就更像推理基础设施 bug。

他们先把用户坏样本拿到本地反复跑几百次，完全复现不出来。这一步非常关键，因为它初步排除了“模型本身坏掉”的可能。

随后团队做了三件事：

1. 对生产日志做匿名化处理，但尽量保留原始并发分布和请求时序；
2. 在本地做全量回放；
3. 继续调高负载，尤其是调 Prefill/Decode 解耦比例，并模拟高峰期 Prefill backlog 与 Decode 侧 KV Cache 压力。

直到把系统压到更接近线上极限状态，异常才开始出现：离线环境下大约每 1 万请求能复现 3-5 个异常输出。

这里有个很重要的推理链：

- 异常与请求内容无关；
- 异常与系统压力显著相关；
- 所以根因更可能在高负载下的 inference-state management。

但仅仅能复现还不够，团队还遇到第二个痛点：怎么自动检测异常。

重复输出相对容易抓；乱码和罕见字符则很难。正则、字符集匹配会有大量误报漏报，模型分类器又太贵，不适合大规模 ablation。

最后他们发现了一个非常妙的切口：speculative decoding 指标。

### 为什么 speculative decoding 指标能当异常监控器

Speculative decoding 本来是性能优化：

草稿模型提候选 token → 目标模型验证并接受一部分 → 在不改变最终输出分布的前提下加速解码。

但 Z.ai 发现，异常发生时两个指标会出现稳定模式：

1. spec_accept_length 极低：草稿模型提的 token 基本都被目标模型拒绝。
2. spec_accept_rate 极高：生成陷入高置信度重复循环。

原文解释得很直接：

- 极低的 accept length 往往意味着目标模型的 KV Cache 状态和草稿模型严重不一致；
- 极高的 accept rate 则可能意味着注意力模式已经退化到重复自循环。

于是团队把 speculative decoding 从“加速工具”升级成了“实时质量监控器”：

- 当生成超过 128 token 后，若 spec_accept_length 持续低于 1.4；
- 或 spec_accept_rate 高于 0.96；
- 系统就主动终止当前 generation，并把请求交回 load balancer 重试。

这是全文第一个真正让我眼前一亮的点：性能指标被反向用作正确性探针。

## 2. Bug Fix #1：PD Disaggregation 下的 KV Cache 回收竞争

第一类根因出现在 Prefill-Decode 解耦架构里。

### 2.1 发生了什么

为了控制 tail latency，推理引擎引入了 timeout abort：

- 如果 Prefill 阶段在时间预算内没完成；
- Decode 就中止请求，并回收其 KV Cache 资源。

问题在于：

- abort 信号没有被正确传播到 Prefill 侧；
- Decode 也不知道 KV Cache 是否已经可以安全回收；
- 于是 Decode 把某请求的 KV Cache 空间释放并重新分配给新请求后，旧请求尚未完成的 RDMA 写入和 Prefill 计算仍可能继续执行。

这就出现了典型的“幽灵写入”：

1. Req1 被派到 Prefill-1 和 Decode；
2. 因排队太久，Decode 超时 abort Req1；
3. Decode 回收 Req1 的 KV Cache 地址；
4. Req2 到来并拿到了同一段 GPU KV Cache 地址；
5. Req2 正常开始 Prefill/Decode；
6. 但 Req1 旧的 RDMA 写入还在飞；
7. 这些延迟到达的写入覆盖了已分配给 Req2 的 KV Cache；
8. Req2 在 decode 时读到被污染的 KV Cache，于是输出异常。

这就是一个标准 race condition：逻辑上“请求已经死了”，物理上“旧写入还没停”。

### 2.2 修复思路：给 KV Cache 回收加时间一致性约束

修法并不玄学，核心就是在 abort 与 reclaim 之间插入显式同步。

Decode 发出 abort 后：

- 通知 Prefill；
- 只有当 Prefill 确认两种情况之一时，才允许回收：
  1. 根本没有发起 RDMA 写入；
  2. 之前发起的写入已全部完成。

Decode 必须在收到 safe-to-reclaim 信号后，才能回收和复用对应 KV Cache slot。

这本质上是把“资源生命周期”和“异步写入生命周期”重新绑定。

### 2.3 修复效果

原文给出了明确数字：

- 修复前异常率约 0.1%；
- 修复后降到 0.03% 以下。

这说明第一个 bug 就吃掉了相当大一部分线上异常。

## 3. Bug Fix #2：HiCache 里缺失 load-use ordering

第二个 bug 更隐蔽，出在 HiCache。

原文强调 Coding Agent 任务的两个结构特征：

- 平均输入长度超过 70K token；
- prefix reuse rate 很高。

所以分层 KV Cache（HiCache）是生产环境里的关键优化。问题在于，它的 DSA 版实现为了追求性能，让 CPU swap-in 与计算重叠，却没有保证“数据先到，计算后用”。

### 3.1 根因：读到了还没准备好的 KV Cache

系统里有两个 stream：

- Load Stream：加载 KV Cache 和 Indexer cache；
- Forward Stream：做 index computation 和 sparse attention。

理想顺序应该是：

先 load 完 Indexer cache → 再启动 Indexer kernel。

但旧实现中，这个依赖没有显式同步，于是可能发生：

- Forward Stream 先跑；
- Load Stream 还没把数据搬完；
- Indexer kernel 读到了 incomplete / uninitialized 的 KV Cache；
- 后续 sparse attention 继续在脏状态上运行；
- 最终又回到异常输出。

这就是 read-before-ready。

### 3.2 修法：把“读之前必须写完”变成硬约束

Z.ai 的修复方式很工程化：

- 在 Indexer kernel 启动前插入与 Load Stream 的显式同步点；
- 只有对应层级的 Indexer cache fully loaded 后，Forward Stream 才允许继续。

原文把它叫做在 kernel pipeline 中强制 atomicity。翻成人话就是：不要再靠“应该差不多已经好了”这种隐含假设，直接用同步把正确性钉死。

修完后，在相同 workload 条件下，这类由执行顺序不一致导致的异常被消除。并且该修复已经向 SGLang 社区提交 Pull Request #22811。

这也是这篇文章的第二个重要信号：前沿模型厂不是只在自家闭门修，而是开始把核心修复往开源 serving stack 反哺。

## 4. 修完 bug 还不够：他们顺手优化了真正瓶颈——Prefill

文章没有停在“问题修好了”，而是继续追问：既然两个 race condition 暴露出的共同瓶颈都是 Prefill，那能不能顺手把瓶颈本身优化掉？

答案就是 LayerSplit。

### 4.1 为什么 Prefill 成了长上下文 Coding Agent 的真正瓶颈

长上下文 + 高 prefix hit rate 的 workload 下，Prefill 是主导项。为了提升 Prefill，生产系统往往采用 Context Parallelism（CP）。

但原文指出，当前 SGLang 开源实现存在 redundant KV Cache storage：

- 每张 GPU 都存所有层的 KV Cache；
- 于是显存浪费很大；
- Prefill 侧 KV Cache 容量反过来卡住 GPU 利用率。

### 4.2 LayerSplit 在做什么

LayerSplit 的核心是 layer-wise KV Cache partitioning：

- 每张 GPU 不再保存所有层的 KV Cache；
- 只保存一部分层；
- 在执行时，由拥有该层 KV Cache 的 rank 向其他 CP rank 广播相应 cache；
- 同时把 KV Cache broadcast 与 indexer computation overlap，尽量把通信延迟藏在计算后面；
- 最终真正新增的主要通信负担只剩 indexer cache 广播，而其大小约为 KV Cache 的八分之一。

这套设计的直觉很清楚：

不是一味减少通信，而是用更便宜、更可隐藏的通信，换更大的显存释放和 Prefill 吞吐提升。

### 4.3 性能结果

在 90% cache hit、40K-120K context 长度下，原文给出的结果是：

- 吞吐提升范围 10%-132%；
- 上下文越长，收益越大。

这很重要，因为它说明这不是短 prompt benchmark 上的小修小补，而是正对 Coding Agent 这种长时负载做的结构性优化。

## 四、核心技术洞察：这篇文章真正讲的是“状态正确性”

如果把全文抽象成一个更底层的原则，我会归纳成三条：

### 1. Agent serving 的正确性约束，比普通聊天推理严格得多

聊天场景里，一个 token 错了，可能只是答得不太对；
agent 场景里，一个 token 错了，可能导致：

- 工具调用参数错误；
- 文件写错；
- 长链任务规划偏航；
- 后续数十轮上下文全部建立在脏状态上。

所以 agent serving 的核心不再只是快，而是“状态传播必须可信”。

### 2. 高负载下最危险的 bug，不是 crash，而是 silent corruption

两类问题都有这个共同点：

- 系统并没有显式报错；
- 请求看起来还能继续；
- 最终只是在输出层面体现为质量异常。

这类 silent corruption 比宕机更难排查，也更值得工程团队害怕。

### 3. 未来 frontier inference 的竞争，不只是模型和 GPU，而是系统一致性工程

当大家都进入长上下文、MoE、reasoning、agentic workload 时代，真正拉开差距的会越来越多地是：

- KV Cache 生命周期管理；
- 异步取消与跨节点传输协调；
- 分层缓存的数据就绪性；
- Prefill / Decode / CP / speculative decoding 的耦合设计；
- 以及用于在线发现异常的 observability 指标体系。

## 五、对 Lighthouse 最值得记住的三个判断

### 判断 1：推理系统 bug 已经能伪装成“模型降智”

标题里就把“Scaling Pain”说透了：随着规模上去，隐藏在基础设施里的假设会以 model-quality failure 的方式暴露出来。

这意味着以后看大模型“突然变笨”的讨论，不能只盯模型更新，还要盯 serving stack、缓存系统和高负载时序。

### 判断 2：speculative decoding 指标会从性能监控转向质量监控

这是最值得 infra 团队立刻借鉴的点。过去大家用它看加速效率，未来完全可以把 accept length / accept rate 之类指标纳入质量异常报警体系。

### 判断 3：长时 Coding Agent 的护城河正在往系统层转移

模型能力当然重要，但当调用规模进入“每天数亿次”、上下文长度进入“平均 70K+ token”的区间，谁能把 Prefill、KV Cache、一致性、并发调度、错误监控做稳，谁才有资格谈 agent 平台化。

## 六、局限性与保留意见

原文也有边界，不能神化。

### 1. 它给的是工程复盘，不是完整实验论文

我们能看到的主要是：

- 故障现象；
- 根因定位；
- 修复思路；
- 几个关键数字。

但对更完整的系统配置、硬件规模、负载分布、不同 bug 各自贡献占比，原文没有完全展开。

### 2. 0.03% 以下不等于问题彻底归零

文章给了显著下降，但没有说所有异常都由这两类问题解释完，也没给出更长时间窗口下的长期残余率。所以更准确的理解是：主要根因已被识别并大幅缓解，但不是“从此天下太平”。

### 3. LayerSplit 的收益依赖 workload 结构

90% cache hit、40K-120K context 本身就是非常偏 agent / long-context 的场景。对短上下文、低复用率任务，收益不一定同样夸张。

## 七、独立观察：为什么这篇文章比普通“优化博客”重要得多

我认为它的重要性至少有三层：

第一，它把大模型 infra 竞争从“谁 TPS 高”推到了“谁在高 TPS 下还能保持状态正确”。

第二，它说明中国大模型厂已经进入和海外 frontier labs 同样的系统工程阶段：不再只讲训练、参数和榜单，而是开始公开讨论 abort、RDMA、stream synchronization、KV Cache partitioning 这种真正贴近生产的底层问题。

第三，它为整个开源 serving 生态提了个醒：未来很多“模型质量问题”其实可能是 runtime 一致性问题，尤其在 agent 与 long-context 场景中。

## 八、结论

Z.ai 这篇《Scaling Pain》真正值得记住的一句话可以改写成：

当模型规模、上下文长度和 agent 负载一起上升时，推理系统中任何原本被默认成立的时序假设，都可能变成输出层面的质量事故。

因此，长时 Coding Agent 的下一阶段竞争，已经不是“谁先把模型做出来”，而是“谁能把模型背后的状态机守住”。

如果说训练侧的 Scaling Laws 推动了能力跃迁，那么这篇文章讲的是另一条同样重要的规律：只有系统工程的纪律性，才能把这种能力可靠地交付给真实世界。