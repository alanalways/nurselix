"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import SessionStarter from "@/components/nclex/SessionStarter";

interface ErrorQueueResponse {
  totalErrors: number;
  dueNowCount: number;
  dueNow: Array<{
    questionId: string;
    question: {
      id: string;
      domain: string | null;
      difficulty: string;
      stem: string;
      questionType: string;
    };
    nextReview: string;
    interval: number;
  }>;
  upcoming: Array<{
    questionId: string;
    nextReview: string;
    interval: number;
    question: { stem: string; difficulty: string; domain: string | null };
  }>;
}

export default function ErrorChallengePage() {
  const [data, setData] = useState<ErrorQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/nclex/error-queue", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json() as ErrorQueueResponse;
          if (alive) setData(body);
        }
      } catch {
        // silently fall back to empty state
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (started) {
    return (
      <SessionStarter
        mode="ERROR_CHALLENGE"
        title="錯題挑戰"
        targetCount={data ? Math.min(20, data.dueNowCount) : 10}
        showExplanationAfterAnswer
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">錯題挑戰</h1>
        <p className="text-[var(--text-secondary)] mt-1">SM-2 間隔複習演算法，精準攻克你的弱點</p>
      </div>

      {loading && (
        <div className="py-10 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[var(--gold)]" />
          <p className="text-sm text-[var(--text-secondary)]">載入錯題佇列...</p>
        </div>
      )}

      {!loading && data && data.dueNowCount === 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(46,204,113,0.15)] flex items-center justify-center">
            <CheckCircle size={28} className="text-[var(--success)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-lg">目前無待複習題目</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {data.totalErrors === 0
                ? "先去練習題目，錯題會自動加入複習清單"
                : `錯題總數 ${data.totalErrors} 題，依 SM-2 間隔陸續到期`}
            </p>
          </div>
        </div>
      )}

      {!loading && data && data.dueNowCount > 0 && (
        <>
          <div className="bg-[var(--bg-surface)] border border-[var(--warning)] rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  你有 <span className="text-[var(--warning)]">{data.dueNowCount}</span> 題今日到期
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  錯題總庫：{data.totalErrors} 題，建議每日挑戰 10–20 題維持記憶
                </p>
              </div>
            </div>
          </div>

          <Button fullWidth size="lg" onClick={() => setStarted(true)}>
            開始錯題挑戰（{Math.min(20, data.dueNowCount)} 題）
          </Button>
        </>
      )}

      {!loading && data && data.upcoming.length > 0 && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">即將到期</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {data.upcoming.slice(0, 8).map((u) => (
              <div key={u.questionId} className="flex items-start justify-between text-xs">
                <span className="text-[var(--text-secondary)] line-clamp-1 flex-1 pr-2">
                  {u.question.stem.substring(0, 80)}...
                </span>
                <span className="text-[var(--text-muted)] font-mono whitespace-nowrap">
                  +{u.interval}天
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4 flex gap-3">
        <RefreshCw size={16} className="text-[var(--blue)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-secondary)]">
          SM-2 間隔複習：答對後自動延長複習間隔（1天→6天→指數增長），錯了就重置，確保你真正記住每一道題。
        </p>
      </div>
    </motion.div>
  );
}
