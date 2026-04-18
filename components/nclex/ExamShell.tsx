"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, ChevronRight, BookOpen, Loader2, AlertCircle, Lock, Eye, EyeOff, Coffee } from "lucide-react";
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
import BookmarkButton from "./BookmarkButton";
import Modal from "@/components/ui/Modal";
import type { QuestionPayload, SessionMode } from "@/types";

interface AnswerResponse {
  accepted: boolean;
  isCorrect: boolean;
  score: number;
  correctAnswer: string;
  correctAnswers: string[];
  explanationZh: string;
  explanationEn: string | null;
  usTwDifference: string | null;
  optionRationales: Record<string, { en?: string; zh?: string }> | null;
  progress: { answered: number; correct: number; theta: number; se: number };
  dailyUsed?: number;
  dailyLimit?: number;
}

interface ExamShellProps {
  sessionId: string;
  /** Retained for API parity / future per-mode tweaks. */
  mode?: SessionMode;
  title: string;
  targetCount?: number | null;
  showCountdown?: boolean;
  countdownSec?: number;
  showTheta?: boolean;
  /** Practice / Tutor */
  showExplanationAfterAnswer?: boolean;
  onFinished?: (sessionId: string) => void;
}

export default function ExamShell({
  sessionId,
  title,
  targetCount,
  showCountdown,
  countdownSec,
  showTheta = false,
  showExplanationAfterAnswer = false,
  onFinished,
}: ExamShellProps) {
  const router = useRouter();

  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [theta, setTheta] = useState(0);
  const [se, setSe] = useState(1);

  const [selected, setSelected] = useState<string[]>([]); // For SBA: single, SATA: multi
  const [confirmed, setConfirmed] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<AnswerResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timerVisible, setTimerVisible] = useState(true);

  // Consecutive-wrong pacing: after 3 in a row, gently offer a break so users
  // don't spiral. Counter resets on any correct answer or on modal dismiss.
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const pendingAdvanceRef = useRef(false);

  const isSata = question?.questionType === "SATA";
  const questionStartRef = useRef<number>(Date.now());

  // ==========================================================================
  // Data fetching
  // ==========================================================================

  const finishSession = useCallback(async (reason: string) => {
    try {
      await fetch(`/api/nclex/session/${sessionId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    } catch {
      // ignore
    }
    if (onFinished) onFinished(sessionId);
    else router.replace(`/nclex/results/${sessionId}`);
  }, [sessionId, onFinished, router]);

  const loadNextQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nclex/session/${sessionId}/next-question`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = await res.json() as {
        question: QuestionPayload | null;
        finished: boolean;
        stopReason?: string;
        progress: { answered: number; target?: number; theta: number; se: number };
      };

      if (data.finished) {
        if (data.stopReason === "out_of_questions") {
          // Don't redirect — let the "no question" UI handle it
          return;
        }
        setFinished(true);
        await finishSession(data.stopReason ?? "completed");
        return;
      }

      setQuestion(data.question);
      setQuestionIndex(data.progress.answered);
      setTheta(data.progress.theta);
      setSe(data.progress.se);
      setSelected([]);
      setConfirmed(false);
      setLastAnswer(null);
      questionStartRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "網路錯誤");
    } finally {
      setLoading(false);
    }
  }, [sessionId, finishSession]);

  useEffect(() => {
    loadNextQuestion();
  }, [loadNextQuestion]);

  // ==========================================================================
  // Submit answer
  // ==========================================================================

  const submitAnswer = async () => {
    if (!question || selected.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      questionId: question.id,
      selectedAnswer: selected.join(","),
      timeSpentSec: Math.max(0, Math.round((Date.now() - questionStartRef.current) / 1000)),
    };

    try {
      const res = await fetch(`/api/nclex/session/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      const result = data as AnswerResponse;
      setLastAnswer(result);
      setTheta(result.progress.theta);
      setSe(result.progress.se);
      setConfirmed(true);

      const nextWrongStreak = result.isCorrect ? 0 : consecutiveWrong + 1;
      setConsecutiveWrong(nextWrongStreak);
      const shouldPace = nextWrongStreak >= 3;
      if (shouldPace) setShowBreakModal(true);

      // In CAT / Mock / Assessment / Mini-CAT we auto-advance without showing result
      const autoAdvance = !showExplanationAfterAnswer;
      if (autoAdvance) {
        if (shouldPace) {
          pendingAdvanceRef.current = true; // resume after user dismisses modal
        } else {
          setTimeout(() => { loadNextQuestion(); }, 400);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "網路錯誤");
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================================
  // Session lifecycle
  // ==========================================================================

  const pauseAndExit = async () => {
    try {
      await fetch(`/api/nclex/session/${sessionId}/pause`, { method: "POST" });
    } catch {}
    router.replace("/nclex");
  };

  const handleCountdownExpire = async () => {
    setError("考試時間到！");
    await finishSession("time_limit");
  };

  // ==========================================================================
  // UI helpers
  // ==========================================================================

  const options = useMemo(() => {
    if (!question) return [];
    return (
      [
        { label: "A", text: question.optionA, key: "A" },
        { label: "B", text: question.optionB, key: "B" },
        { label: "C", text: question.optionC, key: "C" },
        { label: "D", text: question.optionD, key: "D" },
        question.optionE ? { label: "E", text: question.optionE, key: "E" } : null,
        question.optionF ? { label: "F", text: question.optionF, key: "F" } : null,
      ].filter(Boolean) as { label: string; text: string; key: string }[]
    );
  }, [question]);

  const getOptionState = (key: string): "default" | "selected" | "correct" | "incorrect" | "missed" => {
    if (!question) return "default";
    if (!confirmed) {
      return selected.includes(key) ? "selected" : "default";
    }
    // Confirmed — show reveal (Practice/Tutor only)
    if (!showExplanationAfterAnswer || !lastAnswer) {
      return selected.includes(key) ? "selected" : "default";
    }
    // Normalise correctAnswers: guard against ["A,B,C"] stored as single-element with commas
    const rawCorrect = lastAnswer.correctAnswers.length > 0
      ? (lastAnswer.correctAnswers.length === 1 && lastAnswer.correctAnswers[0].includes(",")
          ? lastAnswer.correctAnswers[0].split(",")
          : lastAnswer.correctAnswers)
      : lastAnswer.correctAnswer.split(",");
    const correctSet = new Set(rawCorrect.map((s) => s.trim().toUpperCase()).filter(Boolean));
    const userSelected = selected.includes(key);
    const isCorrectOption = correctSet.has(key);
    if (userSelected && isCorrectOption) return "correct";   // ✓ selected & right
    if (userSelected && !isCorrectOption) return "incorrect"; // ✗ selected & wrong
    if (!userSelected && isCorrectOption) return "missed";    // ○ skipped correct answer
    return "default";
  };

  const toggleOption = (key: string) => {
    if (confirmed) return;
    if (isSata) {
      setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    } else {
      setSelected([key]);
    }
  };

  const canConfirm = selected.length > 0 && !confirmed && !submitting;

  // For Practice / Tutor synthetic question display (ExplanationPanel expects Question-shaped input)
  const questionForPanel = lastAnswer && question ? {
    id: question.id,
    module: "NCLEX" as const,
    questionType: question.questionType,
    stem: question.stem,
    stemZh: question.stemZh,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    optionE: question.optionE,
    optionF: question.optionF,
    correctAnswer: lastAnswer.correctAnswer,
    correctAnswers: lastAnswer.correctAnswers,
    explanationZh: lastAnswer.explanationZh,
    explanationEn: lastAnswer.explanationEn,
    usTwDifference: lastAnswer.usTwDifference,
    optionRationales: lastAnswer.optionRationales,
    domain: question.domain ?? null,
    subDomain: null,
    tags: question.tags ?? [],
    difficulty: question.difficulty,
    attemptCount: 0,
    correctCount: 0,
    errorRate: 0,
    status: "APPROVED" as const,
    createdAt: new Date().toISOString(),
  } : null;

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      className="flex flex-col h-screen bg-[var(--bg-base)] overflow-hidden notranslate exam-no-translate"
      translate="no"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
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

        <div className="flex items-center gap-3">
          {timerVisible && <ElapsedTimer />}
          {timerVisible && showCountdown && countdownSec && (
            <CountdownTimer totalSec={countdownSec} onExpire={handleCountdownExpire} />
          )}
          <button
            onClick={() => setTimerVisible(v => !v)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title={timerVisible ? "隱藏計時器" : "顯示計時器"}
          >
            {timerVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {showTheta && <ThetaMeter theta={theta} se={se} />}
          <span className="text-sm font-mono text-[var(--text-muted)]">
            {questionIndex + 1}{targetCount ? `/${targetCount}` : ""}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {targetCount && (
        <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
          <ProgressBar current={questionIndex + 1} total={targetCount} showLabel={false} />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-[rgba(231,76,60,0.12)] border-b border-[var(--error)] px-4 py-2 text-sm text-[var(--error)] flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >關閉</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {/* Loading */}
          {loading && !question && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <Loader2 size={32} className="animate-spin text-[var(--gold)]" />
              <p className="text-[var(--text-secondary)]">載入題目中...</p>
            </div>
          )}

          {/* Daily-limit hit */}
          {error && error.includes("今日題數") && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <Lock size={32} className="text-[var(--warning)]" />
              <p className="font-semibold text-[var(--text-primary)]">{error}</p>
              <p className="text-sm text-[var(--text-secondary)]">明日 00:00 將自動重置，或升級方案解除限制。</p>
              <Button onClick={() => router.push("/pricing")}>查看方案</Button>
            </div>
          )}

          {/* Finished */}
          {finished && !error && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <Loader2 size={32} className="animate-spin text-[var(--gold)]" />
              <p className="text-[var(--text-secondary)]">考試完成，正在產生結果...</p>
            </div>
          )}

          {/* No question edge case */}
          {!loading && !question && !finished && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--gold-dim)] flex items-center justify-center">
                <BookOpen size={32} className="text-[var(--gold)]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">題庫目前沒有可用題目</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  請確認題目已匯入且狀態為「已核准」，或嘗試調整 Domain / 難易度篩選條件。
                </p>
              </div>
              <Button onClick={() => router.back()}>返回</Button>
            </div>
          )}

          {/* Main question flow */}
          {question && (
            <AnimatePresence mode="wait">
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <QuestionCard
                  question={{
                    id: question.id,
                    module: "NCLEX",
                    questionType: question.questionType,
                    stem: question.stem,
                    stemZh: question.stemZh,
                    optionA: question.optionA,
                    optionB: question.optionB,
                    optionC: question.optionC,
                    optionD: question.optionD,
                    optionE: question.optionE,
                    optionF: question.optionF,
                    correctAnswer: "",
                    correctAnswers: [],
                    explanationZh: "",
                    domain: question.domain ?? null,
                    subDomain: null,
                    tags: question.tags ?? [],
                    difficulty: question.difficulty,
                    attemptCount: 0,
                    correctCount: 0,
                    errorRate: 0,
                    status: "APPROVED",
                    createdAt: new Date().toISOString(),
                  }}
                  questionNumber={questionIndex + 1}
                  totalQuestions={targetCount ?? undefined}
                />

                {/* SATA helper */}
                {isSata && !confirmed && (
                  <div className="bg-[var(--gold-dim)] border border-[var(--gold)] rounded-lg px-4 py-2 text-sm text-[var(--gold)]">
                    ⚡ 本題為 SATA（Select All That Apply），請選擇所有正確答案，可複選。
                  </div>
                )}
                {/* SATA result breakdown after submit */}
                {isSata && confirmed && lastAnswer && (() => {
                  const rawCorrect = lastAnswer.correctAnswers.length > 0
                    ? (lastAnswer.correctAnswers.length === 1 && lastAnswer.correctAnswers[0].includes(",")
                        ? lastAnswer.correctAnswers[0].split(",")
                        : lastAnswer.correctAnswers)
                    : lastAnswer.correctAnswer.split(",");
                  const correctSet = new Set(rawCorrect.map(s => s.trim().toUpperCase()).filter(Boolean));
                  const selSet = new Set(selected.map(s => s.toUpperCase()));
                  const missed = rawCorrect.map(s => s.trim().toUpperCase()).filter(k => k && !selSet.has(k));
                  const wrong = selected.map(s => s.toUpperCase()).filter(k => !correctSet.has(k));
                  if (missed.length === 0 && wrong.length === 0) return null;
                  return (
                    <div className="rounded-lg border border-[var(--warning)] bg-[rgba(255,180,0,0.07)] px-4 py-3 text-sm space-y-1">
                      {missed.length > 0 && (
                        <div className="text-[var(--warning)]">
                          ⚠ 漏選了正確答案：<strong>{missed.join("、")}</strong>（橘色選項）
                        </div>
                      )}
                      {wrong.length > 0 && (
                        <div className="text-[var(--error)]">
                          ✗ 多選了錯誤答案：<strong>{wrong.join("、")}</strong>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  {options.map((opt) => (
                    <OptionButton
                      key={opt.key}
                      label={opt.label}
                      text={opt.text}
                      state={getOptionState(opt.key)}
                      disabled={confirmed}
                      onClick={() => toggleOption(opt.key)}
                    />
                  ))}
                </div>

                {showExplanationAfterAnswer && confirmed && questionForPanel && (
                  <ExplanationPanel
                    question={questionForPanel}
                    selectedAnswer={selected.join(",")}
                  />
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <ReportButton questionId={question.id} />
                    <QuestionNote questionId={question.id} />
                    <BookmarkButton questionId={question.id} />
                  </div>

                  <div className="flex items-center gap-2">
                    {!confirmed ? (
                      <Button
                        onClick={submitAnswer}
                        disabled={!canConfirm}
                        variant="gold"
                        size="md"
                      >
                        {submitting ? "提交中..." : "確認作答"}
                      </Button>
                    ) : (
                      <Button onClick={loadNextQuestion} variant="gold" size="md" disabled={loading}>
                        {loading ? "載入中..." : "下一題"}
                        {!loading && <ChevronRight size={16} />}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Pause modal */}
      <Modal open={showPauseModal} onClose={() => setShowPauseModal(false)} title="暫停考試">
        <div className="space-y-4 text-center">
          <p className="text-[var(--text-secondary)]">你的進度已自動儲存，可以隨時從 NCLEX 首頁繼續。</p>
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={() => setShowPauseModal(false)}>繼續作答</Button>
            <Button fullWidth variant="ghost" onClick={pauseAndExit}>離開（保留進度）</Button>
            <Button fullWidth variant="outline" onClick={() => finishSession("user_abandon")}>
              直接結束考試
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pacing break modal — shown after 3 wrong in a row */}
      <Modal
        open={showBreakModal}
        onClose={() => {
          setShowBreakModal(false);
          setConsecutiveWrong(0);
          if (pendingAdvanceRef.current) {
            pendingAdvanceRef.current = false;
            setTimeout(() => { loadNextQuestion(); }, 200);
          }
        }}
        title="要不要先喘口氣？"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--gold-dim)] flex items-center justify-center mx-auto">
            <Coffee size={28} className="text-[var(--gold)]" />
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            練習就是會遇到卡關的題目，你已經離掌握這個盲點更近一步了。<br />
            要不要先休息幾分鐘，或換個心情再繼續？
          </p>
          <div className="flex flex-col gap-2">
            <Button
              fullWidth
              variant="gold"
              onClick={() => {
                setShowBreakModal(false);
                setConsecutiveWrong(0);
                if (pendingAdvanceRef.current) {
                  pendingAdvanceRef.current = false;
                  setTimeout(() => { loadNextQuestion(); }, 200);
                }
              }}
            >
              繼續練習
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onClick={() => {
                setShowBreakModal(false);
                pendingAdvanceRef.current = false;
                pauseAndExit();
              }}
            >
              休息一下（保留進度，下次再繼續）
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
