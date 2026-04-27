/**
 * VerifierAgent — uses DeepSeek-V4-Pro to deeply verify whether a question's
 * answer/explanation/options are clinically and logically consistent.
 *
 * Goes beyond rule-based scanning: catches semantic mismatches like:
 *   - explanation talks about a topic unrelated to the stem
 *   - "correct" answer is clinically wrong by NCLEX standards
 *   - rationale and answer key contradict each other
 */
import { runAgentJSON } from "../runAgent";
import type { QuestionShape } from "@/lib/quality/rules";

export interface VerifierVerdict {
  /** OK | NEEDS_FIX | UNCERTAIN */
  verdict: "OK" | "NEEDS_FIX" | "UNCERTAIN";
  /** "answer_wrong" | "explanation_unrelated" | "rationale_inconsistent" | "clinical_error" | "unclear" | null */
  primaryIssue: string | null;
  /** Concise Chinese explanation. */
  reasoning: string;
  /** If verdict=NEEDS_FIX, what should the correct answer be (single letter or comma list)? null if not applicable. */
  suggestedCorrectAnswer: string | null;
  /** Confidence 0-100 */
  confidence: number;
}

const SYSTEM_PROMPT = `你是一位資深 NCLEX-RN 考題審查員，同時具備臨床護理專業與測驗命題經驗。

你的任務是深度審查一道題目，判斷以下三個面向是否一致且符合 NCLEX 標準：
1. **題幹（stem）vs 解析（explanationZh）**：解析是否真的在解釋題幹問的問題？
2. **正確答案 vs 解析支持的答案**：解析的論述支持的選項，是否就是 DB 標記的 correctAnswer？
3. **臨床正確性**：標記的正確答案在 NCLEX 標準下是否為臨床正確？

只輸出 JSON，不要任何 markdown：
{
  "verdict": "OK" | "NEEDS_FIX" | "UNCERTAIN",
  "primaryIssue": "answer_wrong" | "explanation_unrelated" | "rationale_inconsistent" | "clinical_error" | "unclear" | null,
  "reasoning": "繁體中文，2-3 句話說明判定理由",
  "suggestedCorrectAnswer": "若需修正，給單字母或逗號分隔列表（如 \"B\" 或 \"A,C,E\"），否則 null",
  "confidence": 0-100 數字
}

重要：
- 如果題幹講 X 但解析在講 Y（不相關話題），primaryIssue = "explanation_unrelated"
- 如果 correctAnswer 標 A 但解析論述支持 B，primaryIssue = "rationale_inconsistent"
- 如果 NCLEX 公認答案不是 DB 標的，primaryIssue = "clinical_error"
- 如果一切都對，verdict = "OK"，其他欄位放 null（reasoning 仍寫一句）
- 不確定時 verdict = "UNCERTAIN"，不要硬猜`;

export async function verifyQuestion(q: QuestionShape): Promise<VerifierVerdict & { _meta: { modelUsed: string; latencyMs: number } }> {
  const userPrompt = `請審查下列題目：

【題幹（EN）】
${q.stem || "(empty)"}

【題幹（ZH）】
${q.stemZh || "(empty)"}

【選項】
A. ${q.optionA}
B. ${q.optionB}
C. ${q.optionC}
D. ${q.optionD}
${q.optionE ? `E. ${q.optionE}\n` : ""}${q.optionF ? `F. ${q.optionF}\n` : ""}

【DB 標記正確答案】${q.correctAnswer}
【DB correctAnswers 陣列】${JSON.stringify(q.correctAnswers || [])}

【中文解析（explanationZh）】
${q.explanationZh || "(empty)"}

【選項 rationale】
${JSON.stringify(q.optionRationales || {}, null, 2)}

【題型】${q.questionType || "MCQ"}
【難度】${q.difficulty || "MEDIUM"}

請審查並輸出 JSON。`;

  const result = await runAgentJSON<VerifierVerdict>("quality.verify", {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
    timeoutMs: 90_000,
  });

  return {
    ...result.data,
    _meta: { modelUsed: result.modelUsed, latencyMs: result.totalMs },
  };
}
