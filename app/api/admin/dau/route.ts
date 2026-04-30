import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const days = 14;

  const rows = await prisma.$queryRawUnsafe<
    Array<{ d: Date | string; u: bigint }>
  >(
    `SELECT DATE("answeredAt") AS d, COUNT(DISTINCT "userId") AS u
     FROM "UserAnswer"
     WHERE "answeredAt" >= NOW() - INTERVAL '${days} days'
     GROUP BY 1
     ORDER BY 1`
  );

  // 補滿沒有人答題的日子（顯示 0）
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const map = new Map<string, number>();
  for (const row of rows) {
    const key = typeof row.d === "string" ? row.d.slice(0, 10) : row.d.toISOString().slice(0, 10);
    map.set(key, Number(row.u));
  }

  const series = dayKeys.map((date) => ({ date, dau: map.get(date) ?? 0 }));
  return NextResponse.json({ days, series });
}
