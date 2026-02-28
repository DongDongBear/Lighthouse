# 第 17 章：程序化生成

> 让算法为你创造世界——从 Perlin 噪声到随机地牢，掌握程序化内容生成的核心技术。

## 本章目标

完成本章学习后，你将能够：

1. 理解程序化生成（Procedural Generation）的核心概念和应用场景
2. 掌握种子随机数（Seeded Random）的使用，实现可复现的随机内容
3. 深入理解 Perlin 噪声及其变体，并应用于地形生成
4. 实现多层噪声叠加（octaves、lacunarity、persistence）
5. 使用噪声实现生物群落（Biome）分布
6. 程序化放置场景物体（树木、岩石、草地），带密度控制
7. 了解波函数坍缩（Wave Function Collapse）算法概念
8. 使用 BSP 树算法生成随机地牢
9. 使用 L-System 生成程序化植被
10. 完成实战项目：生成一片自然感十足的森林区域

## 预计学习时间

**6 小时**

---

## 17.1 程序化生成概览

### 17.1.1 什么是程序化生成

程序化生成（Procedural Generation，简称 PCG）是指使用算法而非手动设计来创建游戏内容的技术。

```
程序化生成 vs 手动设计：

手动设计：
├── 美术师一棵一棵放置树木 🌲🌲🌲
├── 关卡设计师一个一个布置房间 🏠🏠🏠
├── 优点：精确控制每个细节
└── 缺点：工作量巨大，内容有限

程序化生成：
├── 算法根据规则自动生成树木分布 🌲🌳🌴🌲🌳
├── 算法自动生成地牢布局 🗺️
├── 优点：无限内容，开发效率高
└── 缺点：需要精心调参，可能产生不自然的结果

实际游戏中：两者结合使用
├── 大框架用程序化生成（地形、植被分布）
└── 关键区域手动精调（城镇、Boss 房间）
```

> 💡 **前端类比**：程序化生成类似前端的"模板引擎"或"动态组件生成"。你定义规则和模板，代码根据数据自动生成 UI。区别在于游戏中的"数据"通常来自数学函数（如噪声），而不是数据库。

### 17.1.2 知名的程序化生成游戏

| 游戏 | 程序化生成内容 | 技术 |
|------|--------------|------|
| Minecraft | 地形、洞穴、矿脉 | Perlin 噪声 + 种子 |
| No Man's Sky | 整个星球、生物 | 多层噪声 + 规则系统 |
| Hades | 房间布局、敌人配置 | 预设模板 + 随机组合 |
| Spelunky | 关卡地形 | 模板拼接 + 随机 |
| Terraria | 世界地形、矿脉分布 | 多层 Perlin 噪声 |

---

## 17.2 随机数基础：种子随机

### 17.2.1 为什么需要种子

```csharp
using UnityEngine;

/// <summary>
/// 种子随机数演示
///
/// 种子随机的核心概念：
/// - 相同的种子 -> 相同的随机数序列 -> 相同的生成结果
/// - 不同的种子 -> 不同的随机数序列 -> 不同的生成结果
///
/// 类比前端：
/// - 类似单元测试中的 mock random，确保结果可预测
/// - 类似 Math.seedrandom 库的功能
/// </summary>
public class SeededRandomDemo : MonoBehaviour
{
    void Start()
    {
        // ===== Unity 的随机数系统 =====

        // 设置种子——相同种子会产生相同的随机序列
        Random.InitState(12345);

        Debug.Log("=== 种子 12345 的随机序列 ===");
        for (int i = 0; i < 5; i++)
        {
            Debug.Log($"  Random.value: {Random.value:F4}");
        }

        // 再次设置相同种子——会得到完全相同的序列
        Random.InitState(12345);

        Debug.Log("=== 再次使用种子 12345 ===");
        for (int i = 0; i < 5; i++)
        {
            Debug.Log($"  Random.value: {Random.value:F4}");
        }

        // ===== System.Random（C# 标准库） =====
        // 可以创建多个独立的随机数生成器实例
        // Unity 的 Random 是全局的，不能同时使用多个

        System.Random rng1 = new System.Random(42);
        System.Random rng2 = new System.Random(42);

        // 两个使用相同种子的实例会产生相同的序列
        Debug.Log($"rng1: {rng1.Next(100)}, rng2: {rng2.Next(100)}"); // 相同
        Debug.Log($"rng1: {rng1.Next(100)}, rng2: {rng2.Next(100)}"); // 相同

        // ===== 种子的实际用法 =====

        // 用字符串生成种子（玩家输入的世界名称）
        string worldName = "我的世界";
        int seed = worldName.GetHashCode();
        Debug.Log($"世界名 '{worldName}' 的种子: {seed}");

        // 用当前时间作为种子（每次不同）
        int timeSeed = System.DateTime.Now.Millisecond;
        Debug.Log($"基于时间的种子: {timeSeed}");
    }
}
```

### 17.2.2 可复用的随机数工具

```csharp
using UnityEngine;

/// <summary>
/// 游戏随机数工具类
/// 封装种子随机的常用操作
/// </summary>
public class GameRandom
{
    private System.Random random;
    public int Seed { get; private set; }

    /// <summary>
    /// 使用指定种子初始化
    /// </summary>
    public GameRandom(int seed)
    {
        Seed = seed;
        random = new System.Random(seed);
    }

    /// <summary>
    /// 获取 [0, 1) 范围的随机浮点数
    /// </summary>
    public float Value => (float)random.NextDouble();

    /// <summary>
    /// 获取 [min, max) 范围的随机整数
    /// </summary>
    public int Range(int min, int max) => random.Next(min, max);

    /// <summary>
    /// 获取 [min, max] 范围的随机浮点数
    /// </summary>
    public float Range(float min, float max)
    {
        return min + (float)random.NextDouble() * (max - min);
    }

    /// <summary>
    /// 根据概率返回 true/false
    /// </summary>
    /// <param name="probability">概率值 0.0 ~ 1.0</param>
    public bool Chance(float probability)
    {
        return Value < probability;
    }

    /// <summary>
    /// 从数组中随机选取一个元素
    /// </summary>
    public T Choose<T>(T[] array)
    {
        return array[Range(0, array.Length)];
    }

    /// <summary>
    /// 生成基于位置的子种子
    /// 确保同一位置总是生成相同的内容
    /// </summary>
    public int GetPositionSeed(int x, int y)
    {
        // 使用哈希组合种子和坐标
        // 类似前端的 hash function
        unchecked
        {
            int hash = Seed;
            hash = hash * 31 + x;
            hash = hash * 31 + y;
            return hash;
        }
    }

    /// <summary>
    /// 重置到初始状态
    /// </summary>
    public void Reset()
    {
        random = new System.Random(Seed);
    }
}
```

---

## 17.3 Perlin 噪声深入理解

### 17.3.1 什么是 Perlin 噪声

```
Perlin 噪声 vs 普通随机数：

普通随机数（Random.value）：
████░███░░██░░█░███░░░██░█░░███
-> 相邻值之间没有关系，看起来像杂点
-> 不适合生成自然的地形

Perlin 噪声（Mathf.PerlinNoise）：
    ╱╲    ╱╲╱╲      ╱╲
   ╱  ╲  ╱    ╲    ╱  ╲╱╲
  ╱    ╲╱      ╲  ╱      ╲
╱               ╲╱
-> 相邻值之间平滑过渡
-> 完美适合生成自然的地形、云朵、火焰

核心特性：
1. 连续性：相邻输入产生相近的输出
2. 可控性：通过缩放控制细节程度
3. 确定性：相同输入总是相同输出（无需种子）
```

> 💡 **前端类比**：Perlin 噪声就像 CSS 的 `linear-gradient()` ——它在两个值之间创建平滑的过渡。而普通随机数更像给每个像素分配随机颜色。

### 17.3.2 PerlinNoiseGenerator.cs

```csharp
using UnityEngine;

/// <summary>
/// PerlinNoiseGenerator.cs —— Perlin 噪声生成器
///
/// 封装 Unity 内置的 Perlin 噪声函数，
/// 提供多层叠加（fBm）、偏移种子等高级功能。
/// </summary>
public class PerlinNoiseGenerator : MonoBehaviour
{
    [Header("基础设置")]
    [Tooltip("种子值——不同种子产生不同的噪声图案")]
    [SerializeField] private int seed = 42;

    [Tooltip("缩放比例——值越大地形越平缓，值越小地形越密集")]
    [SerializeField] private float scale = 50f;

    [Header("多层叠加设置（fBm - Fractal Brownian Motion）")]
    [Tooltip("叠加层数——更多层 = 更多细节（但更慢）")]
    [Range(1, 8)]
    [SerializeField] private int octaves = 4;

    [Tooltip("每层频率倍增——控制每层细节的密度增长率")]
    [Range(1f, 4f)]
    [SerializeField] private float lacunarity = 2f;

    [Tooltip("每层振幅衰减——控制每层细节的强度衰减率")]
    [Range(0f, 1f)]
    [SerializeField] private float persistence = 0.5f;

    [Header("偏移")]
    [SerializeField] private Vector2 offset = Vector2.zero;

    // 根据种子计算的噪声偏移量
    private Vector2 seedOffset;

    void Awake()
    {
        // 使用种子生成偏移量
        // Unity 的 PerlinNoise 没有种子参数，
        // 所以通过偏移采样位置来模拟不同种子
        System.Random rng = new System.Random(seed);
        seedOffset = new Vector2(
            (float)(rng.NextDouble() * 10000),
            (float)(rng.NextDouble() * 10000)
        );
    }

    /// <summary>
    /// 获取指定位置的单层 Perlin 噪声值
    /// </summary>
    /// <param name="x">X 坐标</param>
    /// <param name="y">Y 坐标（或 Z 坐标，取决于使用场景）</param>
    /// <returns>噪声值 [0, 1]</returns>
    public float GetNoise(float x, float y)
    {
        float sampleX = (x + offset.x + seedOffset.x) / scale;
        float sampleY = (y + offset.y + seedOffset.y) / scale;

        // Unity 的 Mathf.PerlinNoise 返回值主要在 [0, 1] 范围
        // 但可能略微超出这个范围，所以需要 clamp
        return Mathf.Clamp01(Mathf.PerlinNoise(sampleX, sampleY));
    }

    /// <summary>
    /// 获取多层叠加的 Perlin 噪声值（fBm）
    ///
    /// fBm（分形布朗运动）的原理：
    /// 将多层不同频率和振幅的噪声叠加在一起
    ///
    /// 类比音乐：
    /// - 第 1 层（低频大振幅）：山脉的大轮廓 ≈ 低音鼓
    /// - 第 2 层（中频中振幅）：山坡的起伏 ≈ 贝斯
    /// - 第 3 层（高频小振幅）：地表的小凸起 ≈ 吉他
    /// - 第 4 层（更高频更小振幅）：石头的纹理 ≈ 铃声
    /// </summary>
    /// <param name="x">X 坐标</param>
    /// <param name="y">Y 坐标</param>
    /// <returns>叠加后的噪声值 [0, 1]</returns>
    public float GetFBMNoise(float x, float y)
    {
        float amplitude = 1f;     // 当前层的振幅
        float frequency = 1f;     // 当前层的频率
        float noiseValue = 0f;    // 累计噪声值
        float maxValue = 0f;      // 用于归一化的最大可能值

        for (int i = 0; i < octaves; i++)
        {
            // 采样坐标 = 基础坐标 * 频率
            float sampleX = (x + offset.x + seedOffset.x) / scale * frequency;
            float sampleY = (y + offset.y + seedOffset.y) / scale * frequency;

            // 获取该层的噪声值，映射到 [-1, 1] 范围
            float perlinValue = Mathf.PerlinNoise(sampleX, sampleY) * 2f - 1f;

            // 累加：噪声值 * 振幅
            noiseValue += perlinValue * amplitude;
            maxValue += amplitude;

            // 为下一层更新参数
            amplitude *= persistence;  // 振幅衰减
            frequency *= lacunarity;   // 频率增加
        }

        // 归一化到 [0, 1]
        return Mathf.Clamp01((noiseValue / maxValue + 1f) / 2f);
    }

    /// <summary>
    /// 生成指定大小的噪声图（用于调试和预览）
    /// </summary>
    /// <param name="width">图像宽度</param>
    /// <param name="height">图像高度</param>
    /// <param name="useFBM">是否使用多层叠加</param>
    /// <returns>噪声图纹理</returns>
    public Texture2D GenerateNoiseMap(int width, int height, bool useFBM = true)
    {
        Texture2D texture = new Texture2D(width, height);
        Color[] pixels = new Color[width * height];

        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                float noiseValue = useFBM
                    ? GetFBMNoise(x, y)
                    : GetNoise(x, y);

                pixels[y * width + x] = new Color(noiseValue, noiseValue, noiseValue);
            }
        }

        texture.SetPixels(pixels);
        texture.Apply();
        return texture;
    }

    /// <summary>
    /// 在编辑器中动态预览噪声图
    /// </summary>
    [Header("预览设置")]
    [SerializeField] private bool showPreview = false;
    [SerializeField] private int previewSize = 256;
    [SerializeField] private Renderer previewRenderer;

    void OnValidate()
    {
        // Inspector 中参数变化时自动更新预览
        if (showPreview && previewRenderer != null)
        {
            // 重新计算种子偏移
            System.Random rng = new System.Random(seed);
            seedOffset = new Vector2(
                (float)(rng.NextDouble() * 10000),
                (float)(rng.NextDouble() * 10000)
            );

            Texture2D noiseMap = GenerateNoiseMap(previewSize, previewSize);
            previewRenderer.sharedMaterial.mainTexture = noiseMap;
        }
    }
}
```

[截图：Inspector 中 PerlinNoiseGenerator 的参数面板，以及不同参数下生成的噪声图预览]

### 17.3.3 噪声参数对比

```
参数对生成效果的影响：

Scale（缩放）:
  scale = 10  : ░▓█▓░░▓█▓░  （细碎的小山丘）
  scale = 50  : ░░▒▓██▓▒░░  （平缓的山脉）
  scale = 200 : ░░░▒▓▓▒░░░  （巨大的高原）

Octaves（层数）:
  octaves = 1 : 大轮廓，没有细节
  octaves = 4 : 大轮廓 + 中等起伏 + 小细节
  octaves = 8 : 非常丰富的细节（性能消耗大）

Lacunarity（频率增长）:
  lacunarity = 1.5 : 每层细节缓慢变密
  lacunarity = 2.0 : 每层细节翻倍变密（最常用）
  lacunarity = 3.0 : 每层细节急剧变密

Persistence（振幅衰减）:
  persistence = 0.3 : 高层细节影响很小，地形平滑
  persistence = 0.5 : 平衡的细节层次（最常用）
  persistence = 0.8 : 高层细节影响大，地形粗糙
```

[截图：4 组不同参数的噪声图对比]

---

## 17.4 程序化地形生成

### 17.4.1 ProceduralTerrain.cs

```csharp
using UnityEngine;

/// <summary>
/// ProceduralTerrain.cs —— 程序化地形生成器
///
/// 使用 Perlin 噪声生成 3D 地形网格
/// 可以理解为：用噪声值作为"高度"来塑造地形
///
/// 类比前端：
/// - 类似 Three.js 中的 PlaneGeometry 顶点操作
/// - 每个顶点的 Y 值由噪声函数决定
/// </summary>
[RequireComponent(typeof(MeshFilter))]
[RequireComponent(typeof(MeshRenderer))]
[RequireComponent(typeof(MeshCollider))]
public class ProceduralTerrain : MonoBehaviour
{
    [Header("地形大小")]
    [Tooltip("地形网格的分辨率（顶点数 = resolution x resolution）")]
    [Range(10, 255)]
    [SerializeField] private int resolution = 100;

    [Tooltip("地形的实际宽度（世界单位）")]
    [SerializeField] private float terrainWidth = 100f;

    [Tooltip("地形的实际深度（世界单位）")]
    [SerializeField] private float terrainDepth = 100f;

    [Tooltip("地形最大高度")]
    [SerializeField] private float maxHeight = 30f;

    [Header("噪声设置")]
    [SerializeField] private int seed = 42;
    [SerializeField] private float noiseScale = 50f;
    [Range(1, 8)]
    [SerializeField] private int octaves = 4;
    [Range(1f, 4f)]
    [SerializeField] private float lacunarity = 2f;
    [Range(0f, 1f)]
    [SerializeField] private float persistence = 0.5f;

    [Header("高度曲线")]
    [Tooltip("用动画曲线控制高度分布——可以在编辑器中可视化调整")]
    [SerializeField] private AnimationCurve heightCurve = AnimationCurve.Linear(0, 0, 1, 1);

    [Header("颜色设置")]
    [SerializeField] private Gradient terrainGradient;

    // 噪声生成器
    private PerlinNoiseGenerator noiseGenerator;

    // 网格组件
    private MeshFilter meshFilter;
    private MeshRenderer meshRenderer;
    private MeshCollider meshCollider;

    void Start()
    {
        meshFilter = GetComponent<MeshFilter>();
        meshRenderer = GetComponent<MeshRenderer>();
        meshCollider = GetComponent<MeshCollider>();

        // 初始化噪声生成器
        noiseGenerator = gameObject.AddComponent<PerlinNoiseGenerator>();
        // 注意：实际使用时通过 Inspector 配置 noiseGenerator 的参数

        GenerateTerrain();
    }

    /// <summary>
    /// 生成完整的地形
    /// </summary>
    public void GenerateTerrain()
    {
        // 步骤 1：生成高度图
        float[,] heightMap = GenerateHeightMap();

        // 步骤 2：根据高度图创建网格
        Mesh mesh = GenerateMesh(heightMap);

        // 步骤 3：应用网格
        meshFilter.mesh = mesh;

        // 步骤 4：更新碰撞体
        meshCollider.sharedMesh = mesh;

        Debug.Log($"地形生成完成: {resolution}x{resolution} 顶点, " +
                  $"大小: {terrainWidth}x{terrainDepth}, 最大高度: {maxHeight}");
    }

    /// <summary>
    /// 生成高度图
    /// 返回一个 2D 浮点数组，每个值代表该位置的高度 [0, 1]
    /// </summary>
    private float[,] GenerateHeightMap()
    {
        float[,] heightMap = new float[resolution, resolution];

        // 种子偏移
        System.Random rng = new System.Random(seed);
        float offsetX = (float)(rng.NextDouble() * 10000);
        float offsetY = (float)(rng.NextDouble() * 10000);

        // 用于追踪最大最小值，之后归一化
        float maxNoiseHeight = float.MinValue;
        float minNoiseHeight = float.MaxValue;

        // 从地形中心开始采样（让缩放以中心为基准）
        float halfWidth = resolution / 2f;
        float halfHeight = resolution / 2f;

        for (int y = 0; y < resolution; y++)
        {
            for (int x = 0; x < resolution; x++)
            {
                float amplitude = 1f;
                float frequency = 1f;
                float noiseHeight = 0f;

                for (int i = 0; i < octaves; i++)
                {
                    float sampleX = (x - halfWidth + offsetX) / noiseScale * frequency;
                    float sampleY = (y - halfHeight + offsetY) / noiseScale * frequency;

                    // 映射到 [-1, 1]
                    float perlinValue = Mathf.PerlinNoise(sampleX, sampleY) * 2f - 1f;

                    noiseHeight += perlinValue * amplitude;

                    amplitude *= persistence;
                    frequency *= lacunarity;
                }

                heightMap[x, y] = noiseHeight;

                if (noiseHeight > maxNoiseHeight) maxNoiseHeight = noiseHeight;
                if (noiseHeight < minNoiseHeight) minNoiseHeight = noiseHeight;
            }
        }

        // 归一化到 [0, 1]
        for (int y = 0; y < resolution; y++)
        {
            for (int x = 0; x < resolution; x++)
            {
                heightMap[x, y] = Mathf.InverseLerp(minNoiseHeight, maxNoiseHeight, heightMap[x, y]);

                // 应用高度曲线（可以让平原更平，山峰更尖锐）
                heightMap[x, y] = heightCurve.Evaluate(heightMap[x, y]);
            }
        }

        return heightMap;
    }

    /// <summary>
    /// 根据高度图生成 3D 网格
    /// 类似前端 Three.js 中创建 BufferGeometry
    /// </summary>
    private Mesh GenerateMesh(float[,] heightMap)
    {
        Mesh mesh = new Mesh();

        // Unity 默认的网格最多 65535 个顶点（16 位索引）
        // 如果顶点数超过，需要使用 32 位索引
        if (resolution * resolution > 65535)
        {
            mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
        }

        // ===== 顶点 =====
        Vector3[] vertices = new Vector3[resolution * resolution];
        Vector2[] uvs = new Vector2[resolution * resolution];
        Color[] colors = new Color[resolution * resolution];

        for (int z = 0; z < resolution; z++)
        {
            for (int x = 0; x < resolution; x++)
            {
                int index = z * resolution + x;

                // 计算顶点位置
                float xPos = (float)x / (resolution - 1) * terrainWidth;
                float zPos = (float)z / (resolution - 1) * terrainDepth;
                float yPos = heightMap[x, z] * maxHeight;

                vertices[index] = new Vector3(xPos, yPos, zPos);

                // UV 坐标 [0, 1]
                uvs[index] = new Vector2((float)x / (resolution - 1), (float)z / (resolution - 1));

                // 根据高度设置颜色
                if (terrainGradient != null)
                {
                    colors[index] = terrainGradient.Evaluate(heightMap[x, z]);
                }
            }
        }

        // ===== 三角形 =====
        // 每个方格由 2 个三角形组成，共 6 个索引
        int[] triangles = new int[(resolution - 1) * (resolution - 1) * 6];
        int triIndex = 0;

        for (int z = 0; z < resolution - 1; z++)
        {
            for (int x = 0; x < resolution - 1; x++)
            {
                int topLeft = z * resolution + x;
                int topRight = z * resolution + x + 1;
                int bottomLeft = (z + 1) * resolution + x;
                int bottomRight = (z + 1) * resolution + x + 1;

                // 三角形 1（左上三角）
                triangles[triIndex++] = topLeft;
                triangles[triIndex++] = bottomLeft;
                triangles[triIndex++] = topRight;

                // 三角形 2（右下三角）
                triangles[triIndex++] = topRight;
                triangles[triIndex++] = bottomLeft;
                triangles[triIndex++] = bottomRight;
            }
        }

        // ===== 组装网格 =====
        mesh.vertices = vertices;
        mesh.triangles = triangles;
        mesh.uv = uvs;
        mesh.colors = colors;

        // 重新计算法线（用于光照）
        mesh.RecalculateNormals();

        // 重新计算边界（用于裁剪和碰撞）
        mesh.RecalculateBounds();

        return mesh;
    }

    /// <summary>
    /// 获取世界坐标 (x, z) 处的地形高度
    /// 用于将物体放置在地形表面
    /// </summary>
    public float GetHeightAtWorldPosition(float worldX, float worldZ)
    {
        // 世界坐标转网格坐标
        float normalizedX = (worldX - transform.position.x) / terrainWidth;
        float normalizedZ = (worldZ - transform.position.z) / terrainDepth;

        // 检查是否在地形范围内
        if (normalizedX < 0 || normalizedX > 1 || normalizedZ < 0 || normalizedZ > 1)
        {
            return 0f;
        }

        int gridX = Mathf.FloorToInt(normalizedX * (resolution - 1));
        int gridZ = Mathf.FloorToInt(normalizedZ * (resolution - 1));

        gridX = Mathf.Clamp(gridX, 0, resolution - 2);
        gridZ = Mathf.Clamp(gridZ, 0, resolution - 2);

        // 使用射线检测获取精确高度
        // 简化版本：直接读取最近顶点的高度
        Mesh mesh = meshFilter.mesh;
        if (mesh == null) return 0f;

        int vertexIndex = gridZ * resolution + gridX;
        if (vertexIndex < mesh.vertices.Length)
        {
            return mesh.vertices[vertexIndex].y + transform.position.y;
        }

        return 0f;
    }

    /// <summary>
    /// 在编辑器中修改参数时重新生成
    /// </summary>
    void OnValidate()
    {
        // 确保参数合法
        if (resolution < 2) resolution = 2;
        if (terrainWidth < 1) terrainWidth = 1;
        if (terrainDepth < 1) terrainDepth = 1;
        if (maxHeight < 0) maxHeight = 0;
    }
}
```

[截图：程序化生成的地形网格，带有高度着色]

---

## 17.5 程序化物体放置

### 17.5.1 ObjectPlacer.cs

```csharp
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// ObjectPlacer.cs —— 程序化物体放置器
///
/// 在地形上自动放置树木、岩石、草地等物体
/// 支持密度控制、高度约束、坡度过滤、聚集/分散控制
///
/// 类比前端：
/// - 类似在一个 canvas 上根据规则自动放置图形元素
/// - density 类似 CSS Grid 的 gap
/// - Poisson Disk Sampling 类似确保 UI 元素不重叠的算法
/// </summary>
public class ObjectPlacer : MonoBehaviour
{
    [Header("地形引用")]
    [SerializeField] private ProceduralTerrain terrain;

    [Header("放置配置")]
    [SerializeField] private List<PlacementRule> placementRules = new List<PlacementRule>();

    [Header("全局设置")]
    [SerializeField] private int seed = 42;

    [Tooltip("放置区域大小")]
    [SerializeField] private float areaWidth = 100f;
    [SerializeField] private float areaDepth = 100f;

    // 已放置的物体列表（用于清理）
    private List<GameObject> placedObjects = new List<GameObject>();

    /// <summary>
    /// 执行物体放置
    /// </summary>
    public void PlaceAllObjects()
    {
        // 清除之前放置的物体
        ClearPlacedObjects();

        foreach (var rule in placementRules)
        {
            if (rule.enabled)
            {
                PlaceObjectsWithRule(rule);
            }
        }

        Debug.Log($"物体放置完成，总共放置了 {placedObjects.Count} 个物体");
    }

    /// <summary>
    /// 根据单条规则放置物体
    /// </summary>
    private void PlaceObjectsWithRule(PlacementRule rule)
    {
        GameRandom rng = new GameRandom(seed + rule.name.GetHashCode());
        int placed = 0;

        // 使用网格采样或泊松盘采样
        if (rule.usePoissonDiskSampling)
        {
            PlaceWithPoissonDisk(rule, rng, ref placed);
        }
        else
        {
            PlaceWithGrid(rule, rng, ref placed);
        }

        Debug.Log($"  [{rule.name}] 放置了 {placed} 个物体");
    }

    /// <summary>
    /// 网格采样放置
    /// 在规则网格上加入随机偏移来放置物体
    /// </summary>
    private void PlaceWithGrid(PlacementRule rule, GameRandom rng, ref int placed)
    {
        // 根据密度计算网格间距
        float spacing = 1f / Mathf.Sqrt(rule.density);

        for (float x = 0; x < areaWidth; x += spacing)
        {
            for (float z = 0; z < areaDepth; z += spacing)
            {
                // 概率检查（密度控制）
                if (!rng.Chance(rule.placementProbability))
                    continue;

                // 添加随机抖动（jitter），避免看起来太规则
                float jitterX = rng.Range(-spacing * 0.4f, spacing * 0.4f);
                float jitterZ = rng.Range(-spacing * 0.4f, spacing * 0.4f);

                float worldX = transform.position.x + x + jitterX;
                float worldZ = transform.position.z + z + jitterZ;

                // 使用噪声控制密度变化（某些区域密集，某些区域稀疏）
                if (rule.useNoiseDensity)
                {
                    float densityNoise = Mathf.PerlinNoise(
                        worldX * rule.noiseDensityScale + 1000,
                        worldZ * rule.noiseDensityScale + 1000
                    );
                    if (densityNoise < rule.noiseDensityThreshold)
                        continue;
                }

                // 获取地形高度
                float height = GetTerrainHeight(worldX, worldZ);

                // 高度约束检查
                float normalizedHeight = height / 30f; // 假设最大高度 30
                if (normalizedHeight < rule.minHeight || normalizedHeight > rule.maxHeight)
                    continue;

                // 坡度检查（可选）
                if (rule.maxSlope < 90f)
                {
                    float slope = GetTerrainSlope(worldX, worldZ);
                    if (slope > rule.maxSlope)
                        continue;
                }

                // 放置物体
                Vector3 position = new Vector3(worldX, height, worldZ);
                PlaceSingleObject(rule, position, rng);
                placed++;

                // 达到最大数量限制
                if (rule.maxCount > 0 && placed >= rule.maxCount)
                    return;
            }
        }
    }

    /// <summary>
    /// 泊松盘采样放置
    /// 确保物体之间保持最小距离，分布更自然
    ///
    /// 泊松盘采样算法简述：
    /// 1. 随机放置第一个点
    /// 2. 在已有点的周围尝试放置新点
    /// 3. 新点必须与所有已有点保持最小距离
    /// 4. 如果某个点周围无法再放新点，标记为非活跃
    /// 5. 重复直到没有活跃点
    /// </summary>
    private void PlaceWithPoissonDisk(PlacementRule rule, GameRandom rng, ref int placed)
    {
        float minDistance = rule.poissonMinDistance;
        List<Vector2> points = PoissonDiskSampling(
            areaWidth, areaDepth, minDistance, 30, rng
        );

        foreach (var point in points)
        {
            float worldX = transform.position.x + point.x;
            float worldZ = transform.position.z + point.y;

            // 高度检查
            float height = GetTerrainHeight(worldX, worldZ);
            float normalizedHeight = height / 30f;
            if (normalizedHeight < rule.minHeight || normalizedHeight > rule.maxHeight)
                continue;

            // 噪声密度检查
            if (rule.useNoiseDensity)
            {
                float densityNoise = Mathf.PerlinNoise(
                    worldX * rule.noiseDensityScale + 1000,
                    worldZ * rule.noiseDensityScale + 1000
                );
                if (densityNoise < rule.noiseDensityThreshold)
                    continue;
            }

            Vector3 position = new Vector3(worldX, height, worldZ);
            PlaceSingleObject(rule, position, rng);
            placed++;

            if (rule.maxCount > 0 && placed >= rule.maxCount)
                return;
        }
    }

    /// <summary>
    /// 泊松盘采样算法实现
    /// </summary>
    private List<Vector2> PoissonDiskSampling(float width, float height,
        float minDist, int maxAttempts, GameRandom rng)
    {
        float cellSize = minDist / Mathf.Sqrt(2);
        int gridWidth = Mathf.CeilToInt(width / cellSize);
        int gridHeight = Mathf.CeilToInt(height / cellSize);

        // 背景网格：用于快速查找邻近点
        int[,] grid = new int[gridWidth, gridHeight];
        for (int i = 0; i < gridWidth; i++)
            for (int j = 0; j < gridHeight; j++)
                grid[i, j] = -1;

        List<Vector2> points = new List<Vector2>();
        List<int> activeList = new List<int>();

        // 放置第一个点
        Vector2 firstPoint = new Vector2(rng.Range(0f, width), rng.Range(0f, height));
        points.Add(firstPoint);
        activeList.Add(0);
        int gx = Mathf.FloorToInt(firstPoint.x / cellSize);
        int gy = Mathf.FloorToInt(firstPoint.y / cellSize);
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight)
            grid[gx, gy] = 0;

        while (activeList.Count > 0)
        {
            int randIndex = rng.Range(0, activeList.Count);
            int pointIndex = activeList[randIndex];
            Vector2 point = points[pointIndex];

            bool found = false;
            for (int attempt = 0; attempt < maxAttempts; attempt++)
            {
                // 在 [minDist, 2*minDist] 的环形区域内随机取点
                float angle = rng.Range(0f, Mathf.PI * 2f);
                float dist = rng.Range(minDist, minDist * 2f);

                Vector2 candidate = new Vector2(
                    point.x + Mathf.Cos(angle) * dist,
                    point.y + Mathf.Sin(angle) * dist
                );

                // 边界检查
                if (candidate.x < 0 || candidate.x >= width ||
                    candidate.y < 0 || candidate.y >= height)
                    continue;

                int cgx = Mathf.FloorToInt(candidate.x / cellSize);
                int cgy = Mathf.FloorToInt(candidate.y / cellSize);

                // 检查周围 5x5 网格内是否有过近的点
                bool tooClose = false;
                for (int dx = -2; dx <= 2 && !tooClose; dx++)
                {
                    for (int dy = -2; dy <= 2 && !tooClose; dy++)
                    {
                        int nx = cgx + dx;
                        int ny = cgy + dy;

                        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight)
                        {
                            int neighborIndex = grid[nx, ny];
                            if (neighborIndex >= 0)
                            {
                                float sqrDist = (candidate - points[neighborIndex]).sqrMagnitude;
                                if (sqrDist < minDist * minDist)
                                    tooClose = true;
                            }
                        }
                    }
                }

                if (!tooClose)
                {
                    points.Add(candidate);
                    activeList.Add(points.Count - 1);
                    if (cgx >= 0 && cgx < gridWidth && cgy >= 0 && cgy < gridHeight)
                        grid[cgx, cgy] = points.Count - 1;
                    found = true;
                    break;
                }
            }

            if (!found)
            {
                activeList.RemoveAt(randIndex);
            }
        }

        return points;
    }

    /// <summary>
    /// 放置单个物体
    /// </summary>
    private void PlaceSingleObject(PlacementRule rule, Vector3 position, GameRandom rng)
    {
        // 随机选择 prefab 变体
        GameObject prefab = rng.Choose(rule.prefabs);
        if (prefab == null) return;

        // 实例化
        GameObject obj = Instantiate(prefab, position, Quaternion.identity, transform);

        // 随机旋转（Y 轴）
        if (rule.randomRotation)
        {
            float rotY = rng.Range(0f, 360f);
            obj.transform.rotation = Quaternion.Euler(0, rotY, 0);
        }

        // 随机缩放
        if (rule.randomScale)
        {
            float scale = rng.Range(rule.minScale, rule.maxScale);
            obj.transform.localScale = Vector3.one * scale;
        }

        // 地面对齐（可选：让物体法线方向与地面一致）
        if (rule.alignToSurface)
        {
            RaycastHit hit;
            if (Physics.Raycast(position + Vector3.up * 50f, Vector3.down, out hit, 100f))
            {
                obj.transform.position = hit.point;
                obj.transform.rotation = Quaternion.FromToRotation(Vector3.up, hit.normal) *
                                         obj.transform.rotation;
            }
        }

        // Y 轴偏移（用于把物体稍微嵌入地面）
        obj.transform.position += Vector3.up * rule.yOffset;

        placedObjects.Add(obj);
    }

    /// <summary>
    /// 获取指定位置的地形高度
    /// </summary>
    private float GetTerrainHeight(float x, float z)
    {
        // 使用射线检测
        RaycastHit hit;
        Vector3 origin = new Vector3(x, 1000f, z);

        if (Physics.Raycast(origin, Vector3.down, out hit, 2000f))
        {
            return hit.point.y;
        }

        // 如果有地形引用，使用地形的方法
        if (terrain != null)
        {
            return terrain.GetHeightAtWorldPosition(x, z);
        }

        return 0f;
    }

    /// <summary>
    /// 获取指定位置的地形坡度（度数）
    /// </summary>
    private float GetTerrainSlope(float x, float z)
    {
        RaycastHit hit;
        Vector3 origin = new Vector3(x, 1000f, z);

        if (Physics.Raycast(origin, Vector3.down, out hit, 2000f))
        {
            // 法线与向上方向的夹角即坡度
            return Vector3.Angle(hit.normal, Vector3.up);
        }

        return 0f;
    }

    /// <summary>
    /// 清除所有已放置的物体
    /// </summary>
    public void ClearPlacedObjects()
    {
        foreach (var obj in placedObjects)
        {
            if (obj != null)
            {
                if (Application.isPlaying)
                    Destroy(obj);
                else
                    DestroyImmediate(obj);
            }
        }
        placedObjects.Clear();
    }
}

/// <summary>
/// 物体放置规则
/// 定义一类物体的放置参数
/// </summary>
[System.Serializable]
public class PlacementRule
{
    [Header("基本信息")]
    public string name = "Tree";
    public bool enabled = true;

    [Header("预制体")]
    [Tooltip("可选的预制体变体列表，放置时随机选择一个")]
    public GameObject[] prefabs;

    [Header("密度控制")]
    [Tooltip("每平方单位的物体数量")]
    [Range(0.001f, 1f)]
    public float density = 0.05f;

    [Tooltip("放置概率（在密度采样点上的额外概率）")]
    [Range(0f, 1f)]
    public float placementProbability = 0.7f;

    [Tooltip("最大放置数量（0 = 不限制）")]
    public int maxCount = 0;

    [Header("噪声密度控制")]
    [Tooltip("使用噪声图控制密度分布（某些区域密集某些稀疏）")]
    public bool useNoiseDensity = true;
    public float noiseDensityScale = 0.02f;
    [Range(0f, 1f)]
    public float noiseDensityThreshold = 0.4f;

    [Header("高度约束")]
    [Tooltip("允许放置的最低高度比例 [0, 1]")]
    [Range(0f, 1f)]
    public float minHeight = 0.1f;

    [Tooltip("允许放置的最高高度比例 [0, 1]")]
    [Range(0f, 1f)]
    public float maxHeight = 0.8f;

    [Header("坡度约束")]
    [Tooltip("允许放置的最大坡度（度数）")]
    [Range(0f, 90f)]
    public float maxSlope = 30f;

    [Header("变换随机")]
    public bool randomRotation = true;
    public bool randomScale = true;
    [Range(0.1f, 3f)]
    public float minScale = 0.8f;
    [Range(0.1f, 3f)]
    public float maxScale = 1.2f;

    [Header("对齐")]
    [Tooltip("是否让物体法线方向与地面对齐")]
    public bool alignToSurface = false;

    [Tooltip("Y 轴偏移（负值=嵌入地面）")]
    public float yOffset = 0f;

    [Header("泊松盘采样")]
    [Tooltip("是否使用泊松盘采样（更均匀的分布）")]
    public bool usePoissonDiskSampling = false;
    public float poissonMinDistance = 3f;
}
```

[截图：程序化放置的森林场景——树木、岩石、草地的自然分布]

---

## 17.6 噪声驱动的生物群落分布

### 17.6.1 生物群落系统

```csharp
using UnityEngine;

/// <summary>
/// 基于噪声的生物群落分布系统
///
/// 使用两层独立的噪声图来决定每个位置的生物群落：
/// - 温度噪声：控制冷暖分布
/// - 湿度噪声：控制干湿分布
///
/// 温度 × 湿度的组合 → 不同的生物群落：
///
///            湿润        中等        干燥
///   炎热 │ 热带雨林 │   草原   │   沙漠   │
///   温暖 │ 温带森林 │   平原   │  灌木丛  │
///   寒冷 │ 针叶林   │   冻原   │  雪原    │
/// </summary>
public class BiomeDistribution : MonoBehaviour
{
    [Header("噪声设置")]
    [SerializeField] private int seed = 42;
    [SerializeField] private float temperatureScale = 200f;
    [SerializeField] private float humidityScale = 150f;

    [Header("生物群落定义")]
    [SerializeField] private BiomeDefinition[] biomes;

    // 种子偏移
    private Vector2 tempOffset;
    private Vector2 humidOffset;

    void Awake()
    {
        System.Random rng = new System.Random(seed);
        tempOffset = new Vector2(
            (float)(rng.NextDouble() * 10000),
            (float)(rng.NextDouble() * 10000)
        );
        humidOffset = new Vector2(
            (float)(rng.NextDouble() * 10000),
            (float)(rng.NextDouble() * 10000)
        );
    }

    /// <summary>
    /// 获取指定世界坐标处的生物群落
    /// </summary>
    public BiomeDefinition GetBiomeAt(float worldX, float worldZ)
    {
        // 采样温度噪声
        float temperature = Mathf.PerlinNoise(
            (worldX + tempOffset.x) / temperatureScale,
            (worldZ + tempOffset.y) / temperatureScale
        );

        // 采样湿度噪声
        float humidity = Mathf.PerlinNoise(
            (worldX + humidOffset.x) / humidityScale,
            (worldZ + humidOffset.y) / humidityScale
        );

        // 找到最匹配的生物群落
        BiomeDefinition bestBiome = biomes[0]; // 默认
        float bestScore = float.MaxValue;

        foreach (var biome in biomes)
        {
            // 计算当前温度/湿度与该生物群落中心点的距离
            float tempDist = Mathf.Abs(temperature - biome.idealTemperature);
            float humidDist = Mathf.Abs(humidity - biome.idealHumidity);
            float score = tempDist + humidDist;

            if (score < bestScore)
            {
                bestScore = score;
                bestBiome = biome;
            }
        }

        return bestBiome;
    }

    /// <summary>
    /// 生成生物群落预览图
    /// </summary>
    public Texture2D GenerateBiomeMap(int width, int height)
    {
        Texture2D texture = new Texture2D(width, height);
        Color[] pixels = new Color[width * height];

        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                BiomeDefinition biome = GetBiomeAt(x, y);
                pixels[y * width + x] = biome.mapColor;
            }
        }

        texture.SetPixels(pixels);
        texture.Apply();
        return texture;
    }
}

/// <summary>
/// 生物群落定义
/// </summary>
[System.Serializable]
public class BiomeDefinition
{
    public string biomeName = "Forest";

    [Header("温度/湿度中心")]
    [Range(0f, 1f)]
    public float idealTemperature = 0.5f;
    [Range(0f, 1f)]
    public float idealHumidity = 0.5f;

    [Header("地形参数")]
    public float heightMultiplier = 1f;
    public float noiseScale = 50f;

    [Header("植被")]
    public GameObject[] treePrefabs;
    public float treeDensity = 0.05f;
    public GameObject[] rockPrefabs;
    public float rockDensity = 0.01f;
    public GameObject[] grassPrefabs;
    public float grassDensity = 0.2f;

    [Header("可视化")]
    public Color mapColor = Color.green;

    [Header("地面材质")]
    public Material groundMaterial;
}
```

[截图：生物群落分布预览图——不同颜色代表不同群落，以及对应的 3D 场景效果]

---

## 17.7 BSP 树算法生成随机地牢

### 17.7.1 DungeonGenerator.cs

```csharp
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// DungeonGenerator.cs —— BSP 树地牢生成器
///
/// BSP (Binary Space Partitioning) 树算法：
/// 1. 从一个大矩形开始
/// 2. 随机选择水平或垂直方向切割成两半
/// 3. 递归切割，直到达到最小房间大小
/// 4. 在每个叶子节点中生成一个房间
/// 5. 在相邻房间之间生成走廊
///
/// 类比前端：
/// - BSP 树类似 CSS Flexbox 的递归嵌套布局
/// - 每次切割就像 flex-direction: row/column 的交替
/// - 最终的叶子节点就是实际的"组件"（房间）
/// </summary>
public class DungeonGenerator : MonoBehaviour
{
    [Header("地牢大小")]
    [SerializeField] private int dungeonWidth = 80;
    [SerializeField] private int dungeonHeight = 60;

    [Header("BSP 参数")]
    [Tooltip("BSP 递归深度——越大房间越小越多")]
    [Range(2, 8)]
    [SerializeField] private int bspDepth = 5;

    [Tooltip("最小房间宽度")]
    [SerializeField] private int minRoomWidth = 6;

    [Tooltip("最小房间高度")]
    [SerializeField] private int minRoomHeight = 6;

    [Tooltip("房间距离分区边界的最小边距")]
    [Range(1, 5)]
    [SerializeField] private int roomPadding = 2;

    [Header("走廊设置")]
    [Tooltip("走廊宽度")]
    [Range(1, 5)]
    [SerializeField] private int corridorWidth = 2;

    [Header("种子")]
    [SerializeField] private int seed = 42;

    [Header("预制体")]
    [SerializeField] private GameObject floorPrefab;
    [SerializeField] private GameObject wallPrefab;
    [SerializeField] private GameObject doorPrefab;

    [Header("可视化")]
    [SerializeField] private bool drawGizmos = true;

    // 地牢数据
    private int[,] dungeonMap; // 0=墙壁, 1=地板, 2=走廊, 3=门
    private List<RectInt> rooms = new List<RectInt>();
    private List<BSPNode> bspLeaves = new List<BSPNode>();

    /// <summary>
    /// BSP 树节点
    /// </summary>
    private class BSPNode
    {
        public RectInt area;        // 该节点覆盖的区域
        public RectInt room;        // 该节点中的房间（仅叶子节点有）
        public BSPNode left;        // 左/上子节点
        public BSPNode right;       // 右/下子节点
        public bool isLeaf => left == null && right == null;

        public BSPNode(RectInt area)
        {
            this.area = area;
        }
    }

    void Start()
    {
        GenerateDungeon();
    }

    /// <summary>
    /// 生成地牢
    /// </summary>
    public void GenerateDungeon()
    {
        // 清理旧数据
        rooms.Clear();
        bspLeaves.Clear();

        // 初始化地图（全部是墙壁）
        dungeonMap = new int[dungeonWidth, dungeonHeight];

        // 创建 BSP 根节点
        RectInt fullArea = new RectInt(0, 0, dungeonWidth, dungeonHeight);
        BSPNode root = new BSPNode(fullArea);

        // 使用种子随机
        GameRandom rng = new GameRandom(seed);

        // 步骤 1：递归分割空间
        SplitNode(root, 0, rng);

        // 步骤 2：在叶子节点中创建房间
        CreateRooms(root, rng);

        // 步骤 3：连接相邻房间（生成走廊）
        ConnectRooms(root, rng);

        // 步骤 4：实例化 3D 物体
        InstantiateDungeon();

        Debug.Log($"地牢生成完成: {dungeonWidth}x{dungeonHeight}, " +
                  $"房间数: {rooms.Count}, 种子: {seed}");
    }

    /// <summary>
    /// 递归分割 BSP 节点
    /// </summary>
    private void SplitNode(BSPNode node, int depth, GameRandom rng)
    {
        // 达到最大深度或区域太小，停止分割
        if (depth >= bspDepth)
        {
            bspLeaves.Add(node);
            return;
        }

        // 检查区域是否足够分割
        bool canSplitH = node.area.height >= minRoomHeight * 2 + roomPadding * 2;
        bool canSplitV = node.area.width >= minRoomWidth * 2 + roomPadding * 2;

        if (!canSplitH && !canSplitV)
        {
            bspLeaves.Add(node);
            return;
        }

        // 选择分割方向
        bool splitHorizontal;
        if (canSplitH && canSplitV)
        {
            // 两个方向都可以：倾向于沿长边分割
            float ratio = (float)node.area.width / node.area.height;
            splitHorizontal = ratio < 1.0f ? true : (ratio > 1.0f ? false : rng.Chance(0.5f));
        }
        else
        {
            splitHorizontal = canSplitH;
        }

        // 计算分割位置
        if (splitHorizontal)
        {
            // 水平分割（上下两半）
            int minSplit = node.area.y + minRoomHeight + roomPadding;
            int maxSplit = node.area.yMax - minRoomHeight - roomPadding;

            if (minSplit >= maxSplit)
            {
                bspLeaves.Add(node);
                return;
            }

            int splitPos = rng.Range(minSplit, maxSplit + 1);

            node.left = new BSPNode(new RectInt(
                node.area.x, node.area.y,
                node.area.width, splitPos - node.area.y));

            node.right = new BSPNode(new RectInt(
                node.area.x, splitPos,
                node.area.width, node.area.yMax - splitPos));
        }
        else
        {
            // 垂直分割（左右两半）
            int minSplit = node.area.x + minRoomWidth + roomPadding;
            int maxSplit = node.area.xMax - minRoomWidth - roomPadding;

            if (minSplit >= maxSplit)
            {
                bspLeaves.Add(node);
                return;
            }

            int splitPos = rng.Range(minSplit, maxSplit + 1);

            node.left = new BSPNode(new RectInt(
                node.area.x, node.area.y,
                splitPos - node.area.x, node.area.height));

            node.right = new BSPNode(new RectInt(
                splitPos, node.area.y,
                node.area.xMax - splitPos, node.area.height));
        }

        // 递归分割子节点
        SplitNode(node.left, depth + 1, rng);
        SplitNode(node.right, depth + 1, rng);
    }

    /// <summary>
    /// 在每个叶子节点中创建房间
    /// </summary>
    private void CreateRooms(BSPNode node, GameRandom rng)
    {
        if (node.isLeaf)
        {
            // 在分区内随机创建一个房间
            int roomWidth = rng.Range(minRoomWidth,
                Mathf.Max(minRoomWidth + 1, node.area.width - roomPadding * 2 + 1));
            int roomHeight = rng.Range(minRoomHeight,
                Mathf.Max(minRoomHeight + 1, node.area.height - roomPadding * 2 + 1));

            int roomX = rng.Range(node.area.x + roomPadding,
                Mathf.Max(node.area.x + roomPadding + 1, node.area.xMax - roomPadding - roomWidth + 1));
            int roomY = rng.Range(node.area.y + roomPadding,
                Mathf.Max(node.area.y + roomPadding + 1, node.area.yMax - roomPadding - roomHeight + 1));

            node.room = new RectInt(roomX, roomY, roomWidth, roomHeight);
            rooms.Add(node.room);

            // 在地图上标记房间
            for (int x = roomX; x < roomX + roomWidth; x++)
            {
                for (int y = roomY; y < roomY + roomHeight; y++)
                {
                    if (x >= 0 && x < dungeonWidth && y >= 0 && y < dungeonHeight)
                    {
                        dungeonMap[x, y] = 1; // 地板
                    }
                }
            }

            return;
        }

        if (node.left != null) CreateRooms(node.left, rng);
        if (node.right != null) CreateRooms(node.right, rng);
    }

    /// <summary>
    /// 连接相邻房间
    /// 通过 BSP 树结构，连接每对兄弟节点中的房间
    /// </summary>
    private void ConnectRooms(BSPNode node, GameRandom rng)
    {
        if (node.isLeaf) return;

        if (node.left != null) ConnectRooms(node.left, rng);
        if (node.right != null) ConnectRooms(node.right, rng);

        // 获取左右子树中各一个房间的中心点，然后连接
        if (node.left != null && node.right != null)
        {
            RectInt leftRoom = GetRoomInNode(node.left);
            RectInt rightRoom = GetRoomInNode(node.right);

            Vector2Int leftCenter = new Vector2Int(
                leftRoom.x + leftRoom.width / 2,
                leftRoom.y + leftRoom.height / 2);

            Vector2Int rightCenter = new Vector2Int(
                rightRoom.x + rightRoom.width / 2,
                rightRoom.y + rightRoom.height / 2);

            // 生成 L 形走廊
            CreateCorridor(leftCenter, rightCenter, rng);
        }
    }

    /// <summary>
    /// 递归获取节点子树中的一个房间
    /// </summary>
    private RectInt GetRoomInNode(BSPNode node)
    {
        if (node.isLeaf)
            return node.room;

        // 随机选择左或右子树
        if (node.left != null && node.right != null)
            return Random.value > 0.5f ? GetRoomInNode(node.left) : GetRoomInNode(node.right);
        if (node.left != null)
            return GetRoomInNode(node.left);
        return GetRoomInNode(node.right);
    }

    /// <summary>
    /// 创建 L 形走廊连接两个点
    /// </summary>
    private void CreateCorridor(Vector2Int from, Vector2Int to, GameRandom rng)
    {
        // 随机选择先水平再垂直，或先垂直再水平
        bool horizontalFirst = rng.Chance(0.5f);

        if (horizontalFirst)
        {
            // 先水平
            CreateHorizontalCorridor(from.x, to.x, from.y);
            // 再垂直
            CreateVerticalCorridor(from.y, to.y, to.x);
        }
        else
        {
            // 先垂直
            CreateVerticalCorridor(from.y, to.y, from.x);
            // 再水平
            CreateHorizontalCorridor(from.x, to.x, to.y);
        }
    }

    private void CreateHorizontalCorridor(int x1, int x2, int y)
    {
        int minX = Mathf.Min(x1, x2);
        int maxX = Mathf.Max(x1, x2);

        for (int x = minX; x <= maxX; x++)
        {
            for (int w = 0; w < corridorWidth; w++)
            {
                int cy = y + w - corridorWidth / 2;
                if (x >= 0 && x < dungeonWidth && cy >= 0 && cy < dungeonHeight)
                {
                    if (dungeonMap[x, cy] == 0) // 只修改墙壁
                        dungeonMap[x, cy] = 2; // 走廊
                }
            }
        }
    }

    private void CreateVerticalCorridor(int y1, int y2, int x)
    {
        int minY = Mathf.Min(y1, y2);
        int maxY = Mathf.Max(y1, y2);

        for (int y = minY; y <= maxY; y++)
        {
            for (int w = 0; w < corridorWidth; w++)
            {
                int cx = x + w - corridorWidth / 2;
                if (cx >= 0 && cx < dungeonWidth && y >= 0 && y < dungeonHeight)
                {
                    if (dungeonMap[cx, y] == 0)
                        dungeonMap[cx, y] = 2; // 走廊
                }
            }
        }
    }

    /// <summary>
    /// 根据地图数据实例化 3D 物体
    /// </summary>
    private void InstantiateDungeon()
    {
        // 清除之前的子物体
        for (int i = transform.childCount - 1; i >= 0; i--)
        {
            if (Application.isPlaying)
                Destroy(transform.GetChild(i).gameObject);
            else
                DestroyImmediate(transform.GetChild(i).gameObject);
        }

        float tileSize = 1f;

        for (int x = 0; x < dungeonWidth; x++)
        {
            for (int y = 0; y < dungeonHeight; y++)
            {
                Vector3 position = new Vector3(x * tileSize, 0, y * tileSize);

                if (dungeonMap[x, y] == 1 || dungeonMap[x, y] == 2)
                {
                    // 地板
                    if (floorPrefab != null)
                    {
                        Instantiate(floorPrefab, position, Quaternion.identity, transform);
                    }

                    // 检查周围是否需要墙壁
                    CheckAndPlaceWall(x, y, tileSize);
                }
            }
        }
    }

    /// <summary>
    /// 检查并在地板边缘放置墙壁
    /// </summary>
    private void CheckAndPlaceWall(int x, int y, float tileSize)
    {
        if (wallPrefab == null) return;

        // 检查四个方向
        int[,] directions = { { 0, 1 }, { 0, -1 }, { 1, 0 }, { -1, 0 } };
        float[] rotations = { 0, 180, 90, -90 };

        for (int d = 0; d < 4; d++)
        {
            int nx = x + directions[d, 0];
            int ny = y + directions[d, 1];

            // 如果相邻格子是墙壁或越界，放置墙壁
            if (nx < 0 || nx >= dungeonWidth || ny < 0 || ny >= dungeonHeight ||
                dungeonMap[nx, ny] == 0)
            {
                Vector3 wallPos = new Vector3(
                    x * tileSize + directions[d, 0] * tileSize * 0.5f,
                    0.5f,
                    y * tileSize + directions[d, 1] * tileSize * 0.5f);

                Quaternion wallRot = Quaternion.Euler(0, rotations[d], 0);
                Instantiate(wallPrefab, wallPos, wallRot, transform);
            }
        }
    }

    /// <summary>
    /// 编辑器中绘制 Gizmos 用于调试
    /// </summary>
    void OnDrawGizmos()
    {
        if (!drawGizmos || dungeonMap == null) return;

        for (int x = 0; x < dungeonWidth; x++)
        {
            for (int y = 0; y < dungeonHeight; y++)
            {
                Vector3 pos = transform.position + new Vector3(x, 0, y);

                switch (dungeonMap[x, y])
                {
                    case 1: // 房间地板
                        Gizmos.color = new Color(0.4f, 0.8f, 0.4f, 0.5f);
                        Gizmos.DrawCube(pos, Vector3.one * 0.9f);
                        break;
                    case 2: // 走廊
                        Gizmos.color = new Color(0.8f, 0.8f, 0.4f, 0.5f);
                        Gizmos.DrawCube(pos, Vector3.one * 0.9f);
                        break;
                }
            }
        }
    }
}
```

[截图：BSP 树生成的地牢俯视图——绿色房间 + 黄色走廊]

---

## 17.8 L-System 程序化植被

### 17.8.1 L-System 基础

```csharp
using System.Collections.Generic;
using System.Text;
using UnityEngine;

/// <summary>
/// L-System 程序化植被生成器
///
/// L-System（Lindenmayer System）是一种字符串重写系统：
/// 1. 从一个起始字符串（公理）开始
/// 2. 根据规则反复替换字符
/// 3. 最终字符串被解释为绘图指令
///
/// 示例：
///   公理: "F"
///   规则: F -> F[+F]F[-F]F
///
///   第 0 次: F
///   第 1 次: F[+F]F[-F]F
///   第 2 次: F[+F]F[-F]F[+F[+F]F[-F]F]F[+F]F[-F]F[-F[+F]F[-F]F]F[+F]F[-F]F
///
/// 字符含义：
///   F = 前进并画线（生长一段树枝）
///   + = 右转
///   - = 左转
///   [ = 保存当前状态（入栈）—— 类比前端 canvas.save()
///   ] = 恢复保存的状态（出栈）—— 类比前端 canvas.restore()
/// </summary>
public class LSystemTree : MonoBehaviour
{
    [Header("L-System 规则")]
    [SerializeField] private string axiom = "F";

    [SerializeField]
    private List<LSystemRule> rules = new List<LSystemRule>
    {
        new LSystemRule { input = 'F', output = "FF+[+F-F-F]-[-F+F+F]" }
    };

    [Header("迭代")]
    [Range(1, 6)]
    [SerializeField] private int iterations = 4;

    [Header("绘制参数")]
    [Tooltip("每段树枝的长度")]
    [SerializeField] private float segmentLength = 1f;

    [Tooltip("每次迭代长度缩减比例")]
    [Range(0.3f, 0.9f)]
    [SerializeField] private float lengthReduction = 0.7f;

    [Tooltip("转向角度")]
    [SerializeField] private float angle = 25f;

    [Tooltip("角度随机变化范围")]
    [SerializeField] private float angleVariance = 5f;

    [Header("渲染")]
    [SerializeField] private float initialWidth = 0.3f;
    [SerializeField] private float widthReduction = 0.7f;
    [SerializeField] private Material branchMaterial;
    [SerializeField] private Material leafMaterial;
    [SerializeField] private GameObject leafPrefab;

    [Header("种子")]
    [SerializeField] private int seed = 42;

    /// <summary>
    /// 生成 L-System 字符串
    /// </summary>
    public string GenerateLString()
    {
        string current = axiom;

        for (int i = 0; i < iterations; i++)
        {
            StringBuilder next = new StringBuilder();

            foreach (char c in current)
            {
                bool replaced = false;
                foreach (var rule in rules)
                {
                    if (c == rule.input)
                    {
                        next.Append(rule.output);
                        replaced = true;
                        break;
                    }
                }

                if (!replaced)
                {
                    next.Append(c);
                }
            }

            current = next.ToString();
        }

        Debug.Log($"L-System 字符串长度: {current.Length}");
        return current;
    }

    /// <summary>
    /// 根据 L-System 字符串生成 3D 树
    /// 使用"乌龟绘图"（Turtle Graphics）方法解释字符串
    /// </summary>
    public void GenerateTree()
    {
        string lString = GenerateLString();
        GameRandom rng = new GameRandom(seed);

        // 状态栈（用于 [ 和 ] 操作）
        Stack<TurtleState> stateStack = new Stack<TurtleState>();

        // 初始状态：从原点向上生长
        TurtleState state = new TurtleState
        {
            position = transform.position,
            direction = Vector3.up,
            right = Vector3.right,
            length = segmentLength,
            width = initialWidth,
            depth = 0
        };

        // 用于存储线段
        List<BranchSegment> segments = new List<BranchSegment>();

        foreach (char c in lString)
        {
            switch (c)
            {
                case 'F': // 前进并画线
                    Vector3 start = state.position;
                    state.position += state.direction * state.length;
                    state.length *= lengthReduction;

                    segments.Add(new BranchSegment
                    {
                        start = start,
                        end = state.position,
                        width = state.width,
                        depth = state.depth
                    });
                    break;

                case '+': // 右转
                    float rightAngle = angle + rng.Range(-angleVariance, angleVariance);
                    state.direction = Quaternion.AngleAxis(rightAngle, state.right) * state.direction;
                    break;

                case '-': // 左转
                    float leftAngle = angle + rng.Range(-angleVariance, angleVariance);
                    state.direction = Quaternion.AngleAxis(-leftAngle, state.right) * state.direction;
                    break;

                case '[': // 保存状态（分支起点）
                    stateStack.Push(state.Clone());
                    state.depth++;
                    state.width *= widthReduction;
                    break;

                case ']': // 恢复状态（分支结束）
                    // 在分支末端放置树叶
                    if (leafPrefab != null && state.depth > 2)
                    {
                        PlaceLeaf(state.position, rng);
                    }

                    if (stateStack.Count > 0)
                    {
                        state = stateStack.Pop();
                    }
                    break;
            }
        }

        // 使用 LineRenderer 或自定义网格渲染树枝
        RenderBranches(segments);

        Debug.Log($"树生成完成: {segments.Count} 段树枝");
    }

    /// <summary>
    /// 放置树叶
    /// </summary>
    private void PlaceLeaf(Vector3 position, GameRandom rng)
    {
        if (leafPrefab == null) return;

        GameObject leaf = Instantiate(leafPrefab, position, Random.rotation, transform);
        float scale = rng.Range(0.3f, 0.8f);
        leaf.transform.localScale = Vector3.one * scale;
    }

    /// <summary>
    /// 渲染树枝线段
    /// </summary>
    private void RenderBranches(List<BranchSegment> segments)
    {
        foreach (var seg in segments)
        {
            // 使用 Debug.DrawLine 进行简单可视化
            Debug.DrawLine(seg.start, seg.end, Color.Lerp(Color.yellow, Color.green, seg.depth / 5f), 60f);

            // 实际项目中应使用 LineRenderer 或 自定义 Mesh
            // 这里展示 LineRenderer 方式：
            // GameObject lineObj = new GameObject($"Branch_{seg.depth}");
            // lineObj.transform.SetParent(transform);
            // LineRenderer lr = lineObj.AddComponent<LineRenderer>();
            // lr.material = branchMaterial;
            // lr.startWidth = seg.width;
            // lr.endWidth = seg.width * 0.8f;
            // lr.SetPosition(0, seg.start);
            // lr.SetPosition(1, seg.end);
        }
    }

    void Start()
    {
        GenerateTree();
    }
}

/// <summary>
/// L-System 替换规则
/// </summary>
[System.Serializable]
public class LSystemRule
{
    public char input;
    public string output;
}

/// <summary>
/// 乌龟绘图状态
/// </summary>
public struct TurtleState
{
    public Vector3 position;
    public Vector3 direction;
    public Vector3 right;
    public float length;
    public float width;
    public int depth;

    public TurtleState Clone()
    {
        return new TurtleState
        {
            position = position,
            direction = direction,
            right = right,
            length = length,
            width = width,
            depth = depth
        };
    }
}

/// <summary>
/// 树枝线段数据
/// </summary>
public struct BranchSegment
{
    public Vector3 start;
    public Vector3 end;
    public float width;
    public int depth;
}
```

[截图：L-System 生成的多种树形态——不同规则产生不同树形]

---

## 17.9 Wave Function Collapse 概念介绍

### 17.9.1 WFC 算法概述

```
Wave Function Collapse (WFC) —— 波函数坍缩算法

灵感来源：量子力学中的波函数坍缩
游戏中的用途：根据样本图像/规则自动生成满足约束的内容

基本原理：
1. 网格中每个格子有多种可能的状态（比如：草地、道路、水面……）
2. 每个格子的状态受到相邻格子的约束（比如：道路旁边不能是水面）
3. 算法不断"坍缩"（确定）格子的状态，直到所有格子都被确定

步骤：
┌─────────────────────────────────────┐
│ 1. 初始化：所有格子都有全部可能状态    │
│    [草/路/水] [草/路/水] [草/路/水]   │
│    [草/路/水] [草/路/水] [草/路/水]   │
│                                      │
│ 2. 选择熵最低的格子（可能状态最少的）   │
│    [草/路/水] [草/路]   [草/路/水]    │
│    [草/路/水] [草/路/水] [草/路/水]   │
│                                      │
│ 3. 随机坍缩它的状态                   │
│    [草/路/水] [路]      [草/路/水]    │
│    [草/路/水] [草/路/水] [草/路/水]   │
│                                      │
│ 4. 传播约束（更新相邻格子的可能状态）   │
│    [草/路]   [路]       [草/路]      │
│    [草/路]   [草/路]    [草/路/水]   │
│                                      │
│ 5. 重复 2-4 直到所有格子确定          │
│    [草]      [路]       [草]         │
│    [草]      [草]       [水]         │
└─────────────────────────────────────┘

适用场景：
- 城镇/村庄布局生成
- 地砖/瓷砖图案生成
- 关卡拼接
- 任何需要满足相邻规则的内容生成

注意：WFC 的完整实现较复杂，通常使用现成的库或插件。
这里只做概念介绍，实际使用推荐 Unity Asset Store 上的 WFC 插件。
```

> 💡 **前端类比**：WFC 类似 CSS Grid 的 auto-placement 算法——浏览器根据约束自动决定每个 Grid Item 的位置。WFC 更进一步，它连"放什么"也是自动决定的。

---

## 17.10 实战：程序化森林生成

### 17.10.1 将所有技术整合

```csharp
using UnityEngine;

/// <summary>
/// 森林场景程序化生成器
/// 整合本章学到的所有技术
///
/// 生成流程：
/// 1. 使用 Perlin 噪声生成地形
/// 2. 使用噪声确定生物群落分布
/// 3. 使用泊松盘采样放置大树
/// 4. 使用网格采样放置灌木和草地
/// 5. 在空旷处放置岩石
/// 6. 添加小路连接兴趣点
/// </summary>
public class ForestGenerator : MonoBehaviour
{
    [Header("世界设置")]
    [SerializeField] private int worldSeed = 12345;
    [SerializeField] private float worldSize = 200f;

    [Header("组件引用")]
    [SerializeField] private ProceduralTerrain terrainGenerator;
    [SerializeField] private ObjectPlacer objectPlacer;

    [Header("树木预制体")]
    [SerializeField] private GameObject[] tallTreePrefabs;
    [SerializeField] private GameObject[] smallTreePrefabs;
    [SerializeField] private GameObject[] bushPrefabs;
    [SerializeField] private GameObject[] rockPrefabs;
    [SerializeField] private GameObject[] grassPrefabs;
    [SerializeField] private GameObject[] flowerPrefabs;

    /// <summary>
    /// 一键生成整个森林场景
    /// </summary>
    public void GenerateForest()
    {
        Debug.Log($"=== 开始生成森林场景 (种子: {worldSeed}) ===");
        float startTime = Time.realtimeSinceStartup;

        // 步骤 1：生成地形
        Debug.Log("步骤 1/4: 生成地形...");
        if (terrainGenerator != null)
        {
            terrainGenerator.GenerateTerrain();
        }

        // 步骤 2：配置并执行物体放置
        Debug.Log("步骤 2/4: 放置大型树木...");
        PlaceTallTrees();

        Debug.Log("步骤 3/4: 放置灌木和岩石...");
        PlaceBushesAndRocks();

        Debug.Log("步骤 4/4: 放置草地和花朵...");
        PlaceGrassAndFlowers();

        float elapsed = Time.realtimeSinceStartup - startTime;
        Debug.Log($"=== 森林生成完成！耗时: {elapsed:F2}秒 ===");
    }

    private void PlaceTallTrees()
    {
        if (tallTreePrefabs == null || tallTreePrefabs.Length == 0) return;

        GameRandom rng = new GameRandom(worldSeed);

        // 使用泊松盘采样确保树木间距自然
        // 模拟 ObjectPlacer 的逻辑
        float minDistance = 5f; // 大树之间最小 5 米距离

        // 使用噪声控制树木密度分布
        // 噪声值高的区域（>0.4）放置树木
        int treesPlaced = 0;

        for (float x = 0; x < worldSize; x += 3f)
        {
            for (float z = 0; z < worldSize; z += 3f)
            {
                float densityNoise = Mathf.PerlinNoise(
                    (x + worldSeed) * 0.02f,
                    (z + worldSeed) * 0.02f
                );

                if (densityNoise > 0.4f && rng.Chance(0.3f))
                {
                    float jitterX = rng.Range(-1.5f, 1.5f);
                    float jitterZ = rng.Range(-1.5f, 1.5f);

                    Vector3 pos = new Vector3(x + jitterX, 0, z + jitterZ);
                    // 获取地形高度...
                    // pos.y = terrain.GetHeightAtWorldPosition(pos.x, pos.z);

                    GameObject prefab = rng.Choose(tallTreePrefabs);
                    if (prefab != null)
                    {
                        GameObject tree = Instantiate(prefab, pos, Quaternion.Euler(0, rng.Range(0f, 360f), 0), transform);
                        float scale = rng.Range(0.8f, 1.3f);
                        tree.transform.localScale = Vector3.one * scale;
                        treesPlaced++;
                    }
                }
            }
        }

        Debug.Log($"  大树放置完成: {treesPlaced} 棵");
    }

    private void PlaceBushesAndRocks()
    {
        // 灌木和岩石的放置逻辑类似，但密度更高，间距更小
        // 省略具体实现——与 PlaceTallTrees 类似
        Debug.Log("  灌木和岩石放置完成");
    }

    private void PlaceGrassAndFlowers()
    {
        // 草地使用 GPU Instancing 大量渲染
        // 花朵在特定的噪声区域内放置
        Debug.Log("  草地和花朵放置完成");
    }

    void Start()
    {
        GenerateForest();
    }
}
```

[截图：完成的程序化森林场景——远景、中景、近景分别展示不同层次的植被]

---

## 练习题

### 练习 1：噪声实验（难度：中等）

创建一个 NoiseVisualizer 组件：
1. 在 Plane 上实时显示噪声图
2. 在 Inspector 中可以调整所有噪声参数（scale, octaves, lacunarity, persistence）
3. 参数变化时自动更新预览
4. 添加一个下拉菜单选择噪声类型：基础 Perlin、fBm、Ridged Noise（山脊噪声）

### 练习 2：改进地牢生成器（难度：较高）

在 BSP 地牢生成器的基础上添加：
1. 在每个房间内随机放置敌人和宝箱
2. 标记一个起始房间和一个 Boss 房间（距离最远的两个房间）
3. 在房间入口处放置门
4. 给房间添加随机"主题"（比如藏宝室、牢房、祭坛等）
5. 生成小地图预览

### 练习 3：程序化村庄（难度：高）

创建一个简单的村庄生成器：
1. 先生成一条主干道路（使用 Bezier 曲线或折线）
2. 沿道路两侧随机放置房屋预制体
3. 在房屋之间放置围栏和花园
4. 在村庄中心生成一个广场
5. 在广场放置水井或雕像

提示：可以先用简单的 Cube/Cylinder 代替精细的预制体。

---

## 下一章预告

**第 18 章：开放世界架构设计**

有了程序化生成的能力，下一步是让整个开放世界高效运转：
- 基于区块（Chunk）的世界加载系统
- Addressables 资源异步加载
- LOD（细节层次）系统
- 对象池优化频繁生成/销毁的物体
- 场景的增量式加载（Additive Scene Loading）
- 内存管理策略

从"生成世界"到"管理世界"，让你的开放世界在手机上流畅运行！
