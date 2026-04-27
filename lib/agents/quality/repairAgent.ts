/**
 * RepairAgent — given a question with a known issue, generate a corrected version.
 * Uses DeepSeek-V4-Pro (best reasoning).
 *
 * Returns the proposed new fields. Does NOT write to DB — caller decides
 * (auto-apply, queue for review, etc).
 */
import { runAgentJSON } from "../runAgent";
import type { QuestionShape } from "@/lib/quality/rules";
import type { VerifierVerdict } from "./verifierAgent";

export interface RepairProposal {
  /** Which fields the agent proposes to change. */
  fieldsToChange: string[];
  /** Proposed new values. Only include fields that change. */
  proposed: Partial<{
    stem: string;
    stemZh: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    optionE: string | null;
    optionF: string | null;
    correctAnswer: string;
    correctAnswers: string[];
    explanationZh: string;
    explanationEn: string;
    optionRationales: any;
  }>;
  /** Concise Chinese summary of what changed and why. */
  changeSummary: string;
  /** Confidence 0-100. <70 should be reviewed by human before apply. */
  confidence: number;
}

const SYSTEM_PROMPT = `你是 NCLEX-RN 考題修補專家。給你一道有問題的題目和審查員指出的問題，你要產出修補建議。

修補原則：
1. **保持題目核心知識點不變**——只修錯，不改題目要考的核心臨床概念
2. **NCLEX 標準風格**：題幹簡潔、選項長度平衡、無雙重否定、無絕對化字眼
3. **解析完整**：≥150 字，分項說明每個選項為何對/錯
4. **rationale 對齊**：每個選項都有 zh + en，正確選項說明為何對，錯誤選項說明為何錯
5. **答案修正時**必須在 changeSummary 明確說「答案 X→Y 因為...」
6. **如果題幹/選項是垃圾（無意義副詞堆疊）**，重寫成乾淨的 NCLEX 風格題目，但保留原始臨床情境

只輸出 JSON：
{
  "fieldsToChange": ["explanationZh", "optionRationales"],
  "proposed": { ... 只放真的要改的欄位 ... },
  "changeSummary": "繁體中文 1-3 句說明改了什麼為什麼",
  "confidence": 0-100
}

重要：
- 不要保留無意義的副詞（gracefully, smartly, securely 等）
- 改答案 (correctAnswer) 必須同時改 correctAnswers
- proposed 裡只放實際變動的欄位，沒改的不要放
- explanationZh 必須超過 150 字
- 每個選項的 rationale 要有實質內容，不能是 "Irrelevant noise"`;

export async function repairQuestion(
  q: QuestionShape,
  context: { verdict?: VerifierVerdict; ruleIds?: string[]; userReports?: { reason: string; detail?: string | null }[] }
): Promise<RepairProposal & { _meta: { modelUsed: string; latencyMs: number } }> {
  const reportSummary = context.userReports?.length
    ? `\n【使用者回報摘要】\n${context.userReports.map((r,i) => `${i+1}. ${r.reason}${r.detail ? ` — ${r.detail}` : ""}`).join("\n")}\n`
    : "";

  const verdictBlock = context.verdict
    ? `\n【審查員判定】\nverdict: ${context.verdict.verdict}\nprimaryIssue: ${context.verdict.primaryIssue}\nreasoning: ${context.verdict.reasoning}\nsuggestedCorrectAnswer: ${context.verdict.suggestedCorrectAnswer}\n`
    : "";

  const ruleBlock = context.ruleIds?.length
    ? `\n【規則偵測命中】${context.ruleIds.join(", ")}\n`
    : "";

  const userPrompt = `請對下列題目產出修補建議。

【原題】
題幹（EN）：${q.stem}
題幹（ZH）：${q.stemZh || "(無)"}
選項 A：${q.optionA}
選項 B：${q.optionB}
選項 C：${q.optionC}
選項 D：${q.optionD}
${q.optionE ? `選項 E：${q.optionE}\n` : ""}${q.optionF ? `選項 F：${q.optionF}\n` : ""}correctAnswer：${q.correctAnswer}
correctAnswers：${JSON.stringify(q.correctAnswers || [])}
explanationZh：${q.explanationZh || "(無)"}
optionRationales：${JSON.stringify(q.optionRationales || {})}
題型：${q.questionType}
難度：${q.difficulty}
${verdictBlock}${ruleBlock}${reportSummary}
請輸出修補 JSON。`;

  const result = await runAgentJSON<RepairProposal>("quality.repair", {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    timeoutMs: 120_000,
  });

  return {
    ...result.data,
    _meta: { modelUsed: result.modelUsed, latencyMs: result.totalMs },
  };
}
