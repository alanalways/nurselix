import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pauseSession } from "@/lib/nclex/sessionEngine";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await pauseSession(params.id, session.user.id);
  if (!res) return NextResponse.json({ error: "Session not found or ended" }, { status: 404 });
  return NextResponse.json({ ok: true, pausedAt: res.pausedAt });
}
