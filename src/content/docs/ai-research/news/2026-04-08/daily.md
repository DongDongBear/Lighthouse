---
title: "2026-04-08 AI 日报：Anthropic 发起 Glasswing，Google 和 OpenAI 都在补 AI 时代的基础设施"
description: "国际线聚焦 Glasswing、TBPN 收购、Google 印度基建；中国区采集 12 条：GLM-5.1 开源登顶 SWE-bench Pro、Qwen 3.6-Plus 登顶全球调用榜、中国模型连续五周称霸 OpenRouter、DeepSeek V4 优先华为昇腾、月之暗面估值飙至 180 亿美元启动 IPO 评估等。"
---

# 2026-04-08 AI 日报

> 今天系统采集有些波折，以下内容由手动补采官方页、Hacker News 与综合信源整理。
> 参考源包括 Anthropic / Google 官方页面、InfoQ、CNBC、Hacker News、快科技以及 Reuters 检索结果。

---

## 上期追踪问题回应

> 以下回应 2026-04-06 日报末尾提出的三个追踪问题。

**1. 微软会不会把更多自研 MAI 模型前置到 Foundry / Copilot，进一步稀释 OpenAI 在微软生态里的独占心智？**
暂无明确新进展。微软出现在 Anthropic 发起的 Project Glasswing 合作名单中（见下方条目 1），但这是防御侧合作而非模型分发层动作。MAI 模型前置到 Foundry 的节奏仍需后续观察。

**2. Bedrock Guardrails 这类跨账号治理能力，会不会成为企业选择模型平台时比模型本身更硬的采购门槛？**
暂无直接更新。但值得注意的是，中国方面智谱、MiniMax 上市后均开始强化企业合规与治理能力披露（见中国区条目），企业治理能力作为采购门槛的趋势在中美两侧同步显现。

**3. Google 的 Gemma 4 + AI Edge Gallery + LiteRT-LM 组合，能否在 2026 年形成真正可复制的端侧 agent / multimodal 开发生态？**
有积极信号。Gemma 4 多模态微调工具 gemma-tuner-multimodal 登上 HN 热榜，已支持 Apple Silicon 本地多模态 LoRA（见下方条目 9）。中国方面，智元 AGIBOT 启动 AI 发布周聚焦端侧具身智能（见中国区条目 CN-4），端侧 AI 生态正在全球加速形成。

---

## ⭐ 三大厂动态

### 1. Anthropic 发起 Project Glasswing，AI 网络安全正式进入协同防御阶段

Anthropic 今天宣布 Project Glasswing，联合 AWS、Apple、Broadcom、Cisco、CrowdStrike、Google、JPMorganChase、Linux Foundation、Microsoft、NVIDIA、Palo Alto Networks 等机构，用 Claude Mythos Preview 扫描和加固关键软件。

最关键的信息不是“联盟名单很长”，而是 Anthropic 已经明确说，Mythos Preview 在找漏洞和构造 exploit 上，能力足以重新定义网络安全节奏。官方还给出 1 亿美元 Mythos 使用额度和 400 万美元对开源安全组织的直接捐助。

我的判断是，这条线比普通模型更新更重要。因为它说明 frontier model 的能力边界已经不只是内容生成和 coding assistant，而是开始真正影响关键基础设施安全。

### 2. OpenAI 收购 TBPN，开始补“叙事分发层”

OpenAI 官方检索结果显示，公司已收购 Technology Business Programming Network（TBPN），目标是“加速全球围绕 AI 的对话、支持独立媒体，并扩大与 builders、businesses 和 broader tech community 的交流”。

这件事看起来像媒体小并购，实际上更像渠道层布局。OpenAI 现在已经不只是在做模型、做产品、做资金和算力，还开始主动控制行业讨论场和内容入口。

### 3. Google 在印度 AI Impact Summit 端出基础设施、公共部门和产品三件套

Google 官方宣布，近期将向印度投 150 亿美元建设 AI 基础设施，并推出 America-India Connect 光纤项目。同时还有两个 3000 万美元级别的 Google.org 计划，分别面向政府创新和 AI for Science。DeepMind 也将与印度政府和本地机构合作，开放 AI for Science 模型与创新中心能力。

产品层面，Google 还预告了 70+ 语言实时 speech-to-speech 翻译、Search Live 模型升级、Gemini 面向学生和公共部门的进一步渗透。

这说明 Google 的 AI 竞争思路正在更像“国家级数字基础设施承包商”，而不只是模型提供商。

---

## 🔥 今日热点

### 4. Broadcom 扩大与 Google、Anthropic 的 AI 芯片合作

CNBC 披露，Broadcom 将继续生产 Google 后续 AI 芯片，同时 Anthropic 通过 Google TPU 获得约 3.5GW 算力容量。Anthropic 还表示其年化收入已超过 300 亿美元，年 spend 超过 100 万美元的企业客户超过 1000 家。

这意味着 TPU 生态正在从 Google 内部资源变成可被顶级模型厂大规模调用的外部平台。对 NVIDIA 来说，真正的压力从来不是单个芯片性能，而是替代生态开始成立。

### 5. Claude Mythos Preview 的安全能力已经出现“代际跳变”

Anthropic Frontier Red Team 博客披露，Mythos Preview 在真实测试中找到了 27 年未发现的 OpenBSD 漏洞、16 年的 FFmpeg 漏洞，并显著提升了 Firefox 等复杂目标上的 exploit 成功率。官方甚至明确提到，许多任务可在接近自主状态下完成。

这个变化很值得警惕。模型的 general code / reasoning / autonomy 一旦跨过某个阈值，就会自然外溢成 offensive cyber 能力，而不是需要单独训练出来的“黑客技能”。

### 6. Google 开源 Scion，多智能体开始进入“运行时工程”阶段

InfoQ 报道，Google 开源了实验性多智能体编排测试床 Scion。它把 agent 运行在隔离容器、独立身份、独立 git worktree 中，支持 Claude Code、Gemini CLI、Codex 等 harness，并强调通过运行时隔离而不是塞更多 prompt 规则来保证安全。

这条消息代表行业成熟了一步。过去大家争的是哪个 agent 看起来更聪明，现在开始认真补并发、身份、权限、协作和回收，这才是多智能体真正能进生产的前提。

### 7. Mistral 继续补欧洲 AI 基础设施，开始往数据中心重资产走

据 Reuters 检索结果，Mistral 近期一边筹集约 8.3 亿美元债务融资支持 AI 数据中心建设，一边还在瑞典追加约 14 亿美元的数据中心投资。

这说明欧洲最有希望的模型公司之一，已经不满足于做轻资产 API 层创业公司，而是开始补“电力 + 机房 + 长期供给”这条硬骨头。欧洲 AI 如果想长期有牌桌位置，这步几乎绕不过去。

### 8. 中国模型在 OpenRouter 的真实全球流量上持续压过美国

快科技援引 OpenRouter 数据称，上周全球模型调用总量达 27 万亿 token，环比增长 18.9%，中国模型调用量已连续五周超过美国，周环比增长超过 31%。

这类数据比 benchmark 更能说明问题。因为它反映的是开发者在真实 API 消耗里到底选了谁。中国模型如果继续在成本、吞吐和可用性上把量跑出来，全球开发者分发层的格局会继续松动。

### 9. Gemma 4 的开源价值正在通过本地工具链快速放大

Hacker News 热帖中的项目 `gemma-tuner-multimodal`，已经把 Gemma 4 / 3n 的 text、image、audio 微调带到 Apple Silicon，支持本地多模态 LoRA 和云端流式数据训练，不需要 NVIDIA 机器。

这类工具未必会上大新闻，但它很有信号意义。开源模型想形成真正生态，关键不只是参数开放，而是能不能让普通开发者以可承受成本真的跑起来、改起来、用起来。

---

## 🇨🇳 中国区

> 本轮为补跑采集，覆盖 4 月 6 日至 8 日中国区核心 AI 动态。

### CN-1. ⭐ 阿里 Qwen 3.6-Plus 发布即登顶全球模型调用榜，单日 1.4 万亿 Token 破纪录

**概述：**阿里于 4 月 2 日发布新一代大语言模型 Qwen 3.6-Plus，主打编程能力大幅提升、百万级上下文窗口。发布仅 1 天，在 OpenRouter 平台上单日调用量突破 1.4 万亿 Token，打破该平台单日单模型调用量全球纪录，成为 2026 年上线以来表现最强劲的模型。

**技术/产业意义：**Qwen 3.6-Plus 在国际 Arena 编程子榜排名中国第一，阿里由此成为全球编程能力排名第二的 AI 机构。免费策略（$0/M tokens）+ 百万上下文 + 强编程能力的组合，直接改变了开发者在 API 层的选择逻辑。

**深度分析：**
- 模型支持原生 100 万 Token 上下文，适配 OpenClaw、Claude Code、Cline、OpenCode 等主流 Agent 框架
- 采用原生全模态训练，多模态理解和指令遵循能力显著提升
- 在 OpenRouter 上线后调用量增长 711%，反映真实开发者需求
- 阿里百炼平台定价 2 元/百万 Token，免费版在 OpenRouter 持续引流

**评论观察：**
- 🟢 支持：编程 + 长上下文 + 免费的组合，直接命中 AI Agent 开发者痛点
- 🔴 质疑：免费策略能否持续？高调用量中有多少是"薅羊毛"而非真实生产负载？

**信源：**https://finance.sina.com.cn/stock/t/2026-04-04/doc-inhticfz6330138.shtml

**关联行动：**关注 Qwen 3.6-Plus 免费期结束后的留存率和定价策略变化。

---

### CN-2. ⭐ 中国 AI 大模型连续五周称霸 OpenRouter 全球调用量，包揽前六

**概述：**据 4 月 6 日数据，3 月 30 日至 4 月 5 日当周全球 AI 模型总调用量达 27 万亿 Token（环比 +18.9%）。中国 AI 大模型周调用量达 12.96 万亿 Token（环比 +31.48%），连续五周超越美国（美国同期仅 3.03 万亿，环比 +0.76%）。中国模型包揽全球调用量前六名。

**技术/产业意义：**这是比 benchmark 更具说服力的指标——反映的是全球开发者在真实 API 消耗中的选择。中国模型在成本、吞吐和可用性上的优势正在转化为实际市场份额。中国调用量是美国的 4.3 倍，差距仍在扩大。

**深度分析：**
- 前六排名：① Qwen3.6 Plus (free) 4.6 万亿 ② 小米 MiMo-V2-Pro 3.08 万亿 ③ Qwen3.6 Plus Preview 1.64 万亿 ④ 阶跃 Step 3.5 Flash 1.26 万亿 ⑤ MiniMax M2.7 1.19 万亿 ⑥ DeepSeek V3.2 1.19 万亿
- 智谱 GLM 5 Turbo 和 MiniMax M2.5 跌出榜单，中国模型间竞争同样激烈
- 免费策略是主要驱动力，但也说明中国厂商愿意用补贴换生态

**评论观察：**
- 🟢 支持：调用量是最硬的实力证明，中国模型已从追赶进入大规模应用爆发期
- 🔴 质疑：免费驱动的调用量能否转化为可持续商业模式？一旦收费，格局会否逆转？

**信源：**https://finance.sina.com.cn/jjxw/2026-04-06/doc-inhtpmef6258452.shtml

**关联行动：**持续追踪 OpenRouter 周数据，关注付费模型与免费模型调用量的此消彼长。

---

### CN-3. ⭐ DeepSeek V4 确认优先支持华为昇腾芯片，国产 AI 软硬件协同迈出关键一步

**概述：**据 4 月 4 日报道，DeepSeek V4（万亿参数 MoE 架构，每次推理激活约 370 亿参数）将优先支持华为昇腾 950PR 芯片（搭载于 Atlas 350 加速卡），而非向英伟达开放测试。DeepSeek 团队已与华为、寒武纪密切合作，重写部分底层代码以适配国产芯片。

**技术/产业意义：**这是中国最受关注的 AI 模型公司首次明确将国产芯片置于优先位置。如果 V4 在华为芯片上的推理表现达到可接受水平，将证明中国 AI 产业链可以在不依赖英伟达的情况下运行 frontier 模型。

**深度分析：**
- 昇腾 950PR 算力 1 PFLOPS（FP8）/ 2 PFLOPS（FP4），内存 128GB，互联带宽 2TB/s
- 单卡算力约为 H20 的 2.87 倍，国内唯一支持 FP4 低精度
- 阿里、字节、腾讯已提前抢购数十万颗 950PR，芯片价格上涨 20%
- V4 发布时间从 2 月推迟至 4 月，部分原因正是为了适配华为芯片

**评论观察：**
- 🟢 支持：国产替代不再是口号，DeepSeek 的示范效应可能带动整个行业转向
- 🔴 质疑：适配过程中的性能损失有多大？国产芯片的软件生态（CANN）成熟度是否足够？

**信源：**https://news.mydrivers.com/1/1113/1113767.htm

**关联行动：**关注 DeepSeek V4 正式发布时间及在华为芯片上的实际推理性能 benchmark。

---

### CN-4. ⭐ 智元 AGIBOT AI Week 启幕，具身智能全栈技术集中发布

**概述：**智元机器人（AGIBOT）于 4 月 7 日在北京启动为期六天的"智元 AI 发布周"（4 月 7-12 日），每个工作日发布一项具身智能核心技术突破，覆盖感知、决策、运动控制等物理 AI 核心环节。此前 3 月 30 日，智元已实现第 10000 台产品下线。

**技术/产业意义：**这是中国具身智能领域首次以"发布周"形式进行集中技术展示。智元的策略是全栈自研（硬件 + 算法 + 数据 + 场景），区别于只做模型或只做硬件的分散式路线，目标是解决行业"技术拼凑、落地断层"的痛点。

**深度分析：**
- 万台下线标志着从原型到规模化生产的跨越
- 5000 台到 10000 台仅用一个季度，产能爬坡加速
- 此前已开源 AGIBOT WORLD 2026 数据集，推动行业数据共享
- "发布周"模式类似科技大厂的产品发布节奏，显示智元正在建立品牌心智

**评论观察：**
- 🟢 支持：全栈自研 + 规模量产 + 开源数据，三位一体的路径在中国具身智能公司中最为完整
- 🔴 质疑：万台下线不等于万台实际部署，真实场景落地仍需验证

**信源：**https://finance.sina.com.cn/tech/digi/2026-04-03/doc-inhteyic3773662.shtml

**关联行动：**逐日跟踪智元 AI 发布周的每日技术发布，评估其技术完整性。

---

### CN-5. [B] DeepSeek 灰度上线"专家模式"，移动端推理能力探路

**概述：**4 月 8 日，DeepSeek 在移动端和 Web 端悄然上线"专家模式"选项，与默认"快速模式"并列。用户实测发现，专家模式下复杂推理任务的深度思考时间可超过 500 秒，答案质量有所提升。

**技术/产业意义：**这是 DeepSeek 在 V4 正式发布前的产品迭代信号。专家模式降低了用户使用高级推理的门槛，但社区测试显示其主要依靠 System Prompt 调整而非底层架构变化。

**深度分析：**
- 实测性能提升有限，暂未出现"代际跳变"
- 模型自身提示显示改进主要来自提示词工程调整
- 可能是为 V4 做 UX 铺垫，预先让用户习惯"模式切换"交互
- Linux.do 社区率先发现并传播

**评论观察：**
- 🟢 支持：产品层面的精细化运营，说明 DeepSeek 开始认真做用户体验
- 🔴 质疑：如果只是提示词调整，"专家模式"的实质价值有限

**信源：**https://www.80aj.com/2026/04/08/deepseek-expert-mode-upgrade/

**关联行动：**等待 DeepSeek V4 正式发布后，对比专家模式与 V4 的实际性能差异。

---

### CN-6. [B] 小米 MiMo-V2-Pro 全球调用量排名第二，匿名首发策略成话题

**概述：**小米于 3 月 21 日发布 MiMo-V2-Pro（万亿参数级、百万上下文），此前以代号"Hunter Alpha"在 OpenRouter 匿名上线并迅速登顶日榜。截至 4 月 5 日当周，MiMo-V2-Pro 以 3.08 万亿 Token 周调用量位居全球第二，仅次于 Qwen 3.6-Plus。

**技术/产业意义：**小米作为手机厂商切入大模型 API 市场，匿名发布策略（让性能说话而非品牌说话）在行业内制造了话题效应。雷军亲自宣布认领，说明小米 AI 战略权重在提升。

**深度分析：**
- 万亿参数 MoE 架构，性能对标 GPT-5.2 和 Claude Opus 4.6
- 匿名期周消耗 5000 亿 Token，证明真实性能吸引力
- 联合 OpenClaw、OpenCode、KiloCode 等 Agent 框架，主攻开发者生态
- 小米的端侧（手机）+ 云侧（MiMo API）双线布局开始成型

**评论观察：**
- 🟢 支持：小米证明了手机厂商做大模型不是跨界玩票，而是有真技术储备
- 🔴 质疑：限免期结束后能否保持调用量？小米的模型研发团队规模是否支撑长期迭代？

**信源：**https://www.ithome.com/0/930/651.htm

**关联行动：**关注小米 MiMo-V2-Pro 付费后的调用量变化及端侧部署进展。

---

### CN-7. [B] 字节跳动豆包日均 Token 突破 120 万亿，两年增长 1000 倍

**概述：**4 月 2 日火山引擎 AI 创新巡展上，字节跳动披露豆包大模型最新数据：日均调用量突破 120 万亿 Token，3 个月内翻倍，自 2024 年 5 月首次发布以来增长 1000 倍。火山引擎 MaaS 在中国公有云市场份额达 49.2%。

**技术/产业意义：**120 万亿日均 Token 是一个惊人数字，说明豆包已深度嵌入字节生态（抖音、飞书、Coze 等）。火山引擎占据近半公有云 MaaS 份额，字节在 B 端 AI 基础设施层也建立了强势地位。

**深度分析：**
- 增长主要来自两大驱动：Seedance 视频创作 + ArkClaw 智能体
- ArkClaw 已支持飞书、微信、钉钉等多渠道，定位"开箱即用"
- 日均 120 万亿 Token 远超 OpenRouter 全球周总量（27 万亿），但两者统计口径不同（内部生态 vs 外部 API 平台）
- 字节 2026 年 AI 基础设施资本开支约 1.6 万亿人民币

**评论观察：**
- 🟢 支持：内部生态驱动的调用量最具粘性，字节的数据壁垒在加深
- 🔴 质疑：内部调用量不等于外部市场竞争力，B 端客户更看重模型能力而非流量

**信源：**https://www.stcn.com/article/detail/3723104.html

**关联行动：**关注 ArkClaw 在企业市场的渗透速度及豆包模型在视频生成方面的迭代。

---

### CN-8. [B] 腾讯混元 3.0 定档四月，推理与智能体能力迎来重大升级

**概述：**腾讯自研大模型混元 3.0 正在内部业务测试中，计划于 2026 年 4 月正式对外发布。据 3 月 19 日财报电话会议，腾讯 2025 年在 AI 产品上投入约 180 亿元，2026 年将"至少翻倍"。

**技术/产业意义：**混元 3.0 在推理能力、智能体赋能和多模态三个方向同时发力，官方称其为历代产品中"提升力度最大"的一次。3D 生成、文生图、世界建模等领域已处于行业领先。

**深度分析：**
- 腾讯 AI 研发投入从 180 亿翻倍至 360 亿+，追赶字节的决心明显
- 混元已在元宝和微信中部署，拥有最大的潜在用户触达面
- 智能体能力是本次升级重点，目标是"自主理解并代表用户行动"
- 4 月发布时间点与 DeepSeek V4 形成正面碰撞

**评论观察：**
- 🟢 支持：微信生态 + 巨额投入 + 强多模态基础，腾讯有后发优势
- 🔴 质疑：腾讯在大模型竞争中一直偏保守，混元能否真正改变市场认知？

**信源：**https://cn.chinadaily.com.cn/a/202603/19/WS69bba952a310942cc49a3f9f.html

**关联行动：**关注混元 3.0 正式发布日期及首批 benchmark 表现。

---

> 以下为 4 月 8 日第 1 轮中国区采集新增条目。

### CN-9. ⭐ 智谱 GLM-5.1 正式发布并开源，SWE-bench Pro 超越 Claude Opus 4.6，全球首个 8 小时持续工作开源模型

**概述：**4 月 8 日，智谱 AI 正式发布并开源旗舰模型 GLM-5.1。该模型在 SWE-bench Pro（最接近真实软件开发的基准）中刷新全球最佳成绩，超过 GPT-5.4 和 Claude Opus 4.6，取得全球模型第三、国产模型第一、开源模型第一的综合排名。GLM-5.1 是全球首个在真实工程任务中验证了 8 小时持续工作能力的开源模型。

**技术/产业意义：**这标志着中国开源模型首次在核心编程基准上超越 Anthropic 旗舰。更深层的意义在于，GLM-5.1 完全在华为昇腾芯片上完成训练，证明主权算力栈在前沿编码任务上已具备竞争力。智谱同步提价 10%，编码场景缓存命中 Token 价格首次追平 Claude Sonnet 4.6，打破国产模型只能低价竞争的叙事。

**深度分析：**
- SWE-bench Pro 具体得分：GLM-5.1 58.4 分，GPT-5.4 57.7 分，Claude Opus 4.6 57.3 分，差距虽小但意义重大
- 8 小时持续工作案例：从零构建 Linux 桌面系统，执行 1200+ 步，交付完整系统；向量数据库优化 655 次迭代，查询吞吐从 3108 QPS 提升至 21472 QPS（6.9 倍）
- CUDA 内核优化任务中实现 35.7 倍加速（初始仅 2.6 倍），量子位称其"14 小时后 CUDA 专家被冲了"
- KernelBench Level 3 取得 3.6 倍几何平均加速比，远超 PyTorch 基线 1.49 倍
- MIT 协议开源，已上架 GitHub、Hugging Face、ModelScope
- 港股开盘后智谱大涨近 18%，触及 925 港元

**评论观察：**
- 🟢 支持：华为芯片训练 + 开源 + SWE-bench Pro 第一，三者叠加具有里程碑意义
- 🔴 质疑：提价 10% 在当前价格战环境中逆势而行，能否获得市场认可仍待观察；8 小时长程任务的真实生产可靠性需要更多案例验证

**信源：**https://www.ithome.com/0/936/851.htm

**关联行动：**实测 GLM-5.1 在实际工程项目中的 8 小时持续工作表现，关注开源社区对模型权重的二次开发活跃度。

---

### CN-10. [B] DeepSeek SVG 生成能力实现质变，或重新定义下一代 PPT 智能体

**概述：**4 月 8 日，Linux.do 社区热议 DeepSeek 在 SVG（可缩放矢量图形）生成能力上的显著突破。DeepSeek 展现出高质量生成复杂 SVG 代码的能力，可直接创建无损缩放、高度定制化的矢量图表与素材，被视为构建下一代 PPT 智能体的关键拼图。

**技术/产业意义：**SVG 生成能力标志着 AI 办公工具从简单文本处理向高阶视觉构建的进化。与调用外部图片库不同，SVG 原生生成意味着 AI 可以端到端完成演示文稿的内容+视觉设计，大幅降低自动化生成高质量 PPT 的门槛。

**深度分析：**
- SVG 相比位图的核心优势：无损缩放、文件体积小、可编程可修改
- 与 DeepSeek V4 的多模态能力形成互补，V4 发布后 SVG + 多模态组合可能打开办公自动化新场景
- 社区实测显示生成的 SVG 已具备相当的视觉复杂度和美观度
- 这一能力的涌现可能是 V4 训练过程中的副产物

**评论观察：**
- 🟢 支持：SVG 生成是 AI 从"写字"到"画图"的关键跨越，办公自动化天花板被抬高
- 🔴 质疑：社区讨论热度高但缺乏系统 benchmark，实际生产可用性待验证

**信源：**https://www.80aj.com/2026/04/08/deepseek-svg-ppt-agent/

**关联行动：**关注 DeepSeek V4 正式发布后 SVG 生成能力是否被官方纳入产品功能。

---

### CN-11. [B] 寒武纪股价创历史新高，4434 亿市值领跑中国 AI 芯片 Top10

**概述：**4 月 7 日，寒武纪股价大幅上涨，成交额达 155 亿元，创历史新高。同日发布的"2026 中国 AI 芯片企业 Top10"榜单中，寒武纪以 4434 亿元市值领跑，摩尔线程位列第二。2025 年寒武纪实现营收近 65 亿元，毛利率 55.15%，上市以来首次实现年度盈利。

**技术/产业意义：**寒武纪的首次年度盈利是中国 AI 芯片产业化的标志性事件。在华为昇腾主攻大厂客户的格局下，寒武纪在云端推理和训练市场找到了差异化定位。

**深度分析：**
- 2025 年净利率 31.68%，研发投入 11.69 亿元（同比 +9.03%）
- 229 倍市盈率反映市场对 AI 芯片赛道的高预期
- 4 月 16 日将有 333.5 万股限售股解禁，4 月 30 日一季报公布
- 竞争加剧：华为、阿里、腾讯等巨头持续投入自研芯片

**评论观察：**
- 🟢 支持：首次盈利证明国产 AI 芯片商业模式成立，不再只是"烧钱讲故事"
- 🔴 质疑：229 倍市盈率容错率极低，限售股解禁和一季报是近期最大变量

**信源：**https://finance.sina.cn/stock/ssgs/2026-04-07/detail-inhtrytk2351996.d.html

**关联行动：**关注 4 月 16 日限售股解禁后的股价表现及 4 月 30 日一季报数据。

---

### CN-12. [B] 月之暗面三个月态度急转，Kimi 估值飙至 180 亿美元并启动港股 IPO 评估

**概述：**据 4 月 6 日报道，月之暗面在不到三个月内完成了从"不着急上市"到主动评估港股 IPO 的态度转变。公司已与中金公司、高盛集团进行初步接触，最新一轮 10 亿美元融资进行中，投后估值预期达 180 亿美元，较 2025 年底 C 轮的 40 亿美元翻了 4.5 倍。

**技术/产业意义：**Kimi K2.5 发布一个月内 ARR 即突破 1 亿美元，成为"AI 六小虎"中首个达此里程碑的企业。Stripe 数据显示 Kimi 2026 年 1 月订单量环比暴增 8280%，2 月再涨 123.8%，跻身 Stripe 全球榜单前十，成为首个闯入该榜单的中国 AGI 产品。这是中国 AI 公司在 C 端商业化上最强劲的验证信号。

**深度分析：**
- 估值路径：2025 年底 $40 亿 → 2026 年 2 月 $100 亿 → 近期融资进行中预期 $180 亿
- 对标：智谱 AI 和 MiniMax 已于 2026 年 1 月登陆港股，目前市值均稳定在约 400 亿美元
- 驱动力主要来自 K2.5 的 C 端付费转化，而非 B 端 API 收入
- 杨植麟此前明确"不着急上市"，态度急转说明 K2.5 的商业成功远超预期

**评论观察：**
- 🟢 支持：C 端付费爆发是最难跑通的商业化路径，Kimi 的 ARR 增速在全球 AI 公司中也属顶级
- 🔴 质疑：180 亿美元估值对应 1 亿美元 ARR 仍有 180 倍 PS，IPO 后能否支撑需要看持续增长

**信源：**https://finance.sina.com.cn/jjxw/2026-04-06/doc-inhtnpyp1565088.shtml

**关联行动：**关注月之暗面 IPO 正式启动时间及 K2.5 后续付费留存数据。

---

## 📌 结论

今天最重要的不是“又有哪个模型刷了多少分”，而是 AI 行业的竞争层次正在继续上移：

- Anthropic 证明 frontier model 已经足以改写网络安全节奏
- OpenAI 开始把媒体和行业叙事也纳入版图
- Google 继续把 AI 做成基础设施和公共系统工程
- Broadcom / Google / Anthropic 说明芯片与算力联盟正在重组
- Mistral 代表欧洲开始认真补上游底座
- 中国模型则在全球调用层打出越来越硬的真实使用数据

一句话总结，今天 AI 行业最该盯的已经不是“谁最会发模型”，而是谁能把安全、算力、分发和生态一起攥住。

---

## 参考链接

- Anthropic Project Glasswing: https://www.anthropic.com/glasswing
- Anthropic Mythos Preview 安全技术细节: https://red.anthropic.com/2026/mythos-preview/
- OpenAI 收购 TBPN: https://openai.com/index/openai-acquires-tbpn/
- Google AI Impact Summit 2026: https://blog.google/innovation-and-ai/technology/ai/ai-impact-summit-2026-india/
- Broadcom × Google × Anthropic: https://www.cnbc.com/2026/04/06/broadcom-agrees-to-expanded-chip-deals-with-google-anthropic.html
- Google Scion (InfoQ): https://www.infoq.com/news/2026/04/google-agent-testbed-scion/
- Gemma 4 Apple Silicon 多模态微调工具: https://github.com/mattmireles/gemma-tuner-multimodal
- Hacker News 首页参考: https://news.ycombinator.com/
- 快科技 OpenRouter 调用量报道: https://news.mydrivers.com/1/1113/1113949.htm

### 🇨🇳 中国区信源
- 阿里 Qwen 3.6-Plus 登顶 OpenRouter: https://finance.sina.com.cn/stock/t/2026-04-04/doc-inhticfz6330138.shtml
- 中国 AI 模型连续五周称霸 OpenRouter: https://finance.sina.com.cn/jjxw/2026-04-06/doc-inhtpmef6258452.shtml
- DeepSeek V4 优先支持华为昇腾: https://news.mydrivers.com/1/1113/1113767.htm
- 智元 AGIBOT AI Week: https://finance.sina.com.cn/tech/digi/2026-04-03/doc-inhteyic3773662.shtml
- DeepSeek 专家模式: https://www.80aj.com/2026/04/08/deepseek-expert-mode-upgrade/
- 小米 MiMo-V2-Pro OpenRouter 登顶: https://www.ithome.com/0/930/651.htm
- 字节跳动豆包 120 万亿 Token: https://www.stcn.com/article/detail/3723104.html
- 腾讯混元 3.0 定档四月: https://cn.chinadaily.com.cn/a/202603/19/WS69bba952a310942cc49a3f9f.html
- 智谱 GLM-5.1 正式发布+开源: https://www.ithome.com/0/936/851.htm
- 智谱 GLM-5.1 全球最强开源模型: https://www.21jingji.com/article/20260408/herald/8768bba79b0a0f812fa23fdce8532779.html
- DeepSeek SVG 生成能力突破: https://www.80aj.com/2026/04/08/deepseek-svg-ppt-agent/
- 寒武纪股价创历史新高: https://finance.sina.cn/stock/ssgs/2026-04-07/detail-inhtrytk2351996.d.html
- 月之暗面 IPO 态度转变: https://finance.sina.com.cn/jjxw/2026-04-06/doc-inhtnpyp1565088.shtml
- 量子位 GLM-5.1 深度报道: https://www.qbitai.com/2026/04/397898.html
