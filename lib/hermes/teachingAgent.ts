/**
 * Teaching Agent (claude-sonnet) — deeper analysis, profile update.
 * Runs after Analytics Agent. Updates LearnerProfile with behaviour insights.
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

export interface TeachingResult {
  updatedBehaviorPatterns: string[];
  updatedMistakeCounts: Record<string, number>;
  confidenceBand: "low" | "developing" | "stable" | "high";
  recentTrend: "improving" | "stable" | "declining";
  insightSummary: string;  // ≤300 chars, Traditional Chinese
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
  const allPatterns = Array.from(new Set([...profile.behaviorPatterns, ...analytics.behaviorPatterns])).slice(0, 8);

  // Theta trend
  const thetaHistory = [...profile.thetaHistory.slice(-9), sessionTheta];
  const thetaTrend = thetaHistory.length >= 3
    ? thetaHistory[thetaHistory.length - 1] - thetaHistory[thetaHistory.length - 3]
    : 0;
  const recentTrend: "improving" | "stable" | "declining" =
    thetaTrend > 0.15 ? "improving" : thetaTrend < -0.15 ? "declining" : "stable";

  // Confidence band from theta
  const theta = sessionTheta;
  const confidenceBand: "low" | "developing" | "stable" | "high" =
    theta < -1 ? "low" : theta < 0 ? "developing" : theta < 1 ? "stable" : "high";

  const prompt = `Learner profile update needed.

Current profile:
- Sessions analysed: ${profile.sessionsAnalysed}
- Top weaknesses: ${profile.topWeaknesses.join(", ") || "none yet"}
- Behaviour patterns: ${allPatterns.join(", ") || "none"}
- Confidence: ${confidenceBand}, Trend: ${recentTrend}
- θ = ${sessionTheta.toFixed(2)}

This session:
- Mistake types: ${analytics.mistakeTypes.join(", ") || "none"}
- Weak domains: ${analytics.weakDomains.join(", ") || "none"}
- Root causes: ${analytics.rootCauses}

Write a 2-sentence learner insight summary in Traditional Chinese (≤300 chars total).
Focus on: what pattern is forming + one actionable advice.

Respond in JSON:
{ "insightSummary": "<Traditional Chinese, ≤300 chars>" }`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: [{ type: "text", text: TAXONOMY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
  });

  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
  let insightSummary = "";
  try {
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    insightSummary = String(json.insightSummary ?? "").slice(0, 300);
  } catch {
    insightSummary = analytics.keyInsight;
  }

  return {
    updatedBehaviorPatterns: allPatterns,
    updatedMistakeCounts: newCounts,
    confidenceBand,
    recentTrend,
    insightSummary,
  };
}
