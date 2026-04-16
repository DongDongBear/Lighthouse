---
title: "深度解读 | Chrome 里的 AI Mode：左右分屏、跨 Tab 追问、把\"切标签页\"这件事取消"
description: "Google 在 Chrome 桌面端上线 AI Mode 左右分屏：点击链接不离开搜索、结合页内与全网上下文追问；Plus 菜单把近期 Tab / 图片 / PDF 拉进搜索，Canvas 与图像生成同入口直达；今日起美国可用，后续外扩"
---

> 2026-04-17 · 深度解读 · 编辑：Lighthouse
>
> 原文：[blog.google/products-and-platforms/products/search/ai-mode-chrome/](https://blog.google/products-and-platforms/products/search/ai-mode-chrome/)
>
> 作者：Robby Stein（VP of Product, Google Search）、Mike Torres（VP of Product, Chrome）
>
> 发布时间：2026-04-16

---

## 速查卡

| 维度 | 内容 |
|------|------|
| **一句话总结** | Chrome 桌面端的 AI Mode 升级为"左右分屏"体验：点击链接不离开 AI Mode，可同时基于**当前页面 + 全网上下文**进行追问；跨 Tab / 图片 / PDF 通过 Plus 菜单注入搜索，Canvas 与图像生成同入口可达 |
| **大白话版** | 以前搜索要来回切 Tab，现在"搜索框"和"被你打开的那个网页"并排摆着，你边看边问，AI Mode 会同时读你手里这一页和全网的信息再答 |
| **覆盖形态** | **左右分屏仅限 Chrome 桌面**；**Plus 菜单 + 跨 Tab / 图片 / PDF 同时覆盖 Chrome 桌面与移动端** |
| **入口** | ① Chrome 桌面上的 AI Mode（分屏）；② 新标签页（New Tab page）搜索框里的新 Plus 菜单；③ AI Mode 内原有的 Plus 菜单 |
| **可投喂的上下文** | 近期 Tabs、图片、文件（PDF 为例）；支持**混用多 Tab、多图、多文件**组合输入 |
| **同入口的能力** | 只要看到新的 Plus 菜单，就能用上 AI Mode 里的 Canvas 与图像生成 |
| **发布状态** | 今天（2026-04-16）起在**美国**全量可用，后续向更多地区扩展 |
| **面向对象** | 频繁做"研究型搜索"的人群：购物决策、学术学习、体育 / 媒体深度消费、跨页信息整合 |
| **影响评级** | **A-** — 不是新模型，不是新能力，但把 Search × Chrome × AI 三条产品线的**前端接缝**焊死了；这是 Google 在"浏览器即 Agent 容器"竞争里最务实的一枪 |

---

## 文章背景

### 为什么这次更新值得单独解读

这一篇博客没有发布新模型，也没有发布新参数。但它在产品层做了一件过去一年里所有"AI + 浏览器"玩家都想做却做得磕磕绊绊的事：**让搜索不再是一个单独的目的地**。

原文开头抛出的痛点堪称浏览器时代的原罪——"Finding information online can often feel like a constant game of 'tab hopping.'"。用户要在 Search Tab、结果 Tab、另一结果 Tab 之间反复跳转；每次回到 Search 都要重新组织思路、保持注意力链条。Google 这次的解法是把"打开链接"和"继续追问"合并到**同一块视觉焦点区**里。

### "Tab hopping"的旧痛点拆解

在传统浏览器工作流中，完成一次深度搜索实际上要付出至少四项隐形成本：

1. **切换成本**：Cmd/Ctrl+Tab 的肌肉动作不贵，但**每一次切换都是一次注意力中断**。
2. **上下文成本**：Search 页的结果摘要和结果页的真实内容**互相看不到对方**，用户要在脑子里缝合。
3. **追问成本**：如果看到内容后想基于它再问一句，必须**回到 Search 重新构句**，而新构的句子往往丢掉了原先的搜索语境。
4. **重拾成本**：读完一个 Tab 再回去时，经常要 re-scan 原结果列表找下一条。

Google 的更新把这四项成本**集中在一个 UI 层压下来**——本文会拆解它是怎么做的。

### 发布时间线位置

这次更新处在 2026 年 4 月密集的"Agent × 浏览器"发布窗口：

- 2026-04-14：Google 博客宣布**Chrome 可以把提示词变成一键工具**（"Turn your best AI prompts into one-click tools in Chrome"）、**Google 桌面 App 在 Windows 上全球铺开**。
- 2026-04-15：Gemini 3.1 Flash TTS 发布。
- 2026-04-16：**本文**所说的 AI Mode in Chrome 上线；同日 Gemini App 上线个性化图像生成新能力。
- 2026-04-17（今天）：同周 OpenAI / Anthropic 也分别推出长时序 Agent 相关更新。

这不是孤立事件——Google 在**一整周**里把 Search、Chrome、Gemini、Workspace 的前端往同一个"AI 入口"上并拢，AI Mode in Chrome 是这次并拢最有结构性意义的一块积木。

---

## 完整内容还原

### 一、左右分屏：点击链接不离开 AI Mode

原文核心描述：

> Now, when you're using AI Mode on Chrome desktop, clicking a link opens the webpage side-by-side with AI Mode.

几个关键要素：

- **范围**：Chrome **桌面**。这是一项**桌面专属**的呈现方式，显然是为了利用大屏空间。
- **触发时机**：当你在 AI Mode 状态下**点击一个链接**。
- **布局**：被点击的网页与 AI Mode **并列展示**（side-by-side），而不是跳走。
- **维持的东西**：搜索的**上下文不中断**，你仍在原来的会话里。

原文把这件事的价值总结为："visit relevant websites, compare details and ask follow-up questions while still maintaining the context of your search."——它允许"访问网站"、"对比细节"、"继续追问"三件事同时发生在同一个视野里。

### 二、咖啡机示例：页内 + 全网上下文的合流

原文第一个演示场景被选得颇有代表性：

> you're shopping for a coffee maker that fits in your cozy apartment and can make lattes.

流程：

1. 去 Search 里用 AI Mode 描述需求（小公寓合身、能做拿铁）。
2. AI Mode 给出一批候选。
3. 看到中意的一款，**在零售商页面旁**打开它。
4. 在 AI Mode 侧问具体问题，例如：**"How easy is this to clean?"**
5. AI Mode "**using context from the page and from across the web**" 把答案回给你。

这一段非常关键的细节是**上下文来源的双路**：

- **页内上下文**（context from the page）——也就是你正在看的那个产品页；
- **全网上下文**（context from across the web）——AI Mode 原来的搜索能力。

也就是说，AI Mode **同时读你手头这一页 + 它自己能抓到的网**，在这两层上合并作答。这是本文里最值得技术读者重视的一条产品语义。

### 三、McLaren 示例：相关页面自然串联

原文第二个场景切到一个学习 / 兴趣场景：

> you want to learn about the different McLaren Racing teams and how their pit crews train.

关键动作：

- 你可以在不打断思路（"without breaking your flow"）的情况下去 McLaren 官方站等相关页面，
- **AI Mode ready to handle your follow-up questions in real-time**，
- 并且帮你"更好地消化每个站点"、"揭示下一个值得探索的页面"。

这个描述把 AI Mode 塑造成了一种**带你走路的搜索助手**：你不只是在看站点，还在被引导向下一个站点。它和"左右分屏 + 双路上下文"是同一件事的不同表述——**连续性**是这个设计的核心诉求。

原文还补了一条早期测试者反馈：

> Our early testers loved that they didn't have to constantly switch tabs to get help with a comprehensive article or a long video.

两个细节值得注意：

1. 明确提到了**长文章和长视频**两类消耗注意力最高的内容——这两类恰好是"tab hopping"损耗最大的场景。
2. "having both Search and the web side-by-side helped them stay focused on their tasks while exploring useful web pages." —— **保持专注**是 Google 刻意点出来的体验价值，而不是"更快"。

### 四、跨 Tab 搜索：Plus 菜单的新角色

这是本次更新里第二块结构性变动，覆盖范围比分屏广：

> On Chrome desktop or mobile, you can tap the new "plus" menu in the search box on the New Tab page (or the existing plus menu within AI Mode) to select recent tabs and add them to your search.

拆解几个关键点：

- **Plus 菜单双入口**：① 新标签页（New Tab page）搜索框的新 Plus 菜单；② AI Mode 中原本就存在的 Plus 菜单。
- **覆盖平台**：这条新能力**同时覆盖 Chrome 桌面和移动端**，而不是桌面专属。
- **可拉取的上下文**：近期 Tabs。
- **混合输入**：原文明确——"you aren't limited to one type of input, either: you can now mix and match multiple tabs, images or files (like PDFs) and bring that context into your AI Mode searches."

翻译成工程语义：AI Mode 的输入槽从"纯文本 prompt"进化成了一个**多源、多模态的上下文注入器**。用户可以在一次搜索里同时塞进：

- 多个当前打开的 Tab（网页内容）
- 图片
- 文件（PDF 为原文举例）

原文给了两个非常贴近真实用户的剧本：

**剧本 A（休闲）**：

> you're researching local hiking trails and have several related sites open already. You can add those tabs to your search and ask for similar kid-friendly trails in a different location.

——你不必复制链接或者逐个描述这几条路线，直接把**已经打开的 Tab 作为语境**丢给 AI Mode，然后换一个地点、加一个"适合带孩子"的约束再问。

**剧本 B（学习）**：

> you're studying for a statistics midterm, you can bring in context from open tabs with your class notes, lecture slides and academic papers and ask for more examples to illustrate a tricky concept. AI Mode will use those tabs to provide a tailored response and suggest more sites to explore.

——课堂笔记、讲义、论文三类异构材料，**一次性注入**；AI Mode 不只回答，还会继续推荐可去探索的站点。

这一路线的本质：**浏览器的 Tab 开始被当成"用户的被动上下文库"**。你已经在看的东西，不需要再重新抽象成 prompt，它们**自动就是**你下一次提问的上下文候选。

### 五、Canvas 与图像生成：跟着 Plus 菜单进 Chrome

原文还有一句不能忽略的短句：

> Finally, powerful tools in AI Mode, like Canvas or image creation, are accessible wherever you see the new plus menu in Chrome.

翻译成产品语义：

- AI Mode 原本就有 **Canvas** 和**图像生成**（image creation）等"能力"（powerful tools）。
- 这些能力原本主要在 AI Mode 的产品内被触达。
- 这次把它们的触达入口**跟着 Plus 菜单扩散到 Chrome 里**——只要 Chrome 里的某个位置有新的 Plus 菜单（比如新标签页搜索框），这些能力就在那里可用。

换句话说：**Plus 菜单成了 Chrome 里的一个"AI 能力入口协议"**。这是一个 UI 上的标准化动作，值得后续关注——它可能会成为 Chrome 内其它 AI 能力的统一挂点。

### 六、发布状态

原文给出的状态一句话：

> All of today's updates are now available in the U.S., and we'll expand soon to more places around the world.

要点：

- **上线日期**：2026-04-16（博客发布日）。
- **首发地区**：美国。
- **外扩节奏**："soon"——未给具体日期。

---

## 核心技术洞察

### 洞察 1：真正的变化发生在"前端接缝"上

这次更新没有宣布新的 Gemini 模型、没有披露搜索后端架构变化、没有讲检索层。但它做了一件长期成本很高的事：**把 Chrome 的渲染区与 Search 的 AI 响应区缝到同一个视觉上下文里**。

从 Chrome/Search 的组织架构看，这个动作要求：

- **Chrome 侧**：在桌面上实现一个稳定的分屏容器，在其中一侧渲染任意网页（需要考虑网页的响应式断点、弹窗、视频、登录弹层等），在另一侧保持 AI Mode 的对话状态；
- **Search 侧**：AI Mode 要能把**分屏容器另一侧的当前页面内容**作为可读上下文，而不是仅依赖 URL 再去抓。

原文中"using context from the page and from across the web"正是指向这一点——**页内上下文**这一路几乎不可能只用爬虫兜底，它应当来自浏览器本身对当前页的 DOM / 可见文本的提取。这是 Chrome 作为**第一方**浏览器带来的、第三方 AI 浏览器难以复刻的结构性优势。

### 洞察 2：AI Mode 的输入槽变成了多源多模态上下文注入器

本次更新把 AI Mode 的输入结构扩成了：

```
prompt = 用户打的那句话
       + [recent tab 1, recent tab 2, ...]
       + [image 1, image 2, ...]
       + [PDF 1, ...]
       + (在桌面 AI Mode 下：当前分屏里正在看的页面)
       + 全网搜索能拿到的东西
```

这种注入器的意义在于：**用户不再需要把自己已有的上下文用自然语言"翻译"一遍**。已经打开的 Tab、已经下载的 PDF、刚拍的截图本身就是 prompt 的一部分。这是 Agent 化路径上非常自然的一步——**"你已经在做的事"变成"AI 正在看的事"**。

### 洞察 3：Plus 菜单成为 Chrome 内 AI 能力的"挂点协议"

把 Canvas 和图像生成挂到 Plus 菜单上，是一个小但定向的信号：Google 在把 Chrome 内的 AI 能力收归到一个**可视、可命名、可复用的 UI 元素**下。这一模式的好处是：

- 用户学一次用法，在多处复用；
- Google 未来新增能力时可以**不动主 UI 框架**，只扩充 Plus 菜单即可；
- 让"AI Mode 是一套能力集"而非"AI Mode 是一个页面"这一认知更易成立。

### 洞察 4：分屏 = 把"看"和"问"摆平

这次设计的真正哲学决策不是技术性的，而是**布局性的**：

- 过去 Search 是"主角"，结果页是"辅角"；
- 现在 Search 和结果页是**两个平级面板**。

这一个小变化意味着 Search 本身在让渡自己的入口地位——它承认**用户的任务不是"看搜索结果"，而是"读那些被搜到的页"**。AI Mode 只是留在旁边陪你读。这个姿态上的改变，比任何单点功能都更值得行业关注。

---

## 实践指南

### 谁应该立刻用起来

- **正在美国、用 Chrome 做深度研究的用户**：分屏 + Plus 菜单对你即刻有效，尤其适合做购物决策、竞品对比、学术学习、体育 / 媒体深度消费。
- **写长篇文章或做深度视频内容的创作者**：原文明确点出早期测试者在长文章、长视频场景收益最大——你是目标用户。
- **在 Chrome 里同时开十几个 Tab 做多源研究的人**：Plus 菜单的"multi-tab + image + PDF mix-and-match"能省掉你大量复制粘贴。

### 场景剧本（三条可直接照做）

**剧本 1 · 购物决策**（对应原文咖啡机例子）

1. 去 Search AI Mode 描述需求（空间 / 价位 / 功能）。
2. 挑选候选，从结果点进去——分屏自动打开。
3. 在 AI Mode 侧追问页面级具体问题：清洁难度、配件兼容、保修条款、真实用户口碑——让 AI Mode 同时读你手上这页和全网。
4. 问完一家去下一家，同一对话延续。

**剧本 2 · 多 Tab 学习**（对应原文统计学例子）

1. 先正常用 Chrome 打开你的课堂笔记、讲义、相关论文。
2. 去新标签页，点搜索框的 Plus 菜单，勾选这些 Tab。
3. 再附加一两张关键图（如公式截图）和一份 PDF（如 syllabus）。
4. 问一个具体的知识点："用这些材料里的记号给我多写几个说明 X 概念的例题"。

**剧本 3 · 跨活动迁移**（对应原文徒步例子）

1. 已经为 A 地的线路开了几个 Tab。
2. Plus 菜单勾上它们，问："给我在 B 地找类似的适合带娃的路线。"
3. 让 AI Mode 把"我之前研究的偏好"延展到新对象——**不需要自己写 profile**。

### 使用中的注意事项

- **分屏是桌面专属**；如果你在 Chrome 手机端，不要期待左右分屏。
- **Plus 菜单跨桌面 + 移动**，但是否抓取到你想要的 Tab 取决于它们是否在"recent"范围内——原文没给"recent"定义，保守假设是"最近使用过的"。
- **隐私敏感 Tab**（例如银行、公司内网、医疗）谨慎手动勾选进 Plus 菜单。原文没有说系统会自动读所有 Tab，但既然用户可以主动把 Tab 推进去，使用时也要主动把它们排除。
- **当前分屏页面的上下文抓取**：原文没有说这是否会被 Google 进一步保存或在广告系统中使用——保守处理。
- **地域限制**：今天（2026-04-16）仅美国。其它地区的你现在试不到。

---

## 横向对比

### 与"传统搜索 + 独立 AI 聊天"的差异

| 维度 | 传统 Search + 独立 AI 聊天 | Chrome 里的 AI Mode（本次） |
|------|------------------------------|------------------------------|
| 页面内容如何进入 AI | 手动复制 / 截图 / 再描述一次 | 分屏侧自动作为上下文 |
| 继续追问时的语境维持 | 依赖用户重复 | AI Mode 的会话状态 + 当前页面 |
| 多源上下文 | 通常一次一段 | Plus 菜单里**多 Tab + 图片 + PDF 混合** |
| 视觉焦点 | 反复切应用 / Tab | 单屏内左右并排 |
| 搜索时是否离开内容 | 必须离开 | 不必离开 |

这张表并不是在踩其它产品，而是点出**从"搜索为主角"到"内容为主角、搜索在侧"的范式转变**——这个转变是本次更新的主轴。

### 与"在 Chrome 外的 AI 浏览器助手"的差异（概念层面）

原文没有把这次更新直接对标任何第三方产品。但有两个**概念性区别**值得读者心里有数：

1. **第一方 vs 第三方**：只有第一方浏览器能够**标准化地**让 AI 读到你当前正看的页。第三方助手要走扩展、录屏、爬虫回抓，体验离"无感"永远差一口气。
2. **入口 vs 功能**：第三方 AI 助手往往以"浮条/弹窗"进入用户视野；Chrome 这次是把 AI 直接放在 Search 的原入口里，不需要用户习得新的召唤动作——你用搜索的习惯**不变**。

### 与 Google 自家近期产品线的对位

结合原文末尾列出的"Related stories"，可以看到 Google 在 4 月的集中出拳：

- 2026-04-14 "Turn your best AI prompts into one-click tools in Chrome" —— Chrome 内**提示词快捷工具**化。
- 2026-04-14 "The Google app for desktop is now available for Windows users around the world" —— 桌面入口铺开。
- 2026-04-16 "New ways to create personalized images in the Gemini app" —— 图像生成体验更新。
- 2026-04-16 **本文** —— 搜索与浏览器前端合并。

这四件事串起来看的是同一件战略：**把 AI 从"独立产品"推到"你已经在用的所有入口里"**。AI Mode in Chrome 是这一战略里最结构性的一块，因为搜索 + 浏览器是所有桌面入口里用户量最大的组合。

---

## 批判性分析

### 疑点 1：页内上下文到底怎么传给 AI Mode？

原文只给了一句含糊的表述："using context from the page and from across the web"。这带来几个没被回答的问题：

- 抓的是**可见文本**、整个 DOM，还是某种摘要？
- 长页面（例如一份五万字的法院判决 PDF）是否会被截断？截断规则是什么？
- 动态内容（登录后才可见、需交互的部分）如何处理？
- 用户在 Tab 里的**未提交表单**内容是否会被读到？（这是隐私红线）

原文没解释任何一个。产品上线之后社区可以观察行为。

### 疑点 2：隐私层的暗流

Plus 菜单让用户"选近期 Tab、图片、PDF 加入搜索"，这是用户主动动作——隐私风险低。但分屏里"你打开的任意网页都被 AI Mode 读"这条**是被动的**。几个值得关注的点：

- Google 是否会对用户分屏中看到的页面进行**长期保存**，作为搜索画像的输入？
- 对于登录态页面（Gmail、银行、CRM），是否在某些域上默认禁用这一读取？
- 企业账号下，管理员是否有策略开关？

原文没有回答任何一个——这不是攻击 Google，而是指出原文**刻意保持轻盈**，把隐私话题留给了产品细则。读者在做企业采购决策时**不能仅靠这篇博客**做判断。

### 疑点 3：对内容网站的冲击

这是一个长期问题，但本次更新把它推到一个新的位置：

- 过去 AI Search 的担忧是 **"用户看不到原网页就走了"**；
- 本次更新把用户**直接带到了原网页**（分屏），但同时**继续在 AI Mode 里追问**——用户可能"看着页面，但读的是 AI 的总结"。

这对内容站的影响是**更难定性的**：点击发生了（CTR 可能提升），但"读者在页面上的真实注意力时长"可能反而下降，因为注意力被分到了分屏的另一侧。这一改变对 SEO、广告展示、订阅转化的影响，**行业目前没有现成数据**，值得跟踪。

### 疑点 4：原文没说的事

博客文本里有几处**明显留白**，值得标注出来：

1. **延迟与模型规格**：分屏中的追问响应速度、使用的模型层级、是否消耗 Gemini API 额度——**一字未提**。
2. **Workspace 集成**：企业账号能否把自己的 Google Docs / Sheets / Slides Tab 当作上下文——**没说**。这是**对 Workspace 用户而言最大的未回答问题**。
3. **扩展开发者**：Chrome 扩展能否把自己的内容注入 Plus 菜单，或响应分屏的上下文——**没说**。
4. **全球外扩时间**："we'll expand soon to more places"是一个**故意不承诺的节奏**。
5. **移动端分屏**：明确**只说了桌面**做分屏。移动端是否会有某种等效体验（如上下分栏、悬浮面板），**没说**。

这些留白不是疏漏，它们往往就是产品团队**还在迭代**的地方。下一个版本的公告里可以专门回头看这几条中的哪些被回答了。

### 疑点 5："分屏"本身是不是最终形态？

用户研究历史上对分屏的评价是复杂的：大屏受益、小屏受罪；阅读线性内容时分屏让人累、做对比研究时分屏是救星。Google 选了"点击即分屏"这个**强默认**，意味着所有进入 AI Mode 的用户都会先被推到同一种布局里。

这对"**刚好需要分屏**的那群用户"是恩赐，对"只是想打开一条结果看"的用户会不会成为打扰？原文只描述了前者。值得关注的是：上线后 Google 是否会很快加入"关闭分屏"、"切换为全屏阅读"之类的逃逸阀——这是**可用性成熟度**的直接指标。

---

## 小结

把这次更新放回它自己的上下文里看：

- **它不是新模型**，也不是一个惊艳的新能力。
- **它是 Chrome × Search × AI Mode 三条产品线前端接缝的正式合并**。
- **最重要的两个设计决策**是"**内容和搜索并排**"与"**浏览器 Tab 就是 AI 的被动上下文库**"。这两条是所有"浏览器即 Agent 容器"路线玩家都绕不过去的设计命题，Google 这次交出了自己的答案。
- **最大的遗留疑问**是隐私语义、企业策略、全球节奏、以及移动端等效体验——这些才是判断这次更新**是否能走远**的真正变量。

短期它只是让你的搜索用起来顺手一点；长期它是 Google 对"AI 时代的默认入口应该长什么样"的**最务实的一个版本答案**。
