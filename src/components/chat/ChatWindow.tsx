import { useState, useRef, useEffect, useCallback } from 'react';
import {
  type Msg,
  type Conversation,
  loadConversations as dbLoad,
  saveConversation as dbSave,
  deleteConversation as dbDelete,
  migrateFromLocalStorage,
} from './chatDB';

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedText: string;
  articleContent?: string;
  onClearSelection: () => void;
}

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  if (window.location.hostname === 'localhost') return 'http://localhost:3456';
  if (window.location.hostname === 'lighthouse.hetaogomoku.uk') return `${window.location.origin}`;
  return `${window.location.origin}/Lighthouse`;
}

function now(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function dateLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return '今天';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return '昨天';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function deriveTitle(messages: Msg[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return '新对话';
  const text = first.content.slice(0, 30);
  return text + (first.content.length > 30 ? '…' : '');
}

function highlightSyntax(code: string, lang: string): string {
  if (!lang) return code;
  const tokens: { ph: string; html: string }[] = [];
  let idx = 0;
  function extract(re: RegExp, cls: string) {
    code = code.replace(re, (m) => {
      const ph = `\x02${idx++}\x02`;
      tokens.push({ ph, html: `<span class="${cls}">${m}</span>` });
      return ph;
    });
  }
  // Comments
  extract(/(\/\/[^\n]*)/g, 'cw-syn-cmt');
  extract(/(\/\*[\s\S]*?\*\/)/g, 'cw-syn-cmt');
  if (/^(python|py|bash|sh|ruby|rb|yaml|yml|toml|r|perl)$/.test(lang)) {
    extract(/(#[^\n]*)/g, 'cw-syn-cmt');
  }
  if (/^(html|xml|svg|vue)$/.test(lang)) {
    extract(/(&lt;!--[\s\S]*?--&gt;)/g, 'cw-syn-cmt');
  }
  // Strings
  extract(/("(?:[^"\\]|\\.)*")/g, 'cw-syn-str');
  extract(/('(?:[^'\\]|\\.)*')/g, 'cw-syn-str');
  extract(/(`(?:[^`\\]|\\.)*`)/g, 'cw-syn-str');
  // Keywords
  const kw = 'abstract|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|let|match|new|null|of|package|private|protected|pub|public|return|static|super|switch|this|throw|try|type|typeof|undefined|var|void|while|with|yield|def|self|elif|except|lambda|pass|raise|True|False|None|fn|impl|mut|ref|struct|trait|use|where|mod|move|dyn|crate|println|printf|fmt|int|float|str|bool|list|dict|tuple|set';
  code = code.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="cw-syn-kw">$1</span>');
  // Numbers
  code = code.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, '<span class="cw-syn-num">$1</span>');
  // Restore
  for (const t of tokens) {
    code = code.replace(t.ph, t.html);
  }
  return code;
}

function renderMd(text: string): string {
  // Extract code blocks first to protect them from other transformations
  const codeBlocks: string[] = [];
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = code.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const highlighted = highlightSyntax(escaped, lang || '');
    const langLabel = lang ? `<span class="cw-code-lang">${lang}</span>` : '';
    const copyBtn = `<button class="cw-code-copy" onclick="navigator.clipboard.writeText(this.closest('.cw-code-block').querySelector('code').textContent).then(()=>{this.textContent='\\u2713';setTimeout(()=>this.textContent='\\u590d\\u5236',1500)})">复制</button>`;
    const placeholder = `\x00CB${codeBlocks.length}\x00`;
    codeBlocks.push(
      `<div class="cw-code-block"><div class="cw-code-bar">${langLabel}${copyBtn}</div><pre><code class="lang-${lang}">${highlighted}</code></pre></div>`
    );
    return placeholder;
  });

  // Escape HTML in remaining text
  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // LaTeX blocks: $$...$$ and $...$ → render as code to avoid garbled output
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, '<pre class="cw-latex-block"><code>$1</code></pre>');
  processed = processed.replace(/\$([^\n$]+?)\$/g, '<code class="cw-inline-code cw-latex">$1</code>');

  // Inline code (after LaTeX to avoid conflicts)
  processed = processed.replace(/`([^`]+?)`/g, '<code class="cw-inline-code">$1</code>');

  // Bold & italic
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Images
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="cw-img" src="$2" alt="$1" loading="lazy" />');

  // Links
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="cw-link">$1</a>');

  // Horizontal rules
  processed = processed.replace(/^(\*{3,}|-{3,}|_{3,})\s*$/gm, '<hr class="cw-hr">');

  // Headings
  processed = processed.replace(/^#{3}\s+(.+)$/gm, '<h3 class="cw-h3">$1</h3>');
  processed = processed.replace(/^#{2}\s+(.+)$/gm, '<h2 class="cw-h2">$1</h2>');
  processed = processed.replace(/^#{1}\s+(.+)$/gm, '<h1 class="cw-h1">$1</h1>');

  // Tables: detect lines with | and parse
  processed = processed.replace(/((?:^[^\n]*\|[^\n]*$\n?){2,})/gm, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return tableBlock;
    // Check if 2nd row is separator
    const sep = rows[1].trim();
    if (!/^[\s|:-]+$/.test(sep)) return tableBlock;
    const parseRow = (row: string) =>
      row.split('|').map(c => c.trim()).filter((_, i, a) => !(i === 0 && a[0] === '') || true).filter(c => c !== '' || false);
    const cleanRow = (row: string) => {
      let cells = row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      return cells;
    };
    const headers = cleanRow(rows[0]);
    const bodyRows = rows.slice(2);
    let html = '<div class="cw-table-wrap"><table class="cw-table"><thead><tr>';
    headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';
    bodyRows.forEach(row => {
      const cells = cleanRow(row);
      html += '<tr>';
      cells.forEach(c => { html += `<td>${c}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  });

  // Nested lists: support 2-space or 4-space indent
  // Unordered lists
  processed = processed.replace(/^( *)- (.+)$/gm, (_, indent, content) => {
    const level = Math.floor(indent.length / 2);
    return `<li class="cw-li" data-level="${level}">${content}</li>`;
  });
  processed = processed.replace(/((?:<li class="cw-li"[^>]*>.*<\/li>\n?)+)/g, (match) => {
    // Build nested UL structure
    let result = '';
    let currentLevel = 0;
    let openLists = 0;
    const items = match.trim().split('\n').filter(Boolean);
    for (const item of items) {
      const levelMatch = item.match(/data-level="(\d+)"/);
      const level = levelMatch ? parseInt(levelMatch[1]) : 0;
      const content = item.replace(/<li class="cw-li" data-level="\d+">(.*)<\/li>/, '$1');
      while (currentLevel < level) { result += '<ul class="cw-ul cw-nested">'; openLists++; currentLevel++; }
      while (currentLevel > level) { result += '</ul></li>'; openLists--; currentLevel--; }
      result += `<li class="cw-li">${content}`;
      if (currentLevel === level) result += '</li>';
    }
    while (openLists > 0) { result += '</ul></li>'; openLists--; }
    return `<ul class="cw-ul">${result}</ul>`;
  });

  // Ordered lists
  processed = processed.replace(/^\d+\.\s+(.+)$/gm, '<li class="cw-oli">$1</li>');
  processed = processed.replace(/((?:<li class="cw-oli">.*<\/li>\n?)+)/g, '<ol class="cw-ol">$1</ol>');

  // Blockquotes (merged consecutive lines)
  processed = processed.replace(/^&gt;\s?(.+)$/gm, '<blockquote class="cw-bq">$1</blockquote>');
  processed = processed.replace(/<\/blockquote>\n<blockquote class="cw-bq">/g, '<br>');

  // Auto-link bare URLs (not already in href="...")
  processed = processed.replace(/(^|[^"=])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener" class="cw-link">$2</a>');

  // Paragraphs: double newline → paragraph break
  processed = processed.replace(/\n{2,}/g, '</p><p class="cw-p">');
  processed = processed.replace(/\n/g, '<br>');
  processed = `<p class="cw-p">${processed}</p>`;
  // Clean up empty paragraphs around block elements
  processed = processed.replace(/<p class="cw-p">(\s*<(?:div|h[1-3]|ul|ol|blockquote|table|pre|hr|img))/g, '$1');
  processed = processed.replace(/(<\/(?:div|h[1-3]|ul|ol|blockquote|table|pre|hr)>\s*)<\/p>/g, '$1');
  processed = processed.replace(/<p class="cw-p"><\/p>/g, '');

  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    processed = processed.replace(`\x00CB${i}\x00`, codeBlocks[i]);
  }

  return processed;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function getSuggestions(): { label: string; prompt: string }[] {
  const title = typeof document !== 'undefined' ? document.title.replace(/\s*[|–—]\s*.*/g, '').trim() : '';
  if (title && title.length > 2 && title.length < 60) {
    return [
      { label: `总结《${title.length > 16 ? title.slice(0, 16) + '…' : title}》的要点`, prompt: `请总结一下《${title}》这篇文章的核心要点` },
      { label: '用简单语言解释', prompt: '能用更简单的语言解释一下这篇文章吗？' },
    ];
  }
  return [
    { label: '核心观点是什么？', prompt: '这篇文章的核心观点是什么？' },
    { label: '用简单语言解释', prompt: '能用更简单的语言解释一下吗？' },
  ];
}

const CW_WIDTH_KEY = 'lh-chat-width';

export default function ChatWindow({ visible, onClose, selectedText, articleContent, onClearSelection }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [cwWidth, setCwWidth] = useState(() => {
    if (typeof window === 'undefined') return 520;
    const saved = localStorage.getItem(CW_WIDTH_KEY);
    return saved ? Math.max(380, Math.min(Number(saved), 900)) : 520;
  });
  const resizingRef = useRef(false);
  const composingRef = useRef(false);
  const cwRef = useRef<HTMLDivElement>(null);

  // Load conversations from IndexedDB on mount
  useEffect(() => {
    (async () => {
      await migrateFromLocalStorage(); // one-time migration
      const convs = await dbLoad();
      setConversations(convs);
      if (convs.length > 0) {
        setActiveId(convs[0].id);
        setMessages(convs[0].messages);
      }
    })();
  }, []);

  // Persist current conversation to IndexedDB whenever messages change
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    // Debounce saves during streaming
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { // 2s debounce
      const updated: Conversation = {
        id: activeId,
        title: deriveTitle(messages),
        messages,
        updatedAt: Date.now(),
      };
      dbSave(updated).then(() => {
        // Refresh conversation list
        dbLoad().then(convs => setConversations(convs));
      });
    }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [messages, activeId]);

  function scrollBottom(force = false) {
    if (!force && userScrolled) return;
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      }
    });
  }

  function onBodyScroll() {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setUserScrolled(scrollHeight - scrollTop - clientHeight > 60);
  }

  useEffect(() => {
    if (visible) {
      scrollBottom(true);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [visible]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && visible) {
        if (showHistory) setShowHistory(false);
        else onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, onClose, showHistory]);

  // Resize handle logic
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    const startX = e.clientX;
    const startW = cwWidth;
    function onMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const delta = startX - ev.clientX; // dragging left = wider
      const newW = Math.max(380, Math.min(startW + delta, 900));
      setCwWidth(newW);
    }
    function onUp() {
      resizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // persist
      setCwWidth(w => { localStorage.setItem(CW_WIDTH_KEY, String(w)); return w; });
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [cwWidth]);

  function stopGeneration() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setLoading(false);
    }
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content).catch(() => {});
  }

  function newConversation() {
    setMessages([]);
    setActiveId(genId());
    setShowHistory(false);
    setUserScrolled(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function switchConversation(conv: Conversation) {
    if (loading) return;
    setMessages(conv.messages);
    setActiveId(conv.id);
    setShowHistory(false);
    setUserScrolled(false);
    setTimeout(() => scrollBottom(true), 50);
  }

  function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    dbDelete(id).then(() => {
      dbLoad().then(convs => setConversations(convs));
    });
    if (id === activeId) {
      newConversation();
    }
  }

  async function send(retryMessage?: string) {
    const text = retryMessage || input.trim();
    if (!text || loading) return;

    // Ensure we have an active conversation
    if (!activeId) {
      setActiveId(genId());
    }

    const quote = retryMessage ? undefined : (selectedText || undefined);
    let fullMessage = text;
    if (quote) {
      fullMessage = `[用户选中了以下文档内容]\n\`\`\`\n${quote}\n\`\`\`\n\n${text}`;
    }

    const userMsg: Msg = { role: 'user', content: text, time: now(), quote };
    const botMsg: Msg = { role: 'bot', content: '', time: now() };

    setMessages(prev => retryMessage
      ? [...prev.slice(0, -1), botMsg]
      : [...prev, userMsg, botMsg]
    );
    if (!retryMessage) setInput('');
    onClearSelection();
    setLoading(true);
    setUserScrolled(false);
    scrollBottom(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${getApiBase()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: fullMessage,
          phrase: 'I AM DONGDONG SEND',
          history: messages.filter(m => !m.error).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          ...(quote && articleContent ? { articleContent } : {}),
        }),
      });

      if (!res.ok) {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: '服务暂时不可用，请稍后再试。', error: true };
          return copy;
        });
        setLoading(false);
        scrollBottom(true);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setLoading(false); return; }

      let buffer = '';
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) { accumulated = parsed.error; break; }
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: accumulated };
                return copy;
              });
              scrollBottom();
            }
          } catch {}
        }
      }
      if (!accumulated) {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: '没有收到回复。', error: true };
          return copy;
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && !last.content) {
            copy[copy.length - 1] = { ...last, content: '已停止生成。', error: true };
          }
          return copy;
        });
      } else {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: '网络错误，请稍后再试。', error: true };
          return copy;
        });
      }
    }

    setMessages(prev => {
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], time: now() };
      return copy;
    });
    setLoading(false);
    abortRef.current = null;
    scrollBottom(true);
  }

  function retryLast() {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        send(messages[i].content);
        return;
      }
    }
  }

  function onKeydown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  if (!visible) return null;

  const hasMessages = messages.length > 0;
  const lastMsg = messages[messages.length - 1];
  const isStreaming = loading && lastMsg?.role === 'bot' && lastMsg.content !== '';
  const isWaiting = loading && lastMsg?.role === 'bot' && lastMsg.content === '';

  const suggestions = getSuggestions();

  return (
    <div className="cw" ref={cwRef} style={{ width: cwWidth }}>
      {/* Resize handle */}
      <div className="cw-resize-handle" onMouseDown={startResize} />
      {/* Header */}
      <div className="cw-header">
        <div className="cw-header-left">
          <button
            className={`cw-header-btn${showHistory ? ' active' : ''}`}
            onClick={() => setShowHistory(v => !v)}
            title="历史记录"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
          <span className="cw-header-title">
            {showHistory ? '历史记录' : 'Lighthouse'}
          </span>
        </div>
        <div className="cw-header-actions">
          <button className="cw-header-btn" onClick={newConversation} title="新对话">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button className="cw-header-btn" onClick={onClose} title="关闭 (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="cw-history">
          {conversations.length === 0 ? (
            <div className="cw-history-empty">暂无历史记录</div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`cw-history-item${conv.id === activeId ? ' active' : ''}`}
                onClick={() => switchConversation(conv)}
              >
                <div className="cw-history-item-main">
                  <span className="cw-history-title">{conv.title}</span>
                  <span className="cw-history-meta">
                    {dateLabel(conv.updatedAt)} · {conv.messages.filter(m => m.role === 'user').length} 条
                  </span>
                </div>
                <button
                  className="cw-history-del"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  title="删除"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      {!showHistory && (
        <>
          <div className="cw-body" ref={listRef} onScroll={onBodyScroll}>
            {!hasMessages && (
              <div className="cw-empty">
                <p className="cw-empty-lead">Lighthouse</p>
                <p className="cw-empty-title">有什么可以帮你？</p>
                <p className="cw-empty-hint">可以选中文档内容后提问，获得更精准的回答</p>
                <div className="cw-suggestions">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => { setInput(s.prompt); textareaRef.current?.focus(); }}>{s.label}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`cw-row ${msg.role}`}>
                <div className="cw-msg-wrap">
                  {msg.quote && (
                    <div className="cw-quote">
                      <span className="cw-quote-bar" />
                      <span className="cw-quote-text">{truncate(msg.quote, 100)}</span>
                    </div>
                  )}
                  <div className={`cw-bubble ${msg.role}${msg.error ? ' cw-error' : ''}`}>
                    <div dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />
                    {loading && i === messages.length - 1 && msg.role === 'bot' && msg.content && (
                      <span className="cw-cursor" />
                    )}
                  </div>
                  {msg.content && !loading && (
                    <div className="cw-msg-actions">
                      <span className="cw-time">{msg.time}</span>
                      {msg.role === 'bot' && msg.content && !msg.error && (
                        <button className="cw-action-btn" onClick={() => copyMessage(msg.content)} title="复制">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                      )}
                      {msg.error && (
                        <button className="cw-action-btn cw-retry" onClick={retryLast} title="重试">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                          </svg>
                          <span>重试</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isWaiting && (
              <div className="cw-row bot">
                <div className="cw-msg-wrap">
                  <div className="cw-bubble bot cw-typing"><span/><span/><span/></div>
                </div>
              </div>
            )}
          </div>

          {userScrolled && hasMessages && (
            <button className="cw-scroll-btn" onClick={() => { setUserScrolled(false); scrollBottom(true); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
              </svg>
            </button>
          )}

          {selectedText && (
            <div className="cw-sel">
              <span className="cw-sel-label">引用</span>
              <span className="cw-sel-text">{truncate(selectedText, 50)}</span>
              {articleContent && <span className="cw-sel-ctx">+ 全文</span>}
              <button className="cw-sel-x" onClick={onClearSelection}>&times;</button>
            </div>
          )}

          <div className="cw-footer">
            <div className="cw-input-row">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onKeyDown={onKeydown}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={() => { composingRef.current = false; }}
                placeholder={selectedText ? '针对选中内容提问…' : '提问…'}
                rows={1}
                disabled={loading}
              />
              {loading ? (
                <button className="cw-stop" onClick={stopGeneration} aria-label="停止生成">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                </button>
              ) : (
                <button onClick={() => send()} disabled={!input.trim()} className="cw-send" aria-label="发送">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="cw-footer-meta">
              <span>Enter 发送 · Shift+Enter 换行</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
