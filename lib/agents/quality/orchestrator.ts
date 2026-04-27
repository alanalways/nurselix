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
  const reports = await prisma.questionReport.findMany({
    where: { status: "PENDING", triagedAt: null },
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

      // Update QuestionReport with triage outcome
      await prisma.questionReport.update({
        where: { id: report.id },
        data: {
          reasonCategory: verdict.reasonCategory,
          triageVerdict: verdict.verdict,
          triageNotes: verdict.reasoning,
          triagedByModel: verdict._meta.modelUsed,
          triagedAt: new Date(),
          status: verdict.shouldAutoArchive ? "IN_REVIEW" : report.status,
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
            snapshot: { status: "APPROVED → DRAFT", reason: "auto-archived by triage agent", reportId: report.id },
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
export async function proposeRepairsForCritical(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 10;
  const issues = await prisma.questionQualityIssue.findMany({
    where: { status: "OPEN", severity: "CRITICAL" },
    include: { question: true },
    take: limit,
    orderBy: { detectedAt: "asc" },
  });

  const results: any[] = [];
  for (const issue of issues) {
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
            },
            changedBy: "agent:repair",
            reason: `Auto-repair proposal for ${issue.ruleId}: ${repair.changeSummary}`,
            agentInitiated: true,
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
      });
    } catch (e: any) {
      results.push({ issueId: issue.id, ok: false, error: e.message });
    }
  }

  return { processed: issues.length, results };
}
