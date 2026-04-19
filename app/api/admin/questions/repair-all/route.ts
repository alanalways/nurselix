/**
 * Background repair job for short-explanation questions.
 *
 * POST → start job (fire-and-forget), returns { jobId } immediately
 * GET  → return current job status for polling
 *
 * Uses a Node.js global to persist state across requests in a single Docker
 * process. Works because Zeabur runs a long-lived container (not serverless).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { geminiEnhanceBatch } from "@/lib/geminiEnhance";

export interface RepairJob {
  id: string;
  status: "running" | "done" | "failed";
  total: number;
  done: number;       // questions processed so far
  enhanced: number;
  skipped: number;
  startedAt: string;
  finishedAt?: string;
  message: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __repairAllJob: RepairJob | undefined;
}

const BATCH_SIZE = 100;
const CONCURRENCY = 3; // 3×100 = 300 questions per round; large batches take longer so RPM pressure is low

async function runRepair(jobId: string) {
  const job = global.__repairAllJob!;

  try {
    // Collect all short-explanation IDs by scanning approved questions
    const allApproved = await prisma.question.findMany({
      where: { status: "APPROVED" },
      select: { id: true, explanationZh: true },
    });
    const ids = allApproved
      .filter((q) => !q.explanationZh || q.explanationZh === "暫無解析" || q.explanationZh.length < 100)
      .map((q) => q.id);

    job.total = ids.length;
    job.message = `找到 ${ids.length} 道待修補題目，開始批次處理…`;

    if (ids.length === 0) {
      job.status = "done";
      job.finishedAt = new Date().toISOString();
      job.message = "沒有需要修補的題目";
      return;
    }

    for (let i = 0; i < ids.length; i += BATCH_SIZE * CONCURRENCY) {
      // Abort if a newer job was started
      if (global.__repairAllJob?.id !== jobId) return;

      const subBatches = Array.from({ length: CONCURRENCY }, (_, j) => ({
        ids: ids.slice(i + j * BATCH_SIZE, i + (j + 1) * BATCH_SIZE),
        keyOffset: j * 2,
      })).filter((b) => b.ids.length > 0);

      job.message = `修補中… ${i}/${ids.length}（同時處理 ${subBatches.length} 批）`;

      const results = await Promise.allSettled(
        subBatches.map(({ ids: bIds, keyOffset }) => geminiEnhanceBatch(bIds, keyOffset))
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          job.enhanced += r.value.enhanced;
          job.skipped += r.value.skipped;
          job.done += r.value.enhanced + r.value.skipped;
        } else {
          job.skipped += BATCH_SIZE;
          job.done += BATCH_SIZE;
        }
      }

      // Small cooldown between rounds for free-tier RPM
      if (i + BATCH_SIZE * CONCURRENCY < ids.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    job.status = "done";
    job.finishedAt = new Date().toISOString();
    job.message = `完成：成功修補 ${job.enhanced} 題，跳過 ${job.skipped} 題`;
  } catch (err) {
    job.status = "failed";
    job.finishedAt = new Date().toISOString();
    job.message = `失敗：${String(err).slice(0, 200)}`;
  }
}

export async function POST() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  if (global.__repairAllJob?.status === "running") {
    return NextResponse.json({
      error: "已有修補任務在執行中",
      job: global.__repairAllJob,
    }, { status: 409 });
  }

  const jobId = Date.now().toString();
  global.__repairAllJob = {
    id: jobId,
    status: "running",
    total: 0,
    done: 0,
    enhanced: 0,
    skipped: 0,
    startedAt: new Date().toISOString(),
    message: "初始化中…",
  };

  // Fire and forget — runs in the Node.js event loop while response returns
  void runRepair(jobId);

  return NextResponse.json({ ok: true, jobId });
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
