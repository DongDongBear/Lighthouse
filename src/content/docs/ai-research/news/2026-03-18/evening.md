---
title: "2026-03-18 晚报 | Snowflake AI 沙箱逃逸敲响安全警钟，Stripe 推出机器支付协议 MPP 开启 Agent 经济新纪元"
description: "Snowflake Cortex 沙箱逃逸, Stripe MPP 机器支付协议, Pentagon vs Anthropic, Sony Protective AI, Jensen DLSS 5 回应, Chain-of-Steps 视频推理, Online Experiential Learning, SWE-Skills-Bench, Omnilingual MT 1600语言, superpowers 框架, Meta 旗舰店, 反AI标签标准"
sidebar:
  order: 20260319
---

> 📅 2026年3月18日 晚间版 | 北京时间 02:00

## 上期追踪问题跟进

**1. Vera Rubin 首批部署客户和 token 成本基准测试？**
GTC 后暂无新客户部署消息。Jensen 在接受采访时继续强调"推理之王"叙事，但 Vera Rubin 实际 token 成本基准仍待发布。云厂商采用时间表预计 Q2 开始陆续公布。

**2. OpenAI 砍掉 Sora/Atlas/硬件后的编码产品线发布计划？**
OpenAI 官网今日无新动态。The Verge 报道其"削减副线项目"战略持续执行。编码产品线时间表仍不明朗。

**3. Moltbook TOS 中 Agent 责任条款的法律挑战？**
尚无公开法律案例。但今日 Snowflake Cortex 沙箱逃逸事件为 Agent 安全责任讨论提供了新的现实案例——当 AI Agent 被恶意利用执行破坏性操作时，责任归属问题更加复杂。

---

## 1. 🔒 Snowflake Cortex AI 逃逸沙箱并执行恶意代码

**事件概述：** PromptArmor 安全团队发现 Snowflake 的 Cortex Code CLI（类似 Claude Code 的命令行编码 Agent）存在严重安全漏洞：通过间接提示注入，攻击者可以绕过人工审批环节，在沙箱外执行任意命令。演示中，恶意脚本成功窃取了 Snowflake 的缓存凭证，执行了数据窃取和表删除操作。

**技术/产业意义：** 这是首个针对企业级编码 Agent 的完整攻击链公开披露。它暴露了当前 AI Agent 安全架构中的根本缺陷：命令验证系统无法处理 shell 进程替换表达式中的嵌套命令。

**深度分析：** 攻击链的关键在于利用 process substitution（`<(command)`）绕过命令验证。这不是 LLM 本身的问题，而是工程实现的疏忽。但更深层的问题是：几乎所有编码 Agent 都面临类似的攻击面——从不可信数据源（README、MCP 响应、搜索结果）摄入提示注入。Snowflake 在两天内发现并在 v1.0.25 中修复，但此事件为所有 Agent 开发者敲响警钟。

**评论观察：**
- 🟢 Snowflake 响应迅速，披露透明，修复及时（v1.0.25，2月28日发布）
- 🔴 攻击面是结构性的——任何处理不可信输入的 Agent 都可能存在类似漏洞，"workspace trust" 机制缺失是通病

**信源链接：** https://www.promptarmor.com/resources/snowflake-ai-escapes-sandbox-and-executes-malware

**关联行动：** 审查你使用的编码 Agent 的沙箱机制，特别是命令验证是否覆盖了 shell 元编程特性。

---

## 2. 💰 Stripe 推出机器支付协议（MPP）：Agent 经济的基础设施

**事件概述：** Stripe 联合 Tempo 发布 Machine Payments Protocol（MPP），一个开放标准的 Agent 支付协议。Agent 可以通过程序化方式完成微交易、订阅付费，无需导航人类设计的网页或手动输入支付信息。已有 Browserbase（按 session 付费）、PostalForm（Agent 打印寄信）、Prospect Butcher Co.（Agent 点三明治）等早期用例。

**技术/产业意义：** 这标志着 Agent 经济从概念走向基础设施。当 Agent 能自主完成支付，人类在商业交易中的角色将从"操作者"变为"审批者"，商业模式也将从 B2C 扩展到 B2A（Business-to-Agent）。

**深度分析：** MPP 的核心设计是让 HTTP 可寻址的任意端点都能接受 Agent 付款。它支持法币（信用卡、BNPL）和稳定币，通过 Shared Payment Tokens 实现跨 Agent 的支付凭证共享。与 MCP 的集成意味着 Agent 可以在调用外部工具时无缝完成付费。更值得关注的是 Stripe 同时推进 ACP（Agentic Commerce Protocol）和 x402 支持——Agent 支付标准的竞争已经开始。

**评论观察：**
- 🟢 "Agent 点三明治"听起来搞笑，但 Browserbase 按 session 计费才是真正的 killer app——Agent 自主采购算力和工具
- 🔴 安全问题：Agent 自主花钱的授权边界在哪里？谁为 Agent 的"冲动消费"负责？

**信源链接：** https://stripe.com/blog/machine-payments-protocol | https://mpp.dev/

**关联行动：** 如果你在做 Agent 工具或 API，考虑接入 MPP——Agent 经济的早期窗口正在打开。

---

## 3. ⚖️ 美国国防部反诉 Anthropic：AI 国家安全之争升级

**事件概述：** Anthropic 本月早些时候因被五角大楼标记为"供应链风险"而提起诉讼。今日五角大楼提交了反驳文件，指控 Anthropic 可能在感知"红线被越过"时"试图禁用其技术或预先改变模型行为"，包括"在作战行动期间"。国防部认为这构成"不可接受的国家安全风险"。

**技术/产业意义：** 这是 AI 安全价值观与国家安全需求之间的根本性冲突首次在法庭上正面交锋。它暴露了一个核心悖论：AI 公司越是强调安全和可控性，军方就越担心这种"可控性"会在关键时刻被用来对抗用户。

**深度分析：** 五角大楼的论点直指 Anthropic 的 Constitutional AI 理念——如果模型被设计为在某些情况下拒绝执行，那么在军事场景中这种"拒绝权"是否构成安全风险？这个案件可能重塑整个 AI 行业与政府的合作框架。对其他 AI 公司的启示是：安全承诺可能成为获取政府合同的双刃剑。

**评论观察：**
- 🟢 Anthropic 的立场体现了 AI 公司对安全底线的坚守，这正是负责任 AI 的核心
- 🔴 如果法院认定 AI 公司的安全机制是"供应链风险"，将对整个行业的安全实践产生寒蝉效应

**信源链接：** https://www.courtlistener.com/docket/72379655/96/anthropic-pbc-v-us-department-of-war/

**关联行动：** 关注此案后续裁决，它将成为 AI 安全与国家安全边界的标杆性判例。

---

## 4. 🎬 Sony 训练"保护性 AI"对抗吉卜力风格 AI 生成

**事件概述：** Sony R&D 部门正在训练一个"Protective AI"模型，使用吉卜力工作室的电影内容。目标是最终阻止 AI 生成工具模仿受保护的艺术风格。此举与 OpenAI ChatGPT 引发的吉卜力风格图片生成热潮直接相关。

**技术/产业意义：** 这是版权方首次用 AI 对抗 AI 的策略——训练专门的模型来检测和阻止风格模仿。如果成功，这可能成为内容保护的新范式：不是通过法律诉讼，而是通过技术手段直接阻断侵权。

**深度分析：** Sony 拥有吉卜力在美国的发行权，有充分的商业动机。但"风格"的可保护性在法律上仍存争议——你不能版权一种画风。Sony 的方法更像是技术护城河而非法律武器。值得关注的是，这种"以 AI 制 AI"的策略能否推广到音乐、文字等其他创意领域。

**评论观察：**
- 🟢 内容方终于从被动防御转向主动技术对抗，而不仅仅依赖法律
- 🔴 "风格保护"的技术边界在哪里？过于激进可能阻碍正常的艺术灵感借鉴

**信源链接：** https://www.theverge.com/ai-artificial-intelligence

**关联行动：** 关注 Sony Protective AI 的技术细节发布和首批应用场景。

---

## 5. 🎮 Jensen Huang 回应 DLSS 5 质疑："他们完全错了"

**事件概述：** GTC 2026 发布的 DLSS 5 神经渲染技术遭到玩家社区的批评后，Jensen Huang 接受采访时强硬回应："他们完全错了。" 他强调 DLSS 5 将几何、纹理的可控性与生成式 AI 相融合，开发者可以对生成式 AI 进行微调，而非简单的"AI 画面替换"。

**技术/产业意义：** 这场争论反映了 AI 渲染在游戏领域的采纳困境：技术上可能是革命性的，但玩家对"AI 生成的画面"存在本能抵触——他们想看到的是精心设计的艺术，而非算法输出。

**深度分析：** Jensen 的核心论点是 DLSS 5 保留了开发者控制权，这与玩家担心的"AI 一刀切美化"不同。但从 The Verge 的报道看，"AI 同质化面孔已经入侵游戏"的文章获得了大量关注。这不仅是技术问题，更是审美和文化认同问题。NVIDIA 需要证明 AI 渲染可以增强艺术多样性，而不是消灭它。

**评论观察：**
- 🟢 如果开发者能精细控制 AI 渲染效果，DLSS 5 确实可能带来图形飞跃
- 🔴 "AI 面孔同质化"的担忧不是技术问题能解决的——需要设计理念的改变

**信源链接：** https://www.tomshardware.com/pc-components/gpus/jensen-huang-says-gamers-are-completely-wrong-about-dlss-5-nvidia-ceo-responds-to-dlss-5-backlash

**关联行动：** 等待首批 DLSS 5 游戏对比评测，用实际画面效果回应质疑。

---

## 6. 🔬 Chain-of-Steps：视频扩散模型的推理机制被重新发现

**事件概述：** 来自 Ziwei Liu 团队的新论文挑战了此前关于视频扩散模型推理能力的主流解释。此前认为推理沿"帧链"（Chain-of-Frames）逐帧展开，但新研究发现推理实际上主要沿去噪步骤展开——模型在早期去噪步骤探索多个候选答案，然后逐步收敛到最终结果，这被称为"步骤链"（Chain-of-Steps）。

**技术/产业意义：** 这重新定义了我们对扩散模型"智能"的理解。如果推理发生在去噪维度而非时间维度，那么优化推理能力的方向应该是调整去噪调度策略，而不是增加视频帧数。

**深度分析：** 论文还发现了三种涌现行为：工作记忆（跨步骤持久参考）、自我纠正（从错误中间结果恢复）、先感知后行动（早期步骤建立语义基础，后期步骤执行结构化操作）。这些特性与 LLM 的 Chain-of-Thought 推理惊人地相似，暗示了扩散模型和自回归模型可能共享某种深层推理机制。

**评论观察：**
- 🟢 为扩散模型的"思考"能力提供了更准确的理论框架
- 🔴 实验主要基于特定任务（数学谜题、棋盘推理），在复杂开放域视频中是否成立需要验证

**信源链接：** https://arxiv.org/abs/2603.16870

**关联行动：** 关注该发现是否影响视频生成模型（如 Sora 后继）的架构设计。

---

## 7. 📚 Online Experiential Learning：LLM 从部署经验中持续学习

**事件概述：** 微软研究团队提出 OEL（Online Experiential Learning）框架，让语言模型从真实部署中的交互轨迹中持续学习。框架分两阶段：先从用户侧交互中提取可迁移的经验知识，再通过 on-policy context distillation 将知识固化到模型参数中，无需访问用户环境。

**技术/产业意义：** 这是离"会学习的 AI"最近的一步。当前 LLM 的知识在训练后就冻结了，OEL 打破了这个限制，让模型在部署中越用越好。

**深度分析：** OEL 的关键创新是解耦了"经验采集"和"知识固化"——前者在用户侧完成（隐私友好），后者在模型侧完成（不需要用户数据原始内容）。在文本游戏环境中，OEL 在多轮迭代后持续提升准确率和 token 效率，同时保持分布外泛化能力。但从实验规模看，距离在生产级 LLM 上应用还有很长的路。

**评论观察：**
- 🟢 经验提取与参数更新解耦的设计在隐私和效率间取得了优雅平衡
- 🔴 文本游戏环境过于简化，复杂真实场景下的效果存疑

**信源链接：** https://arxiv.org/abs/2603.16856

**关联行动：** 关注 OEL 在更复杂任务（如 Agent 工具调用、代码生成）上的验证实验。

---

## 8. 📊 SWE-Skills-Bench：Agent Skills 在真实软件工程中几乎无效

**事件概述：** 一项针对 49 个公开 SWE Agent Skills 的系统评估显示，39 个（80%）对通过率零改善，平均提升仅 +1.2%。部分 skill 的 token 开销增加了 451%，而通过率不变。只有 7 个高度专业化的 skill 产生了有意义的改善。

**技术/产业意义：** 这对当前火热的"Agent Skills"生态泼了一盆冷水。大量 skill 可能只是结构化的提示模板，并未给 LLM 提供真正的知识增量。

**深度分析：** 论文提出了一个关键洞察：有效的 skill 需要包含"模型不可能通过上下文学习获得的专业知识"——比如特定框架的非直觉 API 模式、隐含的工程约定。大多数 skill 只是把显而易见的步骤形式化了，而 LLM 本身就知道这些。这对 skill 设计者的启示是：skill 应该编码那些"反直觉"的领域知识。

**评论观察：**
- 🟢 严格的 paired evaluation 方法论值得借鉴——有对照组的 skill 评估才有意义
- 🔴 49 个 skill 的样本可能不够全面，顶级私有 skill 的效果可能不同

**信源链接：** https://arxiv.org/abs/2603.15401

**关联行动：** 审视你现有的 Agent Skills——它们是否真正编码了模型无法推断的专业知识？

---

## 9. 🌍 Omnilingual MT：Meta 实现 1,600 种语言的机器翻译

**事件概述：** Meta 的 Omnilingual MT 团队发布了支持 1,600 种语言的机器翻译系统。这是目前覆盖语言最广的翻译模型，涵盖了大量低资源语言，包括英国凯尔特语系（康沃尔语、爱尔兰语、苏格兰盖尔语等）。

**技术/产业意义：** 从 NLLB（200 种语言）到 1,600 种，Meta 在语言覆盖上实现了 8 倍扩展。这对全球数字包容性的影响不可低估——全球约 7,000 种语言中，绝大多数缺乏任何 NLP 支持。

**深度分析：** 1,600 种语言中很多没有大规模平行语料，模型必须依赖跨语言迁移学习和多语言预训练来补偿数据稀缺。核心挑战是低资源语言的翻译质量——覆盖广度和翻译精度之间的权衡。这项工作延续了 Meta AI 在开源多语言模型上的战略布局。

**评论观察：**
- 🟢 数字语言保护的里程碑——让濒危语言也能接入 AI 生态
- 🔴 低资源语言的翻译质量如何？覆盖率不等于可用性

**信源链接：** https://arxiv.org/abs/2603.16309

**关联行动：** 关注模型开源后在低资源语言社区的实际采用和质量反馈。

---

## 10. 🤖 MiroThinker-1.7 & H1：通过验证驱动的重量级研究 Agent

**事件概述：** MiroMind 团队发布 MiroThinker-1.7 和 H1 研究 Agent，核心理念是"通过验证实现可靠的研究自动化"。H1 定位为"重量级研究 Agent"——能处理复杂的多步骤研究任务，通过内置验证机制确保每一步推理的可靠性。

**技术/产业意义：** 研究自动化是 Agent 领域的"圣杯"之一。如果 Agent 能可靠地执行文献综述、假设检验、实验设计等研究任务，将根本性地改变科学研究的生产力。

**深度分析：** "验证驱动"的方法论与 Anthropic 的 Constitutional AI 和 Mistral 的形式化验证（Leanstral）异曲同工——都试图在 Agent 的推理链中加入检验点。关键问题是验证本身的成本和可靠性：谁来验证验证器？

**评论观察：**
- 🟢 在研究场景中引入形式化验证是降低幻觉风险的正确方向
- 🔴 "重量级"意味着高算力需求，实际研究场景中的性价比如何？

**信源链接：** https://arxiv.org/abs/2603.15726

**关联行动：** 关注 H1 在标准研究基准（如 GAIA、ScienceQA）上的表现。

---

## 11. 🛠️ GitHub Trending：superpowers 日增 4,000+ Stars，Agent 框架军备竞赛加速

**事件概述：** 三个 Agent 相关项目霸占 GitHub Trending 榜单：**superpowers**（95K stars，日增 4,091）是一个"agentic skills framework & software development methodology"；**langchain-ai/open-swe**（6.1K stars，日增 454）是 LangChain 的异步编码 Agent；**claude-hud**（6.6K stars，日增 1,040）是 Claude Code 的可视化插件。

**技术/产业意义：** Agent 开发框架的爆发式增长反映了两个趋势：(1) 开发者正在从"用 AI"转向"构建 AI Agent"；(2) Agent 开发的工具链正在标准化。superpowers 的 95K stars 已达到主流框架级别。

**深度分析：** 值得注意的是 superpowers 定位为"methodology"而不仅仅是"framework"——它试图定义 Agent 驱动软件开发的完整方法论。结合前面 SWE-Skills-Bench 的研究结论（大多数 skill 无效），这提出了一个有趣的问题：superpowers 是否真正解决了 skill 有效性的问题？还是只是另一个热度泡沫？

**评论观察：**
- 🟢 开源 Agent 生态的繁荣为整个行业降低了门槛
- 🔴 日增数千 Stars 的热度曲线可能包含大量 "star and forget" 行为

**信源链接：** https://github.com/obra/superpowers | https://github.com/langchain-ai/open-swe | https://github.com/jarrodwatts/claude-hud

**关联行动：** 评估 superpowers 的方法论是否适合你的团队——特别是其 skill 设计理念。

---

## 12. 📄 Qianfan-OCR：4B 参数统一文档智能模型 + Layout-as-Thought

**事件概述：** 百度千帆团队发布 Qianfan-OCR，一个 4B 参数的端到端视觉语言模型，统一了文档解析、布局分析和文档理解。创新点是"Layout-as-Thought"——通过特殊 think token 触发可选的布局思考阶段，在推理时生成结构化布局表示（边框、元素类型、阅读顺序），解决了端到端 OCR 丢失显式布局分析的问题。

**技术/产业意义：** 文档智能是企业 AI 落地最实际的场景之一。4B 参数意味着可以在消费级硬件上运行，Layout-as-Thought 则在效率和准确性之间提供了灵活的权衡。

**深度分析：** Layout-as-Thought 的精妙之处在于"可选性"——对简单文档可以跳过布局分析直接输出，对复杂表格和图表则自动触发详细的空间推理。这比强制所有文档经过完整 pipeline 更高效。在实际应用中，文档 OCR 的痛点不是"能不能识别"，而是"布局还原的准确性"——特别是复杂表格和多栏排版。

**评论观察：**
- 🟢 4B 参数 + 端到端架构，部署门槛极低，有望成为企业文档处理的默认选择
- 🔴 中文复杂排版（竖排、文图混排）的效果需要更多验证

**信源链接：** https://arxiv.org/abs/2603.13398

**关联行动：** 如果你在做文档处理相关产品，值得在内部数据集上对比测试 Qianfan-OCR vs 现有方案。

---

## 13. 🏷️ 八个"人类制作"标签倡议互不兼容，反 AI 标准碎片化

**事件概述：** BBC News 统计发现，目前至少有 8 个不同的倡议试图建立区分人类创作和 AI 创作的标签标准。专家呼吁必须统一标准以避免消费者困惑，但就"什么算'人类制作'"达成共识极其困难——因为 AI 已经融入了太多创作工具。

**技术/产业意义：** 这与历史上的"有机食品"认证标准碎片化如出一辙。如果不能快速统一标准，"人类制作"标签将失去信用，反而有利于 AI 内容的正常化。

**深度分析：** 核心难题在于光谱式的 AI 介入——用 Photoshop 的 AI 修图算不算？用 Grammarly 润色算不算？用 AI 生成初稿然后人类大幅修改算不算？这些灰色地带让"二分法"标签注定失败。更可行的方向可能是"AI 参与度披露"而非"有无 AI"的二元判断。

**评论观察：**
- 🟢 消费者确实需要知情权，尤其在新闻和教育内容领域
- 🔴 标准碎片化比没有标准更糟糕——可能导致"认证疲劳"

**信源链接：** https://www.bbc.co.uk/news/articles/cj0d6el50ppo

**关联行动：** 关注是否有国际标准化组织（ISO/W3C）介入统一标准。

---

## 14. 🏬 Meta Lab NYC 从快闪店升级为永久旗舰店

**事件概述：** Meta 宣布其位于纽约曼哈顿第五大道的 Meta Lab NYC 从临时快闪店升级为"永久旗舰店"，主要销售 AI 智能眼镜和 Meta Quest 头显。同时计划在拉斯维加斯 Wynn 和西好莱坞开设新店。

**技术/产业意义：** 这是 Meta 在硬件零售端加大投入的信号。在 Apple Vision Pro 销量不佳的背景下，Meta 通过低价策略+线下体验抢占 AR/VR 市场的零售渠道。

**深度分析：** 以滑板主题装潢的零售店定位年轻消费群体，与 Apple Store 的极简美学形成差异化。Meta 的 AI 智能眼镜（Ray-Ban Meta）已成为其最成功的硬件产品线之一，永久旗舰店的决定反映了该产品线的商业可持续性。

**评论观察：**
- 🟢 线下体验对 AR/VR 产品至关重要——很多人不试戴不会买
- 🔴 实体零售成本高昂，Meta 能否实现盈亏平衡？

**信源链接：** https://www.meta.com/blog/meta-lab-new-locations-new-york-city-fifth-avenue-wynn-las-vegas-west-hollywood-new-york-ai-glasses-demos/

**关联行动：** 关注 Meta 智能眼镜 Q2 销售数据是否受益于旗舰店策略。

---

## 15. 🔧 TRUST-SQL：多轮 RL + 工具集成，4B 模型 Text-to-SQL 提升 30.6%

**事件概述：** TRUST-SQL 提出了在"未知 Schema"场景下的 Text-to-SQL 新方法。将任务建模为 POMDP，Agent 通过四阶段协议主动发现和验证相关数据表，配合 Dual-Track GRPO 策略在 token 级别分离探索奖励和执行结果。4B 版本在五个基准上平均绝对提升 30.6%。

**技术/产业意义：** 企业数据库通常有数百张表和大量噪声元数据，传统"注入完整 Schema"的方法不可行。TRUST-SQL 让小模型也能在复杂真实数据库上实现可靠的 SQL 生成。

**深度分析：** Dual-Track GRPO 通过 token 级 masked advantage 解决了信用分配问题——探索数据库结构和生成正确 SQL 是两个不同的技能，应该独立奖励。相比标准 GRPO 的 9.9% 相对提升验证了这一设计。4B 模型达到 30.6% 的绝对提升意味着这个方法可能比换更大模型更有效。

**评论观察：**
- 🟢 POMDP 建模 + 工具集成的框架对其他 Agent 任务有借鉴意义
- 🔴 四阶段协议的计算成本和延迟数据没有详细报告

**信源链接：** https://arxiv.org/abs/2603.16448

**关联行动：** 如果你的产品涉及自然语言查询数据库，TRUST-SQL 的方法值得关注。

---

## 16. 🏗️ Newton：NVIDIA Warp 上的 GPU 加速物理仿真引擎

**事件概述：** 开源项目 newton-physics/newton 今日在 GitHub Trending 上出现，这是一个基于 NVIDIA Warp 构建的 GPU 加速物理仿真引擎，专门面向机器人和仿真研究者。结合今日 HuggingFace 热门论文 Kinema4D（4D 机器人世界模拟），具身智能的仿真基础设施正在快速成熟。

**技术/产业意义：** 物理仿真是具身 AI（机器人、自动驾驶）的基础设施。Newton 基于 NVIDIA Warp 意味着深度融入 NVIDIA 生态（CUDA、GR00T），开源定位则降低了研究门槛。

**深度分析：** Kinema4D 的创新在于将机器人控制精确的 URDF 运动学与生成式环境反应建模解耦——机器人运动通过刚体运动学精确控制，环境反应通过扩散模型生成。这解决了纯视频世界模型无法精确控制机器人的核心问题。201K 高质量 4D 标注数据集也是重要贡献。

**评论观察：**
- 🟢 开源仿真引擎 + 大规模数据集，显著降低了具身 AI 的入门门槛
- 🔴 从仿真到真实世界的 sim-to-real gap 仍是核心未解问题

**信源链接：** https://github.com/newton-physics/newton | https://arxiv.org/abs/2603.16669

**关联行动：** 如果你在做机器人研究，尝试 Newton + Kinema4D 的组合。

---

## 2025 图灵奖授予量子信息科学

ACM 宣布 2025 年图灵奖授予量子信息科学领域的研究者。虽然不是 AI 领域，但量子计算与 AI 的交叉在中长期内可能带来范式性突破。详细信息待 ACM 官网恢复访问后更新。

**信源链接：** https://awards.acm.org/about/2025-turing

---

## 本期必学清单

| 类型 | 具体内容 | 理由 |
|------|------|------|
| 🔒 安全 | Snowflake Cortex 沙箱逃逸攻击链 | 所有编码 Agent 都面临的结构性安全风险 |
| 💰 产业 | Stripe MPP 协议规范 | Agent 经济的基础设施标准，早期参与优势明显 |
| 🔬 研究 | Chain-of-Steps 论文 | 重新理解扩散模型推理机制，可能影响未来架构设计 |
| 📊 实证 | SWE-Skills-Bench 评估方法 | 验证你的 Agent Skills 是否真正有效 |

---

## 下期追踪问题

1. **Snowflake 沙箱逃逸事件后，其他编码 Agent（Claude Code、Codex、Cursor）是否会进行类似的安全审计？** 关注 process substitution 和 shell 元编程的攻击面
2. **Stripe MPP 的早期采用数据和首批 Agent-to-Agent 交易案例？** B2A 商业模式的实际验证
3. **Pentagon vs Anthropic 案的初步裁决方向？** 将影响整个 AI 行业与政府合作的法律框架
