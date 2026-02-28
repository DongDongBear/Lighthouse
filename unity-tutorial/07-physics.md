# 第七章：物理系统

## 本章目标

- 理解 Unity 物理引擎（PhysX）的工作原理
- 掌握 Rigidbody 组件的属性和使用方法
- 学会使用各种碰撞体（Box、Sphere、Capsule、Mesh Collider）
- 区分碰撞（Collision）和触发器（Trigger）
- 处理碰撞和触发器事件（OnCollisionEnter/Stay/Exit、OnTriggerEnter/Stay/Exit）
- 学会使用物理材质（Physics Material）控制摩擦和弹性
- 掌握射线检测（Raycasting）的多种用法
- 理解层级碰撞矩阵（Layer Collision Matrix）
- 区分 FixedUpdate 和 Update 在物理中的使用场景
- 了解关节（Joints）的基础用法
- 完成三个实战案例：可拾取物品、压力板机关、弹丸发射

## 预计学习时间

**4-5 小时**（包含动手实践时间，建议每个实战案例都跟着做一遍）

---

## 7.1 Unity 物理引擎概述

Unity 使用 NVIDIA 的 **PhysX** 引擎来模拟物理效果。它负责处理：
- 重力
- 碰撞检测和响应
- 摩擦力和弹力
- 关节和约束

### 7.1.1 物理系统的基本规则

1. **只有带 Rigidbody 的物体才参与物理模拟** — 没有 Rigidbody 的物体是"静态"的
2. **碰撞检测至少需要双方都有 Collider** — 两个没有 Collider 的物体会互相穿过
3. **物理更新在 FixedUpdate 中进行** — 不是每帧一次，而是固定时间间隔（默认 0.02 秒，即 50 次/秒）
4. **移动物理物体应该使用力或 Rigidbody 的方法** — 直接修改 Transform 可能导致物理不正确

### 7.1.2 物理配置

全局物理设置在 **Edit > Project Settings > Physics** 中：

[截图：Physics 设置面板，标注关键参数]

```
Physics 设置关键参数：
  Gravity: (0, -9.81, 0)          ← 默认地球重力
  Default Solver Iterations: 6     ← 碰撞求解迭代次数
  Default Solver Velocity Iterations: 1
  Sleep Threshold: 0.005           ← 速度低于此值时物体"休眠"
  Default Contact Offset: 0.01     ← 接触偏移量
  Bounce Threshold: 2              ← 低于此速度的碰撞不反弹
  Auto Sync Transforms: false      ← 是否自动同步 Transform
```

> **Gravity 的 Y 值为 -9.81** 对应现实中的重力加速度 9.81 m/s^2。你可以修改这个值来创造不同的物理环境（比如月球重力 -1.62，或者太空 0）。

---

## 7.2 Rigidbody 组件详解

Rigidbody 是 Unity 中最重要的物理组件。给一个 GameObject 添加 Rigidbody 后，它就会被物理引擎控制。

### 7.2.1 添加 Rigidbody

1. 选中一个 GameObject（比如一个 Cube）
2. Inspector > **Add Component** > 搜索 **Rigidbody**
3. 点击添加

[截图：Rigidbody 组件在 Inspector 中的完整界面]

### 7.2.2 Rigidbody 属性详解

```
Rigidbody 组件属性：

Mass（质量）: 1
  - 单位是千克（kg）
  - 影响碰撞时的动量传递
  - 质量大的物体不容易被推动
  - 重力加速度与质量无关（和现实一样）
  - 建议保持在 0.1 到 100 之间，比例合理即可

Drag（阻力）: 0
  - 线性阻力，模拟空气阻力
  - 0 = 无阻力（真空中的运动）
  - 值越大，物体越快停下来
  - 类似摩擦力的效果
  - 建议值：0-5

Angular Drag（角阻力）: 0.05
  - 旋转阻力
  - 0 = 旋转永不停止
  - 值越大，旋转越快停下来
  - 默认 0.05 已经适合大多数情况

Use Gravity（使用重力）: true
  - 是否受重力影响
  - 取消勾选 = 物体在空中悬浮（太空物体）

Is Kinematic（运动学模式）: false
  - 勾选后：物体不受物理引擎驱动，但仍能参与碰撞检测
  - 用途：需要通过代码精确控制移动，但仍要检测碰撞
  - 例如：移动平台、电梯、推关的门
  - 类似于 "我控制位置，物理引擎只负责碰撞检测"

Interpolate（插值）: None
  - None: 不插值（可能有抖动）
  - Interpolate: 基于上一帧插值（推荐用于玩家控制的物体）
  - Extrapolate: 基于预测插值（可能不准确）
  - 解决物理更新频率和渲染帧率不同步导致的抖动

Collision Detection（碰撞检测模式）: Discrete
  - Discrete: 离散检测（默认，高性能）
  - Continuous: 连续检测（防止快速物体穿过）
  - Continuous Dynamic: 连续动态检测（防止快速物体穿过静态物体）
  - Continuous Speculative: 推测性连续检测（最准确但最慢）
  - 快速移动的物体（如子弹）应该使用 Continuous

Constraints（约束）:
  Freeze Position: [X] [Y] [Z]  ← 锁定指定轴的位置
  Freeze Rotation: [X] [Y] [Z]  ← 锁定指定轴的旋转
  - 常见用法：锁定 X 和 Z 旋转，防止角色倒下
```

### 7.2.3 通过代码操作 Rigidbody

```csharp
using UnityEngine;

/// <summary>
/// Rigidbody 操作示例
/// 展示如何通过代码给物体施加力和控制物理行为
/// </summary>
public class RigidbodyExample : MonoBehaviour
{
    [Header("组件引用")]
    private Rigidbody _rb;

    [Header("力的设置")]
    [SerializeField] private float pushForce = 10f;        // 推力
    [SerializeField] private float torqueForce = 5f;        // 扭矩

    void Start()
    {
        // 获取 Rigidbody 组件
        _rb = GetComponent<Rigidbody>();

        // 设置属性
        _rb.mass = 2f;                    // 2千克
        _rb.drag = 0.5f;                  // 轻微阻力
        _rb.angularDrag = 1f;             // 旋转阻力
        _rb.useGravity = true;            // 受重力影响
        _rb.isKinematic = false;          // 非运动学模式

        // 锁定旋转（防止翻倒）
        _rb.constraints = RigidbodyConstraints.FreezeRotationX
                        | RigidbodyConstraints.FreezeRotationZ;
    }

    void FixedUpdate()
    {
        // 重要：物理操作必须在 FixedUpdate 中执行！
        // 不要在 Update 中操作 Rigidbody

        // ========== 施加力 ==========

        // AddForce - 持续施加力（加速度效果）
        // ForceMode 决定力的类型：
        // Force:        持续力，受质量影响（F=ma）
        // Acceleration: 持续加速度，忽略质量
        // Impulse:      瞬时冲量，受质量影响（一次性推动）
        // VelocityChange: 瞬时速度变化，忽略质量

        if (Input.GetKey(KeyCode.UpArrow))
        {
            // 向前施加持续力（像推箱子）
            _rb.AddForce(Vector3.forward * pushForce, ForceMode.Force);
        }

        if (Input.GetKeyDown(KeyCode.Space))
        {
            // 向上施加瞬时冲量（像跳跃）
            _rb.AddForce(Vector3.up * 5f, ForceMode.Impulse);
        }

        // ========== 施加扭矩（旋转力） ==========
        if (Input.GetKey(KeyCode.LeftArrow))
        {
            _rb.AddTorque(Vector3.up * -torqueForce);
        }
        if (Input.GetKey(KeyCode.RightArrow))
        {
            _rb.AddTorque(Vector3.up * torqueForce);
        }

        // ========== 直接设置速度（不推荐频繁使用）==========
        // _rb.linearVelocity = new Vector3(5f, _rb.linearVelocity.y, 0f);
        // 注意：Unity 2023+ 中 velocity 改名为 linearVelocity
        // 旧版本使用 _rb.velocity

        // ========== 在指定位置施加力 ==========
        // 会同时产生平移和旋转效果（像踢球）
        // _rb.AddForceAtPosition(Vector3.forward * 10f, transform.position + Vector3.right);

        // ========== 施加爆炸力 ==========
        // 模拟从指定点向外的爆炸冲击波
        // _rb.AddExplosionForce(500f, explosionPoint, 10f);
    }

    // 读取速度信息
    void Update()
    {
        // 获取当前速度（可以在 Update 中读取，但不要在 Update 中修改）
        Vector3 currentVelocity = _rb.linearVelocity;
        float speed = currentVelocity.magnitude; // 速度大小
        Debug.Log($"当前速度: {speed:F2} m/s");
    }
}
```

### 7.2.4 ForceMode 对比

| ForceMode | 描述 | 公式 | 适用场景 |
|-----------|------|------|---------|
| Force | 持续力 | F = m * a，每 FixedUpdate | 推箱子、风力 |
| Acceleration | 持续加速度 | a = F（忽略质量） | 统一的加速效果 |
| Impulse | 瞬时冲量 | p = F * dt | 跳跃、爆炸、射击后坐力 |
| VelocityChange | 瞬时速度变化 | v = F（忽略质量） | 立即改变速度 |

---

## 7.3 碰撞体（Colliders）

碰撞体定义了物体的物理形状。Unity 提供了多种碰撞体类型。

### 7.3.1 碰撞体类型总览

| 碰撞体 | 形状 | 性能 | 适用场景 |
|--------|------|------|---------|
| Box Collider | 长方体 | 最快 | 箱子、墙壁、地面 |
| Sphere Collider | 球体 | 很快 | 球、弹丸、检测范围 |
| Capsule Collider | 胶囊体 | 快 | 角色、柱子 |
| Mesh Collider | 自定义网格 | 慢 | 复杂地形、精确碰撞 |
| Wheel Collider | 车轮 | 特殊 | 车辆 |
| Terrain Collider | 地形 | 特殊 | Unity 地形系统 |

[截图：不同碰撞体类型的可视化效果（绿色线框）]

### 7.3.2 Box Collider

```
Box Collider 属性：
  Is Trigger: false      ← 是否为触发器（后面详细讲）
  Material: None          ← 物理材质（后面详细讲）
  Center: (0, 0, 0)       ← 碰撞体中心相对于物体的偏移
  Size: (1, 1, 1)         ← 碰撞体尺寸
```

### 7.3.3 Sphere Collider

```
Sphere Collider 属性：
  Is Trigger: false
  Material: None
  Center: (0, 0, 0)
  Radius: 0.5             ← 球体半径
```

### 7.3.4 Capsule Collider

```
Capsule Collider 属性：
  Is Trigger: false
  Material: None
  Center: (0, 0, 0)
  Radius: 0.5             ← 胶囊体半径
  Height: 2               ← 胶囊体总高度
  Direction: Y-Axis        ← 胶囊体方向（X/Y/Z 轴）
```

### 7.3.5 Mesh Collider

Mesh Collider 使用物体的实际网格形状作为碰撞体。

```
Mesh Collider 属性：
  Is Trigger: false
  Material: None
  Convex: false            ← 是否使用凸包
    - false: 精确匹配网格形状（不能有 Rigidbody）
    - true: 使用简化的凸包形状（可以有 Rigidbody，最多 255 个三角面）
  Mesh: (自动使用物体的 Mesh)
```

> **性能提示：**
> - 尽量使用简单碰撞体（Box、Sphere、Capsule）代替 Mesh Collider
> - 可以用多个简单碰撞体组合来近似复杂形状
> - 非 Convex 的 Mesh Collider 不能与其他非 Convex 的 Mesh Collider 碰撞
> - 复杂模型通常在 3D 建模软件中单独制作低面数的碰撞网格

### 7.3.6 复合碰撞体

通过组合多个简单碰撞体来近似复杂形状：

```
桌子的碰撞体组合：
Table (空 GameObject + Rigidbody)
├── TableTop (子物体 + Box Collider，大小 2x0.1x1)
├── Leg_FL (子物体 + Box Collider，大小 0.1x0.8x0.1)
├── Leg_FR (子物体 + Box Collider)
├── Leg_BL (子物体 + Box Collider)
└── Leg_BR (子物体 + Box Collider)
```

```csharp
// 代码创建复合碰撞体的示例
public class CompoundColliderExample : MonoBehaviour
{
    void Start()
    {
        // 在当前物体上添加多个碰撞体
        // Unity 允许一个 GameObject 有多个 Collider

        // 主体碰撞体
        BoxCollider bodyCollider = gameObject.AddComponent<BoxCollider>();
        bodyCollider.center = new Vector3(0f, 0.5f, 0f);
        bodyCollider.size = new Vector3(1f, 1f, 0.5f);

        // 头部碰撞体
        SphereCollider headCollider = gameObject.AddComponent<SphereCollider>();
        headCollider.center = new Vector3(0f, 1.2f, 0f);
        headCollider.radius = 0.25f;
    }
}
```

---

## 7.4 触发器（Triggers）vs 碰撞（Collisions）

这是 Unity 物理系统中最重要的概念之一。

### 7.4.1 核心区别

| 特征 | 碰撞（Collision） | 触发器（Trigger） |
|------|-------------------|------------------|
| Is Trigger | false | true |
| 物理响应 | 有（物体会弹开） | 无（物体穿过去） |
| 事件方法 | OnCollisionEnter/Stay/Exit | OnTriggerEnter/Stay/Exit |
| 典型用途 | 墙壁、地面、物理物体 | 拾取物品、进入区域、检测范围 |
| 必要条件 | 至少一方有 Rigidbody | 至少一方有 Rigidbody |

### 7.4.2 碰撞检测条件矩阵

两个物体能否发生碰撞/触发，取决于它们的组件配置：

**碰撞事件（OnCollision）触发条件：**

| | 静态 Collider | Rigidbody + Collider | Kinematic Rigidbody + Collider |
|---|---|---|---|
| 静态 Collider | 否 | **是** | 否 |
| Rigidbody + Collider | **是** | **是** | **是** |
| Kinematic Rigidbody + Collider | 否 | **是** | 否 |

**触发事件（OnTrigger）触发条件：**
至少一方的 Collider 的 `Is Trigger` 为 true，且至少一方有 Rigidbody。

### 7.4.3 碰撞事件处理

```csharp
using UnityEngine;

/// <summary>
/// 碰撞事件处理示例
/// 此脚本挂在有 Rigidbody 和 Collider 的物体上
/// </summary>
public class CollisionExample : MonoBehaviour
{
    /// <summary>
    /// 碰撞开始（两个物体刚接触的那一帧）
    /// 只触发一次
    /// </summary>
    void OnCollisionEnter(Collision collision)
    {
        // collision 包含了碰撞的详细信息
        Debug.Log($"碰撞开始！碰到了: {collision.gameObject.name}");

        // 碰撞点信息（第一个接触点）
        if (collision.contactCount > 0)
        {
            ContactPoint contact = collision.GetContact(0);
            Vector3 hitPoint = contact.point;       // 碰撞点位置
            Vector3 hitNormal = contact.normal;     // 碰撞面法线
            float hitForce = collision.relativeVelocity.magnitude; // 碰撞力度

            Debug.Log($"碰撞点: {hitPoint}");
            Debug.Log($"碰撞法线: {hitNormal}");
            Debug.Log($"碰撞力度: {hitForce:F2}");
        }

        // 通过 Tag 判断碰撞对象
        if (collision.gameObject.CompareTag("Player"))
        {
            Debug.Log("被玩家碰到了！");
        }

        // 获取碰到的物体上的组件
        Rigidbody otherRb = collision.gameObject.GetComponent<Rigidbody>();
        if (otherRb != null)
        {
            // 给碰到的物体施加反弹力
            Vector3 bounceDirection = collision.GetContact(0).normal;
            otherRb.AddForce(bounceDirection * 5f, ForceMode.Impulse);
        }
    }

    /// <summary>
    /// 碰撞持续（两个物体保持接触时，每帧触发）
    /// 持续触发
    /// </summary>
    void OnCollisionStay(Collision collision)
    {
        // 用于持续接触的效果
        // 比如：站在传送带上持续被推动
        // 注意：这个方法会频繁调用，避免在其中做耗时操作
    }

    /// <summary>
    /// 碰撞结束（两个物体分离的那一帧）
    /// 只触发一次
    /// </summary>
    void OnCollisionExit(Collision collision)
    {
        Debug.Log($"碰撞结束！离开了: {collision.gameObject.name}");
    }
}
```

### 7.4.4 触发器事件处理

```csharp
using UnityEngine;

/// <summary>
/// 触发器事件处理示例
/// 此脚本挂在 Is Trigger = true 的 Collider 上
/// </summary>
public class TriggerExample : MonoBehaviour
{
    /// <summary>
    /// 进入触发区域（物体刚进入的那一帧）
    /// </summary>
    void OnTriggerEnter(Collider other)
    {
        // other 是进入触发区域的碰撞体
        // 注意：参数类型是 Collider（不是 Collision）
        Debug.Log($"进入触发区域: {other.gameObject.name}");

        // 通过 Tag 判断
        if (other.CompareTag("Player"))
        {
            Debug.Log("玩家进入了区域！");
        }
    }

    /// <summary>
    /// 在触发区域内停留（每帧触发）
    /// </summary>
    void OnTriggerStay(Collider other)
    {
        // 持续在区域内的效果
        // 比如：伤害区域持续造成伤害
    }

    /// <summary>
    /// 离开触发区域（物体离开的那一帧）
    /// </summary>
    void OnTriggerExit(Collider other)
    {
        Debug.Log($"离开触发区域: {other.gameObject.name}");
    }
}
```

---

## 7.5 物理材质（Physics Material）

物理材质定义了碰撞体表面的物理属性：摩擦力和弹性。

### 7.5.1 创建物理材质

1. Project 窗口 > 右键 > **Create > Physic Material**（注意不是 Physics Material，Unity 中写法是 Physic Material）
2. 命名为 `PM_Bouncy`

[截图：创建 Physic Material 的菜单]

### 7.5.2 物理材质属性

```
Physic Material 属性：

Dynamic Friction（动摩擦力）: 0.6
  - 物体在移动时的摩擦力
  - 0 = 无摩擦（冰面）
  - 1 = 高摩擦（橡胶）

Static Friction（静摩擦力）: 0.6
  - 物体从静止开始移动需要克服的摩擦力
  - 通常 >= Dynamic Friction

Bounciness（弹性）: 0
  - 碰撞后的反弹系数
  - 0 = 不反弹（泥巴）
  - 1 = 完全弹性碰撞（超级弹力球）
  - > 1 = 每次弹跳越弹越高（不现实但有趣）

Friction Combine（摩擦力合并模式）: Average
  - 两个碰撞体摩擦力的合并方式
  - Average: 平均值
  - Minimum: 取最小值
  - Maximum: 取最大值
  - Multiply: 相乘

Bounce Combine（弹性合并模式）: Average
  - 与 Friction Combine 类似
```

### 7.5.3 常用物理材质预设

| 材质名称 | 动摩擦 | 静摩擦 | 弹性 | 适用场景 |
|---------|--------|--------|------|---------|
| PM_Default | 0.6 | 0.6 | 0 | 默认表面 |
| PM_Ice | 0.02 | 0.05 | 0 | 冰面/滑面 |
| PM_Rubber | 0.8 | 0.9 | 0.8 | 橡胶/弹力球 |
| PM_Metal | 0.4 | 0.5 | 0.1 | 金属表面 |
| PM_Bouncy | 0 | 0 | 1 | 超级弹力球 |
| PM_NoFriction | 0 | 0 | 0 | 完全光滑 |

### 7.5.4 应用物理材质

将创建好的物理材质拖到 Collider 组件的 **Material** 槽中：

[截图：在 Box Collider 的 Material 槽中设置物理材质]

```csharp
// 通过代码设置物理材质
public class PhysicsMaterialExample : MonoBehaviour
{
    void Start()
    {
        // 创建物理材质
        PhysicsMaterial bouncyMaterial = new PhysicsMaterial("Bouncy");
        bouncyMaterial.dynamicFriction = 0f;
        bouncyMaterial.staticFriction = 0f;
        bouncyMaterial.bounciness = 1f;
        bouncyMaterial.bounceCombine = PhysicsMaterialCombine.Maximum;

        // 应用到碰撞体
        Collider col = GetComponent<Collider>();
        col.material = bouncyMaterial;
    }
}
```

**弹力球实验：**

1. 创建 Sphere，添加 Rigidbody
2. 创建 PM_Bouncy 物理材质（弹性 = 1，Bounce Combine = Maximum）
3. 将 PM_Bouncy 应用到球体和地面的 Collider 上
4. 将球体抬到 Y = 10 的位置
5. 运行场景，观察球体持续弹跳

[截图：弹力球弹跳的效果]

---

## 7.6 射线检测（Raycasting）

射线检测是游戏开发中使用频率极高的功能。它从一个点沿一个方向发射一条"看不见的线"，检测这条线是否命中了任何碰撞体。

### 7.6.1 基础射线检测

```csharp
using UnityEngine;

/// <summary>
/// 射线检测示例
/// 从摄像机中心向前发射射线，检测命中的物体
/// </summary>
public class RaycastExample : MonoBehaviour
{
    [SerializeField] private float rayDistance = 100f;  // 射线最大距离
    [SerializeField] private LayerMask detectLayers;    // 检测哪些层

    void Update()
    {
        // ========== 基础射线检测 ==========
        // Physics.Raycast 返回 bool，表示是否命中
        // 参数：起点, 方向, 最大距离

        bool hit = Physics.Raycast(
            transform.position,       // 射线起点
            transform.forward,        // 射线方向
            rayDistance                // 最大距离
        );

        if (hit)
        {
            Debug.Log("射线命中了某个物体！");
        }

        // ========== 获取命中信息 ==========
        RaycastHit hitInfo;
        if (Physics.Raycast(transform.position, transform.forward, out hitInfo, rayDistance))
        {
            // hitInfo 包含命中的详细信息
            Debug.Log($"命中物体: {hitInfo.collider.gameObject.name}");
            Debug.Log($"命中点: {hitInfo.point}");
            Debug.Log($"命中法线: {hitInfo.normal}");
            Debug.Log($"命中距离: {hitInfo.distance}");
            Debug.Log($"命中 UV: {hitInfo.textureCoord}");

            // 在命中点绘制调试标记
            Debug.DrawLine(transform.position, hitInfo.point, Color.red);
            Debug.DrawRay(hitInfo.point, hitInfo.normal * 0.5f, Color.green);
        }

        // ========== 带 LayerMask 的射线检测 ==========
        if (Physics.Raycast(transform.position, transform.forward, out hitInfo, rayDistance, detectLayers))
        {
            // 只检测指定层的物体
            Debug.Log($"在指定层命中: {hitInfo.collider.name}");
        }
    }

    // 在 Scene 视图中可视化射线
    void OnDrawGizmos()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawRay(transform.position, transform.forward * rayDistance);
    }
}
```

### 7.6.2 从摄像机发射射线（屏幕点击检测）

```csharp
using UnityEngine;

/// <summary>
/// 从摄像机向鼠标位置发射射线
/// 常用于：点击选择物体、射击游戏瞄准、UI交互检测
/// </summary>
public class ScreenRaycast : MonoBehaviour
{
    [SerializeField] private Camera mainCamera;
    [SerializeField] private float maxDistance = 100f;

    void Start()
    {
        if (mainCamera == null)
            mainCamera = Camera.main;
    }

    void Update()
    {
        // 鼠标左键点击
        if (Input.GetMouseButtonDown(0))
        {
            // 从摄像机通过鼠标位置创建射线
            Ray ray = mainCamera.ScreenPointToRay(Input.mousePosition);

            RaycastHit hitInfo;
            if (Physics.Raycast(ray, out hitInfo, maxDistance))
            {
                Debug.Log($"鼠标点击命中: {hitInfo.collider.name} 在位置 {hitInfo.point}");

                // 获取命中物体上的组件
                // 比如检查是否可交互
                IInteractable interactable = hitInfo.collider.GetComponent<IInteractable>();
                if (interactable != null)
                {
                    interactable.Interact(gameObject);
                }
            }
        }
    }
}
```

### 7.6.3 多射线检测（RaycastAll）

```csharp
/// <summary>
/// 检测射线路径上的所有物体（不只是第一个）
/// 用途：穿透射击、检测遮挡关系
/// </summary>
public class RaycastAllExample : MonoBehaviour
{
    void PerformRaycastAll()
    {
        // RaycastAll 返回所有命中的物体
        RaycastHit[] allHits = Physics.RaycastAll(
            transform.position,
            transform.forward,
            100f
        );

        // 按距离排序（RaycastAll 不保证顺序）
        System.Array.Sort(allHits, (a, b) => a.distance.CompareTo(b.distance));

        foreach (RaycastHit hit in allHits)
        {
            Debug.Log($"穿透命中: {hit.collider.name}，距离: {hit.distance:F2}");
        }
    }
}
```

### 7.6.4 球形/盒形检测

除了线性射线，还有其他形状的检测方法：

```csharp
/// <summary>
/// 各种形状的物理检测方法
/// </summary>
public class ShapeCastExamples : MonoBehaviour
{
    void DetectionExamples()
    {
        // ========== 球形重叠检测 ==========
        // 检测指定位置指定半径内的所有碰撞体
        // 用途：范围攻击、近距离物品拾取

        Collider[] nearbyObjects = Physics.OverlapSphere(
            transform.position,   // 球心
            5f,                   // 半径（5米范围）
            LayerMask.GetMask("Enemy") // 只检测 Enemy 层
        );

        foreach (Collider col in nearbyObjects)
        {
            Debug.Log($"范围内的物体: {col.name}");
        }

        // ========== 球形投射（SphereCast）==========
        // 类似射线，但用球体扫过路径
        // 用途：更宽的射线检测（适合近战攻击判定）

        RaycastHit hitInfo;
        bool hit = Physics.SphereCast(
            transform.position,     // 起点
            0.5f,                   // 球半径
            transform.forward,      // 方向
            out hitInfo,
            10f                     // 最大距离
        );

        // ========== 盒形重叠检测 ==========
        // 检测指定位置指定大小的盒子内的所有碰撞体

        Collider[] boxHits = Physics.OverlapBox(
            transform.position,                     // 盒子中心
            new Vector3(1f, 1f, 2f),                // 盒子半尺寸
            transform.rotation,                     // 盒子旋转
            LayerMask.GetMask("Interactable")       // 层筛选
        );

        // ========== 胶囊体投射（CapsuleCast）==========
        // 用途：角色移动前的碰撞预检测

        bool willHit = Physics.CapsuleCast(
            transform.position + Vector3.up * 0.5f,  // 胶囊体底部球心
            transform.position + Vector3.up * 1.5f,  // 胶囊体顶部球心
            0.5f,                                    // 胶囊体半径
            transform.forward,                       // 方向
            out hitInfo,
            2f                                       // 最大距离
        );
    }
}
```

---

## 7.7 层级碰撞矩阵（Layer Collision Matrix）

层级碰撞矩阵控制哪些层之间可以发生碰撞检测。这是优化物理性能的重要工具。

### 7.7.1 设置层

1. **Edit > Project Settings > Tags and Layers**
2. 在 Layers 区域添加自定义层：

```
Layer 6: Ground        ← 地面
Layer 7: Player        ← 玩家
Layer 8: Enemy         ← 敌人
Layer 9: Projectile    ← 弹丸
Layer 10: Pickup       ← 拾取物
Layer 11: Environment  ← 环境物体
Layer 12: Trigger      ← 触发区域
```

[截图：Tags and Layers 设置面板中的自定义层]

### 7.7.2 配置碰撞矩阵

1. **Edit > Project Settings > Physics**
2. 底部有一个 **Layer Collision Matrix** 网格

[截图：Layer Collision Matrix 的完整网格]

**推荐配置示例：**

| | Ground | Player | Enemy | Projectile | Pickup | Environment |
|---|---|---|---|---|---|---|
| Ground | - | Y | Y | Y | N | Y |
| Player | Y | - | Y | N | Y | Y |
| Enemy | Y | Y | Y | Y | N | Y |
| Projectile | Y | N | Y | N | N | Y |
| Pickup | N | Y | N | N | N | N |
| Environment | Y | Y | Y | Y | N | Y |

解读：
- Player 和 Pickup 可以碰撞（拾取物品）
- Player 和 Player 自身不碰撞（合作模式中玩家不互相阻挡）
- Projectile 和 Player 不碰撞（自己的子弹不伤害自己）
- Pickup 和 Environment 不碰撞（拾取物不被环境阻挡）

> **性能优化：** 取消不必要的层间碰撞检测可以显著提高物理性能，尤其是在有大量物体的场景中。

---

## 7.8 FixedUpdate vs Update

这是 Unity 物理中最容易混淆但最重要的概念之一。

### 7.8.1 区别

```
Update()
├── 调用频率：每帧一次（和渲染帧率一致）
├── 帧率不固定：60fps 时每秒调 60 次，30fps 时每秒调 30 次
├── Time.deltaTime：每帧的时间间隔（不固定）
├── 适用：输入处理、UI更新、非物理逻辑、动画控制
└── 不适用：物理操作（AddForce, Rigidbody.velocity 等）

FixedUpdate()
├── 调用频率：固定时间间隔（默认 0.02 秒 = 50 次/秒）
├── 帧率固定：不受渲染帧率影响
├── Time.fixedDeltaTime：固定时间间隔（恒定 0.02 秒）
├── 适用：物理操作（AddForce, Rigidbody.velocity, Rigidbody.MovePosition）
└── 不适用：输入处理（可能会遗漏输入，因为频率不同）

LateUpdate()
├── 调用频率：每帧一次，在所有 Update 之后
├── 适用：摄像机跟随、后处理逻辑
└── 确保在角色移动完成后再更新摄像机位置
```

### 7.8.2 执行顺序

```
一帧内的执行顺序：

FixedUpdate()          ← 可能执行 0 次、1 次或多次
↓
Update()               ← 执行 1 次
↓
LateUpdate()           ← 执行 1 次
↓
渲染（Rendering）       ← 绘制画面
↓
下一帧...

帧率低时（如 20fps = 50ms/帧）：
  FixedUpdate 可能执行 2-3 次（因为固定 20ms 一次）
  Update 执行 1 次

帧率高时（如 200fps = 5ms/帧）：
  FixedUpdate 可能不执行（还没到 20ms）
  Update 执行 1 次
```

### 7.8.3 代码示例

```csharp
using UnityEngine;

/// <summary>
/// 演示 Update vs FixedUpdate 的正确使用
/// </summary>
public class UpdateVsFixedUpdate : MonoBehaviour
{
    private Rigidbody _rb;
    private bool _shouldJump = false;
    private float _moveInput = 0f;

    void Start()
    {
        _rb = GetComponent<Rigidbody>();
    }

    // 在 Update 中处理输入
    void Update()
    {
        // 读取输入（Update 中不会遗漏按键事件）
        _moveInput = Input.GetAxis("Horizontal");

        // 缓存跳跃输入
        if (Input.GetKeyDown(KeyCode.Space))
        {
            _shouldJump = true;
        }
    }

    // 在 FixedUpdate 中应用物理
    void FixedUpdate()
    {
        // 移动（使用 fixedDeltaTime 或直接设置速度）
        Vector3 movement = new Vector3(_moveInput * 5f, _rb.linearVelocity.y, 0f);
        _rb.linearVelocity = movement;

        // 应用缓存的跳跃
        if (_shouldJump)
        {
            _rb.AddForce(Vector3.up * 8f, ForceMode.Impulse);
            _shouldJump = false; // 重置标志
        }
    }
}
```

> **关键规则：**
> 1. 在 `Update()` 中读取输入
> 2. 在 `FixedUpdate()` 中操作 Rigidbody
> 3. 在 `LateUpdate()` 中更新摄像机

---

## 7.9 关节（Joints）基础

关节用于将两个 Rigidbody 连接在一起，限制它们的相对运动。

### 7.9.1 关节类型

| 关节类型 | 描述 | 现实类比 |
|---------|------|---------|
| Fixed Joint | 固定连接（不可移动） | 焊接 |
| Hinge Joint | 铰链（绕一个轴旋转） | 门的合页 |
| Spring Joint | 弹簧连接 | 弹簧 |
| Configurable Joint | 完全可配置 | 通用 |
| Character Joint | 角色关节 | 布娃娃 |

### 7.9.2 铰链关节示例（门）

```csharp
using UnityEngine;

/// <summary>
/// 使用 Hinge Joint 创建一扇可以推开的门
/// </summary>
public class Door : MonoBehaviour
{
    void Start()
    {
        // 添加 Rigidbody
        Rigidbody rb = gameObject.AddComponent<Rigidbody>();
        rb.mass = 5f;
        rb.useGravity = true;

        // 添加 Hinge Joint
        HingeJoint hinge = gameObject.AddComponent<HingeJoint>();

        // 设置旋转轴（门的铰链在左边缘）
        hinge.anchor = new Vector3(-0.5f, 0f, 0f); // 锚点在门的左边
        hinge.axis = Vector3.up;                      // 绕 Y 轴旋转

        // 限制旋转范围（门最多开 120 度）
        hinge.useLimits = true;
        JointLimits limits = hinge.limits;
        limits.min = 0f;
        limits.max = 120f;
        hinge.limits = limits;

        // 可选：添加弹簧（门会自动关上）
        hinge.useSpring = true;
        JointSpring spring = hinge.spring;
        spring.spring = 50f;      // 弹簧力
        spring.damper = 5f;       // 阻尼
        spring.targetPosition = 0f; // 目标角度（关门状态）
        hinge.spring = spring;
    }
}
```

### 7.9.3 弹簧关节示例

```csharp
using UnityEngine;

/// <summary>
/// 弹簧连接的两个物体
/// </summary>
public class SpringConnection : MonoBehaviour
{
    [SerializeField] private Rigidbody connectedBody; // 连接到的另一个物体

    void Start()
    {
        SpringJoint spring = gameObject.AddComponent<SpringJoint>();
        spring.connectedBody = connectedBody;
        spring.spring = 100f;          // 弹簧强度
        spring.damper = 5f;            // 阻尼
        spring.minDistance = 0f;        // 最小距离
        spring.maxDistance = 3f;        // 最大距离
        spring.autoConfigureConnectedAnchor = true;
    }
}
```

---

## 7.10 实战案例一：可拾取物品

### 7.10.1 设计思路

创建一个旋转悬浮的金币，玩家走近时自动拾取。

```
金币系统：
├── 金币物体（Sphere + Trigger Collider）
├── 旋转和浮动动画
├── 玩家进入触发区域时拾取
├── 拾取时播放效果并销毁
└── 通知得分系统
```

### 7.10.2 完整代码

```csharp
using UnityEngine;

/// <summary>
/// 可拾取的金币物品
/// 特性：
/// - 持续旋转和上下浮动
/// - 玩家接近时自动拾取
/// - 拾取时触发事件
/// </summary>
public class Collectible : MonoBehaviour
{
    [Header("动画设置")]
    [Tooltip("旋转速度（度/秒）")]
    [SerializeField] private float rotateSpeed = 180f;

    [Tooltip("浮动幅度")]
    [SerializeField] private float floatAmplitude = 0.3f;

    [Tooltip("浮动频率")]
    [SerializeField] private float floatFrequency = 1f;

    [Header("拾取设置")]
    [Tooltip("拾取后的分数")]
    [SerializeField] private int scoreValue = 10;

    [Tooltip("拾取音效")]
    [SerializeField] private AudioClip pickupSound;

    [Tooltip("拾取时吸引速度")]
    [SerializeField] private float attractSpeed = 15f;

    [Tooltip("自动吸引的距离")]
    [SerializeField] private float attractRange = 2f;

    // 内部状态
    private Vector3 _startPosition;
    private bool _isBeingCollected = false;
    private Transform _targetPlayer;

    // 事件
    public static event System.Action<int> OnCollected;
    // static 事件，任何金币被收集都会触发
    // 类似前端的全局事件总线

    void Start()
    {
        _startPosition = transform.position;

        // 确保有触发器碰撞体
        SphereCollider col = GetComponent<SphereCollider>();
        if (col == null)
        {
            col = gameObject.AddComponent<SphereCollider>();
        }
        col.isTrigger = true;
        col.radius = attractRange; // 触发区域大于视觉模型
    }

    void Update()
    {
        if (_isBeingCollected && _targetPlayer != null)
        {
            // 被拾取时飞向玩家
            transform.position = Vector3.MoveTowards(
                transform.position,
                _targetPlayer.position + Vector3.up,
                attractSpeed * Time.deltaTime
            );

            // 到达玩家位置后销毁
            if (Vector3.Distance(transform.position, _targetPlayer.position + Vector3.up) < 0.2f)
            {
                Collect();
            }
        }
        else
        {
            // 正常状态：旋转和浮动
            Animate();
        }
    }

    /// <summary>
    /// 旋转和浮动动画
    /// </summary>
    private void Animate()
    {
        // 旋转
        transform.Rotate(Vector3.up, rotateSpeed * Time.deltaTime);

        // 浮动
        float yOffset = Mathf.Sin(Time.time * floatFrequency * Mathf.PI * 2f) * floatAmplitude;
        transform.position = _startPosition + new Vector3(0f, yOffset, 0f);
    }

    /// <summary>
    /// 玩家进入触发区域时开始吸引
    /// </summary>
    void OnTriggerEnter(Collider other)
    {
        if (_isBeingCollected) return; // 防止重复触发

        if (other.CompareTag("Player"))
        {
            _isBeingCollected = true;
            _targetPlayer = other.transform;
        }
    }

    /// <summary>
    /// 执行拾取
    /// </summary>
    private void Collect()
    {
        // 播放音效
        if (pickupSound != null)
        {
            // AudioSource.PlayClipAtPoint 会自动创建临时 AudioSource 并播放
            // 即使物体销毁，音效也会继续播放到结束
            AudioSource.PlayClipAtPoint(pickupSound, transform.position);
        }

        // 触发全局事件
        OnCollected?.Invoke(scoreValue);

        // 销毁物体
        Destroy(gameObject);
    }

    // 在 Scene 视图中显示拾取范围
    void OnDrawGizmosSelected()
    {
        Gizmos.color = new Color(1f, 1f, 0f, 0.3f);
        Gizmos.DrawWireSphere(transform.position, attractRange);
    }
}

// ====== 得分管理器（接收金币拾取事件）======
public class ScoreManager : MonoBehaviour
{
    private int _totalScore = 0;

    void OnEnable()
    {
        // 订阅全局金币拾取事件
        Collectible.OnCollected += AddScore;
    }

    void OnDisable()
    {
        Collectible.OnCollected -= AddScore;
    }

    private void AddScore(int points)
    {
        _totalScore += points;
        Debug.Log($"得分 +{points}！总分: {_totalScore}");
    }
}
```

### 7.10.3 在场景中设置金币

1. 创建 Sphere，缩放为 (0.5, 0.5, 0.5)
2. 应用金色材质
3. 添加 `Collectible` 脚本
4. 将 Layer 设为 `Pickup`
5. 复制多个金币放在场景各处

[截图：场景中散布的金色旋转金币]

---

## 7.11 实战案例二：压力板机关

### 7.11.1 设计思路

创建一个压力板，玩家站上去时触发机关（比如打开门）。

```
压力板系统：
├── 压力板物体（Cube + Trigger Collider）
├── 检测是否有物体站在上面
├── 按下时发送事件
├── 关联的门收到事件后移动
└── 离开压力板后门关闭
```

### 7.11.2 完整代码

```csharp
using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 压力板
/// 检测是否有足够重量的物体在上面
/// 支持多个物体同时踩踏
/// </summary>
public class PressurePlate : MonoBehaviour
{
    [Header("设置")]
    [Tooltip("触发所需的最小质量（kg）")]
    [SerializeField] private float requiredMass = 1f;

    [Tooltip("按下时的视觉下沉量")]
    [SerializeField] private float pressDepth = 0.05f;

    [Tooltip("按下/弹起的速度")]
    [SerializeField] private float pressSpeed = 5f;

    [Header("颜色反馈")]
    [SerializeField] private Color normalColor = Color.gray;
    [SerializeField] private Color pressedColor = Color.green;

    // 事件
    public event System.Action OnPressed;     // 被按下时触发
    public event System.Action OnReleased;    // 被释放时触发

    // 内部状态
    private HashSet<Collider> _objectsOnPlate = new HashSet<Collider>();
    // HashSet 自动去重，防止同一物体重复计算
    private bool _isPressed = false;
    private Vector3 _originalPosition;
    private Vector3 _pressedPosition;
    private Renderer _renderer;

    void Start()
    {
        _originalPosition = transform.position;
        _pressedPosition = _originalPosition + Vector3.down * pressDepth;
        _renderer = GetComponent<Renderer>();

        if (_renderer != null)
        {
            _renderer.material.color = normalColor;
        }
    }

    void Update()
    {
        // 平滑移动到目标位置（按下或弹起）
        Vector3 targetPos = _isPressed ? _pressedPosition : _originalPosition;
        transform.position = Vector3.Lerp(transform.position, targetPos, pressSpeed * Time.deltaTime);
    }

    void OnTriggerEnter(Collider other)
    {
        // 忽略触发器类型的碰撞体
        if (other.isTrigger) return;

        _objectsOnPlate.Add(other);
        CheckPressure();
    }

    void OnTriggerExit(Collider other)
    {
        _objectsOnPlate.Remove(other);
        CheckPressure();
    }

    /// <summary>
    /// 检查板上的总质量是否达到要求
    /// </summary>
    private void CheckPressure()
    {
        // 清理已销毁的物体
        _objectsOnPlate.RemoveWhere(c => c == null);

        // 计算总质量
        float totalMass = 0f;
        foreach (Collider col in _objectsOnPlate)
        {
            Rigidbody rb = col.attachedRigidbody;
            if (rb != null)
            {
                totalMass += rb.mass;
            }
            else
            {
                // CharacterController 没有 Rigidbody，假设质量为 70kg
                if (col.GetComponent<CharacterController>() != null)
                {
                    totalMass += 70f;
                }
            }
        }

        bool shouldBePressed = totalMass >= requiredMass;

        // 状态变化检测
        if (shouldBePressed && !_isPressed)
        {
            _isPressed = true;
            OnPressed?.Invoke();
            if (_renderer != null) _renderer.material.color = pressedColor;
            Debug.Log($"压力板被按下！总质量: {totalMass:F1}kg");
        }
        else if (!shouldBePressed && _isPressed)
        {
            _isPressed = false;
            OnReleased?.Invoke();
            if (_renderer != null) _renderer.material.color = normalColor;
            Debug.Log("压力板弹起！");
        }
    }

    public bool IsPressed => _isPressed;
}

/// <summary>
/// 可由压力板控制的门
/// </summary>
public class SlidingDoor : MonoBehaviour
{
    [Header("设置")]
    [Tooltip("关联的压力板")]
    [SerializeField] private PressurePlate pressurePlate;

    [Tooltip("门打开时的位移")]
    [SerializeField] private Vector3 openOffset = new Vector3(0f, 3f, 0f);

    [Tooltip("门的移动速度")]
    [SerializeField] private float moveSpeed = 3f;

    private Vector3 _closedPosition;
    private Vector3 _openPosition;
    private bool _isOpen = false;

    void Start()
    {
        _closedPosition = transform.position;
        _openPosition = _closedPosition + openOffset;

        // 订阅压力板事件
        if (pressurePlate != null)
        {
            pressurePlate.OnPressed += Open;
            pressurePlate.OnReleased += Close;
        }
    }

    void OnDestroy()
    {
        // 取消订阅（防止内存泄漏）
        if (pressurePlate != null)
        {
            pressurePlate.OnPressed -= Open;
            pressurePlate.OnReleased -= Close;
        }
    }

    void Update()
    {
        // 平滑移动到目标位置
        Vector3 targetPos = _isOpen ? _openPosition : _closedPosition;
        transform.position = Vector3.Lerp(
            transform.position,
            targetPos,
            moveSpeed * Time.deltaTime
        );
    }

    public void Open()
    {
        _isOpen = true;
        Debug.Log("门打开了！");
    }

    public void Close()
    {
        _isOpen = false;
        Debug.Log("门关闭了！");
    }
}
```

### 7.11.3 在场景中设置

**创建压力板：**
1. 创建 Cube，命名为 `PressurePlate`
2. 设置 Scale: (2, 0.1, 2) — 扁平的方形
3. 添加 `PressurePlate` 脚本
4. 确保 Box Collider 的 **Is Trigger** 设为 **true**
5. 位置放在地面上

**创建门：**
1. 创建 Cube，命名为 `Door`
2. 设置 Scale: (3, 4, 0.3) — 门的形状
3. 添加 `SlidingDoor` 脚本
4. 在 Inspector 中将 `PressurePlate` 字段关联到压力板物体
5. 设置 Open Offset: (0, 4, 0) — 向上滑开

[截图：压力板和门的场景布局]

---

## 7.12 实战案例三：弹丸发射

### 7.12.1 设计思路

创建一个可以发射弹丸的系统，弹丸碰到物体后产生效果。

```
弹丸系统：
├── 发射器（从摄像机方向发射）
├── 弹丸预制体（Sphere + Rigidbody + Collider）
├── 弹丸飞行和碰撞检测
├── 碰撞后造成伤害/施加力
└── 超时自动销毁
```

### 7.12.2 完整代码

```csharp
using UnityEngine;

/// <summary>
/// 弹丸（子弹）
/// 处理飞行、碰撞和销毁
/// </summary>
[RequireComponent(typeof(Rigidbody))]
[RequireComponent(typeof(SphereCollider))]
public class Projectile : MonoBehaviour
{
    [Header("弹丸设置")]
    [SerializeField] private float speed = 30f;            // 飞行速度
    [SerializeField] private float lifetime = 5f;           // 最大存活时间
    [SerializeField] private float impactForce = 20f;       // 击中后施加的力
    [SerializeField] private int damage = 25;               // 伤害值

    [Header("特效")]
    [SerializeField] private GameObject impactEffectPrefab;  // 击中特效预制体

    private Rigidbody _rb;
    private bool _hasHit = false;

    void Awake()
    {
        _rb = GetComponent<Rigidbody>();

        // 配置 Rigidbody
        _rb.useGravity = false;                        // 弹丸不受重力（直线飞行）
        _rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
        // 使用连续碰撞检测，防止高速穿过物体
    }

    /// <summary>
    /// 初始化弹丸（由发射器调用）
    /// </summary>
    public void Initialize(Vector3 direction)
    {
        // 设置朝向
        transform.forward = direction;

        // 设置速度
        _rb.linearVelocity = direction.normalized * speed;

        // 超时自动销毁
        Destroy(gameObject, lifetime);
    }

    void OnCollisionEnter(Collision collision)
    {
        if (_hasHit) return; // 防止多次触发
        _hasHit = true;

        // 获取碰撞信息
        ContactPoint contact = collision.GetContact(0);
        Vector3 hitPoint = contact.point;
        Vector3 hitNormal = contact.normal;

        // 对命中目标施加力
        Rigidbody targetRb = collision.gameObject.GetComponent<Rigidbody>();
        if (targetRb != null)
        {
            // 在碰撞点施加力（会产生旋转效果）
            targetRb.AddForceAtPosition(
                transform.forward * impactForce,
                hitPoint,
                ForceMode.Impulse
            );
        }

        // 检查是否命中可伤害目标
        IDamageable damageable = collision.gameObject.GetComponent<IDamageable>();
        if (damageable != null)
        {
            damageable.TakeDamage(damage);
        }

        // 生成击中特效
        if (impactEffectPrefab != null)
        {
            // 特效朝向碰撞面法线方向
            Quaternion rotation = Quaternion.LookRotation(hitNormal);
            GameObject effect = Instantiate(impactEffectPrefab, hitPoint, rotation);
            Destroy(effect, 2f); // 2秒后销毁特效
        }

        Debug.Log($"弹丸命中: {collision.gameObject.name}");

        // 销毁弹丸
        Destroy(gameObject);
    }

    // 可视化弹丸飞行路径（调试用）
    void OnDrawGizmos()
    {
        if (_rb != null)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawRay(transform.position, _rb.linearVelocity.normalized * 2f);
        }
    }
}

/// <summary>
/// 弹丸发射器
/// 从指定位置向摄像机朝向发射弹丸
/// </summary>
public class ProjectileLauncher : MonoBehaviour
{
    [Header("发射设置")]
    [Tooltip("弹丸预制体")]
    [SerializeField] private Projectile projectilePrefab;

    [Tooltip("发射点（枪口位置）")]
    [SerializeField] private Transform firePoint;

    [Tooltip("发射冷却时间（秒）")]
    [SerializeField] private float fireCooldown = 0.3f;

    [Tooltip("发射音效")]
    [SerializeField] private AudioClip fireSound;

    [Header("瞄准设置")]
    [Tooltip("瞄准使用的摄像机")]
    [SerializeField] private Camera aimCamera;

    [Tooltip("射程")]
    [SerializeField] private float maxRange = 100f;

    private float _lastFireTime;
    private AudioSource _audioSource;

    void Start()
    {
        if (aimCamera == null)
            aimCamera = Camera.main;

        if (firePoint == null)
            firePoint = transform;

        _audioSource = GetComponent<AudioSource>();
    }

    void Update()
    {
        // 鼠标左键发射
        if (Input.GetMouseButton(0))
        {
            TryFire();
        }
    }

    /// <summary>
    /// 尝试发射弹丸
    /// </summary>
    public void TryFire()
    {
        // 检查冷却
        if (Time.time - _lastFireTime < fireCooldown) return;
        _lastFireTime = Time.time;

        // 计算发射方向
        Vector3 direction = CalculateAimDirection();

        // 实例化弹丸
        Projectile projectile = Instantiate(
            projectilePrefab,
            firePoint.position,
            Quaternion.LookRotation(direction)
        );

        // 初始化弹丸
        projectile.Initialize(direction);

        // 播放音效
        if (_audioSource != null && fireSound != null)
        {
            _audioSource.PlayOneShot(fireSound);
        }
    }

    /// <summary>
    /// 计算瞄准方向
    /// 从屏幕中心发射射线，找到准星指向的世界位置
    /// </summary>
    private Vector3 CalculateAimDirection()
    {
        // 从屏幕中心发射射线
        Ray aimRay = aimCamera.ScreenPointToRay(
            new Vector3(Screen.width / 2f, Screen.height / 2f, 0f)
        );

        Vector3 targetPoint;

        // 射线检测目标点
        RaycastHit hit;
        if (Physics.Raycast(aimRay, out hit, maxRange))
        {
            targetPoint = hit.point;
        }
        else
        {
            // 没有命中则瞄准最远点
            targetPoint = aimRay.origin + aimRay.direction * maxRange;
        }

        // 从发射点指向目标点的方向
        Vector3 direction = (targetPoint - firePoint.position).normalized;
        return direction;
    }

    // 在 Scene 视图中显示发射方向
    void OnDrawGizmosSelected()
    {
        if (firePoint != null)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawRay(firePoint.position, firePoint.forward * 5f);
        }
    }
}

/// <summary>
/// 可受伤害的接口
/// 实现此接口的物体可以被弹丸伤害
/// </summary>
public interface IDamageable
{
    int Health { get; set; }
    void TakeDamage(int amount);
}

/// <summary>
/// 可破坏的箱子（实现 IDamageable）
/// </summary>
public class DestructibleCrate : MonoBehaviour, IDamageable
{
    [SerializeField] private int maxHealth = 100;

    public int Health { get; set; }

    void Start()
    {
        Health = maxHealth;
    }

    public void TakeDamage(int amount)
    {
        Health -= amount;
        Debug.Log($"{gameObject.name} 受到 {amount} 点伤害，剩余 {Health}");

        // 受伤视觉反馈（变红）
        StartCoroutine(FlashDamage());

        if (Health <= 0)
        {
            DestroyBox();
        }
    }

    private System.Collections.IEnumerator FlashDamage()
    {
        Renderer rend = GetComponent<Renderer>();
        if (rend != null)
        {
            Color originalColor = rend.material.color;
            rend.material.color = Color.red;
            yield return new WaitForSeconds(0.1f);
            rend.material.color = originalColor;
        }
    }

    private void DestroyBox()
    {
        Debug.Log($"{gameObject.name} 被摧毁了！");
        // 这里可以生成碎片特效、掉落物品等
        Destroy(gameObject);
    }
}
```

### 7.12.3 创建弹丸预制体

1. 创建 Sphere，缩放 (0.1, 0.1, 0.1) — 小球
2. 应用红色发光材质
3. 添加 Rigidbody 组件
4. 添加 `Projectile` 脚本
5. 设置 Layer 为 `Projectile`
6. 将它从 Hierarchy 拖到 Project 窗口的 `Prefabs` 文件夹中 — 创建预制体
7. 删除 Hierarchy 中的原始物体

[截图：弹丸预制体的设置]

### 7.12.4 设置发射器

1. 在 Player 身上（或子物体上）添加 `ProjectileLauncher` 脚本
2. 将弹丸预制体拖入 `Projectile Prefab` 槽
3. 创建空物体作为发射点（Fire Point），放在角色前方
4. 将发射点拖入 `Fire Point` 槽

---

## 7.13 物理调试技巧

### 7.13.1 Physics Debugger

Unity 提供了物理调试可视化工具：

1. **Window > Analysis > Physics Debugger**
2. 可以看到所有碰撞体的形状、接触点、力的方向

[截图：Physics Debugger 窗口]

### 7.13.2 代码中的调试工具

```csharp
// ====== 常用的物理调试方法 ======

// 在 Scene 视图中绘制射线（持续到下一帧）
Debug.DrawRay(origin, direction * distance, Color.red);

// 在 Scene 视图中绘制线段
Debug.DrawLine(startPoint, endPoint, Color.green, duration: 1f);

// 使用 Gizmos 绘制碰撞体形状
void OnDrawGizmos()
{
    // 绘制球体
    Gizmos.color = Color.yellow;
    Gizmos.DrawWireSphere(transform.position, 2f);

    // 绘制立方体
    Gizmos.color = Color.cyan;
    Gizmos.DrawWireCube(transform.position, new Vector3(1, 1, 1));

    // 绘制射线
    Gizmos.color = Color.red;
    Gizmos.DrawRay(transform.position, transform.forward * 10f);
}

// OnDrawGizmosSelected - 只在物体被选中时绘制
void OnDrawGizmosSelected()
{
    Gizmos.color = new Color(0, 1, 0, 0.3f); // 半透明绿色
    Gizmos.DrawSphere(transform.position, 5f);
}
```

### 7.13.3 性能监控

在 **Window > Analysis > Profiler** 中可以监控物理性能：

- **Physics.Processing** — 物理计算时间
- **Physics.FetchResults** — 获取结果时间
- **Active Rigidbodies** — 活跃的刚体数量
- **Contacts** — 接触点数量

[截图：Profiler 中的 Physics 性能数据]

> **性能建议：**
> - 使用简单碰撞体（Box, Sphere, Capsule）代替 Mesh Collider
> - 利用层级碰撞矩阵禁用不需要的碰撞检测
> - 让不动的物体不要添加 Rigidbody（物理引擎自动优化静态碰撞体）
> - 使用对象池复用弹丸等频繁创建/销毁的物体
> - 减少 FixedUpdate 的调用频率（增大 Fixed Timestep，但会降低精度）

---

## 7.14 本章要点总结

```
物理系统核心知识图谱：

Rigidbody（刚体）
├── Mass, Drag, Angular Drag          → 物理属性
├── Use Gravity, Is Kinematic         → 行为控制
├── Interpolate                       → 视觉平滑
├── Collision Detection               → 碰撞精度
├── Constraints                       → 运动约束
└── AddForce, AddTorque               → 施加力

Colliders（碰撞体）
├── Box, Sphere, Capsule, Mesh        → 形状类型
├── Is Trigger                        → 触发器模式
├── Physics Material                  → 表面物理属性
└── 复合碰撞体                         → 组合多个碰撞体

事件系统
├── OnCollisionEnter/Stay/Exit        → 碰撞事件
└── OnTriggerEnter/Stay/Exit          → 触发器事件

射线检测
├── Physics.Raycast                   → 基础射线
├── Physics.RaycastAll                → 穿透射线
├── Physics.SphereCast                → 球形射线
├── Physics.OverlapSphere             → 球形范围检测
└── Camera.ScreenPointToRay           → 屏幕到世界射线

优化
├── Layer Collision Matrix             → 层级碰撞控制
├── FixedUpdate vs Update              → 更新时机
├── Collision Detection Mode           → 碰撞检测模式
└── 简单碰撞体优先                      → 性能考量
```

---

## 练习题

### 练习 1：弹力球游乐场
创建一个弹力球发射器：
- 按住鼠标左键蓄力，松开后发射弹力球
- 蓄力时间决定发射力度（最小 5N，最大 50N）
- 弹力球使用高弹性物理材质（Bounciness = 0.9）
- 弹力球碰到墙壁反弹，5 秒后自动消失
- 在 UI 上显示蓄力进度条

### 练习 2：物理谜题
创建一个简单的物理谜题：
- 场景中有一个高台和一个低处的压力板
- 高台上有 3 个箱子（带 Rigidbody）
- 玩家需要把至少 2 个箱子推下高台，落到压力板上
- 压力板被压下后打开一扇门
- 提示：设置箱子的质量和压力板的触发质量

### 练习 3：射线交互系统
实现一个基于射线检测的交互系统：
- 从摄像机中心持续发射射线（每帧）
- 射线命中可交互物体时，显示 "按 E 交互" 的提示
- 按 E 键执行交互（打开箱子、拾取物品等）
- 射线未命中时隐藏提示
- 使用 `IInteractable` 接口实现不同的交互行为

### 练习 4：弹丸增强
改进弹丸发射系统：
- 添加弹丸类型切换（普通弹丸 / 爆炸弹丸 / 冰冻弹丸）
- 爆炸弹丸：命中后对范围内所有物体施加爆炸力（`AddExplosionForce`）
- 冰冻弹丸：命中后冻结目标 3 秒（设置 Rigidbody.isKinematic = true）
- 按数字键 1-3 切换弹丸类型
- 在 UI 上显示当前弹丸类型

---

## 下一章预告

**第八章：动画系统（Animator）**

物理世界动起来了，但角色还是个胶囊体。在下一章中，我们将：
- 导入 3D 角色模型和动画资源
- 学习 Animator Controller 和状态机
- 创建行走、奔跑、跳跃的动画状态转换
- 使用 Blend Tree 实现平滑的动画混合
- 通过代码控制动画播放
- 实现动画事件（脚步声同步）

让你的角色真正"活"起来！
