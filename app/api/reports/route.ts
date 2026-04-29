import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userRateLimit } from "@/lib/utils/rateLimit";
import { triageReport } from "@/lib/agents/quality/triageAgent";
import type { QuestionShape } from "@/lib/quality/rules";

/**
 * Fire-and-forget triage: runs in the background without blocking the user.
 * If it fails, the daily 04:00 UTC cron will still pick the report up via
 * the regular processReportTriageBatch flow.
 */
async function triageInBackground(reportId: string) {
  try {
    const report = await prisma.questionReport.findUnique({
      where: { id: reportId },
      include: { question: true },
    });
    if (!report || report.triagedAt) return;

    const verdict = await triageReport(
      { reason: report.reason, detail: report.detail },
      report.question as unknown as QuestionShape,
    );

    const nextStatus = verdict.verdict === "UNCERTAIN" ? report.status : "IN_REVIEW";

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

    // CRITICAL severity = pull question off APPROVED immediately to protect
    // other users from seeing the broken question while admin reviews.
    if (
      verdict.shouldAutoArchive &&
      verdict.severity === "CRITICAL" &&
      report.question.status === "APPROVED"
    ) {
      await prisma.question.update({
        where: { id: report.questionId },
        data: { status: "DRAFT" },
      });
      await prisma.questionVersion.create({
        data: {
          questionId: report.questionId,
          snapshot: { status: "APPROVED → DRAFT", reason: "instant-triage CRITICAL", reportId: report.id } as any,
          changedBy: "agent:triage-instant",
          reason: `Instant triage: ${verdict.verdict} (${verdict.severity}) — ${verdict.reasoning.slice(0, 120)}`,
          agentInitiated: true,
        },
      });
    }
  } catch (e: any) {
    console.error("[reports] background triage failed", reportId, e?.message);
  }
}

const schema = z.object({
  questionId: z.string().min(1),
  reason: z.string().min(2).max(100),
  detail: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await userRateLimit(session.user.id, "report", { limit: 5, windowSec: 60 });
  if (!limit.success) return NextResponse.json({ error: "請求太頻繁" }, { status: 429 });

  try {
    const body = await req.json();
    const { questionId, reason, detail } = schema.parse(body);

    const exists = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    // Deduplicate: if this user already has a pending/reviewed report for this question, skip
    const duplicate = await prisma.questionReport.findFirst({
      where: {
        userId: session.user.id,
        questionId,
        status: { in: ["pending", "PENDING", "reviewed", "IN_REVIEW"] },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ ok: true, id: duplicate.id, duplicate: true });
    }

    const created = await prisma.questionReport.create({
      data: { userId: session.user.id, questionId, reason, detail, status: "PENDING" },
      select: { id: true },
    });

    // Fire-and-forget: triage in the background so admin sees AI verdict
    // within seconds instead of waiting for the daily cron.
    void triageInBackground(created.id);

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
