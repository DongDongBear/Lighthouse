# Claude Code Task — Lighthouse 2026-04-08 Step 3 North America + Big Three

You are in `/tmp/Lighthouse`.

Read and strictly follow these source prompts first:
- `/root/openclaw-prompts/lh-03-collect-na.md`
- `/tmp/Lighthouse/.lighthouse-tasks/02-collect-global.md`

Target date: `2026-04-08` (Beijing time).
Target files:
- `/tmp/Lighthouse/src/content/docs/ai-research/news/2026-04-08/daily.md`
- `/root/.openclaw/workspace/memory/ai-news-seen.json` if needed by the prompt
- `/tmp/Lighthouse/src/content/docs/ai-research/news/index.md` if required by the prompt

Rules:
1. Only do step 3, Big Three + North America + KOL sections.
2. Continue from the current daily.md, do not overwrite valid existing content.
3. Add or improve these sections if missing/incomplete:
   - `## ⭐ 三大厂动态`
   - `## 🇺🇸 北美区`
   - `## 📊 KOL 观点精选`
   - `## 下期追踪问题`
4. Ensure the final daily structure is coherent for 2026-04-08.
5. Do not do deep-read or build/deploy in this step.
6. After editing, run:
   - `git add src/content/docs/ai-research/news/2026-04-08/daily.md src/content/docs/ai-research/news/index.md /root/.openclaw/workspace/memory/ai-news-seen.json`
   - `git commit -m "collect-na: 2026-04-08 rerun via claude code"`
7. Final output must be exactly 3 lines:
   - `NA_DONE`
   - `FILES:<comma-separated files>`
   - `COMMIT:<hash or NONE>`
