# 第十九章：实战 —— 用 Axum 构建 Web API

> **本章目标**
>
> - 理解 Axum 框架的设计理念（对比 Express.js）
> - 掌握路由定义与处理器函数
> - 熟练使用请求解析：Path、Query、Json
> - 实现中间件（日志、认证、CORS）
> - 集成 SQLx 进行数据库操作
> - 构建优雅的错误处理体系
> - 从零搭建一个完整的 REST API 项目（Todo 应用）
> - 编写 API 测试
> - 部署到生产环境

> **预计学习时间：150 - 180 分钟**（这是一个综合性实战章节）

---

## 19.1 Axum 框架介绍

### 19.1.1 为什么选择 Axum？

```
┌──────────────────────────────────────────────────────────────────┐
│                  Rust Web 框架对比                                │
├──────────────┬──────────────┬────────────────┬──────────────────┤
│   特性        │    Axum      │    Actix-web   │    Rocket        │
├──────────────┼──────────────┼────────────────┼──────────────────┤
│  维护者       │  Tokio 团队   │  社区          │  社区            │
│  异步运行时   │  Tokio       │  Actix/Tokio   │  Tokio           │
│  类型安全     │  ⭐⭐⭐      │  ⭐⭐          │  ⭐⭐⭐          │
│  学习曲线     │  中等         │  中等          │  较低            │
│  性能         │  极高         │  极高          │  高              │
│  生态         │  Tower 生态   │  自有生态      │  自有生态         │
│  宏依赖       │  少           │  多            │  多              │
│  GitHub Stars │  19k+         │  21k+          │  24k+            │
│  类比 JS      │  Koa/Fastify  │  Express       │  NestJS          │
└──────────────┴──────────────┴────────────────┴──────────────────┘

选择 Axum 的理由：
1. 由 Tokio 团队维护，与 Tokio 生态无缝集成
2. 基于 Tower 中间件系统，复用性强
3. 最少的宏魔法，代码就是普通的 Rust 函数
4. 编译时错误信息清晰
5. 社区增长最快
```

### 19.1.2 对比 Express.js

```javascript
// Express.js - 最流行的 Node.js Web 框架
const express = require('express');
const app = express();

app.use(express.json());

app.get('/users', (req, res) => {
    res.json([{ id: 1, name: 'Alice' }]);
});

app.get('/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    res.json({ id, name: 'Alice' });
});

app.post('/users', (req, res) => {
    const { name, email } = req.body;
    res.status(201).json({ id: 1, name, email });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

```rust
// Axum - 等价的 Rust 实现
use axum::{
    routing::{get, post},
    extract::{Path, Json},
    Router,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct User {
    id: u64,
    name: String,
}

#[derive(Deserialize)]
struct CreateUser {
    name: String,
    email: String,
}

// 处理器就是普通的 async 函数！
async fn list_users() -> Json<Vec<User>> {
    Json(vec![User { id: 1, name: "Alice".to_string() }])
}

async fn get_user(Path(id): Path<u64>) -> Json<User> {
    Json(User { id, name: "Alice".to_string() })
}

async fn create_user(
    Json(payload): Json<CreateUser>,
) -> (StatusCode, Json<User>) {
    let user = User { id: 1, name: payload.name };
    (StatusCode::CREATED, Json(user))
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/{id}", get(get_user));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("服务器运行在 http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
```

### 19.1.3 关键区别

```
┌──────────────────────────────────────────────────────────────┐
│              Express.js vs Axum 关键区别                      │
├──────────────────┬───────────────────┬───────────────────────┤
│  方面             │  Express.js       │  Axum                 │
├──────────────────┼───────────────────┼───────────────────────┤
│  请求处理         │  回调函数          │  async 函数           │
│  类型安全         │  运行时检查        │  编译时检查           │
│  JSON 解析        │  中间件处理        │  提取器自动解析       │
│  错误处理         │  next(err)        │  Result<T, E>        │
│  路由参数         │  req.params.id    │  Path(id): Path<u64> │
│  查询参数         │  req.query.page   │  Query(q): Query<Q>  │
│  请求体           │  req.body         │  Json(body): Json<T> │
│  中间件           │  app.use(fn)      │  layer(middleware)   │
│  性能             │  ~15K req/s       │  ~200K req/s         │
│  内存             │  ~50MB            │  ~5MB                │
└──────────────────┴───────────────────┴───────────────────────┘
```

---

## 19.2 项目初始化

### 19.2.1 创建项目

```bash
cargo new todo-api
cd todo-api
```

### 19.2.2 依赖配置

```toml
# Cargo.toml
[package]
name = "todo-api"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web 框架
axum = "0.8"
tokio = { version = "1", features = ["full"] }

# 序列化/反序列化
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# 数据库
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "chrono"] }

# 错误处理
anyhow = "1"
thiserror = "2"

# 日志
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# 中间件
tower = "0.5"
tower-http = { version = "0.6", features = ["cors", "trace", "timeout"] }

# 时间处理
chrono = { version = "0.4", features = ["serde"] }

# 环境变量
dotenvy = "0.15"

# UUID
uuid = { version = "1", features = ["v4", "serde"] }
```

### 19.2.3 项目结构

```
todo-api/
├── Cargo.toml
├── .env                    # 环境变量
├── migrations/             # 数据库迁移
│   └── 001_create_todos.sql
├── src/
│   ├── main.rs            # 入口
│   ├── config.rs          # 配置
│   ├── routes/            # 路由
│   │   ├── mod.rs
│   │   └── todos.rs
│   ├── models/            # 数据模型
│   │   ├── mod.rs
│   │   └── todo.rs
│   ├── handlers/          # 请求处理器
│   │   ├── mod.rs
│   │   └── todos.rs
│   ├── error.rs           # 错误处理
│   └── db.rs              # 数据库连接
└── tests/
    └── api_tests.rs       # API 测试
```

---

## 19.3 路由与处理器

### 19.3.1 路由定义

```rust
use axum::{
    routing::{get, post, put, delete},
    Router,
};

// Axum 的路由系统非常直观
fn create_router() -> Router {
    Router::new()
        // 基本路由
        .route("/", get(root_handler))

        // RESTful 路由 —— 同一路径不同方法
        .route("/todos", get(list_todos).post(create_todo))
        .route("/todos/{id}", get(get_todo).put(update_todo).delete(delete_todo))

        // 嵌套路由
        .nest("/api/v1", api_v1_routes())
        .nest("/api/v2", api_v2_routes())

        // 合并多个 Router
        .merge(health_routes())
}

// 对比 Express.js：
// app.get('/', rootHandler);
// app.route('/todos')
//     .get(listTodos)
//     .post(createTodo);
// app.route('/todos/:id')
//     .get(getTodo)
//     .put(updateTodo)
//     .delete(deleteTodo);
// app.use('/api/v1', apiV1Router);

fn api_v1_routes() -> Router {
    Router::new()
        .route("/users", get(|| async { "v1 users" }))
}

fn api_v2_routes() -> Router {
    Router::new()
        .route("/users", get(|| async { "v2 users" }))
}

fn health_routes() -> Router {
    Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/ready", get(|| async { "Ready" }))
}

async fn root_handler() -> &'static str {
    "欢迎使用 Todo API！"
}

// 占位处理器
async fn list_todos() -> &'static str { "list" }
async fn create_todo() -> &'static str { "create" }
async fn get_todo() -> &'static str { "get" }
async fn update_todo() -> &'static str { "update" }
async fn delete_todo() -> &'static str { "delete" }
```

### 19.3.2 处理器函数

在 Axum 中，处理器就是普通的 async 函数。函数的参数是"提取器"（Extractors），返回值是"响应"：

```rust
use axum::{
    extract::{Path, Query, Json, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};

// === 无参数处理器 ===
async fn hello() -> &'static str {
    "Hello, World!"
}

// === 返回 JSON ===
#[derive(Serialize)]
struct Message {
    text: String,
    timestamp: i64,
}

async fn json_hello() -> Json<Message> {
    Json(Message {
        text: "Hello!".to_string(),
        timestamp: chrono::Utc::now().timestamp(),
    })
}

// === 返回状态码 + JSON ===
async fn created_response() -> (StatusCode, Json<Message>) {
    (
        StatusCode::CREATED,
        Json(Message {
            text: "已创建".to_string(),
            timestamp: chrono::Utc::now().timestamp(),
        }),
    )
}

// === 返回自定义响应头 ===
use axum::http::header;
use axum::response::Response;

async fn custom_headers() -> impl IntoResponse {
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        "带自定义头的响应",
    )
}
```

---

## 19.4 请求解析（提取器）

### 19.4.1 Path —— 路径参数

```rust
use axum::extract::Path;

// 单个路径参数
// GET /users/42
async fn get_user(Path(id): Path<u64>) -> String {
    format!("用户 ID: {}", id)
}

// 多个路径参数
// GET /users/42/posts/7
async fn get_user_post(
    Path((user_id, post_id)): Path<(u64, u64)>,
) -> String {
    format!("用户 {} 的帖子 {}", user_id, post_id)
}

// 使用结构体解构路径参数
#[derive(Deserialize)]
struct UserPostPath {
    user_id: u64,
    post_id: u64,
}

async fn get_user_post_v2(
    Path(path): Path<UserPostPath>,
) -> String {
    format!("用户 {} 的帖子 {}", path.user_id, path.post_id)
}

// 路由定义：
// .route("/users/{user_id}/posts/{post_id}", get(get_user_post_v2))

// 对比 Express.js：
// app.get('/users/:userId/posts/:postId', (req, res) => {
//     const { userId, postId } = req.params;
//     // userId 是 string！需要手动转换
//     const id = parseInt(userId);  // 可能是 NaN！
// });
// Axum 的优势：编译时检查类型，Path<u64> 保证是有效数字！
```

### 19.4.2 Query —— 查询参数

```rust
use axum::extract::Query;
use serde::Deserialize;

// GET /todos?page=1&limit=10&status=active
#[derive(Deserialize, Debug)]
struct TodoQuery {
    page: Option<u32>,      // 可选参数
    limit: Option<u32>,     // 可选参数
    status: Option<String>, // 可选参数
    #[serde(default)]       // 默认值：false
    completed: bool,
}

async fn list_todos(Query(query): Query<TodoQuery>) -> String {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    format!(
        "查询：page={}, limit={}, status={:?}, completed={}",
        page, limit, query.status, query.completed
    )
}

// 对比 Express.js：
// app.get('/todos', (req, res) => {
//     const page = parseInt(req.query.page) || 1;  // 可能 NaN
//     const limit = parseInt(req.query.limit) || 20;
//     const status = req.query.status;  // undefined 或 string
// });
// Axum 自动解析、验证类型，无效参数直接返回 400 错误！
```

### 19.4.3 Json —— 请求体

```rust
use axum::extract::Json;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct CreateTodo {
    title: String,
    description: Option<String>,
}

#[derive(Serialize)]
struct Todo {
    id: u64,
    title: String,
    description: Option<String>,
    completed: bool,
}

// POST /todos
// Body: { "title": "学习 Rust", "description": "完成第19章" }
async fn create_todo(
    Json(payload): Json<CreateTodo>,
) -> (StatusCode, Json<Todo>) {
    let todo = Todo {
        id: 1,
        title: payload.title,
        description: payload.description,
        completed: false,
    };
    (StatusCode::CREATED, Json(todo))
}

// 对比 Express.js：
// app.post('/todos', (req, res) => {
//     const { title, description } = req.body;
//     // title 可能是 undefined、null、number、array...
//     // 需要手动验证每个字段！
//     if (!title || typeof title !== 'string') {
//         return res.status(400).json({ error: 'title 必须是字符串' });
//     }
// });
// Axum + serde 自动验证：
// - title 必须存在（非 Option）
// - title 必须是字符串
// - description 可以不存在（Option）
// - 多余字段默认被忽略
// - 类型不对自动返回 400！
```

### 19.4.4 State —— 共享状态

```rust
use axum::extract::State;
use std::sync::Arc;
use tokio::sync::RwLock;

// 应用状态
#[derive(Clone)]
struct AppState {
    db: sqlx::SqlitePool,
    config: AppConfig,
}

#[derive(Clone)]
struct AppConfig {
    max_todos: usize,
    app_name: String,
}

// 在处理器中访问状态
async fn list_todos(State(state): State<AppState>) -> String {
    format!("应用名称：{}", state.config.app_name)
}

// 设置路由时注入状态
fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/todos", get(list_todos))
        .with_state(state)  // 注入状态
}

// 对比 Express.js：
// // Express 通常用中间件或 app.locals
// app.locals.db = db;
// app.use((req, res, next) => {
//     req.db = app.locals.db;
//     next();
// });

// 使用 Arc + RwLock 共享可变状态
type SharedState = Arc<RwLock<Vec<Todo>>>;

#[derive(Clone, Serialize)]
struct Todo {
    id: u64,
    title: String,
    completed: bool,
}

async fn list_todos_shared(
    State(todos): State<SharedState>,
) -> Json<Vec<Todo>> {
    let todos = todos.read().await;
    Json(todos.clone())
}

async fn add_todo_shared(
    State(todos): State<SharedState>,
    Json(payload): Json<CreateTodoRequest>,
) -> (StatusCode, Json<Todo>) {
    let mut todos = todos.write().await;
    let todo = Todo {
        id: todos.len() as u64 + 1,
        title: payload.title,
        completed: false,
    };
    todos.push(todo.clone());
    (StatusCode::CREATED, Json(todo))
}

#[derive(Deserialize)]
struct CreateTodoRequest {
    title: String,
}
```

### 19.4.5 Headers 和其他提取器

```rust
use axum::{
    extract::ConnectInfo,
    http::{HeaderMap, Method, Uri},
};
use std::net::SocketAddr;

// 提取请求头
async fn show_headers(headers: HeaderMap) -> String {
    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("未知");
    format!("User-Agent: {}", user_agent)
}

// 提取请求方法和 URI
async fn request_info(method: Method, uri: Uri) -> String {
    format!("{} {}", method, uri)
}

// 提取客户端 IP
async fn client_ip(ConnectInfo(addr): ConnectInfo<SocketAddr>) -> String {
    format!("你的 IP: {}", addr)
}

// 多个提取器组合（注意顺序：Body 消耗型提取器必须放最后）
async fn complex_handler(
    State(state): State<AppState>,      // 状态
    headers: HeaderMap,                   // 请求头
    Path(id): Path<u64>,                  // 路径参数
    Query(query): Query<TodoQuery>,       // 查询参数
    Json(body): Json<CreateTodo>,         // 请求体（必须最后！）
) -> impl IntoResponse {
    // ... 处理逻辑
    StatusCode::OK
}

// ⚠️ 重要规则：
// Json、String、Bytes 等消耗请求体的提取器必须作为最后一个参数！
// 因为请求体只能被读取一次。

#[derive(Clone)]
struct AppState;
#[derive(Deserialize)]
struct TodoQuery { page: Option<u32> }
#[derive(Deserialize)]
struct CreateTodo { title: String }
```

---

## 19.5 中间件

### 19.5.1 Tower 中间件系统

```rust
use axum::{Router, middleware};
use tower_http::{
    cors::{CorsLayer, Any},
    trace::TraceLayer,
    timeout::TimeoutLayer,
};
use std::time::Duration;

fn create_router() -> Router {
    Router::new()
        .route("/todos", get(list_todos))
        // 添加中间件（从下到上执行）
        .layer(TimeoutLayer::new(Duration::from_secs(30)))   // 请求超时
        .layer(CorsLayer::new()                               // CORS
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any))
        .layer(TraceLayer::new_for_http())                    // 请求日志
}

// 对比 Express.js：
// app.use(cors());                    // CORS
// app.use(morgan('dev'));             // 请求日志
// app.use(timeout('30s'));            // 请求超时

async fn list_todos() -> &'static str { "todos" }
```

### 19.5.2 自定义中间件

```rust
use axum::{
    Router,
    middleware::{self, Next},
    extract::Request,
    response::Response,
    http::StatusCode,
};

// 方法 1：使用 from_fn 创建中间件（最简单）
async fn logging_middleware(
    request: Request,
    next: Next,
) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let start = std::time::Instant::now();

    // 打印请求信息
    tracing::info!("→ {} {}", method, uri);

    // 调用下一个处理器
    let response = next.run(request).await;

    // 打印响应信息
    let duration = start.elapsed();
    tracing::info!(
        "← {} {} {} {:?}",
        method, uri,
        response.status(),
        duration
    );

    response
}

// 方法 2：认证中间件
async fn auth_middleware(
    headers: axum::http::HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // 检查 Authorization 头
    let auth_header = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok());

    match auth_header {
        Some(token) if token.starts_with("Bearer ") => {
            let token = &token[7..];
            // 验证 token（简化示例）
            if token == "valid-token" {
                Ok(next.run(request).await)
            } else {
                Err(StatusCode::UNAUTHORIZED)
            }
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

// 使用中间件
fn create_router() -> Router {
    // 公共路由（不需要认证）
    let public_routes = Router::new()
        .route("/health", axum::routing::get(|| async { "OK" }))
        .route("/login", axum::routing::post(login));

    // 受保护的路由（需要认证）
    let protected_routes = Router::new()
        .route("/todos", axum::routing::get(list_todos))
        .route("/profile", axum::routing::get(get_profile))
        .layer(middleware::from_fn(auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(middleware::from_fn(logging_middleware))  // 所有路由都有日志
}

async fn login() -> &'static str { "login" }
async fn list_todos() -> &'static str { "todos" }
async fn get_profile() -> &'static str { "profile" }

// 对比 Express.js：
// const authMiddleware = (req, res, next) => {
//     const token = req.headers.authorization?.replace('Bearer ', '');
//     if (!token || !isValidToken(token)) {
//         return res.status(401).json({ error: 'Unauthorized' });
//     }
//     next();
// };
// app.use('/api', authMiddleware);
```

### 19.5.3 请求 ID 中间件

```rust
use axum::{
    middleware::Next,
    extract::Request,
    response::Response,
    http::header::HeaderName,
};
use uuid::Uuid;

/// 为每个请求添加唯一 ID（方便日志追踪）
async fn request_id_middleware(
    mut request: Request,
    next: Next,
) -> Response {
    let request_id = Uuid::new_v4().to_string();

    // 将 request_id 添加到请求扩展中（供后续处理器使用）
    request.extensions_mut().insert(RequestId(request_id.clone()));

    let mut response = next.run(request).await;

    // 在响应头中添加 request_id
    let header_name = HeaderName::from_static("x-request-id");
    response.headers_mut().insert(
        header_name,
        request_id.parse().unwrap(),
    );

    response
}

#[derive(Clone)]
struct RequestId(String);

// 在处理器中使用 request_id
use axum::Extension;

async fn handler(Extension(request_id): Extension<RequestId>) -> String {
    format!("Request ID: {}", request_id.0)
}
```

---

## 19.6 数据库集成（SQLx）

### 19.6.1 为什么选择 SQLx？

```
┌──────────────────────────────────────────────────────────────┐
│                Rust ORM/数据库库对比                           │
├──────────────┬──────────────────┬────────────────────────────┤
│  库           │  类型            │  特点                      │
├──────────────┼──────────────────┼────────────────────────────┤
│  SQLx        │  SQL 查询构建器   │  编译时检查 SQL，异步原生    │
│  Diesel      │  ORM             │  类型安全，同步             │
│  SeaORM      │  ORM             │  基于 SQLx，异步            │
│  rusqlite    │  SQLite 绑定      │  轻量，同步                │
└──────────────┴──────────────────┴────────────────────────────┘

SQLx 的优势：
1. 编译时检查 SQL 语句（连接数据库检查）
2. 原生异步支持（与 Tokio 完美配合）
3. 不是 ORM，直接写 SQL，更灵活
4. 支持 PostgreSQL、MySQL、SQLite
5. 类似 JS 的 knex.js 但有编译时检查
```

### 19.6.2 数据库设置

```bash
# 创建 .env 文件
echo "DATABASE_URL=sqlite:todos.db" > .env

# 安装 SQLx CLI
cargo install sqlx-cli --features sqlite

# 创建数据库
sqlx database create

# 创建迁移
sqlx migrate add create_todos
```

```sql
-- migrations/20240101000000_create_todos.sql
-- 创建 todos 表

CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
```

```bash
# 运行迁移
sqlx migrate run
```

### 19.6.3 数据库连接

```rust
// src/db.rs
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;
use anyhow::Result;

/// 创建数据库连接池
pub async fn create_pool(database_url: &str) -> Result<SqlitePool> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)              // 最大连接数
        .min_connections(1)              // 最小连接数
        .acquire_timeout(std::time::Duration::from_secs(5))  // 获取连接超时
        .connect(database_url)
        .await?;

    // 运行迁移
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    tracing::info!("数据库连接成功");
    Ok(pool)
}

// 对比 JavaScript (knex.js)：
// const knex = require('knex')({
//     client: 'sqlite3',
//     connection: { filename: './todos.db' },
//     pool: { min: 1, max: 5 },
// });
```

### 19.6.4 数据模型

```rust
// src/models/todo.rs
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 数据库中的 Todo 记录
#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 Todo 的请求
#[derive(Debug, Deserialize)]
pub struct CreateTodoRequest {
    pub title: String,
    pub description: Option<String>,
}

/// 更新 Todo 的请求
#[derive(Debug, Deserialize)]
pub struct UpdateTodoRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub completed: Option<bool>,
}

/// 查询参数
#[derive(Debug, Deserialize)]
pub struct TodoQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub completed: Option<bool>,
    pub search: Option<String>,
}

/// 分页响应
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
}

impl Todo {
    /// 创建新的 Todo
    pub fn new(title: String, description: Option<String>) -> Self {
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            description,
            completed: false,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
```

### 19.6.5 数据库操作（Repository 模式）

```rust
// src/handlers/todos.rs（数据库查询部分）
use axum::{
    extract::{Path, Query, State, Json},
    http::StatusCode,
    response::IntoResponse,
};
use sqlx::SqlitePool;
use crate::models::todo::*;
use crate::error::AppError;

/// 获取 Todo 列表
pub async fn list_todos(
    State(pool): State<SqlitePool>,
    Query(query): Query<TodoQuery>,
) -> Result<Json<PaginatedResponse<Todo>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20).min(100);  // 最多 100 条
    let offset = (page - 1) * limit;

    // 查询总数
    let total: (i64,) = if let Some(completed) = query.completed {
        sqlx::query_as("SELECT COUNT(*) FROM todos WHERE completed = ?")
            .bind(completed)
            .fetch_one(&pool)
            .await?
    } else {
        sqlx::query_as("SELECT COUNT(*) FROM todos")
            .fetch_one(&pool)
            .await?
    };

    // 查询数据
    let todos: Vec<Todo> = if let Some(completed) = query.completed {
        sqlx::query_as::<_, Todo>(
            "SELECT * FROM todos WHERE completed = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
        )
        .bind(completed)
        .bind(limit)
        .bind(offset)
        .fetch_all(&pool)
        .await?
    } else if let Some(search) = &query.search {
        sqlx::query_as::<_, Todo>(
            "SELECT * FROM todos WHERE title LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
        )
        .bind(format!("%{}%", search))
        .bind(limit)
        .bind(offset)
        .fetch_all(&pool)
        .await?
    } else {
        sqlx::query_as::<_, Todo>(
            "SELECT * FROM todos ORDER BY created_at DESC LIMIT ? OFFSET ?"
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&pool)
        .await?
    };

    let total_pages = ((total.0 as f64) / (limit as f64)).ceil() as u32;

    Ok(Json(PaginatedResponse {
        data: todos,
        total: total.0,
        page,
        limit,
        total_pages,
    }))
}

/// 获取单个 Todo
pub async fn get_todo(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<Json<Todo>, AppError> {
    let todo = sqlx::query_as::<_, Todo>("SELECT * FROM todos WHERE id = ?")
        .bind(&id)
        .fetch_optional(&pool)
        .await?
        .ok_or(AppError::NotFound(format!("Todo {} 不存在", id)))?;

    Ok(Json(todo))
}

/// 创建 Todo
pub async fn create_todo(
    State(pool): State<SqlitePool>,
    Json(payload): Json<CreateTodoRequest>,
) -> Result<(StatusCode, Json<Todo>), AppError> {
    // 验证输入
    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest("标题不能为空".to_string()));
    }

    if payload.title.len() > 200 {
        return Err(AppError::BadRequest("标题不能超过 200 个字符".to_string()));
    }

    let todo = Todo::new(payload.title, payload.description);

    sqlx::query(
        "INSERT INTO todos (id, title, description, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&todo.id)
    .bind(&todo.title)
    .bind(&todo.description)
    .bind(todo.completed)
    .bind(&todo.created_at)
    .bind(&todo.updated_at)
    .execute(&pool)
    .await?;

    tracing::info!("创建 Todo: {} - {}", todo.id, todo.title);

    Ok((StatusCode::CREATED, Json(todo)))
}

/// 更新 Todo
pub async fn update_todo(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateTodoRequest>,
) -> Result<Json<Todo>, AppError> {
    // 先检查是否存在
    let existing = sqlx::query_as::<_, Todo>("SELECT * FROM todos WHERE id = ?")
        .bind(&id)
        .fetch_optional(&pool)
        .await?
        .ok_or(AppError::NotFound(format!("Todo {} 不存在", id)))?;

    // 更新字段（只更新提供的字段）
    let title = payload.title.unwrap_or(existing.title);
    let description = payload.description.or(existing.description);
    let completed = payload.completed.unwrap_or(existing.completed);
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    sqlx::query(
        "UPDATE todos SET title = ?, description = ?, completed = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&title)
    .bind(&description)
    .bind(completed)
    .bind(&now)
    .bind(&id)
    .execute(&pool)
    .await?;

    // 返回更新后的记录
    let updated = sqlx::query_as::<_, Todo>("SELECT * FROM todos WHERE id = ?")
        .bind(&id)
        .fetch_one(&pool)
        .await?;

    tracing::info!("更新 Todo: {}", id);

    Ok(Json(updated))
}

/// 删除 Todo
pub async fn delete_todo(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM todos WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Todo {} 不存在", id)));
    }

    tracing::info!("删除 Todo: {}", id);

    Ok(StatusCode::NO_CONTENT)
}

// 对比 Express.js + knex.js：
//
// app.get('/todos', async (req, res) => {
//     const { page = 1, limit = 20 } = req.query;
//     const todos = await knex('todos')
//         .orderBy('created_at', 'desc')
//         .limit(limit)
//         .offset((page - 1) * limit);
//     const [{ count }] = await knex('todos').count('* as count');
//     res.json({ data: todos, total: count, page, limit });
// });
//
// 关键区别：
// 1. Rust 的 SQL 在编译时检查（如果用 query! 宏）
// 2. 参数类型在编译时确认
// 3. 错误必须显式处理
// 4. 不会出现 undefined 或 NaN
```

---

## 19.7 错误处理

### 19.7.1 统一错误类型

```rust
// src/error.rs
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// 应用错误类型
#[derive(Error, Debug)]
pub enum AppError {
    /// 资源未找到
    #[error("未找到：{0}")]
    NotFound(String),

    /// 请求参数错误
    #[error("请求错误：{0}")]
    BadRequest(String),

    /// 未授权
    #[error("未授权：{0}")]
    Unauthorized(String),

    /// 权限不足
    #[error("权限不足：{0}")]
    Forbidden(String),

    /// 数据库错误
    #[error("数据库错误：{0}")]
    Database(#[from] sqlx::Error),

    /// 内部错误
    #[error("内部错误：{0}")]
    Internal(#[from] anyhow::Error),
}

/// 将 AppError 转换为 HTTP 响应
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg.clone()),
            AppError::Database(e) => {
                tracing::error!("数据库错误：{:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "数据库操作失败".to_string(),
                )
            }
            AppError::Internal(e) => {
                tracing::error!("内部错误：{:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "服务器内部错误".to_string(),
                )
            }
        };

        let body = json!({
            "error": {
                "code": status.as_u16(),
                "message": message,
            }
        });

        (status, Json(body)).into_response()
    }
}

// 现在处理器可以优雅地返回错误：
// async fn get_todo(...) -> Result<Json<Todo>, AppError> {
//     let todo = find_todo(id).await?.ok_or(AppError::NotFound("Todo 不存在"))?;
//     Ok(Json(todo))
// }

// 对比 Express.js：
// // Express 通常需要一个全局错误处理中间件
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     const status = err.statusCode || 500;
//     res.status(status).json({
//         error: { code: status, message: err.message }
//     });
// });
```

### 19.7.2 验证错误

```rust
// 自定义验证逻辑
use serde::Deserialize;

#[derive(Deserialize)]
pub struct CreateTodoRequest {
    pub title: String,
    pub description: Option<String>,
}

impl CreateTodoRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.title.trim().is_empty() {
            return Err(AppError::BadRequest("标题不能为空".to_string()));
        }
        if self.title.len() > 200 {
            return Err(AppError::BadRequest("标题不能超过 200 个字符".to_string()));
        }
        if let Some(desc) = &self.description {
            if desc.len() > 2000 {
                return Err(AppError::BadRequest("描述不能超过 2000 个字符".to_string()));
            }
        }
        Ok(())
    }
}

// 在处理器中使用
async fn create_todo(
    State(pool): State<SqlitePool>,
    Json(payload): Json<CreateTodoRequest>,
) -> Result<(StatusCode, Json<Todo>), AppError> {
    payload.validate()?;  // 验证失败自动返回 400
    // ... 创建逻辑
    todo!()
}

use crate::error::AppError;
use crate::models::todo::Todo;
use axum::extract::State;
use axum::http::StatusCode;
use axum::extract::Json;
use sqlx::SqlitePool;
```

---

## 19.8 完整项目组装

### 19.8.1 `src/main.rs` —— 入口文件

```rust
// src/main.rs
use axum::{
    routing::{get, post, put, delete},
    middleware,
    Router,
};
use tower_http::{
    cors::{CorsLayer, Any},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
mod error;
mod handlers;
mod models;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 初始化日志
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "todo_api=debug,tower_http=debug".to_string()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 加载环境变量
    dotenvy::dotenv().ok();

    // 连接数据库
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:todos.db".to_string());
    let pool = db::create_pool(&database_url).await?;

    // 构建路由
    let app = Router::new()
        // 健康检查
        .route("/health", get(|| async { "OK" }))
        // API 路由
        .nest("/api", api_routes())
        // 注入数据库连接池
        .with_state(pool)
        // 全局中间件
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any));

    // 启动服务器
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("🚀 服务器启动在 http://{}", addr);
    tracing::info!("📖 API 文档：http://{}/api/todos", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

fn api_routes() -> Router<sqlx::SqlitePool> {
    Router::new()
        .route("/todos", get(handlers::todos::list_todos).post(handlers::todos::create_todo))
        .route("/todos/{id}",
            get(handlers::todos::get_todo)
            .put(handlers::todos::update_todo)
            .delete(handlers::todos::delete_todo))
}

// 目录结构中的 mod 声明
// src/handlers/mod.rs:
// pub mod todos;
//
// src/models/mod.rs:
// pub mod todo;
```

### 19.8.2 运行项目

```bash
# 开发模式运行（使用 cargo-watch 自动重新编译）
cargo install cargo-watch
cargo watch -x run

# 或者直接运行
cargo run

# 测试 API
# 创建 Todo
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "学习 Rust", "description": "完成第19章"}'

# 获取所有 Todo
curl http://localhost:3000/api/todos

# 获取单个 Todo
curl http://localhost:3000/api/todos/<id>

# 更新 Todo
curl -X PUT http://localhost:3000/api/todos/<id> \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# 删除 Todo
curl -X DELETE http://localhost:3000/api/todos/<id>

# 分页和搜索
curl "http://localhost:3000/api/todos?page=1&limit=5"
curl "http://localhost:3000/api/todos?completed=false"
curl "http://localhost:3000/api/todos?search=Rust"
```

---

## 19.9 测试

### 19.9.1 单元测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_todo_creation() {
        let todo = Todo::new("测试".to_string(), Some("描述".to_string()));
        assert!(!todo.id.is_empty());
        assert_eq!(todo.title, "测试");
        assert_eq!(todo.description, Some("描述".to_string()));
        assert!(!todo.completed);
    }

    #[test]
    fn test_create_todo_validation() {
        // 空标题
        let req = CreateTodoRequest {
            title: "".to_string(),
            description: None,
        };
        assert!(req.validate().is_err());

        // 正常标题
        let req = CreateTodoRequest {
            title: "学习 Rust".to_string(),
            description: None,
        };
        assert!(req.validate().is_ok());

        // 超长标题
        let req = CreateTodoRequest {
            title: "a".repeat(201),
            description: None,
        };
        assert!(req.validate().is_err());
    }

    use crate::models::todo::*;
    use crate::error::AppError;
}
```

### 19.9.2 集成测试

```rust
// tests/api_tests.rs
use axum::{
    body::Body,
    http::{Request, StatusCode, Method},
};
use tower::ServiceExt;  // for `oneshot`
use serde_json::{json, Value};

// 辅助函数：创建测试应用
async fn test_app() -> axum::Router {
    let pool = sqlx::SqlitePool::connect("sqlite::memory:")
        .await
        .unwrap();

    // 运行迁移
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .unwrap();

    // 使用和主应用相同的路由配置
    axum::Router::new()
        .route("/api/todos",
            axum::routing::get(todo_api::handlers::todos::list_todos)
            .post(todo_api::handlers::todos::create_todo))
        .route("/api/todos/{id}",
            axum::routing::get(todo_api::handlers::todos::get_todo)
            .put(todo_api::handlers::todos::update_todo)
            .delete(todo_api::handlers::todos::delete_todo))
        .with_state(pool)
}

#[tokio::test]
async fn test_create_and_get_todo() {
    let app = test_app().await;

    // 创建 Todo
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/todos")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_string(&json!({
                        "title": "测试 Todo",
                        "description": "这是一个测试"
                    })).unwrap()
                ))
                .unwrap()
        )
        .await
        .unwrap();

    assert_eq!(create_response.status(), StatusCode::CREATED);

    let body = axum::body::to_bytes(create_response.into_body(), usize::MAX).await.unwrap();
    let todo: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(todo["title"], "测试 Todo");
    assert_eq!(todo["completed"], false);

    let todo_id = todo["id"].as_str().unwrap();

    // 获取 Todo
    let get_response = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/todos/{}", todo_id))
                .body(Body::empty())
                .unwrap()
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_list_todos_empty() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/todos")
                .body(Body::empty())
                .unwrap()
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let result: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(result["total"], 0);
    assert_eq!(result["data"].as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn test_get_nonexistent_todo() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/todos/nonexistent-id")
                .body(Body::empty())
                .unwrap()
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_create_todo_validation() {
    let app = test_app().await;

    // 空标题
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/todos")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_string(&json!({
                        "title": "",
                    })).unwrap()
                ))
                .unwrap()
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_update_todo() {
    let app = test_app().await;

    // 先创建
    let create_resp = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/todos")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_string(&json!({
                        "title": "原始标题",
                    })).unwrap()
                ))
                .unwrap()
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(create_resp.into_body(), usize::MAX).await.unwrap();
    let todo: Value = serde_json::from_slice(&body).unwrap();
    let id = todo["id"].as_str().unwrap();

    // 更新
    let update_resp = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PUT)
                .uri(format!("/api/todos/{}", id))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_string(&json!({
                        "title": "更新后的标题",
                        "completed": true,
                    })).unwrap()
                ))
                .unwrap()
        )
        .await
        .unwrap();

    assert_eq!(update_resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(update_resp.into_body(), usize::MAX).await.unwrap();
    let updated: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(updated["title"], "更新后的标题");
    assert_eq!(updated["completed"], true);
}

#[tokio::test]
async fn test_delete_todo() {
    let app = test_app().await;

    // 先创建
    let create_resp = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/todos")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_string(&json!({
                        "title": "要删除的",
                    })).unwrap()
                ))
                .unwrap()
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(create_resp.into_body(), usize::MAX).await.unwrap();
    let todo: Value = serde_json::from_slice(&body).unwrap();
    let id = todo["id"].as_str().unwrap();

    // 删除
    let delete_resp = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/api/todos/{}", id))
                .body(Body::empty())
                .unwrap()
        )
        .await
        .unwrap();

    assert_eq!(delete_resp.status(), StatusCode::NO_CONTENT);

    // 确认已删除
    let get_resp = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/todos/{}", id))
                .body(Body::empty())
                .unwrap()
        )
        .await
        .unwrap();

    assert_eq!(get_resp.status(), StatusCode::NOT_FOUND);
}

// 对比 JavaScript 测试 (supertest + jest)：
//
// const request = require('supertest');
// const app = require('./app');
//
// describe('POST /api/todos', () => {
//     it('should create a todo', async () => {
//         const res = await request(app)
//             .post('/api/todos')
//             .send({ title: '测试 Todo' })
//             .expect(201);
//
//         expect(res.body.title).toBe('测试 Todo');
//         expect(res.body.completed).toBe(false);
//     });
// });
//
// Axum 测试的优势：
// 1. 使用内存数据库，不需要启动服务器
// 2. 直接测试路由，不经过网络
// 3. 编译时检查测试代码
```

---

## 19.10 部署

### 19.10.1 Dockerfile

```dockerfile
# 多阶段构建 —— 最终镜像只有几 MB

# 第一阶段：构建
FROM rust:1.75 as builder

WORKDIR /app

# 先只复制依赖文件（利用 Docker 缓存层）
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm src/main.rs

# 复制源代码并重新编译
COPY . .
RUN touch src/main.rs  # 确保重新编译
RUN cargo build --release

# 第二阶段：运行
FROM debian:bookworm-slim

# 安装运行时依赖
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 只复制编译好的二进制文件
COPY --from=builder /app/target/release/todo-api .
COPY --from=builder /app/migrations ./migrations

# 设置环境变量
ENV PORT=3000
ENV DATABASE_URL=sqlite:todos.db
ENV RUST_LOG=todo_api=info

EXPOSE 3000

CMD ["./todo-api"]
```

```bash
# 构建镜像
docker build -t todo-api .

# 运行容器
docker run -p 3000:3000 -v ./data:/app/data -e DATABASE_URL=sqlite:/app/data/todos.db todo-api
```

### 19.10.2 对比部署大小

```
┌──────────────────────────────────────────────────────────────┐
│                    部署对比                                    │
├──────────────┬───────────────────┬───────────────────────────┤
│  指标         │  Rust (Axum)      │  Node.js (Express)        │
├──────────────┼───────────────────┼───────────────────────────┤
│  Docker 镜像  │  ~20 MB           │  ~200 MB                  │
│  二进制大小    │  ~5 MB            │  N/A (需要 Node.js)       │
│  内存占用      │  ~5-10 MB         │  ~50-100 MB               │
│  启动时间      │  ~10 ms           │  ~500 ms                  │
│  运行时依赖    │  无               │  Node.js + npm 包         │
│  冷启动        │  几乎没有          │  明显延迟                  │
│  并发性能      │  ~200K req/s      │  ~15K req/s               │
└──────────────┴───────────────────┴───────────────────────────┘
```

### 19.10.3 systemd 服务

```ini
# /etc/systemd/system/todo-api.service
[Unit]
Description=Todo API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/todo-api
ExecStart=/opt/todo-api/todo-api
Environment=PORT=3000
Environment=DATABASE_URL=sqlite:/opt/todo-api/data/todos.db
Environment=RUST_LOG=todo_api=info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# 部署步骤
sudo cp todo-api /opt/todo-api/
sudo cp -r migrations /opt/todo-api/
sudo systemctl enable todo-api
sudo systemctl start todo-api
sudo systemctl status todo-api

# 查看日志
sudo journalctl -u todo-api -f
```

### 19.10.4 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/todo-api
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 19.11 本章总结

```
┌──────────────────────────────────────────────────────────────────┐
│                  Axum Web API 开发全流程                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 框架选择：Axum（Tokio 生态、类型安全、高性能）                  │
│                                                                  │
│  2. 核心概念                                                      │
│     ├── 路由：Router::new().route("/path", get(handler))          │
│     ├── 提取器：Path, Query, Json, State                         │
│     ├── 响应：impl IntoResponse                                  │
│     └── 中间件：Tower Layer                                      │
│                                                                  │
│  3. 数据层                                                       │
│     ├── SQLx：编译时检查的 SQL                                    │
│     ├── 迁移：sqlx migrate                                       │
│     └── 连接池：SqlitePool                                       │
│                                                                  │
│  4. 错误处理                                                      │
│     ├── thiserror：定义错误类型                                    │
│     ├── IntoResponse：错误转 HTTP 响应                            │
│     └── anyhow：内部错误包装                                      │
│                                                                  │
│  5. 测试                                                         │
│     ├── 内存数据库：sqlite::memory:                               │
│     └── tower::ServiceExt::oneshot                               │
│                                                                  │
│  6. 部署                                                         │
│     ├── Docker 多阶段构建（~20MB 镜像）                           │
│     ├── systemd 服务                                             │
│     └── Nginx 反向代理                                            │
│                                                                  │
│  Express.js → Axum 速查表：                                      │
│  ┌─────────────────────┬──────────────────────────────────┐      │
│  │ Express              │ Axum                            │      │
│  ├─────────────────────┼──────────────────────────────────┤      │
│  │ app.get()            │ Router::new().route()           │      │
│  │ req.params           │ Path(param)                     │      │
│  │ req.query            │ Query(query)                    │      │
│  │ req.body             │ Json(body)                      │      │
│  │ res.json()           │ Json(data)                      │      │
│  │ res.status(201)      │ (StatusCode::CREATED, Json(..)) │      │
│  │ app.use(middleware)  │ .layer(middleware)               │      │
│  │ app.locals           │ State(state)                    │      │
│  │ next(err)            │ Result<T, AppError>             │      │
│  │ app.listen(port)     │ axum::serve(listener, app)      │      │
│  └─────────────────────┴──────────────────────────────────┘      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

> 🎉 **恭喜！** 你已经学会了用 Rust 构建完整的 Web API！从路由定义到数据库操作，从错误处理到部署上线，你掌握了一个 Rust 后端开发者需要的核心技能。
>
> 📝 **接下来可以尝试：**
> - 添加 JWT 认证
> - 集成 Redis 缓存
> - 添加 WebSocket 支持
> - 使用 OpenAPI/Swagger 生成文档
> - 实现速率限制
> - 添加 GraphQL 支持
