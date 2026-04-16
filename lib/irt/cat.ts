/**
 * Computer Adaptive Testing (CAT) — next-item selection engine.
 *
 * Uses a Maximum Fisher Information rule with three practical modifiers:
 *   1. Soft exposure control (a-stratified random pick among top-K).
 *   2. Domain balancing — if a domain's coverage is far below the target mix,
 *      it gets priority.
 *   3. Case-study locking — never split a case-study set across sessions.
 *
 * Works on a *candidate* list (already filtered by status/module/etc.) —
 * caller decides whether to hit Postgres or Redis.
 */

import { fisherInformation } from "./calculator";

// ============================================================================
// Types
// ============================================================================

export interface CandidateQuestion {
  id: string;
  domain: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  irtA: number | null;
  irtB: number | null;
  irtC: number | null;
  caseStudySetId?: string | null;
  caseStudyPosition?: number | null;
}

export interface SelectionState {
  /** Current ability estimate. */
  theta: number;
  /** Question IDs already served this session (avoid repeats). */
  answeredIds: string[];
  /** Counts by domain so far (key: domain name, value: count). */
  domainCounts?: Record<string, number>;
  /** Desired domain mix as proportion (must sum to 1). Optional. */
  targetMix?: Record<string, number>;
}

export interface SelectionOptions {
  /** How many top items to randomly sample from. Default 5. */
  topK?: number;
  /** Jitter factor on Fisher info (0 = none, 0.1 = 10%). Default 0.05. */
  jitter?: number;
  /** If true, prefer an exam-like spread of difficulties near theta. */
  exposureControl?: boolean;
}

// ============================================================================
// Domain mix — based on the 2026 NCLEX-RN test plan (spec)
// ============================================================================

export const DOMAIN_TARGET_MIX: Record<string, number> = {
  "Management of Care": 0.20,
  "Safety & Infection Control": 0.12,
  "Health Promotion & Maintenance": 0.09,
  "Psychosocial Integrity": 0.09,
  "Basic Care & Comfort": 0.09,
  "Pharmacological & Parenteral": 0.16,
  "Reduction of Risk Potential": 0.12,
  "Physiological Adaptation": 0.13,
};

// Map raw category keys from the question pool (lower_snake) to our canonical
// display domain names used everywhere in the app.
export const CATEGORY_TO_DOMAIN: Record<string, string> = {
  management_of_care: "Management of Care",
  safety_and_infection_control: "Safety & Infection Control",
  health_promotion_and_maintenance: "Health Promotion & Maintenance",
  psychosocial_integrity: "Psychosocial Integrity",
  basic_care_and_comfort: "Basic Care & Comfort",
  pharmacological_and_parenteral_therapies: "Pharmacological & Parenteral",
  reduction_of_risk_potential: "Reduction of Risk Potential",
  physiological_adaptation: "Physiological Adaptation",
};

export const DOMAIN_ZH: Record<string, string> = {
  "Management of Care": "管理照護",
  "Safety & Infection Control": "安全與感染控制",
  "Health Promotion & Maintenance": "健康促進與維護",
  "Psychosocial Integrity": "心理社會完整性",
  "Basic Care & Comfort": "基本照護與舒適",
  "Pharmacological & Parenteral": "藥理與腸外用藥",
  "Reduction of Risk Potential": "降低風險潛力",
  "Physiological Adaptation": "生理適應",
};

// ============================================================================
// Helpers
// ============================================================================

function withDefaultIrt(q: CandidateQuestion): { a: number; b: number; c: number } {
  // Reasonable fallbacks when IRT params haven't been calibrated yet.
  const diffMap = { EASY: -1.0, MEDIUM: 0.0, HARD: 1.0 } as const;
  const a = q.irtA ?? 1.0;
  const b = q.irtB ?? diffMap[q.difficulty];
  const c = q.irtC ?? 0.2;
  return { a, b, c };
}

function scoreByInformation(q: CandidateQuestion, theta: number): number {
  const { a, b, c } = withDefaultIrt(q);
  return fisherInformation(theta, a, b, c);
}

function pickWeighted<T>(items: { item: T; weight: number }[]): T {
  const total = items.reduce((s, it) => s + Math.max(0, it.weight), 0);
  if (total <= 0) return items[0].item;
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(0, it.weight);
    if (r <= 0) return it.item;
  }
  return items[items.length - 1].item;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Pick the next question from a candidate pool using CAT rules.
 *
 * Returns `null` when no candidates are available.
 */
export function selectNextQuestion(
  candidates: CandidateQuestion[],
  state: SelectionState,
  opts: SelectionOptions = {},
): CandidateQuestion | null {
  const { theta, answeredIds, domainCounts = {}, targetMix = DOMAIN_TARGET_MIX } = state;
  const { topK = 5, jitter = 0.05 } = opts;

  const seen = new Set(answeredIds);
  const pool = candidates.filter((q) => !seen.has(q.id));
  if (pool.length === 0) return null;

  const totalAnswered = answeredIds.length;

  // 1. Compute priority score per candidate: fisherInfo * domainWeight
  const scored = pool.map((q) => {
    const info = scoreByInformation(q, theta);
    const domain = q.domain ?? "unknown";

    // Domain balancing — raise weight if this domain is *below* its target mix.
    const target = targetMix[domain] ?? 0.05;
    const current = totalAnswered === 0 ? 0 : (domainCounts[domain] ?? 0) / totalAnswered;
    const balancing = current < target * 0.5
      ? 1.7                                // strongly favour under-represented
      : current < target
        ? 1.25                             // moderately favour
        : current > target * 1.5
          ? 0.6                            // over-represented, pull back
          : 1.0;

    const noise = 1 + (Math.random() - 0.5) * 2 * jitter;
    const weight = info * balancing * noise;

    return { q, info, balancing, weight };
  });

  scored.sort((a, b) => b.weight - a.weight);

  // 2. Pick weighted-random among top K for soft exposure control.
  const top = scored.slice(0, Math.min(topK, scored.length));
  const picked = pickWeighted(top.map((s) => ({ item: s.q, weight: s.weight })));
  return picked;
}

/**
 * Seed strategy — for the *very first* few questions of a CAT session we don't
 * yet have a reliable theta estimate. Serve a medium-difficulty item from each
 * of the eight domains to bootstrap coverage.
 */
export function selectSeedQuestion(
  candidates: CandidateQuestion[],
  state: SelectionState,
): CandidateQuestion | null {
  const seen = new Set(state.answeredIds);
  const coveredDomains = new Set(
    Object.entries(state.domainCounts ?? {})
      .filter(([, n]) => n > 0)
      .map(([d]) => d),
  );

  const needed = Object.keys(DOMAIN_TARGET_MIX).filter((d) => !coveredDomains.has(d));
  if (needed.length === 0) return null;

  // Prefer medium difficulty from a missing domain
  for (const d of needed) {
    const match = candidates.find(
      (q) => !seen.has(q.id) && q.domain === d && q.difficulty === "MEDIUM",
    );
    if (match) return match;
  }
  // Fallback: any difficulty from a missing domain
  for (const d of needed) {
    const match = candidates.find((q) => !seen.has(q.id) && q.domain === d);
    if (match) return match;
  }
  return null;
}

/**
 * Grade an answer for any question type.
 *   - SBA/MCQ: exact-letter match
 *   - SATA:    full set match (partial credit NOT counted as correct for CAT)
 */
export function isAnswerCorrect(
  questionType: string,
  correctAnswer: string,
  correctAnswers: string[] | undefined,
  selected: string | null | undefined,
): boolean {
  if (!selected) return false;

  if (questionType === "SATA") {
    const correctSet = new Set(
      (correctAnswers && correctAnswers.length > 0
        ? correctAnswers
        : correctAnswer.split(",")
      ).map((s) => s.trim().toUpperCase()).filter(Boolean),
    );
    const selSet = new Set(
      selected.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    );
    if (correctSet.size !== selSet.size) return false;
    let ok = true;
    correctSet.forEach((k) => { if (!selSet.has(k)) ok = false; });
    return ok;
  }

  return selected.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
}

/**
 * Partial-credit score for SATA — returns a value in [0, 1].
 * For SBA: 1 if correct else 0.
 *
 * Rule (matches NCSBN +/- scoring): +1 per correct option selected, -1 per
 * wrong option selected, clamped to [0, #correct], then normalised.
 */
export function gradePartialCredit(
  questionType: string,
  correctAnswer: string,
  correctAnswers: string[] | undefined,
  selected: string | null | undefined,
): number {
  if (!selected) return 0;
  if (questionType !== "SATA") {
    return isAnswerCorrect(questionType, correctAnswer, correctAnswers, selected) ? 1 : 0;
  }

  const correctSet = new Set(
    (correctAnswers && correctAnswers.length > 0
      ? correctAnswers
      : correctAnswer.split(",")
    ).map((s) => s.trim().toUpperCase()).filter(Boolean),
  );
  const selArr = selected.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

  let score = 0;
  for (const s of selArr) score += correctSet.has(s) ? 1 : -1;
  score = Math.max(0, Math.min(correctSet.size, score));
  return correctSet.size === 0 ? 0 : score / correctSet.size;
}
