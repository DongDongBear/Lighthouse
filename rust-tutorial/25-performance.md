# 第二十五章：性能优化 —— 让 Rust 代码飞起来

> **本章目标**
>
> - 掌握 Rust 的编译优化配置（release profile）
> - 学会使用 criterion 进行基准测试
> - 了解 CPU profiling 和火焰图（flamegraph）的使用
> - 掌握内存优化技巧（减少分配、复用缓冲区）
> - 理解零拷贝技术在 Rust 中的应用
> - 初步认识 SIMD 向量化编程
> - 识别和避免常见的性能陷阱

> **预计学习时间：120 - 150 分钟**（性能优化是一门实践的艺术，建议跟着动手做）

---

## 25.1 编译优化（Release Profile）

### 25.1.1 Debug vs Release

Rust 有两个主要的编译模式，它们的性能差异可以达到 **10-100 倍**：

```bash
# Debug 模式（默认）—— 编译快，运行慢
cargo build
cargo run

# Release 模式 —— 编译慢，运行快
cargo build --release
cargo run --release
```

```
┌──────────────────────────────────────────────────────────┐
│              Debug vs Release 对比                         │
├──────────────┬────────────────────┬───────────────────────┤
│              │  Debug             │  Release               │
├──────────────┼────────────────────┼───────────────────────┤
│ 优化级别     │  opt-level = 0     │  opt-level = 3         │
│ 调试信息     │  完整               │  无（默认）             │
│ 溢出检查     │  有                 │  无（wrap around）      │
│ 编译时间     │  快                 │  慢 2-5 倍             │
│ 运行速度     │  慢                 │  快 10-100 倍          │
│ 二进制大小   │  大                 │  小                    │
│ 断言         │  debug_assert! 启用 │  debug_assert! 跳过    │
│ 输出路径     │  target/debug/     │  target/release/       │
└──────────────┴────────────────────┴───────────────────────┘
```

### 25.1.2 自定义编译配置

在 `Cargo.toml` 中可以精细调整编译选项：

```toml
# Cargo.toml

# 自定义 release 配置
[profile.release]
opt-level = 3          # 最大优化（0-3 或 "s" 优化大小，"z" 最小大小）
lto = true             # 链接时优化（Link Time Optimization）
codegen-units = 1      # 单个代码生成单元（更好的优化，编译更慢）
panic = "abort"        # panic 时直接终止（减小二进制大小）
strip = true           # 去除调试符号

# 自定义 debug 配置
[profile.dev]
opt-level = 1          # 轻微优化，让 debug 模式不那么慢

# 依赖在 debug 模式下使用 release 优化
# 这样你的代码有调试信息，但库是优化过的
[profile.dev.package."*"]
opt-level = 2
```

### 25.1.3 LTO（链接时优化）详解

LTO 允许编译器在链接阶段跨 crate 进行优化：

```toml
[profile.release]
# "false" - 无 LTO（默认）
# "thin" - Thin LTO，编译较快，优化效果不错
# true / "fat" - Full LTO，编译最慢，优化最好
lto = "thin"
```

```
┌──────────────────────────────────────────────────────────┐
│                  LTO 优化流程                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  无 LTO：                                                 │
│  crate A ──编译──→ A.o ──┐                                │
│  crate B ──编译──→ B.o ──┼──链接──→ binary                │
│  crate C ──编译──→ C.o ──┘                                │
│  （各 crate 独立优化，跨 crate 调用无法内联）                │
│                                                          │
│  有 LTO：                                                 │
│  crate A ──编译──→ A.bc ──┐                               │
│  crate B ──编译──→ B.bc ──┼──全局优化──→ binary            │
│  crate C ──编译──→ C.bc ──┘                               │
│  （所有 crate 的代码一起优化，可以跨 crate 内联）            │
│                                                          │
│  效果：通常能提升 10-20% 性能，二进制更小                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 25.1.4 PGO（Profile-Guided Optimization）

PGO 使用运行时数据来指导编译器优化：

```bash
# 步骤 1：编译带插桩的版本
RUSTFLAGS="-Cprofile-generate=/tmp/pgo-data" \
    cargo build --release

# 步骤 2：运行程序收集性能数据
./target/release/my_app  # 用真实的工作负载

# 步骤 3：合并性能数据
llvm-profdata merge -o /tmp/pgo-data/merged.profdata /tmp/pgo-data

# 步骤 4：使用性能数据重新编译
RUSTFLAGS="-Cprofile-use=/tmp/pgo-data/merged.profdata" \
    cargo build --release

# 效果：通常能额外提升 5-15%
```

---

## 25.2 基准测试（Criterion）

### 25.2.1 为什么需要基准测试？

对比 JavaScript 中常见的错误基准测试：

```javascript
// JavaScript - 天真的基准测试（不要这样做！）
const start = Date.now();
for (let i = 0; i < 1000000; i++) {
    myFunction();
}
const elapsed = Date.now() - start;
console.log(`耗时: ${elapsed}ms`);

// 问题：
// 1. JIT 编译器可能优化掉了循环
// 2. 没有预热（warm-up）
// 3. 没有统计分析
// 4. 受其他进程影响
```

### 25.2.2 设置 Criterion

```toml
# Cargo.toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

```rust
// benches/my_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

// 被测函数
fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn fibonacci_iterative(n: u64) -> u64 {
    if n <= 1 {
        return n;
    }
    let mut a = 0u64;
    let mut b = 1u64;
    for _ in 2..=n {
        let temp = a + b;
        a = b;
        b = temp;
    }
    b
}

fn bench_fibonacci(c: &mut Criterion) {
    // 简单基准测试
    c.bench_function("fibonacci 递归 20", |b| {
        b.iter(|| fibonacci(black_box(20)))
    });

    c.bench_function("fibonacci 迭代 20", |b| {
        b.iter(|| fibonacci_iterative(black_box(20)))
    });

    // 参数化基准测试
    let mut group = c.benchmark_group("fibonacci 对比");
    for n in [10, 15, 20, 25].iter() {
        group.bench_with_input(
            BenchmarkId::new("递归", n),
            n,
            |b, &n| b.iter(|| fibonacci(black_box(n))),
        );
        group.bench_with_input(
            BenchmarkId::new("迭代", n),
            n,
            |b, &n| b.iter(|| fibonacci_iterative(black_box(n))),
        );
    }
    group.finish();
}

criterion_group!(benches, bench_fibonacci);
criterion_main!(benches);
```

```bash
# 运行基准测试
cargo bench

# 输出示例：
# fibonacci 递归 20   time: [25.441 µs 25.546 µs 25.656 µs]
# fibonacci 迭代 20   time: [3.7812 ns 3.7980 ns 3.8159 ns]
#
# 迭代比递归快 ~6700 倍！
```

### 25.2.3 black_box 的作用

`black_box` 防止编译器优化掉你的测试代码：

```rust
use criterion::black_box;

// ❌ 编译器可能直接计算出结果，优化掉整个函数调用
let result = fibonacci(20);  // 编译器："结果是 6765，不需要算了"

// ✅ black_box 告诉编译器："别优化这个值"
let result = fibonacci(black_box(20));  // 编译器："好吧，我老老实实算"
```

### 25.2.4 基准测试最佳实践

```
┌──────────────────────────────────────────────────────┐
│            基准测试最佳实践                             │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. 使用 Criterion 而不是手动计时                      │
│     - 自动统计分析                                    │
│     - 自动检测性能回归                                │
│     - 生成 HTML 报告和图表                            │
│                                                      │
│  2. 用 black_box 防止优化                             │
│     - 输入参数用 black_box 包裹                       │
│     - 返回值也要"使用"（返回或 black_box）             │
│                                                      │
│  3. 测试真实场景                                      │
│     - 使用真实大小的数据                              │
│     - 包含边界情况                                    │
│     - 测量端到端性能而非微操作                         │
│                                                      │
│  4. 控制环境                                          │
│     - 关闭后台程序                                    │
│     - 固定 CPU 频率（禁用 turbo boost）               │
│     - 多次运行取中位数                                │
│                                                      │
│  5. 对比而非绝对值                                    │
│     - "A 比 B 快 30%" 比 "A 用了 5µs" 有意义          │
│     - 使用参数化测试对比不同实现                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 25.2.5 实战：对比不同排序算法

```rust
use criterion::{criterion_group, criterion_main, Criterion, BenchmarkId, black_box};

fn bench_sorting(c: &mut Criterion) {
    let sizes = [100, 1000, 10000];

    let mut group = c.benchmark_group("排序算法");

    for &size in &sizes {
        // 生成测试数据
        let mut data: Vec<i32> = (0..size).rev().collect();

        group.bench_with_input(
            BenchmarkId::new("标准库 sort", size),
            &size,
            |b, _| {
                b.iter_batched(
                    || data.clone(),  // 每次迭代重新克隆数据
                    |mut d| d.sort(),
                    criterion::BatchSize::SmallInput,
                );
            },
        );

        group.bench_with_input(
            BenchmarkId::new("sort_unstable", size),
            &size,
            |b, _| {
                b.iter_batched(
                    || data.clone(),
                    |mut d| d.sort_unstable(),
                    criterion::BatchSize::SmallInput,
                );
            },
        );
    }

    group.finish();
}

criterion_group!(benches, bench_sorting);
criterion_main!(benches);
```

---

## 25.3 CPU Profiling（火焰图）

### 25.3.1 什么是火焰图？

火焰图（Flamegraph）是一种可视化工具，展示程序在哪些函数上花费了最多时间：

```
┌──────────────────────────────────────────────────────┐
│                  火焰图示意                            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │                   main()                         │ │
│  ├───────────────────────┬─────────────────────────┤ │
│  │    process_data()     │     write_output()      │ │
│  ├───────────┬───────────┤                         │ │
│  │  parse()  │  sort()   │                         │ │
│  ├─────┬─────┤           │                         │ │
│  │lex()│ast()│           │                         │ │
│  └─────┴─────┴───────────┴─────────────────────────┘ │
│                                                      │
│  宽度 = 时间占比                                      │
│  高度 = 调用深度                                      │
│  找最宽的色块 = 找到性能瓶颈                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 25.3.2 使用 cargo-flamegraph

```bash
# 安装
cargo install flamegraph

# Linux 需要安装 perf
# Ubuntu: sudo apt install linux-tools-common linux-tools-generic
# macOS 使用 dtrace（系统自带）

# 生成火焰图
cargo flamegraph --release

# 指定二进制
cargo flamegraph --release --bin my_app

# 指定基准测试
cargo flamegraph --release --bench my_benchmark

# 输出文件默认是 flamegraph.svg，用浏览器打开
```

### 25.3.3 使用 perf 进行详细分析

```bash
# Linux 上使用 perf
# 编译时保留调试信息
cargo build --release
# 在 Cargo.toml 中添加：
# [profile.release]
# debug = true  # 保留调试信息用于 profiling

# 运行 perf
perf record --call-graph=dwarf ./target/release/my_app
perf report

# 或者直接用 flamegraph 脚本
perf record -g ./target/release/my_app
perf script | stackcollapse-perf.pl | flamegraph.pl > out.svg
```

### 25.3.4 使用 samply（现代替代方案）

```bash
# 安装 samply（支持 macOS 和 Linux）
cargo install samply

# 使用 samply 进行 profiling
samply record ./target/release/my_app

# 会自动打开 Firefox Profiler 的 Web UI
# 提供交互式火焰图、调用树等
```

---

## 25.4 内存优化（减少分配）

### 25.4.1 堆分配是昂贵的

对比 JavaScript —— JS 的每个对象都在堆上：

```javascript
// JavaScript - 每次创建对象都是堆分配
function createPoints(n) {
    const points = [];
    for (let i = 0; i < n; i++) {
        points.push({ x: i, y: i * 2 });  // 堆分配
    }
    return points;
}
```

在 Rust 中，你可以选择栈分配还是堆分配：

```rust
fn main() {
    // 栈分配 —— 极快，自动释放
    let point = (1.0, 2.0);  // 栈上的元组
    let array = [0i32; 100];  // 栈上的数组

    // 堆分配 —— 需要调用分配器
    let vec = vec![0i32; 100];       // 堆上的数组
    let boxed = Box::new(42);         // 堆上的整数
    let string = String::from("hi");  // 堆上的字符串
}
```

### 25.4.2 减少 String 分配

```rust
// ❌ 频繁分配 String
fn bad_concat(parts: &[&str]) -> String {
    let mut result = String::new();
    for part in parts {
        result = result + part;  // 每次 + 都可能重新分配！
    }
    result
}

// ✅ 预分配容量
fn good_concat(parts: &[&str]) -> String {
    let total_len: usize = parts.iter().map(|s| s.len()).sum();
    let mut result = String::with_capacity(total_len);  // 一次分配
    for part in parts {
        result.push_str(part);  // 不会重新分配（除非预估错误）
    }
    result
}

// ✅ 使用 join
fn best_concat(parts: &[&str]) -> String {
    parts.join("")  // 内部已优化
}
```

### 25.4.3 减少 Vec 分配

```rust
fn main() {
    // ❌ 从空 Vec 开始，多次扩容
    let mut v = Vec::new();
    for i in 0..1000 {
        v.push(i);  // 容量不够时会重新分配 + 复制
    }

    // ✅ 预分配容量
    let mut v = Vec::with_capacity(1000);
    for i in 0..1000 {
        v.push(i);  // 不会重新分配
    }

    // ✅ 使用 collect（自动优化大小）
    let v: Vec<i32> = (0..1000).collect();  // Iterator 会提供 size_hint

    // ✅ 复用 Vec（清空但保留容量）
    let mut buf = Vec::with_capacity(1024);
    for _ in 0..100 {
        buf.clear();  // 长度归零，但容量保留！
        // 填充数据...
        buf.extend_from_slice(b"hello");
    }
}
```

### 25.4.4 使用 Cow（写时克隆）

```rust
use std::borrow::Cow;

// Cow<str> 可以是借用的 &str 或拥有的 String
// 只在需要修改时才克隆
fn process_name(name: &str) -> Cow<str> {
    if name.contains(' ') {
        // 需要修改 → 克隆
        Cow::Owned(name.replace(' ', "_"))
    } else {
        // 不需要修改 → 直接借用，零分配！
        Cow::Borrowed(name)
    }
}

fn main() {
    let name1 = process_name("DongDong");     // 不分配
    let name2 = process_name("Dong Dong");     // 分配新 String

    println!("{}, {}", name1, name2);

    // Cow 特别适合：
    // 1. 大部分情况不需要修改的字符串处理
    // 2. 配置值（通常是默认值，偶尔覆盖）
    // 3. 错误消息（大部分是静态字符串）
}
```

### 25.4.5 对象池模式

```rust
use std::collections::VecDeque;

/// 简单的对象池
struct Pool<T> {
    items: VecDeque<T>,
    factory: Box<dyn Fn() -> T>,
}

impl<T> Pool<T> {
    fn new(factory: impl Fn() -> T + 'static, initial_size: usize) -> Self {
        let mut items = VecDeque::with_capacity(initial_size);
        for _ in 0..initial_size {
            items.push_back(factory());
        }
        Pool {
            items,
            factory: Box::new(factory),
        }
    }

    fn get(&mut self) -> T {
        self.items.pop_front().unwrap_or_else(|| (self.factory)())
    }

    fn put(&mut self, item: T) {
        self.items.push_back(item);
    }
}

fn main() {
    // 创建一个缓冲区池
    let mut pool = Pool::new(|| Vec::<u8>::with_capacity(4096), 10);

    // 获取缓冲区
    let mut buf = pool.get();
    buf.extend_from_slice(b"hello");

    // 使用完后归还（清空但保留容量）
    buf.clear();
    pool.put(buf);

    // 再次获取时复用已分配的缓冲区
    let buf = pool.get();
    assert!(buf.capacity() >= 4096);  // 容量还在！
}
```

### 25.4.6 SmallVec —— 小数组优化

```rust
// Cargo.toml:
// [dependencies]
// smallvec = "1"

use smallvec::SmallVec;

fn main() {
    // SmallVec 在元素少时使用栈存储，多时才分配堆
    let mut v: SmallVec<[i32; 8]> = SmallVec::new();

    // 8 个元素以内 → 栈存储，零堆分配！
    for i in 0..8 {
        v.push(i);
    }

    // 超过 8 个 → 自动转为堆存储
    v.push(8);

    // 使用方式和 Vec 完全一样
    println!("{:?}", v);
}
```

---

## 25.5 零拷贝技术

### 25.5.1 什么是零拷贝？

零拷贝意味着处理数据时不需要复制数据，而是通过引用或重新解释来访问：

```rust
fn main() {
    let data = "Hello, World! 你好世界！";

    // ❌ 拷贝：创建新的 String
    let upper = data.to_uppercase();  // 分配新内存 + 复制 + 转换

    // ✅ 零拷贝：只是引用原始数据
    let slice = &data[0..5];  // 不分配，不复制

    // ✅ 零拷贝：bytes() 返回迭代器，不复制
    for byte in data.bytes() {
        // 直接读取原始内存
    }
}
```

### 25.5.2 切片是零拷贝的

```rust
fn process_data(data: &[u8]) {
    // 接受切片而不是 Vec<u8> —— 零拷贝

    // 取子切片也是零拷贝
    let header = &data[..4];
    let payload = &data[4..];

    println!("头部: {:?}", header);
    println!("载荷长度: {}", payload.len());
}

fn main() {
    let data = vec![0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08];
    process_data(&data);  // 传递引用，不复制
}
```

### 25.5.3 bytes crate —— 高效的字节缓冲区

```rust
// Cargo.toml:
// [dependencies]
// bytes = "1"

use bytes::{Bytes, BytesMut, Buf, BufMut};

fn main() {
    // Bytes 是引用计数的字节缓冲区
    // clone 是 O(1) 的（增加引用计数而不是复制数据）
    let data = Bytes::from("Hello, World!");
    let clone = data.clone();  // O(1)，只增加引用计数

    // BytesMut 是可变版本
    let mut buf = BytesMut::with_capacity(1024);
    buf.put_u32(42);           // 写入 4 字节整数
    buf.put_slice(b"hello");   // 写入字节切片

    // 冻结为不可变 Bytes
    let frozen = buf.freeze();

    // 切片也是零拷贝的
    let slice = frozen.slice(0..4);  // O(1)

    // split 也是零拷贝
    let mut buf = BytesMut::from(&b"hello world"[..]);
    let hello = buf.split_to(5);  // 零拷贝分割
    println!("前半: {:?}", hello);
    println!("后半: {:?}", buf);
}
```

### 25.5.4 解析协议的零拷贝技巧

```rust
// 零拷贝的 HTTP 头部解析（简化版）
struct HttpRequest<'a> {
    method: &'a str,
    path: &'a str,
    headers: Vec<(&'a str, &'a str)>,
}

fn parse_request(raw: &str) -> Option<HttpRequest> {
    let mut lines = raw.lines();

    // 解析请求行
    let request_line = lines.next()?;
    let mut parts = request_line.split_whitespace();
    let method = parts.next()?;  // 零拷贝：引用原始字符串
    let path = parts.next()?;    // 零拷贝

    // 解析头部
    let mut headers = Vec::new();
    for line in lines {
        if line.is_empty() {
            break;
        }
        let (key, value) = line.split_once(':')?;
        headers.push((key.trim(), value.trim()));  // 零拷贝
    }

    Some(HttpRequest {
        method,
        path,
        headers,
    })
}

fn main() {
    let raw = "GET /api/users HTTP/1.1\r\nHost: example.com\r\nContent-Type: application/json\r\n\r\n";
    if let Some(req) = parse_request(raw) {
        println!("方法: {}", req.method);
        println!("路径: {}", req.path);
        for (k, v) in &req.headers {
            println!("  {}: {}", k, v);
        }
    }
}
```

---

## 25.6 SIMD 简介

### 25.6.1 什么是 SIMD？

**SIMD（Single Instruction, Multiple Data）** 是一种并行处理技术，一条指令同时处理多个数据：

```
┌──────────────────────────────────────────────────────┐
│              标量 vs SIMD 对比                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  标量运算（一次一个）：                                 │
│  a[0] + b[0] → c[0]                                 │
│  a[1] + b[1] → c[1]                                 │
│  a[2] + b[2] → c[2]                                 │
│  a[3] + b[3] → c[3]                                 │
│  → 4 条指令                                          │
│                                                      │
│  SIMD 运算（一次四个）：                               │
│  [a[0], a[1], a[2], a[3]]                            │
│  +                                                   │
│  [b[0], b[1], b[2], b[3]]                            │
│  =                                                   │
│  [c[0], c[1], c[2], c[3]]                            │
│  → 1 条指令！快 4 倍！                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 25.6.2 Rust 中的 SIMD（std::simd - nightly）

```rust
// 注意：std::simd 目前是 nightly 特性
// #![feature(portable_simd)]
// use std::simd::*;

// 稳定版可以使用 packed_simd2 或直接用 std::arch

// 使用 std::arch 手动 SIMD（稳定版）
#[cfg(target_arch = "x86_64")]
use std::arch::x86_64::*;

// 向量化求和
fn sum_scalar(data: &[f32]) -> f32 {
    data.iter().sum()
}

#[cfg(target_arch = "x86_64")]
fn sum_simd(data: &[f32]) -> f32 {
    // 使用 AVX2 一次处理 8 个 f32
    unsafe {
        let mut sum = _mm256_setzero_ps();  // 8 个 0.0
        let chunks = data.chunks_exact(8);
        let remainder = chunks.remainder();

        for chunk in chunks {
            let v = _mm256_loadu_ps(chunk.as_ptr());
            sum = _mm256_add_ps(sum, v);  // 一次加 8 个
        }

        // 水平求和
        let mut result = [0.0f32; 8];
        _mm256_storeu_ps(result.as_mut_ptr(), sum);
        let mut total: f32 = result.iter().sum();

        // 处理剩余元素
        total += remainder.iter().sum::<f32>();
        total
    }
}
```

### 25.6.3 自动向量化

大多数情况下你不需要手写 SIMD —— 编译器会自动向量化简单的循环：

```rust
// 编译器通常能自动向量化这样的代码
fn add_arrays(a: &[f32], b: &[f32], result: &mut [f32]) {
    for i in 0..a.len().min(b.len()).min(result.len()) {
        result[i] = a[i] + b[i];
    }
    // 编译器会自动使用 SIMD 指令
}

// 用 iter 写法更容易被向量化
fn add_arrays_iter(a: &[f32], b: &[f32]) -> Vec<f32> {
    a.iter().zip(b.iter()).map(|(x, y)| x + y).collect()
}

// 查看编译器是否向量化了：
// cargo rustc --release -- --emit asm
// 或者在 https://godbolt.org 查看汇编输出
```

### 25.6.4 帮助编译器向量化

```rust
// 提示编译器对齐数据
#[repr(align(32))]
struct AlignedArray([f32; 256]);

// 使用 target_feature 启用特定 SIMD 指令集
#[target_feature(enable = "avx2")]
unsafe fn fast_process(data: &mut [f32]) {
    for x in data.iter_mut() {
        *x = (*x * 2.0) + 1.0;
    }
}

// 运行时检测 CPU 特性
fn process(data: &mut [f32]) {
    if is_x86_feature_detected!("avx2") {
        unsafe { fast_process(data); }
    } else {
        // 回退到标量版本
        for x in data.iter_mut() {
            *x = (*x * 2.0) + 1.0;
        }
    }
}
```

---

## 25.7 常见性能陷阱

### 25.7.1 陷阱一：不必要的克隆

```rust
// ❌ 不必要的 clone
fn process(data: Vec<String>) {
    for item in data.clone().iter() {  // 克隆了整个 Vec！
        println!("{}", item);
    }
}

// ✅ 使用引用
fn process_v2(data: &[String]) {
    for item in data.iter() {
        println!("{}", item);
    }
}

// ❌ to_string() 是隐式的 clone
fn greet(name: &str) {
    let owned = name.to_string();  // 堆分配！
    println!("Hello, {}", owned);
}

// ✅ 直接使用引用
fn greet_v2(name: &str) {
    println!("Hello, {}", name);  // 零分配
}
```

### 25.7.2 陷阱二：用 HashMap 而非 Vec

```rust
use std::collections::HashMap;

// ❌ 小数据量用 HashMap 反而慢
fn lookup_small(map: &HashMap<&str, i32>, key: &str) -> Option<i32> {
    map.get(key).copied()
    // HashMap 需要：计算哈希 → 查找桶 → 比较键
    // 对于 <20 个元素，线性搜索可能更快
}

// ✅ 小数据量用 Vec 或数组
fn lookup_small_vec(data: &[(&str, i32)], key: &str) -> Option<i32> {
    data.iter()
        .find(|(k, _)| *k == key)
        .map(|(_, v)| *v)
    // 线性搜索对缓存友好，小数据量更快
}
```

### 25.7.3 陷阱三：频繁的格式化字符串

```rust
use std::fmt::Write;

// ❌ 频繁使用 format!
fn build_report(items: &[(&str, i32)]) -> String {
    let mut result = String::new();
    for (name, value) in items {
        result += &format!("{}: {}\n", name, value);  // 每次都分配临时 String！
    }
    result
}

// ✅ 使用 write! 宏直接写入
fn build_report_v2(items: &[(&str, i32)]) -> String {
    let mut result = String::with_capacity(items.len() * 20);  // 预分配
    for (name, value) in items {
        write!(result, "{}: {}\n", name, value).unwrap();  // 直接写入，不分配临时对象
    }
    result
}
```

### 25.7.4 陷阱四：在循环中分配

```rust
// ❌ 每次迭代都分配新 Vec
fn process_batches(data: &[i32], batch_size: usize) {
    for chunk in data.chunks(batch_size) {
        let processed: Vec<i32> = chunk.iter().map(|x| x * 2).collect();  // 每次分配
        println!("{:?}", processed);
    }
}

// ✅ 复用缓冲区
fn process_batches_v2(data: &[i32], batch_size: usize) {
    let mut buf = Vec::with_capacity(batch_size);  // 只分配一次
    for chunk in data.chunks(batch_size) {
        buf.clear();  // 清空但保留容量
        buf.extend(chunk.iter().map(|x| x * 2));
        println!("{:?}", buf);
    }
}
```

### 25.7.5 陷阱五：Box<dyn Trait> 的动态分发

```rust
// ❌ 动态分发（vtable 查找 + 无法内联）
fn sum_dynamic(items: &[Box<dyn Iterator<Item = i32>>]) -> i32 {
    // 每次调用 next() 都经过虚函数表
    todo!()
}

// ✅ 静态分发（编译时确定，可以内联）
fn sum_static<I: Iterator<Item = i32>>(iter: I) -> i32 {
    iter.sum()  // 编译器知道具体类型，可以内联优化
}

// 经验法则：
// 热路径（频繁调用）→ 使用泛型（静态分发）
// 冷路径（偶尔调用）→ 使用 dyn Trait（灵活性更重要）
```

### 25.7.6 陷阱六：在 Debug 模式下判断性能

```rust
fn main() {
    let start = std::time::Instant::now();

    // 这段代码在 debug 模式下可能慢 100 倍！
    let sum: u64 = (0..10_000_000).sum();

    let elapsed = start.elapsed();
    println!("耗时: {:?}", elapsed);
    println!("结果: {}", sum);

    // 永远用 --release 测试性能！
    // cargo run --release
}
```

### 25.7.7 性能优化决策树

```
┌──────────────────────────────────────────────────────┐
│           性能优化决策树                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. 先测量！不要凭直觉优化                             │
│     └→ cargo bench / flamegraph                      │
│                                                      │
│  2. 确认是否使用了 --release                          │
│     └→ debug 比 release 慢 10-100x                   │
│                                                      │
│  3. 算法选对了吗？                                    │
│     └→ O(n²) → O(n log n) 比任何微优化都强            │
│                                                      │
│  4. 减少内存分配                                      │
│     ├→ 预分配容量                                     │
│     ├→ 复用缓冲区                                     │
│     ├→ 使用 Cow 和 SmallVec                           │
│     └→ 使用对象池                                     │
│                                                      │
│  5. 利用缓存局部性                                    │
│     ├→ Vec 比 LinkedList 快（连续内存）                │
│     ├→ 结构体的数组（SoA）比数组的结构体（AoS）         │
│     └→ 避免指针追踪（pointer chasing）                │
│                                                      │
│  6. 零拷贝                                            │
│     ├→ 用引用代替克隆                                  │
│     ├→ 用 Bytes 代替 Vec<u8>                          │
│     └→ 解析时引用原始数据                              │
│                                                      │
│  7. 并行化                                            │
│     ├→ rayon 数据并行                                  │
│     └→ tokio 异步 I/O                                 │
│                                                      │
│  8. 编译器优化                                        │
│     ├→ LTO                                           │
│     ├→ PGO                                           │
│     └→ codegen-units = 1                             │
│                                                      │
│  9. SIMD（最后手段）                                   │
│     └→ 确认编译器没有自动向量化后再手写                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 25.8 实战练习

### 练习 1：优化字符串处理

```rust
// 优化这段代码，减少内存分配
fn count_words(text: &str) -> std::collections::HashMap<String, usize> {
    let mut counts = std::collections::HashMap::new();
    for word in text.split_whitespace() {
        let word = word.to_lowercase();  // 每次都分配！
        *counts.entry(word).or_insert(0) += 1;
    }
    counts
}

// TODO: 实现优化版本
// 提示：考虑使用 Cow、预分配、或者改变数据结构

fn main() {
    let text = "the quick brown fox jumps over the lazy dog the fox";
    let counts = count_words(text);
    println!("{:?}", counts);
}
```

### 练习 2：实现一个高效的环形缓冲区

```rust
struct RingBuffer<T> {
    // TODO: 实现一个无锁的环形缓冲区
    // 要求：
    // 1. 固定大小，不动态分配
    // 2. push 和 pop 都是 O(1)
    // 3. 满时 push 覆盖最旧的元素
}
```

### 练习 3：基准测试对比

使用 Criterion 对比以下操作的性能：
1. `Vec::push` vs 预分配后 `push`
2. `String::from` vs `to_string()` vs `to_owned()`
3. `HashMap` vs `BTreeMap` vs 排序 `Vec` 的查找性能
4. `Box<dyn Trait>` vs 泛型的调用开销

### 练习 4：思考题

1. 为什么 Rust 的 `Vec` 扩容策略是翻倍而不是每次加一？这对摊还复杂度有什么影响？
2. `#[inline]` 和 `#[inline(always)]` 的区别是什么？什么时候应该使用？
3. 为什么 `sort_unstable` 通常比 `sort` 快？什么场景下必须用 `sort`？
4. 什么是"缓存行（cache line）"？为什么它影响性能？
5. Rust 的零成本抽象（zero-cost abstraction）是什么意思？举三个例子。

---

## 25.9 本章小结

```
┌──────────────────────────────────────────────────────┐
│                性能优化小结                             │
├──────────────────────────────────────────────────────┤
│                                                      │
│  编译优化：                                           │
│  - 永远用 --release 测试性能                           │
│  - LTO + codegen-units=1 额外提升 10-20%              │
│  - PGO 再提升 5-15%                                   │
│                                                      │
│  测量工具：                                            │
│  - Criterion 基准测试                                 │
│  - flamegraph 火焰图                                  │
│  - samply 交互式 profiling                            │
│                                                      │
│  内存优化：                                            │
│  - 预分配 with_capacity                               │
│  - 复用缓冲区 clear()                                 │
│  - Cow 写时克隆                                       │
│  - SmallVec 小数组优化                                │
│                                                      │
│  零拷贝：                                              │
│  - 切片引用代替克隆                                    │
│  - bytes crate 引用计数                               │
│  - 解析时借用原始数据                                  │
│                                                      │
│  核心原则：                                            │
│  1. 先测量，再优化                                     │
│  2. 算法 > 微优化                                     │
│  3. 减少分配 > 加速分配                                │
│  4. 缓存友好 > 计算优化                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

> **下一章预告：** 第二十六章将指导你如何发布自己的 crate 到 crates.io —— 从文档编写到 CI/CD，让你的代码造福社区！
