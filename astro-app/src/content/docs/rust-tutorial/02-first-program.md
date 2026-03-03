# 第二章：第一个 Rust 项目 —— 从 Hello World 到控制流

> **本章目标**
>
> - 深入理解 Hello World 程序的每一个细节
> - 掌握 Rust 的函数定义与调用
> - 理解变量绑定与可变性（对比 JavaScript 的 const/let）
> - 掌握 Rust 的基本数据类型
> - 彻底理解 String 与 &str 的区别（对比 JS 的 string）
> - 学会使用控制流语句（if/loop/while/for）
> - 掌握 Rust 的注释与文档注释系统

> **预计学习时间：90 - 120 分钟**

---

## 2.1 Hello World 深度解析

### 2.1.1 回顾我们的第一个程序

```rust
fn main() {
    println!("Hello, world!");
}
```

只有三行，但每一个字符都值得讨论。让我们逐个击破。

### 2.1.2 fn —— 函数关键字

```rust
fn main() {
//^^ 函数关键字（function 的缩写）
```

`fn` 是 Rust 声明函数的关键字，类似 JavaScript 的 `function`：

```
JavaScript:                     Rust:
──────────                      ────
function main() { }          → fn main() { }
const main = () => { }       → fn main() { }（Rust 没有箭头函数语法）
function add(a, b) { }       → fn add(a: i32, b: i32) { }
```

> **重要区别**：在 JavaScript 中，函数参数不需要类型标注（除非用 TypeScript）。但在 Rust 中，**函数参数必须标注类型**。这和 TypeScript 的严格模式很像。

### 2.1.3 main() —— 入口函数

```rust
fn main() {
// ^^^^ 函数名：main 是特殊的入口函数
```

`main` 函数是 Rust 程序的入口点，类似于：

```
类比:
├── C/C++ 的 main() 函数
├── Java 的 public static void main(String[] args)
├── Python 的 if __name__ == "__main__":
└── Node.js 直接执行文件顶层代码（Rust 不允许这样做）
```

**关键点**：

- Rust 程序**必须**有一个 `main` 函数作为入口点
- `main` 函数不接受参数（命令行参数通过 `std::env::args()` 获取）
- `main` 函数默认返回 `()`（unit 类型，类似 void）
- 也可以返回 `Result` 类型来处理错误

```rust
// 最简单的 main
fn main() {
    println!("你好！");
}

// 返回 Result 的 main（处理可能的错误）
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string("config.txt")?;
    println!("配置内容: {}", content);
    Ok(())
}
// 类比 Node.js:
// async function main() {
//     const content = await fs.readFile('config.txt', 'utf-8');
//     console.log(`配置内容: ${content}`);
// }
// main().catch(console.error);
```

### 2.1.4 println! —— 这不是函数，是宏！

```rust
    println!("Hello, world!");
//  ^^^^^^^^ 注意这个感叹号 !
```

`println!` 末尾的 `!` 表示这是一个**宏（macro）**，而不是普通函数。

```
JavaScript:                          Rust:
──────────                           ────
console.log("Hello")               → println!("Hello")
console.log(`Hello, ${name}`)      → println!("Hello, {}", name)
console.log(`x = ${x}, y = ${y}`)  → println!("x = {}, y = {}", x, y)
console.error("错误!")             → eprintln!("错误!")
```

**为什么是宏而不是函数？**

因为 `println!` 能做到普通函数做不到的事情：

1. **接受可变数量的参数**：`println!("{} {} {}", a, b, c)` — 参数数量不固定
2. **在编译时检查格式字符串**：如果格式字符串和参数数量不匹配，编译器会报错
3. **支持多种格式化方式**：`{}`（Display）、`{:?}`（Debug）、`{:#?}`（美化 Debug）

```rust
fn main() {
    let name = "Rust";
    let version = 2021;

    // 基本输出
    println!("Hello!");                           // Hello!

    // 位置参数（类似 JS 模板字符串）
    println!("Hello, {}!", name);                 // Hello, Rust!
    println!("{} 版本: {}", name, version);       // Rust 版本: 2021

    // 命名参数
    println!("{language} {ver}", language=name, ver=version);  // Rust 2021

    // Debug 输出（对调试非常有用）
    println!("{:?}", vec![1, 2, 3]);              // [1, 2, 3]
    println!("{:#?}", vec![1, 2, 3]);             // 美化输出（带缩进换行）

    // 数字格式化
    println!("{:05}", 42);                        // 00042（左侧补零）
    println!("{:.2}", 3.14159);                   // 3.14（保留两位小数）
    println!("{:b}", 42);                         // 101010（二进制）
    println!("{:x}", 255);                        // ff（十六进制）
    println!("{:o}", 8);                          // 10（八进制）

    // 对齐
    println!("{:<10}|", "左对齐");                // 左对齐      |
    println!("{:>10}|", "右对齐");                //       右对齐|
    println!("{:^10}|", "居中");                  //    居中    |
}
```

**常用的打印宏家族：**

```rust
// println! - 打印一行（自动换行）
println!("Hello");          // 类似 console.log()

// print! - 打印不换行
print!("Hello ");           // 类似 process.stdout.write()
print!("World");

// eprintln! - 打印到标准错误（自动换行）
eprintln!("错误信息");      // 类似 console.error()

// format! - 返回格式化后的 String（不打印）
let s = format!("Hello, {}!", name);  // 类似 JS 的模板字符串 `Hello, ${name}!`

// dbg! - 调试打印（打印表达式及其值，返回值）
let x = dbg!(2 + 3);       // [src/main.rs:42] 2 + 3 = 5
// dbg! 会打印文件名、行号、表达式和值，非常适合调试！
// 类比 console.log({x})，但 dbg! 还显示源码位置
```

### 2.1.5 分号 —— Rust 中分号的重要性

```rust
    println!("Hello, world!");
//                            ^ 分号！
```

**Rust 中分号的含义远比 JavaScript 中深刻：**

```rust
// 在 Rust 中，语句（statement）以分号结尾
let x = 5;              // 这是一条语句

// 而表达式（expression）不以分号结尾
// 表达式会返回一个值！

fn add(a: i32, b: i32) -> i32 {
    a + b    // 没有分号！这是一个表达式，值会被返回
    // 等价于 JavaScript 的: return a + b;
}

fn add_with_semicolon(a: i32, b: i32) -> i32 {
    a + b;   // 加了分号！这变成了语句，返回 ()（unit 类型）
    // ❌ 编译错误：期望返回 i32，但返回了 ()
}
```

> **这是 Rust 新手最常踩的坑之一**：忘记去掉最后一行的分号。
>
> **简单规则**：如果一行代码是函数最后的返回值，**不要加分号**。否则加分号。
>
> 类比 JavaScript：
> ```javascript
> // JavaScript 的箭头函数
> const add = (a, b) =&gt; a + b;      // 隐式返回
> const add = (a, b) =&gt; { a + b };  // ❌ 没有 return，返回 undefined
> const add = (a, b) =&gt; { return a + b; };  // 需要显式 return
>
> // Rust 类似于 JS 的隐式返回语法
> fn add(a: i32, b: i32) -&gt; i32 {
>     a + b  // 隐式返回（没有分号）
> }
> ```

---

## 2.2 函数

### 2.2.1 函数定义

```rust
// 最简单的函数（无参数，无返回值）
fn greet() {
    println!("你好！");
}

// 带参数的函数（参数必须标注类型）
fn greet_person(name: &str) {
    println!("你好，{}！", name);
}

// 带返回值的函数（用 -> 标注返回类型）
fn add(a: i32, b: i32) -> i32 {
    a + b  // 最后一个表达式就是返回值（不需要 return）
}

// 多个参数、不同类型
fn describe(name: &str, age: u32, is_student: bool) -> String {
    format!("{}，{}岁，{}", name, age, if is_student { "学生" } else { "非学生" })
}
```

**与 JavaScript/TypeScript 的对比：**

```typescript
// TypeScript
function greet(): void {
    console.log("你好！");
}

function greetPerson(name: string): void {
    console.log(`你好，${name}！`);
}

function add(a: number, b: number): number {
    return a + b;
}

// 箭头函数
const add = (a: number, b: number): number => a + b;
```

```rust
// Rust
fn greet() {
    println!("你好！");
}

fn greet_person(name: &str) {
    println!("你好，{}！", name);
}

fn add(a: i32, b: i32) -> i32 {
    a + b
}

// Rust 没有箭头函数语法
// 但有闭包（后面的章节会讲）
let add = |a: i32, b: i32| -> i32 { a + b };
```

### 2.2.2 函数命名规范

```rust
// Rust 使用 snake_case（蛇形命名）
fn calculate_total_price() { }    // ✅ Rust 风格
fn calculateTotalPrice() { }      // ❌ 这是 JavaScript/Java 风格（camelCase）
// 编译器会警告你使用 snake_case

// 类型和 trait 使用 PascalCase（大驼峰）
struct UserProfile { }            // ✅
enum HttpStatus { }               // ✅

// 常量使用 SCREAMING_SNAKE_CASE（全大写蛇形）
const MAX_RETRY_COUNT: u32 = 3;   // ✅
```

**对比 JavaScript 的命名规范：**

```
JavaScript:                     Rust:
──────────                      ────
camelCase（函数/变量）        → snake_case（函数/变量）
PascalCase（类/组件）         → PascalCase（结构体/枚举/trait）
UPPER_CASE（常量）            → SCREAMING_SNAKE_CASE（常量）
```

### 2.2.3 函数作为表达式

在 Rust 中，很多东西都是表达式，可以返回值：

```rust
fn main() {
    // if 是表达式，可以返回值（类似 JS 的三元运算符）
    let status = if true { "在线" } else { "离线" };
    // 类比 JS: const status = true ? "在线" : "离线";

    // 代码块是表达式，最后一行（没有分号）就是返回值
    let result = {
        let x = 10;
        let y = 20;
        x + y  // 没有分号，这个值被返回
    };
    println!("result = {}", result); // result = 30

    // 类比 JS（JS 没有块表达式，需要用 IIFE）：
    // const result = (() => {
    //     const x = 10;
    //     const y = 20;
    //     return x + y;
    // })();

    // match 是表达式
    let grade = match 85 {
        90..=100 => "优秀",
        80..=89 => "良好",
        70..=79 => "中等",
        60..=69 => "及格",
        _ => "不及格",
    };
    println!("成绩: {}", grade); // 成绩: 良好
}
```

### 2.2.4 提前返回（return）

虽然 Rust 鼓励使用隐式返回（最后一个表达式），但有时你需要提前返回：

```rust
fn divide(a: f64, b: f64) -> f64 {
    if b == 0.0 {
        return 0.0;  // 提前返回需要 return 关键字和分号
    }
    a / b  // 正常返回（隐式，没有 return，没有分号）
}

// 类比 TypeScript：
// function divide(a: number, b: number): number {
//     if (b === 0) {
//         return 0;
//     }
//     return a / b;
// }
```

### 2.2.5 函数调用

```rust
fn main() {
    // 函数调用和 JavaScript 完全一样
    greet();
    greet_person("动动");
    let sum = add(3, 5);
    println!("3 + 5 = {}", sum);

    // 函数可以在 main 之后定义（不需要像 JS 那样考虑提升/声明顺序）
    let result = multiply(4, 6);
    println!("4 * 6 = {}", result);
}

fn multiply(a: i32, b: i32) -> i32 {
    a * b
}

// 在 JavaScript 中：
// - function 声明会被提升（hoisting），可以在声明前调用
// - const/let 声明的函数不会被提升
// 在 Rust 中：
// - 函数声明顺序无关紧要，任何函数都可以调用同一作用域内的其他函数
```

---

## 2.3 变量与可变性

### 2.3.1 let —— 不可变绑定

```rust
fn main() {
    // let 声明一个不可变变量（默认不可变！）
    let x = 5;
    println!("x = {}", x);

    // ❌ 编译错误：不能修改不可变变量
    // x = 6;  // error[E0384]: cannot assign twice to immutable variable `x`
}
```

**这是 Rust 和 JavaScript 最大的区别之一：**

```
JavaScript:                     Rust:
──────────                      ────
const x = 5;  // 不可变       → let x = 5;      // 不可变（默认！）
let x = 5;    // 可变         → let mut x = 5;   // 可变（需要显式声明）
var x = 5;    // 可变（废弃） → （Rust 没有 var）
```

> **哲学差异**：
> - JavaScript 的 `let` = 可变的（默认可变，用 `const` 不可变）
> - Rust 的 `let` = 不可变的（默认不可变，用 `mut` 可变）
>
> Rust 的设计哲学是**默认安全**：如果你不显式说明需要修改，那就不能修改。这样编译器可以做更多优化，代码也更安全。

### 2.3.2 let mut —— 可变绑定

```rust
fn main() {
    // 使用 mut 关键字声明可变变量
    let mut count = 0;
    println!("初始值: {}", count);  // 初始值: 0

    count = 1;  // ✅ 可以修改
    println!("修改后: {}", count);  // 修改后: 1

    count += 1;  // ✅ 可以自增
    println!("自增后: {}", count);  // 自增后: 2

    // 注意：Rust 没有 ++ 和 -- 运算符！
    // count++;  // ❌ 编译错误
    // 必须用 count += 1; 或 count -= 1;
}
```

**对比 JavaScript：**

```javascript
// JavaScript
let count = 0;      // 可变
count = 1;          // ✅
count++;            // ✅（Rust 没有这个！）

const MAX = 100;    // 不可变
MAX = 200;          // ❌ TypeError
```

```rust
// Rust
let count = 0;      // 不可变（默认）
// count = 1;       // ❌ 编译错误

let mut count = 0;  // 可变
count = 1;          // ✅
count += 1;         // ✅（没有 ++ 运算符）

const MAX: u32 = 100;  // 编译时常量
// MAX = 200;           // ❌ 编译错误
```

### 2.3.3 变量遮蔽（Shadowing）

Rust 有一个 JavaScript 没有的特性：**变量遮蔽（shadowing）**。你可以用 `let` 重新声明同名变量：

```rust
fn main() {
    let x = 5;
    println!("x = {}", x);  // x = 5

    // 用 let 重新声明同名变量 —— 这是"遮蔽"，不是"修改"
    let x = x + 1;
    println!("x = {}", x);  // x = 6

    // 甚至可以改变类型！
    let x = "hello";
    println!("x = {}", x);  // x = hello

    // 在内部作用域中也可以遮蔽
    {
        let x = x.len();  // 遮蔽了外部的 x，类型从 &str 变成 usize
        println!("内部 x = {}", x);  // 内部 x = 5
    }
    println!("外部 x = {}", x);  // 外部 x = hello（内部遮蔽不影响外部）
}
```

**遮蔽 vs 可变变量的区别：**

```rust
// 遮蔽：创建一个新变量，可以改变类型
let spaces = "   ";        // &str 类型
let spaces = spaces.len(); // usize 类型 ✅ 没问题！

// 可变变量：修改同一个变量，不能改变类型
let mut spaces = "   ";        // &str 类型
// spaces = spaces.len();      // ❌ 编译错误：不能将 usize 赋给 &str
```

> **什么时候用遮蔽？** 当你需要对一个值进行转换，但不想起一个新名字的时候。比如：
> ```rust
> let input = "42";           // 字符串类型
> let input: i32 = input.parse().unwrap();  // 转换为整数，遮蔽原来的变量
> println!("输入的数字: {}", input);
> ```
> 在 JavaScript 中，你可能会写 `const inputStr = "42"; const input = parseInt(inputStr);`。而在 Rust 中，遮蔽让你可以复用同一个变量名。

### 2.3.4 const —— 编译时常量

```rust
// const 声明编译时常量
// 必须标注类型，值必须在编译时确定
const MAX_POINTS: u32 = 100_000;
const PI: f64 = 3.14159265358979;
const APP_NAME: &str = "Lighthouse";

fn main() {
    println!("最大分数: {}", MAX_POINTS);
    println!("圆周率: {}", PI);
    println!("应用名: {}", APP_NAME);
}
```

**const vs let 的区别：**

```
特性              const                    let
──────            ─────                    ───
类型标注          必须                     可选（类型推断）
值的确定时间      编译时                   运行时
可变性            永远不可变               默认不可变，可加 mut
作用域            可以在全局作用域         只能在函数/块内
命名规范          SCREAMING_SNAKE_CASE     snake_case
内联优化          编译器可能内联           不会内联
```

```rust
// const 可以在全局作用域中定义
const VERSION: &str = "1.0.0";

// static 也可以定义全局变量（但含义不同）
// static 有固定的内存地址，const 没有
static COUNTER: u32 = 0;

fn main() {
    // let 只能在函数/块内使用
    let local_var = 42;

    // const 也可以在函数内使用
    const LOCAL_CONST: i32 = 100;
}
```

> **类比 JavaScript**：
> ```javascript
> // JavaScript 的 const —— 不可变绑定（但对象内容可变！）
> const obj = { name: "Rust" };
> obj.name = "Go";  // ✅ JavaScript 允许！
>
> // Rust 的 let —— 不可变就是真的不可变
> let obj = User { name: String::from("Rust") };
> // obj.name = String::from("Go");  // ❌ 编译错误
> ```
> JavaScript 的 `const` 只保证"绑定不变"（不能重新赋值），但不保证"内容不变"。
> Rust 的 `let`（不可变）保证**所有层级**都不可变。

---

## 2.4 基本数据类型

### 2.4.1 整数类型

Rust 有多种整数类型，可以精确控制内存使用：

```rust
fn main() {
    // 有符号整数（可以是负数）
    let a: i8 = -128;                // 8 位，范围: -128 到 127
    let b: i16 = -32768;             // 16 位
    let c: i32 = -2_147_483_648;     // 32 位（默认整数类型）
    let d: i64 = -9_223_372_036_854_775_808;  // 64 位
    let e: i128 = 0;                 // 128 位
    let f: isize = 0;               // 平台相关（32 或 64 位）

    // 无符号整数（只能是非负数）
    let a: u8 = 255;                 // 8 位，范围: 0 到 255
    let b: u16 = 65535;              // 16 位
    let c: u32 = 4_294_967_295;      // 32 位
    let d: u64 = 0;                  // 64 位
    let e: u128 = 0;                 // 128 位
    let f: usize = 0;               // 平台相关（用于索引和大小）

    // 数字字面量的各种写法
    let decimal = 98_222;            // 十进制（下划线分隔，提高可读性）
    let hex = 0xff;                  // 十六进制
    let octal = 0o77;               // 八进制
    let binary = 0b1111_0000;        // 二进制
    let byte = b'A';                 // 字节（仅 u8）

    println!("十进制: {}", decimal);
    println!("十六进制: {} (0x{:x})", hex, hex);
    println!("八进制: {} (0o{:o})", octal, octal);
    println!("二进制: {} (0b{:b})", binary, binary);
    println!("字节: {} (字符: {})", byte, byte as char);
}
```

**对比 JavaScript 的 number 类型：**

```
JavaScript:                         Rust:
──────────                          ────
number（64 位浮点数，啥都用它）   → i8/i16/i32/i64/i128 + u8/u16/u32/u64/u128
                                     + f32/f64 + isize/usize

BigInt（任意精度整数）            → i128/u128（最大内置类型）
                                     或使用 num-bigint crate

Number.MAX_SAFE_INTEGER            → i64::MAX 或 u64::MAX
(2^53 - 1 = 9007199254740991)        (i64: 9223372036854775807)
```

> **JavaScript 的 number 坑**：JS 的 number 是 64 位浮点数，整数运算可能丢失精度：
> ```javascript
> 0.1 + 0.2 === 0.3  // false!（0.30000000000000004）
> 9007199254740992 === 9007199254740993  // true!（超出安全整数范围）
> ```
> Rust 的整数类型是真正的整数，没有精度问题。而且溢出在 Debug 模式下会 panic（程序崩溃），在 Release 模式下会回绕。

```rust
fn main() {
    // 数字下划线：提高可读性（编译器忽略下划线）
    let one_million = 1_000_000;     // 类似 JS 的 1_000_000（ES2021）
    let binary = 0b1010_1010;

    // 类型后缀：在数字字面量后直接标注类型
    let x = 42u8;       // u8 类型的 42
    let y = 1_000i64;   // i64 类型的 1000
    let z = 3.14f32;    // f32 类型的 3.14

    // 默认类型
    let a = 42;          // 默认 i32
    let b = 3.14;        // 默认 f64

    println!("{} {} {} {} {} {} {}", one_million, binary, x, y, z, a, b);
}
```

### 2.4.2 浮点类型

```rust
fn main() {
    // f32: 32 位浮点数（单精度）
    let x: f32 = 3.14;

    // f64: 64 位浮点数（双精度，默认）
    let y: f64 = 3.14159265358979;

    // 默认是 f64（和 JavaScript 的 number 一样是双精度）
    let z = 2.0;  // f64

    // 浮点运算
    let sum = 0.1 + 0.2;
    println!("0.1 + 0.2 = {}", sum);  // 0.30000000000000004
    // 是的，和 JavaScript 一样的浮点精度问题！
    // 这不是 Rust 的 bug，是 IEEE 754 浮点标准的特性

    // 数学运算
    println!("加法: {}", 5.0 + 3.0);     // 8
    println!("减法: {}", 10.0 - 4.5);     // 5.5
    println!("乘法: {}", 2.0 * 3.14);     // 6.28
    println!("除法: {}", 10.0 / 3.0);     // 3.3333333333333335
    println!("取余: {}", 10.0 % 3.0);     // 1

    // 注意：整数和浮点数不能直接混合运算！
    let int_val: i32 = 5;
    let float_val: f64 = 3.14;
    // let result = int_val + float_val;  // ❌ 编译错误！
    let result = int_val as f64 + float_val;  // ✅ 需要显式转换
    println!("混合运算: {}", result);
}
```

> **JavaScript vs Rust 的数学运算：**
> ```javascript
> // JavaScript：隐式类型转换，随时可能出问题
> "5" + 3       // "53"（字符串拼接）
> "5" - 3       // 2（自动转换为数字）
> true + 1      // 2（true 变成 1）
> null + 1      // 1（null 变成 0）
> undefined + 1 // NaN
> ```
> ```rust
> // Rust：没有隐式类型转换，类型不匹配就编译报错
> // "5" + 3     // ❌ 编译错误
> // true + 1    // ❌ 编译错误
> // 必须显式转换
> let s: String = "5".to_string();
> let n: i32 = s.parse().unwrap();
> println!("{}", n + 3);  // 8
> ```

### 2.4.3 布尔类型

```rust
fn main() {
    // bool 类型，只有 true 和 false
    let is_active: bool = true;
    let is_deleted = false;  // 类型推断为 bool

    // 逻辑运算
    let and = true && false;   // false（逻辑与）
    let or = true || false;    // true（逻辑或）
    let not = !true;           // false（逻辑非）

    println!("AND: {}, OR: {}, NOT: {}", and, or, not);

    // 比较运算
    let x = 5;
    let y = 10;
    println!("{} > {} = {}", x, y, x > y);     // false
    println!("{} < {} = {}", x, y, x < y);     // true
    println!("{} == {} = {}", x, y, x == y);    // false
    println!("{} != {} = {}", x, y, x != y);    // true
    println!("{} >= {} = {}", x, y, x >= y);    // false
    println!("{} <= {} = {}", x, y, x <= y);    // true
}
```

> **对比 JavaScript**：
> - Rust 的 `==` 相当于 JavaScript 的 `===`（严格相等）
> - Rust **没有** `===` 运算符（因为不需要 —— 类型不同的值根本不能比较）
> - Rust **没有** truthy/falsy 概念。`if` 条件必须是 `bool` 类型
> ```rust
> // ❌ 编译错误：Rust 不支持 truthy/falsy
> if 1 { }         // error: mismatched types
> if "hello" { }   // error: mismatched types
> if Some(42) { }  // error: mismatched types
>
> // ✅ 必须是显式的 bool
> if 1 &gt; 0 { }
> if !some_string.is_empty() { }
> ```

### 2.4.4 字符类型

```rust
fn main() {
    // char 类型：4 字节（32 位），可以表示任何 Unicode 字符
    let letter = 'A';          // 注意是单引号！
    let chinese = '中';        // 中文字符
    let emoji = '🦀';          // Emoji（螃蟹 = Rust 吉祥物）
    let escape = '\n';         // 转义字符

    println!("字母: {}", letter);
    println!("中文: {}", chinese);
    println!("Emoji: {}", emoji);

    // char 的大小是 4 字节（不是 1 字节！）
    println!("char 大小: {} 字节", std::mem::size_of::<char>());  // 4

    // 字符方法
    println!("'A' 是字母: {}", 'A'.is_alphabetic());       // true
    println!("'3' 是数字: {}", '3'.is_numeric());           // true
    println!("'A' 转小写: {}", 'A'.to_lowercase().next().unwrap());  // a
    println!("'a' 转大写: {}", 'a'.to_uppercase().next().unwrap());  // A
    println!("' ' 是空白: {}", ' '.is_whitespace());        // true
}
```

> **对比 JavaScript**：
> ```javascript
> // JavaScript 没有 char 类型，字符就是长度为 1 的字符串
> typeof 'A'  // "string"
> 'A'.length  // 1
>
> // JavaScript 的 emoji 长度问题
> '🦀'.length      // 2（因为 UTF-16 编码）
> [...'🦀'].length  // 1（用展开运算符可以正确计算）
> ```
> ```rust
> // Rust 的 char 是独立的类型，始终是 4 字节，可以表示任何 Unicode 码点
> let c: char = '🦀';
> // 但在字符串中，字符是 UTF-8 编码的（1-4 字节不等）
> let s = "🦀";
> println!("字符串字节数: {}", s.len());     // 4（UTF-8 编码）
> println!("字符数: {}", s.chars().count());  // 1
> ```

---

## 2.5 字符串：String vs &str

**这是 Rust 初学者最困惑的概念之一**。为什么 Rust 有两种字符串？让我们彻底搞清楚。

### 2.5.1 JavaScript 的字符串很简单

```javascript
// JavaScript：只有一种字符串类型
const s1 = "hello";           // string
const s2 = 'hello';           // string
const s3 = `hello`;           // string
const s4 = new String("hello"); // String 对象（几乎没人用）

// 字符串是不可变的
let s = "hello";
s[0] = "H";  // 静默失败（严格模式下报错）

// 但可以创建新字符串
s = s.toUpperCase();  // "HELLO"（创建了一个新字符串）
```

### 2.5.2 Rust 有两种主要的字符串类型

```rust
fn main() {
    // &str（字符串切片）：不可变的引用，指向一段 UTF-8 文本
    // 类比 JavaScript 的字符串字面量
    let greeting: &str = "Hello, world!";
    // "Hello, world!" 是硬编码在程序二进制文件中的
    // greeting 只是一个指向这段文本的引用（指针 + 长度）

    // String（字符串）：可增长的、堆分配的 UTF-8 文本
    // 类比 JavaScript 的 string（虽然不完全一样）
    let mut name: String = String::from("Rust");
    name.push_str(" 语言");  // 可以追加内容
    println!("{}", name);  // Rust 语言
}
```

**核心区别用一张图说明：**

```
&str（字符串切片）:
┌──────────────────────────────────┐
│ 程序二进制 / 其他 String 的片段    │
│ "Hello, world!"                  │  ← 数据存储在某处（不可修改）
└──────────────────────────────────┘
       ↑
       │  指针 + 长度
┌──────┴──────┐
│ greeting    │  ← &str 就是一个"视图"（view）
│ ptr: 0x...  │     类似 JS 的 TypedArray 视图
│ len: 13     │
└─────────────┘

String（可增长字符串）:
┌──────────────────────────────────┐
│ 堆内存                           │
│ "Rust 语言"                      │  ← 数据在堆上（可修改、可增长）
└──────────────────────────────────┘
       ↑
       │  指针 + 长度 + 容量
┌──────┴──────┐
│ name        │  ← String 拥有这块堆内存
│ ptr: 0x...  │     类似 JS 的 Array（可以 push）
│ len: 11     │
│ cap: 16     │     容量（预分配的空间）
└─────────────┘
```

### 2.5.3 &str 和 String 的类比

```
                 &str                    String
─────────        ────                    ──────
JavaScript类比   字符串字面量              字符串变量
              （"hello"）              （可以拼接修改的）
内存位置         栈上（只是个指针）       堆上（拥有数据）
可变性           不可变                   可变（如果是 let mut）
所有权           借用（引用）             拥有
创建方式         "hello"                  String::from("hello")
                                         "hello".to_string()
                                         format!("hello {}", name)
大小             编译时已知               运行时可变
开销             零开销（只是个视图）     需要堆分配
```

### 2.5.4 相互转换

```rust
fn main() {
    // &str → String（3 种方式）
    let s1: String = String::from("hello");        // 最常用
    let s2: String = "hello".to_string();           // 也很常用
    let s3: String = "hello".to_owned();            // 语义更明确
    let s4: String = format!("hello {}", "world");  // 格式化创建

    // String → &str（自动解引用）
    let string: String = String::from("hello");
    let slice: &str = &string;          // String 自动转为 &str
    let slice: &str = string.as_str();  // 显式转换

    // 在函数参数中，通常接受 &str（更通用）
    fn greet(name: &str) {
        println!("Hello, {}!", name);
    }

    let s = String::from("Rust");
    greet(&s);       // ✅ String 自动转为 &str
    greet("World");  // ✅ &str 直接传入
}
```

> **经验法则**：
> - 函数参数用 `&str`（接受任何字符串）
> - 需要拥有/修改字符串时用 `String`
> - 返回值通常用 `String`（因为 &str 需要有人拥有原始数据）

### 2.5.5 字符串操作

```rust
fn main() {
    // ======== 创建 ========
    let mut s = String::new();                    // 空字符串
    let s = String::from("Hello");                // 从 &str 创建
    let s = "Hello".to_string();                  // 从 &str 创建
    let s = String::with_capacity(100);           // 预分配容量

    // ======== 拼接 ========
    let mut s = String::from("Hello");
    s.push(' ');                                  // 追加一个字符
    s.push_str("World");                          // 追加字符串
    println!("{}", s);                            // Hello World

    // 使用 + 运算符（注意：左边必须是 String，右边必须是 &str）
    let s1 = String::from("Hello, ");
    let s2 = String::from("World!");
    let s3 = s1 + &s2;  // 注意：s1 被移动了，不能再使用！
    // println!("{}", s1);  // ❌ 编译错误：s1 已被移动
    println!("{}", s3);    // ✅ Hello, World!

    // 使用 format!（最灵活，不会移动任何值）
    let s1 = String::from("tic");
    let s2 = String::from("tac");
    let s3 = String::from("toe");
    let s = format!("{}-{}-{}", s1, s2, s3);
    println!("{}", s);  // tic-tac-toe
    // s1, s2, s3 仍然可用！

    // ======== 查询 ========
    let s = String::from("Hello, 世界!");
    println!("长度（字节）: {}", s.len());         // 14（UTF-8 字节数）
    println!("字符数: {}", s.chars().count());     // 9
    println!("是否为空: {}", s.is_empty());        // false
    println!("包含 'Hello': {}", s.contains("Hello"));  // true
    println!("以 'H' 开头: {}", s.starts_with('H'));     // true
    println!("以 '!' 结尾: {}", s.ends_with('!'));       // true

    // ======== 修改 ========
    let s = String::from("  Hello, World!  ");
    println!("去空白: '{}'", s.trim());            // 'Hello, World!'

    let s = String::from("Hello, World!");
    println!("替换: {}", s.replace("World", "Rust"));  // Hello, Rust!
    println!("大写: {}", s.to_uppercase());              // HELLO, WORLD!
    println!("小写: {}", s.to_lowercase());              // hello, world!

    // ======== 分割 ========
    let s = "one,two,three";
    let parts: Vec<&str> = s.split(',').collect();
    println!("{:?}", parts);  // ["one", "two", "three"]
    // 类比 JS: "one,two,three".split(",")

    // ======== 遍历 ========
    for c in "Hello".chars() {
        print!("{} ", c);  // H e l l o
    }
    println!();

    for b in "Hello".bytes() {
        print!("{} ", b);  // 72 101 108 108 111
    }
    println!();
}
```

### 2.5.6 字符串索引 —— Rust 不允许！

```rust
fn main() {
    let s = String::from("Hello");

    // ❌ 编译错误：Rust 不支持字符串索引！
    // let h = s[0];  // error: the type `String` cannot be indexed by `{integer}`

    // 为什么？因为 UTF-8 编码中，一个字符可能占 1-4 个字节
    let chinese = "中文";
    // chinese[0] 应该返回什么？
    // 字节 0？那是 0xe4（"中"的第一个字节），不是一个有效字符
    // 字符 0？那需要遍历才能知道，不是 O(1) 操作

    // 正确的做法：
    // 1. 通过字节范围切片（小心！如果切到字符中间会 panic）
    let hello = &s[0..1];  // "H"（因为英文字符占 1 字节，所以安全）
    println!("{}", hello);

    // 2. 通过 chars() 迭代器
    let first_char = s.chars().nth(0);  // Some('H')
    println!("{:?}", first_char);

    // 3. 转为 Vec<char>（方便随机访问，但更耗内存）
    let chars: Vec<char> = "Hello, 世界".chars().collect();
    println!("第 7 个字符: {}", chars[7]);  // 界
}
```

> **对比 JavaScript**：
> ```javascript
> // JavaScript 允许字符串索引
> "Hello"[0]  // "H"
> "Hello".charAt(0)  // "H"
>
> // 但 JavaScript 也有 UTF-16 的坑
> "🦀"[0]  // "\ud83e"（不是完整的 emoji！）
> "🦀".charAt(0)  // "\ud83e"
> [..."🦀"][0]  // "🦀"（用展开运算符可以正确访问）
> ```
> Rust 选择直接禁止字符串索引，强制你明确意图：要字节？要字符？要字素簇？

---

## 2.6 控制流

### 2.6.1 if 表达式

```rust
fn main() {
    let number = 7;

    // 基本 if-else（和 JS 几乎一样，但条件不需要括号）
    if number > 5 {
        println!("大于 5");
    } else if number > 0 {
        println!("大于 0，小于等于 5");
    } else {
        println!("小于等于 0");
    }

    // ❗ 重要：条件必须是 bool 类型！
    // if number { }  // ❌ Rust 没有 truthy/falsy
    if number != 0 {  // ✅ 必须显式比较
        println!("number 不为零");
    }

    // if 是表达式，可以返回值（类似 JS 的三元运算符）
    let description = if number > 0 {
        "正数"
    } else if number < 0 {
        "负数"
    } else {
        "零"
    };
    // 类比 JS: const description = number > 0 ? "正数" : number < 0 ? "负数" : "零";
    println!("{} 是{}", number, description);

    // 注意：所有分支的返回类型必须一致
    // let x = if true { 5 } else { "six" };  // ❌ 编译错误：类型不匹配
}
```

### 2.6.2 loop —— 无限循环

```rust
fn main() {
    // loop 创建一个无限循环
    let mut counter = 0;

    loop {
        counter += 1;
        println!("counter = {}", counter);

        if counter >= 5 {
            break;  // 用 break 退出循环
        }
    }

    // loop 也是表达式！可以通过 break 返回值
    let mut counter = 0;
    let result = loop {
        counter += 1;
        if counter == 10 {
            break counter * 2;  // 返回 20
        }
    };
    println!("result = {}", result);  // result = 20

    // 这在 JavaScript 中没有等价物！
    // JS 中 while(true) 不能返回值
    // 你需要：
    // let result;
    // while (true) {
    //     counter++;
    //     if (counter === 10) {
    //         result = counter * 2;
    //         break;
    //     }
    // }

    // 循环标签：嵌套循环中指定 break/continue 的目标
    let mut count = 0;
    'outer: loop {
        let mut remaining = 10;
        loop {
            if remaining == 9 {
                break;  // 退出内层循环
            }
            if count == 2 {
                break 'outer;  // 退出外层循环！
            }
            remaining -= 1;
        }
        count += 1;
    }
    println!("count = {}", count);

    // 类比 JS 的标签语法（很少用）：
    // outer: while (true) {
    //     while (true) {
    //         break outer;
    //     }
    // }
}
```

### 2.6.3 while —— 条件循环

```rust
fn main() {
    // while 循环（和 JS 完全一样的语法，只是不需要条件括号）
    let mut number = 3;

    while number != 0 {
        println!("{}!", number);
        number -= 1;
    }
    println!("发射！🚀");

    // 注意：Rust 没有 do-while 循环
    // 如果需要 do-while 的语义，用 loop + break：
    let mut input = String::new();
    loop {
        // 做一些事情...
        println!("执行一次");
        // 条件检查
        if true {  // 你的条件
            break;
        }
    }
}
```

### 2.6.4 for —— 遍历迭代器

`for` 循环是 Rust 中最常用的循环，它遍历一个迭代器：

```rust
fn main() {
    // 遍历范围（Range）
    for i in 0..5 {
        print!("{} ", i);  // 0 1 2 3 4（不包含 5！）
    }
    println!();

    for i in 0..=5 {
        print!("{} ", i);  // 0 1 2 3 4 5（包含 5！）
    }
    println!();

    // 类比 JavaScript：
    // for (let i = 0; i < 5; i++) { }  → for i in 0..5 { }
    // for (let i = 0; i <= 5; i++) { } → for i in 0..=5 { }

    // 反向遍历
    for i in (0..5).rev() {
        print!("{} ", i);  // 4 3 2 1 0
    }
    println!();

    // 遍历数组
    let fruits = ["苹果", "香蕉", "橘子", "葡萄"];

    // 方式 1：遍历引用（最常用）
    for fruit in &fruits {
        print!("{} ", fruit);
    }
    println!();
    // 类比 JS: for (const fruit of fruits) { }
    // 注意：JS 的 for-of 和 Rust 的 for-in 功能类似
    // 但 JS 的 for-in 用于遍历对象的键，完全不一样！

    // 方式 2：带索引遍历
    for (index, fruit) in fruits.iter().enumerate() {
        println!("{}: {}", index, fruit);
    }
    // 类比 JS: fruits.forEach((fruit, index) => { })

    // 方式 3：遍历并消耗（移动所有权，后续不能再用 fruits）
    // for fruit in fruits { }

    // ======== 注意：Rust 没有传统的 C 风格 for 循环 ========
    // for (let i = 0; i < 10; i++) { }  // ❌ Rust 不支持这种语法
    // 用 for i in 0..10 { } 代替
}
```

### 2.6.5 控制流关键字：break、continue、return

```rust
fn main() {
    // break：退出循环
    for i in 0..100 {
        if i > 5 {
            break;  // 退出 for 循环
        }
        print!("{} ", i);
    }
    println!();  // 0 1 2 3 4 5

    // continue：跳过当前迭代
    for i in 0..10 {
        if i % 2 == 0 {
            continue;  // 跳过偶数
        }
        print!("{} ", i);
    }
    println!();  // 1 3 5 7 9

    // 带标签的 break 和 continue
    'outer: for i in 0..3 {
        for j in 0..3 {
            if i == 1 && j == 1 {
                continue 'outer;  // 跳过外层循环的当前迭代
            }
            println!("i={}, j={}", i, j);
        }
    }
}
```

### 2.6.6 match —— 超级强大的模式匹配

`match` 是 Rust 最强大的控制流结构之一，远比 JavaScript 的 `switch` 强大：

```rust
fn main() {
    let number = 3;

    // 基本 match（类似 switch，但更强大）
    match number {
        1 => println!("一"),
        2 => println!("二"),
        3 => println!("三"),
        4 | 5 => println!("四或五"),  // 多个值
        6..=10 => println!("六到十"),  // 范围
        _ => println!("其他"),  // 默认分支（类似 default）
    }

    // match 是表达式，可以返回值
    let description = match number {
        1 => "一",
        2 => "二",
        3 => "三",
        _ => "其他",
    };
    println!("{}", description);

    // 对比 JavaScript 的 switch：
    // switch (number) {
    //     case 1: console.log("一"); break;
    //     case 2: console.log("二"); break;
    //     case 3: console.log("三"); break;
    //     case 4:
    //     case 5: console.log("四或五"); break;
    //     default: console.log("其他");
    // }
    // 注意：JS 的 switch 需要手动 break，Rust 的 match 不需要！

    // match 必须穷尽所有可能！
    let b: bool = true;
    match b {
        true => println!("真"),
        false => println!("假"),
        // 不需要 _，因为 bool 只有两个值，已经穷尽了
    }

    // match 可以解构元组
    let point = (3, -5);
    match point {
        (0, 0) => println!("原点"),
        (x, 0) => println!("在 x 轴上，x = {}", x),
        (0, y) => println!("在 y 轴上，y = {}", y),
        (x, y) => println!("在 ({}, {})", x, y),
    }

    // match 可以加条件（match guard）
    let num = Some(42);
    match num {
        Some(x) if x < 0 => println!("负数: {}", x),
        Some(x) if x > 0 => println!("正数: {}", x),
        Some(0) => println!("零"),
        Some(_) => unreachable!(),
        None => println!("没有值"),
    }
}
```

### 2.6.7 if let —— match 的简写

当你只关心一种情况时，`if let` 比 `match` 更简洁：

```rust
fn main() {
    let some_value: Option<i32> = Some(42);

    // 使用 match
    match some_value {
        Some(x) => println!("值是: {}", x),
        None => (),  // 什么都不做
    }

    // 使用 if let（更简洁）
    if let Some(x) = some_value {
        println!("值是: {}", x);
    }

    // 带 else
    if let Some(x) = some_value {
        println!("值是: {}", x);
    } else {
        println!("没有值");
    }

    // 类比 JavaScript 的可选链：
    // const value = someValue ?? null;
    // if (value !== null) {
    //     console.log(`值是: ${value}`);
    // }
}
```

---

## 2.7 注释与文档注释

### 2.7.1 普通注释

```rust
// 单行注释（和 JS 一样）

/* 多行注释
   和 JS 一样 */

/* Rust 的多行注释可以嵌套！JavaScript 不行 */
/* 外层 /* 内层 */ 还是外层 */

fn main() {
    let x = 5; // 行尾注释

    // 多行单行注释（Rust 社区更推荐这种风格）
    // 而不是用 /* */ 多行注释
    // 因为这样更容易注释和取消注释
}
```

### 2.7.2 文档注释

Rust 有内置的文档系统，通过文档注释可以生成漂亮的 API 文档：

```rust
/// 计算两个数的和。
///
/// # 参数
///
/// * `a` - 第一个加数
/// * `b` - 第二个加数
///
/// # 返回值
///
/// 返回两个参数的和。
///
/// # 示例
///
/// ```
/// let result = add(2, 3);
/// assert_eq!(result, 5);
/// ```
///
/// # Panics
///
/// 这个函数不会 panic。
fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// 用户结构体，表示系统中的一个用户。
///
/// # 示例
///
/// ```
/// let user = User::new("动动", 25);
/// assert_eq!(user.name(), "动动");
/// ```
struct User {
    /// 用户名
    name: String,
    /// 年龄
    age: u32,
}

// 类比 JavaScript 的 JSDoc：
// /**
//  * 计算两个数的和。
//  * @param {number} a - 第一个加数
//  * @param {number} b - 第二个加数
//  * @returns {number} 两个参数的和
//  * @example
//  * const result = add(2, 3);
//  * console.assert(result === 5);
//  */
// function add(a, b) { return a + b; }
```

**文档注释的超能力 —— 文档测试：**

```rust
/// 将字符串转换为大写。
///
/// ```
/// let result = to_upper("hello");
/// assert_eq!(result, "HELLO");
/// ```
fn to_upper(s: &str) -> String {
    s.to_uppercase()
}

// 运行 cargo test 时，文档中的代码示例也会被当作测试运行！
// 这确保了文档和代码永远保持同步。
// JavaScript 的 JSDoc 做不到这一点。
```

```bash
# 生成并查看文档
cargo doc --open

# 运行所有测试（包括文档测试）
cargo test
```

### 2.7.3 模块级文档注释

```rust
//! 这是模块级文档注释（注意是 //! 不是 ///）
//! 用于描述整个模块或 crate 的用途。
//!
//! # 示例
//!
//! ```
//! use my_crate::add;
//! let result = add(2, 3);
//! ```

/// 函数级文档注释（/// 用于下面紧跟的项目）
fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

---

## 2.8 常用的调试技巧

### 2.8.1 打印调试

```rust
fn main() {
    let x = 42;
    let name = "Rust";
    let numbers = vec![1, 2, 3, 4, 5];

    // println! —— 最基本的调试输出
    println!("x = {}", x);

    // dbg! —— 调试专用宏（打印文件名、行号、表达式和值）
    dbg!(x);  // [src/main.rs:10] x = 42
    dbg!(&numbers);  // 打印整个 vector

    // dbg! 返回表达式的值，所以可以这样用：
    let y = dbg!(x * 2);  // [src/main.rs:14] x * 2 = 84
    // y = 84

    // 对于复杂类型，用 {:#?} 美化输出
    println!("{:#?}", numbers);

    // todo! —— 标记未完成的代码（运行到这里会 panic）
    // 类似 JS 的 throw new Error("Not implemented")
    fn not_yet_implemented() -> i32 {
        todo!("还没实现这个功能")
    }

    // unimplemented! —— 和 todo! 类似，但语义是"故意不实现"
    fn intentionally_not_implemented() -> i32 {
        unimplemented!("这个功能不打算实现")
    }

    // unreachable! —— 标记不应该到达的代码
    let x = 42;
    if x > 0 {
        println!("正数");
    } else if x < 0 {
        println!("负数");
    } else if x == 0 {
        println!("零");
    } else {
        unreachable!("数学坏了！");
    }
}
```

---

## 2.9 综合练习

### 练习 1：温度转换器

编写一个程序，实现华氏温度和摄氏温度的互相转换：

```rust
// 提示：
// 摄氏 = (华氏 - 32) / 1.8
// 华氏 = 摄氏 * 1.8 + 32

fn fahrenheit_to_celsius(f: f64) -> f64 {
    // 你的代码
    todo!()
}

fn celsius_to_fahrenheit(c: f64) -> f64 {
    // 你的代码
    todo!()
}

fn main() {
    // 打印常见温度的转换表
    println!("华氏 → 摄氏");
    println!("──────────────");
    for f in [32.0, 68.0, 100.0, 212.0] {
        println!("{:.1}°F = {:.1}°C", f, fahrenheit_to_celsius(f));
    }

    println!();
    println!("摄氏 → 华氏");
    println!("──────────────");
    for c in [0.0, 20.0, 37.0, 100.0] {
        println!("{:.1}°C = {:.1}°F", c, celsius_to_fahrenheit(c));
    }
}
```

### 练习 2：FizzBuzz

经典的 FizzBuzz 问题，打印 1 到 100：
- 如果是 3 的倍数，打印 "Fizz"
- 如果是 5 的倍数，打印 "Buzz"
- 如果同时是 3 和 5 的倍数，打印 "FizzBuzz"
- 否则打印数字本身

```rust
fn main() {
    for n in 1..=100 {
        // 提示：使用 match 和元组
        // match (n % 3, n % 5) {
        //     (0, 0) => ...
        //     ...
        // }
        todo!()
    }
}
```

### 练习 3：猜数字游戏

用 Rust 实现一个简单的猜数字游戏：

```rust
// 提示：你需要在 Cargo.toml 中添加 rand 依赖
// [dependencies]
// rand = "0.8"

use std::io;
// use rand::Rng;  // 取消注释

fn main() {
    println!("=== 猜数字游戏 ===");
    println!("我想了一个 1 到 100 之间的数字，来猜猜看！");

    // let secret = rand::thread_rng().gen_range(1..=100);
    let secret = 42;  // 先用固定值测试

    loop {
        println!("请输入你的猜测：");

        let mut guess = String::new();
        io::stdin()
            .read_line(&mut guess)
            .expect("读取输入失败");

        // 将字符串转换为数字
        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => {
                println!("请输入一个有效的数字！");
                continue;
            }
        };

        println!("你猜的是: {}", guess);

        // 使用 match 比较
        match guess.cmp(&secret) {
            std::cmp::Ordering::Less => println!("太小了！"),
            std::cmp::Ordering::Greater => println!("太大了！"),
            std::cmp::Ordering::Equal => {
                println!("🎉 恭喜你猜对了！答案就是 {}！", secret);
                break;
            }
        }
    }
}
```

### 练习 4：字符串统计

编写一个函数，统计字符串中的各种信息：

```rust
fn analyze_string(s: &str) {
    println!("分析字符串: \"{}\"", s);
    println!("字节数: {}", s.len());
    println!("字符数: {}", s.chars().count());

    let mut letters = 0;
    let mut digits = 0;
    let mut spaces = 0;
    let mut others = 0;

    for c in s.chars() {
        if c.is_alphabetic() {
            letters += 1;
        } else if c.is_numeric() {
            digits += 1;
        } else if c.is_whitespace() {
            spaces += 1;
        } else {
            others += 1;
        }
    }

    println!("字母: {}", letters);
    println!("数字: {}", digits);
    println!("空白: {}", spaces);
    println!("其他: {}", others);
}

fn main() {
    analyze_string("Hello, World! 你好世界 123");
    println!();
    analyze_string("Rust 🦀 is awesome!");
}
```

### 练习 5：简易计算器

```rust
fn calculate(a: f64, op: char, b: f64) -> Option<f64> {
    match op {
        '+' => Some(a + b),
        '-' => Some(a - b),
        '*' => Some(a * b),
        '/' => {
            if b == 0.0 {
                None  // 除以零返回 None
            } else {
                Some(a / b)
            }
        }
        _ => None,  // 不支持的运算符
    }
}

fn main() {
    let operations = [
        (10.0, '+', 5.0),
        (10.0, '-', 3.0),
        (4.0, '*', 7.0),
        (20.0, '/', 4.0),
        (10.0, '/', 0.0),
        (5.0, '%', 2.0),
    ];

    for (a, op, b) in operations {
        match calculate(a, op, b) {
            Some(result) => println!("{} {} {} = {}", a, op, b, result),
            None => println!("{} {} {} = 错误（不支持的运算或除以零）", a, op, b),
        }
    }
}
```

---

## 2.10 下一章预告

在下一章 **《第 03 章：类型系统》** 中，我们将：

- 深入理解 Rust 的强类型系统（对比 TypeScript）
- 学习类型推断的工作原理
- 掌握类型转换（as、From/Into）
- 理解元组、数组和切片
- 学习类型别名和 never 类型
- 完成更多练习题

你已经写出了自己的第一个 Rust 程序，对 Rust 的基本语法有了感觉。接下来，让我们深入 Rust 最引以为豪的类型系统！

---

> **本章小结**
>
> 在本章中，我们深入解析了 Hello World 程序的每一个细节，学习了函数定义、变量与可变性（对比 JavaScript 的 const/let）、基本数据类型、字符串（String vs &str）、控制流（if/loop/while/for/match），以及注释和文档注释系统。
>
> 最重要的几个"心智模型转变"：
> 1. **默认不可变**：`let` 是不可变的，需要 `mut` 才能修改
> 2. **一切皆表达式**：if、match、代码块都可以返回值
> 3. **没有隐式转换**：类型不匹配就编译报错，不会偷偷帮你转
> 4. **两种字符串**：`&str`（借用的视图）和 `String`（拥有的数据）
> 5. **模式匹配**：match 比 switch 强大 100 倍
>
> 这些概念一开始可能觉得"多余"，但随着你写更多 Rust 代码，你会发现它们能在编译时就帮你消灭一大类 bug。
