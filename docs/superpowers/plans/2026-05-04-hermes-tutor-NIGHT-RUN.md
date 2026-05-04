# Hermes Tutor — 夜間自動執行手冊

**啟動時間:** 2026-05-04 05:30 Taipei (= 2026-05-03 21:30 UTC)
**預計完成:** 2026-05-04 09:30 Taipei (使用者預計起床時間)
**模式:** Subagent-driven,wave-by-wave 並行
**重置時間:** 5h block 在 2026-05-03 21:00 UTC = 05:00 Taipei 重置,啟動時是全新 block

## 啟動時必做的第一件事

讀 [docs/superpowers/plans/2026-05-04-hermes-tutor.md](2026-05-04-hermes-tutor.md) 的 Task 1。

## Wave 執行順序(必須照這個順序,不能亂)

### Wave 0(序列,單一 task)
- Task 1: Prisma schema + pgvector migration
- 完成後 review diff,確認 schema 正確再進 Wave 1

### Wave 1(3 個並行 subagent)
同時派出:
- Task 2: Gemini embedding helper
- Task 6: Hermes system prompt module
- Task 8: Per-user rate limiter

每個 subagent 必須:
1. 嚴格照 plan 檔的 step 走
2. 完成後跑 unit test 確認綠燈
3. 自己 commit
4. 回報 commit SHA + 「綠燈」或「紅燈+原因」

### Wave 2(3 個並行 subagent,等 Wave 1 全綠後啟動)
- Task 3: 14k 題回填腳本(可 dry-run,實際回填留給使用者醒來執行,因為要 30 分鐘且會打 Gemini API)
- Task 4: RAG retrieval helper
- Task 5: User memory retrieval

### Wave 3(2 個並行)
- Task 7: LangChain Gemini 包裝
- Task 9: /api/hermes/chat SSE 端點

### Wave 4(2 個並行)
- Task 10: 右側 slide-in 面板
- Task 13: Admin Hermes tab

### Wave 5(2 個並行)
- Task 11: Inline 按鈕
- Task 12: 浮動 bubble

### Wave 6(序列)
- Task 14: E2E smoke test

## 每個 wave 結束後我必須做的事

1. 跑 `cd /c/Users/alanl/Desktop/掃資料/nurselix && pnpm typecheck` 看有沒有 type error
2. 跑該 task 的 unit test
3. 如果紅燈,**不要**強行進下一 wave,先派一個修 bug 的 subagent
4. 全綠才推下一 wave

## 紅燈處理規則

- 第一次紅燈:派 fix-it subagent,給它失敗訊息,讓它修
- 第二次紅燈(同一個 task):暫停整個流程,記錄狀態到這個檔案的「中斷紀錄」section,排 wakeup 等使用者醒來
- 不要無限重試,不要繞過測試,不要把測試刪掉騙綠燈

## 不能做的事

1. 不能改 plan 的內容(plan 已經 user-approved)
2. 不能跳過 unit test
3. 不能在 Wave 1 完成前進 Wave 2
4. 不能用 production DB 做 embedding 回填(Task 3 只 dry-run 驗證腳本,真實回填等使用者醒來)
5. 不能 push 到 main,只能 push 到 `quality-pipeline-2026-04-27`

## Cost 預算

- 啟動時是新 5h block($0)
- 14 個 task,每個 task 一個 fresh subagent(~5k token / agent),預估總 cost <$15
- 如果某個 wave 燒超 $20,暫停查原因(可能是 subagent 鬼打牆)

## 中斷紀錄(若有)

### 2026-05-04 05:30+ Taipei — Wave 0 Task 1 BLOCKED

**狀態:** 整個夜間 run 在 Wave 0 第一步就停下,**沒有任何 commit、沒有改任何檔案、工作樹乾淨**。

**阻擋原因:** Task 1 Step 1 的 pgvector 探測回傳 NOT AVAILABLE。
- Zeabur 上的 Postgres 是 **PostgreSQL 18.3 (Debian, `pgdg13+1`)**
- `pg_available_extensions` 共 46 個項目,**完全沒有 `vector` / `pgvector` / `pg_vector`**
- 已安裝的只有 `plpgsql`
- 連線/帳密/網路都正常,問題在 image 本身不含 pgvector binary

**為什麼整個夜間 run 都停:**
Task 2-14 全部依賴 `QuestionEmbedding` 與 `ChatTurn` 兩張表,這兩張表又依賴 pgvector。Task 1 沒成,後面 13 個 task 連 schema 都拿不到,沒辦法做有意義的測試或 commit。

**不能動的原因(夜間手冊規則):**
- 規則 #2「不能改 plan 的內容」→ 不能擅自改 Task 1 走 CTE fallback
- 換 Postgres image 是 infra 級不可逆操作,屬於使用者層決策,agent 不可自決
- Task 1 plan 的 Step 1 明寫:`If NOT AVAILABLE, stop and tell the user`

**等使用者醒來要做的決策(三選一):**
1. **換 image** — 在 Zeabur 把 Postgres 換成 `pgvector/pgvector:pg17` 或 Zeabur 內建的 pgvector template,完成後本檔重啟 Task 1。風險:DB 遷移可能需要 dump/restore,要評估資料量。
2. **改 plan 走 CTE fallback** — Plan Task 1 Appendix 提到的 CTE-based cosine fallback。要重寫 Task 1 + Task 4 的 SQL,效能會差很多(沒有 HNSW index,14k 列每次掃)。
3. **外接 vector store** — 把 embedding 移到 Pinecone / Qdrant / Supabase Vector,改寫 Task 2/3/4。最大改動,但解耦最乾淨。

**建議:** 1 最省事且符合原 spec(Plan 設計就假設 Zeabur 有 pgvector)。先在 Zeabur 後台確認可不可以無痛換 image,如果 OK 就走 1。

**重啟方式:** 解決 pgvector 後,從本檔 Wave 0 重新跑這個排程任務即可,前面沒留下任何不可逆改動。

---

### 2026-05-04 02:50 Taipei — 使用者授權走選項 2 (CTE fallback)

使用者 02:49 看到 BLOCKED 後直接說「你先完成你答應我的事情」,授權我:
1. 走選項 2:CTE cosine fallback,不需要他做 infra 操作
2. 直接修改 Plan 的 Task 1 Schema 與 Task 4 RAG 部分(原規則 #1「不能改 plan」由使用者明確 override)
3. 主 session 自己跑,不另派 subagent(節省 cost,因為 dispatch 失敗後再上會更貴)

**Schema 改動(原 Task 1):**
- `embedding vector(768)` → `embedding JSONB`(存 768 個 float 的 array)
- 拿掉 `USING hnsw` index
- Prisma 模型 `Unsupported("vector(768)")` → `Json`
- 不執行 `CREATE EXTENSION vector`

**RAG 改動(原 Task 4):**
- 刪掉 `<=>` operator,改用純 SQL `1 - dot_product / (norm_a * norm_b)`
- 預期效能:14k 列全表掃,~50-150ms/query(可接受,LLM 本身要 800ms-2s)
- 加 `Question.module = 'NCLEX'` 預先過濾減少掃描

剩下 Task 2/3/5/6/7/8/9/10/11/12/13/14 完全不變,因為它們都只依賴 schema 的 logical shape(questionId、embedding),不在意底層儲存型別。


