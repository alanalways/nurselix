/**
 * POST /api/admin/quality-issues/[id]/resolve
 * body: { resolution: string, action?: "RESOLVED" | "IGNORED" | "AUTO_ARCHIVED" }
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
  const session = guard;
  const { id } = await params;
  const body = await req.json();
  const { resolution, action = "RESOLVED" } = body;

  const updated = await prisma.questionQualityIssue.update({
    where: { id },
    data: {
      status: action,
      resolvedAt: new Date(),
      resolvedBy: session?.user?.id || "admin",
      resolution,
    },
  });

  return NextResponse.json({ ok: true, issue: updated });
}
