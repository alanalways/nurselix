import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/nclex/sessionEngine";
import { getClientIp, ipRateLimit, userRateLimit } from "@/lib/utils/rateLimit";
import { getDailyUsage } from "@/lib/utils/dailyLimit";
import type { Plan } from "@/types";

const schema = z.object({
  mode: z.enum(["CAT", "PRACTICE", "TUTOR", "MOCK", "ASSESSMENT", "MINI_CAT", "ERROR_CHALLENGE"]),
  targetCount: z.number().int().min(1).max(300).optional(),
  timeLimitSec: z.number().int().min(60).max(86400).optional(),
  domainFilter: z.array(z.string()).max(8).optional(),
  difficultyFilter: z.array(z.enum(["EASY", "MEDIUM", "HARD"])).max(3).optional(),
});

/** Plan-gated modes */
const MODE_REQUIRES: Record<string, Plan[]> = {
  CAT: ["PRO", "ELITE"],
  MOCK: ["PRO", "ELITE"],
  TUTOR: ["BASIC", "PRO", "ELITE"],
  PRACTICE: ["FREE", "BASIC", "PRO", "ELITE"],
  ASSESSMENT: ["FREE", "BASIC", "PRO", "ELITE"],
  MINI_CAT: ["FREE", "BASIC", "PRO", "ELITE"],
  ERROR_CHALLENGE: ["FREE", "BASIC", "PRO", "ELITE"],
};

const DEFAULT_CAT_TARGET = 150;
const DEFAULT_MOCK_TARGET = 150;
const DEFAULT_MINI_CAT_TARGET = 15;
const DEFAULT_ASSESSMENT_TARGET = 25;
const DEFAULT_PRACTICE_TARGET = 10;

const DEFAULT_MOCK_TIME = 5 * 60 * 60;
const DEFAULT_ASSESSMENT_TIME = 10 * 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const ipLimit = await ipRateLimit(ip, { limit: 60, windowSec: 60 });
  if (!ipLimit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const userLimit = await userRateLimit(session.user.id, "session-create", { limit: 3, windowSec: 60 });
  if (!userLimit.success) return NextResponse.json({ error: "Too many sessions created" }, { status: 429 });

  try {
    const body = await req.json();
    const input = schema.parse(body);

    // Fetch fresh user from DB to enforce trial/subscription expiry
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, trialEndsAt: true, subscriptionEndsAt: true } as any,
    }) as { plan: string; trialEndsAt: Date | null; subscriptionEndsAt: Date | null } | null;

    let effectivePlan = (session.user.plan ?? "FREE") as Plan;

    if (dbUser) {
      const now = new Date();
      const subEndsAt = dbUser.subscriptionEndsAt as Date | null;
      const hasActiveSub = subEndsAt && subEndsAt > now;
      const trialExpired = dbUser.trialEndsAt && dbUser.trialEndsAt < now;

      if (dbUser.plan !== "FREE" && trialExpired && !hasActiveSub) {
        // Trial expired, no paid sub → downgrade
        await prisma.user.update({ where: { id: session.user.id }, data: { plan: "FREE" } });
        effectivePlan = "FREE";
      } else if (dbUser.plan !== "FREE" && subEndsAt && subEndsAt < now) {
        // Paid subscription expired
        await prisma.user.update({
          where: { id: session.user.id },
          data: { plan: "FREE", subscriptionEndsAt: null } as any,
        });
        effectivePlan = "FREE";
      } else {
        effectivePlan = dbUser.plan as Plan;
      }
    }

    const allowed = MODE_REQUIRES[input.mode] ?? [];
    if (!allowed.includes(effectivePlan)) {
      return NextResponse.json(
        { error: `此模式需要 ${allowed[0]} 或以上方案`, required: allowed[0] },
        { status: 403 },
      );
    }

    // Daily quota check
    const quota = await getDailyUsage(session.user.id, effectivePlan);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `今日題數已達 ${quota.limit} 題上限`, resetAt: quota.resetAt },
        { status: 429 },
      );
    }

    let targetCount = input.targetCount;
    let timeLimitSec = input.timeLimitSec;

    switch (input.mode) {
      case "CAT":
        targetCount ??= DEFAULT_CAT_TARGET;
        timeLimitSec ??= 18000;
        break;
      case "MOCK":
        targetCount ??= DEFAULT_MOCK_TARGET;
        timeLimitSec ??= DEFAULT_MOCK_TIME;
        break;
      case "MINI_CAT":
        targetCount ??= DEFAULT_MINI_CAT_TARGET;
        break;
      case "ASSESSMENT":
        targetCount ??= DEFAULT_ASSESSMENT_TARGET;
        timeLimitSec ??= DEFAULT_ASSESSMENT_TIME;
        break;
      case "PRACTICE":
      case "TUTOR":
      case "ERROR_CHALLENGE":
        targetCount ??= DEFAULT_PRACTICE_TARGET;
        break;
    }

    const created = await createSession({
      userId: session.user.id,
      mode: input.mode,
      targetCount,
      timeLimitSec,
      domainFilter: input.domainFilter,
      difficultyFilter: input.difficultyFilter,
      isAssessment: input.mode === "ASSESSMENT",
    });

    return NextResponse.json({
      sessionId: created.id,
      mode: created.mode,
      targetCount: created.targetCount,
      timeLimitSec: created.timeLimitSec,
      startedAt: created.startedAt,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("[nclex/session POST]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
