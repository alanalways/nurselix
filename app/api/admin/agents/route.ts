import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const now = Date.now();

  const [dbHealthy, redisHealthy, jobStats, lastDone, recentFailed] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
    Promise.all([
      prisma.hermesJob.count({ where: { status: "pending" } }),
      prisma.hermesJob.count({ where: { status: "running" } }),
      prisma.hermesJob.count({ where: { status: "failed", attempts: { lt: 3 } } }),
      prisma.hermesJob.count({ where: { status: "done" } }),
      prisma.hermesJob.count({ where: { status: "failed", attempts: { gte: 3 } } }),
    ]),
    prisma.hermesJob.findFirst({
      where: { status: "done" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.hermesJob.findMany({
      where: { status: "failed", attempts: { gte: 3 } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, sessionId: true, error: true, updatedAt: true, attempts: true },
    }),
  ]);

  const [pending, running, retryable, done, exhausted] = jobStats;

  return NextResponse.json({
    timestamp: new Date(now).toISOString(),
    services: {
      database: { healthy: dbHealthy },
      redis:    { healthy: redisHealthy },
    },
    hermesJobs: {
      pending,
      running,
      retryable,
      done,
      exhausted,
      lastSuccessAt: lastDone?.updatedAt?.toISOString() ?? null,
      recentExhausted: recentFailed.map((j) => ({
        id: j.id,
        sessionId: j.sessionId,
        attempts: j.attempts,
        error: j.error,
        updatedAt: j.updatedAt.toISOString(),
      })),
    },
    githubActionsUrl: "https://github.com/alanalways/nurselix/actions",
  });
}
