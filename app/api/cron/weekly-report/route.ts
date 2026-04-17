import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, weeklyReportMail } from "@/lib/mail";

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function domainStats(dailyStats: { domainStats: unknown }[]) {
  const merged: Record<string, { done: number; correct: number }> = {};
  for (const day of dailyStats) {
    const ds = (day.domainStats ?? {}) as Record<string, { done: number; correct: number }>;
    for (const [domain, val] of Object.entries(ds)) {
      merged[domain] = {
        done: (merged[domain]?.done ?? 0) + (val.done ?? 0),
        correct: (merged[domain]?.correct ?? 0) + (val.correct ?? 0),
      };
    }
  }
  return merged;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Send to all users with PRO/ELITE plan (active learners)
  const users = await prisma.user.findMany({
    where: { plan: { in: ["PRO", "ELITE"] }, email: { not: "" } },
    select: { id: true, email: true, name: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.email) { skipped++; continue; }

    const stats = await prisma.userDailyStats.findMany({
      where: { userId: user.id, statDate: { gte: sevenDaysAgo } },
      orderBy: { statDate: "desc" },
    });

    const totalDone = stats.reduce((s, r) => s + r.questionsDone, 0);
    if (totalDone === 0) { skipped++; continue; }

    const totalCorrect = stats.reduce((s, r) => s + r.correctCount, 0);
    const accuracy = Math.round((totalCorrect / totalDone) * 100);
    const streak = stats.filter(r => r.questionsDone > 0).length;

    const ds = domainStats(stats);
    const domainEntries = Object.entries(ds)
      .filter(([, v]) => v.done >= 3)
      .map(([domain, v]) => ({ domain, accuracy: Math.round((v.correct / v.done) * 100) }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const topDomain = domainEntries[0]?.domain ?? "—";
    const weakDomain = domainEntries[domainEntries.length - 1]?.domain ?? "—";

    const mail = weeklyReportMail({
      name: user.name ?? "同學",
      questionsDone: totalDone,
      accuracy,
      streak,
      topDomain,
      weakDomain,
    });

    const ok = await sendMail({ to: user.email, ...mail });
    if (ok) sent++; else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
