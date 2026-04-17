import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enqueueHermesJob } from "@/lib/hermes/orchestrator";

const schema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const authSession = await auth();
  if (!authSession?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { sessionId } = parsed.data;
  const userId = authSession.user.id;

  // Enqueue fire-and-forget
  await enqueueHermesJob(sessionId, userId);

  return NextResponse.json({ ok: true, sessionId, status: "queued" }, { status: 202 });
}
