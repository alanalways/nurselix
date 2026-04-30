/**
 * POST /api/admin/quality-issues/[id]/resolve
 * body: { resolution: string, action?: "RESOLVED" | "IGNORED" | "AUTO_ARCHIVED" }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const schema = z.object({
  resolution: z.string().min(1).max(2000),
  action: z.enum(["RESOLVED", "IGNORED", "AUTO_ARCHIVED"]).optional().default("RESOLVED"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const session = guard;
  const { id } = await params;

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { resolution, action } = parsed;

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
