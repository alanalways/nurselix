"use client";

import { motion } from "framer-motion";
import { BookOpen, Globe } from "lucide-react";
import type { Question } from "@/types";

interface ExplanationPanelProps {
  question: Question;
  selectedAnswer: string;
}

export default function ExplanationPanel({ question, selectedAnswer }: ExplanationPanelProps) {
  const isCorrect = selectedAnswer === question.correctAnswer;

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
            正確答案：<span className="font-semibold text-[var(--text-primary)]">{question.correctAnswer}</span>
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
