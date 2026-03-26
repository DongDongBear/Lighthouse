import express from 'express'
import cors from 'cors'
import { exec } from 'child_process'
import { appendFileSync, writeFileSync, unlinkSync } from 'fs'
import { randomBytes } from 'crypto'

function dbg(msg) { appendFileSync("/tmp/lh-chat-debug.txt", new Date().toISOString() + " " + msg + "\n") }

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

app.post('/api/verify', (req, res) => {
  const { phrase } = req.body
  if (phrase && phrase.trim().toUpperCase() === SECRET_PHRASE) {
    return res.json({ ok: true })
  }
  return res.json({ ok: false })
})

app.post('/api/chat', async (req, res) => {
  dbg("[CHAT] handler invoked, message: " + (req.body?.message || "<empty>"))
  console.error("HANDLER CALLED", new Date().toISOString())
  const { message, history, articleContent, phrase } = req.body
  if (!phrase || phrase.trim().toUpperCase() !== SECRET_PHRASE) {
    return res.status(403).json({ error: '未授权' })
  }
  if (!message) return res.status(400).json({ error: 'message required' })

  let prompt = SYSTEM_PROMPT + '\n\n'
  if (articleContent) {
    prompt += `用户正在阅读以下文章：\n\n${articleContent}\n\n请基于这篇文章内容回答问题。\n\n`
  }
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history.slice(-10)) {
      const role = h.role === 'user' ? 'User' : 'Assistant'
      prompt += `${role}: ${h.content}\n\n`
    }
  }
  prompt += `User: ${message}`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const tmpFile = `/tmp/lh-chat-prompt-${randomBytes(8).toString('hex')}.txt`

  try {
    writeFileSync(tmpFile, prompt, { mode: 0o644 })
    dbg("[CHAT] wrote tmp file: " + tmpFile + ", prompt length: " + prompt.length)

    const cmd = `cat ${tmpFile} | su - codeuser -c "cd /tmp/Lighthouse && claude --print --permission-mode bypassPermissions"`

    const child = exec(cmd, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
    }, (error, stdout, stderr) => {
      if (stderr) {
        dbg("[CHAT] claude stderr: " + stderr.substring(0, 200))
        console.error('Claude stderr:', stderr.substring(0, 500))
      }

      dbg("[CHAT] exec done, code=" + (error ? error.code : 0) + " stdout=" + stdout.length)
      console.error("DEBUG: exec done, error:", error?.message || "none", "stdout length:", stdout.length)

      if (!res.writableEnded) {
        if (!stdout.trim()) {
          res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`)
        } else {
          const sseData = JSON.stringify({ choices: [{ delta: { content: stdout } }] })
          res.write(`data: ${sseData}\n\n`)
        }
        res.write('data: [DONE]\n\n')
        res.end()
      }

      try { unlinkSync(tmpFile) } catch (_) {}
      dbg("[CHAT] tmp file cleaned: " + tmpFile)
    })

    req.on('close', () => {
      if (child.pid) child.kill('SIGTERM')
    })

  } catch (err) {
    console.error('Chat error:', err)
    try { unlinkSync(tmpFile) } catch (_) {}
    res.write(`data: ${JSON.stringify({ error: '连接失败' })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})

const PORT = process.env.PORT || 3456
app.listen(PORT, () => {
  console.log(`LightHouse Chat Server running on http://localhost:${PORT}`)
})
