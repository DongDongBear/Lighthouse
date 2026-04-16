# North America company / funding / news-source signals for Lighthouse NA round

Window enforced: 2026-04-15 13:48 CDT -> 2026-04-16 13:48 CDT
Dedupe check: compared against `/tmp/Lighthouse/src/content/docs/ai-research/news/2026-04-10` through `2026-04-16` daily.md files; selected items below did not appear there.

## Solid items (A/B only)

### 1) [B] Cerebras closes an $850M revolving credit facility
- Timestamp: 2026-04-15 14:50 CDT (Google News RSS timestamp for the official Business Wire release)
- Why it matters: this is a real financing signal for a named North America AI infra company on the target list. Even without a new product launch, fresh credit capacity is material because Cerebras is still in the expensive scale-up / capacity-build phase and financing conditions are a key readthrough for AI hardware names.
- Source URL: https://www.businesswire.com/news/home/20260415135547/en/Cerebras-Systems-Closes-850-Million-Revolving-Credit-Facility

### 2) [B] AWS adds Claude Opus 4.7 to Amazon Bedrock on the same-day announcements feed
- Timestamp: 2026-04-16 07:00 CDT
- Why it matters: this is a direct AWS distribution signal. Bedrock availability remains one of the cleanest ways to see which frontier models AWS is pushing into enterprise procurement channels. It is not a net-new Anthropic launch, but it is a meaningful Amazon/AWS commercialization move inside the 24h window.
- Source URL: https://aws.amazon.com/about-aws/whats-new/2026/04/claude-opus-4.7-amazon-bedrock/

### 3) [B] Meta engineering publishes a hyperscale AI infra post on unified AI agents for capacity efficiency
- Timestamp: 2026-04-16 11:00 CDT
- Why it matters: this is not a flashy model launch, but it is a credible first-party Meta signal that AI-agent-based infra optimization is moving into production/hyperscale operations. For Lighthouse purposes, it is a usable Meta AI operations signal rather than consumer/product noise.
- Source URL: https://engineering.fb.com/2026/04/16/production-engineering/capacity-efficiency-at-meta-how-unified-ai-agents-optimize-performance-at-hyperscale/

## Checked search coverage

- [x] 7-day dedupe against daily.md files for 2026-04-10, 04-11, 04-12, 04-13, 04-14, 04-15, 04-16
- [x] Official / primary pages checked: Meta, Apple Newsroom, AWS announcements feed, Databricks blog, Character.AI blog RSS, Together AI blog RSS, Groq newsroom, CoreWeave newsroom, Cerebras sitemap/press paths, Replicate blog, Modal blog, W&B articles
- [x] Broad news sweep (past 1 day) for: Meta, Microsoft, Apple, xAI, Amazon/AWS, Cohere, AI21, Perplexity, Character.AI, Midjourney, Runway, Scale, Databricks, Together, Groq, Cerebras, CoreWeave, Anyscale, W&B, Replicate, Modal
- [x] Funding / M&A / IPO / policy sweep across the same company set
- [x] Hacker News homepage checked
- [x] Hacker News newest checked
- [x] GitHub Trending checked

## Explicitly discarded

- Meta Quest pricing update — discarded as non-AI / consumer hardware pricing, C-grade
- Apple recycled-materials release — discarded as non-AI, C-grade
- Microsoft Hannover Messe “Unlock Industrial Intelligence” page — discarded as broad marketing/event content, not a clean A/B-grade incremental AI signal
- Amazon Bio Discovery launch (`aboutamazon.com/news/aws/aws-amazon-bio-discovery-ai-drug-research`) — discarded as stale for this round; official sitemap lastmod is 2026-04-14, outside the 24h window
- Character.AI “c.ai books” launch (`https://blog.character.ai/cai-books/`) — within window, but discarded as C-grade consumer engagement feature rather than material company/funding signal
- Perplexity “Personal Computer for Mac” coverage — discarded because the accessible hits were secondary coverage; no clean primary-source post verified in-window
- xAI renting compute to Cursor (The Information / Seeking Alpha pickup) — discarded as single-source report without primary confirmation
- Groq Bell Canada sovereign AI network post — discarded as stale (page contains late-March / early-April publication markers, outside 24h)
- Groq + Meta official Llama API collaboration post — discarded as stale (early-April, outside 24h)
- Together AI “Parcae” post — discarded as stale (RSS pubDate 2026-04-15 00:00 GMT = 2026-04-14 CDT)
- Replicate Seedance 2.0 how-to post — discarded as likely outside the strict 24h cutoff and mostly partner/integration content
- Databricks document-intelligence follow-up posts surfaced on 2026-04-16 — discarded as derivative / lower-signal follow-ons to already-covered Agent Bricks / Document Intelligence rollout, not strong enough for this round
- CoreWeave items (Jane Street, Meta contract, Anthropic deal) — discarded here as duplicates already covered in recent daily files
- Cohere, AI21, Midjourney, Runway, Scale, Anyscale, W&B, Modal — checked, but no solid in-window A/B-grade primary-source item found
- HN homepage/newest — checked; no material target-company/funding/policy signal worth inclusion
- GitHub Trending — checked; AI repos were present, but no direct target-company signal worth inclusion
