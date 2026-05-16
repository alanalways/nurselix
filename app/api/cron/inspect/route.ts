/**
 * GET /api/cron/inspect
 *
 * TEMPORARY diagnostic endpoint — returns aggregate counts for User, Question,
 * UserSession, UserAnswer, QuestionReport, Feedback, OpsReport.
 * Protected by CRON_SECRET. Intended to be removed after a one-off audit.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const monthAgo = new Date(now.getTime() - 30 * 86400_000);

  const [
    userTotal,
    userNew30d,
    sessionsTotal,
    sessions7d,
    answersTotal,
    answers7d,
    questionReports,
    questionReportsRecent,
    feedbackTotal,
    feedbackRows,
    opsReports7d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.userSession.count(),
    prisma.userSession.count({ where: { startedAt: { gte: weekAgo } } }),
    prisma.userAnswer.count(),
    prisma.userAnswer.count({ where: { answeredAt: { gte: weekAgo } } }),
    prisma.questionReport.groupBy({ by: ["status"], _count: true }),
    prisma.questionReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        questionId: true,
        reason: true,
        reasonCategory: true,
        detail: true,
        status: true,
        triageVerdict: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.feedback.count(),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { rating: true, comment: true, createdAt: true, user: { select: { email: true } } },
    }),
    prisma.opsReport.groupBy({
      by: ["status"],
      where: { createdAt: { gte: weekAgo } },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    snapshotAt: now.toISOString(),
    users: { total: userTotal, new30d: userNew30d },
    sessions: { total: sessionsTotal, last7d: sessions7d },
    answers: { total: answersTotal, last7d: answers7d },
    questionReports: { byStatus: questionReports, recent: questionReportsRecent },
    feedback: { total: feedbackTotal, recent: feedbackRows },
    opsReports7d,
  });
}
