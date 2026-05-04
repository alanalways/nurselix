/**
 * POST /api/hermes/chat
 *
 * Body: { message: string; sessionId?: string; questionId?: string;
 *         attachQuestionContext?: boolean }
 *
 * Response: text/event-stream — SSE-style chunks:
 *   data: {"kind":"text","text":"..."}
 *   data: {"kind":"done","sessionId":"...","citedUrls":[...]}
 */
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/hermes-tutor/rateLimit";
import { retrieveSimilar } from "@/lib/hermes-tutor/rag";
import {
  getOrCreateSession,
  getRecentTurns,
  getTurnsForQuestion,
  recordTurn,
  findFewShotExamples,
} from "@/lib/hermes-tutor/memory";
import { composeMessages, type QuestionCtx } from "@/lib/hermes-tutor/prompt";
import { streamGeminiResponse } from "@/lib/hermes-tutor/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  let body: {
    message?: string;
    sessionId?: string;
    questionId?: string;
    attachQuestionContext?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const message = (body.message || "").trim();
  if (!message || message.length > 2000) {
    return new Response("Invalid message", { status: 400 });
  }

  const rl = await checkRateLimit(session.user.id);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "rate_limited", resetAt: rl.resetAt, remaining: 0 }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const sessionId = await getOrCreateSession(session.user.id, body.sessionId);

  // Pull contexts in parallel
  const [questionCtx, history, ragHits, fewShot] = await Promise.all([
    body.questionId && body.attachQuestionContext
      ? (prisma.question.findUnique({
          where: { id: body.questionId },
          select: {
            id: true,
            stem: true,
            stemZh: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            optionE: true,
            optionF: true,
            correctAnswer: true,
            explanationZh: true,
          },
        }) as Promise<QuestionCtx | null>)
      : Promise.resolve(null),
    body.questionId && body.attachQuestionContext
      ? getTurnsForQuestion(session.user.id, body.questionId, 5).then((rows) =>
          rows
            .reverse()
            .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }))
        )
      : getRecentTurns(sessionId, 10).then((rows) =>
          rows.map((r) => ({ role: r.role as "user" | "assistant", content: r.content }))
        ),
    retrieveSimilar(message, { k: 3, excludeQuestionId: body.questionId }).catch(() => []),
    findFewShotExamples(message, 2).catch(() => []),
  ]);

  const composed = composeMessages({
    userMessage: message,
    history,
    questionCtx,
    ragHits,
    fewShot,
  });

  // Persist the user turn first so even if streaming fails it's logged
  await recordTurn(sessionId, session.user.id, {
    role: "user",
    content: message,
    questionId: body.questionId ?? null,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      let assistantBuf = "";
      let citedUrls: { url: string; title?: string }[] = [];
      let modelUsed = "";
      let durationMs = 0;
      try {
        for await (const ev of streamGeminiResponse(composed)) {
          if (ev.kind === "text") {
            assistantBuf += ev.text;
            send({ kind: "text", text: ev.text });
          } else if (ev.kind === "done") {
            citedUrls = ev.citedUrls;
            modelUsed = ev.modelUsed;
            durationMs = ev.durationMs;
          }
        }
        await recordTurn(sessionId, session.user.id, {
          role: "assistant",
          content: assistantBuf,
          questionId: body.questionId ?? null,
          citedUrls,
          modelUsed,
          latencyMs: durationMs,
        });
        send({ kind: "done", sessionId, citedUrls });
      } catch (e: unknown) {
        send({ kind: "error", message: (e as Error).message?.slice(0, 200) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": String(rl.resetAt),
    },
  });
}
