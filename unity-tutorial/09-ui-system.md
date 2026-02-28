# 第 09 章：UI 系统

> **前端类比**：如果你是 React/Vue 开发者，Unity 的 UI 系统会让你感到既熟悉又陌生。Canvas 像是 `<div id="app">`，RectTransform 像是 CSS 的 `position: absolute` + Flexbox 的混合体，而锚点（Anchors）系统本质上就是响应式布局方案。好消息是：你的 CSS 布局直觉在这里非常有用。

---

## 本章目标

完成本章后，你将能够：

1. 理解 Canvas 的三种渲染模式及其适用场景
2. 配置 Canvas Scaler 实现移动端多分辨率适配
3. 掌握 RectTransform 的锚点（Anchors）和枢轴（Pivot）系统
4. 使用 TextMeshPro 渲染高质量文字
5. 使用各种 UI 元素（Button、Slider、Toggle、ScrollView、InputField）
6. 使用 Layout Group 实现自动布局
7. 创建一个完整的生命值血条（HealthBar）
8. 创建一个功能完善的主菜单（MainMenu）
9. 创建一个游戏内 HUD 界面（HUDManager）
10. 处理 UI 交互事件
11. 实现简单的 UI 动画效果

## 预计学习时间

**6 小时**（理论 2 小时 + 实操 4 小时）

---

## 9.1 Canvas：UI 的根容器

### 9.1.1 Canvas 是什么

Canvas（画布）是所有 UI 元素的根容器。**任何 UI 元素都必须是 Canvas 的子物体**，否则不会被渲染。

> 💡 **前端类比**：Canvas 就像 HTML 中的 `<body>` 标签或 React 的根 `<div id="root">`——所有可见的 UI 元素都必须在它里面。

**创建 Canvas：**
1. 在 Hierarchy 窗口右键 → `UI` → `Canvas`
2. Unity 会自动创建：
   - **Canvas** GameObject（带 Canvas、Canvas Scaler、Graphic Raycaster 组件）
   - **EventSystem** GameObject（处理 UI 输入事件，类似 DOM 事件系统）

[截图：新创建的 Canvas 和 EventSystem 在 Hierarchy 中的显示]

### 9.1.2 三种渲染模式

| 渲染模式 | 说明 | 前端类比 | 适用场景 |
|----------|------|----------|----------|
| Screen Space - Overlay | UI 覆盖在画面最顶层，不受相机影响 | `position: fixed; z-index: 9999` | HUD、血条、菜单 |
| Screen Space - Camera | UI 在指定相机前方渲染，可被 3D 物体遮挡 | `position: fixed` 但在特定层 | 需要后处理效果的 UI |
| World Space | UI 在 3D 世界中，有位置和大小 | `position: absolute` 在 3D 空间中 | NPC 头顶血条、3D 交互面板 |

[截图：三种渲染模式的视觉对比效果]

**Screen Space - Overlay（最常用）：**
```
┌──────────────────────────────┐
│  3D 游戏场景                   │
│  ┌──────────────────────────┐│
│  │                          ││
│  │    角色、地形、天空       ││
│  │                          ││
│  └──────────────────────────┘│
│                              │
│  ═══════ UI 覆盖层 ═════════ │  ← Canvas (Overlay)
│  [HP ████████░░] [金币: 500] │
│                     [小地图]  │
└──────────────────────────────┘
```

**World Space 示例——NPC 头顶名称：**
```
          [Lv.5 铁匠 NPC]     ← World Space Canvas
               │
          ┌────┴────┐
          │  NPC 模型 │
          └──────────┘
```

### 9.1.3 设置渲染模式

```csharp
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Canvas 渲染模式设置示例
/// </summary>
public class CanvasSetupDemo : MonoBehaviour
{
    void SetupOverlayCanvas()
    {
        Canvas canvas = GetComponent<Canvas>();
        // 最常用：覆盖模式，UI 始终在最顶层
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        // 排序顺序：数字越大越靠前（类似 z-index）
        canvas.sortingOrder = 10;
    }

    void SetupCameraCanvas()
    {
        Canvas canvas = GetComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceCamera;
        // 指定渲染相机
        canvas.worldCamera = Camera.main;
        // UI 到相机的距离
        canvas.planeDistance = 10f;
    }

    void SetupWorldSpaceCanvas()
    {
        Canvas canvas = GetComponent<Canvas>();
        canvas.renderMode = RenderMode.WorldSpace;
        // World Space Canvas 的 RectTransform 可以像普通 3D 物体一样定位
        RectTransform rt = canvas.GetComponent<RectTransform>();
        rt.sizeDelta = new Vector2(2f, 0.5f); // 世界单位大小
    }
}
```

---

## 9.2 Canvas Scaler：移动端适配

### 9.2.1 为什么需要 Canvas Scaler

手机屏幕尺寸千差万别：iPhone SE (4.7")、iPhone 15 Pro Max (6.7")、iPad Pro (12.9")。Canvas Scaler 确保 UI 在所有设备上看起来一致。

> 💡 **前端类比**：Canvas Scaler 就像 CSS 中的 `viewport meta` 标签 + `rem` 单位 + 媒体查询的组合。它解决的问题和前端响应式设计完全一样。

### 9.2.2 三种缩放模式

| 模式 | 说明 | 适用 |
|------|------|------|
| Constant Pixel Size | 固定像素大小，不随屏幕缩放 | PC 游戏 |
| Scale With Screen Size | 根据屏幕大小缩放（推荐手游） | 手游 |
| Constant Physical Size | 固定物理尺寸（英寸/厘米） | 需要精确物理尺寸的 UI |

### 9.2.3 手游推荐配置

**Scale With Screen Size 详细设置：**

[截图：Canvas Scaler 组件的 Inspector 面板，标注各参数]

```
Canvas Scaler 推荐设置（手游）：
┌─────────────────────────────────────┐
│ UI Scale Mode: Scale With Screen Size│
│                                     │
│ Reference Resolution: 1080 x 1920  │  ← 基准分辨率（竖屏手游）
│                                     │     或 1920 x 1080（横屏手游）
│ Screen Match Mode: Match Width Or   │
│                    Height           │
│                                     │
│ Match: ◀━━━━━━━●━━━━▶              │  ← 0.5 = 宽高均衡匹配
│        Width(0)    Height(1)        │     手游横屏推荐 0.5
│                                     │     手游竖屏推荐 1 (Match Height)
│                                     │
│ Reference Pixels Per Unit: 100      │  ← 每个 Unity 单位对应的像素数
└─────────────────────────────────────┘
```

**Match 值的含义：**

```
Match = 0（Match Width）：
  宽度不变，高度自适应
  → 适合横向滚动的游戏

Match = 1（Match Height）：
  高度不变，宽度自适应
  → 适合竖屏手游

Match = 0.5（平衡）：
  宽高同时缩放
  → 最常用的手游设置

前端对比：
  Match = 0  ≈  width: 100vw; height: auto;
  Match = 1  ≈  width: auto; height: 100vh;
  Match = 0.5 ≈ min(100vw, 100vh) 的平衡缩放
```

> 🎯 **最佳实践**：手游（横屏）推荐 Reference Resolution 设为 `1920 x 1080`，Match 设为 `0.5`。这样在大多数手机上都能有良好的显示效果。

---

## 9.3 RectTransform：UI 布局核心

### 9.3.1 RectTransform vs Transform

| 属性 | Transform（3D） | RectTransform（UI） |
|------|-----------------|-------------------|
| 位置 | Position (x,y,z) | Anchored Position (x,y) |
| 大小 | 无原生大小概念 | Size Delta (width, height) |
| 旋转 | Rotation (x,y,z) | Rotation (主要用 z) |
| 缩放 | Scale (x,y,z) | Scale (x,y,z) |
| 特有 | — | Anchors, Pivot, Offsets |

> 💡 **前端类比**：RectTransform 相当于 CSS 的 `position`、`top/right/bottom/left`、`width/height`、`transform-origin` 的综合体。

### 9.3.2 锚点（Anchors）系统

锚点决定了 UI 元素如何相对于父容器定位——这是 Unity UI 最重要也最容易混淆的概念。

```
锚点位置示意图（父容器内的 4 个锚点）：

  Anchor Min (x,y)           Anchor Max (x,y)
  左下角                     右上角
     ▼                          ▼
  ┌──●━━━━━━━━━━━━━━━━━━━━━━●──┐
  │  ┃                      ┃  │
  │  ┃    UI 元素            ┃  │  ← 父容器
  │  ┃                      ┃  │
  │  ●━━━━━━━━━━━━━━━━━━━━━━●  │
  └────────────────────────────┘
     ▲                          ▲
  Anchor Min                 Anchor Max

当 Anchor Min = Anchor Max 时：
  锚点合并为一个点 → UI 元素有固定大小，位置相对于锚点
  类似 CSS: position: absolute; 相对于某个点定位

当 Anchor Min ≠ Anchor Max 时：
  锚点展开为区域 → UI 元素随父容器拉伸
  类似 CSS: position: absolute; top: 0; left: 0; right: 0; bottom: 0;
```

### 9.3.3 常用锚点预设

在 Inspector 中点击 RectTransform 左上角的锚点预设按钮：

[截图：Anchor Presets 弹出面板，展示所有预设选项]

| 预设 | 效果 | CSS 等价 |
|------|------|----------|
| 左上角 | 固定在左上角 | `top: 0; left: 0;` |
| 中心 | 固定在中心 | `top: 50%; left: 50%; transform: translate(-50%, -50%)` |
| 拉伸（全屏） | 填满父容器 | `top: 0; left: 0; right: 0; bottom: 0;` |
| 顶部拉伸 | 顶部横向拉伸 | `top: 0; left: 0; right: 0; height: Xpx;` |
| 左侧拉伸 | 左侧纵向拉伸 | `top: 0; left: 0; bottom: 0; width: Xpx;` |

> ⚠️ **注意**：按住 `Alt` 键点击预设会同时设置 Pivot 和 Position；按住 `Shift` 键点击预设会同时设置 Pivot。初学时建议先不按修饰键，单独理解每个概念。

### 9.3.4 枢轴（Pivot）

Pivot 是 UI 元素的旋转和缩放中心点，也影响定位参考点。

```
Pivot 位置示例：

Pivot (0, 0) 左下角：        Pivot (0.5, 0.5) 中心：      Pivot (1, 1) 右上角：
┌──────────┐                ┌──────────┐                ┌──────────┐
│          │                │          │                │          │
│          │                │    ●     │                │          ●
●          │                │          │                │          │
└──────────┘                └──────────┘                └──────────┘
旋转和缩放以左下角为中心      旋转和缩放以中心为中心         旋转和缩放以右上角为中心

前端类比：Pivot 就是 CSS 的 transform-origin
  Pivot (0, 0) = transform-origin: left bottom;
  Pivot (0.5, 0.5) = transform-origin: center center;
  Pivot (1, 1) = transform-origin: right top;
```

### 9.3.5 代码中操作 RectTransform

```csharp
using UnityEngine;

/// <summary>
/// RectTransform 常用操作示例
/// 类比前端：类似用 JS 操作 element.style
/// </summary>
public class RectTransformDemo : MonoBehaviour
{
    void Start()
    {
        RectTransform rt = GetComponent<RectTransform>();

        // 设置锚点位置（相对于锚点的偏移）
        // 类似 CSS: left: 100px; top: 50px;
        rt.anchoredPosition = new Vector2(100f, 50f);

        // 设置大小（当锚点合并时，sizeDelta = 实际大小）
        // 类似 CSS: width: 200px; height: 100px;
        rt.sizeDelta = new Vector2(200f, 100f);

        // 设置锚点（归一化坐标，0-1 范围）
        // 锚点合并在中心 = 相对于父容器中心定位
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);

        // 设置枢轴
        rt.pivot = new Vector2(0.5f, 0.5f);

        // 使用 offsetMin 和 offsetMax 设置边距（当锚点拉伸时更直观）
        // offsetMin = (left, bottom) 边距
        // offsetMax = (-right, -top) 边距（注意负号！）
        // 类似 CSS: padding: 10px 20px;
        rt.offsetMin = new Vector2(20f, 10f);    // left: 20, bottom: 10
        rt.offsetMax = new Vector2(-20f, -10f);  // right: 20, top: 10
    }

    /// <summary>
    /// 将 UI 元素的锚点设为全屏拉伸
    /// 等价于 CSS: position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    /// </summary>
    void SetFullStretch(RectTransform rt)
    {
        rt.anchorMin = Vector2.zero;     // (0, 0)
        rt.anchorMax = Vector2.one;      // (1, 1)
        rt.offsetMin = Vector2.zero;     // 无边距
        rt.offsetMax = Vector2.zero;     // 无边距
    }
}
```

---

## 9.4 UI 元素详解

### 9.4.1 Text / TextMeshPro

**旧版 Text（不推荐）：**
- 基于位图字体渲染，放大会模糊
- 功能有限

**TextMeshPro（推荐）：**
- 基于 SDF（Signed Distance Field）渲染，任意缩放都清晰
- 支持富文本、样式、材质效果

> 💡 **前端类比**：旧版 Text 类似用 `<img>` 渲染文字（位图），TextMeshPro 类似用 SVG 或矢量字体——缩放不失真。

**首次使用 TMP 的设置：**
1. 菜单 → `Window` → `TextMeshPro` → `Import TMP Essential Resources`
2. 这会导入默认的 SDF 字体和着色器

[截图：Import TMP Essential Resources 的弹窗]

**创建 TMP 文本：**
1. Hierarchy → 右键 → `UI` → `Text - TextMeshPro`
2. 在 Inspector 中设置：

```
TextMeshPro 常用属性：
┌──────────────────────────────────────┐
│ Text Input: "你好，Unity！"           │  ← 文本内容
│                                      │
│ Font Asset: NotoSansSC-Regular SDF   │  ← SDF 字体资源
│ Font Size: 36                        │  ← 字号
│ Font Style: B I U S                  │  ← 粗体/斜体/下划线/删除线
│                                      │
│ Vertex Color: #FFFFFF                │  ← 文字颜色
│ Color Gradient: ☐                    │  ← 渐变色
│                                      │
│ Alignment: ◀ ● ▶   ▲ ● ▼           │  ← 水平/垂直对齐
│                                      │
│ Overflow: Overflow / Ellipsis /      │  ← 溢出处理
│           Truncate / Page            │     类似 CSS text-overflow
│                                      │
│ Rich Text: ☑                         │  ← 富文本支持
└──────────────────────────────────────┘
```

**TMP 富文本标签（类似 HTML）：**

| TMP 标签 | HTML 等价 | 效果 |
|----------|-----------|------|
| `<b>粗体</b>` | `<strong>` | 粗体 |
| `<i>斜体</i>` | `<em>` | 斜体 |
| `<color=#FF0000>红色</color>` | `<span style="color:red">` | 颜色 |
| `<size=48>大字</size>` | `<span style="font-size:48px">` | 字号 |
| `<sprite index=0>` | `<img>` | 内联图片（Sprite Asset） |
| `<link="id">链接</link>` | `<a href>` | 可点击链接 |

### 9.4.2 Image

Image 组件用于显示 2D 图片（Sprite）。

```
Image 类型：
┌─────────────────┬──────────────────────────────┐
│ Simple          │ 简单显示，可设置颜色色调       │  ← CSS: background-image
│ Sliced          │ 九宫格切片，边缘不拉伸        │  ← CSS: border-image-slice
│ Tiled           │ 平铺重复                      │  ← CSS: background-repeat: repeat
│ Filled          │ 填充进度（圆形/水平/垂直）     │  ← 无直接等价，常用于血条
└─────────────────┴──────────────────────────────┘
```

[截图：四种 Image 类型的视觉效果对比]

**Filled 类型特别适合做进度条/血条：**
```csharp
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 使用 Filled Image 实现简单的进度条
/// </summary>
public class FilledImageDemo : MonoBehaviour
{
    [SerializeField] private Image fillImage;

    void Start()
    {
        // 设置为 Filled 类型
        fillImage.type = Image.Type.Filled;
        // 填充方向：水平（从左到右）
        fillImage.fillMethod = Image.FillMethod.Horizontal;
        // 填充量：0-1 (0% - 100%)
        fillImage.fillAmount = 0.75f; // 75%
    }
}
```

### 9.4.3 Button

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Button 组件使用示例
/// 类比前端：<button onClick={handleClick}>点击</button>
/// </summary>
public class ButtonDemo : MonoBehaviour
{
    [SerializeField] private Button myButton;
    [SerializeField] private TextMeshProUGUI buttonText;

    void Start()
    {
        // 方式 1：代码添加点击事件（类似 addEventListener）
        myButton.onClick.AddListener(OnButtonClicked);

        // 方式 2：也可以在 Inspector 中拖拽设置 OnClick 事件
    }

    void OnButtonClicked()
    {
        Debug.Log("按钮被点击了！");
        buttonText.text = "已点击！";
    }

    void OnDestroy()
    {
        // 清理事件监听（类似 removeEventListener）
        myButton.onClick.RemoveListener(OnButtonClicked);
    }
}
```

**Button 视觉过渡模式：**

| 模式 | 说明 | 前端类比 |
|------|------|----------|
| None | 无视觉反馈 | 无 `:hover`/`:active` 样式 |
| Color Tint | 不同状态颜色变化 | `:hover { opacity: 0.8 }` |
| Sprite Swap | 不同状态切换图片 | `:hover { background-image: url(...) }` |
| Animation | 不同状态播放动画 | CSS `@keyframes` + `:hover` |

[截图：Button 组件 Inspector 面板，显示 Color Tint 过渡的各状态颜色设置]

### 9.4.4 Slider

```
Slider 结构：
┌──────────────────────────────────────┐
│ Slider                               │
│ ├── Background      ← 滑动条背景    │
│ ├── Fill Area                        │
│ │   └── Fill        ← 已填充部分    │
│ └── Handle Slide Area                │
│     └── Handle      ← 可拖动的把手  │
└──────────────────────────────────────┘

类比 HTML: <input type="range" min="0" max="1" step="0.01">
```

### 9.4.5 Toggle 和 Toggle Group

```csharp
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Toggle 使用示例
/// 类比前端：<input type="checkbox"> 或 <input type="radio">
/// </summary>
public class ToggleDemo : MonoBehaviour
{
    [SerializeField] private Toggle soundToggle;
    [SerializeField] private Toggle musicToggle;

    void Start()
    {
        // 监听 Toggle 值变化（类似 onChange）
        soundToggle.onValueChanged.AddListener(OnSoundToggleChanged);
        musicToggle.onValueChanged.AddListener(OnMusicToggleChanged);
    }

    void OnSoundToggleChanged(bool isOn)
    {
        Debug.Log($"音效: {(isOn ? "开" : "关")}");
    }

    void OnMusicToggleChanged(bool isOn)
    {
        Debug.Log($"音乐: {(isOn ? "开" : "关")}");
    }
}
```

### 9.4.6 ScrollView

```
ScrollView 结构（类比 CSS overflow: auto）：
┌──────────────────────────────────┐
│ Scroll View                      │
│ ├── Viewport         ← 可见区域 │  CSS: overflow: hidden
│ │   └── Content      ← 内容容器 │  CSS: 可以超出 viewport 的长内容
│ │       ├── Item 1              │
│ │       ├── Item 2              │
│ │       └── Item 3...           │
│ ├── Scrollbar Horizontal        │
│ └── Scrollbar Vertical          │
└──────────────────────────────────┘
```

### 9.4.7 InputField (TMP)

```csharp
using UnityEngine;
using TMPro;

/// <summary>
/// InputField 使用示例
/// 类比前端：<input type="text" onChange={...} onSubmit={...}>
/// </summary>
public class InputFieldDemo : MonoBehaviour
{
    [SerializeField] private TMP_InputField nameInput;

    void Start()
    {
        // 输入变化事件（每次按键都触发，类似 onChange）
        nameInput.onValueChanged.AddListener(OnInputChanged);

        // 提交事件（按回车时触发，类似 onSubmit）
        nameInput.onEndEdit.AddListener(OnInputSubmitted);

        // 设置输入类型
        nameInput.contentType = TMP_InputField.ContentType.Standard;
        // 其他类型：Password、EmailAddress、IntegerNumber 等

        // 设置字符限制
        nameInput.characterLimit = 20;

        // 设置占位文本
        nameInput.placeholder.GetComponent<TextMeshProUGUI>().text = "请输入角色名...";
    }

    void OnInputChanged(string value)
    {
        Debug.Log($"当前输入: {value}");
    }

    void OnInputSubmitted(string value)
    {
        Debug.Log($"提交: {value}");
    }
}
```

---

## 9.5 Layout Group：自动布局

### 9.5.1 布局组件对比 CSS

| Unity Layout | CSS 等价 | 用途 |
|-------------|----------|------|
| Horizontal Layout Group | `display: flex; flex-direction: row;` | 水平排列子元素 |
| Vertical Layout Group | `display: flex; flex-direction: column;` | 垂直排列子元素 |
| Grid Layout Group | `display: grid;` | 网格排列子元素 |
| Content Size Fitter | `width: fit-content; height: fit-content;` | 根据内容自适应大小 |
| Layout Element | `flex-grow / flex-shrink / flex-basis` | 控制子元素的布局权重 |

### 9.5.2 Vertical Layout Group 示例

```
Vertical Layout Group 设置：
┌──────────────────────────────────┐
│ Padding:                         │  ← CSS: padding
│   Left: 10  Right: 10           │
│   Top: 10   Bottom: 10          │
│                                  │
│ Spacing: 5                       │  ← CSS: gap（flex gap）
│                                  │
│ Child Alignment: Upper Center    │  ← CSS: align-items + justify-content
│                                  │
│ Control Child Size:              │
│   ☑ Width  ☑ Height              │  ← 是否控制子元素大小
│                                  │
│ Use Child Scale:                 │
│   ☐ Width  ☐ Height              │
│                                  │
│ Child Force Expand:              │
│   ☑ Width  ☐ Height              │  ← CSS: flex-grow: 1
└──────────────────────────────────┘
```

[截图：Vertical Layout Group 的效果，多个按钮自动纵向排列]

### 9.5.3 Grid Layout Group

```csharp
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Grid Layout 设置示例（如背包格子）
/// 类比前端：display: grid; grid-template-columns: repeat(4, 80px);
/// </summary>
public class GridLayoutDemo : MonoBehaviour
{
    void Start()
    {
        GridLayoutGroup grid = GetComponent<GridLayoutGroup>();

        // 每个格子的大小
        grid.cellSize = new Vector2(80f, 80f);

        // 格子间距（类似 CSS gap）
        grid.spacing = new Vector2(10f, 10f);

        // 起始角落和排列方向
        grid.startCorner = GridLayoutGroup.Corner.UpperLeft;
        grid.startAxis = GridLayoutGroup.Axis.Horizontal;

        // 对齐方式
        grid.childAlignment = TextAnchor.UpperLeft;

        // 约束类型
        // Flexible: 自动排列
        // Fixed Column Count: 固定列数（推荐背包使用）
        // Fixed Row Count: 固定行数
        grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
        grid.constraintCount = 4; // 每行 4 个格子

        // 内边距
        grid.padding = new RectOffset(10, 10, 10, 10);
    }
}
```

### 9.5.4 Content Size Fitter

```
Content Size Fitter（自适应大小）：

类比 CSS: width: fit-content; 或 width: max-content;

常用组合：
1. 文字气泡：TextMeshPro + Content Size Fitter (Preferred Size)
   → 气泡大小随文字内容自动调整

2. 滚动列表内容：Content + Vertical Layout Group + Content Size Fitter
   → Content 高度随子元素数量自动增长

Horizontal Fit: [Unconstrained / Min Size / Preferred Size]
Vertical Fit:   [Unconstrained / Min Size / Preferred Size]
```

---

## 9.6 实战：创建血条（HealthBar）

### 9.6.1 UI 结构

```
Hierarchy 结构：
Canvas
└── HealthBarPanel              ← 血条面板
    ├── HealthBarBackground     ← 背景图片（灰色/深红色）
    ├── HealthBarFill           ← 填充图片（红色/绿色，Filled 类型）
    ├── HealthBarBorder         ← 边框图片
    └── HealthText              ← "100/100" 文字（TMP）
```

[截图：血条 UI 层级结构和最终效果]

### 9.6.2 创建步骤

1. 在 Canvas 下创建 Empty Object，命名为 `HealthBarPanel`
2. 设置 RectTransform：
   - 锚点：左上角
   - Pos X: 20, Pos Y: -20
   - Width: 300, Height: 40
3. 创建子物体 `HealthBarBackground`（Image）：
   - 锚点：拉伸（全屏填充父容器）
   - Color: 深灰色 #333333
4. 创建子物体 `HealthBarFill`（Image）：
   - 锚点：拉伸
   - Image Type: Filled
   - Fill Method: Horizontal
   - Color: 绿色 #4CAF50
5. 创建子物体 `HealthBarBorder`（Image）：
   - 锚点：拉伸
   - Sprite: 使用九宫格切片的边框图片
6. 创建子物体 `HealthText`（TextMeshPro）：
   - 锚点：拉伸（居中对齐）
   - Text: "100/100"
   - Font Size: 20
   - Alignment: Center + Middle

[截图：完成后的血条效果图]

### 9.6.3 HealthBar.cs 完整代码

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections;

/// <summary>
/// 血条 UI 组件
/// 支持平滑动画、颜色渐变、受击闪烁等效果
///
/// 类比前端：类似一个 React 组件
/// <HealthBar currentHP={80} maxHP={100} />
/// 内部用 CSS transition 实现平滑过渡
///
/// 使用方式：挂载到 HealthBarPanel 上，拖拽赋值子元素
/// </summary>
public class HealthBar : MonoBehaviour
{
    #region Inspector 引用

    [Header("UI 元素引用")]
    [Tooltip("血条填充 Image（Filled 类型）")]
    [SerializeField] private Image healthFillImage;

    [Tooltip("血条延迟填充 Image（用于受击时的 '掉血' 动画效果）")]
    [SerializeField] private Image healthDelayFillImage;

    [Tooltip("血量文字")]
    [SerializeField] private TextMeshProUGUI healthText;

    [Header("动画设置")]
    [Tooltip("血条变化的平滑速度")]
    [SerializeField] private float fillSpeed = 2f;

    [Tooltip("延迟血条开始缩减的等待时间")]
    [SerializeField] private float delayDuration = 0.5f;

    [Tooltip("延迟血条缩减速度")]
    [SerializeField] private float delayFillSpeed = 1f;

    [Header("颜色设置")]
    [Tooltip("高血量颜色（> 60%）")]
    [SerializeField] private Color highHealthColor = new Color(0.3f, 0.85f, 0.3f); // 绿色

    [Tooltip("中等血量颜色（30% - 60%）")]
    [SerializeField] private Color mediumHealthColor = new Color(1f, 0.8f, 0f); // 黄色

    [Tooltip("低血量颜色（< 30%）")]
    [SerializeField] private Color lowHealthColor = new Color(0.9f, 0.2f, 0.2f); // 红色

    [Tooltip("延迟血条颜色")]
    [SerializeField] private Color delayFillColor = new Color(1f, 1f, 1f, 0.6f); // 半透明白色

    #endregion

    #region 私有变量

    // 当前显示的血量比例（用于平滑动画）
    private float currentFillAmount = 1f;
    // 目标血量比例
    private float targetFillAmount = 1f;
    // 延迟血条的当前比例
    private float delayFillAmount = 1f;
    // 是否正在等待延迟
    private bool isDelayActive = false;
    // 当前最大生命值
    private int maxHealth = 100;
    // 当前生命值
    private int currentHealth = 100;

    #endregion

    #region 生命周期

    void Start()
    {
        // 初始化延迟填充颜色
        if (healthDelayFillImage != null)
        {
            healthDelayFillImage.color = delayFillColor;
        }

        // 初始状态
        UpdateHealthBar(maxHealth, maxHealth, false);
    }

    void Update()
    {
        // 平滑更新实际血条填充量
        if (!Mathf.Approximately(currentFillAmount, targetFillAmount))
        {
            currentFillAmount = Mathf.MoveTowards(
                currentFillAmount, targetFillAmount,
                fillSpeed * Time.deltaTime);
            healthFillImage.fillAmount = currentFillAmount;
        }

        // 平滑更新延迟血条
        if (healthDelayFillImage != null && !isDelayActive)
        {
            if (delayFillAmount > currentFillAmount)
            {
                delayFillAmount = Mathf.MoveTowards(
                    delayFillAmount, currentFillAmount,
                    delayFillSpeed * Time.deltaTime);
                healthDelayFillImage.fillAmount = delayFillAmount;
            }
        }
    }

    #endregion

    #region 公共方法

    /// <summary>
    /// 更新血条显示
    /// </summary>
    /// <param name="current">当前生命值</param>
    /// <param name="max">最大生命值</param>
    /// <param name="animated">是否使用动画过渡</param>
    public void UpdateHealthBar(int current, int max, bool animated = true)
    {
        maxHealth = max;
        currentHealth = Mathf.Clamp(current, 0, max);

        // 计算目标填充比例
        targetFillAmount = (float)currentHealth / maxHealth;

        if (animated)
        {
            // 触发延迟血条效果（仅在受伤时）
            if (targetFillAmount < currentFillAmount && healthDelayFillImage != null)
            {
                // 延迟一段时间后开始缩减延迟血条
                StartCoroutine(DelayedFillReduction());
            }
        }
        else
        {
            // 直接设置，无动画
            currentFillAmount = targetFillAmount;
            delayFillAmount = targetFillAmount;
            healthFillImage.fillAmount = currentFillAmount;

            if (healthDelayFillImage != null)
            {
                healthDelayFillImage.fillAmount = delayFillAmount;
            }
        }

        // 更新颜色
        UpdateHealthColor();

        // 更新文字
        if (healthText != null)
        {
            healthText.text = $"{currentHealth}/{maxHealth}";
        }
    }

    /// <summary>
    /// 受到伤害时调用
    /// </summary>
    /// <param name="damage">伤害值</param>
    public void TakeDamage(int damage)
    {
        UpdateHealthBar(currentHealth - damage, maxHealth);

        // 受击闪烁效果
        StartCoroutine(FlashEffect());
    }

    /// <summary>
    /// 治疗时调用
    /// </summary>
    /// <param name="healAmount">治疗量</param>
    public void Heal(int healAmount)
    {
        UpdateHealthBar(currentHealth + healAmount, maxHealth);
    }

    #endregion

    #region 私有方法

    /// <summary>
    /// 根据血量比例更新颜色
    /// 类比前端：类似根据 props 动态计算 className
    /// </summary>
    private void UpdateHealthColor()
    {
        float ratio = targetFillAmount;

        Color targetColor;
        if (ratio > 0.6f)
        {
            targetColor = highHealthColor;
        }
        else if (ratio > 0.3f)
        {
            // 在中等和低之间插值
            float t = (ratio - 0.3f) / 0.3f;
            targetColor = Color.Lerp(mediumHealthColor, highHealthColor, t);
        }
        else
        {
            // 在低和中之间插值
            float t = ratio / 0.3f;
            targetColor = Color.Lerp(lowHealthColor, mediumHealthColor, t);
        }

        healthFillImage.color = targetColor;
    }

    /// <summary>
    /// 延迟血条缩减协程
    /// 实现 "掉血延迟" 效果——先扣实际血条，延迟后白色部分再跟着减少
    /// </summary>
    private IEnumerator DelayedFillReduction()
    {
        isDelayActive = true;
        yield return new WaitForSeconds(delayDuration);
        isDelayActive = false;
    }

    /// <summary>
    /// 受击闪烁效果
    /// </summary>
    private IEnumerator FlashEffect()
    {
        // 闪白
        Color originalColor = healthFillImage.color;
        healthFillImage.color = Color.white;

        yield return new WaitForSeconds(0.1f);

        // 恢复颜色
        healthFillImage.color = originalColor;
    }

    #endregion
}
```

---

## 9.7 实战：创建主菜单（MainMenu）

### 9.7.1 UI 结构

```
Hierarchy 结构：
Canvas (Main Menu)
├── BackgroundImage            ← 全屏背景图
├── LogoImage                  ← 游戏 Logo
├── MenuPanel                  ← 菜单按钮面板
│   ├── StartButton            ← "开始游戏" 按钮
│   ├── ContinueButton         ← "继续游戏" 按钮
│   ├── SettingsButton          ← "设置" 按钮
│   └── QuitButton              ← "退出游戏" 按钮
├── SettingsPanel (inactive)   ← 设置面板（默认隐藏）
│   ├── SettingsTitle           ← "设置" 标题
│   ├── MusicSlider             ← 音乐音量滑块
│   ├── SFXSlider               ← 音效音量滑块
│   ├── QualityDropdown         ← 画质选择
│   └── BackButton              ← "返回" 按钮
└── VersionText                ← 版本号 "v1.0.0"
```

[截图：主菜单的完整 UI 设计效果图]

### 9.7.2 MainMenu.cs 完整代码

```csharp
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;
using System.Collections;

/// <summary>
/// 主菜单管理器
/// 管理主菜单的所有 UI 交互和场景切换
///
/// 类比前端：类似 React 的一个页面组件
/// function MainMenuPage() {
///   const [currentPanel, setCurrentPanel] = useState('main');
///   return currentPanel === 'main' ? <MainPanel /> : <SettingsPanel />;
/// }
/// </summary>
public class MainMenu : MonoBehaviour
{
    #region Inspector 引用

    [Header("面板引用")]
    [Tooltip("主菜单面板")]
    [SerializeField] private GameObject menuPanel;

    [Tooltip("设置面板")]
    [SerializeField] private GameObject settingsPanel;

    [Header("主菜单按钮")]
    [SerializeField] private Button startButton;
    [SerializeField] private Button continueButton;
    [SerializeField] private Button settingsButton;
    [SerializeField] private Button quitButton;

    [Header("设置面板控件")]
    [SerializeField] private Slider musicVolumeSlider;
    [SerializeField] private Slider sfxVolumeSlider;
    [SerializeField] private TMP_Dropdown qualityDropdown;
    [SerializeField] private Button backButton;

    [Header("其他 UI")]
    [SerializeField] private TextMeshProUGUI versionText;
    [SerializeField] private CanvasGroup fadeOverlay; // 用于场景切换淡入淡出

    [Header("场景设置")]
    [Tooltip("游戏主场景名称")]
    [SerializeField] private string gameSceneName = "GameScene";

    [Header("动画设置")]
    [SerializeField] private float fadeInDuration = 1f;
    [SerializeField] private float fadeOutDuration = 0.5f;
    [SerializeField] private float buttonAnimationDelay = 0.1f;

    #endregion

    #region 生命周期

    void Start()
    {
        // 初始化 UI 状态
        InitializeUI();

        // 绑定事件
        BindEvents();

        // 播放入场动画
        StartCoroutine(PlayEnterAnimation());
    }

    void OnDestroy()
    {
        // 清理事件绑定（类似 React 的 cleanup function）
        UnbindEvents();
    }

    #endregion

    #region 初始化

    /// <summary>
    /// 初始化 UI 状态
    /// </summary>
    private void InitializeUI()
    {
        // 显示主菜单，隐藏设置面板
        menuPanel.SetActive(true);
        settingsPanel.SetActive(false);

        // 设置版本号
        if (versionText != null)
        {
            versionText.text = $"v{Application.version}";
        }

        // 检查是否有存档，决定 "继续游戏" 按钮是否可用
        bool hasSaveData = PlayerPrefs.HasKey("SaveData");
        continueButton.interactable = hasSaveData;

        // 初始化设置面板的值（从 PlayerPrefs 读取）
        musicVolumeSlider.value = PlayerPrefs.GetFloat("MusicVolume", 0.8f);
        sfxVolumeSlider.value = PlayerPrefs.GetFloat("SFXVolume", 1f);

        // 初始化画质下拉菜单
        InitializeQualityDropdown();

        // 初始化淡入遮罩
        if (fadeOverlay != null)
        {
            fadeOverlay.alpha = 1f; // 初始为全黑
            fadeOverlay.gameObject.SetActive(true);
        }

        // 取消锁定光标（从游戏场景返回主菜单时可能被锁定）
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }

    /// <summary>
    /// 初始化画质下拉菜单
    /// </summary>
    private void InitializeQualityDropdown()
    {
        if (qualityDropdown == null) return;

        qualityDropdown.ClearOptions();

        // 获取 Unity 画质设置的名称列表
        var qualityNames = QualitySettings.names;
        var options = new System.Collections.Generic.List<string>();
        foreach (string name in qualityNames)
        {
            options.Add(name);
        }
        qualityDropdown.AddOptions(options);

        // 设置当前画质
        qualityDropdown.value = QualitySettings.GetQualityLevel();
    }

    /// <summary>
    /// 绑定所有 UI 事件
    /// 类比前端：类似 useEffect 中的事件绑定
    /// </summary>
    private void BindEvents()
    {
        // 主菜单按钮
        startButton.onClick.AddListener(OnStartGame);
        continueButton.onClick.AddListener(OnContinueGame);
        settingsButton.onClick.AddListener(OnOpenSettings);
        quitButton.onClick.AddListener(OnQuitGame);

        // 设置面板
        backButton.onClick.AddListener(OnCloseSettings);
        musicVolumeSlider.onValueChanged.AddListener(OnMusicVolumeChanged);
        sfxVolumeSlider.onValueChanged.AddListener(OnSFXVolumeChanged);
        qualityDropdown.onValueChanged.AddListener(OnQualityChanged);
    }

    /// <summary>
    /// 清理事件绑定
    /// </summary>
    private void UnbindEvents()
    {
        startButton.onClick.RemoveAllListeners();
        continueButton.onClick.RemoveAllListeners();
        settingsButton.onClick.RemoveAllListeners();
        quitButton.onClick.RemoveAllListeners();
        backButton.onClick.RemoveAllListeners();
        musicVolumeSlider.onValueChanged.RemoveAllListeners();
        sfxVolumeSlider.onValueChanged.RemoveAllListeners();
        qualityDropdown.onValueChanged.RemoveAllListeners();
    }

    #endregion

    #region 按钮事件处理

    /// <summary>
    /// 开始新游戏
    /// </summary>
    private void OnStartGame()
    {
        Debug.Log("[MainMenu] 开始新游戏");
        // 禁用所有按钮，防止重复点击
        SetButtonsInteractable(false);
        // 淡出后加载游戏场景
        StartCoroutine(FadeOutAndLoadScene(gameSceneName));
    }

    /// <summary>
    /// 继续游戏（加载存档）
    /// </summary>
    private void OnContinueGame()
    {
        Debug.Log("[MainMenu] 继续游戏");
        // TODO: 加载存档数据（详见第 16 章：存档系统）
        SetButtonsInteractable(false);
        StartCoroutine(FadeOutAndLoadScene(gameSceneName));
    }

    /// <summary>
    /// 打开设置面板
    /// </summary>
    private void OnOpenSettings()
    {
        Debug.Log("[MainMenu] 打开设置");
        menuPanel.SetActive(false);
        settingsPanel.SetActive(true);
        // 可以添加面板切换动画
        StartCoroutine(FadeInPanel(settingsPanel));
    }

    /// <summary>
    /// 关闭设置面板
    /// </summary>
    private void OnCloseSettings()
    {
        Debug.Log("[MainMenu] 关闭设置");
        // 保存设置
        SaveSettings();

        settingsPanel.SetActive(false);
        menuPanel.SetActive(true);
        StartCoroutine(FadeInPanel(menuPanel));
    }

    /// <summary>
    /// 退出游戏
    /// </summary>
    private void OnQuitGame()
    {
        Debug.Log("[MainMenu] 退出游戏");

        #if UNITY_EDITOR
        // 在编辑器中停止播放
        UnityEditor.EditorApplication.isPlaying = false;
        #else
        // 在构建版本中退出应用
        Application.Quit();
        #endif
    }

    #endregion

    #region 设置事件处理

    /// <summary>
    /// 音乐音量变化
    /// </summary>
    private void OnMusicVolumeChanged(float volume)
    {
        // AudioManager.Instance?.SetMusicVolume(volume);
        Debug.Log($"[MainMenu] 音乐音量: {volume:P0}");
    }

    /// <summary>
    /// 音效音量变化
    /// </summary>
    private void OnSFXVolumeChanged(float volume)
    {
        // AudioManager.Instance?.SetSFXVolume(volume);
        Debug.Log($"[MainMenu] 音效音量: {volume:P0}");
    }

    /// <summary>
    /// 画质设置变化
    /// </summary>
    private void OnQualityChanged(int qualityIndex)
    {
        QualitySettings.SetQualityLevel(qualityIndex);
        Debug.Log($"[MainMenu] 画质设置: {QualitySettings.names[qualityIndex]}");
    }

    /// <summary>
    /// 保存设置到 PlayerPrefs
    /// 类比前端：类似存储到 localStorage
    /// </summary>
    private void SaveSettings()
    {
        PlayerPrefs.SetFloat("MusicVolume", musicVolumeSlider.value);
        PlayerPrefs.SetFloat("SFXVolume", sfxVolumeSlider.value);
        PlayerPrefs.SetInt("QualityLevel", qualityDropdown.value);
        PlayerPrefs.Save(); // 立即写入磁盘
    }

    #endregion

    #region 动画效果

    /// <summary>
    /// 入场动画——淡入 + 按钮依次出现
    /// </summary>
    private IEnumerator PlayEnterAnimation()
    {
        // 1. 淡入（黑屏 → 可见）
        if (fadeOverlay != null)
        {
            float elapsed = 0f;
            while (elapsed < fadeInDuration)
            {
                elapsed += Time.deltaTime;
                fadeOverlay.alpha = 1f - (elapsed / fadeInDuration);
                yield return null;
            }
            fadeOverlay.alpha = 0f;
            fadeOverlay.gameObject.SetActive(false);
        }

        // 2. 按钮依次出现动画
        Button[] buttons = { startButton, continueButton,
                             settingsButton, quitButton };

        foreach (Button btn in buttons)
        {
            // 设置初始状态
            CanvasGroup cg = btn.GetComponent<CanvasGroup>();
            if (cg == null) cg = btn.gameObject.AddComponent<CanvasGroup>();
            cg.alpha = 0f;

            RectTransform rt = btn.GetComponent<RectTransform>();
            Vector2 originalPos = rt.anchoredPosition;
            rt.anchoredPosition = originalPos + new Vector2(-50f, 0f); // 向左偏移

            // 动画：滑入 + 淡入
            StartCoroutine(AnimateButton(rt, cg, originalPos, 0.3f));

            // 每个按钮延迟一小段时间出现
            yield return new WaitForSeconds(buttonAnimationDelay);
        }
    }

    /// <summary>
    /// 单个按钮的滑入动画
    /// </summary>
    private IEnumerator AnimateButton(
        RectTransform rt, CanvasGroup cg,
        Vector2 targetPos, float duration)
    {
        Vector2 startPos = rt.anchoredPosition;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            // 使用 easeOutCubic 缓动函数
            float easedT = 1f - Mathf.Pow(1f - t, 3f);

            rt.anchoredPosition = Vector2.Lerp(startPos, targetPos, easedT);
            cg.alpha = easedT;
            yield return null;
        }

        rt.anchoredPosition = targetPos;
        cg.alpha = 1f;
    }

    /// <summary>
    /// 淡出并加载场景
    /// 类比前端：类似 React Router 的页面切换过渡动画
    /// </summary>
    private IEnumerator FadeOutAndLoadScene(string sceneName)
    {
        // 激活淡出遮罩
        if (fadeOverlay != null)
        {
            fadeOverlay.gameObject.SetActive(true);
            float elapsed = 0f;

            while (elapsed < fadeOutDuration)
            {
                elapsed += Time.deltaTime;
                fadeOverlay.alpha = elapsed / fadeOutDuration;
                yield return null;
            }
            fadeOverlay.alpha = 1f;
        }

        // 加载新场景
        // 类比前端：类似 window.location.href = '/game'
        SceneManager.LoadScene(sceneName);
    }

    /// <summary>
    /// 面板淡入动画
    /// </summary>
    private IEnumerator FadeInPanel(GameObject panel)
    {
        CanvasGroup cg = panel.GetComponent<CanvasGroup>();
        if (cg == null) cg = panel.AddComponent<CanvasGroup>();

        cg.alpha = 0f;
        float duration = 0.2f;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            cg.alpha = elapsed / duration;
            yield return null;
        }
        cg.alpha = 1f;
    }

    /// <summary>
    /// 设置所有按钮的可交互状态
    /// </summary>
    private void SetButtonsInteractable(bool interactable)
    {
        startButton.interactable = interactable;
        continueButton.interactable = interactable;
        settingsButton.interactable = interactable;
        quitButton.interactable = interactable;
    }

    #endregion
}
```

---

## 9.8 实战：游戏内 HUD

### 9.8.1 HUD 结构设计

```
HUD (Heads-Up Display) 布局：

┌──────────────────────────────────────────┐
│ [HP ████████░░]  [MP ██████░░░░]  12:30 │  ← 顶部栏
│                                          │
│                                          │
│                                          │
│                                    [map] │  ← 小地图
│                                          │
│                              [!] 任务提示 │  ← 右侧通知
│                                          │
│                                          │
│ 金币: 1,250                              │  ← 底部左
│ [1][2][3][4]  [攻击] [闪避] [技能]        │  ← 技能栏
└──────────────────────────────────────────┘
```

### 9.8.2 HUD Hierarchy 结构

```
Canvas (HUD)
├── TopBar                      ← 顶部信息栏
│   ├── HealthBarPanel          ← 血条（复用 HealthBar 组件）
│   ├── ManaBarPanel            ← 蓝条
│   └── TimeText                ← 游戏时间
│
├── NotificationPanel           ← 通知面板
│   └── NotificationText        ← 通知文字
│
├── BottomBar                   ← 底部栏
│   ├── CoinPanel               ← 金币显示
│   │   ├── CoinIcon            ← 金币图标
│   │   └── CoinText            ← 金币数量
│   └── ActionBar               ← 操作栏
│       ├── Slot1 ~ Slot4       ← 物品快捷栏
│       ├── AttackButton        ← 攻击按钮
│       ├── DodgeButton         ← 闪避按钮
│       └── SkillButton         ← 技能按钮
│
├── InteractionPrompt (inactive) ← 交互提示 "按 E 交互"
│   └── PromptText
│
└── DamageNumberPool (inactive)  ← 伤害数字对象池
```

[截图：完整的 HUD 设计效果图]

### 9.8.3 HUDManager.cs 完整代码

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// HUD（Heads-Up Display）管理器
/// 负责管理游戏内所有常驻 UI 元素的显示和更新
///
/// 类比前端：类似一个全局的 UI State Manager
/// 各个子系统（生命值、金币、通知等）通过调用公共方法更新 UI
///
/// 使用方式：挂载到 HUD Canvas 上，使用单例模式访问
/// </summary>
public class HUDManager : MonoBehaviour
{
    #region 单例模式

    // 单例实例
    // 类比前端：类似 React Context 或全局 Redux Store
    public static HUDManager Instance { get; private set; }

    void Awake()
    {
        // 确保只有一个实例
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    #endregion

    #region Inspector 引用

    [Header("===== 血条与蓝条 =====")]
    [SerializeField] private HealthBar healthBar;
    [SerializeField] private Image manaFillImage;
    [SerializeField] private TextMeshProUGUI manaText;

    [Header("===== 金币 =====")]
    [SerializeField] private TextMeshProUGUI coinText;
    [SerializeField] private RectTransform coinIcon; // 用于金币获取动画

    [Header("===== 通知系统 =====")]
    [SerializeField] private GameObject notificationPanel;
    [SerializeField] private TextMeshProUGUI notificationText;
    [SerializeField] private float notificationDuration = 3f;

    [Header("===== 交互提示 =====")]
    [SerializeField] private GameObject interactionPrompt;
    [SerializeField] private TextMeshProUGUI interactionText;

    [Header("===== 伤害数字 =====")]
    [SerializeField] private GameObject damageNumberPrefab;
    [SerializeField] private Transform damageNumberParent;

    [Header("===== 操作栏 =====")]
    [SerializeField] private Button attackButton;
    [SerializeField] private Button dodgeButton;
    [SerializeField] private Button skillButton;
    [SerializeField] private Image[] quickSlotImages; // 快捷栏图标
    [SerializeField] private Image skillCooldownFill; // 技能冷却遮罩

    [Header("===== 十字准心 =====")]
    [SerializeField] private GameObject crosshair;

    [Header("===== 游戏时间 =====")]
    [SerializeField] private TextMeshProUGUI timeText;

    #endregion

    #region 私有变量

    private Coroutine notificationCoroutine;
    private Queue<string> notificationQueue = new Queue<string>();
    private bool isShowingNotification = false;

    // 伤害数字对象池
    private Queue<GameObject> damageNumberPool = new Queue<GameObject>();
    private int poolSize = 10;

    // 当前金币数（用于动画）
    private int displayedCoins = 0;
    private int targetCoins = 0;

    #endregion

    #region 生命周期

    void Start()
    {
        InitializeUI();
        InitializeDamageNumberPool();
    }

    void Update()
    {
        // 平滑更新金币显示
        UpdateCoinAnimation();
    }

    /// <summary>
    /// 初始化所有 UI 元素的状态
    /// </summary>
    private void InitializeUI()
    {
        // 隐藏默认隐藏的元素
        if (notificationPanel != null)
            notificationPanel.SetActive(false);

        if (interactionPrompt != null)
            interactionPrompt.SetActive(false);

        if (crosshair != null)
            crosshair.SetActive(false);

        // 初始化金币显示
        UpdateCoins(0, false);
    }

    /// <summary>
    /// 初始化伤害数字对象池
    /// 类比前端：类似预创建 DOM 节点避免频繁的 createElement
    /// </summary>
    private void InitializeDamageNumberPool()
    {
        if (damageNumberPrefab == null || damageNumberParent == null) return;

        for (int i = 0; i < poolSize; i++)
        {
            GameObject dmgNum = Instantiate(damageNumberPrefab, damageNumberParent);
            dmgNum.SetActive(false);
            damageNumberPool.Enqueue(dmgNum);
        }
    }

    #endregion

    #region 血条与蓝条

    /// <summary>
    /// 更新生命值血条
    /// </summary>
    public void UpdateHealth(int currentHP, int maxHP)
    {
        if (healthBar != null)
        {
            healthBar.UpdateHealthBar(currentHP, maxHP);
        }
    }

    /// <summary>
    /// 更新法力值蓝条
    /// </summary>
    public void UpdateMana(int currentMP, int maxMP)
    {
        if (manaFillImage != null)
        {
            manaFillImage.fillAmount = (float)currentMP / maxMP;
        }
        if (manaText != null)
        {
            manaText.text = $"{currentMP}/{maxMP}";
        }
    }

    #endregion

    #region 金币系统

    /// <summary>
    /// 更新金币显示
    /// </summary>
    /// <param name="amount">当前金币总数</param>
    /// <param name="animated">是否使用数字滚动动画</param>
    public void UpdateCoins(int amount, bool animated = true)
    {
        targetCoins = amount;

        if (!animated)
        {
            displayedCoins = amount;
            if (coinText != null)
            {
                coinText.text = FormatNumber(amount);
            }
        }
    }

    /// <summary>
    /// 每帧平滑更新金币数字（数字滚动效果）
    /// </summary>
    private void UpdateCoinAnimation()
    {
        if (displayedCoins != targetCoins && coinText != null)
        {
            // 每帧接近目标值
            int step = Mathf.Max(1, Mathf.Abs(targetCoins - displayedCoins) / 10);

            if (displayedCoins < targetCoins)
                displayedCoins = Mathf.Min(displayedCoins + step, targetCoins);
            else
                displayedCoins = Mathf.Max(displayedCoins - step, targetCoins);

            coinText.text = FormatNumber(displayedCoins);
        }
    }

    /// <summary>
    /// 格式化数字（添加千位分隔符）
    /// 类比前端：Intl.NumberFormat
    /// </summary>
    private string FormatNumber(int number)
    {
        return number.ToString("N0"); // 1,234,567
    }

    #endregion

    #region 通知系统

    /// <summary>
    /// 显示屏幕通知消息
    /// 如果当前有消息在显示，新消息会排队等待
    /// </summary>
    /// <param name="message">通知内容</param>
    public void ShowNotification(string message)
    {
        notificationQueue.Enqueue(message);

        if (!isShowingNotification)
        {
            StartCoroutine(ProcessNotificationQueue());
        }
    }

    /// <summary>
    /// 处理通知队列
    /// </summary>
    private IEnumerator ProcessNotificationQueue()
    {
        isShowingNotification = true;

        while (notificationQueue.Count > 0)
        {
            string message = notificationQueue.Dequeue();

            // 显示通知
            notificationPanel.SetActive(true);
            notificationText.text = message;

            // 淡入动画
            CanvasGroup cg = notificationPanel.GetComponent<CanvasGroup>();
            if (cg == null) cg = notificationPanel.AddComponent<CanvasGroup>();

            // 淡入
            float fadeDuration = 0.3f;
            float elapsed = 0f;
            while (elapsed < fadeDuration)
            {
                elapsed += Time.deltaTime;
                cg.alpha = elapsed / fadeDuration;
                yield return null;
            }
            cg.alpha = 1f;

            // 等待显示时间
            yield return new WaitForSeconds(notificationDuration);

            // 淡出
            elapsed = 0f;
            while (elapsed < fadeDuration)
            {
                elapsed += Time.deltaTime;
                cg.alpha = 1f - (elapsed / fadeDuration);
                yield return null;
            }
            cg.alpha = 0f;
            notificationPanel.SetActive(false);

            // 短暂间隔后显示下一条
            yield return new WaitForSeconds(0.2f);
        }

        isShowingNotification = false;
    }

    #endregion

    #region 交互提示

    /// <summary>
    /// 显示交互提示（如 "按 E 打开宝箱"）
    /// </summary>
    /// <param name="prompt">提示文字</param>
    public void ShowInteractionPrompt(string prompt)
    {
        if (interactionPrompt != null && interactionText != null)
        {
            interactionText.text = prompt;
            interactionPrompt.SetActive(true);
        }
    }

    /// <summary>
    /// 隐藏交互提示
    /// </summary>
    public void HideInteractionPrompt()
    {
        if (interactionPrompt != null)
        {
            interactionPrompt.SetActive(false);
        }
    }

    #endregion

    #region 伤害数字

    /// <summary>
    /// 在指定世界坐标显示伤害数字
    /// </summary>
    /// <param name="worldPosition">伤害发生的世界坐标</param>
    /// <param name="damage">伤害值</param>
    /// <param name="isCritical">是否暴击</param>
    public void ShowDamageNumber(Vector3 worldPosition, int damage, bool isCritical = false)
    {
        // 从对象池获取一个伤害数字
        GameObject dmgNumObj;

        if (damageNumberPool.Count > 0)
        {
            dmgNumObj = damageNumberPool.Dequeue();
        }
        else
        {
            // 池中没有可用对象，创建新的
            dmgNumObj = Instantiate(damageNumberPrefab, damageNumberParent);
        }

        // 将世界坐标转换为屏幕坐标
        Vector3 screenPos = Camera.main.WorldToScreenPoint(worldPosition);
        dmgNumObj.transform.position = screenPos;

        // 设置伤害文字
        TextMeshProUGUI dmgText = dmgNumObj.GetComponentInChildren<TextMeshProUGUI>();
        if (dmgText != null)
        {
            dmgText.text = damage.ToString();

            if (isCritical)
            {
                dmgText.color = Color.yellow;
                dmgText.fontSize = 40;
                dmgText.text = $"{damage}!";
            }
            else
            {
                dmgText.color = Color.white;
                dmgText.fontSize = 28;
            }
        }

        dmgNumObj.SetActive(true);

        // 启动浮动动画
        StartCoroutine(AnimateDamageNumber(dmgNumObj));
    }

    /// <summary>
    /// 伤害数字浮动动画
    /// </summary>
    private IEnumerator AnimateDamageNumber(GameObject dmgNumObj)
    {
        RectTransform rt = dmgNumObj.GetComponent<RectTransform>();
        CanvasGroup cg = dmgNumObj.GetComponent<CanvasGroup>();
        if (cg == null) cg = dmgNumObj.AddComponent<CanvasGroup>();

        Vector2 startPos = rt.anchoredPosition;
        float duration = 1f;
        float elapsed = 0f;

        // 随机水平偏移
        float randomX = Random.Range(-30f, 30f);

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;

            // 上升 + 水平漂移
            rt.anchoredPosition = startPos + new Vector2(
                randomX * t,
                80f * t  // 向上浮动
            );

            // 后半段淡出
            if (t > 0.5f)
            {
                cg.alpha = 1f - ((t - 0.5f) * 2f);
            }

            yield return null;
        }

        // 回收到对象池
        dmgNumObj.SetActive(false);
        cg.alpha = 1f;
        damageNumberPool.Enqueue(dmgNumObj);
    }

    #endregion

    #region 技能冷却

    /// <summary>
    /// 显示技能冷却效果
    /// </summary>
    /// <param name="cooldownDuration">冷却时间（秒）</param>
    public void ShowSkillCooldown(float cooldownDuration)
    {
        StartCoroutine(AnimateSkillCooldown(cooldownDuration));
    }

    /// <summary>
    /// 技能冷却动画（径向填充）
    /// </summary>
    private IEnumerator AnimateSkillCooldown(float duration)
    {
        if (skillCooldownFill == null) yield break;

        skillCooldownFill.gameObject.SetActive(true);
        skillCooldownFill.fillAmount = 1f;

        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            skillCooldownFill.fillAmount = 1f - (elapsed / duration);
            yield return null;
        }

        skillCooldownFill.fillAmount = 0f;
        skillCooldownFill.gameObject.SetActive(false);
    }

    #endregion

    #region 游戏时间

    /// <summary>
    /// 更新游戏时间显示
    /// </summary>
    /// <param name="hours">小时</param>
    /// <param name="minutes">分钟</param>
    public void UpdateGameTime(int hours, int minutes)
    {
        if (timeText != null)
        {
            timeText.text = $"{hours:D2}:{minutes:D2}";
        }
    }

    #endregion

    #region 整体 HUD 控制

    /// <summary>
    /// 显示/隐藏整个 HUD（如过场动画时隐藏）
    /// </summary>
    /// <param name="visible">是否可见</param>
    public void SetHUDVisible(bool visible)
    {
        CanvasGroup cg = GetComponent<CanvasGroup>();
        if (cg == null) cg = gameObject.AddComponent<CanvasGroup>();

        cg.alpha = visible ? 1f : 0f;
        cg.interactable = visible;
        cg.blocksRaycasts = visible;
    }

    /// <summary>
    /// HUD 淡入/淡出动画
    /// </summary>
    public IEnumerator FadeHUD(bool fadeIn, float duration = 0.5f)
    {
        CanvasGroup cg = GetComponent<CanvasGroup>();
        if (cg == null) cg = gameObject.AddComponent<CanvasGroup>();

        float startAlpha = fadeIn ? 0f : 1f;
        float endAlpha = fadeIn ? 1f : 0f;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            cg.alpha = Mathf.Lerp(startAlpha, endAlpha, elapsed / duration);
            yield return null;
        }

        cg.alpha = endAlpha;
        cg.interactable = fadeIn;
        cg.blocksRaycasts = fadeIn;
    }

    #endregion
}
```

---

## 9.9 UI 事件系统

### 9.9.1 EventSystem 组件

Unity 的 EventSystem 负责处理所有 UI 输入事件。创建 Canvas 时会自动创建。

> 💡 **前端类比**：EventSystem 就像浏览器的 DOM 事件系统——处理事件冒泡、目标确定、射线检测等。

```
UI 事件处理流程（类比 DOM 事件）：

用户触摸/点击屏幕
    ↓
EventSystem 接收输入
    ↓
Graphic Raycaster 发射射线检测 UI 元素
（类比：document.elementFromPoint(x, y)）
    ↓
找到目标 UI 元素
    ↓
触发对应的事件处理器
（类比：element.dispatchEvent(event)）
```

### 9.9.2 IPointer 接口

```csharp
using UnityEngine;
using UnityEngine.EventSystems;

/// <summary>
/// 实现多种 UI 事件接口
/// 类比前端：类似给 DOM 元素添加多个事件监听器
///
/// element.addEventListener('pointerdown', handler);
/// element.addEventListener('pointerenter', handler);
/// ...
/// </summary>
public class UIEventDemo : MonoBehaviour,
    IPointerClickHandler,      // 点击（类似 onClick）
    IPointerEnterHandler,      // 鼠标进入（类似 onMouseEnter）
    IPointerExitHandler,       // 鼠标离开（类似 onMouseLeave）
    IPointerDownHandler,       // 按下（类似 onPointerDown）
    IPointerUpHandler,         // 抬起（类似 onPointerUp）
    IDragHandler,              // 拖拽中（类似 onDrag）
    IBeginDragHandler,         // 开始拖拽（类似 onDragStart）
    IEndDragHandler            // 结束拖拽（类似 onDragEnd）
{
    public void OnPointerClick(PointerEventData eventData)
    {
        Debug.Log($"点击！位置: {eventData.position}");
        // eventData 包含丰富的信息，类似前端的 MouseEvent
    }

    public void OnPointerEnter(PointerEventData eventData)
    {
        Debug.Log("鼠标进入");
        // 可以实现 hover 效果
        transform.localScale = Vector3.one * 1.1f; // 放大
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        Debug.Log("鼠标离开");
        transform.localScale = Vector3.one; // 恢复大小
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        Debug.Log("按下");
    }

    public void OnPointerUp(PointerEventData eventData)
    {
        Debug.Log("抬起");
    }

    public void OnBeginDrag(PointerEventData eventData)
    {
        Debug.Log("开始拖拽");
    }

    public void OnDrag(PointerEventData eventData)
    {
        // 拖拽中——更新位置
        RectTransform rt = GetComponent<RectTransform>();
        rt.anchoredPosition += eventData.delta; // delta 是每帧移动量
    }

    public void OnEndDrag(PointerEventData eventData)
    {
        Debug.Log("结束拖拽");
    }
}
```

---

## 9.10 Screen Space 模式对比

### 9.10.1 何时使用哪种模式

```
选择 Canvas 渲染模式的决策树：

需要 UI 始终在最顶层，不受 3D 影响？
├── 是 → Screen Space - Overlay
│         适用：HUD、菜单、对话框
│
└── 否 → 需要 UI 跟随 3D 物体？
          ├── 是 → World Space
          │         适用：NPC 头顶血条、场景内提示牌、3D 交互面板
          │
          └── 否 → 需要 UI 受后处理（Bloom、模糊等）影响？
                    ├── 是 → Screen Space - Camera
                    │         适用：需要辉光效果的 UI、特殊视觉风格
                    │
                    └── 否 → Screen Space - Overlay（默认首选）
```

### 9.10.2 World Space Canvas 示例（NPC 头顶名称）

```csharp
using UnityEngine;

/// <summary>
/// World Space UI 始终面向相机
/// 用于 NPC 头顶的名称/血条
/// </summary>
public class WorldSpaceBillboard : MonoBehaviour
{
    private Camera mainCamera;

    void Start()
    {
        mainCamera = Camera.main;
    }

    /// <summary>
    /// 在 LateUpdate 中更新朝向，确保在相机移动后执行
    /// </summary>
    void LateUpdate()
    {
        // 让 UI 始终面向相机
        // 类比前端：transform: rotateY(cameraAngle)
        transform.LookAt(
            transform.position + mainCamera.transform.forward
        );
    }
}
```

---

## 9.11 UI 与 HTML/CSS 布局对比速查表

这是为前端开发者准备的快速对照表：

| CSS 属性 | Unity UI 等价 |
|----------|---------------|
| `display: flex` | Horizontal/Vertical Layout Group |
| `display: grid` | Grid Layout Group |
| `position: absolute` | RectTransform + Anchors 固定到某个点 |
| `position: fixed` | Screen Space Overlay Canvas |
| `top/left/right/bottom` | RectTransform offsets (offsetMin, offsetMax) |
| `width/height` | RectTransform sizeDelta |
| `margin` | Layout Element 上无直接等价，用 Spacing |
| `padding` | Layout Group 的 Padding |
| `gap` | Layout Group 的 Spacing |
| `z-index` | Canvas Sort Order 或 Hierarchy 顺序（后面的在上面） |
| `overflow: hidden` | Rect Mask 2D 或 Scroll View 的 Viewport |
| `opacity` | CanvasGroup.alpha |
| `pointer-events: none` | CanvasGroup.blocksRaycasts = false |
| `transform-origin` | RectTransform Pivot |
| `border-radius` | 需要圆角 Sprite 或自定义 Shader |
| `box-shadow` | 需要额外的 Shadow Image 元素 |
| `text-overflow: ellipsis` | TMP Overflow: Ellipsis |
| `font-family` | TMP Font Asset |
| `background-image` | Image 组件 |
| `background-repeat` | Image Type: Tiled |
| `border-image-slice` | Image Type: Sliced（九宫格） |
| `cursor: pointer` | 默认 Button 就有视觉反馈 |

---

## 9.12 本章小结

```
UI 系统知识图谱：

Unity UI 系统
├── Canvas（根容器）
│   ├── Screen Space - Overlay（HUD、菜单）
│   ├── Screen Space - Camera（需后处理的 UI）
│   └── World Space（3D 世界中的 UI）
│
├── Canvas Scaler（响应式适配）
│   └── Scale With Screen Size（手游推荐）
│
├── RectTransform（布局系统）
│   ├── Anchors（锚点——定位参考）
│   ├── Pivot（枢轴——旋转/缩放中心）
│   └── Size Delta / Offsets（大小与边距）
│
├── UI 元素
│   ├── TextMeshPro（高质量文字）
│   ├── Image（图片，支持 Filled 进度条）
│   ├── Button（按钮）
│   ├── Slider（滑块）
│   ├── Toggle（开关）
│   ├── ScrollView（滚动视图）
│   └── InputField（输入框）
│
├── 布局组件
│   ├── Horizontal Layout Group（水平排列）
│   ├── Vertical Layout Group（垂直排列）
│   ├── Grid Layout Group（网格排列）
│   └── Content Size Fitter（自适应大小）
│
└── 事件系统
    ├── EventSystem（输入管理）
    ├── IPointer* 接口（点击、拖拽等）
    └── Button.onClick / Slider.onValueChanged
```

---

## 练习题

### 练习 1：设置面板完善（难度：⭐）
在 MainMenu 的设置面板中添加以下功能：
- 分辨率选择下拉菜单
- 全屏/窗口模式 Toggle
- 语言切换（中文/English）Toggle Group

### 练习 2：背包 UI（难度：⭐⭐）
使用 Grid Layout Group 创建一个 6x4 的背包网格：
- 每个格子支持显示物品图标和数量
- 实现物品拖拽功能（IBeginDragHandler、IDragHandler、IEndDragHandler）
- 点击格子显示物品详情弹窗

### 练习 3：对话 UI（难度：⭐⭐⭐）
创建一个 NPC 对话界面：
- 底部显示对话文字框（支持逐字出现的打字机效果）
- NPC 头像显示在左侧
- 支持多个对话选项按钮
- 使用 Content Size Fitter 自适应对话框大小

### 练习 4：世界空间 UI（难度：⭐⭐⭐）
为场景中的 NPC 创建 World Space 头顶 UI：
- 显示名字和等级
- 一个小血条
- 根据与玩家的距离自动缩放和淡出（太远就看不见）
- 始终面向相机（Billboard 效果）

---

## 下一章预告

**第 10 章：音频系统** 将学习：
- AudioSource 与 AudioListener 组件
- 3D 空间音效（距离衰减、方向感）
- AudioMixer 音量分组管理
- 背景音乐的无缝切换与淡入淡出
- 音效对象池优化
- 完整的 AudioManager 单例模式实现

---

> **版权声明**：本教程为 BellLab 原创内容，仅供学习使用。
