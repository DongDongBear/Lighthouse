---
title: Codex Context Compaction 机制深度分析
---

# Codex Context Compaction 机制深度分析

> **来源**: Kangwook Lee — [Investigating how Codex context compaction works](https://x.com/kangwook_lee/status/2028955292025962534)
> **日期**: 2026-03-03
> **标签**: `Agent` `Context Management` `OpenAI Codex` `Long-running Tasks`
> **源码版本**: 基于 [openai/codex](https://github.com/openai/codex) 开源仓库 Rust 实现

---

## 1. 问题背景：为什么需要 Context Compaction？

AI coding agent 在执行复杂编码任务时，对话历史会持续增长：

```
Turn 1: 用户请求 → Agent 读文件 → 分析 → 写代码 → 执行测试
Turn 2: 用户反馈 → Agent 再读文件 → 修改代码 → 再测试
Turn 3: ...
Turn N: Context window 已满，无法继续
```

每一轮对话都会积累大量内容：用户消息、assistant 回复、tool calls（读文件、执行命令）、tool outputs（文件内容、命令输出）、reasoning 过程等。当这些内容的 token 总量接近或超过模型的 context window（如 128K tokens），agent 就无法再正常工作。

**Context compaction 的目标**：在不丢失关键信息的前提下，将冗长的对话历史压缩为精简的摘要，释放 context window 空间，让 agent 能够继续工作。

---

## 2. 双路径架构：本地 vs 远程

Codex 根据所使用的模型提供者，采用**两种完全不同的压缩路径**：

### 2.1 路径选择逻辑

```rust
// codex-rs/core/src/compact.rs
pub(crate) fn should_use_remote_compact_task(provider: &ModelProviderInfo) -> bool {
    provider.is_openai()
}
```

判断逻辑非常简单：**如果是 OpenAI 提供的模型，走远程 compaction；否则走本地 compaction**。

### 2.2 本地 Compaction（非 OpenAI 模型）

当使用第三方模型（如 Ollama、LM Studio 等本地模型）时，Codex CLI 在本地完成压缩。

**流程详解**：

1. **构造压缩请求**：将 compaction prompt 作为用户输入，连同完整对话历史发送给当前模型
2. **模型生成摘要**：模型根据 compaction prompt 的指引，生成一份结构化的 handoff summary
3. **提取用户消息**：从原始历史中收集所有真实用户消息
4. **构建新历史**：用户消息（最近的，不超过 20,000 tokens）+ 摘要消息替换旧历史
5. **保留 ghost snapshots**：用于 `/undo` 功能
6. **发出警告**：提醒用户多次 compaction 可能降低模型准确性

**关键常量**：

```rust
const COMPACT_USER_MESSAGE_MAX_TOKENS: usize = 20_000;
```

本地 compaction 最多保留最近 20,000 tokens 的用户消息，超出部分从最早的开始截断。

**摘要构建流程**：

```rust
// 1. 收集用户消息（排除旧的摘要消息）
let user_messages = collect_user_messages(history_items);

// 2. 获取模型生成的摘要
let summary_suffix = get_last_assistant_message_from_turn(history_items);

// 3. 添加 summary_prefix（交接说明）
let summary_text = format!("{SUMMARY_PREFIX}\n{summary_suffix}");

// 4. 构建新历史 = 用户消息 + 摘要
let new_history = build_compacted_history(Vec::new(), &user_messages, &summary_text);
```

### 2.3 远程 Compaction（OpenAI 模型）

当使用 OpenAI 的模型时，压缩通过**服务端专用的 Compaction API** 完成。

**API Endpoint**：

```
POST /responses/compact
```

**请求体**（`CompactionInput`）：

```rust
pub struct CompactionInput<'a> {
    pub model: &'a str,           // 使用的模型名
    pub input: &'a [ResponseItem], // 完整的对话历史
    pub instructions: &'a str,     // 压缩指令（base instructions）
}
```

**响应体**（`CompactHistoryResponse`）：

```rust
struct CompactHistoryResponse {
    output: Vec<ResponseItem>,  // 压缩后的历史记录
}
```

**关键区别**：远程 compaction 不需要客户端自己做摘要，服务端直接返回压缩后的 `ResponseItem` 列表。OpenAI 可以在服务端使用专门优化的模型或算法来完成压缩，这是一个重要的差异化优势。

---

## 3. 两套 Prompt 模板

### 3.1 Compaction Prompt（压缩指令）

位于 `codex-rs/core/templates/compact/prompt.md`：

```markdown
You are performing a CONTEXT CHECKPOINT COMPACTION. Create a handoff 
summary for another LLM that will resume the task.

Include:
- Current progress and key decisions made
- Important context, constraints, or user preferences
- What remains to be done (clear next steps)
- Any critical data, examples, or references needed to continue

Be concise, structured, and focused on helping the next LLM seamlessly 
continue the work.
```

这个 prompt 将压缩框架为 **"LLM 之间的工作交接"**——不是简单地删除信息，而是让一个 LLM 为下一个 LLM 写一份交接文档。

### 3.2 Summary Prefix（摘要前缀）

位于 `codex-rs/core/templates/compact/summary_prefix.md`：

```markdown
Another language model started to solve this problem and produced a 
summary of its thinking process. You also have access to the state of 
the tools that were used by that language model. Use this to build on 
the work that has already been done and avoid duplicating work. Here is 
the summary produced by the other language model, use the information 
in this summary to assist with your own analysis:
```

这段前缀添加在摘要文本之前，告诉接续的 LLM：
- 之前有另一个 LLM 已经开始处理这个问题了
- 以下是它的思考过程摘要
- 你可以直接使用它的工作成果，避免重复劳动

这种设计非常巧妙——它建立了一种 **"LLM 接力赛"** 的认知框架。

---

## 4. 触发机制

### 4.1 自动触发（Auto-compaction）

Codex 支持基于 token 使用量的自动压缩：

```rust
// config/mod.rs
/// Token usage threshold triggering auto-compaction of conversation history.
pub model_auto_compact_token_limit: Option<i64>,
```

用户可以在 `config.toml` 中配置 `model_auto_compact_token_limit`，当 token 使用量达到该阈值时自动触发 compaction。

自动压缩有两种时机：

| 类型 | 触发时间 | InitialContextInjection | 说明 |
|------|----------|------------------------|------|
| **Pre-turn** | 新对话轮次开始前 | `DoNotInject` | 压缩后清除 reference context，下一轮重新注入 |
| **Mid-turn** | 对话进行中 | `BeforeLastUserMessage` | 压缩后在最后一条用户消息前注入初始上下文 |

### 4.2 手动触发

用户可以通过 app-server 的 `thread/compact/start` 命令手动触发压缩。

### 4.3 上下文窗口溢出时的自适应裁剪

当即使是 compaction 本身的请求也超出 context window 时，Codex 会逐步从历史最前面移除记录：

```rust
Err(e @ CodexErr::ContextWindowExceeded) => {
    if turn_input_len > 1 {
        // 从最前面裁剪，保留缓存前缀和最近的消息
        history.remove_first_item();
        truncated_count += 1;
        retries = 0;
        continue;
    }
    // ...
}
```

这是一个优雅的降级策略：先尝试完整压缩，如果连压缩请求都太大了，就逐步删除最老的记录直到能放下。

---

## 5. 历史过滤机制（远程 Compaction）

远程 compaction 返回的结果会经过严格的过滤（`should_keep_compacted_history_item`）：

```rust
fn should_keep_compacted_history_item(item: &ResponseItem) -> bool {
    match item {
        // ❌ 丢弃所有 developer 消息（防止指令重复累积）
        ResponseItem::Message { role, .. } if role == "developer" => false,
        
        // ✅ 保留真实的 user 消息（经过 parse_turn_item 验证）
        ResponseItem::Message { role, .. } if role == "user" => {
            matches!(
                parse_turn_item(item),
                Some(TurnItem::UserMessage(_))
            )
        },
        
        // ✅ 保留 assistant 消息
        ResponseItem::Message { role, .. } if role == "assistant" => true,
        
        // ❌ 丢弃其他角色的消息
        ResponseItem::Message { .. } => false,
        
        // ✅ 保留 compaction 记录
        ResponseItem::Compaction { .. } => true,
        
        // ❌ 丢弃所有工具调用相关内容
        ResponseItem::Reasoning { .. }
        | ResponseItem::LocalShellCall { .. }
        | ResponseItem::FunctionCall { .. }
        | ResponseItem::FunctionCallOutput { .. }
        | ResponseItem::CustomToolCall { .. }
        | ResponseItem::CustomToolCallOutput { .. }
        | ResponseItem::WebSearchCall { .. }
        | ResponseItem::GhostSnapshot { .. }
        | ResponseItem::Other => false,
    }
}
```

**设计意图解析**：

- **丢弃 developer 消息**：远程 compaction 可能返回陈旧或重复的系统指令，过滤掉避免指令膨胀
- **验证 user 消息**：不是所有 `role=user` 的消息都是真正的用户输入，有些是系统注入的前缀/指令包装器
- **丢弃 tool calls**：工具调用和输出通常占据大量 tokens（如读取的文件内容），压缩后不需要保留原始内容
- **保留 Compaction 记录**：允许嵌套压缩，保留压缩链的可追溯性

---

## 6. Compaction 数据模型

### 6.1 ResponseItem::Compaction

```rust
#[serde(alias = "compaction_summary")]
Compaction {
    encrypted_content: String,
}
```

压缩项的内容是**加密的**（`encrypted_content`），这意味着：
- 客户端无法查看或修改压缩内容
- 服务端可以在后续请求中解密和利用这些信息
- 这是 OpenAI 保护模型训练数据和压缩算法的一种方式

### 6.2 CompactedItem（客户端状态）

```rust
pub struct CompactedItem {
    pub message: String,                         // 摘要文本
    pub replacement_history: Option<Vec<ResponseItem>>, // 替换后的历史
}
```

### 6.3 Ghost Snapshot 保留

```rust
// 从旧历史中提取所有 ghost snapshots
let ghost_snapshots: Vec<ResponseItem> = history_items
    .iter()
    .filter(|item| matches!(item, ResponseItem::GhostSnapshot { .. }))
    .cloned()
    .collect();

// 追加到新历史末尾
new_history.extend(ghost_snapshots);
```

Ghost snapshots 记录了代码变更的快照，用于支持 `/undo` 功能。即使对话历史被压缩，用户仍然可以回退代码变更。

---

## 7. 初始上下文注入（Initial Context Injection）

这是 compaction 中最精细的设计之一。压缩后需要重新注入"初始上下文"（如当前工作目录、文件状态等），但注入位置取决于压缩时机：

```rust
pub(crate) enum InitialContextInjection {
    BeforeLastUserMessage,  // Mid-turn: 注入到最后一条用户消息前
    DoNotInject,            // Pre-turn: 不注入，下一轮自动注入
}
```

**注入位置优先级**：

```rust
pub(crate) fn insert_initial_context_before_last_real_user_or_summary(
    mut compacted_history: Vec<ResponseItem>,
    initial_context: Vec<ResponseItem>,
) -> Vec<ResponseItem> {
    // 优先级：
    // 1. 最后一条真实用户消息之前
    // 2. 最后一条摘要消息之前
    // 3. 最后一条 compaction 记录之前
    // 4. 追加到末尾（兜底）
}
```

这样设计是因为：
- **Mid-turn compaction** 后模型立即需要继续工作，必须能看到最新的上下文状态
- **Pre-turn compaction** 后有一个新轮次的开始，初始上下文会在新轮次自动注入
- 压缩摘要需要保持在历史的最后位置，因为模型被训练为预期看到这种排列

---

## 8. Token 使用量追踪

Codex 维护了精细的 token 使用量追踪，用于判断何时需要触发 compaction：

```rust
pub(crate) struct TotalTokenUsageBreakdown {
    // 最后一次 API 响应报告的总 token 数
    pub last_api_response_total_tokens: i64,
    
    // 所有历史项的可见字节数（估算）
    pub all_history_items_model_visible_bytes: i64,
    
    // 最后一次成功 API 响应之后新增项的估算 token 数
    pub estimated_tokens_of_items_added_since_last_successful_api_response: i64,
    
    // 最后一次成功 API 响应之后新增项的估算字节数
    pub estimated_bytes_of_items_added_since_last_successful_api_response: i64,
}
```

这种分层追踪使得 Codex 能够准确判断当前的 context window 使用情况，而不仅仅依赖服务端返回的 token 数。

---

## 9. 错误处理与重试

Compaction 过程有完善的错误处理：

```rust
// 最大重试次数由 provider 配置决定
let max_retries = turn_context.provider.stream_max_retries();

loop {
    match attempt_result {
        Ok(()) => break,  // 成功
        
        Err(CodexErr::Interrupted) => return Err(..),  // 用户中断，立即停止
        
        Err(CodexErr::ContextWindowExceeded) => {
            // 上下文溢出：逐步裁剪最老的记录
            history.remove_first_item();
            truncated_count += 1;
        },
        
        Err(e) => {
            if retries < max_retries {
                // 其他错误：指数退避重试
                let delay = backoff(retries);
                tokio::time::sleep(delay).await;
            } else {
                return Err(e);  // 重试耗尽
            }
        }
    }
}
```

远程 compaction 的错误处理还包括详细的日志记录，用于诊断失败原因。

---

## 10. Compaction 后的用户警告

每次本地 compaction 完成后，Codex 都会向用户发出警告：

```rust
let warning = EventMsg::Warning(WarningEvent {
    message: "Heads up: Long threads and multiple compactions can cause 
    the model to be less accurate. Start a new thread when possible to 
    keep threads small and targeted.".to_string(),
});
```

这反映了一个重要的工程现实：**compaction 是有损的**。每次压缩都会丢失一些信息，多次压缩会导致信息累积衰减。最佳实践是尽可能保持对话线程短小精悍。

---

## 11. 与其他 Agent 的对比

| 特性 | OpenAI Codex | Claude Code | Cursor |
|------|-------------|-------------|--------|
| **压缩方式** | LLM 摘要 + 远程 API | `/compact` 命令触发摘要 | 滑动窗口 + 摘要 |
| **自动触发** | ✅ 基于 token 阈值 | ❌ 手动触发 | ✅ 自动 |
| **服务端优化** | ✅ 专用 API endpoint | ❌ 本地处理 | ❌ 本地处理 |
| **加密内容** | ✅ encrypted_content | ❌ | ❌ |
| **保留 undo** | ✅ ghost snapshots | ❌ | ❌ |
| **多次压缩警告** | ✅ | ❌ | ❌ |
| **用户消息保留** | ✅ 最近 20K tokens | 不确定 | 不确定 |

---

## 12. 关键设计洞察与启发

### 12.1 "LLM 接力赛" 隐喻

Codex 的 compaction 设计本质上是一种 **LLM 接力赛**：
- 前一段对话的 LLM 通过 compaction prompt 生成"交接文档"
- summary_prefix 告诉接续 LLM "之前有人已经做了一部分"
- 新 LLM 基于交接文档和最近的用户消息继续工作

这比简单的"截断旧消息"要高明得多，因为它保留了**语义信息**而非**原始文本**。

### 12.2 远程 Compaction 是战略优势

远程 compaction API 让 OpenAI 可以：
- 使用专门训练的压缩模型
- 在不更新客户端的情况下持续改进压缩质量
- 通过 `encrypted_content` 保护压缩算法的实现细节
- 利用服务端资源做更复杂的分析

### 12.3 信息保留的优先级

从代码可以看出信息保留的优先级：
1. **Ghost snapshots**（代码变更快照）— 最高优先级，始终保留
2. **用户消息** — 保留最近 20K tokens
3. **Assistant 摘要** — 通过 LLM 生成
4. **Tool calls/outputs** — 最低优先级，压缩后丢弃

这符合直觉：用户说了什么和代码改了什么最重要，具体的文件读取和命令执行过程可以丢弃。

### 12.4 Compaction 是有损的

Codex 通过显式警告提醒用户：多次 compaction 会降低准确性。这是一个重要的工程诚实——承认有损压缩的局限性，引导用户采用更好的实践（保持线程短小）。

### 12.5 可自定义的 Compact Prompt

```rust
/// Compact prompt override.
pub compact_prompt: Option<String>,
```

用户可以在 `config.toml` 中自定义 compaction prompt，这为高级用户提供了调优压缩行为的能力。

---

## 13. 参考资料

**源码文件**：
- [`codex-rs/core/src/compact.rs`](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs) — 本地 compaction 核心逻辑
- [`codex-rs/core/src/compact_remote.rs`](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact_remote.rs) — 远程 compaction 逻辑
- [`codex-rs/codex-api/src/endpoint/compact.rs`](https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/endpoint/compact.rs) — Compaction API 客户端
- [`codex-rs/codex-api/src/common.rs`](https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/common.rs) — CompactionInput 数据结构
- [`codex-rs/core/templates/compact/prompt.md`](https://github.com/openai/codex/blob/main/codex-rs/core/templates/compact/prompt.md) — Compaction prompt 模板
- [`codex-rs/core/templates/compact/summary_prefix.md`](https://github.com/openai/codex/blob/main/codex-rs/core/templates/compact/summary_prefix.md) — Summary prefix 模板
- [`codex-rs/protocol/src/models.rs`](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/models.rs) — ResponseItem 数据模型
- [`codex-rs/core/src/context_manager/history.rs`](https://github.com/openai/codex/blob/main/codex-rs/core/src/context_manager/history.rs) — 历史管理与 token 追踪
- [`codex-rs/core/src/config/mod.rs`](https://github.com/openai/codex/blob/main/codex-rs/core/src/config/mod.rs) — 配置项定义

**原文链接**：
- [Kangwook Lee: Investigating how Codex context compaction works](https://x.com/kangwook_lee/status/2028955292025962534)
