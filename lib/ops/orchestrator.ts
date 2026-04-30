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

  // Each sub-agent runs in isolation. If one throws (e.g. NIM timeout, LLM
  // 5xx), we still capture a stub so the rest of the chain can proceed —
  // a partial report beats an error row that loses all four agents' work.
  const errors: string[] = [];

  async function runStep<T>(name: string, fn: () => Promise<T>, stub: T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${name}: ${msg.slice(0, 200)}`);
      console.error(`[ops] ${name} failed: ${msg.slice(0, 200)}`);
      return stub;
    }
  }

  // ── 1. CTO Agent ─────────────────────────────────────────────────────────
  const ctoStub = { healthScore: 0, openIssueCount: 0, criticalCount: 0, healthTrend: "—", summary: "(CTO agent failed — see error)" };
  const ctoResult = await runStep("cto", runCtoAgent, ctoStub as never);
  await prisma.opsReport.update({ where: { id: report.id }, data: { ctoReport: ctoResult as never } });

  // ── 2. PM Agent ──────────────────────────────────────────────────────────
  const pmStub = { feedbackCount: 0, reportCount: 0, sessionSummary: null, summary: "(PM agent failed — see error)" };
  const pmResult = await runStep("pm", runPmAgent, pmStub as never);
  await prisma.opsReport.update({ where: { id: report.id }, data: { pmReport: pmResult as never } });

  // ── 3. Ops Agent (COO) ────────────────────────────────────────────────────
  const cooStub = { mau: 0, dau: 0, revenue: 0, summary: "(COO agent failed — see error)" };
  const opsResult = await runStep("coo", runOpsAgent, cooStub as never);
  await prisma.opsReport.update({ where: { id: report.id }, data: { opsReport: opsResult as never } });

  // ── 4. Supervisor Agent (CEO) ─────────────────────────────────────────────
  const summaryZh = await runStep(
    "ceo",
    () => runSupervisorAgent(ctoResult as never, pmResult as never, opsResult as never),
    "(CEO synthesis failed — sub-reports above are still usable.)"
  );

  const durationMs = Date.now() - startedAt;
  const finalStatus = errors.length === 0 ? "done" : (errors.length < 4 ? "partial" : "error");

  await prisma.opsReport.update({
    where: { id: report.id },
    data: {
      summaryZh,
      status: finalStatus,
      durationMs,
      ...(errors.length ? { error: errors.join(" | ").slice(0, 1000) } : {}),
    },
  });

  return { reportId: report.id, summaryZh, durationMs };
}
