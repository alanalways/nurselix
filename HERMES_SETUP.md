# Hermes 自動化維護 Agent — 安裝與設定

Hermes 是 Nurslix 對外的「總管家」：
- 監控服務健康（PostgreSQL / Redis / MinIO / API）
- 每日備份資料庫到 MinIO
- 清理過期 token / session
- 發送每週學習週報
- 定期生成 200 道新題（DRAFT 狀態，交由 admin 審核）
- 重置用戶每日答題配額（Redis）
- 發送考前倒數提醒

本文檔涵蓋：
1. 先決條件
2. 安裝 Hermes
3. 設定模型（Codex）
4. Telegram 通知設定
5. 完整維護指令（直接貼給 Hermes）

---

## 1. 先決條件

在 Zeabur（或任一可以跑 cron job 的 VPS）上準備：

```bash
# 基本工具
apt-get update && apt-get install -y curl jq postgresql-client redis-tools cron

# mc (MinIO client)，用於備份上傳
wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
chmod +x /usr/local/bin/mc

# mc 初次設定
mc alias set nurslix $MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
mc mb nurslix/nurslix-backups 2>/dev/null || true
```

環境變數（與主站相同）：
```
DATABASE_URL
REDIS_URL
MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY / MINIO_BUCKET
NEXT_PUBLIC_APP_URL         # 例如 https://nurslix.zeabur.app
TELEGRAM_BOT_TOKEN          # Hermes 用
TELEGRAM_CHAT_ID            # Hermes 用
HERMES_ADMIN_API_KEY        # 用於呼叫 admin 端點，請自訂一組 hex 字串
```

---

## 2. 安裝 Hermes

```bash
# Hermes 本體是個輕量的 Python CLI，推薦以 pipx 安裝（隔離環境）
apt install -y pipx && pipx ensurepath
pipx install hermes-cli          # 套件名僅示意，依實際安裝方式調整

# 驗證
hermes --version
hermes init --project nurslix
```

> Hermes 預設會把設定檔放在 `~/.config/hermes/nurslix/`。

---

## 3. 設定模型（Codex）

Hermes 預設使用 OpenAI Codex 作為後端推理模型。將 OPENAI key 寫入：

```bash
hermes config set provider openai
hermes config set model gpt-4.1-mini     # 或你想用的 Codex 家族
hermes config set api_key $OPENAI_API_KEY
```

---

## 4. Telegram 通知設定

1. 建立 Telegram Bot：
   - 在 Telegram 搜尋 `@BotFather` → `/newbot` → 取得 `TELEGRAM_BOT_TOKEN`
2. 取得 chat id：
   - 把剛剛的 bot 加到你的私訊 / 群組
   - 呼叫 `https://api.telegram.org/bot<TOKEN>/getUpdates` 取得 `chat.id`
3. 設定 Hermes：

```bash
hermes notifications add telegram \
  --token $TELEGRAM_BOT_TOKEN \
  --chat-id $TELEGRAM_CHAT_ID

hermes notifications test telegram   # 應該會收到一條測試訊息
```

---

## 5. 完整維護指令（貼給 Hermes）

> 把下面整段貼給 Hermes agent（或放進 `hermes.yml` / `tasks.json`），Hermes 會根據 cron 自動執行。

```yaml
project: nurslix
env_required:
  - DATABASE_URL
  - REDIS_URL
  - NEXT_PUBLIC_APP_URL
  - MINIO_ENDPOINT
  - MINIO_ACCESS_KEY
  - MINIO_SECRET_KEY
  - MINIO_BUCKET
  - TELEGRAM_BOT_TOKEN
  - TELEGRAM_CHAT_ID
  - HERMES_ADMIN_API_KEY

tasks:

  # 1. Health Ping — 每 5 分鐘
  - id: ping_health
    schedule: "*/5 * * * *"
    description: "Ping /api/health；2xx 外發 Telegram 告警"
    shell: |
      set -e
      status=$(curl -s -o /tmp/h.json -w "%{http_code}" "$NEXT_PUBLIC_APP_URL/api/health" || echo 000)
      if [ "$status" != "200" ]; then
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
          -d chat_id="$TELEGRAM_CHAT_ID" \
          --data-urlencode text="🚨 Nurslix Health check failed: HTTP $status\n$(cat /tmp/h.json | head -c 500)"
      fi

  # 2. PostgreSQL 備份 → MinIO — 每天 03:00
  - id: backup_db
    schedule: "0 3 * * *"
    description: "pg_dump → MinIO，保留 30 天"
    shell: |
      set -e
      ts=$(date -u +%Y%m%dT%H%M%SZ)
      file=/tmp/nurslix-$ts.sql.gz
      pg_dump "$DATABASE_URL" | gzip > "$file"
      mc cp "$file" "nurslix/$MINIO_BUCKET/backups/nurslix-$ts.sql.gz"
      mc rm --recursive --force --older-than 30d "nurslix/$MINIO_BUCKET/backups/" || true
      rm -f "$file"
      redis-cli -u "$REDIS_URL" SET hermes:last_backup_at "$(date -Iseconds)"
      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        --data-urlencode text="✅ Nurslix DB backup uploaded: nurslix-$ts.sql.gz"

  # 3. 資料庫清理 — 每天 04:00
  - id: cleanup_db
    schedule: "0 4 * * *"
    description: "清掉過期 VerificationToken、90 天前的 UserAnswer log 之類的"
    shell: |
      psql "$DATABASE_URL" <<SQL
        DELETE FROM "VerificationToken" WHERE "expires" < NOW() - INTERVAL '7 days';
      SQL

  # 4. 學習週報 — 每週一 08:00
  - id: weekly_report
    schedule: "0 8 * * 1"
    description: "為所有 Pro / Elite 用戶產出上週學習週報並 email"
    shell: |
      curl -s -X POST "$NEXT_PUBLIC_APP_URL/api/admin/hermes/weekly-report" \
        -H "Authorization: Bearer $HERMES_ADMIN_API_KEY"

  # 5. 生成 200 道新題 — 每月 1 日 09:00
  - id: generate_items
    schedule: "0 9 1 * *"
    description: "以 Codex 生成 200 道新題（status=DRAFT），通知 admin 審核"
    hermes_prompt: |
      請以 NCLEX-RN 2026 規格，產生 200 道新題（完全英文、含繁中解析至少 300 字），
      難度分布 Easy 25% / Medium 50% / Hard 25%，
      domain 分布依照 prompt 指南。產出後 POST 到
      $NEXT_PUBLIC_APP_URL/api/admin/questions 每題一次（Authorization Bearer $HERMES_ADMIN_API_KEY），
      status 設為 DRAFT。完成後發 Telegram 通知 admin 審核。

  # 6. 每日計數重置（Redis） — 每天 00:00
  - id: reset_daily
    schedule: "0 0 * * *"
    description: "清掉 daily:YYYYMMDD:* key，讓每日題數計數歸零"
    shell: |
      yesterday=$(date -u -d "yesterday" +%Y%m%d)
      redis-cli -u "$REDIS_URL" --scan --pattern "daily:$yesterday:*" | \
        xargs -r -n 100 redis-cli -u "$REDIS_URL" DEL

  # 7. 考前倒數提醒 — 每天 08:00
  - id: exam_reminder
    schedule: "0 8 * * *"
    description: "對 examDate 距今 ≤ 7 天的用戶寄 email 提醒"
    shell: |
      curl -s -X POST "$NEXT_PUBLIC_APP_URL/api/admin/hermes/exam-reminder" \
        -H "Authorization: Bearer $HERMES_ADMIN_API_KEY"
```

儲存後啟動：

```bash
hermes run
# 或部署為 systemd service
hermes service install
systemctl enable --now hermes
```

---

## 6. 驗證

1. 在 Admin 後台 → `Hermes 狀態` 頁面：
   - 上方三個服務卡應該全部顯示「連線正常」
   - 排程任務清單列出 7 個 cron task
2. Telegram：手動觸發一次 `ping_health` 並人為製造一個 500，應該會收到 Telegram 告警
3. 第一次 `backup_db` 跑完後，MinIO console 應該看到 `nurslix-<ts>.sql.gz`

---

## 7. 常見問題

- **備份失敗 `pg_dump: could not connect`** → 確認 VPS 能連到 PostgreSQL 內網
- **mc: unable to get Stat** → `mc alias set` 的 MINIO_ENDPOINT 格式要是 `http://host:port`
- **Telegram 無訊息** → `hermes notifications test telegram` 先確認可以單獨發

如需新增 cron，直接把新的 task 加到 `hermes.yml`，Hermes 會在下次 reload 時 pick up。
