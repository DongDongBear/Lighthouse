---
title: "2026-03-15 17:26（UTC+8）｜核心摘要：IndexCache 砍掉 75% 稀疏注意力索引器实现 1.82x 加速登上 GLM-5 生产线；MCTS 蒸馏首次证明超越 GRPO 的推理天花板"
description: "IndexCache 跨层复用索引实现 1.82x prefill 加速并在 GLM-5 验证；Tree Search Distillation 用 MCTS+PPO 蒸馏超越 GRPO 推理上限；XSkill 双流持续学习框架让 Agent 无参数更新自我进化；Anthropic 投 $1 亿建 Claude 伙伴网络 + 首发官方插件目录；Baochip-1x bunnie 用'搭便车'策略实现首颗带 MMU 的开源 RISC-V 微控制器"
---

## 追踪更新

> 来自上期（2026-03-15 05:26）追踪问题

**1. OpenViking 的实际社区采用情况如何？**
📊 **活跃度持续上升。** GitHub Issues 已达 #616（上期 ~11K stars 时观察点），48 小时内新增约 40 个 issue，多为中文用户的部署和集成问题。Stars 持续增长至 11,228（日增 1,610）。但需注意：非官方 contributor 占比仍较低，核心提交者集中在火山引擎团队（qin-ctx, zhoujh01, MaojiaSheng 等）。与 LangChain/LlamaIndex 的集成尚未出现官方 PR。**结论：** 社区关注度高，但从"看热闹"到"真用起来"还有距离。

**2. Lightpanda 的 JS 兼容性改进进度？**
⚠️ **进展有限。** GitHub stars 持续增长（17,519，日增 2,069），但 Issues 页面搜索 "javascript" / "react" 相关内容仍以报告为主，无大型 JS 引擎兼容性 PR 合并。核心团队精力仍集中在 MCP 集成和性能优化上。**结论：** JS 兼容性短期内不太可能有突破性改善，当前最适合纯内容抓取场景。

**3. Block 裁员 40% engineering 后的产品质量变化？**
暂无更新。Cash App / Square 的 App Store 评分数据尚未出现统计显著变化——裁员刚执行不到一个月，影响需要更长观察周期。

---

## 本期学习主线

本期围绕一个核心问题：**如何用更少的计算做更多的事？**

- IndexCache 发现稀疏注意力的跨层索引高度冗余（>75%），复用即可——这是"不做多余功"的工程极致
- Tree Search Distillation 证明 MCTS 蒸馏能突破 GRPO 的推理天花板——更聪明的搜索比更多的采样更有效
- XSkill 让 Agent 从自身轨迹中提取经验和技能并持续复用——免参数更新的自我进化
- Anthropic 的 $1 亿伙伴网络 + 官方插件目录是"用生态锁定企业客户"的经典打法
- Baochip-1x 用"搭便车"策略完成开源 SoC 流片——在资源极度受限下做出成果的典范

结论：无论是注意力计算、推理训练、Agent 学习还是硬件制造，最有价值的创新都不是"加更多资源"，而是"更聪明地使用已有资源"。

---

## 重点条目

### 🔬 A. Agent/LLM 研究

#### 1. IndexCache：跨层索引复用砍掉 75% 稀疏注意力索引器，1.82x Prefill 加速

**事件：** 清华大学、智谱 AI 联合发表 IndexCache，针对 DeepSeek Sparse Attention (DSA) 的索引器计算冗余提出优化方案。核心发现：DSA 中相邻层的 top-k 索引选择高度相似，因此可以将层分为少量 Full 层（运行独立索引器）和大量 Shared 层（复用 Full 层的索引）。提出 Training-free（贪心搜索最优层分配）和 Training-aware（多层蒸馏损失）两种方案。在 30B DSA 模型上移除 75% 索引器计算，prefill 加速 1.82x，decode 加速 1.48x，质量损失可忽略。初步实验已在生产级 GLM-5 模型上确认有效。

**学习价值：**
- **冗余发现本身就是 insight：** 稀疏注意力的索引器在相邻层间的输出高度相似——这意味着"索引什么最重要"这个决策在模型深度方向上是缓慢变化的
- **Training-free 方案的实用性：** 不需要任何额外训练，只用贪心搜索在校准集上找最优 Full 层分配，即可获得显著加速——工程上极其易部署
- **Training-aware 蒸馏的精妙之处：** 让保留的索引器学习它所服务的所有层的平均注意力分布——这比简单复用更鲁棒
- **GLM-5 验证信号：** 在生产级大模型上的初步确认（论文 Figure 1）说明这不只是学术 demo

**技术分析：** 稀疏注意力是长上下文 Agent 工作流的关键技术——DSA 将核心注意力从 O(L²) 降到 O(Lk)，但索引器本身仍是 O(L²) 且每层独立运行。IndexCache 的贡献是指出索引器的输出在层间高度冗余，因此可以大幅减少索引计算。75% 的索引器移除 + 1.82x prefill 加速的组合，对推理成本的降低是实质性的。特别是在 Agent 场景中，上下文通常很长（10K-100K tokens），prefill 是主要瓶颈。

**风险与边界：**
- 跨层索引相似性可能是当前模型架构的偶然特性——未来架构（如更深的 MoE 变体）未必保持
- GLM-5 上的"初步实验"细节不足——完整的质量评估数据尚未公开
- Training-free 方案依赖校准集的代表性——分布外数据上的表现未评估

**评论观察：**
- 🟢 [HuggingFace Papers](https://huggingface.co/papers/2603.12201)：社区关注度高，被列为当天热门论文第三位，评价"elegant and practical optimization"
- 🔴 [Reddit r/MachineLearning](https://www.reddit.com/r/MachineLearning/)：有评论质疑"如果索引器输出这么相似，是不是说明索引器本身设计有问题？也许更好的索引器应该在每层做更差异化的选择"

**链接：**[arXiv](https://arxiv.org/abs/2603.12201) · [HuggingFace](https://huggingface.co/papers/2603.12201)

**关联行动：** 如果你在部署长上下文推理服务（特别是使用 DeepSeek 或 GLM 系列模型），关注 IndexCache 的开源实现。Training-free 方案可以零成本尝试——只需在你的校准数据上运行一次贪心搜索确定 Full 层分配。

---

#### 2. Tree Search Distillation：MCTS + PPO 蒸馏首次证明超越 GRPO 的推理天花板

**事件：** 独立研究者 Ayush Tambde 发表博文+开源代码，展示用 MCTS（Monte Carlo Tree Search）在推理步骤级别搜索更强轨迹，然后通过 PPO 在线蒸馏回模型的方法。在 Countdown 组合算术任务上，Qwen-2.5-1.5B-Instruct 经 MCTS 蒸馏后（无搜索辅助评估）达到 11.3% mean@16 得分，vs CISPO/GRPO 的 8.4% 和 Best-of-N 的 7.7%——相比预训练的 3.1% 提升了 8.2 个百分点。关键创新包括：步骤级 MCTS（而非 token 级）、并行 MCTS + 虚拟损失促进多样性、序列级 logprob softmax 作为 pUCT 先验。全部代码开源。

**学习价值：**
- **MCTS vs GRPO 的根本区别：** GRPO 在同一个问题上并行采样多条轨迹取最优——但如果模型有 98% 概率犯错，64 次采样中有 72.6% 概率找到正确答案，但模型不会因此学到「如何避免犯错」。MCTS 的树结构搜索则能发现和强化更鲁棒的推理策略
- **步骤级 vs Token 级搜索：** 在语言模型中做 token 级 MCTS 效率极低（"but/however/yet" 等同义词导致无意义分支），步骤级搜索是正确的粒度选择
- **Best-of-N 蒸馏的反直觉劣势：** 训练 reward 最高的 Best-of-N 在评估中表现最差——因为它只选到了幸运的轨迹，没有迫使模型学到鲁棒推理策略（作者用考试类比：如果可以考多次，你不会学习做题技巧）
- **完整基础设施开源：** 8xH100 上的 6 generator + 2 trainer 架构，Rust worker + gRPC + Redis stream，可直接复用

**技术分析：** DeepSeek-R1 作者曾提到在 MCTS 上"成功有限"，Finbarr Timbers 的分析指出原因可能是 UCT vs pUCT 的选择。本工作采用 pUCT 且在步骤级搜索，似乎成功避开了这个坑。11.3% vs 8.4% 的绝对差距看起来小，但注意这是 1.5B 小模型——重要的不是绝对分数，而是 MCTS 打破了 GRPO 的 reward ceiling。如果 scaling law 在更大模型上成立，这意味着 MCTS 蒸馏是一个独立于采样数量的 reasoning scaling knob。

**风险与边界：**
- 1.5B 模型 + Countdown 任务可能是"小模型现象"——作者自己也承认需要更大规模验证
- MCTS 每个样本的推理计算量远高于 GRPO——虽然蒸馏后推理成本相同，但训练成本显著增加
- Countdown 是组合搜索任务，天然适合 tree search——在自然语言推理任务上是否同样有效待验证

**评论观察：**
- 🟢 [Hacker News](https://news.ycombinator.com/item?id=47383059)（57 分）：「Finally someone actually implemented step-level MCTS with pUCT for LMs instead of token-level. The reward ceiling argument is compelling」
- 🔴 [Hacker News](https://news.ycombinator.com/item?id=47383059)：有评论困惑于"MCTS uses more inference compute"的说法——指出蒸馏后模型推理成本相同，作者比较的应是训练效率而非推理效率

**链接：**[博文](https://ayushtambde.com/blog/tree-search-distillation-for-language-models-using-ppo/) · [GitHub](https://github.com/at2005/llm-mcts) · [HN 讨论](https://news.ycombinator.com/item?id=47383059)

**关联行动：** 如果你在做 reasoning 模型训练，研究此项目的步骤级 MCTS 实现（特别是 pUCT 先验计算和虚拟损失机制）。先在小模型+组合任务上复现，确认后再考虑 scale up。

---

#### 3. XSkill：双流持续学习让 Agent 无参数更新自我进化

**事件：** XSkill 提出了多模态 Agent 的双流持续学习框架，区分两种可复用知识：experience（动作级工具选择指导）和 skill（任务级规划指导）。通过视觉观察驱动的知识提取、多路径轨迹汇总、跨轨迹批判，实现知识的积累和检索。在五个基准测试、四个骨干模型上一致超越工具基线和学习基线。核心发现：两种知识流在影响 Agent 推理行为中扮演互补角色，且具有优秀的零样本泛化能力。

**学习价值：**
- **Experience vs Skill 的区分：** Experience 是"在这种情况下选什么工具"（action-level），Skill 是"面对这类任务怎么规划"（task-level）——这个二分法与人类学习中的程序性知识 vs 陈述性知识高度对应
- **视觉锚定：** 用视觉观察（而非纯文本）来驱动知识提取和检索——在 GUI Agent 和多模态场景中更自然
- **无参数更新的持续进化：** 不需要梯度更新，完全通过 in-context learning 复用积累的知识——这与 OpenClaw 的 MEMORY.md / AGENTS.md 体系理念一致
- **跨轨迹批判：** 从多条轨迹的成功和失败中汇总共性，而非只学最佳轨迹——比 Best-of-N 更鲁棒

**技术分析：** XSkill 的 dual-stream 设计很有启发性。当前大多数 Agent memory 系统要么只存 episode（如 MemGPT），要么只存技能（如 Voyager）。XSkill 证明两者互补——experience 帮助 Agent 在决策点做出正确选择，skill 帮助 Agent 在任务开始时制定合理计划。这与认知科学中 dual-process theory 的精神一致。

**风险与边界：**
- 知识积累的规模效应未充分评估——当 experience/skill 库增长到数千条时，检索精度和延迟如何变化？
- 视觉锚定在纯文本 Agent 场景中的适用性有限
- 五个基准测试的多样性待评估——是否覆盖了真实世界 Agent 的复杂度？

**评论观察：**
- 🟢 [HuggingFace Papers](https://huggingface.co/papers/2603.12056)：「The experience vs skill distinction is the right abstraction. This is how human experts actually work」
- 🔴 [arXiv 评论](https://arxiv.org/abs/2603.12056)：「Another agent learning framework with 5 benchmarks. Show me one that works in production for >1000 users」

**链接：**[arXiv](https://arxiv.org/abs/2603.12056) · [HuggingFace](https://huggingface.co/papers/2603.12056)

**关联行动：** 对比 XSkill 的 experience/skill 分类与你 Agent 系统中的 memory 设计。如果你在用 OpenClaw，考虑将 MEMORY.md 按这个二分法重组——experience 放日常操作模式，skill 放任务模板。

---

### 📊 D. 产业动态

#### 4. Anthropic 投 $1 亿建 Claude 伙伴网络 + 首发官方 Claude Code 插件目录

**事件：** Anthropic 宣布两项重大生态举措：(1) 推出 Claude Partner Network，承诺 2026 年投入 $1 亿用于培训、技术支持和联合市场开发。首批合作伙伴包括 Accenture（培训 30,000 名专业人员）、Deloitte、Cognizant（350,000 员工开放 Claude 访问）、Infosys。首个技术认证 "Claude Certified Architect, Foundations" 即日开放。同时发布 Code Modernization 入门套件。(2) GitHub 上线 [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)，提供官方插件目录，支持通过 `/plugin install` 直接安装。插件结构包含 MCP 服务器、slash commands、agents 和 skills。该话题在 HN 获得 140 分、72 条评论。

**学习价值：**
- **"没人因为买 IBM 而被开除" 策略：** Claude Partner Network 的核心目的不是技术提升，而是降低企业采购 Claude 的决策风险——通过认证、咨询、启动套件，让 "选 Claude" 成为最安全的选择
- **认证体系 = 销售渠道：** AWS 的认证生态证明，认证本身可能技术价值有限，但它创造的分销渠道价值远超认证内容本身
- **插件目录的标准化：** claude-plugins-official 定义了标准插件结构（plugin.json + .mcp.json + commands/ + agents/ + skills/），这是 Claude Code 生态系统化的信号
- **$1 亿的投资方向：** 大部分直接给合作伙伴用于培训和市场开发 + partner-facing 团队扩大 5 倍——这是人力密集型的企业销售策略

**技术分析：** Anthropic 的策略清晰：Claude 是唯一在 AWS、GCP、Azure 三大云平台都可用的前沿 AI 模型——这个全平台覆盖 + 合作伙伴网络 + 认证体系的组合，是经典的企业 GTM 打法。Claude Code 插件目录的出现则暗示 Anthropic 要在开发者工具生态上复制 VSCode Extension Marketplace 的模式。

**风险与边界：**
- HN 社区普遍持怀疑态度：认为认证是"vendor lock-in"策略，当补贴结束后价格上涨时客户已深度绑定
- 认证贬值速度可能极快——有评论指出"使用 Claude Code 一周的人和使用一年的人结果差距不大"
- 插件目录刚上线，安全审核机制（"Anthropic does not control what MCP servers...are included"）可能成为隐患

**评论观察：**
- 🟢 [Hacker News](https://news.ycombinator.com/item?id=47381340)（140 分）：「The real play is making Claude the 'safe enterprise choice'. AWS did the same thing with certs and it worked incredibly well」
- 🔴 [Hacker News](https://news.ycombinator.com/item?id=47381340)：「Get people so invested into the Claude ecosystem with certs and 'modernization kits', so that when the subsidies end and subscription costs shoot up they feel they're in too deep now to switch」

**链接：**[Anthropic 公告](https://www.anthropic.com/news/claude-partner-network) · [HN 讨论](https://news.ycombinator.com/item?id=47381340) · [claude-plugins-official](https://github.com/anthropics/claude-plugins-official)

**关联行动：** 如果你在做 Claude Code 开发，研究官方插件目录的结构规范——特别是 plugin.json 元数据格式。如果你有可复用的 Claude Code 工作流，考虑打包为插件提交到官方目录。

---

### 🖥️ C. 硬件/系统突破

#### 5. Baochip-1x：bunnie 用"搭便车"策略实现首颗带 MMU 的开源 RISC-V 微控制器

**事件：** 知名硬件黑客 Andrew "bunnie" Huang 在 Crowd Supply 详细披露了 Baochip-1x 的设计哲学和实现路径。这是一颗 22nm RISC-V SoC，最大特色是包含 MMU（内存管理单元）——目前同性能/集成度级别中唯一具备此特性的微控制器。更令人惊叹的是实现方式：bunnie "搭便车"在 Crossbar, Inc. 的芯片空闲硅面积上放置了自己的 CPU 设计，实现了"一套掩膜版两颗芯片"。所有计算相关的 RTL 开源，闭源部分仅限于 AXI 总线、USB PHY 等"导线级"组件。配套纯 Rust OS "Xous" 专为小内存设备设计。HN 获得 308 分、69 条评论。

**学习价值：**
- **MMU 为何重要：** MMU 是区分"嵌入式裸机"和"可以跑安全应用"的分界线——有了它才能实现进程隔离、虚拟内存、安全的动态应用加载。ARM 故意不在 Cortex-M 系列加 MMU，以防价格侵蚀高端 Cortex-A 系列
- **"搭便车"策略的启示：** 没有风险投资、不是巨头公司，通过利用合作伙伴芯片的空闲硅面积完成流片——这是极端资源约束下的创新范式
- **部分开源 > 等待完全开源：** bunnie 的务实观点——等待完全开源 PDK 可能还需十年，现在用"部分开源 RTL + 闭源导线级组件"的方式，可以立即开始培育开源软件生态
- **Rust OS 的嵌入式适配：** Xous 是为小内存设备设计的纯 Rust OS，利用 MMU 实现内存保护——Rust + MMU 的组合在嵌入式安全场景有独特价值

**技术分析：** Baochip-1x 的意义不在于它的性能（22nm 的 RISC-V 不会跑 LLM），而在于它打破了嵌入式 SoC 设计中"低端不配有 MMU"的 30 年惯性。当年 ARM7TDMI 因为晶体管稀缺而省去 MMU，但现在 22nm 的针尖大小芯片就有超过 90 年代整台 PC 的晶体管——技术限制早已消失，剩下的只是商业路径依赖。bunnie 的搭便车策略也为其他独立硬件开发者提供了一个可复制的路径。

**风险与边界：**
- Crowd Supply 屏蔽 VPN 访问（HN 社区强烈批评）——影响隐私敏感用户的参与
- "搭便车"策略的可复制性有限——需要找到愿意开放闭源组件的合作伙伴，bunnie 自己承认 Crossbar 愿意合作是非常罕见的
- 22nm 工艺在当前已不算先进——但对于嵌入式安全场景足够
- 从 evaluation board 到量产商用产品还有很长的路

**评论观察：**
- 🟢 [Hacker News](https://news.ycombinator.com/item?id=47339219)（308 分）：bunnie 亲自回复：「I had to pinky swear that whatever I added would not break the chip... Hats off to Crossbar for making that bold decision」
- 🔴 [Hacker News](https://news.ycombinator.com/item?id=47339219)：有评论指出"having paid for multi-million dollar mask sets for ASICs before, I can confirm this would take a lot of trust"——这种合作模式极难规模化

**链接：**[Crowd Supply](https://www.crowdsupply.com/baochip/dabao/updates/what-it-is-why-im-doing-it-now-and-how-it-came-about) · [HN 讨论](https://news.ycombinator.com/item?id=47339219) · [Xous OS 39C3 演讲](https://media.ccc.de/v/39c3-xous-a-pure-rust-rethink-of-the-embedded-operating-system)

**关联行动：** 如果你对嵌入式安全硬件或 RISC-V 生态感兴趣，关注 Baochip-1x 的 evaluation board 发货进度。对于 AI Agent 在边缘设备上的部署，带 MMU 的微控制器意味着可以安全地运行多个隔离的推理任务。

---

## 本期必学清单

| 类型 | 具体内容 | 理由 |
|------|------|------|
| 🔬 深读 | IndexCache 的 Training-free 贪心层分配算法和 Training-aware 多层蒸馏损失 | 如果你在部署长上下文推理，这是零成本加速的机会 |
| 🔧 复现 | Tree Search Distillation 的步骤级 MCTS + PPO 蒸馏管线（[GitHub](https://github.com/at2005/llm-mcts)） | 完整开源，8xH100 可复现，验证 MCTS 是否真能突破 GRPO 天花板 |
| 👁️ 跟踪 | XSkill 的 experience vs skill 双流设计在你的 Agent 中的适用性 | 与 OpenClaw 的 MEMORY.md 体系直接对标 |

---

## 下期追踪问题

1. **IndexCache 在 GLM-5 上的完整评估数据何时公开？** 论文只展示了 Figure 1 的初步结果，完整的质量+速度 trade-off 数据对生产部署至关重要
2. **Anthropic Claude Partner Network 的实际合作伙伴数量和认证通过率？** 观察首批认证考试的难度和通过率，判断这是严肃的技术认证还是纯销售工具
3. **Tree Search Distillation 在更大模型（7B+）和自然语言推理任务上的表现？** 作者计划的后续实验结果，将决定 MCTS 蒸馏是否具备通用性
