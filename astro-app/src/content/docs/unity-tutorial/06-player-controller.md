# 第六章：第三人称角色控制器

## 本章目标

- 安装和配置 Unity 的新版 Input System
- 创建玩家 GameObject 并添加 CharacterController 组件
- 编写完整的第三人称移动脚本（WASD 移动）
- 实现奔跑和跳跃机制
- 处理重力和地面检测
- 安装 Cinemachine 并配置第三人称跟随摄像机
- 实现角色朝向移动方向旋转
- 完成两个完整的生产级脚本：ThirdPersonController.cs 和 CameraController.cs

## 预计学习时间

**4-5 小时**（包含安装配置时间，建议边写代码边测试）

---

## 6.1 安装 Input System 包

Unity 有两套输入系统：
- **旧版（Input Manager）：** `Input.GetAxis("Horizontal")` — 简单但功能有限
- **新版（Input System Package）：** 更强大、更灵活，支持多设备和动作映射

我们使用新版 Input System，因为它更适合现代游戏开发（尤其是移动端和手柄支持）。

### 6.1.1 通过 Package Manager 安装

1. 菜单栏 > **Window > Package Manager**
2. 左上角下拉菜单选择 **Unity Registry**（Unity 官方包）
3. 在搜索框中输入 `Input System`
4. 找到 **Input System** 包（com.unity.inputsystem）
5. 点击右下角 **Install** 按钮

[截图：Package Manager 中 Input System 包的安装界面]

6. 安装完成后，Unity 会弹出对话框询问是否启用新版 Input System
7. 选择 **Yes** — 这会重启编辑器

> **注意：** 启用新版 Input System 后，旧版的 `Input.GetKey()` 等方法默认仍然可用。Unity 允许两套系统共存。可以在 **Edit > Project Settings > Player > Other Settings > Active Input Handling** 中选择 `Both` 来同时使用两套系统。

### 6.1.2 验证安装

重启后验证安装是否成功：
1. **Edit > Project Settings > Player**
2. 展开 **Other Settings**
3. 找到 **Active Input Handling**
4. 确认选择的是 **Input System Package (New)** 或 **Both**

[截图：Project Settings 中 Active Input Handling 的设置，选择 Both]

### 6.1.3 创建 Input Actions 资产

Input Actions 资产定义了游戏中所有的输入动作映射。

1. 在 Project 窗口中创建文件夹 `Assets/Input`
2. 右键 > **Create > Input Actions**
3. 命名为 `PlayerInputActions`
4. 双击打开 Input Actions 编辑器

[截图：新创建的 Input Actions 资产文件]

### 6.1.4 配置输入动作

在 Input Actions 编辑器中进行以下配置：

**创建 Action Map：**
1. 左侧面板点击 **+** 创建 Action Map
2. 命名为 `Player`

**添加 Move 动作：**
1. 中间面板点击 **+** 添加 Action
2. 命名为 `Move`
3. Action Type 选择 **Value**
4. Control Type 选择 **Vector2**
5. 添加绑定（Bindings）：
   - 点击 `Move` 旁边的 **+** > **Add Up/Down/Left/Right Composite**
   - 命名为 `WASD`
   - Up: 绑定 `W` 键（点击 Path > Keyboard > W）
   - Down: 绑定 `S` 键
   - Left: 绑定 `A` 键
   - Right: 绑定 `D` 键
6. 再添加一组绑定：
   - **Add Up/Down/Left/Right Composite** > 命名为 `Arrows`
   - 绑定上下左右方向键

[截图：Move 动作的 WASD 绑定配置]

**添加 Jump 动作：**
1. 点击 **+** 添加 Action
2. 命名为 `Jump`
3. Action Type 选择 **Button**
4. 添加绑定：`Space` 键

**添加 Sprint 动作：**
1. 点击 **+** 添加 Action
2. 命名为 `Sprint`
3. Action Type 选择 **Button**
4. 添加绑定：`Left Shift` 键

**添加 Look 动作：**
1. 点击 **+** 添加 Action
2. 命名为 `Look`
3. Action Type 选择 **Value**
4. Control Type 选择 **Vector2**
5. 添加绑定：**Mouse > Delta**（鼠标移动增量）

[截图：完整的 Player Action Map，显示 Move、Jump、Sprint、Look 四个动作]

6. 点击窗口顶部的 **Save Asset** 保存
7. 关闭 Input Actions 编辑器

### 6.1.5 生成 C# 代码

为了在代码中方便地使用输入动作：

1. 在 Project 窗口中选中 `PlayerInputActions` 资产
2. 在 Inspector 中勾选 **Generate C# Class**
3. 确认生成路径和类名
4. 点击 **Apply**

[截图：PlayerInputActions 的 Inspector，勾选 Generate C# Class]

这会自动生成一个 `PlayerInputActions.cs` 文件，提供强类型的输入访问接口。

---

## 6.2 创建玩家 GameObject

### 6.2.1 组装玩家角色

在正式模型导入之前，我们使用基础几何体搭建一个占位角色：

1. 创建空 GameObject，命名为 `Player`
2. 设置 Transform：
   - Position: (0, 0, 0)

3. 添加子物体 —— 角色身体（Capsule）：
   - Hierarchy > 右键 Player > **3D Object > Capsule**
   - 命名为 `Body`
   - Transform:
     - Position: (0, 1, 0) — 本地坐标，相对于 Player
     - Scale: (1, 1, 1)
   - 应用一个材质（如蓝色材质）

4. 添加子物体 —— 方向指示器（Cube）：
   - Hierarchy > 右键 Player > **3D Object > Cube**
   - 命名为 `FrontIndicator`
   - Transform:
     - Position: (0, 1.2, 0.5) — 放在角色前方，表示面朝方向
     - Scale: (0.2, 0.2, 0.3)
   - 应用橙色材质

[截图：由 Capsule 和小 Cube 组成的玩家占位角色]

### 6.2.2 添加 CharacterController 组件

CharacterController 是 Unity 内置的角色控制组件，提供了基础的移动和碰撞检测功能，比直接使用 Rigidbody 更适合角色控制。

1. 选中 `Player` GameObject
2. Inspector > **Add Component** > 搜索 `Character Controller`
3. 调整参数：

```
Character Controller:
  Slope Limit: 45          ← 可以走上的最大坡度
  Step Offset: 0.3         ← 可以踏上的最大台阶高度
  Skin Width: 0.08         ← 碰撞检测的"皮肤"厚度
  Min Move Distance: 0.001 ← 最小移动距离
  Center: (0, 1, 0)        ← 碰撞胶囊体的中心（与角色模型对齐）
  Radius: 0.5              ← 碰撞胶囊体半径
  Height: 2                ← 碰撞胶囊体高度
```

[截图：CharacterController 组件的参数设置，Scene 视图中显示绿色的胶囊体碰撞边界]

> **CharacterController vs Rigidbody：**
> - **CharacterController：** 代码直接控制移动，内置坡度和台阶处理，不受物理引擎影响。适合玩家角色。
> - **Rigidbody：** 受物理引擎影响（重力、碰撞反弹），适合需要物理模拟的物体。
> - 一般玩家角色用 CharacterController，NPC 或物理物体用 Rigidbody。

### 6.2.3 设置 Player Tag

1. 选中 `Player` GameObject
2. 在 Inspector 顶部的 **Tag** 下拉菜单中选择 `Player`

如果没有 `Player` 标签：
1. 点击 **Tag** 下拉菜单 > **Add Tag...**
2. 点击 **+** 添加 `Player` 标签
3. 回到 Player 物体，选择刚创建的标签

[截图：设置 Player 标签的界面]

---

## 6.3 编写第三人称移动脚本

### 6.3.1 创建 ThirdPersonController.cs

在 `Assets/Scripts` 文件夹中创建新的 C# 脚本，命名为 `ThirdPersonController`。

以下是完整的、带详细注释的控制器脚本：

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// 第三人称角色控制器
/// 处理移动、跳跃、奔跑、重力和地面检测
///
/// 使用方法：
/// 1. 将此脚本附加到 Player GameObject 上
/// 2. 确保 Player 有 CharacterController 组件
/// 3. 在 Inspector 中配置参数
/// 4. 绑定 PlayerInputActions 资产
/// </summary>
[RequireComponent(typeof(CharacterController))]
// RequireComponent 确保此脚本所在的 GameObject 必须有 CharacterController
// 类似前端中的 TypeScript 类型约束，但这里是运行时的组件依赖约束
public class ThirdPersonController : MonoBehaviour
{
    // ============================================================
    // Inspector 中可配置的参数
    // ============================================================

    [Header("移动设置")]
    [Tooltip("角色行走速度（米/秒）")]
    [SerializeField] private float walkSpeed = 4f;

    [Tooltip("角色奔跑速度（米/秒）")]
    [SerializeField] private float sprintSpeed = 8f;

    [Tooltip("角色转向的平滑时间（秒）")]
    [SerializeField] private float rotationSmoothTime = 0.12f;

    [Tooltip("移动速度变化的平滑时间（秒）")]
    [SerializeField] private float speedSmoothTime = 0.1f;

    [Header("跳跃设置")]
    [Tooltip("跳跃高度（米）")]
    [SerializeField] private float jumpHeight = 1.2f;

    [Tooltip("重力加速度（正数）")]
    [SerializeField] private float gravity = 20f;

    [Tooltip("落地后的短暂冷却时间（秒），防止连续跳跃")]
    [SerializeField] private float jumpCooldown = 0.15f;

    [Tooltip("允许在离开地面后的短暂时间内跳跃（土狼时间/Coyote Time）")]
    [SerializeField] private float coyoteTime = 0.15f;

    [Header("地面检测")]
    [Tooltip("地面检测球的偏移量（相对于角色底部）")]
    [SerializeField] private float groundCheckOffset = -0.14f;

    [Tooltip("地面检测球的半径")]
    [SerializeField] private float groundCheckRadius = 0.28f;

    [Tooltip("哪些层被视为地面")]
    [SerializeField] private LayerMask groundLayers = ~0;
    // ~0 表示所有层，实际开发中应该只选择地面层

    [Header("摄像机")]
    [Tooltip("用于确定移动方向的摄像机 Transform")]
    [SerializeField] private Transform cameraTransform;

    // ============================================================
    // 私有变量
    // ============================================================

    // 组件引用
    private CharacterController _controller;     // 角色控制器组件
    private PlayerInputActions _inputActions;     // 输入动作资产
    private InputAction _moveAction;              // 移动输入动作
    private InputAction _jumpAction;              // 跳跃输入动作
    private InputAction _sprintAction;            // 奔跑输入动作

    // 移动状态
    private Vector3 _velocity;                    // 当前速度向量（包含重力）
    private float _currentSpeed;                  // 当前移动速度
    private float _speedSmoothVelocity;           // 速度平滑的中间变量
    private float _rotationSmoothVelocity;        // 旋转平滑的中间变量
    private float _targetRotation;                // 目标旋转角度

    // 跳跃和地面状态
    private bool _isGrounded;                     // 是否在地面上
    private bool _wasGroundedLastFrame;            // 上一帧是否在地面上
    private float _lastGroundedTime;              // 上次在地面的时间
    private float _lastJumpTime;                  // 上次跳跃的时间
    private float _verticalVelocity;              // 垂直方向速度

    // ============================================================
    // Unity 生命周期方法
    // ============================================================

    /// <summary>
    /// 初始化：获取组件引用，设置输入系统
    /// 类似 React 的 constructor + componentDidMount
    /// </summary>
    void Awake()
    {
        // 获取组件引用
        _controller = GetComponent<CharacterController>();

        // 如果没有手动指定摄像机，使用主摄像机
        if (cameraTransform == null)
        {
            cameraTransform = Camera.main?.transform;
        }

        // 初始化输入系统
        _inputActions = new PlayerInputActions();
    }

    /// <summary>
    /// 启用时注册输入动作
    /// 类似 React 的 useEffect 中注册事件监听器
    /// </summary>
    void OnEnable()
    {
        // 启用输入动作
        _inputActions.Player.Enable();

        // 获取动作引用（缓存以避免每帧查找）
        _moveAction = _inputActions.Player.Move;
        _jumpAction = _inputActions.Player.Jump;
        _sprintAction = _inputActions.Player.Sprint;
    }

    /// <summary>
    /// 禁用时注销输入动作
    /// 类似 React 的 useEffect 清理函数
    /// </summary>
    void OnDisable()
    {
        _inputActions.Player.Disable();
    }

    /// <summary>
    /// 每帧更新
    /// 类似 requestAnimationFrame 的回调
    /// </summary>
    void Update()
    {
        // 1. 地面检测
        CheckGrounded();

        // 2. 处理移动输入
        HandleMovement();

        // 3. 处理跳跃
        HandleJump();

        // 4. 应用重力
        ApplyGravity();

        // 5. 最终移动
        ApplyFinalMovement();
    }

    // ============================================================
    // 核心逻辑方法
    // ============================================================

    /// <summary>
    /// 地面检测
    /// 使用球形检测（OverlapSphere）来判断角色是否站在地面上
    /// 比 CharacterController.isGrounded 更可靠
    /// </summary>
    private void CheckGrounded()
    {
        // 记录上一帧的地面状态
        _wasGroundedLastFrame = _isGrounded;

        // 计算检测球的位置（角色脚底偏下一点）
        Vector3 spherePosition = new Vector3(
            transform.position.x,
            transform.position.y + groundCheckOffset,
            transform.position.z
        );

        // 球形重叠检测
        // Physics.CheckSphere 返回 bool，表示指定位置的球是否与任何碰撞体重叠
        _isGrounded = Physics.CheckSphere(
            spherePosition,       // 球心位置
            groundCheckRadius,    // 球半径
            groundLayers,         // 检测哪些层
            QueryTriggerInteraction.Ignore // 忽略触发器
        );

        // 记录最后一次在地面的时间（用于 Coyote Time）
        if (_isGrounded)
        {
            _lastGroundedTime = Time.time;
        }

        // 刚着地时，重置垂直速度
        if (_isGrounded && !_wasGroundedLastFrame)
        {
            OnLanded();
        }
    }

    /// <summary>
    /// 处理水平移动
    /// 读取输入，计算移动方向（相对于摄像机朝向），应用旋转
    /// </summary>
    private void HandleMovement()
    {
        // 读取移动输入（Vector2: x = 左右, y = 前后）
        Vector2 moveInput = _moveAction.ReadValue<Vector2>();

        // 判断是否在奔跑
        bool isSprinting = _sprintAction.IsPressed();

        // 计算目标速度
        float targetSpeed = moveInput.magnitude > 0.1f
            ? (isSprinting ? sprintSpeed : walkSpeed)
            : 0f;

        // 平滑过渡到目标速度（避免突然加速/减速）
        _currentSpeed = Mathf.SmoothDamp(
            _currentSpeed,
            targetSpeed,
            ref _speedSmoothVelocity,
            speedSmoothTime
        );

        // 如果有移动输入，计算移动方向和旋转
        if (moveInput.magnitude > 0.1f)
        {
            // 计算输入方向的角度（基于摄像机朝向）
            // Mathf.Atan2 计算从 Z 轴到输入方向的角度
            float inputAngle = Mathf.Atan2(moveInput.x, moveInput.y) * Mathf.Rad2Deg;

            // 加上摄像机的 Y 轴旋转角度
            // 这样 W 键就是"摄像机前方"而不是"世界北方"
            if (cameraTransform != null)
            {
                _targetRotation = inputAngle + cameraTransform.eulerAngles.y;
            }
            else
            {
                _targetRotation = inputAngle;
            }

            // 平滑旋转角色朝向移动方向
            float smoothedRotation = Mathf.SmoothDampAngle(
                transform.eulerAngles.y,
                _targetRotation,
                ref _rotationSmoothVelocity,
                rotationSmoothTime
            );
            transform.rotation = Quaternion.Euler(0f, smoothedRotation, 0f);
        }
    }

    /// <summary>
    /// 处理跳跃
    /// 包含 Coyote Time（土狼时间）机制：
    /// 允许玩家在离开平台后的短暂时间内仍能跳跃
    /// 这是一个常见的游戏手感优化技巧
    /// </summary>
    private void HandleJump()
    {
        // 检查是否按下跳跃键
        bool jumpPressed = _jumpAction.WasPressedThisFrame();

        if (!jumpPressed) return;

        // 检查是否满足跳跃条件
        bool canJump = false;

        // 条件1：在地面上
        if (_isGrounded)
        {
            canJump = true;
        }
        // 条件2：Coyote Time（刚离开地面不久）
        else if (Time.time - _lastGroundedTime <= coyoteTime)
        {
            canJump = true;
        }

        // 跳跃冷却检查
        if (Time.time - _lastJumpTime < jumpCooldown)
        {
            canJump = false;
        }

        if (canJump)
        {
            // 计算跳跃所需的初速度
            // 公式推导：v = sqrt(2 * g * h)
            // 从 v^2 = v0^2 - 2*g*h 推出（顶点速度为0）
            _verticalVelocity = Mathf.Sqrt(2f * gravity * jumpHeight);

            _lastJumpTime = Time.time;

            // 跳跃时清除 Coyote Time
            _lastGroundedTime = -1f;
        }
    }

    /// <summary>
    /// 应用重力
    /// 每帧累加重力加速度到垂直速度上
    /// </summary>
    private void ApplyGravity()
    {
        if (_isGrounded && _verticalVelocity < 0f)
        {
            // 在地面上时，保持一个小的向下速度
            // 这确保 CharacterController.isGrounded 检测正常工作
            _verticalVelocity = -2f;
        }
        else
        {
            // 空中时，累加重力
            _verticalVelocity -= gravity * Time.deltaTime;
        }
    }

    /// <summary>
    /// 应用最终移动
    /// 将水平移动和垂直移动合并，调用 CharacterController.Move
    /// </summary>
    private void ApplyFinalMovement()
    {
        // 计算水平移动方向
        Vector3 moveDirection = Quaternion.Euler(0f, _targetRotation, 0f) * Vector3.forward;

        // 合并水平和垂直移动
        Vector3 finalMovement = new Vector3(
            moveDirection.x * _currentSpeed,
            _verticalVelocity,
            moveDirection.z * _currentSpeed
        );

        // 应用移动（CharacterController.Move 自动处理碰撞）
        _controller.Move(finalMovement * Time.deltaTime);
    }

    /// <summary>
    /// 着地回调
    /// 角色从空中落到地面时调用
    /// </summary>
    private void OnLanded()
    {
        // 重置垂直速度
        _verticalVelocity = -2f;

        // 这里可以播放着地音效、粒子效果等
        // AudioManager.Instance?.PlaySFX("land");
        // ParticleManager.Instance?.SpawnLandingDust(transform.position);
    }

    // ============================================================
    // 公开属性（供其他脚本读取状态）
    // ============================================================

    /// <summary>
    /// 角色是否在地面上
    /// </summary>
    public bool IsGrounded => _isGrounded;

    /// <summary>
    /// 角色当前速度
    /// </summary>
    public float CurrentSpeed => _currentSpeed;

    /// <summary>
    /// 角色是否在移动
    /// </summary>
    public bool IsMoving => _currentSpeed > 0.1f;

    /// <summary>
    /// 角色是否在奔跑
    /// </summary>
    public bool IsSprinting => _sprintAction != null && _sprintAction.IsPressed() && IsMoving;

    /// <summary>
    /// 角色是否在空中
    /// </summary>
    public bool IsInAir => !_isGrounded;

    // ============================================================
    // 调试辅助（仅在编辑器中可见）
    // ============================================================

    /// <summary>
    /// 在 Scene 视图中绘制地面检测球的 Gizmo
    /// 方便调试地面检测的位置和范围
    /// </summary>
    void OnDrawGizmosSelected()
    {
        // 计算检测球位置
        Vector3 spherePosition = new Vector3(
            transform.position.x,
            transform.position.y + groundCheckOffset,
            transform.position.z
        );

        // 根据是否在地面设置颜色
        Gizmos.color = _isGrounded ? Color.green : Color.red;
        Gizmos.DrawWireSphere(spherePosition, groundCheckRadius);
    }
}
```

[截图：ThirdPersonController 组件在 Inspector 中的显示，展示所有可配置参数]

### 6.3.2 挂载脚本

1. 选中 `Player` GameObject
2. Inspector > **Add Component** > 搜索 `ThirdPersonController`
3. 将脚本拖到 Player 上或点击添加

4. 配置参数：
   - Camera Transform：拖入 `Main Camera`
   - 其他参数使用默认值即可

### 6.3.3 设置地面层

为了让地面检测更准确：

1. 选中 `Ground` 平面
2. Inspector 顶部的 **Layer** 下拉菜单 > **Add Layer...**
3. 添加一个新层 `Ground`
4. 回到 Ground 物体，将 Layer 设置为 `Ground`
5. 墙壁、阶梯等物体也设为 `Ground` 层
6. 在 ThirdPersonController 的 `Ground Layers` 中选择 `Ground` 层

[截图：Layer 设置界面和 Ground Layers 选择]

---

## 6.4 安装和配置 Cinemachine

Cinemachine 是 Unity 官方的摄像机系统，提供了专业级的摄像机行为，无需手写复杂的摄像机代码。

### 6.4.1 安装 Cinemachine

1. **Window > Package Manager**
2. 选择 **Unity Registry**
3. 搜索 `Cinemachine`
4. 安装 **Cinemachine** 包

[截图：Package Manager 中 Cinemachine 包的安装界面]

> **版本说明：** Unity 2022+ 使用 Cinemachine 3.x，API 和旧版本（2.x）有所不同。本教程基于 Cinemachine 3.x。如果你使用的是旧版本，部分组件名称和属性可能不同。

### 6.4.2 创建 Cinemachine 第三人称摄像机

**方法：手动配置**

1. Hierarchy > 右键 > **Cinemachine > Cinemachine Camera**
2. 命名为 `ThirdPersonCamera`

3. 选中 `ThirdPersonCamera`，在 Inspector 中配置：

```
CinemachineCamera 组件:
  Follow: Player（拖入 Player GameObject）
  Look At: Player（拖入 Player GameObject）
```

4. 添加 **Cinemachine Third Person Follow** 组件：
   - 点击 **Add Extension** 或在 Body 区域选择 `Third Person Follow`

5. 配置 Third Person Follow 参数：

```
Cinemachine Third Person Follow:
  Shoulder Offset: (0.5, 0, 0)    ← 摄像机偏向右肩（第三人称经典位置）
  Camera Distance: 5               ← 摄像机与角色的距离
  Vertical Arm Length: 0.4          ← 垂直偏移
  Camera Side: 1                   ← 0=左肩, 1=右肩
  Damping:
    Body: (0.5, 0.5, 0.5)         ← 跟随的阻尼（平滑度）
```

[截图：Cinemachine Third Person Follow 的参数设置界面]

### 6.4.3 配置 Main Camera

确保 Main Camera 上有 **CinemachineBrain** 组件（安装 Cinemachine 后通常会自动添加）：

1. 选中 **Main Camera**
2. 检查是否有 **CinemachineBrain** 组件
3. 如果没有，手动添加：Add Component > Cinemachine Brain

```
CinemachineBrain:
  Update Method: Smart Update
  Blend Update Method: Late Update
  Default Blend: Ease In Out, 2 seconds
```

[截图：Main Camera 上的 CinemachineBrain 组件]

---

## 6.5 编写摄像机控制脚本

虽然 Cinemachine 处理了大部分摄像机行为，但我们仍需要一个脚本来处理鼠标/触摸输入控制摄像机旋转。

### 6.5.1 创建 CameraController.cs

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// 第三人称摄像机控制器
/// 处理鼠标输入控制摄像机的水平和垂直旋转
///
/// 使用方法：
/// 1. 创建一个空 GameObject 作为 CameraTarget（摄像机跟随目标）
/// 2. 将此脚本附加到 CameraTarget 上
/// 3. 将 CameraTarget 作为 Player 的子物体
/// 4. 将 Cinemachine 的 Follow 和 Look At 设为 CameraTarget
/// </summary>
public class CameraController : MonoBehaviour
{
    // ============================================================
    // Inspector 中可配置的参数
    // ============================================================

    [Header("灵敏度设置")]
    [Tooltip("鼠标水平灵敏度")]
    [SerializeField] private float horizontalSensitivity = 1.5f;

    [Tooltip("鼠标垂直灵敏度")]
    [SerializeField] private float verticalSensitivity = 1.2f;

    [Header("垂直角度限制")]
    [Tooltip("最大仰角（向上看的角度限制）")]
    [SerializeField] private float maxPitchAngle = 70f;

    [Tooltip("最大俯角（向下看的角度限制）")]
    [SerializeField] private float minPitchAngle = -30f;

    [Header("平滑设置")]
    [Tooltip("旋转平滑速度（值越大越平滑，但响应越慢）")]
    [SerializeField] private float smoothSpeed = 10f;

    [Header("光标设置")]
    [Tooltip("运行时是否隐藏并锁定鼠标光标")]
    [SerializeField] private bool lockCursor = true;

    // ============================================================
    // 私有变量
    // ============================================================

    private PlayerInputActions _inputActions;     // 输入动作
    private InputAction _lookAction;              // Look 输入动作

    private float _currentPitch = 0f;             // 当前俯仰角（垂直旋转）
    private float _currentYaw = 0f;               // 当前偏航角（水平旋转）
    private float _targetPitch = 0f;              // 目标俯仰角
    private float _targetYaw = 0f;                // 目标偏航角

    // ============================================================
    // Unity 生命周期方法
    // ============================================================

    void Awake()
    {
        _inputActions = new PlayerInputActions();
    }

    void Start()
    {
        // 初始化旋转角度为当前值
        Vector3 currentEuler = transform.eulerAngles;
        _currentYaw = currentEuler.y;
        _currentPitch = currentEuler.x;
        _targetYaw = _currentYaw;
        _targetPitch = _currentPitch;

        // 处理光标
        if (lockCursor)
        {
            Cursor.lockState = CursorLockMode.Locked; // 锁定光标到屏幕中心
            Cursor.visible = false;                    // 隐藏光标
        }
    }

    void OnEnable()
    {
        _inputActions.Player.Enable();
        _lookAction = _inputActions.Player.Look;
    }

    void OnDisable()
    {
        _inputActions.Player.Disable();

        // 恢复光标
        if (lockCursor)
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }
    }

    /// <summary>
    /// 使用 LateUpdate 处理摄像机旋转
    /// LateUpdate 在所有 Update 之后执行，
    /// 确保摄像机在角色移动完成后再更新
    /// 类似 React 的 useLayoutEffect vs useEffect 的执行时机差异
    /// </summary>
    void LateUpdate()
    {
        HandleCameraRotation();
    }

    // ============================================================
    // 核心逻辑
    // ============================================================

    /// <summary>
    /// 处理摄像机旋转
    /// 读取鼠标输入，计算旋转角度，应用到 Transform
    /// </summary>
    private void HandleCameraRotation()
    {
        // 读取鼠标移动增量
        Vector2 lookInput = _lookAction.ReadValue<Vector2>();

        // 累加到目标角度
        _targetYaw += lookInput.x * horizontalSensitivity;
        _targetPitch -= lookInput.y * verticalSensitivity;
        // 注意：垂直方向是减号，因为鼠标向上移动时 Y 为正
        // 但我们希望摄像机向上旋转（即 pitch 减小）

        // 限制垂直角度（防止翻转）
        _targetPitch = Mathf.Clamp(_targetPitch, minPitchAngle, maxPitchAngle);

        // 平滑插值到目标角度
        _currentYaw = Mathf.Lerp(_currentYaw, _targetYaw, smoothSpeed * Time.deltaTime);
        _currentPitch = Mathf.Lerp(_currentPitch, _targetPitch, smoothSpeed * Time.deltaTime);

        // 应用旋转
        transform.rotation = Quaternion.Euler(_currentPitch, _currentYaw, 0f);
    }

    // ============================================================
    // 公开方法
    // ============================================================

    /// <summary>
    /// 获取摄像机的水平朝向角度（Y轴旋转）
    /// 供 ThirdPersonController 使用，确保移动方向相对于摄像机
    /// </summary>
    public float GetYawRotation()
    {
        return _currentYaw;
    }

    /// <summary>
    /// 设置光标锁定状态
    /// 在暂停菜单或 UI 交互时调用
    /// </summary>
    public void SetCursorLock(bool locked)
    {
        lockCursor = locked;
        Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
        Cursor.visible = !locked;
    }

    /// <summary>
    /// 重置摄像机旋转到指定角度
    /// 用于传送、场景切换等场景
    /// </summary>
    public void ResetRotation(float yaw, float pitch)
    {
        _currentYaw = yaw;
        _currentPitch = pitch;
        _targetYaw = yaw;
        _targetPitch = pitch;
        transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
    }
}
```

### 6.5.2 设置摄像机目标

为了让 Cinemachine 和我们的摄像机控制脚本协同工作，需要创建一个摄像机跟随目标：

1. 在 `Player` 下创建空 GameObject，命名为 `CameraTarget`
2. 设置 Transform：
   - Position: (0, 1.5, 0) — 大约在角色头部位置
3. 将 `CameraController` 脚本添加到 `CameraTarget` 上

4. 回到 Cinemachine 摄像机（`ThirdPersonCamera`）：
   - 将 **Follow** 和 **Look At** 都改为 `CameraTarget`

```
最终的 Player 层级结构：
Player
├── Body (Capsule)
├── FrontIndicator (Cube)
└── CameraTarget (Empty + CameraController)
```

[截图：Player 的 Hierarchy 结构和 CameraTarget 的位置]

### 6.5.3 更新 ThirdPersonController 的摄像机引用

回到 `ThirdPersonController`，将 `Camera Transform` 字段设置为 `CameraTarget`（而不是 Main Camera），因为 `CameraTarget` 的旋转才是我们控制的方向。

---

## 6.6 完整的连接和测试

### 6.6.1 组件清单检查

确保以下组件和引用都正确配置：

**Player GameObject:**
- CharacterController 组件
- ThirdPersonController 脚本
  - Camera Transform: CameraTarget
  - Ground Layers: Ground 层

**CameraTarget（Player 子物体）:**
- CameraController 脚本
  - Lock Cursor: 勾选

**ThirdPersonCamera（Cinemachine）:**
- CinemachineCamera 组件
  - Follow: CameraTarget
  - Look At: CameraTarget
- Cinemachine Third Person Follow
  - Camera Distance: 5

**Main Camera:**
- Camera 组件
- CinemachineBrain 组件

[截图：所有组件正确配置后的 Inspector 面板概览]

### 6.6.2 第一次测试

1. 按 `Cmd + S` 保存场景
2. 按 `Cmd + P` 进入 Play Mode
3. 测试以下操作：
   - **WASD** — 移动角色
   - **鼠标移动** — 旋转视角
   - **Space** — 跳跃
   - **Shift + WASD** — 奔跑

[截图：Play Mode 中角色在场景中移动的效果]

### 6.6.3 常见问题排查

**问题：角色不移动**
- 检查 PlayerInputActions 资产是否正确生成了 C# 类
- 检查 Input Actions 中的绑定是否正确
- 在 Console 窗口查看是否有错误信息

**问题：角色穿过地面**
- 检查 CharacterController 的 Center 和 Height 是否正确
- 检查地面检测的 Ground Layers 是否包含地面物体的层
- 调整 groundCheckOffset 和 groundCheckRadius

**问题：摄像机不跟随**
- 检查 Cinemachine Camera 的 Follow 和 Look At 是否设置正确
- 检查 Main Camera 是否有 CinemachineBrain 组件
- 确保 Cinemachine 包已正确安装

**问题：角色移动方向不对**
- 确保 ThirdPersonController 的 Camera Transform 引用的是 CameraTarget
- 检查 CameraTarget 是否是 Player 的子物体

**问题：按 ESC 后鼠标不出来**
添加以下代码到 CameraController.cs 的 Update 方法中：

```csharp
// 按 ESC 切换鼠标锁定
if (Keyboard.current.escapeKey.wasPressedThisFrame)
{
    SetCursorLock(!lockCursor);
}
```

---

## 6.7 优化和改进

### 6.7.1 添加移动动画状态（预留接口）

在 ThirdPersonController 中添加动画相关的公开属性，为后续动画系统做准备：

```csharp
// 在 ThirdPersonController 类中添加

// ============================================================
// 动画相关属性（供 Animator 使用）
// ============================================================

/// <summary>
/// 归一化的移动速度（0-1），用于动画混合
/// 0 = 静止, ~0.5 = 行走, 1 = 奔跑
/// </summary>
public float NormalizedSpeed
{
    get
    {
        if (_currentSpeed < 0.1f) return 0f;
        return Mathf.InverseLerp(0f, sprintSpeed, _currentSpeed);
    }
}

/// <summary>
/// 垂直速度，用于跳跃/下落动画
/// 正值 = 上升, 负值 = 下落
/// </summary>
public float VerticalSpeed => _verticalVelocity;
```

### 6.7.2 添加移动音效接口

```csharp
// 在 ThirdPersonController 类中添加

[Header("音效设置（可选）")]
[SerializeField] private AudioClip footstepSound;
[SerializeField] private AudioClip jumpSound;
[SerializeField] private AudioClip landSound;
[SerializeField] private float footstepInterval = 0.4f;

private AudioSource _audioSource;
private float _lastFootstepTime;

// 在 Awake 中添加：
// _audioSource = GetComponent<AudioSource>();

/// <summary>
/// 播放脚步声（在 Update 中调用）
/// </summary>
private void HandleFootsteps()
{
    if (_audioSource == null || footstepSound == null) return;
    if (!_isGrounded || !IsMoving) return;

    float interval = IsSprinting ? footstepInterval * 0.6f : footstepInterval;

    if (Time.time - _lastFootstepTime >= interval)
    {
        _audioSource.PlayOneShot(footstepSound);
        _lastFootstepTime = Time.time;
    }
}
```

### 6.7.3 手机触摸输入支持（预留）

因为我们的目标是移动端游戏，后续需要添加虚拟摇杆。目前 Input System 的架构支持多设备切换。可以在 Input Actions 中为每个动作添加触屏绑定：

1. 打开 `PlayerInputActions` 资产
2. 为 `Move` 动作添加 **Gamepad > Left Stick** 绑定
3. 为 `Look` 动作添加 **Gamepad > Right Stick** 绑定
4. 后续我们会添加虚拟摇杆的 UI 控件

[截图：Input Actions 中为 Move 动作添加 Gamepad 绑定]

---

## 6.8 Cinemachine 高级配置

### 6.8.1 碰撞避免

防止摄像机穿墙的配置：

1. 选中 `ThirdPersonCamera`
2. 添加 Extension > **CinemachineDeoccluder**（Cinemachine 3.x）或 **Cinemachine Collider**（2.x）
3. 配置参数：

```
CinemachineDeoccluder:
  Collision Filter: Default（或自定义层）
  Minimum Distance From Target: 0.5
  Camera Radius: 0.3
  Damping: 0
  Damping When Occluded: 0
  Strategy: Pull Camera Forward
```

[截图：CinemachineDeoccluder 的配置界面]

### 6.8.2 Cinemachine 噪声（摄像机抖动）

为摄像机添加轻微的运动感：

1. 选中 `ThirdPersonCamera`
2. 添加 Extension > **CinemachineBasicMultiChannelPerlin**
3. 选择一个噪声配置文件（Noise Profile），如 `6D Shake`
4. 将 Amplitude Gain 设为 **0.1**（非常轻微的晃动）
5. 将 Frequency Gain 设为 **0.5**

> **注意：** 移动端游戏通常不建议添加过多的摄像机抖动，会影响舒适度。这里仅展示功能，实际项目中根据需要使用。

---

## 6.9 代码架构说明

### 6.9.1 为什么这样组织代码？

```
ThirdPersonController.cs
├── Inspector 参数（[SerializeField] 字段）
├── 私有变量（运行时状态）
├── 生命周期方法（Awake, OnEnable, OnDisable, Update）
├── 核心逻辑方法（CheckGrounded, HandleMovement, HandleJump, ApplyGravity）
├── 公开属性（IsGrounded, CurrentSpeed, IsMoving）
└── 调试方法（OnDrawGizmosSelected）

CameraController.cs
├── Inspector 参数
├── 私有变量
├── 生命周期方法
├── 核心逻辑方法（HandleCameraRotation）
└── 公开方法（GetYawRotation, SetCursorLock, ResetRotation）
```

这种组织方式遵循了以下原则：

1. **单一职责：** 每个脚本只负责一个功能（移动 or 摄像机）
2. **关注点分离：** 移动逻辑和摄像机逻辑分开，互不依赖
3. **可配置性：** 所有重要参数都暴露在 Inspector 中，无需改代码就能调试
4. **可扩展性：** 公开属性和方法为其他系统（动画、音效、UI）提供接口

### 6.9.2 对比前端架构

| Unity 概念 | 前端对应 |
|-----------|---------|
| MonoBehaviour | React Component |
| [SerializeField] | props |
| private 字段 | state / useRef |
| Start() | componentDidMount / useEffect([], ...) |
| Update() | requestAnimationFrame 循环 |
| OnEnable/OnDisable | useEffect 清理函数 |
| GetComponent&lt;T&gt;() | useContext / dependency injection |
| Inspector 面板 | React DevTools / Storybook |
| public 属性 | 组件暴露的 API / ref |

---

## 6.10 完整组件依赖图

```
┌─────────────────────────────────────────────────┐
│                    Player                        │
│  ┌─────────────────────────────────────────────┐ │
│  │     ThirdPersonController                    │ │
│  │  - CharacterController (依赖)                │ │
│  │  - cameraTransform → CameraTarget            │ │
│  │  - PlayerInputActions (输入)                  │ │
│  └─────────────────────────────────────────────┘ │
│  ┌───────────────────┐                           │
│  │  CharacterController│                          │
│  │  (Unity 内置组件)   │                          │
│  └───────────────────┘                           │
│  ┌───────────────────┐                           │
│  │    CameraTarget    │ (子物体)                  │
│  │  ┌───────────────┐│                           │
│  │  │CameraController││                          │
│  │  │- PlayerInput   ││                          │
│  │  └───────────────┘│                           │
│  └───────────────────┘                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│            ThirdPersonCamera                     │
│  ┌─────────────────────────────────────────────┐ │
│  │  CinemachineCamera                          │ │
│  │  Follow → CameraTarget                      │ │
│  │  LookAt → CameraTarget                      │ │
│  └─────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │  Cinemachine Third Person Follow            │ │
│  └─────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │  CinemachineDeoccluder（防穿墙）             │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              Main Camera                         │
│  ┌─────────────────┐  ┌──────────────────────┐  │
│  │  Camera          │  │  CinemachineBrain    │  │
│  └─────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 练习题

### 练习 1：调整手感
修改 ThirdPersonController 的参数，实现以下效果：
- 让角色走得更快（8 米/秒），跑得更快（15 米/秒）
- 让跳跃更高（2 米）
- 让角色转向更灵敏（减小 rotationSmoothTime）
- 记录你最喜欢的参数组合

### 练习 2：添加下蹲功能
在 ThirdPersonController 中添加下蹲功能：
- 按住 `C` 键下蹲
- 下蹲时速度减半
- 下蹲时 CharacterController 的高度减半
- 站起时检查头顶是否有障碍物

提示：使用 `_controller.height` 和 `_controller.center` 来动态修改碰撞体。

### 练习 3：双击冲刺
实现双击方向键触发短距离冲刺的功能：
- 在 0.3 秒内连续按两次 W 键触发向前冲刺
- 冲刺距离 3 米，持续时间 0.2 秒
- 冲刺期间无法控制方向（锁定方向）
- 冲刺有 1 秒冷却时间

### 练习 4：摄像机切换
创建两个 Cinemachine 虚拟摄像机：
- 一个第三人称摄像机（默认）
- 一个俯视摄像机（Top-Down View）
- 按 `V` 键在两个视角之间切换
- 使用 Cinemachine 的 Priority 系统实现平滑过渡

---

## 下一章预告

**第七章：物理系统**

有了可移动的角色，接下来让世界变得更"真实"！在下一章中，我们将：
- 深入理解 Rigidbody（刚体）物理组件
- 学习各种碰撞体（Collider）的使用
- 掌握碰撞和触发器事件的处理
- 实现射线检测（Raycasting）
- 创建实际的游戏玩法：可拾取物品、压力板、发射弹丸

让你的游戏世界充满物理交互！
