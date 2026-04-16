import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { requireAdmin } from "@/lib/admin";

/**
 * Hermes monitor endpoint — reports health of downstream services so the
 * Hermes agent (or any uptime dashboard) can inspect a single JSON payload.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const now = Date.now();

  const [dbHealthy, redisHealthy] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
  ]);

  // Last 7 days of Hermes-generated artifacts (look for known status keys in Redis if any)
  let lastBackupAt: string | null = null;
  try {
    lastBackupAt = await redis.get("hermes:last_backup_at");
  } catch {
    // ignore
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    services: {
      database: { healthy: dbHealthy, lastChecked: new Date(now).toISOString() },
      redis:    { healthy: redisHealthy, lastChecked: new Date(now).toISOString() },
      minio:    { healthy: null, note: "MinIO ping not implemented in minimal client" },
    },
    hermes: {
      lastBackupAt,
      cronTasks: [
        { id: "ping_health",     schedule: "*/5 * * * *",  description: "每 5 分鐘呼叫 /api/health" },
        { id: "backup_db",       schedule: "0 3 * * *",    description: "每天 03:00 備份 PostgreSQL 到 MinIO" },
        { id: "cleanup_db",      schedule: "0 4 * * *",    description: "每天 04:00 清理過期 token / session" },
        { id: "weekly_report",   schedule: "0 8 * * 1",    description: "每週一 08:00 產出學習週報" },
        { id: "generate_items",  schedule: "0 9 1 * *",    description: "每月 1 日產出 200 道新題（DRAFT）" },
        { id: "reset_daily",     schedule: "0 0 * * *",    description: "每天 00:00 重置用戶每日答題計數" },
        { id: "exam_reminder",   schedule: "0 8 * * *",    description: "每天 08:00 發送考前倒數提醒" },
      ],
    },
  });
}
