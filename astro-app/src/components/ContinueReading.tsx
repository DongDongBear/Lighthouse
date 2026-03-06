import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lh-reading-progress';

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

export default function ContinueReading({ base }: { base: string }) {
  const [entries, setEntries] = useState<{ slug: string; data: ProgressEntry; label: string }[]>([]);

  useEffect(() => {
    try {
      const stored: Record<string, ProgressEntry> = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}'
      );
      const items = Object.entries(stored)
        .filter(([, v]) => v.scrollY > 0 && v.scrollPercent < 100 && v.title)
        .map(([slug, data]) => ({ slug, data, label: getLabel(slug) }))
        .sort((a, b) => b.data.lastRead.localeCompare(a.data.lastRead))
        .slice(0, 3);
      setEntries(items);
    } catch {}
  }, []);

  if (entries.length === 0) return null;

  return (
    <section className="lh-continue">
      <div className="lh-continue-head">
        <h3>继续阅读</h3>
      </div>
      <div className="lh-continue-grid">
        {entries.map(e => (
          <a key={e.slug} className="lh-continue-card" href={`${base}/${e.slug}/`}>
            <span className="lh-continue-tag">{e.label}</span>
            <p className="lh-continue-title">{e.data.title}</p>
            <div className="lh-continue-progress">
              <div className="lh-continue-bar">
                <div className="lh-continue-fill" style={{ width: `${e.data.scrollPercent}%` }} />
              </div>
              <span className="lh-continue-pct">{e.data.scrollPercent}%</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
