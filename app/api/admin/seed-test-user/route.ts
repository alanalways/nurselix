/**
 * 建立/重置測試帳號（藍新金流審核用）
 * 帳號：abcd@nurslix.com / abcdefghi / FREE
 * 僅限 admin 呼叫
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TEST_EMAIL = "abcd@nurslix.com";
const TEST_PASSWORD = "abcdefghi";
const TEST_NAME = "藍新測試帳號";

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hashed = await bcrypt.hash(TEST_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    create: {
      email: TEST_EMAIL,
      name: TEST_NAME,
      password: hashed,
      role: "STUDENT",
      plan: "FREE",
      emailVerified: new Date(),
      trialUsed: false,
    },
    update: {
      password: hashed,
      plan: "FREE",
      trialUsed: false,
      trialEndsAt: null,
      subscriptionEndsAt: null,
    },
  });

  return NextResponse.json({
    ok: true,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    plan: user.plan,
    userId: user.id,
    message: "測試帳號已建立 / 重置。請將此帳密提供給藍新金流審核。",
  });
}
