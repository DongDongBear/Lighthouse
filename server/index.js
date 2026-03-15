const express = require('express')
const cors = require('cors')

const app = express()

// CORS: allow GitHub Pages + local dev
app.use(cors({
  origin: [
    'https://dongdongbear.github.io',
    'https://lighthouse.hetaogomoku.uk',
    'http://lighthouse.hetaogomoku.uk',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://43.130.41.3',
  ],
  methods: ['POST', 'GET', 'OPTIONS'],
  credentials: false,
}))
app.use(express.json())

const SECRET_PHRASE = 'I AM DONGDONG SEND'
const OPENCLAW_URL = 'http://127.0.0.1:18789/v1/chat/completions'
const OPENCLAW_TOKEN = '15dfbe164686b4d12544dca9e6f1f8d2666305d703d23df8b2a00b7bbf53ad26'

app.post('/api/verify', (req, res) => {
  const { phrase } = req.body
  if (phrase && phrase.trim().toUpperCase() === SECRET_PHRASE) {
    return res.json({ ok: true })
  }
  return res.json({ ok: false })
})

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  const messages = [
    {
      role: 'system',
      content: '你是 LightHouse 文档助手。用户正在阅读 LightHouse 学习资料库的文档，请帮助他们解答技术问题。回复简洁、准确，使用中文。支持 Markdown 格式。'
    }
  ]
  if (Array.isArray(history)) {
    for (const h of history.slice(-20)) {
      messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })
    }
  }
  messages.push({ role: 'user', content: message })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const response = await fetch(OPENCLAW_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'main'
      },
      body: JSON.stringify({ model: 'openclaw:main', messages, stream: true, user: 'lighthouse-chat' })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenClaw error:', response.status, err)
      res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`)
      res.write('data: [DONE]\n\n')
      return res.end()
    }

    const reader = response.body
    const decoder = new TextDecoder()
    for await (const chunk of reader) {
      const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true })
      const lines = text.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          res.write(line + '\n\n')
          if (line.trim() === 'data: [DONE]') return res.end()
        }
      }
    }
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Chat error:', err)
    res.write(`data: ${JSON.stringify({ error: '连接失败' })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})

const PORT = process.env.PORT || 3456
app.listen(PORT, () => {
  console.log(`🏠 LightHouse Chat Server running on http://localhost:${PORT}`)
})
