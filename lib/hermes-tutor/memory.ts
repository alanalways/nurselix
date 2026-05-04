/**
 * ChatSession + ChatTurn read/write + few-shot retrieval.
 */
import { prisma } from "@/lib/prisma";

export interface ChatTurnRecord {
  role: "user" | "assistant";
  content: string;
  questionId?: string | null;
  citedUrls?: { url: string; title?: string }[] | null;
  modelUsed?: string | null;
  latencyMs?: number | null;
}

export async function getOrCreateSession(userId: string, sessionId?: string): Promise<string> {
  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    if (existing && existing.userId === userId) return sessionId;
  }
  const created = await prisma.chatSession.create({
    data: { userId },
    select: { id: true },
  });
  return created.id;
}

export async function getRecentTurns(sessionId: string, limit = 10) {
  return prisma.chatTurn.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { role: true, content: true, questionId: true, createdAt: true },
  });
}

export async function getTurnsForQuestion(userId: string, questionId: string, limit = 5) {
  return prisma.chatTurn.findMany({
    where: { userId, questionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { role: true, content: true, createdAt: true },
  });
}

export async function recordTurn(sessionId: string, userId: string, turn: ChatTurnRecord) {
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { lastMessageAt: new Date() },
  });
  return prisma.chatTurn.create({
    data: {
      sessionId,
      userId,
      role: turn.role,
      content: turn.content,
      questionId: turn.questionId ?? null,
      citedUrls: turn.citedUrls as never,
      modelUsed: turn.modelUsed ?? null,
      latencyMs: turn.latencyMs ?? null,
    },
    select: { id: true },
  });
}

/**
 * Few-shot v1: token overlap recall on rating=+1 user turns, then SQL join
 * to fetch the assistant turn that immediately followed each one.
 *
 * Future iteration can embed ChatTurns and use cosine similarity, but for
 * the launch this token-based recall is a deterministic baseline.
 */
export async function findFewShotExamples(userMessage: string, n = 2) {
  const tokens = userMessage
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 3)
    .slice(0, 3);
  if (tokens.length === 0) return [];

  // Single SQL: find rating=+1 user turns matching any token, plus the
  // earliest assistant turn from the same session that came after each.
  const orClauses = tokens.map((_, i) => `LOWER(u.content) LIKE '%' || $${i + 1} || '%'`).join(" OR ");
  const sql = `
    SELECT u.content       AS user_msg,
           a.content       AS assistant_msg
    FROM "ChatTurn" u
    JOIN LATERAL (
      SELECT content
      FROM "ChatTurn" a
      WHERE a."sessionId" = u."sessionId"
        AND a.role = 'assistant'
        AND a."createdAt" > u."createdAt"
      ORDER BY a."createdAt" ASC
      LIMIT 1
    ) a ON TRUE
    WHERE u.role = 'user'
      AND u.rating = 1
      AND ( ${orClauses} )
    ORDER BY u."createdAt" DESC
    LIMIT ${n};
  `;
  const rows = await prisma.$queryRawUnsafe<{ user_msg: string; assistant_msg: string }[]>(
    sql,
    ...tokens
  );
  return rows.map((r) => ({ userMsg: r.user_msg, assistantMsg: r.assistant_msg }));
}
