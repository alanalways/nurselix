/**
 * GET  /api/admin/quality-issues   list open issues with filters
 * POST /api/admin/quality-issues   manually create / re-scan one question
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { scanQuestion, type QuestionShape } from "@/lib/quality/rules";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const url = new URL(req.url);
  const severity = url.searchParams.get("severity");
  const status = url.searchParams.get("status") || "OPEN";
  const ruleId = url.searchParams.get("ruleId");
  const take = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

  const where: any = { status };
  if (severity) where.severity = severity;
  if (ruleId) where.ruleId = ruleId;

  const issues = await prisma.questionQualityIssue.findMany({
    where,
    take,
    orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
    include: {
      question: {
        select: {
          id: true, stem: true, stemZh: true, status: true, correctAnswer: true,
          difficulty: true, module: true, attemptCount: true, correctCount: true,
        },
      },
    },
  });

  return NextResponse.json({ issues, count: issues.length });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const body = await req.json();
  const { questionId } = body;
  if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const issues = scanQuestion(q as unknown as QuestionShape);
  return NextResponse.json({ ok: true, issues });
}
