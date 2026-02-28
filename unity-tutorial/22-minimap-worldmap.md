# 第22章：小地图与世界地图系统

## 本章目标

通过本章学习，你将掌握：

1. **渲染纹理小地图** —— 使用二级摄像机和 Render Texture 实现实时小地图
2. **小地图旋转模式** —— 随玩家旋转 vs 固定北方朝上
3. **小地图图标系统** —— 玩家、NPC、敌人、任务标记、兴趣点的图标管理
4. **小地图缩放** —— 动态调整小地图的缩放级别
5. **战争迷雾** —— 已探索区域显示，未探索区域遮蔽
6. **全屏世界地图** —— 覆盖层式的世界地图UI
7. **地图标记系统** —— 自定义大头针标记
8. **路标系统** —— 点击地图设置目标点，3D世界中显示方向指引
9. **快速传送** —— 从地图上选择已解锁的传送点进行传送

## 预计学习时间

**4-5小时**

---

## 前端类比：帮助你理解

| 前端概念 | Unity 小地图/地图对应 |
|---------|---------------------|
| `<canvas>` 2D渲染 | Render Texture（渲染到纹理） |
| Google Maps API | 小地图摄像机俯瞰场景 |
| CSS `transform: rotate()` | 小地图随玩家旋转 |
| SVG 覆盖层图标 | 小地图 UI 图标（Image 组件） |
| `<canvas>` 遮罩 | 圆形小地图裁剪遮罩 |
| `localStorage` 持久化 | 战争迷雾探索数据存储 |
| Google Maps Marker | 地图标记系统 |
| 导航路线指引 | 3D路标方向指示器 |

---

## 22.1 渲染纹理小地图基础

### 22.1.1 Render Texture 原理

**Render Texture**（渲染纹理）是 Unity 的一项强大功能 —— 它允许你将摄像机的画面渲染到一张纹理上，而不是直接渲染到屏幕上。

用前端类比：
- 普通摄像机 = 将内容直接渲染到 `<body>` 页面上
- Render Texture 摄像机 = 将内容渲染到一个离屏 `<canvas>`，然后把这个 canvas 作为 `<img>` 显示在页面某处

小地图的实现原理：
1. 创建一个**俯视摄像机**，从上方垂直向下看场景
2. 这个摄像机渲染到 Render Texture（而非屏幕）
3. 在 UI 中用一个 `RawImage` 组件显示这张 Render Texture
4. 用圆形遮罩裁剪成圆形小地图

### 22.1.2 创建步骤

**第一步：创建 Render Texture 资源**

1. Project 面板中右键 -> Create -> Render Texture
2. 命名为 "MinimapRenderTexture"
3. 设置分辨率：512 x 512（移动端可以用 256 x 256 以节省性能）
4. Color Format：ARGB32
5. Depth Buffer：16 bit（需要深度信息来正确渲染3D场景）

[截图：Render Texture 资源的 Inspector 配置]

**第二步：创建小地图摄像机**

1. Hierarchy -> Camera -> 命名为 "MinimapCamera"
2. 设置为**正交投影**（Orthographic）—— 类似设计软件的俯视图
3. 旋转为 (90, 0, 0) —— 垂直向下看
4. Target Texture 设置为刚创建的 Render Texture
5. Culling Mask：只渲染需要在小地图上显示的层级

**第三步：创建小地图 UI**

1. 在 Canvas 中创建一个 `RawImage` 组件
2. 设置其 Texture 为 Render Texture
3. 添加圆形 `Mask` 组件实现圆形裁剪
4. 放置在屏幕右上角

[截图：小地图 UI 在 Canvas 中的层级结构]

[截图：游戏运行时右上角的圆形小地图效果]

---

## 22.2 MinimapController.cs —— 小地图控制器

创建 `Scripts/UI/Minimap/MinimapController.cs`：

```csharp
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 小地图控制器 —— 管理小地图摄像机和显示逻辑
///
/// 这个控制器负责：
/// 1. 让小地图摄像机跟随玩家位置
/// 2. 处理小地图的旋转模式
/// 3. 管理缩放级别
/// 4. 控制小地图 UI 显示
///
/// 类似前端中一个地图容器组件，管理视口（viewport）的位置和缩放
/// </summary>
public class MinimapController : MonoBehaviour
{
    public static MinimapController Instance { get; private set; }

    [Header("摄像机配置")]
    [Tooltip("小地图专用摄像机（正交投影，垂直向下看）")]
    [SerializeField] private Camera minimapCamera;

    [Tooltip("跟随的目标（通常是玩家）")]
    [SerializeField] private Transform followTarget;

    [Tooltip("摄像机高度（离地面多高）")]
    [SerializeField] private float cameraHeight = 50f;

    [Header("显示配置")]
    [Tooltip("小地图 RawImage（显示 Render Texture）")]
    [SerializeField] private RawImage minimapImage;

    [Tooltip("小地图边框图片")]
    [SerializeField] private Image minimapBorder;

    [Tooltip("玩家方向指示器（小地图中心的箭头）")]
    [SerializeField] private RectTransform playerIndicator;

    [Tooltip("方位标记（N、S、E、W）")]
    [SerializeField] private RectTransform compassRing;

    [Header("旋转模式")]
    [Tooltip("是否随玩家旋转（true = 地图旋转，false = 固定北方朝上）")]
    [SerializeField] private bool rotateWithPlayer = true;

    [Header("缩放配置")]
    [Tooltip("当前正交大小（控制显示范围）")]
    [SerializeField] private float currentZoom = 30f;

    [Tooltip("最小缩放（放大到最近）")]
    [SerializeField] private float minZoom = 15f;

    [Tooltip("最大缩放（缩小看更远）")]
    [SerializeField] private float maxZoom = 80f;

    [Tooltip("缩放速度")]
    [SerializeField] private float zoomSpeed = 10f;

    [Tooltip("缩放平滑度")]
    [SerializeField] private float zoomSmoothness = 5f;

    [Header("图层配置")]
    [Tooltip("小地图要显示的图层")]
    [SerializeField] private LayerMask minimapLayers;

    // 目标缩放值（用于平滑过渡）
    private float targetZoom;

    // 是否显示小地图
    private bool isMinimapVisible = true;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        targetZoom = currentZoom;
    }

    private void Start()
    {
        // 初始化摄像机设置
        if (minimapCamera != null)
        {
            minimapCamera.orthographic = true;
            minimapCamera.orthographicSize = currentZoom;
            minimapCamera.cullingMask = minimapLayers;

            // 确保小地图摄像机不渲染 UI 层
            minimapCamera.cullingMask &= ~(1 << LayerMask.NameToLayer("UI"));
        }

        // 如果没有设置跟随目标，尝试找到玩家
        if (followTarget == null)
        {
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
                followTarget = player.transform;
        }
    }

    /// <summary>
    /// 使用 LateUpdate 确保在玩家移动之后更新小地图
    /// 类似前端中 useLayoutEffect（在DOM更新后执行）
    /// </summary>
    private void LateUpdate()
    {
        if (followTarget == null || minimapCamera == null) return;

        // 1. 更新摄像机位置 —— 跟随玩家，但保持在高空
        UpdateCameraPosition();

        // 2. 更新旋转
        UpdateCameraRotation();

        // 3. 更新缩放
        UpdateZoom();

        // 4. 更新玩家方向指示器
        UpdatePlayerIndicator();

        // 5. 更新方位标记
        UpdateCompass();
    }

    /// <summary>
    /// 更新摄像机位置 —— 让摄像机始终在玩家正上方
    /// </summary>
    private void UpdateCameraPosition()
    {
        Vector3 targetPosition = followTarget.position;
        targetPosition.y = cameraHeight; // 固定高度
        minimapCamera.transform.position = targetPosition;
    }

    /// <summary>
    /// 更新摄像机旋转
    /// 两种模式：
    /// 1. 随玩家旋转 —— 玩家始终朝上，地图旋转
    /// 2. 固定北方 —— 地图不旋转，玩家箭头旋转
    /// </summary>
    private void UpdateCameraRotation()
    {
        if (rotateWithPlayer)
        {
            // 模式1：摄像机跟随玩家Y轴旋转
            // 这样玩家在小地图上始终朝上
            float playerYRotation = followTarget.eulerAngles.y;
            minimapCamera.transform.rotation = Quaternion.Euler(90f, playerYRotation, 0f);
        }
        else
        {
            // 模式2：摄像机固定朝北
            minimapCamera.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        }
    }

    /// <summary>
    /// 更新缩放
    /// </summary>
    private void UpdateZoom()
    {
        // 检查缩放输入
        float scrollInput = Input.GetAxis("Mouse ScrollWheel");

        // 也可以用按钮缩放
        if (Input.GetKey(KeyCode.Equals) || Input.GetKey(KeyCode.KeypadPlus))
            scrollInput = 0.1f;
        if (Input.GetKey(KeyCode.Minus) || Input.GetKey(KeyCode.KeypadMinus))
            scrollInput = -0.1f;

        if (Mathf.Abs(scrollInput) > 0.01f)
        {
            // 负值 = 放大（靠近），正值 = 缩小（远离）
            // 注意：这里是反直觉的，scroll up（正值）通常代表放大
            targetZoom -= scrollInput * zoomSpeed;
            targetZoom = Mathf.Clamp(targetZoom, minZoom, maxZoom);
        }

        // 平滑过渡到目标缩放值
        // 类似前端中用 CSS transition 或 requestAnimationFrame 实现的平滑动画
        currentZoom = Mathf.Lerp(currentZoom, targetZoom, Time.deltaTime * zoomSmoothness);
        minimapCamera.orthographicSize = currentZoom;
    }

    /// <summary>
    /// 更新玩家方向指示器
    /// 在固定北方模式下，箭头需要旋转来指示玩家朝向
    /// </summary>
    private void UpdatePlayerIndicator()
    {
        if (playerIndicator == null) return;

        if (rotateWithPlayer)
        {
            // 随玩家旋转模式：箭头始终朝上（玩家始终朝上）
            playerIndicator.localRotation = Quaternion.identity;
        }
        else
        {
            // 固定北方模式：箭头旋转指示玩家朝向
            float playerYRotation = followTarget.eulerAngles.y;
            playerIndicator.localRotation = Quaternion.Euler(0, 0, -playerYRotation);
        }
    }

    /// <summary>
    /// 更新指南针方位标记
    /// </summary>
    private void UpdateCompass()
    {
        if (compassRing == null) return;

        if (rotateWithPlayer)
        {
            // 随玩家旋转模式：指南针环需要反向旋转，使 N 始终指向北方
            float playerYRotation = followTarget.eulerAngles.y;
            compassRing.localRotation = Quaternion.Euler(0, 0, playerYRotation);
        }
        else
        {
            // 固定北方模式：指南针不旋转
            compassRing.localRotation = Quaternion.identity;
        }
    }

    // ==================== 公共方法 ====================

    /// <summary>
    /// 切换旋转模式
    /// </summary>
    public void ToggleRotationMode()
    {
        rotateWithPlayer = !rotateWithPlayer;
        Debug.Log($"[小地图] 旋转模式：{(rotateWithPlayer ? "跟随玩家" : "固定北方")}");
    }

    /// <summary>
    /// 设置缩放级别
    /// </summary>
    public void SetZoom(float zoom)
    {
        targetZoom = Mathf.Clamp(zoom, minZoom, maxZoom);
    }

    /// <summary>
    /// 放大
    /// </summary>
    public void ZoomIn()
    {
        targetZoom = Mathf.Max(targetZoom - zoomSpeed, minZoom);
    }

    /// <summary>
    /// 缩小
    /// </summary>
    public void ZoomOut()
    {
        targetZoom = Mathf.Min(targetZoom + zoomSpeed, maxZoom);
    }

    /// <summary>
    /// 切换小地图显示/隐藏
    /// </summary>
    public void ToggleVisibility()
    {
        isMinimapVisible = !isMinimapVisible;
        minimapImage?.gameObject.SetActive(isMinimapVisible);
        minimapBorder?.gameObject.SetActive(isMinimapVisible);
        minimapCamera.enabled = isMinimapVisible;
    }

    /// <summary>
    /// 将世界坐标转换为小地图上的UI坐标
    /// 这在放置图标时非常有用
    ///
    /// 类似前端中将地理坐标转换为像素坐标：
    /// pixelX = (longitude - mapLeft) / mapWidth * canvasWidth
    /// </summary>
    public Vector2 WorldToMinimapPosition(Vector3 worldPosition)
    {
        if (minimapCamera == null || minimapImage == null)
            return Vector2.zero;

        // 使用小地图摄像机将世界坐标转换为视口坐标（0-1范围）
        Vector3 viewportPos = minimapCamera.WorldToViewportPoint(worldPosition);

        // 将视口坐标转换为小地图 RawImage 的本地坐标
        RectTransform minimapRect = minimapImage.rectTransform;
        Vector2 minimapSize = minimapRect.sizeDelta;

        // 视口坐标(0,0)在左下，(1,1)在右上
        // 转换为以中心为原点的坐标
        Vector2 minimapPos = new Vector2(
            (viewportPos.x - 0.5f) * minimapSize.x,
            (viewportPos.y - 0.5f) * minimapSize.y
        );

        return minimapPos;
    }

    /// <summary>
    /// 检查世界坐标是否在小地图可见范围内
    /// </summary>
    public bool IsPositionVisible(Vector3 worldPosition)
    {
        if (minimapCamera == null) return false;

        Vector3 viewportPos = minimapCamera.WorldToViewportPoint(worldPosition);
        return viewportPos.x >= 0f && viewportPos.x <= 1f &&
               viewportPos.y >= 0f && viewportPos.y <= 1f &&
               viewportPos.z > 0f;
    }
}
```

[截图：小地图摄像机在 Scene 视图中的位置（高空俯视）]

[截图：两种旋转模式的对比效果]

---

## 22.3 小地图图标系统

### 22.3.1 MinimapIcon.cs —— 小地图图标

创建 `Scripts/UI/Minimap/MinimapIcon.cs`：

```csharp
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 小地图图标类型枚举
/// </summary>
public enum MinimapIconType
{
    Player,         // 玩家
    NPC,            // 友好 NPC
    Enemy,          // 敌人
    QuestGiver,     // 任务发布者（有新任务）
    QuestObjective, // 任务目标位置
    POI,            // 兴趣点（Point of Interest）
    Shop,           // 商店
    Waypoint,       // 路标
    FastTravel,     // 快速传送点
    Custom          // 自定义
}

/// <summary>
/// 小地图图标 —— 挂载在需要在小地图上显示的游戏对象上
///
/// 工作原理：
/// 1. 这个脚本挂载在 3D 世界中的对象上（NPC、敌人等）
/// 2. 它在小地图 UI 上创建一个对应的图标（UI Image）
/// 3. 每帧将 3D 世界坐标转换为小地图 UI 坐标，更新图标位置
///
/// 类似前端中在 Google Maps 上添加 Marker：
/// new google.maps.Marker({ position: { lat, lng }, map: map, icon: iconUrl })
/// </summary>
public class MinimapIcon : MonoBehaviour
{
    [Header("图标配置")]
    [Tooltip("图标类型")]
    [SerializeField] private MinimapIconType iconType = MinimapIconType.NPC;

    [Tooltip("自定义图标（如果不使用默认图标）")]
    [SerializeField] private Sprite customIcon;

    [Tooltip("图标颜色")]
    [SerializeField] private Color iconColor = Color.white;

    [Tooltip("图标大小")]
    [SerializeField] private float iconSize = 20f;

    [Tooltip("是否在小地图范围外时仍显示（贴边显示）")]
    [SerializeField] private bool showWhenOutOfRange = false;

    [Tooltip("是否随目标旋转（如玩家箭头）")]
    [SerializeField] private bool rotateWithTarget = false;

    [Tooltip("显示条件：最大显示距离（0=始终显示）")]
    [SerializeField] private float maxDisplayDistance = 0f;

    [Tooltip("是否在世界地图上也显示")]
    [SerializeField] private bool showOnWorldMap = true;

    [Header("动画")]
    [Tooltip("是否有脉冲动画（如任务目标闪烁）")]
    [SerializeField] private bool hasPulseAnimation = false;

    [Tooltip("脉冲速度")]
    [SerializeField] private float pulseSpeed = 2f;

    [Tooltip("脉冲大小范围")]
    [SerializeField] private float pulseMinScale = 0.8f;
    [SerializeField] private float pulseMaxScale = 1.2f;

    // UI 图标实例（在小地图上的）
    private RectTransform iconRectTransform;
    private Image iconImage;
    private GameObject iconGameObject;

    // 是否已初始化
    private bool isInitialized = false;

    // 引用
    private MinimapController minimapController;

    // === 公共属性 ===
    public MinimapIconType IconType => iconType;
    public bool ShowOnWorldMap => showOnWorldMap;
    public Vector3 WorldPosition => transform.position;

    private void Start()
    {
        // 延迟初始化，确保小地图控制器已经准备好
        Invoke(nameof(Initialize), 0.1f);
    }

    /// <summary>
    /// 初始化图标 —— 在小地图 UI 上创建对应的 Image
    /// </summary>
    private void Initialize()
    {
        minimapController = MinimapController.Instance;
        if (minimapController == null)
        {
            Debug.LogWarning("[小地图图标] MinimapController 未找到");
            return;
        }

        // 获取图标容器（小地图上放图标的父对象）
        Transform iconContainer = MinimapIconManager.Instance?.IconContainer;
        if (iconContainer == null)
        {
            Debug.LogWarning("[小地图图标] 图标容器未找到");
            return;
        }

        // 创建 UI 图标对象
        iconGameObject = new GameObject($"MinimapIcon_{gameObject.name}");
        iconGameObject.transform.SetParent(iconContainer, false);

        // 添加 Image 组件
        iconImage = iconGameObject.AddComponent<Image>();
        iconImage.sprite = GetIconSprite();
        iconImage.color = iconColor;
        iconImage.raycastTarget = false; // 不接收射线检测，避免影响点击

        // 设置 RectTransform
        iconRectTransform = iconGameObject.GetComponent<RectTransform>();
        iconRectTransform.sizeDelta = new Vector2(iconSize, iconSize);

        isInitialized = true;
    }

    /// <summary>
    /// 获取图标 Sprite
    /// </summary>
    private Sprite GetIconSprite()
    {
        if (customIcon != null) return customIcon;

        // 使用 MinimapIconManager 提供的默认图标
        return MinimapIconManager.Instance?.GetDefaultIcon(iconType);
    }

    private void LateUpdate()
    {
        if (!isInitialized || minimapController == null || iconGameObject == null) return;

        // 检查距离限制
        if (maxDisplayDistance > 0f)
        {
            Transform player = minimapController.transform; // 简化：使用控制器位置
            float distance = Vector3.Distance(transform.position, player.position);
            if (distance > maxDisplayDistance)
            {
                iconGameObject.SetActive(false);
                return;
            }
        }

        // 检查是否在小地图可见范围内
        bool isVisible = minimapController.IsPositionVisible(transform.position);

        if (!isVisible && !showWhenOutOfRange)
        {
            iconGameObject.SetActive(false);
            return;
        }

        iconGameObject.SetActive(true);

        // 更新位置 —— 将世界坐标转换为小地图UI坐标
        Vector2 minimapPos = minimapController.WorldToMinimapPosition(transform.position);
        iconRectTransform.anchoredPosition = minimapPos;

        // 如果超出范围但需要贴边显示
        if (!isVisible && showWhenOutOfRange)
        {
            ClampToMinimapEdge();
        }

        // 更新旋转
        if (rotateWithTarget)
        {
            float yRotation = transform.eulerAngles.y;
            iconRectTransform.localRotation = Quaternion.Euler(0, 0, -yRotation);
        }

        // 更新脉冲动画
        if (hasPulseAnimation)
        {
            float pulse = Mathf.Lerp(pulseMinScale, pulseMaxScale,
                (Mathf.Sin(Time.time * pulseSpeed) + 1f) / 2f);
            iconRectTransform.localScale = Vector3.one * pulse;
        }
    }

    /// <summary>
    /// 将图标位置限制在小地图边缘（用于超出范围的目标）
    /// </summary>
    private void ClampToMinimapEdge()
    {
        // 获取小地图的半径（假设是圆形）
        float radius = iconRectTransform.parent.GetComponent<RectTransform>()?.sizeDelta.x / 2f ?? 100f;
        radius -= iconSize / 2f; // 留出图标本身的空间

        Vector2 pos = iconRectTransform.anchoredPosition;
        float distance = pos.magnitude;

        if (distance > radius)
        {
            // 限制到圆形边缘
            iconRectTransform.anchoredPosition = pos.normalized * radius;
        }
    }

    /// <summary>
    /// 更新图标颜色（可在运行时改变）
    /// </summary>
    public void SetColor(Color color)
    {
        iconColor = color;
        if (iconImage != null)
            iconImage.color = color;
    }

    /// <summary>
    /// 更新图标类型
    /// </summary>
    public void SetIconType(MinimapIconType type)
    {
        iconType = type;
        if (iconImage != null)
            iconImage.sprite = GetIconSprite();
    }

    /// <summary>
    /// 显示/隐藏图标
    /// </summary>
    public void SetVisible(bool visible)
    {
        if (iconGameObject != null)
            iconGameObject.SetActive(visible);
    }

    private void OnDestroy()
    {
        // 清理 UI 图标 —— 类似前端中 useEffect 的 cleanup 函数
        if (iconGameObject != null)
        {
            Destroy(iconGameObject);
        }
    }
}

/// <summary>
/// 小地图图标管理器 —— 管理默认图标资源和图标容器
/// </summary>
public class MinimapIconManager : MonoBehaviour
{
    public static MinimapIconManager Instance { get; private set; }

    [Header("图标容器")]
    [Tooltip("小地图上放置图标的父对象")]
    [SerializeField] private Transform iconContainer;

    [Header("默认图标")]
    [SerializeField] private Sprite playerIcon;
    [SerializeField] private Sprite npcIcon;
    [SerializeField] private Sprite enemyIcon;
    [SerializeField] private Sprite questGiverIcon;
    [SerializeField] private Sprite questObjectiveIcon;
    [SerializeField] private Sprite poiIcon;
    [SerializeField] private Sprite shopIcon;
    [SerializeField] private Sprite waypointIcon;
    [SerializeField] private Sprite fastTravelIcon;

    public Transform IconContainer => iconContainer;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    /// <summary>
    /// 根据类型获取默认图标
    /// 类似前端中的图标映射表：const iconMap = { npc: npcSvg, enemy: enemySvg, ... }
    /// </summary>
    public Sprite GetDefaultIcon(MinimapIconType type)
    {
        switch (type)
        {
            case MinimapIconType.Player: return playerIcon;
            case MinimapIconType.NPC: return npcIcon;
            case MinimapIconType.Enemy: return enemyIcon;
            case MinimapIconType.QuestGiver: return questGiverIcon;
            case MinimapIconType.QuestObjective: return questObjectiveIcon;
            case MinimapIconType.POI: return poiIcon;
            case MinimapIconType.Shop: return shopIcon;
            case MinimapIconType.Waypoint: return waypointIcon;
            case MinimapIconType.FastTravel: return fastTravelIcon;
            default: return poiIcon;
        }
    }
}
```

[截图：小地图上显示的各种类型图标（玩家箭头、NPC点、敌人红点、任务标记等）]

---

## 22.4 战争迷雾系统

### 22.4.1 战争迷雾原理

**战争迷雾**（Fog of War）是一种经典的游戏机制：
- 玩家未探索过的区域在地图上是黑色/灰色遮蔽的
- 当玩家到达某个区域时，该区域被"揭开"
- 已探索但当前不在视野内的区域显示为半透明

实现方式：使用一张纹理作为遮罩，玩家探索到哪里就"擦除"对应的遮罩区域。

### 22.4.2 FogOfWar.cs —— 战争迷雾

创建 `Scripts/UI/Minimap/FogOfWar.cs`：

```csharp
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 战争迷雾系统 —— 在小地图和世界地图上遮蔽未探索区域
///
/// 实现原理：
/// 1. 创建一张与地图对应的纹理（Texture2D）
/// 2. 初始时全部为黑色（未探索）
/// 3. 玩家移动时，在对应位置"擦除"一个圆形区域
/// 4. 将此纹理叠加在小地图上作为遮罩
///
/// 类似前端中在 <canvas> 上绘图：
/// ctx.beginPath();
/// ctx.arc(x, y, radius, 0, Math.PI * 2);
/// ctx.fill(); // 在迷雾纹理上"擦除"一个圆
/// </summary>
public class FogOfWar : MonoBehaviour
{
    public static FogOfWar Instance { get; private set; }

    [Header("迷雾配置")]
    [Tooltip("迷雾纹理分辨率（越高越精细，但越耗内存）")]
    [SerializeField] private int fogResolution = 256;

    [Tooltip("地图世界尺寸（宽度和高度，需要与实际地图匹配）")]
    [SerializeField] private Vector2 worldSize = new Vector2(500f, 500f);

    [Tooltip("地图世界原点（左下角的世界坐标）")]
    [SerializeField] private Vector2 worldOrigin = new Vector2(-250f, -250f);

    [Tooltip("探索半径（玩家周围多大范围会被揭开）")]
    [SerializeField] private float explorationRadius = 30f;

    [Tooltip("探索边缘的渐变宽度")]
    [SerializeField] private float edgeSoftness = 5f;

    [Tooltip("已探索但不在当前视野的透明度（0=完全可见，1=完全遮蔽）")]
    [SerializeField] private float exploredAlpha = 0.3f;

    [Tooltip("未探索区域的颜色")]
    [SerializeField] private Color unexploredColor = new Color(0.1f, 0.1f, 0.15f, 0.9f);

    [Header("UI 引用")]
    [Tooltip("小地图迷雾覆盖层 RawImage")]
    [SerializeField] private RawImage minimapFogOverlay;

    [Tooltip("世界地图迷雾覆盖层 RawImage")]
    [SerializeField] private RawImage worldMapFogOverlay;

    [Header("性能")]
    [Tooltip("更新间隔（秒），不需要每帧更新")]
    [SerializeField] private float updateInterval = 0.2f;

    [Tooltip("跟随的目标（玩家）")]
    [SerializeField] private Transform followTarget;

    // 迷雾纹理
    private Texture2D fogTexture;

    // 探索状态数组（每个像素的探索状态）
    // 0 = 未探索，1 = 已探索
    private float[,] explorationData;

    // 像素颜色缓冲区
    private Color[] pixelBuffer;

    // 计时器
    private float updateTimer;

    // 上一次玩家位置（避免不移动时重复更新）
    private Vector3 lastPlayerPosition;
    private float positionChangeThreshold = 1f;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private void Start()
    {
        InitializeFogTexture();

        // 找到玩家
        if (followTarget == null)
        {
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
                followTarget = player.transform;
        }

        if (followTarget != null)
            lastPlayerPosition = followTarget.position;
    }

    /// <summary>
    /// 初始化迷雾纹理
    /// 类似前端中创建一个 canvas 并填充黑色背景
    /// </summary>
    private void InitializeFogTexture()
    {
        // 创建纹理
        fogTexture = new Texture2D(fogResolution, fogResolution, TextureFormat.RGBA32, false);
        fogTexture.filterMode = FilterMode.Bilinear; // 双线性过滤，使边缘更平滑
        fogTexture.wrapMode = TextureWrapMode.Clamp;

        // 初始化探索数据
        explorationData = new float[fogResolution, fogResolution];

        // 初始化像素缓冲区 —— 全部为未探索颜色
        pixelBuffer = new Color[fogResolution * fogResolution];
        for (int i = 0; i < pixelBuffer.Length; i++)
        {
            pixelBuffer[i] = unexploredColor;
        }

        // 应用到纹理
        fogTexture.SetPixels(pixelBuffer);
        fogTexture.Apply();

        // 设置到 UI 上
        if (minimapFogOverlay != null)
            minimapFogOverlay.texture = fogTexture;
        if (worldMapFogOverlay != null)
            worldMapFogOverlay.texture = fogTexture;
    }

    private void Update()
    {
        if (followTarget == null) return;

        updateTimer += Time.deltaTime;
        if (updateTimer < updateInterval) return;
        updateTimer = 0f;

        // 检查玩家是否移动了足够的距离
        float distanceMoved = Vector3.Distance(followTarget.position, lastPlayerPosition);
        if (distanceMoved < positionChangeThreshold) return;

        lastPlayerPosition = followTarget.position;

        // 揭开玩家周围的迷雾
        RevealArea(followTarget.position, explorationRadius);
    }

    /// <summary>
    /// 揭开指定位置周围的迷雾
    ///
    /// 类似前端中在 canvas 上用 radialGradient 绘制一个圆形渐变区域
    /// </summary>
    public void RevealArea(Vector3 worldPosition, float radius)
    {
        // 将世界坐标转换为纹理坐标
        Vector2Int centerPixel = WorldToPixel(worldPosition);
        int pixelRadius = Mathf.CeilToInt(radius / worldSize.x * fogResolution);
        int pixelSoftness = Mathf.CeilToInt(edgeSoftness / worldSize.x * fogResolution);

        bool textureChanged = false;

        // 遍历半径内的所有像素
        for (int x = -pixelRadius; x <= pixelRadius; x++)
        {
            for (int y = -pixelRadius; y <= pixelRadius; y++)
            {
                int px = centerPixel.x + x;
                int py = centerPixel.y + y;

                // 边界检查
                if (px < 0 || px >= fogResolution || py < 0 || py >= fogResolution)
                    continue;

                // 计算到中心的距离
                float dist = Mathf.Sqrt(x * x + y * y);

                if (dist <= pixelRadius)
                {
                    // 计算探索值（边缘渐变）
                    float explorationValue;
                    if (dist <= pixelRadius - pixelSoftness)
                    {
                        explorationValue = 1f; // 完全探索
                    }
                    else
                    {
                        // 边缘渐变
                        explorationValue = 1f - ((dist - (pixelRadius - pixelSoftness)) / pixelSoftness);
                    }

                    // 只增加探索度，不减少（一旦探索就不会重新变黑）
                    if (explorationValue > explorationData[px, py])
                    {
                        explorationData[px, py] = explorationValue;
                        textureChanged = true;

                        // 更新像素颜色
                        int pixelIndex = py * fogResolution + px;
                        float alpha = Mathf.Lerp(unexploredColor.a, 0f, explorationValue);
                        pixelBuffer[pixelIndex] = new Color(
                            unexploredColor.r,
                            unexploredColor.g,
                            unexploredColor.b,
                            alpha
                        );
                    }
                }
            }
        }

        // 只有在有变化时才更新纹理（性能优化）
        if (textureChanged)
        {
            fogTexture.SetPixels(pixelBuffer);
            fogTexture.Apply();
        }
    }

    /// <summary>
    /// 揭开所有迷雾（用于调试或全地图揭示道具）
    /// </summary>
    public void RevealAll()
    {
        for (int x = 0; x < fogResolution; x++)
        {
            for (int y = 0; y < fogResolution; y++)
            {
                explorationData[x, y] = 1f;
                pixelBuffer[y * fogResolution + x] = Color.clear;
            }
        }

        fogTexture.SetPixels(pixelBuffer);
        fogTexture.Apply();
    }

    /// <summary>
    /// 重置迷雾（全部变为未探索）
    /// </summary>
    public void ResetFog()
    {
        for (int x = 0; x < fogResolution; x++)
        {
            for (int y = 0; y < fogResolution; y++)
            {
                explorationData[x, y] = 0f;
                pixelBuffer[y * fogResolution + x] = unexploredColor;
            }
        }

        fogTexture.SetPixels(pixelBuffer);
        fogTexture.Apply();
    }

    /// <summary>
    /// 检查某个位置是否已被探索
    /// </summary>
    public bool IsExplored(Vector3 worldPosition)
    {
        Vector2Int pixel = WorldToPixel(worldPosition);
        if (pixel.x < 0 || pixel.x >= fogResolution || pixel.y < 0 || pixel.y >= fogResolution)
            return false;

        return explorationData[pixel.x, pixel.y] > 0.5f;
    }

    /// <summary>
    /// 获取某个位置的探索度（0-1）
    /// </summary>
    public float GetExplorationLevel(Vector3 worldPosition)
    {
        Vector2Int pixel = WorldToPixel(worldPosition);
        if (pixel.x < 0 || pixel.x >= fogResolution || pixel.y < 0 || pixel.y >= fogResolution)
            return 0f;

        return explorationData[pixel.x, pixel.y];
    }

    /// <summary>
    /// 世界坐标转纹理像素坐标
    /// </summary>
    private Vector2Int WorldToPixel(Vector3 worldPosition)
    {
        // 将世界坐标映射到 0-1 范围
        float normalizedX = (worldPosition.x - worldOrigin.x) / worldSize.x;
        float normalizedZ = (worldPosition.z - worldOrigin.y) / worldSize.y;

        // 转为像素坐标
        int pixelX = Mathf.FloorToInt(normalizedX * fogResolution);
        int pixelZ = Mathf.FloorToInt(normalizedZ * fogResolution);

        return new Vector2Int(
            Mathf.Clamp(pixelX, 0, fogResolution - 1),
            Mathf.Clamp(pixelZ, 0, fogResolution - 1)
        );
    }

    // ==================== 存档相关 ====================

    /// <summary>
    /// 导出探索数据（用于存档）
    /// </summary>
    public byte[] ExportExplorationData()
    {
        byte[] data = new byte[fogResolution * fogResolution];
        for (int x = 0; x < fogResolution; x++)
        {
            for (int y = 0; y < fogResolution; y++)
            {
                data[y * fogResolution + x] = (byte)(explorationData[x, y] * 255f);
            }
        }
        return data;
    }

    /// <summary>
    /// 导入探索数据（从存档加载）
    /// </summary>
    public void ImportExplorationData(byte[] data)
    {
        if (data == null || data.Length != fogResolution * fogResolution) return;

        for (int x = 0; x < fogResolution; x++)
        {
            for (int y = 0; y < fogResolution; y++)
            {
                float value = data[y * fogResolution + x] / 255f;
                explorationData[x, y] = value;

                float alpha = Mathf.Lerp(unexploredColor.a, 0f, value);
                pixelBuffer[y * fogResolution + x] = new Color(
                    unexploredColor.r, unexploredColor.g, unexploredColor.b, alpha);
            }
        }

        fogTexture.SetPixels(pixelBuffer);
        fogTexture.Apply();
    }
}
```

[截图：小地图上的战争迷雾效果 —— 已探索区域清晰，未探索区域被黑色遮蔽]

[截图：玩家移动时迷雾逐渐揭开的过程]

---

## 22.5 全屏世界地图

### 22.5.1 WorldMapUI.cs —— 世界地图面板

创建 `Scripts/UI/Minimap/WorldMapUI.cs`：

```csharp
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// 世界地图 UI —— 全屏地图界面
///
/// 功能：
/// 1. 全屏显示整个游戏世界的地图
/// 2. 可拖拽平移、可缩放
/// 3. 显示各种图标和标签
/// 4. 支持自定义标记（大头针）
/// 5. 快速传送功能
/// 6. 设置路标
///
/// 类似前端中的全屏地图组件（如百度地图/高德地图的全屏模式）
/// </summary>
public class WorldMapUI : MonoBehaviour, IDragHandler, IScrollHandler
{
    [Header("面板引用")]
    [Tooltip("世界地图面板根对象")]
    [SerializeField] private GameObject worldMapPanel;

    [Tooltip("地图图片（包含世界地图的纹理）")]
    [SerializeField] private RectTransform mapContent;

    [Tooltip("地图底图 Image")]
    [SerializeField] private Image mapImage;

    [Tooltip("图标容器（放在 mapContent 下）")]
    [SerializeField] private Transform iconContainer;

    [Tooltip("标记容器")]
    [SerializeField] private Transform markerContainer;

    [Header("缩放配置")]
    [Tooltip("最小缩放")]
    [SerializeField] private float minScale = 0.5f;

    [Tooltip("最大缩放")]
    [SerializeField] private float maxScale = 3f;

    [Tooltip("缩放速度")]
    [SerializeField] private float scrollZoomSpeed = 0.1f;

    [Header("地图配置")]
    [Tooltip("地图对应的世界区域大小")]
    [SerializeField] private Vector2 worldSize = new Vector2(500f, 500f);

    [Tooltip("地图对应的世界原点")]
    [SerializeField] private Vector2 worldOrigin = new Vector2(-250f, -250f);

    [Header("标记")]
    [Tooltip("自定义标记预制体")]
    [SerializeField] private GameObject markerPrefab;

    [Tooltip("标记最大数量")]
    [SerializeField] private int maxMarkers = 10;

    [Header("快速传送")]
    [Tooltip("快速传送确认面板")]
    [SerializeField] private GameObject fastTravelConfirmPanel;

    [Tooltip("快速传送目标名称文本")]
    [SerializeField] private TextMeshProUGUI fastTravelNameText;

    [Tooltip("快速传送确认按钮")]
    [SerializeField] private Button fastTravelConfirmButton;

    [Tooltip("快速传送取消按钮")]
    [SerializeField] private Button fastTravelCancelButton;

    [Header("信息面板")]
    [Tooltip("位置信息面板")]
    [SerializeField] private GameObject infoPanel;

    [Tooltip("位置名称文本")]
    [SerializeField] private TextMeshProUGUI locationNameText;

    [Tooltip("位置坐标文本")]
    [SerializeField] private TextMeshProUGUI coordinateText;

    [Header("快捷键")]
    [SerializeField] private KeyCode toggleKey = KeyCode.M;

    // 状态
    private bool isOpen = false;
    private float currentScale = 1f;

    // 自定义标记列表
    private List<MapMarker> customMarkers = new List<MapMarker>();

    // 快速传送点列表
    private List<FastTravelPoint> fastTravelPoints = new List<FastTravelPoint>();
    private FastTravelPoint selectedFastTravel;

    // 地图图标（世界地图上的）
    private List<WorldMapIcon> worldMapIcons = new List<WorldMapIcon>();

    // 玩家在地图上的标记
    private RectTransform playerMapIcon;

    private void Start()
    {
        worldMapPanel?.SetActive(false);
        fastTravelConfirmPanel?.SetActive(false);

        fastTravelConfirmButton?.onClick.AddListener(OnConfirmFastTravel);
        fastTravelCancelButton?.onClick.AddListener(() => fastTravelConfirmPanel?.SetActive(false));
    }

    private void Update()
    {
        if (Input.GetKeyDown(toggleKey))
        {
            ToggleWorldMap();
        }

        if (isOpen)
        {
            // 右键点击放置标记
            if (Input.GetMouseButtonDown(1))
            {
                PlaceMarkerAtCursor();
            }

            // 更新玩家位置
            UpdatePlayerPosition();
        }
    }

    /// <summary>
    /// 切换世界地图显示
    /// </summary>
    public void ToggleWorldMap()
    {
        isOpen = !isOpen;
        worldMapPanel?.SetActive(isOpen);

        if (isOpen)
        {
            // 打开地图时暂停游戏
            Time.timeScale = 0f;

            // 刷新图标
            RefreshMapIcons();

            // 居中到玩家位置
            CenterOnPlayer();
        }
        else
        {
            Time.timeScale = 1f;
            fastTravelConfirmPanel?.SetActive(false);
        }
    }

    /// <summary>
    /// 处理拖拽平移 —— 实现 IDragHandler 接口
    /// 类似前端中的 mousedown + mousemove 拖拽逻辑
    /// </summary>
    public void OnDrag(PointerEventData eventData)
    {
        if (mapContent == null) return;

        // 将鼠标移动量应用到地图位置
        mapContent.anchoredPosition += eventData.delta / currentScale;
    }

    /// <summary>
    /// 处理滚轮缩放 —— 实现 IScrollHandler 接口
    /// 类似前端中的 wheel 事件缩放
    /// </summary>
    public void OnScroll(PointerEventData eventData)
    {
        float scrollDelta = eventData.scrollDelta.y;
        float newScale = currentScale + scrollDelta * scrollZoomSpeed;
        newScale = Mathf.Clamp(newScale, minScale, maxScale);

        // 以鼠标位置为中心缩放（类似 Google Maps 的缩放行为）
        if (mapContent != null)
        {
            float scaleFactor = newScale / currentScale;

            // 计算鼠标相对于地图内容的位置
            Vector2 localPoint;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                mapContent, eventData.position, eventData.pressEventCamera, out localPoint);

            // 调整位置使缩放以鼠标位置为中心
            mapContent.anchoredPosition -= localPoint * (scaleFactor - 1f);
        }

        currentScale = newScale;
        mapContent.localScale = Vector3.one * currentScale;
    }

    /// <summary>
    /// 将世界坐标转换为地图上的 UI 坐标
    /// </summary>
    public Vector2 WorldToMapPosition(Vector3 worldPosition)
    {
        if (mapContent == null) return Vector2.zero;

        // 归一化世界坐标（0-1范围）
        float normalizedX = (worldPosition.x - worldOrigin.x) / worldSize.x;
        float normalizedZ = (worldPosition.z - worldOrigin.y) / worldSize.y;

        // 转换为地图 UI 坐标
        Vector2 mapSize = mapContent.sizeDelta;
        return new Vector2(
            (normalizedX - 0.5f) * mapSize.x,
            (normalizedZ - 0.5f) * mapSize.y
        );
    }

    /// <summary>
    /// 将地图 UI 坐标转换回世界坐标
    /// </summary>
    public Vector3 MapToWorldPosition(Vector2 mapPosition)
    {
        if (mapContent == null) return Vector3.zero;

        Vector2 mapSize = mapContent.sizeDelta;

        // 从 UI 坐标转为归一化坐标
        float normalizedX = (mapPosition.x / mapSize.x) + 0.5f;
        float normalizedZ = (mapPosition.y / mapSize.y) + 0.5f;

        // 转为世界坐标
        float worldX = normalizedX * worldSize.x + worldOrigin.x;
        float worldZ = normalizedZ * worldSize.y + worldOrigin.y;

        return new Vector3(worldX, 0f, worldZ);
    }

    /// <summary>
    /// 居中到玩家位置
    /// </summary>
    private void CenterOnPlayer()
    {
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null || mapContent == null) return;

        Vector2 playerMapPos = WorldToMapPosition(player.transform.position);
        mapContent.anchoredPosition = -playerMapPos * currentScale;
    }

    /// <summary>
    /// 更新玩家在地图上的位置
    /// </summary>
    private void UpdatePlayerPosition()
    {
        if (playerMapIcon == null) return;

        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null) return;

        Vector2 mapPos = WorldToMapPosition(player.transform.position);
        playerMapIcon.anchoredPosition = mapPos;

        // 旋转指示方向
        float yRotation = player.transform.eulerAngles.y;
        playerMapIcon.localRotation = Quaternion.Euler(0, 0, -yRotation);
    }

    /// <summary>
    /// 刷新地图上的所有图标
    /// </summary>
    private void RefreshMapIcons()
    {
        // 清除旧图标
        foreach (var icon in worldMapIcons)
        {
            if (icon.gameObject != null)
                Destroy(icon.gameObject);
        }
        worldMapIcons.Clear();

        // 查找场景中所有 MinimapIcon 组件
        MinimapIcon[] allIcons = FindObjectsOfType<MinimapIcon>();

        foreach (var minimapIcon in allIcons)
        {
            if (!minimapIcon.ShowOnWorldMap) continue;

            // 在世界地图上创建对应图标
            CreateWorldMapIcon(minimapIcon);
        }
    }

    /// <summary>
    /// 在世界地图上创建图标
    /// </summary>
    private void CreateWorldMapIcon(MinimapIcon minimapIcon)
    {
        if (iconContainer == null) return;

        // 创建图标 UI
        GameObject iconObj = new GameObject($"WorldMapIcon_{minimapIcon.gameObject.name}");
        iconObj.transform.SetParent(iconContainer, false);

        Image iconImage = iconObj.AddComponent<Image>();
        iconImage.sprite = MinimapIconManager.Instance?.GetDefaultIcon(minimapIcon.IconType);
        iconImage.color = Color.white;
        iconImage.raycastTarget = true; // 世界地图图标需要可点击

        RectTransform rect = iconObj.GetComponent<RectTransform>();
        rect.sizeDelta = new Vector2(24, 24);

        // 设置位置
        Vector2 mapPos = WorldToMapPosition(minimapIcon.WorldPosition);
        rect.anchoredPosition = mapPos;

        // 添加交互（点击显示信息）
        Button button = iconObj.AddComponent<Button>();
        MinimapIcon capturedIcon = minimapIcon;
        button.onClick.AddListener(() => ShowIconInfo(capturedIcon));

        worldMapIcons.Add(new WorldMapIcon
        {
            gameObject = iconObj,
            sourceIcon = minimapIcon
        });
    }

    /// <summary>
    /// 显示图标信息
    /// </summary>
    private void ShowIconInfo(MinimapIcon icon)
    {
        if (infoPanel == null) return;

        infoPanel.SetActive(true);

        if (locationNameText != null)
            locationNameText.text = icon.gameObject.name;

        if (coordinateText != null)
        {
            Vector3 pos = icon.WorldPosition;
            coordinateText.text = $"坐标：({pos.x:F0}, {pos.z:F0})";
        }

        // 如果是快速传送点，显示传送确认
        if (icon.IconType == MinimapIconType.FastTravel)
        {
            ShowFastTravelConfirm(icon);
        }
    }

    // ==================== 标记系统 ====================

    /// <summary>
    /// 在鼠标位置放置自定义标记
    /// 类似 Google Maps 中的 "添加标记" 功能
    /// </summary>
    private void PlaceMarkerAtCursor()
    {
        if (markerPrefab == null || markerContainer == null) return;

        // 检查数量限制
        if (customMarkers.Count >= maxMarkers)
        {
            // 移除最早的标记
            RemoveMarker(customMarkers[0]);
        }

        // 获取鼠标在地图上的位置
        Vector2 localPoint;
        RectTransformUtility.ScreenPointToLocalPointInRectangle(
            mapContent, Input.mousePosition, null, out localPoint);

        // 创建标记
        GameObject markerObj = Instantiate(markerPrefab, markerContainer);
        RectTransform markerRect = markerObj.GetComponent<RectTransform>();
        markerRect.anchoredPosition = localPoint;

        // 计算对应的世界坐标
        Vector3 worldPos = MapToWorldPosition(localPoint);

        var marker = new MapMarker
        {
            gameObject = markerObj,
            mapPosition = localPoint,
            worldPosition = worldPos,
            label = $"标记 {customMarkers.Count + 1}"
        };

        customMarkers.Add(marker);

        // 设置标记文本
        TextMeshProUGUI markerText = markerObj.GetComponentInChildren<TextMeshProUGUI>();
        if (markerText != null)
            markerText.text = marker.label;

        // 标记的删除按钮
        Button deleteBtn = markerObj.GetComponentInChildren<Button>();
        MapMarker capturedMarker = marker;
        deleteBtn?.onClick.AddListener(() => RemoveMarker(capturedMarker));

        Debug.Log($"[世界地图] 放置标记：{marker.label} 位置：{worldPos}");
    }

    /// <summary>
    /// 移除标记
    /// </summary>
    private void RemoveMarker(MapMarker marker)
    {
        if (marker.gameObject != null)
            Destroy(marker.gameObject);
        customMarkers.Remove(marker);
    }

    /// <summary>
    /// 清除所有自定义标记
    /// </summary>
    public void ClearAllMarkers()
    {
        foreach (var marker in customMarkers)
        {
            if (marker.gameObject != null)
                Destroy(marker.gameObject);
        }
        customMarkers.Clear();
    }

    // ==================== 快速传送 ====================

    /// <summary>
    /// 显示快速传送确认面板
    /// </summary>
    private void ShowFastTravelConfirm(MinimapIcon icon)
    {
        // 查找对应的快速传送点
        FastTravelPoint point = fastTravelPoints.Find(p => p.locationName == icon.gameObject.name);
        if (point == null) return;

        if (!point.isUnlocked)
        {
            Debug.Log($"[快速传送] {point.locationName} 尚未解锁");
            return;
        }

        selectedFastTravel = point;
        fastTravelConfirmPanel?.SetActive(true);

        if (fastTravelNameText != null)
            fastTravelNameText.text = $"传送到：{point.locationName}";
    }

    /// <summary>
    /// 确认快速传送
    /// </summary>
    private void OnConfirmFastTravel()
    {
        if (selectedFastTravel == null) return;

        // 关闭地图
        ToggleWorldMap();

        // 传送玩家
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null)
        {
            // 使用 CharacterController 需要先禁用再移动
            CharacterController cc = player.GetComponent<CharacterController>();
            if (cc != null) cc.enabled = false;

            player.transform.position = selectedFastTravel.spawnPosition;

            if (cc != null) cc.enabled = true;

            Debug.Log($"[快速传送] 已传送到：{selectedFastTravel.locationName}");
        }

        fastTravelConfirmPanel?.SetActive(false);
        selectedFastTravel = null;
    }

    /// <summary>
    /// 注册快速传送点
    /// </summary>
    public void RegisterFastTravelPoint(FastTravelPoint point)
    {
        if (!fastTravelPoints.Contains(point))
            fastTravelPoints.Add(point);
    }

    /// <summary>
    /// 解锁快速传送点
    /// </summary>
    public void UnlockFastTravelPoint(string locationName)
    {
        var point = fastTravelPoints.Find(p => p.locationName == locationName);
        if (point != null)
        {
            point.isUnlocked = true;
            Debug.Log($"[快速传送] 解锁传送点：{locationName}");
        }
    }

    /// <summary>
    /// 世界地图图标数据
    /// </summary>
    private class WorldMapIcon
    {
        public GameObject gameObject;
        public MinimapIcon sourceIcon;
    }
}

/// <summary>
/// 地图标记数据
/// </summary>
[System.Serializable]
public class MapMarker
{
    public GameObject gameObject;
    public Vector2 mapPosition;
    public Vector3 worldPosition;
    public string label;
}

/// <summary>
/// 快速传送点数据
/// </summary>
[System.Serializable]
public class FastTravelPoint
{
    public string locationName;
    public Vector3 spawnPosition;
    public bool isUnlocked = false;
    public Sprite icon;
}
```

[截图：全屏世界地图界面，展示地图底图、各种图标和自定义标记]

[截图：快速传送确认面板 —— "传送到：桃花村？"]

---

## 22.6 路标系统

### 22.6.1 WaypointSystem.cs —— 3D世界路标

创建 `Scripts/UI/Minimap/WaypointSystem.cs`：

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// 路标系统 —— 在地图上设置目标点，并在3D世界中显示方向指引
///
/// 功能：
/// 1. 在地图上点击设置路标
/// 2. 在3D世界中显示路标柱（从天空到地面的光柱）
/// 3. 在屏幕边缘显示方向箭头（目标不在视野内时）
/// 4. 显示到路标的距离
/// 5. 到达路标位置时自动移除
///
/// 类似导航APP中设置目的地后显示的方向指引
/// </summary>
public class WaypointSystem : MonoBehaviour
{
    public static WaypointSystem Instance { get; private set; }

    [Header("3D世界标记")]
    [Tooltip("路标光柱预制体（从天空到地面的光柱效果）")]
    [SerializeField] private GameObject waypointBeamPrefab;

    [Tooltip("路标地面标记预制体（地面上的圆形标记）")]
    [SerializeField] private GameObject waypointGroundMarkerPrefab;

    [Tooltip("光柱高度")]
    [SerializeField] private float beamHeight = 50f;

    [Header("UI 指引")]
    [Tooltip("方向箭头 UI（在屏幕上指向目标方向）")]
    [SerializeField] private RectTransform directionArrow;

    [Tooltip("距离文本")]
    [SerializeField] private TextMeshProUGUI distanceText;

    [Tooltip("路标名称文本")]
    [SerializeField] private TextMeshProUGUI waypointNameText;

    [Tooltip("屏幕上的路标图标（目标在视野内时显示）")]
    [SerializeField] private RectTransform screenMarker;

    [Header("配置")]
    [Tooltip("到达判定距离")]
    [SerializeField] private float arrivalDistance = 5f;

    [Tooltip("方向箭头到屏幕边缘的内边距")]
    [SerializeField] private float screenEdgePadding = 80f;

    [Tooltip("是否到达时自动移除")]
    [SerializeField] private bool autoRemoveOnArrival = true;

    // 当前路标状态
    private bool hasWaypoint = false;
    private Vector3 waypointPosition;
    private string waypointName;

    // 3D标记实例
    private GameObject activeBeam;
    private GameObject activeGroundMarker;

    // 缓存
    private Camera mainCamera;
    private Transform playerTransform;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private void Start()
    {
        mainCamera = Camera.main;

        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null)
            playerTransform = player.transform;

        // 初始隐藏所有 UI
        HideWaypointUI();
    }

    private void Update()
    {
        if (!hasWaypoint || playerTransform == null) return;

        // 计算到路标的距离
        float distance = Vector3.Distance(playerTransform.position, waypointPosition);

        // 检查是否到达
        if (distance <= arrivalDistance && autoRemoveOnArrival)
        {
            OnWaypointReached();
            return;
        }

        // 更新距离显示
        UpdateDistanceDisplay(distance);

        // 更新屏幕上的方向指引
        UpdateScreenIndicator();
    }

    /// <summary>
    /// 设置路标
    /// </summary>
    /// <param name="worldPosition">世界坐标位置</param>
    /// <param name="name">路标名称（可选）</param>
    public void SetWaypoint(Vector3 worldPosition, string name = "路标")
    {
        // 移除旧路标
        if (hasWaypoint)
        {
            RemoveWaypoint();
        }

        waypointPosition = worldPosition;
        waypointName = name;
        hasWaypoint = true;

        // 创建3D标记
        CreateWorldMarkers();

        // 显示 UI
        ShowWaypointUI();

        Debug.Log($"[路标系统] 设置路标：{name} 位置：{worldPosition}");
    }

    /// <summary>
    /// 移除当前路标
    /// </summary>
    public void RemoveWaypoint()
    {
        hasWaypoint = false;

        // 销毁3D标记
        if (activeBeam != null) Destroy(activeBeam);
        if (activeGroundMarker != null) Destroy(activeGroundMarker);

        // 隐藏 UI
        HideWaypointUI();

        Debug.Log("[路标系统] 路标已移除");
    }

    /// <summary>
    /// 到达路标时的处理
    /// </summary>
    private void OnWaypointReached()
    {
        Debug.Log($"[路标系统] 已到达路标：{waypointName}");

        // 可以播放到达音效或显示提示
        RemoveWaypoint();
    }

    /// <summary>
    /// 在3D世界中创建路标标记
    /// </summary>
    private void CreateWorldMarkers()
    {
        // 调整路标Y坐标到地面高度
        Vector3 groundPosition = waypointPosition;

        // 使用射线检测找到地面高度
        Ray ray = new Ray(waypointPosition + Vector3.up * 100f, Vector3.down);
        if (Physics.Raycast(ray, out RaycastHit hit, 200f, LayerMask.GetMask("Default", "Terrain")))
        {
            groundPosition.y = hit.point.y;
        }

        // 创建光柱
        if (waypointBeamPrefab != null)
        {
            activeBeam = Instantiate(waypointBeamPrefab);
            activeBeam.transform.position = groundPosition;

            // 设置光柱高度
            activeBeam.transform.localScale = new Vector3(1f, beamHeight, 1f);
        }

        // 创建地面标记
        if (waypointGroundMarkerPrefab != null)
        {
            activeGroundMarker = Instantiate(waypointGroundMarkerPrefab);
            activeGroundMarker.transform.position = groundPosition + Vector3.up * 0.1f;

            // 可以添加旋转动画
            // activeGroundMarker.AddComponent<RotateAnimation>();
        }
    }

    /// <summary>
    /// 更新距离显示
    /// </summary>
    private void UpdateDistanceDisplay(float distance)
    {
        if (distanceText == null) return;

        if (distance >= 1000f)
        {
            distanceText.text = $"{distance / 1000f:F1} km";
        }
        else
        {
            distanceText.text = $"{distance:F0} m";
        }
    }

    /// <summary>
    /// 更新屏幕上的方向指引
    ///
    /// 逻辑：
    /// 1. 将路标世界坐标转为屏幕坐标
    /// 2. 如果在屏幕内 —— 显示屏幕标记
    /// 3. 如果在屏幕外 —— 显示方向箭头贴在屏幕边缘
    /// </summary>
    private void UpdateScreenIndicator()
    {
        if (mainCamera == null) return;

        Vector3 screenPos = mainCamera.WorldToScreenPoint(waypointPosition);
        bool isInFront = screenPos.z > 0;

        // 检查是否在屏幕范围内
        bool isOnScreen = isInFront &&
                          screenPos.x > screenEdgePadding &&
                          screenPos.x < Screen.width - screenEdgePadding &&
                          screenPos.y > screenEdgePadding &&
                          screenPos.y < Screen.height - screenEdgePadding;

        if (isOnScreen)
        {
            // 路标在视野内 —— 显示屏幕标记，隐藏方向箭头
            if (screenMarker != null)
            {
                screenMarker.gameObject.SetActive(true);
                screenMarker.position = screenPos;
            }
            if (directionArrow != null)
                directionArrow.gameObject.SetActive(false);
        }
        else
        {
            // 路标在视野外 —— 显示方向箭头
            if (screenMarker != null)
                screenMarker.gameObject.SetActive(false);

            if (directionArrow != null)
            {
                directionArrow.gameObject.SetActive(true);

                // 计算方向（从屏幕中心指向路标的方向）
                Vector3 clampedPos = screenPos;

                if (!isInFront)
                {
                    clampedPos.x = Screen.width - clampedPos.x;
                    clampedPos.y = Screen.height - clampedPos.y;
                }

                // 限制到屏幕边缘
                Vector2 screenCenter = new Vector2(Screen.width / 2f, Screen.height / 2f);
                Vector2 direction = new Vector2(clampedPos.x - screenCenter.x,
                                                 clampedPos.y - screenCenter.y).normalized;

                // 计算边缘位置（使用简化的矩形边缘计算）
                float halfWidth = Screen.width / 2f - screenEdgePadding;
                float halfHeight = Screen.height / 2f - screenEdgePadding;

                // 找到方向线与屏幕边缘的交点
                float tX = Mathf.Abs(direction.x) > 0.01f ? halfWidth / Mathf.Abs(direction.x) : float.MaxValue;
                float tY = Mathf.Abs(direction.y) > 0.01f ? halfHeight / Mathf.Abs(direction.y) : float.MaxValue;
                float t = Mathf.Min(tX, tY);

                Vector2 edgePos = screenCenter + direction * t;
                directionArrow.position = new Vector3(edgePos.x, edgePos.y, 0);

                // 旋转箭头指向路标方向
                float angle = Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg;
                directionArrow.localRotation = Quaternion.Euler(0, 0, angle - 90f);
            }
        }
    }

    /// <summary>
    /// 显示路标 UI
    /// </summary>
    private void ShowWaypointUI()
    {
        if (directionArrow != null)
            directionArrow.gameObject.SetActive(true);
        if (distanceText != null)
            distanceText.gameObject.SetActive(true);
        if (waypointNameText != null)
        {
            waypointNameText.gameObject.SetActive(true);
            waypointNameText.text = waypointName;
        }
    }

    /// <summary>
    /// 隐藏路标 UI
    /// </summary>
    private void HideWaypointUI()
    {
        if (directionArrow != null)
            directionArrow.gameObject.SetActive(false);
        if (distanceText != null)
            distanceText.gameObject.SetActive(false);
        if (waypointNameText != null)
            waypointNameText.gameObject.SetActive(false);
        if (screenMarker != null)
            screenMarker.gameObject.SetActive(false);
    }
}
```

[截图：3D世界中的路标光柱效果 —— 从天空到地面的半透明光柱]

[截图：屏幕边缘的方向箭头和距离显示]

[截图：路标在视野内时的屏幕标记效果]

---

## 22.7 场景搭建完整步骤

### 22.7.1 小地图搭建

**步骤1：创建 Render Texture**
1. Project -> Create -> Render Texture
2. 命名 "MinimapRT"，分辨率 512x512

**步骤2：创建小地图摄像机**
1. Hierarchy -> Camera -> 命名 "MinimapCamera"
2. Projection: Orthographic
3. Rotation: (90, 0, 0)
4. Target Texture: MinimapRT
5. Clear Flags: Solid Color
6. Depth: -1（低于主摄像机优先级）
7. Culling Mask: 去掉 UI 层

**步骤3：创建小地图 UI**
1. Canvas 下创建 Panel -> 命名 "MinimapPanel"
2. 锚点设置为右上角
3. 大小：200x200
4. 添加 Mask 组件（勾选 Show Mask Graphic）
5. 子对象：RawImage -> Texture 设为 MinimapRT
6. 子对象：Image（圆形边框）
7. 子对象：Image（玩家箭头图标，放在中心）
8. 子对象：空对象 "IconContainer"（放小地图图标）

**步骤4：挂载脚本**
1. 创建空对象 "MinimapSystem"
2. 添加 MinimapController 脚本
3. 添加 MinimapIconManager 脚本
4. 拖拽引用

[截图：完整的小地图 UI 层级结构]

[截图：MinimapController Inspector 配置]

### 22.7.2 为场景对象添加小地图图标

给需要在小地图上显示的对象添加 `MinimapIcon` 组件：

1. 选择 NPC 对象 -> Add Component -> MinimapIcon
   - Icon Type: NPC
   - Icon Color: 绿色
   - Icon Size: 16

2. 选择敌人对象 -> Add Component -> MinimapIcon
   - Icon Type: Enemy
   - Icon Color: 红色
   - Icon Size: 14
   - Max Display Distance: 100（远距离不显示）

3. 选择任务发布者 NPC -> Add Component -> MinimapIcon
   - Icon Type: QuestGiver
   - Icon Color: 黄色
   - Has Pulse Animation: true（脉冲闪烁）

[截图：在 NPC 上添加 MinimapIcon 组件的 Inspector]

### 22.7.3 世界地图搭建

1. 创建世界地图底图（可以从场景俯瞰截图，或使用美术绘制的地图）
2. 在 Canvas 下创建全屏 Panel -> "WorldMapPanel"
3. 添加 ScrollRect 组件实现平移
4. 子对象 "MapContent" 放置地图图片和图标
5. 挂载 WorldMapUI 脚本

[截图：世界地图 UI 的完整层级结构]

---

## 22.8 性能优化建议

### 22.8.1 小地图性能

1. **Render Texture 分辨率**：移动端用 256x256 即可，不需要过高
2. **小地图摄像机 Culling Mask**：只渲染地形和重要对象，去掉粒子、特效等
3. **图标更新频率**：不在屏幕上的图标不需要每帧更新位置
4. **对象池**：动态创建/销毁的图标使用对象池

### 22.8.2 战争迷雾性能

1. **纹理分辨率**：128x128 对于大多数游戏已经足够
2. **更新频率**：不需要每帧更新，0.2-0.5秒一次
3. **玩家移动检测**：只有玩家移动超过阈值时才更新
4. **批量像素操作**：使用 `SetPixels` 而非逐像素调用 `SetPixel`

---

## 练习题

### 练习1：基础练习 —— 小地图缩放按钮
在小地图下方添加 + 和 - 按钮，点击可以放大/缩小小地图视野范围。按钮点击时播放简单的缩放动画效果。

### 练习2：进阶练习 —— 小地图图标过滤
添加一个过滤系统：
- 在小地图旁边添加几个 Toggle 按钮（敌人、NPC、任务、商店）
- 点击可以显示/隐藏对应类型的图标
- 状态保存到 PlayerPrefs

### 练习3：高级练习 —— 区域名称显示
当玩家进入不同的地图区域时：
- 在屏幕上方淡入显示区域名称（如 "桃花村"、"黑森林"）
- 2秒后淡出
- 同时在小地图上显示区域边界
- 使用 Collider + Trigger 检测区域进入

### 练习4：挑战练习 —— 实时小地图天气同步
让小地图上也能反映天气状态：
- 雨天时小地图上显示半透明蓝色覆盖
- 雾天时小地图边缘变模糊
- 夜晚时小地图变暗
- 与第20章的天气系统集成

---

## 下一章预告

在下一章**第23章：移动端性能优化**中，我们将学习：

- Unity Profiler 的使用方法（CPU、GPU、内存分析）
- Draw Call 分析和批处理优化
- 纹理压缩和图集
- LOD（Level of Detail）系统
- Shader 优化
- 内存管理和垃圾回收优化
- 物理和 UI 优化
- 移动端特有问题（发热控制、电池优化、目标帧率管理）

小地图和世界地图是性能消耗的重点区域之一 —— 额外的摄像机、Render Texture、大量的 UI 图标都需要优化。我们将在下一章专门讨论如何让这些系统在移动设备上流畅运行。
