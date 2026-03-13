import { useState, useRef, useEffect, useCallback } from 'react';

interface Msg {
  role: 'user' | 'bot';
  content: string;
  time: string;
  quote?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedText: string;
  onClearSelection: () => void;
}

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname === 'localhost'
    ? 'http://localhost:3456'
    : 'http://43.130.41.3/Lighthouse';
}

function now(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function renderMd(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n/g, '<br>');
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Extract page title from document */
function getPageContext(): { title: string; path: string } {
  const title = document.querySelector('.lh-article-hero-title')?.textContent?.trim() || document.title;
  const path = window.location.pathname;
  return { title, path };
}

export default function ChatWindow({ visible, onClose, selectedText, onClearSelection }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    if (visible) {
      scrollBottom();
      // Focus the textarea when opening
      setTimeout(() => textareaRef.current?.focus(), 320);
    }
  }, [visible, scrollBottom]);

  async function send(overrideText?: string) {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    const quote = selectedText || undefined;
    const ctx = getPageContext();
    let fullMessage = text;

    // Include page context for the AI
    const contextParts: string[] = [];
    if (ctx.title) contextParts.push(`[当前页面: ${ctx.title}]`);
    if (quote) contextParts.push(`[用户选中了以下文档内容]\n\`\`\`\n${quote}\n\`\`\``);
    if (contextParts.length > 0) {
      fullMessage = contextParts.join('\n') + '\n\n' + text;
    }

    const userMsg: Msg = { role: 'user', content: text, time: now(), quote };
    const botMsg: Msg = { role: 'bot', content: '', time: now() };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');
    onClearSelection();
    setLoading(true);
    scrollBottom();

    try {
      const res = await fetch(`${getApiBase()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullMessage,
          history: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: '服务暂时不可用，请稍后再试。' };
          return copy;
        });
        setLoading(false);
        scrollBottom();
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        const data = await res.json();
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: data.reply || '无法获取回复。' };
          return copy;
        });
        setLoading(false);
        scrollBottom();
        return;
      }

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
            if (parsed.error) {
              accumulated = parsed.error;
              break;
            }
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
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: '没有收到回复。' };
          return copy;
        });
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: '网络错误，请稍后再试。' };
        return copy;
      });
    }

    setMessages(prev => {
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], time: now() };
      return copy;
    });
    setLoading(false);
    scrollBottom();
  }

  function onKeydown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleSuggestion(text: string) {
    send(text);
  }

  if (!visible) return null;

  const isEmpty = messages.length === 0;

  return (
    <div className="cw">
      {/* Header */}
      <div className="cw-header">
        <div className="cw-header-left">
          <div className="cw-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="cw-header-info">
            <span className="cw-header-name">LightHouse</span>
            <span className="cw-header-status"><i className="cw-dot online" />在线</span>
          </div>
        </div>
        <button className="cw-close" onClick={onClose} aria-label="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="cw-body" ref={listRef}>
        {isEmpty && (
          <div className="cw-welcome">
            <div className="cw-welcome-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L9.5 11h5L12 2z" />
                <rect x="10.5" y="11" width="3" height="8" rx=".8" />
                <path d="M8.5 21h7" />
              </svg>
            </div>
            <p>有什么不明白的，随时问我</p>
            <p className="cw-welcome-tip">
              选中文档中的文字后提问，可以获得更精准的解答
            </p>
            <div className="cw-suggestions">
              <button className="cw-suggestion" onClick={() => handleSuggestion('这篇文章的核心观点是什么？')}>
                这篇文章的核心观点是什么？
              </button>
              <button className="cw-suggestion" onClick={() => handleSuggestion('帮我总结一下文章的结构')}>
                帮我总结一下文章的结构
              </button>
              <button className="cw-suggestion" onClick={() => handleSuggestion('有哪些关键概念需要理解？')}>
                有哪些关键概念需要理解？
              </button>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`cw-row ${msg.role}`}>
            {msg.role === 'bot' && (
              <div className="cw-msg-avatar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L9.5 11h5L12 2z" />
                  <rect x="10.5" y="11" width="3" height="8" rx=".8" />
                </svg>
              </div>
            )}
            <div className="cw-msg-wrap">
              {msg.quote && (
                <div className="cw-quote">
                  <div className="cw-quote-label">引用</div>
                  <div className="cw-quote-text">{truncate(msg.quote, 120)}</div>
                </div>
              )}
              <div
                className={`cw-bubble ${msg.role}`}
                dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }}
              />
              <span className="cw-time">{msg.time}</span>
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="cw-row bot">
            <div className="cw-msg-avatar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L9.5 11h5L12 2z" />
                <rect x="10.5" y="11" width="3" height="8" rx=".8" />
              </svg>
            </div>
            <div className="cw-msg-wrap">
              <div className="cw-bubble bot cw-typing"><span /><span /><span /></div>
            </div>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {selectedText && (
        <div className="cw-selection-bar">
          <div className="cw-sel-content">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="cw-sel-text">{truncate(selectedText, 60)}</span>
          </div>
          <button className="cw-sel-clear" onClick={onClearSelection} aria-label="取消引用">
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div className="cw-footer">
        <div className="cw-input-wrap">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeydown}
            placeholder={selectedText ? '针对选中内容提问…' : '输入问题…'}
            rows={1}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="cw-send" aria-label="发送">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
        <div className="cw-footer-hint">Enter 发送 · Shift+Enter 换行</div>
      </div>
    </div>
  );
}
