---
title: "深度解读 | 腾讯混元 Hy3 preview：295B/21B 的 MoE 新旗舰，不只是在卷推理，而是在正面押注代码与 Agent"
description: "Tencent Hunyuan Hy3 preview, MoE, 295B, 21B active, 256K context, MTP, reasoning_effort, SWE-bench Verified, Terminal-Bench 2.0, BrowseComp, WideSearch, Tencent Hy Community License"
---

# Tencent Hunyuan Hy3 preview

> 原始信源：
> 1. GitHub README / 模型仓库：https://github.com/Tencent-Hunyuan/Hy3-preview
> 2. Hugging Face 模型卡：https://huggingface.co/tencent/Hy3-preview
> 3. Hugging Face 配置文件：https://huggingface.co/tencent/Hy3-preview/raw/main/config.json
> 4. Hugging Face 生成配置：https://huggingface.co/tencent/Hy3-preview/raw/main/generation_config.json
> 5. Hugging Face 许可证：https://huggingface.co/tencent/Hy3-preview/raw/main/LICENSE
>
> 发布日期核验：README News 与许可证均指向 2026-04-23。
>
> 去重说明：已实际检索 2026-04-11 至 2026-04-24 的 Lighthouse `deep-*.md`，未发现同一事件 deep 重复稿；过去 14 天仅存在若干“腾讯混元 3.0 是否将发布”的日更追踪与 2026-04-24 的 daily 短条，不构成同一篇深读重复。

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | 腾讯这次不是只放出一个更大的开源权重，而是明确把 Hy3 preview 定义成“复杂推理 + 代码执行 + Agent 工作流”的新旗舰。 |
| 最硬规格 | 295B 总参数、21B 激活参数、3.8B MTP 层参数、80 层主体 + 1 层 MTP、192 专家 top-8 激活、256K 上下文、BF16。 |
| 最值得记住的设计点 | 它既是 MoE 大模型，也是一个原生面向工具调用、推理模式切换、OpenAI 兼容部署的 agent-oriented 模型。 |
| 腾讯自己强调的最大提升 | 代码与智能体。README 明说“Coding and agents saw the biggest gains”。 |
| 生态落点 | 官方同时给出 Hugging Face / ModelScope / GitCode 分发、vLLM / SGLang 部署、OpenAI 兼容 API、完整训练流水线、量化工具 AngelSlim。 |
| 最大现实约束 | 官方建议 8 卡部署且推荐 H20-3e 或更大显存 GPU；许可证还有地域限制、100M MAU 商业门槛、以及“不得用输出改进其他 AI 模型”的条款。 |
| 本文核心判断 | Hy3 preview 真正的战略意义，不是“腾讯也有一个大 MoE 了”，而是腾讯开始用公开模型卡把自己重新放回中国开源推理/Agent 主战场。 |

## 一、腾讯这次到底发布了什么

官方 README 的第一段已经把 Hy3 preview 的身份说得很清楚：

- 它是腾讯混元团队开发的 MoE 模型；
- 295B 总参数，21B 激活参数；
- 另有 3.8B MTP layer parameters；
- 是“重建后训练的第一个模型”；
- 也是腾讯截至目前“最强”的已发布模型；
- 提升重点不是泛泛的聊天，而是复杂推理、指令遵循、上下文学习、代码、智能体任务。

这段表述很关键，因为它透露了两层意思。

第一，腾讯在有意把这次发布和一轮“基础设施/训练体系重建”绑定。也就是说，Hy3 preview 不只是某个 checkpoint，而像是新训练栈的第一张成绩单。

第二，腾讯不再把旗舰模型主要包装成“通用对话模型”，而是直接把代码与 agent 放在主叙事中央。这和过去很多中国大厂先讲通用能力、再讲垂直应用的发布顺序明显不同。

## 二、已核验的模型卡硬规格

以下规格来自 GitHub README 与 Hugging Face 配置文件，可直接视为已核验事实。

### 1. README / 模型卡显式给出的规格

| 属性 | 官方值 |
|---|---|
| 架构 | Mixture-of-Experts (MoE) |
| 总参数量 | 295B |
| 激活参数量 | 21B |
| MTP 层参数量 | 3.8B |
| 层数（不含 MTP） | 80 |
| MTP 层数 | 1 |
| 注意力头 | 64 |
| KV 头 | 8 |
| head dim | 128 |
| Hidden Size | 4096 |
| Intermediate Size | 13312 |
| 上下文长度 | 256K |
| 词表大小 | 120832 |
| 专家数 | 192 experts, top-8 activated |
| 支持精度 | BF16 |

### 2. 配置文件进一步暴露出的结构细节

`config.json` 还给了几项 README 没展开、但对技术读者很重要的细节：

- `architectures`: `HYV3ForCausalLM`
- `model_type`: `hy_v3`
- `max_position_embeddings`: `262144`
- `num_experts_per_tok`: `8`
- `num_shared_experts`: `1`
- `first_k_dense_replace`: `1`
- `expert_hidden_dim`: `1536`
- `moe_intermediate_size`: `1536`
- `hidden_act`: `silu`
- `qk_norm`: `true`
- `rope_theta`: `11158840.0`
- `num_nextn_predict_layers`: `1`
- `transformers_version`: `5.6.0`

这里最值得注意的是三点。

第一，21B active 对应的是一个明显为推理成本优化过的 MoE 路线：总参数做大，但单 token 的激活成本控制在 21B 级别，而不是把 295B 全量摊给每次前向。

第二，`num_shared_experts: 1` 和 `top-8` 激活说明它并不是最极端的纯路由稀疏结构，而更像是带共享能力底座的混合路线，目的是在容量、稳定性和推理成本之间取平衡。

第三，MTP 层不是宣传口号，而是明确写进规格和部署方式里的正式组件。官方甚至在 vLLM 和 SGLang 部署命令中都把 speculative / MTP 路径显式打开，这说明它是性能设计的一部分，不是论文附属特性。

## 三、这不是普通聊天模型：官方把“思考模式”和“工具调用”做进了模板

如果只看 README，很多人会把 Hy3 preview 理解成“腾讯版大 MoE”。但真正值得重视的是 Hugging Face 仓库里的 `chat_template.jinja`。

从模板可确认几件事：

1. 模型原生支持 `reasoning_effort` 控制，允许：
   - `no_think`
   - `low`
   - `high`

2. 官方 Quickstart 明确把 `reasoning_effort` 当作可调接口暴露：
   - 复杂数学、代码、推理任务建议 `high`
   - 直接回答建议 `no_think`

3. 模板中包含成套的工具调用特殊 token：
   - `<tool_calls>`
   - `<tool_call>`
   - `<tool_responses>`
   - `<tool_response>`
   - `<arg_key>`
   - `<arg_value>`

4. 模板中还显式定义了 `<think>` / `</think>` 结构，以及 reasoning mode token。

这意味着 Hy3 preview 并不是“靠外层框架勉强接工具”的模型，而是从 chat template 层面就按工具调用、推理模式和 agent loop 组织过输入输出协议。

换句话说，它不是只会回答问题，而是被设计成更适合接入执行链的模型。

## 四、官方 benchmark 到底说了什么

### 1. 预训练 Base 模型对比：Hy3 preview-Base 不是全榜第一，但在数学、代码和多语上相当能打

README 里有一张文本表，直接可核验。对比对象是：

- Kimi-K2 BASE
- DeepSeek-V3 BASE
- GLM-4.5 BASE
- Hy3 preview-Base

其中 Hy3 preview-Base 的可直接确认成绩包括：

| 类别 | 基准 | Hy3 preview-Base | 观察 |
|---|---|---:|---|
| English | MMLU | 87.42 | 略低于 Kimi-K2 的 88.24 |
| English | MMLU-Pro | 65.76 | 略低于 Kimi-K2 的 65.98 |
| English | SuperGPQA | 51.60 | 该表中第一 |
| Code | CRUXEval-I | 71.19 | 该表中第一 |
| Code | LiveCodeBench-v6 | 34.86 | 该表中第一 |
| Math | GSM8K | 95.37 | 该表中第一 |
| Math | MATH | 76.28 | 该表中第一 |
| Math | CMath | 91.17 | 该表中第一 |
| Chinese | C-Eval | 89.80 | 低于 Kimi-K2 的 91.51 |
| Chinese | CMMLU | 89.61 | 低于 Kimi-K2 的 90.72 |
| Multilingual | MMMLU | 80.15 | 该表中第一 |
| Multilingual | INCLUDE | 78.64 | 该表中第一 |

这个结果很有信息量。

它说明 Hy3 preview-Base 的优势并不在“所有通识基准全线碾压”，而是在更接近下一代生产场景的几条线上拉开：

- 数学与推理
- 代码执行
- 多语覆盖

但它在传统通识问答和部分中文考试类 benchmark 上，并没有把 Kimi-K2 等模型完全压过去。这反而让这张表更可信，因为腾讯并没有把它包装成“全领域无死角第一”。

### 2. Instruct / 推理图：腾讯主打的是 STEM 强推理，不是轻量闲聊

官方 STEM 图中，Hy3 preview 可读出的成绩包括：

| 基准 | Hy3 preview |
|---|---:|
| FrontierScience Olympiad | 70.0 |
| IMO Answer Bench | 84.3 |
| HLE | 30.0 |
| GPQA-Diamond | 87.2 |
| 清华求真书院数学博资考（avg@3） | 88.4 |
| CHSBO 2025（text-only, pass^3） | 87.8 |

同图里它对比的模型包括 Gemini-3.1-Pro、GLM-5、Kimi-K2.5、GPT-5.4 xhigh 等。Hy3 preview 在若干项目上仍落后 GPT-5.4 xhigh 或 Gemini-3.1-Pro，但相对 GLM-5、Kimi-K2.5 基本处于非常接近甚至局部领先的位置。

这说明腾讯并没有把 Hy3 preview 说成“闭眼超越全球闭源最强”，而是更谨慎地把它定位为：在开源或可替代闭源成本区间里，推理能力已经进入非常有竞争力的一层。

### 3. 上下文学习与指令遵循：腾讯开始把真实业务场景 eval 搬上台面

官方 context 图中，Hy3 preview 可读出的成绩包括：

| 基准 | Hy3 preview |
|---|---:|
| AdvancedIF（CIF & CC subsets） | 79.5 |
| AA-LCR | 66.3 |
| LongBench v2 | 65.4 |
| CL-bench | 22.8 |
| CL-bench Life | 15.7 |

最关键的不是绝对分数，而是 README 明说：

- CL-bench
- CL-bench-Life

是腾讯从自身业务场景里构建出来、用来测“上下文学习能力”的评估集。

这很重要，因为它暴露出腾讯对下一阶段模型能力的判断：真正难的不是答一道题，而是在“杂乱、冗长、规则很多、上下文质量参差”的真实输入里保持稳定执行。

如果把这个点和 256K context 放在一起看，就能理解腾讯为什么不断强调 context learning 而不是只强调 long context 本身。它卖的不是“能塞很多 token”，而是“塞很多 token 后还能照规矩办事”。

### 4. 代码与 Agent：这是 Hy3 preview 最核心的卖点

官方 README 直接写了：

“Coding and agents saw the biggest gains.”

从官方 agent chart 可读出的分数看，Hy3 preview 的公开成绩为：

| 基准 | Hy3 preview |
|---|---:|
| SWE-bench Verified | 74.4% |
| Terminal-Bench 2.0 | 54.4% |
| BrowseComp | 67.1% |
| WideSearch | 70.2% |

同图中可读到的对手成绩包括：

- Kimi-K2.5：78.8 / 50.0 / 74.8 / 72.7
- GLM-5：77.8 / 56.2 / 75.9 / 69.8
- GLM-4.7：73.8 / 41.0 / 57.8 / 65.8
- Claude-Opus-4.6：80.8 / 64.4 / 84.0 / 77.2

这个表最值得看的不是“有没有超过 Claude”，而是三件事。

第一，Hy3 preview 在 SWE-bench Verified 上已经进入 70%+ 区间，说明它至少已经不是“能写点代码”的普通模型，而是有资格进入高强度开发评测讨论的模型。

第二，它在 Terminal-Bench 2.0、BrowseComp、WideSearch 这些更贴近 agent 运行环境的 benchmark 上也都有明确成绩，说明腾讯不是只挑自己擅长的 coding 子项秀成绩，而是在试图构造完整 agent 能力画像。

第三，它和 GLM-5、Kimi-K2.5 的相对位置非常接近，这意味着中国开源/半开源大模型在“代码 + agent”这条线上的竞争，已经进入真对位阶段，而不是一家独走、其余陪跑。

### 5. 内部开发工作流评测：腾讯在试图证明自己不只会刷公开榜

README 还给出了一组内部评测：

| 内部基准 | Hy3 preview | Hy2 | Kimi-K2.5 | GLM-5 | Claude-Opus-4.6 |
|---|---:|---:|---:|---:|---:|
| Hy-Backend | 54.7 | 24.3 | 48.6 | 51.8 | 65.2 |
| Hy-Vibe Bench | 50.5 | 28.5 | 44.0 | 60.0 | 70.0 |
| Hy-SWE Max | 30.0 | 8.3 | 22.7 | 31.3 | 44.7 |

这些不是公开标准集，所以不能把它们当作行业通用结论。但它们仍然有价值，因为腾讯借此想证明一件事：Hy3 preview 的优化方向是现实开发工作流，而不只是公开题库。

从相对位置看，Hy3 preview 对 Hy2 提升非常大；对 Kimi-K2.5 大多领先；对 GLM-5 有来有回；对 Claude-Opus-4.6 仍有距离。

这其实是一个很合理、也很有说服力的位置：腾讯已经把自己拉进第一梯队讨论，但还没到“闭眼最强”的程度。

## 五、生态与部署：腾讯这次把“可拿来用”写得比很多开源发布更完整

### 1. 分发渠道是一次性铺开的

官方 README 的 Model Links 同时列出：

- Hy3 preview（Instruct）
- Hy3 preview-Base（Pre-trained base model）

并同步给出：

- Hugging Face
- ModelScope
- GitCode

这意味着腾讯并不是只做一个 GitHub 展示页，而是从第一天就准备了国际开源社区、中国模型社区和本土代码平台的多点落地。

### 2. 部署入口直接按工程栈来写

README 的部署部分不是“以后支持 vLLM / SGLang”，而是直接给出命令：

- vLLM：
  - `--tensor-parallel-size 8`
  - `--speculative-config.method mtp`
  - `--tool-call-parser hy_v3`
  - `--reasoning-parser hy_v3`
  - `--enable-auto-tool-choice`

- SGLang：
  - `--tp 8`
  - `--tool-call-parser hunyuan`
  - `--reasoning-parser hunyuan`
  - `--speculative-algorithm EAGLE`
  - `--speculative-num-steps 1`

这说明两件事：

第一，腾讯是按“需要真部署的人会看什么”来写模型卡的，而不是只写一句“支持主流推理框架”。

第二，工具调用解析器、reasoning parser、speculative decoding 这些 agent 关键能力，并不是第三方社区补出来的，而是官方正面给出的部署路径。

### 3. OpenAI 兼容 API 是腾讯想吃开发者迁移红利的信号

Quickstart 直接使用：

- `from openai import OpenAI`
- `client.chat.completions.create(...)`

也就是说，Hy3 preview 明显希望被放进现有 OpenAI 兼容生态，而不是要求开发者完全改写 SDK 和调用习惯。

在今天的开发者工具市场，这一点非常重要。因为模型切换成本越低，真正决定采用率的就越不是“文档好不好看”，而是“能不能无痛插进现有 agent stack”。

### 4. 训练与量化链路也一起放出

README 还给出：

- 完整训练流水线
- 支持 full fine-tuning
- 支持 LoRA fine-tuning
- 支持 DeepSpeed ZeRO 配置
- 集成 LLaMA-Factory
- 官方量化工具 AngelSlim

这意味着腾讯不是只想让 Hy3 preview 成为“可调用模型”，而是想让它成为一个可再训练、可裁剪、可私有化改造的模型底座。

这对企业用户比对普通聊天用户更重要。

## 六、真正的战略意义：腾讯这次是在重返中国开源大模型主战场

如果只看参数，Hy3 preview 看起来像“腾讯也发了一个大号 MoE”。但如果把整个模型卡连起来读，信号远不止如此。

### 1. 腾讯把主战场从“谁也有通用模型”改成“谁更能做复杂执行任务”

Hy3 preview 的模型卡几乎每一部分都在把讨论拉向：

- reasoning
- context learning
- coding
- agent

这不是偶然。因为到 2026 年这个节点，单纯比聊天体验已经很难建立新壁垒，真正能拉开差距的是：

- 多步骤任务完成率
- 工具调用稳定性
- 开发工作流适配
- 长上下文规则遵循

腾讯这次显然决定直接打这些高价值场景，而不是再走一遍“先做通用聊天，再慢慢做应用”的老路。

### 2. 它在试图把腾讯内部生态的工程能力外显化

CL-bench、CL-bench-Life、Hy-Backend、Hy-Vibe Bench、Hy-SWE Max 这些名字，都不是传统学术 benchmark 命名风格，而是明显带着内部业务和产品实践痕迹。

这件事很关键，因为它说明腾讯开始把自己长期积累的业务环境，当成训练和评测资产，而不是只当应用分发渠道。

简单说，腾讯不是只想说“我们有很多产品可以接模型”，而是想说“我们的复杂业务流本身已经反哺了模型评测与优化”。

### 3. 它在重新争开发者心智

只要看三个动作就够了：

- OpenAI 兼容 API
- vLLM / SGLang 明确部署
- full FT / LoRA / ZeRO / LLaMA-Factory / AngelSlim 一起给出

这不是面向普通 C 端用户的发布姿态，而是面向开发者、平台工程师和企业技术团队的姿态。

腾讯过去在开源模型讨论里的存在感，不如 Qwen、DeepSeek 那么强。Hy3 preview 的真正价值，很可能就是把腾讯重新拉回“值得开发者认真试一试”的那个名单里。

## 七、批判性看待：Hy3 preview 很强，但它也有三道现实门槛

### 1. 成绩强，不等于迁移成本低

官方建议已经写得很明确：

“Hy3-preview has 295B parameters in total. To serve it on 8 GPUs, we recommend using H20-3e or other GPUs with larger memory capacity.”

这句话的翻译非常现实：

- 它不是人人本地就能跑的模型；
- 也不是普通中小团队能随便拉起来的模型；
- 真正能舒服部署它的，还是云厂、算力条件较好的实验室、或者有较强 GPU 预算的团队。

因此 Hy3 preview 的第一波受益者，不会是“最低成本本地派”，而会是那些本来就拥有较强推理基础设施的人。

### 2. Agent benchmark 强，不代表真实 agent 产品已经成熟

SWE-bench Verified、Terminal-Bench 2.0、BrowseComp、WideSearch 这些 benchmark 很重要，但它们仍然不是全部现实。

一个模型在 agent 基准上成绩不错，并不自动等于：

- API 稳定性足够高
- 工具调用足够可控
- 长时任务失败恢复足够成熟
- 产品层 memory / session / orchestration 足够好
- 企业权限、安全、审计问题已解决

换句话说，Hy3 preview 已经证明“底模能力足够进入 agent 主战场”，但还没有自动证明“基于它的所有 agent 产品都已经好用”。

### 3. 许可证约束比很多开发者想象得更重

`Tencent Hy Community License Agreement` 是这次发布里一个绝对不能忽略的部分。

其中最重要的限制有：

1. 许可证明确写明：
   - 不适用于欧盟、英国、韩国；
   - Territory 为“全球，但排除欧盟、英国、韩国”。

2. 若发布时你的产品或服务月活超过 1 亿，需另向腾讯申请许可证，否则无权行使协议项下权利。

3. 明确禁止：
   - 使用 Tencent Hy Works、输出或结果去改进其他 AI 模型；
   - 在 Territory 之外使用、复制、修改、分发或展示。

4. 使用时需遵守 Acceptable Use Policy，且包含军事用途等明确禁区。

这意味着 Hy3 preview 虽然是“开源/开放权重”路线，但并不是传统意义上的宽松开源许可证。对很多国际化团队、模型蒸馏团队、以及希望将其作为跨境产品底座的公司来说，这会是实打实的采用门槛。

## 八、从行业角度看，Hy3 preview 释放了什么信号

### 1. 中国头部模型竞争，正在从“聊天能力”彻底切向“执行能力”

Hy3 preview 最值得记住的不是 295B，而是腾讯把最亮的灯打在了：

- 代码
- 搜索 agent
- 开发工作流
- 复杂规则遵循

这和全球趋势是同步的。现在真正值钱的模型，不再只是会答，而是会做。

### 2. 腾讯开始用“模型卡工程化程度”来争可信度

这次 README 的一个优点是工程信息足够足：

- 具体架构
- 具体部署命令
- 具体推理参数
- 具体训练支持
- 具体量化工具
- 具体许可证边界

很多模型发布喜欢只谈愿景，不谈如何真正跑起来。Hy3 preview 至少在文档层面不是这个路子。它更像是在说：你如果真的想部署、微调、接 agent、做兼容，我们已经把入口准备好了。

### 3. 腾讯的真实野心不是单模型，而是“模型 + 基础设施 + 分发”的整套回归

GitHub、Hugging Face、ModelScope、GitCode、vLLM、SGLang、OpenAI-compatible API、DeepSpeed、LLaMA-Factory、AngelSlim，这些点连起来之后，Hy3 preview 就不再只是一个模型发布，而是一次“把腾讯重新插回开发者工作流”的系统动作。

如果后续腾讯云、元宝、企业侧产品再把 Hy3 preview 进一步绑定进去，这条线会更完整。

## 九、结论

Hy3 preview 的发布，最容易被低估的地方，是外界可能只看到“腾讯也发了个 295B MoE”。

但真正读完原始 README、配置、模板和许可证后，会更清楚地看到：

- 它不是一个单纯追参数的模型；
- 它是一个明显按 agent 时代需求重写过接口和叙事的模型；
- 腾讯最想证明的不是“我们也有大模型”，而是“我们也能提供能进开发工作流、能接工具、能跑长上下文、能做复杂执行的新旗舰”。

如果只问一句最核心的判断，那就是：

Hy3 preview 标志着腾讯开始把开源旗舰模型的竞争重点，从“有没有牌”切到“能不能真干活”。

而从官方给出的文档完整度、agent benchmark 取向、部署入口和训练工具链来看，这次不是象征性亮相，而是一张准备认真打的牌。
