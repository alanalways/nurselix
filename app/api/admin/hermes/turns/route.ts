import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50", 10));
  const ratingFilter = url.searchParams.get("rating");
  const where = ratingFilter ? { rating: parseInt(ratingFilter, 10) } : {};
  const turns = await prisma.chatTurn.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      role: true,
      content: true,
      questionId: true,
      citedUrls: true,
      modelUsed: true,
      latencyMs: true,
      rating: true,
      ratingNote: true,
      createdAt: true,
      session: { select: { userId: true } },
    },
  });
  return NextResponse.json({ ok: true, turns });
}
