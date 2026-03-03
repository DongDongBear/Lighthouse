# 第 10 章：音频系统

> **前端类比**：如果你用过 Web Audio API 或 Howler.js，Unity 的音频系统会让你感到熟悉。AudioSource 类似 `<audio>` 元素或 `AudioBufferSourceNode`，AudioListener 类似人耳（麦克风），而 AudioMixer 就像一个专业的音频调音台——在前端几乎不可能实现的功能，Unity 开箱即用。

---

## 本章目标

完成本章后，你将能够：

1. 理解 AudioSource 和 AudioListener 组件的作用和配置
2. 正确导入和配置音频文件（格式、压缩、采样率）
3. 区分 3D 空间音频和 2D 音频，配置空间衰减曲线
4. 搭建 AudioMixer 分组架构（BGM、SFX、UI、环境音）
5. 实现背景音乐的无缝切换与交叉淡入淡出
6. 使用对象池优化频繁播放的音效
7. 理解音频遮挡（Occlusion）的基础概念
8. 构建一套完整的 AudioManager 单例系统
9. 在游戏的各个系统中正确触发和管理音效

## 预计学习时间

**3 小时**（理论 1 小时 + 实操 2 小时）

---

## 10.1 音频系统全景

### 10.1.1 Unity 音频 vs 前端音频

| 概念 | 前端（Web Audio API） | Unity |
|------|----------------------|-------|
| 音频播放器 | `<audio>` / `AudioBufferSourceNode` | AudioSource 组件 |
| 听者 | 浏览器自动处理 | AudioListener 组件（通常在相机上） |
| 音频文件 | MP3、OGG、WAV | WAV、OGG、MP3、AIFF |
| 空间音频 | Web Audio 的 PannerNode（很少用） | 3D Sound Settings（开箱即用） |
| 音量控制 | `GainNode` / `element.volume` | AudioMixer / AudioSource.volume |
| 音频分组 | 手动管理多个 GainNode | AudioMixer Groups |
| 音效触发 | `audio.play()` | `audioSource.Play()` / `PlayOneShot()` |

### 10.1.2 音频系统架构

```
Unity 音频系统架构：

                    ┌─────────────┐
                    │ AudioListener│  ← 通常挂在 Main Camera 上
                    │  （耳朵）     │     场景中只能有一个
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────┴───┐ ┌──────┴──┐ ┌──────┴──────┐
     │AudioSource │ │AudioSource│ │AudioSource   │
     │ (BGM)      │ │ (脚步声)  │ │ (环境鸟叫)   │
     │ 2D 音频    │ │ 3D 音频   │ │ 3D 音频      │
     └────────┬───┘ └──────┬──┘ └──────┬──────┘
              │            │            │
              ▼            ▼            ▼
         ┌──────────────────────────────────┐
         │          AudioMixer              │
         │  ┌──────┐ ┌──────┐ ┌──────────┐ │
         │  │ BGM  │ │ SFX  │ │Environment│ │
         │  │ -3dB │ │ 0dB  │ │  -6dB     │ │
         │  └──┬───┘ └──┬───┘ └────┬─────┘ │
         │     └────┬───┘──────────┘       │
         │          ▼                       │
         │     ┌─────────┐                 │
         │     │ Master  │                 │
         │     │  0dB    │                 │
         │     └─────────┘                 │
         └──────────────────────────────────┘
                    │
                    ▼
              🔊 最终输出
```

---

## 10.2 AudioSource 和 AudioListener 组件

### 10.2.1 AudioListener：你的耳朵

AudioListener 决定了玩家从哪个位置"听"声音。

**关键规则：**
- 场景中**只能有一个**活跃的 AudioListener
- 通常挂在 Main Camera 上（第三人称游戏）
- 或挂在玩家角色上（第一人称游戏）

> 💡 **前端类比**：AudioListener 就像 Web Audio API 的 `AudioContext.listener`——决定了音频的空间感知位置。不同的是，前端很少需要关心它。

[截图：Main Camera 上的 AudioListener 组件]

> ⚠️ **注意**：如果场景中有多个 AudioListener（比如切换相机时忘记禁用旧相机的），Unity 会输出警告，且音频行为不可预测。

### 10.2.2 AudioSource：音频播放器

AudioSource 是实际播放声音的组件，挂在任何 GameObject 上。

[截图：AudioSource 组件的完整 Inspector 面板]

**核心属性：**

| 属性 | 说明 | 前端类比 |
|------|------|----------|
| AudioClip | 要播放的音频文件 | `<audio src="...">` |
| Output | 输出到哪个 AudioMixer Group | 音频路由 |
| Mute | 静音 | `audio.muted = true` |
| Play On Awake | 场景加载时自动播放 | `<audio autoplay>` |
| Loop | 循环播放 | `<audio loop>` |
| Volume | 音量 (0-1) | `audio.volume` |
| Pitch | 音调 (1=正常, 2=高八度, 0.5=低八度) | `playbackRate`（近似） |
| Spatial Blend | 2D (0) ↔ 3D (1) | 无直接等价 |
| Min/Max Distance | 3D 音频的距离衰减范围 | PannerNode 参数 |

### 10.2.3 播放方法对比

```csharp
using UnityEngine;

/// <summary>
/// AudioSource 播放方法演示
/// </summary>
public class AudioPlayDemo : MonoBehaviour
{
    private AudioSource audioSource;

    [SerializeField] private AudioClip bgmClip;        // 背景音乐
    [SerializeField] private AudioClip footstepClip;   // 脚步声
    [SerializeField] private AudioClip explosionClip;  // 爆炸声

    void Start()
    {
        audioSource = GetComponent<AudioSource>();
    }

    void PlayExamples()
    {
        // ========== Play() ==========
        // 播放 AudioSource 上设置的 AudioClip
        // 如果正在播放，会停止当前音频并从头播放
        // 适用于：背景音乐、环境音（一次只播一个）
        audioSource.clip = bgmClip;
        audioSource.Play();

        // ========== PlayOneShot() ==========
        // 在同一个 AudioSource 上叠加播放一个音效
        // 不会打断当前正在播放的音频
        // 适用于：脚步声、枪声等需要叠加的音效
        audioSource.PlayOneShot(footstepClip, 0.8f); // 第二个参数是音量缩放

        // ========== PlayClipAtPoint() ==========
        // 在指定位置创建一个临时 AudioSource 播放音效
        // 播放完毕后自动销毁
        // 适用于：爆炸、死亡等一次性的位置音效
        // 注意：无法控制生成的 AudioSource，且每次都会创建新 GameObject
        AudioSource.PlayClipAtPoint(explosionClip, transform.position, 1f);

        // ========== 其他控制 ==========
        audioSource.Pause();    // 暂停（可恢复）
        audioSource.UnPause();  // 从暂停处继续
        audioSource.Stop();     // 停止（回到开头）

        // 检查是否正在播放
        bool playing = audioSource.isPlaying;

        // 获取/设置播放位置（秒）
        float currentTime = audioSource.time;
        audioSource.time = 30f; // 跳到第 30 秒
    }
}
```

---

## 10.3 AudioClip 导入与设置

### 10.3.1 支持的音频格式

| 格式 | 文件大小 | 质量 | 推荐用途 |
|------|----------|------|----------|
| WAV | 大（无压缩） | 最高 | 短音效的源文件 |
| OGG | 中（有损压缩） | 高 | BGM、较长的音效 |
| MP3 | 中（有损压缩） | 高 | BGM（但 OGG 更推荐） |
| AIFF | 大（无压缩） | 最高 | Mac 上常用的无损格式 |

> 🎯 **最佳实践**：
> - 源文件用 WAV/AIFF（无损），让 Unity 来处理压缩
> - 不要导入已经压缩过的 MP3 再让 Unity 重新压缩（二次压缩会损失质量）
> - 手游最终使用的格式由 Unity 平台设置决定

### 10.3.2 导入设置

选中 Project 窗口中的音频文件，在 Inspector 中设置：

[截图：AudioClip 导入设置面板]

```
音频导入设置推荐：

┌─────────────────────────────────────────┐
│ Force To Mono: ☐                         │  ← 是否转为单声道
│                                         │     手游音效推荐开启（节省内存）
│                                         │     BGM 保持立体声
│                                         │
│ Load In Background: ☑                    │  ← 后台加载，不阻塞主线程
│                                         │
│ Preload Audio Data: ☑                    │  ← 预加载到内存
│                                         │
│ ─── 平台特定设置 ─────────────────────── │
│                                         │
│ Load Type:                              │
│   ○ Decompress On Load                  │  ← 加载时解压（小音效推荐）
│   ● Compressed In Memory                │  ← 压缩存储（中等音效推荐）
│   ○ Streaming                           │  ← 流式播放（长 BGM 推荐）
│                                         │
│ Compression Format:                     │
│   ○ PCM         (无压缩，质量最高)       │  ← 极短、频繁的音效
│   ● Vorbis      (OGG 压缩，推荐)        │  ← 大多数情况
│   ○ ADPCM       (低压缩率，解码快)       │  ← 脚步声等频繁音效
│                                         │
│ Quality: ◀━━━━━●━━━━▶ 70%               │  ← Vorbis 压缩质量
│                                         │
│ Sample Rate: Preserve Sample Rate       │
└─────────────────────────────────────────┘
```

### 10.3.3 不同类型音频的推荐设置

| 音频类型 | Load Type | Compression | Force To Mono | 说明 |
|----------|-----------|-------------|:---:|------|
| 短音效 (<1s) | Decompress On Load | ADPCM 或 PCM | 是 | 脚步、按钮点击、拾取 |
| 中等音效 (1-5s) | Compressed In Memory | Vorbis 70% | 是 | 攻击、技能、受伤 |
| BGM (>30s) | Streaming | Vorbis 50-70% | 否 | 背景音乐 |
| 环境音 (循环) | Compressed In Memory | Vorbis 50% | 否 | 风声、水流、鸟叫 |
| 语音对话 | Streaming | Vorbis 80% | 是 | NPC 语音 |

> 💡 **前端类比**：
> - `Decompress On Load` ≈ 前端的 `preload="auto"` + 预解码
> - `Compressed In Memory` ≈ 缓存但需要时解码
> - `Streaming` ≈ 前端的 `preload="none"` + 流式播放

---

## 10.4 3D 空间音频 vs 2D 音频

### 10.4.1 基本概念

```
2D 音频（Spatial Blend = 0）：
  - 无方向感和距离感
  - 从"心中"直接听到
  - 不受 AudioListener 位置影响
  - 适用于：BGM、UI 音效、旁白

3D 音频（Spatial Blend = 1）：
  - 有方向感（左右声道差异）
  - 有距离感（远处声音小）
  - 受 AudioListener 位置和朝向影响
  - 适用于：脚步声、环境声、NPC 对话
```

### 10.4.2 3D Sound Settings 详解

[截图：AudioSource 3D Sound Settings 的展开面板]

```
3D Sound Settings：

┌─────────────────────────────────────────┐
│ Doppler Level: 1                         │  ← 多普勒效应强度
│                                         │     声源靠近时音调升高，远离时降低
│                                         │
│ Spread: 0°                              │  ← 声音扩散角度
│                                         │     0° = 点声源
│                                         │     360° = 全方位（无方向感）
│                                         │
│ Volume Rolloff:                         │
│   ● Logarithmic (对数衰减，真实)         │
│   ○ Linear      (线性衰减，可控)         │
│   ○ Custom Curve (自定义曲线)            │
│                                         │
│ Min Distance: 1                          │  ← 低于此距离音量为 100%
│ Max Distance: 500                        │  ← 超过此距离音量为 0%
└─────────────────────────────────────────┘

距离衰减曲线示意：

音量
1.0 ┤████
    │    ████
    │        ████                  ← Logarithmic（真实世界）
    │            ██████
    │                  ████████████████
0.0 ┤─────────────────────────────────→ 距离
    0    Min                    Max
         Distance               Distance

音量
1.0 ┤████
    │    ████
    │        ████                  ← Linear（更可控）
    │            ████
    │                ████
0.0 ┤─────────────────████─────────→ 距离
    0    Min              Max
         Distance          Distance
```

### 10.4.3 空间音频代码控制

```csharp
using UnityEngine;

/// <summary>
/// 空间音频设置示例
/// </summary>
public class SpatialAudioDemo : MonoBehaviour
{
    private AudioSource audioSource;

    void Start()
    {
        audioSource = GetComponent<AudioSource>();

        // 设置为 3D 音频
        audioSource.spatialBlend = 1f; // 0 = 2D, 1 = 3D

        // 距离衰减设置
        audioSource.rolloffMode = AudioRolloffMode.Logarithmic;
        audioSource.minDistance = 2f;   // 2 米内全音量
        audioSource.maxDistance = 50f;  // 50 米外无声

        // 多普勒效应（车辆呼啸而过的音调变化）
        audioSource.dopplerLevel = 1f;

        // 声音扩散角度
        audioSource.spread = 60f; // 60 度扩散
    }

    /// <summary>
    /// 动态调整空间混合（如角色进入室内时切换为半 3D）
    /// </summary>
    public void SetIndoorMode(bool isIndoor)
    {
        // 室内时降低空间感，模拟混响填充的空间
        audioSource.spatialBlend = isIndoor ? 0.5f : 1f;
    }
}
```

---

## 10.5 AudioMixer：专业音频管理

### 10.5.1 创建 AudioMixer

1. Project 窗口右键 → `Create` → `Audio Mixer`
2. 命名为 `MainAudioMixer`
3. 双击打开 Audio Mixer 窗口

[截图：Audio Mixer 窗口的初始状态，显示 Master Group]

### 10.5.2 设置音频分组

我们需要创建以下分组结构：

```
AudioMixer 分组结构：

Master (主音量)
├── BGM        (背景音乐)
├── SFX        (音效)
│   ├── Combat     (战斗音效)
│   ├── Footsteps  (脚步声)
│   └── Interact   (交互音效)
├── UI         (界面音效)
├── Environment(环境音)
│   ├── Ambient    (氛围音)
│   └── Weather    (天气音效)
└── Voice      (语音/对话)
```

**创建步骤：**
1. 在 Audio Mixer 窗口中，点击 `Groups` 面板的 `+` 按钮
2. 命名新 Group（如 "BGM"）
3. 确保新 Group 是 Master 的子 Group
4. 重复以上步骤创建所有分组

[截图：Audio Mixer 窗口中完成的分组结构和推子（Fader）界面]

### 10.5.3 通过代码控制 Mixer 音量

```csharp
using UnityEngine;
using UnityEngine.Audio;

/// <summary>
/// AudioMixer 音量控制
///
/// 注意：AudioMixer 的音量单位是分贝（dB），不是 0-1 的线性值
/// - 0 dB = 原始音量
/// - -80 dB = 静音
/// - +20 dB = 放大（通常不推荐）
///
/// 人耳感知是对数的，所以需要做线性 → 对数转换
/// </summary>
public class MixerVolumeControl : MonoBehaviour
{
    [SerializeField] private AudioMixer mainMixer;

    /// <summary>
    /// 设置指定分组的音量
    /// </summary>
    /// <param name="parameterName">Mixer 中暴露的参数名（如 "BGMVolume"）</param>
    /// <param name="linearVolume">线性音量 0-1</param>
    public void SetVolume(string parameterName, float linearVolume)
    {
        // 将线性值（0-1）转换为分贝值（-80 ~ 0）
        // 公式：dB = 20 * log10(linear)
        // 当 linear = 0 时，log10(0) = 负无穷，所以用 Clamp 限制最小值
        float dB = linearVolume > 0.0001f
            ? 20f * Mathf.Log10(linearVolume)
            : -80f;

        mainMixer.SetFloat(parameterName, dB);
    }

    /// <summary>
    /// 获取指定分组的音量（返回线性值 0-1）
    /// </summary>
    public float GetVolume(string parameterName)
    {
        float dB;
        mainMixer.GetFloat(parameterName, out dB);

        // 分贝转线性：linear = 10^(dB/20)
        return Mathf.Pow(10f, dB / 20f);
    }
}
```

> ⚠️ **重要**：要通过代码控制 Mixer 参数，必须在 Audio Mixer 窗口中**暴露（Expose）**该参数：
> 1. 在 Audio Mixer 窗口中，右键点击某个 Group 的音量推子
> 2. 选择 `Expose 'Volume' to script`
> 3. 在 `Exposed Parameters` 面板中给它命名（如 "BGMVolume"）

[截图：右键点击 Volume 推子 → Expose to Script 的操作步骤]

---

## 10.6 AudioManager 单例模式

### 10.6.1 设计思路

```
AudioManager 职责：

1. 背景音乐管理
   - 播放/停止 BGM
   - 交叉淡入淡出切换
   - BGM 暂停/恢复

2. 音效管理
   - 播放一次性音效
   - 播放位置音效（3D）
   - 音效对象池

3. 音量控制
   - 通过 AudioMixer 控制各分组音量
   - 保存/加载用户音量设置

4. 全局音频控制
   - 暂停所有音频
   - 静音/取消静音
```

### 10.6.2 AudioManager.cs 完整代码

```csharp
using UnityEngine;
using UnityEngine.Audio;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// 音频管理器——游戏全局的音频控制中心
///
/// 功能：
/// - BGM 播放与交叉淡入淡出
/// - 音效播放（2D / 3D）
/// - 音效对象池（避免频繁创建/销毁 AudioSource）
/// - 通过 AudioMixer 控制音量分组
/// - 音量设置的持久化存储
///
/// 类比前端：
/// - 类似一个全局的 Audio Service / Context Provider
/// - 结合了 Howler.js 的音频管理 + Web Audio API 的路由能力
///
/// 使用方式：
/// 1. 创建一个空 GameObject，命名为 "AudioManager"
/// 2. 挂载此脚本
/// 3. 配置 Inspector 中的引用
/// 4. 通过 AudioManager.Instance 访问
/// </summary>
public class AudioManager : MonoBehaviour
{
    #region 单例模式

    public static AudioManager Instance { get; private set; }

    void Awake()
    {
        // 单例保护：如果已存在实例，销毁自己
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        // 切换场景时不销毁（类比前端：全局状态不随路由变化而丢失）
        DontDestroyOnLoad(gameObject);

        // 初始化
        Initialize();
    }

    #endregion

    #region Inspector 配置

    [Header("===== Audio Mixer =====")]
    [Tooltip("主 Audio Mixer")]
    [SerializeField] private AudioMixer mainMixer;

    [Header("===== BGM 设置 =====")]
    [Tooltip("BGM 音频源 A（用于交叉淡入淡出）")]
    [SerializeField] private AudioSource bgmSourceA;

    [Tooltip("BGM 音频源 B（用于交叉淡入淡出）")]
    [SerializeField] private AudioSource bgmSourceB;

    [Tooltip("BGM 默认交叉淡入淡出时长（秒）")]
    [SerializeField] private float bgmCrossfadeDuration = 2f;

    [Header("===== 2D 音效设置 =====")]
    [Tooltip("2D 音效播放源（UI 音效等）")]
    [SerializeField] private AudioSource sfx2DSource;

    [Header("===== 对象池设置 =====")]
    [Tooltip("3D 音效 AudioSource 预制体")]
    [SerializeField] private GameObject sfx3DPrefab;

    [Tooltip("对象池初始大小")]
    [SerializeField] private int poolInitialSize = 10;

    [Tooltip("对象池最大大小")]
    [SerializeField] private int poolMaxSize = 30;

    [Header("===== Mixer 参数名 =====")]
    [Tooltip("Master 音量参数名（需在 Mixer 中暴露）")]
    [SerializeField] private string masterVolumeParam = "MasterVolume";

    [Tooltip("BGM 音量参数名")]
    [SerializeField] private string bgmVolumeParam = "BGMVolume";

    [Tooltip("SFX 音量参数名")]
    [SerializeField] private string sfxVolumeParam = "SFXVolume";

    [Tooltip("UI 音量参数名")]
    [SerializeField] private string uiVolumeParam = "UIVolume";

    [Tooltip("环境音量参数名")]
    [SerializeField] private string envVolumeParam = "EnvironmentVolume";

    #endregion

    #region 私有变量

    // 当前活跃的 BGM 源（A 或 B）
    private AudioSource activeBGMSource;
    private AudioSource inactiveBGMSource;

    // BGM 交叉淡入淡出协程引用（用于中断）
    private Coroutine bgmCrossfadeCoroutine;

    // 当前播放的 BGM 名称
    private string currentBGMName;

    // 3D 音效对象池
    private Queue<AudioSource> sfxPool = new Queue<AudioSource>();
    private List<AudioSource> activeSFXSources = new List<AudioSource>();

    // 音效对象池的父物体（保持 Hierarchy 整洁）
    private Transform sfxPoolParent;

    // 是否全局静音
    private bool isMuted = false;

    // 各分组的音量缓存（线性值 0-1）
    private float masterVolume = 1f;
    private float bgmVolume = 0.8f;
    private float sfxVolume = 1f;
    private float uiVolume = 1f;
    private float envVolume = 0.7f;

    #endregion

    #region 初始化

    /// <summary>
    /// 初始化音频管理器
    /// </summary>
    private void Initialize()
    {
        // 设置 BGM 音频源的初始状态
        if (bgmSourceA != null)
        {
            bgmSourceA.loop = true;
            bgmSourceA.playOnAwake = false;
            bgmSourceA.volume = 0f;
        }

        if (bgmSourceB != null)
        {
            bgmSourceB.loop = true;
            bgmSourceB.playOnAwake = false;
            bgmSourceB.volume = 0f;
        }

        // A 为默认活跃源
        activeBGMSource = bgmSourceA;
        inactiveBGMSource = bgmSourceB;

        // 创建对象池父物体
        GameObject poolParent = new GameObject("SFX_Pool");
        poolParent.transform.SetParent(transform);
        sfxPoolParent = poolParent.transform;

        // 初始化对象池
        InitializeSFXPool();

        // 加载保存的音量设置
        LoadVolumeSettings();
    }

    /// <summary>
    /// 初始化 3D 音效对象池
    /// 类比前端：类似预创建一批 DOM 元素放入"池"中复用，
    /// 避免频繁的 document.createElement + appendChild
    /// </summary>
    private void InitializeSFXPool()
    {
        for (int i = 0; i < poolInitialSize; i++)
        {
            AudioSource source = CreatePooledAudioSource();
            sfxPool.Enqueue(source);
        }

        Debug.Log($"[AudioManager] 音效对象池初始化完成，大小: {poolInitialSize}");
    }

    /// <summary>
    /// 创建一个池化的 AudioSource
    /// </summary>
    private AudioSource CreatePooledAudioSource()
    {
        GameObject obj;

        if (sfx3DPrefab != null)
        {
            obj = Instantiate(sfx3DPrefab, sfxPoolParent);
        }
        else
        {
            obj = new GameObject("SFX_Pooled");
            obj.transform.SetParent(sfxPoolParent);
            AudioSource source = obj.AddComponent<AudioSource>();
            source.playOnAwake = false;
            source.spatialBlend = 1f; // 默认 3D
        }

        obj.SetActive(false);
        return obj.GetComponent<AudioSource>();
    }

    #endregion

    #region BGM（背景音乐）管理

    /// <summary>
    /// 播放背景音乐（带交叉淡入淡出）
    /// </summary>
    /// <param name="clip">音乐剪辑</param>
    /// <param name="fadeDuration">淡入淡出时长（-1 使用默认值）</param>
    public void PlayBGM(AudioClip clip, float fadeDuration = -1f)
    {
        if (clip == null)
        {
            Debug.LogWarning("[AudioManager] BGM clip 为 null！");
            return;
        }

        // 如果已经在播放相同的 BGM，跳过
        if (currentBGMName == clip.name && activeBGMSource.isPlaying)
        {
            return;
        }

        currentBGMName = clip.name;

        float duration = fadeDuration >= 0 ? fadeDuration : bgmCrossfadeDuration;

        // 中断正在进行的交叉淡入淡出
        if (bgmCrossfadeCoroutine != null)
        {
            StopCoroutine(bgmCrossfadeCoroutine);
        }

        // 交换活跃源
        AudioSource previousSource = activeBGMSource;
        AudioSource newSource = inactiveBGMSource;

        // 设置新音乐
        newSource.clip = clip;
        newSource.Play();

        // 更新引用
        activeBGMSource = newSource;
        inactiveBGMSource = previousSource;

        // 开始交叉淡入淡出
        bgmCrossfadeCoroutine = StartCoroutine(
            CrossfadeBGM(previousSource, newSource, duration));

        Debug.Log($"[AudioManager] 播放 BGM: {clip.name}");
    }

    /// <summary>
    /// 停止背景音乐（淡出）
    /// </summary>
    /// <param name="fadeDuration">淡出时长</param>
    public void StopBGM(float fadeDuration = 1f)
    {
        if (bgmCrossfadeCoroutine != null)
        {
            StopCoroutine(bgmCrossfadeCoroutine);
        }

        bgmCrossfadeCoroutine = StartCoroutine(
            FadeOutBGM(activeBGMSource, fadeDuration));

        currentBGMName = null;
    }

    /// <summary>
    /// 暂停背景音乐
    /// </summary>
    public void PauseBGM()
    {
        activeBGMSource?.Pause();
    }

    /// <summary>
    /// 恢复背景音乐
    /// </summary>
    public void ResumeBGM()
    {
        activeBGMSource?.UnPause();
    }

    /// <summary>
    /// BGM 交叉淡入淡出协程
    /// 旧 BGM 淡出的同时，新 BGM 淡入——实现无缝过渡
    ///
    /// 类比前端：类似两个 <audio> 元素同时做 opacity transition，
    /// 一个从 1→0，另一个从 0→1
    /// </summary>
    private IEnumerator CrossfadeBGM(
        AudioSource fadeOut, AudioSource fadeIn, float duration)
    {
        float elapsed = 0f;
        float startVolumeOut = fadeOut.volume;

        while (elapsed < duration)
        {
            elapsed += Time.unscaledDeltaTime; // 使用 unscaledDeltaTime，暂停游戏时也能淡出
            float t = elapsed / duration;

            // 淡出旧 BGM
            fadeOut.volume = Mathf.Lerp(startVolumeOut, 0f, t);
            // 淡入新 BGM
            fadeIn.volume = Mathf.Lerp(0f, 1f, t);

            yield return null;
        }

        // 确保最终值精确
        fadeOut.volume = 0f;
        fadeOut.Stop();
        fadeIn.volume = 1f;

        bgmCrossfadeCoroutine = null;
    }

    /// <summary>
    /// BGM 淡出协程
    /// </summary>
    private IEnumerator FadeOutBGM(AudioSource source, float duration)
    {
        float startVolume = source.volume;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.unscaledDeltaTime;
            source.volume = Mathf.Lerp(startVolume, 0f, elapsed / duration);
            yield return null;
        }

        source.volume = 0f;
        source.Stop();
        bgmCrossfadeCoroutine = null;
    }

    #endregion

    #region SFX（音效）管理

    /// <summary>
    /// 播放 2D 音效（无空间感，如 UI 点击声）
    /// </summary>
    /// <param name="clip">音效剪辑</param>
    /// <param name="volume">音量（0-1）</param>
    public void PlaySFX2D(AudioClip clip, float volume = 1f)
    {
        if (clip == null || sfx2DSource == null) return;

        sfx2DSource.PlayOneShot(clip, volume);
    }

    /// <summary>
    /// 在指定世界位置播放 3D 音效
    /// 使用对象池，避免频繁创建/销毁 GameObject
    /// </summary>
    /// <param name="clip">音效剪辑</param>
    /// <param name="position">世界坐标位置</param>
    /// <param name="volume">音量（0-1）</param>
    /// <param name="pitch">音调（1=正常）</param>
    /// <param name="minDistance">最小距离</param>
    /// <param name="maxDistance">最大距离</param>
    public void PlaySFX3D(
        AudioClip clip,
        Vector3 position,
        float volume = 1f,
        float pitch = 1f,
        float minDistance = 1f,
        float maxDistance = 50f)
    {
        if (clip == null) return;

        // 从对象池获取 AudioSource
        AudioSource source = GetPooledAudioSource();

        // 配置 AudioSource
        source.transform.position = position;
        source.clip = clip;
        source.volume = volume;
        source.pitch = pitch;
        source.spatialBlend = 1f; // 3D
        source.minDistance = minDistance;
        source.maxDistance = maxDistance;
        source.gameObject.SetActive(true);

        // 播放
        source.Play();

        // 记录活跃的音效源
        activeSFXSources.Add(source);

        // 播放完毕后自动回收到池中
        StartCoroutine(ReturnToPoolAfterPlay(source, clip.length / pitch));
    }

    /// <summary>
    /// 播放随机音调的音效（避免重复感）
    /// 适用于脚步声、枪声等频繁播放的音效
    /// </summary>
    /// <param name="clip">音效剪辑</param>
    /// <param name="position">世界坐标位置</param>
    /// <param name="volume">音量</param>
    /// <param name="pitchMin">最小音调</param>
    /// <param name="pitchMax">最大音调</param>
    public void PlaySFXRandomPitch(
        AudioClip clip,
        Vector3 position,
        float volume = 1f,
        float pitchMin = 0.9f,
        float pitchMax = 1.1f)
    {
        float randomPitch = Random.Range(pitchMin, pitchMax);
        PlaySFX3D(clip, position, volume, randomPitch);
    }

    /// <summary>
    /// 播放随机选取的音效（从多个变体中随机选一个）
    /// 适用于需要多种变体的音效（如不同的脚步声）
    /// </summary>
    /// <param name="clips">音效剪辑数组</param>
    /// <param name="position">世界坐标位置</param>
    /// <param name="volume">音量</param>
    public void PlayRandomSFX(
        AudioClip[] clips,
        Vector3 position,
        float volume = 1f)
    {
        if (clips == null || clips.Length == 0) return;

        AudioClip clip = clips[Random.Range(0, clips.Length)];
        PlaySFXRandomPitch(clip, position, volume);
    }

    #endregion

    #region 对象池管理

    /// <summary>
    /// 从对象池获取一个可用的 AudioSource
    /// 类比前端：类似从连接池获取数据库连接
    /// </summary>
    private AudioSource GetPooledAudioSource()
    {
        AudioSource source;

        if (sfxPool.Count > 0)
        {
            // 从池中取出一个
            source = sfxPool.Dequeue();
        }
        else if (activeSFXSources.Count < poolMaxSize)
        {
            // 池为空但未达上限，创建新的
            source = CreatePooledAudioSource();
            Debug.Log($"[AudioManager] 对象池扩展，当前总数: {activeSFXSources.Count + sfxPool.Count + 1}");
        }
        else
        {
            // 已达上限，强制回收最早的一个
            source = activeSFXSources[0];
            activeSFXSources.RemoveAt(0);
            source.Stop();
            Debug.LogWarning("[AudioManager] 对象池已满，强制回收最早的音效源");
        }

        return source;
    }

    /// <summary>
    /// 播放完毕后将 AudioSource 回收到池中
    /// </summary>
    private IEnumerator ReturnToPoolAfterPlay(AudioSource source, float delay)
    {
        // 等待音效播放完毕（加一小段缓冲）
        yield return new WaitForSeconds(delay + 0.1f);

        // 回收
        if (source != null)
        {
            source.Stop();
            source.clip = null;
            source.gameObject.SetActive(false);
            activeSFXSources.Remove(source);
            sfxPool.Enqueue(source);
        }
    }

    #endregion

    #region 音量控制

    /// <summary>
    /// 设置主音量
    /// </summary>
    /// <param name="volume">线性音量 0-1</param>
    public void SetMasterVolume(float volume)
    {
        masterVolume = Mathf.Clamp01(volume);
        ApplyVolumeToMixer(masterVolumeParam, masterVolume);
        SaveVolumeSettings();
    }

    /// <summary>
    /// 设置 BGM 音量
    /// </summary>
    public void SetBGMVolume(float volume)
    {
        bgmVolume = Mathf.Clamp01(volume);
        ApplyVolumeToMixer(bgmVolumeParam, bgmVolume);
        SaveVolumeSettings();
    }

    /// <summary>
    /// 设置音效音量
    /// </summary>
    public void SetSFXVolume(float volume)
    {
        sfxVolume = Mathf.Clamp01(volume);
        ApplyVolumeToMixer(sfxVolumeParam, sfxVolume);
        SaveVolumeSettings();
    }

    /// <summary>
    /// 设置 UI 音效音量
    /// </summary>
    public void SetUIVolume(float volume)
    {
        uiVolume = Mathf.Clamp01(volume);
        ApplyVolumeToMixer(uiVolumeParam, uiVolume);
        SaveVolumeSettings();
    }

    /// <summary>
    /// 设置环境音量
    /// </summary>
    public void SetEnvironmentVolume(float volume)
    {
        envVolume = Mathf.Clamp01(volume);
        ApplyVolumeToMixer(envVolumeParam, envVolume);
        SaveVolumeSettings();
    }

    /// <summary>
    /// 获取各分组的音量值
    /// </summary>
    public float GetMasterVolume() => masterVolume;
    public float GetBGMVolume() => bgmVolume;
    public float GetSFXVolume() => sfxVolume;
    public float GetUIVolume() => uiVolume;
    public float GetEnvironmentVolume() => envVolume;

    /// <summary>
    /// 将线性音量值应用到 AudioMixer
    /// </summary>
    private void ApplyVolumeToMixer(string parameterName, float linearVolume)
    {
        if (mainMixer == null) return;

        // 线性值 → 分贝值
        // 人耳对音量的感知是对数的，所以需要转换
        float dB = linearVolume > 0.0001f
            ? 20f * Mathf.Log10(linearVolume)
            : -80f; // 完全静音

        mainMixer.SetFloat(parameterName, dB);
    }

    /// <summary>
    /// 全局静音/取消静音
    /// </summary>
    public void ToggleMute()
    {
        isMuted = !isMuted;

        if (isMuted)
        {
            // 静音：将 Master 音量设为 -80dB
            mainMixer.SetFloat(masterVolumeParam, -80f);
        }
        else
        {
            // 取消静音：恢复之前的音量
            ApplyVolumeToMixer(masterVolumeParam, masterVolume);
        }
    }

    /// <summary>
    /// 获取当前是否静音
    /// </summary>
    public bool IsMuted() => isMuted;

    #endregion

    #region 设置持久化

    /// <summary>
    /// 保存音量设置到 PlayerPrefs
    /// 类比前端：localStorage.setItem('audioSettings', JSON.stringify(settings))
    /// </summary>
    private void SaveVolumeSettings()
    {
        PlayerPrefs.SetFloat("Audio_Master", masterVolume);
        PlayerPrefs.SetFloat("Audio_BGM", bgmVolume);
        PlayerPrefs.SetFloat("Audio_SFX", sfxVolume);
        PlayerPrefs.SetFloat("Audio_UI", uiVolume);
        PlayerPrefs.SetFloat("Audio_Env", envVolume);
        PlayerPrefs.Save();
    }

    /// <summary>
    /// 从 PlayerPrefs 加载音量设置
    /// 类比前端：JSON.parse(localStorage.getItem('audioSettings'))
    /// </summary>
    private void LoadVolumeSettings()
    {
        masterVolume = PlayerPrefs.GetFloat("Audio_Master", 1f);
        bgmVolume = PlayerPrefs.GetFloat("Audio_BGM", 0.8f);
        sfxVolume = PlayerPrefs.GetFloat("Audio_SFX", 1f);
        uiVolume = PlayerPrefs.GetFloat("Audio_UI", 1f);
        envVolume = PlayerPrefs.GetFloat("Audio_Env", 0.7f);

        // 应用加载的设置
        ApplyVolumeToMixer(masterVolumeParam, masterVolume);
        ApplyVolumeToMixer(bgmVolumeParam, bgmVolume);
        ApplyVolumeToMixer(sfxVolumeParam, sfxVolume);
        ApplyVolumeToMixer(uiVolumeParam, uiVolume);
        ApplyVolumeToMixer(envVolumeParam, envVolume);

        Debug.Log("[AudioManager] 音量设置已加载");
    }

    #endregion

    #region 全局控制

    /// <summary>
    /// 暂停所有音频（游戏暂停时调用）
    /// </summary>
    public void PauseAll()
    {
        AudioListener.pause = true;
    }

    /// <summary>
    /// 恢复所有音频
    /// </summary>
    public void ResumeAll()
    {
        AudioListener.pause = false;
    }

    /// <summary>
    /// 设置全局音频暂停状态
    /// 注意：这会影响场景中所有 AudioSource
    /// </summary>
    public void SetGlobalPause(bool paused)
    {
        AudioListener.pause = paused;
    }

    #endregion

    #region 辅助方法

    /// <summary>
    /// 清理——在场景切换时调用
    /// </summary>
    public void Cleanup()
    {
        // 停止所有活跃的音效
        foreach (var source in activeSFXSources)
        {
            if (source != null)
            {
                source.Stop();
                source.gameObject.SetActive(false);
                sfxPool.Enqueue(source);
            }
        }
        activeSFXSources.Clear();
    }

    void OnDestroy()
    {
        if (Instance == this)
        {
            Instance = null;
        }
    }

    #endregion
}
```

---

## 10.7 音频遮挡基础

### 10.7.1 什么是音频遮挡

当声源和听者之间有墙壁或障碍物时，声音应该被减弱和滤波——这就是音频遮挡（Audio Occlusion）。

```
音频遮挡示意：

无遮挡：                       有遮挡：
                                     ┌──────────┐
  🔊 ──────────→ 👂              🔊 ──│── 墙壁 ──│──→ 👂
  音量: 100%                          └──────────┘
  频率: 完整                     音量: 30%
                               频率: 低频为主（高频被墙壁吸收）
```

### 10.7.2 简单的射线检测遮挡

```csharp
using UnityEngine;

/// <summary>
/// 简单的音频遮挡检测
/// 使用射线检测判断声源和听者之间是否有障碍物
/// </summary>
public class SimpleAudioOcclusion : MonoBehaviour
{
    private AudioSource audioSource;
    private AudioLowPassFilter lowPassFilter; // 低通滤波器

    [SerializeField] private float maxVolume = 1f;
    [SerializeField] private float occludedVolume = 0.2f;   // 被遮挡时的音量
    [SerializeField] private float occludedCutoff = 800f;   // 被遮挡时的低通截止频率
    [SerializeField] private float normalCutoff = 22000f;   // 正常时的截止频率（全频）
    [SerializeField] private LayerMask occlusionMask;        // 遮挡检测层

    void Start()
    {
        audioSource = GetComponent<AudioSource>();

        // 添加低通滤波器（模拟墙壁阻隔高频声音）
        lowPassFilter = gameObject.AddComponent<AudioLowPassFilter>();
        lowPassFilter.cutoffFrequency = normalCutoff;
    }

    void Update()
    {
        if (Camera.main == null) return;

        Transform listener = Camera.main.transform;
        Vector3 direction = listener.position - transform.position;
        float distance = direction.magnitude;

        // 发射射线检测遮挡
        bool isOccluded = Physics.Raycast(
            transform.position, direction.normalized,
            distance, occlusionMask);

        // 平滑过渡音量和频率
        float targetVolume = isOccluded ? occludedVolume : maxVolume;
        float targetCutoff = isOccluded ? occludedCutoff : normalCutoff;

        audioSource.volume = Mathf.Lerp(
            audioSource.volume, targetVolume, Time.deltaTime * 5f);
        lowPassFilter.cutoffFrequency = Mathf.Lerp(
            lowPassFilter.cutoffFrequency, targetCutoff, Time.deltaTime * 5f);
    }
}
```

---

## 10.8 实际应用场景

### 10.8.1 在其他系统中使用 AudioManager

```csharp
using UnityEngine;

/// <summary>
/// 示例：在角色控制器中播放脚步声
/// </summary>
public class PlayerFootsteps : MonoBehaviour
{
    [Header("脚步声音效")]
    [SerializeField] private AudioClip[] grassFootsteps;  // 草地脚步
    [SerializeField] private AudioClip[] stoneFootsteps;  // 石头地面脚步
    [SerializeField] private AudioClip[] woodFootsteps;   // 木板脚步

    [Header("设置")]
    [SerializeField] private float footstepVolume = 0.6f;
    [SerializeField] private float walkInterval = 0.5f;   // 走路间隔
    [SerializeField] private float runInterval = 0.3f;    // 跑步间隔

    private float footstepTimer;
    private CharacterController controller;

    void Start()
    {
        controller = GetComponent<CharacterController>();
    }

    void Update()
    {
        if (!controller.isGrounded) return;

        float speed = controller.velocity.magnitude;
        if (speed < 0.1f) return;

        // 根据速度选择间隔
        float interval = speed > 4f ? runInterval : walkInterval;

        footstepTimer -= Time.deltaTime;
        if (footstepTimer <= 0f)
        {
            PlayFootstep();
            footstepTimer = interval;
        }
    }

    /// <summary>
    /// 播放脚步声
    /// 根据地面材质选择不同的音效组
    /// </summary>
    private void PlayFootstep()
    {
        // 射线检测脚下地面材质
        AudioClip[] clips = GetFootstepClips();

        if (clips != null && clips.Length > 0)
        {
            AudioManager.Instance?.PlayRandomSFX(
                clips, transform.position, footstepVolume);
        }
    }

    /// <summary>
    /// 根据地面类型获取对应的脚步声组
    /// </summary>
    private AudioClip[] GetFootstepClips()
    {
        // 向下发射射线检测地面
        RaycastHit hit;
        if (Physics.Raycast(transform.position, Vector3.down, out hit, 2f))
        {
            // 根据 Tag 或材质判断地面类型
            if (hit.collider.CompareTag("Grass"))
                return grassFootsteps;
            else if (hit.collider.CompareTag("Stone"))
                return stoneFootsteps;
            else if (hit.collider.CompareTag("Wood"))
                return woodFootsteps;
        }

        // 默认返回草地脚步声
        return grassFootsteps;
    }
}

/// <summary>
/// 示例：战斗系统中的音效
/// </summary>
public class CombatAudio : MonoBehaviour
{
    [Header("战斗音效")]
    [SerializeField] private AudioClip[] swordSwingClips;
    [SerializeField] private AudioClip[] hitClips;
    [SerializeField] private AudioClip[] deathClips;
    [SerializeField] private AudioClip levelUpClip;

    /// <summary>
    /// 挥剑时调用（由 Animation Event 触发）
    /// </summary>
    public void OnSwordSwing()
    {
        AudioManager.Instance?.PlayRandomSFX(
            swordSwingClips, transform.position, 0.7f);
    }

    /// <summary>
    /// 命中时调用
    /// </summary>
    public void OnHit(Vector3 hitPosition)
    {
        AudioManager.Instance?.PlayRandomSFX(
            hitClips, hitPosition, 0.8f);
    }

    /// <summary>
    /// 角色死亡时调用
    /// </summary>
    public void OnDeath()
    {
        AudioManager.Instance?.PlayRandomSFX(
            deathClips, transform.position, 1f);
    }

    /// <summary>
    /// 升级时调用（2D 音效，无空间感）
    /// </summary>
    public void OnLevelUp()
    {
        AudioManager.Instance?.PlaySFX2D(levelUpClip, 1f);
    }
}

/// <summary>
/// 示例：环境音触发区域
/// 进入特定区域时改变 BGM 和环境音
/// </summary>
[RequireComponent(typeof(Collider))]
public class MusicZone : MonoBehaviour
{
    [Header("此区域的 BGM")]
    [SerializeField] private AudioClip zoneBGM;

    [Header("过渡设置")]
    [SerializeField] private float crossfadeDuration = 3f;

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            // 切换到此区域的 BGM
            AudioManager.Instance?.PlayBGM(zoneBGM, crossfadeDuration);
            Debug.Log($"[MusicZone] 进入区域，切换 BGM: {zoneBGM.name}");
        }
    }
}
```

---

## 10.9 手游音频优化建议

### 10.9.1 内存优化

```
音频内存优化检查清单：

☐ 短音效（<1s）使用 Force To Mono（减少一半内存）
☐ BGM 使用 Streaming 加载方式（不占运行时内存）
☐ 压缩格式选择 Vorbis（比 PCM 小 5-10 倍）
☐ 不需要的高采样率降低到 22050 Hz（人声和音效够用）
☐ 及时卸载不需要的 AudioClip（Resources.UnloadUnusedAssets）
☐ 对象池避免频繁的 Instantiate/Destroy
```

### 10.9.2 性能优化

```
音频性能优化检查清单：

☐ 同时播放的 AudioSource 数量控制在 32 个以内
☐ 远处听不到的声音及时停止播放
☐ 使用 AudioSource 的 Priority 设置（0=最高，256=最低）
☐ 避免每帧调用 AudioSource.Play()（用 PlayOneShot 代替）
☐ 3D 音效的 Max Distance 设置合理（不要太大）
☐ 使用 AudioMixer 的 Suspend 功能关闭不活跃的分组
```

### 10.9.3 移动端特殊注意

```csharp
/// <summary>
/// 移动端音频注意事项
/// </summary>
public class MobileAudioNotes : MonoBehaviour
{
    void Start()
    {
        // 1. iOS 静音开关
        // iOS 设备有物理静音开关，Unity 默认会尊重它
        // 如果你的游戏在静音模式下仍需要播放音频：
        // 在 Player Settings → iOS → Other Settings 中设置

        // 2. 后台音频
        // 默认情况下，App 切到后台时音频会停止
        // 如果需要后台播放（如音乐类游戏），需要特殊设置

        // 3. 音频会话
        // iOS 的音频会话可能与其他 App 冲突
        // 比如用户在听音乐时启动你的游戏

        // 4. Android 音频延迟
        // Android 设备的音频延迟通常比 iOS 大
        // 对于节奏类游戏需要特别优化
    }
}
```

---

## 10.10 本章小结

```
音频系统知识图谱：

Unity 音频系统
├── 核心组件
│   ├── AudioListener（听者，挂在相机上）
│   ├── AudioSource（播放器，挂在发声物体上）
│   └── AudioClip（音频文件资产）
│
├── 空间音频
│   ├── 2D 音频（Spatial Blend = 0，BGM/UI）
│   ├── 3D 音频（Spatial Blend = 1，环境/交互）
│   ├── 距离衰减曲线（Logarithmic / Linear）
│   └── 音频遮挡（Occlusion，射线检测 + 低通滤波）
│
├── AudioMixer（音频路由）
│   ├── Master → BGM / SFX / UI / Environment
│   ├── 音量控制（线性 → 分贝转换）
│   └── 暴露参数给脚本
│
├── AudioManager（代码架构）
│   ├── 单例模式（DontDestroyOnLoad）
│   ├── BGM 管理（交叉淡入淡出）
│   ├── SFX 管理（对象池）
│   └── 音量持久化（PlayerPrefs）
│
└── 优化
    ├── 对象池（避免频繁 Instantiate）
    ├── 导入设置（压缩、单声道、加载方式）
    └── 播放数量限制
```

---

## 练习题

### 练习 1：环境音系统（难度：⭐）
在场景中创建几个环境音发声源：
- 一条小溪（循环播放水流声，3D 音效）
- 一棵树上的鸟叫（随机间隔播放，3D 音效）
- 篝火（循环播放火焰声，3D 音效 + 粒子效果）
  配置合适的 3D 距离衰减参数。

### 练习 2：BGM 区域切换（难度：⭐⭐）
在场景中创建三个区域（使用 Trigger Collider）：
- 村庄区域：温馨的村庄 BGM
- 森林区域：神秘的森林 BGM
- 战斗区域：紧张的战斗 BGM
  实现角色进入不同区域时 BGM 自动交叉淡入淡出切换。

### 练习 3：完善音频设置面板（难度：⭐⭐）
在主菜单的设置面板中添加完整的音频控制：
- Master 音量滑块
- BGM 音量滑块
- SFX 音量滑块
- 静音 Toggle 开关
- 音频测试按钮（点击播放一个示例音效来试听音量）
  所有设置保存到 PlayerPrefs。

### 练习 4：动态音乐系统（难度：⭐⭐⭐）
实现一个简单的动态音乐系统：
- 准备同一首曲子的两个版本：平静版和紧张版
- 角色在安全区域时播放平静版
- 检测到敌人时平滑过渡到紧张版
- 敌人消灭后渐渐回到平静版
  提示：使用两个 AudioSource 同时播放两个版本，通过控制各自音量实现混合。

---

## 下一章预告

**第 11 章：URP 光照与渲染管线** 将学习：
- URP（Universal Render Pipeline）的设置与配置
- 光源类型（方向光、点光、聚光灯、面光）
- 实时 vs 烘焙光照
- 后处理效果（Bloom、Color Grading、景深等）
- Shader Graph 入门
- 材质与贴图系统
- 让你的 3D 世界从"技术验证"升级为"视觉享受"！

---

> **版权声明**：本教程为 BellLab 原创内容，仅供学习使用。
