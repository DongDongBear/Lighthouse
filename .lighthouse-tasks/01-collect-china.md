# 任务：中国区 AI 新闻采集

## ⛔ 铁律：只收 24 小时内的新闻

**每条新闻都必须验证发布日期。没有明确日期 → 不收。超过 24 小时 → 不收。宁可少收也不混入旧闻。**

违反此规则的采集无论内容多好都是失败的。

---

## 时间初始化

```bash
TODAY=$(date -d '+8 hours' '+%Y-%m-%d')
YESTERDAY=$(date -d '+8 hours -1 day' '+%Y-%m-%d')
echo "采集日期: $TODAY（北京时间），接受 $YESTERDAY 晚间至 $TODAY 的内容"
```

服务器运行在 UTC，所有判断以北京时间（UTC+8）为准。

## ⭐ 上期追踪（精髓！不可跳过！）

这是整个日报系统的灵魂——每天的日报不是孤立的，而是连续追踪的。

**必须执行：**
1. 找到上一期日报：`ls -t /tmp/Lighthouse/src/content/docs/ai-research/news/*/daily.md | head -2` 取第二个（昨天的）
2. 读取文件末尾的 `## 下期追踪问题`（通常 3 个问题）
3. 在今天的日报开头 **逐一回应** 每个问题的最新进展
4. 回应要具体：有新进展就写清楚，没有进展也要说明"暂无更新"
5. 如果追踪问题涉及的事件今天有重大突破，对应的采集条目标记 ⭐

这不是走形式——追踪问题让日报变成连续叙事，读者能看到事件的发展脉络。

## 文件操作

目标文件：`/tmp/Lighthouse/src/content/docs/ai-research/news/${TODAY}/daily.md`

- 不存在 → 创建新文件（含下方 frontmatter 模板）
- 已存在 → 在已有内容基础上追加（先读取全文，避免重复）

如果 /tmp/Lighthouse 不存在：
```bash
cd /tmp && git clone https://github.com/DongDongBear/Lighthouse.git
```

### frontmatter 模板（新文件时使用）

```yaml
---
title: "${TODAY} AI 日报：[头条摘要]"
description: "[3-5句总结今日亮点]"
---

# ${TODAY} AI 日报

## 上期追踪问题回应

**1. [昨日问题1原文]？**
[具体回应：有什么新进展/消息/数据，引用信源]

**2. [昨日问题2原文]？**
[具体回应]

**3. [昨日问题3原文]？**
[具体回应]

---

## 🇨🇳 中国区
```

## 采集信源与搜索策略

**原则：每个信源至少用 2 种方式搜索，每条结果都验证发布日期。**

### A. 大模型公司（逐一搜索）

| 公司 | 搜索关键词（web_search） | 备选 URL |
|---|---|---|
| DeepSeek | `DeepSeek 发布/更新/开源 ${TODAY}` | https://api-docs.deepseek.com/news |
| 百度/文心 | `百度 文心一言 ERNIE ${TODAY}` | — |
| 阿里/通义/Qwen | `通义千问 Qwen 发布 ${TODAY}` | https://qwenlm.github.io/blog/ |
| 腾讯/混元 | `腾讯 混元 AI ${TODAY}` | — |
| 字节/豆包/Coze | `字节跳动 豆包 AI ${TODAY}` | — |
| 智谱/GLM | `智谱AI GLM ChatGLM ${TODAY}` | https://www.zhipuai.cn |
| MiniMax/海螺 | `MiniMax 海螺AI ${TODAY}` | — |
| 月之暗面/Kimi | `月之暗面 Kimi ${TODAY}` | — |
| 零一万物/Yi | `零一万物 Yi 模型 ${TODAY}` | — |
| 面壁/MiniCPM | `面壁智能 MiniCPM ${TODAY}` | — |
| 阶跃星辰 | `阶跃星辰 AI ${TODAY}` | — |
| 百川智能 | `百川智能 ${TODAY}` | — |
| 昆仑万维/天工 | `昆仑万维 天工 AI ${TODAY}` | — |
| 商汤科技 | `商汤 AI ${TODAY}` | — |
| 科大讯飞/星火 | `科大讯飞 星火 ${TODAY}` | — |

### B. 芯片/硬件

- 华为昇腾（`昇腾 AI 芯片 ${TODAY}`）
- 寒武纪（`寒武纪 AI 芯片 ${TODAY}`）
- 海光信息、摩尔线程

### C. 中文科技媒体

依次搜索以下关键词（加日期限定）：
- `36Kr AI 人工智能`
- `量子位 AI`
- `机器之心 AI`
- `新智元 AI`

### D. 政策/产业/投融资

- `AI 政策 监管 中国 ${TODAY}`
- `AI 芯片 自主 国产化 ${TODAY}`
- `AI 投融资 融资 ${TODAY}`

### E. GitHub 中文热门

- web_fetch: `https://github.com/trending?since=daily&spoken_language_code=zh`
- 只挑 AI 相关项目

## 每条新闻格式

```markdown
### [编号]. [标题]（特别重要的加 ⭐）

**概述：**[2-3句，具体说谁在什么时间做了什么，包含关键数字]

**意义：**[为什么重要，对行业有何影响]

**信源：**https://[真实可访问URL]
```

格式要求：
- 实际访问原文后再写概述，不可凭记忆编造
- 每条必须有可访问的原始链接（https:// 开头）
- 编号在区块内连续
- ⭐ 标记特别重要的条目（突破性发布/重大融资/政策转折），后续深度解读模块会据此选题

## 写入 + Push

```bash
cd /tmp/Lighthouse && git add -A && \
  git commit -m "collect-china: ${TODAY} HH:MM CST — [N]条中国区新闻（关键词1/关键词2/关键词3）" && \
  git push
```

push 失败 → `git pull --rebase && git push`

## 自检清单（完成前逐项确认）

- [ ] 每条新闻的发布日期都在 24 小时内？
- [ ] 每条都有 https:// 开头的真实信源链接？
- [ ] 没有凭记忆编造内容？每条都实际访问了原文？
- [ ] 没有与已有内容重复？
- [ ] ⭐ 标记了真正重要的条目？
- [ ] 读取了上期追踪问题并在开头逐一回应？
- [ ] frontmatter 的 title 和 description 有内容？
- [ ] git push 成功？

完成后输出：`COLLECT_CHINA_DONE — [N]条`
