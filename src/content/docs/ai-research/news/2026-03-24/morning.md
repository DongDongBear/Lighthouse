---
title: "2026-03-24 上午 ｜ Meta Hyperagents 实现自我改进的自我改进，iPhone 17 Pro 本地跑 400B 大模型，Walmart 实测 ChatGPT 结账转化率暴跌 3 倍"
description: "Hyperagents 自改进 Agent、iPhone 400B LLM、Walmart ChatGPT 转化失败、λ-RLM 长上下文推理、Zuckerberg CEO Agent、Samsung 730亿芯片扩张、MiRA Web Agent RL、Confer Meta 加密、BEAVER 128k 压缩"
---

# 2026-03-24 上午（UTC+8）AI 简报

> **编辑时间：** 2026-03-24 10:00 (UTC+8)  
> **覆盖范围：** 2026-03-23 10:00 ~ 2026-03-24 10:00 (UTC+8)

---

## 上期追踪

**1. Anthropic vs Pentagon 3月24日听证会**  
Pentagon 已向法院提交反驳文件，主张 Anthropic 的诉讼缺乏法律依据。听证会预计今日进行，结果尚未公布。持续关注判决结果。

**2. Confer + Meta AI 加密部署进展**  
Moxie Marlinspike 正式发文确认：Confer 将作为 Meta AI 全线产品的隐私基础设施，不限于聊天——未来 Meta 所有 AI 产品都将建立在 Confer 的加密技术之上。详见下文第 8 条。

**3. Flash-MoE SSD 流式推理推广**  
本期无新进展。社区讨论仍集中在 Mac 平台验证，Windows/Linux 复现尚无公开报告。

---

## 新闻速览

### 1. Meta 开源 Hyperagents：能改进自己改进方式的 AI Agent

**[研究 | Agent 自改进]**

Meta（Facebook Research）发布 Hyperagents 论文及代码。核心创新：将任务 Agent 和元 Agent 合并为单一可编辑程序，使得"改进自身的机制"本身也可以被改进（metacognitive self-modification）。这是对 Darwin Gödel Machine（DGM）的重要扩展——DGM 的自改进能力仅限于编码领域，Hyperagents 消除了这一领域限制。

**技术/产业意义：** 这是 AI 自改进领域的里程碑式工作。DGM-Hyperagents 在跨域任务中持续提升性能，且元级改进（如持久记忆、性能追踪）可跨域迁移和跨运行累积。这意味着 Agent 不仅变得更擅长解决任务，还变得更擅长"变得更擅长"。

**深度分析：** Hyperagents 的关键设计是"自引用"——整个系统（包括修改系统的代码）都是一个可编辑程序。这打破了传统 Agent 框架中元策略固定的瓶颈。实验证明其在多个域上超越无自改进基线和先前自改进系统。但自改进 AI 也引发安全担忧：没有明确的收敛保证，自修改链可能产生不可预测行为。

**评论观察：**  
🟢 AI 研究社区认为这是通向通用自改进 AI 的重要一步，开源代码受到热烈欢迎  
🔴 安全研究者担忧：没有形式化的安全边界，递归自改进可能失控

**信源：** [arXiv:2603.19461](https://arxiv.org/abs/2603.19461) | [GitHub: facebookresearch/Hyperagents](https://github.com/facebookresearch/Hyperagents)

**关联行动：** Agent 开发者应关注 Hyperagents 的自改进架构设计，但部署前需严格评估安全边界。

---

### 2. iPhone 17 Pro 演示本地运行 400B 参数 LLM

**[硬件/算力 | 端侧推理]**

Hacker News 热门（224 分）：anemll 团队在 iPhone 17 Pro 上成功演示运行 400B 参数的大语言模型。这是迄今为止在移动设备上运行的最大规模模型。

**技术/产业意义：** 这标志着端侧 AI 推理能力的又一次飞跃。iPhone 17 Pro 的 Neural Engine + 统一内存架构使得本地运行超大模型成为可能。如果量化和推理优化足够成熟，这将重新定义"手机能做什么"——从云端依赖走向本地优先。

**深度分析：** 具体技术细节尚不完全公开，但很可能使用了激进量化（如 2-4 bit）配合自定义推理引擎。400B 参数即便极端量化也需要 100-200GB 存储和大量内存带宽。实际推理速度和质量是关键验证点——演示和实用之间还有距离。

**评论观察：**  
🟢 HN 社区对移动端 AI 能力的进步感到兴奋，认为这是硬件-软件协同进化的成果  
🔴 质疑实际 token/s 速度和输出质量，可能只是技术演示而非实用部署

**信源：** [Hacker News](https://news.ycombinator.com/item?id=47490070)

**关联行动：** 关注 anemll 后续公开的推理速度和量化方法细节。

---

### 3. Walmart 实测：ChatGPT 结账转化率比网站低 3 倍

**[产业 | AI 商业化]**

Search Engine Land 报道，Walmart 披露其 ChatGPT 集成购物体验的转化率仅为传统网站的 1/3。这是大型零售商首次公开 AI 购物转化数据。Hacker News 上获 295 分高讨论。

**技术/产业意义：** 这是对"AI 将颠覆电商"叙事的重要现实检验。对话式购物的摩擦点在于：用户在聊天界面缺乏视觉浏览、比较和冲动购买的触发条件。结账是高信任操作，用户更倾向于在熟悉的界面完成。

**深度分析：** 3 倍的转化差距不意味着 ChatGPT 购物无用——它可能在前期发现和推荐阶段有价值，但在最终转化环节表现不佳。这暗示 AI 商业化的正确路径可能不是"替代界面"，而是"增强现有界面"。OpenAI 的 Operator 和其他 AI 购物 Agent 都面临同样挑战。

**评论观察：**  
🟢 电商从业者认为这验证了 UI/UX 专长的不可替代性  
🔴 AI 乐观者认为数据不具代表性，体验优化后差距会缩小

**信源：** [Search Engine Land](https://searchengineland.com/walmart-chatgpt-checkout-converted-worse-472071) | [HN Discussion](https://news.ycombinator.com/item?id=47444812)

**关联行动：** 构建 AI 购物产品时，应将 AI 定位为发现/推荐增强层而非替代界面。

---

### 4. λ-RLM：用 λ-演算解决 LLM 长上下文退化问题

**[研究 | 长上下文推理]**

论文提出 λ-RLM 框架，用类型化函数式运行时（基于 λ-演算）替代 LLM 的自由递归代码生成。核心思想：LLM 只负责解决有界的叶子子问题，递归推理变成结构化的函数式程序。在 4 个长上下文任务 × 9 个模型的 36 组对比中，29 组超越标准 RLM，准确率最高提升 +21.9 分，延迟降低 4.1 倍。

**技术/产业意义：** 这是将编程语言理论严格应用于 LLM 推理的罕见范例。λ-RLM 提供了标准 RLM 缺乏的形式化保证：终止性、闭式成本边界、精度随递归深度可控缩放。这对于需要可验证推理的高风险应用（法律、金融、医疗）意义重大。

**深度分析：** 关键洞察是"类型化符号控制 > 开放式递归代码生成"——通过预验证的组合子库和类型系统，将 LLM 的不确定性限制在有界叶节点。这类似于将"全程自动驾驶"降级为"关键路口人工介入"，用结构化约束换取可靠性。

**评论观察：**  
🟢 PL 研究社区兴奋：形式化方法终于在 LLM 领域找到落地场景  
🔴 实际部署可能受限于组合子库的通用性，需要领域特定适配

**信源：** [arXiv:2603.20105](https://arxiv.org/abs/2603.20105) | [GitHub: lambda-calculus-LLM/lambda-RLM](https://github.com/lambda-calculus-LLM/lambda-RLM)

**关联行动：** 长上下文应用开发者应评估 λ-RLM 的组合子库是否可适配自己的场景。

---

### 5. Zuckerberg 正在打造 AI CEO Agent

**[产业 | AI 战略]**

华尔街日报独家报道：Zuckerberg 正在开发一个"CEO Agent"来辅助他管理 Meta。该 Agent 目前主要帮助他快速获取信息——绕过多层汇报链直达答案。项目仍在开发中。

**技术/产业意义：** 这是科技巨头 CEO 首次公开承认使用 AI Agent 辅助战略决策。如果成功，这将开创"AI 辅助 C-Suite"的新范式——不是替代 CEO，而是给 CEO 超能力。考虑到 Zuckerberg 对 AI 的全力押注（Llama 模型、AI 内容审核、Meta AI 产品），这是"吃自己狗粮"的终极表现。

**评论观察：**  
🟢 企业管理者认为这是高管效率提升的未来方向  
🔴 74% 美国人不认可 Zuckerberg 的领导力，AI CEO 可能加剧公众对"算法治理"的不安

**信源：** [WSJ](https://www.wsj.com/tech/ai/mark-zuckerberg-is-building-an-ai-agent-to-help-him-be-ceo-eddab2d5) | [The Verge](https://www.theverge.com/ai-artificial-intelligence)

**关联行动：** 关注 Meta AI 内部工具化路径，这可能影响 Llama 模型的后续优先级。

---

### 6. MiRA：里程碑式 RL 训练将 Gemma3-12B Web Agent 成功率从 6.4% 飙升至 43%

**[研究 | Web Agent]**

Google DeepMind（推测）发布 MiRA 框架：通过子目标分解 + 密集里程碑奖励信号训练 Web 导航 Agent。开源模型 Gemma3-12B 在 WebArena-Lite 上从 6.4% 飞跃至 43.0%，超越 GPT-4-Turbo (17.6%)、GPT-4o (13.9%) 和此前开源 SOTA WebRL (38.4%)。

**技术/产业意义：** 这证明了两个关键点：(1) 开源小模型经过正确的 RL 训练可以超越大型闭源模型执行复杂 Web 任务；(2) 里程碑式密集奖励比稀疏终端奖励对长序列 Agent 任务效果显著更好。43% 成功率虽然离实用仍有距离，但增长曲线令人印象深刻。

**深度分析：** MiRA 的核心设计是将长期任务分解为可验证的子目标里程碑，每个里程碑都提供中间奖励。这解决了 Web Agent RL 训练中"信用分配困难"的核心挑战。推理时的 VLM 引导子目标规划进一步提升了在线表现。

**评论观察：**  
🟢 开源社区兴奋：12B 模型超越 GPT-4 系列在 Web 任务上的表现  
🔴 WebArena-Lite 是受控环境，真实 Web 复杂度会大幅降低成功率

**信源：** [arXiv:2603.19685](https://arxiv.org/abs/2603.19685)

**关联行动：** Web Agent 开发者应参考 MiRA 的子目标分解 + 密集奖励设计。

---

### 7. Samsung 宣布 730 亿美元 AI 芯片扩张计划

**[硬件/算力 | 芯片投资]**

Samsung 宣布 2026 年投资预算增加 22%，总额超过 730 亿美元，重点投向 AI 芯片。联合 CEO 全永贤表示 Agentic AI 驱动的订单激增，资金将流向 HBM（高带宽内存）生产和先进封装。目标：挑战 SK Hynix 作为 NVIDIA 主要内存供应商的领先地位。

**技术/产业意义：** HBM 是 AI 训练和推理的关键瓶颈——GPU 性能很大程度上取决于内存带宽。Samsung 的大规模投资将加剧 HBM 供应竞争，可能缓解 NVIDIA 下一代 GPU（Vera Rubin）的内存瓶颈。但追赶 SK Hynix 的技术领先需要时间。

**评论观察：**  
🟢 供应链分析师看好竞争带来的价格下降和供给改善  
🔴 Samsung 此前在 HBM3E 良率上落后 SK Hynix，大投资不等于快速追平

**信源：** [WSJ](https://www.wsj.com/tech/samsung-to-invest-over-70-billion-in-bid-for-edge-in-ai-chips-race-cb337171) | [The Verge](https://www.theverge.com/ai-artificial-intelligence)

**关联行动：** 关注 Samsung HBM4 量产时间表及 NVIDIA Vera Rubin 供应链选择。

---

### 8. Confer 正式确认为 Meta AI 全线产品提供加密基础设施

**[产业/隐私 | AI 安全]**

Signal 创始人 Moxie Marlinspike 正式发文宣布：Confer 的隐私技术将不仅支撑 Meta AI 聊天，而是成为"Meta 未来所有 AI 产品的基础"。Confer 将作为独立实体继续运营，同时整合到 Meta 的前沿模型生态中。

**技术/产业意义：** 十年前 Moxie 为 WhatsApp 带来了端到端加密，惠及数十亿用户。现在他要为 AI 聊天做同样的事。这是 AI 隐私领域的分水岭——如果 Meta AI（全球最大的 AI 聊天平台之一）实现真正的端到端加密，将对 OpenAI、Google 形成巨大的隐私竞争压力。

**深度分析：** Moxie 的博文直击要害：AI 聊天应用正在成为"历史上最大的集中式敏感数据湖"。不安全感、未完成的想法、医疗记录、财务数据——全部流入 API 端点。加密推理（private inference）如果能在不牺牲模型能力的前提下实现，将是 AI 行业最重要的信任基石之一。

**评论观察：**  
🟢 隐私倡导者称赞 Moxie 再次推动行业标准  
🔴 怀疑者质疑 Meta 的隐私承诺与其广告商业模式是否兼容

**信源：** [Confer Blog](https://confer.to/blog/2026/03/encrypted-meta/) | [The Verge](https://www.theverge.com/ai-artificial-intelligence)

**关联行动：** 关注 Confer 技术的具体部署时间表和覆盖的 Meta AI 产品范围。

---

### 9. Meta AI 宣布用 AI 系统替代人工内容审核

**[产业 | AI 部署]**

Meta 宣布在 Facebook 和 Instagram 上广泛部署 AI 内容审核系统，并将"减少对第三方人工审核承包商的依赖"。声明称 AI 更适合处理"重复性的图形内容审核"和"对抗性用户不断变化策略"等场景。

**技术/产业意义：** 内容审核是 AI 落地最敏感的领域之一。过去数年，人工审核员因 PTSD 和恶劣工作条件多次引发争议并开始组织工会。Meta 此举既是技术进步的自然结果，也是规避人力成本和劳动纠纷的商业决策。但 AI 审核的准确率、文化敏感度和边界案例处理仍是悬而未决的问题。

**评论观察：**  
🟢 保护审核员免受创伤内容的角度值得肯定  
🔴 审核员工会组织者担忧大规模裁员，且 AI 在微妙语境判断上远不如人

**信源：** [Meta Blog](https://about.fb.com/news/2026/03/boosting-your-support-and-safety-on-metas-apps-with-ai/) | [The Verge](https://www.theverge.com/ai-artificial-intelligence)

**关联行动：** 关注首批 AI 替代上线后的误判率和用户申诉数据。

---

### 10. ByteDance Deer Flow 开源 SuperAgent 框架持续爆发

**[工程 | Agent 框架]**

字节跳动的 Deer Flow 开源框架持续狂飙：GitHub 38.6K stars，今日新增 3,569 stars。支持研究、编码、创作三大任务类型，通过沙箱、记忆、工具和子 Agent 处理从分钟级到小时级的不同复杂度任务。

**技术/产业意义：** Deer Flow 的增长速度和 star 数已经超过多数主流 Agent 框架。其"SuperAgent"定位和子 Agent 分级设计体现了字节在 Agent 工程化方面的深厚积累。作为中国科技巨头的开源 Agent 框架，它与 LangGraph、CrewAI 形成直接竞争。

**评论观察：**  
🟢 开发者社区热情极高，架构设计清晰  
🔴 需要更多第三方基准测试验证实际效果

**信源：** [GitHub: bytedance/deer-flow](https://github.com/bytedance/deer-flow)

**关联行动：** Agent 开发者应对比 Deer Flow 与现有框架的架构和性能差异。

---

### 11. BEAVER：128K 上下文压缩延迟降低 26.4 倍

**[研究 | 长上下文优化]**

BEAVER 提出免训练的层次化提示压缩框架：将变长上下文映射为密集页级张量（双路池化），通过语义+词法双分支选择和句子平滑保留话语完整性。在 RULER 基准的多针检索任务上保持高保真度，128K 上下文延迟降低 26.4 倍。

**技术/产业意义：** 长上下文推理的延迟一直是实际部署的主要瓶颈。BEAVER 的"从 token 级修剪到结构感知页级选择"的范式转换值得关注——它保留了文档结构而非盲目删减 token。对于需要处理超长文档的 RAG 和 Agent 系统有直接应用价值。

**评论观察：**  
🟢 26.4 倍延迟降低在实际部署中意义巨大  
🔴 页级选择可能在细粒度信息提取任务上丢失关键细节

**信源：** [arXiv:2603.19635](https://arxiv.org/abs/2603.19635)

**关联行动：** 长文档处理场景应评估 BEAVER 的压缩比和信息保留率。

---

### 12. HopChain：多跳视觉语言推理数据合成框架

**[研究 | VLM 训练]**

阿里 Qwen 团队提出 HopChain，一个可扩展的多跳视觉语言推理数据合成框架。在 Qwen3.5 两个模型上，加入 HopChain 数据后 24 个基准中 20 个得到改善。在超长 CoT 推理中，多跳数据带来的提升超过 50 分。

**技术/产业意义：** 这证明了"数据质量 > 数据数量"在 RLVR 训练中的重要性。多跳链式查询迫使模型在推理全程依赖视觉证据，暴露并修复了感知错误、推理错误、知识错误和幻觉的复合效应。这为 VLM 训练提供了系统性的数据增强方法论。

**评论观察：**  
🟢 跨基准的广泛改善表明多跳数据的通用性  
🔴 数据合成成本和质量控制是大规模应用的挑战

**信源：** [arXiv:2603.17024](https://arxiv.org/abs/2603.17024)

**关联行动：** VLM 训练者应考虑引入多跳推理数据以改善模型的链式推理能力。

---

### 13. DSPy vs LangChain：4.7M vs 222M 下载量背后的采纳困境

**[工程/生态 | AI 工程]**

Skylar Payne 发文分析 DSPy 的采纳困境（HN 145 分）。核心论点：几乎所有复杂 AI 系统最终都会重新实现 DSPy 的核心模式（提示管理、结构化输出、重试、优化器），只是"更差、更慢、更痛苦"。作者提出"Khattab 定律"：任何足够复杂的 AI 系统都包含一个临时的、非正式的、有 bug 的 DSPy 半实现。

**技术/产业意义：** 这篇文章触及 AI 工程化的核心矛盾——好的抽象（DSPy）要求思维转变，而开发者在痛苦中更倾向于渐进式补丁（LangChain 式）。DSPy 的声明式范式确实更优雅，但学习曲线和与现有系统的集成摩擦是真实的采纳障碍。

**评论观察：**  
🟢 HN 讨论中大量开发者承认"确实重新发明了 DSPy 的轮子"  
🔴 也有人指出 DSPy 的文档和错误信息质量仍需改善

**信源：** [Skylar Payne](https://skylarbpayne.com/posts/dspy-engineering-patterns/) | [HN Discussion](https://news.ycombinator.com/item?id=47490365)

**关联行动：** AI 工程团队在选型时应认真评估 DSPy，避免重造轮子。

---

### 14. WordPress 开放 MCP 接口允许 AI Agent 发布内容

**[工程/生态 | AI 集成]**

WordPress.com 现在允许 Claude、ChatGPT 等 AI Agent 通过 MCP（Model Context Protocol）协议草拟和发布博客文章。Agent 生成的内容首先以草稿形式存在，用户可以在发布前审查。

**技术/产业意义：** 这是 MCP 协议在主流平台上的首个重大应用。WordPress 覆盖全球约 43% 的网站，其原生 AI Agent 支持意味着 MCP 正在从"技术规范"走向"基础设施标准"。同时也引发对 AI 生成内容泛滥的担忧。

**评论观察：**  
🟢 开发者社区看好 MCP 标准化 Agent 与应用交互的方向  
🔴 内容创作者担忧 AI 批量生成将进一步稀释网络内容质量

**信源：** [WordPress Blog](https://wordpress.com/blog/2026/03/20/ai-agent-manage-content/) | [TechCrunch](https://techcrunch.com/2026/03/20/wordpress-com-now-lets-ai-agents-write-and-publish-posts-and-more/)

**关联行动：** MCP 服务提供商应关注 WordPress 的实现作为参考标准。

---

### 15. 推理压缩：用条件信息瓶颈统一 Budget Forcing

**[研究 | 推理优化]**

论文将高效推理重新建模为条件信息瓶颈（CIB）下的有损压缩问题。关键理论贡献：发现朴素信息瓶颈应用于 Transformer 时注意力违反了马尔可夫性质，提出 CIB 原理修正。实验证明 CIB 目标能在保持流畅性和逻辑的前提下剪除"认知膨胀"（cognitive bloat）。

**技术/产业意义：** Budget Forcing 是降低推理成本的关键技术方向。现有方法多使用启发式长度惩罚，同时抑制了必要推理和冗余填充。CIB 提供了理论统一框架，将常见启发式方法（如长度惩罚）归纳为特例。语义先验（基于语言模型 surprisal 度量 token 成本）比简单计数更精细。

**评论观察：**  
🟢 理论优雅，将信息论工具严格引入 LLM 推理优化  
🔴 实际推理场景中 CIB 的计算开销是否划算需要更多验证

**信源：** [arXiv:2603.08462](https://arxiv.org/abs/2603.08462)

**关联行动：** 推理优化研究者应关注 CIB 框架对 Budget Forcing 的统一视角。

---

### 16. Project NOMAD：离线 AI 生存计算机爆红

**[工程/社区 | 开源项目]**

Project NOMAD 是一个自包含的离线生存计算机，集成了关键工具、知识库和 AI——设计为在无网络环境下提供信息和赋能。GitHub 12.8K stars，今日新增 4,148 stars（增速全站第一）。

**技术/产业意义：** 这个项目的爆红反映了两个趋势：(1) 对离线/本地 AI 的强烈需求；(2) "AI 预备者"社区的兴起——将 AI 能力打包为灾难准备工具。虽然定位小众，但其架构设计（本地知识库 + 本地推理 + 实用工具集成）对边缘 AI 部署有参考价值。

**评论观察：**  
🟢 开源社区极其热情，star 增速惊人  
🔴 实用性取决于本地模型质量和知识库覆盖范围

**信源：** [GitHub: Crosstalk-Solutions/project-nomad](https://github.com/Crosstalk-Solutions/project-nomad)

**关联行动：** 边缘 AI 和离线部署场景可参考 NOMAD 的架构设计。

---

### 17. SSM 视觉编码器在 VLM 中展现竞争力

**[研究 | 模型架构]**

系统性评估发现：状态空间模型（SSM）作为 VLM 视觉编码器，在 VQA 和定位/分割任务上取得最强综合性能，且模型规模更小。研究还发现 ImageNet 精度或更大骨干网络并不可靠地转化为更好的 VLM 性能。

**技术/产业意义：** ViT 作为 VLM 标准视觉编码器的地位正受到挑战。SSM 的线性注意力复杂度在处理高分辨率图像时具有天然优势。如果 SSM 视觉编码器的优势在更多场景得到验证，可能重塑 VLM 架构设计的选择空间。

**评论观察：**  
🟢 Mamba/SSM 社区视为重要验证  
🔴 ViT 在大规模预训练和迁移学习上的生态优势短期内难以替代

**信源：** [arXiv:2603.19209](https://arxiv.org/abs/2603.19209)

**关联行动：** VLM 开发者应在视觉编码器选型中纳入 SSM 作为对比方案。

---

## GitHub Trending 今日亮点

| 项目 | Stars | 简介 |
|------|-------|------|
| [project-nomad](https://github.com/Crosstalk-Solutions/project-nomad) | 12.8K ⭐ (+4,148/day) | 离线 AI 生存计算机 |
| [deer-flow](https://github.com/bytedance/deer-flow) | 38.6K ⭐ (+3,569/day) | 字节跳动开源 SuperAgent |
| [MoneyPrinterV2](https://github.com/FujiwaraChoki/MoneyPrinterV2) | 22.3K ⭐ (+2,902/day) | 在线赚钱自动化流程 |
| [TradingAgents](https://github.com/TauricResearch/TradingAgents) | 38.9K ⭐ (+2,521/day) | 多 Agent LLM 金融交易 |
| [browser-use](https://github.com/browser-use/browser-use) | 83.4K ⭐ (+1,160/day) | 网页 AI Agent 自动化 |
| [hermes-agent](https://github.com/NousResearch/hermes-agent) | 🆕 | NousResearch 可成长 Agent |
| [pentagi](https://github.com/vxcontrol/pentagi) | 🆕 | 全自主 AI 渗透测试系统 |

---

## 下期追踪问题

1. **Anthropic vs Pentagon 听证会最终裁决？** 法官是否批准临时禁令？对 AI 公司参与政府合同的规则影响如何？
2. **Hyperagents 的自改进收敛性和安全边界？** Meta 是否有后续安全分析论文？社区复现结果如何？
3. **iPhone 17 Pro 400B LLM 的实际推理速度和量化细节？** anemll 团队是否会公开技术方案？对端侧 AI 路线图的影响？
