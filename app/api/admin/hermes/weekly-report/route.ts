/**
 * Admin Hermes endpoint — 給外部 cron（HERMES_SETUP.md）呼叫的 weekly-report 觸發器。
 * Auth: Bearer HERMES_ADMIN_API_KEY 或 CRON_SECRET。
 * 直接代為觸發 /api/cron/weekly-report。
 */
import { NextRequest, NextResponse } from "next/server";

function verifyAdminSecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const hermesKey = process.env.HERMES_ADMIN_API_KEY;
  const cronKey = process.env.CRON_SECRET;
  if (hermesKey && auth === `Bearer ${hermesKey}`) return true;
  if (cronKey && auth === `Bearer ${cronKey}`) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSecret(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (!site || !cronSecret) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL 或 CRON_SECRET 未設定" }, { status: 500 });
  }

  const res = await fetch(`${site}/api/cron/weekly-report`, {
    headers: { authorization: `Bearer ${cronSecret}` },
  });
  const body = await res.text();

  return NextResponse.json({
    ok: res.ok,
    upstream: res.status,
    result: safeJson(body),
  }, { status: res.ok ? 200 : 502 });
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text.slice(0, 500); }
}
