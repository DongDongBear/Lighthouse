export interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
}

export interface SidebarGroup {
  text: string;
  collapsed?: boolean;
  items: SidebarItem[];
}

function buildAiResearchAgentItems(): SidebarItem[] {
  const modules = import.meta.glob('../content/docs/ai-research/agent/*.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>;

  const articleItems = Object.entries(modules)
    .filter(([path]) => !path.endsWith('/index.md'))
    .map(([path, raw]) => {
      const slug = path.split('/').pop()?.replace(/\.md$/, '') || '';
      const h1 = raw.match(/^#\s+(.+)$/m)?.[1]?.trim();
      const text = h1 || slug.replace(/-/g, ' ');
      return {
        text,
        link: `/ai-research/agent/${slug}`,
      } as SidebarItem;
    })
    .sort((a, b) => a.text.localeCompare(b.text, 'zh-Hans-CN'));

  return [
    { text: '总览', link: '/ai-research/agent/' },
    ...articleItems,
  ];
}

const aiResearchGroups: SidebarGroup[] = [
  {
    text: 'AI Research',
    items: [
      { text: '栏目总览', link: '/ai-research/' },
    ],
  },
  {
    text: 'Agent',
    collapsed: false,
    items: buildAiResearchAgentItems(),
  },
  {
    text: 'News',
    collapsed: false,
    items: [
      { text: 'News 总览', link: '/ai-product-analysis/news/' },
      { text: '2026-03-05 17:26（UTC+8）', link: '/ai-product-analysis/news/2026-03-05-1726' },
      { text: '2026-03-05 16:00（UTC+8）', link: '/ai-product-analysis/news/2026-03-05-1600' },
    ],
  },
];

export const sidebar: Record<string, SidebarGroup[]> = {
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
  '/rust-tutorial/': [
    { text: '开始', items: [
      { text: '教程总览', link: '/rust-tutorial/' },
      { text: '00. 全景概览', link: '/rust-tutorial/00-overview' },
      { text: '01. 环境搭建', link: '/rust-tutorial/01-setup' },
      { text: '02. 第一个程序', link: '/rust-tutorial/02-first-program' },
      { text: '03. 类型系统', link: '/rust-tutorial/03-type-system' },
    ]},
    { text: '核心基础', collapsed: false, items: [
      { text: '04. 所有权', link: '/rust-tutorial/04-ownership' },
      { text: '05. 借用与引用', link: '/rust-tutorial/05-borrowing' },
      { text: '06. 结构体与枚举', link: '/rust-tutorial/06-structs-enums' },
      { text: '07. 模式匹配', link: '/rust-tutorial/07-pattern-matching' },
      { text: '08. 错误处理', link: '/rust-tutorial/08-error-handling' },
      { text: '09. 集合', link: '/rust-tutorial/09-collections' },
    ]},
    { text: '进阶能力', collapsed: true, items: [
      { text: '10. 泛型与 Trait', link: '/rust-tutorial/10-generics-traits' },
      { text: '11. 生命周期', link: '/rust-tutorial/11-lifetime' },
      { text: '12. 闭包与迭代器', link: '/rust-tutorial/12-closures-iterators' },
      { text: '13. 模块与 Crate', link: '/rust-tutorial/13-modules-crates' },
      { text: '14. 智能指针', link: '/rust-tutorial/14-smart-pointers' },
      { text: '15. 并发编程', link: '/rust-tutorial/15-concurrency' },
      { text: '16. 异步编程', link: '/rust-tutorial/16-async-await' },
      { text: '17. 宏', link: '/rust-tutorial/17-macros' },
    ]},
    { text: '实战与精通', collapsed: true, items: [
      { text: '18. CLI 工具', link: '/rust-tutorial/18-cli-tool' },
      { text: '19. Web API', link: '/rust-tutorial/19-web-api' },
      { text: '20. Rust + WASM', link: '/rust-tutorial/20-wasm' },
      { text: '21. FFI', link: '/rust-tutorial/21-ffi' },
      { text: '22. Unsafe Rust', link: '/rust-tutorial/22-unsafe' },
      { text: '23. 高级类型', link: '/rust-tutorial/23-advanced-types' },
      { text: '24. Tokio 深入', link: '/rust-tutorial/24-tokio-deep-dive' },
      { text: '25. 性能优化', link: '/rust-tutorial/25-performance' },
      { text: '26. 发布 Crate', link: '/rust-tutorial/26-publish-crate' },
    ]},
  ],
  '/ai-research/': aiResearchGroups,
  '/ai-product-analysis/': aiResearchGroups,
};

/**
 * Get sidebar groups for a given path
 */
export function getSidebarGroups(path: string): SidebarGroup[] | null {
  for (const [prefix, groups] of Object.entries(sidebar)) {
    if (path.startsWith(prefix) || path.startsWith(prefix.slice(1))) {
      return groups;
    }
  }
  return null;
}

/**
 * Get flat list of all sidebar items with links for prev/next navigation
 */
export function getSidebarFlatLinks(path: string): { text: string; link: string }[] {
  const groups = getSidebarGroups(path);
  if (!groups) return [];
  const links: { text: string; link: string }[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (item.link) links.push({ text: item.text, link: item.link });
      if (item.items) {
        for (const sub of item.items) {
          if (sub.link) links.push({ text: sub.text, link: sub.link });
        }
      }
    }
  }
  return links;
}
