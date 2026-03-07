# 第八章：错误处理 —— Rust 中没有 try-catch

> **本章目标**
>
> - 理解 Rust 为什么没有异常机制，以及这带来的好处
> - 掌握 `panic!` 的使用场景和工作原理
> - 深入理解 `Result&lt;T, E&gt;` 类型，并与 JS Promise 对比
> - 熟练使用 `?` 运算符简化错误传播
> - 学会定义自定义错误类型
> - 了解 `thiserror` 和 `anyhow` 这两个常用错误处理库
> - 掌握错误处理的最佳实践
> - 建立"何时 panic、何时 Result"的判断力

> **预计学习时间：90 - 120 分钟**

---

## 8.1 Rust 没有异常！

如果你来自 JavaScript/TypeScript 的世界，你一定写过无数次 `try-catch`：

```javascript
// JavaScript: try-catch 无处不在
try {
    const data = JSON.parse(userInput);
    const result = processData(data);
    await saveToDatabase(result);
} catch (error) {
    console.error("出错了:", error.message);
}
```

看起来很合理？但这里有几个隐藏的问题：

1. **你不知道哪一行会抛异常** —— `JSON.parse`、`processData`、`saveToDatabase` 都可能抛异常，但从函数签名看不出来
2. **catch 捕获所有错误** —— 你可能意外地吞掉了不该忽略的错误
3. **异常可以跨越多层调用栈** —— 一个深层函数的异常可能在完全不相关的地方被捕获
4. **没有强制处理** —— 忘记 try-catch？运行时崩溃，TypeScript 编译器不会提醒你

Rust 采用了完全不同的哲学：**错误是返回值，不是异常**。

```rust
// Rust: 错误是返回值的一部分
fn parse_json(input: &str) -> Result<Data, ParseError> { ... }
fn process_data(data: Data) -> Result<Output, ProcessError> { ... }
fn save_to_database(output: Output) -> Result<(), DbError> { ... }
```

关键区别：
- **函数签名明确告诉你**：这个函数可能失败，失败的类型是什么
- **编译器强制你处理错误**：不处理 `Result` 会收到警告
- **没有隐式的控制流跳转**：错误就是普通的值，你可以检查、转换、传播

---

## 8.2 两种错误：不可恢复 vs 可恢复

Rust 把错误分为两大类：

| 类别 | 机制 | 场景 | JS 类比 |
|---|---|---|---|
| **不可恢复错误** | `panic!` | 程序 bug、不变量被违反 | `throw new Error()` 但无法 catch |
| **可恢复错误** | `Result&lt;T, E&gt;` | 预期中可能发生的错误 | Promise 的 reject / 返回错误对象 |

### 8.2.1 panic! —— 不可恢复错误

`panic!` 表示"程序遇到了不应该发生的情况"。它会：
1. 打印错误信息
2. 展开（unwind）调用栈，清理资源
3. 退出程序

```rust
fn main() {
    // 直接 panic
    // panic!("这是一个致命错误！");

    // 数组越界会 panic
    let v = vec![1, 2, 3];
    // v[99];  // panic: index out of bounds

    // 除以零会 panic（整数除法）
    // let x = 1 / 0;  // panic: attempt to divide by zero

    // unwrap 在 None 或 Err 时 panic
    let value: Option<i32> = None;
    // value.unwrap();  // panic: called `Option::unwrap()` on a `None` value

    println!("如果上面的 panic 被触发，这行不会执行");
}
```

### 8.2.2 什么时候应该 panic？

```rust
// ✅ 适合 panic 的场景

// 1. 程序初始化阶段的配置错误
fn init_config() {
    let port: u16 = std::env::var("PORT")
        .expect("PORT 环境变量必须设置")  // expect 是带消息的 unwrap
        .parse()
        .expect("PORT 必须是有效的数字");

    println!("服务器将在端口 {} 启动", port);
}

// 2. 不变量被违反（逻辑错误/bug）
fn process_positive(n: i32) {
    assert!(n > 0, "n 必须是正数，但收到了 {}", n);
    // assert! 在条件为 false 时 panic

    // 或者用 unreachable!
    match n {
        1..=100 => println!("小数字"),
        101.. => println!("大数字"),
        _ => unreachable!("n 应该是正数，前面已经检查过了"),
    }
}

// 3. 原型阶段，用 todo! 标记未实现的功能
fn complex_algorithm() -> f64 {
    todo!("这个算法还没实现")
    // todo! 会 panic 并打印提示信息
}
```

### 8.2.3 panic 的配置

```toml
# Cargo.toml
[profile.release]
panic = "abort"  # release 模式下 panic 直接终止，不展开调用栈
                 # 这可以减小二进制文件大小
```

```rust
// 捕获 panic（不推荐常规使用，但测试中有用）
use std::panic;

fn main() {
    let result = panic::catch_unwind(|| {
        panic!("啊！");
    });

    match result {
        Ok(_) => println!("没有 panic"),
        Err(_) => println!("捕获到了 panic"),
    }

    println!("程序继续执行");
}
```

---

## 8.3 Result&lt;T, E&gt; —— 可恢复错误

`Result` 是 Rust 错误处理的核心。它是一个枚举：

```rust
// 标准库中的定义（简化版）
enum Result<T, E> {
    Ok(T),    // 成功，包含结果值
    Err(E),   // 失败，包含错误信息
}
```

> 💡 **对比 JS Promise**：
> - `Ok(value)` ≈ `Promise.resolve(value)`
> - `Err(error)` ≈ `Promise.reject(error)`
> - 但 `Result` 是同步的，不需要 `await`

### 8.3.1 基本用法

```rust
use std::fs;
use std::num::ParseIntError;

fn main() {
    // 读取文件返回 Result
    let content: Result<String, std::io::Error> = fs::read_to_string("hello.txt");

    match content {
        Ok(text) => println!("文件内容: {}", text),
        Err(error) => println!("读取失败: {}", error),
    }

    // 解析数字返回 Result
    let number: Result<i32, ParseIntError> = "42".parse();

    match number {
        Ok(n) => println!("解析成功: {}", n),
        Err(e) => println!("解析失败: {}", e),
    }

    // 解析失败的例子
    let bad_number: Result<i32, ParseIntError> = "abc".parse();

    match bad_number {
        Ok(n) => println!("解析成功: {}", n),
        Err(e) => println!("解析失败: {}", e),
        // 输出: 解析失败: invalid digit found in string
    }
}
```

### 8.3.2 Result 的常用方法

```rust
fn main() {
    // ======== unwrap 系列 ========

    // unwrap: 成功返回值，失败 panic
    let value: i32 = "42".parse().unwrap();
    println!("unwrap: {}", value);

    // expect: 同 unwrap，但可以自定义 panic 消息
    let value: i32 = "42".parse().expect("应该是一个有效数字");
    println!("expect: {}", value);

    // unwrap_or: 失败时返回默认值
    let value: i32 = "abc".parse().unwrap_or(0);
    println!("unwrap_or: {}", value);  // 0

    // unwrap_or_else: 失败时调用闭包
    let value: i32 = "abc".parse().unwrap_or_else(|e| {
        println!("解析失败: {}，使用默认值", e);
        -1
    });
    println!("unwrap_or_else: {}", value);  // -1

    // unwrap_or_default: 失败时返回类型的默认值
    let value: i32 = "abc".parse().unwrap_or_default();
    println!("unwrap_or_default: {}", value);  // 0（i32 的默认值）

    // ======== 检查状态 ========

    let ok_result: Result<i32, String> = Ok(42);
    let err_result: Result<i32, String> = Err("错误".to_string());

    println!("is_ok: {}", ok_result.is_ok());     // true
    println!("is_err: {}", err_result.is_err());   // true

    // ======== 转换 ========

    // map: 转换成功值
    let doubled: Result<i32, String> = ok_result.map(|x| x * 2);
    println!("map: {:?}", doubled);  // Ok(84)

    // map_err: 转换错误值
    let mapped_err: Result<i32, String> = err_result.map_err(|e| format!("包装: {}", e));
    println!("map_err: {:?}", mapped_err);  // Err("包装: 错误")

    // and_then: 链式操作（类似 JS 的 .then()）
    let chained: Result<i32, String> = "42"
        .parse::<i32>()
        .map_err(|e| e.to_string())
        .and_then(|n| {
            if n > 0 {
                Ok(n * 2)
            } else {
                Err("必须是正数".to_string())
            }
        });
    println!("and_then: {:?}", chained);  // Ok(84)

    // ======== 转换为 Option ========

    let ok_option: Option<i32> = Ok(42).ok();       // Some(42)
    let err_option: Option<i32> = Err("x").ok();     // None
    println!("ok(): {:?}, {:?}", ok_option, err_option);

    let ok_err_option: Option<String> = Ok::<i32, String>(42).err();  // None
    let err_err_option: Option<String> = Err("x".to_string()).err();  // Some("x")
    println!("err(): {:?}, {:?}", ok_err_option, err_err_option);
}
```

> 💡 **对比 JS Promise 链**：
> ```javascript
> // JavaScript
> fetch(url)
>   .then(res =&gt; res.json())           // 类似 and_then
>   .then(data =&gt; data.value * 2)      // 类似 map
>   .catch(err =&gt; console.error(err)); // 类似 unwrap_or_else
>
> // Rust
> fetch(url)
>   .and_then(|res| res.json())
>   .map(|data| data.value * 2)
>   .unwrap_or_else(|err| {
>       eprintln!("{}", err);
>       Default::default()
>   });
> ```

### 8.3.3 自己写返回 Result 的函数

```rust
use std::fs;
use std::io;

// 明确标注可能的错误类型
fn read_username_from_file() -> Result<String, io::Error> {
    let content = fs::read_to_string("username.txt");

    match content {
        Ok(name) => {
            // 去除首尾空白
            let trimmed = name.trim().to_string();
            if trimmed.is_empty() {
                // 创建一个自定义的 io::Error
                Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "用户名为空",
                ))
            } else {
                Ok(trimmed)
            }
        }
        Err(e) => Err(e),  // 直接传播错误
    }
}

// 多种可能的错误
fn parse_config(path: &str) -> Result<(String, u16), String> {
    // 读取文件
    let content = fs::read_to_string(path)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    // 解析内容（假设格式是 "host:port"）
    let parts: Vec<&str> = content.trim().split(':').collect();

    match parts.as_slice() {
        [host, port_str] => {
            let port: u16 = port_str
                .parse()
                .map_err(|e| format!("端口号无效: {}", e))?;
            Ok((host.to_string(), port))
        }
        _ => Err("配置格式错误，应为 host:port".to_string()),
    }
}

fn main() {
    match read_username_from_file() {
        Ok(name) => println!("用户名: {}", name),
        Err(e) => println!("错误: {}", e),
    }

    match parse_config("server.conf") {
        Ok((host, port)) => println!("服务器: {}:{}", host, port),
        Err(e) => println!("配置错误: {}", e),
    }
}
```

---

## 8.4 ? 运算符 —— 语法糖的美妙

上面的 `read_username_from_file` 函数有很多 `match` 样板代码。`?` 运算符让这一切变得优雅：

### 8.4.1 基本用法

```rust
use std::fs;
use std::io;

// 使用 ? 运算符简化
fn read_username_from_file() -> Result<String, io::Error> {
    let content = fs::read_to_string("username.txt")?;
    // ^ 如果 Err，立即返回 Err
    // 如果 Ok，解包并继续

    Ok(content.trim().to_string())
}

// 甚至可以链式调用
fn read_username_short() -> Result<String, io::Error> {
    Ok(fs::read_to_string("username.txt")?.trim().to_string())
}

fn main() {
    match read_username_from_file() {
        Ok(name) => println!("用户名: {}", name),
        Err(e) => println!("错误: {}", e),
    }
}
```

### 8.4.2 ? 的工作原理

`?` 运算符的工作原理大致等价于：

```rust
// 这个：
let value = some_function()?;

// 等价于这个：
let value = match some_function() {
    Ok(v) => v,
    Err(e) => return Err(e.into()),  // 注意 .into()！自动类型转换
};
```

注意 `.into()` 调用 —— 这意味着 `?` 可以自动转换错误类型！

### 8.4.3 链式使用 ?

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_and_parse() -> Result<i32, io::Error> {
    let mut file = File::open("number.txt")?;     // 可能的错误：文件不存在
    let mut content = String::new();
    file.read_to_string(&mut content)?;            // 可能的错误：读取失败
    let number: i32 = content.trim().parse()
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
        // 可能的错误：解析失败（需要转换错误类型）
    Ok(number)
}

// 更简洁的写法
fn read_and_parse_v2() -> Result<i32, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string("number.txt")?;
    let number: i32 = content.trim().parse()?;
    Ok(number)
}
```

### 8.4.4 ? 用于 Option

`?` 也可以用于 `Option`：

```rust
fn first_even(numbers: &[i32]) -> Option<i32> {
    // find 返回 Option<&i32>
    let first = numbers.iter().find(|&&n| n % 2 == 0)?;
    // 如果 None，直接返回 None
    Some(*first * 2)
}

fn get_nested_value(data: &Option<Vec<Option<i32>>>) -> Option<i32> {
    // 多层 Option 解包
    let vec = data.as_ref()?;        // 外层 Option
    let first = vec.first()?;        // Vec 可能为空
    let value = first.as_ref()?;     // 内层 Option
    Some(*value)
}

fn main() {
    let nums = vec![1, 3, 4, 5, 6];
    println!("第一个偶数的两倍: {:?}", first_even(&nums));  // Some(8)

    let empty: Vec<i32> = vec![];
    println!("空数组: {:?}", first_even(&empty));  // None

    let data = Some(vec![Some(42), None]);
    println!("嵌套值: {:?}", get_nested_value(&data));  // Some(42)
}
```

### 8.4.5 ? 在 main 函数中使用

```rust
// main 也可以返回 Result！
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string("config.txt")?;
    let port: u16 = content.trim().parse()?;
    println!("端口: {}", port);
    Ok(())
}
// 如果返回 Err，程序会打印错误信息并以非零状态码退出
```

---

## 8.5 自定义错误类型

在实际项目中，你通常需要定义自己的错误类型来统一处理各种错误。

### 8.5.1 简单的错误枚举

```rust
use std::fmt;
use std::num::ParseIntError;
use std::io;

// 定义应用程序的错误类型
#[derive(Debug)]
enum AppError {
    IoError(io::Error),
    ParseError(ParseIntError),
    ValidationError(String),
    NotFound(String),
}

// 实现 Display trait（用于 println! 等）
impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::IoError(e) => write!(f, "IO 错误: {}", e),
            AppError::ParseError(e) => write!(f, "解析错误: {}", e),
            AppError::ValidationError(msg) => write!(f, "验证错误: {}", msg),
            AppError::NotFound(item) => write!(f, "未找到: {}", item),
        }
    }
}

// 实现 std::error::Error trait
impl std::error::Error for AppError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            AppError::IoError(e) => Some(e),
            AppError::ParseError(e) => Some(e),
            _ => None,
        }
    }
}

// 实现 From trait，让 ? 运算符自动转换
impl From<io::Error> for AppError {
    fn from(error: io::Error) -> Self {
        AppError::IoError(error)
    }
}

impl From<ParseIntError> for AppError {
    fn from(error: ParseIntError) -> Self {
        AppError::ParseError(error)
    }
}

// 现在可以在函数中优雅地使用 ?
fn load_config(path: &str) -> Result<u16, AppError> {
    let content = std::fs::read_to_string(path)?;  // io::Error -> AppError
    let port: u16 = content.trim().parse()?;        // ParseIntError -> AppError

    if port < 1024 {
        return Err(AppError::ValidationError(
            format!("端口 {} 太小，需要 >= 1024", port),
        ));
    }

    Ok(port)
}

fn main() {
    match load_config("port.txt") {
        Ok(port) => println!("端口: {}", port),
        Err(e) => {
            eprintln!("错误: {}", e);

            // 可以检查具体的错误类型
            match e {
                AppError::IoError(_) => eprintln!("提示: 请检查文件是否存在"),
                AppError::ParseError(_) => eprintln!("提示: 文件内容应为数字"),
                AppError::ValidationError(_) => eprintln!("提示: 请使用 1024 以上的端口"),
                AppError::NotFound(_) => eprintln!("提示: 资源不存在"),
            }
        }
    }
}
```

> 💡 **对比 JS**：在 JavaScript 中，你可能会这样做：
> ```javascript
> class AppError extends Error {
>     constructor(type, message, cause) {
>         super(message);
>         this.type = type;
>         this.cause = cause;
>     }
> }
> ```
> Rust 的方式更严格：每种错误类型都有明确的定义，编译器确保你处理了所有情况。

### 8.5.2 错误类型太多了？手动实现好累！

你注意到了吗？自定义错误类型需要实现：
- `Debug` trait
- `Display` trait
- `std::error::Error` trait
- 每种底层错误的 `From` trait

这确实很繁琐。这就是为什么社区开发了 `thiserror` 和 `anyhow`。

---

## 8.6 thiserror —— 优雅地定义错误类型

`thiserror` 是一个过程宏（proc macro），自动生成上面那些样板代码。

```toml
# Cargo.toml
[dependencies]
thiserror = "1"
```

```rust
use thiserror::Error;

// 看看这多简洁！
#[derive(Debug, Error)]
enum AppError {
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
    // ^^ #[from] 自动实现 From<io::Error>

    #[error("解析错误: {0}")]
    Parse(#[from] std::num::ParseIntError),

    #[error("验证错误: {message}")]
    Validation { message: String },

    #[error("未找到: {0}")]
    NotFound(String),

    #[error("未授权访问 {resource}")]
    Unauthorized {
        resource: String,
        #[source]  // 标记为错误链的 source
        cause: std::io::Error,
    },
}

// 使用起来一模一样
fn load_config(path: &str) -> Result<u16, AppError> {
    let content = std::fs::read_to_string(path)?;  // 自动转换
    let port: u16 = content.trim().parse()?;        // 自动转换

    if port < 1024 {
        return Err(AppError::Validation {
            message: format!("端口 {} 太小", port),
        });
    }

    Ok(port)
}
```

### thiserror 的格式化语法

```rust
use thiserror::Error;

#[derive(Debug, Error)]
enum MyError {
    // {0} 引用第一个字段（元组变体）
    #[error("文件不存在: {0}")]
    FileNotFound(String),

    // 命名字段直接用字段名
    #[error("HTTP 错误 {code}: {message}")]
    Http { code: u16, message: String },

    // 使用 Display trait 的格式化
    #[error("内部错误: {source}")]
    Internal {
        #[source]
        source: std::io::Error,
    },

    // 透明错误（直接代理内部错误的 Display 和 source）
    #[error(transparent)]
    Other(#[from] Box<dyn std::error::Error + Send + Sync>),
}
```

---

## 8.7 anyhow —— 快速原型和应用层错误处理

如果 `thiserror` 适合**库**（library），那么 `anyhow` 适合**应用**（application）。

`anyhow` 提供了一个通用的 `anyhow::Error` 类型，可以包装任何实现了 `std::error::Error` 的类型。

```toml
# Cargo.toml
[dependencies]
anyhow = "1"
```

```rust
use anyhow::{Context, Result, bail, ensure};

// Result 是 anyhow::Result 的简写，等价于 Result<T, anyhow::Error>
fn load_config(path: &str) -> Result<u16> {
    let content = std::fs::read_to_string(path)
        .context(format!("读取配置文件 {} 失败", path))?;
    //  ^^^^^^^ context() 给错误添加上下文信息

    let port: u16 = content.trim().parse()
        .context("解析端口号失败")?;

    // ensure! 宏：条件不满足时返回错误
    ensure!(port >= 1024, "端口 {} 太小，需要 >= 1024", port);

    // bail! 宏：直接返回错误
    if port > 65535 {
        bail!("端口 {} 超出范围", port);
    }

    Ok(port)
}

fn main() -> Result<()> {
    let port = load_config("server.conf")
        .context("加载服务器配置失败")?;

    println!("服务器端口: {}", port);
    Ok(())
}

// 错误输出示例：
// Error: 加载服务器配置失败
//
// Caused by:
//     0: 读取配置文件 server.conf 失败
//     1: No such file or directory (os error 2)
```

### 8.7.1 anyhow vs thiserror：何时用哪个？

| 场景 | 推荐 | 原因 |
|---|---|---|
| **写库（library）** | `thiserror` | 库的使用者需要知道具体的错误类型，以便做出不同的处理 |
| **写应用（application）** | `anyhow` | 应用通常只需要打印错误信息，不需要对错误类型做精确匹配 |
| **写二进制程序的 main** | `anyhow` | main 函数通常只需要报告错误 |
| **内部模块** | `thiserror` | 模块之间可能需要精确的错误类型 |
| **快速原型** | `anyhow` | 开发速度最快 |

### 8.7.2 anyhow 的进阶用法

```rust
use anyhow::{Context, Result, anyhow};

// 使用 anyhow! 创建临时错误
fn validate_email(email: &str) -> Result<()> {
    if !email.contains('@') {
        return Err(anyhow!("无效的邮箱地址: {}", email));
    }
    Ok(())
}

// downcast：从 anyhow::Error 中恢复原始错误类型
fn handle_error(err: anyhow::Error) {
    // 尝试获取具体的错误类型
    if let Some(io_err) = err.downcast_ref::<std::io::Error>() {
        match io_err.kind() {
            std::io::ErrorKind::NotFound => {
                println!("文件不存在，创建默认配置...");
            }
            std::io::ErrorKind::PermissionDenied => {
                println!("权限不足！");
            }
            _ => {
                println!("IO 错误: {}", io_err);
            }
        }
    } else {
        println!("其他错误: {}", err);
    }
}

// 错误链遍历
fn print_error_chain(err: &anyhow::Error) {
    println!("错误: {}", err);
    let mut source = err.source();
    let mut i = 0;
    while let Some(cause) = source {
        i += 1;
        println!("  原因 {}: {}", i, cause);
        source = cause.source();
    }
}
```

---

## 8.8 错误处理模式大全

### 8.8.1 提前返回模式（Early Return）

```rust
use anyhow::{Result, Context, bail};

fn process_user_input(input: &str) -> Result<String> {
    // 一系列验证，任何一步失败都提前返回
    if input.is_empty() {
        bail!("输入不能为空");
    }

    let trimmed = input.trim();
    if trimmed.len() < 3 {
        bail!("输入太短，至少需要 3 个字符");
    }

    if trimmed.len() > 100 {
        bail!("输入太长，最多 100 个字符");
    }

    // 全部验证通过
    Ok(trimmed.to_uppercase())
}
```

### 8.8.2 转换错误类型

```rust
use std::num::ParseIntError;

// 方式一：map_err
fn parse_port(s: &str) -> Result<u16, String> {
    s.parse::<u16>()
        .map_err(|e| format!("端口号 '{}' 无效: {}", s, e))
}

// 方式二：自定义 From
#[derive(Debug)]
enum ConfigError {
    Parse(ParseIntError),
    Invalid(String),
}

impl From<ParseIntError> for ConfigError {
    fn from(e: ParseIntError) -> Self {
        ConfigError::Parse(e)
    }
}

fn parse_port_v2(s: &str) -> Result<u16, ConfigError> {
    let port: u16 = s.parse()?;  // ParseIntError 自动转换为 ConfigError
    if port < 1024 {
        return Err(ConfigError::Invalid(format!("端口 {} 太小", port)));
    }
    Ok(port)
}
```

### 8.8.3 收集多个 Result

```rust
fn main() {
    let strings = vec!["1", "2", "three", "4", "five"];

    // 方式一：收集所有成功的结果（忽略错误）
    let numbers: Vec<i32> = strings
        .iter()
        .filter_map(|s| s.parse().ok())  // ok() 将 Result 转为 Option
        .collect();
    println!("成功解析的: {:?}", numbers);  // [1, 2, 4]

    // 方式二：如果任何一个失败，整体失败
    let result: Result<Vec<i32>, _> = strings
        .iter()
        .map(|s| s.parse::<i32>())
        .collect();  // Result<Vec<i32>, ParseIntError>
    println!("全部解析: {:?}", result);  // Err(...)

    // 方式三：分离成功和失败
    let (successes, failures): (Vec<_>, Vec<_>) = strings
        .iter()
        .map(|s| s.parse::<i32>())
        .partition(Result::is_ok);

    let successes: Vec<i32> = successes.into_iter().map(Result::unwrap).collect();
    let failures: Vec<String> = failures
        .into_iter()
        .map(|r| r.unwrap_err().to_string())
        .collect();

    println!("成功: {:?}", successes);  // [1, 2, 4]
    println!("失败: {:?}", failures);   // ["invalid digit...", "invalid digit..."]
}
```

### 8.8.4 Option 与 Result 的相互转换

```rust
fn main() {
    // Option -> Result
    let opt: Option<i32> = Some(42);
    let result: Result<i32, &str> = opt.ok_or("值为空");
    println!("ok_or: {:?}", result);  // Ok(42)

    let none: Option<i32> = None;
    let result: Result<i32, String> = none.ok_or_else(|| "生成错误".to_string());
    println!("ok_or_else: {:?}", result);  // Err("生成错误")

    // Result -> Option
    let ok: Result<i32, &str> = Ok(42);
    let opt: Option<i32> = ok.ok();
    println!("ok(): {:?}", opt);  // Some(42)

    let err: Result<i32, &str> = Err("错误");
    let opt: Option<i32> = err.ok();
    println!("ok(): {:?}", opt);  // None

    // transpose: Option<Result<T, E>> <-> Result<Option<T>, E>
    let opt_result: Option<Result<i32, &str>> = Some(Ok(42));
    let result_opt: Result<Option<i32>, &str> = opt_result.transpose();
    println!("transpose: {:?}", result_opt);  // Ok(Some(42))
}
```

---

## 8.9 何时 panic，何时 Result？

这是每个 Rust 新手都会问的问题。以下是决策指南：

### 使用 `panic!` / `unwrap` / `expect` 的场景

```rust
// 1. 示例代码和快速原型
fn prototype() {
    let data = std::fs::read_to_string("data.json").unwrap();
    // 原型阶段，快速推进
}

// 2. 测试代码
#[cfg(test)]
mod tests {
    #[test]
    fn test_parsing() {
        let result: i32 = "42".parse().unwrap();
        assert_eq!(result, 42);
        // 测试中用 unwrap 很正常，失败了测试就该 panic
    }
}

// 3. 你比编译器更清楚不会失败
fn parse_known_value() {
    // 你100%确定这不会失败
    let home = std::env::var("HOME").expect("HOME 环境变量应该存在");
    let _: i32 = "42".parse().expect("42 一定能解析为 i32");
}

// 4. 程序无法继续的致命错误
fn init() {
    let config = load_critical_config()
        .expect("无法加载关键配置，程序无法启动");
}

// 5. 不变量被违反（表示有 bug）
fn process(data: &[u8]) {
    assert!(!data.is_empty(), "数据不能为空");
    debug_assert!(data.len() < 1024, "数据太大");  // 只在 debug 模式检查
}
```

### 使用 `Result` 的场景

```rust
// 1. 文件操作（文件可能不存在、没有权限等）
fn read_config() -> Result<Config, ConfigError> { ... }

// 2. 网络操作（网络可能中断、超时等）
fn fetch_data(url: &str) -> Result<Response, NetworkError> { ... }

// 3. 用户输入解析（用户可能输入任何东西）
fn parse_age(input: &str) -> Result<u8, ParseError> { ... }

// 4. 数据库操作
fn find_user(id: u64) -> Result<Option<User>, DbError> { ... }

// 5. 任何调用者可能想要处理的错误
fn divide(a: f64, b: f64) -> Result<f64, MathError> { ... }
```

### 决策流程图

```
这个错误是 bug（不应该发生）吗？
├── 是 → panic! / assert! / unreachable!
└── 否 → 这个错误调用者可以处理吗？
    ├── 是 → Result<T, E>
    └── 否 → 这是程序启动阶段吗？
        ├── 是 → expect("有意义的错误信息")
        └── 否 → Result<T, E>（让调用者决定）
```

---

## 8.10 实战：构建一个 CSV 解析器

让我们用本章学到的知识构建一个带完整错误处理的 CSV 解析器：

```rust
use std::fmt;
use std::fs;
use std::num::{ParseFloatError, ParseIntError};

// ===== 错误定义 =====

#[derive(Debug)]
enum CsvError {
    Io(std::io::Error),
    EmptyFile,
    MissingHeader,
    ColumnMismatch {
        line: usize,
        expected: usize,
        found: usize,
    },
    ParseInt {
        line: usize,
        column: String,
        source: ParseIntError,
    },
    ParseFloat {
        line: usize,
        column: String,
        source: ParseFloatError,
    },
}

impl fmt::Display for CsvError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CsvError::Io(e) => write!(f, "IO 错误: {}", e),
            CsvError::EmptyFile => write!(f, "CSV 文件为空"),
            CsvError::MissingHeader => write!(f, "缺少表头行"),
            CsvError::ColumnMismatch { line, expected, found } => {
                write!(
                    f,
                    "第 {} 行列数不匹配: 期望 {} 列，实际 {} 列",
                    line, expected, found
                )
            }
            CsvError::ParseInt { line, column, source } => {
                write!(
                    f,
                    "第 {} 行 '{}' 列整数解析失败: {}",
                    line, column, source
                )
            }
            CsvError::ParseFloat { line, column, source } => {
                write!(
                    f,
                    "第 {} 行 '{}' 列浮点数解析失败: {}",
                    line, column, source
                )
            }
        }
    }
}

impl std::error::Error for CsvError {}

impl From<std::io::Error> for CsvError {
    fn from(e: std::io::Error) -> Self {
        CsvError::Io(e)
    }
}

// ===== 数据结构 =====

#[derive(Debug)]
struct Employee {
    name: String,
    age: u32,
    salary: f64,
    department: String,
}

// ===== 解析逻辑 =====

fn parse_csv(path: &str) -> Result<Vec<Employee>, CsvError> {
    let content = fs::read_to_string(path)?;

    let lines: Vec<&str> = content.lines().collect();

    if lines.is_empty() {
        return Err(CsvError::EmptyFile);
    }

    // 解析表头
    let headers: Vec<&str> = lines[0].split(',').map(str::trim).collect();
    let expected_columns = headers.len();

    if expected_columns < 4 {
        return Err(CsvError::MissingHeader);
    }

    // 解析数据行
    let mut employees = Vec::new();

    for (i, line) in lines[1..].iter().enumerate() {
        let line_num = i + 2;  // 从第2行开始计数（第1行是表头）

        // 跳过空行
        if line.trim().is_empty() {
            continue;
        }

        let fields: Vec<&str> = line.split(',').map(str::trim).collect();

        // 检查列数
        if fields.len() != expected_columns {
            return Err(CsvError::ColumnMismatch {
                line: line_num,
                expected: expected_columns,
                found: fields.len(),
            });
        }

        // 解析各字段
        let name = fields[0].to_string();

        let age: u32 = fields[1].parse().map_err(|e| CsvError::ParseInt {
            line: line_num,
            column: headers[1].to_string(),
            source: e,
        })?;

        let salary: f64 = fields[2].parse().map_err(|e| CsvError::ParseFloat {
            line: line_num,
            column: headers[2].to_string(),
            source: e,
        })?;

        let department = fields[3].to_string();

        employees.push(Employee {
            name,
            age,
            salary,
            department,
        });
    }

    Ok(employees)
}

// ===== 统计功能 =====

fn department_stats(employees: &[Employee]) -> Vec<(String, f64, usize)> {
    use std::collections::HashMap;

    let mut dept_data: HashMap<&str, (f64, usize)> = HashMap::new();

    for emp in employees {
        let entry = dept_data.entry(&emp.department).or_insert((0.0, 0));
        entry.0 += emp.salary;
        entry.1 += 1;
    }

    let mut stats: Vec<(String, f64, usize)> = dept_data
        .into_iter()
        .map(|(dept, (total, count))| {
            (dept.to_string(), total / count as f64, count)
        })
        .collect();

    stats.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    stats
}

fn main() {
    // 创建测试 CSV 文件
    let csv_content = "name, age, salary, department
Alice, 30, 85000.50, Engineering
Bob, 25, 72000.00, Marketing
Charlie, 35, 95000.75, Engineering
Diana, 28, 68000.00, Marketing
Eve, 32, 110000.00, Engineering";

    // 写入临时文件
    fs::write("/tmp/employees.csv", csv_content).expect("写入文件失败");

    // 解析 CSV
    match parse_csv("/tmp/employees.csv") {
        Ok(employees) => {
            println!("✅ 成功解析 {} 条记录：", employees.len());
            for emp in &employees {
                println!(
                    "  {} ({}岁) - {} 部门, 薪资 ${:.2}",
                    emp.name, emp.age, emp.department, emp.salary
                );
            }

            println!("\n📊 部门统计：");
            for (dept, avg_salary, count) in department_stats(&employees) {
                println!(
                    "  {} 部门: {} 人, 平均薪资 ${:.2}",
                    dept, count, avg_salary
                );
            }
        }
        Err(e) => {
            eprintln!("❌ 解析失败: {}", e);

            // 针对不同错误给出不同建议
            match &e {
                CsvError::Io(_) => eprintln!("💡 请检查文件路径是否正确"),
                CsvError::EmptyFile => eprintln!("💡 CSV 文件不能为空"),
                CsvError::MissingHeader => {
                    eprintln!("💡 CSV 文件需要包含: name, age, salary, department")
                }
                CsvError::ColumnMismatch { .. } => {
                    eprintln!("💡 请检查是否有缺失的逗号或多余的逗号")
                }
                CsvError::ParseInt { .. } | CsvError::ParseFloat { .. } => {
                    eprintln!("💡 请检查数字格式是否正确")
                }
            }
        }
    }

    // 测试错误情况
    println!("\n--- 测试错误处理 ---");

    // 文件不存在
    match parse_csv("/tmp/nonexistent.csv") {
        Err(e) => println!("预期错误: {}", e),
        Ok(_) => println!("不应该成功"),
    }

    // 格式错误的 CSV
    fs::write("/tmp/bad.csv", "name,age,salary,dept\nAlice,abc,50000,Eng")
        .expect("写入文件失败");
    match parse_csv("/tmp/bad.csv") {
        Err(e) => println!("预期错误: {}", e),
        Ok(_) => println!("不应该成功"),
    }
}
```

---

## 8.11 错误处理速查表

| 操作 | 方法 | 说明 |
|---|---|---|
| 成功时 panic | `unwrap()` | 只在确定不会失败时使用 |
| 带消息的 panic | `expect("消息")` | 比 unwrap 好，至少知道出了什么问题 |
| 默认值 | `unwrap_or(default)` | 失败时返回固定默认值 |
| 懒默认值 | `unwrap_or_else(\|e\| ...)` | 失败时计算默认值 |
| 类型默认值 | `unwrap_or_default()` | 使用 Default trait |
| 传播错误 | `?` | 最常用，自动转换错误类型 |
| 转换成功值 | `map(\|v\| ...)` | 不影响 Err |
| 转换错误值 | `map_err(\|e\| ...)` | 不影响 Ok |
| 链式操作 | `and_then(\|v\| ...)` | 类似 JS 的 .then() |
| 添加上下文 | `.context("消息")` | anyhow 提供 |
| 忽略错误 | `.ok()` | Result -&gt; Option |
| Option 转 Result | `.ok_or("错误")` | Option -&gt; Result |

---

## 8.12 练习题

### 练习 1：安全的除法计算器

```rust
#[derive(Debug)]
enum MathError {
    DivisionByZero,
    Overflow,
    InvalidInput(String),
}

/// 实现一个安全的计算器，支持 +, -, *, /
/// 输入格式: "10 + 5" 或 "100 / 0"
fn calculate(input: &str) -> Result<f64, MathError> {
    // 解析输入字符串
    // 执行计算
    // 处理除以零、溢出等错误
    todo!()
}
```

### 练习 2：文件搜索工具

```rust
use std::path::Path;

/// 在指定目录中递归搜索包含关键字的文件
/// 返回所有匹配的文件路径和匹配行
fn search_files(
    dir: &Path,
    keyword: &str,
) -> Result<Vec<(String, usize, String)>, Box<dyn std::error::Error>> {
    // (文件路径, 行号, 匹配的行内容)
    // 处理各种错误：目录不存在、文件读取失败、权限不足等
    todo!()
}
```

### 练习 3：配置文件解析器

```rust
use std::collections::HashMap;

#[derive(Debug)]
struct Config {
    host: String,
    port: u16,
    debug: bool,
    max_connections: u32,
    extra: HashMap<String, String>,
}

/// 解析 INI 风格的配置文件
/// 格式:
/// host = localhost
/// port = 8080
/// debug = true
/// max_connections = 100
fn parse_config(content: &str) -> Result<Config, ConfigError> {
    // 处理：
    // - 缺失必要字段
    // - 值格式不正确
    // - 重复的键
    // - 空行和注释（# 开头）
    todo!()
}
```

### 练习 4：重试机制

```rust
/// 带重试的操作执行器
/// 如果操作失败，最多重试 max_retries 次
/// 每次重试之间等待 delay_ms 毫秒
fn retry<F, T, E>(
    max_retries: u32,
    delay_ms: u64,
    operation: F,
) -> Result<T, Vec<E>>
where
    F: Fn() -> Result<T, E>,
    E: std::fmt::Display,
{
    // 实现重试逻辑
    // 收集所有失败的错误
    // 如果最终成功，返回成功值
    // 如果全部失败，返回所有错误
    todo!()
}
```

---

## 8.13 本章小结

Rust 的错误处理模型与 JavaScript 截然不同：

| 概念 | JavaScript | Rust |
|---|---|---|
| 可恢复错误 | `try-catch` | `Result&lt;T, E&gt;` |
| 不可恢复错误 | `throw` (可 catch) | `panic!` (通常不 catch) |
| 错误传播 | 自动沿调用栈传播 | 显式使用 `?` |
| 异步错误 | `.catch()` / `try-catch` + `await` | `Result` + `?` (一致) |
| 错误类型 | 任意值 (通常 Error 对象) | 强类型 |
| 空值处理 | `null` / `undefined` | `Option&lt;T&gt;` |
| 强制处理 | ❌ | ✅ 编译器警告未使用的 Result |

**核心理念**：

1. **错误是值，不是异常** —— 让函数签名告诉你一切
2. **编译器是你的盟友** —— 它不让你忽略潜在的错误
3. **`?` 让代码保持整洁** —— 不需要到处写 match
4. **thiserror 用于库，anyhow 用于应用** —— 选对工具事半功倍

> 📖 **下一章预告**：第九章我们将深入 Rust 的集合类型。`Vec`、`String`、`HashMap` —— 这些是你日常编程中最常用的数据结构。你会发现，Rust 对 String 和 UTF-8 的处理方式会让你重新思考"字符串"这个看似简单的概念。
