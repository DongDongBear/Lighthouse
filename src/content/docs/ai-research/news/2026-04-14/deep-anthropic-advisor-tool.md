---
title: "Anthropic Advisor Tool Beta：模型级联的范式反转与推理经济学重构"
description: "Anthropic Advisor Tool, Beta, 模型级联, cascade routing, Haiku, Sonnet, Opus, SWE-bench, BrowseComp, 推理成本优化, Agent 工作流"
---

# Anthropic Advisor Tool Beta: Inverting the Model Cascade

> 原文链接：https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool / https://claude.com/blog/the-advisor-strategy
> 来源：Anthropic
> 发布日期：2026-04-09

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Anthropic 发布 Advisor Tool Beta，用"小模型执行 + 大模型顾问"的反向级联架构，在保持甚至提升质量的同时大幅降低推理成本 |
| 大白话版 | 让便宜的"实习生"（Haiku/Sonnet）干活，遇到难题才请"总监"（Opus）指点一下——活干得不差，钱省了 85% |
| 核心要点 | executor+advisor 反向级联、Haiku+Opus 成本降 85%、SWE-bench +2.7pp、一行代码启用、单次 API 请求内完成 |
| 价值评级 | A — 必读级：重新定义了 LLM 推理的成本-质量帕累托前沿 |
| 适用场景 | Agent 编程工作流成本优化、多步骤研究 pipeline、企业 API 调用成本控制、Haiku 用户的质量升级路径 |

## 文章背景

LLM 推理成本是企业大规模部署 AI Agent 的核心瓶颈。一个典型的 25 轮编程 Agent 会话，如果全程使用 Opus 级模型，成本可能高达数美元。但现实是，这 25 轮中大多数操作（读文件、运行测试、格式化输出）并不需要顶级推理能力——真正需要深度思考的可能只有 2-3 个关键决策点。

此前业界的解决方案是"路由器"（Router）模式：在请求到达模型之前，用一个分类器判断应该发给大模型还是小模型。OpenAI 的 Router、Google 的 Model Garden 路由、以及各种开源路由方案都采用这一范式。但路由器面临一个根本性困境——**在任务开始前就要判断难度，而很多任务的真实难度只有执行过程中才能暴露**。

Anthropic 的 Advisor Tool 提出了一个根本性的范式反转：不在任务开始前做路由决策，而是让小模型全程执行，**由执行者自己在遇到困难时决定何时请教大模型**。这看似微小的架构差异，实际上重构了整个推理经济学。

2026 年 4 月 9 日，Advisor Tool 作为 Beta 版发布，与 Claude Cowork GA 和 Managed Agents 同日推出——三者共同构成 Anthropic 企业 AI 基础设施的完整升级。

## 完整内容还原

### 一、核心机制：反向级联的六步流程

Advisor Tool 的架构可以精确描述为六步：

1. **Executor 启动任务**：小模型（如 Sonnet 4.6）接收用户请求，开始调用工具、读取文件、编写代码——像任何 Agent 一样执行任务。

2. **Executor 遇到决策分叉**：当 Executor 判断自己无法可靠地做出某个决策时（例如：在两种架构方案间选择、判断一个 bug 的根因），它主动发出一个 `server_tool_use` 调用，`name: "advisor"`，`input: {}`。注意：input 为空——Executor 只决定"何时请教"，不需要手动组装上下文。

3. **服务端构建 Advisor 上下文**：Anthropic 服务端自动将 Executor 的完整对话记录（系统提示、所有工具定义、所有历史消息和工具结果）打包发送给 Advisor 模型。

4. **Advisor 推理**：Opus 4.6 以只读方式审阅整个对话轨迹，生成指导建议（通常 400-700 文本 token）。Advisor 的 thinking blocks 被丢弃，只有最终建议返回给 Executor。**关键约束：Advisor 不能调用工具，不能直接产出面向用户的输出——它只提供顾问意见。**

5. **建议返回**：Advisor 的响应以 `advisor_tool_result` 块的形式返回给 Executor。

6. **Executor 继续执行**：Executor 结合 Advisor 的建议继续生成，完成后续步骤。

**整个流程发生在单次 `/v1/messages` 请求内。** 开发者不需要管理多次 API 调用——Anthropic 基础设施在内部完成了所有编排。

这与传统的"大模型编排、小模型执行"模式形成了精确的镜像反转：

| 维度 | 传统模式（Orchestrator → Worker） | Advisor 模式（Executor → Advisor） |
|---|---|---|
| 决策权 | 大模型持有全局决策权 | 小模型持有执行权和升级权 |
| 成本分布 | 大模型参与每一轮 | 大模型仅在被请求时参与 |
| 路由时机 | 任务开始前（预判） | 执行过程中（实时） |
| 上下文传递 | 大模型手动分解任务 | 服务端自动传递完整记录 |
| 工具调用 | Worker 调用工具 | Executor 调用工具，Advisor 不调用 |

### 二、Benchmark 数据解析

Anthropic 公布了三组关键 benchmark 数据，覆盖不同 Executor-Advisor 组合和不同任务类型：

**组合一：Haiku 4.5 + Opus 4.6 Advisor**

| 指标 | Haiku 单独 | Haiku + Advisor | 变化 |
|---|---|---|---|
| BrowseComp（多步网络研究） | 19.7% | 41.2% | **+21.5pp（+109%）** |
| 成本对比 Sonnet 单独 | — | — | **节省 85%** |

BrowseComp 的 +109% 提升令人瞩目——这意味着 Haiku+Advisor 的准确率超过了 Haiku 单独的两倍。虽然仍落后于 Sonnet 单独约 29%，但成本仅为 Sonnet 的 15%。对于"质量可接受、成本敏感"的场景（如大批量网页数据提取），这个 ROI 极具吸引力。

**组合二：Sonnet 4.6 + Opus 4.6 Advisor**

| 指标 | Sonnet 单独 | Sonnet + Advisor | 变化 |
|---|---|---|---|
| SWE-bench Multilingual | 72.1% | 74.8% | **+2.7pp** |
| 每任务成本 | 基准 | — | **降低 11.9%** |

SWE-bench +2.7pp 看似不大，但在这个基准上，顶级模型之间的差距通常在个位数百分比以内。更重要的是成本同时降低了 11.9%——**质量提升和成本下降同时发生**，打破了通常的 quality-cost tradeoff。

**组合三：典型 25 轮编程 Agent 场景（约 3 次 Advisor 咨询）**

| 组合 | 相对纯 Opus 成本 |
|---|---|
| Sonnet + Opus Advisor | **降低约 73%** |
| Haiku + Opus Advisor | **降低约 87%** |

这组数据揭示了 Advisor Tool 的核心经济学：在典型 Agent 工作流中，25 轮交互只需要 3 次 Advisor 咨询，其余 22 轮以 Executor 的低成本运行。

### 三、API 设计：一行代码的工程哲学

Advisor Tool 的启用只需要在 API 请求的 `tools` 数组中添加一个工具定义：

```json
{
    "type": "advisor_20260301",
    "name": "advisor",
    "model": "claude-opus-4-6"
}
```

加上请求头 `anthropic-beta: advisor-tool-2026-03-01`，就完成了全部配置。

**支持的模型组合：**

| Executor | Advisor | 状态 |
|---|---|---|
| Claude Haiku 4.5 | Claude Opus 4.6 | 可用 |
| Claude Sonnet 4.6 | Claude Opus 4.6 | 可用 |
| Claude Opus 4.6 | Claude Opus 4.6 | 可用（自我咨询） |

规则简洁：**Advisor 必须至少与 Executor 同等能力**。不合法的组合（如 Opus Executor + Haiku Advisor）返回 `400 invalid_request_error`。

**高级配置参数：**

- `max_uses`（整数，可选）：限制单次请求中的最大 Advisor 调用次数。超出后 Executor 收到 `max_uses_exceeded` 错误但请求不中断——Executor 自行决定如何继续。
- `caching`（对象，可选）：为 Advisor 启用提示缓存。格式 `{"type": "ephemeral", "ttl": "5m" | "1h"}`。Advisor 第 N 次调用的提示 = 第 N-1 次的提示 + 新增段落，前缀稳定，因此缓存命中率随调用次数线性增长。**损益平衡点约 3 次调用**——低于 3 次开启缓存反而更贵。

### 四、计费模型：双轨定价的透明度

Advisor Tool 采用双轨计费——Executor token 按 Executor 模型费率，Advisor token 按 Advisor 模型费率。API 响应的 `usage` 对象中新增 `iterations` 数组，逐步记录每次推理的 token 消耗：

```json
{
  "usage": {
    "input_tokens": 412,
    "output_tokens": 531,
    "iterations": [
      {"type": "message", "input_tokens": 412, "output_tokens": 89},
      {"type": "advisor_message", "model": "claude-opus-4-6",
       "input_tokens": 823, "output_tokens": 1612},
      {"type": "message", "input_tokens": 1348, "output_tokens": 442}
    ]
  }
}
```

关键设计决策：

- **顶层 `usage` 只反映 Executor token**——Advisor token 不混入顶层汇总（因为费率不同）
- `max_tokens` **只约束 Executor 输出**——不限制 Advisor token
- Priority Tier **按模型独立计算**——Executor 的优先级不延伸至 Advisor
- ZDR（零数据保留）**适用于整个请求**——Advisor 子推理也不存储数据

### 五、流式传输行为

对于实时应用，Advisor 的流式行为值得注意：

1. Executor 正常流式输出
2. 当 Executor 发出 `server_tool_use` 调用 Advisor 时，流暂停
3. **Advisor 子推理不流式传输**——期间约每 30 秒发送 SSE `ping` 保活
4. Advisor 完成后，`advisor_tool_result` 以完整块一次性返回（无 delta）
5. Executor 恢复流式输出

**实际体验：** 用户会感知到一个短暂的"思考暂停"（通常 2-8 秒），然后输出恢复。对于编程 Agent 场景，这个暂停通常发生在架构决策点——恰好是用户也需要思考的时刻。

### 六、系统提示工程：引导 Executor 的咨询时机

Anthropic 提供了精心设计的系统提示模板，用于指导 Executor 何时调用 Advisor：

**核心原则——"实质性工作之前调用"：**

> Call advisor BEFORE substantive work -- before writing, before committing to an interpretation, before building on an assumption. If the task requires orientation first (finding files, fetching a source, seeing what's there), do that, then call advisor. Orientation is not substantive work. Writing, editing, and declaring an answer are.

这个"探索不算实质性工作，写代码才算"的区分非常精妙——它允许 Executor 低成本地收集信息，仅在要做出不可逆决策时才咨询 Advisor。

**建议处理原则——"认真对待但不盲从"：**

> If you've already retrieved data pointing one way and the advisor points another: don't silently switch. Surface the conflict in one more advisor call -- "I found X, you suggest Y, which constraint breaks the tie?"

这暗示 Executor 应该有自己的判断力，Advisor 是"高级顾问"而非"绝对权威"。冲突解决不是简单的"以大模型为准"，而是通过追问来厘清分歧。

**输出精简技巧：** 在系统提示中加入"The advisor should respond in under 100 words and use enumerated steps, not explanations"，可将 Advisor 总输出 token 减少 **35-45%**，且不影响调用频率。

### 七、错误处理：优雅降级而非失败

Advisor Tool 的错误处理设计体现了"反脆弱"思维：

| 错误码 | 含义 | 行为 |
|---|---|---|
| `max_uses_exceeded` | 超出调用次数限制 | Executor 继续，不再咨询 |
| `too_many_requests` | Advisor 被限流 | Executor 继续，本次不咨询 |
| `overloaded` | Advisor 容量不足 | Executor 继续 |
| `prompt_too_long` | 对话记录超出 Advisor 上下文窗口 | Executor 继续 |
| `execution_time_exceeded` | Advisor 推理超时 | Executor 继续 |
| `unavailable` | 其他失败 | Executor 继续 |

**所有 Advisor 错误都不会导致整体请求失败。** Executor 收到错误后自行决定是否重试或继续执行。这是一个关键的设计选择——Advisor 是"锦上添花"而非"关键路径"，系统在没有 Advisor 的情况下也能产出结果（只是质量可能略低）。

### 八、竞品对比与战略定位

**vs OpenAI Router：**
OpenAI Router 在请求到达模型前做路由决策——本质上是一个前置分类器。优势是延迟低（不需要等待 Advisor 推理），劣势是路由决策基于请求表面特征而非执行过程中的实际难度。Advisor Tool 的延迟更高（每次咨询增加 2-8 秒），但路由准确性理论上更高——因为决策点由正在执行任务的模型基于实际执行状态做出。

**vs Google Model Garden 路由：**
Google 的方案侧重于在模型家族内做能力匹配（Gemini Flash/Pro/Ultra），路由逻辑在 Google 基础设施层完成。Advisor Tool 的差异在于路由发生在模型层而非基础设施层——Executor 有能动性决定何时升级。

**vs 自建级联：**
此前，开发者需要自建路由逻辑（通常基于 prompt 分类器或规则引擎），管理多个 API 调用，处理上下文传递。Advisor Tool 将这些复杂性全部下沉到 Anthropic 基础设施，开发者只需添加一个工具定义。对中小团队而言，这消除了数百行胶水代码。

### 九、限制与注意事项

1. **Beta 阶段，仅支持 Anthropic API**——暂不支持 AWS Bedrock 和 Google Vertex AI。对已绑定云平台的企业客户，这是即时采用的主要障碍。

2. **Advisor 不流式传输**——每次咨询会有 2-8 秒暂停。对延迟敏感的实时场景（如对话式 UI），这可能影响用户体验。

3. **无内置会话级调用上限**——`max_uses` 只在单次请求级别生效。开发者需自行在客户端实现会话级预算控制。

4. **`clear_tool_uses` 尚未完全兼容**——多轮对话中清理历史工具调用时，advisor 相关块的处理仍有 edge case。

5. **`clear_thinking` 交互**——如果使用非 `keep: "all"` 的 thinking 保留策略，Advisor 侧的缓存会因转录内容逐轮偏移而失效。需要显式设置 `keep: "all"` 以保持缓存稳定。

### 十、行业验证与用户证词

**Bolt CEO Eric Simmons：**
> "It makes better architectural decisions on complex tasks while adding no overhead on simple ones. The plans and trajectories are night and day different."

**Eve Legal（法律科技公司）：**
报告 Haiku 4.6 + Opus 4.6 Advisor 在结构化文档提取任务上达到前沿模型质量，成本降低约 **5 倍**，且超越了自建编排层的效果。

## 深度分析

### Advisor Tool 揭示的三个行业趋势

**趋势一：推理经济学从"选模型"转向"编排模型"**

Advisor Tool 的经济学本质是：**用 Advisor 的 O(1) 成本（每次咨询 400-700 token）换取 Executor 全程使用小模型的 O(N) 节省**。当 N（总轮次数）远大于 Advisor 调用次数时，节省比例趋向于 Executor 与 Advisor 的单价差。

以 Sonnet+Opus 组合为例：如果 25 轮中有 3 次 Advisor 咨询，则 22 轮按 Sonnet 费率、3 轮按 Opus 费率——相比全程 Opus，成本降低约 73%。这不是"选择更便宜的模型"，而是"在正确的时间使用正确的模型"。

这预示着 LLM 推理市场的下一阶段竞争不在单模型性价比，而在**编排效率**——谁能更精准地识别"这个 token 该用哪个模型生成"。

**趋势二：Agent 工作流的"自省能力"成为核心差异化**

Advisor Tool 的成功前提是 Executor 能准确判断"我什么时候需要帮助"。这实际上要求小模型具备元认知能力——知道自己不知道什么。如果 Executor 错过了应该咨询的关键决策点，Advisor 再强也无用；如果 Executor 过度咨询，成本优势消失。

Anthropic 通过系统提示来引导这种自省行为，但这终究是一个训练时就需要内化的能力。未来，模型的"知道自己何时不确定"的能力（calibration）可能成为比"知道答案"更重要的评估维度。

**趋势三：Anthropic 的"基础设施下沉"战略**

Advisor Tool 与同日发布的 Cowork GA（企业管理基础设施）和 Managed Agents（Agent 托管）形成了清晰的战略脉络：**将越来越多的复杂性从开发者端下沉到 Anthropic 基础设施端**。

- 路由逻辑？Advisor Tool 处理。
- Agent 编排？Managed Agents 处理。
- 企业权限管理？Cowork RBAC 处理。
- 可观测性？OpenTelemetry 导出处理。

这与 AWS 的"原语 + 自组合"哲学形成对比——Anthropic 正在走向"交钥匙"方向，降低开发者的集成成本，但也增加了对 Anthropic 基础设施的依赖。

### 对 Bedrock 缺席的深层解读

Beta 阶段不支持 AWS Bedrock 看似是时间问题，但可能反映更深层的架构约束。Advisor Tool 需要在单次请求内运行两个不同模型的推理——这在 Anthropic 自有基础设施上是内部调度问题，但在 Bedrock 上涉及跨服务调用和计费拆分的复杂性。预计 Bedrock 集成需要 AWS 侧的支持，时间表取决于双方工程排期。

对已绑定 AWS 的企业客户，短期替代方案是在 Anthropic API 上运行 Agent 工作流的推理部分，同时通过 Bedrock 处理其他 Claude 调用——但这增加了架构复杂度和供应商管理负担。

## 结论与展望

Advisor Tool 的核心贡献不是又一个降本工具，而是**证明了"小模型驱动 + 大模型顾问"这个计算范式在实际 Agent 工作流中是可行的**。它将路由决策从任务开始前的"预判"转变为执行过程中的"实时升级"，在更准确的成本控制的同时提供了质量保底。

对开发者的即时行动建议：如果你正在运行基于 Opus 的 Agent 工作流，测试 Sonnet+Advisor 组合——预期 70%+ 的成本下降和相当甚至更好的质量。如果你的 Haiku 工作流在特定任务上质量不足，Haiku+Advisor 是比全面升级到 Sonnet 更经济的路径。

后续关注：Bedrock 集成时间表、Advisor 对更多模型对的支持扩展、以及 OpenAI/Google 的竞品响应。
