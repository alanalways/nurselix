import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runOpsAgentTeam } from "@/lib/ops/orchestrator";
import { OPS_PROVIDER, OPS_MODEL } from "@/lib/ops/client";
import { prisma } from "@/lib/prisma";

// GET — list recent reports
export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const reports = await prisma.opsReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, period: true, periodType: true, status: true,
      model: true, durationMs: true, error: true, triggeredBy: true,
      createdAt: true, summaryZh: true,
    },
  });

  return NextResponse.json({
    reports,
    provider: { name: OPS_PROVIDER, model: OPS_MODEL },
  });
}

// POST — trigger a new agent run (async, responds immediately with reportId)
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const periodType = (body.periodType as "weekly" | "daily" | "manual") ?? "manual";
  const adminId = (guard as { user?: { id?: string } }).user?.id;

  // Fire-and-forget: don't await — the endpoint returns immediately
  // The report row is created with status="running" and updated as agents complete
  runOpsAgentTeam({ periodType, triggeredBy: adminId }).catch((err) => {
    console.error("[ops/run] agent team failed:", err?.message);
  });

  return NextResponse.json({ ok: true, message: "Agent team started. Check /admin/ops-reports for progress." });
}
