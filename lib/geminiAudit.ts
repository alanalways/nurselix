/**
 * Gemini-powered content audit for NCLEX questions.
 * Checks clinical accuracy: correct answer, stem factual errors, option plausibility.
 */

import { getApiKeys } from "@/lib/generateBatch";
import { MODEL_PRIORITY } from "@/lib/geminiModels";

export type AuditVerdict = "CORRECT" | "NEEDS_REVIEW" | "ERROR";

export interface AuditResult {
  id: string;
  verdict: AuditVerdict;
  issues: string[];      // short issue descriptions (en/zh mixed OK)
  suggestion: string;    // what to fix, empty if CORRECT
}

interface QuestionForAudit {
  id: string;
  stem: string;
  domain: string | null;
  difficulty: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string | null;
  optionF?: string | null;
  correctAnswer: string;   // e.g. "A" or "A,C"
  explanationZh: string;
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const AUDIT_BATCH = 10; // smaller batches for careful review

const SYSTEM_INSTRUCTION = `你是資深 NCLEX-RN 護理教學專家，任務是審核 NCLEX 題目的臨床正確性。

審核標準：
1. 正確答案是否符合現行 NCLEX 標準及美國護理實務
2. 題幹描述是否有臨床錯誤或不合理假設
3. 選項是否有明顯錯誤（如不符合 ABC 原則、用藥錯誤、scope of practice 錯誤）
4. 解析說明是否與答案一致

判定規則：
- CORRECT：題目無明顯問題，答案符合 NCLEX 標準
- NEEDS_REVIEW：有疑慮但不確定，建議人工複審（例如題意模糊、答案有爭議）
- ERROR：答案明顯錯誤或題目有嚴重臨床錯誤`;

function buildAuditPrompt(questions: QuestionForAudit[]): string {
  const items = questions.map((q, i) => {
    const opts: string[] = [];
    if (q.optionA) opts.push(`A. ${q.optionA}`);
    if (q.optionB) opts.push(`B. ${q.optionB}`);
    if (q.optionC) opts.push(`C. ${q.optionC}`);
    if (q.optionD) opts.push(`D. ${q.optionD}`);
    if (q.optionE) opts.push(`E. ${q.optionE}`);
    if (q.optionF) opts.push(`F. ${q.optionF}`);

    return `=== 題目 ${i + 1} (id: ${q.id}) ===
Domain: ${q.domain ?? "未分類"} | Difficulty: ${q.difficulty}
題幹: ${q.stem}
選項:
${opts.join("\n")}
正確答案: ${q.correctAnswer}
解析: ${q.explanationZh?.slice(0, 400) || "（無）"}`;
  }).join("\n\n");

  const schema = questions.map((q) =>
    `{ "id": "${q.id}", "verdict": "CORRECT|NEEDS_REVIEW|ERROR", "issues": ["..."], "suggestion": "..." }`
  ).join(",\n  ");

  return `${SYSTEM_INSTRUCTION}

以下是 ${questions.length} 道 NCLEX 護理題目，請逐一審核：

${items}

請回傳嚴格 JSON 陣列（不要 markdown code block）：
[
  ${schema}
]

注意：
- issues: 具體問題點，空陣列表示無問題
- suggestion: 修正建議，CORRECT 時請填空字串 ""
- 必須回傳所有 ${questions.length} 題，順序不限但 id 必須對應`;
}

async function callGemini(model: string, prompt: string): Promise<string> {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("No Gemini API keys configured");

  const start = Math.floor(Math.random() * keys.length);
  let lastErr: Error | null = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[(start + i) % keys.length];
    try {
      const res = await fetch(`${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      });
      const json = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        const msg = json?.error?.message ?? `HTTP ${res.status}`;
        if (res.status === 429 || res.status >= 500) { lastErr = new Error(msg); continue; }
        throw new Error(msg);
      }
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text) { lastErr = new Error("Empty response"); continue; }
      return text;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr ?? new Error("All API keys failed");
}

function parseResults(text: string, expected: QuestionForAudit[]): AuditResult[] {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/```\s*$/m, "").trim();
  let parsed: unknown[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON array from response
    const match = /\[[\s\S]+\]/.exec(cleaned);
    if (!match) throw new Error("Could not parse Gemini response as JSON");
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed)) throw new Error("Response is not an array");

  const results: AuditResult[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const id = String(r.id ?? "");
    if (!id) continue;
    results.push({
      id,
      verdict: (["CORRECT", "NEEDS_REVIEW", "ERROR"].includes(String(r.verdict))
        ? r.verdict : "NEEDS_REVIEW") as AuditVerdict,
      issues: Array.isArray(r.issues) ? r.issues.map(String) : [],
      suggestion: String(r.suggestion ?? ""),
    });
  }

  // Fill any missing IDs with NEEDS_REVIEW so we don't silently skip
  const returnedIds = new Set(results.map((r) => r.id));
  for (const q of expected) {
    if (!returnedIds.has(q.id)) {
      results.push({ id: q.id, verdict: "NEEDS_REVIEW", issues: ["Gemini 未回傳此題"], suggestion: "" });
    }
  }

  return results;
}

export async function auditBatch(questions: QuestionForAudit[]): Promise<AuditResult[]> {
  if (questions.length === 0) return [];

  const prompt = buildAuditPrompt(questions);

  // Try models in priority order
  for (const model of MODEL_PRIORITY) {
    try {
      const text = await callGemini(model, prompt);
      return parseResults(text, questions);
    } catch {
      continue;
    }
  }
  throw new Error("All models failed for content audit");
}

export { AUDIT_BATCH };
