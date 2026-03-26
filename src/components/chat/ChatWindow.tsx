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

function renderMd(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const langLabel = lang ? `<span class="cw-code-lang">${lang}</span>` : '';
    return `<div class="cw-code-block">${langLabel}<button class="cw-code-copy" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent).then(()=>{this.textContent='已复制';setTimeout(()=>this.textContent='复制',1500)})">复制</button><pre><code class="lang-${lang}">${code.trim()}</code></pre></div>`;
  });

  html = html.replace(/`(.+?)`/g, '<code class="cw-inline-code">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^#{3}\s+(.+)$/gm, '<div class="cw-h3">$1</div>');
  html = html.replace(/^#{2}\s+(.+)$/gm, '<div class="cw-h2">$1</div>');
  html = html.replace(/^#{1}\s+(.+)$/gm, '<div class="cw-h1">$1</div>');
  html = html.replace(/^- (.+)$/gm, '<li class="cw-li">$1</li>');
  html = html.replace(/((?:<li class="cw-li">.*<\/li>\n?)+)/g, '<ul class="cw-ul">$1</ul>');
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="cw-oli">$1</li>');
  html = html.replace(/((?:<li class="cw-oli">.*<\/li>\n?)+)/g, '<ol class="cw-ol">$1</ol>');
  html = html.replace(/^&gt;\s?(.+)$/gm, '<blockquote class="cw-bq">$1</blockquote>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="cw-link">$1</a>');
  html = html.replace(/(^|[^"=])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener" class="cw-link">$2</a>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!visible) return null;

  const hasMessages = messages.length > 0;
  const lastMsg = messages[messages.length - 1];
  const isStreaming = loading && lastMsg?.role === 'bot' && lastMsg.content !== '';
  const isWaiting = loading && lastMsg?.role === 'bot' && lastMsg.content === '';

  return (
    <div className="cw">
      {/* Header */}
      <div className="cw-header">
        <div className="cw-header-left">
          <button
            className={`cw-header-btn${showHistory ? ' active' : ''}`}
            onClick={() => setShowHistory(v => !v)}
            title="历史记录"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
          <span className="cw-header-title">
            {showHistory ? '历史记录' : 'Lighthouse'}
          </span>
        </div>
        <div className="cw-header-actions">
          <button className="cw-header-btn" onClick={newConversation} title="新对话">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button className="cw-header-btn" onClick={onClose} title="关闭 (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
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
                <div className="cw-empty-mark">?</div>
                <p className="cw-empty-title">有什么不明白的？</p>
                <p className="cw-empty-sub">选中文档文字后提问，效果更好</p>
                <div className="cw-suggestions">
                  <button onClick={() => { setInput('这篇文章的核心观点是什么？'); textareaRef.current?.focus(); }}>核心观点是什么？</button>
                  <button onClick={() => { setInput('能用更简单的语言解释一下吗？'); textareaRef.current?.focus(); }}>用简单语言解释</button>
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
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                      )}
                      {msg.error && (
                        <button className="cw-action-btn cw-retry" onClick={retryLast} title="重试">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
                placeholder={selectedText ? '针对选中内容提问…' : '提问…'}
                rows={1}
                disabled={loading}
              />
              {loading ? (
                <button className="cw-stop" onClick={stopGeneration} aria-label="停止生成">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                </button>
              ) : (
                <button onClick={() => send()} disabled={!input.trim()} className="cw-send" aria-label="发送">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
