export function updateSM2(
  current: { repetition: number; easiness: number; interval: number },
  quality: number
): { repetition: number; easiness: number; interval: number; nextReview: Date } {
  let { repetition, easiness, interval } = current;

  if (quality >= 3) {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * easiness);
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }

  easiness = Math.max(
    1.3,
    easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { repetition, easiness, interval, nextReview };
}
