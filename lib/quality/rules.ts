/**
 * Question quality rule engine.
 *
 * Pure rule-based, no API calls. Runs against the in-memory question shape
 * (subset of Prisma Question). Returns a list of detected issues.
 *
 * Severity scale:
 *   CRITICAL  : answer/explanation contradicts each other; teaches wrong content
 *   HIGH      : noise pollution unreadable, severe content corruption
 *   MEDIUM    : style / NCLEX-format violations
 *   LOW       : minor (short explanation, mild option imbalance)
 */
import crypto from "node:crypto";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface QuestionShape {
  id: string;
  module?: string | null;
  questionType?: string | null;
  difficulty?: string | null;
  status?: string | null;
  stem: string;
  stemZh?: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string | null;
  optionF?: string | null;
  correctAnswer: string;
  correctAnswers?: string[] | null;
  explanationZh?: string | null;
  explanationEn?: string | null;
  optionRationales?: any;
  attemptCount?: number | null;
  correctCount?: number | null;
  errorRate?: number | null;
}

export interface QualityIssue {
  ruleId: string;
  severity: Severity;
  detail: string;
  meta?: Record<string, any>;
}

const ADVERBS = [
  "gracefully","smartly","securely","perfectly","actively","smoothly",
  "expertly","forcefully","dynamically","cleanly","tightly","exactly",
  "completely","strictly","correctly","reliably","boldly","vigorously",
  "intelligently","flawlessly","beautifully","seamlessly","faithfully",
];

function countOccurrences(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.reduce((sum, w) => sum + ((lower.match(new RegExp(`\\b${w}\\b`, "g")) || []).length), 0);
}

function getOptions(q: QuestionShape): { letter: string; text: string }[] {
  return [
    { letter: "A", text: q.optionA },
    { letter: "B", text: q.optionB },
    { letter: "C", text: q.optionC },
    { letter: "D", text: q.optionD },
    ...(q.optionE ? [{ letter: "E", text: q.optionE }] : []),
    ...(q.optionF ? [{ letter: "F", text: q.optionF }] : []),
  ];
}

function getCorrectLetters(q: QuestionShape): string[] {
  if (Array.isArray(q.correctAnswers) && q.correctAnswers.length) return q.correctAnswers;
  return q.correctAnswer.split(",").map(s => s.trim()).filter(Boolean);
}

// ---------- Individual rule checks ----------

export interface Rule {
  id: string;
  description: string;
  severity: Severity;
  check: (q: QuestionShape) => QualityIssue | null;
}

export const RULES: Rule[] = [
  {
    id: "adverb_pollution",
    description: "Stem + options contain ≥3 noise adverbs (LLM-generated garbage)",
    severity: "HIGH",
    check: (q) => {
      const combined = [q.stem, q.optionA, q.optionB, q.optionC, q.optionD, q.optionE, q.optionF]
        .filter(Boolean).join(" ");
      const hits = countOccurrences(combined, ADVERBS);
      if (hits >= 40) return { ruleId: "adverb_pollution", severity: "CRITICAL", detail: `Severe noise: ${hits} adverbs`, meta: { hits } };
      if (hits >= 8) return { ruleId: "adverb_pollution", severity: "HIGH", detail: `Heavy noise: ${hits} adverbs`, meta: { hits } };
      if (hits >= 3) return { ruleId: "adverb_pollution", severity: "MEDIUM", detail: `Mild noise: ${hits} adverbs`, meta: { hits } };
      return null;
    },
  },
  {
    id: "irrelevant_noise_rationale",
    description: "Option rationale contains literal 'Irrelevant noise' / '無關雜訊' marker",
    severity: "CRITICAL",
    check: (q) => {
      const r = q.optionRationales ? JSON.stringify(q.optionRationales) : "";
      if (r.includes("Irrelevant noise") || r.includes("無關雜訊")) {
        return { ruleId: "irrelevant_noise_rationale", severity: "CRITICAL", detail: "Rationale contains 'Irrelevant noise' marker — placeholder content" };
      }
      return null;
    },
  },
  {
    id: "answer_rationale_contradiction",
    description: "Correct option's rationale starts with '錯誤' (says it's wrong) — skipped for 'find the wrong action' stems",
    severity: "CRITICAL",
    check: (q) => {
      if (!q.optionRationales || typeof q.optionRationales !== "object") return null;
      // Skip "find the wrong action" type stems where the correct answer IS the wrong action
      const stemAll = `${q.stem || ""} ${q.stemZh || ""}`;
      const isNegativeStem =
        /requires? (further |additional |immediate )?(teaching|instruction|education|clarification|correction|intervention)/i.test(stemAll)
        || /indicates? (a )?need for (further |additional )?(teaching|instruction|education|clarification|correction)/i.test(stemAll)
        || /is (NOT |inappropriate|incorrect|contraindicated|wrong)/i.test(stemAll)
        || /which action breaks/i.test(stemAll)
        || /which observation indicates the (client |patient )?needs/i.test(stemAll)
        || /needs further/i.test(stemAll)
        || /which.+inappropriate/i.test(stemAll)
        || /needs? clarification/i.test(stemAll)
        || /需要進一步(指導|教學|衛教|教育|澄清)/.test(stemAll)
        || /何者(不|錯誤|不適當|不正確)/.test(stemAll);
      if (isNegativeStem) return null;

      const correct = getCorrectLetters(q);
      const offenders: string[] = [];
      for (const letter of correct) {
        const r = (q.optionRationales as any)?.[letter];
        const zh: string = r?.zh || "";
        // Only flag if rationale literally starts with 錯誤 + delimiter (not just contains "Incorrect" as adjective)
        if (/^錯誤[，,。 ]/.test(zh) || zh.startsWith("錯。")) {
          offenders.push(letter);
        }
      }
      if (offenders.length) {
        return { ruleId: "answer_rationale_contradiction", severity: "CRITICAL",
          detail: `Correct option(s) ${offenders.join(",")} have rationale starting with '錯誤'`,
          meta: { offenders } };
      }
      return null;
    },
  },
  {
    id: "wrong_option_marked_correct",
    description: "An incorrect option's rationale starts with '正確' (says it's correct)",
    severity: "HIGH",
    check: (q) => {
      if (!q.optionRationales || typeof q.optionRationales !== "object") return null;
      const correct = new Set(getCorrectLetters(q));
      const offenders: string[] = [];
      for (const letter of ["A","B","C","D","E","F"]) {
        if (correct.has(letter)) continue;
        const r = (q.optionRationales as any)?.[letter];
        const zh: string = r?.zh || "";
        if (/^正確[，,。 ]/.test(zh) || zh.startsWith("正確。")) {
          offenders.push(letter);
        }
      }
      if (offenders.length) {
        return { ruleId: "wrong_option_marked_correct", severity: "HIGH",
          detail: `Incorrect option(s) ${offenders.join(",")} have rationale starting with '正確'`,
          meta: { offenders } };
      }
      return null;
    },
  },
  {
    id: "long_stem",
    description: "Stem > 800 chars (NCLEX best practice <500)",
    severity: "MEDIUM",
    check: (q) => {
      const len = (q.stem || "").length;
      if (len > 800) return { ruleId: "long_stem", severity: "MEDIUM", detail: `Stem is ${len} chars`, meta: { len } };
      return null;
    },
  },
  {
    id: "short_stem",
    description: "Stem < 20 chars (likely truncated)",
    severity: "HIGH",
    check: (q) => {
      const len = (q.stem || "").trim().length;
      if (len < 20 && len > 0) return { ruleId: "short_stem", severity: "HIGH", detail: `Stem only ${len} chars`, meta: { len } };
      if (len === 0) return { ruleId: "short_stem", severity: "CRITICAL", detail: "Stem is empty" };
      return null;
    },
  },
  {
    id: "empty_explanation",
    description: "explanationZh is empty or NULL",
    severity: "HIGH",
    check: (q) => {
      const expl = (q.explanationZh || "").trim();
      if (!expl) return { ruleId: "empty_explanation", severity: "HIGH", detail: "explanationZh is empty" };
      return null;
    },
  },
  {
    id: "short_explanation",
    description: "explanationZh < 50 chars",
    severity: "MEDIUM",
    check: (q) => {
      const len = (q.explanationZh || "").trim().length;
      if (len > 0 && len < 50) return { ruleId: "short_explanation", severity: "MEDIUM", detail: `Explanation only ${len} chars`, meta: { len } };
      return null;
    },
  },
  {
    id: "placeholder_text",
    description: "Contains TODO / 待補 / lorem ipsum / placeholder",
    severity: "HIGH",
    check: (q) => {
      const all = [q.stem, q.explanationZh, q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean).join(" ");
      if (/(暫無解析|lorem ipsum|TBD|TODO|待補|placeholder|to be filled)/i.test(all)) {
        return { ruleId: "placeholder_text", severity: "HIGH", detail: "Placeholder text found" };
      }
      return null;
    },
  },
  {
    id: "extreme_option_imbalance",
    description: "Option lengths max/min > 3 with max > 80",
    severity: "MEDIUM",
    check: (q) => {
      const opts = getOptions(q).filter(o => o.text && o.text.trim());
      if (opts.length < 2) return null;
      const lens = opts.map(o => o.text.length);
      const max = Math.max(...lens), min = Math.min(...lens);
      if (min > 0 && max / min > 3 && max > 80) {
        return { ruleId: "extreme_option_imbalance", severity: "MEDIUM",
          detail: `Option lengths: max ${max}, min ${min}, ratio ${(max/min).toFixed(1)}`,
          meta: { max, min, ratio: max/min } };
      }
      return null;
    },
  },
  {
    id: "answer_pointing_null",
    description: "correctAnswer points at empty option",
    severity: "CRITICAL",
    check: (q) => {
      const correct = getCorrectLetters(q);
      const opts = getOptions(q);
      const optMap = Object.fromEntries(opts.map(o => [o.letter, o.text]));
      const offenders = correct.filter(l => !optMap[l] || !optMap[l].trim());
      if (offenders.length) return { ruleId: "answer_pointing_null", severity: "CRITICAL",
        detail: `correctAnswer ${offenders.join(",")} points at empty option`,
        meta: { offenders } };
      return null;
    },
  },
  {
    id: "answer_correctAnswers_mismatch",
    description: "correctAnswer string and correctAnswers array disagree",
    severity: "HIGH",
    check: (q) => {
      const fromString = q.correctAnswer.split(",").map(s => s.trim()).filter(Boolean).sort();
      const fromArray = (q.correctAnswers || []).slice().sort();
      if (fromArray.length === 0) return null; // legacy
      const a = fromString.join(",");
      const b = fromArray.join(",");
      if (a !== b) return { ruleId: "answer_correctAnswers_mismatch", severity: "HIGH",
        detail: `correctAnswer="${a}" vs correctAnswers=[${b}]`,
        meta: { fromString, fromArray } };
      return null;
    },
  },
  {
    id: "sata_single_answer",
    description: "questionType=SATA but only 1 correct answer",
    severity: "MEDIUM",
    check: (q) => {
      if (q.questionType === "SATA") {
        const c = getCorrectLetters(q);
        if (c.length <= 1) return { ruleId: "sata_single_answer", severity: "MEDIUM",
          detail: `SATA but only ${c.length} correct answer(s)`,
          meta: { count: c.length } };
      }
      return null;
    },
  },
  {
    id: "mcq_multi_answer",
    description: "questionType=MCQ but multiple correct answers",
    severity: "HIGH",
    check: (q) => {
      if (q.questionType === "MCQ") {
        const c = getCorrectLetters(q);
        if (c.length > 1) return { ruleId: "mcq_multi_answer", severity: "HIGH",
          detail: `MCQ but ${c.length} correct answers`,
          meta: { count: c.length } };
      }
      return null;
    },
  },
  {
    id: "missing_rationale",
    description: "optionRationales missing for ≥1 option",
    severity: "MEDIUM",
    check: (q) => {
      const r = q.optionRationales;
      if (!r || typeof r !== "object") {
        return { ruleId: "missing_rationale", severity: "MEDIUM", detail: "optionRationales is null/missing" };
      }
      const opts = getOptions(q).filter(o => o.text && o.text.trim());
      const missing = opts.filter(o => {
        const ro = (r as any)?.[o.letter];
        return !ro || (!ro.zh && !ro.en);
      });
      if (missing.length) return { ruleId: "missing_rationale", severity: "MEDIUM",
        detail: `Rationale missing for: ${missing.map(o=>o.letter).join(",")}`,
        meta: { missingLetters: missing.map(o=>o.letter) } };
      return null;
    },
  },
  {
    id: "missing_stemZh",
    description: "stemZh empty/null (NCLEX bilingual requirement)",
    severity: "MEDIUM",
    check: (q) => {
      if (q.module === "NCLEX" && (!q.stemZh || !q.stemZh.trim())) {
        return { ruleId: "missing_stemZh", severity: "MEDIUM", detail: "stemZh missing on NCLEX question" };
      }
      return null;
    },
  },
  {
    id: "duplicate_options",
    description: "Two or more options have identical text (≥95% similar)",
    severity: "HIGH",
    check: (q) => {
      const opts = getOptions(q).filter(o => o.text && o.text.trim().length > 10);
      for (let i = 0; i < opts.length; i++) {
        for (let j = i+1; j < opts.length; j++) {
          if (opts[i].text.trim() === opts[j].text.trim()) {
            return { ruleId: "duplicate_options", severity: "HIGH",
              detail: `Options ${opts[i].letter} and ${opts[j].letter} are identical`,
              meta: { letters: [opts[i].letter, opts[j].letter] } };
          }
        }
      }
      return null;
    },
  },
  {
    id: "high_error_rate",
    description: "Real error rate >70% with ≥10 attempts (suspicious)",
    severity: "HIGH",
    check: (q) => {
      const a = q.attemptCount || 0;
      const c = q.correctCount || 0;
      if (a >= 10) {
        const rate = 1 - c / a;
        if (rate > 0.7) return { ruleId: "high_error_rate", severity: "HIGH",
          detail: `${a} attempts, error rate ${(rate*100).toFixed(0)}%`,
          meta: { attemptCount: a, correctCount: c, rate } };
      }
      return null;
    },
  },
];

// ---------- Engine ----------

export function scanQuestion(q: QuestionShape): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const rule of RULES) {
    try {
      const issue = rule.check(q);
      if (issue) issues.push(issue);
    } catch (e: any) {
      // Rule itself threw — log but don't crash the whole scan
      issues.push({ ruleId: `rule_error:${rule.id}`, severity: "LOW",
        detail: `Rule check threw: ${e.message}` });
    }
  }
  return issues;
}

/** Hash of question content used to dedupe issues across runs. */
export function contentHash(q: QuestionShape): string {
  const payload = JSON.stringify({
    stem: q.stem,
    options: [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE, q.optionF],
    correctAnswer: q.correctAnswer,
    explanationZh: q.explanationZh,
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/** Compute health score 0-100 based on issue counts. */
export function healthScore(opts: {
  total: number;
  open: number;
  bySeverity: Record<Severity, number>;
}): number {
  if (opts.total === 0) return 100;
  // Severity weights
  const weight = (opts.bySeverity.CRITICAL || 0) * 10
               + (opts.bySeverity.HIGH || 0) * 5
               + (opts.bySeverity.MEDIUM || 0) * 2
               + (opts.bySeverity.LOW || 0) * 1;
  // Normalize: assume score drops as weight/total grows
  const score = Math.max(0, Math.round(100 - (weight / opts.total) * 100));
  return Math.min(100, Math.max(0, score));
}
