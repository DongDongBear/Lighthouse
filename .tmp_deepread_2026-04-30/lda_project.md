Title: Scaling Latent Dynamics Action Model via Universal Embodied Data Ingestion

URL Source: https://pku-epic.github.io/LDA/

Markdown Content:
Kai Liu*2,3,4[Xuheng Zhang](https://catburgg.github.io/)*1,2[Haoran Liao](https://liaohr9.github.io/)2,6[Yusen Feng](https://wangchek.github.io/)1,2[Wenxuan Zhu](https://lgswdn.github.io/home/)1 Tingrui Shen 1[Jiayi Chen](https://jychen18.github.io/)1,2[Jiazhao Zhang](https://jzhzhang.github.io/)1,2 Yifei Dong 1[Wenbo Cui](https://cwb0106.github.io/)2,3,4 Senmao Qi 2 Shuo Wang 2 Yixin Zheng 2,3,4[Mi Yan](https://miyandoris.github.io/)1,2[Xuesong Shi](https://scholar.google.com/citations?user=wRBbtl8AAAAJ&hl=en)2[Haoran Li](https://ia.cas.cn/rcdw/fyjy/202404/t20240422_7129926.html)3[Dongbin Zhao](https://people.ucas.ac.cn/~zhaodongbin?language=en)3[Ming-Yu Liu](https://mingyuliu.net/)7[Zhizheng Zhang](https://scholar.google.com/citations?user=X7M0I8kAAAAJ&hl=en)2,†[Li Yi](https://ericyi.github.io/)5,†[Yizhou Wang](https://cfcs.pku.edu.cn/english/people/faculty/yizhouwang/index.htm)1,†[He Wang](https://hughw19.github.io/)1,2,†

* Equal contribution  † Corresponding author

1 Peking University 2 Galbot 3 CASIA 4 BAAI 5 Tsinghua University 6 Sun Yat-sen University 7 NVIDIA

![Image 1: LDA-1B Model Overview](https://pku-epic.github.io/LDA/images/lda_teaser.png)
LDA-1B is a dynamics-centric robot foundation model trained on 30k+ hours of heterogeneous embodied data. It jointly learns dynamics, visual forecasting, and policy in a unified latent space, enabling scalable learning beyond BC.

## Universal Embodied Data Ingestion

### Unified Latent Dynamics and Policy Learning

![Image 2: LDA-1B Architecture](https://pku-epic.github.io/LDA/images/LDA_pipeline.png)

The model jointly denoises action chunks and future DINO sequences within a unified multi-modal diffusion transformer framework. Heterogeneous data play distinct yet complementary roles for learning visual forecasting, dynamics learning and policy.

### Large-scale Heterogeneous Embodied Data

![Image 3: EI-30k Dataset](https://pku-epic.github.io/LDA/images/dataset.png)

We collect EI-30k, comprising more than 30k hours of diverse human and robot interaction data, which spans varying episode lengths and manipulation tasks.

## Latent Forward Dynamics Visualization

Forward and inverse dynamics operate in a structured DINO latent space, which avoids redundant pixel-space appearance modeling and enables the model to focus on task-relevant dynamics features.

 Your browser does not support the video tag. 
Original RGB video Latent Representation Model prediction

Dexterous Manipulation

 Your browser does not support the video tag. 
Original RGB video Latent Representation Model prediction

Human Demonstration

 Your browser does not support the video tag. 
Original RGB video Latent Representation Model prediction

Pillow Task

 Your browser does not support the video tag. 
Original RGB video Latent Representation Model prediction

Rubbish Disposal

## Scaling Analysis

### Data Scaling: Universal Embodied Data Ingestion

![Image 4: Data Scaling Results](https://pku-epic.github.io/LDA/images/data_scaling.png)

LDA consistently degrades action prediction error from 5k to 30k hours data with cotraining all four tasks.

### Model Scaling: Stable Large-Scale Training

![Image 5: Model Scaling Results](https://pku-epic.github.io/LDA/images/model_scaling.png)

LDA-1B scales stably thanks to latent dynamics and the mixed-frequency transformer.

## Real-World Results

Gripper Manipulation

![Image 6: Success Rate Comparison on Real-World Gripper Manipulation Tasks](https://pku-epic.github.io/LDA/images/fig_galbot.png)

All models few-shot adapatation on Galbot. LDA-1B outperforms GR00T-N1.6 and π 0.5.

Dexterous Manipulation

![Image 7: Success Rate Comparison on Real-World Dexterous Manipulation Tasks](https://pku-epic.github.io/LDA/images/fig_dexterous.png)

Low and high-DoF dexterous manipulation.

## Real-World Demonstrations

### Gripper Manipulation

 Your browser does not support the video tag. 
Pick and Place across Objects/Positions/Backgrounds (6x speed)

 Your browser does not support the video tag. 
Pick & Handover & Place (3x speed)

 Your browser does not support the video tag. 
Clean the Rubbish (4x speed)

 Your browser does not support the video tag. 
Flip Box (1x speed)

 Your browser does not support the video tag. 
Water Flower (6x speed)

 Your browser does not support the video tag. 
Sweep the nails into the shovel (6x speed)

 Your browser does not support the video tag. 
Knock the block with hammer (2x speed)

 Your browser does not support the video tag. 
Wipe the Board (4x speed)

### Dexterous Manipulation with High-DoF Dexterous Hand

 Your browser does not support the video tag. 
Use a clamp to place object (1x speed)

 Your browser does not support the video tag. 
Flip the bread over with a shovel (1.5x speed)

 Your browser does not support the video tag. 
Use a glue gun to stick the lid (4x speed)

 Your browser does not support the video tag. 
Pick and Place(1x speed)

 Your browser does not support the video tag. 
Use a spoon to scoop (2x speed)

### Dexterous Manipulation with Low-DoF Dexterous Hand

 Your browser does not support the video tag. 
Pick and Place(1x speed)

 Your browser does not support the video tag. 
Use a hammer to pull out the nail (1x speed)

 Your browser does not support the video tag. 
Open the MacBook lid (1x speed)

 Your browser does not support the video tag. 
Open the Oven (1x speed)

 Your browser does not support the video tag. 
Unscrew the cap (10x speed)

 Your browser does not support the video tag. 
Lift the lid Bimanually (1x speed)

### Robot Platforms

![Image 8: Real-world Robot Platforms](https://pku-epic.github.io/LDA/images/real_setup.png)

(1) Galbot G1 equipped with a standard two-finger parallel gripper for basic grasping tasks; (2) Galbot G1 fitted with the SharpaWave dexterous hand (22 DoF) for fine manipulation; (3) Unitree G1 mounted with the BrainCo dexterous hand (10 DoF) and a Zed Mini camera.

### BibTeX

@article{lyu2026lda,
  title={LDA-1B: Scaling Latent Dynamics Action Model via Universal Embodied Data Ingestion},
  author={Lyu, Jiangran and Liu, Kai and Zhang, Xuheng and Liao, Haoran and Feng, Yusen and Zhu, Wenxuan and Shen, Tingrui and Chen, Jiayi and Zhang, Jiazhao and Dong, Yifei and others},
  journal={arXiv preprint arXiv:2602.12215},
  year={2026}
}
