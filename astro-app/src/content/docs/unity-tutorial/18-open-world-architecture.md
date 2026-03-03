# 第 18 章：开放世界架构设计

> 让无边的世界在手机上流畅运行——区块加载、LOD、对象池与内存管理的艺术。

## 本章目标

完成本章学习后，你将能够：

1. 理解开放世界游戏的核心技术挑战
2. 设计和实现基于区块（Chunk）的世界网格划分系统
3. 使用 Addressables 实现资源的异步加载与卸载
4. 实现世界数据的流式加载（Streaming）
5. 搭建 LOD（Level of Detail）系统，实现远近不同精度的渲染
6. 配置遮挡剔除（Occlusion Culling）减少不可见物体的渲染开销
7. 实现高效的对象池（Object Pool），避免频繁的内存分配和垃圾回收
8. 理解空间分割技术（四叉树/八叉树）的概念与应用
9. 使用增量式场景加载（Additive Scene Loading）管理大世界
10. 设计加载屏幕和无缝过渡系统
11. 制定开放世界的性能预算和内存管理策略

## 预计学习时间

**6 小时**

---

## 18.1 开放世界的技术挑战

### 18.1.1 为什么开放世界很难

```
开放世界的核心矛盾：

内容量巨大：
├── 数千平方米的地形
├── 数万棵树木、建筑、NPC
├── 数百个可交互的物体
└── 大量的纹理、模型、音频资源

设备资源有限（尤其是手机）：
├── 内存: iPhone 15 约 6GB（系统占用后可用 ~3GB）
├── GPU: 移动端 GPU 性能远低于 PC
├── CPU: 大小核架构，持续高负载会降频
├── 电池: 高性能 = 高耗电 = 手机发烫
└── 存储: I/O 速度有限

解决思路：
"不要一次性加载整个世界，只加载玩家看得到的部分"

具体技术：
1. 区块加载（Chunk Loading）：只加载玩家周围的区块
2. LOD 系统：远处物体使用低精度模型
3. 遮挡剔除：被遮挡的物体不渲染
4. 对象池：重用物体避免频繁创建/销毁
5. 流式加载：异步加载资源，不卡顿主线程
```

### 18.1.2 前端类比：你已经在用类似的技术

| 开放世界技术 | 前端对应技术 | 共同目标 |
|-------------|-------------|---------|
| 区块加载 | Code Splitting + Lazy Loading | 按需加载，减少初始负载 |
| LOD 系统 | 响应式图片（srcset） | 根据需要提供不同质量 |
| 遮挡剔除 | Virtualized List（虚拟列表） | 只渲染可见部分 |
| 对象池 | DOM 节点复用（React reconciler） | 避免频繁创建/销毁 |
| 流式加载 | Streaming SSR / Suspense | 渐进式加载内容 |
| Addressables | Dynamic Import (`import()`) | 异步按需导入模块 |

> 💡 **前端类比**：开放世界的区块加载就像 React Router 的 lazy loading——你不会在首页就加载所有页面的代码，而是用户导航到某个页面时才动态加载。开放世界的每个区块就像一个"页面"，玩家走近时才加载。

---

## 18.2 区块系统设计

### 18.2.1 WorldChunk.cs

```csharp
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// WorldChunk.cs —— 世界区块
///
/// 每个区块代表世界网格中的一个格子
/// 包含该区域内的所有游戏对象（地形、树木、建筑等）
///
/// 类比前端：
/// - 区块 ≈ 一个懒加载的页面/路由组件
/// - 区块的加载/卸载 ≈ 组件的 mount/unmount
/// - 区块坐标 ≈ URL path 参数
/// </summary>
public class WorldChunk : MonoBehaviour
{
    // ===== 区块标识 =====

    /// <summary>
    /// 区块在网格中的坐标（不是世界坐标）
    /// 类似前端的路由参数 /world/chunk/:x/:z
    /// </summary>
    public Vector2Int ChunkCoord { get; private set; }

    /// <summary>
    /// 区块大小（世界单位）
    /// </summary>
    public float ChunkSize { get; private set; }

    /// <summary>
    /// 区块在世界中的中心坐标
    /// </summary>
    public Vector3 WorldCenter => new Vector3(
        ChunkCoord.x * ChunkSize + ChunkSize / 2f,
        0,
        ChunkCoord.y * ChunkSize + ChunkSize / 2f
    );

    // ===== 加载状态 =====

    /// <summary>
    /// 区块加载状态枚举
    /// 类似前端组件的生命周期状态
    /// </summary>
    public enum ChunkState
    {
        Unloaded,   // 未加载（组件未挂载）
        Loading,    // 加载中（Suspense loading 状态）
        Loaded,     // 已加载（组件已渲染）
        Unloading   // 卸载中（组件正在 unmount）
    }

    public ChunkState State { get; private set; } = ChunkState.Unloaded;

    // ===== 区块内容 =====

    /// <summary>
    /// 区块内的所有游戏对象
    /// </summary>
    private List<GameObject> chunkObjects = new List<GameObject>();

    /// <summary>
    /// 区块的地形片段
    /// </summary>
    private GameObject terrainPiece;

    /// <summary>
    /// 区块数据（从文件或生成器获取）
    /// </summary>
    private ChunkData chunkData;

    // ===== LOD =====

    /// <summary>
    /// 当前 LOD 级别 (0=最高精度, 越大越低)
    /// </summary>
    public int CurrentLODLevel { get; private set; } = 0;

    // ===== 初始化 =====

    /// <summary>
    /// 初始化区块
    /// </summary>
    /// <param name="coord">网格坐标</param>
    /// <param name="size">区块大小</param>
    public void Initialize(Vector2Int coord, float size)
    {
        ChunkCoord = coord;
        ChunkSize = size;
        gameObject.name = $"Chunk_{coord.x}_{coord.y}";
        transform.position = new Vector3(coord.x * size, 0, coord.y * size);
    }

    // ===== 加载 =====

    /// <summary>
    /// 异步加载区块内容
    /// </summary>
    public async void LoadAsync()
    {
        if (State != ChunkState.Unloaded) return;

        State = ChunkState.Loading;
        Debug.Log($"[Chunk {ChunkCoord}] 开始加载...");

        // 步骤 1：加载区块数据
        chunkData = await LoadChunkDataAsync();

        // 步骤 2：生成地形
        if (chunkData != null)
        {
            GenerateTerrain(chunkData);

            // 步骤 3：放置静态物体（树木、岩石等）
            PlaceStaticObjects(chunkData);

            // 步骤 4：放置动态物体（NPC、怪物等）
            PlaceDynamicObjects(chunkData);
        }

        State = ChunkState.Loaded;
        Debug.Log($"[Chunk {ChunkCoord}] 加载完成，包含 {chunkObjects.Count} 个物体");
    }

    /// <summary>
    /// 异步加载区块数据
    /// 可以从文件加载，也可以程序化生成
    /// </summary>
    private async System.Threading.Tasks.Task<ChunkData> LoadChunkDataAsync()
    {
        // 方案 A：从预制的数据文件加载
        // string path = $"ChunkData/chunk_{ChunkCoord.x}_{ChunkCoord.y}";
        // var request = Resources.LoadAsync<TextAsset>(path);
        // while (!request.isDone) await System.Threading.Tasks.Task.Yield();

        // 方案 B：程序化生成（更适合无限世界）
        return GenerateChunkData();
    }

    /// <summary>
    /// 程序化生成区块数据
    /// </summary>
    private ChunkData GenerateChunkData()
    {
        ChunkData data = new ChunkData();
        data.coord = ChunkCoord;

        // 使用区块坐标作为种子的一部分，确保相同坐标总是生成相同内容
        int chunkSeed = ChunkCoord.x * 10000 + ChunkCoord.y;
        System.Random rng = new System.Random(chunkSeed);

        // 生成该区块内的物体放置数据
        int objectCount = rng.Next(10, 30);
        for (int i = 0; i < objectCount; i++)
        {
            data.objectPlacements.Add(new ObjectPlacement
            {
                prefabId = rng.Next(0, 5).ToString(), // 随机选择预制体
                localPosition = new Vector3(
                    (float)(rng.NextDouble() * ChunkSize),
                    0,
                    (float)(rng.NextDouble() * ChunkSize)
                ),
                rotationY = (float)(rng.NextDouble() * 360),
                scale = 0.8f + (float)(rng.NextDouble() * 0.4f)
            });
        }

        return data;
    }

    /// <summary>
    /// 生成区块地形
    /// </summary>
    private void GenerateTerrain(ChunkData data)
    {
        // 创建一个简单的平面作为地形
        // 实际项目中会使用更复杂的程序化地形（见第 17 章）
        terrainPiece = GameObject.CreatePrimitive(PrimitiveType.Plane);
        terrainPiece.transform.SetParent(transform);
        terrainPiece.transform.localPosition = new Vector3(ChunkSize / 2f, 0, ChunkSize / 2f);
        terrainPiece.transform.localScale = new Vector3(ChunkSize / 10f, 1, ChunkSize / 10f);
        terrainPiece.name = "Terrain";
    }

    /// <summary>
    /// 放置静态物体
    /// </summary>
    private void PlaceStaticObjects(ChunkData data)
    {
        foreach (var placement in data.objectPlacements)
        {
            // 实际项目中通过 prefabId 从资源管理器获取对应预制体
            // 这里用简单的 Cube 代替
            GameObject obj = GameObject.CreatePrimitive(PrimitiveType.Cube);
            obj.transform.SetParent(transform);
            obj.transform.localPosition = placement.localPosition;
            obj.transform.rotation = Quaternion.Euler(0, placement.rotationY, 0);
            obj.transform.localScale = Vector3.one * placement.scale;
            obj.name = $"Object_{placement.prefabId}";

            chunkObjects.Add(obj);
        }
    }

    /// <summary>
    /// 放置动态物体（NPC、怪物等）
    /// </summary>
    private void PlaceDynamicObjects(ChunkData data)
    {
        // 动态物体通常从对象池获取
        // 详见 ObjectPool 部分
    }

    // ===== 卸载 =====

    /// <summary>
    /// 卸载区块内容，释放内存
    /// </summary>
    public void Unload()
    {
        if (State != ChunkState.Loaded) return;

        State = ChunkState.Unloading;
        Debug.Log($"[Chunk {ChunkCoord}] 开始卸载...");

        // 销毁所有区块内物体
        foreach (var obj in chunkObjects)
        {
            if (obj != null)
            {
                Destroy(obj);
            }
        }
        chunkObjects.Clear();

        // 销毁地形
        if (terrainPiece != null)
        {
            Destroy(terrainPiece);
            terrainPiece = null;
        }

        // 清理数据
        chunkData = null;

        State = ChunkState.Unloaded;
        Debug.Log($"[Chunk {ChunkCoord}] 卸载完成");
    }

    // ===== LOD 管理 =====

    /// <summary>
    /// 更新区块的 LOD 级别
    /// </summary>
    /// <param name="distanceToPlayer">与玩家的距离</param>
    /// <param name="lodDistances">各 LOD 级别的切换距离</param>
    public void UpdateLOD(float distanceToPlayer, float[] lodDistances)
    {
        int newLOD = lodDistances.Length; // 最低级别

        for (int i = 0; i < lodDistances.Length; i++)
        {
            if (distanceToPlayer < lodDistances[i])
            {
                newLOD = i;
                break;
            }
        }

        if (newLOD != CurrentLODLevel)
        {
            CurrentLODLevel = newLOD;
            ApplyLOD(newLOD);
        }
    }

    /// <summary>
    /// 应用 LOD 级别
    /// </summary>
    private void ApplyLOD(int level)
    {
        // LOD 0: 全精度——显示所有物体
        // LOD 1: 中精度——隐藏小物体（草、花）
        // LOD 2: 低精度——只显示大型物体（建筑、大树）
        // LOD 3: 极低精度——只显示地形

        foreach (var obj in chunkObjects)
        {
            if (obj == null) continue;

            // 根据物体大小和 LOD 级别决定是否显示
            float objSize = obj.transform.localScale.magnitude;

            bool shouldShow = level switch
            {
                0 => true,                  // 全部显示
                1 => objSize > 0.5f,       // 隐藏小物体
                2 => objSize > 1.5f,       // 只显示大物体
                _ => false                  // 全部隐藏
            };

            obj.SetActive(shouldShow);
        }

        Debug.Log($"[Chunk {ChunkCoord}] LOD 切换到 {level}");
    }

    // ===== 辅助方法 =====

    /// <summary>
    /// 检查指定世界坐标是否在该区块范围内
    /// </summary>
    public bool ContainsWorldPosition(Vector3 worldPos)
    {
        float minX = ChunkCoord.x * ChunkSize;
        float maxX = minX + ChunkSize;
        float minZ = ChunkCoord.y * ChunkSize;
        float maxZ = minZ + ChunkSize;

        return worldPos.x >= minX && worldPos.x < maxX &&
               worldPos.z >= minZ && worldPos.z < maxZ;
    }

    /// <summary>
    /// 获取该区块与指定位置的距离
    /// </summary>
    public float GetDistanceTo(Vector3 position)
    {
        return Vector3.Distance(WorldCenter, position);
    }
}

/// <summary>
/// 区块数据——序列化的区块内容信息
/// </summary>
[System.Serializable]
public class ChunkData
{
    public Vector2Int coord;
    public List<ObjectPlacement> objectPlacements = new List<ObjectPlacement>();
}

/// <summary>
/// 物体放置信息
/// </summary>
[System.Serializable]
public class ObjectPlacement
{
    public string prefabId;
    public Vector3 localPosition;
    public float rotationY;
    public float scale;
}
```

[截图：世界被划分为网格区块的俯视图，玩家周围的区块高亮显示]

---

## 18.3 区块加载管理器

### 18.3.1 ChunkLoader.cs

```csharp
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// ChunkLoader.cs —— 区块加载管理器
///
/// 根据玩家位置动态加载/卸载区块
/// 是开放世界最核心的管理组件
///
/// 类比前端：
/// - 类似 React 的虚拟列表（react-virtualized / react-window）
/// - 只渲染"可见窗口"内的列表项
/// - 玩家移动 = 滚动 → 触发新区域的加载和旧区域的卸载
///
/// 工作流程：
/// 1. 每帧检查玩家所在的区块坐标
/// 2. 如果玩家移动到新区块，重新计算需要加载的区块范围
/// 3. 加载新进入范围的区块
/// 4. 卸载离开范围的区块
/// </summary>
public class ChunkLoader : MonoBehaviour
{
    [Header("引用")]
    [Tooltip("玩家（或摄像机）Transform")]
    [SerializeField] private Transform playerTransform;

    [Header("区块设置")]
    [Tooltip("每个区块的大小（世界单位，正方形边长）")]
    [SerializeField] private float chunkSize = 50f;

    [Tooltip("玩家周围加载的区块半径（以区块为单位）")]
    [Range(1, 10)]
    [SerializeField] private int loadRadius = 3;

    [Tooltip("开始卸载的区块距离（应大于 loadRadius）")]
    [Range(2, 15)]
    [SerializeField] private int unloadRadius = 5;

    [Header("性能控制")]
    [Tooltip("每帧最多加载的区块数")]
    [Range(1, 5)]
    [SerializeField] private int maxChunksPerFrame = 2;

    [Tooltip("检查间隔（秒）——不需要每帧都检查")]
    [SerializeField] private float checkInterval = 0.5f;

    [Header("LOD 距离")]
    [Tooltip("各 LOD 级别的切换距离")]
    [SerializeField] private float[] lodDistances = { 50f, 100f, 200f };

    // ===== 内部状态 =====

    /// <summary>
    /// 所有已加载的区块字典
    /// key: 区块坐标, value: 区块实例
    /// 类似前端的 Map<string, Component>
    /// </summary>
    private Dictionary<Vector2Int, WorldChunk> loadedChunks = new Dictionary<Vector2Int, WorldChunk>();

    /// <summary>
    /// 待加载的区块队列
    /// </summary>
    private Queue<Vector2Int> loadQueue = new Queue<Vector2Int>();

    /// <summary>
    /// 玩家当前所在的区块坐标
    /// </summary>
    private Vector2Int currentPlayerChunk;

    /// <summary>
    /// 上次检查时间
    /// </summary>
    private float lastCheckTime;

    /// <summary>
    /// 区块父物体（用于组织层级）
    /// </summary>
    private Transform chunkParent;

    // ===== 公共属性 =====

    /// <summary>
    /// 已加载的区块总数
    /// </summary>
    public int LoadedChunkCount => loadedChunks.Count;

    /// <summary>
    /// 待加载的区块数
    /// </summary>
    public int PendingChunkCount => loadQueue.Count;

    void Awake()
    {
        // 创建区块父物体
        GameObject parentObj = new GameObject("World_Chunks");
        chunkParent = parentObj.transform;
    }

    void Start()
    {
        if (playerTransform == null)
        {
            // 尝试自动查找玩家
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
                playerTransform = player.transform;
            else
                Debug.LogError("[ChunkLoader] 未找到玩家 Transform！");
        }

        // 初始加载
        UpdatePlayerChunk();
        RefreshChunkLoading();
    }

    void Update()
    {
        if (playerTransform == null) return;

        // 限制检查频率
        if (Time.time - lastCheckTime < checkInterval) return;
        lastCheckTime = Time.time;

        // 检查玩家是否移动到了新区块
        Vector2Int newChunk = WorldToChunkCoord(playerTransform.position);

        if (newChunk != currentPlayerChunk)
        {
            currentPlayerChunk = newChunk;
            RefreshChunkLoading();
        }

        // 处理加载队列
        ProcessLoadQueue();

        // 更新 LOD
        UpdateAllChunksLOD();
    }

    /// <summary>
    /// 将世界坐标转换为区块坐标
    /// </summary>
    private Vector2Int WorldToChunkCoord(Vector3 worldPos)
    {
        return new Vector2Int(
            Mathf.FloorToInt(worldPos.x / chunkSize),
            Mathf.FloorToInt(worldPos.z / chunkSize)
        );
    }

    /// <summary>
    /// 更新玩家所在区块
    /// </summary>
    private void UpdatePlayerChunk()
    {
        if (playerTransform != null)
        {
            currentPlayerChunk = WorldToChunkCoord(playerTransform.position);
        }
    }

    /// <summary>
    /// 刷新区块加载状态
    /// 决定哪些区块需要加载，哪些需要卸载
    /// </summary>
    private void RefreshChunkLoading()
    {
        // 收集需要加载的区块坐标
        HashSet<Vector2Int> requiredChunks = new HashSet<Vector2Int>();

        for (int x = -loadRadius; x <= loadRadius; x++)
        {
            for (int z = -loadRadius; z <= loadRadius; z++)
            {
                Vector2Int coord = currentPlayerChunk + new Vector2Int(x, z);

                // 可选：使用圆形范围而非方形
                float distSq = x * x + z * z;
                if (distSq <= loadRadius * loadRadius)
                {
                    requiredChunks.Add(coord);
                }
            }
        }

        // 加入待加载队列：需要但未加载的区块
        foreach (var coord in requiredChunks)
        {
            if (!loadedChunks.ContainsKey(coord) && !loadQueue.Contains(coord))
            {
                loadQueue.Enqueue(coord);
            }
        }

        // 卸载：已加载但超出范围的区块
        List<Vector2Int> chunksToUnload = new List<Vector2Int>();

        foreach (var kvp in loadedChunks)
        {
            Vector2Int coord = kvp.Key;
            int dx = coord.x - currentPlayerChunk.x;
            int dz = coord.y - currentPlayerChunk.y;
            float distSq = dx * dx + dz * dz;

            if (distSq > unloadRadius * unloadRadius)
            {
                chunksToUnload.Add(coord);
            }
        }

        foreach (var coord in chunksToUnload)
        {
            UnloadChunk(coord);
        }

        Debug.Log($"[ChunkLoader] 玩家区块: {currentPlayerChunk}, " +
                  $"需要: {requiredChunks.Count}, " +
                  $"待加载: {loadQueue.Count}, " +
                  $"卸载: {chunksToUnload.Count}");
    }

    /// <summary>
    /// 处理加载队列
    /// 每帧加载有限数量的区块，避免卡顿
    /// 类似前端的 requestIdleCallback 或 setTimeout 分片加载
    /// </summary>
    private void ProcessLoadQueue()
    {
        int loaded = 0;

        while (loadQueue.Count > 0 && loaded < maxChunksPerFrame)
        {
            Vector2Int coord = loadQueue.Dequeue();

            // 再次检查是否仍然需要（玩家可能已经移动走了）
            int dx = coord.x - currentPlayerChunk.x;
            int dz = coord.y - currentPlayerChunk.y;
            if (dx * dx + dz * dz > loadRadius * loadRadius)
            {
                continue; // 跳过不再需要的区块
            }

            if (!loadedChunks.ContainsKey(coord))
            {
                LoadChunk(coord);
                loaded++;
            }
        }
    }

    /// <summary>
    /// 加载单个区块
    /// </summary>
    private void LoadChunk(Vector2Int coord)
    {
        // 创建区块 GameObject
        GameObject chunkObj = new GameObject();
        chunkObj.transform.SetParent(chunkParent);

        WorldChunk chunk = chunkObj.AddComponent<WorldChunk>();
        chunk.Initialize(coord, chunkSize);
        chunk.LoadAsync();

        loadedChunks[coord] = chunk;
    }

    /// <summary>
    /// 卸载单个区块
    /// </summary>
    private void UnloadChunk(Vector2Int coord)
    {
        if (loadedChunks.TryGetValue(coord, out WorldChunk chunk))
        {
            chunk.Unload();
            Destroy(chunk.gameObject);
            loadedChunks.Remove(coord);
        }
    }

    /// <summary>
    /// 更新所有已加载区块的 LOD 级别
    /// </summary>
    private void UpdateAllChunksLOD()
    {
        if (playerTransform == null) return;

        foreach (var kvp in loadedChunks)
        {
            WorldChunk chunk = kvp.Value;
            if (chunk.State == WorldChunk.ChunkState.Loaded)
            {
                float distance = chunk.GetDistanceTo(playerTransform.position);
                chunk.UpdateLOD(distance, lodDistances);
            }
        }
    }

    // ===== 公共方法 =====

    /// <summary>
    /// 获取指定坐标的区块（如果已加载）
    /// </summary>
    public WorldChunk GetChunkAt(Vector2Int coord)
    {
        loadedChunks.TryGetValue(coord, out WorldChunk chunk);
        return chunk;
    }

    /// <summary>
    /// 获取世界坐标处的区块
    /// </summary>
    public WorldChunk GetChunkAtWorldPosition(Vector3 worldPos)
    {
        Vector2Int coord = WorldToChunkCoord(worldPos);
        return GetChunkAt(coord);
    }

    /// <summary>
    /// 强制重新加载所有区块（比如切换世界种子时）
    /// </summary>
    public void ReloadAllChunks()
    {
        // 卸载所有
        List<Vector2Int> allCoords = new List<Vector2Int>(loadedChunks.Keys);
        foreach (var coord in allCoords)
        {
            UnloadChunk(coord);
        }

        loadQueue.Clear();

        // 重新加载
        UpdatePlayerChunk();
        RefreshChunkLoading();
    }

    /// <summary>
    /// 绘制调试 Gizmos
    /// </summary>
    void OnDrawGizmosSelected()
    {
        if (playerTransform == null) return;

        Vector2Int playerChunk = WorldToChunkCoord(playerTransform.position);

        // 绘制加载范围
        Gizmos.color = new Color(0, 1, 0, 0.1f);
        for (int x = -loadRadius; x <= loadRadius; x++)
        {
            for (int z = -loadRadius; z <= loadRadius; z++)
            {
                if (x * x + z * z <= loadRadius * loadRadius)
                {
                    Vector3 center = new Vector3(
                        (playerChunk.x + x) * chunkSize + chunkSize / 2f,
                        0,
                        (playerChunk.y + z) * chunkSize + chunkSize / 2f
                    );
                    Gizmos.DrawWireCube(center, new Vector3(chunkSize, 2, chunkSize));
                }
            }
        }

        // 绘制卸载范围
        Gizmos.color = new Color(1, 0, 0, 0.05f);
        for (int x = -unloadRadius; x <= unloadRadius; x++)
        {
            for (int z = -unloadRadius; z <= unloadRadius; z++)
            {
                if (x * x + z * z <= unloadRadius * unloadRadius)
                {
                    Vector3 center = new Vector3(
                        (playerChunk.x + x) * chunkSize + chunkSize / 2f,
                        0,
                        (playerChunk.y + z) * chunkSize + chunkSize / 2f
                    );
                    Gizmos.DrawWireCube(center, new Vector3(chunkSize, 1, chunkSize));
                }
            }
        }
    }
}
```

[截图：Scene 视图中显示的区块加载范围 Gizmos——绿色=加载范围，红色=卸载范围]

---

## 18.4 对象池系统

### 18.4.1 ObjectPool.cs

```csharp
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// ObjectPool.cs —— 通用对象池
///
/// 对象池的核心思想：
/// 不销毁不再使用的对象，而是"回收"它们以备后续重用
///
/// 问题（不使用对象池）：
/// 1. 怪物被击杀 → Destroy(monster) → 触发 GC
/// 2. 新怪物生成 → Instantiate(monsterPrefab) → 分配内存
/// 3. 大量的创建/销毁 → 频繁 GC → 游戏卡顿（特别是手机上）
///
/// 解决（使用对象池）：
/// 1. 游戏开始时预创建一批对象
/// 2. 需要时从池中"借出" → SetActive(true)
/// 3. 不需要时"归还"到池中 → SetActive(false)
/// 4. 池空了才创建新的
///
/// 类比前端：
/// - 类似 React 的 Fiber reconciler 复用 DOM 节点
/// - 类似 RecyclerView / UICollectionView 的 cell 复用机制
/// - 类似数据库连接池的概念
/// </summary>
public class ObjectPool : MonoBehaviour
{
    // ===== 单例 =====
    public static ObjectPool Instance { get; private set; }

    /// <summary>
    /// 池配置——定义每种预制体的池大小
    /// </summary>
    [System.Serializable]
    public class PoolConfig
    {
        [Tooltip("预制体")]
        public GameObject prefab;

        [Tooltip("池的初始大小")]
        public int initialSize = 10;

        [Tooltip("池的最大大小（0=无限制）")]
        public int maxSize = 50;

        [Tooltip("池可以自动扩展")]
        public bool canExpand = true;

        [Tooltip("池的名称标签")]
        public string tag;
    }

    [Header("池配置")]
    [SerializeField] private List<PoolConfig> poolConfigs = new List<PoolConfig>();

    /// <summary>
    /// 内部池数据
    /// </summary>
    private class Pool
    {
        public PoolConfig config;
        public Queue<GameObject> availableObjects;  // 可用对象队列
        public List<GameObject> allObjects;          // 所有对象（用于统计和清理）
        public Transform container;                  // 池的容器对象

        public int ActiveCount => allObjects.Count - availableObjects.Count;
        public int TotalCount => allObjects.Count;
    }

    /// <summary>
    /// 所有池的字典
    /// key: prefab 的 InstanceID 或 tag
    /// </summary>
    private Dictionary<string, Pool> pools = new Dictionary<string, Pool>();

    /// <summary>
    /// 从对象实例查找它属于哪个池
    /// </summary>
    private Dictionary<GameObject, string> objectToPoolKey = new Dictionary<GameObject, string>();

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        // 初始化所有配置的池
        foreach (var config in poolConfigs)
        {
            CreatePool(config);
        }
    }

    /// <summary>
    /// 创建一个新的对象池
    /// </summary>
    private void CreatePool(PoolConfig config)
    {
        if (config.prefab == null)
        {
            Debug.LogError("[ObjectPool] 池配置中的 prefab 为空！");
            return;
        }

        string key = GetPoolKey(config);

        if (pools.ContainsKey(key))
        {
            Debug.LogWarning($"[ObjectPool] 池 '{key}' 已存在，跳过创建");
            return;
        }

        // 创建池容器
        GameObject containerObj = new GameObject($"Pool_{config.tag ?? config.prefab.name}");
        containerObj.transform.SetParent(transform);

        Pool pool = new Pool
        {
            config = config,
            availableObjects = new Queue<GameObject>(),
            allObjects = new List<GameObject>(),
            container = containerObj.transform
        };

        // 预创建对象
        for (int i = 0; i < config.initialSize; i++)
        {
            GameObject obj = CreatePoolObject(config.prefab, pool);
            obj.SetActive(false);
            pool.availableObjects.Enqueue(obj);
        }

        pools[key] = pool;
        Debug.Log($"[ObjectPool] 创建池 '{key}': 初始大小 {config.initialSize}");
    }

    /// <summary>
    /// 创建池中的对象
    /// </summary>
    private GameObject CreatePoolObject(GameObject prefab, Pool pool)
    {
        GameObject obj = Instantiate(prefab, pool.container);
        obj.name = $"{prefab.name}_{pool.allObjects.Count}";
        pool.allObjects.Add(obj);

        // 添加池标记组件（用于归还时识别）
        PoolObject poolObj = obj.AddComponent<PoolObject>();
        poolObj.PoolKey = GetPoolKey(pool.config);

        string key = GetPoolKey(pool.config);
        objectToPoolKey[obj] = key;

        return obj;
    }

    /// <summary>
    /// 获取池的唯一标识
    /// </summary>
    private string GetPoolKey(PoolConfig config)
    {
        return !string.IsNullOrEmpty(config.tag)
            ? config.tag
            : config.prefab.GetInstanceID().ToString();
    }

    // ===== 公共 API =====

    /// <summary>
    /// 从池中获取一个对象
    /// 类似前端的 pool.acquire() 或 pool.checkout()
    /// </summary>
    /// <param name="tag">池标签（或 prefab 名称）</param>
    /// <param name="position">放置位置</param>
    /// <param name="rotation">放置旋转</param>
    /// <returns>池中的对象，如果池不存在返回 null</returns>
    public GameObject Get(string tag, Vector3 position = default, Quaternion rotation = default)
    {
        if (!pools.TryGetValue(tag, out Pool pool))
        {
            Debug.LogWarning($"[ObjectPool] 池 '{tag}' 不存在");
            return null;
        }

        GameObject obj;

        if (pool.availableObjects.Count > 0)
        {
            // 从可用队列中取出
            obj = pool.availableObjects.Dequeue();
        }
        else if (pool.config.canExpand &&
                 (pool.config.maxSize == 0 || pool.allObjects.Count < pool.config.maxSize))
        {
            // 池已空但可以扩展，创建新对象
            obj = CreatePoolObject(pool.config.prefab, pool);
            Debug.Log($"[ObjectPool] 池 '{tag}' 扩展，当前大小: {pool.allObjects.Count}");
        }
        else
        {
            // 池满了且不能扩展
            Debug.LogWarning($"[ObjectPool] 池 '{tag}' 已满 (最大: {pool.config.maxSize})");
            return null;
        }

        // 设置位置和旋转
        obj.transform.position = position;
        obj.transform.rotation = rotation;

        // 激活对象
        obj.SetActive(true);

        // 调用池对象的 OnGetFromPool 回调
        IPoolable poolable = obj.GetComponent<IPoolable>();
        poolable?.OnGetFromPool();

        return obj;
    }

    /// <summary>
    /// 通过 prefab 引用获取对象
    /// </summary>
    public GameObject Get(GameObject prefab, Vector3 position = default, Quaternion rotation = default)
    {
        string key = prefab.GetInstanceID().ToString();

        // 如果池不存在，自动创建
        if (!pools.ContainsKey(key))
        {
            var config = new PoolConfig
            {
                prefab = prefab,
                initialSize = 5,
                maxSize = 50,
                canExpand = true,
                tag = key
            };
            CreatePool(config);
        }

        return Get(key, position, rotation);
    }

    /// <summary>
    /// 将对象归还到池中
    /// 类似前端的 pool.release() 或 pool.checkin()
    /// </summary>
    /// <param name="obj">要归还的对象</param>
    public void Return(GameObject obj)
    {
        if (obj == null) return;

        // 查找对象所属的池
        if (!objectToPoolKey.TryGetValue(obj, out string key) ||
            !pools.TryGetValue(key, out Pool pool))
        {
            // 不是池对象，直接销毁
            Debug.LogWarning($"[ObjectPool] 对象 '{obj.name}' 不属于任何池，直接销毁");
            Destroy(obj);
            return;
        }

        // 调用池对象的 OnReturnToPool 回调
        IPoolable poolable = obj.GetComponent<IPoolable>();
        poolable?.OnReturnToPool();

        // 隐藏对象
        obj.SetActive(false);

        // 重置位置（回到池容器下）
        obj.transform.SetParent(pool.container);

        // 归还到可用队列
        pool.availableObjects.Enqueue(obj);
    }

    /// <summary>
    /// 延迟归还（类似 Destroy 的延迟版本）
    /// </summary>
    public void ReturnDelayed(GameObject obj, float delay)
    {
        StartCoroutine(ReturnAfterDelay(obj, delay));
    }

    private System.Collections.IEnumerator ReturnAfterDelay(GameObject obj, float delay)
    {
        yield return new WaitForSeconds(delay);
        Return(obj);
    }

    /// <summary>
    /// 获取池的统计信息
    /// </summary>
    public string GetPoolStats()
    {
        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.AppendLine("=== 对象池统计 ===");

        foreach (var kvp in pools)
        {
            Pool pool = kvp.Value;
            sb.AppendLine($"  [{kvp.Key}] 总计: {pool.TotalCount}, " +
                         $"活跃: {pool.ActiveCount}, " +
                         $"可用: {pool.availableObjects.Count}");
        }

        return sb.ToString();
    }

    /// <summary>
    /// 预热指定池（提前创建对象）
    /// </summary>
    public void Warmup(string tag, int count)
    {
        if (!pools.TryGetValue(tag, out Pool pool)) return;

        for (int i = 0; i < count; i++)
        {
            if (pool.config.maxSize > 0 && pool.allObjects.Count >= pool.config.maxSize)
                break;

            GameObject obj = CreatePoolObject(pool.config.prefab, pool);
            obj.SetActive(false);
            pool.availableObjects.Enqueue(obj);
        }

        Debug.Log($"[ObjectPool] 预热池 '{tag}': 新增 {count}, 总计: {pool.TotalCount}");
    }

    /// <summary>
    /// 清空指定池
    /// </summary>
    public void ClearPool(string tag)
    {
        if (!pools.TryGetValue(tag, out Pool pool)) return;

        foreach (var obj in pool.allObjects)
        {
            if (obj != null)
            {
                objectToPoolKey.Remove(obj);
                Destroy(obj);
            }
        }

        pool.allObjects.Clear();
        pool.availableObjects.Clear();
        Debug.Log($"[ObjectPool] 已清空池 '{tag}'");
    }
}

/// <summary>
/// 池对象标记组件
/// 附加在池中的每个对象上，用于归还时识别所属池
/// </summary>
public class PoolObject : MonoBehaviour
{
    public string PoolKey { get; set; }
}

/// <summary>
/// 可池化接口
/// 实现此接口的组件会在取出/归还时收到回调
///
/// 类比前端：
/// - OnGetFromPool ≈ componentDidMount / useEffect(mount)
/// - OnReturnToPool ≈ componentWillUnmount / useEffect(cleanup)
/// </summary>
public interface IPoolable
{
    /// <summary>
    /// 从池中取出时调用——初始化/重置状态
    /// </summary>
    void OnGetFromPool();

    /// <summary>
    /// 归还到池中时调用——清理状态
    /// </summary>
    void OnReturnToPool();
}

/// <summary>
/// IPoolable 使用示例：可复用的投射物（子弹/箭矢）
/// </summary>
public class Projectile : MonoBehaviour, IPoolable
{
    [SerializeField] private float speed = 20f;
    [SerializeField] private float lifetime = 5f;
    [SerializeField] private int damage = 10;

    private float spawnTime;

    public void OnGetFromPool()
    {
        // 重置状态
        spawnTime = Time.time;

        // 重置物理状态
        Rigidbody rb = GetComponent<Rigidbody>();
        if (rb != null)
        {
            rb.linearVelocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
        }

        // 5 秒后自动归还
        ObjectPool.Instance.ReturnDelayed(gameObject, lifetime);
    }

    public void OnReturnToPool()
    {
        // 清理：停止所有特效、重置 Trail Renderer 等
        TrailRenderer trail = GetComponent<TrailRenderer>();
        if (trail != null)
        {
            trail.Clear();
        }
    }

    void Update()
    {
        // 前进
        transform.Translate(Vector3.forward * speed * Time.deltaTime);
    }

    void OnTriggerEnter(Collider other)
    {
        // 命中目标
        // other.GetComponent<Health>()?.TakeDamage(damage);

        // 归还到池中（而不是 Destroy）
        ObjectPool.Instance.Return(gameObject);
    }
}
```

[截图：Inspector 中 ObjectPool 的配置面板，显示多个池的统计信息]

---

## 18.5 世界管理器

### 18.5.1 WorldManager.cs

```csharp
using UnityEngine;
using UnityEngine.SceneManagement;
using System.Collections;

/// <summary>
/// WorldManager.cs —— 开放世界总管理器
///
/// 协调所有开放世界子系统：
/// - ChunkLoader: 区块加载/卸载
/// - ObjectPool: 对象池管理
/// - LOD 系统
/// - 场景管理
/// - 加载屏幕
///
/// 类比前端：
/// - 类似 App.tsx 根组件，管理所有全局状态和子系统
/// - 类似 Next.js 的 _app.tsx + middleware + layout
/// </summary>
public class WorldManager : MonoBehaviour
{
    // ===== 单例 =====
    public static WorldManager Instance { get; private set; }

    // ===== 子系统引用 =====

    [Header("子系统")]
    [SerializeField] private ChunkLoader chunkLoader;
    [SerializeField] private ObjectPool objectPool;

    [Header("玩家")]
    [SerializeField] private Transform playerTransform;

    [Header("世界设置")]
    [Tooltip("世界种子")]
    [SerializeField] private int worldSeed = 42;

    [Tooltip("世界的边界大小（0=无限）")]
    [SerializeField] private float worldBoundary = 0f;

    [Header("加载屏幕")]
    [SerializeField] private GameObject loadingScreenPrefab;
    [SerializeField] private float minimumLoadingTime = 1f;

    [Header("性能监控")]
    [SerializeField] private bool showDebugInfo = true;

    // ===== 性能监控 =====

    /// <summary>
    /// 性能数据
    /// </summary>
    public struct PerformanceStats
    {
        public int loadedChunks;
        public int activePoolObjects;
        public float memoryUsageMB;
        public float fps;
        public int drawCalls;
        public int triangles;
    }

    public PerformanceStats CurrentStats { get; private set; }

    private float fpsTimer;
    private int frameCount;
    private float currentFps;

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    void Start()
    {
        InitializeWorld();
    }

    /// <summary>
    /// 初始化世界
    /// </summary>
    private void InitializeWorld()
    {
        Debug.Log($"[WorldManager] 初始化开放世界，种子: {worldSeed}");

        // 设置全局随机种子
        Random.InitState(worldSeed);

        // 初始化各子系统
        // chunkLoader 和 objectPool 通过 Inspector 配置并在各自的 Awake/Start 中初始化

        // 设置性能预算
        SetPerformanceBudget();

        Debug.Log("[WorldManager] 世界初始化完成");
    }

    /// <summary>
    /// 设置性能预算
    /// 移动端需要严格的性能控制
    /// </summary>
    private void SetPerformanceBudget()
    {
        // 目标帧率
        Application.targetFrameRate = 60;

        // 固定时间步长（物理更新频率）
        Time.fixedDeltaTime = 1f / 50f; // 50Hz 物理更新

        // 垃圾回收设置
        // 增量式 GC（减少 GC 造成的卡顿）
        // 注意：这需要在 Player Settings 中启用 Incremental GC
        #if !UNITY_EDITOR
        // System.GC.Collect() 的调用由 Unity 自动管理
        // 我们可以通过减少垃圾产生来降低 GC 压力
        #endif

        Debug.Log($"[WorldManager] 性能预算设置完成");
        Debug.Log($"  目标帧率: {Application.targetFrameRate}");
        Debug.Log($"  物理更新频率: {1f / Time.fixedDeltaTime}Hz");
        Debug.Log($"  系统内存: {SystemInfo.systemMemorySize}MB");
        Debug.Log($"  显存: {SystemInfo.graphicsMemorySize}MB");
    }

    void Update()
    {
        // FPS 计算
        UpdateFPS();

        // 性能数据收集
        if (showDebugInfo)
        {
            UpdatePerformanceStats();
        }

        // 世界边界检查
        if (worldBoundary > 0 && playerTransform != null)
        {
            EnforceWorldBoundary();
        }
    }

    /// <summary>
    /// 更新 FPS 计数
    /// </summary>
    private void UpdateFPS()
    {
        frameCount++;
        fpsTimer += Time.unscaledDeltaTime;

        if (fpsTimer >= 1f)
        {
            currentFps = frameCount / fpsTimer;
            frameCount = 0;
            fpsTimer = 0f;
        }
    }

    /// <summary>
    /// 更新性能统计
    /// </summary>
    private void UpdatePerformanceStats()
    {
        CurrentStats = new PerformanceStats
        {
            loadedChunks = chunkLoader != null ? chunkLoader.LoadedChunkCount : 0,
            memoryUsageMB = (float)System.GC.GetTotalMemory(false) / (1024 * 1024),
            fps = currentFps
        };
    }

    /// <summary>
    /// 限制玩家在世界边界内
    /// </summary>
    private void EnforceWorldBoundary()
    {
        Vector3 pos = playerTransform.position;
        float half = worldBoundary / 2f;

        pos.x = Mathf.Clamp(pos.x, -half, half);
        pos.z = Mathf.Clamp(pos.z, -half, half);

        playerTransform.position = pos;
    }

    // ===== 场景管理 =====

    /// <summary>
    /// 增量式加载场景（Additive Scene Loading）
    ///
    /// 增量式加载的意思是：不替换当前场景，而是在当前场景上"叠加"新场景
    /// 这样可以把大世界分成多个场景文件，按需加载
    ///
    /// 类比前端：
    /// - 类似 React Portal 或 iframe——在主页面上叠加新内容
    /// - 类似 Next.js 的 parallel routes
    /// - 每个场景 ≈ 一个独立的 micro-frontend
    /// </summary>
    public void LoadSceneAdditive(string sceneName)
    {
        StartCoroutine(LoadSceneAdditiveAsync(sceneName));
    }

    private IEnumerator LoadSceneAdditiveAsync(string sceneName)
    {
        // 检查场景是否已加载
        Scene scene = SceneManager.GetSceneByName(sceneName);
        if (scene.isLoaded)
        {
            Debug.Log($"[WorldManager] 场景 '{sceneName}' 已加载，跳过");
            yield break;
        }

        Debug.Log($"[WorldManager] 开始增量加载场景: {sceneName}");

        AsyncOperation asyncLoad = SceneManager.LoadSceneAsync(sceneName, LoadSceneMode.Additive);
        asyncLoad.allowSceneActivation = true;

        while (!asyncLoad.isDone)
        {
            Debug.Log($"  加载进度: {asyncLoad.progress * 100:F0}%");
            yield return null;
        }

        Debug.Log($"[WorldManager] 场景 '{sceneName}' 加载完成");
    }

    /// <summary>
    /// 卸载增量场景
    /// </summary>
    public void UnloadSceneAdditive(string sceneName)
    {
        StartCoroutine(UnloadSceneAsync(sceneName));
    }

    private IEnumerator UnloadSceneAsync(string sceneName)
    {
        Scene scene = SceneManager.GetSceneByName(sceneName);
        if (!scene.isLoaded)
        {
            Debug.LogWarning($"[WorldManager] 场景 '{sceneName}' 未加载，无法卸载");
            yield break;
        }

        AsyncOperation asyncUnload = SceneManager.UnloadSceneAsync(sceneName);

        while (!asyncUnload.isDone)
        {
            yield return null;
        }

        // 卸载后清理未使用的资源
        yield return Resources.UnloadUnusedAssets();

        Debug.Log($"[WorldManager] 场景 '{sceneName}' 已卸载");
    }

    // ===== 加载屏幕 =====

    /// <summary>
    /// 带加载屏幕的场景切换
    /// </summary>
    public void TransitionToScene(string sceneName)
    {
        StartCoroutine(TransitionRoutine(sceneName));
    }

    private IEnumerator TransitionRoutine(string sceneName)
    {
        float startTime = Time.realtimeSinceStartup;

        // 显示加载屏幕
        GameObject loadingScreen = null;
        if (loadingScreenPrefab != null)
        {
            loadingScreen = Instantiate(loadingScreenPrefab);
            DontDestroyOnLoad(loadingScreen);
        }

        // 淡入加载屏幕
        yield return new WaitForSeconds(0.5f);

        // 加载新场景
        AsyncOperation asyncLoad = SceneManager.LoadSceneAsync(sceneName);
        asyncLoad.allowSceneActivation = false;

        while (asyncLoad.progress < 0.9f)
        {
            // 更新进度条
            float progress = Mathf.Clamp01(asyncLoad.progress / 0.9f);
            // loadingScreen?.GetComponent<LoadingScreenUI>()?.SetProgress(progress);
            yield return null;
        }

        // 确保最小加载时间（避免闪烁）
        float elapsed = Time.realtimeSinceStartup - startTime;
        if (elapsed < minimumLoadingTime)
        {
            yield return new WaitForSecondsRealtime(minimumLoadingTime - elapsed);
        }

        // 激活新场景
        asyncLoad.allowSceneActivation = true;

        while (!asyncLoad.isDone)
        {
            yield return null;
        }

        // 等待新场景初始化
        yield return null;

        // 淡出加载屏幕
        yield return new WaitForSeconds(0.5f);

        // 销毁加载屏幕
        if (loadingScreen != null)
        {
            Destroy(loadingScreen);
        }

        // 清理资源
        yield return Resources.UnloadUnusedAssets();
        System.GC.Collect();
    }

    // ===== 空间分割概念 =====

    /// <summary>
    /// 空间分割技术概览
    ///
    /// 四叉树（Quadtree）—— 2D 空间分割：
    /// ┌──────┬──────┐
    /// │  NW  │  NE  │  每个节点递归分成 4 个象限
    /// │      │      │  直到节点内的物体数量低于阈值
    /// ├──────┼──────┤
    /// │  SW  │  SE  │  用途：
    /// │      │      │  - 快速查找某区域内的物体
    /// └──────┴──────┘  - 碰撞检测优化
    ///                   - 区域查询（如"范围内的敌人"）
    ///
    /// 八叉树（Octree）—— 3D 空间分割：
    /// 原理与四叉树相同，但在 3D 空间中分成 8 个子节点
    /// 适用于有大量垂直变化的场景（如空中有飞行物体）
    ///
    /// 类比前端：
    /// - 类似 R-tree 索引（PostGIS 中的空间查询）
    /// - 类似 KD-tree（用于最近邻搜索）
    /// - 目的都是：避免遍历所有元素，快速缩小搜索范围
    /// </summary>
    void SpacePartitioningNotes() { }

    // ===== Addressables 概念 =====

    /// <summary>
    /// Addressables 资源管理系统概览
    ///
    /// Addressables 是 Unity 的高级资源管理系统：
    /// - 每个资源有一个唯一的"地址"（Address）
    /// - 支持异步加载和卸载
    /// - 自动处理依赖关系
    /// - 支持远程资源（从服务器下载）
    /// - 支持资源分组和标签
    ///
    /// 类比前端：
    /// - Address ≈ import() 的模块路径
    /// - Asset Group ≈ webpack 的 chunk
    /// - Remote Assets ≈ CDN 上的资源
    /// - Label ≈ webpack 的 magic comment (webpackChunkName)
    ///
    /// 基本使用流程：
    /// 1. 在编辑器中标记资源为 Addressable
    /// 2. 设置资源的 Address 和 Group
    /// 3. 代码中通过 Address 异步加载
    ///
    /// 示例代码（需要安装 Addressables 包）：
    ///
    /// // 加载单个资源
    /// var handle = Addressables.LoadAssetAsync<GameObject>("Trees/Oak_01");
    /// handle.Completed += (op) => {
    ///     GameObject prefab = op.Result;
    ///     Instantiate(prefab, position, rotation);
    /// };
    ///
    /// // 加载一组资源
    /// var handle = Addressables.LoadAssetsAsync<GameObject>("ForestTrees",
    ///     (tree) => {
    ///         // 每加载一个就回调一次
    ///         allTrees.Add(tree);
    ///     });
    ///
    /// // 释放资源
    /// Addressables.Release(handle);
    /// </summary>
    void AddressablesNotes() { }

    // ===== 调试 UI =====

    void OnGUI()
    {
        if (!showDebugInfo) return;

        GUIStyle style = new GUIStyle(GUI.skin.label)
        {
            fontSize = 14,
            normal = { textColor = Color.white }
        };

        float x = 10, y = 10;
        float lineHeight = 20;

        GUI.Label(new Rect(x, y, 400, lineHeight), $"FPS: {currentFps:F1}", style);
        y += lineHeight;

        GUI.Label(new Rect(x, y, 400, lineHeight),
            $"已加载区块: {CurrentStats.loadedChunks}", style);
        y += lineHeight;

        GUI.Label(new Rect(x, y, 400, lineHeight),
            $"待加载区块: {(chunkLoader != null ? chunkLoader.PendingChunkCount : 0)}", style);
        y += lineHeight;

        GUI.Label(new Rect(x, y, 400, lineHeight),
            $"托管内存: {CurrentStats.memoryUsageMB:F1} MB", style);
        y += lineHeight;

        if (playerTransform != null)
        {
            Vector3 pos = playerTransform.position;
            GUI.Label(new Rect(x, y, 400, lineHeight),
                $"玩家位置: ({pos.x:F1}, {pos.y:F1}, {pos.z:F1})", style);
        }
    }
}
```

[截图：运行时的调试 UI——显示 FPS、区块数、内存使用等信息]

---

## 18.6 遮挡剔除配置

### 18.6.1 Occlusion Culling 设置步骤

```
遮挡剔除（Occlusion Culling）配置指南：

什么是遮挡剔除？
被其他物体遮挡住的物体不需要渲染。
例如：建筑物后面的树木、山坡背面的 NPC。

类比前端：
类似 CSS 的 content-visibility: auto
浏览器跳过不在视口内的元素的渲染工作

步骤 1：标记遮挡物和被遮挡物
[截图：Inspector 中勾选 Occluder Static 和 Occludee Static]

  - Occluder Static：能遮挡其他物体的大型静态物体（建筑、大岩石、墙壁）
  - Occludee Static：可以被遮挡的物体（树木、装饰物、小物件）
  - 同一个物体可以同时是 Occluder 和 Occludee

步骤 2：打开 Occlusion Culling 窗口
  Window → Rendering → Occlusion Culling

步骤 3：配置参数
[截图：Occlusion Culling 窗口的 Bake 选项卡]

  - Smallest Occluder: 最小遮挡物的大小（米）
    值越小越精确，但烘焙时间越长
    推荐：5-10 米

  - Smallest Hole: 最小的"洞"（能看穿的缝隙）
    值越小越精确
    推荐：0.25 米

  - Backface Threshold: 背面阈值
    推荐：100（默认）

步骤 4：烘焙
  点击 Bake 按钮，等待烘焙完成。
  烘焙会生成遮挡数据文件（存储在场景文件夹中）

步骤 5：验证
  在 Scene 视图的 Visualization 选项中勾选 Occlusion
  可以看到哪些物体被剔除了（显示为线框）

⚠️ 注意：
- 遮挡剔除只对静态物体有效（标记为 Static 的物体）
- 运行时移动的物体不参与遮挡剔除
- 遮挡数据占用额外的存储空间
- 开放世界中通常结合区块加载使用——只对已加载的区块进行遮挡剔除
```

---

## 18.7 LOD 系统详解

### 18.7.1 LOD Group 配置

```csharp
using UnityEngine;

/// <summary>
/// LOD 系统使用指南
///
/// LOD (Level of Detail) 原理：
/// 物体离相机越远，使用越简单的模型
///
/// LOD 0: 高精度模型（近距离）  - 5000 面
/// LOD 1: 中精度模型（中距离）  - 1000 面
/// LOD 2: 低精度模型（远距离）  - 200 面
/// LOD 3: Billboard（极远距离） - 2 面（一个面片）
/// Culled: 完全隐藏（超远距离）
///
/// 类比前端：
/// 类似响应式图片 <picture> 标签：
/// <picture>
///   <source media="(min-width: 1200px)" srcset="large.jpg">   // LOD 0
///   <source media="(min-width: 768px)" srcset="medium.jpg">   // LOD 1
///   <source media="(min-width: 480px)" srcset="small.jpg">    // LOD 2
///   <img src="tiny.jpg">                                       // LOD 3
/// </picture>
/// </summary>
public class LODSetupGuide : MonoBehaviour
{
    /// <summary>
    /// 通过代码设置 LOD Group
    /// 通常在编辑器中通过 Inspector 设置，这里展示代码方式
    /// </summary>
    public static void SetupLODGroup(GameObject target,
        Renderer[] lod0Renderers,
        Renderer[] lod1Renderers,
        Renderer[] lod2Renderers)
    {
        LODGroup lodGroup = target.AddComponent<LODGroup>();

        LOD[] lods = new LOD[4];

        // LOD 0: 屏幕占比 > 50% 时显示（近距离）
        lods[0] = new LOD(0.5f, lod0Renderers);

        // LOD 1: 屏幕占比 > 20% 时显示（中距离）
        lods[1] = new LOD(0.2f, lod1Renderers);

        // LOD 2: 屏幕占比 > 5% 时显示（远距离）
        lods[2] = new LOD(0.05f, lod2Renderers);

        // LOD 3: 屏幕占比 < 5%——完全剔除（Culled）
        lods[3] = new LOD(0.01f, new Renderer[0]);

        lodGroup.SetLODs(lods);
        lodGroup.RecalculateBounds();
    }
}
```

[截图：LOD Group 组件在 Inspector 中的显示——不同 LOD 级别的切换距离和模型]

---

## 18.8 内存管理策略

### 18.8.1 移动端内存预算

```
开放世界手游内存预算参考（以 iPhone 为例）：

总可用内存: ~3GB（6GB 设备，系统占用约 3GB）
游戏安全预算: ~1.5GB

分配建议：
├── Unity 引擎和框架:     ~200MB
├── 纹理资源:             ~400MB（最大头）
├── 网格（模型）数据:      ~150MB
├── 音频数据:             ~100MB
├── 动画数据:             ~50MB
├── 脚本和运行时数据:     ~100MB
├── 物理系统:             ~50MB
├── 对象池预分配:         ~50MB
├── 已加载区块数据:       ~200MB
├── 预留缓冲:             ~200MB
└── 总计:                 ~1500MB

优化策略：
1. 纹理压缩：使用 ASTC 格式（iOS/Android 通用）
2. 纹理 Mipmap：远处纹理自动降低分辨率
3. 资源卸载：离开区块时卸载不再需要的资源
4. 共享材质：多个物体共享同一材质实例
5. GPU Instancing：大量相同物体用一次 Draw Call 渲染
6. 纹理图集：多个小纹理合并到一张大图
```

> 💡 **前端类比**：内存预算就像前端的 Performance Budget——你为 JavaScript bundle 设置大小上限（比如 200KB），超过就需要优化。游戏开发中对各类资源也有类似的预算限制。

---

## 18.9 完整的世界坐标系统设计

```csharp
using UnityEngine;

/// <summary>
/// 世界坐标系统设计
///
/// 对于超大开放世界，浮点精度是一个严重问题：
/// float 在超过 10000 单位后精度明显下降，
/// 表现为物体抖动、碰撞异常等。
///
/// 解决方案：World Origin Shifting（世界原点偏移）
/// 核心思想：让玩家始终在原点附近，移动世界而不是移动玩家
/// </summary>
public class WorldOriginShifter : MonoBehaviour
{
    [Tooltip("当玩家离原点超过此距离时执行偏移")]
    [SerializeField] private float shiftThreshold = 1000f;

    [SerializeField] private Transform playerTransform;

    /// <summary>
    /// 累计的世界偏移量
    /// 使用 double 保持精度
    /// </summary>
    private Vector3d totalOffset = Vector3d.zero;

    void LateUpdate()
    {
        if (playerTransform == null) return;

        Vector3 playerPos = playerTransform.position;

        if (playerPos.magnitude > shiftThreshold)
        {
            ShiftWorld(-playerPos);
        }
    }

    /// <summary>
    /// 将整个世界偏移指定量
    /// 所有物体向相反方向移动，玩家回到原点附近
    /// </summary>
    private void ShiftWorld(Vector3 shift)
    {
        Debug.Log($"[WorldOriginShifter] 执行世界偏移: {shift}");

        // 记录偏移
        totalOffset.x += shift.x;
        totalOffset.y += shift.y;
        totalOffset.z += shift.z;

        // 移动所有根物体
        foreach (GameObject rootObj in UnityEngine.SceneManagement.SceneManager
                     .GetActiveScene().GetRootGameObjects())
        {
            rootObj.transform.position += shift;
        }

        // 通知所有需要知道偏移的系统
        // 比如粒子系统、NavMesh 等
    }

    /// <summary>
    /// 获取真实的世界坐标（考虑所有偏移）
    /// </summary>
    public Vector3d GetRealWorldPosition(Vector3 localPosition)
    {
        return new Vector3d(
            localPosition.x - totalOffset.x,
            localPosition.y - totalOffset.y,
            localPosition.z - totalOffset.z
        );
    }
}

/// <summary>
/// 双精度 3D 向量（用于超大世界的精确坐标）
/// </summary>
public struct Vector3d
{
    public double x, y, z;

    public static Vector3d zero => new Vector3d(0, 0, 0);

    public Vector3d(double x, double y, double z)
    {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
```

---

## 练习题

### 练习 1：优化区块加载（难度：中等）

改进 ChunkLoader，添加以下功能：
1. **优先级加载**：玩家面朝方向的区块优先加载
2. **预加载**：根据玩家移动速度和方向，预测并提前加载前方区块
3. **渐进式加载**：区块先显示低精度版本，然后逐步加载细节

### 练习 2：对象池扩展（难度：中等）

扩展 ObjectPool 系统：
1. 添加池大小自动调整功能（根据使用频率动态增减池容量）
2. 实现对象池的序列化存储（保存池状态，用于存档恢复）
3. 添加池对象的"过期回收"机制——超过一定时间未使用的对象自动销毁

### 练习 3：小型开放世界原型（难度：高）

使用本章学到的技术，创建一个小型开放世界原型：
1. 世界大小 500m x 500m，分成 10x10 个区块
2. 每个区块包含程序化生成的地形和植被
3. 实现区块的动态加载/卸载
4. 添加一个简单的玩家控制器（第三人称）
5. 在 Profile 面板中观察内存和帧率

---

## 下一章预告

**第 19 章：大地形系统**

有了开放世界的架构，下一步是创建真实、壮观的大地形：
- Unity Terrain 组件深入使用
- 地形绘制工具（高度、纹理、树木、草地）
- 多地形拼接实现超大世界
- 地形 LOD 和移动端性能优化
- SpeedTree 和 GPU Instancing 实现海量植被
- 自定义地形着色器

从平坦的世界到山川湖泊，让你的开放世界有地理的层次感！
