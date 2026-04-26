import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};
  if (status && ["pending", "reviewed", "resolved"].includes(status)) where.status = status;

  const rows = await prisma.questionReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { email: true, name: true } },
      question: { select: { id: true, stem: true, domain: true, difficulty: true } },
    },
  });

  return NextResponse.json({ rows });
}

/**
 * POST /api/admin/reports?action=dedup
 * Resolves older duplicate pending reports — keeps the most recent per (userId, questionId).
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  if (url.searchParams.get("action") !== "dedup") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Find all pending reports grouped by (userId, questionId) with more than one entry
  const pending = await prisma.questionReport.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true, questionId: true, createdAt: true },
  });

  // Keep latest per (userId+questionId), collect IDs of all duplicates
  const seen = new Map<string, string>(); // key -> kept id
  const toResolve: string[] = [];
  for (const r of pending) {
    const key = `${r.userId}::${r.questionId}`;
    if (seen.has(key)) {
      toResolve.push(r.id);
    } else {
      seen.set(key, r.id);
    }
  }

  if (toResolve.length === 0) {
    return NextResponse.json({ resolved: 0, message: "沒有重複回報" });
  }

  const result = await prisma.questionReport.updateMany({
    where: { id: { in: toResolve } },
    data: { status: "resolved" },
  });

  return NextResponse.json({ resolved: result.count, message: `已清理 ${result.count} 筆重複回報` });
}
