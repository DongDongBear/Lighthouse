import { useEffect } from 'react';

type ReadingEntry = {
  scrollY: number;
  scrollPercent: number;
  title: string;
  lastRead: string;
};

type ReadingMap = Record<string, ReadingEntry>;

const STORAGE_KEY = 'lh-reading-progress';
const MAX_ARTICLES = 100;
const RESTORE_MIN_SCROLL = 80;
const SAVE_THROTTLE_MS = 300;
const RESTORE_RETRY_MS = 250;
const RESTORE_MAX_RETRIES = 20;

function readStorage(): ReadingMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as ReadingMap;
  } catch {
    return {};
  }
}

function trimToMaxArticles(records: ReadingMap): ReadingMap {
  const entries = Object.entries(records);
  if (entries.length <= MAX_ARTICLES) return records;

  entries.sort((a, b) => {
    const aTime = new Date(a[1]?.lastRead ?? 0).getTime();
    const bTime = new Date(b[1]?.lastRead ?? 0).getTime();
    return bTime - aTime;
  });

  return Object.fromEntries(entries.slice(0, MAX_ARTICLES));
}

function writeStorage(records: ReadingMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimToMaxArticles(records)));
  } catch {
    // Ignore quota or serialization errors
  }
}

function getCurrentProgress() {
  const scrollY = Math.max(0, Math.round(window.scrollY));
  const maxScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const scrollPercent = maxScrollable > 0 ? Math.min(100, Math.round((scrollY / maxScrollable) * 100)) : 0;
  return { scrollY, scrollPercent };
}

function saveProgress(slug: string, title: string) {
  const records = readStorage();
  const { scrollY, scrollPercent } = getCurrentProgress();

  records[slug] = {
    scrollY,
    scrollPercent,
    title,
    lastRead: new Date().toISOString(),
  };

  writeStorage(records);
}

function restoreProgress(slug: string): boolean {
  const records = readStorage();
  const entry = records[slug];
  if (!entry) return false;
  if (typeof entry.scrollY !== 'number' || entry.scrollY < RESTORE_MIN_SCROLL) return false;

  const maxScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const targetY = Math.min(entry.scrollY, maxScrollable);

  window.scrollTo({ top: targetY, behavior: 'auto' });
  return Math.abs(window.scrollY - targetY) <= 4;
}

export default function ReadingProgress({ slug, title }: { slug: string; title: string }) {
  useEffect(() => {
    let lastSavedAt = 0;
    let restoreTimer: number | undefined;
    let restoreAttempts = 0;

    const saveIfNeeded = () => {
      const now = Date.now();
      if (now - lastSavedAt < SAVE_THROTTLE_MS) return;
      lastSavedAt = now;
      saveProgress(slug, title);
    };

    const saveNow = () => {
      lastSavedAt = Date.now();
      saveProgress(slug, title);
    };

    const tryRestore = () => {
      const restored = restoreProgress(slug);
      restoreAttempts += 1;
      if (restored || restoreAttempts >= RESTORE_MAX_RETRIES) return;
      restoreTimer = window.setTimeout(tryRestore, RESTORE_RETRY_MS);
    };

    restoreTimer = window.setTimeout(tryRestore, 120);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };

    window.addEventListener('scroll', saveIfNeeded, { passive: true });
    window.addEventListener('pagehide', saveNow);
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (restoreTimer) window.clearTimeout(restoreTimer);
      window.removeEventListener('scroll', saveIfNeeded);
      window.removeEventListener('pagehide', saveNow);
      window.removeEventListener('beforeunload', saveNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      saveNow();
    };
  }, [slug, title]);

  return null;
}
