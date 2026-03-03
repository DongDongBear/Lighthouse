# 第六章：结构体与枚举 —— Rust 的自定义类型

> **本章目标**
>
> - 掌握结构体（Struct）的定义与使用，对比 TypeScript 的 interface/class
> - 理解方法（Method）与关联函数（Associated Function），掌握 `impl` 块
> - 深入理解枚举（Enum），对比 TypeScript 的 union type 和 enum
> - 熟练使用 `Option<T>`，对比 TypeScript 的 `T | null | undefined`
> - 掌握模式匹配（Pattern Matching）和 `match` 表达式
> - 学会常用的枚举模式和惯用法
> - 通过练习题巩固所学

> **预计学习时间：90 - 120 分钟**

---

## 6.1 结构体（Struct）—— 自定义数据类型

### 6.1.1 基本结构体定义

结构体让你把相关的数据组合在一起，就像 TypeScript 的 `interface` 或 `class`：

```typescript
// TypeScript
interface User {
    name: string;
    email: string;
    age: number;
    active: boolean;
}

const user: User = {
    name: "动动",
    email: "dong@example.com",
    age: 28,
    active: true,
};
```

```rust
// Rust - 结构体定义
struct User {
    name: String,    // 注意：用逗号分隔，不是分号
    email: String,
    age: u32,
    active: bool,
}

fn main() {
    // 创建结构体实例
    let user = User {
        name: String::from("动动"),
        email: String::from("dong@example.com"),
        age: 28,
        active: true,
    };

    // 访问字段
    println!("用户名: {}", user.name);
    println!("年龄: {}", user.age);
}
```

### 6.1.2 对比 TypeScript 的 interface 和 class

```
┌──────────────────────────────────────────────────────────────┐
│              TypeScript vs Rust 的类型定义                     │
├───────────────────────────┬──────────────────────────────────┤
│       TypeScript          │            Rust                  │
├───────────────────────────┼──────────────────────────────────┤
│ interface User {          │ struct User {                    │
│   name: string;           │     name: String,                │
│   age: number;            │     age: u32,                    │
│ }                         │ }                                │
├───────────────────────────┼──────────────────────────────────┤
│ 只是类型约束              │ 真正的数据类型                    │
│ 编译后消失                │ 编译后存在于内存中                │
│ 没有运行时表现            │ 有明确的内存布局                  │
├───────────────────────────┼──────────────────────────────────┤
│ class User {              │ struct User { ... }              │
│   constructor(            │ impl User {                      │
│     public name: string   │     fn new(name: String) -> Self │
│   ) {}                    │     { ... }                      │
│   greet() { ... }         │     fn greet(&self) { ... }      │
│ }                         │ }                                │
├───────────────────────────┼──────────────────────────────────┤
│ 数据和方法写在一起         │ 数据（struct）和行为（impl）分开  │
│ 支持继承                  │ 不支持继承，用组合和 trait        │
└───────────────────────────┴──────────────────────────────────┘
```

### 6.1.3 可变性与字段修改

```rust
fn main() {
    // 注意：Rust 不允许单个字段声明为 mut
    // 整个结构体要么全部可变，要么全部不可变
    let mut user = User {
        name: String::from("动动"),
        email: String::from("dong@example.com"),
        age: 28,
        active: true,
    };

    // 整个实例是 mut 的，所以可以修改任何字段
    user.email = String::from("new_dong@example.com");
    user.age = 29;

    // 对比 TypeScript:
    // TS 中可以用 readonly 标记单个字段
    // interface User {
    //     readonly name: string;  // 单独标记不可变
    //     email: string;          // 可变
    // }
}
```

### 6.1.4 字段初始化简写

```rust
fn build_user(name: String, email: String) -> User {
    User {
        name,     // 简写：等同于 name: name
        email,    // 简写：等同于 email: email
        age: 0,
        active: true,
    }
    // 和 JS/TS 的对象简写一样！
    // const obj = { name, email }; // JS 中的等价写法
}
```

### 6.1.5 结构体更新语法（Spread）

```rust
fn main() {
    let user1 = User {
        name: String::from("动动"),
        email: String::from("dong@example.com"),
        age: 28,
        active: true,
    };

    // 用 .. 语法从另一个实例中取剩余字段（类似 JS 的 spread）
    let user2 = User {
        email: String::from("yang@example.com"),
        name: String::from("小羊"),
        ..user1  // 从 user1 取 age 和 active
    };

    // ⚠️ 注意所有权！
    // user1.age 和 user1.active 是 Copy 类型，没问题
    // 但如果 user1 的 String 字段被 .. 使用了，user1 就被部分移动了

    println!("user2: {} ({})", user2.name, user2.age);

    // 在这个例子中 user1 的 name 和 email 没被 .. 使用
    // （我们手动指定了），所以 user1 的 String 字段没被移动
    // 但 user1 整体仍被部分移动（因为 .. 语法的语义）
}
```

对比 TypeScript 的 spread：

```typescript
// TypeScript
const user1 = { name: "动动", email: "dong@example.com", age: 28, active: true };
const user2 = { ...user1, email: "yang@example.com", name: "小羊" };
// user1 不受影响（JS 做了浅拷贝）
console.log(user1.name); // ✅ "动动"
```

### 6.1.6 元组结构体（Tuple Struct）

```rust
// 当你需要给元组一个名字，但不需要命名每个字段时
struct Color(u8, u8, u8);       // RGB 颜色
struct Point(f64, f64);          // 2D 坐标
struct Meters(f64);              // 新类型模式（Newtype Pattern）

fn main() {
    let red = Color(255, 0, 0);
    let origin = Point(0.0, 0.0);
    let distance = Meters(100.0);

    // 用索引访问
    println!("R: {}, G: {}, B: {}", red.0, red.1, red.2);
    println!("x: {}, y: {}", origin.0, origin.1);

    // 新类型模式的好处：类型安全
    // Meters(100.0) 和 f64 是不同类型，不能混用
    // let wrong: f64 = distance; // ❌ 类型不匹配
    let value: f64 = distance.0;  // ✅ 显式取出内部值
}
```

### 6.1.7 单元结构体（Unit Struct）

```rust
// 没有任何字段的结构体
struct Marker;
struct AlwaysEqual;

fn main() {
    let _m = Marker;
    let _a = AlwaysEqual;

    // 主要用于实现 trait，不需要存储数据
    // 类似于 TypeScript 的标记类型
}
```

### 6.1.8 结构体的打印与调试

```rust
// 要打印结构体，需要派生 Debug trait
#[derive(Debug)]
struct User {
    name: String,
    email: String,
    age: u32,
}

fn main() {
    let user = User {
        name: String::from("动动"),
        email: String::from("dong@example.com"),
        age: 28,
    };

    // {:?} 使用 Debug 格式
    println!("{:?}", user);
    // 输出：User { name: "动动", email: "dong@example.com", age: 28 }

    // {:#?} 使用格式化的 Debug 格式（更易读）
    println!("{:#?}", user);
    // 输出：
    // User {
    //     name: "动动",
    //     email: "dong@example.com",
    //     age: 28,
    // }

    // 也可以用 dbg! 宏（输出到 stderr，包含文件名和行号）
    dbg!(&user);
}
```

---

## 6.2 方法与关联函数（impl 块）

### 6.2.1 定义方法

方法类似于 TypeScript class 中的方法，但在 Rust 中通过 `impl` 块定义，**数据和行为是分离的**：

```rust
#[derive(Debug)]
struct Rectangle {
    width: f64,
    height: f64,
}

// impl 块：为 Rectangle 定义方法
impl Rectangle {
    // 方法：第一个参数是 self（或 &self, &mut self）
    fn area(&self) -> f64 {
        self.width * self.height
    }

    fn perimeter(&self) -> f64 {
        2.0 * (self.width + self.height)
    }

    fn is_square(&self) -> bool {
        (self.width - self.height).abs() < f64::EPSILON
    }
}

fn main() {
    let rect = Rectangle { width: 10.0, height: 5.0 };

    // 调用方法：用 . 语法
    println!("面积: {}", rect.area());
    println!("周长: {}", rect.perimeter());
    println!("是正方形: {}", rect.is_square());
}
```

### 6.2.2 self 的三种形式

```rust
impl Rectangle {
    // &self —— 不可变借用（只读）
    // 最常用，只需要读取数据
    fn area(&self) -> f64 {
        self.width * self.height
    }

    // &mut self —— 可变借用（可修改）
    // 需要修改自身数据
    fn scale(&mut self, factor: f64) {
        self.width *= factor;
        self.height *= factor;
    }

    // self —— 获取所有权（消费自身）
    // 调用后原实例不再可用
    // 通常用于转换操作
    fn into_square(self) -> Rectangle {
        let side = (self.width + self.height) / 2.0;
        Rectangle { width: side, height: side }
    }
}

fn main() {
    let mut rect = Rectangle { width: 10.0, height: 5.0 };

    println!("面积: {}", rect.area());     // &self：rect 仍可用

    rect.scale(2.0);                        // &mut self：rect 被修改
    println!("缩放后: {:?}", rect);         // rect 仍可用

    let square = rect.into_square();         // self：rect 被消费
    // println!("{:?}", rect);              // ❌ rect 已被移动
    println!("正方形: {:?}", square);       // ✅ square 可用
}
```

对比 TypeScript：

```typescript
class Rectangle {
    constructor(public width: number, public height: number) {}

    // TS 中所有方法都隐式地有 this（类似 &self 或 &mut self）
    area(): number {
        return this.width * this.height;
    }

    scale(factor: number): void {
        // TS 中可以自由修改 this，没有 &self / &mut self 的区分
        this.width *= factor;
        this.height *= factor;
    }

    // TS 中没有"消费自身"的概念
}
```

### 6.2.3 关联函数（Associated Functions）—— 没有 self 的函数

```rust
impl Rectangle {
    // 关联函数：没有 self 参数
    // 类似于 TypeScript 的 static 方法
    fn new(width: f64, height: f64) -> Rectangle {
        Rectangle { width, height }
    }

    fn square(size: f64) -> Rectangle {
        Rectangle {
            width: size,
            height: size,
        }
    }

    fn from_diagonal(diagonal: f64, ratio: f64) -> Rectangle {
        // 根据对角线和宽高比计算
        let height = (diagonal * diagonal / (1.0 + ratio * ratio)).sqrt();
        let width = height * ratio;
        Rectangle { width, height }
    }
}

fn main() {
    // 用 :: 调用关联函数（不是 .）
    let rect1 = Rectangle::new(10.0, 5.0);
    let rect2 = Rectangle::square(7.0);
    let rect3 = Rectangle::from_diagonal(10.0, 2.0);

    println!("{:?}", rect1);
    println!("{:?}", rect2);
    println!("{:?}", rect3);
}
```

对比 TypeScript：

```typescript
class Rectangle {
    // static 方法 ≈ Rust 的关联函数
    static new(width: number, height: number): Rectangle {
        return new Rectangle(width, height);
    }

    static square(size: number): Rectangle {
        return new Rectangle(size, size);
    }
}

// 调用方式类似
const rect = Rectangle.new(10, 5);
```

> 💡 **约定**：在 Rust 中，通常用 `new` 作为构造函数的名字，但这只是约定，不是语言要求。Rust 没有 `new` 关键字。

### 6.2.4 多个 impl 块

```rust
struct Player {
    name: String,
    health: i32,
    attack: i32,
}

// 可以有多个 impl 块（对组织代码有帮助）
impl Player {
    fn new(name: String) -> Player {
        Player {
            name,
            health: 100,
            attack: 10,
        }
    }
}

// 战斗相关的方法
impl Player {
    fn take_damage(&mut self, amount: i32) {
        self.health -= amount;
        if self.health < 0 {
            self.health = 0;
        }
        println!("{} 受到 {} 点伤害，剩余生命值: {}",
                 self.name, amount, self.health);
    }

    fn is_alive(&self) -> bool {
        self.health > 0
    }

    fn attack_target(&self, target: &mut Player) {
        println!("{} 攻击了 {}！", self.name, target.name);
        target.take_damage(self.attack);
    }
}

// 显示相关的方法
impl Player {
    fn status(&self) -> String {
        format!("[{}] HP: {}/100 ATK: {}",
                self.name, self.health, self.attack)
    }
}

fn main() {
    let mut player1 = Player::new(String::from("动动"));
    let mut player2 = Player::new(String::from("小羊"));

    println!("{}", player1.status());
    println!("{}", player2.status());

    // 注意：不能同时可变借用 player1 和通过 player1 调用方法
    // 所以这里需要分开处理
    let damage = player1.attack;
    player2.take_damage(damage);

    println!("{}", player2.status());
}
```

### 6.2.5 自动引用和解引用

```rust
// Rust 有一个很方便的特性：自动引用和解引用
// 当你用 . 调用方法时，Rust 会自动添加 &、&mut 或 *

impl Rectangle {
    fn area(&self) -> f64 {
        self.width * self.height
    }
}

fn main() {
    let rect = Rectangle::new(10.0, 5.0);

    // 这些写法是等价的：
    let a1 = rect.area();       // Rust 自动添加 &
    let a2 = (&rect).area();    // 手动写 &（不需要）

    // 这和 C/C++ 不同，C 中你需要区分 . 和 ->
    // Rust 统一用 .，由编译器自动处理
}
```

---

## 6.3 枚举（Enum）—— 比你想象的强大得多

### 6.3.1 基本枚举

```rust
// Rust 的枚举
enum Direction {
    Up,
    Down,
    Left,
    Right,
}

fn main() {
    let dir = Direction::Up;

    // 用 match 处理枚举
    match dir {
        Direction::Up => println!("向上"),
        Direction::Down => println!("向下"),
        Direction::Left => println!("向左"),
        Direction::Right => println!("向右"),
    }
}
```

对比 TypeScript：

```typescript
// TypeScript 的 enum
enum Direction {
    Up,
    Down,
    Left,
    Right,
}

const dir = Direction.Up;

// TS 的 enum 本质上是数字或字符串映射
// Rust 的 enum 更强大，每个变体可以携带不同类型的数据
```

### 6.3.2 携带数据的枚举 —— Rust 的杀手锏

这是 Rust 枚举最强大的特性 —— 每个变体可以携带不同类型和数量的数据：

```rust
// 每个变体可以携带不同的数据
enum Message {
    Quit,                           // 无数据
    Move { x: i32, y: i32 },       // 命名字段（类似结构体）
    Write(String),                  // 单个 String
    ChangeColor(u8, u8, u8),        // 三个 u8（RGB）
}

fn main() {
    let msg1 = Message::Quit;
    let msg2 = Message::Move { x: 10, y: 20 };
    let msg3 = Message::Write(String::from("hello"));
    let msg4 = Message::ChangeColor(255, 0, 128);

    process_message(msg2);
    process_message(msg3);
}

fn process_message(msg: Message) {
    match msg {
        Message::Quit => {
            println!("退出");
        }
        Message::Move { x, y } => {
            println!("移动到 ({}, {})", x, y);
        }
        Message::Write(text) => {
            println!("写入: {}", text);
        }
        Message::ChangeColor(r, g, b) => {
            println!("颜色: rgb({}, {}, {})", r, g, b);
        }
    }
}
```

### 6.3.3 对比 TypeScript 的 Union Type

TypeScript 中最接近 Rust 枚举的是**可辨识联合类型（Discriminated Union）**：

```typescript
// TypeScript：可辨识联合类型
type Message =
    | { kind: "quit" }
    | { kind: "move"; x: number; y: number }
    | { kind: "write"; text: string }
    | { kind: "changeColor"; r: number; g: number; b: number };

function processMessage(msg: Message) {
    switch (msg.kind) {
        case "quit":
            console.log("退出");
            break;
        case "move":
            console.log(`移动到 (${msg.x}, ${msg.y})`);
            break;
        case "write":
            console.log(`写入: ${msg.text}`);
            break;
        case "changeColor":
            console.log(`颜色: rgb(${msg.r}, ${msg.g}, ${msg.b})`);
            break;
    }
}
```

```
┌──────────────────────────────────────────────────────────────┐
│          Rust Enum vs TypeScript Discriminated Union          │
├──────────────────────────┬───────────────────────────────────┤
│       Rust               │     TypeScript                    │
├──────────────────────────┼───────────────────────────────────┤
│ enum 定义变体            │ type 联合多个类型                  │
│ 编译器保证穷尽匹配       │ switch 可能遗漏（可配置检查）     │
│ 零成本：编译后是高效标签 │ 运行时有 kind 字段的开销          │
│ match 表达式是值         │ switch 是语句（需要 break）       │
│ 可以有方法（impl）       │ 需要写独立的函数                  │
│ 编译时确定大小           │ 运行时动态                        │
└──────────────────────────┴───────────────────────────────────┘
```

### 6.3.4 为枚举实现方法

```rust
enum Shape {
    Circle(f64),                     // 半径
    Rectangle { width: f64, height: f64 },
    Triangle(f64, f64, f64),          // 三边长
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle(radius) => {
                std::f64::consts::PI * radius * radius
            }
            Shape::Rectangle { width, height } => {
                width * height
            }
            Shape::Triangle(a, b, c) => {
                // 海伦公式
                let s = (a + b + c) / 2.0;
                (s * (s - a) * (s - b) * (s - c)).sqrt()
            }
        }
    }

    fn describe(&self) -> String {
        match self {
            Shape::Circle(r) => format!("圆形（半径: {}）", r),
            Shape::Rectangle { width, height } =>
                format!("矩形（{}×{}）", width, height),
            Shape::Triangle(a, b, c) =>
                format!("三角形（边: {}, {}, {}）", a, b, c),
        }
    }
}

fn main() {
    let shapes: Vec<Shape> = vec![
        Shape::Circle(5.0),
        Shape::Rectangle { width: 10.0, height: 3.0 },
        Shape::Triangle(3.0, 4.0, 5.0),
    ];

    for shape in &shapes {
        println!("{} 的面积是 {:.2}", shape.describe(), shape.area());
    }
}
```

---

## 6.4 Option\<T\> —— 告别 null 和 undefined

### 6.4.1 JS/TS 中的 null 问题

```typescript
// TypeScript - null 和 undefined 是所有问题的根源之一
function findUser(id: number): User | null {
    // 可能返回 null
    return null;
}

const user = findUser(1);
// 如果忘记检查 null...
console.log(user.name); // 💥 运行时错误：Cannot read property 'name' of null

// 即使开启了 strictNullChecks，也容易忘记处理
```

> Tony Hoare（null 的发明者）称 null 为他的"十亿美元错误"。

### 6.4.2 Rust 的 Option\<T\>

Rust 中**没有 null**。取而代之的是 `Option<T>` 枚举：

```rust
// Option 的定义（标准库中）
enum Option<T> {
    Some(T),  // 有值
    None,     // 没有值
}

// Option 太常用了，所以 Some 和 None 不需要 Option:: 前缀
fn main() {
    let some_number: Option<i32> = Some(42);
    let no_number: Option<i32> = None;

    // 你不能把 Option<i32> 当作 i32 使用！
    // let result = some_number + 1; // ❌ 编译错误
    // 必须先处理 None 的情况
}
```

### 6.4.3 Option vs TypeScript 的 T | null | undefined

```
┌──────────────────────────────────────────────────────────────┐
│          Option<T>  vs  T | null | undefined                  │
├──────────────────────────┬───────────────────────────────────┤
│   Rust: Option<T>        │   TS: T | null | undefined        │
├──────────────────────────┼───────────────────────────────────┤
│ Some(value) 或 None      │ value 或 null 或 undefined        │
│ 编译时强制处理 None       │ 可能忘记检查 null（运行时爆炸）   │
│ 类型安全：Option<i32>    │ null 可以赋给几乎任何类型          │
│ 不能当 T 直接使用        │ TS 可能不够严格                    │
│ 必须用 match/unwrap 等   │ 可以直接 .property（可能爆炸）    │
│ 零成本抽象               │ 运行时检查                        │
└──────────────────────────┴───────────────────────────────────┘
```

### 6.4.4 处理 Option 的常用方法

```rust
fn find_user(id: u32) -> Option<String> {
    if id == 1 {
        Some(String::from("动动"))
    } else {
        None
    }
}

fn main() {
    let user = find_user(1);

    // 方法 1：match（最基础）
    match user {
        Some(name) => println!("找到用户: {}", name),
        None => println!("用户不存在"),
    }

    // 方法 2：if let（只关心 Some 的情况）
    let user = find_user(1);
    if let Some(name) = user {
        println!("找到用户: {}", name);
    }

    // 方法 3：unwrap（确信是 Some，否则 panic）
    let user = find_user(1);
    let name = user.unwrap(); // ⚠️ 如果是 None 会 panic！
    println!("用户: {}", name);

    // 方法 4：unwrap_or（提供默认值）
    let user = find_user(999);
    let name = user.unwrap_or(String::from("匿名用户"));
    println!("用户: {}", name); // "匿名用户"

    // 方法 5：unwrap_or_else（惰性默认值）
    let user = find_user(999);
    let name = user.unwrap_or_else(|| {
        println!("计算默认值...");
        String::from("默认用户")
    });

    // 方法 6：map（转换 Some 中的值）
    let user = find_user(1);
    let greeting = user.map(|name| format!("你好，{}！", name));
    println!("{:?}", greeting); // Some("你好，动动！")

    // 方法 7：and_then（链式操作，类似 flatMap）
    let result = find_user(1)
        .map(|name| name.len())          // Option<usize>
        .filter(|&len| len > 3)          // 过滤
        .map(|len| format!("名字长度: {}", len));
    println!("{:?}", result);

    // 方法 8：?  运算符（在返回 Option 的函数中）
    // 见下一节
}
```

### 6.4.5 ? 运算符 —— 优雅的错误传播

```rust
// ? 运算符：如果是 None，直接返回 None；如果是 Some，取出值继续
fn get_user_email_domain(id: u32) -> Option<String> {
    let name = find_user(id)?;  // 如果 None，直接返回 None
    let email = find_email(&name)?;  // 同上
    let domain = email.split('@').nth(1)?;  // 同上
    Some(domain.to_string())
}

fn find_user(id: u32) -> Option<String> {
    if id == 1 { Some(String::from("动动")) } else { None }
}

fn find_email(name: &str) -> Option<String> {
    if name == "动动" {
        Some(String::from("dong@example.com"))
    } else {
        None
    }
}

fn main() {
    // 如果任何步骤返回 None，整个函数返回 None
    match get_user_email_domain(1) {
        Some(domain) => println!("域名: {}", domain),
        None => println!("找不到域名"),
    }
}
```

对比 TypeScript 的可选链：

```typescript
// TypeScript 的 ?. 运算符类似，但在运行时检查
const domain = users
    ?.find(u => u.id === 1)
    ?.email
    ?.split('@')[1];
// domain 的类型是 string | undefined
```

---

## 6.5 模式匹配（Pattern Matching）深入

### 6.5.1 match 表达式

`match` 是 Rust 中最强大的控制流工具之一：

```rust
fn main() {
    let number = 13;

    // match 是一个表达式，有返回值
    let description = match number {
        1 => "一",
        2 | 3 | 5 | 7 | 11 | 13 => "质数",     // | 表示"或"
        4..=12 => "4到12之间",                     // ..= 表示范围
        13..=19 => "青少年",
        _ => "其他",                               // _ 是通配符
    };

    println!("{} 是 {}", number, description);
}
```

### 6.5.2 match 与枚举的完美配合

```rust
#[derive(Debug)]
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(UsState),  // 25 美分硬币上有州的标记
}

#[derive(Debug)]
enum UsState {
    Alabama,
    Alaska,
    California,
    // ...
}

fn value_in_cents(coin: &Coin) -> u32 {
    match coin {
        Coin::Penny => {
            println!("幸运便士！");
            1
        }
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter(state) => {
            println!("这是来自 {:?} 州的 25 美分！", state);
            25
        }
    }
}

fn main() {
    let coins = vec![
        Coin::Penny,
        Coin::Quarter(UsState::California),
        Coin::Dime,
    ];

    let total: u32 = coins.iter().map(|c| value_in_cents(c)).sum();
    println!("总价值: {} 美分", total);
}
```

### 6.5.3 match 必须穷尽所有情况

```rust
enum Color {
    Red,
    Green,
    Blue,
}

fn describe_color(color: Color) -> &'static str {
    match color {
        Color::Red => "红色",
        Color::Green => "绿色",
        // ❌ 编译错误！没有处理 Color::Blue
        // Rust 要求你处理所有可能的情况
    }
}

// ✅ 正确：处理所有情况
fn describe_color_v2(color: Color) -> &'static str {
    match color {
        Color::Red => "红色",
        Color::Green => "绿色",
        Color::Blue => "蓝色",
    }
}

// ✅ 或者用 _ 通配符处理剩余情况
fn is_red(color: Color) -> bool {
    match color {
        Color::Red => true,
        _ => false,  // 其他所有情况
    }
}
```

> 💡 这就是 Rust 枚举的安全保证 —— 你不可能忘记处理某个情况。如果后来添加了新的枚举变体，所有 `match` 都会编译失败，提醒你更新代码。

### 6.5.4 if let —— 简洁的单一模式匹配

当你只关心一种情况时，`if let` 比完整的 `match` 更简洁：

```rust
fn main() {
    let config_value: Option<u32> = Some(3);

    // 用 match（稍显冗余）
    match config_value {
        Some(val) => println!("配置值: {}", val),
        None => (), // 什么都不做... 但必须写
    }

    // 用 if let（更简洁）
    if let Some(val) = config_value {
        println!("配置值: {}", val);
    }

    // if let 也可以有 else
    if let Some(val) = config_value {
        println!("配置值: {}", val);
    } else {
        println!("没有配置");
    }

    // while let —— 循环匹配
    let mut stack = vec![1, 2, 3];
    while let Some(top) = stack.pop() {
        println!("弹出: {}", top);
    }
    // 输出: 3, 2, 1
}
```

### 6.5.5 let else —— 提前返回模式

```rust
// Rust 1.65+ 引入的 let else 语法
fn process_config(config: Option<String>) -> String {
    // 如果是 None，直接返回
    let Some(value) = config else {
        return String::from("使用默认配置");
    };

    // 这里 value 已经是 String（不是 Option<String>）
    format!("使用配置: {}", value)
}

fn main() {
    println!("{}", process_config(Some(String::from("custom"))));
    println!("{}", process_config(None));
}
```

---

## 6.6 常用模式与最佳实践

### 6.6.1 构建者模式（Builder Pattern）

```rust
struct HttpRequest {
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
}

struct HttpRequestBuilder {
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
}

impl HttpRequestBuilder {
    fn new(url: &str) -> HttpRequestBuilder {
        HttpRequestBuilder {
            url: url.to_string(),
            method: String::from("GET"),
            headers: Vec::new(),
            body: None,
        }
    }

    fn method(mut self, method: &str) -> HttpRequestBuilder {
        self.method = method.to_string();
        self  // 返回 self 以支持链式调用
    }

    fn header(mut self, key: &str, value: &str) -> HttpRequestBuilder {
        self.headers.push((key.to_string(), value.to_string()));
        self
    }

    fn body(mut self, body: &str) -> HttpRequestBuilder {
        self.body = Some(body.to_string());
        self
    }

    fn build(self) -> HttpRequest {
        HttpRequest {
            url: self.url,
            method: self.method,
            headers: self.headers,
            body: self.body,
        }
    }
}

fn main() {
    // 链式调用，非常优雅
    let request = HttpRequestBuilder::new("https://api.example.com/users")
        .method("POST")
        .header("Content-Type", "application/json")
        .header("Authorization", "Bearer token123")
        .body(r#"{"name": "动动"}"#)
        .build();

    println!("请求: {} {}", request.method, request.url);
}
```

### 6.6.2 新类型模式（Newtype Pattern）

```rust
// 用元组结构体包装基本类型，增加类型安全
struct Meters(f64);
struct Kilometers(f64);
struct Miles(f64);

impl Meters {
    fn to_kilometers(&self) -> Kilometers {
        Kilometers(self.0 / 1000.0)
    }

    fn to_miles(&self) -> Miles {
        Miles(self.0 / 1609.34)
    }
}

fn main() {
    let distance = Meters(42195.0); // 马拉松距离

    // 不能把 Meters 和 Kilometers 搞混！
    let km = distance.to_kilometers();
    let mi = distance.to_miles();

    println!("马拉松: {:.2}m = {:.2}km = {:.2}mi",
             distance.0, km.0, mi.0);

    // 类型安全：不能把 Meters 当 Kilometers 用
    // let wrong: Kilometers = distance; // ❌ 类型不匹配
}
```

### 6.6.3 状态机模式

```rust
// 用枚举表示状态，编译器保证状态转换的正确性
enum TrafficLight {
    Red,
    Yellow,
    Green,
}

impl TrafficLight {
    fn next(self) -> TrafficLight {
        match self {
            TrafficLight::Red => TrafficLight::Green,
            TrafficLight::Green => TrafficLight::Yellow,
            TrafficLight::Yellow => TrafficLight::Red,
        }
    }

    fn duration_seconds(&self) -> u32 {
        match self {
            TrafficLight::Red => 60,
            TrafficLight::Yellow => 5,
            TrafficLight::Green => 45,
        }
    }

    fn display(&self) -> &str {
        match self {
            TrafficLight::Red => "🔴 红灯",
            TrafficLight::Yellow => "🟡 黄灯",
            TrafficLight::Green => "🟢 绿灯",
        }
    }
}

fn main() {
    let mut light = TrafficLight::Red;

    for _ in 0..6 {
        println!("{} ({}秒)", light.display(), light.duration_seconds());
        light = light.next();
    }
}
```

### 6.6.4 用枚举替代继承

```rust
// TypeScript 中可能用继承/接口：
// abstract class Animal { abstract speak(): string; }
// class Dog extends Animal { speak() { return "汪!"; } }
// class Cat extends Animal { speak() { return "喵!"; } }

// Rust 中用枚举：
enum Animal {
    Dog { name: String, breed: String },
    Cat { name: String, indoor: bool },
    Fish { name: String, water_type: WaterType },
}

enum WaterType {
    Fresh,
    Salt,
}

impl Animal {
    fn speak(&self) -> &str {
        match self {
            Animal::Dog { .. } => "汪汪！",
            Animal::Cat { .. } => "喵喵！",
            Animal::Fish { .. } => "...",
        }
    }

    fn name(&self) -> &str {
        match self {
            Animal::Dog { name, .. } => name,
            Animal::Cat { name, .. } => name,
            Animal::Fish { name, .. } => name,
        }
    }

    fn describe(&self) -> String {
        match self {
            Animal::Dog { name, breed } =>
                format!("{} 是一只 {} 狗", name, breed),
            Animal::Cat { name, indoor } =>
                format!("{} 是一只{}猫", name, if *indoor { "室内" } else { "室外" }),
            Animal::Fish { name, water_type } => {
                let water = match water_type {
                    WaterType::Fresh => "淡水",
                    WaterType::Salt => "海水",
                };
                format!("{} 是一条{}鱼", name, water)
            }
        }
    }
}

fn main() {
    let animals = vec![
        Animal::Dog {
            name: String::from("旺财"),
            breed: String::from("金毛"),
        },
        Animal::Cat {
            name: String::from("咪咪"),
            indoor: true,
        },
        Animal::Fish {
            name: String::from("尼莫"),
            water_type: WaterType::Salt,
        },
    ];

    for animal in &animals {
        println!("{}: {} {}", animal.name(), animal.speak(), animal.describe());
    }
}
```

---

## 6.7 Result\<T, E\> —— 错误处理预览

`Result` 和 `Option` 类似，但用于可能出错的操作：

```rust
// Result 的定义（标准库中）
enum Result<T, E> {
    Ok(T),   // 成功，携带结果
    Err(E),  // 失败，携带错误
}

use std::fs;

fn read_config() -> Result<String, std::io::Error> {
    // ? 运算符：如果是 Err，直接返回 Err
    let content = fs::read_to_string("config.toml")?;
    Ok(content)
}

fn main() {
    match read_config() {
        Ok(content) => println!("配置内容:\n{}", content),
        Err(e) => println!("读取配置失败: {}", e),
    }

    // 或者用 unwrap_or_else
    let config = read_config().unwrap_or_else(|e| {
        println!("使用默认配置 (错误: {})", e);
        String::from("default = true")
    });
}
```

> 💡 `Result` 将在后续的错误处理章节中详细讲解。现在只需知道它是 `Option` 的"增强版" —— `Option` 表示"有或没有"，`Result` 表示"成功或失败（附带错误信息）"。

---

## 6.8 练习题

### 练习 1：定义和使用结构体

```rust
// 定义一个 Song 结构体，包含以下字段：
// - title: 歌曲名
// - artist: 歌手名
// - duration_secs: 时长（秒）
// - play_count: 播放次数
//
// 实现以下方法：
// - new(title, artist, duration_secs) -> Song
// - play(&mut self) - 增加播放次数
// - duration_display(&self) -> String - 返回 "MM:SS" 格式
// - is_long(&self) -> bool - 超过 5 分钟算长歌
//
// 实现关联函数：
// - most_played(songs: &[Song]) -> Option<&Song>

// 在这里写你的代码
```

<details>
<summary>📝 答案</summary>

```rust
#[derive(Debug)]
struct Song {
    title: String,
    artist: String,
    duration_secs: u32,
    play_count: u32,
}

impl Song {
    fn new(title: &str, artist: &str, duration_secs: u32) -> Song {
        Song {
            title: title.to_string(),
            artist: artist.to_string(),
            duration_secs,
            play_count: 0,
        }
    }

    fn play(&mut self) {
        self.play_count += 1;
        println!("🎵 正在播放: {} - {}", self.title, self.artist);
    }

    fn duration_display(&self) -> String {
        let minutes = self.duration_secs / 60;
        let seconds = self.duration_secs % 60;
        format!("{:02}:{:02}", minutes, seconds)
    }

    fn is_long(&self) -> bool {
        self.duration_secs > 300
    }

    fn most_played(songs: &[Song]) -> Option<&Song> {
        songs.iter().max_by_key(|s| s.play_count)
    }
}

fn main() {
    let mut playlist = vec![
        Song::new("晴天", "周杰伦", 269),
        Song::new("Bohemian Rhapsody", "Queen", 355),
        Song::new("稻香", "周杰伦", 223),
    ];

    playlist[0].play();
    playlist[0].play();
    playlist[1].play();

    for song in &playlist {
        println!("{} [{}] 播放 {} 次 {}",
                 song.title,
                 song.duration_display(),
                 song.play_count,
                 if song.is_long() { "(长歌)" } else { "" });
    }

    if let Some(top) = Song::most_played(&playlist) {
        println!("最多播放: {}", top.title);
    }
}
```

</details>

### 练习 2：设计枚举

```rust
// 设计一个表示 JSON 值的枚举 JsonValue
// JSON 可以是：
// - null
// - 布尔值
// - 数字（用 f64）
// - 字符串
// - 数组（Vec<JsonValue>）
// - 对象（Vec<(String, JsonValue)>，简化实现）
//
// 实现方法：
// - is_null(&self) -> bool
// - as_string(&self) -> Option<&str>
// - as_number(&self) -> Option<f64>
// - display(&self) -> String（简单的 JSON 格式化）
```

<details>
<summary>📝 答案</summary>

```rust
#[derive(Debug)]
enum JsonValue {
    Null,
    Bool(bool),
    Number(f64),
    Str(String),
    Array(Vec<JsonValue>),
    Object(Vec<(String, JsonValue)>),
}

impl JsonValue {
    fn is_null(&self) -> bool {
        matches!(self, JsonValue::Null)
    }

    fn as_string(&self) -> Option<&str> {
        match self {
            JsonValue::Str(s) => Some(s),
            _ => None,
        }
    }

    fn as_number(&self) -> Option<f64> {
        match self {
            JsonValue::Number(n) => Some(*n),
            _ => None,
        }
    }

    fn display(&self) -> String {
        match self {
            JsonValue::Null => "null".to_string(),
            JsonValue::Bool(b) => b.to_string(),
            JsonValue::Number(n) => n.to_string(),
            JsonValue::Str(s) => format!("\"{}\"", s),
            JsonValue::Array(arr) => {
                let items: Vec<String> = arr.iter().map(|v| v.display()).collect();
                format!("[{}]", items.join(", "))
            }
            JsonValue::Object(obj) => {
                let items: Vec<String> = obj.iter()
                    .map(|(k, v)| format!("\"{}\": {}", k, v.display()))
                    .collect();
                format!("{{{}}}", items.join(", "))
            }
        }
    }
}

fn main() {
    let json = JsonValue::Object(vec![
        ("name".to_string(), JsonValue::Str("动动".to_string())),
        ("age".to_string(), JsonValue::Number(28.0)),
        ("active".to_string(), JsonValue::Bool(true)),
        ("scores".to_string(), JsonValue::Array(vec![
            JsonValue::Number(90.0),
            JsonValue::Number(85.0),
            JsonValue::Number(95.0),
        ])),
        ("address".to_string(), JsonValue::Null),
    ]);

    println!("{}", json.display());

    if let JsonValue::Object(fields) = &json {
        for (key, value) in fields {
            println!("  {} = {}", key, value.display());
        }
    }
}
```

</details>

### 练习 3：Option 链式操作

```rust
// 实现一个简单的用户系统
// 功能：查找用户 → 获取邮箱 → 获取域名 → 判断是否为公司邮箱

struct User {
    name: String,
    email: Option<String>,
}

fn find_user(users: &[User], name: &str) -> Option<&User> {
    users.iter().find(|u| u.name == name)
}

// 实现这个函数：判断用户是否使用公司邮箱（非 gmail/qq/163）
fn is_corporate_email(users: &[User], name: &str) -> Option<bool> {
    // 使用 ? 运算符或链式方法
    todo!()
}

fn main() {
    let users = vec![
        User { name: "动动".to_string(), email: Some("dong@company.com".to_string()) },
        User { name: "小羊".to_string(), email: Some("yang@gmail.com".to_string()) },
        User { name: "小明".to_string(), email: None },
    ];

    for name in &["动动", "小羊", "小明", "不存在"] {
        match is_corporate_email(&users, name) {
            Some(true) => println!("{}: 使用公司邮箱 ✅", name),
            Some(false) => println!("{}: 使用个人邮箱 ❌", name),
            None => println!("{}: 无法确定 ❓", name),
        }
    }
}
```

<details>
<summary>📝 答案</summary>

```rust
fn is_corporate_email(users: &[User], name: &str) -> Option<bool> {
    let user = find_user(users, name)?;
    let email = user.email.as_ref()?;
    let domain = email.split('@').nth(1)?;

    let personal_domains = ["gmail.com", "qq.com", "163.com", "outlook.com"];
    Some(!personal_domains.contains(&domain))
}
```

</details>

### 练习 4：match 穷尽匹配

```rust
// 实现一个命令行计算器的命令解析器
enum Command {
    Add(f64, f64),
    Subtract(f64, f64),
    Multiply(f64, f64),
    Divide(f64, f64),
    Quit,
    Help,
}

// 实现 execute 方法，返回 Option<f64>
// Quit 和 Help 返回 None
// 除法除以 0 时返回 None
impl Command {
    fn execute(&self) -> Option<f64> {
        todo!()
    }

    fn describe(&self) -> String {
        todo!()
    }
}

fn main() {
    let commands = vec![
        Command::Add(10.0, 5.0),
        Command::Subtract(10.0, 3.0),
        Command::Multiply(4.0, 7.0),
        Command::Divide(10.0, 3.0),
        Command::Divide(10.0, 0.0),
        Command::Help,
        Command::Quit,
    ];

    for cmd in &commands {
        print!("{}: ", cmd.describe());
        match cmd.execute() {
            Some(result) => println!("= {:.2}", result),
            None => println!("（无结果）"),
        }
    }
}
```

<details>
<summary>📝 答案</summary>

```rust
impl Command {
    fn execute(&self) -> Option<f64> {
        match self {
            Command::Add(a, b) => Some(a + b),
            Command::Subtract(a, b) => Some(a - b),
            Command::Multiply(a, b) => Some(a * b),
            Command::Divide(a, b) => {
                if *b == 0.0 {
                    None
                } else {
                    Some(a / b)
                }
            }
            Command::Quit => None,
            Command::Help => {
                println!("可用命令: add, subtract, multiply, divide, quit");
                None
            }
        }
    }

    fn describe(&self) -> String {
        match self {
            Command::Add(a, b) => format!("{} + {}", a, b),
            Command::Subtract(a, b) => format!("{} - {}", a, b),
            Command::Multiply(a, b) => format!("{} × {}", a, b),
            Command::Divide(a, b) => format!("{} ÷ {}", a, b),
            Command::Quit => "退出".to_string(),
            Command::Help => "帮助".to_string(),
        }
    }
}
```

</details>

---

## 6.9 本章小结

```
┌──────────────────────────────────────────────────────────┐
│                     本章知识点回顾                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🏗️ 结构体（struct）                                    │
│     类似 TS 的 interface + class                         │
│     数据（struct）和行为（impl）分离                      │
│                                                          │
│  🔧 impl 块                                              │
│     &self（只读）/ &mut self（修改）/ self（消费）        │
│     关联函数（无 self，类似 static）                      │
│                                                          │
│  🎭 枚举（enum）                                         │
│     比 TS 的 enum 强大得多                                │
│     每个变体可携带不同数据                                │
│     类似 TS 的 discriminated union                        │
│                                                          │
│  ❓ Option<T>                                            │
│     替代 null/undefined                                  │
│     编译时强制处理 None                                   │
│     丰富的方法：map, and_then, unwrap_or, ?              │
│                                                          │
│  🎯 match 表达式                                         │
│     穷尽匹配（编译器保证）                                │
│     模式匹配 + 解构                                      │
│     if let / while let / let else                        │
│                                                          │
│  🏆 常用模式                                             │
│     构建者模式、新类型模式、状态机模式                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

> **下一章预告**：我们将学习 Rust 的错误处理体系 —— `Result<T, E>`、自定义错误类型和 `?` 运算符。告别 try/catch，迎接更安全的错误处理方式！

---

*📖 推荐阅读：[The Rust Programming Language - 结构体](https://doc.rust-lang.org/book/ch05-00-structs.html) | [The Rust Programming Language - 枚举](https://doc.rust-lang.org/book/ch06-00-enums.html) | [course.rs - 复合类型](https://course.rs/basic/compound-type/struct.html)*
