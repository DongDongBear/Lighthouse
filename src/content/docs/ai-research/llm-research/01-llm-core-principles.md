---
title: "01. LLM 核心原理：从 Token 到 Transformer 的完整计算过程"
---

# 01. LLM 核心原理：从 Token 到 Transformer 的完整计算过程

---

## 一、LLM 在做什么：下一个 Token 预测

大语言模型做的事情只有一个：

```
给定 token 序列 [x_1, x_2, ..., x_{t-1}]，输出下一个 token x_t 的概率分布
```

所有的对话、翻译、编程、推理——都建立在这一个机制上。

### 1.1 什么是 Token

模型不直接处理字符，而是处理 **token**——一种介于字符和完整单词之间的文本单位。

以 BPE（Byte Pair Encoding）为例，这是最常用的分词算法。它的训练过程：

**第一步：初始化词汇表为所有单字节（256 个）**

```
词汇表 = {a, b, c, ..., z, A, B, ..., Z, 0, ..., 9, 空格, 标点, ...}
```

**第二步：统计相邻 token 对出现频率，把最高频的合并成新 token**

假设训练语料中 "t" 和 "h" 相邻出现了 50000 次（最多），就合并：

```
词汇表新增: "th"
语料中所有 "t" + "h" → "th"
```

**第三步：重复，直到词汇表达到目标大小（如 50257 个）**

下一轮可能 "th" + "e" 频率最高 → 合并成 "the"。

**结果**：

```
"unhappiness" → ["un", "happiness"]  或  ["un", "happi", "ness"]
"the"         → ["the"]              （高频词成为单独 token）
"你好世界"    → ["你", "好", "世", "界"]  （中文通常一字一 token）
```

每个 token 在词汇表中有一个唯一 ID。GPT-2 的词汇表大小是 50257，GPT-4 约 100K，GLM 系列约 150K。

### 1.2 自回归生成的完整过程

```
用户输入: "巴黎是"
token 化:  [15432, 8821, 562]    （假设的 token ID）

Step 1: 模型输入 [15432, 8821, 562]
        输出: 词汇表上的概率分布（50257 维向量）
        "法" 概率 0.35, "欧" 概率 0.12, "一" 概率 0.08, ...
        采样选中: "法" (ID: 7291)

Step 2: 模型输入 [15432, 8821, 562, 7291]
        输出: 新的概率分布
        "国" 概率 0.82, ...
        采样选中: "国" (ID: 3847)

Step 3: 模型输入 [15432, 8821, 562, 7291, 3847]
        ...继续直到生成 <EOS>（结束标记）
```

每一步都是完整的模型前向计算。生成 100 个 token 需要跑 100 次前向。

---

## 二、Embedding：从离散 ID 到连续向量

### 2.1 Token Embedding

模型内部不能直接处理整数 ID，需要转换为连续向量。

**Embedding 矩阵** $W_e$ 的形状是 `[词汇表大小 V, 嵌入维度 d]`。

```
V = 50257 (词汇表大小)
d = 768   (GPT-2 small 的嵌入维度; GPT-3 用 12288)

W_e 形状: [50257, 768]
```

查找过程就是查表：

```
token ID = 7291
embedding = W_e[7291]  →  [0.023, -0.156, 0.891, ..., 0.234]  (768 维向量)
```

这个 W_e 矩阵是模型参数的一部分，在预训练中和其他参数一起学习。训练完成后，语义相近的 token 会自然聚集在向量空间中相近的位置。

### 2.2 位置编码（Positional Encoding）

Transformer 的注意力机制是**置换不变的**（permutation invariant）——如果你把输入 token 的顺序打乱，注意力的计算结果不变（因为它计算的是所有 token 对之间的关系，没有"位置"概念）。

但语言是有顺序的。"狗咬人"和"人咬狗"意思完全不同。所以必须显式注入位置信息。

**绝对位置编码（GPT-2 使用）**：

再维护一个位置 embedding 矩阵 $W_p$，形状 `[最大序列长度 L, d]`：

```
L = 1024  (GPT-2 的最大上下文长度)
d = 768

W_p 形状: [1024, 768]
```

第 i 个位置的 token，其最终输入向量 = token embedding + 位置 embedding：

```
h_0[i] = W_e[token_id[i]] + W_p[i]
```

具体数值例子：

```
位置 0 的 token "巴" (ID 15432):
  token_emb  = W_e[15432] = [0.12, -0.34, ...]
  pos_emb    = W_p[0]     = [0.01, 0.02, ...]
  h_0[0]     = [0.13, -0.32, ...]

位置 1 的 token "黎" (ID 8821):
  token_emb  = W_e[8821]  = [0.15, -0.28, ...]
  pos_emb    = W_p[1]     = [0.03, -0.01, ...]
  h_0[1]     = [0.18, -0.29, ...]
```

**RoPE（Rotary Position Embedding，现代主流）**：

不是加一个额外向量，而是对 Q 和 K 向量应用旋转变换。位置 m 的旋转角度为 $m \cdot \theta_i$，其中 $\theta_i$ 是按维度对递减的频率。

RoPE 的优势：位置信息编码在注意力分数的计算中，使得模型天然关注"相对位置"而非绝对位置，更容易泛化到训练时没见过的更长序列。

---

## 三、Self-Attention 的完整计算过程

这是 Transformer 的核心。我们用一个具体的数值例子走完全过程。

### 3.1 设定

假设嵌入维度 d = 4（实际中 768-12288，这里简化为 4 方便计算）。

输入序列有 3 个 token，embedding 后得到矩阵 X（形状 [3, 4]）：

```
X = [[1.0, 0.5, 0.3, 0.1],    ← token 0 "巴"
     [0.2, 0.8, 0.5, 0.6],    ← token 1 "黎"
     [0.3, 0.4, 0.9, 0.2]]    ← token 2 "是"
```

### 3.2 计算 Q, K, V

三个权重矩阵 $W_Q, W_K, W_V$，形状都是 [d, d_k]。假设 d_k = 4：

```
W_Q = [[0.1, 0.2, 0.3, 0.4],
       [0.5, 0.6, 0.1, 0.2],
       [0.3, 0.4, 0.5, 0.6],
       [0.2, 0.1, 0.4, 0.3]]

Q = X @ W_Q    (矩阵乘法, [3,4] @ [4,4] = [3,4])
K = X @ W_K
V = X @ W_V
```

以 Q 为例，token 0 的 Query 向量：

```
Q[0] = [1.0, 0.5, 0.3, 0.1] @ W_Q
     = [1.0*0.1 + 0.5*0.5 + 0.3*0.3 + 0.1*0.2,
        1.0*0.2 + 0.5*0.6 + 0.3*0.4 + 0.1*0.1,
        1.0*0.3 + 0.5*0.1 + 0.3*0.5 + 0.1*0.4,
        1.0*0.4 + 0.5*0.2 + 0.3*0.6 + 0.1*0.3]
     = [0.46, 0.63, 0.54, 0.71]
```

每个 token 都计算出自己的 Q、K、V 向量。

**直觉**：
- Q（Query）："我在找什么信息？"
- K（Key）："我这里有什么信息？"
- V（Value）："如果被选中，我提供的具体内容"

### 3.3 计算注意力分数

注意力分数 = Q 和 K 的点积（衡量"Query 和 Key 有多匹配"）：

```
scores = Q @ K^T    ([3,4] @ [4,3] = [3,3])
```

得到一个 3x3 的矩阵，每个元素 scores[i][j] 表示"token i 对 token j 的关注程度（未归一化）"：

```
scores = [[s00, s01, s02],    ← token 0 对每个 token 的关注度
           [s10, s11, s12],    ← token 1 对每个 token 的关注度
           [s20, s21, s22]]    ← token 2 对每个 token 的关注度
```

### 3.4 缩放

除以 $\sqrt{d_k}$ 防止点积值过大：

```
scores = scores / sqrt(4) = scores / 2.0
```

为什么要缩放？当 d_k 很大时（比如 128），Q 和 K 的点积的方差和 d_k 成正比。如果不缩放，点积值会非常大，softmax 后概率分布极端化（接近 one-hot），梯度几乎为零，训练停滞。

### 3.5 因果掩码（Causal Mask）

GPT 类模型只允许每个 token 看到自己和前面的 token，不能看后面的。

用一个上三角掩码矩阵把"未来位置"设为 $-\infty$：

```
mask = [[0,    -inf, -inf],
        [0,    0,    -inf],
        [0,    0,    0   ]]

masked_scores = scores + mask

结果:
  token 0 只能看 token 0（自己）
  token 1 能看 token 0 和 1
  token 2 能看 token 0, 1, 2（所有）
```

$-\infty$ 经过 softmax 后变成 0，等于完全不关注。

### 3.6 Softmax 归一化

对每一行做 softmax，使其成为有效的概率分布（非负、和为 1）：

```
softmax(z_i) = exp(z_i) / sum(exp(z_j))
```

具体例子（token 2 那一行，假设 masked_scores[2] = [1.2, 0.8, 1.5]）：

```
exp(1.2) = 3.32,  exp(0.8) = 2.23,  exp(1.5) = 4.48
sum = 3.32 + 2.23 + 4.48 = 10.03

attn_weights[2] = [3.32/10.03, 2.23/10.03, 4.48/10.03]
                = [0.331, 0.222, 0.447]
```

含义：生成 token 2 的下一个预测时，模型把 33.1% 的注意力放在 token 0，22.2% 在 token 1，44.7% 在 token 2 自身。

### 3.7 加权求和 V

最后一步，用注意力权重对 V 加权求和：

```
output[2] = 0.331 * V[0] + 0.222 * V[1] + 0.447 * V[2]
```

如果 V[0] = [0.1, 0.9, 0.3, 0.5]，V[1] = [0.4, 0.2, 0.8, 0.1]，V[2] = [0.7, 0.5, 0.6, 0.3]：

```
output[2] = 0.331*[0.1,0.9,0.3,0.5] + 0.222*[0.4,0.2,0.8,0.1] + 0.447*[0.7,0.5,0.6,0.3]
          = [0.033,0.298,0.099,0.166] + [0.089,0.044,0.178,0.022] + [0.313,0.224,0.268,0.134]
          = [0.435, 0.566, 0.545, 0.322]
```

这个 output[2] 就是 token 2 经过注意力层后的新表示——它融合了前面所有 token 的信息，权重由 Q-K 相似度决定。

### 3.8 完整公式

把上面的步骤合成一个公式：

```
Attention(Q, K, V) = softmax(mask(Q @ K^T / sqrt(d_k))) @ V
```

这就是 Scaled Dot-Product Attention 的完整定义。

---

## 四、Multi-Head Attention

### 4.1 为什么需要多头

单一的注意力只能学到一种"关注模式"。但语言中有多种关系需要同时捕捉：

- 语法关系："他"指代"小明"
- 位置关系：相邻词之间的搭配
- 语义关系："北京"和"首都"

**多头注意力**让模型同时学习多种关注模式。

### 4.2 计算方式

假设 d = 768，头数 h = 12。每个头的维度 d_k = d / h = 64。

```
对于每个头 i = 1, ..., 12:
    Q_i = X @ W_Q_i    (W_Q_i 形状: [768, 64])
    K_i = X @ W_K_i    (W_K_i 形状: [768, 64])
    V_i = X @ W_V_i    (W_V_i 形状: [768, 64])
    head_i = Attention(Q_i, K_i, V_i)    (输出形状: [seq_len, 64])

拼接所有头:
    concat = [head_1 ; head_2 ; ... ; head_12]    (形状: [seq_len, 768])

最终线性投影:
    output = concat @ W_O    (W_O 形状: [768, 768])
```

每个头独立学习自己的 Q/K/V 投影。实验表明不同的头确实学到了不同的模式。

### 4.3 参数量计算

一个注意力层的参数量：

```
W_Q: [768, 768] = 589,824       (12 个 [768, 64] 的 W_Q_i 合并)
W_K: [768, 768] = 589,824
W_V: [768, 768] = 589,824
W_O: [768, 768] = 589,824
总计: 768 * 768 * 4 = 2,359,296 ≈ 2.36M
```

GPT-2 small 有 12 层 → 注意力参数 ≈ 28.3M。

---

## 五、FFN（前馈网络）与知识存储

### 5.1 结构

每个 Transformer 层除了注意力，还有一个两层前馈网络：

```
FFN(x) = W_2 · GELU(W_1 · x + b_1) + b_2
```

其中：
- W_1 形状: [d, 4d] = [768, 3072]
- W_2 形状: [4d, d] = [3072, 768]
- GELU 是激活函数（比 ReLU 更平滑）

### 5.2 数值例子

```
输入 x = [0.435, 0.566, 0.545, 0.322]  (简化为 d=4)

W_1 形状 [4, 16]  (4d = 16)
hidden = GELU(x @ W_1 + b_1)   → 16 维向量

W_2 形状 [16, 4]
output = hidden @ W_2 + b_2    → 4 维向量（恢复原始维度）
```

### 5.3 GELU 激活函数

```
GELU(x) = x * Phi(x)
```

其中 Phi(x) 是标准正态分布的累积分布函数。

近似实现：
```
GELU(x) ≈ 0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x^3)))
```

相比 ReLU（负数直接归零），GELU 对负数不完全截断，允许小的负值梯度流过，训练更稳定。

### 5.4 知识存储在哪里

研究表明（Geva et al. 2021, "Transformer Feed-Forward Layers Are Key-Value Memories"）：

- FFN 的 W_1 的每一行可以看作一个"key pattern"
- W_2 的对应列可以看作一个"value pattern"
- 输入匹配某个 key → 激活对应的 value → 注入到隐藏状态

所以 **FFN 是模型的"知识库"**，注意力是"路由器"。

### 5.5 参数量

一个 FFN 层：

```
W_1: [768, 3072] = 2,359,296
b_1: [3072]      = 3,072
W_2: [3072, 768] = 2,359,296
b_2: [768]       = 768
总计: ≈ 4.72M
```

注意：FFN 的参数量（4.72M）是注意力（2.36M）的两倍。模型的大部分参数在 FFN 中。

---

## 六、完整 Transformer 层 = Attention + FFN + 残差 + LayerNorm

### 6.1 残差连接（Residual Connection）

```
x_after_attn = x + Attention(x)
x_after_ffn  = x_after_attn + FFN(x_after_attn)
```

为什么需要残差？深层网络（96 层）在反向传播时梯度容易消失或爆炸。残差连接让梯度可以"跳过"中间层直接流向浅层，解决梯度消失问题。

直觉：每一层学的是"增量改进"（在输入基础上加了什么），而不是"完全重新计算"。

### 6.2 Layer Normalization

```
LayerNorm(x) = (x - mean(x)) / sqrt(var(x) + epsilon) * gamma + beta
```

- mean(x)、var(x)：在特征维度上计算（不是 batch 维度）
- gamma、beta：可学习的缩放和偏移参数
- epsilon：防止除零的小常数（如 1e-5）

数值例子：

```
x = [2.0, 4.0, 6.0, 8.0]
mean = 5.0
var = 5.0
std = 2.236

normalized = [(2-5)/2.236, (4-5)/2.236, (6-5)/2.236, (8-5)/2.236]
           = [-1.342, -0.447, 0.447, 1.342]
```

LayerNorm 确保每层的输入分布稳定，加速训练收敛。

### 6.3 Pre-Norm vs Post-Norm

原始 Transformer（Post-Norm）：先算 Attention/FFN，再 LayerNorm。

现代 LLM（Pre-Norm，GPT-2 之后普遍使用）：先 LayerNorm，再算 Attention/FFN。

```
Pre-Norm:
  x' = x + Attention(LayerNorm(x))
  x'' = x' + FFN(LayerNorm(x'))
```

Pre-Norm 训练更稳定，因为 LayerNorm 在残差分支内部，限制了每层的输出幅度。

### 6.4 一个完整 Transformer 层的伪代码

```python
def transformer_layer(x, W_Q, W_K, W_V, W_O, W_1, W_2, gamma1, beta1, gamma2, beta2):
    # 1. Pre-Norm + Multi-Head Attention + 残差
    normed = layer_norm(x, gamma1, beta1)
    attn_out = multi_head_attention(normed, W_Q, W_K, W_V, W_O)
    x = x + attn_out

    # 2. Pre-Norm + FFN + 残差
    normed = layer_norm(x, gamma2, beta2)
    ffn_out = ffn(normed, W_1, W_2)
    x = x + ffn_out

    return x
```

---

## 七、堆叠层与输出

### 7.1 GPT-2 的完整架构参数

| 模型 | 层数 | d（嵌入维度） | 头数 | FFN 中间维度 | 总参数量 |
|------|------|-----------|------|------------|---------|
| GPT-2 Small | 12 | 768 | 12 | 3072 | 124M |
| GPT-2 Medium | 24 | 1024 | 16 | 4096 | 350M |
| GPT-2 Large | 36 | 1280 | 20 | 5120 | 774M |
| GPT-2 XL | 48 | 1600 | 25 | 6400 | 1.5B |
| GPT-3 | 96 | 12288 | 96 | 49152 | 175B |

### 7.2 从隐藏状态到词汇表概率

经过 N 层 Transformer 后，最后一个 token 位置的隐藏状态 h_final（768 维）需要转换为词汇表上的概率分布。

```
logits = h_final @ W_e^T    (形状: [768] @ [768, 50257] = [50257])
probs = softmax(logits / temperature)
```

注意：输出投影矩阵通常直接复用 embedding 矩阵 W_e 的转置（weight tying），节省参数。

logits 是未归一化的分数。除以温度后做 softmax 得到概率分布。

### 7.3 参数量详算（GPT-2 Small）

```
Token Embedding:  50257 * 768 = 38,597,376
Position Embedding: 1024 * 768 = 786,432

每层 Transformer:
  Attention (Q,K,V,O): 768*768*4 = 2,359,296
  Attention bias: 768*4 = 3,072
  FFN W_1: 768*3072 = 2,359,296
  FFN b_1: 3,072
  FFN W_2: 3072*768 = 2,359,296
  FFN b_2: 768
  LayerNorm (2个): 768*2*2 = 3,072
  每层小计: ≈ 7,087,872

12 层: 7,087,872 * 12 = 85,054,464
最终 LayerNorm: 768*2 = 1,536
输出投影: 复用 Token Embedding（不额外计算）

总计: 38,597,376 + 786,432 + 85,054,464 + 1,536 = 124,439,808 ≈ 124M
```

---

## 八、MoE（混合专家模型）

### 8.1 Dense vs MoE

Dense 模型的 FFN：每个 token 都过同一个 [768, 3072] → [3072, 768] 的网络。

MoE 的做法：把 FFN 拆成 E 个专家（比如 E=8），每个专家有独立的 W_1, W_2。每个 token 只过其中 k 个（比如 k=2）。

```
Dense FFN:
  所有 token → 同一个 FFN → 输出

MoE FFN:
  token → Router 网络 → 选 Expert 3 和 Expert 7
                       → FFN_3(token) * weight_3 + FFN_7(token) * weight_7 → 输出
```

### 8.2 Router 的计算

Router 是一个小的线性层：

```
router_logits = x @ W_router    (W_router 形状: [768, E])
router_probs = softmax(router_logits)
```

选 top-k 个 expert：

```
top_k_indices = topk(router_probs, k=2)
top_k_weights = router_probs[top_k_indices]
top_k_weights = top_k_weights / sum(top_k_weights)    # 重新归一化
```

最终输出：

```
output = sum(top_k_weights[i] * Expert_i(x) for i in top_k_indices)
```

### 8.3 实际规模

| 模型 | 总参数 | 每 token 激活参数 | Expert 数 | 每 token 选 k 个 |
|------|--------|-----------------|----------|----------------|
| Mixtral 8x7B | 46.7B | 12.9B | 8 | 2 |
| DeepSeek-V3 | 671B | 37B | 256 | 8 |
| GLM 4.5 Air | 未公开 | 未公开 | MoE 架构 | - |

### 8.4 训练难题：负载均衡

如果 Router 总把 token 送给少数几个 Expert，其他 Expert 得不到训练，能力退化。

常见解决方案：

**辅助损失（Auxiliary Load Balancing Loss）**：

```
L_aux = E * sum(f_i * P_i)  for i = 1..E
```

其中 f_i 是 Expert i 被选中的频率，P_i 是 Router 给 Expert i 的平均概率。这个损失鼓励均匀分配。

这就是 KARL 论文中说"GRPO 在 MoE 上需要 router replay"的背景。在线 RL 训练时，策略更新会扰动 Router 的行为，如果不用 replay 缓冲来稳定 Router，训练容易崩溃。OAPL 因为是离线训练，这个问题天然被缓解。

---

## 九、预训练

### 9.1 训练目标

交叉熵损失：

```
L = -1/T * sum_{t=1}^{T} log P(x_t | x_1, ..., x_{t-1})
```

其中 T 是序列长度，P 是模型预测的概率。

具体例子：

```
真实 token: "法" (ID 7291)
模型预测概率分布: [..., P(7291)=0.35, ...]

该位置的损失 = -log(0.35) = 1.05

如果模型很确定: P(7291)=0.95 → 损失 = -log(0.95) = 0.05
如果模型很不确定: P(7291)=0.01 → 损失 = -log(0.01) = 4.61
```

训练就是不断降低这个损失，让模型对正确 token 分配更高的概率。

### 9.2 训练规模

| 模型 | 参数量 | 训练数据量 | GPU | 训练时间 | 估算成本 |
|------|--------|----------|-----|---------|---------|
| GPT-2 | 1.5B | 40GB 文本 | 256 TPU v3 | 1 周 | ~$50K |
| GPT-3 | 175B | 300B token | 1024 A100 | 数月 | ~$5M |
| GPT-4 | ~1.8T(传闻) | ~13T token | ~25000 A100 | ~100 天 | ~$100M |
| Llama 3 | 70B | 15T token | 16384 H100 | ~54 天 | ~$20M |

### 9.3 关键超参数

- **Learning rate**：通常 6e-4 到 3e-4，使用 warmup + cosine decay
- **Batch size**：从小到大逐步增加（GPT-3 从 32K token 增到 3.2M token per step）
- **Sequence length**：预训练时固定（如 2048 或 4096）
- **Weight decay**：0.1（L2 正则化，防止过拟合）
- **Gradient clipping**：梯度范数超过 1.0 时裁剪

---

## 十、SFT 与后训练

### 10.1 SFT（监督微调）

在高质量的 instruction-response 对上继续训练。

```
数据格式:
  [INST] 请用一句话解释量子纠缠 [/INST]
  两个粒子一旦纠缠，无论相距多远，测量一个会瞬间影响另一个的状态。

训练:
  只对回答部分计算损失（instruction 部分被掩码）
```

SFT 的数据量远小于预训练（几万到几十万条），但质量极高。

### 10.2 后训练概述

SFT 之后通常还有 RL 后训练。这是下一章的主题——KARL 的核心所在。

这里只需要记住：SFT 教的是"格式和风格"，RL 教的是"决策和策略"。

---

## 十一、生成策略

### 11.1 温度

```
probs = softmax(logits / T)
```

T = 0.1 时：

```
logits = [2.0, 1.5, 0.5]
logits/T = [20, 15, 5]
probs = softmax([20, 15, 5]) ≈ [0.993, 0.007, 0.000]    → 几乎确定选第一个
```

T = 2.0 时：

```
logits/T = [1.0, 0.75, 0.25]
probs = softmax([1.0, 0.75, 0.25]) ≈ [0.42, 0.33, 0.25]    → 更均匀
```

### 11.2 Top-k 采样

只从概率最高的 k 个 token 中采样：

```
原始分布: {A: 0.3, B: 0.25, C: 0.15, D: 0.1, E: 0.08, ...其余 0.12}
Top-k=3 后: {A: 0.429, B: 0.357, C: 0.214}    （重新归一化前三个）
```

### 11.3 Top-p（Nucleus Sampling）

找最小的 token 集合，使其累积概率 >= p：

```
排序: A(0.3), B(0.25), C(0.15), D(0.1), E(0.08), ...
p=0.7:  A + B + C = 0.7 → 从 {A, B, C} 中采样
p=0.9:  A + B + C + D = 0.8, + E = 0.88, + F(0.05) = 0.93 → 从 {A,B,C,D,E,F} 中采样
```

Top-p 的优势：自适应——当模型很确定时（一个 token 概率 0.9），候选集很小；当模型不确定时，候选集自动变大。

### 11.4 KV Cache

推理时的关键优化。

```
没有 KV Cache:
  Step 1: 计算 [x1] 的 attention → 输出 token y1
  Step 2: 计算 [x1, y1] 的 attention → 重新算 x1 的 K,V
  Step 3: 计算 [x1, y1, y2] 的 attention → 重新算 x1, y1 的 K,V
  ...
  Step N: 重新算所有前面 token 的 K,V → O(N^2) 总计算量

有 KV Cache:
  Step 1: 计算 x1 的 K,V → 存入 cache → 输出 y1
  Step 2: 只算 y1 的 K,V → 从 cache 取 x1 的 K,V → attention → 输出 y2
  Step 3: 只算 y2 的 K,V → 从 cache 取 x1,y1 的 K,V → attention → 输出 y3
  ...
  Step N: 只算 1 个新 token 的 K,V → O(N) 总计算量
```

代价：缓存占用显存。对于 128K 上下文的 GPT-4 级模型，KV cache 可能占数十 GB 显存。

---

## 本章总结

你现在应该能理解：

1. **Token 化**：BPE 如何把文本切分成 token
2. **Embedding**：token ID 怎么变成连续向量，位置信息怎么编码
3. **Self-Attention**：完整的 Q/K/V 计算、缩放、因果掩码、softmax、加权求和
4. **Multi-Head**：多个注意力头并行学习不同模式
5. **FFN**：两层网络做知识存储，参数量是注意力的两倍
6. **Transformer 层**：Pre-Norm + Attention + 残差 + Pre-Norm + FFN + 残差
7. **MoE**：Router 选 Expert，以小博大，但有负载均衡难题
8. **预训练**：交叉熵损失，万亿 token 级数据
9. **生成策略**：温度、Top-k、Top-p、KV Cache

**下一篇：[02. 强化学习与后训练](../02-rl-and-post-training)** — KARL 的核心训练方法
