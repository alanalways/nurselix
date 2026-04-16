"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, ChevronRight, Bookmark, SkipForward, BookOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import ProgressBar from "./ProgressBar";
import ElapsedTimer from "./ElapsedTimer";
import CountdownTimer from "./CountdownTimer";
import ThetaMeter from "./ThetaMeter";
import QuestionCard from "./QuestionCard";
import OptionButton from "./OptionButton";
import ExplanationPanel from "./ExplanationPanel";
import ReportButton from "./ReportButton";
import QuestionNote from "./QuestionNote";
import Modal from "@/components/ui/Modal";
import type { Question, SessionMode } from "@/types";

interface ExamShellProps {
  mode: SessionMode;
  title: string;
  totalQuestions?: number;
  showCountdown?: boolean;
  countdownSec?: number;
  showTheta?: boolean;
  showExplanationAfterAnswer?: boolean; // Practice / Tutor
  isDemo?: boolean;
}

export default function ExamShell({
  mode,
  title,
  totalQuestions,
  showCountdown,
  countdownSec = 18000,
  showTheta = false,
  showExplanationAfterAnswer = false,
  isDemo = true,
}: ExamShellProps) {
  const router = useRouter();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [questionIndex] = useState(0);

  const question: Question | null = null; // Will be loaded from API when question bank is seeded
  const theta = 0;
  const se = 0;

  const options = question ? [
    { label: "A", text: question.optionA, key: "A" },
    { label: "B", text: question.optionB, key: "B" },
    { label: "C", text: question.optionC, key: "C" },
    { label: "D", text: question.optionD, key: "D" },
  ] : [];

  const getOptionState = (key: string) => {
    if (!question) return "default";
    if (!confirmed) return selectedAnswer === key ? "selected" : "default";
    if (key === question.correctAnswer) return "correct";
    if (key === selectedAnswer && key !== question.correctAnswer) return "incorrect";
    return "default";
  };

  const handleConfirm = () => {
    if (!selectedAnswer) return;
    setConfirmed(true);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setConfirmed(false);
    // In real impl: fetch next question
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)] overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPauseModal(true)}
            className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Pause size={14} />
            <span className="hidden sm:block">暫停</span>
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        </div>

        {/* Center: timers */}
        <div className="flex items-center gap-4">
          <ElapsedTimer />
          {showCountdown && <CountdownTimer totalSec={countdownSec} />}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {showTheta && <ThetaMeter theta={theta} se={se} />}
          {totalQuestions && (
            <span className="text-sm font-mono text-[var(--text-muted)]">
              {questionIndex + 1}{totalQuestions ? `/${totalQuestions}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {totalQuestions && (
        <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
          <ProgressBar current={questionIndex + 1} total={totalQuestions} showLabel={false} />
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {/* No question available */}
          {!question && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--gold-dim)] flex items-center justify-center">
                <BookOpen size={32} className="text-[var(--gold)]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">題庫準備中</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">題目將在題庫匯入後正式開放</p>
              </div>
              <button
                onClick={() => router.back()}
                className="mt-2 text-sm text-[var(--gold)] hover:underline"
              >
                返回上一頁
              </button>
            </div>
          )}
          {/* Question */}
          {question && <QuestionCard question={question} questionNumber={questionIndex + 1} totalQuestions={totalQuestions} />}

          {/* Options */}
          {question && (
            <>
              <div className="space-y-3">
                {options.map((opt) => (
                  <OptionButton
                    key={opt.key}
                    label={opt.label}
                    text={opt.text}
                    state={getOptionState(opt.key)}
                    disabled={confirmed}
                    onClick={() => !confirmed && setSelectedAnswer(opt.key)}
                  />
                ))}
              </div>

              {/* Explanation (Practice / Tutor only) */}
              {showExplanationAfterAnswer && confirmed && (
                <ExplanationPanel question={question} selectedAnswer={selectedAnswer!} />
              )}

              {/* Action row */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4">
                  <ReportButton questionId={question.id} />
                  <QuestionNote questionId={question.id} />
                  <button className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                    <Bookmark size={12} />
                    收藏
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {!confirmed ? (
                    <Button
                      onClick={handleConfirm}
                      disabled={!selectedAnswer}
                      variant="gold"
                      size="md"
                    >
                      確認作答
                    </Button>
                  ) : (
                    <Button onClick={handleNext} variant="gold" size="md">
                      下一題 <ChevronRight size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pause Modal */}
      <Modal open={showPauseModal} onClose={() => setShowPauseModal(false)} title="考試已暫停">
        <div className="space-y-4 text-center">
          <p className="text-[var(--text-secondary)]">你的進度已自動儲存，可以隨時繼續。</p>
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={() => setShowPauseModal(false)}>繼續考試</Button>
            <Button fullWidth variant="ghost" onClick={() => router.push("/nclex")}>離開（進度保留）</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
