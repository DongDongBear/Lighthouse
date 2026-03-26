---
title: "OpenSWE：$1.47M 打造 45K SWE 环境——用规模和质量重新定义 Agent 训练"
---

# OpenSWE：$1.47M 打造 45K SWE 环境——用规模和质量重新定义 Agent 训练

| 属性 | 值 |
|------|------|
| 论文 | [daVinci-Env: Open SWE Environment Synthesis at Scale](https://arxiv.org/abs/2603.13023) |
| 机构 | GAIR-NLP (复旦大学) |
| 日期 | 2026-03-16 |
| 关键词 | SWE Agent, Environment Synthesis, Data Scaling, Difficulty-Aware Curation |

---

## 论文速查卡

| 维度 | 内容 |
|------|------|
| 一句话总结 | 花 $1.47M 构建了 45,320 个可执行 Docker SWE 环境（12.8K 仓库），通过难度感知筛选得到 ~13K 高质量轨迹，SFT 训练的 32B/72B 模型在 SWE-bench Verified 达到 62.4%/66.0% SOTA |
| 大白话版 | "给 AI 修 bug 建了个超大训练场，45000 个真实项目环境，花了一千万人民币，训出来的模型修 bug 比所有同类都强" |
| 核心数字 | 45,320 环境 / 12.8K 仓库 / $1.47M 总投资 / 62.4% (32B) / 66.0% (72B) SWE-bench Verified |
| 评级 | ⭐⭐⭐⭐ 工程杰作 + 扎实实验 |

---

## 核心 Insight

这篇论文的核心贡献不是某个模型架构的创新，而是回答了一个关键问题：**SWE Agent 训练的瓶颈在哪里？**

答案是：**高质量可执行环境的规模和难度分布**。

三个关键发现：

1. **规模有效但不充分**：数据量与性能呈 log-linear 关系（Pearson r = 0.893~0.972），且未饱和——意味着继续造环境还能涨分
2. **难度感知筛选必不可少**：盲目堆量不如精选适当难度的实例。PR-Issue 不对齐（patch 没修对 issue）和琐碎实例（issue 直接告诉你改哪行）都会污染训练
3. **SWE 训练意外提升通用能力**：数学推理 +12pp，科学 +5pp，代码 +29pp，且不损害事实回忆——说明 SWE debugging 培养的多步规划能力具有广泛迁移性

---

## 技术细节

### 多 Agent 环境合成流水线

整个流水线由 4 个协作 Agent 组成，部署在 64 节点集群上：

```
GitHub PR → [仓库探索 Agent] → [Dockerfile 构建 Agent] → [评估脚本 Agent] → [测试分析 Agent]
                ↑                                                                    ↓
                └────────────────── 迭代反馈循环 ──────────────────────────────────────┘
```

**仓库探索 Agent**：通过 3 个受限 API（browse/search/digest）进行低成本目标检索，聚焦于 README、CI 配置等高收益文件。

**Dockerfile 构建 Agent**：
- 预构建 Python 2.7 + 3.5~3.14 全版本 base image，消除网络超时
- 本地 bare repo 缓存 + COPY 注入，绕过 GitHub API 限流
- Layer-aware prompting：稳定层前置利用 Docker 缓存，依赖层后置快速迭代

**评估脚本 Agent**：
- 生成结构化 bash 脚本（非 SWE-Bench 的静态 fail2pass）
- 支持 Agent 自行合成新测试用例
- OPENSWE_EXIT_CODE 标记确定性解析

**测试分析 Agent**：
- 检查通过的结果是否"真的通过"（排除硬编码 exit code 等 reward hacking）
- 诊断失败根因并路由反馈

### 质量筛选：两类"毒"环境

| 类型 | 示例 | 危害 |
|------|------|------|
| PR-Issue 不对齐 | Issue 要求检查完整 commit hash，但 PR 只检查前 7 位就能过测试 | 不可解，训练噪声 |
| 琐碎实例 | Issue 描述直接说"改 X 文件的 Y 字符串" | 太简单，无学习信号 |

筛选策略：用 GLM-4.7 对全量环境采样 4 次（temperature 1.0, 200K context, 300 steps），保留恰好 1~2 次通过的实例——这个"Goldilocks zone"确保难度适中。

### 训练配置

- 基座模型：Qwen2.5-32B-Base / 72B-Base（注意：**不是** Coder 变体）
- SFT：128K max tokens, 5 epochs, batch 128, lr 1e-5→1e-6 cosine
- Scaffold：SWE-Agent 和 OpenHands 双测
- 数据处理：mask 掉格式错误步骤，移除包含 `git pull` 的动作（防止 reward hacking）

---

## 实验结果

### SWE-bench Verified 主要结果

| 模型 | Scale | Scaffold | Pass@1 |
|------|-------|----------|--------|
| SWE-Master-32B-RL | 32B | R2E-Gym | 61.4% |
| **OpenSWE-32B** | **32B** | **SWE-Agent** | **62.4%** |
| Kimi-Dev | 72B | Agentless | 60.6% |
| **OpenSWE-72B** | **72B** | **SWE-Agent** | **66.0%** |

关键观察：
- OpenSWE-32B 用 **非 Coder base** 超越了所有 Coder-base 方法 (+1.0 vs SWE-Master-RL)
- 混合 SWE-rebench 数据在 72B 上进一步涨至 **68.0%**，但 32B 反而下降（小模型对分布偏移更敏感）

### 数据规模 vs 性能（log-linear 关系）

四条曲线（32B/72B × SWE-Agent/CodeAct）均呈 log-linear 上升且**未饱和**：

- 72B 模型从规模扩展中获益更多（gap 从 3.1% 扩大到 3.6%）
- SWE-Agent 一致优于 OpenHands 1~3%

### 通用能力迁移（意外发现）

| Benchmark | Base→OpenSWE (32B) | Base→OpenSWE (72B) |
|-----------|--------------------|--------------------|
| HumanEval | 61.4→90.5 (+29.1) | 66.8→76.3 (+9.4) |
| MATH-500 | 58.0→66.2 (+8.2) | 60.4→72.6 (+12.2) |
| SuperGPQA | 33.9→39.6 (+5.8) | 37.8→45.9 (+8.1) |
| MMLU | 83.6→83.6 (+0.0) | 86.4→87.4 (+1.0) |

MMLU 几乎不变 = SWE 训练增强了推理能力但不影响知识存量。这是一个重要信号：**debug 训练可能是通用推理能力的良好 proxy task**。

---

## 复现与落地评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 数据可用性 | ⭐⭐⭐⭐⭐ | 45K 环境 + Dockerfile + 评估脚本全部开源 |
| 计算门槛 | ⭐⭐ | 构建需 64 节点 × 2 周 + $891K，训练需 72B SFT |
| 复现难度 | ⭐⭐⭐⭐ | 流水线代码完整，但规模复现需大量资源 |
| 工程完成度 | ⭐⭐⭐⭐⭐ | systemd 守护、Prometheus 监控、Docker 资源隔离，工业级 |
| 学术价值 | ⭐⭐⭐⭐ | 数据规模定律 + 难度筛选 + 迁移能力三重验证 |

---

## SOTA 对照矩阵

| 方法 | Scale | SWE-bench Verified | 开源 | 需要 Coder Base |
|------|-------|-------------------|------|----------------|
| SWE-smith | 32B | 40.2% | ✅ | ✅ |
| SWE-Master-RL | 32B | 61.4% | ❌ | ✅ |
| **OpenSWE** | **32B** | **62.4%** | **✅** | **❌** |
| daVinci-Dev | 72B | 58.5% | ✅ | ❌ |
| Kimi-Dev | 72B | 60.6% | ❌ | ❌ |
| **OpenSWE** | **72B** | **66.0%** | **✅** | **❌** |

---

## 批判性分析

### 👍 做得好的

1. **完全透明**：这可能是 SWE Agent 训练领域透明度最高的工作。环境、代码、流水线全部开源，$1.47M 成本也坦诚公布
2. **难度筛选的 insight 有说服力**：不是简单的"质量过滤"，而是基于采样通过率定义"适当难度"的定量方法
3. **迁移能力的发现很重要**：SWE 训练提升数学推理这个发现，如果能在更多模型上验证，对训练 recipe 设计有重大影响

### 🤔 值得质疑的

1. **成本不可复现性**：虽然代码开源，但 $891K 构建 + $576K 采样的成本实际上把大多数团队排除在外。论文标题说"Open"，但门槛极高
2. **GLM-4.7 依赖**：构建模型用 DeepSeek-v3.2，采样用 GLM-4.7——环境质量与这两个闭源模型的能力深度耦合，换模型效果未知
3. **仅限 Python**：12.8K 仓库全是 Python。SWE-rebench-v2 已支持多语言（虽然 Python 子集只有 7.2K）。通用性存疑
4. **缺少 RL 对比**：SWE-Master-RL 用 RL 达到 61.4%，OpenSWE 用 SFT 达到 62.4%。但 OpenSWE + RL 会怎样？这个显而易见的实验缺失了
5. **Log-linear 拟合的乐观解读**：4~5 个数据点拟合线性模型，声称"没有饱和"——数据点太少，可能在更大规模会出现拐点

### 💡 我的额外观察

- **"Debug 是通用推理的良好 proxy"这个假说**值得单独验证。如果成立，意味着 SWE 环境可能是比数学题更好的推理训练数据源——因为 bug 修复天然包含"定位-假设-验证-修正"的完整推理链
- 论文发现 72B 从混合数据获益但 32B 反而下降——这暗示**小模型需要更同质的训练分布**，大模型的"分布容忍度"更高。这对实际训练有指导意义
- 64 节点集群 + systemd + Prometheus 的工程设计本身就值得一篇工程论文。这种"把 ML pipeline 当分布式系统来做"的思路在工业界很常见但学术界少见
