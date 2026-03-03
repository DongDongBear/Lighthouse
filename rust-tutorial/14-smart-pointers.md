# 第十四章：智能指针 —— 超越引用的强大抽象

> **本章目标**
>
> - 理解智能指针与普通引用的区别
> - 掌握 `Box<T>` 的堆分配与使用场景
> - 深入理解 `Deref` trait 与自动解引用机制
> - 掌握 `Drop` trait 与资源清理
> - 理解 `Rc<T>` 引用计数（对比 JavaScript 的垃圾回收）
> - 掌握 `Arc<T>` 在多线程中的使用
> - 理解 `RefCell<T>` 的内部可变性模式
> - 灵活运用 `Rc<RefCell<T>>` 组合模式
> - 理解循环引用问题与 `Weak<T>` 的解决方案
> - 通过练习题巩固所有知识点

> **预计学习时间：150 - 210 分钟**（智能指针是 Rust 高级编程的基石，值得深入理解）

---

## 14.1 什么是智能指针？—— 从 JavaScript 的角度理解

### 14.1.1 JavaScript 中"一切皆引用"

在 JavaScript 中，你可能从未听说过"智能指针"这个概念。这是因为 JS 的对象本身就是通过引用来访问的，而垃圾回收器（GC）自动管理内存：

```javascript
// JavaScript - 对象总是通过引用访问
const obj = { name: "动动" };  // obj 是一个引用
const obj2 = obj;              // obj2 也指向同一个对象
// GC 会在没有引用指向该对象时自动回收
```

在 Rust 中，我们有普通引用（`&T` 和 `&mut T`），它们就像 JavaScript 的引用——只是"借用"数据，不拥有它。但 Rust 还有一类特殊的类型，叫做**智能指针（Smart Pointers）**，它们不仅指向数据，还**拥有**数据，并提供额外的功能。

### 14.1.2 智能指针 vs 普通引用

```
普通引用（&T）：
┌─────────┐     ┌─────────┐
│  &data  │────→│  data   │  只是借用，不拥有
└─────────┘     └─────────┘

智能指针（如 Box<T>）：
┌─────────────┐     ┌─────────┐
│  Box<data>  │────→│  data   │  拥有数据，负责释放
│  (栈上)     │     │  (堆上) │
└─────────────┘     └─────────┘
```

智能指针的核心特征：
1. **拥有**它所指向的数据（而非借用）
2. 通常实现了 `Deref` trait —— 可以像引用一样使用
3. 通常实现了 `Drop` trait —— 离开作用域时自动清理资源

### 14.1.3 Rust 标准库中的智能指针家族

| 智能指针 | 用途 | JS 类比 |
|---------|------|---------|
| `Box<T>` | 堆分配 | `new Object()` |
| `Rc<T>` | 单线程引用计数 | JS 的引用 + GC |
| `Arc<T>` | 多线程引用计数 | SharedArrayBuffer 的理念 |
| `RefCell<T>` | 运行时借用检查 | 普通的 JS 可变对象 |
| `Mutex<T>` | 互斥锁 | 无直接类比 |

让我们逐一深入学习。

---

## 14.2 `Box<T>` —— 最简单的智能指针

### 14.2.1 什么是 `Box<T>`？

`Box<T>` 是 Rust 中最简单、最常用的智能指针。它把数据存储在**堆（Heap）** 上，而非栈（Stack）上。

```rust
fn main() {
    // 普通变量 —— 存储在栈上
    let x = 5;

    // Box —— 值存储在堆上，Box 本身（指针）在栈上
    let y = Box::new(5);

    println!("x = {}", x);
    println!("y = {}", y);  // 自动解引用，打印 5 而不是地址
}
```

内存布局：

```
栈（Stack）              堆（Heap）
┌──────────┐
│ x = 5    │
├──────────┤            ┌──────────┐
│ y = ptr ─┼───────────→│ 5        │
└──────────┘            └──────────┘
```

### 14.2.2 为什么需要 `Box<T>`？

你可能会问：直接把值放在栈上不好吗？大多数情况下确实如此。但以下场景需要 `Box<T>`：

**场景一：编译时大小未知的类型（递归类型）**

这是 `Box<T>` 最经典的用例。考虑一个链表：

```rust
// ❌ 编译错误！递归类型有无限大小
// enum List {
//     Cons(i32, List),  // List 包含 List，编译器无法确定大小
//     Nil,
// }

// ✅ 用 Box 打破递归
enum List {
    Cons(i32, Box<List>),  // Box 是一个指针，大小固定
    Nil,
}

fn main() {
    use List::{Cons, Nil};

    // 创建链表：1 -> 2 -> 3 -> Nil
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));

    // 遍历链表
    print_list(&list);
}

fn print_list(list: &List) {
    match list {
        List::Cons(value, next) => {
            print!("{} -> ", value);
            print_list(next);  // next 是 &Box<List>，自动解引用为 &List
        }
        List::Nil => println!("Nil"),
    }
}
```

为什么 `Box` 能解决这个问题？

```
没有 Box 的 List：                有 Box 的 List：
┌───────────────────┐            ┌───────────────────┐
│ Cons(i32, List)   │            │ Cons(i32, Box)     │
│  i32: 4 字节      │            │  i32: 4 字节       │
│  List: ??? 字节   │ ← 无限！   │  Box: 8 字节（指针）│ ← 固定大小！
└───────────────────┘            └───────────────────┘
```

对比 JavaScript 中的链表：

```javascript
// JavaScript - 完全不需要担心大小问题
class Node {
    constructor(value, next = null) {
        this.value = value;
        this.next = next;  // 引用，GC 处理一切
    }
}

const list = new Node(1, new Node(2, new Node(3)));
```

**场景二：转移大数据的所有权而不拷贝**

```rust
fn main() {
    // 假设有一个很大的数据结构
    let large_data = vec![0u8; 1_000_000]; // 1MB 数据

    // 移动到 Box 中 —— 数据已经在堆上（Vec 本身就是堆分配）
    // 但如果是大型栈上数组，Box 可以避免拷贝
    let boxed = Box::new([0u8; 1024]); // 1KB 数组放到堆上

    // 传递 Box 只需要拷贝一个指针（8 字节），而不是整个数组
    process_data(boxed);
}

fn process_data(data: Box<[u8; 1024]>) {
    println!("处理了 {} 字节的数据", data.len());
}
```

**场景三：trait 对象（动态分派）**

```rust
trait Animal {
    fn speak(&self) -> String;
}

struct Dog;
struct Cat;

impl Animal for Dog {
    fn speak(&self) -> String {
        "汪汪！".to_string()
    }
}

impl Animal for Cat {
    fn speak(&self) -> String {
        "喵喵！".to_string()
    }
}

fn main() {
    // Box<dyn Animal> 是一个 trait 对象
    // 类似于 JavaScript 中的多态
    let animals: Vec<Box<dyn Animal>> = vec![
        Box::new(Dog),
        Box::new(Cat),
        Box::new(Dog),
    ];

    for animal in &animals {
        println!("{}", animal.speak());
    }
}
```

对比 JavaScript 的多态：

```javascript
// JavaScript - 鸭子类型，天然多态
const animals = [
    { speak: () => "汪汪！" },
    { speak: () => "喵喵！" },
];

animals.forEach(a => console.log(a.speak()));
```

### 14.2.3 `Box<T>` 的常用操作

```rust
fn main() {
    // 创建
    let b = Box::new(42);

    // 解引用获取值
    let value = *b;
    println!("value = {}", value); // 42

    // Box 也可以用于模式匹配
    let b = Box::new("hello");
    if let box_val = *b {
        println!("Box 里面是: {}", box_val);
    }

    // Box::leak —— 泄漏为 'static 引用（高级用法）
    let s: &'static str = Box::leak(Box::new(String::from("永远存在")));
    println!("{}", s);
}
```

### 14.2.4 用 Box 实现二叉树

```rust
// 二叉树 —— Box 的经典应用
#[derive(Debug)]
enum Tree<T> {
    Leaf(T),
    Node {
        value: T,
        left: Box<Tree<T>>,
        right: Box<Tree<T>>,
    },
}

impl<T: std::fmt::Display> Tree<T> {
    // 中序遍历
    fn inorder(&self) {
        match self {
            Tree::Leaf(v) => print!("{} ", v),
            Tree::Node { value, left, right } => {
                left.inorder();
                print!("{} ", value);
                right.inorder();
            }
        }
    }

    // 计算深度
    fn depth(&self) -> usize {
        match self {
            Tree::Leaf(_) => 1,
            Tree::Node { left, right, .. } => {
                1 + left.depth().max(right.depth())
            }
        }
    }
}

fn main() {
    //       3
    //      / \
    //     1   5
    //    / \
    //   0   2
    let tree = Tree::Node {
        value: 3,
        left: Box::new(Tree::Node {
            value: 1,
            left: Box::new(Tree::Leaf(0)),
            right: Box::new(Tree::Leaf(2)),
        }),
        right: Box::new(Tree::Leaf(5)),
    };

    print!("中序遍历: ");
    tree.inorder(); // 0 1 2 3 5
    println!();
    println!("树的深度: {}", tree.depth()); // 3
}
```

---

## 14.3 `Deref` trait —— 智能指针的"透明"之道

### 14.3.1 为什么需要 `Deref`？

`Deref` trait 让智能指针**表现得像普通引用**。这是 Rust 中非常优雅的设计——你不需要到处写 `(*box_val).method()`，编译器会自动帮你解引用。

```rust
use std::ops::Deref;

fn main() {
    let x = 5;
    let y = Box::new(x);

    assert_eq!(5, x);
    assert_eq!(5, *y);  // * 解引用 Box，获取内部值

    // 更重要的是：自动解引用
    let s = Box::new(String::from("hello"));
    // s 是 Box<String>，但可以直接调用 String 的方法
    println!("长度: {}", s.len());       // 自动解引用：Box -> String
    println!("大写: {}", s.to_uppercase()); // 自动解引用：Box -> String

    // 甚至可以传给需要 &str 的函数
    greet(&s); // Box<String> -> &String -> &str （解引用链）
}

fn greet(name: &str) {
    println!("你好, {}!", name);
}
```

### 14.3.2 自动解引用链（Deref Coercion）

Rust 会自动进行解引用转换，这个过程叫做 **Deref Coercion**：

```
Box<String> → String → str
     ↑            ↑
  Deref         Deref
```

规则：
- `&Box<T>` 可以自动变成 `&T`
- `&String` 可以自动变成 `&str`
- `&Vec<T>` 可以自动变成 `&[T]`

```rust
fn main() {
    let boxed_string = Box::new(String::from("Rust"));

    // 以下调用都是合法的，编译器自动解引用
    takes_str(&boxed_string);       // &Box<String> → &String → &str
    takes_string_ref(&boxed_string); // &Box<String> → &String
}

fn takes_str(s: &str) {
    println!("&str: {}", s);
}

fn takes_string_ref(s: &String) {
    println!("&String: {}", s);
}
```

### 14.3.3 实现自己的智能指针

让我们实现一个简单的智能指针来理解 `Deref`：

```rust
use std::ops::Deref;

// 自定义智能指针
struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}

// 实现 Deref，让 MyBox 可以像引用一样使用
impl<T> Deref for MyBox<T> {
    type Target = T;  // 解引用后的类型

    fn deref(&self) -> &T {
        &self.0  // 返回内部值的引用
    }
}

fn main() {
    let x = MyBox::new(42);

    // 使用 * 解引用
    assert_eq!(42, *x);
    // 编译器实际上将 *x 转换为 *(x.deref())

    let name = MyBox::new(String::from("动动"));
    // 自动解引用链：&MyBox<String> → &String → &str
    hello(&name);
}

fn hello(name: &str) {
    println!("你好, {}!", name);
}
```

### 14.3.4 `DerefMut` —— 可变解引用

```rust
use std::ops::{Deref, DerefMut};

struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}

impl<T> Deref for MyBox<T> {
    type Target = T;
    fn deref(&self) -> &T {
        &self.0
    }
}

impl<T> DerefMut for MyBox<T> {
    fn deref_mut(&mut self) -> &mut T {
        &mut self.0
    }
}

fn main() {
    let mut v = MyBox::new(vec![1, 2, 3]);
    // 自动 DerefMut：&mut MyBox<Vec<i32>> → &mut Vec<i32>
    v.push(4);
    println!("{:?}", *v); // [1, 2, 3, 4]
}
```

解引用转换规则总结：

```
从                    到                  条件
&T                 → &U                 T: Deref<Target=U>
&mut T             → &mut U             T: DerefMut<Target=U>
&mut T             → &U                 T: Deref<Target=U>  （可变可以降级为不可变）
```

---

## 14.4 `Drop` trait —— 资源清理的艺术

### 14.4.1 Drop 就是 Rust 的"析构函数"

在 JavaScript 中，你有 `finally` 块来做清理工作。在 Rust 中，`Drop` trait 提供了更强大、更可靠的机制——当值离开作用域时，`drop` 方法会**自动调用**。

```rust
struct DatabaseConnection {
    url: String,
}

impl DatabaseConnection {
    fn new(url: &str) -> Self {
        println!("📡 连接到数据库: {}", url);
        DatabaseConnection { url: url.to_string() }
    }

    fn query(&self, sql: &str) {
        println!("🔍 执行查询: {}", sql);
    }
}

impl Drop for DatabaseConnection {
    fn drop(&mut self) {
        println!("🔌 断开数据库连接: {}", self.url);
    }
}

fn main() {
    {
        let conn = DatabaseConnection::new("postgres://localhost/mydb");
        conn.query("SELECT * FROM users");
        // conn 在这里离开作用域，自动调用 drop()
    } // ← 输出：🔌 断开数据库连接: postgres://localhost/mydb

    println!("连接已安全关闭");
}
```

对比 JavaScript：

```javascript
// JavaScript - 需要手动管理资源
class DatabaseConnection {
    constructor(url) {
        console.log(`📡 连接到数据库: ${url}`);
        this.url = url;
    }

    query(sql) { console.log(`🔍 执行查询: ${sql}`); }

    close() { console.log(`🔌 断开连接: ${this.url}`); }
}

// 你必须记得调用 close()！
const conn = new DatabaseConnection("postgres://localhost/mydb");
try {
    conn.query("SELECT * FROM users");
} finally {
    conn.close(); // 如果忘记了呢？资源泄漏！
}
```

### 14.4.2 Drop 的调用顺序

```rust
struct Droppable {
    name: String,
}

impl Drop for Droppable {
    fn drop(&mut self) {
        println!("🗑️  正在丢弃: {}", self.name);
    }
}

fn main() {
    let a = Droppable { name: "a".to_string() };
    let b = Droppable { name: "b".to_string() };
    let c = Droppable { name: "c".to_string() };

    println!("变量已创建");
    // Drop 的顺序与创建顺序**相反**（栈的 LIFO 特性）
}

// 输出：
// 变量已创建
// 🗑️  正在丢弃: c
// 🗑️  正在丢弃: b
// 🗑️  正在丢弃: a
```

### 14.4.3 提前释放：`std::mem::drop`

有时你需要在值离开作用域之前就释放它：

```rust
struct Lock {
    name: String,
}

impl Drop for Lock {
    fn drop(&mut self) {
        println!("🔓 释放锁: {}", self.name);
    }
}

fn main() {
    let lock = Lock { name: "数据库锁".to_string() };

    // ❌ 不能直接调用 drop 方法
    // lock.drop(); // 编译错误！禁止显式调用 drop

    // ✅ 使用 std::mem::drop（实际上是移动所有权）
    drop(lock);  // 立即释放
    println!("锁已释放，可以继续其他操作");

    // ❌ 此时 lock 已被移动，不能再使用
    // println!("{}", lock.name); // 编译错误！
}
```

`std::mem::drop` 的实现极其简单：

```rust
// 标准库中 drop 的实现
pub fn drop<T>(_x: T) {}
// 就是接收所有权，然后什么都不做
// 函数结束时，_x 离开作用域，自动调用 Drop::drop
```

### 14.4.4 Drop 与 Copy 互斥

一个重要的规则：**实现了 `Drop` 的类型不能实现 `Copy`**。

```rust
// ❌ 编译错误！
// #[derive(Copy, Clone)]
// struct MyResource {
//     data: String, // String 实现了 Drop，所以 MyResource 不能 Copy
// }

// ✅ 没有需要清理的资源，可以 Copy
#[derive(Copy, Clone)]
struct Point {
    x: f64,
    y: f64,
}
```

为什么？因为 `Copy` 是按位复制，如果一个值有资源需要 `Drop`，复制后两个副本都会尝试释放同一个资源——这就是双重释放（double free）问题。

---

## 14.5 `Rc<T>` —— 引用计数智能指针

### 14.5.1 单一所有者的限制

在 Rust 中，默认每个值只有一个所有者。但有些场景需要多个所有者：

```
场景：图的邻接表
节点 A 被节点 B 和节点 C 同时引用

     B ──→ A ←── C

谁来负责释放 A？B 还是 C？
答案：最后一个放手的人。
```

这就是 `Rc<T>`（Reference Counting，引用计数）的用武之地。

### 14.5.2 Rc<T> 基本用法

```rust
use std::rc::Rc;

fn main() {
    // 创建一个 Rc
    let a = Rc::new(vec![1, 2, 3]);
    println!("创建 a 后，引用计数 = {}", Rc::strong_count(&a)); // 1

    // 克隆 Rc —— 不会克隆数据！只是增加引用计数
    let b = Rc::clone(&a);  // 推荐用 Rc::clone
    // let b = a.clone();   // 这样也行，但不够清晰
    println!("创建 b 后，引用计数 = {}", Rc::strong_count(&a)); // 2

    {
        let c = Rc::clone(&a);
        println!("创建 c 后，引用计数 = {}", Rc::strong_count(&a)); // 3
    } // c 离开作用域，引用计数减 1

    println!("c 离开后，引用计数 = {}", Rc::strong_count(&a)); // 2

    // a 和 b 指向同一份数据
    println!("a = {:?}", a);
    println!("b = {:?}", b);
    assert!(Rc::ptr_eq(&a, &b)); // 确认指向同一块内存
}
```

内存模型：

```
栈                         堆
┌─────────┐               ┌──────────────────┐
│  a ──────┼──────────────→│ 引用计数: 2       │
├─────────┤       ┌──────→│ 数据: [1, 2, 3]  │
│  b ──────┼──────┘        └──────────────────┘
└─────────┘
```

### 14.5.3 对比 JavaScript 的垃圾回收

```javascript
// JavaScript - GC 自动处理共享引用
const data = [1, 2, 3];
const a = data;  // a 指向 data
const b = data;  // b 也指向 data
// GC 通过可达性分析决定何时回收
// 你完全不知道引用计数是多少
```

```rust
use std::rc::Rc;

// Rust Rc - 显式的引用计数
fn main() {
    let data = Rc::new(vec![1, 2, 3]);
    let a = Rc::clone(&data);  // 显式共享
    let b = Rc::clone(&data);  // 显式共享
    // 你可以随时查看引用计数
    println!("引用计数: {}", Rc::strong_count(&data)); // 3
}
```

核心区别：

| 特性 | JavaScript GC | Rust Rc<T> |
|------|--------------|-----------|
| 管理方式 | 自动（不可见） | 显式（可查看计数） |
| 开销 | GC 暂停 | 引用计数增减 |
| 循环引用 | GC 可以处理 | 会导致内存泄漏！ |
| 线程安全 | 单线程 | 仅单线程（Arc 用于多线程） |
| 可预测性 | 不确定何时回收 | 引用计数归零立即释放 |

### 14.5.4 Rc<T> 实现共享链表

```rust
use std::rc::Rc;

#[derive(Debug)]
enum List {
    Cons(i32, Rc<List>),
    Nil,
}

fn main() {
    use List::{Cons, Nil};

    // 共享的尾部：3 -> Nil
    let shared_tail = Rc::new(Cons(3, Rc::new(Nil)));
    println!("shared_tail 引用计数 = {}", Rc::strong_count(&shared_tail)); // 1

    // 两个链表共享同一个尾部
    // list_a: 1 -> 3 -> Nil
    let list_a = Cons(1, Rc::clone(&shared_tail));
    println!("shared_tail 引用计数 = {}", Rc::strong_count(&shared_tail)); // 2

    // list_b: 2 -> 3 -> Nil
    let list_b = Cons(2, Rc::clone(&shared_tail));
    println!("shared_tail 引用计数 = {}", Rc::strong_count(&shared_tail)); // 3

    //     list_a: 1 ─┐
    //                  ├──→ 3 -> Nil  （共享）
    //     list_b: 2 ─┘
}
```

### 14.5.5 Rc<T> 的限制

**重要：`Rc<T>` 只提供不可变访问！**

```rust
use std::rc::Rc;

fn main() {
    let data = Rc::new(5);

    // ❌ 不能通过 Rc 获取可变引用
    // *data = 10; // 编译错误！Rc<T> 不实现 DerefMut

    // 想要可变？需要 RefCell —— 稍后讲解
}
```

这是有道理的：如果多个 `Rc` 都能修改数据，就会导致数据竞争。Rust 的借用规则（多个不可变引用 OR 一个可变引用）在编译时保证了安全。

---

## 14.6 `Arc<T>` —— 多线程的引用计数

### 14.6.1 为什么不能在多线程中使用 Rc？

```rust
use std::rc::Rc;
use std::thread;

fn main() {
    let data = Rc::new(vec![1, 2, 3]);

    // ❌ 编译错误！Rc<T> 不能在线程间传递
    // let handle = thread::spawn(move || {
    //     println!("{:?}", data);
    // });

    // 错误信息：`Rc<Vec<i32>>` cannot be sent between threads safely
    // 原因：Rc 的引用计数操作不是原子的，多线程并发修改计数会导致数据竞争
}
```

### 14.6.2 Arc<T> 来救场

`Arc<T>`（Atomic Reference Counting，原子引用计数）是 `Rc<T>` 的线程安全版本：

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(vec![1, 2, 3, 4, 5]);

    let mut handles = vec![];

    for i in 0..3 {
        let data_clone = Arc::clone(&data); // 原子地增加引用计数
        let handle = thread::spawn(move || {
            println!("线程 {} 看到: {:?}", i, data_clone);
            // 计算部分和
            let sum: i32 = data_clone.iter().sum();
            println!("线程 {} 计算的总和: {}", i, sum);
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("主线程，引用计数 = {}", Arc::strong_count(&data)); // 1（线程都结束了）
}
```

### 14.6.3 Rc vs Arc 对比

```
Rc<T>（单线程）：
引用计数操作 = 普通加减法（快）
适用于：单线程的共享所有权

Arc<T>（多线程）：
引用计数操作 = 原子操作（稍慢但线程安全）
适用于：多线程的共享所有权
```

性能差异：

```rust
use std::rc::Rc;
use std::sync::Arc;

fn main() {
    // Rc —— 更快，但只能单线程
    let rc = Rc::new(42);
    for _ in 0..1000 {
        let _ = Rc::clone(&rc); // 普通整数加减
    }

    // Arc —— 稍慢，但线程安全
    let arc = Arc::new(42);
    for _ in 0..1000 {
        let _ = Arc::clone(&arc); // 原子操作
    }

    // 规则：能用 Rc 就用 Rc，需要跨线程才用 Arc
}
```

---

## 14.7 `RefCell<T>` —— 内部可变性

### 14.7.1 什么是内部可变性？

Rust 的借用规则在**编译时**检查：
- 要么有多个不可变引用
- 要么有一个可变引用

但有时候，你需要在只有不可变引用的情况下修改数据。这就是**内部可变性（Interior Mutability）** 模式。

在 JavaScript 中，这完全不是问题：

```javascript
// JavaScript - 任何 const 对象都可以修改属性
const obj = { count: 0 };
obj.count += 1; // 完全没问题
// const 只是说 obj 变量不能重新赋值，但属性随便改
```

在 Rust 中，`RefCell<T>` 提供了类似的能力——将借用检查推迟到**运行时**：

```rust
use std::cell::RefCell;

fn main() {
    // RefCell 允许在不可变引用的情况下修改内部数据
    let data = RefCell::new(vec![1, 2, 3]);

    // borrow() —— 获取不可变引用（运行时检查）
    {
        let borrowed = data.borrow();
        println!("data = {:?}", borrowed);
    } // borrowed 离开作用域，释放借用

    // borrow_mut() —— 获取可变引用（运行时检查）
    {
        let mut borrowed_mut = data.borrow_mut();
        borrowed_mut.push(4);
        println!("修改后 data = {:?}", borrowed_mut);
    }

    // 再次不可变借用
    println!("最终 data = {:?}", data.borrow());
}
```

### 14.7.2 运行时借用检查

`RefCell<T>` 在运行时执行与编译时相同的规则。违反规则会 **panic**（而不是编译错误）：

```rust
use std::cell::RefCell;

fn main() {
    let data = RefCell::new(42);

    // ✅ 多个不可变借用 —— OK
    let a = data.borrow();
    let b = data.borrow();
    println!("a = {}, b = {}", a, b);
    drop(a);
    drop(b);

    // ✅ 一个可变借用 —— OK
    {
        let mut c = data.borrow_mut();
        *c = 100;
    }

    // ❌ 运行时 panic！不可变和可变借用同时存在
    // let d = data.borrow();
    // let mut e = data.borrow_mut(); // panic: already borrowed

    // 安全的方式：用 try_borrow / try_borrow_mut
    let d = data.borrow();
    match data.try_borrow_mut() {
        Ok(mut val) => *val = 200,
        Err(e) => println!("借用失败: {}", e), // 不 panic，优雅处理
    }
}
```

编译时 vs 运行时借用检查对比：

```
编译时检查（&T / &mut T）：
✅ 零运行时开销
✅ 错误在编译时就被发现
❌ 有些合法的模式无法通过检查

运行时检查（RefCell<T>）：
✅ 更灵活
❌ 有少量运行时开销（借用计数）
❌ 违反规则会 panic（运行时错误）
```

### 14.7.3 内部可变性的实际应用：Mock 对象

```rust
// 一个消息发送 trait
trait Messenger {
    fn send(&self, msg: &str); // 注意：&self，不可变引用
}

// 正式的实现
struct EmailSender;
impl Messenger for EmailSender {
    fn send(&self, msg: &str) {
        println!("发送邮件: {}", msg);
    }
}

// 测试用的 Mock —— 需要记录收到的消息
use std::cell::RefCell;

struct MockMessenger {
    messages: RefCell<Vec<String>>, // 用 RefCell 实现内部可变性
}

impl MockMessenger {
    fn new() -> MockMessenger {
        MockMessenger {
            messages: RefCell::new(vec![]),
        }
    }
}

impl Messenger for MockMessenger {
    fn send(&self, msg: &str) {
        // 尽管 &self 是不可变引用，但可以通过 RefCell 修改 messages
        self.messages.borrow_mut().push(msg.to_string());
    }
}

fn main() {
    let mock = MockMessenger::new();

    // send 方法接收 &self（不可变引用），但内部修改了 messages
    mock.send("你好");
    mock.send("世界");

    // 验证收到的消息
    let messages = mock.messages.borrow();
    assert_eq!(messages.len(), 2);
    assert_eq!(messages[0], "你好");
    assert_eq!(messages[1], "世界");
    println!("Mock 收到 {} 条消息: {:?}", messages.len(), *messages);
}
```

### 14.7.4 `Cell<T>` vs `RefCell<T>`

Rust 还有一个更轻量的内部可变性类型 `Cell<T>`：

```rust
use std::cell::Cell;

fn main() {
    // Cell<T> 适用于 Copy 类型
    let counter = Cell::new(0);

    // get/set —— 不需要借用
    counter.set(counter.get() + 1);
    counter.set(counter.get() + 1);
    println!("counter = {}", counter.get()); // 2

    // Cell 通过复制值来工作，没有借用的概念
    // 因此只适用于实现了 Copy 的小类型（i32、bool 等）
}
```

| 特性 | `Cell<T>` | `RefCell<T>` |
|------|----------|-------------|
| 适用类型 | `Copy` 类型 | 任意类型 |
| 获取方式 | `get()`/`set()` 复制值 | `borrow()`/`borrow_mut()` 引用 |
| 运行时开销 | 无 | 借用计数检查 |
| panic 风险 | 无 | 违反借用规则会 panic |

---

## 14.8 `Rc<RefCell<T>>` —— 多所有者 + 可变性

### 14.8.1 为什么需要组合？

- `Rc<T>`：多个所有者，但数据不可变
- `RefCell<T>`：单个所有者，但可以修改数据
- `Rc<RefCell<T>>`：**多个所有者 + 可以修改数据**！

这是 Rust 中非常常见的组合模式。

### 14.8.2 基本用法

```rust
use std::rc::Rc;
use std::cell::RefCell;

fn main() {
    // 创建共享的、可变的数据
    let shared_data = Rc::new(RefCell::new(vec![1, 2, 3]));

    // 创建多个所有者
    let owner1 = Rc::clone(&shared_data);
    let owner2 = Rc::clone(&shared_data);

    // 任何所有者都可以修改数据
    owner1.borrow_mut().push(4);
    owner2.borrow_mut().push(5);

    // 所有所有者看到的是同一份修改后的数据
    println!("shared_data = {:?}", shared_data.borrow()); // [1, 2, 3, 4, 5]
    println!("owner1 = {:?}", owner1.borrow());           // [1, 2, 3, 4, 5]
    println!("owner2 = {:?}", owner2.borrow());           // [1, 2, 3, 4, 5]
}
```

对比 JavaScript：

```javascript
// JavaScript 中这就是最普通的操作
const data = [1, 2, 3];
const ref1 = data;
const ref2 = data;

ref1.push(4);
ref2.push(5);

console.log(data); // [1, 2, 3, 4, 5]
// 在 JS 中太自然了，但在 Rust 中需要 Rc<RefCell<T>> 的组合
```

### 14.8.3 构建共享可变链表

```rust
use std::rc::Rc;
use std::cell::RefCell;

#[derive(Debug)]
struct Node {
    value: i32,
    next: Option<Rc<RefCell<Node>>>,
}

impl Node {
    fn new(value: i32) -> Rc<RefCell<Node>> {
        Rc::new(RefCell::new(Node { value, next: None }))
    }
}

fn main() {
    // 创建节点
    let node1 = Node::new(1);
    let node2 = Node::new(2);
    let node3 = Node::new(3);

    // 连接：1 -> 2 -> 3
    node1.borrow_mut().next = Some(Rc::clone(&node2));
    node2.borrow_mut().next = Some(Rc::clone(&node3));

    // 遍历链表
    let mut current = Some(Rc::clone(&node1));
    while let Some(node) = current {
        let borrowed = node.borrow();
        print!("{}", borrowed.value);
        current = borrowed.next.as_ref().map(|n| Rc::clone(n));
        if current.is_some() {
            print!(" -> ");
        }
    }
    println!(); // 输出: 1 -> 2 -> 3

    // 修改节点 2 的值
    node2.borrow_mut().value = 20;

    // 通过 node1 遍历，可以看到修改
    let second = node1.borrow().next.as_ref().map(|n| Rc::clone(n));
    if let Some(node) = second {
        println!("修改后的第二个节点: {}", node.borrow().value); // 20
    }
}
```

### 14.8.4 多线程版本：`Arc<Mutex<T>>`

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Arc<Mutex<T>> 是多线程版的 Rc<RefCell<T>>
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("最终计数: {}", *counter.lock().unwrap()); // 10
}
```

智能指针组合速查：

```
┌─────────────────────────────────────────────────┐
│           单线程              多线程              │
│ ─────────────────────  ─────────────────────     │
│ 共享只读:  Rc<T>       共享只读:  Arc<T>         │
│ 共享可变:  Rc<RefCell>  共享可变:  Arc<Mutex>     │
│ 单所有可变: RefCell<T>  单所有可变: Mutex<T>      │
└─────────────────────────────────────────────────┘
```

---

## 14.9 循环引用与 `Weak<T>` —— 打破引用循环

### 14.9.1 循环引用导致内存泄漏

`Rc<T>` 有一个致命弱点：**循环引用会导致引用计数永远不会归零**，从而造成内存泄漏。

```rust
use std::rc::Rc;
use std::cell::RefCell;

#[derive(Debug)]
struct Node {
    value: i32,
    // 可选的下一个节点
    next: Option<Rc<RefCell<Node>>>,
}

impl Drop for Node {
    fn drop(&mut self) {
        println!("🗑️ 正在释放节点: {}", self.value);
    }
}

fn main() {
    let node_a = Rc::new(RefCell::new(Node { value: 1, next: None }));
    let node_b = Rc::new(RefCell::new(Node { value: 2, next: None }));

    // 创建循环引用：A -> B -> A -> B -> ...
    node_a.borrow_mut().next = Some(Rc::clone(&node_b));
    node_b.borrow_mut().next = Some(Rc::clone(&node_a));

    println!("node_a 引用计数: {}", Rc::strong_count(&node_a)); // 2
    println!("node_b 引用计数: {}", Rc::strong_count(&node_b)); // 2

    // 当 node_a 和 node_b 离开作用域：
    // node_a 引用计数从 2 → 1（node_b 还指向它）
    // node_b 引用计数从 2 → 1（node_a 还指向它）
    // 两个都不会归零 → 内存泄漏！
    // 你不会看到 "正在释放节点" 的输出！
}
```

内存泄漏图示：

```
node_a 离开作用域后：

    ┌─────────┐        ┌─────────┐
    │ Node(1) │───────→│ Node(2) │
    │ count=1 │←───────│ count=1 │
    └─────────┘        └─────────┘

    两个节点互相引用，引用计数永远不会归零
    → 内存泄漏！GC？Rust 没有 GC。
```

在 JavaScript 中，现代 GC（标记-清除算法）可以处理循环引用：

```javascript
// JavaScript - GC 能处理循环引用
let a = { value: 1 };
let b = { value: 2 };
a.next = b;
b.next = a; // 循环引用

a = null;
b = null;
// GC 发现 a 和 b 都不可达，会回收它们
// Rust 的 Rc 做不到这一点！
```

### 14.9.2 Weak<T> 来救场

`Weak<T>` 是一种**弱引用**——它不增加强引用计数，不会阻止值被释放：

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

#[derive(Debug)]
struct Node {
    value: i32,
    children: Vec<Rc<RefCell<Node>>>,     // 强引用：父 → 子
    parent: Option<Weak<RefCell<Node>>>,   // 弱引用：子 → 父
}

impl Drop for Node {
    fn drop(&mut self) {
        println!("🗑️ 释放节点: {}", self.value);
    }
}

fn main() {
    // 创建父节点
    let parent = Rc::new(RefCell::new(Node {
        value: 1,
        children: vec![],
        parent: None,
    }));

    // 创建子节点，弱引用指向父节点
    let child = Rc::new(RefCell::new(Node {
        value: 2,
        children: vec![],
        parent: Some(Rc::downgrade(&parent)), // 创建弱引用
    }));

    // 父节点强引用子节点
    parent.borrow_mut().children.push(Rc::clone(&child));

    // 查看引用计数
    println!("parent 强引用计数: {}", Rc::strong_count(&parent)); // 1（只有变量 parent）
    println!("parent 弱引用计数: {}", Rc::weak_count(&parent));   // 1（child 的弱引用）

    // 通过弱引用访问父节点
    let child_borrowed = child.borrow();
    if let Some(parent_weak) = &child_borrowed.parent {
        // upgrade() 尝试将 Weak 升级为 Rc
        // 如果原始值已被释放，返回 None
        match parent_weak.upgrade() {
            Some(parent_rc) => {
                println!("子节点 {} 的父节点是: {}",
                    child_borrowed.value,
                    parent_rc.borrow().value
                );
            }
            None => println!("父节点已被释放"),
        }
    }
}
// 输出:
// 🗑️ 释放节点: 1
// 🗑️ 释放节点: 2
// 没有内存泄漏！
```

### 14.9.3 Weak<T> 的关键 API

```rust
use std::rc::{Rc, Weak};

fn main() {
    let strong = Rc::new(42);

    // 从 Rc 创建 Weak
    let weak: Weak<i32> = Rc::downgrade(&strong);

    // upgrade：Weak → Option<Rc>
    assert_eq!(*weak.upgrade().unwrap(), 42);

    // 检查引用计数
    println!("强引用: {}", Rc::strong_count(&strong)); // 1
    println!("弱引用: {}", Rc::weak_count(&strong));   // 1

    // 释放强引用
    drop(strong);

    // 现在 upgrade 返回 None —— 数据已释放
    assert!(weak.upgrade().is_none());
    println!("数据已释放，weak.upgrade() = None");
}
```

### 14.9.4 用 Weak 实现树结构

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

#[derive(Debug)]
struct TreeNode {
    value: String,
    parent: RefCell<Weak<TreeNode>>,       // 子 → 父：弱引用
    children: RefCell<Vec<Rc<TreeNode>>>,   // 父 → 子：强引用
}

impl TreeNode {
    fn new(value: &str) -> Rc<TreeNode> {
        Rc::new(TreeNode {
            value: value.to_string(),
            parent: RefCell::new(Weak::new()),
            children: RefCell::new(vec![]),
        })
    }

    fn add_child(parent: &Rc<TreeNode>, child: &Rc<TreeNode>) {
        // 设置子节点的父引用（弱引用）
        *child.parent.borrow_mut() = Rc::downgrade(parent);
        // 添加到父节点的子列表（强引用）
        parent.children.borrow_mut().push(Rc::clone(child));
    }

    fn parent_value(&self) -> Option<String> {
        self.parent
            .borrow()
            .upgrade()
            .map(|p| p.value.clone())
    }
}

fn main() {
    let root = TreeNode::new("根节点");
    let child1 = TreeNode::new("子节点1");
    let child2 = TreeNode::new("子节点2");
    let grandchild = TreeNode::new("孙节点");

    TreeNode::add_child(&root, &child1);
    TreeNode::add_child(&root, &child2);
    TreeNode::add_child(&child1, &grandchild);

    // 从孙节点往上查找
    println!("孙节点的父节点: {:?}", grandchild.parent_value()); // Some("子节点1")

    // 从子节点1往上查找
    println!("子节点1的父节点: {:?}", child1.parent_value()); // Some("根节点")

    // 根节点没有父节点
    println!("根节点的父节点: {:?}", root.parent_value()); // None

    // 打印树的结构
    print_tree(&root, 0);
}

fn print_tree(node: &Rc<TreeNode>, depth: usize) {
    let indent = "  ".repeat(depth);
    println!("{}├── {}", indent, node.value);
    for child in node.children.borrow().iter() {
        print_tree(child, depth + 1);
    }
}
```

### 14.9.5 何时使用强引用 vs 弱引用

```
强引用（Rc/Arc）：表示"拥有"关系
  - 父节点 → 子节点
  - 集合 → 元素
  - 如果我还在，我引用的东西也必须在

弱引用（Weak）：表示"知道"关系
  - 子节点 → 父节点
  - 缓存 → 原始数据
  - 观察者 → 被观察对象
  - 如果原始数据释放了，我也不关心
```

---

## 14.10 智能指针总结与选型指南

### 14.10.1 完整对比

```
┌──────────────┬────────────┬─────────┬──────────┬───────────┐
│   类型        │ 所有权     │ 可变性  │ 线程安全 │ 运行时开销 │
├──────────────┼────────────┼─────────┼──────────┼───────────┤
│ Box<T>       │ 单一所有者 │ 可变    │ ✅       │ 堆分配    │
│ Rc<T>        │ 多个所有者 │ 不可变  │ ❌       │ 引用计数  │
│ Arc<T>       │ 多个所有者 │ 不可变  │ ✅       │ 原子计数  │
│ RefCell<T>   │ 单一所有者 │ 内部可变│ ❌       │ 运行时检查│
│ Mutex<T>     │ 单一所有者 │ 内部可变│ ✅       │ 锁        │
│ Cell<T>      │ 单一所有者 │ 内部可变│ ❌       │ 无        │
└──────────────┴────────────┴─────────┴──────────┴───────────┘
```

### 14.10.2 选型决策树

```
需要在堆上分配？
├── 是 → Box<T>
│
需要多个所有者？
├── 是 → 需要跨线程？
│         ├── 是 → Arc<T>
│         └── 否 → Rc<T>
│
│         需要可变？
│         ├── 是 → 跨线程？
│         │        ├── 是 → Arc<Mutex<T>>
│         │        └── 否 → Rc<RefCell<T>>
│         └── 否 → 直接用 Rc/Arc
│
└── 否 → 需要内部可变性？
          ├── 是 → Copy 类型？
          │        ├── 是 → Cell<T>
          │        └── 否 → RefCell<T>
          └── 否 → 用普通引用 &T / &mut T
```

---

## 14.11 练习题

### 练习 1：用 Box 实现二叉搜索树

```rust
// 实现一个二叉搜索树，支持插入和查找
// 提示：
// enum BST<T> {
//     Empty,
//     Node { value: T, left: Box<BST<T>>, right: Box<BST<T>> },
// }
// 实现 insert(&mut self, value: T) 和 contains(&self, value: &T) -> bool
```

### 练习 2：自定义智能指针

```rust
// 实现一个 LogBox<T>，它在创建和销毁时打印日志
// 要求：
// 1. 实现 Deref 和 DerefMut
// 2. 实现 Drop
// 3. 测试自动解引用是否工作
```

### 练习 3：Rc<RefCell<T>> 实现双向链表

```rust
// 实现一个双向链表，支持：
// - push_front / push_back
// - pop_front / pop_back
// - print_forward / print_backward
// 提示：使用 Rc<RefCell<Node>> 存储 next，Weak<RefCell<Node>> 存储 prev
```

### 练习 4：用 Weak 打破循环引用

```rust
// 场景：学生和课程的多对多关系
// - Student { name, courses: Vec<???> }
// - Course { name, students: Vec<???> }
// 思考：Student 和 Course 互相引用，如何避免内存泄漏？
// 提示：一方用 Rc，另一方用 Weak
```

### 练习 5：实现一个简单的缓存

```rust
// 使用 Rc 和 Weak 实现一个缓存系统：
// - Cache 持有 Weak 引用
// - 当原始数据存在时，cache.get() 返回数据
// - 当原始数据被释放时，cache.get() 返回 None
//
// struct Cache<T> {
//     data: Weak<T>,
// }
// impl<T> Cache<T> {
//     fn new(data: &Rc<T>) -> Self { ... }
//     fn get(&self) -> Option<Rc<T>> { ... }
// }
```

---

## 14.12 本章小结

在本章中，我们深入学习了 Rust 的智能指针系统：

1. **`Box<T>`** —— 最简单的堆分配智能指针，用于递归类型和大数据
2. **`Deref` trait** —— 让智能指针像普通引用一样使用，支持自动解引用链
3. **`Drop` trait** —— RAII 的基石，确保资源在离开作用域时自动清理
4. **`Rc<T>`** —— 单线程引用计数，实现多所有者共享
5. **`Arc<T>`** —— `Rc` 的线程安全版本，使用原子操作
6. **`RefCell<T>`** —— 运行时借用检查，提供内部可变性
7. **`Rc<RefCell<T>>`** —— 多所有者 + 可变性的黄金组合
8. **`Weak<T>`** —— 弱引用，打破循环引用，防止内存泄漏

> 💡 **给 JavaScript 开发者的总结：**
> JavaScript 的 GC 自动处理了所有这些问题——共享引用、循环引用、内存释放。
> 但代价是 GC 暂停、不可预测的内存释放时机、以及对内存使用的较少控制。
> Rust 的智能指针给了你**精确的控制**，同时通过类型系统保证安全。
> 一开始会觉得麻烦，但一旦掌握，你会爱上这种确定性。

下一章，我们将学习 Rust 的并发编程——这是 Rust 最闪耀的领域之一！
