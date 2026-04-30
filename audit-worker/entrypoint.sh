#!/bin/sh
# Run audit-parallel + internal-scheduler in parallel with shared logs.
# Each runs in its own self-restart loop so a crash in one doesn't take
# down the other. Container only exits if both loops bail out, which
# requires explicit `exit 0` from inside (we never do that).
#
# Env switches:
#   AUDIT_PAUSED=1     — skip the audit-parallel NIM loop entirely.
#                        The scheduler still runs (so cron jobs keep firing).
#                        Set this when Claude (or a human) is auditing
#                        questions manually so we don't double-write issues.
set -e

echo "[entrypoint] $(date -u +%FT%TZ) starting (workers=${WORKERS}, AUDIT_PAUSED=${AUDIT_PAUSED:-0})"

# ─── scheduler self-restart loop ──────────────────────────────────────
(
  while true; do
    echo "[entrypoint] $(date -u +%FT%TZ) starting internal-scheduler"
    node scripts/internal-scheduler.mjs || \
      echo "[entrypoint] $(date -u +%FT%TZ) scheduler exited, restart in 30s"
    sleep 30
  done
) &
SCHED_PID=$!
echo "[entrypoint] scheduler loop PID=$SCHED_PID"

# ─── audit-parallel self-restart loop (skipped if AUDIT_PAUSED=1) ─────
if [ "${AUDIT_PAUSED:-0}" = "1" ] || [ "${AUDIT_PAUSED:-0}" = "true" ]; then
  echo "[entrypoint] AUDIT_PAUSED=1 — NIM audit loop skipped (manual audit in progress)"
  AUDIT_PID=""
else
  (
    while true; do
      echo "[entrypoint] $(date -u +%FT%TZ) starting audit-parallel"
      node scripts/audit-parallel.mjs --workers "${WORKERS}" || \
        echo "[entrypoint] $(date -u +%FT%TZ) audit-parallel crashed, restart in 30s"
      sleep 30
    done
  ) &
  AUDIT_PID=$!
  echo "[entrypoint] audit loop PID=$AUDIT_PID"
fi

# Wait on whatever PIDs we have — if both somehow exit, let Zeabur restart.
wait $SCHED_PID $AUDIT_PID
echo "[entrypoint] all loops exited, shutting down"
