import { useState, useEffect, useRef, useCallback } from 'react';
import ChatWindow from './ChatWindow';
import './chat.css';

const STORAGE_KEY = 'lh-chat-activated';
const ARTICLE_MAX_LEN = 8000;

function getArticleContent(): string {
  const container = document.querySelector('main article')
    || document.querySelector('main .content')
    || document.querySelector('main');
  if (!container) return '';
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('nav, .sidebar, .cw, .cw-widget, footer, .VPDocFooter, .VPDocAsideOutline, aside, .table-of-contents').forEach(el => el.remove());
  const text = clone.textContent?.replace(/\s+/g, ' ').trim() || '';
  return text.slice(0, ARTICLE_MAX_LEN);
}

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  if (window.location.hostname === 'localhost') return 'http://localhost:3456';
  if (window.location.hostname === 'lighthouse.hetaogomoku.uk') return `${window.location.origin}`;
  return `${window.location.origin}/Lighthouse`;
}

export default function ChatWidget() {
  const [activated, setActivated] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const lastGoodSelection = useRef('');
  const [hasOpened, setHasOpened] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('lh-chat-opened') === '1'
  );

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
        setArticleContent(getArticleContent());
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

  // Cmd/Ctrl+Shift+L toggle
  const handleToggleShortcut = useCallback((e: KeyboardEvent) => {
    if (e.key === 'L' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!activated) return;
      setOpen(v => {
        if (!v && !hasOpened) {
          setHasOpened(true);
          localStorage.setItem('lh-chat-opened', '1');
        }
        return !v;
      });
    }
  }, [activated, hasOpened]);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      setActivated(true);
    }
    document.addEventListener('keydown', handleGlobalKeydown, true);
    document.addEventListener('keydown', handleToggleShortcut);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown, true);
      document.removeEventListener('keydown', handleToggleShortcut);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleGlobalKeydown, handleToggleShortcut, onMouseUp]);

  function onFabMouseDown() {
    const text = grabSelection();
    if (text) {
      setSelectedText(text);
      lastGoodSelection.current = text;
      setArticleContent(getArticleContent());
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
        articleContent={articleContent}
        onClearSelection={() => { setSelectedText(''); setArticleContent(''); }}
      />
      <button
        className={`cw-fab${open ? ' open' : ''}${!hasOpened && !open ? ' cw-fab-pulse' : ''}`}
        onMouseDown={(e) => { e.preventDefault(); onFabMouseDown(); }}
        onClick={() => {
          setOpen(v => {
            if (!v && !hasOpened) {
              setHasOpened(true);
              localStorage.setItem('lh-chat-opened', '1');
            }
            return !v;
          });
        }}
        aria-label="打开助手"
      >
        {!open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        )}
        {!open && selectedText && <span className="cw-fab-dot" />}
      </button>
    </div>
  );
}
