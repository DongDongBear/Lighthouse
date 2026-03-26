import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'

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

const SYSTEM_PROMPT = '你是 Lighthouse 文档助手。你的工作目录是 Lighthouse 项目（Astro 文档站），可以读取项目文件来回答问题。用户正在阅读文档并提问。回复简洁准确，使用中文，支持 Markdown。'

app.post('/api/verify', (req, res) => {
  const { phrase } = req.body
  if (phrase && phrase.trim().toUpperCase() === SECRET_PHRASE) {
    return res.json({ ok: true })
  }
  return res.json({ ok: false })
})

app.post('/api/chat', async (req, res) => {
  const { message, history, articleContent } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  // Build prompt: system context + article + history + user message
  let prompt = SYSTEM_PROMPT + '\n\n'
  if (articleContent) {
    prompt += `用户正在阅读以下文章：\n\n${articleContent}\n\n请基于这篇文章内容回答问题。\n\n`
  }
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history.slice(-20)) {
      const role = h.role === 'user' ? 'User' : 'Assistant'
      prompt += `${role}: ${h.content}\n\n`
    }
  }
  prompt += `User: ${message}`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const claudeCmd = 'claude --print --output-format stream-json --permission-mode bypassPermissions'
    const child = spawn('su', ['-', 'codeuser', '-c', claudeCmd], {
      cwd: '/tmp/Lighthouse',
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    child.stdin.write(prompt)
    child.stdin.end()

    let buffer = ''
    let fullText = ''
    let streamJsonWorked = false

    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          // Extract text from various possible stream-json formats
          let text = ''
          if (obj.type === 'content_block_delta' && obj.delta?.text) {
            text = obj.delta.text
          } else if (obj.type === 'assistant' && typeof obj.text === 'string') {
            text = obj.text
          } else if (typeof obj.content === 'string' && obj.type !== 'message_start') {
            text = obj.content
          } else if (obj.type === 'result' && typeof obj.result === 'string') {
            // Final result object — only use if we haven't streamed anything yet
            if (!fullText) text = obj.result
          }
          if (text) {
            streamJsonWorked = true
            fullText += text
            const sseData = JSON.stringify({ choices: [{ delta: { content: text } }] })
            res.write(`data: ${sseData}\n\n`)
          }
        } catch {
          // Not valid JSON — accumulate as plain text fallback
          if (!streamJsonWorked) {
            fullText += line + '\n'
          }
        }
      }
    })

    child.stderr.on('data', (chunk) => {
      console.error('Claude stderr:', chunk.toString())
    })

    child.on('close', (code) => {
      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer)
          let text = ''
          if (obj.type === 'content_block_delta' && obj.delta?.text) text = obj.delta.text
          else if (obj.type === 'assistant' && typeof obj.text === 'string') text = obj.text
          else if (typeof obj.content === 'string' && obj.type !== 'message_start') text = obj.content
          else if (obj.type === 'result' && typeof obj.result === 'string' && !fullText) text = obj.result
          if (text) {
            fullText += text
            const sseData = JSON.stringify({ choices: [{ delta: { content: text } }] })
            res.write(`data: ${sseData}\n\n`)
          }
        } catch {
          if (!streamJsonWorked) fullText += buffer
        }
      }

      // Fallback: if stream-json didn't produce incremental output, send all collected text at once
      if (!streamJsonWorked && fullText.trim()) {
        const sseData = JSON.stringify({ choices: [{ delta: { content: fullText.trim() } }] })
        res.write(`data: ${sseData}\n\n`)
      }

      if (!fullText.trim() && code !== 0) {
        res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`)
      }

      res.write('data: [DONE]\n\n')
      res.end()
    })

    child.on('error', (err) => {
      console.error('Spawn error:', err)
      res.write(`data: ${JSON.stringify({ error: '连接失败' })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    })

    // Abort on client disconnect
    req.on('close', () => {
      child.kill('SIGTERM')
    })

  } catch (err) {
    console.error('Chat error:', err)
    res.write(`data: ${JSON.stringify({ error: '连接失败' })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})

const PORT = process.env.PORT || 3456
app.listen(PORT, () => {
  console.log(`LightHouse Chat Server running on http://localhost:${PORT}`)
})
