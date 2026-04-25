"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";

interface ResultResponse {
  session: {
    id: string;
    mode: string;
    totalQuestions: number;
    correctCount: number;
    totalTimeSec: number;
    stopReason: string | null;
    targetCount: number | null;
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
  target_reached: "完成設定題數",
  time_limit: "時間到",
  user_end: "主動結束",
  out_of_questions: "題庫已出完",
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function estimatedToeicScore(accuracy: number): string {
  if (accuracy >= 0.9) return "850–990";
  if (accuracy >= 0.75) return "730–849";
  if (accuracy >= 0.55) return "470–729";
  if (accuracy >= 0.35) return "220–469";
  return "220 以下";
}

export default function ToeicResultsPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const [data, setData] = useState<ResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nclex/session/${params.sessionId}/result`, { cache: "no-store" });
        if (!res.ok) {
          setError(res.status === 404 ? "找不到練習記錄" : `載入失敗：HTTP ${res.status}`);
          return;
        }
        const body = await res.json() as ResultResponse;
        if (alive) setData(body);
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
        <p className="text-[var(--text-secondary)]">載入練習結果...</p>
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">TOEIC 練習結果</h1>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--blue-dim)] flex items-center justify-center">
            <AlertCircle size={28} className="text-[var(--blue)]" />
          </div>
          <p className="font-semibold text-[var(--text-primary)] text-lg">{error ?? "找不到記錄"}</p>
        </div>
        <Button variant="gold" onClick={() => router.push("/toeic")}>
          <Home size={16} /> 回到 TOEIC
        </Button>
      </motion.div>
    );
  }

  const { session, domainStats, answers } = data;
  const accuracy = session.totalQuestions > 0
    ? session.correctCount / session.totalQuestions
    : 0;
  const accuracyPct = Math.round(accuracy * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-3xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">TOEIC 練習結果</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          閱讀練習
          {session.stopReason && (
            <span className="ml-2 text-[var(--text-muted)]">
              · {STOP_REASON_LABEL[session.stopReason] ?? session.stopReason}
            </span>
          )}
        </p>
      </div>

      {/* Score Summary */}
      <div
        className="rounded-xl border p-5 grid grid-cols-2 sm:grid-cols-4 gap-4"
        style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
      >
        <div className="text-center">
          <p className="text-3xl font-bold font-mono" style={{
            color: accuracyPct >= 75 ? "var(--success)" : accuracyPct >= 55 ? "var(--gold)" : "var(--error)"
          }}>
            {accuracyPct}%
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">正確率</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold font-mono text-[var(--text-primary)]">
            {session.correctCount}/{session.totalQuestions}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">答對 / 總題數</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold font-mono text-[var(--text-primary)]">
            {formatTime(session.totalTimeSec)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">作答時間</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold font-mono text-[var(--blue)]">
            {estimatedToeicScore(accuracy)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">估算分數區間</p>
        </div>
      </div>

      {/* Per-Part Breakdown */}
      {domainStats.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
        >
          <h3 className="font-semibold text-[var(--text-primary)] mb-3">各 Part 成績</h3>
          <div className="space-y-3">
            {domainStats.map((d) => {
              const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
              return (
                <div key={d.domain}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="font-medium text-[var(--text-primary)]">{d.domain ?? "其他"}</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {d.correct}/{d.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 75 ? "var(--success)" : pct >= 55 ? "var(--gold)" : "var(--error)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-question review */}
      {answers.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
        >
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
                  {a.domain ?? "—"}
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
        <Button variant="gold" onClick={() => router.push("/toeic")}>
          <Home size={16} /> 回到 TOEIC
        </Button>
        <Button variant="outline" onClick={() => router.push("/toeic/practice")}>
          <RotateCcw size={16} /> 再練一次
        </Button>
        <Button variant="ghost" onClick={() => router.push("/review")}>
          查看錯題本
        </Button>
      </div>
    </motion.div>
  );
}
