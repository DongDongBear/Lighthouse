import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import { writeFileSync, chmodSync } from 'fs'

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
  const { message, history, articleContent, phrase } = req.body
  if (!phrase || phrase.trim().toUpperCase() !== SECRET_PHRASE) {
    return res.status(403).json({ error: '未授权' })
  }
  if (!message) return res.status(400).json({ error: 'message required' })

  let systemContent = SYSTEM_PROMPT
  if (articleContent) {
    systemContent += `\n\n用户正在阅读以下文章：\n\n${articleContent}\n\n请基于这篇文章内容回答问题。`
  }

  // 构造完整 prompt（history + 当前消息）
  let prompt = ''
  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-10)
    prompt += '[之前的对话]\n'
    for (const h of recent) {
      const role = h.role === 'assistant' ? '助手' : '用户'
      prompt += `${role}: ${h.content}\n`
    }
    prompt += '\n[当前问题]\n'
  }
  prompt += message

  // 发送 SSE headers 并 flush（关键：不 flush 的话 Express 5 会提前关闭请求）
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // 写 prompt 和 system prompt 到临时文件避免 shell 转义问题
  const ts = Date.now()
  const promptFile = `/tmp/claude-prompt-${ts}.txt`
  const sysFile = `/tmp/claude-sys-${ts}.txt`
  writeFileSync(promptFile, prompt, 'utf8')
  writeFileSync(sysFile, systemContent, 'utf8')
  chmodSync(promptFile, 0o644)
  chmodSync(sysFile, 0o644)

  // 用 su - codeuser 运行 Claude Code CLI
  const shellCmd = `cd /tmp/Lighthouse && claude --print --output-format stream-json --verbose --include-partial-messages --permission-mode bypassPermissions --model sonnet --system-prompt-file '${sysFile}' "$(cat '${promptFile}')"`

  const child = spawn('su', ['-', 'codeuser', '-c', shellCmd], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let buffer = ''
  let killed = false

  const cleanup = () => {
    if (!killed) {
      killed = true
      child.kill('SIGTERM')
    }
  }

  // 客户端主动断开时清理子进程
  res.on('close', () => {
    if (!res.writableEnded) cleanup()
  })

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const obj = JSON.parse(trimmed)
        // 提取 text_delta 流式事件
        if (
          obj.type === 'stream_event' &&
          obj.event?.type === 'content_block_delta' &&
          obj.event?.delta?.type === 'text_delta' &&
          typeof obj.event.delta.text === 'string'
        ) {
          const text = obj.event.delta.text
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)
        }
      } catch {
        // 忽略非 JSON 行
      }
    }
  })

  child.stderr.on('data', (chunk) => {
    console.error('[chat stderr]', chunk.toString().slice(0, 200))
  })

  child.on('close', (code) => {
    // 清理临时文件（作为 root 进程删除）
    try { import('fs').then(f => { f.unlinkSync(promptFile); f.unlinkSync(sysFile) }) } catch {}
    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  })

  child.on('error', (err) => {
    console.error('[chat error]', err.message)
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: 'AI 服务启动失败' })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    }
  })
})

const PORT = process.env.PORT || 3456
app.listen(PORT, () => {
  console.log(`LightHouse Chat Server running on http://localhost:${PORT}`)
})
