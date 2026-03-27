---
title: "2026-03-25 上午 ｜ LiteLLM 供应链攻击窃取全系统凭证，Jensen Huang 宣称 AGI 已实现，OpenAI 洽购 Helion 核聚变电力"
description: "供应链安全、AGI定义之争、核聚变能源、NVMe推理调度、560B形式推理、离散扩散超越自回归、高阶DoRA优化、深度研究Agent开源"
---

# 2026-03-25 上午 AI 简报

> 北京时间 2026 年 3 月 25 日 10:00（UTC+8）

---

## 上期追踪问题回顾

**1. Anthropic vs Pentagon 听证会最终裁决？**
暂无新进展。法院尚未公布临时禁令裁定结果，持续关注中。

**2. Hyperagents 的自改进收敛性和安全边界？**
Meta 尚未发布后续安全分析论文。社区复现报告零星出现但未见系统性验证。

**3. iPhone 17 Pro 400B LLM 的实际推理速度？**
anemll 团队未公开更多技术细节。但今天 HN 头条的 Hypura 项目从另一个角度回应了端侧大模型问题——通过 NVMe 分层调度实现超内存模型推理。

---

## 新闻速递

### 1. 🔴 LiteLLM 1.82.8 遭供应链攻击，恶意 .pth 文件窃取全系统凭证

**[安全 | 供应链]**

LiteLLM Python 包 v1.82.8 在 PyPI 上被注入恶意 `litellm_init.pth` 文件（34KB），该文件利用 Python 的 .pth 自动执行机制，在解释器启动时无需 `import` 即自动运行。payload 经双层 base64 编码，系统性窃取 SSH 密钥、AWS/GCP/Azure 凭证、K8s secrets、Docker config、Git 凭证、shell 历史等几乎所有本地敏感信息，通过 HTTPS 外传至攻击者服务器。

**技术/产业意义：** LiteLLM 作为 LLM 代理层被广泛用于生产环境，其 PyPI 安装量巨大。此次攻击暴露了 AI 工具链供应链安全的脆弱性——.pth 文件是 Python 生态中一个长期被忽视的攻击面，无需被 import 即可执行代码。

**评论观察：**
🟢 安全研究者迅速响应，HN 讨论超 250 条，社区呼吁 PyPI 加强 .pth 文件审计
🔴 使用 LiteLLM 的企业面临大规模凭证泄露风险，后果可能数周后才完全显现

**信源：** [GitHub Issue #24512](https://github.com/BerriAI/litellm/issues/24512)

**关联行动：** 立即检查是否安装了 litellm 1.82.8，如有则轮换所有凭证并审计系统访问日志。

---

### 2. Jensen Huang 在 Lex Fridman 播客宣称"我认为我们已经实现了 AGI"

**[产业动态 | AGI 定义]**

NVIDIA CEO Jensen Huang 在 Lex Fridman 播客中明确表示"I think we've achieved AGI"。Fridman 将 AGI 定义为"能做你的工作——创建并运营一家价值超 10 亿美元的科技公司"的 AI 系统。Huang 提到了 OpenClaw 开源 AI Agent 平台的病毒式成功，称人们正用个人 AI Agent 做各种事情。但他随后部分回收观点，承认"100,000 个这样的 agent 建造 Nvidia 的概率为零"。

**技术/产业意义：** AGI 声明的政治经济学意义远大于技术意义。此话题直接关联 OpenAI-Microsoft 合同中的 AGI 条款（一旦实现 AGI，Microsoft 将失去部分权益）。Huang 的声明可能是为 NVIDIA 的 AI 算力叙事服务——如果 AGI 已实现，需求只会更大。

**评论观察：**
🟢 部分人认为在特定任务定义下，当前 AI 确实已超越多数人类
🔴 The Verge 评论区高赞："Anything can be AGI if you're vague enough in defining it"

**信源：** [The Verge](https://www.theverge.com/ai-artificial-intelligence/899086/jensen-huang-nvidia-agi)

**关联行动：** 关注 AGI 定义对 OpenAI-Microsoft 合同的法律影响。

---

### 3. Sam Altman 退出 Helion 董事会，OpenAI 洽购核聚变电力

**[产业动态 | 能源]**

Sam Altman 宣布辞去核聚变创业公司 Helion Energy 董事长一职，同时 Axios 报道 OpenAI 正与 Helion 进行"高级谈判"购买电力。Altman 此举旨在规避利益冲突——他同时是 Helion 的大股东和 OpenAI 的 CEO。

**技术/产业意义：** AI 算力的能源瓶颈日益突出。OpenAI 寻求核聚变电力表明头部 AI 公司正从数据中心建设延伸到能源基础设施布局。但核聚变商业化仍需重大科学突破，这笔交易更多是长期战略锁定而非近期实用方案。

**评论观察：**
🟢 表明 AI 公司对清洁能源的长期承诺
🔴 "Sam Altman 的 AI 公司从 Sam Altman 的聚变公司买电"——利益冲突仍存

**信源：** [The Verge](https://www.theverge.com/ai-artificial-intelligence) / [Reuters](https://www.reuters.com/sustainability/boards-policy-regulation/openai-ceo-sam-altman-exits-helion-energys-board-firms-explore-partnership-2026-03-23/)

**关联行动：** 关注 Helion 的技术里程碑时间线及其他 AI 公司的能源布局。

---

### 4. Hypura：在 32GB Mac 上跑 1T 参数模型的 NVMe 分层推理调度器

**[工程实践 | 端侧推理]**

Hypura 是一个面向 Apple Silicon 的存储分层感知 LLM 推理调度器，能根据 GPU 工作集、RAM 和 NVMe 带宽自动优化 tensor 放置。核心创新包括：MoE 场景下的路由拦截（仅加载实际激活的 expert，减少 75% I/O）、99.5% 命中率的 neuron cache、自动调节的预取深度。实测 32GB Mac Mini 上以 2.2 tok/s 运行 31GB Mixtral 8x7B，原生 llama.cpp 直接 OOM crash。

**技术/产业意义：** 延续了端侧大模型推理的技术路线。与上期 anemll 的 iPhone 400B LLM 方向一致——通过更聪明的内存管理突破物理内存瓶颈。Hypura 的方法论也适用于未来更大的消费级 MoE 模型。

**评论观察：**
🟢 HN 90+ 点，社区兴奋度很高，"终于可以在笔记本上试 70B 了"
🔴 0.3 tok/s 的 70B 推理速度对实际使用仍然太慢

**信源：** [GitHub - t8/hypura](https://github.com/t8/hypura)

**关联行动：** Mac 用户可尝试用 Hypura 运行超出物理内存的模型。

---

### 5. LongCat-Flash-Prover：560B MoE 开源形式化定理证明模型

**[研究 | 形式推理]**

来自 Meituan 的 LongCat-Flash-Prover 是一个 560B 参数开源 MoE 模型，专攻原生形式推理（native formal reasoning），通过 Agentic Tool-Integrated Reinforcement Learning 将工具使用与推理深度融合。模型能在 Lean/Isabelle 等形式化验证环境中自主调用证明策略。

**技术/产业意义：** 形式化证明是 AI 推理能力的终极试金石。560B 开源 MoE 在这一方向的投入表明中国 AI 公司（美团）正在数学推理领域进行大规模资源投入。与 Leanstral、AlphaProof 等形成竞争格局。

**评论观察：**
🟢 HuggingFace 今日热榜第 3，开源社区关注度高
🔴 560B MoE 的实际部署成本和复现难度不低

**信源：** [arXiv:2603.21065](https://arxiv.org/abs/2603.21065)

**关联行动：** 关注其在 miniF2F 和 ProofNet 上的具体 benchmark 表现。

---

### 6. GDDS：离散扩散首次在大规模离散生成任务上超越自回归模型

**[研究 | 生成模型]**

GDDS（Generalized Discrete Diffusion from Snapshots）提出了一个统一的离散扩散建模框架，支持大离散状态空间上的任意噪声过程。核心创新是基于"快照隐变量"（snapshot latents）而非完整噪声路径推导 ELBO，大幅提升训练效率。实验表明 GDDS 在训练效率和生成质量上均超越现有离散扩散方法，并**首次在此规模上击败自回归模型**。

**技术/产业意义：** 自回归范式在离散序列生成中的统治地位首次受到实质性挑战。如果离散扩散能在更大规模和更多任务上保持优势，可能重塑 LLM 的基础架构选择。

**评论观察：**
🟢 理论优雅，snapshot ELBO 的推导简化了离散扩散的训练复杂度
🔴 是否能扩展到 LLM 级别的序列长度和词汇量仍需验证

**信源：** [arXiv:2603.21342](https://arxiv.org/abs/2603.21342)

**关联行动：** 研究者应关注其代码和 blog post：https://oussamazekri.fr/gdds

---

### 7. OpenResearcher：全开源深度研究 Agent 训练流水线

**[工程实践 | Agent]**

TIGER-AI-Lab 发布 OpenResearcher，一个完全可复现的深度研究 Agent 训练流水线。通过离线 15M 文档语料库和三个浏览器原语（search/open/find），使用 GPT-OSS-120B 合成超 97K 条轨迹（含 100+ 工具调用的长序列）。30B-A3B 模型经 SFT 后在 BrowseComp-Plus 上达到 54.8% 准确率（+34.0 点提升）。

**技术/产业意义：** 深度研究 Agent 训练一直依赖昂贵的在线 API 调用。OpenResearcher 的离线环境方案大幅降低了成本并提高了可控性。对于想构建类 Perplexity/Gemini Deep Research 产品的团队极具参考价值。

**评论观察：**
🟢 全套开源（流水线+轨迹+checkpoint+离线环境），复现门槛低
🔴 离线语料库的时效性限制了对实时信息检索能力的评估

**信源：** [arXiv:2603.20278](https://arxiv.org/abs/2603.20278) / [GitHub](https://github.com/TIGER-AI-Lab/OpenResearcher)

**关联行动：** 构建深度研究产品的团队应考虑采用此流水线。

---

### 8. 高阶 DoRA 优化：分解范数 + 融合核让 VLM 微调省 7GB 显存

**[工程实践 | 训练优化]**

本文针对 DoRA（Weight-Decomposed Low-Rank Adaptation）在高 rank 时的显存瓶颈提出两个系统级贡献：(1) 分解范数（factored norm）将 O(d_out × d_in) 的密集乘积简化为 O(d_out × r + r²)，消除了 512MB/模块的临时显存开销；(2) 融合 Triton 核将 4 个 kernel 合并为单次 pass，减少约 4× 内存流量。在 6 个 8-32B VLM 上（RTX 6000 PRO/H200/B200），推理加速 1.5-2.0×，梯度计算加速 1.5-1.9×，峰值显存降低最多 7GB。

**技术/产业意义：** DoRA 作为 LoRA 的增强版本在实践中因高 rank 的显存开销而受限。本工作直接解决了这一工程瓶颈，使高 rank DoRA 在单 GPU 上变得可行，对 VLM 微调实践有直接影响。

**评论观察：**
🟢 工程贡献扎实，跨 4 代 GPU 架构验证，精度损失可忽略（cos sim > 0.9999）
🔴 仅聚焦 DoRA，对其他 PEFT 方法的泛化性未探讨

**信源：** [arXiv:2603.22276](https://arxiv.org/abs/2603.22276)

**关联行动：** VLM 微调实践者应关注此优化并集成到训练流程中。

---

### 9. mSFT：过拟合感知的多任务 SFT 数据混合搜索算法

**[研究 | 训练方法]**

mSFT 提出了一种迭代式、过拟合感知的多任务数据混合搜索算法。核心思路：在活跃混合上训练→检测最早过拟合的子数据集→回退到该数据集的最优检查点→排除该数据集继续训练。在 10 个 benchmark、6 个基座模型上一致超越 4 个基线方法。在低计算预算下，mSFT 甚至能在降低训练 FLOP 的同时提升性能。

**技术/产业意义：** 多任务 SFT 中的异构学习动态（快学习任务早过拟合、慢学习任务欠拟合）是业界共识但缺乏系统解决方案。mSFT 提供了一个实用且通用的算法框架。

**评论观察：**
🟢 方法简洁，只引入一个超参数，对数据集规模和任务粒度鲁棒
🔴 迭代搜索增加了训练管理的复杂度

**信源：** [arXiv:2603.21606](https://arxiv.org/abs/2603.21606)

**关联行动：** 进行多任务 SFT 的团队应考虑替换均匀混合策略。

---

### 10. PivotRL：低成本实现高精度 Agentic 后训练

**[研究 | Agent 训练]**

PivotRL 提出了一种融合 SFT 计算效率和端到端 RL OOD 泛化能力的新框架。核心机制：在现有 SFT 轨迹上执行局部 on-policy rollout，筛选"pivot"——信息量最大的中间转折点，仅对这些关键点进行 RL 优化。避免了端到端 RL 的高昂多轮 rollout 成本。

**技术/产业意义：** Agentic 任务的后训练面临效率-泛化权衡。PivotRL 的 pivot 概念为长序列 Agent 训练提供了新的采样策略思路，对 coding agent、web agent 等长链任务场景尤为相关。

**评论观察：**
🟢 计算效率与 SFT 相当，OOD 泛化与端到端 RL 相当
🔴 pivot 的检测质量直接影响最终效果，可能需要任务特定的调优

**信源：** [arXiv:2603.21383](https://arxiv.org/abs/2603.21383)

**关联行动：** Agent 训练研究者应关注 pivot 采样策略在不同任务上的表现。

---

### 11. RLVR 更新方向分析：方向比幅度更重要

**[研究 | 推理训练]**

本文对 RLVR（Reinforcement Learning with Verifiable Rewards）的训练效果从**方向**而非幅度角度进行分析。通过 token 级 log 概率差分 ΔlogP 的统计分析和 token 替换干预实验，发现 RLVR 更新的方向模式——哪些 token 被增强、哪些被抑制——比变化幅度更好地解释了推理能力的提升。

**技术/产业意义：** RLVR 已成为提升 LLM 推理能力的标准方法（DeepSeek-R1、QwQ 等），但其内在机制仍不清楚。本文提供了一个新的分析视角，对优化 RLVR 训练策略有直接指导意义。

**评论观察：**
🟢 分析方法论值得借鉴，token 替换干预实验设计巧妙
🔴 分析局限于特定模型，泛化性需更多验证

**信源：** [arXiv:2603.22117](https://arxiv.org/abs/2603.22117)

**关联行动：** RLVR 训练实践者可据此调整奖励信号的设计方向。

---

### 12. BubbleRAG：黑箱知识图谱上的训练免费 Graph RAG

**[工程实践 | RAG]**

BubbleRAG 将黑箱知识图谱上的检索形式化为最优信息子图检索（OISR）问题并证明其 NP-hard。提出语义锚点分组 + 启发式气泡扩展 + 推理感知扩展的多阶段 pipeline，在多跳 QA benchmark 上达到 SOTA，且完全 training-free、即插即用。

**技术/产业意义：** 企业场景中知识图谱往往是"黑箱"——schema 和结构未知。BubbleRAG 直接解决了这一实际痛点，对企业级 RAG 系统有直接应用价值。

**评论观察：**
🟢 理论基础扎实（NP-hard 证明），工程方案实用
🔴 对超大规模图谱的扩展性待验证

**信源：** [arXiv:2603.20309](https://arxiv.org/abs/2603.20309)

**关联行动：** 企业 RAG 场景可考虑集成 BubbleRAG 作为知识图谱检索层。

---

### 13. SAGE-GRPO：流形感知探索让视频生成 RL 对齐终于稳定

**[研究 | 视频生成]**

FlowGRPO 等视频生成 RL 方法远不如语言/图像对应方法可靠。SAGE-GRPO 将问题定位为 ODE-to-SDE 转换注入过量噪声导致 rollout 质量下降。提出微观（对数曲率校正 SDE + 梯度范数均衡器）和宏观（双信赖域 + 周期移动锚点）两级约束，将探索限制在预训练模型定义的有效视频流形附近。

**技术/产业意义：** 视频生成的 RL 对齐是当前多模态生成的关键瓶颈。SAGE-GRPO 的流形约束思路对其他连续空间的 GRPO 应用也有借鉴意义。

**评论观察：**
🟢 理论推导严谨，对流形偏离问题的诊断精准
🔴 额外约束是否会过度限制探索空间需长期观察

**信源：** [arXiv:2603.21872](https://arxiv.org/abs/2603.21872)

**关联行动：** 视频生成团队应评估 SAGE-GRPO 作为 RLHF 替代方案。

---

### 14. WebinarTV 未经同意抓取 Zoom 会议生成 AI 播客内容

**[产业动态 | AI 伦理]**

据 404 Media 报道，WebinarTV 平台正在抓取公开的 Zoom 会议链接，将录制内容转化为其平台上的播客内容，未告知参与者也未支付任何费用。自动化播客生成工具的泛滥催生了这一"不可避免的悲剧结果"。

**技术/产业意义：** AI 内容生成工具降低了内容盗版的门槛。从训练数据版权到生成内容的知识产权，AI 内容伦理问题正在加速涌现。

**评论观察：**
🟢 推动了对 AI 内容生成伦理边界的讨论
🔴 执法和监管框架远落后于技术发展速度

**信源：** [The Verge](https://www.theverge.com/ai-artificial-intelligence)

**关联行动：** 注意在线会议的隐私设置，避免公开链接。

---

### 15. RoboAlign：用 RL 对齐弥合 VLA 中语言与动作的模态鸿沟

**[研究 | 具身智能]**

RoboAlign 提出系统性的 MLLM 训练框架以可靠地提升 VLA（视觉-语言-动作模型）性能。核心思路：通过零样本自然语言推理采样动作 token，然后用 RL 优化推理过程以提升动作准确性。用不到 1% 的数据量进行 RL 对齐，在 LIBERO/CALVIN/真实世界环境分别实现 17.5%/18.9%/106.6% 的性能提升。

**技术/产业意义：** 语言推理到低层动作的模态鸿沟是 VLA 的核心难题。RoboAlign 证明少量 RL 对齐即可大幅提升效果，对具身 AI 产品化有直接推动作用。

**评论观察：**
🟢 真实世界环境 106.6% 的提升幅度引人注目
🔴 依赖扩散式动作头，对部署延迟有影响

**信源：** [arXiv:2603.21341](https://arxiv.org/abs/2603.21341)

**关联行动：** 机器人团队应关注 RoboAlign 在具体硬件平台上的适配。

---

### 16. GitHub Trending：pascalorg/editor 日增 1500+ Star

**[生态/社区 | 开源]**

今日 GitHub Trending 亮点：

| 项目 | Stars | 日增 | 简介 |
|------|-------|------|------|
| [pascalorg/editor](https://github.com/pascalorg/editor) | 4,774 | +1,513 | 新型代码编辑器 |
| [bytedance/deer-flow](https://github.com/bytedance/deer-flow) | 42,688 | +4,319 | 字节跳动开源 SuperAgent |
| [ruvnet/ruflo](https://github.com/ruvnet/ruflo) | 24,775 | +1,397 | Claude 多 Agent 编排平台 |
| [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | 12,312 | +1,251 | 可成长 Agent |
| [supermemoryai/supermemory](https://github.com/supermemoryai/supermemory) | 18,414 | +407 | AI 时代的记忆引擎 |
| [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | 5,261 | +208 | 多源话题研究 Agent 技能 |

deer-flow 持续霸榜（累计 42.7K），Agent 生态持续火热。ruflo 作为 Claude Agent 编排平台快速崛起。

**信源：** [GitHub Trending](https://github.com/trending)

**关联行动：** 关注 deer-flow 和 ruflo 的架构设计思路。

---

## 下期追踪问题

1. **LiteLLM 供应链攻击的影响范围？** 有多少生产环境受影响？BerriAI 的事后响应如何？PyPI 是否推出新的 .pth 文件安全策略？
2. **GDDS 离散扩散 vs 自回归的扩展性？** 能否在 LLM 级别（数十亿参数、万级序列长度）保持优势？
3. **OpenAI-Helion 核聚变交易的具体条款和时间线？** Altman 退出 Helion 董事会后利益冲突是否真正消除？
