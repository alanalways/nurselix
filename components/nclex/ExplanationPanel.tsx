"use client";

import { motion } from "framer-motion";
import { BookOpen, Globe, List } from "lucide-react";
import type { Question } from "@/types";

interface ExplanationPanelProps {
  question: Question;
  selectedAnswer: string;
  isCorrect?: boolean; // from API response; if provided, overrides local comparison
}

export default function ExplanationPanel({ question, selectedAnswer, isCorrect: isCorrectProp }: ExplanationPanelProps) {
  // Use API-returned value when available (handles SATA ordering differences).
  // Fallback to local comparison for MCQ only.
  const isCorrect = isCorrectProp !== undefined
    ? isCorrectProp
    : selectedAnswer.trim().toUpperCase() === question.correctAnswer.trim().toUpperCase();

  // Build the display string for correct answer(s)
  const correctAnswers = question.correctAnswers?.length
    ? question.correctAnswers
    : question.correctAnswer.split(",").map((s) => s.trim()).filter(Boolean);
  const correctAnswerDisplay = correctAnswers.join("、");

  // Present option letters that exist on this question
  const optionKeys = (["A", "B", "C", "D", "E", "F"] as const).filter(
    (k) => question[`option${k}` as keyof Question]
  );

  const rationales = question.optionRationales;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Result banner */}
      <div className={`rounded-xl px-5 py-3 flex items-center gap-3 ${
        isCorrect
          ? "bg-[rgba(46,204,113,0.12)] border border-[var(--success)]"
          : "bg-[rgba(231,76,60,0.12)] border border-[var(--error)]"
      }`}>
        <span className="text-xl">{isCorrect ? "✓" : "✗"}</span>
        <div>
          <div className={`font-semibold ${isCorrect ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
            {isCorrect ? "答對了！" : "答錯了"}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            正確答案：<span className="font-semibold text-[var(--text-primary)]">{correctAnswerDisplay}</span>
          </div>
        </div>
      </div>

      {/* Chinese Explanation */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-[var(--gold)]" />
          <h3 className="font-semibold text-[var(--text-primary)] font-noto-serif">中文解析</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-noto-sans">
          {question.explanationZh}
        </p>
      </div>

      {/* Per-option rationales */}
      {rationales && optionKeys.length > 0 && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <List size={16} className="text-[var(--gold)]" />
            <h3 className="font-semibold text-[var(--text-primary)] font-noto-serif">各選項解析</h3>
          </div>
          <div className="space-y-3">
            {optionKeys.map((k) => {
              const r = rationales[k];
              if (!r?.zh && !r?.en) return null;
              const isCorrectOpt = correctAnswers.includes(k);
              return (
                <div key={k} className="flex gap-3">
                  <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCorrectOpt
                      ? "bg-[rgba(46,204,113,0.18)] text-[var(--success)]"
                      : "bg-[var(--bg-base)] text-[var(--text-muted)]"
                  }`}>{k}</span>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-noto-sans">
                    {r.zh ?? r.en}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* US vs TW Difference */}
      {question.usTwDifference && (
        <div className="rounded-xl border border-[var(--gold)] bg-[var(--gold-dim)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={16} className="text-[var(--gold)]" />
            <h3 className="font-semibold text-[var(--gold)]">🇺🇸 vs 🇹🇼 台美臨床差異提示</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-noto-sans mb-3">
            {question.usTwDifference}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--warning)] bg-[rgba(243,156,18,0.10)] rounded-lg px-3 py-2">
            <span>⚠️</span>
            <span className="font-medium">考試請用美國標準思考</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
