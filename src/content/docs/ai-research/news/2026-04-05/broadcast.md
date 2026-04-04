---
title: "2026-04-05 飞书播报"
date: "2026-04-05"
---

动动早上好 ☀️ 今日 AI 圈的主线很清楚：大厂继续卷平台和资本，开源阵营开始卷架构和系统，真正被重写的是推理基础设施和中国算力生态。

━━━━━━━━━━━━━━━━━━
⭐ 三大厂动态
━━━━━━━━━━━━━━━━━━

1. Anthropic 把 coding agent benchmark 的“玄学漂移”第一次量化了
Anthropic engineering 说得很直：Terminal-Bench、SWE-bench 这类评测测的不是纯模型，而是“模型 + 运行时环境”。同一 Claude 模型只因为资源限制从严格 1x 放宽到 uncapped，成功率就能拉开 6 个百分点，infra error 还能从 5.8% 掉到 0.5%。
这篇文章的杀伤力不在于帮 Anthropic 证明自己强，而是把很多 leaderboard 上 2-3 分的“领先”重新打回问号。接下来再看 coding agent 排行榜，先看 harness 和资源配置，不然很容易把系统工程优势误读成模型智力优势。
https://www.anthropic.com/engineering/infrastructure-noise

2. OpenAI 完成 1220 亿美元融资，已经不是模型公司，而是在按“AI 超级平台”估值
OpenAI 这一轮估值来到 8520 亿美元，周活 9 亿、订阅用户 5000 万+、月营收 20 亿美元，Amazon、NVIDIA、SoftBank 一起站台，连个人投资者入口都开了。更关键的是，它在拿钱的同时明确把 ChatGPT、Codex、搜索、Agent 往一个 Superapp 里收。
这轮融资真正可怕的不是数字大，而是飞轮已经跑通：算力、模型、产品、用户、收入彼此喂养。对其他玩家来说，接下来拼的不只是模型效果，而是谁还能在 OpenAI 之外保住自己的入口和分发。

3. Google DeepMind 的 Gemma 4 是 Google 近两年最像样的一次开源出手
Gemma 4 一次给了四个尺寸，31B 稠密版和 26B MoE 都打到了很能看的区间，而且这次直接换成 Apache 2.0，等于把之前最烦人的许可包袱扔了。更重要的是，PLE、Shared KV Cache、混合注意力这些设计，不只是刷榜，而是真在往“更高效的下一代 Transformer”走。
这次 Google 不是来凑热闹的，是来重新争开源心智的。Meta 如果 Llama 4 不能迅速给出更硬的回应，Gemma 4 很可能会把不少开发者拉回 Google 阵营。

━━━━━━━━━━━━━━━━━━
🔥 今日热点
━━━━━━━━━━━━━━━━━━

4. DeepSeek V4 优先适配华为昇腾和寒武纪，这条消息比“又发新模型”更重
DeepSeek 这次不是发布后再补兼容，而是在发布前就花几个月和华为、寒武纪一起改底层代码，把国产芯片放到了英伟达前面。训练端大概率还离不开 NVIDIA，但推理端已经开始认真切到国产路线。
这不是情绪化的国产替代，而是很务实的基础设施卡位。谁先把前沿模型稳定跑在国产芯片上，谁就不只是模型厂，而是未来中国 AI 计算生态的接口定义者。

5. 国产 AI 芯片份额升到 41%，说明中国算力市场已经从“备胎”阶段进入“可选主力”阶段
IDC 给的数很硬：本土芯片份额 41%，英伟达从制裁前 95% 掉到 55%，华为单家就拿下约 20%。这还不代表国产芯片已经追平全球旗舰，但已经足够说明采购逻辑变了——大家先看能不能持续拿到、能不能交付、能不能跑主业务。
英伟达在中国不是突然变弱了，而是“最好用”不再等于“最可买”。一旦 DeepSeek、阿里、字节这些头部负载持续压上国产卡，软件栈再难用也会被订单逼着进化。

6. Microsoft 开源 Agent Framework，目标不是做 demo，而是把企业 Agent 编排层收回微软体系
这个仓库最关键的信号不是功能多，而是它把 Semantic Kernel 和 AutoGen 的迁移路径都写出来了。graph workflow、checkpoint、human-in-the-loop、time-travel、OpenTelemetry 这些词摆在一起，说明微软盯的是生产级 Agent 的治理权，不是 prompt 玩具。
这一步被很多人低估了。企业 Agent 真正难的不是调模型，而是状态、恢复、审计和接管。谁把这层做成默认答案，谁就能吃掉后面的 Azure、Copilot 和企业开发栈红利。

7. Cerebras × AWS 的“拆分式推理”是今天最有技术味的一条基础设施新闻
它们想把 prefill 和 decode 彻底拆开：Trainium 负责 prefill，Cerebras WSE 负责 decode，通过 EFA 互联。逻辑很简单——今天真正拖垮 agentic coding 和长输出体验的，往往不是前半段算力，而是后半段的带宽和延迟。
如果这条路线跑通，未来推理竞争就不只是 GPU 对 GPU，而是“哪套系统更会分工”。这比单纯再堆一张更快的卡有意思得多，也更像下一轮推理架构的正确方向。

8. Holo3 把 Computer Use 又往前推了一步，小模型专业化训练开始狠狠干翻通用巨模型
HCompany 的 Holo3 在 OSWorld-Verified 上做到 78.85%，用 10B 活跃参数打过一票闭源大模型，而且还是 Apache 2.0 开权重。它证明了一件事：在桌面操作这类边界清晰的 Agent 任务里，专业化训练闭环比盲目堆参数更重要。
这条线的价值非常现实。企业自动化场景不一定需要“全能天才”，更需要“在固定系统里稳定办事的熟练工”。如果开源阵营继续沿这条路打，闭源大模型在垂直 Agent 场景的溢价会被继续压缩。

9. Mistral 把高质量 TTS 拉回开源阵营，Voice Agent 终于不只剩闭源 API 选项
Voxtral TTS 主打开放权重、低延迟、少样本声音克隆，目标非常明确，就是给 Voice Agent 做基础设施。过去高质量语音合成基本被 ElevenLabs、OpenAI、Google 这类闭源方案把着，这次 Mistral 至少把“可私有部署的好 TTS”重新拉回桌面。
我更看重这件事的方向意义。文本模型开源之后，语音一直没真正补齐，这次如果效果站得住，欧洲厂商会在多模态开源栈里重新拿回一块重要地盘。

10. 阿里 ATH 事业群不是普通组织调整，它是在把 Token 当工业品来运营
阿里把模型研发、MaaS 分发和应用消费拉成一个闭环，背后是一个很清晰的判断：未来竞争不是谁有一个最强模型，而是谁能最低成本、最大规模地炼出 Token 并卖出去。Qwen3.6-Plus 在全球开发者侧的数据表现，说明这套逻辑不是 PPT。
这件事值得盯紧，因为它是中国少数真正同时握着芯片、云、模型、应用四层牌的公司。要是 ATH 跑顺，阿里在国内 AI 产业链里的位置会更像“电网”而不是“单一模型厂”。

━━━━━━━━━━━━━━━━━━
📖 今日深度解读
━━━━━━━━━━━━━━━━━━

今天深度拆了 8 篇，最值得先读这 5 篇：

• OpenAI 1220 亿融资与 Superapp 战略 — 这不是单轮融资新闻，而是 AI 行业资本结构被重写的分水岭
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-05/deep-openai-1220b-funding/

• Microsoft Agent Framework 开源 — 看微软为什么想把企业 Agent 编排层重新统一到自己手里
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-05/deep-microsoft-agent-framework/

• DeepSeek V4 国产芯片优先 — 重点不在“爱国叙事”，而在模型公司开始定义中国算力生态接口
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-05/deep-deepseek-v4-domestic-chip-priority/

• Cerebras × AWS 拆分式推理 — 解释为什么 prefill / decode 分工可能是下一代推理系统的关键变化
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-05/deep-cerebras-aws-disaggregated-inference/

• 国产 AI 芯片份额 41% — 这不是市场份额快讯，而是中国算力格局开始换挡的硬信号
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-05/deep-china-ai-chip-share-41/

━━━━━━━━━━━━━━━━━━
💡 今日推荐
━━━━━━━━━━━━━━━━━━

最值得深读：Cerebras × AWS 拆分式推理 — 它不只是“某家云厂又上新”，而是在回答一个更关键的问题：当 agent workload 越来越重时，推理系统到底该怎么重新分工。

最值得动手试：Gemma 4 26B A4B — 直接拿手头常跑的代码题、多模态理解任务和 Qwen / Llama 做横向对比。它这次最有价值的不只是分数，而是效率曲线。

━━━━━━━━━━━━━━━━━━

完整日报 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-05/daily/
