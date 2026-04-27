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

  const users = await prisma.user.findMany({
    where: { plan: { in: ["PRO", "ELITE"] }, email: { not: "" } },
    select: { id: true, email: true, name: true },
  });

  // Fetch all users' stats in one query, then group in memory
  const allStats = await prisma.userDailyStats.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      statDate: { gte: sevenDaysAgo },
    },
  });
  const statsByUser = new Map<string, typeof allStats>();
  for (const s of allStats) {
    const arr = statsByUser.get(s.userId) ?? [];
    arr.push(s);
    statsByUser.set(s.userId, arr);
  }

  // Build and send emails in parallel
  const results = await Promise.allSettled(
    users
      .filter((u) => !!u.email)
      .map(async (user) => {
        const stats = statsByUser.get(user.id) ?? [];
        const totalDone = stats.reduce((s, r) => s + r.questionsDone, 0);
        if (totalDone === 0) return "skipped";

        const totalCorrect = stats.reduce((s, r) => s + r.correctCount, 0);
        const accuracy = Math.round((totalCorrect / totalDone) * 100);
        const streak = stats.filter((r) => r.questionsDone > 0).length;

        const ds = domainStats(stats);
        const domainEntries = Object.entries(ds)
          .filter(([, v]) => v.done >= 3)
          .map(([domain, v]) => ({ domain, accuracy: Math.round((v.correct / v.done) * 100) }))
          .sort((a, b) => b.accuracy - a.accuracy);

        const mail = weeklyReportMail({
          name: user.name ?? "同學",
          questionsDone: totalDone,
          accuracy,
          streak,
          topDomain: domainEntries[0]?.domain ?? "—",
          weakDomain: domainEntries[domainEntries.length - 1]?.domain ?? "—",
        });

        const ok = await sendMail({ to: user.email!, ...mail });
        return ok ? "sent" : "failed";
      })
  );

  const sent    = results.filter((r) => r.status === "fulfilled" && r.value === "sent").length;
  const skipped = results.filter((r) => r.status === "fulfilled" && r.value === "skipped").length;
  const failed  = results.filter((r) => r.status === "rejected" || r.value === "failed").length;

  return NextResponse.json({ ok: true, sent, skipped, failed });
}
