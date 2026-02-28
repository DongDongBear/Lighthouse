import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'LightHouse',
  description: 'LightHouse 学习资料库 — 探索、学习、创造',
  lang: 'zh-CN',
  base: '/Lighthouse/',
  head: [
    ['link', { rel: 'icon', href: '/Lighthouse/lighthouse-icon.svg' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Noto+Serif+SC:wght@300;400;500;700&family=Shippori+Mincho:wght@600&display=swap' }],
  ],
  markdown: {
    breaks: true,
  },
  vite: {
    plugins: [{
      name: 'fix-vue-template',
      transform(code, id) {
        if (id.endsWith('.md')) {
          // Escape angle brackets in non-code content that look like tags
          // This is a build-time transform
        }
        return code
      }
    }]
  },
  themeConfig: {
    logo: '/lighthouse-icon.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: 'Unity 3D', link: '/unity-tutorial/' },
      { text: 'Electron', link: '/electron-tutorial/' },
    ],
    sidebar: {
      '/unity-tutorial/': [
        { text: '开始', items: [
          { text: '教程总览', link: '/unity-tutorial/' },
          { text: '总览与路线图', link: '/unity-tutorial/00-overview' },
        ]},
        { text: '基础篇', collapsed: false, items: [
          { text: '01. 环境搭建', link: '/unity-tutorial/01-setup' },
          { text: '02. Unity 界面', link: '/unity-tutorial/02-unity-basics' },
          { text: '03. GameObject 与组件', link: '/unity-tutorial/03-gameobject-component' },
          { text: '04. C# 快速入门', link: '/unity-tutorial/04-csharp-for-unity' },
          { text: '05. 第一个 3D 场景', link: '/unity-tutorial/05-first-scene' },
        ]},
        { text: '核心技能', collapsed: true, items: [
          { text: '06. 角色控制器', link: '/unity-tutorial/06-player-controller' },
          { text: '07. 物理系统', link: '/unity-tutorial/07-physics' },
          { text: '08. 动画系统', link: '/unity-tutorial/08-animation' },
          { text: '09. UI 系统', link: '/unity-tutorial/09-ui-system' },
          { text: '10. 音频系统', link: '/unity-tutorial/10-audio' },
          { text: '11. 光照与渲染', link: '/unity-tutorial/11-lighting-rendering' },
        ]},
        { text: '进阶系统', collapsed: true, items: [
          { text: '12. 背包系统', link: '/unity-tutorial/12-inventory-system' },
          { text: '13. NPC 对话', link: '/unity-tutorial/13-npc-dialogue' },
          { text: '14. 战斗系统', link: '/unity-tutorial/14-combat-system' },
          { text: '15. AI 导航', link: '/unity-tutorial/15-ai-navigation' },
          { text: '16. 存档系统', link: '/unity-tutorial/16-save-load' },
          { text: '17. 程序化生成', link: '/unity-tutorial/17-procedural-generation' },
        ]},
        { text: '开放世界', collapsed: true, items: [
          { text: '18. 开放世界架构', link: '/unity-tutorial/18-open-world-architecture' },
          { text: '19. 地形系统', link: '/unity-tutorial/19-terrain-system' },
          { text: '20. 昼夜与天气', link: '/unity-tutorial/20-day-night-weather' },
          { text: '21. 任务系统', link: '/unity-tutorial/21-quest-system' },
          { text: '22. 地图系统', link: '/unity-tutorial/22-minimap-worldmap' },
        ]},
        { text: '发布与优化', collapsed: true, items: [
          { text: '23. 手机优化', link: '/unity-tutorial/23-mobile-optimization' },
          { text: '24. iOS/Android 打包', link: '/unity-tutorial/24-build-ios-android' },
          { text: '25. 联网基础', link: '/unity-tutorial/25-networking-basics' },
          { text: '26. 美术管线', link: '/unity-tutorial/26-asset-pipeline' },
          { text: '27. 项目架构', link: '/unity-tutorial/27-project-structure' },
        ]},
      ],
      '/electron-tutorial/': [
        { text: '开始', items: [{ text: '教程总览', link: '/electron-tutorial/' }] },
        { text: 'Electron 基础', collapsed: false, items: [
          { text: '01. 什么是 Electron', link: '/electron-tutorial/01-electron-basics/01-what-is-electron' },
          { text: '02. 第一个应用', link: '/electron-tutorial/01-electron-basics/02-first-app' },
          { text: '03. 进程模型', link: '/electron-tutorial/01-electron-basics/03-process-model' },
          { text: '04. 窗口管理', link: '/electron-tutorial/01-electron-basics/04-window-management' },
          { text: '05. 原生 API', link: '/electron-tutorial/01-electron-basics/05-native-api' },
          { text: '06. 安全', link: '/electron-tutorial/01-electron-basics/06-security' },
          { text: '07. 数据存储', link: '/electron-tutorial/01-electron-basics/07-data-storage' },
          { text: '08. 打包', link: '/electron-tutorial/01-electron-basics/08-packaging' },
          { text: '09. 测试', link: '/electron-tutorial/01-electron-basics/09-testing' },
          { text: '10. 性能优化', link: '/electron-tutorial/01-electron-basics/10-performance' },
          { text: '11. 签名与发布', link: '/electron-tutorial/01-electron-basics/11-code-signing-release' },
          { text: '12. 跨平台', link: '/electron-tutorial/01-electron-basics/12-cross-platform' },
          { text: '13. React 转 Electron', link: '/electron-tutorial/01-electron-basics/13-react-to-electron' },
        ]},
        { text: '热更新', collapsed: true, items: [
          { text: '01. 更新概览', link: '/electron-tutorial/02-hot-update/01-update-overview' },
          { text: '02. Electron Updater', link: '/electron-tutorial/02-hot-update/02-electron-updater' },
          { text: '03. ASAR 热补丁', link: '/electron-tutorial/02-hot-update/03-asar-hot-patch' },
          { text: '04. Web Bundle 更新', link: '/electron-tutorial/02-hot-update/04-web-bundle-update' },
          { text: '05. 更新最佳实践', link: '/electron-tutorial/02-hot-update/05-update-best-practices' },
        ]},
        { text: 'OpenClaw 桌面端', collapsed: true, items: [
          { text: '01. 架构', link: '/electron-tutorial/03-openclaw-desktop/01-architecture' },
          { text: '02. Gateway 集成', link: '/electron-tutorial/03-openclaw-desktop/02-gateway-integration' },
          { text: '03. WebSocket', link: '/electron-tutorial/03-openclaw-desktop/03-websocket-connection' },
          { text: '04. 菜单栏与托盘', link: '/electron-tutorial/03-openclaw-desktop/04-menubar-tray' },
          { text: '05. WebChat 窗口', link: '/electron-tutorial/03-openclaw-desktop/05-webchat-window' },
          { text: '06. Canvas 系统', link: '/electron-tutorial/03-openclaw-desktop/06-canvas-system' },
          { text: '07. IPC 桥接', link: '/electron-tutorial/03-openclaw-desktop/07-ipc-bridge' },
          { text: '08. 配置管理', link: '/electron-tutorial/03-openclaw-desktop/08-config-management' },
          { text: '09. 自动更新', link: '/electron-tutorial/03-openclaw-desktop/09-auto-update' },
          { text: '10. 打包与发布', link: '/electron-tutorial/03-openclaw-desktop/10-packaging-release' },
        ]},
      ],
    },
    search: { provider: 'local' },
    outline: { level: [2, 3], label: '目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
  },
})
