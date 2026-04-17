import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/ai/claude";

const schema = z.object({ examDate: z.string().optional() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).plan !== "ELITE") {
    return NextResponse.json({ error: "此功能需要 Elite 方案", required: "ELITE" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI 服務暫時不可用" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const { examDate } = schema.parse(body);

  // Gather user stats
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [stats, errorCount, user] = await Promise.all([
    prisma.userDailyStats.findMany({
      where: { userId: session.user.id, statDate: { gte: thirtyDaysAgo } },
      orderBy: { statDate: "desc" },
    }),
    prisma.errorQuestion.count({ where: { userId: session.user.id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { examDate: true } }),
  ]);

  const totalDone = stats.reduce((s, r) => s + r.questionsDone, 0);
  const totalCorrect = stats.reduce((s, r) => s + r.correctCount, 0);
  const accuracy = totalDone > 0 ? Math.round((totalCorrect / totalDone) * 100) : 0;
  const avgPerDay = stats.length > 0 ? Math.round(totalDone / stats.length) : 0;

  const targetDate = examDate ?? user?.examDate?.toISOString().slice(0, 10);
  const weeksLeft = targetDate
    ? Math.max(0, Math.round((new Date(targetDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
    : null;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: [
      {
        type: "text",
        text: `你是一位專業的 NCLEX-RN 備考規劃師。根據學生數據生成結構化的 4 週學習計畫。
必須以 JSON 格式回應，格式為：
{"weeks":[{"week":1,"theme":"string","focusDomains":["string"],"dailyGoal":number,"tasks":["string"],"tips":"string"},...]}
每週 3-4 個任務，tips 為學習技巧建議。使用繁體中文。`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `學生數據：
- 近 30 天練習：${totalDone} 題，正確率 ${accuracy}%
- 平均每日：${avgPerDay} 題
- 錯題庫累計：${errorCount} 題
- 考試日期：${targetDate ?? "未設定"}
- 距考試約：${weeksLeft !== null ? `${weeksLeft} 週` : "未知"}

請生成 4 週個人化學習計畫。`,
      },
    ],
  });

  const raw = message.content[0]?.type === "text" ? message.content[0].text : "{}";
  let plan;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { weeks: [] };
  } catch {
    plan = { weeks: [] };
  }

  return NextResponse.json({ ...plan, generatedAt: new Date().toISOString() });
}
