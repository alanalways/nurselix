/**
 * GET /api/admin/command-center
 *
 * Aggregated dashboard data for the unified admin command center.
 * Returns health score, trends, agent status, recent issues, recent reports.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const today = new Date().toISOString().slice(0, 10);
  const d7Date = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [
    todayHealth, lastWeekHealth,
    questionStats, openIssues, criticalIssues,
    pendingReports, totalReports, recentReports,
    recentVersions, agentTeamStatus,
    marketingDrafts,
  ] = await Promise.all([
    prisma.qualityHealthReport.findUnique({ where: { periodType_period: { periodType: "daily", period: today } } }),
    prisma.qualityHealthReport.findMany({
      where: { periodType: "daily", period: { gte: d7Date } },
      orderBy: { period: "desc" },
      take: 7,
    }),
    prisma.question.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.questionQualityIssue.count({ where: { status: "OPEN" } }),
    prisma.questionQualityIssue.findMany({
      where: { status: "OPEN", severity: "CRITICAL" },
      take: 10,
      orderBy: { detectedAt: "desc" },
      include: { question: { select: { id: true, stem: true, status: true } } },
    }),
    prisma.questionReport.count({ where: { status: "PENDING" } }),
    prisma.questionReport.count(),
    prisma.questionReport.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { question: { select: { id: true, stem: true } } },
    }),
    prisma.questionVersion.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { question: { select: { id: true, stem: true } } },
    }),
    prisma.hermesJob.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, sessionId: true, status: true, attempts: true, createdAt: true, error: true },
    }),
    prisma.marketingContent.findMany({
      where: { status: "draft" },
      take: 10,
      orderBy: { generatedAt: "desc" },
    }),
  ]);

  const statusMap = Object.fromEntries(questionStats.map(s => [s.status, s._count]));

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    health: {
      today: todayHealth,
      trend: lastWeekHealth,
    },
    questions: {
      total: questionStats.reduce((s, q) => s + (q._count as number), 0),
      approved: statusMap.APPROVED || 0,
      draft: statusMap.DRAFT || 0,
      archived: statusMap.ARCHIVED || 0,
    },
    issues: {
      openCount: openIssues,
      critical: criticalIssues,
    },
    reports: {
      pendingCount: pendingReports,
      totalCount: totalReports,
      recent: recentReports,
    },
    recentChanges: recentVersions,
    agentStatus: agentTeamStatus,
    marketing: {
      drafts: marketingDrafts,
    },
  });
}
