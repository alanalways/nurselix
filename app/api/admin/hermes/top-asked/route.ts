import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const rows = await prisma.$queryRaw<{ questionId: string; n: bigint }[]>`
    SELECT "questionId", COUNT(*)::bigint AS n
    FROM "ChatTurn"
    WHERE "questionId" IS NOT NULL AND role = 'user'
    GROUP BY "questionId"
    ORDER BY n DESC
    LIMIT 20
  `;
  const ids = rows.map((r) => r.questionId);
  const stems = ids.length
    ? await prisma.question.findMany({
        where: { id: { in: ids } },
        select: { id: true, stem: true, stemZh: true, errorRate: true },
      })
    : [];
  const map = new Map(stems.map((q) => [q.id, q]));
  return NextResponse.json({
    ok: true,
    topAsked: rows.map((r) => ({
      questionId: r.questionId,
      asks: Number(r.n),
      stem: map.get(r.questionId)?.stemZh || map.get(r.questionId)?.stem || "(unknown)",
      errorRate: map.get(r.questionId)?.errorRate ?? null,
    })),
  });
}
