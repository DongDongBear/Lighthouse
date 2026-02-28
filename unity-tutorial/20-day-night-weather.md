# 第20章：昼夜循环与天气系统

## 本章目标

通过本章学习，你将掌握：

1. **时间系统设计** —— 游戏内时间与现实时间的映射关系，可配置的日长参数
2. **昼夜循环实现** —— 通过旋转方向光模拟太阳运动，太阳/月亮切换，天空盒混合
3. **环境光动态变化** —— 根据时间变化调整环境光颜色、强度和雾效
4. **天气状态机** —— 晴天、多云、雨天、暴风雨、雪天、雾天等天气状态管理
5. **粒子系统天气效果** —— 雨雪粒子系统、闪电效果、风场控制
6. **天气与游戏玩法的集成** —— 雨天地面湿滑、暴风雨降低可见度等
7. **天气音效系统** —— 雨声、雷声等环境音效

## 预计学习时间

**4-5小时**

---

## 前端类比：帮助你理解

如果你做过前端开发，可以这样理解本章的概念：

| 前端概念 | Unity 对应概念 |
|---------|---------------|
| `setInterval` 定时器 | `Time.deltaTime` 累加驱动时间流逝 |
| CSS `transition` / `animation` | `Mathf.Lerp` 平滑过渡（天空颜色、光照强度） |
| Redux 状态机 | 天气状态机（Clear -> Cloudy -> Rain） |
| CSS `filter: blur()` | 雾效 `RenderSettings.fogDensity` |
| React Context Provider | `TimeManager` 单例，全局提供当前时间 |
| Event Bus / EventEmitter | C# `event` / `Action` 事件广播天气变化 |

---

## 20.1 时间系统设计

### 20.1.1 游戏时间 vs 现实时间

在开放世界游戏中，时间系统是所有动态环境效果的基础。我们需要一个**游戏内时间**的概念，它和现实时间有一个倍率关系。

比如：
- 现实中1分钟 = 游戏中1小时（即倍率60x）
- 一个完整的游戏日（24小时）= 现实中24分钟

这就像前端中用 `requestAnimationFrame` 驱动动画一样，我们通过每帧累加 `Time.deltaTime` 来推进游戏时间。

### 20.1.2 TimeManager.cs —— 时间管理器

创建 `Scripts/Environment/TimeManager.cs`：

```csharp
using UnityEngine;
using System;

/// <summary>
/// 时间管理器 —— 管理游戏内时间的流逝
/// 类似前端的全局状态管理器（如 Redux Store），所有需要时间信息的系统都从这里读取
/// </summary>
public class TimeManager : MonoBehaviour
{
    // === 单例模式 ===
    // 类似前端的 Context Provider，全局只有一个实例
    public static TimeManager Instance { get; private set; }

    [Header("时间配置")]
    [Tooltip("游戏中一天对应现实多少分钟")]
    [SerializeField] private float dayLengthInMinutes = 24f;

    [Tooltip("游戏开始时的小时（0-24）")]
    [SerializeField] private float startHour = 8f;

    [Tooltip("时间流逝倍率，1.0 = 正常速度")]
    [SerializeField] private float timeScale = 1f;

    [Header("时间段定义")]
    [Tooltip("日出开始时间")]
    [SerializeField] private float sunriseStart = 5f;
    [Tooltip("日出结束时间")]
    [SerializeField] private float sunriseEnd = 7f;
    [Tooltip("日落开始时间")]
    [SerializeField] private float sunsetStart = 17f;
    [Tooltip("日落结束时间")]
    [SerializeField] private float sunsetEnd = 19f;

    // === 当前时间状态 ===
    // 当前游戏时间（0-24小时制，浮点数表示）
    private float currentTimeOfDay;

    // 当前是第几天
    private int currentDay = 1;

    // 时间是否暂停
    private bool isTimePaused = false;

    // === 事件系统 ===
    // 类似前端的 EventEmitter，当时间段变化时通知所有监听者
    public event Action<TimeOfDayPeriod> OnTimePeriodChanged;
    public event Action<int> OnNewDay;  // 新的一天开始时触发
    public event Action<float> OnHourChanged;  // 每个整点触发

    // 上一次的时间段，用于检测变化
    private TimeOfDayPeriod lastPeriod;
    private int lastHour = -1;

    // === 公共属性（只读） ===
    /// <summary>当前时间（0-24浮点数，如 14.5 表示下午2:30）</summary>
    public float CurrentTime => currentTimeOfDay;

    /// <summary>当前是第几天</summary>
    public int CurrentDay => currentDay;

    /// <summary>归一化的时间值（0-1，0=午夜，0.5=正午）</summary>
    public float NormalizedTime => currentTimeOfDay / 24f;

    /// <summary>当前时间段</summary>
    public TimeOfDayPeriod CurrentPeriod => GetCurrentPeriod();

    /// <summary>太阳是否在地平线以上</summary>
    public bool IsDaytime => currentTimeOfDay >= sunriseStart && currentTimeOfDay <= sunsetEnd;

    /// <summary>格式化的时间字符串，如 "14:30"</summary>
    public string FormattedTime
    {
        get
        {
            int hours = Mathf.FloorToInt(currentTimeOfDay);
            int minutes = Mathf.FloorToInt((currentTimeOfDay - hours) * 60f);
            return $"{hours:D2}:{minutes:D2}";
        }
    }

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

        // 设置初始时间
        currentTimeOfDay = startHour;
        lastPeriod = GetCurrentPeriod();
        lastHour = Mathf.FloorToInt(currentTimeOfDay);
    }

    private void Update()
    {
        if (isTimePaused) return;

        // 推进时间 —— 类似前端中 requestAnimationFrame 里的增量计算
        // 每现实秒推进的游戏小时数 = 24小时 / (日长分钟 * 60秒) * 时间倍率
        float hoursPerSecond = 24f / (dayLengthInMinutes * 60f) * timeScale;
        currentTimeOfDay += hoursPerSecond * Time.deltaTime;

        // 检查是否过了午夜 —— 新的一天
        if (currentTimeOfDay >= 24f)
        {
            currentTimeOfDay -= 24f;
            currentDay++;
            OnNewDay?.Invoke(currentDay);
            Debug.Log($"[时间系统] 新的一天！第 {currentDay} 天");
        }

        // 检查整点变化
        int currentHour = Mathf.FloorToInt(currentTimeOfDay);
        if (currentHour != lastHour)
        {
            lastHour = currentHour;
            OnHourChanged?.Invoke(currentTimeOfDay);
        }

        // 检查时间段变化
        TimeOfDayPeriod currentPeriodNow = GetCurrentPeriod();
        if (currentPeriodNow != lastPeriod)
        {
            lastPeriod = currentPeriodNow;
            OnTimePeriodChanged?.Invoke(currentPeriodNow);
            Debug.Log($"[时间系统] 时间段变化：{currentPeriodNow}");
        }
    }

    /// <summary>
    /// 获取当前时间段
    /// </summary>
    private TimeOfDayPeriod GetCurrentPeriod()
    {
        if (currentTimeOfDay >= sunriseStart && currentTimeOfDay < sunriseEnd)
            return TimeOfDayPeriod.Sunrise;
        else if (currentTimeOfDay >= sunriseEnd && currentTimeOfDay < 12f)
            return TimeOfDayPeriod.Morning;
        else if (currentTimeOfDay >= 12f && currentTimeOfDay < sunsetStart)
            return TimeOfDayPeriod.Afternoon;
        else if (currentTimeOfDay >= sunsetStart && currentTimeOfDay < sunsetEnd)
            return TimeOfDayPeriod.Sunset;
        else
            return TimeOfDayPeriod.Night;
    }

    // === 公共方法 ===

    /// <summary>暂停时间流逝</summary>
    public void PauseTime() => isTimePaused = true;

    /// <summary>恢复时间流逝</summary>
    public void ResumeTime() => isTimePaused = false;

    /// <summary>设置时间倍率</summary>
    public void SetTimeScale(float scale) => timeScale = Mathf.Max(0f, scale);

    /// <summary>直接设置时间（用于调试或剧情跳转）</summary>
    public void SetTime(float hour)
    {
        currentTimeOfDay = Mathf.Clamp(hour, 0f, 23.99f);
        lastPeriod = GetCurrentPeriod();
        lastHour = Mathf.FloorToInt(currentTimeOfDay);
    }

    /// <summary>
    /// 获取太阳角度（0-360度）
    /// 用于驱动方向光旋转 —— 0度=午夜（太阳在脚下），180度=正午（太阳在头顶）
    /// </summary>
    public float GetSunAngle()
    {
        return NormalizedTime * 360f;
    }

    /// <summary>
    /// 获取某个时间段的进度（0-1）
    /// 比如获取日出的进度：0=刚开始日出，1=日出结束
    /// </summary>
    public float GetPeriodProgress(TimeOfDayPeriod period)
    {
        switch (period)
        {
            case TimeOfDayPeriod.Sunrise:
                return Mathf.InverseLerp(sunriseStart, sunriseEnd, currentTimeOfDay);
            case TimeOfDayPeriod.Sunset:
                return Mathf.InverseLerp(sunsetStart, sunsetEnd, currentTimeOfDay);
            default:
                return 0f;
        }
    }
}

/// <summary>
/// 时间段枚举
/// </summary>
public enum TimeOfDayPeriod
{
    Night,      // 夜晚
    Sunrise,    // 日出
    Morning,    // 上午
    Afternoon,  // 下午
    Sunset      // 日落
}
```

[截图：TimeManager Inspector 面板，展示时间配置参数]

### 20.1.3 关键概念解释

**为什么用 `Time.deltaTime`？**

这就像前端中 `requestAnimationFrame` 的 `timestamp` 参数。每一帧的间隔时间不固定（可能是16ms，也可能是33ms），所以我们用 `deltaTime`（上一帧到这一帧的秒数）来确保时间推进是均匀的，不受帧率影响。

**为什么用事件系统而不是轮询？**

和前端一样的道理 —— 观察者模式优于轮询。其他系统订阅 `OnTimePeriodChanged` 事件，只在时间段真正变化时才收到通知，而不需要每帧去检查。

---

## 20.2 昼夜循环 —— 太阳与月亮

### 20.2.1 方向光旋转原理

Unity 中的 **Directional Light**（方向光）模拟太阳光。它的位置不重要，重要的是**旋转角度** —— 旋转角度决定了光照方向。

想象你拿着一个手电筒：
- 手电筒朝正下方照 = 正午（太阳在头顶）
- 手电筒朝水平方向照 = 日出/日落
- 手电筒朝上方照 = 太阳在地平线以下（夜晚）

### 20.2.2 天空盒混合

Unity 的天空盒（Skybox）决定了天空的外观。我们需要在不同时间段之间平滑过渡：
- 白天：蓝色天空
- 日落：橙红色天空
- 夜晚：深蓝色星空

这就像前端中用 CSS `transition` 在两个颜色之间过渡一样。

### 20.2.3 DayNightCycle.cs —— 昼夜循环控制器

创建 `Scripts/Environment/DayNightCycle.cs`：

```csharp
using UnityEngine;

/// <summary>
/// 昼夜循环控制器 —— 控制太阳/月亮旋转、天空盒混合、环境光变化
/// 类似前端中根据状态变化驱动 UI 样式更新
/// </summary>
[RequireComponent(typeof(Light))]
public class DayNightCycle : MonoBehaviour
{
    [Header("引用")]
    [Tooltip("太阳方向光（挂载此脚本的对象）")]
    private Light sunLight;

    [Tooltip("月亮方向光（单独的 Light 对象）")]
    [SerializeField] private Light moonLight;

    [Header("太阳配置")]
    [Tooltip("太阳光在正午时的颜色")]
    [SerializeField] private Color sunNoonColor = new Color(1f, 0.95f, 0.85f);

    [Tooltip("太阳光在日出/日落时的颜色")]
    [SerializeField] private Color sunHorizonColor = new Color(1f, 0.5f, 0.2f);

    [Tooltip("太阳光最大强度（正午）")]
    [SerializeField] private float sunMaxIntensity = 1.2f;

    [Tooltip("太阳光最小强度（接近地平线）")]
    [SerializeField] private float sunMinIntensity = 0.1f;

    [Header("月亮配置")]
    [Tooltip("月光颜色")]
    [SerializeField] private Color moonColor = new Color(0.6f, 0.7f, 0.9f);

    [Tooltip("月光强度")]
    [SerializeField] private float moonIntensity = 0.3f;

    [Header("天空盒配置")]
    [Tooltip("白天天空盒材质")]
    [SerializeField] private Material daySkybox;

    [Tooltip("夜晚天空盒材质")]
    [SerializeField] private Material nightSkybox;

    [Tooltip("天空盒混合材质（使用自定义Shader支持两个天空盒混合）")]
    [SerializeField] private Material blendSkybox;

    [Header("环境光配置")]
    [Tooltip("白天环境光颜色")]
    [SerializeField] private Color dayAmbientColor = new Color(0.8f, 0.85f, 0.9f);

    [Tooltip("日落环境光颜色")]
    [SerializeField] private Color sunsetAmbientColor = new Color(0.9f, 0.6f, 0.4f);

    [Tooltip("夜晚环境光颜色")]
    [SerializeField] private Color nightAmbientColor = new Color(0.1f, 0.1f, 0.2f);

    [Header("雾效配置")]
    [Tooltip("白天雾效颜色")]
    [SerializeField] private Color dayFogColor = new Color(0.75f, 0.82f, 0.9f);

    [Tooltip("日落雾效颜色")]
    [SerializeField] private Color sunsetFogColor = new Color(0.9f, 0.55f, 0.35f);

    [Tooltip("夜晚雾效颜色")]
    [SerializeField] private Color nightFogColor = new Color(0.05f, 0.05f, 0.1f);

    [Header("星星")]
    [Tooltip("星星粒子系统")]
    [SerializeField] private ParticleSystem starsParticleSystem;

    [Tooltip("星星开始出现的时间（日落时分）")]
    [SerializeField] private float starsAppearTime = 18f;

    [Tooltip("星星完全消失的时间（日出时分）")]
    [SerializeField] private float starsDisappearTime = 6f;

    // 太阳旋转轴 —— 决定太阳东升西落的方向
    private Vector3 sunRotationAxis = Vector3.right;

    // 缓存的粒子系统参数
    private ParticleSystem.MainModule starsMain;
    private ParticleSystem.EmissionModule starsEmission;

    private void Awake()
    {
        sunLight = GetComponent<Light>();

        // 初始化星星粒子系统缓存
        if (starsParticleSystem != null)
        {
            starsMain = starsParticleSystem.main;
            starsEmission = starsParticleSystem.emission;
        }
    }

    private void Update()
    {
        if (TimeManager.Instance == null) return;

        float timeOfDay = TimeManager.Instance.CurrentTime;
        float normalizedTime = TimeManager.Instance.NormalizedTime;

        // 更新太阳旋转
        UpdateSunRotation(normalizedTime);

        // 更新太阳光属性
        UpdateSunLight(timeOfDay);

        // 更新月亮
        UpdateMoonLight(timeOfDay);

        // 更新天空盒
        UpdateSkybox(timeOfDay);

        // 更新环境光
        UpdateAmbientLight(timeOfDay);

        // 更新雾效
        UpdateFog(timeOfDay);

        // 更新星星
        UpdateStars(timeOfDay);
    }

    /// <summary>
    /// 更新太阳旋转 —— 核心逻辑
    /// normalizedTime 0 = 午夜，0.25 = 6:00，0.5 = 正午，0.75 = 18:00
    /// </summary>
    private void UpdateSunRotation(float normalizedTime)
    {
        // 将归一化时间转为角度（0-360度）
        // 偏移-90度，使得 normalizedTime=0.25（6AM）时太阳在地平线（0度仰角）
        float sunAngle = normalizedTime * 360f - 90f;

        // 应用旋转 —— 绕X轴旋转模拟太阳从东到西的运动
        transform.rotation = Quaternion.Euler(sunAngle, 170f, 0f);
    }

    /// <summary>
    /// 更新太阳光颜色和强度
    /// </summary>
    private void UpdateSunLight(float timeOfDay)
    {
        bool isSunUp = TimeManager.Instance.IsDaytime;

        if (isSunUp)
        {
            sunLight.enabled = true;

            // 计算太阳高度因子（0=地平线，1=正午最高点）
            // 使用正弦函数模拟太阳从升起到落下的弧线
            float dayProgress = Mathf.InverseLerp(5f, 19f, timeOfDay);
            float sunHeight = Mathf.Sin(dayProgress * Mathf.PI);

            // 强度随太阳高度变化 —— 类似CSS中的 ease-in-out 曲线
            sunLight.intensity = Mathf.Lerp(sunMinIntensity, sunMaxIntensity, sunHeight);

            // 颜色随太阳高度变化 —— 低角度时偏橙红（日出/日落效果）
            sunLight.color = Color.Lerp(sunHorizonColor, sunNoonColor, sunHeight);
        }
        else
        {
            // 夜晚关闭太阳光
            sunLight.enabled = false;
        }
    }

    /// <summary>
    /// 更新月亮光照
    /// </summary>
    private void UpdateMoonLight(float timeOfDay)
    {
        if (moonLight == null) return;

        bool isNight = !TimeManager.Instance.IsDaytime;

        if (isNight)
        {
            moonLight.enabled = true;
            moonLight.color = moonColor;
            moonLight.intensity = moonIntensity;

            // 月亮旋转 —— 与太阳相反（偏移180度）
            float normalizedTime = TimeManager.Instance.NormalizedTime;
            float moonAngle = normalizedTime * 360f - 90f + 180f;
            moonLight.transform.rotation = Quaternion.Euler(moonAngle, 170f, 0f);
        }
        else
        {
            moonLight.enabled = false;
        }
    }

    /// <summary>
    /// 更新天空盒混合
    /// 使用自定义 Shader 在两个天空盒之间插值
    /// 类似前端的 CSS transition 在两个背景之间渐变
    /// </summary>
    private void UpdateSkybox(float timeOfDay)
    {
        if (blendSkybox == null) return;

        // 计算混合因子：0 = 完全白天，1 = 完全夜晚
        float blendFactor;

        if (timeOfDay >= 5f && timeOfDay < 7f)
        {
            // 日出过渡：夜晚 -> 白天
            blendFactor = 1f - Mathf.InverseLerp(5f, 7f, timeOfDay);
        }
        else if (timeOfDay >= 7f && timeOfDay < 17f)
        {
            // 白天
            blendFactor = 0f;
        }
        else if (timeOfDay >= 17f && timeOfDay < 19f)
        {
            // 日落过渡：白天 -> 夜晚
            blendFactor = Mathf.InverseLerp(17f, 19f, timeOfDay);
        }
        else
        {
            // 夜晚
            blendFactor = 1f;
        }

        // 设置混合材质的参数 —— 类似前端设置 CSS 变量
        blendSkybox.SetFloat("_BlendFactor", blendFactor);
        RenderSettings.skybox = blendSkybox;

        // 触发天空盒反射探针更新
        DynamicGI.UpdateEnvironment();
    }

    /// <summary>
    /// 更新环境光（Ambient Light）
    /// 环境光影响场景中所有物体的基础照明
    /// </summary>
    private void UpdateAmbientLight(float timeOfDay)
    {
        Color targetAmbient;

        if (timeOfDay >= 7f && timeOfDay < 17f)
        {
            // 白天
            targetAmbient = dayAmbientColor;
        }
        else if (timeOfDay >= 5f && timeOfDay < 7f)
        {
            // 日出过渡
            float t = Mathf.InverseLerp(5f, 7f, timeOfDay);
            targetAmbient = Color.Lerp(nightAmbientColor, sunsetAmbientColor, t);
            if (t > 0.5f)
                targetAmbient = Color.Lerp(sunsetAmbientColor, dayAmbientColor, (t - 0.5f) * 2f);
        }
        else if (timeOfDay >= 17f && timeOfDay < 19f)
        {
            // 日落过渡
            float t = Mathf.InverseLerp(17f, 19f, timeOfDay);
            targetAmbient = Color.Lerp(dayAmbientColor, sunsetAmbientColor, t);
            if (t > 0.5f)
                targetAmbient = Color.Lerp(sunsetAmbientColor, nightAmbientColor, (t - 0.5f) * 2f);
        }
        else
        {
            // 夜晚
            targetAmbient = nightAmbientColor;
        }

        // 平滑过渡 —— 避免突变
        RenderSettings.ambientLight = Color.Lerp(
            RenderSettings.ambientLight,
            targetAmbient,
            Time.deltaTime * 2f
        );
    }

    /// <summary>
    /// 更新雾效颜色
    /// </summary>
    private void UpdateFog(float timeOfDay)
    {
        Color targetFogColor;

        if (timeOfDay >= 7f && timeOfDay < 17f)
        {
            targetFogColor = dayFogColor;
        }
        else if ((timeOfDay >= 5f && timeOfDay < 7f) ||
                 (timeOfDay >= 17f && timeOfDay < 19f))
        {
            targetFogColor = sunsetFogColor;
        }
        else
        {
            targetFogColor = nightFogColor;
        }

        RenderSettings.fogColor = Color.Lerp(
            RenderSettings.fogColor,
            targetFogColor,
            Time.deltaTime * 2f
        );
    }

    /// <summary>
    /// 更新星星显示
    /// 夜晚渐渐出现星星，白天渐渐消失
    /// </summary>
    private void UpdateStars(float timeOfDay)
    {
        if (starsParticleSystem == null) return;

        float starsAlpha;

        if (timeOfDay >= starsAppearTime || timeOfDay < starsDisappearTime - 1f)
        {
            // 夜晚 —— 星星完全显示
            starsAlpha = 1f;
        }
        else if (timeOfDay >= starsAppearTime - 1f && timeOfDay < starsAppearTime)
        {
            // 渐入
            starsAlpha = Mathf.InverseLerp(starsAppearTime - 1f, starsAppearTime, timeOfDay);
        }
        else if (timeOfDay >= starsDisappearTime - 1f && timeOfDay < starsDisappearTime)
        {
            // 渐出
            starsAlpha = 1f - Mathf.InverseLerp(starsDisappearTime - 1f, starsDisappearTime, timeOfDay);
        }
        else
        {
            // 白天 —— 星星不显示
            starsAlpha = 0f;
        }

        // 通过调整粒子系统发射率控制星星数量
        // 类似前端中通过 opacity 控制元素显隐
        starsEmission.rateOverTime = starsAlpha > 0.01f ? 50f * starsAlpha : 0f;

        // 调整已有粒子的透明度
        Color starColor = starsMain.startColor.color;
        starColor.a = starsAlpha;
        starsMain.startColor = starColor;
    }
}
```

[截图：DayNightCycle Inspector 面板，展示太阳和月亮的配置参数]

[截图：场景中日出时分的效果，天空呈现橙红色，太阳在地平线附近]

[截图：正午时分的效果，天空蓝色，光照强烈]

[截图：夜晚效果，星星粒子系统和月光]

---

## 20.3 天气状态机

### 20.3.1 天气状态设计

天气系统是一个**有限状态机**（FSM），就像前端中 Redux 的状态管理：

```
状态：Clear（晴天） -> Cloudy（多云） -> Rain（雨天）
转换条件：随机 + 时间触发
```

每种天气状态有自己的视觉效果、音效和对游戏玩法的影响。

### 20.3.2 天气状态枚举

```csharp
/// <summary>
/// 天气状态枚举 —— 类似前端的 enum 类型定义
/// </summary>
public enum WeatherState
{
    Clear,      // 晴天
    Cloudy,     // 多云
    Rain,       // 雨天
    Storm,      // 暴风雨
    Snow,       // 雪天
    Fog         // 雾天
}
```

### 20.3.3 WeatherManager.cs —— 天气管理器

创建 `Scripts/Environment/WeatherManager.cs`：

```csharp
using UnityEngine;
using System;
using System.Collections;

/// <summary>
/// 天气管理器 —— 管理天气状态转换和全局天气参数
/// 类似前端的状态机（如 XState），管理状态转换和副作用
/// </summary>
public class WeatherManager : MonoBehaviour
{
    public static WeatherManager Instance { get; private set; }

    [Header("天气配置")]
    [Tooltip("当前天气状态")]
    [SerializeField] private WeatherState currentWeather = WeatherState.Clear;

    [Tooltip("天气转换持续时间（秒）")]
    [SerializeField] private float transitionDuration = 10f;

    [Tooltip("天气持续最短时间（游戏小时）")]
    [SerializeField] private float minWeatherDuration = 2f;

    [Tooltip("天气持续最长时间（游戏小时）")]
    [SerializeField] private float maxWeatherDuration = 6f;

    [Tooltip("是否自动切换天气")]
    [SerializeField] private bool autoWeatherChange = true;

    [Header("天气转换概率（百分比）")]
    [Tooltip("晴天时转为多云的概率")]
    [SerializeField] private float clearToCloudyChance = 30f;

    [Tooltip("多云时转为雨天的概率")]
    [SerializeField] private float cloudyToRainChance = 40f;

    [Tooltip("雨天时转为暴风雨的概率")]
    [SerializeField] private float rainToStormChance = 20f;

    [Tooltip("多云时转为雪天的概率（低温时）")]
    [SerializeField] private float cloudyToSnowChance = 15f;

    [Tooltip("任意天气转为雾天的概率")]
    [SerializeField] private float fogChance = 10f;

    [Header("雾效配置")]
    [Tooltip("晴天雾密度")]
    [SerializeField] private float clearFogDensity = 0.001f;

    [Tooltip("多云雾密度")]
    [SerializeField] private float cloudyFogDensity = 0.005f;

    [Tooltip("雨天雾密度")]
    [SerializeField] private float rainFogDensity = 0.01f;

    [Tooltip("暴风雨雾密度")]
    [SerializeField] private float stormFogDensity = 0.03f;

    [Tooltip("雪天雾密度")]
    [SerializeField] private float snowFogDensity = 0.015f;

    [Tooltip("雾天雾密度")]
    [SerializeField] private float heavyFogDensity = 0.05f;

    [Header("风场配置")]
    [Tooltip("风场组件引用")]
    [SerializeField] private WindZone windZone;

    [Tooltip("晴天风力")]
    [SerializeField] private float clearWindForce = 0.1f;

    [Tooltip("暴风雨风力")]
    [SerializeField] private float stormWindForce = 1.5f;

    // === 状态跟踪 ===
    private WeatherState targetWeather;      // 目标天气（正在过渡到的天气）
    private float transitionProgress = 1f;   // 过渡进度（0=开始，1=完成）
    private bool isTransitioning = false;    // 是否正在过渡中
    private float weatherTimer = 0f;         // 当前天气已持续时间
    private float nextWeatherChangeTime;     // 下次天气变化的时间点

    // === 事件系统 ===
    /// <summary>天气变化开始时触发</summary>
    public event Action<WeatherState, WeatherState> OnWeatherTransitionStart;

    /// <summary>天气变化完成时触发</summary>
    public event Action<WeatherState> OnWeatherChanged;

    // === 公共属性 ===
    public WeatherState CurrentWeather => currentWeather;
    public WeatherState TargetWeather => targetWeather;
    public float TransitionProgress => transitionProgress;
    public bool IsTransitioning => isTransitioning;

    /// <summary>
    /// 获取当前天气的强度（考虑过渡）
    /// 用于其他系统根据天气强度调整效果
    /// </summary>
    public float WeatherIntensity => isTransitioning ? transitionProgress : 1f;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        targetWeather = currentWeather;
        ScheduleNextWeatherChange();
    }

    private void Update()
    {
        // 更新过渡
        if (isTransitioning)
        {
            UpdateTransition();
        }

        // 自动天气变化
        if (autoWeatherChange && !isTransitioning)
        {
            weatherTimer += Time.deltaTime;

            // 将游戏时间换算为检查间隔
            if (weatherTimer >= nextWeatherChangeTime)
            {
                TryChangeWeather();
                weatherTimer = 0f;
                ScheduleNextWeatherChange();
            }
        }

        // 持续更新雾效和风场（平滑过渡）
        UpdateFog();
        UpdateWind();
    }

    /// <summary>
    /// 安排下次天气变化的时间
    /// </summary>
    private void ScheduleNextWeatherChange()
    {
        // 使用游戏内小时来计算，但转换为现实秒数
        float gameHours = UnityEngine.Random.Range(minWeatherDuration, maxWeatherDuration);

        // 如果 TimeManager 存在，根据日长配比转换
        if (TimeManager.Instance != null)
        {
            // 粗略估算：游戏小时转现实秒
            nextWeatherChangeTime = gameHours * 60f; // 简化计算
        }
        else
        {
            nextWeatherChangeTime = gameHours * 60f;
        }

        Debug.Log($"[天气系统] 下次天气变化在 {nextWeatherChangeTime:F0} 秒后");
    }

    /// <summary>
    /// 尝试随机变化天气 —— 基于概率的状态转换
    /// 类似前端状态机中的 transition 函数
    /// </summary>
    private void TryChangeWeather()
    {
        WeatherState nextWeather = DetermineNextWeather();

        if (nextWeather != currentWeather)
        {
            ChangeWeather(nextWeather);
        }
    }

    /// <summary>
    /// 根据当前天气和概率决定下一个天气
    /// </summary>
    private WeatherState DetermineNextWeather()
    {
        float roll = UnityEngine.Random.Range(0f, 100f);

        // 检查雾天概率（任何天气都可能转为雾天）
        if (roll < fogChance && currentWeather != WeatherState.Fog)
        {
            return WeatherState.Fog;
        }

        switch (currentWeather)
        {
            case WeatherState.Clear:
                // 晴天 -> 多云
                if (roll < clearToCloudyChance)
                    return WeatherState.Cloudy;
                return WeatherState.Clear;

            case WeatherState.Cloudy:
                // 多云 -> 雨天 / 雪天 / 晴天
                if (roll < cloudyToRainChance)
                    return WeatherState.Rain;
                if (roll < cloudyToRainChance + cloudyToSnowChance)
                    return WeatherState.Snow;
                if (roll < 70f)
                    return WeatherState.Clear;
                return WeatherState.Cloudy;

            case WeatherState.Rain:
                // 雨天 -> 暴风雨 / 多云 / 晴天
                if (roll < rainToStormChance)
                    return WeatherState.Storm;
                if (roll < 60f)
                    return WeatherState.Cloudy;
                return WeatherState.Clear;

            case WeatherState.Storm:
                // 暴风雨 -> 雨天（暴风雨不会直接转晴）
                if (roll < 70f)
                    return WeatherState.Rain;
                return WeatherState.Cloudy;

            case WeatherState.Snow:
                // 雪天 -> 多云 / 晴天
                if (roll < 50f)
                    return WeatherState.Cloudy;
                return WeatherState.Clear;

            case WeatherState.Fog:
                // 雾天 -> 多云 / 晴天
                if (roll < 40f)
                    return WeatherState.Cloudy;
                return WeatherState.Clear;

            default:
                return WeatherState.Clear;
        }
    }

    /// <summary>
    /// 手动改变天气（可供外部调用，如任务系统触发特定天气）
    /// </summary>
    public void ChangeWeather(WeatherState newWeather)
    {
        if (isTransitioning)
        {
            // 如果正在过渡中，强制完成当前过渡
            CompleteTransition();
        }

        targetWeather = newWeather;
        transitionProgress = 0f;
        isTransitioning = true;

        OnWeatherTransitionStart?.Invoke(currentWeather, targetWeather);
        Debug.Log($"[天气系统] 天气变化：{currentWeather} -> {targetWeather}");
    }

    /// <summary>
    /// 立即设置天气（无过渡动画）
    /// </summary>
    public void SetWeatherImmediate(WeatherState weather)
    {
        currentWeather = weather;
        targetWeather = weather;
        transitionProgress = 1f;
        isTransitioning = false;
        OnWeatherChanged?.Invoke(currentWeather);
    }

    /// <summary>
    /// 更新天气过渡
    /// 使用 Lerp 在两个天气状态之间平滑插值 —— 类似 CSS transition
    /// </summary>
    private void UpdateTransition()
    {
        transitionProgress += Time.deltaTime / transitionDuration;

        if (transitionProgress >= 1f)
        {
            CompleteTransition();
        }
    }

    /// <summary>
    /// 完成天气过渡
    /// </summary>
    private void CompleteTransition()
    {
        transitionProgress = 1f;
        isTransitioning = false;
        currentWeather = targetWeather;
        OnWeatherChanged?.Invoke(currentWeather);
        Debug.Log($"[天气系统] 天气变化完成：{currentWeather}");
    }

    /// <summary>
    /// 获取目标雾密度
    /// </summary>
    private float GetTargetFogDensity(WeatherState weather)
    {
        switch (weather)
        {
            case WeatherState.Clear: return clearFogDensity;
            case WeatherState.Cloudy: return cloudyFogDensity;
            case WeatherState.Rain: return rainFogDensity;
            case WeatherState.Storm: return stormFogDensity;
            case WeatherState.Snow: return snowFogDensity;
            case WeatherState.Fog: return heavyFogDensity;
            default: return clearFogDensity;
        }
    }

    /// <summary>
    /// 更新雾效 —— 在当前值和目标值之间平滑过渡
    /// </summary>
    private void UpdateFog()
    {
        float targetDensity;

        if (isTransitioning)
        {
            // 过渡中：在两个天气的雾密度之间插值
            float fromDensity = GetTargetFogDensity(currentWeather);
            float toDensity = GetTargetFogDensity(targetWeather);
            targetDensity = Mathf.Lerp(fromDensity, toDensity, transitionProgress);
        }
        else
        {
            targetDensity = GetTargetFogDensity(currentWeather);
        }

        // 平滑过渡到目标值
        RenderSettings.fogDensity = Mathf.Lerp(
            RenderSettings.fogDensity,
            targetDensity,
            Time.deltaTime * 3f
        );
    }

    /// <summary>
    /// 更新风场强度
    /// </summary>
    private void UpdateWind()
    {
        if (windZone == null) return;

        float targetWindForce;

        switch (isTransitioning ? targetWeather : currentWeather)
        {
            case WeatherState.Storm:
                targetWindForce = stormWindForce;
                break;
            case WeatherState.Rain:
                targetWindForce = Mathf.Lerp(clearWindForce, stormWindForce, 0.4f);
                break;
            case WeatherState.Snow:
                targetWindForce = Mathf.Lerp(clearWindForce, stormWindForce, 0.3f);
                break;
            default:
                targetWindForce = clearWindForce;
                break;
        }

        windZone.windMain = Mathf.Lerp(windZone.windMain, targetWindForce, Time.deltaTime * 2f);

        // 暴风雨时增加风的湍流
        float targetTurbulence = (currentWeather == WeatherState.Storm) ? 1.5f : 0.3f;
        windZone.windTurbulence = Mathf.Lerp(
            windZone.windTurbulence,
            targetTurbulence,
            Time.deltaTime * 2f
        );
    }

    /// <summary>
    /// 获取当前天气对地面摩擦力的影响系数
    /// 1.0 = 正常摩擦，< 1.0 = 湿滑
    /// </summary>
    public float GetGroundFrictionMultiplier()
    {
        switch (currentWeather)
        {
            case WeatherState.Rain: return 0.7f;
            case WeatherState.Storm: return 0.5f;
            case WeatherState.Snow: return 0.6f;
            default: return 1.0f;
        }
    }

    /// <summary>
    /// 获取当前天气的可见度系数
    /// 1.0 = 完全可见，0.0 = 完全不可见
    /// </summary>
    public float GetVisibilityMultiplier()
    {
        switch (currentWeather)
        {
            case WeatherState.Clear: return 1.0f;
            case WeatherState.Cloudy: return 0.9f;
            case WeatherState.Rain: return 0.6f;
            case WeatherState.Storm: return 0.3f;
            case WeatherState.Snow: return 0.5f;
            case WeatherState.Fog: return 0.2f;
            default: return 1.0f;
        }
    }
}
```

[截图：WeatherManager Inspector 面板，展示天气概率配置]

[截图：天气状态机转换图（手绘或工具绘制），展示各天气之间的转换关系]

---

## 20.4 天气特效系统

### 20.4.1 粒子系统基础

Unity 的 **Particle System** 是用来创建大量小型视觉元素（粒子）的组件。用前端类比：

- 粒子系统就像一个不断创建和销毁 DOM 元素的循环
- 每个粒子有自己的生命周期、位置、速度、大小和颜色
- 但比 DOM 操作高效得多，因为是 GPU 加速的

### 20.4.2 WeatherEffects.cs —— 天气特效控制器

创建 `Scripts/Environment/WeatherEffects.cs`：

```csharp
using UnityEngine;
using System.Collections;

/// <summary>
/// 天气特效控制器 —— 管理雨雪粒子、闪电、音效等视觉和听觉效果
/// 类似前端中的动画控制器，根据状态驱动视觉效果
/// </summary>
public class WeatherEffects : MonoBehaviour
{
    [Header("粒子系统引用")]
    [Tooltip("雨粒子系统 —— 需要预先在场景中创建")]
    [SerializeField] private ParticleSystem rainParticleSystem;

    [Tooltip("雪粒子系统")]
    [SerializeField] private ParticleSystem snowParticleSystem;

    [Tooltip("暴风雨重雨粒子系统（更密集的雨）")]
    [SerializeField] private ParticleSystem heavyRainParticleSystem;

    [Header("粒子配置")]
    [Tooltip("雨粒子最大发射率")]
    [SerializeField] private float rainMaxEmission = 2000f;

    [Tooltip("暴风雨雨粒子最大发射率")]
    [SerializeField] private float heavyRainMaxEmission = 5000f;

    [Tooltip("雪粒子最大发射率")]
    [SerializeField] private float snowMaxEmission = 1000f;

    [Header("闪电配置")]
    [Tooltip("闪电光源（点光源或方向光）")]
    [SerializeField] private Light lightningLight;

    [Tooltip("闪电最小间隔（秒）")]
    [SerializeField] private float lightningMinInterval = 5f;

    [Tooltip("闪电最大间隔（秒）")]
    [SerializeField] private float lightningMaxInterval = 15f;

    [Tooltip("闪电持续时间（秒）")]
    [SerializeField] private float lightningDuration = 0.2f;

    [Tooltip("闪电光源强度")]
    [SerializeField] private float lightningIntensity = 3f;

    [Header("音效配置")]
    [Tooltip("雨声 AudioSource")]
    [SerializeField] private AudioSource rainAudioSource;

    [Tooltip("雷声 AudioSource")]
    [SerializeField] private AudioSource thunderAudioSource;

    [Tooltip("风声 AudioSource")]
    [SerializeField] private AudioSource windAudioSource;

    [Tooltip("雨声音频片段")]
    [SerializeField] private AudioClip rainSound;

    [Tooltip("轻雨声音频片段")]
    [SerializeField] private AudioClip lightRainSound;

    [Tooltip("雷声音频片段数组（随机选择）")]
    [SerializeField] private AudioClip[] thunderSounds;

    [Tooltip("风声音频片段")]
    [SerializeField] private AudioClip windSound;

    [Header("跟随目标")]
    [Tooltip("粒子系统跟随的目标（通常是玩家摄像机）")]
    [SerializeField] private Transform followTarget;

    [Tooltip("粒子系统相对于目标的偏移量（向上偏移）")]
    [SerializeField] private Vector3 followOffset = new Vector3(0, 15f, 0);

    // 缓存的粒子系统模块
    private ParticleSystem.EmissionModule rainEmission;
    private ParticleSystem.EmissionModule heavyRainEmission;
    private ParticleSystem.EmissionModule snowEmission;

    // 闪电相关
    private float nextLightningTime;
    private bool isLightningActive = false;

    // 当前天气效果强度（用于平滑过渡）
    private float currentRainIntensity = 0f;
    private float currentSnowIntensity = 0f;
    private float targetRainIntensity = 0f;
    private float targetSnowIntensity = 0f;

    // 过渡速度
    private float effectTransitionSpeed = 2f;

    private void Awake()
    {
        // 缓存粒子系统模块引用
        // 注意：Unity 的粒子系统模块是结构体，每次访问都会创建副本
        // 所以我们缓存它们，类似前端中缓存 DOM 引用
        if (rainParticleSystem != null)
            rainEmission = rainParticleSystem.emission;
        if (heavyRainParticleSystem != null)
            heavyRainEmission = heavyRainParticleSystem.emission;
        if (snowParticleSystem != null)
            snowEmission = snowParticleSystem.emission;

        // 初始化闪电光源
        if (lightningLight != null)
            lightningLight.enabled = false;

        // 初始时关闭所有效果
        SetAllEffectsOff();
    }

    private void OnEnable()
    {
        // 订阅天气变化事件 —— 类似前端的 addEventListener
        if (WeatherManager.Instance != null)
        {
            WeatherManager.Instance.OnWeatherTransitionStart += HandleWeatherTransitionStart;
            WeatherManager.Instance.OnWeatherChanged += HandleWeatherChanged;
        }
    }

    private void OnDisable()
    {
        // 取消订阅 —— 类似前端的 removeEventListener
        if (WeatherManager.Instance != null)
        {
            WeatherManager.Instance.OnWeatherTransitionStart -= HandleWeatherTransitionStart;
            WeatherManager.Instance.OnWeatherChanged -= HandleWeatherChanged;
        }
    }

    private void Update()
    {
        // 跟随目标（让粒子系统始终在玩家头顶）
        UpdateFollowTarget();

        // 平滑过渡效果强度
        UpdateEffectIntensities();

        // 更新闪电
        UpdateLightning();

        // 更新音效音量
        UpdateAudio();
    }

    /// <summary>
    /// 让粒子系统跟随玩家位置
    /// 这样无论玩家走到哪里，雨雪都会落在周围
    /// </summary>
    private void UpdateFollowTarget()
    {
        if (followTarget == null)
        {
            // 如果没有设置跟随目标，尝试找到主摄像机
            if (Camera.main != null)
                followTarget = Camera.main.transform;
            return;
        }

        transform.position = followTarget.position + followOffset;
    }

    /// <summary>
    /// 处理天气过渡开始
    /// </summary>
    private void HandleWeatherTransitionStart(WeatherState from, WeatherState to)
    {
        // 设置目标强度
        SetTargetIntensities(to);

        Debug.Log($"[天气特效] 开始过渡：{from} -> {to}");
    }

    /// <summary>
    /// 处理天气变化完成
    /// </summary>
    private void HandleWeatherChanged(WeatherState newWeather)
    {
        // 确保目标强度正确
        SetTargetIntensities(newWeather);

        Debug.Log($"[天气特效] 天气已变为：{newWeather}");
    }

    /// <summary>
    /// 根据目标天气设置效果目标强度
    /// </summary>
    private void SetTargetIntensities(WeatherState weather)
    {
        switch (weather)
        {
            case WeatherState.Clear:
            case WeatherState.Cloudy:
                targetRainIntensity = 0f;
                targetSnowIntensity = 0f;
                break;

            case WeatherState.Rain:
                targetRainIntensity = 0.6f;
                targetSnowIntensity = 0f;
                break;

            case WeatherState.Storm:
                targetRainIntensity = 1.0f;
                targetSnowIntensity = 0f;
                break;

            case WeatherState.Snow:
                targetRainIntensity = 0f;
                targetSnowIntensity = 1.0f;
                break;

            case WeatherState.Fog:
                targetRainIntensity = 0f;
                targetSnowIntensity = 0f;
                break;
        }
    }

    /// <summary>
    /// 平滑更新效果强度 —— 类似前端的 CSS transition
    /// 通过 Lerp 在当前值和目标值之间插值
    /// </summary>
    private void UpdateEffectIntensities()
    {
        // 平滑过渡雨量
        currentRainIntensity = Mathf.Lerp(
            currentRainIntensity,
            targetRainIntensity,
            Time.deltaTime * effectTransitionSpeed
        );

        // 平滑过渡雪量
        currentSnowIntensity = Mathf.Lerp(
            currentSnowIntensity,
            targetSnowIntensity,
            Time.deltaTime * effectTransitionSpeed
        );

        // 应用雨粒子发射率
        if (rainParticleSystem != null)
        {
            rainEmission.rateOverTime = currentRainIntensity * rainMaxEmission;

            // 在发射率为0时停止粒子系统以节省性能
            if (currentRainIntensity < 0.01f && rainParticleSystem.isPlaying)
                rainParticleSystem.Stop();
            else if (currentRainIntensity >= 0.01f && !rainParticleSystem.isPlaying)
                rainParticleSystem.Play();
        }

        // 应用暴风雨粒子
        if (heavyRainParticleSystem != null)
        {
            // 暴风雨粒子只在强度超过0.7时才出现
            float heavyRainFactor = Mathf.Max(0f, (currentRainIntensity - 0.7f) / 0.3f);
            heavyRainEmission.rateOverTime = heavyRainFactor * heavyRainMaxEmission;

            if (heavyRainFactor < 0.01f && heavyRainParticleSystem.isPlaying)
                heavyRainParticleSystem.Stop();
            else if (heavyRainFactor >= 0.01f && !heavyRainParticleSystem.isPlaying)
                heavyRainParticleSystem.Play();
        }

        // 应用雪粒子发射率
        if (snowParticleSystem != null)
        {
            snowEmission.rateOverTime = currentSnowIntensity * snowMaxEmission;

            if (currentSnowIntensity < 0.01f && snowParticleSystem.isPlaying)
                snowParticleSystem.Stop();
            else if (currentSnowIntensity >= 0.01f && !snowParticleSystem.isPlaying)
                snowParticleSystem.Play();
        }
    }

    /// <summary>
    /// 更新闪电效果
    /// 只在暴风雨天气下随机触发闪电
    /// </summary>
    private void UpdateLightning()
    {
        if (lightningLight == null) return;

        WeatherState currentWeather = WeatherManager.Instance != null
            ? WeatherManager.Instance.CurrentWeather
            : WeatherState.Clear;

        // 只在暴风雨时产生闪电
        if (currentWeather != WeatherState.Storm)
        {
            lightningLight.enabled = false;
            return;
        }

        // 检查是否到了下一次闪电时间
        if (Time.time >= nextLightningTime && !isLightningActive)
        {
            StartCoroutine(LightningFlash());
        }
    }

    /// <summary>
    /// 闪电闪光效果协程
    /// 协程类似前端的 async/await，可以在多帧之间执行逻辑
    /// </summary>
    private IEnumerator LightningFlash()
    {
        isLightningActive = true;

        // 随机闪烁次数（1-3次快速闪烁模拟真实闪电）
        int flashCount = Random.Range(1, 4);

        for (int i = 0; i < flashCount; i++)
        {
            // 闪光开启
            lightningLight.enabled = true;
            lightningLight.intensity = lightningIntensity * Random.Range(0.7f, 1.3f);

            // 随机位置偏移（模拟闪电在不同位置）
            lightningLight.transform.localPosition = new Vector3(
                Random.Range(-50f, 50f),
                50f,
                Random.Range(-50f, 50f)
            );

            yield return new WaitForSeconds(lightningDuration * Random.Range(0.5f, 1f));

            // 闪光关闭
            lightningLight.enabled = false;

            // 闪烁之间的短暂间隔
            if (i < flashCount - 1)
                yield return new WaitForSeconds(Random.Range(0.05f, 0.15f));
        }

        // 播放雷声（在闪电后延迟，模拟声音传播）
        float thunderDelay = Random.Range(0.5f, 3f);
        yield return new WaitForSeconds(thunderDelay);

        PlayThunder();

        // 安排下一次闪电
        nextLightningTime = Time.time + Random.Range(lightningMinInterval, lightningMaxInterval);
        isLightningActive = false;
    }

    /// <summary>
    /// 播放雷声
    /// </summary>
    private void PlayThunder()
    {
        if (thunderAudioSource == null || thunderSounds == null || thunderSounds.Length == 0)
            return;

        // 随机选择一个雷声音效
        AudioClip clip = thunderSounds[Random.Range(0, thunderSounds.Length)];
        thunderAudioSource.clip = clip;

        // 随机音量和音调，增加变化感
        thunderAudioSource.volume = Random.Range(0.6f, 1.0f);
        thunderAudioSource.pitch = Random.Range(0.8f, 1.2f);
        thunderAudioSource.Play();
    }

    /// <summary>
    /// 更新环境音效音量
    /// 根据天气强度平滑调节音量 —— 类似前端中的 Web Audio API 音量控制
    /// </summary>
    private void UpdateAudio()
    {
        // 雨声
        if (rainAudioSource != null)
        {
            float targetRainVolume = currentRainIntensity;

            if (targetRainVolume > 0.01f)
            {
                if (!rainAudioSource.isPlaying)
                {
                    // 选择合适的雨声片段
                    rainAudioSource.clip = currentRainIntensity > 0.5f ? rainSound : lightRainSound;
                    rainAudioSource.loop = true;
                    rainAudioSource.Play();
                }
                rainAudioSource.volume = Mathf.Lerp(
                    rainAudioSource.volume,
                    targetRainVolume,
                    Time.deltaTime * 3f
                );
            }
            else
            {
                rainAudioSource.volume = Mathf.Lerp(
                    rainAudioSource.volume,
                    0f,
                    Time.deltaTime * 3f
                );
                if (rainAudioSource.volume < 0.01f && rainAudioSource.isPlaying)
                    rainAudioSource.Stop();
            }
        }

        // 风声
        if (windAudioSource != null)
        {
            WeatherState weather = WeatherManager.Instance != null
                ? WeatherManager.Instance.CurrentWeather
                : WeatherState.Clear;

            float targetWindVolume = 0f;
            switch (weather)
            {
                case WeatherState.Storm: targetWindVolume = 0.8f; break;
                case WeatherState.Rain: targetWindVolume = 0.3f; break;
                case WeatherState.Snow: targetWindVolume = 0.4f; break;
                default: targetWindVolume = 0.05f; break;
            }

            if (targetWindVolume > 0.01f && !windAudioSource.isPlaying)
            {
                windAudioSource.clip = windSound;
                windAudioSource.loop = true;
                windAudioSource.Play();
            }

            windAudioSource.volume = Mathf.Lerp(
                windAudioSource.volume,
                targetWindVolume,
                Time.deltaTime * 2f
            );
        }
    }

    /// <summary>
    /// 关闭所有天气效果
    /// </summary>
    private void SetAllEffectsOff()
    {
        if (rainParticleSystem != null) rainParticleSystem.Stop();
        if (heavyRainParticleSystem != null) heavyRainParticleSystem.Stop();
        if (snowParticleSystem != null) snowParticleSystem.Stop();
        if (lightningLight != null) lightningLight.enabled = false;
        if (rainAudioSource != null) rainAudioSource.Stop();
        if (thunderAudioSource != null) thunderAudioSource.Stop();
        if (windAudioSource != null) windAudioSource.Stop();

        currentRainIntensity = 0f;
        currentSnowIntensity = 0f;
        targetRainIntensity = 0f;
        targetSnowIntensity = 0f;
    }
}
```

[截图：雨天效果 —— 雨粒子系统从上方降落，场景变暗]

[截图：暴风雨效果 —— 密集雨幕、闪电闪光、低可见度]

[截图：雪天效果 —— 雪花粒子缓慢飘落]

[截图：雾天效果 —— 远处景物被浓雾遮挡]

---

## 20.5 创建雨雪粒子系统

### 20.5.1 在 Unity 编辑器中创建雨粒子

下面是手把手操作步骤：

1. 在 Hierarchy 中右键 -> Effects -> Particle System
2. 重命名为 "RainParticleSystem"
3. 配置以下参数：

**Main Module（主模块）：**
- Duration: 1
- Looping: true
- Start Lifetime: 1（雨滴从生成到消失的时间）
- Start Speed: 25（雨滴下落速度）
- Start Size: 0.05（雨滴大小）
- Simulation Space: World（世界空间，这样粒子不会跟随发射器移动）
- Max Particles: 5000

**Emission（发射模块）：**
- Rate over Time: 2000（每秒发射的粒子数）

**Shape（形状模块）：**
- Shape: Box（方形区域发射）
- Scale: (30, 1, 30)（30x30米的区域覆盖玩家周围）

**Velocity over Lifetime（速度控制）：**
- 启用此模块
- Linear: X=1, Y=0, Z=0.5（添加一些水平速度模拟风的影响）

**Color over Lifetime（颜色变化）：**
- 从白色半透明渐变到白色全透明（粒子消失时逐渐变透明）

**Renderer（渲染器）：**
- Render Mode: Stretched Billboard（拉伸的面片，看起来像雨丝）
- Length Scale: 5（拉伸程度）
- Material: 使用粒子材质（Particles/Alpha Blended）

[截图：雨粒子系统的 Inspector 配置面板]

### 20.5.2 雪粒子系统配置

雪和雨类似，但有关键区别：

- **Start Speed**: 2-5（雪花飘落更慢）
- **Start Size**: 0.1-0.3（雪花更大）
- **Start Lifetime**: 5-8（雪花飘落时间更长）
- **Shape Scale**: (40, 1, 40)（更大的覆盖范围）
- **Renderer**: Billboard（普通面片，不拉伸）
- 添加 **Noise** 模块模拟雪花的飘动效果
  - Strength: 1
  - Frequency: 0.5
  - Scroll Speed: 0.5

[截图：雪粒子系统的 Inspector 配置面板]

---

## 20.6 天气与游戏玩法的集成

### 20.6.1 地面湿滑效果

在玩家控制器中集成天气影响：

```csharp
/// <summary>
/// 在 PlayerController 中添加天气影响
/// 示例：根据天气调整移动参数
/// </summary>
public class WeatherGameplayIntegration : MonoBehaviour
{
    [Header("天气影响参数")]
    [Tooltip("基础移动速度")]
    [SerializeField] private float baseMoveSpeed = 5f;

    [Tooltip("雨天速度衰减")]
    [SerializeField] private float rainSpeedMultiplier = 0.85f;

    [Tooltip("暴风雨速度衰减")]
    [SerializeField] private float stormSpeedMultiplier = 0.6f;

    [Tooltip("雪天速度衰减")]
    [SerializeField] private float snowSpeedMultiplier = 0.7f;

    private CharacterController characterController;

    private void Start()
    {
        characterController = GetComponent<CharacterController>();

        // 订阅天气变化事件
        if (WeatherManager.Instance != null)
        {
            WeatherManager.Instance.OnWeatherChanged += OnWeatherChanged;
        }
    }

    private void OnWeatherChanged(WeatherState newWeather)
    {
        // 天气变化时可以显示 UI 提示
        Debug.Log($"[玩法集成] 天气变化为 {newWeather}，调整玩家参数");
    }

    /// <summary>
    /// 获取天气修正后的移动速度
    /// </summary>
    public float GetWeatherAdjustedSpeed()
    {
        if (WeatherManager.Instance == null) return baseMoveSpeed;

        float multiplier = 1f;

        switch (WeatherManager.Instance.CurrentWeather)
        {
            case WeatherState.Rain:
                multiplier = rainSpeedMultiplier;
                break;
            case WeatherState.Storm:
                multiplier = stormSpeedMultiplier;
                break;
            case WeatherState.Snow:
                multiplier = snowSpeedMultiplier;
                break;
        }

        // 地面摩擦力也会影响
        multiplier *= WeatherManager.Instance.GetGroundFrictionMultiplier();

        return baseMoveSpeed * multiplier;
    }

    /// <summary>
    /// 获取天气修正后的敌人检测范围
    /// 暴风雨和雾天降低敌人的视野范围
    /// </summary>
    public float GetWeatherAdjustedDetectionRange(float baseRange)
    {
        if (WeatherManager.Instance == null) return baseRange;

        return baseRange * WeatherManager.Instance.GetVisibilityMultiplier();
    }
}
```

[截图：暴风雨中角色移动速度明显降低的效果对比]

---

## 20.7 场景搭建步骤

### 20.7.1 完整搭建流程

1. **创建 TimeManager 对象**
   - Hierarchy -> Create Empty -> 命名 "TimeManager"
   - 添加 `TimeManager.cs` 脚本
   - 配置日长（建议测试时设为 2 分钟，正式游戏设为 24 分钟）

2. **设置太阳光**
   - 选择场景中的 Directional Light
   - 添加 `DayNightCycle.cs` 脚本
   - 配置颜色和强度参数

3. **创建月亮光源**
   - Hierarchy -> Light -> Directional Light
   - 命名 "Moon Light"
   - 关闭 Shadow（月光通常不需要阴影）
   - 拖拽到 DayNightCycle 的 Moon Light 字段

4. **创建 WeatherManager 对象**
   - Hierarchy -> Create Empty -> 命名 "WeatherManager"
   - 添加 `WeatherManager.cs` 脚本
   - 添加 Wind Zone 组件
   - 配置转换概率

5. **创建天气特效对象**
   - Hierarchy -> Create Empty -> 命名 "WeatherEffects"
   - 添加 `WeatherEffects.cs` 脚本
   - 创建雨、雪粒子系统作为子对象
   - 创建闪电光源作为子对象
   - 添加 3 个 AudioSource（雨声、雷声、风声）

6. **配置天空盒**
   - Window -> Rendering -> Lighting
   - 在 Environment 标签页设置 Skybox Material
   - 创建混合天空盒材质

7. **启用雾效**
   - 在 Lighting 面板中勾选 Fog
   - 设置初始雾颜色和密度

[截图：完整的场景层级结构，展示所有天气相关的对象]

[截图：Lighting Settings 面板中的雾效和天空盒配置]

---

## 20.8 调试工具

### 20.8.1 编辑器中的快捷调试

在开发过程中，我们经常需要快速切换时间和天气来测试效果。可以通过 Unity 编辑器的 Custom Editor 或简单的键盘快捷键实现：

```csharp
/// <summary>
/// 天气调试工具 —— 仅在开发时使用
/// 类似前端的开发者工具面板
/// </summary>
public class WeatherDebugTools : MonoBehaviour
{
    #if UNITY_EDITOR
    private void Update()
    {
        // 快速切换天气（仅编辑器模式）
        if (Input.GetKeyDown(KeyCode.F1))
            WeatherManager.Instance?.ChangeWeather(WeatherState.Clear);
        if (Input.GetKeyDown(KeyCode.F2))
            WeatherManager.Instance?.ChangeWeather(WeatherState.Rain);
        if (Input.GetKeyDown(KeyCode.F3))
            WeatherManager.Instance?.ChangeWeather(WeatherState.Storm);
        if (Input.GetKeyDown(KeyCode.F4))
            WeatherManager.Instance?.ChangeWeather(WeatherState.Snow);
        if (Input.GetKeyDown(KeyCode.F5))
            WeatherManager.Instance?.ChangeWeather(WeatherState.Fog);

        // 快速调整时间
        if (Input.GetKeyDown(KeyCode.F9))
            TimeManager.Instance?.SetTime(6f);   // 日出
        if (Input.GetKeyDown(KeyCode.F10))
            TimeManager.Instance?.SetTime(12f);  // 正午
        if (Input.GetKeyDown(KeyCode.F11))
            TimeManager.Instance?.SetTime(18f);  // 日落
        if (Input.GetKeyDown(KeyCode.F12))
            TimeManager.Instance?.SetTime(0f);   // 午夜

        // 时间加速/减速
        if (Input.GetKeyDown(KeyCode.Plus) || Input.GetKeyDown(KeyCode.KeypadPlus))
            TimeManager.Instance?.SetTimeScale(
                TimeManager.Instance.CurrentTime > 0 ? 5f : 1f
            );
    }

    private void OnGUI()
    {
        // 在屏幕左上角显示调试信息
        GUILayout.BeginArea(new Rect(10, 10, 300, 200));
        GUILayout.Label($"时间：{TimeManager.Instance?.FormattedTime}");
        GUILayout.Label($"第 {TimeManager.Instance?.CurrentDay} 天");
        GUILayout.Label($"时间段：{TimeManager.Instance?.CurrentPeriod}");
        GUILayout.Label($"天气：{WeatherManager.Instance?.CurrentWeather}");
        if (WeatherManager.Instance?.IsTransitioning == true)
            GUILayout.Label($"过渡中 -> {WeatherManager.Instance?.TargetWeather} " +
                          $"({WeatherManager.Instance?.TransitionProgress:P0})");
        GUILayout.EndArea();
    }
    #endif
}
```

[截图：游戏运行时左上角的调试信息面板]

---

## 20.9 性能优化建议

### 20.9.1 粒子系统优化

1. **限制最大粒子数** —— 移动端建议雨粒子不超过 2000，雪粒子不超过 500
2. **使用 GPU Instancing** —— 在粒子材质中启用 GPU Instancing
3. **及时停止不需要的粒子系统** —— 晴天时确保所有天气粒子系统已停止
4. **使用对象池** —— 闪电特效等频繁创建/销毁的对象使用对象池

### 20.9.2 光照优化

1. **月光不投射阴影** —— `moonLight.shadows = LightShadows.None`
2. **减少 `DynamicGI.UpdateEnvironment()` 的调用频率** —— 不要每帧调用，可以改为每秒调用一次
3. **使用 Light Probe** 代替实时光照来照亮小物体

### 20.9.3 天空盒优化

1. 使用 **Procedural Skybox** 而非高分辨率纹理天空盒，减少内存占用
2. 天空盒混合时，避免在移动端使用过于复杂的 Shader

---

## 练习题

### 练习1：基础练习 —— 时间 UI 显示
创建一个简单的 UI 面板，实时显示：
- 当前游戏时间（如 "14:30"）
- 当前是第几天
- 当前时间段名称（中文，如 "上午"、"日落"）
- 一个太阳/月亮图标，根据白天/夜晚切换

### 练习2：进阶练习 —— 温度系统
扩展天气系统，添加一个温度系统：
- 白天温度高，夜晚温度低
- 不同天气影响温度（阴天温度下降，雪天最冷）
- 温度影响角色（极寒时持续掉血）
- 添加温度 UI 显示

### 练习3：高级练习 —— 天气预报系统
实现一个天气预报功能：
- 提前显示未来 3 个时段的天气预测
- 天气预报有一定概率不准确（增加随机性）
- 在 UI 中用图标显示天气预报
- 玩家可以在特定 NPC 处查看天气预报

### 练习4：挑战练习 —— 彩虹效果
在雨后晴天时生成彩虹：
- 使用粒子系统或 Shader 创建彩虹弧形
- 只在雨后且太阳位于合适角度时出现
- 彩虹随时间缓缓消散
- 添加彩虹出现的条件判断逻辑

---

## 下一章预告

在下一章**第21章：任务系统**中，我们将学习：

- 如何设计可扩展的任务数据结构（使用 ScriptableObject）
- 任务状态管理（未开始、进行中、已完成、失败）
- 多种任务目标类型（击杀、收集、对话、探索、护送）
- 任务 UI（任务日志、任务追踪器、通知弹窗）
- 任务链和前置任务系统
- 任务与 NPC 的交互集成

天气系统可以和任务系统深度配合 —— 比如某些任务只在特定天气下才能触发，暴风雨天气可以作为剧情触发条件。我们将在下一章看到这种跨系统集成的设计模式。
