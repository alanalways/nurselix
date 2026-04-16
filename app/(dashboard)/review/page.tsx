"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, RefreshCw, Loader2, AlertTriangle, Calendar } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface ErrorQueueResponse {
  totalErrors: number;
  dueNowCount: number;
  dueNow: Array<{
    questionId: string;
    interval: number;
    repetition: number;
    easiness: number;
    nextReview: string;
    lastWrongAt: string;
    question: {
      id: string;
      stem: string;
      stemZh: string | null;
      domain: string | null;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      questionType: string;
    };
  }>;
  upcoming: Array<{
    questionId: string;
    interval: number;
    nextReview: string;
    question: { stem: string; stemZh: string | null; domain: string | null; difficulty: string };
  }>;
}

const diffBadge = { EASY: "success" as const, MEDIUM: "gold" as const, HARD: "error" as const };

export default function ReviewPage() {
  const router = useRouter();
  const [data, setData] = useState<ErrorQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/nclex/error-queue", { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mastered = data ? Math.max(0, data.totalErrors - data.dueNowCount - data.upcoming.length) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">錯題複習</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {data ? `SM-2 間隔複習，${data.dueNowCount} 題等待今日複習` : "SM-2 間隔複習"}
          </p>
        </div>
        <Button
          size="sm"
          disabled={!data || data.dueNowCount === 0}
          onClick={() => router.push("/nclex/error-challenge")}
        >
          <RefreshCw size={14} /> 開始今日複習（{data?.dueNowCount ?? 0}）
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "錯題總數", value: data?.totalErrors ?? 0, color: "text-[var(--error)]" },
          { label: "今日待複習", value: data?.dueNowCount ?? 0, color: "text-[var(--warning)]" },
          { label: "已掌握（待明日+）", value: mastered, color: "text-[var(--success)]" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="py-10 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[var(--gold)]" />
        </div>
      )}

      {!loading && data && data.totalErrors === 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(46,204,113,0.15)] flex items-center justify-center">
            <CheckCircle size={28} className="text-[var(--success)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-lg">尚無錯題記錄</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">開始練習後，答錯的題目會自動出現在這裡</p>
          </div>
        </div>
      )}

      {!loading && data && data.dueNow.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-[var(--warning)]" />
            今日待複習（{data.dueNow.length}）
          </h2>
          <div className="space-y-2">
            {data.dueNow.map((r) => (
              <div key={r.questionId} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={diffBadge[r.question.difficulty as "EASY" | "MEDIUM" | "HARD"]}>
                        {r.question.difficulty}
                      </Badge>
                      <Badge variant="muted">重複 {r.repetition} 次</Badge>
                      {r.question.domain && (
                        <span className="text-xs text-[var(--text-secondary)]">{r.question.domain}</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-primary)] line-clamp-2">{r.question.stem}</p>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] text-right flex-shrink-0">
                    上次答錯 {new Date(r.lastWrongAt).toLocaleDateString("zh-TW")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && data && data.upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-muted)] mb-3 flex items-center gap-2">
            <Calendar size={18} />
            即將到期
          </h2>
          <div className="space-y-2">
            {data.upcoming.slice(0, 10).map((r) => (
              <div key={r.questionId} className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-[var(--text-secondary)] line-clamp-1 flex-1 min-w-0">
                  {r.question.stem}
                </p>
                <span className="text-xs font-mono text-[var(--text-muted)] whitespace-nowrap">
                  +{r.interval} 天 · {new Date(r.nextReview).toLocaleDateString("zh-TW")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
