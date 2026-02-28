# 第 08 章：动画系统与状态机

> **前端类比**：如果说 CSS Animations / Framer Motion 是前端的动画方案，那么 Unity 的 Animator Controller 就像是一个可视化的、基于有限状态机（FSM）的动画编排系统——远比 CSS keyframes 强大，但核心理念（关键帧、过渡、状态）是相通的。

---

## 本章目标

完成本章后，你将能够：

1. 理解 Animation 与 Animator 两个组件的区别与适用场景
2. 在 Animation 窗口中创建关键帧动画
3. 搭建 Animator Controller 状态机，管理多个动画状态及其过渡
4. 使用 Bool、Int、Float、Trigger 四种参数控制状态切换
5. 使用 Blend Tree 实现平滑的移动动画混合
6. 理解动画层（Layer）与遮罩（Avatar Mask）的用途
7. 区分 Root Motion 与脚本驱动移动的优劣
8. 通过 Animation Events 在动画关键帧调用脚本方法
9. 从 Mixamo 导入免费角色动画
10. 配置 Humanoid Avatar 与骨骼重定向
11. 完成一套完整的角色动画控制器（Idle / Walk / Run / Jump）

## 预计学习时间

**6 小时**（理论 2 小时 + 实操 4 小时）

---

## 8.1 动画系统全景：前端开发者视角

### 8.1.1 前端动画 vs Unity 动画

| 概念 | 前端（CSS/JS） | Unity |
|------|----------------|-------|
| 关键帧定义 | `@keyframes` / Framer Motion `variants` | Animation Clip（.anim 文件） |
| 动画播放器 | 浏览器渲染引擎 / JS 运行时 | Animation 组件 或 Animator 组件 |
| 状态管理 | 手动用 state 变量切换 class | Animator Controller 状态机（可视化编辑） |
| 过渡效果 | `transition` 属性 / `spring` 物理 | Transition 连线（可设置持续时间、曲线） |
| 骨骼动画 | 无原生支持 | Humanoid / Generic Rig + 骨骼重定向 |
| 混合动画 | 极难实现 | Blend Tree（一维/二维混合） |
| 事件回调 | `animationend` 事件 / `onComplete` | Animation Events（精确到某一帧） |

### 8.1.2 Animation vs Animator 组件

Unity 有两种动画组件，初学者经常混淆：

**Animation 组件（旧版）**：
- Unity 早期的动画系统（Legacy Animation System）
- 直接播放 AnimationClip，用代码控制 `Play()`、`CrossFade()`
- 类似前端直接调用 `element.animate()` API
- 适合简单动画（UI 元素、道具旋转）
- **不支持** Blend Tree、Layer 等高级功能

**Animator 组件（推荐）**：
- Unity 当前的主力动画系统（Mecanim）
- 基于 Animator Controller（状态机）驱动
- 类似前端的 XState 状态机 + CSS Animations 的结合
- 支持 Blend Tree、Layer、Avatar Mask、IK 等
- **角色动画必须使用 Animator**

> 💡 **前端类比**：Animation 组件像 jQuery 时代的 `.animate()`，Animator 组件像现代的 Framer Motion + XState——功能更强、架构更清晰。在新项目中，**始终优先使用 Animator**。

```
选择指南：
┌─────────────────────────────┐
│ 需要骨骼动画？              │
│   → 是 → Animator           │
│   → 否 →                    │
│     需要状态机管理？        │
│       → 是 → Animator       │
│       → 否 →                │
│         简单的属性动画？    │
│           → Animation 即可  │
└─────────────────────────────┘
```

---

## 8.2 Animation 窗口：创建关键帧动画

### 8.2.1 打开 Animation 窗口

1. 菜单栏 → `Window` → `Animation` → `Animation`（快捷键 `Cmd+6`）
2. 选中场景中的一个 GameObject
3. 点击 Animation 窗口中的 `Create` 按钮，保存 `.anim` 文件

[截图：Animation 窗口的完整界面，标注关键区域——属性列表（左侧）、时间轴（中上）、曲线编辑器（中下）、录制按钮（左上红色圆点）]

### 8.2.2 录制关键帧动画

我们以一个浮动道具（Floating Item）为例：

**步骤：**

1. 在场景中创建一个 Cube，命名为 `FloatingItem`
2. 选中 `FloatingItem`，在 Animation 窗口点击 `Create`
3. 保存为 `FloatingItem_Hover.anim`
4. Unity 会自动给 `FloatingItem` 添加 Animator 组件和 Animator Controller

[截图：新创建的 Animation Clip 在 Animation 窗口中的初始状态]

5. 点击录制按钮（红色圆点）进入录制模式
6. 在时间轴第 0 帧，确认 Position.y = 1
7. 将时间指针拖到第 30 帧，在 Inspector 中将 Position.y 改为 1.5
8. 将时间指针拖到第 60 帧，将 Position.y 改回 1
9. 点击录制按钮退出录制模式

[截图：录制完成后的 Animation 窗口，显示 Position.y 的关键帧曲线]

### 8.2.3 关键帧曲线编辑

Animation 窗口底部可以切换到 **Curves** 视图：

- **线性插值**：匀速变化（类似 CSS `linear`）
- **平滑曲线**：默认的贝塞尔曲线（类似 CSS `ease`）
- **常量**：不插值，直接跳变（类似 CSS `steps(1)`）

```
曲线模式对比：
                   ╭──────╮
平滑（默认）：   ╱          ╲        ← 类似 ease-in-out
                ╱              ╲
───────────────╱                ╲───────

              /|
线性：       / |                 ← 类似 linear
            /  |
───────────/   |────────────────

               ┌───┐
常量：         │   │             ← 类似 steps(1)
───────────────┘   └────────────
```

右键点击关键帧可以选择切线模式：
- `Auto`：自动平滑
- `Free Smooth`：自由平滑
- `Flat`：水平切线
- `Broken`：可独立调整左右切线

[截图：曲线编辑器中不同切线模式的效果对比]

### 8.2.4 动画属性类型

在 Animation 窗口中可以动画化的属性：

| 属性类型 | 示例 | 前端等价 |
|----------|------|----------|
| Transform | Position, Rotation, Scale | `transform: translate/rotate/scale` |
| 材质属性 | Color, Emission | `background-color`, `opacity` |
| 组件启用 | enabled (bool) | `display: none/block` |
| 自定义脚本字段 | 任何 public 或 [SerializeField] 字段 | CSS 自定义属性 `--var` |

> ⚠️ **注意**：Animation 窗口只能动画化 **当前选中 GameObject 及其子物体** 的属性。如果要动画化其他 GameObject，需要确保它是子物体，或使用代码控制。

---

## 8.3 Animator Controller：可视化状态机

### 8.3.1 创建 Animator Controller

1. 在 Project 窗口右键 → `Create` → `Animator Controller`
2. 命名为 `PlayerAnimatorController`
3. 双击打开 Animator 窗口

[截图：空的 Animator Controller 窗口，显示 Entry、Any State、Exit 三个默认节点]

### 8.3.2 状态机核心概念

```
Animator Controller 状态机结构：

    ┌─────────┐
    │  Entry   │──────→ 默认状态（橙色）
    └─────────┘
         │
         ▼
    ┌─────────┐    条件满足     ┌─────────┐
    │  Idle   │ ──────────→  │  Walk   │
    │ (橙色)   │ ←──────────  │ (灰色)   │
    └─────────┘    条件满足     └─────────┘
         │                         │
         │    ┌──────────┐         │
         └──→ │  Jump    │ ←───────┘
              │ (灰色)    │
              └──────────┘
                   │
    ┌─────────┐    │
    │Any State│────┘  （Any State 可从任意状态跳转）
    └─────────┘
```

**关键节点：**

| 节点 | 说明 | 前端类比 |
|------|------|----------|
| Entry | 状态机入口，连接到默认状态 | React 组件的初始 state |
| Any State | 从任何状态都可以触发的过渡 | 全局事件监听器 |
| Exit | 退出当前状态机层（多层时使用） | 组件 unmount |
| 状态（State） | 播放一个 Animation Clip | 一个 UI 状态（如 loading/success/error） |
| 子状态机（Sub-State Machine） | 嵌套的状态机 | 嵌套的 Reducer |

### 8.3.3 添加动画状态

1. 将 Animation Clip 文件从 Project 窗口拖入 Animator 窗口
2. 或者右键 → `Create State` → `Empty`，然后在 Inspector 中设置 Motion

[截图：向 Animator Controller 中拖入多个动画状态后的效果]

**设置默认状态：**
- 右键一个状态 → `Set as Layer Default State`
- 默认状态显示为 **橙色**

### 8.3.4 创建过渡（Transition）

1. 右键一个状态 → `Make Transition`
2. 点击目标状态完成连线
3. 点击过渡箭头，在 Inspector 中设置条件

[截图：两个状态之间的过渡箭头，以及 Inspector 中的过渡设置面板]

**过渡属性详解：**

```
Inspector - Transition 设置面板：

┌─────────────────────────────────────┐
│ Has Exit Time: ☑                    │  ← 是否等待当前动画播放到某个时间点再过渡
│ Exit Time: 0.75                     │  ← 在动画播放到 75% 时开始过渡
│                                     │
│ Transition Duration: 0.25           │  ← 过渡混合持续时间（秒或归一化）
│ Transition Offset: 0                │  ← 目标动画从哪个时间点开始播放
│                                     │
│ Interruption Source: None           │  ← 过渡是否可被打断
│ Ordered Interruption: ☑             │
│                                     │
│ Conditions:                         │
│   [Speed] [Greater] [0.1]           │  ← 过渡触发条件
│   [+ Add Condition]                 │
└─────────────────────────────────────┘
```

> 💡 **前端类比**：`Has Exit Time` 类似 CSS `animation-fill-mode`——决定动画是否必须播完才能切换。`Transition Duration` 就像 CSS `transition-duration`。

---

## 8.4 动画参数与过渡条件

### 8.4.1 四种参数类型

在 Animator 窗口左侧的 `Parameters` 标签中添加参数：

| 参数类型 | 用途 | 前端类比 |
|----------|------|----------|
| `Float` | 连续值（速度、方向） | `useState<number>` |
| `Int` | 整数值（武器 ID、状态编号） | `useState<number>` |
| `Bool` | 布尔开关（是否在地面、是否战斗） | `useState&lt;boolean&gt;` |
| `Trigger` | 一次性信号（跳跃、攻击），触发后自动重置 | 一次性事件 `dispatch('jump')` |

[截图：Animator 窗口的 Parameters 面板，展示四种参数类型]

### 8.4.2 设置过渡条件

点击过渡箭头，在 Inspector 的 `Conditions` 区域：

**示例：Idle → Walk 的条件**
- 参数：`Speed`（Float）
- 条件：`Greater than 0.1`

**示例：Walk → Idle 的条件**
- 参数：`Speed`（Float）
- 条件：`Less than 0.1`

**示例：Any State → Jump 的条件**
- 参数：`JumpTrigger`（Trigger）

### 8.4.3 在代码中控制参数

```csharp
using UnityEngine;

/// <summary>
/// 演示如何通过代码设置 Animator 参数
/// 类比前端：类似在 React 中通过 setState 更新 UI 状态
/// </summary>
public class AnimatorParameterDemo : MonoBehaviour
{
    // Animator 组件引用
    private Animator animator;

    void Start()
    {
        // 获取 Animator 组件
        animator = GetComponent<Animator>();
    }

    void Update()
    {
        // 设置 Float 参数——角色当前速度
        float speed = GetComponent<CharacterController>().velocity.magnitude;
        animator.SetFloat("Speed", speed);

        // 设置 Bool 参数——是否在地面
        bool grounded = GetComponent<CharacterController>().isGrounded;
        animator.SetBool("IsGrounded", grounded);

        // 设置 Int 参数——当前武器类型
        // animator.SetInteger("WeaponType", currentWeaponId);

        // 触发 Trigger 参数——跳跃（一次性）
        if (Input.GetKeyDown(KeyCode.Space))
        {
            animator.SetTrigger("JumpTrigger");
        }

        // 读取参数值
        float currentSpeed = animator.GetFloat("Speed");
        bool isGrounded = animator.GetBool("IsGrounded");
    }
}
```

### 8.4.4 使用字符串哈希优化性能

每次用字符串查找参数会有微小的性能开销。对于频繁调用的参数，使用哈希值：

```csharp
using UnityEngine;

/// <summary>
/// 使用参数哈希值优化 Animator 参数访问
/// 类比前端：类似用 Map 代替频繁的 object[key] 查找
/// </summary>
public class AnimatorHashDemo : MonoBehaviour
{
    private Animator animator;

    // 预计算参数的哈希值（在类加载时执行，只计算一次）
    // 类比：const SPEED_KEY = Symbol('Speed')
    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
    private static readonly int JumpTriggerHash = Animator.StringToHash("JumpTrigger");

    void Start()
    {
        animator = GetComponent<Animator>();
    }

    void Update()
    {
        // 使用哈希值设置参数，避免字符串查找开销
        animator.SetFloat(SpeedHash, 5.0f);
        animator.SetBool(IsGroundedHash, true);
        animator.SetTrigger(JumpTriggerHash);
    }
}
```

> 🎯 **最佳实践**：养成使用 `Animator.StringToHash()` 的习惯。虽然在小项目中性能差异不明显，但在移动端和复杂场景中会有可观的提升。

---

## 8.5 Blend Tree：动画混合

### 8.5.1 什么是 Blend Tree

Blend Tree 允许根据参数值**平滑混合**多个动画。最常见的用途：根据移动速度混合 Idle / Walk / Run 动画。

```
Blend Tree 原理示意：

Speed = 0       Speed = 0.5     Speed = 1
├───────────────┼───────────────┤
│    Idle       │    Walk       │    Run
│   100%        │   100%        │   100%

Speed = 0.25 时：
  Idle 50% + Walk 50%（自动插值混合）

Speed = 0.75 时：
  Walk 50% + Run 50%（自动插值混合）
```

> 💡 **前端类比**：Blend Tree 类似 CSS 的 `mix-blend-mode` 或 Framer Motion 的 `useTransform`——根据一个连续值在多个状态之间平滑过渡，而不是硬切换。

### 8.5.2 创建一维 Blend Tree

1. 在 Animator 窗口右键 → `Create State` → `From New Blend Tree`
2. 双击进入 Blend Tree 编辑器
3. 在 Inspector 中设置 Blend Type 为 `1D`
4. 设置参数为 `Speed`（Float）

[截图：一维 Blend Tree 的 Inspector 设置界面]

5. 点击 `+` 号添加 Motion：
   - Threshold 0：Idle 动画
   - Threshold 0.5：Walk 动画
   - Threshold 1：Run 动画

[截图：配置好的一维 Blend Tree，显示三个动画的混合图]

### 8.5.3 创建二维 Blend Tree

二维 Blend Tree 使用两个参数，适合方向性运动：

1. Blend Type 选择 `2D Freeform Directional`
2. 参数设置为 `VelocityX` 和 `VelocityZ`

```
二维 Blend Tree 布局示意：

          Forward (0,1)
              │
              │
  Left ───────┼─────── Right
 (-1,0)       │        (1,0)
              │
          Backward (0,-1)

每个位置放置对应方向的动画：
  中心 (0,0) = Idle
  上   (0,1) = Walk Forward
  右   (1,0) = Walk Right
  下   (0,-1) = Walk Backward
  左   (-1,0) = Walk Left
```

[截图：二维 Blend Tree 的可视化混合空间，显示各个动画在 2D 平面上的位置]

### 8.5.4 Blend Tree 类型对比

| 类型 | 参数数量 | 用途 | 示例 |
|------|----------|------|------|
| 1D | 1 个 Float | 单轴混合 | Speed: Idle→Walk→Run |
| 2D Simple Directional | 2 个 Float | 简单方向 | 四方向走路 |
| 2D Freeform Directional | 2 个 Float | 自由方向 | 八方向走路（推荐） |
| 2D Freeform Cartesian | 2 个 Float | 笛卡尔坐标 | Speed + Turn 的组合 |
| Direct | 多个 Float | 直接控制权重 | 面部表情混合 |

---

## 8.6 动画层（Layers）与遮罩（Avatar Mask）

### 8.6.1 为什么需要动画层

想象这样的场景：角色一边跑步一边挥剑。下半身播放跑步动画，上半身播放攻击动画。这就需要**动画层**。

```
动画层工作原理：

Layer 0（Base Layer）: 全身运动动画（Idle, Walk, Run）
    ↓ 混合
Layer 1（Upper Body）: 上半身动作（Attack, Cast Spell）
    ↓ 混合
Layer 2（Face）: 面部表情（Smile, Angry）
    ↓
最终动画输出
```

> 💡 **前端类比**：动画层类似 CSS 中用多个 `animation` 叠加在同一元素上：`animation: walk 1s, attack 0.5s`。每一层负责身体不同部位。

### 8.6.2 创建动画层

1. 在 Animator 窗口切换到 `Layers` 标签
2. 点击 `+` 按钮添加新层
3. 设置层的属性

[截图：Animator Layers 面板，显示 Base Layer 和 Upper Body Layer]

**层属性：**

| 属性 | 说明 |
|------|------|
| Weight | 层的权重（0-1），0 = 完全不影响，1 = 完全覆盖 |
| Mask | Avatar Mask，指定这一层影响哪些骨骼 |
| Blending | Override（覆盖）或 Additive（叠加） |
| Sync | 是否同步到其他层 |
| IK Pass | 是否启用 IK（反向运动学） |

### 8.6.3 创建 Avatar Mask

1. 在 Project 窗口右键 → `Create` → `Avatar Mask`
2. 命名为 `UpperBodyMask`
3. 在 Inspector 中：
   - Humanoid 视图：点击身体部位来启用/禁用
   - 绿色 = 受此层影响
   - 红色 = 不受此层影响

[截图：Avatar Mask Inspector，人体图上上半身为绿色，下半身为红色]

4. 将此 Mask 赋值给 Animator Layer 的 `Mask` 字段

### 8.6.4 层混合模式

**Override（覆盖）模式**：
- 上层动画直接替换下层动画
- 适用于：攻击动作覆盖上半身

**Additive（叠加）模式**：
- 上层动画叠加到下层动画之上
- 适用于：呼吸动画叠加到其他动画

```csharp
using UnityEngine;

/// <summary>
/// 动态控制动画层权重
/// 例如：进入战斗状态时启用上半身攻击层
/// </summary>
public class AnimationLayerController : MonoBehaviour
{
    private Animator animator;

    // 上半身层的索引（第二层，索引为 1）
    private int upperBodyLayerIndex = 1;

    void Start()
    {
        animator = GetComponent<Animator>();
    }

    /// <summary>
    /// 进入战斗模式——启用上半身攻击层
    /// </summary>
    public void EnterCombatMode()
    {
        // 平滑过渡层权重到 1（完全启用）
        StartCoroutine(FadeLayerWeight(upperBodyLayerIndex, 1f, 0.3f));
    }

    /// <summary>
    /// 退出战斗模式——禁用上半身攻击层
    /// </summary>
    public void ExitCombatMode()
    {
        // 平滑过渡层权重到 0（完全禁用）
        StartCoroutine(FadeLayerWeight(upperBodyLayerIndex, 0f, 0.3f));
    }

    /// <summary>
    /// 平滑过渡动画层权重的协程
    /// </summary>
    private System.Collections.IEnumerator FadeLayerWeight(
        int layerIndex, float targetWeight, float duration)
    {
        float startWeight = animator.GetLayerWeight(layerIndex);
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            // 使用线性插值平滑过渡
            float weight = Mathf.Lerp(startWeight, targetWeight, t);
            animator.SetLayerWeight(layerIndex, weight);
            yield return null; // 等待下一帧
        }

        // 确保最终值精确
        animator.SetLayerWeight(layerIndex, targetWeight);
    }
}
```

---

## 8.7 Root Motion vs 脚本驱动移动

### 8.7.1 两种移动方式对比

| 方面 | Root Motion | 脚本驱动移动 |
|------|-------------|-------------|
| 移动由谁控制 | 动画本身包含位移数据 | 代码中设置 velocity/position |
| 动画匹配度 | 完美匹配（脚不会滑动） | 需要手动调节速度参数 |
| 程序控制灵活性 | 较低 | 非常高 |
| 适用场景 | 写实角色、过场动画 | 游戏性优先的角色控制 |
| 前端类比 | CSS `animation` 直接控制 `transform` | JS 控制 `transform`，CSS 只做视觉效果 |

### 8.7.2 启用/禁用 Root Motion

在 Animator 组件的 Inspector 中：

- **Apply Root Motion** ☑：动画中的位移会应用到 GameObject 的 Transform
- **Apply Root Motion** ☐：动画只播放视觉效果，位移由代码控制

[截图：Animator 组件 Inspector 面板，标注 Apply Root Motion 复选框]

### 8.7.3 使用 OnAnimatorMove 自定义 Root Motion

```csharp
using UnityEngine;

/// <summary>
/// 自定义 Root Motion 处理
/// 当你需要部分使用动画位移、部分使用代码控制时
/// </summary>
public class CustomRootMotion : MonoBehaviour
{
    private Animator animator;
    private CharacterController characterController;

    // Root Motion 的影响程度（0 = 纯代码控制，1 = 纯动画控制）
    [Range(0f, 1f)]
    public float rootMotionWeight = 1f;

    void Start()
    {
        animator = GetComponent<Animator>();
        characterController = GetComponent<CharacterController>();
    }

    /// <summary>
    /// Unity 回调：在 Animator 计算完 Root Motion 后调用
    /// 类比前端：类似 requestAnimationFrame 中的回调
    /// </summary>
    void OnAnimatorMove()
    {
        // animator.deltaPosition 是这一帧动画产生的位移
        // animator.deltaRotation 是这一帧动画产生的旋转

        // 将动画位移应用到 CharacterController
        Vector3 movement = animator.deltaPosition * rootMotionWeight;
        characterController.Move(movement);

        // 应用旋转
        transform.rotation *= animator.deltaRotation;
    }
}
```

> 🎯 **最佳实践**：对于开放世界手游，**推荐脚本驱动移动**。因为：
> 1. 游戏性优先——需要精确控制角色速度和方向
> 2. 网络同步更简单——只需同步位置和输入
> 3. 更灵活——可以根据地形、Buff 等动态调整速度
>
> Root Motion 适合过场动画、特殊技能动作等需要动画精确控制位置的场景。

---

## 8.8 Animation Events：动画事件

### 8.8.1 概念

Animation Events 允许在动画的**特定帧**触发脚本方法。比如：

- 角色挥剑到最快的那一帧 → 触发伤害判定
- 脚踩到地面的那一帧 → 播放脚步声
- 施法动画到释放点 → 生成特效

> 💡 **前端类比**：类似 Lottie 动画的 `onEnterFrame` 回调，或者 GSAP 的 `onUpdate` 中检查时间点。

### 8.8.2 在 Animation 窗口中添加事件

1. 在 Animation 窗口中选中目标动画
2. 将时间指针移动到目标帧
3. 点击 `Add Event` 按钮（时间轴上方的小旗帜图标）
4. 在 Inspector 中设置要调用的方法名

[截图：Animation 窗口中添加了多个 Animation Event 的时间轴，标注事件图标]

### 8.8.3 代码中接收 Animation Event

```csharp
using UnityEngine;

/// <summary>
/// 接收 Animation Events 的脚本
/// 必须挂载在 Animator 组件所在的同一个 GameObject 上
/// </summary>
public class AnimationEventReceiver : MonoBehaviour
{
    [Header("脚步声音效")]
    public AudioClip footstepSound;

    [Header("攻击特效预制体")]
    public GameObject attackEffectPrefab;

    [Header("攻击判定点")]
    public Transform attackPoint;

    private AudioSource audioSource;

    void Start()
    {
        audioSource = GetComponent<AudioSource>();
    }

    /// <summary>
    /// 脚步声事件——在走路/跑步动画中每只脚落地时触发
    /// Animation Event 中设置 Function 为 "OnFootstep"
    /// </summary>
    public void OnFootstep()
    {
        if (footstepSound != null && audioSource != null)
        {
            // 随机音量和音调，避免重复感
            audioSource.pitch = Random.Range(0.9f, 1.1f);
            audioSource.PlayOneShot(footstepSound, Random.Range(0.7f, 1.0f));
        }
    }

    /// <summary>
    /// 攻击伤害判定事件——在攻击动画挥到最猛的帧触发
    /// Animation Event 中设置 Function 为 "OnAttackHit"
    /// </summary>
    public void OnAttackHit()
    {
        // 在攻击点范围内检测敌人
        float attackRadius = 1.5f;
        Collider[] hitEnemies = Physics.OverlapSphere(
            attackPoint.position, attackRadius);

        foreach (Collider enemy in hitEnemies)
        {
            // 如果碰到的是敌人，施加伤害
            if (enemy.CompareTag("Enemy"))
            {
                Debug.Log($"命中敌人: {enemy.name}");
                // enemy.GetComponent<Health>()?.TakeDamage(25);
            }
        }
    }

    /// <summary>
    /// 攻击特效事件——在适当的帧生成视觉特效
    /// </summary>
    public void OnAttackEffect()
    {
        if (attackEffectPrefab != null && attackPoint != null)
        {
            Instantiate(attackEffectPrefab,
                attackPoint.position,
                attackPoint.rotation);
        }
    }

    /// <summary>
    /// Animation Event 也可以接收参数
    /// 支持的参数类型：float, int, string, Object
    /// </summary>
    public void OnAnimationEvent(string eventName)
    {
        Debug.Log($"动画事件触发: {eventName}");
    }
}
```

> ⚠️ **注意**：Animation Event 调用的方法**必须**在 Animator 所在 GameObject 上的某个 MonoBehaviour 中定义。如果方法名拼写错误，Unity 不会报编译错误，只会在运行时输出警告。

---

## 8.9 从 Mixamo 导入动画

### 8.9.1 Mixamo 简介

[Mixamo](https://www.mixamo.com/) 是 Adobe 提供的免费 3D 角色和动画库。对于独立开发者来说，这是获取高质量角色动画的最佳免费途径。

### 8.9.2 下载角色和动画

**步骤 1：获取角色模型**
1. 访问 [mixamo.com](https://www.mixamo.com/)，用 Adobe 账号登录
2. 点击 `Characters` 标签，选择一个角色（如 Y Bot）
3. 点击 `Download`，设置：
   - Format: `FBX for Unity (.fbx)`
   - Pose: `T-Pose`
4. 下载保存

[截图：Mixamo 网站角色选择页面和下载设置]

**步骤 2：下载动画**
1. 切换到 `Animations` 标签
2. 搜索需要的动画（如 "Idle"、"Walking"、"Running"、"Jumping"）
3. 预览并调整参数（速度、手臂间距等）
4. 下载设置：
   - Format: `FBX for Unity (.fbx)`
   - Skin: `Without Skin`（如果角色已单独下载）
   - Frames per Second: `30`
   - Keyframe Reduction: `none`

[截图：Mixamo 动画下载设置面板]

### 8.9.3 导入到 Unity

**步骤 1：放入项目**
1. 在 Unity Project 窗口创建文件夹：`Assets/Characters/YBot/`
2. 将下载的 FBX 文件拖入此文件夹

**步骤 2：设置角色模型**
1. 选中角色模型的 FBX 文件
2. 在 Inspector 中切换到 `Rig` 标签
3. 设置 Animation Type 为 `Humanoid`
4. 点击 `Configure...` 检查骨骼映射
5. 确认所有骨骼正确映射后，点击 `Done`
6. 点击 `Apply`

[截图：FBX 导入设置的 Rig 标签页，Animation Type 设为 Humanoid]

**步骤 3：设置动画剪辑**
1. 选中动画 FBX 文件
2. 在 Inspector 的 `Rig` 标签中：
   - Animation Type: `Humanoid`
   - Avatar Definition: `Copy From Other Avatar`
   - Source: 选择角色模型的 Avatar
3. 切换到 `Animation` 标签：
   - 勾选/取消 `Loop Time`（Idle、Walk、Run 需要循环，Jump 不需要）
   - 调整动画裁剪范围
4. 点击 `Apply`

[截图：动画 FBX 的 Animation 标签设置，标注 Loop Time 和裁剪范围]

---

## 8.10 Avatar 与 Humanoid Rig

### 8.10.1 什么是 Avatar

Avatar 是 Unity 中描述骨骼结构和肌肉系统的资产。它让不同骨骼结构的模型可以共享动画。

```
Avatar 骨骼重定向原理：

角色 A 的骨骼          Avatar（标准骨骼映射）       角色 B 的骨骼
Bip001_Spine   ────→   Spine            ←────   spine_01
Bip001_L_Arm   ────→   Left Upper Arm   ←────   arm_L_upper
Bip001_R_Hand  ────→   Right Hand       ←────   hand_R
    ...                    ...                      ...

结果：角色 A 的动画可以用在角色 B 上！
```

### 8.10.2 Rig 类型对比

| Rig 类型 | 说明 | 用途 |
|----------|------|------|
| None | 无骨骼 | 静态模型 |
| Legacy | 旧版骨骼系统 | 兼容旧项目 |
| Generic | 通用骨骼 | 非人形角色（龙、狗等） |
| Humanoid | 人形骨骼 | 人形角色（自动骨骼映射和 IK） |

### 8.10.3 配置 Humanoid Avatar

1. 选中角色模型 FBX
2. Inspector → `Rig` → Animation Type: `Humanoid`
3. 点击 `Configure...`

[截图：Avatar Configuration 界面，显示人体骨骼映射图]

**骨骼映射规则：**
- **实线圆圈**：必须映射（Required）
- **虚线圆圈**：可选映射（Optional）
- **绿色**：已正确映射
- **红色**：映射错误或缺失

**常见骨骼：**
| Unity 骨骼名 | 说明 | 是否必须 |
|-------------|------|----------|
| Hips | 臀部（根骨骼） | 必须 |
| Spine | 脊柱 | 必须 |
| Head | 头部 | 必须 |
| LeftUpperArm | 左上臂 | 必须 |
| LeftHand | 左手 | 必须 |
| LeftUpperLeg | 左大腿 | 必须 |
| LeftFoot | 左脚 | 必须 |
| LeftToes | 左脚趾 | 可选 |
| LeftEye | 左眼 | 可选 |

> 🎯 **最佳实践**：使用 Humanoid Rig 的最大好处是**动画复用**。从 Mixamo 下载的动画可以用在任何 Humanoid 角色上，无需重新制作。

---

## 8.11 完整实战：角色动画控制器

### 8.11.1 项目结构

```
Assets/
├── Characters/
│   └── Player/
│       ├── Models/
│       │   └── PlayerModel.fbx        ← Mixamo 角色模型
│       ├── Animations/
│       │   ├── Idle.fbx               ← Mixamo 待机动画
│       │   ├── Walk.fbx               ← Mixamo 走路动画
│       │   ├── Run.fbx                ← Mixamo 跑步动画
│       │   ├── Jump.fbx               ← Mixamo 跳跃动画
│       │   └── Fall.fbx               ← Mixamo 下落动画
│       └── AnimatorControllers/
│           └── PlayerAnimatorController.controller
├── Scripts/
│   └── Player/
│       ├── PlayerMovement.cs          ← 角色移动（上一章）
│       └── PlayerAnimator.cs          ← 角色动画控制器
```

### 8.11.2 搭建 Animator Controller

**步骤 1：创建参数**

在 Animator 窗口的 Parameters 标签中添加：

| 参数名 | 类型 | 默认值 | 用途 |
|--------|------|--------|------|
| Speed | Float | 0 | 当前移动速度（归一化） |
| IsGrounded | Bool | true | 是否在地面 |
| JumpTrigger | Trigger | — | 触发跳跃 |
| IsFalling | Bool | false | 是否在下落 |
| VerticalVelocity | Float | 0 | 垂直速度 |

[截图：Animator Parameters 面板，显示上述所有参数]

**步骤 2：创建 Blend Tree（地面运动）**

1. 右键 → `Create State` → `From New Blend Tree`
2. 命名为 `Locomotion`
3. 双击进入，设置：
   - Blend Type: `1D`
   - Parameter: `Speed`
   - 添加 Motion：
     - Threshold 0: Idle
     - Threshold 0.5: Walk
     - Threshold 1: Run

[截图：Locomotion Blend Tree 的完整配置]

**步骤 3：创建其他状态**

| 状态名 | Motion | 循环 |
|--------|--------|------|
| Jump | Jump 动画 | 不循环 |
| Fall | Fall 动画 | 循环 |
| Land | Land 动画 | 不循环 |

**步骤 4：创建过渡**

```
完整状态机连线图：

                    ┌──────────────────────┐
                    │      Locomotion      │ ← 默认状态（橙色）
                    │  (Blend Tree: I/W/R) │
                    └──────┬───────────────┘
                           │
              JumpTrigger  │  IsGrounded=true
              & IsGrounded │
                    ┌──────▼───────┐
                    │    Jump      │
                    └──────┬───────┘
                           │
                 IsFalling │
                    ┌──────▼───────┐
                    │    Fall      │
                    └──────┬───────┘
                           │
               IsGrounded  │
                =true      │
                    ┌──────▼───────┐
                    │    Land      │
                    └──────┬───────┘
                           │
                    Exit Time │ (动画播完)
                           │
                    回到 Locomotion
```

**过渡详细设置：**

| 过渡 | Has Exit Time | Exit Time | Duration | 条件 |
|------|:---:|:---:|:---:|------|
| Locomotion → Jump | 否 | — | 0.1s | JumpTrigger |
| Jump → Fall | 是 | 0.8 | 0.2s | IsFalling = true |
| Fall → Land | 否 | — | 0.1s | IsGrounded = true |
| Land → Locomotion | 是 | 0.9 | 0.1s | （无条件，播完自动过渡） |
| Locomotion → Fall | 否 | — | 0.2s | IsGrounded = false, IsFalling = true |

[截图：完成所有连线后的 Animator Controller 全貌]

### 8.11.3 PlayerAnimator.cs 完整代码

```csharp
using UnityEngine;

/// <summary>
/// 角色动画控制器
/// 负责将角色的运动状态同步到 Animator 参数
///
/// 类比前端：类似一个 "状态同步中间件"，
/// 监听角色运动数据（Redux Store），映射到动画系统（UI 渲染）
///
/// 使用方式：挂载到角色 GameObject 上，与 PlayerMovement 配合使用
/// </summary>
[RequireComponent(typeof(Animator))]
public class PlayerAnimator : MonoBehaviour
{
    #region 组件引用

    private Animator animator;
    private CharacterController characterController;

    #endregion

    #region Animator 参数哈希（预计算，避免字符串查找）

    // 使用 static readonly 确保只计算一次
    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
    private static readonly int JumpTriggerHash = Animator.StringToHash("JumpTrigger");
    private static readonly int IsFallingHash = Animator.StringToHash("IsFalling");
    private static readonly int VerticalVelocityHash = Animator.StringToHash("VerticalVelocity");

    #endregion

    #region 配置参数

    [Header("动画平滑设置")]
    [Tooltip("速度参数的平滑时间（秒），避免动画突变")]
    [SerializeField] private float speedSmoothTime = 0.1f;

    [Tooltip("下落判定的垂直速度阈值")]
    [SerializeField] private float fallThreshold = -2f;

    [Header("移动速度映射")]
    [Tooltip("走路速度（用于归一化 Speed 参数）")]
    [SerializeField] private float walkSpeed = 2f;

    [Tooltip("跑步速度（用于归一化 Speed 参数）")]
    [SerializeField] private float runSpeed = 6f;

    #endregion

    #region 运行时状态

    // 当前平滑后的速度值
    private float currentSpeed;
    // 速度平滑的参考速度（SmoothDamp 需要）
    private float speedSmoothVelocity;
    // 上一帧是否在地面（用于检测着陆）
    private bool wasGrounded;

    #endregion

    #region 生命周期方法

    /// <summary>
    /// 初始化——获取必要的组件引用
    /// </summary>
    void Start()
    {
        // 获取 Animator 组件
        animator = GetComponent<Animator>();
        if (animator == null)
        {
            Debug.LogError("[PlayerAnimator] 未找到 Animator 组件！");
            enabled = false;
            return;
        }

        // 获取 CharacterController 组件
        characterController = GetComponent<CharacterController>();
        if (characterController == null)
        {
            Debug.LogError("[PlayerAnimator] 未找到 CharacterController 组件！");
            enabled = false;
            return;
        }

        // 初始化状态
        wasGrounded = true;
    }

    /// <summary>
    /// 每帧更新动画参数
    /// 在 Update 中调用（而非 FixedUpdate），因为动画系统在 Update 中更新
    /// </summary>
    void Update()
    {
        UpdateLocomotion();
        UpdateGroundedState();
        UpdateFallingState();
    }

    #endregion

    #region 动画更新逻辑

    /// <summary>
    /// 更新地面运动动画（Idle / Walk / Run 的 Blend Tree）
    /// </summary>
    private void UpdateLocomotion()
    {
        // 获取水平速度（忽略垂直分量）
        Vector3 horizontalVelocity = characterController.velocity;
        horizontalVelocity.y = 0f;
        float rawSpeed = horizontalVelocity.magnitude;

        // 将速度归一化到 0-1 范围
        // 0 = 静止, 0.5 = 走路速度, 1 = 跑步速度
        float targetSpeed = Mathf.InverseLerp(0f, runSpeed, rawSpeed);

        // 使用 SmoothDamp 平滑速度变化，避免动画突变
        // 类比前端：类似 CSS transition 或 React Spring 的缓动效果
        currentSpeed = Mathf.SmoothDamp(
            currentSpeed,           // 当前值
            targetSpeed,            // 目标值
            ref speedSmoothVelocity, // 平滑速度（引用参数，SmoothDamp 内部更新）
            speedSmoothTime         // 平滑时间
        );

        // 设置 Animator 参数
        animator.SetFloat(SpeedHash, currentSpeed);
    }

    /// <summary>
    /// 更新地面状态参数
    /// </summary>
    private void UpdateGroundedState()
    {
        bool isGrounded = characterController.isGrounded;

        // 设置 IsGrounded 参数
        animator.SetBool(IsGroundedHash, isGrounded);

        // 检测刚落地的瞬间（用于触发落地动画或音效）
        if (isGrounded && !wasGrounded)
        {
            OnLanded();
        }

        // 保存当前帧的地面状态，用于下一帧比较
        wasGrounded = isGrounded;
    }

    /// <summary>
    /// 更新下落状态
    /// </summary>
    private void UpdateFallingState()
    {
        float verticalVelocity = characterController.velocity.y;

        // 设置垂直速度参数（可用于控制下落动画的强度）
        animator.SetFloat(VerticalVelocityHash, verticalVelocity);

        // 当垂直速度低于阈值且不在地面时，判定为下落状态
        bool isFalling = verticalVelocity < fallThreshold
                         && !characterController.isGrounded;
        animator.SetBool(IsFallingHash, isFalling);
    }

    #endregion

    #region 公共方法（供其他脚本调用）

    /// <summary>
    /// 触发跳跃动画
    /// 由 PlayerMovement 脚本在检测到跳跃输入时调用
    /// </summary>
    public void TriggerJump()
    {
        animator.SetTrigger(JumpTriggerHash);
    }

    /// <summary>
    /// 播放攻击动画
    /// </summary>
    /// <param name="attackIndex">攻击类型索引（用于连招系统）</param>
    public void TriggerAttack(int attackIndex = 0)
    {
        // 如果有攻击动画层，可以在这里设置
        animator.SetTrigger("AttackTrigger");
        animator.SetInteger("AttackIndex", attackIndex);
    }

    /// <summary>
    /// 获取当前动画状态信息（用于调试或游戏逻辑判断）
    /// </summary>
    /// <returns>当前基础层状态的归一化时间（0-1）</returns>
    public float GetCurrentAnimationProgress()
    {
        AnimatorStateInfo stateInfo = animator.GetCurrentAnimatorStateInfo(0);
        return stateInfo.normalizedTime % 1f; // 取余处理循环动画
    }

    /// <summary>
    /// 检查当前是否在播放指定状态的动画
    /// </summary>
    /// <param name="stateName">状态名（如 "Jump"、"Attack"）</param>
    /// <returns>是否正在播放该状态</returns>
    public bool IsPlayingState(string stateName)
    {
        AnimatorStateInfo stateInfo = animator.GetCurrentAnimatorStateInfo(0);
        return stateInfo.IsName(stateName);
    }

    /// <summary>
    /// 检查当前是否正在过渡中
    /// </summary>
    /// <returns>是否正在动画过渡</returns>
    public bool IsInTransition()
    {
        return animator.IsInTransition(0);
    }

    #endregion

    #region 私有方法

    /// <summary>
    /// 角色落地时的回调
    /// </summary>
    private void OnLanded()
    {
        Debug.Log("[PlayerAnimator] 角色落地");
        // 可以在这里：
        // 1. 播放落地音效
        // 2. 生成灰尘粒子效果
        // 3. 根据下落速度判断是否受到摔落伤害
    }

    #endregion

    #region Animation Event 回调方法

    /// <summary>
    /// 脚步声动画事件回调
    /// 在 Walk/Run 动画中，每只脚落地的帧添加 Animation Event
    /// </summary>
    public void OnFootstep()
    {
        // 播放脚步声（与 AudioManager 配合，详见第 10 章）
        // AudioManager.Instance.PlaySFX("Footstep");
        Debug.Log("[PlayerAnimator] 脚步声");
    }

    /// <summary>
    /// 跳跃起跳力应用事件
    /// 在跳跃动画中适当的帧调用
    /// </summary>
    public void OnJumpApplyForce()
    {
        Debug.Log("[PlayerAnimator] 跳跃力应用");
    }

    /// <summary>
    /// 攻击判定事件
    /// 在攻击动画中挥击最猛的帧调用
    /// </summary>
    public void OnAttackHit()
    {
        Debug.Log("[PlayerAnimator] 攻击判定");
    }

    #endregion

    #region 调试

    /// <summary>
    /// 在 Scene 视图中绘制调试信息
    /// </summary>
    void OnGUI()
    {
        if (!Application.isPlaying) return;

        // 在屏幕左上角显示动画调试信息
        #if UNITY_EDITOR
        GUILayout.BeginArea(new Rect(10, 10, 300, 200));
        GUILayout.Label($"Speed: {currentSpeed:F2}");
        GUILayout.Label($"Grounded: {characterController.isGrounded}");
        GUILayout.Label($"V Velocity: {characterController.velocity.y:F2}");

        AnimatorStateInfo state = animator.GetCurrentAnimatorStateInfo(0);
        GUILayout.Label($"State: {GetCurrentStateName()}");
        GUILayout.Label($"Progress: {state.normalizedTime % 1f:P0}");
        GUILayout.EndArea();
        #endif
    }

    /// <summary>
    /// 获取当前动画状态名（调试用）
    /// 注意：Animator 没有直接获取状态名的 API，需要逐个检查
    /// </summary>
    private string GetCurrentStateName()
    {
        AnimatorStateInfo state = animator.GetCurrentAnimatorStateInfo(0);

        if (state.IsName("Locomotion")) return "Locomotion";
        if (state.IsName("Jump")) return "Jump";
        if (state.IsName("Fall")) return "Fall";
        if (state.IsName("Land")) return "Land";

        return "Unknown";
    }

    #endregion
}
```

### 8.11.4 在 PlayerMovement 中集成动画

```csharp
using UnityEngine;

/// <summary>
/// 角色移动控制器（整合动画系统版本）
/// 在第 06 章的基础上添加了动画控制集成
/// </summary>
public class PlayerMovement : MonoBehaviour
{
    [Header("移动参数")]
    [SerializeField] private float walkSpeed = 2f;
    [SerializeField] private float runSpeed = 6f;
    [SerializeField] private float jumpForce = 8f;
    [SerializeField] private float gravity = -20f;
    [SerializeField] private float rotationSpeed = 10f;

    [Header("地面检测")]
    [SerializeField] private Transform groundCheck;
    [SerializeField] private float groundCheckRadius = 0.2f;
    [SerializeField] private LayerMask groundLayer;

    // 组件引用
    private CharacterController controller;
    private PlayerAnimator playerAnimator; // 动画控制器引用
    private Transform cameraTransform;

    // 运行时状态
    private Vector3 velocity;
    private bool isGrounded;

    void Start()
    {
        controller = GetComponent<CharacterController>();
        playerAnimator = GetComponent<PlayerAnimator>(); // 获取动画控制器
        cameraTransform = Camera.main.transform;
    }

    void Update()
    {
        // 地面检测
        isGrounded = Physics.CheckSphere(
            groundCheck.position, groundCheckRadius, groundLayer);

        // 落地时重置垂直速度
        if (isGrounded && velocity.y < 0)
        {
            velocity.y = -2f;
        }

        // 获取输入
        float horizontal = Input.GetAxisRaw("Horizontal");
        float vertical = Input.GetAxisRaw("Vertical");
        Vector3 inputDirection = new Vector3(horizontal, 0f, vertical).normalized;

        // 判断是否按住跑步键
        bool isRunning = Input.GetKey(KeyCode.LeftShift);
        float currentMoveSpeed = isRunning ? runSpeed : walkSpeed;

        // 移动
        if (inputDirection.magnitude >= 0.1f)
        {
            // 计算相对于相机的移动方向
            float targetAngle = Mathf.Atan2(inputDirection.x, inputDirection.z)
                                * Mathf.Rad2Deg + cameraTransform.eulerAngles.y;

            // 平滑旋转
            float angle = Mathf.LerpAngle(
                transform.eulerAngles.y, targetAngle,
                rotationSpeed * Time.deltaTime);
            transform.rotation = Quaternion.Euler(0f, angle, 0f);

            // 移动方向
            Vector3 moveDirection = Quaternion.Euler(0f, targetAngle, 0f)
                                    * Vector3.forward;
            controller.Move(moveDirection.normalized * currentMoveSpeed
                          * Time.deltaTime);
        }

        // 跳跃
        if (Input.GetButtonDown("Jump") && isGrounded)
        {
            velocity.y = Mathf.Sqrt(jumpForce * -2f * gravity);

            // 通知动画控制器播放跳跃动画
            playerAnimator?.TriggerJump();
        }

        // 应用重力
        velocity.y += gravity * Time.deltaTime;
        controller.Move(velocity * Time.deltaTime);

        // 动画参数由 PlayerAnimator 在其 Update 中自动同步
        // 不需要在这里手动设置，职责分离更清晰
    }
}
```

### 8.11.5 完整设置步骤总结

1. **导入资源**：从 Mixamo 下载角色模型和 5 个动画（Idle、Walk、Run、Jump、Fall）
2. **设置角色 Rig**：角色模型 FBX → Rig → Humanoid → Configure → Apply
3. **设置动画 Rig**：每个动画 FBX → Rig → Humanoid → Copy From Other Avatar → Apply
4. **设置动画循环**：Animation 标签 → Idle/Walk/Run 勾选 Loop Time，Jump/Fall 不勾选
5. **创建 Animator Controller**：添加 5 个参数（Speed、IsGrounded、JumpTrigger、IsFalling、VerticalVelocity）
6. **创建 Blend Tree**：Locomotion（1D Blend Tree: Idle→Walk→Run）
7. **添加状态**：Jump、Fall、Land
8. **创建过渡**：按上面的表格设置条件
9. **角色 GameObject 设置**：
   - Animator 组件 → Controller 设为 PlayerAnimatorController
   - Apply Root Motion 取消勾选
   - 添加 PlayerAnimator.cs 脚本
   - 添加 PlayerMovement.cs 脚本
10. **测试运行**：WASD 移动查看 Idle/Walk 过渡，Shift 跑步，Space 跳跃

[截图：完成所有设置后的角色 Inspector 面板，显示 Animator、PlayerAnimator、PlayerMovement 组件]

---

## 8.12 进阶技巧

### 8.12.1 动画过渡的常见问题

**问题 1：动画卡在某个状态不切换**
```
检查清单：
☐ 过渡条件是否正确设置？
☐ 参数值是否在代码中正确更新？
☐ Has Exit Time 是否需要关闭？
☐ 是否有互相矛盾的过渡条件？
```

**问题 2：角色移动时脚在地面滑动**
```
解决方案：
1. 调整 Blend Tree 中动画的速度倍率
   - 选中 Blend Tree 中的动画
   - 调整 Speed 参数，匹配角色实际移动速度
2. 或者使用 Root Motion（但不推荐用于游戏性控制）
```

**问题 3：过渡时出现动画抖动**
```
解决方案：
1. 增加 Transition Duration（过渡持续时间）
2. 检查两个动画的姿态是否兼容
3. 使用 Transition Offset 调整目标动画起始点
```

### 8.12.2 动画速度控制

```csharp
/// <summary>
/// 动态调整动画播放速度
/// 常用于：根据角色移动速度调整走路/跑步动画速度
/// </summary>
public class AnimationSpeedController : MonoBehaviour
{
    private Animator animator;
    private static readonly int AnimSpeedHash = Animator.StringToHash("AnimSpeed");

    void Start()
    {
        animator = GetComponent<Animator>();
    }

    /// <summary>
    /// 设置全局动画播放速度
    /// </summary>
    /// <param name="speed">速度倍率（1 = 正常，0.5 = 半速，2 = 两倍速）</param>
    public void SetAnimationSpeed(float speed)
    {
        animator.speed = speed;
    }

    /// <summary>
    /// 设置单个状态的播放速度（需要在 Animator 中设置 Multiplier 参数）
    /// 步骤：
    /// 1. 在 Animator 状态的 Inspector 中勾选 "Parameter" 旁的 Multiplier
    /// 2. 选择一个 Float 参数（如 AnimSpeed）
    /// 3. 在代码中设置该参数值
    /// </summary>
    public void SetStateSpeed(float speed)
    {
        animator.SetFloat(AnimSpeedHash, speed);
    }

    /// <summary>
    /// 暂停动画
    /// </summary>
    public void PauseAnimation()
    {
        animator.speed = 0f;
    }

    /// <summary>
    /// 恢复动画
    /// </summary>
    public void ResumeAnimation()
    {
        animator.speed = 1f;
    }
}
```

### 8.12.3 通过代码播放特定动画

```csharp
/// <summary>
/// 直接通过代码播放/切换动画状态
/// 绕过正常的过渡条件，强制切换
/// </summary>
public class DirectAnimationPlay : MonoBehaviour
{
    private Animator animator;

    // 状态名的哈希值
    private static readonly int IdleStateHash = Animator.StringToHash("Idle");
    private static readonly int DeathStateHash = Animator.StringToHash("Death");

    void Start()
    {
        animator = GetComponent<Animator>();
    }

    /// <summary>
    /// 强制播放死亡动画（无过渡）
    /// </summary>
    public void PlayDeathAnimation()
    {
        // Play：立即切换，无过渡
        animator.Play(DeathStateHash);
    }

    /// <summary>
    /// 带过渡地切换到指定状态
    /// </summary>
    public void CrossFadeToIdle()
    {
        // CrossFadeInFixedTime：带过渡切换（过渡时间 0.25 秒）
        animator.CrossFadeInFixedTime(IdleStateHash, 0.25f);
    }

    /// <summary>
    /// 播放 Animator Override 中的动画
    /// 用于动态替换动画（如不同武器的攻击动画）
    /// </summary>
    public void OverrideAnimation(AnimationClip newClip)
    {
        AnimatorOverrideController overrideController =
            new AnimatorOverrideController(animator.runtimeAnimatorController);

        // 替换 "Attack" 动画为新的动画
        overrideController["Attack"] = newClip;

        // 应用 Override Controller
        animator.runtimeAnimatorController = overrideController;
    }
}
```

---

## 8.13 本章小结

```
本章知识图谱：

Unity 动画系统
├── 基础概念
│   ├── Animation 组件（旧版，简单动画）
│   ├── Animator 组件（推荐，状态机驱动）
│   └── Animation Clip（.anim 文件，关键帧数据）
│
├── Animator Controller（核心）
│   ├── 状态（State）──播放一个动画
│   ├── 过渡（Transition）──状态之间的切换
│   ├── 参数（Parameters）──Float / Int / Bool / Trigger
│   ├── Blend Tree──动画混合（1D / 2D）
│   └── 层（Layer）──分层动画 + Avatar Mask
│
├── 高级功能
│   ├── Root Motion vs 脚本驱动
│   ├── Animation Events（帧事件回调）
│   ├── Animator Override Controller（动态替换动画）
│   └── IK（反向运动学，后续章节）
│
└── 工作流
    ├── Mixamo 获取免费动画
    ├── Humanoid Avatar 配置
    └── 骨骼重定向（动画复用）
```

**关键要点回顾：**

1. **始终使用 Animator**，除非是最简单的属性动画
2. **用参数哈希** `Animator.StringToHash()` 优化性能
3. **Blend Tree** 是实现平滑运动动画的关键
4. **脚本驱动移动** 比 Root Motion 更适合游戏性控制
5. **Animation Events** 是实现音效、特效与动画同步的利器
6. **Humanoid Rig** 让动画可以在不同角色间复用

---

## 练习题

### 练习 1：基础关键帧动画（难度：⭐）
创建一个旋转的宝箱道具，使用 Animation 窗口制作以下动画：
- 宝箱缓慢上下浮动（Y 轴移动）
- 同时缓慢旋转（Y 轴旋转）
- 添加发光效果渐变（材质 Emission 属性）

### 练习 2：状态机设计（难度：⭐⭐）
为一个 NPC 设计 Animator Controller，包含以下状态：
- Idle（待机）
- Patrol（巡逻走路）
- Alert（警觉，发现玩家）
- Chase（追击跑步）
- Attack（攻击）
- Return（返回巡逻点）

画出状态转换图，标注每个过渡的条件。

### 练习 3：完善角色动画（难度：⭐⭐⭐）
在本章的 PlayerAnimator 基础上，添加以下功能：
- 双击 Shift 冲刺动画（Sprint），速度更快
- 攻击动画（三段连击，每次按下攻击键播放下一段）
- 受击动画（被敌人打中时短暂播放）
- 死亡动画（生命值归零时播放，播完后角色倒地不动）

### 练习 4：二维 Blend Tree（难度：⭐⭐⭐）
使用 2D Freeform Directional Blend Tree 实现八方向移动动画：
- 前、后、左、右各需要不同的走路动画
- 从 Mixamo 下载对应方向的动画
- 实现角色可以不改变朝向地向八个方向移动（锁定视角模式）

---

## 下一章预告

**第 09 章：UI 系统** 将学习：
- Canvas 画布与移动端适配（Canvas Scaler）
- RectTransform 布局系统（对比 CSS Flexbox/Grid）
- TextMeshPro 高质量文字渲染
- 创建血条、主菜单、游戏内 HUD
- UI 事件系统与交互
- 对于有前端经验的你来说，这将是最有亲切感的一章！

---

> **版权声明**：本教程为 BellLab 原创内容，仅供学习使用。
