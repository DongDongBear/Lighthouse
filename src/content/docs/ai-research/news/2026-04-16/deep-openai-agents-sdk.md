---
title: "深度解读 | OpenAI Agents SDK 重大演进：从 Codex 内部架构到开源 Agent 基础设施"
description: "OpenAI Agents SDK, Agent 沙箱, Credential Vault, MCP, 持久会话, 崩溃恢复, 多Agent编排, 开源, Python, TypeScript"
---

> 2026-04-16 · 深度解读 · 编辑：Lighthouse

---

## 速查卡

| 维度 | 内容 |
|------|------|
| **一句话总结** | OpenAI 将 Codex 的内部 Agent 运行架构（沙箱执行、崩溃恢复、凭证隔离）完整开源到 Agents SDK，使任何开发者都能构建具备生产级健壮性的自主 Agent |
| **大白话版** | 以前搭一个靠谱的 AI Agent 要自己搞沙箱、处理崩溃、管密钥，现在 OpenAI 把 Codex 内部用的全套"Agent 操作系统"开源了——装好 SDK，Agent 就能在隔离容器里跑代码、挂了自动恢复、调 API 还看不到你的密码 |
| **核心数字** | 4 大核心能力（原生沙箱 / 持久会话 / Credential Vault / MCP 集成）；Python + TypeScript 双 SDK；完整开源 |
| **影响评级** | **S** — 范式级事件。Agent 基础设施从"各家自建"进入"开源标准化"阶段，与同周 Google Gemini CLI Subagents、Anthropic Claude Code Agent tool 形成三足鼎立 |
| **代码** | [github.com/openai/openai-agents-python](https://github.com/openai/openai-agents-python) / `pip install openai-agents` |

---

## 文章背景

### 为什么这次更新是一件大事

2025 年底到 2026 年初，AI 行业的竞争焦点已经从"谁的模型最聪明"转向"谁的 Agent 跑得最稳"。模型能力趋于同质化，真正的差异化发生在 Agent 基础设施层——即 Agent 如何被执行、如何与外部世界交互、如何在失败后恢复。

这正是 OpenAI 过去一年在 Codex 产品中反复打磨的核心问题。Codex 作为 OpenAI 的旗舰编码 Agent，在生产环境中积累了大量关于 Agent 运行时的工程经验：

- **沙箱执行**：Agent 必须在隔离环境中运行代码，防止对宿主系统造成破坏
- **崩溃恢复**：长时间运行的 Agent 任务不可避免地会遇到中断（网络超时、容器重启、模型 API 抖动），必须能从断点恢复
- **凭证安全**：Agent 需要代表用户调用外部 API，但绝不能"看到"或提取用户的凭证
- **工具集成**：Agent 需要灵活接入各种第三方工具，且接入方式需要标准化

过去，这些都是各公司的内部工程问题。OpenAI 把 Codex 内部解决这些问题的架构——他们称之为"model-native harness"（模型原生运行线束）——完整开源到了 Agents SDK 中。

### 发布时间线上的信号

这次更新发布于 2026 年 4 月 15 日，恰好与以下事件同周发生：

- **Google Gemini CLI Subagents**：Google 在 Gemini CLI 中推出子 Agent 编排能力
- **Anthropic Claude Code Agent tool**：Anthropic 为 Claude Code 增加 Agent 工具调用能力

三大 AI 公司在同一周集中发力 Agent 基础设施，这不是巧合——而是说明行业对"Agent 运行时"这一层的共识已经形成。2026 年 Q2 的竞争焦点，就是 Agent 基础设施。

### 谁在维护

OpenAI Agents SDK 由 OpenAI 的 Agent Platform 团队维护，Python SDK 托管在 [github.com/openai/openai-agents-python](https://github.com/openai/openai-agents-python)，TypeScript SDK 托管在对应的 GitHub 仓库。整个 SDK 完全开源。

---

## 完整内容还原

### 一、SDK 定位与核心抽象

OpenAI 将 Agents SDK 定义为一个"code-first"的 Agent 开发框架，目标是让 Agent 能够"规划、调用工具、跨专家协作、并保持足够的状态以完成多步工作"。

这个定位暗含了一个关键判断：**Agent 不是一次性的 prompt-response，而是一个需要运行时支撑的持续进程。** 这与传统的 LLM 应用开发（发一个请求、拿一个回复）有本质区别。

SDK 的核心抽象层包括：

| 抽象 | 角色 | 类比 |
|------|------|------|
| **Agent** | 绑定了指令和工具的 LLM 实例 | 一个有明确职责的"员工" |
| **Runtime Loop** | 流式执行 + 续接的运行循环 | Agent 的"心跳"——持续运行直到任务完成 |
| **Handoff** | Agent 之间的任务委托机制 | "我搞不定这个，转给专家" |
| **Guardrails** | 输入/输出验证的防护栏 | Agent 的"安检门" |
| **Sandbox** | 隔离的代码执行环境 | Agent 的"工作间"——可以随便折腾但不影响外面 |
| **Credential Vault** | 凭证代理层 | Agent 的"保险柜"——能用钥匙开门但拿不走钥匙 |

#### 最简 Agent 定义

```python
from openai_agents import Agent, Runner

agent = Agent(
    name="research_assistant",
    instructions="你是一个研究助手。根据用户的问题搜索相关资料并给出结构化的回答。",
    tools=["web_search", "file_reader"],
)

result = Runner.run_sync(agent, "量子计算在密码学领域的最新进展是什么？")
print(result.final_output)
```

这段代码展示了 SDK 的设计哲学：**用最少的代码定义一个功能完整的 Agent。** `Agent` 类封装了 LLM、指令和工具三要素；`Runner` 负责执行循环；开发者不需要手动处理工具调用的 JSON 解析、重试逻辑或上下文管理。

### 二、原生沙箱支持——Agent 的隔离工作间

这是本次更新最重要的新能力。Agent 现在可以在隔离的云容器中执行代码和文件操作，彻底解决了"Agent 在宿主机上乱跑代码"的安全隐患。

#### 沙箱的架构设计

沙箱基于容器技术实现，提供以下隔离能力：

| 能力 | 说明 |
|------|------|
| **文件系统** | Agent 拥有独立的文件系统，可自由读写，不影响宿主 |
| **命令执行** | Agent 可以运行 shell 命令，包括安装包、编译代码等 |
| **包管理** | Agent 可以安装任意依赖（pip、npm、apt 等） |
| **端口映射** | Agent 可以启动 Web 服务并暴露端口供预览 |
| **快照** | 容器状态可以被快照保存和恢复 |
| **内存隔离** | 容器有独立的内存空间，防止资源泄露 |

#### Manifest 文件定义沙箱环境

沙箱通过 manifest 文件声明式地定义所需环境：

```python
from openai_agents import Agent, SandboxConfig

sandbox_config = SandboxConfig(
    runtime="docker",  # 或 "cloud", "unix_local"
    manifest={
        "base_image": "python:3.12-slim",
        "packages": ["numpy", "pandas", "matplotlib", "scikit-learn"],
        "files": {
            "data/train.csv": "./local_data/train.csv",
            "config.yaml": "./configs/model_config.yaml",
        },
        "env": {
            "PYTHONPATH": "/workspace",
        },
    },
)

data_scientist = Agent(
    name="data_scientist",
    instructions="你是一个数据科学家。分析给定的数据集，生成可视化报告。",
    sandbox=sandbox_config,
)
```

这种设计的深意在于：**沙箱环境是可复现的。** manifest 文件本质上是一份"环境配方"，可以版本控制、团队共享、在 CI/CD 中自动化构建。

#### 三种运行模式

SDK 支持三种沙箱运行模式，覆盖从本地开发到云端生产的全场景：

```python
# 模式 1: Unix 本地（开发调试用）
sandbox_local = SandboxConfig(runtime="unix_local")

# 模式 2: Docker（团队开发 / CI 环境）
sandbox_docker = SandboxConfig(runtime="docker")

# 模式 3: 云容器（生产环境）
sandbox_cloud = SandboxConfig(runtime="cloud")
```

**Unix 本地模式**直接在当前系统上运行，零开销但无隔离——适合快速迭代；**Docker 模式**在本地 Docker 容器中运行，有完整隔离但需要 Docker 环境；**云容器模式**在 OpenAI 托管的云环境中运行，提供最高级别的隔离和可扩展性。

#### 可恢复执行（Resumable Execution）

沙箱最强大的特性之一是可恢复执行。当 Agent 执行中断（无论是网络超时、容器 OOM 还是人为暂停），SDK 会保存执行快照，并在恢复时从断点继续：

```python
from openai_agents import Agent, Runner, SandboxConfig

agent = Agent(
    name="long_running_analyst",
    instructions="对这个大型代码库进行完整的安全审计。",
    sandbox=SandboxConfig(
        runtime="cloud",
        snapshot_interval=300,  # 每 5 分钟自动快照
    ),
)

# 启动执行
run = Runner.run_async(agent, "审计 /workspace/src 下的所有 Python 文件")

# ... 中间发生了中断 ...

# 从快照恢复
resumed_run = Runner.resume(run.id)
result = await resumed_run.wait()
```

这个能力直接来自 Codex 的生产经验：编码 Agent 经常需要运行数十分钟甚至数小时，中途中断是家常便饭。没有快照恢复，一次中断就意味着从头开始，这在生产环境中是不可接受的。

### 三、持久会话日志——Agent 的"记忆系统"

Agent 的状态管理是一个被严重低估的问题。传统做法是把所有上下文塞进 prompt，但这既浪费 token 又有上下文窗口限制。Agents SDK 提供了结构化的会话持久化机制。

#### 多种存储后端

SDK 内置了多种会话存储实现，开发者可以根据场景选择：

```python
from openai_agents import Agent, SessionConfig

# SQLite（单机开发，最简单）
session_sqlite = SessionConfig(
    backend="sqlite",
    path="./agent_sessions.db",
)

# Redis（分布式部署，低延迟）
session_redis = SessionConfig(
    backend="redis",
    url="redis://localhost:6379/0",
)

# SQLAlchemy（企业级，支持 PostgreSQL / MySQL 等）
session_sqlalchemy = SessionConfig(
    backend="sqlalchemy",
    url="postgresql://user:pass@host:5432/agents",
)

# Dapr（云原生微服务架构）
session_dapr = SessionConfig(
    backend="dapr",
    store_name="agent-state-store",
)

# 加密变体（敏感场景）
session_encrypted = SessionConfig(
    backend="sqlite_encrypted",
    path="./secure_sessions.db",
    encryption_key="your-256-bit-key",
)
```

#### 崩溃恢复的工作原理

持久会话的核心价值不在于"记住对话历史"，而在于**崩溃后的自动恢复**。工作流程如下：

1. Agent 每完成一个工具调用，将当前状态（包括对话历史、工具调用结果、中间变量）写入存储
2. 如果 Agent 进程崩溃（OOM、网络中断、容器被回收等），状态仍然安全保存在存储中
3. 新进程启动后，SDK 自动从存储中加载最近的状态，重建上下文
4. Agent 从中断点继续执行，无需从头开始

```python
from openai_agents import Agent, Runner, SessionConfig

agent = Agent(
    name="project_manager",
    instructions="你是项目经理。管理一个跨多个仓库的功能开发任务。",
    session=SessionConfig(backend="redis", url="redis://localhost:6379/0"),
)

# 第一次运行——Agent 完成了前 3 个子任务后崩溃
run = Runner.run_async(agent, "实现用户认证功能，涉及 auth-service、api-gateway、frontend 三个仓库")

# ... 进程崩溃 ...

# 恢复运行——Agent 自动知道前 3 个子任务已完成，继续第 4 个
recovered_run = Runner.resume(run.session_id)
```

这种设计暗含了一个重要的架构选择：**Agent 的状态不在内存中，而在外部存储中。** 这意味着 Agent 进程是无状态的、可替换的——你可以在任何机器上恢复一个 Agent 的执行，只要它能访问同一个存储后端。这是微服务架构思想在 Agent 领域的直接应用。

### 四、Credential Vault——Agent 的"保险柜"

这是本次更新中架构设计最精妙的部分。Credential Vault 从根本上解决了一个困扰 Agent 安全领域的核心问题：**Agent 需要代表用户调用外部 API，但 Agent 本身不应该持有用户的凭证。**

#### 问题的本质

传统做法是把 API Key 作为环境变量传给 Agent：

```python
# ❌ 危险做法：Agent 可以读取环境变量中的密钥
import os
api_key = os.environ["GITHUB_TOKEN"]
# Agent 现在"知道"了你的 GitHub Token
# 如果 Agent 被 prompt injection 攻击，密钥可能被泄露
```

这种方式的根本缺陷是：一旦密钥进入了 Agent 的运行环境（无论是环境变量、文件还是 prompt），Agent 就有能力读取、记忆甚至泄露这些密钥。这不是一个可以通过"告诉 Agent 不要泄露密钥"来解决的问题——prompt 指令不是安全边界。

#### Credential Vault 的架构

Credential Vault 采用了代理层（Proxy Layer）架构：

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│                  │      │                  │      │                 │
│   Agent          │─────▶│  Credential      │─────▶│  External API   │
│   (沙箱内)       │ 请求  │  Vault Proxy     │ 注入  │  (GitHub, etc.) │
│                  │◀─────│  (沙箱外)         │◀─────│                 │
│  看不到凭证      │ 响应  │  持有凭证         │ 响应  │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

关键设计点：

1. **凭证永不进入沙箱**：API Key、OAuth Token 等敏感信息存储在 Credential Vault 中，位于沙箱之外
2. **Agent 通过代理层访问外部服务**：Agent 发出的 HTTP 请求被拦截，由代理层注入凭证后转发
3. **Agent 只能"使用"凭证，不能"看到"凭证**：从 Agent 的视角，它只是调用了一个 API，但它无法获知请求中携带了什么凭证

#### 使用方式

```python
from openai_agents import Agent, CredentialVault

# 配置 Credential Vault
vault = CredentialVault()
vault.register("github", token="ghp_xxxxxxxxxxxx", scopes=["repo", "issues"])
vault.register("slack", token="xoxb-xxxxxxxxxxxx", scopes=["chat:write"])
vault.register("aws", access_key="AKIA...", secret_key="...", region="us-east-1")

agent = Agent(
    name="devops_agent",
    instructions="""你是 DevOps 助手。你可以：
    - 通过 GitHub API 管理仓库和 Issue
    - 通过 Slack API 发送通知
    - 通过 AWS API 管理云资源
    注意：你不需要也不应该尝试获取 API 密钥，所有认证由系统自动处理。""",
    credential_vault=vault,
    sandbox=SandboxConfig(runtime="cloud"),
)

# Agent 可以调用 GitHub API，但永远看不到 ghp_xxxxxxxxxxxx
result = Runner.run_sync(agent, "在 openai/agents-sdk 仓库创建一个 Issue，报告沙箱快照功能的性能问题")
```

#### 权限粒度控制

Credential Vault 不仅隔离凭证，还支持细粒度的权限控制：

```python
vault.register(
    "github",
    token="ghp_xxxxxxxxxxxx",
    scopes=["repo:read", "issues:write"],  # 只允许读仓库、写 Issue
    allowed_endpoints=[
        "GET /repos/*",
        "POST /repos/*/issues",
    ],  # 只允许特定 API 端点
    rate_limit=100,  # 每分钟最多 100 次调用
)
```

这种设计遵循了最小权限原则：Agent 只能访问完成任务所需的最小资源集合。即使 Agent 被 prompt injection 攻击，攻击者能造成的损害也被严格限制在预设的权限范围内。

### 五、MCP 工具集成——标准化的工具接口

Model Context Protocol (MCP) 是一个正在成为行业标准的协议，定义了 LLM 与外部工具之间的通信接口。OpenAI Agents SDK 对 MCP 的原生支持，意味着任何实现了 MCP 协议的第三方工具都可以无缝接入 Agent。

#### MCP 与 Function Tools 的区别

SDK 支持两种工具接入方式：

```python
from openai_agents import Agent, function_tool
from openai_agents.mcp import MCPServerStdio, MCPServerStreamableHTTP

# 方式 1: Function Tools（SDK 原生，适合自定义工具）
@function_tool
def calculate_compound_interest(
    principal: float,
    rate: float,
    years: int,
    compounds_per_year: int = 12,
) -> float:
    """计算复利。参数自动生成 JSON Schema，通过 Pydantic 验证。"""
    return principal * (1 + rate / compounds_per_year) ** (compounds_per_year * years)

# 方式 2: MCP Server（标准协议，适合第三方工具）
mcp_filesystem = MCPServerStdio(
    command="npx",
    args=["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
)

mcp_database = MCPServerStreamableHTTP(
    url="http://localhost:8080/mcp",
)

agent = Agent(
    name="full_stack_agent",
    instructions="你是全栈开发助手。",
    tools=[calculate_compound_interest],  # Function Tools
    mcp_servers=[mcp_filesystem, mcp_database],  # MCP Servers
)
```

**Function Tools** 更轻量，适合开发者自定义的简单工具——装饰器 `@function_tool` 会自动从函数签名生成 JSON Schema，通过 Pydantic 做参数验证。**MCP Servers** 更重量但更标准化，适合接入已有的第三方服务生态。

#### MCP 集成的实际价值

MCP 的引入解决了一个实际问题：**工具碎片化**。在 MCP 之前，每个 Agent 框架都定义了自己的工具接口（LangChain 的 Tool、AutoGPT 的 Command、CrewAI 的 Tool），工具作者需要为每个框架分别适配。MCP 提供了一个统一的协议层，工具只需要实现一次 MCP 接口，就能被所有支持 MCP 的框架使用。

当前已有大量 MCP Server 实现覆盖常见场景：

| MCP Server | 能力 |
|------------|------|
| `@modelcontextprotocol/server-filesystem` | 文件读写、目录浏览 |
| `@modelcontextprotocol/server-github` | GitHub 仓库、Issue、PR 操作 |
| `@modelcontextprotocol/server-postgres` | PostgreSQL 数据库查询 |
| `@modelcontextprotocol/server-slack` | Slack 消息收发 |
| `@modelcontextprotocol/server-brave-search` | Brave 搜索引擎 |
| `@modelcontextprotocol/server-puppeteer` | 浏览器自动化 |

### 六、多 Agent 编排——Handoff 与 Manager 两种范式

复杂任务往往需要多个 Agent 协作。Agents SDK 提供了两种编排范式：**Handoff（委托）** 和 **Manager（管理者）**。

#### Handoff 模式：平级委托

Handoff 是一种点对点的任务委托机制。当一个 Agent 判断当前任务超出自己的能力范围时，它可以将任务交给更专业的 Agent：

```python
from openai_agents import Agent, Handoff

# 定义专家 Agent
code_reviewer = Agent(
    name="code_reviewer",
    instructions="你是代码审查专家。审查代码的正确性、性能和安全性。",
)

test_writer = Agent(
    name="test_writer",
    instructions="你是测试专家。为给定的代码编写全面的单元测试和集成测试。",
)

doc_writer = Agent(
    name="doc_writer",
    instructions="你是文档专家。为给定的代码编写清晰的 API 文档和使用示例。",
)

# 主 Agent 可以将任务委托给专家
lead_developer = Agent(
    name="lead_developer",
    instructions="""你是技术负责人。评估任务类型，分配给合适的专家：
    - 代码质量问题 → 转给代码审查专家
    - 需要编写测试 → 转给测试专家
    - 需要编写文档 → 转给文档专家""",
    handoffs=[
        Handoff(target=code_reviewer),
        Handoff(target=test_writer),
        Handoff(target=doc_writer),
    ],
)
```

Handoff 的执行是同步的：当 `lead_developer` 将任务委托给 `code_reviewer` 时，控制权完全转移，`code_reviewer` 的输出成为最终结果。这种模式适合**线性流水线**型的工作流。

#### Manager 模式：集中编排

Manager 模式由一个"管理者" Agent 集中协调多个"下属" Agent，适合**并行** 或 **迭代** 型的工作流：

```python
from openai_agents import Agent, Runner

frontend_dev = Agent(
    name="frontend_dev",
    instructions="你是前端开发者。实现 React 组件和页面。",
    sandbox=SandboxConfig(runtime="docker"),
)

backend_dev = Agent(
    name="backend_dev",
    instructions="你是后端开发者。实现 API 端点和业务逻辑。",
    sandbox=SandboxConfig(runtime="docker"),
)

qa_engineer = Agent(
    name="qa_engineer",
    instructions="你是 QA 工程师。测试前后端的集成，报告 Bug。",
    sandbox=SandboxConfig(runtime="docker"),
)

# Manager Agent 编排整个流程
project_manager = Agent(
    name="project_manager",
    instructions="""你是项目经理。管理一个功能的完整开发流程：
    1. 分析需求，分解为前端和后端任务
    2. 分别派发给前端和后端开发者
    3. 收集两端的产出，交给 QA 测试
    4. 如果 QA 发现问题，将 Bug 发回对应开发者修复
    5. 重复直到 QA 通过""",
    team=[frontend_dev, backend_dev, qa_engineer],
)

result = Runner.run_sync(
    project_manager,
    "实现一个用户注册功能：前端表单 + 后端 API + 邮箱验证"
)
```

Manager 模式的强大之处在于**迭代能力**：管理者 Agent 可以反复派发任务、收集结果、做出判断，直到满足完成条件。这使得多 Agent 系统能够处理开放式、迭代式的复杂任务。

### 七、Agent Loop——模型驱动的执行循环

Agent Loop 是 SDK 的核心引擎，它实现了一个"模型驱动的循环"（model-driven loop）：

```
┌──────────────────────────────────────────────────────────┐
│                     Agent Loop                            │
│                                                          │
│  ┌──────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │ 接收  │───▶│ 模型推理  │───▶│ 工具调用  │───▶│ 结果   │ │
│  │ 输入  │    │ (LLM)    │    │ (Tools)  │    │ 返回   │ │
│  └──────┘    └──────────┘    └──────────┘    └────────┘ │
│       ▲                                          │       │
│       │              继续循环                      │       │
│       └──────────────────────────────────────────┘       │
│                                                          │
│  退出条件：模型返回最终文本响应（无工具调用）                    │
└──────────────────────────────────────────────────────────┘
```

执行流程：

1. Agent 接收用户输入
2. LLM 根据指令、工具列表和上下文生成响应
3. 如果响应包含工具调用 → 执行工具 → 将结果反馈给 LLM → 回到步骤 2
4. 如果响应是纯文本（无工具调用） → 循环结束，返回最终结果

这种"模型驱动"的设计意味着：**是模型自己决定何时调用工具、调用哪个工具、何时结束任务。** SDK 不做任何硬编码的流程控制，只提供循环骨架和工具执行能力。

#### 流式执行与续接

Agent Loop 支持流式输出和中断续接：

```python
from openai_agents import Agent, Runner

agent = Agent(
    name="writer",
    instructions="你是一个技术文章写手。",
)

# 流式执行——实时获取输出
async for event in Runner.run_stream(agent, "写一篇关于 Rust 所有权系统的技术文章"):
    if event.type == "text_delta":
        print(event.delta, end="", flush=True)
    elif event.type == "tool_call":
        print(f"\n[调用工具: {event.tool_name}]")
    elif event.type == "tool_result":
        print(f"[工具返回: {event.result[:100]}...]")
```

### 八、Guardrails——Agent 的安检门

Guardrails 是一种并行运行的输入验证机制，可以在 Agent 处理用户输入之前拦截不合规的请求：

```python
from openai_agents import Agent, Guardrail, GuardrailResult

class ContentPolicyGuardrail(Guardrail):
    """检查用户输入是否违反内容政策。"""

    async def check(self, input: str) -> GuardrailResult:
        # 可以调用内容审核 API，或使用本地分类器
        if self._contains_harmful_content(input):
            return GuardrailResult(
                passed=False,
                reason="输入包含有害内容，已被拦截。",
            )
        return GuardrailResult(passed=True)

class PromptInjectionGuardrail(Guardrail):
    """检测 prompt injection 攻击。"""

    async def check(self, input: str) -> GuardrailResult:
        injection_patterns = [
            "ignore previous instructions",
            "you are now",
            "system prompt:",
        ]
        for pattern in injection_patterns:
            if pattern.lower() in input.lower():
                return GuardrailResult(
                    passed=False,
                    reason="检测到疑似 prompt injection 攻击。",
                )
        return GuardrailResult(passed=True)

agent = Agent(
    name="customer_service",
    instructions="你是客服助手。",
    guardrails=[
        ContentPolicyGuardrail(),
        PromptInjectionGuardrail(),
    ],
)
```

关键设计：**Guardrails 并行执行，fail-fast。** 多个 Guardrail 同时运行，任何一个失败即立即拒绝请求，不需要等待所有 Guardrail 完成。这保证了安全检查不会成为延迟瓶颈。

### 九、Human-in-the-Loop——人类介入机制

在某些高风险操作中，Agent 需要在执行前获得人类确认：

```python
from openai_agents import Agent, HumanApproval

agent = Agent(
    name="deployment_agent",
    instructions="你是部署助手。帮助用户完成应用的构建、测试和部署。",
    human_approval=HumanApproval(
        required_for=[
            "deploy_to_production",     # 生产环境部署需要人工确认
            "delete_database",          # 删除数据库需要人工确认
            "modify_dns_records",       # 修改 DNS 需要人工确认
        ],
    ),
)
```

当 Agent 尝试调用需要审批的工具时，执行会暂停，等待人类通过 UI 或 API 确认后继续。这在 Agent 能力越来越强的时代尤为重要——我们需要在"自主性"和"可控性"之间找到平衡点。

### 十、Realtime Agents——语音 Agent

SDK 还支持构建基于 `gpt-realtime-1.5` 的实时语音 Agent：

```python
from openai_agents import RealtimeAgent

voice_agent = RealtimeAgent(
    name="phone_support",
    model="gpt-realtime-1.5",
    instructions="你是电话客服。用自然的对话方式帮助用户解决问题。",
    voice="alloy",
    tools=["lookup_order", "process_refund"],
)
```

这使得 Agents SDK 不仅覆盖了文本 Agent 场景，还延伸到了语音交互场景——同一套工具定义、Guardrails 和编排机制可以同时服务于文本和语音两个通道。

### 十一、Tracing——调试与评估

Agent 的行为链路比传统应用复杂得多（多轮工具调用、Agent 间切换、条件分支），调试难度也随之上升。SDK 内置了 Tracing 系统：

```python
from openai_agents import Agent, Runner, TracingConfig

agent = Agent(
    name="researcher",
    instructions="你是研究助手。",
    tracing=TracingConfig(
        enabled=True,
        export_format="opentelemetry",  # 兼容 OpenTelemetry 生态
    ),
)

result = Runner.run_sync(agent, "分析 2026 年 Q1 的 AI Agent 市场格局")

# 查看完整的执行链路
for span in result.trace.spans:
    print(f"{span.name} | {span.duration_ms}ms | {span.status}")
```

Tracing 不仅用于调试，还用于**评估**——通过分析 Agent 的执行链路，可以量化 Agent 的效率（工具调用次数、总延迟）、准确性（是否调用了正确的工具）和成本（token 消耗）。

---

## 核心技术洞察

### 洞察 1："Model-Native Harness" 是 Agent 架构的正确抽象

OpenAI 将这套架构称为"model-native harness"——模型原生运行线束。这个命名暗含了一个深刻的设计判断：**Agent 的运行时应该是围绕模型能力设计的，而不是围绕预定义流程设计的。**

对比两种设计哲学：

- **流程驱动**（如传统的 LangChain Agent）：开发者定义状态机、转移条件和动作序列，模型只是每个节点的执行器
- **模型驱动**（如 OpenAI Agents SDK）：模型决定下一步做什么，运行时只负责提供执行能力（工具、沙箱、存储）

模型驱动的优势在于**灵活性**——模型可以根据上下文动态调整策略，不受预定义流程的束缚。代价是**可预测性降低**——你无法 100% 确定 Agent 在给定输入下的行为路径。Agents SDK 通过 Guardrails、Human-in-the-Loop 和 Tracing 来弥补这一不足。

### 洞察 2：Credential Vault 是"零信任"原则在 Agent 领域的落地

Credential Vault 的代理层架构本质上是零信任安全模型（Zero Trust Architecture）在 Agent 领域的应用：

- **永远不信任 Agent**：即使 Agent 是你自己编写的，也假设它可能被攻击、可能泄露信息
- **最小权限**：Agent 只能通过预设的权限范围使用凭证
- **凭证永不暴露**：凭证在沙箱之外注入，Agent 无法直接接触

这解决了一个 Agent 安全领域的根本矛盾：Agent 需要权限才能有用，但给予权限就带来了风险。Credential Vault 的精妙之处在于它**将"使用权限"与"拥有凭证"解耦**——Agent 有权限但没有凭证，从架构层面消除了凭证泄露的可能性。

### 洞察 3：沙箱 + 快照 = Agent 进程管理

如果你眯起眼睛看 Agents SDK 的沙箱架构——隔离执行环境、状态快照、崩溃恢复、资源限制——你会发现它本质上就是一个**进程管理器**。Agent 就是进程，沙箱就是进程隔离，快照就是进程检查点（checkpoint），恢复就是进程重启。

这不是巧合。Agent 的运行特征（长时间执行、需要隔离、可能崩溃、需要恢复）与操作系统进程的运行特征高度相似。OpenAI 实际上是在构建一个"Agent 操作系统"的雏形。

### 洞察 4：开源 Codex 内部架构是"生态扩张"战略

OpenAI 选择将 Codex 的内部架构开源，这不是慈善行为，而是精心计算的生态战略：

1. **网络效应**：当大量开发者基于 Agents SDK 构建 Agent 时，这些 Agent 默认使用 OpenAI 的模型 API
2. **标准定义权**：谁的 Agent 框架成为事实标准，谁就在 Agent 领域拥有话语权
3. **数据飞轮**：更多的 Agent 运行 → 更多的使用数据 → 更好的模型优化 → 更好的 Agent 体验

这与 Google 开源 Android 的逻辑完全一致：通过开源运行时来锁定上层生态。

---

## 实践指南

### 🟢 立即可以做的

**1. 快速搭建一个沙箱 Agent**

最直接的价值是把现有的"裸跑" Agent 迁移到沙箱中，获得安全性和可恢复性：

```bash
pip install openai-agents
```

```python
from openai_agents import Agent, Runner, SandboxConfig

# 30 秒搭一个在沙箱里跑的编码 Agent
coding_agent = Agent(
    name="coder",
    instructions="你是 Python 开发者。在沙箱中编写和测试代码。",
    sandbox=SandboxConfig(
        runtime="docker",
        manifest={
            "base_image": "python:3.12-slim",
            "packages": ["pytest", "requests", "pydantic"],
        },
    ),
)

result = Runner.run_sync(coding_agent, "写一个 HTTP 客户端库，支持重试和超时，并编写完整的测试")
print(result.final_output)
```

**2. 为现有 Agent 添加 MCP 工具**

如果你已有一个 Agent，添加 MCP 工具只需两行代码：

```python
from openai_agents.mcp import MCPServerStdio

# 添加文件系统访问能力
fs_server = MCPServerStdio(
    command="npx",
    args=["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
)

# 在 Agent 定义中加入
agent = Agent(
    name="my_agent",
    instructions="...",
    mcp_servers=[fs_server],  # 就这一行
)
```

**3. 添加会话持久化**

```python
from openai_agents import SessionConfig

# 最简方案：SQLite
agent = Agent(
    name="my_agent",
    instructions="...",
    session=SessionConfig(backend="sqlite", path="./sessions.db"),
)
# 现在 Agent 崩溃后可以从断点恢复
```

### 🟡 需要评估后再做的

**1. Credential Vault 在生产环境的部署**

Credential Vault 在本地开发中配置简单，但生产部署需要考虑：
- 凭证的存储和轮换机制（建议接入 HashiCorp Vault 或 AWS Secrets Manager）
- 代理层的高可用（单点故障会导致所有 Agent 无法访问外部服务）
- 审计日志（谁的 Agent、在什么时间、访问了哪个服务）

**2. 多 Agent 编排的复杂度管理**

Manager 模式的编排能力很强大，但当 Agent 数量超过 3-4 个时，调试复杂度会指数级上升。建议：
- 从 2 个 Agent 的 Handoff 模式开始
- 用 Tracing 系统充分观察行为后，再逐步增加复杂度
- 为每个 Agent 编写明确的"何时委托给我"的条件

**3. 云沙箱的成本评估**

云容器模式提供最高级别的隔离，但也有持续的运行成本。需要评估：
- Agent 的平均运行时间和频率
- 快照存储的空间消耗
- 是否可以用 Docker 模式替代以降低成本

### 🔴 暂时不建议做的

**1. 不要在生产中完全依赖 Agent 的自主决策**

即使有了 Guardrails 和 Human-in-the-Loop，当前的 Agent 仍然会犯错——特别是在涉及金钱、数据删除、权限变更等不可逆操作时。建议在这些场景中始终保留人工审批环节。

**2. 不要用 Agents SDK 替代已有的成熟工作流引擎**

如果你的任务是确定性的、步骤固定的流程（如 CI/CD pipeline），传统的工作流引擎（Airflow、Temporal）仍然是更好的选择。Agent 的价值在于处理**开放式、需要判断力的任务**，而不是替代所有自动化。

**3. 不要忽略 Tracing 就上生产**

Agent 的行为不可完全预测。在没有建立完整的 Tracing 和监控体系之前，不建议在面向用户的生产环境中部署 Agent。至少需要：
- 每次执行的完整工具调用链路记录
- 异常行为的报警机制
- Token 消耗和成本的实时监控

---

## 横向对比

### Agent 基础设施四方对比

| 维度 | OpenAI Agents SDK | Anthropic Claude Code Agent | Google Gemini CLI Subagents | LangChain / LangGraph |
|------|-------------------|---------------------------|---------------------------|----------------------|
| **定位** | 通用 Agent 开发框架 | 编码 Agent 的内置能力 | CLI 环境中的子 Agent 编排 | 通用 LLM 应用框架 |
| **沙箱执行** | 原生支持（Docker/Cloud/Local） | 内置沙箱（不可剥离） | 依赖宿主 CLI 环境 | 需自行实现 |
| **崩溃恢复** | 原生支持（快照 + 续接） | 内置恢复机制 | 不支持 | 需通过 LangGraph Checkpointing |
| **凭证安全** | Credential Vault（代理层架构） | OAuth 集成 | Google Cloud 凭证 | 需自行实现 |
| **MCP 支持** | 原生支持 | 原生支持 | 不支持（使用 Gemini Function Calling） | 社区插件 |
| **多 Agent 编排** | Handoff + Manager 双模式 | Agent tool（单层委托） | Subagent 层级 | LangGraph 状态机 |
| **模型绑定** | 默认 OpenAI，可切换 | 仅 Claude 系列 | 仅 Gemini 系列 | 模型无关 |
| **开源** | 完全开源 | 部分开源（Claude Code） | CLI 开源 | 完全开源 |
| **语言支持** | Python + TypeScript | TypeScript (Node.js) | TypeScript | Python + TypeScript |
| **适合谁** | 需要构建自定义 Agent 的开发者 | 使用 Claude Code 的开发者 | 使用 Gemini CLI 的开发者 | 需要最大灵活性的开发者 |

### 关键差异分析

**OpenAI Agents SDK vs Anthropic Claude Code Agent tool**

两者最本质的区别在于**定位层级不同**。Claude Code Agent tool 是一个产品内置能力——你在 Claude Code 中获得 Agent 能力，但你不能把它剥离出来用在自己的应用中。OpenAI Agents SDK 是一个开发框架——你用它构建自己的 Agent 应用。

打个比方：Claude Code Agent tool 是"请了一个有 Agent 能力的员工"，OpenAI Agents SDK 是"拿到了培训 Agent 员工的教材和场地"。

**OpenAI Agents SDK vs Google Gemini CLI Subagents**

Google 的方案更聚焦于 CLI 场景，Subagent 层级结构简洁但灵活性有限。OpenAI 的方案更通用，Handoff + Manager 双模式覆盖了更多的编排需求。但 Google 的优势在于与 Google Cloud 生态的深度集成——如果你的基础设施在 GCP 上，Gemini CLI Subagents 的接入成本更低。

**OpenAI Agents SDK vs LangChain / LangGraph**

LangChain 的优势是模型无关性和成熟的社区生态。但 LangChain 不提供内置的沙箱、Credential Vault 和崩溃恢复——这些需要开发者自行实现或拼凑第三方方案。OpenAI Agents SDK 提供了一个"全家桶"式的体验，开箱即用但绑定了 OpenAI 生态。

选择建议：
- **如果你需要快速构建安全、健壮的 Agent → OpenAI Agents SDK**
- **如果你需要最大灵活性和模型选择自由 → LangChain/LangGraph**
- **如果你已经在 Claude Code 生态中 → 用 Claude Code Agent tool**
- **如果你在 Google Cloud 上 → 用 Gemini CLI Subagents**

---

## 批判性分析

### 这次更新做对了什么

1. **Credential Vault 是真正的架构创新。** 在 Agent 安全领域，大多数方案停留在"告诉 Agent 不要泄露密钥"的层面（prompt 级安全），或者在沙箱层面做文件系统隔离。Credential Vault 的代理层架构从根本上消除了凭证泄露的可能性——这不是改良，是范式转移。这可能会成为行业标准做法。

2. **开源 Codex 内部架构的时机选择精准。** 在 Anthropic 和 Google 同周发力 Agent 基础设施的时刻，OpenAI 选择了"全面开放"策略。当竞争对手的 Agent 能力被锁在各自的产品内时，OpenAI 让任何开发者都能用上 Codex 级别的 Agent 架构。这是一个典型的"以开放换生态"的打法。

3. **SDK 的抽象层级恰到好处。** 既没有像 LangChain 那样过度抽象（层层包装导致调试困难），也没有像纯 API 调用那样过于原始（每个开发者重复发明轮子）。Agent、Runner、Handoff、Guardrails 这几个核心抽象覆盖了绝大多数 Agent 开发需求，同时保持了概念简洁性。

### 值得关注的风险

1. **模型绑定的隐性锁定。** SDK 虽然名义上可以切换模型，但核心特性（如 Agent Loop 的行为、Handoff 的判断逻辑）都是围绕 OpenAI 模型的特性优化的。使用其他模型时，Agent 的行为可能不如预期。这种"技术上开放、实际上绑定"的状态值得警惕。

2. **沙箱的性能开销未被充分讨论。** 容器化沙箱带来了安全性，但也带来了启动延迟（冷启动数秒）、资源开销和网络通信成本。对于需要低延迟响应的场景（如实时对话 Agent），沙箱可能成为瓶颈。文档中缺乏对这些性能指标的明确说明。

3. **Credential Vault 的信任转移问题。** Credential Vault 将"信任 Agent"的问题转变为"信任 OpenAI 的代理层"。在云容器模式下，你的凭证虽然不在 Agent 的沙箱内，但仍然在 OpenAI 的基础设施上。对于高安全要求的企业用户，这可能不够——他们可能需要自托管 Credential Vault 的能力。

4. **多 Agent 编排的可调试性存疑。** 虽然 SDK 提供了 Tracing，但当 3-4 个 Agent 在 Manager 模式下迭代交互时，执行链路会变得极其复杂。当前的 Tracing 系统是否足以支撑这种复杂度下的调试需求，需要实际使用后才能判断。

5. **与 MCP 生态的成熟度绑定。** SDK 重度依赖 MCP 作为工具集成标准，但 MCP 本身仍在快速演进中，协议还未完全稳定。如果 MCP 的发展方向出现分歧（例如不同厂商推出竞争协议），SDK 的工具集成层可能需要重大调整。

### 缺失的关键信息

- **成本模型**：云沙箱的定价是多少？快照存储怎么收费？Credential Vault 的代理层调用是否有额外费用？
- **性能基准**：沙箱的冷启动时间？快照恢复的延迟？Credential Vault 代理层的额外延迟？
- **规模极限**：Manager 模式下最多支持多少个并发 Agent？会话存储的最大容量？
- **私有部署**：企业用户能否在自己的基础设施上部署完整的 Agents SDK 栈（包括云沙箱和 Credential Vault）？

### 未来展望

这次更新标志着 Agent 基础设施从"各家自建"进入"开源标准化"的转折点。接下来值得关注的方向：

1. **Agent 互操作性**：当 OpenAI、Anthropic、Google 各自的 Agent 框架成熟后，跨框架的 Agent 互操作（一个 OpenAI Agent 调用一个 Claude Agent 作为子任务）会成为需求。MCP 有潜力成为这个互操作层。

2. **Agent 市场**：当构建 Agent 的门槛降低后，Agent 的分发和交易机制会成为下一个战场。谁先建立起 Agent 市场（类似 App Store），谁就能在 Agent 经济中占据枢纽位置。

3. **Agent 安全的产业标准**：Credential Vault 的代理层架构值得被标准化为行业规范。当前各框架的 Agent 安全实践差异很大，亟需统一的安全标准。

---

*本文基于 OpenAI 官方博客（openai.com/index/the-next-evolution-of-the-agents-sdk）、OpenAI Agents SDK Python 文档（openai.github.io）、GitHub 仓库（github.com/openai/openai-agents-python）及同期行业动态综合撰写。*
