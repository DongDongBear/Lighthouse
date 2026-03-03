# 第二章：Unity 编辑器深度导览 —— 你的新 IDE

> **本章目标**
>
> - 熟悉 Unity Editor 的核心面板和功能
> - 掌握 Scene 视图的 3D 导航操作
> - 学会使用 Inspector 查看和修改组件属性
> - 了解 Project 窗口的资源管理方式
> - 掌握 Console 窗口的调试技巧
> - 学习 Hierarchy 窗口的场景组织方式
> - 自定义编辑器布局以提高效率
> - 建立 Unity Editor 与 Chrome DevTools / VS Code 的概念映射

> **预计学习时间：90 - 120 分钟**

---

## 2.1 编辑器总览：你的新 "IDE"

Unity Editor 不仅仅是一个代码编辑器 —— 它是一个**集成开发环境 + 可视化设计工具 + 运行时调试器**的综合体。

让我们先建立一个整体的认知映射：

```
Chrome DevTools + VS Code + Figma = Unity Editor

具体对应：
├── Scene View      ≈ Figma 画布 + Three.js Scene
├── Game View       ≈ Chrome 浏览器窗口（最终用户看到的）
├── Hierarchy       ≈ Chrome DevTools 的 Elements 面板（DOM 树）
├── Inspector       ≈ Chrome DevTools 的 Properties 面板 + React DevTools
├── Project Window  ≈ VS Code 的 File Explorer（文件浏览器）
├── Console         ≈ Chrome DevTools 的 Console 面板
├── Toolbar         ≈ Chrome DevTools 的顶部工具栏
└── Menu Bar        ≈ VS Code 的菜单栏
```

[截图：Unity Editor 完整界面，标注每个面板的名称和对应的 Web 工具]

### 2.1.1 默认布局

首次打开 Unity Editor，你会看到以下默认布局：

```
┌─────────────────────────────────────────────────────┐
│                    Menu Bar (菜单栏)                  │
├─────────────────────────────────────────────────────┤
│                    Toolbar (工具栏)                    │
├──────────┬──────────────────────┬───────────────────┤
│          │                      │                   │
│Hierarchy │    Scene View /      │    Inspector      │
│ (层级)    │    Game View         │    (检视器)       │
│          │    (场景/游戏视图)     │                   │
│          │                      │                   │
│          │                      │                   │
│          │                      │                   │
├──────────┴──────────────────────┴───────────────────┤
│              Project / Console                       │
│              (项目窗口 / 控制台)                       │
└─────────────────────────────────────────────────────┘
```

> **提示**：如果你不小心弄乱了布局，可以通过菜单 **Window → Layouts → Default** 恢复默认布局。

---

## 2.2 Scene View（场景视图）—— 你的 3D 画布

Scene View 是你花时间最多的地方。它是一个 3D/2D 可交互的视口，让你能够直接查看和编辑场景中的所有对象。

### 2.2.1 类比理解

```
Scene View ≈ Figma 的无限画布
           + Three.js 的 OrbitControls
           + Chrome DevTools 的元素选择器
```

在 Web 开发中，你用 CSS/HTML 来定义元素的位置和样式，然后在浏览器中预览。在 Unity 中，你在 Scene View 中**直接拖拽**对象来设置位置，**直接看到** 3D 世界的样子。

### 2.2.2 导航操作（极其重要）

花几分钟练习以下操作，直到它们成为肌肉记忆：

**基础导航：**

| 操作 | Mac 快捷键 | 说明 | Web 类比 |
|---|---|---|---|
| 环绕旋转 | `Option + 左键拖动` | 围绕焦点旋转视角 | Three.js OrbitControls |
| 平移 | `Option + 中键拖动` 或 `中键拖动` | 平行移动视角 | Figma 空格+拖动 |
| 缩放 | `滚轮` 或 `Option + 右键上下拖动` | 放大/缩小 | 浏览器 Cmd+/- |
| 飞行模式 | `右键 + WASD` | FPS 式自由移动 | 无直接类比 |
| 聚焦对象 | 选中对象后按 `F` | 将视角对准选中的对象 | 类似 "Scroll into view" |
| 快速聚焦 | 双击 Hierarchy 中的对象 | 快速定位到对象 | 双击 DOM 元素 |

[截图：Scene View 导航操作示意图，标注各个操作的手势]

**飞行模式（Flythrough）详解：**

这是 Scene View 最强大的导航方式，特别适合在大型 3D 场景中浏览：

1. 按住**右键**不放
2. 使用 **WASD** 键移动（就像玩 FPS 游戏）
   - W：前进
   - S：后退
   - A：左移
   - D：右移
   - Q：下降
   - E：上升
3. 移动**鼠标**来改变视角方向
4. 按住 **Shift** 可以加速移动
5. 滚动**滚轮**可以调整移动速度

```
飞行模式控制：
         W (前)
          ↑
    A (左) ← → D (右)
          ↓
         S (后)
    Q (下)  E (上)

    + 鼠标右键控制视角方向
    + Shift 加速
    + 滚轮调节速度
```

### 2.2.3 Gizmos（小工具）

Scene View 顶部有一些重要的控件：

[截图：Scene View 顶部工具栏，标注每个按钮]

```
Scene View 顶部工具栏:
┌──────────────────────────────────────────────────┐
│ [2D] [光照☀️] [音频🔊] [特效✨] [Gizmos] [搜索🔍] │
└──────────────────────────────────────────────────┘
```

- **2D / 3D 切换**：在 2D 和 3D 视图模式之间切换
- **光照模式**：切换场景是否显示光照效果
- **Audio**：是否在编辑时播放音频
- **Effects**：显示/隐藏天空盒、雾效等
- **Gizmos**：显示/隐藏辅助图标（如灯光图标、相机图标）

### 2.2.4 Scene Gizmo（场景方向指示器）

在 Scene View 的右上角，有一个坐标轴方向指示器：

```
      Y (绿色 = 上)
      │
      │
      └──── X (红色 = 右)
     /
    /
   Z (蓝色 = 前)
```

[截图：Scene View 右上角的 Scene Gizmo]

- 点击**任意轴**可以快速切换到正交视图（正面、顶部、侧面等）
- 点击**中心的立方体**可以在透视和正交投影之间切换
- 这对于精确放置对象非常有用

```
透视投影 (Perspective):
  有近大远小效果，更真实
  类似人眼看世界

正交投影 (Orthographic):
  没有透视效果，对象大小不随距离变化
  类似建筑图纸的视角
  适合精确对齐对象
```

### 2.2.5 Shading Mode（着色模式）

在 Scene View 的左上角，可以选择不同的显示模式：

| 模式 | 说明 | 用途 |
|---|---|---|
| Shaded | 完整光照渲染 | 默认模式，查看最终效果 |
| Wireframe | 线框模式 | 查看模型的三角面结构 |
| Shaded Wireframe | 光照 + 线框 | 同时查看模型和线框 |
| Shadow Cascades | 阴影级联 | 调试阴影系统 |
| Overdraw | 过度绘制 | 性能优化，查看像素重叠 |

[截图：Scene View 不同着色模式的对比效果]

---

## 2.3 Game View（游戏视图）—— 玩家看到的世界

### 2.3.1 类比理解

```
Game View ≈ 浏览器窗口（用户实际看到的页面）
Scene View ≈ Chrome DevTools 中看到的元素结构
```

Game View 显示的是**游戏运行时**玩家实际看到的画面，由场景中的**摄像机（Camera）** 渲染。

### 2.3.2 核心功能

[截图：Game View 的完整界面，标注各个控件]

**分辨率模拟：**

Game View 顶部的下拉菜单可以模拟不同设备的分辨率：

```
分辨率模拟选项:
├── Free Aspect          -- 自由比例（跟随窗口大小）
├── 16:9                 -- PC/主机常用
├── 16:10                -- Mac 显示器
├── iPhone 14 Pro        -- iOS 设备
├── iPhone 14 Pro Max
├── iPad Pro
├── Galaxy S23           -- Android 设备
├── Pixel 7
└── + 自定义分辨率       -- 可以添加任意分辨率
```

> 这类似于 Chrome DevTools 中的**设备模拟器（Device Mode）** —— 你可以模拟不同设备的屏幕来测试 UI 适配。

**其他控件：**

| 控件 | 说明 | Web 类比 |
|---|---|---|
| Scale 滑块 | 缩放 Game View 画面 | 浏览器缩放 Cmd+/- |
| Maximize on Play | 运行时最大化 Game View | F11 全屏 |
| Stats | 显示渲染统计信息 | Chrome Performance 面板 |
| Gizmos | 在 Game View 中显示辅助图标 | 类似 Debug 覆盖层 |

### 2.3.3 Stats 窗口

点击 Game View 右上角的 **Stats** 按钮，可以查看性能统计：

```
Stats 统计信息:
├── FPS (帧率)                    -- 目标 60 FPS
├── CPU: Main Thread              -- 主线程耗时
├── CPU: Render Thread            -- 渲染线程耗时
├── Batches                       -- 渲染批次（越少越好）
├── Saved by batching             -- 通过合批节省的次数
├── Tris (三角面数)               -- 屏幕上的三角形数量
├── Verts (顶点数)                -- 屏幕上的顶点数量
├── Screen Resolution             -- 实际渲染分辨率
├── SetPass Calls                 -- 着色器切换次数
└── Shadow Casters                -- 投射阴影的对象数量
```

[截图：Game View 的 Stats 面板展开状态]

> 类比 Web 开发：这类似于 Chrome DevTools 的 **Performance** 面板 + **Lighthouse** 的性能指标。在游戏开发中，我们追求的不是 LCP（最大内容绘制时间），而是**稳定的帧率**和**低渲染开销**。

---

## 2.4 Hierarchy 窗口 —— 你的 "DOM 树"

### 2.4.1 类比理解

```
Hierarchy ≈ Chrome DevTools 的 Elements 面板
           = 场景中所有 GameObject 的树状结构
```

就像 HTML 的 DOM 树一样，Unity 的 Hierarchy 显示了场景中所有 GameObject 的**父子层级关系**。

```html
<!-- HTML DOM 树 -->
<body>
  <div id="app">
    <header>
      <nav>...</nav>
    </header>
    <main>
      <section>...</section>
    </main>
  </div>
</body>
```

```
Unity Hierarchy:
Scene: SampleScene
├── Main Camera          (摄像机)
├── Directional Light    (平行光)
├── Environment          (空 GameObject 作为容器)
│   ├── Ground           (地面)
│   ├── Tree_01          (树 1)
│   ├── Tree_02          (树 2)
│   └── Rock_01          (石头)
├── Player               (玩家)
│   ├── PlayerModel      (玩家模型)
│   └── PlayerCamera     (跟随相机)
└── UI                   (UI 容器)
    ├── Canvas
    │   ├── HealthBar    (血条)
    │   └── Minimap      (小地图)
    └── EventSystem
```

### 2.4.2 核心操作

| 操作 | 方法 | Web 类比 |
|---|---|---|
| 创建对象 | 右键 → Create | `document.createElement()` |
| 删除对象 | 选中 → Delete 键 | `element.remove()` |
| 复制对象 | Cmd + D | `element.cloneNode(true)` |
| 设置父子关系 | 拖拽对象到另一个对象上 | `parent.appendChild(child)` |
| 重命名 | 选中 → 回车键 或 双击 | 修改 id/className |
| 搜索 | 顶部搜索框 | `querySelector()` |
| 排序 | 拖拽上下移动 | 改变 DOM 顺序 |
| 显示/隐藏 | 点击眼睛图标 | `display: none` |

[截图：Hierarchy 窗口，标注右键菜单和搜索框]

### 2.4.3 父子关系的重要性

在 Web 中，父子关系影响 CSS 继承和布局。在 Unity 中，父子关系影响 **Transform 变换的继承**：

```csharp
// 子对象的 Transform 是相对于父对象的
// 类似 CSS 的 position: relative / absolute

// 父对象在世界坐标 (10, 0, 0)
// 子对象的 localPosition 是 (2, 0, 0)
// 子对象的世界坐标 = 父对象坐标 + 自身局部坐标 = (12, 0, 0)

// 移动父对象时，所有子对象会跟着一起移动
// 就像在 CSS 中，移动一个 relative 容器，
// 里面所有 absolute 定位的子元素都会跟着动
```

### 2.4.4 创建空 GameObject 作为容器

就像在 HTML 中用 `<div>` 作为逻辑分组的容器一样，Unity 中常用**空 GameObject** 来组织场景结构：

```
HTML:
<div class="enemies">     <!-- 纯容器，无视觉效果 -->
  <div class="enemy">...</div>
  <div class="enemy">...</div>
</div>

Unity:
Enemies (空 GameObject)    <!-- 纯容器，无视觉效果 -->
├── Goblin_01
├── Goblin_02
└── Dragon_01
```

**创建方法**：Hierarchy 中右键 → **Create Empty**

> **命名建议**：使用清晰的分组命名，如 `--- Environment ---`（前后加破折号）来创建视觉分隔符。

### 2.4.5 多场景编辑

Unity 支持同时加载多个场景（Additive Scene Loading），在 Hierarchy 中会以缩进显示：

```
Hierarchy:
├── 📁 MainMenu (Scene)
│   ├── Canvas
│   └── EventSystem
└── 📁 GameWorld (Scene)
    ├── Terrain
    ├── Player
    └── NPCs
```

这类似于 Web 中的**微前端**或 **iframe** 的概念 —— 多个独立的"页面"可以同时存在。

---

## 2.5 Inspector 窗口 —— 你的 "Properties 面板 + React DevTools"

### 2.5.1 类比理解

```
Inspector ≈ Chrome DevTools 的 Styles/Properties 面板
          + React DevTools 的 Component Props/State 查看器
          + VS Code 的 Settings UI
```

Inspector 是 Unity 中最常用的面板之一。当你在 Hierarchy 或 Scene View 中选中一个 GameObject 后，Inspector 会显示该对象的所有组件及其属性。

[截图：Inspector 窗口显示一个 Cube 的完整信息，标注各个区域]

### 2.5.2 Inspector 的结构

```
Inspector 面板结构:
┌─────────────────────────────────────┐
│ ☑ Cube                    Tag: Untagged
│                           Layer: Default
├─────────────────────────────────────┤
│ ▼ Transform                         │
│   Position  X: 0   Y: 0   Z: 0     │
│   Rotation  X: 0   Y: 0   Z: 0     │
│   Scale     X: 1   Y: 1   Z: 1     │
├─────────────────────────────────────┤
│ ▼ Mesh Filter                       │
│   Mesh: Cube                        │
├─────────────────────────────────────┤
│ ▼ Mesh Renderer                     │
│   Materials: Default-Material       │
│   Shadows: On                       │
│   ...                               │
├─────────────────────────────────────┤
│ ▼ Box Collider                      │
│   Is Trigger: ☐                     │
│   Center: (0, 0, 0)                 │
│   Size: (1, 1, 1)                   │
├─────────────────────────────────────┤
│ ▼ Hello Unity (Script)              │
│   Player Name: "BellLab 开发者"      │
│   Rotation Speed: 50                │
├─────────────────────────────────────┤
│         [ Add Component ]           │
└─────────────────────────────────────┘
```

### 2.5.3 顶部区域

Inspector 顶部显示了 GameObject 的基本信息：

- **启用/禁用复选框**：类似 `element.style.display = 'none'`
- **名称**：GameObject 的名称
- **Static 复选框**：标记对象是否是静态的（用于烘焙光照和优化）
- **Tag**：标签，用于标识对象类型（如 "Player"、"Enemy"）
- **Layer**：层级，用于控制渲染和物理碰撞的分组

```csharp
// Tag 的使用方式（类似 HTML 的 class 或 data 属性）
// <div class="enemy" data-type="boss">

// Unity 中：
if (other.CompareTag("Player"))
{
    // 碰到了玩家
    Debug.Log("碰到了 Player！");
}

// 类似 Web 中的：
// if (element.classList.contains('player')) { ... }
// 或 if (element.dataset.type === 'player') { ... }
```

### 2.5.4 组件区域

每个组件在 Inspector 中都有一个可折叠的区域。重要特性：

**编辑属性值：**

| 属性类型 | Inspector 中的表现 | Web 类比 |
|---|---|---|
| float / int | 数字输入框（可拖动调整）| `<input type="number">` |
| string | 文本输入框 | `<input type="text">` |
| bool | 复选框 | `<input type="checkbox">` |
| Color | 颜色选择器 | `<input type="color">` |
| Vector3 | 三个数字输入框 (X, Y, Z) | 自定义的三字段输入 |
| Enum | 下拉菜单 | `<select>` |
| Object Reference | 拖拽槽 | React 的 prop 传递 |
| Array / List | 可展开列表 | 数组编辑器 |

[截图：Inspector 中不同类型属性的展示方式]

**数值拖动技巧：**

这是一个非常实用的功能 —— 你可以**拖动属性的标签文字**来调整数值：

```
Position X: [  3.5  ]
            ↑ 拖动这个 "X" 标签可以左右滑动调整数值
              按住 Shift 拖动 = 大步进
              按住 Cmd 拖动 = 小步进
```

这在调整对象位置、旋转、缩放时非常方便。

### 2.5.5 Add Component 按钮

Inspector 底部的 **"Add Component"** 按钮是添加组件的入口：

[截图：Add Component 菜单展开后的搜索界面]

```
Add Component 菜单:
├── 搜索框（输入组件名快速查找）
├── 内置组件
│   ├── Audio
│   ├── Effects
│   ├── Mesh
│   ├── Physics
│   ├── Rendering
│   └── UI
├── 自定义脚本
│   └── HelloUnity（我们的脚本）
└── New Script（直接创建新脚本）
```

### 2.5.6 Debug Mode

Inspector 右上角有一个下拉菜单，可以切换到 **Debug** 模式：

```
Inspector 模式:
├── Normal     -- 显示公开的属性，漂亮的 UI
└── Debug      -- 显示所有字段（包括私有的），原始数据
```

Debug 模式类似于 Chrome DevTools 中查看元素的**原始属性**而不是 Computed Styles。当你需要检查脚本内部状态时非常有用。

### 2.5.7 Lock Inspector（锁定）

Inspector 窗口右上角有一个**锁定**图标 🔒。点击它可以固定当前显示的对象，即使你在 Hierarchy 中选中了其他对象，Inspector 也不会切换。

这在需要同时查看两个对象属性时非常有用：
1. 锁定第一个 Inspector
2. **Window → General → Inspector** 打开第二个 Inspector 窗口
3. 在第二个 Inspector 中选择另一个对象

> 类似于在 Chrome DevTools 中固定一个元素的样式面板，同时查看另一个元素。

---

## 2.6 Project 窗口 —— 你的 "文件浏览器"

### 2.6.1 类比理解

```
Project Window ≈ VS Code 的 File Explorer（文件资源管理器）
              + npm 的 node_modules 浏览器
```

Project 窗口显示了你项目的 `Assets` 文件夹和 `Packages` 文件夹中的所有文件。

[截图：Project 窗口的完整界面，标注左侧文件夹树和右侧内容区域]

### 2.6.2 双面板布局

```
Project 窗口:
┌─────────────────┬─────────────────────────────┐
│ 📁 Assets        │                              │
│   📁 Scenes      │  [scene图标] SampleScene     │
│   📁 Scripts     │  [cs图标] HelloUnity.cs      │
│   📁 Materials   │                              │
│   📁 Prefabs     │  缩略图模式 或 列表模式      │
│                  │                              │
│ 📁 Packages      │  底部滑块控制图标大小         │
│   📁 URP         │                              │
│   📁 TextMesh... │                              │
└─────────────────┴─────────────────────────────┘
```

- **左侧面板**：文件夹树状结构（类似 Finder 的侧边栏）
- **右侧面板**：当前文件夹的内容（支持缩略图和列表两种显示模式）
- **底部滑块**：调整图标大小（缩略图模式下很有用，可以预览纹理和模型）
- **搜索框**：全局搜索资源（类似 VS Code 的 Cmd + P）

### 2.6.3 常用操作

| 操作 | 方法 | Web 类比 |
|---|---|---|
| 创建文件/文件夹 | 右键 → Create | VS Code 中新建文件 |
| 重命名 | 选中 → 回车 或 F2 | VS Code F2 重命名 |
| 删除 | 选中 → Delete | VS Code 删除文件 |
| 搜索 | 搜索框 或 Cmd + F | VS Code Cmd + P |
| 在 Finder 中打开 | 右键 → Show in Explorer | VS Code "Reveal in Finder" |
| 导入资源 | 直接从 Finder 拖入 | 拖拽文件到 VS Code |
| 创建预制体 | 从 Hierarchy 拖入 Project | 无直接类比 |

### 2.6.4 搜索功能

Project 窗口的搜索功能非常强大，支持**类型过滤器**：

```
搜索语法:
├── t:Script          -- 搜索所有脚本文件
├── t:Material        -- 搜索所有材质
├── t:Texture         -- 搜索所有纹理
├── t:Prefab          -- 搜索所有预制体
├── t:Scene           -- 搜索所有场景
├── t:AudioClip       -- 搜索所有音频文件
├── l:标签名           -- 按 Asset Label 搜索
└── 直接输入文件名    -- 模糊搜索
```

[截图：Project 窗口搜索框使用 t:Script 过滤的结果]

这类似于 VS Code 中的文件搜索，但增加了**资源类型**过滤能力。

### 2.6.5 资源导入

当你从外部拖入文件到 Project 窗口时，Unity 会自动**导入**并生成对应的 `.meta` 文件：

```
拖入一张 PNG 图片:
1. 文件被复制到 Assets/ 对应目录
2. Unity 生成 .meta 文件（包含导入设置和 GUID）
3. Unity 根据导入设置处理文件（压缩、格式转换等）
4. 处理后的结果缓存在 Library/ 文件夹中

类比 Web:
拖入一张图片到 public/ 文件夹
→ Webpack/Vite 的 loader 处理图片
→ 生成优化后的版本到 .next/ 或 dist/
```

> **重要**：永远通过 Unity Editor 来管理 Assets 文件夹中的文件（创建、移动、重命名、删除）。如果你直接在 Finder 中操作，可能会导致 `.meta` 文件不同步，引发引用丢失问题。

### 2.6.6 Favorites（收藏）

你可以把常用的文件夹或搜索条件添加到 Project 窗口左侧的 **Favorites** 区域：

1. 把文件夹从左侧面板**拖拽**到 Favorites 区域
2. 在搜索框中输入搜索条件后，点击搜索框右侧的 **★** 图标保存搜索

这类似于 VS Code 的书签功能或 Chrome 的收藏夹。

---

## 2.7 Console 窗口 —— 你的 "DevTools Console"

### 2.7.1 类比理解

```
Unity Console ≈ Chrome DevTools Console + VS Code Terminal Output
```

Console 窗口显示 Unity 引擎和你的脚本输出的所有消息。

[截图：Console 窗口显示不同类型的消息，标注过滤按钮]

### 2.7.2 消息类型

```csharp
// 信息（白色）—— 类似 console.log()
Debug.Log("这是一条普通信息");
Debug.Log($"玩家位置: {transform.position}");

// 警告（黄色）—— 类似 console.warn()
Debug.LogWarning("这是一条警告信息");

// 错误（红色）—— 类似 console.error()
Debug.LogError("这是一条错误信息");

// 也可以传入上下文对象，点击 Console 消息时会高亮该对象
Debug.Log("来自这个对象的消息", this.gameObject);
```

```typescript
// 对应的 JavaScript 方法:
console.log("普通信息");     // → Debug.Log()
console.warn("警告");        // → Debug.LogWarning()
console.error("错误");       // → Debug.LogError()
console.info("信息");        // → Debug.Log()
```

### 2.7.3 Console 工具栏

```
Console 工具栏:
┌──────────────────────────────────────────────────────┐
│ [Clear] [Collapse] [Clear on Play] [Error Pause]     │
│ [🔵 999] [⚠️ 5] [🔴 0]                     [搜索] │
└──────────────────────────────────────────────────────┘
```

| 按钮 | 说明 | 类比 |
|---|---|---|
| Clear | 清除所有消息 | Chrome Console 的 Clear 按钮 |
| Collapse | 合并相同消息（显示计数）| Chrome Console 的 Group Similar |
| Clear on Play | 每次进入 Play 模式时自动清除 | 无直接类比，但很实用 |
| Error Pause | 遇到错误时自动暂停游戏 | Chrome DevTools 的 "Pause on exceptions" |
| 消息类型过滤 | 按消息类型过滤显示 | Chrome Console 的 Log Level 过滤 |
| 搜索框 | 搜索消息内容 | Chrome Console 的 Filter |

### 2.7.4 高级调试技巧

**条件日志输出：**

```csharp
// 使用 Conditional 属性，Release 版本中自动移除
// 类似 Web 中只在 development 模式下才运行的代码
[System.Diagnostics.Conditional("UNITY_EDITOR")]
void DebugLog(string message)
{
    Debug.Log(message);
}

// 或者使用预处理指令（类似 process.env.NODE_ENV === 'development'）
#if UNITY_EDITOR
    Debug.Log("只在编辑器中显示");
#endif
```

**格式化输出：**

```csharp
// Unity 支持 Rich Text 格式（类似 CSS styled console.log）
Debug.Log("<color=red>红色文字</color>");
Debug.Log("<b>粗体</b> 和 <i>斜体</i>");
Debug.Log("<size=20>大字体</size>");
Debug.Log("<color=#00FF00>自定义颜色 (十六进制)</color>");

// 类比 Web 中的：
// console.log('%c红色文字', 'color: red');
// console.log('%c粗体', 'font-weight: bold');
```

**输出对象信息：**

```csharp
// 类似 console.dir() 或 JSON.stringify()
Debug.Log($"对象信息: name={gameObject.name}, " +
          $"position={transform.position}, " +
          $"childCount={transform.childCount}");

// 更高级：使用 JsonUtility
string json = JsonUtility.ToJson(myDataObject, prettyPrint: true);
Debug.Log(json);
```

### 2.7.5 Stack Trace（堆栈跟踪）

双击 Console 中的任何消息，可以查看完整的调用堆栈，并且可以跳转到对应的代码行。这和 Chrome DevTools 中点击 Console 消息右侧的文件链接是一样的。

[截图：Console 消息的堆栈跟踪信息]

---

## 2.8 Toolbar（工具栏）

### 2.8.1 变换工具

Unity 工具栏左侧的变换工具用于在 Scene View 中操作对象：

```
工具栏:
┌───────────────────────────────────────────────────────────┐
│ [Q] [W] [E] [R] [T] [Y]  │  [▶ ⏸ ⏭]  │  [其他控件]    │
│ 手  移  旋  缩  矩  自    │  播 暂 步进  │               │
│ 型  动  转  放  形  定义   │  放 停      │               │
└───────────────────────────────────────────────────────────┘
```

每个工具的快捷键和用途：

| 快捷键 | 工具 | 说明 | CSS 类比 |
|---|---|---|---|
| Q | Hand (手型) | 拖拽平移 Scene View | 无（纯导航用） |
| W | Move (移动) | 移动选中对象 | `transform: translate()` |
| E | Rotate (旋转) | 旋转选中对象 | `transform: rotate()` |
| R | Scale (缩放) | 缩放选中对象 | `transform: scale()` |
| T | Rect (矩形) | 2D 矩形变换工具 | 类似调整 `width/height` |
| Y | Transform (组合) | 同时显示移动+旋转+缩放 | 组合变换 |

[截图：Scene View 中选中对象时显示的各种变换 Gizmo（移动箭头、旋转圆环、缩放方块）]

**移动工具 (W) 详解：**

选中对象后按 W，会出现三个箭头（对应 X、Y、Z 轴）和三个平面操作区域：

```
      Y (绿色箭头，向上)
      │
      │  ┌───┐ YZ 平面
      │  │   │
      └──┘───── X (红色箭头，向右)
     /
    / ┌───┐ XZ 平面
   Z (蓝色箭头，向前)

- 拖拽箭头：沿单轴移动
- 拖拽平面区域：沿两轴移动
- 拖拽中心方块：自由移动
- 按住 Cmd + 拖拽：吸附到网格
```

**旋转工具 (E) 详解：**

```
三个同心圆环：
- 红色圆环：绕 X 轴旋转
- 绿色圆环：绕 Y 轴旋转
- 蓝色圆环：绕 Z 轴旋转
- 外围白色圆环：绕屏幕方向旋转
```

### 2.8.2 播放控制

工具栏中央的播放控制按钮：

```
[▶ Play]  [⏸ Pause]  [⏭ Step]
```

| 按钮 | 快捷键 | 说明 |
|---|---|---|
| Play ▶ | Cmd + P | 进入/退出游戏运行模式 |
| Pause ⏸ | Cmd + Shift + P | 暂停/继续游戏 |
| Step ⏭ | Cmd + Option + P | 单步执行一帧（暂停时） |

> **单步执行**在调试时非常有用 —— 你可以一帧一帧地观察游戏状态的变化。这类似于 Chrome DevTools 中的 **Step Over** 调试功能，但这里的"一步"是一帧。

### 2.8.3 Pivot vs Center / Local vs Global

工具栏还有两组切换按钮：

```
[Pivot | Center]    [Local | Global]
```

**Pivot vs Center：**
- **Pivot**：变换操作围绕对象的**轴心点**（原点）
- **Center**：变换操作围绕对象的**几何中心**

```
Pivot 模式（默认）:
  旋转/缩放围绕模型设定的原点
  适合：角色（原点在脚底）

Center 模式:
  旋转/缩放围绕模型的几何中心
  适合：大多数情况
```

**Local vs Global：**
- **Local**：操作轴跟随对象自身的旋转方向
- **Global**：操作轴始终与世界坐标系对齐

```csharp
// Local 坐标系（对象自身的前方）
// 如果对象旋转了 45 度，Z 轴也跟着旋转 45 度
transform.Translate(Vector3.forward * 1f);  // 沿对象自身的前方移动

// Global 坐标系（世界的 Z 轴方向）
// 不管对象怎么旋转，方向都一样
transform.Translate(Vector3.forward * 1f, Space.World);  // 沿世界的 Z 轴移动
```

---

## 2.9 快捷键速查表

掌握快捷键可以大幅提高开发效率。以下是最常用的快捷键：

### 2.9.1 通用快捷键

| 快捷键 | 功能 | Web 类比 |
|---|---|---|
| Cmd + S | 保存场景 | 保存文件 |
| Cmd + Z | 撤销 | 撤销 |
| Cmd + Shift + Z | 重做 | 重做 |
| Cmd + D | 复制选中对象 | 复制元素 |
| Delete / Backspace | 删除选中对象 | 删除元素 |
| Cmd + P | 播放/停止游戏 | 无 |
| Cmd + Shift + P | 暂停游戏 | 无 |
| F | 聚焦选中对象（Scene View） | 无 |
| Cmd + F | 在窗口中搜索 | 搜索 |

### 2.9.2 Scene View 快捷键

| 快捷键 | 功能 |
|---|---|
| Q | 手型工具（平移视角） |
| W | 移动工具 |
| E | 旋转工具 |
| R | 缩放工具 |
| T | 矩形工具 |
| Y | 组合变换工具 |
| F | 聚焦选中对象 |
| Option + 左键拖动 | 环绕旋转 |
| 中键拖动 | 平移 |
| 滚轮 | 缩放 |
| 右键 + WASD | 飞行模式 |

### 2.9.3 Hierarchy 快捷键

| 快捷键 | 功能 |
|---|---|
| Cmd + D | 复制对象 |
| Cmd + Shift + D | 复制对象（包括组件设置） |
| F2 | 重命名 |
| Delete | 删除 |
| Cmd + 上/下 | 移动对象在层级中的位置 |

### 2.9.4 自定义快捷键

你可以通过 **Edit → Shortcuts** 来自定义快捷键映射，就像在 VS Code 中通过 `keybindings.json` 自定义快捷键一样。

[截图：Unity Shortcuts Manager 窗口]

---

## 2.10 自定义编辑器布局

### 2.10.1 拖拽窗口

Unity 的面板系统非常灵活，你可以：

1. **拖拽面板标题**到其他位置（类似 VS Code 的面板拖拽）
2. **添加新面板**：Window 菜单中选择需要的面板
3. **Tab 合并**：把面板拖到另一个面板的标题栏区域，合并为选项卡
4. **独立窗口**：把面板拖到编辑器外部，成为浮动窗口

### 2.10.2 推荐布局

**双屏推荐布局：**

```
主屏幕:
┌──────────┬──────────────────────────┬──────────────┐
│Hierarchy │      Scene View          │  Inspector   │
│          │                          │              │
│          │                          │              │
│          ├──────────────────────────┤              │
│          │      Game View           │              │
│          │                          │              │
├──────────┴──────────────────────────┴──────────────┤
│                   Project                          │
└────────────────────────────────────────────────────┘

副屏幕:
┌──────────────────────────────────────────────────┐
│                   VS Code                        │
│                                                  │
├──────────────────────────────────────────────────┤
│              Console (浮动窗口)                   │
└──────────────────────────────────────────────────┘
```

**单屏推荐布局（适合笔记本）：**

```
┌──────────┬──────────────────────────┬──────────┐
│Hierarchy │   Scene View / Game View │Inspector │
│          │   (Tab 切换)              │          │
│          │                          │          │
│          │                          │          │
│          │                          │          │
├──────────┴──────────────────────────┼──────────┤
│        Project / Console (Tab 切换)  │ 缩小的   │
│                                      │Inspector │
└──────────────────────────────────────┴──────────┘
```

### 2.10.3 保存布局

配置好满意的布局后：

1. 点击右上角的 **Layout 下拉菜单**（默认显示 "Default"）
2. 选择 **"Save Layout..."**
3. 输入一个名称，如 "BellLab 开发布局"

之后你可以随时通过这个下拉菜单切换不同的布局。

[截图：Layout 下拉菜单，显示保存和切换选项]

### 2.10.4 内置布局预设

Unity 内置了几种布局预设：

| 布局名 | 适用场景 |
|---|---|
| Default | 通用开发 |
| 2 by 3 | 双列布局，适合宽屏 |
| 4 Split | 四视图（前、顶、侧、透视），适合精确建模 |
| Tall | 竖屏优化 |
| Wide | 宽屏优化 |

可以通过 **Window → Layouts** 切换预设布局。

---

## 2.11 其他重要窗口

### 2.11.1 Package Manager（包管理器）

路径：**Window → Package Manager**

```
Package Manager ≈ npm 的 GUI 版本
```

[截图：Package Manager 窗口界面]

你可以在这里：
- 浏览和安装 Unity 官方包
- 管理已安装的包及其版本
- 添加来自 Git URL 的第三方包
- 查看包的文档和更新日志

**常用的 Unity 包：**

| 包名 | 用途 | Web 类比 |
|---|---|---|
| Universal RP | 渲染管线 | 渲染框架 |
| Input System | 新版输入系统 | 事件处理库 |
| Cinemachine | 智能相机系统 | 无 |
| TextMeshPro | 高级文本渲染 | 字体/排版库 |
| Addressables | 异步资源加载 | 动态 import() |
| ProBuilder | 内建 3D 建模工具 | 无 |

### 2.11.2 Animation 窗口

路径：**Window → Animation → Animation**

用于创建和编辑关键帧动画，类似于 CSS `@keyframes` 的可视化编辑器。

### 2.11.3 Animator 窗口

路径：**Window → Animation → Animator**

用于创建动画状态机 —— 管理不同动画之间的过渡关系。例如：

```
Idle → Walk → Run → Jump → Idle
              ↓
            Attack
```

### 2.11.4 Profiler（性能分析器）

路径：**Window → Analysis → Profiler**

```
Profiler ≈ Chrome DevTools Performance 面板
```

用于分析游戏的 CPU、GPU、内存、渲染等性能指标。这是优化游戏性能时最重要的工具。

### 2.11.5 Frame Debugger（帧调试器）

路径：**Window → Analysis → Frame Debugger**

可以一步一步查看 Unity 渲染一帧画面的每个步骤 —— 类似于 Chrome DevTools 的 **Paint Profiler**，但更加详细。

---

## 2.12 编辑器与 Web 工具的完整对照表

| Unity Editor 功能 | Web 开发工具 | 具体对应 |
|---|---|---|
| Scene View | Three.js 场景预览 | 3D 场景的实时编辑 |
| Game View | 浏览器窗口 | 最终用户看到的效果 |
| Hierarchy | Elements 面板 | 对象/元素的树状结构 |
| Inspector | Properties 面板 | 属性的查看和编辑 |
| Project Window | VS Code Explorer | 文件和资源管理 |
| Console | Console 面板 | 日志输出和调试 |
| Profiler | Performance 面板 | 性能分析 |
| Frame Debugger | Paint Profiler | 渲染过程分析 |
| Package Manager | npm / yarn GUI | 依赖包管理 |
| Asset Store | npm registry | 第三方资源/包市场 |
| Play Mode | `npm start` / Dev Server | 运行应用 |
| Build Settings | `npm build` 配置 | 构建和打包 |
| Player Settings | 各种 config 文件 | 项目全局配置 |
| Shortcuts Manager | keybindings.json | 快捷键配置 |
| Layout System | VS Code 的面板系统 | UI 布局自定义 |

---

## 2.13 本章练习

### 练习 1：Scene View 导航训练

1. 在场景中创建以下对象（Hierarchy → 右键 → 3D Object）：
   - 1 个 Cube（立方体）
   - 1 个 Sphere（球体）
   - 1 个 Cylinder（圆柱体）
   - 1 个 Plane（平面，作为地面）

2. 使用以下操作定位每个对象：
   - 使用 **W**（移动工具）把 Sphere 放到 Cube 上面
   - 使用 **E**（旋转工具）把 Cylinder 旋转 45 度
   - 使用 **R**（缩放工具）把 Plane 放大 5 倍
   - 使用 **F** 键聚焦到每个对象

3. 练习以下导航操作各 10 次：
   - 环绕旋转（Option + 左键拖动）
   - 平移（中键拖动）
   - 缩放（滚轮）
   - 飞行模式（右键 + WASD）

### 练习 2：Inspector 探索

1. 选中上面创建的 Cube
2. 在 Inspector 中：
   - 修改 Position 为 (2, 1, 3)
   - 修改 Rotation 为 (0, 45, 0)
   - 修改 Scale 为 (1, 2, 1)
3. 观察 Cube 的变化
4. 尝试拖动 Position 的 X 标签来滑动调整数值
5. 切换 Inspector 到 Debug 模式，观察显示的内容有什么不同

### 练习 3：Hierarchy 组织

创建以下层级结构：

```
SampleScene
├── --- Environment ---      (Create Empty, 重命名)
│   ├── Ground               (已存在的 Plane)
│   ├── Props                (Create Empty)
│   │   ├── Cube
│   │   └── Sphere
│   └── Structures           (Create Empty)
│       └── Cylinder
├── --- Characters ---       (Create Empty)
│   └── Player               (Create Empty)
├── --- Lighting ---         (Create Empty)
│   ├── Directional Light    (已存在)
│   └── Point Light          (Light → Point Light)
└── --- Cameras ---          (Create Empty)
    └── Main Camera          (已存在)
```

提示：通过**拖拽**对象到其他对象上来建立父子关系。

### 练习 4：Console 调试

1. 创建一个新脚本 `DebugPractice.cs`
2. 编写以下代码：

```csharp
using UnityEngine;

public class DebugPractice : MonoBehaviour
{
    void Start()
    {
        // 练习不同类型的日志输出
        Debug.Log("普通信息：游戏启动");
        Debug.LogWarning("警告：这是一条测试警告");
        Debug.LogError("错误：这是一条测试错误");

        // Rich Text 格式
        Debug.Log("<color=cyan><b>BellLab</b></color> 调试系统已启动");

        // 输出对象信息
        Debug.Log($"对象名称: {gameObject.name}");
        Debug.Log($"对象位置: {transform.position}");
        Debug.Log($"对象标签: {gameObject.tag}");
        Debug.Log($"组件数量: {GetComponents<Component>().Length}");
    }

    void Update()
    {
        // 只在按下特定键时输出（避免刷屏）
        if (Input.GetKeyDown(KeyCode.L))
        {
            Debug.Log($"[{Time.frameCount}] 当前帧数: {Time.frameCount}, " +
                      $"运行时间: {Time.time:F2}秒");
        }
    }
}
```

3. 将脚本挂载到任意 GameObject 上
4. 运行游戏，观察 Console 输出
5. 练习使用 Console 的过滤器（只显示 Warning、只显示 Error 等）
6. 练习使用 Collapse 功能
7. 尝试搜索特定的消息内容

### 练习 5：自定义布局

1. 把 Scene View 和 Game View 并排放置（而不是 Tab 切换）
2. 把 Console 从 Project 的 Tab 中独立出来，放到 Inspector 下方
3. 尝试 Window → Layouts 中的不同预设布局
4. 创建你自己喜欢的布局并保存为 "My Layout"

---

## 2.14 下一章预告

在下一章 **《第 03 章：GameObject 与 Component 系统》** 中，我们将深入 Unity 最核心的概念：

- 什么是 GameObject？它和 DOM Element 有什么异同？
- Transform 组件详解 —— 3D 世界中的位置、旋转、缩放
- 如何添加和移除组件？
- Prefab 系统 —— 可复用的 "组件模板"
- 父子关系的深层理解
- 标签（Tag）和层级（Layer）系统

这将是你理解 Unity 架构的基石章节，请确保本章的操作都已经熟练掌握后再继续。

---

> **本章小结**
>
> 在本章中，我们对 Unity Editor 的每个核心面板都进行了深入了解。通过与 Chrome DevTools、VS Code、Figma 等 Web 工具的类比，我们建立了直觉性的概念映射。
>
> 最关键的收获是：
> 1. Scene View 的导航操作（环绕、平移、缩放、飞行模式）
> 2. Inspector 是查看和修改组件属性的核心面板
> 3. Hierarchy 是场景中的 "DOM 树"
> 4. Console 是调试利器，善用 Debug.Log 及其变体
> 5. 自定义布局可以大幅提升开发效率
>
> Unity Editor 是一个需要"手感"的工具 —— 知道功能在哪里很重要，但更重要的是形成肌肉记忆。请务必完成本章的所有练习。
