import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days") ?? "7");
  const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 90 ? Math.floor(daysParam) : 7;

  // Postgres: DATE(...) + GROUP BY 在 raw SQL 比 Prisma client 簡潔很多
  const rows = await prisma.$queryRawUnsafe<
    Array<{ d: Date | string; t: string; c: bigint }>
  >(
    `SELECT DATE("generatedAt") AS d, "contentType" AS t, COUNT(*) AS c
     FROM "MarketingContent"
     WHERE "generatedAt" >= NOW() - INTERVAL '${days} days'
     GROUP BY 1, 2
     ORDER BY 1`
  );

  // 補滿日期 + 樞紐成 stacked-bar 友善格式
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const map = new Map<string, Record<string, number>>();
  for (const k of dayKeys) map.set(k, {});
  for (const row of rows) {
    const key = typeof row.d === "string" ? row.d.slice(0, 10) : row.d.toISOString().slice(0, 10);
    const bucket = map.get(key) ?? {};
    bucket[row.t] = (bucket[row.t] ?? 0) + Number(row.c);
    map.set(key, bucket);
  }

  const series = dayKeys.map((date) => {
    const bucket = map.get(date) ?? {};
    return {
      date,
      SOCIAL_POST: bucket.SOCIAL_POST ?? 0,
      SEO_ARTICLE: bucket.SEO_ARTICLE ?? 0,
      EMAIL: bucket.EMAIL ?? 0,
      AD_COPY: bucket.AD_COPY ?? 0,
      LANDING_COPY: bucket.LANDING_COPY ?? 0,
    };
  });

  return NextResponse.json({ days, series });
}
