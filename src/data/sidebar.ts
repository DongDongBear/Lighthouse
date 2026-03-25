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

// ─── Helpers ───

/** Extract title from raw markdown: frontmatter title > h1 > slug */
function extractTitle(raw: string, slug: string): string {
  const titleMatch = raw.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (titleMatch) return titleMatch[1];
  const h1 = raw.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (h1) return h1;
  return slug.replace(/-/g, ' ');
}

/** Format news slug to readable title: 2026-03-06-morning → "03-06 早报" */
function formatNewsTitle(raw: string, slug: string): string {
  const mNew = slug.match(/^\d{4}-(\d{2})-(\d{2})-(morning|evening)$/);
  const mLegacy = slug.match(/^\d{4}-(\d{2})-(\d{2})-(\d{2})(\d{2})$/);
  let datePrefix = '';
  if (mNew) {
    datePrefix = `${mNew[1]}-${mNew[2]} ${mNew[3] === 'morning' ? '早报' : '晚报'}`;
  } else if (mLegacy) {
    const hour = parseInt(mLegacy[3], 10);
    datePrefix = `${mLegacy[1]}-${mLegacy[2]} ${hour < 12 ? '早报' : '晚报'}`;
  }
  if (datePrefix) {
    const summaryMatch = raw.match(/^title:\s*["']?[^｜]*｜(?:核心摘要：)?(.+?)["']?\s*$/m);
    const summary = summaryMatch?.[1]?.split(/[，,]/)?.[0]?.slice(0, 20) || '';
    return summary ? `${datePrefix}｜${summary}` : datePrefix;
  }
  return extractTitle(raw, slug);
}

/** Get slug from file path */
function getSlug(path: string): string {
  return path.split('/').pop()?.replace(/\.md$/, '') || '';
}

/** Build items from a glob of md files */
function buildItemsFromGlob(
  modules: Record<string, string>,
  urlPrefix: string,
  options?: {
    sortBy?: string;
    formatTitle?: string;
  }
): SidebarItem[] {
  const items = Object.entries(modules)
    .filter(([path]) => !path.endsWith('/index.md') && !path.endsWith('/README.md'))
    .map(([path, raw]) => {
      const slug = getSlug(path);
      const text = options?.formatTitle === 'news-date'
        ? formatNewsTitle(raw, slug)
        : extractTitle(raw, slug);
      return { text, link: `${urlPrefix}${slug}`, _slug: slug };
    });

  // Sort
  if (options?.sortBy === 'slug-desc') {
    items.sort((a, b) => b._slug.localeCompare(a._slug));
  } else {
    items.sort((a, b) => a._slug.localeCompare(b._slug, 'zh-Hans-CN'));
  }

  return items.map(({ text, link }) => ({ text, link }));
}

// ─── Config-based sidebar builder ───

interface SidebarConfigGroup {
  text: string;
  dir?: string;
  items?: string[];
  collapsed?: boolean;
  sortBy?: string;
  formatTitle?: string;
  subgroups?: SidebarConfigSubgroup[];
  dynamicSubdirs?: boolean;
}

interface SidebarConfigSubgroup {
  text: string;
  dir: string;
  collapsed?: boolean;
}

interface SidebarConfigDynamicSubgroups {
  text: string;
  dir: string;
  collapsed?: boolean;
  dynamicSubdirs?: boolean;  // auto-discover date subdirectories
}

interface SidebarConfig {
  groups: SidebarConfigGroup[];
}

// Import all configs
const configs: Record<string, SidebarConfig> = {};

// ai-research
import aiResearchConfig from '../content/docs/ai-research/_sidebar.json';
configs['ai-research'] = aiResearchConfig as SidebarConfig;

// ai-product-analysis removed — merged into ai-research/news

// unity-tutorial
import unityConfig from '../content/docs/unity-tutorial/_sidebar.json';
configs['unity-tutorial'] = unityConfig as SidebarConfig;

// electron-tutorial
import electronConfig from '../content/docs/electron-tutorial/_sidebar.json';
configs['electron-tutorial'] = electronConfig as SidebarConfig;

// rust-tutorial
import rustConfig from '../content/docs/rust-tutorial/_sidebar.json';
configs['rust-tutorial'] = rustConfig as SidebarConfig;

// ─── Glob all content files ───

const allModules = import.meta.glob('../content/docs/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** Filter modules by directory prefix */
function getModulesFor(dirPath: string): Record<string, string> {
  const prefix = `../content/docs/${dirPath}/`;
  const result: Record<string, string> = {};
  for (const [path, raw] of Object.entries(allModules)) {
    if (path.startsWith(prefix)) {
      // Only include direct children (not nested subdirs)
      const rest = path.slice(prefix.length);
      if (!rest.includes('/')) {
        result[path] = raw;
      }
    }
  }
  return result;
}

/** Filter modules in a subdirectory */
function getModulesForSubdir(parentDir: string, subDir: string): Record<string, string> {
  return getModulesFor(`${parentDir}/${subDir}`);
}

/** Discover all subdirectory names under a given dir path */
function discoverSubdirs(dirPath: string): string[] {
  const prefix = `../content/docs/${dirPath}/`;
  const subdirs = new Set<string>();
  for (const path of Object.keys(allModules)) {
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length);
      const slashIdx = rest.indexOf('/');
      if (slashIdx > 0) {
        subdirs.add(rest.slice(0, slashIdx));
      }
    }
  }
  return Array.from(subdirs).sort().reverse(); // newest date first
}

/** Build sidebar groups from a config */
function buildFromConfig(section: string, config: SidebarConfig): SidebarGroup[] {
  return config.groups.map((groupConfig) => {
    const items: SidebarItem[] = [];

    if (groupConfig.items) {
      // Explicit item list by slug
      for (const slug of groupConfig.items) {
        if (slug === 'index') {
          items.push({ text: '教程总览', link: `/${section}/` });
          continue;
        }
        // Find the file in allModules
        const key = Object.keys(allModules).find(k =>
          k.includes(`/${section}/`) && getSlug(k) === slug
        );
        if (key) {
          const raw = allModules[key];
          // Determine the URL path from the file path
          const relPath = key.replace('../content/docs/', '').replace(/\.md$/, '');
          items.push({
            text: extractTitle(raw, slug),
            link: `/${relPath}`,
          });
        }
      }
    } else if (groupConfig.dir) {
      // Auto-scan directory
      const dirPath = groupConfig.dir.includes('/')
        ? groupConfig.dir
        : `${section}/${groupConfig.dir}`;
      const modules = getModulesFor(dirPath);
      const urlPrefix = `/${dirPath}/`;

      // Index as overview
      const indexKey = Object.keys(modules).find(k => k.endsWith('/index.md'));
      if (indexKey) {
        items.push({ text: '总览', link: urlPrefix });
      }

      // Dynamic subdirectories (e.g. daily-deep-reads/2026-03-26/)
      if (groupConfig.dynamicSubdirs) {
        const subdirNames = discoverSubdirs(dirPath);
        for (const subName of subdirNames) {
          const subModules = getModulesForSubdir(dirPath, subName);
          const subUrlPrefix = `/${dirPath}/${subName}/`;
          const subItems: SidebarItem[] = buildItemsFromGlob(subModules, subUrlPrefix);
          if (subItems.length > 0) {
            items.push({
              text: subName, // e.g. "2026-03-26"
              collapsed: true,
              items: subItems,
            });
          }
        }
      }

      // Subgroups first
      if (groupConfig.subgroups) {
        for (const sub of groupConfig.subgroups) {
          const subModules = getModulesForSubdir(dirPath, sub.dir);
          const subUrlPrefix = `/${dirPath}/${sub.dir}/`;
          const subItems: SidebarItem[] = [];

          const subIndexKey = Object.keys(subModules).find(k => k.endsWith('/index.md'));
          if (subIndexKey) {
            subItems.push({ text: '总览', link: subUrlPrefix });
          }

          subItems.push(...buildItemsFromGlob(subModules, subUrlPrefix));

          items.push({
            text: sub.text,
            collapsed: sub.collapsed ?? true,
            items: subItems,
          });
        }
      }

      // Regular items
      items.push(...buildItemsFromGlob(modules, urlPrefix, {
        sortBy: groupConfig.sortBy,
        formatTitle: groupConfig.formatTitle,
      }));
    }

    return {
      text: groupConfig.text,
      collapsed: groupConfig.collapsed ?? false,
      items,
    } as SidebarGroup;
  });
}

// ─── Build all sidebars ───

const aiResearchGroups = [
  ...buildFromConfig('ai-research', configs['ai-research']),
];

export const sidebar: Record<string, SidebarGroup[]> = {
  '/unity-tutorial/': buildFromConfig('unity-tutorial', configs['unity-tutorial']),
  '/electron-tutorial/': buildFromConfig('electron-tutorial', configs['electron-tutorial']),
  '/rust-tutorial/': buildFromConfig('rust-tutorial', configs['rust-tutorial']),
  '/ai-research/': aiResearchGroups,
};

// ─── Public API ───

export function getSidebarGroups(path: string): SidebarGroup[] | null {
  for (const [prefix, groups] of Object.entries(sidebar)) {
    if (path.startsWith(prefix) || path.startsWith(prefix.slice(1))) {
      return groups;
    }
  }
  return null;
}

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
