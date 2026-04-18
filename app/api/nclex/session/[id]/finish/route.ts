import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { finishSession } from "@/lib/nclex/sessionEngine";
import { enqueueHermesJob } from "@/lib/hermes/orchestrator";

const schema = z.object({ reason: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let reason = "user_end";
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.parse(body);
    if (parsed.reason) reason = parsed.reason;
  } catch {
    // ignore body validation errors
  }

  const res = await finishSession(params.id, session.user.id, reason);
  if (!res) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Fire-and-forget Hermes analysis (non-blocking).
  // Disable during beta by setting HERMES_ENABLED=false in env.
  if (process.env.HERMES_ENABLED !== "false") {
    enqueueHermesJob(params.id, session.user.id).catch((err) => {
      console.warn("[finish] Hermes enqueue failed:", err?.message);
    });
  }

  return NextResponse.json({
    ok: true,
    sessionId: res.id,
    passFail: res.passFail,
    score: res.score,
    stopReason: res.stopReason,
  });
}
