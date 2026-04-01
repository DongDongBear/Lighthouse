动动早上好 ☀️ 今日 AI 圈信息密度爆表——OpenAI 收了 1220 亿美元成为地球上最贵的私人公司，Anthropic 一个月内连泄源码+超级模型+被发现计费 Bug，Google 祭出 Antigravity 正面硬刚 Cursor 且 Gemini MAU 突破 7.5 亿，SpaceX 秘密提交 $1.75 万亿 IPO。三大厂+中国厂+芯片厂全线有大动作，今年最密集的一天。

━━━━━━━━━━━━━━━━━━
⭐ 三大厂动态
━━━━━━━━━━━━━━━━━━

1. OpenAI 完成 1220 亿美元融资，估值 8520 亿 + 砍掉 Sora + 宣布 AI Superapp
Amazon 500 亿、NVIDIA 300 亿、软银 300 亿领投，首次向个人投资者开放。月收入 20 亿美元，周活 9 亿，广告试点 6 周破亿 ARR。正式砍掉 Sora（日活跌到 50 万、日烧百万美元），宣布把 ChatGPT+Codex+浏览+Agent 整合成"统一 AI Superapp"。GPT-5.4 全系上线，1M 上下文+Computer Use+Tool Search。
Sora 被砍是清醒的商业判断——对中国在砸视频生成的团队是直接警钟。1220 亿约等于中国所有大模型创业公司近三年累计融资的 3-4 倍，资本密度差距不是靠效率能弥合的。

2. Anthropic 连遭双重泄露：Claude Code 51 万行源码+KAIROS 主动 Agent / Mythos 超级模型意外曝光
npm 发包忘删 .map 文件，51.2 万行 TypeScript 源码被还原，6 万人 Fork。源码最劲爆的是代号 KAIROS 的 7×24 主动 Agent——心跳检测、GitHub webhook、cron 定时、跨会话记忆、"夜间做梦"autoDream。更离谱的是 CMS 配置错误泄露近 3000 份内部文档，曝出比 Opus 更强的新层级 Claude Mythos（Capybara），Anthropic 自己说在推理、编程和网安方面实现"阶跃式进步"。因网安攻击能力过强，Mythos 被延迟发布——CrowdStrike 暴跌 7%、Palo Alto 跌 6%、网安 ETF 整体跌 4.5%。
另外，Claude 自主发现了 FreeBSD 远程内核 RCE 漏洞（CVE-2026-4747），从源码审计到 exploit 开发全链路自主完成，HN 184 分。以安全为核心叙事的公司连续暴露发包失误+计费 Bug+CMS 配置错误——工程管理信任度在消耗，但 KAIROS 和 Mythos 的技术含量是真的。

3. Google：Gemini 突破 7.5 亿 MAU + ARC-AGI-2 刷榜 77.1% + Antigravity 开发平台发布
Gemini MAU 两年从 700 万增长到 7.5 亿（107 倍），Gemini 3.1 Pro 在 ARC-AGI-2 抽象推理得分 77.1%（GPT-5.2 仅 52.9%、Opus 4.6 68.8%），MMMU-Pro 多模态推理也拿下第一。定价仅 $2/M 输入+$12/M 输出，约 Opus 一半。Antigravity 是 Agent-first 开发平台，双模式（编辑器+Agent 编排界面），免费预览支持多模型。但 Alphabet 因 $1850 亿 CapEx 指引暴跌 9%，投资者开始问"花这么多钱，回报在哪？"
分发优势不可复制——Gemini 嵌入 Search、Chrome、Android、Workspace 数十亿量级产品。ARC-AGI-2 翻倍是真正的推理能力质变。但 7.5 亿 MAU 里多少是"被动触达"而非"主动使用"值得质疑。

━━━━━━━━━━━━━━━━━━
🔥 今日热点
━━━━━━━━━━━━━━━━━━

4. SpaceX 秘密提交 $1.75 万亿 IPO + 太空数据中心计划
向 SEC 秘密提交 S-1，寻求估值 $1.75 万亿，可能 6 月上市。2 月已收购 xAI（$2500 亿），正在探索太空轨道数据中心——利用零散热成本和 24/7 太阳能解决 AI 算力能源瓶颈。Starlink 占收入一半以上。如果成行，2026 年将是科技 IPO 超级年：SpaceX + OpenAI + Anthropic 三大 IPO 齐聚。

5. 阿里一天三弹：Qwen3.5-Omni + Qwen 3.6 Plus Preview + Wan2.7-Image
Qwen3.5-Omni 在 215 项任务 SOTA，音视频理解全面超越 Gemini-3.1 Pro，支持 256K 上下文+113 种语言。Qwen 3.6 Plus 百万上下文限时免费上 OpenRouter。Wan2.7-Image 千人千面捏脸+3K Token 文本渲染。百炼 API 输入每百万 token 不到 0.8 元，仅 Gemini-3.1 Pro 的 1/10——"技术+成本"双优势正在全球抢开发者心智。

6. NVIDIA Rubin 提前量产 + Nemotron Coalition + $20 亿入股 Marvell
Blackwell 下一代 Rubin 提前进全量生产，推理成本降 10 倍、MoE 训练 GPU 需求降 4 倍。联合 Mistral、Cursor、LangChain、Perplexity 等八大实验室成立 Nemotron Coalition。$20 亿入股 Marvell + NVLink Fusion 开放架构。Jensen Huang 说"不是开源 vs 闭源，而是 AND"。NVIDIA 已不只是卖 GPU，正在成为 AI 计算平台运营商。

7. AMD + Meta 签 6GW 史上最大非 NVIDIA GPU 协议
五年期合作，部署 6 吉瓦 AMD Instinct MI450 定制版，Meta 还拿到 1.6 亿股 AMD 认股权证。6GW 是 Mistral 目标算力的 30 倍。AI 硬件从"NVIDIA 独家"走向双供应商。ROCm 软件生态成熟度仍是最大变数，但 Meta 的大规模部署将倒逼其快速成熟。

8. 中国芯片出口暴增 72.6% + 华为万卡级全栈自主可控智算集群点亮
前两月中国 IC 出口 433 亿美元（+72.6%），平均单价暴涨 52%。从"搬运工"到"供应商"的历史性转折——存储芯片良率突破、AI 外围芯片静默替代、成熟制程饱和攻击三条路同时发力。同日全国首个万卡级全栈自主可控智算集群正式点亮，搭载华为昇腾 950PR（自研 HBM）。中国在先进制程确实有差距，但在"变相收路费"的供电/传输/模拟芯片上正在构建不可替代性。

9. Mistral €8.3 亿债务融资建巴黎数据中心
七家银行银团贷款，巴黎南部 44MW+13,800 块 GB300，目标 2027 年前 200MW 自有算力。ARR 一年从 2000 万涨到 4 亿美元。选择债务而非股权稀释，说明现金流撑得住——Mistral 正式从"有潜力的创业公司"升级为欧洲 AI 基础设施平台。

10. 智谱 vs MiniMax 上市后首份财报对比 + DeepSeek V4 预计本月发布
智谱收入 7.2 亿（+132%），亏 47.2 亿，市值 3863 亿港元；MiniMax 收入 5.7 亿（+159%），亏 17 亿，市值 3215 亿港元。两条截然不同的路线：智谱 B 端本地化 vs MiniMax C 端全球化。DeepSeek V4 万亿参数+1M 上下文+Engram 记忆也指向本月发布，腾讯混元 3.0 同期——4 月将是中国模型的密集发布期。

11. PrismML 1-Bit Bonsai + Google TurboQuant：模型压缩双突破
Bonsai 8B 模型仅需 1.15GB，14 倍小于全精度，8 倍更快。iPhone 上 130 tok/s。HN 360 分。Google TurboQuant 6 倍内存缩减"零精度损失"。SwiftLM 已用纯 Swift 在 M5 Pro 64GB 上跑通 Qwen3.5-122B。端侧大模型部署的经济学正在被改写，但"1-bit 真的不丢精度"社区还在激烈争论。

12. Claude Code 生态大爆发：everything-claude-code 13 万星霸榜
everything-claude-code 13 万 stars、claude-howto 日增 3336、oh-my-claudecode 2 万 stars、ccunpacked.dev（HN 902 分）——Claude Code 已从编码助手进化为完整的 Agent 开发平台生态。当第三方工具链比官方文档增长更快时，产品已经进入"平台生态爆发期"。

13. EU AI Act 合规推迟至 2027 年底 + NeurIPS OFAC 限制引发中国学术界集体抵制
欧洲议会延长高风险 AI 合规期限至 2027 底，同时禁止 nudify 类应用。NeurIPS 引入 OFAC 制裁限制中国 AI 学者（华为/商汤/旷视/海康等），CCF 建议暂停投稿审稿，可能将 NeurIPS 移出 A 类推荐目录。学术交流"铁幕"正在加速全球 AI 研究分裂为中美两大体系。

14. FIPO 突破推理训练瓶颈 + ASI-Evolve AI 自主驱动 AI 研发
FIPO 通过未来 KL 散度实现 token 级信用分配，Qwen2.5-32B 上 AIME 2024 从 50% 提到 58%，超 o1-mini。ASI-Evolve 闭环框架发现 105 种新线性注意力设计，数据筛选 MMLU 提升 18 分。方法论创新而非暴力缩放，这才是正确方向。

━━━━━━━━━━━━━━━━━━
📖 今日深度解读
━━━━━━━━━━━━━━━━━━

今天深度拆解了 24 篇，创 Lighthouse 单日记录：

**三大厂专题：**
• OpenAI 1220 亿融资与 AI Superapp 战略全解
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-openai-1220b-funding/
• GPT-5.4 全系列发布深度分析
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-gpt54-full-series/
• Anthropic Mythos/Capybara 泄露 — 比 Opus 更强的新层级
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-anthropic-mythos-capybara/
• Claude Code 源码泄露 + KAIROS 主动 Agent 全拆解
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-claude-code-kairos/
• Anthropic 3 月工程博客密集发布回顾
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-anthropic-engineering-march/
• Claude 自主发现 FreeBSD 内核 RCE 漏洞技术拆解
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-claude-freebsd-rce/
• Google Antigravity 开发平台 — Agent-first IDE 的突围之路
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-google-antigravity/
• Gemini 7.5 亿 MAU + ARC-AGI-2 刷榜分析
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-gemini-750m-mau/
• Alphabet 暴跌 9% — AI CapEx 陷阱恐慌解读
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-alphabet-capex-crash/

**芯片与基础设施：**
• NVIDIA Rubin 平台提前量产 — 推理成本降 10 倍
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-nvidia-rubin-platform/
• NVIDIA Nemotron Coalition 八大实验室结盟
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-nvidia-nemotron-coalition/
• AMD + Meta 6GW 供应协议 — AI 硬件双供应商时代
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-amd-meta-6gw/
• Mistral €8.3 亿债务融资 — 欧洲 AI 主权基建
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-mistral-data-center/
• 中国芯片出口暴增 72.6% — 从搬运工到供应商
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-china-chip-export-boom/
• 华为万卡级全栈自主可控智算集群
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-huawei-ascend-10k/

**中国厂商：**
• 阿里 Qwen3.5-Omni 全模态大模型拆解
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-qwen35-omni/
• 阿里 Wan2.7-Image — 告别 AI 标准脸
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-wan27-image/
• 高德 ABot-M0 — 通用机器人具身智能开源
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-abot-m0-embodied/
• 智谱 vs MiniMax 财务对比 — 烧钱越猛市值越高
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-zhipu-minimax-financials/
• 腾讯混元 HY 3.0 — 姚顺雨主导首个重磅产品
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-tencent-hunyuan-3/

**学术与政策：**
• FIPO 推理训练突破 — 未来 KL 散度打破 GRPO 天花板
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-fipo-reasoning-rl/
• EU AI Act 合规推迟 — 监管与竞争力的再平衡
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-eu-ai-act-delay/
• Hugging Face TRL v1.0 — LLM 后训练标准栈成熟
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-huggingface-trl-v1/

━━━━━━━━━━━━━━━━━━
💡 今日推荐
━━━━━━━━━━━━━━━━━━

最值得深读：Claude Code 源码泄露 + KAIROS 分析 — 52 个工具、95 个命令、8 套 Agent 设计模式，做 AI 编码工具的团队必读
最值得动手试：Qwen3.5-Omni — 百炼平台 API 输入不到 0.8 元/百万 token，仅 Gemini-3.1 Pro 的 1/10，音视频理解已验证超越 Gemini

━━━━━━━━━━━━━━━━━━

完整日报 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/daily/
