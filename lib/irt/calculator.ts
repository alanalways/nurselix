/**
 * IRT 3-Parameter Model
 * Phase 3 will connect this to the actual CAT engine.
 * Phase 1: stub implementation for UI.
 */

export function irtProbability(theta: number, a: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

export function fisherInformation(theta: number, a: number, b: number, c: number): number {
  const p = irtProbability(theta, a, b, c);
  const q = 1 - p;
  return (a ** 2) * ((p - c) ** 2) / ((1 - c) ** 2) * (q / p);
}

export function estimateTheta(
  answers: { a: number; b: number; c: number; isCorrect: boolean }[]
): { theta: number; se: number } {
  if (answers.length === 0) return { theta: 0, se: 1 };

  const grid = Array.from({ length: 81 }, (_, i) => -4 + i * 0.1);
  let posterior = grid.map((t) => Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI));

  for (const ans of answers) {
    posterior = posterior.map((prior, i) => {
      const p = irtProbability(grid[i], ans.a, ans.b, ans.c);
      return prior * (ans.isCorrect ? p : 1 - p);
    });
    const sum = posterior.reduce((a, b) => a + b, 0);
    posterior = posterior.map((p) => p / sum);
  }

  const theta = grid.reduce((sum, t, i) => sum + t * posterior[i], 0);
  const variance = grid.reduce((sum, t, i) => sum + (t - theta) ** 2 * posterior[i], 0);
  return { theta, se: Math.sqrt(variance) };
}

export function thetaToLabel(theta: number) {
  if (theta > 1.5) return { label: "優秀", labelEn: "Excellent", color: "#4A90D9" };
  if (theta > 0.5) return { label: "良好", labelEn: "Good", color: "#2ECC71" };
  if (theta > -0.5) return { label: "及格邊緣", labelEn: "Borderline", color: "#F39C12" };
  return { label: "需要加強", labelEn: "Needs Work", color: "#E74C3C" };
}

export function shouldStop(params: {
  theta: number;
  se: number;
  answeredCount: number;
  timeElapsedSec: number;
  mode: "cat" | "assessment" | "mini_cat";
}): { stop: boolean; reason: string } {
  const { theta, se, answeredCount, timeElapsedSec, mode } = params;

  if (mode === "cat") {
    const PASSING = 0.0;
    const upper = theta + 1.96 * se;
    const lower = theta - 1.96 * se;
    const confident = (lower > PASSING || upper < PASSING) && answeredCount >= 85;
    if (confident) return { stop: true, reason: "95_confidence" };
    if (answeredCount >= 150) return { stop: true, reason: "max_questions" };
    if (timeElapsedSec >= 18000 && answeredCount >= 85) return { stop: true, reason: "time_limit" };
  }

  if (mode === "assessment") {
    if (se < 0.4 && answeredCount >= 8) return { stop: true, reason: "se_reached" };
    if (answeredCount >= 25) return { stop: true, reason: "max_questions" };
    if (timeElapsedSec >= 600) return { stop: true, reason: "time_limit" };
  }

  if (mode === "mini_cat") {
    if (se < 0.45 && answeredCount >= 8) return { stop: true, reason: "se_reached" };
    if (answeredCount >= 15) return { stop: true, reason: "max_questions" };
  }

  return { stop: false, reason: "" };
}
