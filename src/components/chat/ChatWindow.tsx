import { useState, useRef, useEffect } from 'react';

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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n/g, '<br>');
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export default function ChatWindow({ visible, onClose, selectedText, onClearSelection }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'bot', content: '你好！有什么我可以帮你的吗？', time: now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollBottom() {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }

  useEffect(() => {
    if (visible) scrollBottom();
  }, [visible]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const quote = selectedText || undefined;
    let fullMessage = text;
    if (quote) {
      fullMessage = `[用户选中了以下文档内容]\n\`\`\`\n${quote}\n\`\`\`\n\n${text}`;
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

  if (!visible) return null;

  return (
    <div className="cw">
      {/* Header */}
      <div className="cw-header">
        <div className="cw-header-left">
          <div className="cw-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3L9.5 11h5L12 3z"/>
              <rect x="10.5" y="11" width="3" height="8" rx=".8"/>
              <path d="M8.5 21h7" strokeLinecap="round"/>
              <circle cx="12" cy="6" r=".8" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <div className="cw-header-info">
            <span className="cw-header-name">LightHouse</span>
            <span className="cw-header-status"><i className="cw-dot" />在线</span>
          </div>
        </div>
        <button className="cw-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="cw-body" ref={listRef}>
        {messages.length <= 1 && (
          <div className="cw-welcome">
            <div className="cw-welcome-icon">&#127968;</div>
            <p>我是文档助手，可以帮你解答<br/>阅读过程中遇到的问题。</p>
            <p className="cw-welcome-tip">&#128161; 选中文档文字后提问，我能更好地帮你理解。</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`cw-row ${msg.role}`}>
            {msg.role === 'bot' && (
              <div className="cw-msg-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3L9.5 11h5L12 3z"/><rect x="10.5" y="11" width="3" height="8" rx=".8"/>
                </svg>
              </div>
            )}
            <div className="cw-msg-wrap">
              {msg.quote && (
                <div className="cw-quote">
                  <div className="cw-quote-label">&#128206; 引用文档内容</div>
                  <div className="cw-quote-text">{truncate(msg.quote, 120)}</div>
                </div>
              )}
              <div className={`cw-bubble ${msg.role}`} dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />
              <span className="cw-time">{msg.time}</span>
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="cw-row bot">
            <div className="cw-msg-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3L9.5 11h5L12 3z"/><rect x="10.5" y="11" width="3" height="8" rx=".8"/>
              </svg>
            </div>
            <div className="cw-msg-wrap">
              <div className="cw-bubble bot cw-typing"><span/><span/><span/></div>
            </div>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {selectedText && (
        <div className="cw-selection-bar">
          <div className="cw-sel-content">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span className="cw-sel-text">{truncate(selectedText, 60)}</span>
          </div>
          <button className="cw-sel-clear" onClick={onClearSelection}>&#10005;</button>
        </div>
      )}

      {/* Input */}
      <div className="cw-footer">
        <div className="cw-input-wrap">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeydown}
            placeholder={selectedText ? '针对选中内容提问...' : '输入消息...'}
            rows={1}
          />
          <button onClick={send} disabled={loading || !input.trim()} className="cw-send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2"/>
            </svg>
          </button>
        </div>
        <div className="cw-footer-hint">Enter 发送 · Shift+Enter 换行</div>
      </div>
    </div>
  );
}
