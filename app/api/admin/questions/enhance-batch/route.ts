import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getApiKeys } from "@/lib/generateBatch";
import { geminiEnhanceBatch } from "@/lib/geminiEnhance";

const MAX_IDS = 100;

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? (body.ids as string[]).slice(0, MAX_IDS) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required (max 30)" }, { status: 400 });
  }
  const keyOffset = typeof body.keyOffset === "number" ? Math.abs(body.keyOffset) : 0;

  if (getApiKeys().length === 0) {
    return NextResponse.json(
      { error: "未設定 Gemini API Key（GEMINI_API_KEY_1 ~ GEMINI_API_KEY_10）" },
      { status: 500 }
    );
  }

  const result = await geminiEnhanceBatch(ids, keyOffset);
  if (!result.ok) {
    return NextResponse.json({ error: result.errors[0]?.reason ?? "Gemini 失敗" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    model: result.model,
    requested: ids.length,
    enhanced: result.enhanced,
    skipped: result.skipped,
    errors: result.errors.slice(0, 10),
  });
}
