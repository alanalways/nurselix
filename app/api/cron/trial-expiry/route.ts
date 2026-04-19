import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, trialExpiryMail } from "@/lib/mail";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Send warning emails to users whose trial expires in 1 or 3 days
  const warnDays = [1, 3];
  let warnSent = 0;
  for (const days of warnDays) {
    const windowStart = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({
      where: {
        plan: { not: "FREE" },
        trialEndsAt: { gte: windowStart, lt: windowEnd },
        subscriptionEndsAt: null,
        email: { not: "" },
      },
      select: { email: true, name: true },
    });
    for (const user of users) {
      if (!user.email) continue;
      const mail = trialExpiryMail({
        name: user.name ?? "同學",
        daysLeft: days,
        upgradeUrl: `${SITE_URL}/pricing`,
      });
      await sendMail({ to: user.email, ...mail }).catch((err) => {
        console.warn("[cron/trial-expiry] mail failed:", err?.message ?? err);
      });
      warnSent++;
    }
  }

  // 2. Downgrade users whose trial has expired and have no active subscription
  const expired = await prisma.user.findMany({
    where: {
      plan: { not: "FREE" },
      trialEndsAt: { lt: now },
      subscriptionEndsAt: null,
    },
    select: { id: true },
  });

  let downgraded = 0;
  for (const user of expired) {
    await prisma.user.update({ where: { id: user.id }, data: { plan: "FREE" } });
    downgraded++;
  }

  // 3. Downgrade users whose paid subscription has expired
  const subExpired = await prisma.user.findMany({
    where: {
      plan: { not: "FREE" },
      subscriptionEndsAt: { lt: now },
    },
    select: { id: true },
  });

  let subDowngraded = 0;
  for (const user of subExpired) {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "FREE", subscriptionEndsAt: null },
    });
    subDowngraded++;
  }

  return NextResponse.json({
    ok: true,
    warnSent,
    trialDowngraded: downgraded,
    subDowngraded,
    timestamp: now.toISOString(),
  });
}
