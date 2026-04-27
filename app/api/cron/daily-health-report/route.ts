/**
 * GET /api/cron/daily-health-report
 *
 * Daily: generates narrative health report from today's scan results,
 * via MiniMax-M2.7. Updates QualityHealthReport.narrative and emails admin.
 *
 * Triggered by .github/workflows/cron-daily-health-report.yml at 09:00 UTC.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateHealthReport } from "@/lib/agents/quality/reportAgent";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const [todayRpt, yesterdayRpt, topReported] = await Promise.all([
    prisma.qualityHealthReport.findUnique({ where: { periodType_period: { periodType: "daily", period: today } } }),
    prisma.qualityHealthReport.findUnique({ where: { periodType_period: { periodType: "daily", period: yesterdayDate } } }),
    prisma.questionReport.groupBy({
      by: ["questionId"],
      where: { createdAt: { gte: new Date(Date.now() - 86400000) }, status: "PENDING" },
      _count: { _all: true },
      orderBy: { _count: { questionId: "desc" } },
      take: 5,
    }),
  ]);

  if (!todayRpt) {
    return NextResponse.json({ ok: false, error: "No scan result for today; run quality-scan first" }, { status: 404 });
  }

  const summary = todayRpt.summary as any;
  try {
    const r = await generateHealthReport({
      period: today,
      totalQuestions: todayRpt.totalQuestions,
      approvedCount: todayRpt.approvedCount,
      draftCount: todayRpt.draftCount,
      archivedCount: todayRpt.archivedCount,
      openIssueCount: todayRpt.openIssueCount,
      healthScore: todayRpt.healthScore,
      issuesByRule: summary?.byRule || {},
      issuesBySeverity: summary?.bySeverity || {},
      trend: yesterdayRpt ? {
        issueCountDelta: todayRpt.openIssueCount - yesterdayRpt.openIssueCount,
        healthScoreDelta: todayRpt.healthScore - yesterdayRpt.healthScore,
      } : undefined,
      topReportedQuestions: topReported.map(t => ({ id: t.questionId, reportCount: t._count._all })),
    });

    await prisma.qualityHealthReport.update({
      where: { periodType_period: { periodType: "daily", period: today } },
      data: { narrative: r.narrative, modelUsed: r.modelUsed },
    });

    return NextResponse.json({ ok: true, narrative: r.narrative, modelUsed: r.modelUsed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
