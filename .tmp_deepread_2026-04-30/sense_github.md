Title: GitHub - OpenSenseNova/SenseNova-U1: SenseNova-U series: Native Unified Paradigm with NEO-Unify from the First Principles

URL Source: https://github.com/OpenSenseNova/SenseNova-U1

Markdown Content:
## SenseNova-U1: Unifying Multimodal Understanding and Generation with NEO-Unify Architecture

[](https://github.com/OpenSenseNova/SenseNova-U1#sensenova-u1-unifying-multimodal-understanding-and-generation-with-neo-unify-architecture)
**English** | [简体中文](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/README_CN.md)

[![Image 1: arXiv](https://camo.githubusercontent.com/9cd89eea0b0bb83645278a7b3b23c907d46ffd84b88a998d99053470d8f0bf8c/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f61725869762d436f6d696e672d6233316231622e737667)](https://github.com/OpenSenseNova/SenseNova-U1#)[![Image 2: HuggingFace Model](https://camo.githubusercontent.com/43146d6207b18d19a795bc08057851319bf5c50b355aafa3e12d1f898a60aeb0/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f25463025394625413425393725323048756767696e67466163652d4d6f64656c2d79656c6c6f77)](https://huggingface.co/collections/sensenova/sensenova-u1)[![Image 3: SenseNova-U1 Demo](https://camo.githubusercontent.com/df5eb4a8c4a4af0235546e8e71d36e2119be6af7bf2be4f34f0aba2fff7d1bb8/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f25463025394625413425393725323053656e73654e6f76615f55312d44656d6f2d477265656e)](https://unify.light-ai.top/)[![Image 4: License](https://camo.githubusercontent.com/a549a7a30bacba7bfceebdc207a8e86c3f2c02995a2527640dca30048fd2b64e/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4c6963656e73652d417061636865253230322e302d626c75652e737667)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/LICENSE)[![Image 5: Discord](https://camo.githubusercontent.com/397741123d69503a0a224452a3629154669e9a870686f0c21c68527c7d8faa07/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f446973636f72642d4a6f696e2d3538363546323f6c6f676f3d646973636f7264266c6f676f436f6c6f723d7768697465)](https://discord.gg/cxkwXWjp)

[![Image 6: SenseNova-U1](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/teaser.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/teaser.webp)

[![Image 7: visualization](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/teaser_2.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/teaser_2.webp)

## 🌟 Overview

[](https://github.com/OpenSenseNova/SenseNova-U1#-overview)
🚀 **SenseNova U1** is a new series of native multimodal models that unifies multimodal understanding, reasoning, and generation within a monolithic architecture. It marks a fundamental paradigm shift in multimodal AI: **from modality integration to true unification**. Rather than relying on adapters to translate between modalities, SenseNova U1 models think-and-act across language and vision natively.

Unifying visual understanding and generation in an end-to-end architecture from pixel to word opens tremendous possibilities, enabling highly efficient and strong understanding, generation, and interleaved reasoning in a natively multimodal manner.

[![Image 8: radar plot](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/teaser_1.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/teaser_1.webp)

#### 🏗️ _Key Pillars:_

[](https://github.com/OpenSenseNova/SenseNova-U1#%EF%B8%8F-key-pillars)
At the core of SenseNova U1 is **[NEO-Unify](https://huggingface.co/blog/sensenova/neo-unify)**, a novel architecture designed from the first principles for multimodal AI: _It eliminates both Visual Encoder (VE) and Variational Auto-Encoder (VAE) where pixel-word information are inherently and deeply correlated._ Several important features are as follows:

*   🔗 Model language and visual information end-to-end as a unified compound.
*   🖼️ Preserve semantic richness while maintaining pixel-level visual fidelity.
*   🧠 Reason across modalities with high efficiency & minimal conflict via native MoTs.

#### ✨ _What This Unlocks:_

[](https://github.com/OpenSenseNova/SenseNova-U1#-what-this-unlocks)
Powered by this new core architecture, SenseNova U1 delivers exceptional efficiency in multimodal learning:

[![Image 9](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/perform_vs_speed_5bench.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/perform_vs_speed_5bench.webp)[![Image 10](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/perform_vs_speed_infobench.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/perform_vs_speed_infobench.webp)

Left: Generation Latency vs. Averaging Performance on OneIG (EN, ZH), LongText (EN, ZH), BizGenEval (Easy, Hard), CVTG and IGenBench. 

 Right: Generation Latency vs. Averaging Performance on Infographic Benchmarks, i.e., BizGenEval (Easy, Hard), and IGenBench.

*   🏆 **Open-source SoTA in both understanding and generation**: SenseNova U1 sets a new standard for unified multimodal understanding and generation, achieving state-of-the-art performance among open-source models across a wide range of understanding, reasoning, and generation benchmarks.

*   📖 **Native interleaved image-text generation**: SenseNova U1 can generate coherent interleaved text and images in a single flow with one model, enabling use cases such as practical guides and travel diaries that combine clear communication with vivid storytelling and transform complex information into intuitive visuals.

*   📰 **High-density information rendering**: SenseNova U1 demonstrates strong capabilities in dense visual communication, generating richly structured layouts for knowledge illustrations, posters, presentations, comics, resumes, and other information-rich formats.

#### 🌍 _Beyond Multimodality:_

[](https://github.com/OpenSenseNova/SenseNova-U1#-beyond-multimodality)
*   🤖 Vision–Language–Action (VLA)
*   🌐 World Modeling (WM)

## 🦁 Models

[](https://github.com/OpenSenseNova/SenseNova-U1#-models)
In this release, we are open-sourcing the SenseNova U1 Lite series in two sizes:

*   SenseNova U1-8B-MoT — dense backbone
*   SenseNova U1-A3B-MoT — MoE backbone

| Model | Params | HF Weights |
| --- | --- | --- |
| SenseNova-U1-8B-MoT-SFT | 8B MoT | [🤗 link](https://huggingface.co/sensenova/SenseNova-U1-8B-MoT-SFT) |
| SenseNova-U1-8B-MoT | 8B MoT | [🤗 link](https://huggingface.co/sensenova/SenseNova-U1-8B-MoT) |
| SenseNova-U1-A3B-MoT-SFT | A3B MoT | 🤗 link |
| SenseNova-U1-A3B-MoT | A3B MoT | 🤗 link |

Here **SFT models** (_×32 downsampling ratio_) are trained via Understanding Warmup, Generation Pre-training, Unified Mid-training, and Unified SFT, with **final models** obtained after an initial round of T2I RL training.

Although relatively compact by today’s standards, these models already show strong performance across diverse tasks, comparable to commercial models with excellent cost efficiency. Notably, larger-scale versions are planned to further enhance capability and performance in the future.

## 📣 Updated News

[](https://github.com/OpenSenseNova/SenseNova-U1#-updated-news)
*   `[2026.04.27]` Initial release of the weights for [SenseNova-U1-8B-MoT-SFT](https://huggingface.co/sensenova/SenseNova-U1-8B-MoT-SFT) and [SenseNova-U1-8B-MoT](https://huggingface.co/sensenova/SenseNova-U1-8B-MoT).

*   `[2026.04.27]` Initial release of the [inference code](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/README.md) for SenseNova-U1.

## 📋 ToDo List

[](https://github.com/OpenSenseNova/SenseNova-U1#-todo-list)
*   Training code of SenseNova-U1

*   Final weights and technical report of SenseNova-U1

## 🎨 Showcases

[](https://github.com/OpenSenseNova/SenseNova-U1#-showcases)

🖼️ Text-to-Image (General)
|  |  |  |
| --- | --- | --- |
| [![Image 11: t2i general dense face hd 07](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/16_9_dense_face_hd_07.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/16_9_dense_face_hd_07.webp) | [![Image 12: t2i general dense text rendering 18](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/16_9_dense_text_rendering_18.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/16_9_dense_text_rendering_18.webp) | [![Image 13: t2i general dense text rendering 12](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/16_9_dense_text_rendering_12.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/16_9_dense_text_rendering_12.webp) |
| [![Image 14: t2i general face hd 13](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/1_1_face_hd_13.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/1_1_face_hd_13.webp) | [![Image 15: t2i general face hd 17](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/1_1_face_hd_17.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/1_1_face_hd_17.webp) | [![Image 16: t2i general face hd 07](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/1_1_dense_artistic_10.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/1_1_dense_artistic_10.webp) |
| [![Image 17: t2i general landscape 06](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/1_1_landscape_06.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/1_1_landscape_06.webp) | [![Image 18: t2i general dense landscape 12](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/1_1_dense_landscape_12.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/1_1_dense_landscape_12.webp) | [![Image 19: t2i general landscape 07](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/1_1_landscape_07.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/1_1_landscape_07.webp) |
| [![Image 20: t2i general portrait artistic 02 a](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/9_16_dense_face_hd_10.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/9_16_dense_face_hd_10.webp) | [![Image 21: t2i general portrait artistic 02 b](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/9_16_human_pose_11.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/9_16_human_pose_11.webp) | [![Image 22: t2i general portrait artistic 07](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/9_16_artistic_07.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/9_16_artistic_07.webp) |
| [![Image 23: t2i general portrait text rendering 02](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/9_16_sensenova_u1_31.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/9_16_sensenova_u1_31.webp) | [![Image 24: t2i general portrait dense landscape 05](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/9_16_dense_landscape_05.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/9_16_dense_landscape_05.webp) | [![Image 25: t2i general portrait dense artistic 11](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_general/9_16_dense_artistic_11.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_general/9_16_dense_artistic_11.webp) |

🖼️ Text-to-Image (Reasoning)
| Original Text | Reasoning Process | Resulting Image |
| --- | --- | --- |
| A male peacock trying to attract a female | 1. **Instruction Understanding:** The core subject is a single male peacock. The action involves the male peacock trying to attract a female. 2. **Reasoning Process:** Male peacocks perform this ritual by fanning their tail feathers into a massive, colorful circular display. 3. **Establish the frame:** The frame captures the male peacock in a full-body shot to show the entire display. The angle is eye-level to emphasize the height of the tail feathers. 4. **Set the lighting and color:** Natural lighting illuminates the colorful circular display with soft shadows. The palette features vibrant blues and greens on the tail feathers. 5. **Lock the style:** The style is a realistic photograph with sharp focus on the male peacock. The finish is natural without artistic filters. 6. **Explicit Prompt:** A vibrant male peacock with his tail feathers fully fanned out in a wide, iridescent display of blues and greens, standing in a garden. | [![Image 26](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_reasoning/4_reasoning.png)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_reasoning/4_reasoning.png) |
| A small piece of dry wood and a dense iron block are in a transparent water tank | 1. **Instruction Understanding:** The core subjects are a small piece of dry wood and a dense iron block positioned within a transparent water tank. The wood is floating on the surface while the iron block is submerged at the bottom. 2. **Reasoning Process:** The wood is less dense than water so it will float, while the iron is denser and will sink to the bottom. 3. **Establish the frame:** The composition is a vertical medium shot centering the rectangular tank within the frame. The camera angle is eye-level to clearly display the water line and the submerged base. Focus is sharp across the entire depth of the tank to ensure both materials are distinct. 4. **Build the environment:** The scene is contained entirely within the clear glass walls of the water tank. The water fills the majority of the volume, providing a medium for the floating wood and sunken iron block. The background remains out of focus to keep attention on the tank's interior. 5. **Set the lighting and color:** Soft natural light illuminates the scene from the left, creating gentle reflections on the water surface. The color palette features the brown grain of the wood contrasting against the dark grey metallic finish of the iron. Shadows are soft and diffused through the liquid. 6. **Explicit Prompt:** A realistic photo of a transparent water tank showing a piece of wood floating on the surface and an iron block resting at the bottom. | [![Image 27](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_reasoning/5_reasoning.png)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_reasoning/5_reasoning.png) |
| A typical dish from the country where Naples is located | 1. **Instruction Understanding:** The core subject is a Neapolitan pizza presented as a typical dish. The context specifies Naples, Italy, as the country of origin for this food item. 2. **Reasoning Process:** Naples is in Italy, and a classic dish is a Neapolitan pizza. 3. **Establish the frame:** The Neapolitan pizza is captured in a close-up shot that fills the central frame. The angle is slightly elevated to show the round form of the dish clearly. 4. **Set the lighting and color:** Soft lighting illuminates the surface of the Neapolitan pizza to reveal texture. Warm tones dominate the color palette, emphasizing the baked nature of the dish. 5. **Lock the style:** The image utilizes a realistic photographic style with sharp focus on the main subject. The finish appears natural and appetizing, suitable for food documentation. 6. **Explicit Prompt:** A delicious Neapolitan pizza with a soft, charred crust, tomato sauce, and fresh mozzarella, served on a rustic wooden table, realistic food photography. | [![Image 28](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_reasoning/2_reasoning.png)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_reasoning/2_reasoning.png) |
| A solution of calcium carbonate reacting with acetic acid | 1. **Instruction Understanding:** The core subject is a solution of calcium carbonate and acetic acid. The prompt specifies the reacting state of the chemical mixture. 2. **Reasoning Process:** The reaction produces carbon dioxide gas, which would be visible as a steady stream of bubbles rising through the liquid. 3. **Establish the frame:** The camera frames the solution closely to capture the details of the reaction. The composition centers on the liquid where the gas is visible. 4. **Set the lighting and color:** The liquid appears clear, allowing the white bubbles to stand out distinctly. The lighting is bright and even to illuminate the stream of gas. 5. **Lock the style:** The image maintains a realistic photographic style suitable for scientific observation. The focus is sharp on the reacting solution and bubbles. 6. **Explicit Prompt:** A test tube filled with a clear liquid and a rapid, effervescent stream of carbon dioxide bubbles rising to the surface, laboratory experiment. | [![Image 29](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_reasoning/7_reasoning.png)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_reasoning/7_reasoning.png) |

🖼️ Text-to-Image (Infographics)
[![Image 30: t2i landscape 0010](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0000.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0000.webp)[![Image 31: t2i landscape 0011](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0003.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0003.webp)[![Image 32: t2i landscape 0012](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0001.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0001.webp)[![Image 33: t2i landscape 0012](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0022.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0022.webp)
[![Image 34: t2i image 0022](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0016.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0016.webp)[![Image 35: t2i image 0020](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0010.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0010.webp)[![Image 36: t2i image 0021](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0007.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0007.webp)[![Image 37: t2i image 0023](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0021.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0021.webp)
[![Image 38: t2i image 0024](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0014.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0014.webp)[![Image 39: t2i image 0025](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0028.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0028.webp)[![Image 40: t2i image 0026](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0033.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0033.webp)[![Image 41: t2i image 0027](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0002.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0002.webp)
[![Image 42: t2i image 0028](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0031.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0031.webp)[![Image 43: t2i image 0029](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0030.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0030.webp)[![Image 44: t2i image 0030](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0032.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0032.webp)[![Image 45: t2i image 0031](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/0029.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/0029.webp)

> 📸 **More generation samples:** see [Image Generation Gallery](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/showcases.md#text-to-image).

✏️ Image Editing (General)
|  |  |
| --- | --- |
| [![Image 46: editing input 1](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images/1.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images/1.webp)[![Image 47: editing output 1](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/1_out.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/1_out.webp) Change the jacket of the person on the left to bright yellow. | [![Image 48: editing input 3](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images/3.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images/3.webp)[![Image 49: editing output 3](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/3_out.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/3_out.webp) 在小狗头上放一个花环，并且把图片变为吉卜力风格。 |
| [![Image 50: editing input 2](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images/2.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images/2.webp)[![Image 51: editing output 2](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/2_out.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/2_out.webp) Make the person in the image smile. | [![Image 52: editing input 4](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images/4.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images/4.webp)[![Image 53: editing output 4](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/4_out.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/4_out.webp) Add a bouquet of flowers. |
| [![Image 54: editing input 8](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images/8.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images/8.webp)[![Image 55: editing output 8](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/8_out.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/8_out.webp) Replace the man with a woman. | [![Image 56: editing input 6](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images/6.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images/6.webp)[![Image 57: editing output 6](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/6_out.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/6_out.webp) Replace the text "WARFIGHTER" to "BATTLEFIELD" in the bold orange-red font. |

✏️ Image Editing (Reasoning)
| Original Text | Original Image | Reasoning Process | Resulting Image |
| --- | --- | --- | --- |
| Draw what it will look like one hour later. | [![Image 58](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images_reasoning/034_temporal_reasoning_draw_what_it_will_look_like.png)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images_reasoning/034_temporal_reasoning_draw_what_it_will_look_like.png) | 1. **Source Image Analysis:** The source image shows a glass cup of hot tea with steeping tea leaves, and the water appears relatively clear. 2. **Instruction Understanding:** The instruction asks for the appearance one hour later. 3. **Reasoning Process:** Over time, tannins and pigments leach out, making the tea noticeably darker and more uniformly colored, and the leaves may look more swollen and darker from soaking. 4. **Expected Visual Changes:** The expected visible result is a deeper amber-to-brown tea color and more fully saturated liquid. 5. **Elements to Preserve:** The glass cup, scattered leaves around it, background, and camera angle should remain unchanged. 6. **Explicit Edit Prompt:** Edit the tea liquid to a much darker, more saturated amber-brown color as if fully steeped, and make the tea leaves look slightly darker and more swollen, while keeping the glass cup, surrounding leaves, background, and framing unchanged. | [![Image 59](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/034_temporal_reasoning_draw_what_it_will_look_like_result.jpeg)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/034_temporal_reasoning_draw_what_it_will_look_like_result.jpeg) |
| Draw what it will look like immediately after someone stands up from sitting on it for a long time. | [![Image 60](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images_reasoning/036_causal_reasoning_draw_what_it_will_look_like.png)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images_reasoning/036_causal_reasoning_draw_what_it_will_look_like.png) | 1. **Source Image Analysis:** The source image shows a fluffy lime-green beanbag chair that looks evenly plump and undisturbed on a white background. 2. **Instruction Understanding:** The edit instruction asks for its appearance immediately after someone stood up from sitting there for a long time. 3. **Reasoning Process:** Prolonged weight compresses the fabric and internal fill, leaving a depressed seat area, wrinkles radiating outward, and a slowly recovering shape. 4. **Expected Visual Changes:** The visible result should be a noticeable dip and creasing where a person was seated. 5. **Elements to Preserve:** The background, beanbag color, lighting, and camera angle should remain unchanged while only the beanbag’s shape shows the compression. 6. **Explicit Edit Prompt:** Edit the beanbag chair to show a clear seated depression in the center with surrounding wrinkles and slightly compressed fabric, while keeping the white background, lighting, and camera angle unchanged. | [![Image 61](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/036_causal_reasoning_draw_what_it_will_look_like_result.jpeg)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/036_causal_reasoning_draw_what_it_will_look_like_result.jpeg) |
| Change the water to high-concentration saltwater | [![Image 62](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images_reasoning/042_physics_change_the_water_to_high-con.jpg)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images_reasoning/042_physics_change_the_water_to_high-con.jpg) | 1. **Source Image Analysis:** The source image shows an egg resting at the bottom of a glass of water. 2. **Instruction Understanding:** The instruction asks to change the medium to high-concentration saltwater. 3. **Reasoning Process:** Saltwater is denser than fresh water, which increases the buoyant force on the egg. 4. **Expected Visual Changes:** As density increases, the egg will overcome gravity and float higher or suspend in the middle of the liquid. 5. **Elements to Preserve:** The glass and the egg's appearance should remain consistent, focusing on the shift in the egg's vertical position. 6. **Explicit Edit Prompt:** Edit the position of the egg so it is floating in the middle of the liquid instead of resting on the bottom, while keeping the glass and the egg's appearance unchanged. | [![Image 63](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/042_physics_change_the_water_to_high-con_result.jpeg)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/042_physics_change_the_water_to_high-con_result.jpeg) |
| What the fruit looks like when ripe in the picture | [![Image 64](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/examples/editing/data/images_reasoning/044_biology_what_the_fruit_looks_like_wh.jpg)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/data/images_reasoning/044_biology_what_the_fruit_looks_like_wh.jpg) | 1. **Source Image Analysis:** The source image shows green, unripe bananas. 2. **Instruction Understanding:** The instruction asks for the appearance of the fruit when ripe. 3. **Reasoning Process:** Ripening involves a breakdown of chlorophyll and the production of sugars, which turns the skin from green to yellow and often causes small brown sugar spots to appear. 4. **Expected Visual Changes:** The color and texture of the peel should transition to a ripe state. 5. **Elements to Preserve:** The shape of the bananas and the white background should remain constant. 6. **Explicit Edit Prompt:** Edit the green bananas to be bright yellow with small brown spots, while keeping the original shape and white background unchanged. | [![Image 65](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/editing/044_biology_what_the_fruit_looks_like_wh_result.jpeg)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/editing/044_biology_what_the_fruit_looks_like_wh_result.jpeg) |

> 📸 **More editing samples:** see [Image Editing Gallery](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/showcases.md#image-editing).

♻️ Interleaved Generation (General)
|  |
| --- |
| [![Image 66: interleave case 05](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/interleave/case_0005_matchgirl_warm_au.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/interleave/case_0005_matchgirl_warm_au.webp) |
| [![Image 67: interleave case 06](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/interleave/case_0006_orange_cat_travel.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/interleave/case_0006_orange_cat_travel.webp) |

♻️ Interleaved Generation (Reasoning)
|  |
| --- |
| [![Image 68: interleave case 05](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/interleave/reasoning.png)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/interleave/reasoning.png) |

> 📸 **More interleaved samples:** see [Interleaved Generation Gallery](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/showcases.md#interleaved-generation).

📝 Visual Understanding (General)
|  |
| --- |
| [![Image 69: vqa general cases](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/vqa/general_case.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/vqa/general_case.webp) |

📝 Visual Understanding (Agentic)
|  |
| --- |
| [![Image 70: vqa agentic case](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/vqa/agentic_case.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/vqa/agentic_case.webp) |

> 📸 **More understanding samples:** see [Visual Understanding Gallery](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/showcases.md#visual-understanding).

🦾 Visual-Language Action
[![Image 71: YouTube](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/vla/1.png)](https://www.youtube.com/watch?v=3mvBPPgv8vo)[![Image 72: YouTube](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/vla/2.png)](https://www.youtube.com/watch?v=2QZY8gf0Vsk)[![Image 73: YouTube](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/vla/3.png)](https://www.youtube.com/watch?v=tznVbuYf0yw)

## 📊 Key Benchmarks

[](https://github.com/OpenSenseNova/SenseNova-U1#-key-benchmarks)

📝 Visual Understanding
[![Image 74: Understanding Benchmarks](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/benchmarks/understanding.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/benchmarks/understanding.webp)

🖼️ Visual Generation
[![Image 75: Generation Benchmarks](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/benchmarks/generation.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/benchmarks/generation.webp)

♻️ Visual Reasoning
[![Image 76: Interleaved Benchmarks](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/benchmarks/interleaved.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/benchmarks/interleaved.webp)

> Evaluation scripts and benchmark reproduction guides are added in [`evaluation`](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/evaluation/README.md).

## ⚠️ Ongoing Improvements

[](https://github.com/OpenSenseNova/SenseNova-U1#%EF%B8%8F-ongoing-improvements)
Despite strong performance across tasks, several limitations remain for improvement:

*   **Visual Understanding**:

 The current model only supports a context length of up to **32K** tokens, which may constrain performance in scenarios requiring longer or more complex visual contexts.

*   **Human-centric Generation**:

 Fine-grained details of human bodies can be challenging, especially when people appear as small elements within a scene or are engaged in complex interactions with surrounding objects.

*   **Text-based Generation**:

 Text rendering may sometimes produce misspellings, distorted characters, or formatting inconsistencies, which are sensitive to how prompts are phrased, especially in text-heavy scenarios. (see [`prompt enhancement`](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/prompt_enhancement.md) for best practice)

*   **Interleaved Generation**:

    *   As an experimental feature, interleaved generation is still evolving and may not yet match the performance of dedicated text-to-image (T2I) pipelines.

    *   **Beta status:** RL has not been specifically optimized for visual editing, reasoning, and interleaved tasks, and current performance is comparable SFT models.

We view these areas as active directions and expect continued improvements in future iterations.

## 🛠️ Quick Start

[](https://github.com/OpenSenseNova/SenseNova-U1#%EF%B8%8F-quick-start)
### 🌐 Use with SenseNova-Studio

[](https://github.com/OpenSenseNova/SenseNova-U1#-use-with-sensenova-studio)
The fastest way to experience SenseNova-U1 is through **[SenseNova-Studio](https://unify.light-ai.top/)** — a 🆓 free online playground where you can try the model directly in your browser, no installation or GPU required.

> **Note:** To serve more users, U1-Fast has undergone step and CFG distillation, and is dedicated to infographic generation.

### 🦞 Use with SenseNova-Skills (OpenClaw)

[](https://github.com/OpenSenseNova/SenseNova-U1#-use-with-sensenova-skills-openclaw)
The easiest way to integrate SenseNova-U1 into your own agent or application is through our companion repository **[SenseNova-Skills (OpenClaw) 🦞](https://github.com/OpenSenseNova/SenseNova-Skills)**, which ships SenseNova-U1 as a ready-to-use skill with a unified tool-calling interface.

> Refer to the [SenseNova-Skills README](https://github.com/OpenSenseNova/SenseNova-Skills) for installation and usage details.

✨ Some interesting cases produced through our Skills and Studio
[![Image 77: Skill Cases](https://github.com/OpenSenseNova/SenseNova-U1/raw/main/docs/assets/showcases/t2i_infographic/u1-case2.webp)](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/assets/showcases/t2i_infographic/u1-case2.webp)

### 🤗 Run with transformers (Default)

[](https://github.com/OpenSenseNova/SenseNova-U1#-run-with-transformers-default)
> **Setup:** Follow the [Installation Guide](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/installation.md) to clone the repo and install dependencies with [uv](https://github.com/astral-sh/uv).

📝 Visual Understanding

python examples/vqa/inference.py --model_path SenseNova/SenseNova-U1-8B-MoT --image examples/vqa/data/images/menu.jpg --question "My friend and I are dining together tonight. Looking at this menu, can you recommend a good combination of dishes for 2 people? We want a balanced meal — a mix of mains and maybe a starter or dessert. Budget-conscious but want to try the highlights." --output outputs/answer.txt --max_new_tokens 8192 --do_sample --temperature 0.6 --top_p 0.95 --top_k 20 --repetition_penalty 1.05 --profile

> See [`examples/README.md`](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/README.md#visual-understanding-vqa) for batched inference, generation parameters, and JSONL format.

🖼️ Text-to-Image

python examples/t2i/inference.py --model_path SenseNova/SenseNova-U1-8B-MoT --prompt "这张信息图的标题是“SenseNova-U1”，采用现代极简科技矩阵风格。整体布局为水平三列网格结构，背景是带有极浅银灰色细密点阵的哑光纯白高级纸张纹理，画面长宽比为16:9。\n\n排版采用严谨的视觉层级：主标题使用粗体无衬线黑体字，正文使用清晰的现代等宽字体。配色方案极其克制，以纯白色为底，深炭黑为主视觉文字和边框，浅石板灰用于背景色块和次要信息区分，图标采用精致的银灰色线框绘制。\n\n在画面正上方居中位置，使用醒目的深炭黑粗体字排布着大标题“SenseNova-U1”。标题正下方是浅石板灰色的等宽字体副标题“新一代端到端统一多模态大模型家族”。\n\n画面主体分为左、中、右三个相等的垂直信息区块，区块之间通过充足的负空间进行物理隔离。\n\n左侧区块的主题是概述。顶部有一个银灰色线框绘制的、由放大镜和齿轮交织的图标，旁边是粗体小标题“Overview”。该区块内从上到下垂直排列着三个要点：第一个要点旁边是一个代表文档与照片重叠的极简图标，紧跟着文字“多模态模型家族，统一文本/图像理解和生成”。向下是由两个相连的同心圆组成的架构图标，配有文字“基于NEO-Unify架构（端到端统一理解和生成）”。最下方是一个带有斜线划掉的眼睛和漏斗形状的图标，明确指示文本“无需视觉编码器(VE)和变分自编码器(VAE)”。\n\n中间区块展示模型矩阵。顶部是一个包含两个分支节点的树状网络图标，旁边是粗体小标题“两个模型规格”。区块内分为上下两个包裹在浅石板灰色极细边框内的卡片。上方的卡片内画着一个代表高密度的实心几何立方体图标，大字标注“SenseNova-U1-8B-MoT”，下方是等宽字体说明“8B MoT 密集主干模型”。下方的卡片内画着一个带有闪电符号的网状发光大脑图标，大字标注“SenseNova-U1-A3B-MoT”，下方是等宽字体说明“A3B MoT 混合专家（MoE）主干模型”。在这两个独立卡片的正下方，左侧放置一个笑脸轮廓图标搭配文字“将在HF等平台公开”，右侧放置一个带有折角的书面报告图标搭配文字“将发布技术报告”。\n\n右侧区块呈现核心优势。顶部是一个代表巅峰的上升阶梯折线图图标，旁边是粗体小标题“Highlights”。该区块内部垂直分布着四个带有浅石板灰底色的长方形色块，每个色块内部左侧对应一个具体的图标，右侧为文字。第一个色块内是一个无缝相连的莫比乌斯环图标，配文“原生统一架构，无VE和VAE”。第二个色块内是一个顶端带有星星的奖杯图标，配文“单一统一模型在理解和生成任务上均达到SOTA性能”。第三个色块内是代表文本行与拍立得照片交替穿插的图标，配文“强大的原生交错推理能力（模型原生生成图像进行推理）”。最后一个色块内是一个被切分出一小块的硬币与详细饼状图结合的图标，配文“能生成复杂信息图表，性价比出色”。" --width 2720 --height 1536 --cfg_scale 4.0 --cfg_norm none --timestep_shift 3.0 --num_steps 50 --output output.png --profile

> Default resolution is 2048×2048 (1:1). See [supported resolution buckets](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/README.md#supported-resolution-buckets) for other aspect ratios.

> For high-quality infographic generation, it is recommended to apply [prompt enhancement](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/prompt_enhancement.md) before generating images.

✏️ Image Editing

python examples/editing/inference.py --model_path SenseNova/SenseNova-U1-8B-MoT --prompt "Change the animal's fur color to a darker shade." --image examples/editing/data/images/1.jpg --cfg_scale 4.0 --img_cfg_scale 1.0 --cfg_norm none --timestep_shift 3.0 --num_steps 50 --output output_edited.png --profile --compare

> 💡 Pre-resize inputs to ~2048×2048 resolution with orginal aspect ratio before inference for best quality (see [`examples/editing/resize_inputs.py`](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/editing/resize_inputs.py)).

♻️ Interleaved Generation

python examples/interleave/inference.py --model_path SenseNova/SenseNova-U1-8B-MoT --prompt "I want to learn how to cook tomato and egg stir-fry. Please give me a beginner-friendly illustrated tutorial." --resolution "16:9" --output_dir outputs/interleave/ --stem demo --profile

> See [`examples/README.md`](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/examples/README.md) for batched inference, JSONL format, prompt enhancement, resolution buckets, and full flag reference.

### ⚡ Run with LightLLM + LightX2V (Recommended)

[](https://github.com/OpenSenseNova/SenseNova-U1#-run-with-lightllm--lightx2v-recommended)
For production serving, we co-design a dedicated inference stack on top of **[LightLLM](https://github.com/ModelTC/lightllm)** (understanding) and **[LightX2V](https://github.com/ModelTC/lightx2v)** (generation). The two engines are disaggregated so that each path can use its own parallelism and resource budget, with a low-overhead transfer channel in between.

On a single node with `TP2 + CFG2`, this stack delivers roughly **~0.15 s/step** and **~9 s end-to-end** for a **2048×2048** image on H100 / H200, with a ~**2.4–3.2×** prefill speedup from our FA3-based hybrid-mask attention over the Triton baseline. Full per-GPU performance are reported in [`docs/inference_infra.md`](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/inference_infra.md).

An official docker image is provided for one-command deployment:

docker pull lightx2v/lightllm_lightx2v:20260407

> ⚙️ **Deployment guide (Docker, launch flags, modes, quantization, API test):** see [`docs/deployment.md`](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/deployment.md).
> 
> 
> 📖 **Full design and performance profiling:** see [`docs/inference_infra.md`](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/docs/inference_infra.md).

## 🌐 Join the Community!

[](https://github.com/OpenSenseNova/SenseNova-U1#-join-the-community)
Join our growing community to share feedback, get support, and stay updated on the latest SenseNova-U1 developments — we'd love to hear from you!

## ⚖️ License

[](https://github.com/OpenSenseNova/SenseNova-U1#%EF%B8%8F-license)
This project is released under the [Apache 2.0 License](https://github.com/OpenSenseNova/SenseNova-U1/blob/main/LICENSE).
