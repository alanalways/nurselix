/**
 * Background repair job for short-explanation questions.
 *
 * POST { preferModel? } → start job (fire-and-forget), returns { jobId }
 * GET                   → return current job status for polling
 * DELETE                → clear finished/failed job
 *
 * Auto-retries up to MAX_PASSES rounds. Each round re-scans the DB,
 * so questions fixed in the previous pass are excluded automatically.
 * Stops early if a full pass produces zero new enhancements (no progress).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { geminiEnhanceBatch, ENHANCE_MODEL_PRIORITY } from "@/lib/geminiEnhance";

export interface RepairJob {
  id: string;
  status: "running" | "done" | "failed";
  total: number;       // questions in current/last pass
  done: number;        // processed in current pass
  enhanced: number;    // cumulative across all passes
  skipped: number;     // remaining after last completed pass
  passes: number;      // number of completed passes
  preferModel: string;
  startedAt: string;
  finishedAt?: string;
  message: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __repairAllJob: RepairJob | undefined;
}

// Smaller batch = more focused prompt = longer, higher-quality explanations.
// Root cause of most skips: 100-item batches caused Gemini to truncate output.
const BATCH_SIZE = 20;
const CONCURRENCY = 3;
const MAX_PASSES = 10;

async function runRepair(jobId: string, preferModel: string) {
  const job = global.__repairAllJob!;

  try {
    for (let pass = 1; pass <= MAX_PASSES; pass++) {
      if (global.__repairAllJob?.id !== jobId) return;

      // Re-scan DB — questions fixed in prior passes are excluded automatically
      const allApproved = await prisma.question.findMany({
        where: { status: "APPROVED" },
        select: { id: true, explanationZh: true },
      });
      const ids = allApproved
        .filter((q) => !q.explanationZh || q.explanationZh === "暫無解析" || q.explanationZh.length < 100)
        .map((q) => q.id);

      if (ids.length === 0) {
        job.status = "done";
        job.finishedAt = new Date().toISOString();
        job.passes = pass - 1;
        job.total = 0;
        job.skipped = 0;
        job.message = `✅ 全部修補完成！共成功修補 ${job.enhanced} 題（共 ${job.passes} 輪次）`;
        return;
      }

      // First pass: record initial total
      if (pass === 1) {
        job.total = ids.length;
        job.message = `找到 ${ids.length} 道待修補題目，開始第 1 輪修補…`;
      } else {
        job.total = ids.length;
        job.done = 0;
        job.message = `第 ${pass} 輪重試，仍有 ${ids.length} 道未修補，繼續…`;
      }

      const enhancedBeforePass = job.enhanced;

      for (let i = 0; i < ids.length; i += BATCH_SIZE * CONCURRENCY) {
        if (global.__repairAllJob?.id !== jobId) return;

        const subBatches = Array.from({ length: CONCURRENCY }, (_, j) => ({
          ids: ids.slice(i + j * BATCH_SIZE, i + (j + 1) * BATCH_SIZE),
          keyOffset: j * 2,
        })).filter((b) => b.ids.length > 0);

        job.message = `第 ${pass} 輪修補中… ${Math.min(i + BATCH_SIZE * CONCURRENCY, ids.length)}/${ids.length}（同時處理 ${subBatches.length} 批）`;

        const results = await Promise.allSettled(
          subBatches.map(({ ids: bIds, keyOffset }) =>
            geminiEnhanceBatch(bIds, keyOffset, preferModel)
          )
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            job.enhanced += r.value.enhanced;
            job.done += r.value.enhanced + r.value.skipped;
          } else {
            job.done += BATCH_SIZE;
          }
        }

        if (i + BATCH_SIZE * CONCURRENCY < ids.length) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      job.passes = pass;
      const passEnhanced = job.enhanced - enhancedBeforePass;

      // No progress in this pass → stop retrying to avoid infinite loop
      if (passEnhanced === 0) {
        job.status = "done";
        job.finishedAt = new Date().toISOString();
        job.skipped = ids.length;
        job.message = `⚠️ 已完成 ${pass} 輪次，仍有 ${ids.length} 道題目無法修補（API 限額或題目特殊情況）。共修補 ${job.enhanced} 題。`;
        return;
      }

      job.skipped = ids.length - passEnhanced;
    }

    // Reached MAX_PASSES
    job.status = "done";
    job.finishedAt = new Date().toISOString();
    job.message = `已完成 ${MAX_PASSES} 輪次，共修補 ${job.enhanced} 題，剩餘 ${job.skipped} 道建議手動處理。`;
  } catch (err) {
    const job2 = global.__repairAllJob;
    if (job2 && job2.id === jobId) {
      job2.status = "failed";
      job2.finishedAt = new Date().toISOString();
      job2.message = `失敗：${String(err).slice(0, 200)}`;
    }
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (global.__repairAllJob?.status === "running") {
    return NextResponse.json({
      error: "已有修補任務在執行中",
      job: global.__repairAllJob,
    }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const preferModel: string =
    typeof body.preferModel === "string" && ENHANCE_MODEL_PRIORITY.includes(body.preferModel)
      ? body.preferModel
      : ENHANCE_MODEL_PRIORITY[0];

  const jobId = Date.now().toString();
  global.__repairAllJob = {
    id: jobId,
    status: "running",
    total: 0,
    done: 0,
    enhanced: 0,
    skipped: 0,
    passes: 0,
    preferModel,
    startedAt: new Date().toISOString(),
    message: "初始化中…",
  };

  void runRepair(jobId, preferModel).catch((e) => {
    const cur = global.__repairAllJob;
    if (cur && cur.id === jobId) {
      cur.status = "failed";
      cur.finishedAt = new Date().toISOString();
      cur.message = `未預期錯誤：${String(e).slice(0, 200)}`;
    }
  });

  return NextResponse.json({ ok: true, jobId, job: global.__repairAllJob });
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (!global.__repairAllJob) {
    return NextResponse.json({ job: null });
  }
  return NextResponse.json({ job: global.__repairAllJob });
}

export async function DELETE() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  global.__repairAllJob = undefined;
  return NextResponse.json({ ok: true });
}
