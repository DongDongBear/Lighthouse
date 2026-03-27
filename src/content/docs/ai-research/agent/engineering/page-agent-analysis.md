---
title: 阿里 PageAgent 源码深度分析 — 纯 JS 页内 GUI Agent 的实现
---

# 阿里 PageAgent 源码深度分析

> **来源**: [alibaba/page-agent](https://github.com/alibaba/page-agent) — GitHub 开源项目
> **日期**: 2026-03-12
> **标签**: `Agent` `GUI Agent` `DOM Manipulation` `Browser Automation` `Web`
> **源码版本**: v1.5.6，基于 [browser-use](https://github.com/browser-use/browser-use) 的 DOM 处理组件衍生

---

## 1. 这个项目解决了什么问题？

当前主流的 GUI Agent 方案（如 Browser Use、Playwright Agent）普遍依赖以下技术栈：

- 截图 + 多模态视觉模型识别 UI 元素
- 浏览器扩展或 Playwright/Puppeteer 等外部自动化框架
- Python 后端 + headless browser

这些方案的共同问题：**重**。需要额外的运行时环境、浏览器权限、多模态模型支持，无法轻量嵌入已有 Web 产品。

PageAgent 的核心思路完全不同：

> **不截图、不用多模态模型、不需要浏览器扩展、不需要 Python、不需要 headless browser。一段 JS 脚本注入页面，直接操作 DOM。**

这意味着你可以用一个 `<script>` 标签，给任何 Web 应用加上 AI Copilot 能力。

---

## 2. 整体架构

项目采用 monorepo 结构，分为 6 个核心包：

```
packages/
├── core/            # Agent 核心循环（ReAct loop）
├── page-controller/ # DOM 操作层（提取、交互、遮罩）
├── llms/            # LLM 调用封装（OpenAI 兼容接口）
├── page-agent/      # 用户入口（组合 core + controller + UI）
├── ui/              # 面板 UI（任务输入、执行过程展示）
└── extension/       # Chrome 扩展（多标签页 Agent）
```

**数据流**：

```
用户输入自然语言任务
       ↓
  PageAgent.execute(task)
       ↓
  ┌─────────────────────────────────┐
  │        ReAct Agent Loop         │
  │                                 │
  │  1. Observe: 提取 DOM 状态      │
  │  2. Think:   LLM 推理+决策      │
  │  3. Act:     执行 DOM 操作       │
  │  4. Loop:    回到第 1 步         │
  └─────────────────────────────────┘
       ↓
  done / error / 超过 maxSteps
```

---

## 3. 核心模块详解

### 3.1 DOM 提取 — 把网页"翻译"成文本

这是整个项目最关键的模块，位于 `page-controller/src/dom/`。

**核心问题**：LLM 看不到屏幕，如何让它理解页面上有什么？

**解决方案**：遍历 DOM 树，提取所有可交互元素，生成一段带索引的简化 HTML 文本。

#### 3.1.1 DOM 树扁平化

`dom_tree/index.js`（移植自 browser-use）负责将整个 DOM 树扁平化：

```javascript
// 返回一个扁平化的 DOM 树结构
{
  rootId: "node_0",
  map: {
    "node_0": { tagName: "body", children: ["node_1", "node_2", ...] },
    "node_1": { type: "TEXT_NODE", text: "Hello", isVisible: true },
    "node_2": {
      tagName: "button",
      isInteractive: true,
      highlightIndex: 0,      // 可交互元素的序号
      ref: HTMLButtonElement,  // 直接保存 DOM 引用！
      attributes: { "aria-label": "Submit" }
    }
  }
}
```

关键步骤：

1. **递归遍历 DOM**，跳过 `<script>`、`<style>`、`<svg>` 等非内容节点
2. **可见性检测**：通过 `getBoundingClientRect()`、`checkVisibility()`、`getComputedStyle()` 判断元素是否真正可见（不是 display:none、visibility:hidden、零尺寸等）
3. **可交互性检测**：这是最精妙的部分

#### 3.1.2 可交互元素检测

判断一个元素是否"可交互"，PageAgent 使用了多层策略叠加：

```
第一层：cursor 样式检测
  ↓ 如果 getComputedStyle(element).cursor === 'pointer' → 可交互
  ↓ 这一招能覆盖绝大多数自定义点击元素

第二层：HTML 语义标签
  ↓ <a>, <button>, <input>, <select>, <textarea>, <details>, <summary> 等

第三层：ARIA role 检测
  ↓ role="button", role="tab", role="checkbox", role="slider" 等

第四层：class / attribute 启发式
  ↓ class 包含 "button", "dropdown-toggle"
  ↓ data-toggle="dropdown", aria-haspopup="true"

第五层：contenteditable 检测
  ↓ contenteditable="true" 的元素

排除条件：
  ↓ disabled, readonly, inert 属性
  ↓ cursor: not-allowed / no-drop
  ↓ 在 interactiveBlacklist 中
```

其中第一层 cursor 样式检测是整个方案里最巧妙的设计。源码注释写道：

> *"Genius fix for almost all interactive elements"*

因为现代 Web 应用中，无论开发者用什么方式实现点击（onClick、addEventListener、Vue/React 事件绑定），几乎都会给可点击元素设置 `cursor: pointer`。这一个 CSS 属性就能覆盖大部分场景。

#### 3.1.3 生成 LLM 可读的简化 HTML

扁平化之后，`flatTreeToString()` 将 DOM 树转换为 LLM 能理解的文本格式：

```
[0]<a aria-label=首页 />
[1]<div >PageAgent
UI Agent in your webpage />
[2]<button role=button>快速开始 />
[3]<input placeholder=搜索... type=text />
无需后端改造，几行代码即可集成
[4]<a target=_blank>查看文档 />
```

格式规则：

- `[N]` 前缀标记可交互元素的索引，LLM 通过索引来指定操作目标
- `*[N]` 标记自上一步以来新出现的元素（帮助 LLM 感知页面变化）
- 缩进（tab）表示父子关系
- 没有 `[N]` 前缀的纯文本是页面上的静态内容，提供上下文
- attributes 会选择性保留（aria-label、placeholder、role、type 等），去掉冗余

**属性去重逻辑**：如果 aria-label 的值和元素文本内容一样，就不重复输出。如果多个属性值相同（>5字符），也会去重。这些细节减少了 token 消耗。

### 3.2 ReAct Agent Loop — 观察-思考-行动

核心 Agent 循环在 `core/src/PageAgentCore.ts` 中实现，遵循经典的 ReAct (Reasoning + Acting) 范式：

```typescript
while (true) {
  // 1. OBSERVE — 获取当前页面状态
  browserState = await this.pageController.getBrowserState()
  // 处理系统观察（URL变化、等待超时、步数告警）

  // 2. THINK — 组装 prompt，调用 LLM
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: assembledUserPrompt }
  ]
  const result = await llm.invoke(messages, macroTool)

  // 3. ACT — 执行 LLM 决定的 action
  // done / click_element_by_index / input_text / scroll / wait / ...

  // 4. 如果 action 是 done，结束循环
  if (actionName === 'done') return result

  step++
  if (step > maxSteps) return error
}
```

#### 3.2.1 Prompt 组装

每一步的 user prompt 由四部分组成：

```xml
<instructions>              <!-- 可选：用户自定义指令 + 页面指令 + llms.txt -->
</instructions>

<agent_state>
  <user_request>填写订单表单</user_request>
  <step_info>Step 3 of 40 max possible steps</step_info>
</agent_state>

<agent_history>             <!-- 之前所有步骤的摘要 -->
  <step_1>
    Evaluation: 成功点击了登录按钮
    Memory: 已登录，当前在订单页面
    Next Goal: 找到表单并填写
    Action Results: ✅ Clicked element (登录)
  </step_1>
  <sys>Page navigated to → https://example.com/orders</sys>
</agent_history>

<browser_state>             <!-- 当前页面的 DOM 状态 -->
  Current Page: [订单管理](https://example.com/orders)
  Page info: 1920x1080px viewport, 2400px total height...

  [0]<input placeholder=订单号 type=text />
  [1]<select >请选择类型 />
  [2]<button >提交 />

  ... 300 pixels below - scroll to see more ...
</browser_state>
```

#### 3.2.2 MacroTool — 把所有工具打包成一个

这是一个有趣的设计选择。PageAgent 不是给 LLM 提供多个 tool，而是把所有操作打包成一个 `AgentOutput` MacroTool：

```typescript
{
  evaluation_previous_goal: string,  // 评估上一步
  memory: string,                     // 工作记忆
  next_goal: string,                  // 下一步目标
  action: {                           // 选择一个操作
    click_element_by_index: { index: 3 }
    // 或 input_text: { index: 1, text: "hello" }
    // 或 scroll: { down: true, num_pages: 1 }
    // 或 done: { text: "完成", success: true }
  }
}
```

好处是：

- **强制 LLM 每步都做反思**（evaluation + memory + next_goal），不会跳过思考直接操作
- **每步只执行一个操作**，降低出错概率
- **使用 `toolChoiceName: 'AgentOutput'` 强制 LLM 调用此工具**，避免 LLM 自由发挥不调工具

### 3.3 DOM 操作层 — 模拟真实用户交互

`page-controller/src/actions.ts` 实现了具体的 DOM 操作，核心思路是模拟真实的浏览器事件序列。

#### 3.3.1 点击

不是简单的 `element.click()`，而是完整的事件链：

```javascript
async function clickElement(element) {
  // 1. 先滚动到可见区域
  await scrollIntoViewIfNeeded(element)

  // 2. 移动"鼠标指针"到元素中心（UI 反馈用）
  await movePointerToElement(element)

  // 3. 模拟完整的鼠标事件序列
  element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
  element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  element.focus()
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}
```

为什么不直接 `element.click()`？因为很多前端框架（React、Vue）和组件库监听的不只是 click 事件，可能在 mousedown、mouseup 等阶段就有处理逻辑。完整的事件链能最大程度兼容各种实现。

#### 3.3.2 文本输入

输入更复杂，需要处理三种情况：

```
普通 <input> / <textarea>:
  → 使用原生 value setter（绕过 React 等框架的受控组件拦截）
  → 然后触发 input 事件

contenteditable 元素:
  → 先 dispatch beforeinput(deleteContent) 清空
  → 再 dispatch beforeinput(insertText) + 修改 innerText
  → 最后 dispatch input + change + blur
```

这里有个精妙的细节——使用 `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` 来获取原生的 value setter，绕过 React 等框架对 value 属性的覆写：

```javascript
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
).set

// 直接调用原生 setter，React 不会拦截
nativeInputValueSetter.call(element, text)
element.dispatchEvent(new Event('input', { bubbles: true }))
```

### 3.4 System Prompt — Agent 的行为规范

系统提示词定义了 Agent 的完整行为框架：

**输入理解**：告诉 LLM 它会收到 agent_history、agent_state、browser_state 三部分信息。

**交互规则**：
- 只能操作有 `[index]` 的元素
- 缩进表示父子关系
- `*[index]` 是新出现的元素
- 看不到的内容需要滚动
- 不要重复同一个动作超过 3 次

**能力边界**（这点很好）：
- 明确告诉 LLM "It is ok to fail"
- 网页可能有 bug，如实告知用户
- 遇到验证码直接告知用户无法处理
- 尝试过度可能有害，宁可失败也不要胡搞

**推理规范**：
- 每步必须评估上一步是否成功
- 不能假设操作成功了就真的成功了
- 如果预期变化没有出现，标记为失败并制定恢复方案

### 3.5 Chrome 扩展 — 多标签页支持

`packages/extension/` 实现了可选的 Chrome 扩展，扩展了 Agent 的能力范围：

- `MultiPageAgent` 继承 `PageAgentCore`，增加标签页管理
- `TabsController` 管理多个浏览器标签页
- `RemotePageController` 通过 Chrome 消息通道远程操作其他标签页的 DOM
- 心跳机制保活：每秒更新 `chrome.storage.local` 中的时间戳

---

## 4. 与其他方案的对比

| 维度 | PageAgent | Browser Use | Playwright Agent |
|------|-----------|-------------|-----------------|
| 运行环境 | 浏览器页内 JS | Python + Browser | Node.js + Browser |
| 需要截图 | 否 | 是 | 否 |
| 需要多模态模型 | 否 | 是 | 否 |
| 需要浏览器扩展 | 否（可选） | 否 | 否 |
| 集成难度 | 一行 script 标签 | 需要 Python 环境 | 需要 Node 环境 |
| 跨页面能力 | 需扩展 | 原生支持 | 原生支持 |
| Canvas/WebGL | 无法处理 | 可通过截图 | 无法处理 |
| SPA 兼容 | 好（页内运行） | 一般 | 一般 |

**PageAgent 的最佳场景**：

- 给已有 SaaS 产品嵌入 AI Copilot（几行代码集成）
- 表单自动填写、流程自动化
- 内部管理系统的 AI 助手
- 无障碍访问（通过自然语言操控页面）

**不适合的场景**：

- Canvas/WebGL 渲染的应用（纯 DOM 操作无能为力）
- 需要跨多个网站操作的复杂任务（除非用扩展）
- 需要高精度视觉理解的场景（比如识别图表内容）

---

## 5. 技术亮点总结

1. **cursor: pointer 启发式**：用一个 CSS 属性覆盖了绝大多数可交互元素的检测，简洁而有效
2. **MacroTool 设计**：强制 LLM 在每步操作前进行反思（evaluation + memory + next_goal），提升推理质量
3. **原生 value setter 绕过框架拦截**：解决了 React 受控组件的输入问题
4. **完整事件链模拟**：不是简单 click()，而是 mouseenter → mouseover → mousedown → focus → mouseup → click 完整序列
5. **DOM ref 直接引用**：扁平化 DOM 树时直接保存 HTMLElement 引用，操作时无需重新查找
6. **增量变化标记**：新出现的元素用 `*[N]` 标记，帮助 LLM 感知 UI 变化
7. **性能缓存**：WeakMap 缓存 boundingRect、computedStyle、clientRects，避免重复计算
8. **llms.txt 支持**：实验性支持页面提供的 `llms.txt` 文件，让网站可以为 AI Agent 提供操作指南

---

## 6. 源码结构速查

```
packages/core/src/
├── PageAgentCore.ts        # Agent 主循环（ReAct loop）
├── tools/index.ts          # 内置工具定义（click, input, scroll, done, wait...）
├── prompts/system_prompt.md # 系统提示词
├── types.ts                # 类型定义
└── utils/                  # 工具函数（autoFixer, fetchLlmsTxt）

packages/page-controller/src/
├── PageController.ts       # DOM 状态管理 + 浏览器状态输出
├── actions.ts              # DOM 操作实现（click, input, scroll）
├── dom/
│   ├── index.ts            # DOM 树处理（扁平化、字符串化、高亮）
│   ├── dom_tree/index.js   # DOM 遍历核心（移植自 browser-use）
│   ├── dom_tree/type.ts    # DOM 节点类型定义
│   └── getPageInfo.ts      # 页面信息（视口、滚动位置）
├── mask/                   # 操作遮罩（防止用户干扰自动化）
└── patches/                # 框架兼容补丁（React）

packages/llms/src/
├── OpenAIClient.ts         # OpenAI 兼容 API 调用
└── types.ts                # LLM 类型定义

packages/extension/src/
├── agent/MultiPageAgent.ts # 多标签页 Agent
├── agent/TabsController.ts # 标签页管理
└── agent/RemotePageController.ts # 远程 DOM 操控
```

---

## 7. 一句话总结

PageAgent 证明了一件事：**GUI Agent 不一定需要"看"屏幕**。通过精巧的 DOM 解析 + 文本化表示 + ReAct 推理循环，纯文本 LLM 就能操控 Web 界面。这条路线虽然对 Canvas/WebGL 无能为力，但在 DOM 主导的 Web 应用中，它比截图方案更轻量、更快、更容易集成。

对于想给自己的 Web 产品加 AI 能力的开发者来说，这可能是目前集成成本最低的方案。
