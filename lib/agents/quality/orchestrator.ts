/**
 * Quality Team Orchestrator — coordinates triage → verify → repair → report.
 * Each step writes to DB so progress is visible in the admin dashboard.
 */
import { prisma } from "@/lib/prisma";
import { triageReport } from "./triageAgent";
import { verifyQuestion } from "./verifierAgent";
import { repairQuestion } from "./repairAgent";
import type { QuestionShape } from "@/lib/quality/rules";

/**
 * Process all PENDING QuestionReports through triage agent.
 * Returns count of reports processed.
 */
export async function processReportTriageBatch(opts?: { limit?: number; autoArchive?: boolean }) {
  const limit = opts?.limit ?? 30;
  // Older reports may have lowercase 'pending' from a prior schema; accept both.
  const reports = await prisma.questionReport.findMany({
    where: { status: { in: ["PENDING", "pending"] }, triagedAt: null },
    include: { question: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  const results: any[] = [];
  for (const report of reports) {
    try {
      const verdict = await triageReport(
        { reason: report.reason, detail: report.detail },
        report.question as unknown as QuestionShape,
      );

      // Determine post-triage status:
      //   - NEEDS_FIX or LIKELY_VALID/LIKELY_INVALID → IN_REVIEW (move out of PENDING
      //     so admins can act on the agent verdict instead of seeing it look untouched)
      //   - UNCERTAIN → keep PENDING (agent doesn't know; human still owes a look)
      const nextStatus =
        verdict.verdict === "UNCERTAIN" ? report.status : "IN_REVIEW";

      await prisma.questionReport.update({
        where: { id: report.id },
        data: {
          reasonCategory: verdict.reasonCategory,
          triageVerdict: verdict.verdict,
          triageNotes: verdict.reasoning,
          triagedByModel: verdict._meta.modelUsed,
          triagedAt: new Date(),
          status: nextStatus,
        },
      });

      // Auto-archive question if triage says so AND not already archived
      if (opts?.autoArchive && verdict.shouldAutoArchive && report.question.status === "APPROVED") {
        await prisma.question.update({
          where: { id: report.questionId },
          data: { status: "DRAFT" },
        });

        await prisma.questionVersion.create({
          data: {
            questionId: report.questionId,
            snapshot: { status: "APPROVED → DRAFT", reason: "auto-archived by triage agent", reportId: report.id } as any,
            changedBy: "agent:triage",
            reason: `Triage verdict: ${verdict.verdict} (${verdict.severity})`,
            agentInitiated: true,
          },
        });
      }

      results.push({ reportId: report.id, ok: true, verdict: verdict.verdict, severity: verdict.severity });
    } catch (e: any) {
      results.push({ reportId: report.id, ok: false, error: e.message });
    }
  }

  return { processed: reports.length, results };
}

/**
 * For each open CRITICAL QuestionQualityIssue, run verifier+repair and produce
 * a RepairProposal stored in QuestionVersion (snapshot only, not yet applied).
 *
 * Caller decides whether to apply via /api/admin/quality-issues/[id]/apply.
 */
export async function proposeRepairsForCritical(opts?: { limit?: number; deadlineMs?: number }) {
  const limit = opts?.limit ?? 3;
  // Hard ceiling so a slow LLM batch can't overflow Zeabur's request budget.
  // Default 4 minutes — keep < HTTP timeout (Zeabur ~5min, Vercel 5min).
  const deadlineMs = opts?.deadlineMs ?? 4 * 60_000;
  const startedAt = Date.now();
  const overBudget = () => Date.now() - startedAt > deadlineMs;

  const issues = await prisma.questionQualityIssue.findMany({
    where: { status: "OPEN", severity: "CRITICAL" },
    include: { question: true },
    take: limit,
    orderBy: { detectedAt: "asc" },
  });

  const results: any[] = [];
  for (const issue of issues) {
    if (overBudget()) {
      results.push({ issueId: issue.id, ok: false, error: "deadline_reached_before_processing" });
      continue;
    }
    try {
      const q = issue.question as unknown as QuestionShape;
      const verdict = await verifyQuestion(q);

      const repair = verdict.verdict === "NEEDS_FIX"
        ? await repairQuestion(q, { verdict, ruleIds: [issue.ruleId] })
        : null;

      // Store proposal in QuestionVersion as un-applied snapshot
      if (repair && repair.confidence >= 70) {
        await prisma.questionVersion.create({
          data: {
            questionId: issue.questionId,
            snapshot: {
              proposed: repair.proposed,
              changeSummary: repair.changeSummary,
              confidence: repair.confidence,
              verdict: verdict,
              issueId: issue.id,
              applied: false,
            } as any,
            changedBy: "agent:repair",
            reason: `Auto-repair proposal for ${issue.ruleId}: ${repair.changeSummary}`,
            agentInitiated: true,
          },
        });
      }

      // CRITICAL: mark the issue resolved/ignored so the next cron run
      // doesn't pull the same row again forever. Without this, propose-repairs
      // re-processes the same 3 issues every run (we saw this in the first
      // successful batch — 6 batches × same 3 IDs).
      let issueNextStatus: "RESOLVED" | "IGNORED" | "OPEN" = "OPEN";
      let issueResolvedBy: string | null = null;
      if (verdict.verdict === "OK") {
        // Verifier disagrees with the rule scanner — issue is a false positive.
        issueNextStatus = "IGNORED";
        issueResolvedBy = "agent:verifier-rejected";
      } else if (repair && repair.confidence >= 70) {
        // Proposal landed in QuestionVersion; the issue is now "in admin's hands".
        issueNextStatus = "RESOLVED";
        issueResolvedBy = "agent:repair-proposed";
      }
      // verdict=UNCERTAIN or low-confidence repair → keep OPEN for next round
      if (issueNextStatus !== "OPEN") {
        await prisma.questionQualityIssue.update({
          where: { id: issue.id },
          data: {
            status: issueNextStatus,
            resolvedAt: new Date(),
            resolvedBy: issueResolvedBy,
          },
        });
      }

      results.push({
        issueId: issue.id,
        questionId: issue.questionId,
        ok: true,
        verdict: verdict.verdict,
        proposalGenerated: !!repair,
        confidence: repair?.confidence,
        issueStatus: issueNextStatus,
      });
    } catch (e: any) {
      results.push({ issueId: issue.id, ok: false, error: e.message });
    }
  }

  return { processed: issues.length, results };
}
