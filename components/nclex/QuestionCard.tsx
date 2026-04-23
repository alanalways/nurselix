"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Languages } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Question } from "@/types";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions?: number;
}

const difficultyMap = {
  EASY: { label: "Easy", variant: "success" as const },
  MEDIUM: { label: "Medium", variant: "gold" as const },
  HARD: { label: "Hard", variant: "error" as const },
};

export default function QuestionCard({ question, questionNumber, totalQuestions }: QuestionCardProps) {
  const diff = difficultyMap[question.difficulty];
  const [showZh, setShowZh] = useState(false);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-5 md:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[var(--text-muted)]"
            style={{ fontSize: "calc(0.75rem * var(--font-scale))" }}
          >
            第 {questionNumber}{totalQuestions ? ` / ${totalQuestions}` : ""} 題
          </span>
          {question.domain && (
            <Badge variant="muted">{question.domain}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={diff.variant}>{diff.label}</Badge>
          <Badge variant="muted">{question.questionType}</Badge>
          {question.stemZh && (
            <button
              onClick={() => setShowZh((v) => !v)}
              title={showZh ? "顯示英文題幹" : "顯示中文翻譯"}
              className={`p-1 rounded transition-colors ${showZh ? "text-[var(--gold)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
            >
              <Languages size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Stem — font scales with --font-scale */}
      <p
        className="text-[var(--text-primary)] leading-relaxed font-sora"
        style={{ fontSize: "calc(1rem * var(--font-scale))" }}
      >
        {question.stem}
      </p>

      {/* Chinese stem (toggled) */}
      {showZh && question.stemZh && (
        <p
          className="mt-3 text-[var(--text-secondary)] leading-relaxed font-noto-sans border-t border-[var(--border-subtle)] pt-3"
          style={{ fontSize: "calc(0.9rem * var(--font-scale))" }}
        >
          {question.stemZh}
        </p>
      )}

      {/* Tags */}
      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {question.tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              style={{ fontSize: "calc(0.75rem * var(--font-scale))" }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
