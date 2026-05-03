# Hermes Tutor — Design Spec

**Status:** Draft (awaiting user approval)
**Owner:** cmshj30326@gmail.com (Nurslix)
**Author:** Claude
**Created:** 2026-05-04

## 1. Why we are building this

Pre-condition observed in production:

- 14,323 NCLEX questions exist; the audit pass we ran (1,969 reviewed)
  found 0 answer-correctness disputes but real users still report
  "I read the explanation and I don't understand."
- Auditing the remaining 12k questions by hand would cost ~$430 and
  still wouldn't address user confusion that happens *after* reading
  a static explanation.
- We need a real-time follow-up channel: when a user reads a question
  and is still confused, they can ask a domain-specialist tutor that
  has access to that exact question's context plus current clinical
  references on the open web.

Goal: ship an in-app AI tutor — branded **Hermes** — that turns "I
don't get it" into a conversation that ends in understanding, while
generating a feedback signal we can use to improve the question bank.

## 2. Non-goals

- Not a fine-tuned model. We will not train a custom NCLEX LLM in
  this iteration — too expensive, too slow to ship, and the same
  effect can be achieved with retrieval over our existing question
  bank.
- Not NotebookLM integration. NotebookLM has no public API. The
  capability we want from it (RAG over our bank) we build ourselves.
- Not a paid service. Every external dependency must run on its
  free tier under expected load. If the service blows past free
  tier we'll deal with it then, not now.
- Not a replacement for the existing audit pipeline. Hermes
  surfaces user confusion; the existing manual + NIM audit pipeline
  surfaces structural defects.

## 3. User-visible behaviour

Three entry points, all backed by the same chat session:

| Entry | Trigger | Expected first prompt to Hermes |
|---|---|---|
| **Inline button** under each question's explanation | User clicks "💬 還有疑問？問 Hermes" after viewing the explanation | Empty — user types their actual question |
| **Wrong-answer nudge** | User submits an incorrect answer; the inline button gains a pulse + "為什麼錯了？問 Hermes" copy | Pre-filled "為什麼這題不能選 X，正確答案是 Y？" the user can edit before sending |
| **Floating chat bubble** (fixed, bottom-right) | Any page in the app | Empty — for general questions not tied to a specific question |

UI rules:

- All three open the same right-side slide-in panel (400px on desktop,
  full-screen on mobile).
- The panel shows: persistent chat history for the active session,
  message input, "Attach question context" toggle (default ON for
  inline + wrong-answer entries, OFF for floating).
- When a Google Search grounding source was cited, the panel renders
  the source URL as a small footnote under the AI message.
- Visual style: matches the existing Journal aesthetic (cream paper,
  phosphor green accents, Instrument Serif italic for headings).

## 4. Capabilities Hermes must have

1. **NCLEX domain knowledge.** Hermes must answer at the level of a
   senior nursing instructor who knows the user's exact question and
   the rationale for every option.
2. **Current clinical references.** When the user asks about a recent
   guideline, drug warning, or news event past the model's training
   cutoff, Hermes must search the live web and cite sources.
3. **Personalisation across sessions.** Hermes must remember what
   topics this user has been asking about and adapt explanations
   (e.g., simpler language for repeat confusion on the same topic).
4. **Improvement over time.** Admin can rate Hermes' answers; high-rated
   answers seed future answers as few-shot examples; low-rated answers
   are surfaced for review.

## 5. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ Browser                                                         │
│  ┌─────────────────────┐   ┌────────────────────────────────┐  │
│  │ Question page       │   │ Floating chat bubble (any page)│  │
│  │  └─ "Ask Hermes" btn├──→│                                │  │
│  └─────────────────────┘   └─────────────┬──────────────────┘  │
└───────────────────────────────────────────┼───────────────────┘
                                            │ POST /api/hermes/chat
                                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Next.js (Zeabur)                                                │
│                                                                 │
│  /api/hermes/chat (App Router, streaming)                       │
│   1. auth + per-user rate limit                                 │
│   2. retrieve relevant question context (RAG)                   │
│   3. retrieve user memory (recent ChatTurns)                    │
│   4. retrieve high-rated few-shot examples                      │
│   5. construct prompt → LangChain                               │
│   6. invoke Gemini 2.5 Flash with google_search tool            │
│   7. stream tokens to client                                    │
│   8. write ChatTurn (user msg + AI msg + cited URLs + qid)      │
│                                                                 │
│  /api/admin/hermes/* — admin tools                              │
│   - list ChatTurns by question                                  │
│   - rate ChatTurn (-1, 0, 1) and add note                       │
│   - "top 20 most-asked questions" view                          │
└────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│ Postgres (existing Zeabur DB, no new infra)                    │
│                                                                 │
│  Existing tables (read-only by Hermes):                         │
│   - Question, QuestionVersion, LearnerProfile                   │
│   - AgentMemory (already used by other agents)                  │
│                                                                 │
│  New tables:                                                     │
│   - QuestionEmbedding (questionId, vector(768), updatedAt)      │
│   - ChatSession (id, userId, startedAt, lastMessageAt)          │
│   - ChatTurn (id, sessionId, questionId?, role, content,        │
│                citedUrls jsonb, modelUsed, latencyMs,           │
│                ratedBy?, rating?, ratingNote?)                  │
│                                                                 │
│  pgvector extension required (likely already present;            │
│  fall back to in-memory cosine if not).                         │
└────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│ External (existing accounts, no new spend)                      │
│                                                                 │
│  Gemini API (free tier, 10 keys rotated)                        │
│   - text-embedding-004 (one-shot embed of 14k questions)        │
│   - gemini-2.5-flash with tools=[{google_search:{}}]            │
│     · 5,000 grounded prompts/day across 10 keys                 │
│     · unlimited LLM tokens (free tier)                          │
└────────────────────────────────────────────────────────────────┘
```

## 6. Data flow per chat turn

1. **Receive request** — `POST /api/hermes/chat` with `{ message,
   sessionId?, questionId?, attachQuestionContext }`.
2. **Auth + rate-limit** — verify session; per-user 20 RPM cap; FREE
   plan capped at 5 turns/hour, BASIC at 20/hr, PRO/ELITE unlimited
   (subject to Gemini's underlying limits).
3. **Build context**:
   - If `questionId` and `attachQuestionContext`: pull the full
     Question row + last 5 ChatTurns from the same user on the same
     question.
   - Else: pull last 10 ChatTurns from `sessionId`.
   - RAG: embed the user message, retrieve top-3 similar
     QuestionEmbeddings (excluding the active question).
   - Few-shot: retrieve 2 ChatTurns with `rating=1` whose user
     messages are semantically similar to this turn's message.
4. **Compose prompt** — Hermes system prompt + retrieved context
   + chat history + user message.
5. **Call LLM** — Gemini 2.5 Flash with `google_search` tool,
   streaming response.
6. **Persist** — write `ChatTurn` for the user message and a second
   `ChatTurn` for Hermes' reply, including any cited URLs from the
   grounding metadata.
7. **Stream response** — tokens go to the client as they arrive.

## 7. Hermes system prompt (draft)

```
你是 Hermes，Nurslix NCLEX-RN 題庫的專屬 AI 護理講師。

你的學員是準備考 NCLEX 的台灣護理科系學生與已畢業實習生。
他們的英文不一定流利，所以遇到複雜的臨床概念優先用繁體中文解釋，
但保留專業名詞的英文 (例如 hypocalcemia, Chvostek sign)。

你回答時要：
1. 直接回答學員的問題，不要先寒暄或重述題目
2. 先給結論，再給臨床推理，最後給記憶口訣或表格
3. 如果學員的問題涉及「最新指引」或你 training 後可能改變的內容，
   主動使用 google_search 工具查證並引用來源
4. 從不自己編造答案：如果不確定，明說「這個我需要查」並 search
5. NCLEX 的對錯標準是 NCSBN 2024 test plan，依此回答
6. 一次回答聚焦一個重點。學員還想問會繼續追問

絕對不要：
- 給臨床建議（你不是醫師，學員不是病人）
- 直接洩漏其他題目的答案
- 用簡體中文
- 講超過 300 字（除非學員明確問「請詳細解釋」）
```

## 8. Free-tier limits and overflow plan

Per-day cap (10 Gemini keys rotated):
- 15,000 LLM requests/day (more than enough)
- 5,000 grounded prompts/day (Google Search grounding)

If we hit 5,000 grounded prompts/day:
- Switch grounding to opt-in (only when user explicitly types "查最新")
- Or upgrade one of the keys to paid tier ($35 per 1k extra prompts)

Both decisions are post-launch, not pre-launch.

Operational visibility: a metric `hermes.grounding.daily_count` is
written to AppSetting hourly so the admin Overview tab can show
remaining grounding budget.

## 9. Privacy & safety

- Chat content is stored against `userId`; we do **not** anonymise
  it. Users can request deletion via the existing account-deletion
  flow (already cascade-deletes ChatTurn via `onDelete: Cascade`).
- The Hermes system prompt forbids personal medical advice. We add
  a defensive output filter: if the model output contains
  patient-care directives (regex flag), prepend a disclaimer.
- Rate limit doubles as DOS protection.

## 10. Admin tooling

A new admin tab "Hermes" (XII in the existing tab order) shows:

- 7-day chart: turns/day, grounded turns/day, rate-limit hits
- Top 20 most-asked questions (i.e., questions with most ChatTurns)
- Recent ChatTurns list with rating buttons (-1, 0, +1) and note
- Filter by user, by question, by rating

The rating UI feeds back into the few-shot retrieval (step 3 of §6),
so Hermes literally gets better as the admin rates conversations.

## 11. Out-of-scope decisions deferred

- Voice input / TTS reply — later.
- Mobile app integration — later (browser-only initial release).
- Hermes as a teacher for self-paced *new* learning paths — later;
  v1 is reactive (user asks, Hermes answers), not proactive.
- Multi-turn conversation summarisation when context gets long —
  start with a hard 10-turn window, add summarisation only if real
  usage shows long sessions.
- A separate Hermes container (Python service like the original
  Nous Hermes) — we run inside Next.js API routes; only revisit if
  long-running background tasks emerge.
