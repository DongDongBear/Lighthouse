# 第十六章：异步编程 —— async/await 与 Tokio

> **本章目标**
>
> - 理解异步编程的本质（对比 JavaScript 的 Promise/async-await）
> - 深入理解 Rust 的 `Future` trait
> - 掌握 `async fn` 与 `.await` 语法
> - 学会使用 Tokio 异步运行时
> - 掌握异步任务 `spawn` 的使用
> - 理解 `select!` 宏的竞争模式
> - 初步了解 `Pin` 与 `Unpin` 的概念
> - 通过练习题巩固异步编程知识

> **预计学习时间：180 - 240 分钟**（异步编程是现代 Rust 应用的核心，也是从 JS 过渡最自然的部分）

---

## 16.1 异步编程概念 —— JavaScript 开发者的最大优势

### 16.1.1 你已经是异步编程专家了！

好消息：作为 JavaScript/TypeScript 开发者，你对异步编程的理解可能比大多数系统编程者都深。JS 的 `async/await` 和 Rust 的非常相似：

```javascript
// JavaScript
async function fetchUser(id) {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    return user;
}

// 调用
fetchUser(1).then(user => console.log(user));
```

```rust
// Rust（使用 Tokio）
async fn fetch_user(id: u32) -> Result<User, reqwest::Error> {
    let response = reqwest::get(&format!("/api/users/{}", id)).await?;
    let user = response.json::<User>().await?;
    Ok(user)
}

// 调用
let user = fetch_user(1).await?;
println!("{:?}", user);
```

看起来几乎一样对吧？但底层机制大不相同。

### 16.1.2 JS 异步 vs Rust 异步：核心区别

```
JavaScript 的异步：
┌──────────────────────────────────────────┐
│  事件循环（Event Loop）—— 内置于运行时    │
│                                          │
│  Promise 创建时就开始执行                 │
│  │                                       │
│  const p = fetch(url);  // 立即开始！     │
│  // p 已经在执行了，不管你 await 不 await  │
└──────────────────────────────────────────┘

Rust 的异步：
┌──────────────────────────────────────────┐
│  没有内置运行时 —— 你需要选一个（如 Tokio）│
│                                          │
│  Future 是惰性的（Lazy）                  │
│  │                                       │
│  let f = fetch(url);  // 什么都没发生！   │
│  f.await;             // 现在才开始执行    │
└──────────────────────────────────────────┘
```

这是最重要的区别：**Rust 的 Future 是惰性的**。

```rust
async fn hello() {
    println!("你好！");
}

fn main() {
    let future = hello(); // ⚠️ 什么都不会打印！
    // Future 只是一个"计划"，需要执行器（Executor）来驱动它
    // 直到被 .await 或被运行时 poll，它才会执行
}
```

```javascript
// JavaScript - Promise 是急切的（Eager）
async function hello() {
    console.log("你好！");
}

const promise = hello(); // 立即打印 "你好！"
// Promise 创建时就开始执行了
```

### 16.1.3 为什么需要异步？

异步编程适合 **I/O 密集型** 任务——等待网络、文件、数据库时不浪费 CPU：

```
同步（阻塞）方式：
线程1: ────请求A────[等待...]────处理A────
线程2: ────请求B────[等待...]────处理B────
线程3: ────请求C────[等待...]────处理C────
（需要 3 个线程，大量时间在等待中浪费）

异步方式：
线程1: ──请求A──请求B──请求C──处理A──处理B──处理C──
（1 个线程处理 3 个请求，等待时切换到其他任务）
```

```rust
// 同步方式 —— 3 个请求串行执行，总时间 = 3 秒
fn sync_requests() {
    let r1 = blocking_fetch("url1"); // 等 1 秒
    let r2 = blocking_fetch("url2"); // 等 1 秒
    let r3 = blocking_fetch("url3"); // 等 1 秒
    // 总计 3 秒
}

// 异步方式 —— 3 个请求并发执行，总时间 ≈ 1 秒
async fn async_requests() {
    let (r1, r2, r3) = tokio::join!(
        async_fetch("url1"), // 同时开始
        async_fetch("url2"), // 同时开始
        async_fetch("url3"), // 同时开始
    );
    // 总计约 1 秒（最长的那个）
}
```

### 16.1.4 同步线程 vs 异步任务

```
┌──────────────┬────────────────────┬────────────────────┐
│              │ 同步线程            │ 异步任务            │
├──────────────┼────────────────────┼────────────────────┤
│ 创建成本     │ 高（几 KB ~ MB 栈）│ 低（几百字节）      │
│ 上下文切换   │ OS 级别（慢）      │ 用户级别（快）      │
│ 适合场景     │ CPU 密集型计算     │ I/O 密集型          │
│ 并发数量     │ 数百~数千          │ 数万~数十万         │
│ 编程模型     │ 阻塞调用           │ async/await         │
└──────────────┴────────────────────┴────────────────────┘
```

---

## 16.2 `Future` trait —— 异步的基石

### 16.2.1 Future 的定义

Rust 的 `Future` trait 是异步编程的核心：

```rust
// 标准库中 Future trait 的简化定义
trait Future {
    type Output;  // 完成时产生的值

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}

enum Poll<T> {
    Ready(T),   // 已完成，结果是 T
    Pending,    // 还没完成，稍后再来问
}
```

这就像餐厅点餐：

```
你：  "我要一份拉面"（创建 Future）
服务员："好的，稍等"（返回 Pending）
你去做其他事...
服务员："您的拉面好了！"（返回 Ready(拉面)）
```

### 16.2.2 对比 JavaScript 的 Promise

```javascript
// JavaScript Promise 的内部状态
// pending → fulfilled(value) 或 rejected(error)
const promise = new Promise((resolve, reject) => {
    setTimeout(() => resolve("完成"), 1000);
});
// Promise 是急切的 + 基于回调的
```

```rust
// Rust Future 的状态
// poll → Pending 或 Ready(value)
// Future 是惰性的 + 基于轮询（poll）的
```

关键区别：
- **JS Promise**：推（Push）模型 —— 完成时自动通知回调
- **Rust Future**：拉（Pull）模型 —— 运行时反复轮询直到完成

但 Rust 不是简单地不停轮询（那会浪费 CPU）。`Context` 中包含一个 `Waker`，Future 可以在准备好时通过 `Waker` 通知运行时"来 poll 我吧"。

### 16.2.3 手动实现一个 Future

```rust
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::{Duration, Instant};

// 一个简单的延时 Future
struct Delay {
    when: Instant,
}

impl Delay {
    fn new(duration: Duration) -> Self {
        Delay {
            when: Instant::now() + duration,
        }
    }
}

impl Future for Delay {
    type Output = String;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<String> {
        if Instant::now() >= self.when {
            // 时间到了，返回 Ready
            Poll::Ready("延迟完成！".to_string())
        } else {
            // 还没到时间
            // 注册 waker，让运行时稍后再来 poll
            let waker = cx.waker().clone();
            let when = self.when;

            // 在实际应用中，你会注册到事件系统
            // 这里简化为创建一个线程来唤醒
            std::thread::spawn(move || {
                let now = Instant::now();
                if now < when {
                    std::thread::sleep(when - now);
                }
                waker.wake(); // 通知运行时：我准备好了！
            });

            Poll::Pending
        }
    }
}

// 使用（需要异步运行时）
#[tokio::main]
async fn main() {
    println!("开始延迟...");
    let result = Delay::new(Duration::from_secs(1)).await;
    println!("{}", result); // "延迟完成！"
}
```

### 16.2.4 async/await 只是 Future 的语法糖

```rust
// 这两个函数是等价的：

// 方式1：async fn
async fn greet(name: &str) -> String {
    format!("你好, {}!", name)
}

// 方式2：返回 impl Future（编译器把 async fn 转换成这样）
fn greet_desugared(name: &str) -> impl Future<Output = String> + '_ {
    async move {
        format!("你好, {}!", name)
    }
}
```

---

## 16.3 Tokio 运行时 —— Rust 的事件循环

### 16.3.1 为什么需要运行时？

Rust 标准库没有内置异步运行时（不像 JS 有 V8 的事件循环）。你需要选择一个：

| 运行时 | 特点 | 适用场景 |
|--------|------|---------|
| **Tokio** | 最流行，功能最全 | 网络服务、通用异步 |
| async-std | 类似标准库 API | 简单应用 |
| smol | 极简 | 嵌入式、小项目 |

我们使用 **Tokio**，它是 Rust 异步生态的事实标准。

### 16.3.2 添加 Tokio 依赖

```toml
# Cargo.toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

### 16.3.3 启动 Tokio 运行时

```rust
// 方式1：使用 #[tokio::main] 宏（最常用）
#[tokio::main]
async fn main() {
    println!("在 Tokio 运行时中！");

    // 现在可以使用 .await 了
    let result = async_operation().await;
    println!("结果: {}", result);
}

async fn async_operation() -> i32 {
    // 模拟异步操作
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    42
}

// 方式2：手动创建运行时
fn main() {
    let rt = tokio::runtime::Runtime::new().unwrap();

    rt.block_on(async {
        println!("在手动创建的运行时中！");
        let result = async_operation().await;
        println!("结果: {}", result);
    });
}

// 方式3：在同步代码中运行单个 Future
fn main() {
    let rt = tokio::runtime::Runtime::new().unwrap();

    // block_on 会阻塞当前线程直到 Future 完成
    let result = rt.block_on(async_operation());
    println!("结果: {}", result);
}
```

### 16.3.4 Tokio 运行时的配置

```rust
// 多线程运行时（默认）
#[tokio::main]  // 等价于 #[tokio::main(flavor = "multi_thread")]
async fn main() {
    // 默认使用所有 CPU 核心
}

// 单线程运行时（类似 JS 的事件循环）
#[tokio::main(flavor = "current_thread")]
async fn main() {
    // 只使用当前线程，更轻量
    // 适合简单应用或测试
}

// 自定义线程数
#[tokio::main(worker_threads = 4)]
async fn main() {
    // 使用 4 个工作线程
}

// 手动配置的完整示例
fn main() {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(4)           // 4 个工作线程
        .thread_name("my-worker")    // 线程名称
        .thread_stack_size(3 * 1024 * 1024) // 3MB 栈大小
        .enable_all()                // 启用所有功能（IO、时间等）
        .build()
        .unwrap();

    runtime.block_on(async {
        println!("自定义运行时启动！");
    });
}
```

---

## 16.4 async fn 与 .await —— 日常使用

### 16.4.1 基本用法

```rust
use tokio::time::{sleep, Duration};

// async 函数
async fn fetch_data(url: &str) -> String {
    println!("🌐 开始获取: {}", url);
    sleep(Duration::from_millis(500)).await;  // .await 暂停执行
    println!("✅ 获取完成: {}", url);
    format!("来自 {} 的数据", url)
}

#[tokio::main]
async fn main() {
    // .await 等待异步操作完成
    let data = fetch_data("https://example.com").await;
    println!("数据: {}", data);
}
```

### 16.4.2 并发执行多个异步操作

```rust
use tokio::time::{sleep, Duration};

async fn task(name: &str, ms: u64) -> String {
    println!("⏳ {} 开始（需要 {}ms）", name, ms);
    sleep(Duration::from_millis(ms)).await;
    println!("✅ {} 完成", name);
    format!("{} 的结果", name)
}

#[tokio::main]
async fn main() {
    // ❌ 串行执行 —— 总时间 = 300 + 200 + 100 = 600ms
    println!("=== 串行 ===");
    let r1 = task("A", 300).await;
    let r2 = task("B", 200).await;
    let r3 = task("C", 100).await;
    println!("串行结果: {}, {}, {}", r1, r2, r3);

    // ✅ 并发执行 —— 总时间 ≈ 300ms（最长的那个）
    println!("\n=== 并发（tokio::join!） ===");
    let (r1, r2, r3) = tokio::join!(
        task("A", 300),
        task("B", 200),
        task("C", 100),
    );
    println!("并发结果: {}, {}, {}", r1, r2, r3);
}
```

对比 JavaScript：

```javascript
// JavaScript - 并发执行
const [r1, r2, r3] = await Promise.all([
    task("A", 300),
    task("B", 200),
    task("C", 100),
]);
// Rust 的 tokio::join! 就是 Promise.all 的对应物
```

### 16.4.3 try_join! —— 带错误处理的并发

```rust
use tokio::time::{sleep, Duration};

async fn maybe_fail(name: &str, should_fail: bool) -> Result<String, String> {
    sleep(Duration::from_millis(100)).await;
    if should_fail {
        Err(format!("{} 失败了！", name))
    } else {
        Ok(format!("{} 成功", name))
    }
}

#[tokio::main]
async fn main() {
    // try_join! —— 任何一个失败就立即返回错误
    let result = tokio::try_join!(
        maybe_fail("任务A", false),
        maybe_fail("任务B", false),
        maybe_fail("任务C", false),
    );

    match result {
        Ok((a, b, c)) => println!("全部成功: {}, {}, {}", a, b, c),
        Err(e) => println!("有任务失败: {}", e),
    }

    // 有一个失败的情况
    let result = tokio::try_join!(
        maybe_fail("任务A", false),
        maybe_fail("任务B", true),   // 这个会失败
        maybe_fail("任务C", false),
    );

    match result {
        Ok((a, b, c)) => println!("全部成功: {}, {}, {}", a, b, c),
        Err(e) => println!("有任务失败: {}", e), // "任务B 失败了！"
    }
}
```

对比 JavaScript：

```javascript
// JavaScript
try {
    const [a, b, c] = await Promise.all([taskA(), taskB(), taskC()]);
} catch (e) {
    console.error("有任务失败:", e);
}
// Rust 的 try_join! = Promise.all + try/catch
```

### 16.4.4 async 块

```rust
#[tokio::main]
async fn main() {
    // async 块 —— 内联的异步代码
    let result = async {
        let a = compute_a().await;
        let b = compute_b(a).await;
        a + b
    }.await;

    println!("结果: {}", result);

    // async 块可以捕获变量
    let name = "动动".to_string();
    let greeting = async move {
        // move 将 name 移动到 async 块中
        format!("你好, {}!", name)
    }.await;

    println!("{}", greeting);
}

async fn compute_a() -> i32 { 10 }
async fn compute_b(x: i32) -> i32 { x * 2 }
```

### 16.4.5 异步闭包与 async move

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let data = vec![1, 2, 3, 4, 5];

    // 对每个元素执行异步操作
    let mut results = vec![];
    for item in &data {
        let item = *item;
        let result = async move {
            sleep(Duration::from_millis(100)).await;
            item * 2
        }.await;
        results.push(result);
    }

    println!("结果: {:?}", results); // [2, 4, 6, 8, 10]

    // 使用 futures crate 的 stream 更优雅
    // （需要 futures = "0.3"）
    // use futures::stream::{self, StreamExt};
    // let results: Vec<i32> = stream::iter(data)
    //     .then(|item| async move {
    //         sleep(Duration::from_millis(100)).await;
    //         item * 2
    //     })
    //     .collect()
    //     .await;
}
```

---

## 16.5 异步任务 `spawn` —— 真正的并行

### 16.5.1 tokio::spawn 基础

`tokio::spawn` 创建一个独立的异步任务，可以在不同的线程上运行：

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    println!("主任务开始");

    // spawn 创建独立的异步任务
    let handle = tokio::spawn(async {
        sleep(Duration::from_millis(500)).await;
        println!("子任务完成");
        42 // 返回值
    });

    println!("主任务继续执行（子任务在后台运行）");
    sleep(Duration::from_millis(200)).await;
    println!("主任务做了一些事情");

    // 等待子任务完成，获取返回值
    let result = handle.await.unwrap(); // JoinHandle<i32>
    println!("子任务返回: {}", result);
}
```

### 16.5.2 对比 join! 和 spawn

```rust
use tokio::time::{sleep, Duration};

async fn work(name: &str, ms: u64) -> String {
    sleep(Duration::from_millis(ms)).await;
    format!("{} 完成", name)
}

#[tokio::main]
async fn main() {
    // join! —— 在当前任务中并发
    // 共享当前任务的生命周期
    let (a, b) = tokio::join!(
        work("A", 100),
        work("B", 200),
    );

    // spawn —— 创建独立任务
    // 有自己的生命周期，可能在不同线程上执行
    // 注意：spawn 的闭包必须是 'static 的
    let handle_a = tokio::spawn(async {
        work("A", 100).await  // ❌ 这里不能用 &str，因为需要 'static
    });
    let handle_b = tokio::spawn(async {
        work("B", 200).await
    });

    let a = handle_a.await.unwrap();
    let b = handle_b.await.unwrap();
}
```

### 16.5.3 spawn 的 'static 限制

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let name = String::from("动动");

    // ❌ 编译错误！spawn 要求 'static 生命周期
    // tokio::spawn(async {
    //     println!("{}", name); // name 是借用的，不满足 'static
    // });

    // ✅ 方式1：使用 move 将所有权移入
    let name_clone = name.clone();
    tokio::spawn(async move {
        println!("你好, {}", name_clone);
    });

    // ✅ 方式2：使用 Arc 共享
    use std::sync::Arc;
    let shared_name = Arc::new(name);

    for i in 0..3 {
        let name = Arc::clone(&shared_name);
        tokio::spawn(async move {
            println!("任务 {} 说: 你好, {}", i, name);
        });
    }

    sleep(Duration::from_millis(100)).await; // 等待任务完成
}
```

### 16.5.4 批量 spawn 与收集结果

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let urls = vec![
        "https://api.example.com/1",
        "https://api.example.com/2",
        "https://api.example.com/3",
        "https://api.example.com/4",
        "https://api.example.com/5",
    ];

    // 对每个 URL spawn 一个任务
    let mut handles = vec![];
    for url in urls {
        let handle = tokio::spawn(async move {
            // 模拟 HTTP 请求
            sleep(Duration::from_millis(100)).await;
            format!("来自 {} 的响应", url)
        });
        handles.push(handle);
    }

    // 收集所有结果
    let mut results = vec![];
    for handle in handles {
        let result = handle.await.unwrap();
        results.push(result);
    }

    for result in &results {
        println!("📥 {}", result);
    }
}
```

对比 JavaScript：

```javascript
// JavaScript
const urls = ["/1", "/2", "/3", "/4", "/5"];
const promises = urls.map(url => fetch(url).then(r => r.text()));
const results = await Promise.all(promises);
// 概念完全一样！
```

### 16.5.5 spawn_blocking —— 在异步中运行同步代码

```rust
use tokio::task;

#[tokio::main]
async fn main() {
    // 如果有 CPU 密集型工作，不要在异步任务中阻塞
    // 使用 spawn_blocking 在专用线程池中运行

    let result = task::spawn_blocking(|| {
        // 这会在一个专用的阻塞线程池中运行
        // 不会阻塞 Tokio 的异步工作线程
        println!("正在进行 CPU 密集型计算...");
        let mut sum: u64 = 0;
        for i in 0..10_000_000 {
            sum += i;
        }
        sum
    }).await.unwrap();

    println!("计算结果: {}", result);

    // ❌ 不要在 async 中做 CPU 密集型工作
    // 这会阻塞整个工作线程，影响其他异步任务
    // tokio::spawn(async {
    //     heavy_computation(); // 坏！会阻塞异步运行时
    // });
}
```

---

## 16.6 `select!` 宏 —— 竞争与超时

### 16.6.1 基本用法

`select!` 同时等待多个 Future，返回第一个完成的：

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // select! 类似于 Promise.race
    tokio::select! {
        _ = sleep(Duration::from_secs(1)) => {
            println!("1 秒计时器先完成");
        }
        _ = sleep(Duration::from_millis(500)) => {
            println!("500ms 计时器先完成"); // 这个会被选中
        }
    }
}
```

对比 JavaScript 的 `Promise.race`：

```javascript
// JavaScript
const result = await Promise.race([
    delay(1000).then(() => "1秒"),
    delay(500).then(() => "500ms"),
]);
console.log(result); // "500ms"
```

### 16.6.2 实现超时

```rust
use tokio::time::{sleep, Duration};

async fn slow_operation() -> String {
    sleep(Duration::from_secs(5)).await;
    "操作完成".to_string()
}

#[tokio::main]
async fn main() {
    // 方式1：使用 select! 实现超时
    tokio::select! {
        result = slow_operation() => {
            println!("操作成功: {}", result);
        }
        _ = sleep(Duration::from_secs(2)) => {
            println!("⏰ 操作超时！");
        }
    }

    // 方式2：使用 tokio::time::timeout（更简洁）
    match tokio::time::timeout(
        Duration::from_secs(2),
        slow_operation()
    ).await {
        Ok(result) => println!("操作成功: {}", result),
        Err(_) => println!("⏰ 操作超时！"),
    }
}
```

### 16.6.3 select! 与 Channel

```rust
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let (tx1, mut rx1) = mpsc::channel::<String>(32);
    let (tx2, mut rx2) = mpsc::channel::<String>(32);

    // 生产者 1
    tokio::spawn(async move {
        sleep(Duration::from_millis(200)).await;
        tx1.send("来自通道1".to_string()).await.unwrap();
    });

    // 生产者 2
    tokio::spawn(async move {
        sleep(Duration::from_millis(100)).await;
        tx2.send("来自通道2".to_string()).await.unwrap();
    });

    // 等待第一个消息
    tokio::select! {
        Some(msg) = rx1.recv() => {
            println!("通道1: {}", msg);
        }
        Some(msg) = rx2.recv() => {
            println!("通道2: {}", msg); // 这个先到
        }
    }
}
```

### 16.6.4 select! 循环模式

```rust
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration, interval};

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(32);

    // 发送几条消息
    tokio::spawn(async move {
        for i in 0..5 {
            sleep(Duration::from_millis(300)).await;
            tx.send(format!("消息 {}", i)).await.unwrap();
        }
        // tx 被 drop，channel 关闭
    });

    let mut tick = interval(Duration::from_secs(1));

    loop {
        tokio::select! {
            // 收到消息
            msg = rx.recv() => {
                match msg {
                    Some(m) => println!("📥 收到: {}", m),
                    None => {
                        println!("📭 通道关闭，退出");
                        break;
                    }
                }
            }
            // 定时器触发
            _ = tick.tick() => {
                println!("⏰ 心跳 tick");
            }
        }
    }
}
```

### 16.6.5 select! 与取消

当 `select!` 选择了一个分支后，其他分支会被**取消**（drop）：

```rust
use tokio::time::{sleep, Duration};

async fn important_task() -> String {
    sleep(Duration::from_secs(5)).await;
    println!("重要任务完成"); // 如果被取消，这行不会执行
    "结果".to_string()
}

#[tokio::main]
async fn main() {
    tokio::select! {
        result = important_task() => {
            println!("任务完成: {}", result);
        }
        _ = sleep(Duration::from_secs(1)) => {
            println!("超时，important_task 被取消了");
            // important_task 的 Future 被 drop
        }
    }
}
```

> ⚠️ **取消安全（Cancellation Safety）**
> 不是所有异步操作都可以安全取消。如果一个操作在被取消时可能丢失数据，
> 它就不是"取消安全"的。使用 `select!` 时要注意这一点。

---

## 16.7 Tokio 异步 Channel

### 16.7.1 mpsc —— 多生产者单消费者

```rust
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    // 创建有界 channel（容量 32）
    let (tx, mut rx) = mpsc::channel::<String>(32);

    // 多个生产者
    for i in 0..3 {
        let tx = tx.clone();
        tokio::spawn(async move {
            for j in 0..3 {
                tx.send(format!("生产者{}: 消息{}", i, j)).await.unwrap();
            }
        });
    }
    drop(tx); // 丢弃原始的 tx

    // 消费者
    while let Some(msg) = rx.recv().await {
        println!("📥 {}", msg);
    }
    println!("所有消息已处理");
}
```

### 16.7.2 oneshot —— 一次性 channel

```rust
use tokio::sync::oneshot;

#[tokio::main]
async fn main() {
    // oneshot: 只能发送一次
    let (tx, rx) = oneshot::channel::<String>();

    tokio::spawn(async move {
        // 模拟异步计算
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        tx.send("计算结果".to_string()).unwrap();
    });

    // 等待结果
    let result = rx.await.unwrap();
    println!("收到: {}", result);
}
```

### 16.7.3 broadcast —— 广播 channel

```rust
use tokio::sync::broadcast;

#[tokio::main]
async fn main() {
    // broadcast: 所有接收者都能收到每条消息
    let (tx, _) = broadcast::channel::<String>(16);

    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();

    tokio::spawn(async move {
        for i in 0..3 {
            tx.send(format!("广播消息 {}", i)).unwrap();
        }
    });

    // 两个接收者都能收到所有消息
    let h1 = tokio::spawn(async move {
        while let Ok(msg) = rx1.recv().await {
            println!("接收者1: {}", msg);
        }
    });

    let h2 = tokio::spawn(async move {
        while let Ok(msg) = rx2.recv().await {
            println!("接收者2: {}", msg);
        }
    });

    let _ = tokio::join!(h1, h2);
}
```

### 16.7.4 watch —— 最新值 channel

```rust
use tokio::sync::watch;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // watch: 接收者总是能看到最新值
    let (tx, mut rx) = watch::channel("初始状态".to_string());

    // 生产者：定期更新状态
    tokio::spawn(async move {
        let states = vec!["加载中", "处理中", "完成"];
        for state in states {
            sleep(Duration::from_millis(200)).await;
            tx.send(state.to_string()).unwrap();
        }
    });

    // 消费者：监听状态变化
    loop {
        // changed() 等待值发生变化
        if rx.changed().await.is_err() {
            break; // 发送端关闭
        }
        println!("状态更新: {}", *rx.borrow());
    }
}
```

---

## 16.8 `Pin` 与 `Unpin` 简介

### 16.8.1 为什么需要 Pin？

这是 Rust 异步编程中最难理解的概念之一。简单来说：

**问题**：某些 Future 在内存中包含指向自身的引用（自引用结构体）。如果 Future 被移动到内存的另一个位置，这些内部引用就会变成悬空指针。

```
async fn example() {
    let data = vec![1, 2, 3];
    let reference = &data;    // 指向 data 的引用
    some_async_op().await;     // 在这个 .await 点，Future 可能被移动
    println!("{:?}", reference); // 如果 Future 被移动了，reference 就无效了！
}
```

编译器将 `async fn` 转换为一个状态机结构体，这个结构体可能包含自引用：

```
struct ExampleFuture {
    data: Vec<i32>,
    reference: *const Vec<i32>,  // 指向 self.data ← 自引用！
    state: State,
}
```

### 16.8.2 Pin 的作用

`Pin<P>` 保证被包装的值**不会在内存中移动**：

```rust
use std::pin::Pin;

fn main() {
    let mut data = String::from("hello");

    // Pin 到栈上
    let pinned = Pin::new(&mut data);

    // 可以读取
    println!("{}", pinned);

    // 但不能移动 pinned 指向的值（对于 !Unpin 类型）
}
```

### 16.8.3 Unpin trait

大多数类型都实现了 `Unpin`，意味着它们**可以安全移动**，`Pin` 对它们没有实际限制：

```rust
fn main() {
    // i32, String, Vec 等都是 Unpin 的
    let mut x = 42;
    let pinned = Pin::new(&mut x);
    // 因为 i32: Unpin，所以 Pin 对它没有额外限制

    // 只有某些特殊类型（如编译器生成的 Future）是 !Unpin 的
}
```

### 16.8.4 实际使用中的 Pin

在日常异步编程中，你很少需要直接操作 `Pin`。主要在以下场景会遇到：

```rust
use std::pin::Pin;
use std::future::Future;

// 场景1：返回 trait 对象
fn make_future() -> Pin<Box<dyn Future<Output = i32>>> {
    Box::pin(async {
        42
    })
}

// 场景2：手动实现 Future
// （参见 16.2.3 的 Delay 示例）

// 场景3：使用 tokio::pin! 宏
#[tokio::main]
async fn main() {
    let future = async { 42 };

    // pin! 宏将 future 固定到栈上
    tokio::pin!(future);

    // 现在可以用 &mut future 传给需要 Pin 的函数
    let result = (&mut future).await;
    println!("结果: {}", result);
}
```

### 16.8.5 Pin 速查

```
┌─────────────────────────────────────────────────┐
│ Q: 我需要关心 Pin 吗？                           │
├─────────────────────────────────────────────────┤
│ 正常使用 async/await？      → 不用关心           │
│ 返回 dyn Future？           → 用 Box::pin()      │
│ 手动实现 Future trait？     → 需要 Pin<&mut Self> │
│ 在 select! 中使用变量？     → 用 tokio::pin!()   │
│ 编译器报错提到 Pin？        → 通常加 Box::pin()   │
└─────────────────────────────────────────────────┘
```

---

## 16.9 异步编程的常见模式

### 16.9.1 并发限制（信号量）

```rust
use std::sync::Arc;
use tokio::sync::Semaphore;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // 最多同时 3 个任务
    let semaphore = Arc::new(Semaphore::new(3));
    let mut handles = vec![];

    for i in 0..10 {
        let sem = Arc::clone(&semaphore);
        handles.push(tokio::spawn(async move {
            // 获取许可
            let _permit = sem.acquire().await.unwrap();
            println!("任务 {} 开始（当前并发: {}）", i, 3 - sem.available_permits());
            sleep(Duration::from_millis(500)).await;
            println!("任务 {} 完成", i);
            // _permit 被 drop 时自动释放许可
        }));
    }

    for h in handles {
        h.await.unwrap();
    }
}
```

### 16.9.2 优雅关闭

```rust
use tokio::sync::watch;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // 使用 watch channel 作为关闭信号
    let (shutdown_tx, mut shutdown_rx) = watch::channel(false);

    // 工作任务
    let worker = tokio::spawn(async move {
        let mut count = 0;
        loop {
            tokio::select! {
                _ = sleep(Duration::from_millis(200)) => {
                    count += 1;
                    println!("工作中... 已处理 {} 项", count);
                }
                _ = shutdown_rx.changed() => {
                    if *shutdown_rx.borrow() {
                        println!("收到关闭信号，正在清理...");
                        sleep(Duration::from_millis(100)).await;
                        println!("清理完成，已处理 {} 项", count);
                        break;
                    }
                }
            }
        }
    });

    // 让工作任务运行一会
    sleep(Duration::from_secs(1)).await;

    // 发送关闭信号
    println!("发送关闭信号...");
    shutdown_tx.send(true).unwrap();

    // 等待工作任务完成
    worker.await.unwrap();
    println!("程序安全退出");
}
```

### 16.9.3 异步互斥锁

```rust
use std::sync::Arc;
use tokio::sync::Mutex;

#[tokio::main]
async fn main() {
    // tokio::sync::Mutex —— 异步版本的 Mutex
    // 可以跨 .await 持有锁
    let data = Arc::new(Mutex::new(vec![1, 2, 3]));

    let mut handles = vec![];

    for i in 0..5 {
        let data = Arc::clone(&data);
        handles.push(tokio::spawn(async move {
            let mut guard = data.lock().await;  // 异步获取锁
            guard.push(i);
            println!("任务 {} 添加了元素, 当前: {:?}", i, *guard);
            // guard 被 drop 时释放锁
        }));
    }

    for h in handles {
        h.await.unwrap();
    }

    println!("最终数据: {:?}", data.lock().await);
}
```

> ⚠️ **tokio::sync::Mutex vs std::sync::Mutex**
>
> | 特性 | std::sync::Mutex | tokio::sync::Mutex |
> |------|-----------------|-------------------|
> | 跨 .await 持有 | ❌ 不安全 | ✅ 可以 |
> | 性能 | 更快 | 稍慢 |
> | 适用 | 短暂的同步操作 | 需要跨 await 点 |
>
> **规则**：如果不需要跨 `.await` 持有锁，优先用 `std::sync::Mutex`。

### 16.9.4 异步流（Stream）

```rust
use tokio::time::{interval, Duration};
use tokio_stream::{self, StreamExt}; // 需要 tokio-stream crate

#[tokio::main]
async fn main() {
    // 从迭代器创建 stream
    let mut stream = tokio_stream::iter(vec![1, 2, 3, 4, 5]);

    while let Some(value) = stream.next().await {
        println!("值: {}", value);
    }

    // interval stream
    let mut tick_stream = tokio_stream::wrappers::IntervalStream::new(
        interval(Duration::from_millis(200))
    );

    let mut count = 0;
    while let Some(_) = tick_stream.next().await {
        count += 1;
        println!("tick {}", count);
        if count >= 5 {
            break;
        }
    }
}
```

---

## 16.10 异步编程最佳实践

### 16.10.1 避免常见陷阱

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // ❌ 陷阱1：在异步任务中阻塞
    // tokio::spawn(async {
    //     std::thread::sleep(Duration::from_secs(10)); // 阻塞了整个工作线程！
    // });

    // ✅ 正确：使用 tokio::time::sleep
    tokio::spawn(async {
        sleep(Duration::from_secs(1)).await; // 非阻塞
    });

    // ✅ 或使用 spawn_blocking 处理阻塞操作
    tokio::task::spawn_blocking(|| {
        std::thread::sleep(Duration::from_secs(1)); // 在专用线程池中阻塞
    });

    // ❌ 陷阱2：忘记创建的 Future 是惰性的
    async fn important() { println!("重要操作"); }
    important(); // ⚠️ 什么都不会发生！需要 .await

    // ✅ 正确
    important().await;

    // ❌ 陷阱3：不必要的 async
    // async fn add(a: i32, b: i32) -> i32 { a + b } // 没有 .await，不需要 async
    fn add(a: i32, b: i32) -> i32 { a + b } // 更好

    println!("完成: {}", add(1, 2));
}
```

### 16.10.2 性能建议

```
1. CPU 密集型 → 使用 spawn_blocking 或 rayon
2. I/O 密集型 → 使用 async/await
3. 短暂临界区 → 使用 std::sync::Mutex
4. 跨 await 临界区 → 使用 tokio::sync::Mutex
5. 并发控制 → 使用 Semaphore
6. 优雅关闭 → 使用 watch channel + select!
7. 错误处理 → 使用 Result + ? 运算符
```

### 16.10.3 Rust 异步 vs JS 异步 总结

```
┌──────────────┬──────────────────────┬──────────────────────┐
│              │ JavaScript           │ Rust                 │
├──────────────┼──────────────────────┼──────────────────────┤
│ 运行时       │ 内置（V8 事件循环）   │ 需要选择（Tokio等）  │
│ Future/Promise│ 急切（创建即执行）   │ 惰性（需要 await）   │
│ 执行模型     │ 推（Push）           │ 拉（Pull/Poll）      │
│ 并发控制     │ Promise.all/race     │ join!/select!        │
│ 线程模型     │ 单线程               │ 多线程               │
│ 取消         │ AbortController      │ drop Future          │
│ Channel      │ EventEmitter等       │ mpsc/broadcast/watch │
│ 错误处理     │ try/catch            │ Result + ?           │
└──────────────┴──────────────────────┴──────────────────────┘
```

---

## 16.11 练习题

### 练习 1：异步倒计时器

```rust
// 实现一个异步倒计时器：
// - countdown(n) 从 n 到 1 每秒打印一个数字
// - 最后打印 "🚀 发射！"
// 使用 tokio::time::sleep
```

### 练习 2：并发 HTTP 请求模拟

```rust
// 模拟并发 HTTP 请求：
// - 有 10 个 URL 需要请求
// - 使用 tokio::spawn 并发请求
// - 限制最多同时 3 个请求（使用 Semaphore）
// - 收集并打印所有结果
// 用 tokio::time::sleep 模拟网络延迟
```

### 练习 3：聊天室服务器

```rust
// 用 tokio channel 实现简单的聊天室逻辑：
// - 使用 broadcast channel
// - 多个 "用户" 任务可以发送消息
// - 所有用户都能收到其他人的消息
// - 实现 /quit 命令退出
```

### 练习 4：超时重试

```rust
// 实现一个带超时和重试的异步函数：
// async fn fetch_with_retry(url: &str, timeout: Duration, max_retries: u32) -> Result<String, Error>
// - 每次请求有超时限制
// - 失败后自动重试，最多 max_retries 次
// - 每次重试间隔翻倍（指数退避）
```

### 练习 5：异步生产者-消费者

```rust
// 使用 tokio::sync::mpsc 实现：
// - 3 个生产者，每个每 200ms 产生一个随机数
// - 1 个消费者，收到数字后计算累计和
// - 5 秒后发送关闭信号（使用 watch channel）
// - 打印最终累计和
```

### 练习 6：对比 join! 和 spawn

```rust
// 编写两个版本的并发程序，完成相同的任务：
// 版本 A：使用 tokio::join!
// 版本 B：使用 tokio::spawn + JoinHandle
// 任务：5 个异步操作，每个耗时不同
// 对比两个版本的代码风格和适用场景
```

---

## 16.12 本章小结

在本章中，我们全面学习了 Rust 的异步编程：

1. **异步概念** —— Rust 的 Future 是惰性的（与 JS Promise 不同）
2. **Future trait** —— 异步的核心抽象，基于 poll 的拉模型
3. **async/await** —— 语法糖，让异步代码读起来像同步代码
4. **Tokio 运行时** —— Rust 异步生态的核心，相当于 JS 的事件循环
5. **tokio::spawn** —— 创建独立的异步任务，可以在不同线程上运行
6. **select! 宏** —— 同时等待多个 Future，实现超时和竞争
7. **Pin/Unpin** —— 保证自引用 Future 不被移动，日常很少直接使用
8. **异步 Channel** —— mpsc、oneshot、broadcast、watch 四种模式

> 💡 **给 JavaScript 开发者的总结：**
> 你已经掌握了 async/await 的思维模式，转到 Rust 异步编程会很自然。
> 主要区别是：Rust 的 Future 是惰性的、需要运行时、有更强的类型安全保证。
> Tokio 的生态非常成熟——HTTP（hyper/axum）、数据库（sqlx）、WebSocket（tungstenite）
> 都有高质量的异步支持。掌握了这一章，你就可以用 Rust 构建高性能的异步服务了！

恭喜你完成了智能指针、并发编程和异步编程三章的学习！
这三个主题是 Rust 高级编程的核心，掌握它们后你就能编写真正强大的 Rust 程序了。🎉
