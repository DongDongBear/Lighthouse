# 第十一章：生命周期 —— Rust 内存安全的最后一块拼图

> **本章目标**
>
> - 理解为什么 Rust 需要生命周期
> - 掌握生命周期标注语法 `'a`
> - 学会在函数、结构体中使用生命周期
> - 理解生命周期省略规则
> - 掌握 `'static` 生命周期
> - 学会将生命周期与泛型结合
> - 能够诊断和修复常见生命周期错误

> **预计学习时间：150 - 180 分钟**（本教程难度最高的章节！）

---

## 11.1 为什么需要生命周期？

### 11.1.1 从一个 Bug 说起

先看一段 JavaScript：

```javascript
function getFirst(list) {
    return list[0];
}

let result;
{
    let data = [1, 2, 3];
    result = getFirst(data);
}
// data 已被垃圾回收...但 result 还在
console.log(result); // 1 —— JS 里没问题，GC 会处理
```

JavaScript 有垃圾回收器（GC），所以你不用担心这类问题。但在没有 GC 的语言（如 C）中：

```c
// C 语言 —— 悬垂指针！
char* get_greeting() {
    char greeting[] = "hello";
    return greeting; // ❌ 返回了栈上局部变量的指针！
}
// greeting 的内存已经被释放，指针指向垃圾数据
```

Rust 既没有 GC，又要保证内存安全。**生命周期就是 Rust 的解决方案**：在编译时验证所有引用都是有效的。

### 11.1.2 引用必须比被引用的数据"活得短"

这是生命周期的核心规则：

```
┌─────────────────────────┐
│ 数据的生命周期           │
│  ┌───────────────┐      │
│  │ 引用的生命周期 │      │
│  └───────────────┘      │
└─────────────────────────┘
       ✅ 合法：引用在数据活着的时候使用

┌───────────────┐
│ 数据的生命周期 │
│  ┌────────────│──────┐
│  │ 引用的生命  │周期  │  ← 引用"活得"比数据长！
│  └────────────│──────┘
└───────────────┘
       ❌ 非法：悬垂引用（dangling reference）
```

### 11.1.3 编译器如何检查？

```rust
fn main() {
    let r;                  // ──────────┐ r 的生命周期开始
    {                       //           │
        let x = 5;         // ─┐ x 的生命周期开始
        r = &x;            //  │ r 借用了 x
    }                       // ─┘ x 的生命周期结束（被释放）
                            //           │
    println!("{}", r);      // ──────────┘ ❌ r 还在用，但 x 已经没了！
}
```

编译器报错：

```
error[E0597]: `x` does not live long enough
 --> src/main.rs:4:13
  |
4 |         r = &x;
  |             ^^ borrowed value does not live long enough
5 |     }
  |     - `x` dropped here while still borrowed
6 |
7 |     println!("{}", r);
  |                    - borrow later used here
```

**这就是借用检查器（borrow checker）的工作。** 它在编译时分析每个引用的生命周期，确保没有悬垂引用。

---

## 11.2 生命周期标注语法

### 11.2.1 什么时候需要标注？

大多数时候，编译器能自动推断生命周期（就像类型推断一样）。但在某些情况下，编译器需要你的帮助。

**类比 TypeScript 的类型标注：**

```typescript
// TS 能推断
const x = 5; // 推断为 number

// TS 需要你标注
function first(list: ???[]): ??? {
    return list[0];
}
// 你需要写成 function first<T>(list: T[]): T
```

Rust 的生命周期标注也是类似的情况：当编译器无法确定引用的关系时，你需要告诉它。

### 11.2.2 语法

生命周期标注以 `'`（单引号）开头，后跟一个短名称（通常是 `'a`、`'b`）：

```rust
&i32        // 普通引用
&'a i32     // 带生命周期标注的引用
&'a mut i32 // 带生命周期标注的可变引用
```

**生命周期标注不会改变任何引用的实际生命周期。** 它只是告诉编译器多个引用之间的关系。

想象一下：生命周期标注就像给引用贴标签。`'a` 并不是说"这个引用活 `'a` 这么长"，而是说"这些标着 `'a` 的引用，它们的有效期有某种关联"。

---

## 11.3 函数中的生命周期

### 11.3.1 一个需要标注的例子

```rust
// ❌ 编译错误！
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

编译器报错：

```
error[E0106]: missing lifetime specifier
 --> src/main.rs:1:33
  |
1 | fn longest(x: &str, y: &str) -> &str {
  |               ----     ----      ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value,
    but the signature does not say whether it is borrowed from `x` or `y`
```

**为什么？** 编译器不知道返回的引用是来自 `x` 还是 `y`，因此不知道返回值应该有多长的生命周期。

### 11.3.2 添加生命周期标注

```rust
// ✅ 正确：用 'a 告诉编译器，返回值的生命周期
//    与输入参数中较短的那个一样
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

**这个标注的含义：**
- `'a` 是一个生命周期参数（类似泛型类型参数）
- `x: &'a str` —— x 的引用至少活 `'a` 这么长
- `y: &'a str` —— y 的引用至少活 `'a` 这么长
- `-> &'a str` —— 返回值的引用至少活 `'a` 这么长
- `'a` 的实际长度 = x 和 y 的生命周期中较短的那个

```
调用 longest(x, y) 时的生命周期推导：

x 的生命周期: ├──────────────────────┤
y 的生命周期:      ├───────────┤
'a（取交集）:      ├───────────┤  ← 返回值最多活这么长
```

### 11.3.3 使用示例

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let string1 = String::from("这是一个长字符串");
    let result;

    {
        let string2 = String::from("短");
        result = longest(string1.as_str(), string2.as_str());
        println!("较长的是: {}", result); // ✅ OK
    }

    // 下面这行如果取消注释会编译错误！
    // 因为 result 的生命周期受 string2 限制，而 string2 已经被释放
    // println!("较长的是: {}", result); // ❌
}
```

让我们用图来理解：

```
string1 的生命周期: ├───────────────────────────────────────┤
                         {
string2 的生命周期:      ├──────────────────────────┤
result 的生命周期:       ├──────────────────────────┤  ← 受 string2 限制
                         println!(...) ← ✅ 在范围内
                         }
                    println!(...) ← ❌ result 已经"过期"了
```

### 11.3.4 只有部分参数需要关联

如果返回值只可能来自其中一个参数，只需要标注那个参数：

```rust
// 返回值只来自 x，所以 y 不需要同一个生命周期
fn first_word<'a>(x: &'a str, y: &str) -> &'a str {
    // 只返回 x 的一部分
    let bytes = x.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &x[0..i];
        }
    }
    x
}
```

### 11.3.5 返回引用时的常见错误

```rust
// ❌ 编译错误！不能返回指向局部变量的引用
fn create_string<'a>() -> &'a str {
    let s = String::from("hello");
    &s // s 在函数结束时被释放，引用悬垂了！
}
```

**解决方案：返回拥有所有权的值，而不是引用：**

```rust
// ✅ 返回 String（拥有所有权），而不是 &str（引用）
fn create_string() -> String {
    let s = String::from("hello");
    s // 所有权转移给调用者
}
```

**对比 JavaScript：**

```javascript
// JS 永远不会有这个问题，因为 GC 会追踪引用
function createString() {
    let s = "hello";
    return s; // GC 保证 s 不会被过早回收
}
```

---

## 11.4 结构体中的生命周期

### 11.4.1 当结构体包含引用时

```rust
// 结构体持有引用时，必须标注生命周期
struct Excerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("很久很久以前。在一个遥远的地方...");
    let first_sentence;

    {
        // 取第一句话
        let i = novel.find('。').unwrap_or(novel.len());
        first_sentence = Excerpt {
            part: &novel[..=i], // 引用 novel 的一部分
        };
    }

    // ✅ OK，因为 novel 还活着
    println!("引用: {}", first_sentence.part);
}
```

```
novel 的生命周期:          ├──────────────────────────────┤
first_sentence 的生命周期: ├──────────────────────────────┤
first_sentence.part 引用了 novel 的一部分
                           ✅ novel 活得够长
```

### 11.4.2 如果数据先被释放呢？

```rust
// ❌ 编译错误！
struct Excerpt<'a> {
    part: &'a str,
}

fn main() {
    let first_sentence;

    {
        let novel = String::from("很久很久以前。");
        let i = novel.find('。').unwrap_or(novel.len());
        first_sentence = Excerpt {
            part: &novel[..=i],
        };
    } // novel 在这里被释放！

    // ❌ first_sentence.part 引用的数据已经没了
    println!("{}", first_sentence.part);
}
```

```
                    {
novel 的生命周期:   ├────────────────────┤
                    }
first_sentence:     ├─────────────────────────────┤
                                          ↑ 使用引用
                                          ❌ novel 已经被释放！
```

### 11.4.3 多个生命周期参数

```rust
struct Context<'a, 'b> {
    name: &'a str,
    description: &'b str,
}

impl<'a, 'b> Context<'a, 'b> {
    fn new(name: &'a str, description: &'b str) -> Self {
        Context { name, description }
    }

    fn name(&self) -> &'a str {
        self.name
    }

    fn description(&self) -> &'b str {
        self.description
    }
}

fn main() {
    let name = String::from("Rust 教程");
    let ctx;

    {
        let desc = String::from("一个很棒的教程");
        ctx = Context::new(&name, &desc);
        println!("描述: {}", ctx.description()); // ✅ desc 还活着
    }

    // 下面这行 OK，因为 name 还活着
    println!("名称: {}", ctx.name()); // ✅

    // 但不能用 description，因为 desc 已经被释放
    // println!("描述: {}", ctx.description()); // ❌
}
```

### 11.4.4 为包含引用的结构体实现方法

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}

impl<'a> ImportantExcerpt<'a> {
    // 返回值的生命周期与 self 一样
    fn level(&self) -> i32 {
        3
    }

    // 返回结构体中存储的引用
    fn part(&self) -> &'a str {
        self.part
    }

    // 返回输入参数的引用（与 self 无关）
    fn announce_and_return<'b>(&self, announcement: &'b str) -> &'b str {
        println!("请注意: {}", announcement);
        announcement
    }
}
```

---

## 11.5 生命周期省略规则

### 11.5.1 为什么有些函数不需要标注？

你可能注意到了：

```rust
// 为什么这个不需要标注生命周期？
fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }
    s
}
```

因为编译器有一套**生命周期省略规则（Lifetime Elision Rules）**，能自动推断。

### 11.5.2 三条规则

编译器按顺序应用以下规则。如果应用完所有规则后仍有歧义，就报错让你手动标注。

**规则一：每个引用参数都有自己的生命周期**

```rust
// 你写的：
fn foo(x: &str, y: &str)
// 编译器推断为：
fn foo<'a, 'b>(x: &'a str, y: &'b str)
```

**规则二：如果只有一个输入生命周期参数，它被赋给所有输出生命周期**

```rust
// 你写的：
fn first_word(s: &str) -> &str
// 应用规则一后：
fn first_word<'a>(s: &'a str) -> &str
// 应用规则二后：
fn first_word<'a>(s: &'a str) -> &'a str  ← 完成！
```

**规则三：如果有多个输入生命周期参数，但其中一个是 `&self` 或 `&mut self`，则 `self` 的生命周期被赋给所有输出生命周期**

```rust
// 你写的：
impl<'a> Foo<'a> {
    fn method(&self, x: &str) -> &str { ... }
}
// 应用规则一后：
fn method<'b, 'c>(&'b self, x: &'c str) -> &str
// 应用规则三后：
fn method<'b, 'c>(&'b self, x: &'c str) -> &'b str  ← 完成！
```

### 11.5.3 规则失败的例子

回到我们之前的 `longest` 函数：

```rust
fn longest(x: &str, y: &str) -> &str
// 应用规则一后：
fn longest<'a, 'b>(x: &'a str, y: &'b str) -> &str
// 应用规则二：有两个输入生命周期，不适用
// 应用规则三：没有 &self，不适用
// 输出的生命周期仍然未知 → 编译错误！需要手动标注
```

### 11.5.4 省略规则总结

```
输入参数                              是否需要标注返回值
─────────────────────────────────── ──────────────
fn foo(x: &str)                     不需要（规则二）
fn foo(x: &str, y: &str)            需要（有歧义）
fn foo(&self, x: &str)              不需要（规则三）
fn foo(&self)                       不需要（规则二+三）
fn foo(x: &str) -> String           不需要（返回值不是引用）
```

---

## 11.6 'static 生命周期

### 11.6.1 什么是 'static？

`'static` 表示引用可以在程序的整个运行期间有效：

```rust
// 字符串字面量的类型就是 &'static str
let s: &'static str = "我在整个程序运行期间都有效";
```

字符串字面量直接嵌入在编译后的二进制文件中，所以它们永远不会被释放。

### 11.6.2 何时使用 'static？

```rust
// 1. 字符串字面量
let s: &'static str = "hello";

// 2. 全局常量
const MAX_SIZE: &'static str = "1024";

// 3. 泛型约束中要求拥有所有权的数据
fn spawn_thread<T: Send + 'static>(value: T) {
    std::thread::spawn(move || {
        // value 必须能在新线程中独立存活
        println!("got value");
    });
}
```

### 11.6.3 'static 的两种含义

`'static` 在不同语境下含义不同：

```rust
// 含义 1：引用类型 —— 这个引用在整个程序运行期间都有效
let s: &'static str = "hello";

// 含义 2：Trait bound —— 这个类型不包含任何非 'static 的引用
// （即：这个类型要么没有引用，要么只有 'static 引用）
fn process<T: 'static>(value: T) {
    // T 可以是 String（没有引用，自然满足）
    // T 可以是 &'static str（有 'static 引用）
    // T 不能是 &str（有非 'static 引用）
}
```

**常见误解：** `T: 'static` 不意味着 T 永远存在！它只意味着 T 可以安全地被持有任意长时间（因为它不依赖任何短生命周期的引用）。

```
T: 'static 的含义图解：

✅ String          → 拥有自己的数据，没有引用
✅ i32             → 简单类型，没有引用
✅ Vec<String>     → 拥有自己的数据
✅ &'static str    → 引用了永久存在的数据
❌ &str            → 引用了可能被释放的数据
❌ &Vec<i32>       → 引用了可能被释放的数据
```

### 11.6.4 不要滥用 'static

当编译器报生命周期错误时，新手经常想"加个 'static 就好了"。**这通常是错误的做法！**

```rust
// ❌ 不好：滥用 'static 会让你失去灵活性
fn process(s: &'static str) {
    println!("{}", s);
}

fn main() {
    let owned = String::from("hello");
    // ❌ 编译错误！&owned 不是 'static 的
    // process(&owned);

    // 只有字符串字面量能用
    process("hello"); // ✅ 但太受限了
}

// ✅ 好：用普通生命周期
fn process2(s: &str) {
    println!("{}", s);
}
```

---

## 11.7 生命周期与泛型结合

### 11.7.1 同时使用泛型和生命周期

```rust
use std::fmt::Display;

fn longest_with_announcement<'a, T>(
    x: &'a str,
    y: &'a str,
    ann: T,
) -> &'a str
where
    T: Display,
{
    println!("公告：{}", ann);
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let s1 = String::from("长字符串");
    let s2 = "短";
    let result = longest_with_announcement(
        s1.as_str(),
        s2,
        "比较两个字符串的长度",
    );
    println!("较长的: {}", result);
}
```

### 11.7.2 生命周期在结构体泛型中

```rust
use std::fmt::Display;

#[derive(Debug)]
struct Highlight<'a, T>
where
    T: Display,
{
    content: &'a str,
    color: T,
}

impl<'a, T: Display> Highlight<'a, T> {
    fn new(content: &'a str, color: T) -> Self {
        Highlight { content, color }
    }

    fn render(&self) -> String {
        format!("[{}]{}", self.color, self.content)
    }
}

fn main() {
    let text = String::from("重要内容");
    let h = Highlight::new(&text, "红色");
    println!("{}", h.render()); // [红色]重要内容
}
```

### 11.7.3 生命周期子类型（高级）

有时候你需要表达"一个生命周期比另一个长"：

```rust
// 'a: 'b 表示 'a 至少和 'b 一样长
fn choose<'a: 'b, 'b>(first: &'a str, second: &'b str) -> &'b str {
    if first.len() > second.len() {
        first  // 'a 比 'b 长，可以安全地"缩短"为 'b
    } else {
        second
    }
}
```

```
'a: 'b 的含义图解：

'a（较长）: ├──────────────────────────────────┤
'b（较短）:      ├────────────────────┤
返回值 'b:       ├────────────────────┤

'a 至少和 'b 一样长，所以 &'a str 可以安全地当作 &'b str 使用
```

---

## 11.8 常见生命周期错误与解决

### 11.8.1 错误：返回局部变量的引用

```rust
// ❌ 错误
fn create_greeting(name: &str) -> &str {
    let greeting = format!("Hello, {}!", name);
    &greeting // greeting 是局部变量，函数结束就释放了
}

// ✅ 解决方案 1：返回拥有所有权的值
fn create_greeting_v1(name: &str) -> String {
    format!("Hello, {}!", name)
}

// ✅ 解决方案 2：返回输入的引用（如果适用）
fn create_greeting_v2<'a>(name: &'a str) -> &'a str {
    name // 返回输入本身是可以的
}
```

### 11.8.2 错误：结构体中的引用比数据活得长

```rust
struct Config<'a> {
    name: &'a str,
}

// ❌ 错误的使用
fn create_config() -> Config<'static> {
    let name = String::from("app");
    Config { name: &name } // name 是局部变量！
}

// ✅ 解决方案：让结构体拥有数据
struct OwnedConfig {
    name: String, // 拥有所有权，不是引用
}

fn create_config() -> OwnedConfig {
    OwnedConfig {
        name: String::from("app"),
    }
}
```

### 11.8.3 错误：可变引用与不可变引用冲突

```rust
fn main() {
    let mut data = vec![1, 2, 3];

    // 获取不可变引用
    let first = &data[0];

    // ❌ 在不可变引用还在使用时，不能获取可变引用
    // data.push(4); // push 需要 &mut data

    println!("first: {}", first); // first 在这里最后使用

    // ✅ first 不再使用后，可以获取可变引用
    data.push(4); // 现在可以了
}
```

```
data 的生命周期:    ├─────────────────────────────┤
first (&data[0]):   ├────────────────┤
                                     ↑ first 最后使用
                                       ├ data.push(4) ✅
```

### 11.8.4 错误：闭包中的生命周期

```rust
// ❌ 错误：闭包捕获了局部变量的引用
fn make_adder(x: &i32) -> impl Fn(i32) -> i32 + '_ {
    move |y| *x + y
}

// 上面用 '_ 是语法糖，等价于：
fn make_adder2<'a>(x: &'a i32) -> impl Fn(i32) -> i32 + 'a {
    move |y| *x + y
}

fn main() {
    let add_five;
    {
        let five = 5;
        add_five = make_adder(&five);
        println!("{}", add_five(3)); // ✅ five 还活着
    }
    // ❌ five 已经被释放
    // println!("{}", add_five(3));
}
```

**解决方案：让闭包拥有数据的所有权**

```rust
fn make_adder(x: i32) -> impl Fn(i32) -> i32 {
    move |y| x + y // x 被 move 进闭包，闭包拥有它
}

fn main() {
    let add_five = make_adder(5);
    println!("{}", add_five(3));  // 8 ✅ 永远安全
    println!("{}", add_five(10)); // 15 ✅
}
```

### 11.8.5 错误：迭代器与借用

```rust
fn main() {
    let mut names = vec![
        String::from("Alice"),
        String::from("Bob"),
        String::from("Charlie"),
    ];

    // ❌ 在迭代的同时修改
    // for name in &names {
    //     if name == "Bob" {
    //         names.push(String::from("Dave")); // ❌ 不能在借用时修改
    //     }
    // }

    // ✅ 解决方案 1：先收集要添加的，再统一添加
    let to_add: Vec<String> = names
        .iter()
        .filter(|n| n.as_str() == "Bob")
        .map(|_| String::from("Dave"))
        .collect();
    names.extend(to_add);

    // ✅ 解决方案 2：用 retain + extend 等不需要同时借用的方法
    println!("{:?}", names);
}
```

---

## 11.9 生命周期思维模型

### 11.9.1 "借用就像借书"

把引用想象成从图书馆借书：

```
图书馆（数据的拥有者）
├── 《Rust 编程》 → 借给 Alice（&book）
│                     Alice 看完还回来 ✅
│
├── 《Rust 编程》 → 借给 Alice 和 Bob（多个 &book）
│                     都只是看，没问题 ✅
│
├── 《Rust 编程》 → 借给 Alice 做笔记（&mut book）
│                     同时不能借给别人 ✅
│
└── 图书馆关门了  → Alice 还拿着书？
                     ❌ 悬垂引用！
```

### 11.9.2 决策流程图

当你不确定是否需要生命周期标注时：

```
你的函数接收引用参数吗？
├── 否 → 不需要生命周期标注 ✅
└── 是 → 你的函数返回引用吗？
    ├── 否 → 不需要标注（省略规则处理） ✅
    └── 是 → 只有一个引用输入参数？
        ├── 是 → 不需要标注（省略规则二） ✅
        └── 否 → 是方法（有 &self）？
            ├── 是 → 返回值来自 self？
            │   ├── 是 → 不需要标注（省略规则三） ✅
            │   └── 否 → 需要标注 ✏️
            └── 否 → 需要标注 ✏️
```

### 11.9.3 何时用引用 vs 拥有所有权

```
┌─────────────────────────────────────┐
│ 我该用 &T 还是 T？                  │
├─────────────────────────────────────┤
│                                     │
│ 只需要读取数据？          → &T      │
│ 需要修改数据？            → &mut T  │
│ 需要存储数据长期使用？    → T       │
│ 要把数据传给另一个线程？  → T       │
│ 函数创建并返回新数据？    → T       │
│ 性能关键，数据很大？      → &T      │
│ 不确定？                  → 先用 T  │
│                                     │
└─────────────────────────────────────┘
```

**经验法则：** 如果你在与生命周期做斗争，通常意味着你应该用拥有所有权的类型（String 而不是 &str，Vec<T> 而不是 &[T]）。

---

## 11.10 实战示例

### 11.10.1 文本解析器

```rust
/// 一个简单的文本解析器，从文本中提取引用
struct Parser<'input> {
    text: &'input str,
    position: usize,
}

impl<'input> Parser<'input> {
    fn new(text: &'input str) -> Self {
        Parser { text, position: 0 }
    }

    /// 跳过空白字符
    fn skip_whitespace(&mut self) {
        while self.position < self.text.len() {
            let ch = self.text.as_bytes()[self.position];
            if ch == b' ' || ch == b'\n' || ch == b'\t' {
                self.position += 1;
            } else {
                break;
            }
        }
    }

    /// 读取下一个单词（返回对原始文本的引用）
    fn next_word(&mut self) -> Option<&'input str> {
        self.skip_whitespace();

        if self.position >= self.text.len() {
            return None;
        }

        let start = self.position;
        while self.position < self.text.len() {
            let ch = self.text.as_bytes()[self.position];
            if ch == b' ' || ch == b'\n' || ch == b'\t' {
                break;
            }
            self.position += 1;
        }

        Some(&self.text[start..self.position])
    }

    /// 获取剩余文本
    fn remaining(&self) -> &'input str {
        &self.text[self.position..]
    }
}

fn main() {
    let source = "Hello World Rust 语言";
    let mut parser = Parser::new(source);

    while let Some(word) = parser.next_word() {
        println!("单词: '{}'", word);
    }

    // 重置并获取剩余文本
    let mut parser2 = Parser::new(source);
    parser2.next_word(); // 跳过 "Hello"
    println!("剩余: '{}'", parser2.remaining());
}
```

注意 `next_word` 返回 `&'input str` 而不是 `&str` —— 返回值的生命周期与原始输入绑定，而不是与 Parser 本身绑定。这意味着你可以在 Parser 被释放后仍然使用提取出的单词。

### 11.10.2 配置构建器

```rust
/// 展示何时该用引用 vs 所有权
#[derive(Debug)]
struct ServerConfig {
    host: String,      // 拥有所有权 —— 需要长期存储
    port: u16,
    max_connections: u32,
}

/// 构建器使用引用来避免不必要的拷贝
struct ConfigBuilder<'a> {
    host: &'a str,     // 借用 —— 构建过程中临时使用
    port: u16,
    max_connections: u32,
}

impl<'a> ConfigBuilder<'a> {
    fn new(host: &'a str) -> Self {
        ConfigBuilder {
            host,
            port: 8080,
            max_connections: 100,
        }
    }

    fn port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }

    fn max_connections(mut self, max: u32) -> Self {
        self.max_connections = max;
        self
    }

    /// 构建最终配置，将引用转为拥有所有权的 String
    fn build(self) -> ServerConfig {
        ServerConfig {
            host: self.host.to_string(), // &str → String
            port: self.port,
            max_connections: self.max_connections,
        }
    }
}

fn main() {
    let config = ConfigBuilder::new("localhost")
        .port(3000)
        .max_connections(500)
        .build();

    println!("{:#?}", config);
    // ServerConfig {
    //     host: "localhost",
    //     port: 3000,
    //     max_connections: 500,
    // }
}
```

---

## 11.11 小结

### 生命周期核心概念一览

| 概念 | 说明 |
|---|---|
| `'a` | 生命周期参数，描述引用的有效范围 |
| `&'a T` | 一个至少活 `'a` 的引用 |
| `'static` | 在整个程序运行期间都有效 |
| `T: 'static` | T 不包含非 static 的引用 |
| `'a: 'b` | `'a` 至少和 `'b` 一样长 |
| `'_` | 匿名生命周期（让编译器推断） |

### 省略规则速记

1. 每个引用参数获得独立的生命周期
2. 单个输入生命周期 → 赋给所有输出
3. `&self` 的生命周期 → 赋给所有输出

### 生命周期与 JavaScript 的对比

| 情况 | JavaScript | Rust |
|---|---|---|
| 局部变量引用 | GC 自动管理 | 编译时生命周期检查 |
| 函数返回引用 | 始终安全（GC） | 必须证明引用有效 |
| 数据被释放后访问 | 不可能（GC） | 编译时阻止 |
| 循环引用 | 可能内存泄漏 | 大部分编译时阻止 |
| 性能代价 | 运行时 GC 开销 | 零运行时开销 |

**核心要点：**
1. 生命周期是编译时检查，零运行时开销
2. 大多数情况编译器可以自动推断
3. 标注不改变生命周期，只是帮编译器理解关系
4. 遇到困难时，考虑用拥有所有权的类型替代引用
5. `'static` 不等于"永久存在"，而是"不依赖短期引用"

---

## 11.12 练习题

### 练习 1：基础生命周期

以下代码有什么问题？如何修复？

```rust
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let result;
    let s1 = String::from("hello");
    {
        let s2 = String::from("world!");
        result = longest(s1.as_str(), s2.as_str());
    }
    println!("{}", result);
}
```

### 练习 2：结构体生命周期

为以下结构体添加正确的生命周期标注，并实现 `highlight` 方法：

```rust
struct TextEditor {
    content: &str,
    cursor: usize,
}

impl TextEditor {
    fn new(content: &str) -> Self {
        TextEditor { content, cursor: 0 }
    }

    // 返回从 start 到 end 的文本切片
    fn highlight(&self, start: usize, end: usize) -> &str {
        &self.content[start..end]
    }
}
```

### 练习 3：生命周期与泛型

实现一个泛型函数 `min_by_key`，接收两个引用和一个键提取函数，返回键较小的那个引用：

```rust
fn min_by_key<'a, T, K: Ord>(
    a: &'a T,
    b: &'a T,
    key_fn: impl Fn(&T) -> K,
) -> &'a T {
    todo!()
}

fn main() {
    let alice = ("Alice", 30);
    let bob = ("Bob", 25);
    let younger = min_by_key(&alice, &bob, |p| p.1);
    println!("{:?}", younger); // ("Bob", 25)
}
```

### 练习 4：修复错误

以下每段代码都有生命周期错误，找出问题并修复：

```rust
// A
fn first_or_default(list: &[String], default: &str) -> &str {
    if list.is_empty() {
        default
    } else {
        &list[0]
    }
}

// B
struct Cache {
    data: &str,
}

impl Cache {
    fn store(&mut self, value: &str) {
        self.data = value;
    }
}

// C
fn split_first(s: &str) -> (&str, &str) {
    match s.find(' ') {
        Some(i) => (&s[..i], &s[i+1..]),
        None => (s, ""),
    }
}
```

### 练习 5：实战 —— CSV 解析器

写一个简单的 CSV 行解析器，它接收一行文本（`&str`），返回字段的引用切片（`Vec<&str>`），不做任何字符串分配：

```rust
struct CsvRow<'a> {
    fields: Vec<&'a str>,
}

impl<'a> CsvRow<'a> {
    fn parse(line: &'a str) -> Self {
        // 实现：按逗号分割，trim 每个字段
        todo!()
    }

    fn get(&self, index: usize) -> Option<&&str> {
        self.fields.get(index)
    }

    fn field_count(&self) -> usize {
        self.fields.len()
    }
}

fn main() {
    let line = "Alice, 30, Shanghai";
    let row = CsvRow::parse(line);
    assert_eq!(row.field_count(), 3);
    assert_eq!(row.get(0), Some(&"Alice"));
    assert_eq!(row.get(1), Some(&"30"));
    assert_eq!(row.get(2), Some(&"Shanghai"));
}
```

---

> **下一章预告：** 第十二章我们将学习**闭包与迭代器**——Rust 函数式编程的核心。如果你喜欢 JavaScript 的 `map`、`filter`、`reduce`，你会爱上 Rust 的迭代器！
