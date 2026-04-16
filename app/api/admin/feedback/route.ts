import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const [rows, avg, distribution] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.feedback.aggregate({ _avg: { rating: true }, _count: true }),
    prisma.feedback.groupBy({ by: ["rating"], _count: true }),
  ]);

  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of distribution) dist[r.rating] = r._count;

  return NextResponse.json({
    rows,
    avgRating: avg._avg.rating ?? 0,
    totalCount: avg._count,
    distribution: dist,
  });
}
