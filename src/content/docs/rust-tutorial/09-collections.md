# 第九章：集合类型 —— Vec、String、HashMap 与更多

> **本章目标**
>
> - 深入掌握 `Vec&lt;T&gt;` 的使用，理解它与 JS Array 的异同
> - 彻底理解 Rust 的 `String` 和 `&str`，以及 UTF-8 的复杂性
> - 熟练使用 `HashMap&lt;K, V&gt;`，对比 JS 的 Object 和 Map
> - 了解 `HashSet`、`VecDeque`、`BTreeMap` 等其他集合
> - 初步认识迭代器（Iterator）的强大能力
> - 能够根据场景选择合适的集合类型

> **预计学习时间：100 - 130 分钟**

---

## 9.1 集合类型概览

在 JavaScript 中，你最常用的集合大概就是 `Array` 和 `Object`（或 `Map`）。Rust 的标准库提供了更丰富的集合类型：

| Rust 集合 | JS 近似 | 特点 |
|---|---|---|
| `Vec&lt;T&gt;` | `Array` | 可变长数组，连续内存 |
| `String` | `string` | UTF-8 编码的可变字符串 |
| `HashMap&lt;K, V&gt;` | `Map` / `Object` | 哈希表键值对 |
| `HashSet&lt;T&gt;` | `Set` | 哈希集合（无重复） |
| `VecDeque&lt;T&gt;` | 无直接对应 | 双端队列 |
| `BTreeMap&lt;K, V&gt;` | 无直接对应 | 有序键值对（B 树） |
| `BTreeSet&lt;T&gt;` | 无直接对应 | 有序集合 |
| `LinkedList&lt;T&gt;` | 无直接对应 | 双向链表（很少用） |
| `BinaryHeap&lt;T&gt;` | 无直接对应 | 二叉堆（优先队列） |

所有集合类型都存储在**堆**（heap）上，并在超出作用域时自动释放。

---

## 9.2 Vec&lt;T&gt; —— 动态数组

`Vec&lt;T&gt;` 是 Rust 中最常用的集合，相当于 JavaScript 的 `Array`。

### 9.2.1 创建 Vec

```rust
fn main() {
    // 方式一：Vec::new()
    let mut numbers: Vec<i32> = Vec::new();
    numbers.push(1);
    numbers.push(2);
    numbers.push(3);
    println!("numbers: {:?}", numbers);  // [1, 2, 3]

    // 方式二：vec! 宏（最常用）
    let fruits = vec!["苹果", "香蕉", "橙子"];
    println!("fruits: {:?}", fruits);  // ["苹果", "香蕉", "橙子"]

    // 方式三：指定初始值和长度
    let zeros = vec![0; 10];  // 10 个 0
    println!("zeros: {:?}", zeros);  // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    // 方式四：从迭代器收集
    let squares: Vec<i32> = (0..5).map(|x| x * x).collect();
    println!("squares: {:?}", squares);  // [0, 1, 4, 9, 16]

    // 方式五：预分配容量（性能优化）
    let mut large_vec: Vec<String> = Vec::with_capacity(1000);
    println!("长度: {}, 容量: {}", large_vec.len(), large_vec.capacity());
    // 长度: 0, 容量: 1000
}
```

> 💡 **对比 JS**：
> ```javascript
> // JavaScript
> const arr = [];           // Vec::new()
> const arr = [1, 2, 3];   // vec![1, 2, 3]
> const arr = new Array(10).fill(0);  // vec![0; 10]
> ```
> 区别：Rust 的 `Vec` 是**强类型**的，所有元素必须是同一类型。JS 的 Array 可以混合类型 `[1, "hello", true]`，Rust 不行。

### 9.2.2 访问元素

```rust
fn main() {
    let colors = vec!["红", "绿", "蓝", "黄", "紫"];

    // 方式一：索引访问（越界会 panic）
    let first = colors[0];
    println!("第一个: {}", first);  // 红

    // ⚠️ 越界 panic！
    // let oob = colors[99];  // panic: index out of bounds

    // 方式二：get() 方法（返回 Option，安全！）
    match colors.get(2) {
        Some(color) => println!("第三个: {}", color),  // 蓝
        None => println!("索引超出范围"),
    }

    match colors.get(99) {
        Some(color) => println!("找到了: {}", color),
        None => println!("索引 99 超出范围"),  // 这个会执行
    }

    // 方式三：first() 和 last()
    println!("第一个: {:?}", colors.first());  // Some("红")
    println!("最后一个: {:?}", colors.last());  // Some("紫")

    let empty: Vec<i32> = vec![];
    println!("空 vec 的第一个: {:?}", empty.first());  // None
}
```

> 💡 **经验法则**：如果你**确定**索引在范围内（比如刚检查过 `len()`），用 `[]`。如果索引来自外部输入，用 `get()`。

### 9.2.3 修改 Vec

```rust
fn main() {
    let mut nums = vec![1, 2, 3];

    // 末尾添加
    nums.push(4);
    println!("push 后: {:?}", nums);  // [1, 2, 3, 4]

    // 末尾弹出（返回 Option）
    let last = nums.pop();
    println!("pop: {:?}, 剩余: {:?}", last, nums);  // Some(4), [1, 2, 3]

    // 指定位置插入
    nums.insert(1, 10);  // 在索引 1 插入 10
    println!("insert 后: {:?}", nums);  // [1, 10, 2, 3]

    // 指定位置删除
    let removed = nums.remove(1);  // 删除索引 1 的元素
    println!("remove: {}, 剩余: {:?}", removed, nums);  // 10, [1, 2, 3]

    // 保留满足条件的元素
    let mut numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    numbers.retain(|&x| x % 2 == 0);  // 只保留偶数
    println!("retain 后: {:?}", numbers);  // [2, 4, 6, 8, 10]

    // 去重（需要先排序）
    let mut with_dups = vec![3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
    with_dups.sort();
    with_dups.dedup();
    println!("去重后: {:?}", with_dups);  // [1, 2, 3, 4, 5, 6, 9]

    // 截断
    let mut v = vec![1, 2, 3, 4, 5];
    v.truncate(3);  // 保留前3个
    println!("truncate 后: {:?}", v);  // [1, 2, 3]

    // 清空
    v.clear();
    println!("clear 后: {:?}, 长度: {}", v, v.len());  // [], 0

    // 扩展（append 另一个 Vec）
    let mut a = vec![1, 2, 3];
    let mut b = vec![4, 5, 6];
    a.append(&mut b);
    println!("append 后 a: {:?}", a);  // [1, 2, 3, 4, 5, 6]
    println!("append 后 b: {:?}", b);  // []（b 被清空了！）

    // extend（从迭代器扩展）
    let mut c = vec![1, 2];
    c.extend([3, 4, 5]);
    c.extend(6..=8);
    println!("extend 后: {:?}", c);  // [1, 2, 3, 4, 5, 6, 7, 8]
}
```

> 💡 **对比 JS Array 方法**：
>
> | 操作 | Rust | JavaScript |
> |---|---|---|
> | 添加到末尾 | `push(x)` | `push(x)` |
> | 从末尾弹出 | `pop()` → `Option&lt;T&gt;` | `pop()` → `T \| undefined` |
> | 添加到开头 | `insert(0, x)` (慢) | `unshift(x)` |
> | 从开头弹出 | `remove(0)` (慢) | `shift()` |
> | 拼接 | `extend(iter)` | `concat()` / `...spread` |
> | 查找 | `iter().find()` | `find()` |
> | 过滤 | `iter().filter()` | `filter()` |
> | 映射 | `iter().map()` | `map()` |
> | 排序 | `sort()` / `sort_by()` | `sort()` |

### 9.2.4 遍历 Vec

```rust
fn main() {
    let fruits = vec![
        String::from("苹果"),
        String::from("香蕉"),
        String::from("橙子"),
    ];

    // 方式一：不可变引用遍历（最常用）
    for fruit in &fruits {
        println!("水果: {}", fruit);
    }
    // fruits 仍然可用
    println!("还有 {} 种水果", fruits.len());

    // 方式二：可变引用遍历
    let mut prices = vec![10.0, 20.0, 30.0];
    for price in &mut prices {
        *price *= 1.1;  // 涨价 10%
    }
    println!("涨价后: {:?}", prices);  // [11.0, 22.0, 33.0]

    // 方式三：消费遍历（获取所有权）
    let names = vec![String::from("Alice"), String::from("Bob")];
    for name in names {
        // name 是 String，不是 &String
        println!("你好, {}!", name);
    }
    // ❌ names 已经被消费了，不能再使用
    // println!("{:?}", names);  // 编译错误！

    // 方式四：带索引遍历
    let colors = vec!["红", "绿", "蓝"];
    for (index, color) in colors.iter().enumerate() {
        println!("颜色 {}: {}", index, color);
    }

    // 方式五：windows 和 chunks
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8];

    // 滑动窗口
    for window in numbers.windows(3) {
        println!("窗口: {:?}", window);
    }
    // [1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6], [5, 6, 7], [6, 7, 8]

    // 分块
    for chunk in numbers.chunks(3) {
        println!("分块: {:?}", chunk);
    }
    // [1, 2, 3], [4, 5, 6], [7, 8]
}
```

### 9.2.5 切片（Slice）

切片是对 Vec（或数组）的部分引用，非常重要：

```rust
fn main() {
    let numbers = vec![10, 20, 30, 40, 50, 60];

    // 切片语法
    let slice = &numbers[1..4];  // 索引 1, 2, 3
    println!("切片: {:?}", slice);  // [20, 30, 40]

    let from_start = &numbers[..3];  // 索引 0, 1, 2
    println!("从头: {:?}", from_start);  // [10, 20, 30]

    let to_end = &numbers[3..];  // 索引 3, 4, 5
    println!("到尾: {:?}", to_end);  // [40, 50, 60]

    let all = &numbers[..];  // 整个 Vec
    println!("全部: {:?}", all);

    // 函数参数用切片类型更灵活
    fn sum(slice: &[i32]) -> i32 {
        slice.iter().sum()
    }

    let vec = vec![1, 2, 3, 4, 5];
    let array = [10, 20, 30];

    // Vec 和数组都可以传给接受切片的函数
    println!("Vec 的和: {}", sum(&vec));
    println!("数组的和: {}", sum(&array));
    println!("部分和: {}", sum(&vec[1..4]));
}
```

### 9.2.6 排序与搜索

```rust
fn main() {
    // ===== 排序 =====
    let mut nums = vec![5, 3, 8, 1, 9, 2, 7];

    // 默认升序排序
    nums.sort();
    println!("升序: {:?}", nums);  // [1, 2, 3, 5, 7, 8, 9]

    // 自定义排序
    nums.sort_by(|a, b| b.cmp(a));  // 降序
    println!("降序: {:?}", nums);  // [9, 8, 7, 5, 3, 2, 1]

    // 按某个属性排序
    let mut people = vec![
        ("Alice", 30),
        ("Charlie", 25),
        ("Bob", 35),
    ];
    people.sort_by_key(|&(_, age)| age);
    println!("按年龄排序: {:?}", people);

    // 浮点数排序（f64 没有实现 Ord，需要特殊处理）
    let mut floats = vec![3.14, 1.0, 2.71, 0.5];
    floats.sort_by(|a, b| a.partial_cmp(b).unwrap());
    println!("浮点排序: {:?}", floats);

    // 稳定排序 vs 不稳定排序
    // sort() 是稳定排序（相等元素保持原序）
    // sort_unstable() 可能更快但不保持原序

    // ===== 搜索 =====
    let sorted = vec![1, 3, 5, 7, 9, 11, 13];

    // 二分查找（需要已排序）
    match sorted.binary_search(&7) {
        Ok(index) => println!("找到 7 在索引 {}", index),  // 3
        Err(index) => println!("未找到，应插入索引 {}", index),
    }

    match sorted.binary_search(&6) {
        Ok(index) => println!("找到 6 在索引 {}", index),
        Err(index) => println!("未找到 6，应插入索引 {}", index),  // 3
    }

    // contains
    println!("包含 5: {}", sorted.contains(&5));  // true
    println!("包含 6: {}", sorted.contains(&6));  // false

    // 查找位置
    let fruits = vec!["苹果", "香蕉", "橙子", "香蕉"];
    println!("香蕉的位置: {:?}", fruits.iter().position(|&f| f == "香蕉"));
    // Some(1)
    println!("最后的香蕉: {:?}", fruits.iter().rposition(|&f| f == "香蕉"));
    // Some(3)
}
```

### 9.2.7 Vec 的内存模型

理解 Vec 的内存布局有助于写出高性能代码：

```rust
fn main() {
    let mut v = Vec::with_capacity(4);
    println!("初始 - 长度: {}, 容量: {}", v.len(), v.capacity());
    // 长度: 0, 容量: 4

    v.push(1);
    v.push(2);
    v.push(3);
    v.push(4);
    println!("4个元素 - 长度: {}, 容量: {}", v.len(), v.capacity());
    // 长度: 4, 容量: 4

    v.push(5);  // 超出容量！Vec 会自动扩容（通常是当前容量的2倍）
    println!("5个元素 - 长度: {}, 容量: {}", v.len(), v.capacity());
    // 长度: 5, 容量: 8

    // 收缩容量
    v.shrink_to_fit();
    println!("收缩后 - 长度: {}, 容量: {}", v.len(), v.capacity());
    // 长度: 5, 容量: 5
}

// Vec 在栈上的结构：
// ┌──────────┬──────────┬──────────┐
// │ 指针 ptr │ 长度 len │ 容量 cap │  ← 栈上（24 字节）
// └────┬─────┴──────────┴──────────┘
//      │
//      ▼
// ┌────┬────┬────┬────┬────┐
// │ 1  │ 2  │ 3  │ 4  │ 5  │  ← 堆上
// └────┴────┴────┴────┴────┘
```

---

## 9.3 String 与 &str —— UTF-8 的复杂性

如果有一个话题最让从其他语言转来的程序员感到困惑，那一定是 Rust 的字符串。让我们彻底搞清楚它。

### 9.3.1 两种字符串类型

```rust
fn main() {
    // &str: 字符串切片（不可变引用）
    // - 通常是字面量或对 String 的引用
    // - 存储在栈上（指针 + 长度）
    // - 类似 JS 的 string（不可变）
    let greeting: &str = "你好世界";

    // String: 拥有所有权的字符串
    // - 存储在堆上，可以增长
    // - 类似 JS 的... 嗯，也是 string，但 Rust 区分了
    let mut name: String = String::from("Alice");
    name.push_str(" Wang");
    println!("{}", name);  // Alice Wang

    // 两者的关系：
    // String -> &str：很容易（解引用强制转换）
    let s: String = String::from("hello");
    let slice: &str = &s;  // 或 &s[..]
    print_str(slice);
    print_str(&s);  // String 会自动转为 &str

    // &str -> String：需要显式转换
    let s1: String = "hello".to_string();
    let s2: String = String::from("hello");
    let s3: String = "hello".to_owned();
    // 三种写法效果一样
}

fn print_str(s: &str) {
    println!("{}", s);
}
```

> 💡 **经验法则**：
> - 函数参数用 `&str`（更灵活，String 和 &str 都能传入）
> - 需要拥有所有权时用 `String`（比如存入结构体）
> - 字面量是 `&str`

### 9.3.2 创建和转换 String

```rust
fn main() {
    // 创建 String 的各种方式
    let s1 = String::new();                    // 空字符串
    let s2 = String::from("你好");              // 从字面量创建
    let s3 = "你好".to_string();               // to_string()
    let s4 = "你好".to_owned();                // to_owned()
    let s5 = format!("{} {}", "你好", "世界");  // format! 宏
    let s6: String = ['你', '好'].iter().collect();  // 从字符迭代器收集
    let s7 = "hello".repeat(3);                // "hellohellohello"

    // 数字转字符串
    let num_str = 42.to_string();
    let float_str = format!("{:.2}", 3.14159);  // "3.14"

    // 字符串转数字
    let num: i32 = "42".parse().unwrap();
    let float: f64 = "3.14".parse().unwrap();

    println!("s5: {}", s5);
    println!("num: {}, float: {}", num, float);
}
```

### 9.3.3 修改 String

```rust
fn main() {
    let mut s = String::from("Hello");

    // 追加字符串
    s.push_str(", World");
    println!("{}", s);  // Hello, World

    // 追加单个字符
    s.push('!');
    println!("{}", s);  // Hello, World!

    // 插入
    s.insert(5, ',');        // 在索引 5 插入字符
    s.insert_str(6, " Rust"); // 在索引 6 插入字符串
    println!("{}", s);  // Hello, Rust, World!

    // 替换
    let new_s = s.replace("World", "Rustacean");
    println!("{}", new_s);  // Hello, Rust, Rustacean!

    // replacen: 只替换前 n 个
    let text = "aaa".replacen("a", "b", 2);
    println!("{}", text);  // bba

    // 删除
    let mut mutable = String::from("Hello!");
    mutable.pop();  // 删除最后一个字符，返回 Option<char>
    println!("{}", mutable);  // Hello

    // 截断
    let mut long = String::from("Hello, World!");
    long.truncate(5);
    println!("{}", long);  // Hello

    // 清空
    long.clear();
    println!("清空后长度: {}", long.len());  // 0

    // 拼接
    let hello = String::from("Hello");
    let world = String::from(" World");

    // 方式一：+ 运算符（消费左操作数！）
    let combined = hello + &world;
    // ❌ hello 已经被移动了，不能再使用
    // println!("{}", hello);  // 编译错误！
    println!("{}", combined);  // Hello World

    // 方式二：format!（不消费任何操作数）
    let a = String::from("Hello");
    let b = String::from(" World");
    let c = format!("{}{}", a, b);
    // ✅ a 和 b 都还可以使用
    println!("{}, {}, {}", a, b, c);
}
```

### 9.3.4 UTF-8 的复杂性 ⚠️

**这是最容易让人困惑的部分。** Rust 的字符串是 UTF-8 编码的，这意味着：

```rust
fn main() {
    let hello = "你好世界";

    // 长度 ≠ 字符数！
    println!("字节长度: {}", hello.len());        // 12（每个中文字符 3 字节）
    println!("字符数: {}", hello.chars().count()); // 4

    // ❌ 不能用索引直接访问！
    // let ch = hello[0];  // 编译错误！
    // 因为索引 0 是一个字节，不是一个完整的字符

    // ✅ 正确方式：用 chars() 迭代
    for ch in hello.chars() {
        println!("字符: {}", ch);
    }
    // 字符: 你
    // 字符: 好
    // 字符: 世
    // 字符: 界

    // 也可以用 bytes() 迭代字节
    for byte in hello.bytes() {
        print!("{:02x} ", byte);
    }
    println!();  // e4 bd a0 e5 a5 bd e4 b8 96 e7 95 8c

    // 字符串切片（按字节索引！）
    let slice = &hello[0..3];  // 获取前3个字节 = "你"
    println!("切片: {}", slice);

    // ⚠️ 危险！如果切在字符中间会 panic！
    // let bad = &hello[0..2];  // panic: byte index 2 is not a char boundary

    // 安全的方式：用 char_indices()
    for (i, ch) in hello.char_indices() {
        println!("索引 {}: '{}'", i, ch);
    }
    // 索引 0: '你'
    // 索引 3: '好'
    // 索引 6: '世'
    // 索引 9: '界'

    // emoji 更复杂！
    let emoji = "👨‍👩‍👧‍👦";
    println!("emoji 字节数: {}", emoji.len());        // 25
    println!("emoji 字符数: {}", emoji.chars().count()); // 7（包含零宽连接符）

    // 视觉上是一个 emoji，但底层有多个 Unicode 标量值
    for ch in emoji.chars() {
        print!("U+{:04X} ", ch as u32);
    }
    println!();
    // U+1F468 U+200D U+1F469 U+200D U+1F467 U+200D U+1F466
}
```

> 💡 **对比 JS**：
> ```javascript
> // JavaScript 也有类似问题
> "你好".length;        // 2（JS 用 UTF-16，中文占1个代码单元）
> "👨‍👩‍👧‍👦".length; // 11（JS 也被 emoji 搞晕了）
> [..."👨‍👩‍👧‍👦"].length; // 7（展开后是 7 个代码点）
> ```
> 但 JS 隐藏了这些复杂性，让你以为一切正常，直到出 bug。Rust 从一开始就强迫你面对现实。

### 9.3.5 实用字符串操作

```rust
fn main() {
    let s = "  Hello, World!  ";

    // 去除空白
    println!("trim: '{}'", s.trim());        // 'Hello, World!'
    println!("trim_start: '{}'", s.trim_start()); // 'Hello, World!  '
    println!("trim_end: '{}'", s.trim_end());     // '  Hello, World!'

    // 大小写
    let lower = "HELLO".to_lowercase();
    let upper = "hello".to_uppercase();
    println!("{}, {}", lower, upper);

    // 分割
    let csv = "apple,banana,orange";
    let fruits: Vec<&str> = csv.split(',').collect();
    println!("水果: {:?}", fruits);  // ["apple", "banana", "orange"]

    // 按空白分割（处理多个空格）
    let words: Vec<&str> = "hello   world  rust".split_whitespace().collect();
    println!("单词: {:?}", words);  // ["hello", "world", "rust"]

    // 按行分割
    let text = "第一行\n第二行\n第三行";
    for line in text.lines() {
        println!("行: {}", line);
    }

    // 包含检查
    let sentence = "Rust is awesome!";
    println!("包含 'awesome': {}", sentence.contains("awesome"));  // true
    println!("以 'Rust' 开头: {}", sentence.starts_with("Rust"));  // true
    println!("以 '!' 结尾: {}", sentence.ends_with("!"));          // true

    // 查找
    println!("'is' 的位置: {:?}", sentence.find("is"));  // Some(5)
    println!("最后的 's': {:?}", sentence.rfind('s'));     // Some(10)

    // 连接
    let parts = vec!["Hello", "World", "Rust"];
    let joined = parts.join(", ");
    println!("连接: {}", joined);  // Hello, World, Rust

    // 重复
    let repeated = "ha".repeat(3);
    println!("重复: {}", repeated);  // hahaha

    // 填充
    let padded = format!("{:>10}", "hello");   // 右对齐，宽度10
    let padded2 = format!("{:<10}", "hello");  // 左对齐
    let padded3 = format!("{:^10}", "hello");  // 居中
    let padded4 = format!("{:0>5}", 42);       // 用0填充: "00042"
    println!("'{}'", padded);   // '     hello'
    println!("'{}'", padded2);  // 'hello     '
    println!("'{}'", padded3);  // '  hello   '
    println!("'{}'", padded4);  // '00042'
}
```

### 9.3.6 String vs &str 的选择

```rust
// 函数参数：优先使用 &str
fn greet(name: &str) {
    println!("你好, {}!", name);
}

// 结构体字段：如果拥有数据，用 String
struct User {
    name: String,     // 拥有所有权
    email: String,
}

// 如果只是临时引用，可以用 &str（需要生命周期标注）
struct Config<'a> {
    host: &'a str,
    port: u16,
}

fn main() {
    // 传 &str
    greet("Alice");

    // 传 String（自动转为 &str）
    let name = String::from("Bob");
    greet(&name);

    // 创建 User（需要 String）
    let user = User {
        name: "Charlie".to_string(),
        email: String::from("charlie@example.com"),
    };

    // Config 可以引用字面量
    let config = Config {
        host: "localhost",
        port: 8080,
    };
}
```

---

## 9.4 HashMap&lt;K, V&gt; —— 键值对集合

`HashMap` 是 Rust 的哈希表，类似于 JavaScript 的 `Map`（或 `Object`）。

### 9.4.1 创建 HashMap

```rust
use std::collections::HashMap;  // 需要导入！

fn main() {
    // 方式一：new()
    let mut scores: HashMap<String, i32> = HashMap::new();
    scores.insert(String::from("Alice"), 95);
    scores.insert(String::from("Bob"), 87);
    scores.insert(String::from("Charlie"), 92);

    // 方式二：from 数组
    let scores2: HashMap<&str, i32> = HashMap::from([
        ("Alice", 95),
        ("Bob", 87),
        ("Charlie", 92),
    ]);

    // 方式三：从迭代器收集
    let keys = vec!["Alice", "Bob", "Charlie"];
    let values = vec![95, 87, 92];
    let scores3: HashMap<&str, i32> = keys.into_iter().zip(values).collect();

    // 预分配容量
    let mut big_map: HashMap<String, Vec<i32>> = HashMap::with_capacity(100);

    println!("{:?}", scores);
    println!("{:?}", scores2);
    println!("{:?}", scores3);
}
```

> 💡 **对比 JS**：
> ```javascript
> // JavaScript Object
> const scores = { Alice: 95, Bob: 87, Charlie: 92 };
>
> // JavaScript Map（更接近 HashMap）
> const scores = new Map([
>     ["Alice", 95],
>     ["Bob", 87],
>     ["Charlie", 92],
> ]);
> ```
> 区别：
> - Rust 的 `HashMap` 需要导入（`use std::collections::HashMap`）
> - 键和值都是强类型的
> - 键需要实现 `Hash` 和 `Eq` trait（大多数基础类型都实现了）

### 9.4.2 访问和修改

```rust
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("苹果", 3.5);
    map.insert("香蕉", 2.0);
    map.insert("橙子", 4.0);

    // 访问值
    // 方式一：get() 返回 Option<&V>（安全）
    match map.get("苹果") {
        Some(price) => println!("苹果: ¥{}", price),
        None => println!("没有苹果"),
    }

    // 方式二：索引访问（键不存在会 panic！）
    let price = map["香蕉"];
    println!("香蕉: ¥{}", price);
    // map["西瓜"];  // ⚠️ panic!

    // 检查键是否存在
    println!("有苹果: {}", map.contains_key("苹果"));  // true
    println!("有西瓜: {}", map.contains_key("西瓜"));  // false

    // 插入/更新
    map.insert("苹果", 4.0);  // 更新已有的键
    map.insert("西瓜", 8.0);  // 插入新键
    println!("{:?}", map);

    // entry API —— 这是 HashMap 最强大的功能！

    // 不存在时才插入
    map.entry("葡萄").or_insert(6.0);
    map.entry("苹果").or_insert(999.0);  // 苹果已存在，不会更新
    println!("苹果价格: {}", map["苹果"]);  // 4.0（没变）
    println!("葡萄价格: {}", map["葡萄"]);  // 6.0（新插入）

    // 根据旧值更新
    let apple_price = map.entry("苹果").or_insert(0.0);
    *apple_price += 1.0;  // 涨价 1 元
    println!("苹果新价格: {}", map["苹果"]);  // 5.0

    // 删除
    let removed = map.remove("香蕉");
    println!("删除: {:?}", removed);  // Some(2.0)
    println!("删除后: {:?}", map);

    // 长度
    println!("键值对数量: {}", map.len());
    println!("是否为空: {}", map.is_empty());
}
```

### 9.4.3 entry API 的高级用法

`entry` API 是 HashMap 的杀手锏，在 JavaScript 中没有直接对应的功能：

```rust
use std::collections::HashMap;

fn main() {
    // 经典用例：词频统计
    let text = "hello world hello rust world rust rust";

    let mut word_count: HashMap<&str, u32> = HashMap::new();
    for word in text.split_whitespace() {
        let count = word_count.entry(word).or_insert(0);
        *count += 1;
    }
    println!("词频: {:?}", word_count);
    // {"hello": 2, "world": 2, "rust": 3}

    // 对比 JavaScript 的实现：
    // const wordCount = {};
    // for (const word of text.split(' ')) {
    //     wordCount[word] = (wordCount[word] || 0) + 1;
    // }

    // 分组
    let students = vec![
        ("Alice", "数学"),
        ("Bob", "英语"),
        ("Charlie", "数学"),
        ("Diana", "英语"),
        ("Eve", "数学"),
    ];

    let mut groups: HashMap<&str, Vec<&str>> = HashMap::new();
    for (name, subject) in &students {
        groups.entry(subject).or_insert_with(Vec::new).push(name);
    }
    println!("分组: {:?}", groups);
    // {"数学": ["Alice", "Charlie", "Eve"], "英语": ["Bob", "Diana"]}

    // or_insert_with 接受一个闭包，只在需要时才创建默认值
    // 比 or_insert(Vec::new()) 好，因为避免了不必要的 Vec 创建

    // entry 的完整 API
    let mut map: HashMap<&str, i32> = HashMap::new();

    // or_insert: 不存在时用给定值
    map.entry("a").or_insert(1);

    // or_insert_with: 不存在时用闭包的返回值
    map.entry("b").or_insert_with(|| {
        println!("计算默认值...");
        42
    });

    // or_default: 不存在时用 Default::default()
    map.entry("c").or_default();  // i32 的默认值是 0

    // and_modify: 存在时修改
    map.entry("a").and_modify(|v| *v += 10).or_insert(0);
    println!("map: {:?}", map);  // {"a": 11, "b": 42, "c": 0}
}
```

### 9.4.4 遍历 HashMap

```rust
use std::collections::HashMap;

fn main() {
    let scores: HashMap<&str, i32> = HashMap::from([
        ("Alice", 95),
        ("Bob", 87),
        ("Charlie", 92),
    ]);

    // 遍历键值对
    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
    // ⚠️ 注意：HashMap 的遍历顺序是不确定的！

    // 只遍历键
    let names: Vec<&&str> = scores.keys().collect();
    println!("所有人: {:?}", names);

    // 只遍历值
    let all_scores: Vec<&i32> = scores.values().collect();
    println!("所有分数: {:?}", all_scores);

    // 可变遍历
    let mut prices: HashMap<&str, f64> = HashMap::from([
        ("苹果", 3.5),
        ("香蕉", 2.0),
    ]);

    for (_, price) in &mut prices {
        *price *= 1.1;  // 所有价格涨 10%
    }
    println!("涨价后: {:?}", prices);

    // 过滤
    let expensive: HashMap<&&str, &f64> = prices
        .iter()
        .filter(|(_, &price)| price > 3.0)
        .collect();
    println!("贵的: {:?}", expensive);
}
```

### 9.4.5 所有权与 HashMap

```rust
use std::collections::HashMap;

fn main() {
    // 对于实现了 Copy 的类型（如 i32），值会被复制
    let field_name = String::from("color");
    let field_value = String::from("blue");

    let mut map = HashMap::new();
    map.insert(field_name, field_value);

    // ❌ field_name 和 field_value 已经被移动到 map 中
    // println!("{}: {}", field_name, field_value);  // 编译错误！

    // 如果用引用作为值，被引用的数据必须至少活得和 HashMap 一样长
    let name = String::from("Alice");
    let mut ref_map: HashMap<&str, &str> = HashMap::new();
    ref_map.insert(&name, "Engineer");
    // name 必须在 ref_map 之后才能被释放
    println!("{:?}", ref_map);
}
```

---

## 9.5 HashSet&lt;T&gt; —— 无重复元素的集合

`HashSet` 相当于 JavaScript 的 `Set`。底层实际上是 `HashMap&lt;T, ()&gt;`。

```rust
use std::collections::HashSet;

fn main() {
    // 创建
    let mut fruits: HashSet<&str> = HashSet::new();
    fruits.insert("苹果");
    fruits.insert("香蕉");
    fruits.insert("橙子");
    fruits.insert("苹果");  // 重复！不会被添加
    println!("水果: {:?}", fruits);  // {"苹果", "香蕉", "橙子"}
    println!("数量: {}", fruits.len());  // 3

    // 从 Vec 创建（自动去重）
    let numbers: HashSet<i32> = vec![1, 2, 3, 2, 1, 4, 3, 5].into_iter().collect();
    println!("去重: {:?}", numbers);  // {1, 2, 3, 4, 5}（顺序不保证）

    // 检查
    println!("有苹果: {}", fruits.contains("苹果"));  // true
    println!("有西瓜: {}", fruits.contains("西瓜"));  // false

    // 删除
    fruits.remove("香蕉");
    println!("删除后: {:?}", fruits);

    // ===== 集合运算 =====
    let a: HashSet<i32> = [1, 2, 3, 4, 5].iter().copied().collect();
    let b: HashSet<i32> = [3, 4, 5, 6, 7].iter().copied().collect();

    // 交集
    let intersection: HashSet<&i32> = a.intersection(&b).collect();
    println!("交集: {:?}", intersection);  // {3, 4, 5}

    // 并集
    let union: HashSet<&i32> = a.union(&b).collect();
    println!("并集: {:?}", union);  // {1, 2, 3, 4, 5, 6, 7}

    // 差集（a 有 b 没有的）
    let difference: HashSet<&i32> = a.difference(&b).collect();
    println!("差集 a-b: {:?}", difference);  // {1, 2}

    // 对称差（只在一个集合中出现的）
    let symmetric: HashSet<&i32> = a.symmetric_difference(&b).collect();
    println!("对称差: {:?}", symmetric);  // {1, 2, 6, 7}

    // 子集/超集检查
    let small: HashSet<i32> = [1, 2].iter().copied().collect();
    let large: HashSet<i32> = [1, 2, 3, 4].iter().copied().collect();
    println!("small 是 large 的子集: {}", small.is_subset(&large));   // true
    println!("large 是 small 的超集: {}", large.is_superset(&small)); // true
    println!("不相交: {}", a.is_disjoint(&HashSet::from([10, 20])));  // true
}
```

> 💡 **对比 JS Set**：
> ```javascript
> const a = new Set([1, 2, 3, 4, 5]);
> const b = new Set([3, 4, 5, 6, 7]);
> // JS 没有内置的交集/并集方法（需要手动实现或用库）
> // Rust 直接提供！
> ```
> ES2025 引入了 `Set.prototype.intersection()` 等方法，但 Rust 很早就有了。

---

## 9.6 VecDeque —— 双端队列

`VecDeque` 是高效的双端队列，两端的插入和删除都是 O(1)。当你需要在前端频繁插入/删除时，它比 `Vec` 快得多。

```rust
use std::collections::VecDeque;

fn main() {
    let mut deque: VecDeque<i32> = VecDeque::new();

    // 后端操作（和 Vec 一样）
    deque.push_back(1);
    deque.push_back(2);
    deque.push_back(3);
    println!("deque: {:?}", deque);  // [1, 2, 3]

    // 前端操作（Vec 的 insert(0) 是 O(n)，VecDeque 是 O(1)）
    deque.push_front(0);
    deque.push_front(-1);
    println!("deque: {:?}", deque);  // [-1, 0, 1, 2, 3]

    // 弹出
    let front = deque.pop_front();  // Some(-1)
    let back = deque.pop_back();    // Some(3)
    println!("front: {:?}, back: {:?}", front, back);
    println!("deque: {:?}", deque);  // [0, 1, 2]

    // 用作队列（FIFO）
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back("任务1".to_string());
    queue.push_back("任务2".to_string());
    queue.push_back("任务3".to_string());

    while let Some(task) = queue.pop_front() {
        println!("处理: {}", task);
    }
    // 处理: 任务1
    // 处理: 任务2
    // 处理: 任务3

    // 从 Vec 转换
    let vec = vec![1, 2, 3, 4, 5];
    let deque: VecDeque<i32> = VecDeque::from(vec);
    println!("{:?}", deque);

    // 转回 Vec
    let vec_again: Vec<i32> = deque.into();
    println!("{:?}", vec_again);
}
```

---

## 9.7 BTreeMap 和 BTreeSet —— 有序集合

`BTreeMap` 和 `BTreeSet` 与 `HashMap`/`HashSet` 类似，但它们的键是**有序的**。

```rust
use std::collections::BTreeMap;
use std::collections::BTreeSet;

fn main() {
    // BTreeMap: 键自动排序
    let mut scores = BTreeMap::new();
    scores.insert("Charlie", 92);
    scores.insert("Alice", 95);
    scores.insert("Bob", 87);

    // 遍历是按键的顺序！
    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
    // Alice: 95
    // Bob: 87
    // Charlie: 92
    // ^^ 字母顺序！HashMap 的遍历顺序是不确定的

    // 范围查询（HashMap 做不到！）
    let range: Vec<_> = scores.range("B".."D").collect();
    println!("B-D 范围: {:?}", range);
    // [("Bob", 87), ("Charlie", 92)]

    // 获取最小/最大键
    println!("第一个: {:?}", scores.iter().next());      // ("Alice", 95)
    println!("最后一个: {:?}", scores.iter().next_back()); // ("Charlie", 92)

    // BTreeSet: 有序的 Set
    let mut set = BTreeSet::new();
    set.insert(5);
    set.insert(2);
    set.insert(8);
    set.insert(1);
    set.insert(9);

    println!("有序集合: {:?}", set);  // {1, 2, 5, 8, 9}

    // 范围
    let range: Vec<&i32> = set.range(2..=8).collect();
    println!("2-8 范围: {:?}", range);  // [2, 5, 8]
}
```

### HashMap vs BTreeMap 对比

| 特性 | HashMap | BTreeMap |
|---|---|---|
| 查找/插入/删除 | O(1) 平均 | O(log n) |
| 有序遍历 | ❌ | ✅ |
| 范围查询 | ❌ | ✅ |
| 内存使用 | 较多（哈希表） | 较少（B 树） |
| 适用场景 | 大多数情况 | 需要有序或范围查询时 |

---

## 9.8 迭代器预览

迭代器是 Rust 中处理集合最强大、最优雅的方式。这里先简要预览，下一章会深入讲解。

### 9.8.1 基本概念

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 链式操作：过滤 + 转换 + 收集
    let result: Vec<i32> = numbers
        .iter()           // 创建迭代器
        .filter(|&&x| x % 2 == 0)  // 过滤偶数
        .map(|&x| x * x)           // 平方
        .collect();                  // 收集为 Vec

    println!("偶数的平方: {:?}", result);  // [4, 16, 36, 64, 100]

    // 对比 JavaScript:
    // const result = numbers
    //     .filter(x => x % 2 === 0)
    //     .map(x => x * x);
}
```

### 9.8.2 常用迭代器方法

```rust
fn main() {
    let nums = vec![1, 2, 3, 4, 5];

    // sum / product
    let sum: i32 = nums.iter().sum();
    let product: i32 = nums.iter().product();
    println!("和: {}, 积: {}", sum, product);  // 15, 120

    // min / max
    println!("最小: {:?}", nums.iter().min());  // Some(1)
    println!("最大: {:?}", nums.iter().max());  // Some(5)

    // any / all
    let has_even = nums.iter().any(|&x| x % 2 == 0);
    let all_positive = nums.iter().all(|&x| x > 0);
    println!("有偶数: {}, 全是正数: {}", has_even, all_positive);

    // count
    let even_count = nums.iter().filter(|&&x| x % 2 == 0).count();
    println!("偶数个数: {}", even_count);  // 2

    // enumerate
    for (i, &n) in nums.iter().enumerate() {
        println!("[{}] = {}", i, n);
    }

    // zip: 合并两个迭代器
    let names = vec!["Alice", "Bob", "Charlie"];
    let ages = vec![30, 25, 35];
    let people: Vec<_> = names.iter().zip(ages.iter()).collect();
    println!("people: {:?}", people);
    // [("Alice", 30), ("Bob", 25), ("Charlie", 35)]

    // take / skip
    let first_three: Vec<&i32> = nums.iter().take(3).collect();
    let skip_two: Vec<&i32> = nums.iter().skip(2).collect();
    println!("前三个: {:?}", first_three);  // [1, 2, 3]
    println!("跳过两个: {:?}", skip_two);   // [3, 4, 5]

    // chain: 连接两个迭代器
    let a = vec![1, 2];
    let b = vec![3, 4];
    let combined: Vec<&i32> = a.iter().chain(b.iter()).collect();
    println!("连接: {:?}", combined);  // [1, 2, 3, 4]

    // flat_map: 展平 + 映射
    let sentences = vec!["hello world", "foo bar baz"];
    let words: Vec<&str> = sentences
        .iter()
        .flat_map(|s| s.split_whitespace())
        .collect();
    println!("所有单词: {:?}", words);  // ["hello", "world", "foo", "bar", "baz"]

    // fold: 累积（类似 JS 的 reduce）
    let sum = nums.iter().fold(0, |acc, &x| acc + x);
    let sentence = ["Hello", "World", "Rust"]
        .iter()
        .fold(String::new(), |mut acc, &word| {
            if !acc.is_empty() {
                acc.push(' ');
            }
            acc.push_str(word);
            acc
        });
    println!("fold sum: {}", sum);
    println!("fold sentence: {}", sentence);

    // collect 的多种目标类型
    let nums_vec: Vec<i32> = (1..=5).collect();
    let nums_set: std::collections::HashSet<i32> = (1..=5).collect();
    let nums_deque: std::collections::VecDeque<i32> = (1..=5).collect();
    println!("Vec: {:?}", nums_vec);
    println!("Set: {:?}", nums_set);
    println!("Deque: {:?}", nums_deque);
}
```

### 9.8.3 迭代器 vs 循环

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 命令式风格（for 循环）
    let mut sum_even_imperative = 0;
    for &n in &numbers {
        if n % 2 == 0 {
            sum_even_imperative += n * n;
        }
    }

    // 函数式风格（迭代器）
    let sum_even_functional: i32 = numbers
        .iter()
        .filter(|&&x| x % 2 == 0)
        .map(|&x| x * x)
        .sum();

    // 两者性能一样！Rust 的迭代器有零成本抽象
    assert_eq!(sum_even_imperative, sum_even_functional);
    println!("偶数平方和: {}", sum_even_functional);  // 220
}
```

> 💡 **零成本抽象**：Rust 编译器会将迭代器链优化成和手写循环一样高效的代码。所以你可以放心使用函数式风格，不用担心性能。

---

## 9.9 实战：构建一个简单的内存数据库

```rust
use std::collections::HashMap;

#[derive(Debug, Clone)]
struct Student {
    id: u32,
    name: String,
    grade: u8,     // 年级
    score: f64,    // 平均分
    subjects: Vec<String>,
}

struct Database {
    students: HashMap<u32, Student>,
    next_id: u32,
}

impl Database {
    fn new() -> Self {
        Database {
            students: HashMap::new(),
            next_id: 1,
        }
    }

    // 添加学生
    fn add(&mut self, name: &str, grade: u8, score: f64, subjects: Vec<String>) -> u32 {
        let id = self.next_id;
        self.next_id += 1;

        let student = Student {
            id,
            name: name.to_string(),
            grade,
            score,
            subjects,
        };

        self.students.insert(id, student);
        id
    }

    // 按 ID 查找
    fn find_by_id(&self, id: u32) -> Option<&Student> {
        self.students.get(&id)
    }

    // 按名字搜索（模糊匹配）
    fn search_by_name(&self, query: &str) -> Vec<&Student> {
        let query_lower = query.to_lowercase();
        self.students
            .values()
            .filter(|s| s.name.to_lowercase().contains(&query_lower))
            .collect()
    }

    // 按年级查找
    fn find_by_grade(&self, grade: u8) -> Vec<&Student> {
        self.students
            .values()
            .filter(|s| s.grade == grade)
            .collect()
    }

    // 按分数范围查找
    fn find_by_score_range(&self, min: f64, max: f64) -> Vec<&Student> {
        let mut result: Vec<&Student> = self
            .students
            .values()
            .filter(|s| s.score >= min && s.score <= max)
            .collect();
        result.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        result
    }

    // 统计每个年级的平均分
    fn grade_averages(&self) -> HashMap<u8, f64> {
        let mut grade_scores: HashMap<u8, (f64, usize)> = HashMap::new();

        for student in self.students.values() {
            let entry = grade_scores.entry(student.grade).or_insert((0.0, 0));
            entry.0 += student.score;
            entry.1 += 1;
        }

        grade_scores
            .into_iter()
            .map(|(grade, (total, count))| (grade, total / count as f64))
            .collect()
    }

    // 最受欢迎的科目
    fn popular_subjects(&self) -> Vec<(String, usize)> {
        let mut subject_count: HashMap<&str, usize> = HashMap::new();

        for student in self.students.values() {
            for subject in &student.subjects {
                *subject_count.entry(subject).or_insert(0) += 1;
            }
        }

        let mut result: Vec<(String, usize)> = subject_count
            .into_iter()
            .map(|(s, c)| (s.to_string(), c))
            .collect();
        result.sort_by(|a, b| b.1.cmp(&a.1));
        result
    }

    // 删除学生
    fn remove(&mut self, id: u32) -> Option<Student> {
        self.students.remove(&id)
    }

    // 更新分数
    fn update_score(&mut self, id: u32, new_score: f64) -> Result<(), String> {
        match self.students.get_mut(&id) {
            Some(student) => {
                student.score = new_score;
                Ok(())
            }
            None => Err(format!("学生 ID {} 不存在", id)),
        }
    }

    // 总人数
    fn count(&self) -> usize {
        self.students.len()
    }
}

fn main() {
    let mut db = Database::new();

    // 添加学生
    db.add("张三", 1, 92.5, vec!["数学".into(), "物理".into(), "编程".into()]);
    db.add("李四", 1, 88.0, vec!["英语".into(), "数学".into()]);
    db.add("王五", 2, 95.0, vec!["物理".into(), "编程".into(), "化学".into()]);
    db.add("赵六", 2, 78.5, vec!["英语".into(), "历史".into()]);
    db.add("钱七", 3, 91.0, vec!["数学".into(), "编程".into()]);
    db.add("孙八", 3, 85.0, vec!["英语".into(), "物理".into(), "数学".into()]);
    db.add("Alice", 1, 97.0, vec!["编程".into(), "数学".into(), "物理".into()]);

    println!("=== 学生数据库 ===");
    println!("总人数: {}\n", db.count());

    // 按 ID 查找
    if let Some(student) = db.find_by_id(1) {
        println!("ID 1: {:?}", student);
    }

    // 搜索
    println!("\n搜索 'ali':");
    for s in db.search_by_name("ali") {
        println!("  {} ({}分)", s.name, s.score);
    }

    // 按年级查找
    println!("\n一年级学生:");
    for s in db.find_by_grade(1) {
        println!("  {} - {}分", s.name, s.score);
    }

    // 高分学生
    println!("\n90分以上:");
    for s in db.find_by_score_range(90.0, 100.0) {
        println!("  {} - {}分", s.name, s.score);
    }

    // 年级平均分
    println!("\n年级平均分:");
    let mut averages: Vec<_> = db.grade_averages().into_iter().collect();
    averages.sort_by_key(|&(grade, _)| grade);
    for (grade, avg) in averages {
        println!("  {}年级: {:.1}分", grade, avg);
    }

    // 热门科目
    println!("\n热门科目:");
    for (subject, count) in db.popular_subjects().iter().take(5) {
        println!("  {}: {}人选", subject, count);
    }

    // 更新和删除
    db.update_score(1, 95.0).unwrap();
    println!("\n更新张三分数后: {:?}", db.find_by_id(1));

    let removed = db.remove(4);
    println!("删除: {:?}", removed.map(|s| s.name));
    println!("剩余人数: {}", db.count());
}
```

---

## 9.10 选择正确的集合类型

| 需求 | 推荐 | 原因 |
|---|---|---|
| 有序列表，经常在末尾增删 | `Vec&lt;T&gt;` | 最常用，缓存友好 |
| 需要在头部频繁增删 | `VecDeque&lt;T&gt;` | 双端 O(1) |
| 键值对查找 | `HashMap&lt;K, V&gt;` | O(1) 查找 |
| 有序键值对 | `BTreeMap&lt;K, V&gt;` | 有序遍历、范围查询 |
| 去重 | `HashSet&lt;T&gt;` | O(1) 查找和插入 |
| 有序去重 | `BTreeSet&lt;T&gt;` | 有序 + 去重 |
| 优先队列 | `BinaryHeap&lt;T&gt;` | O(log n) 弹出最大/最小 |
| 频繁中间插入/删除 | `LinkedList&lt;T&gt;` | 理论上O(1)，但实践中很少用 |
| 字符串 | `String` / `&str` | UTF-8 安全 |

---

## 9.11 练习题

### 练习 1：词频统计器

```rust
use std::collections::HashMap;

/// 统计文本中每个单词出现的次数
/// 忽略大小写，忽略标点符号
/// 返回按频率降序排列的 (单词, 频率) 列表
fn word_frequency(text: &str) -> Vec<(String, usize)> {
    // 提示：
    // - 去除标点：char::is_alphanumeric()
    // - 转小写：to_lowercase()
    // - 分割：split_whitespace()
    // - 统计：HashMap + entry API
    // - 排序：sort_by()
    todo!()
}

// 测试
fn main() {
    let text = "To be, or not to be, that is the question.";
    let freq = word_frequency(text);
    for (word, count) in &freq {
        println!("{}: {}", word, count);
    }
    // 期望输出（排序可能不同）:
    // to: 2
    // be: 2
    // or: 1
    // not: 1
    // ...
}
```

### 练习 2：双向映射

```rust
use std::collections::HashMap;

/// 实现一个双向映射：既可以从 key 查 value，也可以从 value 查 key
struct BiMap<K, V> {
    forward: HashMap<K, V>,
    backward: HashMap<V, K>,
}

impl<K, V> BiMap<K, V>
where
    K: Clone + Eq + std::hash::Hash,
    V: Clone + Eq + std::hash::Hash,
{
    fn new() -> Self { todo!() }
    fn insert(&mut self, key: K, value: V) { todo!() }
    fn get_by_key(&self, key: &K) -> Option<&V> { todo!() }
    fn get_by_value(&self, value: &V) -> Option<&K> { todo!() }
    fn remove_by_key(&mut self, key: &K) -> Option<V> { todo!() }
}
```

### 练习 3：文本分析器

```rust
/// 分析一段文本，返回以下统计信息：
/// - 总字符数（不含空格）
/// - 总单词数
/// - 总行数
/// - 最长的单词
/// - 最常出现的字符（不含空格）
/// - 平均单词长度
struct TextStats {
    char_count: usize,
    word_count: usize,
    line_count: usize,
    longest_word: String,
    most_common_char: char,
    avg_word_length: f64,
}

fn analyze_text(text: &str) -> TextStats {
    todo!()
}
```

### 练习 4：LRU 缓存

```rust
use std::collections::{HashMap, VecDeque};

/// 实现一个简单的 LRU（最近最少使用）缓存
/// - get: 获取值并标记为最近使用
/// - put: 插入值，如果超出容量则移除最久未使用的
struct LruCache<K, V> {
    capacity: usize,
    map: HashMap<K, V>,
    order: VecDeque<K>,  // 前面是最旧的，后面是最新的
}

impl<K, V> LruCache<K, V>
where
    K: Clone + Eq + std::hash::Hash,
{
    fn new(capacity: usize) -> Self { todo!() }
    fn get(&mut self, key: &K) -> Option<&V> { todo!() }
    fn put(&mut self, key: K, value: V) { todo!() }
}
```

---

## 9.12 本章小结

本章我们深入学习了 Rust 的集合类型。让我们回顾关键要点：

| 集合 | 何时使用 | JS 对应 |
|---|---|---|
| `Vec&lt;T&gt;` | 有序列表、数组 | `Array` |
| `String` | 可变字符串 | `string`（但有所有权） |
| `&str` | 字符串引用/切片 | `string`（不可变） |
| `HashMap&lt;K,V&gt;` | 键值查找 | `Map` / `Object` |
| `HashSet&lt;T&gt;` | 去重集合 | `Set` |
| `VecDeque&lt;T&gt;` | 双端队列 | 无 |
| `BTreeMap&lt;K,V&gt;` | 有序键值对 | 无 |

**关键收获**：

1. **`Vec` 是你的默认选择** —— 大多数时候 `Vec` 就够了
2. **String 在 Rust 中很复杂** —— 因为 UTF-8 本身就很复杂，Rust 不会帮你假装它简单
3. **`HashMap` 的 entry API 非常强大** —— 一旦掌握，你会到处使用它
4. **迭代器是 Rust 的灵魂** —— 下一章我们将深入探索
5. **选择正确的集合很重要** —— 但不要过度优化，先用 Vec/HashMap，有性能问题再换

> 📖 **下一章预告**：第十章我们将全面深入迭代器和闭包。你将学会 Rust 中最优雅的数据处理方式 —— 函数式编程风格。`map`、`filter`、`fold` 将成为你的日常工具。
