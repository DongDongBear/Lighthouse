# 第十五章：NavMesh AI 导航

## 本章目标

通过本章学习，你将掌握：

1. 理解 NavMesh 导航系统的核心概念
2. 烘焙 NavMesh（设置可行走表面、障碍物）
3. 使用 NavMeshAgent 组件（速度、加速度、停止距离、区域代价）
4. 配置 NavMeshObstacle 动态障碍物
5. 设置 NavMesh Areas（不同区域类型和行走代价）
6. 创建 Off-Mesh Links（跳跃/攀爬连接）
7. 实现 AI 巡逻系统（路径点系统）
8. 实现 AI 追击和逃跑行为
9. 了解 AI 群体行为基础
10. 在运行时生成的地形上使用 NavMesh
11. 掌握 NavMesh 调试和可视化技巧
12. 构建完整的敌人巡逻 + 追击 + 返回行为模式

## 预计学习时间

**4-5 小时**

---

## 15.1 NavMesh 导航系统概述

### 什么是 NavMesh？

NavMesh（Navigation Mesh，导航网格）是 Unity 内置的 AI 寻路系统。它将游戏场景的可行走区域预计算为一个简化的三角形网格，AI 角色在这个网格上进行路径规划和移动。

**前端类比：**

如果你用过前端的路由系统（如 React Router 或 Vue Router），NavMesh 的概念会比较好理解：

| 前端路由 | NavMesh 导航 |
|---------|-------------|
| 路由表（route config） | NavMesh 网格（烘焙的导航数据） |
| URL 路径 | AI 的移动路径 |
| 路由匹配 | NavMesh 上的路径计算 |
| 路由守卫（canActivate） | NavMesh Areas（区域代价/限制） |
| 重定向（redirect） | Off-Mesh Links（跳跃/传送） |
| 404 页面 | 无法到达的区域 |
| 动态路由 | 运行时 NavMesh 更新 |

### NavMesh 系统架构

```
┌────────────────────────────────────────────────────┐
│                  NavMesh（导航网格）                  │
│  预计算的可行走区域三角形网格                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Walkable │  │  Water   │  │   Road   │         │
│  │ (默认)    │  │ (代价高)  │  │ (代价低)  │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────┬──────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────┐
│              NavMeshAgent（导航代理）                 │
│  AI 角色身上的组件，负责寻路和移动                      │
│  参数：速度、加速度、转向速度、停止距离等              │
└─────────────────────┬──────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────┐
│            NavMeshObstacle（动态障碍物）              │
│  会影响 AI 路径规划的动态物体                         │
│  （如移动的箱子、打开的门）                           │
└────────────────────────────────────────────────────┘
```

---

## 15.2 NavMesh 烘焙基础

### 设置步骤

NavMesh 需要在编辑器中"烘焙"（预计算），类似于前端的构建（build）过程：

**第一步：标记可行走表面**

1. 选中地面、平台等需要 AI 行走的 GameObject
2. 在 Inspector 中将它们设为 `Navigation Static`
   - 选中 GameObject → Inspector → 右上角 Static 勾选框 → 勾选 Navigation Static

[截图：在 Inspector 中勾选 Navigation Static 的位置]

**第二步：标记障碍物**

1. 选中墙壁、柱子、悬崖边等障碍物
2. 同样设为 Navigation Static
3. 在 Navigation 窗口中将它们标记为 Not Walkable

**第三步：打开 Navigation 窗口**

1. 菜单栏：Window → AI → Navigation
2. 切换到 **Bake** 标签页

[截图：Navigation 窗口的 Bake 标签页，展示所有参数]

**第四步：配置烘焙参数**

```
Agent Radius:    0.5    // AI 角色的半径（影响靠近墙壁的距离）
Agent Height:    2.0    // AI 角色的高度（影响能通过的空间）
Max Slope:       45     // 最大可行走坡度（度）
Step Height:     0.4    // 最大可跨越台阶高度（米）
```

**参数解释：**

- **Agent Radius（代理半径）**：AI 离障碍物的最小距离。值越大，AI 越远离墙壁。对于一个人形角色，通常设为 0.5
- **Agent Height（代理高度）**：AI 能通过的最低空间高度。低于此值的空间不可通过
- **Max Slope（最大坡度）**：超过此角度的坡面被视为不可行走。45度以上的陡坡 AI 无法爬上
- **Step Height（台阶高度）**：AI 可以直接跨上的台阶最大高度

**第五步：点击 Bake 按钮**

点击后 Unity 会计算场景中的导航网格。计算完成后，你会在 Scene 视图中看到蓝色半透明的网格覆盖在可行走区域上。

[截图：烘焙完成后 Scene 视图中显示的蓝色 NavMesh 网格]

---

## 15.3 NavMeshAgent 组件详解

NavMeshAgent 是挂载在 AI 角色上的核心组件，负责寻路和移动。

### 在 Inspector 中的配置

[截图：NavMeshAgent 组件在 Inspector 中的所有参数]

### 关键参数详解

```
┌─────────────────────────────────────────────────────┐
│ NavMeshAgent 参数                                    │
│                                                      │
│ Steering（转向）                                      │
│ ├─ Speed: 3.5         // 最大移动速度（米/秒）        │
│ ├─ Angular Speed: 120 // 旋转速度（度/秒）            │
│ ├─ Acceleration: 8    // 加速度（米/秒²）             │
│ └─ Stopping Distance: 0.5 // 到达目标时的停止距离     │
│                                                      │
│ Obstacle Avoidance（避障）                            │
│ ├─ Radius: 0.5        // 碰撞半径                    │
│ ├─ Height: 2.0        // 碰撞高度                    │
│ ├─ Quality: High      // 避障质量                    │
│ └─ Priority: 50       // 优先级（低数值优先避让）      │
│                                                      │
│ Path Finding（寻路）                                  │
│ ├─ Auto Traverse Off Mesh Link: true  // 自动穿越     │
│ ├─ Auto Repath: true  // 路径失效时自动重新计算        │
│ └─ Area Mask: Everything // 可行走的区域类型           │
└─────────────────────────────────────────────────────┘
```

### 参数调优指南

| 参数 | 巡逻 | 追击 | Boss |
|-----|------|------|------|
| Speed | 2-3 | 5-7 | 3-4 |
| Angular Speed | 120 | 360 | 180 |
| Acceleration | 4 | 12 | 6 |
| Stopping Distance | 0.5 | 1.5-2.5 | 3-5 |

**重要提示：**
- `Stopping Distance` 直接影响 AI 在什么距离停下来。对于近战敌人，设为攻击范围稍小的值
- `Speed` 不要超过玩家速度太多，否则玩家无法逃跑（除非是 Boss）
- `Auto Repath` 建议保持 `true`，这样当目标移动时 AI 会自动重新计算路径

---

## 15.4 NavMeshObstacle 动态障碍物

场景中有些物体不是静态的（如可推动的箱子、打开的门），不能在烘焙时处理。这时需要使用 `NavMeshObstacle` 组件。

### 静态 vs 动态障碍物

```
静态障碍物（Navigation Static）：
- 在烘焙时处理
- 不会移动
- 性能最好
- 例如：墙壁、建筑、永久地形

动态障碍物（NavMeshObstacle）：
- 运行时处理
- 可以移动或出现/消失
- 有一定性能开销
- 例如：门、可推动的箱子、倒下的树
```

### 使用方式

1. 选中动态障碍物 GameObject
2. 添加 `NavMeshObstacle` 组件
3. 配置参数：

```
Shape: Box 或 Capsule        // 障碍物形状
Size: (1, 2, 1)              // 大小
Carve: true                  // 是否在 NavMesh 上"挖洞"
Move Threshold: 0.1          // 移动多少距离后重新计算
Time To Stationary: 0.5      // 静止多久后视为不动
Carve Only Stationary: true  // 仅在静止时挖洞（性能优化）
```

**Carve 模式详解：**

- **Carve = false**：AI 会在靠近障碍物时被推开，但路径规划不考虑它。适合缓慢移动的物体
- **Carve = true**：障碍物会在 NavMesh 上"挖一个洞"，AI 的路径规划会绕开它。适合门、墙等

[截图：NavMeshObstacle 组件的 Inspector 配置，以及 Carve 模式下 NavMesh 上的"洞"]

### 可交互门示例

```csharp
// DoorObstacle.cs
// 可开关的门 - 使用 NavMeshObstacle 影响 AI 路径

using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// 可开关的门，影响 NavMesh 导航
/// 门关闭时 AI 会绕路，门打开时 AI 可以通过
/// </summary>
public class DoorObstacle : MonoBehaviour
{
    [Header("门的设置")]
    [Tooltip("门开启时的旋转角度")]
    [SerializeField] private float openAngle = 90f;

    [Tooltip("开关门的速度")]
    [SerializeField] private float openSpeed = 3f;

    [Tooltip("交互按键")]
    [SerializeField] private KeyCode interactKey = KeyCode.E;

    /// <summary>门是否打开</summary>
    private bool isOpen = false;

    /// <summary>目标旋转角度</summary>
    private float targetAngle = 0f;

    /// <summary>初始旋转</summary>
    private Quaternion closedRotation;

    /// <summary>NavMeshObstacle 组件</summary>
    private NavMeshObstacle obstacle;

    /// <summary>玩家是否在范围内</summary>
    private bool playerInRange = false;

    private void Start()
    {
        closedRotation = transform.rotation;
        obstacle = GetComponent<NavMeshObstacle>();
    }

    private void Update()
    {
        // 检测交互输入
        if (playerInRange && Input.GetKeyDown(interactKey))
        {
            ToggleDoor();
        }

        // 平滑旋转门
        Quaternion targetRotation = closedRotation * Quaternion.Euler(0, targetAngle, 0);
        transform.rotation = Quaternion.Slerp(
            transform.rotation, targetRotation, openSpeed * Time.deltaTime);
    }

    /// <summary>
    /// 切换门的开关状态
    /// </summary>
    private void ToggleDoor()
    {
        isOpen = !isOpen;
        targetAngle = isOpen ? openAngle : 0f;

        // 开门时禁用障碍物（AI 可以通过）
        // 关门时启用障碍物（AI 需要绕路）
        if (obstacle != null)
        {
            obstacle.enabled = !isOpen;
        }

        Debug.Log($"[Door] 门 {(isOpen ? "打开" : "关闭")}");
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
            playerInRange = true;
    }

    private void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("Player"))
            playerInRange = false;
    }
}
```

---

## 15.5 NavMesh Areas（区域与代价）

NavMesh Areas 允许你为不同区域设置不同的"行走代价"，AI 会倾向于选择代价低的路线。

### 内置区域类型

Unity 默认提供 3 种区域：

| 区域名称 | 默认代价 | 说明 |
|---------|---------|------|
| Walkable | 1 | 普通可行走区域 |
| Not Walkable | - | 不可行走区域 |
| Jump | 2 | 跳跃区域（Off-Mesh Link） |

### 自定义区域

你可以在 Navigation 窗口的 Areas 标签页中定义自定义区域：

[截图：Navigation 窗口的 Areas 标签页，展示自定义区域配置]

推荐的自定义区域设置：

```
区域 3: Road      代价 0.5   // 道路 - AI 更倾向走道路
区域 4: Grass     代价 1.5   // 草地 - 比道路慢一些
区域 5: Water     代价 5.0   // 水域 - AI 尽量避免
区域 6: Danger    代价 10.0  // 危险区域 - 几乎不会走
```

**代价的含义：**

代价值影响 AI 的路径选择。当有多条路到达目标时，AI 会选择"总代价最低"的路线。

```
示例场景：
玩家在 B 点，AI 在 A 点

路线1（走道路）：  100米 × 代价0.5 = 总代价 50
路线2（穿草地）：  60米 × 代价1.5 = 总代价 90
路线3（穿水域）：  40米 × 代价5.0 = 总代价 200

AI 会选择路线1（走道路），虽然距离最远但总代价最低。
```

### 为地面指定区域

1. 选中地面 GameObject
2. 在 Navigation 窗口的 Object 标签页中
3. 将 Navigation Area 设为对应的区域类型

[截图：Navigation 窗口的 Object 标签页，展示如何为物体指定导航区域]

### 运行时修改区域代价

```csharp
// 可以在运行时动态修改 NavMeshAgent 对不同区域的代价感知
NavMeshAgent agent = GetComponent<NavMeshAgent>();

// 设置水域的代价为 10（更不愿意走水）
agent.SetAreaCost(5, 10f); // 参数：区域索引, 代价值

// 设置道路的代价为 0.3（更喜欢走道路）
agent.SetAreaCost(3, 0.3f);
```

---

## 15.6 Off-Mesh Links（跳跃/攀爬连接）

Off-Mesh Links 用于连接 NavMesh 上不相邻的区域，让 AI 可以"跳跃"或"攀爬"。

### 自动生成 vs 手动创建

**自动生成：**
在 Navigation 的 Bake 标签页中设置：

```
Generated Off Mesh Links:
├─ Drop Height: 2.0     // 自动生成可跳下的连接（最大高度）
└─ Jump Distance: 3.0   // 自动生成可跳跃的连接（最大距离）
```

**手动创建：**
1. 创建两个空 GameObject 作为起点和终点
2. 创建一个新的 GameObject，添加 `OffMeshLink` 组件
3. 将起点和终点拖入 `Start` 和 `End` 字段

[截图：手动创建的 Off-Mesh Link，展示起点和终点的位置]

### Off-Mesh Link 参数

```
Start: Transform  // 起点
End: Transform    // 终点
Cost Override: -1 // 代价覆盖（-1 = 使用区域默认值）
Bi-Directional: true  // 是否双向（true = 可以来回走）
Activated: true   // 是否启用
Auto Update Positions: false  // 是否自动更新位置
Navigation Area: Jump  // 所属区域类型
```

### 自定义 Off-Mesh Link 过渡动画

```csharp
// OffMeshLinkHandler.cs
// 处理 AI 通过 Off-Mesh Link 时的自定义动画
// 例如跳跃动画、攀爬动画等

using System.Collections;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Off-Mesh Link 自定义过渡处理器
///
/// 默认情况下，NavMeshAgent 通过 Off-Mesh Link 时会"瞬移"。
/// 通过禁用 Auto Traverse Off Mesh Link 并用此脚本，
/// 可以实现平滑的跳跃/攀爬动画。
/// </summary>
[RequireComponent(typeof(NavMeshAgent))]
public class OffMeshLinkHandler : MonoBehaviour
{
    [Header("跳跃设置")]
    [Tooltip("跳跃高度（抛物线最高点）")]
    [SerializeField] private float jumpHeight = 2f;

    [Tooltip("跳跃/穿越持续时间")]
    [SerializeField] private float traverseDuration = 0.5f;

    /// <summary>NavMeshAgent 引用</summary>
    private NavMeshAgent agent;

    /// <summary>Animator 引用</summary>
    private Animator animator;

    /// <summary>是否正在过渡中</summary>
    private bool isTraversing = false;

    private void Start()
    {
        agent = GetComponent<NavMeshAgent>();
        animator = GetComponent<Animator>();

        // 禁用自动穿越 Off-Mesh Link
        agent.autoTraverseOffMeshLink = false;
    }

    private void Update()
    {
        // 检测是否到达 Off-Mesh Link
        if (agent.isOnOffMeshLink && !isTraversing)
        {
            StartCoroutine(TraverseOffMeshLink());
        }
    }

    /// <summary>
    /// 自定义穿越 Off-Mesh Link 的协程
    /// 使用抛物线插值实现跳跃效果
    /// </summary>
    private IEnumerator TraverseOffMeshLink()
    {
        isTraversing = true;

        // 获取起点和终点
        OffMeshLinkData linkData = agent.currentOffMeshLinkData;
        Vector3 startPos = agent.transform.position;
        Vector3 endPos = linkData.endPos + Vector3.up * agent.baseOffset;

        // 播放跳跃动画
        if (animator != null)
        {
            animator.SetTrigger("Jump");
        }

        // 禁用 agent 的移动（我们手动控制位置）
        agent.isStopped = true;

        float elapsed = 0f;

        while (elapsed < traverseDuration)
        {
            float t = elapsed / traverseDuration;

            // 水平位置：线性插值
            Vector3 horizontalPos = Vector3.Lerp(startPos, endPos, t);

            // 垂直位置：抛物线
            // 使用二次函数：y = 4h * t * (1 - t)
            // 在 t=0 和 t=1 时 y=0，在 t=0.5 时 y=h
            float verticalOffset = 4f * jumpHeight * t * (1f - t);

            // 合并位置
            agent.transform.position = new Vector3(
                horizontalPos.x,
                Mathf.Lerp(startPos.y, endPos.y, t) + verticalOffset,
                horizontalPos.z
            );

            elapsed += Time.deltaTime;
            yield return null;
        }

        // 确保到达终点
        agent.transform.position = endPos;

        // 完成穿越
        agent.CompleteOffMeshLink();
        agent.isStopped = false;

        // 播放落地动画
        if (animator != null)
        {
            animator.SetTrigger("Land");
        }

        isTraversing = false;
    }
}
```

[截图：AI 通过 Off-Mesh Link 跳跃时的抛物线轨迹]

---

## 15.7 AI 巡逻系统（路径点）

```csharp
// WaypointSystem.cs
// 路径点系统 - 管理和可视化 AI 巡逻路径
// 这是一个独立的组件，可被多个 AI 共享使用

using UnityEngine;

/// <summary>
/// 巡逻路径类型
/// </summary>
public enum PatrolPathType
{
    /// <summary>循环路径 - 走完最后一个点后回到第一个点</summary>
    Loop,

    /// <summary>往返路径 - 走到末尾后反向走回</summary>
    PingPong,

    /// <summary>随机路径 - 随机选择下一个路径点</summary>
    Random
}

/// <summary>
/// 路径点系统组件
///
/// 管理一组路径点，为 AI 巡逻提供目标位置。
///
/// 使用方式：
/// 1. 创建一个空 GameObject 作为路径点容器
/// 2. 添加此脚本
/// 3. 创建多个子 GameObject 作为路径点
/// 4. 将路径点拖入 waypoints 数组
/// 5. 在 AI 脚本中引用此组件获取下一个目标点
///
/// 前端类比：
/// 类似于一个数组迭代器（Iterator Pattern）
/// const path = [pointA, pointB, pointC];
/// let index = 0;
/// function getNext() { return path[index++ % path.length]; }
/// </summary>
public class WaypointSystem : MonoBehaviour
{
    [Header("路径点")]
    [Tooltip("路径点列表（按顺序排列）")]
    public Transform[] waypoints;

    [Header("路径设置")]
    [Tooltip("路径类型")]
    public PatrolPathType pathType = PatrolPathType.Loop;

    [Tooltip("路径点到达判定距离")]
    public float arrivalThreshold = 1.0f;

    [Tooltip("在路径点停留的最短时间")]
    public float minWaitTime = 0f;

    [Tooltip("在路径点停留的最长时间")]
    public float maxWaitTime = 3f;

    // ========== 内部状态 ==========

    /// <summary>当前路径点索引</summary>
    private int currentIndex = 0;

    /// <summary>PingPong 模式下的移动方向（1 = 正向，-1 = 反向）</summary>
    private int pingPongDirection = 1;

    // ========== 公共方法 ==========

    /// <summary>
    /// 获取当前路径点的位置
    /// </summary>
    /// <returns>当前路径点的世界坐标</returns>
    public Vector3 GetCurrentWaypoint()
    {
        if (waypoints == null || waypoints.Length == 0)
        {
            Debug.LogWarning("[WaypointSystem] 没有设置路径点");
            return transform.position;
        }

        return waypoints[currentIndex].position;
    }

    /// <summary>
    /// 移动到下一个路径点
    /// </summary>
    /// <returns>下一个路径点的世界坐标</returns>
    public Vector3 GetNextWaypoint()
    {
        if (waypoints == null || waypoints.Length == 0)
            return transform.position;

        switch (pathType)
        {
            case PatrolPathType.Loop:
                // 循环：走到末尾回到开头
                currentIndex = (currentIndex + 1) % waypoints.Length;
                break;

            case PatrolPathType.PingPong:
                // 往返：到达首尾时反转方向
                currentIndex += pingPongDirection;
                if (currentIndex >= waypoints.Length - 1)
                {
                    currentIndex = waypoints.Length - 1;
                    pingPongDirection = -1;
                }
                else if (currentIndex <= 0)
                {
                    currentIndex = 0;
                    pingPongDirection = 1;
                }
                break;

            case PatrolPathType.Random:
                // 随机：随机选择一个不同的路径点
                int newIndex;
                do
                {
                    newIndex = UnityEngine.Random.Range(0, waypoints.Length);
                } while (newIndex == currentIndex && waypoints.Length > 1);
                currentIndex = newIndex;
                break;
        }

        return waypoints[currentIndex].position;
    }

    /// <summary>
    /// 获取在当前路径点的随机等待时间
    /// </summary>
    /// <returns>等待时间（秒）</returns>
    public float GetRandomWaitTime()
    {
        return UnityEngine.Random.Range(minWaitTime, maxWaitTime);
    }

    /// <summary>
    /// 获取距离指定位置最近的路径点索引
    /// </summary>
    /// <param name="position">查询位置</param>
    /// <returns>最近路径点的索引</returns>
    public int GetNearestWaypointIndex(Vector3 position)
    {
        if (waypoints == null || waypoints.Length == 0)
            return -1;

        int nearestIndex = 0;
        float nearestDistance = float.MaxValue;

        for (int i = 0; i < waypoints.Length; i++)
        {
            float dist = Vector3.Distance(position, waypoints[i].position);
            if (dist < nearestDistance)
            {
                nearestDistance = dist;
                nearestIndex = i;
            }
        }

        return nearestIndex;
    }

    /// <summary>
    /// 重置到起始路径点
    /// </summary>
    public void ResetToStart()
    {
        currentIndex = 0;
        pingPongDirection = 1;
    }

    /// <summary>
    /// 获取路径点总数
    /// </summary>
    public int WaypointCount => waypoints != null ? waypoints.Length : 0;

    // ========== Gizmos 可视化 ==========

    /// <summary>
    /// 在 Scene 视图中绘制路径和路径点
    /// 这对于调试非常有帮助
    /// </summary>
    private void OnDrawGizmos()
    {
        if (waypoints == null || waypoints.Length == 0) return;

        for (int i = 0; i < waypoints.Length; i++)
        {
            if (waypoints[i] == null) continue;

            // 绘制路径点
            Gizmos.color = (i == currentIndex) ? Color.green : Color.yellow;
            Gizmos.DrawSphere(waypoints[i].position, 0.3f);

            // 绘制路径点编号标签（需要 UnityEditor）
            #if UNITY_EDITOR
            UnityEditor.Handles.Label(
                waypoints[i].position + Vector3.up * 0.5f,
                $"P{i}"
            );
            #endif

            // 绘制连接线
            if (i < waypoints.Length - 1 && waypoints[i + 1] != null)
            {
                Gizmos.color = Color.cyan;
                Gizmos.DrawLine(waypoints[i].position, waypoints[i + 1].position);
            }
        }

        // 如果是循环路径，绘制首尾连接线
        if (pathType == PatrolPathType.Loop && waypoints.Length > 1)
        {
            if (waypoints[0] != null && waypoints[waypoints.Length - 1] != null)
            {
                Gizmos.color = Color.cyan;
                Gizmos.DrawLine(
                    waypoints[waypoints.Length - 1].position,
                    waypoints[0].position
                );
            }
        }
    }
}
```

[截图：Scene 视图中 WaypointSystem 的 Gizmos 可视化，展示黄色球体和青色连接线]

---

## 15.8 AI 巡逻行为

```csharp
// AIPatrol.cs
// AI 巡逻行为组件 - 让 AI 沿路径点巡逻
// 与 WaypointSystem 配合使用

using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// AI 巡逻状态
/// </summary>
public enum PatrolState
{
    /// <summary>移动到下一个路径点</summary>
    Moving,

    /// <summary>在路径点等待</summary>
    Waiting,

    /// <summary>暂停巡逻（例如在追击后）</summary>
    Paused
}

/// <summary>
/// AI 巡逻组件
///
/// 使 AI 沿着 WaypointSystem 定义的路径巡逻。
/// 到达路径点后会短暂停留，然后继续前进。
///
/// 此组件设计为可以被其他行为（如追击）打断和恢复。
///
/// 使用方式：
/// 1. AI 对象上添加 NavMeshAgent 组件
/// 2. 添加此脚本
/// 3. 创建一个 WaypointSystem 并拖入 patrolPath 字段
/// </summary>
[RequireComponent(typeof(NavMeshAgent))]
public class AIPatrol : MonoBehaviour
{
    [Header("路径设置")]
    [Tooltip("巡逻路径（WaypointSystem 引用）")]
    [SerializeField] private WaypointSystem patrolPath;

    [Header("移动设置")]
    [Tooltip("巡逻移动速度")]
    [SerializeField] private float patrolSpeed = 2f;

    [Tooltip("到达路径点的判定距离")]
    [SerializeField] private float arrivalDistance = 1.0f;

    [Header("行为设置")]
    [Tooltip("巡逻时是否随机停下来观望")]
    [SerializeField] private bool randomLookAround = true;

    [Tooltip("随机观望的概率（0-1）")]
    [Range(0, 1)]
    [SerializeField] private float lookAroundChance = 0.3f;

    [Tooltip("随机观望的旋转角度范围")]
    [SerializeField] private float lookAroundAngle = 60f;

    // ========== 状态 ==========

    /// <summary>当前巡逻状态</summary>
    public PatrolState CurrentState { get; private set; } = PatrolState.Moving;

    /// <summary>是否正在巡逻中（可被外部查询）</summary>
    public bool IsPatrolling { get; private set; } = false;

    // ========== 内部引用 ==========

    /// <summary>NavMeshAgent 引用</summary>
    private NavMeshAgent agent;

    /// <summary>Animator 引用</summary>
    private Animator animator;

    /// <summary>等待计时器</summary>
    private float waitTimer = 0f;

    /// <summary>当前等待时间</summary>
    private float currentWaitDuration = 0f;

    // ========== 生命周期 ==========

    private void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        animator = GetComponent<Animator>();
    }

    private void Start()
    {
        if (patrolPath == null)
        {
            Debug.LogWarning($"[AIPatrol] {gameObject.name} 没有设置巡逻路径");
            return;
        }

        // 开始巡逻
        StartPatrol();
    }

    private void Update()
    {
        if (!IsPatrolling || CurrentState == PatrolState.Paused)
            return;

        switch (CurrentState)
        {
            case PatrolState.Moving:
                UpdateMoving();
                break;

            case PatrolState.Waiting:
                UpdateWaiting();
                break;
        }

        // 更新动画
        if (animator != null)
        {
            animator.SetFloat("Speed", agent.velocity.magnitude);
        }
    }

    // ========== 巡逻控制 ==========

    /// <summary>
    /// 开始巡逻
    /// </summary>
    public void StartPatrol()
    {
        if (patrolPath == null || patrolPath.WaypointCount == 0)
            return;

        IsPatrolling = true;
        agent.speed = patrolSpeed;
        agent.isStopped = false;

        // 设置第一个目标路径点
        MoveToCurrentWaypoint();

        Debug.Log($"[AIPatrol] {gameObject.name} 开始巡逻");
    }

    /// <summary>
    /// 暂停巡逻（被追击等行为打断时调用）
    /// </summary>
    public void PausePatrol()
    {
        CurrentState = PatrolState.Paused;
        IsPatrolling = false;

        Debug.Log($"[AIPatrol] {gameObject.name} 暂停巡逻");
    }

    /// <summary>
    /// 恢复巡逻（从暂停状态恢复）
    /// </summary>
    public void ResumePatrol()
    {
        if (patrolPath == null) return;

        IsPatrolling = true;
        agent.speed = patrolSpeed;
        agent.isStopped = false;

        // 找到最近的路径点重新开始
        int nearestIndex = patrolPath.GetNearestWaypointIndex(transform.position);
        if (nearestIndex >= 0)
        {
            // 从最近的点开始走向下一个
            MoveToCurrentWaypoint();
        }

        CurrentState = PatrolState.Moving;

        Debug.Log($"[AIPatrol] {gameObject.name} 恢复巡逻");
    }

    /// <summary>
    /// 停止巡逻
    /// </summary>
    public void StopPatrol()
    {
        IsPatrolling = false;
        CurrentState = PatrolState.Paused;
        agent.isStopped = true;

        Debug.Log($"[AIPatrol] {gameObject.name} 停止巡逻");
    }

    // ========== 状态更新 ==========

    /// <summary>
    /// 移动状态更新
    /// </summary>
    private void UpdateMoving()
    {
        // 检查是否到达当前路径点
        if (!agent.pathPending && agent.remainingDistance <= arrivalDistance)
        {
            OnReachedWaypoint();
        }
    }

    /// <summary>
    /// 等待状态更新
    /// </summary>
    private void UpdateWaiting()
    {
        waitTimer += Time.deltaTime;

        // 等待期间随机观望
        if (randomLookAround)
        {
            float rotateProgress = waitTimer / currentWaitDuration;
            if (rotateProgress > 0.3f && rotateProgress < 0.7f)
            {
                // 在等待中间阶段随机旋转
                float angle = Mathf.Sin(Time.time * 2f) * lookAroundAngle;
                Quaternion targetRot = Quaternion.Euler(0, transform.eulerAngles.y + angle * Time.deltaTime, 0);
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, 2f * Time.deltaTime);
            }
        }

        // 等待时间结束
        if (waitTimer >= currentWaitDuration)
        {
            MoveToNextWaypoint();
        }
    }

    // ========== 路径点逻辑 ==========

    /// <summary>
    /// 到达路径点时调用
    /// </summary>
    private void OnReachedWaypoint()
    {
        // 决定是否在此路径点等待
        float waitTime = patrolPath.GetRandomWaitTime();

        if (waitTime > 0 || (randomLookAround && Random.value < lookAroundChance))
        {
            // 进入等待状态
            CurrentState = PatrolState.Waiting;
            agent.isStopped = true;
            waitTimer = 0f;
            currentWaitDuration = Mathf.Max(waitTime, 1f);
        }
        else
        {
            // 直接前往下一个路径点
            MoveToNextWaypoint();
        }
    }

    /// <summary>
    /// 移动到当前路径点
    /// </summary>
    private void MoveToCurrentWaypoint()
    {
        CurrentState = PatrolState.Moving;
        agent.isStopped = false;

        Vector3 target = patrolPath.GetCurrentWaypoint();
        agent.SetDestination(target);
    }

    /// <summary>
    /// 移动到下一个路径点
    /// </summary>
    private void MoveToNextWaypoint()
    {
        CurrentState = PatrolState.Moving;
        agent.isStopped = false;

        Vector3 nextTarget = patrolPath.GetNextWaypoint();
        agent.SetDestination(nextTarget);

        Debug.Log($"[AIPatrol] {gameObject.name} 前往下一个路径点");
    }
}
```

---

## 15.9 AI 追击行为

```csharp
// AIChase.cs
// AI 追击行为组件 - 让 AI 追踪并追击目标
// 可与 AIPatrol 配合使用

using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// AI 追击组件
///
/// 检测到目标后追击，丢失目标后可以返回巡逻。
///
/// 与 AIPatrol 的协作模式：
/// 1. AIPatrol 正常巡逻
/// 2. AIChase 检测到玩家 → 调用 AIPatrol.PausePatrol()
/// 3. AIChase 接管 NavMeshAgent 进行追击
/// 4. 目标丢失后 → 调用 AIPatrol.ResumePatrol()
/// </summary>
[RequireComponent(typeof(NavMeshAgent))]
public class AIChase : MonoBehaviour
{
    [Header("检测设置")]
    [Tooltip("检测距离")]
    [SerializeField] private float detectionRange = 15f;

    [Tooltip("丢失目标的距离")]
    [SerializeField] private float loseRange = 25f;

    [Tooltip("视野角度")]
    [Range(0, 360)]
    [SerializeField] private float fieldOfView = 120f;

    [Tooltip("检测的目标层")]
    [SerializeField] private LayerMask targetLayer;

    [Tooltip("遮挡检测层（墙壁等会阻挡视线的物体）")]
    [SerializeField] private LayerMask obstacleLayers;

    [Header("追击设置")]
    [Tooltip("追击速度")]
    [SerializeField] private float chaseSpeed = 5f;

    [Tooltip("攻击距离（到达此距离停止追击）")]
    [SerializeField] private float attackRange = 2.5f;

    [Tooltip("丢失目标后继续搜索的时间（秒）")]
    [SerializeField] private float searchDuration = 5f;

    [Tooltip("搜索时移动到最后已知位置")]
    [SerializeField] private bool moveToLastKnown = true;

    [Header("调试")]
    [Tooltip("是否在 Scene 视图中显示检测范围")]
    [SerializeField] private bool showDebugGizmos = true;

    // ========== 状态 ==========

    /// <summary>是否正在追击</summary>
    public bool IsChasing { get; private set; } = false;

    /// <summary>是否在攻击范围内</summary>
    public bool IsInAttackRange { get; private set; } = false;

    /// <summary>当前追击目标</summary>
    public Transform Target { get; private set; }

    /// <summary>目标最后已知位置</summary>
    private Vector3 lastKnownPosition;

    /// <summary>搜索计时器</summary>
    private float searchTimer = 0f;

    /// <summary>是否正在搜索中</summary>
    private bool isSearching = false;

    // ========== 组件引用 ==========

    private NavMeshAgent agent;
    private AIPatrol patrol;
    private Animator animator;

    // ========== 生命周期 ==========

    private void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        patrol = GetComponent<AIPatrol>();
        animator = GetComponent<Animator>();
    }

    private void Update()
    {
        if (IsChasing)
        {
            UpdateChase();
        }
        else if (isSearching)
        {
            UpdateSearch();
        }
        else
        {
            // 未追击时持续检测
            ScanForTarget();
        }
    }

    // ========== 检测逻辑 ==========

    /// <summary>
    /// 扫描检测目标
    ///
    /// 检测流程：
    /// 1. 球形范围检测（Physics.OverlapSphere）
    /// 2. 视野角度过滤
    /// 3. 射线遮挡检测（确认没有墙壁挡住视线）
    /// </summary>
    private void ScanForTarget()
    {
        Collider[] colliders = Physics.OverlapSphere(
            transform.position, detectionRange, targetLayer);

        foreach (Collider col in colliders)
        {
            // 计算方向和角度
            Vector3 dirToTarget = (col.transform.position - transform.position).normalized;
            float angle = Vector3.Angle(transform.forward, dirToTarget);

            // 视野角度检查
            if (angle > fieldOfView * 0.5f) continue;

            // 射线遮挡检测
            float distToTarget = Vector3.Distance(transform.position, col.transform.position);
            Vector3 eyePosition = transform.position + Vector3.up * 1.5f;

            RaycastHit hit;
            if (Physics.Raycast(eyePosition, dirToTarget, out hit, distToTarget, obstacleLayers))
            {
                // 射线被障碍物挡住了，看不到目标
                continue;
            }

            // 检测成功！开始追击
            StartChasing(col.transform);
            return;
        }
    }

    // ========== 追击控制 ==========

    /// <summary>
    /// 开始追击目标
    /// </summary>
    /// <param name="target">追击目标</param>
    public void StartChasing(Transform target)
    {
        if (target == null) return;

        Target = target;
        IsChasing = true;
        isSearching = false;

        // 暂停巡逻
        if (patrol != null)
        {
            patrol.PausePatrol();
        }

        // 设置追击速度
        agent.speed = chaseSpeed;
        agent.isStopped = false;

        // 通知 Animator
        if (animator != null)
        {
            animator.SetBool("IsChasing", true);
        }

        Debug.Log($"[AIChase] {gameObject.name} 开始追击 {target.name}");
    }

    /// <summary>
    /// 更新追击行为
    /// </summary>
    private void UpdateChase()
    {
        if (Target == null)
        {
            StopChasing();
            return;
        }

        float distToTarget = Vector3.Distance(transform.position, Target.position);

        // 更新最后已知位置
        lastKnownPosition = Target.position;

        // 检查是否在攻击范围内
        IsInAttackRange = distToTarget <= attackRange;

        if (IsInAttackRange)
        {
            // 在攻击范围内 → 停止移动，面朝目标
            agent.isStopped = true;
            FaceTarget();
        }
        else
        {
            // 继续追击
            agent.isStopped = false;
            agent.SetDestination(Target.position);
        }

        // 检查是否超出丢失距离
        if (distToTarget > loseRange)
        {
            // 检查是否还能看到目标
            if (!CanSeeTarget())
            {
                LoseTarget();
            }
        }
    }

    /// <summary>
    /// 检查是否能看到目标
    /// </summary>
    private bool CanSeeTarget()
    {
        if (Target == null) return false;

        Vector3 dirToTarget = (Target.position - transform.position).normalized;
        float distToTarget = Vector3.Distance(transform.position, Target.position);
        Vector3 eyePosition = transform.position + Vector3.up * 1.5f;

        RaycastHit hit;
        if (Physics.Raycast(eyePosition, dirToTarget, out hit, distToTarget, obstacleLayers))
        {
            return false; // 视线被遮挡
        }

        return true;
    }

    /// <summary>
    /// 丢失目标 → 进入搜索模式
    /// </summary>
    private void LoseTarget()
    {
        Debug.Log($"[AIChase] {gameObject.name} 丢失了目标");

        IsChasing = false;
        IsInAttackRange = false;
        isSearching = true;
        searchTimer = 0f;

        // 移动到最后已知位置
        if (moveToLastKnown)
        {
            agent.SetDestination(lastKnownPosition);
        }
    }

    /// <summary>
    /// 更新搜索行为
    /// </summary>
    private void UpdateSearch()
    {
        searchTimer += Time.deltaTime;

        // 搜索期间继续扫描
        ScanForTarget();
        if (IsChasing) return; // 重新发现目标

        // 到达最后已知位置
        if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance)
        {
            // 在最后已知位置附近观望
            transform.Rotate(0, 90f * Time.deltaTime, 0);
        }

        // 搜索时间到
        if (searchTimer >= searchDuration)
        {
            StopChasing();
        }
    }

    /// <summary>
    /// 停止追击，恢复巡逻
    /// </summary>
    public void StopChasing()
    {
        Target = null;
        IsChasing = false;
        IsInAttackRange = false;
        isSearching = false;

        // 恢复巡逻
        if (patrol != null)
        {
            patrol.ResumePatrol();
        }

        // 通知 Animator
        if (animator != null)
        {
            animator.SetBool("IsChasing", false);
        }

        Debug.Log($"[AIChase] {gameObject.name} 停止追击，恢复巡逻");
    }

    /// <summary>
    /// 面朝目标
    /// </summary>
    private void FaceTarget()
    {
        if (Target == null) return;

        Vector3 dir = (Target.position - transform.position).normalized;
        dir.y = 0;
        if (dir.sqrMagnitude > 0.001f)
        {
            Quaternion targetRot = Quaternion.LookRotation(dir);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, 10f * Time.deltaTime);
        }
    }

    // ========== 外部通知 ==========

    /// <summary>
    /// 被攻击时强制发现目标（即使不在视野内）
    /// </summary>
    /// <param name="attacker">攻击者</param>
    public void AlertFromDamage(Transform attacker)
    {
        if (!IsChasing && attacker != null)
        {
            StartChasing(attacker);
        }
    }

    // ========== Gizmos ==========

    private void OnDrawGizmosSelected()
    {
        if (!showDebugGizmos) return;

        // 检测范围
        Gizmos.color = new Color(1, 1, 0, 0.2f);
        Gizmos.DrawWireSphere(transform.position, detectionRange);

        // 丢失范围
        Gizmos.color = new Color(1, 0, 0, 0.1f);
        Gizmos.DrawWireSphere(transform.position, loseRange);

        // 攻击范围
        Gizmos.color = new Color(1, 0, 0, 0.3f);
        Gizmos.DrawWireSphere(transform.position, attackRange);

        // 视野扇形
        Gizmos.color = Color.green;
        float halfFOV = fieldOfView * 0.5f;
        Vector3 leftDir = Quaternion.Euler(0, -halfFOV, 0) * transform.forward;
        Vector3 rightDir = Quaternion.Euler(0, halfFOV, 0) * transform.forward;
        Gizmos.DrawRay(transform.position + Vector3.up, leftDir * detectionRange);
        Gizmos.DrawRay(transform.position + Vector3.up, rightDir * detectionRange);

        // 追击线
        if (IsChasing && Target != null)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawLine(transform.position, Target.position);
        }
    }
}
```

---

## 15.10 AI 状态机（综合控制）

```csharp
// AIStateMachine.cs
// AI 状态机 - 综合管理 AI 的所有行为状态
// 协调 AIPatrol、AIChase 和其他行为组件

using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// AI 综合状态
/// </summary>
public enum AIState
{
    Idle,       // 空闲
    Patrol,     // 巡逻
    Chase,      // 追击
    Attack,     // 攻击
    Flee,       // 逃跑
    ReturnHome, // 返回出生点
    Dead        // 死亡
}

/// <summary>
/// AI 状态机 - 综合行为控制器
///
/// 这是一个高层次的控制器，协调所有 AI 行为组件。
/// 它决定 AI 当前应该执行什么行为，并委托给对应的组件执行。
///
/// 设计模式：
/// 这是一个典型的有限状态机（FSM）实现。
///
/// 前端类比：
/// 类似于一个路由控制器或页面管理器：
/// switch(currentRoute) {
///     case '/patrol': return <PatrolView />;
///     case '/chase': return <ChaseView />;
///     case '/attack': return <AttackView />;
/// }
///
/// 完整行为循环：
/// 空闲 → 巡逻 → 发现玩家 → 追击 → 进入攻击范围 → 攻击
///   ↑                                                  │
///   └──── 丢失目标 ← 返回出生点 ← 血量低 → 逃跑 ────────┘
/// </summary>
[RequireComponent(typeof(NavMeshAgent))]
[RequireComponent(typeof(HealthComponent))]
public class AIStateMachine : MonoBehaviour
{
    // ========== 配置 ==========

    [Header("行为组件引用")]
    [Tooltip("巡逻组件")]
    [SerializeField] private AIPatrol patrolComponent;

    [Tooltip("追击组件")]
    [SerializeField] private AIChase chaseComponent;

    [Header("返回设置")]
    [Tooltip("最大追击距离（超过后返回出生点）")]
    [SerializeField] private float maxChaseDistance = 30f;

    [Tooltip("返回出生点的速度")]
    [SerializeField] private float returnSpeed = 4f;

    [Header("攻击设置")]
    [Tooltip("攻击冷却时间")]
    [SerializeField] private float attackCooldown = 2f;

    [Tooltip("攻击伤害")]
    [SerializeField] private float attackDamage = 10f;

    [Header("逃跑设置")]
    [Tooltip("逃跑血量阈值（百分比）")]
    [Range(0, 1)]
    [SerializeField] private float fleeThreshold = 0.2f;

    [Tooltip("逃跑速度")]
    [SerializeField] private float fleeSpeed = 6f;

    // ========== 状态 ==========

    /// <summary>当前 AI 状态</summary>
    public AIState CurrentState { get; private set; } = AIState.Idle;

    // ========== 内部引用 ==========

    private NavMeshAgent agent;
    private HealthComponent health;
    private Animator animator;

    /// <summary>出生位置</summary>
    private Vector3 homePosition;

    /// <summary>攻击冷却计时器</summary>
    private float attackTimer = 0f;

    /// <summary>空闲计时器</summary>
    private float idleTimer = 0f;

    /// <summary>空闲持续时间</summary>
    private float idleDuration = 3f;

    // ========== 生命周期 ==========

    private void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        health = GetComponent<HealthComponent>();
        animator = GetComponent<Animator>();

        // 自动获取行为组件
        if (patrolComponent == null)
            patrolComponent = GetComponent<AIPatrol>();
        if (chaseComponent == null)
            chaseComponent = GetComponent<AIChase>();
    }

    private void Start()
    {
        homePosition = transform.position;

        // 监听事件
        if (health != null)
        {
            health.OnDeath += OnDeath;
            health.OnDamaged += OnDamaged;
        }

        // 初始状态
        TransitionTo(AIState.Idle);
    }

    private void Update()
    {
        if (CurrentState == AIState.Dead) return;

        // 攻击冷却
        if (attackTimer > 0)
            attackTimer -= Time.deltaTime;

        // 全局状态检查
        CheckGlobalTransitions();

        // 更新当前状态
        switch (CurrentState)
        {
            case AIState.Idle:
                UpdateIdle();
                break;
            case AIState.Patrol:
                UpdatePatrol();
                break;
            case AIState.Chase:
                UpdateChase();
                break;
            case AIState.Attack:
                UpdateAttack();
                break;
            case AIState.Flee:
                UpdateFlee();
                break;
            case AIState.ReturnHome:
                UpdateReturnHome();
                break;
        }

        // 更新动画
        UpdateAnimator();
    }

    // ========== 状态切换 ==========

    /// <summary>
    /// 切换到新状态
    /// </summary>
    private void TransitionTo(AIState newState)
    {
        if (CurrentState == newState) return;

        Debug.Log($"[AI-FSM] {gameObject.name}: {CurrentState} → {newState}");

        // 退出当前状态
        OnExitState(CurrentState);

        CurrentState = newState;

        // 进入新状态
        OnEnterState(newState);
    }

    /// <summary>进入状态</summary>
    private void OnEnterState(AIState state)
    {
        switch (state)
        {
            case AIState.Idle:
                agent.isStopped = true;
                idleTimer = 0f;
                idleDuration = Random.Range(2f, 5f);
                if (patrolComponent != null) patrolComponent.PausePatrol();
                break;

            case AIState.Patrol:
                if (patrolComponent != null) patrolComponent.ResumePatrol();
                break;

            case AIState.Chase:
                // chaseComponent 通过自身逻辑开始追击
                break;

            case AIState.Attack:
                agent.isStopped = true;
                break;

            case AIState.Flee:
                agent.speed = fleeSpeed;
                agent.isStopped = false;
                if (patrolComponent != null) patrolComponent.PausePatrol();
                break;

            case AIState.ReturnHome:
                agent.speed = returnSpeed;
                agent.isStopped = false;
                agent.SetDestination(homePosition);
                if (chaseComponent != null) chaseComponent.StopChasing();
                if (patrolComponent != null) patrolComponent.PausePatrol();
                break;

            case AIState.Dead:
                agent.isStopped = true;
                agent.enabled = false;
                break;
        }
    }

    /// <summary>退出状态</summary>
    private void OnExitState(AIState state)
    {
        switch (state)
        {
            case AIState.Chase:
                break;

            case AIState.Attack:
                agent.isStopped = false;
                break;
        }
    }

    // ========== 全局状态检查 ==========

    /// <summary>
    /// 检查全局转换条件（在任何状态下都可能触发的转换）
    /// </summary>
    private void CheckGlobalTransitions()
    {
        // 低血量 → 逃跑
        if (CurrentState != AIState.Flee &&
            CurrentState != AIState.Dead &&
            health != null &&
            health.HealthPercent <= fleeThreshold)
        {
            TransitionTo(AIState.Flee);
            return;
        }

        // 超出追击距离 → 返回
        if ((CurrentState == AIState.Chase || CurrentState == AIState.Attack) &&
            Vector3.Distance(transform.position, homePosition) > maxChaseDistance)
        {
            TransitionTo(AIState.ReturnHome);
            return;
        }
    }

    // ========== 各状态更新 ==========

    private void UpdateIdle()
    {
        idleTimer += Time.deltaTime;

        // 检查追击组件是否发现了目标
        if (chaseComponent != null && chaseComponent.IsChasing)
        {
            TransitionTo(AIState.Chase);
            return;
        }

        // 空闲一段时间后开始巡逻
        if (idleTimer >= idleDuration)
        {
            TransitionTo(AIState.Patrol);
        }
    }

    private void UpdatePatrol()
    {
        // 检查是否发现目标
        if (chaseComponent != null && chaseComponent.IsChasing)
        {
            if (patrolComponent != null) patrolComponent.PausePatrol();
            TransitionTo(AIState.Chase);
        }
    }

    private void UpdateChase()
    {
        if (chaseComponent == null)
        {
            TransitionTo(AIState.Patrol);
            return;
        }

        // 检查是否在攻击范围内
        if (chaseComponent.IsInAttackRange)
        {
            TransitionTo(AIState.Attack);
            return;
        }

        // 检查是否丢失目标
        if (!chaseComponent.IsChasing)
        {
            TransitionTo(AIState.ReturnHome);
        }
    }

    private void UpdateAttack()
    {
        // 面朝目标
        if (chaseComponent != null && chaseComponent.Target != null)
        {
            Vector3 dir = (chaseComponent.Target.position - transform.position).normalized;
            dir.y = 0;
            if (dir.sqrMagnitude > 0.001f)
            {
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    Quaternion.LookRotation(dir),
                    10f * Time.deltaTime
                );
            }

            // 检查是否还在攻击范围内
            if (!chaseComponent.IsInAttackRange)
            {
                TransitionTo(AIState.Chase);
                return;
            }

            // 攻击逻辑
            if (attackTimer <= 0)
            {
                PerformAttack();
                attackTimer = attackCooldown;
            }
        }
        else
        {
            TransitionTo(AIState.Chase);
        }
    }

    private void UpdateFlee()
    {
        if (chaseComponent != null && chaseComponent.Target != null)
        {
            // 计算远离目标的方向
            Vector3 fleeDir = (transform.position - chaseComponent.Target.position).normalized;
            Vector3 fleeTarget = transform.position + fleeDir * 15f;

            // 确保逃跑目标在 NavMesh 上
            NavMeshHit hit;
            if (NavMesh.SamplePosition(fleeTarget, out hit, 10f, NavMesh.AllAreas))
            {
                agent.SetDestination(hit.position);
            }
        }

        // 逃跑足够远后返回
        float distToHome = Vector3.Distance(transform.position, homePosition);
        if (chaseComponent == null || !chaseComponent.IsChasing)
        {
            TransitionTo(AIState.ReturnHome);
        }
    }

    private void UpdateReturnHome()
    {
        float distToHome = Vector3.Distance(transform.position, homePosition);

        // 到达出生点附近
        if (distToHome <= 2f)
        {
            // 恢复满血
            if (health != null)
            {
                health.Heal(health.MaxHealth);
            }

            TransitionTo(AIState.Idle);
        }

        // 返回途中发现玩家（如果血量允许）
        if (health != null && health.HealthPercent > fleeThreshold &&
            chaseComponent != null && chaseComponent.IsChasing)
        {
            TransitionTo(AIState.Chase);
        }
    }

    // ========== 攻击 ==========

    private void PerformAttack()
    {
        if (animator != null)
        {
            animator.SetTrigger("Attack");
        }

        // 对目标造成伤害
        if (chaseComponent != null && chaseComponent.Target != null)
        {
            IDamageable target = chaseComponent.Target.GetComponent<IDamageable>();
            if (target != null)
            {
                DamageInfo info = new DamageInfo
                {
                    baseDamage = attackDamage,
                    finalDamage = attackDamage,
                    source = gameObject,
                    hitPoint = chaseComponent.Target.position,
                    hitDirection = (chaseComponent.Target.position - transform.position).normalized,
                    damageType = DamageType.Physical,
                    knockbackForce = 3f
                };

                target.TakeDamage(info);
            }
        }
    }

    // ========== 事件回调 ==========

    private void OnDeath(DamageInfo info)
    {
        TransitionTo(AIState.Dead);

        if (animator != null)
        {
            animator.SetTrigger("Die");
        }
    }

    private void OnDamaged(DamageInfo info, float remainingHealth)
    {
        // 被攻击时通知追击组件
        if (chaseComponent != null && info.source != null)
        {
            chaseComponent.AlertFromDamage(info.source.transform);
        }
    }

    // ========== 动画 ==========

    private void UpdateAnimator()
    {
        if (animator == null) return;

        float speed = agent.enabled ? agent.velocity.magnitude : 0f;
        animator.SetFloat("Speed", speed);
        animator.SetBool("IsChasing", CurrentState == AIState.Chase);
        animator.SetBool("IsFleeing", CurrentState == AIState.Flee);
    }

    // ========== Gizmos ==========

    private void OnDrawGizmosSelected()
    {
        // 出生点
        Gizmos.color = Color.blue;
        Gizmos.DrawWireSphere(
            Application.isPlaying ? homePosition : transform.position,
            1f
        );

        // 最大追击距离
        Gizmos.color = new Color(0, 0, 1, 0.1f);
        Gizmos.DrawWireSphere(
            Application.isPlaying ? homePosition : transform.position,
            maxChaseDistance
        );

        // 当前状态标签
        #if UNITY_EDITOR
        if (Application.isPlaying)
        {
            UnityEditor.Handles.Label(
                transform.position + Vector3.up * 3f,
                $"[{CurrentState}]"
            );
        }
        #endif
    }
}
```

[截图：AI 状态机运行时的完整 Gizmos 可视化，展示所有范围和当前状态标签]

---

## 15.11 运行时 NavMesh 与调试

### 运行时生成 NavMesh

对于程序化生成的地形（如随机地图），你需要在运行时烘焙 NavMesh。Unity 提供了 `NavMeshSurface` 组件（需要安装 AI Navigation 包）。

```csharp
// RuntimeNavMeshBaker.cs
// 运行时 NavMesh 烘焙器
// 在程序化地形生成后动态烘焙 NavMesh

using UnityEngine;
using UnityEngine.AI;
using Unity.AI.Navigation;

/// <summary>
/// 运行时 NavMesh 烘焙器
///
/// 用于程序化生成的地形或动态变化的场景。
/// 需要安装 Unity AI Navigation 包（Package Manager → AI Navigation）
/// </summary>
public class RuntimeNavMeshBaker : MonoBehaviour
{
    [Header("设置")]
    [Tooltip("NavMeshSurface 组件引用")]
    [SerializeField] private NavMeshSurface navMeshSurface;

    [Tooltip("是否在 Start 时自动烘焙")]
    [SerializeField] private bool bakeOnStart = true;

    [Tooltip("地形变化后重新烘焙的延迟（秒）")]
    [SerializeField] private float rebakeDelay = 0.5f;

    private void Start()
    {
        if (navMeshSurface == null)
        {
            navMeshSurface = GetComponent<NavMeshSurface>();
        }

        if (bakeOnStart)
        {
            BakeNavMesh();
        }
    }

    /// <summary>
    /// 烘焙/重新烘焙 NavMesh
    /// 在地形生成或修改后调用此方法
    /// </summary>
    public void BakeNavMesh()
    {
        if (navMeshSurface == null)
        {
            Debug.LogError("[RuntimeNavMeshBaker] 没有找到 NavMeshSurface 组件");
            return;
        }

        // 执行烘焙（这是一个同步操作，可能会短暂卡顿）
        navMeshSurface.BuildNavMesh();

        Debug.Log("[RuntimeNavMeshBaker] NavMesh 烘焙完成");
    }

    /// <summary>
    /// 延迟烘焙（给地形生成留出时间）
    /// </summary>
    public void BakeNavMeshDelayed()
    {
        Invoke(nameof(BakeNavMesh), rebakeDelay);
    }

    /// <summary>
    /// 更新 NavMesh（用于小范围变化，如放置建筑）
    /// </summary>
    public void UpdateNavMesh()
    {
        if (navMeshSurface != null)
        {
            navMeshSurface.UpdateNavMesh(navMeshSurface.navMeshData);
            Debug.Log("[RuntimeNavMeshBaker] NavMesh 已更新");
        }
    }
}
```

### 调试 NavMesh 的技巧

**1. 在 Scene 视图中可视化 NavMesh**

[截图：Scene 视图中显示 NavMesh 的方法 - 通过 Navigation 窗口或 Scene 视图的 Gizmos 下拉菜单]

方法：
- Window → AI → Navigation → 确保 Show NavMesh 勾选
- 或在 Scene 视图的 Gizmos 下拉菜单中勾选 NavMesh

**2. 运行时调试路径**

```csharp
// NavMeshDebugger.cs
// NavMesh 调试工具 - 在运行时可视化 AI 的路径

using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// NavMesh 调试工具
/// 在运行时绘制 AI 的当前路径
/// </summary>
[RequireComponent(typeof(NavMeshAgent))]
public class NavMeshDebugger : MonoBehaviour
{
    [Header("调试设置")]
    [Tooltip("是否启用路径可视化")]
    [SerializeField] private bool showPath = true;

    [Tooltip("路径线颜色")]
    [SerializeField] private Color pathColor = Color.green;

    [Tooltip("是否显示目标点")]
    [SerializeField] private bool showDestination = true;

    [Tooltip("是否使用 LineRenderer 绘制路径（游戏视图中可见）")]
    [SerializeField] private bool useLineRenderer = false;

    private NavMeshAgent agent;
    private LineRenderer lineRenderer;

    private void Start()
    {
        agent = GetComponent<NavMeshAgent>();

        if (useLineRenderer)
        {
            lineRenderer = gameObject.AddComponent<LineRenderer>();
            lineRenderer.startWidth = 0.1f;
            lineRenderer.endWidth = 0.1f;
            lineRenderer.material = new Material(Shader.Find("Sprites/Default"));
            lineRenderer.startColor = pathColor;
            lineRenderer.endColor = pathColor;
        }
    }

    private void Update()
    {
        if (useLineRenderer && agent.hasPath)
        {
            NavMeshPath path = agent.path;
            lineRenderer.positionCount = path.corners.Length;
            for (int i = 0; i < path.corners.Length; i++)
            {
                lineRenderer.SetPosition(i, path.corners[i] + Vector3.up * 0.1f);
            }
        }
    }

    private void OnDrawGizmos()
    {
        if (!showPath || agent == null || !agent.hasPath) return;

        // 绘制路径
        NavMeshPath path = agent.path;
        Gizmos.color = pathColor;

        for (int i = 0; i < path.corners.Length - 1; i++)
        {
            Gizmos.DrawLine(
                path.corners[i] + Vector3.up * 0.1f,
                path.corners[i + 1] + Vector3.up * 0.1f
            );
        }

        // 绘制路径点
        for (int i = 0; i < path.corners.Length; i++)
        {
            Gizmos.color = (i == 0) ? Color.green : Color.yellow;
            Gizmos.DrawSphere(path.corners[i] + Vector3.up * 0.1f, 0.15f);
        }

        // 绘制目标点
        if (showDestination)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawSphere(agent.destination + Vector3.up * 0.1f, 0.3f);
        }
    }
}
```

**3. 常见问题排查**

| 问题 | 可能原因 | 解决方案 |
|-----|---------|---------|
| AI 不移动 | NavMesh 未烘焙 | 打开 Navigation 窗口，点击 Bake |
| AI 穿墙 | 墙壁不是 Navigation Static | 勾选墙壁的 Navigation Static |
| AI 无法到达某些区域 | Agent Radius 太大 | 减小烘焙参数的 Agent Radius |
| AI 卡在边缘 | Stopping Distance 太小 | 增大 Stopping Distance |
| AI 走奇怪的路 | Area Cost 不合理 | 检查自定义区域的代价设置 |
| AI 卡在 Off-Mesh Link | Auto Traverse 未启用 | 勾选 Auto Traverse Off Mesh Link |
| 运行时 NavMesh 无效 | 未安装 AI Navigation 包 | Package Manager 安装 AI Navigation |

---

## 15.12 完整设置步骤汇总

### 场景设置

1. **标记静态物体**
   - 选中地面、墙壁、平台
   - 勾选 Navigation Static

2. **烘焙 NavMesh**
   - Window → AI → Navigation → Bake
   - 调整 Agent Radius/Height/Max Slope
   - 点击 Bake

3. **设置自定义区域**
   - Navigation → Areas 标签页
   - 定义 Road、Water 等区域及代价
   - 在 Object 标签页为地面指定区域

### AI 角色设置

4. **添加 NavMeshAgent**
   - 选中 AI 角色
   - Add Component → NavMeshAgent
   - 配置 Speed、Stopping Distance 等

5. **添加行为脚本**
   - 添加 HealthComponent
   - 添加 AIPatrol + WaypointSystem
   - 添加 AIChase
   - 添加 AIStateMachine
   - 添加 NavMeshDebugger（调试用）

6. **创建巡逻路径**
   - 创建空 GameObject 作为路径容器
   - 添加 WaypointSystem 脚本
   - 创建子 GameObject 作为路径点
   - 将路径点拖入 waypoints 数组

7. **动态障碍物**
   - 为门、可推动物体添加 NavMeshObstacle
   - 设置 Carve = true

[截图：完整场景中的 NavMesh 可视化，展示不同区域颜色和 AI 巡逻路径]

---

## 练习题

### 练习一：实现 AI 群体追击
当一个敌人发现玩家后，通知附近的敌人一起追击。

**提示：**
- 在 `AIChase.StartChasing()` 中使用 `Physics.OverlapSphere` 查找附近的 AI
- 调用它们的 `AIChase.AlertFromDamage()` 方法
- 设置一个最大通知距离（如 15 米）
- 注意避免无限递归通知

### 练习二：实现 AI 搜索行为
当 AI 丢失目标后，不是直接返回巡逻，而是在最后已知位置附近搜索一圈。

**提示：**
- 在 `AIChase` 中添加搜索状态
- 在最后已知位置周围生成几个搜索点
- 依次前往这些搜索点
- 搜索期间保持扫描检测
- 搜索完毕后才返回巡逻

### 练习三：实现不同 AI 类型
创建三种不同类型的 AI 敌人：近战战士（追击并近战攻击）、弓箭手（保持距离远程攻击）、治疗者（跟随队友并治疗低血量的盟友）。

**提示：**
- 弓箭手在追击时保持 10-15 米距离，不靠近
- 弓箭手使用 `ProjectileAttack` 组件
- 治疗者的目标不是玩家而是血量最低的盟友
- 可以通过 NavMeshAgent.stoppingDistance 控制保持距离

### 练习四：实现动态避障寻路
在场景中添加一些会移动的障碍物（如行驶的矿车），让 AI 能够动态避开这些障碍物。

**提示：**
- 移动障碍物使用 NavMeshObstacle（Carve = true）
- 设置合适的 Carve Only Stationary 和 Move Threshold
- 观察 AI 路径如何实时变化
- 注意性能：大量 Carving 障碍物会影响帧率

---

## 下一章预告

在下一章 **第十六章：存档与数据持久化** 中，我们将学习：

- Unity 中的数据持久化方案（PlayerPrefs、JSON、Binary）
- 设计可序列化的存档数据结构
- 实现自动保存和手动保存
- 保存和加载玩家进度（位置、背包、任务、装备）
- 存档文件加密和完整性校验
- 多存档槽位管理
- 云存档基础概念

掌握存档系统后，你的游戏将能够保存玩家的所有进度，让他们可以随时中断和继续游戏！
