# NIM audit worker + internal cron scheduler — runs 24/7 inside Zeabur.
#
# Two responsibilities:
#   1. audit-parallel.mjs scans the NCLEX bank with NIM and writes findings
#   2. internal-scheduler.mjs replaces GitHub Actions cron — fires the daily
#      /api/cron/* endpoints on the Next.js service via internal hostname
#
# Required env vars on Zeabur (audit-worker service):
#   NVIDIA_NIM_API_KEY       — NIM bearer token (audit only)
#   DATABASE_URL             — Postgres URL
#   CRON_SECRET              — bearer token the cron endpoints check
#   NURSLIX_INTERNAL_URL     — e.g. http://nurslix.zeabur.internal:8080
#                              (or https://nurslix.zeabur.app if internal isn't set up)
# Optional:
#   GEMINI_API_KEY_1..       — Gemini fallback (audit only)
#   WORKERS                  — concurrency for audit (default 2)

FROM node:20-alpine

WORKDIR /app

# Only need pg for DB; both scripts use native fetch (Node 18+)
RUN npm install --no-audit --no-fund pg

# Copy both runtime scripts
COPY audit-parallel.mjs        ./scripts/audit-parallel.mjs
COPY internal-scheduler.mjs    ./scripts/internal-scheduler.mjs
COPY entrypoint.sh             ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Persistent progress directory — mount as Zeabur Volume at /data
RUN mkdir -p /data
ENV PROGRESS_DIR=/data
VOLUME ["/data"]

ENV NODE_ENV=production
ENV WORKERS=2

# entrypoint launches BOTH scripts. If either crashes, the entire container
# exits and Zeabur restarts it (also resetting the other) — keeps state simple.
CMD ["./entrypoint.sh"]
