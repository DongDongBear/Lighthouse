# 第26章：美术管线与 AI 生成资源

## 本章目标

通过本章学习，你将掌握：

1. 理解 Unity 资源导入管线的核心概念
2. 优化纹理导入设置（分辨率、压缩、Mipmap）
3. 配置 3D 模型导入（FBX、glTF、OBJ）
4. 优化音频导入设置
5. 使用 Asset Store 和免费资源加速原型开发
6. 使用 AI 工具生成游戏资源（纹理、3D 模型、音乐、语音）
7. 掌握 AI 纹理和 3D 模型的完整工作流
8. 使用 Sprite Atlas 优化 2D UI 性能
9. 使用 Addressables 管理大规模资源
10. 建立资源命名规范和文件夹结构

## 预计学习时间

约 3-4 小时（不含 AI 工具的注册和实验时间）

---

## 26.1 资源导入管线概述

### 26.1.1 什么是资源导入管线

当你将一张图片、一个 3D 模型或一段音频拖入 Unity 的 Assets 文件夹时，Unity 不会直接使用原始文件。它会通过**导入管线（Import Pipeline）**将原始资源转换为引擎内部格式。

```
原始资源                 Unity 导入管线              引擎内部格式
────────                ──────────────              ────────────
photo.png     ──→       TextureImporter    ──→      .asset (压缩纹理)
character.fbx ──→       ModelImporter      ──→      .asset (网格+材质+动画)
bgm.wav       ──→       AudioImporter      ──→      .asset (压缩音频)
```

> **前端类比**：这类似于 Webpack/Vite 中的 loader——`css-loader` 处理 CSS，`file-loader` 处理图片。Unity 的 Import Pipeline 就是内置的"loader 系统"。

### 26.1.2 Asset Pipeline v2

Unity 默认使用 **Asset Pipeline v2**，它的核心特性：

- **并行导入**：多个资源可以同时导入
- **增量导入**：只重新导入发生变化的资源
- **缓存**：不同平台的导入结果会被缓存，切换平台时更快
- **确定性**：相同的输入总是产生相同的输出

你可以在 **Edit → Project Settings → Editor** 中确认：

```
Asset Pipeline: Version 2
```

[截图：Project Settings 中的 Asset Pipeline 版本设置]

---

## 26.2 纹理导入设置

### 26.2.1 纹理类型

在 Project 窗口中选择一张纹理，Inspector 面板会显示导入设置：

[截图：纹理导入设置 Inspector 面板]

```
Texture Type（纹理类型）：
├── Default          // 通用纹理（漫反射贴图、颜色贴图）
├── Normal Map       // 法线贴图（存储表面凹凸信息）
├── Editor GUI       // 编辑器界面图片
├── Sprite (2D)      // 2D 精灵（UI 和 2D 游戏）
├── Cursor           // 鼠标光标
├── Cookie           // 灯光遮罩
├── Lightmap         // 光照贴图
├── Single Channel   // 单通道纹理（遮罩、高度图）
└── Directional Lightmap  // 方向光照贴图
```

### 26.2.2 分辨率设置

```
Max Size（最大分辨率）：
├── 移动端推荐最大值
│   ├── 角色主贴图: 1024 或 2048
│   ├── 环境贴图: 512 或 1024
│   ├── UI 图标: 256 或 512
│   ├── 特效贴图: 256 或 512
│   └── 天空盒: 2048 或 4096
└── 说明：Unity 会自动将原始纹理缩放到此大小以下
```

> **关键原则**：纹理分辨率必须是 **2 的幂次方**（Power of Two，简称 POT）：32, 64, 128, 256, 512, 1024, 2048, 4096。非 POT 纹理会导致额外的内存消耗和性能问题。

### 26.2.3 纹理压缩格式

纹理压缩是移动端性能优化中**最重要**的环节之一。不同平台使用不同的压缩格式：

| 格式 | 平台 | 质量 | 压缩比 | 说明 |
|------|------|------|--------|------|
| **ASTC** | iOS + Android | 可调 | 高 | 现代移动端首选，支持可变块大小 |
| **ETC2** | Android | 中等 | 4:1 | 广泛兼容，OpenGL ES 3.0+ |
| **PVRTC** | iOS (旧) | 中等 | 4:1 | 旧版 iOS 设备，正被 ASTC 替代 |
| **DXT/BC** | PC/Console | 高 | 4:1-8:1 | 桌面平台标准 |

**推荐配置：**

```
Android 平台：
├── 压缩格式: ASTC (如果目标设备支持)
│   ├── 高质量: ASTC 4x4
│   ├── 中等质量: ASTC 6x6 (推荐)
│   └── 低质量: ASTC 8x8
├── 备选: ETC2 (更广泛的设备兼容性)
└── 法线贴图: ASTC 4x4 或 ETC2 (法线贴图需要更高质量)

iOS 平台：
├── 压缩格式: ASTC (所有现代 iOS 设备都支持)
│   ├── 高质量: ASTC 4x4
│   └── 中等质量: ASTC 6x6 (推荐)
└── 法线贴图: ASTC 4x4
```

[截图：纹理导入设置中的 Android 和 iOS 平台压缩格式配置]

### 26.2.4 Mipmap 设置

**Mipmap** 是同一纹理的多个分辨率版本的集合。当物体离摄像机较远时，使用低分辨率版本，节省 GPU 带宽。

```
Generate Mip Maps: ✓ (3D场景中的物体推荐开启)
                   ✗ (UI 纹理、天空盒不需要)

Mip Map Filtering:
├── Box    // 简单平均，快速
└── Kaiser // 更锐利，质量更好

Mip Map 内存开销: 额外 ~33% (值得为性能付出的代价)
```

> **前端类比**：Mipmap 类似于响应式图片的 `srcset`——根据显示大小选择合适分辨率的图片版本。

### 26.2.5 Sprite 模式（UI 和 2D）

当纹理类型设为 `Sprite (2D and UI)` 时：

```
Sprite Mode:
├── Single         // 单个精灵（一张图就是一个精灵）
├── Multiple       // 多个精灵（精灵图集/Sprite Sheet）
└── Polygon        // 多边形精灵（节省透明区域）

Pixels Per Unit: 100  // 每 Unity 单位对应的像素数（影响显示大小）

Mesh Type:
├── Tight     // 紧贴图片轮廓（减少透明像素的 overdraw）
└── Full Rect // 完整矩形（适合规则形状）

Sprite Editor: 可以切分精灵图集、设置边框（九宫格切图）等
```

[截图：Sprite Editor 中使用 Automatic 切分精灵图集]

---

## 26.3 3D 模型导入设置

### 26.3.1 支持的 3D 格式

| 格式 | 优点 | 缺点 | 推荐场景 |
|------|------|------|----------|
| **FBX** | 行业标准、功能全面 | 私有格式 | 主流选择，导出自 Maya/Blender/3ds Max |
| **glTF/GLB** | 开放标准、文件小 | Unity 需要插件 | Web 3D、AI 生成模型常用 |
| **OBJ** | 简单、广泛支持 | 不支持动画、材质有限 | 静态模型、简单物体 |
| **Blender (.blend)** | 直接导入 Blender 文件 | 需要安装 Blender | Blender 用户直接工作流 |

> **推荐**：统一使用 **FBX** 作为 Unity 项目的标准 3D 格式。如果使用 Blender，导出为 FBX。如果使用 AI 生成工具得到 glTF/GLB，可以先在 Blender 中打开再导出 FBX。

### 26.3.2 模型导入设置详解

选中一个 FBX 文件后，Inspector 中有四个标签页：

[截图：FBX 模型导入设置 Inspector，显示 Model、Rig、Animation、Materials 四个标签]

#### Model 标签页

```
Model 标签页：
├── Scale Factor: 1        // 缩放因子（FBX 默认单位可能不同）
│   ├── Blender 导出: 通常需要设为 1（确认 Blender 中使用米作单位）
│   ├── Maya 导出: 通常设为 0.01（Maya 默认单位是厘米）
│   └── AI 生成: 根据实际大小调整
│
├── Convert Units: ✓       // 自动转换单位
├── Import BlendShapes: ✓  // 导入变形目标（面部表情等）
├── Import Visibility: ✗   // 通常不需要
├── Import Cameras: ✗      // 通常不需要
├── Import Lights: ✗       // 通常不需要
│
├── Mesh Compression:
│   ├── Off     // 无压缩（最高质量）
│   ├── Low     // 低压缩
│   ├── Medium  // 中等压缩（推荐移动端）
│   └── High    // 高压缩（质量损失较大）
│
├── Read/Write Enabled: ✗  // 关闭以节省内存（除非需要运行时修改网格）
├── Optimize Mesh: ✓       // 优化网格顶点顺序以提升 GPU 性能
│
├── Generate Colliders: ✗  // 自动生成碰撞体（通常手动设置更好）
│
└── Normals:
    ├── Import      // 使用模型自带的法线
    ├── Calculate   // 让 Unity 重新计算法线
    └── None        // 不使用法线（平面着色）
```

#### Rig 标签页

```
Rig（骨骼绑定）标签页：
├── Animation Type:
│   ├── None       // 无动画
│   ├── Legacy     // 旧版动画系统（不推荐）
│   ├── Generic    // 通用骨骼（非人形角色、动物等）
│   └── Humanoid   // 人形骨骼（可以共享动画！）
│
└── Avatar Definition:
    ├── Create From This Model  // 从当前模型创建 Avatar
    └── Copy From Other Avatar  // 复用其他模型的 Avatar
```

> **Humanoid 的强大之处**：所有标记为 Humanoid 的角色模型可以**共享动画**。这意味着你可以从 Mixamo 下载的动画直接用在你的自定义角色上！

#### Animation 标签页

```
Animation 标签页：
├── Import Animation: ✓
├── Animation Clips: (列出模型中包含的动画)
│   ├── Loop Time: ✓/✗ (是否循环)
│   ├── Root Transform Rotation: Bake Into Pose (烘焙旋转)
│   ├── Root Transform Position (Y): Bake Into Pose (烘焙高度)
│   └── Root Transform Position (XZ): Bake Into Pose (烘焙水平位移)
│
├── Anim. Compression:
│   ├── Off              // 无压缩
│   ├── Keyframe Reduction // 减少关键帧（推荐）
│   └── Optimal          // 最佳压缩
│
└── Animated Custom Properties: ✗ (导入自定义属性动画)
```

#### Materials 标签页

```
Materials 标签页：
├── Material Creation Mode:
│   ├── Import via MaterialDescription  // 根据模型材质描述导入
│   └── None                            // 不导入材质（手动设置）
│
├── sRGB Albedo Colors: ✓   // 使用 sRGB 颜色空间
│
└── Location:
    ├── Use Embedded Materials  // 使用嵌入式材质（存在模型内部）
    └── Use External Materials  // 使用外部材质（推荐，便于编辑）
```

### 26.3.3 模型导入最佳实践

**移动端多边形（面数）预算参考：**

```
移动端面数预算（三角面）：
├── 主角: 5,000 - 15,000 面
├── 重要 NPC: 3,000 - 10,000 面
├── 普通 NPC/敌人: 1,000 - 5,000 面
├── 环境物体（近处）: 500 - 3,000 面
├── 环境物体（远处）: 100 - 500 面
├── 植被（单株）: 200 - 1,000 面
└── 总场景预算: 100,000 - 500,000 面（同屏可见）
```

---

## 26.4 音频导入设置

### 26.4.1 音频格式支持

| 格式 | 说明 | 推荐场景 |
|------|------|----------|
| WAV | 无损，文件大 | 原始音频素材 |
| MP3 | 有损压缩 | 背景音乐 |
| OGG (Vorbis) | 有损压缩，无专利限制 | 背景音乐、音效 |
| AIFF | 无损（Mac 常用） | 原始音频素材 |

### 26.4.2 音频导入设置详解

[截图：音频导入设置 Inspector 面板]

```
Audio Import Settings：
├── Force To Mono: ✓/✗
│   ├── 音效: ✓ (强制单声道，节省50%内存)
│   └── 背景音乐: ✗ (保留立体声)
│
├── Load Type（加载方式）:
│   ├── Decompress On Load  // 加载时完全解压到内存
│   │   └── 适合: 短音效（< 1秒），频繁播放
│   ├── Compressed In Memory // 压缩状态存在内存，播放时解压
│   │   └── 适合: 中等长度音效（1-10秒）
│   └── Streaming            // 边播放边从磁盘读取
│       └── 适合: 背景音乐、环境音（> 10秒）
│
├── Compression Format（压缩格式）:
│   ├── PCM          // 无压缩（最高质量，最大文件）
│   ├── ADPCM        // 轻度压缩（适合噪音类音效，如爆炸、脚步）
│   └── Vorbis/MP3   // 高压缩（适合音乐和语音）
│
├── Quality: 70%     // Vorbis 压缩质量（0-100%）
│   ├── 音乐: 70-80%
│   ├── 语音: 60-70%
│   └── 音效: 50-70%
│
├── Sample Rate Setting:
│   ├── Preserve Sample Rate  // 保持原始采样率
│   ├── Optimize Sample Rate  // Unity 自动优化（推荐）
│   └── Override Sample Rate  // 手动指定
│       ├── 音乐: 44100 Hz
│       ├── 语音: 22050 Hz（足够清晰，节省空间）
│       └── 音效: 22050 或 44100 Hz
│
└── Preload Audio Data: ✓/✗
    ├── 频繁使用的音效: ✓ (预加载)
    └── 偶尔使用的音乐: ✗ (按需加载)
```

### 26.4.3 音频优化总结

| 类型 | Load Type | Compression | Quality | Mono |
|------|-----------|-------------|---------|------|
| 短音效 | Decompress On Load | ADPCM | - | 是 |
| 中音效 | Compressed In Memory | Vorbis | 60% | 是 |
| 背景音乐 | Streaming | Vorbis | 70% | 否 |
| 语音/对话 | Streaming | Vorbis | 60% | 是 |
| 环境音 | Streaming | Vorbis | 50% | 否 |

---

## 26.5 Asset Store 使用指南

### 26.5.1 什么是 Unity Asset Store

[Unity Asset Store](https://assetstore.unity.com) 是 Unity 官方的资源市场，你可以找到：

- 3D 模型和动画
- 2D 精灵和 UI 元素
- 着色器和材质
- 音效和音乐
- 代码插件和工具
- 完整的项目模板

> **前端类比**：Asset Store 之于 Unity，就像 npm 之于 Node.js——一个庞大的资源和工具市场。

### 26.5.2 推荐的免费资源（原型开发）

以下是一些高质量的免费资源，适合快速搭建原型：

**3D 角色和动画：**
```
1. Mixamo (mixamo.com) — Adobe 免费服务
   ├── 数千个免费动画（跑、跳、攻击、死亡...）
   ├── 自动绑定骨骼（上传模型即可自动 Rigging）
   └── 下载为 FBX，直接导入 Unity

2. Unity-Chan (Asset Store) — Unity 日本官方角色
   ├── 可爱的日式角色模型
   ├── 包含动画和表情
   └── 免费商用

3. Starter Assets (Asset Store) — Unity 官方
   ├── 第一人称 + 第三人称控制器
   ├── 包含角色模型和动画
   └── 使用 New Input System
```

**环境和场景：**
```
1. Terrain Sample Asset Pack — 地形纹理和工具
2. Low Poly Free Pack — 低多边形风格环境
3. Nature Starter Kit 2 — 自然环境起步包
4. AllSky Free — 免费天空盒
```

**UI：**
```
1. Unity UI Samples — 官方 UI 示例
2. TextMesh Pro — 高质量文字渲染（Unity 内置）
3. GUI Parts — 免费 UI 元素
```

### 26.5.3 从 Asset Store 导入资源

1. 在 Asset Store 网站上找到资源，点击 **Add to My Assets**
2. 在 Unity 中打开 **Window → Package Manager**
3. 切换到 **My Assets** 标签
4. 找到资源，点击 **Download** 然后 **Import**
5. 在导入窗口中选择需要的文件

[截图：Package Manager 中的 My Assets 标签，展示已购买的资源]

> **注意**：导入第三方资源后，建议：
> 1. 将资源移动到 `Assets/ThirdParty/` 目录下，与项目代码分开
> 2. 检查资源的许可证（License）是否允许商用
> 3. 不要修改原始资源，而是创建预制体变体（Prefab Variant）

---

## 26.6 AI 工具生成游戏资源

### 26.6.1 AI 工具概览

AI 正在彻底改变游戏开发的美术管线。作为独立开发者或小团队，你可以利用 AI 工具生成高质量的游戏资源：

```
AI 游戏资源工具矩阵：
│
├── 纹理/图片
│   ├── Midjourney        // 高质量概念艺术和纹理
│   ├── Stable Diffusion  // 开源，可本地运行
│   ├── DALL-E 3          // OpenAI 的图像生成
│   └── Krea AI           // 实时 AI 设计工具
│
├── 3D 模型
│   ├── Meshy             // 文字/图片转 3D 模型
│   ├── Tripo             // AI 3D 模型生成
│   ├── Luma AI (Genie)   // 文字转 3D
│   └── Kaedim            // 图片转 3D
│
├── 音乐
│   ├── Suno              // AI 音乐生成（歌曲/BGM）
│   ├── Udio              // AI 音乐生成
│   └── AIVA              // AI 作曲
│
├── 音效
│   ├── ElevenLabs        // AI 语音合成（NPC 对话）
│   ├── Bark              // 开源语音合成
│   └── Freesound         // (非AI) 免费音效库
│
└── 动画
    ├── Mixamo             // (非AI) 自动骨骼绑定和动画
    ├── DeepMotion         // AI 动作捕捉（视频转动画）
    └── Plask              // AI 动作捕捉
```

### 26.6.2 AI 纹理生成工作流

#### 步骤1：生成基础纹理

使用 Midjourney 或 Stable Diffusion 生成纹理。以下是有效的提示词模板：

```
Midjourney 纹理提示词模板：
"seamless [材质类型] texture, [颜色/风格描述],
 top-down view, game asset, PBR, tileable,
 2K resolution --tile --no text --no watermark"

示例：
"seamless stone brick wall texture, medieval fantasy,
 mossy green and grey, top-down view, game asset,
 PBR, tileable, 2K resolution --tile"

"seamless grass ground texture, lush green meadow,
 with small flowers, top-down view, game asset,
 PBR, tileable --tile"

"seamless wood planks texture, old weathered oak,
 warm brown tones, game asset, PBR, tileable --tile"
```

[截图：Midjourney 生成的各种游戏纹理示例]

#### 步骤2：使纹理无缝拼接

即使使用了 `--tile` 参数，你可能还需要进一步处理：

```
无缝纹理处理方案：
├── Photoshop: 滤镜 → 其他 → 位移 → 修复接缝
├── GIMP (免费): 滤镜 → Map → Make Seamless
├── Materialize (免费): 自动生成 PBR 贴图组
└── NormalMap Online (在线工具): 从颜色贴图生成法线贴图
```

#### 步骤3：生成 PBR 贴图组

一个完整的 PBR（Physically Based Rendering）材质需要多张贴图：

```
PBR 贴图组：
├── Albedo/Base Color    // 基础颜色（AI 直接生成）
├── Normal Map           // 法线贴图（从颜色图生成）
├── Metallic/Smoothness  // 金属度/光滑度
├── Ambient Occlusion    // 环境遮挡
├── Height Map           // 高度图
└── Emission             // 自发光（可选）
```

推荐使用 [Materialize](http://www.boundingboxsoftware.com/materialize/) 或在线工具从 Albedo 贴图自动生成其他贴图。

#### 步骤4：导入 Unity

```
1. 将纹理文件放入 Assets/Textures/[类别]/
2. 设置纹理导入参数（见 26.2 节）
3. 创建材质（Material）
4. 将贴图分配到材质的对应槽位
5. 在场景中使用材质
```

### 26.6.3 AI 3D 模型生成工作流

#### 步骤1：生成 3D 模型

使用 **Meshy** 或 **Tripo** 生成 3D 模型：

```
Meshy 工作流：
1. 访问 meshy.ai
2. 选择 "Text to 3D" 或 "Image to 3D"
3. 输入描述（如 "medieval fantasy treasure chest, game asset, low poly"）
4. 等待生成（通常 2-5 分钟）
5. 选择最佳结果
6. 下载 FBX 或 glTF 格式

Tripo 工作流：
1. 访问 tripo3d.ai
2. 上传参考图片或输入文字描述
3. 生成 3D 模型
4. 下载 glTF/GLB 格式
```

[截图：Meshy 界面，展示文字转3D模型的过程]

#### 步骤2：模型清理和优化

AI 生成的模型通常需要清理：

```
在 Blender 中清理模型：
├── 1. 重拓扑（Retopology）
│   ├── AI 模型面数通常过高
│   ├── 使用 Blender 的 Remesh 修改器简单减面
│   ├── 或使用 Instant Meshes（免费自动重拓扑工具）
│   └── 目标：移动端角色 5K-15K 面，物品 500-3K 面
│
├── 2. UV 展开
│   ├── AI 模型的 UV 可能不理想
│   ├── Blender: 选择所有面 → UV → Smart UV Project
│   └── 检查 UV 是否有重叠和拉伸
│
├── 3. 重新贴图
│   ├── 使用 AI 生成的纹理或手绘
│   ├── 烘焙法线贴图（高模 → 低模）
│   └── Blender: Bake → Normal Map
│
├── 4. 骨骼绑定（如果需要动画）
│   ├── 人形角色: 上传到 Mixamo 自动绑定
│   ├── 其他: 在 Blender 中手动绑定
│   └── 简单物体: 使用 Blender 的 Armature
│
└── 5. 导出 FBX
    ├── Blender: File → Export → FBX
    ├── Scale: Apply Transform
    ├── Forward: -Z Forward（Unity 标准）
    └── Up: Y Up（Unity 标准）
```

#### 步骤3：导入 Unity 并设置

```
1. 将 FBX 放入 Assets/Models/[类别]/
2. 配置模型导入设置（见 26.3 节）
3. 设置 Rig（如果有动画）
4. 创建预制体（Prefab）
5. 添加碰撞体、材质等
6. 在场景中使用
```

### 26.6.4 AI 音乐生成

#### 使用 Suno 生成背景音乐

```
Suno 使用步骤：
1. 访问 suno.ai
2. 描述你想要的音乐风格
   示例："epic fantasy orchestral BGM, adventure theme,
          with strings and horns, loopable, game music"
3. 生成并试听多个版本
4. 下载 MP3/WAV

提示词技巧：
├── 指定风格: orchestral, electronic, ambient, celtic
├── 指定乐器: piano, strings, horns, synthesizer
├── 指定情绪: epic, peaceful, mysterious, tense, joyful
├── 指定用途: game music, BGM, background, loopable
└── 避免人声: instrumental only, no vocals
```

### 26.6.5 AI 语音生成

#### 使用 ElevenLabs 生成 NPC 对话

```
ElevenLabs 工作流：
1. 注册 elevenlabs.io
2. 选择或克隆语音（多种风格可选）
3. 输入台词文本
4. 调整参数（稳定性、相似度、风格）
5. 生成并下载 MP3

适合场景：
├── NPC 对话
├── 旁白/教程语音
├── 角色技能语音
└── 环境广播/公告
```

---

## 26.7 Sprite Atlas — 2D UI 优化

### 26.7.1 为什么需要 Sprite Atlas

在 UI 中，每个独立的精灵纹理都会产生一次**Draw Call**（绘制调用）。Draw Call 是 CPU 向 GPU 发送的渲染指令，太多会导致性能瓶颈。

```
没有 Sprite Atlas:
├── icon_sword.png  → Draw Call 1
├── icon_shield.png → Draw Call 2
├── icon_potion.png → Draw Call 3
├── btn_attack.png  → Draw Call 4
├── btn_defend.png  → Draw Call 5
└── 总计: 5 Draw Calls

使用 Sprite Atlas:
├── ui_atlas.png (包含所有上述图片) → Draw Call 1
└── 总计: 1 Draw Call (减少 80%!)
```

> **前端类比**：这完全类似于 CSS Sprite Sheet 或者图标字体（Icon Font）的概念——将多个小图片合并成一张大图以减少 HTTP 请求。

### 26.7.2 创建 Sprite Atlas

1. 在 Project 窗口右键 → **Create → 2D → Sprite Atlas**
2. 在 Inspector 中配置：

```
Sprite Atlas 设置：
├── Type: Master（主图集）
├── Include in Build: ✓（包含在构建中）
├── Allow Rotation: ✗（UI精灵通常不允许旋转）
├── Tight Packing: ✓（紧凑排列）
├── Alpha Dilation: 0
├── Padding: 4（精灵之间的间距，防止出血）
│
├── Objects for Packing:（要打包的精灵）
│   ├── 可以添加单个精灵
│   └── 可以添加整个文件夹
│
└── Platform-specific:
    ├── Max Texture Size: 2048（Atlas 最大尺寸）
    ├── Format: ASTC 6x6（移动端压缩）
    └── Compression Quality: Normal
```

[截图：创建并配置 Sprite Atlas]

### 26.7.3 Sprite Atlas 使用建议

```
分组策略：
├── 按功能分组（推荐）
│   ├── UI_Atlas_MainMenu      // 主菜单相关 UI
│   ├── UI_Atlas_HUD           // 游戏 HUD（血条、小地图等）
│   ├── UI_Atlas_Inventory     // 背包界面
│   └── UI_Atlas_Icons         // 物品图标
│
└── 注意事项
    ├── 同一界面中使用的精灵应该在同一个 Atlas 中
    ├── Atlas 大小建议不超过 2048x2048
    ├── 如果超过，拆分为多个 Atlas
    └── 不同分辨率的精灵不要混在一起
```

---

## 26.8 Addressables 资源管理

### 26.8.1 为什么需要 Addressables

对于开放世界移动游戏，所有资源不可能都打包在安装包里。**Addressables** 是 Unity 的资源管理系统，提供：

- **按需加载**：只在需要时加载资源
- **远程更新**：可以在不更新 App 的情况下更新资源
- **内存管理**：自动引用计数和释放
- **异步加载**：不阻塞主线程

> **前端类比**：Addressables 类似于 React 的 `lazy()` + `Suspense` + CDN 的组合——按需加载组件，从远程服务器获取资源。

### 26.8.2 安装 Addressables

```
Package Manager → Add package by name
包名：com.unity.addressables
```

### 26.8.3 基本使用

1. 选中资源 → Inspector → 勾选 **Addressable**
2. 设置地址（Address），默认为资源路径
3. 分配到组（Group）

[截图：资源的 Addressable 复选框和地址设置]

```csharp
// 使用 Addressables 加载资源的示例
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

public class AddressablesExample : MonoBehaviour
{
    /// <summary>
    /// 通过地址加载预制体并实例化
    /// </summary>
    async void LoadAndInstantiate()
    {
        // 异步加载 — 类似于前端的 const module = await import('./Component')
        AsyncOperationHandle<GameObject> handle =
            Addressables.LoadAssetAsync<GameObject>("Prefabs/EnemyDragon");

        // 等待加载完成
        await handle.Task;

        if (handle.Status == AsyncOperationStatus.Succeeded)
        {
            // 实例化加载的预制体
            Instantiate(handle.Result, Vector3.zero, Quaternion.identity);
            Debug.Log("龙加载并实例化成功！");
        }
        else
        {
            Debug.LogError("资源加载失败！");
        }
    }

    /// <summary>
    /// 加载完成后释放资源（防止内存泄漏）
    /// </summary>
    void OnDestroy()
    {
        // 类似于前端中清理订阅和定时器
        // Addressables.Release(handle);
    }
}
```

### 26.8.4 Addressables 组（Group）配置

```
Addressables Groups 窗口（Window → Asset Management → Addressables → Groups）：
├── Built In Data（内置数据）
│   └── Resources 和 Scene 中的资源
│
├── Default Local Group（默认本地组）
│   └── 打包在安装包中的资源
│
├── Remote Group（远程组）
│   └── 放在 CDN 上按需下载的资源
│
└── 建议的分组策略：
    ├── Core（核心资源）→ 本地，启动时必须
    ├── Level_1, Level_2...（关卡资源）→ 可远程
    ├── Characters（角色资源）→ 本地
    ├── UI（界面资源）→ 本地
    └── DLC（下载内容）→ 远程
```

---

## 26.9 资源命名规范和文件夹结构

### 26.9.1 命名规范

良好的命名规范能让你在项目增长到数千个文件时仍然保持组织有序：

```
命名规范：
├── 格式: [前缀_]名称[_变体][_编号]
│
├── 前缀约定（可选但推荐）:
│   ├── T_   → Texture（纹理）
│   ├── M_   → Material（材质）
│   ├── SM_  → Static Mesh（静态模型）
│   ├── SK_  → Skeletal Mesh（骨骼模型）
│   ├── A_   → Animation（动画）
│   ├── SFX_ → Sound Effect（音效）
│   ├── BGM_ → Background Music（背景音乐）
│   ├── VFX_ → Visual Effect（视觉特效）
│   ├── UI_  → User Interface（界面元素）
│   └── SO_  → ScriptableObject（数据对象）
│
├── 示例:
│   ├── T_Grass_01            // 草地纹理 01
│   ├── T_Grass_Normal        // 草地法线贴图
│   ├── M_Stone_Wall          // 石墙材质
│   ├── SM_Tree_Oak_Large     // 大橡树静态模型
│   ├── SK_Character_Knight   // 骑士骨骼模型
│   ├── A_Knight_Run          // 骑士奔跑动画
│   ├── SFX_Sword_Hit_01      // 剑击音效 01
│   ├── BGM_Forest_Day        // 森林白天背景音乐
│   └── UI_Icon_Sword_Fire    // 火焰剑图标
│
└── 命名规则:
    ├── 使用 PascalCase（首字母大写）
    ├── 用下划线分隔类别
    ├── 数字编号用两位数（01, 02...）
    ├── 变体后缀: _Normal, _Metallic, _AO, _Emission
    └── 避免空格和特殊字符
```

### 26.9.2 推荐文件夹结构

```
Assets/
├── _Project/                    // 项目核心（下划线使其排在最前）
│   ├── Scenes/                  // 所有场景
│   │   ├── MainMenu.unity
│   │   ├── Gameplay.unity
│   │   └── Loading.unity
│   │
│   ├── Scripts/                 // 所有代码
│   │   ├── Core/                // 核心系统
│   │   ├── Gameplay/            // 游戏逻辑
│   │   ├── UI/                  // 界面逻辑
│   │   ├── Network/             // 网络相关
│   │   └── Utilities/           // 工具类
│   │
│   ├── Prefabs/                 // 预制体
│   │   ├── Characters/
│   │   ├── Environment/
│   │   ├── UI/
│   │   └── VFX/
│   │
│   ├── Materials/               // 材质
│   │   ├── Characters/
│   │   ├── Environment/
│   │   └── VFX/
│   │
│   ├── Textures/                // 纹理
│   │   ├── Characters/
│   │   ├── Environment/
│   │   ├── UI/
│   │   └── Terrain/
│   │
│   ├── Models/                  // 3D 模型
│   │   ├── Characters/
│   │   ├── Environment/
│   │   ├── Props/
│   │   └── Vegetation/
│   │
│   ├── Animations/              // 动画
│   │   ├── Characters/
│   │   └── Controllers/         // Animator Controller
│   │
│   ├── Audio/                   // 音频
│   │   ├── BGM/
│   │   ├── SFX/
│   │   └── Voice/
│   │
│   ├── UI/                      // UI 资源
│   │   ├── Sprites/
│   │   ├── Fonts/
│   │   └── Atlases/
│   │
│   ├── ScriptableObjects/       // 数据对象
│   │   ├── Items/
│   │   ├── Enemies/
│   │   └── Config/
│   │
│   ├── Shaders/                 // 着色器
│   │
│   └── Resources/               // Resources 文件夹（尽量少用）
│       └── (只放必须通过 Resources.Load 加载的资源)
│
├── ThirdParty/                  // 第三方资源
│   ├── TextMeshPro/
│   ├── DOTween/
│   └── [其他插件]/
│
├── Editor/                      // 编辑器扩展脚本
│   ├── BuildHelper.cs
│   └── CustomInspectors/
│
├── Plugins/                     // 原生插件
│   ├── Android/
│   └── iOS/
│
├── StreamingAssets/              // 原始数据文件（JSON配置等）
│
└── AddressableAssetsData/       // Addressables 配置（自动生成）
```

---

## 26.10 AssetValidator.cs — 资源验证工具

```csharp
// ============================================================
// AssetValidator.cs — 资源验证工具
// 放置路径：Assets/Editor/AssetValidator.cs
// 功能：检查项目中的资源是否符合移动端优化标准
// ============================================================

using UnityEditor;
using UnityEngine;
using System.IO;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// 资源验证工具
/// 扫描项目中的所有资源，检查是否符合移动端优化标准
/// 生成详细的报告，帮助开发者发现潜在的性能问题
/// </summary>
public class AssetValidator : EditorWindow
{
    // ========================================
    // 配置阈值
    // ========================================

    /// <summary>纹理最大分辨率警告阈值</summary>
    private const int MAX_TEXTURE_SIZE_WARNING = 2048;

    /// <summary>纹理最大分辨率错误阈值</summary>
    private const int MAX_TEXTURE_SIZE_ERROR = 4096;

    /// <summary>模型最大面数警告阈值</summary>
    private const int MAX_TRIANGLE_COUNT_WARNING = 20000;

    /// <summary>模型最大面数错误阈值</summary>
    private const int MAX_TRIANGLE_COUNT_ERROR = 50000;

    /// <summary>音频最大时长（秒）—— 超过此值应使用 Streaming</summary>
    private const float AUDIO_STREAMING_THRESHOLD = 10f;

    /// <summary>单个资源最大文件大小（MB）</summary>
    private const float MAX_FILE_SIZE_MB_WARNING = 10f;

    // ========================================
    // UI 状态
    // ========================================

    /// <summary>滚动位置</summary>
    private Vector2 scrollPosition;

    /// <summary>验证结果列表</summary>
    private List<ValidationResult> results = new List<ValidationResult>();

    /// <summary>是否已运行验证</summary>
    private bool hasRunValidation = false;

    /// <summary>结果统计</summary>
    private int errorCount, warningCount, infoCount;

    // ========================================
    // 验证结果数据结构
    // ========================================

    /// <summary>
    /// 验证结果条目
    /// </summary>
    private struct ValidationResult
    {
        public string AssetPath;     // 资源路径
        public string Message;       // 问题描述
        public MessageType Type;     // 严重程度
        public string Suggestion;    // 修复建议
    }

    /// <summary>
    /// 消息类型（严重程度）
    /// </summary>
    private enum MessageType
    {
        Info,      // 信息
        Warning,   // 警告
        Error      // 错误
    }

    // ========================================
    // 编辑器窗口
    // ========================================

    /// <summary>
    /// 打开验证工具窗口
    /// </summary>
    [MenuItem("Tools/Asset Validator（资源验证工具）")]
    public static void ShowWindow()
    {
        var window = GetWindow<AssetValidator>("资源验证工具");
        window.minSize = new Vector2(600, 400);
    }

    /// <summary>
    /// 绘制窗口界面
    /// </summary>
    private void OnGUI()
    {
        GUILayout.Label("资源验证工具", EditorStyles.boldLabel);
        GUILayout.Label("扫描项目资源，检查是否符合移动端优化标准", EditorStyles.miniLabel);
        GUILayout.Space(10);

        // 操作按钮
        EditorGUILayout.BeginHorizontal();
        if (GUILayout.Button("运行完整验证", GUILayout.Height(30)))
        {
            RunFullValidation();
        }
        if (GUILayout.Button("仅检查纹理", GUILayout.Height(30)))
        {
            results.Clear();
            ValidateTextures();
            UpdateCounts();
            hasRunValidation = true;
        }
        if (GUILayout.Button("仅检查模型", GUILayout.Height(30)))
        {
            results.Clear();
            ValidateModels();
            UpdateCounts();
            hasRunValidation = true;
        }
        if (GUILayout.Button("仅检查音频", GUILayout.Height(30)))
        {
            results.Clear();
            ValidateAudio();
            UpdateCounts();
            hasRunValidation = true;
        }
        EditorGUILayout.EndHorizontal();

        GUILayout.Space(10);

        // 显示结果
        if (hasRunValidation)
        {
            // 统计信息
            EditorGUILayout.BeginHorizontal("box");
            GUILayout.Label($"总计: {results.Count} 条  |  ");
            GUI.color = Color.red;
            GUILayout.Label($"错误: {errorCount}  |  ");
            GUI.color = Color.yellow;
            GUILayout.Label($"警告: {warningCount}  |  ");
            GUI.color = Color.cyan;
            GUILayout.Label($"信息: {infoCount}");
            GUI.color = Color.white;
            EditorGUILayout.EndHorizontal();

            GUILayout.Space(5);

            // 结果列表
            scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);

            foreach (var result in results)
            {
                DrawResultItem(result);
            }

            EditorGUILayout.EndScrollView();
        }
        else
        {
            GUILayout.Label("点击上方按钮开始验证...", EditorStyles.centeredGreyMiniLabel);
        }
    }

    /// <summary>
    /// 绘制单条验证结果
    /// </summary>
    private void DrawResultItem(ValidationResult result)
    {
        // 根据类型设置颜色
        switch (result.Type)
        {
            case MessageType.Error: GUI.color = new Color(1f, 0.6f, 0.6f); break;
            case MessageType.Warning: GUI.color = new Color(1f, 1f, 0.6f); break;
            case MessageType.Info: GUI.color = new Color(0.6f, 1f, 1f); break;
        }

        EditorGUILayout.BeginVertical("box");
        GUI.color = Color.white;

        // 资源路径（可点击跳转）
        EditorGUILayout.BeginHorizontal();
        string typeIcon = result.Type == MessageType.Error ? "[错误]" :
                         result.Type == MessageType.Warning ? "[警告]" : "[信息]";
        GUILayout.Label(typeIcon, GUILayout.Width(40));

        if (GUILayout.Button(result.AssetPath, EditorStyles.linkLabel))
        {
            // 点击跳转到资源
            var asset = AssetDatabase.LoadAssetAtPath<Object>(result.AssetPath);
            if (asset != null)
            {
                Selection.activeObject = asset;
                EditorGUIUtility.PingObject(asset);
            }
        }
        EditorGUILayout.EndHorizontal();

        // 问题描述
        EditorGUILayout.LabelField("  问题: " + result.Message, EditorStyles.wordWrappedLabel);

        // 修复建议
        if (!string.IsNullOrEmpty(result.Suggestion))
        {
            EditorGUILayout.LabelField("  建议: " + result.Suggestion,
                EditorStyles.wordWrappedMiniLabel);
        }

        EditorGUILayout.EndVertical();
    }

    // ========================================
    // 验证方法
    // ========================================

    /// <summary>
    /// 运行完整验证
    /// </summary>
    private void RunFullValidation()
    {
        results.Clear();

        EditorUtility.DisplayProgressBar("资源验证", "正在扫描纹理...", 0.2f);
        ValidateTextures();

        EditorUtility.DisplayProgressBar("资源验证", "正在扫描模型...", 0.5f);
        ValidateModels();

        EditorUtility.DisplayProgressBar("资源验证", "正在扫描音频...", 0.7f);
        ValidateAudio();

        EditorUtility.DisplayProgressBar("资源验证", "正在检查通用问题...", 0.9f);
        ValidateGeneral();

        EditorUtility.ClearProgressBar();
        UpdateCounts();
        hasRunValidation = true;

        Debug.Log($"[AssetValidator] 验证完成: " +
                 $"{errorCount} 错误, {warningCount} 警告, {infoCount} 信息");
    }

    /// <summary>
    /// 验证所有纹理资源
    /// </summary>
    private void ValidateTextures()
    {
        // 查找所有纹理资源
        string[] textureGuids = AssetDatabase.FindAssets("t:Texture2D", new[] { "Assets" });

        foreach (string guid in textureGuids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);

            // 跳过第三方资源
            if (path.Contains("ThirdParty/") || path.Contains("Packages/"))
                continue;

            TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null) continue;

            Texture2D texture = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            if (texture == null) continue;

            // 检查分辨率
            int maxSize = Mathf.Max(texture.width, texture.height);
            if (maxSize > MAX_TEXTURE_SIZE_ERROR)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = $"纹理分辨率过大: {texture.width}x{texture.height}",
                    Type = MessageType.Error,
                    Suggestion = $"移动端建议最大 {MAX_TEXTURE_SIZE_WARNING}x{MAX_TEXTURE_SIZE_WARNING}，" +
                               "在导入设置中修改 Max Size"
                });
            }
            else if (maxSize > MAX_TEXTURE_SIZE_WARNING)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = $"纹理分辨率较大: {texture.width}x{texture.height}",
                    Type = MessageType.Warning,
                    Suggestion = "考虑降低分辨率以减少内存占用"
                });
            }

            // 检查是否为 2 的幂次方
            if (!IsPowerOfTwo(texture.width) || !IsPowerOfTwo(texture.height))
            {
                if (importer.textureType != TextureImporterType.Sprite)
                {
                    results.Add(new ValidationResult
                    {
                        AssetPath = path,
                        Message = $"非 POT 纹理: {texture.width}x{texture.height}",
                        Type = MessageType.Warning,
                        Suggestion = "3D 纹理建议使用 2 的幂次方分辨率（如 256, 512, 1024）"
                    });
                }
            }

            // 检查 Read/Write 是否启用
            if (importer.isReadable)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = "Read/Write Enabled 已开启",
                    Type = MessageType.Warning,
                    Suggestion = "除非需要运行时读写纹理数据，否则关闭以节省内存（内存占用加倍）"
                });
            }

            // 检查移动端压缩格式
            var androidSettings = importer.GetPlatformTextureSettings("Android");
            if (!androidSettings.overridden && importer.textureType != TextureImporterType.Sprite)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = "未设置 Android 平台特定的压缩格式",
                    Type = MessageType.Info,
                    Suggestion = "建议为 Android 平台单独设置 ASTC 或 ETC2 压缩格式"
                });
            }
        }
    }

    /// <summary>
    /// 验证所有 3D 模型资源
    /// </summary>
    private void ValidateModels()
    {
        string[] modelGuids = AssetDatabase.FindAssets("t:Model", new[] { "Assets" });

        foreach (string guid in modelGuids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);

            if (path.Contains("ThirdParty/") || path.Contains("Packages/"))
                continue;

            ModelImporter importer = AssetImporter.GetAtPath(path) as ModelImporter;
            if (importer == null) continue;

            // 加载模型并统计面数
            GameObject model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (model == null) continue;

            int totalTriangles = 0;
            MeshFilter[] meshFilters = model.GetComponentsInChildren<MeshFilter>(true);
            foreach (var mf in meshFilters)
            {
                if (mf.sharedMesh != null)
                    totalTriangles += mf.sharedMesh.triangles.Length / 3;
            }

            SkinnedMeshRenderer[] skinRenderers =
                model.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            foreach (var smr in skinRenderers)
            {
                if (smr.sharedMesh != null)
                    totalTriangles += smr.sharedMesh.triangles.Length / 3;
            }

            // 检查面数
            if (totalTriangles > MAX_TRIANGLE_COUNT_ERROR)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = $"模型面数过多: {totalTriangles:N0} 三角面",
                    Type = MessageType.Error,
                    Suggestion = $"移动端建议单个模型不超过 {MAX_TRIANGLE_COUNT_WARNING:N0} 面，" +
                               "考虑在 Blender 中减面"
                });
            }
            else if (totalTriangles > MAX_TRIANGLE_COUNT_WARNING)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = $"模型面数较多: {totalTriangles:N0} 三角面",
                    Type = MessageType.Warning,
                    Suggestion = "考虑优化模型面数以提升移动端性能"
                });
            }

            // 检查 Read/Write
            if (importer.isReadable)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = "模型 Read/Write Enabled 已开启",
                    Type = MessageType.Warning,
                    Suggestion = "除非需要运行时修改网格，否则关闭以节省内存"
                });
            }

            // 检查是否导入了不需要的组件
            if (importer.importCameras)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = "导入了模型中的相机",
                    Type = MessageType.Info,
                    Suggestion = "通常不需要导入模型中的相机，建议关闭 Import Cameras"
                });
            }

            if (importer.importLights)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = "导入了模型中的灯光",
                    Type = MessageType.Info,
                    Suggestion = "通常不需要导入模型中的灯光，建议关闭 Import Lights"
                });
            }
        }
    }

    /// <summary>
    /// 验证所有音频资源
    /// </summary>
    private void ValidateAudio()
    {
        string[] audioGuids = AssetDatabase.FindAssets("t:AudioClip", new[] { "Assets" });

        foreach (string guid in audioGuids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);

            if (path.Contains("ThirdParty/") || path.Contains("Packages/"))
                continue;

            AudioImporter importer = AssetImporter.GetAtPath(path) as AudioImporter;
            if (importer == null) continue;

            AudioClip clip = AssetDatabase.LoadAssetAtPath<AudioClip>(path);
            if (clip == null) continue;

            // 检查长音频是否使用 Streaming
            AudioImporterSampleSettings defaultSettings = importer.defaultSampleSettings;

            if (clip.length > AUDIO_STREAMING_THRESHOLD &&
                defaultSettings.loadType != AudioClipLoadType.Streaming)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = $"长音频 ({clip.length:F1}秒) 未使用 Streaming 加载",
                    Type = MessageType.Warning,
                    Suggestion = $"超过 {AUDIO_STREAMING_THRESHOLD}秒 的音频建议使用 Streaming 加载方式以节省内存"
                });
            }

            // 检查立体声音效
            if (clip.channels > 1 && clip.length < 5f)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = $"短音效使用立体声（{clip.channels} 声道）",
                    Type = MessageType.Info,
                    Suggestion = "短音效建议使用 Force To Mono（单声道），可节省50%内存"
                });
            }

            // 检查采样率
            if (clip.frequency > 44100 && clip.length < 5f)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = $"音效采样率过高: {clip.frequency} Hz",
                    Type = MessageType.Info,
                    Suggestion = "移动端音效通常 22050 Hz 或 44100 Hz 就足够"
                });
            }
        }
    }

    /// <summary>
    /// 通用验证（文件大小、命名等）
    /// </summary>
    private void ValidateGeneral()
    {
        // 检查大文件
        string[] allAssets = AssetDatabase.GetAllAssetPaths()
            .Where(p => p.StartsWith("Assets/") && !p.Contains("ThirdParty/"))
            .ToArray();

        foreach (string path in allAssets)
        {
            if (!File.Exists(path)) continue;

            FileInfo fileInfo = new FileInfo(path);
            float sizeMB = fileInfo.Length / (1024f * 1024f);

            if (sizeMB > MAX_FILE_SIZE_MB_WARNING)
            {
                results.Add(new ValidationResult
                {
                    AssetPath = path,
                    Message = $"文件较大: {sizeMB:F1} MB",
                    Type = MessageType.Warning,
                    Suggestion = "大文件会增加构建时间和安装包大小，考虑是否可以压缩或拆分"
                });
            }
        }
    }

    // ========================================
    // 辅助方法
    // ========================================

    /// <summary>判断是否为 2 的幂次方</summary>
    private static bool IsPowerOfTwo(int value)
    {
        return value > 0 && (value & (value - 1)) == 0;
    }

    /// <summary>更新统计计数</summary>
    private void UpdateCounts()
    {
        errorCount = results.Count(r => r.Type == MessageType.Error);
        warningCount = results.Count(r => r.Type == MessageType.Warning);
        infoCount = results.Count(r => r.Type == MessageType.Info);
    }
}
```

---

## 26.11 TextureOptimizer.cs — 批量纹理优化工具

```csharp
// ============================================================
// TextureOptimizer.cs — 批量纹理优化工具
// 放置路径：Assets/Editor/TextureOptimizer.cs
// 功能：一键优化项目中所有纹理的导入设置
// ============================================================

using UnityEditor;
using UnityEngine;
using System.IO;

/// <summary>
/// 纹理批量优化工具
/// 根据纹理的用途和路径自动设置最佳的导入参数
/// </summary>
public class TextureOptimizer
{
    // ========================================
    // 菜单项
    // ========================================

    /// <summary>
    /// 优化选中的纹理
    /// </summary>
    [MenuItem("Tools/Texture Optimizer/优化选中的纹理")]
    public static void OptimizeSelectedTextures()
    {
        Object[] selected = Selection.objects;
        int count = 0;

        foreach (Object obj in selected)
        {
            string path = AssetDatabase.GetAssetPath(obj);
            if (OptimizeTexture(path))
                count++;
        }

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log($"[TextureOptimizer] 已优化 {count} 张纹理");
    }

    /// <summary>
    /// 优化项目中所有纹理
    /// </summary>
    [MenuItem("Tools/Texture Optimizer/优化所有纹理（项目范围）")]
    public static void OptimizeAllTextures()
    {
        string[] guids = AssetDatabase.FindAssets("t:Texture2D", new[] { "Assets/_Project" });
        int count = 0;
        int total = guids.Length;

        for (int i = 0; i < guids.Length; i++)
        {
            string path = AssetDatabase.GUIDToAssetPath(guids[i]);

            EditorUtility.DisplayProgressBar(
                "优化纹理",
                $"正在处理 ({i + 1}/{total}): {Path.GetFileName(path)}",
                (float)i / total);

            if (OptimizeTexture(path))
                count++;
        }

        EditorUtility.ClearProgressBar();
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        Debug.Log($"[TextureOptimizer] 已优化 {count}/{total} 张纹理");
    }

    // ========================================
    // 优化逻辑
    // ========================================

    /// <summary>
    /// 根据路径和类型优化单张纹理
    /// </summary>
    /// <param name="path">纹理资源路径</param>
    /// <returns>是否成功优化</returns>
    private static bool OptimizeTexture(string path)
    {
        TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
        if (importer == null) return false;

        string lowerPath = path.ToLower();
        bool changed = false;

        // ---- 根据路径判断纹理用途并设置参数 ----

        if (lowerPath.Contains("/ui/") || lowerPath.Contains("/sprites/"))
        {
            // UI 精灵纹理
            changed = ConfigureAsSprite(importer);
        }
        else if (lowerPath.Contains("_normal") || lowerPath.Contains("_norm"))
        {
            // 法线贴图
            changed = ConfigureAsNormalMap(importer);
        }
        else if (lowerPath.Contains("/environment/") || lowerPath.Contains("/terrain/"))
        {
            // 环境纹理
            changed = ConfigureAsEnvironmentTexture(importer);
        }
        else if (lowerPath.Contains("/characters/"))
        {
            // 角色纹理
            changed = ConfigureAsCharacterTexture(importer);
        }
        else
        {
            // 默认优化
            changed = ConfigureDefault(importer);
        }

        // 通用设置
        if (importer.isReadable)
        {
            importer.isReadable = false;
            changed = true;
        }

        if (changed)
        {
            importer.SaveAndReimport();
        }

        return changed;
    }

    /// <summary>
    /// 配置为 UI 精灵
    /// </summary>
    private static bool ConfigureAsSprite(TextureImporter importer)
    {
        bool changed = false;

        if (importer.textureType != TextureImporterType.Sprite)
        {
            importer.textureType = TextureImporterType.Sprite;
            changed = true;
        }

        // UI 不需要 Mipmap
        if (importer.mipmapEnabled)
        {
            importer.mipmapEnabled = false;
            changed = true;
        }

        // 设置移动端压缩
        SetPlatformSettings(importer, "Android", 1024, TextureImporterFormat.ASTC_6x6);
        SetPlatformSettings(importer, "iPhone", 1024, TextureImporterFormat.ASTC_6x6);

        return changed || true;
    }

    /// <summary>
    /// 配置为法线贴图
    /// </summary>
    private static bool ConfigureAsNormalMap(TextureImporter importer)
    {
        bool changed = false;

        if (importer.textureType != TextureImporterType.NormalMap)
        {
            importer.textureType = TextureImporterType.NormalMap;
            changed = true;
        }

        // 法线贴图需要更高质量的压缩
        SetPlatformSettings(importer, "Android", 1024, TextureImporterFormat.ASTC_4x4);
        SetPlatformSettings(importer, "iPhone", 1024, TextureImporterFormat.ASTC_4x4);

        return changed || true;
    }

    /// <summary>
    /// 配置为环境纹理
    /// </summary>
    private static bool ConfigureAsEnvironmentTexture(TextureImporter importer)
    {
        // 环境纹理可以使用较低分辨率和较高压缩
        importer.mipmapEnabled = true;

        SetPlatformSettings(importer, "Android", 1024, TextureImporterFormat.ASTC_6x6);
        SetPlatformSettings(importer, "iPhone", 1024, TextureImporterFormat.ASTC_6x6);

        return true;
    }

    /// <summary>
    /// 配置为角色纹理
    /// </summary>
    private static bool ConfigureAsCharacterTexture(TextureImporter importer)
    {
        // 角色纹理需要较高质量
        importer.mipmapEnabled = true;

        SetPlatformSettings(importer, "Android", 2048, TextureImporterFormat.ASTC_4x4);
        SetPlatformSettings(importer, "iPhone", 2048, TextureImporterFormat.ASTC_4x4);

        return true;
    }

    /// <summary>
    /// 默认配置
    /// </summary>
    private static bool ConfigureDefault(TextureImporter importer)
    {
        importer.mipmapEnabled = true;

        SetPlatformSettings(importer, "Android", 1024, TextureImporterFormat.ASTC_6x6);
        SetPlatformSettings(importer, "iPhone", 1024, TextureImporterFormat.ASTC_6x6);

        return true;
    }

    /// <summary>
    /// 设置特定平台的纹理参数
    /// </summary>
    private static void SetPlatformSettings(
        TextureImporter importer,
        string platform,
        int maxSize,
        TextureImporterFormat format)
    {
        var settings = importer.GetPlatformTextureSettings(platform);
        settings.overridden = true;
        settings.maxTextureSize = maxSize;
        settings.format = format;
        settings.compressionQuality = 50; // 中等压缩质量
        importer.SetPlatformTextureSettings(settings);
    }
}
```

---

## 练习题

### 练习1：纹理优化实践（难度：简单）
在你的项目中添加 5-10 张纹理（混合不同用途），运行 AssetValidator 并修复所有警告和错误。记录修复前后的内存占用差异。

### 练习2：AI 纹理工作流（难度：中等）
使用 AI 工具（Midjourney 或 Stable Diffusion）生成一组开放世界游戏的地面纹理：
1. 草地纹理（无缝拼接）
2. 泥地纹理
3. 石头路纹理
4. 生成对应的法线贴图
5. 导入 Unity 并创建材质，应用到地形上

### 练习3：Sprite Atlas 优化（难度：中等）
为你游戏的 UI 创建 Sprite Atlas：
1. 准备 15-20 个 UI 元素（按钮、图标、边框等）
2. 创建合理的 Atlas 分组
3. 对比使用 Atlas 前后的 Draw Call 数量

### 练习4：AI 3D 模型管线（难度：高级）
完成一个从 AI 生成到 Unity 使用的完整 3D 模型管线：
1. 使用 Meshy 或 Tripo 生成一个 NPC 模型
2. 在 Blender 中清理和优化（减面到 5000 面以下）
3. 上传到 Mixamo 绑定骨骼
4. 下载 Idle 和 Walk 动画
5. 导入 Unity，设置 Humanoid Rig
6. 创建 Animator Controller 并让角色动起来

---

## 下一章预告

在下一章**第27章：项目架构与设计模式**中，我们将学习：
- 文件夹结构最佳实践（基于功能 vs 基于类型）
- Assembly Definition 加速编译
- Unity 中的设计模式（单例、观察者、状态机、命令、对象池等）
- ScriptableObject 架构（数据驱动设计）
- 依赖注入基础
- Unity 测试框架
- CI/CD 与 GitHub Actions
- 与前端架构的对比（React 模式、状态管理）

好的架构是大型项目成功的基石。作为有前端经验的开发者，你会发现 Unity 中的许多架构模式与你熟悉的 React/Vue 模式有着有趣的对应关系。
