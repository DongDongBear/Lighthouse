---
title: Agent 论文导读
---

# Agent 论文导读

Agent 方向的论文深度解读，按主题分类。

---

## Agent 训练与强化学习

- [KARL：用多任务 RL 训练企业搜索 Agent](./karl-knowledge-agents-reinforcement-learning) — Databricks 多任务 off-policy RL + agentic 合成数据，Pareto 优于 Claude 4.6
- [OpenClaw-RL：让 Agent 边用边学](./openclaw-rl-train-agent-by-talking) — 首个将所有 Agent 交互信号统一为在线 RL 训练源的框架
- [RetroAgent：回顾式双重内在反馈驱动 Agent 在线 RL](./retroagent-evolving-via-retrospective-dual-intrinsic-feedback) — 双重内在反馈（数值进步信号 + UCB 记忆检索），Sokoban +27.1pp vs GRPO
- [OpenSWE：$1.47M 打造 45K SWE 环境](./openswe-swe-environment-synthesis-at-scale) — 45,320 可执行 Docker 环境 + 难度感知筛选，SWE-bench Verified SOTA

## Agent 推理与规划

- [BAVT：预算感知树搜索](./bavt-budget-aware-value-tree-search) — 剩余预算比例作为探索-利用的缩放指数，1/4 预算下超越 4x 暴力并行采样
- [MADQA：Agent 文档推理还是暴力搜索](./madqa-agent-document-reasoning) — 2,250 题 x 800 PDF，准确率追平人类但距 Oracle 仍有 18% 差距

## Agent 记忆与持续学习

- [Memory in the Age of AI Agents：当 Agent 学会"记忆"](./memory-in-the-age-of-ai-agents) — 47 位作者联合综述，Forms-Functions-Dynamics 三角框架
- [XSkill：多模态 Agent 的双流持续学习框架](./xskill-continual-learning-multimodal-agents) — 经验 + 技能双流知识提取，视觉锚定 + 跨轨迹批评

## Agent 能力评估与奖励

- [SkillNet：创建、评估、连接 AI 技能](./skillnet-create-evaluate-connect-ai-skills) — 模块化 Agent 能力评估框架
- [ExeVRM：用执行视频为 CUA 构建奖励模型](./exevrm-video-reward-modeling-cua) — 53K 视频-任务-奖励三元组，8B 模型 84.7% 准确率超越 GPT-5.2

---

## 按时间索引

### 2026-03-17
- [OpenSWE](./openswe-swe-environment-synthesis-at-scale)

### 2026-03-16
- [BAVT](./bavt-budget-aware-value-tree-search)

### 2026-03-15
- [ExeVRM](./exevrm-video-reward-modeling-cua)
- [XSkill](./xskill-continual-learning-multimodal-agents)

### 2026-03-14
- [MADQA](./madqa-agent-document-reasoning)

### 2026-03-13
- [Memory in the Age of AI Agents](./memory-in-the-age-of-ai-agents)
- [RetroAgent](./retroagent-evolving-via-retrospective-dual-intrinsic-feedback)

### 2026-03-12
- [OpenClaw-RL](./openclaw-rl-train-agent-by-talking)

### 2026-03-08
- [KARL](./karl-knowledge-agents-reinforcement-learning)

### 2026-03-06
- [SkillNet](./skillnet-create-evaluate-connect-ai-skills)
