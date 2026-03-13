import { useState, useEffect, useRef, useCallback } from 'react';
import ChatWindow from './ChatWindow';
import './chat.css';

const STORAGE_KEY = 'lh-chat-activated';

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname === 'localhost'
    ? 'http://localhost:3456'
    : 'http://43.130.41.3/Lighthouse';
}

export default function ChatWidget() {
  const [activated, setActivated] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const lastGoodSelection = useRef('');

  function grabSelection(): string {
    if (typeof window === 'undefined') return '';
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return '';
    const text = sel.toString().trim();
    const anchor = sel.anchorNode?.parentElement;
    if (anchor?.closest('.cw') || anchor?.closest('.cw-widget')) return '';
    if (text && text.length > 0 && text.length < 3000) return text;
    return '';
  }

  const onMouseUp = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target?.closest('.cw') || target?.closest('.cw-widget') || target?.closest('.cw-fab')) return;
    setTimeout(() => {
      const text = grabSelection();
      if (text) {
        setSelectedText(text);
        lastGoodSelection.current = text;
      }
    }, 10);
  }, []);

  const handleGlobalKeydown = useCallback(async (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      const searchInput = document.querySelector(
        '.VPLocalSearchBox input[type="search"], .VPLocalSearchBox input, [class*="DocSearch"] input, .lh-search-input'
      ) as HTMLInputElement | null;
      if (!searchInput) return;
      const val = searchInput.value.trim();
      if (!val) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        const res = await fetch(`${getApiBase()}/api/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phrase: val }),
        });
        const data = await res.json();
        if (data.ok) {
          setActivated(true);
          localStorage.setItem(STORAGE_KEY, '1');
          searchInput.value = '';
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          setTimeout(() => setOpen(true), 300);
        }
      } catch (err) {
        console.warn('[LH Chat] verify failed:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      setActivated(true);
    }
    document.addEventListener('keydown', handleGlobalKeydown, true);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown, true);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleGlobalKeydown, onMouseUp]);

  function onFabMouseDown() {
    const text = grabSelection();
    if (text) {
      setSelectedText(text);
      lastGoodSelection.current = text;
    } else if (lastGoodSelection.current) {
      setSelectedText(lastGoodSelection.current);
    }
  }

  if (!activated) return null;

  return (
    <div className="cw-widget">
      <ChatWindow
        visible={open}
        onClose={() => setOpen(false)}
        selectedText={selectedText}
        onClearSelection={() => setSelectedText('')}
      />
      <button
        className={`cw-fab ${open ? 'open' : ''}`}
        onMouseDown={(e) => { e.preventDefault(); onFabMouseDown(); }}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? '关闭助手' : '打开助手'}
      >
        {!open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
        {!open && selectedText && <span className="cw-fab-dot" />}
      </button>
    </div>
  );
}
