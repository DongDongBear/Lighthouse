# 第二十三章：高级类型系统 —— 让类型为你工作

> **本章目标**
>
> - 理解关联类型与泛型的区别及使用场景
> - 掌握默认泛型参数简化 API 的技巧
> - 学会完全限定语法解决方法名冲突
> - 深入 Newtype 模式的多种应用
> - 了解类型别名提升代码可读性
> - 理解 Never 类型（`!`）和发散函数
> - 掌握动态大小类型（DST）的原理和使用

> **预计学习时间：90 - 120 分钟**（类型系统是 Rust 表达力的核心，值得细细品味）

---

## 23.1 关联类型（Associated Types）

### 23.1.1 从泛型 trait 说起

在 TypeScript 中，你可能写过这样的泛型接口：

```typescript
// TypeScript - 泛型接口
interface Iterator<T> {
    next(): T | undefined;
}

// 实现时指定具体类型
class NumberIterator implements Iterator<number> {
    next(): number | undefined {
        return 42;
    }
}
```

Rust 的 `Iterator` trait 用的不是泛型参数，而是**关联类型**：

```rust
// 标准库中的 Iterator trait（简化版）
trait Iterator {
    type Item;  // 这就是关联类型

    fn next(&mut self) -> Option<Self::Item>;
}
```

### 23.1.2 关联类型 vs 泛型参数

为什么不直接用泛型？来看看区别：

```rust
// 方案 A：用泛型参数
trait GenericIterator<T> {
    fn next(&mut self) -> Option<T>;
}

// 问题：同一个类型可以多次实现这个 trait！
struct MyStruct;

impl GenericIterator<i32> for MyStruct {
    fn next(&mut self) -> Option<i32> { Some(42) }
}

impl GenericIterator<String> for MyStruct {
    fn next(&mut self) -> Option<String> { Some("hello".to_string()) }
}

// 使用时必须指定类型，编译器无法推断
fn use_generic(iter: &mut MyStruct) {
    // let val = iter.next();  // ❌ 编译器不知道你要哪个实现
    let val: Option<i32> = GenericIterator::<i32>::next(iter);  // 必须显式指定
}
```

```rust
// 方案 B：用关联类型
trait AssocIterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}

struct MyStruct;

// 一个类型只能实现一次！Item 是确定的
impl AssocIterator for MyStruct {
    type Item = i32;  // 关联类型在此确定
    fn next(&mut self) -> Option<i32> { Some(42) }
}

// 使用时不需要指定类型
fn use_assoc(iter: &mut MyStruct) {
    let val = iter.next();  // ✅ 编译器知道是 Option<i32>
}
```

```
┌──────────────────────────────────────────────────────────┐
│          泛型参数 vs 关联类型 —— 何时用哪个？               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  泛型参数 trait Foo<T>：                                  │
│  ├─ 同一类型可以多次实现（不同的 T）                        │
│  ├─ 使用时需要指定具体类型                                 │
│  ├─ 适合：一个类型需要支持多种变体                          │
│  └─ 例子：From<T>、Add<Rhs>                              │
│                                                          │
│  关联类型 trait Foo { type Bar; }：                       │
│  ├─ 同一类型只能实现一次                                   │
│  ├─ 使用时不需要指定类型（自动推断）                        │
│  ├─ 适合：类型与 trait 之间有唯一确定的关系                  │
│  └─ 例子：Iterator、Deref、IntoIterator                   │
│                                                          │
│  经验法则：如果类型只有一种合理的实现，用关联类型              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 23.1.3 关联类型的实际应用

```rust
// 自定义一个图数据结构的 trait
trait Graph {
    type Node;
    type Edge;

    fn nodes(&self) -> Vec<Self::Node>;
    fn edges(&self) -> Vec<Self::Edge>;
    fn neighbors(&self, node: &Self::Node) -> Vec<Self::Node>;
    fn add_edge(&mut self, from: Self::Node, to: Self::Node) -> Self::Edge;
}

// 实现一个简单的邻接表图
struct AdjacencyList {
    edges: Vec<(usize, usize)>,
    node_count: usize,
}

impl Graph for AdjacencyList {
    type Node = usize;       // 节点就是索引
    type Edge = (usize, usize);  // 边就是一对索引

    fn nodes(&self) -> Vec<usize> {
        (0..self.node_count).collect()
    }

    fn edges(&self) -> Vec<(usize, usize)> {
        self.edges.clone()
    }

    fn neighbors(&self, node: &usize) -> Vec<usize> {
        self.edges.iter()
            .filter(|(from, _)| from == node)
            .map(|(_, to)| *to)
            .collect()
    }

    fn add_edge(&mut self, from: usize, to: usize) -> (usize, usize) {
        let edge = (from, to);
        self.edges.push(edge);
        edge
    }
}

// 泛型函数：适用于任何图实现
fn count_edges<G: Graph>(graph: &G) -> usize {
    graph.edges().len()
}
```

### 23.1.4 关联类型的约束

你可以在使用关联类型时添加约束：

```rust
use std::fmt::Display;

// 要求 Item 必须实现 Display
fn print_all<I>(iter: I)
where
    I: Iterator,
    I::Item: Display,  // 约束关联类型
{
    for item in iter {
        println!("{}", item);
    }
}

// 也可以这样写
fn print_all_v2<I: Iterator<Item = String>>(iter: I) {
    for item in iter {
        println!("{}", item);
    }
}

fn main() {
    let numbers = vec![1, 2, 3];
    print_all(numbers.iter());  // Item = &i32，实现了 Display ✅

    let names = vec!["Alice".to_string(), "Bob".to_string()];
    print_all_v2(names.into_iter());  // Item = String ✅
}
```

### 23.1.5 关联常量和关联函数

trait 不仅可以有关联类型，还可以有关联常量：

```rust
trait Bounded {
    const MIN: Self;
    const MAX: Self;
}

impl Bounded for i32 {
    const MIN: i32 = i32::MIN;
    const MAX: i32 = i32::MAX;
}

impl Bounded for u8 {
    const MIN: u8 = 0;
    const MAX: u8 = 255;
}

fn print_range<T: Bounded + std::fmt::Display>() {
    println!("范围: {} 到 {}", T::MIN, T::MAX);
}

fn main() {
    print_range::<i32>();  // 范围: -2147483648 到 2147483647
    print_range::<u8>();   // 范围: 0 到 255
}
```

---

## 23.2 默认泛型参数

### 23.2.1 什么是默认泛型参数？

类似于 TypeScript 的默认泛型参数，Rust 也可以给泛型参数设默认值：

```typescript
// TypeScript - 默认泛型参数
interface Container<T = string> {
    value: T;
}

const c1: Container = { value: "hello" };        // T 默认为 string
const c2: Container<number> = { value: 42 };      // 指定 T 为 number
```

```rust
// Rust - 默认泛型参数
struct Container<T = String> {
    value: T,
}

fn main() {
    let c1: Container = Container { value: "hello".to_string() }; // T 默认为 String
    let c2: Container<i32> = Container { value: 42 };              // 指定 T 为 i32
}
```

### 23.2.2 标准库中的经典案例：Add trait

`Add` trait 使用了默认泛型参数：

```rust
// 标准库定义（简化版）
trait Add<Rhs = Self> {  // Rhs 默认为 Self
    type Output;
    fn add(self, rhs: Rhs) -> Self::Output;
}
```

```rust
use std::ops::Add;

#[derive(Debug, Clone, Copy)]
struct Point {
    x: f64,
    y: f64,
}

// 实现 Point + Point（Rhs 使用默认值 Self）
impl Add for Point {
    type Output = Point;

    fn add(self, other: Point) -> Point {
        Point {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

// 实现 Point + (f64, f64)（Rhs 指定为元组）
impl Add<(f64, f64)> for Point {
    type Output = Point;

    fn add(self, (dx, dy): (f64, f64)) -> Point {
        Point {
            x: self.x + dx,
            y: self.y + dy,
        }
    }
}

fn main() {
    let p1 = Point { x: 1.0, y: 2.0 };
    let p2 = Point { x: 3.0, y: 4.0 };

    let p3 = p1 + p2;           // Point + Point
    println!("{:?}", p3);        // Point { x: 4.0, y: 6.0 }

    let p4 = p1 + (10.0, 20.0); // Point + (f64, f64)
    println!("{:?}", p4);        // Point { x: 11.0, y: 22.0 }
}
```

### 23.2.3 实际应用：可配置的 HashMap

```rust
use std::collections::HashMap;
use std::hash::{BuildHasher, BuildHasherDefault, Hasher};

// HashMap 的完整签名：
// pub struct HashMap<K, V, S = RandomState>
// S 是哈希策略，默认是 RandomState（随机种子，防 HashDoS）

// 如果你不需要防 DoS 攻击，可以用更快的哈希函数
// 比如 FxHash（需要 rustc-hash crate）

fn main() {
    // 使用默认的 RandomState
    let map1: HashMap<String, i32> = HashMap::new();

    // 或者显式指定哈希策略
    // let map2: HashMap<String, i32, SomeCustomHasher> = ...;
}
```

### 23.2.4 默认泛型参数的使用场景

```
┌──────────────────────────────────────────────────────┐
│        默认泛型参数的典型使用场景                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. 运算符重载（Add<Rhs=Self>）                       │
│     - 大多数情况下操作数类型相同                        │
│     - 但有时需要不同类型（如 Duration + Instant）       │
│                                                      │
│  2. 策略模式（HashMap<K, V, S=RandomState>）           │
│     - 提供合理的默认策略                               │
│     - 允许高级用户替换策略                              │
│                                                      │
│  3. 向后兼容                                          │
│     - 给现有泛型添加新的类型参数时                      │
│     - 设置默认值不会破坏已有代码                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 23.3 完全限定语法（Fully Qualified Syntax）

### 23.3.1 问题：方法名冲突

当一个类型实现了多个 trait，而这些 trait 有同名方法时，怎么办？

```rust
trait Pilot {
    fn fly(&self);
}

trait Wizard {
    fn fly(&self);
}

struct Human;

impl Pilot for Human {
    fn fly(&self) {
        println!("机长向你报告：一切正常！");
    }
}

impl Wizard for Human {
    fn fly(&self) {
        println!("飞起来了！🧙‍♂️");
    }
}

impl Human {
    fn fly(&self) {
        println!("人类使劲扇动双臂 🙈");
    }
}

fn main() {
    let person = Human;

    // 默认调用类型自身的方法
    person.fly();  // 人类使劲扇动双臂

    // 要调用 trait 的方法，需要明确指定
    Pilot::fly(&person);   // 机长向你报告：一切正常！
    Wizard::fly(&person);  // 飞起来了！
}
```

### 23.3.2 关联函数的歧义

对于没有 `self` 参数的关联函数，情况更复杂：

```rust
trait Animal {
    fn baby_name() -> String;
}

struct Dog;

impl Dog {
    fn baby_name() -> String {
        String::from("小狗狗 🐕")
    }
}

impl Animal for Dog {
    fn baby_name() -> String {
        String::from("汪星人幼崽 🐶")
    }
}

fn main() {
    println!("{}", Dog::baby_name());        // 小狗狗 —— 调用的是 Dog 自身的方法
    // println!("{}", Animal::baby_name());  // ❌ 编译错误：不知道是哪个类型的实现

    // 完全限定语法：<Type as Trait>::method()
    println!("{}", <Dog as Animal>::baby_name());  // 汪星人幼崽 ✅
}
```

### 23.3.3 完全限定语法的一般形式

```rust
// 完全限定语法
// <Type as Trait>::function(receiver_if_method, args...)

trait Foo {
    fn bar(&self) -> String;
    fn baz() -> String;
}

struct MyType;

impl Foo for MyType {
    fn bar(&self) -> String { "Foo::bar".to_string() }
    fn baz() -> String { "Foo::baz".to_string() }
}

fn main() {
    let x = MyType;

    // 以下三种写法等价
    x.bar();
    Foo::bar(&x);
    <MyType as Foo>::bar(&x);

    // 关联函数只能用完全限定语法
    <MyType as Foo>::baz();
}
```

对比 TypeScript —— TS 没有这个问题，因为接口实现不会有名称冲突：

```typescript
// TypeScript - 没有 trait/interface 方法冲突的问题
// 因为 TS 的 interface 只是类型检查，不提供实现
interface Pilot {
    fly(): void;
}
interface Wizard {
    fly(): void;
}

// 一个类只有一个 fly() 实现
class Human implements Pilot, Wizard {
    fly() {
        console.log("只有一个 fly");
    }
}
```

---

## 23.4 Newtype 模式

### 23.4.1 什么是 Newtype？

Newtype 模式是用一个元组结构体包装现有类型，创建一个语义上不同的新类型：

```rust
// 基本语法
struct Meters(f64);
struct Seconds(f64);
struct Kilometers(f64);

fn main() {
    let distance = Meters(100.0);
    let time = Seconds(9.58);

    // 不能直接混用！虽然底层都是 f64
    // let wrong = distance + time;  // ❌ 编译错误

    // 必须显式转换
    let speed = distance.0 / time.0;
    println!("速度: {:.2} m/s", speed);
}
```

### 23.4.2 Newtype 的用途一：类型安全

```rust
// 用 Newtype 防止参数顺序错误
struct UserId(u64);
struct OrderId(u64);

fn process_order(user: UserId, order: OrderId) {
    println!("用户 {} 的订单 {}", user.0, order.0);
}

fn main() {
    let user = UserId(42);
    let order = OrderId(100);

    process_order(user, order);  // ✅ 正确
    // process_order(order, user);  // ❌ 编译错误！类型不匹配
}
```

对比 TypeScript —— TS 的 branded types 实现类似效果：

```typescript
// TypeScript - branded types（但这只是类型层面的，运行时没有保护）
type UserId = number & { __brand: 'UserId' };
type OrderId = number & { __brand: 'OrderId' };

function createUserId(id: number): UserId {
    return id as UserId;
}

function processOrder(user: UserId, order: OrderId) {
    // ...
}
```

### 23.4.3 Newtype 的用途二：绕过孤儿规则

Rust 的孤儿规则（orphan rule）禁止为外部类型实现外部 trait。Newtype 可以绕过这个限制：

```rust
use std::fmt;

// ❌ 不能直接为 Vec 实现 Display（两者都是外部的）
// impl fmt::Display for Vec<String> { ... }

// ✅ 用 Newtype 包装后就可以了
struct Wrapper(Vec<String>);

impl fmt::Display for Wrapper {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "[{}]", self.0.join(", "))
    }
}

fn main() {
    let w = Wrapper(vec!["hello".to_string(), "world".to_string()]);
    println!("{}", w);  // [hello, world]
}
```

### 23.4.4 Newtype 的用途三：隐藏内部实现

```rust
// 对外只暴露有限的 API
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn new(email: &str) -> Result<Self, String> {
        // 验证邮箱格式
        if email.contains('@') && email.contains('.') {
            Ok(EmailAddress(email.to_string()))
        } else {
            Err(format!("无效的邮箱地址: {}", email))
        }
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    // 不提供 into_inner() —— 外部代码无法直接访问内部 String
    // 这确保所有 EmailAddress 都经过了验证
}

fn send_email(to: &EmailAddress, subject: &str) {
    println!("发送邮件到 {}: {}", to.as_str(), subject);
}

fn main() {
    let email = EmailAddress::new("user@example.com").unwrap();
    send_email(&email, "你好！");

    // 无法构造未验证的 EmailAddress
    // let bad = EmailAddress("not-an-email".to_string());  // ❌ 字段是私有的
}
```

### 23.4.5 用 Deref 让 Newtype 透明使用

如果你希望 Newtype 可以像底层类型一样使用，可以实现 `Deref`：

```rust
use std::ops::Deref;

struct NonEmptyString(String);

impl NonEmptyString {
    fn new(s: &str) -> Option<Self> {
        if s.is_empty() {
            None
        } else {
            Some(NonEmptyString(s.to_string()))
        }
    }
}

impl Deref for NonEmptyString {
    type Target = str;

    fn deref(&self) -> &str {
        &self.0
    }
}

fn main() {
    let name = NonEmptyString::new("动动").unwrap();

    // 因为实现了 Deref，可以像 &str 一样使用
    println!("名字长度: {}", name.len());         // 调用 str::len()
    println!("大写: {}", name.to_uppercase());     // 调用 str::to_uppercase()
    println!("包含'动': {}", name.contains('动')); // 调用 str::contains()
}
```

### 23.4.6 零成本抽象

Newtype 是真正的零成本抽象 —— 编译器会完全优化掉包装层：

```rust
// 在内存中，Meters(f64) 和 f64 的布局完全一样
// 没有任何运行时开销！
#[repr(transparent)]  // 确保与内部类型有相同的内存布局
struct Meters(f64);

// 使用 #[repr(transparent)] 后甚至可以安全地在 FFI 中使用
```

---

## 23.5 类型别名（Type Aliases）

### 23.5.1 基本用法

类型别名为现有类型创建一个新名字，但**不创建新类型**：

```rust
// 类型别名
type Kilometers = i32;
type Meters = i32;

fn main() {
    let km: Kilometers = 42;
    let m: Meters = 1000;

    // 注意：别名和原类型可以互相混用！
    // 这与 Newtype 不同
    let total: i32 = km + m;  // ✅ 编译通过，因为都是 i32
    println!("总计: {} 米", total);
}
```

对比 TypeScript 的 `type` 关键字：

```typescript
// TypeScript - type alias（同样只是别名，不创建新类型）
type Kilometers = number;
type Meters = number;

const km: Kilometers = 42;
const m: Meters = 1000;
const total: number = km + m;  // ✅ 因为都是 number
```

### 23.5.2 简化复杂类型

类型别名最大的价值是简化冗长的类型签名：

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// 没有别名 —— 看看这个类型有多长
fn get_cache() -> Arc<Mutex<HashMap<String, Vec<(i32, String, bool)>>>> {
    Arc::new(Mutex::new(HashMap::new()))
}

// 用类型别名简化
type Cache = Arc<Mutex<HashMap<String, Vec<(i32, String, bool)>>>>;

fn get_cache_v2() -> Cache {
    Arc::new(Mutex::new(HashMap::new()))
}

// 标准库中的经典例子：io::Result
// type Result<T> = std::result::Result<T, std::io::Error>;
// 这就是为什么 std::io 的函数返回 io::Result<T> 而不是 Result<T, io::Error>
```

```rust
use std::io;

// 使用 io::Result<T>（类型别名）
fn read_file(path: &str) -> io::Result<String> {
    std::fs::read_to_string(path)
}

// 等价于
fn read_file_full(path: &str) -> Result<String, io::Error> {
    std::fs::read_to_string(path)
}
```

### 23.5.3 泛型类型别名

```rust
// 泛型别名
type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

// 使用
fn do_something() -> Result<i32> {
    Ok(42)
}

// 带生命周期的别名
type StrRef<'a> = &'a str;

// 在 trait 中使用
type Callback = Box<dyn Fn(i32) -> i32>;

fn apply(callback: &Callback, value: i32) -> i32 {
    callback(value)
}
```

### 23.5.4 类型别名 vs Newtype —— 如何选择？

```
┌────────────────────────────────────────────────────────┐
│           类型别名 vs Newtype 对比                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  类型别名（type Foo = Bar）：                            │
│  ├─ 不创建新类型，只是另一个名字                          │
│  ├─ 可以与原类型互相混用                                 │
│  ├─ 目的：简化冗长的类型签名                              │
│  ├─ 没有运行时开销                                      │
│  └─ 不能为别名单独实现 trait                             │
│                                                        │
│  Newtype（struct Foo(Bar)）：                           │
│  ├─ 创建全新的类型                                      │
│  ├─ 不能与原类型混用（类型安全）                          │
│  ├─ 目的：类型安全、绕过孤儿规则、封装                     │
│  ├─ 没有运行时开销（零成本抽象）                          │
│  └─ 可以为 Newtype 实现任何 trait                        │
│                                                        │
│  经验法则：                                              │
│  需要类型安全 → Newtype                                 │
│  只想缩短类型名 → 类型别名                               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 23.6 Never 类型与发散函数

### 23.6.1 什么是 Never 类型（`!`）？

`!` 是 Rust 的 "never" 类型，表示一个永远不会产生值的类型。这在 TypeScript 中也有对应：

```typescript
// TypeScript 的 never 类型
function throwError(msg: string): never {
    throw new Error(msg);
}

function infiniteLoop(): never {
    while (true) {}
}
```

```rust
// Rust 的 ! 类型（目前是 nightly 特性，但概念已广泛使用）
fn panic_now() -> ! {
    panic!("永远不会返回！");
}

fn infinite_loop() -> ! {
    loop {
        // 永远不会结束
    }
}
```

### 23.6.2 Never 类型在 match 中的应用

`!` 类型可以强制转换为任何类型，这在 `match` 表达式中非常有用：

```rust
fn main() {
    // match 的每个分支必须返回相同类型
    // 但 panic! 返回 !，可以"假装"是任何类型
    let value: i32 = match "42".parse::<i32>() {
        Ok(n) => n,           // 返回 i32
        Err(_) => panic!("解析失败"),  // 返回 !，可以当作 i32
    };

    // continue 也是 ! 类型
    let numbers = vec!["1", "two", "3", "four", "5"];
    let parsed: Vec<i32> = numbers.iter()
        .map(|s| match s.parse::<i32>() {
            Ok(n) => n,
            Err(_) => {
                println!("跳过无效值: {}", s);
                // 注意这里不能 return，因为这是闭包
                // 但我们可以用其他方式处理
                0  // 用默认值替代
            }
        })
        .collect();
    println!("{:?}", parsed);
}
```

```rust
// loop 的返回类型也是 !（如果没有 break）
fn read_input() -> String {
    loop {
        let mut input = String::new();
        match std::io::stdin().read_line(&mut input) {
            Ok(_) => {
                let trimmed = input.trim().to_string();
                if !trimmed.is_empty() {
                    return trimmed;  // break with value
                }
                println!("输入不能为空，请重试");
            }
            Err(e) => {
                println!("读取错误: {}，请重试", e);
            }
        }
    }
    // loop 没有 break 时返回 !
    // 但这个 loop 有 return，所以返回 String
}
```

### 23.6.3 ! 类型的实际应用

```rust
// 标准库中使用 ! 的地方

// 1. process::exit - 永远不会返回
// pub fn exit(code: i32) -> !

// 2. Infallible - 永远不会出错的错误类型
use std::convert::Infallible;

// 从 &str 到 String 的转换永远不会失败
// impl FromStr for String {
//     type Err = Infallible;
//     ...
// }

// 3. 在 Result 中使用 Infallible
fn never_fails() -> Result<i32, Infallible> {
    Ok(42)
}

fn main() {
    // 因为错误类型是 Infallible，unwrap 永远不会 panic
    let value = never_fails().unwrap();
    println!("{}", value);

    // 甚至不需要处理 Err 分支
    match never_fails() {
        Ok(v) => println!("值: {}", v),
        Err(e) => match e {},  // 空 match，因为 Infallible 没有值
    }
}
```

### 23.6.4 发散函数（Diverging Functions）

返回 `!` 的函数被称为发散函数 —— 它们永远不会正常返回：

```rust
// 常见的发散函数
fn unimplemented_feature() -> ! {
    todo!("这个功能还没实现")
}

fn abort_with_message(msg: &str) -> ! {
    eprintln!("致命错误: {}", msg);
    std::process::exit(1)
}

// 在 trait 的默认实现中很有用
trait Handler {
    fn handle(&self) -> String {
        todo!()  // 返回 !，但可以当作 String
    }
}
```

---

## 23.7 动态大小类型（DST）

### 23.7.1 什么是 DST？

大多数 Rust 类型在编译时就知道大小，但有些类型的大小只有在运行时才知道。这些就是**动态大小类型（Dynamically Sized Types，DST）**：

```rust
fn main() {
    // 编译时已知大小的类型
    let x: i32 = 42;               // 4 字节
    let y: [i32; 5] = [1,2,3,4,5]; // 20 字节
    let z: (i32, f64) = (1, 2.0);  // 12 字节（4 + 8）

    // 编译时未知大小的类型（DST）
    // let s: str = ???;   // ❌ str 的大小未知！
    // let a: [i32] = ???; // ❌ [i32] 的大小未知！
}
```

### 23.7.2 `str` 和 `[T]` 是 DST

```
┌──────────────────────────────────────────────────────────┐
│                  DST 的内存布局                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  普通类型（Sized）：                                       │
│  i32 → 栈上 4 字节                                       │
│  ┌──────┐                                                │
│  │  42  │                                                │
│  └──────┘                                                │
│                                                          │
│  DST 引用（胖指针）：                                      │
│  &str → 栈上 16 字节（指针 8 + 长度 8）                    │
│  ┌──────────┬──────────┐     ┌───────────────┐           │
│  │ 指针 ptr │ 长度 len │ ──→ │ H e l l o     │（堆上）    │
│  └──────────┴──────────┘     └───────────────┘           │
│                                                          │
│  &[i32] → 栈上 16 字节（指针 8 + 长度 8）                  │
│  ┌──────────┬──────────┐     ┌──┬──┬──┬──┬──┐           │
│  │ 指针 ptr │ 长度 len │ ──→ │1 │2 │3 │4 │5 │（堆上）    │
│  └──────────┴──────────┘     └──┴──┴──┴──┴──┘           │
│                                                          │
│  &dyn Trait → 栈上 16 字节（数据指针 8 + vtable 指针 8）    │
│  ┌──────────┬──────────┐                                 │
│  │ data ptr │ vtbl ptr │                                 │
│  └──────────┴──────────┘                                 │
│       │            │                                     │
│       ▼            ▼                                     │
│   [数据]      [虚函数表]                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 23.7.3 Sized trait

Rust 中有一个特殊的 trait `Sized`，表示编译时大小已知。大多数泛型都隐式要求 `T: Sized`：

```rust
// 这两个函数签名是等价的
fn foo<T>(x: T) {}
fn bar<T: Sized>(x: T) {}

// 如果你想接受 DST，需要显式取消 Sized 约束
fn accept_dst<T: ?Sized>(x: &T) {
    // T 可能是 DST，所以只能通过引用使用
}

fn main() {
    accept_dst("hello");      // T = str（DST）
    accept_dst(&42);          // T = i32（Sized）
    accept_dst(&[1, 2, 3]);   // T = [i32; 3]（Sized）

    let slice: &[i32] = &[1, 2, 3];
    accept_dst(slice);         // T = [i32]（DST）
}
```

### 23.7.4 `?Sized` 约束的实际应用

```rust
use std::fmt::Display;

// 接受任何可显示的类型（包括 DST 如 str）
fn print_it<T: Display + ?Sized>(value: &T) {
    println!("{}", value);
}

fn main() {
    print_it("hello");    // T = str（DST）
    print_it(&42);        // T = i32（Sized）
    print_it(&3.14);      // T = f64（Sized）
}
```

```rust
// 标准库中的 ?Sized 使用
// Borrow trait 使用 ?Sized 来支持 DST
// pub trait Borrow<Borrowed: ?Sized> {
//     fn borrow(&self) -> &Borrowed;
// }

// 这就是为什么 String 可以借用为 &str
// impl Borrow<str> for String { ... }
```

### 23.7.5 用 Box 存储 DST

```rust
fn main() {
    // Box<dyn Trait> - trait 对象是 DST
    let printable: Box<dyn std::fmt::Display> = Box::new(42);
    println!("{}", printable);

    // Box<str> - 堆上分配的字符串切片
    let boxed_str: Box<str> = "hello world".into();
    println!("{}", boxed_str);

    // Box<[i32]> - 堆上分配的整数切片
    let boxed_slice: Box<[i32]> = vec![1, 2, 3].into_boxed_slice();
    println!("{:?}", boxed_slice);
}
```

---

## 23.8 高级 trait 技巧汇总

### 23.8.1 Supertraits（父 trait）

```rust
use std::fmt;

// Display 是 PrettyPrint 的 supertrait
// 实现 PrettyPrint 的类型必须先实现 Display
trait PrettyPrint: fmt::Display {
    fn pretty_print(&self) {
        println!("╔══════════════════╗");
        println!("║ {} ║", self);  // 这里可以用 {}，因为有 Display
        println!("╚══════════════════╝");
    }
}

#[derive(Debug)]
struct Point {
    x: f64,
    y: f64,
}

// 必须先实现 Display
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// 然后才能实现 PrettyPrint
impl PrettyPrint for Point {}

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    p.pretty_print();
}
```

### 23.8.2 在泛型函数中使用多个 trait 约束

```rust
use std::fmt::{Display, Debug};
use std::hash::Hash;

// 多种写法
fn method1<T: Display + Debug + Clone>(item: T) {
    println!("{} {:?}", item, item);
}

// where 子句更清晰
fn method2<T>(item: T)
where
    T: Display + Debug + Clone + Hash,
{
    println!("{} {:?}", item, item);
}

// 返回 impl Trait
fn make_printable() -> impl Display + Debug {
    42  // i32 实现了 Display 和 Debug
}
```

---

## 23.9 实战练习

### 练习 1：实现一个类型安全的单位系统

```rust
// 使用 Newtype 模式实现长度单位，防止不同单位的值混合计算

struct Meters(f64);
struct Kilometers(f64);
struct Miles(f64);

// TODO: 为每种类型实现以下功能
// 1. impl Add for Meters（Meters + Meters = Meters）
// 2. impl From<Kilometers> for Meters（千米转米）
// 3. impl From<Miles> for Meters（英里转米）
// 4. impl Display for 每种类型

fn main() {
    let m1 = Meters(100.0);
    let m2 = Meters(200.0);
    let m3 = m1 + m2;
    println!("{}", m3);  // 300.00 m

    let km = Kilometers(1.5);
    let m4: Meters = km.into();
    println!("{}", m4);  // 1500.00 m

    let mi = Miles(1.0);
    let m5: Meters = mi.into();
    println!("{}", m5);  // 1609.34 m
}
```

### 练习 2：实现自定义 Iterator

```rust
// 实现一个斐波那契数列迭代器
struct Fibonacci {
    a: u64,
    b: u64,
}

// TODO: 实现 Iterator trait，关联类型 Item = u64
// TODO: 实现 new() 方法
// TODO: 添加一个 take_while_less_than(max: u64) 方法

fn main() {
    let fib = Fibonacci::new();

    // 打印前 10 个斐波那契数
    let first_10: Vec<u64> = fib.take(10).collect();
    println!("{:?}", first_10);
    // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
}
```

### 练习 3：使用完全限定语法

```rust
trait Chinese {
    fn greeting(&self) -> &str;
    fn name() -> &'static str;
}

trait English {
    fn greeting(&self) -> &str;
    fn name() -> &'static str;
}

struct Person;

impl Chinese for Person {
    fn greeting(&self) -> &str { "你好！" }
    fn name() -> &'static str { "中文" }
}

impl English for Person {
    fn greeting(&self) -> &str { "Hello!" }
    fn name() -> &'static str { "English" }
}

impl Person {
    fn greeting(&self) -> &str { "Hey!" }
    fn name() -> &'static str { "Person" }
}

fn main() {
    let p = Person;

    // TODO: 分别调用三个 greeting 方法和三个 name 方法
    // 提示：使用完全限定语法 <Type as Trait>::method()
}
```

### 练习 4：思考题

1. 为什么 `Iterator` 使用关联类型而不是泛型参数？如果改成泛型会有什么问题？
2. `type Thunk = Box&lt;dyn Fn() + Send + 'static&gt;` 这个类型别名中每个部分的含义是什么？
3. 为什么 `str` 是 DST 而 `String` 不是？它们在内存布局上有什么区别？
4. Newtype 模式的 `#[repr(transparent)]` 有什么作用？什么场景下必须使用？
5. `!` 类型为什么可以强制转换为任何类型？这在数学上叫什么？

---

## 23.10 本章小结

```
┌──────────────────────────────────────────────────────┐
│              高级类型系统小结                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  关联类型：一个类型对一个 trait 只有一种实现              │
│  默认泛型参数：简化常见用法，保留灵活性                  │
│  完全限定语法：解决方法名冲突                           │
│  Newtype：类型安全 + 绕过孤儿规则 + 封装                │
│  类型别名：简化长类型名（不创建新类型）                  │
│  Never 类型：表示永远不会产生的值                       │
│  DST：运行时才知道大小，通过胖指针使用                   │
│                                                      │
│  记住：Rust 的类型系统是你的朋友！                      │
│  越多的信息编码在类型中，编译器能帮你发现越多的 bug       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

> **下一章预告：** 第二十四章我们将深入 Tokio 异步运行时 —— 对比 Node.js 的事件循环，理解 Rust 异步编程的底层机制！
