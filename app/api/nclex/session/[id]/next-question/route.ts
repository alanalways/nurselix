import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNextQuestionForSession } from "@/lib/nclex/sessionEngine";
import { userRateLimit } from "@/lib/utils/rateLimit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await userRateLimit(session.user.id, "next-question", { limit: 60, windowSec: 60 });
  if (!limit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const result = await getNextQuestionForSession(params.id, session.user.id);
  return NextResponse.json(result);
}
