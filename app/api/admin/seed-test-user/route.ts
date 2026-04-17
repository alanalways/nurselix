/**
 * 藍新審核測試帳號的後台控制。
 * GET  → 查詢目前是否啟用
 * POST → { enabled: boolean } 切換啟用狀態
 * 帳密為硬編碼（lib/testAccount.ts），僅在此開關開啟時可登入。
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { TEST_ACCOUNT, isTestAccountEnabled, setTestAccountEnabled } from "@/lib/testAccount";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = await isTestAccountEnabled();
  return NextResponse.json({
    enabled,
    email: TEST_ACCOUNT.email,
    password: TEST_ACCOUNT.password,
    plan: "FREE",
  });
}

const schema = z.object({ enabled: z.boolean() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  await setTestAccountEnabled(parsed.data.enabled);

  return NextResponse.json({
    ok: true,
    enabled: parsed.data.enabled,
    email: TEST_ACCOUNT.email,
    password: TEST_ACCOUNT.password,
    message: parsed.data.enabled
      ? "✓ 測試帳號已啟用，藍新審核可登入"
      : "✓ 測試帳號已停用，無人可登入此帳號",
  });
}
