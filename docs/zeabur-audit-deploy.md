# Deploy NIM Audit Worker to Zeabur

This sets up the question-bank quality audit (`scripts/audit-parallel.mjs`) as
a permanent 24/7 background worker on Zeabur, so it keeps running even when
your laptop is offline.

## What it does

- Runs `audit-parallel.mjs --workers 2` continuously.
- Calls NVIDIA NIM (DeepSeek V4 Pro / Kimi K2.5) and Gemini fallback.
- Writes findings to `QuestionQualityIssue` table in your existing Postgres.
- Persists progress to a Zeabur Volume at `/data` so restarts resume cleanly.
- Auto-restarts after a 30-second backoff if the process ever crashes.

## One-time deploy

1. **Add a new service in your Zeabur project**
   - Service type: **Git** (use the same repo)
   - Branch: `main`
   - **Build settings → Dockerfile path**: `Dockerfile.audit`
   - This is **separate** from your Next.js service. Both can live in the same
     project and share the same Postgres.

2. **Attach a Volume**
   - In the new service's settings, add a Volume:
     - Mount path: `/data`
     - Size: 1 GB is plenty
   - This persists `audit-parallel-progress.json` across restarts.

3. **Set environment variables** (on the new service)
   - `NVIDIA_NIM_API_KEY` = (your NIM key)
   - `DATABASE_URL` = (use the same internal Postgres URL the Next.js app uses)
   - `WORKERS` = `2` (don't go higher — NIM rate-limits)
   - Optional: `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, ... for fallback.

4. **Deploy**
   - Zeabur will build using `Dockerfile.audit` and start the worker.
   - In the service logs you should see lines like:
     ```
     [audit] 2026-04-29T... starting (workers=2)...
     Workers:    2
     Total NCLEX: 14323
     [w1] 0009535c OK    ...
     ```

## Verify it's running

- **Logs tab**: should show continuous `[wN]` audit events.
- **DB**: count of `QuestionQualityIssue` rows with `ruleId LIKE 'agent.%'` should grow.
- **Progress file**: SSH into the volume or `docker exec` to read `/data/audit-parallel-progress.json`.

## Cost

Single small container running Node + a couple HTTP calls per second. On Zeabur
the actual compute is negligible — typically <$5/mo on top of your existing usage.

## Stopping / pausing

- Pause the service from Zeabur dashboard. Progress in `/data` is preserved.
- Resume later — the script reads the progress file and continues from where it left off.

## When the audit finishes

- The script processes all NCLEX rows once (id ASC), then completes the loop.
- After that the wrapper sleeps 30s and restarts, which will exit immediately
  because the queue is empty. To stop spinning, just pause the service.

## Troubleshooting

- **No progress for hours**: usually means NIM is rate-limiting or down.
  Restart the service to reconnect.
- **`All models failed` errors mounting up**: NIM tier exhausted; consider
  reducing `WORKERS` to 1 or adding more Gemini keys.
- **DB connection refused**: ensure `DATABASE_URL` uses the Zeabur **internal**
  hostname (something like `postgresql.zeabur.internal:5432`), not the public
  one. Internal is faster and free of egress fees.
