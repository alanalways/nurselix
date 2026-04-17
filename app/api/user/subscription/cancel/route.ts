import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail, subscriptionCancelledMail } from "@/lib/mail";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, plan: true, subscriptionEndsAt: true, trialEndsAt: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.plan === "FREE") {
    return NextResponse.json({ error: "你目前沒有付費訂閱" }, { status: 400 });
  }

  const endsAt = user.subscriptionEndsAt ?? user.trialEndsAt;
  if (!endsAt) {
    return NextResponse.json({ error: "找不到訂閱到期日" }, { status: 400 });
  }

  // For one-time payment (NewebPay MPG), cancellation = acknowledge expiry, no further billing.
  // We set subscriptionEndsAt to its current value (no change needed) and mark via a no-op.
  // The trial-expiry cron will handle downgrade when the date passes.
  // Optionally send cancellation email.

  const endsAtStr = endsAt.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });

  if (user.email) {
    await sendMail({
      to: user.email,
      ...subscriptionCancelledMail({
        name: user.name ?? "同學",
        plan: user.plan,
        endsAt: endsAtStr,
      }),
    });
  }

  return NextResponse.json({
    ok: true,
    plan: user.plan,
    endsAt: endsAt.toISOString(),
    message: `訂閱已取消，你可繼續使用 ${user.plan} 方案功能至 ${endsAtStr}。`,
  });
}
