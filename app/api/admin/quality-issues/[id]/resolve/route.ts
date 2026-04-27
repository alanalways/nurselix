/**
 * POST /api/admin/quality-issues/[id]/resolve
 * body: { resolution: string, action?: "RESOLVED" | "IGNORED" | "AUTO_ARCHIVED" }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await auth();
  const { id } = await ctx.params;
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
