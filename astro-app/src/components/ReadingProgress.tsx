import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'lh-reading-progress';

export default function ReadingProgress({ slug, title }: { slug: string; title: string }) {
  const lastSave = useRef(0);

  useEffect(() => {
    // Restore scroll position silently
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const entry = stored[slug];
      if (entry && entry.scrollY > 100) {
        setTimeout(() => {
          window.scrollTo({ top: entry.scrollY, behavior: 'instant' as ScrollBehavior });
        }, 150);
      }
    } catch {}

    // Track scroll position
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastSave.current < 2000) return;
      lastSave.current = now;

      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollY / docHeight) * 100) : 0;

      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        stored[slug] = {
          scrollPercent,
          scrollY,
          lastRead: new Date().toISOString(),
          title,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {}
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [slug, title]);

  return null;
}
