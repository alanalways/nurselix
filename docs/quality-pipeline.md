# Nurslix Quality Pipeline & Agent Teams

> 2026-04-27 phase 17 — 把零散的品控工具串成自動化 pipeline。

## TL;DR

- 一份升級的規則式掃描器（18 規則）每天跑一次，發現問題就寫進 `QuestionQualityIssue`
- 五個品質 agent + 四個行銷 agent，全用 NVIDIA NIM API（GLM 5.1 / DeepSeek V4 Pro / Kimi K2.5 / MiniMax M2.7），Gemini 3 系列為 fallback
- 後台新增 `/admin/command-center` 指揮中心，整合健康度儀表板 + 行銷部
- Hermes 系統不動，繼續用 Anthropic Haiku 4.5

## 架構

```
新增模型架構
─────────────────────────────────────────────────────────
lib/agents/
├── modelRegistry.ts        # 任務 → 模型映射 + fallback chain
├── runAgent.ts             # 統一 agent runner（NIM 主力 + Gemini fallback）
├── quality/
│   ├── orchestrator.ts     # 編排 triage → verify → repair
│   ├── triageAgent.ts      # Kimi-K2.5 — 使用者回報判讀
│   ├── verifierAgent.ts    # DeepSeek-V4-Pro — 答案/解析一致性審查
│   ├── repairAgent.ts      # DeepSeek-V4-Pro — 產生修補建議
│   └── reportAgent.ts      # MiniMax-M2.7 — 健康度報告敘事
└── marketing/
    ├── seoAgent.ts         # MiniMax-M2.7 — SEO 部落格文章
    ├── socialAgent.ts      # MiniMax-M2.7 — 社群短文（X/IG/FB/LinkedIn）
    ├── emailAgent.ts       # MiniMax-M2.7 — EDM 草稿
    └── analyticsAgent.ts   # DeepSeek-V4-Pro — 使用者行為分析

lib/quality/
└── rules.ts                # 18 條規則的 TypeScript 版

prisma/migrations/
└── phase17_quality_pipeline.sql  # 新表 + QuestionReport 升級

新增資料表
─────────────────────────────────────────────────────────
QuestionQualityIssue     # 規則 + agent 偵測到的品質問題
QuestionVersion          # 改動歷史（含 agent 自動改動）
MarketingContent         # 行銷部產生的內容（draft → approved → published）
QualityHealthReport      # 每日健康度快照

QuestionReport 升級欄位：
+ reasonCategory  # enum: INCORRECT_ANSWER | TYPO | UNCLEAR_STEM | ...
+ targetOption    # 指控的特定選項
+ triageVerdict, triagedByModel, triagedAt
+ assignedTo, resolvedAt, resolvedBy, resolution
```

## 自動化排程

| 時間 (UTC) | 台灣時間 | 工作 | 執行 |
|---|---|---|---|
| 03:00 | 11:00 | quality-deep-scan | 跑 18 規則，寫 issues，更新健康度 |
| 04:00 | 12:00 | report-triage | Kimi-K2.5 處理 PENDING 回報 |
| 05:00 | 13:00 | error-rate-recompute | 重算 errorRate |
| 09:00 | 17:00 | daily-health-report | MiniMax 寫健康度敘事 |
| 10:00 | 18:00 | marketing-daily | 產社群貼文 + 週一 SEO + 週五 analytics |

## 模型分配（已實測）

| 任務 | 主模型 | 備援 1 | 備援 2 |
|---|---|---|---|
| 題庫品質審查 | `deepseek-ai/deepseek-v4-pro` | `moonshotai/kimi-k2.5` | `gemini-3-flash-preview` |
| 修補建議 | `deepseek-ai/deepseek-v4-pro` | `gemini-3-flash-preview` | `gemini-3.1-flash-lite-preview` |
| 健康度報告 | `minimaxai/minimax-m2.7` | `gemini-3.1-flash-lite-preview` | `gemini-2.5-flash` |
| 使用者回報判讀 | `moonshotai/kimi-k2.5` | `deepseek-ai/deepseek-v4-pro` | `gemini-3-flash-preview` |
| 行銷文案 | `minimaxai/minimax-m2.7` | `gemini-3.1-flash-lite-preview` | `gemini-2.5-flash` |
| 行銷分析 | `deepseek-ai/deepseek-v4-pro` | `minimaxai/minimax-m2.7` | `gemini-3-flash-preview` |
| **Hermes 教學（不動）** | `claude-haiku-4-5-20251001` | — | — |

## 規則清單（18 條）

| ID | 嚴重度 | 偵測 |
|---|---|---|
| `adverb_pollution` | HIGH/CRITICAL | 題幹+選項堆疊無意義副詞 ≥3 個 |
| `irrelevant_noise_rationale` | CRITICAL | rationale 含 "Irrelevant noise" 或 "無關雜訊" |
| `answer_rationale_contradiction` | CRITICAL | 正解 rationale 開頭寫「錯誤」 |
| `wrong_option_marked_correct` | HIGH | 錯解 rationale 開頭寫「正確」 |
| `long_stem` | MEDIUM | stem > 800 字 |
| `short_stem` | HIGH/CRITICAL | stem < 20 字或空 |
| `empty_explanation` | HIGH | explanationZh 為空 |
| `short_explanation` | MEDIUM | explanationZh < 50 字 |
| `placeholder_text` | HIGH | 含 TODO/暫無解析/lorem ipsum |
| `extreme_option_imbalance` | MEDIUM | 選項長度 max/min > 3 且 max>80 |
| `answer_pointing_null` | CRITICAL | correctAnswer 指空選項 |
| `answer_correctAnswers_mismatch` | HIGH | string 與 array 答案不一致 |
| `sata_single_answer` | MEDIUM | SATA 但只 1 個正解 |
| `mcq_multi_answer` | HIGH | MCQ 但多個正解 |
| `missing_rationale` | MEDIUM | 選項缺 rationale |
| `missing_stemZh` | MEDIUM | NCLEX 題缺中文題幹 |
| `duplicate_options` | HIGH | 兩個選項內容相同 |
| `high_error_rate` | HIGH | 錯誤率 >70% 且 attemptCount ≥10 |

## 後台導航

```
/admin                          # 既有，加 banner 連到 command-center
└── /admin/command-center       # 🆕 統一指揮中心
    ├── 健康度儀表板
    ├── Critical issues 列表
    ├── 最近回報
    ├── 最近自動修改
    └── /admin/command-center/marketing  # 🆕 行銷部
        - 內容草稿 / 核准 / 發布流程
        - 手動觸發 agent
```

舊頁面（`garbage-scan`, `content-audit`, `quality`, `spot-check`, `reports`）仍保留，從 command-center 連結進去。

## 環境變數

新增/異動：
- `NVIDIA_NIM_API_KEY`（已存在）— 主用於所有 NIM 模型
- `OPS_MODEL`（已存在）— 預設值改為 `z-ai/glm-5.1`
- `GEMINI_API_KEY_1..10`（已存在）— Gemini fallback 輪替

## Cron 觸發網址（測試用）

```bash
# 立即觸發掃描
curl -H "Authorization: Bearer $CRON_SECRET" https://nurslix.zeabur.app/api/cron/quality-scan?autoArchive=1

# 立即觸發回報分流
curl -H "Authorization: Bearer $CRON_SECRET" https://nurslix.zeabur.app/api/cron/report-triage

# 立即重算 errorRate
curl -H "Authorization: Bearer $CRON_SECRET" https://nurslix.zeabur.app/api/cron/error-rate-recompute

# 立即產生行銷內容
curl -H "Authorization: Bearer $CRON_SECRET" https://nurslix.zeabur.app/api/cron/marketing-daily
```

## CLI 工具

```bash
# Dry run 看會發現什麼
node scripts/quality-deep-scan.mjs --dry-run

# 真的寫入 DB
node scripts/quality-deep-scan.mjs

# 寫入 + 自動把 critical 題目轉 DRAFT 下架
node scripts/quality-deep-scan.mjs --auto-archive-critical

# 列出目前 OPEN issues
node scripts/list-critical-issues.mjs

# 測試 NIM 模型可用性
node scripts/test-nim-models.mjs
```

## 第一次部署的實際成效（2026-04-27）

- 偵測到 91 題有問題（5 真 critical 已修、27 偽陽性已 IGNORED、HIGH 37 + MEDIUM 49 待 agent 處理）
- 健康度分數 **96/100**
- 之前一次性清理修了 51 題；今天又補修 5 題 + 27 假陽性誤標清理

## 維運注意事項

- **Anthropic key 不要動**：Hermes 教學 agent 仍用 Haiku 4.5（你儲值的）
- **NIM key 是 free tier**：高峰時可能 timeout，runAgent 會自動切換到下一個 fallback
- **Gemini 是 free tier**：每天額度有限，10 個 keys 輪替後總量約 10K req/day
- **GitHub Actions 的 secrets**：要在 nurselix repo 的 Settings → Secrets 新增 `CRON_SECRET` 和 `APP_URL`（如果還沒）
