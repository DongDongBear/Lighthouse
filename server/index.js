const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// ─── Secret (server-side only) ───
const SECRET_PHRASE = 'I AM DONGDONG SEND'

// ─── Verify endpoint ───
app.post('/api/verify', (req, res) => {
  const { phrase } = req.body
  if (phrase && phrase.trim().toUpperCase() === SECRET_PHRASE) {
    return res.json({ ok: true })
  }
  return res.json({ ok: false })
})

// ─── Chat endpoint (mock — replace with real AI later) ───
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  // ──────────────────────────────────────────────
  // TODO: Replace this mock with real AI API call
  // e.g. OpenAI, Claude, or proxy to OpenClaw
  // ──────────────────────────────────────────────
  const reply = `收到你的问题：「${message}」\n\n这是一条 mock 回复。接入真实 AI 后，这里会返回智能回答。\n\n> 当前对话历史长度：${(history || []).length} 条`

  res.json({ reply })
})

const PORT = process.env.PORT || 3456
app.listen(PORT, () => {
  console.log(`🏠 LightHouse Chat Server running on http://localhost:${PORT}`)
})
