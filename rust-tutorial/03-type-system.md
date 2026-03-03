# 第三章：类型系统 —— Rust 的超能力

> **本章目标**
>
> - 深入理解 Rust 的强类型系统（对比 TypeScript）
> - 掌握类型推断的工作原理
> - 学会类型转换（as、From/Into trait）
> - 理解元组与数组的使用
> - 掌握切片（slice）的概念
> - 学习类型别名
> - 了解 never 类型（!）

> **预计学习时间：90 - 120 分钟**

---

## 3.1 Rust 的强类型系统

### 3.1.1 JavaScript → TypeScript → Rust：类型安全的进化之路

如果你从 JavaScript 来，你已经经历了从"无类型"到"有类型"的过渡。Rust 把这条路走到了极致：

```
JavaScript（动态类型，无类型检查）:
├── 类型在运行时确定
├── 变量可以随时改变类型
├── 隐式类型转换（"5" + 3 = "53"）
├── 错误在运行时才会暴露
└── typeof 和 instanceof 是你唯一的防线

TypeScript（静态类型，编译时检查）:
├── 类型在编译时检查
├── 变量类型固定（一旦声明）
├── 仍然可以用 any 逃逸
├── 类型信息在运行时被擦除
├── 声明文件 (.d.ts) 可能与运行时不匹配
└── 最终编译为 JavaScript，类型只是"建议"

Rust（静态类型，编译时 + 运行时保证）:
├── 类型在编译时检查
├── 没有 any（除了泛型和 trait 对象，但它们仍然类型安全）
├── 类型信息参与编译优化
├── 没有类型擦除 —— 泛型会单态化（monomorphization）
├── 类型系统保证内存安全
└── 如果编译通过，很大概率就是正确的
```

### 3.1.2 类型系统对比表

```
JavaScript              TypeScript              Rust
──────────              ──────────              ────
number                → number                → i32/u32/f64/... (精确)
string                → string                → String / &str
boolean               → boolean               → bool
null / undefined      → null / undefined      → Option<T> (None)
object                → interface / type      → struct
array                 → T[] / Array<T>        → Vec<T> / [T; N] / &[T]
function              → (a: T) => U           → fn(T) -> U / Fn(T) -> U
any                   → any                   → 没有！（这是好事）
unknown               → unknown               → 泛型 T
never                 → never                 → ! (never 类型)
void                  → void                  → () (unit 类型)
enum                  → enum                  → enum（但强大 100 倍）
union (A | B)         → A | B                 → enum / trait 对象
Promise<T>            → Promise<T>            → Future<Output = T>
Map<K, V>             → Map<K, V>             → HashMap<K, V>
Set<T>                → Set<T>                → HashSet<T>
tuple (TS 5.0+)       → [T1, T2, T3]         → (T1, T2, T3)
```

### 3.1.3 Rust 没有 null！

这可能是从 JavaScript 转过来最需要适应的一点：

```javascript
// JavaScript：null 和 undefined 无处不在
function findUser(id) {
    const user = database.get(id);
    // user 可能是 null / undefined
    // 如果你忘了检查，就会得到：
    // TypeError: Cannot read property 'name' of null
    return user.name;  // 💥 运行时崩溃！
}
```

```typescript
// TypeScript：类型系统能帮你检查，但不是强制的
function findUser(id: number): User | null {
    const user = database.get(id);
    return user?.name;  // 可选链帮忙，但仍可能遗漏
}
```

```rust
// Rust：Option<T> 类型强制你处理"没有值"的情况
fn find_user(id: u32) -> Option<User> {
    // 返回 Some(user) 或 None
    database.get(id)
}

fn main() {
    let user = find_user(42);

    // ❌ 编译错误：不能直接使用 Option<User>
    // println!("{}", user.name);

    // ✅ 必须处理两种情况
    match user {
        Some(u) => println!("找到用户: {}", u.name),
        None => println!("用户不存在"),
    }

    // 或者使用 if let
    if let Some(u) = find_user(42) {
        println!("找到用户: {}", u.name);
    }

    // 或者使用 unwrap_or 提供默认值
    let name = find_user(42)
        .map(|u| u.name)
        .unwrap_or(String::from("匿名"));
}
```

> **Tony Hoare**（null 的发明者）称 null 为他的"十亿美元错误"。
> Rust 通过 `Option<T>` 在类型系统层面消灭了空指针问题。

### 3.1.4 Rust 没有异常！

```javascript
// JavaScript：异常可能从任何地方飞出来
try {
    const data = JSON.parse(input);
    const file = fs.readFileSync(path);
    const result = riskyOperation();
} catch (e) {
    // 你不知道具体是哪一行抛的异常
    // e 的类型是 unknown/any
    console.error(e);
}
```

```rust
// Rust：错误通过返回值显式传递
use std::fs;
use std::num::ParseIntError;

// Result<T, E> = 成功时返回 T，失败时返回 E
fn parse_number(s: &str) -> Result<i32, ParseIntError> {
    s.parse::<i32>()  // 返回 Result
}

fn main() {
    // 必须处理 Result
    match parse_number("42") {
        Ok(n) => println!("解析成功: {}", n),
        Err(e) => println!("解析失败: {}", e),
    }

    // 使用 ? 运算符简化错误传播（类似 JS 的 await，但用于错误）
    // fn read_config() -> Result<String, std::io::Error> {
    //     let content = fs::read_to_string("config.txt")?;  // 如果失败，自动返回 Err
    //     Ok(content)
    // }

    // unwrap()：如果是 Err，直接 panic（仅用于原型开发/测试）
    let n = parse_number("42").unwrap();  // 42
    // let n = parse_number("abc").unwrap();  // 💥 panic!
}
```

---

## 3.2 类型推断

### 3.2.1 Rust 的类型推断很聪明

Rust 编译器可以根据上下文自动推断类型，你不需要到处标注类型：

```rust
fn main() {
    // 编译器自动推断类型
    let x = 42;            // 推断为 i32（默认整数类型）
    let y = 3.14;          // 推断为 f64（默认浮点类型）
    let z = true;          // 推断为 bool
    let name = "Rust";     // 推断为 &str
    let list = vec![1, 2, 3];  // 推断为 Vec<i32>

    // 根据使用上下文推断
    let mut numbers = Vec::new();  // 此时编译器还不知道类型
    numbers.push(42);              // 现在知道了：Vec<i32>
    // 类比 TypeScript：
    // const numbers: number[] = [];
    // numbers.push(42);

    // 根据返回值推断
    let parsed: i32 = "42".parse().unwrap();     // parse 返回 i32
    let parsed: f64 = "3.14".parse().unwrap();   // parse 返回 f64
    let parsed = "42".parse::<i32>().unwrap();   // 用 turbofish 语法指定类型

    // 复杂的类型推断
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();  // 需要标注 sum 的类型
    // 因为 sum() 可以返回多种数字类型，编译器需要你告诉它
    println!("总和: {}", sum);

    // 迭代器链中的类型推断
    let even_squares: Vec<i32> = (1..=10)
        .filter(|x| x % 2 == 0)    // 过滤偶数
        .map(|x| x * x)             // 平方
        .collect();                  // 收集成 Vec<i32>
    println!("偶数的平方: {:?}", even_squares);  // [4, 16, 36, 64, 100]
    // 类比 JS:
    // const evenSquares = Array.from({length: 10}, (_, i) => i + 1)
    //     .filter(x => x % 2 === 0)
    //     .map(x => x * x);
}
```

### 3.2.2 什么时候必须标注类型？

```rust
// 1. 函数参数和返回值 —— 必须标注
fn add(a: i32, b: i32) -> i32 {
    a + b
}
// TypeScript 严格模式也要求这样：
// function add(a: number, b: number): number { return a + b; }

// 2. const 常量 —— 必须标注
const MAX: u32 = 100;

// 3. 编译器无法推断时 —— 比如 parse()
let x: i32 = "42".parse().unwrap();
// 或者用 turbofish 语法
let x = "42".parse::<i32>().unwrap();

// 4. 集合类型没有初始值时
let mut v: Vec<String> = Vec::new();
// 一旦 push 了值，就不需要标注：
// let mut v = Vec::new();
// v.push(String::from("hello"));  // 编译器推断出 Vec<String>

// 5. 有歧义的情况
let default = Default::default();  // ❌ 编译器不知道是什么类型
let default: i32 = Default::default();  // ✅ 明确是 i32 的默认值（0）
```

### 3.2.3 Turbofish 语法 ::<T>

当你需要在表达式中指定泛型类型时，使用 `::<T>` 语法（因为形状像一条鱼 🐟 所以叫 turbofish）：

```rust
fn main() {
    // 不用 turbofish：通过变量类型标注
    let x: i32 = "42".parse().unwrap();

    // 用 turbofish：在方法调用时指定类型
    let x = "42".parse::<i32>().unwrap();
    let x = "42".parse::<f64>().unwrap();
    let x = "42".parse::<u8>().unwrap();

    // collect 也常用 turbofish
    let chars: Vec<char> = "hello".chars().collect();
    // 等价于
    let chars = "hello".chars().collect::<Vec<char>>();

    // 还可以用 _ 让编译器推断部分类型
    let chars = "hello".chars().collect::<Vec<_>>();  // _ 推断为 char
}
```

> **对比 TypeScript 的泛型调用**：
> ```typescript
> // TypeScript
> const result = someFunction<number>(arg);
>
> // Rust（turbofish 语法）
> let result = some_function::<i32>(arg);
> // 注意 :: 的位置
> ```

---

## 3.3 类型转换

### 3.3.1 as —— 原始类型转换

`as` 是最基本的类型转换方式，用于数字类型之间的转换：

```rust
fn main() {
    // 整数之间的转换
    let x: i32 = 42;
    let y: i64 = x as i64;       // i32 → i64（安全，不会丢失数据）
    let z: i16 = x as i16;       // i32 → i16（可能溢出！）
    let w: u32 = x as u32;       // i32 → u32（负数会变成大正数！）

    println!("i32: {}", x);      // 42
    println!("i64: {}", y);      // 42
    println!("i16: {}", z);      // 42

    // ⚠️ 危险的转换：溢出
    let big: i32 = 300;
    let small: u8 = big as u8;   // 300 超出 u8 范围（0-255）
    println!("i32 300 as u8 = {}", small);  // 44（300 % 256 = 44）

    // ⚠️ 危险的转换：有符号 → 无符号
    let negative: i32 = -1;
    let unsigned: u32 = negative as u32;
    println!("i32 -1 as u32 = {}", unsigned);  // 4294967295（二进制补码）

    // 浮点数和整数之间的转换
    let f: f64 = 3.99;
    let i: i32 = f as i32;       // 截断小数部分（不是四舍五入！）
    println!("f64 3.99 as i32 = {}", i);  // 3

    let i: i32 = 42;
    let f: f64 = i as f64;       // 整数 → 浮点（安全）
    println!("i32 42 as f64 = {}", f);  // 42.0

    // char 和 整数之间的转换
    let c: char = 'A';
    let n: u32 = c as u32;       // 字符 → Unicode 码点
    println!("'A' as u32 = {}", n);  // 65

    let n: u8 = 65;
    let c: char = n as char;     // ASCII 码 → 字符
    println!("65 as char = {}", c);  // A

    // bool 和 整数
    let t: bool = true;
    let n: i32 = t as i32;       // true → 1
    println!("true as i32 = {}", n);  // 1

    let f: bool = false;
    let n: i32 = f as i32;       // false → 0
    println!("false as i32 = {}", n);  // 0

    // 注意：不能用 as 将整数转为 bool
    // let b: bool = 1 as bool;  // ❌ 编译错误
    // 必须用比较运算：
    let b: bool = 1 != 0;       // ✅
}
```

> **对比 JavaScript**：
> ```javascript
> // JavaScript 的隐式转换（混乱的根源）
> Number("42")       // 42
> +"42"              // 42
> "42" * 1           // 42
> parseInt("42.9")   // 42
> Math.floor(3.99)   // 3
>
> // Rust：必须显式转换，清楚知道自己在做什么
> "42".parse::<i32>().unwrap()  // 42
> 3.99_f64 as i32               // 3
> ```

### 3.3.2 From 和 Into trait —— 安全的类型转换

`From` 和 `Into` 是 Rust 标准库提供的 trait（接口），用于**安全的**类型转换（不会丢失数据）：

```rust
fn main() {
    // From：从另一种类型创建
    let s = String::from("hello");           // &str → String
    let n: i64 = i64::from(42i32);           // i32 → i64（安全扩展）
    let f: f64 = f64::from(42i32);           // i32 → f64

    // Into：转换为另一种类型（From 的反向）
    // 如果实现了 From<A> for B，就自动获得了 Into<B> for A
    let s: String = "hello".into();          // &str → String
    let n: i64 = 42i32.into();              // i32 → i64
    let f: f64 = 42i32.into();             // i32 → f64

    // From/Into 只用于安全的转换
    // let n: i32 = i64::MAX.into();  // ❌ 编译错误！i64 → i32 可能溢出

    println!("s = {}", s);
    println!("n = {}", n);
    println!("f = {}", f);
}
```

**From/Into 的核心理念：**

```
as:   我知道可能丢失数据，但我就是要这么做（程序员负责）
From: 这个转换是安全的，不会丢失数据（编译器保证）
Into: 同 From，只是写法不同

安全的转换（可以用 From/Into）:
i8  → i16 → i32 → i64 → i128     （小整数 → 大整数）
u8  → u16 → u32 → u64 → u128
i32 → f64                          （整数 → 更大的浮点）
u8  → char                         （ASCII → 字符）
&str → String                      （借用 → 拥有）

不安全的转换（只能用 as 或 TryFrom）:
i64 → i32     （大整数 → 小整数，可能溢出）
f64 → i32     （浮点 → 整数，丢失小数）
i32 → u32     （有符号 → 无符号，负数变正数）
```

### 3.3.3 TryFrom 和 TryInto —— 可能失败的转换

```rust
use std::convert::TryFrom;
use std::convert::TryInto;

fn main() {
    // TryFrom：转换可能失败，返回 Result
    let big_number: i64 = 1_000_000;
    let small_number: Result<i32, _> = i32::try_from(big_number);
    println!("1_000_000 i64 → i32: {:?}", small_number);  // Ok(1000000)

    let too_big: i64 = i64::MAX;
    let result: Result<i32, _> = i32::try_from(too_big);
    println!("i64::MAX → i32: {:?}", result);  // Err(TryFromIntError(()))

    // TryInto：同样可能失败
    let big: i64 = 300;
    let small: Result<u8, _> = big.try_into();
    match small {
        Ok(n) => println!("转换成功: {}", n),
        Err(e) => println!("转换失败: {}", e),  // 300 超出 u8 范围
    }

    // 类比 TypeScript 的类型守卫：
    // function isSmallNumber(n: number): n is SmallNumber {
    //     return n >= 0 && n <= 255;
    // }
}
```

### 3.3.4 字符串相关的转换

```rust
fn main() {
    // 数字 → 字符串
    let n: i32 = 42;
    let s1: String = n.to_string();              // 通用方法
    let s2: String = format!("{}", n);            // 使用 format!
    println!("{}, {}", s1, s2);

    // 字符串 → 数字（可能失败，返回 Result）
    let s = "42";
    let n: Result<i32, _> = s.parse();
    let n: i32 = s.parse().unwrap();             // 确信不会失败时
    let n: i32 = s.parse().unwrap_or(0);         // 失败时用默认值
    let n: i32 = s.parse().unwrap_or_default();  // 失败时用类型默认值（0）
    println!("解析结果: {}", n);

    // 对比 JavaScript:
    // Number("42")     → "42".parse::<i32>()
    // parseInt("42")   → "42".parse::<i32>()
    // parseFloat("3.14") → "3.14".parse::<f64>()
    // String(42)       → 42.to_string()
    // 42.toString()    → 42.to_string()

    // toString() 自定义实现
    // 在 Rust 中，实现 Display trait 就自动获得 to_string() 方法
    // 类比 JavaScript 的 toString() 方法
}
```

---

## 3.4 元组（Tuple）

### 3.4.1 什么是元组？

元组是**固定长度**的、可以包含**不同类型**元素的集合：

```rust
fn main() {
    // 创建元组
    let point: (i32, i32) = (10, 20);
    let person: (&str, u32, bool) = ("动动", 25, true);
    let mixed = (42, 3.14, "hello", true);  // 类型推断

    // 访问元组元素：使用 .索引
    println!("x = {}", point.0);     // 10
    println!("y = {}", point.1);     // 20
    println!("名字 = {}", person.0); // 动动
    println!("年龄 = {}", person.1); // 25

    // 解构赋值（和 JavaScript 的数组解构类似）
    let (x, y) = point;
    println!("x = {}, y = {}", x, y);

    let (name, age, is_student) = person;
    println!("{}, {} 岁, 学生: {}", name, age, is_student);

    // 部分解构（用 _ 忽略不需要的元素）
    let (_, y) = point;
    let (name, _, _) = person;

    // 类比 TypeScript：
    // const point: [number, number] = [10, 20];
    // const [x, y] = point;
    // const person: [string, number, boolean] = ["动动", 25, true];
    // const [name, age, isStudent] = person;
}
```

### 3.4.2 元组在函数中的使用

```rust
// 返回多个值（JavaScript 通常返回对象，Rust 可以用元组）
fn min_max(numbers: &[i32]) -> (i32, i32) {
    let mut min = numbers[0];
    let mut max = numbers[0];

    for &n in &numbers[1..] {
        if n < min { min = n; }
        if n > max { max = n; }
    }

    (min, max)  // 返回元组
}

fn main() {
    let numbers = vec![3, 1, 4, 1, 5, 9, 2, 6];
    let (min, max) = min_max(&numbers);
    println!("最小: {}, 最大: {}", min, max);  // 最小: 1, 最大: 9
}

// 类比 JavaScript：
// function minMax(numbers: number[]): [number, number] {
//     return [Math.min(...numbers), Math.max(...numbers)];
// }
// const [min, max] = minMax([3, 1, 4, 1, 5, 9, 2, 6]);
```

### 3.4.3 unit 类型 ()

**空元组 `()` 在 Rust 中有特殊含义**，它是 **unit 类型**，相当于"没有值"：

```rust
// 没有返回值的函数实际上返回 ()
fn greet() {
    println!("你好！");
    // 隐式返回 ()
}

// 等价于
fn greet_explicit() -> () {
    println!("你好！");
}

// 类比 TypeScript:
// function greet(): void {
//     console.log("你好！");
// }
// Rust 的 () 类似于 TypeScript 的 void
// 但 () 是一个真实的值，void 不是
```

```rust
fn main() {
    // () 是一个真实的值
    let nothing: () = ();
    println!("{:?}", nothing);  // ()

    // 主要用在泛型中
    // Result<(), Error> 表示"操作可能失败，但成功时不返回有意义的值"
    fn save_to_file(content: &str) -> Result<(), std::io::Error> {
        std::fs::write("output.txt", content)?;
        Ok(())  // 成功，但没有返回值
    }
}
```

---

## 3.5 数组（Array）

### 3.5.1 固定大小数组

Rust 的数组是**固定大小**的，大小是类型的一部分：

```rust
fn main() {
    // 创建数组：[类型; 大小]
    let numbers: [i32; 5] = [1, 2, 3, 4, 5];
    let zeros: [i32; 3] = [0; 3];  // [0, 0, 0]（用 0 填充 3 个元素）
    let ones = [1; 10];             // [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

    // 访问元素（和 JS 一样用索引）
    println!("第一个: {}", numbers[0]);  // 1
    println!("最后一个: {}", numbers[4]); // 5

    // 数组长度
    println!("长度: {}", numbers.len());  // 5

    // ⚠️ 越界访问会 panic（JS 返回 undefined）
    // println!("{}", numbers[10]);  // 运行时 panic: index out of bounds

    // 遍历数组
    for n in &numbers {
        print!("{} ", n);
    }
    println!();

    // 带索引遍历
    for (i, n) in numbers.iter().enumerate() {
        println!("[{}] = {}", i, n);
    }

    // 注意：[i32; 5] 和 [i32; 3] 是不同的类型！
    // let a: [i32; 5] = [1, 2, 3, 4, 5];
    // let b: [i32; 3] = a;  // ❌ 编译错误：类型不匹配
}
```

**对比 JavaScript 的数组：**

```
JavaScript 数组 (Array):          Rust 数组 ([T; N]):
─────────────────────              ──────────────────
动态大小                         → 固定大小（编译时确定）
可以包含不同类型                 → 所有元素同类型
存储在堆上                       → 存储在栈上
push/pop/splice 修改             → 大小不可变
索引越界返回 undefined           → 索引越界会 panic
```

### 3.5.2 Vec<T> —— 动态数组（对应 JS 的 Array）

如果你需要动态大小的数组，使用 `Vec<T>`（vector，动态数组）：

```rust
fn main() {
    // 创建 Vec
    let mut numbers: Vec<i32> = Vec::new();
    let numbers = vec![1, 2, 3, 4, 5];  // 使用 vec! 宏（最常用）
    let zeros: Vec<i32> = vec![0; 10];   // 10 个 0

    // 修改 Vec（需要 mut）
    let mut fruits = vec!["苹果", "香蕉"];

    fruits.push("橘子");           // 添加到末尾（JS: push）
    println!("{:?}", fruits);       // ["苹果", "香蕉", "橘子"]

    let last = fruits.pop();       // 移除末尾（JS: pop）
    println!("{:?}", last);         // Some("橘子")

    fruits.insert(0, "葡萄");     // 在指定位置插入（JS: splice）
    println!("{:?}", fruits);       // ["葡萄", "苹果", "香蕉"]

    fruits.remove(1);              // 移除指定位置（JS: splice）
    println!("{:?}", fruits);       // ["葡萄", "香蕉"]

    // 查询
    println!("长度: {}", fruits.len());
    println!("是否为空: {}", fruits.is_empty());
    println!("包含苹果: {}", fruits.contains(&"苹果"));

    // 访问元素
    println!("第一个: {}", fruits[0]);     // 可能 panic
    println!("第一个: {:?}", fruits.get(0));  // 返回 Option，安全！
    println!("越界: {:?}", fruits.get(99));   // None（不会 panic）

    // 迭代器方法（和 JS 数组方法很像！）
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // filter（JS: filter）
    let evens: Vec<&i32> = numbers.iter()
        .filter(|&&x| x % 2 == 0)
        .collect();
    println!("偶数: {:?}", evens);  // [2, 4, 6, 8, 10]

    // map（JS: map）
    let doubled: Vec<i32> = numbers.iter()
        .map(|&x| x * 2)
        .collect();
    println!("翻倍: {:?}", doubled);  // [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]

    // find（JS: find）
    let first_even = numbers.iter().find(|&&x| x % 2 == 0);
    println!("第一个偶数: {:?}", first_even);  // Some(2)

    // any（JS: some）
    let has_negative = numbers.iter().any(|&x| x < 0);
    println!("有负数: {}", has_negative);  // false

    // all（JS: every）
    let all_positive = numbers.iter().all(|&x| x > 0);
    println!("全是正数: {}", all_positive);  // true

    // sum / product
    let sum: i32 = numbers.iter().sum();
    println!("总和: {}", sum);  // 55

    // reduce（JS: reduce）
    let product: i32 = numbers.iter().copied().reduce(|a, b| a * b).unwrap();
    println!("乘积: {}", product);  // 3628800

    // 链式调用
    let result: Vec<i32> = (1..=20)
        .filter(|x| x % 3 == 0)     // 3 的倍数
        .map(|x| x * x)              // 平方
        .take(3)                      // 只取前 3 个
        .collect();
    println!("结果: {:?}", result);  // [9, 36, 81]

    // 类比 JavaScript:
    // const result = Array.from({length: 20}, (_, i) => i + 1)
    //     .filter(x => x % 3 === 0)
    //     .map(x => x * x)
    //     .slice(0, 3);
}
```

### 3.5.3 数组 vs Vec vs 切片

```
类型          [T; N]              Vec<T>              &[T]
──────        ──────              ──────              ────
名称          数组                动态数组/向量        切片
大小          固定（编译时）      动态（运行时）      动态（运行时）
存储          栈上                堆上                引用其他数据
可变性        大小不可变          可增长/缩小         只读（&[T]）或可写（&mut [T]）
所有权        拥有数据            拥有数据            借用数据
JS 类比       TypedArray          Array               ArrayView / 子数组引用
用途          固定大小集合        通用集合            函数参数（最灵活）
```

---

## 3.6 切片（Slice）

### 3.6.1 什么是切片？

切片是对连续内存区域的**引用**（视图），它不拥有数据：

```rust
fn main() {
    let numbers = [1, 2, 3, 4, 5];

    // 创建切片：&数组[范围]
    let slice: &[i32] = &numbers[1..4];  // [2, 3, 4]
    let first_two: &[i32] = &numbers[..2];  // [1, 2]
    let last_two: &[i32] = &numbers[3..];  // [4, 5]
    let all: &[i32] = &numbers[..];  // [1, 2, 3, 4, 5]

    println!("slice = {:?}", slice);
    println!("first_two = {:?}", first_two);
    println!("last_two = {:?}", last_two);

    // 类比 JavaScript:
    // const numbers = [1, 2, 3, 4, 5];
    // const slice = numbers.slice(1, 4);  // [2, 3, 4]
    // 关键区别：JS 的 slice() 创建新数组（复制数据）
    //           Rust 的切片只是引用（零拷贝！）

    // Vec 也可以创建切片
    let vec = vec![10, 20, 30, 40, 50];
    let slice: &[i32] = &vec[1..3];  // [20, 30]
    println!("vec slice = {:?}", slice);

    // 字符串切片
    let s = String::from("Hello, World!");
    let hello: &str = &s[0..5];   // "Hello"
    let world: &str = &s[7..12];  // "World"
    println!("{} {}", hello, world);
    // 注意：字符串切片的范围是字节偏移，不是字符偏移！
    // 如果切到 UTF-8 字符的中间会 panic
}
```

### 3.6.2 切片作为函数参数

**经验法则：函数参数尽量用切片而不是数组或 Vec**

```rust
// ❌ 只能接受 [i32; 5]
fn sum_array(arr: &[i32; 5]) -> i32 {
    arr.iter().sum()
}

// ❌ 只能接受 &Vec<i32>
fn sum_vec(vec: &Vec<i32>) -> i32 {
    vec.iter().sum()
}

// ✅ 接受任何 i32 切片（数组、Vec、其他切片都可以！）
fn sum_slice(slice: &[i32]) -> i32 {
    slice.iter().sum()
}

fn main() {
    let array = [1, 2, 3, 4, 5];
    let vec = vec![1, 2, 3, 4, 5];

    // sum_slice 可以接受数组引用、Vec 引用、切片
    println!("数组求和: {}", sum_slice(&array));     // ✅
    println!("Vec 求和: {}", sum_slice(&vec));        // ✅
    println!("切片求和: {}", sum_slice(&array[1..4])); // ✅
    println!("切片求和: {}", sum_slice(&vec[2..]));    // ✅
}
```

> **这和 TypeScript 的最佳实践类似**：
> ```typescript
> // ❌ 参数类型太具体
> function sum(arr: number[]): number { }
>
> // ✅ 接受任何可迭代对象（但 TS 通常不区分这么细）
> function sum(arr: Iterable<number>): number { }
> ```
> 在 Rust 中，`&[T]` 是切片类型，它是接受序列数据的"最通用"参数类型。

### 3.6.3 可变切片

```rust
fn main() {
    let mut numbers = vec![1, 2, 3, 4, 5];

    // 创建可变切片
    let slice: &mut [i32] = &mut numbers[1..4];

    // 通过切片修改数据
    slice[0] = 20;  // 修改 numbers[1]
    slice[1] = 30;  // 修改 numbers[2]

    println!("修改后: {:?}", numbers);  // [1, 20, 30, 4, 5]

    // 切片方法
    let mut data = vec![5, 3, 1, 4, 2];
    data.sort();                       // 排序：[1, 2, 3, 4, 5]
    data.reverse();                    // 反转：[5, 4, 3, 2, 1]
    println!("{:?}", data);

    let slice = &data[..];
    println!("最小值: {:?}", slice.iter().min());  // Some(1)
    println!("最大值: {:?}", slice.iter().max());  // Some(5)
    println!("包含 3: {}", slice.contains(&3));    // true

    // 二分查找（要求排序后的切片）
    let sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    match sorted.binary_search(&7) {
        Ok(index) => println!("找到 7 在索引 {}", index),    // 索引 6
        Err(index) => println!("未找到，应插入在索引 {}", index),
    }

    // 窗口和分块
    let data = [1, 2, 3, 4, 5, 6, 7, 8];

    // windows：滑动窗口
    for window in data.windows(3) {
        print!("{:?} ", window);
    }
    println!();  // [1, 2, 3] [2, 3, 4] [3, 4, 5] [4, 5, 6] [5, 6, 7] [6, 7, 8]

    // chunks：固定大小分块
    for chunk in data.chunks(3) {
        print!("{:?} ", chunk);
    }
    println!();  // [1, 2, 3] [4, 5, 6] [7, 8]
}
```

---

## 3.7 类型别名

### 3.7.1 使用 type 关键字

```rust
// 类型别名：给复杂类型取一个简短的名字
type UserId = u64;
type Username = String;
type Score = f64;

// 复杂类型的别名
type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
type Callback = Box<dyn Fn(i32) -> i32>;
type Matrix = Vec<Vec<f64>>;

fn get_user(id: UserId) -> Option<Username> {
    if id == 1 {
        Some(String::from("动动"))
    } else {
        None
    }
}

fn main() {
    let user_id: UserId = 42;
    let username: Username = String::from("DongDong");
    let score: Score = 99.5;

    println!("ID: {}, 用户名: {}, 分数: {}", user_id, username, score);

    // 类型别名不是新类型！UserId 和 u64 完全等价
    let id: UserId = 42;
    let raw: u64 = id;  // ✅ 完全兼容，因为就是同一个类型
    let id2: UserId = raw + 1;  // ✅
}
```

> **对比 TypeScript**：
> ```typescript
> // TypeScript 的类型别名
> type UserId = number;
> type Username = string;
> type Result<T> = { ok: true; value: T } | { ok: false; error: Error };
> type Callback = (n: number) => number;
>
> // TypeScript 也有 branded types（模拟新类型）
> type UserId = number & { __brand: 'UserId' };
> ```

### 3.7.2 newtype 模式 —— 真正的新类型

如果你想创建一个**真正不同**的类型（不能和原始类型互换），使用 newtype 模式：

```rust
// newtype：用元组结构体包装
struct UserId(u64);
struct Email(String);
struct Celsius(f64);
struct Fahrenheit(f64);

fn send_email(to: &Email, subject: &str) {
    println!("发送邮件到 {}: {}", to.0, subject);
}

fn main() {
    let user_id = UserId(42);
    let email = Email(String::from("dong@example.com"));
    let temp = Celsius(36.6);

    send_email(&email, "Hello!");

    // ❌ 编译错误：UserId 和 u64 不能互换
    // let raw: u64 = user_id;

    // 需要显式访问内部值
    let raw: u64 = user_id.0;
    println!("用户 ID: {}", raw);

    // ❌ 编译错误：Celsius 和 Fahrenheit 不能混用
    // let temp: Fahrenheit = temp;  // 类型不匹配

    // 这就是 newtype 的价值：防止不同语义的值被混用
    // 就像 NASA 火星探测器的坠毁事故 —— 英制和公制单位混用导致了灾难
}
```

---

## 3.8 never 类型（!）

### 3.8.1 什么是 never 类型？

`!` 是 Rust 的 **never 类型**，表示一个函数永远不会返回：

```rust
// 永远不返回的函数
fn infinite_loop() -> ! {
    loop {
        // 永远循环
    }
}

fn crash() -> ! {
    panic!("程序崩溃！");  // panic 永远不会正常返回
}

fn exit_program() -> ! {
    std::process::exit(0);  // 退出进程，永远不会返回
}

fn main() {
    // never 类型可以被转换为任何类型
    // 这在 match 中非常有用：
    let x: i32 = match "42".parse::<i32>() {
        Ok(n) => n,              // 返回 i32
        Err(_) => panic!("解析失败"),  // panic! 返回 !，可以隐式转换为 i32
    };

    // 类比 TypeScript:
    // function crash(): never {
    //     throw new Error("crash");
    // }
    // function infinite(): never {
    //     while (true) {}
    // }

    // continue 和 break 的类型也是 !
    let mut sum = 0;
    for i in 0..10 {
        let n: i32 = if i % 2 == 0 {
            i           // 返回 i32
        } else {
            continue    // 返回 !（可以转换为 i32）
        };
        sum += n;
    }
    println!("偶数之和: {}", sum);  // 0 + 2 + 4 + 6 + 8 = 20

    // todo!() 的类型也是 !
    fn not_implemented_yet() -> String {
        todo!()  // 返回 !，可以"假装"返回 String
    }
}
```

### 3.8.2 never 类型的实际应用

```rust
// 1. 在 Result 处理中
fn safe_divide(a: f64, b: f64) -> f64 {
    if b == 0.0 {
        panic!("除以零！");  // ! 可以隐式转换为 f64
    }
    a / b
}

// 2. 在 match 中保持类型一致
fn describe_number(n: i32) -> &'static str {
    match n {
        0 => "零",
        1..=100 => "正数",
        _ => unreachable!("不可能到达这里"),  // ! → &str
    }
}

// 3. 无限循环的服务器
fn run_server() -> ! {
    loop {
        // 处理请求...
        println!("处理请求");
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
}
```

---

## 3.9 类型系统的哲学总结

### 3.9.1 Rust vs TypeScript 类型系统对比

```
特性              TypeScript                  Rust
──────            ──────────                  ────
类型检查时机      编译时（但可以绕过）        编译时（无法绕过）
any 类型          有（逃生舱口）              没有
类型擦除          是（运行时无类型信息）      否（泛型会单态化）
null 安全         strictNullChecks 可选       始终安全（Option<T>）
联合类型          A | B                       enum（更安全）
类型守卫          is 关键字                   match 模式匹配
泛型              <T>                         <T>（类似）
类型别名          type A = ...                type A = ...（类似）
条件类型          T extends U ? X : Y         trait bounds
映射类型          { [K in keyof T]: ... }     没有直接对应（用宏）
工具类型          Partial<T>, Pick<T, K>      没有内置（但可以用 trait）
```

### 3.9.2 如果编译通过，它可能就是对的

Rust 社区有句名言：**"If it compiles, it works."**（如果能编译，它就能工作）

这当然不是 100% 准确的（逻辑错误编译器抓不住），但 Rust 的类型系统确实能在编译时捕获大量 bug：

```
Rust 编译器能在编译时捕获的错误:
├── 空指针解引用         （Option<T> 强制处理）
├── 数组越界            （运行时检查，Debug 模式下 panic）
├── 类型不匹配          （强类型，无隐式转换）
├── 未使用的变量/导入    （编译器警告）
├── 数据竞争            （所有权系统保证）
├── 使用已释放的内存     （所有权系统保证）
├── 未处理的错误         （Result<T, E> 强制处理）
├── 死锁检测            （部分情况）
└── 可变引用冲突        （借用检查器保证）
```

---

## 3.10 综合练习

### 练习 1：类型转换练习

```rust
fn main() {
    // 1. 将以下 JavaScript 代码翻译为 Rust（注意类型安全！）
    // JavaScript:
    // const input = "42";
    // const num = parseInt(input);
    // const doubled = num * 2;
    // const result = `${num} doubled is ${doubled}`;
    // console.log(result);

    // 你的 Rust 代码：
    let input = "42";
    // ... 补全

    // 2. 安全地将 i64 转换为 u8，处理溢出情况
    let values: Vec<i64> = vec![42, 256, -1, 100, 1000];
    for v in &values {
        // 使用 TryFrom，打印成功或失败的信息
        // ... 补全
    }

    // 3. 温度类型（使用 newtype 模式）
    // 定义 Celsius 和 Fahrenheit 类型
    // 实现它们之间的转换
    // ... 补全
}
```

### 练习 2：元组和数组练习

```rust
fn main() {
    // 1. 编写一个函数，接受一个数组切片，返回 (最小值, 最大值, 平均值)
    fn statistics(data: &[f64]) -> (f64, f64, f64) {
        // 你的代码
        todo!()
    }

    let data = [85.5, 92.0, 78.3, 96.1, 88.7, 74.2, 91.0];
    let (min, max, avg) = statistics(&data);
    println!("最小: {:.1}, 最大: {:.1}, 平均: {:.1}", min, max, avg);

    // 2. 矩阵转置
    // 将 2x3 矩阵转置为 3x2 矩阵
    fn transpose(matrix: &[[i32; 3]; 2]) -> [[i32; 2]; 3] {
        // 你的代码
        todo!()
    }

    let matrix = [
        [1, 2, 3],
        [4, 5, 6],
    ];
    let transposed = transpose(&matrix);
    println!("转置结果: {:?}", transposed);
    // 应该输出: [[1, 4], [2, 5], [3, 6]]
}
```

### 练习 3：切片操作练习

```rust
fn main() {
    // 1. 实现一个函数，找出切片中的第二大元素
    fn second_largest(slice: &[i32]) -> Option<i32> {
        // 提示：排序后取倒数第二个，或者遍历维护两个最大值
        // 注意：如果所有元素相同，返回 None
        todo!()
    }

    assert_eq!(second_largest(&[1, 3, 5, 2, 4]), Some(4));
    assert_eq!(second_largest(&[1]), None);
    assert_eq!(second_largest(&[5, 5, 5]), None);
    println!("✅ second_largest 测试通过！");

    // 2. 实现一个函数，检查切片是否是回文
    fn is_palindrome(slice: &[i32]) -> bool {
        // 提示：比较首尾元素
        todo!()
    }

    assert!(is_palindrome(&[1, 2, 3, 2, 1]));
    assert!(is_palindrome(&[1, 2, 2, 1]));
    assert!(!is_palindrome(&[1, 2, 3]));
    assert!(is_palindrome(&[]));
    assert!(is_palindrome(&[1]));
    println!("✅ is_palindrome 测试通过！");

    // 3. 实现一个函数，将切片中的偶数和奇数分开
    fn partition_even_odd(slice: &[i32]) -> (Vec<i32>, Vec<i32>) {
        // 返回 (偶数列表, 奇数列表)
        todo!()
    }

    let (evens, odds) = partition_even_odd(&[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    println!("偶数: {:?}", evens);  // [2, 4, 6, 8, 10]
    println!("奇数: {:?}", odds);   // [1, 3, 5, 7, 9]
}
```

### 练习 4：字符串类型练习

```rust
fn main() {
    // 1. 实现一个函数，将字符串中的每个单词首字母大写
    fn capitalize_words(s: &str) -> String {
        // 提示：split、chars、to_uppercase、collect
        todo!()
    }

    assert_eq!(capitalize_words("hello world"), "Hello World");
    assert_eq!(capitalize_words("rust is awesome"), "Rust Is Awesome");
    println!("✅ capitalize_words 测试通过！");

    // 2. 实现一个函数，统计字符串中每个字符出现的次数
    fn char_frequency(s: &str) -> Vec<(char, usize)> {
        // 提示：使用 HashMap 或 BTreeMap
        // 返回按字符排序的 (字符, 出现次数) 列表
        use std::collections::BTreeMap;
        todo!()
    }

    let freq = char_frequency("hello");
    println!("字符频率: {:?}", freq);
    // 应该包含: ('e', 1), ('h', 1), ('l', 2), ('o', 1)

    // 3. 实现一个简单的 Caesar 加密
    fn caesar_encrypt(text: &str, shift: u8) -> String {
        // 只处理英文字母，其他字符保持不变
        // 'a' + shift → 新字母（环绕处理）
        todo!()
    }

    assert_eq!(caesar_encrypt("hello", 3), "khoor");
    assert_eq!(caesar_encrypt("xyz", 3), "abc");
    assert_eq!(caesar_encrypt("Hello, World!", 13), "Uryyb, Jbeyq!");
    println!("✅ caesar_encrypt 测试通过！");
}
```

### 练习 5：综合挑战 —— 学生成绩管理

```rust
// 定义类型别名和结构
type StudentId = u32;
type Score = f64;
type Grade = &'static str;

fn score_to_grade(score: Score) -> Grade {
    match score as u32 {
        90..=100 => "A",
        80..=89 => "B",
        70..=79 => "C",
        60..=69 => "D",
        _ => "F",
    }
}

fn class_statistics(scores: &[(StudentId, Score)]) -> (Score, Score, Score, Vec<(StudentId, Grade)>) {
    // 返回 (最低分, 最高分, 平均分, 每个学生的成绩等级)
    todo!()
}

fn main() {
    let scores: Vec<(StudentId, Score)> = vec![
        (1001, 92.5),
        (1002, 78.0),
        (1003, 85.5),
        (1004, 63.0),
        (1005, 98.0),
        (1006, 55.0),
        (1007, 71.5),
        (1008, 88.0),
    ];

    let (min, max, avg, grades) = class_statistics(&scores);
    println!("=== 班级成绩统计 ===");
    println!("最低分: {:.1}", min);
    println!("最高分: {:.1}", max);
    println!("平均分: {:.1}", avg);
    println!();
    println!("=== 成绩等级 ===");
    for (id, grade) in &grades {
        let score = scores.iter().find(|(sid, _)| sid == id).unwrap().1;
        println!("学号 {}: {:.1} 分 → {}", id, score, grade);
    }

    // 统计各等级人数
    let mut grade_counts = std::collections::HashMap::new();
    for (_, grade) in &grades {
        *grade_counts.entry(*grade).or_insert(0) += 1;
    }
    println!();
    println!("=== 等级分布 ===");
    for grade in &["A", "B", "C", "D", "F"] {
        let count = grade_counts.get(grade).unwrap_or(&0);
        let bar = "█".repeat(*count);
        println!("{}: {} ({}人)", grade, bar, count);
    }
}
```

---

## 3.11 下一章预告

在下一章中，我们将进入 Rust 最核心、最独特的概念 —— **所有权（Ownership）**：

- 理解所有权的三条规则
- 学习移动（Move）和拷贝（Copy）语义
- 掌握引用和借用
- 理解生命周期（Lifetime）的基础
- 为什么 Rust 不需要垃圾回收器

所有权是让 Rust 成为 Rust 的核心概念。它既是 Rust 最难理解的部分，也是它最强大的武器。准备好迎接挑战！

---

> **本章小结**
>
> 在本章中，我们深入探讨了 Rust 的类型系统：
>
> 1. **强类型系统**：Rust 没有 any、没有 null、没有异常，通过 Option<T> 和 Result<T, E> 在类型层面保证安全
> 2. **类型推断**：编译器很聪明，大部分时候不需要显式标注类型
> 3. **类型转换**：as（原始转换）、From/Into（安全转换）、TryFrom/TryInto（可能失败的转换）
> 4. **元组**：固定大小、不同类型的集合，用于返回多个值
> 5. **数组和 Vec**：固定大小数组 [T; N] 和动态数组 Vec<T>
> 6. **切片**：对连续内存的引用，零拷贝的"视图"
> 7. **类型别名和 newtype**：type 创建别名，元组结构体创建真正的新类型
> 8. **never 类型**：! 表示永远不返回的函数
>
> 最重要的心智模型：**Rust 的类型系统是你的盟友，不是敌人**。虽然一开始它可能让你觉得"管得太多"，但正是这种严格保证了代码在运行时几乎不会出现类型相关的 bug。"编译通过 = 大概率正确"不是口号，是 Rust 程序员的日常体验。
