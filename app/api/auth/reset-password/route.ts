import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ipRateLimit, getClientIp } from "@/lib/utils/rateLimit";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(32),
  newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = await ipRateLimit(ip, { limit: 10, windowSec: 3600 });
  if (!limit.success) {
    return NextResponse.json({ error: "請求太頻繁" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, token, newPassword } = schema.parse(body);

    const vt = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!vt || vt.identifier !== `pwreset:${email}` || vt.expires < new Date()) {
      return NextResponse.json({ error: "重設連結無效或已過期" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: hashed },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: `pwreset:${email}` },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
