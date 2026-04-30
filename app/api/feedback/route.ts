import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userRateLimit, ipRateLimit, getClientIp } from "@/lib/utils/rateLimit";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Rate limit: 5 req / minute per user; for anonymous users fall back to per-IP.
  const limit = userId
    ? await userRateLimit(userId, "feedback", { limit: 5, windowSec: 60 })
    : await ipRateLimit(getClientIp(req), { limit: 5, windowSec: 60 });
  if (!limit.success) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

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
