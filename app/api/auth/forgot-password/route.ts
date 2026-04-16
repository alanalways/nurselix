import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendMail, passwordResetMail } from "@/lib/mail";
import { ipRateLimit, getClientIp } from "@/lib/utils/rateLimit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = await ipRateLimit(ip, { limit: 5, windowSec: 3600 });
  if (!limit.success) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate and store reset token (1-hour expiry)
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Re-use the VerificationToken table (scoped with prefix to avoid collision)
    await prisma.verificationToken.create({
      data: {
        identifier: `pwreset:${email}`,
        token,
        expires,
      },
    });

    const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${base.replace(/\/$/, "")}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const mail = passwordResetMail(resetUrl);
    await sendMail({ to: email, ...mail });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
