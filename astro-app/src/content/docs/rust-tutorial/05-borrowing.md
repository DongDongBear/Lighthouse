# 第五章：借用与引用 —— 不转移所有权的优雅方式

> **本章目标**
>
> - 理解引用（Reference）与借用（Borrowing）的核心概念
> - 掌握不可变引用 `&T` 的使用方式
> - 掌握可变引用 `&mut T` 的使用方式和限制
> - 深入理解借用规则：为什么同时只能有一个可变引用 OR 多个不可变引用
> - 理解悬垂引用（Dangling Reference）以及 Rust 如何阻止它
> - 了解非词法生命周期（NLL）如何让借用更灵活
> - 对比 JavaScript：为什么 JS 不需要这些规则
> - 通过练习题巩固所学

> **预计学习时间：90 - 120 分钟**

---

## 5.1 引言：上一章的痛点

还记得上一章最后的那个笨办法吗？

```rust
// 为了在函数调用后继续使用值，不得不把它传回来
fn calculate_length(s: String) -> (String, usize) {
    let length = s.len();
    (s, length) // 把 String 和长度一起返回
}

fn main() {
    let s1 = String::from("hello");
    let (s2, len) = calculate_length(s1);
    println!("'{}' 的长度是 {}", s2, len);
}
```

每次使用一个值都要"移动进去再移动回来"，这太麻烦了。在 JavaScript 中，你从来不需要担心这个问题：

```javascript
// JavaScript - 传参从不影响原变量的可用性
function calculateLength(s) {
    return s.length;
}
const str = "hello";
const len = calculateLength(str);
console.log(`'${str}' 的长度是 ${len}`); // ✅ 当然没问题
```

Rust 的解决方案是**引用（Reference）**和**借用（Borrowing）**。

---

## 5.2 引用与借用的基本概念

### 5.2.1 什么是引用？

**引用**就是一个指向某个值的指针，但它**不拥有**那个值。就像你可以看朋友的书，但书还是朋友的 —— 你只是「借」来看看。

```rust
fn main() {
    let s1 = String::from("hello");

    // &s1 创建了一个指向 s1 的引用，但不取得所有权
    let len = calculate_length(&s1);

    // s1 仍然有效！因为我们只是借出去了，没有移动
    println!("'{}' 的长度是 {}", s1, len); // ✅
}

fn calculate_length(s: &String) -> usize {
    // s 是一个引用，类型是 &String
    // 它指向传入的 String，但不拥有它
    s.len()
}   // s 离开作用域，但因为它不拥有所指向的值，所以什么都不会发生
```

### 5.2.2 内存图解

```
引用的内存布局：

    main 的栈帧                  堆
    ┌───────────────┐
    │ s1             │          ┌───────────────┐
    │  ptr: ─────────────────→ │ h e l l o     │
    │  len: 5        │          └───────────────┘
    │  cap: 5        │
    └───────────────┘
           ↑
           │ （引用指向 s1，不是堆数据）
           │
    calculate_length 的栈帧
    ┌───────────────┐
    │ s: &String ───┘
    └───────────────┘

    关键区别：
    - s 指向的是「s1 这个变量」，不是直接指向堆数据
    - s 不拥有任何东西
    - 当 s 离开作用域时，它指向的数据不会被释放
```

### 5.2.3 引用 vs 所有权：一个比喻

```
┌───────────────────────────────────────────────────────────────┐
│                    所有权 vs 借用 —— 图书馆比喻                 │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  所有权（Move）= 买书                                         │
│  ┌──────────┐     ┌──────────┐                                │
│  │  书店 📚  │ ──→ │  你 🙋   │  书归你了，书店没有了           │
│  └──────────┘     └──────────┘                                │
│                                                               │
│  不可变引用（&T）= 去图书馆看书                                │
│  ┌──────────┐     ┌──────────┐                                │
│  │ 图书馆 📚 │ ←── │  你 👀   │  你能看，但不能在上面写字       │
│  └──────────┘     │  朋友 👀  │  多人可以同时看同一本书         │
│  书还在图书馆      └──────────┘                                │
│                                                               │
│  可变引用（&mut T）= 借书回家修改                              │
│  ┌──────────┐     ┌──────────┐                                │
│  │ 图书馆 📚 │ ←── │  你 ✏️   │  你能改，但同时只能一人借出     │
│  └──────────┘     └──────────┘  （不然可能互相覆盖修改）       │
│  书还属于图书馆                                                │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 5.2.4 创建引用的语法

```rust
fn main() {
    let s = String::from("hello");

    // 创建不可变引用
    let r1: &String = &s;       // 显式类型标注
    let r2 = &s;                // 类型推断：也是 &String

    // 在函数参数中使用引用
    print_string(&s);

    // 解引用：通过引用访问值（通常自动进行）
    let r = &s;
    println!("{}", r);          // 自动解引用
    println!("{}", *r);         // 显式解引用（效果相同）
    println!("{}", r.len());    // 方法调用时自动解引用
}

fn print_string(s: &String) {
    println!("{}", s);
}
```

> 💡 **术语区分**：
> - 创建引用的行为叫做**借用（Borrowing）**
> - 引用本身叫做**引用（Reference）**
> - "我借用了 s" = "我创建了一个指向 s 的引用"

---

## 5.3 不可变引用 `&T`

### 5.3.1 基本用法

不可变引用允许你**读取**值，但**不能修改**：

```rust
fn main() {
    let s = String::from("hello, world");

    // 创建不可变引用
    let r1 = &s;
    let r2 = &s;

    // ✅ 可以读取
    println!("r1 = {}", r1);
    println!("r2 = {}", r2);
    println!("s = {}", s);  // 原值也能用

    // ❌ 不能通过不可变引用修改值
    // r1.push_str("!!!");  // 编译错误：cannot borrow as mutable
}
```

### 5.3.2 多个不可变引用可以共存

```rust
fn main() {
    let s = String::from("hello");

    // ✅ 可以同时存在多个不可变引用
    let r1 = &s;
    let r2 = &s;
    let r3 = &s;

    println!("{}, {}, {}", r1, r2, r3); // ✅ 全部有效

    // 为什么可以？因为只读不写，不会有数据竞争的问题。
    // 就像多人同时看同一本书，完全安全。
}
```

### 5.3.3 不可变引用在函数中的使用

```rust
// 参数类型是 &String：只借用，不取所有权
fn first_word(s: &String) -> &str {
    // 返回第一个单词（字符串切片）
    let bytes = s.as_bytes();
    for (i, &byte) in bytes.iter().enumerate() {
        if byte == b' ' {
            return &s[0..i]; // 返回切片引用
        }
    }
    &s[..] // 没有空格，返回整个字符串
}

fn main() {
    let sentence = String::from("hello world");
    let word = first_word(&sentence); // 借用 sentence
    println!("第一个单词是：{}", word);
    println!("完整句子是：{}", sentence); // ✅ sentence 仍可用
}
```

### 5.3.4 引用的引用

```rust
fn main() {
    let s = String::from("hello");
    let r1 = &s;       // r1: &String
    let r2 = &r1;      // r2: &&String （引用的引用）
    let r3 = &r2;      // r3: &&&String

    // Rust 会自动解多层引用（auto-deref）
    println!("{}", r3); // 打印 "hello"，自动解了三层引用
}
```

---

## 5.4 可变引用 `&mut T`

### 5.4.1 基本用法

如果你需要通过引用**修改**值，就需要可变引用：

```rust
fn main() {
    let mut s = String::from("hello");
    //  ^^^ 注意：原始变量必须是 mut 的

    change(&mut s);  // 传递可变引用
    //     ^^^^ 使用 &mut 创建可变引用

    println!("{}", s); // "hello, world!"
}

fn change(s: &mut String) {
    //        ^^^^^^^^^ 参数类型是可变引用
    s.push_str(", world!");  // ✅ 可以修改
}
```

**三个必须**：
1. 原始变量必须声明为 `mut`
2. 创建引用时使用 `&mut`
3. 函数参数类型标注为 `&mut T`

### 5.4.2 对比 JavaScript

```javascript
// JavaScript：函数可以随意修改传入的对象
function addGreeting(obj) {
    obj.greeting = "hello!"; // 直接修改原始对象
}

const user = { name: "动动" };
addGreeting(user);
console.log(user.greeting); // "hello!" — 原始对象被修改了

// 问题：任何拿到引用的函数都能修改你的对象
// 你很难追踪"谁改了我的数据"
```

```rust
// Rust：必须显式声明"我要修改这个值"
fn add_greeting(user: &mut User) {
    user.greeting = String::from("hello!");
}

fn read_user(user: &User) {
    // 只有不可变引用，不能修改
    println!("{}", user.name);
    // user.name = String::from("xxx"); // ❌ 编译错误
}

fn main() {
    let mut user = User { name: String::from("动动"), greeting: String::new() };

    add_greeting(&mut user); // 显式：我允许你修改
    read_user(&user);        // 显式：你只能读取

    // Rust 的优势：看函数签名就知道它会不会修改你的数据！
}
```

---

## 5.5 借用规则 —— Rust 最重要的安全保证

### 5.5.1 核心规则

```
╔════════════════════════════════════════════════════════════════╗
║                        借用规则                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  在任何给定时刻，你只能拥有以下其中之一：                        ║
║                                                                ║
║  ┌─────────────────────────────────────────────┐              ║
║  │  选项 A：一个可变引用（&mut T）              │              ║
║  └─────────────────────────────────────────────┘              ║
║                     OR                                         ║
║  ┌─────────────────────────────────────────────┐              ║
║  │  选项 B：任意数量的不可变引用（&T）           │              ║
║  └─────────────────────────────────────────────┘              ║
║                                                                ║
║  两者不能同时存在！                                             ║
║                                                                ║
║  另外：引用必须始终有效（不能有悬垂引用）                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### 5.5.2 规则详解：为什么不能同时有可变和不可变引用？

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;     // ✅ 第一个不可变引用
    let r2 = &s;     // ✅ 第二个不可变引用（可以有多个）

    // let r3 = &mut s; // ❌ 不能在有不可变引用的同时创建可变引用！

    println!("{} and {}", r1, r2);
    // r1 和 r2 在这里之后不再使用（NLL，后面会讲）

    let r3 = &mut s;  // ✅ 现在可以了，因为 r1 和 r2 已经"过期"
    r3.push_str(", world!");
    println!("{}", r3);
}
```

**为什么要有这个规则？** 为了防止**数据竞争（Data Race）**：

```
数据竞争发生的条件（三个必须同时满足）：
  1. 两个或更多指针同时访问同一数据
  2. 至少一个指针被用于写入
  3. 没有同步机制来协调访问

如果允许可变引用和不可变引用共存：

  线程/代码段 A（持有 &s）：      线程/代码段 B（持有 &mut s）：
  ┌─────────────────────┐       ┌─────────────────────────┐
  │ 正在读取 s 的内容... │       │ 正在修改 s...            │
  │ 期望看到 "hello"    │       │ s.clear()               │
  │ 实际可能看到空字符串！│       │ s 现在是 ""             │
  └─────────────────────┘       └─────────────────────────┘

  这就是数据竞争！结果不可预测。
```

```
Rust 的解决方案：

  ┌────────────────────────────────────────────┐
  │  同时读取（多个 &T）     → ✅ 安全         │
  │  独占写入（一个 &mut T） → ✅ 安全         │
  │  读写并存                → ❌ 编译器拒绝   │
  └────────────────────────────────────────────┘
```

### 5.5.3 不能同时有两个可变引用

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &mut s;
    // let r2 = &mut s; // ❌ 不能同时有两个可变引用！

    // 为什么？因为两个可变引用可能同时修改同一数据，
    // 导致数据不一致。

    println!("{}", r1);
}
```

### 5.5.4 实际例子：为什么这些规则很重要

```rust
fn main() {
    let mut v = vec![1, 2, 3, 4, 5];

    let first = &v[0];  // 不可变借用 v

    // v.push(6);        // ❌ 不能可变借用 v，因为 first 还在使用
    //                   // 为什么？因为 push 可能导致 Vec 重新分配内存，
    //                   // 那么 first 指向的地址就变成了无效地址！

    println!("第一个元素是：{}", first);

    // first 在这里之后不再使用
    v.push(6);           // ✅ 现在可以了
    println!("{:?}", v);
}
```

```
为什么 Vec::push 和引用不能共存？

  push 之前：
    v: [ptr] ──→ [1, 2, 3, 4, 5]  （容量刚好 5）
    first ──→ [1]（指向第一个元素）

  push(6) 时，容量不够！Vec 需要重新分配：
    v: [ptr] ──→ [1, 2, 3, 4, 5, 6]  （新地址，容量 10）
    first ──→ [???]（原来的地址已经被释放了！）
                     ↑ 悬垂指针！

  Rust 在编译时就阻止了这个问题。
```

---

## 5.6 悬垂引用（Dangling Reference）

### 5.6.1 什么是悬垂引用？

悬垂引用是指一个引用指向了已经被释放的内存。在 C/C++ 中这是一个常见的严重 bug，在 Rust 中编译器会阻止它。

```rust
// ❌ 这段代码无法编译
fn dangle() -> &String {
    let s = String::from("hello");
    &s  // 返回 s 的引用
}   // s 离开作用域被释放，但我们返回了指向它的引用！
    // 这就是悬垂引用 —— 指向已释放内存的引用

fn main() {
    let reference_to_nothing = dangle();
}
```

编译器错误信息：

```
error[E0106]: missing lifetime specifier
 --> src/main.rs:1:16
  |
1 | fn dangle() -> &String {
  |                ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value,
          but there is no value for it to be borrowed from
```

### 5.6.2 修复悬垂引用

```rust
// ✅ 方案 1：直接返回 String（转移所有权）
fn no_dangle() -> String {
    let s = String::from("hello");
    s  // 所有权转移给调用者，s 不会被释放
}

// ✅ 方案 2：传入引用并返回引用（生命周期关联）
fn no_dangle2(input: &str) -> &str {
    // 返回的引用和输入的引用有相同的生命周期
    &input[0..3]
}

fn main() {
    let s = no_dangle();
    println!("{}", s); // ✅

    let s2 = String::from("hello");
    let part = no_dangle2(&s2);
    println!("{}", part); // ✅ "hel"
}
```

### 5.6.3 对比 C 语言的悬垂指针

```c
// C 语言 —— 这段代码能编译，但运行时是未定义行为！
char* dangle() {
    char s[] = "hello";  // s 在栈上
    return s;            // 返回栈上数据的指针
}  // s 被释放，返回的指针指向无效内存

int main() {
    char* str = dangle();
    printf("%s\n", str);  // 💥 未定义行为！可能打印垃圾值，可能崩溃
}
```

```rust
// Rust —— 编译器在编译时就阻止了这种代码
// 你永远不会遇到悬垂引用的运行时 bug
```

---

## 5.7 引用的作用域与非词法生命周期（NLL）

### 5.7.1 传统理解：引用的作用域到 `}` 结束

在早期的 Rust（1.31 之前），引用的生命周期严格到变量声明所在的 `}` 为止：

```rust
// 早期 Rust 的行为（在 {} 结束前引用一直有效）
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;
    let r2 = &s;
    // 早期 Rust：r1 和 r2 的作用域延续到整个 main 函数的 }
    // 所以下面这行在早期 Rust 中会报错

    let r3 = &mut s; // 即使 r1/r2 已经不再使用，也不行
    r3.push_str(", world!");
}
```

### 5.7.2 NLL（Non-Lexical Lifetimes）—— 现代 Rust 的改进

从 Rust 2018 开始，编译器变得更聪明了。引用的作用域在**最后一次使用**之后就结束，而不是等到 `}`：

```rust
// 现代 Rust（NLL）
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;
    let r2 = &s;
    println!("{} and {}", r1, r2);
    // ← r1 和 r2 的作用域在这里结束（最后一次使用之后）

    let r3 = &mut s; // ✅ 现在可以了！r1 和 r2 已经"过期"
    r3.push_str(", world!");
    println!("{}", r3);
}
```

```
NLL 的引用作用域示意：

fn main() {
    let mut s = String::from("hello");
    │
    │  let r1 = &s; ─────────────────┐  r1 的生命周期
    │  let r2 = &s; ────────────┐    │  r2 的生命周期
    │                           │    │
    │  println!("{}", r2); ─────┘    │  r2 最后一次使用
    │  println!("{}", r1); ──────────┘  r1 最后一次使用
    │
    │  // r1 和 r2 都已过期
    │
    │  let r3 = &mut s; ────────┐  r3 的生命周期
    │  r3.push_str("!");        │
    │  println!("{}", r3); ─────┘  r3 最后一次使用
    │
}   // s 被 drop
```

### 5.7.3 NLL 让很多实际代码变得可行

```rust
fn main() {
    let mut map = std::collections::HashMap::new();
    map.insert("key1", "value1");

    // 查找并根据结果决定是否插入
    let value = map.get("key2");  // 不可变借用
    match value {
        Some(v) => println!("找到了：{}", v),
        None => {
            // value 的借用在 match 之后结束（NLL）
            map.insert("key2", "value2");  // ✅ 可变借用
            println!("插入了新值");
        }
    }
}
```

---

## 5.8 引用作为结构体字段（预览）

引用也可以作为结构体的字段，但需要指定**生命周期**（Lifetime），这是一个更高级的话题：

```rust
// 这个结构体持有一个引用，需要生命周期标注
struct Excerpt<'a> {
    //         ^^ 生命周期参数
    part: &'a str,
    //    ^^^ 这个引用必须活得至少和结构体一样久
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence;

    {
        let excerpt = Excerpt {
            part: &novel[..16], // "Call me Ishmael"
        };
        first_sentence = excerpt.part;
    }

    // first_sentence 仍然有效，因为 novel 还活着
    println!("{}", first_sentence);
}
```

> 💡 生命周期是 Rust 的另一个重要概念，我们会在后续章节专门讲解。现在只需要知道：当结构体持有引用时，需要用 `'a` 这样的语法告诉编译器引用的有效期。

---

## 5.9 对比 JavaScript：为什么 JS 不需要借用规则

### 5.9.1 JS 的共享引用模型

```javascript
// JavaScript 允许多个变量指向同一个对象，且可以随意修改
const user = { name: "动动", scores: [90, 85, 95] };

// 多个引用指向同一个对象
const ref1 = user;
const ref2 = user;
const ref3 = user;

// 任何引用都可以修改对象
ref1.name = "被修改了";
ref2.scores.push(100);

console.log(user.name);     // "被修改了"
console.log(user.scores);   // [90, 85, 95, 100]

// 这在 Rust 中是不可能的！
// Rust 不允许多个可变引用同时存在
```

### 5.9.2 JS 不需要这些规则的原因

```
┌──────────────────────────────────────────────────────────────┐
│            为什么 JavaScript 不需要借用规则？                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 🗑️ 垃圾回收                                             │
│     JS 有 GC，不需要担心"谁负责释放内存"                     │
│     → Rust 没有 GC，需要所有权来确定释放时机                  │
│                                                              │
│  2. 🔄 单线程（主线程）                                      │
│     JS 通常是单线程的，不存在并发数据竞争                     │
│     → Rust 支持多线程，需要借用规则防止数据竞争               │
│                                                              │
│  3. 🐌 运行时检查                                            │
│     JS 在运行时处理问题（如 undefined、type error）          │
│     → Rust 在编译时就要保证一切安全                          │
│                                                              │
│  4. 💰 JS 用性能换安全                                       │
│     GC 的运行时开销 + 单线程限制 = 安全但可能更慢            │
│     → Rust 用编译时检查换安全 = 安全且零运行时开销           │
│                                                              │
│  结论：JS 把问题推给了运行时（GC、单线程）                    │
│       Rust 在编译时就解决了这些问题                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.9.3 JS 中类似"借用问题"的坑

虽然 JS 没有借用规则，但共享可变引用确实会导致 bug：

```javascript
// 坑 1：意外修改
function processUser(user) {
    user.name = user.name.toUpperCase(); // 修改了原对象！
    return user;
}

const original = { name: "动动" };
const processed = processUser(original);
console.log(original.name); // "动动" 被改成了 "动动"... 等等这个例子不对

// 更好的例子
function processScores(scores) {
    scores.sort(); // sort 会原地修改数组！
    return scores;
}

const myScores = [95, 85, 90];
const sorted = processScores(myScores);
console.log(myScores); // [85, 90, 95] — 原数组也被排序了！

// JS 的解决方案：防御性拷贝
function safeProcess(scores) {
    const copy = [...scores]; // 手动复制
    copy.sort();
    return copy;
}
```

```rust
// Rust 的解决方案：类型系统保证
fn process_scores(scores: &[i32]) -> Vec<i32> {
    // scores 是不可变引用，不可能修改原数据
    let mut sorted = scores.to_vec(); // 创建副本
    sorted.sort();
    sorted
}

fn main() {
    let my_scores = vec![95, 85, 90];
    let sorted = process_scores(&my_scores);
    println!("原始：{:?}", my_scores);  // [95, 85, 90] 不变！
    println!("排序：{:?}", sorted);     // [85, 90, 95]
}
```

---

## 5.10 借用的高级用法

### 5.10.1 方法中的借用

```rust
struct Rectangle {
    width: f64,
    height: f64,
}

impl Rectangle {
    // &self = 不可变借用（只读）
    fn area(&self) -> f64 {
        self.width * self.height
    }

    // &mut self = 可变借用（可修改）
    fn scale(&mut self, factor: f64) {
        self.width *= factor;
        self.height *= factor;
    }

    // self = 取得所有权（消费自身）
    fn into_square(self) -> Rectangle {
        let side = (self.width + self.height) / 2.0;
        Rectangle { width: side, height: side }
    }
}

fn main() {
    let mut rect = Rectangle { width: 10.0, height: 5.0 };

    println!("面积: {}", rect.area());      // 借用 &self

    rect.scale(2.0);                         // 可变借用 &mut self
    println!("缩放后面积: {}", rect.area()); // 再次借用

    let square = rect.into_square();          // 消费 rect
    // println!("{}", rect.width);            // ❌ rect 被移动了
    println!("正方形边长: {}", square.width); // ✅
}
```

### 5.10.2 切片（Slice）—— 部分借用

切片是对连续序列的部分引用：

```rust
fn main() {
    let s = String::from("hello world");

    // 字符串切片
    let hello = &s[0..5];    // "hello"
    let world = &s[6..11];   // "world"
    let whole = &s[..];      // 整个字符串

    println!("{} {}", hello, world);

    // 数组切片
    let a = [1, 2, 3, 4, 5];
    let slice = &a[1..3];    // [2, 3]
    println!("{:?}", slice);

    // Vec 切片
    let v = vec![10, 20, 30, 40, 50];
    let mid = &v[1..4];      // [20, 30, 40]
    println!("{:?}", mid);
}
```

```
字符串切片的内存布局：

    s: String
    ┌───────────┐          ┌─────────────────────────┐
    │ ptr ──────────────→  │ h e l l o   w o r l d   │
    │ len: 11   │          └─────────────────────────┘
    │ cap: 11   │                ↑         ↑
    └───────────┘                │         │
                                 │         │
    hello: &str                  │         │
    ┌───────────┐                │         │
    │ ptr ───────────────────────┘         │
    │ len: 5    │                          │
    └───────────┘                          │
                                           │
    world: &str                            │
    ┌───────────┐                          │
    │ ptr ──────────────────────────────────┘
    │ len: 5    │
    └───────────┘
```

### 5.10.3 函数参数的最佳实践

```rust
// ❌ 不太好：要求传入 String（获取所有权）
fn greet_v1(name: String) {
    println!("你好，{}！", name);
}

// ⚠️ 可以但不够好：要求传入 &String
fn greet_v2(name: &String) {
    println!("你好，{}！", name);
}

// ✅ 最佳：接受 &str（既能接受 &String 也能接受 &str）
fn greet_v3(name: &str) {
    println!("你好，{}！", name);
}

fn main() {
    let owned = String::from("动动");
    let literal = "小羊";

    // greet_v1 要求 String，传 &str 需要转换
    greet_v1(String::from("临时"));

    // greet_v2 只接受 &String，不接受 &str
    greet_v2(&owned);
    // greet_v2(literal); // ❌ 类型不匹配

    // greet_v3 接受 &str，最灵活
    greet_v3(&owned);   // ✅ &String 自动转为 &str（Deref 强制转换）
    greet_v3(literal);  // ✅ &str 本身就是 &str
}
```

> 💡 **最佳实践**：函数参数尽量用 `&str` 而不是 `&String`，用 `&[T]` 而不是 `&Vec&lt;T&gt;`。这样更通用。

---

## 5.11 常见借用错误与解决方案

### 5.11.1 错误：在借用期间修改

```rust
fn main() {
    let mut v = vec![1, 2, 3];

    // ❌ 错误模式：在遍历时修改
    // for item in &v {
    //     if *item == 2 {
    //         v.push(4); // ❌ 不能在遍历时修改
    //     }
    // }

    // ✅ 方案 1：先收集要修改的信息，再修改
    let needs_addition = v.iter().any(|&x| x == 2);
    if needs_addition {
        v.push(4);
    }

    // ✅ 方案 2：使用 retain/filter 等函数式方法
    let mut v2 = vec![1, 2, 3, 4, 5];
    v2.retain(|&x| x % 2 == 0); // 只保留偶数
    println!("{:?}", v2); // [2, 4]
}
```

### 5.11.2 错误：在闭包中借用

```rust
fn main() {
    let mut s = String::from("hello");

    // ❌ 闭包捕获了 s 的可变引用
    // let closure = || s.push_str(" world");
    // println!("{}", s);  // ❌ 不能同时有不可变借用
    // closure();

    // ✅ 方案：确保借用不重叠
    let mut s = String::from("hello");
    {
        let closure = || s.push_str(" world"); // 可变借用
        closure();
    } // 闭包和它的借用在这里结束
    println!("{}", s); // ✅ 现在可以读取了
}
```

### 5.11.3 错误：返回局部变量的引用

```rust
// ❌ 不能返回局部变量的引用
// fn bad() -> &str {
//     let s = String::from("hello");
//     &s  // s 在函数结束后被释放
// }

// ✅ 方案 1：返回拥有所有权的值
fn good_v1() -> String {
    let s = String::from("hello");
    s // 转移所有权
}

// ✅ 方案 2：返回 'static 引用（字符串字面量）
fn good_v2() -> &'static str {
    "hello" // 字符串字面量有 'static 生命周期
}

// ✅ 方案 3：接收引用参数并返回它的切片
fn good_v3(s: &str) -> &str {
    &s[0..5]
}
```

---

## 5.12 借用检查器心智模型

### 5.12.1 把借用检查器想象成图书管理员

```
┌──────────────────────────────────────────────────────────────┐
│              借用检查器 = 图书管理员                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  场景：你要借图书馆的书                                       │
│                                                              │
│  👩‍💼 图书管理员（编译器）的规则：                               │
│                                                              │
│  1. "这本书有人在阅览室看呢（&T），                           │
│      你也可以进去看（再来一个 &T），                           │
│      但不能拿走修改（不能 &mut T）"                           │
│                                                              │
│  2. "这本书已经被人借走修改了（&mut T），                     │
│      别人不能看也不能借（不能有其他任何引用）"                  │
│                                                              │
│  3. "这本书已经卖掉了（Move），                               │
│      你不能再借了（原变量无效）"                               │
│                                                              │
│  4. "这本书已经被销毁了（drop），                             │
│      你不能再引用它（不能有悬垂引用）"                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.12.2 决策树：什么时候用什么类型的引用

```
                需要在函数中使用某个值
                        │
              ┌─────────┴──────────┐
              │                    │
          需要修改值？            只需读取？
              │                    │
              ▼                    ▼
         ┌─────────┐        ┌──────────┐
         │ &mut T   │        │   &T     │
         └─────────┘        └──────────┘
              │                    │
    需要保存引用超过         短暂使用？
    一次函数调用？                │
         │                       ▼
         ▼                  直接用 &T
    考虑 Clone 或
    重新设计结构
```

---

## 5.13 练习题

### 练习 1：修复借用错误

以下代码有借用问题，请修复：

```rust
fn main() {
    let mut s = String::from("hello");

    let word = first_word(&s);
    s.clear(); // ❌ 在 word 还在使用时清空 s
    println!("第一个单词是：{}", word);
}

fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();
    for (i, &byte) in bytes.iter().enumerate() {
        if byte == b' ' {
            return &s[0..i];
        }
    }
    &s[..]
}
```

&lt;details&gt;
&lt;summary&gt;📝 答案&lt;/summary&gt;

```rust
fn main() {
    let mut s = String::from("hello world");

    let word = first_word(&s);
    println!("第一个单词是：{}", word); // 先使用 word
    // word 的借用在这里结束（NLL）

    s.clear(); // ✅ 现在可以了
    println!("清空后：'{}'", s);
}
```

&lt;/details&gt;

### 练习 2：实现安全的字符串处理

```rust
// 实现以下函数，注意使用正确的引用类型

// 1. 计算字符串中的元音字母数量（只读）
fn count_vowels(s: /* 补全类型 */) -> usize {
    todo!()
}

// 2. 将字符串中的空格替换为下划线（需要修改）
fn replace_spaces(s: /* 补全类型 */) {
    todo!()
}

// 3. 截取字符串的前 n 个字符（只读，返回切片）
fn take_chars(s: /* 补全类型 */, n: usize) -> /* 补全返回类型 */ {
    todo!()
}

fn main() {
    let mut text = String::from("hello world rust");

    let vowels = count_vowels(&text);
    println!("元音数量: {}", vowels);

    let first_five = take_chars(&text, 5);
    println!("前5个字符: {}", first_five);

    replace_spaces(&mut text);
    println!("替换后: {}", text);
}
```

&lt;details&gt;
&lt;summary&gt;📝 答案&lt;/summary&gt;

```rust
fn count_vowels(s: &str) -> usize {
    s.chars()
     .filter(|c| "aeiouAEIOU".contains(*c))
     .count()
}

fn replace_spaces(s: &mut String) {
    // 一种简单但非最优的实现
    *s = s.replace(' ', "_");
}

fn take_chars(s: &str, n: usize) -> &str {
    // 注意：对于 ASCII 字符串可以用字节索引
    // 对于 UTF-8 字符串需要更小心
    let end = s.char_indices()
               .nth(n)
               .map(|(i, _)| i)
               .unwrap_or(s.len());
    &s[..end]
}
```

&lt;/details&gt;

### 练习 3：修复结构体借用

```rust
struct TextEditor {
    content: String,
    cursor: usize,
}

impl TextEditor {
    fn new() -> TextEditor {
        TextEditor {
            content: String::new(),
            cursor: 0,
        }
    }

    // 补全以下方法的签名和实现

    // 插入文本（需要修改 self）
    fn insert(/* ??? */, text: &str) {
        todo!()
    }

    // 获取当前光标位置的字符（只读）
    fn current_char(/* ??? */) -> Option<char> {
        todo!()
    }

    // 获取全部内容（只读）
    fn get_content(/* ??? */) -> &str {
        todo!()
    }
}

fn main() {
    let mut editor = TextEditor::new();
    editor.insert("Hello, ");
    editor.insert("World!");

    println!("内容: {}", editor.get_content());
    println!("当前字符: {:?}", editor.current_char());
}
```

&lt;details&gt;
&lt;summary&gt;📝 答案&lt;/summary&gt;

```rust
impl TextEditor {
    fn insert(&mut self, text: &str) {
        self.content.insert_str(self.cursor, text);
        self.cursor += text.len();
    }

    fn current_char(&self) -> Option<char> {
        self.content.chars().nth(self.cursor)
    }

    fn get_content(&self) -> &str {
        &self.content
    }
}
```

&lt;/details&gt;

### 练习 4：理解 NLL

判断以下代码能否编译，解释原因：

```rust
// 4a
fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];
    v.push(4);
    println!("{}", first);
}

// 4b
fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];
    println!("{}", first);
    v.push(4);
}

// 4c
fn main() {
    let mut s = String::from("hello");
    let r1 = &s;
    let r2 = &s;
    println!("{} {}", r1, r2);
    let r3 = &mut s;
    r3.push_str(" world");
    println!("{}", r3);
}
```

&lt;details&gt;
&lt;summary&gt;📝 答案&lt;/summary&gt;

**4a**：❌ 编译失败。`first` 在 `v.push(4)` 之后还被使用（`println!`），此时 `first` 的借用和 `push` 的可变借用冲突。

**4b**：✅ 编译成功。`first` 在 `println!` 之后不再使用（NLL），所以 `v.push(4)` 的可变借用不冲突。

**4c**：✅ 编译成功。`r1` 和 `r2` 在 `println!` 之后不再使用（NLL），之后可以创建可变引用 `r3`。

&lt;/details&gt;

---

## 5.14 本章小结

```
┌──────────────────────────────────────────────────────────┐
│                     本章知识点回顾                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📖 引用 = 借用，不取得所有权                             │
│                                                          │
│  👀 &T = 不可变引用                                      │
│      可以有多个，只能读取                                 │
│                                                          │
│  ✏️ &mut T = 可变引用                                    │
│      同时只能有一个，可以读写                              │
│                                                          │
│  🔒 借用规则                                              │
│      多个 &T  OR  一个 &mut T（不能同时）                  │
│                                                          │
│  🚫 悬垂引用                                              │
│      Rust 编译器阻止引用指向已释放的数据                    │
│                                                          │
│  ⏰ NLL（非词法生命周期）                                 │
│      引用在最后一次使用后即"过期"                          │
│                                                          │
│  💡 最佳实践                                              │
│      函数参数：&str 优于 &String，&[T] 优于 &Vec<T>      │
│                                                          │
│  🆚 vs JavaScript                                        │
│      JS 用 GC 和单线程回避了这些问题                      │
│      Rust 在编译时就保证安全，零运行时开销                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

> **下一章预告**：有了所有权和借用的基础，我们来学习 Rust 的自定义类型 —— 结构体（Struct）和枚举（Enum）。你会发现它们比 TypeScript 的 interface 和 union type 更强大！

---

*📖 推荐阅读：[The Rust Programming Language - 引用与借用](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html) | [course.rs - 引用与借用](https://course.rs/basic/ownership/borrowing.html)*
