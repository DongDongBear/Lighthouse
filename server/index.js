import express from 'express'
import cors from 'cors'

const app = express()

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
app.use(express.json({ limit: '1mb' }))

const SECRET_PHRASE = 'I AM DONGDONG SEND'
const SYSTEM_PROMPT = '你是 Lighthouse 文档助手。你的工作目录是 Lighthouse 项目（Astro 文档站），可以读取项目文件来回答问题。用户正在阅读文档并提问。回复简洁准确，使用中文，支持 Markdown。'

const OPENCLAW_URL = 'http://127.0.0.1:18789/v1/chat/completions'
const OPENCLAW_KEY = 'Bearer 15dfbe164686b4d12544dca9e6f1f8d2666305d703d23df8b2a00b7bbf53ad26'

app.post('/api/verify', (req, res) => {
  const { phrase } = req.body
  if (phrase && phrase.trim().toUpperCase() === SECRET_PHRASE) {
    return res.json({ ok: true })
  }
  return res.json({ ok: false })
})

app.post('/api/chat', async (req, res) => {
  const { message, history, articleContent, phrase } = req.body
  if (!phrase || phrase.trim().toUpperCase() !== SECRET_PHRASE) {
    return res.status(403).json({ error: '未授权' })
  }
  if (!message) return res.status(400).json({ error: 'message required' })

  let systemContent = SYSTEM_PROMPT
  if (articleContent) {
    systemContent += `\n\n用户正在阅读以下文章：\n\n${articleContent}\n\n请基于这篇文章内容回答问题。`
  }

  const messages = [
    { role: 'system', content: systemContent },
  ]
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history.slice(-10)) {
      messages.push({ role: h.role, content: h.content })
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
        'Content-Type': 'application/json',
        'Authorization': OPENCLAW_KEY,
        'x-openclaw-agent-id': 'main',
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages,
        stream: true,
        user: 'lighthouse-chat',
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('OpenClaw error:', response.status, text)
      res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    req.on('close', () => {
      reader.cancel()
    })

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('data: ')) {
          res.write(trimmed + '\n\n')
          if (trimmed === 'data: [DONE]') {
            res.end()
            return
          }
        }
      }
    }

    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  } catch (err) {
    console.error('Chat error:', err)
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: '连接失败' })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    }
  }
})

const PORT = process.env.PORT || 3456
app.listen(PORT, () => {
  console.log(`LightHouse Chat Server running on http://localhost:${PORT}`)
})
