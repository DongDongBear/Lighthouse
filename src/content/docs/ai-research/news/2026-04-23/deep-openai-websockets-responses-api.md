---
title: "OpenAI Responses API WebSockets：把 Agent Runtime 的结构性延迟砍掉 40%"
description: "OpenAI Responses API, WebSockets, previous_response_id, agent loop, runtime engineering, Codex Spark"
---

# Speeding up agentic workflows with WebSockets in the Responses API

> 原文链接：https://openai.com/index/speeding-up-agentic-workflows-with-websockets/
> 来源：OpenAI
> 发布日期：2026-04-22

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | OpenAI 通过持久化 WebSocket 连接和连接级状态缓存，把 Responses API 的 agent loop 端到端提速约 40%。 |
| 大白话版 | 以前 agent 每做一步都像重新排队进一次服务台；现在改成一直占着一条专线，只把新信息发进去。 |
| 核心要点 | • 持久连接替代多轮 HTTP 往返 • 连接级缓存 previous response state • 只校验新增输入 • 让 65 TPS 到 1000 TPS 的推理跃迁真正被用户感知 |
| 价值评级 | A=必读级 |
| 适用场景 | Coding agent、工具调用链、长流程工作流、多轮响应式代理、企业内部 agent runtime |

## 文章背景

这篇文章最值钱的地方，不是 WebSocket 本身，而是 OpenAI 公开承认：2026 年 agent 体验的瓶颈已经不再主要在模型推理，而在围绕推理的整条运行时链路。

文章开头用 Codex 修 bug 举例：扫描代码、读文件、改文件、跑测试、把工具结果发回模型。这背后是几十次 Responses API 往返。只要 inference 速度上去了，原来被 GPU 慢速掩盖掉的 API 开销就会暴露出来。

OpenAI 这次优化的直接动机是 GPT-5.3-Codex-Spark 这种超高速 coding 模型。原文明确写到：之前的 GPT-5 / GPT-5.2 大约 65 TPS，而他们想让 GPT-5.3-Codex-Spark 达到 1000+ TPS。如果周边 runtime 还停留在老结构，用户根本感受不到模型提速。

## 完整内容还原

### 问题定义：agent loop 的三段延迟

原文把 agentic loop 的时间拆成三大段：
- API services：请求校验、处理、拼装
- model inference：GPU 上生成 token
- client-side time：本地跑工具、构建上下文

以前 inference 最慢，所以 API services 的额外开销还不显眼。现在模型本身越来越快，CPU 侧的验证、会话重建、网络 hop 反而开始吞掉体验收益。

### 第一轮优化：单次请求的临界路径优化

OpenAI 先回顾了 2025 年 11 月左右做的一轮性能冲刺，主要针对单次请求：

- 把 rendered tokens 和 model configuration 放进内存缓存，跳过多轮响应中重复 tokenization 和网络调用
- 减少 network hop，直接打到 inference service，去掉中间服务
- 调整 safety stack，让部分 classifier 更快给出结果

这轮优化把 TTFT（time to first token）改善了接近 45%。

但文章接着点出问题：这还不够。因为结构性问题没变——每一次跟进请求仍被当作独立请求处理，conversation state 和可复用上下文每次都重新处理。会话越长，重复工作越重。

### 结构性瓶颈：每一步都重建整个会话

OpenAI 明说了旧设计的深层问题：
- Codex 的每个 follow-up request 都被当成全新请求
- 即便大部分历史没变，也要重建整段上下文
- conversation 越长，重复处理越贵

这一段其实就是 agent runtime 的核心教训：如果系统把多轮代理任务看成 N 次独立聊天请求，而不是一个持续运行的计算过程，那么延迟会被结构性放大。

### 设计转向：从 HTTP 往返到持久连接

于是团队开始重新思考 transport protocol：
- 能不能保持一条持久连接？
- 能不能把可复用状态存在连接生命周期里？
- 能不能只发增量信息，而不是每次重复发完整历史？

他们考虑过两种方案：
- WebSockets
- gRPC bidirectional streaming

最后选 WebSockets，原因写得很实用：
- 它只是 message transport protocol
- 开发者不用改 Responses API 的输入输出形状
- 对现有架构干扰更小
- 更 developer-friendly

### 第一版原型：把整条 rollout 变成一个长响应

文章里最有意思的是这个原型设计。

原型把整个 agent rollout 建模成一个 long-running Response。具体流程：

1. 模型运行到采样出 tool call
2. Responses API 在 sampling loop 中异步阻塞
3. 服务端通过 WebSocket 向客户端发 `response.done`
4. 客户端执行工具
5. 客户端把工具结果用 `response.append` 发回去
6. sampling loop 被解除阻塞，继续运行

OpenAI 用 hosted tool call 做类比：
- 模型调用 web search 时，系统会暂停推理、调用外部服务、把结果塞回上下文
- 现在把本地工具也当成同类节点，只是“外部服务”从云端换成客户端

这是全文最重要的抽象升级：
本地 tool、云端 tool、企业内网工具，理论上都可以被统一成 agent loop 里的“暂停—执行—恢复”节点。

### 为什么原型没直接上线

这个原型性能非常好，因为：
- preinference work 只做一次
- 工具执行期间只是暂停
- postinference work 也只在结尾做一次

但它的问题是 API 形态太新、太复杂。OpenAI 不想让开发者为了获得性能，重写整套集成方式。

这就是他们最终产品设计的关键取舍：
性能要尽量接近长响应原型，但接口仍然长得像开发者熟悉的 Responses API。

### 上线版设计：保持熟悉 API 形状

最终上线版保留：
- `response.create`
- `previous_response_id`

但底层语义变了。

在 WebSocket 连接内，服务端维护 connection-scoped in-memory cache。只要 follow-up `response.create` 带上 `previous_response_id`，服务端就直接从连接级缓存里取之前的状态，而不是从头重建整段会话。

缓存内容包括：
- previous `response` object
- prior input and output items
- tool definitions and namespaces
- reusable sampling artifacts（如 previously rendered tokens）

这相当于把“多轮 agent 任务”从 N 次 stateless 请求，改造成“一条连接里的增量状态机”。

### 由此带来的几项关键优化

借助连接内状态复用，OpenAI 做了几项非常实打实的优化：

1. **Safety classifier 和 validator 只处理新增输入**
   以前每轮都重新扫全历史；现在只看新的部分。

2. **Rendered tokens 常驻内存缓存**
   不必每轮重新 tokenization。

3. **模型解析 / 路由逻辑复用**
   不再每轮从零做 model resolution。

4. **把部分 postinference 工作与下一轮重叠**
   比如 billing 这种非阻塞工作，可以与后续请求并行。

这几项优化一起，说明 OpenAI 不只是在换传输协议，而是在做完整的 runtime pipeline surgery。

### Alpha 和上线结果

文中给出的结果非常直白：
- 构建 WebSocket mode 用了两个月冲刺
- 先和关键 coding agent startup 做 alpha
- Alpha 用户反馈 up to 40% latency improvement

上线后，结果包括：
- Codex 快速把大多数 Responses API 流量切到 WebSocket mode
- GPT-5.3-Codex-Spark 达到 1000 TPS 目标
- 峰值 burst 到 4000 TPS

外部生态引用的提升数据：
- Vercel AI SDK：up to 40% latency decrease
- Cline：multi-file workflows 39% faster
- Cursor：OpenAI models up to 30% faster

这些外部数字很重要，因为它证明这不是只在 OpenAI 自家 infra 上成立的实验室结果，而是对主流 agent 产品也有感知收益。

## 核心技术洞察

1. **Agent runtime 已经成为独立竞争层**
   模型再快，如果外层 orchestration 仍是 stateless HTTP 叠罗汉，用户照样会等到烦躁。未来性能竞争不只是模型速度，而是 runtime 总体效率。

2. **状态缓存比协议名更重要**
   WebSocket 不是魔法，真正的魔法是 connection-scoped in-memory cache：把 previous response、tool schema、rendered tokens、routing state 都留在连接内。

3. **Agent 系统正在从“请求-响应”转向“长程会话计算”**
   这次设计背后其实是一个范式迁移：agent 不再只是很多次聊天请求，而更像一个长期运行、可暂停恢复的计算过程。

## 实践指南

### 🟢 立即可用

1. **对多步工具调用任务优先启用 WebSocket mode**
   - 做什么：把 Responses API 多轮 agent loop 切到持久连接
   - 为什么：请求越多、工具越多、历史越长，收益越大
   - 注意：短单轮对话收益可能不明显

2. **重新审视 client 端工具执行耗时**
   - 做什么：把本地工具、沙箱、文件系统访问和测试运行时间分开打点
   - 为什么：服务端提速后，客户端慢点会更显眼
   - 注意：别把所有收益都归功于模型或 API

3. **利用 previous_response_id 做状态续接**
   - 做什么：确保 agent 框架正确维护 response lineage
   - 为什么：缓存命中是性能核心
   - 注意：错误地重建会话会吃掉大部分收益

### 🟡 需要适配

1. **企业代理平台**
   - 适配条件：需要代理经常调用私有工具或跨网络边界系统
   - 调整方向：把工具接口设计成可暂停 / 可恢复 / 幂等

2. **高并发 coding agents**
   - 适配条件：多文件改动、长上下文、长链工作流
   - 调整方向：围绕连接生命周期做资源管理和 backpressure 控制

### 🔴 注意事项

1. **别把 WebSocket 当成银弹**
   它解决的是 transport + state reuse，不自动解决工具失败恢复、断线重连和企业网络复杂性。

2. **别忽视 connection lifecycle 管理**
   持久连接意味着新的资源占用模型，需要管超时、重连、状态失效。

3. **别继续每轮全量重发上下文**
   如果上层 SDK / agent 框架还在重建全部历史，再快的底层也会被浪费掉。

## 横向对比

| 话题 | 旧式多轮 HTTP agent loop | 本文 WebSocket mode | 意义 |
|---|---|---|---|
| 连接模型 | 每轮新请求 | 持久连接 | 减少反复握手与重复处理 |
| 状态管理 | 每轮重建 | 连接级缓存 | 会话越长收益越大 |
| Safety/validation | 常扫全历史 | 仅扫新增输入 | CPU 侧开销大幅下降 |
| Tool call 抽象 | 更像外部回调 | 更像可恢复节点 | 本地/云端工具更统一 |
| 开发者迁移成本 | 无 | 较低，保留 response.create | 有利生态快速切换 |

## 批判性分析

### 局限性

第一，文章没有给出更细的 tail latency 分布、不同任务长度下的收益曲线，也没拆开“40% 提升”里分别来自缓存、hop 减少、safety stack 优化多少。

第二，WebSocket mode 显然更适合长流程 agent，但对短任务、移动端、企业代理网络、连接中断场景的边界没有展开。

第三，连接级内存缓存虽然高效，但也意味着更多状态管理复杂性，例如缓存失效、跨服务迁移、连接中断恢复等问题，原文没有详细讨论。

### 适用边界

最适合：
- coding agent
- 多轮工具调用
- 长上下文任务
- 多文件编辑 / 测试循环
- 企业 agent runtime

较不敏感：
- 单轮问答
- 极短响应任务
- 几乎不调用工具的简单流水线

### 潜在风险

- 开发者可能会错误理解为“只要开 WebSocket 就会飞快”，忽略真正需要命中的是状态缓存。
- 持久连接一旦与上游代理、网关、浏览器环境冲突，体验可能不稳定。
- 如果工具调用不是幂等的，暂停 / 恢复的抽象会引入新型错误。

### 独立观察

1. 这篇文章本质上是在宣布：OpenAI 已经把 agent runtime 当成一等产品，而不是模型附属层。
2. 它和 Codex、workspace agents、Privacy Filter 一起看，OpenAI 正在补齐 agent 平台的三层结构：前端入口、运行时底座、治理能力。
3. 未来 API 平台的比较标准会变：不仅是谁 token 更便宜、模型更强，还要看谁能把“工具型长任务”真正跑顺。