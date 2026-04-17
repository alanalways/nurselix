# Hermes AI 部署指南（給 alan）

> 這份文件是給「完全沒碰過 Anthropic API」的人看的 step-by-step 手冊。
> 跟 `HERMES_SETUP.md` 不一樣：那份講的是 **外部** Python cron（健康檢查、備份、週報觸發）；
> 這份講的是 **內建** Hermes AI（Claude Haiku + Sonnet 分析學生學習狀況）。

---

## 整體架構（30 秒版本）

```
學生完成 NCLEX session
         ↓
  finish API enqueue HermesJob（DB 一筆）
         ↓
  runHermesForSession() 背景跑
         ↓  ┌────────────────────┐
         ├─→│ Analytics Agent    │ claude-haiku-4-5-20251001
         │  │ （錯題分類、模式） │
         │  └────────────────────┘
         │
         │  ┌────────────────────┐
         └─→│ Teaching Agent     │ claude-sonnet-4-6
            │ （個人化總結）     │
            └────────────────────┘
         ↓
  upsert SessionDiagnosis + LearnerProfile
         ↓
  學生開 /insights 頁面看結果
```

外部 cron（HERMES_SETUP.md 的那些）只是「觸發器」，不跑 Claude。真正跑 AI 的是 Next.js API route。

---

## Step 1：申請 Anthropic API Key

### 1-1. 開帳號
1. 打開 https://console.anthropic.com/
2. 點右上角 **Sign Up**，用 Google / Email 都可以。
3. 註冊後會要你驗證 email、輸入手機號碼（台灣 +886 可以）。

### 1-2. 付款方式（必須）
Anthropic 採 **後付費 / 儲值制**，沒信用卡 API 是沒辦法用的。
1. 左側選單 → **Plans & Billing** → **Add credits**
2. **第一次建議儲 USD $5** 就夠。
   - Haiku 4.5：$1 / 百萬 input token，$5 / 百萬 output token
   - Sonnet 4.6：$3 / 百萬 input token，$15 / 百萬 output token
   - 平均一場 session 分析大約 ≈ $0.01，$5 可以跑 500 場。
3. **一定要開 Budget alert**：`Plans & Billing → Limits → Monthly spend limit` 設 USD $20，超過自動停用，免得某個 bug 把你燒爆。

### 1-3. 建立 API Key
1. 左側選單 → **API Keys** → **Create Key**
2. Key 名稱打 `nurslix-prod`
3. **立刻複製下來** — 離開頁面後就看不到了（Anthropic 不會二次顯示）。
4. Key 長這樣：`sk-ant-api03-XXXXXXXXXX...`（約 100 個字元）

> ⚠️ 保險起見，多建一把叫 `nurslix-staging`，本地測試用。
> 生產環境如果 leak 了，可以立刻 revoke 線上那把，不影響本地開發。

---

## Step 2：設定 Zeabur 環境變數

1. 進 Zeabur dashboard → 你的 nurslix service → **Variables** 分頁
2. 新增以下變數（**Variables** 右上角 `+ Add Variable`）：

| Key | Value | 說明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | 上面申請的那把 |
| `HERMES_ENABLED` | `true` | 總開關。緊急要關掉 Hermes 時改 `false`，省錢 |
| `HERMES_ADMIN_API_KEY` | 隨機 32 字元 hex | 給外部 cron 呼叫 admin 端點用 |
| `CRON_SECRET` | 隨機 32 字元 hex | 現有的 cron secret，照用即可 |

產生隨機字串的指令（你本地跑）：
```bash
openssl rand -hex 32
```

3. 按 **Apply** → Zeabur 會自動 re-deploy（約 1–2 分鐘）。

---

## Step 3：跑資料庫 Migration

Phase 10 的 Hermes 需要 4 個新表：`LearnerProfile`、`SessionDiagnosis`、`HermesJob`、`AppSetting`。

### 3-1. 透過 Admin 後台（推薦）
1. 部署完成後，用 admin 帳號登入 → 進 `/admin`
2. 找到「執行 DB Migration」按鈕 → 點下去
3. 出現 `✅ migration applied` 即可

### 3-2. 手動跑（備援）
如果 admin 按鈕壞了，在 Zeabur service 的 **Terminal** 分頁：
```bash
npx prisma db push
# 或
npx prisma migrate deploy
```

---

## Step 4：驗證 Hermes 有跑起來

### 4-1. 觸發一次分析
1. 用任何帳號登入 → `/nclex` → 做一場 Mini CAT（10 題）
2. 交卷後，session finish API 會自動 enqueue HermesJob

### 4-2. 看 Job 狀態
呼叫（換成你自己的 key）：
```bash
curl -X GET "https://nurslix.zeabur.app/api/admin/hermes/retry" \
  -H "Authorization: Bearer $HERMES_ADMIN_API_KEY"
```
回傳：
```json
{
  "ok": true,
  "stats": {
    "pending": 0,
    "running": 0,
    "failed": 0,
    "done": 1,      // ← 應該 ≥ 1
    "exhausted": 0
  }
}
```

### 4-3. 看學生端頁面
用剛才答題的帳號登入 → `/insights` → 應該看到：
- insightSummary（一段 Claude 寫的總結）
- θ 能力曲線
- 八大 Domain 掌握度
- topWeaknesses（前 3 大弱點）
- behaviorPatterns（作答行為模式）

---

## Step 5：連接外部 Hermes Cron（可選）

如果你有 VPS 跑 Python Hermes，照 `HERMES_SETUP.md` 的 `hermes.yml` 配置即可。
相關 admin 端點已經都做好了：

| Cron | Admin Endpoint | 目的 |
|---|---|---|
| 每週一 08:00 | `POST /api/admin/hermes/weekly-report` | 週學習報告 email |
| 每天 08:00 | `POST /api/admin/hermes/exam-reminder` | 考前倒數提醒 |
| 每 30 分 | `POST /api/admin/hermes/retry` | 重試失敗的 HermesJob（最多 3 次） |

全部都接受 `Authorization: Bearer $HERMES_ADMIN_API_KEY` 或 `$CRON_SECRET`。

---

## 成本預估

| 規模 | 每月 sessions | 每月成本（USD） |
|---|---|---|
| 100 人 × 20 sessions | 2,000 | ≈ $20 |
| 500 人 × 20 sessions | 10,000 | ≈ $100 |
| 1,000 人 × 20 sessions | 20,000 | ≈ $200 |

> 已啟用 Prompt Caching（`cache_control: ephemeral`），重複的 system prompt 可省 ~70%。

**省錢小技巧**：
- 把 `HERMES_ENABLED=false` 就是完全關掉（bypass 所有 Claude 呼叫）。
- Haiku 夠用就不要 fallback 到 Sonnet — Teaching Agent 才需要 Sonnet 的推理強度。
- 設定 Anthropic 的 **Monthly spend limit**，安全網。

---

## 常見問題

- **Q: API key leak 了怎麼辦？**
  Anthropic console → API Keys → 點那把 → **Delete**。然後 Zeabur 重新設一組新的。

- **Q: 收到 `401 invalid api key`？**
  99% 是 `ANTHROPIC_API_KEY` 少複製 / 多複製空白。重新貼一次。

- **Q: `HermesJob` 全部 failed？**
  看 `error` 欄位。常見：
  - `insufficient_quota` → 去 console 儲值
  - `overloaded` → Anthropic 那邊壞了，等 retry cron
  - `model_not_found` → 模型 ID 打錯（檢查 `lib/hermes/analyticsAgent.ts` 的 model 字串）

- **Q: 可以用 OpenAI 代替嗎？**
  不行。Hermes 的 system prompt 是針對 Claude 最佳化（用到 `cache_control`、thinking model 的特性），換成 OpenAI 要整包重寫。

---

## 小抄：一鍵驗證

```bash
# 1. 確認 env 有設
curl -s https://nurslix.zeabur.app/api/health | jq

# 2. 看 Hermes job 統計
curl -s -X GET https://nurslix.zeabur.app/api/admin/hermes/retry \
  -H "Authorization: Bearer $HERMES_ADMIN_API_KEY" | jq

# 3. 手動觸發一次週報
curl -s -X POST https://nurslix.zeabur.app/api/admin/hermes/weekly-report \
  -H "Authorization: Bearer $HERMES_ADMIN_API_KEY" | jq

# 4. 手動觸發一次考前提醒
curl -s -X POST https://nurslix.zeabur.app/api/admin/hermes/exam-reminder \
  -H "Authorization: Bearer $HERMES_ADMIN_API_KEY" | jq
```

全部回 `{"ok": true, ...}` 就代表 Hermes AI 上線成功。
