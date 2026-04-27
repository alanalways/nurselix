/**
 * ReportAgent — generates the daily/weekly health report narrative.
 * Uses MiniMax-M2.7 (cheap, fast for content gen).
 */
import { runAgent } from "../runAgent";

export interface HealthReportInput {
  period: string;
  totalQuestions: number;
  approvedCount: number;
  draftCount: number;
  archivedCount: number;
  openIssueCount: number;
  healthScore: number;
  issuesByRule: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  /** Trend vs previous period */
  trend?: { issueCountDelta?: number; healthScoreDelta?: number };
  /** Top reported questions in period */
  topReportedQuestions?: { id: string; reportCount: number; stem?: string }[];
}

const SYSTEM_PROMPT = `你是 Nurslix 護理題庫品保部報告員。給你今日的題庫健康度數據，你要寫一份**簡短的繁體中文 markdown 報告**。

格式要求：
1. **標題**：題庫健康度報告 (YYYY-MM-DD)
2. **健康度分數一句話**（含 emoji，如 ✅ 良好 / ⚠️ 注意 / 🚨 警示）
3. **重點摘要**：3-5 個 bullet
4. **需立即處理**：列出 CRITICAL 級數的問題
5. **趨勢**：與前期比較（如有 trend 資料）
6. **建議行動**：1-3 個具體建議

風格：
- 直接、簡潔、可執行
- 用「題目 / 題庫 / 解析」這類繁體中文用詞
- 數字用 markdown 強調
- 避免廢話與客套
- 總長度 300-500 字

只輸出 markdown，不要包 code block。`;

export async function generateHealthReport(input: HealthReportInput): Promise<{ narrative: string; modelUsed: string }> {
  const userPrompt = `請根據下列數據寫出今日題庫健康度報告。

期間：${input.period}
總題數：${input.totalQuestions}
APPROVED：${input.approvedCount}
DRAFT：${input.draftCount}
ARCHIVED：${input.archivedCount}
有問題的題數：${input.openIssueCount}
健康度分數：${input.healthScore}/100

各規則命中數：
${Object.entries(input.issuesByRule).map(([k,v])=>`- ${k}: ${v}`).join("\n")}

各嚴重度：
${Object.entries(input.issuesBySeverity).map(([k,v])=>`- ${k}: ${v}`).join("\n")}

${input.trend ? `\n與前期比較：\n- 新增問題：${input.trend.issueCountDelta}\n- 分數變動：${input.trend.healthScoreDelta}\n` : ""}
${input.topReportedQuestions?.length ? `\n本期使用者回報最多的題目：\n${input.topReportedQuestions.map(q=>`- ${q.id} (${q.reportCount} 次)`).join("\n")}\n` : ""}

開始寫。`;

  const result = await runAgent("quality.health-report", {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.5,
    timeoutMs: 90_000,
  });

  return { narrative: result.text, modelUsed: result.modelUsed };
}
