import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const body = await req.json();
    const { rating, comment, sessionId } = schema.parse(body);

    const created = await prisma.feedback.create({
      data: { userId, sessionId, rating, comment },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
