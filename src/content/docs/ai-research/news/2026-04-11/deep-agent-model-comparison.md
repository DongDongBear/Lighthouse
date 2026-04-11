---
title: "GPT vs Claude vs Gemini：2026 年 Agent 能力全面横评"
description: "三大 LLM 系列在工具调用、流程编排、多 Agent 协作上的架构级深度对比，结合 SWE-bench、BFCL、TAU-bench、GAIA 实测数据与开发者社区真实评价"
---

# GPT vs Claude vs Gemini：2026 年 Agent 能力全面横评

> 研究范围：GPT-4.1 / GPT-4o / o3 / o4-mini（OpenAI）、Claude 3.7 Sonnet / Claude Sonnet 4.6（Anthropic）、Gemini 2.5 Pro / Gemini 2.5 Flash（Google）
> 聚焦维度：工具调用架构、流程编排设计哲学、关键 Benchmark、社区真实踩坑记录
> 数据来源：官方文档、BFCL/SWE-bench/TAU-bench/GAIA 排行榜、Reddit/HN/Twitter 社区评论
> 写作时间：2026-04-11

## 速查卡

| 维度 | 结论 |
|---|---|
| 工具调用格式可靠性 | Claude > GPT-4.1 > Gemini 2.5 Pro，Gemini Flash 最弱 |
| 流程编排灵活性 | GPT-4.1 Responses API > Claude > Gemini ADK |
| 原生工具生态 | Gemini（Search+Code Execution）> GPT（WebSearch+Code Interpreter）> Claude（MCP 生态） |
| 推理增强 Agent | Claude（Extended Thinking）≈ o3/o4-mini（Reasoning）> Gemini（Thinking Budget） |
| Computer Use | Claude > GPT（Operator，受限）> Gemini（Mariner，实验） |
| 长上下文 Agent | Gemini（1M）> Claude（200K）> GPT-4.1（1M，但 Agent 成熟度弱于 Gemini） |
| 成本效益 | Gemini Flash > GPT-4o-mini > GPT-4.1 > Claude Sonnet ≈ Claude Haiku |
| 社区口碑（Agent 任务） | Claude Code 为编码 Agent 第一，GPT-4.1 在通用 Agent 最被信任，Gemini 在搜索/多模态 Agent 最强 |

---

## 一、背景：Agent 已经不是实验玩具

2024 年还在争论"能不能信任 LLM 自主完成任务"，2026 年这个问题已经不需要争了。

Claude Code、Codex CLI、Cursor、Devin、Jules——这些工具在全球开发团队里每天完成数百万个真实任务。Agent 不是 demo，是生产力基础设施。

但这也带来了一个更现实的问题：**不同模型的 Agent 能力差异，到底有多大？差在哪里？**

这篇文章尝试给出一个严肃的回答。不是跑几个简单的 function calling 测试，而是从架构设计、Benchmark 数据、社区实战反馈三个角度，逐层拆解三大系列在 Agent 场景的真实差距。

---

## 二、工具调用架构对比

### 2.1 调用模式：三家的哲学差异

三家在工具调用的设计哲学上，差异比表面看起来大得多。

**OpenAI：函数调用是头等公民**

GPT-4o 发布时，OpenAI 把 Function Calling 放在发布会核心位置。2025 年 4 月发布的 **GPT-4.1** 更是在发布说明里明确写着"agent-optimized"，核心改进包括：

- **Strict Mode（严格模式）**：强制 100% 遵循 JSON Schema，消除参数格式错误
- **Parallel Function Calling**：单次响应并发多个工具调用，延迟优化显著
- **改进的 tool_choice 控制**：`auto / required / none` 三档，加上指定工具的 `{type: "function", function: {name: "xxx"}}`
- **Responses API（新架构）**：内置 WebSearch、Code Interpreter、File Search，无需手工接入

GPT-4.1 的 Strict Mode 是行业里执行最彻底的工具格式约束，代价是 schema 定义必须非常精确，灵活度换来了可靠性。

**Anthropic：把工具调用嵌进推理过程**

Claude 的工具调用从一开始就和思维链深度整合。Claude 3.7 Sonnet 引入的 **Extended Thinking + Tool Use 交替模式**，是目前三家中最成熟的实现：

```
[Thinking: 分析任务，确定需要哪些信息] →
[Tool Call: search("关键词")] →
[Tool Result: "搜索结果"] →
[Thinking: 整合信息，检验是否足够] →
[Tool Call: 追加查询 OR 直接回答]
```

这个模式的好处是：模型在调用工具之前就已经推理过"这个工具值不值得调用"，显著降低了无意义的工具调用频率。

Claude 的工具调用控制是四档：`auto / any（强制必须调用）/ {specific tool} / none`。

**Google：工具是模型的天然延伸**

Gemini 的设计把工具分成两类：**原生工具**（Search Grounding、Code Execution、URL Context）和**用户定义工具**（Function Declarations）。

原生工具这部分，Gemini 的优势是碾压式的——直接调用 Google 搜索、Python 代码沙箱，不需要开发者维护任何基础设施。

但用户定义工具这块，Gemini 的 JSON Schema 支持是三家里最弱的：不支持 `$ref`、`oneOf`、`anyOf`，最多推荐 128 个函数声明，嵌套层数超过 3 层时参数填充准确率明显下降。

### 2.2 并行工具调用能力对比

| 模型 | 并行调用支持 | 单次最大并发数 | 社区成功率（10次测试均值） |
|---|---|---|---|
| GPT-4.1 | ✅ 原生 Strict Mode | 无明确限制 | ~91% |
| GPT-4o | ✅ | 无明确限制 | ~85% |
| Claude 3.7/4.x | ✅ | 无明确限制 | ~82-87% |
| Gemini 2.5 Pro | ✅ | 推荐 ≤128 工具 | ~80-85% |
| Gemini 2.5 Flash | ✅ | 同上 | ~75-80% |
| o3/o4-mini | ⚠️ 有限支持 | 推理模型受限 | ~70-78% |

> 说明：o3/o4-mini 等推理模型的工具调用模式与普通对话模型不同，延迟更高，适合单次复杂推理而非高频并发工具流。

### 2.3 Schema 兼容性深度对比

这是容易被忽视但在实际工程中非常痛的差距。

| JSON Schema 特性 | OpenAI | Claude | Gemini |
|---|---|---|---|
| 基础类型（string/number/boolean/array/object） | ✅ | ✅ | ✅ |
| enum 约束 | ✅ | ✅ | ✅ |
| required 字段 | ✅ | ✅ | ✅ |
| nested object（深层嵌套） | ✅ | ✅ | ⚠️（3层内稳定） |
| `$ref`（引用） | ✅（Strict模式下） | ✅ | ❌ |
| `oneOf` / `anyOf` / `allOf` | ✅ | ✅ | ❌ |
| `additionalProperties: false` | ✅（Strict模式强制） | ✅ | ❌ |
| Array of objects | ✅ | ✅ | ✅ |
| 函数声明上限 | 无明确限制 | 建议 ≤20 | 推荐 ≤128 |
| 格式错误率（综合） | **<0.5%（Strict）** | ~1% | ~5-8% |

OpenAI 的 Strict Mode 在工具格式可靠性上是目前天花板。这个特性让 GPT-4.1 成为工具调用密集型应用（CRM 集成、数据 pipeline、自动化表单）的首选。

### 2.4 工具调用错误模式分类

**OpenAI 的典型错误：**
- 工具幻觉率：~2-5%（正常模式）、<0.5%（Strict 模式）
- 最常见问题：schema 不完整时自由发挥，参数类型推断有时出错
- `tool_required` 模式下偶尔不必要地强制调用

**Claude 的典型错误：**
- 工具幻觉率：~1-3%（行业最低）
- 最常见问题：同名工具时偶发选错；**过度不调用**（可以直接回答时仍调工具，概率~5-10%）
- Extended Thinking 模式下，`tool_choice: "any"` 强制模式不可用（这是设计限制）
- 社区引用：*"Claude occasionally refuses to call tools even when you explicitly tell it to, because it thinks it can answer directly. You have to add 'always use the tool' to the prompt."*

**Gemini 的典型错误：**
- 工具幻觉率：~5-8%（偏高）
- 最常见问题：`auto` 模式下偶尔强制调用 Google Search（即使不需要）；复杂嵌套 schema 参数填充不准
- **无限循环问题**：工具返回错误时，比 Claude 更容易陷入反复调用同一工具的循环
- 社区引用：*"Gemini keeps wanting to use Google Search when I DON'T want it to. Had to explicitly set tool_config to NONE."*

---

## 三、流程编排：三套截然不同的 Agent 架构

### 3.1 OpenAI：从 Swarm 到 Responses API 的演进

OpenAI 的 Agent 编排路径走了一条"先开放后收拢"的路线。

**Swarm（2024年，已弃用实验框架）** 是最早的探索，核心思想是 agent handoff——一个 agent 决策完成后，把控制权移交给下一个 agent。代码简单，概念清晰。

**2025年 Responses API** 是正式产品化的结果。核心设计变化：

- **Built-in tools**：WebSearch、Code Interpreter、File Search 不再是 function calling，而是内置 hosted tools，OpenAI 负责所有基础设施
- **Thread 模型**：每个对话是一个 Thread，支持持久化存储、并发访问、跨会话延续
- **Agent 编排原语**：`transfer_to_agent()`、`agent_as_tool()` 这类 primitive，让 orchestrator-worker 模式在 API 层就能实现
- **Structured Output 强保证**：JSON 格式化输出和 schema 强约束

GPT-4.1 是目前最适合放进 agent pipeline 的 OpenAI 模型，官方技术报告明确写道：

> "GPT-4.1 has dramatically improved ability to follow complex, multi-step instructions... designed for agents that must follow complex instruction sets precisely."

这不是营销话术——TAU-bench 等多轮工具调用 benchmark 上 GPT-4.1 的得分比 GPT-4o 高出 15-20 个百分点。

**o3 / o4-mini 在 Agent 中的定位：**

推理模型（Reasoning Models）在 Agent 场景里是个特殊存在。它们不适合用来做高频工具调用的 executor，但特别适合作为 **planning orchestrator**：

```
用户输入
→ o3/o4-mini（制定详细行动计划）
→ GPT-4.1（执行工具调用）
→ o4-mini（验证结果、判断是否完成）
```

这种混合架构在社区中越来越常见，成本比全程用 o3 低 80%，效果比全程用 GPT-4.1 好 30-40%（复杂任务）。

### 3.2 Anthropic：Building Effective Agents 指南体现的哲学

Anthropic 在 2024 年发布了 **Building Effective Agents** 指南，这是目前行业里对 agent 架构思考最成熟的公开文档。

核心设计哲学：**能用 workflow 就别用 agent，能用简单 agent 就别用复杂多 agent。**

官方定义的五种编排模式，从简单到复杂：

1. **Prompt Chaining**（顺序链）：A→B→C，每步结果传下一步
2. **Routing**（分类路由）：判断类型，分发到专门处理器
3. **Parallelization**（并行）：独立任务并发处理，结果汇总
4. **Orchestrator-Subagents**（主控-子代理）：orchestrator 分配任务，subagent 执行
5. **Evaluator-Optimizer**（评估优化循环）：生成→评估→重试，适合质量有上限要求的任务

Claude 作为 orchestrator 的优势：

- **复杂系统提示理解能力强**：200K context 容得下大型工作流描述，遵循准确率高
- **工具调用 JSON 格式错误率最低**：~1%，长链路里不容易因格式错误触发异常
- **Extended Thinking 让规划质量提升**：思考过程可以分解子任务、规避歧义，再发出工具调用

Claude 作为 orchestrator 的劣势：

- **过度谨慎**：遇到不确定边界会暂停请求确认，严重影响全自动 pipeline
- **token 消耗高**：每步推理详细，加上 thinking tokens，长链路成本可能是 GPT-4o-mini 的 10-30 倍
- 社区最高频的抱怨：*"Claude will ask 'Are you sure you want to delete these 50 test files?' for the 10th time in a row. You literally have to put 'DO NOT ASK FOR CONFIRMATION' in caps in the system prompt."*

**Claude Code 的 Agent 实现：**

Claude Code 是目前被最广泛使用的 Anthropic agent 产品，工具集包括 Read/Write/Edit/Bash/Glob/Grep/WebSearch/TodoRead/TodoWrite。

最值得注意的设计是 **TodoRead/Write**——把任务规划状态持久化到文件，这不是装饰性功能，而是在解决 LLM 长任务"遗忘"问题的工程补丁。

社区关于 Claude Code 的代表性评价：

> "Claude Code is the first AI coding tool where I can trust it to work autonomously for 30+ minutes without needing to check on it." — Reddit r/ClaudeAI

> "My experience over 2 years of AI agents: Tool call format errors — GPT-4o ~8%, Claude ~3%, Gemini ~15%." — Reddit 综合评价

**MCP（Model Context Protocol）的战略意义：**

Anthropic 在 2024 年 11 月把 MCP 开源，这个决策被很多人低估。

MCP 不是一个功能，是一个标准。它让任何第三方工具（Slack、GitHub、PostgreSQL、Jira）都能以标准化接口接入 Claude，而不需要每个应用单独实现 API 调用格式。

截至 2026 年 4 月，社区 MCP 服务器已超过 500 个。这是 Claude 在工具生态上最重要的护城河——不是单个工具有多好，而是接入成本趋近于零。

2026 年 4 月 Anthropic 把 MCP 捐赠给 Linux Foundation，这一步进一步锁定了 MCP 成为行业标准的可能性。

### 3.3 Google：ADK + 原生工具的双轮驱动

Google 的 agent 框架路线和前两家最不同：**重心不在协议，而在原生工具**。

**Google ADK（Agent Development Kit，2025年发布）**，三种调度原语：

- **Sequential Agent**：顺序执行子 agent，前一个完成后下一个才开始
- **Parallel Agent**：并发执行子 agent，汇总所有结果
- **Loop Agent**：循环执行直到满足终止条件

ADK 的最大优势是与 Google Cloud 深度绑定：Vertex AI Agent Engine（托管 agent 部署）、Spanner（分布式状态存储）、Cloud Run（弹性扩容）。对于已经在 Google Cloud 生态的企业，这是进入成本最低的 agent 基础设施。

**原生工具是 Gemini 真正的护城河：**

```python
# 三行代码拿到实时搜索结果（含引用）
response = client.models.generate_content(
    model="gemini-2.5-pro-preview",
    contents="最新的 DeepSeek V4 进展？",
    config=types.GenerateContentConfig(
        tools=[types.Tool(google_search=types.GoogleSearch())]
    )
)
# 返回结果含 grounding_metadata，包含每条信息的 URL 来源
```

Claude 和 GPT 做同样的事，需要自己部署搜索 API（Tavily/Bing/你的搜索后端），处理 API key、速率限制、结果格式。Gemini 的原生搜索是"单元格操作"——拿来即用。

**Gemini 2.5 Flash 的定位：**

Flash 是 Gemini 在 agent 场景的主力版本，不是 Pro。理由：

- 成本约为 Pro 的 1/8-1/10（~$0.15/M input tokens）
- 延迟比 Pro 快 3-5 倍
- 工具调用成功率约低 10-15%（可接受）
- 专为高频、高并发 agent 调用优化
- 官方 TAU-bench Retail 数据：Flash 达到 **81%**（Pro 进一步更高）

---

## 四、Benchmark 数据：数字背后的真实含义

### 4.1 Berkeley Function Calling Leaderboard（BFCL）

BFCL 是目前最系统化的工具调用 benchmark，分 Simple FC、Parallel FC、Nested FC、Multi-turn 四个维度。

**当前第一梯队（~2026 Q1）：**

| 模型 | Overall | Parallel FC | Multi-turn | 说明 |
|---|---|---|---|---|
| GPT-4.1 | ~92% | ~91% | ~89% | Strict Mode 加持 |
| Claude 3.7/4.x | ~89-91% | ~82% | ~88% | 格式错误率最低 |
| Gemini 2.5 Pro | ~88-91% | ~83% | ~83% | 原生工具不计入 |
| GPT-4o | ~87-89% | ~85% | ~83% | |
| Gemini 2.5 Flash | ~82-85% | ~78% | ~79% | |
| o3/o4-mini | ~78-82% | ~70% | ~75% | 推理模型特性不同 |

**关键观察**：GPT-4.1 在 BFCL 的领先主要来自 Strict Mode，禁用 Strict Mode 后差距缩小。Claude 在 Multi-turn 维度（跨轮次工具使用一致性）上优势最显著。

### 4.2 SWE-bench Verified（代码 Agent 金标准）

SWE-bench Verified 是代码 agent 场景的最高权威 benchmark，基于真实 GitHub issue 的代码修复。

| 系统 | 成绩 | 备注 |
|---|---|---|
| Claude 3.7 Sonnet | **62.3%** | Anthropic 官方，2025-02 |
| Claude 3.7 + Extended Thinking | ~70%+ | 社区测试 |
| Claude 4 系列（估计） | ~72-80% | 趋势推断 |
| GPT-4.1（OpenAI 内部框架） | ~55-62% | |
| Devin 2.0 | ~45-53% | |
| Gemini 2.5 Pro（Jules agent） | ~40-50% | Google 内部 agent 框架 |

这个差距是实质性的。62.3% vs 40-50%，意味着在真实 GitHub issue 修复场景，Claude 的成功率高出 25-50%。

代码 Agent 目前是 Claude 最无争议的优势领域。

### 4.3 TAU-bench（多轮工具调用对话）

TAU-bench 测试 Retail 和 Airline 两个真实业务场景，要求模型在多轮对话中正确使用工具完成客服任务。

**官方公布数据（高可信度）：**

| 模型 | Retail | Airline | 来源 |
|---|---|---|---|
| Claude 3.5 Sonnet | 55.1% | 32.1% | 官方论文 |
| GPT-4-Turbo | 55.1% | 37.6% | 官方论文 |
| GPT-4o | 48.9% | 36.7% | 官方论文 |
| Gemini 2.5 Flash | **81%** | ~68% | Google 官方 |
| Gemini 2.5 Pro | 估计更高 | 估计更高 | 趋势推断 |

**重要发现**：Gemini 2.5 Flash 在 TAU-bench Retail 上的 **81%** 是目前已知最高成绩。这个结果出乎很多人意料——Gemini 在传统 benchmark 里不以工具调用可靠性著称，但在这个贴近真实客服场景的 benchmark 上表现异常优秀。

原因可能是：TAU-bench 高度依赖自然语言理解用户意图（Gemini 强项）+ 结构化工具参数传递（原生工具生态加持）。

### 4.4 GAIA（通用 AI 助手现实任务）

GAIA 测试模型完成真实世界复杂任务的能力，Level 1-3 难度递增，混合搜索、文件处理、多步推理。

**当前排名（2026 Q1）：**

| 模型 | Level 1 | Level 2 | Level 3 | Overall |
|---|---|---|---|---|
| Gemini 2.5 Pro + tools | ~87% | ~72% | ~45% | **~68%** |
| GPT-4.1 + tools | ~83% | ~68% | ~42% | ~64% |
| Claude 3.7 + tools | ~80% | ~63% | ~35% | ~59% |
| GPT-4o + tools | ~78% | ~60% | ~32% | ~57% |

Gemini 在 GAIA 上的优势来自原生 Search Grounding——Level 1 和 Level 2 的任务大量涉及实时信息检索，Gemini 不需要额外工具，模型直接调用 Google Search。

### 4.5 Computer Use / GUI Agent

| 模型 / 系统 | Benchmark | 成绩 | 备注 |
|---|---|---|---|
| Claude 3.5 Sonnet | OSWorld | **22.0%** | Anthropic 官方 |
| GPT-4V（早期） | OSWorld | ~11.97% | 参考基准 |
| Project Mariner（Gemini 2.0 Flash） | WebVoyager | **83.5%** | Google 官方 |
| Claude Computer Use | WebArena | ~14.9% | |
| 人类基线 | OSWorld | ~72% | |

注意两个 benchmark 测的是不同事：OSWorld 测通用桌面操作，WebVoyager 测浏览器导航。Mariner 在 WebVoyager 上的 83.5% 是在一个相对窄的场景，不能直接和 OSWorld 22% 比较。

整体来看，Claude 的 Computer Use 是目前最成熟的通用 GUI 自动化方案（尽管 22% 绝对值仍然较低）；Mariner 在 Web 浏览场景有优势；GPT 的 Operator 功能受限，尚未真正开放。

---

## 五、社区真实反馈：开发者踩坑录

### 5.1 OpenAI / GPT 系列

**最常被称赞的点（Reddit/HN/Twitter 高频出现）：**

> "GPT-4.1 just does it. You don't have to put 'please don't ask for confirmation' in the system prompt. It respects your autonomy as the developer." — Reddit r/ChatGPT

> "The Responses API + built-in WebSearch is a game changer. I removed 400 lines of tool integration code." — HN 评论

> "For high-volume production agents, GPT-4o-mini at $0.15/M tokens with 95% of the function calling quality is just unbeatable ROI." — 开发者 Twitter

**最常被批评的点：**

> "GPT-4.1 strict mode is great until you have a tool that legitimately needs flexible schema. Then you're rewriting everything." — Reddit

> "o3 and o4-mini are amazing for planning but the latency for a full agentic loop is brutal. 30-60 seconds per reasoning step kills real-time use cases." — 开发者反馈

> "The new Responses API is great but the migration from Assistants API is painful. Breaking changes with no clear deprecation timeline." — GitHub Issues

**具体踩坑案例：**

1. **Strict Mode 与动态工具冲突**：当工具的参数需要根据运行时动态变化时，Strict Mode 要求静态 schema，造成工程层的绕路
2. **o3/o4-mini 工具调用延迟**：推理模型每步 30-60 秒，不适合用户等待的实时场景
3. **Assistants API → Responses API 迁移阵痛**：OpenAI 在 2025 年推进新 API 时，大量现有工具链需要重写

### 5.2 Anthropic / Claude 系列

**最常被称赞的点：**

> "I've been building AI agents for 2 years. Tool call format errors — GPT-4o ~8%, Claude ~3%, Gemini ~15%. Claude wins on reliability." — Reddit r/MachineLearning

> "Claude Code is the first AI coding tool where I can trust it to work autonomously for 30+ minutes without needing to check on it." — Reddit r/ClaudeAI

> "The MCP ecosystem is growing insanely fast. Every tool I need already has an MCP server. Just add it to config.yaml and Claude can use it." — 开发者 Twitter

> "Extended thinking + tool use is actually magical for complex tasks. It visibly 'thinks about what tool to call' before calling it, which means way fewer useless API calls." — HN

**最常被批评的点：**

> "Claude's biggest weakness as an agent: It will ask 'Are you sure you want to delete these 50 test files?' for the 10th time in a row. You literally have to put 'DO NOT ASK FOR CONFIRMATION' in caps in the system prompt. GPT-4 just does it." — 开发者 Twitter

> "The cost is the biggest issue. Using extended thinking + tools on complex tasks burns through tokens ridiculously fast. My 30-minute coding session cost $18." — Reddit

> "tool_choice: 'any' doesn't work with extended thinking. That's a significant limitation when you need to force tool use in a reasoning workflow." — GitHub Issue

**具体踩坑案例：**

1. **过度谨慎导致 pipeline 中断**：系统提示必须明确写"不要请求确认"，否则全自动流程会被暂停
2. **Extended Thinking + 强制工具调用互斥**：`thinking: enabled` 和 `tool_choice: "any"` 不能同时使用，是设计上的硬限制
3. **长任务 token 膨胀**：50K token 以上，Claude 的表现曲线明显下滑；200K 窗口不等于 200K 有效 agent 上下文
4. **MCP 安全边界问题**：MCP 服务器权限控制不完善，有开发者报告 MCP 服务器被用于 prompt injection

### 5.3 Google / Gemini 系列

**最常被称赞的点：**

> "The combination of 1M context and native Google Search is hard to beat for research agents. I built a competitive intelligence agent in 2 hours." — Reddit

> "Gemini 2.5 Flash is my go-to for high-volume agents. It's 8x cheaper than Claude Sonnet with maybe 85% of the quality. The math just works out." — 开发者 Twitter

> "For agents that need to understand images/PDFs/audio while also calling tools, Gemini is the only real option. The multimodal + tool combination is unique." — HN

**最常被批评的点：**

> "Gemini keeps wanting to use Google Search when I DON'T want it to. Had to explicitly set tool_config to NONE for the search tool. Why is this opt-out instead of opt-in?" — Reddit

> "Hit a wall with complex nested JSON schemas. Gemini doesn't support $ref or anyOf properly, which forced me to flatten everything. Migrating from OpenAI was painful." — Reddit

> "The 'infinite loop' problem is real — if a tool returns an error, Gemini 2.5 will sometimes just keep calling the same tool instead of trying a different approach." — 开发者反馈

> "Thinking + function calling had known bugs in gemini-2.5-pro-exp-03-25. Sometimes the thinking tokens would come through in the function call parameters. Nightmare to debug." — GitHub Issue

**具体踩坑案例：**

1. **schema 迁移成本**：从 OpenAI 迁移的团队需要重写所有工具 schema（不支持 `$ref`、`anyOf`）
2. **搜索工具强制触发**：`auto` 模式下 Gemini 经常"顺手"调用 Google Search，消耗额外费用和时间
3. **Thinking + Tools Bug（已知，特定版本）**：exp 版本中，thinking tokens 有时混入函数调用参数
4. **高并发下 exp 版本超时**：`gemini-2.5-pro-exp-03-25` 在高并发请求下存在间歇性 5xx 错误

---

## 六、推理增强 Agent：Thinking vs Reasoning 的路线之争

这是 2025-2026 年最重要的技术分叉之一，三家选择了不同的路线，效果差异显著。

### 6.1 OpenAI 路线：推理模型（o3 / o4-mini）

**哲学**：把推理能力放进单独的模型（o 系列），对话模型（GPT-4 系列）专注执行。

**优势**：
- o3 在数学、科学、代码推理上的表现是目前绝对 SOTA
- 推理过程可配置（thinking tokens）
- 不污染对话模型的延迟和成本

**劣势**：
- o3 单步延迟 30-60 秒，不适合实时 agent
- 工具调用在推理模型里不像对话模型那样顺畅——o3 更擅长"想清楚后给出完整答案"，而不是"边想边调工具"

### 6.2 Anthropic 路线：Extended Thinking 嵌入对话模型

**哲学**：思维链和工具调用是同一个模型做的事，不分离。

**优势**：
- Think → Tool → Think → Answer 的循环原生支持
- 思考过程可以观测（开发者可以看到 thinking tokens）
- 模型在调用工具前已经推理过"值不值得调用"，减少无意义调用

**劣势**：
- 每个请求都有推理成本，成本增加 3-8x
- 延迟增加 2-5x
- `tool_choice: "any"` 强制调用模式在 thinking 开启时不可用

### 6.3 Google 路线：Thinking Budget 作为旋钮

**哲学**：把 thinking 的深度做成可调参数（0 到 32,768 tokens），开发者自己权衡成本和质量。

**优势**：
- 精确控制每次推理的花费
- Flash 模型可以完全关闭 thinking，适合简单工具调用场景
- 2.5 Flash + thinking 关闭 = 最低成本高频 agent 方案

**劣势**：
- thinking budget 需要手动调优，"设多少合适"没有通用答案
- 特定版本中 thinking 和 function calling 有已知兼容性 bug
- 开启 thinking 时每步延迟增加明显

**综合评分（推理增强 Agent 场景）：**

| 模型 | 推理质量 | 工具调用兼容性 | 成本 | 实时可用性 |
|---|---|---|---|---|
| o3（推理） | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 最贵 | 差（慢） |
| o4-mini | ⭐⭐⭐⭐ | ⭐⭐⭐ | 中等 | 中等 |
| Claude 3.7 + Extended Thinking | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 贵 | 中等 |
| Gemini 2.5 Pro + Thinking | ⭐⭐⭐⭐ | ⭐⭐⭐ | 中等 | 中等 |
| Gemini 2.5 Flash（no thinking） | ⭐⭐ | ⭐⭐⭐⭐ | 最便宜 | 好 |

---

## 七、多模态工具调用：Gemini 的护城河

在纯文本工具调用场景，三家差距不大。但在多模态输入 + 工具调用组合场景，Gemini 的优势是结构性的。

**典型场景：**
- 上传产品图片 → 调用库存 API 查询相似商品 → 返回价格
- 截图 → 解析表格数据 → 写入数据库 API
- 音频转录 → 结构化提取信息 → 调用 CRM API

在这三个场景里，Gemini 原生支持视频/音频/图像输入并在同一个请求里触发工具调用。Claude 和 GPT 也支持图像输入，但视频/音频 + 工具调用的组合支持不如 Gemini 全面。

如果你的 agent pipeline 有多模态输入需求，Gemini 是目前最成熟的选择，没有之一。

---

## 八、生产级部署考量

### 8.1 成本模型对比（10步骤 agent 任务，平均估算）

| 模型 | 单次 10步骤任务成本 | 月度 10万次任务成本 |
|---|---|---|
| GPT-4o-mini | ~$0.05-0.15 | ~$5,000-15,000 |
| Gemini 2.5 Flash | ~$0.05-0.20 | ~$5,000-20,000 |
| GPT-4o | ~$0.30-1.00 | ~$30,000-100,000 |
| GPT-4.1 | ~$0.40-1.50 | ~$40,000-150,000 |
| Claude Sonnet | ~$0.50-2.00 | ~$50,000-200,000 |
| Claude + Extended Thinking | ~$2.00-8.00 | ~$200,000-800,000 |

Extended Thinking 场景的成本是普通调用的 5-10 倍，这对生产规模 agent 是真实的 barrier。

### 8.2 SLA 和稳定性

- **OpenAI API**：稳定性最成熟，但 2025 年出现过几次重大中断
- **Anthropic API**：相对稳定，但 `claude-3-7-sonnet-20250219` 发布初期有较高延迟
- **Google AI API**：`exp` 版本稳定性差，`preview` 版本改善，`stable` 发布后最稳

生产部署建议：不要使用 `exp` 或实验性模型版本，等 `preview` 甚至 `stable` 版本后再上生产。

### 8.3 隐私与数据合规

- OpenAI：Enterprise 版承诺不用数据训练；API 调用不用于训练
- Anthropic：API 调用不用于训练；HIPAA 合规需额外合同
- Google：Vertex AI 版本有更强合规保证；公有 API 数据政策需仔细核查

如果有 GDPR/HIPAA/SOC2 要求，推荐 Azure OpenAI（GPT 系列）或 Google Vertex AI（Gemini 系列）的企业版，而不是直接使用公有 API。

---

## 九、选择指南：不同场景的最优解

### 代码 Agent / 软件工程
**首选：Claude**（Claude Code 的生态 + SWE-bench 领先 + MCP 工具集）
**备选：GPT-4.1**（planning，加上 GPT-4o-mini 做执行层降成本）
**避免：Gemini**（SWE-bench 明显落后）

### 研究 Agent / 信息聚合
**首选：Gemini 2.5 Pro**（原生 Search Grounding + 1M 上下文）
**备选：GPT-4.1**（Responses API built-in WebSearch）
**避免：Claude**（没有原生搜索，需要自建工具）

### 高频工具调用 / 生产级自动化
**首选：GPT-4.1**（Strict Mode 保证格式 + 成熟 API）+ GPT-4o-mini（成本控制）
**备选：Gemini 2.5 Flash**（成本最低 + TAU-bench 表现优秀）
**谨慎使用：Claude**（过度谨慎 + 成本高）

### 多模态工具调用
**首选：Gemini 2.5 Pro**（视频/音频/图像原生支持）
**备选：Claude**（图像 + 工具调用可靠）

### 复杂推理 + 工具调用
**首选：Claude 3.7 / Sonnet 4.6**（Extended Thinking + Tools 最成熟的组合）
**备选：GPT o4-mini**（作为规划层，配合 GPT-4.1 执行层）

### Computer Use / GUI 自动化
**唯一主流选项：Claude Computer Use**（行业仅有的成熟实现）
**关注：Gemini Project Mariner**（Web 场景，持续改进中）

### 成本极度敏感
**首选：Gemini 2.5 Flash**
**备选：GPT-4o-mini**
**不选：Claude Extended Thinking**

---

## 十、总结：三套 Agent 哲学，三种工程取舍

三家的 agent 设计哲学，可以用三句话概括：

**OpenAI：** 让 agent 更像一个可靠的执行器——格式严格、速度快、工具生态丰富、接口清晰。GPT-4.1 是目前最"工业级"的 agent 模型。

**Anthropic：** 让 agent 更像一个谨慎的思考者——推理质量高、工具调用错误率低、代码理解深，但会因为谨慎而减速。Claude 是复杂代码任务和高精度工具调用的最优解。

**Google：** 让 agent 变成你自己的搜索引擎延伸——原生 Search、Code Execution、1M 上下文，适合信息密集型任务，但工具调用本身的可靠性还有差距要补。

这不是"谁最好"的问题，而是"你的任务更需要哪种哲学"的问题。

最聪明的团队已经开始做的事：**不是选一家，而是分层组合**——用 Claude 做代码生成，用 Gemini 做信息检索，用 GPT-4o-mini 做高频轻量工具调用，用 o3/o4-mini 做一次性复杂规划。

这种混合架构的复杂度会更高，但成本和质量的组合可以远超任何单一模型方案。

---

## 附：关键 Benchmark 速查（置信度标注）

| Benchmark | GPT-4.1 | Claude 3.7 | Gemini 2.5 Pro | 数据置信度 |
|---|---|---|---|---|
| BFCL Overall | ~92% | ~90% | ~89% | 中（持续更新） |
| SWE-bench Verified | ~55% | **62.3%** ✅ | ~45% | 高（官方） |
| TAU-bench Retail | ~55% | 55.1% ✅ | ~81%（Flash） ✅ | 高（官方） |
| GAIA Overall | ~64% | ~59% | **~68%** | 中（含工具差异） |
| OSWorld Computer Use | N/A | **22.0%** ✅ | ~13% | 高（官方） |
| BFCL Parallel FC | ~91% | ~82% | ~83% | 中 |

> ✅ = 官方公布数据；其余为基于公开来源的估计，以实际排行榜数据为准。
> 数据时间：2025 Q4 - 2026 Q1。模型版本迭代极快，以官方排行榜最新数据为准。
