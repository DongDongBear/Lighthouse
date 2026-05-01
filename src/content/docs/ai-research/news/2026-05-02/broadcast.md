---
title: "2026-05-02 飞书播报"
date: "2026-05-02"
---

动动早上好 ☀️ 今日 AI 圈的主线不是谁又刷了个 demo，而是大家都开始碰到更硬的那一层：高负载推理稳不稳、开放模型上生产贵不贵、Agent 真进企业后安不安全。

━━━━━━━━━━━━━━━━━━
⭐ 三大厂动态
━━━━━━━━━━━━━━━━━━

OpenAI、Anthropic、Google 今天官方窗口里没有新的合格硬更新，我又对照了今日简报和深度解读目录，确实不是漏看，是三家真的偏安静。
补一句邻近信号：Google 体系外溢还在加速，DeepMind alumni 过去 18 个月里已有 112 人创业或转入 stealth，这说明大厂实验室的影响力开始从“发论文”变成“批量孵公司”。

━━━━━━━━━━━━━━━━━━
🔥 今日热点
━━━━━━━━━━━━━━━━━━

1. Z.ai 公开 GLM-5 的《Scaling Pain》
Z.ai 这次把乱码、重复生成、生僻字符这些线上事故摊开讲，根因不是模型突然变笨，而是高负载下 KV Cache 状态一致性出了 bug。更重要的是，它把“Agent 时代真正难的是系统正确性”这件事讲透了。
我的判断：这条比很多新模型发布都值钱，行业接下来拼的不只是 benchmark，而是谁能在长上下文、高并发、工具调用场景下不抽风。

2. NVIDIA 推出 NemoClaw 参考实现
NVIDIA 借 OpenClaw 热度推出 NemoClaw，把 OpenClaw、OpenShell 安全运行时和 Nemotron 模型打成企业级长时 Agent 默认栈。它卖的已经不是“Agent 很酷”，而是“你敢不敢把 always-on Agent 放进公司系统里”。
我的判断：NVIDIA 在抢下一代 AI 基础设施的软件入口，真正的护城河不是 GPU 本身，而是安全默认值和运行时治理。

3. Nebius 砸 6.43 亿美元吃下 Eigen AI
Nebius 收购 Eigen AI，核心不是并购金额，而是把推理优化层直接并进 Token Factory，往“卖推理效率”升级。云厂商以后比的不只是卡多不多，而是同样的开源模型谁跑得更快、更省、更容易上线。
我的判断：这条很容易被当成普通 infra 并购略过，但其实是欧洲 AI 云从卖容量转向卖 inference economics 的明确信号。

4. Hugging Face / ClawHub 暴露 AI 供应链投毒风险
Acronis 发现攻击者利用 Hugging Face 仓库和 ClawHub 技能市场分发恶意载荷，ClawHub 一侧甚至扫出近 600 个恶意 skills。麻烦不在某个单点漏洞，而在 Agent 生态已经开始复刻 npm/PyPI 式供应链污染。
我的判断：2026 年 AI 安全的主战场会从 jailbreak 扩到 model/skill distribution，谁还把“下载个 skill 试试”当小事，迟早吃大亏。

5. DeepSeek V4 的冲击开始外溢到国产算力生态
最新跟进显示，除了昇腾，寒武纪、海光、摩尔线程、沐曦、昆仑芯等至少 8 家国产芯片线都在跟进适配 DeepSeek V4。焦点已经不只是 V4 便不便宜，而是谁能 Day 0/Day 1 接住它。
我的判断：这意味着中国模型竞争开始反过来重塑芯片和云的默认部署路径，谁接得快，谁就更像下一代基础设施。

6. 蚂蚁把“阿福”往 AI 医疗入口做深
阿福用户量过亿、月活 3000 万，已经不是试验性问答工具，而是在往咨询、管理、陪诊、医生助手这些更重流程延伸。国内 AI 医疗开始从“会不会答”转向“能不能把服务链条跑完”。
我的判断：这条方向是对的，但医疗 AI 最难的从来不是对话顺滑，而是责任边界和专业可靠性，规模越大这两个坑越深。

7. Moonix 用 14.9 克 AI 眼镜切可穿戴入口
这支杭州团队在硅谷发布 Moonix AI 眼镜，重点不是堆显示，而是把重量压到 14.9 克，先解决“你愿不愿意一整天戴着”。AI 眼镜赛道终于有人把注意力从炫技拉回长期佩戴。
我的判断：这个思路比一味堆料成熟得多，可穿戴 AI 的第一性原理不是参数，而是你能不能忘记自己在戴一台机器。

8. EU AI Act 谈判继续卡壳，但企业合规时钟没停
欧盟关于 Omnibus 的谈判还没谈拢，高风险系统可能延期，但在正式文本落地前，2026-08-02 这个现行节点依然有效。对欧洲公司来说，最烧钱的不是规则严，而是规则可能改、但现在还不能按改后的版本做预算。
我的判断：这会逼很多团队按最保守口径提前投入治理资源，欧洲 AI 的隐性成本不会小。

9. The Batch 把 GPT-5.5、Kimi K2.6 和数据中心电力问题放到一张桌上
这期 newsletter 最有价值的不是转述模型新闻，而是提醒大家：闭源旗舰继续拉高能力上限，开源阵营继续追，真正越来越卡脖子的却是电力、机房和碳排。模型战争表面在卷能力，底层已经开始卷能耗承受力。
我的判断：这类基础设施约束被严重低估了，未来不是每家都输在模型上，很多会先输在电。

━━━━━━━━━━━━━━━━━━
📖 今日深度解读
━━━━━━━━━━━━━━━━━━

今天深度拆解了 3 篇：

• Z.ai《Scaling Pain》— 这篇最值钱的地方不是讲 bug，而是把 Agent serving 的真正门槛从“模型强不强”推进到“状态对不对”
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-05-02/deep-zai-scaling-pain/

• NVIDIA NemoClaw — 为什么说 NVIDIA 想卖的不是 OpenClaw 热度，而是企业级长时 Agent 的安全默认栈
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-05-02/deep-nvidia-nemoclaw/

• Nebius × Eigen AI — 欧洲 AI 云为什么开始从卖 GPU 容量，转向卖推理效率
  全文 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-05-02/deep-nebius-eigen-token-factory/

━━━━━━━━━━━━━━━━━━
💡 今日推荐
━━━━━━━━━━━━━━━━━━

最值得深读：Z.ai《Scaling Pain》— 这不是一般事故复盘，而是少见地把高负载 Agent 推理里的系统正确性问题讲明白了，做推理平台的人都该看。
最值得动手试：今天如果你在做开源模型服务，建议立刻检查自己的 KV Cache、speculative decoding 指标和异常重试策略；别等用户看到乱码了，才发现问题根本不在模型。

━━━━━━━━━━━━━━━━━━

完整日报 → https://dongdongbear.github.io/Lighthouse/ai-research/news/2026-05-02/daily/
