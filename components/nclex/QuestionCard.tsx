"use client";

import { motion } from "framer-motion";
import Badge from "@/components/ui/Badge";
import AudioPlayer from "@/components/audio/AudioPlayer";
import BilingualToggle from "@/components/nclex/BilingualToggle";
import { useBilingualMode, shouldShowEn, shouldShowZh } from "@/components/nclex/useBilingualMode";
import type { Question } from "@/types";

const TOEIC_LISTENING_PARTS = new Set(["Part 1", "Part 2", "Part 3", "Part 4"]);

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
  const [mode, setMode] = useBilingualMode();
  const showEn = shouldShowEn(mode);
  const showZh = shouldShowZh(mode);
  const hasZh = Boolean(question.stemZh);

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
          {hasZh && <BilingualToggle mode={mode} onChange={setMode} />}
        </div>
      </div>

      {/* Audio player — TOEIC listening parts (1-4) or any question with audio */}
      {question.hasAudio && (
        <div className="mb-4">
          <AudioPlayer
            questionId={question.id}
            label={
              question.module === "TOEIC" && question.domain
                ? `${question.domain} · 聽力`
                : "聽力音檔"
            }
          />
        </div>
      )}

      {/* Stem — for TOEIC listening parts the stem text is hidden until answered (it's the script).
          For everything else it's the question text, respecting bilingual mode. */}
      {(() => {
        const isToeicListening =
          question.module === "TOEIC"
          && question.domain
          && TOEIC_LISTENING_PARTS.has(question.domain);
        if (isToeicListening) {
          return (
            <p
              className="text-[var(--text-secondary)] italic font-sora"
              style={{ fontSize: "calc(0.9rem * var(--font-scale))" }}
            >
              請聽音檔後選擇最適合的答案。
            </p>
          );
        }
        // For non-listening: show EN stem if mode allows; otherwise only Chinese.
        // If user picked "zh" but no stemZh exists, fall back to EN so we never
        // leave the question empty.
        const enabledEn = showEn || !hasZh;
        return (
          <>
            {enabledEn && (
              <p
                className="text-[var(--text-primary)] leading-relaxed font-sora"
                style={{ fontSize: "calc(1rem * var(--font-scale))" }}
              >
                {question.stem}
              </p>
            )}
            {showZh && question.stemZh && (
              <p
                className={`text-[var(--text-secondary)] leading-relaxed font-noto-sans ${enabledEn ? "mt-3 border-t border-[var(--border-subtle)] pt-3" : ""}`}
                style={{ fontSize: "calc(0.95rem * var(--font-scale))" }}
              >
                {question.stemZh}
              </p>
            )}
          </>
        );
      })()}

      {/* Scenario (clinical case background) if present, also bilingual-aware */}
      {(question.scenarioEn || question.scenarioZh) && (
        <div className="mt-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-3 space-y-2">
          <div
            className="text-[var(--text-muted)] font-semibold"
            style={{ fontSize: "calc(0.75rem * var(--font-scale))" }}
          >
            臨床情境
          </div>
          {(showEn || !question.scenarioZh) && question.scenarioEn && (
            <p
              className="text-[var(--text-primary)] leading-relaxed font-sora"
              style={{ fontSize: "calc(0.9rem * var(--font-scale))" }}
            >
              {question.scenarioEn}
            </p>
          )}
          {showZh && question.scenarioZh && (
            <p
              className="text-[var(--text-secondary)] leading-relaxed font-noto-sans"
              style={{ fontSize: "calc(0.85rem * var(--font-scale))" }}
            >
              {question.scenarioZh}
            </p>
          )}
        </div>
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
