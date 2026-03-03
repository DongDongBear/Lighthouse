# 第十章：泛型与 Trait —— Rust 的多态核心

> **本章目标**
>
> - 理解泛型函数、结构体、枚举的定义与使用
> - 掌握 Trait 的定义、实现与作用（对比 TypeScript interface）
> - 理解 Trait bound 与泛型约束（对比 TypeScript extends）
> - 熟练使用常用标准 Trait：Display, Debug, Clone, Copy, PartialEq, Default, From/Into
> - 理解 Trait 对象与动态分发（dyn Trait）
> - 掌握孤儿规则及其解决方案
> - 能够设计可复用的泛型 API

> **预计学习时间：120 - 150 分钟**

---

## 10.1 为什么需要泛型？

假设你要写一个函数，找出两个整数中较大的那个：

```rust
fn max_i32(a: i32, b: i32) -> i32 {
    if a > b { a } else { b }
}
```

然后你又需要比较两个 `f64`：

```rust
fn max_f64(a: f64, b: f64) -> f64 {
    if a > b { a } else { b }
}
```

再来一个比较字符串的……逻辑完全一样，只是类型不同。这就是泛型要解决的问题：**用一份代码处理多种类型**。

如果你写过 TypeScript，你一定不陌生：

```typescript
// TypeScript 泛型
function max<T>(a: T, b: T): T {
    return a > b ? a : b;  // TS 里这样写其实有问题，但你懂意思
}
```

Rust 的泛型与 TS 非常类似，但有一个关键区别：**Rust 的泛型在编译时就会被具体化（单态化）**，不会有任何运行时开销。

---

## 10.2 泛型函数

### 10.2.1 基本语法

```rust
// 定义泛型函数：用 <T> 声明类型参数
fn first<T>(list: &[T]) -> &T {
    &list[0]
}

fn main() {
    let numbers = vec![1, 2, 3];
    let strings = vec!["hello", "world"];

    // 编译器自动推导 T 的具体类型
    let n = first(&numbers);  // T = i32
    let s = first(&strings);  // T = &str

    println!("第一个数字: {}", n);
    println!("第一个字符串: {}", s);
}
```

**对比 TypeScript：**

```typescript
// TypeScript
function first<T>(list: T[]): T {
    return list[0];
}

const n = first([1, 2, 3]);        // T = number
const s = first(["hello", "world"]); // T = string
```

几乎一模一样！区别在于：
- Rust 用 `&[T]` 表示切片引用，TS 用 `T[]` 表示数组
- Rust 返回 `&T`（引用），因为所有权系统不允许你随便把值"拿出来"

### 10.2.2 多个类型参数

```rust
// 两个不同的类型参数
fn make_pair<A, B>(a: A, b: B) -> (A, B) {
    (a, b)
}

fn main() {
    let pair = make_pair("hello", 42);
    println!("{:?}", pair); // ("hello", 42)
}
```

**对比 TypeScript：**

```typescript
function makePair<A, B>(a: A, b: B): [A, B] {
    return [a, b];
}
```

### 10.2.3 单态化：零成本抽象

这是 Rust 泛型与 TypeScript 泛型最大的区别。当你写：

```rust
fn add<T: std::ops::Add<Output = T>>(a: T, b: T) -> T {
    a + b
}

fn main() {
    add(1_i32, 2_i32);   // 调用 1
    add(1.0_f64, 2.0_f64); // 调用 2
}
```

编译器会生成两个独立的函数：

```rust
// 编译器实际生成的代码（伪代码）
fn add_i32(a: i32, b: i32) -> i32 { a + b }
fn add_f64(a: f64, b: f64) -> f64 { a + b }
```

这叫做**单态化（Monomorphization）**。每种具体类型都会生成一份独立的机器代码，所以：
- ✅ 运行时零开销，跟你手写每个类型的版本一样快
- ❌ 可能增加编译产物体积（如果用了很多不同类型）

TypeScript 的泛型在运行时完全被擦除，JavaScript 引擎看到的只是普通函数。而 Rust 的泛型在编译时被"展开"成具体类型的代码。

---

## 10.3 泛型结构体

### 10.3.1 基本定义

```rust
// 定义一个泛型结构体
struct Point<T> {
    x: T,
    y: T,
}

fn main() {
    let int_point = Point { x: 5, y: 10 };       // Point<i32>
    let float_point = Point { x: 1.0, y: 4.0 };  // Point<f64>

    println!("整数点: ({}, {})", int_point.x, int_point.y);
    println!("浮点点: ({}, {})", float_point.x, float_point.y);
}
```

**对比 TypeScript：**

```typescript
interface Point<T> {
    x: T;
    y: T;
}

const intPoint: Point<number> = { x: 5, y: 10 };
const floatPoint: Point<number> = { x: 1.0, y: 4.0 };
```

### 10.3.2 多类型参数的结构体

```rust
// x 和 y 可以是不同类型
struct Point2<X, Y> {
    x: X,
    y: Y,
}

fn main() {
    let p = Point2 { x: 5, y: 3.14 }; // Point2<i32, f64>
    println!("({}, {})", p.x, p.y);
}
```

### 10.3.3 为泛型结构体实现方法

```rust
struct Point<T> {
    x: T,
    y: T,
}

// 为所有 Point<T> 实现方法
impl<T> Point<T> {
    fn new(x: T, y: T) -> Self {
        Point { x, y }
    }

    fn x(&self) -> &T {
        &self.x
    }
}

// 只为 Point<f64> 实现特定方法
impl Point<f64> {
    fn distance_from_origin(&self) -> f64 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}

fn main() {
    let p1 = Point::new(5, 10);
    let p2 = Point::new(1.0, 4.0);

    println!("p1.x = {}", p1.x());
    println!("p2 到原点的距离 = {}", p2.distance_from_origin());

    // 下面这行会编译错误！Point<i32> 没有 distance_from_origin 方法
    // println!("{}", p1.distance_from_origin());
}
```

注意 `impl&lt;T&gt; Point&lt;T&gt;` 中的两个 `&lt;T&gt;`：
- 第一个 `&lt;T&gt;`：声明这是一个泛型实现
- 第二个 `&lt;T&gt;`：指定我们在为 `Point&lt;T&gt;` 实现

而 `impl Point&lt;f64&gt;` 没有 `&lt;T&gt;`，因为这是为**具体类型**实现，不是泛型实现。

**对比 TypeScript：**

```typescript
class Point<T> {
    constructor(public x: T, public y: T) {}
}

// TS 没有办法只为特定类型参数添加方法
// 你需要用条件类型或子类来实现类似效果
```

这是 Rust 的一个优势：你可以为特定的类型参数组合提供专门的方法实现。

---

## 10.4 泛型枚举

你其实已经用过了！`Option&lt;T&gt;` 和 `Result&lt;T, E&gt;` 就是泛型枚举：

```rust
// 标准库中的定义
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

### 10.4.1 自定义泛型枚举

```rust
// 一个简单的二叉树
enum Tree<T> {
    Leaf(T),
    Node {
        value: T,
        left: Box<Tree<T>>,
        right: Box<Tree<T>>,
    },
}

fn main() {
    // 构建一棵简单的树：
    //       2
    //      / \
    //     1   3
    let tree = Tree::Node {
        value: 2,
        left: Box::new(Tree::Leaf(1)),
        right: Box::new(Tree::Leaf(3)),
    };
}
```

**对比 TypeScript：**

```typescript
type Tree<T> =
    | { kind: "leaf"; value: T }
    | { kind: "node"; value: T; left: Tree<T>; right: Tree<T> };
```

Rust 的枚举天然支持这种"标签联合"模式，不需要手动加 `kind` 字段。

---

## 10.5 Trait：Rust 的接口系统

### 10.5.1 什么是 Trait？

Trait 定义了一组行为（方法签名），任何类型都可以实现这些 Trait。

**对比 TypeScript interface：**

```typescript
// TypeScript
interface Summary {
    summarize(): string;
}

class Article implements Summary {
    summarize(): string {
        return `${this.title} by ${this.author}`;
    }
}
```

```rust
// Rust
trait Summary {
    fn summarize(&self) -> String;
}

struct Article {
    title: String,
    author: String,
}

impl Summary for Article {
    fn summarize(&self) -> String {
        format!("{} by {}", self.title, self.author)
    }
}
```

关键区别：
- TypeScript 的 `implements` 写在类声明处
- Rust 的 `impl Trait for Type` 是独立的代码块，可以在任何地方（有限制，见孤儿规则）
- Rust 的 Trait 方法第一个参数是 `&self`（类似 Python 的 `self`）

### 10.5.2 默认方法实现

Trait 可以提供方法的默认实现：

```rust
trait Summary {
    // 没有默认实现，必须由类型提供
    fn title(&self) -> &str;

    // 有默认实现，类型可以选择覆盖
    fn summarize(&self) -> String {
        format!("(阅读更多: {}...)", self.title())
    }
}

struct Article {
    title: String,
    content: String,
}

impl Summary for Article {
    // 只需要实现没有默认值的方法
    fn title(&self) -> &str {
        &self.title
    }

    // summarize 使用默认实现
}

struct Tweet {
    username: String,
    content: String,
}

impl Summary for Tweet {
    fn title(&self) -> &str {
        &self.username
    }

    // 覆盖默认实现
    fn summarize(&self) -> String {
        format!("@{}: {}", self.username, self.content)
    }
}

fn main() {
    let article = Article {
        title: String::from("Rust 入门"),
        content: String::from("Rust 是一门..."),
    };
    let tweet = Tweet {
        username: String::from("rustacean"),
        content: String::from("Rust 真好用！"),
    };

    println!("{}", article.summarize()); // 使用默认实现
    println!("{}", tweet.summarize());   // 使用自定义实现
}
```

**对比 TypeScript：**

```typescript
// TS 的 interface 不支持默认实现
// 你需要用 abstract class 来实现类似效果
abstract class Summary {
    abstract title(): string;

    summarize(): string {
        return `(阅读更多: ${this.title()}...)`;
    }
}
```

### 10.5.3 Trait 作为参数（Trait Bound）

这是 Rust 泛型最强大的部分。你可以要求泛型参数必须实现某个 Trait：

```rust
// 方式一：impl Trait 语法（简写）
fn notify(item: &impl Summary) {
    println!("速报：{}", item.summarize());
}

// 方式二：Trait bound 语法（完整写法）
fn notify<T: Summary>(item: &T) {
    println!("速报：{}", item.summarize());
}

// 两种写法等价，但 Trait bound 更灵活
```

**对比 TypeScript：**

```typescript
// TypeScript 用 extends 来约束泛型
function notify<T extends Summary>(item: T): void {
    console.log(`速报：${item.summarize()}`);
}
```

几乎一模一样！`T: Summary` 对应 `T extends Summary`。

### 10.5.4 多个 Trait Bound

```rust
// 要求同时实现 Summary 和 Display
fn notify(item: &(impl Summary + std::fmt::Display)) {
    println!("展示：{}", item);      // 用 Display
    println!("摘要：{}", item.summarize()); // 用 Summary
}

// 等价的 Trait bound 写法
fn notify<T: Summary + std::fmt::Display>(item: &T) {
    println!("展示：{}", item);
    println!("摘要：{}", item.summarize());
}
```

**对比 TypeScript：**

```typescript
function notify<T extends Summary & Displayable>(item: T): void {
    // ...
}
```

Rust 用 `+` 连接多个 Trait bound，TypeScript 用 `&` 连接多个接口约束。

### 10.5.5 where 子句

当 Trait bound 太复杂时，用 `where` 子句让代码更清晰：

```rust
// 这样写太长了……
fn some_function<T: std::fmt::Display + Clone, U: Clone + std::fmt::Debug>(t: &T, u: &U) -> String {
    format!("{}", t)
}

// 用 where 子句重写
fn some_function<T, U>(t: &T, u: &U) -> String
where
    T: std::fmt::Display + Clone,
    U: Clone + std::fmt::Debug,
{
    format!("{}", t)
}
```

### 10.5.6 返回实现了 Trait 的类型

```rust
// 返回某个实现了 Summary 的类型（但只能返回同一种类型）
fn create_summary() -> impl Summary {
    Tweet {
        username: String::from("rustacean"),
        content: String::from("hello!"),
    }
}
```

⚠️ 注意：`impl Trait` 作为返回类型时，函数体内只能返回**一种**具体类型。下面这样是不行的：

```rust
// ❌ 编译错误！
fn create_summary(is_tweet: bool) -> impl Summary {
    if is_tweet {
        Tweet { /* ... */ }    // 类型 A
    } else {
        Article { /* ... */ }  // 类型 B —— 不同类型！
    }
}
```

要返回不同类型，需要用 Trait 对象（后面会讲）。

---

## 10.6 常用标准 Trait

Rust 标准库定义了大量 Trait，以下是最常用的几个。

### 10.6.1 Display —— 人类可读的格式化

```rust
use std::fmt;

struct Color {
    r: u8,
    g: u8,
    b: u8,
}

impl fmt::Display for Color {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "#{:02x}{:02x}{:02x}", self.r, self.g, self.b)
    }
}

fn main() {
    let red = Color { r: 255, g: 0, b: 0 };
    println!("颜色是: {}", red); // 颜色是: #ff0000
}
```

`Display` 就像 JavaScript 的 `toString()` 方法，让你自定义 `{}` 占位符的输出格式。

### 10.6.2 Debug —— 调试用格式化

```rust
// 最简单：用 derive 自动生成
#[derive(Debug)]
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    println!("{:?}", p);   // Point { x: 1.0, y: 2.0 }
    println!("{:#?}", p);  // 美化输出（多行缩进）
}
```

`Debug` 用 `{:?}` 占位符，主要用于调试。几乎所有类型都应该 derive Debug。

### 10.6.3 Clone 与 Copy

```rust
// Clone：显式深拷贝
#[derive(Debug, Clone)]
struct Config {
    name: String,
    value: i32,
}

fn main() {
    let c1 = Config {
        name: String::from("test"),
        value: 42,
    };
    let c2 = c1.clone(); // 显式调用，深拷贝

    println!("c1: {:?}", c1); // c1 仍然可用
    println!("c2: {:?}", c2);
}
```

```rust
// Copy：隐式按位拷贝（只有简单类型才能实现）
#[derive(Debug, Clone, Copy)]
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    let p1 = Point { x: 1.0, y: 2.0 };
    let p2 = p1; // 不是 move，是 copy！
    println!("p1: {:?}", p1); // p1 仍然可用
    println!("p2: {:?}", p2);
}
```

**关键区别：**

| 特性 | Clone | Copy |
|---|---|---|
| 调用方式 | 显式 `.clone()` | 隐式（赋值时自动触发） |
| 性能 | 可能很慢（深拷贝） | 必须很快（按位复制） |
| 谁能实现 | 几乎所有类型 | 只有"简单"类型（没有堆数据） |
| 例子 | String, Vec, HashMap | i32, f64, bool, char, (i32, i32) |

**对比 JavaScript：**

```javascript
// JS 没有这种区分
const a = { x: 1 };
const b = a;           // 浅拷贝（引用）
const c = { ...a };     // 展开运算符（浅拷贝值）
const d = structuredClone(a); // 深拷贝
```

Rust 通过类型系统强制你思考拷贝的语义，避免意外的浅拷贝 bug。

### 10.6.4 PartialEq 与 Eq

```rust
#[derive(Debug, PartialEq)]
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    let p1 = Point { x: 1.0, y: 2.0 };
    let p2 = Point { x: 1.0, y: 2.0 };
    let p3 = Point { x: 3.0, y: 4.0 };

    println!("p1 == p2: {}", p1 == p2); // true
    println!("p1 == p3: {}", p1 == p3); // false
}
```

- `PartialEq`：支持 `==` 和 `!=` 运算符
- `Eq`：在 `PartialEq` 基础上，保证自反性（`a == a` 总是 true）
  - `f64` 实现了 `PartialEq` 但没有实现 `Eq`，因为 `NaN != NaN`

### 10.6.5 Default

```rust
#[derive(Debug, Default)]
struct Config {
    width: u32,       // 默认 0
    height: u32,      // 默认 0
    title: String,    // 默认 ""
    fullscreen: bool, // 默认 false
}

fn main() {
    // 使用全部默认值
    let c1 = Config::default();
    println!("{:#?}", c1);

    // 只覆盖部分字段（结构体更新语法）
    let c2 = Config {
        width: 1920,
        height: 1080,
        ..Default::default()
    };
    println!("{:#?}", c2);
}
```

**对比 TypeScript：**

```typescript
// TS 中通常用可选参数 + 默认值
interface Config {
    width?: number;   // undefined
    height?: number;
    title?: string;
    fullscreen?: boolean;
}

const c: Config = { width: 1920, height: 1080 };
```

### 10.6.6 From 和 Into

`From` 和 `Into` 是一对互补的转换 Trait：

```rust
// 为 Color 实现 From<(u8, u8, u8)>
struct Color {
    r: u8,
    g: u8,
    b: u8,
}

impl From<(u8, u8, u8)> for Color {
    fn from(tuple: (u8, u8, u8)) -> Self {
        Color {
            r: tuple.0,
            g: tuple.1,
            b: tuple.2,
        }
    }
}

fn main() {
    // 使用 From
    let red = Color::from((255, 0, 0));

    // 使用 Into（自动获得，因为实现了 From）
    let blue: Color = (0, 0, 255).into();

    // 在函数参数中使用
    fn set_color(color: impl Into<Color>) {
        let c: Color = color.into();
        println!("设置颜色: ({}, {}, {})", c.r, c.g, c.b);
    }

    set_color((0, 255, 0));   // 元组自动转换
    set_color(Color::from((128, 128, 128))); // 已经是 Color
}
```

**规则：实现 `From&lt;A&gt; for B` 会自动获得 `Into&lt;B&gt; for A`。所以只需要实现 `From`。**

**对比 TypeScript：**

```typescript
// TS 没有统一的转换协议
// 通常用构造函数重载或工厂方法
class Color {
    constructor(r: number, g: number, b: number);
    constructor(tuple: [number, number, number]);
    constructor(rOrTuple: any, g?: number, b?: number) {
        // ...
    }
}
```

Rust 的 `From/Into` 提供了统一的类型转换协议，所有类型都遵循相同的模式。

### 10.6.7 derive 一览

大多数常用 Trait 都可以用 `#[derive(...)]` 自动生成：

```rust
#[derive(
    Debug,      // {:?} 格式化
    Clone,      // .clone() 方法
    Copy,       // 隐式拷贝（要求所有字段都是 Copy）
    PartialEq,  // == 和 !=
    Eq,         // 完全相等（要求 PartialEq）
    PartialOrd, // < > <= >=
    Ord,        // 完全排序（要求 Eq + PartialOrd）
    Hash,       // 可用作 HashMap 的 key
    Default,    // ::default()
)]
struct Point {
    x: i32,
    y: i32,
}
```

**经验法则：** 除非有特殊需求，大多数结构体至少应该 `#[derive(Debug)]`。

---

## 10.7 Trait 对象与动态分发

### 10.7.1 问题：存储不同类型的值

假设你有多种形状，都实现了 `Area` Trait：

```rust
trait Area {
    fn area(&self) -> f64;
}

struct Circle {
    radius: f64,
}

struct Rectangle {
    width: f64,
    height: f64,
}

impl Area for Circle {
    fn area(&self) -> f64 {
        std::f64::consts::PI * self.radius * self.radius
    }
}

impl Area for Rectangle {
    fn area(&self) -> f64 {
        self.width * self.height
    }
}
```

你想把它们放进同一个 Vec 里：

```rust
// ❌ 编译错误！Vec 需要统一的元素类型
// let shapes = vec![Circle { radius: 1.0 }, Rectangle { width: 2.0, height: 3.0 }];
```

### 10.7.2 解决方案：dyn Trait

```rust
fn main() {
    // 使用 Box<dyn Trait> 创建 Trait 对象
    let shapes: Vec<Box<dyn Area>> = vec![
        Box::new(Circle { radius: 1.0 }),
        Box::new(Rectangle { width: 2.0, height: 3.0 }),
    ];

    for shape in &shapes {
        println!("面积: {}", shape.area());
    }
}
```

**`Box&lt;dyn Area&gt;` 是什么？**

- `dyn Area` 表示"任何实现了 Area Trait 的类型"
- `Box&lt;dyn Area&gt;` 是一个指向堆上某个实现了 Area 的值的智能指针
- 运行时通过 **vtable（虚函数表）** 来调用正确的方法 —— 这就是**动态分发**

```
Box<dyn Area> 的内存布局：

┌──────────────┐
│ 数据指针 ptr  │──→ 堆上的具体数据（Circle 或 Rectangle）
├──────────────┤
│ vtable 指针   │──→ 虚函数表
└──────────────┘         │
                         ▼
                    ┌──────────┐
                    │ area()   │──→ Circle::area 或 Rectangle::area
                    │ drop()   │──→ 析构函数
                    │ size     │
                    │ align    │
                    └──────────┘
```

**对比 TypeScript：**

```typescript
// TypeScript 天然支持，因为 JS 本来就是动态类型
interface Area {
    area(): number;
}

const shapes: Area[] = [
    new Circle(1.0),
    new Rectangle(2.0, 3.0),
];

shapes.forEach(s => console.log(s.area()));
```

TS/JS 里所有对象都是动态分发的（通过原型链），所以你感受不到这个问题。Rust 默认使用静态分发（泛型 + 单态化），只有显式使用 `dyn` 时才会用动态分发。

### 10.7.3 静态分发 vs 动态分发

```rust
// 静态分发：编译时确定类型，生成专门的代码
fn print_area_static(shape: &impl Area) {
    println!("面积: {}", shape.area());
}

// 动态分发：运行时通过 vtable 查找方法
fn print_area_dynamic(shape: &dyn Area) {
    println!("面积: {}", shape.area());
}
```

| 特性 | 静态分发（泛型） | 动态分发（dyn Trait） |
|---|---|---|
| 方法调用 | 编译时确定 | 运行时查表 |
| 性能 | 更快（可内联） | 稍慢（间接调用） |
| 编译产物 | 更大（每种类型一份代码） | 更小（共享代码） |
| 灵活性 | 只能是同一种类型 | 可以混合不同类型 |
| 类型信息 | 编译时完全已知 | 部分信息运行时才知道 |

### 10.7.4 Trait 对象的限制：对象安全

并非所有 Trait 都能变成 Trait 对象。Trait 必须是**对象安全的**：

```rust
// ✅ 对象安全
trait Draw {
    fn draw(&self);
}

// ❌ 不是对象安全的 —— 方法返回 Self
trait Clonable {
    fn clone_self(&self) -> Self;
}

// ❌ 不是对象安全的 —— 有泛型方法
trait Converter {
    fn convert<T>(&self) -> T;
}
```

**对象安全的规则：**
1. 方法不能返回 `Self`（因为 dyn Trait 不知道 Self 的大小）
2. 方法不能有泛型参数（因为 vtable 无法存储无限种泛型版本）

这也是为什么 `Clone` Trait 不能直接用作 `dyn Clone`。

---

## 10.8 孤儿规则（Orphan Rule）

### 10.8.1 规则定义

你只能在以下情况之一为类型实现 Trait：
1. **Trait 是你定义的**（在你的 crate 中定义的）
2. **类型是你定义的**（在你的 crate 中定义的）

至少有一个是"本地的"。

```rust
// ✅ 可以：为自己的类型实现标准库的 Trait
struct MyType;
impl std::fmt::Display for MyType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MyType")
    }
}

// ✅ 可以：为标准库的类型实现自己的 Trait
trait MyTrait {
    fn do_something(&self);
}
impl MyTrait for String {
    fn do_something(&self) {
        println!("对 String 做点什么: {}", self);
    }
}

// ❌ 不可以：为标准库的类型实现标准库的 Trait
// impl std::fmt::Display for Vec<i32> { ... }
// 错误：既不是你的类型，也不是你的 Trait
```

### 10.8.2 为什么需要孤儿规则？

想象如果没有这个规则：
- crate A 为 `Vec&lt;i32&gt;` 实现了 `Display`，输出 `[1, 2, 3]`
- crate B 为 `Vec&lt;i32&gt;` 也实现了 `Display`，输出 `1|2|3`
- 你的项目同时依赖 A 和 B……应该用哪个实现？

孤儿规则防止了这种冲突。

### 10.8.3 解决方案：Newtype 模式

如果你确实需要为外部类型实现外部 Trait，可以用 Newtype 包装：

```rust
use std::fmt;

// 创建一个包装类型
struct Wrapper(Vec<String>);

impl fmt::Display for Wrapper {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}]", self.0.join(", "))
    }
}

fn main() {
    let w = Wrapper(vec![
        String::from("hello"),
        String::from("world"),
    ]);
    println!("{}", w); // [hello, world]
}
```

**对比 TypeScript：**

TypeScript 没有孤儿规则的概念，因为 TS 的 interface 是结构化类型（鸭子类型），不需要显式 `implements`。任何对象只要有正确的方法就自动满足接口。这更灵活但也更容易出现意外的类型匹配。

---

## 10.9 Trait 高级用法

### 10.9.1 关联类型

```rust
// 关联类型：Trait 中用 type 定义一个"占位类型"
trait Iterator {
    type Item; // 关联类型

    fn next(&mut self) -> Option<Self::Item>;
}

struct Counter {
    count: u32,
}

impl Iterator for Counter {
    type Item = u32; // 指定关联类型为 u32

    fn next(&mut self) -> Option<Self::Item> {
        self.count += 1;
        if self.count <= 5 {
            Some(self.count)
        } else {
            None
        }
    }
}
```

**关联类型 vs 泛型参数的区别：**

```rust
// 泛型参数：一个类型可以实现多次（不同的 T）
trait From<T> {
    fn from(value: T) -> Self;
}

// 关联类型：一个类型只能实现一次
trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}
```

一个类型可以 `impl From&lt;String&gt;` 和 `impl From&lt;i32&gt;`，但只能有一个 `Iterator` 实现。

### 10.9.2 运算符重载

Rust 的运算符重载通过实现特定 Trait 来完成：

```rust
use std::ops::Add;

#[derive(Debug, Clone, Copy)]
struct Vector2D {
    x: f64,
    y: f64,
}

impl Add for Vector2D {
    type Output = Vector2D; // 关联类型：加法结果的类型

    fn add(self, other: Vector2D) -> Vector2D {
        Vector2D {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

fn main() {
    let v1 = Vector2D { x: 1.0, y: 2.0 };
    let v2 = Vector2D { x: 3.0, y: 4.0 };
    let v3 = v1 + v2; // 调用我们实现的 add 方法

    println!("{:?}", v3); // Vector2D { x: 4.0, y: 6.0 }
}
```

常见可重载的运算符 Trait：

| 运算符 | Trait | 方法 |
|---|---|---|
| `+` | `std::ops::Add` | `add(self, rhs)` |
| `-` | `std::ops::Sub` | `sub(self, rhs)` |
| `*` | `std::ops::Mul` | `mul(self, rhs)` |
| `/` | `std::ops::Div` | `div(self, rhs)` |
| `==` | `std::cmp::PartialEq` | `eq(&self, other)` |
| `&lt;` | `std::cmp::PartialOrd` | `partial_cmp(&self, other)` |
| `[]` | `std::ops::Index` | `index(&self, idx)` |
| `-x` | `std::ops::Neg` | `neg(self)` |

### 10.9.3 超级 Trait（Supertrait）

一个 Trait 可以要求实现者同时实现另一个 Trait：

```rust
use std::fmt;

// OutlinePrint 要求类型必须同时实现 Display
trait OutlinePrint: fmt::Display {
    fn outline_print(&self) {
        let output = self.to_string();
        let len = output.len();
        println!("{}", "*".repeat(len + 4));
        println!("* {} *", output);
        println!("{}", "*".repeat(len + 4));
    }
}

struct Point {
    x: i32,
    y: i32,
}

// 必须先实现 Display
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// 然后才能实现 OutlinePrint
impl OutlinePrint for Point {}

fn main() {
    let p = Point { x: 1, y: 3 };
    p.outline_print();
    // **********
    // * (1, 3) *
    // **********
}
```

**对比 TypeScript：**

```typescript
// TypeScript 的 interface 继承
interface Display {
    toString(): string;
}

interface OutlinePrint extends Display {
    outlinePrint(): void;
}
```

---

## 10.10 实战：构建一个泛型缓存系统

让我们把本章学到的知识综合运用，构建一个简单的泛型缓存：

```rust
use std::collections::HashMap;
use std::hash::Hash;
use std::fmt::Debug;

// 泛型缓存：K 是键类型，V 是值类型
struct Cache<K, V> {
    store: HashMap<K, V>,
    max_size: usize,
}

impl<K, V> Cache<K, V>
where
    K: Eq + Hash + Debug,  // 键需要可比较、可哈希、可调试打印
    V: Clone + Debug,       // 值需要可克隆、可调试打印
{
    fn new(max_size: usize) -> Self {
        Cache {
            store: HashMap::new(),
            max_size,
        }
    }

    fn get(&self, key: &K) -> Option<&V> {
        self.store.get(key)
    }

    fn set(&mut self, key: K, value: V) -> bool {
        if self.store.len() >= self.max_size && !self.store.contains_key(&key) {
            println!("缓存已满！无法添加 {:?}", key);
            return false;
        }
        self.store.insert(key, value);
        true
    }

    fn remove(&mut self, key: &K) -> Option<V> {
        self.store.remove(key)
    }

    fn size(&self) -> usize {
        self.store.len()
    }
}

// 为 Cache 实现 Display
impl<K, V> std::fmt::Display for Cache<K, V>
where
    K: Eq + Hash + Debug,
    V: Clone + Debug,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Cache({}/{})", self.store.len(), self.max_size)
    }
}

fn main() {
    let mut cache: Cache<String, i32> = Cache::new(3);

    cache.set("一".to_string(), 1);
    cache.set("二".to_string(), 2);
    cache.set("三".to_string(), 3);

    println!("{}", cache); // Cache(3/3)

    if let Some(v) = cache.get(&"二".to_string()) {
        println!("找到了: {}", v);
    }

    // 缓存已满，添加失败
    cache.set("四".to_string(), 4); // 输出：缓存已满！

    // 删除一个，再添加
    cache.remove(&"一".to_string());
    cache.set("四".to_string(), 4); // 成功

    println!("{}", cache); // Cache(3/3)
}
```

---

## 10.11 小结

| 概念 | Rust | TypeScript |
|---|---|---|
| 泛型函数 | `fn foo&lt;T&gt;(x: T)` | `function foo&lt;T&gt;(x: T)` |
| 泛型约束 | `T: Trait` | `T extends Interface` |
| 多约束 | `T: A + B` | `T extends A & B` |
| 接口/Trait | `trait Foo { }` | `interface Foo { }` |
| 实现 | `impl Foo for Bar { }` | `class Bar implements Foo { }` |
| 默认实现 | Trait 中直接写方法体 | `abstract class` |
| 动态分发 | `dyn Trait` | 默认行为（原型链） |
| 类型转换 | `From/Into` | 构造函数重载 |

**核心要点：**
1. Rust 泛型通过单态化实现零成本抽象
2. Trait 是 Rust 多态的核心，类似 interface 但更强大
3. 静态分发（泛型）优先，需要时才用动态分发（dyn Trait）
4. 孤儿规则保证了 Trait 实现的全局一致性
5. derive 宏可以自动生成常用 Trait 的实现

---

## 10.12 练习题

### 练习 1：泛型栈

实现一个泛型栈 `Stack&lt;T&gt;`，支持 `push`、`pop`、`peek`、`is_empty`、`size` 方法。

```rust
struct Stack<T> {
    elements: Vec<T>,
}

// 在这里实现 Stack<T> 的方法
// impl<T> Stack<T> { ... }

fn main() {
    let mut stack = Stack::new();
    stack.push(1);
    stack.push(2);
    stack.push(3);

    assert_eq!(stack.peek(), Some(&3));
    assert_eq!(stack.pop(), Some(3));
    assert_eq!(stack.size(), 2);
    assert!(!stack.is_empty());
}
```

### 练习 2：实现 Trait

定义一个 `Drawable` Trait，包含 `draw(&self)` 和 `bounding_box(&self) -&gt; (f64, f64, f64, f64)` 方法。为 `Circle` 和 `Rectangle` 实现它，然后写一个函数接收 `Vec&lt;Box&lt;dyn Drawable&gt;&gt;` 并打印所有图形。

### 练习 3：From 转换

为一个 `Temperature` 结构体实现以下转换：
- `From&lt;f64&gt;` —— 从摄氏度创建
- `From&lt;(f64, char)&gt;` —— 从 `(值, 'C'|'F')` 创建
- `Display` —— 格式化为 "23.5°C"

```rust
struct Temperature {
    celsius: f64,
}

// 实现 From<f64>、From<(f64, char)>、Display

fn main() {
    let t1: Temperature = 100.0.into();
    let t2: Temperature = (212.0, 'F').into();

    println!("t1 = {}", t1); // 100.0°C
    println!("t2 = {}", t2); // 100.0°C
}
```

### 练习 4：泛型排序

写一个泛型函数 `sort_by_key`，接收一个 `Vec&lt;T&gt;` 和一个提取排序键的函数，返回排序后的 Vec：

```rust
fn sort_by_key<T, K: Ord>(mut items: Vec<T>, key_fn: impl Fn(&T) -> K) -> Vec<T> {
    // 在这里实现
    todo!()
}

fn main() {
    let people = vec![
        ("Alice", 30),
        ("Bob", 25),
        ("Charlie", 35),
    ];

    let sorted = sort_by_key(people, |p| p.1);
    // [("Bob", 25), ("Alice", 30), ("Charlie", 35)]
}
```

### 练习 5：Trait 组合

设计一个序列化系统：
- `Serializable` Trait：`fn serialize(&self) -&gt; String`
- `Deserializable` Trait：`fn deserialize(s: &str) -&gt; Result&lt;Self, String&gt; where Self: Sized`
- 为 `User` 结构体实现这两个 Trait
- 写一个泛型函数 `round_trip`，对任何同时实现两个 Trait 的类型做序列化再反序列化

---

> **下一章预告：** 第十一章我们将深入 Rust 最独特也最让人困惑的概念 —— **生命周期**。它是 Rust 保证内存安全的最后一块拼图。准备好迎接挑战吧！
