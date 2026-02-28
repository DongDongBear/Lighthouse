<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ChatWindow from './ChatWindow.vue'

const STORAGE_KEY = 'lh-chat-activated'
const activated = ref(false)
const open = ref(false)

const API_BASE = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' ? 'http://localhost:3456' : '/api-chat')
  : ''

onMounted(() => {
  // Check localStorage
  if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
    activated.value = true
  }
  // Listen for search dialog keydown
  document.addEventListener('keydown', handleGlobalKeydown, true)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown, true)
})

async function handleGlobalKeydown(e: KeyboardEvent) {
  // Cmd+Enter or Ctrl+Enter
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    // Find the VitePress local search input
    const searchInput = document.querySelector('.VPLocalSearchBox input[type="search"], .VPLocalSearchBox input, [class*="DocSearch"] input') as HTMLInputElement | null
    if (!searchInput) return

    const val = searchInput.value.trim()
    if (!val) return

    // Prevent default search behavior for our secret
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
        // Close search dialog
        searchInput.value = ''
        const closeBtn = document.querySelector('.VPLocalSearchBox button[aria-label="Close"], .VPLocalSearchBox .close-icon, .VPLocalSearchBox button.close') as HTMLElement | null
        if (closeBtn) closeBtn.click()
        // Also press Escape to close
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        // Open chat
        setTimeout(() => { open.value = true }, 300)
      }
    } catch (err) {
      console.warn('[LH Chat] verify failed:', err)
    }
  }
}

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <ClientOnly>
    <div v-if="activated" class="chat-widget">
      <ChatWindow :visible="open" @close="open = false" />
      <button
        class="chat-fab"
        :class="{ active: open }"
        @click="toggle"
        aria-label="打开聊天助手"
      >
        <Transition name="fab-icon" mode="out-in">
          <svg v-if="!open" key="bot" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <!-- lighthouse icon -->
            <path d="M12 2L9 10h6L12 2z"/>
            <rect x="10" y="10" width="4" height="10" rx="1"/>
            <path d="M8 22h8"/>
            <path d="M7 10h10"/>
            <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          <svg v-else key="close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </Transition>
      </button>
    </div>
  </ClientOnly>
</template>

<style scoped>
.chat-widget {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 1999;
  pointer-events: none;
}
.chat-widget > * {
  pointer-events: auto;
}

.chat-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,.1);
  transition: all .2s ease;
  z-index: 2001;
}
.dark .chat-fab {
  box-shadow: 0 4px 16px rgba(0,0,0,.35);
}
.chat-fab:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 22px rgba(0,0,0,.14);
}
.chat-fab.active {
  background: #111;
  color: #fff;
  border-color: #111;
}
.dark .chat-fab.active {
  background: #f3f3f3;
  color: #111;
  border-color: #f3f3f3;
}

.fab-icon-enter-active,
.fab-icon-leave-active {
  transition: all .15s ease;
}
.fab-icon-enter-from { opacity: 0; transform: rotate(-90deg) scale(.6); }
.fab-icon-leave-to { opacity: 0; transform: rotate(90deg) scale(.6); }

@media (max-width: 500px) {
  .chat-fab {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
  }
}
</style>
