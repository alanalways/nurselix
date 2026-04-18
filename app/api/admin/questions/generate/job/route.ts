import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { MODEL_RPD, VALID_DOMAINS } from "@/lib/generateBatch";
import {
  startBackgroundLoop,
  isJobActive,
  reconcileStaleJobs,
} from "@/lib/generationJobRunner";

// Run stale-job reconciliation once per process. `runOnce` is a module-level
// flag to avoid doing it on every request.
let reconciled = false;
async function ensureReconciled() {
  if (reconciled) return;
  reconciled = true;
  await reconcileStaleJobs();
}

async function latestJob() {
  return prisma.generationJob.findFirst({ orderBy: { startedAt: "desc" } });
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  await ensureReconciled();
  const job = await latestJob();
  const totalInBank = await prisma.question.count();

  return NextResponse.json({
    job: job
      ? {
          ...job,
          inMemoryActive: isJobActive(job.id),
        }
      : null,
    totalInBank,
  });
}

const startSchema = z.object({
  target: z.number().int().min(1).max(100_000),
  model: z.string().refine(
    (m) => m === "auto" || m in MODEL_RPD,
    "unknown model"
  ),
  domain: z.string().refine(
    (d) => d === "auto" || VALID_DOMAINS.includes(d),
    "unknown domain"
  ),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  await ensureReconciled();

  let parsed;
  try {
    parsed = startSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Stop any prior RUNNING jobs to keep a single active job invariant.
  await prisma.generationJob.updateMany({
    where: { status: "RUNNING" },
    data: { status: "STOPPED", lastMessage: "被新任務取代" },
  });

  const adminId = (guard as { user?: { id?: string } }).user?.id ?? "admin";
  const job = await prisma.generationJob.create({
    data: {
      status: "RUNNING",
      target: parsed.target,
      model: parsed.model,
      domain: parsed.domain,
      createdBy: adminId,
      lastMessage: "任務建立，等待第一個批次…",
    },
  });

  startBackgroundLoop(job.id, adminId);
  return NextResponse.json({ job });
}

export async function DELETE() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const job = await latestJob();
  if (!job || job.status !== "RUNNING") {
    return NextResponse.json({ ok: true, job });
  }

  const updated = await prisma.generationJob.update({
    where: { id: job.id },
    data: { status: "STOPPED", lastMessage: "使用者手動停止" },
  });
  return NextResponse.json({ ok: true, job: updated });
}
