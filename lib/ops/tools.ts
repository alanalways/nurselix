/**
 * Read-only Prisma tools exposed to the Ops Agent team.
 * Each tool is a LangChain `tool()` wrapper around a plain async function,
 * so agents can call them via Gemini function-calling.
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ─── Ops / Analytics tools ───────────────────────────────────────────────────

export const getUserStats = tool(
  async ({ days }: { days: number }) => {
    const since = new Date(Date.now() - days * 86_400_000);
    const [totalUsers, newUsers, activeUsers, planCounts] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.user.count({ where: { updatedAt: { gte: since } } }),
      prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
    ]);
    return JSON.stringify({ totalUsers, newUsers, activeUsers, planCounts, days });
  },
  {
    name: "get_user_stats",
    description: "Get user counts: total, new signups, active users, and plan distribution for the last N days.",
    schema: z.object({ days: z.number().int().min(1).max(90).describe("Number of days to look back") }),
  }
);

export const getAnswerStats = tool(
  async ({ days }: { days: number }) => {
    const since = new Date(Date.now() - days * 86_400_000);
    const [totalAnswers, correctAnswers] = await Promise.all([
      prisma.userAnswer.count({ where: { answeredAt: { gte: since } } }),
      prisma.userAnswer.count({ where: { answeredAt: { gte: since }, isCorrect: true } }),
    ]);
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    return JSON.stringify({ totalAnswers, correctAnswers, accuracy, days });
  },
  {
    name: "get_answer_stats",
    description: "Get answer statistics: total attempts and correct rate for the last N days.",
    schema: z.object({ days: z.number().int().min(1).max(90).describe("Number of days to look back") }),
  }
);

export const getUpgradeRequests = tool(
  async () => {
    const requests = await prisma.upgradeRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, plan: true, billing: true, status: true, note: true, createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });
    const pending = requests.filter((r) => r.status === "pending").length;
    return JSON.stringify({ pending, total: requests.length, requests });
  },
  {
    name: "get_upgrade_requests",
    description: "Get recent upgrade requests with user info and status.",
    schema: z.object({}),
  }
);

// ─── PM / UX tools ────────────────────────────────────────────────────────────

export const getRecentFeedback = tool(
  async ({ days, limit }: { days: number; limit: number }) => {
    const since = new Date(Date.now() - days * 86_400_000);
    const feedback = await prisma.feedback.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, rating: true, comment: true, createdAt: true },
    });
    const avgRating =
      feedback.length > 0
        ? Math.round((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length) * 10) / 10
        : 0;
    return JSON.stringify({ count: feedback.length, avgRating, feedback });
  },
  {
    name: "get_recent_feedback",
    description: "Get recent user feedback submissions (rating + comment) for UX analysis.",
    schema: z.object({
      days: z.number().int().min(1).max(30).describe("Days to look back"),
      limit: z.number().int().min(1).max(50).describe("Max items to return"),
    }),
  }
);

export const getQuestionReports = tool(
  async ({ days, limit }: { days: number; limit: number }) => {
    const since = new Date(Date.now() - days * 86_400_000);
    const reports = await prisma.questionReport.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, reason: true, detail: true, status: true, createdAt: true,
        question: { select: { stem: true, domain: true } },
      },
    });
    return JSON.stringify({ count: reports.length, reports });
  },
  {
    name: "get_question_reports",
    description: "Get recent question reports (content issues flagged by users).",
    schema: z.object({
      days: z.number().int().min(1).max(30).describe("Days to look back"),
      limit: z.number().int().min(1).max(50).describe("Max items to return"),
    }),
  }
);

export const getSessionStats = tool(
  async ({ days }: { days: number }) => {
    const since = new Date(Date.now() - days * 86_400_000);
    const sessions = await prisma.userSession.findMany({
      where: { startedAt: { gte: since } },
      select: { mode: true, totalQuestions: true, correctCount: true, endedAt: true, totalTimeSec: true },
    });
    const byMode = sessions.reduce<Record<string, { count: number; completed: number; avgQ: number }>>((acc, s) => {
      const key = String(s.mode);
      if (!acc[key]) acc[key] = { count: 0, completed: 0, avgQ: 0 };
      acc[key].count++;
      if (s.endedAt) acc[key].completed++;
      acc[key].avgQ += s.totalQuestions;
      return acc;
    }, {});
    Object.values(byMode).forEach((v) => {
      v.avgQ = v.count > 0 ? Math.round(v.avgQ / v.count) : 0;
    });
    return JSON.stringify({ totalSessions: sessions.length, byMode, days });
  },
  {
    name: "get_session_stats",
    description: "Get exam session statistics broken down by mode for the last N days.",
    schema: z.object({ days: z.number().int().min(1).max(90).describe("Days to look back") }),
  }
);

// ─── CTO / Code tools ─────────────────────────────────────────────────────────

export const runTypeCheck = tool(
  async () => {
    const { execSync } = await import("child_process");
    try {
      execSync("npx tsc --noEmit --project /home/user/nurselix/tsconfig.json 2>&1", {
        encoding: "utf-8",
        timeout: 90_000,
      });
      return JSON.stringify({ ok: true, errors: [] });
    } catch (err: unknown) {
      const output = (err as { stdout?: string }).stdout ?? String(err);
      const lines = output.split("\n").filter(Boolean).slice(0, 40);
      return JSON.stringify({ ok: false, errors: lines });
    }
  },
  {
    name: "run_type_check",
    description: "Run TypeScript type check on the Nurselix codebase and return any errors found.",
    schema: z.object({}),
  }
);

export const runLintCheck = tool(
  async () => {
    const { execSync } = await import("child_process");
    try {
      execSync("cd /home/user/nurselix && npx next lint --format json 2>&1", {
        encoding: "utf-8",
        timeout: 90_000,
      });
      return JSON.stringify({ ok: true, issues: [] });
    } catch (err: unknown) {
      const output = (err as { stdout?: string }).stdout ?? String(err);
      // Use [\s\S] instead of the `s` regex flag (which needs ES2018 target)
      const jsonMatch = output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const issues = JSON.parse(jsonMatch[0]) as Array<{
            filePath: string;
            messages: Array<{ ruleId: string | null; message: string; line: number }>;
          }>;
          const flat = issues
            .flatMap((f) =>
              f.messages.map((m) => ({
                file: f.filePath.replace("/home/user/nurselix/", ""),
                rule: m.ruleId ?? "unknown",
                msg: m.message,
                line: m.line,
              }))
            )
            .slice(0, 30);
          return JSON.stringify({ ok: false, issues: flat });
        } catch {
          /* fall through */
        }
      }
      return JSON.stringify({ ok: false, issues: output.split("\n").slice(0, 30) });
    }
  },
  {
    name: "run_lint_check",
    description: "Run ESLint on the Nurselix codebase and return any lint issues found.",
    schema: z.object({}),
  }
);

export const getErrorQueueStats = tool(
  async ({ limit }: { limit: number }) => {
    const highError = await prisma.question.findMany({
      where: { attemptCount: { gte: 10 } },
      orderBy: [{ correctCount: "asc" }],
      take: limit,
      select: { id: true, stem: true, domain: true, difficulty: true, attemptCount: true, correctCount: true },
    });
    const withRate = highError.map((q) => ({
      ...q,
      stem: q.stem.slice(0, 80),
      errorRate: q.attemptCount > 0 ? Math.round(((q.attemptCount - q.correctCount) / q.attemptCount) * 100) : 0,
    }));
    return JSON.stringify({ count: withRate.length, questions: withRate });
  },
  {
    name: "get_error_queue_stats",
    description: "Get questions with high error rates (most students get wrong) to flag for content review.",
    schema: z.object({ limit: z.number().int().min(1).max(20).describe("Max items to return") }),
  }
);

export const ALL_TOOLS = [
  getUserStats,
  getAnswerStats,
  getUpgradeRequests,
  getRecentFeedback,
  getQuestionReports,
  getSessionStats,
  runTypeCheck,
  runLintCheck,
  getErrorQueueStats,
];
