/**
 * Ops Agent Orchestrator
 *
 * Runs the four-agent pipeline sequentially:
 *   CTO Agent → PM Agent → Ops Agent → Supervisor Agent (CEO)
 *
 * Results are persisted to the OpsReport table in real-time so the
 * admin UI can show partial progress while agents are still running.
 */
import { prisma } from "@/lib/prisma";
import { OPS_MODEL } from "@/lib/ops/client";
import { runCtoAgent } from "@/lib/ops/agents/ctoAgent";
import { runPmAgent } from "@/lib/ops/agents/pmAgent";
import { runOpsAgent } from "@/lib/ops/agents/opsAgent";
import { runSupervisorAgent } from "@/lib/ops/agents/supervisorAgent";

function currentPeriod(type: "weekly" | "daily" | "manual"): string {
  const now = new Date();
  if (type === "weekly") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86_400_000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return now.toISOString().slice(0, 10);
}

export interface OrchestratorResult {
  reportId: string;
  summaryZh: string;
  durationMs: number;
}

export async function runOpsAgentTeam(opts: {
  periodType?: "weekly" | "daily" | "manual";
  triggeredBy?: string;
}): Promise<OrchestratorResult> {
  const { periodType = "manual", triggeredBy } = opts;
  const startedAt = Date.now();

  // Create the report row immediately so the UI can show "running"
  const report = await prisma.opsReport.create({
    data: {
      period: currentPeriod(periodType),
      periodType,
      status: "running",
      model: OPS_MODEL,
      triggeredBy: triggeredBy ?? "manual",
    },
  });

  try {
    // ── 1. CTO Agent ─────────────────────────────────────────────────────────
    const ctoResult = await runCtoAgent();
    await prisma.opsReport.update({
      where: { id: report.id },
      data: { ctoReport: ctoResult as never },
    });

    // ── 2. PM Agent ──────────────────────────────────────────────────────────
    const pmResult = await runPmAgent();
    await prisma.opsReport.update({
      where: { id: report.id },
      data: { pmReport: pmResult as never },
    });

    // ── 3. Ops Agent (COO) ────────────────────────────────────────────────────
    const opsResult = await runOpsAgent();
    await prisma.opsReport.update({
      where: { id: report.id },
      data: { opsReport: opsResult as never },
    });

    // ── 4. Supervisor Agent (CEO) ─────────────────────────────────────────────
    const summaryZh = await runSupervisorAgent(ctoResult, pmResult, opsResult);
    const durationMs = Date.now() - startedAt;

    await prisma.opsReport.update({
      where: { id: report.id },
      data: { summaryZh, status: "done", durationMs },
    });

    return { reportId: report.id, summaryZh, durationMs };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await prisma.opsReport.update({
      where: { id: report.id },
      data: { status: "error", error, durationMs: Date.now() - startedAt },
    });
    throw err;
  }
}
