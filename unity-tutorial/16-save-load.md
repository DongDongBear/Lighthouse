# 第 16 章：存档与读档系统

> 让玩家的进度永不丢失——从简单的 PlayerPrefs 到完整的多槽位存档系统。

## 本章目标

完成本章学习后，你将能够：

1. 理解 Unity 中数据持久化的多种方案及其适用场景
2. 使用 PlayerPrefs 存储简单的偏好设置数据
3. 设计合理的存档数据结构（SaveData 类）
4. 使用 JsonUtility 和 Newtonsoft.Json 进行 JSON 序列化/反序列化
5. 通过 System.IO 将存档写入/读取文件（Application.persistentDataPath）
6. 实现 SaveManager 单例管理器，支持多槽位存档
7. 实现自动存档系统
8. 了解存档文件加密的基础方法
9. 处理存档版本迁移（当存档格式发生变更时）
10. 理解 ScriptableObject 运行时数据与存档数据的关系

## 预计学习时间

**4 小时**

---

## 16.1 数据持久化概览：从 Web 到游戏

### 16.1.1 前端类比：你已经很熟悉的持久化方案

作为前端/全栈开发者，你一定用过这些方案：

| Web 方案 | Unity 对应方案 | 适用场景 |
|----------|---------------|----------|
| `localStorage` | `PlayerPrefs` | 简单键值对，偏好设置 |
| `IndexedDB` | JSON 文件 + `System.IO` | 结构化数据存储 |
| `Cookie` | 无直接对应 | Web 特有 |
| REST API + 数据库 | 云存档（PlayFab/Firebase） | 跨设备同步 |
| `JSON.stringify()` / `JSON.parse()` | `JsonUtility` / `Newtonsoft.Json` | 序列化/反序列化 |

> 💡 **前端类比**：`PlayerPrefs` 就像 `localStorage`——简单好用但只适合小量数据，不适合存储复杂的游戏状态。JSON 文件存档就像前端把数据 `JSON.stringify()` 后写入 `IndexedDB`。

### 16.1.2 Unity 数据持久化方案对比

```
持久化方案选择：

PlayerPrefs（最简单）
├── 优点：API 简单，跨平台自动适配
├── 缺点：只支持 int/float/string，明文存储，性能差（大量数据）
└── 适用：音量、语言、画质等偏好设置

JSON 文件（推荐）
├── 优点：结构灵活，可读性好，易于调试
├── 缺点：需要手动管理文件 I/O
└── 适用：游戏存档、关卡数据、配置文件

Binary 序列化（高级）
├── 优点：文件小，加载快，不易被篡改
├── 缺点：不可读，版本迁移困难
└── 适用：大量数据，反作弊需求

SQLite（数据库方案）
├── 优点：查询灵活，支持事务
├── 缺点：需要额外库，复杂度高
└── 适用：超大量结构化数据（MMO 类游戏）
```

[截图：Unity 中不同平台 persistentDataPath 的实际路径对比]

---

## 16.2 PlayerPrefs：最简单的数据存储

### 16.2.1 PlayerPrefs 基础用法

`PlayerPrefs` 是 Unity 内置的键值对存储，就像浏览器的 `localStorage`：

```csharp
using UnityEngine;

/// <summary>
/// PlayerPrefs 基础用法演示
/// 类比前端的 localStorage：简单的键值对存储
/// </summary>
public class PlayerPrefsDemo : MonoBehaviour
{
    void Start()
    {
        // ===== 写入数据 =====
        // 类似 localStorage.setItem("key", "value")

        // 存储整数（比如音量级别 0-10）
        PlayerPrefs.SetInt("MusicVolume", 7);

        // 存储浮点数（比如灵敏度 0.0 - 1.0）
        PlayerPrefs.SetFloat("MouseSensitivity", 0.5f);

        // 存储字符串（比如玩家昵称）
        PlayerPrefs.SetString("PlayerName", "勇者小明");

        // 重要：调用 Save() 确保数据写入磁盘
        // 类似于确保 localStorage 的更改被持久化
        PlayerPrefs.Save();

        // ===== 读取数据 =====
        // 类似 localStorage.getItem("key")

        // 第二个参数是默认值（key 不存在时返回）
        int volume = PlayerPrefs.GetInt("MusicVolume", 5);
        float sensitivity = PlayerPrefs.GetFloat("MouseSensitivity", 0.5f);
        string playerName = PlayerPrefs.GetString("PlayerName", "默认玩家");

        Debug.Log($"音量: {volume}, 灵敏度: {sensitivity}, 昵称: {playerName}");

        // ===== 检查和删除 =====

        // 检查 key 是否存在（localStorage 没有直接对应方法）
        if (PlayerPrefs.HasKey("MusicVolume"))
        {
            Debug.Log("音量设置已保存");
        }

        // 删除指定 key
        // 类似 localStorage.removeItem("key")
        PlayerPrefs.DeleteKey("PlayerName");

        // 删除所有数据
        // 类似 localStorage.clear()
        // PlayerPrefs.DeleteAll(); // 谨慎使用！
    }
}
```

### 16.2.2 实用的游戏设置管理器

```csharp
using UnityEngine;
using UnityEngine.Audio;

/// <summary>
/// 游戏设置管理器——使用 PlayerPrefs 存储偏好设置
/// 这是 PlayerPrefs 最合适的使用场景
/// </summary>
public class GameSettings : MonoBehaviour
{
    // 单例模式，全局唯一
    public static GameSettings Instance { get; private set; }

    [Header("音频混合器引用")]
    public AudioMixer audioMixer;

    // ===== 设置项 =====

    // 音乐音量 (0.0 - 1.0)
    public float MusicVolume
    {
        get => PlayerPrefs.GetFloat("Settings_MusicVolume", 0.8f);
        set
        {
            PlayerPrefs.SetFloat("Settings_MusicVolume", value);
            // 应用到音频混合器（将 0-1 转换为分贝 -80dB ~ 0dB）
            float dB = value > 0.001f ? Mathf.Log10(value) * 20f : -80f;
            audioMixer?.SetFloat("MusicVolume", dB);
        }
    }

    // 音效音量 (0.0 - 1.0)
    public float SFXVolume
    {
        get => PlayerPrefs.GetFloat("Settings_SFXVolume", 0.8f);
        set
        {
            PlayerPrefs.SetFloat("Settings_SFXVolume", value);
            float dB = value > 0.001f ? Mathf.Log10(value) * 20f : -80f;
            audioMixer?.SetFloat("SFXVolume", dB);
        }
    }

    // 画质等级 (0=低, 1=中, 2=高)
    public int QualityLevel
    {
        get => PlayerPrefs.GetInt("Settings_Quality", 1);
        set
        {
            PlayerPrefs.SetInt("Settings_Quality", value);
            QualitySettings.SetQualityLevel(value);
        }
    }

    // 语言设置
    public string Language
    {
        get => PlayerPrefs.GetString("Settings_Language", "zh-CN");
        set => PlayerPrefs.SetString("Settings_Language", value);
    }

    // 摇杆灵敏度
    public float JoystickSensitivity
    {
        get => PlayerPrefs.GetFloat("Settings_JoystickSensitivity", 1.0f);
        set => PlayerPrefs.SetFloat("Settings_JoystickSensitivity", Mathf.Clamp(value, 0.1f, 3.0f));
    }

    // 是否显示 FPS
    public bool ShowFPS
    {
        get => PlayerPrefs.GetInt("Settings_ShowFPS", 0) == 1;
        set => PlayerPrefs.SetInt("Settings_ShowFPS", value ? 1 : 0);
    }

    void Awake()
    {
        // 单例初始化
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        // 启动时应用所有已保存的设置
        ApplyAllSettings();
    }

    /// <summary>
    /// 将所有设置应用到游戏中
    /// </summary>
    void ApplyAllSettings()
    {
        // 触发每个属性的 set 方法来应用设置
        MusicVolume = MusicVolume;
        SFXVolume = SFXVolume;
        QualityLevel = QualityLevel;
    }

    /// <summary>
    /// 保存所有设置到磁盘
    /// 类似于前端调用 flush 确保数据持久化
    /// </summary>
    public void SaveAll()
    {
        PlayerPrefs.Save();
        Debug.Log("游戏设置已保存");
    }

    /// <summary>
    /// 重置所有设置为默认值
    /// </summary>
    public void ResetToDefaults()
    {
        // 只删除设置相关的 key，不影响其他 PlayerPrefs 数据
        PlayerPrefs.DeleteKey("Settings_MusicVolume");
        PlayerPrefs.DeleteKey("Settings_SFXVolume");
        PlayerPrefs.DeleteKey("Settings_Quality");
        PlayerPrefs.DeleteKey("Settings_Language");
        PlayerPrefs.DeleteKey("Settings_JoystickSensitivity");
        PlayerPrefs.DeleteKey("Settings_ShowFPS");
        PlayerPrefs.Save();

        ApplyAllSettings();
        Debug.Log("设置已重置为默认值");
    }
}
```

[截图：PlayerPrefs 在 macOS 上的实际存储位置（~/Library/Preferences）]

> ⚠️ **注意**：PlayerPrefs 在不同平台的存储位置不同：
> - **macOS**: `~/Library/Preferences/unity.公司名.产品名.plist`
> - **Windows**: 注册表 `HKCU\Software\公司名\产品名`
> - **iOS**: `NSUserDefaults`
> - **Android**: `SharedPreferences`

### 16.2.3 PlayerPrefs 的局限性

```
⚠️ PlayerPrefs 不适合用来存储：

1. 复杂对象（玩家背包、任务进度）——只支持 int/float/string
2. 大量数据——性能会很差
3. 敏感数据——明文存储，玩家可以轻易修改
4. 需要多槽位的数据——没有分组概念
5. 需要版本迁移的数据——没有版本管理机制

结论：PlayerPrefs 只用于偏好设置，游戏存档请用 JSON 文件方案 ✅
```

---

## 16.3 设计存档数据结构

### 16.3.1 SaveData 类设计

好的存档系统从好的数据结构开始。我们需要考虑：要存什么、怎么组织、怎么扩展。

```csharp
using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// SaveData.cs —— 完整的存档数据结构
///
/// 设计原则（对比前端思维）：
/// 1. 类似 TypeScript 的 interface 定义数据形状
/// 2. 只保存"状态数据"，不保存"引用"和"逻辑"
/// 3. 所有字段必须是可序列化的基础类型
/// 4. 预留版本号字段用于未来的数据迁移
/// </summary>
[Serializable]
public class SaveData
{
    // ===== 元数据 =====

    /// <summary>
    /// 存档版本号——用于版本迁移
    /// 类似前端数据库的 schema version
    /// </summary>
    public int saveVersion = 1;

    /// <summary>
    /// 存档创建时间（UTC 时间戳）
    /// </summary>
    public string createdAt;

    /// <summary>
    /// 最后保存时间
    /// </summary>
    public string lastSavedAt;

    /// <summary>
    /// 总游戏时长（秒）
    /// </summary>
    public float totalPlayTime;

    /// <summary>
    /// 存档槽位编号
    /// </summary>
    public int slotIndex;

    // ===== 玩家数据 =====
    public PlayerSaveData player = new PlayerSaveData();

    // ===== 背包数据 =====
    public InventorySaveData inventory = new InventorySaveData();

    // ===== 任务数据 =====
    public QuestSaveData quests = new QuestSaveData();

    // ===== 世界状态数据 =====
    public WorldStateSaveData worldState = new WorldStateSaveData();

    /// <summary>
    /// 创建一个新的默认存档
    /// 类似前端的 getDefaultState() 工厂方法
    /// </summary>
    public static SaveData CreateDefault()
    {
        return new SaveData
        {
            saveVersion = 1,
            createdAt = DateTime.UtcNow.ToString("o"),
            lastSavedAt = DateTime.UtcNow.ToString("o"),
            totalPlayTime = 0f,
            player = new PlayerSaveData
            {
                playerName = "冒险者",
                level = 1,
                experience = 0,
                maxHealth = 100f,
                currentHealth = 100f,
                maxMana = 50f,
                currentMana = 50f,
                positionX = 0f,
                positionY = 1f,
                positionZ = 0f,
                rotationY = 0f
            }
        };
    }
}

/// <summary>
/// 玩家状态数据
/// </summary>
[Serializable]
public class PlayerSaveData
{
    // 基本信息
    public string playerName;
    public int level;
    public int experience;

    // 生命值和法力值
    public float maxHealth;
    public float currentHealth;
    public float maxMana;
    public float currentMana;

    // 位置信息（Vector3 不能直接序列化为 JSON，所以拆分为 xyz）
    // 类似前端将复杂对象展平为基础类型
    public float positionX;
    public float positionY;
    public float positionZ;

    // 旋转信息（只需要 Y 轴旋转，因为角色一般只水平旋转）
    public float rotationY;

    // 货币
    public int gold;
    public int diamond;

    // 当前装备的武器/防具 ID
    public string equippedWeaponId;
    public string equippedArmorId;
    public string equippedHelmetId;

    // ===== 辅助方法：在 Vector3 和拆分字段之间转换 =====

    /// <summary>
    /// 将 Vector3 位置保存到拆分字段
    /// </summary>
    public void SetPosition(Vector3 pos)
    {
        positionX = pos.x;
        positionY = pos.y;
        positionZ = pos.z;
    }

    /// <summary>
    /// 从拆分字段还原 Vector3 位置
    /// </summary>
    public Vector3 GetPosition()
    {
        return new Vector3(positionX, positionY, positionZ);
    }
}

/// <summary>
/// 背包存档数据
/// </summary>
[Serializable]
public class InventorySaveData
{
    /// <summary>
    /// 背包中的物品列表
    /// 类似前端 state.inventory.items: ItemData[]
    /// </summary>
    public List<SavedItemData> items = new List<SavedItemData>();

    /// <summary>
    /// 背包容量上限
    /// </summary>
    public int maxSlots = 30;
}

/// <summary>
/// 单个物品的存档数据
/// 注意：只保存 ID 和数量等动态数据
/// 物品的名称、描述、图标等静态数据由 ScriptableObject 提供
/// </summary>
[Serializable]
public class SavedItemData
{
    /// <summary>
    /// 物品的唯一标识 ID（对应 ScriptableObject 的 itemId）
    /// </summary>
    public string itemId;

    /// <summary>
    /// 物品数量
    /// </summary>
    public int quantity;

    /// <summary>
    /// 在背包中的槽位索引
    /// </summary>
    public int slotIndex;

    /// <summary>
    /// 物品的附加数据（如武器强化等级、附魔效果等）
    /// 使用 JSON 字符串存储灵活的自定义数据
    /// 类似前端的 Record<string, any>
    /// </summary>
    public string extraDataJson;
}

/// <summary>
/// 任务存档数据
/// </summary>
[Serializable]
public class QuestSaveData
{
    /// <summary>
    /// 正在进行的任务列表
    /// </summary>
    public List<SavedQuestProgress> activeQuests = new List<SavedQuestProgress>();

    /// <summary>
    /// 已完成的任务 ID 列表
    /// </summary>
    public List<string> completedQuestIds = new List<string>();

    /// <summary>
    /// 已失败的任务 ID 列表
    /// </summary>
    public List<string> failedQuestIds = new List<string>();
}

/// <summary>
/// 单个任务的进度数据
/// </summary>
[Serializable]
public class SavedQuestProgress
{
    public string questId;

    /// <summary>
    /// 当前步骤索引
    /// </summary>
    public int currentStep;

    /// <summary>
    /// 各目标的完成数量
    /// key: 目标 ID, value: 当前完成数量
    /// </summary>
    public List<QuestObjectiveProgress> objectives = new List<QuestObjectiveProgress>();
}

/// <summary>
/// 任务目标的进度
/// </summary>
[Serializable]
public class QuestObjectiveProgress
{
    public string objectiveId;
    public int currentCount;
    public int requiredCount;
    public bool isCompleted;
}

/// <summary>
/// 世界状态存档数据
/// </summary>
[Serializable]
public class WorldStateSaveData
{
    /// <summary>
    /// 当前所在场景名称
    /// </summary>
    public string currentSceneName = "MainWorld";

    /// <summary>
    /// 游戏内时间（小时，0-24）
    /// </summary>
    public float gameTimeHours = 8f;

    /// <summary>
    /// 当前天数
    /// </summary>
    public int dayCount = 1;

    /// <summary>
    /// 当前天气状态
    /// </summary>
    public string currentWeather = "Sunny";

    /// <summary>
    /// 已解锁的传送点 ID 列表
    /// </summary>
    public List<string> unlockedTeleportPoints = new List<string>();

    /// <summary>
    /// 已开启的宝箱 ID 列表
    /// </summary>
    public List<string> openedChestIds = new List<string>();

    /// <summary>
    /// 已击败的 Boss ID 列表
    /// </summary>
    public List<string> defeatedBossIds = new List<string>();

    /// <summary>
    /// 已触发的事件/剧情 ID 列表
    /// </summary>
    public List<string> triggeredEventIds = new List<string>();

    /// <summary>
    /// NPC 好感度数据
    /// </summary>
    public List<NPCRelationshipData> npcRelationships = new List<NPCRelationshipData>();
}

/// <summary>
/// NPC 好感度数据
/// </summary>
[Serializable]
public class NPCRelationshipData
{
    public string npcId;
    public int friendshipLevel;
    public int dialogueProgress;
}
```

[截图：SaveData 的数据结构层级示意图]

### 16.3.2 ScriptableObject 运行时数据 vs 存档数据

```csharp
using UnityEngine;

/// <summary>
/// 物品定义——ScriptableObject（静态数据模板）
///
/// 这是"物品是什么"的定义，不需要存档。
/// 类似前端的常量配置或 JSON schema。
/// 存档只保存物品 ID 和数量，加载时通过 ID 查找到这个 SO 获取完整信息。
/// </summary>
[CreateAssetMenu(fileName = "NewItem", menuName = "Game/Item Definition")]
public class ItemDefinition : ScriptableObject
{
    [Header("基础信息")]
    public string itemId;           // 唯一标识，如 "sword_001"
    public string itemName;         // 显示名称，如 "铁剑"
    public string description;      // 物品描述
    public Sprite icon;             // 物品图标

    [Header("属性")]
    public ItemType itemType;       // 物品类型
    public int maxStack = 99;       // 最大堆叠数
    public int sellPrice;           // 售价

    [Header("装备属性（仅装备类型有效）")]
    public int attackBonus;
    public int defenseBonus;
    public int healthBonus;
}

/// <summary>
/// 物品类型枚举
/// </summary>
public enum ItemType
{
    Consumable,     // 消耗品（药水等）
    Equipment,      // 装备
    Material,       // 材料
    QuestItem,      // 任务物品
    Key             // 钥匙类物品
}

/// <summary>
/// 物品数据库——用于通过 ID 查找物品定义
/// 类似前端的 Map<string, ItemDef> 或 Redux 中的 normalized state
/// </summary>
[CreateAssetMenu(fileName = "ItemDatabase", menuName = "Game/Item Database")]
public class ItemDatabase : ScriptableObject
{
    public ItemDefinition[] allItems;

    /// <summary>
    /// 通过 ID 查找物品定义
    /// 类似前端的 items.find(i => i.id === id)
    /// </summary>
    public ItemDefinition GetItemById(string itemId)
    {
        foreach (var item in allItems)
        {
            if (item.itemId == itemId)
                return item;
        }
        Debug.LogWarning($"找不到物品: {itemId}");
        return null;
    }
}
```

> 💡 **前端类比**：这种模式就像前端的 Normalized State Pattern。Redux 推荐用 `{ byId: { [id]: entity }, allIds: string[] }` 来存储数据。ScriptableObject 就是 `byId` 中的完整实体定义，而存档只保存 `id` 和运行时变化的数据（数量、强化等级等）。

---

## 16.4 JSON 序列化方案

### 16.4.1 JsonUtility（Unity 内置）

```csharp
using UnityEngine;

/// <summary>
/// JsonUtility 序列化演示
/// Unity 内置的 JSON 序列化工具
/// 优点：性能好，无需额外依赖
/// 缺点：不支持 Dictionary、不支持多态、不支持属性（只支持字段）
/// </summary>
public class JsonUtilityDemo : MonoBehaviour
{
    void Start()
    {
        // 创建测试数据
        SaveData saveData = SaveData.CreateDefault();
        saveData.player.playerName = "小明";
        saveData.player.gold = 1500;
        saveData.player.SetPosition(new Vector3(10.5f, 0f, -3.2f));

        // ===== 序列化：对象 -> JSON 字符串 =====
        // 类似前端的 JSON.stringify(obj)
        string json = JsonUtility.ToJson(saveData);
        Debug.Log($"序列化结果（紧凑）: {json}");

        // 带缩进的格式化输出（第二个参数 = prettyPrint）
        string prettyJson = JsonUtility.ToJson(saveData, true);
        Debug.Log($"序列化结果（格式化）:\n{prettyJson}");

        // ===== 反序列化：JSON 字符串 -> 对象 =====
        // 类似前端的 JSON.parse(jsonString)
        SaveData loadedData = JsonUtility.FromJson<SaveData>(json);
        Debug.Log($"读取的玩家名: {loadedData.player.playerName}");
        Debug.Log($"读取的位置: {loadedData.player.GetPosition()}");

        // ===== 覆盖式反序列化（填充已有对象） =====
        // 这在 web 中没有直接对应——它会修改已有对象而不是创建新对象
        SaveData existingData = new SaveData();
        JsonUtility.FromJsonOverwrite(json, existingData);
    }
}
```

### 16.4.2 Newtonsoft.Json（功能更强大）

```csharp
// 首先需要安装 Newtonsoft.Json for Unity
// 方法：Unity Package Manager -> Add package by name -> com.unity.nuget.newtonsoft-json

using UnityEngine;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;

/// <summary>
/// Newtonsoft.Json 序列化演示
/// 功能比 JsonUtility 更强大
/// 支持 Dictionary、多态、自定义转换器等
/// </summary>
public class NewtonsoftJsonDemo : MonoBehaviour
{
    void Start()
    {
        // Newtonsoft.Json 支持 Dictionary 序列化
        // JsonUtility 不支持 Dictionary，这是一个重要区别
        var gameFlags = new Dictionary<string, bool>
        {
            { "tutorial_completed", true },
            { "first_boss_defeated", false },
            { "secret_room_found", true }
        };

        // 序列化（功能丰富的选项）
        string json = JsonConvert.SerializeObject(gameFlags, Formatting.Indented);
        Debug.Log($"Dictionary 序列化:\n{json}");

        // 反序列化
        var loadedFlags = JsonConvert.DeserializeObject<Dictionary<string, bool>>(json);
        Debug.Log($"tutorial_completed: {loadedFlags["tutorial_completed"]}");

        // ===== 高级用法：自定义序列化设置 =====
        var settings = new JsonSerializerSettings
        {
            // 格式化输出
            Formatting = Formatting.Indented,

            // null 值处理：忽略 null 字段（减小文件体积）
            NullValueHandling = NullValueHandling.Ignore,

            // 默认值处理：忽略默认值字段
            DefaultValueHandling = DefaultValueHandling.Ignore,

            // 引用循环处理：忽略循环引用
            ReferenceLoopHandling = ReferenceLoopHandling.Ignore
        };

        SaveData saveData = SaveData.CreateDefault();
        string optimizedJson = JsonConvert.SerializeObject(saveData, settings);
        Debug.Log($"优化后的 JSON:\n{optimizedJson}");
    }
}
```

[截图：Package Manager 中安装 Newtonsoft.Json 的步骤]

### 16.4.3 JsonUtility vs Newtonsoft.Json 对比

| 特性 | JsonUtility | Newtonsoft.Json |
|------|------------|-----------------|
| 安装 | 内置，无需安装 | 需通过 Package Manager 安装 |
| 性能 | 更快（原生 C++ 实现） | 稍慢（纯 C# 实现） |
| Dictionary 支持 | 不支持 | 支持 |
| 多态序列化 | 不支持 | 支持 |
| 自定义转换器 | 不支持 | 支持 |
| null 处理 | 有限 | 灵活可配 |
| 属性序列化 | 不支持（只支持字段） | 支持 |
| LINQ to JSON | 无 | 支持（JObject/JArray） |

> 🎯 **最佳实践**：对于简单的游戏存档，`JsonUtility` 足够。如果需要 Dictionary、多态或更灵活的序列化控制，使用 `Newtonsoft.Json`。本教程的完整示例兼容两者。

---

## 16.5 文件 I/O：读写存档文件

### 16.5.1 Application.persistentDataPath

```csharp
using UnityEngine;
using System.IO;

/// <summary>
/// 文件路径和 I/O 基础
/// </summary>
public class FileIODemo : MonoBehaviour
{
    void Start()
    {
        // Application.persistentDataPath 是 Unity 提供的跨平台持久化目录
        // 这个目录在应用卸载前不会被删除
        //
        // 各平台路径：
        // macOS:   ~/Library/Application Support/公司名/产品名/
        // Windows: C:\Users\用户名\AppData\LocalLow\公司名\产品名\
        // iOS:     /var/mobile/Containers/Data/Application/xxx/Documents/
        // Android: /data/data/包名/files/ 或 /storage/emulated/0/Android/data/包名/files/

        string basePath = Application.persistentDataPath;
        Debug.Log($"持久化数据路径: {basePath}");

        // 创建存档目录
        string saveDirectory = Path.Combine(basePath, "Saves");

        // 确保目录存在（类似 Node.js 的 fs.mkdirSync(path, { recursive: true })）
        if (!Directory.Exists(saveDirectory))
        {
            Directory.CreateDirectory(saveDirectory);
            Debug.Log($"创建存档目录: {saveDirectory}");
        }

        // 构建存档文件路径
        string saveFilePath = Path.Combine(saveDirectory, "save_slot_1.json");
        Debug.Log($"存档文件路径: {saveFilePath}");
    }
}
```

### 16.5.2 完整的文件读写工具类

```csharp
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

/// <summary>
/// 文件读写工具类
///
/// 类比前端：
/// - 写文件 ≈ fs.writeFileSync() 或 IndexedDB.put()
/// - 读文件 ≈ fs.readFileSync() 或 IndexedDB.get()
/// - 加密 ≈ CryptoJS.AES.encrypt()
/// </summary>
public static class FileHelper
{
    /// <summary>
    /// 将文本内容写入文件
    /// </summary>
    /// <param name="filePath">文件完整路径</param>
    /// <param name="content">文件内容</param>
    /// <returns>是否写入成功</returns>
    public static bool WriteToFile(string filePath, string content)
    {
        try
        {
            // 确保目录存在
            string directory = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            // 写入文件（类似 Node.js 的 fs.writeFileSync）
            File.WriteAllText(filePath, content, Encoding.UTF8);
            Debug.Log($"文件写入成功: {filePath}");
            return true;
        }
        catch (Exception e)
        {
            Debug.LogError($"文件写入失败: {filePath}\n错误: {e.Message}");
            return false;
        }
    }

    /// <summary>
    /// 从文件读取文本内容
    /// </summary>
    /// <param name="filePath">文件完整路径</param>
    /// <returns>文件内容，失败返回 null</returns>
    public static string ReadFromFile(string filePath)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                Debug.LogWarning($"文件不存在: {filePath}");
                return null;
            }

            // 读取文件（类似 Node.js 的 fs.readFileSync）
            string content = File.ReadAllText(filePath, Encoding.UTF8);
            Debug.Log($"文件读取成功: {filePath}");
            return content;
        }
        catch (Exception e)
        {
            Debug.LogError($"文件读取失败: {filePath}\n错误: {e.Message}");
            return null;
        }
    }

    /// <summary>
    /// 删除文件
    /// </summary>
    public static bool DeleteFile(string filePath)
    {
        try
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                Debug.Log($"文件已删除: {filePath}");
                return true;
            }
            return false;
        }
        catch (Exception e)
        {
            Debug.LogError($"文件删除失败: {filePath}\n错误: {e.Message}");
            return false;
        }
    }

    /// <summary>
    /// 检查文件是否存在
    /// </summary>
    public static bool FileExists(string filePath)
    {
        return File.Exists(filePath);
    }

    // ===== 加密相关 =====

    // 加密密钥（实际项目中应该更安全地管理密钥）
    private static readonly string EncryptionKey = "YourGame_SecretKey_2024!";

    /// <summary>
    /// AES 加密字符串
    /// 类似前端的 CryptoJS.AES.encrypt()
    /// </summary>
    public static string Encrypt(string plainText)
    {
        try
        {
            byte[] keyBytes = Encoding.UTF8.GetBytes(EncryptionKey.PadRight(32).Substring(0, 32));
            byte[] ivBytes = new byte[16]; // 使用零 IV（简化示例）

            using (Aes aes = Aes.Create())
            {
                aes.Key = keyBytes;
                aes.IV = ivBytes;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                ICryptoTransform encryptor = aes.CreateEncryptor();
                byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
                byte[] encryptedBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

                return Convert.ToBase64String(encryptedBytes);
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"加密失败: {e.Message}");
            return null;
        }
    }

    /// <summary>
    /// AES 解密字符串
    /// 类似前端的 CryptoJS.AES.decrypt()
    /// </summary>
    public static string Decrypt(string encryptedText)
    {
        try
        {
            byte[] keyBytes = Encoding.UTF8.GetBytes(EncryptionKey.PadRight(32).Substring(0, 32));
            byte[] ivBytes = new byte[16];

            using (Aes aes = Aes.Create())
            {
                aes.Key = keyBytes;
                aes.IV = ivBytes;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                ICryptoTransform decryptor = aes.CreateDecryptor();
                byte[] encryptedBytes = Convert.FromBase64String(encryptedText);
                byte[] decryptedBytes = decryptor.TransformFinalBlock(encryptedBytes, 0, encryptedBytes.Length);

                return Encoding.UTF8.GetString(decryptedBytes);
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"解密失败: {e.Message}");
            return null;
        }
    }
}
```

---

## 16.6 SaveManager 单例：核心存档管理器

### 16.6.1 完整的 SaveManager.cs

```csharp
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// SaveManager.cs —— 存档管理器（单例）
///
/// 功能：
/// 1. 多槽位存档管理（默认 3 个槽位）
/// 2. 手动存档和自动存档
/// 3. 可选的文件加密
/// 4. 存档版本迁移
/// 5. 存档信息预览（不加载完整数据）
///
/// 类比前端：
/// - 类似一个 DataService 或 StorageManager
/// - 管理所有数据的 CRUD 操作
/// - 自动存档类似 localStorage 的 debounced auto-save
/// </summary>
public class SaveManager : MonoBehaviour
{
    // ===== 单例 =====
    public static SaveManager Instance { get; private set; }

    // ===== 配置 =====

    [Header("存档配置")]
    [Tooltip("最大存档槽位数")]
    [SerializeField] private int maxSaveSlots = 3;

    [Tooltip("自动存档间隔（秒），0 表示禁用")]
    [SerializeField] private float autoSaveInterval = 300f; // 5 分钟

    [Tooltip("是否加密存档文件")]
    [SerializeField] private bool encryptSaveFiles = false;

    [Tooltip("存档文件扩展名")]
    [SerializeField] private string saveFileExtension = ".json";

    // ===== 当前状态 =====

    /// <summary>
    /// 当前活跃的存档数据
    /// 类似前端 Redux store 中的 state
    /// </summary>
    public SaveData CurrentSaveData { get; private set; }

    /// <summary>
    /// 当前使用的存档槽位索引 (-1 表示无活跃存档)
    /// </summary>
    public int CurrentSlotIndex { get; private set; } = -1;

    /// <summary>
    /// 游戏开始时间，用于计算游戏时长
    /// </summary>
    private float sessionStartTime;

    /// <summary>
    /// 自动存档协程引用
    /// </summary>
    private Coroutine autoSaveCoroutine;

    // ===== 事件 =====

    /// <summary>
    /// 存档保存完成事件
    /// 类似前端的 EventEmitter 或 Redux 的 subscribe
    /// </summary>
    public event Action<int> OnSaveCompleted;   // 参数：槽位索引
    public event Action<int> OnLoadCompleted;   // 参数：槽位索引
    public event Action<int> OnDeleteCompleted; // 参数：槽位索引
    public event Action OnAutoSave;

    // ===== 路径管理 =====

    /// <summary>
    /// 存档目录路径
    /// </summary>
    private string SaveDirectoryPath => Path.Combine(Application.persistentDataPath, "Saves");

    /// <summary>
    /// 获取指定槽位的存档文件路径
    /// </summary>
    private string GetSaveFilePath(int slotIndex)
    {
        return Path.Combine(SaveDirectoryPath, $"save_slot_{slotIndex}{saveFileExtension}");
    }

    /// <summary>
    /// 获取存档信息预览文件路径（轻量级，用于显示槽位信息）
    /// </summary>
    private string GetSaveInfoPath(int slotIndex)
    {
        return Path.Combine(SaveDirectoryPath, $"save_info_{slotIndex}.json");
    }

    // ===== 生命周期 =====

    void Awake()
    {
        // 单例模式设置
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        // 确保存档目录存在
        if (!Directory.Exists(SaveDirectoryPath))
        {
            Directory.CreateDirectory(SaveDirectoryPath);
        }

        Debug.Log($"[SaveManager] 初始化完成。存档路径: {SaveDirectoryPath}");
    }

    void OnApplicationPause(bool pauseStatus)
    {
        // 移动端切后台时自动保存
        // iOS/Android 应用进入后台时触发
        if (pauseStatus && CurrentSaveData != null)
        {
            Debug.Log("[SaveManager] 应用进入后台，执行自动存档...");
            Save(CurrentSlotIndex);
        }
    }

    void OnApplicationQuit()
    {
        // 游戏退出时自动保存
        if (CurrentSaveData != null)
        {
            Debug.Log("[SaveManager] 游戏退出，执行自动存档...");
            Save(CurrentSlotIndex);
        }
    }

    // ===== 核心方法：保存 =====

    /// <summary>
    /// 保存游戏到指定槽位
    /// </summary>
    /// <param name="slotIndex">槽位索引 (0 ~ maxSaveSlots-1)</param>
    /// <returns>是否保存成功</returns>
    public bool Save(int slotIndex)
    {
        if (slotIndex < 0 || slotIndex >= maxSaveSlots)
        {
            Debug.LogError($"[SaveManager] 无效的槽位索引: {slotIndex}");
            return false;
        }

        if (CurrentSaveData == null)
        {
            Debug.LogError("[SaveManager] 没有活跃的存档数据，无法保存");
            return false;
        }

        try
        {
            // 更新存档元数据
            CurrentSaveData.slotIndex = slotIndex;
            CurrentSaveData.lastSavedAt = DateTime.UtcNow.ToString("o");
            CurrentSaveData.totalPlayTime += Time.time - sessionStartTime;
            sessionStartTime = Time.time; // 重置会话计时

            // 从游戏系统收集最新数据
            CollectGameData();

            // 序列化为 JSON
            string json = JsonUtility.ToJson(CurrentSaveData, true);

            // 可选加密
            if (encryptSaveFiles)
            {
                json = FileHelper.Encrypt(json);
            }

            // 写入文件
            string filePath = GetSaveFilePath(slotIndex);
            bool success = FileHelper.WriteToFile(filePath, json);

            if (success)
            {
                // 同时保存轻量级的预览信息
                SaveSlotInfo info = CreateSlotInfo(slotIndex);
                string infoJson = JsonUtility.ToJson(info, true);
                FileHelper.WriteToFile(GetSaveInfoPath(slotIndex), infoJson);

                CurrentSlotIndex = slotIndex;
                OnSaveCompleted?.Invoke(slotIndex);
                Debug.Log($"[SaveManager] 存档保存成功 - 槽位 {slotIndex}");
            }

            return success;
        }
        catch (Exception e)
        {
            Debug.LogError($"[SaveManager] 保存失败: {e.Message}\n{e.StackTrace}");
            return false;
        }
    }

    /// <summary>
    /// 从游戏中的各个系统收集当前数据
    /// 将运行时数据同步到 SaveData 结构中
    /// </summary>
    private void CollectGameData()
    {
        // 收集玩家位置和状态
        // 实际项目中，这些组件会通过 FindObjectOfType 或注册表获取
        GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
        if (playerObj != null)
        {
            CurrentSaveData.player.SetPosition(playerObj.transform.position);
            CurrentSaveData.player.rotationY = playerObj.transform.eulerAngles.y;

            // 如果玩家有 PlayerStats 组件
            // var stats = playerObj.GetComponent<PlayerStats>();
            // if (stats != null)
            // {
            //     CurrentSaveData.player.currentHealth = stats.currentHealth;
            //     CurrentSaveData.player.currentMana = stats.currentMana;
            //     CurrentSaveData.player.level = stats.level;
            //     CurrentSaveData.player.experience = stats.experience;
            //     CurrentSaveData.player.gold = stats.gold;
            // }
        }

        // 收集当前场景
        CurrentSaveData.worldState.currentSceneName = SceneManager.GetActiveScene().name;

        // 收集背包数据
        // var inventory = InventoryManager.Instance;
        // if (inventory != null)
        // {
        //     CurrentSaveData.inventory.items = inventory.GetSaveData();
        // }

        // 收集任务数据
        // var questManager = QuestManager.Instance;
        // if (questManager != null)
        // {
        //     CurrentSaveData.quests = questManager.GetSaveData();
        // }
    }

    // ===== 核心方法：读取 =====

    /// <summary>
    /// 从指定槽位读取存档
    /// </summary>
    /// <param name="slotIndex">槽位索引</param>
    /// <returns>是否读取成功</returns>
    public bool Load(int slotIndex)
    {
        if (slotIndex < 0 || slotIndex >= maxSaveSlots)
        {
            Debug.LogError($"[SaveManager] 无效的槽位索引: {slotIndex}");
            return false;
        }

        string filePath = GetSaveFilePath(slotIndex);

        if (!FileHelper.FileExists(filePath))
        {
            Debug.LogWarning($"[SaveManager] 存档文件不存在: {filePath}");
            return false;
        }

        try
        {
            // 读取文件
            string json = FileHelper.ReadFromFile(filePath);

            if (string.IsNullOrEmpty(json))
            {
                Debug.LogError("[SaveManager] 存档文件内容为空");
                return false;
            }

            // 如果启用了加密，先解密
            if (encryptSaveFiles)
            {
                json = FileHelper.Decrypt(json);
                if (string.IsNullOrEmpty(json))
                {
                    Debug.LogError("[SaveManager] 存档解密失败");
                    return false;
                }
            }

            // 反序列化
            SaveData loadedData = JsonUtility.FromJson<SaveData>(json);

            if (loadedData == null)
            {
                Debug.LogError("[SaveManager] 存档反序列化失败");
                return false;
            }

            // 版本迁移检查
            loadedData = MigrateSaveData(loadedData);

            // 设置为当前活跃存档
            CurrentSaveData = loadedData;
            CurrentSlotIndex = slotIndex;
            sessionStartTime = Time.time;

            // 将数据应用到游戏系统
            ApplyGameData();

            // 启动自动存档
            StartAutoSave();

            OnLoadCompleted?.Invoke(slotIndex);
            Debug.Log($"[SaveManager] 存档读取成功 - 槽位 {slotIndex}");
            return true;
        }
        catch (Exception e)
        {
            Debug.LogError($"[SaveManager] 读取失败: {e.Message}\n{e.StackTrace}");
            return false;
        }
    }

    /// <summary>
    /// 将加载的数据应用到游戏各系统
    /// </summary>
    private void ApplyGameData()
    {
        if (CurrentSaveData == null) return;

        // 加载对应场景
        // 注意：场景加载是异步的，需要在场景加载完成后再应用数据
        string targetScene = CurrentSaveData.worldState.currentSceneName;
        string currentScene = SceneManager.GetActiveScene().name;

        if (targetScene != currentScene)
        {
            // 场景不同，先加载场景再应用数据
            StartCoroutine(LoadSceneAndApplyData(targetScene));
        }
        else
        {
            // 同一场景，直接应用
            ApplyDataToScene();
        }
    }

    /// <summary>
    /// 异步加载场景并在完成后应用存档数据
    /// </summary>
    private IEnumerator LoadSceneAndApplyData(string sceneName)
    {
        // 显示加载界面
        // UIManager.Instance?.ShowLoadingScreen("正在加载存档...");

        AsyncOperation asyncLoad = SceneManager.LoadSceneAsync(sceneName);

        while (!asyncLoad.isDone)
        {
            // 可以在这里更新加载进度条
            // UIManager.Instance?.UpdateLoadingProgress(asyncLoad.progress);
            yield return null;
        }

        // 场景加载完成，等待一帧确保所有 Start() 执行完毕
        yield return null;

        ApplyDataToScene();

        // 隐藏加载界面
        // UIManager.Instance?.HideLoadingScreen();
    }

    /// <summary>
    /// 将存档数据应用到当前场景的游戏对象
    /// </summary>
    private void ApplyDataToScene()
    {
        // 应用玩家位置
        GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
        if (playerObj != null)
        {
            Vector3 savedPos = CurrentSaveData.player.GetPosition();
            playerObj.transform.position = savedPos;
            playerObj.transform.rotation = Quaternion.Euler(0, CurrentSaveData.player.rotationY, 0);

            // 禁用 CharacterController 再设置位置（如果有的话）
            var cc = playerObj.GetComponent<CharacterController>();
            if (cc != null)
            {
                cc.enabled = false;
                playerObj.transform.position = savedPos;
                cc.enabled = true;
            }
        }

        // 应用背包数据
        // InventoryManager.Instance?.LoadFromSaveData(CurrentSaveData.inventory);

        // 应用任务数据
        // QuestManager.Instance?.LoadFromSaveData(CurrentSaveData.quests);

        // 应用世界状态
        // WorldStateManager.Instance?.LoadFromSaveData(CurrentSaveData.worldState);

        Debug.Log("[SaveManager] 存档数据已应用到场景");
    }

    // ===== 新建存档 =====

    /// <summary>
    /// 创建新的存档并开始游戏
    /// </summary>
    public void CreateNewSave(int slotIndex, string playerName = "冒险者")
    {
        CurrentSaveData = SaveData.CreateDefault();
        CurrentSaveData.player.playerName = playerName;
        CurrentSaveData.slotIndex = slotIndex;
        CurrentSlotIndex = slotIndex;
        sessionStartTime = Time.time;

        // 立即保存一次
        Save(slotIndex);

        // 启动自动存档
        StartAutoSave();

        Debug.Log($"[SaveManager] 新建存档 - 槽位 {slotIndex}, 玩家名: {playerName}");
    }

    // ===== 删除存档 =====

    /// <summary>
    /// 删除指定槽位的存档
    /// </summary>
    public bool DeleteSave(int slotIndex)
    {
        string filePath = GetSaveFilePath(slotIndex);
        string infoPath = GetSaveInfoPath(slotIndex);

        bool deleted = false;

        if (FileHelper.FileExists(filePath))
        {
            FileHelper.DeleteFile(filePath);
            deleted = true;
        }

        if (FileHelper.FileExists(infoPath))
        {
            FileHelper.DeleteFile(infoPath);
        }

        // 如果删除的是当前活跃存档
        if (slotIndex == CurrentSlotIndex)
        {
            CurrentSaveData = null;
            CurrentSlotIndex = -1;
            StopAutoSave();
        }

        if (deleted)
        {
            OnDeleteCompleted?.Invoke(slotIndex);
            Debug.Log($"[SaveManager] 存档已删除 - 槽位 {slotIndex}");
        }

        return deleted;
    }

    // ===== 存档信息查询 =====

    /// <summary>
    /// 获取指定槽位的存档预览信息（不加载完整数据）
    /// 用于在存档选择界面显示简要信息
    /// </summary>
    public SaveSlotInfo GetSlotInfo(int slotIndex)
    {
        string infoPath = GetSaveInfoPath(slotIndex);

        if (!FileHelper.FileExists(infoPath))
        {
            return null; // 空槽位
        }

        try
        {
            string json = FileHelper.ReadFromFile(infoPath);
            return JsonUtility.FromJson<SaveSlotInfo>(json);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 获取所有槽位的信息
    /// </summary>
    public List<SaveSlotInfo> GetAllSlotInfos()
    {
        var infos = new List<SaveSlotInfo>();
        for (int i = 0; i < maxSaveSlots; i++)
        {
            infos.Add(GetSlotInfo(i)); // null 表示空槽位
        }
        return infos;
    }

    /// <summary>
    /// 检查指定槽位是否有存档
    /// </summary>
    public bool HasSaveInSlot(int slotIndex)
    {
        return FileHelper.FileExists(GetSaveFilePath(slotIndex));
    }

    /// <summary>
    /// 创建存档预览信息
    /// </summary>
    private SaveSlotInfo CreateSlotInfo(int slotIndex)
    {
        return new SaveSlotInfo
        {
            slotIndex = slotIndex,
            playerName = CurrentSaveData.player.playerName,
            playerLevel = CurrentSaveData.player.level,
            sceneName = CurrentSaveData.worldState.currentSceneName,
            totalPlayTime = CurrentSaveData.totalPlayTime,
            lastSavedAt = CurrentSaveData.lastSavedAt,
            dayCount = CurrentSaveData.worldState.dayCount,
            saveVersion = CurrentSaveData.saveVersion
        };
    }

    // ===== 自动存档 =====

    /// <summary>
    /// 启动自动存档定时器
    /// </summary>
    public void StartAutoSave()
    {
        StopAutoSave(); // 先停止已有的

        if (autoSaveInterval > 0)
        {
            autoSaveCoroutine = StartCoroutine(AutoSaveRoutine());
            Debug.Log($"[SaveManager] 自动存档已启动，间隔: {autoSaveInterval}秒");
        }
    }

    /// <summary>
    /// 停止自动存档
    /// </summary>
    public void StopAutoSave()
    {
        if (autoSaveCoroutine != null)
        {
            StopCoroutine(autoSaveCoroutine);
            autoSaveCoroutine = null;
        }
    }

    /// <summary>
    /// 自动存档协程
    /// 类似前端的 setInterval() 定时器
    /// </summary>
    private IEnumerator AutoSaveRoutine()
    {
        while (true)
        {
            yield return new WaitForSeconds(autoSaveInterval);

            if (CurrentSaveData != null && CurrentSlotIndex >= 0)
            {
                Debug.Log("[SaveManager] 执行自动存档...");
                Save(CurrentSlotIndex);
                OnAutoSave?.Invoke();

                // 可以显示一个小提示
                // UIManager.Instance?.ShowToast("游戏已自动保存");
            }
        }
    }

    // ===== 版本迁移 =====

    /// <summary>
    /// 存档版本迁移
    /// 当存档数据结构发生变化时，将旧版本数据迁移到新版本
    ///
    /// 类比前端：
    /// - 类似 IndexedDB 的 onupgradeneeded
    /// - 类似 Prisma/Sequelize 的 database migration
    /// - 逐版本递增迁移，确保每个版本的变更都被正确处理
    /// </summary>
    private SaveData MigrateSaveData(SaveData data)
    {
        int currentVersion = 1; // 当前最新版本号

        if (data.saveVersion >= currentVersion)
        {
            return data; // 已经是最新版本
        }

        Debug.Log($"[SaveManager] 开始版本迁移: v{data.saveVersion} -> v{currentVersion}");

        // 逐版本迁移（类似数据库 migration 的 up() 方法）

        // v0 -> v1: 示例迁移——添加了 diamond 字段
        // if (data.saveVersion < 1)
        // {
        //     // 旧版没有 diamond 字段，设为默认值 0
        //     data.player.diamond = 0;
        //
        //     // 旧版没有 NPC 好感度系统
        //     if (data.worldState.npcRelationships == null)
        //     {
        //         data.worldState.npcRelationships = new List<NPCRelationshipData>();
        //     }
        //
        //     data.saveVersion = 1;
        //     Debug.Log("[SaveManager] 迁移 v0 -> v1 完成");
        // }

        // 未来的版本迁移在这里继续添加：
        // if (data.saveVersion < 2) { ... data.saveVersion = 2; }
        // if (data.saveVersion < 3) { ... data.saveVersion = 3; }

        data.saveVersion = currentVersion;
        return data;
    }
}

/// <summary>
/// 存档槽位预览信息
/// 轻量级数据，用于在 UI 中快速显示各槽位概要
/// 不包含完整的游戏数据
/// </summary>
[Serializable]
public class SaveSlotInfo
{
    public int slotIndex;
    public string playerName;
    public int playerLevel;
    public string sceneName;
    public float totalPlayTime;
    public string lastSavedAt;
    public int dayCount;
    public int saveVersion;

    /// <summary>
    /// 格式化游戏时长显示
    /// </summary>
    public string GetFormattedPlayTime()
    {
        TimeSpan time = TimeSpan.FromSeconds(totalPlayTime);

        if (time.TotalHours >= 1)
        {
            return $"{(int)time.TotalHours}小时{time.Minutes}分钟";
        }
        else
        {
            return $"{time.Minutes}分钟";
        }
    }

    /// <summary>
    /// 格式化保存时间显示
    /// </summary>
    public string GetFormattedSaveTime()
    {
        if (DateTime.TryParse(lastSavedAt, out DateTime saveTime))
        {
            // 转换为本地时间
            saveTime = saveTime.ToLocalTime();
            return saveTime.ToString("yyyy/MM/dd HH:mm");
        }
        return "未知时间";
    }
}
```

[截图：SaveManager 组件在 Inspector 面板中的配置]

---

## 16.7 存档 UI 界面

### 16.7.1 SaveSlotUI.cs 完整代码

```csharp
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// SaveSlotUI.cs —— 存档槽位 UI 管理
///
/// 管理存档选择界面的显示和交互
/// 包含存档/读档两种模式
///
/// UI 结构（类比前端组件树）:
/// SaveSlotUI (类似 React 的 SaveLoadPage 组件)
///   ├── Title Text (标题：保存游戏 / 读取游戏)
///   ├── SlotContainer (类似 flex 容器)
///   │   ├── SlotItem_0 (SaveSlotItem 组件)
///   │   ├── SlotItem_1
///   │   └── SlotItem_2
///   └── CloseButton
/// </summary>
public class SaveSlotUI : MonoBehaviour
{
    // ===== UI 引用 =====

    [Header("UI 组件引用")]
    [SerializeField] private GameObject saveSlotPanel;
    [SerializeField] private TextMeshProUGUI titleText;
    [SerializeField] private Transform slotContainer;
    [SerializeField] private GameObject slotItemPrefab;
    [SerializeField] private Button closeButton;

    [Header("确认对话框")]
    [SerializeField] private GameObject confirmDialog;
    [SerializeField] private TextMeshProUGUI confirmMessage;
    [SerializeField] private Button confirmYesButton;
    [SerializeField] private Button confirmNoButton;

    // ===== 状态 =====

    /// <summary>
    /// 当前模式：保存 or 读取
    /// </summary>
    public enum Mode { Save, Load }

    private Mode currentMode;
    private List<SaveSlotItemUI> slotItems = new List<SaveSlotItemUI>();
    private int pendingSlotIndex = -1; // 待确认操作的槽位

    void Start()
    {
        // 绑定按钮事件
        closeButton?.onClick.AddListener(Close);
        confirmYesButton?.onClick.AddListener(OnConfirmYes);
        confirmNoButton?.onClick.AddListener(OnConfirmNo);

        // 默认隐藏
        saveSlotPanel.SetActive(false);
        confirmDialog?.SetActive(false);
    }

    /// <summary>
    /// 打开存档界面
    /// </summary>
    /// <param name="mode">保存或读取模式</param>
    public void Open(Mode mode)
    {
        currentMode = mode;
        titleText.text = mode == Mode.Save ? "保存游戏" : "读取游戏";

        // 刷新槽位显示
        RefreshSlots();

        // 显示面板
        saveSlotPanel.SetActive(true);

        // 暂停游戏（类似前端打开模态框时禁用背景交互）
        Time.timeScale = 0f;
    }

    /// <summary>
    /// 关闭存档界面
    /// </summary>
    public void Close()
    {
        saveSlotPanel.SetActive(false);
        confirmDialog?.SetActive(false);

        // 恢复游戏
        Time.timeScale = 1f;
    }

    /// <summary>
    /// 刷新所有槽位的显示
    /// 类似前端的 re-render
    /// </summary>
    private void RefreshSlots()
    {
        // 清除旧的槽位 UI
        foreach (var item in slotItems)
        {
            if (item != null)
                Destroy(item.gameObject);
        }
        slotItems.Clear();

        // 获取所有槽位信息
        List<SaveSlotInfo> infos = SaveManager.Instance.GetAllSlotInfos();

        // 创建槽位 UI
        for (int i = 0; i < infos.Count; i++)
        {
            GameObject slotObj = Instantiate(slotItemPrefab, slotContainer);
            SaveSlotItemUI slotItem = slotObj.GetComponent<SaveSlotItemUI>();

            if (slotItem != null)
            {
                int slotIndex = i; // 闭包捕获变量
                slotItem.Setup(infos[i], i, currentMode);
                slotItem.OnSlotClicked += () => OnSlotClicked(slotIndex);
                slotItem.OnDeleteClicked += () => OnDeleteClicked(slotIndex);
                slotItems.Add(slotItem);
            }
        }
    }

    /// <summary>
    /// 槽位被点击
    /// </summary>
    private void OnSlotClicked(int slotIndex)
    {
        bool hasExistingSave = SaveManager.Instance.HasSaveInSlot(slotIndex);

        if (currentMode == Mode.Save)
        {
            if (hasExistingSave)
            {
                // 保存模式 + 已有存档 => 确认覆盖
                ShowConfirmDialog(slotIndex, "确定要覆盖这个存档吗？\n当前的存档数据将被替换。");
            }
            else
            {
                // 保存模式 + 空槽位 => 直接保存
                ExecuteSave(slotIndex);
            }
        }
        else // Load mode
        {
            if (hasExistingSave)
            {
                // 读取模式 + 有存档 => 确认读取
                ShowConfirmDialog(slotIndex, "确定要读取这个存档吗？\n当前未保存的进度将会丢失。");
            }
            // 读取模式 + 空槽位 => 无操作
        }
    }

    /// <summary>
    /// 删除按钮被点击
    /// </summary>
    private void OnDeleteClicked(int slotIndex)
    {
        ShowConfirmDialog(slotIndex, "确定要删除这个存档吗？\n此操作不可恢复！");
    }

    /// <summary>
    /// 显示确认对话框
    /// </summary>
    private void ShowConfirmDialog(int slotIndex, string message)
    {
        pendingSlotIndex = slotIndex;
        confirmMessage.text = message;
        confirmDialog.SetActive(true);
    }

    /// <summary>
    /// 确认操作
    /// </summary>
    private void OnConfirmYes()
    {
        confirmDialog.SetActive(false);

        if (pendingSlotIndex < 0) return;

        if (currentMode == Mode.Save)
        {
            ExecuteSave(pendingSlotIndex);
        }
        else
        {
            ExecuteLoad(pendingSlotIndex);
        }

        pendingSlotIndex = -1;
    }

    /// <summary>
    /// 取消操作
    /// </summary>
    private void OnConfirmNo()
    {
        confirmDialog.SetActive(false);
        pendingSlotIndex = -1;
    }

    /// <summary>
    /// 执行保存
    /// </summary>
    private void ExecuteSave(int slotIndex)
    {
        bool success = SaveManager.Instance.Save(slotIndex);

        if (success)
        {
            Debug.Log($"保存成功！槽位: {slotIndex}");
            RefreshSlots(); // 刷新界面
            // 可以显示一个成功提示
            // ShowToast("游戏已保存！");
        }
        else
        {
            Debug.LogError($"保存失败！槽位: {slotIndex}");
            // 显示错误提示
            // ShowToast("保存失败，请重试");
        }
    }

    /// <summary>
    /// 执行读取
    /// </summary>
    private void ExecuteLoad(int slotIndex)
    {
        Close(); // 先关闭界面

        bool success = SaveManager.Instance.Load(slotIndex);

        if (success)
        {
            Debug.Log($"读取成功！槽位: {slotIndex}");
        }
        else
        {
            Debug.LogError($"读取失败！槽位: {slotIndex}");
        }
    }
}

/// <summary>
/// 单个存档槽位的 UI 组件
/// 类似前端的 SaveSlotCard 组件
/// </summary>
public class SaveSlotItemUI : MonoBehaviour
{
    [Header("UI 组件")]
    [SerializeField] private TextMeshProUGUI slotNumberText;
    [SerializeField] private TextMeshProUGUI playerNameText;
    [SerializeField] private TextMeshProUGUI levelText;
    [SerializeField] private TextMeshProUGUI playTimeText;
    [SerializeField] private TextMeshProUGUI saveTimeText;
    [SerializeField] private TextMeshProUGUI sceneNameText;
    [SerializeField] private GameObject emptySlotGroup;      // 空槽位显示的内容
    [SerializeField] private GameObject filledSlotGroup;      // 有数据槽位显示的内容
    [SerializeField] private Button slotButton;               // 整个槽位的按钮
    [SerializeField] private Button deleteButton;             // 删除按钮

    // 事件
    public event System.Action OnSlotClicked;
    public event System.Action OnDeleteClicked;

    /// <summary>
    /// 设置槽位显示
    /// </summary>
    /// <param name="info">存档信息（null 表示空槽位）</param>
    /// <param name="slotIndex">槽位索引</param>
    /// <param name="mode">当前模式</param>
    public void Setup(SaveSlotInfo info, int slotIndex, SaveSlotUI.Mode mode)
    {
        slotNumberText.text = $"存档 {slotIndex + 1}";

        if (info != null)
        {
            // 有存档数据
            emptySlotGroup.SetActive(false);
            filledSlotGroup.SetActive(true);

            playerNameText.text = info.playerName;
            levelText.text = $"Lv.{info.playerLevel}";
            playTimeText.text = info.GetFormattedPlayTime();
            saveTimeText.text = info.GetFormattedSaveTime();
            sceneNameText.text = GetSceneDisplayName(info.sceneName);

            deleteButton.gameObject.SetActive(true);
        }
        else
        {
            // 空槽位
            emptySlotGroup.SetActive(true);
            filledSlotGroup.SetActive(false);

            deleteButton.gameObject.SetActive(false);

            // 读取模式下，空槽位不可点击
            slotButton.interactable = (mode == SaveSlotUI.Mode.Save);
        }

        // 绑定事件
        slotButton.onClick.AddListener(() => OnSlotClicked?.Invoke());
        deleteButton.onClick.AddListener(() => OnDeleteClicked?.Invoke());
    }

    /// <summary>
    /// 获取场景的中文显示名称
    /// </summary>
    private string GetSceneDisplayName(string sceneName)
    {
        // 场景名称映射（实际项目中可以用 ScriptableObject 或配置文件管理）
        return sceneName switch
        {
            "MainWorld" => "主世界",
            "Village" => "新手村",
            "DarkForest" => "黑暗森林",
            "Castle" => "古堡",
            "Dungeon_01" => "地下城 - 第一层",
            _ => sceneName
        };
    }
}
```

[截图：完成的存档选择界面，显示 3 个槽位，其中 2 个有存档数据]

---

## 16.8 存档文件加密

### 16.8.1 为什么需要加密

```
存档加密的目的：

1. 防止玩家修改存档（增加金币、修改属性）
2. 防止存档内容被直接查看
3. 单机游戏中的基础反作弊手段

⚠️ 注意：客户端加密永远不可能完全防止破解。
就像前端的 JWT token 可以被解码一样，
有足够技术能力的人总能破解客户端加密。
加密只是增加修改难度，不能替代服务器端校验。
```

### 16.8.2 加密方案选择

```csharp
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

/// <summary>
/// 存档加密工具类
/// 提供多种加密方案
/// </summary>
public static class SaveEncryption
{
    // ===== 方案 1：简单的 XOR 混淆（最低安全级别） =====

    /// <summary>
    /// XOR 混淆——最简单的"加密"
    /// 不是真正的加密，只是让文件不能直接被文本编辑器打开阅读
    /// 类似前端的 Base64 编码——看起来像加密但其实不是
    /// </summary>
    public static string XorObfuscate(string input, string key = "GameKey123")
    {
        char[] output = new char[input.Length];
        for (int i = 0; i < input.Length; i++)
        {
            output[i] = (char)(input[i] ^ key[i % key.Length]);
        }
        // 转成 Base64 确保输出是可写入文件的字符串
        byte[] bytes = Encoding.UTF8.GetBytes(new string(output));
        return Convert.ToBase64String(bytes);
    }

    // XOR 是对称的，同样的操作用于解密
    public static string XorDeobfuscate(string input, string key = "GameKey123")
    {
        byte[] bytes = Convert.FromBase64String(input);
        string decoded = Encoding.UTF8.GetString(bytes);

        char[] output = new char[decoded.Length];
        for (int i = 0; i < decoded.Length; i++)
        {
            output[i] = (char)(decoded[i] ^ key[i % key.Length]);
        }
        return new string(output);
    }

    // ===== 方案 2：AES 加密 + 校验和（推荐方案） =====

    /// <summary>
    /// AES 加密并附加 SHA256 校验和
    /// 既加密内容又能检测文件是否被篡改
    /// </summary>
    public static string EncryptWithChecksum(string plainText, string password)
    {
        // 从密码生成密钥和 IV
        using (var deriveBytes = new Rfc2898DeriveBytes(password, 16, 10000))
        {
            byte[] salt = deriveBytes.Salt;
            byte[] key = deriveBytes.GetBytes(32);  // 256-bit key
            byte[] iv = deriveBytes.GetBytes(16);    // 128-bit IV

            // AES 加密
            using (Aes aes = Aes.Create())
            {
                aes.Key = key;
                aes.IV = iv;

                ICryptoTransform encryptor = aes.CreateEncryptor();
                byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
                byte[] encryptedBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

                // 计算校验和（对原文计算）
                using (SHA256 sha256 = SHA256.Create())
                {
                    byte[] hash = sha256.ComputeHash(plainBytes);
                    string checksum = Convert.ToBase64String(hash);

                    // 格式：salt|encrypted_data|checksum
                    string saltStr = Convert.ToBase64String(salt);
                    string dataStr = Convert.ToBase64String(encryptedBytes);

                    return $"{saltStr}|{dataStr}|{checksum}";
                }
            }
        }
    }

    /// <summary>
    /// 解密并验证校验和
    /// </summary>
    public static string DecryptWithChecksum(string encryptedText, string password)
    {
        try
        {
            string[] parts = encryptedText.Split('|');
            if (parts.Length != 3)
            {
                Debug.LogError("存档格式无效");
                return null;
            }

            byte[] salt = Convert.FromBase64String(parts[0]);
            byte[] encryptedBytes = Convert.FromBase64String(parts[1]);
            string savedChecksum = parts[2];

            // 使用相同的 salt 重新生成密钥
            using (var deriveBytes = new Rfc2898DeriveBytes(password, salt, 10000))
            {
                byte[] key = deriveBytes.GetBytes(32);
                byte[] iv = deriveBytes.GetBytes(16);

                using (Aes aes = Aes.Create())
                {
                    aes.Key = key;
                    aes.IV = iv;

                    ICryptoTransform decryptor = aes.CreateDecryptor();
                    byte[] decryptedBytes = decryptor.TransformFinalBlock(
                        encryptedBytes, 0, encryptedBytes.Length);

                    // 验证校验和
                    using (SHA256 sha256 = SHA256.Create())
                    {
                        byte[] hash = sha256.ComputeHash(decryptedBytes);
                        string computedChecksum = Convert.ToBase64String(hash);

                        if (computedChecksum != savedChecksum)
                        {
                            Debug.LogError("存档校验失败！文件可能已被篡改。");
                            return null;
                        }
                    }

                    return Encoding.UTF8.GetString(decryptedBytes);
                }
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"存档解密失败: {e.Message}");
            return null;
        }
    }
}
```

---

## 16.9 版本迁移详解

### 16.9.1 迁移策略

```csharp
using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 存档版本迁移管理器
///
/// 类比前端：
/// - 类似 Prisma migration 或 Knex migration
/// - 每次数据结构变更都创建一个迁移步骤
/// - 从任意旧版本逐步升级到最新版本
///
/// 使用场景：
/// - 游戏更新后，存档格式发生变化
/// - 添加了新的游戏系统（如宠物系统），需要在旧存档中初始化
/// - 字段重命名或类型变更
/// </summary>
public static class SaveMigrator
{
    // 当前最新存档版本
    public const int CURRENT_VERSION = 3;

    /// <summary>
    /// 执行版本迁移
    /// 从旧版本逐步升级到最新版本
    /// </summary>
    public static string MigrateJson(string json, int fromVersion)
    {
        if (fromVersion >= CURRENT_VERSION)
        {
            return json; // 已经是最新版本
        }

        Debug.Log($"[SaveMigrator] 开始迁移: v{fromVersion} -> v{CURRENT_VERSION}");

        // 使用 Newtonsoft.Json 的 JObject 进行灵活的 JSON 操作
        // 这比反序列化为强类型对象更灵活，因为旧格式可能不匹配新类
        // 类似前端直接操作 JSON 对象

        // 注意：以下示例使用 JsonUtility 兼容的方式演示迁移思路
        // 实际项目中推荐使用 Newtonsoft.Json 的 JObject

        // 逐版本迁移
        if (fromVersion < 1)
        {
            json = MigrateV0ToV1(json);
        }
        if (fromVersion < 2)
        {
            json = MigrateV1ToV2(json);
        }
        if (fromVersion < 3)
        {
            json = MigrateV2ToV3(json);
        }

        return json;
    }

    /// <summary>
    /// v0 -> v1: 添加了货币系统 (diamond 字段)
    /// </summary>
    static string MigrateV0ToV1(string json)
    {
        Debug.Log("[SaveMigrator] 执行 v0 -> v1 迁移: 添加 diamond 字段");

        // 反序列化，新添加的字段会自动获得默认值
        SaveData data = JsonUtility.FromJson<SaveData>(json);
        data.player.diamond = 0; // 显式设置默认值
        data.saveVersion = 1;

        return JsonUtility.ToJson(data, true);
    }

    /// <summary>
    /// v1 -> v2: 添加了 NPC 好感度系统
    /// </summary>
    static string MigrateV1ToV2(string json)
    {
        Debug.Log("[SaveMigrator] 执行 v1 -> v2 迁移: 初始化 NPC 好感度系统");

        SaveData data = JsonUtility.FromJson<SaveData>(json);

        // 确保好感度列表被初始化
        if (data.worldState.npcRelationships == null)
        {
            data.worldState.npcRelationships = new List<NPCRelationshipData>();
        }

        data.saveVersion = 2;
        return JsonUtility.ToJson(data, true);
    }

    /// <summary>
    /// v2 -> v3: 背包系统重构，添加了 extraDataJson 字段
    /// </summary>
    static string MigrateV2ToV3(string json)
    {
        Debug.Log("[SaveMigrator] 执行 v2 -> v3 迁移: 背包系统字段扩展");

        SaveData data = JsonUtility.FromJson<SaveData>(json);

        // 为所有已有物品添加空的 extraDataJson
        foreach (var item in data.inventory.items)
        {
            if (string.IsNullOrEmpty(item.extraDataJson))
            {
                item.extraDataJson = "{}";
            }
        }

        data.saveVersion = 3;
        return JsonUtility.ToJson(data, true);
    }
}
```

[截图：版本迁移的流程图——从 v0 逐步升级到 v3]

---

## 16.10 实际整合示例

### 16.10.1 在游戏中使用存档系统

```csharp
using UnityEngine;

/// <summary>
/// 游戏流程管理器——展示如何在实际游戏流程中使用存档系统
/// </summary>
public class GameFlowManager : MonoBehaviour
{
    [Header("场景名称")]
    [SerializeField] private string mainMenuScene = "MainMenu";
    [SerializeField] private string gameScene = "MainWorld";

    // 引用存档 UI
    [SerializeField] private SaveSlotUI saveSlotUI;

    void Start()
    {
        // 监听存档事件
        SaveManager.Instance.OnSaveCompleted += OnSaveCompleted;
        SaveManager.Instance.OnLoadCompleted += OnLoadCompleted;
        SaveManager.Instance.OnAutoSave += OnAutoSave;
    }

    void OnDestroy()
    {
        // 取消订阅事件（防止内存泄漏）
        if (SaveManager.Instance != null)
        {
            SaveManager.Instance.OnSaveCompleted -= OnSaveCompleted;
            SaveManager.Instance.OnLoadCompleted -= OnLoadCompleted;
            SaveManager.Instance.OnAutoSave -= OnAutoSave;
        }
    }

    /// <summary>
    /// 从主菜单开始新游戏
    /// </summary>
    public void StartNewGame()
    {
        // 找到第一个空槽位
        for (int i = 0; i < 3; i++)
        {
            if (!SaveManager.Instance.HasSaveInSlot(i))
            {
                SaveManager.Instance.CreateNewSave(i, "新冒险者");
                Debug.Log($"新游戏开始！使用槽位 {i}");
                return;
            }
        }

        // 所有槽位都满了，提示玩家选择覆盖
        Debug.Log("所有存档槽位已满，请选择一个槽位覆盖");
        saveSlotUI.Open(SaveSlotUI.Mode.Save);
    }

    /// <summary>
    /// 打开读档界面
    /// </summary>
    public void OpenLoadMenu()
    {
        saveSlotUI.Open(SaveSlotUI.Mode.Load);
    }

    /// <summary>
    /// 打开存档界面（游戏内暂停菜单调用）
    /// </summary>
    public void OpenSaveMenu()
    {
        saveSlotUI.Open(SaveSlotUI.Mode.Save);
    }

    /// <summary>
    /// 快速保存（按 F5 等快捷键触发）
    /// </summary>
    public void QuickSave()
    {
        int currentSlot = SaveManager.Instance.CurrentSlotIndex;
        if (currentSlot >= 0)
        {
            SaveManager.Instance.Save(currentSlot);
        }
        else
        {
            Debug.LogWarning("没有活跃的存档槽位，无法快速保存");
        }
    }

    /// <summary>
    /// 快速读取（按 F9 等快捷键触发）
    /// </summary>
    public void QuickLoad()
    {
        int currentSlot = SaveManager.Instance.CurrentSlotIndex;
        if (currentSlot >= 0)
        {
            SaveManager.Instance.Load(currentSlot);
        }
    }

    // ===== 事件回调 =====

    void OnSaveCompleted(int slotIndex)
    {
        Debug.Log($"存档完成通知 - 槽位: {slotIndex}");
        // 显示 "游戏已保存" 提示
    }

    void OnLoadCompleted(int slotIndex)
    {
        Debug.Log($"读档完成通知 - 槽位: {slotIndex}");
        // 可以触发过渡动画等
    }

    void OnAutoSave()
    {
        Debug.Log("自动存档完成");
        // 在屏幕角落显示一个小的存档图标动画
    }

    // ===== 键盘快捷键（调试用） =====

    void Update()
    {
        // F5 快速保存
        if (Input.GetKeyDown(KeyCode.F5))
        {
            QuickSave();
        }

        // F9 快速读取
        if (Input.GetKeyDown(KeyCode.F9))
        {
            QuickLoad();
        }
    }
}
```

[截图：完整的存档系统在游戏中运行的效果——主菜单的存档/读档界面]

---

## 16.11 移动端注意事项

### 16.11.1 iOS/Android 特殊处理

```csharp
/// <summary>
/// 移动端存档注意事项
/// </summary>
public class MobileSaveNotes
{
    /*
     * 1. 存档路径：
     *    - iOS: Application.persistentDataPath 指向 Documents 目录
     *      会被 iCloud 自动备份（除非设置 no-backup 标志）
     *    - Android: 指向 internal storage，应用卸载时会被删除
     *
     * 2. 文件写入时机：
     *    - 移动端应用可能随时被系统杀掉
     *    - 必须在 OnApplicationPause(true) 中保存
     *    - 不能依赖 OnApplicationQuit（iOS 可能不调用）
     *
     * 3. 性能考虑：
     *    - JSON 序列化在低端手机上可能较慢
     *    - 避免每帧保存，使用间隔（如每 5 分钟）
     *    - 考虑在后台线程执行 I/O 操作
     *
     * 4. 存储空间：
     *    - 移动设备存储有限
     *    - 监控存档文件大小
     *    - 提供清理无用存档的选项
     *
     * 5. 云存档（进阶）：
     *    - iOS: Game Center / iCloud
     *    - Android: Google Play Games Services
     *    - 跨平台: PlayFab, Firebase
     */
}
```

---

## 练习题

### 练习 1：基础存档（难度：中等）

实现一个 `PlayerPrefs` 管理器，用于保存以下游戏偏好设置：
- 语言选择（中文/英文/日文）
- 帧率限制（30/60/不限制）
- 振动反馈开关（开/关）
- 字幕显示开关（开/关）

要求：
1. 每个设置都有合理的默认值
2. 提供一键重置功能
3. 变更后立即应用到游戏

### 练习 2：存档系统扩展（难度：较高）

基于本章的 SaveManager，添加以下功能：
1. 存档截图功能——保存时自动截取游戏画面作为存档缩略图
2. 存档导入/导出——将存档文件分享给其他玩家
3. 存档统计——显示每个存档的总计信息（击杀数、收集物品数等）

提示：
- 截图使用 `ScreenCapture.CaptureScreenshotAsTexture()`
- 导入/导出可以使用 `NativeShare` 插件或系统的文件选择器
- 统计数据作为额外字段添加到 `SaveData` 中

### 练习 3：版本迁移实践（难度：中等）

模拟以下版本迁移场景：
- v1: 基础存档（玩家位置 + 金币）
- v2: 添加宠物系统（宠物列表 + 当前出战宠物）
- v3: 背包系统重构（从单列表改为分类背包）
- v4: 添加成就系统

要求：
1. 编写每个版本的迁移函数
2. 确保从任意旧版本都能正确迁移到 v4
3. 编写单元测试验证迁移结果

---

## 下一章预告

**第 17 章：程序化生成**

在下一章中，我们将学习如何使用算法自动生成游戏内容：
- 使用 Perlin 噪声生成自然的地形起伏
- 程序化放置树木、岩石、草地等场景物体
- BSP 树算法生成随机地牢
- L-System 生成程序化植被
- 多层噪声叠加实现丰富的生物群落分布

程序化生成是开放世界游戏的核心技术——让计算机帮你创造无限的世界内容！
