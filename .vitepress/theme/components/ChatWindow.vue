<script setup lang="ts">
import { ref, inject, nextTick, watch, type Ref } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['close'])
const selectedText = inject<Ref<string>>('selectedText', ref(''))

interface Msg {
  role: 'user' | 'bot'
  content: string
  time: string
  quote?: string
}

const messages = ref<Msg[]>([
  { role: 'bot', content: '你好！有什么我可以帮你的吗？', time: now() }
])
const input = ref('')
const loading = ref(false)
const listEl = ref<HTMLElement | null>(null)


const API_BASE = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' ? 'http://localhost:3456' : 'http://43.130.41.3/Lighthouse')
  : ''

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function scrollBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}



// Listen for mouseup to capture selection in real-time



function clearSelection() {
  selectedText.value = ''
}

async function send() {
  const text = input.value.trim()
  if (!text || loading.value) return

  const quote = selectedText.value || undefined
  // Build the actual message sent to AI, including quoted context
  let fullMessage = text
  if (quote) {
    fullMessage = `[用户选中了以下文档内容]\n\`\`\`\n${quote}\n\`\`\`\n\n${text}`
  }

  messages.value.push({ role: 'user', content: text, time: now(), quote })
  input.value = ''
  selectedText.value = ''
  loading.value = true
  scrollBottom()

  const botMsg: Msg = { role: 'bot', content: '', time: now() }
  messages.value.push(botMsg)
  const botIdx = messages.value.length - 1

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: fullMessage,
        history: messages.value.slice(0, -2).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      })
    })

    if (!res.ok) {
      messages.value[botIdx].content = '服务暂时不可用，请稍后再试。'
      loading.value = false
      scrollBottom()
      return
    }

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      const data = await res.json()
      messages.value[botIdx].content = data.reply || '无法获取回复。'
      loading.value = false
      scrollBottom()
      return
    }

    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') break
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) { messages.value[botIdx].content = parsed.error; break }
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) { messages.value[botIdx].content += delta; scrollBottom() }
        } catch {}
      }
    }
    if (!messages.value[botIdx].content) messages.value[botIdx].content = '没有收到回复。'
  } catch {
    messages.value[botIdx].content = '网络错误，请稍后再试。'
  }
  messages.value[botIdx].time = now()
  loading.value = false
  scrollBottom()
}

function renderMd(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n/g, '<br>')
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}
</script>

<template>
  <Transition name="chat-slide">
    <div v-if="visible" class="cw">
      <!-- Header -->
      <div class="cw-header">
        <div class="cw-header-left">
          <div class="cw-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M12 3L9.5 11h5L12 3z"/>
              <rect x="10.5" y="11" width="3" height="8" rx=".8"/>
              <path d="M8.5 21h7" stroke-linecap="round"/>
              <circle cx="12" cy="6" r=".8" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <div class="cw-header-info">
            <span class="cw-header-name">LightHouse</span>
            <span class="cw-header-status"><i class="cw-dot" />在线</span>
          </div>
        </div>
        <button class="cw-close" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Messages -->
      <div class="cw-body" ref="listEl">
        <div class="cw-welcome" v-if="messages.length <= 1">
          <div class="cw-welcome-icon">🏠</div>
          <p>我是文档助手，可以帮你解答<br/>阅读过程中遇到的问题。</p>
          <p class="cw-welcome-tip">💡 选中文档文字后提问，我能更好地帮你理解。</p>
        </div>
        <template v-for="(msg, i) in messages" :key="i">
          <div :class="['cw-row', msg.role]">
            <div v-if="msg.role === 'bot'" class="cw-msg-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 3L9.5 11h5L12 3z"/><rect x="10.5" y="11" width="3" height="8" rx=".8"/>
              </svg>
            </div>
            <div class="cw-msg-wrap">
              <!-- Quote block if user selected text -->
              <div v-if="msg.quote" class="cw-quote">
                <div class="cw-quote-label">📎 引用文档内容</div>
                <div class="cw-quote-text">{{ truncate(msg.quote, 120) }}</div>
              </div>
              <div :class="['cw-bubble', msg.role]" v-html="renderMd(msg.content)" />
              <span class="cw-time">{{ msg.time }}</span>
            </div>
          </div>
        </template>
        <div v-if="loading && messages[messages.length-1]?.content === ''" class="cw-row bot">
          <div class="cw-msg-avatar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 3L9.5 11h5L12 3z"/><rect x="10.5" y="11" width="3" height="8" rx=".8"/>
            </svg>
          </div>
          <div class="cw-msg-wrap">
            <div class="cw-bubble bot cw-typing"><span/><span/><span/></div>
          </div>
        </div>
      </div>

      <!-- Selection indicator -->
      <Transition name="cw-sel-fade">
        <div v-if="selectedText" class="cw-selection-bar">
          <div class="cw-sel-content">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span class="cw-sel-text">{{ truncate(selectedText, 60) }}</span>
          </div>
          <button class="cw-sel-clear" @click="clearSelection">✕</button>
        </div>
      </Transition>

      <!-- Input -->
      <div class="cw-footer">
        <div class="cw-input-wrap">
          <textarea
            v-model="input"
            @keydown="onKeydown"
            :placeholder="selectedText ? '针对选中内容提问...' : '输入消息...'"
            rows="1"
          />
          <button @click="send" :disabled="loading || !input.trim()" class="cw-send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2"/>
            </svg>
          </button>
        </div>
        <div class="cw-footer-hint">Enter 发送 · Shift+Enter 换行</div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cw {
  position: fixed;
  bottom: 90px;
  right: 24px;
  width: 400px;
  max-width: calc(100vw - 32px);
  height: 560px;
  max-height: calc(100vh - 120px);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0,0,0,.03), 0 2px 4px rgba(0,0,0,.04), 0 12px 40px rgba(0,0,0,.1);
  z-index: 2000;
  font-family: var(--vp-font-family-base);
}
.dark .cw { box-shadow: 0 0 0 1px rgba(255,255,255,.06), 0 2px 4px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.45); }

.cw-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid var(--vp-c-divider-light); flex-shrink: 0;
}
.cw-header-left { display: flex; align-items: center; gap: 10px; }
.cw-avatar {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider);
  display: flex; align-items: center; justify-content: center; color: var(--vp-c-text-1);
}
.cw-header-info { display: flex; flex-direction: column; gap: 2px; }
.cw-header-name { font-size: 14px; font-weight: 600; color: var(--vp-c-text-1); letter-spacing: -.01em; }
.cw-header-status { font-size: 11px; color: var(--vp-c-text-3); display: flex; align-items: center; gap: 4px; }
.cw-dot { width: 6px; height: 6px; border-radius: 50%; background: #34c759; display: inline-block; }
.cw-close {
  background: none; border: none; cursor: pointer; color: var(--vp-c-text-3);
  padding: 6px; border-radius: 8px; transition: all .15s; display: flex;
}
.cw-close:hover { background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }

.cw-body {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 16px;
}
.cw-body::-webkit-scrollbar { width: 4px; }
.cw-body::-webkit-scrollbar-thumb { background: var(--vp-c-divider); border-radius: 4px; }

.cw-welcome { text-align: center; padding: 24px 16px 8px; color: var(--vp-c-text-3); }
.cw-welcome-icon { font-size: 32px; margin-bottom: 10px; }
.cw-welcome p { font-size: 13px; line-height: 1.7; margin: 0; }
.cw-welcome-tip {
  margin-top: 12px !important;
  padding: 8px 14px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  font-size: 12px;
  display: inline-block;
}

.cw-row { display: flex; gap: 8px; align-items: flex-end; }
.cw-row.user { flex-direction: row-reverse; }
.cw-msg-avatar {
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider-light);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: var(--vp-c-text-2);
}
.cw-msg-wrap { max-width: 78%; display: flex; flex-direction: column; gap: 3px; }
.cw-row.user .cw-msg-wrap { align-items: flex-end; }

/* ─── Quote ─── */
.cw-quote {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider-light);
  border-radius: 10px;
  padding: 8px 11px;
  margin-bottom: 4px;
  max-width: 100%;
}
.cw-quote-label {
  font-size: 10px;
  color: var(--vp-c-text-3);
  margin-bottom: 3px;
  font-weight: 500;
}
.cw-quote-text {
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  word-break: break-word;
}

.cw-bubble {
  padding: 10px 14px; border-radius: 14px;
  font-size: 13.5px; line-height: 1.65; word-break: break-word;
}
.cw-bubble.bot { background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); border-bottom-left-radius: 4px; }
.cw-bubble.user { background: var(--vp-c-text-1); color: var(--vp-c-bg); border-bottom-right-radius: 4px; }

.cw-bubble :deep(code) { background: rgba(0,0,0,.06); padding: 1px 5px; border-radius: 4px; font-size: 12.5px; font-family: var(--vp-font-family-mono); }
.dark .cw-bubble :deep(code) { background: rgba(255,255,255,.1); }
.cw-bubble.user :deep(code) { background: rgba(255,255,255,.15); }
.dark .cw-bubble.user :deep(code) { background: rgba(0,0,0,.12); }
.cw-bubble :deep(pre) { background: rgba(0,0,0,.04); border-radius: 8px; padding: 10px 12px; margin: 6px 0; overflow-x: auto; font-size: 12px; line-height: 1.5; }
.dark .cw-bubble :deep(pre) { background: rgba(255,255,255,.06); }
.cw-bubble :deep(blockquote) { border-left: 2px solid var(--vp-c-divider); padding-left: 10px; margin: 4px 0; color: var(--vp-c-text-2); font-size: 13px; }
.cw-bubble :deep(strong) { font-weight: 600; }

.cw-time { font-size: 10px; color: var(--vp-c-text-3); padding: 0 4px; opacity: 0; transition: opacity .2s; }
.cw-row:hover .cw-time { opacity: 1; }

.cw-typing { display: flex; gap: 5px; padding: 14px 18px; }
.cw-typing span { width: 6px; height: 6px; border-radius: 50%; background: var(--vp-c-text-3); animation: cwBounce .5s infinite alternate; }
.cw-typing span:nth-child(2) { animation-delay: .12s; }
.cw-typing span:nth-child(3) { animation-delay: .24s; }
@keyframes cwBounce { to { opacity: .25; transform: translateY(-3px); } }

/* ─── Selection bar ─── */
.cw-selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: color-mix(in srgb, var(--vp-c-brand-soft) 60%, var(--vp-c-bg-soft));
  border-top: 1px solid var(--vp-c-divider-light);
  flex-shrink: 0;
  gap: 8px;
}
.cw-sel-content {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  color: var(--vp-c-text-2);
}
.cw-sel-content svg { flex-shrink: 0; opacity: .5; }
.cw-sel-text {
  font-size: 11.5px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cw-sel-clear {
  background: none; border: none; cursor: pointer;
  color: var(--vp-c-text-3); font-size: 12px;
  padding: 2px 4px; border-radius: 4px;
  transition: all .15s; flex-shrink: 0;
}
.cw-sel-clear:hover { color: var(--vp-c-text-1); background: var(--vp-c-bg-soft); }

.cw-sel-fade-enter-active, .cw-sel-fade-leave-active { transition: all .2s ease; }
.cw-sel-fade-enter-from, .cw-sel-fade-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }

/* ─── Footer ─── */
.cw-footer { padding: 12px 16px 14px; border-top: 1px solid var(--vp-c-divider-light); flex-shrink: 0; }
.cw-input-wrap {
  display: flex; align-items: flex-end; gap: 8px;
  background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider);
  border-radius: 12px; padding: 4px 4px 4px 14px; transition: border-color .15s;
}
.cw-input-wrap:focus-within { border-color: var(--vp-c-text-3); }
.cw-input-wrap textarea {
  flex: 1; resize: none; border: none; background: none;
  font-size: 13.5px; font-family: var(--vp-font-family-base);
  color: var(--vp-c-text-1); outline: none; line-height: 1.5;
  padding: 8px 0; max-height: 80px;
}
.cw-input-wrap textarea::placeholder { color: var(--vp-c-text-3); }
.cw-send {
  width: 34px; height: 34px; border: none; border-radius: 10px;
  background: var(--vp-c-text-1); color: var(--vp-c-bg); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all .15s;
}
.cw-send:disabled { opacity: .25; cursor: not-allowed; }
.cw-send:not(:disabled):hover { opacity: .8; transform: scale(1.04); }
.cw-send:not(:disabled):active { transform: scale(.96); }

.cw-footer-hint { text-align: center; font-size: 10px; color: var(--vp-c-text-3); margin-top: 8px; opacity: .6; }

.chat-slide-enter-active, .chat-slide-leave-active { transition: all .28s cubic-bezier(.4,0,.2,1); }
.chat-slide-enter-from, .chat-slide-leave-to { opacity: 0; transform: translateY(12px) scale(.97); }

@media (max-width: 500px) {
  .cw { right: 0; bottom: 0; width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; }
}
</style>
