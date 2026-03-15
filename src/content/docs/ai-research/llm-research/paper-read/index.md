---
title: LLM Paper Read
---

# LLM Paper Read

基础模型方向论文导读。

## 2026-03-15

- [Tree Search Distillation：用 MCTS + PPO 蒸馏搜索策略到语言模型](./tree-search-distillation-ppo) — AlphaZero 范式迁移到 LLM，在推理步粒度做并行 MCTS 搜索，PPO 在线蒸馏，Countdown 任务 mean@16 达 11.3% 超过 GRPO 的 8.4%

## 2026-03-14

- [推理评委在非验证域的对齐训练中催生了对抗策略](./reasoning-judges-adversarial-alignment) — 推理评委让 RL 策略持续提升，但 8B 模型学会了用对抗输出骗过 gpt-oss-120b 和 GPT-4.1，Arena-Hard 创意写作 89.6% 击败 o3
- [IndexCache：砍掉 75% 稀疏注意力索引器，推理加速 1.82×](./indexcache-sparse-attention-cross-layer-reuse) — 跨层 top-k 索引复用，一个 if-else 分支实现 DSA 推理 1.82× 加速，已在 GLM-5 744B 验证

## 2026-03-13

- [V₀.₅：用预训练 Value Model 先验 + 统计检验解决 RLVR 稀疏 Rollout 的方差爆炸](./v05-value-model-prior-sparse-rl-rollouts) — Shrinkage estimator + 实时统计检验 + OSLA 动态预算，group size = 4 超过 GRPO G=16 达 10%+

## 2026-03-12

- [MM-Zero：零数据三角色自进化框架训练 VLM 推理](./mm-zero-self-evolving-vlm-zero-data) — Proposer-Coder-Solver 三角色 GRPO 闭环，零外部数据在 Qwen3-VL-8B 上实现 +5.9pp 视觉推理提升

## 2026-03-11

- [思考即回忆：推理如何解锁 LLM 的隐藏知识](./thinking-to-recall-reasoning-unlocks-parametric-knowledge) — 推理通过计算缓冲 + 事实启动两种机制扩展知识边界，中间幻觉会毒化最终答案
- [解耦推理与校准：DCPO 让 RLVR 模型不再盲目自信](./dcpo-decoupling-reasoning-calibration-rlvr) — 理论证明准确率与校准梯度冲突，解耦优化实现 ECE -71.6% 且准确率无损

## 2026-03-08

- [推理模型的悖论：少想反而更准——OPSDC 自蒸馏推理压缩](./opsdc-self-distillation-reasoning-compression) — 用自蒸馏压缩推理链 57%，准确率反升 16 个百分点

## 2026-03-06

- [MOOSE-STAR：可控训练让 LLM 学会科学发现](./moose-star-tractable-training-scientific-discovery) — 将科学发现分解为可训练的子任务
