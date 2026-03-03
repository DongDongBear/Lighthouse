# 第四章：C# for Unity —— 从 JS/TS 到 C# 的完整过渡

## 本章目标

- 理解 C# 类型系统与 JavaScript/TypeScript 的核心差异
- 掌握 C# 变量、常量、类、结构体的声明和使用
- 熟悉访问修饰符、属性、方法的 C# 写法
- 学会使用数组、List、Dictionary 等集合类型
- 理解 null 处理、async/await、事件委托等高级特性
- 掌握 LINQ 查询语法（对标 JS 数组方法）
- 理解命名空间、枚举、继承、接口、泛型

## 预计学习时间

**4-5 小时**（建议分 2-3 次学习，每个主题动手写代码练习）

---

## 4.1 为什么要认真学 C#？

作为前端/全栈开发者，你可能会觉得"不就是换个语言嘛"。但 C# 和 JavaScript 有着根本性的差异：

| 维度 | JavaScript/TypeScript | C# |
|------|----------------------|-----|
| 类型系统 | 动态类型 / 可选静态类型 | 强静态类型 |
| 编译方式 | 解释执行 / JIT | 编译为 IL，再 JIT/AOT |
| 内存管理 | GC（V8引擎） | GC（.NET CLR） |
| 运行环境 | 浏览器 / Node.js | .NET CLR / Mono (Unity) |
| 面向对象 | 基于原型 | 基于类（经典OOP） |
| null 处理 | null + undefined | null（值类型不可为null） |

> **重要提示：** Unity 使用的是 C# 语言，但运行环境是 Mono（旧版本）或 IL2CPP（新版本），与标准 .NET 有细微差异。本章所有内容均以 Unity 2022+ 环境为准。

---

## 4.2 类型系统：从"一切皆 any"到"类型即安全"

### 4.2.1 基本类型对比

**JavaScript/TypeScript:**
```typescript
// JS - 动态类型，运行时才知道类型
let count = 42;           // number（没有int/float之分）
let price = 19.99;        // number（同上）
let name = "BellLab";     // string
let isActive = true;      // boolean
let nothing = null;       // null
let notDefined = undefined; // undefined（C#没有这个概念）

// TS - 可选的静态类型
let count: number = 42;
let name: string = "BellLab";
let isActive: boolean = true;
```

**C#（Unity）:**
```csharp
// C# - 强制静态类型，编译时检查
int count = 42;            // 整数，32位，范围 -2^31 到 2^31-1
float price = 19.99f;      // 单精度浮点数，注意末尾的 f
double precisePrice = 19.99; // 双精度浮点数（Unity中较少使用）
string name = "BellLab";   // 字符串（引用类型）
bool isActive = true;      // 布尔值
char grade = 'A';          // 单个字符（JS没有char类型）

// Unity 特有的常用类型
Vector3 position = new Vector3(0f, 1f, 0f);  // 三维向量
Quaternion rotation = Quaternion.identity;     // 四元数（旋转）
Color color = Color.red;                       // 颜色
```

### 4.2.2 数值类型详解

C# 有多种数值类型，而 JS 只有 `number` 和 `BigInt`：

```csharp
// 整数类型（按大小排列）
byte small = 255;          // 0 到 255（无符号，8位）
short medium = 32767;      // -32768 到 32767（16位）
int normal = 2147483647;   // 最常用的整数类型（32位）
long big = 9223372036854775807L; // 大整数（64位），注意末尾 L

// 浮点类型
float speed = 5.5f;        // 单精度（Unity中最常用），注意末尾 f
double precise = 5.5;      // 双精度（科学计算用）
decimal money = 19.99m;    // 高精度十进制（金融计算），注意末尾 m
```

> **Unity 开发要点：** 在 Unity 中，几乎所有浮点数都使用 `float`。这是因为 Unity 的底层引擎（C++）使用单精度浮点数。如果你写 `5.5` 不加 `f`，编译器会报错，因为 `5.5` 默认是 `double` 类型。

### 4.2.3 类型推断：var 关键字

```csharp
// C# 也有 var，但和 JS 的 var 完全不同！
// C# 的 var 是编译时类型推断，不是动态类型
var count = 42;            // 编译器推断为 int
var name = "BellLab";      // 编译器推断为 string
var position = new Vector3(0, 1, 0); // 编译器推断为 Vector3

// 一旦推断，类型就固定了
// count = "hello";  // 编译错误！count 已被推断为 int

// 对比 JS 的 var（千万别搞混）
// JS: var count = 42; count = "hello"; // 完全合法
```

[截图：在 Visual Studio 中将鼠标悬停在 var 变量上，显示推断出的类型]

### 4.2.4 类型转换

```csharp
// 隐式转换（安全的，小类型到大类型）
int intValue = 42;
float floatValue = intValue;    // int -> float，自动转换
double doubleValue = floatValue; // float -> double，自动转换

// 显式转换（可能丢失精度，需要强制转换）
float pi = 3.14159f;
int rounded = (int)pi;          // 结果是 3，直接截断小数部分
// 注意：不是四舍五入！用 Mathf.RoundToInt(pi) 才是四舍五入

// 字符串转换
string numberStr = "42";
int parsed = int.Parse(numberStr);           // 如果格式错误会抛异常
bool success = int.TryParse(numberStr, out int result); // 安全转换，推荐

// 对比 JS
// JS: parseInt("42")     => 42
// JS: Number("42")       => 42
// JS: +"42"              => 42（一元运算符）
// C# 没有这些隐式转换魔法
```

---

## 4.3 变量与常量

### 4.3.1 变量声明对比

**JavaScript/TypeScript:**
```typescript
// JS 三种声明方式
var oldWay = "不推荐";      // 函数作用域，有提升
let modern = "推荐";        // 块作用域
const fixed = "不可变";     // 块作用域，不可重新赋值

// TS 声明
let count: number = 0;
const MAX: number = 100;
```

**C#:**
```csharp
// C# 的变量声明
int count = 0;                    // 普通变量
const int MaxCount = 100;         // 编译时常量（必须在声明时赋值）
readonly float spawnRate = 0.5f;  // 运行时常量（可以在构造函数中赋值）

// static readonly - 类似 JS 的模块级 const
static readonly string GameVersion = "1.0.0";

// Unity 中常见的变量声明模式
public float moveSpeed = 5f;      // 在 Inspector 面板中可见可编辑
[SerializeField] private float jumpForce = 10f; // Inspector可见但外部不可访问
private int _health = 100;        // 完全私有，Inspector不可见
```

### 4.3.2 const vs readonly vs static readonly

```csharp
public class GameConfig : MonoBehaviour
{
    // const: 编译时常量，值直接嵌入代码
    // 类似 JS 中 const 声明的原始类型
    const int MAX_PLAYERS = 4;
    const float GRAVITY = -9.81f;
    const string GAME_NAME = "BellLab Adventure";

    // readonly: 运行时常量，可在构造函数中赋值
    // 类似 JS 中 const 声明的对象（引用不变，但可以晚初始化）
    readonly DateTime startTime;

    // static readonly: 类级别的运行时常量
    static readonly Color PLAYER_COLOR = new Color(0.2f, 0.8f, 0.4f);

    // 构造函数中可以给 readonly 赋值
    public GameConfig()
    {
        startTime = DateTime.Now; // 合法
    }
}
```

---

## 4.4 类与结构体

### 4.4.1 类（Class）—— 引用类型

**JavaScript/TypeScript:**
```typescript
// JS/TS 的类
class Player {
    name: string;
    health: number;
    private _score: number;     // TS 的 private（仅编译时检查）

    constructor(name: string) {
        this.name = name;
        this.health = 100;
        this._score = 0;
    }

    takeDamage(amount: number): void {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    private die(): void {
        console.log(`${this.name} has died!`);
    }
}

const player = new Player("Hero");
```

**C#（Unity）:**
```csharp
// C# 的类（在 Unity 中通常继承 MonoBehaviour）
public class Player : MonoBehaviour
{
    // 字段声明（注意：不需要 this. 前缀）
    public string playerName;     // Inspector 中可见
    public int health = 100;      // 可以设默认值

    [SerializeField]
    private int _score = 0;       // Inspector 可见但外部不可访问

    private bool _isDead = false;  // 完全私有

    // Unity 生命周期方法（类似 React 的生命周期）
    void Start()
    {
        // 类似 React 的 componentDidMount
        Debug.Log($"{playerName} 已就绪！");
    }

    void Update()
    {
        // 类似 React 的每帧渲染（但是每帧都调用）
        // requestAnimationFrame 的自动版
    }

    // 公开方法
    public void TakeDamage(int amount)
    {
        // C# 不需要 this.，直接访问字段
        health -= amount;
        if (health <= 0)
        {
            Die();
        }
    }

    // 私有方法（真正的私有，不像 TS 的编译时检查）
    private void Die()
    {
        _isDead = true;
        Debug.Log($"{playerName} 已死亡！");
        // $ 字符串插值，类似 JS 的模板字符串 `${}`
    }
}
```

[截图：Unity Inspector 面板中 Player 组件的显示效果，展示 public 字段和 SerializeField 字段]

### 4.4.2 结构体（Struct）—— 值类型

JavaScript 没有结构体的概念。结构体是 C# 中非常重要的概念，尤其在 Unity 中。

```csharp
// 结构体 - 值类型（存在栈上，赋值时复制）
// Unity 的 Vector3, Color, Quaternion 都是结构体
public struct DamageInfo
{
    public int amount;         // 伤害数值
    public string source;      // 伤害来源
    public Vector3 hitPoint;   // 命中位置
    public bool isCritical;    // 是否暴击

    // 结构体可以有构造函数
    public DamageInfo(int amount, string source, Vector3 hitPoint, bool isCritical)
    {
        this.amount = amount;
        this.source = source;
        this.hitPoint = hitPoint;
        this.isCritical = isCritical;
    }
}

// 使用结构体
public class CombatSystem : MonoBehaviour
{
    public void ProcessDamage()
    {
        // 结构体是值类型，赋值时会复制整个对象
        DamageInfo damage1 = new DamageInfo(50, "剑", Vector3.zero, false);
        DamageInfo damage2 = damage1; // 复制！不是引用
        damage2.amount = 100;

        // damage1.amount 仍然是 50！
        // 如果是 class，damage1.amount 就会变成 100

        Debug.Log($"damage1: {damage1.amount}"); // 输出 50
        Debug.Log($"damage2: {damage2.amount}"); // 输出 100
    }
}
```

> **JS 类比：** 结构体的行为就像 JS 中的原始类型（number, string, boolean）—— 赋值时复制值，而不是复制引用。类的行为则像 JS 中的对象 —— 赋值时复制引用。

### 4.4.3 class vs struct 选择指南

```csharp
// 用 struct 的场景：
// - 数据较小（一般 < 16 字节）
// - 频繁创建和销毁（减少 GC 压力）
// - 表示简单的数据组合（坐标、颜色等）

// 用 class 的场景：
// - 有复杂的行为和状态
// - 需要继承
// - 数据较大
// - 需要被多个地方引用同一个实例

// Unity 中的例子：
// struct: Vector3, Vector2, Color, Quaternion, Rect
// class: MonoBehaviour, GameObject, Transform, Rigidbody
```

---

## 4.5 访问修饰符

```csharp
// C# 有四种主要的访问修饰符（JS/TS 只有 public/private/protected）
public class Character : MonoBehaviour
{
    // public - 任何地方都能访问（Unity Inspector 也能看到）
    // 对应 TS 的 public（默认）
    public string characterName;

    // private - 只有这个类内部能访问（C# 类成员的默认修饰符）
    // 对应 TS 的 private（但 C# 是真正的运行时私有）
    private int _secretCode = 1234;

    // protected - 这个类和子类能访问
    // 对应 TS 的 protected
    protected float _baseSpeed = 5f;

    // internal - 同一个程序集（Assembly）内能访问
    // JS/TS 没有对应概念，有点像"包级私有"
    internal bool isNPC = false;

    // protected internal - protected 或 internal
    protected internal float healthMultiplier = 1f;

    // private protected - protected 且 internal（C# 7.2+）
    private protected int _level = 1;
}
```

**与 TS 访问修饰符的关键差异：**

```typescript
// TypeScript - private 只在编译时检查
class TSPlayer {
    private secret = "123";
}
const p = new TSPlayer();
// (p as any).secret  => "123"  // 运行时可以绕过！
```

```csharp
// C# - private 是真正的运行时限制
public class CSharpPlayer : MonoBehaviour
{
    private string _secret = "123";
}
// 外部无法通过任何正常方式访问 _secret
// 只有通过反射（Reflection）才能访问，这和 JS 完全不同
```

---

## 4.6 方法（Methods）

### 4.6.1 方法声明对比

**JavaScript/TypeScript:**
```typescript
// 函数声明
function greet(name: string): string {
    return `Hello, ${name}!`;
}

// 箭头函数
const add = (a: number, b: number): number => a + b;

// 可选参数
function createPlayer(name: string, level?: number): Player {
    return new Player(name, level ?? 1);
}

// 默认参数
function move(speed: number = 5, direction: string = "forward") { }

// 剩余参数
function sum(...numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
}
```

**C#:**
```csharp
public class MethodExamples : MonoBehaviour
{
    // 普通方法（注意：C# 没有独立函数，方法必须在类中）
    public string Greet(string name)
    {
        return $"Hello, {name}!"; // $ 插值，类似 JS 的 `${}`
    }

    // 表达式体方法（类似箭头函数，但不完全一样）
    public int Add(int a, int b) => a + b;

    // 可选参数（必须放在最后）
    public void CreatePlayer(string name, int level = 1)
    {
        Debug.Log($"创建玩家 {name}，等级 {level}");
    }

    // 命名参数（JS 通常用对象解构实现类似功能）
    public void SpawnEnemy(string type, Vector3 position, float health = 100f)
    {
        Debug.Log($"生成 {type} 在 {position}，血量 {health}");
    }

    void Start()
    {
        // 使用命名参数（可以乱序）
        SpawnEnemy(position: Vector3.zero, type: "Goblin", health: 50f);
        // 类似 JS 的对象参数：spawnEnemy({ type: "Goblin", position: [0,0,0] })
    }

    // params 关键字（类似 JS 的 ...rest）
    public int Sum(params int[] numbers)
    {
        int total = 0;
        foreach (int n in numbers)
        {
            total += n;
        }
        return total;
    }

    // 使用 params
    void Example()
    {
        int result = Sum(1, 2, 3, 4, 5); // 直接传多个参数
        // 类似 JS 的 sum(1, 2, 3, 4, 5)
    }
}
```

### 4.6.2 out 和 ref 参数（JS 没有的概念）

```csharp
public class ParameterExamples : MonoBehaviour
{
    // out 参数 - 方法必须给它赋值，用于返回多个值
    // JS 中通常返回对象或数组来实现类似功能
    public bool TryGetPlayerScore(string playerName, out int score)
    {
        // 模拟查找
        if (playerName == "Hero")
        {
            score = 9999;
            return true;
        }
        score = 0; // out 参数必须在所有路径中赋值
        return false;
    }

    // ref 参数 - 传引用（修改会影响原变量）
    public void DoubleHealth(ref int health)
    {
        health *= 2; // 直接修改调用者的变量
    }

    // in 参数 - 只读引用（性能优化，避免大型结构体复制）
    public float CalculateDistance(in Vector3 from, in Vector3 to)
    {
        return Vector3.Distance(from, to);
    }

    void Start()
    {
        // 使用 out
        if (TryGetPlayerScore("Hero", out int score))
        {
            Debug.Log($"分数: {score}"); // 9999
        }

        // 使用 ref
        int hp = 50;
        DoubleHealth(ref hp);
        Debug.Log($"血量: {hp}"); // 100（原始变量被修改了）

        // 对比 JS - JS 做不到这一点（原始类型按值传递）
        // JS: let hp = 50; doubleHealth(hp); // hp 仍然是 50
    }
}
```

---

## 4.7 属性（Properties）—— get/set

**JavaScript/TypeScript:**
```typescript
class JSPlayer {
    private _health: number = 100;

    // getter
    get health(): number {
        return this._health;
    }

    // setter（带验证）
    set health(value: number) {
        this._health = Math.max(0, Math.min(100, value));
    }

    // 只读属性
    get isDead(): boolean {
        return this._health <= 0;
    }
}

const p = new JSPlayer();
p.health = 150;  // 实际设置为 100（setter 限制）
console.log(p.health);  // 100
console.log(p.isDead);  // false
```

**C#:**
```csharp
public class CSharpPlayer : MonoBehaviour
{
    // 自动属性（最简写法，编译器自动创建背后的字段）
    public string Name { get; set; }

    // 带默认值的自动属性
    public int Level { get; set; } = 1;

    // 只读自动属性（只能在构造函数中赋值）
    public string PlayerId { get; }

    // 带验证逻辑的完整属性
    private int _health = 100;
    public int Health
    {
        get { return _health; }
        set
        {
            // value 是自动提供的关键字，代表传入的值
            // 类似 JS setter 的参数
            _health = Mathf.Clamp(value, 0, MaxHealth);
            OnHealthChanged?.Invoke(_health); // 触发事件
        }
    }

    // 只读属性（只有 get，没有 set）
    public bool IsDead => _health <= 0;
    // 等价于：
    // public bool IsDead { get { return _health <= 0; } }

    // 不同访问级别的 getter 和 setter
    public int MaxHealth { get; private set; } = 100;
    // 外部可以读，但只有类内部可以写

    // 事件（后面会详细讲）
    public System.Action<int> OnHealthChanged;

    void Start()
    {
        Name = "英雄";           // 调用 set
        Health = 150;            // 会被 Clamp 到 100
        Debug.Log(Health);       // 100，调用 get
        Debug.Log(IsDead);       // false

        // MaxHealth = 200;      // 编译错误！外部不能 set
    }

    // 类内部可以修改 MaxHealth
    public void LevelUp()
    {
        MaxHealth += 20;         // 内部可以调用 private set
        Level++;
    }
}
```

> **对比要点：** C# 属性比 JS getter/setter 更强大。C# 可以为 get 和 set 设置不同的访问级别（如 `public get / private set`），JS 做不到。另外，C# 的自动属性（`{ get; set; }`）非常简洁。

---

## 4.8 数组与集合

### 4.8.1 数组（Array）

```csharp
// C# 数组 vs JS 数组：C# 数组是定长的！
// JS: const arr = [1, 2, 3]; arr.push(4); // 合法，JS数组可变长
// C#:
int[] numbers = new int[3];       // 创建长度为3的数组，默认值为0
numbers[0] = 1;
numbers[1] = 2;
numbers[2] = 3;
// numbers[3] = 4;  // 运行时错误！IndexOutOfRangeException

// 初始化语法
int[] scores = { 90, 85, 78, 92 };       // 简写
string[] names = new string[] { "A", "B", "C" }; // 完整写法

// 多维数组（JS 没有原生多维数组）
int[,] grid = new int[3, 3];      // 3x3 二维数组
grid[0, 0] = 1;
grid[1, 2] = 5;

// 交错数组（数组的数组，类似 JS 的 [[1,2],[3,4,5]]）
int[][] jagged = new int[3][];
jagged[0] = new int[] { 1, 2 };
jagged[1] = new int[] { 3, 4, 5 };

// 数组长度
int len = scores.Length;  // 4（注意是属性，不是 JS 的 .length）
```

### 4.8.2 List —— JS 数组的真正对应

```csharp
using System.Collections.Generic; // 必须引入命名空间

public class CollectionExamples : MonoBehaviour
{
    void Start()
    {
        // List<T> 才是 JS 数组的真正对应（可变长度）
        List<int> scores = new List<int>();     // 空列表
        List<string> names = new List<string> { "Alice", "Bob", "Charlie" }; // 初始化

        // 添加元素（JS: arr.push()）
        scores.Add(90);
        scores.Add(85);
        scores.Add(78);

        // 在指定位置插入（JS: arr.splice(1, 0, 95)）
        scores.Insert(1, 95);

        // 删除元素（JS: arr.splice(arr.indexOf(85), 1)）
        scores.Remove(85);        // 删除第一个匹配的值
        scores.RemoveAt(0);       // 按索引删除

        // 查找（JS: arr.indexOf()）
        int index = names.IndexOf("Bob");       // 1
        bool exists = names.Contains("Alice");  // true

        // 遍历
        foreach (string name in names)
        {
            Debug.Log(name);
        }

        // 带索引遍历（JS: arr.forEach((item, index) => {})）
        for (int i = 0; i < names.Count; i++)  // 注意是 Count，不是 Length
        {
            Debug.Log($"[{i}] {names[i]}");
        }

        // 排序
        scores.Sort();                          // 升序
        scores.Sort((a, b) => b.CompareTo(a)); // 降序（类似 JS 的 sort 回调）

        // 转数组
        int[] scoreArray = scores.ToArray();    // List -> Array
        List<int> backToList = new List<int>(scoreArray); // Array -> List
    }
}
```

**完整对照表：**

| JS 数组方法 | C# List 方法 |
|-------------|-------------|
| `arr.push(item)` | `list.Add(item)` |
| `arr.pop()` | `list.RemoveAt(list.Count - 1)` |
| `arr.shift()` | `list.RemoveAt(0)` |
| `arr.unshift(item)` | `list.Insert(0, item)` |
| `arr.splice(i, 1)` | `list.RemoveAt(i)` |
| `arr.indexOf(item)` | `list.IndexOf(item)` |
| `arr.includes(item)` | `list.Contains(item)` |
| `arr.length` | `list.Count` |
| `arr.slice()` | `list.GetRange(start, count)` |
| `arr.reverse()` | `list.Reverse()` |
| `arr.sort()` | `list.Sort()` |
| `[...arr1, ...arr2]` | `list1.AddRange(list2)` |

### 4.8.3 Dictionary —— JS 对象/Map 的对应

```csharp
using System.Collections.Generic;

public class DictionaryExamples : MonoBehaviour
{
    void Start()
    {
        // Dictionary<TKey, TValue> 类似 JS 的 Map 或对象
        // JS: const inventory = { "sword": 1, "potion": 5 };
        // JS: const inventory = new Map([["sword", 1], ["potion", 5]]);

        Dictionary<string, int> inventory = new Dictionary<string, int>
        {
            { "sword", 1 },
            { "potion", 5 },
            { "arrow", 20 }
        };

        // C# 6+ 简化初始化语法
        var scores = new Dictionary<string, int>
        {
            ["Alice"] = 100,    // 这个语法更像 JS 对象字面量
            ["Bob"] = 85,
            ["Charlie"] = 92
        };

        // 添加/修改（JS: obj.key = value 或 map.set(key, value)）
        inventory["shield"] = 1;       // 添加新键
        inventory["potion"] = 10;      // 修改已有键

        // 获取值（JS: obj.key 或 map.get(key)）
        int potionCount = inventory["potion"];  // 10
        // 注意：如果键不存在，会抛出 KeyNotFoundException！

        // 安全获取（推荐方式）
        if (inventory.TryGetValue("sword", out int swordCount))
        {
            Debug.Log($"剑的数量: {swordCount}");
        }

        // 检查键是否存在（JS: "key" in obj 或 map.has(key)）
        bool hasSword = inventory.ContainsKey("sword");     // true
        bool hasValue = inventory.ContainsValue(20);        // true

        // 删除（JS: delete obj.key 或 map.delete(key)）
        inventory.Remove("arrow");

        // 遍历（JS: Object.entries(obj).forEach 或 map.forEach）
        foreach (KeyValuePair<string, int> item in inventory)
        {
            Debug.Log($"{item.Key}: {item.Value}");
        }

        // 简写（使用 var）
        foreach (var item in inventory)
        {
            Debug.Log($"{item.Key}: {item.Value}");
        }

        // 只遍历键或值
        foreach (string key in inventory.Keys)
        {
            Debug.Log(key);
        }
        foreach (int value in inventory.Values)
        {
            Debug.Log(value);
        }

        // 获取大小（JS: Object.keys(obj).length 或 map.size）
        int size = inventory.Count;
    }
}
```

---

## 4.9 Null 处理与可空类型

### 4.9.1 C# 的 null 世界

```csharp
public class NullExamples : MonoBehaviour
{
    void Start()
    {
        // C# 中：
        // - 引用类型（class, string, array）可以为 null
        // - 值类型（int, float, bool, struct）不能为 null

        string name = null;      // 合法，string 是引用类型
        // int count = null;     // 编译错误！int 是值类型

        // 可空值类型（Nullable<T> 或 T?）
        int? nullableCount = null;        // 合法！
        float? nullableSpeed = null;      // 合法！
        bool? nullableBool = null;        // 合法！

        // 检查是否有值
        if (nullableCount.HasValue)
        {
            int actualValue = nullableCount.Value;
        }

        // 获取值或默认值（类似 JS 的 ?? 运算符）
        int count = nullableCount ?? 0;       // 如果为null，使用 0
        // JS: const count = nullableCount ?? 0;  // 语法一样！

        // null 条件运算符（C# 6+，类似 JS 的可选链 ?.）
        string playerName = null;
        int? length = playerName?.Length;  // 如果 playerName 是 null，length 也是 null
        // JS: const length = playerName?.length;  // 类似！

        // null 合并赋值（C# 8+，类似 JS 的 ??=）
        string displayName = null;
        displayName ??= "匿名玩家";
        // JS: displayName ??= "匿名玩家";  // 语法一样！
    }

    // Unity 特有的 null 检查
    void UnityNullCheck()
    {
        // Unity 重写了 == 运算符，已销毁的对象 == null 返回 true
        GameObject obj = GameObject.Find("不存在的对象");

        // 推荐的 Unity null 检查方式
        if (obj != null)
        {
            Debug.Log(obj.name);
        }

        // Unity 中也可以用隐式 bool 转换
        if (obj)  // 等价于 obj != null（Unity 特有）
        {
            Debug.Log(obj.name);
        }

        // 注意：C# 的 ?. 在 Unity 中要小心使用
        // 因为 Unity 的 null 检查和 C# 原生的不完全一样
        // 建议在 Unity 中显式使用 != null
    }
}
```

### 4.9.2 null 对比表

| 概念 | JavaScript | C# |
|------|-----------|-----|
| 空值 | `null` 和 `undefined` | 只有 `null` |
| 可选链 | `obj?.prop` | `obj?.Prop`（Unity 中谨慎使用） |
| 空值合并 | `a ?? b` | `a ?? b` |
| 空值赋值 | `a ??= b` | `a ??= b` |
| 类型安全 | 运行时报错 | 编译时警告（C# 8+的NRT） |

---

## 4.10 async/await 对比

**JavaScript:**
```typescript
// JS 的 async/await（基于 Promise）
async function fetchPlayerData(id: string): Promise<PlayerData> {
    const response = await fetch(`/api/players/${id}`);
    const data = await response.json();
    return data as PlayerData;
}

// 错误处理
async function loadGame() {
    try {
        const data = await fetchPlayerData("123");
        console.log(data);
    } catch (error) {
        console.error("加载失败:", error);
    }
}

// Promise.all（并行执行）
const [player, inventory] = await Promise.all([
    fetchPlayerData("123"),
    fetchInventory("123")
]);
```

**C#:**
```csharp
using System.Threading.Tasks;
using UnityEngine.Networking;

public class AsyncExamples : MonoBehaviour
{
    // C# 的 async/await（基于 Task，类似 Promise）
    async Task<string> FetchPlayerData(string id)
    {
        // Unity 中使用 UnityWebRequest
        using (UnityWebRequest request = UnityWebRequest.Get($"/api/players/{id}"))
        {
            // Unity 的异步操作需要特殊处理
            var operation = request.SendWebRequest();

            // 等待完成
            while (!operation.isDone)
            {
                await Task.Yield(); // 让出控制权，下一帧继续
            }

            if (request.result == UnityWebRequest.Result.Success)
            {
                return request.downloadHandler.text;
            }
            else
            {
                throw new System.Exception($"请求失败: {request.error}");
            }
        }
    }

    // 错误处理（和 JS 一样用 try/catch）
    async void LoadGame()
    {
        try
        {
            string data = await FetchPlayerData("123");
            Debug.Log(data);
        }
        catch (System.Exception e)
        {
            Debug.LogError($"加载失败: {e.Message}");
        }
    }

    // 并行执行（类似 Promise.all）
    async Task LoadAllData()
    {
        Task<string> playerTask = FetchPlayerData("123");
        Task<string> inventoryTask = FetchPlayerData("456");

        // 等待所有任务完成
        await Task.WhenAll(playerTask, inventoryTask);

        string playerData = playerTask.Result;
        string inventoryData = inventoryTask.Result;
    }
}
```

> **Unity 开发要点：** Unity 传统上使用 **协程（Coroutine）** 而不是 async/await。在 Unity 2023+ 中，Awaitable API 提供了更好的异步支持。新项目推荐使用 Awaitable，但你仍然会在大量现有代码中遇到协程。

```csharp
// Unity 协程（传统方式，你一定会遇到）
using System.Collections;

public class CoroutineExample : MonoBehaviour
{
    void Start()
    {
        // 启动协程
        StartCoroutine(SpawnEnemies());
    }

    // 协程方法返回 IEnumerator
    IEnumerator SpawnEnemies()
    {
        for (int i = 0; i < 5; i++)
        {
            Debug.Log($"生成第 {i + 1} 个敌人");
            yield return new WaitForSeconds(2f); // 等待2秒
            // 类似 JS 的 await new Promise(r => setTimeout(r, 2000))
        }
        Debug.Log("所有敌人已生成");
    }

    // 常用的 yield 语句
    IEnumerator VariousYields()
    {
        yield return null;                          // 等待下一帧
        yield return new WaitForSeconds(1f);        // 等待1秒
        yield return new WaitForEndOfFrame();       // 等待帧末
        yield return new WaitUntil(() => Input.GetKeyDown(KeyCode.Space)); // 等待条件
    }
}
```

---

## 4.11 事件与委托 vs JS 回调

### 4.11.1 委托（Delegate）—— 类型安全的函数引用

**JavaScript:**
```typescript
// JS 中的回调 - 函数是一等公民
type DamageCallback = (amount: number, source: string) => void;

function onDamage(callback: DamageCallback) {
    callback(50, "火球");
}

// 使用
onDamage((amount, source) => {
    console.log(`受到 ${amount} 点 ${source} 伤害`);
});
```

**C#:**
```csharp
public class DelegateExamples : MonoBehaviour
{
    // 定义委托类型（类似 TS 的 type DamageCallback = ...）
    public delegate void DamageCallback(int amount, string source);

    // 使用预定义的委托类型（更常用，推荐）
    // Action - 无返回值的委托（类似 TS 的 (...args) => void）
    // Action           -> () => void
    // Action<int>      -> (n: number) => void
    // Action<int, string> -> (n: number, s: string) => void

    // Func - 有返回值的委托（类似 TS 的 (...args) => ReturnType）
    // Func<int>        -> () => number
    // Func<int, bool>  -> (n: number) => boolean  （最后一个泛型参数是返回类型）

    // 委托变量
    private Action<int, string> _onDamage;
    private Func<float, float, float> _calculateDamage;

    void Start()
    {
        // 赋值方法引用
        _onDamage = HandleDamage;

        // 赋值 lambda 表达式（类似 JS 箭头函数）
        _calculateDamage = (baseDmg, multiplier) => baseDmg * multiplier;

        // 调用
        _onDamage(50, "火球");
        float damage = _calculateDamage(100f, 1.5f); // 150
    }

    void HandleDamage(int amount, string source)
    {
        Debug.Log($"受到 {amount} 点 {source} 伤害");
    }
}
```

### 4.11.2 事件（Event）—— 观察者模式

```csharp
// C# 事件系统（类似 JS 的 EventEmitter 或 addEventListener）
public class EventExamples : MonoBehaviour
{
    // 声明事件（使用 event 关键字限制外部只能 += 和 -=）
    public event Action<int> OnHealthChanged;       // 血量变化事件
    public event Action OnDeath;                    // 死亡事件
    public event Action<string, int> OnItemCollected; // 收集物品事件

    private int _health = 100;

    public void TakeDamage(int amount)
    {
        _health -= amount;
        // 触发事件（类似 JS 的 emit 或 dispatchEvent）
        OnHealthChanged?.Invoke(_health);
        // ?. 确保有订阅者才调用，否则会 NullReferenceException

        if (_health <= 0)
        {
            OnDeath?.Invoke();
        }
    }

    public void CollectItem(string itemName, int quantity)
    {
        OnItemCollected?.Invoke(itemName, quantity);
    }
}

// 订阅事件的类
public class UIManager : MonoBehaviour
{
    [SerializeField] private EventExamples player;

    void OnEnable()
    {
        // 订阅事件（类似 JS 的 addEventListener）
        player.OnHealthChanged += UpdateHealthBar;
        player.OnDeath += ShowGameOverScreen;
        player.OnItemCollected += ShowCollectionNotice;
    }

    void OnDisable()
    {
        // 取消订阅（类似 JS 的 removeEventListener）
        // 重要！不取消订阅会导致内存泄漏
        player.OnHealthChanged -= UpdateHealthBar;
        player.OnDeath -= ShowGameOverScreen;
        player.OnItemCollected -= ShowCollectionNotice;
    }

    void UpdateHealthBar(int currentHealth)
    {
        Debug.Log($"更新血条: {currentHealth}");
    }

    void ShowGameOverScreen()
    {
        Debug.Log("游戏结束！");
    }

    void ShowCollectionNotice(string item, int qty)
    {
        Debug.Log($"获得 {item} x{qty}");
    }
}
```

**对比总结：**

| 概念 | JavaScript | C# |
|------|-----------|-----|
| 回调 | `(a, b) => {}` | `Action&lt;T1, T2&gt;` 或 `delegate` |
| 事件注册 | `addEventListener` | `event += handler` |
| 事件移除 | `removeEventListener` | `event -= handler` |
| 事件触发 | `dispatchEvent` / `emit` | `event?.Invoke()` |
| 多播 | 需要手动管理 | 内置支持（delegate 自动多播） |

---

## 4.12 LINQ vs JS 数组方法

LINQ（Language Integrated Query）是 C# 中最强大的特性之一，直接对标 JS 的数组方法链。

```csharp
using System.Linq; // 必须引入！
using System.Collections.Generic;

public class LINQExamples : MonoBehaviour
{
    // 示例数据类
    [System.Serializable]
    public class Enemy
    {
        public string name;
        public int health;
        public string type;
        public float distanceToPlayer;
    }

    void Start()
    {
        List<Enemy> enemies = new List<Enemy>
        {
            new Enemy { name = "哥布林A", health = 30, type = "哥布林", distanceToPlayer = 5f },
            new Enemy { name = "骷髅A", health = 50, type = "骷髅", distanceToPlayer = 10f },
            new Enemy { name = "哥布林B", health = 25, type = "哥布林", distanceToPlayer = 3f },
            new Enemy { name = "龙", health = 500, type = "龙", distanceToPlayer = 50f },
            new Enemy { name = "骷髅B", health = 45, type = "骷髅", distanceToPlayer = 8f },
        };

        // ========== filter / Where ==========
        // JS:  enemies.filter(e => e.health > 40)
        var strongEnemies = enemies.Where(e => e.health > 40).ToList();
        // 注意：LINQ 是惰性求值（lazy），需要 .ToList() 或 .ToArray() 来实际执行

        // ========== map / Select ==========
        // JS:  enemies.map(e => e.name)
        var names = enemies.Select(e => e.name).ToList();

        // JS:  enemies.map((e, i) => `${i}: ${e.name}`)
        var indexedNames = enemies.Select((e, i) => $"{i}: {e.name}").ToList();

        // ========== find / First, FirstOrDefault ==========
        // JS:  enemies.find(e => e.type === "龙")
        Enemy dragon = enemies.FirstOrDefault(e => e.type == "龙");
        // FirstOrDefault 找不到时返回 null（引用类型）或默认值（值类型）
        // First 找不到时抛异常（类似 JS 没有对应）

        // ========== some / Any ==========
        // JS:  enemies.some(e => e.type === "龙")
        bool hasDragon = enemies.Any(e => e.type == "龙"); // true

        // ========== every / All ==========
        // JS:  enemies.every(e => e.health > 0)
        bool allAlive = enemies.All(e => e.health > 0); // true

        // ========== reduce / Aggregate ==========
        // JS:  enemies.reduce((sum, e) => sum + e.health, 0)
        int totalHealth = enemies.Sum(e => e.health); // 简单求和用 Sum
        int totalHealthAggregate = enemies.Aggregate(0, (sum, e) => sum + e.health); // 通用 reduce

        // ========== sort / OrderBy ==========
        // JS:  enemies.sort((a, b) => a.health - b.health)
        var sortedByHealth = enemies.OrderBy(e => e.health).ToList();          // 升序
        var sortedDesc = enemies.OrderByDescending(e => e.health).ToList();    // 降序

        // 多级排序
        // JS:  enemies.sort((a, b) => a.type.localeCompare(b.type) || a.health - b.health)
        var multiSorted = enemies
            .OrderBy(e => e.type)
            .ThenBy(e => e.health)
            .ToList();

        // ========== slice / Skip, Take ==========
        // JS:  enemies.slice(1, 3)
        var sliced = enemies.Skip(1).Take(2).ToList(); // 跳过1个，取2个

        // ========== groupBy 分组 ==========
        // JS:  使用 reduce 手动分组 或 Object.groupBy (ES2024)
        var grouped = enemies.GroupBy(e => e.type);
        foreach (var group in grouped)
        {
            Debug.Log($"类型: {group.Key}，数量: {group.Count()}");
            foreach (var enemy in group)
            {
                Debug.Log($"  - {enemy.name}");
            }
        }

        // ========== 链式调用（和 JS 一样优雅）==========
        // JS:  enemies.filter(e => e.health < 100)
        //             .sort((a, b) => a.distance - b.distance)
        //             .map(e => e.name)
        //             .slice(0, 3)
        var nearestWeak = enemies
            .Where(e => e.health < 100)                    // 筛选弱敌人
            .OrderBy(e => e.distanceToPlayer)              // 按距离排序
            .Select(e => e.name)                           // 只取名字
            .Take(3)                                       // 取前3个
            .ToList();

        // ========== distinct / 去重 ==========
        // JS:  [...new Set(enemies.map(e => e.type))]
        var uniqueTypes = enemies.Select(e => e.type).Distinct().ToList();

        // ========== flatMap / SelectMany ==========
        // JS:  [[1,2],[3,4]].flatMap(x => x)
        var nested = new List<List<int>> { new List<int> { 1, 2 }, new List<int> { 3, 4 } };
        var flat = nested.SelectMany(x => x).ToList(); // [1, 2, 3, 4]

        // ========== includes / Contains ==========
        // JS:  ["哥布林", "骷髅"].includes("龙")
        var types = new List<string> { "哥布林", "骷髅" };
        bool containsDragon = types.Contains("龙"); // false

        // ========== 实际游戏开发中的 LINQ 示例 ==========

        // 找到最近的敌人
        Enemy nearest = enemies
            .OrderBy(e => e.distanceToPlayer)
            .FirstOrDefault();

        // 计算某类型敌人的平均血量
        double avgGoblinHealth = enemies
            .Where(e => e.type == "哥布林")
            .Average(e => e.health);

        // 获取血量最高的敌人
        Enemy strongest = enemies
            .OrderByDescending(e => e.health)
            .First();

        Debug.Log($"最近的敌人: {nearest?.name}");
        Debug.Log($"哥布林平均血量: {avgGoblinHealth}");
        Debug.Log($"最强敌人: {strongest.name}");
    }
}
```

**完整 LINQ vs JS 方法对照表：**

| JS 方法 | C# LINQ 方法 | 说明 |
|---------|-------------|------|
| `.filter()` | `.Where()` | 筛选 |
| `.map()` | `.Select()` | 映射 |
| `.flatMap()` | `.SelectMany()` | 展平映射 |
| `.find()` | `.FirstOrDefault()` | 找第一个 |
| `.findIndex()` | `.FindIndex()`(List) | 找索引 |
| `.some()` | `.Any()` | 存在判断 |
| `.every()` | `.All()` | 全部判断 |
| `.reduce()` | `.Aggregate()` | 聚合 |
| `.sort()` | `.OrderBy()` | 排序 |
| `.reverse()` | `.Reverse()` | 反转 |
| `.slice()` | `.Skip().Take()` | 截取 |
| `.includes()` | `.Contains()` | 包含判断 |
| `.forEach()` | `.ToList().ForEach()` | 遍历（注意差异） |
| `Array.from(new Set())` | `.Distinct()` | 去重 |
| `.length` | `.Count()` | 数量 |
| `Math.max(...arr)` | `.Max()` | 最大值 |
| `Math.min(...arr)` | `.Min()` | 最小值 |

> **性能警告：** 在 Unity 的 `Update()` 方法中频繁使用 LINQ 可能导致性能问题（GC 分配）。对于每帧执行的代码，考虑使用传统的 for 循环代替 LINQ。

---

## 4.13 命名空间 vs ES 模块

**JavaScript/TypeScript（ES Modules）:**
```typescript
// math.ts
export function add(a: number, b: number): number {
    return a + b;
}
export const PI = 3.14159;

// player.ts
export class Player {
    name: string;
    constructor(name: string) { this.name = name; }
}
export default Player;

// main.ts
import { add, PI } from './math';
import Player from './player';
import * as MathUtils from './math';
```

**C#（命名空间）:**
```csharp
// ====== MathUtils.cs ======
namespace BellLab.Utils
{
    // C# 没有 export，用 public 控制可见性
    public static class MathUtils
    {
        public static float Add(float a, float b)
        {
            return a + b;
        }

        public const float PI = 3.14159f;
    }
}

// ====== Player.cs ======
namespace BellLab.Characters
{
    public class Player : UnityEngine.MonoBehaviour
    {
        public string playerName;
    }
}

// ====== GameManager.cs ======
using BellLab.Utils;        // 类似 import * from
using BellLab.Characters;   // 引入整个命名空间

// 别名（类似 import { X as Y }）
using Vec3 = UnityEngine.Vector3;

namespace BellLab.Core
{
    public class GameManager : UnityEngine.MonoBehaviour
    {
        void Start()
        {
            // 直接使用（因为已经 using）
            float result = MathUtils.Add(1f, 2f);
            Player player = new Player();

            // 使用别名
            Vec3 pos = Vec3.zero;

            // 完全限定名（不需要 using）
            UnityEngine.Debug.Log("Hello");
        }
    }
}
```

**关键差异：**

| 概念 | JS/TS 模块 | C# 命名空间 |
|------|-----------|------------|
| 基本单位 | 文件 = 模块 | 命名空间（可跨文件） |
| 导入方式 | `import` | `using` |
| 导出方式 | `export` | `public` 访问修饰符 |
| 默认导出 | `export default` | 无对应概念 |
| 按需导入 | `import { X }` | 无法只导入部分（全量引入） |
| 别名 | `import { X as Y }` | `using Y = Namespace.X` |
| 路径 | 相对/绝对文件路径 | 命名空间名称（与文件路径无关） |

> **Unity 要点：** Unity 项目中，所有 C# 文件默认在同一个程序集（Assembly）中。你不需要像 JS 那样显式导入每个文件。只要 `using` 了对应的命名空间，就能访问该命名空间下的所有 `public` 类。

---

## 4.14 枚举（Enums）

```csharp
// ====== C# 枚举 vs TS 枚举 ======

// TypeScript 枚举
// enum Direction { Up, Down, Left, Right }
// enum Status { Active = "active", Inactive = "inactive" }

// C# 枚举（默认基于 int）
public enum Direction
{
    Up,        // 0
    Down,      // 1
    Left,      // 2
    Right      // 3
}

// 指定值
public enum EnemyType
{
    Goblin = 1,
    Skeleton = 2,
    Dragon = 10,
    Boss = 100
}

// 标志枚举（位运算，非常有用）
// TS 没有原生支持，需要手动实现
[System.Flags]
public enum DamageType
{
    None = 0,
    Physical = 1,    // 0001
    Fire = 2,        // 0010
    Ice = 4,         // 0100
    Lightning = 8,   // 1000
    // 组合类型
    Elemental = Fire | Ice | Lightning  // 1110
}

public class EnumExamples : MonoBehaviour
{
    public Direction moveDirection = Direction.Up;  // Inspector中显示为下拉菜单
    public DamageType attackType = DamageType.Physical;

    void Start()
    {
        // 基本使用
        if (moveDirection == Direction.Up)
        {
            Debug.Log("向上移动");
        }

        // switch 语句（C# 的 switch 比 JS 更强大）
        switch (moveDirection)
        {
            case Direction.Up:
                Debug.Log("上");
                break;
            case Direction.Down:
                Debug.Log("下");
                break;
            default:
                Debug.Log("其他方向");
                break;
        }

        // 标志枚举的使用
        DamageType mixed = DamageType.Fire | DamageType.Ice; // 组合
        bool hasFire = (mixed & DamageType.Fire) != 0;       // 检查是否包含
        bool hasFire2 = mixed.HasFlag(DamageType.Fire);      // 更清晰的写法

        // 枚举转字符串
        string dirName = Direction.Up.ToString(); // "Up"
        // JS: Direction[Direction.Up] => "Up"

        // 字符串转枚举
        Direction parsed = (Direction)System.Enum.Parse(typeof(Direction), "Up");
        bool success = System.Enum.TryParse<Direction>("Up", out Direction result);

        // 获取所有枚举值
        Direction[] allDirections = (Direction[])System.Enum.GetValues(typeof(Direction));
    }
}
```

[截图：Unity Inspector 中枚举字段显示为下拉菜单的效果]

---

## 4.15 继承与组合

### 4.15.1 继承

```csharp
// ====== 基类 ======
public class Character : MonoBehaviour
{
    // protected: 子类可以访问
    protected string characterName;
    protected int health;
    protected int maxHealth;

    // virtual: 允许子类重写（JS 中所有方法默认可重写）
    public virtual void TakeDamage(int amount)
    {
        health -= amount;
        Debug.Log($"{characterName} 受到 {amount} 点伤害，剩余 {health}");

        if (health <= 0)
        {
            Die();
        }
    }

    // virtual 方法
    protected virtual void Die()
    {
        Debug.Log($"{characterName} 已死亡");
        Destroy(gameObject);
    }

    // 非 virtual 方法不能被重写
    public int GetHealthPercentage()
    {
        return (int)((float)health / maxHealth * 100);
    }
}

// ====== 子类 ======
public class Player : Character // C# 用 : 继承，JS 用 extends
{
    private int _armor = 10;

    void Start()
    {
        // 可以直接访问 protected 成员
        characterName = "英雄";
        health = 100;
        maxHealth = 100;
    }

    // override: 重写父类方法（JS 中不需要关键字）
    public override void TakeDamage(int amount)
    {
        // 扣除护甲
        int actualDamage = Mathf.Max(0, amount - _armor);

        // 调用父类方法（JS: super.takeDamage()）
        base.TakeDamage(actualDamage);
    }

    protected override void Die()
    {
        Debug.Log("游戏结束！");
        // 不调用 base.Die() 就不会销毁对象
        // 可以选择性地调用父类实现
    }
}

public class Enemy : Character
{
    public int experienceReward = 50;

    protected override void Die()
    {
        // 先执行自己的逻辑
        Debug.Log($"获得 {experienceReward} 经验值");
        // 再调用父类方法
        base.Die();
    }
}
```

### 4.15.2 组合优于继承（Unity 的设计哲学）

```csharp
// Unity 鼓励组合模式：一个 GameObject 由多个 Component 组合而成
// 这和 React 的组合思想很像

// 健康组件
public class HealthComponent : MonoBehaviour
{
    public int maxHealth = 100;
    public int currentHealth;
    public event System.Action<int> OnHealthChanged;
    public event System.Action OnDeath;

    void Start()
    {
        currentHealth = maxHealth;
    }

    public void TakeDamage(int amount)
    {
        currentHealth = Mathf.Max(0, currentHealth - amount);
        OnHealthChanged?.Invoke(currentHealth);
        if (currentHealth <= 0) OnDeath?.Invoke();
    }

    public void Heal(int amount)
    {
        currentHealth = Mathf.Min(maxHealth, currentHealth + amount);
        OnHealthChanged?.Invoke(currentHealth);
    }
}

// 移动组件
public class MovementComponent : MonoBehaviour
{
    public float moveSpeed = 5f;
    private CharacterController _controller;

    void Start()
    {
        _controller = GetComponent<CharacterController>();
    }

    public void Move(Vector3 direction)
    {
        _controller.Move(direction * moveSpeed * Time.deltaTime);
    }
}

// 玩家：组合多个组件
// 在 Unity Editor 中，给同一个 GameObject 添加以上所有组件
// 不需要继承一个巨大的 Player 基类
public class PlayerController : MonoBehaviour
{
    // 获取同一个 GameObject 上的其他组件
    private HealthComponent _health;
    private MovementComponent _movement;

    void Start()
    {
        _health = GetComponent<HealthComponent>();
        _movement = GetComponent<MovementComponent>();

        // 订阅事件
        _health.OnDeath += HandleDeath;
    }

    void Update()
    {
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        _movement.Move(new Vector3(h, 0, v));
    }

    void HandleDeath()
    {
        Debug.Log("玩家死亡，显示游戏结束画面");
    }
}
```

> **对比 React：** Unity 的组件系统就像 React 的组件组合。React 中你会用 `&lt;App&gt;<Header/><Content/><Footer/></App>` 来组合UI，Unity 中你会给一个 GameObject 添加 `HealthComponent`、`MovementComponent`、`PlayerController` 等多个组件。

---

## 4.16 接口（Interfaces）

```csharp
// C# 接口 vs TS 接口
// TS 接口主要用于类型约束（编译时）
// C# 接口用于定义行为契约（编译时 + 运行时多态）

// TypeScript:
// interface IDamageable {
//     health: number;
//     takeDamage(amount: number): void;
// }

// C#:
public interface IDamageable
{
    // 接口中的属性（自动属性签名）
    int Health { get; set; }

    // 接口中的方法（没有实现体）
    void TakeDamage(int amount);

    // C# 8+ 支持默认实现（类似 TS）
    void LogDamage(int amount)
    {
        UnityEngine.Debug.Log($"受到 {amount} 点伤害");
    }
}

public interface IInteractable
{
    string InteractionPrompt { get; } // 只读属性
    void Interact(GameObject interactor);
}

// 实现多个接口（C# 不支持多继承，但支持多接口）
// JS/TS 的类也是单继承，但 TS 接口可以多实现
public class Crate : MonoBehaviour, IDamageable, IInteractable
{
    // 实现 IDamageable
    public int Health { get; set; } = 50;

    public void TakeDamage(int amount)
    {
        Health -= amount;
        if (Health <= 0)
        {
            Destroy(gameObject);
        }
    }

    // 实现 IInteractable
    public string InteractionPrompt => "按 E 打开箱子";

    public void Interact(GameObject interactor)
    {
        Debug.Log("箱子被打开了！");
    }
}

// 接口的强大用途：通过接口编程
public class CombatSystem : MonoBehaviour
{
    // 射线检测命中后，对任何可受伤害的对象造成伤害
    public void DealDamageAt(Vector3 point, int damage)
    {
        // Physics.OverlapSphere 检测范围内的碰撞体
        Collider[] hits = Physics.OverlapSphere(point, 2f);

        foreach (Collider hit in hits)
        {
            // 尝试获取 IDamageable 接口
            IDamageable damageable = hit.GetComponent<IDamageable>();
            if (damageable != null)
            {
                damageable.TakeDamage(damage);
                // 不管是 Player、Enemy、Crate 还是任何实现了 IDamageable 的对象
                // 都可以接受伤害，这就是接口的威力
            }
        }
    }
}
```

---

## 4.17 泛型（Generics）

```csharp
// C# 泛型 vs TS 泛型 - 语法非常相似！

// TypeScript:
// function identity<T>(value: T): T { return value; }
// interface Repository<T> { getById(id: string): T; save(item: T): void; }

// C# 泛型方法
public class GenericExamples : MonoBehaviour
{
    // 泛型方法（和 TS 语法几乎一样）
    public T Identity<T>(T value)
    {
        return value;
    }

    // 泛型约束（比 TS 的更强大）
    // TS: function process<T extends Damageable>(target: T)
    // C#:
    public void ProcessDamageable<T>(T target) where T : IDamageable
    {
        target.TakeDamage(10);
    }

    // 多重约束
    public void ProcessObject<T>(T obj) where T : MonoBehaviour, IDamageable, IInteractable
    {
        obj.TakeDamage(10);
        obj.Interact(gameObject);
    }

    // new() 约束 - 要求类型有无参构造函数（TS 没有）
    public T CreateInstance<T>() where T : new()
    {
        return new T();
    }

    // struct/class 约束
    public void ValueTypeOnly<T>(T value) where T : struct { }   // 只接受值类型
    public void RefTypeOnly<T>(T value) where T : class { }      // 只接受引用类型
}

// 泛型类（对标 TS 的泛型接口/类）
public class ObjectPool<T> where T : MonoBehaviour
{
    private Queue<T> _pool = new Queue<T>();
    private T _prefab;
    private Transform _parent;

    public ObjectPool(T prefab, int initialSize, Transform parent = null)
    {
        _prefab = prefab;
        _parent = parent;

        // 预创建对象
        for (int i = 0; i < initialSize; i++)
        {
            T obj = UnityEngine.Object.Instantiate(_prefab, _parent);
            obj.gameObject.SetActive(false);
            _pool.Enqueue(obj);
        }
    }

    // 从池中获取对象
    public T Get()
    {
        if (_pool.Count > 0)
        {
            T obj = _pool.Dequeue();
            obj.gameObject.SetActive(true);
            return obj;
        }

        // 池空了，创建新的
        return UnityEngine.Object.Instantiate(_prefab, _parent);
    }

    // 归还到池中
    public void Return(T obj)
    {
        obj.gameObject.SetActive(false);
        _pool.Enqueue(obj);
    }
}

// 使用泛型对象池
public class BulletManager : MonoBehaviour
{
    [SerializeField] private Bullet bulletPrefab;
    private ObjectPool<Bullet> _bulletPool;

    void Start()
    {
        _bulletPool = new ObjectPool<Bullet>(bulletPrefab, 20);
    }

    public void Fire(Vector3 position, Vector3 direction)
    {
        Bullet bullet = _bulletPool.Get();
        bullet.transform.position = position;
        bullet.Initialize(direction, () => _bulletPool.Return(bullet));
    }
}
```

---

## 4.18 字符串操作对比

```csharp
public class StringExamples : MonoBehaviour
{
    void Start()
    {
        // ====== 字符串插值 ======
        string name = "BellLab";
        int score = 100;

        // JS:  `${name} 的分数是 ${score}`
        // C#:  $"{name} 的分数是 {score}"
        string message = $"{name} 的分数是 {score}";

        // 多行字符串
        // JS:  `第一行
        //       第二行`
        // C#:  @"" 或 $@"" 或 C# 11 的 """
        string multiLine = @"第一行
第二行
第三行";

        // 插值 + 多行
        string template = $@"玩家: {name}
分数: {score}
等级: {score / 10}";

        // ====== 常用方法对比 ======
        string text = "  Hello, World!  ";

        // JS: text.trim()              => C#: text.Trim()
        // JS: text.toUpperCase()       => C#: text.ToUpper()
        // JS: text.toLowerCase()       => C#: text.ToLower()
        // JS: text.includes("World")   => C#: text.Contains("World")
        // JS: text.startsWith("Hello") => C#: text.StartsWith("Hello")
        // JS: text.endsWith("!")       => C#: text.EndsWith("!")
        // JS: text.indexOf("World")    => C#: text.IndexOf("World")
        // JS: text.slice(0, 5)         => C#: text.Substring(0, 5)
        // JS: text.replace("World","C#") => C#: text.Replace("World","C#")
        // JS: text.split(",")          => C#: text.Split(',')（注意是char）
        // JS: text.padStart(20)        => C#: text.PadLeft(20)
        // JS: text.repeat(3)           => C#: string.Concat(Enumerable.Repeat(text, 3))
        // JS: arr.join(",")            => C#: string.Join(",", arr)

        // 格式化数字（C# 比 JS 更方便）
        float health = 75.5f;
        string formatted = $"血量: {health:F1}%";     // "血量: 75.5%"（1位小数）
        string padded = $"分数: {score:D5}";           // "分数: 00100"（补零）
        string currency = $"金币: {score:N0}";         // "金币: 100"（千分位）
    }
}
```

---

## 4.19 常见模式：单例模式

```csharp
// 单例在 Unity 中非常常见（游戏管理器、音频管理器等）
// 类似 JS 中的全局 store 或 context

// 通用泛型单例基类（实际项目中推荐使用）
public class Singleton<T> : MonoBehaviour where T : MonoBehaviour
{
    private static T _instance;

    public static T Instance
    {
        get
        {
            if (_instance == null)
            {
                _instance = FindObjectOfType<T>();
                if (_instance == null)
                {
                    Debug.LogError($"场景中没有 {typeof(T).Name} 实例！");
                }
            }
            return _instance;
        }
    }

    protected virtual void Awake()
    {
        if (_instance != null && _instance != this)
        {
            Destroy(gameObject); // 防止重复实例
            return;
        }
        _instance = this as T;
        DontDestroyOnLoad(gameObject); // 切换场景时不销毁
    }
}

// 使用单例
public class GameManager : Singleton<GameManager>
{
    public int playerScore = 0;
    public bool isPaused = false;

    public void AddScore(int points)
    {
        playerScore += points;
        Debug.Log($"当前分数: {playerScore}");
    }

    public void TogglePause()
    {
        isPaused = !isPaused;
        Time.timeScale = isPaused ? 0f : 1f;
    }
}

// 在任何地方访问
public class ScorePickup : MonoBehaviour
{
    public int points = 10;

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            // 直接通过 Instance 访问（类似 JS 的全局 store）
            GameManager.Instance.AddScore(points);
            Destroy(gameObject);
        }
    }
}
```

---

## 4.20 C# 独有特性速览

```csharp
public class CSharpOnlyFeatures : MonoBehaviour
{
    // ====== 1. 元组（Tuple）—— 快速返回多个值 ======
    // JS: return { x: 1, y: 2 }  或  return [1, 2]
    public (float health, float mana) GetPlayerStats()
    {
        return (75.5f, 100f);
    }

    // ====== 2. 模式匹配（Pattern Matching）======
    public string DescribeObject(object obj)
    {
        return obj switch
        {
            int i when i > 100 => $"大数字: {i}",
            int i => $"数字: {i}",
            string s => $"字符串: {s}",
            Vector3 v => $"位置: {v}",
            null => "空值",
            _ => $"未知类型: {obj.GetType()}"  // _ 类似 JS 的 default
        };
    }

    // ====== 3. using 语句（资源管理）======
    // 类似 JS 的 try-finally，但更简洁
    // 目前 JS 也在引入 using 声明（TC39 Stage 3）
    public void LoadFile()
    {
        using (var reader = new System.IO.StreamReader("data.txt"))
        {
            string content = reader.ReadToEnd();
            // reader 在作用域结束时自动释放
        }
    }

    // ====== 4. 运算符重载 ======
    // JS 不支持，C# 可以自定义 +、-、*、/ 等运算符
    // Vector3 就大量使用了运算符重载：
    void OperatorExample()
    {
        Vector3 a = new Vector3(1, 0, 0);
        Vector3 b = new Vector3(0, 1, 0);
        Vector3 c = a + b;           // (1, 1, 0) - 重载了 + 运算符
        Vector3 d = a * 2f;          // (2, 0, 0) - 重载了 * 运算符
    }

    void Start()
    {
        // 使用元组
        var (health, mana) = GetPlayerStats(); // 解构（类似 JS 解构）
        Debug.Log($"血量: {health}, 魔力: {mana}");

        // 模式匹配
        Debug.Log(DescribeObject(42));
        Debug.Log(DescribeObject("hello"));
        Debug.Log(DescribeObject(Vector3.one));
    }
}
```

---

## 4.21 小结：JS/TS 到 C# 的心智模型转换

| 你在 JS/TS 中的习惯 | 在 C# 中应该这样做 |
|---------------------|-------------------|
| `let x = 5` | `int x = 5` 或 `var x = 5` |
| `const X = 5` | `const int X = 5` 或 `readonly` |
| `console.log()` | `Debug.Log()` |
| 模板字符串 `` `${}` `` | `$"{}"` |
| `===` 严格等于 | `==`（C# 只有这一种） |
| `null ?? default` | `null ?? default`（语法相同） |
| `obj?.prop` | `obj?.Prop`（Unity 中谨慎使用） |
| `arr.filter().map()` | `.Where().Select()`（LINQ） |
| `export/import` | `public` + `using namespace` |
| `extends` | `: BaseClass` |
| `implements` | `: IInterface` |
| `Promise / async` | `Task / async`（或协程） |
| `addEventListener` | `event +=` |
| `() => {}` | `() => {}`（lambda 语法相同） |
| `interface { }` | `interface` / `class`（两者都有） |
| `&lt;T&gt;` 泛型 | `&lt;T&gt;` 泛型（语法相同） |

---

## 练习题

### 练习 1：基础类型和方法
创建一个 `MathHelper` 类，实现以下方法：
- `Clamp(int value, int min, int max)` — 将值限制在范围内
- `Remap(float value, float fromMin, float fromMax, float toMin, float toMax)` — 值映射
- `IsEven(int number)` — 判断偶数

### 练习 2：集合操作
创建一个 `Inventory` 类，使用 `Dictionary&lt;string, int&gt;` 管理物品：
- `AddItem(string name, int count)` — 添加物品
- `RemoveItem(string name, int count)` — 移除物品（数量为0时删除键）
- `GetItemCount(string name)` — 获取物品数量
- `GetAllItems()` — 返回所有物品的 `List&lt;string&gt;`（格式："物品名 x 数量"）

### 练习 3：接口和事件
定义 `IDamageable` 和 `IHealable` 接口，创建一个 `Character` 类实现两者。添加 `OnHealthChanged` 事件，在血量变化时触发。

### 练习 4：LINQ 挑战
给定一个 `List<(string name, int score, string team)>` 的玩家列表，使用 LINQ 完成：
- 按分数降序排列
- 找出每个队伍的平均分
- 找出分数最高的玩家
- 筛选出分数高于平均值的玩家

---

## 下一章预告

**第五章：构建你的第一个 3D 场景**

学完 C# 基础后，是时候开始真正的 Unity 开发了！在下一章中，我们将：
- 创建一个全新的 3D 场景
- 添加各种基础 3D 物体（立方体、球体、平面等）
- 学习 Transform 组件进行精准定位
- 为物体添加材质和颜色
- 设置光照和天空盒
- 搭建一个完整的游乐场场景

告别纯文字代码，开始进入可视化的 3D 世界！
