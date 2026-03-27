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
  if (slug.startsWith('ai-research')) return 'AI 研究';
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

  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('.lh-update-card[data-bg]')
    );
    if (!targets.length) return;

    const load = (el: HTMLElement) => {
      if (el.dataset.bgLoaded === '1') return;
      const url = el.dataset.bg;
      if (!url) return;

      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      img.onload = () => {
        el.style.backgroundImage = `url('${url}')`;
        el.dataset.bgLoaded = '1';
        el.classList.add('is-loaded');
      };
      img.onerror = () => {
        el.style.backgroundImage = `url('${url}')`;
        el.dataset.bgLoaded = '1';
      };
    };

    if (!('IntersectionObserver' in window)) {
      targets.forEach(load);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          load(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '220px 0px' }
    );

    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, [newsItems]);

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
              <a key={item.slug} className="lh-recent-card" href={`${base}/${item.slug}/`}>
                <div className="lh-recent-card-top">
                  <span className="lh-recent-card-label">{item.label}</span>
                  <span className="lh-recent-card-time">{timeAgo(item.lastRead)}</span>
                </div>
                <p className="lh-recent-card-title">{item.title}</p>
                <div className="lh-recent-card-bar">
                  <div className="lh-recent-card-fill" style={{ width: `${item.percent}%` }} />
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
              className="lh-update-card lh-bg-lazy"
              href={`${base}/${n.slug}/`}
              data-bg={`${base}/card-bg/${n.bg}`}
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
