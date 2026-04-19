import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(1, "請輸入姓名").max(50),
  email: z.string().email("請輸入有效的電子郵件"),
  password: z.string().min(8, "密碼至少需要 8 個字元"),
  examDate: z.string().optional(),
  dailyGoal: z.number().int().min(5).max(100).default(10),
  nursingStatus: z.string().max(30).optional(),
  specialty: z.string().max(60).optional(),
  yearsOfExperience: z.number().int().min(0).max(60).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, email, password, examDate, dailyGoal,
      nursingStatus, specialty, yearsOfExperience,
    } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "此電子郵件已被註冊" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    // During beta (until 2026-05-01) every new user gets PRO until the beta ends.
    // After beta the behaviour reverts automatically to the original 7-day BASIC trial.
    const BETA_ENDS = new Date("2026-05-01T00:00:00Z");
    const inBeta = Date.now() < BETA_ENDS.getTime();
    const trialEndsAt = inBeta
      ? BETA_ENDS
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const initialPlan = inBeta ? "PRO" : "BASIC";

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        examDate: examDate ? new Date(examDate) : null,
        nursingStatus: nursingStatus || null,
        specialty: specialty || null,
        yearsOfExperience: yearsOfExperience ?? null,
        trialUsed: true,
        trialEndsAt,
        plan: initialPlan,
        settings: {
          create: { dailyGoal },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}
