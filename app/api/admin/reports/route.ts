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
