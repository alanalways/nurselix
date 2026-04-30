#!/bin/sh
# Run audit-parallel + internal-scheduler in parallel with shared logs.
# Each runs in its own self-restart loop so a crash in one doesn't take
# down the other. Container only exits if both loops bail out, which
# requires explicit `exit 0` from inside (we never do that).
set -e

echo "[entrypoint] $(date -u +%FT%TZ) starting both processes (workers=${WORKERS})"

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

# ─── audit-parallel self-restart loop ─────────────────────────────────
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

# Wait on both — if both somehow exit (they shouldn't, both are infinite
# loops), let Zeabur restart the container.
wait $SCHED_PID $AUDIT_PID
echo "[entrypoint] both loops exited, shutting down"
