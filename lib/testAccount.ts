/**
 * 硬編碼的藍新金流審核測試帳號。
 * 透過 AppSetting("testAccountEnabled") 控制是否可登入，預設關閉。
 * 登入成功時會自動在 DB upsert 對應的 User 記錄。
 */
import { prisma } from "@/lib/prisma";

export const TEST_ACCOUNT = {
  email: "abcd@nurslix.com",
  password: "abcdefghi",
  name: "藍新審核測試帳號",
} as const;

const SETTING_KEY = "testAccountEnabled";

/** 讀取測試帳號是否啟用（預設 false）。失敗時視為關閉。 */
export async function isTestAccountEnabled(): Promise<boolean> {
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
