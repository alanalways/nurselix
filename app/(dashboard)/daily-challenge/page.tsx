"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Zap, CheckCircle, XCircle, Loader2, Users } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import QuestionCard from "@/components/nclex/QuestionCard";
import OptionButton from "@/components/nclex/OptionButton";
import type { QuestionPayload } from "@/types";

interface DailyChallengeData {
  date: string;
  challengeId: string;
  question: QuestionPayload;
  totalAttempts: number;
  correctCount: number;
  alreadyAttempted: boolean;
  myAttempt: { selectedAnswer: string; isCorrect: boolean } | null;
  correctAnswer?: string;
  correctAnswers?: string[];
  explanationZh?: string;
}

export default function DailyChallengePage() {
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" }));
  }, []);

  const [data, setData] = useState<DailyChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; correctAnswer: string; explanationZh: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/nclex/daily-challenge", { cache: "no-store" });
        if (!res.ok) {
          setError("載入每日題目失敗");
          return;
        }
        const body = await res.json() as DailyChallengeData;
        if (alive) {
          setData(body);
          if (body.myAttempt && body.correctAnswer && body.explanationZh) {
            setResult({
              isCorrect: body.myAttempt.isCorrect,
              correctAnswer: body.correctAnswer,
              explanationZh: body.explanationZh,
            });
            setSelected(body.myAttempt.selectedAnswer.split(","));
          }
        }
      } catch {
        if (alive) setError("網路錯誤");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const submit = async () => {
    if (!data || submitting || selected.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/nclex/daily-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: data.challengeId,
          selectedAnswer: selected.join(","),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult({
        isCorrect: body.isCorrect,
        correctAnswer: body.correctAnswer,
        explanationZh: body.explanationZh,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isSata = data?.question.questionType === "SATA";
  const confirmed = !!result;

  const toggleOption = (key: string) => {
    if (confirmed) return;
    if (isSata) setSelected((p) => p.includes(key) ? p.filter((x) => x !== key) : [...p, key]);
    else setSelected([key]);
  };

  const getOptionState = (key: string): "default" | "selected" | "correct" | "incorrect" => {
    if (!confirmed || !result) return selected.includes(key) ? "selected" : "default";
    const correctSet = new Set(result.correctAnswer.split(","));
    if (correctSet.has(key)) return "correct";
    if (selected.includes(key)) return "incorrect";
    return "default";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-3xl mx-auto space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={18} className="text-[var(--gold)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">每日挑戰</h1>
            <Badge variant="gold">今日</Badge>
          </div>
          <p className="text-[var(--text-secondary)]">{today}</p>
        </div>

        {data && (
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)] mb-0.5">今日全站統計</p>
            <p className="text-sm text-[var(--text-primary)] flex items-center gap-1 justify-end">
              <Users size={14} className="text-[var(--blue)]" />
              {data.totalAttempts} 人作答
            </p>
            {data.totalAttempts > 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                正確率 {Math.round((data.correctCount / data.totalAttempts) * 100)}%
              </p>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[var(--gold)]" />
          <p className="text-sm text-[var(--text-secondary)]">載入今日題目...</p>
        </div>
      )}

      {error && (
        <div className="bg-[var(--bg-surface)] border border-[var(--error)] rounded-xl p-10 flex flex-col items-center text-center gap-3">
          <Zap size={32} className="text-[var(--error)]" />
          <p className="font-semibold text-[var(--text-primary)]">{error}</p>
          <Button variant="ghost" onClick={() => location.reload()}>重試</Button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-5">
          <QuestionCard
            question={{
              id: data.question.id,
              module: "NCLEX",
              questionType: data.question.questionType,
              stem: data.question.stem,
              stemZh: data.question.stemZh,
              optionA: data.question.optionA,
              optionB: data.question.optionB,
              optionC: data.question.optionC,
              optionD: data.question.optionD,
              optionE: data.question.optionE,
              optionF: data.question.optionF,
              correctAnswer: "",
              correctAnswers: [],
              explanationZh: "",
              domain: data.question.domain ?? null,
              subDomain: null,
              tags: data.question.tags ?? [],
              difficulty: data.question.difficulty,
              attemptCount: 0,
              correctCount: 0,
              errorRate: 0,
              status: "APPROVED",
              createdAt: new Date().toISOString(),
            }}
            questionNumber={1}
          />

          {isSata && !confirmed && (
            <div className="bg-[var(--gold-dim)] border border-[var(--gold)] rounded-lg px-4 py-2 text-sm text-[var(--gold)]">
              ⚡ SATA：請選擇所有正確答案
            </div>
          )}

          <div className="space-y-3">
            {[
              { label: "A", text: data.question.optionA, key: "A" },
              { label: "B", text: data.question.optionB, key: "B" },
              { label: "C", text: data.question.optionC, key: "C" },
              { label: "D", text: data.question.optionD, key: "D" },
              ...(data.question.optionE ? [{ label: "E", text: data.question.optionE, key: "E" }] : []),
              ...(data.question.optionF ? [{ label: "F", text: data.question.optionF, key: "F" }] : []),
            ].map((o) => (
              <OptionButton
                key={o.key}
                label={o.label}
                text={o.text}
                state={getOptionState(o.key)}
                disabled={confirmed}
                onClick={() => toggleOption(o.key)}
              />
            ))}
          </div>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-5 border ${
                result.isCorrect
                  ? "bg-[rgba(46,204,113,0.10)] border-[var(--success)]"
                  : "bg-[rgba(231,76,60,0.10)] border-[var(--error)]"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {result.isCorrect
                  ? <CheckCircle size={24} className="text-[var(--success)]" />
                  : <XCircle size={24} className="text-[var(--error)]" />}
                <div>
                  <p className={`font-semibold ${result.isCorrect ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                    {result.isCorrect ? "答對了！" : "答錯了"}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">正確答案：{result.correctAnswer}</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-noto-sans whitespace-pre-wrap">
                {result.explanationZh}
              </p>
            </motion.div>
          )}

          {!confirmed && (
            <Button fullWidth size="lg" onClick={submit} disabled={selected.length === 0 || submitting}>
              {submitting ? "提交中..." : "確認作答"}
            </Button>
          )}
          {confirmed && data.alreadyAttempted && (
            <p className="text-center text-sm text-[var(--text-muted)]">今日已完成挑戰，明日 00:00 重置</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
