# 第二十二章：Unsafe Rust —— 突破安全边界的超能力

> **本章目标**
>
> - 理解为什么 Rust 需要 unsafe 关键字
> - 掌握 unsafe 赋予的五种超能力
> - 学会使用裸指针（raw pointer）进行底层操作
> - 理解如何调用 unsafe 函数和外部函数（FFI）
> - 掌握在 unsafe 代码之上构建安全抽象的技巧
> - 了解 unsafe trait 的用途和实现方式
> - 学会访问可变静态变量的正确姿势
> - 通过实战练习巩固 unsafe 的使用场景

> **预计学习时间：90 - 120 分钟**（unsafe 是进阶 Rust 的分水岭，值得仔细研究）

---

## 22.1 为什么需要 unsafe？

### 22.1.1 Rust 的安全承诺与局限

到目前为止，你已经体验了 Rust 编译器的严格检查 —— 所有权、借用、生命周期，编译器几乎不让你犯任何内存错误。但编译器是保守的，它会拒绝一些实际上安全的代码。

来看一个类比。在 TypeScript 中：

```typescript
// TypeScript - 类型系统有时也会"过度保护"
function getValue(obj: any): string {
    // 你知道 obj 一定有 name 字段，但 TS 不知道
    // 你可以用 as 来告诉编译器："相信我"
    return (obj as { name: string }).name;
}
```

TypeScript 的 `as` 类型断言就是一种"我比编译器更了解情况"的机制。Rust 的 `unsafe` 也是类似的理念，但更加系统化和明确。

### 22.1.2 unsafe 不是"关闭安全检查"

**重要误区纠正：** 很多人以为 `unsafe` 意味着"关闭所有安全检查"。这是错误的！

```
┌──────────────────────────────────────────────────────────┐
│              unsafe 到底关闭了什么？                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ 依然有效的检查：                                       │
│     - 所有权规则                                          │
│     - 借用检查（大部分）                                    │
│     - 类型检查                                            │
│     - 生命周期检查（大部分）                                 │
│     - 边界检查（数组访问）                                   │
│                                                          │
│  🔓 额外允许的操作（五种超能力）：                            │
│     1. 解引用裸指针                                        │
│     2. 调用 unsafe 函数或方法                               │
│     3. 访问或修改可变静态变量                                │
│     4. 实现 unsafe trait                                   │
│     5. 访问 union 的字段                                   │
│                                                          │
│  unsafe 只是告诉编译器：                                    │
│  "这五种操作我来负责保证安全，你别管了"                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 22.1.3 什么场景需要 unsafe？

在实际开发中，以下场景经常需要 unsafe：

```rust
// 场景 1：性能优化 - 跳过边界检查
fn sum_fast(data: &[i32]) -> i32 {
    let mut total = 0;
    // 安全版本：每次访问都做边界检查
    // for i in 0..data.len() {
    //     total += data[i];  // 编译器插入边界检查
    // }

    // unsafe 版本：你确定索引合法，跳过检查
    unsafe {
        for i in 0..data.len() {
            total += *data.get_unchecked(i);  // 没有边界检查，更快
        }
    }
    total
}
```

```rust
// 场景 2：与 C 库交互（FFI）
// 调用 C 标准库的 abs 函数
extern "C" {
    fn abs(input: i32) -> i32;
}

fn main() {
    let result = unsafe { abs(-42) };
    println!("|-42| = {}", result);  // 输出: |-42| = 42
}
```

```rust
// 场景 3：实现底层数据结构
// 标准库的 Vec、String、HashMap 内部都用了 unsafe
// 因为它们需要直接操作内存
```

```rust
// 场景 4：硬件交互
// 嵌入式开发中，你需要读写特定的内存地址
// 比如控制 LED 灯
unsafe {
    let gpio_register = 0x4002_0000 as *mut u32;
    *gpio_register = 0x01;  // 打开 LED
}
```

---

## 22.2 unsafe 的五种超能力

### 22.2.1 超能力一览

用一张表来总结 unsafe 解锁的五种能力：

| 超能力 | 说明 | 危险程度 | 常见场景 |
|--------|------|----------|----------|
| 解引用裸指针 | 通过原始内存地址读写数据 | ⚠️⚠️⚠️ | FFI、底层数据结构 |
| 调用 unsafe 函数 | 调用标记为 unsafe 的函数 | ⚠️⚠️ | 系统调用、C 库绑定 |
| 访问可变静态变量 | 读写全局可变状态 | ⚠️⚠️ | 全局配置、计数器 |
| 实现 unsafe trait | 实现有特殊安全要求的 trait | ⚠️ | Send、Sync、自定义 |
| 访问 union 字段 | 读取联合体中的字段 | ⚠️⚠️ | FFI、内存重解释 |

### 22.2.2 unsafe 块的写法

```rust
fn main() {
    // 普通代码 - 编译器全面检查
    let x = 42;

    // unsafe 块 - 在这个块里可以使用五种超能力
    unsafe {
        // 这里可以解引用裸指针等
    }

    // 又回到安全代码
    let y = x + 1;
}
```

**最佳实践：** unsafe 块应该尽可能小，只包裹真正需要 unsafe 的那一行代码。

```rust
// ❌ 不好：整个函数都是 unsafe
unsafe fn bad_style() {
    let v = vec![1, 2, 3];
    let x = v[0];  // 这行不需要 unsafe
    let ptr = v.as_ptr();
    let first = *ptr;  // 只有这行需要 unsafe
}

// ✅ 好：精确标记 unsafe 范围
fn good_style() {
    let v = vec![1, 2, 3];
    let x = v[0];  // 安全代码
    let ptr = v.as_ptr();
    let first = unsafe { *ptr };  // 只有解引用裸指针是 unsafe 的
}
```

---

## 22.3 裸指针（Raw Pointers）

### 22.3.1 什么是裸指针？

裸指针是 Rust 中最原始的内存地址表示，类似于 C 的指针。Rust 有两种裸指针：

- `*const T` —— 不可变裸指针（类似 C 的 `const T*`）
- `*mut T` —— 可变裸指针（类似 C 的 `T*`）

注意这里的 `*` 是类型名的一部分，不是解引用操作符。

```
┌─────────────────────────────────────────────────────────┐
│             引用 vs 裸指针 对比                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  安全引用 &T / &mut T：                                   │
│  ├─ 保证非空                                             │
│  ├─ 保证对齐                                             │
│  ├─ 保证指向有效数据                                      │
│  ├─ 遵守借用规则（要么多个 & 要么一个 &mut）                 │
│  └─ 编译器完全检查                                        │
│                                                         │
│  裸指针 *const T / *mut T：                               │
│  ├─ 可能为空                                             │
│  ├─ 可能未对齐                                           │
│  ├─ 可能指向已释放的内存                                   │
│  ├─ 不受借用规则约束                                      │
│  ├─ 可以同时有多个 *mut T 指向同一位置                      │
│  └─ 编译器不检查，你自己负责                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 22.3.2 创建裸指针

**创建裸指针是安全的**，只有**解引用**裸指针才需要 unsafe：

```rust
fn main() {
    let mut x = 42;

    // 从引用创建裸指针 —— 这是安全的！
    let ptr_const: *const i32 = &x;        // 不可变裸指针
    let ptr_mut: *mut i32 = &mut x;        // 可变裸指针

    println!("ptr_const 地址: {:?}", ptr_const);
    println!("ptr_mut 地址: {:?}", ptr_mut);

    // 解引用裸指针 —— 必须在 unsafe 块中
    unsafe {
        println!("ptr_const 的值: {}", *ptr_const);  // 读取
        *ptr_mut = 100;                                // 写入
        println!("修改后的值: {}", *ptr_const);         // 读取修改后的值
    }
}
```

对比 JavaScript —— JS 中没有裸指针的概念，但 `ArrayBuffer` 和 `DataView` 提供了类似的底层内存访问：

```javascript
// JavaScript - 用 ArrayBuffer 模拟底层内存操作
const buffer = new ArrayBuffer(4);  // 分配 4 字节
const view = new DataView(buffer);

view.setInt32(0, 42);              // 在偏移 0 处写入 32 位整数
console.log(view.getInt32(0));      // 读取: 42

// 但 JS 的 DataView 有边界检查，Rust 的裸指针没有！
```

### 22.3.3 创建指向任意地址的裸指针

你甚至可以创建指向任意内存地址的裸指针（这在嵌入式开发中很常见）：

```rust
fn main() {
    // 创建一个指向地址 0x012345 的裸指针
    // 创建是安全的，解引用才危险
    let address = 0x012345usize;
    let ptr = address as *const i32;

    println!("指向地址 {:?} 的指针", ptr);

    // ⚠️ 千万不要解引用这个指针！
    // 除非你确切知道 0x012345 处有合法的 i32 数据
    // unsafe { println!("{}", *ptr); }  // 可能导致段错误！
}
```

### 22.3.4 裸指针的常见操作

```rust
use std::ptr;

fn main() {
    // === 空指针 ===
    let null_ptr: *const i32 = ptr::null();
    let null_mut_ptr: *mut i32 = ptr::null_mut();

    // 检查是否为空
    assert!(null_ptr.is_null());

    // === 指针算术 ===
    let arr = [10, 20, 30, 40, 50];
    let ptr = arr.as_ptr();  // 指向第一个元素

    unsafe {
        // offset 方法：按元素个数偏移（不是字节数！）
        println!("arr[0] = {}", *ptr);              // 10
        println!("arr[1] = {}", *ptr.offset(1));     // 20
        println!("arr[2] = {}", *ptr.add(2));        // 30（add 是 offset 的别名）
        println!("arr[4] = {}", *ptr.add(4));        // 50

        // ⚠️ 越界访问是未定义行为！
        // println!("{}", *ptr.add(100));  // 未定义行为！
    }

    // === 指针比较 ===
    let a = 42;
    let p1: *const i32 = &a;
    let p2: *const i32 = &a;
    assert!(ptr::eq(p1, p2));  // 比较地址是否相同

    // === 读写指针 ===
    let mut value = 42;
    let ptr = &mut value as *mut i32;

    unsafe {
        // read / write 方法
        let v = ptr::read(ptr);       // 读取
        println!("读到的值: {}", v);

        ptr::write(ptr, 100);         // 写入
        println!("写入后: {}", *ptr);

        // copy 方法（类似 C 的 memcpy）
        let mut dest = 0i32;
        ptr::copy_nonoverlapping(ptr, &mut dest as *mut i32, 1);
        println!("拷贝后: {}", dest);  // 100
    }
}
```

### 22.3.5 裸指针与数组切片

```rust
fn main() {
    let data = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 获取底层裸指针和长度
    let ptr = data.as_ptr();
    let len = data.len();

    // 从裸指针重建切片
    let slice = unsafe {
        std::slice::from_raw_parts(ptr, len)
    };

    println!("重建的切片: {:?}", slice);
    // 输出: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    // 创建子切片（从第 3 个元素开始，取 4 个）
    let sub_slice = unsafe {
        std::slice::from_raw_parts(ptr.add(2), 4)
    };
    println!("子切片: {:?}", sub_slice);
    // 输出: [3, 4, 5, 6]
}
```

### 22.3.6 同时持有多个可变裸指针

这是裸指针与引用的关键区别 —— 你可以同时有多个 `*mut T` 指向同一位置：

```rust
fn main() {
    let mut x = 42;

    // 安全引用不允许这样做：
    // let r1 = &mut x;
    // let r2 = &mut x;  // ❌ 编译错误：不能同时有两个可变引用

    // 但裸指针可以：
    let p1 = &mut x as *mut i32;
    let p2 = &mut x as *mut i32;  // ✅ 编译通过

    // 当然，同时通过两个指针写入可能导致问题
    // 你需要自己保证不会产生数据竞争
    unsafe {
        *p1 = 100;
        println!("通过 p2 读取: {}", *p2);  // 100
    }
}
```

---

## 22.4 调用 unsafe 函数

### 22.4.1 unsafe 函数的声明和调用

```rust
// 声明一个 unsafe 函数
unsafe fn dangerous() {
    println!("这是一个 unsafe 函数");
    // 在 unsafe 函数体内，可以直接使用五种超能力
    // 不需要额外的 unsafe 块
}

fn main() {
    // 调用 unsafe 函数必须在 unsafe 块中
    unsafe {
        dangerous();
    }
}
```

### 22.4.2 标准库中的 unsafe 函数

标准库中有很多 unsafe 函数，它们都有明确的安全约束文档：

```rust
fn main() {
    let mut v = vec![1, 2, 3, 4, 5];

    // Vec::set_len - unsafe，因为你可能设置一个无效的长度
    unsafe {
        v.set_len(3);  // 截断到 3 个元素
        // 注意：被截断的元素不会被 drop！
        // 如果元素类型有析构函数，会导致资源泄漏
    }
    println!("{:?}", v);  // [1, 2, 3]

    // String::from_utf8_unchecked - unsafe，因为你保证字节是有效 UTF-8
    let bytes = vec![72, 101, 108, 108, 111];  // "Hello" 的 UTF-8 字节
    let s = unsafe {
        String::from_utf8_unchecked(bytes)
    };
    println!("{}", s);  // Hello

    // slice::get_unchecked - unsafe，跳过边界检查
    let arr = [10, 20, 30, 40, 50];
    let val = unsafe { arr.get_unchecked(2) };
    println!("arr[2] = {}", val);  // 30
}
```

### 22.4.3 FFI —— 调用 C 语言函数

**FFI（Foreign Function Interface）** 是 unsafe 最重要的应用场景之一。你可以从 Rust 调用 C 库的函数。

```rust
// 声明外部 C 函数
extern "C" {
    // C 标准库函数
    fn abs(input: i32) -> i32;
    fn sqrt(input: f64) -> f64;
    fn strlen(s: *const i8) -> usize;

    // POSIX 函数
    fn getpid() -> i32;
}

fn main() {
    unsafe {
        // 调用 C 的 abs
        println!("|-42| = {}", abs(-42));  // 42

        // 调用 C 的 sqrt
        println!("sqrt(144) = {}", sqrt(144.0));  // 12.0

        // 调用 C 的 strlen
        let c_string = b"Hello, World!\0";  // 注意末尾的 \0
        let len = strlen(c_string.as_ptr() as *const i8);
        println!("字符串长度: {}", len);  // 13

        // 获取进程 ID
        println!("PID: {}", getpid());
    }
}
```

对比 Node.js 的 FFI：

```javascript
// Node.js - 使用 node-ffi-napi 调用 C 库
const ffi = require('ffi-napi');

const libm = ffi.Library('libm', {
    'sqrt': ['double', ['double']],
    'abs': ['int', ['int']],
});

console.log(libm.sqrt(144));  // 12
console.log(libm.abs(-42));   // 42

// Node.js 的 FFI 也是"不安全"的
// 传错参数类型可能导致段错误
```

### 22.4.4 从 C 调用 Rust 函数

你也可以让 C 代码调用 Rust 函数。用 `extern "C"` 和 `#[no_mangle]` 标注：

```rust
// 让 C 代码可以调用这个 Rust 函数
#[no_mangle]
pub extern "C" fn rust_add(a: i32, b: i32) -> i32 {
    a + b
}

// #[no_mangle] 阻止 Rust 编译器修改函数名（name mangling）
// extern "C" 指定使用 C 调用约定
```

### 22.4.5 使用 libc crate 进行系统调用

```rust
// Cargo.toml:
// [dependencies]
// libc = "0.2"

use std::ffi::CString;

fn main() {
    // 获取环境变量
    let key = CString::new("HOME").unwrap();
    unsafe {
        let value = libc::getenv(key.as_ptr());
        if !value.is_null() {
            let home = std::ffi::CStr::from_ptr(value);
            println!("HOME = {}", home.to_str().unwrap());
        }
    }

    // 获取系统信息
    unsafe {
        let mut info: libc::utsname = std::mem::zeroed();
        if libc::uname(&mut info) == 0 {
            let sysname = std::ffi::CStr::from_ptr(info.sysname.as_ptr());
            println!("操作系统: {}", sysname.to_str().unwrap());
        }
    }
}
```

---

## 22.5 安全抽象 —— unsafe 的最佳实践

### 22.5.1 核心理念：在 unsafe 之上构建安全 API

unsafe 的哲学不是"到处写 unsafe"，而是：

```
┌────────────────────────────────────────────────────────┐
│              安全抽象的层次结构                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  用户代码（100% safe）                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  let mut v = Vec::new();                         │  │
│  │  v.push(1);                                      │  │
│  │  v.push(2);                                      │  │
│  │  println!("{:?}", v);  // 完全安全！               │  │
│  └──────────────────────────────────────────────────┘  │
│                     ▲ 安全 API                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  // Vec 的实现内部                                 │  │
│  │  pub fn push(&mut self, value: T) {              │  │
│  │      if self.len == self.cap {                    │  │
│  │          self.grow();  // 重新分配内存              │  │
│  │      }                                           │  │
│  │      unsafe {                                    │  │
│  │          ptr::write(self.ptr.add(self.len), value);│ │
│  │      }                                           │  │
│  │      self.len += 1;                              │  │
│  │  }                                               │  │
│  └──────────────────────────────────────────────────┘  │
│                     ▲ unsafe 实现                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  系统分配器（malloc/free）                          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 22.5.2 实战：split_at_mut 的安全抽象

标准库的 `split_at_mut` 方法是安全抽象的经典例子。它把一个可变切片分成两个不重叠的可变切片：

```rust
fn main() {
    let mut data = vec![1, 2, 3, 4, 5, 6];
    let slice = &mut data[..];

    // split_at_mut 是安全的 API
    let (left, right) = slice.split_at_mut(3);
    left[0] = 100;
    right[0] = 400;
    println!("left: {:?}", left);    // [100, 2, 3]
    println!("right: {:?}", right);  // [400, 5, 6]
}
```

但 `split_at_mut` 的实现必须使用 unsafe，因为 Rust 的借用检查器不允许从同一个切片创建两个可变引用：

```rust
// 自己实现 split_at_mut
fn my_split_at_mut(slice: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = slice.len();
    let ptr = slice.as_mut_ptr();

    // 安全检查：确保 mid 不越界
    assert!(mid <= len, "mid 超出范围");

    // 这里必须使用 unsafe
    // 因为编译器不知道两个切片不重叠
    unsafe {
        (
            std::slice::from_raw_parts_mut(ptr, mid),
            std::slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}

fn main() {
    let mut data = vec![1, 2, 3, 4, 5, 6];
    let (left, right) = my_split_at_mut(&mut data, 3);
    println!("left: {:?}", left);    // [1, 2, 3]
    println!("right: {:?}", right);  // [4, 5, 6]
}
```

**为什么这是安全的？**

1. 我们先检查了 `mid <= len`（边界检查）
2. 两个切片不重叠：`[0..mid)` 和 `[mid..len)` 是不相交的
3. 总长度等于原始切片长度，不会越界
4. 外部调用者使用的是安全的 API

### 22.5.3 实战：实现一个简单的内存池

```rust
use std::alloc::{self, Layout};
use std::ptr;

/// 一个简单的固定大小内存池
/// 外部 API 是完全安全的
struct MemoryPool {
    /// 底层内存块的裸指针
    memory: *mut u8,
    /// 每个元素的大小（字节）
    element_size: usize,
    /// 池的容量（元素个数）
    capacity: usize,
    /// 空闲链表头（存储下一个空闲块的索引）
    free_list: Vec<usize>,
}

impl MemoryPool {
    /// 创建一个新的内存池
    fn new(element_size: usize, capacity: usize) -> Self {
        // 确保对齐
        let layout = Layout::from_size_align(
            element_size * capacity,
            std::mem::align_of::<usize>(),
        ).expect("布局计算失败");

        // 分配内存 —— 这是 unsafe 的
        let memory = unsafe { alloc::alloc_zeroed(layout) };
        if memory.is_null() {
            alloc::handle_alloc_error(layout);
        }

        // 初始化空闲链表：所有块都是空闲的
        let free_list = (0..capacity).rev().collect();

        MemoryPool {
            memory,
            element_size,
            capacity,
            free_list,
        }
    }

    /// 从池中分配一个元素，返回索引
    fn allocate(&mut self) -> Option<usize> {
        self.free_list.pop()
    }

    /// 获取指定索引处的可变引用
    fn get_mut<T>(&mut self, index: usize) -> &mut T {
        assert!(index < self.capacity, "索引越界");
        assert!(std::mem::size_of::<T>() <= self.element_size, "类型太大");
        unsafe {
            let ptr = self.memory.add(index * self.element_size) as *mut T;
            &mut *ptr
        }
    }

    /// 释放一个元素
    fn deallocate(&mut self, index: usize) {
        assert!(index < self.capacity, "索引越界");
        self.free_list.push(index);
    }
}

impl Drop for MemoryPool {
    fn drop(&mut self) {
        let layout = Layout::from_size_align(
            self.element_size * self.capacity,
            std::mem::align_of::<usize>(),
        ).unwrap();
        unsafe {
            alloc::dealloc(self.memory, layout);
        }
    }
}

fn main() {
    // 使用者看到的是完全安全的 API
    let mut pool = MemoryPool::new(
        std::mem::size_of::<[u8; 64]>(), // 每个块 64 字节
        100,                              // 100 个块
    );

    // 分配
    if let Some(idx) = pool.allocate() {
        let data: &mut [u8; 64] = pool.get_mut(idx);
        data[0] = 42;
        println!("写入数据: {}", data[0]);

        // 释放
        pool.deallocate(idx);
    }
}
```

### 22.5.4 安全抽象的设计原则

```
┌──────────────────────────────────────────────────────┐
│              安全抽象设计原则                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. 最小化 unsafe 范围                                │
│     - unsafe 块尽可能小                               │
│     - 不要把整个函数标记为 unsafe                       │
│                                                      │
│  2. 文档化安全约束                                     │
│     - 用 # Safety 注释说明调用者需要保证什么             │
│     - 列出所有前置条件                                 │
│                                                      │
│  3. 在边界做检查                                       │
│     - 安全 API 的入口处做参数检查                       │
│     - assert! 检查索引、长度、对齐等                    │
│                                                      │
│  4. 封装（Encapsulation）                              │
│     - unsafe 细节不暴露给用户                          │
│     - 模块边界是安全边界                               │
│                                                      │
│  5. 测试覆盖                                          │
│     - 用 Miri 检测未定义行为                           │
│     - 用模糊测试发现边界情况                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 22.6 访问和修改可变静态变量

### 22.6.1 静态变量 vs 常量

```rust
// 常量：编译时确定，内联到使用处
const MAX_POINTS: u32 = 100_000;

// 不可变静态变量：有固定的内存地址，不需要 unsafe
static GREETING: &str = "Hello, World!";

// 可变静态变量：需要 unsafe 来访问
static mut COUNTER: u32 = 0;

fn increment() {
    // 访问可变静态变量必须用 unsafe
    unsafe {
        COUNTER += 1;
    }
}

fn get_count() -> u32 {
    unsafe { COUNTER }
}

fn main() {
    increment();
    increment();
    increment();
    println!("计数器: {}", get_count());  // 3
}
```

**为什么 `static mut` 是 unsafe 的？** 因为在多线程环境下，多个线程同时读写静态变量会导致数据竞争。编译器无法静态验证你不会这么做，所以要求你用 unsafe 来承担责任。

### 22.6.2 更安全的替代方案

在大多数情况下，你应该用原子类型或 `Mutex` 代替 `static mut`：

```rust
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use std::sync::LazyLock;

// 方案 1：原子类型（适合简单计数器）
static COUNTER: AtomicU32 = AtomicU32::new(0);

fn increment_atomic() {
    COUNTER.fetch_add(1, Ordering::SeqCst);  // 完全安全！
}

// 方案 2：Mutex（适合复杂数据结构）
static CONFIG: LazyLock<Mutex<Vec<String>>> = LazyLock::new(|| {
    Mutex::new(vec!["default".to_string()])
});

fn add_config(item: String) {
    CONFIG.lock().unwrap().push(item);  // 完全安全！
}

fn main() {
    increment_atomic();
    increment_atomic();
    println!("原子计数: {}", COUNTER.load(Ordering::SeqCst));

    add_config("custom".to_string());
    println!("配置: {:?}", CONFIG.lock().unwrap());
}
```

---

## 22.7 实现 unsafe trait

### 22.7.1 什么是 unsafe trait？

`unsafe trait` 意味着实现者需要保证某些编译器无法检查的不变量：

```rust
// 标准库中最重要的两个 unsafe trait
// pub unsafe trait Send { }  // 类型可以安全地在线程间转移所有权
// pub unsafe trait Sync { }  // 类型可以安全地在线程间共享引用

// 自定义 unsafe trait
/// # Safety
/// 实现者必须保证 validate() 在任何情况下都不会 panic
unsafe trait Validator {
    fn validate(&self) -> bool;
}

// 实现 unsafe trait 也需要 unsafe
struct PositiveNumber(i32);

unsafe impl Validator for PositiveNumber {
    fn validate(&self) -> bool {
        self.0 > 0
    }
}
```

### 22.7.2 Send 和 Sync

```rust
use std::rc::Rc;
use std::sync::Arc;

fn main() {
    // Rc 没有实现 Send，不能跨线程传递
    let rc = Rc::new(42);
    // std::thread::spawn(move || {
    //     println!("{}", rc);  // ❌ 编译错误：Rc 不是 Send
    // });

    // Arc 实现了 Send，可以跨线程传递
    let arc = Arc::new(42);
    let arc_clone = arc.clone();
    std::thread::spawn(move || {
        println!("{}", arc_clone);  // ✅ Arc 是 Send
    }).join().unwrap();
}

// 如果你的类型包含裸指针，编译器不会自动实现 Send/Sync
// 你需要手动标记（如果确实安全的话）
struct MyPointerWrapper {
    ptr: *mut i32,
}

// 告诉编译器：我保证这个类型在线程间传递是安全的
unsafe impl Send for MyPointerWrapper {}
unsafe impl Sync for MyPointerWrapper {}
```

---

## 22.8 访问 union 的字段

### 22.8.1 什么是 union？

`union` 类似于 `enum`，但所有字段共享同一块内存。主要用于 FFI：

```rust
// union 的所有字段共享同一块内存
#[repr(C)]
union IntOrFloat {
    i: i32,
    f: f32,
}

fn main() {
    let mut value = IntOrFloat { i: 42 };

    // 读取 union 字段需要 unsafe
    // 因为编译器不知道当前存储的是哪个变体
    unsafe {
        println!("作为整数: {}", value.i);  // 42
        println!("作为浮点: {}", value.f);  // 某个奇怪的浮点数

        // 写入不需要 unsafe
        value.f = 3.14;
        println!("作为浮点: {}", value.f);    // 3.14
        println!("作为整数: {}", value.i);    // 3.14 的位模式解释为整数
    }
}
```

对比 TypeScript 的联合类型：

```typescript
// TypeScript 的联合类型是类型安全的
type IntOrFloat = { kind: 'int'; value: number } | { kind: 'float'; value: number };

// 你必须通过判别字段来确定当前类型
function process(x: IntOrFloat) {
    if (x.kind === 'int') {
        console.log('整数:', x.value);
    } else {
        console.log('浮点:', x.value);
    }
}

// Rust 的 union 没有判别字段，你自己记住当前是什么类型
```

### 22.8.2 union 在 FFI 中的应用

```rust
// 模拟 C 语言的网络地址联合体
#[repr(C)]
struct IPv4Addr {
    octets: [u8; 4],
}

#[repr(C)]
struct IPv6Addr {
    segments: [u16; 8],
}

#[repr(C)]
union IpAddr {
    v4: IPv4Addr,
    v6: IPv6Addr,
}

// 通常搭配一个标签字段来区分当前变体
struct TaggedIpAddr {
    family: u8,  // 4 = IPv4, 6 = IPv6
    addr: IpAddr,
}

impl TaggedIpAddr {
    fn print(&self) {
        match self.family {
            4 => unsafe {
                let v4 = &self.addr.v4;
                println!("{}.{}.{}.{}", v4.octets[0], v4.octets[1],
                         v4.octets[2], v4.octets[3]);
            },
            6 => unsafe {
                let v6 = &self.addr.v6;
                println!("IPv6: {:?}", v6.segments);
            },
            _ => println!("未知地址类型"),
        }
    }
}
```

---

## 22.9 使用 Miri 检测 unsafe 中的未定义行为

Miri 是 Rust 的解释器，可以检测 unsafe 代码中的未定义行为：

```bash
# 安装 Miri
rustup +nightly component add miri

# 运行 Miri 检测
cargo +nightly miri test
cargo +nightly miri run
```

```rust
// Miri 可以检测到的问题示例：

// 1. 使用未初始化的内存
fn uninit_read() {
    let x: i32;
    // unsafe { println!("{}", x); }  // Miri 会报告！
}

// 2. 越界访问
fn out_of_bounds() {
    let arr = [1, 2, 3];
    let ptr = arr.as_ptr();
    // unsafe { println!("{}", *ptr.add(10)); }  // Miri 会报告！
}

// 3. 违反别名规则（Stacked Borrows）
fn aliasing_violation() {
    let mut x = 42;
    let p1 = &mut x as *mut i32;
    let r = &x;  // 创建不可变引用
    // unsafe { *p1 = 100; }  // 通过裸指针修改 —— Miri 会报告！
    // println!("{}", r);
}
```

---

## 22.10 unsafe 代码的文档规范

```rust
/// 从裸指针和长度重建 Vec
///
/// # Safety
///
/// 调用者必须确保以下条件成立：
///
/// - `ptr` 必须是通过 `Vec::into_raw_parts()` 获得的
/// - `ptr` 指向的内存必须仍然有效（未被释放）
/// - `length` 不能超过原始 Vec 的长度
/// - `capacity` 必须等于原始 Vec 的容量
/// - `T` 的类型必须与原始 Vec 的元素类型一致
///
/// # Examples
///
/// ```
/// let v = vec![1, 2, 3];
/// let (ptr, len, cap) = v.into_raw_parts();
/// let rebuilt = unsafe { rebuild_vec(ptr, len, cap) };
/// assert_eq!(rebuilt, [1, 2, 3]);
/// ```
unsafe fn rebuild_vec<T>(ptr: *mut T, length: usize, capacity: usize) -> Vec<T> {
    Vec::from_raw_parts(ptr, length, capacity)
}
```

---

## 22.11 实战练习

### 练习 1：安全的栈分配数组

实现一个固定大小的栈上数组，内部使用 unsafe 但提供安全的 API：

```rust
/// 一个固定大小的栈上数组
struct FixedArray<T: Default + Copy, const N: usize> {
    data: [T; N],
    len: usize,
}

impl<T: Default + Copy, const N: usize> FixedArray<T, N> {
    fn new() -> Self {
        // TODO: 实现
        todo!()
    }

    fn push(&mut self, value: T) -> Result<(), &'static str> {
        // TODO: 检查容量，然后使用 unsafe 写入
        todo!()
    }

    fn get(&self, index: usize) -> Option<&T> {
        // TODO: 边界检查后使用 unsafe 返回引用
        todo!()
    }

    fn len(&self) -> usize {
        self.len
    }
}

// 测试
fn main() {
    let mut arr: FixedArray<i32, 10> = FixedArray::new();
    arr.push(1).unwrap();
    arr.push(2).unwrap();
    arr.push(3).unwrap();
    assert_eq!(arr.get(0), Some(&1));
    assert_eq!(arr.get(1), Some(&2));
    assert_eq!(arr.len(), 3);
    println!("所有测试通过！");
}
```

### 练习 2：实现一个简单的链表

使用裸指针实现一个单链表：

```rust
struct Node<T> {
    value: T,
    next: *mut Node<T>,
}

struct LinkedList<T> {
    head: *mut Node<T>,
    len: usize,
}

impl<T> LinkedList<T> {
    fn new() -> Self {
        // TODO: 实现
        todo!()
    }

    fn push_front(&mut self, value: T) {
        // TODO: 在链表头部插入元素
        // 提示：使用 Box::into_raw 分配节点
        todo!()
    }

    fn pop_front(&mut self) -> Option<T> {
        // TODO: 移除并返回头部元素
        // 提示：使用 Box::from_raw 回收节点
        todo!()
    }

    fn len(&self) -> usize {
        self.len
    }
}

impl<T> Drop for LinkedList<T> {
    fn drop(&mut self) {
        // TODO: 释放所有节点
        while self.pop_front().is_some() {}
    }
}

fn main() {
    let mut list = LinkedList::new();
    list.push_front(3);
    list.push_front(2);
    list.push_front(1);

    assert_eq!(list.pop_front(), Some(1));
    assert_eq!(list.pop_front(), Some(2));
    assert_eq!(list.pop_front(), Some(3));
    assert_eq!(list.pop_front(), None);
    println!("链表测试通过！");
}
```

### 练习 3：FFI 绑定

为 C 的 `qsort` 函数写一个安全的 Rust 封装：

```rust
extern "C" {
    fn qsort(
        base: *mut std::ffi::c_void,
        nmemb: usize,
        size: usize,
        compar: extern "C" fn(*const std::ffi::c_void, *const std::ffi::c_void) -> i32,
    );
}

/// 安全的排序封装
fn safe_sort<T: Ord>(slice: &mut [T]) {
    // TODO: 实现
    // 提示：
    // 1. 定义一个 extern "C" 的比较函数
    // 2. 使用 std::mem::size_of::<T>() 获取元素大小
    // 3. 在 unsafe 块中调用 qsort
    todo!()
}

fn main() {
    let mut data = vec![5, 3, 8, 1, 9, 2, 7, 4, 6];
    safe_sort(&mut data);
    println!("{:?}", data);  // [1, 2, 3, 4, 5, 6, 7, 8, 9]
}
```

### 练习 4：思考题

1. `unsafe` 代码中出了 bug，谁负责？编译器还是程序员？
2. 为什么 `Vec::push` 是安全的，尽管它内部使用了 unsafe？
3. 如果一个 safe 函数调用了 unsafe 函数，这个 safe 函数的调用者需要担心 unsafe 吗？
4. `Send` 和 `Sync` 为什么是 unsafe trait？如果错误地实现了它们会怎样？
5. Miri 能检测所有的未定义行为吗？它有什么局限性？

---

## 22.12 本章小结

```
┌──────────────────────────────────────────────────────┐
│                  Unsafe Rust 小结                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  unsafe 不是"关闭安全"，而是"承担责任"                  │
│                                                      │
│  五种超能力：                                          │
│  1. 解引用裸指针                                      │
│  2. 调用 unsafe 函数                                  │
│  3. 访问 static mut                                   │
│  4. 实现 unsafe trait                                 │
│  5. 访问 union 字段                                   │
│                                                      │
│  最佳实践：                                            │
│  ✅ 最小化 unsafe 范围                                 │
│  ✅ 在 unsafe 之上构建安全抽象                          │
│  ✅ 文档化 # Safety 约束                               │
│  ✅ 用 Miri 检测未定义行为                              │
│  ✅ 优先使用安全替代方案（Atomic、Mutex）                │
│  ❌ 不要为了性能到处写 unsafe                           │
│  ❌ 不要忽略安全约束的文档                              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

> **下一章预告：** 第二十三章我们将探索 Rust 的高级类型系统 —— 关联类型、Newtype 模式、Never 类型等，这些是写出优雅 Rust 代码的关键！
