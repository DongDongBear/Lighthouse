---
title: "2026-04-08 AI 日报：Anthropic 发起 Glasswing，Google 和 OpenAI 都在补 AI 时代的基础设施"
description: "国际线聚焦 Glasswing、TBPN 收购、Google TorchTPU+印度基建；中国区 12 条；欧洲区 12 条；学术/硬件 16 条；北美区 12 条：Meta 半封闭转向 Avocado/Mango、Musk 强制银行买 Grok、NVIDIA-Groq $200 亿反垄断、Cerebras IPO $250 亿、Q1 全球风投 $3000 亿 AI 占 80%；KOL 7 条：Altman 温柔奇点遭纽约客百源调查、Karpathy LLM Wiki、Nadella 警告模型过剩。"
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

这说明 Google 的 AI 竞争思路正在更像”国家级数字基础设施承包商”，而不只是模型提供商。

> 以下为第 3 轮北美区采集补充的三大厂新动态。

### 4. OpenAI 推出安全研究奖学金 + 13 页”AI 新政”政策白皮书，四线并进布局叙事权

OpenAI 4 月 6 日宣布两项举措：推出 Safety Fellowship 面向学术界招募 AI 安全研究者；发布 13 页政策白皮书提出”AI 新政”——机器人税、公共财富基金、四天工作制不减薪。Sam Altman 同期发表”The Gentle Singularity”博客称”我们已越过事件视界”。

OpenAI 现在在模型（GPT-5.4）、产品（ChatGPT/Codex）、媒体（TBPN 收购）、政策（白皮书 + Safety Fellowship）四线同时推进，叙事控制力在三大厂中最为积极。这种系统性布局意味着 OpenAI 不再只争模型能力，而是在争定义 AI 时代社会契约的权力。

**信源：** https://techcrunch.com/2026/04/06/openais-vision-for-the-ai-economy-public-wealth-funds-robot-taxes-and-a-four-day-work-week/

### 5. Google 发布 TorchTPU，PyTorch 原生运行 TPU 正式进入工程化阶段

Google 开发者博客 4 月 7 日发布 TorchTPU，让 PyTorch 工作负载原生运行在 Google TPU 上。此前 PyTorch 用户迁移 TPU 需通过 JAX 或 XLA 桥接层，学习成本高且兼容性不稳。TorchTPU 与 Anthropic-Google-Broadcom 多 GW TPU 合作同步推出，Google 正从硬件（TPU 产能）和软件（TorchTPU）两端同时降低生态门槛。

对 NVIDIA 而言，CUDA 的软件护城河长期被视为其最强壁垒。TorchTPU 直接攻击这一壁垒——如果 PyTorch 用户可以零成本切换到 TPU，芯片竞争将真正回到性价比层面。

**信源：** https://developers.googleblog.com/en/torchtpu-running-pytorch-natively-on-tpus-at-google-scale/

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

## 🇪🇺 欧洲区

> 本轮为第 2 轮欧洲区补跑采集，覆盖 4 月 6 日至 8 日欧洲核心 AI 动态。

### EU-1. ⭐ EU AI Act 执行危机：仅 8/27 成员国就位，高风险条款截止日面临延期

**概述：**欧洲议会于 2026 年 3 月以 101:9 票通过 Digital Omnibus 提案，拟将 EU AI Act 高风险 AI 条款（生物识别、关键基础设施、教育、就业、执法）的执行截止日从 2026 年 8 月 2 日推迟至 2027 年 12 月 2 日。截至目前，27 个成员国中仅有 8 个指定了 AI Act 执行机构——这一本应在 2025 年 8 月完成的义务。CEN/CENELEC 技术协调标准同样错过 2025 年截止日，预计 2026 年底才能就位。

**技术/产业意义：**这不是例行进度更新，而是系统性执行危机。法规在技术上仍于 2026 年 8 月 2 日生效，但合规生态（国家执行机构、协调标准、委员会指南）远未到位。任何在欧盟高风险 AI 领域运营的企业面临双重不确定性。

**深度分析：**
- 议会、理事会与委员会之间的三方协商（Trilogue）已于 3 月底启动，预计 2026 年中之前无法达成一致
- 8/27 的就位率意味着超过 70% 的成员国在监管执行层面存在真空
- 理事会于 3 月 13 日达成自身立场，整体方向支持延期但细节仍有分歧
- 对中国出海企业而言，这一延期为合规准备赢得了额外窗口期

**评论观察：**
- 🟢 支持：延期给予企业更充裕的合规准备时间，避免"法规已生效但无人知道如何遵守"的尴尬
- 🔴 质疑：反复延期正在侵蚀 EU AI Act 的全球标杆地位，批评者认为这实质上是对科技企业游说的让步

**信源：**https://www.europarl.europa.eu/news/en/press-room/20260316IPR38219/meps-support-postponement-of-certain-rules-on-artificial-intelligence

**关联行动：**关注 Trilogue 进展及 2026 年 8 月 2 日原始截止日前的企业合规动态。

---

### EU-2. ⭐ Amnesty 联合 127 个民间组织警告：EU Digital Omnibus 是对数字权利的"隐蔽拆解"

**概述：**2026 年 4 月初，Amnesty International 发布详细报告，联合 127 个民间社会组织发出公开信，指 EU Digital Omnibus 以"简化"和"减少红色胶带"为名，实质弱化 GDPR 和 AI Act 核心保护。具体争议包括：重新定义个人数据范畴、允许企业以"不成比例的努力"为由拒绝从 AI 训练集中移除个人数据、为 AI 训练创设特别豁免。Corporate Europe Observatory 调查显示大科技公司逐条参与了法案修改。

**技术/产业意义：**GDPR 是 EU AI Act 赖以存在的法律基石——如果"简化"提案通过，整个欧洲 AI 治理框架的根基将发生改变。127 个签署机构的规模表明这不是例行公关，而是大规模社会动员。

**深度分析：**
- 核心争议：允许在"不成比例的努力"前提下免除 AI 训练数据的个人信息清除义务，但这一标准缺乏明确定义
- 大科技公司被指"逐条塑造"了这一法案——企业游说与法规简化之间的边界正在模糊
- 如果通过，将直接影响所有在欧洲训练或部署 AI 模型的企业的数据合规义务
- 对中国 AI 企业出海欧洲具有直接影响：数据保护标准可能从"最严"变为"灵活"

**评论观察：**
- 🟢 支持：某种程度的简化确有必要，过度严格的数据保护已被批评为阻碍欧洲 AI 创新
- 🔴 质疑：以"创新"之名弱化基本权利保护，可能使欧洲失去在数据保护领域的全球道德领导地位

**信源：**https://www.amnesty.org/en/latest/news/2026/04/eu-simplification-laws/

**关联行动：**关注 Digital Omnibus Trilogue 进展，特别是 GDPR 相关条款的最终措辞。

---

### EU-3. ⭐ Wayve 完成 $15 亿 D 轮融资，联手日产/Uber 推出东京自动驾驶出租车原型

**概述：**伦敦自动驾驶公司 Wayve 完成 $15 亿 Series D 融资（投资方包括微软、NVIDIA、Uber、奔驰、日产、Stellantis），公司估值达 $86 亿。在 NVIDIA GTC 2026 上，Wayve 与日产联合发布基于全电动 Nissan LEAF 的自动驾驶出租车原型，搭载 NVIDIA DRIVE Hyperion 平台，计划 2026 年底在东京启动 Uber 试运营。

**技术/产业意义：**Wayve 是唯一声称无需城市级微调即可在 500+ 城市零样本驾驶的自动驾驶公司，核心技术路线（端到端学习 + 基础世界模型）与 Waymo 的高精地图路线形成直接对比。$15 亿融资和多 OEM 投资者联盟标志着欧洲自动驾驶首次进入商业化部署阶段。

**深度分析：**
- $86 亿估值使 Wayve 成为欧洲最高估值的自动驾驶公司
- 微软与 NVIDIA 同时参投，意味着云端算力（Azure）+ 车端硬件（DRIVE）的完整技术栈支持
- 东京试运营选择日产而非欧洲品牌，反映出日本市场对自动驾驶的政策友好度
- 与 Waymo 的竞争不在于单城市能力，而在于泛化能力和部署成本

**评论观察：**
- 🟢 支持：零样本跨城市泛化若成立，将从根本上改变自动驾驶的商业模型——无需每座城市投入数年地图建设
- 🔴 质疑：端到端学习的长尾安全性仍是行业最大疑问，真实城市道路的 edge case 处理能力待验证

**信源：**https://wayve.ai/press/series-d/

**关联行动：**关注东京 Uber 试运营的启动时间及首批安全性能数据。

---

### EU-4. ⭐ LeCun 离开 Meta 创立 AMI Labs，$10.3 亿种子轮创欧洲纪录，公开宣战 LLM 路线

**概述：**Yann LeCun 离开 Meta 后创立 AMI Labs，于 2026 年 3 月完成 $10.3 亿种子轮——据报道是史上最大种子轮之一，也是欧洲公司最大种子轮。4 月 1 日在布朗大学演讲"AI sucks"，对满场听众说："我们有能操控语言的系统，它们因操控语言而让我们误以为它们是聪明的。"AMI Labs 聚焦"世界模型"：处理多模态感知数据以构建现实世界的内部表征，而非预测文本。

**技术/产业意义：**这是 AI 领域最具学术分量的路线之争的最新升级。LeCun 不只是口头反对 LLM——他现在有 $10 亿来证明替代路线可行。JEPA 架构（联合嵌入预测架构）是其核心技术押注，目标是让 AI 通过观察世界学习，而非通过阅读文本。

**深度分析：**
- LeCun 的核心论点：当前 LLM 没有世界模型，不理解因果关系，不能真正规划——只是在做复杂的模式匹配
- $10.3 亿种子轮的规模表明投资者正在对"后 LLM"路线进行重注押注
- AMI Labs 聚焦视频和传感器数据的预测性学习，与 LLM 的文本预测范式根本不同
- 布朗大学演讲的时间点恰逢 Gemma 4 发布周，形成鲜明的叙事对比

**评论观察：**
- 🟢 支持：如果世界模型路线成功，将解决 LLM 无法理解物理世界的根本缺陷，对具身智能意义深远
- 🔴 质疑：$10 亿投入一条未经验证的技术路线，风险极高；LeCun 的创业执行力是否匹配学术领袖的声望

**信源：**https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/

**关联行动：**关注 AMI Labs 首个技术成果发布，评估 JEPA 架构在实际任务上的表现。

---

### EU-5. [B] Anthropic 封锁 OpenClaw 订阅访问，Steinberger 公开指控"先抄袭后封杀"

**概述：**4 月 4 日，Anthropic 宣布 Claude Pro/Max 订阅用户不再能通过 OpenClaw 等第三方 harness 使用计划额度，改为按 API 计费（成本最高增加 50 倍）。OpenClaw 创始人 Peter Steinberger（已于 2 月加入 OpenAI）在 X 上公开批评："先把一些热门功能复制到自己的封闭 harness 里，然后锁死开源——时机多巧。"

**技术/产业意义：**这一冲突触及 AI 行业开放生态与封闭平台之间的根本张力。Steinberger 的"先抄后杀"指控如果成立，对 Anthropic 的声誉影响尤其在欧洲——EU 正在政策层面推动开源 AI，任何被视为打压开源的行为都可能引发监管关注。

**深度分析：**
- Steinberger 和 Dave Morin 透露曾尝试谈判，"最多争取到推迟一周"
- 用户面临的实际影响：从包含在订阅中到按 API 计费，编程场景成本大幅增加
- 这一事件正在塑造开发者对各大 AI 平台开放度的认知
- 与 EU 推动开源 AI 的政策方向形成直接关联

**评论观察：**
- 🟢 支持：平台有权保护其商业模式，防止第三方工具过度消耗订阅资源
- 🔴 质疑："先复制功能再封锁竞争者"的时序如果属实，构成经典的平台垄断行为

**信源：**https://techcrunch.com/2026/04/04/anthropic-says-claude-code-subscribers-will-need-to-pay-extra-for-openclaw-support/

**关联行动：**关注 OpenClaw 社区迁移动向及 Anthropic 后续政策调整。

---

### EU-6. [B] Helsing 联手 Loft Orbital，欧洲首个 AI 驱动卫星星座 2026 年发射

**概述：**德国国防 AI 公司 Helsing 与 Loft Orbital 宣布，正在生产欧洲首个 AI 驱动多传感器侦察卫星星座，已确保 2026 年发射窗口。卫星搭载板载 AI，可实时处理光学和射频传感器数据——包括边境监视、部队追踪、基础设施保护——无需地面后处理。

**技术/产业意义：**板载 AI 在低地球轨道实时推理并发出警报，是架构层面的重大飞跃。对欧洲国防自主而言，这减少了对美国情报基础设施的依赖。

**深度分析：**
- 核心突破在于低功耗环境下的实时多传感器融合推理
- Helsing 此前已获超 $4 亿融资，是欧洲国防 AI 赛道领跑者
- 与美国 Planet Labs 的商业卫星路线不同，Helsing 专注国防客户
- 卫星星座方案比单颗卫星更具冗余性和覆盖能力

**评论观察：**
- 🟢 支持：欧洲国防自主的具体落地，不再停留在政策口号
- 🔴 质疑：国防 AI 在欧洲面临更严格的伦理审查，自主武器争议可能影响推进

**信源：**https://helsing.ai/newsroom/helsing-partners-with-loft-orbital-to-deploy-europe-s-first-ai-powered-multi-sensor-satellite-constellation-for-governmental-defense-and-security-applications

**关联行动：**关注 2026 年发射任务时间窗口及首批卫星在轨性能数据。

---

### EU-7. [B] 英国 AI 三巨头集群成型：Synthesia $40 亿、ElevenLabs $110 亿、Luminance 齐攻欧洲

**概述：**4 月 7 日分析报告指出，三家伦敦 AI 公司正在形成欧洲上层 AI 集群：Synthesia 估值 $40 亿（ARR $1.5 亿，2026 目标 $2 亿）、ElevenLabs 2 月完成 $5 亿 D 轮后估值达 $110 亿、法律 AI 公司 Luminance 累计融资超 $1.15 亿。三者均将法国列为欧洲扩张首站，将 EU AI Act 合规复杂性视为销售催化剂。

**技术/产业意义：**英国 AI 生态正从散点式独角兽故事成熟为有协同效应的产业集群。Synthesia 触达 90%+ Fortune 100，Luminance 覆盖 70+ 国 1000+ 机构。三者均选择法国为首站，反映出对 EU AI Act 合规能力作为竞争护城河的押注。

**深度分析：**
- ElevenLabs $110 亿估值背后是 NVIDIA 的战略投资
- Synthesia 从视频生成切入企业培训/沟通，ARR 增速约 30%+
- 共同特征：在欧洲注册但面向全球市场，利用欧洲合规优势做差异化
- 与中国 AI 公司港股上市潮（智谱、MiniMax、月之暗面）形成东西对照

**评论观察：**
- 🟢 支持：欧洲终于有了自己的 AI 应用层标杆企业，而非只有模型层公司
- 🔴 质疑：$110 亿 ElevenLabs 和 $40 亿 Synthesia 的估值在当前市场能否支撑

**信源：**https://www.maddyness.com/uk/2026/04/07/elevenlabs-synthesia-luminance-these-british-scale-ups-on-the-rise-in-ai/

**关联行动：**关注 ElevenLabs 和 Synthesia 的 IPO 动态。

---

### EU-8. [B] DeepMind 发布 AI Agent 安全研究：系统性映射六类 Web 攻击向量

**概述：**Google DeepMind 研究团队近日发布研究成果，系统性识别了六类可通过恶意 Web 内容对自主 AI Agent 发起的攻击，包括 prompt 注入、上下文操纵和欺骗性工具触发。这是针对 Agent AI 系统的首个结构化威胁分类框架。

**技术/产业意义：**随着 Agent AI 部署加速，对抗性攻击面的理解严重滞后。DeepMind 的这一框架为红队测试和 AI 安全研究者提供了首个系统性参考。

**深度分析：**
- 与 Anthropic Mythos Preview 安全能力形成互补——一个从防守侧（攻击分类），一个从攻击侧（漏洞发现）
- 工具触发类攻击是全新类别，此前未被充分关注
- 研究对所有正在部署 Agent 产品的团队具有直接实操价值
- 暗示 Agent AI 可能需要专门的安全评估标准

**评论观察：**
- 🟢 支持：在行业追求 Agent 能力的狂热中，安全研究的跟进至关重要
- 🔴 质疑：分类框架的完备性待验证——攻击面可能比六类更广

**信源：**https://www.securityweek.com/google-deepmind-researchers-map-web-attacks-against-ai-agents/

**关联行动：**建议所有 Agent 开发团队将此框架纳入安全审计清单。

---

### EU-9. [B] 欧洲议会新增 AI Act 禁止条款：AI "裸体化"应用明确入禁

**概述：**3 月 26 日，欧洲议会在 Digital Omnibus 修正案中插入 AI Act 新禁止条款：明确禁止未经本人同意、利用 AI 生成或篡改为性暴露图像的系统（"nudifier"应用）。

**技术/产业意义：**即使在高风险条款执行时间整体后移的背景下，议会仍在积极扩展 AI Act 的禁止类别。这对图像生成模型提供方和平台运营方有直接影响。

**深度分析：**
- 直接回应近年 deepfake 色情泛滥的社会问题
- 技术执行层面挑战：如何界定"可识别的真实个人"、如何检测违规内容
- 对 Stable Diffusion 等开源模型的影响尤为复杂——模型方 vs 使用者的责任边界不明确

**评论观察：**
- 🟢 支持：保护个人免受非自愿性影像侵害是基本权利，立法填补了明确空白
- 🔴 质疑：开源模型的管控几乎不可能在生成端实现

**信源：**https://www.europarl.europa.eu/news/en/agenda/plenary-news/2026-03-25/2/artificial-intelligence-parliament-to-vote-on-nudification-ban

**关联行动：**关注该条款在 Trilogue 中的保留情况及技术标准的后续制定。

---

### EU-10. [B] EU InvestAI 2000 亿欧元计划进入基建部署，Horizon Europe 3 亿 AI 招标 4/15 截止

**概述：**EU InvestAI 计划正式进入部署阶段：500 亿欧元公共资金 + 1500 亿私人资本 = 2000 亿欧元五年投资。即时项目是 200 亿欧元 AI Gigafactories 基金，建设 4-5 个各配约 10 万颗 AI 芯片的计算设施。同期 Horizon Europe 发布 3.073 亿欧元 AI 专项招标（2.218 亿指向可信 AI 和战略自主），截止日 2026 年 4 月 15 日——距今仅一周。

**技术/产业意义：**这是欧洲对美国 CHIPS Act 级别基础设施政策的回应。2000 亿欧元总盘子和 AI Gigafactories 规划标志着欧洲 AI 算力自主从口号进入工程执行阶段。

**深度分析：**
- AI Gigafactories 每个设施约 10 万颗芯片，规模对标美国 hyperscaler 单体数据中心
- EURO-3C 项目（7500 万欧元）将建设欧洲首个大规模联邦电信-边缘-云基础设施
- 私人资本 1500 亿中的实际到位率是最大不确定性
- 在美国关税不确定性加剧的背景下，欧洲加速自主算力建设的紧迫感在上升

**评论观察：**
- 🟢 支持：2000 亿级别投资承诺让"欧洲 AI 主权"有了实质资金支撑
- 🔴 质疑：欧洲大型基础设施项目常超时超预算，执行效率是最大风险

**信源：**https://digital-strategy.ec.europa.eu/en/news/eu-invests-over-eu307-million-artificial-intelligence-and-related-technologies

**关联行动：**有意申请的团队注意 4 月 15 日 Horizon Europe AI 招标截止日。

---

### EU-11. [A] Mistral Forge 企业级自主训练平台发布，ARR 逼近 $10 亿，欧洲 AI 主权叙事落地

**概述：**Mistral AI 于 3 月 17 日 NVIDIA GTC 2026 上发布 Mistral Forge——允许企业在自有数据上从零训练定制 AI 模型的全栈平台，覆盖预训练、后训练和强化学习全生命周期，区别于竞品仅提供微调或 RAG 的路线。首批客户包括 ASML、Ericsson、欧洲航天局（ESA）、意大利咨询公司 Reply 和新加坡国防科技局。CEO Arthur Mensch 确认公司 ARR 正朝 $10 亿迈进。同期 Accenture 宣布与 Mistral 达成多年战略合作，共同推进欧洲企业"战略自主"AI 部署，数据全部留在欧盟境内服务器。

**技术/产业意义：**Mistral Forge 是欧洲 AI 公司首次在企业级全生命周期模型训练上与 OpenAI/Anthropic 正面竞争。与 Accenture（全球最大 IT 咨询公司）合作意味着 Mistral 获得了真正的全球分发网络，"主权 AI"不再只是政策口号而是有商业落地的产品。

**深度分析：**
- Forge 配备前置部署工程师团队（借鉴 Palantir/IBM 模式），直接嵌入客户团队——这是面向高价值企业的重运营模式
- ESA 和 ASML 作为首批客户说明 Forge 瞄准的是数据高度敏感的高端垂直领域
- Accenture 合作确保客户数据留在欧盟境内，满足 GDPR 和 AI Act 合规要求
- $10 亿 ARR 目标若达成，Mistral 将成为欧洲首个 $10 亿级 AI 模型公司
- 同期发布 Mistral Small 4 和 Voxtral TTS（零样本语音克隆），产品矩阵在快速扩展

**评论观察：**
- 🟢 支持：企业自主训练能力是真正的差异化——OpenAI 和 Anthropic 目前不提供从零训练的全栈服务
- 🔴 质疑：企业从零训练模型的实际需求规模存疑，且 Forge 面临 Databricks/Snowflake 等数据平台巨头的侧翼竞争

**信源：**https://techcrunch.com/2026/03/17/mistral-forge-nvidia-gtc-build-your-own-ai-enterprise/

**关联行动：**关注 Forge 首批客户的公开案例及 Mistral 2026 年 ARR 实际达成情况。

---

### EU-12. [B] Poolside AI 估值飙至 $120 亿，NVIDIA 拟投 $10 亿押注欧洲 AI 编程

**概述：**巴黎/旧金山双总部的 AI 编程公司 Poolside 正进行 $20 亿融资轮，NVIDIA 拟投入高达 $10 亿，估值从一年前的 $30 亿飙升至 $120 亿（4 倍跳涨）。公司由前 GitHub CTO Jason Warner 和 Eiso Kant 创立，专注构建全自主编程 Agent。但近期 CoreWeave 终止了与 Poolside 在德克萨斯 2GW AI 园区（Project Horizon，计划部署 4 万+ NVIDIA GPU）的合作，Poolside 需寻找新的算力基础设施合作方。

**技术/产业意义：**Poolside 是继 Mistral 之后欧洲第二家估值超 $100 亿的 AI 公司。NVIDIA 同时大额投资 Mistral 和 Poolside，说明其在欧洲的投资策略是"广撒网、深绑定"。CoreWeave 退出合作则暴露了高速扩张中的基础设施风险。

**深度分析：**
- 一年内估值 4 倍增长反映市场对 AI 编程 Agent 赛道的极端热情
- Poolside 的技术路线与 Cursor/Windsurf 等编辑器级工具不同，瞄准的是完全自主的代码生成
- CoreWeave 终止合作的原因未公开，但可能与 CoreWeave 自身资本优先级调整有关
- NVIDIA 投资逻辑：编程 Agent 是 GPU 推理需求最密集的应用场景之一
- 与 LeCun 的 AMI Labs（EU-4）同属欧洲 $100 亿级 AI 公司阵营，欧洲 AI 独角兽集群正在形成

**评论观察：**
- 🟢 支持：AI 编程市场预计 2027 年达 $400 亿，Poolside 的全栈自主方案定位精准
- 🔴 质疑：$120 亿估值对应的收入基础极其薄弱，且失去 CoreWeave 算力合作是实质性风险

**信源：**https://techfundingnews.com/nvidia-prepares-up-to-1b-investment-as-poolsides-valuation-jumps-to-12b/

**关联行动：**关注 Poolside 新算力合作伙伴选择及 $20 亿融资轮的最终完成情况。

---

## 🌐 学术/硬件

> 本轮覆盖全球学术论文、AI 硬件及基础设施动态。

### AH-1. ⭐ NVIDIA Rubin 平台全面投产，$1 万亿订单簿锁定 2027 算力话语权

**概述：**NVIDIA 在 GTC 2026 发布的 Vera Rubin 平台已全面投产，合作伙伴产品将于 2026 下半年上市。Rubin 实现推理 token 成本降低 10 倍、MoE 模型训练所需 GPU 减少 4 倍（对比 Blackwell）。CEO 黄仁勋透露 Blackwell + Rubin 合计采购订单已达 $1 万亿（截至 2027 年）。AWS、Google Cloud、Microsoft、OCI、CoreWeave、Lambda 为首批云部署方。

**技术/产业意义：**$1 万亿订单簿是 AI 算力军备竞赛最直白的量化指标。Rubin 的 10 倍推理成本下降对 Agent AI 大规模部署至关重要——当前 Agent 因多轮推理导致成本过高是制约规模化的关键瓶颈。

**深度分析：**
- Rubin 架构针对 MoE 模型优化，直接受益者包括 Mistral Mixtral、DeepSeek MoE 系列
- NVIDIA 同期进行超过 $200 亿收购（含 Groq）及对 Marvell 的 $20 亿投资
- 首波云部署方包含 CoreWeave 和 Lambda，说明 NVIDIA 在培育 hyperscaler 之外的替代算力渠道
- 对比华为昇腾 950PR：NVIDIA 的竞争力在于全栈生态（CUDA + NVLink + 云伙伴网络）

**评论观察：**
- 🟢 支持：$1 万亿订单消除了"AI 算力需求是否可持续"的短期疑虑
- 🔴 质疑：如此巨额资本锁定是否意味着行业押注了一个过度乐观的增长曲线

**信源：**https://nvidianews.nvidia.com/news/rubin-platform-ai-supercomputer

**关联行动：**关注 2026 H2 首批 Rubin 系统上线后的实际性能数据及定价。

---

### AH-2. ⭐ AMD MI400 系列发布：432GB HBM4、40 PFLOPS、72-GPU 机架级加速

**概述：**AMD 确认 Instinct MI400 AI 加速器 2026 年推出，搭载 432GB HBM4（带宽 19.6 TB/s），XCD 核心数翻倍，FP4 AI 算力达 40 PFLOPS。同时发布全栈平台 Helios，将最多 72 颗 GPU 连接为单一机架级加速器——官方宣称代际性能提升 10 倍。

**技术/产业意义：**MI400 是 AMD 迄今最有力的 NVIDIA 挑战——Helios 机架级方案直接对标 NVIDIA NVL72，首次在基础设施层面展开竞争。HBM4 的率先采用意味着内存带宽不再是差异化因素。

**深度分析：**
- 40 PFLOPS FP4 性能数字极为激进，实际工作负载表现待验证
- 432GB HBM4 对标 NVIDIA B200 的 192GB HBM3e，显存容量优势显著
- Helios 72-GPU 方案的关键在于互连带宽和软件编排——这正是 NVIDIA 传统壁垒
- ROCm 7.2.2 已统一 Windows/Linux，但与 CUDA 的生态差距仍然显著

**评论观察：**
- 🟢 支持：硬件规格超越迫使 NVIDIA 加速迭代，竞争利好整个行业
- 🔴 质疑：AMD 软件生态（ROCm）仍是最大短板——硬件领先但软件追赶的剧本已重演多次

**信源：**https://www.tweaktown.com/news/105758/amds-next-gen-instinct-mi400-gpu-confirmed-rocks-432gb-of-hbm4-at-19-6tb-sec-ready-for-2026/index.html

**关联行动：**关注 MI400 首批客户交付时间及 ROCm 对主流 AI 框架的适配进展。

---

### AH-3. ⭐ TSMC 2nm 量产良率达 70%，2026 年产能扩至 10 万片/月，全年已被预订

**概述：**TSMC 2nm（N2）工艺于 2025 Q4 进入大规模量产，良率超预期达约 70%（增强版 N2P 目标 80%）。2026 年产能从 4 万片/月扩至 10 万片/月，2027 年达 20 万片/月。苹果占据超过一半产能，NVIDIA、AMD、高通、联发科在内的 15 家客户已锁定全部 2026 年产能。

**技术/产业意义：**N2 是将驱动下一波 AI 芯片的核心制程节点。TSMC 提前达成良率目标，锁定其对三星和 Intel 的制造领先优势至少 2-3 年。全年产能被预订一空意味着后来者无法在 2026 年获得该节点代工产能。

**深度分析：**
- N2 采用 GAA（Gate-All-Around）晶体管架构，是 TSMC 首个 GAA 节点
- 同等功耗下性能提升约 15%，或同等性能下功耗降低约 30%
- N2P 增强版 2026 H2 开始量产，进一步优化性能
- 对 AI 芯片直接影响：NVIDIA Rubin 和 AMD MI400 后续版本预计采用 N2 节点
- 地缘政治维度：TSMC 亚利桑那投资扩大至 $1650 亿（最多 12 座工厂），但先进节点产能仍集中在台湾

**评论观察：**
- 🟢 支持：70% 良率提前达标是 TSMC 技术执行力的再次证明
- 🔴 质疑：产能集中在台湾的地缘风险依然是全球半导体供应链的最大单点故障

**信源：**https://www.tomshardware.com/tech-industry/semiconductors/tsmc-begins-quietly-volume-production-of-2nm-class-chips-first-gaa-transistor-for-tsmc-claims-up-to-15-percent-improvement-at-iso-power

**关联行动：**关注 4 月 16 日 TSMC Q1 财报及亚利桑那工厂建设进度。

---

### AH-4. ⭐ MegaTrain：单卡 H200 训练 1200 亿参数全精度大模型，训练民主化新突破

**概述：**研究团队提出 MegaTrain，以内存为中心的训练系统：将参数和优化器状态存储在主机 CPU 内存中，GPU 作为瞬态计算引擎。通过逐层参数流式传输和双缓冲流水线执行，在单张 H200 GPU（配 1.5TB 主机内存）上实现 1200 亿参数全精度训练，吞吐量比 DeepSpeed ZeRO-3 高 1.84 倍。

**技术/产业意义：**直接挑战"大模型训练必须依赖分布式 GPU 集群"的基本假设。全精度（无量化损失）在曾需数据中心级基础设施的规模上成为可能，对资源有限的研究实验室和创业公司意义重大。

**深度分析：**
- 核心创新：将 GPU 视为"计算过客"而非"存储主人"——颠倒传统 GPU 训练的内存层级假设
- 利用 CUDA streams 实现参数传输与计算的全流水线重叠
- 1200 亿参数单卡训练意味着训练成本可能从数百万美元降至数万美元
- 训练速度仍显著慢于多卡并行——适用于预算受限研究而非生产级训练

**评论观察：**
- 🟢 支持：训练民主化的实质进展，单卡训练千亿模型是里程碑式能力跳跃
- 🔴 质疑：通信瓶颈导致的速度限制使其更适合实验而非工业级训练

**信源：**https://arxiv.org/abs/2604.05091

**关联行动：**关注 MegaTrain 开源实现及社区复现情况。

---

### AH-5. ⭐ Video-MME-v2：新一代视频理解基准揭示前沿模型"读题而非看视频"的缺陷

**概述：**由 18 位作者、12 名标注者、50 名审阅者、3300+ 小时标注工作量打造的 Video-MME-v2 基准正式发布。采用三层复杂度层级（视觉聚合 → 时序建模 → 多模态推理），引入分组非线性评估——通过跨关联问题一致性检验惩罚猜测。关键发现：当前最佳模型的推理性能严重依赖文本线索，而非真正理解视频内容。HuggingFace Papers 181 upvotes，本周最高。

**技术/产业意义：**现有视频理解基准正在饱和。Video-MME-v2 建立了下一代评估标准。"推理性能依赖文本线索"暴露了当前视频-语言模型的根本弱点：它们在"读题"而非"看视频"。

**深度分析：**
- 三层评估设计有效区分了表面模式匹配和真实视频理解
- 分组一致性评估解决了多选题基准中随机猜测虚增分数的老问题
- 对 GPT-5、Gemini、Claude 等多模态模型的视频理解能力提出实质挑战
- 3300+ 小时人工标注成本极高，基准的可持续更新是开放问题

**评论观察：**
- 🟢 支持：视频理解领域亟需更严格的评估标准，这项工作填补了重要空白
- 🔴 质疑：高标注成本可能限制基准的迭代速度

**信源：**https://arxiv.org/abs/2604.05015

**关联行动：**关注各大多模态模型在 Video-MME-v2 上的表现对比。

---

### AH-6. [A] CoreWeave 获 $85 亿贷款，AI 算力云赛道进入重资产军备竞赛

**概述：**CoreWeave 于 3 月底/4 月初获得 $85 亿债务融资，用于持续扩张 AI 基础设施。CoreWeave 目前占专用 AI GPU 云市场约 18% 份额，将成为 2026 H2 首批部署 NVIDIA Rubin 系统的云服务商。2 月推出"CoreWeave ARENA"——面向企业的 AI 工作负载压力测试实验室。

**技术/产业意义：**$85 亿债务融资规模凸显 AI 云赛道已进入重资产竞争阶段。CoreWeave 是 hyperscaler 之外最清晰的纯 AI 算力替代选择。

**深度分析：**
- 选择债务而非股权融资，保护了现有股东利益
- ARENA 产品定位精准：让企业在承诺大规模采购前测试工作负载
- 与 Lambda 的 IPO 准备形成竞争态势——2026 年可能出现两家纯 AI 云上市公司
- $85 亿融资 + NVIDIA Rubin 首批部署权 = 强化与 NVIDIA 的战略绑定

**评论观察：**
- 🟢 支持：AI 算力供不应求的格局下，CoreWeave 的先发优势正在转化为规模壁垒
- 🔴 质疑：高杠杆扩张在利率不确定环境下存在财务风险

**信源：**https://americanbazaaronline.com/2026/03/31/coreweave-secures-8-5-billion-loan-for-ai-infrastructure-expansion-477975/

**关联行动：**关注 CoreWeave 季度财报及 Rubin 部署后的客户获取数据。

---

### AH-7. [A] NVIDIA 投资的 Firmus 融 $5.05 亿估值 $55 亿，亚太 AI 算力版图扩展

**概述：**澳大利亚数据中心建设商 Firmus 获 Coatue 领投 $5.05 亿融资（NVIDIA 战略参投），六个月内累计融资 $13.5 亿，估值 $55 亿。Firmus 正建设"Project Southgate"——横跨澳大利亚和塔斯马尼亚的节能 AI 工厂网络，搭载 NVIDIA Vera Rubin 基础设施。目标 2026 年 6-7 月 ASX 上市 $20 亿（将成澳大利亚最大科技 IPO）。

**技术/产业意义：**AI 算力基建正从美国/欧洲向亚太大规模扩展。NVIDIA 直接战略投资意味着 Firmus 是其亚太"指定合作伙伴"——通过投资绑定基础设施部署方的模式正在全球复制。

**深度分析：**
- Blackstone 提供 $100 亿债务融资，传统金融巨头全面押注 AI 基建
- 塔斯马尼亚选址利用当地丰富水电，回应 AI 数据中心能耗争议
- ASX IPO 若成功将为亚太 AI 基建提供首个公开市场估值锚点

**评论观察：**
- 🟢 支持：亚太 AI 算力缺口明显，Firmus 占据时间窗口优势
- 🔴 质疑：$55 亿估值对应的收入基础不清楚，IPO 定价可能面临压力

**信源：**https://techcrunch.com/2026/04/07/firmus-the-southgate-ai-datacenter-builder-backed-by-nvidia-hits-5-5b-valuation/

**关联行动：**关注 Firmus ASX IPO 进展及 Rubin 基础设施上线时间。

---

### AH-8. [B] ByteDance-Seed 发布 In-Place TTT：推理时动态调整 LLM 权重的实用化方案

**概述：**字节跳动 Seed 团队提出 In-Place Test-Time Training，在推理过程中动态调整 LLM 权重。将 MLP 投影矩阵作为可适应参数，对齐下一 token 预测目标，实现分块更新并兼容上下文并行。128K token 长上下文任务上表现强劲。

**技术/产业意义：**TTT 长期停留在理论阶段——一个实用的、架构兼容的、可部署的版本来自字节跳动，标志着该技术从研究走向生产。

**深度分析：**
- 核心：不需完整重训就能让模型在推理时"学习"当前任务特性
- 分块更新设计兼容现有 context parallelism 框架，工程落地门槛低
- 对长上下文场景特别有价值：模型可在处理长文档时逐步调整理解
- 推理时更新权重带来的计算开销和一致性保证需更多验证

**评论观察：**
- 🟢 支持：TTT 的生产化是提升 LLM 实际使用体验的关键方向
- 🔴 质疑：推理时修改权重的稳定性和可预测性待更多场景验证

**信源：**https://arxiv.org/abs/2604.06169

**关联行动：**关注 TTT 在字节跳动产品中的实际集成情况。

---

### AH-9. [B] Claw-Eval：多通道 Agent 评估框架揭示 44% 安全违规被现有基准漏检

**概述：**13 位作者提出 Claw-Eval，300 个人工验证 Agent 任务、9 个类别、2159 个细粒度评分项。通过执行轨迹、审计日志、环境快照三通道证据采集测试 14 个前沿模型。关键发现：仅基于最终输出的评估会漏掉 44% 安全违规和 13% 鲁棒性故障。HuggingFace Papers 75 upvotes（本周第二高）。

**技术/产业意义：**几乎所有现有 Agent 基准都在系统性低估安全风险——Claw-Eval 首次用数据证明了这一点。

**深度分析：**
- 44% 安全违规漏检率直接质疑当前 Agent 安全评估的有效性
- 多通道证据采集方法论本身就是贡献——为行业提供了更严格的评估范式
- 与 DeepMind 的 Agent 攻击分类研究和 UCSC 的 OpenClaw 安全审计形成三重交叉验证

**评论观察：**
- 🟢 支持：Agent 安全评估领域急需的严格性提升
- 🔴 质疑：300 个任务覆盖范围是否足以代表真实世界 Agent 使用场景的多样性

**信源：**https://arxiv.org/abs/2604.06132

**关联行动：**建议 Agent 产品团队将 Claw-Eval 纳入发布前安全测试流程。

---

### AH-10. [B] Import AI #452：AI 网络攻击能力倍增周期从 9.8 个月缩短至 5.7 个月

**概述：**Jack Clark 最新一期 Import AI 引用 Lyptus Research 发现：AI 网络攻击能力的倍增周期已从 2019 年的 9.8 个月缩短至 5.7 个月。前沿模型可独立完成需 3 小时以上的专家级网络攻击任务。同期 MIT 研究显示基于文本的劳动成功率将在 2029 年达 80-95%。

**技术/产业意义：**5.7 个月的倍增周期是近月来最令人警惕的 AI 风险信号。攻击能力增长速度远超防御能力建设速度——结合 Anthropic Mythos Preview 的漏洞发现能力，网络安全格局正被根本性重塑。

**深度分析：**
- 倍增周期加速与模型能力增长、Agent 自主性提升直接相关
- 3 小时以上专家级任务的自主完成意味着 AI 已超越"辅助工具"阶段
- 与本日报第 5 条（Mythos Preview 安全能力）形成交叉验证
- Jack Clark（Anthropic 联创）的视角兼具学术严谨性和行业内部视角

**评论观察：**
- 🟢 支持：为行业敲响安全警钟的高质量分析
- 🔴 质疑：倍增周期数据的计算方法论需要独立验证

**信源：**https://jack-clark.net/2026/04/06/import-ai-452-scaling-laws-for-cyberwar-rising-tides-of-ai-automation-and-a-puzzle-over-gdp-forecasting/

**关联行动：**建议安全团队将 AI 攻击能力增长纳入威胁建模的周期性更新。

---

### AH-11. [B] Sebastian Raschka 深度拆解 Coding Agent 架构六大核心组件

**概述：**4 月 4 日，Sebastian Raschka 发布长文拆解编程 Agent harness 工作原理，覆盖六大组件：实时仓库上下文采集、prompt 缓存（稳定/动态分离）、结构化工具调度、上下文缩减、双层记忆（完整记录 + 蒸馏工作记忆）、有限子 Agent 并行化。核心论点："harness 往往是让一个 LLM 比另一个表现更好的关键区别因素。"

**技术/产业意义：**罕见的一线实践者 Agent 系统工程深度剖析。解释了为什么 Claude Code、Codex 等工具能显著超越裸模型——关键不在模型本身，而在围绕模型构建的工程系统。

**深度分析：**
- 双层记忆设计直接解决长对话中上下文窗口耗尽问题
- "harness 比模型更重要"的观点与社区"模型决定一切"叙事形成反差
- 对正在构建或评估编程 Agent 的团队具有直接实操价值

**评论观察：**
- 🟢 支持：技术含量极高，是理解当前 Agent 系统设计哲学的必读文献
- 🔴 质疑：分析基于公开信息和逆向工程，商业 Agent 的实际实现可能不同

**信源：**https://magazine.sebastianraschka.com/p/components-of-a-coding-agent

**关联行动：**推荐所有 Agent 开发团队阅读原文。

---

### AH-12. [B] Action Images：用多视角视频生成统一机器人策略学习，零样本超越 RLBench

**概述：**研究团队将机器人策略学习重新形式化为统一多视角视频生成任务。将 7-DoF 机械臂运动转化为"动作图像"——像素级多视角动作视频——使视频骨干网络本身即可作为零样本策略。在 RLBench 和真实世界任务上零样本超越专门策略模型。

**技术/产业意义：**消除了世界模型和策略模型之间的架构边界。零样本表现超越专门模型，表明这种统一化是具身 AI 有前景的架构方向。

**深度分析：**
- 核心创新：将"动作"编码为图像格式，复用强大的视频生成模型
- 零样本能力意味着无需针对每个新任务重新训练
- 对工业机器人潜力巨大：新任务部署从"重新训练"变为"生成视频"

**评论观察：**
- 🟢 支持：架构简化且性能提升，"少即是多"在具身 AI 中的体现
- 🔴 质疑：真实世界复杂性（遮挡、光照变化、柔性物体）可能挑战视频生成质量

**信源：**https://arxiv.org/abs/2604.06168

**关联行动：**关注代码开源后的社区复现及工业场景适配。

---

### AH-13. [B] AI 数据中心能源危机：瓶颈从芯片转向电力

**概述：**CNBC 4 月 6 日报道 AI 数据中心融资压力传导至保险市场。数据中心占新增大型电网接入申请 70% 以上。全球最大 AI 数据中心在美国 DoE Portsmouth 站点宣布。Big Tech 2026 年资本开支：Amazon $2000 亿、Google $1750-1850 亿、Meta 承诺至 2028 年合计 $6000 亿。

**技术/产业意义：**能源约束正取代芯片供应成为 AI 规模化首要瓶颈。当 AI 数据中心占据 70%+ 新增电力需求时，这已是能源政策问题而非纯技术问题。

**深度分析：**
- Big Tech 2026 年合计资本开支接近 $5000 亿，AI 相关占比持续攀升
- 核能、地热等清洁能源方案正被认真考虑——微软已签署核能 PPA
- Bloomberg 发现美国 AI 数据中心仍依赖中国电气设备进口，形成新地缘风险
- 能源成本将传导至 AI 推理定价，影响模型厂商商业模式

**评论观察：**
- 🟢 支持：AI 可能意外成为碳中和的催化剂——推动清洁能源创新
- 🔴 质疑：$5000 亿年度资本开支可持续性令人担忧

**信源：**https://www.cnbc.com/2026/04/06/ai-data-centers-financing-insurance-deals-gpu-debt.html

**关联行动：**关注 AI 数据中心对电力市场的系统性影响。

---

### AH-14. [B] UCSC 对 OpenClaw 首次真实世界安全审计：单维度投毒攻击成功率从 25% 飙至 74%

**概述：**UCSC VLAA 团队发布首个针对广泛部署的个人 AI Agent（OpenClaw，拥有 Gmail 和 Stripe 访问权限）的真实世界安全评估。提出 CIK 分类法（Capability/Identity/Knowledge）分类 Agent 持久状态。12 种攻击场景、4 个 LLM 上测试：投毒任意单个 CIK 维度即可将攻击成功率从基线 24.6% 提升至 64-74%。

**技术/产业意义：**量化证明真实部署 Agent 的脆弱程度——且仅靠架构缓解措施不够。对任何正在发布 Agent 产品的团队，这意味着需从根本重新思考 Agent 状态的安全管理。

**深度分析：**
- 24.6% → 64-74% 的跳跃仅需投毒单个维度——攻击成本极低
- 与 Claw-Eval（AH-9）和 DeepMind Agent 攻击研究（EU-8）形成 Agent 安全研究三重交叉验证
- Gmail + Stripe 的真实世界访问权限使研究结果具有直接安全告警意义

**评论观察：**
- 🟢 支持：真实世界安全评估对行业负责任部署至关重要
- 🔴 质疑：研究对象选择了 OpenClaw——更封闭的系统安全性可能不同

**信源：**https://arxiv.org/abs/2604.04759

**关联行动：**建议所有 Agent 开发方参考 CIK 框架审查产品的持久状态安全性。

---

### AH-15. [B] DARE：首个统一扩散语言模型后训练框架，终结 dLLM 研究碎片化

**概述：**上海交大/商汤团队发布 DARE（dLLMs Alignment and Reinforcement Executor），首个统一的扩散大语言模型（dLLM）开源后训练框架。集成 SFT、PEFT、偏好优化和多种 dLLM 特有的 RL 算法，同时支持 Masked Diffusion LM（MDLM）和 Block Diffusion LM（BDLM）两大技术路线，覆盖 LLaDA、Dream、SDAR、LLaDA-MoE、LLaDA2.x 等全部主流模型族。基于 verl（训练）和 OpenCompass（评估）构建。HuggingFace Papers 167 upvotes。

**技术/产业意义：**扩散语言模型正在成为自回归 LLM 的有力替代方案——通过迭代去噪而非逐 token 生成来工作，允许并行解码。但此前各模型家族的后训练代码各自为政，复现和公平比较极为困难。DARE 是首个将 SFT→RLHF→评估全流程统一的框架，对加速 dLLM 范式成熟至关重要。

**深度分析：**
- 解决了 dLLM 领域"每篇论文一套代码"的碎片化问题——此前 LLaDA、Dream 等各有独立训练代码，无法公平比较
- 框架作用类似 HuggingFace Transformers 之于自回归 LLM：标准化基础设施加速整个范式的研究迭代
- 167 HF upvotes 的社区热度表明 dLLM 赛道正从边缘实验走向主流关注
- 如果 dLLM 在推理速度上展现决定性优势（并行解码 vs 逐 token），该框架将成为关键基础设施

**评论观察：**
- 🟢 支持：标准化框架对新范式成熟不可或缺，DARE 填补了 dLLM 生态的关键空白
- 🔴 质疑：dLLM 在实际任务上仍未展现对自回归模型的决定性优势，框架价值取决于范式本身的前景

**信源：**https://arxiv.org/abs/2604.04215

**关联行动：**关注 DARE 框架下各 dLLM 模型族的标准化 benchmark 对比结果。

---

### AH-16. [B] Intel Gaudi 战略转向企业推理，Jaguar Shores 瞄准 HBM4E 但要等到 2027

**概述：**Intel AI 加速器 Gaudi 3 在数据中心 GPU 市场份额仍低于 10%，但 2024 年末战略转向"企业 AI 推理"后开始获得牵引力——IBM、Dell 在 2025 年中开始集成 Gaudi 3 部署开源模型（Llama 3 等），Inflection AI 也转用 Gaudi 3。CES 2026 上 Intel 展示了 Panther Lake 消费 AI 芯片和 Gaudi 3 企业推理方案。下一代"Jaguar Shores"将跳过 HBM4 直接采用 HBM4E，成为 Intel 首款对标 NVIDIA 高端训练平台的芯片，但预计 2027 年才上市。

**技术/产业意义：**Intel 在 AI 加速器市场的困境是"硬件尚可但软件生态（对标 CUDA）缺失"的典型案例。选择放弃与 NVIDIA 正面竞争训练市场、转而主攻成本敏感的企业推理场景，是务实但空间有限的策略。Jaguar Shores + HBM4E 是其重返训练市场的长期押注。

**深度分析：**
- Gaudi 3 定价策略：以比 NVIDIA H100 低 30-40% 的价格吸引推理工作负载
- IBM 和 Inflection AI 转用 Gaudi 3 是迄今最重要的客户案例，验证了推理定位的可行性
- Jaguar Shores 选择 HBM4E 而非 HBM4 暗示 Intel"等待更成熟版本"的保守策略
- 在 AMD MI400（HBM4, 2026）和 NVIDIA Rubin 夹击下，2027 年上市的 Jaguar Shores 将面临激烈竞争
- Intel Foundry 代工业务的走向对 Gaudi 长期成本结构有决定性影响

**评论观察：**
- 🟢 支持：企业推理市场需要更多竞争者压低价格，Gaudi 3 的性价比对中小企业有吸引力
- 🔴 质疑：<10% 市场份额 + 2027 年才有竞争力产品 = Intel 在 AI 加速器市场的窗口正在快速关闭

**信源：**https://aihardwareindex.com/blog/intel-ces-2026-panther-lake-gaudi-3-and-the-crushing-amd-nar

**关联行动：**关注 Jaguar Shores 正式发布时间及 Intel Foundry 运营进展。

---

## 🇺🇸 北美区

> 本轮为第 3 轮北美区采集，覆盖三大厂以外的北美公司动态、投融资、政策及产业趋势。

### NA-1. ⭐ Meta 超级智能部门转向”半封闭”策略，Avocado/Mango 双模型不再默认开源

**概述：** Axios 4 月 6 日独家报道，Meta 超级智能部门（Alexandr Wang 领导）正在开发 LLM “Avocado” 和多模态生成器 “Mango”。与 LLaMA 系列不同，Meta 将保留最强版本为闭源，开源版本”最终”才会发布——这是 Meta 自 2023 年以来 AI 开源策略的根本性转变。

**技术/产业意义：** 直接导火索是 LLaMA 4 表现令人失望且 DeepSeek 利用开放权重快速追平。Meta 面临两难：继续开源培养竞争对手，放弃开源失去开发者信任。与中国阿里（Qwen 持续开源+免费）形成鲜明对比。

**评论观察：**
- 🟢 支持：商业现实要求保护最强模型
- 🔴 质疑：放弃开源身份的 Meta 将失去 AI 领域最大差异化优势

**信源：** https://www.axios.com/2026/04/06/meta-open-source-ai-models

**关联行动：** 关注 Avocado/Mango 发布时间及开源社区反应。

---

### NA-2. ⭐ Musk 要求 SpaceX IPO 承销银行购买 Grok 企业订阅，华尔街集体就范

**概述：** 据 PYMNTS 等报道，Musk 要求参与 SpaceX 万亿美元级 IPO（预计募资 $500 亿+）的所有承销银行以企业费率订阅 Grok。摩根士丹利、高盛、摩根大通、美银、花旗已同意，每年花费数千万美元。同时 Musk 在法庭提交动议要求罢免 Altman 的 OpenAI 董事和高管职位，4 月 27 日陪审团遴选开始。

**技术/产业意义：** AI 历史上最具争议的分发策略——利用 IPO 杠杆强制将 AI 产品塞进金融机构 IT 架构。银行就范是因为 SpaceX IPO 佣金远超 Grok 订阅成本。Intel 同期加入 Terafab（Tesla/SpaceX/xAI 共建芯片制造），Musk 的 AI 基础设施野心正在成型。

**评论观察：**
- 🟢 支持：非常规策略跳过 AI 企业销售的传统漫长周期
- 🔴 质疑：捆绑销售的合规风险；被迫购买不等于真实使用

**信源：** https://www.pymnts.com/news/ipo/2026/musk-wants-spacex-ipo-banks-to-become-grok-subscriptions/

**关联行动：** 关注 SpaceX IPO 进展及银行 Grok 部署的真实使用情况。

---

### NA-3. ⭐ NVIDIA-Groq $200 亿”反向收购”遭参议员质疑，AI 并购结构面临重新定义

**概述：** 参议员 Warren 和 Blumenthal 致信 Jensen Huang，质疑 NVIDIA 以”反向 acquihire”（许可 LPU 技术 + 雇佣核心员工）形式进行的 $200 亿 Groq 交易是否试图规避反垄断合并前审查。4 月 3 日回复截止日已过。三位参议员还呼吁对 Meta、Google、NVIDIA 的反向 acquihire 行为进行广泛调查。

**技术/产业意义：** “反向 acquihire”正成为大科技公司的首选 AI 并购工具——本质上是收购但结构上不触发合并前审查。国会关注意味着这扇窗口可能正在关闭。如果成功施压，未来所有大型 AI “人才收购”都可能面临更严格审查。

**评论观察：**
- 🟢 支持：反垄断审查保护创新，防止大公司通过收购消灭竞争对手
- 🔴 质疑：过度监管可能减缓 AI 行业整合的自然进程

**信源：** https://www.warren.senate.gov/newsroom/press-releases/warren-blumenthal-question-whether-nvidias-20-billion-groq-deal-is-attempt-to-avoid-antitrust-laws

**关联行动：** 关注 NVIDIA 正式回复及 FTC 后续动作。

---

### NA-4. ⭐ Cerebras 锁定 Q2 IPO 目标 $220-250 亿估值，OpenAI $100 亿合同在手

**概述：** 晶圆级 AI 芯片公司 Cerebras 正在筹备 Q2 纳斯达克 IPO，目标估值 $220-250 亿，拟募资 $20 亿。2 月以 $230 亿估值完成 $10 亿融资。核心资产是与 OpenAI 的 $100 亿多年期算力合同（750MW，至 2028 年）——非 NVIDIA 体系最大的 AI 基础设施合同。路演预计 4 月启动。

**技术/产业意义：** 首家以 AI 芯片为主业的大型上市公司（非 NVIDIA）。晶圆级芯片路线与 NVIDIA 多芯片互连路线截然不同，IPO 将为替代技术路线提供公开市场价值验证。早期投资者 Eclipse 同期融 $13 亿投 AI 基础设施。

**评论观察：**
- 🟢 支持：OpenAI 合同 + 差异化技术 + IPO 稀缺性，机构需求可能旺盛
- 🔴 质疑：高度依赖 OpenAI 单一大客户的集中度风险

**信源：** https://seekingalpha.com/news/4533742-ai-chipmaker-cerebras-targets-q2-2026-for-ipo-launch-report

**关联行动：** 关注 Cerebras 路演启动时间及 OpenAI 合同详细条款。

---

### NA-5. ⭐ Q1 2026 全球风投 $3000 亿创历史纪录，AI 占 80%——四笔千亿级融资占全球 65%

**概述：** Crunchbase 4 月报告，Q1 全球风投 $3000 亿（6000 家创业公司），打破历史纪录。AI 占 $2420 亿（80%）。史上最大五笔风投中四笔在 Q1 完成：OpenAI $1220 亿、Anthropic $300 亿、xAI $200 亿、Waymo $160 亿——合计 $1880 亿占全球 65%。另有 10+ 笔 $10 亿以上融资涵盖 AI、机器人、半导体。

**技术/产业意义：** AI 投资已不是”热潮”而是”重组”——全球风投资金以前所未有的速度向 AI 集中。80% 的 AI 占比意味着非 AI 创业公司融资环境正在被挤压。四家公司占 65% 说明”赢家通吃”特征极其明显。

**评论观察：**
- 🟢 支持：资本密集度反映 AI 作为通用技术的变革潜力
- 🔴 质疑：如此极端的资本集中是否在制造下一个泡沫？

**信源：** https://news.crunchbase.com/venture/record-breaking-funding-ai-global-q1-2026/

**关联行动：** 关注 Q2 融资节奏是否维持及对非头部公司的挤出效应。

---

### NA-6. [B] AWS DevOps Agent 和 Security Agent 正式 GA，企业级长时自主 Agent 进入生产

**概述：** AWS 4 月 6 日宣布 DevOps Agent 和 Security Agent 正式 GA。这两个”前沿 Agent”可自主运行数小时至数天：DevOps Agent 处理事件响应（MTTR 降低 75%、根因准确率 94%）；Security Agent 执行持续渗透测试。

**技术/产业意义：** 大型云厂商首次将长时自主 Agent 作为 GA 产品推出。75% MTTR 改善如果真实，将直接冲击 PagerDuty、Datadog 等传统运维工具的核心价值主张。”自主运行数小时至数天”是 Agent 能力新标杆。

**评论观察：**
- 🟢 支持：Agent 从实验性工具推向企业级 GA，行业成熟度标志
- 🔴 质疑：75% MTTR 改善可能受限于特定场景

**信源：** https://aws.amazon.com/blogs/aws/aws-weekly-roundup-aws-devops-agent-security-agent-ga-product-lifecycle-updates-and-more-april-6-2026/

**关联行动：** 关注 AWS Agent 在企业客户中的实际采用率。

---

### NA-7. [B] Uber 开始在 Amazon Trainium3 上训练 AI 模型，NVIDIA 替代生态再添重磅客户

**概述：** TechCrunch 4 月 7 日报道，Uber 启动在 AWS Trainium3（成本为 H100/H200 的 30-50%）上训练 AI 模型的试点，加入 Anthropic、OpenAI、Apple 的 Trainium 用户行列。

**技术/产业意义：** 当 Uber 这样的非 AI 原生大型科技公司转向 Trainium，说明 NVIDIA 替代芯片生态已从”早期采用者”进入”早期多数”阶段。Trainium3 + Google TPU + AMD MI400 = 三条替代路线同时加速。

**信源：** https://techcrunch.com/2026/04/07/uber-is-the-latest-to-be-won-over-by-amazons-ai-chips/

**关联行动：** 关注 Uber Trainium3 训练性能及成本对比数据。

---

### NA-8. [B] Perplexity 遭集体诉讼指控秘密向 Meta 和 Google 共享用户数据

**概述：** 旧金山联邦法院集体诉讼指控 Perplexity 通过内嵌 Facebook Pixel、Google Ads 追踪器秘密将用户对话数据（含隐私模式）共享给 Meta 和 Google，覆盖 2022 年 12 月至 2026 年 2 月所有非付费用户。同期 Perplexity 还在上诉禁止其 Comet AI 购物 Agent 访问 Amazon 的禁令。

**技术/产业意义：** AI 搜索引擎首个重大隐私集体诉讼。诉讼 + Amazon 禁令双线法律压力，对所有 AI 助手产品的隐私实践敲响警钟。

**信源：** https://www.bloomberg.com/news/articles/2026-04-01/perplexity-ai-machine-accused-of-sharing-data-with-meta-google

**关联行动：** 关注诉讼进展及 Perplexity 正式回应。

---

### NA-9. [B] Cohere 突破 $2.4 亿 ARR 瞄准 IPO，前 Meta FAIR 负责人加盟任首席 AI 官

**概述：** 企业级 LLM 公司 Cohere 超额完成 $2 亿 ARR 目标达 $2.4 亿（QoQ +50%）。以 $68 亿估值完成 $5 亿融资，CEO Aidan Gomez 释放 IPO 信号。新任首席 AI 官 Joelle Pineau 来自 Meta FAIR。3 月底开源 ASR 模型 Cohere Transcribe（5.4% WER，HuggingFace Open ASR 第一）。

**技术/产业意义：** “企业优先”路线的验证——不做消费者产品，专注企业部署。$2.4 亿 ARR 和 50% 环比增长说明企业 AI 需求加速。IPO 可能在 2026 H2，与 Cerebras、CoreWeave 形成 AI IPO 集群。

**信源：** https://techfundingnews.com/enterprise-ai-giant-cohere-builds-momentum-towards-ipo-surpasses-240m-arr/

**关联行动：** 关注 Cohere IPO 启动及 Pineau 加盟后研发方向变化。

---

### NA-10. [B] Microsoft Copilot 服务条款被发现”仅供娱乐用途”，企业 AI 定位遭质疑

**概述：** TechCrunch 4 月 5 日报道，Microsoft 服务条款将 Copilot 归类为”仅供娱乐用途”，而企业客户为 M365 Copilot 支付溢价。Microsoft 尚未正式澄清。CFO Amy Hood 同期确认公司正限制 Azure 云业务以将稀缺 GPU 重定向给 Copilot。

**技术/产业意义：** “娱乐用途”条款反映法律团队对 AI 产出责任的规避，与大力推广 Copilot 进入企业核心工作流的市场策略形成尖锐矛盾。Nadella 同期警告”模型过剩”——AI 能力超前于实际应用。

**信源：** https://techcrunch.com/2026/04/05/copilot-is-for-entertainment-purposes-only-according-to-microsofts-terms-of-service/

**关联行动：** 关注 Microsoft 是否修改服务条款措辞。

---

### NA-11. [B] CoreWeave 终止与 Poolside 的 2GW 得州数据中心项目，转向弹性多租户策略

**概述：** CoreWeave 和 Poolside 互相终止 Project Horizon（西得州 2GW AI 数据中心），原因是 Poolside 未按时启动首个 GPU 集群。CoreWeave 援引 $85 亿贷款支持的弹性多合作伙伴租赁策略，不再依赖固定锚定租户。Poolside 正寻找 Google 作为替代合作伙伴。

**技术/产业意义：** 反映 AI 基础设施策略分化：CoreWeave 选灵活性和风险分散。也暴露了二线 AI 公司在大规模基础设施项目中的执行力挑战。

**信源：** https://finance.yahoo.com/markets/stocks/articles/coreweave-ends-poolside-deal-raising-111152269.html

**关联行动：** 关注 Poolside 能否找到替代合作伙伴。

---

### NA-12. [B] 美国 AI 政策双线推进：DOJ 成立 AI 诉讼特别工作组 + 全球芯片出口分级管控

**概述：** 特朗普政府推出”轻监管”国家 AI 政策框架，DOJ 成立 AI Litigation Task Force 有权以违宪挑战各州 AI 法律。各州已提交 600+ AI 法案。同期美国起草全球 AI 芯片出口管控方案：1000 枚 GPU 简易审查、中等部署预审批、20 万枚以上需东道国政府认证——覆盖 NVIDIA 和 AMD 全球出口，不再只针对中国。

**技术/产业意义：** 联邦 vs 州的 AI 监管权力角力加剧。全球芯片出口分级管控若实施，将是史上最广泛芯片限制——20 万枚 GPU 门槛直接影响中东和东南亚 AI 基础设施项目。与 EU AI Act 延期形成对比：美欧都在找监管平衡点但路径完全不同。

**信源：** https://www.insideglobaltech.com/2026/04/06/u-s-tech-legislative-regulatory-update-first-quarter-2026/

**关联行动：** 关注全球芯片出口管控方案最终版本及各国反应。

---

## 📊 KOL 观点精选

> 本轮整合三大厂 CEO、顶级研究者及行业影响者近 48 小时关键观点。

### KOL-1. Sam Altman：”我们已越过事件视界，起飞已经开始”——但《纽约客》百源调查同步落地

4 月 5-6 日连发两篇重磅内容。博客”The Gentle Singularity”宣称 AI 已越过临界点：2026 年系统将产生全新科学洞见，2027 年机器人进入物理世界——但强调转变将是”日出，而非爆炸”。Axios 专访提出”AI 新政”：机器人税、公共财富基金、四天工作制不减薪。

然而同一时段《纽约客》发表 100+ 信源长篇调查——Ronan Farrow 引用董事会成员称 Altman”不受真相约束”，Ilya Sutskever 整理约 70 页 Slack 消息记录”持续的说谎模式”。Musk 同期在法庭要求罢免 Altman 职位。

**信号意义：** Altman 同时面临愿景叙事高峰与信任危机低谷，4 月 27 日庭审将进一步升级这种张力。

**信源：** https://blog.samaltman.com/the-gentle-singularity | https://www.semafor.com/article/04/06/2026/new-yorker-investigation-raises-questions-over-sam-altmans-trustworthiness

---

### KOL-2. Dario Amodei：内部情绪波动引发投资者担忧，Anthropic 文化鼓励员工公开挑战 CEO

Amodei 近日因在内部备忘录中激烈批评 Trump 和 Altman（起因是五角大楼将 Anthropic 列入黑名单——因拒绝移除 AI 安全限制）而引发投资者担忧。称 OpenAI 声明是”纯粹的谎言”，随后公开道歉。Benzinga 报道 Anthropic 内部文化鼓励员工在 Slack 上公开挑战 CEO——这被同时解读为正面信号（安全导向组织的透明度）和风险信号（创始人情绪化）。

**信源：** https://finance.yahoo.com/sectors/technology/articles/anthropic-backers-fret-over-ai-100000492.html | https://www.benzinga.com/markets/tech/26/04/51653555/just-argue-with-dario-inside-anthropics-ai-culture-where-employees-publicly-challenge-ceo-on-slack

---

### KOL-3. Jensen Huang：”你的工作和你做工作的工具，是相关的，不是相同的”

4 月 1 日 Fortune 访谈中针对 AI 取代工作恐惧给出独特框架——工作的本质（目的）和完成工作的工具（手段）不能混为一谈，AI 改变的是工具而非目的。GTC 2026 后续发酵：NemoClaw（开源 Agent OS）、Blackwell 售罄至年中、超 $200 亿收购（含 Groq）。Huang 正从”芯片供应商 CEO”转变为”AI 时代公共知识分子”。

**信源：** https://fortune.com/2026/04/01/nvidia-ceo-jensen-huang-advice-workers-scared-ai-confusing-job-with-tools-to-do-it/

---

### KOL-4. Satya Nadella 提出”模型过剩”概念：AI 能力正在超越实际应用

Nadella 公开警告：AI 能力已远超实际应用速度，2026 年核心任务不是追逐更强模型，而是让 AI 在实际场景中产生价值。”重要的不是单个模型的原始能力，而是人们如何应用它们。”Microsoft CFO 确认公司正限制 Azure 云以将 GPU 重定向给 Copilot。当 Altman 在谈”gentle singularity”时，Nadella 在说”先把手头的东西用好”——AI 领域最具分量的”务实派”声音。

**信源：** https://www.storyboard18.com/brand-makers/satya-nadella-flags-model-overhang-risk-in-2026-as-ai-outpaces-real-world-impact-86843.htm

---

### KOL-5. Andrej Karpathy：停止用 AI 写代码，开始用 AI 构建知识库——“分享想法而非代码”

4 月 2-4 日分享的”LLM Wiki”概念引发病毒式传播。Karpathy 转而将原始研究材料放入文件夹，让 LLM 自动构建互链知识库——单个主题增长到 100 篇文章、40 万字，无人工编辑。后续推文：”在 LLM Agent 时代，分享代码/应用的意义在减少——你只需分享想法，对方的 Agent 会为其定制构建。”这是对 AI 时代知识生产和分发范式的根本性重新思考。

**信源：** https://x.com/karpathy/status/2040470801506541998

---

### KOL-6. Jim Fan：”2026 年将作为大世界模型奠定机器人基础的元年载入史册”

NVIDIA 研究科学家 Jim Fan 断言 2026 年是”大世界模型为物理 AI 奠基”元年——“下一物理状态预测”将取代”下一 token 预测”成为新范式。DreamDojo 项目（基于 NVIDIA Cosmos）仅用 55 个遥操作轨迹（约 30 分钟数据）实现机器人间技能迁移。Fan 的观点与 LeCun 的 AMI Labs 形成呼应——两位不同背景的顶级研究者同时押注”后 LLM”方向。

**信源：** https://inferencebysequoia.substack.com/p/the-physical-turing-test-jim-fan

---

### KOL-7. Dylan Patel：SemiAnalysis 登上 CNBC Mad Money，AI 芯片分析从技术圈走向金融主流

SemiAnalysis 创始人 4 月 1 日做客 CNBC Mad Money 与 Jim Cramer 讨论 AI 基础设施和算力优势格局。团队从 20 人扩至 50+。AI 芯片分析正从技术圈影响力向金融市场影响力跨越——SemiAnalysis 的报告开始直接影响芯片股交易决策。

**信源：** https://www.cnbc.com/video/2026/04/01/semianalysis-ceo-dylan-patel-goes-one-on-one-with-jim-cramer.html

---

## 下期追踪问题

1. **Meta 的”半封闭”策略转向是否会引发开源社区大规模反弹？** Avocado 和 Mango 的发布节奏和开源版本延迟程度，将决定 Meta 能否在保留商业优势的同时维持开发者社区信任。也将影响 Hugging Face 等开源生态的供给格局。

2. **4 月 27 日 Musk v. OpenAI 庭审后，三大厂治理叙事将如何演变？** 《纽约客》调查 + Musk 罢免动议 + SpaceX IPO 银行胁迫 + Amodei 内部情绪波动——四条线在 4 月下旬集中交汇，可能改变公众对 AI 领导层的信任格局。

3. **Q1 $3000 亿 AI 风投是否可持续？如果 Q2 资本热度降温，哪些赛道首先承压？** 80% AI 占比和四笔千亿级融资主导的极端集中度，可能在非头部公司中制造融资真空。Cerebras、CoreWeave、Cohere 等计划 IPO 的窗口期是否足够？

---

## 📌 结论

今天最重要的不是”又有哪个模型刷了多少分”，而是 AI 行业的竞争层次正在继续上移：

- Anthropic 证明 frontier model 已经足以改写网络安全节奏
- OpenAI 开始把媒体和行业叙事也纳入版图
- Google 继续把 AI 做成基础设施和公共系统工程
- Broadcom / Google / Anthropic 说明芯片与算力联盟正在重组
- Mistral 代表欧洲开始认真补上游底座
- 中国模型则在全球调用层打出越来越硬的真实使用数据

欧洲区信号：EU AI Act 执行出现系统性危机（仅 8/27 成员国就位），但 Amnesty 联合 127 组织对 Digital Omnibus 的反击说明欧洲的治理博弈远未结束。Wayve $15 亿融资、LeCun $10 亿 AMI Labs、英国三巨头集群——欧洲的 AI 版图正在从”政策驱动”向”资本+产品驱动”转型。Mistral Forge 企业平台加上 Accenture 全球分发、Poolside $120 亿估值获 NVIDIA 重注——欧洲 AI 不再只有模型和政策，开始有真正的产品和客户。

学术/硬件信号：NVIDIA Rubin $1 万亿订单簿和 AMD MI400 的 40 PFLOPS 标志着算力军备竞赛进入新量级。TSMC 2nm 70% 良率提前达标锁定 2-3 年制造领先。Intel Gaudi 转向企业推理、Jaguar Shores 瞄准 2027，三巨头格局（NVIDIA/AMD/Intel）的分化越来越清晰。学术界两个方向值得关注：一是 Agent 安全研究的三重交叉验证（DeepMind 攻击分类 + Claw-Eval 44% 安全漏检 + OpenClaw 真实世界审计），共同指向当前 Agent 安全评估体系严重不足；二是 DARE 框架标志着扩散语言模型从零散实验走向系统化研究，自回归不再是唯一范式。

北美区信号：Meta 放弃全开源策略（Avocado/Mango 半封闭）、Musk 用 SpaceX IPO 杠杆强推 Grok、NVIDIA-Groq $200 亿交易遭国会反垄断质疑——北美 AI 的竞争已从模型层蔓延到分发层和治理层。Q1 $3000 亿风投（AI 占 80%）和 Cerebras $250 亿 IPO 说明资本正以前所未有的速度和集中度涌入 AI。

KOL 信号：Altman 宣称"gentle singularity"的同时遭纽约客百源调查质疑诚信——AI 领导层的信任危机与技术乐观叙事正面碰撞。Nadella 的"模型过剩"观点和 Karpathy 的"分享想法而非代码"代表了更务实的行业思考。Jim Fan 与 LeCun 同时押注世界模型路线，"后 LLM"叙事正在凝聚。

一句话总结：谁能把安全、算力、分发、生态和治理信任一起攥住，谁就是下一阶段的赢家——而这场竞赛现在是三大洲同时在跑，且竞争维度已从技术扩展到叙事和社会契约。

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

### 🇪🇺 欧洲区信源
- EU AI Act 延期投票: https://www.europarl.europa.eu/news/en/press-room/20260316IPR38219/meps-support-postponement-of-certain-rules-on-artificial-intelligence
- Amnesty vs Digital Omnibus: https://www.amnesty.org/en/latest/news/2026/04/eu-simplification-laws/
- Wayve $15 亿 D 轮: https://wayve.ai/press/series-d/
- LeCun AMI Labs $10 亿: https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/
- Anthropic 封锁 OpenClaw: https://techcrunch.com/2026/04/04/anthropic-says-claude-code-subscribers-will-need-to-pay-extra-for-openclaw-support/
- Helsing 卫星星座: https://helsing.ai/newsroom/helsing-partners-with-loft-orbital-to-deploy-europe-s-first-ai-powered-multi-sensor-satellite-constellation-for-governmental-defense-and-security-applications
- 英国 AI 三巨头集群: https://www.maddyness.com/uk/2026/04/07/elevenlabs-synthesia-luminance-these-british-scale-ups-on-the-rise-in-ai/
- DeepMind Agent 攻击分类: https://www.securityweek.com/google-deepmind-researchers-map-web-attacks-against-ai-agents/
- EU AI Act 裸体化禁令: https://www.europarl.europa.eu/news/en/agenda/plenary-news/2026-03-25/2/artificial-intelligence-parliament-to-vote-on-nudification-ban
- EU InvestAI 3 亿招标: https://digital-strategy.ec.europa.eu/en/news/eu-invests-over-eu307-million-artificial-intelligence-and-related-technologies
- Mistral Forge 企业平台: https://techcrunch.com/2026/03/17/mistral-forge-nvidia-gtc-build-your-own-ai-enterprise/
- Poolside AI $120 亿估值: https://techfundingnews.com/nvidia-prepares-up-to-1b-investment-as-poolsides-valuation-jumps-to-12b/

### 🌐 学术/硬件信源
- NVIDIA Rubin 平台: https://nvidianews.nvidia.com/news/rubin-platform-ai-supercomputer
- AMD MI400 发布: https://www.tweaktown.com/news/105758/amds-next-gen-instinct-mi400-gpu-confirmed-rocks-432gb-of-hbm4-at-19-6tb-sec-ready-for-2026/index.html
- TSMC 2nm 量产: https://www.tomshardware.com/tech-industry/semiconductors/tsmc-begins-quietly-volume-production-of-2nm-class-chips-first-gaa-transistor-for-tsmc-claims-up-to-15-percent-improvement-at-iso-power
- MegaTrain 单卡训练千亿模型: https://arxiv.org/abs/2604.05091
- Video-MME-v2: https://arxiv.org/abs/2604.05015
- CoreWeave $85 亿贷款: https://americanbazaaronline.com/2026/03/31/coreweave-secures-8-5-billion-loan-for-ai-infrastructure-expansion-477975/
- Firmus $5 亿融资: https://techcrunch.com/2026/04/07/firmus-the-southgate-ai-datacenter-builder-backed-by-nvidia-hits-5-5b-valuation/
- ByteDance In-Place TTT: https://arxiv.org/abs/2604.06169
- Claw-Eval Agent 评估: https://arxiv.org/abs/2604.06132
- Import AI #452: https://jack-clark.net/2026/04/06/import-ai-452-scaling-laws-for-cyberwar-rising-tides-of-ai-automation-and-a-puzzle-over-gdp-forecasting/
- Raschka Coding Agent 拆解: https://magazine.sebastianraschka.com/p/components-of-a-coding-agent
- Action Images 机器人策略: https://arxiv.org/abs/2604.06168
- AI 数据中心能源危机: https://www.cnbc.com/2026/04/06/ai-data-centers-financing-insurance-deals-gpu-debt.html
- OpenClaw 安全审计: https://arxiv.org/abs/2604.04759
- DARE 扩散 LLM 框架: https://arxiv.org/abs/2604.04215
- Intel Gaudi 战略转向: https://aihardwareindex.com/blog/intel-ces-2026-panther-lake-gaudi-3-and-the-crushing-amd-nar

### 🇺🇸 北美区信源
- Meta 半封闭转向 Avocado/Mango: https://www.axios.com/2026/04/06/meta-open-source-ai-models
- Musk SpaceX IPO 银行 Grok 订阅: https://www.pymnts.com/news/ipo/2026/musk-wants-spacex-ipo-banks-to-become-grok-subscriptions/
- Musk 要求罢免 Altman: https://www.cnbc.com/2026/04/07/elon-musk-seeks-ouster-of-openai-ceo-sam-altman-as-part-of-lawsuit.html
- NVIDIA-Groq 反垄断质疑: https://www.warren.senate.gov/newsroom/press-releases/warren-blumenthal-question-whether-nvidias-20-billion-groq-deal-is-attempt-to-avoid-antitrust-laws
- Cerebras IPO: https://seekingalpha.com/news/4533742-ai-chipmaker-cerebras-targets-q2-2026-for-ipo-launch-report
- Q1 VC $3000 亿纪录: https://news.crunchbase.com/venture/record-breaking-funding-ai-global-q1-2026/
- AWS DevOps/Security Agent GA: https://aws.amazon.com/blogs/aws/aws-weekly-roundup-aws-devops-agent-security-agent-ga-product-lifecycle-updates-and-more-april-6-2026/
- Uber + Trainium3: https://techcrunch.com/2026/04/07/uber-is-the-latest-to-be-won-over-by-amazons-ai-chips/
- Perplexity 隐私诉讼: https://www.bloomberg.com/news/articles/2026-04-01/perplexity-ai-machine-accused-of-sharing-data-with-meta-google
- Cohere $2.4 亿 ARR: https://techfundingnews.com/enterprise-ai-giant-cohere-builds-momentum-towards-ipo-surpasses-240m-arr/
- Microsoft Copilot 娱乐用途条款: https://techcrunch.com/2026/04/05/copilot-is-for-entertainment-purposes-only-according-to-microsofts-terms-of-service/
- CoreWeave 终止 Poolside 项目: https://finance.yahoo.com/markets/stocks/articles/coreweave-ends-poolside-deal-raising-111152269.html
- US AI 政策更新: https://www.insideglobaltech.com/2026/04/06/u-s-tech-legislative-regulatory-update-first-quarter-2026/
- OpenAI Safety Fellowship + 政策白皮书: https://techcrunch.com/2026/04/06/openais-vision-for-the-ai-economy-public-wealth-funds-robot-taxes-and-a-four-day-work-week/
- Google TorchTPU: https://developers.googleblog.com/en/torchtpu-running-pytorch-natively-on-tpus-at-google-scale/

### 📊 KOL 信源
- Sam Altman "The Gentle Singularity": https://blog.samaltman.com/the-gentle-singularity
- 纽约客 Altman 调查: https://www.semafor.com/article/04/06/2026/new-yorker-investigation-raises-questions-over-sam-altmans-trustworthiness
- Amodei 投资者担忧: https://finance.yahoo.com/sectors/technology/articles/anthropic-backers-fret-over-ai-100000492.html
- Anthropic 内部挑战文化: https://www.benzinga.com/markets/tech/26/04/51653555/just-argue-with-dario-inside-anthropics-ai-culture-where-employees-publicly-challenge-ceo-on-slack
- Jensen Huang AI 与就业: https://fortune.com/2026/04/01/nvidia-ceo-jensen-huang-advice-workers-scared-ai-confusing-job-with-tools-to-do-it/
- Nadella 模型过剩: https://www.storyboard18.com/brand-makers/satya-nadella-flags-model-overhang-risk-in-2026-as-ai-outpaces-real-world-impact-86843.htm
- Karpathy LLM Wiki: https://x.com/karpathy/status/2040470801506541998
- Jim Fan 世界模型: https://inferencebysequoia.substack.com/p/the-physical-turing-test-jim-fan
- Dylan Patel CNBC: https://www.cnbc.com/video/2026/04/01/semianalysis-ceo-dylan-patel-goes-one-on-one-with-jim-cramer.html
