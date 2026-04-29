# NIM audit worker — runs scripts/audit-parallel.mjs against NCLEX bank 24/7.
# Build context: this directory only (audit-worker/).
# Required env vars on Zeabur:
#   NVIDIA_NIM_API_KEY  — NIM bearer token
#   DATABASE_URL        — Postgres URL (use Zeabur internal hostname)
# Optional:
#   GEMINI_API_KEY_1..  — Gemini fallback keys
#   WORKERS             — concurrency (default 2)

FROM node:20-alpine

WORKDIR /app

# Only need pg for DB; audit script uses native fetch (Node 18+)
RUN npm install --no-audit --no-fund pg

# Copy the audit script (lives in this directory now)
COPY audit-parallel.mjs ./scripts/audit-parallel.mjs

# Persistent progress directory — mount as Zeabur Volume at /data
RUN mkdir -p /data
ENV PROGRESS_DIR=/data
VOLUME ["/data"]

ENV NODE_ENV=production
ENV WORKERS=2

# Loop forever: if the process exits (e.g., transient NIM blip), wait 30s and restart.
CMD ["sh", "-c", "while true; do echo \"[audit] $(date -u +%FT%TZ) starting (workers=${WORKERS})...\"; node scripts/audit-parallel.mjs --workers ${WORKERS} || echo \"[audit] $(date -u +%FT%TZ) crashed, restarting in 30s\"; sleep 30; done"]
