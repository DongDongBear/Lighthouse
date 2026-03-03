# 第二十四章：Tokio 深入 —— 异步运行时的内部世界

> **本章目标**
>
> - 理解 Tokio 的架构设计，对比 Node.js 的事件循环
> - 掌握 Runtime 的配置与选择（单线程 vs 多线程）
> - 理解任务调度的工作窃取（work-stealing）机制
> - 学会使用异步 I/O（TcpStream、文件操作）
> - 掌握 Tokio 的异步同步原语（Mutex、RwLock、Semaphore、Channel）
> - 学会处理超时与任务取消
> - 通过实战构建一个异步聊天服务器

> **预计学习时间：120 - 180 分钟**（这章内容丰富，建议边读边动手实践）

---

## 24.1 Tokio 架构（对比 Node.js Event Loop）

### 24.1.1 Node.js 的事件循环回顾

作为 JavaScript 开发者，你对事件循环一定不陌生：

```javascript
// Node.js 事件循环 - 单线程
const http = require('http');

const server = http.createServer(async (req, res) => {
    // 所有请求都在同一个线程上处理
    const data = await fetchFromDB();  // 异步 I/O，不阻塞事件循环
    res.end(data);
});

server.listen(3000);

// Node.js 的事件循环：
// ┌───────────────────────────────────┐
// │           单线程事件循环            │
// │  ┌─────┐ ┌─────┐ ┌─────┐        │
// │  │ 回调1 │ │ 回调2 │ │ 回调3 │    │
// │  └─────┘ └─────┘ └─────┘        │
// │      ↓       ↓       ↓           │
// │  ┌───────────────────────┐       │
// │  │      libuv 线程池       │      │
// │  │  (文件 I/O, DNS 等)    │       │
// │  └───────────────────────┘       │
// └───────────────────────────────────┘
```

### 24.1.2 Tokio 的架构

Tokio 是一个**多线程异步运行时**，设计哲学与 Node.js 有很大不同：

```
┌────────────────────────────────────────────────────────────┐
│                     Tokio 运行时架构                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Tokio Runtime（运行时）                   │   │
│  │                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │ Worker 0 │ │ Worker 1 │ │ Worker 2 │  ...       │   │
│  │  │ (线程 0) │ │ (线程 1) │ │ (线程 2) │            │   │
│  │  │          │ │          │ │          │            │   │
│  │  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │            │   │
│  │  │ │任务队列│ │ │ │任务队列│ │ │ │任务队列│ │            │   │
│  │  │ │Task A │ │ │ │Task C │ │ │ │Task E │ │            │   │
│  │  │ │Task B │ │ │ │Task D │ │ │ │      │ │            │   │
│  │  │ └──────┘ │ │ └──────┘ │ │ └──────┘ │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  │       ↕ 工作窃取 ↕              ↕                    │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │              I/O Driver（epoll/kqueue）       │    │   │
│  │  │          监听所有异步 I/O 事件                 │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │            Timer Driver（时间轮）              │    │   │
│  │  │          管理所有 sleep/timeout               │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 24.1.3 核心区别对比

```
┌────────────────────────────────────────────────────────┐
│          Node.js vs Tokio 核心对比                       │
├──────────────────┬─────────────────────────────────────┤
│                  │  Node.js          │  Tokio           │
├──────────────────┼───────────────────┼──────────────────┤
│ 线程模型         │ 单线程 + 线程池    │ 多线程工作窃取    │
│ CPU 利用         │ 单核（需 cluster） │ 自动多核          │
│ 调度单位         │ 回调/Promise       │ Future/Task       │
│ I/O 模型         │ libuv             │ epoll/kqueue      │
│ 阻塞操作         │ 不要在主线程做！   │ spawn_blocking    │
│ 内存开销/任务    │ ~数 KB（闭包）     │ ~数百字节（状态机）│
│ 取消机制         │ AbortController    │ drop JoinHandle   │
│ 错误传播         │ try/catch, .catch │ Result + ?        │
│ 生态系统         │ npm（巨大）        │ crates.io（增长中）│
└──────────────────┴───────────────────┴──────────────────┘
```

### 24.1.4 Tokio 的核心组件

```rust
// Tokio 的三大核心组件

// 1. Runtime（运行时）—— 管理线程和调度
use tokio::runtime::Runtime;

// 2. Task（任务）—— 异步操作的最小单位
use tokio::task;

// 3. I/O Driver —— 处理异步 I/O
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
```

---

## 24.2 Runtime 配置

### 24.2.1 两种运行时模式

Tokio 提供两种运行时模式：

```rust
// 模式 1：多线程运行时（默认）
// 适合 CPU 密集 + I/O 混合的场景
#[tokio::main]  // 这个宏展开后创建多线程运行时
async fn main() {
    println!("运行在多线程运行时上！");
}

// 等价于手动创建：
fn main() {
    let rt = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(4)      // 工作线程数，默认等于 CPU 核心数
        .enable_all()           // 启用所有功能（I/O + 时间）
        .build()
        .unwrap();

    rt.block_on(async {
        println!("运行在多线程运行时上！");
    });
}
```

```rust
// 模式 2：当前线程运行时（单线程）
// 适合轻量级场景、测试、嵌入式
#[tokio::main(flavor = "current_thread")]
async fn main() {
    println!("运行在单线程运行时上！");
}

// 等价于：
fn main() {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();

    rt.block_on(async {
        println!("运行在单线程运行时上！");
    });
}
```

### 24.2.2 运行时配置详解

```rust
use tokio::runtime::Builder;

fn create_custom_runtime() -> tokio::runtime::Runtime {
    Builder::new_multi_thread()
        // 工作线程数
        .worker_threads(8)

        // 阻塞线程池的最大线程数
        // 用于 spawn_blocking 任务
        .max_blocking_threads(32)

        // 线程名称前缀（调试用）
        .thread_name("my-app-worker")

        // 线程栈大小（默认 2MB）
        .thread_stack_size(4 * 1024 * 1024)  // 4MB

        // 启用 I/O 驱动
        .enable_io()

        // 启用时间驱动
        .enable_time()

        .build()
        .expect("无法创建运行时")
}
```

### 24.2.3 何时选择哪种运行时？

```
┌──────────────────────────────────────────────────────┐
│           如何选择运行时模式？                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  多线程运行时（默认）：                                 │
│  ├─ Web 服务器                                       │
│  ├─ 微服务                                           │
│  ├─ 需要充分利用多核 CPU                              │
│  ├─ 任务之间相对独立                                  │
│  └─ 大多数生产场景                                    │
│                                                      │
│  单线程运行时：                                       │
│  ├─ 单元测试                                         │
│  ├─ 简单的 CLI 工具                                  │
│  ├─ 嵌入式系统                                       │
│  ├─ 需要确定性调度                                    │
│  ├─ 与非 Send 类型配合                               │
│  └─ 最小化开销                                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 24.3 任务调度

### 24.3.1 tokio::spawn —— 创建异步任务

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // spawn 创建一个新的异步任务
    // 任务会被调度到运行时的某个工作线程上
    let handle = tokio::spawn(async {
        sleep(Duration::from_secs(1)).await;
        println!("任务完成！");
        42  // 返回值
    });

    // 等待任务完成并获取返回值
    let result = handle.await.unwrap();
    println!("结果: {}", result);

    // 并发运行多个任务
    let mut handles = vec![];
    for i in 0..5 {
        let handle = tokio::spawn(async move {
            sleep(Duration::from_millis(100 * i as u64)).await;
            println!("任务 {} 完成", i);
            i * 10
        });
        handles.push(handle);
    }

    // 等待所有任务
    for handle in handles {
        let result = handle.await.unwrap();
        println!("结果: {}", result);
    }
}
```

对比 Node.js 的 Promise.all：

```javascript
// Node.js
async function main() {
    const tasks = [];
    for (let i = 0; i < 5; i++) {
        tasks.push(new Promise(resolve => {
            setTimeout(() => {
                console.log(`任务 ${i} 完成`);
                resolve(i * 10);
            }, 100 * i);
        }));
    }

    const results = await Promise.all(tasks);
    console.log('结果:', results);
}
```

### 24.3.2 工作窃取调度

```
┌──────────────────────────────────────────────────────────┐
│              工作窃取（Work Stealing）调度                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  线程 A（忙碌）          线程 B（空闲）                     │
│  ┌──────────────┐      ┌──────────────┐                 │
│  │ Task 1 ████  │      │              │                 │
│  │ Task 2 ██    │  ──→ │ Task 4 ██    │ ← 从线程 A 偷来  │
│  │ Task 3 █     │      │              │                 │
│  │ Task 4       │      │              │                 │
│  └──────────────┘      └──────────────┘                 │
│                                                          │
│  工作窃取的好处：                                          │
│  1. 自动负载均衡 —— 空闲线程主动找活干                      │
│  2. 减少饥饿 —— 没有任务会等太久                           │
│  3. 提高 CPU 利用率                                       │
│  4. 对比 Node.js 的单线程，可以利用多核                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 24.3.3 spawn_blocking —— 处理阻塞操作

**重要：** 永远不要在异步任务中执行阻塞操作！这会阻塞整个工作线程。

```rust
use tokio::task;
use std::time::Duration;

#[tokio::main]
async fn main() {
    // ❌ 错误：在异步代码中使用阻塞操作
    // std::thread::sleep(Duration::from_secs(5));  // 会阻塞工作线程！

    // ✅ 正确：使用 tokio::time::sleep
    tokio::time::sleep(Duration::from_secs(1)).await;

    // ✅ 正确：对于必须阻塞的操作，使用 spawn_blocking
    let result = task::spawn_blocking(|| {
        // 这段代码在专门的阻塞线程池中运行
        // 不会阻塞 Tokio 的工作线程
        std::thread::sleep(Duration::from_secs(2));

        // 计算密集型操作也应该放在这里
        let mut sum = 0u64;
        for i in 0..1_000_000 {
            sum += i;
        }
        sum
    }).await.unwrap();

    println!("计算结果: {}", result);

    // 常见需要 spawn_blocking 的场景：
    // 1. 同步文件 I/O（std::fs）
    // 2. CPU 密集型计算
    // 3. 调用阻塞的 C 库
    // 4. 密码哈希（bcrypt 等）
}
```

### 24.3.4 tokio::join! 和 tokio::select!

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // join! —— 并发等待多个 future，全部完成后返回
    // 类似 Promise.all
    let (r1, r2, r3) = tokio::join!(
        async {
            sleep(Duration::from_millis(100)).await;
            "任务1完成"
        },
        async {
            sleep(Duration::from_millis(200)).await;
            "任务2完成"
        },
        async {
            sleep(Duration::from_millis(150)).await;
            "任务3完成"
        }
    );
    println!("{}, {}, {}", r1, r2, r3);

    // select! —— 等待多个 future，第一个完成的就返回
    // 类似 Promise.race
    tokio::select! {
        _ = sleep(Duration::from_secs(1)) => {
            println!("1 秒超时");
        }
        _ = sleep(Duration::from_millis(500)) => {
            println!("500ms 先完成！");  // 这个会被执行
        }
    }
}
```

### 24.3.5 任务的 Send 约束

```rust
use std::rc::Rc;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // 多线程运行时中，spawn 的 future 必须是 Send
    // 因为任务可能在不同线程间迁移

    // ❌ Rc 不是 Send
    // let rc = Rc::new(42);
    // tokio::spawn(async move {
    //     println!("{}", rc);  // 编译错误：Rc 不是 Send
    // });

    // ✅ Arc 是 Send
    let arc = Arc::new(42);
    tokio::spawn(async move {
        println!("{}", arc);  // OK
    }).await.unwrap();

    // ❌ 持有 MutexGuard 跨 await 点
    // let mutex = std::sync::Mutex::new(0);
    // tokio::spawn(async {
    //     let lock = mutex.lock().unwrap();
    //     some_async_fn().await;  // ❌ MutexGuard 跨 await 不是 Send
    //     drop(lock);
    // });

    // ✅ 使用 tokio::sync::Mutex 或限制 guard 的作用域
    let mutex = Arc::new(tokio::sync::Mutex::new(0));
    let m = mutex.clone();
    tokio::spawn(async move {
        let mut lock = m.lock().await;
        *lock += 1;
        // lock 在这里 drop，然后才 await
    }).await.unwrap();
}
```

---

## 24.4 异步 I/O

### 24.4.1 TcpStream —— 异步 TCP

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 创建 TCP 监听器
    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    println!("服务器监听在 127.0.0.1:8080");

    loop {
        // 接受新连接
        let (mut socket, addr) = listener.accept().await?;
        println!("新连接来自: {}", addr);

        // 为每个连接创建一个新任务
        tokio::spawn(async move {
            let mut buf = [0u8; 1024];

            loop {
                // 异步读取数据
                let n = match socket.read(&mut buf).await {
                    Ok(0) => {
                        println!("{} 断开连接", addr);
                        return;
                    }
                    Ok(n) => n,
                    Err(e) => {
                        eprintln!("读取错误: {}", e);
                        return;
                    }
                };

                // 异步写回数据（回声服务器）
                if let Err(e) = socket.write_all(&buf[..n]).await {
                    eprintln!("写入错误: {}", e);
                    return;
                }
            }
        });
    }
}
```

对比 Node.js 的 TCP 服务器：

```javascript
// Node.js 的 TCP 回声服务器
const net = require('net');

const server = net.createServer((socket) => {
    console.log('新连接:', socket.remoteAddress);

    socket.on('data', (data) => {
        socket.write(data);  // 回声
    });

    socket.on('end', () => {
        console.log('断开连接');
    });
});

server.listen(8080, () => {
    console.log('监听在 8080');
});
```

### 24.4.2 异步文件操作

```rust
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufReader, AsyncBufReadExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 写文件
    fs::write("hello.txt", "你好，Tokio！").await?;

    // 读文件
    let content = fs::read_to_string("hello.txt").await?;
    println!("文件内容: {}", content);

    // 追加写入
    let mut file = fs::OpenOptions::new()
        .append(true)
        .open("hello.txt")
        .await?;
    file.write_all(b"\n第二行内容").await?;

    // 逐行读取
    let file = fs::File::open("hello.txt").await?;
    let reader = BufReader::new(file);
    let mut lines = reader.lines();

    while let Some(line) = lines.next_line().await? {
        println!("行: {}", line);
    }

    // 复制文件
    fs::copy("hello.txt", "hello_copy.txt").await?;

    // 删除文件
    fs::remove_file("hello_copy.txt").await?;

    // 创建目录
    fs::create_dir_all("data/subdir").await?;

    // 列出目录
    let mut entries = fs::read_dir("data").await?;
    while let Some(entry) = entries.next_entry().await? {
        println!("  {:?} - {:?}", entry.file_name(), entry.file_type().await?);
    }

    // 清理
    fs::remove_dir_all("data").await?;
    fs::remove_file("hello.txt").await?;

    Ok(())
}
```

### 24.4.3 异步 HTTP 客户端（reqwest）

```rust
// Cargo.toml:
// [dependencies]
// reqwest = { version = "0.12", features = ["json"] }
// serde = { version = "1", features = ["derive"] }
// serde_json = "1"

use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct Todo {
    id: u32,
    title: String,
    completed: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // GET 请求
    let resp = reqwest::get("https://jsonplaceholder.typicode.com/todos/1")
        .await?
        .json::<Todo>()
        .await?;
    println!("Todo: {:?}", resp);

    // 并发请求
    let urls = vec![
        "https://jsonplaceholder.typicode.com/todos/1",
        "https://jsonplaceholder.typicode.com/todos/2",
        "https://jsonplaceholder.typicode.com/todos/3",
    ];

    let mut handles = vec![];
    for url in urls {
        handles.push(tokio::spawn(async move {
            reqwest::get(url).await?.json::<Todo>().await
        }));
    }

    for handle in handles {
        match handle.await? {
            Ok(todo) => println!("获取到: {:?}", todo),
            Err(e) => eprintln!("请求失败: {}", e),
        }
    }

    Ok(())
}
```

---

## 24.5 异步同步原语（tokio::sync）

### 24.5.1 为什么需要异步同步原语？

```rust
// ❌ 不要在异步代码中使用 std::sync::Mutex
// 因为 lock() 是阻塞的，会阻塞工作线程
// use std::sync::Mutex;

// ✅ 使用 tokio::sync::Mutex
// 它的 lock() 是异步的，不会阻塞工作线程
use tokio::sync::Mutex;
```

### 24.5.2 tokio::sync::Mutex

```rust
use std::sync::Arc;
use tokio::sync::Mutex;

#[tokio::main]
async fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = counter.clone();
        handles.push(tokio::spawn(async move {
            for _ in 0..100 {
                let mut lock = counter.lock().await;  // 异步获取锁
                *lock += 1;
                // lock 在这里自动释放
            }
        }));
    }

    for handle in handles {
        handle.await.unwrap();
    }

    println!("最终计数: {}", *counter.lock().await);  // 1000
}
```

**注意：** 如果你的锁操作不跨 `.await` 点，用 `std::sync::Mutex` 反而更好（开销更小）：

```rust
use std::sync::{Arc, Mutex};

#[tokio::main]
async fn main() {
    let data = Arc::new(Mutex::new(vec![]));

    let d = data.clone();
    tokio::spawn(async move {
        // 锁的作用域不跨 await —— 用 std::sync::Mutex 即可
        {
            let mut lock = d.lock().unwrap();
            lock.push(42);
        }  // lock 在 await 之前释放

        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }).await.unwrap();
}
```

### 24.5.3 tokio::sync::RwLock

```rust
use std::sync::Arc;
use tokio::sync::RwLock;

#[tokio::main]
async fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));

    // 多个读取者可以同时获取读锁
    let d1 = data.clone();
    let d2 = data.clone();

    let reader1 = tokio::spawn(async move {
        let lock = d1.read().await;
        println!("读取者 1: {:?}", *lock);
    });

    let reader2 = tokio::spawn(async move {
        let lock = d2.read().await;
        println!("读取者 2: {:?}", *lock);
    });

    // 写入者需要独占锁
    let d3 = data.clone();
    let writer = tokio::spawn(async move {
        let mut lock = d3.write().await;
        lock.push(4);
        println!("写入者完成: {:?}", *lock);
    });

    let _ = tokio::join!(reader1, reader2, writer);
}
```

### 24.5.4 Channel（通道）

Tokio 提供了多种异步通道，对比 Node.js 的 EventEmitter：

```rust
use tokio::sync::{mpsc, oneshot, broadcast, watch};

#[tokio::main]
async fn main() {
    // === mpsc: 多生产者、单消费者 ===
    // 最常用的通道类型
    println!("--- mpsc 通道 ---");
    let (tx, mut rx) = mpsc::channel::<String>(32);  // 缓冲区大小 32

    // 多个生产者
    for i in 0..3 {
        let tx = tx.clone();
        tokio::spawn(async move {
            tx.send(format!("消息来自生产者 {}", i)).await.unwrap();
        });
    }
    drop(tx);  // 释放原始发送端

    while let Some(msg) = rx.recv().await {
        println!("收到: {}", msg);
    }

    // === oneshot: 单次发送通道 ===
    // 适合请求-响应模式
    println!("\n--- oneshot 通道 ---");
    let (tx, rx) = oneshot::channel::<String>();

    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        tx.send("一次性结果".to_string()).unwrap();
    });

    let result = rx.await.unwrap();
    println!("收到: {}", result);

    // === broadcast: 广播通道 ===
    // 多生产者、多消费者，每个消费者都能收到所有消息
    println!("\n--- broadcast 通道 ---");
    let (tx, _) = broadcast::channel::<String>(16);
    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();

    tx.send("广播消息！".to_string()).unwrap();

    println!("rx1 收到: {}", rx1.recv().await.unwrap());
    println!("rx2 收到: {}", rx2.recv().await.unwrap());

    // === watch: 状态观察通道 ===
    // 只保留最新值，适合配置变更通知
    println!("\n--- watch 通道 ---");
    let (tx, mut rx) = watch::channel("初始状态".to_string());

    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        tx.send("更新后的状态".to_string()).unwrap();
    });

    // 等待值变化
    rx.changed().await.unwrap();
    println!("状态变为: {}", *rx.borrow());
}
```

### 24.5.5 Semaphore（信号量）

```rust
use std::sync::Arc;
use tokio::sync::Semaphore;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // 信号量：限制并发数
    // 类似于连接池、限流器
    let semaphore = Arc::new(Semaphore::new(3));  // 最多 3 个并发

    let mut handles = vec![];
    for i in 0..10 {
        let sem = semaphore.clone();
        handles.push(tokio::spawn(async move {
            // 获取许可
            let _permit = sem.acquire().await.unwrap();
            println!("[{:?}] 任务 {} 开始（剩余许可: {}）",
                     std::time::Instant::now(), i, sem.available_permits());

            // 模拟工作
            sleep(Duration::from_millis(500)).await;

            println!("[{:?}] 任务 {} 结束",
                     std::time::Instant::now(), i);
            // _permit 被 drop 时自动释放许可
        }));
    }

    for handle in handles {
        handle.await.unwrap();
    }
}
```

### 24.5.6 Notify（通知）

```rust
use std::sync::Arc;
use tokio::sync::Notify;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let notify = Arc::new(Notify::new());
    let notify_clone = notify.clone();

    // 等待通知的任务
    let waiter = tokio::spawn(async move {
        println!("等待通知...");
        notify_clone.notified().await;
        println!("收到通知！继续执行");
    });

    // 发送通知
    sleep(Duration::from_secs(1)).await;
    println!("发送通知！");
    notify.notify_one();

    waiter.await.unwrap();
}
```

---

## 24.6 超时与取消

### 24.6.1 超时处理

```rust
use tokio::time::{timeout, Duration};

#[tokio::main]
async fn main() {
    // 方法 1：tokio::time::timeout
    let result = timeout(
        Duration::from_secs(2),
        async {
            // 模拟一个慢操作
            tokio::time::sleep(Duration::from_secs(5)).await;
            "完成"
        }
    ).await;

    match result {
        Ok(value) => println!("成功: {}", value),
        Err(_) => println!("超时！"),  // 这个会被执行
    }

    // 方法 2：tokio::select! 实现超时
    tokio::select! {
        result = async {
            tokio::time::sleep(Duration::from_secs(5)).await;
            "完成"
        } => {
            println!("成功: {}", result);
        }
        _ = tokio::time::sleep(Duration::from_secs(2)) => {
            println!("超时了！");  // 这个会被执行
        }
    }
}
```

### 24.6.2 取消任务

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let handle = tokio::spawn(async {
        println!("任务开始...");
        sleep(Duration::from_secs(10)).await;
        println!("任务完成");  // 不会被执行
    });

    // 等 1 秒后取消任务
    sleep(Duration::from_secs(1)).await;
    handle.abort();  // 取消任务
    println!("任务已取消");

    // 检查任务是否被取消
    match handle.await {
        Ok(_) => println!("正常完成"),
        Err(e) if e.is_cancelled() => println!("确认已取消"),
        Err(e) => println!("其他错误: {}", e),
    }
}
```

### 24.6.3 优雅关闭（Graceful Shutdown）

```rust
use tokio::signal;
use tokio::sync::broadcast;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    let (shutdown_tx, _) = broadcast::channel::<()>(1);

    // 启动多个工作任务
    for i in 0..3 {
        let mut shutdown_rx = shutdown_tx.subscribe();
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = async {
                        // 正常工作
                        sleep(Duration::from_secs(1)).await;
                        println!("工作者 {} 完成一轮", i);
                    } => {}
                    _ = shutdown_rx.recv() => {
                        println!("工作者 {} 收到关闭信号，清理中...", i);
                        // 执行清理工作
                        sleep(Duration::from_millis(100)).await;
                        println!("工作者 {} 已关闭", i);
                        return;
                    }
                }
            }
        });
    }

    // 等待 Ctrl+C
    println!("按 Ctrl+C 关闭...");
    signal::ctrl_c().await.expect("无法监听 Ctrl+C");
    println!("\n收到关闭信号！");

    // 通知所有工作者关闭
    drop(shutdown_tx);  // 关闭发送端会通知所有接收端

    // 给工作者一些时间完成清理
    sleep(Duration::from_secs(1)).await;
    println!("服务器已关闭");
}
```

---

## 24.7 实战：异步聊天服务器

让我们把学到的知识综合起来，构建一个完整的异步聊天服务器：

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::broadcast;
use std::net::SocketAddr;

/// 聊天消息类型
#[derive(Clone, Debug)]
struct ChatMessage {
    /// 发送者地址
    sender: SocketAddr,
    /// 消息内容
    content: String,
}

/// 处理单个客户端连接
async fn handle_client(
    stream: TcpStream,
    addr: SocketAddr,
    tx: broadcast::Sender<ChatMessage>,
) {
    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);
    let mut rx = tx.subscribe();

    // 发送欢迎消息
    let welcome = format!("欢迎来到聊天室！你的地址是 {}\n", addr);
    if writer.write_all(welcome.as_bytes()).await.is_err() {
        return;
    }

    // 广播新用户加入
    let _ = tx.send(ChatMessage {
        sender: addr,
        content: format!("[系统] {} 加入了聊天室", addr),
    });

    let mut line = String::new();

    loop {
        tokio::select! {
            // 从客户端读取消息
            result = reader.read_line(&mut line) => {
                match result {
                    Ok(0) => {
                        // 连接关闭
                        let _ = tx.send(ChatMessage {
                            sender: addr,
                            content: format!("[系统] {} 离开了聊天室", addr),
                        });
                        return;
                    }
                    Ok(_) => {
                        let msg = line.trim().to_string();
                        if !msg.is_empty() {
                            // 广播消息给所有人
                            let _ = tx.send(ChatMessage {
                                sender: addr,
                                content: format!("[{}] {}", addr, msg),
                            });
                        }
                        line.clear();
                    }
                    Err(e) => {
                        eprintln!("读取错误 {}: {}", addr, e);
                        return;
                    }
                }
            }

            // 接收其他人的消息并转发给当前客户端
            result = rx.recv() => {
                match result {
                    Ok(msg) => {
                        // 不转发自己的消息
                        if msg.sender != addr {
                            let formatted = format!("{}\n", msg.content);
                            if writer.write_all(formatted.as_bytes()).await.is_err() {
                                return;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        let warning = format!("[系统] 你错过了 {} 条消息\n", n);
                        let _ = writer.write_all(warning.as_bytes()).await;
                    }
                    Err(_) => return,
                }
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:6379").await?;
    println!("🚀 聊天服务器启动在 127.0.0.1:6379");
    println!("📝 用 telnet 或 nc 连接: nc 127.0.0.1 6379");

    // 创建广播通道
    let (tx, _) = broadcast::channel::<ChatMessage>(100);

    loop {
        let (stream, addr) = listener.accept().await?;
        println!("新连接: {}", addr);

        let tx = tx.clone();
        tokio::spawn(handle_client(stream, addr, tx));
    }
}
```

使用方法：

```bash
# 终端 1：启动服务器
cargo run

# 终端 2：连接客户端 A
nc 127.0.0.1 6379

# 终端 3：连接客户端 B
nc 127.0.0.1 6379

# 在任一客户端输入消息，另一个客户端会收到
```

---

## 24.8 实战练习

### 练习 1：异步限流器

实现一个基于令牌桶算法的异步限流器：

```rust
use std::sync::Arc;
use tokio::sync::Semaphore;
use tokio::time::{sleep, Duration, interval};

struct RateLimiter {
    // TODO: 使用 Semaphore 实现
    // 每秒补充指定数量的许可
}

impl RateLimiter {
    fn new(rate_per_second: u32) -> Arc<Self> {
        // TODO: 实现
        todo!()
    }

    async fn acquire(&self) {
        // TODO: 获取一个许可（如果没有许可则等待）
        todo!()
    }
}

#[tokio::main]
async fn main() {
    let limiter = RateLimiter::new(5);  // 每秒最多 5 个请求

    for i in 0..20 {
        let limiter = limiter.clone();
        tokio::spawn(async move {
            limiter.acquire().await;
            println!("[{:?}] 请求 {} 被处理", std::time::Instant::now(), i);
        });
    }

    sleep(Duration::from_secs(5)).await;
}
```

### 练习 2：异步任务池

```rust
// 实现一个固定大小的异步任务池
// 类似 Node.js 的 p-limit

struct TaskPool {
    // TODO: 使用 Semaphore 限制并发数
}

impl TaskPool {
    fn new(concurrency: usize) -> Self {
        todo!()
    }

    async fn run<F, T>(&self, task: F) -> T
    where
        F: std::future::Future<Output = T>,
    {
        // TODO: 获取许可后执行任务
        todo!()
    }
}
```

### 练习 3：增强聊天服务器

在上面的聊天服务器基础上，添加以下功能：

1. **用户昵称**：连接后先输入昵称
2. **私聊命令**：`/msg <用户> <内容>` 发送私聊消息
3. **在线列表**：`/who` 查看在线用户
4. **踢人命令**：`/kick <用户>` 踢出用户

### 练习 4：思考题

1. `tokio::sync::Mutex` 和 `std::sync::Mutex` 的核心区别是什么？什么时候用哪个？
2. 为什么 `tokio::spawn` 要求 future 是 `Send + 'static`？
3. `select!` 中被取消的分支（没有被选中的）会怎样？
4. 在高并发场景下，`broadcast` 和 `mpsc` 通道各有什么优缺点？
5. 如何优雅地处理 TCP 连接的半关闭（half-close）？

---

## 24.9 本章小结

```
┌──────────────────────────────────────────────────────┐
│              Tokio 深入小结                             │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Tokio 架构：                                         │
│  - 多线程工作窃取调度器                                │
│  - I/O 驱动 + 时间驱动                                │
│  - 对比 Node.js：多线程、零成本、更可控                 │
│                                                      │
│  核心 API：                                           │
│  - tokio::spawn → 创建异步任务                         │
│  - tokio::join! → 并发等待（Promise.all）              │
│  - tokio::select! → 竞争等待（Promise.race）           │
│  - spawn_blocking → 处理阻塞操作                      │
│                                                      │
│  同步原语：                                            │
│  - Mutex/RwLock → 异步锁                              │
│  - mpsc → 多生产者单消费者通道                         │
│  - broadcast → 广播通道                               │
│  - watch → 状态观察通道                               │
│  - Semaphore → 限制并发数                             │
│                                                      │
│  最佳实践：                                            │
│  ✅ 不要在异步代码中阻塞                               │
│  ✅ 短锁用 std::sync，跨 await 用 tokio::sync          │
│  ✅ 正确处理超时和取消                                 │
│  ✅ 实现优雅关闭                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

> **下一章预告：** 第二十五章我们将探索 Rust 的性能优化 —— 从编译优化到基准测试，从火焰图到零拷贝技术，让你的代码飞起来！
