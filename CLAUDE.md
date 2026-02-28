# Task: Implement AI Chat Assistant for LightHouse VitePress Site

## Project
- VitePress documentation site at `/tmp/BellLab-Docs`
- Tech: VitePress 1.6.4, Vue 3, TypeScript
- Theme: custom dark/light minimal theme (see `.vitepress/theme/custom.css`)
- Base path: `/Lighthouse/`

## Requirements

### 1. Activation Mechanism
- User types `I AM DONGDONG SEND` in the VitePress local search dialog, then presses `Cmd+Enter` (Mac) or `Ctrl+Enter` (Windows)
- Frontend sends this to backend API for verification
- On success, store activation in `localStorage` (key: `lh-chat-activated`)
- Next visit: auto-show bot icon without re-entering the secret
- **Secret must only exist server-side** — frontend just sends user input for validation

### 2. Chat Bot UI (Bottom-Right Floating Widget)
- After activation: show a floating circular bot icon (bottom-right corner)
- Click to expand a chat window (like Intercom/Crisp style)
- Chat window: message list + input + send button
- Support markdown rendering in bot replies
- Style must match existing LightHouse theme (dark/light mode support)
- Smooth open/close animation
- Mobile responsive

### 3. Backend Server
- Create `server/` directory with Express app
- `POST /api/verify` — verify the secret phrase, return `{ ok: true/false }`
- `POST /api/chat` — receive `{ message: string, history: [] }`, return `{ reply: string }`
  - For now: mock AI response (echo back or simple template)
  - Leave a clear integration point for real AI API later
- Port: 3456
- Enable CORS for local dev
- Include `server/package.json` with start script

### 4. Frontend Implementation
- Add Vue components in `.vitepress/theme/components/`:
  - `ChatWidget.vue` — main wrapper (handles activation state, floating icon, expand/collapse)
  - `ChatWindow.vue` — the chat panel (messages, input, send)
- Modify `.vitepress/theme/index.ts` to register `ChatWidget` as a global layout component
- Hook into VitePress search dialog:
  - Listen for the search modal opening
  - Intercept `Cmd+Enter` / `Ctrl+Enter` in the search input
  - Grab current search input value, check if it matches the secret phrase pattern
  - If yes, send to `/api/verify`, on success activate the chat

### 5. Technical Constraints
- Vue 3 Composition API only
- No additional UI libraries — pure CSS
- Use `marked` or inline markdown renderer for chat messages (install `marked` if needed)
- Dark mode support via `.dark` class (VitePress standard)
- Don't break existing site functionality
- z-index should be above VitePress content but below modals

### 6. Visual Design Guidelines
Based on existing theme:
- Font: Inter, system fonts (already set in CSS vars)
- Colors: use CSS custom properties (`--vp-c-bg`, `--vp-c-text-1`, etc.)
- Border: `1px solid var(--vp-c-divider)`
- Border radius: 12px for panels, 8px for messages
- Subtle shadows, no heavy effects
- Bot icon: use a simple SVG lighthouse or lamp emoji as placeholder

## File Structure
```
server/
  index.js
  package.json
.vitepress/theme/
  index.ts          (modify)
  components/
    ChatWidget.vue  (new)
    ChatWindow.vue  (new)
```

## After Implementation
1. `cd server && npm install && node index.js` should start the backend on port 3456
2. The VitePress site should work as before, with the chat feature hidden until activated
3. Test: open search, type the secret, Cmd+Enter → bot icon appears → click → chat works
