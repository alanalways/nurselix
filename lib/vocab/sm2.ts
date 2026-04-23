/**
 * SM-2 spaced-repetition for vocabulary.
 *
 * Quality mapping (Anki-style):
 *   again → 0  (complete failure — reset)
 *   hard  → 3  (recalled with difficulty)
 *   good  → 4  (recalled correctly)
 *   easy  → 5  (trivial)
 */

export type VocabResult = "again" | "hard" | "good" | "easy";

export interface Sm2State {
  repetition: number;
  easiness: number;
  interval: number;      // days
  nextReview: Date;
  lastResult: VocabResult;
}

const QUALITY: Record<VocabResult, number> = {
  again: 0,
  hard:  3,
  good:  4,
  easy:  5,
};

export function nextSm2(
  prev: { repetition: number; easiness: number; interval: number },
  result: VocabResult,
  now: Date = new Date(),
): Sm2State {
  const q = QUALITY[result];
  let { repetition, easiness, interval } = prev;

  if (q < 3) {
    repetition = 0;
    interval = 1;
  } else {
    repetition += 1;
    if (repetition === 1) interval = 1;
    else if (repetition === 2) interval = 3;
    // Cap at 365 days so the next review never schedules more than a year out.
    else interval = Math.min(365, Math.round(interval * easiness));
  }

  // Update easiness factor (clamped to 1.3 min)
  easiness = Math.max(
    1.3,
    easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return { repetition, easiness, interval, nextReview, lastResult: result };
}

/** Mastery heuristic: user has answered correctly ≥4 times in a row + interval ≥21d */
export function isMastered(state: { repetition: number; interval: number }): boolean {
  return state.repetition >= 4 && state.interval >= 21;
}
