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

  // 1. Send warning emails — parallel per day window
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
    const results = await Promise.allSettled(
      users
        .filter((u) => !!u.email)
        .map((user) => {
          const mail = trialExpiryMail({
            name: user.name ?? "同學",
            daysLeft: days,
            upgradeUrl: `${SITE_URL}/pricing`,
          });
          return sendMail({ to: user.email!, ...mail });
        })
    );
    warnSent += results.filter((r) => r.status === "fulfilled" && r.value).length;
  }

  // 2. Bulk downgrade trial-expired users (single UPDATE instead of N individual updates)
  const trialDowngraded = await prisma.user.updateMany({
    where: {
      plan: { not: "FREE" },
      trialEndsAt: { lt: now },
      subscriptionEndsAt: null,
    },
    data: { plan: "FREE" },
  });

  // 3. Bulk downgrade subscription-expired users
  const subDowngraded = await prisma.user.updateMany({
    where: {
      plan: { not: "FREE" },
      subscriptionEndsAt: { lt: now },
    },
    data: { plan: "FREE", subscriptionEndsAt: null },
  });

  return NextResponse.json({
    ok: true,
    warnSent,
    trialDowngraded: trialDowngraded.count,
    subDowngraded: subDowngraded.count,
    timestamp: now.toISOString(),
  });
}
