<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['close'])

interface Msg {
  role: 'user' | 'bot'
  content: string
}

const messages = ref<Msg[]>([
  { role: 'bot', content: '👋 你好！我是 LightHouse 助手，有什么可以帮你的？' }
])
const input = ref('')
const loading = ref(false)
const listEl = ref<HTMLElement | null>(null)

const API_BASE = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' ? 'http://localhost:3456' : '/api-chat')
  : ''

function scrollBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}

watch(() => props.visible, (v) => { if (v) scrollBottom() })

async function send() {
  const text = input.value.trim()
  if (!text || loading.value) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  loading.value = true
  scrollBottom()

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: messages.value.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
      })
    })
    const data = await res.json()
    messages.value.push({ role: 'bot', content: data.reply || '抱歉，服务暂时不可用。' })
  } catch {
    messages.value.push({ role: 'bot', content: '⚠️ 网络错误，请稍后再试。' })
  }
  loading.value = false
  scrollBottom()
}

function renderMd(text: string): string {
  // Lightweight markdown: bold, italic, code, blockquote, newlines
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n/g, '<br>')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <Transition name="chat-slide">
    <div v-if="visible" class="chat-window">
      <div class="chat-header">
        <span class="chat-title">🏠 LightHouse 助手</span>
        <button class="chat-close" @click="emit('close')" aria-label="关闭">✕</button>
      </div>
      <div class="chat-messages" ref="listEl">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="['chat-msg', msg.role]"
        >
          <div class="chat-bubble" v-html="renderMd(msg.content)" />
        </div>
        <div v-if="loading" class="chat-msg bot">
          <div class="chat-bubble typing">
            <span class="dot" /><span class="dot" /><span class="dot" />
          </div>
        </div>
      </div>
      <div class="chat-input-bar">
        <textarea
          v-model="input"
          @keydown="onKeydown"
          placeholder="输入你的问题…"
          rows="1"
        />
        <button @click="send" :disabled="loading || !input.trim()" class="chat-send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.chat-window {
  position: fixed;
  bottom: 88px;
  right: 24px;
  width: 380px;
  max-width: calc(100vw - 32px);
  height: 520px;
  max-height: calc(100vh - 120px);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,.12);
  z-index: 2000;
  font-family: var(--vp-font-family-base);
}
.dark .chat-window {
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}
.chat-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.chat-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--vp-c-text-3);
  padding: 2px 6px;
  border-radius: 6px;
  transition: background .15s;
}
.chat-close:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-msg {
  display: flex;
}
.chat-msg.user {
  justify-content: flex-end;
}
.chat-msg.bot {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 82%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--vp-c-text-1);
  word-break: break-word;
}
.chat-msg.user .chat-bubble {
  background: #111;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.dark .chat-msg.user .chat-bubble {
  background: #f3f3f3;
  color: #111;
}
.chat-msg.bot .chat-bubble {
  background: var(--vp-c-bg-soft);
  border-bottom-left-radius: 4px;
}
.chat-bubble :deep(code) {
  background: rgba(0,0,0,.06);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
}
.dark .chat-bubble :deep(code) {
  background: rgba(255,255,255,.1);
}
.chat-bubble :deep(blockquote) {
  border-left: 3px solid var(--vp-c-divider);
  padding-left: 10px;
  margin: 4px 0;
  color: var(--vp-c-text-2);
}

/* typing animation */
.typing {
  display: flex;
  gap: 4px;
  padding: 12px 18px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  animation: bounce .6s infinite alternate;
}
.dot:nth-child(2) { animation-delay: .15s; }
.dot:nth-child(3) { animation-delay: .3s; }
@keyframes bounce {
  to { opacity: .3; transform: translateY(-4px); }
}

.chat-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}
.chat-input-bar textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  font-family: var(--vp-font-family-base);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  outline: none;
  line-height: 1.5;
  max-height: 100px;
  transition: border-color .15s;
}
.chat-input-bar textarea:focus {
  border-color: var(--vp-c-text-3);
}
.chat-send {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: #111;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity .15s;
}
.dark .chat-send {
  background: #f3f3f3;
  color: #111;
}
.chat-send:disabled {
  opacity: .35;
  cursor: not-allowed;
}
.chat-send:not(:disabled):hover {
  opacity: .85;
}

/* slide transition */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all .25s cubic-bezier(.4,0,.2,1);
}
.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(.96);
}

@media (max-width: 500px) {
  .chat-window {
    right: 8px;
    bottom: 80px;
    width: calc(100vw - 16px);
    height: calc(100vh - 100px);
    border-radius: 12px;
  }
}
</style>
