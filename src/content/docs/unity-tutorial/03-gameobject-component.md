# 第三章：GameObject 与 Component 系统 —— Unity 的核心架构

> **本章目标**
>
> - 深入理解 GameObject 是什么
> - 掌握 Transform 组件的所有细节
> - 学会添加、移除、获取组件
> - 理解并创建 Prefab（预制体）
> - 掌握父子关系及其对 Transform 的影响
> - 理解 Tag（标签）和 Layer（层级）系统
> - 建立 GameObject/Component 与 DOM Element/React Component 的深层对比

> **预计学习时间：120 - 150 分钟**

---

## 3.1 万物皆 GameObject

### 3.1.1 什么是 GameObject？

在 Unity 的世界中，**一切都是 GameObject**。无论是玩家、敌人、地面、灯光、摄像机，还是一个不可见的触发区域 —— 它们本质上都是 GameObject。

```
Unity 世界:
├── Player          → GameObject
├── Enemy           → GameObject
├── Ground          → GameObject
├── Directional Light → GameObject
├── Main Camera     → GameObject
├── 一个不可见的触发区域 → GameObject
└── UI 按钮         → GameObject
```

### 3.1.2 与 DOM Element 的对比

如果你是 Web 开发者，可以这样理解：

```
HTML/DOM:
  每个页面元素都是一个 DOM Element（div, span, button, img...）
  DOM Element 本身是一个"容器"
  通过 attributes、style、class 来赋予它外观和行为

Unity:
  每个场景对象都是一个 GameObject
  GameObject 本身是一个"空容器"
  通过挂载 Component 来赋予它外观和行为
```

**关键区别**：DOM Element 自带一些默认行为（如 `<button>` 自带点击样式和语义），但 **GameObject 默认几乎什么都没有**。一个新创建的空 GameObject 只有一个 Transform 组件 —— 它没有外观、没有物理行为、什么都做不了。

```csharp
// 创建一个空的 GameObject（代码方式）
// 这就像创建一个完全空白的 <div></div>
GameObject emptyObject = new GameObject("MyObject");
// 此时它只有 Transform 组件，场景中看不到任何东西
```

### 3.1.3 GameObject 的核心属性

```csharp
// GameObject 自身的属性（不是组件，是 GameObject 对象本身的属性）
public class GameObjectDemo : MonoBehaviour
{
    void Start()
    {
        // === 名称 ===
        // 类似 HTML 元素的 id
        gameObject.name = "Player";
        Debug.Log($"名称: {gameObject.name}");

        // === 激活状态 ===
        // 类似 CSS 的 display: none / block
        gameObject.SetActive(false);  // 隐藏（禁用）
        gameObject.SetActive(true);   // 显示（启用）
        bool isActive = gameObject.activeSelf;

        // === 标签 ===
        // 类似 HTML 的 data-* 属性或 class
        gameObject.tag = "Player";
        bool isPlayer = gameObject.CompareTag("Player");

        // === 层级 ===
        // 类似 CSS 的 z-index + 分组概念
        gameObject.layer = LayerMask.NameToLayer("Default");

        // === 静态标记 ===
        // 标记对象不会在运行时移动（用于优化）
        // 类似 React.memo() 的优化标记
        gameObject.isStatic = true;
    }
}
```

### 3.1.4 创建 GameObject 的方式

**方式 1：在编辑器中创建**

在 Hierarchy 窗口中右键：

```
右键菜单:
├── Create Empty                    -- 空 GameObject
├── Create Empty Child              -- 作为子对象的空 GameObject
├── 3D Object
│   ├── Cube                        -- 立方体
│   ├── Sphere                      -- 球体
│   ├── Capsule                     -- 胶囊体
│   ├── Cylinder                    -- 圆柱体
│   ├── Plane                       -- 平面
│   ├── Quad                        -- 四边形（单面）
│   └── Text - TextMeshPro          -- 3D 文本
├── 2D Object                       -- 2D 精灵等
├── Effects
│   ├── Particle System             -- 粒子系统
│   └── Trail                       -- 拖尾效果
├── Light
│   ├── Directional Light           -- 平行光（太阳光）
│   ├── Point Light                 -- 点光源
│   ├── Spot Light                  -- 聚光灯
│   └── Area Light                  -- 面光源
├── Audio
│   └── Audio Source                -- 音频源
├── UI
│   ├── Canvas                      -- UI 画布
│   ├── Button                      -- 按钮
│   ├── Text                        -- 文本
│   └── Image                       -- 图片
└── Camera                          -- 摄像机
```

[截图：Hierarchy 窗口的右键创建菜单]

**方式 2：通过代码创建**

```csharp
public class SpawnDemo : MonoBehaviour
{
    void Start()
    {
        // 方式 A：创建空 GameObject
        // 类似 document.createElement('div')
        GameObject empty = new GameObject("空对象");

        // 方式 B：创建带有组件的 GameObject
        // 类似 document.createElement('div') + 设置 style
        GameObject withComponents = new GameObject("带组件的对象",
            typeof(Rigidbody),        // 物理组件
            typeof(BoxCollider)       // 碰撞体
        );

        // 方式 C：创建 Unity 内置的基本形状
        // 类似使用 React 的内置组件
        GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.name = "我的立方体";
        cube.transform.position = new Vector3(0, 2, 0);

        // 方式 D：从 Prefab 实例化（最常用！）
        // 类似 React 中渲染一个组件 <MyComponent />
        // 我们稍后会详细讲 Prefab
    }
}
```

**方式 3：从 Prefab 实例化（最常用）**

```csharp
public class PrefabSpawnDemo : MonoBehaviour
{
    // 在 Inspector 中拖入一个 Prefab
    // 类似 React 中 import 一个组件
    [SerializeField] private GameObject enemyPrefab;

    void Start()
    {
        // 实例化 Prefab
        // 类似 React 中的 <EnemyComponent />
        GameObject enemy = Instantiate(enemyPrefab);
        enemy.name = "Goblin_01";
        enemy.transform.position = new Vector3(5, 0, 3);
    }
}
```

### 3.1.5 销毁 GameObject

```csharp
// 立即销毁
// 类似 element.remove()
Destroy(gameObject);

// 延迟销毁（5 秒后）
// 类似 setTimeout(() => element.remove(), 5000)
Destroy(gameObject, 5f);

// 销毁自身
// 类似 this.remove()（如果 DOM 元素能自我销毁的话）
Destroy(this.gameObject);

// 只销毁一个组件，不销毁整个 GameObject
// 类似只移除一个 event listener，而不是移除整个元素
Destroy(GetComponent<Rigidbody>());
```

> **重要**：`Destroy()` 不会立即执行销毁操作，它会在当前帧结束后才真正销毁对象。如果需要立即销毁（极少需要），可以使用 `DestroyImmediate()`，但在大多数情况下应该避免使用。

---

## 3.2 Transform 组件 —— 3D 世界中的 "CSS Transform"

### 3.2.1 每个 GameObject 必有 Transform

Transform 是 Unity 中**唯一不能被移除的组件**。每个 GameObject 都自带一个 Transform，它定义了对象在 3D 空间中的：

- **Position（位置）**：在哪里
- **Rotation（旋转）**：朝哪个方向
- **Scale（缩放）**：多大

```
CSS Transform:
  transform: translate(100px, 50px) rotate(45deg) scale(1.5);

Unity Transform:
  Position: (100, 50, 0)
  Rotation: (0, 0, 45)
  Scale: (1.5, 1.5, 1.5)
```

### 3.2.2 Position（位置）

```csharp
public class PositionDemo : MonoBehaviour
{
    void Start()
    {
        // === 世界坐标（World Position）===
        // 类似 CSS 的 position: fixed
        // 相对于世界原点 (0,0,0) 的绝对位置
        Vector3 worldPos = transform.position;
        Debug.Log($"世界坐标: {worldPos}");

        // 设置世界坐标
        transform.position = new Vector3(10, 2, 5);

        // === 局部坐标（Local Position）===
        // 类似 CSS 的 position: relative
        // 相对于父对象的位置
        Vector3 localPos = transform.localPosition;
        Debug.Log($"局部坐标: {localPos}");

        // 设置局部坐标
        transform.localPosition = new Vector3(1, 0, 0);

        // === 移动 ===
        // 沿自身坐标轴移动（Local Space）
        // 如果对象旋转了，移动方向也会跟着旋转
        transform.Translate(Vector3.forward * 2f);  // 向自身前方移动 2 单位

        // 沿世界坐标轴移动（World Space）
        // 不管对象怎么旋转，方向始终是世界坐标的 Z 轴
        transform.Translate(Vector3.forward * 2f, Space.World);
    }

    void Update()
    {
        // 常见用法：持续移动
        // speed * Time.deltaTime 确保帧率无关
        float speed = 5f;
        transform.position += transform.forward * speed * Time.deltaTime;
    }
}
```

**Vector3 常用方向常量：**

```csharp
Vector3.zero     = (0, 0, 0)   // 原点
Vector3.one      = (1, 1, 1)   // 用于缩放
Vector3.up       = (0, 1, 0)   // 世界的上方（Y 轴正方向）
Vector3.down     = (0, -1, 0)  // 世界的下方
Vector3.forward  = (0, 0, 1)   // 世界的前方（Z 轴正方向）
Vector3.back     = (0, 0, -1)  // 世界的后方
Vector3.right    = (1, 0, 0)   // 世界的右方（X 轴正方向）
Vector3.left     = (-1, 0, 0)  // 世界的左方

// 对象自身的方向（会随旋转而变化）
transform.forward  // 对象自身的前方
transform.right    // 对象自身的右方
transform.up       // 对象自身的上方
```

### 3.2.3 Rotation（旋转）

Unity 中的旋转有两种表示方式：

**欧拉角（Euler Angles）—— 直观但有问题：**

```csharp
// 欧拉角：用三个角度表示旋转（度数）
// 类似 CSS 的 rotateX(), rotateY(), rotateZ()
transform.eulerAngles = new Vector3(0, 90, 0);  // 绕 Y 轴旋转 90 度
transform.localEulerAngles = new Vector3(30, 0, 0);  // 局部旋转

// 旋转方法
transform.Rotate(Vector3.up, 45f);  // 绕 Y 轴旋转 45 度
transform.Rotate(0, 45, 0);         // 同上

// 持续旋转
void Update()
{
    float rotSpeed = 90f; // 每秒 90 度
    transform.Rotate(Vector3.up, rotSpeed * Time.deltaTime);
}
```

**四元数（Quaternion）—— 内部表示，避免万向锁：**

```csharp
// 四元数是 Unity 内部存储旋转的方式
// 你通常不需要直接操作四元数，除了以下常见用法：

// 设置旋转
transform.rotation = Quaternion.identity;  // 重置旋转（无旋转）
transform.rotation = Quaternion.Euler(0, 90, 0);  // 从欧拉角创建四元数

// 朝向某个目标（非常常用！）
// 类似 CSS 的... 嗯，CSS 没有这个功能
Vector3 targetPosition = new Vector3(10, 0, 5);
transform.LookAt(targetPosition);  // 让对象面朝目标位置

// 平滑旋转到目标方向（游戏中常用）
Quaternion targetRotation = Quaternion.LookRotation(targetDirection);
transform.rotation = Quaternion.Slerp(
    transform.rotation,     // 当前旋转
    targetRotation,         // 目标旋转
    Time.deltaTime * 5f     // 插值速度
);
// 这类似于 CSS transition: transform 0.2s ease
// 但这是每帧计算的平滑插值
```

> **为什么不直接用欧拉角？** 欧拉角会遇到**万向锁（Gimbal Lock）**问题 —— 当某个轴旋转 90 度时，两个轴会重合，导致丢失一个旋转自由度。四元数不会有这个问题。不过对于大多数简单应用，使用欧拉角就够了。

### 3.2.4 Scale（缩放）

```csharp
// 缩放（局部缩放）
// 类似 CSS 的 transform: scale()
transform.localScale = new Vector3(2, 2, 2);  // 等比放大 2 倍
transform.localScale = new Vector3(1, 3, 1);  // 只在 Y 轴拉伸

// 注意：Unity 没有 "世界缩放" 的直接属性
// lossy scale 是只读的（受父对象影响后的最终缩放）
Vector3 worldScale = transform.lossyScale;
Debug.Log($"世界缩放: {worldScale}");

// 缩放会影响子对象
// 如果父对象 Scale = (2, 2, 2)，子对象 Scale = (1, 1, 1)
// 子对象实际看起来是 (2, 2, 2)
// 类似 CSS 中父元素的 transform: scale(2) 会影响子元素的视觉大小
```

### 3.2.5 Transform 操作综合示例

```csharp
using UnityEngine;

/// <summary>
/// 综合演示 Transform 的各种操作
/// 将此脚本挂载到一个 Cube 上运行测试
/// </summary>
public class TransformPlayground : MonoBehaviour
{
    [Header("移动设置")]
    [SerializeField] private float moveSpeed = 5f;

    [Header("旋转设置")]
    [SerializeField] private float rotateSpeed = 90f;

    [Header("缩放设置")]
    [SerializeField] private float scaleSpeed = 1f;
    [SerializeField] private float minScale = 0.5f;
    [SerializeField] private float maxScale = 3f;

    // 内部状态
    private float currentScale = 1f;

    void Update()
    {
        HandleMovement();
        HandleRotation();
        HandleScale();
        HandleSpecialActions();
    }

    /// <summary>
    /// WASD 移动（世界坐标系）
    /// 类似在 Web 中用键盘事件移动一个绝对定位的 div
    /// </summary>
    void HandleMovement()
    {
        float h = Input.GetAxis("Horizontal"); // A/D 或 左/右箭头
        float v = Input.GetAxis("Vertical");   // W/S 或 上/下箭头

        // 创建移动向量
        Vector3 movement = new Vector3(h, 0, v);

        // 应用移动（世界坐标系）
        transform.Translate(movement * moveSpeed * Time.deltaTime, Space.World);
    }

    /// <summary>
    /// Q/E 旋转
    /// </summary>
    void HandleRotation()
    {
        if (Input.GetKey(KeyCode.Q))
        {
            transform.Rotate(Vector3.up, -rotateSpeed * Time.deltaTime);
        }
        if (Input.GetKey(KeyCode.E))
        {
            transform.Rotate(Vector3.up, rotateSpeed * Time.deltaTime);
        }
    }

    /// <summary>
    /// Z/X 缩放
    /// </summary>
    void HandleScale()
    {
        if (Input.GetKey(KeyCode.Z))
        {
            currentScale -= scaleSpeed * Time.deltaTime;
        }
        if (Input.GetKey(KeyCode.X))
        {
            currentScale += scaleSpeed * Time.deltaTime;
        }

        // 限制缩放范围（类似 CSS 的 clamp()）
        currentScale = Mathf.Clamp(currentScale, minScale, maxScale);
        transform.localScale = Vector3.one * currentScale;
    }

    /// <summary>
    /// 特殊操作
    /// </summary>
    void HandleSpecialActions()
    {
        // 空格键：重置 Transform
        if (Input.GetKeyDown(KeyCode.Space))
        {
            transform.position = Vector3.zero;
            transform.rotation = Quaternion.identity;
            currentScale = 1f;
            transform.localScale = Vector3.one;
            Debug.Log("Transform 已重置");
        }

        // R 键：打印当前 Transform 信息
        if (Input.GetKeyDown(KeyCode.R))
        {
            Debug.Log($"Position: {transform.position}");
            Debug.Log($"Rotation: {transform.eulerAngles}");
            Debug.Log($"Scale: {transform.localScale}");
        }
    }
}
```

[截图：运行时通过 WASD、Q/E、Z/X 控制 Cube 的 Transform 变换效果]

---

## 3.3 Component 系统 —— "组合优于继承"

### 3.3.1 什么是 Component？

Component 是挂载在 GameObject 上的功能模块。一个 GameObject 的行为和外观完全由它所拥有的 Component 决定。

```
类比 React:

React:
  <div>                           // DOM Element (容器)
    <style>...</style>            // 样式（外观）
    <EventHandler />              // 事件处理（行为）
    <StateManager />              // 状态管理
  </div>

Unity:
  GameObject                      // 容器
    Transform                     // 位置（必有）
    MeshRenderer                  // 渲染（外观）
    Rigidbody                     // 物理（行为）
    PlayerController (自定义脚本)  // 自定义逻辑
```

### 3.3.2 Component 与 React Component 的深层对比

```typescript
// === React 的组件组合 ===

// 一个 "玩家" 组件
function Player() {
  return (
    <div className="player">
      <HealthBar hp={100} maxHp={100} />
      <MovementController speed={5} />
      <Inventory items={[]} />
      <Animator state="idle" />
    </div>
  );
}

// 组件之间通过 props 通信
// 或通过 Context/Redux 共享状态
```

```csharp
// === Unity 的组件组合 ===

// Player (GameObject) 上挂载多个 Component:
// - Transform         (内置)
// - MeshRenderer      (内置)
// - Animator          (内置)
// - PlayerHealth      (自定义脚本)
// - PlayerMovement    (自定义脚本)
// - PlayerInventory   (自定义脚本)

// 组件之间通过 GetComponent<T>() 通信
public class PlayerMovement : MonoBehaviour
{
    private PlayerHealth health;

    void Start()
    {
        // 获取同一 GameObject 上的其他组件
        // 类似 React 中的 useContext 或从 props 获取值
        health = GetComponent<PlayerHealth>();
    }

    void Update()
    {
        // 只有活着才能移动
        if (health != null && health.IsAlive)
        {
            Move();
        }
    }

    void Move()
    {
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        transform.Translate(new Vector3(h, 0, v) * 5f * Time.deltaTime);
    }
}

public class PlayerHealth : MonoBehaviour
{
    [SerializeField] private int maxHP = 100;
    private int currentHP;

    // 公开属性供其他组件读取（类似 React 的公开 state）
    public bool IsAlive => currentHP > 0;
    public float HPPercent => (float)currentHP / maxHP;

    void Start()
    {
        currentHP = maxHP;
    }

    public void TakeDamage(int damage)
    {
        currentHP = Mathf.Max(0, currentHP - damage);
        Debug.Log($"受到 {damage} 点伤害，剩余 HP: {currentHP}");

        if (!IsAlive)
        {
            Debug.Log("玩家死亡！");
        }
    }
}
```

### 3.3.3 获取组件的方式

```csharp
public class ComponentAccessDemo : MonoBehaviour
{
    void Start()
    {
        // === 获取自身的组件 ===

        // 获取同一 GameObject 上的组件（最常用）
        // 类似 React 中的 useRef 或 useContext
        Rigidbody rb = GetComponent<Rigidbody>();

        // 如果不确定组件是否存在，用 TryGetComponent（推荐！）
        if (TryGetComponent<Rigidbody>(out Rigidbody rigidbody))
        {
            rigidbody.AddForce(Vector3.up * 10f);
        }

        // === 获取子对象的组件 ===

        // 获取子对象（含自身）中的第一个匹配组件
        // 类似 querySelector（深度优先搜索）
        Renderer childRenderer = GetComponentInChildren<Renderer>();

        // 获取子对象（含自身）中的所有匹配组件
        // 类似 querySelectorAll
        Renderer[] allRenderers = GetComponentsInChildren<Renderer>();

        // === 获取父对象的组件 ===

        // 获取父对象链中的第一个匹配组件
        // 类似 element.closest('.some-class')
        Canvas parentCanvas = GetComponentInParent<Canvas>();

        // === 全局查找 ===

        // 通过类型查找场景中的对象（性能较差，不建议在 Update 中使用）
        // 类似 document.querySelector('[data-type="player"]')
        PlayerHealth player = FindObjectOfType<PlayerHealth>();

        // 查找所有匹配的对象
        // 类似 document.querySelectorAll('.enemy')
        PlayerHealth[] allPlayers = FindObjectsOfType<PlayerHealth>();

        // 通过名称查找（性能差，尽量避免使用）
        // 类似 document.getElementById('player')
        GameObject playerObj = GameObject.Find("Player");

        // 通过标签查找（性能较好）
        // 类似 document.querySelector('[data-tag="player"]')
        GameObject taggedPlayer = GameObject.FindWithTag("Player");
        GameObject[] enemies = GameObject.FindGameObjectsWithTag("Enemy");
    }
}
```

**性能注意事项：**

```csharp
// ❌ 错误做法：每帧都在查找组件（性能很差）
void Update()
{
    // GetComponent 有一定的性能开销
    // 就像每帧都执行 querySelector 一样
    Rigidbody rb = GetComponent<Rigidbody>();
    rb.AddForce(Vector3.up);
}

// ✅ 正确做法：在 Start 中缓存引用
private Rigidbody rb;

void Start()
{
    rb = GetComponent<Rigidbody>();
}

void Update()
{
    // 直接使用缓存的引用
    rb.AddForce(Vector3.up);
}
```

> **类比 Web**：这就像在 React 中使用 `useRef` 来缓存 DOM 引用，或在原生 JS 中把 `querySelector` 的结果存到变量里，而不是每次都重新查找。

### 3.3.4 添加和移除组件

**在编辑器中：**

[截图：Inspector 中的 Add Component 按钮和菜单]

1. 选中 GameObject
2. Inspector → Add Component
3. 搜索或浏览要添加的组件
4. 要移除：右键点击组件标题 → Remove Component

**通过代码：**

```csharp
public class DynamicComponentDemo : MonoBehaviour
{
    void Start()
    {
        // 添加组件
        // 类似 element.addEventListener 或动态添加 React 组件
        Rigidbody rb = gameObject.AddComponent<Rigidbody>();
        rb.mass = 2f;
        rb.useGravity = true;

        // 添加自定义脚本组件
        PlayerHealth health = gameObject.AddComponent<PlayerHealth>();

        // 移除组件
        // 类似 element.removeEventListener
        Destroy(GetComponent<BoxCollider>());

        // 启用/禁用组件（不销毁）
        // 类似设置 display: none 但保留元素
        Renderer renderer = GetComponent<Renderer>();
        renderer.enabled = false;  // 隐藏渲染（对象仍在，只是看不见）
        renderer.enabled = true;   // 恢复渲染

        // 对于 MonoBehaviour 脚本组件：
        // enabled = false 会停止 Update() 等回调
        // 但 Awake() 和 Start() 已经执行过的不受影响
        PlayerMovement movement = GetComponent<PlayerMovement>();
        movement.enabled = false;  // 停止移动脚本的 Update
    }
}
```

### 3.3.5 常见内置组件一览

| 组件 | 功能 | Web 类比 |
|---|---|---|
| **Transform** | 位置、旋转、缩放 | CSS transform |
| **MeshFilter** | 指定 3D 网格形状 | SVG 的 path 数据 |
| **MeshRenderer** | 渲染 3D 网格 | 浏览器的渲染引擎 |
| **Rigidbody** | 物理模拟（重力、力）| 无（Web 无内置物理）|
| **Collider** 系列 | 碰撞检测 | 无 |
| **Camera** | 摄像机 | viewport |
| **Light** 系列 | 灯光 | CSS 的 box-shadow / filter |
| **AudioSource** | 播放声音 | `<audio>` 元素 |
| **Animator** | 动画控制器 | CSS animation + JS 控制 |
| **Canvas** | UI 容器 | `<div id="root">` |
| **RectTransform** | UI 元素的 Transform | CSS position + flex |
| **ParticleSystem** | 粒子效果 | Canvas API 粒子 |

### 3.3.6 [SerializeField] 与 [Header] —— Inspector 中的属性暴露

```csharp
public class InspectorDemo : MonoBehaviour
{
    // === 公开字段：默认在 Inspector 中可见 ===
    // 类似 React 的 public props
    public float speed = 5f;
    public string playerName = "Hero";

    // === [SerializeField] 私有字段：也在 Inspector 中可见 ===
    // 推荐写法！保持封装性的同时允许编辑器调整
    // 类似 React 的 props，但外部代码不能直接访问
    [SerializeField] private float jumpForce = 10f;
    [SerializeField] private int maxHealth = 100;

    // === [HideInInspector]：公开但在 Inspector 中隐藏 ===
    [HideInInspector] public float internalValue = 0f;

    // === [Header]：在 Inspector 中添加标题分隔 ===
    // 纯视觉组织用途
    [Header("移动设置")]
    [SerializeField] private float walkSpeed = 3f;
    [SerializeField] private float runSpeed = 7f;

    [Header("战斗设置")]
    [SerializeField] private int attackDamage = 10;
    [SerializeField] private float attackRange = 2f;

    // === [Tooltip]：鼠标悬停时显示提示 ===
    [Tooltip("角色在地面上的最大移动速度")]
    [SerializeField] private float maxGroundSpeed = 10f;

    // === [Range]：限制数值范围，显示为滑块 ===
    [Range(0f, 1f)]
    [SerializeField] private float volume = 0.8f;

    [Range(1, 100)]
    [SerializeField] private int level = 1;

    // === [TextArea]：多行文本输入 ===
    [TextArea(3, 5)]
    [SerializeField] private string description = "角色描述...";

    // === [Space]：添加空行间距 ===
    [Space(20)]
    [SerializeField] private bool debugMode = false;

    // === [RequireComponent]：确保依赖组件存在 ===
    // 类比：React 中的 propTypes.isRequired
    // 放在类定义上方
}

// RequireComponent 确保 Rigidbody 一定存在
// 添加此脚本时会自动添加 Rigidbody
// 类似 React 的 defaultProps + propTypes 验证
[RequireComponent(typeof(Rigidbody))]
[RequireComponent(typeof(CapsuleCollider))]
public class PhysicsCharacter : MonoBehaviour
{
    private Rigidbody rb;

    void Awake()
    {
        // 可以安全地获取，因为 RequireComponent 保证了它的存在
        rb = GetComponent<Rigidbody>();
    }
}
```

[截图：Inspector 中展示 Header、Range、Tooltip 等属性修饰器的效果]

---

## 3.4 Prefab 系统 —— 可复用的 "组件模板"

### 3.4.1 什么是 Prefab？

Prefab（预制体）是 Unity 中最重要的概念之一。它是一个**可复用的 GameObject 模板**。

```
React 类比:

// React: 定义一个可复用的组件
function EnemyCard({ name, hp, damage }) {
  return (
    <div className="enemy">
      <HealthBar hp={hp} />
      <AttackIndicator damage={damage} />
      <NameTag name={name} />
    </div>
  );
}

// 多次使用同一个组件模板
<EnemyCard name="Goblin" hp={30} damage={5} />
<EnemyCard name="Orc" hp={80} damage={15} />
<EnemyCard name="Dragon" hp={500} damage={50} />

// Unity: Prefab 就是这个"组件模板"
// 你定义一个 Enemy Prefab（包含模型、脚本、碰撞体等）
// 然后多次实例化（Instantiate）它
```

### 3.4.2 创建 Prefab

**方式 1：从 Hierarchy 拖到 Project 窗口**

1. 在 Hierarchy 中配置好一个 GameObject（添加好所有组件、调好参数）
2. 直接将它从 Hierarchy **拖拽**到 Project 窗口的文件夹中
3. 这个 GameObject 就变成了一个 Prefab（图标变蓝色）

[截图：从 Hierarchy 拖拽 GameObject 到 Project 窗口创建 Prefab 的操作]

```
创建过程:
Hierarchy 中的 GameObject (白色图标)
    │
    │  拖拽到 Project 窗口
    ↓
Project 中的 Prefab 文件 (蓝色图标)
    │
    │  Hierarchy 中的对象变成 Prefab 实例
    ↓
Hierarchy 中的 Prefab 实例 (蓝色文字)
```

**方式 2：通过代码创建**（不常用，了解即可）

```csharp
// 通常通过编辑器创建 Prefab，而不是代码
// 代码中主要是 "使用" Prefab（实例化）
```

### 3.4.3 使用 Prefab（实例化）

```csharp
using UnityEngine;

public class EnemySpawner : MonoBehaviour
{
    // 在 Inspector 中拖入 Enemy Prefab
    // 这就像 React 中 import EnemyComponent
    [SerializeField] private GameObject enemyPrefab;

    [SerializeField] private int enemyCount = 5;
    [SerializeField] private float spawnRadius = 10f;

    void Start()
    {
        SpawnEnemies();
    }

    void SpawnEnemies()
    {
        for (int i = 0; i < enemyCount; i++)
        {
            // 生成随机位置
            Vector3 randomPosition = new Vector3(
                Random.Range(-spawnRadius, spawnRadius),
                0,
                Random.Range(-spawnRadius, spawnRadius)
            );

            // 实例化 Prefab
            // 类似 React 中的 <EnemyComponent key={i} />
            GameObject enemy = Instantiate(
                enemyPrefab,           // 要实例化的 Prefab
                randomPosition,        // 位置
                Quaternion.identity    // 旋转（无旋转）
            );

            // 设置名称
            enemy.name = $"Enemy_{i}";

            // 设置为当前对象的子对象（可选）
            // 类似 parentElement.appendChild(childElement)
            enemy.transform.SetParent(transform);
        }
    }

    // 按 G 键生成更多敌人
    void Update()
    {
        if (Input.GetKeyDown(KeyCode.G))
        {
            Vector3 pos = new Vector3(
                Random.Range(-5f, 5f), 0, Random.Range(-5f, 5f)
            );
            Instantiate(enemyPrefab, pos, Quaternion.identity);
            Debug.Log("生成了一个新敌人！");
        }
    }
}
```

[截图：Inspector 中 EnemySpawner 脚本的属性，enemyPrefab 槽位拖入了 Prefab]

### 3.4.4 Prefab 的修改与覆盖

Prefab 系统有一个强大的特性：**修改 Prefab 模板会同步更新所有实例**。

```
React 类比:
  修改 EnemyCard 组件的代码 → 所有使用 <EnemyCard /> 的地方都更新

Unity:
  修改 Enemy Prefab → 场景中所有 Enemy 实例都更新
```

**Prefab Override（覆盖）：**

你也可以修改单个实例而不影响模板（类似 React 中传入不同的 props）：

```
Enemy Prefab (模板):
  HP: 100
  Speed: 5
  Color: Red

场景中的实例:
  Enemy_01: 使用默认值（HP: 100, Speed: 5, Color: Red）
  Enemy_02: 覆盖了 HP → HP: 200（其他保持默认）
  Enemy_03: 覆盖了 Color → Color: Blue（其他保持默认）
```

在 Inspector 中，被覆盖的属性会以**粗体**显示，左侧有**蓝色竖线**标记。

[截图：Inspector 中 Prefab 实例的覆盖属性显示（粗体 + 蓝色标记）]

**常用 Prefab 操作：**

| 操作 | 方法 | 说明 |
|---|---|---|
| 打开 Prefab 编辑模式 | 双击 Project 中的 Prefab | 进入 Prefab 独立编辑空间 |
| 应用覆盖到 Prefab | Inspector → Overrides → Apply All | 把实例的修改同步回模板 |
| 还原覆盖 | Inspector → Overrides → Revert All | 把实例恢复为模板的默认值 |
| 解除 Prefab 关联 | 右键 → Prefab → Unpack | 实例变成普通 GameObject |

### 3.4.5 Prefab Variant（变体）

Prefab Variant 类似于面向对象中的"继承"或 React 中的 "高阶组件"：

```
基础 Prefab: Enemy
├── Variant: Goblin (HP: 30, Speed: 8, Model: 哥布林模型)
├── Variant: Orc    (HP: 80, Speed: 4, Model: 兽人模型)
└── Variant: Dragon (HP: 500, Speed: 6, Model: 龙模型)

修改 Enemy 基础 Prefab 的属性 → 所有 Variant 都会继承变化
但每个 Variant 自己覆盖的属性不受影响
```

创建方法：把一个 Prefab 实例拖入 Project 窗口时，选择 **"Prefab Variant"**。

---

## 3.5 父子关系（Parent-Child Relationship）

### 3.5.1 与 DOM 父子关系的对比

```html
<!-- HTML: 父子关系影响布局和样式继承 -->
<div class="parent" style="position: relative; left: 100px;">
  <!-- 子元素相对于父元素定位 -->
  <div class="child" style="position: absolute; left: 20px;">
    <!-- 实际在页面上的位置是 left: 120px -->
  </div>
</div>
```

```
Unity: 父子关系影响 Transform 继承

Parent (position: 10, 0, 0)
└── Child (localPosition: 2, 0, 0)
    → 世界位置 = 12, 0, 0

父对象旋转 90 度 → 子对象也跟着旋转 90 度
父对象缩放 2 倍 → 子对象视觉上也变大 2 倍
```

### 3.5.2 Transform 的层级影响

```csharp
public class ParentChildDemo : MonoBehaviour
{
    [SerializeField] private GameObject childPrefab;

    void Start()
    {
        // === 设置父子关系 ===

        // 方式 1：使用 SetParent
        GameObject child = Instantiate(childPrefab);
        child.transform.SetParent(transform);
        // 此时 child 的 localPosition 是相对于 this 的位置

        // 方式 2：SetParent 并保持世界坐标
        // worldPositionStays = true: 保持子对象在世界中的位置不变
        // worldPositionStays = false: 保持子对象的局部坐标不变
        child.transform.SetParent(transform, worldPositionStays: true);

        // 方式 3：直接设置 parent 属性
        child.transform.parent = transform;

        // === 遍历子对象 ===

        // 获取子对象数量
        int childCount = transform.childCount;
        Debug.Log($"子对象数量: {childCount}");

        // 通过索引获取子对象
        // 类似 element.children[0]
        Transform firstChild = transform.GetChild(0);

        // 遍历所有直接子对象
        // 类似 Array.from(element.children).forEach(...)
        foreach (Transform child_t in transform)
        {
            Debug.Log($"子对象: {child_t.name}, 局部坐标: {child_t.localPosition}");
        }

        // === 解除父子关系 ===

        // 将对象移到场景根级别
        // 类似 document.body.appendChild(element) 从嵌套中提取出来
        child.transform.SetParent(null);

        // === 查找父对象 ===

        // 获取父对象
        // 类似 element.parentElement
        Transform parent = transform.parent;

        // 获取最顶层父对象
        // 类似一直 .parentElement 直到 root
        Transform root = transform.root;
    }
}
```

### 3.5.3 世界坐标 vs 局部坐标

```csharp
public class CoordinateDemo : MonoBehaviour
{
    void Start()
    {
        // 假设层级结构:
        // GrandParent (position: 10, 0, 0)
        //   └── Parent (localPosition: 5, 0, 0)  → 世界位置: 15, 0, 0
        //       └── Child (localPosition: 2, 0, 0) → 世界位置: 17, 0, 0

        // 世界坐标：相对于世界原点的绝对位置
        // 类似 CSS 的 getBoundingClientRect()
        Vector3 worldPos = transform.position;  // (17, 0, 0)

        // 局部坐标：相对于父对象的位置
        // 类似 CSS 的 offsetLeft / offsetTop
        Vector3 localPos = transform.localPosition;  // (2, 0, 0)

        // 坐标转换
        // 将一个世界坐标转换为局部坐标
        Vector3 localPoint = transform.InverseTransformPoint(new Vector3(17, 0, 0));
        // 结果: (2, 0, 0)

        // 将一个局部坐标转换为世界坐标
        Vector3 worldPoint = transform.TransformPoint(new Vector3(2, 0, 0));
        // 结果: (17, 0, 0)
    }
}
```

### 3.5.4 父子关系的实际应用

```
实际场景示例:

1. 角色和武器:
   Player
   └── Hand (跟随角色动画)
       └── Sword (武器作为手的子对象，自然跟随)

2. 车辆:
   Car (车身)
   ├── Wheel_FL (前左轮 - 独立旋转)
   ├── Wheel_FR (前右轮)
   ├── Wheel_RL (后左轮)
   ├── Wheel_RR (后右轮)
   ├── Headlight_L (车灯)
   └── Headlight_R (车灯)

3. UI 布局:
   Canvas
   └── Panel (面板)
       ├── Title (标题文字)
       ├── Content (内容区域)
       │   ├── Item_01
       │   ├── Item_02
       │   └── Item_03
       └── CloseButton (关闭按钮)
```

---

## 3.6 Tag（标签）和 Layer（层级）系统

### 3.6.1 Tag —— 身份标识

Tag 类似于 HTML 的 `class` 或 `data-*` 属性，用于标识 GameObject 的"身份"。

```html
<!-- HTML 中的身份标识 -->
<div class="enemy boss" data-type="dragon">...</div>
```

```csharp
// Unity 中的 Tag 使用
// 每个 GameObject 只能有一个 Tag（不像 HTML class 可以有多个）

// 设置 Tag（通常在 Inspector 中设置，也可以代码设置）
gameObject.tag = "Player";

// 检查 Tag
if (gameObject.CompareTag("Player"))
{
    Debug.Log("这是玩家！");
}

// 通过 Tag 查找对象
GameObject player = GameObject.FindWithTag("Player");
GameObject[] enemies = GameObject.FindGameObjectsWithTag("Enemy");
```

**内置 Tag：**

```
Unity 内置 Tag:
├── Untagged    (默认)
├── Respawn     (重生点)
├── Finish      (终点)
├── EditorOnly  (仅编辑器)
├── MainCamera  (主摄像机)
├── Player      (玩家)
└── GameController (游戏控制器)
```

**创建自定义 Tag：**

1. Inspector 顶部 → Tag 下拉菜单 → **"Add Tag..."**
2. 在 Tags & Layers 设置中点击 **+** 添加新 Tag
3. 输入 Tag 名称，如 "Enemy"、"Collectible"、"NPC"

[截图：Tags & Layers 设置界面，显示自定义 Tag 列表]

**Tag 的常见用途：**

```csharp
// 碰撞检测时判断碰到了什么
void OnCollisionEnter(Collision collision)
{
    if (collision.gameObject.CompareTag("Enemy"))
    {
        TakeDamage(10);
    }
    else if (collision.gameObject.CompareTag("Collectible"))
    {
        PickUp(collision.gameObject);
        Destroy(collision.gameObject);
    }
    else if (collision.gameObject.CompareTag("Ground"))
    {
        isGrounded = true;
    }
}
```

### 3.6.2 Layer —— 分组与过滤

Layer 是一个更底层的分组系统，主要用于：
1. **渲染过滤**：摄像机可以选择只渲染特定 Layer 的对象
2. **物理碰撞过滤**：指定哪些 Layer 之间可以发生碰撞
3. **射线检测过滤**：射线只检测特定 Layer 的对象

```
类比 Web:
  Tag ≈ HTML class（语义标识）
  Layer ≈ CSS z-index + 分组（渲染控制和交互控制）
```

**内置 Layer：**

```
Unity 内置 Layer (0-7):
├── 0: Default
├── 1: TransparentFX
├── 2: Ignore Raycast
├── 3: (空)
├── 4: Water
├── 5: UI
├── 6: (空)
└── 7: (空)

自定义 Layer (8-31):
├── 8: Ground
├── 9: Player
├── 10: Enemy
├── 11: Interactable
├── 12: Projectile
└── ... 最多 32 个 Layer
```

**创建自定义 Layer：**

1. Inspector 顶部 → Layer 下拉菜单 → **"Add Layer..."**
2. 在空的编号位（8-31）中输入 Layer 名称

[截图：Tags & Layers 设置界面中的 Layer 列表]

**Layer 的代码使用：**

```csharp
public class LayerDemo : MonoBehaviour
{
    void Start()
    {
        // 设置 Layer
        gameObject.layer = LayerMask.NameToLayer("Enemy");

        // 射线检测时只检测特定 Layer
        // LayerMask 是一个位掩码（bitmask）
        int groundLayer = LayerMask.GetMask("Ground");
        int groundAndWater = LayerMask.GetMask("Ground", "Water");

        // 从摄像机发射一条射线，只检测 Ground 层
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);
        if (Physics.Raycast(ray, out RaycastHit hit, 100f, groundLayer))
        {
            Debug.Log($"射线击中了: {hit.point}");
        }
    }
}
```

**Layer 碰撞矩阵：**

你可以在 **Edit → Project Settings → Physics** 中设置 Layer 碰撞矩阵，指定哪些 Layer 之间可以发生物理碰撞：

```
碰撞矩阵示例:
              Default  Player  Enemy  Projectile
Default         ✅      ✅      ✅      ✅
Player          ✅      ❌      ✅      ❌
Enemy           ✅      ✅      ❌      ✅
Projectile      ✅      ❌      ✅      ❌

Player 和 Player 之间不碰撞（❌）
Enemy 和 Enemy 之间不碰撞（❌）
Player 和 Projectile 之间不碰撞（❌）—— 自己的子弹不伤害自己
Enemy 和 Projectile 碰撞（✅）—— 子弹可以击中敌人
```

[截图：Physics 设置中的 Layer Collision Matrix 界面]

### 3.6.3 Tag vs Layer 的选择

| 场景 | 用 Tag | 用 Layer |
|---|---|---|
| 标识对象身份 | ✅ "Player", "Enemy" | |
| 碰撞检测回调中判断类型 | ✅ CompareTag | |
| 控制相机渲染范围 | | ✅ Camera.cullingMask |
| 控制物理碰撞规则 | | ✅ 碰撞矩阵 |
| 射线检测过滤 | | ✅ LayerMask |
| 灯光影响范围 | | ✅ Light.cullingMask |
| 快速查找对象 | ✅ FindWithTag | |

---

## 3.7 MonoBehaviour 生命周期完整详解

我们在第零章简单介绍了生命周期，现在让我们深入了解完整的 MonoBehaviour 生命周期：

```csharp
using UnityEngine;

/// <summary>
/// MonoBehaviour 完整生命周期演示
/// 将此脚本挂载到一个 GameObject 上，观察 Console 输出
/// </summary>
public class LifecycleDemo : MonoBehaviour
{
    // ===========================
    //    初始化阶段
    // ===========================

    /// <summary>
    /// 最早调用，在对象被创建时调用（即使组件是禁用的也会调用）
    /// 用途：初始化不依赖其他组件的变量
    /// React 类比：constructor() —— 或 useState 的初始值
    /// </summary>
    void Awake()
    {
        Debug.Log("1. Awake() - 对象被创建，最早的初始化");
    }

    /// <summary>
    /// 当组件被启用时调用（每次启用都会调用）
    /// 用途：注册事件监听器
    /// React 类比：组件挂载时的 useEffect
    /// </summary>
    void OnEnable()
    {
        Debug.Log("2. OnEnable() - 组件被启用");
    }

    /// <summary>
    /// 在 Awake 之后、第一次 Update 之前调用（只调用一次）
    /// 只有在组件启用时才会调用
    /// 用途：初始化需要其他组件的引用
    /// React 类比：componentDidMount / useEffect(() => {}, [])
    /// </summary>
    void Start()
    {
        Debug.Log("3. Start() - 第一帧前的初始化");
    }

    // ===========================
    //    运行阶段（每帧循环）
    // ===========================

    /// <summary>
    /// 固定时间间隔调用（默认 0.02 秒）
    /// 用途：物理相关的逻辑（AddForce, Rigidbody 操作）
    /// React 类比：无直接对应（类似固定间隔的 setInterval）
    /// </summary>
    void FixedUpdate()
    {
        // 每 0.02 秒执行一次（与帧率无关）
        // 适合：物理计算、移动 Rigidbody
    }

    /// <summary>
    /// 每帧调用一次
    /// 用途：输入处理、非物理的游戏逻辑
    /// React 类比：requestAnimationFrame
    /// </summary>
    void Update()
    {
        // 每帧执行一次
        // 适合：输入检测、动画控制、游戏逻辑
    }

    /// <summary>
    /// 在所有 Update 调用之后每帧调用
    /// 用途：相机跟随（确保目标已经移动完毕）
    /// React 类比：useLayoutEffect（在渲染后执行）
    /// </summary>
    void LateUpdate()
    {
        // 在 Update 之后执行
        // 适合：相机跟随、最终位置调整
    }

    // ===========================
    //    碰撞与触发回调
    // ===========================

    /// <summary>
    /// 物理碰撞开始时调用（需要 Rigidbody + Collider）
    /// React 类比：onMouseEnter（但是是 3D 物理碰撞）
    /// </summary>
    void OnCollisionEnter(Collision collision)
    {
        Debug.Log($"碰撞开始: {collision.gameObject.name}");
    }

    /// <summary>
    /// 物理碰撞持续中
    /// </summary>
    void OnCollisionStay(Collision collision)
    {
        // 持续碰撞中，每个物理帧都调用
    }

    /// <summary>
    /// 物理碰撞结束
    /// React 类比：onMouseLeave
    /// </summary>
    void OnCollisionExit(Collision collision)
    {
        Debug.Log($"碰撞结束: {collision.gameObject.name}");
    }

    /// <summary>
    /// 触发器进入（Collider 的 isTrigger = true）
    /// 用途：进入区域检测（如进入商店、触发对话）
    /// React 类比：IntersectionObserver
    /// </summary>
    void OnTriggerEnter(Collider other)
    {
        Debug.Log($"触发器进入: {other.gameObject.name}");
    }

    void OnTriggerStay(Collider other) { }
    void OnTriggerExit(Collider other) { }

    // ===========================
    //    清理阶段
    // ===========================

    /// <summary>
    /// 组件被禁用时调用（每次禁用都会调用）
    /// 用途：取消注册事件监听器
    /// React 类比：useEffect 的清理函数
    /// </summary>
    void OnDisable()
    {
        Debug.Log("OnDisable() - 组件被禁用");
    }

    /// <summary>
    /// 对象被销毁时调用（只调用一次）
    /// 用途：最终清理工作
    /// React 类比：componentWillUnmount
    /// </summary>
    void OnDestroy()
    {
        Debug.Log("OnDestroy() - 对象被销毁");
    }

    // ===========================
    //    其他有用的回调
    // ===========================

    /// <summary>
    /// 渲染到屏幕前调用（用于 Debug 绘制）
    /// </summary>
    void OnDrawGizmos()
    {
        // 在 Scene View 中绘制辅助图形（不影响 Game View）
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, 2f);
    }

    /// <summary>
    /// 对象变为可见/不可见时调用
    /// </summary>
    void OnBecameVisible()
    {
        Debug.Log("对象进入摄像机视野");
    }

    void OnBecameInvisible()
    {
        Debug.Log("对象离开摄像机视野");
    }

    /// <summary>
    /// 应用程序暂停/恢复时调用（手机切后台）
    /// </summary>
    void OnApplicationPause(bool pauseStatus)
    {
        Debug.Log($"应用暂停状态: {pauseStatus}");
    }
}
```

**生命周期执行顺序速查图：**

```
对象创建
    ↓
  Awake()
    ↓
  OnEnable()
    ↓
  Start()
    ↓
┌──────────── 每帧循环开始 ────────────┐
│  FixedUpdate() (可能多次)             │
│       ↓                              │
│  Update()                            │
│       ↓                              │
│  LateUpdate()                        │
│       ↓                              │
│  渲染                                │
└──────────── 下一帧 ─────────────────┘
    ↓ (对象/组件被禁用)
  OnDisable()
    ↓ (对象被销毁)
  OnDestroy()
```

---

## 3.8 实战练习：构建一个可交互的场景

让我们通过一个综合示例来实践本章学到的所有知识。

### 3.8.1 场景设置

创建以下场景结构：

```
InteractiveScene
├── --- Environment ---
│   ├── Ground (Plane, Scale: 10, 1, 10)
│   └── SpawnPoints (Empty)
│       ├── SpawnPoint_01 (Empty, Position: -5, 0, -5)
│       ├── SpawnPoint_02 (Empty, Position: 5, 0, -5)
│       └── SpawnPoint_03 (Empty, Position: 0, 0, 5)
├── --- Gameplay ---
│   ├── Player (Capsule)
│   └── Collectibles (Empty)
├── --- Lighting ---
│   └── Directional Light
└── --- Cameras ---
    └── Main Camera
```

### 3.8.2 创建可收集物品 Prefab

创建以下脚本 `Collectible.cs`：

```csharp
using UnityEngine;

/// <summary>
/// 可收集物品脚本
/// 物品会自动旋转和上下浮动，接触玩家时被收集
/// </summary>
public class Collectible : MonoBehaviour
{
    [Header("外观")]
    [SerializeField] private float rotationSpeed = 90f;
    [SerializeField] private float bobSpeed = 2f;
    [SerializeField] private float bobHeight = 0.3f;

    [Header("效果")]
    [SerializeField] private int scoreValue = 10;

    // 初始位置（用于浮动效果的基准点）
    private Vector3 startPosition;

    void Start()
    {
        // 记录初始位置
        startPosition = transform.position;
    }

    void Update()
    {
        // 旋转动画
        transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime);

        // 上下浮动动画（使用 Sin 函数）
        // 类似 CSS: animation: bob 2s ease-in-out infinite
        float newY = startPosition.y + Mathf.Sin(Time.time * bobSpeed) * bobHeight;
        transform.position = new Vector3(
            transform.position.x,
            newY,
            transform.position.z
        );
    }

    /// <summary>
    /// 当其他带有 Collider 和 Rigidbody 的对象进入触发区域时调用
    /// 需要此对象的 Collider 勾选 "Is Trigger"
    /// </summary>
    void OnTriggerEnter(Collider other)
    {
        // 只对 Player 标签的对象响应
        if (other.CompareTag("Player"))
        {
            // 通知 GameManager（如果有的话）
            Debug.Log($"收集了物品！获得 {scoreValue} 分");

            // 销毁自身
            Destroy(gameObject);
        }
    }

    /// <summary>
    /// 在 Scene View 中绘制辅助图形
    /// 帮助在编辑模式下可视化触发范围
    /// </summary>
    void OnDrawGizmosSelected()
    {
        // 绘制一个绿色的线框球体，显示大致的收集范围
        Gizmos.color = Color.green;
        SphereCollider sphereCollider = GetComponent<SphereCollider>();
        if (sphereCollider != null)
        {
            Gizmos.DrawWireSphere(
                transform.position,
                sphereCollider.radius * transform.localScale.x
            );
        }
    }
}
```

### 3.8.3 创建简单的玩家控制器

创建 `SimplePlayerController.cs`：

```csharp
using UnityEngine;

/// <summary>
/// 简单的第三人称玩家控制器
/// 支持 WASD 移动和空格跳跃
/// </summary>
[RequireComponent(typeof(Rigidbody))]
[RequireComponent(typeof(CapsuleCollider))]
public class SimplePlayerController : MonoBehaviour
{
    [Header("移动")]
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float rotateSpeed = 720f; // 每秒旋转度数

    [Header("跳跃")]
    [SerializeField] private float jumpForce = 5f;
    [SerializeField] private LayerMask groundLayer; // 在 Inspector 中设置为 Ground

    [Header("地面检测")]
    [SerializeField] private float groundCheckDistance = 0.1f;

    private Rigidbody rb;
    private bool isGrounded;
    private int collectCount = 0;

    void Awake()
    {
        // 在 Awake 中获取组件引用（最早的初始化）
        rb = GetComponent<Rigidbody>();
        rb.freezeRotation = true; // 防止物理系统影响旋转
    }

    void Start()
    {
        // 确保有 Player 标签
        gameObject.tag = "Player";
        Debug.Log("玩家控制器已启动！使用 WASD 移动，空格跳跃");
    }

    void Update()
    {
        // 输入检测放在 Update 中
        CheckGround();
        HandleJump();
    }

    void FixedUpdate()
    {
        // 物理移动放在 FixedUpdate 中
        HandleMovement();
    }

    void HandleMovement()
    {
        // 获取输入
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");

        // 计算移动方向
        Vector3 moveDirection = new Vector3(h, 0, v).normalized;

        if (moveDirection.magnitude > 0.1f)
        {
            // 计算目标旋转
            float targetAngle = Mathf.Atan2(moveDirection.x, moveDirection.z) * Mathf.Rad2Deg;
            float smoothAngle = Mathf.LerpAngle(
                transform.eulerAngles.y,
                targetAngle,
                rotateSpeed * Time.fixedDeltaTime / 360f
            );
            transform.rotation = Quaternion.Euler(0, smoothAngle, 0);

            // 移动
            Vector3 move = moveDirection * moveSpeed * Time.fixedDeltaTime;
            rb.MovePosition(rb.position + move);
        }
    }

    void HandleJump()
    {
        if (Input.GetKeyDown(KeyCode.Space) && isGrounded)
        {
            rb.AddForce(Vector3.up * jumpForce, ForceMode.Impulse);
            Debug.Log("跳跃！");
        }
    }

    void CheckGround()
    {
        // 从角色脚底发射一条短射线检测是否在地面上
        isGrounded = Physics.Raycast(
            transform.position,
            Vector3.down,
            groundCheckDistance + 0.5f, // 胶囊体高度的一半 + 检测距离
            groundLayer
        );
    }

    /// <summary>
    /// 收集物品（由 Collectible 脚本调用或直接在此处处理）
    /// </summary>
    public void AddScore(int value)
    {
        collectCount += value;
        Debug.Log($"当前收集总分: {collectCount}");
    }

    /// <summary>
    /// 在 Scene View 中绘制地面检测射线
    /// </summary>
    void OnDrawGizmos()
    {
        Gizmos.color = isGrounded ? Color.green : Color.red;
        Gizmos.DrawLine(
            transform.position,
            transform.position + Vector3.down * (groundCheckDistance + 0.5f)
        );
    }
}
```

### 3.8.4 创建生成器脚本

创建 `CollectibleSpawner.cs`：

```csharp
using UnityEngine;

/// <summary>
/// 在指定的生成点生成可收集物品
/// 演示 Prefab 实例化和父子关系
/// </summary>
public class CollectibleSpawner : MonoBehaviour
{
    [Header("Prefab 设置")]
    [SerializeField] private GameObject collectiblePrefab;

    [Header("生成设置")]
    [SerializeField] private int itemsPerSpawnPoint = 3;
    [SerializeField] private float spawnRadius = 2f;
    [SerializeField] private float spawnHeight = 1f;

    void Start()
    {
        SpawnAllCollectibles();
    }

    void SpawnAllCollectibles()
    {
        // 获取所有子对象作为生成点
        // 类似 document.querySelectorAll('.spawn-point')
        foreach (Transform spawnPoint in transform)
        {
            for (int i = 0; i < itemsPerSpawnPoint; i++)
            {
                // 在生成点周围随机位置生成
                Vector3 offset = new Vector3(
                    Random.Range(-spawnRadius, spawnRadius),
                    spawnHeight,
                    Random.Range(-spawnRadius, spawnRadius)
                );

                Vector3 spawnPosition = spawnPoint.position + offset;

                // 实例化 Prefab
                GameObject item = Instantiate(
                    collectiblePrefab,
                    spawnPosition,
                    Quaternion.identity
                );

                // 设置为 Collectibles 容器的子对象（保持 Hierarchy 整洁）
                item.name = $"Collectible_{spawnPoint.name}_{i}";

                // 不设置为 spawnPoint 的子对象
                // 而是设置为一个独立的容器的子对象
                GameObject container = GameObject.Find("Collectibles");
                if (container != null)
                {
                    item.transform.SetParent(container.transform);
                }
            }
        }

        Debug.Log($"已生成 {transform.childCount * itemsPerSpawnPoint} 个可收集物品");
    }

    /// <summary>
    /// 在 Scene View 中可视化生成范围
    /// </summary>
    void OnDrawGizmos()
    {
        Gizmos.color = new Color(1, 0.5f, 0, 0.3f); // 半透明橙色

        foreach (Transform spawnPoint in transform)
        {
            // 绘制生成范围球体
            Gizmos.DrawWireSphere(spawnPoint.position, spawnRadius);
            // 标记生成点
            Gizmos.DrawSphere(spawnPoint.position, 0.2f);
        }
    }
}
```

[截图：完成后的场景效果 —— 地面上有旋转浮动的可收集物品，玩家胶囊体可以移动收集]

---

## 3.9 本章练习

### 练习 1：组件探索

1. 创建一个 Sphere，逐一添加以下组件，观察每个组件的作用：
   - Rigidbody（添加后运行游戏，观察球会怎样）
   - Audio Source（添加一个音频文件并播放）
   - Light → Point Light（让球体发光）
   - Trail Renderer（移动球体时留下拖尾）

2. 对于每个组件，在 Inspector 中调整 2-3 个属性，观察效果变化

### 练习 2：Prefab 练习

1. 创建一个 "柱子" Prefab：
   - 使用 Cylinder 作为基础
   - 调整 Scale 为 (0.5, 2, 0.5)
   - 添加一个 Point Light 作为子对象（放在顶部）
   - 创建一个自定义材质，设置颜色

2. 将 Prefab 拖入场景 5 次，排成一排
3. 修改其中一个实例的颜色（Override）
4. 修改 Prefab 模板（双击进入 Prefab 编辑模式），给所有柱子加高
5. 观察哪些实例被更新了，哪些保留了自己的 Override

### 练习 3：父子关系实验

1. 创建以下层级结构：

```
SolarSystem (Empty, Position: 0,0,0)
├── Sun (Sphere, Scale: 3,3,3, 黄色材质)
└── EarthOrbit (Empty, Position: 0,0,0)
    └── Earth (Sphere, Scale: 0.5,0.5,0.5, 蓝色材质, LocalPosition: 8,0,0)
        └── MoonOrbit (Empty, Position: 0,0,0)
            └── Moon (Sphere, Scale: 0.2,0.2,0.2, 灰色材质, LocalPosition: 1.5,0,0)
```

2. 给 EarthOrbit 添加一个旋转脚本（绕 Y 轴每秒旋转 30 度）
3. 给 MoonOrbit 添加一个旋转脚本（绕 Y 轴每秒旋转 90 度）
4. 运行游戏，观察 Earth 围绕 Sun 转，Moon 围绕 Earth 转的效果
5. 思考：为什么使用空的 "Orbit" 对象作为父级，而不是直接旋转 Earth？

```csharp
// 提示：旋转脚本
public class Orbit : MonoBehaviour
{
    [SerializeField] private float rotationSpeed = 30f;

    void Update()
    {
        transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime);
    }
}
```

### 练习 4：Tag 和 Layer 实践

1. 创建以下自定义 Tag：`Collectible`、`Obstacle`、`NPC`
2. 创建以下自定义 Layer：`Ground`、`Player`、`Interactable`
3. 将场景中的对象分配到正确的 Tag 和 Layer
4. 在 Physics 设置中配置碰撞矩阵：
   - Player 和 Ground 碰撞（✅）
   - Player 和 Interactable 碰撞（✅）
   - Interactable 和 Interactable 不碰撞（❌）

### 练习 5：生命周期日志

1. 创建一个脚本，包含所有生命周期方法（参考 3.7 节的 LifecycleDemo）
2. 在每个方法中添加 `Debug.Log` 输出
3. 将脚本挂载到一个 GameObject 上
4. 运行游戏，观察 Console 中方法的调用顺序
5. 在运行中禁用然后重新启用该组件，观察 OnDisable 和 OnEnable 的调用
6. 删除该 GameObject，观察 OnDestroy 的调用
7. 记录下完整的调用顺序，与 React 生命周期做对比

---

## 3.10 下一章预告

在下一章 **《第 04 章：C# 编程基础（面向 TypeScript 开发者）》** 中，我们将：

- 系统对比 C# 和 TypeScript 的语法差异
- 学习 C# 特有的语言特性（值类型 vs 引用类型、struct vs class 等）
- 理解 Unity 中常用的 C# 模式
- 掌握 Unity 相关的 C# 编码规范
- 学习如何利用 TypeScript 的经验快速上手 C#

这将为后续更复杂的游戏系统开发打下坚实的语言基础。

---

> **本章小结**
>
> 本章是理解 Unity 架构的基石。我们深入学习了：
>
> 1. **GameObject** 是 Unity 世界中的基本实体，类似 DOM Element
> 2. **Transform** 是唯一不可移除的组件，控制位置、旋转、缩放
> 3. **Component 模式** 遵循"组合优于继承"原则，和 React 的组件思想高度一致
> 4. **Prefab** 是可复用的 GameObject 模板，类似 React 的可复用组件
> 5. **父子关系** 影响 Transform 的继承，类似 CSS 中的相对定位
> 6. **Tag** 用于身份标识，**Layer** 用于渲染和物理碰撞的分组
> 7. **MonoBehaviour 生命周期** 和 React 组件生命周期有清晰的对应关系
>
> 掌握了这些概念，你就理解了 Unity 游戏是如何组织和运行的。后续所有的游戏系统都建立在这个基础之上。
