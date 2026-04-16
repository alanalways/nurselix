import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const patchSchema = z.object({
  status: z.enum(["pending", "reviewed", "resolved"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const { status } = patchSchema.parse(body);
    const updated = await prisma.questionReport.update({
      where: { id: params.id },
      data: { status },
      select: { id: true, status: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
