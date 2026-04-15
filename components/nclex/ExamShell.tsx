"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, ChevronRight, Bookmark, SkipForward } from "lucide-react";
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

// Mock question for Phase 1 UI demo
const MOCK_QUESTION: Question = {
  id: "mock-1",
  module: "NCLEX",
  questionType: "MCQ",
  stem: "A 68-year-old client with heart failure is receiving furosemide (Lasix) 40 mg IV. Which assessment finding would require the nurse to notify the healthcare provider immediately?",
  optionA: "Urine output of 200 mL in the past 2 hours",
  optionB: "Serum potassium level of 3.1 mEq/L",
  optionC: "Blood pressure of 118/72 mmHg",
  optionD: "Weight loss of 0.5 kg since yesterday",
  correctAnswer: "B",
  explanationZh: "呋塞米（Lasix）是強效的迴路利尿劑，會導致鉀離子從尿液中大量排出，造成低血鉀（hypokalemia）。正常血鉀濃度為 3.5-5.0 mEq/L，此病人的血鉀為 3.1 mEq/L，已低於正常值，這是需要立即通知醫師的緊急情況。低血鉀可能引起嚴重的心律不整（如心室顫動），對心衰竭病人尤為危險。選項 A 的尿量正常（利尿劑應增加尿量）。選項 C 的血壓正常。選項 D 的體重下降輕微且符合預期。",
  usTwDifference: "美國臨床標準：血鉀 < 3.5 mEq/L 即需通報並考慮補鉀。台灣臨床：部分醫院設定的通報值可能略低（如 < 3.0 mEq/L），但 NCLEX 考試以美國標準為準。",
  domain: "Pharmacological",
  subDomain: "Loop Diuretics",
  tags: ["furosemide", "hypokalemia", "heart failure", "electrolytes"],
  irtA: 1.2,
  irtB: 0.5,
  irtC: 0.15,
  difficulty: "MEDIUM",
  attemptCount: 1523,
  correctCount: 891,
  errorRate: 0.415,
  status: "APPROVED",
  createdAt: new Date().toISOString(),
};

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

  const question = MOCK_QUESTION;
  const theta = 0.82;
  const se = 0.38;

  const options = [
    { label: "A", text: question.optionA, key: "A" },
    { label: "B", text: question.optionB, key: "B" },
    { label: "C", text: question.optionC, key: "C" },
    { label: "D", text: question.optionD, key: "D" },
  ];

  const getOptionState = (key: string) => {
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
          {/* Question */}
          <QuestionCard question={question} questionNumber={questionIndex + 1} totalQuestions={totalQuestions} />

          {/* Options */}
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
