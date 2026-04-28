/**
 * Marketing Analytics Agent — analyzes user behavior and recommends actions.
 * Reads from User / UserSession / Order / UpgradeRequest and generates strategy.
 *
 * Uses DeepSeek-V4-Pro (best reasoning).
 */
import { runAgent } from "../runAgent";
import { prisma } from "@/lib/prisma";

export interface AnalyticsSnapshot {
  totalUsers: number;
  newUsersLast7d: number;
  activeUsersLast7d: number;
  paidUsers: number;
  freeUsers: number;
  trialUsers: number;
  /** New orders in last 30 days */
  ordersLast30d: number;
  revenueLast30d: number;
  /** Conversion: trial → paid in last 30d */
  trialToPaidConversion: number;
  /** Top study domains by attempts */
  topDomains: { domain: string; attempts: number }[];
  /** Sessions abandoned mid-way (potential churn signal) */
  abandonedSessionRate: number;
}

const SYSTEM_PROMPT = `你是 Nurslix 行銷分析顧問。你會看到平台關鍵運營數據，要根據數據給出**3 個具體可執行的行銷建議**。

每個建議必須：
- **動作 (Action)**：具體一句話的動作（不是「優化轉換」這種模糊說法）
- **理由 (Why)**：根據數據哪一點得出
- **預期效果 (Impact)**：預估能改善什麼指標

輸出格式（繁體中文 markdown）：

## 重點觀察
- 3 個數據洞察

## 建議行動

### 1. <動作標題>
- 為何：<根據哪個數據>
- 怎麼做：<具體步驟>
- 預期效果：<指標變化>

### 2. ...

### 3. ...

## 警訊
（如果有任何危險信號，例如流失率異常、轉換崩盤）

只輸出 markdown，不要 code block 包裹。`;

export async function analyzeAndAdvise(snapshot: AnalyticsSnapshot): Promise<{ analysis: string; modelUsed: string }> {
  const userPrompt = `本期數據：
${JSON.stringify(snapshot, null, 2)}

請分析並給出建議。`;

  const result = await runAgent("marketing.analytics", {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.4,
    timeoutMs: 90_000,
  });

  return { analysis: result.text, modelUsed: result.modelUsed };
}

/** Collect a snapshot from DB. */
export async function collectAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, newUsers7d,
    paidUsers, freeUsers, trialUsers,
    ordersLast30d, revenueAgg,
    abandoned, totalSessions,
    topDomains,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { plan: { in: ["BASIC", "PRO", "ELITE"] } } }),
    prisma.user.count({ where: { plan: "FREE" } }),
    prisma.user.count({ where: { trialEndsAt: { gt: now } } }),
    prisma.order.count({ where: { createdAt: { gte: d30 } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: d30 }, status: "paid" }, _sum: { amount: true } }),
    prisma.userSession.count({ where: { startedAt: { gte: d7 }, endedAt: null } }),
    prisma.userSession.count({ where: { startedAt: { gte: d7 } } }),
    prisma.userAnswer.groupBy({
      by: ["questionId"],
      where: { answeredAt: { gte: d7 } },
      _count: { questionId: true },
      orderBy: { _count: { questionId: "desc" } },
      take: 10,
    }).then(async rows => {
      // Map questionId → domain
      const ids = rows.map(r => r.questionId);
      const qs = await prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true, domain: true } });
      const map = new Map(qs.map(q => [q.id, q.domain]));
      const byDomain = new Map<string, number>();
      rows.forEach(r => {
        const d = map.get(r.questionId) || "Unknown";
        byDomain.set(d, (byDomain.get(d) || 0) + r._count.questionId);
      });
      return Array.from(byDomain.entries()).map(([domain, attempts]) => ({ domain, attempts })).sort((a,b)=>b.attempts-a.attempts).slice(0, 5);
    }),
  ]);

  // active = users who had a session in last 7d
  const activeUsers = await prisma.userSession.findMany({
    where: { startedAt: { gte: d7 } },
    select: { userId: true },
    distinct: ["userId"],
  });

  // Trial → paid conversion (last 30d): users whose plan transitioned out of FREE/trial
  // Approximate via Order.userId set ∩ users with trialUsed=true
  const conversionUsers = await prisma.user.count({
    where: { trialUsed: true, plan: { in: ["BASIC", "PRO", "ELITE"] }, updatedAt: { gte: d30 } },
  });

  return {
    totalUsers,
    newUsersLast7d: newUsers7d,
    activeUsersLast7d: activeUsers.length,
    paidUsers,
    freeUsers,
    trialUsers,
    ordersLast30d,
    revenueLast30d: Number(revenueAgg._sum.amount || 0),
    trialToPaidConversion: conversionUsers,
    topDomains,
    abandonedSessionRate: totalSessions > 0 ? abandoned / totalSessions : 0,
  };
}
