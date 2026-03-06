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

const LABEL_COLORS: Record<string, string> = {
  Unity: '#4a9eff',
  Electron: '#9b6dff',
  Rust: '#ff7b54',
  'AI 研究': '#34d399',
  'AI Research': '#34d399',
  Doc: '#94a3b8',
};

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
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 14;
  const stroke = 2.5;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--vp-c-divider)" strokeWidth={stroke} />
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={`${c}`} strokeDashoffset={`${offset}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
        style={{ transition: 'stroke-dashoffset .4s' }}
      />
      <text x="18" y="18" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: '9px', fill: 'var(--vp-c-text-2)', fontVariantNumeric: 'tabular-nums' }}>
        {percent}%
      </text>
    </svg>
  );
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
    { slug: string; title: string; label: string; percent: number; lastRead: string; color: string }[]
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored: Record<string, ProgressEntry> = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}'
      );
      const items = Object.entries(stored)
        .filter(([, v]) => v.title)
        .map(([slug, data]) => {
          const label = getLabel(slug);
          return {
            slug,
            title: data.title!,
            label,
            percent: data.scrollPercent,
            lastRead: data.lastRead,
            color: LABEL_COLORS[label] || '#94a3b8',
          };
        })
        .sort((a, b) => b.lastRead.localeCompare(a.lastRead))
        .slice(0, 4);
      setReadingItems(items);
    } catch {}
    setReady(true);
  }, []);

  return (
    <div className="lh-recent-update-wrapper">
      {/* Recent - reading history */}
      {ready && readingItems.length > 0 && (
        <section className="lh-recent-section">
          <div className="lh-section-header">
            <h3>Recent</h3>
          </div>
          <div className="lh-recent-cards">
            {readingItems.map(item => (
              <a
                key={item.slug}
                className="lh-recent-card"
                href={`${base}/${item.slug}/`}
                style={{ '--accent': item.color } as React.CSSProperties}
              >
                <div className="lh-recent-card-top">
                  <span className="lh-recent-card-label">{item.label}</span>
                  <span className="lh-recent-card-time">{timeAgo(item.lastRead)}</span>
                </div>
                <p className="lh-recent-card-title">{item.title}</p>
                <div className="lh-recent-card-bottom">
                  <ProgressRing percent={item.percent} />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Update - news cards */}
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
