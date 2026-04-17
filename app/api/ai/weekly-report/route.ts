import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/ai/claude";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).plan !== "ELITE") {
    return NextResponse.json({ error: "此功能需要 Elite 方案", required: "ELITE" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI 服務暫時不可用" }, { status: 503 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const stats = await prisma.userDailyStats.findMany({
    where: { userId: session.user.id, statDate: { gte: thirtyDaysAgo } },
    orderBy: { statDate: "desc" },
  });

  // Aggregate domain stats
  const merged: Record<string, { done: number; correct: number }> = {};
  for (const day of stats) {
    const ds = (day.domainStats ?? {}) as Record<string, { done: number; correct: number }>;
    for (const [domain, val] of Object.entries(ds)) {
      merged[domain] = {
        done: (merged[domain]?.done ?? 0) + (val.done ?? 0),
        correct: (merged[domain]?.correct ?? 0) + (val.correct ?? 0),
      };
    }
  }

  const totalDone = stats.reduce((s, r) => s + r.questionsDone, 0);
  const totalCorrect = stats.reduce((s, r) => s + r.correctCount, 0);
  const accuracy = totalDone > 0 ? Math.round((totalCorrect / totalDone) * 100) : 0;

  const domainList = Object.entries(merged)
    .filter(([, v]) => v.done >= 3)
    .map(([domain, v]) => ({
      domain,
      done: v.done,
      accuracy: Math.round((v.correct / v.done) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakDomains = domainList.slice(0, 3);
  const strongDomains = domainList.slice(-3).reverse();

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    messages: [
      {
        role: "user",
        content: `你是一位 NCLEX-RN 備考顧問。根據以下學生的近 30 天練習數據，用繁體中文寫出 3 段分析報告（每段不超過 80 字）：

第一段：整體學習狀態摘要
第二段：弱點領域分析與知識缺口
第三段：下週具體行動建議

學生數據：
- 總練習題數：${totalDone} 題
- 整體正確率：${accuracy}%
- 弱點領域（由低至高）：${JSON.stringify(weakDomains)}
- 優勢領域：${JSON.stringify(strongDomains)}

請直接輸出 3 段文字，不要加標題或編號。`,
      },
    ],
  });

  const report = message.content[0]?.type === "text" ? message.content[0].text : "";

  return NextResponse.json({
    report,
    weakDomains,
    strongDomains,
    totalDone,
    accuracy,
    generatedAt: new Date().toISOString(),
  });
}
