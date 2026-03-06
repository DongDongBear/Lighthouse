# 第23章：移动端性能优化

## 本章目标

通过本章学习，你将掌握：

1. **Unity Profiler 使用** —— CPU、GPU、内存的分析方法
2. **Frame Debugger** —— 逐步分析每帧的绘制调用
3. **批处理优化** —— 静态批处理、动态批处理、GPU Instancing、SRP Batcher
4. **纹理优化** —— ASTC 压缩格式、纹理图集、Mipmap
5. **网格优化** —— LOD Groups、多边形精简
6. **Shader 优化** —— 移动端友好的着色器编写
7. **内存管理** —— 资源卸载、Addressables、避免 GC
8. **对象池** —— 减少运行时内存分配
9. **UI 优化** —— Canvas 拆分、Raycast Target 控制
10. **物理优化** —— 简化碰撞体、物理层设置
11. **遮挡剔除** —— Occlusion Culling 配置
12. **移动端特有优化** —— 发热控制、电池优化、帧率管理、包体大小

## 预计学习时间

**5-6小时**

---

## 前端类比：帮助你理解

性能优化是前端和游戏开发共通的核心课题：

| 前端性能优化 | Unity 移动端优化 |
|------------|----------------|
| Chrome DevTools Performance | Unity Profiler |
| Network 面板分析请求 | Frame Debugger 分析 Draw Call |
| 图片懒加载 | LOD（远距离用低精度模型） |
| 图片压缩（WebP） | 纹理压缩（ASTC） |
| CSS Sprites 雪碧图 | 纹理图集（Texture Atlas） |
| Code Splitting / Tree Shaking | Addressables / 按需加载 |
| 虚拟列表（React Virtualized） | 遮挡剔除（Occlusion Culling） |
| `useMemo` / `React.memo` | 对象池 / 缓存结果 |
| 避免不必要的 re-render | 减少不必要的 Draw Call |
| `requestAnimationFrame` 节流 | 降低物理/AI更新频率 |
| 减少 DOM 操作 | 减少 GC（垃圾回收）压力 |
| Bundle Size 优化 | APK/IPA 包体大小优化 |

---

## 23.1 Unity Profiler —— 性能分析工具

### 23.1.1 打开 Profiler

Unity Profiler 是内置的性能分析工具，类似前端中的 Chrome DevTools Performance 面板。

打开方式：`Window -> Analysis -> Profiler`（快捷键 Ctrl+7）

### 23.1.2 关键模块解读

Profiler 包含多个分析模块：

**CPU Usage（CPU 使用率）**
- 显示每帧各个系统的 CPU 耗时
- 关注的关键区域：
  - **Scripts** —— 你的 C# 代码耗时
  - **Physics** —— 物理计算耗时
  - **Rendering** —— 渲染相关 CPU 工作
  - **UI** —— UI 系统耗时
  - **Animation** —— 动画系统耗时

[截图：CPU Profiler 面板，展示各系统的耗时分布]

**GPU Usage（GPU 使用率）**
- 显示 GPU 渲染每帧的耗时
- 关注 Draw Call 数量和渲染时间

**Memory（内存）**
- 显示各类资源的内存占用
- 关注纹理（Textures）、网格（Meshes）、音频（Audio）的内存大小

[截图：Memory Profiler 面板，展示各类资源的内存占用]

### 23.1.3 关键性能指标

| 指标 | 移动端目标值 | 说明 |
|-----|------------|------|
| FPS | 30-60 fps | 一般手游目标30fps，竞技类60fps |
| Draw Calls | < 100-200 | 每帧的绘制调用数 |
| 三角形数 | < 100K-300K | 每帧渲染的三角形总数 |
| 纹理内存 | < 100-200MB | 纹理占用的 GPU 内存 |
| 总内存 | < 400-600MB | 应用总内存占用 |
| GC Alloc | 0 KB/帧 | 每帧的垃圾回收分配（理想为0） |

### 23.1.4 在真机上 Profile

**重要**：在编辑器中分析性能是不准确的，必须在真机上分析。

连接真机的步骤：
1. 在 Build Settings 中勾选 "Development Build" 和 "Autoconnect Profiler"
2. 构建并安装到手机
3. USB 连接手机
4. 在 Profiler 中选择设备（下拉菜单选择连接的设备）
5. 点击 Record 开始记录

[截图：Profiler 连接真机设备的下拉菜单]

---

## 23.2 Frame Debugger —— 绘制调用分析

### 23.2.1 什么是 Draw Call？

**Draw Call** 是 CPU 告诉 GPU "画这个东西" 的一次命令。每次调用 GPU 绘制一个网格，就是一次 Draw Call。

用前端类比：Draw Call 就像 DOM 重排（reflow）。每次重排都有性能代价，所以我们要减少次数。

**为什么 Draw Call 多会慢？**
- 每次 Draw Call，CPU 需要准备数据并发送给 GPU
- CPU 和 GPU 之间的通信是瓶颈（类似前端中主线程和渲染线程的通信）
- 目标：用**更少的 Draw Call** 绘制**同样的内容**

### 23.2.2 使用 Frame Debugger

打开方式：`Window -> Analysis -> Frame Debugger`

Frame Debugger 可以逐步回放每帧的每一次绘制操作，让你看到：
- 这次 Draw Call 画了什么
- 用了什么材质和 Shader
- 为什么没有被批处理

[截图：Frame Debugger 面板，逐步展示绘制过程]

---

## 23.3 批处理优化 —— 减少 Draw Call

### 23.3.1 四种批处理方式对比

| 批处理方式 | 适用场景 | 限制 |
|----------|---------|------|
| **Static Batching** | 不会移动的物体（建筑、树木等） | 增加内存，需标记为 Static |
| **Dynamic Batching** | 小型动态物体（< 300顶点） | 顶点数限制严格 |
| **GPU Instancing** | 大量相同网格+材质的物体（草地、石头） | 需要相同 Mesh+Material |
| **SRP Batcher** | 使用 SRP 时大部分物体 | 需要兼容的 Shader |

### 23.3.2 静态批处理

将不会移动的物体标记为 Static：

1. 选择建筑、地形装饰等静态物体
2. Inspector 右上角勾选 "Static"
3. 或只勾选 "Batching Static"（最小静态标记）

**注意**：静态批处理会将所有标记的网格合并成一个大网格，会增加内存。在移动端需要权衡。

### 23.3.3 GPU Instancing

GPU Instancing 特别适合开放世界游戏中的大量重复物体（草、花、石头、树等）：

```csharp
/// <summary>
/// 在材质上启用 GPU Instancing 的方法：
/// 1. 选择材质
/// 2. Inspector 底部勾选 "Enable GPU Instancing"
///
/// 代码方式（运行时）：
/// </summary>
public class GPUInstancingSetup : MonoBehaviour
{
    [SerializeField] private Material instancedMaterial;

    private void Start()
    {
        // 确保材质启用了 GPU Instancing
        if (instancedMaterial != null)
        {
            instancedMaterial.enableInstancing = true;
        }
    }
}
```

### 23.3.4 SRP Batcher

如果使用 URP（Universal Render Pipeline），SRP Batcher 是最强大的批处理方式：

1. 确保使用 URP 项目
2. 在 URP Asset 中启用 SRP Batcher
3. 使用兼容 SRP Batcher 的 Shader（URP 内置 Shader 都兼容）

[截图：URP Asset 中的 SRP Batcher 开关]

---

## 23.4 纹理优化

### 23.4.1 纹理压缩格式

纹理是游戏中**最大的内存消耗者**。移动端必须使用压缩格式。

| 格式 | 平台 | 压缩比 | 质量 |
|------|------|--------|------|
| **ASTC** | iOS + Android（推荐） | 高 | 好 |
| **ETC2** | Android | 中 | 中 |
| **PVRTC** | iOS（旧） | 高 | 中 |

**推荐**：现代移动设备统一使用 **ASTC** 格式。

### 23.4.2 纹理设置最佳实践

在 Unity 中选择纹理资源，设置以下参数：

```
Max Size: 1024（大多数纹理不需要超过 1024x1024）
  - 角色主贴图：1024 或 2048
  - 地形贴图：512 或 1024
  - UI 图标：256 或 512
  - 特效贴图：256

Compression: High Quality（使用平台默认压缩）

Generate Mip Maps: Yes（3D物体纹理开启，UI纹理关闭）

Read/Write Enabled: No（除非需要运行时修改纹理，否则关闭）
```

[截图：纹理 Import Settings 面板的最佳配置]

### 23.4.3 纹理图集

**Texture Atlas（纹理图集）** 将多张小纹理合并成一张大纹理，减少材质切换和 Draw Call。

这就像前端中的 **CSS Sprites（雪碧图）** —— 将多张小图标合并成一张大图，通过坐标定位。

Unity 中的 Sprite Atlas 设置：
1. Create -> 2D -> Sprite Atlas
2. 将相关的 Sprite 拖入
3. 设置 Max Texture Size 和压缩格式

```csharp
/// <summary>
/// 运行时从图集加载 Sprite
/// 类似前端中从 sprite sheet 获取特定区域的图片
/// </summary>
using UnityEngine;
using UnityEngine.U2D;

public class AtlasLoader : MonoBehaviour
{
    [SerializeField] private SpriteAtlas uiAtlas;

    public Sprite GetSprite(string spriteName)
    {
        return uiAtlas.GetSprite(spriteName);
    }
}
```

---

## 23.5 网格优化 —— LOD系统

### 23.5.1 LOD（Level of Detail）原理

LOD 的核心思想：**远处的物体不需要和近处一样精细**。

- 玩家近距离看一棵树：使用高精度模型（5000三角形）
- 中等距离：使用中等精度模型（1000三角形）
- 远距离：使用低精度模型（200三角形）或 Billboard（面片）
- 超远距离：完全不显示（剔除）

这和前端中的**响应式图片**概念类似：
```html
<!-- 前端的响应式图片 -->
<img srcset="hero-320w.jpg 320w, hero-640w.jpg 640w, hero-1280w.jpg 1280w"
     sizes="(max-width: 600px) 320px, (max-width: 900px) 640px, 1280px" />
```

### 23.5.2 在 Unity 中设置 LOD Group

1. 选择需要 LOD 的物体
2. Add Component -> LOD Group
3. 设置各级别的过渡距离和对应的网格

```
LOD 0 (0-30%): 高精度模型
LOD 1 (30-60%): 中精度模型
LOD 2 (60-90%): 低精度模型
Culled (90-100%): 不渲染
```

[截图：LOD Group 组件的 Inspector 配置]

### 23.5.3 多边形精简建议

| 物体类型 | 建议三角形数（移动端） |
|---------|---------------------|
| 主角 | 5000 - 15000 |
| NPC | 3000 - 8000 |
| 敌人 | 2000 - 5000 |
| 建筑 | 1000 - 5000 |
| 树木 | 500 - 2000 |
| 草地/花 | 50 - 200 |
| 石头 | 100 - 500 |

---

## 23.6 Shader 优化

### 23.6.1 移动端 Shader 原则

移动端 GPU 和桌面端有巨大差异。核心原则：

1. **避免复杂的数学运算** —— 手机 GPU 的 ALU（算术逻辑单元）性能远低于桌面
2. **减少纹理采样次数** —— 每次 `tex2D` 采样都有性能代价
3. **避免分支语句** —— `if/else` 在 GPU 上很昂贵
4. **使用半精度浮点数** —— `half` 代替 `float`
5. **避免透明度混合** —— 半透明物体需要特殊处理，开销大

### 23.6.2 移动端友好 Shader 示例

```csharp
/// <summary>
/// 简化的移动端 Shader 示例（URP Shader Graph 或手写 HLSL）
///
/// 原则：
/// - 使用 half 精度（节省 GPU 带宽）
/// - 减少纹理采样
/// - 不使用实时阴影接收（改用烘焙阴影）
/// - 简化光照计算
/// </summary>

// 以下是 Shader 的伪代码说明，实际应在 Shader 文件中编写

/*
Shader "Mobile/SimpleLit"
{
    Properties
    {
        _MainTex ("Main Texture", 2D) = "white" {}
        _Color ("Tint Color", Color) = (1,1,1,1)
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }

        Pass
        {
            // 使用 half 精度减少 GPU 带宽消耗
            // half = 16位浮点, float = 32位浮点
            // 在大多数移动端场景中 half 精度已经足够

            fixed4 frag (v2f i) : SV_Target
            {
                // 单次纹理采样（避免多次采样）
                half4 col = tex2D(_MainTex, i.uv) * _Color;

                // 简化的光照计算（仅使用主光源方向）
                half ndotl = max(0, dot(i.worldNormal, _MainLightDirection));
                col.rgb *= ndotl * _MainLightColor + _AmbientColor;

                return col;
            }
        }
    }

    // 极低端设备的 Fallback
    FallBack "Mobile/Diffuse"
}
*/
```

### 23.6.3 材质优化清单

- [ ] 所有材质使用 URP Lit 或 Simple Lit Shader
- [ ] 不需要法线贴图的物体使用 Simple Lit
- [ ] 避免使用 Standard Shader（它是为桌面端设计的）
- [ ] 检查是否有多余的材质（合并使用相同Shader的材质）
- [ ] 关闭不需要的材质特性（Emission、Detail Maps等）

---

## 23.7 内存管理

### 23.7.1 垃圾回收（GC）最小化

C# 是托管语言，有自动垃圾回收。但在游戏中，GC 会造成**卡顿**（Garbage Collection Spike）—— 类似前端中频繁操作 DOM 导致的 jank。

**核心原则：在 `Update()`（每帧执行的代码）中绝对不要分配内存。**

```csharp
using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 内存优化示例 —— 展示常见的内存分配陷阱和正确做法
///
/// 这些优化和前端中"避免在 render 函数中创建新对象"的原则是一样的：
/// React 中：不要在 render 中创建新对象/数组
/// Unity 中：不要在 Update 中创建新对象/数组
/// </summary>
public class MemoryOptimizationExamples : MonoBehaviour
{
    // ==================== 错误示例 ====================

    // 错误1：每帧创建新字符串（字符串拼接会分配内存）
    private void BadExample_StringConcat()
    {
        // 每帧执行会产生垃圾
        string info = "HP: " + 100 + " / " + 200;  // 分配了多个临时字符串
        Debug.Log(info);
    }

    // 错误2：每帧创建新数组
    private void BadExample_NewArray()
    {
        // 每帧 new 数组，产生垃圾
        Collider[] hits = Physics.OverlapSphere(transform.position, 10f);
    }

    // 错误3：每帧 GetComponent
    private void BadExample_GetComponent()
    {
        // GetComponent 虽然不分配堆内存，但每帧调用有 CPU 开销
        Rigidbody rb = GetComponent<Rigidbody>();
        rb.AddForce(Vector3.up);
    }

    // 错误4：LINQ 在热路径中使用
    private void BadExample_LINQ()
    {
        List<int> numbers = new List<int> { 1, 2, 3, 4, 5 };
        // LINQ 会创建迭代器和临时对象
        var even = numbers.Where(n => n % 2 == 0).ToList();
    }

    // 错误5：foreach 在某些集合上使用
    private void BadExample_Foreach()
    {
        Dictionary<string, int> dict = new Dictionary<string, int>();
        // 旧版 Unity 中 foreach 在 Dictionary 上会产生 GC
        // 新版 Unity 已修复，但建议关键路径仍用 for
        foreach (var kvp in dict) { }
    }

    // ==================== 正确示例 ====================

    // 正确1：使用 StringBuilder 缓存
    private System.Text.StringBuilder _sb = new System.Text.StringBuilder(256);
    private void GoodExample_StringBuilder()
    {
        _sb.Clear();
        _sb.Append("HP: ");
        _sb.Append(100);
        _sb.Append(" / ");
        _sb.Append(200);
        string result = _sb.ToString(); // 只分配一次
    }

    // 正确2：预分配数组，使用 NonAlloc 版本
    private Collider[] _hitBuffer = new Collider[32]; // 预分配
    private void GoodExample_NonAllocPhysics()
    {
        // NonAlloc 版本使用预分配的数组，不产生垃圾
        int hitCount = Physics.OverlapSphereNonAlloc(
            transform.position, 10f, _hitBuffer);

        for (int i = 0; i < hitCount; i++)
        {
            // 处理 _hitBuffer[i]
        }
    }

    // 正确3：缓存 Component 引用
    private Rigidbody _cachedRigidbody;
    private void Awake()
    {
        // 在 Awake/Start 中缓存，之后直接使用
        _cachedRigidbody = GetComponent<Rigidbody>();
    }
    private void GoodExample_CachedComponent()
    {
        _cachedRigidbody.AddForce(Vector3.up);
    }

    // 正确4：用 for 代替 LINQ
    private List<int> _tempList = new List<int>(); // 预分配
    private void GoodExample_NoLINQ()
    {
        List<int> numbers = new List<int> { 1, 2, 3, 4, 5 };
        _tempList.Clear();

        for (int i = 0; i < numbers.Count; i++)
        {
            if (numbers[i] % 2 == 0)
                _tempList.Add(numbers[i]);
        }
    }

    // 正确5：对象池代替频繁实例化
    // 见下一节详细实现
}
```

### 23.7.2 对象池模式

**对象池**是游戏开发中最重要的优化模式之一 —— 预先创建一批对象，使用时从池中取出，用完后归还，而不是每次 `new` 和销毁。

这和前端中的**虚拟列表（Virtual List）** 思想类似 —— DOM 元素被复用，只是数据变了。

```csharp
using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 通用对象池 —— 避免频繁的 Instantiate/Destroy
///
/// 使用场景：
/// - 子弹、粒子效果、伤害数字等频繁创建/销毁的对象
/// - 敌人生成/消亡
/// - UI 列表项
///
/// 类似前端的 DOM 元素复用：
/// - React Virtualized 的行复用
/// - IntersectionObserver 的懒加载回收
/// </summary>
public class ObjectPool : MonoBehaviour
{
    [Header("池配置")]
    [Tooltip("池中对象的预制体")]
    [SerializeField] private GameObject prefab;

    [Tooltip("初始池大小")]
    [SerializeField] private int initialSize = 20;

    [Tooltip("池最大容量（0=不限制）")]
    [SerializeField] private int maxSize = 100;

    [Tooltip("当池为空时是否自动扩展")]
    [SerializeField] private bool autoExpand = true;

    // 可用对象队列（使用 Queue 实现 FIFO）
    private Queue<GameObject> availablePool = new Queue<GameObject>();

    // 所有已创建的对象（包括正在使用的）
    private List<GameObject> allObjects = new List<GameObject>();

    // 对象池的父对象（用于组织 Hierarchy）
    private Transform poolParent;

    private void Awake()
    {
        // 创建一个父对象来组织池中的对象
        poolParent = new GameObject($"Pool_{prefab.name}").transform;
        poolParent.SetParent(transform);

        // 预热池 —— 提前创建对象
        // 类似前端中的预加载（preload）策略
        WarmUp(initialSize);
    }

    /// <summary>
    /// 预热对象池 —— 提前创建指定数量的对象
    /// </summary>
    public void WarmUp(int count)
    {
        for (int i = 0; i < count; i++)
        {
            CreateNewObject();
        }
    }

    /// <summary>
    /// 创建一个新的池对象
    /// </summary>
    private GameObject CreateNewObject()
    {
        GameObject obj = Instantiate(prefab, poolParent);
        obj.SetActive(false);

        // 添加 PooledObject 组件用于回收
        PooledObject pooled = obj.AddComponent<PooledObject>();
        pooled.SetPool(this);

        availablePool.Enqueue(obj);
        allObjects.Add(obj);

        return obj;
    }

    /// <summary>
    /// 从池中获取一个对象
    /// 类似前端中 connection pool 的 acquire
    /// </summary>
    public GameObject Get()
    {
        GameObject obj;

        if (availablePool.Count > 0)
        {
            obj = availablePool.Dequeue();
        }
        else if (autoExpand && (maxSize == 0 || allObjects.Count < maxSize))
        {
            // 池为空且允许扩展 —— 创建新对象
            obj = CreateNewObject();
            availablePool.Dequeue(); // 刚创建的对象在队列中，取出来
        }
        else
        {
            Debug.LogWarning($"[对象池] {prefab.name} 池已耗尽！");
            return null;
        }

        obj.SetActive(true);
        return obj;
    }

    /// <summary>
    /// 从池中获取对象并设置位置和旋转
    /// </summary>
    public GameObject Get(Vector3 position, Quaternion rotation)
    {
        GameObject obj = Get();
        if (obj != null)
        {
            obj.transform.position = position;
            obj.transform.rotation = rotation;
        }
        return obj;
    }

    /// <summary>
    /// 归还对象到池中
    /// 类似前端中 connection pool 的 release
    /// </summary>
    public void Return(GameObject obj)
    {
        if (obj == null) return;

        obj.SetActive(false);
        obj.transform.SetParent(poolParent);
        availablePool.Enqueue(obj);
    }

    /// <summary>
    /// 延迟归还（指定秒数后自动归还）
    /// 适用于有生命周期的效果（如爆炸特效播放完毕后归还）
    /// </summary>
    public void ReturnDelayed(GameObject obj, float delay)
    {
        StartCoroutine(ReturnDelayedCoroutine(obj, delay));
    }

    private System.Collections.IEnumerator ReturnDelayedCoroutine(GameObject obj, float delay)
    {
        yield return new WaitForSeconds(delay);
        Return(obj);
    }

    /// <summary>
    /// 回收所有正在使用的对象
    /// </summary>
    public void ReturnAll()
    {
        foreach (var obj in allObjects)
        {
            if (obj != null && obj.activeSelf)
            {
                Return(obj);
            }
        }
    }

    /// <summary>
    /// 获取池的统计信息
    /// </summary>
    public string GetStats()
    {
        return $"[{prefab.name}] 总计:{allObjects.Count} 可用:{availablePool.Count} " +
               $"使用中:{allObjects.Count - availablePool.Count}";
    }
}

/// <summary>
/// 池化对象标记 —— 挂载在池中每个对象上，便于回收
/// </summary>
public class PooledObject : MonoBehaviour
{
    private ObjectPool pool;

    public void SetPool(ObjectPool pool)
    {
        this.pool = pool;
    }

    /// <summary>
    /// 将自己归还到池中
    /// </summary>
    public void ReturnToPool()
    {
        pool?.Return(gameObject);
    }

    /// <summary>
    /// 延迟归还
    /// </summary>
    public void ReturnToPoolDelayed(float delay)
    {
        pool?.ReturnDelayed(gameObject, delay);
    }
}
```

### 23.7.3 资源卸载

```csharp
/// <summary>
/// 资源管理最佳实践
/// </summary>
public class ResourceManagement : MonoBehaviour
{
    /// <summary>
    /// 场景切换时卸载未使用的资源
    /// 类似前端中路由切换时清理不需要的模块
    /// </summary>
    public void OnSceneUnloaded()
    {
        // 卸载未引用的资源（纹理、网格、材质等）
        Resources.UnloadUnusedAssets();

        // 强制垃圾回收（仅在场景切换等非实时场景使用）
        System.GC.Collect();
    }

    /// <summary>
    /// 使用 Addressables 按需加载资源
    /// 类似前端的 dynamic import() —— 按需加载代码块
    /// </summary>
    /*
    使用 Addressables 系统：
    1. 安装 Addressables 包：Window -> Package Manager -> Addressables
    2. 将资源标记为 Addressable
    3. 按需加载：

    async void LoadWeaponModel(string address)
    {
        var handle = Addressables.LoadAssetAsync<GameObject>(address);
        await handle.Task;

        if (handle.Status == AsyncOperationStatus.Succeeded)
        {
            GameObject weapon = Instantiate(handle.Result);
        }
    }

    // 不再需要时释放
    void ReleaseWeapon(AsyncOperationHandle handle)
    {
        Addressables.Release(handle);
    }
    */
}
```

---

## 23.8 UI 优化

### 23.8.1 Canvas 拆分

Unity UI 的 Canvas 在其任何子元素变化时，会**重建整个 Canvas 的网格**。这就像前端中一个组件的 state 变化导致整棵树重新渲染。

**解决方案：将 UI 拆分到多个 Canvas**

```
Canvas (主画布 - 静态元素)
├── 背景图
├── 边框装饰
└── 静态标签

Canvas (HUD 画布 - 中频更新)
├── 生命值条
├── 经验值条
└── 小地图

Canvas (动态画布 - 高频更新)
├── 伤害数字
├── 状态提示
└── 帧率显示
```

### 23.8.2 Raycast Target 优化

默认情况下，每个 UI 元素（Image、Text）都会接收射线检测（点击检测）。大量不需要点击的 UI 元素会浪费 CPU。

```
优化规则：
- 纯装饰性的 Image：关闭 Raycast Target
- 不需要点击的 Text：关闭 Raycast Target
- 只有按钮和输入框等交互元素需要开启
```

[截图：在 Image 组件中取消勾选 Raycast Target]

---

## 23.9 物理优化

### 23.9.1 简化碰撞体

| 碰撞体类型 | 性能（从优到劣） |
|-----------|----------------|
| Sphere Collider | 最快 |
| Capsule Collider | 快 |
| Box Collider | 快 |
| Mesh Collider (Convex) | 中等 |
| Mesh Collider (Non-Convex) | 最慢 |

**规则：用最简单的碰撞体近似物体形状。**

一棵复杂的树模型：不要用 Mesh Collider，用一个 Capsule Collider（树干）+ 一个 Sphere Collider（树冠）即可。

### 23.9.2 物理层矩阵

通过物理层（Physics Layer）控制哪些物体之间需要碰撞检测：

`Edit -> Project Settings -> Physics -> Layer Collision Matrix`

```
示例配置：
- Player 层只与 Enemy、Terrain、Trigger 碰撞
- Enemy 层只与 Player、Terrain、Projectile 碰撞
- Decoration 层不与任何东西碰撞
```

这可以大幅减少物理引擎需要检查的碰撞对。

[截图：Physics Layer Collision Matrix 配置面板]

### 23.9.3 减少物理更新频率

```
Edit -> Project Settings -> Time:
Fixed Timestep: 0.02 (50Hz) -> 可以改为 0.04 (25Hz) 节省性能
```

对于不需要精确物理的游戏（如RPG），25Hz的物理更新频率通常足够。

---

## 23.10 遮挡剔除

### 23.10.1 Occlusion Culling

**遮挡剔除**确保被其他物体挡住的物体不会被渲染。

类似前端中的**虚拟列表** —— 不在视口中的 DOM 元素不会被创建。

设置步骤：
1. 将静态物体标记为 Occluder Static 和 Occludee Static
2. Window -> Rendering -> Occlusion Culling
3. 点击 Bake 烘焙遮挡数据

[截图：Occlusion Culling 烘焙面板]

---

## 23.11 完整的性能管理系统

### 23.11.1 PerformanceMonitor.cs —— 性能监控器

创建 `Scripts/Optimization/PerformanceMonitor.cs`：

```csharp
using UnityEngine;
using UnityEngine.Profiling;

/// <summary>
/// 性能监控器 —— 实时监控关键性能指标
///
/// 在开发阶段显示帧率、内存使用等关键信息
/// 类似前端中的性能监控面板（如 Web Vitals）
/// </summary>
public class PerformanceMonitor : MonoBehaviour
{
    public static PerformanceMonitor Instance { get; private set; }

    [Header("显示配置")]
    [Tooltip("是否显示性能面板")]
    [SerializeField] private bool showPanel = true;

    [Tooltip("更新间隔（秒）")]
    [SerializeField] private float updateInterval = 0.5f;

    [Header("帧率警告阈值")]
    [Tooltip("帧率低于此值时显示警告")]
    [SerializeField] private float fpsWarningThreshold = 25f;

    [Tooltip("帧率低于此值时显示严重警告")]
    [SerializeField] private float fpsCriticalThreshold = 15f;

    // 帧率计算
    private float deltaTime = 0f;
    private float fps = 0f;
    private float fpsMin = float.MaxValue;
    private float fpsMax = 0f;
    private float fpsAverage = 0f;
    private int frameCount = 0;
    private float fpsAccumulator = 0f;

    // 内存信息
    private long totalMemory = 0;
    private long usedMemory = 0;
    private long gcMemory = 0;
    private long textureMemory = 0;
    private long meshMemory = 0;

    // 更新计时器
    private float updateTimer = 0f;

    // 帧时间历史（用于计算平均值）
    private float[] frameTimeHistory = new float[60];
    private int frameTimeIndex = 0;

    // GC 追踪
    private int lastGCCount = 0;
    private int gcSpikeCount = 0;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    private void Update()
    {
        // 帧时间计算
        deltaTime += (Time.unscaledDeltaTime - deltaTime) * 0.1f;
        fps = 1.0f / Time.unscaledDeltaTime;

        // 记录帧时间历史
        frameTimeHistory[frameTimeIndex] = Time.unscaledDeltaTime;
        frameTimeIndex = (frameTimeIndex + 1) % frameTimeHistory.Length;

        // 帧率统计
        frameCount++;
        fpsAccumulator += fps;
        fpsMin = Mathf.Min(fpsMin, fps);
        fpsMax = Mathf.Max(fpsMax, fps);
        fpsAverage = fpsAccumulator / frameCount;

        // 检测 GC Spike
        int currentGCCount = System.GC.CollectionCount(0);
        if (currentGCCount > lastGCCount)
        {
            gcSpikeCount += (currentGCCount - lastGCCount);
            Debug.LogWarning($"[性能] 检测到 GC！累计 {gcSpikeCount} 次");
        }
        lastGCCount = currentGCCount;

        // 定期更新内存信息（获取内存信息本身有开销，不要每帧做）
        updateTimer += Time.unscaledDeltaTime;
        if (updateTimer >= updateInterval)
        {
            updateTimer = 0f;
            UpdateMemoryInfo();
        }
    }

    /// <summary>
    /// 更新内存信息
    /// </summary>
    private void UpdateMemoryInfo()
    {
        // 总分配内存
        totalMemory = Profiler.GetTotalAllocatedMemoryLong();

        // 已使用内存
        usedMemory = Profiler.GetTotalReservedMemoryLong();

        // GC 堆大小
        gcMemory = Profiler.GetMonoUsedSizeLong();

        // 纹理内存（近似值）
        // 注意：精确纹理内存需要遍历所有纹理资源
        textureMemory = Profiler.GetAllocatedMemoryForGraphicsDriver();
    }

    /// <summary>
    /// 获取帧时间的第95百分位数（P95）
    /// P95 比平均帧时间更能反映卡顿情况
    /// 类似前端性能监控中的 P95 响应时间
    /// </summary>
    public float GetP95FrameTime()
    {
        float[] sorted = new float[frameTimeHistory.Length];
        System.Array.Copy(frameTimeHistory, sorted, frameTimeHistory.Length);
        System.Array.Sort(sorted);

        int p95Index = Mathf.FloorToInt(sorted.Length * 0.95f);
        return sorted[p95Index];
    }

    /// <summary>
    /// 重置统计数据
    /// </summary>
    public void ResetStats()
    {
        fpsMin = float.MaxValue;
        fpsMax = 0f;
        fpsAverage = 0f;
        frameCount = 0;
        fpsAccumulator = 0f;
        gcSpikeCount = 0;
    }

    #if UNITY_EDITOR || DEVELOPMENT_BUILD
    private void OnGUI()
    {
        if (!showPanel) return;

        int w = Screen.width, h = Screen.height;
        int panelWidth = 350;
        int panelHeight = 260;

        // 背景
        GUI.Box(new Rect(w - panelWidth - 10, 10, panelWidth, panelHeight), "");

        // 样式
        GUIStyle style = new GUIStyle(GUI.skin.label);
        style.fontSize = h / 50;
        style.alignment = TextAnchor.UpperLeft;

        // FPS 颜色
        if (fps < fpsCriticalThreshold)
            style.normal.textColor = Color.red;
        else if (fps < fpsWarningThreshold)
            style.normal.textColor = Color.yellow;
        else
            style.normal.textColor = Color.green;

        float x = w - panelWidth - 5;
        float y = 15;
        float lineHeight = style.fontSize + 4;

        // FPS 信息
        GUI.Label(new Rect(x, y, panelWidth, lineHeight),
            $"FPS: {fps:F1}  (Min: {fpsMin:F1}  Max: {fpsMax:F1}  Avg: {fpsAverage:F1})",
            style);
        y += lineHeight;

        style.normal.textColor = Color.white;

        // 帧时间
        GUI.Label(new Rect(x, y, panelWidth, lineHeight),
            $"Frame Time: {deltaTime * 1000f:F2}ms  P95: {GetP95FrameTime() * 1000f:F2}ms",
            style);
        y += lineHeight;

        // 内存信息
        GUI.Label(new Rect(x, y, panelWidth, lineHeight),
            $"Total Memory: {totalMemory / 1048576f:F1} MB", style);
        y += lineHeight;

        GUI.Label(new Rect(x, y, panelWidth, lineHeight),
            $"Reserved: {usedMemory / 1048576f:F1} MB  GC Heap: {gcMemory / 1048576f:F1} MB",
            style);
        y += lineHeight;

        GUI.Label(new Rect(x, y, panelWidth, lineHeight),
            $"Graphics: {textureMemory / 1048576f:F1} MB", style);
        y += lineHeight;

        // GC 信息
        if (gcSpikeCount > 0)
            style.normal.textColor = Color.yellow;
        GUI.Label(new Rect(x, y, panelWidth, lineHeight),
            $"GC Spikes: {gcSpikeCount}  GC Count: {lastGCCount}", style);
        y += lineHeight;

        style.normal.textColor = Color.white;

        // Draw Calls（需要在 Editor 或 Development Build 中）
        #if UNITY_EDITOR
        GUI.Label(new Rect(x, y, panelWidth, lineHeight),
            $"Draw Calls: {UnityEditor.UnityStats.drawCalls}  " +
            $"Batches: {UnityEditor.UnityStats.batches}", style);
        y += lineHeight;

        GUI.Label(new Rect(x, y, panelWidth, lineHeight),
            $"Triangles: {UnityEditor.UnityStats.triangles / 1000}K  " +
            $"Vertices: {UnityEditor.UnityStats.vertices / 1000}K", style);
        y += lineHeight;
        #endif

        // 目标帧率
        GUI.Label(new Rect(x, y, panelWidth, lineHeight),
            $"Target FPS: {Application.targetFrameRate}  VSync: {QualitySettings.vSyncCount}",
            style);
    }
    #endif

    /// <summary>
    /// 切换面板显示
    /// </summary>
    public void TogglePanel()
    {
        showPanel = !showPanel;
    }
}
```

[截图：游戏运行时右上角的性能监控面板，显示FPS、内存等信息]

### 23.11.2 QualityManager.cs —— 画质管理器

创建 `Scripts/Optimization/QualityManager.cs`：

```csharp
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

/// <summary>
/// 画质管理器 —— 根据设备性能动态调整画质
///
/// 类似前端中根据网络速度和设备性能调整资源质量的策略：
/// - 低端设备：加载低分辨率图片，减少动画
/// - 高端设备：加载高清资源，开启所有特效
/// </summary>
public class QualityManager : MonoBehaviour
{
    public static QualityManager Instance { get; private set; }

    [Header("画质预设")]
    [Tooltip("当前画质等级")]
    [SerializeField] private QualityLevel currentQuality = QualityLevel.Medium;

    [Header("阴影配置")]
    [Tooltip("低画质阴影距离")]
    [SerializeField] private float lowShadowDistance = 20f;
    [Tooltip("中画质阴影距离")]
    [SerializeField] private float mediumShadowDistance = 50f;
    [Tooltip("高画质阴影距离")]
    [SerializeField] private float highShadowDistance = 100f;

    [Header("渲染配置")]
    [Tooltip("低画质渲染缩放")]
    [SerializeField] private float lowRenderScale = 0.6f;
    [Tooltip("中画质渲染缩放")]
    [SerializeField] private float mediumRenderScale = 0.8f;
    [Tooltip("高画质渲染缩放")]
    [SerializeField] private float highRenderScale = 1.0f;

    [Header("特效配置")]
    [Tooltip("低画质粒子数量倍率")]
    [SerializeField] private float lowParticleMultiplier = 0.3f;
    [Tooltip("中画质粒子数量倍率")]
    [SerializeField] private float mediumParticleMultiplier = 0.6f;
    [Tooltip("高画质粒子数量倍率")]
    [SerializeField] private float highParticleMultiplier = 1.0f;

    [Header("URP Asset 引用")]
    [SerializeField] private UniversalRenderPipelineAsset lowQualityAsset;
    [SerializeField] private UniversalRenderPipelineAsset mediumQualityAsset;
    [SerializeField] private UniversalRenderPipelineAsset highQualityAsset;

    // === 公共属性 ===
    public QualityLevel CurrentQuality => currentQuality;
    public float ParticleMultiplier { get; private set; } = 1f;
    public float LODBias { get; private set; } = 1f;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        // 从 PlayerPrefs 加载用户设置
        LoadQualitySettings();
    }

    private void Start()
    {
        // 如果没有保存过设置，自动检测设备性能
        if (!PlayerPrefs.HasKey("QualityLevel"))
        {
            AutoDetectQuality();
        }

        ApplyQualitySettings();
    }

    /// <summary>
    /// 自动检测设备性能并设置画质
    /// 根据设备内存、GPU 等信息判断
    /// </summary>
    public void AutoDetectQuality()
    {
        int systemMemory = SystemInfo.systemMemorySize; // MB
        int gpuMemory = SystemInfo.graphicsMemorySize;   // MB
        int processorCount = SystemInfo.processorCount;
        string gpuName = SystemInfo.graphicsDeviceName;

        Debug.Log($"[画质] 设备信息：RAM={systemMemory}MB GPU={gpuMemory}MB " +
                 $"CPU核心={processorCount} GPU={gpuName}");

        // 简单的分级逻辑
        if (systemMemory >= 6000 && gpuMemory >= 3000)
        {
            currentQuality = QualityLevel.High;
        }
        else if (systemMemory >= 3000 && gpuMemory >= 1500)
        {
            currentQuality = QualityLevel.Medium;
        }
        else
        {
            currentQuality = QualityLevel.Low;
        }

        Debug.Log($"[画质] 自动检测结果：{currentQuality}");
    }

    /// <summary>
    /// 设置画质等级
    /// </summary>
    public void SetQuality(QualityLevel level)
    {
        currentQuality = level;
        ApplyQualitySettings();
        SaveQualitySettings();
    }

    /// <summary>
    /// 应用画质设置
    /// </summary>
    private void ApplyQualitySettings()
    {
        switch (currentQuality)
        {
            case QualityLevel.Low:
                ApplyLowQuality();
                break;
            case QualityLevel.Medium:
                ApplyMediumQuality();
                break;
            case QualityLevel.High:
                ApplyHighQuality();
                break;
        }

        Debug.Log($"[画质] 已应用画质设置：{currentQuality}");
    }

    private void ApplyLowQuality()
    {
        // Unity 内置画质等级
        QualitySettings.SetQualityLevel(0);

        // 阴影
        QualitySettings.shadowDistance = lowShadowDistance;
        QualitySettings.shadows = ShadowQuality.HardOnly;
        QualitySettings.shadowResolution = ShadowResolution.Low;

        // 渲染
        if (lowQualityAsset != null)
        {
            GraphicsSettings.renderPipelineAsset = lowQualityAsset;
            lowQualityAsset.renderScale = lowRenderScale;
        }

        // LOD
        QualitySettings.lodBias = 0.5f;
        LODBias = 0.5f;

        // 粒子
        ParticleMultiplier = lowParticleMultiplier;

        // 关闭后处理效果
        // 抗锯齿
        QualitySettings.antiAliasing = 0;

        // 纹理质量
        QualitySettings.globalTextureMipmapLimit = 1; // 降一级 mipmap

        // 各向异性过滤
        QualitySettings.anisotropicFiltering = AnisotropicFiltering.Disable;
    }

    private void ApplyMediumQuality()
    {
        QualitySettings.SetQualityLevel(1);

        QualitySettings.shadowDistance = mediumShadowDistance;
        QualitySettings.shadows = ShadowQuality.All;
        QualitySettings.shadowResolution = ShadowResolution.Medium;

        if (mediumQualityAsset != null)
        {
            GraphicsSettings.renderPipelineAsset = mediumQualityAsset;
            mediumQualityAsset.renderScale = mediumRenderScale;
        }

        QualitySettings.lodBias = 1f;
        LODBias = 1f;

        ParticleMultiplier = mediumParticleMultiplier;

        QualitySettings.antiAliasing = 2;
        QualitySettings.globalTextureMipmapLimit = 0;
        QualitySettings.anisotropicFiltering = AnisotropicFiltering.Enable;
    }

    private void ApplyHighQuality()
    {
        QualitySettings.SetQualityLevel(2);

        QualitySettings.shadowDistance = highShadowDistance;
        QualitySettings.shadows = ShadowQuality.All;
        QualitySettings.shadowResolution = ShadowResolution.High;

        if (highQualityAsset != null)
        {
            GraphicsSettings.renderPipelineAsset = highQualityAsset;
            highQualityAsset.renderScale = highRenderScale;
        }

        QualitySettings.lodBias = 1.5f;
        LODBias = 1.5f;

        ParticleMultiplier = highParticleMultiplier;

        QualitySettings.antiAliasing = 4;
        QualitySettings.globalTextureMipmapLimit = 0;
        QualitySettings.anisotropicFiltering = AnisotropicFiltering.ForceEnable;
    }

    /// <summary>
    /// 保存画质设置到 PlayerPrefs
    /// </summary>
    private void SaveQualitySettings()
    {
        PlayerPrefs.SetInt("QualityLevel", (int)currentQuality);
        PlayerPrefs.Save();
    }

    /// <summary>
    /// 从 PlayerPrefs 加载画质设置
    /// </summary>
    private void LoadQualitySettings()
    {
        if (PlayerPrefs.HasKey("QualityLevel"))
        {
            currentQuality = (QualityLevel)PlayerPrefs.GetInt("QualityLevel");
        }
    }
}

/// <summary>
/// 画质等级枚举
/// </summary>
public enum QualityLevel
{
    Low,        // 低画质 —— 低端设备
    Medium,     // 中画质 —— 中端设备
    High        // 高画质 —— 高端设备
}
```

[截图：画质设置 UI 面板，展示低/中/高三个选项和各参数预览]

### 23.11.3 MobileOptimizer.cs —— 移动端专项优化

创建 `Scripts/Optimization/MobileOptimizer.cs`：

```csharp
using UnityEngine;
using System.Collections;

/// <summary>
/// 移动端专项优化器 —— 处理移动设备特有的性能问题
///
/// 包括：
/// - 目标帧率管理
/// - 发热控制（降频保护）
/// - 电池优化
/// - 包体大小建议
///
/// 类似前端中针对移动端的特殊优化：
/// - 移动端触摸事件优化（passive event listeners）
/// - PWA 的离线策略
/// - 移动端特有的 viewport 和渲染优化
/// </summary>
public class MobileOptimizer : MonoBehaviour
{
    public static MobileOptimizer Instance { get; private set; }

    [Header("帧率管理")]
    [Tooltip("默认目标帧率")]
    [SerializeField] private int defaultTargetFPS = 30;

    [Tooltip("高性能模式帧率（如战斗场景）")]
    [SerializeField] private int highPerformanceFPS = 60;

    [Tooltip("低功耗模式帧率（如菜单/暂停）")]
    [SerializeField] private int lowPowerFPS = 20;

    [Header("发热控制")]
    [Tooltip("是否启用自动发热控制")]
    [SerializeField] private bool enableThermalThrottling = true;

    [Tooltip("发热时降低的帧率")]
    [SerializeField] private int throttledFPS = 20;

    [Tooltip("帧率持续低于阈值超过此时间（秒）则认为过热")]
    [SerializeField] private float thermalCheckInterval = 30f;

    [Tooltip("恢复检查间隔（秒）")]
    [SerializeField] private float thermalRecoveryInterval = 60f;

    [Header("电池优化")]
    [Tooltip("低电量阈值（百分比）")]
    [SerializeField] private float lowBatteryThreshold = 0.2f;

    [Tooltip("低电量时是否自动降低画质")]
    [SerializeField] private bool autoLowBatteryMode = true;

    [Header("内存管理")]
    [Tooltip("内存警告阈值（MB）")]
    [SerializeField] private float memoryWarningThreshold = 400f;

    [Tooltip("内存清理间隔（秒）")]
    [SerializeField] private float memoryCleanupInterval = 120f;

    // 状态
    private bool isThermalThrottled = false;
    private bool isLowBatteryMode = false;
    private PerformanceMode currentMode = PerformanceMode.Normal;

    // 帧率统计（用于热量检测）
    private float[] recentFrameTimes = new float[120]; // 最近120帧
    private int frameIndex = 0;
    private float thermalCheckTimer = 0f;
    private float memoryCleanupTimer = 0f;

    // 屏幕常亮控制
    private bool keepScreenOn = true;

    private void Awake()
    {
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
        // 初始化目标帧率
        SetTargetFrameRate(defaultTargetFPS);

        // 禁用 VSync（移动端通常不需要，目标帧率由 targetFrameRate 控制）
        QualitySettings.vSyncCount = 0;

        // 屏幕常亮
        Screen.sleepTimeout = keepScreenOn ? SleepTimeout.NeverSleep : SleepTimeout.SystemSetting;

        // 移动端专用优化
        ApplyMobileDefaults();

        // 开始监控协程
        StartCoroutine(MonitorBattery());
        StartCoroutine(MonitorMemory());
    }

    private void Update()
    {
        // 记录帧时间
        recentFrameTimes[frameIndex] = Time.unscaledDeltaTime;
        frameIndex = (frameIndex + 1) % recentFrameTimes.Length;

        // 发热检测
        if (enableThermalThrottling)
        {
            thermalCheckTimer += Time.unscaledDeltaTime;
            if (thermalCheckTimer >= thermalCheckInterval)
            {
                thermalCheckTimer = 0f;
                CheckThermalState();
            }
        }

        // 定期内存清理
        memoryCleanupTimer += Time.unscaledDeltaTime;
        if (memoryCleanupTimer >= memoryCleanupInterval)
        {
            memoryCleanupTimer = 0f;
            PerformMemoryCleanup();
        }
    }

    /// <summary>
    /// 应用移动端默认优化
    /// </summary>
    private void ApplyMobileDefaults()
    {
        #if UNITY_IOS || UNITY_ANDROID
        // 降低物理更新频率
        Time.fixedDeltaTime = 0.04f; // 25Hz（默认50Hz）

        // 音频优化
        AudioSettings.SetDSPBufferSize(1024, 4);

        // 减少最大同时播放音频数
        // （需要在 Audio Settings 中配置）

        Debug.Log("[移动优化] 已应用移动端默认优化");
        #endif
    }

    // ==================== 帧率管理 ====================

    /// <summary>
    /// 设置目标帧率
    /// </summary>
    public void SetTargetFrameRate(int fps)
    {
        Application.targetFrameRate = fps;
        Debug.Log($"[移动优化] 目标帧率设置为：{fps}");
    }

    /// <summary>
    /// 切换性能模式
    /// </summary>
    public void SetPerformanceMode(PerformanceMode mode)
    {
        currentMode = mode;

        switch (mode)
        {
            case PerformanceMode.LowPower:
                SetTargetFrameRate(lowPowerFPS);
                break;
            case PerformanceMode.Normal:
                SetTargetFrameRate(defaultTargetFPS);
                break;
            case PerformanceMode.HighPerformance:
                SetTargetFrameRate(highPerformanceFPS);
                break;
        }
    }

    // ==================== 发热控制 ====================

    /// <summary>
    /// 检查发热状态
    ///
    /// 原理：如果帧率持续远低于目标帧率，说明设备可能过热导致 CPU/GPU 降频
    /// 此时主动降低目标帧率，减少设备负担
    /// </summary>
    private void CheckThermalState()
    {
        // 计算平均帧时间
        float avgFrameTime = 0f;
        for (int i = 0; i < recentFrameTimes.Length; i++)
        {
            avgFrameTime += recentFrameTimes[i];
        }
        avgFrameTime /= recentFrameTimes.Length;

        float actualFPS = 1f / avgFrameTime;
        float targetFPS = Application.targetFrameRate;

        // 如果实际帧率持续低于目标的 70%，判定为过热
        if (actualFPS < targetFPS * 0.7f && !isThermalThrottled)
        {
            Debug.LogWarning($"[移动优化] 检测到性能下降（实际 {actualFPS:F0}fps < 目标 {targetFPS}fps 的70%），" +
                           "启动发热保护");

            isThermalThrottled = true;
            SetTargetFrameRate(throttledFPS);

            // 降低画质
            QualityManager.Instance?.SetQuality(QualityLevel.Low);

            // 计划恢复检查
            StartCoroutine(ThermalRecoveryCheck());
        }

        // 使用 Unity 2022+ 的热状态 API（如果可用）
        #if UNITY_2022_1_OR_NEWER
        // 注意：此 API 并非所有平台都支持
        // var thermalStatus = SystemInfo.batteryStatus; // 需要对应平台API
        #endif
    }

    /// <summary>
    /// 发热恢复检查
    /// </summary>
    private IEnumerator ThermalRecoveryCheck()
    {
        yield return new WaitForSecondsRealtime(thermalRecoveryInterval);

        // 临时恢复正常帧率测试
        SetTargetFrameRate(defaultTargetFPS);

        yield return new WaitForSecondsRealtime(5f);

        // 检查是否能保持正常帧率
        float avgFrameTime = 0f;
        for (int i = 0; i < 30; i++)
        {
            avgFrameTime += recentFrameTimes[i];
        }
        avgFrameTime /= 30f;
        float actualFPS = 1f / avgFrameTime;

        if (actualFPS >= defaultTargetFPS * 0.8f)
        {
            // 恢复正常
            isThermalThrottled = false;
            Debug.Log("[移动优化] 发热保护解除，恢复正常性能");

            // 恢复画质
            QualityManager.Instance?.SetQuality(QualityLevel.Medium);
        }
        else
        {
            // 仍然过热，保持降频
            SetTargetFrameRate(throttledFPS);
            Debug.Log("[移动优化] 设备仍然过热，维持降频模式");

            // 继续检查
            StartCoroutine(ThermalRecoveryCheck());
        }
    }

    // ==================== 电池监控 ====================

    /// <summary>
    /// 监控电池状态
    /// </summary>
    private IEnumerator MonitorBattery()
    {
        while (true)
        {
            yield return new WaitForSecondsRealtime(60f); // 每分钟检查一次

            float batteryLevel = SystemInfo.batteryLevel; // 0-1
            BatteryStatus batteryStatus = SystemInfo.batteryStatus;

            if (batteryLevel >= 0 && batteryLevel <= lowBatteryThreshold &&
                batteryStatus == BatteryStatus.Discharging)
            {
                if (!isLowBatteryMode && autoLowBatteryMode)
                {
                    isLowBatteryMode = true;
                    OnLowBattery();
                }
            }
            else if (batteryLevel > lowBatteryThreshold + 0.05f ||
                     batteryStatus == BatteryStatus.Charging)
            {
                if (isLowBatteryMode)
                {
                    isLowBatteryMode = false;
                    OnBatteryRecovered();
                }
            }
        }
    }

    /// <summary>
    /// 低电量时的优化措施
    /// </summary>
    private void OnLowBattery()
    {
        Debug.LogWarning("[移动优化] 低电量模式激活");

        SetTargetFrameRate(lowPowerFPS);
        QualityManager.Instance?.SetQuality(QualityLevel.Low);

        // 可以通知 UI 显示低电量提示
    }

    /// <summary>
    /// 电量恢复
    /// </summary>
    private void OnBatteryRecovered()
    {
        Debug.Log("[移动优化] 电量恢复，退出低电量模式");

        SetPerformanceMode(PerformanceMode.Normal);
        QualityManager.Instance?.SetQuality(QualityLevel.Medium);
    }

    // ==================== 内存管理 ====================

    /// <summary>
    /// 监控内存使用
    /// </summary>
    private IEnumerator MonitorMemory()
    {
        while (true)
        {
            yield return new WaitForSecondsRealtime(30f);

            long usedMemory = UnityEngine.Profiling.Profiler.GetTotalAllocatedMemoryLong();
            float usedMemoryMB = usedMemory / (1024f * 1024f);

            if (usedMemoryMB > memoryWarningThreshold)
            {
                Debug.LogWarning($"[移动优化] 内存使用过高：{usedMemoryMB:F0}MB " +
                               $"(阈值：{memoryWarningThreshold}MB)");
                PerformMemoryCleanup();
            }
        }
    }

    /// <summary>
    /// 执行内存清理
    /// </summary>
    private void PerformMemoryCleanup()
    {
        Debug.Log("[移动优化] 执行内存清理...");

        // 卸载未使用的资源
        Resources.UnloadUnusedAssets();

        // 请求 GC（注意：这会造成短暂的卡顿）
        // 只在非关键时刻执行（如暂停菜单、加载画面）
        System.GC.Collect();

        long afterMemory = UnityEngine.Profiling.Profiler.GetTotalAllocatedMemoryLong();
        Debug.Log($"[移动优化] 内存清理完成，当前使用：{afterMemory / (1024f * 1024f):F0}MB");
    }

    /// <summary>
    /// 在安全时刻请求内存清理（如暂停菜单打开时）
    /// </summary>
    public void RequestSafeMemoryCleanup()
    {
        PerformMemoryCleanup();
    }

    // ==================== 屏幕管理 ====================

    /// <summary>
    /// 设置屏幕常亮
    /// </summary>
    public void SetKeepScreenOn(bool keepOn)
    {
        keepScreenOn = keepOn;
        Screen.sleepTimeout = keepOn ? SleepTimeout.NeverSleep : SleepTimeout.SystemSetting;
    }
}

/// <summary>
/// 性能模式枚举
/// </summary>
public enum PerformanceMode
{
    LowPower,           // 低功耗（菜单、暂停）
    Normal,             // 正常（探索、对话）
    HighPerformance     // 高性能（战斗、快速移动）
}
```

[截图：发热保护激活时的 UI 提示 —— "设备过热，已自动降低画质"]

---

## 23.12 包体大小优化

### 23.12.1 减小 APK/IPA 大小

| 优化手段 | 预期节省 |
|---------|---------|
| 纹理压缩（ASTC） | 50-70% 纹理大小 |
| 音频压缩（Vorbis/AAC） | 60-80% 音频大小 |
| 剥离引擎模块（Strip Engine Code） | 10-30MB |
| 代码剥离（IL2CPP + Strip） | 5-15MB |
| 使用 Addressables 分离资源 | 按需下载，首包减小 |
| 删除未使用的资源 | 变化大 |
| 合并和压缩 Mesh | 10-30% 网格大小 |

### 23.12.2 构建设置检查清单

```
Player Settings 检查：
- [ ] Scripting Backend: IL2CPP（比 Mono 小且快）
- [ ] Managed Stripping Level: High（剥离未使用的代码）
- [ ] Strip Engine Code: Yes
- [ ] Architecture: ARM64 only（不需要支持32位）

压缩设置：
- [ ] Build Compression: LZ4HC（构建时压缩）
- [ ] Texture Compression: ASTC
- [ ] Audio Compression: Vorbis (Quality: 70%)

资源检查：
- [ ] 删除 Assets 中未使用的资源
- [ ] 检查 Resources 文件夹（该文件夹中的所有资源都会被打包）
- [ ] 使用 Build Report 分析包体构成
```

[截图：Build Report 显示包体大小构成分析]

---

## 23.13 优化清单总览

### 23.13.1 移动端性能优化 Checklist

**渲染优化：**
- [ ] Draw Call < 200
- [ ] 三角形数 < 200K
- [ ] 启用 Static Batching
- [ ] 启用 GPU Instancing
- [ ] 配置 LOD Groups
- [ ] 设置 Occlusion Culling
- [ ] 使用 URP + SRP Batcher

**纹理优化：**
- [ ] 使用 ASTC 压缩
- [ ] 限制最大纹理大小（1024或以下）
- [ ] UI 纹理关闭 Mipmap
- [ ] 关闭不需要的 Read/Write
- [ ] 使用 Sprite Atlas

**Shader优化：**
- [ ] 使用 URP Lit / Simple Lit
- [ ] 避免复杂计算
- [ ] 使用半精度浮点（half）
- [ ] 减少透明物体

**内存优化：**
- [ ] Update 中零分配（0 GC Alloc）
- [ ] 使用对象池
- [ ] 缓存 Component 引用
- [ ] 使用 NonAlloc 物理查询
- [ ] 定期 UnloadUnusedAssets

**物理优化：**
- [ ] 使用简单碰撞体
- [ ] 配置 Layer Collision Matrix
- [ ] 降低 Fixed Timestep（0.04）

**UI 优化：**
- [ ] 拆分多个 Canvas
- [ ] 关闭不需要的 Raycast Target
- [ ] 避免过度使用 Layout Group

**移动端特有：**
- [ ] 设置目标帧率
- [ ] 实现发热控制
- [ ] 实现低电量模式
- [ ] 包体大小 < 200MB（首包）
- [ ] 使用 IL2CPP + ARM64

---

## 练习题

### 练习1：基础练习 —— 性能面板
创建一个可以在游戏中随时打开的性能统计面板：
- 实时显示 FPS（颜色根据高低变化：绿、黄、红）
- 显示内存使用量
- 显示当前画质等级
- 按 F1 键切换显示/隐藏

### 练习2：进阶练习 —— 对象池实战
为你的游戏实现完整的对象池系统：
- 创建一个 PoolManager 管理多个对象池
- 为子弹/粒子效果创建对象池
- 验证优化效果：对比使用/不使用对象池时的 GC Alloc

### 练习3：高级练习 —— 自适应画质
实现一个自适应画质系统：
- 每5秒采样平均帧率
- 如果低于目标的80%，自动降低一级画质
- 如果稳定超过目标的95%，自动升高一级画质
- 在帧率不稳定时保持当前画质
- 添加 UI 显示当前画质状态

### 练习4：挑战练习 —— 完整优化流程
对你的游戏项目进行完整的性能优化：
1. 使用 Profiler 在真机上记录 30 秒的性能数据
2. 分析 CPU、GPU、内存的瓶颈
3. 按照本章的清单逐项优化
4. 再次 Profile，对比优化前后的数据
5. 撰写一份优化报告，记录每项优化的效果

---

## 下一章预告

恭喜你完成了移动端性能优化的学习！这是游戏开发中至关重要的一环 —— 再好的游戏创意，如果运行不流畅，玩家也不会有好的体验。

在接下来的章节中，我们将学习：

- **存档系统** —— 将玩家的游戏进度（任务、装备、地图探索等）持久化保存
- **音效与音乐系统** —— 背景音乐切换、3D 空间音效、音效管理器
- **多语言本地化** —— 让你的游戏支持多种语言
- **应用内购买与广告** —— 移动游戏的变现策略
- **最终发布** —— 提交到 App Store 和 Google Play 的完整流程

性能优化的知识会贯穿所有后续章节 —— 每添加一个新系统，都要时刻关注它对性能的影响。希望你已经养成了"先 Profile，再优化"的好习惯！
