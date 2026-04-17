/**
 * Teaching Agent (claude-sonnet) — deeper analysis, profile update.
 * Runs after Analytics Agent. Updates LearnerProfile with behaviour insights,
 * a personalised insightSummary, concrete next actions, and a 3-day study plan.
 */

import { anthropic } from "@/lib/ai/claude";
import { TAXONOMY_SYSTEM_PROMPT } from "./taxonomy";
import type { AnalyticsResult } from "./analyticsAgent";

export interface ProfileSnapshot {
  domainMastery: Record<string, number>;
  topWeaknesses: string[];
  behaviorPatterns: string[];
  mistakeCounts: Record<string, number>;
  confidenceBand: string;
  recentTrend: string;
  sessionsAnalysed: number;
  thetaHistory: number[];
}

export interface StudyPlanDay {
  day: number;          // 1 | 2 | 3
  focus: string;        // Traditional Chinese, ≤60 chars
  questions: number;    // recommended daily question count
}

export interface TeachingResult {
  updatedBehaviorPatterns: string[];
  updatedMistakeCounts: Record<string, number>;
  confidenceBand: "low" | "developing" | "stable" | "high";
  recentTrend: "improving" | "stable" | "declining";
  insightSummary: string;       // ≤300 chars, Traditional Chinese
  nextActions: string[];        // 3-5 concrete actions, Traditional Chinese
  studyPlan: StudyPlanDay[];    // 3-day plan
  _usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
}

export async function runTeachingAgent(
  analytics: AnalyticsResult,
  profile: ProfileSnapshot,
  sessionTheta: number,
): Promise<TeachingResult> {
  // Merge mistake counts
  const newCounts = { ...profile.mistakeCounts };
  for (const t of analytics.mistakeTypes) {
    newCounts[t] = (newCounts[t] ?? 0) + 1;
  }

  // Merge behaviour patterns (keep unique, max 8)
  const allPatterns = Array.from(
    new Set([...profile.behaviorPatterns, ...analytics.behaviorPatterns])
  ).slice(0, 8);

  // Theta trend
  const thetaHistory = [...profile.thetaHistory.slice(-9), sessionTheta];
  const thetaTrend =
    thetaHistory.length >= 3
      ? thetaHistory[thetaHistory.length - 1] - thetaHistory[thetaHistory.length - 3]
      : 0;
  const recentTrend: "improving" | "stable" | "declining" =
    thetaTrend > 0.15 ? "improving" : thetaTrend < -0.15 ? "declining" : "stable";

  // Confidence band from theta
  const confidenceBand: "low" | "developing" | "stable" | "high" =
    sessionTheta < -1 ? "low"
    : sessionTheta < 0 ? "developing"
    : sessionTheta < 1 ? "stable"
    : "high";

  const prompt = `You are Hermes, a senior NCLEX-RN teaching agent. Analyse this learner and produce a structured update.

LEARNER STATE:
- Sessions analysed: ${profile.sessionsAnalysed}
- θ (IRT ability): ${sessionTheta.toFixed(2)} → confidence: ${confidenceBand}, trend: ${recentTrend}
- Top weaknesses: ${profile.topWeaknesses.join(", ") || "none yet"}
- Behaviour patterns: ${allPatterns.join(", ") || "none"}
- Mistake type counts: ${JSON.stringify(newCounts)}

THIS SESSION:
- Mistake types: ${analytics.mistakeTypes.join(", ") || "none"}
- Weak domains: ${analytics.weakDomains.join(", ") || "none"}
- Root causes: ${analytics.rootCauses}
- Severity: ${analytics.severity}/5

TASK: Return ONLY valid JSON with exactly these fields:
{
  "insightSummary": "<2 sentences, Traditional Chinese, ≤300 chars total. Pattern forming + one actionable advice>",
  "nextActions": ["<action 1>", "<action 2>", "<action 3>"],
  "studyPlan": [
    { "day": 1, "focus": "<Traditional Chinese, ≤60 chars>", "questions": <number 10-30> },
    { "day": 2, "focus": "<Traditional Chinese, ≤60 chars>", "questions": <number 10-30> },
    { "day": 3, "focus": "<Traditional Chinese, ≤60 chars>", "questions": <number 10-30> }
  ]
}

Rules for nextActions (3-5 items):
- Each item ≤60 chars, Traditional Chinese
- Must be concrete and actionable (e.g. "練 15 題 Management of Care 的 Priority 題型")
- Directly address the worst mistake pattern from this session

Rules for studyPlan:
- Day 1: address the top weakness from this session
- Day 2: reinforce a related domain
- Day 3: mixed review / confidence building
- questions must match the learner's confidence band (low=10, developing=15, stable=20, high=25)`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
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

  let insightSummary = analytics.keyInsight;
  let nextActions: string[] = [];
  let studyPlan: StudyPlanDay[] = [];

  try {
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

    insightSummary = String(json.insightSummary ?? analytics.keyInsight).slice(0, 300);

    if (Array.isArray(json.nextActions)) {
      nextActions = (json.nextActions as unknown[])
        .slice(0, 5)
        .map((a) => String(a).slice(0, 60))
        .filter(Boolean);
    }

    if (Array.isArray(json.studyPlan)) {
      studyPlan = (json.studyPlan as Array<{ day: unknown; focus: unknown; questions: unknown }>)
        .slice(0, 3)
        .map((d) => ({
          day: Number(d.day) || 1,
          focus: String(d.focus ?? "").slice(0, 60),
          questions: Math.min(50, Math.max(5, Number(d.questions) || 15)),
        }));
    }
  } catch {
    // fallback defaults
    nextActions = analytics.weakDomains.slice(0, 3).map((d) => `加強 ${d} 領域練習`);
  }

  // Ensure we always have a 3-day plan
  if (studyPlan.length === 0) {
    const baseQ = confidenceBand === "low" ? 10 : confidenceBand === "developing" ? 15 : 20;
    studyPlan = [
      { day: 1, focus: analytics.weakDomains[0] ? `${analytics.weakDomains[0]} 弱點集中練習` : "錯題針對練習", questions: baseQ },
      { day: 2, focus: "混合 Domain 強化", questions: baseQ },
      { day: 3, focus: "SATA + Priority 策略複習", questions: baseQ + 5 },
    ];
  }

  return {
    updatedBehaviorPatterns: allPatterns,
    updatedMistakeCounts: newCounts,
    confidenceBand,
    recentTrend,
    insightSummary,
    nextActions,
    studyPlan,
    _usage,
  };
}
