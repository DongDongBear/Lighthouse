# 第 19 章：大地形系统

> 用 Unity Terrain 雕刻山川湖海——从地形创建到海量植被渲染的完整指南。

## 本章目标

完成本章学习后，你将能够：

1. 深入理解 Unity Terrain 组件的工作原理和核心参数
2. 熟练使用地形工具：提升/降低、平滑、绘制纹理、放置树木和草地
3. 理解地形分辨率设置（高度图、细节图、Splat Map）的含义和影响
4. 配置地形图层（Terrain Layers）和材质
5. 实现多块地形拼接以构建超大世界
6. 配置地形 LOD 和 Pixel Error 优化渲染性能
7. 使用 SpeedTree 和 GPU Instancing 高效渲染海量树木
8. 配置草地和细节物体的 GPU Instancing 渲染
9. 使用地形孔洞（Terrain Holes）创建洞穴入口
10. 了解 URP 自定义地形着色器的基础
11. 通过 Terrain API 在运行时动态修改地形
12. 导入/导出地形数据
13. 掌握移动端地形性能优化策略

## 预计学习时间

**5 小时**

---

## 19.1 Unity Terrain 概览

### 19.1.1 什么是 Unity Terrain

```
Unity Terrain 是引擎内置的专用地形系统：

核心特性：
├── 基于高度图（Heightmap）的地形表示
├── 内置绘制工具（在编辑器中直接"画"地形）
├── 多层纹理混合（泥土、草地、岩石……）
├── 内置树木和草地渲染系统
├── 自动 LOD（距离越远细节越少）
├── 碰撞检测支持
└── API 支持运行时修改

与程序化网格地形（第 17 章）的区别：

Unity Terrain：
+ 编辑器工具完善，美术可以直接用
+ 内置植被系统（树木/草地）
+ 自动 LOD 和碰撞
- 灵活性较低（只能是高度图形式）
- 不能有悬崖洞穴（垂直面和倒悬面）

程序化网格：
+ 完全自由的形状（洞穴、悬崖）
+ 更灵活的自定义
- 需要自己实现所有功能
- 开发工作量大

实际项目中的选择：
- 开放世界地面 → Unity Terrain（推荐）
- 洞穴/地牢内部 → 自定义网格
- 海底/天空岛 → 自定义网格 + Terrain 结合
```

> 💡 **前端类比**：Unity Terrain 就像 CSS Grid 布局——它提供了一套完整的高级 API 来处理常见需求（网格布局/地形渲染），你不需要自己用 Flexbox 手写每一行的定位。虽然灵活性略低，但效率极高。

### 19.1.2 创建第一个地形

```
步骤 1：创建地形 GameObject
  菜单: GameObject → 3D Object → Terrain

  这会在场景中创建：
  - 一个名为 "Terrain" 的 GameObject
  - 附带 Terrain 组件和 Terrain Collider 组件
  - 一个关联的 TerrainData 资产文件

[截图：新创建的 Terrain 在 Scene 视图中的样子——一块绿色平面]

步骤 2：查看 Terrain 组件
  选中 Terrain 对象，在 Inspector 中查看：

  Terrain 组件包含 5 个工具选项卡（图标从左到右）：
  🖌️ 1. Create Neighbor Terrains（创建相邻地形）
  🏔️ 2. Paint Terrain（绘制地形）
       ├── Raise or Lower Terrain（提升/降低地形）
       ├── Paint Holes（绘制孔洞）
       ├── Paint Texture（绘制纹理）
       ├── Set Height（设置高度）
       ├── Smooth Height（平滑高度）
       └── Stamp Terrain（印章地形）
  🌲 3. Paint Trees（绘制树木）
  🌿 4. Paint Details（绘制细节——草地等）
  ⚙️ 5. Terrain Settings（地形设置）

[截图：Terrain Inspector 的 5 个工具选项卡图标]
```

---

## 19.2 地形工具详解

### 19.2.1 提升/降低地形 (Raise or Lower)

```
工具作用：用画笔在地形上"画"出高度变化

操作方式：
- 左键拖动：提升地形（画山）
- Shift + 左键拖动：降低地形（画谷）

关键参数：
├── Brush Size（画笔大小）: 1 - 200
│   控制每次绘制影响的区域大小
│
├── Opacity（不透明度/强度）: 0 - 100
│   控制每次绘制的高度变化量
│   值越大，地形变化越剧烈
│
└── Brush Shape（画笔形状）:
    Unity 提供多种画笔形状
    - 圆形软边：最常用，产生自然的山丘
    - 方形：适合人工结构（如梯田）
    - 噪声形状：产生随机凹凸

[截图：使用 Raise 工具画出山丘的过程——画笔选择和效果]

实用技巧：
1. 先用大画笔画大轮廓（山脉走向）
2. 再用小画笔添加细节（小丘陵、岩壁）
3. 最后用 Smooth 工具平滑过渡区域
4. 反复迭代，不要期望一次画好
```

### 19.2.2 设置高度 (Set Height)

```
工具作用：将画笔区域设置为指定高度

使用场景：
- 创建平坦的高原
- 创建统一高度的水面区域
- 创建建筑地基的平台

操作方式：
1. 设置目标高度值（Height）
2. 用画笔在地形上涂抹
3. 涂抹区域会逐渐趋向目标高度

技巧：Flatten 按钮可以快速将选定区域完全展平

[截图：使用 Set Height 创建平坦高原的效果]
```

### 19.2.3 平滑工具 (Smooth Height)

```
工具作用：平滑地形的高度变化，消除突兀的尖角

使用场景：
- 提升/降低工具画出的地形过于尖锐时
- 需要创建平缓过渡的坡地
- 修饰地形边缘

[截图：Smooth 工具使用前后的对比]
```

### 19.2.4 印章地形 (Stamp Terrain)

```
工具作用：将预定义的高度图形状一次性"盖章"到地形上

使用场景：
- 快速创建标准形状的山丘、环形山
- 批量创建相似的地形特征
- 使用自定义的高度图纹理作为印章

[截图：用印章工具创建的环形山和锥形山]
```

### 19.2.5 绘制纹理 (Paint Texture)

```
步骤 1：创建 Terrain Layer（地形图层）

  Terrain Layer 是定义地形表面材质的资产：
  - 每个 Layer 包含：漫反射纹理、法线贴图、蒙版贴图
  - 可以创建多个 Layer：草地、泥土、岩石、沙地……

  创建方法：
  Project 窗口右键 → Create → Terrain Layer

  配置 Terrain Layer：
  - Diffuse Texture: 漫反射纹理（如 grass_diffuse.png）
  - Normal Map: 法线贴图（可选，增加细节感）
  - Tiling Size: 纹理的平铺大小
  - Metallic / Smoothness: PBR 材质参数

[截图：创建和配置 Terrain Layer 的步骤]

步骤 2：添加 Layer 到地形

  在 Terrain Inspector 的 Paint Texture 工具中：
  - 点击 "Edit Terrain Layers"
  - 选择 "Add Layer"
  - 选择之前创建的 Terrain Layer
  - 第一个添加的 Layer 会自动覆盖整个地形

步骤 3：绘制纹理

  - 选择要绘制的 Layer
  - 用画笔在地形上涂抹
  - 多个 Layer 在重叠处自动混合

[截图：在地形上绘制草地和岩石纹理的效果——山顶岩石、坡面草地]

最佳实践：
1. Layer 数量控制在 4-8 个（每增加 4 个会多一个 draw call）
2. 第一个 Layer 作为基础层（通常是草地或泥土）
3. 山顶和陡峭处用岩石纹理
4. 低洼处用泥土/沙地纹理
5. 水边用湿润的泥土纹理
```

### 19.2.6 绘制树木 (Paint Trees)

```
步骤 1：准备树木预制体
  - 可以使用 SpeedTree 模型
  - 也可以使用普通的 Mesh 预制体
  - Unity Asset Store 上有免费的树木资源

步骤 2：添加树木到 Terrain
  在 Paint Trees 工具中：
  - 点击 "Edit Trees"
  - 点击 "Add Tree"
  - 选择树木预制体

步骤 3：绘制树木
  参数：
  ├── Brush Size: 放置区域大小
  ├── Tree Density: 树木密度
  ├── Tree Height: 高度范围（随机变化）
  ├── Lock Width to Height: 锁定宽高比
  ├── Tree Width: 宽度范围
  ├── Color Variation: 颜色随机变化
  └── Random Tree Rotation: 随机旋转

[截图：在地形上用画笔绘制树木——不同密度的效果对比]

注意：
- Terrain 的树木系统使用专门的渲染管线
- 远距离树木自动切换为 Billboard（面片）
- 性能比手动放置的 Prefab 好很多
- 移动端建议控制可见树木总数在 5000 以内
```

### 19.2.7 绘制细节/草地 (Paint Details)

```
步骤 1：添加细节层

  两种模式：
  A) Detail Mesh（网格模式）：使用 3D 模型
     适用于：小灌木、蘑菇、小石头
  B) Grass Texture（草纹理模式）：使用纹理面片
     适用于：草地（性能更好）

步骤 2：配置草纹理
  - Detail Texture: 草的 Alpha 纹理
  - Min/Max Width: 草的宽度范围
  - Min/Max Height: 草的高度范围
  - Healthy Color: 健康状态的颜色
  - Dry Color: 干枯状态的颜色
  - Billboard: 是否始终面向摄像机

[截图：在山坡上绘制草地的效果——近景显示单根草的细节]

步骤 3：绘制
  - 左键绘制
  - Shift + 左键擦除
  - 调整 Opacity 控制密度

移动端注意：
- 草地是开放世界中最耗性能的部分之一
- 启用 GPU Instancing 是必须的
- 控制草地密度和渲染距离
- 远距离的草地用地形纹理代替
```

---

## 19.3 地形分辨率设置

### 19.3.1 各分辨率参数详解

```
在 Terrain Settings（齿轮图标）中可以配置分辨率：

1. Heightmap Resolution（高度图分辨率）
   ├── 定义：高度图的像素大小（必须是 2^n + 1）
   ├── 可选值：33, 65, 129, 257, 513, 1025, 2049, 4097
   ├── 推荐值：
   │   - 移动端: 257 或 513
   │   - PC: 1025 或 2049
   ├── 影响：
   │   - 越高 = 地形越精细（可以画更细的细节）
   │   - 越高 = 占用更多内存
   │   - 513x513 ≈ 1MB 内存
   │   - 2049x2049 ≈ 16MB 内存
   └── 类比：就像图片分辨率——720p vs 4K

2. Detail Resolution（细节分辨率）
   ├── 定义：草地/细节物体的密度网格分辨率
   ├── 推荐值：512 - 1024
   └── 影响：决定草地可以画得多密集

3. Detail Resolution Per Patch（每个 Patch 的细节分辨率）
   ├── 定义：每个渲染 Patch 的细节点数
   ├── 推荐值：8 或 16
   └── 影响：值越大每个 Patch 的草越多

4. Control Texture Resolution（控制纹理分辨率 / Splat Map）
   ├── 定义：纹理混合权重图的分辨率
   ├── 推荐值：512 - 1024
   ├── 影响：纹理混合的精细程度
   └── 类比：Photoshop 中蒙版的分辨率

5. Base Texture Resolution（基础纹理分辨率）
   ├── 定义：远距离使用的合成纹理分辨率
   ├── 推荐值：1024
   └── 影响：远看地形的清晰度

[截图：Terrain Settings 中各分辨率参数的位置和推荐配置]
```

### 19.3.2 地形大小设置

```
Terrain Width / Length / Height：

Width（宽度）和 Length（长度）：
├── 定义：地形在 X 和 Z 方向上的世界单位大小
├── 推荐值：
│   - 单块地形: 500-2000 米
│   - 多块拼接: 每块 250-500 米
└── 注意：不要做太大的单块地形（性能差）

Height（高度）：
├── 定义：地形的最大高度范围
├── 推荐值：根据场景需求
│   - 平原为主: 100-300 米
│   - 山地为主: 500-1500 米
└── 注意：高度范围影响高度图的精度
         如果 Height=1000 但实际只用到 50 米高
         则高度精度会浪费

[截图：调整地形大小参数前后的对比]
```

---

## 19.4 多地形拼接

### 19.4.1 创建相邻地形

```
方法 1：使用 Create Neighbor Terrains 工具

  在 Terrain Inspector 中选择第一个工具图标
  可以看到一个 3x3 网格，中间是当前地形
  点击相邻的格子即可自动创建对齐的新地形

[截图：Create Neighbor Terrains 的 3x3 网格界面]

方法 2：手动创建和对齐

  1. 创建多个 Terrain GameObject
  2. 手动设置每个的 Position 使它们无缝对齐
  3. 使用 Terrain.SetNeighbors() API 连接它们

  示例布局（4 块地形拼接成 2x2）：
  ┌─────────┬─────────┐
  │ (0,500) │(500,500)│
  │  T_NW   │  T_NE   │
  ├─────────┼─────────┤
  │  (0,0)  │ (500,0) │
  │  T_SW   │  T_SE   │
  └─────────┴─────────┘
  每块 500x500 米，组成 1000x1000 米的世界

方法 3：通过代码创建地形网格
  详见下方的 TerrainGenerator.cs
```

### 19.4.2 确保边缘无缝

```
多地形拼接的常见问题：

问题 1：高度接缝
  症状：相邻地形边缘有明显的裂缝或高度差
  解决：
  - 使用 Terrain.SetNeighbors() 设置邻居关系
  - 确保边缘高度值完全一致
  - 使用 Smooth 工具处理边缘

问题 2：纹理接缝
  症状：纹理在地形边界处不连续
  解决：
  - 使用相同的 Terrain Layer 和 Tiling 设置
  - 确保纹理是无缝平铺的（seamless tiling）

问题 3：树木/草地间隙
  症状：地形边界处树木/草地突然断开
  解决：
  - 绘制时注意跨越边界
  - 可以通过代码在边界区域补充放置

[截图：正确拼接的 2x2 地形——从高处俯瞰无明显接缝]
```

---

## 19.5 TerrainGenerator.cs —— 代码创建和管理地形

```csharp
using UnityEngine;

/// <summary>
/// TerrainGenerator.cs —— 地形生成器
///
/// 通过代码创建和管理 Unity Terrain
/// 支持多块地形的自动拼接
/// 支持从高度图或程序化噪声生成地形
///
/// 使用场景：
/// 1. 运行时动态创建地形（配合区块加载系统）
/// 2. 编辑器工具：批量创建地形网格
/// 3. 从外部数据（卫星高度图等）导入地形
/// </summary>
public class TerrainGenerator : MonoBehaviour
{
    [Header("地形网格设置")]
    [Tooltip("网格行列数（2x2 = 4块地形）")]
    [SerializeField] private int gridSizeX = 2;
    [SerializeField] private int gridSizeZ = 2;

    [Header("每块地形大小")]
    [Tooltip("每块地形的宽度（世界单位）")]
    [SerializeField] private float tileWidth = 500f;
    [Tooltip("每块地形的深度（世界单位）")]
    [SerializeField] private float tileLength = 500f;
    [Tooltip("地形最大高度")]
    [SerializeField] private float terrainHeight = 300f;

    [Header("分辨率")]
    [Tooltip("高度图分辨率（必须是 2^n + 1）")]
    [SerializeField] private int heightmapResolution = 513;
    [Tooltip("控制纹理分辨率（Splat Map）")]
    [SerializeField] private int alphamapResolution = 512;
    [Tooltip("细节分辨率")]
    [SerializeField] private int detailResolution = 512;

    [Header("噪声生成")]
    [SerializeField] private int seed = 42;
    [SerializeField] private float noiseScale = 200f;
    [Range(1, 8)]
    [SerializeField] private int octaves = 5;
    [Range(1f, 4f)]
    [SerializeField] private float lacunarity = 2f;
    [Range(0f, 1f)]
    [SerializeField] private float persistence = 0.45f;

    [Header("高度曲线")]
    [SerializeField] private AnimationCurve heightCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);

    [Header("地形图层")]
    [SerializeField] private TerrainLayer[] terrainLayers;

    [Header("树木")]
    [SerializeField] private GameObject[] treePrefabs;
    [SerializeField] private float treeDensity = 0.01f;

    // 存储所有创建的地形
    private Terrain[,] terrainGrid;

    /// <summary>
    /// 生成完整的地形网格
    /// </summary>
    public void Generate()
    {
        Debug.Log($"[TerrainGenerator] 开始生成 {gridSizeX}x{gridSizeZ} 地形网格");
        float startTime = Time.realtimeSinceStartup;

        terrainGrid = new Terrain[gridSizeX, gridSizeZ];

        // 步骤 1：创建所有地形块
        for (int x = 0; x < gridSizeX; x++)
        {
            for (int z = 0; z < gridSizeZ; z++)
            {
                terrainGrid[x, z] = CreateTerrainTile(x, z);
            }
        }

        // 步骤 2：设置邻居关系（确保边缘无缝）
        SetupNeighbors();

        // 步骤 3：生成高度图
        for (int x = 0; x < gridSizeX; x++)
        {
            for (int z = 0; z < gridSizeZ; z++)
            {
                GenerateHeightmap(terrainGrid[x, z], x, z);
            }
        }

        // 步骤 4：绘制纹理（基于高度和坡度自动分配）
        for (int x = 0; x < gridSizeX; x++)
        {
            for (int z = 0; z < gridSizeZ; z++)
            {
                AutoPaintTextures(terrainGrid[x, z]);
            }
        }

        // 步骤 5：放置树木
        for (int x = 0; x < gridSizeX; x++)
        {
            for (int z = 0; z < gridSizeZ; z++)
            {
                PlaceTrees(terrainGrid[x, z]);
            }
        }

        float elapsed = Time.realtimeSinceStartup - startTime;
        Debug.Log($"[TerrainGenerator] 地形生成完成！耗时: {elapsed:F2}秒");
        Debug.Log($"  总面积: {gridSizeX * tileWidth} x {gridSizeZ * tileLength} 米");
    }

    /// <summary>
    /// 创建单块地形
    /// </summary>
    private Terrain CreateTerrainTile(int gridX, int gridZ)
    {
        // 创建 TerrainData 资产
        TerrainData terrainData = new TerrainData();
        terrainData.heightmapResolution = heightmapResolution;
        terrainData.alphamapResolution = alphamapResolution;
        terrainData.SetDetailResolution(detailResolution, 16);
        terrainData.size = new Vector3(tileWidth, terrainHeight, tileLength);

        // 设置地形图层
        if (terrainLayers != null && terrainLayers.Length > 0)
        {
            terrainData.terrainLayers = terrainLayers;
        }

        // 创建 GameObject
        GameObject terrainObj = Terrain.CreateTerrainGameObject(terrainData);
        terrainObj.name = $"Terrain_{gridX}_{gridZ}";
        terrainObj.transform.SetParent(transform);
        terrainObj.transform.position = new Vector3(
            gridX * tileWidth,
            0,
            gridZ * tileLength
        );

        // 获取 Terrain 组件
        Terrain terrain = terrainObj.GetComponent<Terrain>();

        // 配置地形渲染设置
        ConfigureTerrainSettings(terrain);

        return terrain;
    }

    /// <summary>
    /// 配置地形的渲染和性能设置
    /// </summary>
    private void ConfigureTerrainSettings(Terrain terrain)
    {
        // ===== LOD 和性能设置 =====

        // Pixel Error（像素误差）
        // 控制地形 LOD 的切换阈值
        // 值越大 = LOD 切换越积极 = 性能越好但质量越低
        // 推荐：移动端 5-10，PC 1-5
        terrain.heightmapPixelError = 8f;

        // Base Map Distance（基础贴图距离）
        // 超过此距离的地形使用合成的低分辨率纹理
        // 推荐：移动端 100-200，PC 500-1000
        terrain.basemapDistance = 150f;

        // 树木和细节的渲染距离
        terrain.treeDistance = 200f;         // 树木消失的距离
        terrain.treeBillboardDistance = 80f; // 树木切换为 Billboard 的距离
        terrain.detailObjectDistance = 80f;  // 草地/细节物体的渲染距离
        terrain.detailObjectDensity = 0.8f;  // 细节物体密度 (0-1)

        // 树木交叉淡入淡出
        terrain.treeCrossFadeLength = 20f;

        // Draw Instanced（GPU Instancing）
        // 对于草地和细节物体非常重要！
        terrain.drawInstanced = true;

        // 风力设置（影响草地摇动）
        terrain.terrainData.wavingGrassSpeed = 0.5f;
        terrain.terrainData.wavingGrassAmount = 0.3f;
        terrain.terrainData.wavingGrassStrength = 0.5f;

        Debug.Log($"[TerrainGenerator] 地形设置配置完成: {terrain.name}");
    }

    /// <summary>
    /// 设置地形邻居关系
    /// 这确保相邻地形的边缘高度自动对齐，消除接缝
    /// </summary>
    private void SetupNeighbors()
    {
        for (int x = 0; x < gridSizeX; x++)
        {
            for (int z = 0; z < gridSizeZ; z++)
            {
                Terrain current = terrainGrid[x, z];

                // 四个方向的邻居
                Terrain left = (x > 0) ? terrainGrid[x - 1, z] : null;
                Terrain right = (x < gridSizeX - 1) ? terrainGrid[x + 1, z] : null;
                Terrain top = (z < gridSizeZ - 1) ? terrainGrid[x, z + 1] : null;
                Terrain bottom = (z > 0) ? terrainGrid[x, z - 1] : null;

                // SetNeighbors 参数顺序：left, top, right, bottom
                current.SetNeighbors(left, top, right, bottom);
            }
        }

        Debug.Log("[TerrainGenerator] 邻居关系设置完成");
    }

    /// <summary>
    /// 为指定地形块生成高度图
    /// </summary>
    private void GenerateHeightmap(Terrain terrain, int gridX, int gridZ)
    {
        TerrainData data = terrain.terrainData;
        int res = data.heightmapResolution;
        float[,] heights = new float[res, res];

        // 种子偏移
        System.Random rng = new System.Random(seed);
        float seedOffsetX = (float)(rng.NextDouble() * 10000);
        float seedOffsetZ = (float)(rng.NextDouble() * 10000);

        for (int z = 0; z < res; z++)
        {
            for (int x = 0; x < res; x++)
            {
                // 计算世界坐标
                float worldX = gridX * tileWidth + (float)x / (res - 1) * tileWidth;
                float worldZ = gridZ * tileLength + (float)z / (res - 1) * tileLength;

                // 多层 Perlin 噪声
                float height = 0f;
                float amplitude = 1f;
                float frequency = 1f;
                float maxAmplitude = 0f;

                for (int i = 0; i < octaves; i++)
                {
                    float sampleX = (worldX + seedOffsetX) / noiseScale * frequency;
                    float sampleZ = (worldZ + seedOffsetZ) / noiseScale * frequency;

                    float noise = Mathf.PerlinNoise(sampleX, sampleZ) * 2f - 1f;
                    height += noise * amplitude;

                    maxAmplitude += amplitude;
                    amplitude *= persistence;
                    frequency *= lacunarity;
                }

                // 归一化到 [0, 1]
                height = (height / maxAmplitude + 1f) / 2f;

                // 应用高度曲线
                height = heightCurve.Evaluate(height);

                // 注意：Terrain 高度图的坐标是 [z, x]，不是 [x, z]！
                // 这是 Unity Terrain 的一个常见陷阱
                heights[z, x] = height;
            }
        }

        // 设置高度图
        data.SetHeights(0, 0, heights);

        Debug.Log($"[TerrainGenerator] 高度图生成完成: Terrain_{gridX}_{gridZ}");
    }

    /// <summary>
    /// 自动绘制纹理——基于高度和坡度分配不同的地形图层
    /// </summary>
    private void AutoPaintTextures(Terrain terrain)
    {
        TerrainData data = terrain.terrainData;

        if (data.terrainLayers == null || data.terrainLayers.Length < 2)
        {
            Debug.LogWarning("需要至少 2 个 Terrain Layer 才能自动绘制纹理");
            return;
        }

        int alphamapRes = data.alphamapResolution;
        int layerCount = data.terrainLayers.Length;

        // Splat Map: 每个像素存储每个 Layer 的权重 [0, 1]
        // 所有 Layer 的权重之和必须等于 1
        float[,,] splatMap = new float[alphamapRes, alphamapRes, layerCount];

        for (int z = 0; z < alphamapRes; z++)
        {
            for (int x = 0; x < alphamapRes; x++)
            {
                // 获取归一化坐标
                float normalizedX = (float)x / (alphamapRes - 1);
                float normalizedZ = (float)z / (alphamapRes - 1);

                // 获取该位置的高度（归一化值 0-1）
                float height = data.GetInterpolatedHeight(normalizedX, normalizedZ) / data.size.y;

                // 获取该位置的坡度（度数）
                float steepness = data.GetSteepness(normalizedX, normalizedZ);

                // 初始化权重数组
                float[] weights = new float[layerCount];

                // ===== 纹理分配规则 =====
                // 这里假设 Layer 顺序为：
                // 0: 草地 (Grass)
                // 1: 泥土 (Dirt)
                // 2: 岩石 (Rock)
                // 3: 雪 (Snow) -- 如果有的话

                if (layerCount >= 3)
                {
                    // 坡度规则：陡峭处用岩石
                    float rockWeight = Mathf.InverseLerp(25f, 45f, steepness);

                    // 高度规则
                    float grassWeight = 1f - Mathf.InverseLerp(0.5f, 0.7f, height);
                    float dirtWeight = Mathf.InverseLerp(0.0f, 0.15f, height) *
                                       (1f - Mathf.InverseLerp(0.3f, 0.5f, height));

                    // 岩石优先（坡度大的地方）
                    weights[2] = rockWeight;

                    // 剩余权重分配给草地和泥土
                    float remaining = 1f - rockWeight;
                    weights[0] = grassWeight * remaining;
                    weights[1] = dirtWeight * remaining;

                    // 高海拔：雪覆盖
                    if (layerCount >= 4 && height > 0.75f)
                    {
                        float snowWeight = Mathf.InverseLerp(0.75f, 0.9f, height);
                        weights[3] = snowWeight;
                        weights[0] *= (1f - snowWeight);
                    }
                }
                else
                {
                    // 只有两个 Layer
                    weights[0] = 1f - Mathf.InverseLerp(0.3f, 0.7f, height);
                    weights[1] = Mathf.InverseLerp(0.3f, 0.7f, height);
                }

                // 归一化权重（确保总和为 1）
                float total = 0f;
                for (int i = 0; i < layerCount; i++) total += weights[i];
                if (total > 0f)
                {
                    for (int i = 0; i < layerCount; i++) weights[i] /= total;
                }
                else
                {
                    weights[0] = 1f; // 默认第一层
                }

                // 写入 Splat Map
                for (int i = 0; i < layerCount; i++)
                {
                    splatMap[z, x, i] = weights[i];
                }
            }
        }

        data.SetAlphamaps(0, 0, splatMap);
        Debug.Log($"[TerrainGenerator] 纹理自动绘制完成: {terrain.name}");
    }

    /// <summary>
    /// 在地形上放置树木
    /// </summary>
    private void PlaceTrees(Terrain terrain)
    {
        if (treePrefabs == null || treePrefabs.Length == 0) return;

        TerrainData data = terrain.terrainData;

        // 首先将树木预制体注册到 TerrainData
        TreePrototype[] treePrototypes = new TreePrototype[treePrefabs.Length];
        for (int i = 0; i < treePrefabs.Length; i++)
        {
            treePrototypes[i] = new TreePrototype
            {
                prefab = treePrefabs[i]
            };
        }
        data.treePrototypes = treePrototypes;

        // 使用种子随机放置
        int chunkSeed = seed +
            Mathf.RoundToInt(terrain.transform.position.x) * 1000 +
            Mathf.RoundToInt(terrain.transform.position.z);
        System.Random rng = new System.Random(chunkSeed);

        System.Collections.Generic.List<TreeInstance> trees =
            new System.Collections.Generic.List<TreeInstance>();

        int resolution = 100; // 采样网格分辨率
        for (int z = 0; z < resolution; z++)
        {
            for (int x = 0; x < resolution; x++)
            {
                if (rng.NextDouble() > treeDensity) continue;

                float normalizedX = (float)x / resolution + (float)(rng.NextDouble() * 0.01);
                float normalizedZ = (float)z / resolution + (float)(rng.NextDouble() * 0.01);

                // 检查坡度（陡峭处不放树）
                float steepness = data.GetSteepness(normalizedX, normalizedZ);
                if (steepness > 30f) continue;

                // 检查高度（太高的地方不放树——雪线以上）
                float height = data.GetInterpolatedHeight(normalizedX, normalizedZ) / data.size.y;
                if (height > 0.75f) continue;
                if (height < 0.05f) continue; // 太低的地方（水面附近）也不放

                // 创建树实例
                TreeInstance tree = new TreeInstance
                {
                    position = new Vector3(normalizedX, 0, normalizedZ), // 归一化坐标
                    prototypeIndex = rng.Next(0, treePrefabs.Length),
                    widthScale = 0.8f + (float)(rng.NextDouble() * 0.4f),
                    heightScale = 0.8f + (float)(rng.NextDouble() * 0.4f),
                    rotation = (float)(rng.NextDouble() * Mathf.PI * 2f),
                    color = Color.white,
                    lightmapColor = Color.white
                };

                trees.Add(tree);
            }
        }

        data.SetTreeInstances(trees.ToArray(), true);
        Debug.Log($"[TerrainGenerator] 树木放置完成: {terrain.name}, 数量: {trees.Count}");
    }

    // ===== 运行时地形修改 =====

    /// <summary>
    /// 在运行时修改地形高度（例如：爆炸坑、建造平台）
    ///
    /// 注意：运行时修改 TerrainData 会影响所有引用它的 Terrain
    /// 如果需要独立修改，需要先 Instantiate TerrainData
    /// </summary>
    /// <param name="worldPosition">世界坐标</param>
    /// <param name="radius">影响半径（世界单位）</param>
    /// <param name="depth">深度（正值=向下凹，负值=向上凸）</param>
    public void DeformTerrain(Vector3 worldPosition, float radius, float depth)
    {
        // 找到对应的地形块
        Terrain terrain = GetTerrainAtWorldPosition(worldPosition);
        if (terrain == null) return;

        TerrainData data = terrain.terrainData;
        int res = data.heightmapResolution;

        // 世界坐标转换为高度图坐标
        Vector3 terrainPos = terrain.transform.position;
        float relX = (worldPosition.x - terrainPos.x) / data.size.x;
        float relZ = (worldPosition.z - terrainPos.z) / data.size.z;

        int centerX = Mathf.RoundToInt(relX * (res - 1));
        int centerZ = Mathf.RoundToInt(relZ * (res - 1));

        // 计算影响范围（高度图像素）
        float pixelRadius = radius / data.size.x * (res - 1);
        int radiusInt = Mathf.CeilToInt(pixelRadius);

        // 确保不超出边界
        int startX = Mathf.Max(0, centerX - radiusInt);
        int startZ = Mathf.Max(0, centerZ - radiusInt);
        int endX = Mathf.Min(res - 1, centerX + radiusInt);
        int endZ = Mathf.Min(res - 1, centerZ + radiusInt);

        int sizeX = endX - startX + 1;
        int sizeZ = endZ - startZ + 1;

        // 获取当前高度数据
        float[,] heights = data.GetHeights(startX, startZ, sizeX, sizeZ);

        // 修改高度
        float depthNormalized = depth / data.size.y;

        for (int z = 0; z < sizeZ; z++)
        {
            for (int x = 0; x < sizeX; x++)
            {
                float dx = (startX + x) - centerX;
                float dz = (startZ + z) - centerZ;
                float dist = Mathf.Sqrt(dx * dx + dz * dz);

                if (dist <= pixelRadius)
                {
                    // 使用平滑衰减（越靠近边缘影响越小）
                    float falloff = 1f - (dist / pixelRadius);
                    falloff = falloff * falloff; // 平方衰减，更自然

                    heights[z, x] -= depthNormalized * falloff;
                    heights[z, x] = Mathf.Clamp01(heights[z, x]);
                }
            }
        }

        // 应用修改
        data.SetHeights(startX, startZ, heights);

        Debug.Log($"[TerrainGenerator] 地形变形: 位置={worldPosition}, 半径={radius}, 深度={depth}");
    }

    /// <summary>
    /// 获取世界坐标所在的地形块
    /// </summary>
    public Terrain GetTerrainAtWorldPosition(Vector3 worldPos)
    {
        if (terrainGrid == null) return null;

        int gridX = Mathf.FloorToInt(worldPos.x / tileWidth);
        int gridZ = Mathf.FloorToInt(worldPos.z / tileLength);

        if (gridX >= 0 && gridX < gridSizeX && gridZ >= 0 && gridZ < gridSizeZ)
        {
            return terrainGrid[gridX, gridZ];
        }

        return null;
    }
}
```

[截图：通过代码生成的 2x2 地形网格——从高处俯瞰，显示自动纹理分配效果]

---

## 19.6 TerrainTextureManager.cs —— 纹理管理

```csharp
using UnityEngine;

/// <summary>
/// TerrainTextureManager.cs —— 地形纹理管理器
///
/// 管理地形图层的创建、配置和运行时切换
/// 提供高级纹理绘制功能
/// </summary>
public class TerrainTextureManager : MonoBehaviour
{
    [Header("地形引用")]
    [SerializeField] private Terrain terrain;

    [Header("纹理图层定义")]
    [SerializeField] private TerrainLayerConfig[] layerConfigs;

    /// <summary>
    /// 初始化地形纹理
    /// </summary>
    public void Initialize()
    {
        if (terrain == null)
        {
            terrain = GetComponent<Terrain>();
            if (terrain == null)
            {
                Debug.LogError("[TerrainTextureManager] 未找到 Terrain 组件");
                return;
            }
        }

        // 创建 TerrainLayer 资产
        CreateTerrainLayers();
    }

    /// <summary>
    /// 根据配置创建 Terrain Layer
    /// </summary>
    private void CreateTerrainLayers()
    {
        if (layerConfigs == null || layerConfigs.Length == 0) return;

        TerrainLayer[] layers = new TerrainLayer[layerConfigs.Length];

        for (int i = 0; i < layerConfigs.Length; i++)
        {
            var config = layerConfigs[i];

            TerrainLayer layer = new TerrainLayer();
            layer.diffuseTexture = config.diffuseTexture;
            layer.normalMapTexture = config.normalMap;
            layer.tileSize = config.tileSize;
            layer.tileOffset = config.tileOffset;
            layer.metallic = config.metallic;
            layer.smoothness = config.smoothness;

            layers[i] = layer;
        }

        terrain.terrainData.terrainLayers = layers;
        Debug.Log($"[TerrainTextureManager] 创建了 {layers.Length} 个地形图层");
    }

    /// <summary>
    /// 在指定世界位置绘制纹理
    /// 运行时使用——比如踩过的地方变成泥土
    /// </summary>
    /// <param name="worldPosition">世界坐标</param>
    /// <param name="layerIndex">要绘制的图层索引</param>
    /// <param name="radius">绘制半径（世界单位）</param>
    /// <param name="opacity">不透明度 [0, 1]</param>
    public void PaintAtPosition(Vector3 worldPosition, int layerIndex, float radius, float opacity)
    {
        TerrainData data = terrain.terrainData;
        int alphamapRes = data.alphamapResolution;
        int layerCount = data.terrainLayers.Length;

        if (layerIndex < 0 || layerIndex >= layerCount) return;

        // 世界坐标转 alphamap 坐标
        Vector3 terrainPos = terrain.transform.position;
        float relX = (worldPosition.x - terrainPos.x) / data.size.x;
        float relZ = (worldPosition.z - terrainPos.z) / data.size.z;

        int centerX = Mathf.RoundToInt(relX * alphamapRes);
        int centerZ = Mathf.RoundToInt(relZ * alphamapRes);

        float pixelRadius = radius / data.size.x * alphamapRes;
        int radiusInt = Mathf.CeilToInt(pixelRadius);

        // 计算区域
        int startX = Mathf.Max(0, centerX - radiusInt);
        int startZ = Mathf.Max(0, centerZ - radiusInt);
        int endX = Mathf.Min(alphamapRes - 1, centerX + radiusInt);
        int endZ = Mathf.Min(alphamapRes - 1, centerZ + radiusInt);

        int sizeX = endX - startX + 1;
        int sizeZ = endZ - startZ + 1;

        if (sizeX <= 0 || sizeZ <= 0) return;

        // 获取当前 alphamap 数据
        float[,,] alphamap = data.GetAlphamaps(startX, startZ, sizeX, sizeZ);

        // 修改
        for (int z = 0; z < sizeZ; z++)
        {
            for (int x = 0; x < sizeX; x++)
            {
                float dx = (startX + x) - centerX;
                float dz = (startZ + z) - centerZ;
                float dist = Mathf.Sqrt(dx * dx + dz * dz);

                if (dist <= pixelRadius)
                {
                    float falloff = 1f - (dist / pixelRadius);
                    falloff *= opacity;

                    // 增加目标层的权重
                    alphamap[z, x, layerIndex] += falloff;

                    // 归一化所有层权重
                    float total = 0f;
                    for (int i = 0; i < layerCount; i++) total += alphamap[z, x, i];

                    if (total > 0f)
                    {
                        for (int i = 0; i < layerCount; i++)
                        {
                            alphamap[z, x, i] /= total;
                        }
                    }
                }
            }
        }

        // 应用修改
        data.SetAlphamaps(startX, startZ, alphamap);
    }

    /// <summary>
    /// 获取指定世界坐标处的主要纹理层索引
    /// 可以用于判断角色脚下的地面类型（播放不同脚步声）
    ///
    /// 类比前端：类似 document.elementFromPoint() 获取某坐标下的元素
    /// </summary>
    public int GetDominantLayerAt(Vector3 worldPosition)
    {
        TerrainData data = terrain.terrainData;
        Vector3 terrainPos = terrain.transform.position;

        float relX = (worldPosition.x - terrainPos.x) / data.size.x;
        float relZ = (worldPosition.z - terrainPos.z) / data.size.z;

        int mapX = Mathf.RoundToInt(relX * data.alphamapResolution);
        int mapZ = Mathf.RoundToInt(relZ * data.alphamapResolution);

        mapX = Mathf.Clamp(mapX, 0, data.alphamapResolution - 1);
        mapZ = Mathf.Clamp(mapZ, 0, data.alphamapResolution - 1);

        float[,,] alphamap = data.GetAlphamaps(mapX, mapZ, 1, 1);

        int dominant = 0;
        float maxWeight = 0f;

        for (int i = 0; i < data.terrainLayers.Length; i++)
        {
            if (alphamap[0, 0, i] > maxWeight)
            {
                maxWeight = alphamap[0, 0, i];
                dominant = i;
            }
        }

        return dominant;
    }
}

/// <summary>
/// 地形图层配置
/// </summary>
[System.Serializable]
public class TerrainLayerConfig
{
    public string layerName = "Grass";

    [Header("纹理")]
    public Texture2D diffuseTexture;    // 漫反射贴图
    public Texture2D normalMap;          // 法线贴图（可选）

    [Header("平铺")]
    public Vector2 tileSize = new Vector2(15, 15);  // 纹理平铺大小
    public Vector2 tileOffset = Vector2.zero;        // 纹理偏移

    [Header("PBR 属性")]
    [Range(0, 1)] public float metallic = 0f;
    [Range(0, 1)] public float smoothness = 0.3f;

    [Header("分配规则")]
    [Range(0, 1)] public float minHeight = 0f;      // 最低高度比例
    [Range(0, 1)] public float maxHeight = 1f;       // 最高高度比例
    [Range(0, 90)] public float minSteepness = 0f;   // 最小坡度
    [Range(0, 90)] public float maxSteepness = 90f;  // 最大坡度
}
```

[截图：TerrainTextureManager 在 Inspector 中的配置——4 个图层的纹理和参数]

---

## 19.7 地形 LOD 与性能

### 19.7.1 Pixel Error 详解

```
Pixel Error（像素误差）是 Terrain LOD 最重要的参数：

原理：
- Unity 将地形网格分成多个 Patch（小块）
- 每个 Patch 有不同的 LOD 级别
- Pixel Error 决定 LOD 切换的灵敏度
- 值 = 允许的最大像素级别的误差

像素误差 = 1：
└── 非常精确，几乎不做 LOD 简化
└── 适合：截图、电影级画质
└── 性能：非常差（渲染大量三角形）

像素误差 = 5：
└── 平衡的 LOD
└── 适合：PC 游戏
└── 性能：良好

像素误差 = 8-10：
└── 积极的 LOD 简化
└── 适合：移动端游戏
└── 性能：很好

像素误差 = 20+：
└── 非常粗糙的 LOD
└── 远处地形明显有"台阶"感
└── 只在极低端设备上使用

[截图：不同 Pixel Error 值下的地形渲染对比（使用线框模式）]
```

### 19.7.2 SpeedTree 与树木渲染

```
SpeedTree 是 Unity 集成的专业树木制作工具：

特点：
├── 内置 LOD（近处高模、远处低模、极远处 Billboard）
├── 风力动画（树枝和树叶随风摇动）
├── 季节变化支持
└── 专门为游戏性能优化

在地形上使用 SpeedTree 的好处：
1. 自动批处理（Batching）渲染
2. 自动 LOD 切换
3. Billboard 渲染极远距离的树
4. 支持 GPU Instancing

性能建议（移动端）：
├── 可见树木总数: < 5000
├── 树木 LOD 距离: 100-200 米
├── Billboard 距离: 50-80 米
├── Draw Call 目标: < 100（树木部分）
└── 使用 GPU Instancing 减少 Draw Call

[截图：SpeedTree 的不同 LOD 级别——从高精度模型到 Billboard 的过渡]
```

### 19.7.3 草地和细节渲染

```
草地渲染是性能消耗大户，需要特别优化：

渲染方式：
├── Instanced（GPU Instancing）: 推荐！一次 Draw Call 渲染大量草
├── Vertex Lit: 旧版方式，不推荐
└── Grass Billboard: 始终面向摄像机的面片

关键设置：
├── Detail Object Distance: 渲染距离（移动端建议 50-80 米）
├── Detail Object Density: 密度（移动端建议 0.5-0.8）
├── Detail Resolution: 分辨率（移动端建议 256-512）
└── Draw Instanced: 必须开启！

优化策略：
1. 远距离的草用地形纹理颜色代替（看不出差别）
2. 控制草的面数（每根草 1-2 个面片即可）
3. 使用 LOD 草模型（近处 4 面片，远处 2 面片）
4. 风力动画用顶点着色器实现（不要用骨骼动画）

[截图：草地渲染的远近效果——近处有细节的草，远处仅用纹理]
```

---

## 19.8 地形孔洞 (Terrain Holes)

### 19.8.1 创建洞穴入口

```
Terrain Holes 允许在地形上创建"洞"，玩家可以穿过。

使用场景：
├── 洞穴入口
├── 地下通道入口
├── 矿洞入口
└── 地下城入口

创建步骤：
1. 选择 Paint Terrain → Paint Holes 工具
2. 用画笔在地形上绘制
3. 绘制区域的地形和碰撞都会被移除
4. 在下方放置洞穴场景的入口

[截图：在地形上创建的洞穴入口——可以看到下方的洞穴场景]

代码控制孔洞：
```

```csharp
/// <summary>
/// 运行时创建/移除地形孔洞
/// </summary>
public class TerrainHoleManager : MonoBehaviour
{
    [SerializeField] private Terrain terrain;

    /// <summary>
    /// 在指定位置创建地形孔洞
    /// </summary>
    /// <param name="worldPosition">世界坐标</param>
    /// <param name="radius">孔洞半径（世界单位）</param>
    public void CreateHole(Vector3 worldPosition, float radius)
    {
        TerrainData data = terrain.terrainData;
        int holeRes = data.holesResolution;

        // 世界坐标转孔洞图坐标
        Vector3 terrainPos = terrain.transform.position;
        float relX = (worldPosition.x - terrainPos.x) / data.size.x;
        float relZ = (worldPosition.z - terrainPos.z) / data.size.z;

        int centerX = Mathf.RoundToInt(relX * holeRes);
        int centerZ = Mathf.RoundToInt(relZ * holeRes);

        float pixelRadius = radius / data.size.x * holeRes;
        int radiusInt = Mathf.CeilToInt(pixelRadius);

        int startX = Mathf.Max(0, centerX - radiusInt);
        int startZ = Mathf.Max(0, centerZ - radiusInt);
        int endX = Mathf.Min(holeRes - 1, centerX + radiusInt);
        int endZ = Mathf.Min(holeRes - 1, centerZ + radiusInt);

        int sizeX = endX - startX + 1;
        int sizeZ = endZ - startZ + 1;

        if (sizeX <= 0 || sizeZ <= 0) return;

        // 获取当前孔洞数据
        bool[,] holes = data.GetHoles(startX, startZ, sizeX, sizeZ);

        for (int z = 0; z < sizeZ; z++)
        {
            for (int x = 0; x < sizeX; x++)
            {
                float dx = (startX + x) - centerX;
                float dz = (startZ + z) - centerZ;
                float dist = Mathf.Sqrt(dx * dx + dz * dz);

                if (dist <= pixelRadius)
                {
                    holes[z, x] = false; // false = 有孔洞
                }
            }
        }

        data.SetHoles(startX, startZ, holes);
        Debug.Log($"[TerrainHole] 创建孔洞: 位置={worldPosition}, 半径={radius}");
    }

    /// <summary>
    /// 填补指定位置的孔洞
    /// </summary>
    public void FillHole(Vector3 worldPosition, float radius)
    {
        // 与 CreateHole 类似，但设置 holes[z, x] = true（true = 实地面）
        TerrainData data = terrain.terrainData;
        int holeRes = data.holesResolution;

        Vector3 terrainPos = terrain.transform.position;
        float relX = (worldPosition.x - terrainPos.x) / data.size.x;
        float relZ = (worldPosition.z - terrainPos.z) / data.size.z;

        int centerX = Mathf.RoundToInt(relX * holeRes);
        int centerZ = Mathf.RoundToInt(relZ * holeRes);

        float pixelRadius = radius / data.size.x * holeRes;
        int radiusInt = Mathf.CeilToInt(pixelRadius);

        int startX = Mathf.Max(0, centerX - radiusInt);
        int startZ = Mathf.Max(0, centerZ - radiusInt);
        int endX = Mathf.Min(holeRes - 1, centerX + radiusInt);
        int endZ = Mathf.Min(holeRes - 1, centerZ + radiusInt);

        int sizeX = endX - startX + 1;
        int sizeZ = endZ - startZ + 1;

        if (sizeX <= 0 || sizeZ <= 0) return;

        bool[,] holes = data.GetHoles(startX, startZ, sizeX, sizeZ);

        for (int z = 0; z < sizeZ; z++)
        {
            for (int x = 0; x < sizeX; x++)
            {
                float dx = (startX + x) - centerX;
                float dz = (startZ + z) - centerZ;
                if (Mathf.Sqrt(dx * dx + dz * dz) <= pixelRadius)
                {
                    holes[z, x] = true;
                }
            }
        }

        data.SetHoles(startX, startZ, holes);
    }
}
```

---

## 19.9 自定义地形着色器（URP）

### 19.9.1 概览

```
Unity URP 的默认地形着色器已经很好用，但如果你需要：
- 自定义的混合效果（如更自然的纹理过渡）
- 特殊效果（如雪覆盖、湿度变化）
- 三平面映射（Triplanar Mapping）消除纹理拉伸
- 距离混合（远处纹理和近处纹理不同）

就需要自定义地形着色器。

URP 地形着色器的基本结构：
1. 地形使用 4 个纹理层为一组（因为 Splat Map 是 RGBA 4 通道）
2. 每增加 4 个层需要额外的 Splat Map Pass
3. 地形会根据 Splat Map 的权重混合各层纹理

简单的自定义示例（Shader Graph）：
- 创建 Shader Graph: Create → Shader Graph → URP → Lit Shader Graph
- 将 Splat Map 作为输入
- 采样 4 个纹理并根据 Splat Map 权重混合
- 添加自定义效果（如高度混合、细节法线等）

注意：完全自定义地形着色器较复杂
推荐先使用默认着色器 + 适当调参
只在确实需要特殊效果时才自定义

[截图：URP Shader Graph 中的简单地形着色器节点连接]
```

---

## 19.10 地形数据导入/导出

### 19.10.1 导入外部高度图

```csharp
using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif

/// <summary>
/// 地形数据导入/导出工具
/// </summary>
public class TerrainDataIO : MonoBehaviour
{
    [SerializeField] private Terrain terrain;

    /// <summary>
    /// 从 16 位灰度 RAW 文件导入高度图
    ///
    /// RAW 文件是最常见的高度图格式：
    /// - 可以从 World Machine、Gaia、L3DT 等工具导出
    /// - 也可以从真实世界的 DEM（数字高程模型）数据转换
    /// - 每个像素用 16 位（0-65535）表示高度
    /// </summary>
    public void ImportHeightmapFromRAW(string filePath)
    {
        if (terrain == null) return;

        TerrainData data = terrain.terrainData;
        int res = data.heightmapResolution;

        byte[] rawData = System.IO.File.ReadAllBytes(filePath);

        // 检查文件大小是否匹配
        int expectedSize = res * res * 2; // 16 位 = 2 字节
        if (rawData.Length != expectedSize)
        {
            Debug.LogError($"RAW 文件大小不匹配！期望: {expectedSize} 字节, 实际: {rawData.Length} 字节");
            Debug.LogError($"高度图分辨率 {res}x{res} 需要 {res * res} 个 16 位像素");
            return;
        }

        float[,] heights = new float[res, res];

        for (int z = 0; z < res; z++)
        {
            for (int x = 0; x < res; x++)
            {
                int index = (z * res + x) * 2;

                // 读取 16 位值（Little Endian）
                ushort rawHeight = (ushort)(rawData[index] | (rawData[index + 1] << 8));

                // 归一化到 [0, 1]
                heights[z, x] = rawHeight / 65535f;
            }
        }

        data.SetHeights(0, 0, heights);
        Debug.Log($"高度图导入成功: {filePath} ({res}x{res})");
    }

    /// <summary>
    /// 导出高度图为 RAW 文件
    /// </summary>
    public void ExportHeightmapToRAW(string filePath)
    {
        if (terrain == null) return;

        TerrainData data = terrain.terrainData;
        int res = data.heightmapResolution;

        float[,] heights = data.GetHeights(0, 0, res, res);
        byte[] rawData = new byte[res * res * 2];

        for (int z = 0; z < res; z++)
        {
            for (int x = 0; x < res; x++)
            {
                int index = (z * res + x) * 2;
                ushort rawHeight = (ushort)(heights[z, x] * 65535f);

                rawData[index] = (byte)(rawHeight & 0xFF);
                rawData[index + 1] = (byte)((rawHeight >> 8) & 0xFF);
            }
        }

        System.IO.File.WriteAllBytes(filePath, rawData);
        Debug.Log($"高度图导出成功: {filePath} ({res}x{res})");
    }

    /// <summary>
    /// 从 Texture2D（PNG/JPEG 灰度图）导入高度图
    /// 适合从 Photoshop 或在线工具获取的高度图
    /// </summary>
    public void ImportHeightmapFromTexture(Texture2D heightTexture)
    {
        if (terrain == null || heightTexture == null) return;

        TerrainData data = terrain.terrainData;
        int res = data.heightmapResolution;

        float[,] heights = new float[res, res];

        for (int z = 0; z < res; z++)
        {
            for (int x = 0; x < res; x++)
            {
                // 采样纹理（自动处理分辨率差异）
                float u = (float)x / (res - 1);
                float v = (float)z / (res - 1);

                Color pixel = heightTexture.GetPixelBilinear(u, v);

                // 使用灰度值作为高度
                heights[z, x] = pixel.grayscale;
            }
        }

        data.SetHeights(0, 0, heights);
        Debug.Log($"从纹理导入高度图成功: {heightTexture.name}");
    }
}
```

---

## 19.11 移动端地形性能优化清单

### 19.11.1 逐项检查

```
移动端地形性能优化清单：

地形设置：
☐ Heightmap Resolution ≤ 513
☐ Control Texture Resolution ≤ 512
☐ Detail Resolution ≤ 512
☐ Pixel Error ≥ 5（推荐 8）
☐ Base Map Distance ≤ 200
☐ Terrain Layer 数量 ≤ 8（最好 ≤ 4）

树木优化：
☐ Tree Distance ≤ 200
☐ Billboard Distance ≤ 100
☐ 可见树木总数 < 5000
☐ 使用 SpeedTree LOD
☐ 开启 Tree Billboard

草地/细节优化：
☐ Detail Distance ≤ 80
☐ Detail Density ≤ 0.8
☐ 开启 Draw Instanced（GPU Instancing）
☐ 每根草面数 ≤ 2
☐ 控制草地纹理分辨率（256x256 足够）

纹理优化：
☐ 地形纹理使用 ASTC 压缩格式
☐ 纹理大小不超过 1024x1024
☐ 使用 Mipmap
☐ 合理的 Tiling Size（避免纹理拉伸）

通用优化：
☐ 使用 Occlusion Culling
☐ 多块地形拼接时使用区块加载
☐ 远距离地形只显示大轮廓
☐ 不在地形上大量使用实时阴影

性能目标（中端手机）：
☐ 帧率 ≥ 30 FPS（目标 60）
☐ Draw Call < 200
☐ 三角形数 < 500K
☐ 内存占用 < 500MB（地形部分）
```

---

## 19.12 分步搭建指南

### 19.12.1 从零搭建一个完整的游戏地形

```
步骤总览（跟着做，约 2 小时）：

第 1 步：创建项目和地形（10 分钟）
  1. 新建 URP 项目
  2. GameObject → 3D Object → Terrain
  3. 在 Terrain Settings 中设置：
     - Width: 500, Length: 500, Height: 300
     - Heightmap Resolution: 513

[截图：新建地形后的初始状态]

第 2 步：雕刻地形（20 分钟）
  1. 用 Raise 工具画出山脉轮廓
  2. 用 Set Height 创建平原区域（高度 20-30）
  3. 用 Raise 在平原上画小丘陵
  4. 用 Lower 在山脉间画出河谷
  5. 用 Smooth 工具平滑所有过渡区域
  6. 用 Stamp 工具添加有趣的地形特征

[截图：雕刻完成的地形——有山脉、平原、河谷]

第 3 步：绘制纹理（20 分钟）
  1. 下载或准备纹理（草地、泥土、岩石、沙地）
  2. 创建 4 个 Terrain Layer
  3. 第一层（草地）自动铺满整个地形
  4. 在山顶和陡坡处绘制岩石纹理
  5. 在低洼和河岸处绘制泥土/沙地纹理
  6. 用小画笔添加纹理细节

[截图：纹理绘制完成——山顶岩石、坡面草地、河谷泥土]

第 4 步：放置树木（15 分钟）
  1. 从 Asset Store 导入免费树木资源
  2. 添加 2-3 种树木到 Terrain
  3. 用大画笔在平原和低山坡上大面积绘制
  4. 调整密度和大小变化
  5. 高海拔和陡坡处不放树（擦除）

[截图：放置树木后的效果——森林覆盖的山坡]

第 5 步：绘制草地（15 分钟）
  1. 添加 1-2 种草纹理
  2. 在平坦区域大面积绘制
  3. 调整颜色变化（健康色/干枯色）
  4. 确认开启了 GPU Instancing

[截图：草地绘制完成——近景的草地细节]

第 6 步：光照和环境（15 分钟）
  1. 调整 Directional Light 角度和颜色（模拟太阳）
  2. 配置 Skybox
  3. 添加 Post Processing（Bloom、Color Grading）
  4. 配置 Fog（远处的雾效增加空间感）

[截图：完成光照配置后的最终效果——日落时分的山谷]

第 7 步：性能检查（15 分钟）
  1. 打开 Stats 窗口查看 Draw Call 和三角形数
  2. 用 Profiler 检查 CPU 和 GPU 时间
  3. 根据需要调整 LOD 参数
  4. 确保满足移动端性能预算

[截图：Profiler 窗口显示的地形渲染性能数据]
```

---

## 练习题

### 练习 1：地形绘制实操（难度：中等）

按照 19.12 的分步指南创建一个游戏地形：
1. 创建一个 500x500 米的地形
2. 雕刻出至少一座山、一片平原、一条河谷
3. 使用至少 3 种纹理图层
4. 放置至少 2 种树木
5. 添加草地细节
6. 截图记录 Stats 面板的性能数据

### 练习 2：程序化地形纹理（难度：较高）

扩展 TerrainGenerator.cs：
1. 基于坡度自动分配岩石/草地纹理
2. 基于高度自动分配草地/泥土/雪纹理
3. 在朝北的山坡上增加雪的覆盖（根据法线方向判断）
4. 添加噪声扰动使纹理边界更自然（避免明显的高度分界线）

### 练习 3：动态地形修改（难度：较高）

实现一个简单的地形编辑器：
1. 鼠标点击地形时提升该区域的高度
2. 按住 Shift 点击时降低高度
3. 按住 Ctrl 点击时平滑该区域
4. 可以选择不同大小的画笔
5. 支持 Undo（记录修改历史）

---

## 下一章预告

**第 20 章：昼夜循环与天气系统**

有了壮观的地形，下一步是让世界"活"起来：
- 实时昼夜循环系统（太阳/月亮运动、天空颜色变化）
- 动态光照变化（日出、正午、日落、夜晚）
- 天气系统（晴天、阴天、下雨、下雪、雾天）
- 粒子特效（雨滴、雪花、雾气）
- 天气对游戏玩法的影响
- 环境音效随时间和天气变化

让你的开放世界有生命的律动！
