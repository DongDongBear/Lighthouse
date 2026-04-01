---
title: "Anthropic数据泄露曝光未发布模型Claude Mythos/Capybara：安全公司的安全事故"
description: "Anthropic, Claude Mythos, Capybara, 数据泄露, CMS配置错误, 模型层级, Opus, 网络安全, Fortune独家"
---

# Anthropic 数据泄露曝光"Claude Mythos"：一家安全公司的安全事故，一个超越 Opus 的新模型层级

> 信源：Fortune 独家报道（两篇）
> - https://fortune.com/2026/03/26/anthropic-says-testing-mythos-powerful-new-ai-model-after-data-leak-reveals-its-existence-step-change-in-capabilities/
> - https://fortune.com/2026/03/26/anthropic-leaked-unreleased-model-exclusive-event-security-issues-cybersecurity-unsecured-data-store/
> 发布日期：2026-03-26
> 发现者：Fortune 记者 + Alexandre Pauwels（剑桥大学网络安全研究员）+ Roy Paz（LayerX Security 高级 AI 安全研究员）

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Anthropic 因 CMS 配置人为错误泄露近 3000 份内部文档，意外曝光了比 Opus 更强的全新模型层级"Claude Mythos"（代号 Capybara） |
| 大白话版 | Anthropic 管网站内容的系统默认把所有上传文件设成"公开"，没人改成"私有"，导致一大批未发布的内部草案、PDF 等文件被外人直接访问。其中最爆的内容是：他们正在秘密测试一个比 Opus 还大还强的新模型，代号 Capybara，在编程、推理和网络安全方面号称实现了"阶跃式进步" |
| 核心数字 | ~3000 份未发布文档 / 比 Opus 更大更贵的新层级 / "step change"级提升 / 小规模早期客户测试中 |
| 评级 | A -- 产业格局级事件：Anthropic 模型层级体系将从三层变四层，同时暴露出安全叙事与安全实践之间的裂缝 |
| 信源质量 | Fortune 独家 + 剑桥大学研究员 + LayerX 安全研究员独立验证，可信度高 |
| 关键词 | Claude Mythos, Capybara, 数据泄露, CMS 配置错误, Opus 之上, 网络安全风险, step change |

## 事件全貌

### 发生了什么？

2026 年 3 月 26 日，Fortune 发布两篇独家报道，揭露了 Anthropic 一次严重的数据安全事故：

1. **泄露源头：** Anthropic 使用的外部 CMS（内容管理系统）存在配置错误——所有通过该 CMS 上传的数字资产默认为"公开"状态，拥有公开可访问的 URL，除非被手动更改为"私有"。Anthropic"appears to have forgotten to restrict access to some documents that were not supposed to be public"。
2. **泄露规模：** 约 3000 个与 Anthropic 博客相关的未发布资产暴露在公开可搜索的数据存储中。
3. **泄露内容类型：** 草案博客文章、图片、PDF、Logo、图形、研究文件和内部资产。
4. **最敏感的发现：** 一篇草案博客文章，详细描述了一个从未对外披露的新模型"Claude Mythos"（也称"Capybara"）——定位于 Opus 之上的全新层级。
5. **其他敏感泄露：** 员工育儿假信息的 PDF、一场计划在英国 18 世纪庄园酒店举办的仅限邀请 CEO 峰会的详细信息——包括 Dario Amodei 与欧洲商界领袖和政策制定者的聚会安排、议员和决策者座谈议程。

### 谁发现的？

Fortune 记者首先在未设防的公开数据存储中发现了这些描述。随后两位独立安全研究人员对泄露内容进行了验证：

- **Alexandre Pauwels**，剑桥大学网络安全研究员——在 Fortune 邀请下评估并审查了泄露材料。
- **Roy Paz**，LayerX Security 高级 AI 安全研究员——独立定位并审查了泄露内容。

两位研究人员均确认：该系统无需登录即可公开访问。任何具备基本技术知识的人都可以向该系统发送请求，让它返回所包含文件的信息，然后直接访问未发布的材料。部分文件甚至拥有可在浏览器中直接打开的公开地址。

### 详细时间线

| 时间 | 事件 |
|---|---|
| 不确定 | CMS 配置错误发生——上传文件默认设为公开 |
| 3 月 26 日之前 | 泄露内容已在网上可被发现和访问 |
| 3 月 26 日（周四） | Fortune 发现泄露，联系 Anthropic |
| 3 月 26 日（周四晚） | Anthropic 关闭公开搜索访问，移除泄露内容 |
| 3 月 26 日 | Fortune 发布两篇独家报道 |

### Anthropic 的官方回应

Anthropic 的回应严格分为两个层面。

**关于泄露本身：**

> "An issue with one of our external CMS tools led to draft content being accessible."

归因为"human error in the CMS configuration"（CMS 配置中的人为错误）。同时强调：

> "These materials were early drafts of content considered for publication and did not involve our core infrastructure, AI systems, customer data, or security architecture."

并特别声明该 CMS 问题"unrelated to Claude, Cowork, or any Anthropic AI tools"——与 Claude、Cowork 或任何 Anthropic AI 工具无关。

**关于 Mythos 模型（正式确认其存在）：**

> "We're developing a general purpose model with meaningful advances in reasoning, coding, and cybersecurity. Given the strength of its capabilities, we're being deliberate about how we release it. As is standard practice across the industry, we're working with a small group of early access customers to test the model. We consider this model a step change and the most capable we've built to date."

这段声明虽然刻意不提"Mythos"或"Capybara"的名字，但事实上确认了泄露信息的核心内容——一个超越此前所有模型的新产品正在开发和测试中。

## Claude Mythos / Capybara：技术解析

### 一个超越 Opus 的新模型层级

根据泄露的草案博客，Capybara 的定位表述非常清晰：

> "Capybara is a new name for a new tier of model: larger and more intelligent than our Opus models."

这意味着 Anthropic 的模型产品线将发生结构性变化：

```
旧体系（三层）               新体系（四层）
                            Capybara / Mythos  <-- 新增顶层
Opus（最大最强）              Opus
Sonnet（速度能力平衡）          Sonnet
Haiku（最快最廉价）             Haiku
```

自 2024 年 3 月 Claude 3 首次引入 Opus / Sonnet / Haiku 三层结构以来，这是 Anthropic 产品线的首次层级扩展。Capybara 不是 Opus 的下一个版本号——它是一个全新的、更高的层级。

### 性能表述：不是渐进，是跳跃

泄露草案中的关键性能描述：

> "Compared to our previous best model, Claude Opus 4.6, Capybara gets dramatically higher scores on tests of software coding, academic reasoning, and cybersecurity, among others."

值得拆解的措辞：

- **"dramatically higher"**（显著更高）——不是"slightly better"或"meaningfully improved"，而是用了"dramatically"
- **三大突破领域：** 编程（software coding）、学术推理（academic reasoning）、网络安全（cybersecurity）
- **"among others"**——暗示还有更多未提及的领域也有显著提升

Anthropic 官方确认时使用了"step change"（阶跃式进步），这是一个在物理学和工程学中有精确含义的术语——不是连续曲线上的改善，而是函数值的不连续跳变。

### 网络安全能力：泄露文档中最令人警觉的部分

草案博客对 Mythos 的网络安全能力给予了特别关注，这也是泄露文档中信息密度最高、措辞最严肃的部分：

**能力声明：**

> 模型"currently far ahead of any other AI model in cyber capabilities"

——远超任何其他 AI 模型的网络安全能力。

**风险预警：**

> 该模型"presences an upcoming wave of models that can exploit vulnerabilities in ways that far outpace the efforts of defenders"

——预示了一波 AI 模型将以远超防守方应对能力的方式利用漏洞。

**发布策略逻辑：**

> "We're releasing it in early access to organizations, giving them a head start in improving the robustness of their codebases against the impending wave of AI-driven exploits."

Anthropic 的逻辑链条是：我们知道这种级别的网络安全能力即将在整个行业涌现，所以我们先让防御方拿到这个工具，让他们有时间加固自己的代码库。

**Anthropic 声明中对网络安全的呼应：**

> "In particular, we want to understand the model's potential near-term risks in the realm of cybersecurity -- and share the results to help cyber defenders prepare."

### 当前发布状态

根据泄露信息和 Anthropic 官方确认，综合判断：

| 维度 | 状态 |
|---|---|
| 训练 | 已完成 |
| 测试 | 正在与"小规模早期客户群"测试 |
| 成本 | 比 Opus 更贵，"expensive to run" |
| 公开发布 | "not yet ready for general release" |
| 发布策略 | 审慎，先安全防守方和早期客户，后广泛开放 |

## 产业影响链

### 1. Anthropic 模型战略的结构性转向

```
Capybara 的出现
  |-- 模型层级从三层变四层
  |    |-- Opus 不再是 Anthropic 的能力天花板
  |    |-- Capybara 定位为"最贵最强"，Opus 可能逐步下沉为"高端平衡层"
  |    +-- 产品定价和市场定位将全面重构
  |-- 发布策略转向"能力越强越慎重"
  |    |-- 不是"先发制人"，而是"先防守再进攻"
  |    +-- 与 OpenAI 的快速发布节奏形成鲜明对比
  +-- 安全叙事从"我们做负责任 AI"升级到"我们的模型强到需要特殊处理"
```

### 2. 竞争格局的直接冲击

如果 Mythos/Capybara 的性能描述属实，它将进入与以下模型的直接竞争：

| 竞品 | 厂商 | 当前状态 | 竞争维度 |
|---|---|---|---|
| GPT-5.4 旗舰 | OpenAI | 已发布 | 通用推理、编程、1M 上下文 |
| GPT-5.4 Pro | OpenAI | 已发布 | 高难度任务，更多算力投入 |
| Gemini 2.0 Ultra | Google | 即将发布 | 多模态旗舰 |
| DeepSeek V4 | DeepSeek | 传言 4 月发布 | 开源旗舰，万亿参数 MoE |

值得注意的差异化定位：Capybara 描述中特别强调的三大突破维度——编程、学术推理、网络安全——与 GPT-5.4 的核心卖点（1M 上下文 + Computer Use + Codex 生态 + 功能广度）形成了不同的竞争角度。Anthropic 选择在深度能力上纵向突破，而非在功能广度上横向追赶。

### 3. 网络安全领域的证据链

泄露文档中对网络安全能力的描述，并非孤立信息。它与近期一系列事件构成了一条连贯的证据链：

| 时间 | 事件 | 意义 |
|---|---|---|
| 2025 年 11 月 | 中国国家背景组织利用 Claude Code 入侵约 30 个组织（科技公司、金融机构、政府部门），被 Anthropic 检测后封禁账户并通知受害者 | 现有模型已被国家级攻击者武器化 |
| 2026 年 2 月 | OpenAI GPT-5.3-Codex 在其 Preparedness Framework 下被自评为"high capability"（高网络安全能力） | 行业能力阈值被跨越 |
| 2026 年 2 月 | Claude Opus 4.6 展示在生产代码库中发现此前未知漏洞的能力 | 防御端价值初步显现 |
| 2026 年 3 月 | Claude 自主发现 FreeBSD 内核远程 RCE (CVE-2026-4747)，完成从源码审计到完整利用链的全链路 | AI 攻防能力的实战验证 |
| 2026 年 3 月 | Mythos 泄露：号称"far ahead of any other AI model in cyber capabilities" | 下一次能力阶跃即将到来 |

这条链条的含义是：AI 的网络安全能力正在以非线性速度增长。Opus 4.6 已经能够自主完成内核级 RCE 的完整利用链——如果 Mythos 真的在此基础上实现了"阶跃式进步"，其攻防两端的影响将是深远的。

### 4. 预期各方反应

- **OpenAI：** 可能加速下一代旗舰模型的发布节奏，GPT-5.4 Pro 已经在走"更高层级"方向
- **Google：** 可能提前推出 Gemini 2.0 Ultra 或加强 Gemini 3 Pro 的能力宣传
- **DeepSeek：** V4 如果在 4 月如传言发布，将成为开源阵营对标 Capybara 层级的关键参照
- **企业客户：** 网络安全领域的企业客户可能优先选择 Anthropic，如果 Capybara 的网安能力如泄露所述
- **监管方：** AI 模型的网络安全能力评估和披露义务的讨论将加速

## 批判性分析

### 安全公司的安全事故：不是讽刺，是系统性问题

这是整个事件中最值得深入分析的角度。

Anthropic 的品牌叙事核心是"安全"——Constitutional AI、负责任的扩展政策（Responsible Scaling Policy）、AI Safety Levels 评估框架，以及对 AI 灾难性风险的持续公共警告。这家公司的存在意义，很大程度上建立在"我们比其他人更重视安全"的定位之上。

然而，暴露 3000 份内部文档的原因不是什么高级网络攻击，不是零日漏洞利用——而是 CMS 默认设置没改。

**1. "人为错误"的辩护力度有限**

Anthropic 将其归因为"human error in the CMS configuration"。但问题不在于有人犯了一个错误：

- 这是系统性的——所有上传文件默认为公开，而非默认为私有
- 这意味着要么没有上线前的安全审查流程，要么审查流程未覆盖第三方 CMS 配置
- 约 3000 个文件处于泄露状态，说明这个问题存在了相当长的时间
- 对于一家反复强调"systems-level safety thinking"的公司，一个影响数千文件的配置错误不是"人为失误"能完整解释的

**2. "不涉及核心系统"的声明需要审视**

Anthropic 强调泄露"did not involve our core infrastructure, AI systems, customer data, or security architecture"。这在技术上可能是准确的。但泄露的内容包括：

- 未发布模型的详细能力描述和发布计划——这是最高级别的商业机密
- 模型安全评估的内部讨论——这影响监管判断和公众认知
- CEO 级别活动的安全敏感信息——参与者、地点、议程
- 内部人事相关文件——员工育儿假信息

即使核心 AI 系统未受直接影响，这些内容的泄露本身已经构成严重的信息安全事件。

**3. 泄露内容与安全叙事之间的深层张力**

最深层的讽刺在于：泄露的 Mythos 草案中，Anthropic 以极为严肃的语气讨论了该模型的网络安全风险——"far ahead of any other AI model in cyber capabilities"——并因此采取了极为审慎的发布策略。

也就是说：Anthropic 一边在内部文档中讨论如何负责任地处理一个可能被用于网络攻击的超强模型，一边却因为 CMS 默认配置没改，把这份讨论本身公开给了全世界。

**4. 并非孤立事件**

这次 CMS 泄露并不是 Anthropic 近期唯一的运维安全事故。仅在前后几天内：

- **3 月 25 日：** Claude Code npm 发包时带出 source map，导致 51.2 万行 TypeScript 源码泄露，其中包含 KAIROS 主动 Agent 计划（7x24 在线、GitHub webhook 订阅、cron 定时任务、跨会话记忆）的完整代码
- **同期：** 社区发现缓存 sentinel 替换导致 API 计费异常，实际多收 10-20 倍费用

36氪对此的评论一针见血：

> "你连核心客户端的 source map 都能带着源码一起发出去，那你内部的 release review、artifact audit、supply chain hygiene 到底做得怎么样？"

短时间内连续暴露的基础运维问题，指向的不是个别人的失误，而是工程治理层面的系统性薄弱环节。

**5. 本质问题：AI safety 不等于 information security**

这是需要被明确指出的：**AI 安全（AI safety）和信息安全（information security）是两个不同的学科**。Anthropic 在前者上的卓越——Constitutional AI、RLHF 对齐技术、模型能力评估框架——并不自动转化为后者的可靠。

一家公司可以同时拥有世界一流的 AI 对齐研究团队和不合格的 CMS 配置审查流程。这不矛盾，但它确实暴露了组织能力的不均衡。对于一家估值数百亿美元、手握可能是"最强网络安全 AI 模型"的公司，这种不均衡是不可接受的。

### 泄露信息的可信度评估

对 Mythos/Capybara 的性能描述需要保持适度审慎：

**支持可信度的因素：**
- Anthropic 官方确认了模型的存在、"step change"定位和"most capable we've built to date"的评价
- 两位独立安全研究人员（剑桥 + LayerX）验证了泄露内容的真实性
- 描述与近期 Claude 能力轨迹一致（CVE-2026-4747 事件证明 Opus 4.6 已具备内核级漏洞发现和利用能力）
- Anthropic 的审慎发布策略本身也间接证实了性能声明——如果模型能力一般，没有必要如此谨慎

**需要打折的因素：**
- 泄露内容明确是"draft"（草案），不是正式发布文件
- "dramatically higher scores"没有给出具体基准测试名称或数字
- 草案可能包含内部营销措辞，正式发布时的表述可能收敛
- 从草案到正式发布，模型名称（Mythos? Capybara? 还是其他？）、层级定位和能力描述都可能变化
- "far ahead of any other AI model in cyber capabilities"这类绝对化表述需要独立验证

### 被忽略的风险维度

**1. 成本问题可能限制实际影响力：**

草案提到 Capybara"expensive to run and not yet ready for general release"。如果运行成本显著高于 Opus，那么：
- 它可能只服务于少数高端企业客户，而非广泛开发者群体
- 定价如果过高，会给竞争对手留下中端市场的空间
- "最强模型"如果只有极少数人用得起，其实际产业影响可能不如更廉价的竞品

**2. 安全能力的不对称性：**

Anthropic 计划先向防守方提供早期访问，逻辑上是对的。但现实是：
- 攻击者不需要"Capybara"这个特定模型——他们可以等其他厂商的类似能力模型
- 如果多家厂商的前沿模型同时到达类似的网络安全能力水平，"先让防守方用"的时间窗口会非常短
- 草案自己也承认：Mythos"presences an upcoming wave of models"——说明这不是只有 Anthropic 一家会到达的能力水平

**3. 对 Anthropic IPO 叙事的冲击：**

Anthropic 被广泛预计可能在 2026 年启动 IPO 流程。连续的安全事件（CMS 泄露 + npm 源码泄露 + 计费 Bug）对资本市场的"管理成熟度"和"运营风险管理"评估不利。泄露虽然曝光了一个可能极为强大的新产品（利好），但也暴露了基础运维治理的薄弱（利空）。

### KAIROS + Mythos：被低估的协同效应

如果将 Mythos 泄露与同期曝光的 KAIROS 主动 Agent 计划联系起来看，组合图景更加引人注目：

- **Mythos：** "step change"级别的推理、编程和网络安全能力
- **KAIROS：** 7x24 在线运行、GitHub webhook 事件订阅、cron 定时任务、跨会话记忆

如果 Mythos 模型驱动 KAIROS 系统，最终产品不是一个更聪明的聊天机器人，而是一个**全天候自主运行的超级 Agent**——能够持续监控代码库、自动响应安全事件、自主发现和修复漏洞。这代表的是从"工具"到"自主系统"的范式转变。

## 竞争格局全景

### 2026 年 3 月底前沿模型格局

| 厂商 | 当前旗舰 | 方向 | 强项 | 弱项 |
|---|---|---|---|---|
| Anthropic | Opus 4.6（Capybara 测试中） | 深度能力纵向突破 | 编程/推理/安全 | 功能广度、多模态 |
| OpenAI | GPT-5.4 全系列 | 功能矩阵横向覆盖 | 1M 上下文、Computer Use、Codex 生态 | 审慎发布不如 Anthropic |
| Google | Gemini 3 Pro / Flash | 多模态 + 开发平台 | Antigravity 平台、多模态 | 前沿模型发布节奏偏慢 |
| DeepSeek | V3（V4 传言 4 月） | 开源旗舰 | 开源生态、性价比 | 闭源追赶难度大 |

### Capybara 如果如期发布后的格局变化

Capybara 的出现将在以下维度重塑竞争：

1. **能力天花板：** 如果"dramatically higher than Opus 4.6"属实，Capybara 将重新定义前沿模型的能力上限
2. **层级竞争：** 可能触发 OpenAI（GPT-5.4 Pro 之上？）和 Google（Gemini Ultra Pro？）的层级扩展响应
3. **安全市场：** 网络安全能力如果真的"far ahead"，Anthropic 将切入高价值企业安全市场
4. **发布节奏哲学：** Anthropic 的"能力越强越慎重"与 OpenAI 的快速迭代形成两种路线之争

## Anthropic 模型迭代的历史脉络

| 时间 | 里程碑 | 评价 |
|---|---|---|
| 2024 年 3 月 | Claude 3（Opus/Sonnet/Haiku 三层首次引入） | 奠定产品线结构 |
| 2024 年 6 月 | Claude 3.5 Sonnet | 中端性价比突破 |
| 2024 年 10 月 | Claude 3.5 Haiku | 轻量层补齐 |
| 2025 年 2 月 | Claude 4 系列 | 代际升级 |
| 2025 年 10 月 | Claude Opus 4.5 | 旗舰显著提升 |
| 2026 年 2 月 | Claude Opus 4.6 | 网安能力突破（BrowseComp 自主信息获取） |
| 2026 年 3 月 | Mythos/Capybara 泄露 | "step change"——可能是 Anthropic 史上最大的单次能力跃升 |

值得注意的节奏变化：从 Claude 3 到 3.5 是渐进式提升；从 4 到 4.5 是显著提升；4.5 到 4.6 是网安能力的专项突破。而 Capybara 作为全新层级的引入，标志着 Anthropic 不再满足于在现有层级内迭代——而是向上开辟新的能力空间。

## 接下来该盯什么

1. **正式发布时间线：** 泄露已经把 Mythos/Capybara 的存在公之于众，继续保密的战略价值大打折扣。关注 Anthropic 是否加速正式发布以控制叙事，还是坚持原定的审慎节奏。最早可能在 2-4 周内有动作。
2. **早期客户反馈：** "小规模早期客户测试"意味着已经有人在使用。关注是否有非官方的性能对比、基准测试数据或使用体验流出。
3. **定价信号：** 泄露文档称其"expensive to run"、比 Opus 更贵。具体贵多少将直接决定市场定位——是面向广泛开发者的新旗舰，还是面向少数高端客户的特殊产品。
4. **信息安全整改：** 这次泄露之后，Anthropic 是否会公开其信息安全整改方案？对一家以安全为品牌核心的公司而言，如何处理善后本身也是一个重要信号。
5. **网络安全社区响应：** Mythos 如果真的"far ahead of any other AI model in cyber capabilities"，安全研究者和安全厂商对其发布时机和访问限制的讨论将是重要的行业风向标。
6. **竞品发布节奏变化：** 关注 OpenAI 和 Google 是否因为 Capybara 的曝光而调整自身旗舰模型的发布时间表。
7. **KAIROS 与 Mythos 的整合时间线：** 如果这两者如期组合发布，将标志着 AI Agent 从"工具辅助"到"自主系统"的范式转变。
