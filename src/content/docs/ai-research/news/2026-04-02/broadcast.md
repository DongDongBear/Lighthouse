动动早上好 ☀️ 今日 AI 圈炸了——OpenAI 收了 1220 亿美元成为地球上最贵的私人公司，Anthropic 连泄两波（源码+超级模型），Google 祭出 Antigravity 正面硬刚 Cursor。一天之内三大厂全有大动作，这种密度今年罕见。

━━━━━━━━━━━━━━━━━━
⭐ 三大厂动态
━━━━━━━━━━━━━━━━━━

1. OpenAI 完成 1220 亿美元融资，估值 8520 亿 + 砍掉 Sora + 宣布 AI Superapp
Amazon 500 亿、NVIDIA 300 亿、软银 300 亿领投，首次向个人投资者开放。月收入已达 20 亿美元，周活 9 亿，广告试点 6 周就破亿 ARR。同时正式砍掉 Sora（日活从百万跌到 50 万、日烧百万美元），宣布把 ChatGPT+Codex+浏览+Agent 整合成"统一 AI Superapp"。GPT-5.4 全系也已上线，1M 上下文+Computer Use+Tool Search。
说实话，Sora 被砍是清醒的商业判断——对中国一堆在砸视频生成的团队是直接警钟。1220 亿约等于中国所有大模型创业公司 2024-2026 累计融资的 3-4 倍，资本密度差距已经不是靠效率能弥合的了。

2. Anthropic 连遭两波泄露：Claude Code 51 万行源码+KAIROS 主动 Agent 曝光 / Mythos 超级模型被意外公开
npm 发包忘删 .map 文件，51.2 万行 TypeScript 源码被还原，6 万人 Fork。源码里最劲爆的是代号 KAIROS 的 7×24 主动 Agent——心跳检测、GitHub webhook、cron 定时、跨会话记忆、甚至有"夜间做梦"的 autoDream 功能。Karpathy 说这代表 AI 的下一个进化方向。更离谱的是，CMS 配置错误又泄露了近 3000 份内部文档，曝出比 Opus 更强的新模型层级 Claude Mythos（Capybara），Anthropic 自己说在推理、编程和网安方面实现了"阶跃式进步"。
一家以安全为核心叙事的公司，一个月内连续暴露发包失误、计费 Bug、CMS 配置错误——工程管理的信任度在持续消耗。但 KAIROS 和 Mythos 的技术含量是真的，编码助手从"被动响应"到"主动巡逻"的范式跃迁已经不远了。

3. Google 发布 Antigravity Agentic 开发平台 + Gemini 3 Flash 上线 CLI
Antigravity 是 Google 对 Cursor/Claude Code 的正面回应——Agent-first 的开发平台，双模式设计（编辑器+Agent 编排界面），Agent 通过 Artifacts 沟通进展。免费公开预览，支持 macOS/Windows/Linux，内置 Gemini 3 Pro 并同时支持 Claude Sonnet 4.5 和 GPT-OSS。Gemini 3 Flash 在 CLI 中 SWE-Bench 76%，与 Pro 持平但更快更便宜。
Manager Surface 的设计理念很前瞻——Agent 需要专属工作空间而不是 sidebar 里的聊天框。但能否在 Cursor 和 Claude Code 已经建立的开发者心智中突围，这是 Google 开发工具老问题了。

━━━━━━━━━━━━━━━━━━
🔥 今日热点
━━━━━━━━━━━━━━━━━━

4. 阿里一天三弹：Qwen3.5-Omni 全模态 + Qwen 3.6 Plus Preview + Wan2.7-Image
Qwen3.5-Omni 在 215 项任务上 SOTA，音视频理解全面超越 Gemini-3.1 Pro，支持 256K 上下文和 113 种语言。Qwen 3.6 Plus Preview 百万上下文+限时免费悄然上 OpenRouter。Wan2.7-Image 千人千面捏脸+3K Token 文本渲染，告别 AI 标准脸。阿里这波组合拳打得又快又狠——"技术+成本"双优势正在全球抢开发者心智。

5. Claude 自主发现 FreeBSD 远程内核 RCE 漏洞（CVE-2026-4747）
Claude 从源码审计→漏洞定位→栈布局逆向→exploit 开发→测试验证，全链路自主完成。FreeBSD 的 RPCSEC_GSS 128 字节栈缓冲区缺少边界检查，通过 NFS 端口可远程获取 root shell。HN 184 分。这是 AI 自主发现并构建完整 RCE 利用链的里程碑事件，双刃剑效应愈发明显——同样的能力也可被用于攻击。

6. NVIDIA Rubin 提前量产 + Nemotron Coalition 八大实验室结盟
Blackwell 下一代继任者 Rubin 提前进全量生产，承诺推理成本降 10 倍、MoE 训练 GPU 需求降 4 倍。同时联合 Mistral、Cursor、LangChain、Perplexity 等成立 Nemotron Coalition 推进开源前沿模型。Jensen 说"不是开源 vs 闭源，而是开源 AND 闭源"。NVIDIA 已经不只是卖 GPU 了，正在成为 AI 计算平台运营商。

7. AMD + Meta 签下 6GW 史上最大非 NVIDIA GPU 协议
五年期合作，部署 6 吉瓦 AMD Instinct GPU（MI450 定制版），Meta 还拿到了最多 1.6 亿股 AMD 认股权证。6GW 是 Mistral 目标算力的 30 倍。AI 硬件从"NVIDIA 独家"走向双供应商，对整个行业的议价能力是好事，但 ROCm 软件生态的成熟度仍是最大变数。

8. Mistral €8.3 亿债务融资建巴黎数据中心
七家银行银团贷款，在巴黎南部建 44MW 数据中心配 13,800 块 GB300，目标 2027 年前建成 200MW 自有算力。ARR 一年从 2000 万涨到 4 亿美元。选择债务而非股权稀释，说明现金流已经撑得住——Mistral 从"有潜力的创业公司"正式升级为欧洲 AI 基础设施平台。

9. PrismML 1-Bit Bonsai：首个商用 1-bit 权重 LLM
8B 模型仅需 1.15GB 内存，14 倍小于全精度，8 倍更快。4B 版在 M4 Pro 上 132 tok/s，1.7B 版在 iPhone 上 130 tok/s。HN 360 分。如果 benchmark 声明成立，端侧大模型部署的经济学将被根本改写。不过"1-bit 真的不丢精度"这个问题，社区还在激烈争论。

10. 智谱 vs MiniMax 上市后首份财务对比
智谱收入 7.2 亿（+132%），亏 47.2 亿，市值 3863 亿港元；MiniMax 收入 5.7 亿（+159%），亏 17 亿，市值 3215 亿港元。两条完全不同的路线：智谱 B 端本地化（74%）vs MiniMax C 端全球化（海外 73%）。烧钱越猛市值越高——但两家超 100% 收入增速说明中国 AI 商业化确实已过"找客户"阶段。

11. DeepSeek V4 预计 4 月发布 + 腾讯混元 HY 3.0 同期
多方信源指向万亿参数 MoE + 1M 上下文 + Engram 记忆，泄露 SWE-Bench 83.7% 超 GPT-5。腾讯混元 3.0 是姚顺雨主导的首个重磅产品。4 月将是中国模型的密集发布期——DeepSeek V4 如果如期开源万亿参数，对闭源定价体系又是一次冲击。

12. EU AI Act 合规推迟至 2027 年底 + FIPO 突破推理训练瓶颈
欧洲议会投票延长高风险 AI 合规期限，同时禁止 nudify 类应用——务实调整但也被解读为对科技巨头让步。学术侧，FIPO 通过未来 KL 散度实现 token 级信用分配，在 Qwen2.5-32B 上 AIME 2024 Pass@1 从 50% 提到 58%，超 o1-mini。方法论创新而非暴力缩放，这才是推动 AI 进步的正确方向。

━━━━━━━━━━━━━━━━━━
📖 今日深度解读
━━━━━━━━━━━━━━━━━━

今天深度拆解了 7 篇：

• OpenAI 1220 亿融资与 AI Superapp 战略全解 — Sam Altman 的万亿之路和 Sora 之死
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-openai-122b-superapp/

• Claude 自主发现 FreeBSD 内核 RCE 漏洞技术拆解 — AI 安全研究的里程碑与双刃剑
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-claude-freebsd-rce/

• Anthropic Mythos/Capybara 泄露分析 — 比 Opus 更强的新层级意味着什么
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-anthropic-mythos-capybara/

• NVIDIA Nemotron Coalition 产业重构 — 八大实验室结盟与开源前沿模型新格局
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-nvidia-nemotron-coalition/

• FIPO 推理训练突破 — 未来 KL 散度如何打破 GRPO 天花板
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-fipo-reasoning-rl/

• Google Antigravity 开发平台 — Agent-first IDE 能否在 Cursor 主导的市场突围
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-google-antigravity/

• EU AI Act 合规推迟 — 监管雄心与经济竞争力的务实再平衡
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/deep-eu-ai-act-delay/

━━━━━━━━━━━━━━━━━━
💡 今日推荐
━━━━━━━━━━━━━━━━━━

最值得深读：Claude Code 源码泄露 + KAIROS 分析 — 52 个工具、95 个命令、8 套 Agent 设计模式，对做 AI 编码工具的团队是一手教科书
最值得动手试：Qwen3.5-Omni — 百炼平台 API 输入每百万 token 不到 0.8 元，仅 Gemini-3.1 Pro 的 1/10，音视频理解能力已验证超越 Gemini

━━━━━━━━━━━━━━━━━━

完整日报 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-04-02/daily/
