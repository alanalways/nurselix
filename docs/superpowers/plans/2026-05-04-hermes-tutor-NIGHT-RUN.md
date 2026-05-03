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

(若中途中斷,把當下狀態寫在這裡)
