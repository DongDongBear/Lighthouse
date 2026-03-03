export interface NavItem {
  text: string;
  link: string;
}

export const nav: NavItem[] = [
  { text: '首页', link: '/' },
  { text: 'Rust 教程', link: '/rust-tutorial/' },
  { text: 'AI 产品分析', link: '/ai-product-analysis/' },
];
