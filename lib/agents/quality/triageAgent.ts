/**
 * TriageAgent — classifies user reports into categories and assigns severity.
 * Uses Kimi-K2.5 (multimodal, 256K ctx, can handle large batches of reports).
 */
import { runAgentJSON } from "../runAgent";
import type { QuestionShape } from "@/lib/quality/rules";

export interface TriageResult {
  /** NEEDS_FIX | LIKELY_VALID | LIKELY_INVALID | UNCERTAIN */
  verdict: "NEEDS_FIX" | "LIKELY_VALID" | "LIKELY_INVALID" | "UNCERTAIN";
  /** INCORRECT_ANSWER | TYPO | UNCLEAR_STEM | OUTDATED_INFO | UI_BUG | OTHER */
  reasonCategory: string;
  /** LOW | MEDIUM | HIGH | CRITICAL */
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Concise Chinese reasoning. */
  reasoning: string;
  /** Whether this report should auto-pull the question off APPROVED status. */
  shouldAutoArchive: boolean;
}

const SYSTEM_PROMPT = `你是 NCLEX 題庫客訴分流員。給你一個使用者回報與該題目的內容，你要判斷此回報是否成立、嚴重程度、以及是否需要立刻下架題目。

只輸出 JSON：
{
  "verdict": "NEEDS_FIX" | "LIKELY_VALID" | "LIKELY_INVALID" | "UNCERTAIN",
  "reasonCategory": "INCORRECT_ANSWER" | "TYPO" | "UNCLEAR_STEM" | "OUTDATED_INFO" | "UI_BUG" | "OTHER",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reasoning": "繁體中文 2 句說明",
  "shouldAutoArchive": true 或 false
}

判斷原則：
- 若使用者指控答案錯誤且解析確實有矛盾 → verdict=NEEDS_FIX, severity=CRITICAL, shouldAutoArchive=true
- 若題目根本看不懂（題幹亂碼、選項雜訊）→ verdict=NEEDS_FIX, shouldAutoArchive=true
- 若使用者只是不同意但題目其實正確 → verdict=LIKELY_INVALID
- 若是 UI/前端 bug 不是題目問題 → reasonCategory=UI_BUG, severity=LOW
- 不確定時用 UNCERTAIN，shouldAutoArchive=false`;

export async function triageReport(
  report: { reason: string; detail?: string | null },
  question: QuestionShape
): Promise<TriageResult & { _meta: { modelUsed: string; latencyMs: number } }> {
  const userPrompt = `【使用者回報】
原因：${report.reason}
細節：${report.detail || "(無)"}

【相關題目】
題幹：${question.stem}
A. ${question.optionA}
B. ${question.optionB}
C. ${question.optionC}
D. ${question.optionD}
${question.optionE ? `E. ${question.optionE}\n` : ""}正確答案：${question.correctAnswer}
解析：${question.explanationZh || "(無)"}

請判斷並輸出 JSON。`;

  const result = await runAgentJSON<TriageResult>("report.triage", {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
    timeoutMs: 60_000,
  });

  return {
    ...result.data,
    _meta: { modelUsed: result.modelUsed, latencyMs: result.totalMs },
  };
}
