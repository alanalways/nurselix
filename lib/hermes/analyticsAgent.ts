/**
 * Analytics Agent (claude-haiku) — fast, cheap.
 * Runs after every session. Classifies mistakes and detects behaviour patterns.
 */

import { anthropic } from "@/lib/ai/claude";
import { TAXONOMY_SYSTEM_PROMPT, type MistakeType, type BehaviorPattern } from "./taxonomy";

export interface SessionSnapshot {
  mode: string;
  totalQuestions: number;
  correctCount: number;
  answers: {
    questionId: string;
    domain: string | null;
    difficulty: string;
    questionType: string;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpentSec: number | null;
  }[];
}

export interface AnalyticsResult {
  mistakeTypes: MistakeType[];
  behaviorPatterns: BehaviorPattern[];
  weakDomains: string[];
  severity: number;       // 1-5
  rootCauses: string;     // ≤200 chars, Traditional Chinese
  keyInsight: string;     // ≤100 chars, Traditional Chinese
  _usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
}

export async function runAnalyticsAgent(snapshot: SessionSnapshot): Promise<AnalyticsResult> {
  const accuracy = snapshot.totalQuestions > 0
    ? Math.round((snapshot.correctCount / snapshot.totalQuestions) * 100)
    : 0;

  const domainErrors: Record<string, { wrong: number; total: number }> = {};
  let sataWrong = 0; let sataTotal = 0;
  let longStemWrong = 0;

  for (const a of snapshot.answers) {
    const d = a.domain ?? "Unknown";
    if (!domainErrors[d]) domainErrors[d] = { wrong: 0, total: 0 };
    domainErrors[d].total++;
    if (!a.isCorrect) domainErrors[d].wrong++;
    if (a.questionType === "SATA") { sataTotal++; if (!a.isCorrect) sataWrong++; }
  }

  const weakDomains = Object.entries(domainErrors)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => (b[1].wrong / b[1].total) - (a[1].wrong / a[1].total))
    .slice(0, 3)
    .map(([d]) => d);

  const prompt = `Session data:
- Mode: ${snapshot.mode}
- Questions: ${snapshot.totalQuestions}, Correct: ${snapshot.correctCount} (${accuracy}%)
- Weak domains: ${weakDomains.join(", ") || "none"}
- SATA accuracy: ${sataTotal > 0 ? Math.round((1 - sataWrong / sataTotal) * 100) + "%" : "N/A"}

Wrong answers summary (domain | difficulty | type):
${snapshot.answers.filter(a => !a.isCorrect).slice(0, 20).map(a =>
    `${a.domain ?? "?"} | ${a.difficulty} | ${a.questionType}`
  ).join("\n")}

Respond in JSON exactly:
{
  "mistakeTypes": ["<label>", ...],
  "behaviorPatterns": ["<pattern>", ...],
  "severity": <1-5>,
  "rootCauses": "<≤200 char Traditional Chinese>",
  "keyInsight": "<≤100 char Traditional Chinese>"
}`;

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: [{ type: "text", text: TAXONOMY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
  });

  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
  const _usage = {
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    cacheReadTokens: (msg.usage as any).cache_read_input_tokens ?? 0,
    cacheWriteTokens: (msg.usage as any).cache_creation_input_tokens ?? 0,
  };
  try {
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    return {
      mistakeTypes: (json.mistakeTypes ?? []) as MistakeType[],
      behaviorPatterns: (json.behaviorPatterns ?? []) as BehaviorPattern[],
      weakDomains,
      severity: Math.min(5, Math.max(1, Number(json.severity) || 3)),
      rootCauses: String(json.rootCauses ?? "").slice(0, 200),
      keyInsight: String(json.keyInsight ?? "").slice(0, 100),
      _usage,
    };
  } catch {
    return { mistakeTypes: [], behaviorPatterns: [], weakDomains, severity: 3, rootCauses: "", keyInsight: "", _usage };
  }
}
