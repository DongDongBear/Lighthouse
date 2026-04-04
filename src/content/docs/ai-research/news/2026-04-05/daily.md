---
title: "2026-04-05 AI 日报：微软 Agent Framework 开源，AWS×Cerebras 押注拆分推理"
description: "DeepSeek V4 国产芯片优先 / Gemma 4 Apache 2.0 / 微软 Agent Framework / AWS×Cerebras 拆分推理 / Mercor 供应链泄露 / FlashAttention-4 / 补录 Anthropic 基础设施噪声研究 — 全球 37+ 条"
---

# 2026-04-05 AI 每日采集

> 采集时间：2026-04-05 22:10 CST（中国区）→ 03:18 CST（欧洲区+学术）→ 06:18 CST（北美区+三大厂）
> 覆盖轮次：第 1 轮中国区 / 第 2 轮欧洲区+学术 / 第 3 轮北美区+三大厂

---

## 上期追踪问题回应

上期（2026-04-04）未设置明确的"下期追踪问题"列表，但以下是对上期标记的关注点的跟进：

- **DeepSeek V4 发布进展**：4月4日多信源（The Information / 快科技 / 腾讯新闻）确认 DeepSeek V4 已完成华为昇腾 + 寒武纪国产芯片适配，即将发布。详见 CN-1。
- **Qwen3.6-Plus 后续表现**：上期记录其登顶 OpenRouter 日榜，今日 PingWest 深度分析阿里成立 ATH 事业群推动 Token 工业化战略，Qwen3.6-Plus 在 Code Arena 盲测进入全球前二。详见 CN-3。
- **华为昇腾芯片生态进展**：IDC 报告确认国产芯片市占率已达 41%，华为单家 20%。详见 CN-2。

---

## ⭐ 三大厂动态

**今日三大厂无同日新发布。** 但本轮对 Anthropic / OpenAI / Google DeepMind 共 12 个官方页面逐一检查（含 direct HTTP fallback）并回看 `ai-news-seen.json` 后，补录到 1 篇此前漏入 seen 的 Anthropic engineering 官方文，结果如下：

- **Anthropic**：最新可见内容仍以 Opus 4.6、3 月 25 日工程博客、4 月 2 日可解释性研究帖为主；模型文档页（docs.anthropic.com）通过 direct HTTP fallback 重试访问，未发现新的模型家族或定价变更。另补录 1 篇此前漏入 seen 的 engineering 文章《Quantifying infrastructure noise in agentic coding evals》，已全文核验并写入下方。
- **OpenAI**：最新可见新闻页条目仍为 4 月 2 日 TBPN 收购和 Codex 定价调整，已在此前日报及 seen 记忆中。Changelog 页面检查最近两周窗口，无明确的新 must-write 更新。
- **Google DeepMind**：最新重要 AI 条目仍为 4 月 Gemma 4 和 3 月 Gemini / 安全 / AGI 框架帖，已在此前轮次覆盖。

> ai-news-seen.json 已读取并比对。本轮无新的 same-day 三大厂发布，但已将 Anthropic 历史遗漏官方 URL 与几条此前未写入 seen 的旧官方链接一并补齐，避免后续轮次重复误报。

### BA-1. [A] ⭐ 待深度解读 — Anthropic 量化 agentic coding 评测中的基础设施噪声：同一模型仅因资源配置差异可拉开 6 个百分点

**概述：**
Anthropic engineering 发文指出，agentic coding eval（如 Terminal-Bench、SWE-bench）并不是纯模型测试，而是“模型 + 运行时环境”的系统测试。在其内部实验中，同一 Claude 模型在 Terminal-Bench 2.0 上仅因资源配置从严格 1x 到 uncapped 的不同，成功率就能拉开 6 个百分点（p < 0.01）。

**技术/产业意义：**
这篇文章最重要的结论不是“某个模型更强”，而是 leaderboard 上 2-3 个点的差距，很多时候可能反映的是 VM 更大、资源更松、sandbox 更宽容，而不一定是模型真实能力更强。对 2026 年 coding agent 竞争而言，这几乎是在评测基础设施层面解释了为什么“同模型不同 harness / infra，体感能力差很多”。

**深度分析：**
- 在 Terminal-Bench 2.0 上，1x 严格资源限制时 infra error 为 5.8%，uncapped 降到 0.5%
- 大约到 3x 之前，额外资源主要是在修复基础设施噪声（例如瞬时峰值导致的 OOM kill）；超过 3x 后，额外资源才开始真正帮助 agent 安装更重依赖、启动更贵 subprocess、跑更吃内存的测试，从而“把题做出来”
- Anthropic 的核心建议是：benchmark 不该只报一个 pinned spec，而应同时公布 guaranteed allocation 与 hard kill threshold；在资源方法学未标准化前，低于 3 个百分点的 leaderboard 差距都应该谨慎看待
- 这与近期关于 coding agent 竞争从“模型对模型”转向“模型 + workflow + harness”竞争的判断高度共振：评测分数的漂移，很多时候不是模型突然更聪明了，而是系统层更稳了

**评论观察：**
- 🟢 支持：这是一篇非常重要的工程校准文，把很多人隐约感受到的“benchmark 漂移”第一次量化了。
- 🔴 质疑：Anthropic 主要基于自家 eval infra 的观察得出结论，不同 benchmark、不同 provider、不同模型上的外推幅度，仍需要更多第三方复现实验。

**信源：**
https://www.anthropic.com/engineering/infrastructure-noise

**关联行动：** 跟踪该文是否进入 Terminal-Bench / SWE-bench 社区的 benchmark reporting 规范，并考虑单独做深度解读。

---

## 🇨🇳 中国区

### CN-1. [A] ⭐ DeepSeek V4 确认优先适配华为昇腾 + 寒武纪，打破英伟达优先惯例

**概述：**
4 月 4 日，多家媒体（The Information / 快科技 / 腾讯新闻）报道确认：DeepSeek 即将发布的新一代旗舰模型 V4 已基于华为昇腾和寒武纪国产 AI 芯片完成底层优化。DeepSeek 打破行业惯例，未向英伟达/AMD 提供早期访问权限，而是将国产芯片厂商置于优先位置，花费数月与华为工程师重写模型底层代码。

**技术/产业意义：**
这是全球首次有一线大模型公司在发布前主动将国产芯片置于英伟达之上。DeepSeek V4 的推理端将跑在华为最新昇腾 950PR 处理器上，该芯片单卡算力号称 H20 的 2.87 倍，支持 FP4 低精度推理（中国唯一），128GB 显存。此举标志着中国 AI 算力生态闭环正在加速形成。

**深度分析：**
- **华为昇腾 950PR 关键指标**：算力 1 PFLOPS（FP8）/ 2 PFLOPS（FP4），互联带宽 2TB/s，内存 128GB、带宽 1.6TB/s，功耗 600W
- **FP4 推理的战略意义**：700 亿参数模型 FP16 需 140GB 显存，FP4 只需 35GB——同一芯片可部署 4 倍大模型，这是华为在制程（7nm vs 台积电 4nm）劣势下的"田忌赛马"策略
- **训练端仍依赖英伟达**：V4 训练大概率在英伟达 GPU 上完成，推理端国产替代是现阶段突破口
- **DeepSeek 还在开发两个 V4 变体**：针对不同应用场景优化，同样基于国产芯片
- **阿里/字节/腾讯已提前下单华为新芯片**：订单规模达数十万颗
- **生态飞轮效应**：DeepSeek 证明前沿模型可跑在国产芯片上 → 其他厂商跟进 → 华为获得更多负载反馈 → 生态加速成熟

**评论观察：**
- 🟢 支持：这是 DeepSeek 主动卡位国产算力生态的战略布局，不仅是应对制裁的被动防御，更是抢占新生态位的主动进攻。飞轮一旦转起来，国产 AI 计算闭环将自我加速。
- 🔴 质疑：950PR 功耗 600W（H20 两倍），大规模部署时散热/电力成本翻倍；FP4 精度损失在复杂数学推理等场景的实际影响尚无第三方评测数据；训练端国产替代仍无时间表。

**信源：**
https://news.qq.com/rain/a/20260404A06B8E00
https://news.mydrivers.com/1/1113/1113767.htm

**关联行动：** 跟踪 DeepSeek V4 正式发布时间及 benchmark 数据，重点关注 FP4 推理下的性能/精度 trade-off。

---

### CN-2. [A] ⭐ IDC 报告：国产 AI 芯片市场份额升至 41%，华为一家独占近半

**概述：**
4 月 2-4 日，IDC 最新报告显示，2025 年中国 AI 加速服务器市场中，本土芯片厂商份额已攀升至约 41%（出货约 165 万张），英伟达从制裁前的 95% 降至 55%。华为以 81.2 万张出货量（约 20% 国内市场份额）稳居国产厂商首位，平头哥 26.5 万张第二，百度昆仑芯和寒武纪各 11.6 万张并列第三。

**技术/产业意义：**
英伟达在中国市场的垄断地位已被实质性打破。华为昇腾 950PR（Atlas 350 加速卡，3 月 21 日发布）性能号称 H20 的近三倍，标志着国产芯片从"能用"向"好用"迈进。美国芯片制裁实际上催化了中国 AI 芯片生态的快速成熟。

**深度分析：**
- **市场格局**：英伟达 220 万张（55%）→ 华为 81.2 万张（20%）→ 平头哥 26.5 万张 → 百度昆仑芯/寒武纪各 11.6 万张 → AMD 16 万张（4%）→ 海光/天数智芯/沐曦等
- **结构性因素**：各地智算中心建设热潮普遍采用国产芯片，直接推动本土份额增长
- **英伟达的困境**：即使 H200 部分入华，也难恢复制裁前垄断地位；英伟达 CFO 坦言中国竞争对手可能"颠覆全球 AI 产业结构"
- **5-10 年差距**：业内评估国产 AI 芯片与英伟达/AMD 仍有较大技术差距，但政策推动的替代效应持续显现

**评论观察：**
- 🟢 支持：从 95% 降至 55% 的速度远超预期，国产替代已是不可逆趋势。华为 + DeepSeek 联手可能形成中国版"CUDA + PyTorch"。
- 🔴 质疑：绝对性能差距仍在，训练端替代尚远；华为软件生态（CANN/MindSpore）与 CUDA 差距不止一代。

**信源：**
https://news.mydrivers.com/1/1113/1113245.htm
https://news.mydrivers.com/1/1113/1113229.htm

**关联行动：** 持续跟踪华为昇腾 950PR 在大规模推理部署中的实际表现和第三方评测数据。

---

### CN-3. [A] ⭐ 阿里 ATH 事业群战略解读：千问三连发推动 Token 工业化

**概述：**
4 月 4 日，PingWest/网易等媒体深度报道了阿里近期"三连发"背后的战略布局：3 月 16 日成立 Alibaba Token Hub（ATH）事业群，由集团 CEO 吴泳铭直接统帅。通过"创造 Token（通义实验室）→ 输送 Token（百炼 MaaS）→ 消费 Token（千问 APP/悟空/创新应用）"闭环，推动 Token 工业化。

**技术/产业意义：**
- Qwen3.6-Plus 在 Code Arena 盲测进入全球前二（编程能力）
- OpenRouter 数据：2026 年 3 月中国 AI 大模型周调用量 7.359 万亿 Token，连续三周超过美国（美国用户占 OpenRouter 47%，中国仅 6%）
- 沙利文报告：2025 下半年中国企业级大模型日均调用量 37 万亿 Token，阿里千问份额从 17.7% 翻倍至 32.1%
- 平头哥首代 PPU 性能对标英伟达 H20，升级版部分指标超 A100，累计出货 47 万颗

**深度分析：**
- **Token 作为"新石油"**：中国电力基建优势（东数西算节点 0.4 元/度）→ 炼出最具性价比的 Token → 每百万 Token MiniMax M2.5/GLM-5 仅 0.3 美元 vs Claude 5 美元（价差 17 倍）
- **全栈自研闭环**：芯片（平头哥）→ 云（阿里云/飞天）→ 模型（Qwen）→ 应用（千问 APP），这是中国唯一实现完整链条的企业
- **海外开发者生态**：亚马逊、Airbnb、英伟达、微软、Meta 和李飞飞团队均使用千问模型

**评论观察：**
- 🟢 支持：阿里的全栈布局在中国独一无二，ATH 战略将 Token 从技术概念升级为工业产品。
- 🔴 质疑：ATH 事业群刚成立不到一个月，内部整合和执行效果有待观察。

**信源：**
https://www.163.com/dy/article/KPMI019D05560SSL.html

**关联行动：** 关注 ATH 后续组织变革动向，以及千问在全球开发者市场的持续增长数据。

---

### CN-4. [B] 豆包二代 AI 手机 Q2 登场：TOP5 手机大厂两家接洽字节跳动

**概述：**
4 月 3 日，数码博主 @数码闲聊站爆料：豆包二代 AI 手机暂定 Q2 登场，国产手机 TOP5 大厂中已有两家正在接洽豆包，寻求系统级 AI 合作。业内分析排除华为（盘古大模型）和小米（MiMo + 澎湃 OS），vivo 和荣耀可能性最大。

**技术/产业意义：**
字节跳动"不造手机、只赋能"的策略正从中小厂（中兴努比亚 M153 工程机）向头部大厂渗透。合作模式为系统级深度整合，豆包将调用手机系统权限实现全局语音、跨应用操作等。字节提出"流量分发 + 会员分成"模式，免除厂商开发费。

**深度分析：**
- vivo 自研蓝心大模型进度不及预期，与豆包合作可能性最高
- 荣耀采取模块化合作策略，仅在输入法等局部功能引入豆包
- TOP5 大厂占国内 80%+ 手机份额，合作落地意味着豆包覆盖数亿用户
- 豆包月活超 2.26 亿、DAU 破亿，已是中国最大 AI 原生应用

**评论观察：**
- 🟢 支持：字节的"Android 式"开放生态策略比苹果/华为的封闭路线更灵活。
- 🔴 质疑：手机厂商对核心 AI 能力外包的接受度存疑，担心数据和用户入口旁落。

**信源：**
https://www.sohu.com/a/1005068872_100085330

**关联行动：** 跟踪 vivo/荣耀与字节的合作官宣，关注豆包手机助手 Q2 发布。

---

### CN-5. [B] 月之暗面推出"穿越计划"：给 27 届实习生授予期权

**概述：**
4 月 3 日，晚点 LatePost 独家报道：月之暗面即将推出"穿越计划"顶尖人才校招计划，首批 16 名 2027 届毕业生实习考察 3-6 个月后即可获授期权，无专业/学历限制。月之暗面目前估值 180 亿美元（三个月翻 4 倍），仅 300 多人。

**技术/产业意义：**
这是国内 AI 创业公司首次将期权激励扩展到未毕业实习生。AI 人才争夺日益白热化——脉脉报告显示 2026 年前两月 AI 岗位量暴涨 12 倍，平均月薪 60738 元。字节 Seed 团队同期也在全球招募 100 名大模型人才并开出"豆包股"。

**深度分析：**
- K2.5 模型跻身国际顶尖 + OpenClaw 推动的市场情绪 → 三个月三轮融资 → 估值 180 亿美元
- 月之暗面 ARR 突破 1 亿美元，正评估赴港 IPO
- "穿越计划"核心卖点：期权单价三个月提升 4 倍的增长预期，这是大厂无法提供的

**评论观察：**
- 🟢 支持：用品味和增长预期吸引顶尖人才，符合 AI 时代"少而精"的团队理念。
- 🔴 质疑：给未毕业实习生期权有法律和税务复杂性；300 人公司 180 亿估值的泡沫风险。

**信源：**
https://news.qq.com/rain/a/20260403A036OT00
https://www.huxiu.com/moment/1233072.html

**关联行动：** 关注月之暗面 IPO 进展和 K3 模型发布时间。

---

### CN-6. [B] 字节跳动 Seed 团队全球招募百名大模型人才，六大技术方向曝光

**概述：**
4 月 1 日，字节跳动 Seed 团队启动全球大模型人才专项校招，计划招募约 100 人，涵盖基础大模型、视觉智能、语音智能、机器学习系统、大模型应用和具身智能六大方向。此前已启动最大规模"ByteIntern"转正计划开放 7000+ 名额。

**技术/产业意义：**
- 六大方向首次公开披露了 Seed 团队完整技术布局
- 具身智能方向首次出现，标志字节正式进军机器人领域
- 符合条件的应届生可获"豆包股"，越早加入越有机会共享增值
- 已有毕业不到一年的校招员工参与 Seedance 2.0 预训练攻坚

**评论观察：**
- 🟢 支持：字节在 AI 领域的投入力度持续加码，Seed 2.0 + Seedance 2.0 证明团队实力。
- 🔴 质疑：100 人规模相对保守，与 7000 人的实习生计划形成反差。

**信源：**
https://www.mrjjxw.com/articles/2026-04-01/4320993.html

**关联行动：** 关注 Seed 团队后续在具身智能方向的产品发布。

---

### CN-7. [B] 广电协会严禁 AI 演员换脸声纹克隆，建立侵权监控机制

**概述：**
中国广播电视社会组织联合会演员委员会近日发布声明，明确严禁任何主体未经授权采集演员影像和音频数据用于 AI 模型训练、换脸合成和声纹克隆。要求平台建立授权核验机制，将开展定期侵权监控和批量维权行动。

**技术/产业意义：**
这是继红果短剧下架 AI 剧《桃花簪》（4 月 3 日）之后，行业组织层面对 AI 换脸/声纹克隆的首次系统性表态。从平台自治（红果下架）到行业规范（广电协会声明），标志着 AI 生成内容的肖像权保护进入制度化阶段。

**深度分析：**
- 要求平台建立"事前审核 + 授权核验"双机制
- 即使标注"非商业""娱乐目的"也不构成法律豁免
- 将使用技术手段追踪 AI 侵权线索，发起批量法律维权

**评论观察：**
- 🟢 支持：为 AI 生成内容的合规使用划定清晰边界，保护演员数字资产。
- 🔴 质疑：技术执行难度大，跨平台监控成本高，实际效果有待观察。

**信源：**
https://www.aibase.com/news/26825

**关联行动：** 关注后续具体执法案例和平台响应。

---

### CN-8. [B] 腾讯云推出"龙虾"记忆服务 Agent Memory，提升 AI 助理智能水平

**概述：**
腾讯云正式推出"龙虾"记忆服务 TencentDB Agent Memory，为 OpenClaw 系统添加长期记忆能力。采用四层渐进式记忆架构（原始对话 → 原子记忆 → 场景分块 → 用户画像），将 AI 助理回复准确率提升至 76.10%，比此前记忆系统提高近 59%。

**技术/产业意义：**
长期记忆是 AI 助理从"工具"进化为"伙伴"的关键能力。腾讯此举将记忆能力产品化，用户在腾讯云控制台一键开启即可使用。企业版 Agent Memory Pro 即将推出，支持多用户和企业级场景。

**深度分析：**
- **四层记忆架构**：L1 原始对话完整保存 → L2 自动提取用户偏好/关键约束 → L3 按项目聚类确保准确上下文召回 → L4 形成稳定用户特征
- 对比 Anthropic 的 Claude Memory 和 OpenAI 的 ChatGPT Memory，腾讯的四层架构更系统化
- 数据治理和隐私控制是企业版的核心差异化点

**评论观察：**
- 🟢 支持：记忆能力是 AI Agent 产品化的关键基础设施，四层架构设计合理。
- 🔴 质疑：76.10% 准确率在企业场景是否足够？记忆污染和遗忘机制需要验证。

**信源：**
https://www.aibase.com/news/26827

**关联行动：** 评估龙虾记忆服务在 Lighthouse 工作流中的潜在应用。

---

### CN-9. [B] DeepSeek V4 与腾讯混元新模型均预计 4 月发布，两大路线同台竞技

**概述：**
据白鲸实验室 3 月独家爆料（IT 之家等转载），DeepSeek V4 和姚顺雨领衔的腾讯混元新模型均预计 4 月发布。DeepSeek V4 为多模态万亿参数 MoE 模型，重点突破长期记忆和编程能力；腾讯混元新模型约 30B 参数，由首席 AI 科学家姚顺雨主导，聚焦上下文学习和 Agent 可用性。

**技术/产业意义：**
- DeepSeek 已知研究方向：mHC 架构优化、Engram 长期记忆、条件记忆机制（梁文锋署名论文）
- 腾讯混元路线：CL-bench 评测基准（上下文学习）、姚顺雨明确"不以打榜为导向"
- 两条路线分别代表"架构创新 + 记忆突破"和"真实任务评测 + Agent 能力"

**评论观察：**
- 🟢 支持：4 月将是中国大模型领域的密集发布期，DeepSeek V4 和混元新模型代表两种不同的技术哲学。
- 🔴 质疑：DeepSeek V4 已多次跳票（2 月→3 月→4 月），正式发布时间仍有不确定性。

**信源：**
https://www.ithome.com/0/929/040.htm

**关联行动：** 密切跟踪两款模型的正式发布和 benchmark 数据，第一时间做深度解读。

---

### CN-10. [B] 阿里在千问 App 上线 Wan2.7-Video：从文生视频转向“可编辑视频工作流”

**概述：**
4 月 3 日，千问 App 正式上线 Wan2.7 视频模型，新增三项核心能力：视频编辑、视频续写、动作模仿。用户可直接通过自然语言修改现有视频中的人物、服装、背景、镜头机位与风格，也可把一段 2 秒短视频续写到最长 15 秒，并复刻参考视频中的动作与运镜节奏。

**技术/产业意义：**
这不是又一条普通的“文生视频”更新，而是阿里把视频生成能力从一次性创作，推进到更接近剪辑软件的可控编辑流程。Wan2.7-image 与 Wan2.7-Video 同步进入千问 App，说明阿里正在把图像/视频生成能力打包进统一消费级入口，而不是只停留在模型发布层。

**深度分析：**
- **能力重心变化**：重点不再只是“从零生成一段视频”，而是允许用户围绕已有素材做局部修改、剧情续写和动作迁移，这更贴近真实内容生产流程
- **控制粒度提升**：支持改角色动作、表情、台词、镜头机位、背景环境与整体风格，意味着模型在时序一致性和局部可编辑性上更进一步
- **产品化价值更高**：2 秒到 15 秒的续写上限虽然不长，但足以覆盖短视频创作中的补镜头、补转场、补动作等高频需求
- **阿里路线清晰**：一边用 Qwen 拉高通用模型与 Agent 能力，一边把 Wan 系列多模态创作能力塞进千问 App，形成“基础模型 + 消费入口”的双轮布局

**评论观察：**
- 🟢 支持：相比只追逐文生视频 benchmark，把编辑、续写、动作模仿先做成可用功能，更容易形成真实用户粘性和素材复用场景。
- 🔴 质疑：AIGC 视频编辑最难的是时序稳定性、口型一致性和局部修改后的全局自然度，当前公开信息还没有给出系统 benchmark 或长视频表现。

**信源：**
https://www.aibase.com/zh/news/26850

**关联行动：** 跟踪 Wan2.7-Video 后续是否开放 API / ModelScope 体验页，重点观察其在局部编辑和视频续写上的可控性是否领先国内同类产品。

---

## 📊 中国区自检清单

- [x] 第一梯队 DeepSeek（3 种以上搜索 + 原文阅读）✅
- [x] 第一梯队阿里/千问/Qwen（ATH 战略 + Wan2.7-Video / 千问 App 落地交叉验证）✅
- [x] 第一梯队字节跳动/豆包（手机合作 + Seed 招聘 + 日均 120 万亿 Token）✅
- [x] 第一梯队智谱 AI/GLM（GLM-5V-Turbo 4 月 2 日发布，已超 24h 但列入背景）✅
- [x] 第一梯队月之暗面/Kimi（穿越计划 + IPO 传闻）✅
- [x] 华为昇腾深挖（950PR + IDC 市场数据 + DeepSeek 适配）✅
- [x] 中文新闻源覆盖（AIBase / 36kr 快讯 / 快科技 / 腾讯新闻 / 搜狐 / 每经 / IT 之家 / 虎嗅 / 晚点）✅
- [x] 政策覆盖（广电协会 AI 换脸禁令）✅
- [x] 每条信息都有原始链接 ✅
- [x] 每条都读过原文 ✅
- [x] 只收 A/B 级内容，无 C 级垃圾 ✅
- [x] ⭐ 标记从严（3 条 A 级：DeepSeek V4 国产芯片 / 国产芯片份额 41% / 阿里 ATH Token 工业化）✅
- [⚠️] DuckDuckGo 多次限流，通过直接 fetch 信源页面补充采集
- [⚠️] 百度/腾讯混元/MiniMax/面壁/阶跃/百川/昆仑万维/商汤/科大讯飞/小米 今日无重大独立新闻（部分在综合报道中提及）
- [⚠️] 量子位首页 403 被拒，机器之心改为数据服务页面，已通过其他信源覆盖

**中国区采集总数：10 条（A 级 3 条 + B 级 7 条）**

---

> 欧洲区+学术/硬件采集时间：2026-04-05 03:18 CST（北京时间）
> 覆盖轮次：第 2 轮欧洲区+全球学术

---

## 🇪🇺 欧洲区

### EU-1. [A] ⭐ Google DeepMind 发布 Gemma 4 开源多模态模型：Apache 2.0 许可证 + 四种尺寸 + 端侧部署

**概述：**
4 月 2 日，Google DeepMind 正式发布 Gemma 4 系列开放权重多模态模型，这是 Gemma 系列迄今最重大的升级。Gemma 4 提供四种尺寸（E2B/E4B/26B-MoE/31B-Dense），全面支持文本+图像+音频输入，且首次采用 Apache 2.0 开源许可证，彻底摒弃此前饱受批评的 Gemma 自定义许可。

**技术/产业意义：**
Gemma 4 是当前最强端侧可用开源模型之一。31B Dense 在 LMArena 文本排行榜预估 ELO 达到 1452，位列开源模型第三（仅次于 GLM-5 和 Kimi 2.5），而 26B MoE 以仅 4B 活跃参数达到 1441 ELO，token/s 效率极高。Apache 2.0 许可的转变对开发者生态意义深远——此前 Gemma 3 的自定义许可允许 Google 单方面修改条款，且可能将限制扩展到 Gemma 生成的合成数据衍生模型。

**深度分析：**
- **四种模型规格**：
  - Gemma 4 E2B：2.3B 有效参数 / 5.1B 含嵌入，128K 上下文，支持音频
  - Gemma 4 E4B：4.5B 有效参数 / 8B 含嵌入，128K 上下文，支持音频
  - Gemma 4 31B：31B Dense 模型，256K 上下文，单张 H100 可运行 bf16
  - Gemma 4 26B-A4B：26B 总参数 / 4B 活跃的 MoE 模型，256K 上下文
- **关键架构创新**：
  - Per-Layer Embeddings (PLE)：为每一层提供独立的 token 级条件信号，替代传统单一嵌入
  - Shared KV Cache：后 N 层复用前层 K/V 状态，显著降低推理内存
  - 混合注意力：交替使用滑动窗口（局部）和全上下文（全局）注意力层
  - 可变图像 token 预算：70/140/280/560/1120 可选，灵活平衡速度与质量
- **端侧部署优化**：E2B/E4B 由 Pixel 团队联合高通/联发科优化，面向手机/Raspberry Pi/Jetson Nano
- **Gemini Nano 4 确认**：Google 首次确认下一代手机端 AI 模型 Nano 4 将基于 Gemma 4 E2B/E4B
- **全面生态支持**：transformers, llama.cpp, MLX, WebGPU, Rust, Ollama 同步适配
- **HF Blog 获 482 upvotes**，社区反应极其热烈

**评论观察：**
- 🟢 支持：Apache 2.0 许可是最重要的变化——开发者终于可以无顾虑地在 Gemma 上构建商业项目。31B 的质量在开源中已是顶级，26B MoE 的效率/质量比令人震惊。Ars Technica 评价「这可能是 Gemma 最重要的版本」。
- 🔴 质疑：与闭源 Gemini 3.1 Pro 仍有差距；256K 上下文虽好但远低于 Gemini 的 1M；31B 在消费级 GPU 上需要量化才能运行。

**信源：**
https://huggingface.co/blog/gemma4
https://arstechnica.com/ai/2026/04/google-announces-gemma-4-open-ai-models-switches-to-apache-2-0-license/

**关联行动：** 在本地测试 Gemma 4 26B-A4B（效率最优选择），评估用于 Lighthouse 工作流的可行性。关注 Google I/O 上 Gemini Nano 4 的更多细节。

---

### EU-2. [A] HCompany 发布 Holo3：OSWorld 基准 78.85% 新 SOTA，开源 Computer Use Agent

**概述：**
4 月 1 日，法国 AI 公司 HCompany 发布 Holo3，在 OSWorld-Verified 桌面计算机使用基准上达到 78.85%，刷新行业 SOTA。该模型基于 35B 总参数 / 10B 活跃参数的 MoE 架构，权重以 Apache 2.0 许可在 Hugging Face 开源。

**技术/产业意义：**
计算机使用（Computer Use）是 2025-2026 年 AI Agent 最热门的方向之一。Holo3 以仅 10B 活跃参数超越了 GPT-5.4 和 Opus 4.6 等大规模闭源模型的成绩，且成本仅为后者的一小部分。这证明了专业化训练（agentic learning flywheel）可以在 Agent 任务上以小模型击败通用大模型。

**深度分析：**
- **Agentic Learning Flywheel**：合成导航数据 → 域外增强 → 强化学习精炼的闭环训练管道
- **Synthetic Environment Factory**：自动构建企业场景模拟环境，486 个多步骤任务覆盖电商/企业软件/协作/多应用
- **多应用任务示例**：从 PDF 读取设备价格 → 交叉比对每个员工预算 → 自动发送个性化审批/拒绝邮件——需要跨应用推理和持续状态保持
- **模型基于 Qwen3.5 基座**，训练后大幅超越基座模型，体现专业化训练的价值
- **开源 + 免费推理 API**：权重在 HF 开放，并提供免费推理层

**评论观察：**
- 🟢 支持：10B 活跃参数超越闭源巨模型，是 Agent 专业化训练路线的强有力证据。开源对企业自动化场景极具吸引力。
- 🔴 质疑：OSWorld 基准与真实企业环境仍有差距；该模型在处理全新、未见过的企业软件时的泛化能力待验证。

**信源：**
https://huggingface.co/blog/Hcompany/holo3
https://huggingface.co/Hcompany/Holo3-35B-A3B

**关联行动：** 跟踪 Holo3 在真实企业场景中的部署案例；关注 HCompany 下一阶段「Adaptive Agency」（自主学习新软件）的进展。

---

### EU-3. [A] Mistral AI 发布 Voxtral TTS：开放权重文本转语音前沿模型

**概述：**
3 月 23 日，巴黎 AI 公司 Mistral AI 发布 Voxtral TTS，一款前沿级开放权重文本转语音模型。该模型速度快、可即时适配新声音、生成近乎真人的语音，专为 voice agent 场景设计。

**技术/产业意义：**
Voxtral TTS 标志着 Mistral 从纯文本/代码模型向多模态能力扩展。开放权重的 TTS 模型在商业 Voice Agent 领域极为稀缺——此前高质量 TTS 基本由 ElevenLabs、OpenAI、Google 等闭源方案垄断。Mistral 的开源策略可能改变 Voice AI 的竞争格局。

**深度分析：**
- 支持即时声音适配（零样本或少样本声音克隆），无需针对特定说话人微调
- 面向 Voice Agent 优化，强调低延迟和流式生成
- 这是 Mistral 自 Mixtral/Mistral Large/Codestral/Pixtral 后，首次进入语音合成领域
- 与 ElevenLabs（闭源 API）、OpenAI TTS（闭源 API）、Bark（Suno 开源）形成差异化竞争

**评论观察：**
- 🟢 支持：开放权重 TTS 填补了开源语音合成的高质量空白，对构建隐私优先的 Voice Agent 极具价值。
- 🔴 质疑：具体性能指标和 benchmark 数据尚未详细公布；声音克隆的伦理和法律风险需要关注。

**信源：**
https://mistral.ai/news/

**关联行动：** 关注 Voxtral TTS 的完整技术报告和 benchmark 发布；评估其在 Lighthouse 语音播报场景中的可用性。

---

### EU-4. [B] Hugging Face TRL v1.0 正式发布：后训练库从项目升级为基础设施

**概述：**
3 月 31 日，Hugging Face 发布 TRL（Transformer Reinforcement Learning）v1.0 正式版。这标志着从实验性研究代码到稳定基础设施库的转变。TRL 现已实现 75+ 种后训练方法，月下载量 300 万次，Unsloth 和 Axolotl 等主流项目依赖其 API。

**技术/产业意义：**
TRL 已成为 LLM 后训练的事实标准库，覆盖 SFT → DPO → GRPO → PPO 全流程。v1.0 引入语义版本控制和「稳定/实验」双轨机制，解决了快速演进的后训练领域与下游项目稳定性需求之间的核心矛盾。

**深度分析：**
- **双轨设计**：稳定层（SFT/DPO/GRPO/RLOO/Reward Modeling）遵循语义版本控制；实验层快速跟进新方法
- **架构哲学**：刻意限制抽象层次，偏好显式实现和代码复制而非继承层次，因为后训练领域的「本质」每隔几个月就会被颠覆（PPO → DPO → GRPO）
- **关键教训**：Judge 抽象过早建立了统一接口却从未被广泛使用——「先有具体实现，再看是否需要抽象」
- 月下载 300 万次，6 年历史首次承诺 API 稳定性

**评论观察：**
- 🟢 支持：后训练领域终于有了一个承诺稳定性的基础库。「混沌适应性设计」理念值得所有快速演进领域的库借鉴。
- 🔴 质疑：75+ 方法的维护负担巨大；实验层到稳定层的晋升标准可能过于主观。

**信源：**
https://huggingface.co/blog/trl-v1

**关联行动：** 在 Lighthouse 相关的模型微调工作中优先使用 TRL v1.0 稳定 API。

---

### EU-5. [B] TII 发布 Falcon Perception：0.6B 参数的开放词汇视觉感知模型 + Falcon OCR

**概述：**
4 月 1 日，阿联酋技术创新研究所（TII）发布 Falcon Perception，一个仅 0.6B 参数的早期融合 Transformer 视觉感知模型，支持开放词汇的目标检测和分割。同时发布 Falcon OCR（0.3B），在 olmOCR 基准上达到 80.3 分、OmniDocBench 达 88.6 分，且吞吐量最高。

**技术/产业意义：**
Falcon Perception 在 SA-Co 基准上以 68.0 Macro-F1 超越 SAM 3（62.3），这对一个仅 0.6B 参数的模型极为出色。其「Chain-of-Perception」方法（坐标→尺寸→分割）为密集视觉预测提供了高效的序列化方案。

**深度分析：**
- **单一 Transformer 骨干**：混合注意力掩码使同一模型对图像 token 表现为双向视觉编码器，对文本 token 表现为因果解码器
- **Chain-of-Perception**：先预测中心坐标 → 再预测尺寸 → 最后用单个嵌入生成分割掩码——避免逐像素自回归的高成本
- **PBench 基准**：分离 OCR/属性/空间/关系等能力维度的诊断性评估
- **训练数据**：5400 万图像、1.95 亿正样本表达、4.88 亿硬负样本
- 多教师蒸馏（DINOv3 + SigLIP2）提供强视觉初始化

**评论观察：**
- 🟢 支持：0.6B 参数超越 SAM 3，证明小模型+精准训练的威力。开源的高效视觉感知模型对边缘部署极有价值。
- 🔴 质疑：存在性校准（Presence Calibration MCC 0.64 vs SAM 3 的 0.82）仍是主要短板。

**信源：**
https://huggingface.co/blog/tiiuae/falcon-perception
https://arxiv.org/abs/2603.27365

**关联行动：** 关注 Falcon Perception 在文档理解和工业视觉检测场景中的应用案例。

---

### EU-6. [B] Penguin Random House 在慕尼黑起诉 OpenAI：ChatGPT 复制德国儿童书系列

**概述：**
据 The Guardian 3 月 31 日报道，企鹅兰登书屋上周在慕尼黑提起版权诉讼，指控 ChatGPT 在接到「能写一本关于椰子小龙在火星上的儿童书吗」的提示后，生成了与原作家 Ingo Siegner 的《Coconut the Dragon》系列「几乎无法区分」的文本和图像，包括封面、故事内容、后封面简介，甚至包含如何提交到自出版平台的说明。

**技术/产业意义：**
这是欧洲最大出版集团首次在欧盟境内对 OpenAI 发起版权侵权诉讼。案件在慕尼黑（德国法院对 IP 保护态度严格）提起，可能成为 EU 范围内 AI 版权判例的风向标。与美国已有的数十起类似诉讼不同，此案直接挑战 AI 生成特定角色和视觉风格的能力。

**深度分析：**
- ChatGPT 不仅复制了故事内容，还还原了 Siegner 独特的橙色小龙插画风格和两个配角
- 这暗示训练数据中包含了该书系列的大量内容
- EU 版权法对训练数据的「正当使用」界限比美国更严格
- Penguin Random House 是全球最大出版集团，此案的判决将对整个 AI 训练数据合规产生连锁效应

**评论观察：**
- 🟢 支持：出版行业终于在 EU 发起有力法律行动，这可能推动更明确的 AI 训练数据合规框架。
- 🔴 质疑：如何界定「生成内容与原作相似」的法律标准仍不明确；训练数据的来源追溯在技术上极具挑战。

**信源：**
https://www.theguardian.com/technology/2026/mar/31/penguin-sue-openai-chatgpt-german-childrens-book-kokosnuss

**关联行动：** 跟踪慕尼黑法院的裁决进展，关注其对 EU AI Act 版权条款执行的影响。

---

### EU-7. [B] Perplexity 被控将用户对话分享给 Meta 和 Google，隐私诉讼引发信任危机

**概述：**
4 月 3 日，Ars Technica 报道，Perplexity 面临一项拟议集体诉讼，指控其在 AI 搜索引擎中嵌入了 Meta 和 Google 的跟踪器，「实际上在用户电脑上植入了监听器」。诉讼称即使付费用户开启「隐身模式」，对话内容仍被与 Meta 和 Google 共享，同时附带用户邮箱和其他可识别身份的标识符。

**技术/产业意义：**
Perplexity 一直以隐私友好和透明作为差异化卖点。此次诉讼直接打击其核心品牌叙事。如果指控属实，意味着 AI 搜索引擎的隐私保护远不如用户预期——即使是声称保护隐私的功能也可能是「摆设」。

**深度分析：**
- 诉讼核心指控：Perplexity 隐身模式「什么都没做」，付费用户的对话 + 邮箱 + 标识符仍被发送给第三方
- 嵌入的跟踪器来自 Meta Pixel 和 Google Analytics——这在 AI 产品中极不常见
- 这与 Perplexity 此前面临的内容抄袭指控（从 Forbes 等媒体直接复制内容）形成了「内忧外患」的局面
- 欧盟 GDPR 框架下，这种行为可能面临高额罚款

**评论观察：**
- 🟢 支持：AI 产品的隐私实践需要更多法律审查。此案可能推动行业建立更透明的数据处理标准。
- 🔴 质疑：诉讼处于早期阶段，具体指控的技术细节仍需验证。

**信源：**
https://arstechnica.com/tech-policy/2026/04/perplexitys-incognito-mode-is-a-sham-lawsuit-says/

**关联行动：** 关注诉讼进展及 Perplexity 的官方回应。

---

## 🌐 学术/硬件

### GA-1. [A] ⭐ OpenAI 完成 $1220 亿融资，估值 $8520 亿，ChatGPT 周活用户达 9 亿

**概述：**
3 月 31 日，OpenAI 官宣完成最新一轮 $1220 亿融资，投后估值 $8520 亿，由 Amazon、NVIDIA、SoftBank 领投，Microsoft 跟投，另有 a16z、D.E. Shaw、MGX、TPG、T. Rowe Price、BlackRock、Sequoia 等数十家机构参与。首次向个人投资者开放，筹集超 $30 亿。ChatGPT 现有 9 亿+ 周活用户、5000 万+ 订阅用户，月营收 $20 亿。

**技术/产业意义：**
这是人类历史上规模最大的私募融资轮。$8520 亿估值意味着 OpenAI 已超越绝大多数上市科技公司市值，仅次于 Apple、NVIDIA、Microsoft、Alphabet。月营收 $20 亿（年化 $240 亿）意味着其增长速度是 Alphabet 和 Meta 同期的 4 倍。

**深度分析：**
- **收入结构**：企业业务占 40%+，预计 2026 年底与消费者业务持平
- **关键数据**：
  - ChatGPT 月 Web 访问量和移动端会话是第二大 AI 应用的 6 倍
  - AI 使用时长是第二大 AI 应用的 4 倍，是所有其他 AI 应用总和的 4 倍
  - 搜索使用量一年内近乎翻三倍
  - 广告试点 6 周内 ARR 超 $1 亿
  - API 每分钟处理 150 亿+ token
  - Codex 周活 200 万+，三个月增长 5 倍，月环比增长 70%+
- **算力战略**：多元化基础设施布局——云（Microsoft/Oracle/AWS/CoreWeave/Google Cloud）、芯片（NVIDIA/AMD/AWS Trainium/Cerebras + 自研芯片联合 Broadcom）、数据中心（Oracle/SBE/SoftBank）
- **「AI 超级应用」战略**：统一 ChatGPT + Codex + 浏览 + Agent 为单一平台
- **信贷额度**：将循环信贷额度扩大至约 $47 亿（未使用），由 JPMorgan、Citi、Goldman Sachs 等 11 家银行支持
- **ETF 纳入**：将被纳入 ARK Invest 管理的多只 ETF，上市前即进入二级市场

**评论观察：**
- 🟢 支持：这一轮融资从根本上改变了 AI 行业的资本格局。OpenAI 正在成为 AI 时代的核心基础设施，其飞轮效应（算力→模型→产品→用户→收入→算力）已经证明可运转。
- 🔴 质疑：$8520 亿估值对应月营收 $20 亿，市销率超 35 倍，即使按高速增长也需要多年才能证明估值合理。Sora 被砍、组织架构频繁调整显示内部执行风险。竞争加剧（Gemini、Claude、DeepSeek、Qwen）可能侵蚀长期护城河。

**信源：**
https://openai.com/index/accelerating-the-next-phase-ai/
https://www.theverge.com/ai-artificial-intelligence/904727/openai-chatgpt-investment

**关联行动：** 密切关注 OpenAI IPO 进展及其对 AI 行业估值基准的影响。跟踪 Codex 和广告业务的增长轨迹。

---

### GA-2. [A] ⭐ Musk 要求 SpaceX IPO 参与方强制订阅 Grok，以人为方式推高用户数

**概述：**
4 月 3 日，据纽约时报报道，Elon Musk 要求参与 SpaceX IPO 的「银行、律所、审计师及其他顾问」必须购买 Grok 订阅。Grok 目前已并入 SpaceX 旗下（此前 xAI 与 SpaceX、X 合并）。

**技术/产业意义：**
这是一种极其罕见的商业行为——利用 IPO 地位的议价权力强制合作方采购自家 AI 产品。这表明 Grok 在自然增长方面远落后于 ChatGPT（周活 9 亿 vs Grok 的未公开但明显低得多的数字），Musk 需要通过非市场手段提升数据。

**深度分析：**
- SpaceX IPO 涉及数十家顶级投行和律所，每家购买团队订阅可能带来数千至数万个账号
- 这种做法是否构成反竞争行为或利益冲突，可能引发监管审查
- Grok 目前在 AI 产品市场份额极低，与 ChatGPT、Gemini、Claude 差距明显
- 此前 Musk 将 xAI 并入 SpaceX 和 X 已引发公司治理质疑

**评论观察：**
- 🟢 支持：（几乎没有正面评价——The Verge 编辑以讽刺口吻报道「That's one way to juice Grok's numbers」）
- 🔴 质疑：强制订阅既无法证明产品价值也无法建立真实用户基础；可能面临反垄断审查；暴露了 Grok 自身竞争力不足的根本问题。

**信源：**
https://www.reuters.com/business/finance/musk-asks-spacex-ipo-banks-buy-grok-ai-subscriptions-nyt-reports-2026-04-03/

**关联行动：** 关注此事件是否引发监管机构关注或合作方的公开反弹。

---

### GA-3. [B] IBM 发布 Granite 4.0 3B Vision：企业文档理解专用小模型

**概述：**
3 月 31 日，IBM 发布 Granite 4.0 3B Vision，一个面向企业文档理解的紧凑型视觉语言模型。作为 LoRA 适配器部署在 Granite 4.0 Micro 基座上，专注于表格提取、图表理解和语义键值对抽取三大场景。

**技术/产业意义：**
在一个被通用大模型主导的市场中，IBM 选择了「专精小模型」路线。Granite 4.0 3B Vision 在 PubTables-v2（92.1 TEDS）、TableVQA（88.1 TEDS）等文档理解 benchmark 上超越了更大的竞品，证明了垂直优化在企业场景中的价值。

**深度分析：**
- **ChartNet 数据集**（CVPR 2026 论文）：170 万多样化图表样本，覆盖 24 种图表类型和 6 种绘图库，每个样本包含代码+图像+数据表+摘要+QA 五重对齐
- **DeepStack 视觉注入**：抽象视觉特征路由到早期层（语义理解），高分辨率空间特征路由到后期层（细节保持）——双通道解决了单点注入的信息瓶颈
- **模块化设计**：LoRA 适配器方案意味着同一部署可同时服务多模态和纯文本工作负载
- 在 VAREX 基准上零样本达到 85.5% 精确匹配（美国政府表单）

**评论观察：**
- 🟢 支持：3B 参数级别的文档理解性能令人印象深刻。LoRA 模块化设计极大降低了企业部署门槛。
- 🔴 质疑：仅覆盖文档理解场景，通用性有限；IBM AI 产品在开发者社区的关注度持续偏低。

**信源：**
https://huggingface.co/blog/ibm-granite/granite-4-vision

**关联行动：** 评估 Granite 4.0 3B Vision + Docling 管道在 Lighthouse 文档处理中的适用性。

---

### GA-4. [B] Omni-SimpleMem：自主研究流水线发现终身多模态 Agent 记忆框架

**概述：**
4 月 1 日（arXiv 2604.01007），北卡罗来纳大学研究团队发布 Omni-SimpleMem，通过自主研究流水线（autonomous research pipeline）自动发现了一个统一的多模态记忆框架。系统从朴素基线（F1=0.117）出发，自主执行约 50 次实验，无人干预，最终在 LoCoMo 上将 F1 提升 411%（至 0.598），在 Mem-Gallery 上提升 214%（至 0.797）。

**技术/产业意义：**
AI Agent 的长期记忆是从「工具」进化为「伙伴」的关键瓶颈（与中国区 CN-9 腾讯「龙虾」记忆服务遥相呼应）。更值得注意的是方法论突破：自主研究流水线证明 bug 修复（+175%）、架构变更（+44%）和 prompt 工程（+188%）的贡献远超传统 AutoML 的超参数调优——这是一种新的 AI 系统优化范式。

**深度分析：**
- **六类发现**：bug 修复 > prompt 工程 > 架构修改 > 数据管道优化 > 超参数调优 > 其他
- **核心洞察**：多模态记忆的设计空间太大且互相关联，人工探索和传统 AutoML 都不够用
- **四个使自主研究适用的属性**：（1）快速迭代周期（2）可度量反馈（3）复合改进空间（4）组件间强耦合
- HF Papers 18 upvotes

**评论观察：**
- 🟢 支持：「自主研究」范式可能是未来 AI 系统优化的标配。bug 修复贡献超过超参数调优的发现，对 AutoML 社区是一记重要提醒。
- 🔴 质疑：50 次实验的搜索空间是否足够？在更复杂的系统中可能面临组合爆炸问题。

**信源：**
https://arxiv.org/abs/2604.01007
https://github.com/aiming-lab/SimpleMem

**关联行动：** 研究 Omni-SimpleMem 的记忆架构设计，评估其对 OpenClaw/Lighthouse 自身记忆系统的借鉴价值。

---

### GA-5. [B] Netflix 发布 VOID：物理一致的视频对象移除框架

**概述：**
4 月 1 日（arXiv 2604.02296），Netflix 研究团队发布 VOID（Video Object and Interaction Deletion），一个视频对象移除框架，能在移除对象后生成物理上合理的场景变化。例如，移除一个碰撞中的球体后，VOID 会修正下游物理交互，而非简单填充背景。HF Papers 19 upvotes，GitHub 406 stars。

**技术/产业意义：**
现有视频对象移除方法（如 ProPainter）擅长填充「背后的」内容和修正阴影/反射等外观瑕疵，但无法处理被移除对象与场景中其他对象的物理交互。VOID 首次将因果推理引入视频编辑——这是从「修图」到「理解世界物理规则」的质的飞跃。

**深度分析：**
- **技术路线**：使用 VLM 识别受移除对象影响的场景区域 → 视频扩散模型生成物理一致的反事实结果
- **训练数据**：使用 Kubric 和 HUMOTO 生成配对的反事实对象移除数据集（移除对象需改变下游物理交互）
- **核心创新**：将「编辑」从外观级别提升到因果推理级别
- 开源代码在 GitHub Netflix/void-model

**评论观察：**
- 🟢 支持：因果推理 + 视频编辑的结合方向极具前景。Netflix 的视频编辑技术投入可能改变后期制作工作流。
- 🔴 质疑：反事实推理的准确性在复杂场景中仍有限；实时处理性能未提及。

**信源：**
https://arxiv.org/abs/2604.02296
https://github.com/Netflix/void-model

**关联行动：** 关注 VOID 在影视后期和内容审核场景中的实际应用案例。

---

### GA-6. [B] DeepMind 发布 AGI 认知框架论文：测量 AGI 进展的系统方法

**概述：**
2026 年 3 月，Google DeepMind 在博客上发布「Measuring progress toward AGI: A cognitive framework」研究，提出了一个基于认知科学的框架来系统化衡量 AGI 进展。这是 DeepMind 自 2023 年 AGI 分级论文后，又一次对 AGI 定义和测量方法的正式学术表态。

**技术/产业意义：**
随着 GPT-5.4、Gemini 3.1 Pro、Claude Opus 等模型能力持续飙升，「我们离 AGI 还有多远」成为行业最热门的问题。DeepMind 的认知框架试图建立客观、可量化的评估标准，避免行业陷入「AGI 定义之争」的语义泥潭。

**深度分析：**
- 此前 DeepMind 2023 年的论文提出了 AGI 的五级分类（Emerging → Competent → Expert → Virtuoso → Superhuman）
- 新框架引入认知科学维度，可能涵盖感知、推理、规划、学习、创造性等多维能力评估
- 这与 Anthropic 的「Responsible Scaling Policy」和 OpenAI 的「Preparedness Framework」形成三足鼎立

**评论观察：**
- 🟢 支持：AI 行业迫切需要一个共识性的 AGI 进展衡量框架，DeepMind 的学术声誉为此提供了权威性。
- 🔴 质疑：认知框架可能过于学术化而缺乏实际可操作性；不同公司对 AGI 的定义仍可能各执一词。

**信源：**
https://deepmind.google/blog/

**关联行动：** 待论文全文发布后进行深度解读。

---

### GA-7. [B] Oracle 大裁员数千人，AI 基础设施投入与人员优化并行

**概述：**
据 CNBC 报道，Oracle 已开始通知「数千名」员工裁员。Oracle 截至 2025 年 5 月有 16.2 万名员工，同时计划今年为 AI 基础设施建设筹集 $450-500 亿。

**技术/产业意义：**
这是 AI 基础设施「热投资、冷裁员」并行的典型案例。Oracle 作为 OpenAI 的重要云合作伙伴（在 OpenAI 最新融资公告中被列为关键基础设施伙伴），一边大规模投建 AI 数据中心，一边裁减非 AI 岗位——资源正在向 AI 基础设施快速倾斜。

**深度分析：**
- Oracle 在 OpenAI 基础设施生态中地位重要：云服务和数据中心合作
- $450-500 亿的 AI 基础设施投资规模仅次于 Microsoft、Google、Amazon
- 裁员可能集中在传统数据库/ERP 业务线
- 与 Microsoft（裁员数千）、Google（部门重组）等形成同步趋势

**评论观察：**
- 🟢 支持：企业资源向 AI 重新配置是必然趋势，Oracle 的 AI 基础设施投资前景被市场看好。
- 🔴 质疑：$500 亿投资在回报不确定的情况下裁员，对被裁员工而言是残酷的现实。

**信源：**
https://www.cnbc.com/2026/03/31/oracle-layoffs-ai-spending.html

**关联行动：** 关注 Oracle 在 AI 基础设施领域的后续建设进展及对 OpenAI 服务的影响。

---

### GA-8. [B] Mercor（AI 训练数据公司）遭安全泄露，Meta 暂停合作，OpenAI 调查中

**概述：**
4 月 3 日，据 Wired 报道，AI 训练数据公司 Mercor 遭遇安全泄露事件。Meta 已暂停与 Mercor 的合作，OpenAI 正在调查该安全事件。Mercor 是 AI 行业重要的人工标注和训练数据供应商，此前 The Verge 曾对其进行深度报道。

**技术/产业意义：**
AI 训练数据供应链的安全性一直是行业隐忧。Mercor 的客户包括 Meta 和 OpenAI 等头部公司，安全泄露可能暴露专有训练数据、标注指南、模型训练细节等「AI 行业机密」。这凸显了 AI 供应链第三方风险管理的紧迫性。

**深度分析：**
- Mercor 兼具 AI 标注、人才匹配和培训功能，泄露范围可能涉及多个维度
- Meta 立即暂停合作表明数据泄露可能涉及敏感内容
- AI 训练数据供应链安全此前较少受到关注，此事件可能改变行业实践

**评论观察：**
- 🟢 支持：此事件可能推动 AI 训练数据供应链的安全标准建立。
- 🔴 质疑：泄露具体范围和影响尚不明确。

**信源：**
https://www.wired.com/story/meta-pauses-work-with-mercor-after-data-breach-puts-ai-industry-secrets-at-risk/

**关联行动：** 关注泄露事件的详细调查结果，以及对 AI 训练数据行业安全标准的后续影响。

---

### GA-9. [B] HF Papers 热门论文精选（2026-04-03）

**概述：**
Hugging Face Papers 今日（4 月 3 日）热门论文列表中，除上述已收录的论文外，还有以下值得关注的工作：

**NearID: Identity Representation Learning via Near-identity Distractors**（23 upvotes）
- 来自 KAUST 生成式 AI 卓越中心
- 提出使用「近身份干扰物」改善身份特征学习，SSR 从 30.7% 提升至 99.2%
- 引入 NearID 数据集（19K 身份，316K 匹配上下文干扰物）
- 对个性化生成和图像编辑评估方法有重要改进

**Generative World Renderer**（2604.02329）
- 从 AAA 游戏中提取大规模动态数据集用于生成式逆渲染和前向渲染
- 包含高分辨率同步 RGB 和 G-buffer 数据 + VLM 评估方法

**VibeVoice Technical Report**（热门趋势 #1）
- 使用 next-token 扩散和高效连续语音 tokenizer 合成长篇多说话人语音
- 在保真度和效率上表现突出

**评论观察：**
本期 HF Papers 多模态方向密度极高——视觉感知、视频编辑、语音合成、Agent 记忆同时涌现，反映了领域从「纯文本」向「全模态 Agent」的快速转型。

**信源：**
https://huggingface.co/papers
https://huggingface.co/papers/trending

**关联行动：** 重点关注 NearID 在个性化生成评估中的标准化潜力。

---

### GA-10. [B] ⭐ 待深度解读 — Sebastian Raschka 新文《Components of A Coding Agent》：Coding Agent 竞争的关键不是模型，而是 Harness

**概述：**
4 月 4 日，Sebastian Raschka 在其 Newsletter 发布长文《Components of A Coding Agent》，系统拆解了 coding agent（如 Claude Code、Codex CLI）区别于普通 chat UI 的 6 个核心构件：(1) Repo Context——将整个仓库结构、依赖关系注入上下文；(2) Prompt/Cache Reuse——通过 prompt caching 和 system prompt 复用降低延迟与成本；(3) Structured Tools + Validation/Permission——为模型提供有类型约束和权限管控的工具调用，而非自由生成 shell 命令；(4) Context Reduction——主动裁剪上下文以对抗 token 膨胀；(5) Memory/Transcripts/Resumption——跨会话记忆、对话恢复、计划持久化；(6) Delegation/Bounded Subagents——将复杂任务拆分委派给受限子 agent，控制上下文泄漏和故障半径。Raschka 配文开源了一个教学用 mini coding agent 实现。

**技术/产业意义：**
Raschka 的核心论点是：同一个底层模型在 chat UI 和 coding harness 中的体感能力差异巨大，而这些差异绝大部分来自系统层（harness）而非模型本身。他明确点名 Claude Code 和 Codex，指出它们的优势不仅仅是接入了更强的模型，更在于工程化的 harness 设计。这篇文章实际上把 2026 年 coding agent 竞争的分析框架，从「谁家模型更强」转向了「谁家 workflow / harness 更强」。

**深度分析：**
- 6 个构件并非新概念，但 Raschka 首次将其作为一个完整框架系统化阐述，为评估和对比 coding agent 提供了结构化视角
- 他强调 context reduction 和 bounded subagents 是当前被低估的两个维度——前者决定了 agent 在长任务中的可靠性，后者决定了复杂任务的可分解性
- 配套的 mini-coding-agent 仓库实现了核心循环，适合作为教学和二次开发的起点
- 对行业的隐含判断：纯模型能力的边际提升正在递减，harness 工程将成为下一阶段差异化竞争的主战场

**评论观察：**
- 🟢 支持：框架化拆解填补了「为什么同模型在不同工具里体验差异巨大」这一常见困惑的理论空白；开源教学实现降低了入门门槛，有助于更多团队构建自己的 coding agent。
- 🔴 质疑：6 个构件的划分可能过度简化——实际产品中 prompt engineering、eval pipeline、安全沙箱等同样关键但未被充分讨论；「harness 比模型更重要」的论断可能低估了下一代推理模型带来的范式变化。

**信源：**
https://magazine.sebastianraschka.com/p/components-of-a-coding-agent
https://github.com/rasbt/mini-coding-agent

**关联行动：** 深度解读该文，对照 Claude Code / Codex / Cursor 等产品验证 6 构件框架的覆盖度；跟踪 mini-coding-agent 仓库的社区采纳情况。

---

## 🇺🇸 北美区

### NA-1. [A] ⭐ Microsoft 开源 Agent Framework，试图把企业 Agent 编排层收回一体化平台

**概述：**
Hacker News newest 与 GitHub Trending 同时抬升了 Microsoft 新开源的 `agent-framework` 仓库。项目定位非常明确：面向 Python 和 .NET 的多语言 Agent 框架，覆盖从单 Agent 到多 Agent workflow 的构建、编排与部署。

**技术/产业意义：**
这不是又一个玩具级 Agent demo，而是 Microsoft 试图把当下分裂在 AutoGen、Semantic Kernel、LangGraph、各类工作流引擎之间的企业 Agent 栈，重新收拢成自家一套“默认答案”。对 Azure Foundry、OpenAI on Azure 和企业 Copilot 生态，这个动作很关键。

**深度分析：**
- README 明确给出从 **Semantic Kernel** 和 **AutoGen** 迁移指南，信号非常直接：不是并存，而是想成为上层统一框架
- 核心能力包括 **graph-based workflows、streaming、checkpointing、human-in-the-loop、time-travel、OpenTelemetry observability**
- 同时支持 Python / .NET，符合 Microsoft 在企业开发栈上的双线布局
- 对企业客户而言，真正稀缺的不是“能不能调模型”，而是 **状态管理、可观测性、恢复能力、人工接管点**；这个仓库正好围着这些痛点来

**评论观察：**
- 🟢 支持：Microsoft 正在把 Agent 从“prompt 工程玩具”推进到“可治理的业务流程系统”，这比再发一个小模型更有平台意义。
- 🔴 质疑：Agent 框架市场已经很挤，Microsoft 能否真把开发者从 LangGraph / AutoGen 等迁回来，还取决于易用性和生态兼容性。

**信源：**
https://github.com/microsoft/agent-framework
https://news.ycombinator.com/newest

**关联行动：** 继续跟踪该项目 star 增速、Azure Foundry 的默认集成方式，以及是否出现大规模从 Semantic Kernel/AutoGen 迁移的案例。

---

### NA-2. [B] AWS Bedrock Guardrails 支持跨账号集中管理，企业级安全治理继续前移

**概述：**
AWS 宣布 Amazon Bedrock Guardrails 新增 **cross-account safeguards with centralized control and management**。这不是模型层 headline，而是企业大规模落地生成式 AI 时最关键、也最容易被忽略的“基础设施治理层”。

**技术/产业意义：**
大型企业通常有多个 AWS 账号、多个业务单元、多个 AI 团队。Guardrails 能否跨账号统一下发和审计，决定了 AI 安全策略到底是“口号”还是“真实可执行的控制面”。

**深度分析：**
- Guardrails 从“单项目能力”向“组织级控制平面”演进
- 这会降低大型企业在 Bedrock 上做统一合规治理的运维成本
- 对金融、医疗、跨国公司这类多 BU 组织特别关键，因为它们最怕每个团队各写一套过滤 / 拒答 / 审计逻辑
- 这类更新虽然不够性感，但往往直接决定平台能不能进生产

**评论观察：**
- 🟢 支持：AWS 很清楚企业 AI 的真实决策链——先问治理，再问模型。
- 🔴 质疑：Guardrails 的实际效果仍取决于策略表达能力和误杀率；“支持集中管理”不等于“安全问题解决”。

**信源：**
https://aws.amazon.com/blogs/aws/amazon-bedrock-guardrails-supports-cross-account-safeguards-with-centralized-control-and-management/

**关联行动：** 持续观察 Bedrock Guardrails 后续是否补齐更强的审计回放、策略版本化和跨区域治理能力。

---

### NA-3. [A] ⭐ Cerebras 与 AWS 联手做“拆分式推理”，Trainium 负责 prefill、WSE 负责 decode

**概述：**
Cerebras 宣布其 **CS-3 系统将进入 AWS 数据中心**，并通过 AWS Bedrock 提供服务。更重要的是，双方提出了一种明确的 **disaggregated inference** 架构：让 AWS Trainium 处理 prefill，让 Cerebras WSE 专注 decode，通过 EFA 互联配合。

**技术/产业意义：**
这是对“单芯片同时做 prefill + decode”的主流 GPU 推理范式的正面挑战。如果 agentic coding、RL rollout、长上下文应用持续推高 decode 压力，那么按工作负载分拆硬件角色，可能成为下一代推理基础设施的重要方向。

**深度分析：**
- Cerebras 明确把 agentic coding 当作典型场景，指出这类任务每次请求产生的 token 量远高于普通聊天
- 官方说法是：该方案可在相同硬件占地上提供 **5x 高速 token 容量**
- Trainium 被定位为 prefill 计算端，Cerebras WSE 负责 memory-bandwidth 极重的 decode 端，这是非常典型的“按瓶颈分工”
- 如果这条路线成立，推理基础设施竞争就不再只是 GPU vs GPU，而是 **系统级异构协同**

**评论观察：**
- 🟢 支持：这是近阶段少数真正有“架构层新意”的云推理动作，不只是堆更多卡。
- 🔴 质疑：官方宣称的吞吐优势要经过真实 Bedrock 生产流量验证；跨芯片协同也会引入新的复杂性和调度开销。

**信源：**
https://www.cerebras.ai/blog/cerebras-is-coming-to-aws

**关联行动：** 跟踪 Bedrock 正式上线后的吞吐、延迟、价格和适用模型范围，尤其关注 coding / long-context workload 的真实表现。

---

### NA-4. [B] Perplexity 的“隐身模式”遭遇隐私诉讼，AI 搜索产品开始碰到信任反噬

**概述：**
Ars Technica 报道，Perplexity 因其所谓 **incognito mode** 仍允许 Meta / Google tracker 工作而遭到诉讼，原告认为其“隐身”承诺与实际行为不符。

**技术/产业意义：**
AI 搜索本质上是高频收集用户意图的产品，一旦隐私承诺与技术实现脱节，影响的不只是合规风险，更是用户信任与企业采购意愿。对所有“AI 搜索 + 浏览器 + 助手”类产品，这都是警告信号。

**深度分析：**
- Perplexity 当前的竞争优势建立在“更快、更好、更懂搜索”之上，但用户对这类产品最敏感的恰恰是数据去向
- 在 AI 搜索赛道，广告、推荐、追踪和隐私承诺之间的张力会越来越大
- 一旦法律层面认定营销术语与实际实现不一致，产品的 brand damage 可能远超罚款本身

**评论观察：**
- 🟢 支持：这会倒逼 AI 搜索公司把隐私声明从文案层拉回工程层。
- 🔴 质疑：诉讼阶段的指控仍需法院和更多技术证据验证，不宜先下定论。

**信源：**
https://arstechnica.com/tech-policy/2026/04/perplexitys-incognito-mode-is-a-sham-lawsuit-says/

**关联行动：** 继续跟踪案件中的技术证据披露，以及 Perplexity 是否调整隐身模式实现或对外表述。

---

### NA-5. [B] Mercor 安全泄露冲击 AI 训练数据供应链，Meta 暂停合作、OpenAI 调查中

**概述：**
Wired 报道，AI 训练数据供应链公司 **Mercor** 出现安全事件，Meta 已暂停相关合作，OpenAI 也在调查影响范围。Mercor 处在 AI 行业很少被公开讨论、但极其关键的一层：训练数据、标注、劳务与流程协调。

**技术/产业意义：**
过去行业更关注模型权重泄露、API 被刷、GPU 短缺；这次事件把焦点拉回了 **第三方数据供应链安全**。随着前沿模型训练越来越依赖外部标注与操作流程，训练供应链本身已经成为 AI 公司新的脆弱面。

**深度分析：**
- 训练数据供应商往往接触到标注规范、数据样本、流程文档，甚至部分敏感任务上下文
- 一旦这类节点被攻破，泄露的可能不只是数据，而是训练方法和业务优先级等“行业机密”
- Meta 直接暂停合作，说明至少在内部风险评估上，这不是轻微事件
- 这类事件可能促使头部模型公司把更多高敏感训练流程重新收回内建体系

**评论观察：**
- 🟢 支持：AI 供应链安全终于被正视，这会推动行业补上第三方治理短板。
- 🔴 质疑：当前外部可见信息仍有限，泄露规模、客户影响和责任界面尚未完全清晰。

**信源：**
https://www.wired.com/story/meta-pauses-work-with-mercor-after-data-breach-puts-ai-industry-secrets-at-risk/

**关联行动：** 跟踪事件后续披露、受影响客户范围，以及头部实验室是否因此调整数据外包策略。

---

### NA-6. [B] Together AI 借 AI Native Conf 强化“研究直达生产”的 AI Native Cloud 叙事

**概述：**
Together AI 在 AI Native Conf 上集中发布多项研究与产品更新，包括 **FlashAttention-4、RL API、ThunderAgent、ATLAS-2、together.compile** 等，核心叙事不是“我们也能托管模型”，而是“我们能把 kernel / RL / inference research 直接变成生产能力”。

**技术/产业意义：**
这代表北美中型 AI 基础设施公司正在走出“提供 GPU 和推理 API”的同质化红海，转而用 **research-to-production speed** 做差异化。其叙事明显对标云厂商和通用推理平台。

**深度分析：**
- Together 在文中高频强调自己的研究 lineage：FlashAttention、ThunderKittens、编译优化、Turbo speculator 等
- 明确点名 Cursor、Decagon、Hedra 等客户，强调研究成果已经吃到生产流量
- 这种打法试图回答一个关键问题：为什么客户不直接上 hyperscaler？答案是“我们比云更懂 AI 工作负载本身”

**评论观察：**
- 🟢 支持：如果 Together 真能持续把 research transfer 到 production，它会是北美 AI infra 市场里少数有技术护城河的中型选手。
- 🔴 质疑：发布很多不等于商业转化成功，客户最终仍会看稳定性、价格和运维可控性。

**信源：**
https://www.together.ai/blog/ai-native-conf-research-and-product-announcements

**关联行动：** 继续观察 Together 在 RL、compile、speculative decoding 方向的产品化节奏，以及客户案例是否持续扩张。

---

### NA-7. [B] FlashAttention-4 针对 Blackwell 做硬件-软件协同优化，最高号称比 cuDNN 9.13 快 1.3 倍

**概述：**
Together AI 与合作研究者发布 **FlashAttention-4**，明确把优化目标锁定在 NVIDIA Blackwell 的“张量吞吐增速快于共享内存 / SFU / ALU”的不对称硬件演进趋势上。

**技术/产业意义：**
这说明 attention kernel 竞争已经进入新的阶段：不是“有没有更快 kernel”，而是“谁能跟着新一代芯片架构做联合设计”。未来模型效率提升越来越依赖底层 kernel 与硬件特性的共同演进。

**深度分析：**
- 官方给出的数字是 **B200 上 1605 TFLOPs/s、71% 利用率**
- 宣称相对 **cuDNN 9.13 提升最高 1.3x**，相对 Triton 提升最高 2.7x
- 关键方法包括：新的 pipeline、利用 FMA 近似 softmax exponential、用 TMEM 和 2-CTA MMA 缓解共享内存压力
- 对长上下文视频理解、coding agents、test-time compute scaling 等场景尤其关键

**评论观察：**
- 🟢 支持：这类工作比单纯 benchmark 更重要，因为它直接决定 Blackwell 一代的真实单位成本曲线。
- 🔴 质疑：领先幅度能否在更多模型、更多框架和生产环境里稳定复现，还需要更广泛验证。

**信源：**
https://www.together.ai/blog/flashattention-4

**关联行动：** 跟踪 FlashAttention-4 代码在主流训练/推理框架中的落地速度，以及 NVIDIA 官方栈的后续追赶。

---

### NA-8. [B] Mamba-3 把 SSM 重新拉回战场：这次不拼训练速度，直接拼推理经济性

**概述：**
Together AI 与学术合作者发布 **Mamba-3**，明确宣称这是一个以 **inference efficiency** 为第一目标设计的 state space model，而不是像 Mamba-2 那样优先优化训练效率。

**技术/产业意义：**
当 agentic coding、RL rollout、长上下文推理越来越耗 decode，架构竞争的关键指标正在从“预训练快不快”转向“生成时每 token 成本高不高”。Mamba-3 的定位切中了这个转向。

**深度分析：**
- 文中明确点名 Codex、Claude Code、OpenClaw 等 agent workflow 推高了 inference demand
- Mamba-3 在 1.5B 规模上宣称 prefill+decode latency 优于 Mamba-2、Gated DeltaNet，甚至优于 Llama-3.2-1B
- 核心路线是更 expressive 的 recurrence、complex-valued SSM 和 MIMO 设计
- 同时开源 Triton / TileLang / CuTe DSL kernels，说明其目标并非只做论文，而是争取工程采用

**评论观察：**
- 🟢 支持：这是少数明确围绕“推理经济性”重做架构的尝试，方向是对的。
- 🔴 质疑：SSM 是否真能在更大规模、更复杂任务上稳定威胁 Transformer 生态，还远没定局。

**信源：**
https://www.together.ai/blog/mamba-3

**关联行动：** 关注 Mamba-3 后续开源实现、复现结果，以及是否被真实推理平台纳入生产栈。

---

### NA-9. [B] Onyx 登上 GitHub Trending，开源买家开始偏好“LLM 应用层一体机”

**概述：**
`onyx-dot-app/onyx` 在 GitHub Trending 获得较强可见度。项目定位不是单点工具，而是一个完整的 **Open Source AI Platform**：RAG、web search、code execution、artifacts、MCP/actions、deep research、voice mode、企业协作与治理能力基本都打包进来。

**技术/产业意义：**
这反映出北美开源需求正在从“给我一个 model wrapper”升级为“给我一个能直接落地给团队用的 AI 工作台”。Onyx 代表的是 **application layer for LLMs** 这个产品层的成熟化。

**深度分析：**
- 同时支持自托管和专有模型提供商，明显是为了企业现实环境做兼容
- 提供 CE / EE 分层与 lite / standard 部署模式，说明其商业化和开源分工已经比较清晰
- MCP、web search、code execution、deep research 被打包到一起，方向上与“企业内部通用 AI 门户”高度一致

**评论观察：**
- 🟢 支持：这类项目更接近企业真实采购对象，而不是只给开发者 demo。
- 🔴 质疑：功能面越大，工程复杂度和稳定性压力越高，部署门槛也会抬升。

**信源：**
https://github.com/onyx-dot-app/onyx
https://github.com/trending

**关联行动：** 跟踪其 star 增速、企业部署案例，以及与 Danswer / Open WebUI / LibreChat 等开源阵营的分化。

---

### NA-10. [B] `oh-my-codex` 走红，编码 Agent 市场开始出现“工作流壳层”竞争

**概述：**
`Yeachan-Heo/oh-my-codex` 在 GitHub Trending 抬头。项目并不替代 Codex CLI，而是包装出一层更强的工作流壳：默认更强会话、hooks、agent teams、HUD、`.omx/` 状态目录，以及 `$deep-interview`、`$ralplan`、`$team`、`$ralph` 等固定流。

**技术/产业意义：**
这说明 coding agent 市场正在分裂成两层：底层是模型 / runtime，上层是 **workflow shell / orchestration UX**。谁掌握“默认工作流”，谁就有机会掌握用户心智，而不必自己训练模型。

**深度分析：**
- 项目强调“Codex does the actual agent work，OMX adds workflow/runtime/state”
- 这本质上是在抢占 agent 使用过程中的控制点：澄清、计划、并行执行、持久化状态
- 如果这类壳层大量出现，未来 Codex / Claude Code / Gemini CLI 之间的差异化可能会更多发生在上层体验而不是底层模型本身

**评论观察：**
- 🟢 支持：这类工具抓到了真实痛点——开发者需要的不是多一个模型名字，而是更稳定的执行流程。
- 🔴 质疑：壳层一多就会碎片化，学习成本和兼容性问题也会随之上升。

**信源：**
https://github.com/Yeachan-Heo/oh-my-codex
https://github.com/trending

**关联行动：** 继续观察 Codex 生态是否出现更多 workflow layer，以及 OpenAI 官方是否会把这部分能力内建。

---

## 📊 KOL 观点精选

本轮对 Tier 1/2/3 KOL 与官方账号做了广泛搜索尝试，但 **没有抓到足够可靠、可直接核验、且有新增信息密度的推文/线程**。主要问题有两类：

- **DuckDuckGo / X 反爬严重**：大量 `site:x.com` 检索直接落到 bot-detection 或低质量结果
- **不接受二手截图**：本轮拒绝把无法回到原帖的截图、转述或聚合站内容硬写进日报

因此本轮不单列“某 CEO 又发了一条推文”的低可信内容，而是把社区实时风向主要通过以下替代信号捕捉：

- **HN newest / top**：Microsoft Agent Framework、Anthropic 与第三方工具生态摩擦、Agent 工程实践讨论
- **GitHub Trending**：Onyx、oh-my-codex 等工具层项目抬头
- **官方工程博客**：Microsoft / AWS / Cerebras / Together 的一手工程与产品更新

> 结论：本轮 **KOL 面无可核验高价值新增推文**，选择空缺而不编造。

---

## 下期追踪问题

1. **Microsoft Agent Framework** 会不会迅速成为 Azure/Foundry 默认 Agent 编排层，并实质性替代 Semantic Kernel / AutoGen？
2. **AWS × Cerebras 拆分式推理** 上线后，是否真能在 Bedrock 生产负载中兑现吞吐 / 延迟 / 成本三方面优势？
3. **Perplexity 隐私诉讼 + Mercor 供应链泄露** 会不会推动企业在采购 AI 产品时，把隐私与第三方供应链审计提升到和模型能力同等的优先级？

---

## 📊 本轮（北美区+三大厂）自检清单

### 三大厂
- [x] Anthropic 4 个页面全部检查 ✅（含 docs 页面 direct HTTP fallback）
- [x] OpenAI 4 个页面全部检查 ✅（blog / index / research / changelog）
- [x] Google 4 个页面全部检查 ✅（blog.google / deepmind / developers / ai.google）
- [x] ai-news-seen.json 已读取并对比 ✅
- [x] 本轮结论明确写出“今日三大厂无同日新发布，但补录 1 篇历史遗漏官方文” ✅
- [x] 已将 Anthropic 历史遗漏官方文章与几条旧官方 URL 补齐到 ai-news-seen.json，避免后续轮次重复误报 ✅

### 北美公司与英文信源
- [x] Microsoft / AWS / Cerebras / Together / Perplexity / 数据供应链等核心北美主题已覆盖 ✅
- [x] HN 首页 + newest 已 fetch ✅
- [x] GitHub Trending + weekly 已 fetch ✅
- [x] The Verge / Ars / Wired / TechCrunch / MIT TR / IEEE / Reuters 等页已尝试覆盖 ✅
- [⚠️] Meta / Apple / xAI / Databricks / Scale 等部分页面提取质量一般，未发现足够强的新 A/B 级条目
- [⚠️] 其他 15+ 公司做了 direct fetch / 搜索尝试，但部分站点 404、抽取失败或信息陈旧

### KOL / X
- [x] Tier 1/2/3 与官方账号做了广泛搜索尝试 ✅
- [⚠️] DuckDuckGo 与 X 反爬严重，无法稳定拿到可核验原帖
- [x] 未把二手截图、转述或无法回源内容写入日报 ✅

### 质量检查
- [x] 所有新增条目均有原始链接 ✅
- [x] 新增条目均经过 A/B/C 分级，C 级已丢弃 ✅
- [x] daily.md 已补齐三大厂 / 北美区 / KOL / 下期追踪问题结构 ✅
- [x] index.md 已更新 ✅
- [x] 本轮不发飞书，只写入并 push GitHub ✅

**北美区采集总数：10 条（A 级 2 条 + B 级 8 条）**
**三大厂补录/新增官方文章：1 条（Anthropic engineering 历史遗漏）**
**今日全局总条目：37 条（不含 KOL 空缺说明）**
