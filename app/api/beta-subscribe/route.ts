import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ipRateLimit, getClientIp } from "@/lib/utils/rateLimit";

const schema = z.object({
  email: z.string().email("Invalid email"),
});

export async function POST(req: NextRequest) {
  // Rate limit: 3 subscriptions / hour per IP (no auth required, so IP-based).
  const ip = getClientIp(req);
  const limit = await ipRateLimit(ip, { limit: 3, windowSec: 3600 });
  if (!limit.success) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const session = await auth();
    const userId = session?.user?.id ?? null;

    await prisma.betaSubscriber.upsert({
      where: { email },
      update: { userId },
      create: { email, userId },
    });

    return NextResponse.json({ success: true, message: "訂閱成功" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid email" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
