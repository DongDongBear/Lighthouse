export interface NavItem {
  text: string;
  link: string;
}

export const nav: NavItem[] = [
  { text: '首页', link: '/' },
  { text: 'Rust 教程', link: '/rust-tutorial/' },
  { text: 'AI 研究', link: '/ai-product-analysis/' },
  { text: '每日播报', link: '/ai-product-analysis/daily-broadcast' },
];
