# 任务：全球 AI 新闻采集（三大厂 + 欧洲 + 北美 + 学术 + 硬件）

## ⛔ 铁律：只收 24 小时内的新闻

**每条新闻都必须验证发布日期。没有明确日期 → 不收。超过 24 小时 → 不收。**

---

## 时间初始化

```bash
TODAY=$(date -d '+8 hours' '+%Y-%m-%d')
echo "采集日期: $TODAY"
```

## 文件操作

读取已有文件：`/tmp/Lighthouse/src/content/docs/ai-research/news/${TODAY}/daily.md`
- 已存在 → 在已有内容基础上追加新区块
- 不存在 → 先创建（参照 01-collect-china.md 的 frontmatter 模板）

如果 /tmp/Lighthouse 不存在：
```bash
cd /tmp && git clone https://github.com/DongDongBear/Lighthouse.git
```

---

## 第一优先级：三大厂官方博客（12 页全部 fetch，0 遗漏）

**以下 12 个页面必须逐一 web_fetch，不可跳过任何一个。**

### Anthropic（4 页）

| # | 页面 | URL |
|---|---|---|
| 1 | News | https://www.anthropic.com/news |
| 2 | Engineering | https://www.anthropic.com/engineering |
| 3 | Research | https://www.anthropic.com/research |
| 4 | Model Docs | https://docs.anthropic.com/en/docs/about-claude/models |

### OpenAI（4 页）

| # | 页面 | URL |
|---|---|---|
| 5 | Blog | https://openai.com/blog |
| 6 | Index | https://openai.com/index |
| 7 | Research | https://openai.com/research |
| 8 | Changelog | https://platform.openai.com/docs/changelog |

### Google / DeepMind（4 页）

| # | 页面 | URL |
|---|---|---|
| 9 | Google AI Blog | https://blog.google/technology/ai/ |
| 10 | DeepMind Blog | https://deepmind.google/discover/blog/ |
| 11 | Google Dev Blog | https://developers.googleblog.com/ |
| 12 | Google AI Research | https://ai.google/discover/research/ |

### 三大厂处理流程

1. 逐一 fetch 12 个页面
2. 找出今日（24h 内）发布的新文章
3. 新文章要**读全文**，不能只看标题
4. 三大厂的文章在 daily.md 中用 `## ⭐ 三大厂动态` 区块标记
5. 如果三大厂今日没有新文章，明确写出"三大厂今日无新文章发布"，不要编造

---

## 第二优先级：欧洲区

用 `## 🇪🇺 欧洲区` 标记。搜索以下信源（每家至少 2 种搜索方式，只收 24h 内）：

| 公司/话题 | 搜索关键词 | 备选 URL |
|---|---|---|
| Mistral AI | `Mistral AI release ${TODAY}` | https://mistral.ai/news/ |
| Hugging Face | `Hugging Face announcement ${TODAY}` | https://huggingface.co/blog |
| Stability AI | `Stability AI ${TODAY}` | — |
| EU AI Act | `EU AI Act regulation ${TODAY}` | — |
| 英国 AI 政策 | `UK AI policy ${TODAY}` | — |

---

## 第三优先级：北美区（三大厂以外）

用 `## 🇺🇸 北美区` 标记。

| 公司 | 搜索关键词 |
|---|---|
| Meta AI / LLaMA | `Meta AI LLaMA release ${TODAY}` |
| Microsoft / Copilot | `Microsoft AI Copilot ${TODAY}` |
| Apple Intelligence | `Apple AI Intelligence ${TODAY}` |
| xAI / Grok | `xAI Grok ${TODAY}` |
| Amazon / AWS AI | `AWS AI Bedrock ${TODAY}` |
| Cohere | `Cohere AI ${TODAY}` |
| Perplexity | `Perplexity AI ${TODAY}` |
| Midjourney | `Midjourney ${TODAY}` |
| Runway | `Runway AI ${TODAY}` |
| Scale AI | `Scale AI ${TODAY}` |
| Groq / Cerebras / CoreWeave | `Groq Cerebras CoreWeave ${TODAY}` |

---

## 第四优先级：学术 / 开源

用 `## 🌐 学术/开源` 标记。

### arXiv 热门论文

搜索 `arXiv AI LLM ${TODAY}` 以及以下类别的热门论文：
- cs.CL（计算语言学）
- cs.AI（人工智能）
- cs.LG（机器学习）
- cs.CV（计算机视觉）

### HuggingFace Papers

- web_fetch: https://huggingface.co/papers
- 关注 upvotes > 30 的论文

### 社区热门

- Reddit: `site:reddit.com r/MachineLearning OR r/LocalLLaMA AI ${TODAY}`
- GitHub Trending: web_fetch `https://github.com/trending` 挑 AI 相关项目

---

## 第五优先级：硬件

归入 `## 🌐 学术/硬件` 或单独标记。

- NVIDIA: `NVIDIA AI GPU ${TODAY}`
- AMD: `AMD AI MI ${TODAY}`
- Intel: `Intel AI ${TODAY}`
- TSMC: `TSMC AI chip ${TODAY}`

---

## 第六优先级：英文科技媒体

这些媒体用于查漏补缺：

| 媒体 | URL |
|---|---|
| Hacker News | https://news.ycombinator.com/ |
| TechCrunch AI | web_search `TechCrunch AI ${TODAY}` |
| The Verge AI | web_search `The Verge AI ${TODAY}` |
| Ars Technica AI | web_search `Ars Technica AI ${TODAY}` |
| MIT Tech Review | web_search `MIT Technology Review AI ${TODAY}` |

---

## 每条新闻格式

同中国区：`### [编号]. [标题]（重要的加 ⭐）` + 概述 + 意义 + 信源。

要求：
- 实际访问原文后再写，不可凭记忆编造
- 每条必须有 https:// 开头的真实链接
- 各区块编号分别连续
- 去重：和中国区已有内容不重复

## 写入 + Push

追加到 daily.md，更新 frontmatter 的 title/description 为今日全部亮点。

```bash
cd /tmp/Lighthouse && git add -A && \
  git commit -m "collect-global: ${TODAY} HH:MM CST — [总条数]条 三大厂[N]篇新文章 [区域概要]" && \
  git push
```

push 失败 → `git pull --rebase && git push`

## 自检清单（完成前逐项确认）

- [ ] 三大厂 12 个页面是否全部 fetch 过？有没有遗漏？
- [ ] 三大厂新文章是否读了全文？
- [ ] 每条新闻的发布日期都在 24 小时内？
- [ ] 每条都有 https:// 开头的真实信源链接？
- [ ] 没有凭记忆编造内容？
- [ ] 没有与中国区或已有内容重复？
- [ ] 各区块标题正确（⭐三大厂/🇪🇺欧洲/🇺🇸北美/🌐学术硬件）？
- [ ] frontmatter 的 title 和 description 已更新为全天亮点？
- [ ] git push 成功？

完成后输出：`COLLECT_GLOBAL_DONE — [N]条`
