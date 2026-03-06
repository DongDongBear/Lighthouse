import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lh-reading-progress';
const TOTAL_SLOTS = 6;

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

export default function RecentSection({
  base,
  newsItems,
  backgrounds,
}: {
  base: string;
  newsItems: NewsItem[];
  backgrounds: string[];
}) {
  const [readingItems, setReadingItems] = useState<
    { slug: string; title: string; label: string; percent: number; bg: string }[]
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored: Record<string, ProgressEntry> = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}'
      );
      const items = Object.entries(stored)
        .filter(([, v]) => v.scrollY > 0 && v.title)
        .map(([slug, data], i) => ({
          slug,
          title: data.title!,
          label: getLabel(slug),
          percent: data.scrollPercent,
          bg: backgrounds[i % backgrounds.length],
        }))
        .sort((a, b) => {
          const aTime = stored[a.slug]?.lastRead ?? '';
          const bTime = stored[b.slug]?.lastRead ?? '';
          return bTime.localeCompare(aTime);
        });
      setReadingItems(items);
    } catch {}
    setReady(true);
  }, []);

  if (!ready) {
    // SSR placeholder: render news only to avoid layout shift
    const allCards = newsItems.slice(0, TOTAL_SLOTS);
    return (
      <section className="lh-recent">
        <div className="lh-recent-head">
          <h3>Recent</h3>
        </div>
        <div className="lh-recent-grid lh-recent-grid-compact">
          {allCards.map((n, i) => (
            <a
              key={n.slug}
              className="lh-recent-card lh-recent-card-compact"
              href={`${base}/${n.slug}/`}
              style={{ '--lh-card-bg': `url('${base}/card-bg/${n.bg}')` } as React.CSSProperties}
            >
              <span className="lh-recent-tag">News</span>
              <p className="lh-recent-title">{n.title}</p>
            </a>
          ))}
        </div>
      </section>
    );
  }

  // Build the 6-card grid: reading items first, then fill with news
  const readingSlice = readingItems.slice(0, Math.min(readingItems.length, TOTAL_SLOTS));
  const newsNeeded = TOTAL_SLOTS - readingSlice.length;
  const newsSlice = newsItems.slice(0, newsNeeded);

  const cards: React.ReactNode[] = [];

  readingSlice.forEach((item, i) => {
    cards.push(
      <a
        key={`read-${item.slug}`}
        className="lh-recent-card lh-recent-card-compact"
        href={`${base}/${item.slug}/`}
        style={{ '--lh-card-bg': `url('${base}/card-bg/${item.bg}')` } as React.CSSProperties}
      >
        <span className="lh-recent-tag">{item.label}</span>
        <p className="lh-recent-title">{item.title}</p>
        <div className="lh-recent-progress">
          <div className="lh-recent-progress-bar">
            <div className="lh-recent-progress-fill" style={{ width: `${item.percent}%` }} />
          </div>
          <span className="lh-recent-progress-pct">已读 {item.percent}%</span>
        </div>
      </a>
    );
  });

  newsSlice.forEach((n, i) => {
    cards.push(
      <a
        key={`news-${n.slug}`}
        className="lh-recent-card lh-recent-card-compact"
        href={`${base}/${n.slug}/`}
        style={
          {
            '--lh-card-bg': `url('${base}/card-bg/${n.bg}')`,
          } as React.CSSProperties
        }
      >
        <span className="lh-recent-tag">News · {n.date}</span>
        <p className="lh-recent-title">{n.title}</p>
      </a>
    );
  });

  return (
    <section className="lh-recent">
      <div className="lh-recent-head">
        <h3>Recent</h3>
      </div>
      <div className="lh-recent-grid lh-recent-grid-compact">
        {cards}
      </div>
    </section>
  );
}
