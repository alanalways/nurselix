"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, AlertCircle, Loader2, RotateCcw, Share2, Download } from "lucide-react";
import confetti from "canvas-confetti";
import Button from "@/components/ui/Button";
import ResultCard from "@/components/nclex/ResultCard";
import FeedbackPrompt from "@/components/nclex/FeedbackPrompt";

interface ResultResponse {
  session: {
    id: string;
    mode: string;
    theta: number;
    se: number;
    thetaLabel: { label: string; labelEn: string; color: string };
    totalQuestions: number;
    correctCount: number;
    totalTimeSec: number;
    passFail: "PASS" | "FAIL" | null;
    score: number | null;
    stopReason: string | null;
    targetCount: number | null;
    startedAt: string;
    endedAt: string | null;
  };
  domainStats: { domain: string; correct: number; total: number }[];
  answers: Array<{
    questionId: string;
    domain: string | null;
    difficulty: string;
    questionType: string;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean | null;
    timeSpentSec: number | null;
  }>;
}

const STOP_REASON_LABEL: Record<string, string> = {
  "95_confidence": "達到 95% 信心水準",
  max_questions: "已達最大題數",
  time_limit: "時間到",
  se_reached: "測量精度達標",
  target_reached: "完成設定題數",
  user_end: "考生主動結束",
  user_abandon: "考生中途離開",
  completed: "考試完成",
};

export default function ResultsPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const [data, setData] = useState<ResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const confettiFired = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nclex/session/${params.sessionId}/result`, { cache: "no-store" });
        if (!res.ok) {
          setError(res.status === 404 ? "找不到考試記錄" : `載入失敗：HTTP ${res.status}`);
          return;
        }
        const body = await res.json() as ResultResponse;
        if (alive) setData(body);

        // Fire confetti on PASS
        if (alive && body.session.passFail === "PASS" && !confettiFired.current) {
          confettiFired.current = true;
          setTimeout(() => {
            confetti({
              particleCount: 140,
              spread: 80,
              origin: { y: 0.3 },
              colors: ["#C9A84C", "#E8C66A", "#4A90D9", "#2ECC71"],
            });
          }, 400);
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "網路錯誤");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [params.sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 size={32} className="animate-spin text-[var(--gold)]" />
        <p className="text-[var(--text-secondary)]">載入考試結果...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 max-w-3xl mx-auto space-y-6"
      >
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">考試結果</h1>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--blue-dim)] flex items-center justify-center">
            <AlertCircle size={28} className="text-[var(--blue)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-lg">{error ?? "找不到記錄"}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Session ID: {params.sessionId}</p>
          </div>
        </div>
        <Button variant="gold" onClick={() => router.push("/nclex")}>
          <Home size={16} /> 回到 NCLEX
        </Button>
      </motion.div>
    );
  }

  const { session, domainStats, answers } = data;
  const showTheta = ["CAT", "MOCK", "ASSESSMENT", "MINI_CAT"].includes(session.mode);
  const mode = session.mode;
  const modeTitle: Record<string, string> = {
    CAT: "CAT 智能考試", MOCK: "Mock 考試", TUTOR: "Tutor 模式",
    PRACTICE: "練習模式", ASSESSMENT: "初始評估", MINI_CAT: "Mini CAT 體驗",
    ERROR_CHALLENGE: "錯題挑戰", REVIEW: "複習",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-3xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">考試結果</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {modeTitle[mode] ?? mode}
          {session.stopReason && (
            <span className="ml-2 text-[var(--text-muted)]">
              · {STOP_REASON_LABEL[session.stopReason] ?? session.stopReason}
            </span>
          )}
        </p>
      </div>

      <ResultCard
        mode={session.mode}
        totalQuestions={session.totalQuestions}
        correctCount={session.correctCount}
        totalTimeSec={session.totalTimeSec}
        theta={showTheta ? session.theta : undefined}
        passFail={session.passFail ?? undefined}
        domainStats={domainStats}
      />

      {/* Ability label (CAT / Assessment / Mini-CAT) */}
      {showTheta && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">能力等級</p>
              <p className="text-2xl font-bold mt-1" style={{ color: session.thetaLabel.color }}>
                {session.thetaLabel.label}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--text-muted)]">θ (logits)</p>
              <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                {session.theta.toFixed(2)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">SE: {session.se.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Per-question review (for modes that hide during exam) */}
      {answers.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-3">逐題檢視（{answers.length} 題）</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {answers.map((a, i) => (
              <div
                key={a.questionId}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg border text-sm ${
                  a.isCorrect
                    ? "border-[var(--success)]/30 bg-[rgba(46,204,113,0.06)]"
                    : "border-[var(--error)]/30 bg-[rgba(231,76,60,0.06)]"
                }`}
              >
                <span className="text-xs font-mono text-[var(--text-muted)] w-6">{i + 1}</span>
                <span className={`font-semibold ${a.isCorrect ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                  {a.isCorrect ? "✓" : "✗"}
                </span>
                <span className="text-[var(--text-secondary)] flex-1 truncate">
                  {a.domain ?? "—"} · {a.difficulty}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {a.selectedAnswer ?? "—"} / {a.correctAnswer}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => router.push("/nclex")}>
          <Home size={16} /> 回到 NCLEX
        </Button>
        <Button variant="outline" onClick={() => router.push("/review")}>
          <RotateCcw size={16} /> 查看錯題
        </Button>
        <Button variant="ghost" disabled>
          <Share2 size={16} /> 分享成績（即將推出）
        </Button>
        <Button variant="ghost" disabled>
          <Download size={16} /> 下載成績卡
        </Button>
      </div>

      <FeedbackPrompt sessionId={params.sessionId} />
    </motion.div>
  );
}
