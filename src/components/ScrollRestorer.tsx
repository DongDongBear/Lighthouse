import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lh-reading-progress';

export default function ScrollRestorer({ slug }: { slug: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const entry = stored[slug];
      if (entry && entry.scrollY > 100) {
        setTimeout(() => {
          window.scrollTo({ top: entry.scrollY, behavior: 'instant' as ScrollBehavior });
          setShow(true);
          setTimeout(() => setShow(false), 3000);
        }, 150);
      }
    } catch {}
  }, [slug]);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--vp-c-bg-soft)',
        color: 'var(--vp-c-text-2)',
        padding: '8px 20px',
        borderRadius: '6px',
        fontSize: '13px',
        border: '1px solid var(--vp-c-divider)',
        zIndex: 1000,
        pointerEvents: 'none' as const,
      }}
    >
      已恢复上次阅读位置
    </div>
  );
}
