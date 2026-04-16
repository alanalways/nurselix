import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const patchSchema = z.object({
  plan: z.enum(["FREE", "BASIC", "PRO", "ELITE"]).optional(),
  role: z.enum(["STUDENT", "MODERATOR", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, plan: true, role: true, isActive: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const u = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { answers: true, sessions: true, errorQuestions: true } },
      settings: true,
    },
  });
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(u);
}
