---
title: LLM 论文导读
---

# LLM 论文导读

基础模型方向的论文深度解读，按主题分类。

---

## 模型架构与效率

- [GDDS：离散扩散首次在大规模任务上击败自回归模型](./gdds-discrete-diffusion-snapshots) — Snapshot ELBO + 语义感知噪声核，Text8 BPC 1.01 SOTA，打破自回归垄断
- [Sebastian Raschka：现代 LLM 注意力变体可视化指南](./raschka-visual-attention-variants-2026) — 从 MHA 到 GQA、MLA、滑动窗口、稀疏注意力，配合 45+ 架构 Gallery
- [2026年春季开源LLM架构全景：10个模型的技术演化](./raschka-dream-of-spring-open-weight-llms) — Sebastian Raschka 对 Trinity 400B、Kimi K2.5 1T、GLM-5 744B、Qwen3.5 397B 等 10+ 模型的架构横评
- [Mamba-3：首个以推理效率为核心设计的状态空间模型](./mamba-3-inference-first-ssm) — 指数梯形离散化 + 复数值状态 + MIMO 变体，1.5B 规模超越 Transformer
- [IndexCache：砍掉 75% 稀疏注意力索引器，推理加速 1.82x](./indexcache-sparse-attention-cross-layer-reuse) — 跨层 top-k 索引复用，已在 GLM-5 744B 验证
- [LookaheadKV：不需要 draft 生成的未来感知 KV Cache 驱逐](./lookaheadkv-future-aware-kv-cache-eviction) — 参数高效模块预测 KV cache 重要性得分，ICLR 2026
- [Averis：FP4 训练不稳定的元凶是一个秩一均值偏差](./averis-fp4-mean-bias-low-bit-training) — 均值减除即可稳定 FP4 训练，无需 SVD
- [Leanstral：6B 活跃参数的形式化证明 Agent](./leanstral-formal-proof-agent) — Mistral 120B/6B MoE，$36 成本超越 $549 的 Sonnet

## 训练、对齐与强化学习

- [V₀.₅：用预训练 Value Model 先验解决 RLVR 稀疏 Rollout 的方差爆炸](./v05-value-model-prior-sparse-rl-rollouts) — Shrinkage estimator + 实时统计检验，group size=4 超过 GRPO G=16
- [Tree Search Distillation：用 MCTS + PPO 蒸馏搜索策略到语言模型](./tree-search-distillation-ppo) — AlphaZero 范式迁移到 LLM，PPO 在线蒸馏
- [Neural Thickets：预训练权重邻域中藏着密集的任务专家](./neural-thickets-random-guessing-post-training) — RandOpt 用 O(1) 步训练 + 集成投票，竞争力可比 PPO/GRPO
- [推理评委在非验证域的对齐训练中催生了对抗策略](./reasoning-judges-adversarial-alignment) — 8B 模型学会用对抗输出骗过 gpt-oss-120b，Arena-Hard 创意写作 89.6%
- [解耦推理与校准：DCPO 让 RLVR 模型不再盲目自信](./dcpo-decoupling-reasoning-calibration-rlvr) — 理论证明准确率与校准梯度冲突，解耦优化 ECE -71.6%

## 推理、知识与 Reasoning

- [思考即回忆：推理如何解锁 LLM 的隐藏知识](./thinking-to-recall-reasoning-unlocks-parametric-knowledge) — 推理通过计算缓冲 + 事实启动扩展知识边界
- [推理模型的悖论：少想反而更准——OPSDC 自蒸馏推理压缩](./opsdc-self-distillation-reasoning-compression) — 压缩推理链 57%，准确率反升 16 个百分点
- [理解即重建：反向重建软件开发过程](./understanding-by-reconstruction-reverse-engineering-code) — 静态代码仓库反向重建为 agentic trajectory，Llama-3-8B 全线提升
- [MOOSE-STAR：可控训练让 LLM 学会科学发现](./moose-star-tractable-training-scientific-discovery) — 将科学发现分解为可训练的子任务

## 多模态

- [Cheers：解耦 Patch 细节与语义表征](./cheers-unified-multimodal-comprehension-generation) — 级联 Flow Matching + 门控高频注入，83M 样本超越 403M 的 Tar
- [MM-Zero：零数据三角色自进化框架训练 VLM 推理](./mm-zero-self-evolving-vlm-zero-data) — Proposer-Coder-Solver 三角色 GRPO 闭环，零外部数据 +5.9pp

---

## 按时间索引

### 2026-03-23
- [2026年春季开源LLM架构全景](./raschka-dream-of-spring-open-weight-llms)

### 2026-03-22
- [Mamba-3](./mamba-3-inference-first-ssm)

### 2026-03-17
- [Leanstral](./leanstral-formal-proof-agent)
- [Cheers](./cheers-unified-multimodal-comprehension-generation)

### 2026-03-16
- [理解即重建](./understanding-by-reconstruction-reverse-engineering-code)
- [LookaheadKV](./lookaheadkv-future-aware-kv-cache-eviction)

### 2026-03-15
- [Tree Search Distillation](./tree-search-distillation-ppo)
- [Neural Thickets](./neural-thickets-random-guessing-post-training)
- [Averis](./averis-fp4-mean-bias-low-bit-training)

### 2026-03-14
- [推理评委对抗策略](./reasoning-judges-adversarial-alignment)
- [IndexCache](./indexcache-sparse-attention-cross-layer-reuse)

### 2026-03-13
- [V₀.₅](./v05-value-model-prior-sparse-rl-rollouts)

### 2026-03-12
- [MM-Zero](./mm-zero-self-evolving-vlm-zero-data)

### 2026-03-11
- [思考即回忆](./thinking-to-recall-reasoning-unlocks-parametric-knowledge)
- [DCPO](./dcpo-decoupling-reasoning-calibration-rlvr)

### 2026-03-08
- [OPSDC 推理压缩](./opsdc-self-distillation-reasoning-compression)

### 2026-03-06
- [MOOSE-STAR](./moose-star-tractable-training-scientific-discovery)
