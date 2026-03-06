import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lh-reading-progress';

interface NewsItem {
  slug: string;
  date: string;
  title: string;
  description: string;
  bg: string;
}

interface ProgressEntry {
  scrollPercent: number;
  scrollY: number;
  lastRead: string;
  title?: string;
}

function getLabel(slug: string): string {
  if (slug.startsWith('unity-tutorial')) return 'Unity';
  if (slug.startsWith('electron-tutorial')) return 'Electron';
  if (slug.startsWith('rust-tutorial')) return 'Rust';
  if (slug.startsWith('ai-product-analysis')) return 'AI 研究';
  if (slug.startsWith('ai-research')) return 'AI Research';
  return 'Doc';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const d = Math.floor(hr / 24);
  return `${d} 天前`;
}

export default function RecentSection({
  base,
  newsItems,
}: {
  base: string;
  newsItems: NewsItem[];
  backgrounds?: string[];
}) {
  const [readingItems, setReadingItems] = useState<
    { slug: string; title: string; label: string; percent: number; lastRead: string }[]
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored: Record<string, ProgressEntry> = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}'
      );
      const items = Object.entries(stored)
        .filter(([, v]) => v.title)
        .map(([slug, data]) => ({
          slug,
          title: data.title!,
          label: getLabel(slug),
          percent: data.scrollPercent,
          lastRead: data.lastRead,
        }))
        .sort((a, b) => b.lastRead.localeCompare(a.lastRead))
        .slice(0, 4);
      setReadingItems(items);
    } catch {}
    setReady(true);
  }, []);

  return (
    <div className="lh-recent-update-wrapper">
      {/* Recent - reading history (list style) */}
      {ready && readingItems.length > 0 && (
        <section className="lh-recent-section">
          <div className="lh-section-header">
            <h3>Recent</h3>
          </div>
          <div className="lh-recent-list">
            {readingItems.map(item => (
              <a key={item.slug} className="lh-recent-item" href={`${base}/${item.slug}/`}>
                <div className="lh-recent-item-main">
                  <span className="lh-recent-item-label">{item.label}</span>
                  <span className="lh-recent-item-title">{item.title}</span>
                </div>
                <div className="lh-recent-item-meta">
                  <div className="lh-recent-item-progress">
                    <div className="lh-recent-item-bar">
                      <div
                        className="lh-recent-item-fill"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <span className="lh-recent-item-pct">{item.percent}%</span>
                  </div>
                  <span className="lh-recent-item-time">{timeAgo(item.lastRead)}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Update - news cards (visual style) */}
      <section className="lh-update-section">
        <div className="lh-section-header">
          <h3>Update</h3>
        </div>
        <div className="lh-update-grid">
          {newsItems.slice(0, 3).map(n => (
            <a
              key={n.slug}
              className="lh-update-card"
              href={`${base}/${n.slug}/`}
              style={{ '--lh-card-bg': `url('${base}/card-bg/${n.bg}')` } as React.CSSProperties}
            >
              <span className="lh-update-date">News · {n.date}</span>
              <p className="lh-update-title">{n.title}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
