<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'
import ChatWindow from './ChatWindow.vue'

const STORAGE_KEY = 'lh-chat-activated'
const activated = ref(false)
const open = ref(false)
const selectedText = ref('')

// Provide selectedText to ChatWindow
provide('selectedText', selectedText)

const API_BASE = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' ? 'http://localhost:3456' : '/Lighthouse')
  : ''

// Continuously track document selection (even when chat is closed)
function trackSelection() {
  if (typeof window === 'undefined') return
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) return // Don't clear - keep last selection
  const text = sel.toString().trim()
  // Ignore selections inside our chat widget
  const anchor = sel.anchorNode?.parentElement
  if (anchor?.closest('.cw') || anchor?.closest('.cw-widget')) return
  if (text && text.length > 0 && text.length < 3000) {
    selectedText.value = text
  }
}

function onMouseUp() {
  // Small delay to let selection finalize
  setTimeout(trackSelection, 10)
}

function onFabMouseDown() {
  // Capture selection RIGHT NOW before click clears it
  trackSelection()
}

onMounted(() => {
  if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
    activated.value = true
  }
  document.addEventListener('keydown', handleGlobalKeydown, true)
  document.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown, true)
  document.removeEventListener('mouseup', onMouseUp)
})

async function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    const searchInput = document.querySelector('.VPLocalSearchBox input[type="search"], .VPLocalSearchBox input, [class*="DocSearch"] input') as HTMLInputElement | null
    if (!searchInput) return
    const val = searchInput.value.trim()
    if (!val) return
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: val })
      })
      const data = await res.json()
      if (data.ok) {
        activated.value = true
        localStorage.setItem(STORAGE_KEY, '1')
        searchInput.value = ''
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        setTimeout(() => { open.value = true }, 300)
      }
    } catch (err) {
      console.warn('[LH Chat] verify failed:', err)
    }
  }
}
</script>

<template>
  <ClientOnly>
    <div v-if="activated" class="cw-widget">
      <ChatWindow :visible="open" @close="open = false" />

      <button
        class="cw-fab"
        :class="{ open }"
        @mousedown="onFabMouseDown"
        @click="open = !open"
        aria-label="打开助手"
      >
        <Transition name="cw-fab-icon" mode="out-in">
          <svg v-if="!open" key="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M12 3L9.5 11h5L12 3z"/>
            <rect x="10.5" y="11" width="3" height="8" rx=".8"/>
            <path d="M8.5 21h7" stroke-linecap="round"/>
            <circle cx="12" cy="6" r=".8" fill="currentColor" stroke="none"/>
            <path d="M12 1.5V.5M15 3.5l.7-.7M17 6.5h1M9 3.5l-.7-.7M7 6.5H6" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>
          </svg>
          <svg v-else key="close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </Transition>
        <!-- Selection indicator dot on FAB -->
        <span v-if="!open && selectedText" class="cw-fab-dot" />
      </button>
    </div>
  </ClientOnly>
</template>

<style scoped>
.cw-widget {
  position: fixed; bottom: 0; right: 0; z-index: 1999; pointer-events: none;
}
.cw-widget > * { pointer-events: auto; }

.cw-fab {
  position: fixed; bottom: 24px; right: 24px;
  width: 52px; height: 52px; border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg); color: var(--vp-c-text-1);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  z-index: 2001; transition: all .2s cubic-bezier(.4,0,.2,1);
  box-shadow: 0 0 0 1px rgba(0,0,0,.03), 0 1px 3px rgba(0,0,0,.06), 0 6px 16px rgba(0,0,0,.08);
}
.dark .cw-fab {
  box-shadow: 0 0 0 1px rgba(255,255,255,.06), 0 1px 3px rgba(0,0,0,.2), 0 6px 16px rgba(0,0,0,.3);
}
.cw-fab:hover { transform: scale(1.05); box-shadow: 0 0 0 1px rgba(0,0,0,.04), 0 2px 6px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.12); }
.cw-fab:active { transform: scale(.97); }
.cw-fab.open {
  background: var(--vp-c-text-1); color: var(--vp-c-bg);
  border-color: var(--vp-c-text-1); border-radius: 14px;
}

.cw-fab-dot {
  position: absolute; top: -3px; right: -3px;
  width: 10px; height: 10px; border-radius: 50%;
  background: #34c759; border: 2px solid var(--vp-c-bg);
  animation: cwPulse 1.5s infinite;
}
@keyframes cwPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.cw-fab-icon-enter-active, .cw-fab-icon-leave-active { transition: all .18s ease; }
.cw-fab-icon-enter-from { opacity: 0; transform: rotate(-90deg) scale(.5); }
.cw-fab-icon-leave-to { opacity: 0; transform: rotate(90deg) scale(.5); }

@media (max-width: 500px) {
  .cw-fab { bottom: 16px; right: 16px; width: 48px; height: 48px; border-radius: 14px; }
}
</style>
