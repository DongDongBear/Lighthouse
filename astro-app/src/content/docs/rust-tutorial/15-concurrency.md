# 第十五章：并发编程 —— 无畏并发的力量

> **本章目标**
>
> - 理解并发与并行的区别
> - 掌握 Rust 线程的创建与管理（对比 JS 单线程 + Worker）
> - 深入理解 `thread::spawn` 与 `JoinHandle`
> - 掌握 `move` 闭包在线程中的使用
> - 理解消息传递模型：`channel`（对比 JS 的 EventEmitter）
> - 掌握共享状态：`Mutex&lt;T&gt;` 和 `Arc&lt;Mutex&lt;T&gt;&gt;`
> - 了解原子类型 `Atomic*` 的使用场景
> - 理解 `Send` 和 `Sync` trait 的含义
> - 通过练习题巩固并发编程知识

> **预计学习时间：150 - 200 分钟**（并发是 Rust 最引以为傲的领域，编译器帮你消灭数据竞争）

---

## 15.1 为什么 Rust 的并发如此特别？—— 从 JavaScript 说起

### 15.1.1 JavaScript 的并发模型：单线程 + 事件循环

作为 JavaScript 开发者，你对并发的理解大概是这样的：

```javascript
// JavaScript - 单线程，通过事件循环处理"并发"
console.log("开始");

setTimeout(() => {
    console.log("定时器回调");  // 这不是真正的并行！
}, 1000);

fetch("https://api.example.com/data")
    .then(data => console.log("API 响应"));  // 异步，但还是单线程

console.log("结束");

// 输出顺序：开始 → 结束 → 定时器回调 → API 响应
// 所有代码都在同一个线程上执行
```

JavaScript 的"并发"实际上是**并发（Concurrency）** 而非**并行（Parallelism）**：

```
JavaScript 的并发（单核）：
线程 ─── A ─── B ─── A ─── C ─── B ───→ 时间
（任务交替执行，但任意时刻只有一个任务在跑）

真正的并行（多核）：
线程1 ── A ──── A ──── A ────→
线程2 ── B ──── B ──── B ────→  同时执行！
线程3 ── C ──── C ──── C ────→
```

### 15.1.2 JavaScript 的 Web Worker

JavaScript 确实有多线程——Web Worker（Node.js 中是 worker_threads）：

```javascript
// JavaScript - Web Worker 实现真正的多线程
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ data: [1, 2, 3, 4, 5] });
worker.onmessage = (event) => {
    console.log('Worker 计算结果:', event.data);
};

// worker.js
self.onmessage = (event) => {
    const sum = event.data.data.reduce((a, b) => a + b, 0);
    self.postMessage(sum);
};
```

但 Worker 的限制很多：
- 不能共享内存（只能通过消息传递）
- 创建成本高
- API 受限

### 15.1.3 Rust 的并发哲学：无畏并发

Rust 的核心承诺是**无畏并发（Fearless Concurrency）**：

- **编译时**检测数据竞争
- 类型系统保证线程安全
- 共享内存和消息传递都支持
- 零成本抽象——不用的东西不付费

```rust
use std::thread;

fn main() {
    // 创建一个新线程 —— 就是这么简单
    let handle = thread::spawn(|| {
        println!("你好，来自新线程！");
    });

    println!("你好，来自主线程！");

    // 等待新线程完成
    handle.join().unwrap();
}
```

---

## 15.2 线程基础：`thread::spawn` 与 `JoinHandle`

### 15.2.1 创建线程

```rust
use std::thread;
use std::time::Duration;

fn main() {
    // spawn 接收一个闭包，返回 JoinHandle
    let handle = thread::spawn(|| {
        for i in 1..=5 {
            println!("👷 工作线程: 计数 {}", i);
            thread::sleep(Duration::from_millis(100));
        }
    });

    // 主线程同时运行
    for i in 1..=3 {
        println!("🏠 主线程: 计数 {}", i);
        thread::sleep(Duration::from_millis(150));
    }

    // join() 等待线程完成
    // unwrap() 处理可能的 panic
    handle.join().unwrap();
    println!("所有线程完成！");
}

// 可能的输出（顺序不确定！）：
// 🏠 主线程: 计数 1
// 👷 工作线程: 计数 1
// 👷 工作线程: 计数 2
// 🏠 主线程: 计数 2
// 👷 工作线程: 计数 3
// 🏠 主线程: 计数 3
// 👷 工作线程: 计数 4
// 👷 工作线程: 计数 5
// 所有线程完成！
```

### 15.2.2 JoinHandle 详解

```rust
use std::thread;

fn main() {
    // JoinHandle<T> 中的 T 是线程返回值的类型
    let handle: thread::JoinHandle<i32> = thread::spawn(|| {
        // 进行一些计算
        let sum: i32 = (1..=100).sum();
        println!("线程计算完毕");
        sum // 返回值
    });

    // join() 返回 Result<T, Box<dyn Any + Send>>
    match handle.join() {
        Ok(result) => println!("线程返回: {}", result), // 5050
        Err(e) => println!("线程 panic 了: {:?}", e),
    }
}
```

### 15.2.3 多线程并行计算

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 将数据分成两半，两个线程并行计算
    let mid = data.len() / 2;
    let first_half = data[..mid].to_vec();
    let second_half = data[mid..].to_vec();

    let handle1 = thread::spawn(move || {
        let sum: i32 = first_half.iter().sum();
        println!("线程1 计算前半部分: {}", sum);
        sum
    });

    let handle2 = thread::spawn(move || {
        let sum: i32 = second_half.iter().sum();
        println!("线程2 计算后半部分: {}", sum);
        sum
    });

    let sum1 = handle1.join().unwrap();
    let sum2 = handle2.join().unwrap();

    println!("总和: {} + {} = {}", sum1, sum2, sum1 + sum2); // 15 + 40 = 55
}
```

对比 JavaScript 的 Worker：

```javascript
// JavaScript - 需要复杂的 Worker 设置
// Rust 只需要 thread::spawn + move 闭包，简洁多了！
```

### 15.2.4 线程 Builder：自定义线程

```rust
use std::thread;

fn main() {
    // 使用 Builder 自定义线程属性
    let builder = thread::Builder::new()
        .name("计算线程".to_string())  // 设置线程名称
        .stack_size(8 * 1024 * 1024);  // 设置栈大小（8MB）

    let handle = builder.spawn(|| {
        // 获取当前线程信息
        let current = thread::current();
        println!("线程名称: {:?}", current.name()); // Some("计算线程")
        println!("线程 ID: {:?}", current.id());

        42
    }).unwrap();

    println!("结果: {}", handle.join().unwrap());
}
```

### 15.2.5 线程数量与硬件

```rust
use std::thread;

fn main() {
    // 获取可用的 CPU 核心数
    let num_cpus = thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);

    println!("可用 CPU 核心数: {}", num_cpus);

    // 根据核心数创建线程池
    let mut handles = vec![];
    for i in 0..num_cpus {
        let handle = thread::spawn(move || {
            println!("线程 {} 在 CPU 核心上运行", i);
            // 模拟工作
            let result: u64 = (0..1_000_000).sum();
            result
        });
        handles.push(handle);
    }

    let total: u64 = handles.into_iter()
        .map(|h| h.join().unwrap())
        .sum();

    println!("所有线程总和: {}", total);
}
```

---

## 15.3 `move` 闭包与线程

### 15.3.1 为什么线程需要 `move`？

线程可能比创建它的作用域活得更久，所以必须**拥有**它使用的数据：

```rust
use std::thread;

fn main() {
    let name = String::from("动动");

    // ❌ 编译错误！闭包借用了 name，但 name 可能在线程结束前被释放
    // let handle = thread::spawn(|| {
    //     println!("你好, {}!", name);
    // });

    // ✅ 使用 move 将 name 的所有权移动到闭包中
    let handle = thread::spawn(move || {
        println!("你好, {}!", name);  // name 现在属于这个闭包
    });

    // ❌ name 已经被移动，不能再使用
    // println!("{}", name); // 编译错误！

    handle.join().unwrap();
}
```

为什么编译器要求这样做？

```
没有 move 的情况：
主线程作用域：  |--- name 存在 ---|  name 被释放
子线程：        |---- 使用 name -------| 💥 悬空引用！

有 move 的情况：
主线程：        |--- name 移动到子线程 ---|
子线程：        |--- 拥有 name，安全使用 ---|  name 随子线程释放
```

### 15.3.2 move 与 Clone 的选择

如果主线程也需要使用数据，先 clone 再 move：

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3, 4, 5];

    // 克隆数据给线程
    let data_for_thread = data.clone();

    let handle = thread::spawn(move || {
        let sum: i32 = data_for_thread.iter().sum();
        println!("线程计算: sum = {}", sum);
    });

    // 主线程仍然可以使用原始数据
    println!("主线程的数据: {:?}", data);

    handle.join().unwrap();
}
```

### 15.3.3 move 闭包捕获多个变量

```rust
use std::thread;

fn main() {
    let name = String::from("动动");
    let age = 28;        // i32 实现了 Copy
    let hobbies = vec!["编程", "游戏"];

    // move 会移动所有被使用的变量
    let handle = thread::spawn(move || {
        // name: String，被移动
        // age: i32，被复制（因为 Copy）
        // hobbies: Vec，被移动
        println!("{} 今年 {} 岁", name, age);
        println!("爱好: {:?}", hobbies);
    });

    // name 和 hobbies 已被移动，不能使用
    // 但 age 是 Copy 的，还可以用
    println!("age 还在: {}", age); // ✅

    handle.join().unwrap();
}
```

### 15.3.4 闭包与线程安全

```rust
use std::thread;
use std::sync::Arc;

fn main() {
    // 使用 Arc 在多个线程间共享数据（而不是 clone 整份数据）
    let config = Arc::new(vec![
        "database_url=localhost:5432".to_string(),
        "max_connections=100".to_string(),
    ]);

    let mut handles = vec![];

    for i in 0..3 {
        let config = Arc::clone(&config); // 克隆 Arc（只是增加引用计数）
        let handle = thread::spawn(move || {
            println!("线程 {} 读取配置: {:?}", i, config);
        });
        handles.push(handle);
    }

    for h in handles {
        h.join().unwrap();
    }
}
```

---

## 15.4 消息传递：Channel（对比 EventEmitter）

### 15.4.1 什么是 Channel？

Rust 的 channel 实现了**多生产者，单消费者（MPSC）** 模式：

```
生产者1 ──┐
           ├──→ Channel ──→ 消费者
生产者2 ──┘
```

对比 JavaScript 的 EventEmitter：

```javascript
// JavaScript EventEmitter
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('data', (msg) => {
    console.log('收到:', msg);
});

emitter.emit('data', '你好');
emitter.emit('data', '世界');
```

Rust 的 channel：

```rust
use std::sync::mpsc;  // mpsc = Multi-Producer, Single-Consumer
use std::thread;

fn main() {
    // 创建 channel，返回 (发送端, 接收端)
    let (tx, rx) = mpsc::channel();

    // 在新线程中发送消息
    thread::spawn(move || {
        let messages = vec!["你好", "来自", "另一个线程"];
        for msg in messages {
            tx.send(msg).unwrap();  // 发送消息
            println!("📤 发送: {}", msg);
        }
        // tx 在这里被 drop，channel 关闭
    });

    // 在主线程中接收消息
    for received in rx {  // rx 实现了 Iterator
        println!("📥 收到: {}", received);
    }
    // 当发送端被 drop 后，迭代器结束
}
```

### 15.4.2 Channel 的不同接收方式

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(500));
        tx.send("延迟消息").unwrap();
    });

    // 方式1：recv() —— 阻塞等待
    // let msg = rx.recv().unwrap();
    // println!("阻塞接收: {}", msg);

    // 方式2：try_recv() —— 非阻塞，立即返回
    loop {
        match rx.try_recv() {
            Ok(msg) => {
                println!("收到: {}", msg);
                break;
            }
            Err(mpsc::TryRecvError::Empty) => {
                println!("还没有消息，做点其他事...");
                thread::sleep(Duration::from_millis(100));
            }
            Err(mpsc::TryRecvError::Disconnected) => {
                println!("发送端已关闭");
                break;
            }
        }
    }

    // 方式3：recv_timeout() —— 带超时的阻塞
    let (tx2, rx2) = mpsc::channel::<String>();
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(2));
        let _ = tx2.send("超时测试".to_string());
    });

    match rx2.recv_timeout(Duration::from_secs(1)) {
        Ok(msg) => println!("收到: {}", msg),
        Err(mpsc::RecvTimeoutError::Timeout) => println!("⏰ 超时了！"),
        Err(mpsc::RecvTimeoutError::Disconnected) => println!("断开连接"),
    }
}
```

### 15.4.3 多生产者

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    // 克隆发送端 —— 支持多个生产者
    let tx1 = tx.clone();
    let tx2 = tx.clone();
    drop(tx); // 丢弃原始的 tx，现在有 tx1 和 tx2

    // 生产者 1
    thread::spawn(move || {
        let messages = vec!["tx1: 你好", "tx1: 世界"];
        for msg in messages {
            tx1.send(msg.to_string()).unwrap();
            thread::sleep(Duration::from_millis(100));
        }
    });

    // 生产者 2
    thread::spawn(move || {
        let messages = vec!["tx2: Hello", "tx2: World"];
        for msg in messages {
            tx2.send(msg.to_string()).unwrap();
            thread::sleep(Duration::from_millis(150));
        }
    });

    // 消费者 —— 接收来自两个生产者的消息
    for msg in rx {
        println!("📥 {}", msg);
    }
}
```

### 15.4.4 同步 Channel

普通的 `channel()` 是异步的（发送端不等待接收端）。`sync_channel` 有缓冲区大小限制：

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    // sync_channel(2) —— 缓冲区大小为 2
    // 如果缓冲区满了，send 会阻塞
    let (tx, rx) = mpsc::sync_channel(2);

    thread::spawn(move || {
        for i in 0..5 {
            println!("📤 尝试发送 {}", i);
            tx.send(i).unwrap();
            println!("📤 已发送 {}", i);
        }
    });

    // 慢慢接收，观察发送端的阻塞行为
    for _ in 0..5 {
        thread::sleep(Duration::from_millis(500));
        let msg = rx.recv().unwrap();
        println!("📥 收到 {}", msg);
    }
}
```

### 15.4.5 Channel 所有权转移

Channel 发送的数据会**转移所有权**——这保证了线程安全：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let data = vec![1, 2, 3];
        tx.send(data).unwrap();  // data 的所有权转移到 channel
        // ❌ data 已被移动，不能再使用
        // println!("{:?}", data); // 编译错误！
    });

    let received = rx.recv().unwrap();
    println!("收到: {:?}", received); // [1, 2, 3]
}
```

对比 JavaScript 的 Worker 消息传递：

```javascript
// JavaScript Worker - 数据被序列化/复制
worker.postMessage({ data: [1, 2, 3] }); // 数据被复制！
// 原始数据还在

// 除非使用 Transferable
const buffer = new ArrayBuffer(1024);
worker.postMessage(buffer, [buffer]); // 所有权转移！
// buffer 现在是空的（detached）
```

### 15.4.6 用 Channel 实现简单的任务队列

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

enum Task {
    Process(String),
    Quit,
}

fn main() {
    let (tx, rx) = mpsc::channel();

    // 工作线程
    let worker = thread::spawn(move || {
        loop {
            match rx.recv() {
                Ok(Task::Process(data)) => {
                    println!("🔨 处理任务: {}", data);
                    thread::sleep(Duration::from_millis(200));
                    println!("✅ 完成: {}", data);
                }
                Ok(Task::Quit) => {
                    println!("👋 工作线程退出");
                    break;
                }
                Err(_) => {
                    println!("⚠️ Channel 断开");
                    break;
                }
            }
        }
    });

    // 主线程发送任务
    for i in 1..=5 {
        tx.send(Task::Process(format!("任务 {}", i))).unwrap();
    }

    // 发送退出信号
    tx.send(Task::Quit).unwrap();

    worker.join().unwrap();
    println!("所有任务完成！");
}
```

---

## 15.5 共享状态：`Mutex&lt;T&gt;` 和 `Arc&lt;Mutex&lt;T&gt;&gt;`

### 15.5.1 什么是 Mutex？

Mutex（Mutual Exclusion，互斥锁）确保同一时刻只有一个线程能访问数据：

```
没有 Mutex：
线程1: 读取 count=0 → 加1 → 写入 count=1
线程2: 读取 count=0 → 加1 → 写入 count=1  ← 数据竞争！应该是 2

有 Mutex：
线程1: 🔒获取锁 → 读取 count=0 → 加1 → 写入 count=1 → 🔓释放锁
线程2: 🔒获取锁 → 读取 count=1 → 加1 → 写入 count=2 → 🔓释放锁 ← 正确！
```

### 15.5.2 Mutex 基本用法

```rust
use std::sync::Mutex;

fn main() {
    // 创建 Mutex
    let m = Mutex::new(5);

    {
        // lock() 获取锁，返回 MutexGuard（智能指针）
        let mut num = m.lock().unwrap();
        // MutexGuard 实现了 Deref，可以像引用一样使用
        *num = 6;
        println!("修改后: {}", num);
    } // MutexGuard 离开作用域，自动释放锁

    // 再次获取锁
    println!("最终值: {}", m.lock().unwrap());
}
```

对比 JavaScript（JS 通常不需要锁，因为单线程）：

```javascript
// JavaScript - 单线程，不需要锁
let count = 0;
count += 1; // 不会有数据竞争
// 但在 SharedArrayBuffer + Atomics 场景中才需要类似概念
```

### 15.5.3 多线程共享 Mutex

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Arc<Mutex<T>> = 多线程共享 + 互斥访问
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for i in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            // 获取锁
            let mut num = counter.lock().unwrap();
            *num += 1;
            println!("线程 {} 将计数器增加到 {}", i, *num);
            // num (MutexGuard) 在这里被 drop，自动释放锁
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("最终计数: {}", *counter.lock().unwrap()); // 10
}
```

### 15.5.4 死锁

死锁是并发编程的经典问题——两个线程互相等待对方释放锁：

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let lock_a = Arc::new(Mutex::new(0));
    let lock_b = Arc::new(Mutex::new(0));

    let la = Arc::clone(&lock_a);
    let lb = Arc::clone(&lock_b);

    // ⚠️ 这段代码可能死锁！
    // 线程1: 先锁 A，再锁 B
    let handle1 = thread::spawn(move || {
        let _a = la.lock().unwrap();
        println!("线程1 获取了锁 A");
        // thread::sleep(Duration::from_millis(100)); // 增加死锁概率
        let _b = lb.lock().unwrap();
        println!("线程1 获取了锁 B");
    });

    let la = Arc::clone(&lock_a);
    let lb = Arc::clone(&lock_b);

    // 线程2: 先锁 B，再锁 A（顺序相反！）
    let handle2 = thread::spawn(move || {
        let _b = lb.lock().unwrap();
        println!("线程2 获取了锁 B");
        let _a = la.lock().unwrap();
        println!("线程2 获取了锁 A");
    });

    // 死锁场景：
    // 线程1 持有 A，等待 B
    // 线程2 持有 B，等待 A
    // → 两个线程永远等下去

    handle1.join().unwrap();
    handle2.join().unwrap();

    // 避免死锁的方法：始终以相同的顺序获取锁！
}
```

### 15.5.5 避免死锁的策略

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let lock_a = Arc::new(Mutex::new("A 的数据".to_string()));
    let lock_b = Arc::new(Mutex::new("B 的数据".to_string()));

    // 策略1：始终以相同顺序获取锁
    let la1 = Arc::clone(&lock_a);
    let lb1 = Arc::clone(&lock_b);
    let h1 = thread::spawn(move || {
        let a = la1.lock().unwrap();
        let b = lb1.lock().unwrap();
        println!("线程1: {} + {}", a, b);
    });

    let la2 = Arc::clone(&lock_a);
    let lb2 = Arc::clone(&lock_b);
    let h2 = thread::spawn(move || {
        let a = la2.lock().unwrap(); // 先 A 后 B，与线程1 相同顺序
        let b = lb2.lock().unwrap();
        println!("线程2: {} + {}", a, b);
    });

    h1.join().unwrap();
    h2.join().unwrap();

    // 策略2：使用 try_lock 避免无限等待
    let lock = Arc::new(Mutex::new(42));
    let lock2 = Arc::clone(&lock);

    let _guard = lock.lock().unwrap(); // 主线程持有锁

    let h = thread::spawn(move || {
        match lock2.try_lock() {
            Ok(val) => println!("获取到锁: {}", val),
            Err(_) => println!("⚠️ 无法获取锁，跳过"),
        }
    });

    h.join().unwrap();
}
```

### 15.5.6 Mutex 中毒（Poisoning）

如果持有锁的线程 panic 了，Mutex 会进入"中毒"状态：

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let data = Arc::new(Mutex::new(vec![1, 2, 3]));

    let data_clone = Arc::clone(&data);
    let handle = thread::spawn(move || {
        let mut guard = data_clone.lock().unwrap();
        guard.push(4);
        panic!("线程 panic 了！"); // Mutex 被毒化
    });

    // 等待线程结束（会 panic，但 join 捕获了它）
    let _ = handle.join();

    // 现在 lock() 返回 Err，因为 Mutex 被毒化了
    match data.lock() {
        Ok(guard) => println!("数据: {:?}", guard),
        Err(poisoned) => {
            // 可以选择恢复数据
            let guard = poisoned.into_inner();
            println!("Mutex 被毒化，但数据是: {:?}", guard);
            // [1, 2, 3, 4] —— panic 之前的修改还在！
        }
    }
}
```

### 15.5.7 RwLock：读写锁

如果读操作远多于写操作，`RwLock` 比 `Mutex` 更高效：

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));
    let mut handles = vec![];

    // 多个读者可以同时读取
    for i in 0..5 {
        let data = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            let read_guard = data.read().unwrap(); // 多个线程可以同时持有读锁
            println!("读者 {}: {:?}", i, *read_guard);
        }));
    }

    // 写者需要独占访问
    {
        let data = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            let mut write_guard = data.write().unwrap(); // 独占写锁
            write_guard.push(4);
            println!("写者: 添加了元素 4");
        }));
    }

    for h in handles {
        h.join().unwrap();
    }

    println!("最终数据: {:?}", data.read().unwrap());
}
```

```
Mutex vs RwLock：
┌─────────┬─────────────────────┬──────────────────────┐
│         │ Mutex               │ RwLock               │
├─────────┼─────────────────────┼──────────────────────┤
│ 读并发  │ ❌ 一次一个          │ ✅ 多个同时读         │
│ 写并发  │ ❌ 一次一个          │ ❌ 一次一个           │
│ 适用    │ 读写均衡            │ 读多写少              │
│ 开销    │ 较低                │ 稍高（需要追踪读者数） │
└─────────┴─────────────────────┴──────────────────────┘
```

---

## 15.6 原子类型

### 15.6.1 什么是原子操作？

原子操作是不可分割的操作——在执行过程中不会被其他线程中断：

```rust
use std::sync::atomic::{AtomicI32, AtomicBool, Ordering};
use std::thread;
use std::sync::Arc;

fn main() {
    // 原子整数 —— 比 Mutex<i32> 更轻量
    let counter = Arc::new(AtomicI32::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            // fetch_add: 原子地加 1 并返回旧值
            let old = counter.fetch_add(1, Ordering::SeqCst);
            println!("旧值: {}, 新值: {}", old, old + 1);
        }));
    }

    for h in handles {
        h.join().unwrap();
    }

    println!("最终: {}", counter.load(Ordering::SeqCst)); // 10
}
```

### 15.6.2 常用原子类型和操作

```rust
use std::sync::atomic::{AtomicBool, AtomicI64, AtomicUsize, Ordering};

fn main() {
    // AtomicBool
    let flag = AtomicBool::new(false);
    flag.store(true, Ordering::SeqCst);
    println!("flag = {}", flag.load(Ordering::SeqCst));

    // AtomicI64
    let count = AtomicI64::new(0);
    count.fetch_add(10, Ordering::SeqCst);
    count.fetch_sub(3, Ordering::SeqCst);
    println!("count = {}", count.load(Ordering::SeqCst)); // 7

    // AtomicUsize - 常用于计数器
    let index = AtomicUsize::new(0);
    let old = index.fetch_add(1, Ordering::SeqCst);
    println!("old index = {}, new = {}", old, index.load(Ordering::SeqCst));

    // compare_and_swap (CAS) - 原子的"比较并交换"
    let value = AtomicI64::new(5);
    // 如果当前值是 5，则设置为 10
    let result = value.compare_exchange(5, 10, Ordering::SeqCst, Ordering::SeqCst);
    println!("CAS 结果: {:?}, 值: {}", result, value.load(Ordering::SeqCst)); // Ok(5), 10
}
```

### 15.6.3 原子操作实现自旋锁

```rust
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

// 简单的自旋锁
struct SpinLock {
    locked: AtomicBool,
}

impl SpinLock {
    fn new() -> Self {
        SpinLock {
            locked: AtomicBool::new(false),
        }
    }

    fn lock(&self) {
        // 自旋等待直到获取锁
        while self.locked
            .compare_exchange_weak(false, true, Ordering::Acquire, Ordering::Relaxed)
            .is_err()
        {
            // 自旋（忙等待）
            std::hint::spin_loop();
        }
    }

    fn unlock(&self) {
        self.locked.store(false, Ordering::Release);
    }
}

fn main() {
    let lock = Arc::new(SpinLock::new());
    let counter = Arc::new(std::sync::atomic::AtomicI32::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let lock = Arc::clone(&lock);
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            lock.lock();
            // 临界区
            let val = counter.load(Ordering::SeqCst);
            counter.store(val + 1, Ordering::SeqCst);
            lock.unlock();
        }));
    }

    for h in handles {
        h.join().unwrap();
    }

    println!("计数: {}", counter.load(Ordering::SeqCst)); // 10
}
```

### 15.6.4 Ordering 简介

`Ordering` 控制原子操作的内存顺序保证：

```
Ordering::Relaxed  —— 最宽松，只保证原子性
Ordering::Acquire  —— 读操作，保证之后的操作不会被重排到之前
Ordering::Release  —— 写操作，保证之前的操作不会被重排到之后
Ordering::AcqRel   —— 同时 Acquire + Release
Ordering::SeqCst   —— 最严格，顺序一致（最安全，性能稍差）
```

对于初学者，**始终使用 `Ordering::SeqCst`** 就好。当你真正需要优化性能时再考虑其他选项。

### 15.6.5 原子类型 vs Mutex

```
┌──────────┬──────────────────────┬──────────────────────┐
│          │ 原子类型             │ Mutex                │
├──────────┼──────────────────────┼──────────────────────┤
│ 适用类型 │ 简单类型（数字、bool）│ 任意类型             │
│ 性能     │ 极快（硬件指令）      │ 较慢（系统调用）      │
│ 复杂操作 │ ❌ 只能做简单操作     │ ✅ 可以保护任意操作   │
│ 死锁风险 │ 无                   │ 有                   │
│ 使用场景 │ 计数器、标志位        │ 复杂数据结构          │
└──────────┴──────────────────────┴──────────────────────┘
```

---

## 15.7 `Send` 和 `Sync` trait —— 线程安全的守门人

### 15.7.1 什么是 Send？

`Send` trait 表示一个类型的值可以安全地**发送到**另一个线程：

```rust
use std::thread;

fn must_be_send<T: Send>(val: T) {
    thread::spawn(move || {
        println!("在新线程中");
        drop(val);
    }).join().unwrap();
}

fn main() {
    // ✅ 大多数类型都实现了 Send
    must_be_send(42);
    must_be_send(String::from("hello"));
    must_be_send(vec![1, 2, 3]);

    // ❌ Rc<T> 没有实现 Send
    // must_be_send(std::rc::Rc::new(42)); // 编译错误！
    // 因为 Rc 的引用计数不是线程安全的
}
```

### 15.7.2 什么是 Sync？

`Sync` trait 表示一个类型可以安全地被多个线程通过**引用**访问：

```
T: Sync  等价于  &T: Send
```

```rust
use std::sync::{Arc, Mutex};

fn must_be_sync<T: Sync>(val: &T) {
    println!("这个类型是 Sync 的");
}

fn main() {
    // ✅ 大多数基本类型是 Sync 的
    must_be_sync(&42);
    must_be_sync(&String::from("hello"));

    // ✅ Mutex<T> 是 Sync 的
    let m = Mutex::new(42);
    must_be_sync(&m);

    // ❌ RefCell<T> 不是 Sync 的
    // let rc = std::cell::RefCell::new(42);
    // must_be_sync(&rc); // 编译错误！
    // 因为 RefCell 的运行时借用检查不是线程安全的

    // ❌ Cell<T> 也不是 Sync 的
    // let c = std::cell::Cell::new(42);
    // must_be_sync(&c); // 编译错误！
}
```

### 15.7.3 Send 和 Sync 的关系

```
┌──────────────────┬───────┬───────┬──────────────────────────┐
│ 类型              │ Send  │ Sync  │ 说明                      │
├──────────────────┼───────┼───────┼──────────────────────────┤
│ i32, bool, f64   │ ✅    │ ✅    │ 基本类型                  │
│ String, Vec<T>   │ ✅    │ ✅    │ 大多数标准库类型          │
│ Mutex<T>         │ ✅    │ ✅    │ 线程安全的锁              │
│ Arc<T>           │ ✅    │ ✅    │ 线程安全的引用计数        │
│ Rc<T>            │ ❌    │ ❌    │ 非线程安全的引用计数      │
│ RefCell<T>       │ ✅    │ ❌    │ 可以发送但不能共享引用    │
│ Cell<T>          │ ✅    │ ❌    │ 同上                      │
│ *mut T (裸指针)  │ ❌    │ ❌    │ 裸指针默认不安全          │
└──────────────────┴───────┴───────┴──────────────────────────┘
```

### 15.7.4 自动推导

`Send` 和 `Sync` 是自动推导的 —— 如果一个结构体的所有字段都是 `Send`，那么这个结构体也是 `Send`：

```rust
// ✅ 所有字段都是 Send + Sync，所以 User 也是
struct User {
    name: String,  // Send + Sync
    age: u32,      // Send + Sync
}

// ❌ 包含 Rc，所以 BadUser 不是 Send
struct BadUser {
    name: String,
    data: std::rc::Rc<String>, // 不是 Send
}

// 如果你真的需要标记一个类型为 Send（不安全！）
// unsafe impl Send for BadUser {}
// 除非你 100% 确定这是安全的，否则不要这样做！
```

### 15.7.5 实际意义

```rust
use std::thread;
use std::sync::Arc;

// 编译器自动检查线程安全
fn spawn_task<F, T>(f: F) -> thread::JoinHandle<T>
where
    F: FnOnce() -> T + Send + 'static,  // 闭包必须是 Send 的
    T: Send + 'static,                   // 返回值必须是 Send 的
{
    thread::spawn(f)
}

fn main() {
    // ✅ 这可以编译
    let handle = spawn_task(|| {
        let data = vec![1, 2, 3];
        data.iter().sum::<i32>()
    });
    println!("结果: {}", handle.join().unwrap());

    // ❌ 如果尝试发送 Rc 到线程，编译器会拒绝
    // let rc = std::rc::Rc::new(42);
    // spawn_task(move || *rc); // 编译错误！Rc 不是 Send
}
```

> 💡 **这就是 Rust "无畏并发"的秘密：**
> 编译器通过 `Send` 和 `Sync` trait 在编译时就检查线程安全。
> 数据竞争在 Rust 中是编译错误，而不是运行时 bug！
> JavaScript 因为单线程不需要担心这些，但当你使用 Worker 时，
> 数据竞争问题就得靠你自己小心了。

---

## 15.8 实战：线程池

```rust
use std::sync::{mpsc, Arc, Mutex};
use std::thread;

type Job = Box<dyn FnOnce() + Send + 'static>;

struct ThreadPool {
    workers: Vec<Worker>,
    sender: Option<mpsc::Sender<Job>>,
}

struct Worker {
    id: usize,
    handle: Option<thread::JoinHandle<()>>,
}

impl ThreadPool {
    fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let (sender, receiver) = mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));

        let mut workers = Vec::with_capacity(size);
        for id in 0..size {
            let receiver = Arc::clone(&receiver);
            let handle = thread::spawn(move || loop {
                // 获取锁，然后从 channel 接收任务
                let message = receiver.lock().unwrap().recv();
                match message {
                    Ok(job) => {
                        println!("工作线程 {} 收到任务", id);
                        job();
                    }
                    Err(_) => {
                        println!("工作线程 {} 退出", id);
                        break;
                    }
                }
            });
            workers.push(Worker {
                id,
                handle: Some(handle),
            });
        }

        ThreadPool {
            workers,
            sender: Some(sender),
        }
    }

    fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);
        self.sender.as_ref().unwrap().send(job).unwrap();
    }
}

impl Drop for ThreadPool {
    fn drop(&mut self) {
        // 关闭 sender，通知所有 worker 退出
        drop(self.sender.take());

        for worker in &mut self.workers {
            if let Some(handle) = worker.handle.take() {
                handle.join().unwrap();
            }
        }
    }
}

fn main() {
    let pool = ThreadPool::new(4);

    for i in 0..8 {
        pool.execute(move || {
            println!("🔨 执行任务 {} (线程: {:?})", i, thread::current().id());
            thread::sleep(std::time::Duration::from_millis(200));
        });
    }

    // pool 在这里被 drop，等待所有任务完成
    drop(pool);
    println!("所有任务完成！");
}
```

---

## 15.9 消息传递 vs 共享状态

### 15.9.1 选择指南

```
消息传递（Channel）适合：
├── 任务分发（生产者-消费者）
├── 事件驱动系统
├── 线程之间传递所有权
└── 简单、不容易出错

共享状态（Mutex/RwLock/Atomic）适合：
├── 多线程需要读写同一份数据
├── 性能关键路径（避免序列化/复制开销）
├── 计数器、缓存等共享数据结构
└── 更高效，但更容易出错
```

> Rust 的标准库同时提供了两种模型，你可以根据场景选择最合适的。
> Go 有句名言："不要通过共享内存来通信，而是通过通信来共享内存。"
> 在 Rust 中，两种方式都是安全的——编译器会帮你把关。

---

## 15.10 练习题

### 练习 1：并行求和

```rust
// 将一个大数组分成 N 份，每份交给一个线程计算和
// 最后汇总所有线程的结果
// 提示：使用 thread::spawn + join 收集结果
// 额外挑战：使用 channel 而非 join 返回值
```

### 练习 2：生产者-消费者

```rust
// 实现一个多生产者、单消费者的日志系统
// - 3 个生产者线程，每个发送 10 条日志
// - 1 个消费者线程，收集并打印所有日志
// - 日志格式：[线程ID] [时间戳] 消息内容
```

### 练习 3：并发计数器

```rust
// 比较三种并发计数器的实现：
// 1. Arc<Mutex<i32>>
// 2. AtomicI32
// 3. Channel（累加模式）
// 10 个线程，每个线程加 1000 次
// 验证最终结果都是 10000
// 思考：哪种最快？哪种最安全？哪种最简单？
```

### 练习 4：实现 Map-Reduce

```rust
// 实现一个简单的 Map-Reduce：
// 输入：一段很长的文本
// Map 阶段：多个线程各处理一部分，统计单词频率
// Reduce 阶段：汇总所有线程的结果
// 输出：每个单词出现的次数
```

### 练习 5：哲学家就餐问题

```rust
// 5 个哲学家围坐在圆桌旁，每两人之间有一根筷子
// 每个哲学家需要两根筷子才能吃饭
// 实现一个不会死锁的方案
// 提示：给筷子编号，每个哲学家总是先拿编号小的筷子
```

---

## 15.11 本章小结

在本章中，我们学习了 Rust 强大的并发编程能力：

1. **线程创建** —— `thread::spawn` + `JoinHandle`，比 JS Worker 简单得多
2. **move 闭包** —— 将数据所有权转移到线程中，编译器保证安全
3. **Channel** —— 线程间的消息传递，类似 JS EventEmitter 但更安全
4. **Mutex/RwLock** —— 共享状态的互斥访问，编译器防止数据竞争
5. **原子类型** —— 轻量级的线程安全操作，适用于简单计数器
6. **Send/Sync** —— 编译时的线程安全保证，这是 Rust 独有的优势

> 💡 **给 JavaScript 开发者的总结：**
> JavaScript 的单线程模型让你不需要思考并发安全——但也限制了性能。
> Rust 给了你真正的多线程能力，同时通过类型系统在编译时消灭数据竞争。
> 这就是"无畏并发"的含义：你可以放心地写多线程代码，
> 因为如果有问题，编译器不会让你通过。

下一章，我们将学习 Rust 的异步编程——用 async/await 写出高效的 I/O 密集型代码！
