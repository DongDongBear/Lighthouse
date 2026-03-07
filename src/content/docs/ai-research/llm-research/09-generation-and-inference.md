---
title: "09. 生成策略与推理优化：温度、Top-p、KV Cache"
---

# 09. 生成策略与推理优化：温度、Top-p、KV Cache

> 同一个模型，用不同生成策略，输出质量和风格会差很多。本章讲最常用的推理参数和性能优化。

---

## 一、从 logits 到采样

模型输出的是 logits（词汇表分数），先做 softmax 变概率。

### 1.1 温度（Temperature）

```
probs = softmax(logits / T)
```

- T 小（0.2）：更保守、确定性高
- T 大（1.2）：更发散、创造性高

数值例子：

```
logits = [2.0, 1.5, 0.5]

T=0.2 → logits/T=[10, 7.5, 2.5] → 几乎总选第一个
T=1.0 → 原始分布
T=2.0 → 分布更平，随机性更强
```

### 1.2 Top-k

只保留概率最高的 k 个 token，再归一化采样。

```
原始: A(0.3), B(0.25), C(0.15), D(0.1), ...
Top-k=3 → 只在 A/B/C 中采样
```

### 1.3 Top-p（Nucleus）

选最小集合，使累计概率 ≥ p。

```
排序后累计:
A 0.30
A+B 0.55
A+B+C 0.70  ← p=0.7 时停
```

Top-p 比 Top-k 更自适应，是目前更常用的方案。

---

## 二、贪心、采样、Beam Search

- **Greedy**：每步选最大概率，稳定但容易重复
- **Sampling**：按概率抽样，文本更自然
- **Beam Search**：保留多个候选路径，常见于机器翻译，聊天模型中较少用

---

## 三、KV Cache：推理加速核心

不使用 KV Cache：每生成一个 token，都要重算之前所有 token 的 K/V。

使用 KV Cache：历史 token 的 K/V 存起来，只算新 token。

```
无缓存: 总体 O(n²)
有缓存: 总体接近 O(n)
```

这就是长对话能跑得动的关键。

代价：显存占用大。上下文越长，KV Cache 越大。

---

## 四、重复与退化控制

常见参数：

- `repetition_penalty`
- `presence_penalty`
- `frequency_penalty`

作用是减少"车轱辘话"和循环输出。

---

## 五、工程实战建议

### 对话助手（默认）
- temperature: 0.7
- top_p: 0.9
- top_k: 40（可选）

### 严谨问答/代码
- temperature: 0.1~0.3
- top_p: 0.8~0.95

### 创意写作
- temperature: 0.9~1.2
- top_p: 0.95

---

## 本章总结

1. 温度控制随机性，Top-p/Top-k 控制候选范围
2. Top-p 通常比 Top-k 更稳健
3. KV Cache 是自回归推理性能关键
4. 解码参数不是越随机越好，要按任务调

**下一篇：[10. 强化学习与后训练：从 RLHF 到 OAPL](../10-rl-and-post-training)**
