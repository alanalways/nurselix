import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const schema = z.object({
  rating: z.number().int().min(-1).max(1),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const session = guard as { user?: { id?: string } };
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad rating" }, { status: 400 });
  await prisma.chatTurn.update({
    where: { id },
    data: {
      rating: parsed.data.rating,
      ratingNote: parsed.data.note ?? null,
      ratedBy: session.user?.id ?? "admin",
      ratedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
