---
title: Agent Paper Read
---

# Agent Paper Read

Agent 方向论文导读。

## 2026-03-17

- [OpenSWE：$1.47M 打造 45K SWE 环境——用规模和质量重新定义 Agent 训练](./openswe-swe-environment-synthesis-at-scale) — 45,320 可执行 Docker 环境 + 难度感知筛选，32B/72B 模型 SWE-bench Verified 达 62.4%/66.0% SOTA，SWE 训练意外提升数学推理 +12pp

## 2026-03-16

- [BAVT：预算感知树搜索——让 Agent 花 1/4 的钱做得更好](./bavt-budget-aware-value-tree-search) — 剩余预算比例作为探索-利用的缩放指数，1/4 预算下超越 4× 资源的暴力并行采样，training-free 且有收敛保证

## 2026-03-15

- [ExeVRM：用执行视频取代手工脚本，为 CUA 构建可扩展的奖励模型](./exevrm-video-reward-modeling-cua) — 53K 视频-任务-奖励三元组 + 时空 Token 剪枝，8B 模型 84.7% 准确率超越 GPT-5.2，方法与 Agent 架构无关
- [XSkill：多模态 Agent 的双流持续学习框架](./xskill-continual-learning-multimodal-agents) — 经验+技能双流知识提取，视觉锚定 + 跨轨迹批评 + 分层合并，五个 benchmark 上持续提升 2.58–6.71 分

## 2026-03-14

- [MADQA：Agent 文档推理还是暴力搜索？18% 的 Oracle 差距](./madqa-agent-document-reasoning) — 2,250 题 × 800 PDF 首次证明 Agent 靠暴力搜索弥补策略规划不足，准确率追平人类但距 oracle 仍有 18% 差距
- [ExeVRM：用执行视频给 Computer-Use Agent 打分](./exevrm-video-reward-model-cua) — 将 CUA 轨迹转为视频训练奖励模型，8B 模型 84.7% 准确率超越 GPT-5.2，时空 Token 裁剪是关键

## 2026-03-13

- [Memory in the Age of AI Agents：当 Agent 学会"记忆"](./memory-in-the-age-of-ai-agents) — 47 位作者联合综述，Forms-Functions-Dynamics 三角框架统一 Agent 记忆研究全景，核心信号：RL 将端到端驱动未来记忆系统
- [RetroAgent：从"解题"到"进化"——回顾式双重内在反馈驱动 Agent 在线 RL](./retroagent-evolving-via-retrospective-dual-intrinsic-feedback) — 双重内在反馈（数值进步信号 + UCB 记忆检索语言教训），Sokoban +27.1pp vs GRPO

## 2026-03-12

- [OpenClaw-RL：让 Agent 边用边学——用 Next-State Signal 统一在线 RL 训练](./openclaw-rl-train-agent-by-talking) — 首个将所有 Agent 交互信号统一为在线 RL 训练源的框架，OPD 实现 token 级方向监督

## 2026-03-08

- [KARL：用多任务 RL 训练企业搜索 Agent，成本优于 Claude 4.6](./karl-knowledge-agents-reinforcement-learning) — Databricks 多任务 off-policy RL + agentic 合成数据，Pareto 优于 Claude 4.6

## 2026-03-06

- [SkillNet：创建、评估、连接 AI 技能](./skillnet-create-evaluate-connect-ai-skills) — 模块化 Agent 能力评估框架
