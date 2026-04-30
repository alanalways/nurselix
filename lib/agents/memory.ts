/**
 * Agent self-learning memory layer.
 *
 * Every agent that wants to learn over time wraps its run through this
 * module. Two functions matter:
 *
 *   recallContext(agentType, opts)  →  pulls recent good/bad examples
 *                                       formatted as a few-shot block to
 *                                       prepend to the agent's system prompt.
 *
 *   recordRun(agentType, payload)   →  inserts an AgentMemory row after the
 *                                       run finishes. Admin can rate it
 *                                       later via /admin/agent-memory UI.
 *
 * Why this exists:
 *   "Self-improving agent" only means anything when (a) past runs are
 *   stored, (b) future runs can read them, and (c) humans can mark which
 *   ones were good. Without all three this is just a logging table.
 */
import { prisma } from "@/lib/prisma";

export interface RecordRunInput {
  agentType: string;             // "ops.cto" | "quality.verify" | ...
  taskKey?: string | null;       // session id / report id / "daily-2026-04-30"
  inputSummary: string;          // ≤ 500 chars summary of the input the agent saw
  outputSummary: string;         // ≤ 1000 chars summary of the output
  rawOutput?: unknown;           // optional JSON blob
  modelUsed?: string | null;
  durationMs?: number;
  ok?: boolean;
  error?: string | null;
}

/** Insert one row. Best-effort — never throws on DB failure. */
export async function recordRun(payload: RecordRunInput): Promise<string | null> {
  try {
    const row = await prisma.agentMemory.create({
      data: {
        agentType: payload.agentType,
        taskKey: payload.taskKey ?? null,
        inputSummary: payload.inputSummary.slice(0, 500),
        outputSummary: payload.outputSummary.slice(0, 1000),
        rawOutput: (payload.rawOutput as never) ?? undefined,
        modelUsed: payload.modelUsed ?? null,
        durationMs: payload.durationMs ?? 0,
        ok: payload.ok ?? true,
        error: payload.error?.slice(0, 500) ?? null,
      },
      select: { id: true },
    });
    return row.id;
  } catch (e: unknown) {
    // Never let memory bookkeeping break the actual agent run.
    console.warn("[agent-memory] recordRun failed:", (e as Error).message);
    return null;
  }
}

export interface RecallOptions {
  /** Max good examples to surface (rating=1). Default 3. */
  maxGood?: number;
  /** Max bad examples to surface (rating=-1). Default 2. */
  maxBad?: number;
  /** Max recent unrated examples (no eval yet). Default 1. */
  maxRecent?: number;
  /** Lookback window in days. Default 30. */
  windowDays?: number;
}

interface RecallExample {
  inputSummary: string;
  outputSummary: string;
  rating?: number;
  note?: string;
  createdAt: Date;
}

/**
 * Pull a small set of past runs to use as few-shot context.
 * Returns a markdown block ready to prepend to the system prompt.
 * Returns "" if no memory exists for this agent yet.
 */
export async function recallContext(agentType: string, opts: RecallOptions = {}): Promise<string> {
  const { maxGood = 3, maxBad = 2, maxRecent = 1, windowDays = 30 } = opts;
  const since = new Date(Date.now() - windowDays * 86_400_000);

  try {
    // Pull all recent rows for this agent with their evaluations
    const rows = await prisma.agentMemory.findMany({
      where: { agentType, createdAt: { gte: since }, ok: true },
      include: {
        evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // bounded scan
    });
    if (rows.length === 0) return "";

    const good: RecallExample[] = [];
    const bad: RecallExample[] = [];
    const unrated: RecallExample[] = [];
    for (const r of rows) {
      const ev = r.evaluations[0];
      const ex: RecallExample = {
        inputSummary: r.inputSummary,
        outputSummary: r.outputSummary,
        rating: ev?.rating,
        note: ev?.note ?? undefined,
        createdAt: r.createdAt,
      };
      if (ev?.rating === 1 && good.length < maxGood) good.push(ex);
      else if (ev?.rating === -1 && bad.length < maxBad) bad.push(ex);
      else if (!ev && unrated.length < maxRecent) unrated.push(ex);
      if (good.length >= maxGood && bad.length >= maxBad && unrated.length >= maxRecent) break;
    }

    if (good.length === 0 && bad.length === 0 && unrated.length === 0) return "";

    const lines: string[] = [];
    lines.push("\n=== 你過去執行此任務的紀錄（自我學習用）===");
    lines.push("以下是你過去做過的同類任務，請從中歸納、避免重複錯誤。");

    if (good.length) {
      lines.push("\n## ✓ 表現良好的範例（admin 評為好）：");
      for (const ex of good) {
        lines.push(`- 輸入摘要: ${ex.inputSummary.slice(0, 200)}`);
        lines.push(`  輸出摘要: ${ex.outputSummary.slice(0, 300)}`);
        if (ex.note) lines.push(`  admin 備註: ${ex.note.slice(0, 150)}`);
      }
    }
    if (bad.length) {
      lines.push("\n## ✗ 表現不好的範例（admin 評為差，請避免重蹈覆轍）：");
      for (const ex of bad) {
        lines.push(`- 輸入摘要: ${ex.inputSummary.slice(0, 200)}`);
        lines.push(`  輸出摘要: ${ex.outputSummary.slice(0, 300)}`);
        if (ex.note) lines.push(`  admin 指正: ${ex.note.slice(0, 150)}`);
      }
    }
    if (unrated.length) {
      lines.push("\n## · 最近一次運行（尚未評分）：");
      for (const ex of unrated) {
        lines.push(`- 輸入摘要: ${ex.inputSummary.slice(0, 150)}`);
        lines.push(`  輸出摘要: ${ex.outputSummary.slice(0, 200)}`);
      }
    }
    lines.push("=== 紀錄結束 ===\n");
    return lines.join("\n").slice(0, 3500);
  } catch (e: unknown) {
    console.warn("[agent-memory] recallContext failed:", (e as Error).message);
    return "";
  }
}

/** Stats for the admin dashboard. */
export async function memoryStats(agentType?: string) {
  const where = agentType ? { agentType } : {};
  const [total, lastRun, ratings] = await Promise.all([
    prisma.agentMemory.count({ where }),
    prisma.agentMemory.findFirst({ where, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.agentEvaluation.groupBy({
      by: ["rating"],
      _count: true,
      where: agentType ? { memory: { agentType } } : {},
    }),
  ]);
  return {
    total,
    lastRunAt: lastRun?.createdAt ?? null,
    ratings: Object.fromEntries(ratings.map((r) => [r.rating, r._count])),
  };
}
