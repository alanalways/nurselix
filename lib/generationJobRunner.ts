import { prisma } from "@/lib/prisma";
import { runOneBatch, pickAutoDomain } from "@/lib/generateBatch";

// Module-level registry of active loops. Prevents duplicate loops for same job
// when the start endpoint is called multiple times (Zeabur runs a single
// Node process per deployment).
const activeLoops = new Set<string>();

const BATCH_DELAY_MS = 2_000;
const MAX_CONSECUTIVE_ERRORS = 5;

async function totalQuestionCount(): Promise<number> {
  return prisma.question.count();
}

export function isJobActive(jobId: string) {
  return activeLoops.has(jobId);
}

export function activeJobIds(): string[] {
  return Array.from(activeLoops);
}

export function startBackgroundLoop(jobId: string, adminId: string) {
  if (activeLoops.has(jobId)) return;
  activeLoops.add(jobId);
  // Fire-and-forget; errors are logged and persisted on the job row.
  void runLoop(jobId, adminId).finally(() => activeLoops.delete(jobId));
}

async function runLoop(jobId: string, adminId: string) {
  let consecutiveErrors = 0;

  while (true) {
    const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
    if (!job) return;
    if (job.status !== "RUNNING") return;

    const current = await totalQuestionCount();
    if (current >= job.target) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          lastMessage: `已達目標 ${job.target} 題（目前 ${current} 題）`,
        },
      });
      return;
    }

    const domain =
      job.domain === "auto" || !job.domain ? await pickAutoDomain() : job.domain;

    let result;
    try {
      result = await runOneBatch({ domain, model: job.model, adminId });
    } catch (err) {
      result = {
        ok: false,
        domain,
        model: job.model,
        total: 0,
        passed: 0,
        rejected: 0,
        duplicates: 0,
        inserted: 0,
        error: String(err),
      } as Awaited<ReturnType<typeof runOneBatch>>;
    }

    const ts = new Date().toISOString().slice(11, 19);
    if (result.ok) {
      consecutiveErrors = 0;
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          batchCount: { increment: 1 },
          inserted: { increment: result.inserted },
          rejected: { increment: result.rejected },
          duplicates: { increment: result.duplicates },
          lastMessage: `[${ts}] ${result.domain} · 入庫 ${result.inserted}/${result.total}（過濾 ${result.rejected}、重複 ${result.duplicates}）`,
        },
      });
    } else {
      consecutiveErrors++;
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          errors: { increment: 1 },
          lastMessage: `[${ts}] ✗ ${result.error ?? "未知錯誤"}`,
        },
      });
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            lastMessage: `連續 ${MAX_CONSECUTIVE_ERRORS} 次批次失敗，已停止。最後錯誤：${result.error ?? ""}`,
          },
        });
        return;
      }
    }

    // Cooperative stop check + pacing
    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }
}

/**
 * On server startup, any RUNNING job left by a prior process is stale
 * (the in-process loop died). We don't auto-resume — mark them as STOPPED
 * so the user can explicitly restart.
 */
export async function reconcileStaleJobs() {
  try {
    await prisma.generationJob.updateMany({
      where: { status: "RUNNING" },
      data: {
        status: "STOPPED",
        lastMessage: "伺服器重啟，背景任務已中斷。請重新啟動。",
      },
    });
  } catch {
    // DB may not be ready yet; ignore.
  }
}
