# 第五章：构建你的第一个 3D 场景

## 本章目标

- 理解 Unity 场景（Scene）的概念和结构
- 学会创建和管理 3D 基础物体（Primitive Objects）
- 掌握 Transform 组件的位置、旋转、缩放操作
- 学会创建和应用材质（Material）与颜色
- 理解光照系统基础（方向光、点光源、聚光灯）
- 配置天空盒（Skybox）营造环境氛围
- 设置摄像机的位置和参数
- 区分 Play Mode 和 Edit Mode 的工作流
- 从零开始搭建一个完整的游乐场场景

## 预计学习时间

**3-4 小时**（建议跟着教程一步步操作，边学边做）

---

## 5.1 什么是场景（Scene）？

在 Unity 中，**场景** 是游戏世界的基本容器。你可以把它理解为：

- **前端类比：** 场景类似于一个独立的 HTML 页面（SPA 中的一个 Route），包含了页面上的所有元素
- **游戏中的场景：** 主菜单是一个场景，游戏关卡是一个场景，加载画面也可以是一个场景

每个场景包含：
- **GameObject（游戏对象）：** 场景中的所有实体
- **光照设置：** 环境光、方向光等
- **天空盒：** 背景环境
- **摄像机：** 玩家的"眼睛"

### 5.1.1 创建新场景

1. 在菜单栏选择 **File > New Scene**
2. 选择 **Basic (Built-in)** 模板
3. 点击 **Create**

[截图：File > New Scene 菜单，显示场景模板选择对话框]

或者使用快捷键：
- **Mac:** `Cmd + N`

默认的新场景包含两个 GameObject：
- **Main Camera** — 主摄像机
- **Directional Light** — 方向光（模拟太阳光）

### 5.1.2 保存场景

创建新场景后，第一件事就是保存：

1. **File > Save As**（Mac: `Cmd + Shift + S`）
2. 在项目的 **Assets** 文件夹下创建 **Scenes** 子文件夹
3. 将场景命名为 `Playground`
4. 点击 **Save**

[截图：保存场景对话框，文件名为 Playground，保存在 Assets/Scenes 目录下]

> **好习惯：** 养成频繁保存的习惯（`Cmd + S`）。Unity 不像 VS Code 有自动保存，如果崩溃（虽然现在很少了）你会丢失所有未保存的更改。

### 5.1.3 场景文件结构

保存后，在 Project 窗口中你会看到：

```
Assets/
  Scenes/
    Playground.unity       ← 场景文件
    Playground.unity.meta  ← 元数据（Unity 自动管理）
```

场景文件（`.unity`）本质上是一个 YAML 格式的文本文件，记录了场景中所有 GameObject 的信息。这和前端项目中的 JSON 配置文件类似。

---

## 5.2 3D 基础物体（Primitives）

Unity 内置了几种基础 3D 形状，这些是搭建场景的"积木块"。

### 5.2.1 创建基础物体

在 **Hierarchy** 窗口中右键，选择 **3D Object**：

[截图：Hierarchy 窗口右键菜单，展开 3D Object 子菜单，显示所有基础物体选项]

| 物体 | 英文名 | 形状 | 常见用途 |
|------|--------|------|---------|
| 立方体 | Cube | 正方体 | 墙壁、箱子、建筑 |
| 球体 | Sphere | 圆球 | 弹丸、装饰、碰撞检测 |
| 平面 | Plane | 扁平面（10x10单位） | 地面、水面 |
| 圆柱体 | Cylinder | 圆柱 | 柱子、树干 |
| 胶囊体 | Capsule | 胶囊形 | 角色碰撞体、占位符 |
| 四边形 | Quad | 单面方形 | UI面板、公告板 |

### 5.2.2 逐一添加基础物体

让我们依次创建每种物体并了解它们的特性：

**1. 创建地面（Plane）**

1. Hierarchy 窗口 > 右键 > **3D Object > Plane**
2. 在 Inspector 中将其命名为 `Ground`
3. 确认 Transform 参数：
   - Position: (0, 0, 0)
   - Rotation: (0, 0, 0)
   - Scale: (1, 1, 1)

[截图：创建 Plane 后的场景视图，显示一个白色平面]

> **注意：** Plane 的默认大小是 10x10 个 Unity 单位。1 个 Unity 单位通常对应现实中的 1 米。所以默认的 Plane 是 10m x 10m。

**2. 创建立方体（Cube）**

1. Hierarchy > 右键 > **3D Object > Cube**
2. 命名为 `Cube_01`
3. 设置 Transform：
   - Position: (0, 0.5, 0) — 让立方体"站在"地面上
   - Rotation: (0, 0, 0)
   - Scale: (1, 1, 1)

[截图：立方体放置在平面上的效果]

> **为什么 Y 是 0.5？** 立方体的默认大小是 1x1x1 单位，中心点（pivot）在正中间。所以要让底面刚好贴在 Y=0 的地面上，中心点需要在 Y=0.5 的位置。

**3. 创建球体（Sphere）**

1. Hierarchy > 右键 > **3D Object > Sphere**
2. 命名为 `Sphere_01`
3. 设置 Transform：
   - Position: (2, 0.5, 0) — 放在立方体旁边
   - Scale: (1, 1, 1) — 默认半径 0.5 单位

[截图：球体放在立方体旁边的效果]

**4. 创建圆柱体（Cylinder）**

1. Hierarchy > 右键 > **3D Object > Cylinder**
2. 命名为 `Cylinder_01`
3. 设置 Transform：
   - Position: (-2, 1, 0)
   - Scale: (1, 2, 1) — Y 方向拉伸，变成更高的圆柱

[截图：拉伸后的圆柱体]

**5. 创建胶囊体（Capsule）**

1. Hierarchy > 右键 > **3D Object > Capsule**
2. 命名为 `PlayerPlaceholder`
3. 设置 Transform：
   - Position: (0, 1, -3)
   - Scale: (1, 1, 1)

> **胶囊体在游戏开发中的特殊地位：** 在正式的角色模型导入之前，胶囊体是最常用的角色占位符。它的形状近似人体轮廓，碰撞检测也很高效。

---

## 5.3 Transform 组件详解

Transform 是 Unity 中最基础、最重要的组件。**每个 GameObject 都必须有且只有一个 Transform 组件**，它定义了物体在 3D 空间中的位置、旋转和缩放。

### 5.3.1 三要素

```
Transform
├── Position（位置）  → 在世界空间中的坐标 (X, Y, Z)
├── Rotation（旋转）  → 绕各轴的旋转角度 (X, Y, Z)，以度为单位
└── Scale（缩放）     → 各轴的缩放比例 (X, Y, Z)
```

**坐标系统：**
- **X 轴：** 红色，指向右方
- **Y 轴：** 绿色，指向上方
- **Z 轴：** 蓝色，指向前方（屏幕里面）

[截图：Scene 视图中显示的 XYZ 坐标轴指示器（Gizmo），红绿蓝三色]

> **前端类比：** CSS 的 `transform: translate3d(x, y, z) rotate(angle) scale(s)` 和 Unity 的 Transform 非常相似。唯一的区别是 CSS 的 Y 轴向下，Unity 的 Y 轴向上。

### 5.3.2 在 Inspector 中编辑 Transform

选中任何 GameObject，在 Inspector 面板中可以直接输入数值：

[截图：Inspector 中的 Transform 组件，显示 Position、Rotation、Scale 三行数值输入框]

**快捷操作：**
- 右键 Transform 标题 > **Reset** — 重置到默认值 (0,0,0)
- 按住 `V` 键拖动 — 顶点吸附（Vertex Snapping）
- 按住 `Ctrl` 拖动 — 按网格吸附（默认 0.25 单位步进）

### 5.3.3 在 Scene 视图中操作 Transform

Scene 视图左上角有四个工具按钮（或使用快捷键）：

| 工具 | 快捷键 | 功能 | 图标 |
|------|--------|------|------|
| Hand（手形） | Q | 平移视图（不影响物体） | 手掌 |
| Move（移动） | W | 移动选中的物体 | 十字箭头 |
| Rotate（旋转） | E | 旋转选中的物体 | 旋转圆环 |
| Scale（缩放） | R | 缩放选中的物体 | 缩放方块 |
| Rect（矩形） | T | 2D 矩形变换 | 矩形 |
| Transform（全能） | Y | 同时显示移动+旋转+缩放 | 综合 |

[截图：Scene 视图左上角的工具栏，标注各个按钮和快捷键]

### 5.3.4 通过代码操作 Transform

```csharp
using UnityEngine;

public class TransformExample : MonoBehaviour
{
    // 在代码中操作 Transform
    void Start()
    {
        // 设置位置（世界坐标）
        transform.position = new Vector3(0f, 1f, 0f);

        // 设置本地位置（相对于父物体）
        transform.localPosition = new Vector3(0f, 1f, 0f);

        // 设置旋转（欧拉角）
        transform.rotation = Quaternion.Euler(0f, 45f, 0f); // 绕Y轴旋转45度

        // 设置缩放（只有 localScale，没有全局 scale）
        transform.localScale = new Vector3(2f, 1f, 2f); // X和Z方向放大2倍
    }

    void Update()
    {
        // 每帧移动物体
        // Time.deltaTime 确保不同帧率下移动速度一致
        transform.position += new Vector3(1f, 0f, 0f) * Time.deltaTime;
        // 等价于：
        transform.Translate(Vector3.right * Time.deltaTime);

        // 每帧旋转物体
        transform.Rotate(0f, 90f * Time.deltaTime, 0f); // 每秒旋转90度
    }
}
```

### 5.3.5 父子关系（Hierarchy）

Unity 的 GameObject 可以建立父子关系，子物体的 Transform 相对于父物体：

1. 在 Hierarchy 窗口中，将 `Sphere_01` 拖拽到 `Cube_01` 上
2. `Sphere_01` 变成了 `Cube_01` 的子物体
3. 移动 `Cube_01` 时，`Sphere_01` 会跟着一起移动

[截图：Hierarchy 窗口中显示 Cube_01 展开后包含 Sphere_01 的父子关系]

```csharp
// 代码中建立父子关系
public class ParentExample : MonoBehaviour
{
    public Transform childObject; // 在 Inspector 中拖入子物体

    void Start()
    {
        // 设置父物体
        childObject.SetParent(transform);

        // 设置父物体并保持世界坐标不变
        childObject.SetParent(transform, worldPositionStays: true);

        // 解除父子关系
        // childObject.SetParent(null);

        // 查找子物体
        Transform found = transform.Find("ChildName");

        // 遍历所有子物体
        foreach (Transform child in transform)
        {
            Debug.Log($"子物体: {child.name}");
        }

        // 子物体数量
        int childCount = transform.childCount;
    }
}
```

> **前端类比：** 父子关系就像 DOM 树。父元素的 `transform` 会影响所有子元素，就像 CSS 中父元素的 `transform` 会影响子元素一样。`transform.Find("name")` 类似 `element.querySelector('.name')`。

---

## 5.4 材质与颜色（Materials）

白色的几何体看起来很无聊。让我们给它们添加颜色和材质。

### 5.4.1 什么是材质（Material）？

材质定义了物体表面的视觉属性：
- **颜色（Color）：** 基础色
- **质感（Texture）：** 贴图
- **光泽度（Smoothness）：** 表面光滑程度
- **金属度（Metallic）：** 金属质感

> **前端类比：** 材质就像 CSS 样式。`color` 对应颜色，`background-image` 对应贴图，`opacity` 对应透明度。不同的是，3D 材质还需要处理光照反射。

### 5.4.2 创建材质

1. 在 **Project** 窗口中，右键 Assets 文件夹
2. 选择 **Create > Folder**，命名为 `Materials`
3. 进入 Materials 文件夹
4. 右键 > **Create > Material**
5. 命名为 `M_Ground`（M_ 是材质的常见命名前缀）

[截图：Project 窗口中创建 Material 的菜单]

### 5.4.3 编辑材质属性

选中刚创建的 `M_Ground` 材质，在 Inspector 中编辑：

[截图：Material 的 Inspector 面板，标注各个属性区域]

**基础属性：**

1. **Shader** — 默认是 `Standard`（内置渲染管线）或 `Universal Render Pipeline/Lit`（URP）
2. **Albedo（反照率）** — 基础颜色
   - 点击颜色方块打开拾色器
   - 为 `M_Ground` 选择一个草绿色，如 `#4CAF50` 或 RGB(76, 175, 80)
3. **Metallic（金属度）** — 滑块 0-1，0 是非金属，1 是全金属
   - 地面设为 0
4. **Smoothness（光滑度）** — 滑块 0-1，0 是粗糙，1 是镜面
   - 地面设为 0.2（略微粗糙）

### 5.4.4 应用材质到物体

有三种方式：

**方式 1：直接拖拽**
- 从 Project 窗口拖动 `M_Ground` 材质到 Scene 视图中的 Ground 物体上

**方式 2：拖到 Inspector**
- 选中 Ground 物体
- 将 `M_Ground` 拖到 Inspector 中 Mesh Renderer 组件的 Materials 区域

**方式 3：代码赋值**
```csharp
// 通过代码设置材质和颜色
public class MaterialExample : MonoBehaviour
{
    void Start()
    {
        // 获取渲染器组件
        Renderer renderer = GetComponent<Renderer>();

        // 修改颜色（会自动创建材质实例）
        renderer.material.color = Color.green;

        // 使用自定义颜色
        renderer.material.color = new Color(0.3f, 0.7f, 0.3f, 1f); // RGBA

        // 使用十六进制颜色
        Color hexColor;
        ColorUtility.TryParseHtmlString("#4CAF50", out hexColor);
        renderer.material.color = hexColor;

        // 修改其他属性
        renderer.material.SetFloat("_Metallic", 0f);    // 金属度
        renderer.material.SetFloat("_Glossiness", 0.2f); // 光滑度
    }
}
```

[截图：绿色地面的效果]

### 5.4.5 创建更多材质

按照相同步骤，为我们的场景创建以下材质：

| 材质名称 | 颜色 | 金属度 | 光滑度 | 用途 |
|---------|------|--------|--------|------|
| M_Ground | #4CAF50（绿色） | 0 | 0.2 | 地面 |
| M_Wall | #9E9E9E（灰色） | 0 | 0.3 | 墙壁 |
| M_Wood | #795548（棕色） | 0 | 0.1 | 木质物体 |
| M_Metal | #607D8B（蓝灰） | 0.8 | 0.7 | 金属物体 |
| M_Accent | #FF5722（橙红） | 0 | 0.5 | 强调色物体 |
| M_Water | #2196F3（蓝色） | 0 | 0.9 | 水面效果 |

[截图：Project 窗口中创建好的所有材质文件]

> **命名规范：** 使用前缀来区分资源类型是 Unity 开发的好习惯。`M_` 表示材质，`T_` 表示贴图，`S_` 表示声音，`P_` 表示预制体。这和前端项目中的文件命名规范类似。

---

## 5.5 光照系统基础

光照是 3D 场景最重要的视觉元素之一。好的光照可以让简单的几何体看起来非常有氛围。

### 5.5.1 方向光（Directional Light）

方向光模拟太阳光，它的特点是：
- 光线平行（从同一方向照射所有物体）
- 位置不重要，只有旋转有意义
- 默认场景已经包含一个方向光

**调整方向光：**

1. 在 Hierarchy 中选择 **Directional Light**
2. 在 Inspector 中调整以下参数：

```
Transform:
  Rotation: (50, -30, 0)  ← 模拟下午的阳光角度

Light 组件:
  Color: 暖白色 #FFF8E1     ← 模拟阳光色温
  Intensity: 1.2             ← 稍微增强亮度
  Shadow Type: Soft Shadows  ← 柔和阴影
```

[截图：调整方向光后场景中物体的阴影效果变化]

### 5.5.2 点光源（Point Light）

点光源从一个点向所有方向发射光线，类似灯泡：

1. Hierarchy > 右键 > **Light > Point Light**
2. 命名为 `PointLight_Warm`
3. 设置参数：

```
Transform:
  Position: (0, 3, 0)  ← 悬浮在场景上方

Light 组件:
  Color: 暖黄色 #FFE082
  Intensity: 2
  Range: 10            ← 光照范围（半径）
  Shadow Type: Soft Shadows
```

[截图：点光源在场景中的效果，注意光照范围的球形区域]

### 5.5.3 聚光灯（Spot Light）

聚光灯像手电筒，从一个点射出锥形光束：

1. Hierarchy > 右键 > **Light > Spot Light**
2. 命名为 `SpotLight_Stage`
3. 设置参数：

```
Transform:
  Position: (3, 5, 0)
  Rotation: (90, 0, 0)  ← 向下照射

Light 组件:
  Color: 白色
  Intensity: 3
  Range: 15
  Spot Angle: 45        ← 锥形角度
  Shadow Type: Soft Shadows
```

[截图：聚光灯的锥形照射效果]

### 5.5.4 环境光（Ambient Light）

环境光是场景的基础照明，确保阴影处不是完全黑暗。

1. 菜单栏 > **Window > Rendering > Lighting**
2. 打开 **Lighting** 窗口
3. 切换到 **Environment** 标签
4. 调整 **Ambient Color** 和 **Ambient Intensity**

[截图：Lighting 窗口的 Environment 设置面板]

```
Environment Lighting:
  Source: Color          ← 使用纯色作为环境光
  Ambient Color: #37474F ← 深蓝灰色，模拟天光
  Ambient Intensity: 0.5
```

### 5.5.5 光照实时预览

在 Scene 视图中，你可以切换光照的显示模式：

- 点击 Scene 视图顶部工具栏的 **Shading Mode** 下拉菜单
- **Shaded** — 完整光照效果（默认）
- **Wireframe** — 线框模式（查看网格结构）
- **Shaded Wireframe** — 光照 + 线框
- **Shadow Cascades** — 阴影级联可视化

[截图：不同 Shading Mode 的对比效果]

---

## 5.6 天空盒（Skybox）

天空盒是包围整个场景的背景，它定义了"天空"的外观。

### 5.6.1 默认天空盒

Unity 的默认天空盒是一个简单的蓝天渐变。你可以在 **Window > Rendering > Lighting > Environment** 中看到当前的天空盒材质。

### 5.6.2 创建自定义天空盒

**方法 1：纯色/渐变天空盒（最简单）**

1. 在 Project 窗口中创建新材质，命名为 `M_Skybox_Custom`
2. 在 Inspector 中将 **Shader** 改为 **Skybox/Procedural**
3. 调整参数：
   - **Sun Size:** 0.04 — 太阳大小
   - **Sun Size Convergence:** 5 — 太阳边缘锐度
   - **Atmosphere Thickness:** 1.0 — 大气厚度
   - **Sky Tint:** 淡蓝色 — 天空颜色
   - **Ground:** 深灰色 — 地平线以下颜色
   - **Exposure:** 1.3 — 曝光度

[截图：Procedural 天空盒的 Inspector 设置和效果预览]

4. 打开 **Lighting** 窗口（Window > Rendering > Lighting）
5. 在 **Environment** 标签中，将 **Skybox Material** 设置为 `M_Skybox_Custom`

**方法 2：6 面天空盒（六张图片）**

1. 准备六张图片（上、下、左、右、前、后）
2. 创建材质，Shader 选择 **Skybox/6 Sided**
3. 将六张图片分别拖入对应的槽位

### 5.6.3 让天空盒影响环境光

在 Lighting 窗口的 Environment 标签中：

```
Environment Lighting:
  Source: Skybox          ← 从天空盒采样环境光颜色
  Intensity Multiplier: 1
```

这样场景中的物体会被天空盒的颜色微微影响，产生更自然的环境光效果。

[截图：开启和关闭天空盒环境光的对比效果]

---

## 5.7 摄像机设置

### 5.7.1 Main Camera 基础

选中 Hierarchy 中的 **Main Camera**，查看 Inspector：

[截图：Main Camera 的 Inspector 面板，标注各主要属性]

**关键属性：**

```
Transform:
  Position: (0, 5, -10)    ← 在场景后上方
  Rotation: (30, 0, 0)     ← 略微向下俯视

Camera 组件:
  Clear Flags: Skybox       ← 背景使用天空盒
  Projection: Perspective   ← 透视投影（3D游戏标配）
  Field of View: 60         ← 视野角度（类似相机焦距）
  Clipping Planes:
    Near: 0.3               ← 近裁剪面（太近的物体不渲染）
    Far: 1000                ← 远裁剪面（太远的物体不渲染）
```

### 5.7.2 Projection 模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| Perspective（透视） | 近大远小，符合人眼视觉 | 3D 游戏（我们的项目） |
| Orthographic（正交） | 没有透视效果，物体大小不随距离变化 | 2D 游戏、策略游戏、UI |

### 5.7.3 Field of View (FOV)

FOV 控制摄像机的视野宽度：
- **小 FOV（30-40）：** 望远镜效果，适合狙击视角
- **中 FOV（50-70）：** 自然视觉，适合大多数 3D 游戏
- **大 FOV（80-110）：** 广角效果，适合 FPS 或赛车游戏

[截图：不同 FOV 值（30、60、90）的画面效果对比]

### 5.7.4 通过 Scene 视图对齐摄像机

一个非常实用的功能：将摄像机对齐到当前 Scene 视图的视角。

1. 在 Scene 视图中调整到你满意的视角
2. 选中 Hierarchy 中的 **Main Camera**
3. 菜单栏 > **GameObject > Align With View**（Mac: `Cmd + Shift + F`）

这样摄像机就会精确移动到你当前在 Scene 视图中看到的位置和角度。

[截图：使用 Align With View 前后的摄像机位置变化]

### 5.7.5 Camera Preview

选中 Main Camera 后，Scene 视图右下角会出现一个小预览窗口，显示摄像机实际看到的画面：

[截图：Scene 视图右下角的 Camera Preview 窗口]

---

## 5.8 Play Mode vs Edit Mode

### 5.8.1 两种模式的区别

| 特征 | Edit Mode（编辑模式） | Play Mode（运行模式） |
|------|---------------------|---------------------|
| 状态 | 编辑器正常状态 | 点击播放按钮后进入 |
| 脚本执行 | 不执行 Update 等 | 正常执行所有脚本 |
| 物理模拟 | 不运行 | 正常运行 |
| 修改保存 | 会保存 | **退出后所有修改丢失！** |
| 界面提示 | 正常颜色 | 编辑器变深色（可自定义） |

> **最重要的一点：Play Mode 中的修改在退出后会全部丢失！** 这是新手最容易犯的错误。如果你在 Play Mode 中调整了物体位置或参数，退出后它们会恢复到进入 Play Mode 之前的状态。

### 5.8.2 Play Mode 颜色提示

为了避免在 Play Mode 中不小心修改并丢失更改，建议设置明显的颜色提示：

1. **Unity > Settings（Mac）** 或 **Edit > Preferences**
2. 选择 **Colors** 标签
3. 找到 **Playmode tint**
4. 设置一个明显的颜色（如浅红色 `#FFCDD2`）

[截图：Preferences 中设置 Playmode tint 的界面]

这样进入 Play Mode 时，整个编辑器界面会变成浅红色，提醒你"现在是运行模式，修改不会保存"。

### 5.8.3 控制 Play Mode

使用编辑器顶部中央的三个按钮：

| 按钮 | 快捷键 | 功能 |
|------|--------|------|
| Play ▶ | `Cmd + P` | 开始/停止运行 |
| Pause ⏸ | `Cmd + Shift + P` | 暂停/继续 |
| Step ⏭ | `Cmd + Alt + P` | 逐帧步进（暂停时） |

[截图：编辑器顶部的 Play/Pause/Step 按钮]

---

## 5.9 实战：搭建游乐场场景

现在让我们综合运用以上知识，从零开始搭建一个完整的游乐场场景。

### 5.9.1 场景规划

我们要搭建的场景包含：
- 一块带围墙的草地
- 几个可交互的物体（箱子、球、柱子）
- 一个简易阶梯/平台
- 合适的光照和氛围

```
场景俯视图（大致布局）：

    北 (Z+)
    ┌──────────────────────┐
    │  柱子        阶梯     │
    │   ○         ┌──┐     │
    │             │  │     │
    │   箱子      └──┘     │
    │   ■                  │
    │         球           │
    │          ●     ■ 箱子 │
    │                      │
    │  ▲ 玩家出生点         │
    └──────────────────────┘
    南 (Z-)
```

### 5.9.2 第一步：创建地面

1. 如果之前已经创建了 Ground，确认它在正确的位置
2. 如果没有，创建 Plane 并命名为 `Ground`
3. 设置 Transform：
   - Position: (0, 0, 0)
   - Scale: (3, 1, 3) — 扩大到 30m x 30m

4. 应用 `M_Ground`（绿色）材质

[截图：扩大后的绿色地面]

### 5.9.3 第二步：创建围墙

我们需要四面墙围住场景：

**北墙：**
1. 创建 Cube，命名为 `Wall_North`
2. Transform:
   - Position: (0, 1.5, 15)
   - Scale: (30, 3, 0.5)
3. 应用 `M_Wall`（灰色）材质

**南墙：**
1. 创建 Cube，命名为 `Wall_South`
2. Transform:
   - Position: (0, 1.5, -15)
   - Scale: (30, 3, 0.5)

**东墙：**
1. 创建 Cube，命名为 `Wall_East`
2. Transform:
   - Position: (15, 1.5, 0)
   - Scale: (0.5, 3, 30)

**西墙：**
1. 创建 Cube，命名为 `Wall_West`
2. Transform:
   - Position: (-15, 1.5, 0)
   - Scale: (0.5, 3, 30)

[截图：四面墙围住的地面效果]

> **组织 Hierarchy：** 创建一个空 GameObject（Hierarchy > 右键 > Create Empty），命名为 `--- Walls ---`，然后将四面墙拖入其中作为子物体。这样可以保持 Hierarchy 整洁。在实际的大型项目中，良好的层级组织非常重要。

### 5.9.4 第三步：添加物体

**箱子组（可堆叠的箱子）：**

创建一个空 GameObject 作为容器，命名为 `--- Crates ---`，然后创建以下箱子：

```
Crate_01:
  Position: (-5, 0.5, -3)
  Scale: (1, 1, 1)
  Material: M_Wood

Crate_02:
  Position: (-5, 1.5, -3)  ← 堆在 Crate_01 上面
  Scale: (1, 1, 1)
  Material: M_Wood

Crate_03:
  Position: (8, 0.75, 5)
  Scale: (1.5, 1.5, 1.5)  ← 大箱子
  Material: M_Wood

Crate_04:
  Position: (8, 2.25, 5)  ← 堆在大箱子上
  Scale: (1, 1, 1)
  Material: M_Accent
```

[截图：堆叠的箱子效果]

**装饰球体：**

```
Sphere_Accent:
  Position: (3, 0.5, -2)
  Scale: (1, 1, 1)
  Material: M_Accent（橙红色）

Sphere_Metal:
  Position: (5, 0.75, 0)
  Scale: (1.5, 1.5, 1.5)
  Material: M_Metal（金属质感）
```

**柱子：**

```
Pillar_01:
  Object: Cylinder
  Position: (-8, 1.5, 8)
  Scale: (1, 3, 1)  ← 高柱子
  Material: M_Wall

Pillar_02:
  Object: Cylinder
  Position: (-5, 1, 8)
  Scale: (0.8, 2, 0.8)
  Material: M_Wall

Pillar_03:
  Object: Cylinder
  Position: (-2, 0.5, 8)
  Scale: (0.6, 1, 0.6)
  Material: M_Wall
```

### 5.9.5 第四步：搭建阶梯/平台

使用多个 Cube 搭建一个简易阶梯：

创建空 GameObject，命名为 `--- Stairs ---`：

```
Step_01:
  Position: (8, 0.25, 10)
  Scale: (4, 0.5, 2)
  Material: M_Wall

Step_02:
  Position: (8, 0.75, 12)
  Scale: (4, 0.5, 2)
  Material: M_Wall

Step_03:
  Position: (8, 1.25, 14)  ← 注意靠近北墙
  Scale: (4, 0.5, 2)
  Material: M_Wall

Platform_Top:  ← 阶梯顶部的平台
  Position: (8, 1.75, 11)
  Scale: (6, 0.5, 8)
  Material: M_Metal
```

[截图：阶梯和平台的效果]

### 5.9.6 第五步：添加装饰水池

```
WaterPool:  ← 使用 Plane 模拟水面
  Position: (-8, 0.05, -5)  ← 略高于地面
  Scale: (0.5, 1, 0.5)      ← 5m x 5m
  Material: M_Water（蓝色，光滑度 0.9）

PoolBorder_N:  ← 水池边框（北）
  Position: (-8, 0.15, -2.6)
  Scale: (5.4, 0.3, 0.2)
  Material: M_Wall

PoolBorder_S:
  Position: (-8, 0.15, -7.4)
  Scale: (5.4, 0.3, 0.2)
  Material: M_Wall

PoolBorder_E:
  Position: (-5.6, 0.15, -5)
  Scale: (0.2, 0.3, 5)
  Material: M_Wall

PoolBorder_W:
  Position: (-10.4, 0.15, -5)
  Scale: (0.2, 0.3, 5)
  Material: M_Wall
```

### 5.9.7 第六步：配置光照

**调整主方向光：**
```
Directional Light:
  Rotation: (50, -30, 0)
  Color: #FFF8E1（暖白）
  Intensity: 1.0
  Shadow Type: Soft Shadows
```

**添加补光：**
```
Fill Light (Point Light):
  Position: (0, 8, 0)
  Color: #E3F2FD（冷蓝）
  Intensity: 0.5
  Range: 30
  Shadow Type: No Shadows  ← 补光不需要阴影
```

**添加聚光灯照亮特定区域：**
```
Spotlight_Platform (Spot Light):
  Position: (8, 8, 11)
  Rotation: (90, 0, 0)
  Color: #FFF176（暖黄）
  Intensity: 2
  Range: 12
  Spot Angle: 50
```

### 5.9.8 第七步：设置摄像机

```
Main Camera:
  Position: (0, 12, -20)
  Rotation: (30, 0, 0)
  Field of View: 60
  Clear Flags: Skybox
```

也可以使用 **Align With View** 快速设置：在 Scene 视图中找到一个好的角度，然后选中 Main Camera，按 `Cmd + Shift + F`。

### 5.9.9 第八步：组织 Hierarchy

最终的 Hierarchy 应该整洁有序：

```
Playground（场景）
├── Main Camera
├── Directional Light
├── Fill Light
├── Spotlight_Platform
├── Ground
├── --- Walls ---
│   ├── Wall_North
│   ├── Wall_South
│   ├── Wall_East
│   └── Wall_West
├── --- Crates ---
│   ├── Crate_01
│   ├── Crate_02
│   ├── Crate_03
│   └── Crate_04
├── --- Decorations ---
│   ├── Sphere_Accent
│   ├── Sphere_Metal
│   ├── Pillar_01
│   ├── Pillar_02
│   └── Pillar_03
├── --- Stairs ---
│   ├── Step_01
│   ├── Step_02
│   ├── Step_03
│   └── Platform_Top
└── --- Water Pool ---
    ├── WaterPool
    ├── PoolBorder_N
    ├── PoolBorder_S
    ├── PoolBorder_E
    └── PoolBorder_W
```

[截图：整理好的 Hierarchy 窗口]

### 5.9.10 最终效果

保存场景（`Cmd + S`），然后在 Scene 视图中欣赏你的第一个 3D 场景：

[截图：从斜上方俯瞰的完整游乐场场景，包含围墙、箱子、球体、柱子、阶梯和水池]

[截图：从摄像机视角（Game 视图）看到的场景效果]

---

## 5.10 添加简单的旋转动画脚本

让我们为场景添加一点生气，写一个简单的旋转脚本：

1. 在 Project 窗口中创建 `Scripts` 文件夹
2. 在 Scripts 文件夹中右键 > **Create > C# Script**
3. 命名为 `RotateObject`

```csharp
using UnityEngine;

/// <summary>
/// 让物体持续旋转的简单脚本
/// 将此脚本附加到任何 GameObject 上，物体就会持续旋转
/// </summary>
public class RotateObject : MonoBehaviour
{
    [Header("旋转设置")]
    [Tooltip("每秒绕各轴旋转的角度")]
    public Vector3 rotationSpeed = new Vector3(0f, 45f, 0f);
    // 默认绕 Y 轴每秒旋转 45 度

    [Tooltip("是否使用世界坐标轴")]
    public bool useWorldSpace = false;

    void Update()
    {
        // Time.deltaTime 确保帧率无关的恒定速度
        // 类似前端中 requestAnimationFrame 的 deltaTime
        if (useWorldSpace)
        {
            transform.Rotate(rotationSpeed * Time.deltaTime, Space.World);
        }
        else
        {
            transform.Rotate(rotationSpeed * Time.deltaTime, Space.Self);
        }
    }
}
```

**应用脚本：**

1. 选中 `Sphere_Accent` 球体
2. 在 Inspector 底部点击 **Add Component**
3. 搜索 `RotateObject` 并添加
4. 设置 Rotation Speed 为 (0, 90, 0) — 每秒旋转 90 度

同样给 `Sphere_Metal` 添加旋转脚本，设置 Rotation Speed 为 (15, 30, 0)。

[截图：为球体添加 RotateObject 组件后的 Inspector 面板]

按 **Play**（`Cmd + P`）运行场景，观察球体的旋转效果。

---

## 5.11 添加浮动效果脚本

```csharp
using UnityEngine;

/// <summary>
/// 让物体上下浮动的脚本
/// 使用正弦函数实现平滑的上下运动
/// </summary>
public class FloatObject : MonoBehaviour
{
    [Header("浮动设置")]
    [Tooltip("浮动幅度（上下移动的距离）")]
    public float amplitude = 0.5f;

    [Tooltip("浮动频率（速度）")]
    public float frequency = 1f;

    [Tooltip("浮动起始相位（偏移）")]
    public float phaseOffset = 0f;

    // 记录初始位置
    private Vector3 _startPosition;

    void Start()
    {
        // 记住初始位置
        _startPosition = transform.position;
    }

    void Update()
    {
        // 使用正弦函数实现平滑浮动
        // Mathf.Sin 返回 -1 到 1 的值
        // 乘以 amplitude 得到实际的位移量
        float yOffset = Mathf.Sin((Time.time + phaseOffset) * frequency * Mathf.PI * 2f) * amplitude;

        // 在初始位置基础上加上偏移
        transform.position = _startPosition + new Vector3(0f, yOffset, 0f);
    }
}
```

将此脚本添加到 `Sphere_Accent` 上，它就会一边旋转一边上下浮动，非常有活力。

---

## 5.12 Scene 视图导航技巧

在搭建场景的过程中，熟练操控 Scene 视图非常重要：

### 基础导航

| 操作 | Mac 快捷键 | 效果 |
|------|-----------|------|
| 旋转视角 | Option + 左键拖动 | 围绕中心旋转 |
| 平移视图 | Option + 中键拖动 / 双指拖动 | 平移 |
| 缩放 | 滚轮 / 双指捏合 | 拉近拉远 |
| 聚焦物体 | 选中物体后按 F | 快速定位到选中物体 |
| 飞行模式 | 右键 + WASD | 像游戏一样自由移动 |

### 视图快捷方式

在 Scene 视图右上角有一个坐标轴小部件（Scene Gizmo）：

[截图：Scene 视图右上角的 Gizmo 坐标轴]

- 点击 **X/Y/Z** 轴标签 — 切换到对应的正视/侧视/俯视图
- 点击中间的立方体 — 切换透视/正交视图
- 双击轴标签 — 切换到对面视图

---

## 5.13 常见问题排查

### 物体看不见？

1. **检查位置：** 物体可能在摄像机视野之外。选中物体按 `F` 聚焦
2. **检查 Scale：** Scale 可能是 (0, 0, 0)
3. **检查图层：** 物体可能在被隐藏的图层上
4. **检查 Renderer：** Mesh Renderer 组件可能被禁用

### 阴影看起来有锯齿？

1. 在 **Quality Settings**（Edit > Project Settings > Quality）中提高 Shadow Resolution
2. 将 Shadow Type 改为 **Soft Shadows**

### 场景太暗或太亮？

1. 检查 Directional Light 的 Intensity
2. 检查 Lighting 窗口中的 Ambient Light 设置
3. 检查材质的颜色是否正确

### Play Mode 中修改了参数但退出后消失了？

这是正常的。**Play Mode 中的修改不会保存。** 如果要保留修改：
1. 在 Play Mode 中，右键 Inspector 中的组件 > **Copy Component**
2. 退出 Play Mode
3. 右键组件 > **Paste Component Values**

---

## 练习题

### 练习 1：扩展场景
在现有场景中添加以下元素：
- 一个由 4 个圆柱体组成的拱门
- 一个 3x3 的箱子矩阵
- 给每个新物体应用合适的材质

### 练习 2：光照实验
- 删除所有现有光源
- 只使用点光源重新照亮场景（至少 3 个不同颜色的点光源）
- 观察不同位置和颜色的光源对场景氛围的影响
- 截图对比不同光照方案

### 练习 3：动态脚本
创建一个 `PulseScale` 脚本，让物体周期性地缩放（呼吸效果）：
- 使用 `Mathf.Sin` 实现平滑过渡
- 添加可调节的缩放幅度和频率参数
- 将脚本应用到多个物体上，设置不同的相位偏移

### 练习 4：摄像机角度
创建多个空 GameObject 作为"摄像机观察点"（Camera Point），分别设置不同的位置和角度。写一个脚本，按下数字键 1-4 时，摄像机平滑移动到对应观察点。

---

## 下一章预告

**第六章：第三人称角色控制器**

场景搭好了，但还缺少最重要的东西 —— 玩家！在下一章中，我们将：
- 安装 Unity 的新版 Input System
- 创建可控制的玩家角色
- 编写完整的第三人称移动脚本（WASD 移动、奔跑、跳跃）
- 使用 Cinemachine 实现专业的第三人称摄像机跟随
- 处理重力和地面检测

从静态场景迈入动态交互的世界！
