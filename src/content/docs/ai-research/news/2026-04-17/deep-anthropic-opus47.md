---
title: "深度解读 | Claude Opus 4.7：价格不变、token 更贵、长时序能力显著抬升"
description: "Anthropic 发布 Claude Opus 4.7：93 题编码基准 +13%、CursorBench 70% vs 58%、Rakuten-SWE-Bench 3×、视觉精度 98.5% vs 54.5%、支持 2,576 px/3.75MP 图像、BigLaw Bench 高强度 90.9%、新增 xhigh 档位与 task budgets beta、/ultrareview 命令、tokenizer 1.0–1.35×"
---

> 2026-04-17 · 深度解读 · 编辑：Lighthouse
>
> 原文：[anthropic.com/news/claude-opus-4-7](https://www.anthropic.com/news/claude-opus-4-7)

---

## 速查卡

| 维度 | 内容 |
|------|------|
| **一句话总结** | Claude Opus 4.6 的直接升级：在最难的软件工程任务、长时序自主 Agent、视觉理解上全面拉开差距；价格不变但单位任务 token 用量与 tokenizer 映射发生变化 |
| **大白话版** | 还是 Opus 家族，还是 $5 / $25 的价格；但"低档 Opus 4.7 ≈ 中档 Opus 4.6"，最吃力的长时运行任务上把 Opus 4.6 甩开一截；图像能看清 3.75MP 了 |
| **核心数字** | 93 题编码基准 **+13%**；CursorBench **70% vs 58%**；Rakuten-SWE-Bench 解决 **3×** 生产任务；XBOW 视觉精度 **98.5% vs 54.5%**；Harvey BigLaw Bench 高强度 **90.9%**；图像长边最高 **2,576 px（~3.75MP）**；tokenizer 新版 **1.0–1.35×** token 膨胀 |
| **价格 / 可用性** | **$5 / $25 每百万 input / output tokens**，与 Opus 4.6 一致；即日起在 Claude 全线产品、API、Amazon Bedrock、Google Cloud Vertex AI、Microsoft Foundry 可用；API 名称 `claude-opus-4-7` |
| **新增控制项** | `xhigh` 档位（介于 `high` 与 `max` 之间）、**task budgets**（公开 beta）、Claude Code 中的 `/ultrareview` 命令与 Max 用户可用的 **auto 模式** |
| **影响评级** | **A** — 对已在用 Opus 4.6 的编码 / Agent / 企业文档团队几乎是"无痛升级且必须升"；但对"最强模型"宝座没有造成颠覆，Mythos Preview 仍被 Anthropic 定位为"更强且对齐最好"的模型，只是暂未全面开放 |
| **适用对象** | 重度使用 Claude Code / Cursor / Devin / Replit / Warp / Notion Agent / Factory / Bolt 等编码 & Agent 产品的开发者；使用 Harvey、Hex、Databricks、Ramp、Hebbia 等在金融 / 法律 / 数据领域的专业用户 |

---

## 文章背景

### 为什么这次发布值得单独解读

Anthropic 在 2026-04-16 正式放出 Claude Opus 4.7 的通用可用版本。这不是一次小的 point release：官方原文用了"notable improvement on Opus 4.6 in advanced software engineering, with particular gains on the most difficult tasks"来定位这次更新，并明确指出用户"可以把以前需要近距离监督的最硬核编码工作交给 Opus 4.7"。

和上一代 Opus 4.6 相比，这次的信号有三个：

1. **目标客户非常明确地对齐编码 Agent 与长时序自动化**。博客正文用来铺陈的不是 ChatGPT-like 对话体验，而是 Devin、Cursor、Notion Agent、Replit、Warp、Bolt、Factory、Genspark、Hebbia、CodeRabbit、Qodo、XBOW 等 Agent 平台伙伴的引用。
2. **与 Mythos Preview 的关系被正面承认**。Opus 4.7 不是 Anthropic 手里"最强"的模型，但却是"Mythos Preview 的前沿安全试点"——这意味着 Anthropic 开始形成清晰的"Mythos 顶点 + Opus 旗舰 + Sonnet / Haiku 下沉"的产品矩阵。
3. **价格不变，但 token 结构变了**。新 tokenizer 会让同一段输入产生 1.0–1.35× 的 token 数；更高 effort 会产生更多输出 token。这是一条需要所有调用方都警惕的成本曲线。

### 时间线位置

这次发布处在一个高密度发布窗口，解读这些事件的关系很重要：

- **2026-04-16**：Anthropic 发布 Claude Opus 4.7（本文）。
- 同日 Anthropic 也宣布 **Project Glasswing**（关于 AI 模型在网络安全领域的风险与收益），并说明会先在 Opus 4.7 这类"能力较弱"的模型上测试新的 cyber safeguards；这直接关联到 Opus 4.7 的安全剖面设计。
- **2026-04-17**：OpenAI 同步放出 Codex 的重大扩展（后台计算机使用、90+ 插件、跨天/跨周自动化）。
- 同期 Google Chrome 上线 AI Mode。

三家厂商几乎在同一周都把"长时序、跨应用的 Agent"作为发布主线。Opus 4.7 是 Anthropic 在这个主线上的正面回应——不是靠新能力，而是靠**把长时程任务做得更稳、更准、更少回头**。

### 与 Mythos Preview 的关系

原文明确定位：

> although it is less broadly capable than our most powerful model, Claude Mythos Preview, it shows better results than Opus 4.6 across a range of benchmarks

这条措辞有三层含义：

- Mythos Preview 是 Anthropic 当前手里最强的模型。
- Opus 4.7 在训练中**主动差分削弱了 cyber 能力**（"we experimented with efforts to differentially reduce these capabilities"），这是为了让它能先于 Mythos 开放。
- Mythos Preview 也是 Anthropic 评估中"对齐最好"的模型（"Mythos Preview remains the best-aligned model we've trained"），但它目前仅限量发布。

换句话说：**Opus 4.7 是 Anthropic 把 Mythos 能力 / 对齐工艺"平民化"的第一步**，但更稳健的 cyber 行为被主动保留在 Mythos 这一层。

---

## 完整内容还原

### 一、发布要点：可用性与价格

原文确认：

- **价格与 Opus 4.6 相同**：$5 per million input tokens，$25 per million output tokens。
- **可用渠道**：所有 Claude 产品、Claude API、Amazon Bedrock、Google Cloud Vertex AI、Microsoft Foundry。
- **API 模型名**：`claude-opus-4-7`。

这种"价格不变、能力上升"的做法与 Opus 家族一贯的定价节奏一致，但需要和后面 tokenizer 与 effort 行为的变化一起看——真正的"单位任务成本"并没有保持不变。

### 二、合作伙伴反馈：28 条引用里的信号

官方正文收录了 28 位来自早期测试的合作伙伴引用（"01 / 28"）。这些引用密度很高，筛出几个最具信息量的核心数据点：

| 合作伙伴 / 评测 | 关键数字 | 来自 |
|----------------|---------|------|
| 93 题编码基准 | +13% resolution over Opus 4.6，含 4 个 Opus 4.6 与 Sonnet 4.6 都解不出的任务 | Mario Rodriguez, Chief Product Officer |
| 内部研究 Agent 基准 | 六模块总分 0.715 并列第一；General Finance 0.813 vs 0.767（Opus 4.6） | Michal Mucha, Lead AI Engineer, Applied AI |
| CursorBench | **70% vs 58%** | Michael Truell, Cursor CEO |
| Notion Agent | +14% at fewer tokens，tool errors 仅为 Opus 4.6 的 **1/3**，首个通过"隐式需求"测试的模型 | Sarah Sachs, Notion |
| Rakuten-SWE-Bench | 解决 **3×** 更多生产任务，Code Quality / Test Quality 双位数提升 | Yusuke Kaji, Rakuten |
| CodeRabbit | Recall +10%，precision 持平；比 GPT-5.4 xhigh 更快一点 | David Loker, CodeRabbit |
| XBOW 视觉精度 | **98.5% vs 54.5%**（Opus 4.6），"最大的 Opus 痛点几乎消失" | Oege de Moor, XBOW |
| Harvey BigLaw Bench | high effort 下 **90.9%**，在"区分 assignment / change-of-control 条款"这类前沿模型长期失败的任务上表现好 | Niko Grupen, Harvey |
| Databricks OfficeQA Pro | 比 Opus 4.6 **错误少 21%** | Hanlin Tang, Databricks |
| Factory Droids | 任务成功率 **+10–15%**，tool errors 更少 | Leo Tchourakov, Factory |
| Bolt | 长时应用构建任务最多 **+10%**，无回归 | Eric Simons, Bolt |
| Hex | "low-effort Opus 4.7 ≈ medium-effort Opus 4.6" | Caitlin Colgrove, Hex |
| Intology（Sean Ward） | 自主构建完整 Rust 语音合成引擎（神经模型 + SIMD 内核 + 浏览器 demo），并自己调用语音识别器回验输出 | Sean Ward, Intology |
| Warp | 通过了多个 Terminal Bench / TBench 中 Claude 过去失败的任务 | Zach Lloyd, Warp |
| Devin | "能连续工作数小时、推进难题而非放弃" | Scott Wu, Cognition |
| Genspark Super Agent | loop resistance 显著提升，"最高的 quality-per-tool-call 比" | Kay Zhu, Genspark |

几个重复出现的定性信号：

1. **少 tool error、少中途放弃**：Notion、Factory、Genspark 都提到 tool 调用失败时不再"cold stop"，能继续推进。
2. **更少"胡编补白"**：Hex 说模型能正确报告"数据缺失"而不是给看似合理的错答；Vercel（Joe Haddad）说模型"对自己的极限更诚实"，甚至"在动工前先做 systems code 上的证明"。
3. **更有主见**：Replit 的 Michele Catasta 直接说"它会在技术讨论中对我推回去"——这是"不再一味讨好用户"的行为变化；同样地，Augment（Igor Ostrovsky）说模型"带来更有主张的视角，不再只是附和用户"。

这些定性描述和 Anthropic 在"Instruction following"一节的自述互相呼应：**Opus 4.7 的行为更"硬"了**。

### 三、指令遵循：老 prompt 可能反而翻车

Anthropic 明确提醒：

> Opus 4.7 is substantially better at following instructions. Interestingly, this means that prompts written for earlier models can sometimes now produce unexpected results: where previous models interpreted instructions loosely or skipped parts entirely, Opus 4.7 takes the instructions literally. Users should re-tune their prompts and harnesses accordingly.

对现有 harness 的影响：

- 以前依赖模型"默默忽略"某些不合理指令的 prompt，现在可能被字面执行。
- 以前靠"反复叠加要求"压住模型行为的 prompt，可能出现过度执行、绕远路。
- 需要重新审视"默认行为假设"——尤其是围绕格式、语言、工具调用顺序的那部分。

### 四、多模态：2,576 像素长边，~3.75 MP

原文：

> it can accept images up to 2,576 pixels on the long edge (~3.75 megapixels), more than three times as many as prior Claude models.

这是一个模型层面的提升，而不是 API 参数——你发给模型的图像会**直接被更高保真度地处理**。直接影响的场景：

- Computer-use Agent 读取密集截屏（呼应 XBOW 的 98.5% 视觉精度）。
- 复杂图表、技术示意图的数据抽取。
- 对像素级参考有要求的工作（法律文书、专利附图、医学影像标注）。

脚注特别指出：因为高分辨率图像会消耗更多 token，不需要额外精度的用户可以先 downsample 再发送。**视觉精度是以 token 为代价的**。

### 五、真实世界工作：金融、法律、GDPval-AA

原文强调 Opus 4.7 在 Finance Agent 评估上达到 state-of-the-art 水平，并且在 **GDPval-AA**（第三方评估，覆盖金融、法律等经济价值较高的知识工作）上也是 state-of-the-art。配合 Harvey 90.9%、Databricks 减错 21%，Opus 4.7 的"法金文档"定位相当明确。

### 六、记忆：文件系统记忆变强

原文：

> Opus 4.7 is better at using file system-based memory. It remembers important notes across long, multi-session work, and uses them to move on to new tasks that, as a result, need less up-front context.

这条短短一句，但意义不小——它说明 Anthropic 把"记忆"作为**基于外部文件系统的工具能力**来设计，而不是内置隐式上下文。这对 Agent 框架的意义是：你自己写的 memory store（如 Claude Code 的文件备忘、Cursor 的项目记忆）现在被模型更有效地使用了。

### 七、安全与对齐

Opus 4.7 的安全剖面整体与 Opus 4.6 相似：

- 在 honesty、对抗 prompt injection 等方面有所提升。
- 在"给出过度详细的受控物质减害建议"这类维度上略**变弱**。
- 整体结论："largely well-aligned and trustworthy, though not fully ideal in its behavior"。
- Mythos Preview 仍是 Anthropic 评估中对齐最好的模型。

Cyber 方面：

- Opus 4.7 是第一款带有"自动检测并拦截被禁止或高风险网络安全请求"safeguards 的模型。
- 训练中**差分削弱了 cyber 能力**。
- 正规安全研究、渗透测试、红队用途的专业人士被引导加入 Anthropic 新设立的 **Cyber Verification Program**。

### 八、同步上线的工具更新

原文在"Also launching today"一节列出三块：

1. **更细的 effort 控制**——新增 `xhigh` 档位，介于 `high` 和 `max` 之间。Claude Code 所有计划的默认 effort 已被提高到 `xhigh`；官方建议编码 / agentic 场景从 `high` 或 `xhigh` 起步。
2. **Claude Platform（API）**：高分辨率图像支持；**task budgets** 进入公开 beta——允许开发者引导 Claude 在长时运行中的 token 开销分配。
3. **Claude Code**：
   - 新的 **`/ultrareview`** 斜杠命令，启动专门的审阅会话，把 changes 扫一遍并标记 bug 与设计问题。Pro / Max 用户各送 3 次 ultrareview 试用。
   - **auto 模式**扩展到 Max 用户——新的权限选项，由 Claude 代为决策，用于更长任务与更少打断，相比"跳过所有权限"风险更低。

### 九、从 Opus 4.6 升到 4.7 的迁移要点

两件事会影响 token 用量：

1. **Tokenizer 升级**：同样的输入，映射到的 token 数量约为 Opus 4.6 的 **1.0–1.35×**，具体取决于内容类型。
2. **更高 effort 下思考更多**：尤其是 agentic 设置下的后续轮次，输出 token 会变多——这换取的是硬问题上的可靠性。

Anthropic 给出的控制手段：

- 调 `effort` 参数。
- 调整 task budgets。
- 直接在 prompt 里要求更简洁。

Anthropic 自己的结论是"净效应是 favorable 的"——在内部编码评估中，各档 effort 下的 token usage 都有改善。但官方诚实地加了一句："we recommend measuring the difference on real traffic"。官方另外提供了迁移指南。

### 十、基准注释里容易被忽略的细节

原文脚注揭示几件对 benchmark 解读有重要意义的事：

- GPT-5.4 与 Gemini 3.1 Pro 的对比使用了"API 上可获得的最佳模型版本"。
- **MCP-Atlas** 的 Opus 4.6 分数已根据 Scale AI 修订的评分方法重新校准。
- SWE-bench Verified / Pro / Multilingual：Anthropic 有 memorization 筛查，剔除疑似记忆样本后，Opus 4.7 对 4.6 的领先仍然保持。
- **Terminal-Bench 2.0**：使用 Terminus-2 harness、关闭 thinking；每任务 1× 保证 / 3× 上限资源，5 次平均。
- **CyberGym**：Opus 4.6 分数从原始 66.6 上调为 73.8（harness 参数更新以更好地引出 cyber 能力）。
- **SWE-bench Multimodal**：Anthropic 使用内部实现，Opus 4.7 与 4.6 的分数不能与公开 leaderboard 直接对比。

---

## 核心技术洞察

### 洞察一：长时序稳定性成为差异化主战场

Opus 4.7 的卖点不是"单步更强"，而是"跨多小时、多工具、多失败的长时序中不掉链子"：

- Devin：连续工作数小时。
- Notion Agent：tool errors 跌到 1/3，能穿越工具失败继续执行。
- Genspark：loop 发生率下降，"quality-per-tool-call"创新高。
- Factory：跑完验证步骤而不是半途而废。

这些定性指标在常规 benchmark 表格里不容易体现，但它们是真实工业场景的瓶颈。Anthropic 在博客中自述"optimized for sustained reasoning over long runs"（Exa 的 Jeff Wang 引用）——这是**把模型训练目标从"单 turn 智能"转向"多 turn 执行一致性"**。

### 洞察二：Tokenizer 升级是"隐形涨价"，但配套了 effort 与 budget 控制

表面看价格未变，但 tokenizer 映射膨胀 1.0–1.35× 意味着同样一段输入，**真实账单上升 0–35%**。同时高 effort 档位会让输出 token 进一步上升。官方给出的对冲：

- `xhigh` 档位让你在 `high` 和 `max` 之间选一个更合身的点，而不是被迫一跳到顶。
- `task budgets` beta 让你在 Agent 长流程中压住总预算。
- 在 prompt 中直接要求简洁。

对理性的成本优化者，这是**从"买模型质量"走向"买单位任务质量"的一次迁移**——你必须在真实流量上重新测成本。

### 洞察三：视觉能力飞跃来自分辨率上限解锁

图像长边从过去的 ~800 px 级别跳到 **2,576 px**，像素数从 ~0.6 MP 级别跳到 **~3.75 MP**（官方措辞"more than three times as many as prior Claude models"）。配合 XBOW 的 98.5% 视觉精度，这条升级解锁了：

- 读密集截屏的 Agent（computer-use）。
- 化学结构、专利图、技术示意图（Solve Intelligence 引用）。
- 法律 / 科学领域里"像素即信息"的工作流。

但要注意：**高分辨率图像 = 更多视觉 token**。脚注里 Anthropic 明确建议"不需要额外精度时先 downsample"。

### 洞察四：安全设计走向"分层差分削弱"

Anthropic 在 Opus 4.7 的训练中**主动差分削弱 cyber 能力**，并给 Opus 4.7 增加了"检测并拦截高风险 cyber 请求"的 safeguards。这是一种与 Mythos 并行的产品策略：

- **Mythos Preview**：能力最强、对齐最好，但限量发布。
- **Opus 4.7**：能力次一级、cyber 被差分削弱、带自动拦截 safeguards——成为"前线安全试验田"。
- **Cyber Verification Program**：把正规 pen-test / red-team 用户显式白名单化。

这和 2025 年只是靠"更好的 RLHF"相比，是产品维度上更工程化的安全分层。

### 洞察五：指令遵循严格化是一次"隐式破坏性变更"

"Opus 4.7 takes the instructions literally"听起来是好消息，但对已经上生产的 prompt 工程来说意味着：

- 旧 prompt 中靠"模型自动放宽"运作的部分会失效。
- 你之前在 harness 里"防守式叠加要求"的写法可能被字面执行，导致意外副作用。
- 需要回归性测试整个 prompt / tool schema 工作流，这点和 tokenizer 膨胀一起构成本次升级最大的"隐藏成本"。

---

## 实践指南

### 你现在应该做什么

**1. 小规模流量灰度**

Anthropic 官方建议"在真实流量上测量差异"。在把 Opus 4.6 的主流量切到 4.7 之前：

- 选一组代表性任务（长 prompt + 长输出、工具调用密集、视觉密集），各跑 50–200 例。
- 同时测 token 使用量、延迟、成功率。
- 重点关注：tokenizer 膨胀对 input 成本的具体影响（1.0–1.35× 之间不同内容类型不一样）。

**2. Effort 档位选择**

官方建议："编码 / agentic 场景从 `high` 或 `xhigh` 起步"；Claude Code 默认已经是 `xhigh`。实操策略：

- 对"最硬、失败代价高"的任务，直接 `xhigh` 或 `max`。
- 对"中等难度、吞吐敏感"的任务，试试 `xhigh` vs `high`——Hex 的反馈是 low-effort Opus 4.7 ≈ medium-effort Opus 4.6，意味着你可能可以降档省成本。
- 使用 **task budgets**（公开 beta）在长流程中压预算上限，避免模型"思考过度"。

**3. 重新审视你的 prompt**

既然 Opus 4.7 更字面执行：

- 删掉 prompt 里那些"兜底地追加"的指令，避免它们被叠加执行。
- 检查系统 prompt 中有没有自相矛盾的条款（旧模型会忽略，4.7 会挑一条严格执行）。
- 在多语言场景里确认语言约束没被字面过执行（比如"用中文"会不会让英语代码注释也被翻译）。

**4. 图像工作流**

- 如果你原来手动 downsample 过的图像现在需要更高保真度，直接发原图。
- 如果你不需要额外精度，**显式在客户端 downsample**，否则 token 成本会悄悄上升。
- 高分辨率图像尤其适合：computer-use Agent 看截屏、解析复杂图表、生命科学 / 法律图表。

**5. Claude Code 用户特别注意**

- 默认 effort 已升到 `xhigh`。如果你的工作流偏"短、多轮、低成本"，考虑手动降到 `high`。
- 试 **`/ultrareview`**——Pro / Max 各送 3 次。把它用在 PR 规模的 change 上效果最明显（对应 CodeRabbit 引用"recall +10%"、Qodo 引用"抓到其他模型漏掉的 race condition"）。
- Max 用户可以开 **auto 模式**——适合长任务，"比跳过所有 permission 风险更低"。

**6. 成本监控要加两个指标**

- 每任务平均 input tokens 变化率（tokenizer 膨胀反映在这里）。
- 每任务平均 output tokens 变化率（effort 档位提升反映在这里）。

这两个会直接构成你真实账单的环比变化，必须单独监控。

### 你现在**不应该**做的事

- **不要默认所有老 prompt 都能直接迁过来**。尤其是跑了半年以上的自动化流程，先灰度。
- **不要盲目上 `max` effort**。输出 token 会显著上升，但在很多任务上 `xhigh` 就已经是最佳性价比。
- **不要把 cyber 用例直接切过去**——Opus 4.7 有自动拦截 safeguards，正规 security 研究走 **Cyber Verification Program**，否则会踩 block。

---

## 横向对比

### vs Opus 4.6（直系前代）

| 维度 | Opus 4.6 | Opus 4.7 | 差值来源 |
|------|---------|---------|--------|
| 价格 | $5 / $25 | **$5 / $25**（一致） | 原文"Pricing remains the same" |
| 93 题编码基准 | — | **+13%**（含 4 题 4.6 与 Sonnet 4.6 都解不出） | Mario Rodriguez |
| CursorBench | 58% | **70%** | Michael Truell |
| Rakuten-SWE-Bench | — | **3×** 生产任务解决 | Yusuke Kaji |
| XBOW 视觉精度 | 54.5% | **98.5%** | Oege de Moor |
| Databricks OfficeQA Pro | — | **错误 -21%** | Hanlin Tang |
| Notion Agent tool errors | 基线 | **1/3** | Sarah Sachs |
| 研究 Agent General Finance | 0.767 | **0.813** | Michal Mucha |
| 图像最长边 | ~800 px 级 | **2,576 px / ~3.75 MP**（"more than three times as many"） | 正文 |
| Tokenizer | 旧版 | **新版，1.0–1.35× 膨胀** | Migration guide |
| Effort 档位 | 最高 `max` | 新增 `xhigh`（在 `high` 与 `max` 之间） | Also launching |

### vs Mythos Preview（家族内上位模型）

| 维度 | Mythos Preview | Opus 4.7 |
|------|----------------|----------|
| 综合能力 | **更强**（"our most powerful model"） | 比 Mythos 弱，比 Opus 4.6 强 |
| Cyber 能力 | 更高，被有意保留 | **差分削弱 + 自动拦截 safeguards** |
| 对齐（misaligned behavior） | **最低**（"best-aligned model we've trained"） | 相对 Opus 4.6 有改善，但未达到 Mythos 水平 |
| 可用性 | 限量 | **GA**，跨所有 Claude 产品与云端 |

战略含义：Mythos Preview 是"实验室里最好的一瓶酒"，Opus 4.7 是"第一批进货到超市的量产款"。

### vs GPT-5.4 / Gemini 3.1 Pro

原文脚注明确："For GPT-5.4 and Gemini 3.1 Pro, we compared against the best reported model version available via API in the charts and table." 公开正文里可引用的直接对比只有两个定性点：

- CodeRabbit：Opus 4.7 "比 GPT-5.4 xhigh 更快一点"。
- Warp 等多家伙伴都将 Opus 4.7 描述为"market-leading"或"state-of-the-art"编码模型（未直接对比绝对数值）。

换言之：**Anthropic 不靠"我们赢了 GPT"做头条**，核心对比锚点始终是 Opus 4.6，这也是本次升级对当前 Opus 用户最负责任的做法。

### vs Sonnet 4.6（同门下位模型）

正文只提到 93 题编码基准上"含 4 题 Opus 4.6 与 Sonnet 4.6 都解不出"。没有给出更多直接 Sonnet 4.6 对比。可以推断 Opus 4.7 是在"最难的任务"上进一步拉开了 Opus 与 Sonnet 的质量分层。

---

## 批判性分析

### ① 价格没变，但"单位任务成本"几乎一定上升

Anthropic 以"价格不变"作为叙事锚点，但真实成本由三条路径上升：

1. **tokenizer 膨胀**：同一输入多 0–35% token。
2. **effort 更深**：尤其后续 turn 的 output 变多。
3. **视觉高分辨率**：图像 token 随像素上升。

官方给的救赎方案是"task budgets + effort 参数 + prompt 简洁化"——这些都要求用户侧重新投入 prompt / harness 工程。对企业客户尤其是"按月发票敏感"的组织，这次升级不是"无痛"的。

### ② "Users should re-tune their prompts" 是一次隐式破坏性变更

更严格的指令遵循往往被包装成绝对的好消息，但它实际上打破了老 prompt 里**"模型会帮我兜着"**的惯性。这意味着：

- 生产环境中大量 prompt 需要回归测试。
- 某些依赖"模糊字面"的 prompt 会触发意外行为。
- Vercel 提到"模型开始在动工前证明 systems code"——这既是能力，也是延迟和 token 开销增加的来源。

这些是有代价的"更好"。Anthropic 诚实地写了这一段，但用户需要正视它。

### ③ 合作伙伴引用的选择性偏差

28 条引用全部来自 early-access 合作伙伴——他们由 Anthropic 选择，且几乎全部在博客里用于正面宣传。这意味着：

- 我们几乎看不到"没升级"或"反而退步"的场景被公开披露。
- Replit 的"same quality at lower cost"、Hex 的"low-effort 4.7 ≈ medium-effort 4.6" 是最值得信的定量信号，因为它们直接指向**相同任务、更低 effort**，而不是定性赞美。
- 评估"非理想对齐行为"的细节（比如"overly detailed harm-reduction advice on controlled substances"这类弱化）在合作伙伴引用里完全看不到——要读 System Card 才能拼出全貌。

### ④ 视觉能力的提升是"解锁"还是"改善"需要更严格验证

XBOW 的 98.5% vs 54.5% 是一个极其戏剧性的跳跃。它背后可能有两种不同含义：

- **能力层面的突破**：更深的视觉推理。
- **输入层面的解锁**：仅仅因为现在能看到 3.75 MP 的图像，原先因为分辨率受限失败的任务现在自然通过。

官方没有把两者拆开。这意味着在你自己的视觉任务上，**得先评估你的图像是否真的被分辨率卡过**——如果之前从未卡过，Opus 4.7 的视觉收益可能远不如 XBOW 那样夸张。

### ⑤ Cyber safeguards 的"误拦截"尚未有数据

Opus 4.7 是 Anthropic 第一个带"自动拦截高风险 cyber 请求"safeguards 的模型。正文没有给出 false positive 率。对正规安全研究（vulnerability research、pen-test、red-team）用户，唯一的正路是加入 **Cyber Verification Program**——这意味着：

- 默认模型对一部分合法 security 任务会出现"保守拒答"。
- 拿不到 CVP 的独立研究者和小团队可能被迫回退到更弱模型。
- 这是一次"安全能力差分"的产品化尝试，长期效果需要观察。

### ⑥ Mythos Preview 的缺席与 Opus 4.7 的"顶点错觉"

Opus 4.7 在本文里几乎被描述为"当前最强工程模型"，但它**不是** Anthropic 手里最强的模型。一旦 Mythos 全面发布，Opus 4.7 的"顶端地位"会立即重排。这提醒使用者：

- 现在基于 Opus 4.7 做的架构决策，要为 Mythos GA 留升级余地。
- 不要把"Opus 4.7 = 天花板"写进合同或者架构设计。

### ⑦ 长时序任务的"感性"与"定量"之间的鸿沟

很多合作伙伴对 Opus 4.7 的最强赞美都是定性的："工作数小时"、"不放弃"、"graceful error recovery"、"真像一个队友"。这些体验正是长时序 Agent 的核心价值，但也最难被标准化基准捕捉。目前：

- **93 题编码基准**、**CursorBench**、**Terminal-Bench 2.0** 是结构化但短时的。
- **内部研究 Agent 基准** 提到了"长上下文表现最一致"，但 Anthropic 未公开题目。
- **GDPval-AA** 是第三方的，但覆盖范围未必匹配你所在行业。

这让长时序能力的"可迁移性"判断几乎只能靠**自己跑灰度**——这正是官方建议"measuring the difference on real traffic"的根源。

---

## 写在最后

Opus 4.7 是一次典型的"理性升级"：

- **对已经重度使用 Opus 4.6 的团队**：几乎必升。编码、长时序 Agent、视觉、企业文档四个维度的提升都足够清晰，价格不变；只需做好 tokenizer 与 effort 行为变化的成本监控、prompt 的字面执行回归测试。
- **对还在观望 Claude 的团队**：这是一个清晰的入口信号——Anthropic 正在把"长时序、严格遵循、工具失败可自愈"作为它的差异化主线，和 OpenAI 的"计算机使用 + 插件生态"、Google 的"Chrome AI Mode + 多模态统一"分别代表三条主流派。
- **对 Anthropic 本身**：Opus 4.7 是把 Mythos 的能力 / 对齐工艺安全地"下放"到通用客户群的第一步。接下来的观察点是 Mythos Preview 何时从 preview 走向 GA、Cyber Verification Program 的规模化执行、以及 `xhigh` / `task budgets` 这两个新旋钮在真实大客户使用中的反馈。

价格没变，能力变了，token 结构也变了——这次升级的真相藏在**你在自己的真实流量上测出的那条曲线里**。
