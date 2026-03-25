---
title: MiniMax Skills 深度源码分析 — AI Agent Skill 生态的标杆项目
---

# MiniMax Skills 深度源码分析 — AI Agent Skill 生态的标杆项目

> **来源**: [MiniMax-AI/skills](https://github.com/MiniMax-AI/skills)
> **作者**: MiniMax AI
> **日期**: 2026-03-26
> **标签**: `Agent Skills` `Prompt Engineering` `OpenXML` `Shader` `Multimodal` `Claude Code` `Cursor` `Codex`
> **许可**: MIT

---

## 一句话总结

MiniMax Skills 是目前公开可见的最深度、最系统化的 AI Agent Skill 库，覆盖前端/全栈/移动端/Shader/Office 文档/多模态生成六大领域，其核心创新在于"知识系统工程"而非简单的 Prompt Engineering——通过 references/scripts/SKILL.md 三层架构，将领域专家知识转化为 Agent 可执行的能力。

---

## 目录

1. [项目整体架构分析](#1-项目整体架构分析)
2. [每个 Skill 的深度剖析](#2-每个-skill-的深度剖析)
3. [跨 Skill 共性模式分析](#3-跨-skill-共性模式分析)
4. [Plugin 系统分析](#4-plugin-系统分析)
5. [PR Review 系统分析](#5-pr-review-系统分析)
6. [与竞品对比](#6-与竞品对比)
7. [创新点与不足之处](#7-创新点与不足之处)
8. [对 AI Agent Skill 生态的启示](#8-对-ai-agent-skill-生态的启示)

---

## 1. 项目整体架构分析

### 1.1 目录结构设计哲学

```
minimax-skills/
├── .claude-plugin/          # Claude Code 平台适配
├── .cursor-plugin/          # Cursor 平台适配
├── .codex/                  # Codex 平台适配
├── .opencode/               # OpenCode 平台适配
├── .claude/skills/pr-review/# 内部治理工具（非对外 Skill）
├── skills/                  # 核心：11 个对外 Skill
│   └── <skill-name>/
│       ├── SKILL.md         # 唯一必需文件：主 Prompt
│       ├── references/      # 可选：深度参考文档
│       └── scripts/         # 可选：可执行工具链
├── plugins/                 # 复合 Plugin（含子 Agent 编排）
│   └── pptx-plugin/
├── CONTRIBUTING.md          # 贡献规范
├── README.md / README_zh.md # 双语文档
└── LICENSE                  # MIT
```

这一结构体现了三层设计哲学：

**第一层：约定优于配置（Convention over Configuration）。** 整个项目的核心约定极其简洁——一个目录就是一个 Skill，`SKILL.md` 是唯一必需文件。这种设计让新贡献者的入门门槛降到最低：你只需要创建一个文件夹、写一个 Markdown，就完成了一个 Skill。这与 Unix 哲学中"一切皆文件"的理念一脉相承。

**第二层：渐进增强（Progressive Enhancement）。** `references/` 和 `scripts/` 都是可选的。简单 Skill（如 ios-application-dev）可以纯靠 Markdown 实现；复杂 Skill（如 minimax-xlsx）可以带上完整的工具链。这种设计避免了"一刀切"的框架负担。

**第三层：关注点分离（Separation of Concerns）。** `SKILL.md` 负责"告诉 Agent 怎么思考"，`references/` 负责"告诉 Agent 领域知识"，`scripts/` 负责"让 Agent 有手有脚"。三者的边界清晰，各自可以独立演进。

### 1.2 模块划分思路

11 个 Skill 可以按功能域划分为四个象限：

| 象限 | Skill | 核心特征 |
|------|-------|----------|
| **开发类** | frontend-dev, fullstack-dev | 端到端应用开发引导 |
| **平台类** | android-native-dev, ios-application-dev | 平台规范+最佳实践 |
| **文档类** | minimax-docx, minimax-xlsx, minimax-pdf, pptx-generator | Office XML 操控 |
| **创意类** | shader-dev, gif-sticker-maker, minimax-multimodal-toolkit | 生成式内容创作 |

这一划分有一个隐含的设计意图：**每个象限内的 Skill 互补而不重叠**。例如文档类四个 Skill 分别对应 Word/Excel/PDF/PPT 四种格式，在 CONTRIBUTING.md 中也明确要求"Avoid Overlap"。

### 1.3 数据流模型

项目中存在两种截然不同的数据流模式：

1. **纯知识注入型**（fullstack-dev, android-native-dev, ios-application-dev）：SKILL.md 和 references 被加载到 Agent 上下文窗口 → Agent 基于注入知识生成代码。数据流是单向的：`知识 → 上下文 → 代码输出`。

2. **工具编排型**（minimax-xlsx, minimax-pdf, gif-sticker-maker, minimax-multimodal-toolkit）：Agent 不仅需要知识，还需要调用 scripts/ 中的外部工具。数据流是双向的：`知识 → 上下文 → 调用脚本 → 解析输出 → 继续推理`。

这两种模式的共存，使得项目同时覆盖了"思考型任务"和"动手型任务"，大幅拓展了 AI Agent 的能力边界。

---

## 2. 每个 Skill 的深度剖析

### 2.1 frontend-dev

**定位**：一站式前端开发 + 多媒体资产生成 + 营销文案框架

#### 设计规范体系

SKILL.md 开篇定义了三个"基线旋钮"——这是整个项目中最独特的 Prompt Engineering 技巧之一：

```
DESIGN_VARIANCE = 8   # 设计多样性（1-10）
MOTION_INTENSITY = 6  # 动画强度（1-10）
VISUAL_DENSITY = 4    # 视觉密度（1-10）
```

这本质上是将"设计品味"参数化。Agent 在生成代码时，会根据这三个数值做决策——VARIANCE=8 意味着"大胆创新"，DENSITY=4 意味着"留白优先"。这种参数化的设计语言比模糊的自然语言指令（如"做得漂亮些"）精确得多。

紧接着是"Anti-Slop"系统——一个极具实战价值的设计：

```
FORBIDDEN:
- liquid-glass, frosted-glass-overlay (除非用户明确请求)
- magnetic-cursor-blob
- perpetual-floating-particles
- layout-shift-on-every-scroll
- stagger-all-the-things
```

这是对 AI 生成前端代码的"审美纠偏"。LLM 在训练数据中见过太多 dribbble 风格的"花哨"UI，倾向于过度使用毛玻璃、粒子特效等。Anti-Slop 列表是对这种过拟合的显式约束。

#### 动画系统（Motion Engine）

动画系统的核心是一个**工具选型矩阵**：

| 需求场景 | 推荐工具 |
|---------|----------|
| 进入/退出/布局变化 | Framer Motion |
| 滚动驱动/时间线控制 | GSAP + ScrollTrigger |
| JSON 动画资产 | Lottie |
| 3D 场景/粒子 | Three.js / R3F |
| 简单过渡 | CSS Transitions |

`references/motion-recipes.md` 提供了 10 个生产级动画代码片段（不是伪代码，是可运行的 TSX/CSS）。这些 Recipe 都遵循"声明式 + 最小 API 面"原则，每个 Recipe 都附带性能约束（如"GPU-only properties: transform, opacity"）。

#### MiniMax API 集成

四个 Python 脚本构成了一套 CLI 工具链，亮点包括：

1. **同步 vs 异步的区别对待**：TTS/Image/Music 是同步 API，Video 是异步 API（创建任务→轮询→下载三阶段流水线）
2. **统一的错误处理模式**：所有脚本在入口处检查环境变量，失败时给出精确的修复命令——这不是给人看的，而是给 Agent 看的
3. **Prompt 优化旁路**：Image 脚本支持 `--optimize` 标志，让 API 端自动优化用户的 prompt

#### 文案框架

嵌入了完整的营销文案框架：AIDA（注意→兴趣→欲望→行动）、PAS（痛点→放大→方案）、FAB（特性→优势→利益），将一个前端开发 Skill 的边界延伸到了增长黑客领域。

---

### 2.2 fullstack-dev

**定位**：全栈应用开发的架构决策引擎

这是整个项目中最大的单文件 SKILL.md（34,810 字节），也是设计理念最"学院派"的 Skill。

#### 强制工作流

SKILL.md 开篇定义了一个**强制执行**的 Step 0-7 工作流：

```
Step 0: Gather Requirements
Step 1: Scaffold Structure
Step 2: Config & Environment
Step 3: Database Layer
Step 4: Authentication & Authorization
Step 5: API Layer
Step 6: Frontend Integration
Step 7: Pre-launch Hardening
```

关键词是"MANDATORY"——Agent 被要求在写任何代码之前必须走完 Step 0 的需求收集。这是一种对 AI Agent "先开枪后瞄准"倾向的显式纠正。

#### 认证设计的决策树

`references/auth-flow.md` 提供了多层认证方案的决策树，每种方案都附带完整的实现模板和**选型理由**。这种"教 Agent 决策"而非"教 Agent 编码"的方式是高级 Skill 的标志。

#### 八维知识图谱

八个 reference 文件构成了从"选型到上线"的全链路知识图谱：

```
technology-selection.md ──→ db-schema.md ──→ api-design.md
                                              ↓
environment-management.md ──→ auth-flow.md ──→ testing-strategy.md
                                              ↓
                              django-best-practices.md
                                              ↓
                              release-checklist.md
```

---

### 2.3 android-native-dev

**定位**：Android 原生开发的全方位指南，以 Material Design 3 为核心

核心亮点：
- **Dynamic Color** 实现（壁纸取色 + SDK 版本回退）
- **量化性能体系**（冷启动 < 500ms、帧渲染 < 16ms、ANR < 5s）
- **深度无障碍实现**（焦点管理、语义树、TalkBack 导航）
- **7 种应用风格原型**（极简、专业、健康、儿童、社交、效率、电商），Agent 接到需求后自动匹配

---

### 2.4 ios-application-dev

**定位**：iOS 开发的精练指南，强调 Apple HIG 合规

**UIKit/SwiftUI 双轨策略**是独特之处——不偏不倚地同时覆盖两种范式，因为截至 2026 年大量企业项目仍在混合态。

将 Apple HIG 的抽象原则转化为可检查的清单（Safe Area、Dynamic Type、暗色模式、隐私处理），并在 Anti-Patterns 部分列出了 SwiftUI 初学者常犯的错误。

意外亮点：`references/metal-shader.md` 将 Metal Shading Language 浓缩在 179 行中，使 iOS Skill 能处理图形密集型场景。

---

### 2.5 shader-dev

**定位**：GLSL/WebGL Shader 技术百科全书

这是整个项目中文件数量最多的 Skill（75 个文件），其核心创新是 **reference/techniques 双层架构**：

- **techniques/**（37 个文件）：面向行动的实现指南。每个文件遵循统一结构：Core Principles → Step-by-Step → Code Template → Common Pitfalls
- **reference/**（37 个文件）：面向理解的深度文档。包含数学推导（如 Cook-Torrance BRDF 的 DFG 积分）、变体分析

两层是一一对应的（37 对 37），通过 SKILL.md 中的路由表实现**惰性加载的知识检索**。

37 个技术领域覆盖了完整的 Shader 技术栈，从基础设施（ray-marching, SDF）到程序化生成（noise, domain-warping）到渲染进阶（volumetric, path-tracing）到模拟仿真（fluid, particle）再到音频合成（sound-synthesis）。

---

### 2.6 minimax-docx — .NET OpenXML SDK 工具链

**定位**：DOCX 文档的创建、编辑和模板应用——基于 .NET 8 + OpenXML SDK 3.x 的底层操控

**技术栈选型理由**：选择 .NET OpenXML SDK 而非 python-docx，因为：(1) OpenXML SDK 是 Microsoft 官方 SDK，100% 覆盖 OOXML 规范；(2) python-docx 不支持 track changes、comments、XSD 验证；(3) .NET 提供强类型 API，编译时捕获结构错误；(4) XSD 验证需要 `System.Xml.Schema`，Python 无等效物。

#### 三管道路由与完整数据流

```
用户任务
├─ 无输入文件 → Pipeline A: CREATE
│   palette选择 → AestheticRecipeSamples (13种排版配方)
│   → CLI (dotnet run create) 或 直接 C# SDK
│   → ElementOrder 排序 → MergeRuns 合并 → Validate
│
├─ 有输入文件 + 替换内容 → Pipeline B: EDIT
│   → 分析现有结构 (Analyze命令)
│   → 文本替换/占位符填充/表格编辑
│   → Diff 对比验证 → MergeRuns → Validate
│
└─ 有输入文件 + 重排版 → Pipeline C: TEMPLATE
    ├─ C-1 OVERLAY (≤30段, 无封面/目录)
    │   → 复制 styles.xml + theme + numbering
    │   → 三级样式映射 (精确ID → 名称匹配 → 手动字典)
    │   → 清理直接格式 → Gate-Check (强制)
    │
    └─ C-2 BASE-REPLACE (>100段, 有封面/目录/示例区)
        → 模板作为基础文档
        → 内容区替换 → Relationship ID 重映射
        → 合并 headers/footers → Gate-Check (强制)
```

#### 核心算法深解

**Run Merger 算法** (`RunMerger.cs`)：Word 可能将 "Hello World" 分散在 3 个 `<w:r>` 节点中——跨 run 的文本搜索/替换前必须先合并。算法遍历段落中所有相邻 run，比较 `<w:rPr>` 的序列化 XML 字符串是否完全一致，一致则合并 `<w:t>` 文本。关键细节：合并前必须处理 `xml:space="preserve"` 避免空格丢失。

**Element Order 排序** (`ElementOrder.cs`)：硬编码字典存储 11 种父元素的合法子元素顺序（w:body, w:p, w:pPr, w:r, w:rPr, w:tbl, w:tblPr, w:tr, w:trPr, w:tc, w:tcPr, w:sectPr, w:hdr, w:ftr），递归遍历 XML 树重排。**违反顺序 = Word 静默损坏或拒绝打开**。

**三级样式映射**（Pipeline C 的核心难题）：

| 级别 | 匹配策略 | 示例 |
|------|---------|------|
| Tier 1 | `source.styleId == template.styleId` | "Heading1" → "Heading1" |
| Tier 2 | `source.styleName == template.styleName` | name="heading 1" 跨文档匹配 |
| Tier 3 | 手动字典覆盖 | 处理中文模板的数字 styleId: "1","2","3","a","a0" |

**Relationship ID 重映射**：扫描源文档所有 rId 找最大值 → 模板 rId 从 max+1 开始重编 → 更新所有复制部件中的引用（headers, footers, images, hyperlinks）→ 去重超链接关系。

#### 三级验证体系

| 级别 | 检查内容 | 触发条件 |
|------|---------|---------|
| Level 1 (XSD) | 元素顺序、缺失属性 → 导致 Word 无法打开 | 所有管道 |
| Level 2 (业务规则) | 页边距 360-4320 DXA、字号 8-72pt、标题层级连续 | 所有管道 |
| Level 3 (Gate-Check) | 模板完整性检查 | **仅 Pipeline C 强制** |

自动修复能力：`fix-order` 命令可自动修复元素顺序错误。

#### 13 种美学配方

配方来源涵盖 IEEE、ACM、APA、Nature、HBR、GB/T 9704 等权威标准，每个配方协调字体族、字号梯度、行距、页边距、颜色、表格样式。这不是自由排版——而是**防止 AI 做出业余排版决策**。

#### .NET 工具链架构

项目包含完整的 .NET 解决方案（~50+ C# 源文件）：

| 模块 | 核心类 | 职责 |
|------|--------|------|
| Commands/ | CreateCommand, EditContentCommand, ApplyTemplateCommand, ValidateCommand, AnalyzeCommand, DiffCommand, FixOrderCommand, MergeRunsCommand | 8 个独立命令 |
| OpenXml/ | RunMerger, ElementOrder, StyleAnalyzer, CommentSynchronizer, TrackChangesHelper, UnitConverter, NamespaceConstants | 底层 XML 操作 |
| Typography/ | CjkHelper, FontDefaults, PageSizes | CJK 排版支持 |
| Validation/ | XsdValidator, BusinessRuleValidator, GateCheckValidator, ValidationResult | 三级验证 |
| Samples/ | 11 个 Samples 类（Aesthetic Batch 1-4, Character, Document, Field, Footnote, Header, Image, List, Paragraph, Style, Table, TrackChanges） | 代码生成范例 |

---

### 2.7 minimax-xlsx — XML 直操零损失策略

**定位**：Excel 文件的底层 XML 操控——零格式损失编辑

**技术栈选型理由**：选择 Python + 原生 ElementTree 直操 XML，**严禁 openpyxl round-trip**。原因：`openpyxl.save()` 静默丢弃 VBA macros、pivot tables、sparklines、slicers、conditional formatting、data validation——这些是用户文件中最有价值的部分。

#### 五路径完整数据流

```
READ路径:
  xlsx_reader.py → pandas读取 → 结构/质量审计 → JSON/人可读报告

CREATE路径:
  复制 templates/minimal_xlsx/ (7文件骨架)
  → 手动编辑 XML (sharedStrings + worksheet + workbook + styles)
  → xlsx_pack.py (ZIP打包 + XML校验)
  → formula_check.py (Tier 1 静态)
  → libreoffice_recalc.py (Tier 2 动态, 可选)

EDIT路径:
  xlsx_unpack.py (解压 + pretty-print + 高危内容警告)
  → 手术式 XML 编辑 (Edit tool only)
  → xlsx_shift_rows.py (行偏移级联更新, 如需)
  → xlsx_add_column.py / xlsx_insert_row.py (如需)
  → xlsx_pack.py → formula_check.py → libreoffice_recalc.py

FIX路径:
  formula_check.py 识别7种错误 → 解压 → 修复 <f> 元素 → 打包 → 重新验证

VALIDATE路径:
  Tier 1: formula_check.py (静态, 无外部依赖)
  Tier 2: libreoffice_recalc.py → formula_check.py (对重算后文件再扫)
```

#### 核心算法深解

**公式行引用偏移算法** (`xlsx_shift_rows.py::_shift_refs()`)——这是整套工具链中最复杂的算法：

```python
# 正则: (\$?)([A-Z]+)(\$?)(\d+) 匹配单元格引用
# 逻辑:
#   1. 分割公式中的引号sheet名 ('Budget FY2025'!B5) 避免破坏
#   2. 对每个匹配:
#      - 如果 row >= insertion_point: row += delta
#      - 保留 $ 绝对引用标记
#      - 整列引用 (B:B) 不动
#   3. 级联更新范围:
#      - <mergeCell ref="A5:C7"> 的起止行
#      - <conditionalFormatting sqref="...">
#      - <dataValidations sqref="...">
#      - <dimension ref="A1:D20">
#      - xl/tables/*.xml 的 ref 属性
#      - xl/charts/*.xml 的 <numRef><f> 和 <strRef><f>
#      - xl/pivotCaches/*.xml 的 <worksheetSource ref="...">
```

**样式间接引用链** (`style_audit.py`)——xlsx 的样式通过多级索引链传递：

```
cell s="3" → cellXfs[3] → {fontId:2, fillId:0, borderId:0, numFmtId:165}
                            ↓           ↓           ↓            ↓
                        fonts[2]    fills[0]    borders[0]   numFmts[165]
                        (蓝色)      (无填充)     (无边框)     ($#,##0)
```

**关键规则：只能追加，永不修改现有 `<xf>`** — 因为所有单元格通过索引引用。

**SharedStrings 管理**：每个文本值对应 `<si>` 元素，单元格用 `t="s"` + `<v>索引</v>` 引用。`count` 和 `uniqueCount` 必须精确。**永不删除或重排 `<si>`** — 会破坏所有引用该索引的单元格。

#### 十脚本速查

| 脚本 | 核心逻辑 | 关键数据结构 |
|------|---------|------------|
| `xlsx_reader.py` | pandas 读取 + 数据质量审计 (null/重复/离群值/类型混合) | DataFrame + 审计报告 |
| `xlsx_unpack.py` | ZIP 解压 + XML pretty-print + 高危内容警告 | zipfile → 目录树 |
| `xlsx_pack.py` | 目录打包 + 所有 XML 校验 | 目录树 → ZIP |
| `formula_check.py` | 7 种错误值扫描 + 跨 sheet 引用验证 + shared formula 完整性 | XML 遍历 → 错误列表 |
| `xlsx_add_column.py` | 列添加 + 公式注入 + 样式继承 + dimension 更新 | XML element 追加 |
| `xlsx_insert_row.py` | 行插入 + 内部调用 shift_rows + sharedStrings 更新 | 行级 XML 操作 |
| `xlsx_shift_rows.py` | 正则匹配公式中的行引用 + 全文件级联更新 | 正则替换 + 多文件扫描 |
| `shared_strings_builder.py` | 字符串去重 + XML 转义 + 空格保留 | 列表 → `<sst>` XML |
| `libreoffice_recalc.py` | LibreOffice headless 重算 + 超时处理 | subprocess + 文件转换 |
| `style_audit.py` | 样式索引链解析 + 颜色角色违规检测 | cellXfs 索引 → font → color |

#### 金融语义着色系统

| 颜色 | 语义 | 用途 |
|------|------|------|
| 蓝色 | 输入/假设 | 用户可编辑的单元格 |
| 黑色 | 公式/计算 | 自动派生值 |
| 绿色 | 跨 sheet 引用 | 引用其他工作表的公式 |
| 黄色填充 | 关键假设 | 高亮重要参数 |

这是投行/咨询行业的标准实践，便于审计和模型审查。

#### 二级验证与理由

| 级别 | 检查方式 | 为什么需要 |
|------|---------|-----------|
| Tier 1 (静态) | formula_check.py 扫描缓存的错误值 | 捕获已知的 `#REF!`, `#NAME?` 等 |
| Tier 2 (动态) | LibreOffice headless 重算后再跑 Tier 1 | 新创建的公式 `<v>` 为空，静态检查看不出运行时错误 |

---

### 2.8 minimax-pdf — Token 化设计系统

**定位**：PDF 的创建、表单填充和重排——基于 Token 传播的设计系统

**技术栈选型理由**：封面用 HTML/CSS + Playwright（flexbox/SVG/渐变/Google Fonts 布局能力远超 ReportLab），正文用 ReportLab（Flowable 系统天然支持自动分页 + 精确的 KeepTogether 防孤行控制）。

#### CREATE 路径完整数据流

```
make.sh run --title --type --author --content content.json --out output.pdf
│
├─ Step 1: palette.py
│   输入: title, type, author, date, [--accent, --cover-bg 覆盖]
│   输出: tokens.json (调色板 + 字体 + 尺度 + 间距 + 封面模式)
│
├─ Step 2: cover.py
│   输入: tokens.json [+ --abstract, --cover-image]
│   输出: cover.html (13种封面模式之一的完整 HTML)
│
├─ Step 3: render_cover.js
│   输入: cover.html
│   Playwright Chromium → 等待 800ms (CSS/字体加载)
│   输出: cover.pdf (单页)
│
├─ Step 4: render_body.py
│   输入: tokens.json + content.json (14种block类型)
│   ReportLab Flowables → 自定义 CalloutBox/BibliographyItem
│   → 页眉(标题+日期+accent线) + 页脚(作者+页码+淡线)
│   → 图表/数学公式 → matplotlib PNG → 嵌入PDF
│   输出: body.pdf (多页)
│
└─ Step 5: merge.py
    输入: cover.pdf + body.pdf
    QA: 文件大小 (20KB-50MB) + 页数验证
    输出: output.pdf
```

#### Token 传播模型

这是 minimax-pdf 最核心的设计——**所有下游脚本只读 tokens.json，从不自行决定颜色/字体/间距**：

```json
{
  "identity": {"title", "author", "date", "doc_type"},
  "palette": {"cover_bg", "accent", "accent_lt", "text_light", "page_bg",
              "dark", "body_text", "muted"},
  "typography": {"font_display", "font_body", "gfonts_import",
                 "font_display_rl", "font_body_rl"},
  "scale": {"size_display":54, "size_h1":28, "size_h2":22, "size_h3":18,
            "size_body":11, "size_caption":9, "size_meta":8},
  "layout": {"margin_left/right/top/bottom", "section_gap":26,
             "para_gap":8, "line_gap"},
  "cover_pattern": "fullbleed|split|typographic|minimal|terminal|diagonal|...",
  "mood": "authoritative|confident|..."
}
```

15 种文档类型映射到硬编码调色板 → 可预测、可测试，防止用户选出不和谐的颜色组合。`accent_lt` 通过 `_lighten(accent, 0.09)` 自动派生，保证色彩层次。

#### 13 种封面模式

每种模式是一个独立的 HTML 模板生成函数，产出完整的 794x1123px 页面：

| 模式 | 视觉特征 |
|------|---------|
| `fullbleed` | 深色背景 + 左对齐标题 + 点阵纹理 + 底部色带 |
| `split` | 左暗右亮分栏 + accent 分割线 |
| `typographic` | 亮底 + 首词 accent 色 + 水平线 |
| `minimal` | 近白底 + 仅 8px 左侧 accent 竖条 |
| `terminal` | 近黑底 + 网格覆盖 + 方括号边框 + 霓虹绿 accent |
| `diagonal` | SVG 多边形对角切割 |

辅助函数 `_dot_grid()` 和 `_cross_hatch()` 生成 SVG 纹理叠加层。

#### Flowchart 渲染算法

`render_body.py::_render_flowchart_png`：垂直堆叠布局，4 种节点形状（rect/diamond/oval/parallelogram），matplotlib patches 绘制，前向边直线箭头，回溯边弧线 (arc3, rad=0.42)。

#### FILL 和 REFORMAT 路径

- **FILL**：`fill_inspect.py` 递归遍历 AcroForm 字段树解析类型 → `fill_write.py` 类型感知设值 + NeedAppearances 标记
- **REFORMAT**：`reformat_parse.py` 支持 .md/.txt/.pdf/.json → content.json，然后走 CREATE 管道。内含逐行状态机 Markdown 解析器。

---

### 2.9 pptx-generator + pptx-plugin — 子 Agent 编排架构

**定位**：PowerPoint 创建和编辑——PptxGenJS 驱动 + 业界罕见的子 Agent 编排

**技术栈选型理由**：选择 PptxGenJS 而非 python-pptx，因为 API 更接近设计师心智模型（addText, addShape, addImage），图表支持丰富（BAR, LINE, PIE, DOUGHNUT, SCATTER, BUBBLE, RADAR），Node.js 生态可直接集成 react-icons 做 SVG 图标。

#### 完整数据流

```
FROM-SCRATCH 创建:
  用户需求
  ├─ color-font-skill: 选择 18 种调色板之一 → theme 对象 (5个key)
  ├─ design-style-skill: 选择 4 种风格配方之一
  └─ ppt-orchestra-skill: 规划每张幻灯片的页面类型
      │
      ├─ 并行启动 ≤5 个子 Agent:
      │   ├─ cover-page-generator → slide-01.js
      │   ├─ table-of-contents-generator → slide-02.js
      │   ├─ section-divider-generator → slide-03.js
      │   ├─ content-page-generator → slide-04.js ~ slide-XX.js
      │   └─ summary-page-generator → slide-XX.js
      │
      └─ compile.js (串行加载所有 slide-XX.js)
          for i = 1..N:
            require(`./slide-${i}.js`).createSlide(pres, theme)
          pres.writeFile('./output/presentation.pptx')

QA 循环 (强制至少一轮):
  生成 → markitdown 提取文本 → grep 检测 "xxxx|lorem|placeholder"
  → 列出问题 → 修复 → 重新验证
```

#### Theme 对象合约

全系统唯一的颜色传播机制，**严格禁止使用其他 key 名**：

```javascript
const theme = {
  primary: "22223b",    // 最深色, 标题/深色背景
  secondary: "4a4e69",  // 次深色, 正文文本
  accent: "9a8c98",     // 中间色调, 强调元素
  light: "c9ada7",      // 浅色调, 次要元素
  bg: "f2e9e4"          // 背景色
};
```

#### 四种风格配方

| 风格 | rectRadius | padding | 适用场景 |
|------|-----------|---------|---------|
| Sharp & Compact | 0-0.05" | 0.1-0.15" | 数据密集型 |
| Soft & Balanced | 0.05-0.12" | 0.15-0.2" | 商务通用 |
| Rounded & Spacious | 0.1-0.25" | 0.2-0.3" | 产品营销 |
| Pill & Airy | 0.3-0.5" | 0.25-0.4" | 品牌发布 |

组件级映射表确保 Button、Card、Avatar 等在同一风格下一致。

#### 关键技术陷阱

| 陷阱 | 后果 | 正确做法 |
|------|------|---------|
| hex 颜色带 `#` | 文件损坏 | 使用裸 hex 如 `"FF0000"` |
| 8 位 hex（含透明度） | 文件损坏 | 用独立 `transparency: 50` 属性 |
| `require()` 中用 async/await | 幻灯片被静默跳过 | **严禁 async** |
| 复用 options 对象 | 第二个形状损坏 | PptxGenJS 会原地修改（转 EMU），每次新建 |
| ElementTree 操作 XML | 命名空间破坏 | 用 `defusedxml.minidom` |

#### 为什么 5 个专化子 Agent？

- 每种页面类型有独立的布局规则、字号层级、内容元素约束
- 子 Agent **并行执行**（最多 5 个），大幅缩短生成时间
- 每个子 Agent 自带 QA 循环
- 职责隔离：封面 Agent 不需要知道图表 API
- **重复布局是 AI 生成 PPT 的最大视觉问题**——强制每张内容页不同布局是 QA 硬性检查项

---

### 2.10 gif-sticker-maker

**定位**：照片→动画 GIF 贴纸的全自动流水线

4 步清晰流水线：收集 Caption → 生成贴纸图片 → 生成动画视频 → FFmpeg 两步 palette 转 GIF。

---

### 2.11 minimax-multimodal-toolkit

**定位**：MiniMax 全模态 API 的统一入口

项目中第二大的 SKILL.md（30,136 字节），核心是**统一入口 + 模式分发**架构。

TTS 子系统支持标准 TTS、声音克隆、声音设计、多段拼接（可制作多角色有声读物）。视频子系统通过"接力式生成"实现长视频（提取上一段末帧作为下一段首帧）。Media Tools 将 FFmpeg 封装为语义化命令。

---

## Office 四件套全局对比

| 维度 | minimax-docx | minimax-xlsx | minimax-pdf | pptx-generator + plugin |
|------|-------------|-------------|-------------|------------------------|
| **技术栈** | .NET 8 + OpenXML SDK 3.x | Python + 原生 XML (ElementTree) | Python (ReportLab) + Node.js (Playwright) | Node.js (PptxGenJS) + Python (markitdown) |
| **核心哲学** | 三管道路由 + XSD 验证 | 禁止 openpyxl + 公式第一 | Token 化设计传播 | 约束驱动 + 子 Agent 编排 |
| **文件规模** | ~50+ C# 源文件 + 27 参考文档 + 4 XSD | 10 Python 脚本 + 5 参考文档 + 7 模板文件 | 8 脚本 + 1 设计文档 | 5 Agent 规格 + 5 Skill 定义 |
| **验证体系** | 三级 (XSD → 业务规则 → Gate-Check) | 二级 (静态扫描 → LibreOffice 重算) | QA 合并检查 (文件大小 + 页数) | markitdown 提取 + grep 循环 |
| **样式系统** | 13 种美学配方 | 13 槽金融语义样式 | 12 种 mood → 调色板 | 18 种调色板 + 4 种风格配方 |

**统一设计原则：用最接近原始格式的工具操作。** docx 是 OpenXML → 用 OpenXML SDK 直操强类型 API；xlsx 是 ZIP+XML → 用 ElementTree 直操避免抽象层丢失；pdf 需精确排版 → 封面 HTML/CSS + 正文 ReportLab；pptx 需快速生成 → PptxGenJS + 编辑用 XML 直操。

**验证体系对比**：

```
docx: 结构正确性 (XSD) → 业务逻辑 → 模板完整性 → 自动修复 (fix-order)
xlsx: 公式正确性 (静态7种错误) → 运行时正确性 (LibreOffice重算) → 半自动修复
pdf:  文件完整性 (大小/页数) → 优雅降级 (matplotlib缺失 → 等宽文本)
pptx: 内容完整性 (markitdown提取) → 占位符残留检测 → 人工修复循环
```

---

## 3. 跨 Skill 共性模式分析

### 3.1 知识组织的三种模式

| 模式 | 代表 | 特征 |
|------|------|------|
| **场景驱动** | minimax-docx (`scenario_a/b/c_*.md`) | 按使用场景组织，每个场景是完整流水线 |
| **层次分解** | fullstack-dev | 按架构层次从上到下组织 |
| **平行百科** | shader-dev (37 对 technique/reference) | 按技术领域平行组织，按需加载 |

### 3.2 Prompt Engineering 五大核心技巧

**技巧一：TRIGGER/DO NOT TRIGGER 声明** —— "正面清单 + 负面清单"精确控制 Skill 激活边界

**技巧二：强制工作流** —— 大写 MANDATORY/MUST + 粗体格式，利用 LLM 对强调标记的注意力偏向

**技巧三：Anti-Pattern 列表** —— 排除约束比正面约束更容易遵守。"不要用 openpyxl" 比 "请使用 XML 直接操控" 更有效

**技巧四：决策矩阵** —— 表格形式比散文段落更精确，错误匹配的概率更低

**技巧五：Quality Gate 检查清单** —— 放在 Skill 末尾，利用 LLM 的"最近偏好"确保 Agent 完成前自检

### 3.3 核心洞察：约束比指令更重要

纵观全部 11 个 Skill，**"不要做什么"的篇幅往往超过"要做什么"**。LLM 的默认行为通常是"还行"的，Skill 的主要工作不是教它做事，而是防止它犯特定类型的错误。

### 3.4 错误处理三策略

1. **Fail-Fast with Actionable Message** —— 错误信息是给 Agent 看的，Agent 可据此自动引导用户
2. **Graceful Degradation** —— 缺失的依赖标记 WARNING 而非 ERROR
3. **Self-Verification Loop** —— "生成→验证→修正"循环是 Agent 容错的最强模式

---

## 4. Plugin 系统分析

### 4.1 多平台适配

| 平台 | 配置文件 | 完成度 |
|------|---------|--------|
| Claude Code | `.claude-plugin/plugin.json` + `marketplace.json` | 最完整 |
| Cursor | `.cursor-plugin/plugin.json` | 次之 |
| Codex | `.codex/INSTALL.md` | 仅安装指南 |
| OpenCode | `.opencode/INSTALL.md` | 仅安装指南 |

"一套内容，四套适配层"——内容共享，只有入口点不同。

### 4.2 pptx-plugin 的子 Agent 编排

项目中唯一的 Plugin，核心是**编排者-执行者架构**：

```
ppt-orchestra-skill (编排者)
├── 分析大纲，分配页面类型
├── 调用 color-font-skill 确定色彩和字体
├── 调用 design-style-skill 确定设计风格
└── 逐页调用子 Agent：
    ├── cover-page-generator
    ├── table-of-contents-generator
    ├── section-divider-generator
    ├── content-page-generator (6 种子类型)
    └── summary-page-generator
```

这是公开 Skill 生态中罕见的多 Agent 协作案例，预示了从单 Agent 到多 Agent 协作的趋势。

---

## 5. PR Review 系统分析

### 双阶段质量控制

**Phase 1：自动化验证（Hard Rules）** —— `validate_skills.py` 纯 Python stdlib 实现，零依赖，检查 SKILL.md 存在性、frontmatter 格式、密钥泄露等

**Phase 2：内容审查（Soft Guidelines）** —— 范围重叠、文件大小、国际化等

PR Review Skill 本身也是一个 Skill（位于 `.claude/skills/pr-review/`），形成了**"用 AI 治理 AI 生态"**的自治理闭环。

---

## 6. 与竞品对比

| 维度 | MiniMax Skills | Cursor Rules | OpenClaw | CLAUDE.md |
|------|---------------|-------------|----------|-----------|
| **载体格式** | SKILL.md (Markdown + YAML) | .cursorrules (纯文本) | YAML + Markdown | 纯 Markdown |
| **激活机制** | TRIGGER 语义声明 | 项目级全局生效 | 手动选择 | 目录级自动加载 |
| **附带资产** | references + scripts + templates | 无 | 有限 | 无 |
| **可执行能力** | 有（Python/Bash 脚本） | 无 | 有限 | 无 |
| **多 Agent 编排** | 有（pptx-plugin） | 无 | 无 | 无 |
| **知识深度** | 极深（shader-dev 75 文件） | 浅（单文件） | 中等 | 浅（项目规范） |
| **多平台适配** | 4 平台 | 仅 Cursor | 多平台 | 仅 Claude |

MiniMax Skills 在生态中占据的是**"专业工具"**生态位——不是通用 Skill 市场，而是精选的专业工具包。

---

## 7. 创新点与不足之处

### 创新点

1. **"Anti-Slop"设计范式** —— 对 LLM 过拟合倾向的显式纠正，其他 Skill 生态中没有
2. **零格式损失的 XML 直操策略** —— 直接操控 XML 而非高级库，保证文档保真度
3. **双层知识架构（techniques/reference）** —— 37x2 结构，知识压缩与检索的优雅平衡
4. **自验证循环** —— "生成→验证→修正"模式大幅提高 Agent 输出可靠性
5. **参数化的设计品味** —— DESIGN_VARIANCE 等旋钮将主观审美转化为可调节参数
6. **子 Agent 编排** —— pptx-plugin 是罕见的多 Agent 协作案例

### 不足之处

1. **脚本语言不统一** —— Python/Bash/PowerShell/Node.js 混杂，环境配置复杂
2. **测试覆盖缺失** —— 大量可执行代码没有自动化测试
3. **版本管理粗放** —— 无 changelog 或版本兼容性管理
4. **上下文窗口预算不透明** —— shader-dev 75 文件全加载可能超过 100K token
5. **跨 Skill 组合无指导** —— 两个 Skill 如何协作没有文档化
6. **密钥扫描覆盖不全** —— validate_skills.py 只检测 3 种密钥模式

---

## 8. 对 AI Agent Skill 生态的启示

### 8.1 Skill 不是 Prompt——它是知识系统

有效的 Skill 不是一段精心设计的 Prompt，而是一个完整的知识系统。一个好的 Skill 需要回答三个问题：
1. Agent 需要知道什么？（references/）
2. Agent 需要怎么思考？（SKILL.md 的工作流和决策矩阵）
3. Agent 需要什么工具？（scripts/）

### 8.2 约束比指令更重要

"不要做什么"的篇幅往往超过"要做什么"。LLM 的默认行为通常是"还行"的，Skill 的主要工作是**防止它犯特定类型的错误**。

### 8.3 可执行性是质量分水岭

纯知识型 Skill 只能影响 Agent 的"思考"，工具型 Skill 可以延伸 Agent 的"行动"。Skill 生态的进化方向是：**从知识注入到工具编排**。

### 8.4 自验证是可靠性的关键

与其投入更多精力优化 Prompt 来减少错误，不如建立一个自动检测和修正错误的闭环。

### 8.5 多 Agent 协作是复杂任务的必然

当任务复杂度超过单个 Agent 的上下文窗口或注意力容量时，分治为多个子 Agent 是更好的策略。**单一职责原则同样适用于 Agent 系统。**

### 8.6 生态治理决定生态质量

**自动化检查硬规则，人工审查软规则。** 在 Skill 生态早期，轻量治理比复杂的自动化评分系统更务实。

---

## 附录：技术统计

| 指标 | 数值 |
|------|------|
| 总 Skill 数 | 11 + 1 Plugin |
| 总文件数 | ~200 |
| 最大 SKILL.md | fullstack-dev (34,810 bytes) |
| 最多文件的 Skill | shader-dev (75 files) |
| 最大单脚本 | generate_voice.sh (935 lines) |
| 脚本总数 | ~40 |
| 支持平台数 | 4 (Claude Code, Cursor, Codex, OpenCode) |
| 覆盖的 MiniMax API | 4 (TTS, Music, Video, Image) |
| 支持的文档格式 | 4 (DOCX, XLSX, PDF, PPTX) |
| 预设声音数 | 300+ (20+ 语言) |
| Shader 技术领域 | 37 |
| 封面风格 | 15 (minimax-pdf) |
| 色彩方案 | 18 (pptx-generator) |

---

*本文基于 MiniMax Skills 项目截至 2026-03-26 的源码分析。*
