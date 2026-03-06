# 第十七章：宏 —— Rust 的元编程利器

> **本章目标**
>
> - 理解宏与函数的本质区别（编译时 vs 运行时）
> - 掌握声明宏 `macro_rules!` 的模式匹配语法
> - 熟练使用常用标准库宏：`vec!`、`println!`、`format!`、`todo!`、`dbg!`
> - 了解过程宏的三种类型：derive 宏、属性宏、函数宏
> - 动手实现一个自定义 derive 宏
> - 学会宏调试技巧
> - 通过练习题巩固对宏系统的理解

> **预计学习时间：90 - 120 分钟**

---

## 17.1 宏 vs 函数 —— 为什么需要宏？

### 17.1.1 从 JavaScript 的角度理解

在 JavaScript 中，你可能用过一些"魔法"工具：

```javascript
// Babel 插件 —— 在编译时转换代码
// TypeScript 装饰器 —— 给类和方法添加元信息
// Webpack loader —— 在构建时处理文件

// 但这些都是"外部工具"，不是语言本身的能力
```

Rust 的宏系统是**语言内置的元编程能力**，它让你可以在**编译时**生成代码。这就像给编译器写了一个"代码生成器"。

### 17.1.2 宏和函数的根本区别

```
┌──────────────────────────────────────────────────────────────────┐
│                    宏 vs 函数 对比                                │
├──────────────────┬───────────────────┬───────────────────────────┤
│     特性          │      函数         │        宏                 │
├──────────────────┼───────────────────┼───────────────────────────┤
│  展开时机         │  运行时调用       │  编译时展开                │
│  参数数量         │  固定             │  可变（如 vec![1,2,3]）    │
│  参数类型         │  必须声明类型     │  可以接受任意 token        │
│  能做什么         │  操作值           │  生成代码                  │
│  调试难度         │  简单             │  较难                      │
│  调用语法         │  foo()            │  foo!() 或 foo![]          │
│  类比 JS          │  普通函数         │  Babel 插件 + 模板字面量   │
└──────────────────┴───────────────────┴───────────────────────────┘
```

来看一个直观的例子：

```rust
// 函数：参数数量固定，类型固定
fn add(a: i32, b: i32) -> i32 {
    a + b
}

// 宏：可以接受任意数量的参数！
// vec! 可以接受 0 个、1 个、100 个参数
let v1 = vec![];           // 0 个
let v2 = vec![1];          // 1 个
let v3 = vec![1, 2, 3];   // 3 个
let v4 = vec![0; 100];    // 特殊语法：100 个 0

// 用函数实现同样的功能？你需要写无数个重载！
// fn vec_0() -> Vec<T> { ... }
// fn vec_1(a: T) -> Vec<T> { ... }
// fn vec_2(a: T, b: T) -> Vec<T> { ... }
// ... 不可能穷举！
```

### 17.1.3 宏的工作流程

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│  源代码      │ → │  宏展开       │ → │  类型检查     │ → │  编译     │
│  (含宏调用)  │    │  (替换为代码) │    │  (检查展开后) │    │  生成二进制│
└─────────────┘    └──────────────┘    └──────────────┘    └──────────┘

示例：
  vec![1, 2, 3]
       ↓  宏展开
  {
      let mut temp_vec = Vec::new();
      temp_vec.push(1);
      temp_vec.push(2);
      temp_vec.push(3);
      temp_vec
  }
       ↓  类型检查 & 编译
  正常的 Rust 代码
```

### 17.1.4 为什么不能只用函数？

有些事情函数**根本做不到**：

```rust
// 1. println! 需要在编译时解析格式字符串
println!("你好，{}！你今年 {} 岁", name, age);
// 编译器会在编译时检查：参数数量是否匹配、类型是否正确
// 函数无法在编译时检查字符串格式！

// 2. 自动实现 trait（derive 宏）
#[derive(Debug, Clone, PartialEq)]
struct User {
    name: String,
    age: u32,
}
// 编译器自动生成 Debug、Clone、PartialEq 的实现代码
// 函数无法生成 impl 块！

// 3. 条件编译
#[cfg(target_os = "windows")]
fn platform_specific() {
    println!("这是 Windows");
}
#[cfg(target_os = "linux")]
fn platform_specific() {
    println!("这是 Linux");
}
// 根据编译目标选择不同的代码，函数做不到！
```

---

## 17.2 声明宏 `macro_rules!` —— 模式匹配的代码模板

### 17.2.1 基本语法

声明宏（Declarative Macros）是最常用的宏类型。它的语法类似 `match` 表达式：

```rust
// 基本结构
macro_rules! 宏名称 {
    // 模式 => 展开代码
    (匹配模式1) => {
        生成的代码1
    };
    (匹配模式2) => {
        生成的代码2
    };
}
```

来看最简单的例子：

```rust
// 定义一个简单的宏
macro_rules! say_hello {
    // 没有参数的模式
    () => {
        println!("你好，世界！");
    };
}

fn main() {
    say_hello!();  // 展开为：println!("你好，世界！");
}
```

### 17.2.2 捕获标记（Metavariables）

宏的模式匹配使用特殊的**捕获标记**来匹配不同类型的语法元素：

```
┌──────────────────────────────────────────────────────────────┐
│                    宏捕获标记类型                              │
├──────────────┬───────────────────────────────────────────────┤
│  标记         │  匹配内容                                     │
├──────────────┼───────────────────────────────────────────────┤
│  $x:expr     │  表达式：1 + 2, foo(), vec![1,2]              │
│  $x:ty       │  类型：i32, String, Vec<u8>                   │
│  $x:ident    │  标识符：变量名、函数名、类型名                  │
│  $x:pat      │  模式：_, Some(x), 1..=5                      │
│  $x:stmt     │  语句：let x = 1;                             │
│  $x:block    │  代码块：{ ... }                               │
│  $x:item     │  条目：fn, struct, impl 等                    │
│  $x:path     │  路径：std::collections::HashMap              │
│  $x:tt       │  单个 token tree（最灵活，匹配几乎任何东西）     │
│  $x:literal  │  字面量：42, "hello", true                    │
│  $x:meta     │  元属性：derive(Debug)                        │
│  $x:vis      │  可见性：pub, pub(crate)                      │
│  $x:lifetime │  生命周期：'a, 'static                        │
└──────────────┴───────────────────────────────────────────────┘
```

### 17.2.3 带参数的宏

```rust
// 接受一个表达式参数
macro_rules! double {
    ($x:expr) => {
        $x * 2
    };
}

fn main() {
    let result = double!(5);    // 展开为：5 * 2 → 10
    let result2 = double!(3 + 4); // 展开为：(3 + 4) * 2 → 14
    // 注意！宏会直接替换，所以：
    // double!(3 + 4) 展开为 3 + 4 * 2 = 11？
    // 不！Rust 宏比 C 宏聪明，每个 $x:expr 捕获的是完整表达式
    // 实际展开为 (3 + 4) * 2 = 14 ✓
    println!("{}, {}", result, result2);
}
```

### 17.2.4 多个参数

```rust
// 接受多个参数
macro_rules! min {
    // 两个参数的版本
    ($a:expr, $b:expr) => {
        if $a < $b { $a } else { $b }
    };
    // 三个参数的版本
    ($a:expr, $b:expr, $c:expr) => {
        min!(min!($a, $b), $c)
    };
}

fn main() {
    println!("{}", min!(3, 5));       // 3
    println!("{}", min!(7, 2, 9));    // 2
}
```

### 17.2.5 重复模式（Repetition）—— 宏的核心威力

这是宏最强大的特性，也是函数做不到的事情：

```rust
// 语法：$( 模式 ),* 表示"零次或多次重复，用逗号分隔"
//        $( 模式 ),+ 表示"一次或多次重复，用逗号分隔"
//        $( 模式 );* 表示"零次或多次重复，用分号分隔"

// 实现一个简化版的 vec! 宏
macro_rules! my_vec {
    // 模式：零个或多个表达式，用逗号分隔
    ( $( $x:expr ),* ) => {
        {
            let mut temp_vec = Vec::new();
            // 对每个捕获的表达式重复执行 push
            $(
                temp_vec.push($x);
            )*
            temp_vec
        }
    };
}

fn main() {
    let v = my_vec![1, 2, 3, 4, 5];
    println!("{:?}", v); // [1, 2, 3, 4, 5]

    let empty: Vec<i32> = my_vec![];
    println!("{:?}", empty); // []
}
```

让我们详细拆解重复模式的语法：

```
定义端（匹配模式）：
  $( $x:expr ),*
  ├─ $(        → 重复组开始
  │  $x:expr   → 每次重复捕获一个表达式，命名为 $x
  │  )         → 重复组结束
  │  ,         → 分隔符（可选，可以是任何 token）
  └─ *         → 重复次数（* = 零次或多次，+ = 一次或多次，? = 零次或一次）

展开端（生成代码）：
  $( temp_vec.push($x); )*
  ├─ $(                    → 重复组开始
  │  temp_vec.push($x);   → 每次重复生成的代码，$x 被替换为捕获的值
  │  )                    → 重复组结束
  └─ *                    → 与定义端的重复次数对应

示例展开：
  my_vec![10, 20, 30]
  ↓
  {
      let mut temp_vec = Vec::new();
      temp_vec.push(10);  // 第一次重复
      temp_vec.push(20);  // 第二次重复
      temp_vec.push(30);  // 第三次重复
      temp_vec
  }
```

### 17.2.6 多分支模式匹配

宏可以有多个匹配分支，编译器会从上到下尝试匹配：

```rust
macro_rules! calculate {
    // 分支 1：加法
    (add $a:expr, $b:expr) => {
        $a + $b
    };
    // 分支 2：乘法
    (mul $a:expr, $b:expr) => {
        $a * $b
    };
    // 分支 3：取反
    (neg $a:expr) => {
        -$a
    };
}

fn main() {
    println!("{}", calculate!(add 1, 2));  // 3
    println!("{}", calculate!(mul 3, 4));  // 12
    println!("{}", calculate!(neg 5));     // -5
}
```

### 17.2.7 实战：实现一个 `hashmap!` 宏

在 JavaScript 中创建对象非常简洁：

```javascript
// JavaScript - 对象字面量
const config = { host: "localhost", port: 8080, debug: true };
```

Rust 的 `HashMap` 没有字面量语法，但我们可以用宏创造一个：

```rust
use std::collections::HashMap;

macro_rules! hashmap {
    // 匹配 key => value 对，用逗号分隔
    ( $( $key:expr => $value:expr ),* $(,)? ) => {
        {
            let mut map = HashMap::new();
            $(
                map.insert($key, $value);
            )*
            map
        }
    };
}

fn main() {
    // 现在可以像 JS 对象一样简洁地创建 HashMap！
    let config = hashmap! {
        "host" => "localhost",
        "port" => "8080",
        "debug" => "true",
    };

    println!("{:?}", config);
    // {"host": "localhost", "port": "8080", "debug": "true"}

    // 也支持不带尾逗号
    let scores = hashmap! {
        "Alice" => 95,
        "Bob" => 87,
        "Charlie" => 92
    };

    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
}
```

> 💡 **注意** `$(,)?` 这个模式：它匹配"零个或一个逗号"，让宏同时支持有尾逗号和无尾逗号的写法。

### 17.2.8 实战：`newtype!` 宏 —— 批量创建新类型

```rust
// 在 Rust 中，我们经常用 newtype 模式包装基础类型
// 手动写很繁琐：
// struct UserId(u64);
// struct OrderId(u64);
// struct ProductId(u64);
// 每个都要实现 Display, Debug, Clone 等 trait...

macro_rules! newtype {
    ( $( $name:ident($inner:ty) );+ $(;)? ) => {
        $(
            #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
            pub struct $name($inner);

            impl $name {
                pub fn new(value: $inner) -> Self {
                    Self(value)
                }

                pub fn value(&self) -> $inner {
                    self.0
                }
            }

            impl std::fmt::Display for $name {
                fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                    write!(f, "{}({})", stringify!($name), self.0)
                }
            }
        )+
    };
}

// 一行搞定三个新类型！
newtype! {
    UserId(u64);
    OrderId(u64);
    ProductId(u64);
}

fn main() {
    let user = UserId::new(42);
    let order = OrderId::new(1001);

    println!("{}", user);   // UserId(42)
    println!("{}", order);  // OrderId(1001)

    // 类型安全！不能混用！
    // let wrong: UserId = order;  // ❌ 编译错误！
}
```

### 17.2.9 宏的作用域与导出

宏的作用域规则与普通函数不同：

```rust
// 方式 1：在同一文件中，宏必须在使用之前定义
macro_rules! greet {
    () => { println!("你好！") };
}

greet!();  // ✓ 在定义之后使用

// 方式 2：在模块中使用 #[macro_export] 导出
#[macro_export]
macro_rules! public_macro {
    () => { println!("我是公共宏！") };
}
// 使用 #[macro_export] 后，宏会被提升到 crate 根作用域
// 其他 crate 可以通过 use your_crate::public_macro; 引入

// 方式 3：在模块中使用 #[macro_use]
#[macro_use]
mod my_macros {
    macro_rules! internal_macro {
        () => { println!("内部宏") };
    }
}
// internal_macro!(); 在这里可用
```

---

## 17.3 常用标准库宏详解

### 17.3.1 `vec!` —— 创建 Vec

```rust
fn main() {
    // 用法 1：列出元素
    let numbers = vec![1, 2, 3, 4, 5];

    // 用法 2：重复值
    let zeros = vec![0; 10];  // 10 个 0
    println!("{:?}", zeros);  // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    // 用法 3：空向量（需要类型注解）
    let empty: Vec<String> = vec![];

    // 对比 JavaScript：
    // const numbers = [1, 2, 3, 4, 5];
    // const zeros = new Array(10).fill(0);
    // const empty = [];

    // vec! 的展开结果大致为：
    // {
    //     let mut v = Vec::with_capacity(5);  // 预分配容量
    //     v.push(1);
    //     v.push(2);
    //     v.push(3);
    //     v.push(4);
    //     v.push(5);
    //     v
    // }
}
```

### 17.3.2 `println!` 和 `format!` —— 格式化输出

```rust
fn main() {
    let name = "动动";
    let age = 28;
    let pi = 3.14159;

    // === 基本用法 ===
    println!("你好，{}！", name);          // 位置参数
    println!("{} 今年 {} 岁", name, age);   // 多个参数

    // === 命名参数 ===
    println!("{name} 今年 {age} 岁");       // Rust 1.58+ 支持直接用变量名

    // === 格式控制 ===
    println!("{:.2}", pi);            // 保留 2 位小数：3.14
    println!("{:>10}", name);         // 右对齐，宽度 10：      动动
    println!("{:<10}", name);         // 左对齐，宽度 10：动动
    println!("{:^10}", name);         // 居中，宽度 10：   动动
    println!("{:0>5}", 42);           // 用 0 填充：00042
    println!("{:#b}", 42);            // 二进制：0b101010
    println!("{:#o}", 42);            // 八进制：0o52
    println!("{:#x}", 42);            // 十六进制：0x2a
    println!("{:#X}", 42);            // 大写十六进制：0x2A

    // === Debug 格式 ===
    let v = vec![1, 2, 3];
    println!("{:?}", v);              // Debug 格式：[1, 2, 3]
    println!("{:#?}", v);             // Pretty Debug 格式（带缩进）

    // === format! 返回 String 而不是打印 ===
    let greeting = format!("你好，{}！", name);
    println!("{}", greeting);

    // 对比 JavaScript：
    // console.log(`你好，${name}！`);           // 模板字符串
    // const greeting = `你好，${name}！`;       // 也是模板字符串
    // Rust 的宏更强大：编译时检查参数数量和类型！
}
```

### 17.3.3 `eprintln!` —— 输出到标准错误

```rust
fn main() {
    // 普通输出 → stdout（可以被重定向）
    println!("这是正常输出");

    // 错误输出 → stderr（不会被重定向）
    eprintln!("这是错误信息");

    // 在命令行中：
    // cargo run > output.txt  → println! 的内容进入文件，eprintln! 仍然显示在终端
    // 这和 JavaScript 的 console.log vs console.error 类似
}
```

### 17.3.4 `dbg!` —— 调试利器

```rust
fn main() {
    // dbg! 是 Rust 的调试神器，类似 JavaScript 的 console.log 但更强大
    let x = 5;
    let y = dbg!(x * 2);  // 打印：[src/main.rs:4] x * 2 = 10
    // 注意：dbg! 会打印文件名、行号、表达式和值！

    // 而且 dbg! 返回值，可以嵌在表达式中
    let result = dbg!(dbg!(2 + 3) * dbg!(4 + 5));
    // 打印：
    // [src/main.rs:8] 2 + 3 = 5
    // [src/main.rs:8] 4 + 5 = 9
    // [src/main.rs:8] dbg!(2 + 3) * dbg!(4 + 5) = 45

    // 调试结构体
    #[derive(Debug)]
    struct Point { x: f64, y: f64 }

    let p = Point { x: 1.0, y: 2.0 };
    dbg!(&p);
    // 打印：[src/main.rs:16] &p = Point { x: 1.0, y: 2.0 }

    // 对比 JavaScript：
    // console.log("x * 2 =", x * 2);  // 需要手动写变量名
    // dbg! 自动帮你打印表达式文本！
}
```

### 17.3.5 `todo!` 和 `unimplemented!` —— 占位符

```rust
// todo! —— 标记待实现的代码
fn calculate_tax(income: f64) -> f64 {
    todo!("还没实现税率计算逻辑")
    // 编译能通过，但运行时会 panic 并显示消息
}

// unimplemented! —— 标记不打算实现的代码
trait Animal {
    fn speak(&self) -> String;
    fn fly(&self) -> String {
        unimplemented!("大多数动物不会飞")
    }
}

// 对比 JavaScript：
// function calculateTax(income) {
//     throw new Error("TODO: 还没实现");
// }
// Rust 的 todo! 更好：编译器知道返回类型，不需要写假的返回值

// 实际开发中的用法：先搭骨架，再填充实现
struct UserService;

impl UserService {
    fn create_user(&self, name: &str) -> Result<u64, String> {
        todo!()
    }

    fn get_user(&self, id: u64) -> Result<String, String> {
        todo!()
    }

    fn delete_user(&self, id: u64) -> Result<(), String> {
        todo!()
    }
}
```

### 17.3.6 `assert!` 系列 —— 测试与断言

```rust
fn main() {
    let x = 42;

    // assert! —— 断言条件为 true
    assert!(x > 0, "x 必须是正数，但得到了 {}", x);

    // assert_eq! —— 断言两个值相等
    assert_eq!(x, 42, "x 应该是 42");

    // assert_ne! —— 断言两个值不相等
    assert_ne!(x, 0, "x 不应该是 0");

    // debug_assert! —— 只在 debug 模式生效（release 模式被移除）
    debug_assert!(x > 0);

    // 对比 JavaScript：
    // console.assert(x > 0, "x 必须是正数");  // 只是打印警告
    // Rust 的 assert! 会直接 panic！
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_addition() {
        assert_eq!(2 + 2, 4);
    }

    #[test]
    #[should_panic(expected = "除以零")]
    fn test_divide_by_zero() {
        fn divide(a: i32, b: i32) -> i32 {
            if b == 0 {
                panic!("除以零");
            }
            a / b
        }
        divide(10, 0);
    }
}
```

### 17.3.7 其他实用宏

```rust
use std::collections::HashMap;

fn main() {
    // include_str! —— 编译时读取文件内容为字符串
    // let config = include_str!("../config.toml");

    // include_bytes! —— 编译时读取文件内容为字节数组
    // let icon = include_bytes!("../assets/icon.png");

    // concat! —— 编译时拼接字符串字面量
    let version = concat!("v", 1, ".", 0, ".", 0);
    println!("{}", version);  // v1.0.0

    // stringify! —— 将 token 转为字符串
    println!("{}", stringify!(1 + 2));  // "1 + 2"（不计算）

    // env! —— 编译时读取环境变量
    let cargo_version = env!("CARGO_PKG_VERSION", "未找到版本号");
    println!("版本：{}", cargo_version);

    // cfg! —— 编译时检查配置条件
    if cfg!(target_os = "linux") {
        println!("运行在 Linux 上");
    }

    // compile_error! —— 编译时产生错误
    // compile_error!("这个功能还没实现");

    // matches! —— 简洁的模式匹配，返回 bool
    let value = Some(42);
    let is_some_42 = matches!(value, Some(42));
    println!("是 Some(42) 吗？{}", is_some_42);  // true

    let status = 404;
    let is_error = matches!(status, 400..=599);
    println!("是错误状态码吗？{}", is_error);  // true
}
```

---

## 17.4 过程宏简介

### 17.4.1 三种过程宏

声明宏（`macro_rules!`）虽然强大，但有些事情它做不到。过程宏（Procedural Macros）更加灵活，它们本质上是**接收 Rust 代码、输出 Rust 代码的函数**。

```
┌──────────────────────────────────────────────────────────────────┐
│                    三种过程宏                                     │
├──────────────┬───────────────────────────────────────────────────┤
│  类型         │  用法示例                                        │
├──────────────┼───────────────────────────────────────────────────┤
│  Derive 宏   │  #[derive(MyTrait)]                              │
│              │  最常用，给结构体自动实现 trait                     │
├──────────────┼───────────────────────────────────────────────────┤
│  属性宏      │  #[my_attribute]                                  │
│              │  像装饰器，可以修改整个函数/结构体                   │
├──────────────┼───────────────────────────────────────────────────┤
│  函数宏      │  my_macro!(...)                                   │
│              │  类似声明宏但更灵活，可以做复杂的代码变换            │
└──────────────┴───────────────────────────────────────────────────┘
```

### 17.4.2 Derive 宏 —— 最常用的过程宏

你已经用过很多 derive 宏了：

```rust
// 标准库的 derive 宏
#[derive(Debug)]       // 自动实现 Debug trait → 可以用 {:?} 打印
#[derive(Clone)]       // 自动实现 Clone trait → 可以调用 .clone()
#[derive(Copy)]        // 自动实现 Copy trait → 赋值时复制而不是移动
#[derive(PartialEq)]   // 自动实现 PartialEq trait → 可以用 == 比较
#[derive(Eq)]          // 自动实现 Eq trait → 完全等价关系
#[derive(Hash)]        // 自动实现 Hash trait → 可以用作 HashMap 的 key
#[derive(Default)]     // 自动实现 Default trait → 可以调用 Type::default()
#[derive(PartialOrd)]  // 自动实现 PartialOrd trait → 可以用 < > 比较
#[derive(Ord)]         // 自动实现 Ord trait → 完全排序关系

// 第三方 crate 的 derive 宏
// #[derive(Serialize, Deserialize)]  // serde: JSON 序列化
// #[derive(Parser)]                  // clap: 命令行参数解析
// #[derive(Error)]                   // thiserror: 错误类型

// 可以组合多个 derive
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p1 = Point { x: 1, y: 2 };
    let p2 = p1.clone();         // Clone
    println!("{:?}", p1);        // Debug
    println!("{}", p1 == p2);    // PartialEq → true

    use std::collections::HashSet;
    let mut set = HashSet::new();
    set.insert(p1);              // Hash
}
```

### 17.4.3 属性宏 —— 类似 TypeScript 装饰器

```rust
// 属性宏对比 TypeScript 装饰器：

// TypeScript:
// @Controller('/users')
// class UserController {
//     @Get('/:id')
//     getUser(@Param('id') id: string) { ... }
// }

// Rust (Axum 框架的写法不是属性宏，但概念类似)
// Rocket 框架使用属性宏：
// #[get("/users/<id>")]
// fn get_user(id: u64) -> Json<User> { ... }

// 常见的属性宏示例
// #[tokio::main]        → 将 async fn main 变成同步入口
// #[test]               → 标记测试函数
// #[cfg(test)]          → 条件编译：仅在测试时编译
// #[allow(dead_code)]   → 抑制未使用代码警告
// #[inline]             → 提示编译器内联函数

// tokio::main 的效果：
// 写：
// #[tokio::main]
// async fn main() {
//     do_something().await;
// }
//
// 等价于：
// fn main() {
//     let rt = tokio::runtime::Runtime::new().unwrap();
//     rt.block_on(async {
//         do_something().await;
//     });
// }
```

### 17.4.4 函数宏

```rust
// 函数宏看起来像声明宏，但它们是用 Rust 函数实现的
// 可以做更复杂的代码变换

// 常见例子：
// sqlx::query!("SELECT * FROM users WHERE id = $1", id)
// → 编译时检查 SQL 语法，自动生成类型安全的查询代码

// html! { <div class="container"><p>{"Hello"}</p></div> }
// → Yew 框架的 JSX 风格语法
```

---

## 17.5 自定义 Derive 宏实战

### 17.5.1 项目结构

过程宏必须定义在专门的 `proc-macro` crate 中：

```
my_project/
├── Cargo.toml
├── src/
│   └── main.rs
└── my_derive/             # 过程宏 crate
    ├── Cargo.toml
    └── src/
        └── lib.rs
```

### 17.5.2 实现一个 `Describe` derive 宏

让我们实现一个宏，它能自动为结构体生成描述信息：

```toml
# my_derive/Cargo.toml
[package]
name = "my_derive"
version = "0.1.0"
edition = "2021"

[lib]
proc-macro = true          # 声明这是一个过程宏 crate

[dependencies]
syn = "2"                  # 解析 Rust 代码
quote = "1"                # 生成 Rust 代码
proc-macro2 = "1"          # proc_macro 的包装库
```

```rust
// my_derive/src/lib.rs
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

// #[proc_macro_derive(Describe)] 告诉编译器：
// 当用户写 #[derive(Describe)] 时，调用这个函数
#[proc_macro_derive(Describe)]
pub fn describe_derive(input: TokenStream) -> TokenStream {
    // 解析输入的 Rust 代码
    let input = parse_macro_input!(input as DeriveInput);

    // 获取结构体名称
    let name = &input.ident;
    let name_string = name.to_string();

    // 获取字段信息
    let fields = match &input.data {
        syn::Data::Struct(data) => {
            match &data.fields {
                syn::Fields::Named(fields) => {
                    let field_descriptions: Vec<_> = fields.named.iter().map(|f| {
                        let field_name = f.ident.as_ref().unwrap().to_string();
                        let field_type = &f.ty;
                        quote! {
                            format!("  - {}: {}", #field_name, stringify!(#field_type))
                        }
                    }).collect();
                    quote! {
                        vec![#(#field_descriptions),*].join("\n")
                    }
                }
                _ => quote! { String::from("（无命名字段）") },
            }
        }
        _ => quote! { String::from("（不是结构体）") },
    };

    // 生成 trait 实现代码
    let expanded = quote! {
        impl #name {
            /// 返回该结构体的描述信息
            pub fn describe() -> String {
                format!("结构体 {} 的字段：\n{}", #name_string, #fields)
            }
        }
    };

    // 将生成的代码转换为 TokenStream 返回
    TokenStream::from(expanded)
}
```

```toml
# 主项目 Cargo.toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"

[dependencies]
my_derive = { path = "./my_derive" }
```

```rust
// src/main.rs
use my_derive::Describe;

#[derive(Describe, Debug)]
struct User {
    name: String,
    age: u32,
    email: String,
}

#[derive(Describe, Debug)]
struct Config {
    host: String,
    port: u16,
    debug: bool,
}

fn main() {
    println!("{}", User::describe());
    // 输出：
    // 结构体 User 的字段：
    //   - name: String
    //   - age: u32
    //   - email: String

    println!();
    println!("{}", Config::describe());
    // 输出：
    // 结构体 Config 的字段：
    //   - host: String
    //   - port: u16
    //   - debug: bool
}
```

### 17.5.3 理解 `syn` 和 `quote`

```
┌──────────────────────────────────────────────────────────────┐
│              过程宏的工作流程                                  │
│                                                              │
│  用户代码                                                     │
│  #[derive(Describe)]                                         │
│  struct User { name: String, age: u32 }                      │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                             │
│  │ TokenStream  │  ← Rust 编译器传入 token 流                 │
│  │ (原始 token) │                                             │
│  └──────┬──────┘                                             │
│         │  parse_macro_input!                                │
│         ▼                                                    │
│  ┌─────────────┐                                             │
│  │  syn 解析    │  ← 将 token 解析为结构化的 AST              │
│  │  DeriveInput │     (抽象语法树)                            │
│  └──────┬──────┘                                             │
│         │  你的逻辑：分析字段、类型等                          │
│         ▼                                                    │
│  ┌─────────────┐                                             │
│  │ quote! 生成  │  ← 用模板语法生成新的 Rust 代码              │
│  │  新代码      │                                             │
│  └──────┬──────┘                                             │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐                                             │
│  │ TokenStream  │  ← 返回给编译器，插入到用户代码中            │
│  │ (生成的代码) │                                             │
│  └─────────────┘                                             │
└──────────────────────────────────────────────────────────────┘
```

### 17.5.4 `quote!` 的变量插值

```rust
use quote::quote;

// quote! 中用 # 来插入变量（类似 JS 模板字符串的 ${}）
let name = quote! { MyStruct };
let field_name = quote! { my_field };

let code = quote! {
    impl #name {
        fn get_field(&self) -> &str {
            &self.#field_name
        }
    }
};

// 对比 JavaScript：
// const code = `
//   class ${name} {
//     getField() { return this.${fieldName}; }
//   }
// `;

// 重复模式（类似声明宏的 $(...)*）
let field_names = vec![quote! { name }, quote! { age }];
let code = quote! {
    #(
        println!("{}", self.#field_names);
    )*
};
// 展开为：
// println!("{}", self.name);
// println!("{}", self.age);
```

---

## 17.6 宏调试技巧

### 17.6.1 `cargo expand` —— 查看宏展开结果

```bash
# 安装 cargo-expand
cargo install cargo-expand

# 查看所有宏展开后的代码
cargo expand

# 只看某个模块
cargo expand main

# 只看某个函数
cargo expand main::my_function
```

示例：

```rust
// 原始代码
#[derive(Debug)]
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    println!("{:?}", p);
}
```

```bash
$ cargo expand
```

```rust
// 展开后的代码（简化版）
struct Point {
    x: f64,
    y: f64,
}

// #[derive(Debug)] 展开为：
impl ::core::fmt::Debug for Point {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::debug_struct(f, "Point")
            .field("x", &self.x)
            .field("y", &self.y)
            .finish()
    }
}

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    // println! 展开为：
    {
        ::std::io::_print(
            ::core::fmt::Arguments::new_v1(
                &["", "\n"],
                &[::core::fmt::ArgumentV1::new_debug(&p)],
            ),
        );
    };
}
```

### 17.6.2 编译错误信息分析

```rust
macro_rules! bad_macro {
    ($x:expr) => {
        let result: String = $x;  // 如果 $x 不是 String 类型就会报错
        println!("{}", result);
    };
}

fn main() {
    bad_macro!(42);  // 错误！42 不是 String
    // 错误信息会指向宏展开后的代码位置
    // 可能不太直观，需要理解宏展开过程

    // 提示：
    // 1. 看错误中的 "in this macro invocation" 提示
    // 2. 用 cargo expand 查看展开后的代码
    // 3. 给宏参数添加类型约束（尽量用 $x:expr 而不是 $x:tt）
}
```

### 17.6.3 `trace_macros!` 和 `log_syntax!`（Nightly）

```rust
// 需要 nightly Rust
#![feature(trace_macros)]
#![feature(log_syntax)]

macro_rules! my_macro {
    ($x:expr) => {
        log_syntax!("展开 my_macro，参数是：", $x);
        $x + 1
    };
}

fn main() {
    trace_macros!(true);   // 开启宏追踪
    let result = my_macro!(5);
    trace_macros!(false);  // 关闭宏追踪
    println!("{}", result);
}
```

### 17.6.4 常见宏错误与解决方案

```rust
// 错误 1：递归宏没有终止条件
macro_rules! infinite {
    ($x:expr) => {
        infinite!($x)  // ❌ 无限递归！
    };
}
// 解决：确保有基本情况（base case）

// 错误 2：宏中的卫生性（Hygiene）
macro_rules! make_var {
    () => {
        let x = 42;  // 这个 x 和外部的 x 是不同的！
    };
}
fn example() {
    let x = 10;
    make_var!();
    // println!("{}", x);  // 仍然是 10，宏内部的 x 被隔离了
    // Rust 宏是"卫生的"（hygienic），变量不会意外泄露
}

// 错误 3：类型不匹配
macro_rules! create_vector {
    ($($x:expr),*) => {
        {
            let mut v = Vec::new();
            $(v.push($x);)*
            v
        }
    };
}
// 如果混用不同类型：
// let v = create_vector![1, "hello", 3.14];  // ❌ 类型不一致！
// 解决：确保所有元素类型一致

// 错误 4：不支持的分隔符组合
// macro_rules! bad {
//     ($($x:expr) and *) => { ... };  // ❌ "and" 不能做分隔符
// }
// 分隔符必须是单个 token：, ; => 等
```

---

## 17.7 进阶：宏的设计模式

### 17.7.1 TT Muncher（Token Tree 消耗器）

```rust
// TT Muncher 是一种递归处理 token 的模式
// 每次处理一部分 token，然后递归处理剩余部分

macro_rules! count {
    // 基本情况：没有参数时返回 0
    () => { 0usize };
    // 递归情况：消耗第一个参数，计数 +1
    ($head:tt $($tail:tt)*) => {
        1usize + count!($($tail)*)
    };
}

fn main() {
    let n = count!(a b c d e);
    println!("token 数量：{}", n);  // 5
}
```

### 17.7.2 Internal Rules（内部规则）

```rust
// 使用 @name 前缀区分内部规则和公共接口
macro_rules! my_macro {
    // 公共接口
    ($($args:tt)*) => {
        my_macro!(@internal $($args)*)
    };
    // 内部规则（用户不应直接调用）
    (@internal $x:expr) => {
        println!("处理单个表达式：{}", $x)
    };
    (@internal $x:expr, $($rest:tt)*) => {
        println!("处理：{}", $x);
        my_macro!(@internal $($rest)*)
    };
}
```

### 17.7.3 Push-down Accumulation（下推累积）

```rust
// 在递归过程中累积结果
macro_rules! reverse {
    // 入口：开始累积
    ($($all:tt)*) => {
        reverse!(@acc [] $($all)*)
    };
    // 基本情况：所有 token 处理完毕
    (@acc [$($acc:tt)*]) => {
        stringify!($($acc)*)
    };
    // 递归：将第一个 token 推到累积器前面
    (@acc [$($acc:tt)*] $head:tt $($tail:tt)*) => {
        reverse!(@acc [$head $($acc)*] $($tail)*)
    };
}

fn main() {
    let s = reverse!(a b c d);
    println!("{}", s);  // "d c b a"
}
```

---

## 17.8 实战练习

### 练习 1：`log!` 宏

实现一个带日志级别的宏：

```rust
// 你的目标：实现这个宏
// log!(INFO, "服务器启动在端口 {}", 8080);
// log!(WARN, "连接数接近上限");
// log!(ERROR, "数据库连接失败：{}", err);

// 期望输出：
// [INFO]  服务器启动在端口 8080
// [WARN]  连接数接近上限
// [ERROR] 数据库连接失败：connection refused

macro_rules! log {
    // 提示：
    // 1. 用 ident 捕获日志级别
    // 2. 用 $($arg:tt)* 捕获格式化参数
    // 3. 用 format! 拼接最终字符串
    ($level:ident, $($arg:tt)*) => {
        println!("[{:<5}] {}", stringify!($level), format!($($arg)*));
    };
}

fn main() {
    log!(INFO, "服务器启动在端口 {}", 8080);
    log!(WARN, "连接数接近上限：{}/{}", 95, 100);
    log!(ERROR, "数据库连接失败");
}
```

### 练习 2：`enum_str!` 宏

实现一个宏，自动为枚举生成字符串转换：

```rust
macro_rules! enum_str {
    ($name:ident { $($variant:ident),* $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub enum $name {
            $($variant),*
        }

        impl $name {
            pub fn as_str(&self) -> &'static str {
                match self {
                    $(Self::$variant => stringify!($variant)),*
                }
            }

            pub fn from_str(s: &str) -> Option<Self> {
                match s {
                    $(stringify!($variant) => Some(Self::$variant),)*
                    _ => None,
                }
            }

            pub fn all_variants() -> &'static [Self] {
                &[$(Self::$variant),*]
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "{}", self.as_str())
            }
        }
    };
}

fn main() {
    enum_str! {
        Color {
            Red,
            Green,
            Blue,
        }
    }

    let c = Color::Red;
    println!("{}", c);                           // Red
    println!("{:?}", Color::from_str("Blue"));   // Some(Blue)
    println!("所有颜色：{:?}", Color::all_variants());
}
```

### 练习 3：`retry!` 宏

实现一个自动重试的宏：

```rust
macro_rules! retry {
    ($max_retries:expr, $body:block) => {{
        let mut attempts = 0;
        loop {
            attempts += 1;
            match (|| $body)() {
                Ok(value) => break Ok(value),
                Err(e) => {
                    if attempts >= $max_retries {
                        eprintln!("重试 {} 次后仍然失败", $max_retries);
                        break Err(e);
                    }
                    eprintln!("第 {} 次尝试失败：{}，正在重试...", attempts, e);
                }
            }
        }
    }};
}

fn unreliable_operation() -> Result<String, String> {
    use std::time::SystemTime;
    let nanos = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .subsec_nanos();

    if nanos % 3 == 0 {
        Ok("成功！".to_string())
    } else {
        Err("随机失败".to_string())
    }
}

fn main() {
    let result = retry!(5, {
        unreliable_operation()
    });

    match result {
        Ok(value) => println!("最终结果：{}", value),
        Err(e) => println!("全部失败：{}", e),
    }
}
```

### 练习 4：`builder!` 宏（进阶挑战）

实现一个 Builder 模式的宏：

```rust
// 需要 paste crate：cargo add paste
// use paste::paste;

macro_rules! builder {
    ($name:ident { $($field:ident : $ty:ty),* $(,)? }) => {
        // 生成主结构体
        #[derive(Debug, Clone)]
        pub struct $name {
            $(pub $field: $ty),*
        }

        // 生成 Builder 结构体（需要 paste crate 拼接标识符）
        paste::paste! {
            #[derive(Debug, Default)]
            pub struct [<$name Builder>] {
                $($field: Option<$ty>),*
            }

            impl $name {
                pub fn builder() -> [<$name Builder>] {
                    [<$name Builder>]::default()
                }
            }

            impl [<$name Builder>] {
                $(
                    pub fn $field(mut self, value: $ty) -> Self {
                        self.$field = Some(value);
                        self
                    }
                )*

                pub fn build(self) -> Result<$name, String> {
                    Ok($name {
                        $(
                            $field: self.$field.ok_or_else(||
                                format!("缺少字段：{}", stringify!($field))
                            )?,
                        )*
                    })
                }
            }
        }
    };
}

// 使用示例：
// builder! {
//     User {
//         name: String,
//         age: u32,
//         email: String,
//     }
// }
//
// let user = User::builder()
//     .name("动动".to_string())
//     .age(28)
//     .email("dong@example.com".to_string())
//     .build()
//     .unwrap();
```

---

## 17.9 本章总结

```
┌──────────────────────────────────────────────────────────────────┐
│                    Rust 宏系统全景                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  声明宏 (macro_rules!)                                           │
│  ├── 模式匹配语法，类似 match                                     │
│  ├── 支持重复模式 $(...)*                                         │
│  ├── 编译时展开                                                   │
│  └── 适合：简单的代码生成、DSL                                     │
│                                                                  │
│  过程宏 (Procedural Macros)                                      │
│  ├── Derive 宏：#[derive(MyTrait)]                               │
│  │   └── 自动实现 trait                                          │
│  ├── 属性宏：#[my_attr]                                          │
│  │   └── 修改函数/结构体                                          │
│  └── 函数宏：my_macro!(...)                                      │
│      └── 最灵活的代码变换                                         │
│                                                                  │
│  常用工具                                                        │
│  ├── syn：解析 Rust 代码为 AST                                    │
│  ├── quote：从 AST 生成代码                                      │
│  ├── proc-macro2：过程宏辅助                                     │
│  ├── paste：标识符拼接                                            │
│  └── cargo-expand：查看宏展开结果                                 │
│                                                                  │
│  何时用宏 vs 函数？                                               │
│  ├── 需要可变参数 → 宏                                            │
│  ├── 需要生成代码 → 宏                                            │
│  ├── 需要编译时检查 → 宏                                          │
│  ├── 需要操作类型系统 → 宏                                        │
│  └── 其他情况 → 优先用函数（更容易理解和调试）                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 对比 JavaScript/TypeScript

| Rust 宏特性 | JS/TS 对应概念 |
|---|---|
| `macro_rules!` | Babel 插件 / 模板字符串 |
| `#[derive(...)]` | TypeScript 装饰器 |
| `#[cfg(...)]` | `process.env.NODE_ENV` 条件 |
| `cargo expand` | Babel --inspect 输出 |
| `proc-macro` crate | Babel 插件包 |
| `syn` / `quote` | `@babel/parser` / `@babel/generator` |

> 📝 **下一章预告：** 在第十八章中，我们将把学到的知识付诸实践，用 Rust 构建一个完整的命令行工具 —— minigrep！你将学会使用 `clap` 解析参数、`regex` 搜索文本、`colored` 彩色输出，并用 `anyhow` 优雅地处理错误。
