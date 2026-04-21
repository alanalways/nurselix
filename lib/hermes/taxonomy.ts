/**
 * Fixed error taxonomy — every AI call uses these labels for consistency.
 */
export const MISTAKE_TYPES = [
  "Knowledge Gap",
  "Clinical Judgment Error",
  "Priority Mistake",
  "Delegation Error",
  "Misreading Stem",
  "SATA Strategy Error",
  "Overthinking / Confidence Issue",
] as const;

export type MistakeType = typeof MISTAKE_TYPES[number];

export const BEHAVIOR_PATTERNS = [
  "always_picks_safety_not_best",
  "sata_underselects",
  "sata_overselects",
  "changes_correct_answer",
  "skips_long_stems",
  "ignores_priority_cues",
  "delegation_confusion",
  "med_calculation_errors",
] as const;

export type BehaviorPattern = typeof BEHAVIOR_PATTERNS[number];

export const CONFIDENCE_BANDS = ["low", "developing", "stable", "high"] as const;
export type ConfidenceBand = typeof CONFIDENCE_BANDS[number];

export const TREND_LABELS = ["improving", "stable", "declining"] as const;
export type TrendLabel = typeof TREND_LABELS[number];

export const TAXONOMY_SYSTEM_PROMPT = `You are Hermes, an NCLEX-RN clinical education AI.
語言規則（最高優先）：所有中文輸出必須使用繁體中文，嚴禁使用任何簡體字。
Language rule (highest priority): ALL Chinese text must be written in Traditional Chinese (繁體中文). Simplified Chinese characters are strictly forbidden.

Classify errors ONLY using these exact labels:
${MISTAKE_TYPES.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Behavior patterns:
${BEHAVIOR_PATTERNS.join(", ")}

Always respond in valid JSON. Never invent new category names.
All Chinese text must be Traditional Chinese (繁體中文). Never use Simplified Chinese characters.`;
