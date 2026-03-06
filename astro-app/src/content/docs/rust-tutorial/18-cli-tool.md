# 第十八章：实战 —— 构建 CLI 工具

> **本章目标**
>
> - 使用 Cargo 初始化一个 CLI 项目
> - 掌握 `clap` 库进行命令行参数解析（对比 Node.js 的 commander.js）
> - 熟练使用 `std::fs` 进行文件读写操作
> - 使用 `regex` crate 进行正则表达式匹配
> - 用 `colored` crate 实现彩色终端输出
> - 用 `anyhow` 优雅地处理各种错误
> - 从零构建一个完整的 minigrep 项目（类似 grep 的文本搜索工具）
> - 编写单元测试和集成测试
> - 将项目发布为可执行二进制文件

> **预计学习时间：120 - 150 分钟**

---

## 18.1 项目初始化

### 18.1.1 创建项目

```bash
# 创建一个新的二进制项目
cargo new minigrep
cd minigrep

# 项目结构
# minigrep/
# ├── Cargo.toml      # 项目配置和依赖
# ├── src/
# │   └── main.rs     # 入口文件
# └── tests/          # 集成测试目录（稍后创建）
```

### 18.1.2 添加依赖

```toml
# Cargo.toml
[package]
name = "minigrep"
version = "0.1.0"
edition = "2021"
description = "一个简单的文本搜索工具，类似 grep"
authors = ["你的名字"]
license = "MIT"

# 二进制入口（默认就是 src/main.rs，可以不写）
[[bin]]
name = "minigrep"
path = "src/main.rs"

[dependencies]
clap = { version = "4", features = ["derive"] }   # 命令行参数解析
regex = "1"                                         # 正则表达式
colored = "2"                                       # 彩色输出
anyhow = "1"                                        # 错误处理

[dev-dependencies]
assert_cmd = "2"        # 测试命令行程序
predicates = "3"        # 测试断言
tempfile = "3"          # 临时文件（用于测试）
```

对比 JavaScript 项目：

```
Rust (Cargo.toml)              │  JavaScript (package.json)
───────────────────────────────┼──────────────────────────────
[package]                      │  {
name = "minigrep"              │    "name": "minigrep",
version = "0.1.0"             │    "version": "0.1.0",
                               │    "bin": "index.js",
[dependencies]                 │    "dependencies": {
clap = "4"                     │      "commander": "^11.0",
regex = "1"                    │      "chalk": "^5.0"
colored = "2"                  │    },
                               │    "devDependencies": {
[dev-dependencies]             │      "jest": "^29.0"
assert_cmd = "2"               │    }
                               │  }
```

### 18.1.3 Cargo.toml 详解

```toml
# Cargo.toml 是 Rust 项目的核心配置文件，类似 package.json

[package]
name = "minigrep"           # 包名（发布到 crates.io 时的名称）
version = "0.1.0"           # 语义化版本号
edition = "2021"            # Rust 版本（2015/2018/2021），影响语言特性
description = "一个文本搜索工具"
authors = ["DongDong <dong@example.com>"]
license = "MIT"
repository = "https://github.com/yourname/minigrep"
keywords = ["grep", "search", "cli"]  # 最多 5 个关键词
categories = ["command-line-utilities"] # crates.io 分类

[dependencies]
# 依赖声明方式
clap = "4"                             # 简写：最新 4.x.x
clap = "=4.5.1"                        # 精确版本
clap = { version = "4", features = ["derive"] }  # 启用特性
# my_lib = { path = "../my_lib" }      # 本地路径依赖
# my_lib = { git = "https://..." }     # Git 依赖

# 版本号语法（类似 npm 的 ^）
# "1.2.3"   → >=1.2.3, <2.0.0  （默认行为，类似 npm 的 ^1.2.3）
# "=1.2.3"  → 精确 1.2.3
# ">=1.2.0" → 大于等于 1.2.0
# "1.2.*"   → 1.2.x 的任何版本
```

---

## 18.2 Clap：命令行参数解析

### 18.2.1 对比 JavaScript 的 Commander.js

```javascript
// JavaScript - 使用 commander.js
import { program } from 'commander';

program
  .name('minigrep')
  .description('一个文本搜索工具')
  .version('0.1.0')
  .argument('<pattern>', '搜索模式')
  .argument('<file>', '要搜索的文件')
  .option('-i, --ignore-case', '忽略大小写')
  .option('-n, --line-number', '显示行号')
  .option('-c, --count', '只显示匹配行数')
  .action((pattern, file, options) => {
    console.log(`搜索 "${pattern}" in ${file}`);
  });

program.parse();
```

```rust
// Rust - 使用 clap（derive 模式）
// clap 的 derive 模式利用 Rust 的 derive 宏，直接从结构体定义生成参数解析器
// 这比 JavaScript 的链式调用更简洁、更类型安全！

use clap::Parser;

/// minigrep - 一个简单的文本搜索工具
#[derive(Parser, Debug)]
#[command(name = "minigrep")]
#[command(version = "0.1.0")]
#[command(about = "一个简单的文本搜索工具，类似 grep")]
struct Args {
    /// 要搜索的模式（支持正则表达式）
    pattern: String,

    /// 要搜索的文件路径
    file: String,

    /// 忽略大小写
    #[arg(short = 'i', long = "ignore-case")]
    ignore_case: bool,

    /// 显示行号
    #[arg(short = 'n', long = "line-number")]
    line_number: bool,

    /// 只显示匹配的行数
    #[arg(short = 'c', long = "count")]
    count: bool,

    /// 使用正则表达式模式
    #[arg(short = 'r', long = "regex")]
    use_regex: bool,

    /// 反向匹配（显示不匹配的行）
    #[arg(short = 'v', long = "invert-match")]
    invert: bool,

    /// 搜索后显示的上下文行数
    #[arg(short = 'C', long = "context", default_value = "0")]
    context: usize,
}

fn main() {
    let args = Args::parse();
    println!("{:?}", args);
    // 就这么简单！clap 自动：
    // 1. 解析命令行参数
    // 2. 验证必填参数
    // 3. 生成帮助信息（--help）
    // 4. 生成版本信息（--version）
    // 5. 处理错误（参数不对时自动显示用法说明）
}
```

### 18.2.2 运行测试

```bash
# 查看帮助
$ cargo run -- --help
minigrep - 一个简单的文本搜索工具，类似 grep

Usage: minigrep [OPTIONS] <PATTERN> <FILE>

Arguments:
  <PATTERN>  要搜索的模式（支持正则表达式）
  <FILE>     要搜索的文件路径

Options:
  -i, --ignore-case         忽略大小写
  -n, --line-number         显示行号
  -c, --count               只显示匹配的行数
  -r, --regex               使用正则表达式模式
  -v, --invert-match        反向匹配（显示不匹配的行）
  -C, --context <CONTEXT>   搜索后显示的上下文行数 [default: 0]
  -h, --help                Print help
  -V, --version             Print version

# 缺少参数时自动报错
$ cargo run
error: the following required arguments were not provided:
  <PATTERN>
  <FILE>

Usage: minigrep <PATTERN> <FILE>
```

### 18.2.3 Clap 的更多功能

```rust
use clap::{Parser, Subcommand, ValueEnum};

// === 子命令（类似 git add / git commit） ===
#[derive(Parser, Debug)]
#[command(name = "mytool")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// 搜索文件内容
    Search {
        /// 搜索模式
        pattern: String,
        /// 文件路径
        file: String,
    },
    /// 统计文件信息
    Stats {
        /// 文件路径
        file: String,
        /// 输出格式
        #[arg(long, value_enum, default_value = "text")]
        format: OutputFormat,
    },
}

// === 枚举参数 ===
#[derive(Debug, Clone, ValueEnum)]
enum OutputFormat {
    Text,
    Json,
    Csv,
}

// 使用方式：
// mytool search "pattern" file.txt
// mytool stats file.txt --format json

// === 环境变量作为默认值 ===
#[derive(Parser, Debug)]
struct EnvArgs {
    /// 搜索模式
    pattern: String,
    /// 文件路径
    file: String,
    /// 忽略大小写（也可以通过环境变量 IGNORE_CASE=1 设置）
    #[arg(short, long, env = "IGNORE_CASE")]
    ignore_case: bool,
}
```

---

## 18.3 文件读写：`std::fs`

### 18.3.1 对比 JavaScript 的 fs 模块

```javascript
// JavaScript (Node.js)
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';

// 同步读取
const content = fs.readFileSync('file.txt', 'utf-8');

// 异步读取
const content2 = await readFile('file.txt', 'utf-8');

// 写入文件
fs.writeFileSync('output.txt', 'Hello, World!');
await writeFile('output.txt', 'Hello, World!');
```

```rust
use std::fs;
use std::io::{self, BufRead, Write, BufWriter};
use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // === 读取整个文件为字符串 ===
    let content = fs::read_to_string("file.txt")?;
    println!("文件内容：{}", content);

    // === 读取文件为字节 ===
    let bytes = fs::read("image.png")?;
    println!("文件大小：{} 字节", bytes.len());

    // === 写入文件（覆盖） ===
    fs::write("output.txt", "你好，世界！")?;

    // === 追加写入 ===
    use std::fs::OpenOptions;
    let mut file = OpenOptions::new()
        .append(true)
        .create(true)  // 如果文件不存在则创建
        .open("log.txt")?;
    writeln!(file, "新的一行日志")?;

    // === 逐行读取（适合大文件） ===
    let file = fs::File::open("large_file.txt")?;
    let reader = io::BufReader::new(file);
    for (index, line) in reader.lines().enumerate() {
        let line = line?;  // 每行可能有 IO 错误
        println!("第 {} 行：{}", index + 1, line);
    }

    // === 带缓冲的写入（适合大量写操作） ===
    let file = fs::File::create("big_output.txt")?;
    let mut writer = BufWriter::new(file);
    for i in 0..10000 {
        writeln!(writer, "第 {} 行", i)?;
    }
    writer.flush()?;  // 确保所有数据写入磁盘

    Ok(())
}
```

### 18.3.2 路径操作

```rust
use std::path::{Path, PathBuf};

fn main() {
    // === 创建路径 ===
    let path = Path::new("/home/user/documents/file.txt");

    // 获取各部分
    println!("文件名：{:?}", path.file_name());      // Some("file.txt")
    println!("扩展名：{:?}", path.extension());       // Some("txt")
    println!("父目录：{:?}", path.parent());           // Some("/home/user/documents")
    println!("文件干名：{:?}", path.file_stem());      // Some("file")

    // === 路径拼接 ===
    let mut path = PathBuf::from("/home/user");
    path.push("documents");
    path.push("file.txt");
    println!("{}", path.display());  // /home/user/documents/file.txt

    // 也可以用 join
    let path = Path::new("/home/user").join("documents").join("file.txt");
    println!("{}", path.display());

    // === 检查路径 ===
    println!("存在？{}", path.exists());
    println!("是文件？{}", path.is_file());
    println!("是目录？{}", path.is_dir());
    println!("是绝对路径？{}", path.is_absolute());

    // 对比 JavaScript (Node.js path 模块)：
    // path.basename('/home/user/file.txt')     → 'file.txt'
    // path.extname('/home/user/file.txt')      → '.txt'
    // path.dirname('/home/user/file.txt')      → '/home/user'
    // path.join('/home', 'user', 'file.txt')   → '/home/user/file.txt'
}
```

### 18.3.3 目录操作

```rust
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // === 创建目录 ===
    fs::create_dir("new_folder")?;            // 单层目录
    fs::create_dir_all("a/b/c/d")?;           // 递归创建（类似 mkdir -p）

    // === 列出目录内容 ===
    for entry in fs::read_dir(".")? {
        let entry = entry?;
        let path = entry.path();
        let file_type = if path.is_dir() { "📁" } else { "📄" };
        println!("{} {}", file_type, path.display());
    }

    // === 递归遍历目录 ===
    fn walk_dir(dir: &std::path::Path, depth: usize) -> std::io::Result<()> {
        let indent = "  ".repeat(depth);
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                println!("{}📁 {}/", indent, path.file_name().unwrap().to_string_lossy());
                walk_dir(&path, depth + 1)?;
            } else {
                println!("{}📄 {}", indent, path.file_name().unwrap().to_string_lossy());
            }
        }
        Ok(())
    }
    walk_dir(std::path::Path::new("."), 0)?;

    // === 复制、移动、删除 ===
    fs::copy("source.txt", "destination.txt")?;    // 复制文件
    fs::rename("old_name.txt", "new_name.txt")?;   // 移动/重命名
    fs::remove_file("unwanted.txt")?;               // 删除文件
    fs::remove_dir("empty_folder")?;                // 删除空目录
    fs::remove_dir_all("folder_with_contents")?;    // 递归删除

    // === 文件元数据 ===
    let metadata = fs::metadata("file.txt")?;
    println!("大小：{} 字节", metadata.len());
    println!("是否只读：{}", metadata.permissions().readonly());
    println!("修改时间：{:?}", metadata.modified()?);

    Ok(())
}
```

---

## 18.4 正则表达式：`regex` crate

### 18.4.1 基本用法

```rust
use regex::Regex;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // === 创建正则表达式 ===
    let re = Regex::new(r"hello\s+(\w+)")?;
    // r"..." 是原始字符串，不需要转义反斜杠
    // 对比 JavaScript：/hello\s+(\w+)/

    // === 检查是否匹配 ===
    let text = "hello world";
    println!("匹配？{}", re.is_match(text));  // true

    // 对比 JavaScript：
    // /hello\s+(\w+)/.test("hello world")  // true

    // === 查找第一个匹配 ===
    if let Some(caps) = re.captures(text) {
        println!("完整匹配：{}", &caps[0]);        // "hello world"
        println!("捕获组 1：{}", &caps[1]);         // "world"
    }

    // 对比 JavaScript：
    // const match = "hello world".match(/hello\s+(\w+)/);
    // match[0]  // "hello world"
    // match[1]  // "world"

    // === 查找所有匹配 ===
    let text = "hello alice, hello bob, hello charlie";
    for caps in re.captures_iter(text) {
        println!("找到：{}", &caps[1]);
    }
    // 输出：
    // 找到：alice
    // 找到：bob
    // 找到：charlie

    // 对比 JavaScript：
    // const matches = [...text.matchAll(/hello\s+(\w+)/g)];

    // === 替换 ===
    let result = re.replace_all(text, "hi $1");
    println!("{}", result);  // "hi alice, hi bob, hi charlie"

    // 对比 JavaScript：
    // text.replace(/hello\s+(\w+)/g, "hi $1")

    Ok(())
}
```

### 18.4.2 常用正则模式

```rust
use regex::Regex;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // === 邮箱匹配 ===
    let email_re = Regex::new(r"[\w.+-]+@[\w-]+\.[\w.]+$")?;
    println!("{}", email_re.is_match("user@example.com"));  // true

    // === IP 地址匹配 ===
    let ip_re = Regex::new(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b")?;
    let text = "服务器地址是 192.168.1.100，端口 8080";
    if let Some(m) = ip_re.find(text) {
        println!("找到 IP：{}", m.as_str());  // 192.168.1.100
    }

    // === 不区分大小写 ===
    let re = Regex::new(r"(?i)hello")?;  // (?i) 标志
    println!("{}", re.is_match("HELLO"));  // true
    println!("{}", re.is_match("Hello"));  // true

    // 对比 JavaScript：/hello/i

    // === 多行模式 ===
    let re = Regex::new(r"(?m)^\d+")?;  // (?m) 多行模式，^ 匹配每行开头
    let text = "123 abc\n456 def\n789 ghi";
    let numbers: Vec<&str> = re.find_iter(text).map(|m| m.as_str()).collect();
    println!("{:?}", numbers);  // ["123", "456", "789"]

    // === 命名捕获组 ===
    let re = Regex::new(r"(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})")?;
    if let Some(caps) = re.captures("今天是 2024-01-15") {
        println!("年：{}", &caps["year"]);    // 2024
        println!("月：{}", &caps["month"]);   // 01
        println!("日：{}", &caps["day"]);     // 15
    }

    // 对比 JavaScript：
    // /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/
    // match.groups.year

    Ok(())
}
```

### 18.4.3 性能优化：编译一次，使用多次

```rust
use regex::Regex;
use std::sync::LazyLock;

// 在全局作用域预编译正则（避免每次调用都重新编译）
// LazyLock 在第一次访问时初始化，之后复用
static EMAIL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[\w.+-]+@[\w-]+\.[\w.]+").unwrap()
});

static URL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"https?://[\w\-._~:/?#\[\]@!$&'()*+,;=]+").unwrap()
});

fn validate_email(email: &str) -> bool {
    EMAIL_RE.is_match(email)
}

fn extract_urls(text: &str) -> Vec<&str> {
    URL_RE.find_iter(text).map(|m| m.as_str()).collect()
}

fn main() {
    println!("{}", validate_email("user@example.com"));  // true
    println!("{}", validate_email("not-an-email"));       // false

    let text = "访问 https://rust-lang.org 和 https://crates.io 获取更多信息";
    let urls = extract_urls(text);
    println!("{:?}", urls);
    // ["https://rust-lang.org", "https://crates.io"]
}
```

---

## 18.5 彩色输出：`colored` crate

### 18.5.1 基本用法

```rust
use colored::*;

fn main() {
    // === 前景色 ===
    println!("{}", "红色文字".red());
    println!("{}", "绿色文字".green());
    println!("{}", "蓝色文字".blue());
    println!("{}", "黄色文字".yellow());
    println!("{}", "紫色文字".purple());
    println!("{}", "青色文字".cyan());
    println!("{}", "白色文字".white());

    // === 背景色 ===
    println!("{}", "红色背景".on_red());
    println!("{}", "绿色背景的白色文字".white().on_green());

    // === 样式 ===
    println!("{}", "粗体".bold());
    println!("{}", "斜体".italic());
    println!("{}", "下划线".underline());
    println!("{}", "删除线".strikethrough());
    println!("{}", "暗淡".dimmed());

    // === 组合样式 ===
    println!("{}", "粗体红色带下划线".red().bold().underline());
    println!("{}", "错误信息".white().on_red().bold());
    println!("{}", "成功信息".green().bold());
    println!("{}", "警告信息".yellow().bold());

    // 对比 JavaScript (chalk)：
    // import chalk from 'chalk';
    // console.log(chalk.red('红色文字'));
    // console.log(chalk.bold.red.underline('粗体红色带下划线'));
    // Rust 的 colored 用法几乎一样直观！
}
```

### 18.5.2 实际应用：格式化搜索结果

```rust
use colored::*;

/// 高亮显示搜索结果中的匹配部分
fn highlight_match(line: &str, pattern: &str) -> String {
    // 简单版本：直接替换
    line.replace(pattern, &pattern.red().bold().to_string())
}

/// 格式化输出搜索结果
fn print_result(filename: &str, line_number: usize, line: &str, pattern: &str) {
    let highlighted = highlight_match(line, pattern);
    println!(
        "{}:{}:{}",
        filename.purple(),
        line_number.to_string().green(),
        highlighted
    );
}

fn main() {
    // 模拟搜索结果
    print_result("src/main.rs", 42, "fn main() {", "main");
    print_result("src/main.rs", 55, "    println!(\"Hello from main\");", "main");
    print_result("src/lib.rs", 10, "pub fn main_logic() {", "main");

    // 输出效果（终端中会有颜色）：
    // src/main.rs:42:fn main() {
    // src/main.rs:55:    println!("Hello from main");
    // src/lib.rs:10:pub fn main_logic() {
    // 其中文件名是紫色，行号是绿色，"main" 是红色粗体
}
```

---

## 18.6 错误处理实战：`anyhow`

### 18.6.1 为什么需要 anyhow？

```rust
// 不用 anyhow 时，处理多种错误类型很痛苦：

use std::fs;
use std::num::ParseIntError;

// 你需要定义自己的错误类型
#[derive(Debug)]
enum MyError {
    IoError(std::io::Error),
    ParseError(ParseIntError),
    RegexError(regex::Error),
    CustomError(String),
}

// 然后为每种错误实现 From
impl From<std::io::Error> for MyError {
    fn from(e: std::io::Error) -> Self {
        MyError::IoError(e)
    }
}

impl From<ParseIntError> for MyError {
    fn from(e: ParseIntError) -> Self {
        MyError::ParseError(e)
    }
}
// ... 每种错误都要写一遍，太繁琐了！

// 使用 anyhow 后：
use anyhow::{Result, Context, bail, anyhow};

fn read_config() -> Result<Config> {
    // ? 操作符可以自动转换任何实现了 std::error::Error 的类型
    let content = fs::read_to_string("config.toml")
        .context("无法读取配置文件")?;  // 添加上下文信息

    let port: u16 = content.trim().parse()
        .context("配置文件中的端口号格式错误")?;

    if port == 0 {
        bail!("端口号不能为 0");  // 快速返回错误
    }

    Ok(Config { port })
}

struct Config {
    port: u16,
}
```

### 18.6.2 anyhow 的核心功能

```rust
use anyhow::{Result, Context, bail, anyhow, ensure};

// === Result 类型别名 ===
// anyhow::Result<T> 等价于 Result<T, anyhow::Error>
// anyhow::Error 可以包装任何 std::error::Error

fn process_file(path: &str) -> Result<Vec<String>> {
    // === context() —— 添加错误上下文 ===
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("读取文件 '{}' 失败", path))?;
    // 错误信息：读取文件 'config.txt' 失败
    //           Caused by: No such file or directory (os error 2)

    // === bail! —— 快速返回错误 ===
    if content.is_empty() {
        bail!("文件 '{}' 是空的", path);
    }

    // === ensure! —— 断言式检查 ===
    ensure!(content.len() < 1_000_000, "文件太大：{} 字节", content.len());

    // === anyhow! —— 创建错误值 ===
    let lines: Vec<String> = content.lines().map(String::from).collect();
    if lines.is_empty() {
        return Err(anyhow!("文件没有有效行"));
    }

    Ok(lines)
}

fn main() {
    match process_file("test.txt") {
        Ok(lines) => {
            println!("读取了 {} 行", lines.len());
        }
        Err(e) => {
            // 打印完整的错误链
            eprintln!("错误：{}", e);
            // 打印每一层的错误原因
            for cause in e.chain() {
                eprintln!("  原因：{}", cause);
            }
        }
    }
}
```

### 18.6.3 对比 JavaScript 的错误处理

```
JavaScript                          │  Rust (anyhow)
────────────────────────────────────┼───────────────────────────────
try {                               │  fn do_stuff() -> Result<()> {
  const data = fs.readFileSync(f);  │      let data = fs::read(f)
  const parsed = JSON.parse(data);  │          .context("读取失败")?;
  // ...                            │      let parsed = parse(data)
} catch (e) {                       │          .context("解析失败")?;
  console.error(e.message);         │      Ok(())
  console.error(e.stack);           │  }
}                                   │
                                    │  // 调用处
                                    │  match do_stuff() {
                                    │      Ok(()) => println!("成功"),
                                    │      Err(e) => eprintln!("{:#}", e),
                                    │  }
```

---

## 18.7 完整 minigrep 项目

现在，让我们把所有知识组合起来，构建完整的 minigrep！

### 18.7.1 项目结构

```
minigrep/
├── Cargo.toml
├── src/
│   ├── main.rs        # 入口：解析参数，调用库函数
│   ├── lib.rs         # 核心逻辑
│   ├── search.rs      # 搜索引擎
│   └── output.rs      # 输出格式化
└── tests/
    └── integration.rs # 集成测试
```

### 18.7.2 `src/main.rs` —— 程序入口

```rust
// src/main.rs
// 程序入口：解析参数并调用核心逻辑

use anyhow::Result;
use clap::Parser;

mod search;
mod output;

/// minigrep - 一个简单但功能完整的文本搜索工具
#[derive(Parser, Debug)]
#[command(name = "minigrep", version, about)]
pub struct Args {
    /// 要搜索的模式
    pub pattern: String,

    /// 要搜索的文件路径（可以指定多个）
    pub files: Vec<String>,

    /// 忽略大小写
    #[arg(short = 'i', long)]
    pub ignore_case: bool,

    /// 显示行号
    #[arg(short = 'n', long = "line-number")]
    pub line_number: bool,

    /// 只显示匹配的行数
    #[arg(short = 'c', long)]
    pub count: bool,

    /// 使用正则表达式
    #[arg(short = 'r', long)]
    pub regex: bool,

    /// 反向匹配
    #[arg(short = 'v', long = "invert-match")]
    pub invert: bool,

    /// 上下文行数
    #[arg(short = 'C', long = "context", default_value = "0")]
    pub context: usize,

    /// 禁用彩色输出
    #[arg(long = "no-color")]
    pub no_color: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();

    // 如果没有指定文件，提示用法
    if args.files.is_empty() {
        eprintln!("错误：请指定至少一个文件");
        std::process::exit(1);
    }

    // 禁用彩色输出
    if args.no_color {
        colored::control::set_override(false);
    }

    // 构建搜索配置
    let config = search::SearchConfig {
        pattern: args.pattern.clone(),
        ignore_case: args.ignore_case,
        use_regex: args.regex,
        invert: args.invert,
        context: args.context,
    };

    // 创建搜索引擎
    let engine = search::SearchEngine::new(&config)?;

    let mut total_matches = 0;
    let multiple_files = args.files.len() > 1;

    // 搜索每个文件
    for file_path in &args.files {
        match engine.search_file(file_path) {
            Ok(results) => {
                if args.count {
                    // 只显示计数
                    if multiple_files {
                        println!("{}:{}", file_path, results.len());
                    } else {
                        println!("{}", results.len());
                    }
                } else {
                    // 显示匹配的行
                    let filename = if multiple_files { Some(file_path.as_str()) } else { None };
                    output::print_results(&results, filename, args.line_number);
                }
                total_matches += results.len();
            }
            Err(e) => {
                eprintln!("minigrep: {}: {}", file_path, e);
            }
        }
    }

    // 如果没有任何匹配，返回退出码 1（与 grep 行为一致）
    if total_matches == 0 {
        std::process::exit(1);
    }

    Ok(())
}
```

### 18.7.3 `src/search.rs` —— 搜索引擎

```rust
// src/search.rs
// 核心搜索逻辑

use anyhow::{Result, Context};
use regex::Regex;
use std::fs;

/// 搜索配置
pub struct SearchConfig {
    pub pattern: String,
    pub ignore_case: bool,
    pub use_regex: bool,
    pub invert: bool,
    pub context: usize,
}

/// 匹配结果
#[derive(Debug, Clone)]
pub struct MatchResult {
    /// 行号（从 1 开始）
    pub line_number: usize,
    /// 行内容
    pub line: String,
    /// 匹配的范围（起始位置, 结束位置）
    pub matches: Vec<(usize, usize)>,
    /// 是否是上下文行（不是直接匹配的行）
    pub is_context: bool,
}

/// 搜索引擎
pub struct SearchEngine {
    regex: Regex,
    invert: bool,
    context: usize,
}

impl SearchEngine {
    /// 创建新的搜索引擎
    pub fn new(config: &SearchConfig) -> Result<Self> {
        let pattern = if config.use_regex {
            config.pattern.clone()
        } else {
            // 如果不是正则模式，转义特殊字符
            regex::escape(&config.pattern)
        };

        // 构建正则表达式
        let pattern = if config.ignore_case {
            format!("(?i){}", pattern)
        } else {
            pattern
        };

        let regex = Regex::new(&pattern)
            .with_context(|| format!("无效的搜索模式：'{}'", config.pattern))?;

        Ok(SearchEngine {
            regex,
            invert: config.invert,
            context: config.context,
        })
    }

    /// 搜索文件
    pub fn search_file(&self, path: &str) -> Result<Vec<MatchResult>> {
        let content = fs::read_to_string(path)
            .with_context(|| format!("无法读取文件：'{}'", path))?;

        Ok(self.search(&content))
    }

    /// 搜索文本内容
    pub fn search(&self, content: &str) -> Vec<MatchResult> {
        let lines: Vec<&str> = content.lines().collect();
        let mut results = Vec::new();
        let mut matched_lines: Vec<bool> = vec![false; lines.len()];

        // 第一遍：找出所有匹配的行
        for (i, line) in lines.iter().enumerate() {
            let is_match = self.regex.is_match(line);
            let should_include = if self.invert { !is_match } else { is_match };

            if should_include {
                matched_lines[i] = true;
            }
        }

        // 第二遍：添加上下文行
        let mut context_lines: Vec<bool> = vec![false; lines.len()];
        if self.context > 0 {
            for (i, &matched) in matched_lines.iter().enumerate() {
                if matched {
                    let start = i.saturating_sub(self.context);
                    let end = (i + self.context + 1).min(lines.len());
                    for j in start..end {
                        if !matched_lines[j] {
                            context_lines[j] = true;
                        }
                    }
                }
            }
        }

        // 第三遍：构建结果
        for (i, line) in lines.iter().enumerate() {
            if matched_lines[i] {
                let matches = if !self.invert {
                    self.regex
                        .find_iter(line)
                        .map(|m| (m.start(), m.end()))
                        .collect()
                } else {
                    vec![]
                };

                results.push(MatchResult {
                    line_number: i + 1,
                    line: line.to_string(),
                    matches,
                    is_context: false,
                });
            } else if context_lines[i] {
                results.push(MatchResult {
                    line_number: i + 1,
                    line: line.to_string(),
                    matches: vec![],
                    is_context: true,
                });
            }
        }

        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_engine(pattern: &str, ignore_case: bool, invert: bool) -> SearchEngine {
        let config = SearchConfig {
            pattern: pattern.to_string(),
            ignore_case,
            use_regex: false,
            invert,
            context: 0,
        };
        SearchEngine::new(&config).unwrap()
    }

    #[test]
    fn test_basic_search() {
        let engine = make_engine("hello", false, false);
        let results = engine.search("hello world\ngoodbye world\nhello rust");
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].line, "hello world");
        assert_eq!(results[1].line, "hello rust");
    }

    #[test]
    fn test_case_insensitive() {
        let engine = make_engine("hello", true, false);
        let results = engine.search("Hello World\nHELLO RUST\ngoodbye");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_invert_match() {
        let engine = make_engine("hello", false, true);
        let results = engine.search("hello world\ngoodbye world\nhello rust");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].line, "goodbye world");
    }

    #[test]
    fn test_no_match() {
        let engine = make_engine("xyz", false, false);
        let results = engine.search("hello world\ngoodbye world");
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_line_numbers() {
        let engine = make_engine("world", false, false);
        let results = engine.search("hello\nworld\nfoo\nworld");
        assert_eq!(results[0].line_number, 2);
        assert_eq!(results[1].line_number, 4);
    }

    #[test]
    fn test_match_positions() {
        let engine = make_engine("world", false, false);
        let results = engine.search("hello world");
        assert_eq!(results[0].matches, vec![(6, 11)]);
    }

    #[test]
    fn test_context_lines() {
        let config = SearchConfig {
            pattern: "target".to_string(),
            ignore_case: false,
            use_regex: false,
            invert: false,
            context: 1,
        };
        let engine = SearchEngine::new(&config).unwrap();
        let results = engine.search("line 1\nline 2\ntarget line\nline 4\nline 5");
        // 应该有 3 行：line 2（上下文）、target line（匹配）、line 4（上下文）
        assert_eq!(results.len(), 3);
        assert!(results[0].is_context);
        assert!(!results[1].is_context);
        assert!(results[2].is_context);
    }

    #[test]
    fn test_regex_search() {
        let config = SearchConfig {
            pattern: r"\d+".to_string(),
            ignore_case: false,
            use_regex: true,
            invert: false,
            context: 0,
        };
        let engine = SearchEngine::new(&config).unwrap();
        let results = engine.search("hello\n123 world\nfoo 456");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_empty_content() {
        let engine = make_engine("hello", false, false);
        let results = engine.search("");
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_special_regex_chars_escaped() {
        // 非正则模式下，特殊字符应该被转义
        let engine = make_engine("hello.world", false, false);
        let results = engine.search("hello.world\nhelloXworld");
        assert_eq!(results.len(), 1);  // 只匹配 "hello.world"，不匹配 "helloXworld"
    }
}
```

### 18.7.4 `src/output.rs` —— 输出格式化

```rust
// src/output.rs
// 输出格式化与彩色高亮

use colored::*;
use crate::search::MatchResult;

/// 打印搜索结果
pub fn print_results(results: &[MatchResult], filename: Option<&str>, show_line_numbers: bool) {
    let mut prev_line_number = 0;

    for result in results {
        // 如果行号不连续，打印分隔符
        if prev_line_number > 0 && result.line_number > prev_line_number + 1 {
            println!("{}", "--".dimmed());
        }
        prev_line_number = result.line_number;

        // 构建输出行
        let mut parts: Vec<String> = Vec::new();

        // 文件名（紫色）
        if let Some(name) = filename {
            parts.push(format!("{}", name.purple()));
        }

        // 行号（绿色）
        if show_line_numbers {
            let separator = if result.is_context { "-" } else { ":" };
            parts.push(format!(
                "{}{}",
                result.line_number.to_string().green(),
                separator.dimmed()
            ));
        }

        // 行内容（高亮匹配部分）
        if result.is_context {
            parts.push(result.line.dimmed().to_string());
        } else {
            parts.push(highlight_line(&result.line, &result.matches));
        }

        // 用分隔符连接并输出
        if filename.is_some() && show_line_numbers {
            let name = filename.unwrap();
            let sep = if result.is_context { "-" } else { ":" };
            print!("{}{}", name.purple(), sep.dimmed());
            print!("{}{}", result.line_number.to_string().green(), sep.dimmed());
            if result.is_context {
                println!("{}", result.line.dimmed());
            } else {
                println!("{}", highlight_line(&result.line, &result.matches));
            }
        } else if filename.is_some() {
            let name = filename.unwrap();
            let sep = if result.is_context { "-" } else { ":" };
            print!("{}{}", name.purple(), sep.dimmed());
            if result.is_context {
                println!("{}", result.line.dimmed());
            } else {
                println!("{}", highlight_line(&result.line, &result.matches));
            }
        } else if show_line_numbers {
            let sep = if result.is_context { "-" } else { ":" };
            print!("{}{}", result.line_number.to_string().green(), sep.dimmed());
            if result.is_context {
                println!("{}", result.line.dimmed());
            } else {
                println!("{}", highlight_line(&result.line, &result.matches));
            }
        } else if result.is_context {
            println!("{}", result.line.dimmed());
        } else {
            println!("{}", highlight_line(&result.line, &result.matches));
        }
    }
}

/// 高亮行中的匹配部分
fn highlight_line(line: &str, matches: &[(usize, usize)]) -> String {
    if matches.is_empty() {
        return line.to_string();
    }

    let mut result = String::new();
    let mut last_end = 0;

    for &(start, end) in matches {
        // 添加匹配前的普通文本
        if start > last_end {
            result.push_str(&line[last_end..start]);
        }
        // 添加高亮的匹配文本
        result.push_str(&line[start..end].red().bold().to_string());
        last_end = end;
    }

    // 添加最后一个匹配后的文本
    if last_end < line.len() {
        result.push_str(&line[last_end..]);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_highlight_no_matches() {
        let result = highlight_line("hello world", &[]);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_highlight_single_match() {
        // 注意：彩色输出包含 ANSI 转义序列，所以不能简单比较字符串
        let result = highlight_line("hello world", &[(6, 11)]);
        assert!(result.contains("world"));
        assert_ne!(result, "hello world");  // 应该包含颜色代码
    }
}
```

### 18.7.5 `src/lib.rs` —— 库入口

```rust
// src/lib.rs
// 将模块导出，方便集成测试使用

pub mod search;
pub mod output;
```

---

## 18.8 测试

### 18.8.1 单元测试（已包含在各模块中）

```bash
# 运行所有测试
cargo test

# 运行特定模块的测试
cargo test search::tests

# 运行特定测试
cargo test test_basic_search

# 显示 println! 输出
cargo test -- --nocapture

# 只运行名字包含 "case" 的测试
cargo test case
```

### 18.8.2 集成测试

```rust
// tests/integration.rs
// 集成测试：测试整个程序的行为

use assert_cmd::Command;
use predicates::prelude::*;
use std::fs;
use tempfile::TempDir;

/// 创建临时测试文件
fn setup_test_file(content: &str) -> (TempDir, String) {
    let dir = TempDir::new().unwrap();
    let file_path = dir.path().join("test.txt");
    fs::write(&file_path, content).unwrap();
    (dir, file_path.to_string_lossy().to_string())
}

#[test]
fn test_basic_search() {
    let (_dir, path) = setup_test_file("hello world\ngoodbye world\nhello rust");

    Command::cargo_bin("minigrep")
        .unwrap()
        .args(&["hello", &path])
        .assert()
        .success()
        .stdout(predicate::str::contains("hello world"))
        .stdout(predicate::str::contains("hello rust"));
}

#[test]
fn test_no_match_exits_with_1() {
    let (_dir, path) = setup_test_file("hello world");

    Command::cargo_bin("minigrep")
        .unwrap()
        .args(&["xyz", &path])
        .assert()
        .code(1);
}

#[test]
fn test_case_insensitive() {
    let (_dir, path) = setup_test_file("Hello World\nhello rust\nGoodbye");

    Command::cargo_bin("minigrep")
        .unwrap()
        .args(&["-i", "hello", &path])
        .assert()
        .success()
        .stdout(predicate::str::contains("Hello World"))
        .stdout(predicate::str::contains("hello rust"));
}

#[test]
fn test_count_mode() {
    let (_dir, path) = setup_test_file("hello a\nhello b\nhello c\ngoodbye");

    Command::cargo_bin("minigrep")
        .unwrap()
        .args(&["-c", "hello", &path])
        .assert()
        .success()
        .stdout(predicate::str::contains("3"));
}

#[test]
fn test_line_numbers() {
    let (_dir, path) = setup_test_file("aaa\nbbb\nccc\nbbb\neee");

    Command::cargo_bin("minigrep")
        .unwrap()
        .args(&["-n", "bbb", &path, "--no-color"])
        .assert()
        .success()
        .stdout(predicate::str::contains("2"))
        .stdout(predicate::str::contains("4"));
}

#[test]
fn test_invert_match() {
    let (_dir, path) = setup_test_file("hello\nworld\nhello");

    Command::cargo_bin("minigrep")
        .unwrap()
        .args(&["-v", "hello", &path])
        .assert()
        .success()
        .stdout(predicate::str::contains("world"));
}

#[test]
fn test_file_not_found() {
    Command::cargo_bin("minigrep")
        .unwrap()
        .args(&["hello", "/nonexistent/file.txt"])
        .assert()
        .failure()
        .stderr(predicate::str::contains("无法读取文件"));
}

#[test]
fn test_no_args_shows_error() {
    Command::cargo_bin("minigrep")
        .unwrap()
        .assert()
        .failure();
}

#[test]
fn test_help_flag() {
    Command::cargo_bin("minigrep")
        .unwrap()
        .arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("minigrep"));
}

#[test]
fn test_regex_mode() {
    let (_dir, path) = setup_test_file("foo123\nbar456\nbaz");

    Command::cargo_bin("minigrep")
        .unwrap()
        .args(&["-r", r"\d+", &path])
        .assert()
        .success()
        .stdout(predicate::str::contains("foo123"))
        .stdout(predicate::str::contains("bar456"));
}

#[test]
fn test_multiple_files() {
    let dir = TempDir::new().unwrap();
    let file1 = dir.path().join("a.txt");
    let file2 = dir.path().join("b.txt");
    fs::write(&file1, "hello from a").unwrap();
    fs::write(&file2, "hello from b").unwrap();

    Command::cargo_bin("minigrep")
        .unwrap()
        .args(&[
            "hello",
            &file1.to_string_lossy(),
            &file2.to_string_lossy(),
        ])
        .assert()
        .success()
        .stdout(predicate::str::contains("hello from a"))
        .stdout(predicate::str::contains("hello from b"));
}
```

### 18.8.3 对比 JavaScript 的测试

```
Rust 测试                              │  JavaScript 测试 (Jest)
───────────────────────────────────────┼────────────────────────────────
#[test]                                │  test('描述', () => {
fn test_name() {                       │    expect(result).toBe(42);
    assert_eq!(result, 42);            │  });
}                                      │
                                       │
#[test]                                │  test('async', async () => {
#[should_panic]                        │    await expect(fn).rejects
fn test_panic() {                      │      .toThrow('error');
    panic!("error");                   │  });
}                                      │
                                       │
cargo test                             │  npx jest
cargo test -- --nocapture              │  npx jest --verbose
cargo test test_name                   │  npx jest -t 'test_name'
```

---

## 18.9 发布为二进制

### 18.9.1 构建 Release 版本

```bash
# Debug 构建（默认，编译快但运行慢）
cargo build
# 输出：target/debug/minigrep

# Release 构建（编译慢但运行快，有优化）
cargo build --release
# 输出：target/release/minigrep

# 查看二进制大小
ls -lh target/release/minigrep
# 通常只有几 MB！

# 进一步减小体积
# 在 Cargo.toml 中添加：
# [profile.release]
# opt-level = "z"     # 优化体积而不是速度
# lto = true          # 链接时优化
# strip = true        # 移除调试符号
# codegen-units = 1   # 单代码生成单元（编译慢但优化好）
# panic = "abort"     # panic 时直接中止（减少二进制大小）
```

### 18.9.2 安装到系统

```bash
# 安装到 ~/.cargo/bin/（如果在 PATH 中就可以全局使用）
cargo install --path .

# 现在可以直接使用
minigrep "hello" file.txt

# 卸载
cargo uninstall minigrep
```

### 18.9.3 交叉编译

```bash
# 安装目标平台的工具链
rustup target add x86_64-unknown-linux-musl    # Linux 静态链接
rustup target add x86_64-apple-darwin           # macOS
rustup target add x86_64-pc-windows-msvc        # Windows

# 交叉编译
cargo build --release --target x86_64-unknown-linux-musl
# 输出：target/x86_64-unknown-linux-musl/release/minigrep

# 静态链接的二进制可以在任何 Linux 上运行，不需要安装依赖！

# 对比 JavaScript：
# JavaScript 需要 Node.js 运行时（~100MB）
# 或者用 pkg/nexe 打包（~50MB 以上）
# Rust 的二进制：几 MB，零依赖！
```

### 18.9.4 发布到 crates.io

```bash
# 1. 注册账号：https://crates.io/

# 2. 登录
cargo login <your-api-token>

# 3. 检查包是否可以发布
cargo publish --dry-run

# 4. 发布！
cargo publish

# 别人安装你的工具：
# cargo install minigrep

# 对比 npm：
# npm login
# npm publish
# npm install -g minigrep
```

---

## 18.10 完整的 Cargo.toml（最终版）

```toml
[package]
name = "minigrep"
version = "0.1.0"
edition = "2021"
description = "一个简单但功能完整的文本搜索工具，类似 grep"
authors = ["Your Name <you@example.com>"]
license = "MIT"
repository = "https://github.com/yourname/minigrep"
keywords = ["grep", "search", "cli", "text"]
categories = ["command-line-utilities"]

[[bin]]
name = "minigrep"
path = "src/main.rs"

[dependencies]
clap = { version = "4", features = ["derive"] }
regex = "1"
colored = "2"
anyhow = "1"

[dev-dependencies]
assert_cmd = "2"
predicates = "3"
tempfile = "3"

[profile.release]
opt-level = "z"
lto = true
strip = true
codegen-units = 1
panic = "abort"
```

---

## 18.11 本章总结

```
┌──────────────────────────────────────────────────────────────────┐
│                  CLI 工具开发全流程                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 项目初始化                                                    │
│     cargo new minigrep                                           │
│     编辑 Cargo.toml 添加依赖                                      │
│                                                                  │
│  2. 参数解析 (clap)                                               │
│     #[derive(Parser)] 自动生成解析器                               │
│     类型安全、自动生成帮助信息                                      │
│                                                                  │
│  3. 核心逻辑                                                      │
│     文件读写 (std::fs)                                            │
│     正则表达式 (regex)                                            │
│     彩色输出 (colored)                                            │
│                                                                  │
│  4. 错误处理 (anyhow)                                            │
│     Result + ? + context()                                       │
│     用户友好的错误信息                                             │
│                                                                  │
│  5. 测试                                                         │
│     单元测试：#[test]                                             │
│     集成测试：assert_cmd + predicates                             │
│                                                                  │
│  6. 发布                                                         │
│     cargo build --release                                        │
│     cargo install --path .                                       │
│     cargo publish                                                │
│                                                                  │
│  对比 JavaScript：                                                │
│  ┌──────────────┬───────────────────┬─────────────────────┐      │
│  │ 功能          │ Rust              │ JavaScript          │      │
│  ├──────────────┼───────────────────┼─────────────────────┤      │
│  │ 参数解析      │ clap              │ commander.js        │      │
│  │ 彩色输出      │ colored           │ chalk               │      │
│  │ 正则表达式    │ regex             │ 内置 RegExp         │      │
│  │ 错误处理      │ anyhow            │ try/catch           │      │
│  │ 测试          │ cargo test        │ jest                │      │
│  │ 打包          │ cargo build       │ pkg / nexe          │      │
│  │ 二进制大小    │ ~2-5 MB           │ ~50-100 MB          │      │
│  │ 运行时依赖    │ 无                │ Node.js             │      │
│  └──────────────┴───────────────────┴─────────────────────┘      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

> 📝 **下一章预告：** 在第十九章中，我们将用 Axum 框架构建一个完整的 REST API，包括路由、中间件、数据库集成和部署！如果你用过 Express.js，你会发现 Axum 既熟悉又令人惊喜。
