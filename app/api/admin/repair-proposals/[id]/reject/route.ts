/**
 * POST /api/admin/repair-proposals/[id]/reject
 *
 * Reject a repair proposal: marks applied=true + rejected=true, leaves
 * the Question untouched. The underlying issue stays OPEN unless body.alsoCloseIssue=true.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const session = guard as any;
  const { id } = await params;

  let body: any = {};
  try { body = await req.json(); } catch {}
  const reason: string = (body?.reason || "rejected by admin").toString().slice(0, 200);
  const alsoCloseIssue: boolean = !!body?.alsoCloseIssue;

  const version = await prisma.questionVersion.findUnique({ where: { id } });
  if (!version) return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
  const snap = version.snapshot as any;
  if (snap?.applied === true) {
    return NextResponse.json({ ok: false, error: "Already processed" }, { status: 409 });
  }

  const adminId = session?.user?.id || "admin";
  await prisma.$transaction(async (tx) => {
    await tx.questionVersion.update({
      where: { id: version.id },
      data: {
        snapshot: { ...snap, applied: true, rejected: true, rejectedAt: new Date().toISOString(), rejectedBy: adminId, rejectReason: reason } as any,
      },
    });
    if (alsoCloseIssue && snap?.issueId) {
      await tx.questionQualityIssue.update({
        where: { id: snap.issueId },
        data: { status: "IGNORED", resolvedAt: new Date(), resolvedBy: adminId, resolution: `Repair proposal rejected: ${reason}` },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
