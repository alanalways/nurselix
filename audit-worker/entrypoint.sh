#!/bin/sh
# Run audit-parallel + internal-scheduler in parallel with shared logs.
# If either exits, kill the other and let Zeabur restart the container.
set -e

echo "[entrypoint] $(date -u +%FT%TZ) starting both processes (workers=${WORKERS})"

# Start scheduler (lightweight, mostly sleeps)
node scripts/internal-scheduler.mjs &
SCHED_PID=$!
echo "[entrypoint] scheduler PID=$SCHED_PID"

# Loop the audit worker forever — if it crashes we just restart it
# in-place rather than the whole container, since the scheduler is fine.
(
  while true; do
    echo "[entrypoint] $(date -u +%FT%TZ) starting audit-parallel"
    node scripts/audit-parallel.mjs --workers "${WORKERS}" || \
      echo "[entrypoint] $(date -u +%FT%TZ) audit-parallel crashed, restarting in 30s"
    sleep 30
  done
) &
AUDIT_PID=$!
echo "[entrypoint] audit loop PID=$AUDIT_PID"

# If either dies, exit so Zeabur restarts the container.
wait -n $SCHED_PID $AUDIT_PID
EXIT_CODE=$?
echo "[entrypoint] one process died (exit=$EXIT_CODE), shutting down"
kill $SCHED_PID $AUDIT_PID 2>/dev/null || true
exit $EXIT_CODE
