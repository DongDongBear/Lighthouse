# 第七章：模式匹配 —— Rust 最强大的控制流工具

> **本章目标**
>
> - 理解 `match` 表达式的工作原理，以及它与 JS `switch` 的本质区别
> - 掌握 Rust 中所有模式的种类：字面量、变量、通配符、解构
> - 学会使用 `if let` 和 `while let` 简化代码
> - 理解匹配守卫（match guard）的用途
> - 掌握 `@` 绑定语法
> - 熟练解构结构体、枚举、元组和嵌套结构
> - 理解模式的可辩驳性（refutability）
> - 完成实战练习题巩固所学

> **预计学习时间：90 - 120 分钟**

---

## 7.1 为什么模式匹配是 Rust 的杀手锏？

如果要选出一个让 Rust 程序员最"上瘾"的特性，模式匹配绝对排名前三。一旦你习惯了 Rust 的 `match`，回到 JavaScript 写 `switch` 时会感到一种深深的"退化感"。

在 JavaScript 中，我们经常写这样的代码：

```javascript
// JavaScript: 处理不同的 HTTP 状态码
function handleResponse(status) {
    switch (status) {
        case 200:
            console.log("成功");
            break;
        case 404:
            console.log("未找到");
            break;
        case 500:
            console.log("服务器错误");
            break;
        default:
            console.log("未知状态码");
    }
}
```

看起来还行？但这段代码有几个隐患：
1. **忘记 `break`** —— 一不小心就 fall through 到下一个分支
2. **`default` 可以不写** —— 编译器不会警告你遗漏了某些情况
3. **只能匹配简单值** —— 想解构对象？抱歉，做不到

Rust 的 `match` 解决了以上所有问题，而且功能强大得多：

```rust
// Rust: 处理不同的 HTTP 状态码
fn handle_response(status: u16) {
    match status {
        200 => println!("成功"),
        404 => println!("未找到"),
        500 => println!("服务器错误"),
        _ => println!("未知状态码: {}", status),
    }
}
```

关键区别：
- **没有 fall through** —— 每个分支（arm）执行完自动结束
- **穷尽性检查** —— 编译器确保你处理了所有可能的情况
- **`match` 是表达式** —— 它有返回值！

---

## 7.2 match 表达式基础

### 7.2.1 基本语法

```rust
// match 的基本结构
fn main() {
    let number = 42;

    // match 是表达式，可以赋值给变量
    let description = match number {
        0 => "零",              // 匹配字面量 0
        1 => "一",              // 匹配字面量 1
        2..=9 => "个位数",      // 匹配范围 2 到 9（包含两端）
        10..=99 => "两位数",    // 匹配范围 10 到 99
        100..=999 => "三位数",  // 匹配范围 100 到 999
        _ => "很大的数",        // 通配符，匹配所有其他情况
    };

    println!("{} 是 {}", number, description);
    // 输出: 42 是 两位数
}
```

> 💡 **对比 JS**：在 JavaScript 中，`switch` 是语句（statement），不是表达式（expression）。你不能写 `const x = switch(...) {...}`。但 Rust 的 `match` 是表达式，这意味着它有返回值，可以直接赋值。

### 7.2.2 match 是表达式

这一点非常重要，让我们多看几个例子：

```rust
fn main() {
    let coin = "quarter";

    // match 直接返回值
    let value_in_cents = match coin {
        "penny" => 1,
        "nickel" => 5,
        "dime" => 10,
        "quarter" => 25,
        _ => 0,
    };

    println!("价值 {} 美分", value_in_cents);
    // 输出: 价值 25 美分

    // 在函数调用中直接使用 match
    println!(
        "这枚硬币值 {} 美分",
        match coin {
            "penny" => 1,
            "nickel" => 5,
            "dime" => 10,
            "quarter" => 25,
            _ => 0,
        }
    );
}
```

### 7.2.3 多行分支

当一个分支需要执行多条语句时，使用花括号包裹：

```rust
fn main() {
    let number = 7;

    let result = match number {
        // 单行分支，直接写表达式
        0 => "零",

        // 多行分支，用花括号包裹
        1..=5 => {
            println!("这是一个小数字");
            println!("范围在 1 到 5 之间");
            "小数字"  // 最后一行是返回值（没有分号！）
        }

        // 另一个多行分支
        6..=10 => {
            let msg = format!("数字 {} 在 6-10 范围内", number);
            println!("{}", msg);
            "中等数字"
        }

        _ => "大数字",
    };

    println!("分类结果: {}", result);
}
```

### 7.2.4 穷尽性检查（Exhaustiveness）

这是 `match` 最强大的安全特性之一。编译器会确保你处理了所有可能的情况：

```rust
// 定义一个枚举
enum Direction {
    North,
    South,
    East,
    West,
}

fn describe_direction(dir: Direction) -> &'static str {
    match dir {
        Direction::North => "北方",
        Direction::South => "南方",
        Direction::East => "东方",
        // ❌ 编译错误！缺少 Direction::West
        // error[E0004]: non-exhaustive patterns: `West` not covered
    }
}
```

编译器会明确告诉你遗漏了哪些变体！这在 JavaScript 中是不可能的：

```javascript
// JavaScript: 编译器不会警告你遗漏了情况
function describeDirection(dir) {
    switch (dir) {
        case "north": return "北方";
        case "south": return "南方";
        case "east": return "东方";
        // 忘记了 "west"？没人告诉你！
    }
    // 返回 undefined... 然后 bug 就来了
}
```

正确的 Rust 写法：

```rust
fn describe_direction(dir: Direction) -> &'static str {
    match dir {
        Direction::North => "北方",
        Direction::South => "南方",
        Direction::East => "东方",
        Direction::West => "西方",  // ✅ 现在所有情况都覆盖了
    }
}
```

---

## 7.3 模式的种类

Rust 的模式远不止匹配简单的值。让我们逐一探索所有种类的模式。

### 7.3.1 字面量模式

匹配具体的值：

```rust
fn main() {
    let x = 42;

    match x {
        0 => println!("零"),
        1 => println!("一"),
        42 => println!("生命、宇宙以及一切的答案"),
        _ => println!("其他数字"),
    }

    // 也可以匹配其他类型的字面量
    let greeting = true;
    match greeting {
        true => println!("你好！"),
        false => println!("再见！"),
    }

    // 匹配字符
    let ch = 'A';
    match ch {
        'a'..='z' => println!("小写字母"),
        'A'..='Z' => println!("大写字母"),
        '0'..='9' => println!("数字"),
        _ => println!("其他字符"),
    }
}
```

### 7.3.2 变量模式

变量模式会**绑定**匹配到的值到一个新变量：

```rust
fn main() {
    let x = 42;

    match x {
        0 => println!("是零"),
        // n 会绑定到 x 的值
        n => println!("值是: {}", n),
    }

    // ⚠️ 注意：变量模式会"遮蔽"已有变量
    let y = 10;
    match x {
        // 这里的 y 不是在比较 x == 10
        // 而是创建了一个新变量 y，绑定了 x 的值
        y => println!("匹配到: {}", y),
    }
    // 原来的 y 仍然是 10
    println!("原来的 y: {}", y);
}
```

> ⚠️ **常见陷阱**：变量模式与你期望的"比较变量值"不同。如果你想匹配一个已有变量的值，请使用匹配守卫（后面会讲到）。

### 7.3.3 通配符模式

`_` 匹配任何值但不绑定：

```rust
fn main() {
    let pair = (1, 2);

    match pair {
        (0, 0) => println!("原点"),
        (x, 0) => println!("x 轴上，x = {}", x),
        (0, y) => println!("y 轴上，y = {}", y),
        (_, _) => println!("其他位置"),  // 不关心具体值
    }

    // _ 也可以部分使用
    let tuple = (1, 2, 3, 4, 5);
    match tuple {
        (first, _, third, _, fifth) => {
            // 只关心第 1、3、5 个元素
            println!("选中: {}, {}, {}", first, third, fifth);
        }
    }

    // 以 _ 开头的变量名不会触发"未使用变量"警告
    let _unused = 42;  // 编译器不会警告
}
```

### 7.3.4 或模式（Multiple Patterns）

使用 `|` 匹配多个模式：

```rust
fn main() {
    let x = 3;

    match x {
        1 | 2 => println!("一或二"),
        3 | 4 => println!("三或四"),
        5..=10 => println!("五到十"),
        _ => println!("其他"),
    }

    // 在枚举中特别有用
    enum Season {
        Spring,
        Summer,
        Autumn,
        Winter,
    }

    let season = Season::Summer;
    let is_warm = match season {
        Season::Spring | Season::Summer => true,
        Season::Autumn | Season::Winter => false,
    };
    println!("温暖的季节: {}", is_warm);
}
```

### 7.3.5 范围模式

使用 `..=` 匹配一个范围：

```rust
fn main() {
    let score = 85;

    let grade = match score {
        90..=100 => "A（优秀）",
        80..=89 => "B（良好）",
        70..=79 => "C（中等）",
        60..=69 => "D（及格）",
        0..=59 => "F（不及格）",
        _ => "无效分数",
    };

    println!("成绩等级: {}", grade);

    // 字符范围也可以
    let ch = 'ñ';
    let is_ascii_letter = match ch {
        'a'..='z' | 'A'..='Z' => true,
        _ => false,
    };
    println!("'{}' 是 ASCII 字母: {}", ch, is_ascii_letter);
}
```

---

## 7.4 解构（Destructuring）

解构是模式匹配最令人兴奋的部分。如果你用过 JavaScript 的解构赋值，你会感到很亲切 —— 但 Rust 的解构更强大，因为它和 `match` 结合在一起。

### 7.4.1 解构元组

```rust
fn main() {
    let point = (3, 7);

    // 基本解构
    let (x, y) = point;
    println!("x = {}, y = {}", x, y);

    // 在 match 中解构
    match point {
        (0, 0) => println!("原点"),
        (x, 0) => println!("在 x 轴上: ({}, 0)", x),
        (0, y) => println!("在 y 轴上: (0, {})", y),
        (x, y) => println!("一般点: ({}, {})", x, y),
    }

    // 嵌套元组解构
    let nested = ((1, 2), (3, 4));
    let ((a, b), (c, d)) = nested;
    println!("a={}, b={}, c={}, d={}", a, b, c, d);
}
```

> 💡 **对比 JS**：JavaScript 也有数组解构 `const [x, y] = [3, 7]`，但 JS 的解构不能用在 `switch` 中。Rust 可以在 `match` 中解构，这是质的飞跃。

### 7.4.2 解构结构体

```rust
struct Point {
    x: f64,
    y: f64,
}

struct Color {
    red: u8,
    green: u8,
    blue: u8,
}

fn main() {
    let origin = Point { x: 0.0, y: 0.0 };

    // 基本结构体解构
    let Point { x, y } = origin;
    println!("x = {}, y = {}", x, y);

    // 重命名绑定
    let point = Point { x: 3.0, y: 7.0 };
    let Point { x: px, y: py } = point;
    println!("px = {}, py = {}", px, py);

    // 在 match 中解构结构体
    let point = Point { x: 0.0, y: 5.0 };
    match point {
        Point { x: 0.0, y: 0.0 } => println!("原点"),
        Point { x, y: 0.0 } => println!("x 轴上: x = {}", x),
        Point { x: 0.0, y } => println!("y 轴上: y = {}", y),
        Point { x, y } => println!("点 ({}, {})", x, y),
    }

    // 部分解构，忽略某些字段
    let color = Color {
        red: 255,
        green: 128,
        blue: 0,
    };
    let Color { red, .. } = color;  // 只关心红色分量
    println!("红色分量: {}", red);

    // 在 match 中使用 ..
    match color {
        Color { red: 255, .. } => println!("全红"),
        Color { green: 255, .. } => println!("全绿"),
        Color { blue: 255, .. } => println!("全蓝"),
        _ => println!("混合色"),
    }
}
```

### 7.4.3 解构枚举

这是 Rust 模式匹配最常用的场景：

```rust
// 定义一个表示形状的枚举
enum Shape {
    Circle(f64),                    // 半径
    Rectangle(f64, f64),            // 宽, 高
    Triangle { a: f64, b: f64, c: f64 }, // 三边长
    Point,                          // 无关联数据
}

fn area(shape: &Shape) -> f64 {
    match shape {
        // 解构元组变体
        Shape::Circle(radius) => {
            std::f64::consts::PI * radius * radius
        }

        // 解构多字段元组变体
        Shape::Rectangle(width, height) => {
            width * height
        }

        // 解构命名字段变体（类似结构体）
        Shape::Triangle { a, b, c } => {
            // 海伦公式
            let s = (a + b + c) / 2.0;
            (s * (s - a) * (s - b) * (s - c)).sqrt()
        }

        // 无数据的变体
        Shape::Point => 0.0,
    }
}

fn main() {
    let shapes = vec![
        Shape::Circle(5.0),
        Shape::Rectangle(4.0, 6.0),
        Shape::Triangle { a: 3.0, b: 4.0, c: 5.0 },
        Shape::Point,
    ];

    for shape in &shapes {
        println!("面积: {:.2}", area(shape));
    }
    // 输出:
    // 面积: 78.54
    // 面积: 24.00
    // 面积: 6.00
    // 面积: 0.00
}
```

### 7.4.4 解构 Option 和 Result

这是你在 Rust 中**每天**都会写的代码：

```rust
fn find_user(id: u32) -> Option<String> {
    match id {
        1 => Some(String::from("Alice")),
        2 => Some(String::from("Bob")),
        _ => None,
    }
}

fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        Err(String::from("除以零"))
    } else {
        Ok(a / b)
    }
}

fn main() {
    // 解构 Option
    let user = find_user(1);
    match user {
        Some(name) => println!("找到用户: {}", name),
        None => println!("用户不存在"),
    }

    // 解构 Result
    let result = divide(10.0, 3.0);
    match result {
        Ok(value) => println!("结果: {:.2}", value),
        Err(msg) => println!("错误: {}", msg),
    }

    // 嵌套 Option
    let nested: Option<Option<i32>> = Some(Some(42));
    match nested {
        Some(Some(value)) => println!("内部值: {}", value),
        Some(None) => println!("外层有值，内层为空"),
        None => println!("外层就是空的"),
    }
}
```

> 💡 **对比 JS**：在 JavaScript 中，你可能用 `if (result !== null)` 或 `if (result !== undefined)` 来处理空值。这很容易遗漏。Rust 的 `match` + `Option` 组合让你**不可能**忘记处理 `None` 的情况。

---

## 7.5 if let 和 while let

有时候你只关心一种模式，用完整的 `match` 显得很啰嗦。这时候 `if let` 就派上用场了。

### 7.5.1 if let

```rust
fn main() {
    let some_value: Option<i32> = Some(42);

    // 方式一：完整的 match（啰嗦）
    match some_value {
        Some(x) => println!("值是: {}", x),
        None => {},  // 什么也不做，但还是得写
    }

    // 方式二：if let（简洁）
    if let Some(x) = some_value {
        println!("值是: {}", x);
    }

    // if let 也可以有 else
    if let Some(x) = some_value {
        println!("找到了: {}", x);
    } else {
        println!("没有值");
    }

    // if let 链式使用
    let config_value: Option<&str> = Some("42");

    if let Some(value) = config_value {
        if let Ok(number) = value.parse::<i32>() {
            println!("解析成功: {}", number);
        } else {
            println!("解析失败");
        }
    }

    // 用于枚举
    enum Message {
        Quit,
        Echo(String),
        Move { x: i32, y: i32 },
    }

    let msg = Message::Echo(String::from("你好"));

    if let Message::Echo(text) = msg {
        println!("收到消息: {}", text);
    }
}
```

> 💡 **经验法则**：如果你的 `match` 只有一个有意义的分支，其他分支都是 `_ => {}` 或 `_ => ()`，那就用 `if let`。

### 7.5.2 while let

`while let` 在循环中使用模式匹配，当模式不再匹配时退出循环：

```rust
fn main() {
    // 经典用法：弹出栈中的元素
    let mut stack = vec![1, 2, 3, 4, 5];

    // pop() 返回 Option<T>
    // 当栈空时返回 None，循环自动结束
    while let Some(top) = stack.pop() {
        println!("弹出: {}", top);
    }
    // 输出:
    // 弹出: 5
    // 弹出: 4
    // 弹出: 3
    // 弹出: 2
    // 弹出: 1

    println!("栈已清空");

    // 另一个例子：解析输入
    let mut chars = "Hello".chars();

    while let Some(ch) = chars.next() {
        println!("字符: {}", ch);
    }
}
```

对比 JavaScript：

```javascript
// JavaScript: 需要手动检查
const stack = [1, 2, 3, 4, 5];
let item;
while ((item = stack.pop()) !== undefined) {
    console.log("弹出:", item);
}
// 问题：如果栈中有 undefined 值呢？💥
```

### 7.5.3 let-else（Rust 1.65+）

`let-else` 是 Rust 1.65 引入的新语法，处理"必须匹配，否则提前返回"的场景：

```rust
fn process_config(config: Option<&str>) -> Result<i32, String> {
    // 如果 config 是 None，直接返回错误
    let Some(value) = config else {
        return Err(String::from("配置为空"));
    };

    // 这里 value 已经是 &str 了，不是 Option
    let Ok(number) = value.parse::<i32>() else {
        return Err(format!("无法解析: {}", value));
    };

    // number 已经是 i32 了
    Ok(number * 2)
}

fn main() {
    println!("{:?}", process_config(Some("21")));  // Ok(42)
    println!("{:?}", process_config(Some("abc"))); // Err("无法解析: abc")
    println!("{:?}", process_config(None));         // Err("配置为空")
}
```

> 💡 **对比 JS**：这类似于 JavaScript 的 early return 模式：
> ```javascript
> function process(config) {
>     if (!config) return { error: "配置为空" };
>     const number = parseInt(config);
>     if (isNaN(number)) return { error: "无法解析" };
>     return { value: number * 2 };
> }
> ```
> Rust 的 `let-else` 更优雅，而且有类型系统保证。

---

## 7.6 匹配守卫（Match Guards）

匹配守卫是在模式后面加一个额外的 `if` 条件。它解决了"模式不够灵活"的问题。

### 7.6.1 基本语法

```rust
fn main() {
    let number = 4;

    match number {
        // 模式 + 守卫条件
        n if n < 0 => println!("{} 是负数", n),
        n if n == 0 => println!("是零"),
        n if n % 2 == 0 => println!("{} 是正偶数", n),
        n => println!("{} 是正奇数", n),
    }
    // 输出: 4 是正偶数
}
```

### 7.6.2 解决变量遮蔽问题

还记得前面提到的变量模式陷阱吗？匹配守卫可以解决这个问题：

```rust
fn main() {
    let x = 42;
    let target = 42;

    match x {
        // ❌ 这不是比较 x 和 target
        // target 这里是一个新变量，会绑定 x 的值
        // target => println!("匹配"),

        // ✅ 正确做法：用匹配守卫
        n if n == target => println!("x 等于 target: {}", n),
        n => println!("x ({}) 不等于 target ({})", n, target),
    }
}
```

### 7.6.3 与解构组合使用

```rust
enum Temperature {
    Celsius(f64),
    Fahrenheit(f64),
}

fn describe_temp(temp: &Temperature) {
    match temp {
        // 解构 + 匹配守卫
        Temperature::Celsius(c) if *c > 35.0 => {
            println!("{}°C - 好热！🥵", c)
        }
        Temperature::Celsius(c) if *c < 0.0 => {
            println!("{}°C - 好冷！🥶", c)
        }
        Temperature::Celsius(c) => {
            println!("{}°C - 还行 😊", c)
        }
        Temperature::Fahrenheit(f) if *f > 95.0 => {
            println!("{}°F - 好热！🥵", f)
        }
        Temperature::Fahrenheit(f) if *f < 32.0 => {
            println!("{}°F - 好冷！🥶", f)
        }
        Temperature::Fahrenheit(f) => {
            println!("{}°F - 还行 😊", f)
        }
    }
}

fn main() {
    describe_temp(&Temperature::Celsius(38.5));     // 38.5°C - 好热！🥵
    describe_temp(&Temperature::Celsius(-5.0));     // -5°C - 好冷！🥶
    describe_temp(&Temperature::Celsius(22.0));     // 22°C - 还行 😊
    describe_temp(&Temperature::Fahrenheit(100.0)); // 100°F - 好热！🥵
}
```

### 7.6.4 守卫与或模式

匹配守卫应用于整个或模式，而不仅仅是最后一个：

```rust
fn main() {
    let x = 4;
    let y = false;

    match x {
        // 守卫 `if y` 应用于 4 | 5 | 6 整体
        // 等价于 (4 | 5 | 6) if y
        4 | 5 | 6 if y => println!("匹配"),
        _ => println!("不匹配"),
    }
    // 输出: 不匹配（因为 y 是 false）
}
```

---

## 7.7 @ 绑定

`@` 绑定允许你在匹配模式的同时，把值绑定到一个变量上。当你既想检查某个值是否满足条件，又想使用这个值时，`@` 非常有用。

### 7.7.1 基本用法

```rust
fn main() {
    let age = 25;

    match age {
        // 检查范围的同时绑定值
        n @ 0..=12 => println!("{}岁 - 儿童", n),
        n @ 13..=17 => println!("{}岁 - 青少年", n),
        n @ 18..=64 => println!("{}岁 - 成人", n),
        n @ 65.. => println!("{}岁 - 老年", n),
    }
    // 输出: 25岁 - 成人
}
```

### 7.7.2 在枚举解构中使用

```rust
enum Event {
    Click { x: i32, y: i32 },
    KeyPress(char),
    Resize { width: u32, height: u32 },
}

fn handle_event(event: Event) {
    match event {
        // 在解构的同时绑定整个内部值
        Event::Click { x: x @ 0..=100, y: y @ 0..=100 } => {
            println!("点击在有效区域内: ({}, {})", x, y);
        }
        Event::Click { x, y } => {
            println!("点击在有效区域外: ({}, {})", x, y);
        }
        Event::KeyPress(c @ 'a'..='z') => {
            println!("按下小写字母: {}", c);
        }
        Event::KeyPress(c @ 'A'..='Z') => {
            println!("按下大写字母: {}", c);
        }
        Event::KeyPress(c) => {
            println!("按下其他键: {}", c);
        }
        Event::Resize { width: w @ 800.., height: h @ 600.. } => {
            println!("高分辨率: {}x{}", w, h);
        }
        Event::Resize { width, height } => {
            println!("低分辨率: {}x{}", width, height);
        }
    }
}

fn main() {
    handle_event(Event::Click { x: 50, y: 30 });
    handle_event(Event::Click { x: 200, y: 300 });
    handle_event(Event::KeyPress('g'));
    handle_event(Event::KeyPress('Z'));
    handle_event(Event::Resize { width: 1920, height: 1080 });
    handle_event(Event::Resize { width: 640, height: 480 });
}
```

### 7.7.3 @ 与 Option/Result

```rust
fn process_value(opt: Option<i32>) {
    match opt {
        // 绑定整个 Some 的同时检查内部值
        some @ Some(1..=100) => {
            println!("有效值: {:?}", some);
        }
        Some(n) => {
            println!("超出范围: {}", n);
        }
        None => {
            println!("没有值");
        }
    }
}

fn main() {
    process_value(Some(42));   // 有效值: Some(42)
    process_value(Some(200));  // 超出范围: 200
    process_value(None);       // 没有值
}
```

---

## 7.8 嵌套模式与复杂匹配

现实世界的代码通常需要匹配复杂的嵌套结构。让我们看一些实际场景。

### 7.8.1 嵌套枚举

```rust
// 模拟一个 JSON 值
enum Json {
    Null,
    Bool(bool),
    Number(f64),
    Str(String),
    Array(Vec<Json>),
    Object(Vec<(String, Json)>),
}

fn describe_json(value: &Json) {
    match value {
        Json::Null => println!("null"),
        Json::Bool(true) => println!("布尔值: true"),
        Json::Bool(false) => println!("布尔值: false"),
        Json::Number(n) if *n == 0.0 => println!("数字零"),
        Json::Number(n) => println!("数字: {}", n),
        Json::Str(s) if s.is_empty() => println!("空字符串"),
        Json::Str(s) => println!("字符串: \"{}\"", s),
        Json::Array(arr) if arr.is_empty() => println!("空数组"),
        Json::Array(arr) => println!("数组，包含 {} 个元素", arr.len()),
        Json::Object(obj) if obj.is_empty() => println!("空对象"),
        Json::Object(obj) => println!("对象，包含 {} 个键", obj.len()),
    }
}
```

### 7.8.2 解构嵌套结构体

```rust
struct Address {
    city: String,
    country: String,
}

struct Person {
    name: String,
    age: u32,
    address: Option<Address>,
}

fn greet(person: &Person) {
    match person {
        // 嵌套解构：解构 Person，再解构内部的 Option<Address>，再解构 Address
        Person {
            name,
            age: age @ 0..=17,
            address: Some(Address { city, country }),
        } => {
            println!(
                "你好 {}！你今年 {} 岁，来自 {}，{}。未成年哦！",
                name, age, city, country
            );
        }
        Person {
            name,
            age,
            address: Some(Address { city, .. }),
        } => {
            println!("你好 {}！{} 岁，住在 {}。", name, age, city);
        }
        Person {
            name,
            address: None,
            ..
        } => {
            println!("你好 {}！地址未知。", name);
        }
    }
}

fn main() {
    let alice = Person {
        name: String::from("Alice"),
        age: 15,
        address: Some(Address {
            city: String::from("东京"),
            country: String::from("日本"),
        }),
    };

    let bob = Person {
        name: String::from("Bob"),
        age: 30,
        address: Some(Address {
            city: String::from("北京"),
            country: String::from("中国"),
        }),
    };

    let charlie = Person {
        name: String::from("Charlie"),
        age: 25,
        address: None,
    };

    greet(&alice);   // 你好 Alice！你今年 15 岁，来自 东京，日本。未成年哦！
    greet(&bob);     // 你好 Bob！30 岁，住在 北京。
    greet(&charlie); // 你好 Charlie！地址未知。
}
```

### 7.8.3 匹配引用

在处理引用时，模式匹配也有特殊语法：

```rust
fn main() {
    let reference = &42;

    // 方式一：在模式中使用 &
    match reference {
        &val => println!("解引用后的值: {}", val),
    }

    // 方式二：先解引用再匹配
    match *reference {
        val => println!("值: {}", val),
    }

    // 在 Vec 的遍历中常见
    let numbers = vec![1, 2, 3, 4, 5];

    for &num in &numbers {
        // num 是 i32，不是 &i32
        println!("{}", num);
    }

    // 等价于
    for num in &numbers {
        // num 是 &i32
        println!("{}", *num);
    }
}
```

### 7.8.4 切片模式

Rust 还支持对切片和数组进行模式匹配：

```rust
fn describe_slice(slice: &[i32]) {
    match slice {
        [] => println!("空切片"),
        [single] => println!("只有一个元素: {}", single),
        [first, second] => println!("两个元素: {} 和 {}", first, second),
        [first, .., last] => {
            println!(
                "多个元素，第一个 = {}，最后一个 = {}，共 {} 个",
                first,
                last,
                slice.len()
            );
        }
    }
}

fn main() {
    describe_slice(&[]);           // 空切片
    describe_slice(&[42]);         // 只有一个元素: 42
    describe_slice(&[1, 2]);       // 两个元素: 1 和 2
    describe_slice(&[1, 2, 3, 4]); // 多个元素，第一个 = 1，最后一个 = 4，共 4 个

    // 也可以绑定中间的元素
    let nums = [1, 2, 3, 4, 5];
    match nums {
        [first, rest @ ..] => {
            println!("第一个: {}, 剩余: {:?}", first, rest);
        }
    }
    // 输出: 第一个: 1, 剩余: [2, 3, 4, 5]
}
```

---

## 7.9 模式出现的所有位置

模式匹配不仅仅出现在 `match` 中！Rust 中很多地方都可以使用模式：

```rust
fn main() {
    // 1. let 语句
    let (x, y, z) = (1, 2, 3);

    // 2. 函数参数
    fn print_point(&(x, y): &(i32, i32)) {
        println!("x = {}, y = {}", x, y);
    }
    print_point(&(3, 7));

    // 3. for 循环
    let pairs = vec![(1, "one"), (2, "two"), (3, "three")];
    for (number, name) in &pairs {
        println!("{} = {}", number, name);
    }

    // 4. if let
    if let Some(x) = Some(42) {
        println!("x = {}", x);
    }

    // 5. while let
    let mut stack = vec![1, 2, 3];
    while let Some(top) = stack.pop() {
        println!("{}", top);
    }

    // 6. let-else
    let Some(value) = Some(42) else {
        return;
    };
    println!("value = {}", value);

    // 7. 闭包参数
    let points = vec![(1, 2), (3, 4), (5, 6)];
    let sum: i32 = points.iter().map(|(x, y)| x + y).sum();
    println!("总和: {}", sum);
}
```

---

## 7.10 可辩驳性（Refutability）

这是一个重要的概念：模式分为**可辩驳的**（refutable）和**不可辩驳的**（irrefutable）。

- **不可辩驳模式**：一定能匹配成功的模式。例如 `let x = 5;` 中的 `x`。
- **可辩驳模式**：可能匹配失败的模式。例如 `if let Some(x) = value` 中的 `Some(x)`。

```rust
fn main() {
    // ✅ let 需要不可辩驳模式
    let x = 5;
    let (a, b) = (1, 2);

    // ❌ 编译错误：let 不能使用可辩驳模式
    // let Some(x) = Some(42);
    // 因为如果值是 None 呢？let 没法处理这种情况

    // ✅ if let 可以使用可辩驳模式
    if let Some(x) = Some(42) {
        println!("x = {}", x);
    }

    // ⚠️ 编译警告：if let 使用不可辩驳模式没有意义
    // if let x = 5 {  // x 总是会匹配，这个 if 没有意义
    //     println!("x = {}", x);
    // }
}
```

---

## 7.11 实战：用模式匹配构建一个命令解析器

让我们用本章学到的知识构建一个简单的命令行解析器：

```rust
#[derive(Debug)]
enum Command {
    Quit,
    Echo(String),
    Move { x: i32, y: i32 },
    Color(u8, u8, u8),
    Unknown(String),
}

fn parse_command(input: &str) -> Command {
    // 按空格分割输入
    let parts: Vec<&str> = input.trim().split_whitespace().collect();

    // 使用切片模式匹配
    match parts.as_slice() {
        // 匹配 "quit" 或 "exit"
        ["quit"] | ["exit"] => Command::Quit,

        // 匹配 "echo" 后跟任意文字
        ["echo", rest @ ..] => {
            Command::Echo(rest.join(" "))
        }

        // 匹配 "move x y"
        ["move", x_str, y_str] => {
            match (x_str.parse::<i32>(), y_str.parse::<i32>()) {
                (Ok(x), Ok(y)) => Command::Move { x, y },
                _ => Command::Unknown(input.to_string()),
            }
        }

        // 匹配 "color r g b"
        ["color", r, g, b] => {
            match (r.parse::<u8>(), g.parse::<u8>(), b.parse::<u8>()) {
                (Ok(r), Ok(g), Ok(b)) => Command::Color(r, g, b),
                _ => Command::Unknown(input.to_string()),
            }
        }

        // 空输入
        [] => Command::Unknown(String::new()),

        // 其他所有情况
        _ => Command::Unknown(input.to_string()),
    }
}

fn execute_command(cmd: &Command) {
    match cmd {
        Command::Quit => {
            println!("👋 再见！");
        }
        Command::Echo(text) => {
            println!("📢 {}", text);
        }
        Command::Move { x, y } => {
            println!("🏃 移动到 ({}, {})", x, y);
        }
        Command::Color(r, g, b) => {
            println!("🎨 设置颜色为 RGB({}, {}, {})", r, g, b);
        }
        Command::Unknown(input) if input.is_empty() => {
            println!("❓ 请输入命令");
        }
        Command::Unknown(input) => {
            println!("❓ 未知命令: {}", input);
        }
    }
}

fn main() {
    let commands = vec![
        "echo Hello World",
        "move 10 20",
        "color 255 128 0",
        "quit",
        "unknown stuff",
        "",
    ];

    for input in commands {
        let cmd = parse_command(input);
        println!("输入: {:?} => 命令: {:?}", input, cmd);
        execute_command(&cmd);
        println!("---");
    }
}
```

---

## 7.12 实战：状态机

模式匹配非常适合实现状态机：

```rust
#[derive(Debug)]
enum TrafficLight {
    Red { remaining_seconds: u32 },
    Yellow { remaining_seconds: u32 },
    Green { remaining_seconds: u32 },
}

impl TrafficLight {
    fn new() -> Self {
        TrafficLight::Red { remaining_seconds: 30 }
    }

    fn tick(self) -> Self {
        match self {
            TrafficLight::Red { remaining_seconds: 0 } => {
                println!("🟢 红灯结束，切换到绿灯");
                TrafficLight::Green { remaining_seconds: 25 }
            }
            TrafficLight::Red { remaining_seconds } => {
                TrafficLight::Red {
                    remaining_seconds: remaining_seconds - 1,
                }
            }
            TrafficLight::Green { remaining_seconds: 0 } => {
                println!("🟡 绿灯结束，切换到黄灯");
                TrafficLight::Yellow { remaining_seconds: 5 }
            }
            TrafficLight::Green { remaining_seconds } => {
                TrafficLight::Green {
                    remaining_seconds: remaining_seconds - 1,
                }
            }
            TrafficLight::Yellow { remaining_seconds: 0 } => {
                println!("🔴 黄灯结束，切换到红灯");
                TrafficLight::Red { remaining_seconds: 30 }
            }
            TrafficLight::Yellow { remaining_seconds } => {
                TrafficLight::Yellow {
                    remaining_seconds: remaining_seconds - 1,
                }
            }
        }
    }

    fn display(&self) {
        match self {
            TrafficLight::Red { remaining_seconds } => {
                println!("🔴 红灯 - 还剩 {}s", remaining_seconds);
            }
            TrafficLight::Yellow { remaining_seconds } => {
                println!("🟡 黄灯 - 还剩 {}s", remaining_seconds);
            }
            TrafficLight::Green { remaining_seconds } => {
                println!("🟢 绿灯 - 还剩 {}s", remaining_seconds);
            }
        }
    }
}

fn main() {
    let mut light = TrafficLight::new();

    // 模拟 65 秒的交通灯变化
    for second in 0..65 {
        if second % 10 == 0 {
            print!("[{}s] ", second);
            light.display();
        }
        light = light.tick();
    }
}
```

---

## 7.13 常见错误与最佳实践

### 7.13.1 不要忽略编译器警告

```rust
fn main() {
    let x = 5;

    // ⚠️ 编译器警告：unreachable pattern
    // match x {
    //     n => println!("任意值: {}", n),  // 这个分支匹配所有值
    //     5 => println!("五"),             // ❌ 永远不会执行！
    // }

    // ✅ 正确顺序：具体的在前，通用的在后
    match x {
        5 => println!("五"),
        n => println!("其他值: {}", n),
    }
}
```

### 7.13.2 善用穷尽性检查

```rust
// 当你添加新的枚举变体时，编译器会告诉你所有需要更新的地方
enum Animal {
    Dog,
    Cat,
    Bird,
    Fish,  // 新增变体
}

fn sound(animal: &Animal) -> &str {
    match animal {
        Animal::Dog => "汪汪",
        Animal::Cat => "喵喵",
        Animal::Bird => "叽叽",
        // 如果忘记处理 Fish，编译器会报错！
        Animal::Fish => "...",
    }
}
```

### 7.13.3 避免过度嵌套

```rust
// ❌ 过度嵌套
fn process_bad(a: Option<i32>, b: Option<i32>) {
    match a {
        Some(x) => match b {
            Some(y) => println!("两个都有: {} {}", x, y),
            None => println!("只有 a"),
        },
        None => match b {
            Some(y) => println!("只有 b: {}", y),
            None => println!("都没有"),
        },
    }
}

// ✅ 用元组扁平化
fn process_good(a: Option<i32>, b: Option<i32>) {
    match (a, b) {
        (Some(x), Some(y)) => println!("两个都有: {} {}", x, y),
        (Some(_), None) => println!("只有 a"),
        (None, Some(y)) => println!("只有 b: {}", y),
        (None, None) => println!("都没有"),
    }
}
```

---

## 7.14 练习题

### 练习 1：温度转换器

实现一个温度转换函数，使用枚举和模式匹配：

```rust
enum Temperature {
    Celsius(f64),
    Fahrenheit(f64),
    Kelvin(f64),
}

/// 将任意温度单位转换为摄氏度
fn to_celsius(temp: &Temperature) -> f64 {
    // 在这里实现
    // C = (F - 32) * 5/9
    // C = K - 273.15
    todo!()
}

/// 描述温度的体感
fn describe_feeling(temp: &Temperature) -> &str {
    // 先转换为摄氏度，然后根据范围返回描述
    // < 0: "冰冷 🥶"
    // 0-15: "寒冷 🧥"
    // 15-25: "舒适 😊"
    // 25-35: "炎热 🥵"
    // > 35: "酷热 🔥"
    todo!()
}
```

### 练习 2：表达式求值器

实现一个简单的数学表达式求值器：

```rust
enum Expr {
    Num(f64),
    Add(Box<Expr>, Box<Expr>),
    Sub(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
    Div(Box<Expr>, Box<Expr>),
}

/// 求值
fn eval(expr: &Expr) -> Result<f64, String> {
    // 使用模式匹配递归求值
    // 注意：除以零时返回 Err
    todo!()
}

/// 格式化为字符串
fn format_expr(expr: &Expr) -> String {
    // 例如：Add(Num(1), Mul(Num(2), Num(3))) => "(1 + (2 * 3))"
    todo!()
}
```

### 练习 3：消息路由器

使用模式匹配实现一个消息路由系统：

```rust
#[derive(Debug)]
enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug)]
enum MessageType {
    Text(String),
    Image { url: String, width: u32, height: u32 },
    Video { url: String, duration_secs: u32 },
    System(String),
}

#[derive(Debug)]
struct Message {
    from: String,
    to: String,
    priority: Priority,
    content: MessageType,
}

fn route_message(msg: &Message) {
    // 使用嵌套模式匹配实现以下规则：
    // 1. Critical 优先级的任何消息 -> 立即推送通知
    // 2. System 类型的消息 -> 写入日志
    // 3. Image/Video 如果来自 "admin" -> 优先处理
    // 4. Text 消息如果内容包含 "urgent" -> 升级优先级
    // 5. 其他 -> 放入普通队列
    todo!()
}
```

### 练习 4：解析 RGB 颜色

```rust
/// 从不同格式解析颜色
fn parse_color(input: &str) -> Option<(u8, u8, u8)> {
    let parts: Vec<&str> = input.split_whitespace().collect();

    // 使用切片模式匹配以下格式：
    // "rgb 255 128 0"
    // "hex FF8000"
    // "red", "green", "blue", "white", "black" (预定义颜色)
    // 返回 None 如果格式不正确
    todo!()
}
```

---

## 7.15 本章小结

模式匹配是 Rust 最强大、最优雅的特性之一。让我们回顾关键知识点：

| 特性 | Rust | JavaScript |
|---|---|---|
| 基本匹配 | `match` 表达式 | `switch` 语句 |
| 返回值 | ✅ 是表达式 | ❌ 是语句 |
| 穷尽性检查 | ✅ 编译器强制 | ❌ 没有 |
| Fall through | ❌ 不会 | ✅ 忘写 break 就出 bug |
| 解构 | ✅ 深度嵌套 | ⚠️ 仅在 let/const 中 |
| 守卫条件 | ✅ `if` 守卫 | ❌ 不支持 |
| 范围匹配 | ✅ `1..=10` | ❌ 不支持 |
| 切片模式 | ✅ `[first, .., last]` | ❌ 不支持 |

**核心理念**：Rust 的模式匹配不仅仅是一个"更好的 switch"——它是一种**思维方式**。当你定义了枚举后，`match` 强制你处理每一种可能性，这让你的代码更安全、更可靠。

> 📖 **下一章预告**：第八章我们将学习 Rust 的错误处理。你会发现，模式匹配在错误处理中无处不在——`Result` 和 `Option` 的处理几乎都依赖于本章所学的技术。
