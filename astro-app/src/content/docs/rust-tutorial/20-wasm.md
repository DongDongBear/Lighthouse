# 第二十章：实战 —— Rust + WebAssembly

> **本章目标**
>
> - 理解 WebAssembly 是什么，以及它为什么对前端开发者如此重要
> - 掌握 wasm-pack 和 wasm-bindgen 工具链
> - 学会将 Rust 代码编译为 WASM 并在浏览器中运行
> - 掌握 Rust 与 JavaScript 的互操作方式
> - 在 WASM 中操作 DOM
> - 理解 JS vs WASM 的性能差异及适用场景
> - 实战：用 Rust+WASM 构建图片处理工具，并与纯 JS 实现对比
> - 学会在 React/Vue 项目中集成 WASM 模块
> - 为 Lighthouse 项目中的性能敏感模块做好 WASM 准备

> **预计学习时间：180 - 240 分钟**（前端开发者最爱的章节，值得每个例子都动手跑一遍！）

---

## 20.1 什么是 WebAssembly？—— 从前端开发者的视角出发

### 20.1.1 一句话理解 WebAssembly

如果你是 TypeScript/JavaScript 开发者，可以这样理解：

> **WebAssembly（简称 WASM）是一种可以在浏览器中运行的低级字节码格式，它让你用 Rust、C、C++ 等语言编写的代码能以接近原生的速度在浏览器中执行。**

用 JS 开发者熟悉的类比：

```
┌──────────────────────────────────────────────────────────────┐
│                        浏览器引擎                             │
│                                                              │
│   ┌─────────────────┐        ┌─────────────────┐            │
│   │   JavaScript     │        │   WebAssembly    │            │
│   │                  │        │                  │            │
│   │  - 动态类型      │        │  - 静态类型       │            │
│   │  - JIT 编译      │        │  - AOT 编译       │            │
│   │  - GC 管理内存   │        │  - 手动/线性内存   │            │
│   │  - 灵活但慢      │        │  - 严格但快       │            │
│   │                  │        │                  │            │
│   └────────┬─────────┘        └────────┬─────────┘            │
│            │                           │                      │
│            └───────────┬───────────────┘                      │
│                        ▼                                      │
│              ┌─────────────────┐                              │
│              │   Web APIs       │                              │
│              │  (DOM, fetch,    │                              │
│              │   Canvas, etc.)  │                              │
│              └─────────────────┘                              │
└──────────────────────────────────────────────────────────────┘
```

### 20.1.2 为什么前端开发者应该关心 WASM？

作为一个写了多年 JavaScript 的开发者，你可能会问："JS 不够用吗？"

答案是：**大部分情况下够用，但有些场景 JS 真的力不从心。**

| 场景 | JavaScript | WebAssembly |
|---|---|---|
| **图片/视频处理** | 慢，可能卡住 UI | 快 10-100 倍 |
| **加密/哈希计算** | 可用但慢 | 接近原生速度 |
| **游戏引擎** | 勉强能跑 | 流畅运行 |
| **音频处理** | 延迟明显 | 低延迟 |
| **科学计算** | 精度和速度都有问题 | 完美 |
| **PDF 生成/解析** | 需要大量 JS 库 | 可复用 C/Rust 库 |
| **3D 渲染** | Three.js 有瓶颈 | 直接对接 WebGL |

真实世界的例子：

- **Figma**：核心渲染引擎用 C++ 编译为 WASM
- **Google Earth**：3D 地球渲染用 WASM
- **Photoshop Web**：Adobe 把桌面版 Photoshop 移植到 WASM
- **1Password**：加密引擎用 Rust 编译为 WASM
- **Cloudflare Workers**：边缘计算支持 WASM

### 20.1.3 WASM 不是什么

在开始之前，先消除一些误解：

```
❌ WASM 不是要取代 JavaScript
   → JS 仍然是 Web 的"胶水语言"，WASM 负责计算密集型任务

❌ WASM 不能直接操作 DOM
   → 需要通过 JS 桥接（wasm-bindgen 帮你自动生成）

❌ WASM 不一定更快
   → 对于简单的 UI 逻辑、字符串处理，JS 可能更快（因为 V8 优化得很好）

❌ WASM 不是汇编语言
   → 它是字节码，比汇编高级得多，更像是一种虚拟机指令集

✅ WASM 是 JS 的"协处理器"
   → 把计算密集型任务交给 WASM，UI 和胶水逻辑留给 JS
```

### 20.1.4 WASM 的技术本质

WebAssembly 有两种格式：

```
┌─────────────────────┐          ┌─────────────────────┐
│  .wat (文本格式)     │  ←───→  │  .wasm (二进制格式)   │
│  人类可读            │          │  机器高效             │
│  用于调试            │          │  用于生产             │
└─────────────────────┘          └─────────────────────┘
```

一个简单的 WAT 例子（你不需要手写，了解即可）：

```wat
;; 一个简单的加法函数
(module
  (func $add (param $a i32) (param $b i32) (result i32)
    local.get $a    ;; 把参数 a 压入栈
    local.get $b    ;; 把参数 b 压入栈
    i32.add         ;; 弹出两个值，相加，结果压入栈
  )
  (export "add" (func $add))  ;; 导出给 JS 调用
)
```

对应的 JavaScript 调用：

```javascript
// 加载并实例化 WASM 模块
const response = await fetch('add.wasm');
const bytes = await response.arrayBuffer();
const { instance } = await WebAssembly.instantiate(bytes);

// 调用 WASM 导出的函数，就像调用普通 JS 函数一样！
console.log(instance.exports.add(1, 2)); // 3
```

**但我们不需要手写 WAT！** Rust 的工具链会帮我们把 Rust 代码编译成 `.wasm`，而且还会自动生成 JS 胶水代码。

---

## 20.2 工具链：wasm-pack 与 wasm-bindgen

### 20.2.1 Rust WASM 生态全景

```
┌─────────────────────────────────────────────────────────────┐
│                    Rust WASM 工具链                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  wasm-pack   │  │ wasm-bindgen │  │  web-sys     │       │
│  │              │  │              │  │              │       │
│  │  构建工具     │  │  JS 绑定生成  │  │  Web API     │       │
│  │  打包发布     │  │  类型转换     │  │  绑定        │       │
│  │  npm 集成     │  │  胶水代码     │  │  DOM/fetch   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  js-sys      │  │  gloo        │  │  wasm-pack   │       │
│  │              │  │              │  │  template     │       │
│  │  JS 内置对象  │  │  高级封装     │  │              │       │
│  │  Array/Date  │  │  事件/定时器  │  │  项目模板     │       │
│  │  Promise     │  │  网络请求     │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

各工具的职责：

| 工具 | 作用 | 类比 (JS 世界) |
|---|---|---|
| **wasm-pack** | 编译 + 打包 + 发布 | 类似 `tsc` + `webpack` + `npm publish` |
| **wasm-bindgen** | 生成 JS ↔ Rust 的胶水代码 | 类似 TypeScript 的类型声明文件 `.d.ts` |
| **web-sys** | Web API 的 Rust 绑定 | 类似 `@types/web` |
| **js-sys** | JS 内置对象的 Rust 绑定 | 类似 `@types/node` 中的 JS 全局类型 |
| **gloo** | 高级封装，更符合 Rust 风格 | 类似 `axios` 之于 `fetch` |

### 20.2.2 安装工具链

```bash
# 1. 安装 wasm-pack（核心构建工具）
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# 或者用 cargo 安装
cargo install wasm-pack

# 2. 添加 WASM 编译目标
rustup target add wasm32-unknown-unknown

# 3. 验证安装
wasm-pack --version
# 输出类似: wasm-pack 0.13.0
```

### 20.2.3 创建第一个 WASM 项目

```bash
# 方法一：使用 wasm-pack 模板
wasm-pack new hello-wasm
cd hello-wasm

# 方法二：手动创建
cargo new --lib hello-wasm
cd hello-wasm
```

如果手动创建，需要配置 `Cargo.toml`：

```toml
[package]
name = "hello-wasm"
version = "0.1.0"
edition = "2021"

# 重要！必须声明为 cdylib，才能编译为 WASM
[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
# wasm-bindgen 是核心依赖，负责 Rust ↔ JS 交互
wasm-bindgen = "0.2"

# web-sys 提供 Web API 绑定
[dependencies.web-sys]
version = "0.3"
features = [
    "console",          # console.log
    "Document",         # document 对象
    "Element",          # DOM 元素
    "HtmlElement",      # HTML 元素
    "Window",           # window 对象
    "Node",             # DOM 节点
]

# js-sys 提供 JS 内置对象绑定
[dependencies.js-sys]
version = "0.3"

[dev-dependencies]
wasm-bindgen-test = "0.3"

# 优化 WASM 体积
[profile.release]
opt-level = "s"        # 优化体积而不是速度
lto = true             # 链接时优化
```

**`crate-type` 解释（对比 JS）：**

```
cdylib  → 编译为动态库（.wasm 文件）
           类比：webpack 输出的 bundle.js

rlib    → 编译为 Rust 库（供其他 Rust 代码使用）
           类比：npm 包的源码
```

---

## 20.3 Rust → WASM 编译流程

### 20.3.1 Hello WASM：第一个可运行的例子

编写 `src/lib.rs`：

```rust
// src/lib.rs

// 引入 wasm_bindgen 宏
use wasm_bindgen::prelude::*;

// #[wasm_bindgen] 宏标记的函数会被导出给 JavaScript 调用
// 相当于 JS 中的 export function
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("你好，{}！欢迎来到 Rust + WASM 的世界！", name)
}

// 可以导出多个函数
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// 调用 JavaScript 的 alert 函数
// extern 块声明外部（JS 端）的函数
#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

// 从 Rust 调用 JS 的 alert
#[wasm_bindgen]
pub fn greet_with_alert(name: &str) {
    alert(&format!("来自 Rust 的问候：你好，{}！", name));
}

// 使用 web-sys 调用 console.log
#[wasm_bindgen]
pub fn log_to_console(message: &str) {
    web_sys::console::log_1(&message.into());
}
```

### 20.3.2 编译

```bash
# 编译为面向 web 的 WASM 包
wasm-pack build --target web

# 其他目标选项：
# --target bundler   → 用于 webpack/vite 等打包工具（默认）
# --target web       → 直接在浏览器中用 <script type="module">
# --target nodejs    → 用于 Node.js
# --target no-modules → 不使用 ES modules
```

编译后的目录结构：

```
hello-wasm/
├── Cargo.toml
├── src/
│   └── lib.rs
├── pkg/                          ← wasm-pack 生成的输出
│   ├── hello_wasm_bg.wasm        ← 编译后的 WASM 二进制
│   ├── hello_wasm_bg.wasm.d.ts   ← WASM 的 TypeScript 类型声明
│   ├── hello_wasm.js             ← JS 胶水代码（自动生成）
│   ├── hello_wasm.d.ts           ← TypeScript 类型声明
│   ├── package.json              ← npm 包配置
│   └── README.md
└── target/                       ← Rust 编译中间产物
```

**来看看自动生成的 JS 胶水代码（简化版）：**

```javascript
// pkg/hello_wasm.js（wasm-bindgen 自动生成）

// 初始化 WASM 模块
import * as wasm from './hello_wasm_bg.wasm';

// 字符串传递需要在 JS 和 WASM 之间转换
// WASM 只懂数字，不懂字符串，所以需要胶水代码来做转换
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// 导出的函数 —— 你在 JS 里直接调用这些
export function greet(name) {
    // 1. 把 JS 字符串写入 WASM 的线性内存
    // 2. 调用 WASM 的 greet 函数
    // 3. 从 WASM 的线性内存读取返回的字符串
    // 4. 返回 JS 字符串
    // （wasm-bindgen 自动处理这些细节！）
    const ptr = passStringToWasm(name);
    const result = wasm.greet(ptr, name.length);
    return getStringFromWasm(result);
}

export function add(a, b) {
    return wasm.add(a, b);  // 数字类型直接传递，无需转换
}
```

**自动生成的 TypeScript 类型声明：**

```typescript
// pkg/hello_wasm.d.ts
export function greet(name: string): string;
export function add(a: number, b: number): number;
export function greet_with_alert(name: string): void;
export function log_to_console(message: string): void;
```

看到了吗？**完美的 TypeScript 支持，开箱即用！** 这对 TS 开发者来说简直是天堂。

### 20.3.3 在浏览器中运行

创建 `index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Hello WASM</title>
</head>
<body>
    <h1>Rust + WebAssembly Demo</h1>
    <div id="output"></div>

    <script type="module">
        // 导入 WASM 模块（--target web 模式）
        import init, { greet, add, log_to_console } from './pkg/hello_wasm.js';

        async function main() {
            // 必须先初始化 WASM 模块
            await init();

            // 现在可以像调用普通 JS 函数一样调用 Rust 函数了！
            const message = greet("动动");
            document.getElementById("output").textContent = message;

            console.log(`1 + 2 = ${add(1, 2)}`);  // 3

            log_to_console("这条日志来自 Rust！");
        }

        main();
    </script>
</body>
</html>
```

启动本地服务器（WASM 文件需要正确的 MIME type）：

```bash
# 方法一：Python
python3 -m http.server 8080

# 方法二：Node.js
npx serve .

# 方法三：使用 miniserve（Rust 写的！）
cargo install miniserve
miniserve . --port 8080
```

打开 `http://localhost:8080`，你应该能看到 "你好，动动！欢迎来到 Rust + WASM 的世界！"

---

## 20.4 在浏览器中调用 Rust 代码 —— 深入类型映射

### 20.4.1 基本类型映射

Rust 和 JavaScript 之间的类型并不完全对应。wasm-bindgen 帮你处理了大部分转换：

```
┌──────────────────┬──────────────────┬───────────────────────┐
│   Rust 类型       │   JavaScript 类型 │   说明                │
├──────────────────┼──────────────────┼───────────────────────┤
│   i32, u32       │   number         │   直接传递，零开销      │
│   i64, u64       │   BigInt         │   JS 的 BigInt 类型    │
│   f32, f64       │   number         │   直接传递，零开销      │
│   bool           │   boolean        │   直接传递             │
│   char           │   string         │   单个字符             │
│   String         │   string         │   需要拷贝（有开销）    │
│   &str           │   string         │   需要拷贝（有开销）    │
│   Vec<u8>        │   Uint8Array     │   需要拷贝             │
│   Option<T>      │   T | undefined  │   完美对应！           │
│   Result<T, E>   │   T (或抛出异常)  │   Err 变成 JS Error   │
│   JsValue        │   any            │   任意 JS 值           │
└──────────────────┴──────────────────┴───────────────────────┘
```

### 20.4.2 传递复杂类型

```rust
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// ========== 方式一：使用 #[wasm_bindgen] 直接导出结构体 ==========

#[wasm_bindgen]
pub struct Point {
    x: f64,
    y: f64,
}

#[wasm_bindgen]
impl Point {
    // 构造函数 - 在 JS 中用 new Point(1.0, 2.0) 调用
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> Point {
        Point { x, y }
    }

    // getter - 在 JS 中用 point.x 访问
    #[wasm_bindgen(getter)]
    pub fn x(&self) -> f64 {
        self.x
    }

    // setter - 在 JS 中用 point.x = 3.0 赋值
    #[wasm_bindgen(setter)]
    pub fn set_x(&mut self, x: f64) {
        self.x = x;
    }

    #[wasm_bindgen(getter)]
    pub fn y(&self) -> f64 {
        self.y
    }

    #[wasm_bindgen(setter)]
    pub fn set_y(&mut self, y: f64) {
        self.y = y;
    }

    // 方法
    pub fn distance_to(&self, other: &Point) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }

    // 返回字符串
    pub fn to_string(&self) -> String {
        format!("Point({}, {})", self.x, self.y)
    }
}

// ========== 方式二：使用 serde 传递 JSON（更灵活） ==========

// 需要在 Cargo.toml 中添加：
// serde = { version = "1", features = ["derive"] }
// serde-wasm-bindgen = "0.6"

#[derive(Serialize, Deserialize)]
pub struct User {
    name: String,
    age: u32,
    hobbies: Vec<String>,
}

#[wasm_bindgen]
pub fn create_user(name: &str, age: u32) -> JsValue {
    let user = User {
        name: name.to_string(),
        age,
        hobbies: vec!["编程".to_string(), "Rust".to_string()],
    };
    // 序列化为 JsValue（在 JS 端变成普通对象）
    serde_wasm_bindgen::to_value(&user).unwrap()
}

#[wasm_bindgen]
pub fn process_user(val: JsValue) -> String {
    // 从 JS 对象反序列化为 Rust 结构体
    let user: User = serde_wasm_bindgen::from_value(val).unwrap();
    format!("{}今年{}岁，爱好是{}", user.name, user.age, user.hobbies.join("、"))
}
```

在 JavaScript 中使用：

```javascript
import init, { Point, create_user, process_user } from './pkg/hello_wasm.js';

await init();

// 方式一：直接使用导出的类
const p1 = new Point(0, 0);
const p2 = new Point(3, 4);
console.log(p1.distance_to(p2));  // 5.0
console.log(p1.to_string());      // "Point(0, 0)"

// 注意：WASM 对象不会被 JS 的 GC 自动清理！
// 需要手动释放（或者用 FinalizationRegistry）
p1.free();
p2.free();

// 方式二：使用 serde 传递普通对象
const user = create_user("动动", 28);
console.log(user);  // { name: "动动", age: 28, hobbies: ["编程", "Rust"] }
// 普通 JS 对象，不需要手动 free

const info = process_user({ name: "小羊", age: 26, hobbies: ["教英语", "旅行"] });
console.log(info);  // "小羊今年26岁，爱好是教英语、旅行"
```

### 20.4.3 内存管理的重要提醒

```
⚠️  WASM 对象的内存管理 —— 前端开发者容易忽略的坑！

┌────────────────────────────────────────────────────────────┐
│                                                            │
│  JS 对象（通过 serde 传递）：                                │
│  → 数据被拷贝到 JS 堆上                                     │
│  → JS 的 GC 正常管理，不用担心                                │
│  → 适合小数据、简单结构                                      │
│                                                            │
│  WASM 对象（通过 #[wasm_bindgen] 导出）：                    │
│  → 数据存储在 WASM 的线性内存中                               │
│  → JS 只持有一个"句柄"（指针）                                │
│  → 必须调用 .free() 释放，否则内存泄漏！                      │
│  → 适合大对象、需要就地修改的数据                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

```javascript
// ❌ 错误：忘记释放 WASM 对象
function processPoints() {
    const point = new Point(1, 2);
    return point.x;  // point 永远不会被释放！
}

// ✅ 正确：用完就释放
function processPoints() {
    const point = new Point(1, 2);
    const x = point.x;
    point.free();  // 手动释放
    return x;
}

// ✅ 更好：使用 try-finally 确保释放
function processPoints() {
    const point = new Point(1, 2);
    try {
        return point.x;
    } finally {
        point.free();
    }
}

// ✅ 最佳：使用 FinalizationRegistry（现代浏览器支持）
const registry = new FinalizationRegistry(ref => {
    console.log("WASM 对象被 GC 了，但内存可能已经泄漏！");
    // 注意：FinalizationRegistry 不保证一定触发
});
```

---

## 20.5 DOM 操作 —— 从 Rust 控制网页

### 20.5.1 使用 web-sys 操作 DOM

`web-sys` 提供了几乎所有 Web API 的 Rust 绑定。每个 API 需要在 `Cargo.toml` 的 features 中显式启用：

```toml
[dependencies.web-sys]
version = "0.3"
features = [
    "console",
    "Document",
    "Element",
    "HtmlElement",
    "HtmlInputElement",
    "HtmlCanvasElement",
    "CanvasRenderingContext2d",
    "Window",
    "Node",
    "NodeList",
    "Event",
    "EventTarget",
    "MouseEvent",
    "KeyboardEvent",
    "CssStyleDeclaration",
    "DomTokenList",
    "HtmlCollection",
    "Performance",
]
```

```rust
use wasm_bindgen::prelude::*;
use web_sys::{Document, Element, HtmlElement, Window};

// 获取 window 和 document 的辅助函数
fn window() -> Window {
    web_sys::window().expect("应该有 window 对象")
}

fn document() -> Document {
    window().document().expect("应该有 document 对象")
}

// ========== 基本 DOM 操作 ==========

#[wasm_bindgen]
pub fn create_element_demo() {
    let doc = document();

    // 创建一个 div 元素
    // Rust 版：document.createElement("div")
    let div = doc.create_element("div").unwrap();
    div.set_id("rust-created");
    div.set_inner_html("<h2>这个元素是 Rust 创建的！</h2>");

    // 设置样式
    // 需要转换为 HtmlElement 来访问 style 属性
    let html_div: &HtmlElement = div.dyn_ref::<HtmlElement>().unwrap();
    let style = html_div.style();
    style.set_property("background-color", "#f0f0f0").unwrap();
    style.set_property("padding", "20px").unwrap();
    style.set_property("border-radius", "8px").unwrap();
    style.set_property("margin", "10px").unwrap();

    // 添加到 body
    let body = doc.body().unwrap();
    body.append_child(&div).unwrap();
}

// ========== 查询和修改元素 ==========

#[wasm_bindgen]
pub fn update_element(id: &str, content: &str) {
    let doc = document();

    // document.getElementById(id)
    if let Some(element) = doc.get_element_by_id(id) {
        element.set_inner_html(content);
    } else {
        web_sys::console::warn_1(
            &format!("找不到 id 为 '{}' 的元素", id).into()
        );
    }
}

// ========== 事件监听 ==========

#[wasm_bindgen]
pub fn setup_click_counter() {
    let doc = document();

    // 创建按钮
    let button = doc.create_element("button").unwrap();
    button.set_inner_html("点击我！（来自 Rust）");
    button.set_id("rust-button");

    // 创建计数器显示
    let counter_display = doc.create_element("p").unwrap();
    counter_display.set_id("counter");
    counter_display.set_inner_html("点击次数：0");

    // 使用 Closure 创建事件处理函数
    // 这里用了 Rc<Cell> 来在闭包间共享可变状态
    use std::cell::Cell;
    use std::rc::Rc;

    let count = Rc::new(Cell::new(0u32));
    let count_clone = count.clone();

    let callback = Closure::wrap(Box::new(move || {
        let new_count = count_clone.get() + 1;
        count_clone.set(new_count);

        let doc = document();
        if let Some(display) = doc.get_element_by_id("counter") {
            display.set_inner_html(&format!("点击次数：{}", new_count));
        }
    }) as Box<dyn FnMut()>);

    // 绑定事件
    button
        .add_event_listener_with_callback("click", callback.as_ref().unchecked_ref())
        .unwrap();

    // 重要！必须 forget 这个 Closure，否则它会在函数结束时被 drop
    // drop 后回调就无效了，事件监听就失效了
    callback.forget();
    // ⚠️ forget 意味着这块内存永远不会被释放
    // 对于全局事件监听器，这通常是可以接受的

    // 添加到页面
    let body = doc.body().unwrap();
    body.append_child(&button).unwrap();
    body.append_child(&counter_display).unwrap();
}

// ========== 定时器 ==========

#[wasm_bindgen]
pub fn start_clock() {
    // 使用 setInterval 更新时钟
    let callback = Closure::wrap(Box::new(|| {
        let doc = document();
        if let Some(clock) = doc.get_element_by_id("clock") {
            let now = js_sys::Date::new_0();
            let time_str = format!(
                "{:02}:{:02}:{:02}",
                now.get_hours(),
                now.get_minutes(),
                now.get_seconds()
            );
            clock.set_inner_html(&time_str);
        }
    }) as Box<dyn FnMut()>);

    window()
        .set_interval_with_callback_and_timeout_and_arguments_0(
            callback.as_ref().unchecked_ref(),
            1000, // 每秒更新
        )
        .unwrap();

    callback.forget();
}
```

### 20.5.2 对比：JS vs Rust 的 DOM 操作

```javascript
// JavaScript 版本 - 简洁直观
const div = document.createElement("div");
div.id = "my-div";
div.innerHTML = "<h2>Hello</h2>";
div.style.backgroundColor = "#f0f0f0";
document.body.appendChild(div);
```

```rust
// Rust 版本 - 更繁琐，但类型安全
let doc = document();
let div = doc.create_element("div").unwrap();
div.set_id("my-div");
div.set_inner_html("<h2>Hello</h2>");
let html_div: &HtmlElement = div.dyn_ref::<HtmlElement>().unwrap();
html_div.style().set_property("background-color", "#f0f0f0").unwrap();
doc.body().unwrap().append_child(&div).unwrap();
```

**结论：DOM 操作不是 WASM 的强项！** 每次 DOM 操作都需要跨越 JS ↔ WASM 的边界，有额外的开销。应该把 DOM 操作留给 JS/框架（React/Vue），WASM 负责计算密集型的数据处理。

```
✅ WASM 适合做的事：
   - 图片像素处理
   - 数据加密/解密
   - 物理模拟计算
   - 音频波形处理
   - 大数据集排序/过滤

❌ WASM 不太适合做的事：
   - 普通 DOM 操作
   - 简单的表单验证
   - UI 事件处理
   - 字符串拼接
```

---

## 20.6 与 JS 互操作 —— 深入 wasm-bindgen

### 20.6.1 从 Rust 调用 JS 函数

```rust
use wasm_bindgen::prelude::*;

// ========== 调用全局 JS 函数 ==========

#[wasm_bindgen]
extern "C" {
    // 调用 window.alert()
    fn alert(s: &str);

    // 调用 console.log()
    // js_namespace 指定命名空间
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // console.warn 重命名为 warn_log
    #[wasm_bindgen(js_namespace = console, js_name = warn)]
    fn warn_log(s: &str);

    // 调用 JSON.stringify
    #[wasm_bindgen(js_namespace = JSON, js_name = stringify)]
    fn json_stringify(val: &JsValue) -> String;

    // 访问 window.location.href
    #[wasm_bindgen(js_namespace = ["window", "location"], js_name = href)]
    static LOCATION_HREF: String;
}

// ========== 调用自定义 JS 函数 ==========

// 方法一：使用 js_namespace
#[wasm_bindgen]
extern "C" {
    // 假设 JS 端定义了 window.myApp.doSomething()
    #[wasm_bindgen(js_namespace = myApp)]
    fn doSomething(x: i32) -> i32;
}

// 方法二：使用 module 导入 JS 模块
#[wasm_bindgen(module = "/src/utils.js")]
extern "C" {
    fn formatDate(timestamp: f64) -> String;
    fn sendAnalytics(event: &str, data: &JsValue);
}
```

对应的 JS 端代码（`src/utils.js`）：

```javascript
// src/utils.js —— 会被 wasm-bindgen 自动导入

export function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('zh-CN');
}

export function sendAnalytics(event, data) {
    console.log(`[Analytics] ${event}:`, data);
    // 实际项目中可能发送到 Google Analytics、Mixpanel 等
}
```

### 20.6.2 处理 Promise / async

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};

// 在 Cargo.toml 中添加：
// wasm-bindgen-futures = "0.4"

// Rust 的 async 可以和 JS 的 Promise 完美互操作！
#[wasm_bindgen]
pub async fn fetch_data(url: &str) -> Result<JsValue, JsValue> {
    // 创建请求
    let mut opts = RequestInit::new();
    opts.method("GET");
    opts.mode(RequestMode::Cors);

    let request = Request::new_with_str_and_init(url, &opts)?;

    // 发起 fetch 请求
    let window = web_sys::window().unwrap();
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;

    // 转换为 Response 对象
    let resp: Response = resp_value.dyn_into().unwrap();

    // 读取 JSON 响应体
    let json = JsFuture::from(resp.json()?).await?;

    Ok(json)
}

// 在 JS 中调用（async 函数自动变成返回 Promise 的函数）：
// const data = await fetch_data("https://api.example.com/data");
```

### 20.6.3 传递回调函数

```rust
use wasm_bindgen::prelude::*;

// 接收 JS 的回调函数
#[wasm_bindgen]
pub fn process_with_callback(data: &[u8], callback: &js_sys::Function) {
    // 做一些处理...
    let result = data.len() as u32;

    // 调用 JS 回调
    let this = JsValue::NULL;
    callback
        .call1(&this, &JsValue::from(result))
        .unwrap();
}

// 返回一个 JS 可调用的闭包
#[wasm_bindgen]
pub fn create_multiplier(factor: f64) -> js_sys::Function {
    let closure = Closure::wrap(Box::new(move |x: f64| -> f64 {
        x * factor
    }) as Box<dyn Fn(f64) -> f64>);

    let func = closure.as_ref().unchecked_ref::<js_sys::Function>().clone();
    closure.forget(); // 泄漏内存，但简单场景可以接受
    func
}
```

在 JavaScript 端：

```javascript
// 传递回调给 Rust
process_with_callback(
    new Uint8Array([1, 2, 3, 4, 5]),
    (length) => console.log(`数据长度：${length}`)
);

// 使用 Rust 返回的闭包
const double = create_multiplier(2);
console.log(double(21)); // 42
```

### 20.6.4 错误处理

```rust
use wasm_bindgen::prelude::*;

// Result 类型会自动映射为 JS 的 try-catch
#[wasm_bindgen]
pub fn divide(a: f64, b: f64) -> Result<f64, JsError> {
    if b == 0.0 {
        // JsError 会在 JS 端变成一个真正的 Error 对象
        Err(JsError::new("除数不能为零！"))
    } else {
        Ok(a / b)
    }
}

// 在 JS 端：
// try {
//     const result = divide(10, 0);
// } catch (e) {
//     console.error(e.message);  // "除数不能为零！"
// }

// 自定义错误类型
#[wasm_bindgen]
pub fn parse_config(json_str: &str) -> Result<JsValue, JsError> {
    let config: serde_json::Value = serde_json::from_str(json_str)
        .map_err(|e| JsError::new(&format!("JSON 解析失败: {}", e)))?;

    serde_wasm_bindgen::to_value(&config)
        .map_err(|e| JsError::new(&format!("转换失败: {}", e)))
}
```

---

## 20.7 性能对比：JS vs WASM

### 20.7.1 基准测试框架

让我们写一个真实的性能对比。我们将实现几个计算密集型函数，分别用 JS 和 Rust+WASM：

```rust
// src/lib.rs - 性能测试函数

use wasm_bindgen::prelude::*;

// ========== 1. 斐波那契（递归） ==========
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u64 {
    if n <= 1 {
        return n as u64;
    }
    fibonacci(n - 1) + fibonacci(n - 2)
}

// ========== 2. 矩阵乘法 ==========
#[wasm_bindgen]
pub fn matrix_multiply(size: usize) -> f64 {
    let mut a = vec![0.0f64; size * size];
    let mut b = vec![0.0f64; size * size];
    let mut c = vec![0.0f64; size * size];

    // 初始化矩阵
    for i in 0..size {
        for j in 0..size {
            a[i * size + j] = (i + j) as f64;
            b[i * size + j] = (i * j) as f64;
        }
    }

    // 矩阵乘法
    for i in 0..size {
        for j in 0..size {
            let mut sum = 0.0;
            for k in 0..size {
                sum += a[i * size + k] * b[k * size + j];
            }
            c[i * size + j] = sum;
        }
    }

    // 返回校验和
    c.iter().sum()
}

// ========== 3. 图片灰度化（模拟） ==========
#[wasm_bindgen]
pub fn grayscale(pixels: &mut [u8]) {
    // pixels 是 RGBA 格式，每 4 个字节一个像素
    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0] as f64;
        let g = chunk[1] as f64;
        let b = chunk[2] as f64;
        // 标准灰度转换公式
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        chunk[0] = gray;
        chunk[1] = gray;
        chunk[2] = gray;
        // chunk[3] 是 alpha，保持不变
    }
}

// ========== 4. 排序（大数组） ==========
#[wasm_bindgen]
pub fn sort_array(data: &mut [f64]) {
    // Rust 的排序算法（TimSort 变种）非常高效
    data.sort_by(|a, b| a.partial_cmp(b).unwrap());
}

// ========== 5. SHA-256 哈希（简化版） ==========
#[wasm_bindgen]
pub fn simple_hash(data: &[u8]) -> u64 {
    // 简化的哈希函数用于演示
    let mut hash: u64 = 5381;
    for &byte in data {
        hash = hash.wrapping_mul(33).wrapping_add(byte as u64);
    }
    hash
}
```

对应的 JavaScript 实现：

```javascript
// benchmark.js

// 1. 斐波那契（递归）
function fibonacciJS(n) {
    if (n <= 1) return n;
    return fibonacciJS(n - 1) + fibonacciJS(n - 2);
}

// 2. 矩阵乘法
function matrixMultiplyJS(size) {
    const a = new Float64Array(size * size);
    const b = new Float64Array(size * size);
    const c = new Float64Array(size * size);

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            a[i * size + j] = i + j;
            b[i * size + j] = i * j;
        }
    }

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let sum = 0;
            for (let k = 0; k < size; k++) {
                sum += a[i * size + k] * b[k * size + j];
            }
            c[i * size + j] = sum;
        }
    }

    return c.reduce((a, b) => a + b, 0);
}

// 3. 图片灰度化
function grayscaleJS(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;
    }
}

// 性能测试
async function runBenchmarks() {
    const { fibonacci, matrix_multiply, grayscale } = await import('./pkg/hello_wasm.js');

    console.log("🏁 性能对比测试开始\n");

    // 斐波那契 n=40
    console.time("JS  - fibonacci(40)");
    fibonacciJS(40);
    console.timeEnd("JS  - fibonacci(40)");

    console.time("WASM - fibonacci(40)");
    fibonacci(40);
    console.timeEnd("WASM - fibonacci(40)");

    console.log("---");

    // 矩阵乘法 200x200
    console.time("JS  - matrix 200x200");
    matrixMultiplyJS(200);
    console.timeEnd("JS  - matrix 200x200");

    console.time("WASM - matrix 200x200");
    matrix_multiply(200);
    console.timeEnd("WASM - matrix 200x200");

    console.log("---");

    // 灰度化 4K 图片（3840 x 2160 像素）
    const pixelCount = 3840 * 2160 * 4;
    const pixelsJS = new Uint8Array(pixelCount);
    const pixelsWasm = new Uint8Array(pixelCount);
    // 填充随机数据
    for (let i = 0; i < pixelCount; i++) {
        const val = Math.floor(Math.random() * 256);
        pixelsJS[i] = val;
        pixelsWasm[i] = val;
    }

    console.time("JS  - grayscale 4K");
    grayscaleJS(pixelsJS);
    console.timeEnd("JS  - grayscale 4K");

    console.time("WASM - grayscale 4K");
    grayscale(pixelsWasm);
    console.timeEnd("WASM - grayscale 4K");
}

runBenchmarks();
```

### 20.7.2 典型性能结果

```
🏁 性能对比测试结果（Chrome 120，M1 MacBook Pro）

┌──────────────────────┬────────────┬────────────┬──────────┐
│ 测试项                │ JavaScript │ WASM       │ 加速比    │
├──────────────────────┼────────────┼────────────┼──────────┤
│ fibonacci(40)        │ 1,200ms    │ 680ms      │ 1.8x     │
│ 矩阵乘法 200x200     │ 85ms       │ 12ms       │ 7x       │
│ 灰度化 4K 图片        │ 45ms       │ 8ms        │ 5.6x     │
│ 排序 100万个浮点数    │ 320ms      │ 95ms       │ 3.4x     │
│ 哈希 10MB 数据       │ 180ms      │ 35ms       │ 5.1x     │
│ 字符串拼接 10万次     │ 15ms       │ 25ms       │ 0.6x ⚠️  │
│ JSON 解析            │ 5ms        │ 12ms       │ 0.4x ⚠️  │
└──────────────────────┴────────────┴────────────┴──────────┘

注意：字符串操作和 JSON 处理 JS 更快！因为 V8 对这些有深度优化，
而 WASM 需要在 JS ↔ WASM 之间拷贝字符串数据。
```

### 20.7.3 什么时候该用 WASM？

```
┌─────────────────────────────────────────────────────────────┐
│                  WASM 适用性决策树                            │
│                                                              │
│  你的代码是 CPU 密集型吗？                                    │
│  ├── 否 → 用 JS 就好                                        │
│  └── 是                                                      │
│      │                                                       │
│      ├── 涉及大量数学/矩阵运算？ → ✅ 用 WASM                │
│      ├── 处理二进制数据（图片/音视频）？ → ✅ 用 WASM         │
│      ├── 需要可预测的性能（无 GC 暂停）？ → ✅ 用 WASM        │
│      ├── 需要复用现有 C/Rust 库？ → ✅ 用 WASM               │
│      ├── 主要是字符串操作？ → ❌ 用 JS                       │
│      ├── 主要是 DOM 操作？ → ❌ 用 JS                        │
│      └── 需要频繁和 JS 交互？ → ⚠️ 考虑边界开销              │
└─────────────────────────────────────────────────────────────┘
```

---

## 20.8 实战：图片处理工具

### 20.8.1 项目结构

让我们构建一个真实的图片处理工具，同时用 JS 和 WASM 实现，然后对比性能。

```bash
# 创建项目
cargo new --lib image-processor-wasm
cd image-processor-wasm
```

`Cargo.toml`：

```toml
[package]
name = "image-processor-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"

[dependencies.web-sys]
version = "0.3"
features = [
    "console",
    "Document",
    "Element",
    "HtmlElement",
    "HtmlCanvasElement",
    "HtmlInputElement",
    "HtmlImageElement",
    "CanvasRenderingContext2d",
    "ImageData",
    "Window",
    "File",
    "FileReader",
    "Blob",
    "Url",
    "Performance",
    "Event",
    "EventTarget",
]

[profile.release]
opt-level = "s"
lto = true
```

### 20.8.2 Rust 端实现

```rust
// src/lib.rs

use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;

// ========== 图片滤镜 ==========

/// 灰度化
#[wasm_bindgen]
pub fn filter_grayscale(pixels: &mut [u8]) {
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

/// 反色
#[wasm_bindgen]
pub fn filter_invert(pixels: &mut [u8]) {
    for chunk in pixels.chunks_exact_mut(4) {
        chunk[0] = 255 - chunk[0]; // R
        chunk[1] = 255 - chunk[1]; // G
        chunk[2] = 255 - chunk[2]; // B
        // Alpha 不变
    }
}

/// 亮度调整（-100 到 100）
#[wasm_bindgen]
pub fn filter_brightness(pixels: &mut [u8], amount: i32) {
    for chunk in pixels.chunks_exact_mut(4) {
        chunk[0] = clamp_u8(chunk[0] as i32 + amount);
        chunk[1] = clamp_u8(chunk[1] as i32 + amount);
        chunk[2] = clamp_u8(chunk[2] as i32 + amount);
    }
}

/// 对比度调整（0.0 到 3.0，1.0 为原始）
#[wasm_bindgen]
pub fn filter_contrast(pixels: &mut [u8], factor: f64) {
    for chunk in pixels.chunks_exact_mut(4) {
        chunk[0] = clamp_u8(((chunk[0] as f64 - 128.0) * factor + 128.0) as i32);
        chunk[1] = clamp_u8(((chunk[1] as f64 - 128.0) * factor + 128.0) as i32);
        chunk[2] = clamp_u8(((chunk[2] as f64 - 128.0) * factor + 128.0) as i32);
    }
}

/// 模糊（简单的均值模糊）
#[wasm_bindgen]
pub fn filter_blur(pixels: &[u8], width: u32, height: u32, radius: u32) -> Vec<u8> {
    let mut output = pixels.to_vec();
    let w = width as usize;
    let h = height as usize;
    let r = radius as i32;

    for y in 0..h {
        for x in 0..w {
            let mut sum_r: u32 = 0;
            let mut sum_g: u32 = 0;
            let mut sum_b: u32 = 0;
            let mut count: u32 = 0;

            // 遍历邻域
            for dy in -r..=r {
                for dx in -r..=r {
                    let ny = y as i32 + dy;
                    let nx = x as i32 + dx;

                    if ny >= 0 && ny < h as i32 && nx >= 0 && nx < w as i32 {
                        let idx = (ny as usize * w + nx as usize) * 4;
                        sum_r += pixels[idx] as u32;
                        sum_g += pixels[idx + 1] as u32;
                        sum_b += pixels[idx + 2] as u32;
                        count += 1;
                    }
                }
            }

            let idx = (y * w + x) * 4;
            output[idx] = (sum_r / count) as u8;
            output[idx + 1] = (sum_g / count) as u8;
            output[idx + 2] = (sum_b / count) as u8;
            output[idx + 3] = pixels[idx + 3]; // alpha 不变
        }
    }

    output
}

/// 棕褐色滤镜（怀旧效果）
#[wasm_bindgen]
pub fn filter_sepia(pixels: &mut [u8]) {
    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0] as f64;
        let g = chunk[1] as f64;
        let b = chunk[2] as f64;

        chunk[0] = clamp_u8((r * 0.393 + g * 0.769 + b * 0.189) as i32);
        chunk[1] = clamp_u8((r * 0.349 + g * 0.686 + b * 0.168) as i32);
        chunk[2] = clamp_u8((r * 0.272 + g * 0.534 + b * 0.131) as i32);
    }
}

/// 像素化效果
#[wasm_bindgen]
pub fn filter_pixelate(pixels: &[u8], width: u32, height: u32, block_size: u32) -> Vec<u8> {
    let mut output = pixels.to_vec();
    let w = width as usize;
    let h = height as usize;
    let bs = block_size as usize;

    for by in (0..h).step_by(bs) {
        for bx in (0..w).step_by(bs) {
            // 计算块内平均颜色
            let mut sum_r: u64 = 0;
            let mut sum_g: u64 = 0;
            let mut sum_b: u64 = 0;
            let mut count: u64 = 0;

            for y in by..std::cmp::min(by + bs, h) {
                for x in bx..std::cmp::min(bx + bs, w) {
                    let idx = (y * w + x) * 4;
                    sum_r += pixels[idx] as u64;
                    sum_g += pixels[idx + 1] as u64;
                    sum_b += pixels[idx + 2] as u64;
                    count += 1;
                }
            }

            let avg_r = (sum_r / count) as u8;
            let avg_g = (sum_g / count) as u8;
            let avg_b = (sum_b / count) as u8;

            // 用平均颜色填充整个块
            for y in by..std::cmp::min(by + bs, h) {
                for x in bx..std::cmp::min(bx + bs, w) {
                    let idx = (y * w + x) * 4;
                    output[idx] = avg_r;
                    output[idx + 1] = avg_g;
                    output[idx + 2] = avg_b;
                }
            }
        }
    }

    output
}

/// 边缘检测（Sobel 算子）
#[wasm_bindgen]
pub fn filter_edge_detect(pixels: &[u8], width: u32, height: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let mut output = vec![0u8; pixels.len()];

    // Sobel 算子
    let gx: [[i32; 3]; 3] = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    let gy: [[i32; 3]; 3] = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let mut sum_gx: i32 = 0;
            let mut sum_gy: i32 = 0;

            for ky in 0..3 {
                for kx in 0..3 {
                    let py = y + ky - 1;
                    let px = x + kx - 1;
                    let idx = (py * w + px) * 4;
                    // 用灰度值计算
                    let gray = (pixels[idx] as i32 + pixels[idx + 1] as i32 + pixels[idx + 2] as i32) / 3;
                    sum_gx += gray * gx[ky][kx];
                    sum_gy += gray * gy[ky][kx];
                }
            }

            let magnitude = ((sum_gx * sum_gx + sum_gy * sum_gy) as f64).sqrt() as u8;
            let idx = (y * w + x) * 4;
            output[idx] = magnitude;
            output[idx + 1] = magnitude;
            output[idx + 2] = magnitude;
            output[idx + 3] = 255;
        }
    }

    output
}

// 辅助函数：值裁剪到 0-255
fn clamp_u8(val: i32) -> u8 {
    val.max(0).min(255) as u8
}

// ========== 性能计时工具 ==========

#[wasm_bindgen]
pub fn get_performance_now() -> f64 {
    web_sys::window()
        .unwrap()
        .performance()
        .unwrap()
        .now()
}
```

### 20.8.3 完整的前端页面

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>图片处理器 - JS vs WASM 对比</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a2e;
            color: #eee;
            padding: 20px;
        }
        h1 {
            text-align: center;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .controls {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            margin: 20px 0;
        }
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: transform 0.1s;
        }
        button:active { transform: scale(0.95); }
        .btn-wasm {
            background: linear-gradient(135deg, #f093fb, #f5576c);
            color: white;
        }
        .btn-js {
            background: linear-gradient(135deg, #f7dc6f, #f39c12);
            color: #333;
        }
        .btn-reset {
            background: #555;
            color: white;
        }
        .canvas-container {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .canvas-wrapper {
            text-align: center;
        }
        canvas {
            border: 2px solid #333;
            border-radius: 8px;
            max-width: 100%;
        }
        #results {
            margin-top: 20px;
            padding: 15px;
            background: #16213e;
            border-radius: 8px;
            font-family: monospace;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
        }
        input[type="file"] {
            display: none;
        }
        .upload-label {
            display: inline-block;
            padding: 10px 30px;
            background: linear-gradient(135deg, #a8edea, #fed6e3);
            color: #333;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <h1>🖼️ 图片处理器 —— JS vs WASM 性能对比</h1>

    <div style="text-align: center; margin: 20px 0;">
        <label class="upload-label" for="fileInput">
            📂 选择图片
        </label>
        <input type="file" id="fileInput" accept="image/*">
    </div>

    <div class="controls">
        <button class="btn-wasm" onclick="applyFilter('grayscale', 'wasm')">🔲 灰度 (WASM)</button>
        <button class="btn-js" onclick="applyFilter('grayscale', 'js')">🔲 灰度 (JS)</button>
        <button class="btn-wasm" onclick="applyFilter('invert', 'wasm')">🔄 反色 (WASM)</button>
        <button class="btn-js" onclick="applyFilter('invert', 'js')">🔄 反色 (JS)</button>
        <button class="btn-wasm" onclick="applyFilter('sepia', 'wasm')">🟤 怀旧 (WASM)</button>
        <button class="btn-js" onclick="applyFilter('sepia', 'js')">🟤 怀旧 (JS)</button>
        <button class="btn-wasm" onclick="applyFilter('blur', 'wasm')">🌫️ 模糊 (WASM)</button>
        <button class="btn-js" onclick="applyFilter('blur', 'js')">🌫️ 模糊 (JS)</button>
        <button class="btn-wasm" onclick="applyFilter('edge', 'wasm')">✏️ 边缘 (WASM)</button>
        <button class="btn-js" onclick="applyFilter('edge', 'js')">✏️ 边缘 (JS)</button>
        <button class="btn-reset" onclick="resetImage()">↩️ 重置</button>
    </div>

    <div class="canvas-container">
        <div class="canvas-wrapper">
            <h3>原图</h3>
            <canvas id="originalCanvas" width="800" height="600"></canvas>
        </div>
        <div class="canvas-wrapper">
            <h3>处理后</h3>
            <canvas id="processedCanvas" width="800" height="600"></canvas>
        </div>
    </div>

    <div id="results">等待加载图片...</div>

    <script type="module">
        import init, {
            filter_grayscale,
            filter_invert,
            filter_brightness,
            filter_contrast,
            filter_blur,
            filter_sepia,
            filter_pixelate,
            filter_edge_detect,
        } from './pkg/image_processor_wasm.js';

        // 初始化 WASM
        await init();

        const originalCanvas = document.getElementById('originalCanvas');
        const processedCanvas = document.getElementById('processedCanvas');
        const origCtx = originalCanvas.getContext('2d');
        const procCtx = processedCanvas.getContext('2d');
        const results = document.getElementById('results');

        let originalImageData = null;

        // 文件上传处理
        document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const img = new Image();
            img.onload = () => {
                originalCanvas.width = img.width;
                originalCanvas.height = img.height;
                processedCanvas.width = img.width;
                processedCanvas.height = img.height;

                origCtx.drawImage(img, 0, 0);
                procCtx.drawImage(img, 0, 0);

                originalImageData = origCtx.getImageData(0, 0, img.width, img.height);

                const pixels = img.width * img.height;
                results.textContent = `✅ 图片已加载: ${img.width}x${img.height} (${pixels.toLocaleString()} 像素)\n准备就绪，点击滤镜按钮开始处理！\n`;
            };
            img.src = URL.createObjectURL(file);
        });

        // JS 版滤镜实现
        const jsFilters = {
            grayscale(pixels) {
                for (let i = 0; i < pixels.length; i += 4) {
                    const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2]);
                    pixels[i] = pixels[i+1] = pixels[i+2] = gray;
                }
            },
            invert(pixels) {
                for (let i = 0; i < pixels.length; i += 4) {
                    pixels[i] = 255 - pixels[i];
                    pixels[i+1] = 255 - pixels[i+1];
                    pixels[i+2] = 255 - pixels[i+2];
                }
            },
            sepia(pixels) {
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
                    pixels[i]   = Math.min(255, r*0.393 + g*0.769 + b*0.189);
                    pixels[i+1] = Math.min(255, r*0.349 + g*0.686 + b*0.168);
                    pixels[i+2] = Math.min(255, r*0.272 + g*0.534 + b*0.131);
                }
            },
            blur(pixels, width, height) {
                const output = new Uint8ClampedArray(pixels);
                const radius = 3;
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        let sr = 0, sg = 0, sb = 0, count = 0;
                        for (let dy = -radius; dy <= radius; dy++) {
                            for (let dx = -radius; dx <= radius; dx++) {
                                const ny = y + dy, nx = x + dx;
                                if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                                    const idx = (ny * width + nx) * 4;
                                    sr += pixels[idx]; sg += pixels[idx+1]; sb += pixels[idx+2];
                                    count++;
                                }
                            }
                        }
                        const idx = (y * width + x) * 4;
                        output[idx] = sr/count; output[idx+1] = sg/count; output[idx+2] = sb/count;
                    }
                }
                return output;
            },
            edge(pixels, width, height) {
                const output = new Uint8ClampedArray(pixels.length);
                const gx = [[-1,0,1],[-2,0,2],[-1,0,1]];
                const gy = [[-1,-2,-1],[0,0,0],[1,2,1]];
                for (let y = 1; y < height-1; y++) {
                    for (let x = 1; x < width-1; x++) {
                        let sumGx = 0, sumGy = 0;
                        for (let ky = 0; ky < 3; ky++) {
                            for (let kx = 0; kx < 3; kx++) {
                                const idx = ((y+ky-1)*width + (x+kx-1))*4;
                                const gray = (pixels[idx]+pixels[idx+1]+pixels[idx+2])/3;
                                sumGx += gray * gx[ky][kx];
                                sumGy += gray * gy[ky][kx];
                            }
                        }
                        const mag = Math.sqrt(sumGx*sumGx + sumGy*sumGy);
                        const idx = (y*width+x)*4;
                        output[idx] = output[idx+1] = output[idx+2] = mag;
                        output[idx+3] = 255;
                    }
                }
                return output;
            }
        };

        // 应用滤镜并计时
        window.applyFilter = function(filterName, engine) {
            if (!originalImageData) {
                results.textContent += '⚠️ 请先上传图片！\n';
                return;
            }

            const width = originalImageData.width;
            const height = originalImageData.height;
            const imageData = new ImageData(
                new Uint8ClampedArray(originalImageData.data),
                width, height
            );

            const start = performance.now();

            if (engine === 'wasm') {
                const pixels = new Uint8Array(imageData.data.buffer);
                switch (filterName) {
                    case 'grayscale': filter_grayscale(pixels); break;
                    case 'invert': filter_invert(pixels); break;
                    case 'sepia': filter_sepia(pixels); break;
                    case 'blur': {
                        const result = filter_blur(pixels, width, height, 3);
                        imageData.data.set(result);
                        break;
                    }
                    case 'edge': {
                        const result = filter_edge_detect(pixels, width, height);
                        imageData.data.set(result);
                        break;
                    }
                }
            } else {
                const pixels = imageData.data;
                switch (filterName) {
                    case 'grayscale': jsFilters.grayscale(pixels); break;
                    case 'invert': jsFilters.invert(pixels); break;
                    case 'sepia': jsFilters.sepia(pixels); break;
                    case 'blur': {
                        const result = jsFilters.blur(pixels, width, height);
                        imageData.data.set(result);
                        break;
                    }
                    case 'edge': {
                        const result = jsFilters.edge(pixels, width, height);
                        imageData.data.set(result);
                        break;
                    }
                }
            }

            const elapsed = performance.now() - start;

            procCtx.putImageData(imageData, 0, 0);

            const emoji = engine === 'wasm' ? '🦀' : '🟨';
            results.textContent += `${emoji} [${engine.toUpperCase()}] ${filterName}: ${elapsed.toFixed(2)}ms\n`;
            results.scrollTop = results.scrollHeight;
        };

        window.resetImage = function() {
            if (originalImageData) {
                procCtx.putImageData(originalImageData, 0, 0);
                results.textContent += '↩️ 已重置\n';
            }
        };
    </script>
</body>
</html>
```

---

## 20.9 在 React/Vue 项目中使用 WASM

### 20.9.1 在 Vite + React 项目中使用

```bash
# 创建 React 项目
npm create vite@latest my-wasm-app -- --template react-ts
cd my-wasm-app

# 安装 vite-plugin-wasm
npm install vite-plugin-wasm vite-plugin-top-level-await

# 编译 WASM 包（在 Rust 项目目录中）
cd ../image-processor-wasm
wasm-pack build --target bundler
# 生成的包在 pkg/ 目录中

# 回到 React 项目，安装 WASM 包
cd ../my-wasm-app
npm install ../image-processor-wasm/pkg
```

配置 `vite.config.ts`：

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
    plugins: [
        react(),
        wasm(),
        topLevelAwait(),
    ],
});
```

创建 WASM Hook：

```typescript
// src/hooks/useWasm.ts
import { useState, useEffect } from 'react';

// 动态导入 WASM 模块
export function useWasm() {
    const [wasmModule, setWasmModule] = useState<typeof import('image-processor-wasm') | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadWasm() {
            try {
                // 动态导入，实现代码分割
                const module = await import('image-processor-wasm');
                if (!cancelled) {
                    setWasmModule(module);
                    setLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err as Error);
                    setLoading(false);
                }
            }
        }

        loadWasm();
        return () => { cancelled = true; };
    }, []);

    return { wasmModule, loading, error };
}
```

在 React 组件中使用：

```tsx
// src/components/ImageProcessor.tsx
import React, { useRef, useState, useCallback } from 'react';
import { useWasm } from '../hooks/useWasm';

interface FilterResult {
    name: string;
    time: number;
    engine: 'js' | 'wasm';
}

export function ImageProcessor() {
    const { wasmModule, loading, error } = useWasm();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [results, setResults] = useState<FilterResult[]>([]);
    const [imageLoaded, setImageLoaded] = useState(false);
    const originalDataRef = useRef<ImageData | null>(null);

    // 加载图片
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !canvasRef.current) return;

        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current!;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            originalDataRef.current = ctx.getImageData(0, 0, img.width, img.height);
            setImageLoaded(true);
        };
        img.src = URL.createObjectURL(file);
    }, []);

    // 应用 WASM 滤镜
    const applyWasmFilter = useCallback((filterName: string) => {
        if (!wasmModule || !canvasRef.current || !originalDataRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        const imageData = new ImageData(
            new Uint8ClampedArray(originalDataRef.current.data),
            canvas.width,
            canvas.height
        );

        const start = performance.now();

        const pixels = new Uint8Array(imageData.data.buffer);
        switch (filterName) {
            case 'grayscale':
                wasmModule.filter_grayscale(pixels);
                break;
            case 'invert':
                wasmModule.filter_invert(pixels);
                break;
            case 'sepia':
                wasmModule.filter_sepia(pixels);
                break;
        }

        const elapsed = performance.now() - start;
        ctx.putImageData(imageData, 0, 0);

        setResults(prev => [...prev, {
            name: filterName,
            time: elapsed,
            engine: 'wasm'
        }]);
    }, [wasmModule]);

    if (loading) return <div>⏳ 正在加载 WASM 模块...</div>;
    if (error) return <div>❌ WASM 加载失败: {error.message}</div>;

    return (
        <div className="image-processor">
            <h2>🖼️ 图片处理器 (React + WASM)</h2>

            <input type="file" accept="image/*" onChange={handleFileChange} />

            {imageLoaded && (
                <div className="filters">
                    <button onClick={() => applyWasmFilter('grayscale')}>
                        🔲 灰度
                    </button>
                    <button onClick={() => applyWasmFilter('invert')}>
                        🔄 反色
                    </button>
                    <button onClick={() => applyWasmFilter('sepia')}>
                        🟤 怀旧
                    </button>
                </div>
            )}

            <canvas ref={canvasRef} />

            <div className="results">
                {results.map((r, i) => (
                    <div key={i}>
                        🦀 [{r.engine}] {r.name}: {r.time.toFixed(2)}ms
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### 20.9.2 在 Vue 3 项目中使用

```bash
# 创建 Vue 项目
npm create vite@latest my-vue-wasm -- --template vue-ts
cd my-vue-wasm

npm install vite-plugin-wasm vite-plugin-top-level-await
npm install ../image-processor-wasm/pkg
```

```vue
<!-- src/components/ImageProcessor.vue -->
<template>
    <div class="processor">
        <h2>🖼️ 图片处理器 (Vue + WASM)</h2>

        <div v-if="loading">⏳ 正在加载 WASM 模块...</div>
        <div v-else-if="error">❌ {{ error }}</div>
        <template v-else>
            <input type="file" accept="image/*" @change="handleFile" />

            <div v-if="imageLoaded" class="controls">
                <button @click="applyFilter('grayscale')">🔲 灰度</button>
                <button @click="applyFilter('invert')">🔄 反色</button>
                <button @click="applyFilter('sepia')">🟤 怀旧</button>
                <button @click="resetImage">↩️ 重置</button>
            </div>

            <canvas ref="canvasRef" />

            <div class="results">
                <p v-for="(r, i) in results" :key="i">
                    🦀 [{{ r.engine }}] {{ r.name }}: {{ r.time.toFixed(2) }}ms
                </p>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, shallowRef } from 'vue';

// 类型声明
interface WasmModule {
    filter_grayscale(pixels: Uint8Array): void;
    filter_invert(pixels: Uint8Array): void;
    filter_sepia(pixels: Uint8Array): void;
}

interface FilterResult {
    name: string;
    time: number;
    engine: string;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const wasmModule = shallowRef<WasmModule | null>(null);
const loading = ref(true);
const error = ref('');
const imageLoaded = ref(false);
const results = ref<FilterResult[]>([]);
let originalData: ImageData | null = null;

// 加载 WASM
onMounted(async () => {
    try {
        const mod = await import('image-processor-wasm');
        wasmModule.value = mod;
        loading.value = false;
    } catch (e) {
        error.value = String(e);
        loading.value = false;
    }
});

function handleFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !canvasRef.value) return;

    const img = new Image();
    img.onload = () => {
        const canvas = canvasRef.value!;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        originalData = ctx.getImageData(0, 0, img.width, img.height);
        imageLoaded.value = true;
    };
    img.src = URL.createObjectURL(file);
}

function applyFilter(name: string) {
    if (!wasmModule.value || !canvasRef.value || !originalData) return;

    const canvas = canvasRef.value;
    const ctx = canvas.getContext('2d')!;
    const imageData = new ImageData(
        new Uint8ClampedArray(originalData.data),
        canvas.width, canvas.height
    );

    const pixels = new Uint8Array(imageData.data.buffer);
    const start = performance.now();

    switch (name) {
        case 'grayscale': wasmModule.value.filter_grayscale(pixels); break;
        case 'invert': wasmModule.value.filter_invert(pixels); break;
        case 'sepia': wasmModule.value.filter_sepia(pixels); break;
    }

    const elapsed = performance.now() - start;
    ctx.putImageData(imageData, 0, 0);

    results.value.push({ name, time: elapsed, engine: 'wasm' });
}

function resetImage() {
    if (!canvasRef.value || !originalData) return;
    canvasRef.value.getContext('2d')!.putImageData(originalData, 0, 0);
}
</script>
```

### 20.9.3 使用 Web Worker 避免阻塞 UI

对于耗时的 WASM 操作，应该放在 Web Worker 中执行：

```typescript
// src/workers/wasm-worker.ts

// Worker 线程中加载 WASM
import init, {
    filter_grayscale,
    filter_blur,
    filter_edge_detect,
} from 'image-processor-wasm';

let initialized = false;

self.onmessage = async (e: MessageEvent) => {
    const { type, pixels, width, height } = e.data;

    // 首次调用时初始化 WASM
    if (!initialized) {
        await init();
        initialized = true;
    }

    const start = performance.now();

    switch (type) {
        case 'grayscale':
            filter_grayscale(pixels);
            break;
        case 'blur': {
            const result = filter_blur(pixels, width, height, 3);
            // 注意：blur 返回新数组，需要特殊处理
            self.postMessage({
                type: 'result',
                pixels: result,
                time: performance.now() - start,
            }, [result.buffer]); // 使用 Transferable 避免拷贝
            return;
        }
        case 'edge': {
            const result = filter_edge_detect(pixels, width, height);
            self.postMessage({
                type: 'result',
                pixels: result,
                time: performance.now() - start,
            }, [result.buffer]);
            return;
        }
    }

    const elapsed = performance.now() - start;

    // 使用 Transferable 把结果传回主线程（零拷贝）
    self.postMessage({
        type: 'result',
        pixels: pixels,
        time: elapsed,
    }, [pixels.buffer]);
};
```

在主线程中使用 Worker：

```typescript
// src/hooks/useWasmWorker.ts
import { useRef, useCallback } from 'react';

export function useWasmWorker() {
    const workerRef = useRef<Worker | null>(null);

    // 懒加载 Worker
    const getWorker = useCallback(() => {
        if (!workerRef.current) {
            workerRef.current = new Worker(
                new URL('../workers/wasm-worker.ts', import.meta.url),
                { type: 'module' }
            );
        }
        return workerRef.current;
    }, []);

    // 在 Worker 中处理图片（不阻塞 UI！）
    const processImage = useCallback((
        filterType: string,
        imageData: ImageData
    ): Promise<{ pixels: Uint8Array; time: number }> => {
        return new Promise((resolve) => {
            const worker = getWorker();

            // 拷贝像素数据（因为 Transferable 会转移所有权）
            const pixels = new Uint8Array(imageData.data);

            worker.onmessage = (e) => {
                resolve({
                    pixels: e.data.pixels,
                    time: e.data.time,
                });
            };

            // 发送到 Worker，使用 Transferable 零拷贝
            worker.postMessage({
                type: filterType,
                pixels,
                width: imageData.width,
                height: imageData.height,
            }, [pixels.buffer]);
        });
    }, [getWorker]);

    return { processImage };
}
```

---

## 20.10 进阶话题

### 20.10.1 WASM 体积优化

```toml
# Cargo.toml - 优化 WASM 体积

[profile.release]
opt-level = "z"        # 最小体积优化（比 "s" 更激进）
lto = true             # 链接时优化
codegen-units = 1      # 单线程编译，更好的优化
strip = true           # 去除调试信息
panic = "abort"        # 不使用 unwind，减小体积
```

```bash
# 使用 wasm-opt 进一步优化（来自 binaryen 工具包）
wasm-opt -Oz -o output.wasm input.wasm

# 查看 WASM 体积
ls -lh pkg/*.wasm

# 使用 twiggy 分析 WASM 中各函数的大小
cargo install twiggy
twiggy top pkg/hello_wasm_bg.wasm
```

典型的体积对比：

```
未优化:        500KB
opt-level="s": 180KB
opt-level="z": 150KB
+ wasm-opt:    120KB
+ gzip:         40KB  ← 实际传输大小
```

### 20.10.2 WASM 多线程（SharedArrayBuffer）

```rust
// 需要 wasm-bindgen-rayon
// Cargo.toml: wasm-bindgen-rayon = "1.0"

use rayon::prelude::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn parallel_grayscale(pixels: &mut [u8]) {
    // 使用 rayon 并行处理！
    pixels.par_chunks_exact_mut(4).for_each(|chunk| {
        let r = chunk[0] as f64;
        let g = chunk[1] as f64;
        let b = chunk[2] as f64;
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        chunk[0] = gray;
        chunk[1] = gray;
        chunk[2] = gray;
    });
}
```

> ⚠️ **注意：** WASM 多线程需要设置特殊的 HTTP 头：
> ```
> Cross-Origin-Opener-Policy: same-origin
> Cross-Origin-Embedder-Policy: require-corp
> ```

### 20.10.3 WASM + WASI（在服务器端运行）

```rust
// WASI 让 WASM 可以在浏览器之外运行
// 可以访问文件系统、环境变量等

use std::fs;
use std::io::Write;

fn main() {
    // 读取文件
    let content = fs::read_to_string("/input.txt").unwrap();

    // 处理...
    let processed = content.to_uppercase();

    // 写入文件
    let mut file = fs::File::create("/output.txt").unwrap();
    file.write_all(processed.as_bytes()).unwrap();

    println!("处理完成！");
}
```

```bash
# 编译为 WASI 目标
rustup target add wasm32-wasi
cargo build --target wasm32-wasi --release

# 使用 wasmtime 运行
wasmtime run target/wasm32-wasi/release/my_app.wasm \
    --mapdir /::./data
```

---

## 20.11 练习题

### 练习 1：计算密集型函数 ⭐

编写一个 WASM 函数，计算给定范围内所有素数的和。在 JS 端实现同样的功能，对比性能。

```rust
// 提示：
#[wasm_bindgen]
pub fn sum_primes(limit: u32) -> u64 {
    // 使用筛法（Sieve of Eratosthenes）
    // 你的实现...
    todo!()
}
```

### 练习 2：Markdown 渲染器 ⭐⭐

使用 `pulldown-cmark` 库（纯 Rust 的 Markdown 解析器），编译为 WASM，在浏览器中实时渲染 Markdown。

```toml
# Cargo.toml
[dependencies]
pulldown-cmark = "0.10"
wasm-bindgen = "0.2"
```

```rust
// 提示：
#[wasm_bindgen]
pub fn render_markdown(input: &str) -> String {
    // 使用 pulldown_cmark 解析并生成 HTML
    todo!()
}
```

### 练习 3：Canvas 游戏 ⭐⭐⭐

用 Rust + WASM 实现一个简单的 Conway's Game of Life（生命游戏）：
- Rust 负责计算下一代的状态（计算密集型）
- JS 负责 Canvas 渲染和用户交互
- 目标：支持 1000x1000 的网格，保持 60fps

```rust
// 提示：
#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    cells: Vec<u8>,  // 0 = 死，1 = 活
}

#[wasm_bindgen]
impl Universe {
    pub fn new(width: u32, height: u32) -> Universe {
        // 初始化...
        todo!()
    }

    pub fn tick(&mut self) {
        // 计算下一代
        todo!()
    }

    pub fn cells(&self) -> *const u8 {
        // 返回指向 WASM 线性内存的指针
        // JS 可以直接读取这块内存，零拷贝！
        self.cells.as_ptr()
    }
}
```

### 练习 4：在 Lighthouse 项目中应用 ⭐⭐⭐

思考 Lighthouse 项目中哪些模块可以用 WASM 加速：
1. 是否有 CPU 密集型的数据处理？
2. 是否有可以复用的 Rust 库？
3. 设计一个 WASM 模块的接口，并写出 Rust 端和 JS 端的代码骨架。

---

## 20.12 本章小结

```
┌─────────────────────────────────────────────────────────────┐
│                     本章知识图谱                              │
│                                                              │
│   WebAssembly 基础                                           │
│   ├── 什么是 WASM（字节码格式，接近原生速度）                  │
│   ├── .wat 文本格式 vs .wasm 二进制格式                       │
│   └── 不是要取代 JS，而是 JS 的"协处理器"                     │
│                                                              │
│   工具链                                                     │
│   ├── wasm-pack（编译 + 打包 + 发布）                        │
│   ├── wasm-bindgen（JS ↔ Rust 胶水代码）                     │
│   ├── web-sys（Web API 绑定）                                │
│   ├── js-sys（JS 内置对象绑定）                               │
│   └── gloo（高级封装）                                        │
│                                                              │
│   类型映射                                                    │
│   ├── 基本类型（i32 → number, String → string）               │
│   ├── 结构体（#[wasm_bindgen] 或 serde）                      │
│   └── 内存管理（.free() 或 serde 拷贝）                       │
│                                                              │
│   互操作                                                     │
│   ├── Rust → JS（extern "C" 块）                              │
│   ├── JS → Rust（#[wasm_bindgen] 导出）                       │
│   ├── async/await ↔ Promise                                  │
│   ├── 回调函数（Closure）                                     │
│   └── 错误处理（Result → try-catch）                          │
│                                                              │
│   实战                                                        │
│   ├── 图片处理工具（性能对比）                                 │
│   ├── React/Vue 集成                                          │
│   ├── Web Worker（避免阻塞 UI）                               │
│   └── 体积优化                                                │
│                                                              │
│   何时用 WASM？                                               │
│   ├── ✅ 数学/矩阵运算、二进制处理、加密哈希                   │
│   ├── ❌ DOM 操作、字符串处理、JSON 解析                       │
│   └── ⚠️ 注意 JS ↔ WASM 边界的开销                           │
└─────────────────────────────────────────────────────────────┘
```

> **下一章预告：** 第二十一章我们将学习 FFI（Foreign Function Interface），让 Rust 与 C 和 Node.js 直接交互。如果说 WASM 是 Rust 进入浏览器的通道，那么 FFI 就是 Rust 进入整个系统编程世界的大门！
