# Lighthouse Project Guidelines

## Design Philosophy
- 黑白灰极简主题，不要彩色装饰元素
- 不要大量使用 emoji
- hover 效果只用 translateY，不要变边框
- 追求高级感和克制感，避免"AI生成感"（Inter字体+紫色渐变等）

## Tech Stack
- Astro + React + TypeScript
- CSS variables: var(--vp-c-*) 体系
- 深色模式必须兼容

## Code Style
- 组件用 React function component
- CSS 用 BEM-like 命名（.cw-* 前缀）
- 不引入外部 UI 库
