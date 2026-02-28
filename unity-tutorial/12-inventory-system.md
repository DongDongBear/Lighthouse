# 第十二章：背包与物品系统

## 本章目标

通过本章学习，你将掌握：

1. 使用 ScriptableObject 设计灵活的物品数据架构
2. 实现完整的背包管理器（增、删、改、查、交换）
3. 构建网格布局的背包 UI 系统
4. 实现物品的拖拽操作（Drag & Drop）
5. 实现物品悬停提示（Tooltip）
6. 构建装备系统（武器/防具槽位）
7. 实现世界中物品的拾取与丢弃
8. 了解基础合成系统
9. 理解 Unity 数据模式与前端状态管理（Redux/Vuex）的对比

## 预计学习时间

**4-5 小时**

---

## 12.1 物品系统架构总览

### 从前端思维理解物品系统

如果你有 Redux 或 Vuex 的经验，物品系统的架构会让你感到亲切：

| 前端概念 | Unity 物品系统对应 |
|---------|-------------------|
| Store / State | InventoryManager（单例） |
| Action / Mutation | AddItem / RemoveItem / SwapItems 方法 |
| Reducer | 背包操作的业务逻辑 |
| Selector | GetItem / GetItemCount 查询方法 |
| Component (UI) | InventoryUI / ItemSlotUI |
| Props | ItemData（ScriptableObject） |
| Event Bus | C# event / UnityEvent |

在 Redux 中，你的 store 是一个不可变的状态树；在 Unity 中，`InventoryManager` 就是你的 "store"，`ScriptableObject` 就是你的 "schema"。

### 系统架构图

```
┌─────────────────────────────────────────────────┐
│                   ItemData (SO)                  │
│  定义物品的静态数据（名称、图标、属性等）           │
└────────────────────┬────────────────────────────┘
                     │ 引用
┌────────────────────▼────────────────────────────┐
│              InventorySlot                       │
│  持有 ItemData 引用 + 数量（运行时状态）           │
└────────────────────┬────────────────────────────┘
                     │ 管理
┌────────────────────▼────────────────────────────┐
│            InventoryManager                      │
│  管理所有 InventorySlot（增删改查交换）            │
│  发送事件通知 UI 更新                             │
└────────────────────┬────────────────────────────┘
                     │ 监听事件
┌────────────────────▼────────────────────────────┐
│         InventoryUI / ItemSlotUI                 │
│  渲染背包界面、处理拖拽、显示 Tooltip             │
└─────────────────────────────────────────────────┘
```

---

## 12.2 定义物品类型枚举

首先，我们需要定义游戏中所有可能的物品类型。创建一个新的 C# 脚本文件：

[截图：在 Project 窗口中创建 Scripts/Inventory 文件夹]

```csharp
// ItemType.cs
// 物品类型枚举 - 定义游戏中所有可能的物品分类
// 类似于 TypeScript 中的 enum 或 union type

/// <summary>
/// 物品类型枚举
/// 每种类型决定了物品的行为方式和可用操作
/// </summary>
public enum ItemType
{
    /// <summary>武器 - 可装备到武器槽位，影响攻击力</summary>
    Weapon,

    /// <summary>防具 - 可装备到防具槽位，影响防御力</summary>
    Armor,

    /// <summary>消耗品 - 使用后消失，如药水、食物</summary>
    Consumable,

    /// <summary>材料 - 用于合成其他物品的原材料</summary>
    Material,

    /// <summary>任务物品 - 与任务系统关联，通常不可丢弃</summary>
    Quest
}

/// <summary>
/// 装备槽位类型 - 定义装备可以放置的位置
/// </summary>
public enum EquipmentSlotType
{
    /// <summary>主手武器槽</summary>
    MainHand,

    /// <summary>副手/盾牌槽</summary>
    OffHand,

    /// <summary>头部防具槽</summary>
    Head,

    /// <summary>身体防具槽</summary>
    Body,

    /// <summary>腿部防具槽</summary>
    Legs,

    /// <summary>脚部防具槽</summary>
    Feet,

    /// <summary>饰品槽位1</summary>
    Accessory1,

    /// <summary>饰品槽位2</summary>
    Accessory2
}
```

---

## 12.3 使用 ScriptableObject 设计物品数据

### 什么是 ScriptableObject？

ScriptableObject 是 Unity 中用来存储数据的特殊类。你可以把它理解为前端开发中的 JSON 配置文件，但它是强类型的、可以在 Unity 编辑器中直接编辑、并且可以被多个对象共享引用。

**前端类比：**
- TypeScript 的 interface/type 定义 → C# 的 ScriptableObject 类
- JSON 数据文件 → ScriptableObject 资产文件（.asset）
- 数据库中的一条记录 → 一个 ScriptableObject 实例

### ItemData.cs 完整代码

```csharp
// ItemData.cs
// 物品数据定义 - 使用 ScriptableObject 作为数据容器
// 类似前端中的数据模型(Model)或 TypeScript 的 interface

using UnityEngine;

/// <summary>
/// 物品统计属性 - 定义物品提供的数值加成
/// 类似于 TypeScript 中的嵌套 interface
/// [System.Serializable] 使其可在 Inspector 中编辑
/// </summary>
[System.Serializable]
public class ItemStats
{
    [Tooltip("攻击力加成")]
    public int attack = 0;

    [Tooltip("防御力加成")]
    public int defense = 0;

    [Tooltip("生命值加成")]
    public int health = 0;

    [Tooltip("速度加成")]
    public float speed = 0f;

    [Tooltip("暴击率加成（0-1）")]
    [Range(0f, 1f)]
    public float criticalChance = 0f;

    [Tooltip("消耗品恢复的生命值")]
    public int healAmount = 0;
}

/// <summary>
/// 物品数据 ScriptableObject
///
/// 这是整个物品系统的数据基础。每个物品类型（如"铁剑"、"生命药水"）
/// 都对应一个 ItemData 资产文件。多个相同物品共享同一个 ItemData 引用，
/// 就像 Redux 中多个组件可以引用 store 中的同一条数据。
///
/// 使用方式：
/// 1. 在 Project 窗口右键 → Create → Inventory → Item Data
/// 2. 在 Inspector 中填写物品属性
/// 3. 在代码中通过引用使用
/// </summary>
[CreateAssetMenu(fileName = "NewItem", menuName = "Inventory/Item Data")]
public class ItemData : ScriptableObject
{
    [Header("基本信息")]
    [Tooltip("物品唯一标识符 - 用于保存/加载和网络同步")]
    public string itemId;

    [Tooltip("物品显示名称")]
    public string itemName;

    [Tooltip("物品描述文字，显示在 Tooltip 中")]
    [TextArea(3, 5)]
    public string description;

    [Tooltip("物品图标 - 用于 UI 显示")]
    public Sprite icon;

    [Header("物品分类")]
    [Tooltip("物品类型 - 决定物品的行为")]
    public ItemType itemType;

    [Tooltip("装备槽位类型 - 仅对武器和防具有效")]
    public EquipmentSlotType equipSlot;

    [Header("堆叠设置")]
    [Tooltip("是否可堆叠 - 如药水可以叠加，武器不能")]
    public bool stackable = false;

    [Tooltip("最大堆叠数量")]
    [Range(1, 999)]
    public int maxStack = 1;

    [Header("属性数据")]
    [Tooltip("物品提供的属性加成")]
    public ItemStats stats;

    [Header("世界交互")]
    [Tooltip("物品在世界中的 3D 模型预制体")]
    public GameObject worldPrefab;

    [Tooltip("物品稀有度（影响名称颜色等）")]
    public ItemRarity rarity = ItemRarity.Common;

    [Header("经济系统")]
    [Tooltip("购买价格")]
    public int buyPrice = 0;

    [Tooltip("出售价格")]
    public int sellPrice = 0;
}

/// <summary>
/// 物品稀有度枚举
/// </summary>
public enum ItemRarity
{
    Common,     // 普通 - 白色
    Uncommon,   // 优秀 - 绿色
    Rare,       // 稀有 - 蓝色
    Epic,       // 史诗 - 紫色
    Legendary   // 传说 - 橙色
}
```

[截图：在 Inspector 中编辑一个 ItemData ScriptableObject 资产，展示所有可配置字段]

### 创建物品资产

在 Unity 编辑器中：

1. 在 Project 窗口中右键点击
2. 选择 **Create → Inventory → Item Data**
3. 给资产命名，如 `IronSword`
4. 在 Inspector 中填写属性

[截图：右键菜单中出现 Inventory/Item Data 选项]

---

## 12.4 背包槽位类

每个背包格子需要一个数据结构来存储"哪个物品"和"多少个"：

```csharp
// InventorySlot.cs
// 背包槽位 - 存储物品引用和数量
// 类似于 Redux state 中的一个数组元素

using System;

/// <summary>
/// 背包槽位类
///
/// 这是背包系统的最小数据单元。每个槽位持有：
/// - 一个物品数据的引用（ItemData）
/// - 该物品的当前数量
///
/// 前端类比：
/// interface InventorySlot {
///     item: ItemData | null;
///     quantity: number;
/// }
/// </summary>
[Serializable]
public class InventorySlot
{
    /// <summary>当前槽位中的物品数据引用</summary>
    public ItemData itemData;

    /// <summary>当前物品数量</summary>
    public int quantity;

    /// <summary>
    /// 构造函数 - 创建一个空槽位
    /// </summary>
    public InventorySlot()
    {
        itemData = null;
        quantity = 0;
    }

    /// <summary>
    /// 构造函数 - 创建一个包含物品的槽位
    /// </summary>
    /// <param name="data">物品数据</param>
    /// <param name="amount">初始数量</param>
    public InventorySlot(ItemData data, int amount)
    {
        itemData = data;
        quantity = amount;
    }

    /// <summary>
    /// 检查槽位是否为空
    /// </summary>
    public bool IsEmpty => itemData == null || quantity <= 0;

    /// <summary>
    /// 检查是否可以添加更多此物品
    /// </summary>
    /// <param name="amount">要添加的数量</param>
    /// <returns>是否可以添加</returns>
    public bool CanAddMore(int amount = 1)
    {
        if (IsEmpty) return true;
        if (!itemData.stackable) return false;
        return quantity + amount <= itemData.maxStack;
    }

    /// <summary>
    /// 添加指定数量的物品到此槽位
    /// </summary>
    /// <param name="amount">要添加的数量</param>
    /// <returns>实际添加的数量（可能因堆叠上限而少于请求数量）</returns>
    public int AddQuantity(int amount)
    {
        if (!itemData.stackable)
        {
            // 不可堆叠物品，只能持有1个
            quantity = 1;
            return 1;
        }

        // 计算实际可添加的数量
        int spaceLeft = itemData.maxStack - quantity;
        int actualAdd = Math.Min(amount, spaceLeft);
        quantity += actualAdd;
        return actualAdd;
    }

    /// <summary>
    /// 从此槽位移除指定数量的物品
    /// </summary>
    /// <param name="amount">要移除的数量</param>
    /// <returns>实际移除的数量</returns>
    public int RemoveQuantity(int amount)
    {
        int actualRemove = Math.Min(amount, quantity);
        quantity -= actualRemove;

        // 如果数量归零，清除物品引用
        if (quantity <= 0)
        {
            itemData = null;
            quantity = 0;
        }

        return actualRemove;
    }

    /// <summary>
    /// 设置此槽位的物品
    /// </summary>
    /// <param name="data">物品数据</param>
    /// <param name="amount">数量</param>
    public void SetItem(ItemData data, int amount)
    {
        itemData = data;
        quantity = amount;
    }

    /// <summary>
    /// 清空此槽位
    /// </summary>
    public void Clear()
    {
        itemData = null;
        quantity = 0;
    }

    /// <summary>
    /// 复制此槽位的数据
    /// </summary>
    /// <returns>新的 InventorySlot 实例</returns>
    public InventorySlot Clone()
    {
        return new InventorySlot(itemData, quantity);
    }
}
```

---

## 12.5 背包管理器

这是整个系统的核心，相当于 Redux 中的 Store + Reducer：

```csharp
// InventoryManager.cs
// 背包管理器 - 整个物品系统的核心控制器
// 相当于 Redux 的 Store：集中管理状态，提供操作方法，发送变更通知

using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 背包管理器 - 单例模式
///
/// 设计思路（对比 Redux）：
/// - slots 数组 = Redux state
/// - AddItem/RemoveItem = dispatch(action)
/// - OnInventoryChanged 事件 = store.subscribe()
/// - GetItem/FindItem = selector
///
/// 与 Redux 不同的是，Unity 中我们直接修改状态（mutable），
/// 而不是像 Redux 那样返回新的 state 对象。这是因为 Unity
/// 的 C# 环境下，可变状态 + 事件通知模式更高效。
/// </summary>
public class InventoryManager : MonoBehaviour
{
    // ========== 单例模式 ==========

    /// <summary>全局唯一实例</summary>
    public static InventoryManager Instance { get; private set; }

    // ========== 配置 ==========

    [Header("背包设置")]
    [Tooltip("背包总格子数")]
    [SerializeField] private int inventorySize = 24;

    // ========== 数据 ==========

    /// <summary>
    /// 所有背包槽位 - 这就是我们的 "state"
    /// 类似 Redux: state = { slots: InventorySlot[] }
    /// </summary>
    private List<InventorySlot> slots = new List<InventorySlot>();

    // ========== 事件（类似 Redux subscribe） ==========

    /// <summary>背包内容发生变化时触发</summary>
    public event Action OnInventoryChanged;

    /// <summary>特定槽位变化时触发，参数为槽位索引</summary>
    public event Action<int> OnSlotChanged;

    /// <summary>物品被添加时触发</summary>
    public event Action<ItemData, int> OnItemAdded;

    /// <summary>物品被移除时触发</summary>
    public event Action<ItemData, int> OnItemRemoved;

    // ========== 属性 ==========

    /// <summary>获取背包大小</summary>
    public int Size => inventorySize;

    /// <summary>获取所有槽位（只读）</summary>
    public IReadOnlyList<InventorySlot> Slots => slots.AsReadOnly();

    // ========== 生命周期 ==========

    private void Awake()
    {
        // 单例初始化 - 确保全局只有一个实例
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject); // 切换场景时不销毁

        // 初始化所有槽位为空
        InitializeSlots();
    }

    /// <summary>
    /// 初始化背包槽位
    /// </summary>
    private void InitializeSlots()
    {
        slots.Clear();
        for (int i = 0; i < inventorySize; i++)
        {
            slots.Add(new InventorySlot());
        }
    }

    // ========== 添加物品（类似 dispatch(addItem(item))）==========

    /// <summary>
    /// 添加物品到背包
    ///
    /// 逻辑流程：
    /// 1. 如果物品可堆叠，先尝试堆叠到已有的相同物品上
    /// 2. 如果还有剩余，放入第一个空槽位
    /// 3. 如果背包已满，返回未能添加的数量
    /// </summary>
    /// <param name="itemData">要添加的物品数据</param>
    /// <param name="quantity">要添加的数量</param>
    /// <returns>未能添加的数量（0 表示全部添加成功）</returns>
    public int AddItem(ItemData itemData, int quantity = 1)
    {
        if (itemData == null)
        {
            Debug.LogWarning("[InventoryManager] 尝试添加空物品");
            return quantity;
        }

        int remaining = quantity;

        // 步骤1：如果物品可堆叠，尝试堆叠到已有槽位
        if (itemData.stackable)
        {
            for (int i = 0; i < slots.Count && remaining > 0; i++)
            {
                // 找到相同物品且未满的槽位
                if (!slots[i].IsEmpty &&
                    slots[i].itemData == itemData &&
                    slots[i].CanAddMore())
                {
                    int added = slots[i].AddQuantity(remaining);
                    remaining -= added;

                    // 通知该槽位变化
                    OnSlotChanged?.Invoke(i);
                }
            }
        }

        // 步骤2：将剩余物品放入空槽位
        while (remaining > 0)
        {
            int emptyIndex = FindFirstEmptySlot();
            if (emptyIndex == -1)
            {
                // 背包已满
                Debug.LogWarning($"[InventoryManager] 背包已满，无法添加 {remaining} 个 {itemData.itemName}");
                break;
            }

            // 计算此槽位可放置的数量
            int amountToPlace;
            if (itemData.stackable)
            {
                amountToPlace = Mathf.Min(remaining, itemData.maxStack);
            }
            else
            {
                amountToPlace = 1;
            }

            slots[emptyIndex].SetItem(itemData, amountToPlace);
            remaining -= amountToPlace;

            // 通知该槽位变化
            OnSlotChanged?.Invoke(emptyIndex);
        }

        // 如果有物品被成功添加，触发事件
        int actuallyAdded = quantity - remaining;
        if (actuallyAdded > 0)
        {
            OnItemAdded?.Invoke(itemData, actuallyAdded);
            OnInventoryChanged?.Invoke();

            Debug.Log($"[InventoryManager] 添加了 {actuallyAdded} 个 {itemData.itemName}");
        }

        return remaining; // 返回未能添加的数量
    }

    // ========== 移除物品 ==========

    /// <summary>
    /// 从背包中移除指定物品
    /// </summary>
    /// <param name="itemData">要移除的物品数据</param>
    /// <param name="quantity">要移除的数量</param>
    /// <returns>实际移除的数量</returns>
    public int RemoveItem(ItemData itemData, int quantity = 1)
    {
        if (itemData == null) return 0;

        int remaining = quantity;

        // 从后往前移除（通常玩家更关注前面的物品）
        for (int i = slots.Count - 1; i >= 0 && remaining > 0; i--)
        {
            if (!slots[i].IsEmpty && slots[i].itemData == itemData)
            {
                int removed = slots[i].RemoveQuantity(remaining);
                remaining -= removed;

                OnSlotChanged?.Invoke(i);
            }
        }

        int actuallyRemoved = quantity - remaining;
        if (actuallyRemoved > 0)
        {
            OnItemRemoved?.Invoke(itemData, actuallyRemoved);
            OnInventoryChanged?.Invoke();

            Debug.Log($"[InventoryManager] 移除了 {actuallyRemoved} 个 {itemData.itemName}");
        }

        return actuallyRemoved;
    }

    /// <summary>
    /// 移除指定槽位的物品
    /// </summary>
    /// <param name="slotIndex">槽位索引</param>
    /// <param name="quantity">要移除的数量，-1 表示全部移除</param>
    /// <returns>被移除的物品数据和数量</returns>
    public (ItemData item, int quantity) RemoveItemAtSlot(int slotIndex, int quantity = -1)
    {
        if (!IsValidSlot(slotIndex) || slots[slotIndex].IsEmpty)
            return (null, 0);

        InventorySlot slot = slots[slotIndex];
        ItemData item = slot.itemData;

        int removeAmount = quantity == -1 ? slot.quantity : Mathf.Min(quantity, slot.quantity);
        slot.RemoveQuantity(removeAmount);

        OnSlotChanged?.Invoke(slotIndex);
        OnItemRemoved?.Invoke(item, removeAmount);
        OnInventoryChanged?.Invoke();

        return (item, removeAmount);
    }

    // ========== 使用物品 ==========

    /// <summary>
    /// 使用指定槽位的物品（仅消耗品）
    /// </summary>
    /// <param name="slotIndex">槽位索引</param>
    /// <returns>是否成功使用</returns>
    public bool UseItem(int slotIndex)
    {
        if (!IsValidSlot(slotIndex) || slots[slotIndex].IsEmpty)
            return false;

        InventorySlot slot = slots[slotIndex];
        ItemData item = slot.itemData;

        // 根据物品类型执行不同操作
        switch (item.itemType)
        {
            case ItemType.Consumable:
                // 使用消耗品 - 恢复生命等效果
                ApplyConsumableEffect(item);
                slot.RemoveQuantity(1);

                OnSlotChanged?.Invoke(slotIndex);
                OnInventoryChanged?.Invoke();

                Debug.Log($"[InventoryManager] 使用了 {item.itemName}");
                return true;

            case ItemType.Weapon:
            case ItemType.Armor:
                // 装备类物品 - 委托给装备管理器
                if (EquipmentManager.Instance != null)
                {
                    EquipmentManager.Instance.EquipItem(item, slotIndex);
                    return true;
                }
                return false;

            default:
                Debug.Log($"[InventoryManager] {item.itemName} 不可使用");
                return false;
        }
    }

    /// <summary>
    /// 应用消耗品效果
    /// </summary>
    /// <param name="item">消耗品数据</param>
    private void ApplyConsumableEffect(ItemData item)
    {
        // 恢复生命值
        if (item.stats.healAmount > 0)
        {
            // 这里假设玩家有一个 HealthComponent
            // 你可以根据实际项目调整
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
            {
                HealthComponent health = player.GetComponent<HealthComponent>();
                if (health != null)
                {
                    health.Heal(item.stats.healAmount);
                    Debug.Log($"[InventoryManager] 恢复了 {item.stats.healAmount} 点生命值");
                }
            }
        }
    }

    // ========== 交换物品 ==========

    /// <summary>
    /// 交换两个槽位的物品
    /// 这是拖拽操作的核心逻辑
    ///
    /// 情况处理：
    /// 1. 两个不同物品 → 直接交换
    /// 2. 相同可堆叠物品 → 尝试合并
    /// 3. 一个为空 → 移动物品
    /// </summary>
    /// <param name="fromIndex">源槽位索引</param>
    /// <param name="toIndex">目标槽位索引</param>
    public void SwapItems(int fromIndex, int toIndex)
    {
        if (!IsValidSlot(fromIndex) || !IsValidSlot(toIndex))
            return;

        if (fromIndex == toIndex)
            return;

        InventorySlot fromSlot = slots[fromIndex];
        InventorySlot toSlot = slots[toIndex];

        // 情况1：目标为空 → 直接移动
        if (toSlot.IsEmpty)
        {
            toSlot.SetItem(fromSlot.itemData, fromSlot.quantity);
            fromSlot.Clear();
        }
        // 情况2：相同物品且可堆叠 → 尝试合并
        else if (!fromSlot.IsEmpty &&
                 fromSlot.itemData == toSlot.itemData &&
                 toSlot.itemData.stackable)
        {
            int spaceInTarget = toSlot.itemData.maxStack - toSlot.quantity;
            if (spaceInTarget >= fromSlot.quantity)
            {
                // 目标槽位能容纳所有数量
                toSlot.AddQuantity(fromSlot.quantity);
                fromSlot.Clear();
            }
            else
            {
                // 目标槽位只能容纳部分
                toSlot.AddQuantity(spaceInTarget);
                fromSlot.RemoveQuantity(spaceInTarget);
            }
        }
        // 情况3：不同物品 → 交换
        else
        {
            ItemData tempData = fromSlot.itemData;
            int tempQuantity = fromSlot.quantity;

            fromSlot.SetItem(toSlot.itemData, toSlot.quantity);
            toSlot.SetItem(tempData, tempQuantity);
        }

        // 通知变化
        OnSlotChanged?.Invoke(fromIndex);
        OnSlotChanged?.Invoke(toIndex);
        OnInventoryChanged?.Invoke();
    }

    // ========== 查询方法（类似 Redux Selector） ==========

    /// <summary>
    /// 获取指定槽位的数据
    /// </summary>
    public InventorySlot GetSlot(int index)
    {
        return IsValidSlot(index) ? slots[index] : null;
    }

    /// <summary>
    /// 查找第一个空槽位的索引
    /// </summary>
    /// <returns>空槽位索引，-1 表示背包已满</returns>
    public int FindFirstEmptySlot()
    {
        for (int i = 0; i < slots.Count; i++)
        {
            if (slots[i].IsEmpty)
                return i;
        }
        return -1;
    }

    /// <summary>
    /// 检查背包中是否有指定物品
    /// </summary>
    /// <param name="itemData">要查找的物品</param>
    /// <param name="quantity">需要的最少数量</param>
    /// <returns>是否拥有足够数量</returns>
    public bool HasItem(ItemData itemData, int quantity = 1)
    {
        return GetItemCount(itemData) >= quantity;
    }

    /// <summary>
    /// 获取指定物品在背包中的总数量
    /// 类似 Redux selector: selectItemCount(state, itemId)
    /// </summary>
    /// <param name="itemData">物品数据</param>
    /// <returns>总数量</returns>
    public int GetItemCount(ItemData itemData)
    {
        int count = 0;
        foreach (var slot in slots)
        {
            if (!slot.IsEmpty && slot.itemData == itemData)
            {
                count += slot.quantity;
            }
        }
        return count;
    }

    /// <summary>
    /// 查找包含指定物品的所有槽位索引
    /// </summary>
    /// <param name="itemData">物品数据</param>
    /// <returns>槽位索引列表</returns>
    public List<int> FindItemSlots(ItemData itemData)
    {
        List<int> result = new List<int>();
        for (int i = 0; i < slots.Count; i++)
        {
            if (!slots[i].IsEmpty && slots[i].itemData == itemData)
            {
                result.Add(i);
            }
        }
        return result;
    }

    /// <summary>
    /// 检查背包是否已满
    /// </summary>
    public bool IsFull => FindFirstEmptySlot() == -1;

    /// <summary>
    /// 获取已使用的槽位数量
    /// </summary>
    public int UsedSlotCount
    {
        get
        {
            int count = 0;
            foreach (var slot in slots)
            {
                if (!slot.IsEmpty) count++;
            }
            return count;
        }
    }

    // ========== 工具方法 ==========

    /// <summary>
    /// 验证槽位索引是否合法
    /// </summary>
    private bool IsValidSlot(int index)
    {
        return index >= 0 && index < slots.Count;
    }

    /// <summary>
    /// 清空整个背包
    /// </summary>
    public void ClearAll()
    {
        foreach (var slot in slots)
        {
            slot.Clear();
        }
        OnInventoryChanged?.Invoke();
    }

    /// <summary>
    /// 排序背包 - 按物品类型和名称排序
    /// </summary>
    public void SortInventory()
    {
        // 收集所有非空物品
        List<InventorySlot> nonEmptySlots = new List<InventorySlot>();
        foreach (var slot in slots)
        {
            if (!slot.IsEmpty)
            {
                nonEmptySlots.Add(slot.Clone());
            }
        }

        // 按类型 → 稀有度 → 名称排序
        nonEmptySlots.Sort((a, b) =>
        {
            // 先按类型排序
            int typeCompare = a.itemData.itemType.CompareTo(b.itemData.itemType);
            if (typeCompare != 0) return typeCompare;

            // 再按稀有度排序（高稀有度在前）
            int rarityCompare = b.itemData.rarity.CompareTo(a.itemData.rarity);
            if (rarityCompare != 0) return rarityCompare;

            // 最后按名称排序
            return string.Compare(a.itemData.itemName, b.itemData.itemName, StringComparison.Ordinal);
        });

        // 重新填充槽位
        for (int i = 0; i < slots.Count; i++)
        {
            if (i < nonEmptySlots.Count)
            {
                slots[i].SetItem(nonEmptySlots[i].itemData, nonEmptySlots[i].quantity);
            }
            else
            {
                slots[i].Clear();
            }
        }

        OnInventoryChanged?.Invoke();
        Debug.Log("[InventoryManager] 背包已排序");
    }
}
```

---

## 12.6 背包 UI 系统

### InventoryUI.cs - 背包界面控制器

```csharp
// InventoryUI.cs
// 背包 UI 控制器 - 管理背包界面的显示和交互
// 类似于 React 中的容器组件（Container Component）
// 订阅 InventoryManager 的事件来更新 UI（类似 useSelector + useEffect）

using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 背包 UI 控制器
///
/// 负责：
/// 1. 创建和管理所有物品槽位 UI
/// 2. 监听 InventoryManager 的变化事件
/// 3. 控制背包面板的打开/关闭
/// 4. 管理物品拖拽状态
/// 5. 显示物品 Tooltip
///
/// 层级结构：
/// Canvas
/// └─ InventoryPanel
///    ├─ Header (标题栏)
///    ├─ SlotGrid (网格容器，使用 GridLayoutGroup)
///    │  ├─ ItemSlot_0
///    │  ├─ ItemSlot_1
///    │  └─ ...
///    ├─ Tooltip (悬浮提示面板)
///    └─ DragIcon (拖拽时跟随鼠标的图标)
/// </summary>
public class InventoryUI : MonoBehaviour
{
    [Header("UI 引用")]
    [Tooltip("背包面板的根 GameObject")]
    [SerializeField] private GameObject inventoryPanel;

    [Tooltip("放置物品槽位的网格容器（需要 GridLayoutGroup 组件）")]
    [SerializeField] private Transform slotContainer;

    [Tooltip("物品槽位 UI 的预制体")]
    [SerializeField] private GameObject slotPrefab;

    [Header("Tooltip")]
    [Tooltip("物品信息 Tooltip 面板")]
    [SerializeField] private GameObject tooltipPanel;

    [Tooltip("Tooltip 中的物品名称文本")]
    [SerializeField] private Text tooltipName;

    [Tooltip("Tooltip 中的物品类型文本")]
    [SerializeField] private Text tooltipType;

    [Tooltip("Tooltip 中的物品描述文本")]
    [SerializeField] private Text tooltipDescription;

    [Tooltip("Tooltip 中的物品属性文本")]
    [SerializeField] private Text tooltipStats;

    [Header("拖拽")]
    [Tooltip("拖拽时显示的图标")]
    [SerializeField] private Image dragIcon;

    [Header("设置")]
    [Tooltip("打开/关闭背包的按键")]
    [SerializeField] private KeyCode toggleKey = KeyCode.I;

    // ========== 内部状态 ==========

    /// <summary>所有槽位 UI 组件的引用</summary>
    private ItemSlotUI[] slotUIs;

    /// <summary>背包是否正在显示</summary>
    private bool isOpen = false;

    /// <summary>当前正在拖拽的源槽位索引</summary>
    private int dragFromSlot = -1;

    /// <summary>是否正在拖拽</summary>
    public bool IsDragging => dragFromSlot >= 0;

    /// <summary>全局引用</summary>
    public static InventoryUI Instance { get; private set; }

    // ========== 生命周期 ==========

    private void Awake()
    {
        Instance = this;
    }

    private void Start()
    {
        // 初始化 UI
        CreateSlotUIs();

        // 订阅 InventoryManager 的事件（类似 Redux 的 subscribe）
        if (InventoryManager.Instance != null)
        {
            InventoryManager.Instance.OnInventoryChanged += RefreshAllSlots;
            InventoryManager.Instance.OnSlotChanged += RefreshSlot;
        }

        // 初始隐藏
        inventoryPanel.SetActive(false);
        tooltipPanel.SetActive(false);
        dragIcon.gameObject.SetActive(false);
    }

    private void OnDestroy()
    {
        // 取消订阅事件（避免内存泄漏，类似 React 的 cleanup）
        if (InventoryManager.Instance != null)
        {
            InventoryManager.Instance.OnInventoryChanged -= RefreshAllSlots;
            InventoryManager.Instance.OnSlotChanged -= RefreshSlot;
        }
    }

    private void Update()
    {
        // 按键切换背包
        if (Input.GetKeyDown(toggleKey))
        {
            ToggleInventory();
        }

        // 拖拽时图标跟随鼠标/手指
        if (IsDragging && dragIcon.gameObject.activeSelf)
        {
            dragIcon.transform.position = Input.mousePosition;
        }
    }

    // ========== 创建 UI ==========

    /// <summary>
    /// 动态创建所有槽位 UI
    /// 类似于 React 中 map 数组渲染列表
    /// </summary>
    private void CreateSlotUIs()
    {
        if (InventoryManager.Instance == null)
        {
            Debug.LogError("[InventoryUI] InventoryManager 未找到！");
            return;
        }

        int size = InventoryManager.Instance.Size;
        slotUIs = new ItemSlotUI[size];

        // 清除 slotContainer 中的占位子对象
        foreach (Transform child in slotContainer)
        {
            Destroy(child.gameObject);
        }

        // 创建槽位 UI（类似 items.map((item, i) => <SlotUI key={i} />)）
        for (int i = 0; i < size; i++)
        {
            GameObject slotObj = Instantiate(slotPrefab, slotContainer);
            slotObj.name = $"Slot_{i}";

            ItemSlotUI slotUI = slotObj.GetComponent<ItemSlotUI>();
            if (slotUI != null)
            {
                slotUI.Initialize(i, this);
                slotUIs[i] = slotUI;
            }
        }

        // 初始刷新所有槽位
        RefreshAllSlots();
    }

    // ========== 刷新 UI ==========

    /// <summary>
    /// 刷新所有槽位的显示
    /// 类似 React 的 re-render
    /// </summary>
    private void RefreshAllSlots()
    {
        if (slotUIs == null) return;

        for (int i = 0; i < slotUIs.Length; i++)
        {
            RefreshSlot(i);
        }
    }

    /// <summary>
    /// 刷新单个槽位的显示
    /// 类似 React 的局部 re-render（通过 key 定位）
    /// </summary>
    /// <param name="index">槽位索引</param>
    private void RefreshSlot(int index)
    {
        if (slotUIs == null || index < 0 || index >= slotUIs.Length)
            return;

        InventorySlot slotData = InventoryManager.Instance.GetSlot(index);
        slotUIs[index].UpdateDisplay(slotData);
    }

    // ========== 开关背包 ==========

    /// <summary>
    /// 切换背包的显示/隐藏
    /// </summary>
    public void ToggleInventory()
    {
        isOpen = !isOpen;
        inventoryPanel.SetActive(isOpen);

        if (isOpen)
        {
            RefreshAllSlots();
            // 可选：暂停游戏
            // Time.timeScale = 0f;
        }
        else
        {
            HideTooltip();
            CancelDrag();
            // Time.timeScale = 1f;
        }
    }

    // ========== Tooltip 系统 ==========

    /// <summary>
    /// 显示物品 Tooltip
    /// </summary>
    /// <param name="itemData">物品数据</param>
    /// <param name="position">显示位置</param>
    public void ShowTooltip(ItemData itemData, Vector3 position)
    {
        if (itemData == null) return;

        // 设置名称（根据稀有度显示不同颜色）
        string colorHex = GetRarityColorHex(itemData.rarity);
        tooltipName.text = $"<color={colorHex}>{itemData.itemName}</color>";

        // 设置类型
        tooltipType.text = GetItemTypeName(itemData.itemType);

        // 设置描述
        tooltipDescription.text = itemData.description;

        // 设置属性文本
        tooltipStats.text = BuildStatsText(itemData);

        // 设置位置并显示
        tooltipPanel.transform.position = position + new Vector3(200, 0, 0);
        tooltipPanel.SetActive(true);
    }

    /// <summary>
    /// 隐藏 Tooltip
    /// </summary>
    public void HideTooltip()
    {
        tooltipPanel.SetActive(false);
    }

    /// <summary>
    /// 构建属性显示文本
    /// </summary>
    private string BuildStatsText(ItemData item)
    {
        System.Text.StringBuilder sb = new System.Text.StringBuilder();

        if (item.stats.attack > 0)
            sb.AppendLine($"攻击力: +{item.stats.attack}");
        if (item.stats.defense > 0)
            sb.AppendLine($"防御力: +{item.stats.defense}");
        if (item.stats.health > 0)
            sb.AppendLine($"生命值: +{item.stats.health}");
        if (item.stats.speed > 0)
            sb.AppendLine($"速度: +{item.stats.speed:F1}");
        if (item.stats.criticalChance > 0)
            sb.AppendLine($"暴击率: +{item.stats.criticalChance * 100:F0}%");
        if (item.stats.healAmount > 0)
            sb.AppendLine($"恢复: {item.stats.healAmount} HP");

        if (item.buyPrice > 0)
            sb.AppendLine($"\n价格: {item.buyPrice} 金币");

        return sb.ToString();
    }

    /// <summary>
    /// 获取稀有度对应的颜色代码
    /// </summary>
    private string GetRarityColorHex(ItemRarity rarity)
    {
        switch (rarity)
        {
            case ItemRarity.Common:    return "#FFFFFF"; // 白色
            case ItemRarity.Uncommon:  return "#00FF00"; // 绿色
            case ItemRarity.Rare:      return "#0088FF"; // 蓝色
            case ItemRarity.Epic:      return "#AA00FF"; // 紫色
            case ItemRarity.Legendary: return "#FF8800"; // 橙色
            default: return "#FFFFFF";
        }
    }

    /// <summary>
    /// 获取物品类型的中文名称
    /// </summary>
    private string GetItemTypeName(ItemType type)
    {
        switch (type)
        {
            case ItemType.Weapon:     return "武器";
            case ItemType.Armor:      return "防具";
            case ItemType.Consumable: return "消耗品";
            case ItemType.Material:   return "材料";
            case ItemType.Quest:      return "任务物品";
            default: return "未知";
        }
    }

    // ========== 拖拽系统 ==========

    /// <summary>
    /// 开始拖拽物品
    /// </summary>
    /// <param name="slotIndex">被拖拽的槽位索引</param>
    public void StartDrag(int slotIndex)
    {
        InventorySlot slot = InventoryManager.Instance.GetSlot(slotIndex);
        if (slot == null || slot.IsEmpty) return;

        dragFromSlot = slotIndex;

        // 显示拖拽图标
        dragIcon.sprite = slot.itemData.icon;
        dragIcon.gameObject.SetActive(true);

        HideTooltip();
    }

    /// <summary>
    /// 结束拖拽 - 放置到目标槽位
    /// </summary>
    /// <param name="toSlotIndex">目标槽位索引</param>
    public void EndDrag(int toSlotIndex)
    {
        if (!IsDragging) return;

        // 执行交换操作
        InventoryManager.Instance.SwapItems(dragFromSlot, toSlotIndex);

        CancelDrag();
    }

    /// <summary>
    /// 取消拖拽
    /// </summary>
    public void CancelDrag()
    {
        dragFromSlot = -1;
        dragIcon.gameObject.SetActive(false);
    }
}
```

[截图：背包 UI 的层级结构，展示 Canvas → InventoryPanel → SlotGrid 的关系]

[截图：GridLayoutGroup 组件的设置，Cell Size 和 Spacing 的配置]

### ItemSlotUI.cs - 单个槽位 UI

```csharp
// ItemSlotUI.cs
// 单个物品槽位 UI 组件
// 类似 React 中的展示组件（Presentational Component）
// 接收数据（props）并渲染，处理用户交互事件

using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

/// <summary>
/// 物品槽位 UI
///
/// 处理单个格子的显示和交互：
/// - 显示物品图标和数量
/// - 鼠标悬停 → 显示 Tooltip
/// - 拖拽 → 移动物品
/// - 右键 → 使用物品
///
/// 实现了多个 EventSystem 接口来处理鼠标/触摸事件
/// 这类似于 React 中给组件绑定 onClick、onMouseEnter 等事件
/// </summary>
public class ItemSlotUI : MonoBehaviour,
    IPointerEnterHandler,   // 鼠标进入（onMouseEnter）
    IPointerExitHandler,    // 鼠标离开（onMouseLeave）
    IPointerClickHandler,   // 点击（onClick）
    IBeginDragHandler,      // 开始拖拽（onDragStart）
    IDragHandler,           // 拖拽中（onDrag）
    IEndDragHandler,        // 结束拖拽（onDragEnd）
    IDropHandler            // 放置目标（onDrop）
{
    [Header("UI 组件引用")]
    [Tooltip("物品图标 Image")]
    [SerializeField] private Image itemIcon;

    [Tooltip("物品数量文本")]
    [SerializeField] private Text quantityText;

    [Tooltip("槽位背景 Image（用于高亮等效果）")]
    [SerializeField] private Image slotBackground;

    [Tooltip("稀有度边框 Image")]
    [SerializeField] private Image rarityBorder;

    // ========== 内部状态 ==========

    /// <summary>此 UI 对应的槽位索引</summary>
    private int slotIndex;

    /// <summary>父级 InventoryUI 的引用</summary>
    private InventoryUI inventoryUI;

    /// <summary>当前显示的物品数据</summary>
    private ItemData currentItem;

    /// <summary>默认背景颜色</summary>
    private Color defaultBgColor;

    /// <summary>高亮背景颜色</summary>
    private Color highlightColor = new Color(1f, 1f, 1f, 0.3f);

    // ========== 初始化 ==========

    /// <summary>
    /// 初始化槽位 UI
    /// 类似 React 组件接收初始 props
    /// </summary>
    /// <param name="index">槽位索引</param>
    /// <param name="ui">父级 InventoryUI</param>
    public void Initialize(int index, InventoryUI ui)
    {
        slotIndex = index;
        inventoryUI = ui;

        if (slotBackground != null)
            defaultBgColor = slotBackground.color;

        // 初始显示为空
        UpdateDisplay(null);
    }

    /// <summary>
    /// 更新显示内容
    /// 类似 React 组件的 render 方法，根据 props 渲染 UI
    /// </summary>
    /// <param name="slotData">槽位数据（可能为 null 表示空）</param>
    public void UpdateDisplay(InventorySlot slotData)
    {
        if (slotData == null || slotData.IsEmpty)
        {
            // 空槽位 - 隐藏图标和数量
            currentItem = null;

            if (itemIcon != null)
            {
                itemIcon.enabled = false;
                itemIcon.sprite = null;
            }

            if (quantityText != null)
                quantityText.text = "";

            if (rarityBorder != null)
                rarityBorder.enabled = false;
        }
        else
        {
            // 有物品 - 显示图标和数量
            currentItem = slotData.itemData;

            if (itemIcon != null)
            {
                itemIcon.enabled = true;
                itemIcon.sprite = slotData.itemData.icon;
            }

            // 只有可堆叠且数量大于1时才显示数量
            if (quantityText != null)
            {
                quantityText.text = slotData.itemData.stackable && slotData.quantity > 1
                    ? slotData.quantity.ToString()
                    : "";
            }

            // 显示稀有度边框
            if (rarityBorder != null)
            {
                rarityBorder.enabled = true;
                rarityBorder.color = GetRarityColor(slotData.itemData.rarity);
            }
        }
    }

    // ========== 事件处理 ==========

    /// <summary>
    /// 鼠标进入 - 显示 Tooltip
    /// 类似 onMouseEnter 事件
    /// </summary>
    public void OnPointerEnter(PointerEventData eventData)
    {
        // 拖拽中不显示 Tooltip
        if (inventoryUI.IsDragging) return;

        if (currentItem != null)
        {
            inventoryUI.ShowTooltip(currentItem, transform.position);
        }

        // 高亮背景
        if (slotBackground != null)
            slotBackground.color = highlightColor;
    }

    /// <summary>
    /// 鼠标离开 - 隐藏 Tooltip
    /// 类似 onMouseLeave 事件
    /// </summary>
    public void OnPointerExit(PointerEventData eventData)
    {
        inventoryUI.HideTooltip();

        // 恢复背景颜色
        if (slotBackground != null)
            slotBackground.color = defaultBgColor;
    }

    /// <summary>
    /// 点击事件
    /// 右键：使用物品
    /// 类似 onClick 事件
    /// </summary>
    public void OnPointerClick(PointerEventData eventData)
    {
        if (currentItem == null) return;

        // 右键使用物品
        if (eventData.button == PointerEventData.InputButton.Right)
        {
            InventoryManager.Instance.UseItem(slotIndex);
        }
    }

    /// <summary>
    /// 开始拖拽
    /// </summary>
    public void OnBeginDrag(PointerEventData eventData)
    {
        if (currentItem == null) return;

        inventoryUI.StartDrag(slotIndex);

        // 降低当前槽位的透明度以示反馈
        if (itemIcon != null)
        {
            Color c = itemIcon.color;
            c.a = 0.5f;
            itemIcon.color = c;
        }
    }

    /// <summary>
    /// 拖拽中 - 必须实现此接口，否则 BeginDrag 和 EndDrag 不会触发
    /// </summary>
    public void OnDrag(PointerEventData eventData)
    {
        // 拖拽图标的位置更新在 InventoryUI.Update() 中处理
    }

    /// <summary>
    /// 结束拖拽
    /// </summary>
    public void OnEndDrag(PointerEventData eventData)
    {
        // 恢复透明度
        if (itemIcon != null)
        {
            Color c = itemIcon.color;
            c.a = 1f;
            itemIcon.color = c;
        }

        // 如果不是拖到有效目标上，取消拖拽
        inventoryUI.CancelDrag();
    }

    /// <summary>
    /// 作为放置目标 - 当其他物品被拖放到此槽位时触发
    /// </summary>
    public void OnDrop(PointerEventData eventData)
    {
        inventoryUI.EndDrag(slotIndex);
    }

    // ========== 工具方法 ==========

    /// <summary>
    /// 获取稀有度对应的颜色
    /// </summary>
    private Color GetRarityColor(ItemRarity rarity)
    {
        switch (rarity)
        {
            case ItemRarity.Common:    return Color.white;
            case ItemRarity.Uncommon:  return Color.green;
            case ItemRarity.Rare:      return new Color(0f, 0.5f, 1f);     // 蓝色
            case ItemRarity.Epic:      return new Color(0.66f, 0f, 1f);    // 紫色
            case ItemRarity.Legendary: return new Color(1f, 0.5f, 0f);     // 橙色
            default: return Color.white;
        }
    }
}
```

[截图：单个 ItemSlotUI 预制体的结构，展示 Icon、Quantity、RarityBorder 子对象]

---

## 12.7 装备管理器

```csharp
// EquipmentManager.cs
// 装备管理器 - 管理角色身上穿戴的装备
// 与 InventoryManager 协作，处理装备的穿戴和卸下

using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 装备管理器 - 单例模式
///
/// 管理角色的装备槽位（武器、防具等）
/// 当装备变化时，更新角色的属性加成
///
/// 工作流程：
/// 1. 玩家在背包中右键点击武器/防具
/// 2. InventoryManager.UseItem() 调用 EquipmentManager.EquipItem()
/// 3. EquipmentManager 将物品放入对应装备槽
/// 4. 如果该槽位已有装备，旧装备回到背包
/// 5. 重新计算角色属性加成
/// </summary>
public class EquipmentManager : MonoBehaviour
{
    // ========== 单例 ==========
    public static EquipmentManager Instance { get; private set; }

    // ========== 数据 ==========

    /// <summary>
    /// 装备槽位字典 - 每个槽位类型对应一个 ItemData
    /// 类似于 Map<EquipmentSlotType, ItemData>
    /// </summary>
    private Dictionary<EquipmentSlotType, ItemData> equippedItems
        = new Dictionary<EquipmentSlotType, ItemData>();

    // ========== 事件 ==========

    /// <summary>装备变化事件 - 参数：(槽位类型, 新装备, 旧装备)</summary>
    public event Action<EquipmentSlotType, ItemData, ItemData> OnEquipmentChanged;

    /// <summary>总属性变化事件</summary>
    public event Action<ItemStats> OnStatsChanged;

    // ========== 当前总加成（缓存） ==========

    /// <summary>所有装备提供的总属性加成</summary>
    public ItemStats TotalBonusStats { get; private set; } = new ItemStats();

    // ========== 生命周期 ==========

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        // 初始化所有装备槽位为空
        foreach (EquipmentSlotType slotType in Enum.GetValues(typeof(EquipmentSlotType)))
        {
            equippedItems[slotType] = null;
        }
    }

    // ========== 装备操作 ==========

    /// <summary>
    /// 装备物品
    /// </summary>
    /// <param name="item">要装备的物品数据</param>
    /// <param name="inventorySlotIndex">物品在背包中的槽位索引</param>
    /// <returns>是否成功装备</returns>
    public bool EquipItem(ItemData item, int inventorySlotIndex)
    {
        if (item == null) return false;

        // 验证物品是否可装备
        if (item.itemType != ItemType.Weapon && item.itemType != ItemType.Armor)
        {
            Debug.LogWarning($"[EquipmentManager] {item.itemName} 不是可装备物品");
            return false;
        }

        EquipmentSlotType targetSlot = item.equipSlot;
        ItemData previousItem = equippedItems[targetSlot];

        // 从背包中移除要装备的物品
        InventoryManager.Instance.RemoveItemAtSlot(inventorySlotIndex, 1);

        // 如果目标槽位已有装备，将旧装备放回背包
        if (previousItem != null)
        {
            int overflow = InventoryManager.Instance.AddItem(previousItem, 1);
            if (overflow > 0)
            {
                // 背包已满，装备失败，恢复原状
                InventoryManager.Instance.AddItem(item, 1);
                Debug.LogWarning("[EquipmentManager] 背包已满，无法卸下旧装备");
                return false;
            }
        }

        // 装备新物品
        equippedItems[targetSlot] = item;

        // 重新计算属性加成
        RecalculateStats();

        // 触发事件
        OnEquipmentChanged?.Invoke(targetSlot, item, previousItem);

        Debug.Log($"[EquipmentManager] 装备了 {item.itemName} 到 {targetSlot}");
        return true;
    }

    /// <summary>
    /// 卸下指定槽位的装备
    /// </summary>
    /// <param name="slotType">装备槽位类型</param>
    /// <returns>是否成功卸下</returns>
    public bool UnequipItem(EquipmentSlotType slotType)
    {
        ItemData currentItem = equippedItems[slotType];
        if (currentItem == null)
        {
            Debug.Log("[EquipmentManager] 该槽位没有装备");
            return false;
        }

        // 尝试放回背包
        int overflow = InventoryManager.Instance.AddItem(currentItem, 1);
        if (overflow > 0)
        {
            Debug.LogWarning("[EquipmentManager] 背包已满，无法卸下装备");
            return false;
        }

        // 清空装备槽
        equippedItems[slotType] = null;

        // 重新计算属性
        RecalculateStats();

        // 触发事件
        OnEquipmentChanged?.Invoke(slotType, null, currentItem);

        Debug.Log($"[EquipmentManager] 卸下了 {currentItem.itemName}");
        return true;
    }

    /// <summary>
    /// 获取指定槽位的装备
    /// </summary>
    public ItemData GetEquippedItem(EquipmentSlotType slotType)
    {
        return equippedItems.ContainsKey(slotType) ? equippedItems[slotType] : null;
    }

    /// <summary>
    /// 检查指定槽位是否有装备
    /// </summary>
    public bool HasEquipped(EquipmentSlotType slotType)
    {
        return equippedItems.ContainsKey(slotType) && equippedItems[slotType] != null;
    }

    // ========== 属性计算 ==========

    /// <summary>
    /// 重新计算所有装备提供的总属性加成
    /// 遍历所有已装备的物品，累加它们的属性值
    /// </summary>
    private void RecalculateStats()
    {
        TotalBonusStats = new ItemStats();

        foreach (var kvp in equippedItems)
        {
            if (kvp.Value != null)
            {
                ItemStats stats = kvp.Value.stats;
                TotalBonusStats.attack += stats.attack;
                TotalBonusStats.defense += stats.defense;
                TotalBonusStats.health += stats.health;
                TotalBonusStats.speed += stats.speed;
                TotalBonusStats.criticalChance += stats.criticalChance;
            }
        }

        // 通知属性变化
        OnStatsChanged?.Invoke(TotalBonusStats);

        Debug.Log($"[EquipmentManager] 属性更新 - " +
                  $"攻击:{TotalBonusStats.attack} " +
                  $"防御:{TotalBonusStats.defense} " +
                  $"生命:{TotalBonusStats.health}");
    }

    /// <summary>
    /// 获取装备提供的特定属性总值
    /// </summary>
    public int GetTotalAttack() => TotalBonusStats.attack;
    public int GetTotalDefense() => TotalBonusStats.defense;
    public int GetTotalHealth() => TotalBonusStats.health;
    public float GetTotalSpeed() => TotalBonusStats.speed;
    public float GetTotalCritChance() => TotalBonusStats.criticalChance;
}
```

[截图：装备面板 UI 设计，展示头部、身体、武器等装备槽位的布局]

---

## 12.8 世界物品拾取与丢弃

### 可拾取物品组件

```csharp
// WorldItem.cs
// 世界中可拾取的物品
// 挂载到场景中的 3D 物品模型上

using UnityEngine;

/// <summary>
/// 世界物品组件
///
/// 放在场景中的可拾取物品。当玩家靠近并按下交互键时，
/// 物品会被添加到背包中并从世界中移除。
///
/// 设置步骤：
/// 1. 创建一个 3D 物品模型（或使用 Cube 占位）
/// 2. 添加 Collider（设为 Trigger）
/// 3. 添加此脚本
/// 4. 在 Inspector 中设置 ItemData 和数量
/// </summary>
[RequireComponent(typeof(Collider))]
public class WorldItem : MonoBehaviour
{
    [Header("物品设置")]
    [Tooltip("此世界物品对应的物品数据")]
    [SerializeField] private ItemData itemData;

    [Tooltip("拾取数量")]
    [SerializeField] private int quantity = 1;

    [Header("视觉效果")]
    [Tooltip("物品旋转速度")]
    [SerializeField] private float rotateSpeed = 50f;

    [Tooltip("物品上下浮动的幅度")]
    [SerializeField] private float bobAmplitude = 0.2f;

    [Tooltip("物品浮动速度")]
    [SerializeField] private float bobSpeed = 2f;

    [Header("拾取设置")]
    [Tooltip("是否自动拾取（靠近就捡起）")]
    [SerializeField] private bool autoPickup = false;

    [Tooltip("拾取交互键")]
    [SerializeField] private KeyCode pickupKey = KeyCode.E;

    [Tooltip("拾取提示 UI 文本")]
    [SerializeField] private GameObject pickupPrompt;

    // ========== 内部状态 ==========

    /// <summary>玩家是否在拾取范围内</summary>
    private bool playerInRange = false;

    /// <summary>初始 Y 坐标（用于浮动动画）</summary>
    private float startY;

    /// <summary>物品模型的 Transform</summary>
    private Transform modelTransform;

    // ========== 生命周期 ==========

    private void Start()
    {
        startY = transform.position.y;
        modelTransform = transform.GetChild(0); // 假设第一个子对象是模型

        // 确保 Collider 是 Trigger
        Collider col = GetComponent<Collider>();
        col.isTrigger = true;

        // 初始隐藏拾取提示
        if (pickupPrompt != null)
            pickupPrompt.SetActive(false);
    }

    private void Update()
    {
        // 旋转动画
        if (modelTransform != null)
        {
            modelTransform.Rotate(Vector3.up, rotateSpeed * Time.deltaTime);
        }

        // 上下浮动动画
        Vector3 pos = transform.position;
        pos.y = startY + Mathf.Sin(Time.time * bobSpeed) * bobAmplitude;
        transform.position = pos;

        // 检查拾取输入
        if (playerInRange && !autoPickup && Input.GetKeyDown(pickupKey))
        {
            TryPickup();
        }
    }

    // ========== 触发器检测 ==========

    private void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag("Player")) return;

        playerInRange = true;

        if (autoPickup)
        {
            TryPickup();
        }
        else
        {
            // 显示拾取提示
            if (pickupPrompt != null)
                pickupPrompt.SetActive(true);
        }
    }

    private void OnTriggerExit(Collider other)
    {
        if (!other.CompareTag("Player")) return;

        playerInRange = false;

        // 隐藏拾取提示
        if (pickupPrompt != null)
            pickupPrompt.SetActive(false);
    }

    // ========== 拾取逻辑 ==========

    /// <summary>
    /// 尝试拾取此物品
    /// </summary>
    private void TryPickup()
    {
        if (InventoryManager.Instance == null) return;

        int overflow = InventoryManager.Instance.AddItem(itemData, quantity);

        if (overflow == 0)
        {
            // 全部拾取成功，销毁世界物品
            Debug.Log($"[WorldItem] 拾取了 {quantity} 个 {itemData.itemName}");
            Destroy(gameObject);
        }
        else if (overflow < quantity)
        {
            // 部分拾取成功
            quantity = overflow;
            Debug.Log($"[WorldItem] 部分拾取，剩余 {overflow} 个 {itemData.itemName}");
        }
        else
        {
            // 拾取失败（背包满）
            Debug.Log("[WorldItem] 背包已满，无法拾取");
        }
    }

    // ========== 静态工厂方法 ==========

    /// <summary>
    /// 在世界中生成一个可拾取物品
    /// 用于从背包丢弃物品时调用
    /// </summary>
    /// <param name="item">物品数据</param>
    /// <param name="qty">数量</param>
    /// <param name="position">生成位置</param>
    /// <param name="force">丢出的力（可选）</param>
    public static void SpawnWorldItem(ItemData item, int qty, Vector3 position, Vector3 force = default)
    {
        if (item == null || item.worldPrefab == null)
        {
            Debug.LogWarning("[WorldItem] 无法生成世界物品：缺少预制体");
            return;
        }

        // 实例化世界物品
        GameObject obj = Instantiate(item.worldPrefab, position, Quaternion.identity);

        WorldItem worldItem = obj.GetComponent<WorldItem>();
        if (worldItem == null)
            worldItem = obj.AddComponent<WorldItem>();

        worldItem.itemData = item;
        worldItem.quantity = qty;

        // 如果有刚体，施加力模拟丢出效果
        Rigidbody rb = obj.GetComponent<Rigidbody>();
        if (rb != null && force != default)
        {
            rb.AddForce(force, ForceMode.Impulse);
        }

        Debug.Log($"[WorldItem] 在世界中生成了 {qty} 个 {item.itemName}");
    }
}
```

[截图：世界中的可拾取物品，展示旋转和浮动效果，以及靠近时的拾取提示UI]

---

## 12.9 基础合成系统

```csharp
// CraftingRecipe.cs
// 合成配方数据 - 定义合成所需的材料和产出

using UnityEngine;

/// <summary>
/// 合成材料 - 一种材料及其数量
/// </summary>
[System.Serializable]
public class CraftingIngredient
{
    [Tooltip("所需物品")]
    public ItemData item;

    [Tooltip("所需数量")]
    public int quantity = 1;
}

/// <summary>
/// 合成配方 ScriptableObject
///
/// 定义：
/// - 需要哪些材料（及各自数量）
/// - 合成产出什么物品（及数量）
/// - 合成所需时间（可选）
/// </summary>
[CreateAssetMenu(fileName = "NewRecipe", menuName = "Inventory/Crafting Recipe")]
public class CraftingRecipe : ScriptableObject
{
    [Header("配方信息")]
    [Tooltip("配方名称")]
    public string recipeName;

    [Tooltip("配方描述")]
    [TextArea(2, 4)]
    public string description;

    [Header("材料")]
    [Tooltip("合成所需的材料列表")]
    public CraftingIngredient[] ingredients;

    [Header("产出")]
    [Tooltip("合成产出的物品")]
    public ItemData resultItem;

    [Tooltip("产出数量")]
    public int resultQuantity = 1;

    [Header("要求")]
    [Tooltip("合成所需时间（秒），0 = 即时合成")]
    public float craftingTime = 0f;

    /// <summary>
    /// 检查玩家是否拥有足够的材料进行合成
    /// </summary>
    /// <returns>是否可以合成</returns>
    public bool CanCraft()
    {
        if (InventoryManager.Instance == null) return false;

        foreach (var ingredient in ingredients)
        {
            if (!InventoryManager.Instance.HasItem(ingredient.item, ingredient.quantity))
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>
    /// 执行合成
    /// </summary>
    /// <returns>是否成功</returns>
    public bool Craft()
    {
        if (!CanCraft())
        {
            Debug.Log($"[Crafting] 材料不足，无法合成 {recipeName}");
            return false;
        }

        // 检查背包是否有空间容纳产出
        // 简化检查：确保至少有一个空位
        if (InventoryManager.Instance.IsFull)
        {
            Debug.Log("[Crafting] 背包已满，无法合成");
            return false;
        }

        // 消耗材料
        foreach (var ingredient in ingredients)
        {
            InventoryManager.Instance.RemoveItem(ingredient.item, ingredient.quantity);
        }

        // 添加产出物品
        InventoryManager.Instance.AddItem(resultItem, resultQuantity);

        Debug.Log($"[Crafting] 合成了 {resultQuantity} 个 {resultItem.itemName}");
        return true;
    }
}
```

---

## 12.10 与前端状态管理模式的深入对比

让我们用一个表格来总结 Unity 物品系统与前端状态管理的对应关系：

### 数据流对比

**Redux 数据流：**
```
用户操作 → dispatch(action) → reducer(state, action) → 新 state → UI 更新
```

**Unity 物品系统数据流：**
```
用户操作 → Manager.Method() → 修改内部 state → 触发 event → UI 更新
```

### 关键区别

| 方面 | Redux/Vuex | Unity 物品系统 |
|-----|-----------|---------------|
| 不可变性 | State 不可变，每次返回新对象 | State 可变，直接修改 |
| 数据订阅 | `useSelector` / `mapState` | C# `event` / `UnityEvent` |
| 中间件 | Redux middleware | 可在 Manager 方法中添加前后逻辑 |
| DevTools | Redux DevTools | Unity Inspector + Debug.Log |
| 持久化 | localStorage / IndexedDB | PlayerPrefs / JsonUtility / 文件 |
| 类型安全 | TypeScript 提供编译时检查 | C# 原生强类型 |

### 为什么 Unity 不用不可变模式？

在前端（JavaScript/TypeScript）中，不可变性配合 Virtual DOM diff 可以高效判断是否需要 re-render。但在 Unity 中：

1. **没有 Virtual DOM** - Unity UI 的更新是事件驱动的，不需要 diff
2. **性能考虑** - 游戏每帧都需要处理大量数据，频繁创建新对象会增加 GC 压力
3. **C# 值类型** - struct 在 C# 中是值类型，拷贝成本低，但引用类型对象的不可变模式代价高

---

## 12.11 设置步骤汇总

[截图：完成后的 Project 文件夹结构，展示 Scripts/Inventory 下的所有脚本]

### Unity 编辑器中的设置步骤

1. **创建 InventoryManager**
   - 创建空 GameObject，命名为 `InventoryManager`
   - 添加 `InventoryManager` 脚本
   - 设置 `inventorySize = 24`

2. **创建 EquipmentManager**
   - 创建空 GameObject，命名为 `EquipmentManager`
   - 添加 `EquipmentManager` 脚本

3. **创建背包 UI**
   - 创建 Canvas
   - 添加 InventoryPanel（Image 作为背景）
   - 添加 SlotGrid（空 GameObject + GridLayoutGroup）
   - 创建 ItemSlotUI 预制体
   - 添加 Tooltip 面板
   - 添加 DragIcon

4. **创建物品资产**
   - 右键 → Create → Inventory → Item Data
   - 为每种物品填写属性
   - 指定图标和世界预制体

5. **配置世界物品**
   - 为物品创建 3D 模型预制体
   - 添加 WorldItem 脚本
   - 添加 Sphere Collider（Trigger）

[截图：InventoryManager 在 Inspector 中的配置]

[截图：GridLayoutGroup 的推荐设置 - Cell Size(80,80), Spacing(5,5), Constraint: Fixed Column Count = 6]

---

## 练习题

### 练习一：实现物品分拆功能
当玩家 Shift+点击 一个可堆叠物品时，将该物品堆叠分成两半（例如 20 个药水变成两组 10 个）。

**提示：**
- 在 `ItemSlotUI.OnPointerClick` 中检测 Shift 键
- 在 `InventoryManager` 中添加 `SplitStack(int slotIndex)` 方法
- 计算分拆数量：`splitAmount = quantity / 2`
- 将分拆出的物品放入第一个空槽位

### 练习二：实现物品过滤/搜索
在背包 UI 中添加一个搜索框和分类按钮，允许玩家：
- 按名称搜索物品
- 按类型过滤（只显示武器/防具/消耗品等）

**提示：**
- 添加 `InputField` 用于搜索
- 添加按钮组用于分类过滤
- 在 `InventoryUI` 中添加 `FilterByType(ItemType type)` 和 `SearchByName(string keyword)` 方法
- 隐藏不匹配的 `ItemSlotUI`（`SetActive(false)`）

### 练习三：实现物品耐久度系统
为武器和防具添加耐久度系统：
- 每次战斗消耗耐久度
- 耐久度为 0 时装备损坏（属性减半或不可使用）
- 可以用材料修复

**提示：**
- 耐久度是运行时数据，不能存在 ItemData（ScriptableObject）中
- 需要在 InventorySlot 中添加 `currentDurability` 字段
- 在 ItemData 中添加 `maxDurability` 字段

### 练习四：实现背包数据持久化
使用 `JsonUtility` 将背包数据保存到本地文件，并在游戏启动时加载。

**提示：**
- 创建可序列化的 `InventorySaveData` 类
- 使用 `itemId` 而非直接引用来标识物品
- 保存时将 `InventorySlot[]` 转换为 `SaveData[]`
- 加载时通过 `itemId` 查找对应的 `ItemData` ScriptableObject
- 使用 `Application.persistentDataPath` 作为保存路径

---

## 下一章预告

在下一章 **第十三章：NPC 对话系统** 中，我们将学习：

- 如何设计对话数据结构（对话树/对话节点）
- 使用 ScriptableObject 创建可编辑的对话内容
- 实现打字机文字效果
- 构建分支对话（玩家选择影响剧情走向）
- NPC 交互触发和指示器
- 对话条件检查（检查任务状态、背包物品等）
- 对话后果（给予物品、开始任务、改变 NPC 状态）

这将为你的开放世界游戏增添丰富的叙事和角色互动能力！
