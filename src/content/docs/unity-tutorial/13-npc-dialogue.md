# 第十三章：NPC 对话系统

## 本章目标

通过本章学习，你将掌握：

1. 设计灵活的对话数据结构（对话树、对话节点）
2. 使用 ScriptableObject 创建可编辑的对话内容
3. 实现 NPC 交互触发机制（近距离检测 + 射线检测）
4. 构建对话 UI 面板（打字机文字效果）
5. 实现分支对话系统（玩家选择影响走向）
6. 添加对话条件检查（任务状态、背包物品）
7. 实现对话后果系统（给予物品、开始任务、改变 NPC 状态）
8. 制作 NPC 交互指示器（浮动图标）
9. 实现 NPC 头像显示
10. 了解基础 NPC 日程行为

## 预计学习时间

**4-5 小时**

---

## 13.1 对话系统架构总览

### 从前端角度理解对话系统

对话系统的本质是一个**状态机 + 数据驱动的 UI 流程**。如果你做过前端的多步表单（wizard/stepper），或者聊天机器人界面，对话系统的模式会非常熟悉：

| 前端概念 | 对话系统对应 |
|---------|------------|
| 多步表单的步骤定义 | DialogueNode（对话节点） |
| 表单的完整流程 | DialogueData（对话树） |
| 条件渲染（v-if / &&） | DialogueCondition（对话条件） |
| 表单提交后的副作用 | DialogueConsequence（对话后果） |
| 用户点击"下一步" | 点击继续/选择选项 |
| 状态管理器 | DialogueManager（单例） |
| UI 组件 | DialogueUI |

### 系统架构图

```
┌─────────────────────────────────────────────┐
│           DialogueData (ScriptableObject)    │
│  包含一棵对话树的所有节点数据                   │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│  │ Node 0  │──→│ Node 1  │──→│ Node 2  │   │
│  │ (NPC说) │   │(玩家选) │   │ (NPC答) │   │
│  └─────────┘   └────┬────┘   └─────────┘   │
│                     │ 选项B                  │
│                ┌────▼────┐                   │
│                │ Node 3  │                   │
│                │ (NPC答) │                   │
│                └─────────┘                   │
└──────────────────┬──────────────────────────┘
                   │ 数据引用
┌──────────────────▼──────────────────────────┐
│            NPCInteractable                   │
│  挂载在 NPC 上，持有 DialogueData 引用        │
│  处理交互触发（范围检测 / 射线检测）            │
└──────────────────┬──────────────────────────┘
                   │ 启动对话
┌──────────────────▼──────────────────────────┐
│            DialogueManager                   │
│  管理对话流程：开始 → 推进 → 分支 → 结束      │
│  检查条件，执行后果                            │
└──────────────────┬──────────────────────────┘
                   │ 驱动 UI
┌──────────────────▼──────────────────────────┐
│              DialogueUI                      │
│  显示对话文本（打字机效果）                     │
│  显示选项按钮                                  │
│  显示 NPC 头像                                │
└─────────────────────────────────────────────┘
```

---

## 13.2 对话数据结构设计

### DialogueNode.cs - 对话节点

```csharp
// DialogueNode.cs
// 对话节点 - 对话树中的单个节点
// 每个节点代表一句对话、一组选项、或一个事件

using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 对话条件类型
/// 决定对话节点是否可见/可选
/// </summary>
public enum ConditionType
{
    /// <summary>无条件，始终可用</summary>
    None,

    /// <summary>检查背包中是否拥有某物品</summary>
    HasItem,

    /// <summary>检查任务是否已开始</summary>
    QuestStarted,

    /// <summary>检查任务是否已完成</summary>
    QuestCompleted,

    /// <summary>检查玩家等级</summary>
    PlayerLevel,

    /// <summary>检查全局标志位（用于记录剧情进度等）</summary>
    GlobalFlag
}

/// <summary>
/// 对话后果类型
/// 选择某个选项或完成对话后触发的效果
/// </summary>
public enum ConsequenceType
{
    /// <summary>无后果</summary>
    None,

    /// <summary>给予玩家物品</summary>
    GiveItem,

    /// <summary>从玩家背包移除物品</summary>
    RemoveItem,

    /// <summary>开始一个任务</summary>
    StartQuest,

    /// <summary>完成一个任务</summary>
    CompleteQuest,

    /// <summary>改变 NPC 的状态/好感度</summary>
    ChangeNPCState,

    /// <summary>设置全局标志位</summary>
    SetGlobalFlag,

    /// <summary>给予金币</summary>
    GiveGold,

    /// <summary>触发过场动画</summary>
    TriggerCutscene
}

/// <summary>
/// 对话条件 - 控制对话节点或选项的可见性
///
/// 前端类比：
/// 这类似于 React 中的条件渲染
/// {hasItem && <DialogueOption ... />}
/// </summary>
[System.Serializable]
public class DialogueCondition
{
    [Tooltip("条件类型")]
    public ConditionType conditionType = ConditionType.None;

    [Tooltip("条件参数（物品ID/任务ID/标志名称）")]
    public string conditionParam = "";

    [Tooltip("需要的数量（物品数量/等级要求）")]
    public int requiredAmount = 1;

    [Tooltip("是否取反（变为"没有某物品"等）")]
    public bool invertCondition = false;
}

/// <summary>
/// 对话后果 - 选择某选项后触发的效果
///
/// 前端类比：
/// 类似于表单提交后的副作用（useEffect / onSubmit）
/// </summary>
[System.Serializable]
public class DialogueConsequence
{
    [Tooltip("后果类型")]
    public ConsequenceType consequenceType = ConsequenceType.None;

    [Tooltip("后果参数（物品数据/任务ID/标志名称）")]
    public string consequenceParam = "";

    [Tooltip("数量参数")]
    public int amount = 1;

    [Tooltip("关联的物品数据（给予/移除物品时使用）")]
    public ItemData itemData;
}

/// <summary>
/// 对话选项 - 玩家可选择的回应
/// </summary>
[System.Serializable]
public class DialogueChoice
{
    [Tooltip("选项显示文本")]
    public string choiceText;

    [Tooltip("选择此选项后跳转到的节点索引（-1 = 结束对话）")]
    public int nextNodeIndex = -1;

    [Tooltip("显示此选项的条件（可选）")]
    public DialogueCondition condition;

    [Tooltip("选择此选项的后果（可选）")]
    public List<DialogueConsequence> consequences = new List<DialogueConsequence>();
}

/// <summary>
/// 对话节点 - 对话树中的一个节点
///
/// 一个节点包含：
/// - 说话者信息（谁在说话）
/// - 对话文本（说了什么）
/// - 下一个节点的索引或玩家选项列表
///
/// 节点类型通过 choices 列表的数量决定：
/// - choices 为空 → 普通对话，点击继续到 nextNodeIndex
/// - choices 有内容 → 分支对话，玩家必须选择
/// </summary>
[System.Serializable]
public class DialogueNode
{
    [Header("说话者信息")]
    [Tooltip("说话者名称（NPC 名字或 '玩家'）")]
    public string speakerName;

    [Tooltip("说话者头像")]
    public Sprite speakerPortrait;

    [Header("对话内容")]
    [Tooltip("对话文本内容（支持富文本标签）")]
    [TextArea(3, 8)]
    public string dialogueText;

    [Header("流程控制")]
    [Tooltip("下一个节点的索引（当没有选项时使用，-1 = 结束对话）")]
    public int nextNodeIndex = -1;

    [Tooltip("玩家可选择的选项列表（为空时按 nextNodeIndex 推进）")]
    public List<DialogueChoice> choices = new List<DialogueChoice>();

    [Header("条件与后果")]
    [Tooltip("显示此节点的前置条件")]
    public DialogueCondition showCondition;

    [Tooltip("进入此节点时自动触发的后果")]
    public List<DialogueConsequence> onEnterConsequences = new List<DialogueConsequence>();

    [Header("表现设置")]
    [Tooltip("打字机效果的字符速度（秒/字）")]
    public float typeSpeed = 0.05f;

    [Tooltip("对话时播放的音效")]
    public AudioClip dialogueSound;

    [Tooltip("对话时触发的动画参数名")]
    public string animationTrigger = "";

    /// <summary>
    /// 检查此节点是否有玩家选项
    /// </summary>
    public bool HasChoices => choices != null && choices.Count > 0;
}
```

### DialogueData.cs - 对话数据（ScriptableObject）

```csharp
// DialogueData.cs
// 对话数据 ScriptableObject - 一棵完整的对话树
// 类似前端中的一个 JSON 配置文件，定义了完整的对话流程

using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 对话数据 ScriptableObject
///
/// 包含一段完整对话的所有节点。对话从第一个节点（索引0）开始，
/// 通过 nextNodeIndex 或 choices 推进到下一个节点。
///
/// 创建方式：
/// Project 窗口右键 → Create → Dialogue → Dialogue Data
///
/// 编辑方式：
/// 1. 在 Inspector 中手动编辑节点列表
/// 2.（进阶）可以开发自定义的节点编辑器窗口
///
/// 前端类比：
/// 这类似于一个 JSON 格式的流程配置：
/// {
///   "nodes": [
///     { "text": "你好", "next": 1 },
///     { "text": "选择一个选项", "choices": [...] }
///   ]
/// }
/// </summary>
[CreateAssetMenu(fileName = "NewDialogue", menuName = "Dialogue/Dialogue Data")]
public class DialogueData : ScriptableObject
{
    [Header("对话基本信息")]
    [Tooltip("对话的唯一标识符")]
    public string dialogueId;

    [Tooltip("对话标题（编辑器中显示用）")]
    public string dialogueTitle;

    [Header("对话节点")]
    [Tooltip("所有对话节点列表，索引0为起始节点")]
    public List<DialogueNode> nodes = new List<DialogueNode>();

    [Header("全局设置")]
    [Tooltip("对话是否可重复触发")]
    public bool repeatable = true;

    [Tooltip("对话已完成后的替代对话（可选）")]
    public DialogueData completedAlternative;

    [Tooltip("默认打字速度（节点未指定时使用）")]
    public float defaultTypeSpeed = 0.04f;

    /// <summary>
    /// 获取起始节点
    /// </summary>
    public DialogueNode GetStartNode()
    {
        if (nodes == null || nodes.Count == 0)
        {
            Debug.LogWarning($"[DialogueData] 对话 '{dialogueTitle}' 没有任何节点");
            return null;
        }
        return nodes[0];
    }

    /// <summary>
    /// 根据索引获取节点
    /// </summary>
    /// <param name="index">节点索引</param>
    /// <returns>对话节点，如果索引无效返回 null</returns>
    public DialogueNode GetNode(int index)
    {
        if (index < 0 || index >= nodes.Count)
            return null;
        return nodes[index];
    }

    /// <summary>
    /// 获取节点总数
    /// </summary>
    public int NodeCount => nodes != null ? nodes.Count : 0;
}
```

[截图：在 Inspector 中编辑 DialogueData ScriptableObject，展示节点列表和选项配置]

---

## 13.3 对话管理器

```csharp
// DialogueManager.cs
// 对话管理器 - 控制整个对话流程
// 单例模式，管理对话的开始、推进、分支和结束

using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 对话管理器 - 单例模式
///
/// 核心职责：
/// 1. 管理对话的状态（是否正在对话、当前节点等）
/// 2. 推进对话流程（下一句、选择分支）
/// 3. 检查对话条件
/// 4. 执行对话后果
/// 5. 通知 UI 更新
///
/// 前端类比：
/// 类似于一个状态机管理器（如 XState），
/// 根据当前状态和用户输入决定下一个状态
/// </summary>
public class DialogueManager : MonoBehaviour
{
    // ========== 单例 ==========
    public static DialogueManager Instance { get; private set; }

    // ========== 状态 ==========

    /// <summary>是否正在进行对话</summary>
    public bool IsDialogueActive { get; private set; } = false;

    /// <summary>当前对话数据</summary>
    private DialogueData currentDialogue;

    /// <summary>当前节点索引</summary>
    private int currentNodeIndex;

    /// <summary>当前正在交互的 NPC</summary>
    private NPCInteractable currentNPC;

    /// <summary>已完成的对话ID集合（用于判断对话是否已触发过）</summary>
    private HashSet<string> completedDialogues = new HashSet<string>();

    /// <summary>全局标志位字典（用于存储剧情进度等）</summary>
    private Dictionary<string, bool> globalFlags = new Dictionary<string, bool>();

    // ========== 事件 ==========

    /// <summary>对话开始事件</summary>
    public event Action<DialogueData> OnDialogueStarted;

    /// <summary>对话节点变化事件 - 参数：当前节点</summary>
    public event Action<DialogueNode> OnNodeChanged;

    /// <summary>对话结束事件</summary>
    public event Action OnDialogueEnded;

    /// <summary>需要显示选项事件 - 参数：可用选项列表</summary>
    public event Action<List<DialogueChoice>> OnChoicesAvailable;

    // ========== 引用 ==========

    [Header("引用")]
    [Tooltip("对话 UI（可自动查找）")]
    [SerializeField] private DialogueUI dialogueUI;

    // ========== 生命周期 ==========

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
        // 自动查找 DialogueUI
        if (dialogueUI == null)
        {
            dialogueUI = FindObjectOfType<DialogueUI>();
        }
    }

    private void Update()
    {
        // 对话进行中按空格/点击继续
        if (IsDialogueActive && (Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0)))
        {
            // 如果 UI 正在播放打字机效果，先完成显示
            if (dialogueUI != null && dialogueUI.IsTyping)
            {
                dialogueUI.CompleteTyping();
                return;
            }

            // 如果当前节点有选项，不能通过点击推进（必须选择）
            DialogueNode currentNode = GetCurrentNode();
            if (currentNode != null && currentNode.HasChoices)
            {
                return; // 等待玩家选择
            }

            // 推进到下一个节点
            AdvanceDialogue();
        }
    }

    // ========== 对话控制 ==========

    /// <summary>
    /// 开始一段对话
    /// </summary>
    /// <param name="dialogue">对话数据</param>
    /// <param name="npc">发起对话的 NPC（可选）</param>
    public void StartDialogue(DialogueData dialogue, NPCInteractable npc = null)
    {
        if (dialogue == null)
        {
            Debug.LogWarning("[DialogueManager] 尝试开始空对话");
            return;
        }

        if (IsDialogueActive)
        {
            Debug.LogWarning("[DialogueManager] 已有对话在进行中");
            return;
        }

        // 检查是否已完成且有替代对话
        if (completedDialogues.Contains(dialogue.dialogueId) &&
            dialogue.completedAlternative != null)
        {
            dialogue = dialogue.completedAlternative;
        }

        // 检查是否不可重复且已完成
        if (!dialogue.repeatable && completedDialogues.Contains(dialogue.dialogueId))
        {
            Debug.Log($"[DialogueManager] 对话 '{dialogue.dialogueTitle}' 已完成且不可重复");
            return;
        }

        currentDialogue = dialogue;
        currentNodeIndex = 0;
        currentNPC = npc;
        IsDialogueActive = true;

        Debug.Log($"[DialogueManager] 开始对话: {dialogue.dialogueTitle}");

        // 触发对话开始事件
        OnDialogueStarted?.Invoke(dialogue);

        // 显示第一个节点
        ShowCurrentNode();
    }

    /// <summary>
    /// 推进对话到下一个节点
    /// </summary>
    public void AdvanceDialogue()
    {
        if (!IsDialogueActive) return;

        DialogueNode currentNode = GetCurrentNode();
        if (currentNode == null)
        {
            EndDialogue();
            return;
        }

        // 获取下一个节点索引
        int nextIndex = currentNode.nextNodeIndex;

        if (nextIndex < 0 || nextIndex >= currentDialogue.NodeCount)
        {
            // 没有下一个节点，结束对话
            EndDialogue();
        }
        else
        {
            // 移动到下一个节点
            currentNodeIndex = nextIndex;
            ShowCurrentNode();
        }
    }

    /// <summary>
    /// 玩家选择了一个对话选项
    /// </summary>
    /// <param name="choiceIndex">选项在当前节点 choices 列表中的索引</param>
    public void SelectChoice(int choiceIndex)
    {
        if (!IsDialogueActive) return;

        DialogueNode currentNode = GetCurrentNode();
        if (currentNode == null || !currentNode.HasChoices) return;

        // 获取可用选项列表（已过滤条件）
        List<DialogueChoice> availableChoices = GetAvailableChoices(currentNode);

        if (choiceIndex < 0 || choiceIndex >= availableChoices.Count)
        {
            Debug.LogWarning($"[DialogueManager] 无效的选项索引: {choiceIndex}");
            return;
        }

        DialogueChoice selectedChoice = availableChoices[choiceIndex];

        Debug.Log($"[DialogueManager] 玩家选择了: {selectedChoice.choiceText}");

        // 执行选项的后果
        ExecuteConsequences(selectedChoice.consequences);

        // 跳转到下一个节点
        int nextIndex = selectedChoice.nextNodeIndex;

        if (nextIndex < 0 || nextIndex >= currentDialogue.NodeCount)
        {
            EndDialogue();
        }
        else
        {
            currentNodeIndex = nextIndex;
            ShowCurrentNode();
        }
    }

    /// <summary>
    /// 结束当前对话
    /// </summary>
    public void EndDialogue()
    {
        if (!IsDialogueActive) return;

        // 标记对话已完成
        if (currentDialogue != null)
        {
            completedDialogues.Add(currentDialogue.dialogueId);
            Debug.Log($"[DialogueManager] 对话结束: {currentDialogue.dialogueTitle}");
        }

        // 通知 NPC 对话结束
        if (currentNPC != null)
        {
            currentNPC.OnDialogueEnded();
        }

        IsDialogueActive = false;
        currentDialogue = null;
        currentNodeIndex = -1;
        currentNPC = null;

        // 触发对话结束事件
        OnDialogueEnded?.Invoke();
    }

    // ========== 显示节点 ==========

    /// <summary>
    /// 显示当前节点的内容
    /// </summary>
    private void ShowCurrentNode()
    {
        DialogueNode node = GetCurrentNode();
        if (node == null)
        {
            EndDialogue();
            return;
        }

        // 检查节点显示条件
        if (node.showCondition != null &&
            node.showCondition.conditionType != ConditionType.None &&
            !CheckCondition(node.showCondition))
        {
            // 条件不满足，跳到下一个节点
            Debug.Log("[DialogueManager] 节点条件不满足，跳过");
            AdvanceDialogue();
            return;
        }

        // 执行进入节点时的后果
        if (node.onEnterConsequences != null && node.onEnterConsequences.Count > 0)
        {
            ExecuteConsequences(node.onEnterConsequences);
        }

        // 触发节点变化事件（UI 监听此事件来更新显示）
        OnNodeChanged?.Invoke(node);

        // 如果有选项，发送选项事件
        if (node.HasChoices)
        {
            List<DialogueChoice> availableChoices = GetAvailableChoices(node);
            OnChoicesAvailable?.Invoke(availableChoices);
        }

        // 触发动画（如果有）
        if (!string.IsNullOrEmpty(node.animationTrigger) && currentNPC != null)
        {
            Animator npcAnimator = currentNPC.GetComponent<Animator>();
            if (npcAnimator != null)
            {
                npcAnimator.SetTrigger(node.animationTrigger);
            }
        }
    }

    /// <summary>
    /// 获取当前节点
    /// </summary>
    private DialogueNode GetCurrentNode()
    {
        if (currentDialogue == null) return null;
        return currentDialogue.GetNode(currentNodeIndex);
    }

    /// <summary>
    /// 获取当前节点中满足条件的选项列表
    /// </summary>
    private List<DialogueChoice> GetAvailableChoices(DialogueNode node)
    {
        List<DialogueChoice> available = new List<DialogueChoice>();

        foreach (var choice in node.choices)
        {
            // 如果选项没有条件，或条件满足，则可用
            if (choice.condition == null ||
                choice.condition.conditionType == ConditionType.None ||
                CheckCondition(choice.condition))
            {
                available.Add(choice);
            }
        }

        return available;
    }

    // ========== 条件检查 ==========

    /// <summary>
    /// 检查单个对话条件是否满足
    ///
    /// 前端类比：
    /// 类似于权限检查中间件或路由守卫
    /// </summary>
    /// <param name="condition">要检查的条件</param>
    /// <returns>条件是否满足</returns>
    public bool CheckCondition(DialogueCondition condition)
    {
        if (condition == null || condition.conditionType == ConditionType.None)
            return true;

        bool result = false;

        switch (condition.conditionType)
        {
            case ConditionType.HasItem:
                // 检查背包中是否有指定物品
                if (InventoryManager.Instance != null)
                {
                    // 通过物品名称或ID查找
                    // 这里简化处理，实际项目中应通过ID查找
                    foreach (var slot in InventoryManager.Instance.Slots)
                    {
                        if (!slot.IsEmpty &&
                            slot.itemData.itemId == condition.conditionParam &&
                            slot.quantity >= condition.requiredAmount)
                        {
                            result = true;
                            break;
                        }
                    }
                }
                break;

            case ConditionType.QuestStarted:
                // 检查任务是否已开始
                // 这里预留接口，实际需要对接任务系统
                result = CheckQuestState(condition.conditionParam, "started");
                break;

            case ConditionType.QuestCompleted:
                // 检查任务是否已完成
                result = CheckQuestState(condition.conditionParam, "completed");
                break;

            case ConditionType.PlayerLevel:
                // 检查玩家等级
                // 预留接口
                result = GetPlayerLevel() >= condition.requiredAmount;
                break;

            case ConditionType.GlobalFlag:
                // 检查全局标志位
                result = globalFlags.ContainsKey(condition.conditionParam) &&
                         globalFlags[condition.conditionParam];
                break;
        }

        // 如果设置了取反，则翻转结果
        if (condition.invertCondition)
            result = !result;

        return result;
    }

    // ========== 后果执行 ==========

    /// <summary>
    /// 执行一组对话后果
    /// </summary>
    /// <param name="consequences">后果列表</param>
    private void ExecuteConsequences(List<DialogueConsequence> consequences)
    {
        if (consequences == null) return;

        foreach (var consequence in consequences)
        {
            ExecuteConsequence(consequence);
        }
    }

    /// <summary>
    /// 执行单个对话后果
    ///
    /// 前端类比：
    /// 类似于 Redux 的副作用（redux-saga/redux-thunk）
    /// 或 Vue 的 actions
    /// </summary>
    /// <param name="consequence">要执行的后果</param>
    private void ExecuteConsequence(DialogueConsequence consequence)
    {
        if (consequence == null || consequence.consequenceType == ConsequenceType.None)
            return;

        switch (consequence.consequenceType)
        {
            case ConsequenceType.GiveItem:
                // 给予玩家物品
                if (consequence.itemData != null && InventoryManager.Instance != null)
                {
                    InventoryManager.Instance.AddItem(consequence.itemData, consequence.amount);
                    Debug.Log($"[Dialogue] 获得了 {consequence.amount} 个 {consequence.itemData.itemName}");
                }
                break;

            case ConsequenceType.RemoveItem:
                // 从玩家背包移除物品
                if (consequence.itemData != null && InventoryManager.Instance != null)
                {
                    InventoryManager.Instance.RemoveItem(consequence.itemData, consequence.amount);
                    Debug.Log($"[Dialogue] 失去了 {consequence.amount} 个 {consequence.itemData.itemName}");
                }
                break;

            case ConsequenceType.StartQuest:
                // 开始任务（预留接口）
                StartQuest(consequence.consequenceParam);
                break;

            case ConsequenceType.CompleteQuest:
                // 完成任务（预留接口）
                CompleteQuest(consequence.consequenceParam);
                break;

            case ConsequenceType.ChangeNPCState:
                // 改变 NPC 状态
                if (currentNPC != null)
                {
                    currentNPC.ChangeState(consequence.consequenceParam);
                }
                break;

            case ConsequenceType.SetGlobalFlag:
                // 设置全局标志位
                globalFlags[consequence.consequenceParam] = consequence.amount > 0;
                Debug.Log($"[Dialogue] 设置标志: {consequence.consequenceParam} = {consequence.amount > 0}");
                break;

            case ConsequenceType.GiveGold:
                // 给予金币（预留接口）
                Debug.Log($"[Dialogue] 获得了 {consequence.amount} 金币");
                break;

            case ConsequenceType.TriggerCutscene:
                // 触发过场动画（预留接口）
                Debug.Log($"[Dialogue] 触发过场动画: {consequence.consequenceParam}");
                break;
        }
    }

    // ========== 工具方法（预留接口） ==========

    /// <summary>检查任务状态 - 需要对接实际任务系统</summary>
    private bool CheckQuestState(string questId, string state)
    {
        // TODO: 对接任务系统
        Debug.Log($"[DialogueManager] 检查任务 {questId} 状态: {state}");
        return false;
    }

    /// <summary>获取玩家等级 - 需要对接实际角色系统</summary>
    private int GetPlayerLevel()
    {
        // TODO: 对接角色系统
        return 1;
    }

    /// <summary>开始任务 - 需要对接实际任务系统</summary>
    private void StartQuest(string questId)
    {
        Debug.Log($"[DialogueManager] 开始任务: {questId}");
    }

    /// <summary>完成任务 - 需要对接实际任务系统</summary>
    private void CompleteQuest(string questId)
    {
        Debug.Log($"[DialogueManager] 完成任务: {questId}");
    }

    // ========== 全局标志位操作 ==========

    /// <summary>设置全局标志位</summary>
    public void SetFlag(string flagName, bool value)
    {
        globalFlags[flagName] = value;
    }

    /// <summary>获取全局标志位</summary>
    public bool GetFlag(string flagName)
    {
        return globalFlags.ContainsKey(flagName) && globalFlags[flagName];
    }

    /// <summary>检查对话是否已完成</summary>
    public bool IsDialogueCompleted(string dialogueId)
    {
        return completedDialogues.Contains(dialogueId);
    }
}
```

---

## 13.4 对话 UI

```csharp
// DialogueUI.cs
// 对话 UI 控制器 - 管理对话界面的显示
// 实现打字机文字效果、选项按钮、头像显示等

using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 对话 UI 控制器
///
/// UI 层级结构：
/// Canvas
/// └─ DialoguePanel
///    ├─ PortraitImage (NPC 头像)
///    ├─ SpeakerNameText (说话者名称)
///    ├─ DialogueText (对话内容文本)
///    ├─ ContinueIndicator (继续提示图标，如 ▼)
///    └─ ChoiceContainer (选项按钮容器)
///       ├─ ChoiceButton_0
///       ├─ ChoiceButton_1
///       └─ ...
///
/// 前端类比：
/// 类似一个 Chat/Messenger UI 组件，
/// 有头像、名称、消息气泡、回复选项等
/// </summary>
public class DialogueUI : MonoBehaviour
{
    [Header("UI 面板")]
    [Tooltip("对话面板的根 GameObject")]
    [SerializeField] private GameObject dialoguePanel;

    [Header("内容区域")]
    [Tooltip("说话者名称文本")]
    [SerializeField] private Text speakerNameText;

    [Tooltip("对话内容文本")]
    [SerializeField] private Text dialogueText;

    [Tooltip("NPC 头像 Image")]
    [SerializeField] private Image portraitImage;

    [Tooltip("继续提示指示器（如闪烁的箭头）")]
    [SerializeField] private GameObject continueIndicator;

    [Header("选项区域")]
    [Tooltip("选项按钮的容器")]
    [SerializeField] private Transform choiceContainer;

    [Tooltip("选项按钮预制体")]
    [SerializeField] private GameObject choiceButtonPrefab;

    [Header("打字机效果设置")]
    [Tooltip("默认打字速度（秒/字符）")]
    [SerializeField] private float defaultTypeSpeed = 0.04f;

    [Tooltip("打字音效（每个字符播放一次）")]
    [SerializeField] private AudioClip typeSound;

    [Tooltip("音效播放源")]
    [SerializeField] private AudioSource audioSource;

    // ========== 内部状态 ==========

    /// <summary>是否正在播放打字机效果</summary>
    public bool IsTyping { get; private set; } = false;

    /// <summary>打字机协程引用</summary>
    private Coroutine typingCoroutine;

    /// <summary>当前完整文本（用于跳过打字效果时直接显示）</summary>
    private string fullText;

    /// <summary>当前创建的选项按钮列表</summary>
    private List<GameObject> choiceButtons = new List<GameObject>();

    // ========== 生命周期 ==========

    private void Start()
    {
        // 订阅 DialogueManager 的事件
        if (DialogueManager.Instance != null)
        {
            DialogueManager.Instance.OnDialogueStarted += OnDialogueStarted;
            DialogueManager.Instance.OnNodeChanged += OnNodeChanged;
            DialogueManager.Instance.OnDialogueEnded += OnDialogueEnded;
            DialogueManager.Instance.OnChoicesAvailable += OnChoicesAvailable;
        }

        // 初始隐藏
        dialoguePanel.SetActive(false);
    }

    private void OnDestroy()
    {
        // 取消订阅
        if (DialogueManager.Instance != null)
        {
            DialogueManager.Instance.OnDialogueStarted -= OnDialogueStarted;
            DialogueManager.Instance.OnNodeChanged -= OnNodeChanged;
            DialogueManager.Instance.OnDialogueEnded -= OnDialogueEnded;
            DialogueManager.Instance.OnChoicesAvailable -= OnChoicesAvailable;
        }
    }

    // ========== 事件处理 ==========

    /// <summary>
    /// 对话开始时调用
    /// </summary>
    private void OnDialogueStarted(DialogueData dialogue)
    {
        dialoguePanel.SetActive(true);
        ClearChoices();

        Debug.Log("[DialogueUI] 对话面板已打开");
    }

    /// <summary>
    /// 节点变化时调用 - 更新显示内容
    /// </summary>
    private void OnNodeChanged(DialogueNode node)
    {
        // 更新说话者名称
        if (speakerNameText != null)
        {
            speakerNameText.text = node.speakerName;
        }

        // 更新头像
        if (portraitImage != null)
        {
            if (node.speakerPortrait != null)
            {
                portraitImage.sprite = node.speakerPortrait;
                portraitImage.gameObject.SetActive(true);
            }
            else
            {
                portraitImage.gameObject.SetActive(false);
            }
        }

        // 清除之前的选项
        ClearChoices();

        // 隐藏继续指示器（打字完成后再显示）
        if (continueIndicator != null)
            continueIndicator.SetActive(false);

        // 开始打字机效果
        float speed = node.typeSpeed > 0 ? node.typeSpeed : defaultTypeSpeed;
        StartTypewriterEffect(node.dialogueText, speed);
    }

    /// <summary>
    /// 对话结束时调用
    /// </summary>
    private void OnDialogueEnded()
    {
        // 停止打字效果
        StopTyping();
        ClearChoices();

        dialoguePanel.SetActive(false);

        Debug.Log("[DialogueUI] 对话面板已关闭");
    }

    /// <summary>
    /// 有选项可用时调用
    /// </summary>
    private void OnChoicesAvailable(List<DialogueChoice> choices)
    {
        // 等打字效果完成后再显示选项
        StartCoroutine(ShowChoicesAfterTyping(choices));
    }

    // ========== 打字机效果 ==========

    /// <summary>
    /// 开始打字机效果
    ///
    /// 逐字显示文本，营造 NPC 正在说话的感觉。
    /// 这在 RPG 游戏中是非常经典的效果。
    ///
    /// 实现原理：
    /// 使用协程（Coroutine）逐帧增加显示的字符数。
    /// 协程类似于 JavaScript 的 async/await，可以在多帧间暂停和恢复。
    /// </summary>
    /// <param name="text">要显示的完整文本</param>
    /// <param name="speed">每个字符的间隔（秒）</param>
    private void StartTypewriterEffect(string text, float speed)
    {
        // 停止之前的打字效果
        StopTyping();

        fullText = text;
        typingCoroutine = StartCoroutine(TypeText(text, speed));
    }

    /// <summary>
    /// 打字机效果协程
    ///
    /// 协程（Coroutine）对比 JavaScript：
    /// - yield return 类似于 await
    /// - WaitForSeconds 类似于 new Promise(resolve => setTimeout(resolve, ms))
    /// - StartCoroutine 类似于调用 async 函数
    /// </summary>
    private IEnumerator TypeText(string text, float speed)
    {
        IsTyping = true;
        dialogueText.text = "";

        // 逐字符添加
        for (int i = 0; i < text.Length; i++)
        {
            // 处理富文本标签（如 <color=red>）
            // 跳过标签内的字符，直接添加整个标签
            if (text[i] == '<')
            {
                int closeIndex = text.IndexOf('>', i);
                if (closeIndex > i)
                {
                    dialogueText.text += text.Substring(i, closeIndex - i + 1);
                    i = closeIndex;
                    continue;
                }
            }

            dialogueText.text += text[i];

            // 播放打字音效
            if (typeSound != null && audioSource != null && text[i] != ' ')
            {
                audioSource.PlayOneShot(typeSound);
            }

            // 等待指定时间
            // 标点符号处稍作停顿（更自然）
            float waitTime = speed;
            if (text[i] == '。' || text[i] == '！' || text[i] == '？' ||
                text[i] == '.' || text[i] == '!' || text[i] == '?')
            {
                waitTime = speed * 5f; // 句末停顿更长
            }
            else if (text[i] == '，' || text[i] == '、' || text[i] == ',' )
            {
                waitTime = speed * 2.5f; // 逗号停顿稍短
            }

            yield return new WaitForSeconds(waitTime);
        }

        IsTyping = false;

        // 显示继续指示器（如果当前节点没有选项）
        if (continueIndicator != null)
        {
            DialogueNode currentNode = DialogueManager.Instance != null
                ? null  // 通过事件获取更合适
                : null;
            continueIndicator.SetActive(true);
        }
    }

    /// <summary>
    /// 立即完成打字效果（玩家点击跳过时调用）
    /// </summary>
    public void CompleteTyping()
    {
        if (!IsTyping) return;

        StopTyping();
        dialogueText.text = fullText;

        // 显示继续指示器
        if (continueIndicator != null)
            continueIndicator.SetActive(true);
    }

    /// <summary>
    /// 停止打字效果
    /// </summary>
    private void StopTyping()
    {
        if (typingCoroutine != null)
        {
            StopCoroutine(typingCoroutine);
            typingCoroutine = null;
        }
        IsTyping = false;
    }

    // ========== 选项按钮 ==========

    /// <summary>
    /// 等待打字完成后显示选项按钮
    /// </summary>
    private IEnumerator ShowChoicesAfterTyping(List<DialogueChoice> choices)
    {
        // 等待打字效果完成
        while (IsTyping)
        {
            yield return null;
        }

        ShowChoices(choices);
    }

    /// <summary>
    /// 显示选项按钮
    ///
    /// 前端类比：
    /// 类似于 React 中动态渲染按钮列表
    /// choices.map((choice, index) => (
    ///     <button key={index} onClick={() => selectChoice(index)}>
    ///         {choice.text}
    ///     </button>
    /// ))
    /// </summary>
    /// <param name="choices">可用选项列表</param>
    private void ShowChoices(List<DialogueChoice> choices)
    {
        ClearChoices();

        // 隐藏继续指示器（有选项时不显示"继续"）
        if (continueIndicator != null)
            continueIndicator.SetActive(false);

        for (int i = 0; i < choices.Count; i++)
        {
            // 实例化选项按钮
            GameObject buttonObj = Instantiate(choiceButtonPrefab, choiceContainer);
            choiceButtons.Add(buttonObj);

            // 设置按钮文本
            Text buttonText = buttonObj.GetComponentInChildren<Text>();
            if (buttonText != null)
            {
                buttonText.text = $"{i + 1}. {choices[i].choiceText}";
            }

            // 绑定点击事件
            // 注意：这里需要捕获 index 的值（闭包陷阱，和 JS 中的一样）
            int choiceIndex = i;
            Button button = buttonObj.GetComponent<Button>();
            if (button != null)
            {
                button.onClick.AddListener(() =>
                {
                    OnChoiceClicked(choiceIndex);
                });
            }
        }
    }

    /// <summary>
    /// 选项按钮被点击
    /// </summary>
    /// <param name="choiceIndex">选项索引</param>
    private void OnChoiceClicked(int choiceIndex)
    {
        Debug.Log($"[DialogueUI] 点击了选项 {choiceIndex}");

        // 通知 DialogueManager
        if (DialogueManager.Instance != null)
        {
            DialogueManager.Instance.SelectChoice(choiceIndex);
        }
    }

    /// <summary>
    /// 清除所有选项按钮
    /// </summary>
    private void ClearChoices()
    {
        foreach (var button in choiceButtons)
        {
            if (button != null)
                Destroy(button);
        }
        choiceButtons.Clear();
    }
}
```

[截图：对话 UI 面板的布局，展示头像区域、名称、对话文本和选项按钮]

[截图：打字机效果的运行时截图，文字正在逐字显示]

---

## 13.5 NPC 交互组件

```csharp
// NPCInteractable.cs
// NPC 可交互组件 - 挂载在 NPC 对象上
// 处理玩家与 NPC 的交互检测和对话触发

using UnityEngine;

/// <summary>
/// NPC 状态枚举
/// </summary>
public enum NPCState
{
    /// <summary>空闲 - 正常状态</summary>
    Idle,

    /// <summary>对话中</summary>
    Talking,

    /// <summary>忙碌 - 不可交互</summary>
    Busy,

    /// <summary>友好 - 对话后好感提升</summary>
    Friendly,

    /// <summary>敌对 - 不再可交互或变为敌人</summary>
    Hostile
}

/// <summary>
/// NPC 可交互组件
///
/// 挂载到 NPC 游戏对象上，处理：
/// 1. 玩家接近检测（触发器范围检测）
/// 2. 交互输入检测（按键/点击）
/// 3. 浮动交互图标显示
/// 4. 启动对话
/// 5. NPC 面朝玩家
/// 6. NPC 状态管理
///
/// 设置步骤：
/// 1. 在 NPC 上添加 SphereCollider（设为 Trigger，调整半径为交互范围）
/// 2. 添加此脚本
/// 3. 在 Inspector 中设置对话数据
/// 4. 配置交互指示器
/// </summary>
[RequireComponent(typeof(Collider))]
public class NPCInteractable : MonoBehaviour
{
    [Header("NPC 信息")]
    [Tooltip("NPC 名称")]
    public string npcName = "NPC";

    [Tooltip("NPC 当前状态")]
    [SerializeField] private NPCState currentState = NPCState.Idle;

    [Header("对话设置")]
    [Tooltip("默认对话数据")]
    [SerializeField] private DialogueData defaultDialogue;

    [Tooltip("不同状态下的对话（可选）")]
    [SerializeField] private DialogueByState[] stateDialogues;

    [Header("交互设置")]
    [Tooltip("交互按键")]
    [SerializeField] private KeyCode interactKey = KeyCode.E;

    [Tooltip("交互距离（SphereCollider 的半径）")]
    [SerializeField] private float interactRange = 3f;

    [Tooltip("对话时是否面朝玩家")]
    [SerializeField] private bool facePlayerOnTalk = true;

    [Tooltip("面朝玩家的旋转速度")]
    [SerializeField] private float faceRotationSpeed = 5f;

    [Header("交互指示器")]
    [Tooltip("浮动交互图标（如感叹号、对话气泡）")]
    [SerializeField] private GameObject interactionIndicator;

    [Tooltip("指示器浮动幅度")]
    [SerializeField] private float indicatorBobAmount = 0.15f;

    [Tooltip("指示器浮动速度")]
    [SerializeField] private float indicatorBobSpeed = 2f;

    // ========== 内部状态 ==========

    /// <summary>玩家是否在交互范围内</summary>
    private bool playerInRange = false;

    /// <summary>是否正在与此 NPC 对话</summary>
    private bool isTalking = false;

    /// <summary>玩家 Transform 引用</summary>
    private Transform playerTransform;

    /// <summary>指示器初始本地 Y 坐标</summary>
    private float indicatorBaseY;

    // ========== 生命周期 ==========

    private void Start()
    {
        // 设置交互范围的触发器
        SphereCollider trigger = GetComponent<SphereCollider>();
        if (trigger != null)
        {
            trigger.isTrigger = true;
            trigger.radius = interactRange;
        }

        // 初始隐藏交互指示器
        if (interactionIndicator != null)
        {
            interactionIndicator.SetActive(false);
            indicatorBaseY = interactionIndicator.transform.localPosition.y;
        }
    }

    private void Update()
    {
        // 交互输入检测
        if (playerInRange && !isTalking && Input.GetKeyDown(interactKey))
        {
            if (currentState != NPCState.Busy && currentState != NPCState.Hostile)
            {
                StartInteraction();
            }
        }

        // 对话时面朝玩家
        if (isTalking && facePlayerOnTalk && playerTransform != null)
        {
            FacePlayer();
        }

        // 指示器浮动动画
        if (interactionIndicator != null && interactionIndicator.activeSelf)
        {
            AnimateIndicator();
        }
    }

    // ========== 触发器检测 ==========

    private void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag("Player")) return;

        playerInRange = true;
        playerTransform = other.transform;

        // 显示交互指示器
        if (interactionIndicator != null && !isTalking)
        {
            interactionIndicator.SetActive(true);
        }

        Debug.Log($"[NPC] 玩家进入 {npcName} 的交互范围");
    }

    private void OnTriggerExit(Collider other)
    {
        if (!other.CompareTag("Player")) return;

        playerInRange = false;

        // 隐藏交互指示器
        if (interactionIndicator != null)
        {
            interactionIndicator.SetActive(false);
        }

        // 如果正在对话，结束对话
        if (isTalking && DialogueManager.Instance != null)
        {
            DialogueManager.Instance.EndDialogue();
        }

        Debug.Log($"[NPC] 玩家离开 {npcName} 的交互范围");
    }

    // ========== 交互逻辑 ==========

    /// <summary>
    /// 开始与 NPC 交互
    /// </summary>
    private void StartInteraction()
    {
        if (DialogueManager.Instance == null)
        {
            Debug.LogWarning("[NPC] DialogueManager 未找到！");
            return;
        }

        if (DialogueManager.Instance.IsDialogueActive)
        {
            Debug.Log("[NPC] 已有对话在进行中");
            return;
        }

        // 获取当前状态对应的对话
        DialogueData dialogue = GetCurrentDialogue();

        if (dialogue == null)
        {
            Debug.LogWarning($"[NPC] {npcName} 没有可用的对话数据");
            return;
        }

        isTalking = true;
        currentState = NPCState.Talking;

        // 隐藏交互指示器
        if (interactionIndicator != null)
            interactionIndicator.SetActive(false);

        // 开始对话
        DialogueManager.Instance.StartDialogue(dialogue, this);

        Debug.Log($"[NPC] 开始与 {npcName} 对话");
    }

    /// <summary>
    /// 对话结束时由 DialogueManager 调用
    /// </summary>
    public void OnDialogueEnded()
    {
        isTalking = false;

        // 恢复状态（如果之前是 Talking）
        if (currentState == NPCState.Talking)
        {
            currentState = NPCState.Idle;
        }

        // 如果玩家还在范围内，重新显示指示器
        if (playerInRange && interactionIndicator != null)
        {
            interactionIndicator.SetActive(true);
        }

        Debug.Log($"[NPC] 与 {npcName} 的对话结束");
    }

    /// <summary>
    /// 改变 NPC 状态（由对话后果调用）
    /// </summary>
    /// <param name="newState">新状态字符串</param>
    public void ChangeState(string newState)
    {
        if (System.Enum.TryParse<NPCState>(newState, true, out NPCState state))
        {
            currentState = state;
            Debug.Log($"[NPC] {npcName} 状态变更为: {state}");
        }
        else
        {
            Debug.LogWarning($"[NPC] 无效的状态: {newState}");
        }
    }

    /// <summary>
    /// 获取当前状态对应的对话数据
    /// </summary>
    private DialogueData GetCurrentDialogue()
    {
        // 查找当前状态对应的特殊对话
        if (stateDialogues != null)
        {
            foreach (var sd in stateDialogues)
            {
                if (sd.state == currentState && sd.dialogue != null)
                {
                    return sd.dialogue;
                }
            }
        }

        // 没有特殊对话，使用默认对话
        return defaultDialogue;
    }

    // ========== 视觉效果 ==========

    /// <summary>
    /// 使 NPC 面朝玩家
    /// </summary>
    private void FacePlayer()
    {
        if (playerTransform == null) return;

        Vector3 direction = playerTransform.position - transform.position;
        direction.y = 0; // 只在水平面上旋转

        if (direction.sqrMagnitude > 0.001f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(direction);
            transform.rotation = Quaternion.Slerp(
                transform.rotation,
                targetRotation,
                faceRotationSpeed * Time.deltaTime
            );
        }
    }

    /// <summary>
    /// 交互指示器浮动动画
    /// </summary>
    private void AnimateIndicator()
    {
        Vector3 pos = interactionIndicator.transform.localPosition;
        pos.y = indicatorBaseY + Mathf.Sin(Time.time * indicatorBobSpeed) * indicatorBobAmount;
        interactionIndicator.transform.localPosition = pos;
    }

    // ========== Gizmos（编辑器中的可视化） ==========

    /// <summary>
    /// 在 Scene 视图中绘制交互范围
    /// </summary>
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, interactRange);
    }
}

/// <summary>
/// 状态-对话映射
/// 用于为不同 NPC 状态配置不同的对话
/// </summary>
[System.Serializable]
public class DialogueByState
{
    [Tooltip("NPC 状态")]
    public NPCState state;

    [Tooltip("此状态下的对话数据")]
    public DialogueData dialogue;
}
```

[截图：NPC 游戏对象在 Inspector 中的配置，展示 NPCInteractable 组件的所有字段]

[截图：Scene 视图中 NPC 的交互范围可视化（黄色线框球体）]

---

## 13.6 NPC 简单日程系统

```csharp
// NPCSchedule.cs
// NPC 日程系统 - 让 NPC 在不同时间执行不同行为
// 这是一个简化版本，用于增添世界的真实感

using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 日程活动类型
/// </summary>
public enum ScheduleActivityType
{
    /// <summary>站在某个位置</summary>
    StandAt,

    /// <summary>在两个点之间走动</summary>
    WalkBetween,

    /// <summary>播放特定动画</summary>
    PlayAnimation,

    /// <summary>坐下</summary>
    SitAt
}

/// <summary>
/// 日程条目
/// </summary>
[System.Serializable]
public class ScheduleEntry
{
    [Tooltip("活动开始时间（游戏内小时，0-24）")]
    [Range(0, 24)]
    public float startHour;

    [Tooltip("活动类型")]
    public ScheduleActivityType activityType;

    [Tooltip("目标位置")]
    public Transform targetPosition;

    [Tooltip("第二个目标位置（用于 WalkBetween）")]
    public Transform secondPosition;

    [Tooltip("动画参数名")]
    public string animationParam;

    [Tooltip("移动速度")]
    public float moveSpeed = 2f;
}

/// <summary>
/// NPC 日程组件
///
/// 根据游戏内时间，让 NPC 在不同位置执行不同活动。
/// 例如：白天在商店，晚上回家。
///
/// 注意：此组件需要配合一个 GameTimeManager 使用，
/// 这里提供了简化版本。
/// </summary>
public class NPCSchedule : MonoBehaviour
{
    [Header("日程表")]
    [Tooltip("日程条目列表（按时间排序）")]
    [SerializeField] private List<ScheduleEntry> schedule = new List<ScheduleEntry>();

    [Header("移动设置")]
    [Tooltip("到达目标的最小距离")]
    [SerializeField] private float arrivalDistance = 0.5f;

    // ========== 内部状态 ==========

    /// <summary>当前执行的日程条目</summary>
    private ScheduleEntry currentEntry;

    /// <summary>NPC 的 Animator</summary>
    private Animator animator;

    /// <summary>NPC 可交互组件</summary>
    private NPCInteractable interactable;

    /// <summary>模拟的游戏时间（0-24小时）</summary>
    private float simulatedTime = 8f;

    private void Start()
    {
        animator = GetComponent<Animator>();
        interactable = GetComponent<NPCInteractable>();
    }

    private void Update()
    {
        // 简化的时间推进（实际项目中应使用全局时间管理器）
        simulatedTime += Time.deltaTime * 0.01f; // 约100秒 = 游戏内1小时
        if (simulatedTime >= 24f)
            simulatedTime -= 24f;

        // 查找当前时间段的日程
        UpdateSchedule();

        // 执行当前日程活动
        ExecuteCurrentActivity();
    }

    /// <summary>
    /// 根据当前时间更新日程
    /// </summary>
    private void UpdateSchedule()
    {
        if (schedule.Count == 0) return;

        ScheduleEntry bestEntry = schedule[0];

        // 找到当前时间最近的（且已开始的）日程条目
        for (int i = schedule.Count - 1; i >= 0; i--)
        {
            if (simulatedTime >= schedule[i].startHour)
            {
                bestEntry = schedule[i];
                break;
            }
        }

        if (bestEntry != currentEntry)
        {
            currentEntry = bestEntry;
            Debug.Log($"[NPCSchedule] {gameObject.name} 切换到日程活动: " +
                      $"{currentEntry.activityType} (时间: {simulatedTime:F1})");
        }
    }

    /// <summary>
    /// 执行当前日程活动
    /// </summary>
    private void ExecuteCurrentActivity()
    {
        if (currentEntry == null) return;

        switch (currentEntry.activityType)
        {
            case ScheduleActivityType.StandAt:
                MoveToPosition(currentEntry.targetPosition);
                break;

            case ScheduleActivityType.WalkBetween:
                WalkBetweenPoints();
                break;

            case ScheduleActivityType.SitAt:
                MoveToPosition(currentEntry.targetPosition);
                if (IsAtPosition(currentEntry.targetPosition) && animator != null)
                {
                    animator.SetBool("isSitting", true);
                }
                break;
        }
    }

    /// <summary>
    /// 移动到目标位置
    /// </summary>
    private void MoveToPosition(Transform target)
    {
        if (target == null) return;

        float distance = Vector3.Distance(transform.position, target.position);

        if (distance > arrivalDistance)
        {
            Vector3 direction = (target.position - transform.position).normalized;
            transform.position += direction * currentEntry.moveSpeed * Time.deltaTime;

            // 面朝移动方向
            if (direction.sqrMagnitude > 0.001f)
            {
                direction.y = 0;
                transform.rotation = Quaternion.LookRotation(direction);
            }

            // 播放走路动画
            if (animator != null)
            {
                animator.SetBool("isWalking", true);
            }
        }
        else
        {
            // 到达目标
            if (animator != null)
            {
                animator.SetBool("isWalking", false);
            }
        }
    }

    /// <summary>
    /// 在两个点之间来回走动
    /// </summary>
    private void WalkBetweenPoints()
    {
        if (currentEntry.targetPosition == null || currentEntry.secondPosition == null)
            return;

        // 简化的来回走动：用 PingPong 计算当前目标
        float t = Mathf.PingPong(Time.time * 0.2f, 1f);
        Vector3 target = Vector3.Lerp(
            currentEntry.targetPosition.position,
            currentEntry.secondPosition.position,
            t
        );

        float distance = Vector3.Distance(transform.position, target);
        if (distance > arrivalDistance)
        {
            Vector3 direction = (target - transform.position).normalized;
            transform.position += direction * currentEntry.moveSpeed * Time.deltaTime;

            direction.y = 0;
            if (direction.sqrMagnitude > 0.001f)
            {
                transform.rotation = Quaternion.LookRotation(direction);
            }
        }
    }

    /// <summary>
    /// 检查是否已到达目标位置
    /// </summary>
    private bool IsAtPosition(Transform target)
    {
        if (target == null) return false;
        return Vector3.Distance(transform.position, target.position) <= arrivalDistance;
    }
}
```

[截图：NPC 日程系统的 Inspector 配置，展示多个日程条目]

---

## 13.7 设计对话内容的最佳实践

### 对话树的设计模式

在实际项目中，对话通常分为几种模式：

#### 1. 线性对话（最简单）

```
Node 0: "你好，旅行者。" → next: 1
Node 1: "欢迎来到新月村。" → next: 2
Node 2: "祝你好运。" → next: -1 (结束)
```

#### 2. 分支对话

```
Node 0: "你想了解什么？"
  ├─ 选项A: "这个村子" → next: 1
  ├─ 选项B: "有什么任务" → next: 3
  └─ 选项C: "再见" → next: -1

Node 1: "新月村建于百年前..." → next: 2
Node 2: "...还有什么想知道的？" → next: 0 (循环回去)

Node 3: "北边的森林最近出现了怪物..."
  ├─ 选项A: "我来帮忙" → next: 4 (附带后果: StartQuest)
  └─ 选项B: "我不感兴趣" → next: -1

Node 4: "太好了！拿着这个剑吧。" → (附带后果: GiveItem) → next: -1
```

#### 3. 条件对话

```
Node 0: (条件: 有任务物品"狼牙")
        "你拿到狼牙了？太好了！" → next: 1

Node 0-alt: (条件: 没有狼牙)
        "你还没找到狼牙吗？" → next: -1

Node 1: "这是你的奖赏。" → (后果: RemoveItem + GiveGold) → next: -1
```

### 对话编写技巧

1. **每个节点只说一件事** - 避免在一个节点中放太多文字
2. **使用富文本** - `<color=red>重要内容</color>` 高亮关键词
3. **保持选项简短** - 每个选项不超过 15 个字
4. **提供退出选项** - 总是给玩家"再见"或"以后再说"的选择
5. **用条件控制剧情进度** - 避免玩家看到重复或矛盾的对话

---

## 13.8 完整设置步骤

1. **创建 DialogueManager**
   - 新建空 GameObject → 命名 `DialogueManager`
   - 添加 `DialogueManager` 脚本

2. **创建对话 UI**
   - Canvas → DialoguePanel（底部面板）
   - 添加 PortraitImage、SpeakerNameText、DialogueText
   - 添加 ContinueIndicator（闪烁的 ▼ 图标）
   - 创建 ChoiceContainer + ChoiceButton 预制体
   - 添加 `DialogueUI` 脚本并连接所有引用

3. **创建 NPC**
   - 导入/创建 NPC 模型
   - 添加 SphereCollider（Trigger, radius = 3）
   - 添加 `NPCInteractable` 脚本
   - 创建交互指示器（小图标在头顶浮动）

4. **创建对话数据**
   - 右键 → Create → Dialogue → Dialogue Data
   - 在 Inspector 中编辑节点列表
   - 将对话数据拖到 NPC 的 `defaultDialogue` 字段

5. **设置玩家**
   - 确保玩家有 "Player" Tag
   - 确保玩家有 Collider（非 Trigger）

[截图：完整的对话系统运行截图，展示 NPC 头顶的交互图标、对话面板和选项按钮]

---

## 练习题

### 练习一：实现对话历史记录
添加一个对话记录面板，显示当前对话中已经说过的所有内容，允许玩家滚动查看。

**提示：**
- 在 `DialogueUI` 中维护一个 `List&lt;string&gt;` 存储历史记录
- 每当 `OnNodeChanged` 触发时，将文本添加到历史
- 使用 `ScrollRect` + `ContentSizeFitter` 实现可滚动的文本区域
- 按下特定键（如 Tab）时切换显示历史面板

### 练习二：实现对话跳过功能
在对话面板中添加一个"跳过"按钮，点击后直接跳到对话的最后一个节点或结束对话。

**提示：**
- 在 `DialogueManager` 中添加 `SkipDialogue()` 方法
- 需要考虑跳过时是否执行中间节点的后果
- 可以只执行 `onEnterConsequences` 但跳过选项

### 练习三：实现 NPC 商店对话
创建一个商人 NPC，对话中提供"查看商品"选项，选择后打开一个简单的商店界面。

**提示：**
- 创建一个新的 `ShopUI` 脚本
- 在对话后果中添加 `ConsequenceType.OpenShop`
- 商店界面显示 NPC 出售的物品列表
- 点击购买时检查金币是否足够，然后调用 `InventoryManager.AddItem()`

### 练习四：实现对话本地化支持
修改对话系统以支持多语言（如中文和英文切换）。

**提示：**
- 不直接在 `DialogueNode.dialogueText` 中写文字，而是使用 key
- 创建一个 `LocalizationManager` 单例
- 使用 JSON 文件存储各语言的翻译 `{ "greeting_01": { "zh": "你好", "en": "Hello" } }`
- `DialogueUI` 在显示文本时通过 key 查找当前语言的翻译

---

## 下一章预告

在下一章 **第十四章：战斗系统** 中，我们将学习：

- 设计基于组件的战斗架构
- 实现生命系统（IDamageable 接口、HealthComponent）
- 构建近战攻击系统（碰撞检测、连击组合）
- 实现远程攻击（投射物生成和轨迹）
- 伤害计算公式（基础伤害、防御、暴击）
- 打击感优化（视觉特效、屏幕震动、顿帧）
- 敌人 AI 状态机（巡逻、追击、攻击、逃跑）
- 锁定目标系统
- 闪避/翻滚机制

战斗系统是动作游戏的核心，让我们的开放世界充满挑战和乐趣！
