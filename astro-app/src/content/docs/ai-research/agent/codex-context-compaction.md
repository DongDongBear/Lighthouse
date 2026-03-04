---
title: Codex Context Compaction 机制分析
---

# Codex Context Compaction 机制分析

> **来源**: Kangwook Lee — [Investigating how Codex context compaction works](https://x.com/kangwook_lee/status/2028955292025962534)
> **日期**: 2026-03-03
> **标签**: `Agent` `Context Management` `OpenAI Codex`

## 核心问题

AI coding agent（如 OpenAI Codex）在长时间编码任务中，对话历史会不断增长，最终超出模型的 context window 限制。**Context compaction（上下文压缩）** 是解决这一问题的关键机制——在不丢失重要信息的前提下，将冗长的对话历史压缩为精简的摘要。

## Codex 的两种 Compaction 路径

### 1. 本地 Compaction（开源 Codex CLI，非 Codex 模型）

对于非 Codex 模型，开源的 Codex CLI 在**本地**进行上下文压缩：

- 使用一个 LLM 对当前对话进行摘要
- 通过专门的 **compaction prompt** 生成结构化的 handoff summary
- 摘要后的上下文通过 `responses.create()` 传递给后续对话

### 2. 远程 Compaction（Codex 模型，专用 API）

对于 Codex 模型，压缩通过服务端的专用 **Compaction endpoint** 完成：

```
CompactionInput {
    model: &str,              // 使用的模型
    input: &[ResponseItem],   // 要压缩的历史记录
    instructions: &str,       // 压缩指令（fully-resolved）
}
→ Output: Vec<ResponseItem>   // 压缩后的历史
```

这意味着 OpenAI 可以在服务端对压缩过程进行专门优化。

## Compaction Prompt

来自 Codex 开源代码 `codex-rs/core/templates/compact/prompt.md`：

> *"You are performing a CONTEXT CHECKPOINT COMPACTION. Create a handoff summary for another LLM that will resume the task."*

要求摘要包含：

1. **当前进展** — 已完成的工作和关键决策
2. **重要上下文** — 约束条件、用户偏好
3. **待办事项** — 清晰的下一步计划
4. **关键数据** — 继续工作所需的示例和引用

这本质上是一种 **"LLM 交接班"** 的思路——前一段对话的 LLM 为下一段对话的 LLM 写交接文档。

## 技术实现详解

### 触发时机

| 类型 | 时机 | 特点 |
|------|------|------|
| **Pre-turn compaction** | 新一轮对话开始前 | 压缩项之后注入初始上下文 |
| **Mid-turn compaction** | 对话进行中（inline） | 在最后一条用户消息前注入初始上下文 |

### 压缩流程（源码分析）

```
1. 克隆当前会话历史
2. 裁剪 function call 历史以适配 context window
3. 调用 compact_conversation_history() 生成压缩历史
4. 过滤压缩结果（保留/丢弃规则）
5. 保留 ghost snapshots（用于 /undo）
6. 替换会话历史
7. 重新计算 token 使用量
```

### 历史过滤规则

压缩后的历史会经过严格过滤（`should_keep_compacted_history_item`）：

**保留的内容：**
- ✅ `assistant` 消息（模型回复）
- ✅ 真实的 `user` 消息（用户输入）
- ✅ `compaction` 记录
- ✅ 用户侧的警告和摘要消息

**丢弃的内容：**
- ❌ `developer` 消息（避免指令重复累积）
- ❌ Tool calls / Function calls 及其输出
- ❌ Reasoning 内容
- ❌ Web search calls
- ❌ Ghost snapshots（单独保留）

### Ghost Snapshot 保留

一个巧妙的设计：compaction 后仍然保留所有 `GhostSnapshot`，这样用户在压缩后依然可以使用 `/undo` 功能回退代码变更。这说明 Codex 在设计时很注重**用户体验的连续性**。

## 关键设计洞察

| 设计点 | 说明 | 意义 |
|--------|------|------|
| **摘要式压缩** | 不是简单截断，而是让 LLM 生成结构化摘要 | 保留语义，远优于滑动窗口 |
| **双路径架构** | 云端模型用专用 API，开源版本用本地 LLM | 灵活性 + 可优化性 |
| **过滤 developer 消息** | 压缩结果中移除所有 developer role 消息 | 防止指令重复累积导致上下文膨胀 |
| **保留 undo 能力** | Ghost snapshots 在压缩后仍保留 | 用户体验不因压缩而降级 |
| **初始上下文注入** | mid-turn 时注入到最后一条用户消息前方 | 确保模型能看到最新的上下文设置 |

## 与其他 Agent 的对比

| Agent | 压缩机制 | 特点 |
|-------|----------|------|
| **OpenAI Codex** | 本地 LLM 摘要 + 远程 API compaction | 双路径，服务端可优化 |
| **Claude Code** | `/compact` 命令触发摘要 | 用户主动触发 |
| **Cursor** | 滑动窗口 + 摘要 | 编辑器集成 |

## 启发与思考

1. **Context compaction 是长任务 Agent 的核心基础设施** — 没有它，Agent 无法处理超过 context window 的任务
2. **"交接班"隐喻很有价值** — 将压缩视为 LLM 之间的工作交接，而非简单的信息丢弃
3. **远程 compaction 是差异化优势** — OpenAI 可以在服务端用专门模型/逻辑优化压缩质量
4. **保留可逆性** — Ghost snapshots 的设计表明，好的压缩不应牺牲用户的操作灵活性

## 参考资料

- [OpenAI Codex CLI 源码](https://github.com/openai/codex) — `codex-rs/core/src/compact_remote.rs`
- [Compaction prompt 模板](https://github.com/openai/codex/blob/main/codex-rs/core/templates/compact/prompt.md)
- [Codex API README](https://github.com/openai/codex/blob/main/codex-rs/codex-api/README.md)
