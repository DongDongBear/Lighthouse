# 第十二章：闭包与迭代器 —— Rust 的函数式编程

> **本章目标**
>
> - 理解闭包的语法与使用场景（对比 JS 箭头函数）
> - 掌握闭包捕获环境的三种方式（Fn/FnMut/FnOnce）
> - 理解 move 闭包与所有权转移
> - 掌握 Iterator trait 的使用
> - 熟练使用迭代器适配器（map/filter/fold 等）
> - 能够实现自定义迭代器
> - 理解迭代器的零成本抽象

> **预计学习时间：120 - 150 分钟**

---

## 12.1 闭包基础

### 12.1.1 什么是闭包？

闭包是一种可以捕获所在环境中变量的匿名函数。

**JavaScript 开发者对闭包一定不陌生：**

```javascript
// JavaScript 闭包
const x = 10;
const add = (y) => x + y;  // 捕获了外部变量 x
console.log(add(5)); // 15
```

```rust
// Rust 闭包
fn main() {
    let x = 10;
    let add = |y| x + y;  // 捕获了外部变量 x
    println!("{}", add(5)); // 15
}
```

### 12.1.2 闭包语法

Rust 闭包用 `|参数|` 而不是 `(参数) =>`：

```rust
// Rust 闭包的各种写法
fn main() {
    // 最简写法：类型自动推断
    let add = |a, b| a + b;

    // 带类型标注
    let add_typed = |a: i32, b: i32| -> i32 { a + b };

    // 多行闭包
    let complex = |x: i32| {
        let doubled = x * 2;
        let squared = doubled * doubled;
        squared + 1
    };

    // 无参数闭包
    let greet = || println!("你好！");

    println!("{}", add(1, 2));      // 3
    println!("{}", add_typed(3, 4)); // 7
    println!("{}", complex(3));      // 37
    greet();                         // 你好！
}
```

**对比 JavaScript/TypeScript：**

| Rust | JavaScript |
|---|---|
| `\|x\| x + 1` | `(x) => x + 1` |
| `\|x, y\| x + y` | `(x, y) => x + y` |
| `\|\| println!("hi")` | `() => console.log("hi")` |
| `\|x: i32\| -> i32 { x + 1 }` | `(x: number): number => x + 1` |

### 12.1.3 闭包类型推断

与普通函数不同，闭包的参数类型通常可以推断：

```rust
fn main() {
    // 编译器根据使用场景推断类型
    let double = |x| x * 2;
    let result = double(5_i32); // 从这里推断 x 是 i32

    // ⚠️ 一旦推断了类型，就不能再用其他类型
    // let result2 = double(5.0_f64); // ❌ 编译错误！已经推断为 i32
}
```

这一点跟 TypeScript 的泛型不同。TypeScript 的箭头函数天然支持多种类型，但 Rust 的闭包一旦确定类型就固定了。

### 12.1.4 闭包 vs 函数

```rust
// 函数：不能捕获环境
fn add_five(x: i32) -> i32 {
    // let y = 10;  // 只能用自己的参数和局部变量
    x + 5
}

// 闭包：可以捕获环境
fn main() {
    let offset = 5;
    let add_offset = |x| x + offset; // 捕获了 offset

    println!("{}", add_five(10));    // 15
    println!("{}", add_offset(10));  // 15
}
```

---

## 12.2 闭包捕获环境

### 12.2.1 三种捕获方式

Rust 的闭包根据如何使用捕获的变量，分为三种类型：

| Trait | 捕获方式 | 类比 | 可调用次数 |
|---|---|---|---|
| `Fn` | 不可变引用 `&T` | 只读 | 无限次 |
| `FnMut` | 可变引用 `&mut T` | 读写 | 无限次 |
| `FnOnce` | 获取所有权 `T` | 消耗 | 只能一次 |

```rust
fn main() {
    // Fn：只读捕获
    let name = String::from("Rust");
    let greet = || println!("Hello, {}!", name); // 不可变引用 &name
    greet(); // ✅ 可以多次调用
    greet(); // ✅
    println!("{}", name); // ✅ name 仍然可用

    // FnMut：可变捕获
    let mut count = 0;
    let mut increment = || {
        count += 1; // 可变引用 &mut count
        println!("count = {}", count);
    };
    increment(); // count = 1
    increment(); // count = 2
    // 注意：increment 必须声明为 mut

    // FnOnce：消耗捕获的值
    let data = vec![1, 2, 3];
    let consume = || {
        let moved_data = data; // 获取所有权
        println!("消耗了: {:?}", moved_data);
    };
    consume(); // ✅ 第一次调用
    // consume(); // ❌ 编译错误！data 已经被消耗了
    // println!("{:?}", data); // ❌ data 已经被移动了
}
```

**对比 JavaScript：**

JavaScript 的闭包没有这种区分——所有捕获都是引用，因为 JS 对象是引用类型：

```javascript
// JS 闭包总是可以随意读写外部变量
let count = 0;
const increment = () => { count++; };
increment();
increment();
console.log(count); // 2
```

### 12.2.2 编译器自动选择最轻量的方式

编译器会根据闭包体内的使用方式自动选择：

```rust
fn main() {
    let s = String::from("hello");

    // 只读 → Fn
    let f1 = || println!("{}", s);

    // 修改 → FnMut
    let mut v = vec![1, 2, 3];
    let mut f2 = || v.push(4);

    // 移动 → FnOnce
    let s2 = String::from("world");
    let f3 = || drop(s2); // drop 消耗了 s2
}
```

```
编译器选择闭包类型的流程：

闭包使用了捕获的变量吗？
├── 消耗了所有权（move/drop）→ FnOnce
├── 修改了变量值               → FnMut
└── 只是读取                   → Fn
```

### 12.2.3 Trait 的继承关系

```
Fn ⊂ FnMut ⊂ FnOnce

所有 Fn 都是 FnMut（只读当然可以当读写用）
所有 FnMut 都是 FnOnce（能多次调用当然能调一次）
```

这意味着：

```rust
// 接受 FnOnce 的函数可以接受任何闭包
fn call_once<F: FnOnce()>(f: F) {
    f();
}

// 接受 Fn 的函数只接受不修改环境的闭包
fn call_many<F: Fn()>(f: F) {
    f();
    f();
    f();
}

fn main() {
    let x = 5;
    let print_x = || println!("{}", x); // Fn

    call_once(print_x); // ✅ Fn 是 FnOnce 的子集
    call_many(print_x); // ✅ Fn 当然满足 Fn

    let mut count = 0;
    let mut inc = || count += 1; // FnMut

    // call_many(inc); // ❌ FnMut 不满足 Fn
}
```

### 12.2.4 闭包作为函数参数

```rust
// 用 Trait bound 指定闭包类型
fn apply<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(x)
}

// 用 impl Trait 简写
fn apply2(f: impl Fn(i32) -> i32, x: i32) -> i32 {
    f(x)
}

// 用 where 子句
fn apply3<F>(f: F, x: i32) -> i32
where
    F: Fn(i32) -> i32,
{
    f(x)
}

fn main() {
    let double = |x| x * 2;
    let add_ten = |x| x + 10;

    println!("{}", apply(double, 5));   // 10
    println!("{}", apply(add_ten, 5));  // 15

    // 也可以传普通函数
    fn square(x: i32) -> i32 { x * x }
    println!("{}", apply(square, 5));   // 25
}
```

### 12.2.5 闭包作为返回值

```rust
// 返回闭包需要 Box<dyn Fn> 或 impl Fn
fn make_adder(x: i32) -> impl Fn(i32) -> i32 {
    move |y| x + y // 必须用 move，因为 x 是函数参数
}

// 当需要返回不同闭包时，用 Box<dyn Fn>
fn make_operation(op: &str) -> Box<dyn Fn(i32, i32) -> i32> {
    match op {
        "add" => Box::new(|a, b| a + b),
        "mul" => Box::new(|a, b| a * b),
        _ => Box::new(|a, b| a - b),
    }
}

fn main() {
    let add_five = make_adder(5);
    println!("{}", add_five(10)); // 15

    let op = make_operation("add");
    println!("{}", op(3, 4)); // 7
}
```

---

## 12.3 move 闭包

### 12.3.1 什么是 move？

`move` 关键字强制闭包获取捕获变量的所有权，而不是借用：

```rust
fn main() {
    let name = String::from("Rust");

    // 不用 move：闭包借用 name
    let greet = || println!("Hello, {}!", name);
    greet();
    println!("{}", name); // ✅ name 还能用

    // 用 move：闭包拥有 name
    let name2 = String::from("World");
    let greet2 = move || println!("Hello, {}!", name2);
    greet2();
    // println!("{}", name2); // ❌ name2 已被移动到闭包里
}
```

### 12.3.2 move 对 Copy 类型的影响

对于 Copy 类型，move 实际上是复制而不是移动：

```rust
fn main() {
    let x = 5; // i32 是 Copy 类型

    let closure = move || println!("{}", x);
    closure();

    println!("{}", x); // ✅ x 仍然可用，因为是 Copy
}
```

### 12.3.3 线程中必须使用 move

当把闭包传给新线程时，通常需要 move：

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3];

    // ❌ 不用 move 会报错，因为新线程可能比 main 活得长
    // let handle = thread::spawn(|| {
    //     println!("{:?}", data);
    // });

    // ✅ 用 move 把 data 的所有权转移给新线程
    let handle = thread::spawn(move || {
        println!("{:?}", data);
    });

    handle.join().unwrap();
    // println!("{:?}", data); // ❌ data 已被移动
}
```

---

## 12.4 迭代器基础

### 12.4.1 Iterator Trait

```rust
// 标准库中的定义
trait Iterator {
    type Item; // 关联类型：迭代产生的元素类型

    fn next(&mut self) -> Option<Self::Item>;

    // 还有大量默认方法（map, filter, fold 等）
}
```

### 12.4.2 基本使用

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    // 方式一：for 循环（最常用）
    for item in &v {
        println!("{}", item);
    }

    // 方式二：手动调用 next
    let mut iter = v.iter();
    assert_eq!(iter.next(), Some(&1));
    assert_eq!(iter.next(), Some(&2));
    assert_eq!(iter.next(), Some(&3));
    assert_eq!(iter.next(), Some(&4));
    assert_eq!(iter.next(), Some(&5));
    assert_eq!(iter.next(), None); // 迭代完毕

    // 方式三：迭代器方法链
    let sum: i32 = v.iter().sum();
    println!("总和: {}", sum); // 15
}
```

### 12.4.3 三种迭代方法

```rust
fn main() {
    let v = vec![String::from("a"), String::from("b"), String::from("c")];

    // iter()：产生不可变引用 &T
    for s in v.iter() {
        println!("{}", s); // s 是 &String
    }
    // v 仍然可用

    // iter_mut()：产生可变引用 &mut T
    let mut v2 = vec![1, 2, 3];
    for n in v2.iter_mut() {
        *n *= 2; // 修改元素
    }
    println!("{:?}", v2); // [2, 4, 6]

    // into_iter()：消耗集合，产生拥有所有权的 T
    let v3 = vec![String::from("x"), String::from("y")];
    for s in v3.into_iter() {
        println!("{}", s); // s 是 String（拥有所有权）
    }
    // v3 不再可用
}
```

| 方法 | 产生类型 | 消耗原集合？ |
|---|---|---|
| `.iter()` | `&T` | 否 |
| `.iter_mut()` | `&mut T` | 否 |
| `.into_iter()` | `T` | 是 |

**注意：** `for item in &v` 等价于 `for item in v.iter()`，`for item in v` 等价于 `for item in v.into_iter()`。

---

## 12.5 迭代器适配器

迭代器适配器是 Rust 函数式编程的精华。它们接收一个迭代器，返回一个新的迭代器。

### 12.5.1 map —— 变换

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // Rust
    let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();
    println!("{:?}", doubled); // [2, 4, 6, 8, 10]
}
```

**对比 JavaScript：**

```javascript
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);
// [2, 4, 6, 8, 10]
```

关键区别：
- Rust 需要 `.collect()` 来触发计算（惰性求值）
- JS 的 `map` 立即执行

### 12.5.2 filter —— 过滤

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 过滤偶数
    let evens: Vec<&i32> = numbers.iter().filter(|&&x| x % 2 == 0).collect();
    println!("{:?}", evens); // [2, 4, 6, 8, 10]

    // 注意：filter 的闭包参数是 &&i32（双重引用）
    // 因为 iter() 产生 &i32，filter 又借用了一次

    // 更清晰的写法
    let evens2: Vec<i32> = numbers
        .iter()
        .filter(|x| **x % 2 == 0)
        .copied()  // 将 &i32 转为 i32
        .collect();
    println!("{:?}", evens2); // [2, 4, 6, 8, 10]
}
```

**对比 JavaScript：**

```javascript
const evens = [1, 2, 3, 4, 5].filter(x => x % 2 === 0);
```

### 12.5.3 fold —— 归约（对比 JS reduce）

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // 求和
    let sum = numbers.iter().fold(0, |acc, x| acc + x);
    println!("sum = {}", sum); // 15

    // 求乘积
    let product = numbers.iter().fold(1, |acc, x| acc * x);
    println!("product = {}", product); // 120

    // 构建字符串
    let words = vec!["hello", "beautiful", "world"];
    let sentence = words.iter().fold(String::new(), |mut acc, word| {
        if !acc.is_empty() {
            acc.push(' ');
        }
        acc.push_str(word);
        acc
    });
    println!("{}", sentence); // "hello beautiful world"
}
```

**对比 JavaScript：**

```javascript
const sum = [1, 2, 3, 4, 5].reduce((acc, x) => acc + x, 0);
```

### 12.5.4 链式调用

```rust
fn main() {
    let data = vec![
        ("Alice", 85),
        ("Bob", 92),
        ("Charlie", 78),
        ("Diana", 95),
        ("Eve", 88),
    ];

    // 找出分数 > 85 的人名，转为大写，排序
    let mut top_students: Vec<String> = data
        .iter()
        .filter(|(_, score)| *score > 85)        // 过滤
        .map(|(name, _)| name.to_uppercase())     // 变换
        .collect();                                // 收集
    top_students.sort();                           // 排序

    println!("{:?}", top_students);
    // ["BOB", "DIANA", "EVE"]
}
```

**对比 JavaScript：**

```javascript
const topStudents = data
    .filter(([_, score]) => score > 85)
    .map(([name, _]) => name.toUpperCase())
    .sort();
```

### 12.5.5 更多常用适配器

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // take：取前 n 个
    let first_three: Vec<&i32> = v.iter().take(3).collect();
    println!("take(3): {:?}", first_three); // [1, 2, 3]

    // skip：跳过前 n 个
    let after_three: Vec<&i32> = v.iter().skip(3).collect();
    println!("skip(3): {:?}", after_three); // [4, 5, 6, 7, 8, 9, 10]

    // enumerate：带索引
    for (i, val) in v.iter().enumerate() {
        if i < 3 {
            println!("[{}] = {}", i, val);
        }
    }

    // zip：合并两个迭代器
    let names = vec!["Alice", "Bob", "Charlie"];
    let scores = vec![85, 92, 78];
    let paired: Vec<(&&str, &i32)> = names.iter().zip(scores.iter()).collect();
    println!("zip: {:?}", paired);

    // chain：连接两个迭代器
    let a = vec![1, 2, 3];
    let b = vec![4, 5, 6];
    let combined: Vec<&i32> = a.iter().chain(b.iter()).collect();
    println!("chain: {:?}", combined); // [1, 2, 3, 4, 5, 6]

    // flat_map：展平映射
    let sentences = vec!["hello world", "foo bar baz"];
    let words: Vec<&str> = sentences.iter().flat_map(|s| s.split(' ')).collect();
    println!("flat_map: {:?}", words); // ["hello", "world", "foo", "bar", "baz"]

    // any / all：布尔聚合
    let has_even = v.iter().any(|x| x % 2 == 0);
    let all_positive = v.iter().all(|x| *x > 0);
    println!("has_even: {}, all_positive: {}", has_even, all_positive);

    // find：查找第一个匹配的元素
    let first_even = v.iter().find(|&&x| x % 2 == 0);
    println!("first_even: {:?}", first_even); // Some(2)

    // position：查找第一个匹配的索引
    let pos = v.iter().position(|&x| x == 5);
    println!("position of 5: {:?}", pos); // Some(4)

    // max / min
    let max = v.iter().max();
    let min = v.iter().min();
    println!("max: {:?}, min: {:?}", max, min);

    // sum / product
    let sum: i32 = v.iter().sum();
    let product: i32 = v.iter().product();
    println!("sum: {}, product: {}", sum, product);

    // count
    let even_count = v.iter().filter(|&&x| x % 2 == 0).count();
    println!("偶数个数: {}", even_count);
}
```

**Rust 迭代器 vs JS 数组方法对照表：**

| Rust | JavaScript | 说明 |
|---|---|---|
| `.map(f)` | `.map(f)` | 变换每个元素 |
| `.filter(f)` | `.filter(f)` | 过滤元素 |
| `.fold(init, f)` | `.reduce(f, init)` | 归约 |
| `.find(f)` | `.find(f)` | 查找第一个匹配 |
| `.any(f)` | `.some(f)` | 是否有任一匹配 |
| `.all(f)` | `.every(f)` | 是否全部匹配 |
| `.enumerate()` | `.entries()` 或 `.forEach((v, i))` | 带索引 |
| `.zip(other)` | 无内置 | 合并两个 |
| `.flat_map(f)` | `.flatMap(f)` | 展平映射 |
| `.take(n)` | `.slice(0, n)` | 取前 n 个 |
| `.skip(n)` | `.slice(n)` | 跳过前 n 个 |
| `.collect()` | 不需要（立即执行） | 触发计算 |
| `.sum()` | `.reduce((a, b) => a + b, 0)` | 求和 |
| `.count()` | `.length` | 计数 |
| `.max()` | `Math.max(...arr)` | 最大值 |
| `.chain(other)` | `.concat(other)` | 连接 |
| `.peekable()` | 无内置 | 可预览下一个 |

---

## 12.6 惰性求值

### 12.6.1 迭代器是惰性的

这是 Rust 迭代器与 JavaScript 数组方法最大的区别：

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    // ⚠️ 这行代码什么都不做！
    v.iter().map(|x| {
        println!("处理 {}", x); // 不会打印！
        x * 2
    });

    // 需要 .collect() 或其他消费者方法来触发
    let doubled: Vec<i32> = v.iter().map(|x| {
        println!("处理 {}", x); // 现在会打印
        x * 2
    }).collect();
}
```

```javascript
// JavaScript 的 map 立即执行
[1, 2, 3].map(x => {
    console.log("处理", x); // 立即打印
    return x * 2;
});
```

### 12.6.2 惰性求值的好处

```rust
fn main() {
    // 只计算需要的部分
    let first_even_squared = (1..1000000)
        .filter(|x| x % 2 == 0)
        .map(|x| x * x)
        .take(5)        // 只取前 5 个
        .collect::<Vec<i32>>();

    println!("{:?}", first_even_squared); // [4, 16, 36, 64, 100]
    // 不会真的遍历 100 万个数！只会处理到第 10 个（第 5 个偶数）
}
```

**这就像一条流水线：**

```
数据源 1..1000000
    │
    ▼
filter(偶数?) ─── 1(跳过) → 2(通过) → 3(跳过) → 4(通过) → ...
    │
    ▼
map(平方) ─── 4 → 16 → 36 → 64 → 100
    │
    ▼
take(5) ─── 收到 5 个了，停！
    │
    ▼
collect → [4, 16, 36, 64, 100]
```

每个元素一次性通过整条链，不会创建中间数组。

### 12.6.3 消费者方法

以下方法会"消费"迭代器（触发实际计算）：

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    // collect：收集成集合
    let doubled: Vec<i32> = v.iter().map(|x| x * 2).collect();

    // for_each：对每个元素执行操作
    v.iter().for_each(|x| println!("{}", x));

    // sum / product / count
    let total: i32 = v.iter().sum();

    // any / all
    let has_three = v.iter().any(|&x| x == 3);

    // find / position
    let found = v.iter().find(|&&x| x > 3);

    // min / max
    let biggest = v.iter().max();

    // fold
    let concatenated = v.iter().fold(String::new(), |acc, x| {
        format!("{}{}", acc, x)
    });
    println!("{}", concatenated); // "12345"

    // last
    let last = v.iter().last();
    println!("{:?}", last); // Some(5)

    // nth
    let third = v.iter().nth(2);
    println!("{:?}", third); // Some(3)
}
```

---

## 12.7 自定义迭代器

### 12.7.1 实现 Iterator Trait

```rust
// 斐波那契数列迭代器
struct Fibonacci {
    current: u64,
    next: u64,
}

impl Fibonacci {
    fn new() -> Self {
        Fibonacci {
            current: 0,
            next: 1,
        }
    }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        let result = self.current;
        self.current = self.next;
        self.next = result + self.next;
        Some(result) // 无限迭代器，永远返回 Some
    }
}

fn main() {
    // 取前 10 个斐波那契数
    let fibs: Vec<u64> = Fibonacci::new().take(10).collect();
    println!("{:?}", fibs);
    // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

    // 找出第一个超过 1000 的斐波那契数
    let big_fib = Fibonacci::new().find(|&x| x > 1000);
    println!("{:?}", big_fib); // Some(1597)

    // 求前 20 个斐波那契数的和
    let sum: u64 = Fibonacci::new().take(20).sum();
    println!("前 20 个的和: {}", sum);
}
```

**对比 JavaScript 的生成器：**

```javascript
// JS 用生成器实现类似功能
function* fibonacci() {
    let [current, next] = [0, 1];
    while (true) {
        yield current;
        [current, next] = [next, current + next];
    }
}

// 需要手动限制
const fibs = [];
const gen = fibonacci();
for (let i = 0; i < 10; i++) {
    fibs.push(gen.next().value);
}
```

Rust 的迭代器天然支持惰性和链式操作，不需要生成器语法。

### 12.7.2 范围迭代器

```rust
// 为自定义范围实现迭代器
struct Range {
    start: i32,
    end: i32,
    step: i32,
}

impl Range {
    fn new(start: i32, end: i32, step: i32) -> Self {
        Range { start, end, step }
    }
}

impl Iterator for Range {
    type Item = i32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.start < self.end {
            let current = self.start;
            self.start += self.step;
            Some(current)
        } else {
            None
        }
    }
}

fn main() {
    // 0, 2, 4, 6, 8
    let evens: Vec<i32> = Range::new(0, 10, 2).collect();
    println!("{:?}", evens);

    // 使用迭代器适配器
    let sum: i32 = Range::new(1, 101, 1)
        .filter(|x| x % 3 == 0 || x % 5 == 0)
        .sum();
    println!("1-100 中 3 或 5 的倍数之和: {}", sum);
}
```

### 12.7.3 为结构体实现 IntoIterator

```rust
struct TodoList {
    items: Vec<String>,
}

// 实现 IntoIterator 让 TodoList 可以用 for 循环遍历
impl IntoIterator for TodoList {
    type Item = String;
    type IntoIter = std::vec::IntoIter<String>;

    fn into_iter(self) -> Self::IntoIter {
        self.items.into_iter()
    }
}

// 也为引用实现
impl<'a> IntoIterator for &'a TodoList {
    type Item = &'a String;
    type IntoIter = std::slice::Iter<'a, String>;

    fn into_iter(self) -> Self::IntoIter {
        self.items.iter()
    }
}

fn main() {
    let todos = TodoList {
        items: vec![
            String::from("学 Rust"),
            String::from("写代码"),
            String::from("喝咖啡"),
        ],
    };

    // 借用遍历
    for item in &todos {
        println!("待办: {}", item);
    }

    // 消耗遍历
    for item in todos {
        println!("完成: {}", item);
    }
    // todos 不再可用
}
```

---

## 12.8 迭代器 vs for 循环性能

### 12.8.1 零成本抽象

Rust 的迭代器在编译后与手写的 for 循环性能完全相同：

```rust
// 方式 1：迭代器链
let sum: i32 = (1..=100).filter(|x| x % 2 == 0).sum();

// 方式 2：手写循环
let mut sum2 = 0;
for i in 1..=100 {
    if i % 2 == 0 {
        sum2 += i;
    }
}

// 两种方式编译后的机器码几乎完全一样！
assert_eq!(sum, sum2);
```

### 12.8.2 为什么能做到零成本？

1. **单态化**：泛型在编译时展开为具体类型
2. **内联**：小闭包会被内联到调用处
3. **无中间分配**：惰性求值不创建中间集合
4. **循环优化**：LLVM 对展开后的代码进行常规循环优化

### 12.8.3 一个实际的性能对比

```rust
use std::time::Instant;

fn main() {
    let data: Vec<f64> = (0..10_000_000).map(|i| i as f64).collect();

    // 迭代器方式
    let start = Instant::now();
    let sum1: f64 = data.iter()
        .filter(|&&x| x > 1000.0)
        .map(|x| x.sqrt())
        .sum();
    let iter_time = start.elapsed();

    // for 循环方式
    let start = Instant::now();
    let mut sum2 = 0.0_f64;
    for &x in &data {
        if x > 1000.0 {
            sum2 += x.sqrt();
        }
    }
    let loop_time = start.elapsed();

    println!("迭代器: {:?} (sum={})", iter_time, sum1);
    println!("for循环: {:?} (sum={})", loop_time, sum2);
    // 两者性能几乎相同！
}
```

---

## 12.9 实战示例

### 12.9.1 数据处理管道

```rust
#[derive(Debug)]
struct Employee {
    name: String,
    department: String,
    salary: f64,
}

fn main() {
    let employees = vec![
        Employee { name: "Alice".into(), department: "工程".into(), salary: 95000.0 },
        Employee { name: "Bob".into(), department: "工程".into(), salary: 88000.0 },
        Employee { name: "Charlie".into(), department: "设计".into(), salary: 75000.0 },
        Employee { name: "Diana".into(), department: "工程".into(), salary: 105000.0 },
        Employee { name: "Eve".into(), department: "设计".into(), salary: 82000.0 },
        Employee { name: "Frank".into(), department: "产品".into(), salary: 90000.0 },
    ];

    // 1. 工程部门的平均薪资
    let eng_count = employees.iter()
        .filter(|e| e.department == "工程")
        .count();
    let eng_total: f64 = employees.iter()
        .filter(|e| e.department == "工程")
        .map(|e| e.salary)
        .sum();
    println!("工程部门平均薪资: {:.0}", eng_total / eng_count as f64);

    // 2. 薪资最高的员工
    let highest = employees.iter()
        .max_by(|a, b| a.salary.partial_cmp(&b.salary).unwrap());
    println!("薪资最高: {:?}", highest.map(|e| &e.name));

    // 3. 按部门分组统计
    use std::collections::HashMap;
    let mut dept_stats: HashMap<&str, (usize, f64)> = HashMap::new();
    for emp in &employees {
        let entry = dept_stats.entry(&emp.department).or_insert((0, 0.0));
        entry.0 += 1;
        entry.1 += emp.salary;
    }
    for (dept, (count, total)) in &dept_stats {
        println!("{}: {} 人, 平均薪资 {:.0}", dept, count, total / *count as f64);
    }

    // 4. 薪资排名（用 enumerate）
    let mut sorted: Vec<&Employee> = employees.iter().collect();
    sorted.sort_by(|a, b| b.salary.partial_cmp(&a.salary).unwrap());
    for (rank, emp) in sorted.iter().enumerate() {
        println!("#{}: {} ({:.0})", rank + 1, emp.name, emp.salary);
    }
}
```

### 12.9.2 文本处理

```rust
fn word_frequency(text: &str) -> Vec<(String, usize)> {
    use std::collections::HashMap;

    let mut freq: HashMap<String, usize> = HashMap::new();

    // 分词、转小写、计数
    text.split_whitespace()
        .map(|word| word.to_lowercase())
        .map(|word| word.trim_matches(|c: char| !c.is_alphanumeric()).to_string())
        .filter(|word| !word.is_empty())
        .for_each(|word| {
            *freq.entry(word).or_insert(0) += 1;
        });

    // 按频率排序
    let mut result: Vec<(String, usize)> = freq.into_iter().collect();
    result.sort_by(|a, b| b.1.cmp(&a.1));
    result
}

fn main() {
    let text = "the quick brown fox jumps over the lazy dog the fox";

    let freq = word_frequency(text);
    for (word, count) in freq.iter().take(5) {
        println!("{}: {} 次", word, count);
    }
}
```

---

## 12.10 小结

### 闭包速查

| 特性 | Rust | JavaScript |
|---|---|---|
| 语法 | `\|x\| x + 1` | `(x) => x + 1` |
| 类型推断 | 是（但固定后不变） | 动态类型 |
| 捕获方式 | Fn / FnMut / FnOnce | 全部引用 |
| move | `move \|\| { ... }` | 不需要 |
| 作为参数 | `impl Fn(i32) -> i32` | 直接传 |
| 作为返回值 | `impl Fn() / Box<dyn Fn()>` | 直接返回 |

### 迭代器速查

| 操作类型 | 方法 | 是否惰性 |
|---|---|---|
| 适配器 | map, filter, take, skip, zip, chain, enumerate, flat_map | 是 |
| 消费者 | collect, sum, count, any, all, find, fold, for_each, max, min | 否 |

### 核心要点

1. **闭包**是可以捕获环境的匿名函数，通过 Fn/FnMut/FnOnce 区分
2. **move** 强制闭包获取所有权，线程场景常用
3. **迭代器**是惰性的，只有消费者方法才触发计算
4. 迭代器链式调用是**零成本抽象**
5. 自定义类型只需实现 `Iterator` 的 `next` 方法即可获得所有适配器

---

## 12.11 练习题

### 练习 1：闭包计数器

实现一个函数 `make_counter`，返回一个闭包，每次调用返回递增的数字：

```rust
fn make_counter(start: i32) -> impl FnMut() -> i32 {
    todo!()
}

fn main() {
    let mut counter = make_counter(1);
    assert_eq!(counter(), 1);
    assert_eq!(counter(), 2);
    assert_eq!(counter(), 3);
}
```

### 练习 2：自定义迭代器

实现一个 `Collatz` 迭代器，给定一个正整数 n：
- 如果 n 是偶数，下一个数是 n/2
- 如果 n 是奇数，下一个数是 3n+1
- 当 n 变为 1 时停止

```rust
struct Collatz {
    current: u64,
    finished: bool,
}

impl Collatz {
    fn new(n: u64) -> Self {
        todo!()
    }
}

impl Iterator for Collatz {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        todo!()
    }
}

fn main() {
    let seq: Vec<u64> = Collatz::new(6).collect();
    println!("{:?}", seq); // [6, 3, 10, 5, 16, 8, 4, 2, 1]
}
```

### 练习 3：迭代器链

给定一个字符串列表，用迭代器链实现以下操作：
1. 过滤掉长度小于 3 的字符串
2. 将每个字符串转为大写
3. 在每个字符串前加上序号 "1. XXX"
4. 收集成 Vec<String>

### 练习 4：矩阵迭代器

为一个二维矩阵实现行迭代器和列迭代器：

```rust
struct Matrix {
    data: Vec<Vec<f64>>,
    rows: usize,
    cols: usize,
}

impl Matrix {
    fn row_iter(&self) -> impl Iterator<Item = &Vec<f64>> {
        todo!()
    }

    fn col_iter(&self) -> impl Iterator<Item = Vec<f64>> + '_ {
        todo!()
    }
}
```

### 练习 5：管道处理器

实现一个通用的数据处理管道：

```rust
struct Pipeline<T> {
    data: Vec<T>,
}

impl<T> Pipeline<T> {
    fn new(data: Vec<T>) -> Self {
        Pipeline { data }
    }

    fn pipe<U>(self, f: impl Fn(Vec<T>) -> Vec<U>) -> Pipeline<U> {
        Pipeline { data: f(self.data) }
    }

    fn result(self) -> Vec<T> {
        self.data
    }
}

fn main() {
    let result = Pipeline::new(vec![1, 2, 3, 4, 5])
        .pipe(|v| v.into_iter().filter(|&x| x > 2).collect())
        .pipe(|v| v.into_iter().map(|x| x * 10).collect())
        .result();

    println!("{:?}", result); // [30, 40, 50]
}
```

---

> **下一章预告：** 第十三章我们将学习 Rust 的**模块系统**——如何组织代码、管理依赖、发布你自己的 crate。对比 Node.js 的 npm 生态，你会发现很多熟悉的概念！
