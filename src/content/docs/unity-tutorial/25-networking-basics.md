# 第25章：网络基础

## 本章目标

通过本章学习，你将掌握：

1. 理解游戏网络架构（客户端-服务器、P2P、中继服务器）
2. 了解 Unity 主流多人游戏方案（Netcode for GameObjects、Mirror、Photon、Fish-Net）
3. 使用 Netcode for GameObjects 搭建基础多人游戏
4. 实现 NetworkVariable 状态同步
5. 使用 ServerRpc 和 ClientRpc 进行远程过程调用
6. 实现玩家生成和连接管理
7. 构建基础大厅系统
8. 同步角色移动和动画
9. 理解延迟补偿的基本概念
10. 使用 UnityWebRequest 集成 REST API

## 预计学习时间

约 4-5 小时（含代码实践时间）

---

## 25.1 游戏网络架构概述

### 25.1.1 为什么游戏网络与 Web 不同

如果你来自前端/全栈背景，你习惯的网络模型大概是这样的：

```
Web 开发模型：
客户端 ──HTTP Request──→ 服务器 ──HTTP Response──→ 客户端
（延迟 100-500ms 完全可以接受）

游戏网络模型：
玩家A ──状态更新──→ 服务器 ──广播──→ 所有玩家
（每帧都在发生，延迟 > 50ms 就能明显感知）
```

**核心差异：**

| 特性 | Web 开发 | 游戏网络 |
|------|----------|----------|
| 更新频率 | 用户操作触发 | 每帧（30-60次/秒） |
| 可接受延迟 | 数百毫秒 | 数十毫秒 |
| 数据方向 | 主要请求-响应 | 持续双向流 |
| 一致性 | 最终一致性 OK | 需要实时一致性 |
| 带宽敏感度 | 较低 | 非常高（移动端更甚） |
| 协议 | HTTP/WebSocket | UDP/可靠UDP |

### 25.1.2 三种网络架构

#### 客户端-服务器架构（Client-Server）

```
        ┌──────────┐
        │  服务器   │ ← 权威服务器，所有决策在这里做
        │ (Server)  │
        └────┬─────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───┴──┐ ┌──┴───┐ ┌──┴───┐
│客户端A│ │客户端B│ │客户端C│
└──────┘ └──────┘ └──────┘
```

**优点：**
- 服务器拥有最终权威，防作弊能力强
- 架构清晰，状态管理集中
- 客户端只需要与服务器通信

**缺点：**
- 需要维护服务器（成本）
- 单点故障风险
- 服务器延迟影响所有玩家

> **前端类比**：这就像传统的 Web 应用架构——React 前端 + Node.js/Django 后端。服务器是真理的唯一来源（Single Source of Truth），类似于 Redux store 在服务器端。

#### 点对点架构（P2P）

```
┌──────┐     ┌──────┐
│客户端A│←───→│客户端B│
└──┬───┘     └───┬──┘
   │             │
   └──────┬──────┘
          │
      ┌───┴──┐
      │客户端C│
      └──────┘
```

**优点：**
- 不需要专用服务器
- 低延迟（直接通信）
- 成本低

**缺点：**
- 防作弊困难
- NAT 穿透问题（很多家庭网络需要打洞）
- 每增加一个玩家，网络复杂度呈指数增长
- 移动端网络环境不稳定

#### 中继服务器架构（Relay）

```
        ┌──────────┐
        │ 中继服务器 │ ← 只转发数据，不做游戏逻辑
        │  (Relay)   │
        └────┬─────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───┴──┐ ┌──┴───┐ ┌──┴───┐
│客户端A│ │客户端B│ │客户端C│
│(Host) │ │      │ │      │  ← 其中一个客户端充当逻辑主机
└──────┘ └──────┘ └──────┘
```

**优点：**
- 解决 NAT 穿透问题
- 不需要专用游戏服务器
- 其中一个客户端充当 Host（监听服务器模式）

**缺点：**
- Host 玩家有延迟优势
- Host 断线所有人掉线
- 防作弊能力弱于专用服务器

> **推荐选择**：对于独立开发者和小团队的移动端开放世界游戏，**中继服务器 + Host 模式**是最实用的起步方案。Unity 提供了 Relay 服务来简化这一过程。

### 25.1.3 Host 模式 vs 专用服务器模式

```
Host 模式（Listen Server）：
┌─────────────────────┐
│     玩家A 的设备      │
│  ┌───────┐ ┌──────┐ │
│  │Server │ │Client│ │  ← 一台设备同时运行服务器和客户端
│  └───────┘ └──────┘ │
└─────────────────────┘
        │
   ┌────┴────┐
┌──┴───┐ ┌──┴───┐
│客户端B│ │客户端C│
└──────┘ └──────┘

专用服务器模式（Dedicated Server）：
┌──────────┐
│ 云服务器   │  ← 只运行服务器逻辑，不渲染画面
│ (无 GPU)  │
└────┬─────┘
     │
  ┌──┴──┬─────┐
┌─┴──┐┌─┴──┐┌─┴──┐
│玩家A││玩家B││玩家C│
└────┘└────┘└────┘
```

---

## 25.2 Unity 多人游戏方案对比

### 25.2.1 主流方案一览

| 方案 | 类型 | 适合 | 学习曲线 | 价格 |
|------|------|------|----------|------|
| **Netcode for GameObjects** | Unity 官方 | 中小型项目 | 中等 | 免费 |
| **Mirror** | 社区开源 | 中小型项目 | 较低 | 免费 |
| **Photon (PUN2/Fusion)** | 第三方 SaaS | 各种规模 | 较低 | 免费+付费 |
| **Fish-Net** | 社区开源 | 中大型项目 | 中等 | 免费 |
| **Netcode for Entities** | Unity 官方 DOTS | 大型项目 | 高 | 免费 |

### 25.2.2 为什么选择 Netcode for GameObjects

本教程选择 **Netcode for GameObjects (NGO)** 的原因：

1. **Unity 官方维护**：与 Unity 生态深度集成
2. **与 Unity Gaming Services 配合**：Relay、Lobby、Matchmaking 等服务无缝对接
3. **活跃开发中**：持续更新和改进
4. **适合学习**：概念清晰，文档完善
5. **免费**：不需要额外付费

> **前端类比**：选择 NGO 就像在 React 生态中选择 Redux——不一定是最好的，但它是官方推荐的、文档最全的、社区最大的方案。

### 25.2.3 Photon 简要介绍

如果你的项目需要**快速上线**且**不想管服务器**，Photon 是一个很好的选择：

```
Photon 生态：
├── PUN 2 (Photon Unity Networking)  // 经典方案，简单易用
├── Photon Fusion                     // 新一代，支持 Tick-based 模拟
├── Photon Quantum                    // 确定性物理模拟（格斗/RTS）
└── Photon Chat / Voice               // 聊天和语音
```

Photon 的免费额度：
- 20 CCU（同时在线用户）
- 适合原型开发和小规模测试

---

## 25.3 Netcode for GameObjects 基础设置

### 25.3.1 安装 NGO

1. 打开 **Window → Package Manager**
2. 点击左上角 **+** → **Add package by name**
3. 输入：`com.unity.netcode.gameobjects`
4. 点击 **Add**

[截图：Package Manager 中搜索并安装 Netcode for GameObjects]

或者编辑 `Packages/manifest.json`：

```json
{
  "dependencies": {
    "com.unity.netcode.gameobjects": "1.7.1",
    // ... 其他包
  }
}
```

### 25.3.2 安装 Unity Transport

NGO 需要一个传输层来实际发送和接收数据：

```
Package Manager → Add package by name
包名：com.unity.transport
```

### 25.3.3 安装 Unity Relay（可选但推荐）

如果需要不依赖公网 IP 的联机：

```
Package Manager → Add package by name
包名：com.unity.services.relay
```

### 25.3.4 基本场景设置

1. 创建一个新场景 `NetworkScene`
2. 创建一个空 GameObject 命名为 `NetworkManager`
3. 添加以下组件：
   - **NetworkManager**（来自 Netcode）
   - **Unity Transport**

[截图：NetworkManager GameObject 的 Inspector 面板，显示 NetworkManager 和 Unity Transport 组件]

配置 NetworkManager：

```
NetworkManager 组件设置：
├── Network Transport: Unity Transport
├── Player Prefab: (稍后设置)
├── Network Prefabs List: (稍后添加)
└── Tick Rate: 30 (每秒同步次数，移动端30就足够)
```

---

## 25.4 NetworkGameManager.cs — 网络游戏管理器

```csharp
// ============================================================
// NetworkGameManager.cs — 网络游戏管理器
// 放置路径：Assets/Scripts/Network/NetworkGameManager.cs
// 功能：管理网络连接的启动、停止，以及游戏状态同步
// ============================================================

using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using UnityEngine;
using UnityEngine.Events;
using System.Collections.Generic;

/// <summary>
/// 网络游戏管理器
/// 负责管理 Host/Client/Server 模式的启动和停止
/// 以及全局网络事件的分发
/// </summary>
public class NetworkGameManager : MonoBehaviour
{
    // ========================================
    // 单例模式
    // ========================================

    /// <summary>全局单例实例</summary>
    public static NetworkGameManager Instance { get; private set; }

    // ========================================
    // 配置参数
    // ========================================

    [Header("网络配置")]
    [Tooltip("服务器 IP 地址（仅 Client 模式使用）")]
    [SerializeField] private string serverAddress = "127.0.0.1";

    [Tooltip("服务器端口")]
    [SerializeField] private ushort serverPort = 7777;

    [Tooltip("最大玩家数量")]
    [SerializeField] private int maxPlayers = 4;

    // ========================================
    // 事件 — 类似于前端的 EventEmitter 或 Redux Action
    // ========================================

    [Header("网络事件")]
    [Tooltip("当连接到服务器时触发")]
    public UnityEvent OnConnected;

    [Tooltip("当断开连接时触发")]
    public UnityEvent OnDisconnected;

    [Tooltip("当有新玩家加入时触发")]
    public UnityEvent<ulong> OnPlayerJoined;

    [Tooltip("当玩家离开时触发")]
    public UnityEvent<ulong> OnPlayerLeft;

    [Tooltip("当连接失败时触发")]
    public UnityEvent<string> OnConnectionFailed;

    // ========================================
    // 私有状态
    // ========================================

    /// <summary>已连接的玩家ID列表</summary>
    private HashSet<ulong> connectedPlayers = new HashSet<ulong>();

    /// <summary>网络管理器引用</summary>
    private NetworkManager networkManager;

    // ========================================
    // 生命周期
    // ========================================

    private void Awake()
    {
        // 单例初始化
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    private void Start()
    {
        // 获取 NetworkManager 引用
        networkManager = NetworkManager.Singleton;

        if (networkManager == null)
        {
            Debug.LogError("[NetworkGameManager] 场景中找不到 NetworkManager！" +
                         "请确保场景中有一个带 NetworkManager 组件的 GameObject。");
            return;
        }

        // 注册网络事件回调
        // 这类似于前端中的 addEventListener 或 useEffect 中的订阅
        networkManager.OnClientConnectedCallback += HandleClientConnected;
        networkManager.OnClientDisconnectCallback += HandleClientDisconnected;
        networkManager.OnTransportFailure += HandleTransportFailure;

        Debug.Log("[NetworkGameManager] 初始化完成，等待启动网络...");
    }

    private void OnDestroy()
    {
        // 清理事件订阅，防止内存泄漏
        // 这类似于 React useEffect 的 cleanup 函数
        if (networkManager != null)
        {
            networkManager.OnClientConnectedCallback -= HandleClientConnected;
            networkManager.OnClientDisconnectCallback -= HandleClientDisconnected;
            networkManager.OnTransportFailure -= HandleTransportFailure;
        }

        if (Instance == this)
        {
            Instance = null;
        }
    }

    // ========================================
    // 公共方法 — 启动网络
    // ========================================

    /// <summary>
    /// 以 Host 模式启动（同时作为服务器和客户端）
    /// 适合一个玩家创建房间，其他玩家加入的场景
    /// </summary>
    public void StartHost()
    {
        if (networkManager.IsListening)
        {
            Debug.LogWarning("[NetworkGameManager] 网络已经在运行中！");
            return;
        }

        // 配置传输层参数
        ConfigureTransport();

        // 设置连接审批回调（用于限制玩家数量、验证身份等）
        networkManager.ConnectionApprovalCallback = ApproveConnection;

        // 启动 Host 模式
        bool success = networkManager.StartHost();

        if (success)
        {
            Debug.Log($"[NetworkGameManager] Host 启动成功！" +
                     $"地址:{serverAddress}, 端口:{serverPort}");
        }
        else
        {
            Debug.LogError("[NetworkGameManager] Host 启动失败！");
            OnConnectionFailed?.Invoke("Host 启动失败");
        }
    }

    /// <summary>
    /// 以 Client 模式启动（连接到已有的 Host/Server）
    /// </summary>
    /// <param name="address">服务器地址（可选，默认使用配置值）</param>
    /// <param name="port">服务器端口（可选，默认使用配置值）</param>
    public void StartClient(string address = null, ushort port = 0)
    {
        if (networkManager.IsListening)
        {
            Debug.LogWarning("[NetworkGameManager] 网络已经在运行中！");
            return;
        }

        // 更新连接地址
        if (!string.IsNullOrEmpty(address))
            serverAddress = address;
        if (port > 0)
            serverPort = port;

        // 配置传输层参数
        ConfigureTransport();

        // 启动 Client 模式
        bool success = networkManager.StartClient();

        if (success)
        {
            Debug.Log($"[NetworkGameManager] Client 正在连接到 " +
                     $"{serverAddress}:{serverPort}...");
        }
        else
        {
            Debug.LogError("[NetworkGameManager] Client 启动失败！");
            OnConnectionFailed?.Invoke("Client 启动失败");
        }
    }

    /// <summary>
    /// 以专用服务器模式启动（不生成本地玩家）
    /// 用于云端部署的专用游戏服务器
    /// </summary>
    public void StartServer()
    {
        if (networkManager.IsListening)
        {
            Debug.LogWarning("[NetworkGameManager] 网络已经在运行中！");
            return;
        }

        ConfigureTransport();
        networkManager.ConnectionApprovalCallback = ApproveConnection;

        bool success = networkManager.StartServer();

        if (success)
        {
            Debug.Log($"[NetworkGameManager] 专用服务器启动成功！端口:{serverPort}");
        }
        else
        {
            Debug.LogError("[NetworkGameManager] 服务器启动失败！");
        }
    }

    /// <summary>
    /// 停止网络（断开所有连接）
    /// </summary>
    public void StopNetwork()
    {
        if (networkManager != null && networkManager.IsListening)
        {
            networkManager.Shutdown();
            connectedPlayers.Clear();
            Debug.Log("[NetworkGameManager] 网络已停止");
        }
    }

    // ========================================
    // 连接审批 — 控制谁可以加入游戏
    // ========================================

    /// <summary>
    /// 连接审批回调
    /// 当有新客户端尝试连接时，服务器调用此方法决定是否允许
    /// 类似于前端的路由守卫（Route Guard）或中间件（Middleware）
    /// </summary>
    /// <param name="request">连接请求信息</param>
    /// <param name="response">审批响应（批准或拒绝）</param>
    private void ApproveConnection(
        NetworkManager.ConnectionApprovalRequest request,
        NetworkManager.ConnectionApprovalResponse response)
    {
        Debug.Log($"[NetworkGameManager] 收到连接请求，" +
                 $"ClientId: {request.ClientNetworkId}");

        // 检查是否超过最大玩家数
        if (connectedPlayers.Count >= maxPlayers)
        {
            response.Approved = false;
            response.Reason = "服务器已满";
            Debug.Log("[NetworkGameManager] 拒绝连接：服务器已满");
            return;
        }

        // 这里可以添加更多验证逻辑：
        // - 检查密码/房间码
        // - 验证 Token
        // - 检查黑名单
        // 示例：从连接负载中读取数据
        // byte[] payload = request.Payload;
        // string password = System.Text.Encoding.UTF8.GetString(payload);

        // 批准连接
        response.Approved = true;

        // 是否自动生成玩家对象
        response.CreatePlayerObject = true;

        // 玩家的初始生成位置（可选）
        // response.Position = GetSpawnPosition();
        // response.Rotation = Quaternion.identity;

        Debug.Log($"[NetworkGameManager] 批准连接：ClientId {request.ClientNetworkId}");
    }

    // ========================================
    // 网络事件处理
    // ========================================

    /// <summary>
    /// 当客户端成功连接时调用
    /// </summary>
    /// <param name="clientId">连接的客户端 ID</param>
    private void HandleClientConnected(ulong clientId)
    {
        connectedPlayers.Add(clientId);

        Debug.Log($"[NetworkGameManager] 玩家已连接: ClientId={clientId}, " +
                 $"当前在线: {connectedPlayers.Count}/{maxPlayers}");

        // 如果是本地玩家连接成功
        if (clientId == networkManager.LocalClientId)
        {
            OnConnected?.Invoke();
            Debug.Log("[NetworkGameManager] 本地玩家连接成功！");
        }

        // 通知有新玩家加入
        OnPlayerJoined?.Invoke(clientId);
    }

    /// <summary>
    /// 当客户端断开连接时调用
    /// </summary>
    /// <param name="clientId">断开的客户端 ID</param>
    private void HandleClientDisconnected(ulong clientId)
    {
        connectedPlayers.Remove(clientId);

        Debug.Log($"[NetworkGameManager] 玩家已断开: ClientId={clientId}, " +
                 $"当前在线: {connectedPlayers.Count}/{maxPlayers}");

        // 如果是本地玩家断开
        if (clientId == networkManager.LocalClientId)
        {
            OnDisconnected?.Invoke();
            Debug.Log("[NetworkGameManager] 本地玩家已断开连接");
        }

        // 通知有玩家离开
        OnPlayerLeft?.Invoke(clientId);
    }

    /// <summary>
    /// 当传输层发生致命错误时调用
    /// </summary>
    private void HandleTransportFailure()
    {
        Debug.LogError("[NetworkGameManager] 传输层错误！网络连接已断开。");
        OnConnectionFailed?.Invoke("传输层错误");
        StopNetwork();
    }

    // ========================================
    // 辅助方法
    // ========================================

    /// <summary>
    /// 配置 Unity Transport 传输层参数
    /// </summary>
    private void ConfigureTransport()
    {
        // 获取 Unity Transport 组件
        var transport = networkManager.GetComponent<UnityTransport>();
        if (transport != null)
        {
            // 设置连接地址和端口
            transport.SetConnectionData(serverAddress, serverPort);

            Debug.Log($"[NetworkGameManager] 传输层配置: " +
                     $"{serverAddress}:{serverPort}");
        }
        else
        {
            Debug.LogError("[NetworkGameManager] 找不到 UnityTransport 组件！");
        }
    }

    // ========================================
    // 属性访问器
    // ========================================

    /// <summary>当前是否正在运行网络</summary>
    public bool IsNetworkRunning =>
        networkManager != null && networkManager.IsListening;

    /// <summary>当前是否为 Host</summary>
    public bool IsHost =>
        networkManager != null && networkManager.IsHost;

    /// <summary>当前是否为 Server</summary>
    public bool IsServer =>
        networkManager != null && networkManager.IsServer;

    /// <summary>当前是否为 Client</summary>
    public bool IsClient =>
        networkManager != null && networkManager.IsClient;

    /// <summary>当前在线玩家数</summary>
    public int PlayerCount => connectedPlayers.Count;

    /// <summary>本地客户端 ID</summary>
    public ulong LocalClientId =>
        networkManager != null ? networkManager.LocalClientId : 0;
}
```

---

## 25.5 NetworkPlayer.cs — 网络玩家控制器

### 25.5.1 核心概念：NetworkBehaviour

在 Netcode for GameObjects 中，`NetworkBehaviour` 是所有网络对象的基类（类似于 `MonoBehaviour`，但带有网络功能）。

**关键属性：**
- `IsOwner`：当前实例是否属于本地玩家（类似于前端中"这是我的组件"）
- `IsServer`：当前是否在服务器端运行
- `IsClient`：当前是否在客户端运行
- `OwnerClientId`：拥有者的客户端 ID

### 25.5.2 NetworkVariable — 网络状态同步

`NetworkVariable` 是 NGO 的状态同步核心，类似于前端中的**响应式状态**（如 React 的 `useState` 或 Vue 的 `ref`）。

```
前端状态管理                    Unity 网络状态
────────────────                ─────────────────
React useState    ←→           NetworkVariable
Redux Store       ←→           NetworkVariable (Server-Authoritative)
onChange callback ←→           OnValueChanged event
Dispatch Action   ←→           ServerRpc (请求修改)
```

**NetworkVariable 的核心规则：**
1. 默认只有 **Server/Host 可以写入**
2. 所有客户端可以**读取**
3. 值变化时会**自动同步**到所有客户端
4. 可以监听 `OnValueChanged` 事件

### 25.5.3 RPC — 远程过程调用

RPC 让你可以从一端调用另一端的方法：

```
ServerRpc: 客户端 → 服务器
  "嘿服务器，我要做这件事"
  类似于前端发送 POST 请求到后端

ClientRpc: 服务器 → 所有客户端（或指定客户端）
  "嘿所有人，这件事发生了"
  类似于 WebSocket 广播消息
```

### 25.5.4 完整的 NetworkPlayer.cs

```csharp
// ============================================================
// NetworkPlayer.cs — 网络玩家控制器
// 放置路径：Assets/Scripts/Network/NetworkPlayer.cs
// 功能：处理网络玩家的移动同步、状态管理和交互
// ============================================================

using Unity.Netcode;
using UnityEngine;
using System;

/// <summary>
/// 网络玩家控制器
/// 继承 NetworkBehaviour 以获得网络同步能力
/// 处理玩家输入、移动同步、状态同步
/// </summary>
public class NetworkPlayer : NetworkBehaviour
{
    // ========================================
    // 配置参数
    // ========================================

    [Header("移动配置")]
    [Tooltip("移动速度")]
    [SerializeField] private float moveSpeed = 5f;

    [Tooltip("旋转速度")]
    [SerializeField] private float rotateSpeed = 720f;

    [Tooltip("跳跃力度")]
    [SerializeField] private float jumpForce = 8f;

    [Header("组件引用")]
    [Tooltip("角色控制器")]
    [SerializeField] private CharacterController characterController;

    [Tooltip("动画控制器")]
    [SerializeField] private Animator animator;

    [Tooltip("玩家相机（本地玩家专用）")]
    [SerializeField] private Camera playerCamera;

    [Tooltip("头顶名字显示")]
    [SerializeField] private TMPro.TextMeshPro nameLabel;

    // ========================================
    // 网络变量 — 自动同步的状态
    // ========================================

    /// <summary>
    /// 玩家显示名称
    /// ReadPerm: Everyone 表示所有客户端都能读取
    /// WritePerm: Owner 表示只有拥有者可以修改
    /// </summary>
    private NetworkVariable<FixedString64Bytes> playerName =
        new NetworkVariable<FixedString64Bytes>(
            default,
            NetworkVariableReadPermission.Everyone,
            NetworkVariableWritePermission.Owner);

    /// <summary>
    /// 玩家生命值（只有服务器可以修改）
    /// 这是一个"服务器权威"的变量——客户端不能直接修改，防止作弊
    /// </summary>
    private NetworkVariable<int> health =
        new NetworkVariable<int>(
            100,
            NetworkVariableReadPermission.Everyone,
            NetworkVariableWritePermission.Server);

    /// <summary>
    /// 玩家得分（只有服务器可以修改）
    /// </summary>
    private NetworkVariable<int> score =
        new NetworkVariable<int>(
            0,
            NetworkVariableReadPermission.Everyone,
            NetworkVariableWritePermission.Server);

    /// <summary>
    /// 玩家是否存活
    /// </summary>
    private NetworkVariable<bool> isAlive =
        new NetworkVariable<bool>(
            true,
            NetworkVariableReadPermission.Everyone,
            NetworkVariableWritePermission.Server);

    /// <summary>
    /// 移动输入向量（用于动画同步）
    /// </summary>
    private NetworkVariable<Vector2> networkMoveInput =
        new NetworkVariable<Vector2>(
            Vector2.zero,
            NetworkVariableReadPermission.Everyone,
            NetworkVariableWritePermission.Owner);

    /// <summary>
    /// 是否在地面上（用于跳跃判断和动画）
    /// </summary>
    private NetworkVariable<bool> isGrounded =
        new NetworkVariable<bool>(
            true,
            NetworkVariableReadPermission.Everyone,
            NetworkVariableWritePermission.Owner);

    // ========================================
    // 私有变量
    // ========================================

    /// <summary>当前垂直速度（重力和跳跃）</summary>
    private float verticalVelocity;

    /// <summary>重力加速度</summary>
    private const float GRAVITY = -20f;

    // ========================================
    // 事件
    // ========================================

    /// <summary>当生命值改变时触发</summary>
    public event Action<int, int> OnHealthChanged; // (旧值, 新值)

    /// <summary>当玩家死亡时触发</summary>
    public event Action OnDied;

    // ========================================
    // 网络生命周期
    // ========================================

    /// <summary>
    /// 当网络对象在网络上生成时调用（类似于 Start，但是网络版）
    /// 这是初始化网络相关逻辑的最佳时机
    /// </summary>
    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        Debug.Log($"[NetworkPlayer] 网络玩家生成 - " +
                 $"ClientId:{OwnerClientId}, IsOwner:{IsOwner}, IsServer:{IsServer}");

        // 订阅 NetworkVariable 变化事件
        // 类似于 React 的 useEffect(() => {...}, [dependency])
        playerName.OnValueChanged += OnPlayerNameChanged;
        health.OnValueChanged += OnHealthValueChanged;
        isAlive.OnValueChanged += OnIsAliveChanged;

        if (IsOwner)
        {
            // 如果是本地玩家（我自己控制的角色）
            SetupLocalPlayer();
        }
        else
        {
            // 如果是远程玩家（其他人的角色）
            SetupRemotePlayer();
        }
    }

    /// <summary>
    /// 当网络对象从网络上移除时调用（类似于 OnDestroy 的网络版）
    /// 清理网络事件订阅
    /// </summary>
    public override void OnNetworkDespawn()
    {
        // 取消订阅，防止内存泄漏
        playerName.OnValueChanged -= OnPlayerNameChanged;
        health.OnValueChanged -= OnHealthValueChanged;
        isAlive.OnValueChanged -= OnIsAliveChanged;

        base.OnNetworkDespawn();
    }

    // ========================================
    // 初始化
    // ========================================

    /// <summary>
    /// 设置本地玩家（我自己）
    /// </summary>
    private void SetupLocalPlayer()
    {
        Debug.Log("[NetworkPlayer] 初始化本地玩家");

        // 启用相机（只有本地玩家需要相机）
        if (playerCamera != null)
        {
            playerCamera.gameObject.SetActive(true);
        }

        // 设置玩家名称
        // NetworkVariable 的 Owner 可以直接写入（因为我们设置了 WritePerm: Owner）
        playerName.Value = $"Player_{OwnerClientId}";

        // 启用输入
        enabled = true;
    }

    /// <summary>
    /// 设置远程玩家（别人的角色）
    /// </summary>
    private void SetupRemotePlayer()
    {
        Debug.Log($"[NetworkPlayer] 初始化远程玩家: {OwnerClientId}");

        // 禁用相机（远程玩家不需要在本地渲染相机）
        if (playerCamera != null)
        {
            playerCamera.gameObject.SetActive(false);
        }

        // 更新名字显示
        UpdateNameLabel(playerName.Value.ToString());
    }

    // ========================================
    // 每帧更新
    // ========================================

    private void Update()
    {
        // 只有本地玩家的拥有者才处理输入
        // 这是网络编程中最重要的检查之一！
        if (!IsOwner) return;

        // 只有存活的玩家可以操作
        if (!isAlive.Value) return;

        // 处理移动输入
        HandleMovementInput();

        // 更新动画参数
        UpdateAnimationParameters();
    }

    // ========================================
    // 输入处理（仅本地玩家）
    // ========================================

    /// <summary>
    /// 处理移动输入
    /// 在真实项目中，这里应该使用 New Input System
    /// 这里为了简化使用 legacy Input
    /// </summary>
    private void HandleMovementInput()
    {
        // 获取输入轴
        float horizontal = Input.GetAxis("Horizontal"); // A/D 或 左/右
        float vertical = Input.GetAxis("Vertical");     // W/S 或 上/下

        // 更新网络输入变量（用于远程动画同步）
        networkMoveInput.Value = new Vector2(horizontal, vertical);

        // 计算移动方向（基于相机朝向）
        Vector3 moveDirection = Vector3.zero;
        if (playerCamera != null)
        {
            // 获取相机的前方和右方（忽略 Y 轴）
            Vector3 forward = playerCamera.transform.forward;
            Vector3 right = playerCamera.transform.right;
            forward.y = 0f;
            right.y = 0f;
            forward.Normalize();
            right.Normalize();

            moveDirection = forward * vertical + right * horizontal;
        }
        else
        {
            moveDirection = new Vector3(horizontal, 0f, vertical);
        }

        // 应用重力
        if (characterController != null && characterController.isGrounded)
        {
            verticalVelocity = -2f; // 轻微向下的力保持在地面上
            isGrounded.Value = true;

            // 跳跃
            if (Input.GetButtonDown("Jump"))
            {
                verticalVelocity = jumpForce;
                isGrounded.Value = false;

                // 通知服务器：玩家跳跃了
                // 使用 ServerRpc 确保服务器知道这个事件
                JumpServerRpc();
            }
        }
        else
        {
            verticalVelocity += GRAVITY * Time.deltaTime;
            isGrounded.Value = false;
        }

        // 应用移动
        Vector3 velocity = moveDirection * moveSpeed;
        velocity.y = verticalVelocity;

        if (characterController != null)
        {
            characterController.Move(velocity * Time.deltaTime);
        }

        // 角色朝向移动方向
        if (moveDirection.magnitude > 0.1f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(moveDirection);
            transform.rotation = Quaternion.RotateTowards(
                transform.rotation,
                targetRotation,
                rotateSpeed * Time.deltaTime);
        }
    }

    /// <summary>
    /// 更新动画参数
    /// </summary>
    private void UpdateAnimationParameters()
    {
        if (animator == null) return;

        Vector2 input = networkMoveInput.Value;
        float speed = input.magnitude;

        // 设置移动速度参数（用于 Blend Tree）
        animator.SetFloat("Speed", speed, 0.1f, Time.deltaTime);
        animator.SetBool("IsGrounded", isGrounded.Value);
    }

    // ========================================
    // ServerRpc — 客户端请求服务器执行的方法
    // ========================================

    /// <summary>
    /// 跳跃 RPC
    /// [ServerRpc] 表示这个方法由客户端调用、在服务器上执行
    /// RequireOwnership = true 表示只有这个对象的拥有者才能调用
    /// 方法名必须以 ServerRpc 结尾（这是 NGO 的命名约定）
    /// </summary>
    [ServerRpc]
    private void JumpServerRpc()
    {
        Debug.Log($"[NetworkPlayer] 服务器收到跳跃请求: ClientId={OwnerClientId}");

        // 服务器验证跳跃是否合法（防作弊）
        // 比如：检查冷却时间、检查是否在地面上等

        // 通知所有客户端播放跳跃特效
        PlayJumpEffectClientRpc();
    }

    /// <summary>
    /// 请求造成伤害
    /// 客户端告诉服务器"我攻击了某个目标"
    /// 服务器验证后执行伤害计算
    /// </summary>
    /// <param name="targetNetworkObjectId">目标的 NetworkObjectId</param>
    /// <param name="damage">请求的伤害值</param>
    [ServerRpc]
    public void RequestDamageServerRpc(ulong targetNetworkObjectId, int damage)
    {
        Debug.Log($"[NetworkPlayer] 服务器收到伤害请求: " +
                 $"攻击者={OwnerClientId}, 目标={targetNetworkObjectId}, 伤害={damage}");

        // 服务器端验证：
        // 1. 攻击者和目标之间的距离是否合理
        // 2. 攻击者是否有攻击能力
        // 3. 伤害值是否在合理范围内

        // 查找目标
        if (NetworkManager.Singleton.SpawnManager
            .SpawnedObjects.TryGetValue(targetNetworkObjectId, out var targetObj))
        {
            var targetPlayer = targetObj.GetComponent<NetworkPlayer>();
            if (targetPlayer != null)
            {
                // 在服务器上执行伤害（服务器权威）
                targetPlayer.TakeDamage(damage);
            }
        }
    }

    /// <summary>
    /// 请求发送聊天消息
    /// 客户端将消息发送给服务器，服务器广播给所有人
    /// </summary>
    /// <param name="message">聊天消息内容</param>
    [ServerRpc]
    public void SendChatMessageServerRpc(FixedString128Bytes message)
    {
        Debug.Log($"[NetworkPlayer] 聊天消息: [{playerName.Value}] {message}");

        // 服务器广播消息给所有客户端
        ReceiveChatMessageClientRpc(playerName.Value, message);
    }

    // ========================================
    // ClientRpc — 服务器通知客户端执行的方法
    // ========================================

    /// <summary>
    /// 播放跳跃特效
    /// [ClientRpc] 表示这个方法由服务器调用、在所有客户端上执行
    /// 方法名必须以 ClientRpc 结尾
    /// </summary>
    [ClientRpc]
    private void PlayJumpEffectClientRpc()
    {
        // 在所有客户端上播放跳跃音效和粒子效果
        Debug.Log($"[NetworkPlayer] 播放跳跃特效: ClientId={OwnerClientId}");

        // 播放跳跃动画
        if (animator != null)
        {
            animator.SetTrigger("Jump");
        }

        // TODO: 播放跳跃音效
        // TODO: 播放跳跃粒子特效
    }

    /// <summary>
    /// 接收聊天消息
    /// 在所有客户端上显示聊天消息
    /// </summary>
    /// <param name="senderName">发送者名字</param>
    /// <param name="message">消息内容</param>
    [ClientRpc]
    private void ReceiveChatMessageClientRpc(
        FixedString64Bytes senderName,
        FixedString128Bytes message)
    {
        Debug.Log($"[聊天] {senderName}: {message}");

        // TODO: 在 UI 上显示聊天消息
        // ChatUI.Instance?.ShowMessage(senderName.ToString(), message.ToString());
    }

    /// <summary>
    /// 通知客户端玩家受到伤害
    /// 用于播放受击特效（只发送给受击者的客户端）
    /// </summary>
    /// <param name="damage">受到的伤害值</param>
    /// <param name="newHealth">伤害后的生命值</param>
    [ClientRpc]
    private void OnDamagedClientRpc(int damage, int newHealth)
    {
        Debug.Log($"[NetworkPlayer] 受到伤害: -{damage}, 剩余生命: {newHealth}");

        // 播放受击动画
        if (animator != null)
        {
            animator.SetTrigger("Hit");
        }

        // TODO: 显示伤害数字飘字
        // TODO: 播放受击音效
        // TODO: 屏幕闪红效果（如果是本地玩家）
    }

    /// <summary>
    /// 通知客户端玩家死亡
    /// </summary>
    [ClientRpc]
    private void OnDeathClientRpc()
    {
        Debug.Log($"[NetworkPlayer] 玩家死亡: ClientId={OwnerClientId}");

        // 播放死亡动画
        if (animator != null)
        {
            animator.SetTrigger("Die");
        }

        // 如果是本地玩家，显示死亡 UI
        if (IsOwner)
        {
            OnDied?.Invoke();
            // TODO: 显示复活倒计时
        }
    }

    // ========================================
    // 服务器端逻辑（只在服务器上执行）
    // ========================================

    /// <summary>
    /// 造成伤害（只在服务器上调用）
    /// 这是服务器权威设计的核心——伤害计算只在服务器上进行
    /// </summary>
    /// <param name="damage">伤害值</param>
    public void TakeDamage(int damage)
    {
        // 安全检查：只有服务器可以执行这个方法
        if (!IsServer)
        {
            Debug.LogWarning("[NetworkPlayer] TakeDamage 只能在服务器上调用！");
            return;
        }

        if (!isAlive.Value) return;

        // 计算新的生命值
        int newHealth = Mathf.Max(0, health.Value - damage);
        health.Value = newHealth; // NetworkVariable 修改会自动同步

        // 通知所有客户端播放受击效果
        OnDamagedClientRpc(damage, newHealth);

        // 检查是否死亡
        if (newHealth <= 0)
        {
            isAlive.Value = false;
            OnDeathClientRpc();

            Debug.Log($"[NetworkPlayer] 玩家 {OwnerClientId} 已死亡");
        }
    }

    /// <summary>
    /// 复活玩家（只在服务器上调用）
    /// </summary>
    /// <param name="spawnPosition">复活位置</param>
    public void Respawn(Vector3 spawnPosition)
    {
        if (!IsServer) return;

        health.Value = 100;
        isAlive.Value = true;

        // 使用 ClientRpc 在所有客户端上重置位置
        RespawnClientRpc(spawnPosition);
    }

    /// <summary>
    /// 在所有客户端上执行复活
    /// </summary>
    [ClientRpc]
    private void RespawnClientRpc(Vector3 position)
    {
        // 移动到复活点
        if (characterController != null)
        {
            characterController.enabled = false; // 临时禁用以允许传送
            transform.position = position;
            characterController.enabled = true;
        }
        else
        {
            transform.position = position;
        }

        // 播放复活动画/特效
        if (animator != null)
        {
            animator.SetTrigger("Respawn");
        }
    }

    // ========================================
    // NetworkVariable 变化回调
    // ========================================

    /// <summary>
    /// 当玩家名称改变时调用
    /// </summary>
    private void OnPlayerNameChanged(FixedString64Bytes oldName, FixedString64Bytes newName)
    {
        UpdateNameLabel(newName.ToString());
    }

    /// <summary>
    /// 当生命值改变时调用
    /// </summary>
    private void OnHealthValueChanged(int oldHealth, int newHealth)
    {
        OnHealthChanged?.Invoke(oldHealth, newHealth);

        // 更新本地 UI（如果是本地玩家）
        if (IsOwner)
        {
            Debug.Log($"[NetworkPlayer] 我的生命值: {oldHealth} → {newHealth}");
            // TODO: 更新 HUD 上的血条
        }
    }

    /// <summary>
    /// 当存活状态改变时调用
    /// </summary>
    private void OnIsAliveChanged(bool wasAlive, bool nowAlive)
    {
        if (!nowAlive)
        {
            // 死亡时禁用某些组件
            if (characterController != null)
                characterController.enabled = false;
        }
        else
        {
            // 复活时重新启用
            if (characterController != null)
                characterController.enabled = true;
        }
    }

    // ========================================
    // 辅助方法
    // ========================================

    /// <summary>
    /// 更新头顶名字标签
    /// </summary>
    private void UpdateNameLabel(string name)
    {
        if (nameLabel != null)
        {
            nameLabel.text = name;
        }
    }

    /// <summary>
    /// 获取当前的网络统计信息（用于 Debug 显示）
    /// </summary>
    public string GetNetworkStats()
    {
        return $"名称:{playerName.Value}, " +
               $"生命:{health.Value}, " +
               $"分数:{score.Value}, " +
               $"存活:{isAlive.Value}, " +
               $"Owner:{IsOwner}";
    }
}
```

---

## 25.6 网络同步组件

### 25.6.1 NetworkTransform — 位置同步

NGO 提供了内置的 `NetworkTransform` 组件来同步 Transform：

[截图：Inspector 中 NetworkTransform 组件的配置]

```
NetworkTransform 配置：
├── Sync Position X/Y/Z: ✓ (同步哪些轴的位置)
├── Sync Rotation X/Y/Z: ✓ (同步旋转)
├── Sync Scale X/Y/Z: ✗ (通常不需要同步缩放)
├── Threshold: 0.001 (低于此值的变化不同步，节省带宽)
├── In Local Space: ✗ (使用世界坐标)
└── Interpolation: ✓ (插值平滑，减少抖动)
```

> **重要**：默认情况下 `NetworkTransform` 由**服务器**控制。如果你想让客户端直接控制自己角色的位置（如上面的 NetworkPlayer.cs），需要使用 `ClientNetworkTransform`：

```csharp
// 安装 Netcode 扩展包以使用 ClientNetworkTransform
// Package Manager → com.unity.multiplayer.tools
```

或者在 NetworkTransform 组件上设置：
```
Authority Mode: Owner (让拥有者控制位置)
```

### 25.6.2 NetworkAnimator — 动画同步

```
添加 NetworkAnimator 组件：
├── Animator: (关联角色的 Animator 组件)
└── 自动同步所有 Animator 参数和 Trigger
```

> **注意**：`NetworkAnimator` 会自动同步所有 Animator 参数。对于复杂的角色动画，你可能想手动同步关键参数（如上面 NetworkPlayer.cs 中使用 NetworkVariable 同步 Speed 和 IsGrounded）以获得更好的控制。

### 25.6.3 NetworkObject — 网络对象标识

每个需要在网络上同步的 GameObject 都必须有 `NetworkObject` 组件：

```
NetworkObject 配置：
├── Auto Object Parent Sync: ✓ (自动同步父子关系)
├── DontDestroyWithOwner: ✗ (拥有者断线时是否销毁)
└── NetworkObjectId: (自动分配，运行时可见)
```

**创建网络预制体的步骤：**
1. 创建 GameObject 并添加必要组件
2. 添加 `NetworkObject` 组件
3. 将其保存为 Prefab
4. 在 NetworkManager 的 **Network Prefabs** 列表中注册

[截图：NetworkManager 中的 Network Prefabs 列表]

---

## 25.7 LobbyManager.cs — 大厅系统

```csharp
// ============================================================
// LobbyManager.cs — 大厅管理器
// 放置路径：Assets/Scripts/Network/LobbyManager.cs
// 功能：管理游戏大厅，处理玩家加入/离开、准备状态、游戏开始
// ============================================================

using Unity.Netcode;
using UnityEngine;
using UnityEngine.Events;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// 大厅中的玩家信息
/// 使用 INetworkSerializable 接口使其可以在网络上传输
/// 类似于前端中定义一个可序列化的 DTO（Data Transfer Object）
/// </summary>
public struct LobbyPlayerInfo : INetworkSerializable
{
    /// <summary>玩家的客户端ID</summary>
    public ulong ClientId;

    /// <summary>玩家显示名称</summary>
    public FixedString64Bytes PlayerName;

    /// <summary>是否已准备</summary>
    public bool IsReady;

    /// <summary>选择的角色/皮肤索引</summary>
    public int CharacterIndex;

    /// <summary>
    /// 网络序列化方法（类似于 JSON.stringify/parse）
    /// NGO 需要知道如何在网络上编码和解码这个结构体
    /// </summary>
    public void NetworkSerialize<T>(BufferSerializer<T> serializer) where T : IReaderWriter
    {
        serializer.SerializeValue(ref ClientId);
        serializer.SerializeValue(ref PlayerName);
        serializer.SerializeValue(ref IsReady);
        serializer.SerializeValue(ref CharacterIndex);
    }
}

/// <summary>
/// 大厅管理器
/// 管理游戏大厅的核心逻辑：玩家列表、准备状态、开始游戏
/// </summary>
public class LobbyManager : NetworkBehaviour
{
    // ========================================
    // 配置
    // ========================================

    [Header("大厅配置")]
    [Tooltip("最大玩家数")]
    [SerializeField] private int maxPlayers = 4;

    [Tooltip("最少开始人数")]
    [SerializeField] private int minPlayersToStart = 2;

    [Tooltip("所有人准备后的倒计时秒数")]
    [SerializeField] private float countdownDuration = 5f;

    [Tooltip("游戏场景名称")]
    [SerializeField] private string gameSceneName = "GameScene";

    // ========================================
    // 网络变量
    // ========================================

    /// <summary>
    /// 大厅中的玩家列表
    /// NetworkList 类似于 NetworkVariable，但用于列表数据
    /// 它会自动同步增删改操作到所有客户端
    /// </summary>
    private NetworkList<LobbyPlayerInfo> lobbyPlayers;

    /// <summary>大厅状态</summary>
    private NetworkVariable<LobbyState> currentState =
        new NetworkVariable<LobbyState>(LobbyState.Waiting);

    /// <summary>倒计时剩余时间</summary>
    private NetworkVariable<float> countdownTimer =
        new NetworkVariable<float>(0f);

    /// <summary>房间码（用于让其他玩家加入）</summary>
    private NetworkVariable<FixedString32Bytes> roomCode =
        new NetworkVariable<FixedString32Bytes>("------");

    // ========================================
    // 大厅状态枚举
    // ========================================

    /// <summary>
    /// 大厅状态
    /// 类似于前端 React 组件的状态机
    /// </summary>
    public enum LobbyState
    {
        Waiting,     // 等待玩家加入
        Countdown,   // 所有人已准备，倒计时中
        Starting,    // 正在启动游戏
        InGame       // 游戏进行中
    }

    // ========================================
    // 事件
    // ========================================

    [Header("大厅事件")]
    public UnityEvent OnLobbyUpdated;
    public UnityEvent OnCountdownStarted;
    public UnityEvent OnCountdownCancelled;
    public UnityEvent OnGameStarting;

    // ========================================
    // 生命周期
    // ========================================

    private void Awake()
    {
        // NetworkList 必须在 Awake 中初始化
        lobbyPlayers = new NetworkList<LobbyPlayerInfo>();
    }

    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();

        // 监听玩家列表变化
        lobbyPlayers.OnListChanged += OnLobbyPlayersChanged;
        currentState.OnValueChanged += OnStateChanged;
        countdownTimer.OnValueChanged += OnCountdownTimerChanged;

        if (IsServer)
        {
            // 服务器端：监听连接和断开事件
            NetworkManager.Singleton.OnClientConnectedCallback += OnClientConnectedServer;
            NetworkManager.Singleton.OnClientDisconnectCallback += OnClientDisconnectedServer;

            // 生成房间码
            roomCode.Value = GenerateRoomCode();
            Debug.Log($"[LobbyManager] 房间码: {roomCode.Value}");
        }

        Debug.Log("[LobbyManager] 大厅初始化完成");
    }

    public override void OnNetworkDespawn()
    {
        lobbyPlayers.OnListChanged -= OnLobbyPlayersChanged;
        currentState.OnValueChanged -= OnStateChanged;
        countdownTimer.OnValueChanged -= OnCountdownTimerChanged;

        if (IsServer)
        {
            if (NetworkManager.Singleton != null)
            {
                NetworkManager.Singleton.OnClientConnectedCallback -= OnClientConnectedServer;
                NetworkManager.Singleton.OnClientDisconnectCallback -= OnClientDisconnectedServer;
            }
        }

        base.OnNetworkDespawn();
    }

    private void Update()
    {
        // 只有服务器处理倒计时逻辑
        if (!IsServer) return;

        if (currentState.Value == LobbyState.Countdown)
        {
            countdownTimer.Value -= Time.deltaTime;

            if (countdownTimer.Value <= 0f)
            {
                StartGame();
            }
        }
    }

    // ========================================
    // 服务器端逻辑
    // ========================================

    /// <summary>
    /// 当新客户端连接时（服务器端处理）
    /// </summary>
    private void OnClientConnectedServer(ulong clientId)
    {
        Debug.Log($"[LobbyManager] 新玩家加入大厅: {clientId}");

        // 创建玩家信息并添加到列表
        var playerInfo = new LobbyPlayerInfo
        {
            ClientId = clientId,
            PlayerName = $"Player_{clientId}",
            IsReady = false,
            CharacterIndex = 0
        };

        lobbyPlayers.Add(playerInfo);
    }

    /// <summary>
    /// 当客户端断开时（服务器端处理）
    /// </summary>
    private void OnClientDisconnectedServer(ulong clientId)
    {
        Debug.Log($"[LobbyManager] 玩家离开大厅: {clientId}");

        // 从列表中移除该玩家
        for (int i = lobbyPlayers.Count - 1; i >= 0; i--)
        {
            if (lobbyPlayers[i].ClientId == clientId)
            {
                lobbyPlayers.RemoveAt(i);
                break;
            }
        }

        // 如果正在倒计时，取消倒计时
        if (currentState.Value == LobbyState.Countdown)
        {
            CancelCountdown();
        }
    }

    /// <summary>
    /// 检查是否所有玩家都已准备
    /// </summary>
    private void CheckAllReady()
    {
        if (!IsServer) return;

        // 确保有足够的玩家
        if (lobbyPlayers.Count < minPlayersToStart)
        {
            if (currentState.Value == LobbyState.Countdown)
            {
                CancelCountdown();
            }
            return;
        }

        // 检查所有玩家是否准备就绪
        bool allReady = true;
        for (int i = 0; i < lobbyPlayers.Count; i++)
        {
            if (!lobbyPlayers[i].IsReady)
            {
                allReady = false;
                break;
            }
        }

        if (allReady && currentState.Value == LobbyState.Waiting)
        {
            // 开始倒计时
            currentState.Value = LobbyState.Countdown;
            countdownTimer.Value = countdownDuration;
            Debug.Log("[LobbyManager] 所有玩家已准备，开始倒计时！");
        }
        else if (!allReady && currentState.Value == LobbyState.Countdown)
        {
            // 有人取消准备，停止倒计时
            CancelCountdown();
        }
    }

    /// <summary>
    /// 取消倒计时
    /// </summary>
    private void CancelCountdown()
    {
        currentState.Value = LobbyState.Waiting;
        countdownTimer.Value = 0f;
        Debug.Log("[LobbyManager] 倒计时已取消");
    }

    /// <summary>
    /// 启动游戏
    /// </summary>
    private void StartGame()
    {
        if (!IsServer) return;

        currentState.Value = LobbyState.Starting;
        Debug.Log("[LobbyManager] 游戏开始！");

        // 使用 NetworkManager 的场景管理加载游戏场景
        // 这会自动在所有客户端上加载场景
        NetworkManager.Singleton.SceneManager.LoadScene(
            gameSceneName,
            UnityEngine.SceneManagement.LoadSceneMode.Single);
    }

    // ========================================
    // ServerRpc — 客户端请求
    // ========================================

    /// <summary>
    /// 玩家切换准备状态
    /// </summary>
    [ServerRpc(RequireOwnership = false)]
    public void ToggleReadyServerRpc(ServerRpcParams rpcParams = default)
    {
        // 获取调用者的 ClientId
        ulong clientId = rpcParams.Receive.SenderClientId;

        // 查找并更新玩家信息
        for (int i = 0; i < lobbyPlayers.Count; i++)
        {
            if (lobbyPlayers[i].ClientId == clientId)
            {
                var info = lobbyPlayers[i];
                info.IsReady = !info.IsReady;
                lobbyPlayers[i] = info;

                Debug.Log($"[LobbyManager] 玩家 {clientId} " +
                         $"准备状态: {info.IsReady}");
                break;
            }
        }

        // 检查是否所有人准备
        CheckAllReady();
    }

    /// <summary>
    /// 玩家修改名称
    /// </summary>
    /// <param name="newName">新名称</param>
    [ServerRpc(RequireOwnership = false)]
    public void SetPlayerNameServerRpc(
        FixedString64Bytes newName,
        ServerRpcParams rpcParams = default)
    {
        ulong clientId = rpcParams.Receive.SenderClientId;

        for (int i = 0; i < lobbyPlayers.Count; i++)
        {
            if (lobbyPlayers[i].ClientId == clientId)
            {
                var info = lobbyPlayers[i];
                info.PlayerName = newName;
                lobbyPlayers[i] = info;

                Debug.Log($"[LobbyManager] 玩家 {clientId} " +
                         $"改名为: {newName}");
                break;
            }
        }
    }

    /// <summary>
    /// 玩家选择角色
    /// </summary>
    /// <param name="characterIndex">角色索引</param>
    [ServerRpc(RequireOwnership = false)]
    public void SelectCharacterServerRpc(
        int characterIndex,
        ServerRpcParams rpcParams = default)
    {
        ulong clientId = rpcParams.Receive.SenderClientId;

        for (int i = 0; i < lobbyPlayers.Count; i++)
        {
            if (lobbyPlayers[i].ClientId == clientId)
            {
                var info = lobbyPlayers[i];
                info.CharacterIndex = characterIndex;
                lobbyPlayers[i] = info;

                Debug.Log($"[LobbyManager] 玩家 {clientId} " +
                         $"选择角色: {characterIndex}");
                break;
            }
        }
    }

    // ========================================
    // 事件回调
    // ========================================

    /// <summary>
    /// 当玩家列表发生变化时
    /// </summary>
    private void OnLobbyPlayersChanged(NetworkListEvent<LobbyPlayerInfo> changeEvent)
    {
        Debug.Log($"[LobbyManager] 大厅更新 - 类型:{changeEvent.Type}, " +
                 $"当前人数:{lobbyPlayers.Count}");

        // 通知 UI 更新
        OnLobbyUpdated?.Invoke();
    }

    /// <summary>
    /// 当大厅状态变化时
    /// </summary>
    private void OnStateChanged(LobbyState oldState, LobbyState newState)
    {
        Debug.Log($"[LobbyManager] 状态变化: {oldState} → {newState}");

        switch (newState)
        {
            case LobbyState.Countdown:
                OnCountdownStarted?.Invoke();
                break;
            case LobbyState.Waiting:
                if (oldState == LobbyState.Countdown)
                    OnCountdownCancelled?.Invoke();
                break;
            case LobbyState.Starting:
                OnGameStarting?.Invoke();
                break;
        }
    }

    /// <summary>
    /// 当倒计时更新时
    /// </summary>
    private void OnCountdownTimerChanged(float oldValue, float newValue)
    {
        // UI 可以读取 CountdownTimer 属性来更新显示
    }

    // ========================================
    // 公共属性（供 UI 读取）
    // ========================================

    /// <summary>获取大厅玩家列表</summary>
    public IReadOnlyList<LobbyPlayerInfo> GetPlayers()
    {
        var list = new List<LobbyPlayerInfo>();
        for (int i = 0; i < lobbyPlayers.Count; i++)
        {
            list.Add(lobbyPlayers[i]);
        }
        return list;
    }

    /// <summary>当前大厅状态</summary>
    public LobbyState CurrentState => currentState.Value;

    /// <summary>倒计时剩余时间</summary>
    public float CountdownTimer => countdownTimer.Value;

    /// <summary>房间码</summary>
    public string RoomCode => roomCode.Value.ToString();

    /// <summary>当前玩家数</summary>
    public int CurrentPlayerCount => lobbyPlayers.Count;

    /// <summary>是否已满</summary>
    public bool IsFull => lobbyPlayers.Count >= maxPlayers;

    // ========================================
    // 辅助方法
    // ========================================

    /// <summary>
    /// 生成6位房间码
    /// </summary>
    private FixedString32Bytes GenerateRoomCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        char[] code = new char[6];
        for (int i = 0; i < 6; i++)
        {
            code[i] = chars[Random.Range(0, chars.Length)];
        }
        return new FixedString32Bytes(new string(code));
    }
}
```

---

## 25.8 延迟补偿基础概念

### 25.8.1 为什么需要延迟补偿

在网络游戏中，所有数据都需要时间在客户端和服务器之间传输。假设网络延迟是 50ms：

```
时间线：
t=0ms    玩家A按下射击键
t=50ms   服务器收到射击请求
t=50ms   服务器处理射击（此时玩家B可能已经移动了）
t=100ms  玩家A看到射击结果

问题：玩家A在 t=0ms 时瞄准的位置，在服务器处理时(t=50ms)
      敌人可能已经不在那里了！
```

### 25.8.2 常见的延迟补偿策略

#### 客户端预测（Client-Side Prediction）

```
原理：客户端不等待服务器确认就先执行操作
      服务器确认后如果不一致就回滚修正

流程：
1. 客户端按下移动键 → 立即在本地移动角色
2. 同时发送移动请求给服务器
3. 服务器处理并返回"权威位置"
4. 客户端对比本地预测和服务器结果
5. 如果不一致 → 平滑修正到服务器位置
```

> **前端类比**：这非常类似于**乐观更新（Optimistic Update）**——你在 React 中发送 API 请求前先更新 UI，如果请求失败再回滚。

#### 服务器回滚（Server Reconciliation）

```
原理：射击判定时，服务器回滚到射击者看到的那个时刻的世界状态

流程：
1. 玩家A射击（延迟50ms）
2. 服务器收到射击请求
3. 服务器将世界状态回滚 50ms
4. 在回滚后的状态中判断射击是否命中
5. 恢复到当前状态
```

#### 插值和外推

```
插值（Interpolation）：
  客户端显示的是"过去"的状态（通常延迟 100-200ms）
  在两个已知状态之间平滑插值
  优点：画面流畅
  缺点：你看到的总是稍微过去的画面

外推（Extrapolation）：
  根据最后已知的速度和方向"预测"未来位置
  优点：实时性好
  缺点：如果对方突然转向，会出现"拉扯"
```

> **对于移动端开放世界**：建议使用"插值 + 客户端预测"的组合方案。NGO 的 `NetworkTransform` 已经内置了基础的插值功能。

---

## 25.9 APIClient.cs — REST API 集成

### 25.9.1 与后端服务通信

作为全栈开发者，你一定熟悉 REST API。Unity 提供了 `UnityWebRequest` 来与后端服务通信，概念上类似于浏览器中的 `fetch` API。

```
前端 fetch API               Unity UnityWebRequest
──────────────               ─────────────────────
fetch(url)                   UnityWebRequest.Get(url)
fetch(url, { method:'POST'}) UnityWebRequest.Post(url, data)
response.json()              request.downloadHandler.text
async/await                  Coroutine 或 async/await
Headers                      request.SetRequestHeader()
```

### 25.9.2 完整的 APIClient.cs

```csharp
// ============================================================
// APIClient.cs — REST API 客户端
// 放置路径：Assets/Scripts/Network/APIClient.cs
// 功能：封装 UnityWebRequest，提供简洁的 REST API 调用接口
// 类似于前端中的 axios 或自定义的 API 封装层
// ============================================================

using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;

/// <summary>
/// API 响应包装类
/// 类似于前端中 axios 的 response 对象
/// </summary>
/// <typeparam name="T">响应数据的类型</typeparam>
public class APIResponse<T>
{
    /// <summary>是否成功</summary>
    public bool IsSuccess { get; set; }

    /// <summary>HTTP 状态码</summary>
    public long StatusCode { get; set; }

    /// <summary>响应数据（已反序列化）</summary>
    public T Data { get; set; }

    /// <summary>错误信息</summary>
    public string Error { get; set; }

    /// <summary>原始响应文本</summary>
    public string RawResponse { get; set; }
}

/// <summary>
/// REST API 客户端
/// 提供 GET/POST/PUT/DELETE 方法，支持 JSON 序列化
/// 支持认证令牌、请求拦截、错误处理
/// </summary>
public class APIClient : MonoBehaviour
{
    // ========================================
    // 单例
    // ========================================

    public static APIClient Instance { get; private set; }

    // ========================================
    // 配置
    // ========================================

    [Header("API 配置")]
    [Tooltip("API 基础 URL（如 https://api.yourgame.com/v1）")]
    [SerializeField] private string baseURL = "https://api.yourgame.com/v1";

    [Tooltip("请求超时时间（秒）")]
    [SerializeField] private int timeoutSeconds = 30;

    [Tooltip("是否在请求时显示加载指示器")]
    [SerializeField] private bool showLoadingIndicator = true;

    // ========================================
    // 私有状态
    // ========================================

    /// <summary>认证令牌（如 JWT）</summary>
    private string authToken;

    /// <summary>当前正在进行的请求数</summary>
    private int activeRequestCount = 0;

    /// <summary>默认请求头</summary>
    private Dictionary<string, string> defaultHeaders = new Dictionary<string, string>();

    // ========================================
    // 事件
    // ========================================

    /// <summary>请求开始时触发</summary>
    public event Action OnRequestStarted;

    /// <summary>请求完成时触发</summary>
    public event Action OnRequestCompleted;

    /// <summary>认证失败时触发（401错误）</summary>
    public event Action OnUnauthorized;

    // ========================================
    // 初始化
    // ========================================

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        // 设置默认请求头
        defaultHeaders["Content-Type"] = "application/json";
        defaultHeaders["Accept"] = "application/json";
    }

    // ========================================
    // 认证管理
    // ========================================

    /// <summary>
    /// 设置认证令牌
    /// 调用登录 API 成功后，将返回的 token 传入这里
    /// 后续所有请求都会自动带上 Authorization 头
    /// </summary>
    /// <param name="token">JWT 或其他认证令牌</param>
    public void SetAuthToken(string token)
    {
        authToken = token;
        Debug.Log("[APIClient] 认证令牌已设置");
    }

    /// <summary>
    /// 清除认证令牌（登出时调用）
    /// </summary>
    public void ClearAuthToken()
    {
        authToken = null;
        Debug.Log("[APIClient] 认证令牌已清除");
    }

    /// <summary>
    /// 添加自定义默认请求头
    /// </summary>
    public void AddDefaultHeader(string key, string value)
    {
        defaultHeaders[key] = value;
    }

    // ========================================
    // HTTP 方法 — 使用 async/await（推荐）
    // ========================================

    /// <summary>
    /// 发送 GET 请求
    /// 类似于前端：const response = await fetch(url);
    /// </summary>
    /// <typeparam name="T">期望的响应数据类型</typeparam>
    /// <param name="endpoint">API 端点（如 "/users/me"）</param>
    /// <returns>API 响应</returns>
    public async Task<APIResponse<T>> GetAsync<T>(string endpoint)
    {
        string url = BuildURL(endpoint);
        Debug.Log($"[APIClient] GET {url}");

        using (UnityWebRequest request = UnityWebRequest.Get(url))
        {
            return await SendRequestAsync<T>(request);
        }
    }

    /// <summary>
    /// 发送 POST 请求
    /// 类似于前端：const response = await fetch(url, { method: 'POST', body: JSON.stringify(data) });
    /// </summary>
    /// <typeparam name="TRequest">请求体类型</typeparam>
    /// <typeparam name="TResponse">响应数据类型</typeparam>
    /// <param name="endpoint">API 端点</param>
    /// <param name="data">请求体数据</param>
    /// <returns>API 响应</returns>
    public async Task<APIResponse<TResponse>> PostAsync<TRequest, TResponse>(
        string endpoint,
        TRequest data)
    {
        string url = BuildURL(endpoint);
        string jsonBody = JsonUtility.ToJson(data);
        Debug.Log($"[APIClient] POST {url} - Body: {jsonBody}");

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();

            return await SendRequestAsync<TResponse>(request);
        }
    }

    /// <summary>
    /// 发送 PUT 请求
    /// </summary>
    public async Task<APIResponse<TResponse>> PutAsync<TRequest, TResponse>(
        string endpoint,
        TRequest data)
    {
        string url = BuildURL(endpoint);
        string jsonBody = JsonUtility.ToJson(data);
        Debug.Log($"[APIClient] PUT {url} - Body: {jsonBody}");

        using (UnityWebRequest request = new UnityWebRequest(url, "PUT"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();

            return await SendRequestAsync<TResponse>(request);
        }
    }

    /// <summary>
    /// 发送 DELETE 请求
    /// </summary>
    public async Task<APIResponse<T>> DeleteAsync<T>(string endpoint)
    {
        string url = BuildURL(endpoint);
        Debug.Log($"[APIClient] DELETE {url}");

        using (UnityWebRequest request = UnityWebRequest.Delete(url))
        {
            request.downloadHandler = new DownloadHandlerBuffer();
            return await SendRequestAsync<T>(request);
        }
    }

    // ========================================
    // HTTP 方法 — 使用 Coroutine（兼容旧版本 Unity）
    // ========================================

    /// <summary>
    /// 使用 Coroutine 方式发送 GET 请求
    /// 适用于不支持 async/await 的场景或 MonoBehaviour 中
    /// </summary>
    /// <typeparam name="T">响应数据类型</typeparam>
    /// <param name="endpoint">API 端点</param>
    /// <param name="callback">完成回调</param>
    public void Get<T>(string endpoint, Action<APIResponse<T>> callback)
    {
        StartCoroutine(GetCoroutine(endpoint, callback));
    }

    private IEnumerator GetCoroutine<T>(string endpoint, Action<APIResponse<T>> callback)
    {
        string url = BuildURL(endpoint);

        using (UnityWebRequest request = UnityWebRequest.Get(url))
        {
            SetHeaders(request);
            request.timeout = timeoutSeconds;

            activeRequestCount++;
            OnRequestStarted?.Invoke();

            yield return request.SendWebRequest();

            activeRequestCount--;
            if (activeRequestCount <= 0)
                OnRequestCompleted?.Invoke();

            callback?.Invoke(ProcessResponse<T>(request));
        }
    }

    /// <summary>
    /// 使用 Coroutine 方式发送 POST 请求
    /// </summary>
    public void Post<TRequest, TResponse>(
        string endpoint,
        TRequest data,
        Action<APIResponse<TResponse>> callback)
    {
        StartCoroutine(PostCoroutine(endpoint, data, callback));
    }

    private IEnumerator PostCoroutine<TRequest, TResponse>(
        string endpoint,
        TRequest data,
        Action<APIResponse<TResponse>> callback)
    {
        string url = BuildURL(endpoint);
        string jsonBody = JsonUtility.ToJson(data);

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();

            SetHeaders(request);
            request.timeout = timeoutSeconds;

            activeRequestCount++;
            OnRequestStarted?.Invoke();

            yield return request.SendWebRequest();

            activeRequestCount--;
            if (activeRequestCount <= 0)
                OnRequestCompleted?.Invoke();

            callback?.Invoke(ProcessResponse<TResponse>(request));
        }
    }

    // ========================================
    // 文件上传（例如上传头像）
    // ========================================

    /// <summary>
    /// 上传文件
    /// 类似于前端中使用 FormData 上传文件
    /// </summary>
    /// <param name="endpoint">API 端点</param>
    /// <param name="fileData">文件字节数据</param>
    /// <param name="fileName">文件名</param>
    /// <param name="mimeType">MIME 类型（如 "image/png"）</param>
    /// <param name="callback">完成回调</param>
    public void UploadFile<T>(
        string endpoint,
        byte[] fileData,
        string fileName,
        string mimeType,
        Action<APIResponse<T>> callback)
    {
        StartCoroutine(UploadFileCoroutine(endpoint, fileData, fileName, mimeType, callback));
    }

    private IEnumerator UploadFileCoroutine<T>(
        string endpoint,
        byte[] fileData,
        string fileName,
        string mimeType,
        Action<APIResponse<T>> callback)
    {
        string url = BuildURL(endpoint);

        // 创建 multipart/form-data 表单
        // 类似于前端中的 new FormData()
        List<IMultipartFormSection> formData = new List<IMultipartFormSection>
        {
            new MultipartFormFileSection("file", fileData, fileName, mimeType)
        };

        using (UnityWebRequest request = UnityWebRequest.Post(url, formData))
        {
            // multipart 请求不需要手动设置 Content-Type（Unity 会自动添加 boundary）
            if (!string.IsNullOrEmpty(authToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {authToken}");
            }

            request.timeout = timeoutSeconds * 2; // 文件上传给更多时间

            yield return request.SendWebRequest();

            callback?.Invoke(ProcessResponse<T>(request));
        }
    }

    // ========================================
    // 下载文件（例如下载资源包）
    // ========================================

    /// <summary>
    /// 下载文件到本地
    /// </summary>
    /// <param name="url">完整的文件 URL</param>
    /// <param name="savePath">本地保存路径</param>
    /// <param name="onProgress">下载进度回调（0-1）</param>
    /// <param name="onComplete">完成回调</param>
    public void DownloadFile(
        string url,
        string savePath,
        Action<float> onProgress,
        Action<bool, string> onComplete)
    {
        StartCoroutine(DownloadFileCoroutine(url, savePath, onProgress, onComplete));
    }

    private IEnumerator DownloadFileCoroutine(
        string url,
        string savePath,
        Action<float> onProgress,
        Action<bool, string> onComplete)
    {
        using (UnityWebRequest request = new UnityWebRequest(url, "GET"))
        {
            // 使用 DownloadHandlerFile 直接写入磁盘（节省内存）
            request.downloadHandler = new DownloadHandlerFile(savePath);
            request.timeout = timeoutSeconds * 5;

            var operation = request.SendWebRequest();

            // 报告下载进度
            while (!operation.isDone)
            {
                onProgress?.Invoke(request.downloadProgress);
                yield return null; // 等待一帧
            }

            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log($"[APIClient] 文件下载成功: {savePath}");
                onComplete?.Invoke(true, savePath);
            }
            else
            {
                Debug.LogError($"[APIClient] 文件下载失败: {request.error}");
                onComplete?.Invoke(false, request.error);
            }
        }
    }

    // ========================================
    // 核心请求处理方法
    // ========================================

    /// <summary>
    /// 发送请求（async 版本）
    /// </summary>
    private async Task<APIResponse<T>> SendRequestAsync<T>(UnityWebRequest request)
    {
        SetHeaders(request);
        request.timeout = timeoutSeconds;

        activeRequestCount++;
        OnRequestStarted?.Invoke();

        // UnityWebRequest 的 SendWebRequest 返回 AsyncOperation
        // 我们需要将其包装为 Task
        var operation = request.SendWebRequest();

        // 等待请求完成
        while (!operation.isDone)
        {
            await Task.Yield(); // 让出执行权，类似于 requestAnimationFrame
        }

        activeRequestCount--;
        if (activeRequestCount <= 0)
            OnRequestCompleted?.Invoke();

        return ProcessResponse<T>(request);
    }

    /// <summary>
    /// 处理响应
    /// </summary>
    private APIResponse<T> ProcessResponse<T>(UnityWebRequest request)
    {
        var response = new APIResponse<T>
        {
            StatusCode = request.responseCode,
            RawResponse = request.downloadHandler?.text
        };

        // 检查是否成功
        if (request.result == UnityWebRequest.Result.Success)
        {
            response.IsSuccess = true;

            // 尝试反序列化 JSON 响应
            try
            {
                if (!string.IsNullOrEmpty(response.RawResponse))
                {
                    response.Data = JsonUtility.FromJson<T>(response.RawResponse);
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[APIClient] JSON 反序列化失败: {e.Message}");
                response.Error = $"JSON 解析错误: {e.Message}";
            }

            Debug.Log($"[APIClient] 请求成功 [{response.StatusCode}]: " +
                     $"{response.RawResponse?.Substring(0, Mathf.Min(200, response.RawResponse?.Length ?? 0))}");
        }
        else
        {
            response.IsSuccess = false;
            response.Error = request.error;

            Debug.LogError($"[APIClient] 请求失败 [{response.StatusCode}]: " +
                         $"{request.error} - {response.RawResponse}");

            // 处理特殊状态码
            if (request.responseCode == 401)
            {
                Debug.LogWarning("[APIClient] 认证失败（401），令牌可能已过期");
                OnUnauthorized?.Invoke();
            }
        }

        return response;
    }

    // ========================================
    // 辅助方法
    // ========================================

    /// <summary>
    /// 构建完整 URL
    /// </summary>
    private string BuildURL(string endpoint)
    {
        // 确保 endpoint 以 / 开头
        if (!endpoint.StartsWith("/"))
            endpoint = "/" + endpoint;

        return baseURL.TrimEnd('/') + endpoint;
    }

    /// <summary>
    /// 设置请求头
    /// </summary>
    private void SetHeaders(UnityWebRequest request)
    {
        // 设置默认头
        foreach (var header in defaultHeaders)
        {
            request.SetRequestHeader(header.Key, header.Value);
        }

        // 设置认证头
        if (!string.IsNullOrEmpty(authToken))
        {
            request.SetRequestHeader("Authorization", $"Bearer {authToken}");
        }
    }

    /// <summary>是否有正在进行的请求</summary>
    public bool IsLoading => activeRequestCount > 0;
}

// ========================================
// 使用示例 — 常见的 API 数据模型
// ========================================

/// <summary>
/// 登录请求数据
/// </summary>
[Serializable]
public class LoginRequest
{
    public string username;
    public string password;
}

/// <summary>
/// 登录响应数据
/// </summary>
[Serializable]
public class LoginResponse
{
    public string token;
    public string userId;
    public string username;
}

/// <summary>
/// 玩家数据
/// </summary>
[Serializable]
public class PlayerData
{
    public string playerId;
    public string displayName;
    public int level;
    public int experience;
    public int gold;
}

/// <summary>
/// 排行榜条目
/// </summary>
[Serializable]
public class LeaderboardEntry
{
    public int rank;
    public string playerId;
    public string displayName;
    public int score;
}

// ========================================
// 使用示例代码（在其他脚本中调用）
// ========================================

/*
// === 使用 async/await 方式（推荐） ===

// 登录
async void Login()
{
    var loginData = new LoginRequest
    {
        username = "player1",
        password = "secretpassword"
    };

    var response = await APIClient.Instance.PostAsync<LoginRequest, LoginResponse>(
        "/auth/login", loginData);

    if (response.IsSuccess)
    {
        Debug.Log($"登录成功！Token: {response.Data.token}");
        APIClient.Instance.SetAuthToken(response.Data.token);
    }
    else
    {
        Debug.LogError($"登录失败: {response.Error}");
    }
}

// 获取玩家数据
async void GetPlayerData()
{
    var response = await APIClient.Instance.GetAsync<PlayerData>("/players/me");

    if (response.IsSuccess)
    {
        Debug.Log($"玩家: {response.Data.displayName}, 等级: {response.Data.level}");
    }
}

// === 使用 Coroutine 回调方式 ===

void GetLeaderboard()
{
    APIClient.Instance.Get<LeaderboardEntry[]>("/leaderboard/top10", (response) =>
    {
        if (response.IsSuccess)
        {
            foreach (var entry in response.Data)
            {
                Debug.Log($"#{entry.rank} {entry.displayName}: {entry.score}");
            }
        }
    });
}
*/
```

---

## 25.10 Web 开发 vs 游戏网络对比总结

| Web 概念 | 游戏网络对应 | 说明 |
|----------|------------|------|
| `fetch` / `axios` | `UnityWebRequest` | HTTP 请求 |
| WebSocket | Netcode Transport (UDP) | 实时双向通信 |
| REST API | ServerRpc / ClientRpc | 远程调用 |
| Redux Store | NetworkVariable | 同步状态 |
| `useState` | NetworkVariable | 响应式状态 |
| `useEffect` cleanup | `OnNetworkDespawn` | 清理订阅 |
| Route Guard | ConnectionApproval | 连接验证 |
| Optimistic Update | Client-Side Prediction | 乐观更新 |
| Server-Side Rendering | Server Authoritative | 服务器权威 |
| Event Bus / PubSub | ClientRpc broadcast | 广播事件 |
| Socket.IO rooms | Lobby / Session | 房间/会话 |
| JWT Token | Auth Token + ConnectionPayload | 认证 |

---

## 练习题

### 练习1：简单的多人聊天室（难度：简单）
使用 NGO 创建一个简单的多人聊天室：
1. 一个玩家作为 Host，其他玩家加入
2. 每个玩家可以发送文本消息
3. 所有消息显示在公共聊天面板中

### 练习2：多人位置同步（难度：中等）
创建一个场景，4个玩家在同一个平面上移动：
1. 使用 NetworkTransform 同步位置
2. 每个玩家有不同颜色的标记
3. 头顶显示玩家名称
4. 测试并观察不同延迟下的表现

### 练习3：完整的大厅系统（难度：高级）
扩展 LobbyManager，添加以下功能：
1. 密码保护的房间
2. 房间列表浏览（使用 Unity Lobby Service 或自建 API）
3. 房间内文字聊天
4. 角色选择（预览模型）
5. 倒计时和取消机制

### 练习4：REST API 集成（难度：中等）
使用 APIClient.cs 实现以下功能（可以用 JSONPlaceholder 等免费 API 测试）：
1. 登录并保存 Token
2. 获取并显示排行榜数据
3. 上传玩家游戏分数
4. 实现请求缓存（相同请求在一定时间内不重复发送）

---

## 下一章预告

在下一章**第26章：美术管线与 AI 生成资源**中，我们将学习：
- 资源导入设置优化（纹理、模型、音频）
- 支持的 3D 格式和最佳实践
- AI 工具生成游戏资源（Midjourney、Stable Diffusion、Meshy 等）
- Sprite Atlas 和 Addressables 资源管理
- 资源命名规范和文件夹结构

作为独立开发者或小团队，AI 工具正在彻底改变游戏美术的生产流程——你不再需要是专业美术师也能创建高质量的游戏资源。让我们一起探索这个令人兴奋的领域！
