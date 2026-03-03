# 第四章：所有权 —— Rust 最核心的创新

> **本章目标**
>
> - 理解为什么 Rust 需要所有权系统（从 JavaScript 的 GC 说起）
> - 掌握栈（Stack）与堆（Heap）的内存模型
> - 牢记所有权的三大核心规则
> - 深入理解移动语义（Move），对比 JS 的引用传递
> - 区分克隆（Clone）与拷贝（Copy）的使用场景
> - 理解函数调用中的所有权转移
> - 掌握返回值与所有权的关系
> - 通过大量 ASCII 图解建立直觉
> - 识别常见的所有权错误并掌握解决方案

> **预计学习时间：120 - 180 分钟**（这是 Rust 最重要的一章，值得反复阅读）

---

## 4.1 为什么需要所有权？—— 从 JavaScript 的垃圾回收说起

### 4.1.1 JavaScript 的内存管理：自动但有代价

作为 JavaScript/TypeScript 开发者，你可能从来没有认真想过内存管理。这是因为 JS 引擎（如 V8）帮你处理了一切：

```javascript
// JavaScript - 你从不需要关心内存
function createUser() {
    const user = { name: "动动", age: 28 };  // 引擎自动分配内存
    return user;  // 引擎追踪这个对象
}  // 函数结束，但 user 可能还活着（如果有引用指向它）

const u = createUser();
// ... 用完之后
// 垃圾回收器（GC）会在某个时刻自动清理没人引用的对象
```

这就是**垃圾回收（Garbage Collection, GC）**。JS 引擎会定期扫描内存，找出没有任何引用指向的对象，然后释放它们。

**听起来很完美？** 但 GC 有几个严重的问题：

| 问题 | 说明 |
|---|---|
| **性能不可预测** | GC 何时运行、运行多久，你无法控制。在游戏或实时系统中，GC 暂停可能导致卡顿 |
| **内存占用高** | GC 需要等到"确认没人引用"才释放，这意味着内存释放总是滞后的 |
| **无法精确控制** | 你不能决定一个对象何时被释放，只能"希望" GC 能及时清理 |
| **循环引用** | 虽然现代 GC（标记-清除）能处理，但早期的引用计数 GC 会导致内存泄漏 |
| **Stop-the-World** | 某些 GC 算法会暂停整个程序来进行垃圾回收 |

### 4.1.2 C/C++ 的内存管理：手动但危险

在 GC 的另一个极端是 C/C++ 的手动内存管理：

```c
// C 语言 - 手动分配和释放
int* create_array() {
    int* arr = malloc(10 * sizeof(int));  // 手动分配
    return arr;
}

void use_array() {
    int* a = create_array();
    // 用完必须手动释放
    free(a);
    // 但如果你忘了 free... 内存泄漏！
    // 如果你 free 了两次... 双重释放！
    // 如果你 free 后还在用... 悬垂指针！
}
```

手动管理的问题：

```
┌──────────────────────────────────────────────────────┐
│                  C/C++ 内存问题                       │
├──────────────────────────────────────────────────────┤
│  1. 忘记释放 → 内存泄漏（Memory Leak）                 │
│  2. 释放后使用 → 悬垂指针（Dangling Pointer）           │
│  3. 重复释放 → 双重释放（Double Free）                  │
│  4. 缓冲区溢出 → 安全漏洞                              │
│  5. 数据竞争 → 多线程并发 Bug                          │
└──────────────────────────────────────────────────────┘
```

> 🔑 微软曾公开表示，他们产品中约 70% 的安全漏洞都是内存安全问题导致的。

### 4.1.3 Rust 的第三条路：所有权系统

Rust 选择了一条全新的道路 —— **所有权系统（Ownership System）**：

```
┌─────────────────────────────────────────────────────────────┐
│                    内存管理的三种方式                          │
├──────────────┬──────────────────┬───────────────────────────┤
│   JavaScript │     C / C++      │         Rust              │
├──────────────┼──────────────────┼───────────────────────────┤
│   垃圾回收    │    手动管理       │      所有权系统            │
│  （自动）     │   （完全手动）     │    （编译时检查）          │
├──────────────┼──────────────────┼───────────────────────────┤
│  + 简单安全   │  + 性能最优       │  + 安全                   │
│  - 性能开销   │  + 精确控制       │  + 零成本抽象              │
│  - 不可预测   │  - 容易出错       │  + 编译时保证              │
│  - 占用更多   │  - 安全漏洞       │  - 学习曲线陡             │
│    内存       │  - 心智负担       │  - 需要换思维             │
└──────────────┴──────────────────┴───────────────────────────┘
```

**核心思想**：Rust 在**编译时**通过所有权规则来管理内存，不需要 GC，也不需要手动 `free`。如果你的代码违反了所有权规则，程序**根本无法编译**。

这就像有一个极其严格的代码审查员，在你的代码运行之前就检查出所有的内存问题。

---

## 4.2 栈（Stack）与堆（Heap）—— 内存模型基础

要理解所有权，你首先需要理解计算机是如何存储数据的。

### 4.2.1 栈（Stack）—— 快速但有限

栈是一种**后进先出（LIFO）**的数据结构，用于存储**已知大小**的数据：

```
    ┌─────────────────────┐
    │    栈（Stack）        │
    │                     │
    │  ┌───────────────┐  │  ← 栈顶（最后压入的）
    │  │  z = true     │  │
    │  ├───────────────┤  │
    │  │  y = 3.14     │  │
    │  ├───────────────┤  │
    │  │  x = 42       │  │
    │  ├───────────────┤  │  ← 栈底（最先压入的）
    │  │  ...          │  │
    │  └───────────────┘  │
    │                     │
    │  特点：              │
    │  ✓ 分配极快（移指针） │
    │  ✓ 自动清理          │
    │  ✓ 数据大小固定      │
    │  ✗ 空间有限          │
    └─────────────────────┘
```

**在 Rust 中存储在栈上的类型**：

```rust
fn stack_examples() {
    let x: i32 = 42;         // 整数 → 栈上（4 字节）
    let y: f64 = 3.14;       // 浮点数 → 栈上（8 字节）
    let z: bool = true;      // 布尔值 → 栈上（1 字节）
    let c: char = '动';      // 字符 → 栈上（4 字节）
    let t: (i32, f64) = (1, 2.0); // 元组 → 栈上
    let a: [i32; 3] = [1, 2, 3];  // 固定数组 → 栈上（12 字节）
}
// 函数结束，所有栈上数据自动清理（弹出栈帧）
```

> 对比 JS：在 JS 中，基本类型（number、boolean、string 字面量）也存储在栈上。

### 4.2.2 堆（Heap）—— 灵活但较慢

堆用于存储**大小不确定**或**需要在多处共享**的数据：

```
    ┌─────────────────────┐     ┌──────────────────────────────┐
    │    栈（Stack）        │     │         堆（Heap）            │
    │                     │     │                              │
    │  ┌───────────────┐  │     │  ┌──────────────────────┐   │
    │  │ s1: ptr ──────────────────→ "hello, world"       │   │
    │  │    len: 12    │  │     │  │  容量: 12             │   │
    │  │    cap: 12    │  │     │  └──────────────────────┘   │
    │  ├───────────────┤  │     │                              │
    │  │ v1: ptr ──────────────────→ [1, 2, 3, 4, 5]      │   │
    │  │    len: 5     │  │     │  │  容量: 8（预分配）      │   │
    │  │    cap: 8     │  │     │  └──────────────────────┘   │
    │  └───────────────┘  │     │                              │
    │                     │     │  特点：                       │
    │  栈上存的是"胖指针"   │     │  ✓ 大小可变                  │
    │  包含：指针+长度+容量 │     │  ✓ 空间大                    │
    │                     │     │  ✗ 分配较慢（需找空闲块）      │
    │                     │     │  ✗ 需要管理生命周期           │
    └─────────────────────┘     └──────────────────────────────┘
```

**在 Rust 中存储在堆上的类型**：

```rust
fn heap_examples() {
    let s = String::from("hello");  // String → 堆上
    let v = vec![1, 2, 3];          // Vec → 堆上
    let b = Box::new(42);           // Box → 强制堆上分配
}
```

### 4.2.3 对比 JavaScript 的内存模型

```
┌──────────────────────────────────────────────────────────────┐
│                  JavaScript vs Rust 内存模型                  │
├────────────────────────────┬─────────────────────────────────┤
│        JavaScript          │            Rust                 │
├────────────────────────────┼─────────────────────────────────┤
│ 基本类型 → 栈               │ 实现 Copy 的类型 → 栈           │
│ (number, boolean, null)    │ (i32, f64, bool, char, 元组等)  │
├────────────────────────────┼─────────────────────────────────┤
│ 对象/数组 → 堆              │ String, Vec, Box 等 → 堆        │
│ 变量保存引用（地址）         │ 变量拥有所有权                   │
├────────────────────────────┼─────────────────────────────────┤
│ GC 自动清理堆数据           │ 离开作用域时自动 drop            │
│ 不可预测                    │ 确定性析构                       │
├────────────────────────────┼─────────────────────────────────┤
│ 多个变量可指向同一对象       │ 同一时刻只有一个所有者           │
│ const obj = anotherObj;    │ let s2 = s1; // s1 被移动！     │
└────────────────────────────┴─────────────────────────────────┘
```

### 4.2.4 为什么栈比堆快？

```
分配速度对比：

栈分配：
  ┌─────────┐
  │ 栈指针   │ ──→ 直接移动指针即可，O(1)
  └─────────┘     无需搜索，无需协调

堆分配：
  ┌─────────┐     ┌─────────────────────────┐
  │ 分配器   │ ──→ │ 1. 搜索足够大的空闲块    │
  └─────────┘     │ 2. 标记为已使用          │
                  │ 3. 返回指针              │
                  │ 4. 维护空闲列表          │
                  └─────────────────────────┘
                  过程复杂，可能产生碎片
```

---

## 4.3 所有权三大规则

Rust 的所有权系统建立在三条简单而强大的规则之上。**务必牢记！**

```
╔═══════════════════════════════════════════════════════════╗
║                    所有权三大规则                          ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  规则 1：每个值都有一个「所有者」（owner）变量              ║
║                                                           ║
║  规则 2：同一时刻，一个值只能有一个所有者                   ║
║                                                           ║
║  规则 3：当所有者离开作用域（scope），值会被丢弃（drop）    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

### 4.3.1 规则 1：每个值都有一个所有者

```rust
fn main() {
    let s = String::from("hello"); // s 是 "hello" 的所有者
    let x = 42;                     // x 是 42 的所有者
    let v = vec![1, 2, 3];          // v 是 vec![1,2,3] 的所有者
}
```

**对比 JS**：在 JS 中，我们说变量"持有一个引用"指向对象。在 Rust 中，变量"拥有"那个值 —— 不是引用，是实实在在的拥有。

### 4.3.2 规则 2：同一时刻只有一个所有者

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // 所有权从 s1 转移到 s2

    // println!("{}", s1); // ❌ 编译错误！s1 已经不再拥有这个值
    println!("{}", s2);    // ✅ s2 是新的所有者
}
```

这在 JS 中完全不同：

```javascript
// JavaScript - 两个变量可以指向同一个对象
const s1 = { text: "hello" };
const s2 = s1; // s2 指向同一个对象
console.log(s1.text); // ✅ 完全可以！
console.log(s2.text); // ✅ 也可以！
// 两个变量共享同一份数据
```

### 4.3.3 规则 3：离开作用域时自动丢弃

```rust
fn main() {
    {
        let s = String::from("hello"); // s 进入作用域
        // 在这里使用 s
        println!("{}", s);
    } // ← s 离开作用域，Rust 自动调用 drop 函数释放内存

    // println!("{}", s); // ❌ 错误：s 已经不存在了
}
```

**关键理解**：Rust 在 `}` 处自动插入 `drop()` 调用。这就是为什么 Rust 不需要 GC —— 内存释放的时机是**确定的**，由编译器根据作用域自动决定。

```
作用域与 drop 的时机：

fn example() {          ←── 函数作用域开始
    let a = String::from("a");  ←── a 的所有权开始
    {                   ←── 内部作用域开始
        let b = String::from("b");  ←── b 的所有权开始
        // a 和 b 都可用
    }                   ←── b 被 drop（释放）
    // 只有 a 可用
}                       ←── a 被 drop（释放）
```

---

## 4.4 移动语义（Move）—— Rust 最让新手困惑的概念

### 4.4.1 什么是移动？

在 Rust 中，当你把一个堆上的值赋值给另一个变量时，**所有权会转移**，原来的变量就不能再使用了。这叫做**移动（Move）**。

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // ← 发生了「移动」

    // s1 现在是无效的！
}
```

让我们用图来理解这个过程：

```
赋值前 (let s1 = String::from("hello"))：

    栈                          堆
    ┌───────────────┐          ┌───────────────┐
    │ s1             │          │               │
    │  ptr: ─────────────────→ │ h e l l o     │
    │  len: 5        │          │               │
    │  cap: 5        │          └───────────────┘
    └───────────────┘


赋值后 (let s2 = s1)：

    栈                          堆
    ┌───────────────┐
    │ s1（已无效！）  │
    │  ptr: ×××××    │          ┌───────────────┐
    │  len: ×××××    │          │               │
    │  cap: ×××××    │   ┌────→ │ h e l l o     │
    ├───────────────┤   │      │               │
    │ s2             │   │      └───────────────┘
    │  ptr: ─────────────┘
    │  len: 5        │
    │  cap: 5        │
    └───────────────┘

    注意：堆上的数据没有被复制！
    只是栈上的指针/长度/容量被复制到了 s2，
    然后 s1 被标记为无效。
```

### 4.4.2 为什么要移动而不是复制？

如果 Rust 简单地复制指针（像 JS 那样），会出什么问题？

```
如果允许两个变量指向同一块堆内存（假设）：

    栈                          堆
    ┌───────────────┐
    │ s1             │          ┌───────────────┐
    │  ptr: ───────────────┬──→ │ h e l l o     │
    ├───────────────┤      │    └───────────────┘
    │ s2             │      │
    │  ptr: ────────────────┘
    └───────────────┘

    问题来了！当 s1 和 s2 都离开作用域时：
    1. s2 先 drop → 释放堆内存 ✓
    2. s1 再 drop → 再次释放同一块内存 → 💥 双重释放！

    双重释放（Double Free）会导致：
    - 内存损坏
    - 安全漏洞
    - 程序崩溃
```

这就是为什么 Rust 选择了**移动语义** —— 同一时刻只有一个所有者，就不会有双重释放的问题。

### 4.4.3 对比 JavaScript 的引用传递

```javascript
// JavaScript：多个变量可以引用同一对象
const obj1 = { name: "hello" };
const obj2 = obj1;          // obj2 指向同一个对象
obj2.name = "world";
console.log(obj1.name);     // "world" — obj1 也变了！

// JS 通过 GC 解决问题：
// 只要 obj1 或 obj2 中任何一个还在引用这个对象，
// GC 就不会释放它。
// 只有当所有引用都消失后，GC 才回收。
```

```rust
// Rust：所有权转移，不存在共享
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // s1 的所有权移动到 s2

    // 不可能通过 s1 修改数据，因为 s1 已经无效
    // 也不可能出现"两个变量指向同一数据"的情况
}
```

### 4.4.4 移动的触发场景

移动不仅发生在 `let` 赋值，还会在这些场景触发：

```rust
fn main() {
    let s = String::from("hello");

    // 场景 1：赋值
    let s2 = s; // s 被移动

    // 场景 2：函数参数传递
    let s3 = String::from("world");
    takes_ownership(s3); // s3 被移动到函数内部
    // println!("{}", s3); // ❌ s3 已无效

    // 场景 3：从函数返回值
    let s4 = gives_ownership(); // 所有权从函数内部转移出来

    // 场景 4：放入集合
    let s5 = String::from("rust");
    let mut v = Vec::new();
    v.push(s5); // s5 被移动到 Vec 中
    // println!("{}", s5); // ❌ s5 已无效
}

fn takes_ownership(s: String) {
    println!("{}", s);
} // s 在这里被 drop

fn gives_ownership() -> String {
    let s = String::from("new string");
    s // 所有权转移给调用者
}
```

### 4.4.5 哪些类型会移动？

```
┌─────────────────────────────────────────────────────────┐
│                    类型与移动/拷贝                        │
├─────────────────────────┬───────────────────────────────┤
│    会移动的类型           │    会拷贝的类型（Copy trait）  │
├─────────────────────────┼───────────────────────────────┤
│  String                  │  i8, i16, i32, i64, i128     │
│  Vec<T>                  │  u8, u16, u32, u64, u128     │
│  HashMap<K, V>           │  f32, f64                    │
│  Box<T>                  │  bool                        │
│  自定义 struct（默认）    │  char                        │
│  PathBuf                 │  &T（引用本身是 Copy 的）     │
│  所有拥有堆数据的类型     │  元组（如果元素都是 Copy）    │
│                          │  数组（如果元素是 Copy）      │
└─────────────────────────┴───────────────────────────────┘

简单规则：
- 固定大小、存在栈上、复制成本低 → Copy（自动拷贝）
- 拥有堆数据、大小不定、复制成本高 → Move（转移所有权）
```

---

## 4.5 克隆（Clone）与拷贝（Copy）

### 4.5.1 Copy —— 自动的按位复制

实现了 `Copy` trait 的类型，在赋值时会自动进行**按位复制**，原变量仍然有效：

```rust
fn main() {
    let x = 42;     // i32 实现了 Copy
    let y = x;       // x 被复制（不是移动），x 仍然有效

    println!("x = {}, y = {}", x, y); // ✅ 两个都能用

    let a = true;    // bool 实现了 Copy
    let b = a;       // a 被复制
    println!("a = {}, b = {}", a, b); // ✅

    let t1 = (1, 2.0, true); // 元组中所有元素都是 Copy → 元组也是 Copy
    let t2 = t1;              // t1 被复制
    println!("{:?}", t1);     // ✅ t1 仍有效
}
```

**为什么整数可以 Copy 而 String 不行？**

```
i32 的复制：
    栈
    ┌───────────┐    复制    ┌───────────┐
    │ x: 42     │  ───────→  │ y: 42     │
    └───────────┘            └───────────┘
    只需复制 4 个字节，非常快！

String 如果复制：
    栈                          堆
    ┌───────────────┐          ┌──────────────┐
    │ s1: ptr ──────────────→  │ 很长的字符串... │  可能有 1MB！
    │     len: 1000000│         │ ...           │
    │     cap: 1000000│         └──────────────┘
    └───────────────┘

    如果自动复制堆数据... 每次赋值都可能复制 1MB！
    这就是为什么 String 不实现 Copy —— 复制成本太高。
```

### 4.5.2 Clone —— 显式的深度复制

当你确实需要复制堆上的数据时，可以调用 `.clone()`：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone(); // ← 显式克隆：深度复制堆上的数据

    // s1 和 s2 各自拥有独立的堆数据
    println!("s1 = {}, s2 = {}", s1, s2); // ✅ 两个都有效

    let v1 = vec![1, 2, 3];
    let v2 = v1.clone(); // 深度复制整个 Vec
    println!("v1 = {:?}, v2 = {:?}", v1, v2); // ✅
}
```

**克隆后的内存布局**：

```
clone 之后：

    栈                          堆
    ┌───────────────┐          ┌───────────────┐
    │ s1             │          │               │
    │  ptr: ─────────────────→ │ h e l l o     │  ← s1 拥有的数据
    │  len: 5        │          └───────────────┘
    │  cap: 5        │
    ├───────────────┤          ┌───────────────┐
    │ s2             │          │               │
    │  ptr: ─────────────────→ │ h e l l o     │  ← s2 拥有的独立副本
    │  len: 5        │          └───────────────┘
    │  cap: 5        │
    └───────────────┘

    两份独立的堆数据！修改一个不影响另一个。
```

### 4.5.3 Clone 的性能考量

```rust
fn main() {
    // ⚠️ 谨慎使用 clone —— 它可能很昂贵
    let big_vec: Vec<i32> = (0..1_000_000).collect();
    let big_vec_copy = big_vec.clone(); // 复制 100 万个 i32 = 约 4MB

    // 更好的做法通常是使用引用（下一章的内容）
    // let big_vec_ref = &big_vec; // 只是借用，零成本
}
```

> 💡 **小贴士**：新手常常到处写 `.clone()` 来让编译器不报错。这能用，但不够好。学完下一章的「借用」之后，你会发现很多 `clone` 其实可以用引用替代。

### 4.5.4 为自定义类型实现 Copy 和 Clone

```rust
// 方式 1：使用 derive 宏自动实现
#[derive(Clone, Copy)] // 自动生成 Clone 和 Copy 实现
struct Point {
    x: f64,
    y: f64,
}

// 方式 2：只实现 Clone（不实现 Copy）
#[derive(Clone)]
struct Player {
    name: String,  // String 不是 Copy 的，所以 Player 也不能 Copy
    health: i32,
}

fn main() {
    // Point 是 Copy 的，赋值时自动复制
    let p1 = Point { x: 1.0, y: 2.0 };
    let p2 = p1; // 自动 Copy
    println!("p1: ({}, {})", p1.x, p1.y); // ✅ p1 仍有效

    // Player 不是 Copy 的，赋值时移动
    let player1 = Player {
        name: String::from("动动"),
        health: 100,
    };
    let player2 = player1; // 移动！
    // println!("{}", player1.name); // ❌ player1 已无效

    // 但可以显式 clone
    let player3 = Player {
        name: String::from("小羊"),
        health: 100,
    };
    let player4 = player3.clone(); // 显式克隆
    println!("{}", player3.name); // ✅ player3 仍有效
}
```

> 🔑 **重要规则**：要实现 `Copy`，类型的所有字段都必须是 `Copy` 的。如果任何字段不是 `Copy`（如 `String`），整个类型就不能实现 `Copy`。

---

## 4.6 函数与所有权转移

### 4.6.1 传递参数 = 转移所有权

当你把一个值传递给函数时，所有权会转移到函数参数，就像赋值一样：

```rust
fn main() {
    let s = String::from("hello");  // s 进入作用域

    takes_ownership(s);             // s 的所有权移动到函数里
                                    // s 从此不再有效

    // println!("{}", s);           // ❌ 编译错误：value borrowed after move

    let x = 5;                      // x 进入作用域

    makes_copy(x);                  // x 是 i32（Copy 类型），所以是复制
                                    // x 之后仍然有效

    println!("x = {}", x);         // ✅ x 仍然可用
}

fn takes_ownership(some_string: String) {
    // some_string 现在是这个 String 的所有者
    println!("{}", some_string);
}   // some_string 离开作用域，drop 被调用，内存被释放

fn makes_copy(some_integer: i32) {
    // some_integer 是 x 的一个副本
    println!("{}", some_integer);
}   // some_integer 离开作用域，但 i32 是 Copy 的，没什么特别的
```

**内存变化图解**：

```
调用 takes_ownership(s) 时：

  调用前：
    main 的栈帧              堆
    ┌──────────────┐       ┌──────────────┐
    │ s: ptr ──────────────→ "hello"      │
    │    len: 5    │       └──────────────┘
    │    cap: 5    │
    └──────────────┘

  调用时（所有权转移）：
    main 的栈帧              堆
    ┌──────────────┐
    │ s: [已无效]   │       ┌──────────────┐
    └──────────────┘   ┌──→ │ "hello"      │
                       │   └──────────────┘
    takes_ownership 的栈帧
    ┌──────────────────┐│
    │ some_string: ptr ─┘
    │            len: 5 │
    │            cap: 5 │
    └──────────────────┘

  函数返回后：
    takes_ownership 的栈帧被弹出
    some_string 被 drop → 堆上的 "hello" 被释放
    回到 main，s 已经无效，一切安全
```

### 4.6.2 对比 JavaScript 的函数传参

```javascript
// JavaScript：传递引用，原始对象不受影响（除非被修改）
function processUser(user) {
    console.log(user.name);
    // user 和外面的 myUser 指向同一个对象
}

const myUser = { name: "动动" };
processUser(myUser);
console.log(myUser.name); // ✅ 还能用，因为 JS 只是传了引用

// 但 JS 有个坑：
function modifyUser(user) {
    user.name = "被修改了";  // 这会影响原始对象！
}
modifyUser(myUser);
console.log(myUser.name); // "被修改了" —— 原始对象被改了！
```

```rust
// Rust：传递所有权，调用者失去访问权
fn process_user(user: String) {
    println!("{}", user);
    // user 在这里被使用
}   // user 被 drop

fn main() {
    let my_user = String::from("动动");
    process_user(my_user);
    // println!("{}", my_user); // ❌ 编译错误

    // Rust 的方式更安全：
    // 你不可能"意外"修改别人的数据
    // 因为你根本拿不到它了！
}
```

---

## 4.7 返回值与所有权

### 4.7.1 函数可以通过返回值转移所有权

```rust
fn main() {
    let s1 = gives_ownership();         // 所有权从函数转移到 s1
    println!("s1 = {}", s1);            // ✅

    let s2 = String::from("hello");     // s2 进入作用域
    let s3 = takes_and_gives_back(s2);  // s2 被移动到函数，函数再移动出来给 s3
    // println!("{}", s2);              // ❌ s2 已被移动
    println!("s3 = {}", s3);            // ✅ s3 拥有返回的值
}

fn gives_ownership() -> String {
    let some_string = String::from("yours");  // some_string 进入作用域
    some_string                                // 所有权转移给调用者
}

fn takes_and_gives_back(a_string: String) -> String {
    // a_string 进入作用域
    a_string  // 所有权转移给调用者
}
```

### 4.7.2 用元组返回多个值

如果你想让函数使用值之后还能继续使用，一个笨办法是让函数返回它：

```rust
fn main() {
    let s1 = String::from("hello");

    // 把 s1 传进去，然后连同结果一起返回
    let (s2, len) = calculate_length(s1);

    println!("'{}' 的长度是 {}", s2, len);
    // s2 就是原来的 s1，我们又拿回了所有权
}

fn calculate_length(s: String) -> (String, usize) {
    let length = s.len();
    (s, length) // 把 String 和长度一起返回
}
```

> 💡 这种"传进去再传回来"的方式很笨拙。别担心，下一章的「借用（Borrowing）」会优雅地解决这个问题 —— 你可以**借用**一个值而不取得它的所有权。

### 4.7.3 所有权转移的完整流程图

```
┌────────────────────────────────────────────────────────────────┐
│                    所有权生命周期总览                            │
│                                                                │
│   let s = String::from("hello");                               │
│        │                                                       │
│        ▼                                                       │
│   ┌─────────┐                                                  │
│   │  创建    │ ── 值诞生，s 是所有者                             │
│   └────┬────┘                                                  │
│        │                                                       │
│        ▼                                                       │
│   ┌─────────┐    移动给另一个变量？                              │
│   │  使用    │ ──────────────────────┐                          │
│   └────┬────┘                       │                          │
│        │                            ▼                          │
│        │                    ┌──────────────┐                   │
│        │                    │ let s2 = s;  │                   │
│        │                    │ s 失效       │                   │
│        │                    │ s2 成为所有者 │                   │
│        │                    └──────┬───────┘                   │
│        │                           │                           │
│        ▼                           ▼                           │
│   ┌─────────┐              ┌──────────────┐                   │
│   │  } drop  │              │   } drop     │                   │
│   └─────────┘              └──────────────┘                   │
│                                                                │
│   或者：传给函数 → 函数参数成为所有者                             │
│   或者：函数返回 → 调用者接收所有权                              │
│   或者：clone() → 创建独立副本                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 4.8 深入理解：String 与 &str

在继续之前，让我们澄清一个容易混淆的概念 —— `String` 和 `&str` 的区别：

### 4.8.1 两种字符串类型

```rust
fn main() {
    // String - 拥有所有权的字符串，存储在堆上，可变
    let mut owned: String = String::from("hello");
    owned.push_str(", world!"); // ✅ 可以修改

    // &str - 字符串切片（引用），不拥有所有权，不可变
    let slice: &str = "hello";  // 字符串字面量，存储在程序二进制中
    let slice2: &str = &owned;  // 对 String 的引用/切片
}
```

```
String vs &str 的内存布局：

String（拥有所有权）：
    栈                          堆
    ┌───────────────┐          ┌─────────────────┐
    │ ptr: ─────────────────→  │ h e l l o       │
    │ len: 5        │          └─────────────────┘
    │ cap: 8        │  ← 可能预分配了更多空间
    └───────────────┘

&str（借用/切片）：
    栈                          指向的数据（可能在堆上、栈上或静态区）
    ┌───────────────┐          ┌─────────────────┐
    │ ptr: ─────────────────→  │ h e l l o       │
    │ len: 5        │          └─────────────────┘
    └───────────────┘
    没有 cap！因为 &str 是只读的，不需要知道容量。
```

### 4.8.2 对比 TypeScript

```typescript
// TypeScript 中字符串是不可变的基本类型
const s1: string = "hello";
const s2: string = s1;  // 复制值（或共享不可变引用，由引擎决定）
// TypeScript 里没有"拥有所有权的字符串"和"借用的字符串"的区别
```

```rust
// Rust 区分得很清楚
fn takes_string(s: String) {
    // 获取所有权，调用后原变量失效
}

fn takes_str(s: &str) {
    // 只是借用，调用后原变量仍有效
}

fn main() {
    let owned = String::from("hello");
    takes_str(&owned);           // 借用，owned 仍有效
    println!("{}", owned);       // ✅

    takes_string(owned);         // 转移所有权，owned 失效
    // println!("{}", owned);    // ❌
}
```

---

## 4.9 常见错误与解决方案

### 4.9.1 错误：使用已移动的值

```rust
// ❌ 常见错误
fn main() {
    let name = String::from("动动");
    let greeting = format!("你好，{}！", name); // name 没有被移动（format! 使用引用）

    let names = vec![String::from("动动"), String::from("小羊")];
    // for 循环会移动 Vec
    for n in names {
        println!("{}", n);
    }
    // println!("{:?}", names); // ❌ names 已被移动

    // ✅ 解决方案 1：使用引用迭代
    let names2 = vec![String::from("动动"), String::from("小羊")];
    for n in &names2 {  // 借用，不移动
        println!("{}", n);
    }
    println!("{:?}", names2); // ✅ names2 仍有效

    // ✅ 解决方案 2：clone
    let names3 = vec![String::from("动动")];
    let names4 = names3.clone();
    // 两个都能用
}
```

### 4.9.2 错误：在移动后使用变量

```rust
// ❌ 常见错误
fn print_and_return(s: String) -> String {
    println!("{}", s);
    s
}

fn main() {
    let s = String::from("hello");
    print_and_return(s);
    // println!("{}", s); // ❌ s 已被移动

    // ✅ 解决方案：接收返回值
    let s = String::from("hello");
    let s = print_and_return(s); // 重新绑定
    println!("{}", s); // ✅

    // ✅ 更好的方案：使用引用（下一章）
    // fn print_ref(s: &String) { println!("{}", s); }
}
```

### 4.9.3 错误：部分移动（Partial Move）

```rust
// ❌ 常见错误
struct User {
    name: String,
    age: u32,
}

fn main() {
    let user = User {
        name: String::from("动动"),
        age: 28,
    };

    let name = user.name; // name 字段被移动出去
    // println!("{}", user.name); // ❌ name 已被移动
    println!("{}", user.age);     // ✅ age 是 Copy 的，没被移动
    // println!("{:?}", user);    // ❌ user 被部分移动，不能整体使用

    // ✅ 解决方案：clone 或使用引用
    let user2 = User {
        name: String::from("小羊"),
        age: 25,
    };
    let name = user2.name.clone(); // 克隆，不移动
    println!("{}", user2.name);     // ✅
}
```

### 4.9.4 错误：在匹配中移动

```rust
fn main() {
    let opt: Option<String> = Some(String::from("hello"));

    // ❌ 这会移动 opt 内部的 String
    // match opt {
    //     Some(s) => println!("{}", s), // s 获取了 String 的所有权
    //     None => println!("nothing"),
    // }
    // println!("{:?}", opt); // ❌ opt 已被移动

    // ✅ 使用 ref 或 as_ref()
    let opt2: Option<String> = Some(String::from("hello"));
    match opt2.as_ref() {  // as_ref() 将 Option<String> 转为 Option<&String>
        Some(s) => println!("{}", s), // s 是 &String，只是借用
        None => println!("nothing"),
    }
    println!("{:?}", opt2); // ✅ opt2 仍有效

    // 或者使用 if let 与引用
    if let Some(ref s) = opt2 {
        println!("{}", s);
    }
}
```

---

## 4.10 所有权与作用域的高级用法

### 4.10.1 嵌套作用域

```rust
fn main() {
    let mut s = String::from("hello");

    {
        // 在内部作用域中"借用"（后面会详细讲）
        let r = &s; // 借用 s
        println!("{}", r);
    } // r 离开作用域，借用结束

    // 现在可以修改 s 了
    s.push_str(", world!");
    println!("{}", s);
}
```

### 4.10.2 用 scope 精确控制生命周期

```rust
fn main() {
    let mut data = vec![1, 2, 3, 4, 5];

    // 用作用域限制临时变量的生命周期
    let sum = {
        let slice = &data[1..4]; // 借用 data 的一部分
        slice.iter().sum::<i32>() // 计算 sum
    }; // slice 在这里释放

    // 现在可以可变借用 data
    data.push(6);
    println!("sum = {}, data = {:?}", sum, data);
}
```

---

## 4.11 实战思维转变：从 JS 到 Rust

### 4.11.1 JS 思维 vs Rust 思维

```
┌────────────────────────────────────────────────────────────────┐
│                JS 思维 → Rust 思维 转变指南                     │
├────────────────────────────┬───────────────────────────────────┤
│      JS 的做法              │     Rust 的做法                   │
├────────────────────────────┼───────────────────────────────────┤
│ const a = someObj;          │ let a = some_obj.clone();        │
│ // a 和 someObj 共享对象    │ // 或者使用引用：let a = &some_obj │
├────────────────────────────┼───────────────────────────────────┤
│ function f(obj) {           │ fn f(obj: &MyStruct) {           │
│   // 读取 obj               │   // 借用 obj，不取所有权         │
│ }                           │ }                                │
├────────────────────────────┼───────────────────────────────────┤
│ array.push(item);           │ vec.push(item);                  │
│ console.log(item); // ✅    │ // println!("{}", item); // ❌    │
│                             │ // item 已被移动到 vec 中         │
├────────────────────────────┼───────────────────────────────────┤
│ array.map(x => f(x));      │ vec.iter().map(|x| f(x));        │
│ // array 不受影响           │ // 使用 iter() 借用，vec 不受影响 │
├────────────────────────────┼───────────────────────────────────┤
│ return obj;                 │ return obj; // 所有权转移给调用者 │
│ // 返回引用                 │ // 不是引用，是真正的移动！       │
└────────────────────────────┴───────────────────────────────────┘
```

### 4.11.2 决策树：什么时候用什么

```
                    需要使用一个值
                        │
                ┌───────┴────────┐
                │                │
            需要修改？        只需读取？
                │                │
                ▼                ▼
          需要所有权？      使用 &T（不可变引用）
                │
        ┌───────┴────────┐
        │                │
       是               否
        │                │
        ▼                ▼
    直接传值          使用 &mut T
    (Move 或          （可变引用）
     Clone)
```

---

## 4.12 练习题

### 练习 1：预测编译结果

判断以下代码能否编译，如果不能，解释原因并修复：

```rust
// 练习 1a
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;
    println!("{}", s1);
}

// 练习 1b
fn main() {
    let x = 42;
    let y = x;
    println!("{}", x);
}

// 练习 1c
fn main() {
    let s = String::from("hello");
    let len = calculate_length(s);
    println!("'{}' 的长度是 {}", s, len);
}
fn calculate_length(s: String) -> usize {
    s.len()
}
```

&lt;details&gt;
&lt;summary&gt;📝 答案&lt;/summary&gt;

**1a**：❌ 编译失败。`s1` 被移动到 `s2`，不能再使用 `s1`。
修复：`let s2 = s1.clone();` 或改为 `println!("{}", s2);`

**1b**：✅ 编译成功。`i32` 实现了 `Copy`，`y = x` 是复制，不是移动。

**1c**：❌ 编译失败。`s` 被移动到 `calculate_length` 函数中，之后 `s` 不能使用。
修复方案 1：让函数返回 String：
```rust
fn calculate_length(s: String) -> (String, usize) {
    let len = s.len();
    (s, len)
}
```
修复方案 2（推荐）：使用引用：
```rust
fn calculate_length(s: &String) -> usize {
    s.len()
}
// 调用时：let len = calculate_length(&s);
```

&lt;/details&gt;

### 练习 2：所有权追踪

追踪以下代码中每个变量的所有权状态：

```rust
fn main() {
    let a = String::from("a");  // Q1: a 的状态？
    let b = a;                   // Q2: a 和 b 的状态？
    let c = b.clone();           // Q3: b 和 c 的状态？

    let d = process(c);          // Q4: c 和 d 的状态？
    println!("{}, {}", b, d);    // Q5: 能编译吗？
}

fn process(s: String) -> String {
    let result = format!("processed: {}", s);
    result
}
```

&lt;details&gt;
&lt;summary&gt;📝 答案&lt;/summary&gt;

- Q1: `a` 有效，拥有 `"a"` 的所有权
- Q2: `a` 已无效（被移动），`b` 有效，拥有 `"a"` 的所有权
- Q3: `b` 仍有效（clone 不移动原始值），`c` 也有效，拥有 `"a"` 的独立副本
- Q4: `c` 已无效（被移动到 process 函数），`d` 有效，拥有 `"processed: a"` 的所有权
- Q5: ✅ 能编译。`b` 和 `d` 都有效

&lt;/details&gt;

### 练习 3：修复编译错误

修复以下代码，使其能够编译并输出所有用户信息：

```rust
struct User {
    name: String,
    email: String,
}

fn print_user(user: User) {
    println!("姓名: {}, 邮箱: {}", user.name, user.email);
}

fn main() {
    let user = User {
        name: String::from("动动"),
        email: String::from("dong@example.com"),
    };

    print_user(user);
    print_user(user); // ❌ user 已经被移动了！
}
```

&lt;details&gt;
&lt;summary&gt;📝 答案&lt;/summary&gt;

方案 1：使用引用（推荐）：
```rust
fn print_user(user: &User) {
    println!("姓名: {}, 邮箱: {}", user.name, user.email);
}

fn main() {
    let user = User { ... };
    print_user(&user);
    print_user(&user); // ✅ 只是借用
}
```

方案 2：Clone：
```rust
#[derive(Clone)]
struct User { ... }

fn main() {
    let user = User { ... };
    print_user(user.clone());
    print_user(user); // ✅ 之前传的是 clone
}
```

方案 3：让函数返回所有权（不推荐，但技术上可行）：
```rust
fn print_user(user: User) -> User {
    println!("...");
    user
}

fn main() {
    let user = User { ... };
    let user = print_user(user);
    print_user(user);
}
```

&lt;/details&gt;

### 练习 4：实现一个简单的 todo 管理器

```rust
// 补全以下代码，使其能正确运行
// 提示：注意所有权的转移

struct TodoItem {
    title: String,
    completed: bool,
}

struct TodoList {
    items: Vec<TodoItem>,
}

impl TodoList {
    fn new() -> TodoList {
        // TODO: 实现
        todo!()
    }

    fn add(&mut self, title: String) {
        // TODO: 创建 TodoItem 并加入列表
        todo!()
    }

    fn print_all(&self) {
        // TODO: 打印所有待办事项
        // 注意：不能移动 items！
        todo!()
    }
}

fn main() {
    let mut list = TodoList::new();
    list.add(String::from("学习 Rust 所有权"));
    list.add(String::from("完成练习题"));
    list.add(String::from("阅读下一章"));
    list.print_all();
    list.print_all(); // 确保能调用两次！
}
```

&lt;details&gt;
&lt;summary&gt;📝 答案&lt;/summary&gt;

```rust
impl TodoList {
    fn new() -> TodoList {
        TodoList { items: Vec::new() }
    }

    fn add(&mut self, title: String) {
        // title 的所有权被移动到 TodoItem 中
        self.items.push(TodoItem {
            title,       // 简写语法：字段名和变量名相同
            completed: false,
        });
    }

    fn print_all(&self) {
        // 使用 iter() 借用迭代，不移动元素
        for (i, item) in self.items.iter().enumerate() {
            let status = if item.completed { "✅" } else { "⬜" };
            println!("{}. {} {}", i + 1, status, item.title);
        }
    }
}
```

&lt;/details&gt;

---

## 4.13 本章小结

```
┌──────────────────────────────────────────────────────────┐
│                     本章知识点回顾                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🏗️  栈 vs 堆                                           │
│      固定大小 → 栈（快），动态大小 → 堆（灵活）            │
│                                                          │
│  📜 所有权三大规则                                        │
│      1. 每个值有且只有一个所有者                           │
│      2. 同一时刻只能有一个所有者                           │
│      3. 所有者离开作用域时值被 drop                        │
│                                                          │
│  🚚 移动（Move）                                         │
│      赋值和传参会转移所有权，原变量失效                     │
│                                                          │
│  📋 拷贝（Copy）                                         │
│      基本类型自动复制，原变量仍有效                         │
│                                                          │
│  🐑 克隆（Clone）                                        │
│      .clone() 显式深度复制，两个变量各自独立                │
│                                                          │
│  🔑 String vs &str                                       │
│      String 拥有所有权，&str 是借用                        │
│                                                          │
│  💡 核心思维                                              │
│      JS: "谁在引用这个对象？"                              │
│      Rust: "谁拥有这个值？"                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

> **下一章预告**：到处转移所有权太麻烦了！下一章我们将学习「借用（Borrowing）」—— 一种不转移所有权就能使用值的优雅方式。这将极大地改善你的 Rust 编码体验！

---

*📖 推荐阅读：[The Rust Programming Language - 所有权](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html) | [course.rs - 所有权](https://course.rs/basic/ownership/ownership.html)*
