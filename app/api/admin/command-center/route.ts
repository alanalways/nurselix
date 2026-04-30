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
    nclexTotal, agentIssuesTotal, agentIssuesBySeverityRaw,
    auditedQuestionCount, manualResolvedCount,
    last24hAgentIssues, heartbeatRow, repairProposalRows,
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
    // Show ALL drafts (not capped at 10) so the dashboard counter is accurate.
    prisma.marketingContent.findMany({
      where: { status: "draft" },
      take: 100,
      orderBy: { generatedAt: "desc" },
    }),
    // === NIM Audit Progress ===
    // Total NCLEX APPROVED questions (the universe NIM is auditing)
    prisma.question.count({ where: { module: "NCLEX", status: "APPROVED" } }),
    // Total agent-written issues (NIM/codex/gemini)
    prisma.questionQualityIssue.count({ where: { ruleId: { startsWith: "agent." } } }),
    // Issue counts grouped by severity (for the agent.* rules)
    prisma.questionQualityIssue.groupBy({
      by: ["severity", "status"],
      _count: { _all: true },
      where: { ruleId: { startsWith: "agent." } },
    }),
    // Distinct questions that NIM has touched (proxy for "audited count")
    prisma.questionQualityIssue.findMany({
      where: { ruleId: { startsWith: "agent." } },
      select: { questionId: true },
      distinct: ["questionId"],
    }),
    // Questions resolved by claude-manual (the deep fixes I did)
    prisma.questionQualityIssue.count({
      where: { resolvedBy: "claude-manual", status: "RESOLVED" },
    }),
    // Last 24h findings (to show momentum)
    prisma.questionQualityIssue.count({
      where: {
        ruleId: { startsWith: "agent." },
        detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    // Audit-worker heartbeat (written after every question, OK or not).
    // The presence + freshness of this row is the source of truth for "alive".
    prisma.appSetting.findUnique({ where: { key: "audit.heartbeat" } }),
    // Un-applied repair proposals (snapshot.applied=false on agent:repair versions).
    // Used by the Repairs tab counter.
    prisma.questionVersion.findMany({
      where: { changedBy: "agent:repair" },
      select: { id: true, snapshot: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const statusMap = Object.fromEntries(questionStats.map(s => [s.status, s._count]));

  // === Aggregate audit progress ===
  const auditedCount = auditedQuestionCount.length;
  const auditPercent = nclexTotal > 0 ? (auditedCount / nclexTotal) * 100 : 0;

  // Severity breakdown (open + resolved separately)
  const severityBreakdown: Record<string, { open: number; resolved: number }> = {
    CRITICAL: { open: 0, resolved: 0 },
    HIGH: { open: 0, resolved: 0 },
    MEDIUM: { open: 0, resolved: 0 },
    LOW: { open: 0, resolved: 0 },
  };
  for (const row of agentIssuesBySeverityRaw as any[]) {
    const sev = row.severity as string;
    const status = row.status as string;
    const cnt = (row._count as any)?._all ?? 0;
    if (!severityBreakdown[sev]) severityBreakdown[sev] = { open: 0, resolved: 0 };
    if (status === "OPEN") severityBreakdown[sev].open += cnt;
    else severityBreakdown[sev].resolved += cnt;
  }

  // === Heartbeat decoding ===
  // The audit-worker writes a JSON blob to AppSetting key='audit.heartbeat' after
  // every question (OK or not). Freshness of updatedAt = aliveness signal.
  let heartbeat: any = null;
  if (heartbeatRow) {
    try {
      const data = JSON.parse(heartbeatRow.value);
      const updatedAt = heartbeatRow.updatedAt;
      const ageSeconds = Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000);
      const ageMinutes = Math.round(ageSeconds / 60);
      // Status thresholds: <5min = alive, <30min = stale, >=30min = dead.
      let status: "alive" | "stale" | "dead";
      if (ageSeconds < 300) status = "alive";
      else if (ageSeconds < 1800) status = "stale";
      else status = "dead";
      heartbeat = {
        ...data,
        updatedAt,
        ageSeconds,
        ageMinutes,
        status,
      };
    } catch {
      heartbeat = null;
    }
  }

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
    repairProposals: (() => {
      const proposals = (repairProposalRows || []).map(r => r.snapshot as any).filter(Boolean);
      const unapplied = proposals.filter(p => p?.applied === false);
      const high = unapplied.filter(p => (p?.confidence ?? 0) >= 90).length;
      const med  = unapplied.filter(p => (p?.confidence ?? 0) >= 70 && (p?.confidence ?? 0) < 90).length;
      const low  = unapplied.filter(p => (p?.confidence ?? 0) < 70).length;
      return {
        unappliedCount: unapplied.length,
        highConfidence: high,
        mediumConfidence: med,
        lowConfidence: low,
      };
    })(),
    // NEW: live audit progress block consumed by Overview tab.
    auditProgress: {
      nclexTotal,
      auditedCount,
      auditPercent: Math.round(auditPercent * 10) / 10,
      remaining: nclexTotal - auditedCount,
      agentIssuesTotal,
      severityBreakdown,
      manualResolvedCount,
      last24hFindings: last24hAgentIssues,
      heartbeat,
    },
  });
}
