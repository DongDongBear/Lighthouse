---
title: "How Alignment Routes：拒答不是能力消失，而是被一条可操控路由电路拦住了"
description: "How Alignment Routes, policy circuits, refusal routing, interchange testing, mechanistic interpretability, cipher bypass, alignment safety"
---

# Localizing, Scaling, and Controlling Policy Circuits in Language Models

> 原文链接：https://arxiv.org/abs/2604.04385
> 作者：Greg Frank
> 机构：独立研究者 / 论文正文覆盖 6 家实验室模型
> 发布日期：2026-04-13（v3 更新）

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 论文认为对齐后的拒答并不是“危险能力被删掉”，而是内容检测后被一条 gate-amplifier 路由电路导向了拒答输出。 |
| 大白话版 | 模型其实先看懂了你在问什么，然后某个中层“闸门头”把信号交给后面的“放大头”，最后把回答路由成拒答。把这个闸门绕开，模型就可能直接回答。 |
| 核心数字 | 覆盖 12 个模型、6 家实验室、2B-72B；gate 对输出 DLA 贡献 <1%，但在互换测试中因果必要；72B 上单头 ablation 最多衰减 58×，interchange 仍有效；cipher 让 gate necessity 崩掉 70%-99%。 |
| 评级 | A — 这是近期 alignment mechanistic interpretability 里最扎实也最不舒服的一篇。 |
| 代码 | 论文附 GitHub 仓库链接 |
| 关键词 | policy circuit, refusal, gate head, amplifier heads, interchange, DLA, cipher bypass, mechanistic interpretability |

## 核心 Insight

这篇论文最关键的洞察是，**“检测到敏感内容”**和**“输出拒答”**不是同一件事，中间隔着一层可定位、可操控、还会迁移的 routing 机制。

过去很多安全讨论默认，对齐训练把危险能力压掉了，或者至少显著削弱了。但作者的实验指向另一种更尖锐的解释：模型在中层依然能识别敏感主题，真正决定最后是拒答、规避、还是正常回答的，是一套 policy routing circuit。换句话说，能力还在，只是被导向了不同输出口。

这个 framing 很重要，因为它把“alignment 是否稳固”从行为学问题，推进成了电路问题。如果这条路由能被编码绕过、能被激活替换、能被局部调制，那很多“模型很安全”的表面现象就要重估。

### 为什么这个想法 work？

因为 transformer 里并不是所有因果关键节点都要在 output attribution 上显眼。

论文最有意思的点之一是，gate head 对最终 output DLA 的直接贡献不到 1%，看起来像个小角色。但它像恒温器或者继电器，不负责大功率输出，却负责决定后面的放大器要不要启动。所以如果你只看“谁对最后 logits 贡献最大”，会错过真正的控制点。

作者因此把工具链分成三种角色：
- **DLA** 看谁在“搬运信号”
- **Ablation** 看谁“不可少”
- **Interchange** 看谁“携带内容特异信息并触发路由”

这三者叠起来，才能把 gate 找出来。

## 方法详解

### 整体架构

论文提出的 routing 机制可以简化成：

```text
输入提示
  → 检测层（约 L15-L16）形成敏感内容表征
  → gate head 读取表征并写入路由向量
  → amplifier heads 在更深层放大该向量
  → 分布式 carriers / MLP 将其推到最终拒答方向
  → 输出 REFUSAL / EVASION / FACTUAL / HARMFUL_GUIDANCE
```

作者强调，这不是简单 keyword filter，而是 contextual / compositional detection。相同关键词在不同 framing 下，layer-16 probe score 可以不同。

### 关键技术组件

#### 组件 1：Direct Logit Attribution（DLA）

**做什么：**衡量每个组件对“拒答 vs 回答”方向的输出贡献。

**关键公式：**

$$
DLA_c = (W_U[t_{target}] - W_U[t_{baseline}])^\top x_c
$$

其中：
- $W_U$ 是词表输出矩阵
- $t_{target}$ 是目标 token
- $t_{baseline}$ 是 baseline refusal token 集合的均值嵌入
- $x_c$ 是组件输出

**直觉解释：**看某个头、某个 MLP，到底把 residual stream 往“拒答方向”推了多少。

但 DLA 有一个坑，它更容易找到“最终搬运工”，不一定找得到“总闸门”。论文在 Qwen3-8B 上的结果就是典型例子，深层头最显眼，但真正 gate L17.H17 一开始排到 150 名以后。

#### 组件 2：Head-level ablation

**做什么：**看删掉某个头后，整体 routing signal 会掉多少。

在 Qwen3-8B 上，单头 ablation 后最显著的是 22-23 层一组头，尤其 L22.H7。它们更像 amplifier，而不是 gate。

这一步比 DLA 稳定。论文给出 bootstrap top-10 Jaccard：
- DLA：0.66
- Ablation：0.92

说明 ablation 更适合找“必要节点”，但还是不够精准区分谁在读内容、谁在放大内容。

#### 组件 3：Interchange testing

**做什么：**这是整篇论文最核心的技术手段。

作者把 sensitive prompt 和 matched control prompt 的某个头激活互换，分别测：
- **necessity**：在敏感 prompt 上，把该头换成控制样本激活，routing 有没有减弱
- **sufficiency**：在控制 prompt 上，把该头换成敏感样本激活，routing 有没有增强

如果一个头 necessity 和 sufficiency 都高，说明它不只是放大，而是确实在读内容并触发路由。

**在 Qwen3-8B 上的关键发现：**
- L17.H17：necessity 1.1%，sufficiency 0.3%，综合第一
- 它比 L22.H7 高 64%
- permutation null 检验显著，$p < 0.001$

这就是 gate 的定位依据。

#### 组件 4：Knockout cascade

**做什么：**验证 gate 被拿掉后，下游 amplifier 会不会一起塌。

在 Qwen3-8B 上：
- 零掉 L17.H17 后，6 个 amplifier 里 5 个被压低
- 抑制幅度 5%-26%
- 最强一个是 L22.H5，下降 25.8%
- 还暴露出 counter-routing head：L22.H6，反而上升 10.1%

这一步非常关键，因为它说明 gate 不是一个相关性节点，而是因果入口。

### 训练/实验设置

论文不是只盯一个模型，而是分三层证据：
- 深入分解：Qwen3-8B、Phi-4-mini、Gemma-2-2B
- 广泛 interchange screening：总共 12 个模型
- 覆盖范围：6 家实验室，2B 到 72B
- 常用样本量：n=120 prompt pairs

这让它比很多 mechanistic interpretability 论文更像“模型家族级结论”，而不只是某个 checkpoint 的奇观。

### 与现有方法的关键区别

| 维度 | 常见做法 | 本文方法 | 为什么更好 |
|---|---|---|---|
| 看拒答 | 行为 benchmark | 电路级局部化 | 能解释为什么 benchmark 可能漏报 |
| 找关键头 | 单看 attribution / 单头 ablation | DLA + ablation + interchange 三联法 | 能区分 trigger 和 carrier |
| 研究 bypass | prompt engineering 观察 | cipher + rescue + contrast analysis | 能把 bypass 定位到具体层级接口 |
| 跨模型结论 | 常只看 1-2 个模型 | 12 模型、6 实验室 | 更能说服人这是共性模式 |

## 实验结果

### 主实验

| 发现 | 结果 |
|---|---|
| gate 直接输出贡献 | < 1% output DLA |
| Qwen gate 位置 | L17.H17 |
| Qwen 主要 amplifier | L22.H7、L23.H2、L22.H4 |
| 规模覆盖 | 12 models, 2B-72B |
| 大模型上 ablation 退化 | 最多 58× 变弱 |
| cipher 下 gate necessity 衰减 | 70%-99% |
| Phi-4 单头 rescue | 48% refusal 恢复 |

**解读：**
- gate 的“输出贡献小但因果地位大”是全文最关键的机制发现。
- 越大模型，单头 ablation 越不好用，因为 routing 更分布式，但 interchange 仍能抓住 gate。
- 这意味着未来 frontier safety audit 如果还只做 ablation，很可能漏掉真正的控制点。

### 机制发现一：route 不是简单阈值

作者先证明 detection 是 prompt-time 的，最后一个 prompt token 和第一个生成 token 的 per-layer DLA 高度重合，说明拒答方向在生成前就定了。

同时，相同关键词在不同语境下 layer-16 probe score 不同，所以安全路由不是“见词就拒”。这点很重要，它说明模型确实在做更高阶语义判断，而不是浅层黑名单匹配。

### 机制发现二：gate 是 trigger，不是 carrier

论文专门解释了为什么 gate output attribution 很小。

在 Qwen3-8B 里：
- gate 写入后，在 L18 的中间层 DLA 排名冲到 #2
- 到最终输出时，深层 carrier heads 把它的信号接过去继续放大
- 所以 output 端看起来 gate 不重要，实际上它只是把控制权交给后面的分布式网络

这个结论对 interpretability 社区是个提醒，**别把 output attribution 排名当因果排名。**

### 机制发现三：规模变大后，routing 从单头变成带状分布

论文比较四组同代 scaling pairs，发现：
- 小模型更集中在少数头上
- 大模型更分布式
- 在 72B 上，单头 ablation 的顶级效应只剩 0.016，几乎不可见
- 但 interchange necessity 仍 >1%

这说明大模型不是没有 routing circuit，而是更“铺开了”。对审计来说，这意味着工具必须升级，不然会错把“测不出来”当“问题不存在”。

### 机制发现四：拒答是连续可控的，不是二元开关

作者在 detection 层加减一个 steering direction $\alpha \cdot d$，得到明显的 dose-response 曲线。

在 Tiananmen prompts 上：
- baseline 是 100% refusal
- attenuation 到 $\alpha = 35$ 后，refusal 下降到 0%
- 输出路径变成 REFUSAL → EVASION → FACTUAL

在 Phi-4-mini 的 safety prompts 上，更刺激：
- attenuation 会把 REFUSAL 变成 **HARMFUL_GUIDANCE**

这说明所谓安全能力没有被删掉，而是被路由屏蔽。

### 机制发现五：cipher bypass 指向 early-commitment vulnerability

论文最不舒服的结果是 substitution cipher 绕过实验。

当作者先教模型一个拉丁替换密码，再用编码后的 harmful prompt 提问时：
- Qwen3-8B detection signal 下降 66%
- Phi-4-mini 下降 88%
- Gemma-2-2B 下降 70%
- 模型不再拒答，而是把任务当成“解谜题”去解码

更狠的是，gate 的 interchange necessity 在 cipher 下几乎消失：
- Gemma / Phi-4 约 99% 崩塌
- Qwen 也掉 70%

这说明问题不在后面 refusal generation 坏了，而是在检测层根本没形成 gate 可读的表示。

### 机制发现六：rescue experiment 证明故障位置就在 gate 接口

为了证明不是整个 forward pass 都乱掉了，作者做了 rescue：
- 在 Phi-4-mini 上，把 plaintext gate activation 注入 cipher forward pass
- refusal 恢复到 48%

这一步非常关键。它说明 amplifier cascade 其实还活着，只是 gate trigger 丢了。

## 复现评估

| 维度 | 评分(1-5) | 详细说明 |
|---|---|---|
| 数据可得性 | ⭐⭐⭐⭐ | prompt corpus 和方法描述较完整 |
| 代码可得性 | ⭐⭐⭐⭐ | 有仓库，但需要较熟 mechanistic tooling |
| 算力需求 | ⭐⭐ | 2B-8B 还能玩，12 模型全覆盖就重了 |
| 工程复杂度 | ⭐⭐⭐⭐⭐ | hook、activation cache、interchange、DLA 都不轻松 |
| 预期收益 | ⭐⭐⭐⭐⭐ | 对 safety eval、red teaming、mechanistic interpretability 都很高 |

**复现建议：**别一上来全做。最现实的是先选 1 个开源 7B-8B 模型，复现 detection layer probe、single-head interchange 和 cipher bypass 三件套。

## 批判性分析

### 局限性

论文自己也承认了不少边界：
1. 只覆盖 2B-72B，没有 frontier 闭源超大模型。
2. 研究对象主要是政治拒答和 safety refusal，不能外推到所有 alignment behavior。
3. MLP 约占 23% routing signal，但还没做 feature-level 拆解。
4. cipher 只验证了一类编码，不代表所有变换都一样。

我认为还要再补三点：
1. **“模型理解了 harmful intent 但 gate 读不到”** 与 **“模型只是做形式解码没真正绑定语义”** 之间，论文没有彻底区分。
2. 行为分类大量使用 LLM judges，虽然一致性不差，但在 STEERED / EVASION 边界上仍有噪声。
3. 这篇论文非常强地依赖作者定义的 refusal-vs-answer direction，虽然做了 robustness，但不同 token 方向仍可能影响某些细节量化。

### 改进方向

1. **扩展到 reasoning models / thinking tokens。** 论文已点名现有 DLA pipeline 对这类架构兼容性不好。
2. **把 MLP feature decomposition 补完。** 如果 23% 甚至单主题下 61% 的信号在 MLP 路径上，当前画面还没完整。
3. **把 circuit audit 接到现实安全评估。** 比如用 mechanistic signature 去补 benchmark 漏洞。

### 独立观察

- 这篇论文对“安全训练是否真正删除能力”给出的答案非常接近“不”。这对行业营销叙事是坏消息，但对真实防御是好消息，因为至少我们知道该往哪打。
- 它也解释了为什么很多模型在 benchmark 上看似稳定，但换个 phrasing、语言或编码形式就露馅。因为 benchmark 测的是表层行为，电路漂移可能完全看不见。
- 对闭源模型公司来说，最麻烦的不是这篇论文证明了某个具体 bypass，而是它提示了一类更通用的失效模式：**只要检测层没形成 gate 可读表示，后面所有“安全拒答”都来不及。**

### 对领域的影响

短期内，这篇论文会迫使安全研究从“多做几个 prompt benchmark”转向“行为评测 + 机制审计”的双轨制。

中期内，interchange testing 这类方法可能会变成 alignment audit 的标配，因为大模型规模上去之后，ablation 已经越来越不灵了。

长期看，如果 gate-amplifier routing 这一范式被更多模型家族复现，那安全训练范式本身都可能要改。真正稳的防御，不能只在输出口拦截，而要让检测、绑定、路由三个阶段都更鲁棒。否则，拒答只是看起来在，能力其实一直躺在后面等着被绕过去。 
