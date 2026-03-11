---
title: LLM Paper Read
---

# LLM Paper Read

基础模型方向论文导读。

## 2026-03-12

- [MM-Zero：零数据三角色自进化框架训练 VLM 推理](./mm-zero-self-evolving-vlm-zero-data) — Proposer-Coder-Solver 三角色 GRPO 闭环，零外部数据在 Qwen3-VL-8B 上实现 +5.9pp 视觉推理提升

## 2026-03-11

- [思考即回忆：推理如何解锁 LLM 的隐藏知识](./thinking-to-recall-reasoning-unlocks-parametric-knowledge) — 推理通过计算缓冲 + 事实启动两种机制扩展知识边界，中间幻觉会毒化最终答案
- [解耦推理与校准：DCPO 让 RLVR 模型不再盲目自信](./dcpo-decoupling-reasoning-calibration-rlvr) — 理论证明准确率与校准梯度冲突，解耦优化实现 ECE -71.6% 且准确率无损

## 2026-03-08

- [推理模型的悖论：少想反而更准——OPSDC 自蒸馏推理压缩](./opsdc-self-distillation-reasoning-compression) — 用自蒸馏压缩推理链 57%，准确率反升 16 个百分点

## 2026-03-06

- [MOOSE-STAR：可控训练让 LLM 学会科学发现](./moose-star-tractable-training-scientific-discovery) — 将科学发现分解为可训练的子任务
