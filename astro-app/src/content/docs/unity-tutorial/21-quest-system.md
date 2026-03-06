# 第21章：任务系统

## 本章目标

通过本章学习，你将掌握：

1. **任务数据设计** —— 使用 ScriptableObject 定义任务数据（ID、标题、描述、目标、奖励、前置条件）
2. **任务目标类型** —— Kill（击杀）、Collect（收集）、Talk（对话）、Explore（探索）、Escort（护送）
3. **任务状态管理** —— NotStarted、Active、Completed、Failed 的完整生命周期
4. **任务管理器** —— 追踪活跃任务、处理任务进度更新
5. **任务 UI 系统** —— 任务日志、HUD 追踪器、通知弹窗
6. **任务发布者 NPC** —— NPC 与任务的交互流程
7. **任务奖励与任务链** —— 经验值、物品、货币奖励；前置任务与后续任务
8. **事件驱动的任务进度** —— 使用 C# 事件系统解耦任务逻辑

## 预计学习时间

**5-6小时**

---

## 前端类比：帮助你理解

任务系统在概念上和你做过的前端项目有很多相似之处：

| 前端概念 | Unity 任务系统对应 |
|---------|-------------------|
| JSON Schema / TypeScript interface | `QuestData` ScriptableObject（任务数据结构定义） |
| Redux Store / Zustand | `QuestManager`（全局任务状态管理） |
| Redux Action / Dispatch | C# `event` / `Action`（事件驱动任务进度） |
| 状态机 (XState / useReducer) | 任务状态流转（NotStarted -> Active -> Completed） |
| React Component | `QuestUI`、`QuestTracker`（UI 组件） |
| API Response 数据处理 | 任务完成后的奖励发放 |
| Route Guards / Middleware | 前置任务检查 |
| Toast / Notification | 任务通知弹窗 |

---

## 21.1 任务数据结构设计

### 21.1.1 为什么用 ScriptableObject？

在前端开发中，我们习惯用 JSON 文件或数据库存储数据。Unity 中的 **ScriptableObject** 是一种特殊的数据容器：

- 它是一个**资源文件**，存储在项目中（类似 JSON 配置文件）
- 可以在 Unity 编辑器中可视化编辑（不需要手写 JSON）
- 多个游戏对象可以**引用同一份数据**（避免数据重复）
- 运行时**不需要挂载到游戏对象上**（比 MonoBehaviour 更轻量）

用前端类比：ScriptableObject 就像一个**全局配置的 TypeScript interface 实例**，你定义好数据结构，然后在编辑器中创建多个实例。

### 21.1.2 任务目标数据

创建 `Scripts/Quest/QuestObjective.cs`：

```csharp
using UnityEngine;
using System;

/// <summary>
/// 任务目标类型枚举
/// 类似前端中的 TypeScript 联合类型：type ObjectiveType = 'Kill' | 'Collect' | ...
/// </summary>
public enum QuestObjectiveType
{
    Kill,       // 击杀指定敌人
    Collect,    // 收集指定物品
    Talk,       // 与指定 NPC 对话
    Explore,    // 到达指定地点
    Escort      // 护送 NPC 到指定地点
}

/// <summary>
/// 任务目标数据 —— 描述一个任务需要完成什么
/// 这是一个纯数据类（类似前端的 DTO / Data Transfer Object）
///
/// [Serializable] 标记让 Unity 编辑器可以在 Inspector 中显示和编辑这个类的字段
/// </summary>
[Serializable]
public class QuestObjective
{
    [Tooltip("目标类型")]
    public QuestObjectiveType type;

    [Tooltip("目标描述（显示在 UI 上的文本）")]
    public string description;

    [Tooltip("目标相关的 ID（敌人 ID、物品 ID、NPC ID 等）")]
    public string targetId;

    [Tooltip("需要完成的数量（击杀3只狼、收集5个宝石等）")]
    public int requiredAmount = 1;

    [Tooltip("目标位置（探索和护送任务使用）")]
    public Vector3 targetPosition;

    [Tooltip("目标位置的到达判定半径")]
    public float targetRadius = 5f;

    [Tooltip("是否为可选目标（不影响任务完成）")]
    public bool isOptional = false;
}

/// <summary>
/// 运行时的任务目标进度追踪
/// 将静态数据和动态进度分离 —— 类似前端中 Schema（定义）和 State（状态）分离
/// </summary>
[Serializable]
public class QuestObjectiveProgress
{
    /// <summary>对应的目标数据引用</summary>
    public QuestObjective objectiveData;

    /// <summary>当前进度数量</summary>
    public int currentAmount = 0;

    /// <summary>是否已完成</summary>
    public bool isCompleted = false;

    /// <summary>完成百分比（0-1）</summary>
    public float Progress => (float)currentAmount / objectiveData.requiredAmount;

    /// <summary>进度文本，如 "3/5"</summary>
    public string ProgressText => $"{currentAmount}/{objectiveData.requiredAmount}";

    public QuestObjectiveProgress(QuestObjective data)
    {
        objectiveData = data;
        currentAmount = 0;
        isCompleted = false;
    }

    /// <summary>
    /// 增加进度
    /// </summary>
    public bool AddProgress(int amount = 1)
    {
        if (isCompleted) return false;

        currentAmount = Mathf.Min(currentAmount + amount, objectiveData.requiredAmount);

        if (currentAmount >= objectiveData.requiredAmount)
        {
            isCompleted = true;
            return true; // 刚刚完成
        }

        return false;
    }
}
```

### 21.1.3 任务奖励数据

```csharp
using UnityEngine;
using System;

/// <summary>
/// 奖励类型枚举
/// </summary>
public enum RewardType
{
    Experience,     // 经验值
    Currency,       // 金币/货币
    Item,           // 物品
    Skill,          // 技能解锁
    Reputation      // 声望
}

/// <summary>
/// 任务奖励数据
/// </summary>
[Serializable]
public class QuestReward
{
    [Tooltip("奖励类型")]
    public RewardType type;

    [Tooltip("奖励 ID（物品 ID、技能 ID 等）")]
    public string rewardId;

    [Tooltip("奖励名称（用于 UI 显示）")]
    public string displayName;

    [Tooltip("奖励数量")]
    public int amount = 1;

    [Tooltip("奖励图标")]
    public Sprite icon;
}
```

### 21.1.4 QuestData.cs —— 任务数据 ScriptableObject

创建 `Scripts/Quest/QuestData.cs`：

```csharp
using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 任务数据 ScriptableObject —— 定义一个完整任务的所有静态数据
///
/// [CreateAssetMenu] 特性让你可以在 Unity 编辑器中右键创建此资源：
/// 右键 -> Create -> Quest System -> Quest Data
///
/// 类似前端中定义一个 TypeScript interface 并创建 JSON 实例：
/// interface QuestData { id: string; title: string; ... }
/// </summary>
[CreateAssetMenu(fileName = "NewQuest", menuName = "Quest System/Quest Data")]
public class QuestData : ScriptableObject
{
    [Header("基本信息")]
    [Tooltip("任务唯一 ID —— 用于存档和引用")]
    public string questId;

    [Tooltip("任务标题")]
    public string questTitle;

    [Tooltip("任务描述（详细说明任务背景和要求）")]
    [TextArea(3, 10)]
    public string questDescription;

    [Tooltip("任务简短摘要（用于 HUD 显示）")]
    public string questSummary;

    [Header("任务分类")]
    [Tooltip("任务类型")]
    public QuestType questType = QuestType.Side;

    [Tooltip("推荐等级")]
    public int recommendedLevel = 1;

    [Tooltip("任务难度")]
    public QuestDifficulty difficulty = QuestDifficulty.Normal;

    [Header("任务目标")]
    [Tooltip("任务目标列表 —— 可以有多个目标")]
    public List<QuestObjective> objectives = new List<QuestObjective>();

    [Header("奖励")]
    [Tooltip("完成任务获得的奖励")]
    public List<QuestReward> rewards = new List<QuestReward>();

    [Header("前置条件")]
    [Tooltip("需要先完成的前置任务 ID 列表")]
    public List<string> prerequisiteQuestIds = new List<string>();

    [Tooltip("需要的最低玩家等级")]
    public int requiredLevel = 0;

    [Header("任务链")]
    [Tooltip("完成此任务后自动开启的下一个任务 ID")]
    public string nextQuestId;

    [Tooltip("是否自动接受下一个任务")]
    public bool autoAcceptNext = false;

    [Header("时间限制")]
    [Tooltip("是否有时间限制")]
    public bool hasTimeLimit = false;

    [Tooltip("时间限制（游戏内小时）")]
    public float timeLimitHours = 0f;

    [Header("UI 配置")]
    [Tooltip("任务图标")]
    public Sprite questIcon;

    [Tooltip("任务发布者 NPC 名称")]
    public string giverNPCName;

    [Tooltip("任务完成时的对话文本")]
    [TextArea(2, 5)]
    public string completionDialogue;

    /// <summary>
    /// 检查玩家是否满足前置条件
    /// 类似前端中的 Route Guard —— 在进入页面前检查权限
    /// </summary>
    public bool CheckPrerequisites(int playerLevel, System.Func<string, bool> isQuestCompleted)
    {
        // 检查等级要求
        if (playerLevel < requiredLevel)
        {
            Debug.Log($"[任务系统] 任务 '{questTitle}' 等级不足：需要 Lv.{requiredLevel}，当前 Lv.{playerLevel}");
            return false;
        }

        // 检查前置任务
        foreach (string preQuestId in prerequisiteQuestIds)
        {
            if (!isQuestCompleted(preQuestId))
            {
                Debug.Log($"[任务系统] 任务 '{questTitle}' 前置任务未完成：{preQuestId}");
                return false;
            }
        }

        return true;
    }
}

/// <summary>
/// 任务类型枚举
/// </summary>
public enum QuestType
{
    Main,       // 主线任务
    Side,       // 支线任务
    Daily,      // 每日任务
    Event       // 活动任务
}

/// <summary>
/// 任务难度枚举
/// </summary>
public enum QuestDifficulty
{
    Easy,       // 简单
    Normal,     // 普通
    Hard,       // 困难
    Epic        // 史诗
}

/// <summary>
/// 任务状态枚举
/// 类似前端状态机中的 state：'idle' | 'loading' | 'success' | 'error'
/// </summary>
public enum QuestState
{
    NotStarted,     // 未开始
    Active,         // 进行中
    Completed,      // 已完成
    Failed          // 已失败
}
```

[截图：在 Unity 编辑器中右键 -> Create -> Quest System -> Quest Data 创建任务资源]

[截图：创建好的 QuestData 资源在 Inspector 中的显示，展示所有可编辑字段]

---

## 21.2 运行时任务实例

### 21.2.1 数据与状态的分离

在前端开发中，我们通常将**数据模型**（Schema/Interface）和**运行时状态**（State）分开。任务系统也遵循这个原则：

- `QuestData`（ScriptableObject）= 静态数据定义（类似 TypeScript interface）
- `QuestInstance`（普通类）= 运行时状态（类似 React state）

```csharp
using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// 任务运行时实例 —— 追踪一个任务的实时状态
///
/// 这个类将静态数据（QuestData）和动态状态分开
/// 类似前端中 useState<QuestState> 管理的运行时状态
/// </summary>
[Serializable]
public class QuestInstance
{
    /// <summary>任务静态数据引用</summary>
    public QuestData questData;

    /// <summary>当前任务状态</summary>
    public QuestState state = QuestState.NotStarted;

    /// <summary>各目标的进度</summary>
    public List<QuestObjectiveProgress> objectiveProgresses;

    /// <summary>任务接受的游戏时间</summary>
    public float acceptedTime;

    /// <summary>任务完成的游戏时间</summary>
    public float completedTime;

    /// <summary>剩余时间（有时限任务用）</summary>
    public float remainingTime;

    // === 事件 ===
    /// <summary>任务状态变化时触发</summary>
    public event Action<QuestInstance, QuestState> OnStateChanged;

    /// <summary>目标进度更新时触发</summary>
    public event Action<QuestInstance, QuestObjectiveProgress> OnObjectiveProgressUpdated;

    /// <summary>任务完成时触发</summary>
    public event Action<QuestInstance> OnQuestCompleted;

    // === 快捷属性 ===
    public string QuestId => questData.questId;
    public string Title => questData.questTitle;
    public bool IsActive => state == QuestState.Active;
    public bool IsCompleted => state == QuestState.Completed;

    /// <summary>总体完成百分比</summary>
    public float OverallProgress
    {
        get
        {
            if (objectiveProgresses == null || objectiveProgresses.Count == 0) return 0f;

            // 只计算非可选目标
            var requiredObjectives = objectiveProgresses
                .Where(o => !o.objectiveData.isOptional)
                .ToList();

            if (requiredObjectives.Count == 0) return 1f;

            return requiredObjectives.Average(o => o.Progress);
        }
    }

    /// <summary>
    /// 构造函数 —— 从 QuestData 创建运行时实例
    /// </summary>
    public QuestInstance(QuestData data)
    {
        questData = data;
        state = QuestState.NotStarted;

        // 为每个目标创建进度追踪
        objectiveProgresses = new List<QuestObjectiveProgress>();
        foreach (var objective in data.objectives)
        {
            objectiveProgresses.Add(new QuestObjectiveProgress(objective));
        }
    }

    /// <summary>
    /// 接受任务
    /// </summary>
    public void Accept()
    {
        if (state != QuestState.NotStarted) return;

        state = QuestState.Active;
        acceptedTime = Time.time;

        if (questData.hasTimeLimit)
        {
            remainingTime = questData.timeLimitHours * 3600f; // 转为秒
        }

        OnStateChanged?.Invoke(this, state);
        Debug.Log($"[任务系统] 接受任务：{Title}");
    }

    /// <summary>
    /// 更新目标进度
    /// </summary>
    /// <param name="objectiveType">目标类型</param>
    /// <param name="targetId">目标 ID</param>
    /// <param name="amount">增加的数量</param>
    public void UpdateObjectiveProgress(QuestObjectiveType objectiveType, string targetId, int amount = 1)
    {
        if (state != QuestState.Active) return;

        foreach (var progress in objectiveProgresses)
        {
            // 匹配目标类型和 ID
            if (progress.objectiveData.type == objectiveType &&
                progress.objectiveData.targetId == targetId &&
                !progress.isCompleted)
            {
                bool justCompleted = progress.AddProgress(amount);
                OnObjectiveProgressUpdated?.Invoke(this, progress);

                Debug.Log($"[任务系统] 目标进度更新：{progress.objectiveData.description} " +
                         $"{progress.ProgressText}");

                if (justCompleted)
                {
                    Debug.Log($"[任务系统] 目标完成！{progress.objectiveData.description}");
                }

                // 检查是否所有必需目标都完成了
                CheckCompletion();
                break;
            }
        }
    }

    /// <summary>
    /// 检查位置相关的目标（探索、护送）
    /// </summary>
    public void CheckLocationObjective(Vector3 playerPosition)
    {
        if (state != QuestState.Active) return;

        foreach (var progress in objectiveProgresses)
        {
            if (progress.isCompleted) continue;

            var obj = progress.objectiveData;
            if (obj.type == QuestObjectiveType.Explore || obj.type == QuestObjectiveType.Escort)
            {
                float distance = Vector3.Distance(playerPosition, obj.targetPosition);
                if (distance <= obj.targetRadius)
                {
                    bool justCompleted = progress.AddProgress(1);
                    OnObjectiveProgressUpdated?.Invoke(this, progress);

                    if (justCompleted)
                    {
                        Debug.Log($"[任务系统] 到达目标位置！{obj.description}");
                        CheckCompletion();
                    }
                }
            }
        }
    }

    /// <summary>
    /// 检查任务是否完成
    /// </summary>
    private void CheckCompletion()
    {
        // 检查所有非可选目标是否完成
        bool allRequiredDone = objectiveProgresses
            .Where(o => !o.objectiveData.isOptional)
            .All(o => o.isCompleted);

        if (allRequiredDone)
        {
            Complete();
        }
    }

    /// <summary>
    /// 完成任务
    /// </summary>
    public void Complete()
    {
        if (state != QuestState.Active) return;

        state = QuestState.Completed;
        completedTime = Time.time;

        OnStateChanged?.Invoke(this, state);
        OnQuestCompleted?.Invoke(this);

        Debug.Log($"[任务系统] 任务完成！{Title}");
    }

    /// <summary>
    /// 任务失败
    /// </summary>
    public void Fail()
    {
        if (state != QuestState.Active) return;

        state = QuestState.Failed;

        OnStateChanged?.Invoke(this, state);
        Debug.Log($"[任务系统] 任务失败：{Title}");
    }

    /// <summary>
    /// 更新时间限制（每帧调用）
    /// </summary>
    public void UpdateTimeLimit(float deltaTime)
    {
        if (!questData.hasTimeLimit || state != QuestState.Active) return;

        remainingTime -= deltaTime;
        if (remainingTime <= 0f)
        {
            remainingTime = 0f;
            Fail();
        }
    }
}
```

---

## 21.3 任务管理器

### 21.3.1 QuestManager.cs —— 全局任务管理

创建 `Scripts/Quest/QuestManager.cs`：

```csharp
using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// 任务管理器 —— 全局任务状态中心
///
/// 类似前端的 Redux Store 或 Zustand Store：
/// - 维护所有任务的状态
/// - 提供方法修改任务状态（类似 action/dispatch）
/// - 通过事件通知 UI 更新（类似 subscribe）
///
/// 所有任务相关的操作都通过这个管理器进行，确保单一数据源
/// </summary>
public class QuestManager : MonoBehaviour
{
    public static QuestManager Instance { get; private set; }

    [Header("任务数据库")]
    [Tooltip("所有可用的任务数据（在编辑器中拖入所有 QuestData 资源）")]
    [SerializeField] private List<QuestData> allQuestDatas = new List<QuestData>();

    [Header("配置")]
    [Tooltip("最大同时进行的任务数")]
    [SerializeField] private int maxActiveQuests = 20;

    [Tooltip("当前跟踪显示的任务数（HUD 上显示的）")]
    [SerializeField] private int maxTrackedQuests = 3;

    // === 运行时任务实例 ===
    // 所有已知任务（包括未开始、进行中、已完成的）
    private Dictionary<string, QuestInstance> allQuests = new Dictionary<string, QuestInstance>();

    // 当前活跃的任务列表（进行中的）
    private List<QuestInstance> activeQuests = new List<QuestInstance>();

    // 当前被跟踪的任务（显示在 HUD 上）
    private List<QuestInstance> trackedQuests = new List<QuestInstance>();

    // 已完成的任务 ID 集合（用于前置任务检查）
    private HashSet<string> completedQuestIds = new HashSet<string>();

    // === 事件系统 ===
    /// <summary>新任务可用时触发（NPC 可以给予的新任务）</summary>
    public event Action<QuestData> OnQuestAvailable;

    /// <summary>任务被接受时触发</summary>
    public event Action<QuestInstance> OnQuestAccepted;

    /// <summary>任务完成时触发</summary>
    public event Action<QuestInstance> OnQuestCompleted;

    /// <summary>任务失败时触发</summary>
    public event Action<QuestInstance> OnQuestFailed;

    /// <summary>任务目标进度更新时触发</summary>
    public event Action<QuestInstance, QuestObjectiveProgress> OnObjectiveUpdated;

    /// <summary>跟踪列表变化时触发</summary>
    public event Action<List<QuestInstance>> OnTrackedQuestsChanged;

    // === 公共属性 ===
    public List<QuestInstance> ActiveQuests => activeQuests;
    public List<QuestInstance> TrackedQuests => trackedQuests;
    public int ActiveQuestCount => activeQuests.Count;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        // 初始化所有任务实例
        InitializeQuests();
    }

    private void Update()
    {
        // 更新有时间限制的活跃任务
        foreach (var quest in activeQuests)
        {
            quest.UpdateTimeLimit(Time.deltaTime);
        }
    }

    /// <summary>
    /// 初始化所有任务实例
    /// 将 ScriptableObject 数据转换为运行时实例
    /// </summary>
    private void InitializeQuests()
    {
        foreach (var questData in allQuestDatas)
        {
            if (questData == null || string.IsNullOrEmpty(questData.questId)) continue;

            var instance = new QuestInstance(questData);
            allQuests[questData.questId] = instance;

            // 订阅实例事件
            instance.OnQuestCompleted += HandleQuestCompleted;
            instance.OnObjectiveProgressUpdated += HandleObjectiveUpdated;
            instance.OnStateChanged += HandleQuestStateChanged;
        }

        Debug.Log($"[任务系统] 初始化完成，共 {allQuests.Count} 个任务");
    }

    // ==================== 核心方法 ====================

    /// <summary>
    /// 接受任务
    /// 类似前端的 dispatch({ type: 'ACCEPT_QUEST', payload: questId })
    /// </summary>
    public bool AcceptQuest(string questId)
    {
        if (!allQuests.TryGetValue(questId, out QuestInstance quest))
        {
            Debug.LogWarning($"[任务系统] 未找到任务：{questId}");
            return false;
        }

        // 检查状态
        if (quest.state != QuestState.NotStarted)
        {
            Debug.LogWarning($"[任务系统] 任务 '{quest.Title}' 状态异常：{quest.state}");
            return false;
        }

        // 检查活跃任务数量限制
        if (activeQuests.Count >= maxActiveQuests)
        {
            Debug.LogWarning($"[任务系统] 活跃任务数已达上限 ({maxActiveQuests})");
            return false;
        }

        // 检查前置条件
        // 这里的 lambda 类似前端中传入的回调函数
        if (!quest.questData.CheckPrerequisites(
            GetPlayerLevel(),
            id => completedQuestIds.Contains(id)))
        {
            return false;
        }

        // 接受任务
        quest.Accept();
        activeQuests.Add(quest);

        // 自动跟踪（如果跟踪列表未满）
        if (trackedQuests.Count < maxTrackedQuests)
        {
            TrackQuest(questId);
        }

        OnQuestAccepted?.Invoke(quest);
        Debug.Log($"[任务系统] 接受任务：{quest.Title}");
        return true;
    }

    /// <summary>
    /// 放弃任务
    /// </summary>
    public bool AbandonQuest(string questId)
    {
        if (!allQuests.TryGetValue(questId, out QuestInstance quest))
            return false;

        if (quest.state != QuestState.Active) return false;

        // 重置任务状态
        quest.Fail();
        activeQuests.Remove(quest);
        trackedQuests.Remove(quest);

        // 重新创建实例以重置进度
        var newInstance = new QuestInstance(quest.questData);
        newInstance.OnQuestCompleted += HandleQuestCompleted;
        newInstance.OnObjectiveProgressUpdated += HandleObjectiveUpdated;
        newInstance.OnStateChanged += HandleQuestStateChanged;
        allQuests[questId] = newInstance;

        OnTrackedQuestsChanged?.Invoke(trackedQuests);
        return true;
    }

    /// <summary>
    /// 跟踪/取消跟踪任务（控制 HUD 显示）
    /// </summary>
    public void TrackQuest(string questId)
    {
        if (!allQuests.TryGetValue(questId, out QuestInstance quest))
            return;

        if (!quest.IsActive) return;

        if (trackedQuests.Contains(quest))
        {
            // 已跟踪则取消跟踪
            trackedQuests.Remove(quest);
        }
        else
        {
            // 添加跟踪
            if (trackedQuests.Count >= maxTrackedQuests)
            {
                // 移除最早跟踪的
                trackedQuests.RemoveAt(0);
            }
            trackedQuests.Add(quest);
        }

        OnTrackedQuestsChanged?.Invoke(trackedQuests);
    }

    // ==================== 进度报告方法 ====================

    /// <summary>
    /// 报告击杀事件 —— 当玩家击杀敌人时调用
    ///
    /// 使用方法（在敌人死亡逻辑中）：
    /// QuestManager.Instance.ReportKill("wolf");
    ///
    /// 类似前端中的事件广播：
    /// eventBus.emit('enemy-killed', { enemyId: 'wolf' });
    /// </summary>
    public void ReportKill(string enemyId, int count = 1)
    {
        foreach (var quest in activeQuests)
        {
            quest.UpdateObjectiveProgress(QuestObjectiveType.Kill, enemyId, count);
        }
    }

    /// <summary>
    /// 报告物品收集
    /// </summary>
    public void ReportCollect(string itemId, int count = 1)
    {
        foreach (var quest in activeQuests)
        {
            quest.UpdateObjectiveProgress(QuestObjectiveType.Collect, itemId, count);
        }
    }

    /// <summary>
    /// 报告 NPC 对话
    /// </summary>
    public void ReportTalk(string npcId)
    {
        foreach (var quest in activeQuests)
        {
            quest.UpdateObjectiveProgress(QuestObjectiveType.Talk, npcId, 1);
        }
    }

    /// <summary>
    /// 报告位置到达（每帧在玩家位置附近检查）
    /// </summary>
    public void ReportPlayerPosition(Vector3 position)
    {
        foreach (var quest in activeQuests)
        {
            quest.CheckLocationObjective(position);
        }
    }

    // ==================== 查询方法 ====================

    /// <summary>
    /// 获取任务实例
    /// </summary>
    public QuestInstance GetQuest(string questId)
    {
        return allQuests.TryGetValue(questId, out QuestInstance quest) ? quest : null;
    }

    /// <summary>
    /// 获取某个 NPC 可以给予的任务列表
    /// 只返回满足前置条件且未开始的任务
    /// </summary>
    public List<QuestData> GetAvailableQuestsForNPC(string npcName)
    {
        int playerLevel = GetPlayerLevel();

        return allQuestDatas
            .Where(qd => qd.giverNPCName == npcName &&
                        allQuests.ContainsKey(qd.questId) &&
                        allQuests[qd.questId].state == QuestState.NotStarted &&
                        qd.CheckPrerequisites(playerLevel, id => completedQuestIds.Contains(id)))
            .ToList();
    }

    /// <summary>
    /// 获取某个 NPC 可以交付的任务列表
    /// 返回已完成所有目标、等待交付的任务
    /// </summary>
    public List<QuestInstance> GetCompletableQuestsForNPC(string npcName)
    {
        return activeQuests
            .Where(q => q.questData.giverNPCName == npcName &&
                       q.OverallProgress >= 1f)
            .ToList();
    }

    /// <summary>
    /// 检查任务是否已完成
    /// </summary>
    public bool IsQuestCompleted(string questId)
    {
        return completedQuestIds.Contains(questId);
    }

    /// <summary>
    /// 获取所有活跃任务（按类型分组）
    /// </summary>
    public Dictionary<QuestType, List<QuestInstance>> GetActiveQuestsByType()
    {
        var grouped = new Dictionary<QuestType, List<QuestInstance>>();

        foreach (QuestType type in Enum.GetValues(typeof(QuestType)))
        {
            grouped[type] = activeQuests
                .Where(q => q.questData.questType == type)
                .ToList();
        }

        return grouped;
    }

    // ==================== 内部事件处理 ====================

    /// <summary>
    /// 处理任务完成
    /// </summary>
    private void HandleQuestCompleted(QuestInstance quest)
    {
        // 发放奖励
        GrantRewards(quest);

        // 记录已完成
        completedQuestIds.Add(quest.QuestId);

        // 从活跃列表移除
        activeQuests.Remove(quest);
        trackedQuests.Remove(quest);

        // 广播事件
        OnQuestCompleted?.Invoke(quest);
        OnTrackedQuestsChanged?.Invoke(trackedQuests);

        // 检查是否有后续任务
        if (!string.IsNullOrEmpty(quest.questData.nextQuestId))
        {
            if (quest.questData.autoAcceptNext)
            {
                AcceptQuest(quest.questData.nextQuestId);
            }
            else
            {
                // 通知有新任务可用
                var nextQuestData = allQuestDatas.Find(q => q.questId == quest.questData.nextQuestId);
                if (nextQuestData != null)
                {
                    OnQuestAvailable?.Invoke(nextQuestData);
                }
            }
        }

        Debug.Log($"[任务系统] 任务完成并发放奖励：{quest.Title}");
    }

    /// <summary>
    /// 处理目标进度更新
    /// </summary>
    private void HandleObjectiveUpdated(QuestInstance quest, QuestObjectiveProgress progress)
    {
        OnObjectiveUpdated?.Invoke(quest, progress);
    }

    /// <summary>
    /// 处理任务状态变化
    /// </summary>
    private void HandleQuestStateChanged(QuestInstance quest, QuestState newState)
    {
        if (newState == QuestState.Failed)
        {
            activeQuests.Remove(quest);
            trackedQuests.Remove(quest);
            OnQuestFailed?.Invoke(quest);
            OnTrackedQuestsChanged?.Invoke(trackedQuests);
        }
    }

    /// <summary>
    /// 发放任务奖励
    /// </summary>
    private void GrantRewards(QuestInstance quest)
    {
        foreach (var reward in quest.questData.rewards)
        {
            switch (reward.type)
            {
                case RewardType.Experience:
                    // 调用经验系统
                    Debug.Log($"[任务奖励] 获得 {reward.amount} 经验值");
                    // PlayerStats.Instance?.AddExperience(reward.amount);
                    break;

                case RewardType.Currency:
                    Debug.Log($"[任务奖励] 获得 {reward.amount} 金币");
                    // InventoryManager.Instance?.AddCurrency(reward.amount);
                    break;

                case RewardType.Item:
                    Debug.Log($"[任务奖励] 获得物品：{reward.displayName} x{reward.amount}");
                    // InventoryManager.Instance?.AddItem(reward.rewardId, reward.amount);
                    break;

                case RewardType.Skill:
                    Debug.Log($"[任务奖励] 解锁技能：{reward.displayName}");
                    break;

                case RewardType.Reputation:
                    Debug.Log($"[任务奖励] 获得 {reward.amount} 声望");
                    break;
            }
        }
    }

    /// <summary>
    /// 获取玩家等级（简化版，实际应从玩家系统获取）
    /// </summary>
    private int GetPlayerLevel()
    {
        // TODO: 从玩家系统获取等级
        return 1;
    }

    // ==================== 存档相关 ====================

    /// <summary>
    /// 导出任务存档数据
    /// 类似前端中将 Redux state 序列化为 JSON
    /// </summary>
    public QuestSaveData ExportSaveData()
    {
        var saveData = new QuestSaveData();

        foreach (var kvp in allQuests)
        {
            var questSave = new QuestSaveEntry
            {
                questId = kvp.Key,
                state = kvp.Value.state,
                objectiveProgresses = new List<int>()
            };

            foreach (var progress in kvp.Value.objectiveProgresses)
            {
                questSave.objectiveProgresses.Add(progress.currentAmount);
            }

            saveData.quests.Add(questSave);
        }

        saveData.completedQuestIds = new List<string>(completedQuestIds);
        return saveData;
    }

    /// <summary>
    /// 导入任务存档数据
    /// </summary>
    public void ImportSaveData(QuestSaveData saveData)
    {
        completedQuestIds = new HashSet<string>(saveData.completedQuestIds);

        foreach (var entry in saveData.quests)
        {
            if (!allQuests.TryGetValue(entry.questId, out QuestInstance quest))
                continue;

            // 恢复状态
            if (entry.state == QuestState.Active)
            {
                quest.Accept();
                activeQuests.Add(quest);
            }
            else if (entry.state == QuestState.Completed)
            {
                quest.Accept();
                quest.Complete();
            }

            // 恢复进度
            for (int i = 0; i < entry.objectiveProgresses.Count && i < quest.objectiveProgresses.Count; i++)
            {
                quest.objectiveProgresses[i].currentAmount = entry.objectiveProgresses[i];
                if (quest.objectiveProgresses[i].currentAmount >= quest.objectiveProgresses[i].objectiveData.requiredAmount)
                {
                    quest.objectiveProgresses[i].isCompleted = true;
                }
            }
        }

        Debug.Log($"[任务系统] 存档加载完成，活跃任务：{activeQuests.Count}");
    }
}

/// <summary>
/// 任务存档数据结构 —— 用于序列化/反序列化
/// 类似前端中定义的 API 数据传输对象
/// </summary>
[Serializable]
public class QuestSaveData
{
    public List<QuestSaveEntry> quests = new List<QuestSaveEntry>();
    public List<string> completedQuestIds = new List<string>();
}

[Serializable]
public class QuestSaveEntry
{
    public string questId;
    public QuestState state;
    public List<int> objectiveProgresses;
}
```

[截图：QuestManager Inspector 面板，展示任务数据库列表]

---

## 21.4 任务 UI 系统

### 21.4.1 UI 架构设计

任务 UI 包含三个主要部分：

1. **QuestTracker**（HUD 追踪器）—— 屏幕右侧常驻显示，展示当前跟踪的任务进度
2. **QuestUI**（任务日志面板）—— 按 J 键打开的全屏任务列表
3. **QuestNotification**（通知弹窗）—— 任务状态变化时的临时提示

这和前端中的组件拆分思路完全一致：
- `QuestTracker` = 侧边栏组件（始终可见）
- `QuestUI` = 模态框/全页面组件（按需打开）
- 通知 = Toast 组件

### 21.4.2 QuestTracker.cs —— HUD 任务追踪器

创建 `Scripts/Quest/QuestTracker.cs`：

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// 任务追踪器 —— 在 HUD 上显示当前跟踪的任务进度
/// 类似前端中的侧边栏/浮动面板组件
///
/// UI 层级结构：
/// QuestTracker (Panel)
///   └── TrackerContent (Vertical Layout Group)
///       ├── QuestTrackerEntry (预制体实例 1)
///       │   ├── QuestTitle (TMP)
///       │   └── ObjectiveList (Vertical Layout)
///       │       ├── ObjectiveEntry (TMP) "  ○ 击杀野狼 2/5"
///       │       └── ObjectiveEntry (TMP) "  ● 收集狼皮 3/3 ✓"
///       ├── QuestTrackerEntry (预制体实例 2)
///       │   └── ...
///       └── ...
/// </summary>
public class QuestTracker : MonoBehaviour
{
    [Header("UI 引用")]
    [Tooltip("任务条目的父容器（带 Vertical Layout Group）")]
    [SerializeField] private Transform trackerContent;

    [Tooltip("任务条目预制体")]
    [SerializeField] private GameObject questEntryPrefab;

    [Tooltip("目标条目预制体")]
    [SerializeField] private GameObject objectiveEntryPrefab;

    [Header("样式配置")]
    [Tooltip("已完成目标的颜色")]
    [SerializeField] private Color completedColor = new Color(0.5f, 0.8f, 0.5f);

    [Tooltip("进行中目标的颜色")]
    [SerializeField] private Color activeColor = Color.white;

    [Tooltip("主线任务标题颜色")]
    [SerializeField] private Color mainQuestColor = new Color(1f, 0.85f, 0.3f);

    [Tooltip("支线任务标题颜色")]
    [SerializeField] private Color sideQuestColor = new Color(0.7f, 0.85f, 1f);

    // 缓存的 UI 条目（对象池思路，减少频繁创建/销毁）
    private List<TrackerEntryUI> cachedEntries = new List<TrackerEntryUI>();

    private void OnEnable()
    {
        // 订阅事件
        if (QuestManager.Instance != null)
        {
            QuestManager.Instance.OnTrackedQuestsChanged += RefreshTracker;
            QuestManager.Instance.OnObjectiveUpdated += OnObjectiveProgressUpdated;
        }
    }

    private void OnDisable()
    {
        if (QuestManager.Instance != null)
        {
            QuestManager.Instance.OnTrackedQuestsChanged -= RefreshTracker;
            QuestManager.Instance.OnObjectiveUpdated -= OnObjectiveProgressUpdated;
        }
    }

    private void Start()
    {
        // 初始刷新
        if (QuestManager.Instance != null)
        {
            RefreshTracker(QuestManager.Instance.TrackedQuests);
        }
    }

    /// <summary>
    /// 完全刷新追踪器 UI
    /// 类似 React 组件的 render() —— 根据数据重建整个 UI
    /// </summary>
    private void RefreshTracker(List<QuestInstance> trackedQuests)
    {
        // 清除旧条目
        foreach (var entry in cachedEntries)
        {
            if (entry.root != null)
                Destroy(entry.root);
        }
        cachedEntries.Clear();

        // 创建新条目
        foreach (var quest in trackedQuests)
        {
            CreateTrackerEntry(quest);
        }
    }

    /// <summary>
    /// 创建一个任务追踪条目
    /// </summary>
    private void CreateTrackerEntry(QuestInstance quest)
    {
        // 实例化任务条目
        GameObject entryObj = Instantiate(questEntryPrefab, trackerContent);
        var entry = new TrackerEntryUI
        {
            root = entryObj,
            questId = quest.QuestId,
            objectiveTexts = new List<TextMeshProUGUI>()
        };

        // 设置任务标题
        TextMeshProUGUI titleText = entryObj.GetComponentInChildren<TextMeshProUGUI>();
        if (titleText != null)
        {
            titleText.text = quest.Title;
            titleText.color = quest.questData.questType == QuestType.Main
                ? mainQuestColor
                : sideQuestColor;
        }

        // 查找目标列表容器（条目中的子对象）
        Transform objectiveContainer = entryObj.transform.Find("ObjectiveList");
        if (objectiveContainer == null)
        {
            // 如果没有单独的容器，使用条目本身
            objectiveContainer = entryObj.transform;
        }

        // 为每个目标创建 UI
        foreach (var progress in quest.objectiveProgresses)
        {
            GameObject objEntry = Instantiate(objectiveEntryPrefab, objectiveContainer);
            TextMeshProUGUI objText = objEntry.GetComponent<TextMeshProUGUI>();

            if (objText != null)
            {
                UpdateObjectiveText(objText, progress);
                entry.objectiveTexts.Add(objText);
            }
        }

        cachedEntries.Add(entry);
    }

    /// <summary>
    /// 更新单个目标的文本显示
    /// </summary>
    private void UpdateObjectiveText(TextMeshProUGUI text, QuestObjectiveProgress progress)
    {
        // 使用符号表示完成状态
        string statusIcon = progress.isCompleted ? "●" : "○";
        string progressInfo = "";

        // 只有需要数量的目标才显示进度
        if (progress.objectiveData.requiredAmount > 1)
        {
            progressInfo = $" {progress.ProgressText}";
        }

        string checkMark = progress.isCompleted ? " ✓" : "";

        text.text = $"  {statusIcon} {progress.objectiveData.description}{progressInfo}{checkMark}";
        text.color = progress.isCompleted ? completedColor : activeColor;

        // 可选目标用斜体
        if (progress.objectiveData.isOptional)
        {
            text.fontStyle = FontStyles.Italic;
            text.text = $"  {statusIcon} [可选] {progress.objectiveData.description}{progressInfo}";
        }
    }

    /// <summary>
    /// 处理目标进度更新 —— 增量更新而非全量刷新
    /// 类似 React 的局部更新，只更新变化的部分
    /// </summary>
    private void OnObjectiveProgressUpdated(QuestInstance quest, QuestObjectiveProgress progress)
    {
        // 找到对应的追踪条目
        var entry = cachedEntries.Find(e => e.questId == quest.QuestId);
        if (entry == null) return;

        // 找到对应的目标文本并更新
        int objIndex = quest.objectiveProgresses.IndexOf(progress);
        if (objIndex >= 0 && objIndex < entry.objectiveTexts.Count)
        {
            UpdateObjectiveText(entry.objectiveTexts[objIndex], progress);
        }
    }

    /// <summary>
    /// 追踪条目 UI 缓存数据
    /// </summary>
    private class TrackerEntryUI
    {
        public GameObject root;
        public string questId;
        public List<TextMeshProUGUI> objectiveTexts;
    }
}
```

[截图：HUD 右侧的任务追踪器，显示2-3个正在跟踪的任务及其目标进度]

### 21.4.3 QuestUI.cs —— 任务日志面板

创建 `Scripts/Quest/QuestUI.cs`：

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// 任务日志 UI —— 全屏任务列表面板
/// 按 J 键打开/关闭
///
/// 类似前端中的模态框或全页面路由组件
///
/// UI 层级结构：
/// QuestLogPanel
///   ├── Header
///   │   ├── Title "任务日志"
///   │   ├── TabButtons (主线 | 支线 | 每日)
///   │   └── CloseButton
///   ├── Content
///   │   ├── QuestList (左侧列表，可滚动)
///   │   │   ├── QuestListItem
///   │   │   └── ...
///   │   └── QuestDetail (右侧详情面板)
///   │       ├── QuestTitle
///   │       ├── QuestDescription
///   │       ├── ObjectiveList
///   │       ├── RewardList
///   │       └── ActionButtons (追踪/放弃)
///   └── Footer
/// </summary>
public class QuestUI : MonoBehaviour
{
    [Header("面板引用")]
    [Tooltip("任务日志面板根对象")]
    [SerializeField] private GameObject questLogPanel;

    [Header("标签页按钮")]
    [SerializeField] private Button mainQuestsTab;
    [SerializeField] private Button sideQuestsTab;
    [SerializeField] private Button dailyQuestsTab;
    [SerializeField] private Button completedQuestsTab;

    [Header("列表区域")]
    [SerializeField] private Transform questListContent;
    [SerializeField] private GameObject questListItemPrefab;

    [Header("详情区域")]
    [SerializeField] private TextMeshProUGUI detailTitle;
    [SerializeField] private TextMeshProUGUI detailDescription;
    [SerializeField] private TextMeshProUGUI detailGiver;
    [SerializeField] private TextMeshProUGUI detailLevel;
    [SerializeField] private Transform detailObjectiveList;
    [SerializeField] private GameObject detailObjectivePrefab;
    [SerializeField] private Transform detailRewardList;
    [SerializeField] private GameObject detailRewardPrefab;
    [SerializeField] private Button trackButton;
    [SerializeField] private Button abandonButton;
    [SerializeField] private TextMeshProUGUI trackButtonText;

    [Header("通知")]
    [Tooltip("任务通知弹窗预制体")]
    [SerializeField] private GameObject notificationPrefab;
    [SerializeField] private Transform notificationContainer;

    [Header("快捷键")]
    [SerializeField] private KeyCode toggleKey = KeyCode.J;

    // 当前选中的标签页
    private QuestType currentTab = QuestType.Main;

    // 当前选中的任务
    private QuestInstance selectedQuest;

    // 面板是否打开
    private bool isOpen = false;

    private void Start()
    {
        // 绑定标签页按钮事件
        // 类似前端中的 onClick 事件绑定
        mainQuestsTab?.onClick.AddListener(() => SwitchTab(QuestType.Main));
        sideQuestsTab?.onClick.AddListener(() => SwitchTab(QuestType.Side));
        dailyQuestsTab?.onClick.AddListener(() => SwitchTab(QuestType.Daily));

        trackButton?.onClick.AddListener(OnTrackButtonClicked);
        abandonButton?.onClick.AddListener(OnAbandonButtonClicked);

        // 订阅任务事件（用于显示通知）
        if (QuestManager.Instance != null)
        {
            QuestManager.Instance.OnQuestAccepted += ShowAcceptNotification;
            QuestManager.Instance.OnQuestCompleted += ShowCompleteNotification;
            QuestManager.Instance.OnObjectiveUpdated += ShowObjectiveNotification;
        }

        // 初始隐藏面板
        questLogPanel?.SetActive(false);
    }

    private void Update()
    {
        // 快捷键切换面板
        if (Input.GetKeyDown(toggleKey))
        {
            ToggleQuestLog();
        }
    }

    /// <summary>
    /// 切换任务日志面板的显示/隐藏
    /// </summary>
    public void ToggleQuestLog()
    {
        isOpen = !isOpen;
        questLogPanel?.SetActive(isOpen);

        if (isOpen)
        {
            RefreshQuestList();
            // 暂停游戏时间（可选）
            Time.timeScale = 0f;
        }
        else
        {
            Time.timeScale = 1f;
        }
    }

    /// <summary>
    /// 切换标签页
    /// 类似前端中的 Tab 切换组件
    /// </summary>
    private void SwitchTab(QuestType type)
    {
        currentTab = type;
        RefreshQuestList();
    }

    /// <summary>
    /// 刷新任务列表
    /// 类似 React 中根据 filter 状态渲染列表
    /// </summary>
    private void RefreshQuestList()
    {
        // 清除旧列表项
        foreach (Transform child in questListContent)
        {
            Destroy(child.gameObject);
        }

        if (QuestManager.Instance == null) return;

        // 获取当前标签页的任务
        var quests = QuestManager.Instance.ActiveQuests
            .FindAll(q => q.questData.questType == currentTab);

        // 创建列表项
        foreach (var quest in quests)
        {
            CreateQuestListItem(quest);
        }

        // 如果有任务，默认选中第一个
        if (quests.Count > 0 && selectedQuest == null)
        {
            SelectQuest(quests[0]);
        }
    }

    /// <summary>
    /// 创建任务列表项
    /// </summary>
    private void CreateQuestListItem(QuestInstance quest)
    {
        GameObject item = Instantiate(questListItemPrefab, questListContent);

        // 设置标题
        TextMeshProUGUI titleText = item.GetComponentInChildren<TextMeshProUGUI>();
        if (titleText != null)
        {
            titleText.text = quest.Title;

            // 难度颜色标记
            switch (quest.questData.difficulty)
            {
                case QuestDifficulty.Easy:
                    titleText.color = new Color(0.6f, 0.9f, 0.6f);
                    break;
                case QuestDifficulty.Normal:
                    titleText.color = Color.white;
                    break;
                case QuestDifficulty.Hard:
                    titleText.color = new Color(1f, 0.7f, 0.3f);
                    break;
                case QuestDifficulty.Epic:
                    titleText.color = new Color(0.8f, 0.4f, 1f);
                    break;
            }
        }

        // 进度条（可选）
        Slider progressSlider = item.GetComponentInChildren<Slider>();
        if (progressSlider != null)
        {
            progressSlider.value = quest.OverallProgress;
        }

        // 点击事件
        Button button = item.GetComponent<Button>();
        if (button != null)
        {
            QuestInstance capturedQuest = quest; // 闭包捕获
            button.onClick.AddListener(() => SelectQuest(capturedQuest));
        }
    }

    /// <summary>
    /// 选中一个任务，在详情面板中显示
    /// </summary>
    private void SelectQuest(QuestInstance quest)
    {
        selectedQuest = quest;
        RefreshDetailPanel();
    }

    /// <summary>
    /// 刷新详情面板
    /// 类似 React 中根据 selectedId 渲染详情组件
    /// </summary>
    private void RefreshDetailPanel()
    {
        if (selectedQuest == null) return;

        var data = selectedQuest.questData;

        // 基本信息
        if (detailTitle != null) detailTitle.text = data.questTitle;
        if (detailDescription != null) detailDescription.text = data.questDescription;
        if (detailGiver != null) detailGiver.text = $"任务发布者：{data.giverNPCName}";
        if (detailLevel != null)
            detailLevel.text = $"推荐等级：Lv.{data.recommendedLevel}  难度：{GetDifficultyText(data.difficulty)}";

        // 目标列表
        RefreshDetailObjectives();

        // 奖励列表
        RefreshDetailRewards();

        // 按钮状态
        UpdateActionButtons();
    }

    /// <summary>
    /// 刷新详情面板中的目标列表
    /// </summary>
    private void RefreshDetailObjectives()
    {
        if (detailObjectiveList == null) return;

        // 清除旧目标
        foreach (Transform child in detailObjectiveList)
        {
            Destroy(child.gameObject);
        }

        foreach (var progress in selectedQuest.objectiveProgresses)
        {
            GameObject objItem = Instantiate(detailObjectivePrefab, detailObjectiveList);
            TextMeshProUGUI objText = objItem.GetComponent<TextMeshProUGUI>();

            if (objText != null)
            {
                string icon = progress.isCompleted ? "●" : "○";
                string progressStr = progress.objectiveData.requiredAmount > 1
                    ? $" ({progress.ProgressText})"
                    : "";
                string optional = progress.objectiveData.isOptional ? " [可选]" : "";

                objText.text = $"{icon} {progress.objectiveData.description}{progressStr}{optional}";
                objText.color = progress.isCompleted
                    ? new Color(0.5f, 0.8f, 0.5f)
                    : Color.white;
            }
        }
    }

    /// <summary>
    /// 刷新详情面板中的奖励列表
    /// </summary>
    private void RefreshDetailRewards()
    {
        if (detailRewardList == null) return;

        foreach (Transform child in detailRewardList)
        {
            Destroy(child.gameObject);
        }

        foreach (var reward in selectedQuest.questData.rewards)
        {
            GameObject rewardItem = Instantiate(detailRewardPrefab, detailRewardList);

            // 设置奖励图标
            Image icon = rewardItem.GetComponentInChildren<Image>();
            if (icon != null && reward.icon != null)
            {
                icon.sprite = reward.icon;
            }

            // 设置奖励文本
            TextMeshProUGUI rewardText = rewardItem.GetComponentInChildren<TextMeshProUGUI>();
            if (rewardText != null)
            {
                rewardText.text = $"{reward.displayName} x{reward.amount}";
            }
        }
    }

    /// <summary>
    /// 更新操作按钮状态
    /// </summary>
    private void UpdateActionButtons()
    {
        if (selectedQuest == null) return;

        // 跟踪按钮
        bool isTracked = QuestManager.Instance.TrackedQuests.Contains(selectedQuest);
        if (trackButtonText != null)
        {
            trackButtonText.text = isTracked ? "取消跟踪" : "跟踪任务";
        }

        // 放弃按钮（主线任务不能放弃）
        if (abandonButton != null)
        {
            abandonButton.interactable = selectedQuest.questData.questType != QuestType.Main;
        }
    }

    /// <summary>
    /// 跟踪按钮点击
    /// </summary>
    private void OnTrackButtonClicked()
    {
        if (selectedQuest == null) return;
        QuestManager.Instance.TrackQuest(selectedQuest.QuestId);
        UpdateActionButtons();
    }

    /// <summary>
    /// 放弃按钮点击
    /// </summary>
    private void OnAbandonButtonClicked()
    {
        if (selectedQuest == null) return;
        QuestManager.Instance.AbandonQuest(selectedQuest.QuestId);
        selectedQuest = null;
        RefreshQuestList();
    }

    // ==================== 通知系统 ====================

    /// <summary>
    /// 显示任务接受通知
    /// </summary>
    private void ShowAcceptNotification(QuestInstance quest)
    {
        ShowNotification($"接受任务：{quest.Title}", new Color(0.3f, 0.7f, 1f));
    }

    /// <summary>
    /// 显示任务完成通知
    /// </summary>
    private void ShowCompleteNotification(QuestInstance quest)
    {
        ShowNotification($"任务完成！{quest.Title}", new Color(1f, 0.85f, 0.3f));
    }

    /// <summary>
    /// 显示目标进度通知
    /// </summary>
    private void ShowObjectiveNotification(QuestInstance quest, QuestObjectiveProgress progress)
    {
        if (progress.isCompleted)
        {
            ShowNotification($"目标完成：{progress.objectiveData.description}",
                           new Color(0.5f, 0.9f, 0.5f));
        }
        else if (progress.objectiveData.requiredAmount > 1)
        {
            ShowNotification($"{progress.objectiveData.description} {progress.ProgressText}",
                           Color.white);
        }
    }

    /// <summary>
    /// 显示通知弹窗
    /// 类似前端的 Toast 组件
    /// </summary>
    private void ShowNotification(string message, Color color)
    {
        if (notificationPrefab == null || notificationContainer == null) return;

        GameObject notification = Instantiate(notificationPrefab, notificationContainer);
        TextMeshProUGUI text = notification.GetComponentInChildren<TextMeshProUGUI>();

        if (text != null)
        {
            text.text = message;
            text.color = color;
        }

        // 3秒后自动销毁
        Destroy(notification, 3f);

        // 可以添加动画效果（淡入淡出）
        CanvasGroup canvasGroup = notification.GetComponent<CanvasGroup>();
        if (canvasGroup != null)
        {
            StartCoroutine(FadeNotification(canvasGroup, 3f));
        }
    }

    /// <summary>
    /// 通知淡出动画协程
    /// </summary>
    private System.Collections.IEnumerator FadeNotification(CanvasGroup group, float duration)
    {
        float elapsed = 0f;
        float fadeStart = duration * 0.7f; // 在70%时间后开始淡出

        while (elapsed < duration)
        {
            elapsed += Time.unscaledDeltaTime; // 使用 unscaledDeltaTime 以在暂停时仍然工作

            if (elapsed > fadeStart)
            {
                float fadeProgress = (elapsed - fadeStart) / (duration - fadeStart);
                group.alpha = 1f - fadeProgress;
            }

            yield return null;
        }
    }

    /// <summary>
    /// 获取难度文本
    /// </summary>
    private string GetDifficultyText(QuestDifficulty difficulty)
    {
        switch (difficulty)
        {
            case QuestDifficulty.Easy: return "简单";
            case QuestDifficulty.Normal: return "普通";
            case QuestDifficulty.Hard: return "困难";
            case QuestDifficulty.Epic: return "史诗";
            default: return "未知";
        }
    }
}
```

[截图：任务日志面板的完整UI布局，左侧任务列表，右侧详情面板]

[截图：任务通知弹窗效果 —— "任务完成！猎杀野狼"]

---

## 21.5 任务发布者 NPC

### 21.5.1 QuestGiver.cs —— NPC 任务交互

创建 `Scripts/Quest/QuestGiver.cs`：

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

/// <summary>
/// 任务发布者 NPC —— 挂载在 NPC 身上，管理任务交互
///
/// NPC 头顶会显示不同的标记：
/// - ！（黄色感叹号）—— 有新任务可接
/// - ？（灰色问号）—— 有进行中的任务但未完成
/// - ？（金色问号）—— 有可交付的任务
///
/// 这些标记类似前端中 Badge 组件或通知红点
/// </summary>
public class QuestGiver : MonoBehaviour
{
    [Header("NPC 信息")]
    [Tooltip("NPC 名称（需要与 QuestData 中的 giverNPCName 一致）")]
    [SerializeField] private string npcName;

    [Tooltip("NPC 显示名称")]
    [SerializeField] private string displayName;

    [Header("交互配置")]
    [Tooltip("交互触发距离")]
    [SerializeField] private float interactionRange = 3f;

    [Tooltip("交互提示文本")]
    [SerializeField] private string interactionPrompt = "按 E 与 {0} 对话";

    [Header("头顶标记")]
    [Tooltip("任务标记显示位置（NPC头顶的 Transform）")]
    [SerializeField] private Transform markerPosition;

    [Tooltip("新任务标记（黄色感叹号）")]
    [SerializeField] private GameObject newQuestMarker;

    [Tooltip("任务进行中标记（灰色问号）")]
    [SerializeField] private GameObject activeQuestMarker;

    [Tooltip("可交付标记（金色问号）")]
    [SerializeField] private GameObject completableQuestMarker;

    [Header("对话 UI")]
    [Tooltip("对话面板")]
    [SerializeField] private GameObject dialoguePanel;

    [Tooltip("NPC 名称文本")]
    [SerializeField] private TextMeshProUGUI npcNameText;

    [Tooltip("对话文本")]
    [SerializeField] private TextMeshProUGUI dialogueText;

    [Tooltip("任务选项按钮容器")]
    [SerializeField] private Transform questOptionContainer;

    [Tooltip("任务选项按钮预制体")]
    [SerializeField] private GameObject questOptionPrefab;

    [Tooltip("接受按钮")]
    [SerializeField] private Button acceptButton;

    [Tooltip("拒绝按钮")]
    [SerializeField] private Button declineButton;

    [Tooltip("交付按钮")]
    [SerializeField] private Button completeButton;

    // 玩家引用
    private Transform playerTransform;
    private bool isPlayerInRange = false;
    private bool isDialogueOpen = false;

    // 当前交互状态
    private QuestGiverState currentState = QuestGiverState.NoQuests;
    private QuestData selectedQuestToGive;
    private QuestInstance selectedQuestToComplete;

    // 缓存的任务列表
    private List<QuestData> availableQuests = new List<QuestData>();
    private List<QuestInstance> completableQuests = new List<QuestInstance>();

    private void Start()
    {
        // 查找玩家
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null)
            playerTransform = player.transform;

        // 初始化 UI
        dialoguePanel?.SetActive(false);
        acceptButton?.onClick.AddListener(OnAcceptQuest);
        declineButton?.onClick.AddListener(OnDeclineQuest);
        completeButton?.onClick.AddListener(OnCompleteQuest);

        // 订阅任务事件（任务完成时更新标记）
        if (QuestManager.Instance != null)
        {
            QuestManager.Instance.OnQuestCompleted += OnAnyQuestCompleted;
            QuestManager.Instance.OnQuestAccepted += OnAnyQuestAccepted;
        }

        // 初始更新标记状态
        UpdateMarkerState();
    }

    private void Update()
    {
        if (playerTransform == null) return;

        // 检查玩家是否在交互范围内
        float distance = Vector3.Distance(transform.position, playerTransform.position);
        bool wasInRange = isPlayerInRange;
        isPlayerInRange = distance <= interactionRange;

        // 进入/离开范围的处理
        if (isPlayerInRange && !wasInRange)
        {
            OnPlayerEnterRange();
        }
        else if (!isPlayerInRange && wasInRange)
        {
            OnPlayerExitRange();
        }

        // 交互输入检测
        if (isPlayerInRange && Input.GetKeyDown(KeyCode.E))
        {
            if (!isDialogueOpen)
                OpenDialogue();
            else
                CloseDialogue();
        }

        // 让标记面向摄像机（Billboard 效果）
        if (markerPosition != null && Camera.main != null)
        {
            markerPosition.LookAt(Camera.main.transform);
            markerPosition.Rotate(0, 180f, 0); // 翻转朝向
        }
    }

    /// <summary>
    /// 更新 NPC 头顶标记状态
    /// </summary>
    private void UpdateMarkerState()
    {
        if (QuestManager.Instance == null) return;

        // 检查可用任务和可交付任务
        availableQuests = QuestManager.Instance.GetAvailableQuestsForNPC(npcName);
        completableQuests = QuestManager.Instance.GetCompletableQuestsForNPC(npcName);

        // 隐藏所有标记
        newQuestMarker?.SetActive(false);
        activeQuestMarker?.SetActive(false);
        completableQuestMarker?.SetActive(false);

        // 优先级：可交付 > 新任务 > 进行中
        if (completableQuests.Count > 0)
        {
            completableQuestMarker?.SetActive(true);
            currentState = QuestGiverState.HasCompletable;
        }
        else if (availableQuests.Count > 0)
        {
            newQuestMarker?.SetActive(true);
            currentState = QuestGiverState.HasNewQuest;
        }
        else
        {
            // 检查是否有该NPC的进行中任务
            bool hasActiveQuest = QuestManager.Instance.ActiveQuests
                .Exists(q => q.questData.giverNPCName == npcName);

            if (hasActiveQuest)
            {
                activeQuestMarker?.SetActive(true);
                currentState = QuestGiverState.HasActiveQuest;
            }
            else
            {
                currentState = QuestGiverState.NoQuests;
            }
        }
    }

    /// <summary>
    /// 玩家进入交互范围
    /// </summary>
    private void OnPlayerEnterRange()
    {
        // 显示交互提示（"按 E 与 村长 对话"）
        Debug.Log(string.Format(interactionPrompt, displayName));
        // UIManager.Instance?.ShowInteractionPrompt(string.Format(interactionPrompt, displayName));
    }

    /// <summary>
    /// 玩家离开交互范围
    /// </summary>
    private void OnPlayerExitRange()
    {
        if (isDialogueOpen)
            CloseDialogue();
        // UIManager.Instance?.HideInteractionPrompt();
    }

    /// <summary>
    /// 打开对话面板
    /// </summary>
    private void OpenDialogue()
    {
        isDialogueOpen = true;
        dialoguePanel?.SetActive(true);

        if (npcNameText != null)
            npcNameText.text = displayName;

        // 刷新可用任务
        UpdateMarkerState();

        // 根据状态显示不同的对话内容
        switch (currentState)
        {
            case QuestGiverState.HasCompletable:
                ShowCompletableQuestDialogue();
                break;

            case QuestGiverState.HasNewQuest:
                ShowNewQuestDialogue();
                break;

            case QuestGiverState.HasActiveQuest:
                ShowActiveQuestDialogue();
                break;

            case QuestGiverState.NoQuests:
                ShowNoQuestDialogue();
                break;
        }
    }

    /// <summary>
    /// 显示可交付任务的对话
    /// </summary>
    private void ShowCompletableQuestDialogue()
    {
        selectedQuestToComplete = completableQuests[0];

        if (dialogueText != null)
        {
            string completionText = selectedQuestToComplete.questData.completionDialogue;
            if (string.IsNullOrEmpty(completionText))
            {
                completionText = $"太好了！你完成了「{selectedQuestToComplete.Title}」！这是你应得的奖励。";
            }
            dialogueText.text = completionText;
        }

        acceptButton?.gameObject.SetActive(false);
        declineButton?.gameObject.SetActive(false);
        completeButton?.gameObject.SetActive(true);
    }

    /// <summary>
    /// 显示新任务对话
    /// </summary>
    private void ShowNewQuestDialogue()
    {
        // 如果只有一个任务，直接显示
        if (availableQuests.Count == 1)
        {
            selectedQuestToGive = availableQuests[0];
            ShowQuestDetail(selectedQuestToGive);
        }
        else
        {
            // 多个任务，显示选择列表
            ShowQuestOptions();
        }
    }

    /// <summary>
    /// 显示任务选项列表
    /// </summary>
    private void ShowQuestOptions()
    {
        if (dialogueText != null)
            dialogueText.text = $"你好，冒险者。我这里有一些需要帮忙的事情：";

        // 清除旧选项
        if (questOptionContainer != null)
        {
            foreach (Transform child in questOptionContainer)
                Destroy(child.gameObject);
        }

        // 创建选项按钮
        foreach (var questData in availableQuests)
        {
            GameObject option = Instantiate(questOptionPrefab, questOptionContainer);
            TextMeshProUGUI optionText = option.GetComponentInChildren<TextMeshProUGUI>();
            if (optionText != null)
            {
                optionText.text = $"[Lv.{questData.recommendedLevel}] {questData.questTitle}";
            }

            Button optionButton = option.GetComponent<Button>();
            QuestData capturedData = questData;
            optionButton?.onClick.AddListener(() =>
            {
                selectedQuestToGive = capturedData;
                ShowQuestDetail(capturedData);
            });
        }

        acceptButton?.gameObject.SetActive(false);
        declineButton?.gameObject.SetActive(false);
        completeButton?.gameObject.SetActive(false);
    }

    /// <summary>
    /// 显示任务详情（用于接受前预览）
    /// </summary>
    private void ShowQuestDetail(QuestData questData)
    {
        if (dialogueText != null)
        {
            dialogueText.text = $"<b>{questData.questTitle}</b>\n\n{questData.questDescription}\n\n";

            // 显示奖励预览
            string rewardText = "奖励：\n";
            foreach (var reward in questData.rewards)
            {
                rewardText += $"  - {reward.displayName} x{reward.amount}\n";
            }
            dialogueText.text += rewardText;
        }

        acceptButton?.gameObject.SetActive(true);
        declineButton?.gameObject.SetActive(true);
        completeButton?.gameObject.SetActive(false);
    }

    /// <summary>
    /// 显示进行中任务的对话（提醒玩家）
    /// </summary>
    private void ShowActiveQuestDialogue()
    {
        if (dialogueText != null)
            dialogueText.text = "你还有未完成的任务。加油，我相信你能做到！";

        acceptButton?.gameObject.SetActive(false);
        declineButton?.gameObject.SetActive(false);
        completeButton?.gameObject.SetActive(false);
    }

    /// <summary>
    /// 没有任务时的闲聊对话
    /// </summary>
    private void ShowNoQuestDialogue()
    {
        if (dialogueText != null)
            dialogueText.text = "你好，冒险者。最近一切都很平静。";

        acceptButton?.gameObject.SetActive(false);
        declineButton?.gameObject.SetActive(false);
        completeButton?.gameObject.SetActive(false);
    }

    // ==================== 按钮回调 ====================

    /// <summary>
    /// 接受任务
    /// </summary>
    private void OnAcceptQuest()
    {
        if (selectedQuestToGive == null) return;

        bool success = QuestManager.Instance.AcceptQuest(selectedQuestToGive.questId);
        if (success)
        {
            if (dialogueText != null)
                dialogueText.text = $"很好！祝你好运，冒险者！";

            // 短暂延迟后关闭对话
            Invoke(nameof(CloseDialogue), 1.5f);
        }

        selectedQuestToGive = null;
        UpdateMarkerState();
    }

    /// <summary>
    /// 拒绝任务
    /// </summary>
    private void OnDeclineQuest()
    {
        if (dialogueText != null)
            dialogueText.text = "没关系，需要帮忙的时候再来找我。";

        selectedQuestToGive = null;

        Invoke(nameof(CloseDialogue), 1.5f);
    }

    /// <summary>
    /// 交付完成的任务
    /// </summary>
    private void OnCompleteQuest()
    {
        if (selectedQuestToComplete == null) return;

        selectedQuestToComplete.Complete();

        if (dialogueText != null)
            dialogueText.text = "感谢你的帮助！奖励已经给你了。";

        selectedQuestToComplete = null;
        UpdateMarkerState();

        Invoke(nameof(CloseDialogue), 2f);
    }

    /// <summary>
    /// 关闭对话面板
    /// </summary>
    private void CloseDialogue()
    {
        isDialogueOpen = false;
        dialoguePanel?.SetActive(false);
        selectedQuestToGive = null;
        selectedQuestToComplete = null;
    }

    /// <summary>
    /// 任何任务完成/接受时更新标记
    /// </summary>
    private void OnAnyQuestCompleted(QuestInstance quest) => UpdateMarkerState();
    private void OnAnyQuestAccepted(QuestInstance quest) => UpdateMarkerState();

    /// <summary>
    /// 在 Scene 视图中绘制交互范围（仅编辑器）
    /// </summary>
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, interactionRange);
    }
}

/// <summary>
/// NPC 任务发布者的状态枚举
/// </summary>
public enum QuestGiverState
{
    NoQuests,           // 没有任务
    HasNewQuest,        // 有新任务可接
    HasActiveQuest,     // 有进行中的任务
    HasCompletable      // 有可交付的任务
}
```

[截图：NPC 头顶的黄色感叹号标记，表示有新任务]

[截图：NPC 对话面板，展示任务描述和接受/拒绝按钮]

[截图：NPC 头顶的金色问号标记，表示有可交付的任务]

---

## 21.6 世界标记系统

### 21.6.1 任务目标的世界标记

在开放世界游戏中，任务目标的位置需要在3D世界中用标记指示：

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// 任务世界标记 —— 在3D世界中显示任务目标的位置
/// 使用屏幕空间 UI 元素跟随3D世界坐标
///
/// 类似前端中将地图坐标转换为屏幕像素位置（如 Google Maps 标记）
/// </summary>
public class QuestWorldMarker : MonoBehaviour
{
    [Header("UI 引用")]
    [SerializeField] private Canvas markerCanvas;
    [SerializeField] private Image markerIcon;
    [SerializeField] private TextMeshProUGUI distanceText;
    [SerializeField] private Image directionArrow; // 目标在屏幕外时的方向箭头

    [Header("配置")]
    [SerializeField] private float maxVisibleDistance = 200f;
    [SerializeField] private float minIconScale = 0.3f;
    [SerializeField] private float maxIconScale = 1f;
    [SerializeField] private float edgePadding = 50f; // 屏幕边缘内边距

    // 目标世界位置
    private Vector3 targetWorldPosition;
    private bool isActive = false;
    private Camera mainCamera;

    public void SetTarget(Vector3 worldPosition)
    {
        targetWorldPosition = worldPosition;
        isActive = true;
    }

    public void Hide()
    {
        isActive = false;
        markerIcon?.gameObject.SetActive(false);
        directionArrow?.gameObject.SetActive(false);
    }

    private void Start()
    {
        mainCamera = Camera.main;
    }

    private void LateUpdate()
    {
        if (!isActive || mainCamera == null) return;

        // 计算到目标的距离
        float distance = Vector3.Distance(mainCamera.transform.position, targetWorldPosition);

        // 超过最大距离则隐藏
        if (distance > maxVisibleDistance)
        {
            markerIcon?.gameObject.SetActive(false);
            directionArrow?.gameObject.SetActive(false);
            return;
        }

        // 将世界坐标转换为屏幕坐标
        // 类似前端中将经纬度转换为像素坐标
        Vector3 screenPos = mainCamera.WorldToScreenPoint(targetWorldPosition);

        // 检查目标是否在摄像机前方
        bool isInFront = screenPos.z > 0;

        // 检查是否在屏幕内
        bool isOnScreen = isInFront &&
                          screenPos.x > edgePadding &&
                          screenPos.x < Screen.width - edgePadding &&
                          screenPos.y > edgePadding &&
                          screenPos.y < Screen.height - edgePadding;

        if (isOnScreen)
        {
            // 目标在屏幕内 —— 显示图标
            markerIcon?.gameObject.SetActive(true);
            directionArrow?.gameObject.SetActive(false);

            // 设置位置
            transform.position = screenPos;

            // 根据距离缩放
            float scaleFactor = Mathf.Lerp(maxIconScale, minIconScale,
                distance / maxVisibleDistance);
            transform.localScale = Vector3.one * scaleFactor;

            // 更新距离文本
            if (distanceText != null)
            {
                distanceText.text = distance > 100f
                    ? $"{distance:F0}m"
                    : $"{distance:F1}m";
            }
        }
        else
        {
            // 目标在屏幕外 —— 显示方向箭头在屏幕边缘
            markerIcon?.gameObject.SetActive(false);
            directionArrow?.gameObject.SetActive(true);

            // 将屏幕外的位置限制到屏幕边缘
            Vector3 clampedPos = screenPos;

            if (!isInFront)
            {
                // 目标在摄像机后方，翻转坐标
                clampedPos.x = Screen.width - clampedPos.x;
                clampedPos.y = Screen.height - clampedPos.y;
            }

            clampedPos.x = Mathf.Clamp(clampedPos.x, edgePadding, Screen.width - edgePadding);
            clampedPos.y = Mathf.Clamp(clampedPos.y, edgePadding, Screen.height - edgePadding);

            directionArrow.transform.position = clampedPos;

            // 旋转箭头指向目标方向
            Vector3 direction = (new Vector3(screenPos.x, screenPos.y, 0) -
                                new Vector3(Screen.width / 2f, Screen.height / 2f, 0)).normalized;
            float angle = Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg;
            directionArrow.transform.rotation = Quaternion.Euler(0, 0, angle - 90f);
        }
    }
}
```

[截图：3D世界中的任务目标标记，显示距离和图标]

[截图：目标在屏幕外时屏幕边缘的方向箭头]

---

## 21.7 与前端状态管理的对比

### 21.7.1 架构对比

让我们将任务系统的架构和前端常见的状态管理模式做一个详细对比：

```
前端 Redux 架构：
┌─────────────────────────────────────────────┐
│  Store (单一数据源)                           │
│  ├── state.quests: QuestState[]              │
│  ├── reducers/questReducer.ts               │
│  └── actions: acceptQuest, completeQuest... │
├─────────────────────────────────────────────┤
│  Components (订阅 store 变化)                │
│  ├── QuestList.tsx                           │
│  ├── QuestTracker.tsx                        │
│  └── QuestNotification.tsx                   │
├─────────────────────────────────────────────┤
│  Middleware (副作用处理)                      │
│  ├── questSaga.ts (处理异步逻辑)             │
│  └── rewardMiddleware.ts (发放奖励)          │
└─────────────────────────────────────────────┘

Unity 任务系统架构：
┌─────────────────────────────────────────────┐
│  QuestManager (单例，单一数据源)              │
│  ├── allQuests: Dictionary<string, Quest>   │
│  ├── 方法: AcceptQuest, ReportKill...        │
│  └── 事件: OnQuestCompleted, ...             │
├─────────────────────────────────────────────┤
│  UI 组件 (订阅事件)                          │
│  ├── QuestUI.cs                              │
│  ├── QuestTracker.cs                         │
│  └── 通知系统                                │
├─────────────────────────────────────────────┤
│  游戏逻辑 (报告事件)                         │
│  ├── 敌人死亡 -> ReportKill()               │
│  ├── 拾取物品 -> ReportCollect()            │
│  └── NPC 对话 -> ReportTalk()               │
└─────────────────────────────────────────────┘
```

核心思想是一致的：**单一数据源 + 事件驱动 + 关注点分离**。

---

## 21.8 创建示例任务

### 21.8.1 在编辑器中创建任务

手把手操作步骤：

1. 在 Project 面板中创建文件夹：`Assets/Data/Quests/`
2. 右键 -> Create -> Quest System -> Quest Data
3. 命名为 "Quest_HuntWolves"
4. 在 Inspector 中填写：
   - Quest ID: "quest_hunt_wolves"
   - Quest Title: "猎杀野狼"
   - Quest Description: "村庄附近的野狼越来越多..."
   - Quest Type: Side
   - Recommended Level: 3
   - Objectives: 添加一个 Kill 类型目标
   - Rewards: 添加经验值和金币奖励

[截图：完整填写好的 QuestData 资源在 Inspector 中的样子]

---

## 练习题

### 练习1：基础练习 —— 收集任务
创建一个 "收集草药" 任务：
- 需要收集 5 个草药
- 奖励 100 经验值和 50 金币
- 在场景中放置 5 个可拾取的草药对象
- 拾取时调用 `QuestManager.Instance.ReportCollect("herb")`
- 验证任务进度追踪和完成逻辑

### 练习2：进阶练习 —— 多目标任务
创建一个包含多个目标的复合任务：
- 目标1：击杀 3 只野狼（Kill 类型）
- 目标2：收集 2 张狼皮（Collect 类型）
- 目标3（可选）：找到隐藏的狼穴（Explore 类型）
- 完成可选目标额外奖励

### 练习3：高级练习 —— 任务链
创建一个包含 3 个环节的任务链：
- 任务1："初来乍到" —— 与村长对话
- 任务2："村庄的危机" —— 击杀 5 只野狼（前置：任务1）
- 任务3："英雄的奖赏" —— 回去找村长交付（前置：任务2）
- 每个任务完成后自动开启下一个

### 练习4：挑战练习 —— 限时护送任务
实现一个限时护送任务：
- NPC 跟随玩家移动（使用 NavMeshAgent）
- 需要在 10 分钟内（游戏时间）护送到目的地
- 如果 NPC 生命值降为 0 或超时，任务失败
- 到达目的地时任务自动完成

---

## 下一章预告

在下一章**第22章：小地图与世界地图系统**中，我们将学习：

- 使用渲染纹理（Render Texture）实现小地图
- 小地图上的图标系统（玩家、NPC、敌人、任务标记）
- 小地图缩放和旋转模式
- 全屏世界地图叠加层
- 战争迷雾（已探索区域显示）
- 路标系统（点击地图设置路标，3D世界中显示方向指引）
- 快速传送系统

任务系统中的世界标记将和地图系统深度集成 —— 任务目标会自动在小地图和世界地图上显示对应的图标。
