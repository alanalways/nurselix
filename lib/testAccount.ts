/**
 * 藍新金流審核測試帳號。
 *
 * 帳密改成從環境變數讀取（不再寫死在 code 裡）：
 *   TEST_ACCOUNT_EMAIL — 例如 abcd@nurslix.com
 *   TEST_ACCOUNT_PASSWORD — 任何字串
 *   TEST_ACCOUNT_NAME — 顯示名稱（可選）
 *
 * 啟用條件（兩者都必須成立）：
 *   1. 環境變數 TEST_ACCOUNT_EMAIL 與 TEST_ACCOUNT_PASSWORD 都有設
 *   2. AppSetting("testAccountEnabled") 為 "true"
 *
 * 任一條件不成立 → 認證失敗。確保未設定 env 時無法被啟用，
 * 也避免帳密外洩到 git history。
 */
import { prisma } from "@/lib/prisma";

export const TEST_ACCOUNT = {
  email: process.env.TEST_ACCOUNT_EMAIL ?? "",
  password: process.env.TEST_ACCOUNT_PASSWORD ?? "",
  name: process.env.TEST_ACCOUNT_NAME ?? "藍新審核測試帳號",
} as const;

const SETTING_KEY = "testAccountEnabled";

/** 讀取測試帳號是否啟用（預設 false）。失敗時視為關閉。
 *  另外要求 env 必須有完整設定，否則無論 AppSetting 為何都返回 false。 */
export async function isTestAccountEnabled(): Promise<boolean> {
  if (!TEST_ACCOUNT.email || !TEST_ACCOUNT.password) return false;
  try {
    const s = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
    return s?.value === "true";
  } catch {
    return false;
  }
}

/** 設定測試帳號是否啟用（admin 控制）。 */
export async function setTestAccountEnabled(enabled: boolean): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: enabled ? "true" : "false" },
    update: { value: enabled ? "true" : "false" },
  });
}

/** 驗證硬編碼帳密；通過回傳 User（自動 upsert），否則 null。 */
export async function authorizeTestAccount(
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string | null; role: string; plan: string } | null> {
  if (email.toLowerCase() !== TEST_ACCOUNT.email || password !== TEST_ACCOUNT.password) return null;
  if (!(await isTestAccountEnabled())) return null;

  // 確保 DB 有這筆 User（無密碼雜湊，只能走硬編碼驗證）
  const user = await prisma.user.upsert({
    where: { email: TEST_ACCOUNT.email },
    create: {
      email: TEST_ACCOUNT.email,
      name: TEST_ACCOUNT.name,
      role: "STUDENT",
      plan: "FREE",
      emailVerified: new Date(),
    },
    update: {
      plan: "FREE",
      role: "STUDENT",
    },
    select: { id: true, email: true, name: true, role: true, plan: true },
  });

  return user;
}
