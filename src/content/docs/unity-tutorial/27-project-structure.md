# 第27章：项目架构与设计模式

## 本章目标

通过本章学习，你将掌握：

1. 项目文件夹结构最佳实践（基于功能 vs 基于类型）
2. Assembly Definition 加速编译和模块化
3. Unity 中常用的设计模式（单例、观察者、状态机、命令、对象池、服务定位器）
4. ScriptableObject 架构（数据驱动设计、事件通道、运行时集合）
5. 依赖注入基础（VContainer/Zenject 概览）
6. 代码组织原则（Manager vs System vs Component）
7. Unity 测试框架（Edit Mode 和 Play Mode 测试）
8. 调试工具和技巧
9. Git 版本控制最佳实践（Git LFS、.gitignore）
10. CI/CD 与 GitHub Actions 集成
11. 与前端架构的对比和思维迁移

## 预计学习时间

约 4-5 小时（含代码实践时间）

---

## 27.1 文件夹结构

### 27.1.1 两种主流组织方式

#### 基于类型（Type-Based）

```
Assets/
├── Scripts/
│   ├── PlayerController.cs
│   ├── EnemyAI.cs
│   ├── InventoryManager.cs
│   └── QuestSystem.cs
├── Prefabs/
│   ├── Player.prefab
│   ├── Enemy.prefab
│   └── Item.prefab
├── Materials/
│   ├── PlayerMaterial.mat
│   └── EnemyMaterial.mat
└── Animations/
    ├── PlayerAnim.controller
    └── EnemyAnim.controller
```

**优点**：简单直观、传统做法
**缺点**：功能相关的文件分散在不同目录，当项目变大时难以维护

> **前端类比**：这类似于早期 React 项目把所有组件放在 `components/`，所有样式放在 `styles/`，所有 hook 放在 `hooks/`。

#### 基于功能（Feature-Based）

```
Assets/
├── Features/
│   ├── Player/
│   │   ├── Scripts/
│   │   │   ├── PlayerController.cs
│   │   │   └── PlayerHealth.cs
│   │   ├── Prefabs/
│   │   │   └── Player.prefab
│   │   ├── Animations/
│   │   │   └── PlayerAnim.controller
│   │   └── Materials/
│   │       └── PlayerMaterial.mat
│   │
│   ├── Enemy/
│   │   ├── Scripts/
│   │   ├── Prefabs/
│   │   └── Animations/
│   │
│   ├── Inventory/
│   │   ├── Scripts/
│   │   ├── UI/
│   │   └── Data/
│   │
│   └── Quest/
│       ├── Scripts/
│       ├── Data/
│       └── UI/
│
├── Core/                // 共享的核心系统
│   ├── Scripts/
│   ├── Utilities/
│   └── ScriptableObjects/
│
└── Shared/             // 共享资源
    ├── Shaders/
    ├── Fonts/
    └── CommonUI/
```

**优点**：高内聚低耦合，功能相关的文件在一起，易于维护和重构
**缺点**：初始设置稍复杂

> **前端类比**：这类似于现代 React/Next.js 的 feature-based 结构——每个功能模块包含自己的组件、hooks、样式和测试。

### 27.1.2 推荐的混合方案

对于开放世界移动游戏项目，推荐使用**功能为主、类型为辅**的混合结构：

```
Assets/
├── _Game/                         // 项目核心（下划线使其排在最前）
│   │
│   ├── Core/                      // 核心框架（不依赖具体游戏逻辑）
│   │   ├── EventSystem/           // 事件系统
│   │   │   ├── EventChannel.cs
│   │   │   └── GameEvent.cs
│   │   ├── ServiceLocator/        // 服务定位器
│   │   │   └── ServiceLocator.cs
│   │   ├── StateMachine/          // 状态机
│   │   │   └── StateMachine.cs
│   │   ├── ObjectPool/            // 对象池
│   │   │   └── ObjectPool.cs
│   │   ├── Singleton/             // 单例基类
│   │   │   └── Singleton.cs
│   │   └── Utilities/             // 工具类
│   │       ├── Timer.cs
│   │       └── Extensions.cs
│   │
│   ├── Features/                  // 游戏功能模块
│   │   ├── Player/
│   │   ├── Combat/
│   │   ├── Inventory/
│   │   ├── Quest/
│   │   ├── Dialogue/
│   │   ├── WorldMap/
│   │   └── SaveLoad/
│   │
│   ├── Managers/                  // 全局管理器
│   │   ├── GameManager.cs
│   │   ├── AudioManager.cs
│   │   └── UIManager.cs
│   │
│   ├── UI/                        // 用户界面
│   │   ├── Screens/               // 全屏界面
│   │   ├── Widgets/               // 可复用 UI 组件
│   │   └── HUD/                   // 游戏内 HUD
│   │
│   ├── Data/                      // ScriptableObject 数据
│   │   ├── Items/
│   │   ├── Enemies/
│   │   └── Config/
│   │
│   ├── Scenes/                    // 场景文件
│   │   ├── MainMenu.unity
│   │   ├── Gameplay.unity
│   │   └── Loading.unity
│   │
│   └── Resources/                 // Resources（尽量少用）
│
├── Art/                           // 美术资源
│   ├── Models/
│   ├── Textures/
│   ├── Materials/
│   ├── Animations/
│   ├── Audio/
│   └── VFX/
│
├── ThirdParty/                    // 第三方资源
│
├── Plugins/                       // 原生插件
│
└── Editor/                        // 编辑器扩展
    ├── BuildHelper.cs
    ├── AssetValidator.cs
    └── TextureOptimizer.cs
```

---

## 27.2 Assembly Definition（程序集定义）

### 27.2.1 为什么需要 Assembly Definition

默认情况下，Unity 会把 `Assets/` 下的所有 C# 脚本编译成一个程序集（`Assembly-CSharp.dll`）。这意味着：

- **改一个文件，重新编译所有脚本**
- 项目越大，编译越慢
- 无法控制模块间的依赖关系

Assembly Definition（`.asmdef`）把代码拆分成多个程序集，实现：

- **增量编译**：只重新编译修改了的程序集
- **模块化**：明确声明模块间的依赖关系
- **编译隔离**：减少编译时间

> **前端类比**：Assembly Definition 类似于 monorepo 中的 `package.json`——每个包声明自己的依赖，独立编译。就像 npm workspace 或 Turborepo。

### 27.2.2 创建 Assembly Definition

在文件夹中右键 → **Create → Assembly Definition**：

[截图：创建 Assembly Definition 文件]

推荐的 Assembly Definition 结构：

```
Assembly 结构：
├── Game.Core.asmdef          // 核心框架（不依赖任何游戏代码）
│   └── 引用: Unity 内置程序集
│
├── Game.Features.asmdef      // 游戏功能（依赖 Core）
│   └── 引用: Game.Core
│
├── Game.UI.asmdef            // UI 系统（依赖 Core 和 Features）
│   └── 引用: Game.Core, Game.Features
│
├── Game.Managers.asmdef      // 全局管理器
│   └── 引用: Game.Core, Game.Features, Game.UI
│
├── Game.Editor.asmdef        // 编辑器工具（仅编辑器）
│   └── 引用: Game.Core（平台: Editor）
│
└── Game.Tests.asmdef         // 测试（仅编辑器）
    └── 引用: Game.Core, Game.Features
```

### 27.2.3 Assembly Definition 配置

```
Assembly Definition 设置：
├── Name: Game.Core
├── Allow 'unsafe' Code: ✗ (除非需要使用指针)
├── Auto Referenced: ✓
├── Override References: ✗
├── No Engine References: ✗ (需要引用 UnityEngine)
├── Root Namespace: YourGame.Core (可选，设置默认命名空间)
│
├── Assembly Definition References:
│   └── (添加依赖的其他 asmdef)
│
├── Platforms:
│   ├── Any Platform: ✓ (通常选这个)
│   └── 或者手动选择目标平台
│
└── Version Defines:
    └── (用于条件编译，如 #if UNITY_EDITOR)
```

[截图：Assembly Definition Inspector 配置面板]

---

## 27.3 设计模式

### 27.3.1 单例模式（Singleton）

**用途**：确保一个类只有一个实例，如 GameManager、AudioManager。

> **前端类比**：类似于 React Context 中的全局 Provider，或者 Redux Store——全局唯一的状态容器。

```csharp
// ============================================================
// Singleton.cs — 通用单例基类
// 放置路径：Assets/_Game/Core/Singleton/Singleton.cs
// ============================================================

using UnityEngine;

/// <summary>
/// MonoBehaviour 单例基类
/// 继承此类即可获得线程安全的单例行为
/// 子类只需要: public class GameManager : Singleton<GameManager> { }
/// </summary>
/// <typeparam name="T">子类类型</typeparam>
public class Singleton<T> : MonoBehaviour where T : MonoBehaviour
{
    /// <summary>单例实例</summary>
    private static T instance;

    /// <summary>线程锁</summary>
    private static readonly object lockObj = new object();

    /// <summary>应用是否正在退出（防止退出时创建新实例）</summary>
    private static bool applicationIsQuitting = false;

    /// <summary>
    /// 获取单例实例
    /// 如果不存在会自动创建
    /// </summary>
    public static T Instance
    {
        get
        {
            // 应用退出时不要创建新实例
            if (applicationIsQuitting)
            {
                Debug.LogWarning($"[Singleton] 应用退出中，" +
                    $"不创建 {typeof(T).Name} 的新实例");
                return null;
            }

            lock (lockObj)
            {
                if (instance == null)
                {
                    // 尝试在场景中查找
                    instance = FindAnyObjectByType<T>();

                    if (instance == null)
                    {
                        // 不存在则创建
                        var singletonObj = new GameObject($"[{typeof(T).Name}]");
                        instance = singletonObj.AddComponent<T>();
                        DontDestroyOnLoad(singletonObj);

                        Debug.Log($"[Singleton] 创建了 {typeof(T).Name} 实例");
                    }
                }

                return instance;
            }
        }
    }

    /// <summary>检查实例是否存在（不会自动创建）</summary>
    public static bool HasInstance => instance != null;

    protected virtual void Awake()
    {
        if (instance != null && instance != this as T)
        {
            Debug.LogWarning($"[Singleton] {typeof(T).Name} 重复实例，销毁多余的");
            Destroy(gameObject);
            return;
        }

        instance = this as T;
        DontDestroyOnLoad(gameObject);
    }

    protected virtual void OnDestroy()
    {
        if (instance == this as T)
        {
            instance = null;
        }
    }

    protected virtual void OnApplicationQuit()
    {
        applicationIsQuitting = true;
    }
}
```

### 27.3.2 观察者模式 / 事件总线（Observer / Event Bus）

**用途**：解耦系统间的通信。一个系统发出事件，其他系统监听并响应。

> **前端类比**：
> - React: `useContext` + `dispatch`
> - Vue: `EventBus` 或 `mitt`
> - Node.js: `EventEmitter`
> - Redux: `store.subscribe()` 和 `dispatch(action)`

#### 使用 ScriptableObject 实现事件通道

这是 Unity 社区推荐的优雅方案——用 ScriptableObject 作为事件的"邮局"：

```csharp
// ============================================================
// EventChannel.cs — 基于 ScriptableObject 的事件通道系统
// 放置路径：Assets/_Game/Core/EventSystem/EventChannel.cs
// ============================================================

using UnityEngine;
using UnityEngine.Events;
using System;

// ========================================
// 无参数事件通道
// ========================================

/// <summary>
/// 无参数事件通道
/// 用法：
/// 1. 在 Project 窗口右键 → Create → Events → Void Event Channel
/// 2. 创建一个事件资源（如 "OnPlayerDied"）
/// 3. 发布者引用此资源并调用 Raise()
/// 4. 订阅者引用此资源并注册 OnEventRaised
///
/// 优势：
/// - 发布者和订阅者完全解耦
/// - 在 Inspector 中可以直观地看到事件的连接关系
/// - 不需要代码引用，通过 ScriptableObject 资源连接
/// </summary>
[CreateAssetMenu(menuName = "Events/Void Event Channel")]
public class VoidEventChannel : ScriptableObject
{
    /// <summary>
    /// 事件描述（在 Inspector 中显示，方便理解用途）
    /// </summary>
    [TextArea]
    [SerializeField] private string description;

    /// <summary>
    /// C# 事件（代码订阅用）
    /// 类似于 JavaScript 中的 addEventListener
    /// </summary>
    public event Action OnEventRaised;

    /// <summary>
    /// UnityEvent（Inspector 订阅用）
    /// 可以在 Inspector 中直接拖拽绑定方法
    /// </summary>
    [SerializeField] private UnityEvent onEventRaisedInspector;

    /// <summary>
    /// 触发事件
    /// 类似于 JavaScript 中的 dispatchEvent 或 emit
    /// </summary>
    public void Raise()
    {
        Debug.Log($"[EventChannel] 触发事件: {name}");

        // 触发 C# 事件
        OnEventRaised?.Invoke();

        // 触发 Inspector 绑定的事件
        onEventRaisedInspector?.Invoke();
    }
}

// ========================================
// 带参数的事件通道（泛型）
// ========================================

/// <summary>
/// 泛型事件通道基类
/// </summary>
/// <typeparam name="T">事件参数类型</typeparam>
public abstract class EventChannel<T> : ScriptableObject
{
    [TextArea]
    [SerializeField] private string description;

    public event Action<T> OnEventRaised;

    public void Raise(T value)
    {
        Debug.Log($"[EventChannel] 触发事件: {name}, 值: {value}");
        OnEventRaised?.Invoke(value);
    }
}

// ========================================
// 常用类型的事件通道
// ========================================

/// <summary>整数事件通道（如：伤害值、分数变化）</summary>
[CreateAssetMenu(menuName = "Events/Int Event Channel")]
public class IntEventChannel : EventChannel<int> { }

/// <summary>浮点数事件通道（如：生命值百分比、时间）</summary>
[CreateAssetMenu(menuName = "Events/Float Event Channel")]
public class FloatEventChannel : EventChannel<float> { }

/// <summary>字符串事件通道（如：聊天消息、通知）</summary>
[CreateAssetMenu(menuName = "Events/String Event Channel")]
public class StringEventChannel : EventChannel<string> { }

/// <summary>布尔事件通道（如：暂停/恢复、显示/隐藏）</summary>
[CreateAssetMenu(menuName = "Events/Bool Event Channel")]
public class BoolEventChannel : EventChannel<bool> { }

/// <summary>Vector3 事件通道（如：位置、方向）</summary>
[CreateAssetMenu(menuName = "Events/Vector3 Event Channel")]
public class Vector3EventChannel : EventChannel<Vector3> { }

/// <summary>GameObject 事件通道（如：拾取物品、点击目标）</summary>
[CreateAssetMenu(menuName = "Events/GameObject Event Channel")]
public class GameObjectEventChannel : EventChannel<GameObject> { }

// ========================================
// 事件监听器组件（用于在 Inspector 中绑定响应）
// ========================================

/// <summary>
/// 无参数事件监听器
/// 添加到 GameObject 上，在 Inspector 中配置响应
/// </summary>
public class VoidEventListener : MonoBehaviour
{
    [Tooltip("要监听的事件通道")]
    [SerializeField] private VoidEventChannel eventChannel;

    [Tooltip("事件触发时执行的方法")]
    [SerializeField] private UnityEvent onEventRaised;

    private void OnEnable()
    {
        if (eventChannel != null)
            eventChannel.OnEventRaised += Respond;
    }

    private void OnDisable()
    {
        if (eventChannel != null)
            eventChannel.OnEventRaised -= Respond;
    }

    private void Respond()
    {
        onEventRaised?.Invoke();
    }
}
```

#### 事件通道使用示例

```
使用流程：
1. 创建事件资源:
   Project 窗口 → Create → Events → Void Event Channel
   命名为 "OnPlayerDied"

2. 发布者（PlayerHealth.cs）:
   [SerializeField] private VoidEventChannel onPlayerDied;

   void Die()
   {
       onPlayerDied.Raise(); // 触发事件
   }

3. 订阅者A（GameOverUI.cs）:
   [SerializeField] private VoidEventChannel onPlayerDied;

   void OnEnable() => onPlayerDied.OnEventRaised += ShowGameOver;
   void OnDisable() => onPlayerDied.OnEventRaised -= ShowGameOver;

4. 订阅者B（EnemyAI.cs）:
   [SerializeField] private VoidEventChannel onPlayerDied;

   void OnEnable() => onPlayerDied.OnEventRaised += Celebrate;
   void OnDisable() => onPlayerDied.OnEventRaised -= Celebrate;

关键优势：PlayerHealth 不需要知道 GameOverUI 和 EnemyAI 的存在！
```

[截图：Inspector 中 VoidEventChannel 资源的配置，以及 EventListener 组件的绑定]

### 27.3.3 状态机模式（State Machine）

**用途**：管理对象的不同状态及状态间的转换。如：角色状态（Idle、Run、Jump、Attack）、游戏流程（Menu、Playing、Paused、GameOver）。

> **前端类比**：
> - XState（JavaScript 状态机库）
> - Redux reducer 中的 action 处理
> - React 组件的生命周期状态

```csharp
// ============================================================
// StateMachine.cs — 通用有限状态机
// 放置路径：Assets/_Game/Core/StateMachine/StateMachine.cs
// ============================================================

using UnityEngine;
using System;
using System.Collections.Generic;

/// <summary>
/// 状态接口
/// 每个具体状态需要实现这个接口
/// 类似于 React 组件的生命周期方法
/// </summary>
public interface IState
{
    /// <summary>进入状态时调用（类似于 componentDidMount / useEffect 初始化）</summary>
    void Enter();

    /// <summary>每帧更新（类似于 requestAnimationFrame 中的更新）</summary>
    void Update();

    /// <summary>物理更新（固定时间步长）</summary>
    void FixedUpdate();

    /// <summary>离开状态时调用（类似于 componentWillUnmount / useEffect cleanup）</summary>
    void Exit();
}

/// <summary>
/// 状态基类（可选，提供默认空实现）
/// 类似于 React.Component 提供默认的生命周期方法
/// </summary>
public abstract class BaseState : IState
{
    /// <summary>状态所属的状态机</summary>
    protected StateMachine stateMachine;

    public BaseState(StateMachine stateMachine)
    {
        this.stateMachine = stateMachine;
    }

    public virtual void Enter() { }
    public virtual void Update() { }
    public virtual void FixedUpdate() { }
    public virtual void Exit() { }
}

/// <summary>
/// 通用有限状态机
/// 管理状态的注册、切换和更新
/// </summary>
public class StateMachine
{
    /// <summary>当前活跃的状态</summary>
    public IState CurrentState { get; private set; }

    /// <summary>上一个状态</summary>
    public IState PreviousState { get; private set; }

    /// <summary>所有已注册的状态</summary>
    private Dictionary<Type, IState> states = new Dictionary<Type, IState>();

    /// <summary>状态变化事件</summary>
    public event Action<IState, IState> OnStateChanged; // (旧状态, 新状态)

    /// <summary>
    /// 注册一个状态
    /// </summary>
    /// <typeparam name="T">状态类型</typeparam>
    /// <param name="state">状态实例</param>
    public void RegisterState<T>(T state) where T : IState
    {
        var type = typeof(T);
        if (states.ContainsKey(type))
        {
            Debug.LogWarning($"[StateMachine] 状态 {type.Name} 已经注册过了");
            return;
        }

        states[type] = state;
        Debug.Log($"[StateMachine] 注册状态: {type.Name}");
    }

    /// <summary>
    /// 切换到指定状态
    /// </summary>
    /// <typeparam name="T">目标状态类型</typeparam>
    public void ChangeState<T>() where T : IState
    {
        var type = typeof(T);

        if (!states.TryGetValue(type, out IState newState))
        {
            Debug.LogError($"[StateMachine] 未注册的状态: {type.Name}");
            return;
        }

        // 退出当前状态
        PreviousState = CurrentState;
        CurrentState?.Exit();

        // 进入新状态
        CurrentState = newState;
        CurrentState.Enter();

        Debug.Log($"[StateMachine] 状态切换: " +
                 $"{PreviousState?.GetType().Name ?? "None"} → {type.Name}");

        OnStateChanged?.Invoke(PreviousState, CurrentState);
    }

    /// <summary>
    /// 更新当前状态（在 MonoBehaviour.Update 中调用）
    /// </summary>
    public void Update()
    {
        CurrentState?.Update();
    }

    /// <summary>
    /// 物理更新当前状态（在 MonoBehaviour.FixedUpdate 中调用）
    /// </summary>
    public void FixedUpdate()
    {
        CurrentState?.FixedUpdate();
    }

    /// <summary>
    /// 检查当前是否处于某个状态
    /// </summary>
    public bool IsInState<T>() where T : IState
    {
        return CurrentState != null && CurrentState.GetType() == typeof(T);
    }

    /// <summary>
    /// 获取已注册的状态实例
    /// </summary>
    public T GetState<T>() where T : IState
    {
        if (states.TryGetValue(typeof(T), out IState state))
            return (T)state;
        return default;
    }

    /// <summary>
    /// 回到上一个状态
    /// </summary>
    public void RevertToPreviousState()
    {
        if (PreviousState != null)
        {
            var type = PreviousState.GetType();
            CurrentState?.Exit();
            CurrentState = PreviousState;
            CurrentState.Enter();
        }
    }
}

// ========================================
// 使用示例：角色状态
// ========================================

/// <summary>角色空闲状态</summary>
public class PlayerIdleState : BaseState
{
    private readonly PlayerController player;

    public PlayerIdleState(StateMachine sm, PlayerController player) : base(sm)
    {
        this.player = player;
    }

    public override void Enter()
    {
        Debug.Log("[PlayerState] 进入空闲状态");
        player.PlayAnimation("Idle");
    }

    public override void Update()
    {
        // 检查是否开始移动
        if (player.MoveInput.magnitude > 0.1f)
        {
            stateMachine.ChangeState<PlayerRunState>();
        }

        // 检查是否按下跳跃键
        if (player.JumpPressed)
        {
            stateMachine.ChangeState<PlayerJumpState>();
        }

        // 检查是否按下攻击键
        if (player.AttackPressed)
        {
            stateMachine.ChangeState<PlayerAttackState>();
        }
    }

    public override void Exit()
    {
        Debug.Log("[PlayerState] 离开空闲状态");
    }
}

/// <summary>角色奔跑状态</summary>
public class PlayerRunState : BaseState
{
    private readonly PlayerController player;

    public PlayerRunState(StateMachine sm, PlayerController player) : base(sm)
    {
        this.player = player;
    }

    public override void Enter()
    {
        Debug.Log("[PlayerState] 进入奔跑状态");
        player.PlayAnimation("Run");
    }

    public override void Update()
    {
        // 执行移动逻辑
        player.Move();

        // 检查是否停止移动
        if (player.MoveInput.magnitude < 0.1f)
        {
            stateMachine.ChangeState<PlayerIdleState>();
        }

        if (player.JumpPressed)
        {
            stateMachine.ChangeState<PlayerJumpState>();
        }
    }
}

/// <summary>角色跳跃状态</summary>
public class PlayerJumpState : BaseState
{
    private readonly PlayerController player;

    public PlayerJumpState(StateMachine sm, PlayerController player) : base(sm)
    {
        this.player = player;
    }

    public override void Enter()
    {
        Debug.Log("[PlayerState] 进入跳跃状态");
        player.PlayAnimation("Jump");
        player.ApplyJumpForce();
    }

    public override void Update()
    {
        // 检查是否落地
        if (player.IsGrounded)
        {
            if (player.MoveInput.magnitude > 0.1f)
                stateMachine.ChangeState<PlayerRunState>();
            else
                stateMachine.ChangeState<PlayerIdleState>();
        }
    }
}

/// <summary>角色攻击状态</summary>
public class PlayerAttackState : BaseState
{
    private readonly PlayerController player;
    private float attackTimer;

    public PlayerAttackState(StateMachine sm, PlayerController player) : base(sm)
    {
        this.player = player;
    }

    public override void Enter()
    {
        Debug.Log("[PlayerState] 进入攻击状态");
        player.PlayAnimation("Attack");
        attackTimer = 0.5f; // 攻击持续时间
    }

    public override void Update()
    {
        attackTimer -= Time.deltaTime;

        if (attackTimer <= 0f)
        {
            stateMachine.ChangeState<PlayerIdleState>();
        }
    }
}

// 注意：PlayerController 是一个假设的类，在这里作为示例引用
// 实际使用时需要根据你的项目来定义
```

### 27.3.4 命令模式（Command Pattern）

**用途**：将操作封装为对象，支持撤销/重做、操作队列、宏命令。

> **前端类比**：Redux 的 Action 就是命令模式的应用——每个 action 是一个描述操作的对象。

```csharp
/// <summary>命令接口</summary>
public interface ICommand
{
    /// <summary>执行命令</summary>
    void Execute();
    /// <summary>撤销命令</summary>
    void Undo();
}

/// <summary>命令管理器（支持撤销/重做）</summary>
public class CommandManager
{
    private Stack<ICommand> undoStack = new Stack<ICommand>();
    private Stack<ICommand> redoStack = new Stack<ICommand>();

    /// <summary>执行命令并记录到历史</summary>
    public void ExecuteCommand(ICommand command)
    {
        command.Execute();
        undoStack.Push(command);
        redoStack.Clear(); // 执行新命令后清空重做栈
    }

    /// <summary>撤销最后一个命令</summary>
    public void Undo()
    {
        if (undoStack.Count > 0)
        {
            var command = undoStack.Pop();
            command.Undo();
            redoStack.Push(command);
        }
    }

    /// <summary>重做最后撤销的命令</summary>
    public void Redo()
    {
        if (redoStack.Count > 0)
        {
            var command = redoStack.Pop();
            command.Execute();
            undoStack.Push(command);
        }
    }
}

/// <summary>示例：移动物品命令</summary>
public class MoveItemCommand : ICommand
{
    private readonly Transform target;
    private readonly Vector3 newPosition;
    private readonly Vector3 oldPosition;

    public MoveItemCommand(Transform target, Vector3 newPosition)
    {
        this.target = target;
        this.newPosition = newPosition;
        this.oldPosition = target.position;
    }

    public void Execute() => target.position = newPosition;
    public void Undo() => target.position = oldPosition;
}
```

### 27.3.5 对象池模式（Object Pool）

**用途**：重复使用对象而不是频繁创建和销毁，避免 GC（垃圾回收）导致的卡顿。

> **前端类比**：类似于 React 中的虚拟列表（Virtual List）——只渲染可见的元素，离开视口的元素被回收复用。

```csharp
using UnityEngine;
using UnityEngine.Pool;
using System.Collections.Generic;

/// <summary>
/// 通用对象池
/// Unity 2021+ 内置了 ObjectPool，但我们封装一层以添加预热和管理功能
/// </summary>
public class GameObjectPool : MonoBehaviour
{
    [Tooltip("要池化的预制体")]
    [SerializeField] private GameObject prefab;

    [Tooltip("初始预热数量")]
    [SerializeField] private int initialSize = 10;

    [Tooltip("最大池大小")]
    [SerializeField] private int maxSize = 100;

    /// <summary>Unity 内置对象池</summary>
    private ObjectPool<GameObject> pool;

    /// <summary>所有活跃的对象</summary>
    private HashSet<GameObject> activeObjects = new HashSet<GameObject>();

    private void Awake()
    {
        // 创建对象池
        pool = new ObjectPool<GameObject>(
            createFunc: CreatePooledObject,     // 如何创建新对象
            actionOnGet: OnGetFromPool,         // 从池中取出时
            actionOnRelease: OnReturnToPool,    // 归还到池中时
            actionOnDestroy: OnDestroyPooled,   // 池满时销毁多余对象
            collectionCheck: true,              // 防止重复归还
            defaultCapacity: initialSize,
            maxSize: maxSize
        );

        // 预热对象池（提前创建一批对象）
        Prewarm();
    }

    /// <summary>预热：提前创建对象以避免运行时的创建开销</summary>
    private void Prewarm()
    {
        var prewarmList = new List<GameObject>();

        for (int i = 0; i < initialSize; i++)
        {
            var obj = pool.Get();
            prewarmList.Add(obj);
        }

        // 全部归还到池中
        foreach (var obj in prewarmList)
        {
            pool.Release(obj);
        }

        Debug.Log($"[ObjectPool] {prefab.name} 预热完成: {initialSize} 个对象");
    }

    /// <summary>从池中获取一个对象</summary>
    public GameObject Get(Vector3 position, Quaternion rotation)
    {
        var obj = pool.Get();
        obj.transform.position = position;
        obj.transform.rotation = rotation;
        activeObjects.Add(obj);
        return obj;
    }

    /// <summary>将对象归还到池中</summary>
    public void Release(GameObject obj)
    {
        if (activeObjects.Contains(obj))
        {
            activeObjects.Remove(obj);
            pool.Release(obj);
        }
    }

    /// <summary>归还所有活跃对象</summary>
    public void ReleaseAll()
    {
        var toRelease = new List<GameObject>(activeObjects);
        foreach (var obj in toRelease)
        {
            Release(obj);
        }
    }

    // ---- 池回调方法 ----

    private GameObject CreatePooledObject()
    {
        var obj = Instantiate(prefab, transform);
        obj.name = $"{prefab.name}_Pooled";
        return obj;
    }

    private void OnGetFromPool(GameObject obj)
    {
        obj.SetActive(true);
    }

    private void OnReturnToPool(GameObject obj)
    {
        obj.SetActive(false);
        obj.transform.SetParent(transform);
    }

    private void OnDestroyPooled(GameObject obj)
    {
        Destroy(obj);
    }

    /// <summary>当前池中可用的对象数</summary>
    public int CountInactive => pool.CountInactive;

    /// <summary>当前活跃的对象数</summary>
    public int CountActive => activeObjects.Count;
}
```

### 27.3.6 服务定位器模式（Service Locator）

**用途**：提供全局访问服务的方式，比单例更灵活——可以替换具体实现（用于测试）。

> **前端类比**：类似于 Angular 的依赖注入容器，或 React Context 的 Provider。

```csharp
// ============================================================
// ServiceLocator.cs — 服务定位器
// 放置路径：Assets/_Game/Core/ServiceLocator/ServiceLocator.cs
// ============================================================

using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 服务定位器
/// 提供全局的服务注册和获取功能
///
/// 优势相比单例：
/// 1. 面向接口编程——依赖抽象而非具体实现
/// 2. 可以替换实现（如测试时替换为 Mock）
/// 3. 更清晰的依赖关系
/// 4. 不强制继承特定基类
///
/// 前端类比：
/// - Angular: this.service = inject(MyService)
/// - React: const service = useContext(ServiceContext)
/// </summary>
public static class ServiceLocator
{
    /// <summary>已注册的服务字典</summary>
    private static Dictionary<Type, object> services = new Dictionary<Type, object>();

    /// <summary>已注册的懒加载服务工厂</summary>
    private static Dictionary<Type, Func<object>> factories = new Dictionary<Type, Func<object>>();

    /// <summary>
    /// 注册服务实例
    /// 类似于 Angular 的 { provide: IService, useValue: serviceInstance }
    /// </summary>
    /// <typeparam name="T">服务接口类型</typeparam>
    /// <param name="service">服务实例</param>
    public static void Register<T>(T service) where T : class
    {
        var type = typeof(T);

        if (services.ContainsKey(type))
        {
            Debug.LogWarning($"[ServiceLocator] 覆盖已存在的服务: {type.Name}");
        }

        services[type] = service;
        Debug.Log($"[ServiceLocator] 注册服务: {type.Name} → {service.GetType().Name}");
    }

    /// <summary>
    /// 注册服务工厂（懒加载）
    /// 服务在首次获取时才创建
    /// 类似于 Angular 的 { provide: IService, useFactory: () => new Service() }
    /// </summary>
    /// <typeparam name="T">服务接口类型</typeparam>
    /// <param name="factory">创建服务实例的工厂方法</param>
    public static void RegisterFactory<T>(Func<T> factory) where T : class
    {
        factories[typeof(T)] = () => factory();
        Debug.Log($"[ServiceLocator] 注册服务工厂: {typeof(T).Name}");
    }

    /// <summary>
    /// 获取服务实例
    /// 类似于 Angular 的 inject(IService) 或 React 的 useContext()
    /// </summary>
    /// <typeparam name="T">服务接口类型</typeparam>
    /// <returns>服务实例</returns>
    /// <exception cref="InvalidOperationException">服务未注册时抛出</exception>
    public static T Get<T>() where T : class
    {
        var type = typeof(T);

        // 尝试直接获取
        if (services.TryGetValue(type, out object service))
        {
            return (T)service;
        }

        // 尝试使用工厂创建
        if (factories.TryGetValue(type, out Func<object> factory))
        {
            var instance = (T)factory();
            services[type] = instance; // 缓存创建的实例
            factories.Remove(type);    // 移除工厂（只创建一次）
            Debug.Log($"[ServiceLocator] 通过工厂创建服务: {type.Name}");
            return instance;
        }

        throw new InvalidOperationException(
            $"[ServiceLocator] 服务未注册: {type.Name}。" +
            $"请在 Awake 或 初始化阶段调用 ServiceLocator.Register<{type.Name}>()");
    }

    /// <summary>
    /// 尝试获取服务（不抛异常）
    /// </summary>
    /// <typeparam name="T">服务接口类型</typeparam>
    /// <param name="service">获取到的服务实例</param>
    /// <returns>是否成功获取</returns>
    public static bool TryGet<T>(out T service) where T : class
    {
        try
        {
            service = Get<T>();
            return true;
        }
        catch
        {
            service = null;
            return false;
        }
    }

    /// <summary>
    /// 注销服务
    /// </summary>
    /// <typeparam name="T">服务接口类型</typeparam>
    public static void Unregister<T>() where T : class
    {
        var type = typeof(T);
        services.Remove(type);
        factories.Remove(type);
        Debug.Log($"[ServiceLocator] 注销服务: {type.Name}");
    }

    /// <summary>
    /// 清除所有服务（场景切换时调用）
    /// </summary>
    public static void Clear()
    {
        services.Clear();
        factories.Clear();
        Debug.Log("[ServiceLocator] 清除所有服务");
    }

    /// <summary>
    /// 检查服务是否已注册
    /// </summary>
    public static bool IsRegistered<T>() where T : class
    {
        var type = typeof(T);
        return services.ContainsKey(type) || factories.ContainsKey(type);
    }
}

// ========================================
// 使用示例
// ========================================

// 定义服务接口
public interface IAudioService
{
    void PlaySFX(string clipName);
    void PlayBGM(string clipName);
    void StopAll();
}

public interface ISaveService
{
    void Save(string key, object data);
    T Load<T>(string key);
}

// 实现服务
public class UnityAudioService : MonoBehaviour, IAudioService
{
    public void PlaySFX(string clipName)
    {
        Debug.Log($"播放音效: {clipName}");
    }
    public void PlayBGM(string clipName)
    {
        Debug.Log($"播放背景音乐: {clipName}");
    }
    public void StopAll()
    {
        Debug.Log("停止所有音频");
    }
}

/*
// 在初始化阶段注册服务
void Awake()
{
    var audioService = GetComponent<UnityAudioService>();
    ServiceLocator.Register<IAudioService>(audioService);
    ServiceLocator.Register<ISaveService>(new PlayerPrefsSaveService());
}

// 在其他地方使用服务
void PlayHitSound()
{
    ServiceLocator.Get<IAudioService>().PlaySFX("hit_01");
}
*/
```

### 27.3.7 MVC/MVP 模式

> **前端类比**：MVC 在 Unity 中的对应关系：
> ```
> 前端 MVC/MVVM            Unity MVC
> ─────────────            ─────────
> Model (数据/状态)    →    ScriptableObject / 数据类
> View (UI 渲染)       →    MonoBehaviour + UI 组件
> Controller (逻辑)    →    MonoBehaviour（游戏逻辑）
>
> React 对应：
> Model = useState / Redux Store
> View = JSX / 组件渲染
> Controller = useEffect / event handlers
> ```

---

## 27.4 ScriptableObject 架构

### 27.4.1 什么是数据驱动设计

ScriptableObject 是 Unity 中非常强大但常被忽视的特性。它允许你将**数据与逻辑分离**，在编辑器中可视化地配置数据。

```
传统方式（数据硬编码在代码中）：
class Sword : MonoBehaviour
{
    int damage = 10;        // 修改需要改代码，重新编译
    float attackSpeed = 1.5f;
}

ScriptableObject 方式（数据存在资源文件中）：
[CreateAssetMenu(menuName = "Items/Weapon")]
class WeaponData : ScriptableObject
{
    public string weaponName;
    public int damage;
    public float attackSpeed;
    public Sprite icon;
}

// 使用时引用资源
class Sword : MonoBehaviour
{
    [SerializeField] WeaponData data;  // 在 Inspector 中拖入
    // 修改数据只需要改资源文件，不需要重新编译代码！
}
```

> **前端类比**：ScriptableObject 类似于将配置外部化——如同将 UI 文案放在 JSON/i18n 文件中而不是硬编码在组件里。

### 27.4.2 运行时集合（Runtime Sets）

用 ScriptableObject 维护运行时的对象列表：

```csharp
/// <summary>
/// 运行时 GameObject 集合
/// 场景中的对象在生成时自动注册，销毁时自动注销
/// 其他系统可以通过这个集合访问所有注册的对象
/// </summary>
[CreateAssetMenu(menuName = "Runtime/GameObject Set")]
public class RuntimeGameObjectSet : ScriptableObject
{
    /// <summary>当前注册的对象列表</summary>
    private List<GameObject> items = new List<GameObject>();

    /// <summary>注册对象</summary>
    public void Register(GameObject obj)
    {
        if (!items.Contains(obj))
        {
            items.Add(obj);
        }
    }

    /// <summary>注销对象</summary>
    public void Unregister(GameObject obj)
    {
        items.Remove(obj);
    }

    /// <summary>获取所有注册的对象</summary>
    public IReadOnlyList<GameObject> GetAll() => items;

    /// <summary>获取数量</summary>
    public int Count => items.Count;

    /// <summary>场景切换时清理</summary>
    private void OnDisable()
    {
        items.Clear();
    }
}

// 使用示例：自动注册的组件
public class RuntimeSetMember : MonoBehaviour
{
    [SerializeField] private RuntimeGameObjectSet targetSet;

    private void OnEnable() => targetSet.Register(gameObject);
    private void OnDisable() => targetSet.Unregister(gameObject);
}
```

---

## 27.5 依赖注入简介

### 27.5.1 为什么需要依赖注入

当项目变大时，手动管理依赖变得困难：

```csharp
// 没有 DI：硬编码依赖（紧耦合）
class PlayerController : MonoBehaviour
{
    void Attack()
    {
        // 直接引用具体类——如果要改成网络版怎么办？
        AudioManager.Instance.PlaySFX("attack");
        UIManager.Instance.ShowDamage(10);
        AnalyticsService.Instance.LogEvent("attack");
    }
}

// 有 DI：注入抽象依赖（松耦合）
class PlayerController : MonoBehaviour
{
    [Inject] private IAudioService audioService;
    [Inject] private IUIService uiService;
    [Inject] private IAnalyticsService analyticsService;

    void Attack()
    {
        audioService.PlaySFX("attack");
        uiService.ShowDamage(10);
        analyticsService.LogEvent("attack");
    }
}
```

### 27.5.2 VContainer（推荐）

[VContainer](https://github.com/hadashiA/VContainer) 是一个轻量级的 Unity 依赖注入框架：

```csharp
// 安装：Package Manager → Add package from Git URL
// https://github.com/hadashiA/VContainer.git?path=VContainer/Assets/VContainer

// 定义注入范围
public class GameLifetimeScope : LifetimeScope
{
    protected override void Configure(IContainerBuilder builder)
    {
        // 注册服务
        builder.Register<IAudioService, UnityAudioService>(Lifetime.Singleton);
        builder.Register<ISaveService, PlayerPrefsSaveService>(Lifetime.Singleton);

        // 注册 MonoBehaviour
        builder.RegisterComponentInHierarchy<PlayerController>();
    }
}
```

> **前端类比**：VContainer 类似于 Angular 的 Module + Provider 系统，或者 InversifyJS。

### 27.5.3 选择建议

```
项目规模          推荐方案
──────          ────────
小型/原型        ServiceLocator 或 Singleton
中型            ServiceLocator + ScriptableObject Events
大型            VContainer 或 Zenject
```

---

## 27.6 GameManager.cs — 游戏管理器

```csharp
// ============================================================
// GameManager.cs — 游戏核心管理器
// 放置路径：Assets/_Game/Managers/GameManager.cs
// 功能：管理游戏生命周期、状态切换、全局配置
// ============================================================

using UnityEngine;
using UnityEngine.SceneManagement;
using System;

/// <summary>
/// 游戏全局状态
/// </summary>
public enum GameState
{
    Initializing,  // 初始化中
    MainMenu,      // 主菜单
    Loading,       // 加载中
    Playing,       // 游戏中
    Paused,        // 暂停
    GameOver,      // 游戏结束
    Victory        // 胜利
}

/// <summary>
/// 游戏核心管理器
/// 负责管理游戏的全局状态和生命周期
/// 使用状态机模式管理游戏流程
/// </summary>
public class GameManager : Singleton<GameManager>
{
    // ========================================
    // 配置
    // ========================================

    [Header("场景配置")]
    [SerializeField] private string mainMenuScene = "MainMenu";
    [SerializeField] private string gameplayScene = "Gameplay";
    [SerializeField] private string loadingScene = "Loading";

    [Header("游戏配置")]
    [SerializeField] private int targetFrameRate = 60;
    [SerializeField] private bool showDebugInfo = false;

    [Header("事件通道")]
    [SerializeField] private VoidEventChannel onGameStarted;
    [SerializeField] private VoidEventChannel onGamePaused;
    [SerializeField] private VoidEventChannel onGameResumed;
    [SerializeField] private VoidEventChannel onGameOver;

    // ========================================
    // 状态
    // ========================================

    /// <summary>当前游戏状态</summary>
    public GameState CurrentState { get; private set; } = GameState.Initializing;

    /// <summary>游戏状态变化事件</summary>
    public event Action<GameState, GameState> OnGameStateChanged;

    /// <summary>游戏是否暂停</summary>
    public bool IsPaused => CurrentState == GameState.Paused;

    /// <summary>游戏是否正在进行</summary>
    public bool IsPlaying => CurrentState == GameState.Playing;

    /// <summary>游戏已运行时间（不含暂停）</summary>
    public float PlayTime { get; private set; }

    // ========================================
    // 初始化
    // ========================================

    protected override void Awake()
    {
        base.Awake();

        // 设置目标帧率
        Application.targetFrameRate = targetFrameRate;

        // 防止设备休眠（移动端游戏需要）
        Screen.sleepTimeout = SleepTimeout.NeverSleep;

        // 注册到服务定位器
        ServiceLocator.Register<GameManager>(this);

        Debug.Log("[GameManager] 初始化完成");
    }

    private void Start()
    {
        // 初始化完成，进入主菜单状态
        ChangeState(GameState.MainMenu);
    }

    private void Update()
    {
        // 更新游戏时间
        if (CurrentState == GameState.Playing)
        {
            PlayTime += Time.deltaTime;
        }

        // 处理暂停输入（Escape 键或返回键）
        if (Input.GetKeyDown(KeyCode.Escape))
        {
            if (CurrentState == GameState.Playing)
            {
                PauseGame();
            }
            else if (CurrentState == GameState.Paused)
            {
                ResumeGame();
            }
        }
    }

    protected override void OnDestroy()
    {
        ServiceLocator.Unregister<GameManager>();
        base.OnDestroy();
    }

    // ========================================
    // 状态管理
    // ========================================

    /// <summary>
    /// 切换游戏状态
    /// </summary>
    /// <param name="newState">目标状态</param>
    public void ChangeState(GameState newState)
    {
        if (CurrentState == newState) return;

        GameState oldState = CurrentState;
        CurrentState = newState;

        // 处理状态退出
        OnExitState(oldState);

        // 处理状态进入
        OnEnterState(newState);

        // 触发事件
        OnGameStateChanged?.Invoke(oldState, newState);

        Debug.Log($"[GameManager] 状态切换: {oldState} → {newState}");
    }

    /// <summary>
    /// 进入状态时的处理
    /// </summary>
    private void OnEnterState(GameState state)
    {
        switch (state)
        {
            case GameState.MainMenu:
                Time.timeScale = 1f;
                // Cursor.visible = true;
                // Cursor.lockState = CursorLockMode.None;
                break;

            case GameState.Playing:
                Time.timeScale = 1f;
                onGameStarted?.Raise();
                // Cursor.visible = false;
                // Cursor.lockState = CursorLockMode.Locked;
                break;

            case GameState.Paused:
                Time.timeScale = 0f; // 暂停游戏（所有基于 Time.deltaTime 的逻辑会停止）
                onGamePaused?.Raise();
                // Cursor.visible = true;
                // Cursor.lockState = CursorLockMode.None;
                break;

            case GameState.GameOver:
                Time.timeScale = 0f;
                onGameOver?.Raise();
                break;

            case GameState.Victory:
                // 可以放慢时间做特效
                Time.timeScale = 0.3f;
                break;
        }
    }

    /// <summary>
    /// 离开状态时的处理
    /// </summary>
    private void OnExitState(GameState state)
    {
        switch (state)
        {
            case GameState.Paused:
                Time.timeScale = 1f; // 恢复时间流速
                onGameResumed?.Raise();
                break;
        }
    }

    // ========================================
    // 公共方法
    // ========================================

    /// <summary>
    /// 开始新游戏
    /// </summary>
    public void StartNewGame()
    {
        Debug.Log("[GameManager] 开始新游戏");
        PlayTime = 0f;
        LoadSceneAsync(gameplayScene, () =>
        {
            ChangeState(GameState.Playing);
        });
    }

    /// <summary>
    /// 暂停游戏
    /// </summary>
    public void PauseGame()
    {
        if (CurrentState == GameState.Playing)
        {
            ChangeState(GameState.Paused);
        }
    }

    /// <summary>
    /// 恢复游戏
    /// </summary>
    public void ResumeGame()
    {
        if (CurrentState == GameState.Paused)
        {
            ChangeState(GameState.Playing);
        }
    }

    /// <summary>
    /// 游戏结束
    /// </summary>
    public void TriggerGameOver()
    {
        ChangeState(GameState.GameOver);
    }

    /// <summary>
    /// 回到主菜单
    /// </summary>
    public void ReturnToMainMenu()
    {
        Time.timeScale = 1f;
        LoadSceneAsync(mainMenuScene, () =>
        {
            ChangeState(GameState.MainMenu);
        });
    }

    /// <summary>
    /// 重新开始当前关卡
    /// </summary>
    public void RestartLevel()
    {
        PlayTime = 0f;
        Time.timeScale = 1f;
        string currentScene = SceneManager.GetActiveScene().name;
        LoadSceneAsync(currentScene, () =>
        {
            ChangeState(GameState.Playing);
        });
    }

    /// <summary>
    /// 退出游戏
    /// </summary>
    public void QuitGame()
    {
        Debug.Log("[GameManager] 退出游戏");

#if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
#else
        Application.Quit();
#endif
    }

    // ========================================
    // 场景加载
    // ========================================

    /// <summary>
    /// 异步加载场景
    /// </summary>
    /// <param name="sceneName">场景名称</param>
    /// <param name="onComplete">加载完成回调</param>
    private async void LoadSceneAsync(string sceneName, Action onComplete = null)
    {
        ChangeState(GameState.Loading);

        AsyncOperation operation = SceneManager.LoadSceneAsync(sceneName);
        operation.allowSceneActivation = false;

        // 等待加载到 90%（Unity 在 90% 时暂停，等待 allowSceneActivation）
        while (operation.progress < 0.9f)
        {
            float progress = Mathf.Clamp01(operation.progress / 0.9f);
            Debug.Log($"[GameManager] 加载进度: {progress * 100:F0}%");
            await System.Threading.Tasks.Task.Yield();
        }

        // 激活场景
        operation.allowSceneActivation = true;

        // 等待场景完全加载
        while (!operation.isDone)
        {
            await System.Threading.Tasks.Task.Yield();
        }

        Debug.Log($"[GameManager] 场景加载完成: {sceneName}");
        onComplete?.Invoke();
    }

    // ========================================
    // 调试信息
    // ========================================

    private void OnGUI()
    {
        if (!showDebugInfo) return;

        GUILayout.BeginArea(new Rect(10, 10, 300, 200));
        GUILayout.Label($"游戏状态: {CurrentState}");
        GUILayout.Label($"帧率: {1f / Time.unscaledDeltaTime:F0} FPS");
        GUILayout.Label($"游戏时间: {PlayTime:F1}s");
        GUILayout.Label($"Time.timeScale: {Time.timeScale}");
        GUILayout.EndArea();
    }
}
```

---

## 27.7 Unity 测试框架

### 27.7.1 测试类型

Unity 支持两种测试模式：

```
Edit Mode 测试（快速，不需要运行游戏）：
├── 测试纯 C# 逻辑
├── 不依赖 MonoBehaviour 生命周期
├── 运行速度快
└── 适合：数据处理、数学计算、状态机逻辑

Play Mode 测试（需要运行游戏场景）：
├── 测试运行时行为
├── 可以测试 MonoBehaviour
├── 可以等待帧、等待时间
├── 运行速度慢
└── 适合：游戏逻辑、UI 交互、碰撞检测
```

> **前端类比**：
> - Edit Mode 测试 = Jest 单元测试
> - Play Mode 测试 = Cypress / Playwright E2E 测试

### 27.7.2 设置测试

1. 打开 **Window → General → Test Runner**
2. 创建测试程序集：
   - 在要放测试的文件夹中创建 Assembly Definition
   - 勾选 **Test Assemblies**
   - 添加引用：`UnityEngine.TestRunner` 和 `UnityEditor.TestRunner`

### 27.7.3 Edit Mode 测试示例

```csharp
// ============================================================
// StateMachineTests.cs — 状态机单元测试
// 放置路径：Assets/Tests/EditMode/StateMachineTests.cs
// ============================================================

using NUnit.Framework;

[TestFixture]
public class StateMachineTests
{
    private StateMachine stateMachine;

    /// <summary>每个测试前执行（类似于 Jest 的 beforeEach）</summary>
    [SetUp]
    public void SetUp()
    {
        stateMachine = new StateMachine();
    }

    [Test]
    public void RegisterState_ShouldStoreState()
    {
        // Arrange（准备）
        var mockState = new MockState(stateMachine);

        // Act（执行）
        stateMachine.RegisterState<MockState>(mockState);

        // Assert（断言）
        Assert.IsNotNull(stateMachine.GetState<MockState>());
    }

    [Test]
    public void ChangeState_ShouldCallEnterAndExit()
    {
        // Arrange
        var stateA = new MockState(stateMachine);
        var stateB = new MockState(stateMachine);
        stateMachine.RegisterState<MockState>(stateA);
        stateMachine.RegisterState<MockStateB>(stateB);

        // Act
        stateMachine.ChangeState<MockState>();
        stateMachine.ChangeState<MockStateB>();

        // Assert
        Assert.IsTrue(stateA.WasEntered, "StateA 应该被进入过");
        Assert.IsTrue(stateA.WasExited, "StateA 应该被退出过");
        Assert.IsTrue(stateB.WasEntered, "StateB 应该被进入过");
    }

    [Test]
    public void IsInState_ShouldReturnCorrectState()
    {
        var state = new MockState(stateMachine);
        stateMachine.RegisterState<MockState>(state);

        stateMachine.ChangeState<MockState>();

        Assert.IsTrue(stateMachine.IsInState<MockState>());
    }

    [Test]
    public void ChangeState_ShouldFireEvent()
    {
        var state = new MockState(stateMachine);
        stateMachine.RegisterState<MockState>(state);

        bool eventFired = false;
        stateMachine.OnStateChanged += (oldState, newState) => eventFired = true;

        stateMachine.ChangeState<MockState>();

        Assert.IsTrue(eventFired, "状态变化事件应该被触发");
    }

    // ---- Mock 状态类 ----

    private class MockState : BaseState
    {
        public bool WasEntered { get; private set; }
        public bool WasExited { get; private set; }

        public MockState(StateMachine sm) : base(sm) { }

        public override void Enter()
        {
            WasEntered = true;
        }

        public override void Exit()
        {
            WasExited = true;
        }
    }

    private class MockStateB : BaseState
    {
        public bool WasEntered { get; private set; }

        public MockStateB(StateMachine sm) : base(sm) { }

        public override void Enter()
        {
            WasEntered = true;
        }
    }
}

// ========================================
// ServiceLocator 测试
// ========================================

[TestFixture]
public class ServiceLocatorTests
{
    [SetUp]
    public void SetUp()
    {
        ServiceLocator.Clear();
    }

    [TearDown]
    public void TearDown()
    {
        ServiceLocator.Clear();
    }

    [Test]
    public void Register_And_Get_ShouldReturnSameInstance()
    {
        // Arrange
        var service = new MockAudioService();

        // Act
        ServiceLocator.Register<IMockService>(service);
        var retrieved = ServiceLocator.Get<IMockService>();

        // Assert
        Assert.AreSame(service, retrieved);
    }

    [Test]
    public void Get_UnregisteredService_ShouldThrow()
    {
        Assert.Throws<System.InvalidOperationException>(() =>
        {
            ServiceLocator.Get<IMockService>();
        });
    }

    [Test]
    public void RegisterFactory_ShouldCreateOnFirstGet()
    {
        int createCount = 0;
        ServiceLocator.RegisterFactory<IMockService>(() =>
        {
            createCount++;
            return new MockAudioService();
        });

        // 获取两次，应该只创建一次（缓存）
        ServiceLocator.Get<IMockService>();
        ServiceLocator.Get<IMockService>();

        Assert.AreEqual(1, createCount);
    }

    [Test]
    public void IsRegistered_ShouldReturnCorrectly()
    {
        Assert.IsFalse(ServiceLocator.IsRegistered<IMockService>());

        ServiceLocator.Register<IMockService>(new MockAudioService());

        Assert.IsTrue(ServiceLocator.IsRegistered<IMockService>());
    }

    // ---- Mock ----
    private interface IMockService { }
    private class MockAudioService : IMockService { }
}
```

[截图：Test Runner 窗口，显示测试结果（绿色通过标记）]

### 27.7.4 Play Mode 测试示例

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

public class GameManagerPlayTests
{
    [UnityTest]
    public IEnumerator GameManager_PauseAndResume_ShouldChangeTimeScale()
    {
        // Arrange: 创建 GameManager
        var go = new GameObject("GameManager");
        var gm = go.AddComponent<GameManager>();

        yield return null; // 等待一帧让 Start 执行

        // 模拟进入 Playing 状态
        gm.ChangeState(GameState.Playing);
        yield return null;

        // Act: 暂停
        gm.PauseGame();
        yield return null;

        // Assert: 时间应该停止
        Assert.AreEqual(0f, Time.timeScale, "暂停时 timeScale 应为 0");
        Assert.AreEqual(GameState.Paused, gm.CurrentState);

        // Act: 恢复
        gm.ResumeGame();
        yield return null;

        // Assert: 时间应该恢复
        Assert.AreEqual(1f, Time.timeScale, "恢复时 timeScale 应为 1");
        Assert.AreEqual(GameState.Playing, gm.CurrentState);

        // Cleanup
        Object.Destroy(go);
    }
}
```

---

## 27.8 调试工具和技巧

### 27.8.1 常用调试方法

```csharp
// 基础日志
Debug.Log("普通信息");
Debug.LogWarning("警告信息");
Debug.LogError("错误信息");

// 带颜色的日志（在 Console 中更容易识别）
Debug.Log("<color=green>[成功]</color> 玩家已生成");
Debug.Log("<color=yellow>[警告]</color> 内存使用超过 80%");
Debug.Log("<color=red>[错误]</color> 网络连接失败");

// 带上下文对象的日志（点击日志会选中对应 GameObject）
Debug.Log("玩家受伤", this.gameObject);

// 在 Scene 视图中绘制调试图形
Debug.DrawRay(transform.position, transform.forward * 10, Color.red, 1f);
Debug.DrawLine(pointA, pointB, Color.green);

// 在 Game 视图中绘制（需要在 OnDrawGizmos 中）
void OnDrawGizmosSelected()
{
    Gizmos.color = Color.yellow;
    Gizmos.DrawWireSphere(transform.position, attackRange);
}
```

### 27.8.2 性能分析工具

```
Unity 内置工具：
├── Profiler (Window → Analysis → Profiler)
│   ├── CPU Usage: 查看每帧的 CPU 时间分布
│   ├── GPU Usage: 查看渲染性能
│   ├── Memory: 查看内存分配和 GC
│   └── 可以连接到真机进行分析
│
├── Frame Debugger (Window → Analysis → Frame Debugger)
│   └── 逐步查看每个 Draw Call
│
└── Memory Profiler（Package Manager 安装）
    └── 查看详细的内存快照
```

---

## 27.9 版本控制最佳实践

### 27.9.1 .gitignore

```
# Unity 项目 .gitignore 核心内容

# Unity 生成的文件夹
/[Ll]ibrary/
/[Tt]emp/
/[Oo]bj/
/[Bb]uild/
/[Bb]uilds/
/[Ll]ogs/
/[Uu]ser[Ss]ettings/

# IDE
.vs/
.vscode/
*.csproj
*.sln
*.suo
*.user
*.pidb
*.booproj

# OS
.DS_Store
Thumbs.db

# 构建输出
*.apk
*.aab
*.ipa
*.unitypackage

# Crashlytics
crashlytics-build.properties

# Addressables
/[Aa]ssets/[Aa]ddressable[Aa]ssets[Dd]ata/*/*.bin*
/[Aa]ssets/[Ss]treamingAssets/aa.meta
/[Aa]ssets/[Ss]treamingAssets/aa/*
```

### 27.9.2 Git LFS

大文件不适合直接存在 Git 中。使用 **Git LFS**（Large File Storage）：

```bash
# 安装 Git LFS（Mac）
brew install git-lfs
git lfs install

# 跟踪大文件类型
git lfs track "*.png"
git lfs track "*.jpg"
git lfs track "*.wav"
git lfs track "*.mp3"
git lfs track "*.fbx"
git lfs track "*.psd"
git lfs track "*.tga"
git lfs track "*.tif"
git lfs track "*.exr"
git lfs track "*.unitypackage"

# 确保 .gitattributes 被提交
git add .gitattributes
git commit -m "Configure Git LFS tracking"
```

### 27.9.3 Unity 项目版本控制设置

```
Edit → Project Settings → Editor
├── Version Control
│   └── Mode: Visible Meta Files
│       (确保 .meta 文件可见并提交到 Git)
│
└── Asset Serialization
    └── Mode: Force Text
        (使用文本格式序列化，便于 Git diff 和合并)
```

---

## 27.10 CI/CD 与 GitHub Actions

### 27.10.1 使用 GameCI 的 GitHub Actions

[GameCI](https://game.ci) 提供了专门用于 Unity 的 GitHub Actions：

```yaml
# .github/workflows/unity-build.yml
# Unity CI/CD 构建管线

name: Unity Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}

jobs:
  # ============================================
  # 测试任务
  # ============================================
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - uses: actions/cache@v3
        with:
          path: Library
          key: Library-test-${{ hashFiles('Assets/**', 'Packages/**', 'ProjectSettings/**') }}
          restore-keys: Library-test-

      # 运行 Edit Mode 和 Play Mode 测试
      - uses: game-ci/unity-test-runner@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
        with:
          projectPath: .
          testMode: all
          artifactsPath: test-results
          githubToken: ${{ secrets.GITHUB_TOKEN }}

      # 上传测试结果
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: Test Results
          path: test-results

  # ============================================
  # Android 构建任务
  # ============================================
  build-android:
    name: Build Android
    runs-on: ubuntu-latest
    needs: test  # 测试通过后才构建
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - uses: actions/cache@v3
        with:
          path: Library
          key: Library-android-${{ hashFiles('Assets/**', 'Packages/**', 'ProjectSettings/**') }}
          restore-keys: Library-android-

      - uses: game-ci/unity-builder@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
        with:
          targetPlatform: Android
          androidAppBundle: true
          androidKeystoreName: user.keystore
          androidKeystoreBase64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          androidKeystorePass: ${{ secrets.ANDROID_KEYSTORE_PASS }}
          androidKeyaliasName: ${{ secrets.ANDROID_KEY_ALIAS }}
          androidKeyaliasPass: ${{ secrets.ANDROID_KEY_ALIAS_PASS }}

      - uses: actions/upload-artifact@v3
        with:
          name: Android Build
          path: build/Android

  # ============================================
  # iOS 构建任务（需要 macOS runner）
  # ============================================
  build-ios:
    name: Build iOS
    runs-on: macos-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - uses: actions/cache@v3
        with:
          path: Library
          key: Library-ios-${{ hashFiles('Assets/**', 'Packages/**', 'ProjectSettings/**') }}
          restore-keys: Library-ios-

      - uses: game-ci/unity-builder@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
        with:
          targetPlatform: iOS

      - uses: actions/upload-artifact@v3
        with:
          name: iOS Build
          path: build/iOS
```

### 27.10.2 设置 GitHub Secrets

在 GitHub 仓库的 **Settings → Secrets → Actions** 中添加：

```
必须的 Secrets:
├── UNITY_LICENSE        // Unity 许可证文件内容
├── ANDROID_KEYSTORE_BASE64  // Keystore 文件的 Base64 编码
├── ANDROID_KEYSTORE_PASS    // Keystore 密码
├── ANDROID_KEY_ALIAS        // Key 别名
└── ANDROID_KEY_ALIAS_PASS   // Key 密码
```

获取 Unity License：

```bash
# 使用 GameCI 的 activation 工作流获取许可证
# 详见: https://game.ci/docs/github/activation
```

---

## 27.11 与前端架构的对比

### 27.11.1 架构模式映射

```
前端概念                        Unity 对应
──────                        ──────────
组件 (React Component)     →   MonoBehaviour (GameObject 上的组件)
Props                      →   [SerializeField] 字段
State (useState)           →   private 字段 + 属性
Context / Provider         →   ServiceLocator / ScriptableObject
Redux Store                →   ScriptableObject 数据 + 事件
Redux Action / Dispatch    →   EventChannel.Raise() / ServerRpc
useEffect / Lifecycle      →   Awake/Start/OnEnable/OnDestroy
React.lazy / Suspense      →   Addressables 异步加载
CSS Modules                →   Material / Shader
React Router               →   SceneManager
npm packages               →   Unity Package Manager
Webpack/Vite               →   Asset Import Pipeline
ESLint                     →   Roslyn Analyzers
Jest                       →   Unity Test Framework (NUnit)
Storybook                  →   Prefab Preview / Custom Editor
Monorepo                   →   Assembly Definitions
GitHub Actions             →   GameCI + GitHub Actions
```

### 27.11.2 思维转换要点

```
1. 面向对象 vs 组合
   前端: 函数式组合 (hooks + HOC)
   Unity: 组件组合 (多个 MonoBehaviour 附加到 GameObject)

2. 渲染循环
   前端: 虚拟 DOM diff + 按需渲染
   Unity: 每帧全部重绘 (Update 每帧调用)

3. 状态管理
   前端: 不可变状态 + 单向数据流
   Unity: 可变状态 + 事件通知 (或不可变 ScriptableObject 数据)

4. 异步处理
   前端: Promise / async-await
   Unity: Coroutine / async-await / UniTask

5. 性能优化关注点
   前端: 减少渲染、减少包体、代码分割
   Unity: 减少 Draw Call、GC 优化、对象池、LOD
```

---

## 练习题

### 练习1：搭建项目框架（难度：简单）
按照 27.1 节推荐的文件夹结构，为你的开放世界游戏项目创建完整的文件夹结构。创建必要的 Assembly Definition 文件并验证编译正确。

### 练习2：实现事件系统（难度：中等）
使用 EventChannel 实现以下功能：
1. 玩家拾取金币 → 更新 UI 金币数量 + 播放音效 + 记录统计
2. 玩家死亡 → 显示 Game Over UI + 停止背景音乐 + 保存数据
3. 确保所有系统之间完全解耦（不直接引用彼此）

### 练习3：状态机实践（难度：中等）
为你的游戏实现两个状态机：
1. 角色状态机（Idle、Run、Jump、Attack、Die）
2. 游戏流程状态机（MainMenu、Loading、Playing、Paused、GameOver）
编写 Edit Mode 单元测试验证状态切换逻辑。

### 练习4：完整架构实践（难度：高级）
综合运用本章所学，搭建一个包含以下内容的完整项目框架：
1. ServiceLocator + ScriptableObject Events
2. GameManager 管理游戏流程
3. 对象池管理子弹/特效
4. Addressables 管理场景和预制体
5. 完整的 Edit Mode 测试覆盖核心逻辑
6. GitHub Actions CI/CD 配置

### 练习5：代码审查（难度：中等）
审查你项目中已有的代码，识别可以改进的地方：
1. 是否有硬编码的数据可以改用 ScriptableObject？
2. 是否有直接引用可以改用事件通道解耦？
3. 是否有频繁 Instantiate/Destroy 可以改用对象池？
4. 代码是否遵循命名规范？

---

## 下一章预告

恭喜你完成了**项目架构与设计模式**的学习！到这里，你已经掌握了从零开始构建一个专业级 Unity 项目所需的所有核心知识。

在后续的章节中，我们将把所有学到的知识综合运用，开始实际构建我们的 **3D 开放世界移动游戏**：
- 设计游戏的核心玩法循环
- 构建开放世界地图
- 实现任务系统
- 添加 NPC 和对话系统
- 集成所有系统形成完整游戏

作为一个有前端/全栈经验的开发者，你现在拥有了将 Web 开发的工程化思维与 Unity 游戏开发结合的能力。这是一个独特的优势——很多传统游戏开发者缺乏现代软件工程的经验，而你已经具备了这些。让我们继续前进，将愿景变为现实！
