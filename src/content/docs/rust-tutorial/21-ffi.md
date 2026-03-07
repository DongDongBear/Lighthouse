# 第二十一章：实战 —— FFI 与 C/Node.js 交互

> **本章目标**
>
> - 理解什么是 FFI（Foreign Function Interface）以及它的应用场景
> - 掌握从 Rust 调用 C 库的方法
> - 学会从 C 代码调用 Rust 编写的函数
> - 深入理解 `unsafe` 在 FFI 中的作用与安全封装策略
> - 掌握 Rust 与 Node.js 交互的核心框架 napi-rs
> - 实战：用 Rust 编写一个高性能的 Node.js native addon
> - 理解 ABI、调用约定、内存布局等底层概念

> **预计学习时间：150 - 200 分钟**（系统编程的大门，从这里打开！）

---

## 21.1 什么是 FFI？—— 跨语言的桥梁

### 21.1.1 为什么需要 FFI？

作为 JavaScript/TypeScript 开发者，你可能已经不知不觉地使用过 FFI 了：

```javascript
// Node.js 的很多核心模块底层都是 C/C++ 实现的
const crypto = require('crypto');  // 底层调用 OpenSSL（C 库）
const zlib = require('zlib');      // 底层调用 zlib（C 库）
const fs = require('fs');          // 底层调用操作系统的 C API

// 这些 npm 包也是 native addon（C/C++ 扩展）
// - bcrypt（密码哈希）
// - sharp（图片处理，底层用 libvips）
// - better-sqlite3（SQLite 数据库）
// - canvas（node-canvas，底层用 Cairo）
```

**FFI（Foreign Function Interface，外部函数接口）** 就是让不同编程语言之间可以互相调用函数的机制。

```
┌─────────────────────────────────────────────────────────────┐
│                       FFI 的世界                              │
│                                                              │
│   ┌──────┐     FFI      ┌──────┐     FFI      ┌──────┐     │
│   │ Rust │ ◄──────────► │  C   │ ◄──────────► │ Node │     │
│   │      │              │      │              │  .js │     │
│   └──────┘              └──────┘              └──────┘     │
│      ▲                     ▲                     ▲          │
│      │                     │                     │          │
│      │    几乎所有语言都能通过 C ABI 互相通信       │          │
│      │                     │                     │          │
│   ┌──────┐              ┌──────┐              ┌──────┐     │
│   │Python│              │  Go  │              │ Java │     │
│   └──────┘              └──────┘              └──────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 21.1.2 C ABI：通用语言

为什么 C 在 FFI 中如此重要？因为 **C ABI（Application Binary Interface）** 是事实上的跨语言通信标准。

| 概念 | 说明 | 类比 (JS 世界) |
|---|---|---|
| **ABI** | 二进制级别的函数调用约定 | 类似 HTTP 协议，定义了数据如何传输 |
| **调用约定** | 参数怎么传、返回值怎么取 | 类似 REST API 的请求/响应格式 |
| **名称修饰** | 函数名在二进制中的表示方式 | 类似 URL 路由 |
| **内存布局** | 结构体在内存中如何排列 | 类似 JSON 的序列化格式 |

```
为什么 C ABI 是"通用语"？

┌──────────────────────────────────────────────────┐
│                                                   │
│  C++ 有名称修饰（name mangling）→ 不通用         │
│  Java 有 JVM → 需要 JNI 桥接                     │
│  Python 有 GIL → 需要特殊处理                    │
│  Go 有自己的调用约定 → 需要 cgo                   │
│                                                   │
│  而 C：                                           │
│  ✅ 没有名称修饰                                  │
│  ✅ 调用约定简单明确                               │
│  ✅ 内存布局可预测                                 │
│  ✅ 几乎所有操作系统 API 都是 C 接口                │
│  ✅ 几乎所有语言都支持调用 C 函数                   │
│                                                   │
│  所以 C ABI 成了"世界语"                           │
└──────────────────────────────────────────────────┘
```

### 21.1.3 Rust 的 FFI 优势

Rust 在 FFI 方面有独特的优势：

1. **零开销**：Rust 调用 C 函数没有运行时开销（不像 Java 的 JNI）
2. **内存安全**：可以用 safe Rust 封装 unsafe 的 C 调用
3. **无 GC**：不需要担心垃圾回收和 C 代码的交互问题
4. **丰富的工具**：`bindgen` 可以自动从 C 头文件生成 Rust 绑定
5. **`#[repr(C)]`**：可以精确控制内存布局，与 C 结构体完全兼容

---

## 21.2 从 Rust 调用 C 库

### 21.2.1 基础：调用 libc 函数

```rust
// 从 Rust 调用 C 标准库函数

// extern "C" 块声明外部 C 函数
// "C" 指定使用 C 调用约定
extern "C" {
    // C 的 abs 函数：int abs(int x)
    fn abs(x: i32) -> i32;

    // C 的 strlen 函数：size_t strlen(const char *s)
    fn strlen(s: *const std::os::raw::c_char) -> usize;

    // C 的 printf 函数：int printf(const char *format, ...)
    // 注意：可变参数函数需要特殊处理
    fn printf(format: *const std::os::raw::c_char, ...) -> i32;

    // C 的 malloc/free：内存分配
    fn malloc(size: usize) -> *mut std::os::raw::c_void;
    fn free(ptr: *mut std::os::raw::c_void);
}

fn main() {
    // 调用 C 函数必须在 unsafe 块中
    // 因为 Rust 编译器无法验证 C 函数的安全性
    unsafe {
        // abs
        let result = abs(-42);
        println!("abs(-42) = {}", result); // 42

        // strlen
        let c_string = std::ffi::CString::new("Hello, FFI!").unwrap();
        let len = strlen(c_string.as_ptr());
        println!("字符串长度: {}", len); // 11

        // malloc + free
        let ptr = malloc(100) as *mut u8;
        if !ptr.is_null() {
            // 使用分配的内存...
            *ptr = 42;
            println!("值: {}", *ptr);
            free(ptr as *mut std::os::raw::c_void);
        }
    }
}
```

**为什么需要 `unsafe`？**

```
┌────────────────────────────────────────────────────────────┐
│                   unsafe 的必要性                            │
│                                                             │
│  Rust 编译器的安全保证基于它能"看到"所有代码。                 │
│  但 C 函数是外部的，编译器看不到，所以：                       │
│                                                             │
│  ❓ 这个指针是否有效？      → Rust 不知道                    │
│  ❓ 这块内存是否已释放？    → Rust 不知道                    │
│  ❓ 是否有数据竞争？        → Rust 不知道                    │
│  ❓ 这个函数是否真的存在？  → 链接时才知道                    │
│                                                             │
│  所以 Rust 要求你用 unsafe 明确承担安全责任：                  │
│  "我（程序员）保证这段代码是安全的"                           │
└────────────────────────────────────────────────────────────┘
```

### 21.2.2 字符串转换

C 和 Rust 的字符串有本质区别：

```
C 字符串 (char *)：
┌───┬───┬───┬───┬───┬───┐
│ H │ e │ l │ l │ o │\0 │  ← 以 null 结尾
└───┴───┴───┴───┴───┴───┘

Rust 字符串 (&str / String)：
┌─────────┬────────┐
│ 指针     │ 长度    │  ← 知道长度，不需要 null 结尾
├─────────┴────────┤
│ H  e  l  l  o    │  ← UTF-8 编码，可以包含 \0
└──────────────────┘
```

```rust
use std::ffi::{CStr, CString};
use std::os::raw::c_char;

// ========== Rust → C 字符串 ==========

fn rust_to_c_string() {
    // 方法一：CString（拥有所有权的 C 字符串）
    let rust_str = "你好，世界";
    let c_string = CString::new(rust_str).expect("字符串中不能包含 \\0");

    unsafe {
        // c_string.as_ptr() 返回 *const c_char
        let ptr: *const c_char = c_string.as_ptr();
        // 现在可以把 ptr 传给 C 函数了

        // ⚠️ 重要：c_string 必须在 C 函数使用 ptr 期间保持存活！
        // 如果 c_string 被 drop，ptr 就变成悬垂指针了
        some_c_function(ptr);
    }
    // c_string 在这里被 drop，内存被释放
}

// ========== C → Rust 字符串 ==========

fn c_to_rust_string() {
    unsafe {
        // 假设 C 函数返回了一个 char*
        let c_ptr: *const c_char = some_c_function_returning_string();

        if c_ptr.is_null() {
            println!("C 函数返回了 NULL");
            return;
        }

        // 方法一：CStr（不拥有所有权，借用 C 字符串）
        let c_str = CStr::from_ptr(c_ptr);
        let rust_str: &str = c_str.to_str().expect("不是有效的 UTF-8");
        println!("从 C 得到: {}", rust_str);

        // 方法二：转换为拥有所有权的 String（会拷贝数据）
        let owned_string: String = c_str.to_string_lossy().into_owned();
        // 现在 owned_string 独立于 C 的内存，可以安全使用

        // ⚠️ 如果 C 函数要求调用者释放内存，需要手动 free
        // libc::free(c_ptr as *mut c_void);
    }
}

// 声明外部 C 函数（示例）
extern "C" {
    fn some_c_function(s: *const c_char);
    fn some_c_function_returning_string() -> *const c_char;
}
```

### 21.2.3 使用 libc crate

```toml
# Cargo.toml
[dependencies]
libc = "0.2"
```

```rust
use libc::{c_char, c_int, c_void, size_t};
use std::ffi::CString;

fn main() {
    unsafe {
        // 获取当前进程 ID
        let pid = libc::getpid();
        println!("进程 ID: {}", pid);

        // 获取环境变量
        let key = CString::new("HOME").unwrap();
        let value = libc::getenv(key.as_ptr());
        if !value.is_null() {
            let home = std::ffi::CStr::from_ptr(value).to_str().unwrap();
            println!("HOME = {}", home);
        }

        // 获取系统信息
        let mut info: libc::utsname = std::mem::zeroed();
        if libc::uname(&mut info) == 0 {
            let sysname = std::ffi::CStr::from_ptr(info.sysname.as_ptr());
            let nodename = std::ffi::CStr::from_ptr(info.nodename.as_ptr());
            println!("系统: {}", sysname.to_str().unwrap());
            println!("主机名: {}", nodename.to_str().unwrap());
        }

        // 使用 mmap 分配内存（高级用法）
        let size = 4096;
        let ptr = libc::mmap(
            std::ptr::null_mut(),
            size,
            libc::PROT_READ | libc::PROT_WRITE,
            libc::MAP_PRIVATE | libc::MAP_ANONYMOUS,
            -1,
            0,
        );

        if ptr != libc::MAP_FAILED {
            // 使用映射的内存
            let slice = std::slice::from_raw_parts_mut(ptr as *mut u8, size);
            slice[0] = 42;
            println!("mmap 中的值: {}", slice[0]);

            // 释放
            libc::munmap(ptr, size);
        }
    }
}
```

### 21.2.4 调用第三方 C 库

以调用 `zlib`（压缩库）为例：

```toml
# Cargo.toml
[build-dependencies]
cc = "1.0"           # 用于编译 C 代码
pkg-config = "0.3"   # 用于查找系统安装的 C 库
```

```rust
// build.rs - 构建脚本

fn main() {
    // 方法一：使用 pkg-config 查找系统安装的库
    pkg_config::Config::new()
        .atleast_version("1.2")
        .probe("zlib")
        .expect("找不到 zlib 库，请安装 zlib-dev");

    // 方法二：手动指定链接
    // println!("cargo:rustc-link-lib=z");           // 链接 libz
    // println!("cargo:rustc-link-search=/usr/lib"); // 搜索路径
}
```

```rust
// src/main.rs

use std::os::raw::{c_int, c_ulong, c_uchar};

// 声明 zlib 的压缩/解压函数
extern "C" {
    fn compress(
        dest: *mut c_uchar,
        dest_len: *mut c_ulong,
        source: *const c_uchar,
        source_len: c_ulong,
    ) -> c_int;

    fn uncompress(
        dest: *mut c_uchar,
        dest_len: *mut c_ulong,
        source: *const c_uchar,
        source_len: c_ulong,
    ) -> c_int;
}

// 安全封装
fn safe_compress(data: &[u8]) -> Result<Vec<u8>, String> {
    // 预分配输出缓冲区（最坏情况下比输入大一点点）
    let mut compressed = vec![0u8; data.len() + 128];
    let mut compressed_len = compressed.len() as c_ulong;

    let result = unsafe {
        compress(
            compressed.as_mut_ptr(),
            &mut compressed_len,
            data.as_ptr(),
            data.len() as c_ulong,
        )
    };

    if result == 0 {
        compressed.truncate(compressed_len as usize);
        Ok(compressed)
    } else {
        Err(format!("压缩失败，错误码: {}", result))
    }
}

fn safe_uncompress(data: &[u8], original_size: usize) -> Result<Vec<u8>, String> {
    let mut decompressed = vec![0u8; original_size];
    let mut decompressed_len = original_size as c_ulong;

    let result = unsafe {
        uncompress(
            decompressed.as_mut_ptr(),
            &mut decompressed_len,
            data.as_ptr(),
            data.len() as c_ulong,
        )
    };

    if result == 0 {
        decompressed.truncate(decompressed_len as usize);
        Ok(decompressed)
    } else {
        Err(format!("解压失败，错误码: {}", result))
    }
}

fn main() {
    let original = b"Hello, Rust FFI! This is a test of zlib compression. ".repeat(100);
    println!("原始大小: {} bytes", original.len());

    match safe_compress(&original) {
        Ok(compressed) => {
            println!("压缩后大小: {} bytes", compressed.len());
            println!("压缩率: {:.1}%", (1.0 - compressed.len() as f64 / original.len() as f64) * 100.0);

            match safe_uncompress(&compressed, original.len()) {
                Ok(decompressed) => {
                    assert_eq!(original, decompressed.as_slice());
                    println!("✅ 解压验证通过！");
                }
                Err(e) => println!("❌ {}", e),
            }
        }
        Err(e) => println!("❌ {}", e),
    }
}
```

### 21.2.5 使用 bindgen 自动生成绑定

手动声明 `extern "C"` 很繁琐，`bindgen` 可以自动从 C 头文件生成 Rust 绑定：

```toml
# Cargo.toml
[build-dependencies]
bindgen = "0.69"
```

```rust
// build.rs

fn main() {
    // 告诉 cargo 链接 C 库
    println!("cargo:rustc-link-lib=mylib");

    // 使用 bindgen 从头文件生成 Rust 绑定
    let bindings = bindgen::Builder::default()
        .header("wrapper.h")         // 输入的 C 头文件
        .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
        .generate()
        .expect("无法生成绑定");

    // 写入输出文件
    let out_path = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("无法写入绑定文件");
}
```

```c
// wrapper.h - 要绑定的 C 头文件

typedef struct {
    int x;
    int y;
    char name[64];
} MyStruct;

int process_data(const MyStruct *data, int count);
char* get_version(void);
void cleanup(char *ptr);
```

```rust
// src/main.rs

// 包含 bindgen 自动生成的绑定
include!(concat!(env!("OUT_DIR"), "/bindings.rs"));

fn main() {
    unsafe {
        // 现在可以直接使用 C 头文件中定义的类型和函数了
        let mut data = MyStruct {
            x: 10,
            y: 20,
            name: [0; 64],
        };

        // 设置 name 字段
        let name_bytes = b"test\0";
        data.name[..name_bytes.len()].copy_from_slice(
            &name_bytes.iter().map(|&b| b as i8).collect::<Vec<_>>()
        );

        let result = process_data(&data, 1);
        println!("结果: {}", result);

        let version = get_version();
        if !version.is_null() {
            let v = std::ffi::CStr::from_ptr(version);
            println!("版本: {}", v.to_str().unwrap());
            cleanup(version);
        }
    }
}
```

---

## 21.3 从 C 调用 Rust

### 21.3.1 导出 Rust 函数给 C 使用

```rust
// src/lib.rs

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};

// #[no_mangle] 防止 Rust 修改函数名（Rust 默认会做名称修饰）
// extern "C" 使用 C 调用约定
#[no_mangle]
pub extern "C" fn rust_add(a: c_int, b: c_int) -> c_int {
    a + b
}

// 导出一个处理字符串的函数
#[no_mangle]
pub extern "C" fn rust_greeting(name: *const c_char) -> *mut c_char {
    // 安全地将 C 字符串转换为 Rust 字符串
    let name_str = unsafe {
        if name.is_null() {
            return std::ptr::null_mut();
        }
        match CStr::from_ptr(name).to_str() {
            Ok(s) => s,
            Err(_) => return std::ptr::null_mut(),
        }
    };

    // 用 Rust 处理字符串
    let greeting = format!("你好，{}！来自 Rust", name_str);

    // 转换回 C 字符串并返回
    // 注意：调用者负责释放这块内存！
    match CString::new(greeting) {
        Ok(c_str) => c_str.into_raw(), // 转移所有权给 C
        Err(_) => std::ptr::null_mut(),
    }
}

// 提供一个释放函数，让 C 代码释放 Rust 分配的字符串
#[no_mangle]
pub extern "C" fn rust_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            // 重新获取所有权并 drop
            let _ = CString::from_raw(ptr);
        }
    }
}

// 导出结构体处理函数
#[repr(C)]  // 使用 C 内存布局！
pub struct RustPoint {
    pub x: f64,
    pub y: f64,
}

#[no_mangle]
pub extern "C" fn rust_distance(p1: *const RustPoint, p2: *const RustPoint) -> f64 {
    unsafe {
        if p1.is_null() || p2.is_null() {
            return -1.0;
        }
        let dx = (*p1).x - (*p2).x;
        let dy = (*p1).y - (*p2).y;
        (dx * dx + dy * dy).sqrt()
    }
}

// 导出数组处理函数
#[no_mangle]
pub extern "C" fn rust_sort_array(arr: *mut f64, len: usize) {
    if arr.is_null() || len == 0 {
        return;
    }

    unsafe {
        let slice = std::slice::from_raw_parts_mut(arr, len);
        slice.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    }
}

// 导出回调函数支持
type Callback = extern "C" fn(c_int) -> c_int;

#[no_mangle]
pub extern "C" fn rust_process_with_callback(
    data: *const c_int,
    len: usize,
    callback: Callback,
) -> c_int {
    if data.is_null() {
        return -1;
    }

    unsafe {
        let slice = std::slice::from_raw_parts(data, len);
        let mut sum = 0;
        for &val in slice {
            sum += callback(val);
        }
        sum
    }
}
```

编译配置：

```toml
# Cargo.toml
[lib]
name = "myrust"
crate-type = [
    "cdylib",      # 动态库 (.so / .dylib / .dll)
    "staticlib",   # 静态库 (.a / .lib)
]
```

```bash
# 编译
cargo build --release

# 生成的文件：
# Linux:   target/release/libmyrust.so (动态) + libmyrust.a (静态)
# macOS:   target/release/libmyrust.dylib + libmyrust.a
# Windows: target/release/myrust.dll + myrust.lib
```

### 21.3.2 生成 C 头文件

使用 `cbindgen` 自动从 Rust 代码生成 C 头文件：

```toml
# Cargo.toml
[build-dependencies]
cbindgen = "0.26"
```

```rust
// build.rs

fn main() {
    let crate_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();

    cbindgen::Builder::new()
        .with_crate(&crate_dir)
        .with_language(cbindgen::Language::C)
        .generate()
        .expect("无法生成 C 头文件")
        .write_to_file("include/myrust.h");
}
```

生成的 `include/myrust.h`：

```c
/* 自动生成的 C 头文件 */
#ifndef MYRUST_H
#define MYRUST_H

#include <stdint.h>
#include <stdbool.h>

typedef struct {
    double x;
    double y;
} RustPoint;

int rust_add(int a, int b);
char* rust_greeting(const char *name);
void rust_free_string(char *ptr);
double rust_distance(const RustPoint *p1, const RustPoint *p2);
void rust_sort_array(double *arr, size_t len);

typedef int (*Callback)(int);
int rust_process_with_callback(const int *data, size_t len, Callback callback);

#endif /* MYRUST_H */
```

### 21.3.3 在 C 程序中使用 Rust 库

```c
// main.c

#include <stdio.h>
#include <stdlib.h>
#include "include/myrust.h"

// 回调函数
int double_value(int x) {
    return x * 2;
}

int main() {
    // 1. 调用简单函数
    int sum = rust_add(3, 4);
    printf("3 + 4 = %d\n", sum);

    // 2. 调用字符串函数
    char *greeting = rust_greeting("动动");
    if (greeting != NULL) {
        printf("%s\n", greeting);
        rust_free_string(greeting);  // 记得释放！
    }

    // 3. 使用结构体
    RustPoint p1 = { .x = 0.0, .y = 0.0 };
    RustPoint p2 = { .x = 3.0, .y = 4.0 };
    double dist = rust_distance(&p1, &p2);
    printf("距离: %.2f\n", dist);  // 5.00

    // 4. 数组排序
    double arr[] = { 5.0, 3.0, 8.0, 1.0, 9.0, 2.0 };
    size_t len = sizeof(arr) / sizeof(arr[0]);
    rust_sort_array(arr, len);
    printf("排序后: ");
    for (size_t i = 0; i < len; i++) {
        printf("%.0f ", arr[i]);
    }
    printf("\n");  // 1 2 3 5 8 9

    // 5. 使用回调
    int data[] = { 1, 2, 3, 4, 5 };
    int result = rust_process_with_callback(data, 5, double_value);
    printf("回调结果: %d\n", result);  // 30 (2+4+6+8+10)

    return 0;
}
```

编译：

```bash
# 编译 Rust 库
cargo build --release

# 编译 C 程序并链接 Rust 库
gcc main.c -o main \
    -I. \
    -L target/release \
    -lmyrust \
    -lpthread -ldl -lm

# 设置动态库搜索路径并运行
LD_LIBRARY_PATH=target/release ./main
```

### 21.3.4 `#[repr(C)]` 详解

```rust
// Rust 的默认内存布局是不确定的（编译器可以随意重排字段）
struct RustLayout {
    a: u8,   // 1 字节
    b: u32,  // 4 字节
    c: u16,  // 2 字节
}
// Rust 可能重排为: b(4) + c(2) + a(1) + padding(1) = 8 字节

// #[repr(C)] 保证使用 C 的内存布局
#[repr(C)]
struct CLayout {
    a: u8,   // 1 字节 + 3 字节填充
    b: u32,  // 4 字节
    c: u16,  // 2 字节 + 2 字节填充
}
// 固定布局: a(1) + pad(3) + b(4) + c(2) + pad(2) = 12 字节

// 对比：
// struct RustLayout: 大小 8 字节（Rust 优化了布局）
// struct CLayout:    大小 12 字节（与 C 兼容，有更多填充）

// 其他 repr 选项：
#[repr(C, packed)]  // C 布局 + 无填充（紧凑排列）
struct Packed {
    a: u8,   // 1 字节
    b: u32,  // 4 字节（可能未对齐！）
    c: u16,  // 2 字节
}
// 总共 7 字节，但未对齐的访问可能更慢

#[repr(C, align(16))]  // C 布局 + 16 字节对齐
struct Aligned {
    data: [f32; 4],
}
// 适合 SIMD 操作
```

```
内存布局可视化：

RustLayout（编译器可能优化）：
┌───────┬───────┬────┬────┐
│  b    │  c    │ a  │pad │
│ 4字节  │ 2字节 │1字节│1字节│
└───────┴───────┴────┴────┘
总计: 8 字节

CLayout（固定布局）：
┌────┬────────┬───────┬───────┬────────┐
│ a  │ padding│  b    │  c    │ padding│
│1字节│ 3字节  │ 4字节  │ 2字节  │ 2字节  │
└────┴────────┴───────┴───────┴────────┘
总计: 12 字节
```

---

## 21.4 Rust 与 Node.js 交互 —— napi-rs

### 21.4.1 为什么用 napi-rs？

作为 JavaScript/TypeScript 开发者，这部分对你最有用！`napi-rs` 让你用 Rust 写 Node.js 原生模块，替代传统的 C++ addon。

```
传统方式（C++ addon）：
┌─────────┐     N-API     ┌─────────┐
│  C++    │ ◄──────────► │ Node.js  │
│ 代码     │              │          │
└─────────┘              └─────────┘
问题：C++ 代码难写、内存不安全、构建系统复杂

napi-rs 方式：
┌─────────┐    napi-rs    ┌─────────┐
│  Rust   │ ◄──────────► │ Node.js  │
│ 代码     │  (自动生成)   │          │
└─────────┘              └─────────┘
优势：Rust 的安全性 + 自动生成 JS 绑定 + 完美的 TS 支持
```

对比传统 C++ addon：

| 特性 | C++ addon (node-addon-api) | napi-rs (Rust) |
|---|---|---|
| **内存安全** | ❌ 手动管理 | ✅ 编译器保证 |
| **TypeScript 支持** | ❌ 需要手写 .d.ts | ✅ 自动生成 |
| **构建工具** | node-gyp (痛苦) | cargo (愉快) |
| **跨平台编译** | 困难 | 简单 |
| **学习曲线** | 陡峭 | 中等 |
| **性能** | 极高 | 极高 (相当) |
| **NPM 发布** | 复杂 | 一键发布 |

### 21.4.2 创建 napi-rs 项目

```bash
# 方法一：使用 @napi-rs/cli 创建（推荐）
npm install -g @napi-rs/cli
napi new my-native-addon
cd my-native-addon

# 方法二：手动创建
cargo new --lib my-native-addon
cd my-native-addon
npm init -y
npm install @napi-rs/cli -D
```

项目结构：

```
my-native-addon/
├── Cargo.toml        ← Rust 配置
├── package.json      ← NPM 配置
├── src/
│   └── lib.rs        ← Rust 代码
├── index.js          ← JS 入口（自动生成）
├── index.d.ts        ← TypeScript 类型（自动生成）
├── build.rs          ← 构建脚本
└── npm/              ← 各平台预编译二进制
    ├── darwin-arm64/
    ├── darwin-x64/
    ├── linux-x64-gnu/
    └── win32-x64-msvc/
```

`Cargo.toml`：

```toml
[package]
name = "my-native-addon"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
napi = { version = "2", features = ["full"] }
napi-derive = "2"

[build-dependencies]
napi-build = "2"

[profile.release]
lto = true
strip = "symbols"
```

### 21.4.3 编写 Rust 代码

```rust
// src/lib.rs

#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::*;
use std::collections::HashMap;

// ========== 基本函数 ==========

// 最简单的函数导出
#[napi]
pub fn sum(a: i32, b: i32) -> i32 {
    a + b
}

// 字符串处理（自动转换，不需要手动处理 CString！）
#[napi]
pub fn hello(name: String) -> String {
    format!("Hello, {}! 来自 Rust napi-rs", name)
}

// ========== 复杂类型 ==========

// 结构体自动映射为 JS 对象
#[napi(object)]
pub struct User {
    pub name: String,
    pub age: u32,
    pub email: Option<String>,  // Option → T | undefined
}

#[napi]
pub fn create_user(name: String, age: u32) -> User {
    User {
        name,
        age,
        email: None,
    }
}

#[napi]
pub fn greet_user(user: User) -> String {
    match user.email {
        Some(email) => format!("{}({})，你好！", user.name, email),
        None => format!("{}，你好！", user.name),
    }
}

// ========== 枚举 ==========

#[napi(string_enum)]
pub enum Color {
    Red,
    Green,
    Blue,
}

#[napi]
pub fn color_to_hex(color: Color) -> String {
    match color {
        Color::Red => "#FF0000".to_string(),
        Color::Green => "#00FF00".to_string(),
        Color::Blue => "#0000FF".to_string(),
    }
}

// ========== 类（带方法的结构体） ==========

#[napi]
pub struct Calculator {
    value: f64,
    history: Vec<String>,
}

#[napi]
impl Calculator {
    // 构造函数 → new Calculator(initial)
    #[napi(constructor)]
    pub fn new(initial: Option<f64>) -> Self {
        Calculator {
            value: initial.unwrap_or(0.0),
            history: Vec::new(),
        }
    }

    // 方法 → calc.add(5)
    #[napi]
    pub fn add(&mut self, n: f64) -> &Self {
        self.value += n;
        self.history.push(format!("+ {}", n));
        self
    }

    #[napi]
    pub fn subtract(&mut self, n: f64) -> &Self {
        self.value -= n;
        self.history.push(format!("- {}", n));
        self
    }

    #[napi]
    pub fn multiply(&mut self, n: f64) -> &Self {
        self.value *= n;
        self.history.push(format!("× {}", n));
        self
    }

    #[napi]
    pub fn divide(&mut self, n: f64) -> Result<&Self> {
        if n == 0.0 {
            return Err(Error::new(Status::InvalidArg, "除数不能为零".to_string()));
        }
        self.value /= n;
        self.history.push(format!("÷ {}", n));
        Ok(self)
    }

    // getter → calc.result
    #[napi(getter)]
    pub fn result(&self) -> f64 {
        self.value
    }

    // 获取历史记录
    #[napi]
    pub fn get_history(&self) -> Vec<String> {
        self.history.clone()
    }

    // 重置
    #[napi]
    pub fn reset(&mut self) {
        self.value = 0.0;
        self.history.clear();
    }
}

// ========== 异步函数 ==========

// async 函数自动变成返回 Promise 的函数！
#[napi]
pub async fn async_compute(input: String) -> Result<String> {
    // 模拟异步计算
    // 注意：这里的异步实际上会在 libuv 线程池中执行
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    Ok(format!("计算完成: {}", input.to_uppercase()))
}

// 使用 Task trait 实现真正的多线程计算
pub struct HeavyTask {
    input: Vec<f64>,
}

#[napi]
impl Task for HeavyTask {
    type Output = f64;
    type JsValue = JsNumber;

    fn compute(&mut self) -> Result<Self::Output> {
        // 这个函数在 libuv 线程池中执行，不阻塞 JS 主线程！
        let sum: f64 = self.input.iter().sum();
        let avg = sum / self.input.len() as f64;
        Ok(avg)
    }

    fn resolve(&mut self, env: Env, output: Self::Output) -> Result<Self::JsValue> {
        env.create_double(output)
    }
}

#[napi]
pub fn compute_average(input: Vec<f64>) -> AsyncTask<HeavyTask> {
    AsyncTask::new(HeavyTask { input })
}

// ========== Buffer / TypedArray 处理 ==========

// 直接操作 Node.js 的 Buffer（零拷贝！）
#[napi]
pub fn process_buffer(buf: Buffer) -> Buffer {
    let mut data = buf.to_vec();

    // 处理每个字节
    for byte in data.iter_mut() {
        *byte = byte.wrapping_add(1); // 简单的 Caesar 密码
    }

    data.into()
}

// 处理 Uint8Array
#[napi]
pub fn image_grayscale(pixels: &mut [u8]) {
    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0] as f64;
        let g = chunk[1] as f64;
        let b = chunk[2] as f64;
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        chunk[0] = gray;
        chunk[1] = gray;
        chunk[2] = gray;
    }
}

// ========== 回调函数 ==========

#[napi]
pub fn with_callback(
    data: Vec<i32>,
    callback: JsFunction,
) -> Result<()> {
    let sum: i32 = data.iter().sum();
    callback.call(None, &[sum.into()])?;
    Ok(())
}

// ========== 错误处理 ==========

#[napi]
pub fn parse_json(input: String) -> Result<HashMap<String, String>> {
    serde_json::from_str(&input)
        .map_err(|e| Error::new(Status::InvalidArg, format!("JSON 解析失败: {}", e)))
}

// ========== 性能密集型：实战例子 ==========

/// 快速的字符串搜索（使用 Aho-Corasick 算法）
#[napi]
pub fn find_all_matches(text: String, patterns: Vec<String>) -> Vec<MatchResult> {
    let mut results = Vec::new();

    for pattern in &patterns {
        let mut start = 0;
        while let Some(pos) = text[start..].find(pattern.as_str()) {
            results.push(MatchResult {
                pattern: pattern.clone(),
                position: (start + pos) as u32,
            });
            start += pos + 1;
        }
    }

    results.sort_by_key(|r| r.position);
    results
}

#[napi(object)]
pub struct MatchResult {
    pub pattern: String,
    pub position: u32,
}
```

### 21.4.4 自动生成的 TypeScript 类型

编译后，napi-rs 会自动生成 `index.d.ts`：

```typescript
// index.d.ts（自动生成！）

export function sum(a: number, b: number): number;
export function hello(name: string): string;

export interface User {
    name: string;
    age: number;
    email?: string;
}

export function createUser(name: string, age: number): User;
export function greetUser(user: User): string;

export const enum Color {
    Red = 'Red',
    Green = 'Green',
    Blue = 'Blue',
}

export function colorToHex(color: Color): string;

export class Calculator {
    constructor(initial?: number);
    add(n: number): this;
    subtract(n: number): this;
    multiply(n: number): this;
    divide(n: number): this;
    get result(): number;
    getHistory(): string[];
    reset(): void;
}

export function asyncCompute(input: string): Promise<string>;
export function computeAverage(input: number[]): Promise<number>;
export function processBuffer(buf: Buffer): Buffer;
export function imageGrayscale(pixels: Uint8Array): void;

export interface MatchResult {
    pattern: string;
    position: number;
}

export function findAllMatches(text: string, patterns: string[]): MatchResult[];
```

**看到了吗？** 完美的 TypeScript 类型支持，Rust 的类型直接映射为 TypeScript 类型！

### 21.4.5 在 Node.js / TypeScript 中使用

```typescript
// test.ts

import {
    sum,
    hello,
    createUser,
    greetUser,
    Calculator,
    Color,
    colorToHex,
    asyncCompute,
    computeAverage,
    processBuffer,
    findAllMatches,
} from './index';

// 基本函数
console.log(sum(1, 2));          // 3
console.log(hello("动动"));      // "Hello, 动动! 来自 Rust napi-rs"

// 结构体 → 对象
const user = createUser("小羊", 26);
console.log(user);               // { name: "小羊", age: 26, email: undefined }
console.log(greetUser(user));    // "小羊，你好！"

// 类
const calc = new Calculator(10);
calc.add(5).multiply(2).subtract(3);
console.log(calc.result);        // 27
console.log(calc.getHistory());  // ["+ 5", "× 2", "- 3"]

// 枚举
console.log(colorToHex(Color.Red));  // "#FF0000"

// 异步
const result = await asyncCompute("hello");
console.log(result);             // "计算完成: HELLO"

// 大数组计算（不阻塞主线程！）
const data = Array.from({ length: 1_000_000 }, () => Math.random());
const avg = await computeAverage(data);
console.log(`平均值: ${avg}`);

// Buffer 处理
const buf = Buffer.from("Hello");
const encrypted = processBuffer(buf);
console.log(encrypted.toString());  // "Ifmmp" (每个字符 +1)

// 字符串搜索
const matches = findAllMatches(
    "hello world, hello rust, hello node",
    ["hello", "rust"]
);
console.log(matches);
// [
//   { pattern: "hello", position: 0 },
//   { pattern: "hello", position: 13 },
//   { pattern: "rust", position: 19 },
//   { pattern: "hello", position: 25 },
// ]
```

### 21.4.6 构建和发布

```bash
# 开发构建
npm run build
# 等同于: napi build --platform --release

# 调试构建
npm run build -- --debug

# 运行测试
node test.ts

# 发布到 npm（支持多平台预编译）
napi prepublish
npm publish
```

---

## 21.5 安全封装 unsafe 代码

### 21.5.1 原则

```
┌─────────────────────────────────────────────────────────────┐
│              安全封装 unsafe 的核心原则                        │
│                                                              │
│  1. 最小化 unsafe 范围                                       │
│     → unsafe 块越小越好，只包含真正需要 unsafe 的操作          │
│                                                              │
│  2. 在 safe 函数中封装 unsafe 操作                            │
│     → 对外暴露 safe API，内部用 unsafe 实现                   │
│                                                              │
│  3. 明确文档化安全前提条件                                    │
│     → 注释说明为什么这段 unsafe 是安全的                      │
│                                                              │
│  4. 使用类型系统强制安全约束                                  │
│     → 利用生命周期、泛型约束等防止误用                        │
│                                                              │
│  5. 全面的测试                                                │
│     → unsafe 代码的 bug 可能导致 UB（未定义行为），测试至关重要│
└─────────────────────────────────────────────────────────────┘
```

### 21.5.2 实战：安全封装 C 库

```rust
// 假设我们要封装一个 C 的哈希表库

// 原始 C 接口（unsafe）
mod ffi {
    use std::os::raw::{c_char, c_void, c_int};

    // 不透明类型（C 的 struct 我们不知道内部结构）
    #[repr(C)]
    pub struct CHashMap {
        _opaque: [u8; 0],
    }

    extern "C" {
        pub fn hashmap_new() -> *mut CHashMap;
        pub fn hashmap_free(map: *mut CHashMap);
        pub fn hashmap_put(
            map: *mut CHashMap,
            key: *const c_char,
            value: *const c_void,
            value_len: usize,
        ) -> c_int;
        pub fn hashmap_get(
            map: *mut CHashMap,
            key: *const c_char,
            value_out: *mut *const c_void,
            value_len_out: *mut usize,
        ) -> c_int;
        pub fn hashmap_remove(map: *mut CHashMap, key: *const c_char) -> c_int;
        pub fn hashmap_count(map: *const CHashMap) -> usize;
    }
}

// 安全封装
pub struct SafeHashMap {
    inner: *mut ffi::CHashMap,
}

// 安全性：CHashMap 不包含线程相关的状态
// 但我们保守地不实现 Sync（不允许跨线程共享）
unsafe impl Send for SafeHashMap {}

impl SafeHashMap {
    /// 创建一个新的哈希表
    pub fn new() -> Result<Self, String> {
        let ptr = unsafe { ffi::hashmap_new() };
        if ptr.is_null() {
            Err("创建哈希表失败：内存分配错误".to_string())
        } else {
            Ok(SafeHashMap { inner: ptr })
        }
    }

    /// 插入键值对
    pub fn put(&mut self, key: &str, value: &[u8]) -> Result<(), String> {
        let c_key = std::ffi::CString::new(key)
            .map_err(|_| "key 不能包含 null 字节".to_string())?;

        let result = unsafe {
            ffi::hashmap_put(
                self.inner,
                c_key.as_ptr(),
                value.as_ptr() as *const std::os::raw::c_void,
                value.len(),
            )
        };

        if result == 0 {
            Ok(())
        } else {
            Err(format!("插入失败，错误码: {}", result))
        }
    }

    /// 获取值
    pub fn get(&self, key: &str) -> Option<Vec<u8>> {
        let c_key = std::ffi::CString::new(key).ok()?;

        let mut value_ptr: *const std::os::raw::c_void = std::ptr::null();
        let mut value_len: usize = 0;

        let result = unsafe {
            ffi::hashmap_get(
                self.inner,
                c_key.as_ptr(),
                &mut value_ptr,
                &mut value_len,
            )
        };

        if result == 0 && !value_ptr.is_null() {
            // 安全性：我们信任 C 库返回的指针和长度是有效的
            // 我们立即拷贝数据到 Rust 管理的 Vec 中
            let slice = unsafe {
                std::slice::from_raw_parts(value_ptr as *const u8, value_len)
            };
            Some(slice.to_vec())
        } else {
            None
        }
    }

    /// 删除键
    pub fn remove(&mut self, key: &str) -> bool {
        let c_key = match std::ffi::CString::new(key) {
            Ok(s) => s,
            Err(_) => return false,
        };

        unsafe { ffi::hashmap_remove(self.inner, c_key.as_ptr()) == 0 }
    }

    /// 获取元素数量
    pub fn len(&self) -> usize {
        unsafe { ffi::hashmap_count(self.inner) }
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

// 实现 Drop 确保资源被释放（类似 JS 的 FinalizationRegistry，但可靠）
impl Drop for SafeHashMap {
    fn drop(&mut self) {
        if !self.inner.is_null() {
            unsafe {
                ffi::hashmap_free(self.inner);
            }
            self.inner = std::ptr::null_mut();
        }
    }
}

// 使用示例 —— 完全 safe！
fn main() {
    let mut map = SafeHashMap::new().unwrap();

    map.put("name", b"DongDong").unwrap();
    map.put("age", &28u32.to_le_bytes()).unwrap();

    if let Some(name) = map.get("name") {
        println!("名字: {}", String::from_utf8_lossy(&name));
    }

    println!("元素数量: {}", map.len());

    map.remove("age");

    // map 在这里自动 drop，C 的 hashmap_free 被自动调用
    // 不需要手动释放！
}
```

### 21.5.3 常见的 unsafe 陷阱

```rust
// ❌ 陷阱 1：悬垂指针
fn bad_example_1() -> *const u8 {
    let data = vec![1, 2, 3];
    data.as_ptr()  // ❌ data 在函数结束时被释放，指针悬垂！
}

// ✅ 正确做法
fn good_example_1() -> Vec<u8> {
    vec![1, 2, 3]  // 返回所有权
}

// ❌ 陷阱 2：忘记 CString 的生命周期
fn bad_example_2() {
    unsafe {
        let ptr = std::ffi::CString::new("hello").unwrap().as_ptr();
        // ❌ CString 已经被 drop 了，ptr 是悬垂指针！
        some_c_function(ptr);
    }
}

// ✅ 正确做法
fn good_example_2() {
    let c_str = std::ffi::CString::new("hello").unwrap();
    unsafe {
        // c_str 在这个作用域内一直存活
        some_c_function(c_str.as_ptr());
    }
}

// ❌ 陷阱 3：错误的 slice 长度
fn bad_example_3(ptr: *const u8) {
    unsafe {
        // 如果实际数据不够 1000 字节，这是 UB！
        let slice = std::slice::from_raw_parts(ptr, 1000);
    }
}

// ✅ 正确做法
fn good_example_3(ptr: *const u8, len: usize) {
    if ptr.is_null() {
        return;
    }
    unsafe {
        // 信任调用者提供的长度，但至少检查 null
        let slice = std::slice::from_raw_parts(ptr, len);
    }
}

// ❌ 陷阱 4：双重释放
fn bad_example_4() {
    unsafe {
        let ptr = libc::malloc(100);
        libc::free(ptr);
        libc::free(ptr);  // ❌ 双重释放！未定义行为！
    }
}

// ✅ 正确做法：使用 RAII 模式（Drop trait）
struct ManagedPtr {
    ptr: *mut std::os::raw::c_void,
}

impl Drop for ManagedPtr {
    fn drop(&mut self) {
        if !self.ptr.is_null() {
            unsafe { libc::free(self.ptr); }
            self.ptr = std::ptr::null_mut();  // 防止双重释放
        }
    }
}

extern "C" {
    fn some_c_function(s: *const std::os::raw::c_char);
}
```

---

## 21.6 实战：写一个 Node.js Native Addon

### 21.6.1 项目：高性能 JSON 处理器

我们来写一个真实有用的 Node.js addon：一个高性能的 JSON 处理工具。

```bash
# 创建项目
napi new json-turbo
cd json-turbo
```

```rust
// src/lib.rs

#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::*;
use serde_json::Value;
use std::collections::HashMap;

// ========== JSON 路径查询 ==========

/// 使用类似 JSONPath 的语法查询 JSON
/// 支持 "a.b.c" 和 "a.b[0].c" 格式
#[napi]
pub fn json_get(json_str: String, path: String) -> Result<String> {
    let value: Value = serde_json::from_str(&json_str)
        .map_err(|e| Error::new(Status::InvalidArg, format!("JSON 解析失败: {}", e)))?;

    let result = get_by_path(&value, &path)
        .ok_or_else(|| Error::new(Status::GenericFailure, format!("路径 '{}' 不存在", path)))?;

    serde_json::to_string(result)
        .map_err(|e| Error::new(Status::GenericFailure, format!("序列化失败: {}", e)))
}

fn get_by_path<'a>(value: &'a Value, path: &str) -> Option<&'a Value> {
    let mut current = value;

    for segment in path.split('.') {
        // 检查是否有数组索引，如 "items[0]"
        if let Some(bracket_pos) = segment.find('[') {
            let key = &segment[..bracket_pos];
            let index_str = &segment[bracket_pos + 1..segment.len() - 1];

            if !key.is_empty() {
                current = current.get(key)?;
            }

            let index: usize = index_str.parse().ok()?;
            current = current.get(index)?;
        } else {
            current = current.get(segment)?;
        }
    }

    Some(current)
}

// ========== JSON 差异对比 ==========

#[napi(object)]
pub struct JsonDiff {
    pub path: String,
    pub diff_type: String,  // "added" | "removed" | "changed"
    pub old_value: Option<String>,
    pub new_value: Option<String>,
}

#[napi]
pub fn json_diff(json1: String, json2: String) -> Result<Vec<JsonDiff>> {
    let v1: Value = serde_json::from_str(&json1)
        .map_err(|e| Error::new(Status::InvalidArg, format!("JSON1 解析失败: {}", e)))?;
    let v2: Value = serde_json::from_str(&json2)
        .map_err(|e| Error::new(Status::InvalidArg, format!("JSON2 解析失败: {}", e)))?;

    let mut diffs = Vec::new();
    compare_values(&v1, &v2, String::new(), &mut diffs);
    Ok(diffs)
}

fn compare_values(v1: &Value, v2: &Value, path: String, diffs: &mut Vec<JsonDiff>) {
    match (v1, v2) {
        (Value::Object(o1), Value::Object(o2)) => {
            // 检查 o1 中有但 o2 中没有的键
            for (key, val1) in o1 {
                let new_path = if path.is_empty() {
                    key.clone()
                } else {
                    format!("{}.{}", path, key)
                };

                match o2.get(key) {
                    Some(val2) => compare_values(val1, val2, new_path, diffs),
                    None => diffs.push(JsonDiff {
                        path: new_path,
                        diff_type: "removed".to_string(),
                        old_value: Some(val1.to_string()),
                        new_value: None,
                    }),
                }
            }

            // 检查 o2 中有但 o1 中没有的键
            for (key, val2) in o2 {
                if !o1.contains_key(key) {
                    let new_path = if path.is_empty() {
                        key.clone()
                    } else {
                        format!("{}.{}", path, key)
                    };
                    diffs.push(JsonDiff {
                        path: new_path,
                        diff_type: "added".to_string(),
                        old_value: None,
                        new_value: Some(val2.to_string()),
                    });
                }
            }
        }
        (Value::Array(a1), Value::Array(a2)) => {
            let max_len = a1.len().max(a2.len());
            for i in 0..max_len {
                let new_path = format!("{}[{}]", path, i);
                match (a1.get(i), a2.get(i)) {
                    (Some(v1), Some(v2)) => compare_values(v1, v2, new_path, diffs),
                    (Some(v1), None) => diffs.push(JsonDiff {
                        path: new_path,
                        diff_type: "removed".to_string(),
                        old_value: Some(v1.to_string()),
                        new_value: None,
                    }),
                    (None, Some(v2)) => diffs.push(JsonDiff {
                        path: new_path,
                        diff_type: "added".to_string(),
                        old_value: None,
                        new_value: Some(v2.to_string()),
                    }),
                    (None, None) => unreachable!(),
                }
            }
        }
        _ => {
            if v1 != v2 {
                diffs.push(JsonDiff {
                    path: if path.is_empty() { "$".to_string() } else { path },
                    diff_type: "changed".to_string(),
                    old_value: Some(v1.to_string()),
                    new_value: Some(v2.to_string()),
                });
            }
        }
    }
}

// ========== JSON 扁平化 ==========

#[napi]
pub fn json_flatten(json_str: String) -> Result<HashMap<String, String>> {
    let value: Value = serde_json::from_str(&json_str)
        .map_err(|e| Error::new(Status::InvalidArg, format!("JSON 解析失败: {}", e)))?;

    let mut result = HashMap::new();
    flatten_value(&value, String::new(), &mut result);
    Ok(result)
}

fn flatten_value(value: &Value, prefix: String, result: &mut HashMap<String, String>) {
    match value {
        Value::Object(map) => {
            for (key, val) in map {
                let new_key = if prefix.is_empty() {
                    key.clone()
                } else {
                    format!("{}.{}", prefix, key)
                };
                flatten_value(val, new_key, result);
            }
        }
        Value::Array(arr) => {
            for (i, val) in arr.iter().enumerate() {
                let new_key = format!("{}[{}]", prefix, i);
                flatten_value(val, new_key, result);
            }
        }
        _ => {
            result.insert(prefix, value.to_string());
        }
    }
}

// ========== 批量 JSON 验证 ==========

#[napi(object)]
pub struct ValidationResult {
    pub valid: bool,
    pub error_message: Option<String>,
    pub error_line: Option<u32>,
    pub error_column: Option<u32>,
}

#[napi]
pub fn json_validate(json_str: String) -> ValidationResult {
    match serde_json::from_str::<Value>(&json_str) {
        Ok(_) => ValidationResult {
            valid: true,
            error_message: None,
            error_line: None,
            error_column: None,
        },
        Err(e) => ValidationResult {
            valid: false,
            error_message: Some(e.to_string()),
            error_line: Some(e.line() as u32),
            error_column: Some(e.column() as u32),
        },
    }
}

#[napi]
pub fn json_validate_batch(json_strings: Vec<String>) -> Vec<ValidationResult> {
    json_strings.into_iter().map(json_validate).collect()
}

// ========== JSON 合并 ==========

#[napi]
pub fn json_merge(base: String, patch: String) -> Result<String> {
    let mut base_val: Value = serde_json::from_str(&base)
        .map_err(|e| Error::new(Status::InvalidArg, format!("base JSON 解析失败: {}", e)))?;
    let patch_val: Value = serde_json::from_str(&patch)
        .map_err(|e| Error::new(Status::InvalidArg, format!("patch JSON 解析失败: {}", e)))?;

    merge_json(&mut base_val, &patch_val);

    serde_json::to_string_pretty(&base_val)
        .map_err(|e| Error::new(Status::GenericFailure, format!("序列化失败: {}", e)))
}

fn merge_json(base: &mut Value, patch: &Value) {
    match (base, patch) {
        (Value::Object(base_map), Value::Object(patch_map)) => {
            for (key, patch_val) in patch_map {
                let entry = base_map.entry(key.clone()).or_insert(Value::Null);
                merge_json(entry, patch_val);
            }
        }
        (base, patch) => {
            *base = patch.clone();
        }
    }
}

// ========== 性能：大 JSON 文件搜索 ==========

#[napi]
pub fn json_search(json_str: String, query: String) -> Vec<String> {
    let value: Value = match serde_json::from_str(&json_str) {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    let query_lower = query.to_lowercase();
    let mut paths = Vec::new();
    search_value(&value, &query_lower, String::new(), &mut paths);
    paths
}

fn search_value(value: &Value, query: &str, path: String, paths: &mut Vec<String>) {
    match value {
        Value::String(s) => {
            if s.to_lowercase().contains(query) {
                paths.push(path);
            }
        }
        Value::Object(map) => {
            for (key, val) in map {
                // 搜索键名
                if key.to_lowercase().contains(query) {
                    let p = if path.is_empty() { key.clone() } else { format!("{}.{}", path, key) };
                    paths.push(p.clone());
                }
                // 递归搜索值
                let new_path = if path.is_empty() { key.clone() } else { format!("{}.{}", path, key) };
                search_value(val, query, new_path, paths);
            }
        }
        Value::Array(arr) => {
            for (i, val) in arr.iter().enumerate() {
                search_value(val, query, format!("{}[{}]", path, i), paths);
            }
        }
        Value::Number(n) => {
            if n.to_string().contains(query) {
                paths.push(path);
            }
        }
        _ => {}
    }
}
```

### 21.6.2 使用示例

```typescript
// example.ts

import {
    jsonGet,
    jsonDiff,
    jsonFlatten,
    jsonValidate,
    jsonValidateBatch,
    jsonMerge,
    jsonSearch,
} from './index';

// 1. 路径查询
const data = JSON.stringify({
    user: {
        name: "动动",
        address: {
            city: "深圳",
            district: "南山"
        },
        hobbies: ["编程", "Rust", "旅行"]
    }
});

console.log(jsonGet(data, "user.name"));           // "\"动动\""
console.log(jsonGet(data, "user.address.city"));   // "\"深圳\""
console.log(jsonGet(data, "user.hobbies[1]"));     // "\"Rust\""

// 2. JSON 差异
const v1 = JSON.stringify({ name: "动动", age: 28, city: "深圳" });
const v2 = JSON.stringify({ name: "动动", age: 29, country: "中国" });

const diffs = jsonDiff(v1, v2);
for (const d of diffs) {
    console.log(`${d.path}: ${d.diffType} (${d.oldValue} → ${d.newValue})`);
}
// age: changed ("28" → "29")
// city: removed ("\"深圳\"" → undefined)
// country: added (undefined → "\"中国\"")

// 3. 扁平化
const flat = jsonFlatten(data);
console.log(flat);
// {
//   "user.name": "\"动动\"",
//   "user.address.city": "\"深圳\"",
//   "user.address.district": "\"南山\"",
//   "user.hobbies[0]": "\"编程\"",
//   "user.hobbies[1]": "\"Rust\"",
//   "user.hobbies[2]": "\"旅行\""
// }

// 4. 验证
const result = jsonValidate('{ "name": "test" }');
console.log(result);  // { valid: true, ... }

const invalid = jsonValidate('{ name: "test" }');
console.log(invalid);
// { valid: false, errorMessage: "key must be a string at line 1 column 3", ... }

// 5. 合并
const base = JSON.stringify({ a: 1, b: { c: 2, d: 3 } });
const patch = JSON.stringify({ b: { c: 99, e: 4 }, f: 5 });
console.log(jsonMerge(base, patch));
// { "a": 1, "b": { "c": 99, "d": 3, "e": 4 }, "f": 5 }

// 6. 搜索
const paths = jsonSearch(data, "深圳");
console.log(paths);  // ["user.address.city"]

// 7. 性能对比
const bigJson = JSON.stringify(
    Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `用户${i}`,
        email: `user${i}@example.com`,
        data: { score: Math.random() * 100 }
    }))
);

console.time("Rust jsonSearch");
jsonSearch(bigJson, "用户999");
console.timeEnd("Rust jsonSearch");

console.time("JS JSON.parse + filter");
const parsed = JSON.parse(bigJson);
// ... 手动实现搜索
console.timeEnd("JS JSON.parse + filter");
```

---

## 21.7 练习题

### 练习 1：封装 C 数学库 ⭐

使用 FFI 调用 C 标准库的数学函数（`sin`, `cos`, `sqrt`, `pow`），并创建一个安全的 Rust 封装。

```rust
// 提示：
extern "C" {
    fn sin(x: f64) -> f64;
    fn cos(x: f64) -> f64;
    // ...
}

// 创建一个 safe 的 Math 模块
pub mod math {
    pub fn sin(x: f64) -> f64 {
        // 你的实现...
        todo!()
    }
}
```

### 练习 2：Node.js 密码哈希 addon ⭐⭐

使用 napi-rs 和 `argon2` crate，创建一个 Node.js addon，提供高性能的密码哈希功能。

```rust
// 提示：
// Cargo.toml: argon2 = "0.5"

#[napi]
pub async fn hash_password(password: String) -> Result<String> {
    // 使用 argon2 哈希密码
    todo!()
}

#[napi]
pub fn verify_password(password: String, hash: String) -> Result<bool> {
    // 验证密码
    todo!()
}
```

对应的 TypeScript 使用：

```typescript
const hash = await hashPassword("my-secret-password");
console.log(hash);  // "$argon2id$v=19$m=65536,t=3,p=4$..."

const valid = verifyPassword("my-secret-password", hash);
console.log(valid);  // true
```

### 练习 3：嵌入 SQLite ⭐⭐⭐

使用 FFI 封装 SQLite C 库，创建一个简单但安全的数据库操作接口。

```rust
// 提示：使用 bindgen 生成 SQLite 的 Rust 绑定

pub struct Database {
    db: *mut sqlite3,
}

impl Database {
    pub fn open(path: &str) -> Result<Self, String> {
        todo!()
    }

    pub fn execute(&self, sql: &str) -> Result<(), String> {
        todo!()
    }

    pub fn query(&self, sql: &str) -> Result<Vec<HashMap<String, String>>, String> {
        todo!()
    }
}

impl Drop for Database {
    fn drop(&mut self) {
        // 自动关闭数据库连接
        todo!()
    }
}
```

### 练习 4：为 Lighthouse 项目添加 Native 模块 ⭐⭐⭐

为 Lighthouse 项目设计一个 napi-rs 模块，用于性能敏感的操作：

1. 选择一个适合用 Rust 加速的功能（如：日志解析、数据聚合、文本搜索）
2. 设计 TypeScript 接口
3. 实现 Rust 代码
4. 编写性能对比测试

---

## 21.8 本章小结

```
┌─────────────────────────────────────────────────────────────┐
│                     本章知识图谱                              │
│                                                              │
│   FFI 基础                                                   │
│   ├── C ABI 是跨语言通信的"世界语"                            │
│   ├── extern "C" 声明外部函数                                │
│   ├── unsafe 是 FFI 的必要成本                               │
│   └── #[repr(C)] 保证内存布局兼容                             │
│                                                              │
│   Rust → C                                                   │
│   ├── extern "C" { } 声明 C 函数                             │
│   ├── CString / CStr 字符串转换                               │
│   ├── libc crate 提供系统调用                                 │
│   ├── bindgen 自动生成绑定                                    │
│   └── pkg-config / cc 构建系统集成                            │
│                                                              │
│   C → Rust                                                   │
│   ├── #[no_mangle] + extern "C" 导出函数                      │
│   ├── cbindgen 自动生成 C 头文件                              │
│   ├── cdylib / staticlib 库类型                               │
│   └── Drop trait 实现 RAII 资源管理                           │
│                                                              │
│   Rust ↔ Node.js (napi-rs)                                   │
│   ├── #[napi] 宏自动生成绑定                                  │
│   ├── 自动 TypeScript 类型生成                                │
│   ├── 结构体 → JS 对象，枚举 → TS 枚举                       │
│   ├── async → Promise，Task → 线程池                          │
│   ├── Buffer / TypedArray 零拷贝                              │
│   └── 一键跨平台发布到 NPM                                    │
│                                                              │
│   安全封装                                                    │
│   ├── 最小化 unsafe 范围                                      │
│   ├── safe API 包裹 unsafe 实现                               │
│   ├── Drop trait 防止资源泄漏                                 │
│   ├── null 检查和边界检查                                     │
│   └── 避免悬垂指针和双重释放                                  │
│                                                              │
│   实战                                                        │
│   ├── 封装 zlib（C 库调用）                                   │
│   ├── json-turbo（napi-rs native addon）                      │
│   └── 性能对比（Rust addon vs 纯 JS）                         │
└─────────────────────────────────────────────────────────────┘
```

> **恭喜！** 你已经掌握了 Rust 与外部世界交互的两大通道：WASM（浏览器）和 FFI（系统/Node.js）。结合前面学到的所有 Rust 知识，你现在可以在几乎任何场景下使用 Rust 来提升性能了！
