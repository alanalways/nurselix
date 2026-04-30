/**
 * Background content-audit job — uses Gemini to verify clinical accuracy of questions.
 *
 * POST { scope?: "reported"|"all"|"approved", model?: string } → start job, returns { jobId }
 * GET                                                           → poll job status + results
 * DELETE                                                        → clear finished job
 *
 * Job state is persisted to AppSetting (key: 'admin.contentAudit.job') so it
 * survives serverless cold-starts on Zeabur. Without this, the process
 * `global` resets and the UI sees a stale "running" job forever.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { auditBatch, AUDIT_BATCH, type AuditResult } from "@/lib/geminiAudit";

export interface AuditJob {
  id: string;
  status: "running" | "done" | "failed";
  scope: string;
  total: number;
  done: number;
  errors: number;
  results: AuditResult[];
  startedAt: string;
  finishedAt?: string;
  message: string;
}

const JOB_KEY = "admin.contentAudit.job";

async function readJob(): Promise<AuditJob | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: JOB_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as AuditJob;
  } catch {
    return null;
  }
}

async function writeJob(job: AuditJob): Promise<void> {
  const value = JSON.stringify(job);
  await prisma.appSetting.upsert({
    where: { key: JOB_KEY },
    create: { key: JOB_KEY, value },
    update: { value },
  });
}

async function clearJob(): Promise<void> {
  await prisma.appSetting.delete({ where: { key: JOB_KEY } }).catch(() => {});
}

async function runAudit(jobId: string, scope: string) {
  let job = await readJob();
  if (!job || job.id !== jobId) return;

  try {
    let where: Record<string, unknown> = { status: "APPROVED" };

    if (scope === "reported") {
      // Only questions that have pending/reviewed reports
      const reported = await prisma.questionReport.findMany({
        where: { status: { in: ["pending", "reviewed"] } },
        select: { questionId: true },
        distinct: ["questionId"],
      });
      const ids = reported.map((r) => r.questionId);
      if (ids.length === 0) {
        job.status = "done";
        job.message = "目前沒有待審回報的題目";
        job.finishedAt = new Date().toISOString();
        await writeJob(job);
        return;
      }
      where = { id: { in: ids } };
    } else if (scope === "all") {
      where = {};  // all statuses
    }
    // default "approved": where stays as { status: "APPROVED" }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, stem: true, domain: true, difficulty: true,
        optionA: true, optionB: true, optionC: true, optionD: true,
        optionE: true, optionF: true,
        correctAnswer: true, explanationZh: true,
      },
    });

    job.total = questions.length;
    await writeJob(job);

    // Process in batches
    for (let i = 0; i < questions.length; i += AUDIT_BATCH) {
      const chk = await readJob();
      if (!chk || chk.id !== jobId) return; // cancelled
      job = chk;

      const batch = questions.slice(i, i + AUDIT_BATCH);
      try {
        const batchResults = await auditBatch(batch);
        job.results.push(...batchResults);
      } catch (err) {
        job.errors += batch.length;
        console.error(`[content-audit] batch ${i}-${i + AUDIT_BATCH} failed:`, err);
      }
      job.done = Math.min(i + AUDIT_BATCH, questions.length);
      job.message = `已審核 ${job.done} / ${job.total} 題…`;
      await writeJob(job);
    }

    job.status = "done";
    job.done = job.total;
    const errorCount = job.results.filter((r) => r.verdict === "ERROR").length;
    const reviewCount = job.results.filter((r) => r.verdict === "NEEDS_REVIEW").length;
    job.message = `審核完成：${job.total} 題 | ❌ 錯誤 ${errorCount} 題 | ⚠️ 待複審 ${reviewCount} 題`;
    job.finishedAt = new Date().toISOString();
    await writeJob(job);
  } catch (err) {
    const cur = await readJob();
    if (cur && cur.id === jobId) {
      cur.status = "failed";
      cur.message = err instanceof Error ? err.message : "未知錯誤";
      cur.finishedAt = new Date().toISOString();
      await writeJob(cur);
    }
  }
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const job = await readJob();
  if (!job) return NextResponse.json({ job: null });
  return NextResponse.json({ job });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const existing = await readJob();
  if (existing?.status === "running") {
    return NextResponse.json({ error: "審核正在執行中，請稍候" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const scope = (body.scope as string) ?? "reported";

  const jobId = `audit-${Date.now()}`;
  const job: AuditJob = {
    id: jobId,
    status: "running",
    scope,
    total: 0,
    done: 0,
    errors: 0,
    results: [],
    startedAt: new Date().toISOString(),
    message: "初始化中…",
  };
  await writeJob(job);

  // Fire and forget
  runAudit(jobId, scope).catch(async (err) => {
    console.error("[content-audit] job failed:", err);
    const cur = await readJob();
    if (cur && cur.id === jobId) {
      cur.status = "failed";
      cur.message = String(err?.message ?? err);
      await writeJob(cur);
    }
  });

  return NextResponse.json({ jobId });
}

export async function DELETE() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const existing = await readJob();
  if (existing?.status === "running") {
    return NextResponse.json({ error: "無法刪除執行中的工作" }, { status: 409 });
  }
  await clearJob();
  return NextResponse.json({ ok: true });
}
