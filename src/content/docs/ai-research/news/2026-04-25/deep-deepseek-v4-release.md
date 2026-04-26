---
title: "深度解读 | DeepSeek-V4 正式发布：这次不是旧闻续篇，而是 1M context 正式商用、V4-Flash 先行落地、华为云率先可见上架的新阶段"
description: "DeepSeek V4 Preview, 1M context, V4-Flash, V4-Pro, Huawei Cloud MaaS, DeepSeek technical report, long-context efficiency, agentic AI"
---

> 2026-04-25 · 深度解读 · 编辑：Lighthouse
>
> 已核验原始信源：
> 1. DeepSeek API Docs 官方发布页：https://api-docs.deepseek.com/news/news260424
> 2. Hugging Face 模型卡（V4-Pro）：https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro
> 3. Hugging Face 模型卡（V4-Flash）：https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash
> 4. Hugging Face 技术报告 PDF：https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/DeepSeek_V4.pdf
>
> 交叉验证信源：
> 5. 华为云帮助中心检索页（可见 DeepSeek-V4-Flash 已进入模型广场，版本 20260424，地域“西南-贵阳一”）：https://support.huaweicloud.com/topic/1437469-4-D
> 6. 华为云社区文章《查—算分离之后：DeepSeek V4技术演进与AI服务架构的一种可能》：https://bbs.huaweicloud.com/blogs/476712
>
> 去重说明：已实际检索 2026-04-11 至 2026-04-25 的 Lighthouse `deep-*.md` 与今日目录，未发现同名或同焦点文章。2026-04-05 已有 `deep-deepseek-v4-domestic-chip-priority.md`，但那篇讨论的是“发布前的国产芯片优先适配传闻/背景”；本文只聚焦 2026-04-24 的正式发布、1M context、V4-Flash 商业化定位，以及华为云侧的首批公开落地信息。

## 速查卡

| 维度 | 结论 |
|---|---|
| 这次新闻的本质 | 不是“DeepSeek 可能要发 V4”，而是 V4 已正式上线并开源，且把 1M context 从实验性能力变成了官方默认服务能力。 |
| 两个核心 SKU | DeepSeek-V4-Pro：1.6T 总参数、49B 激活参数；DeepSeek-V4-Flash：284B 总参数、13B 激活参数。 |
| 最重要的产品动作 | 官方宣布两款模型当日可用，`deepseek-chat` / `deepseek-reasoner` 开始并轨到 V4-Flash，对外 API 进入迁移期。 |
| 最重要的技术动作 | 技术报告给出明确证据：在 1M token 场景下，V4-Pro 单 token 推理 FLOPs 仅为 V3.2 的 27%，KV cache 仅为 10%。 |
| 为什么是新阶段 | 因为 DeepSeek 已把“长上下文 + agentic 能力 + 新 SKU 分层”一起做成正式产品，而不是预热口径。 |
| 华为云信号 | 华为云公开检索结果已出现 DeepSeek-V4-Flash 预置模型、版本号 20260424、区域“西南-贵阳一”；这意味着国产云侧不是只谈适配，而是开始出现可消费的服务化入口。 |
| 本文判断 | 这次发布真正改写的不是单榜成绩，而是中国开源大模型第一次把“1M 长上下文”做成默认供给，并且先用 Flash SKU 打开云上分发与成本普及。 |

## 一、先把边界说清：为什么这篇是“新阶段”，不是 4 月 5 日旧闻重写

4 月 5 日那轮讨论的核心，是“DeepSeek-V4 是否优先适配国产芯片、是否在发布前跳过英伟达优先联调”。那是供应链与生态前置动作。

4 月 24 日这次则完全不同，官方已经把三个关键信号一次性坐实：

1. DeepSeek-V4 Preview 正式 live；
2. V4-Pro 与 V4-Flash 两个 SKU 同步推出；
3. 1M context 不再是论文口号，而是官方服务默认标准；
4. 华为云侧已经出现 V4-Flash 的公开模型广场条目。

所以这次不能再写成“国产芯片优先”的延伸，而要把重点放回产品发布、技术效率、SKU 分层和云落地。

## 二、官方到底发布了什么

DeepSeek 官方发布页最核心的三句话是：

- DeepSeek-V4 Preview officially live & open-sourced；
- DeepSeek-V4-Pro 为 1.6T total / 49B active params；
- DeepSeek-V4-Flash 为 284B total / 13B active params；
- 1M context is now the default across all official DeepSeek services。

这四点合起来，已经足够说明市场定位：

### 1. V4 不是单模型，而是双 SKU 架构

V4-Pro 是旗舰能力位，V4-Flash 是成本/速度位。这个组合有点像把“最强模型”和“最可分发模型”同时做成主角，而不是先上旗舰、再等轻量版补齐。

这很关键，因为对绝大多数真实云上调用来说，真正能迅速铺开的往往不是最强模型，而是更低激活参数、更高吞吐、更好价格带的版本。DeepSeek 这次把 Flash 一起正式推出，说明它不是只想赢 benchmark，也想赢 API 分发。

### 2. 1M context 被提升为默认服务标准

官方原文不是“最高支持 1M”，而是“1M context is now the default across all official DeepSeek services”。

这和过去很多模型的说法完全不同。过去行业常见表述是：

- 可以支持超长上下文；
- 某些模式支持；
- 某些账户或实验接口支持；
- 仅在论文/演示中展示。

DeepSeek 这次的说法则是：官方服务层面直接把 1M 设成默认标准。对开发者来说，这意味着长上下文不再是单独申请的特权，而是产品基线。

### 3. API 迁移动作说明 V4 已进入“替换旧主力”阶段

官方同时写明：

- 两个模型都支持 1M context；
- 两个模型都支持 Thinking / Non-Thinking 双模式；
- `deepseek-chat` 与 `deepseek-reasoner` 将在 2026-07-24 后彻底退役；
- 当前两者已分别路由到 V4-Flash 的 non-thinking / thinking。

这不是普通发布，而是主产品线切换。也就是说，V4-Flash 不是一个试验性补充，而是直接接管了历史主流 API 别名。

## 三、技术报告真正最值得看的，不是参数，而是 1M 的效率账

如果只看参数，V4-Pro 很容易被理解成“更大的 MoE”；但技术报告真正最关键的价值，在于它证明 DeepSeek 试图把 1M context 做成可日常运行的工程系统。

技术报告给出的硬信息包括：

- V4-Pro：1.6T 参数，49B activated；
- V4-Flash：284B 参数，13B activated；
- 预训练 token 超过 32T；
- 架构升级包括 CSA + HCA 混合注意力、mHC、Muon optimizer；
- 在 1M token 场景下，V4-Pro 单 token inference FLOPs 仅为 V3.2 的 27%；
- KV cache 仅为 V3.2 的 10%。

这里最重要的是后两项。

长上下文过去一直不是“能不能塞进去”的问题，而是“能不能以可接受的算力、显存和缓存成本持续跑”。DeepSeek 给出的不是含糊其辞的“更高效”，而是明确的工程指标：

- 计算成本压到原来的约四分之一；
- KV cache 压到原来的十分之一。

这才是 1M 从展示功能走向商用品的前提。

## 四、V4-Flash 为什么比很多人想象中更重要

官方口径里，V4-Pro 承担的是“世界级推理与 agentic 能力”，而 V4-Flash 被定义成“fast, efficient, and economical choice”。

很多人会下意识把 Flash 看成“缩水版”。但从产业角度看，它反而可能是这次最重要的商业 SKU。

原因有三点：

### 1. 13B active 才更接近可大规模分发的成本结构

284B 总参数并不小，但 13B active 让它在 MoE 路线下更接近“强能力 + 可铺量”的平衡点。

这意味着它比旗舰版本更适合：

- API 默认路由；
- 云厂商上架；
- 企业 PoC 批量接入；
- 做 thinking / non-thinking 双模式切换；
- 为大规模 agent 调度提供经济版本底座。

### 2. 官方迁移路径本身就在给 Flash 导流

`deepseek-chat` 和 `deepseek-reasoner` 的迁移安排，本质上就是把原有流量逐步导入 V4-Flash。换句话说，Flash 不是陪跑，而是承接历史使用量的主力接口。

### 3. 华为云当前公开可见的也是 Flash，而不是 Pro

华为云帮助中心检索页已经能看到：

- 模型名称：DeepSeek-V4-Flash；
- 版本：20260424；
- 类型：文本生成；
- 场景：对话问答、文本生成推理；
- 语言：中文、英文；
- 地域：西南-贵阳一；
- 模型介绍提到“在保持 1M 超长上下文能力的同时……”

这说明云侧最先公开服务化的，不是最重的 Pro，而是更适合作为 MaaS 商品出售的 Flash。这个节奏非常合理，也非常说明问题：DeepSeek 想先把 1M 能力普及出去，而不是只做一张旗舰海报。

## 五、华为云“首发适配”到底该如何理解

这里要把证据层级说清楚。

### 已能明确确认的事实

1. DeepSeek 官方在 4 月 24 日正式发布 V4；
2. 华为云公开检索结果已出现 DeepSeek-V4-Flash 条目，版本号与发布日一致；
3. 华为云社区文章明确把 V4 与“首次实现与华为昇腾等国产芯片深度适配”联系起来。

### 仍需谨慎表述的部分

“华为云首发适配”这六个字，目前更像是媒体与云侧社区口径，而不是 DeepSeek 官方发布页里逐字写明的主标题。也就是说：

- “V4 已正式发布”是官方确认；
- “华为云已出现 V4-Flash 公开服务入口”是华为云公开页面可见；
- “首发适配/率先接入”的完整叙事，来自华为云侧与媒体交叉，而非 DeepSeek 官方单独盖章的一句总宣告。

但从产业动作上看，这已经足够支撑一个重要判断：国产云厂商不再只是做“事后兼容”，而是在 V4 发布窗口期就开始承接服务化分发。

## 六、这次发布对中国大模型产业意味着什么

### 1. 长上下文开始从参数竞赛，转向成本竞赛

以前行业会问：谁支持 128K、256K、1M？

现在更关键的问题变成：

- 谁能把 1M 做成默认服务；
- 谁能在 1M 下把 FLOPs 和 KV cache 压下来；
- 谁能把它放上云，并让企业真的调用得起。

DeepSeek-V4 的价值，就在于它把这三个问题同时回答了一部分。

### 2. 中国模型公司开始把 SKU 分层做得更像成熟云产品

V4-Pro 对应能力天花板，V4-Flash 对应分发效率与成本控制，再叠加 thinking / non-thinking 双模式，这已经不是单一模型发布，而是一个接近云服务产品线的设计。

### 3. 国产云的竞争点会从“能不能接入 DeepSeek”转向“谁先接入哪一档 DeepSeek”

如果华为云最先把 V4-Flash 做成公开可见的预置模型，那么后面的竞争就不是口头兼容，而是：

- 哪家先上正式 SKU；
- 哪家能提供稳定地域与合规托管；
- 哪家能把 1M context 的调用成本、吞吐和企业接入流程做顺。

也就是说，云厂商的差异化开始从算力品牌，转向模型供给速度与服务封装能力。

## 七、我的判断

这次 V4 发布最值得记住的，不是“DeepSeek 又把参数做大了”，而是三件更本质的事：

1. DeepSeek 把 1M context 从演示能力变成了官方默认服务；
2. 它用 V4-Flash 把这件事做成可迁移、可分发、可上云的商品；
3. 华为云已出现 V4-Flash 的公开模型条目，意味着国产云开始承接这轮正式发布后的第一波服务化落地。

所以，4 月 24 日这条新闻真正宣告的是：DeepSeek-V4 不再停留在“国产芯片优先”的筹备叙事，而是已经进入“正式发布 + 长上下文普及 + 云上分发”的商业化阶段。

从这个角度看，V4 的里程碑不是单点技术突破，而是中国开源大模型第一次把“百万上下文”真正推成默认供给。

---

## 📌 2026-04-26 更新

- **技术报告的“对账”已经更清楚了：** 量子位对全文拆解后，外界此前追踪的几条路线里，mHC（Manifold-Constrained Hyper-Connections）确认进入 V4，Muon 确认接管绝大多数 2D 参数训练，而 Engram 这条条件记忆路线没有进入本代、被明确留给未来方向。换句话说，V4 不是一次模糊升级，而是把过去几个月 DeepSeek 连续放出的若干论文线索真正收束成了一套可运行的大模型主架构。
- **百万上下文的成本曲线不只是宣传口号，报告还给了更多工程细节：** DeepSeek 官方技术报告再次明确，在 1M token 场景下，V4-Pro 的单 token FLOPs 只有 V3.2 的 27%，KV cache 只有 10%；V4-Flash 进一步压到 10% FLOPs 与 7% KV cache。与此同时，报告还披露了更深的基础设施信息：其细粒度 expert parallel 方案已在 NVIDIA GPU 与 HUAWEI Ascend NPU 平台验证，常规推理负载可获得 1.50×–1.73× speedup，低延迟场景最高到 1.96×。这意味着“支持国产算力”开始从营销表述变成可量化的 kernel / serving 证据。
- **融资与硬件路线正在把 DeepSeek 从技术理想主义样板推向产业平台：** 36Kr 报道称，DeepSeek 已启动首次外部融资，募资规模至少 3 亿美元，目标估值超过 200 亿美元、市场传闻上探 300 亿美元；同一报道还把 V4 与华为昇腾 950PR / CANN 路线更明确地绑在一起。若这一融资和芯片迁移同步落地，DeepSeek 的叙事就不再只是“做出强模型”，而是“把强模型、国产芯片、云上推理与资本补给连成一条产业链”。
- **评价修正：** 我在 04-25 的判断是“V4 进入正式发布 + 长上下文普及 + 云上分发阶段”。今天需要再往前修正一步：V4 真正稀缺的，不只是把 1M context 做成默认供给，而是把“新架构（mHC / CSA-HCA / Muon）— 新 kernel — 国产 NPU 兼容 — 外部资本 — 云分发”这一整条产业化链路第一次同时摊到了台面上。

**新增信源：**
- https://www.qbitai.com/2026/04/406809.html
- https://www.36kr.com/p/3781941869255686

---

## 八、技术报告详细拆解（2026-04-26 增补）

把 58 页技术报告通读完之后，可以更明确地说：V4 不是一篇把若干新概念堆起来的论文，而是一份把 DeepSeek 自己过去一年发出的若干技术线索"收口"的工程报告。下面这一节单独把读者最容易误读的几个点说清楚。

### 1. 双 SKU 不是"旗舰 + 缩水"，而是"能力位 + 分发位"

报告 4.2.1 节给出的两个 SKU 配置，差异不只是参数总量：

- **V4-Pro**：61 层 Transformer，hidden size 7168，每个 MoE 层 1 个共享专家 + 384 个路由专家，每 token 激活 6 个，专家 hidden 3072，总参数 1.6T / 激活 49B。
- **V4-Flash**：43 层，hidden 4096，1 + 256 路由专家、激活 6 个，专家 hidden 2048，总 284B / 激活 13B。

Pro 不是"更大的 Flash"，它是把层数、宽度、专家粒度都拉满的能力位；Flash 则是把同一套架构（CSA/HCA、mHC、Muon、MTP）先压到 13B 激活量、便于 API 默认路由和云上分发的版本。报告 5.4.4 节关于代码 agent 的内部评测表明（外部模型仅作参考对照），Pro 已经接近 Claude Opus 4.5 的水准；Flash 则在给足 thinking budget 时能逼近 Pro 的 reasoning 表现。这是一种"双产品线"的设计意图，而不是父子关系。

### 2. "1M default" 比"支持 1M"重要，是因为它意味着训练课表与服务承诺同时改写

报告 4.2.2 节交代了训练 sequence length 的递进：先 4K dense，再 16K、64K，最后到 1M；sparse attention 从 64K 阶段才引入。也就是说，1M 不是事后再做长度外推或 RoPE 扩展硬接，而是 pretraining 课表里实打实跑过的目标长度。

这件事的工程含义是：1M 已经被纳入训练分布、loss 曲线、batch size scheduling、attention 稀疏度切换时机；放到服务侧，就敢宣布"1M 是默认上下文"。对开发者而言，"支持 1M"和"默认 1M"差的是一整条训练-推理一致性的链条——前者是上限承诺，后者是基线承诺。

### 3. CSA 与 HCA：一个是"压缩 + 稀疏选择"，一个是"重压缩但保留 dense"

报告 2.3 节把混合注意力拆成两类，互相补位：

- **CSA（Compressed Sparse Attention）**：先把每 m 个 token 的 KV 压成一个 entry（V4 里 m=4），再叠一层 Lightning Indexer 选出 top-k 个被压缩块做 sparse attention（Pro 里 top-k=1024、Flash 里 512）。它解决的是"长上下文大部分位置其实不需要参与每一次 attention"——但代价是会丢局部细粒度，因此还要补一条 sliding window 分支（n_win=128）来拣回邻近 token 的 dense 信息。
- **HCA（Heavily Compressed Attention）**：用更激进的压缩率（m'=128），把每 128 个 token 直接合成 1 个 entry，但保留 dense attention 不做 top-k 选择。它解决的是"全文级粗粒度信息必须被每个 query 看到"——HCA 不挑、不漏，只是看得粗。

CSA 与 HCA 在 layer 维度交错排布。直觉上，可以把它理解成 V4 在每一层都同时做了"挑细节"和"看大局"两件事。这种交错配置才是 1M 在显存与 FLOPs 上同时可控的根因，而不是单一稀疏 trick。

### 4. mHC 的核心思想：把 hyper-connections 拉回到稳定性可证的子空间

mHC 全称 Manifold-Constrained Hyper-Connections。原始 HC 的做法是把残差宽度从 d 扩展到 n_hc × d（V4 里 n_hc=4），并通过 A、B、C 三组线性映射在每层重排残差流。问题是堆深之后训练频繁数值不稳。

mHC 的关键修改写在报告 (2) 式：把残差映射矩阵 B 约束到双随机矩阵流形 ℳ（即 Birkhoff polytope）。这一约束有两个非常硬的性质：

1. ‖B‖₂ ≤ 1，残差变换 non-expansive，前向反向都不会爆；
2. ℳ 在矩阵乘法下封闭，这意味着堆叠 mHC 不会破坏稳定性的可组合性。

输入/输出映射 A、C 则用 Sigmoid 钳到非负且有界，避免信号互相抵消。投影到 ℳ 用 Sinkhorn-Knopp 迭代，t_max=20。

换句话说，mHC 不是炫技意义上的新模块，它是"想用 HC，但不想让大模型训崩"的一道工程闸门。把它解读成 V4 的稳定性基础设施比解读成新 architectural innovation 更接近事实。

### 5. Muon 不是替换 AdamW，是按参数语义分桶

报告 2.4 节明确写明：Muon 用于"绝大多数模块"，但 embedding 模块、prediction head、所有 RMSNorm 权重、以及 mHC 的 static biases 与 gating factors 仍用 AdamW。原因不复杂——Muon 的数学本质是对更新矩阵做 Newton-Schulz 正交化（V4 用 10 步 hybrid 迭代，前 8 步系数 (3.4445, −4.7750, 2.0315) 加速、后 2 步 (2, −1.5, 0.5) 收口），这套机制对 2D 矩阵参数才有意义；对一维向量、normalization scale、单一 gating 标量根本无从"正交化"。

所以 Muon 在 V4 里的角色是"更适合 2D 大权重的优化器"，而 AdamW 仍是处理小参数与 element-wise 模块的默认选择。把 V4 描述成"用 Muon 替换 AdamW"是简化误读，真实做法是混合优化器策略。同时报告还提到，因为 attention queries 与 KV entries 已经有 RMSNorm 约束 logit 不爆炸，所以 V4 没有再用 QK-Clip——这条小细节也说明 Muon 的接入是被整套架构挑出来的，不是无差别替换。

### 6. 1M 场景下 Pro / Flash 的 FLOPs 与 KV cache 对比

报告 1 节给出了具体数字（与官方发布页一致）：

| 指标（vs DeepSeek-V3.2，1M 上下文） | V4-Pro | V4-Flash |
|---|---|---|
| 单 token 推理 FLOPs（FP8 等价） | 27% | 10% |
| 累积 KV cache size | 10% | 7% |

需要注意两件事：

第一，V4-Pro 激活参数 49B 比 V3.2 的 37B 还要更大，但单 token FLOPs 反而降到 27%——这说明 attention 部分的节省压过了 MoE 体量增加。第二，与 BF16 GQA8（head=128）这一行业常见配置相比，V4 系列在 1M 上下文下的 KV cache 只剩约 2%。这两个数字一起，把"长上下文是不是只有论文意义"这个老问题第一次给了可量化的工程回答。

### 7. 异构 KV cache 管理：这是工程报告而不是纸面论文的最强证据

混合注意力的一个直接副作用，是 V4 里同一层会同时存在四种 KV 形态：CSA 压缩 entry、HCA 压缩 entry、Lightning Indexer 自己的压缩 keys、以及 SWA 的 uncompressed 局部 KV。它们 cache size 不一样、更新规则不一样、命中/淘汰策略也不一样，PagedAttention 里"块大小固定 + 单一驱逐策略"的前提全部被打破。

报告 3.6 节因此重新设计了 KV cache layout：拆成 state cache（专门放 SWA 和压缩前的尾部 uncompressed token）和 classical KV cache（放 CSA/HCA 压缩好的 entry），并把 cache block 长度对齐到 lcm(m, m')；sparse attention 的 kernel 与 layout 共同协同设计。再叠加 on-disk KV cache 处理共享前缀，让长 prompt 的 prefilling 不必每次重算。

这套东西是没法只靠一篇论文交出来的——它必须真的在 inference framework 里跑起来，才会暴露出"四种 KV 各自驱逐"和"PagedAttention 假设破裂"这种问题。换句话说，光从 KV 管理这一节就能判断 V4 已经走过了一遍真实部署。

### 8. NVIDIA + Ascend 上 1.50–1.73× / 最高 1.96× speedup 的产业含义

报告 3.1 节验证了细粒度 EP（fine-grained Expert Parallelism）方案：把 dispatch、combine、linear-1、linear-2 切成 wave 级的小批，做到 communication 完全藏在 computation 之下。理论 speedup 1.92×，实测下来：

- 通用推理 workload：1.50× ~ 1.73× speedup；
- latency-sensitive（RL rollout、高速 agent serving）：最高到 1.96×；
- 平台同时覆盖 NVIDIA GPU 与 HUAWEI Ascend NPU；
- CUDA-based 实现 MegaMoE 已经作为 DeepGEMM 组件开源。

这件事的产业含义比数字本身重要：DeepSeek 选择把同一套 EP kernel 在两套异构硬件上"用同一份性能表达"，意味着 V4 的训练/推理栈不再绑定单一 vendor。结合官方还给出了 6144 FLOPs/Byte 的 communication-computation 平衡点这一硬件设计建议，可以看出 DeepSeek 已经把"软硬件协同"的话筒转向了 hardware vendor，而不是只在自家集群里跑通就算数。

### 9. 为什么说 Flash 可能比 Pro 更关键

把训练设置和评测合起来看，Flash 这个 SKU 比表面上更值得关注：

- **训练 token 量与 Pro 同档**：V4-Flash 在 32T token 上 pretrain，V4-Pro 在 33T 上，差距很小；这说明 Flash 不是 Pro 的"二等公民"，是和 Pro 同一代训练策略下出来的小尺寸主力；
- **Base 表现已经超过 V3.2-Base**：报告 4.3.2 节的 Table 1 显示，V4-Flash-Base（13B 激活、284B 总参）在大多数 benchmark 上已经压过 V3.2-Base（37B 激活、671B 总参）。也就是说，V4-Flash 用更小的 active 与 total 参数，把上一代旗舰的 base 能力反超了；
- **效率上比 Pro 更激进**：1M 场景里 Flash 单 token FLOPs 只剩 V3.2 的 10%、KV cache 只剩 7%，比 Pro 还更轻；
- **API 路径已经直接迁过来**：`deepseek-chat` / `deepseek-reasoner` 的旧别名当前已分别路由到 V4-Flash 的 non-thinking / thinking。

这四点合起来意味着：DeepSeek 想在云上铺开的就是 Flash。Pro 承担的是"我们能做到多远"的能力天花板叙事，Flash 才是日常会被亿级调用真正消耗的那一档。

### 10. Engram 留给 V5：这是路线取舍，而不是"还没做完"

报告第 6 节"Conclusion, Limitations, and Future Directions"里有一句很关键的表述：除了 MoE 与 sparse attention，未来要"沿新维度探索 model sparsity——例如更稀疏的 embedding modules"，并引用 Cheng et al. 2026 "Conditional memory via scalable lookup: A new axis of sparsity for large language models"。这就是外界追踪了一段时间、被称为 Engram 的条件记忆路线。

把它放进 V4 的整体取舍里看：DeepSeek 这一代选择把"长上下文 token 全部塞进 attention，再靠 CSA/HCA 把成本压下来"作为主路径，而不是用外部记忆 / 条件检索来旁路掉一部分上下文。Engram 没有进入 V4，不是工程没做完，而是一次明确的路线决策——本代押注 attention efficiency，下一代再去打 embedding-level / memory-level 的 sparsity。

这件事对预判 V5 也很有意义：如果 Engram 真的进入下一代，那 V5 大概率不是"再把 1M 推到 10M"，而是把"什么内容值得参与一次 attention"做成可学习、可索引的稀疏 embedding 机制。换句话说，V5 的关键可能不是更长，而是更省。

### 小结

把这八点合起来，V4 报告真正传递的信息是：DeepSeek 这次没有发明新概念，而是把过去一年自家提出/采纳的几条路线（DeepSeekMoE、MTP、DSA、HC、Muon、TileLang、DeepGEMM、3FS）按工程优先级排好序，做成了一个能在 1M 上下文下日常跑、并且能在 NVIDIA 与 Ascend 两侧同时落地的产品。它的稀缺性不在"参数最大"，而在"第一次让百万上下文同时具备训练课表、推理 kernel、KV 管理、双平台部署、API 默认承诺"这五件事一致成立。这才是把它和过去所有"号称支持长上下文"的模型区分开的根本原因。
