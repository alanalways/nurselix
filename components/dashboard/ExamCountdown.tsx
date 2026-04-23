"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

export default function ExamCountdown() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [examDateStr, setExamDateStr] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => { if (!r.ok) throw new Error("failed"); return r.json(); })
      .then((data) => {
        if (data.examDate) {
          const exam = new Date(data.examDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          setDaysLeft(diff > 0 ? diff : 0);
          setExamDateStr(exam.toLocaleDateString("zh-TW", { month: "long", day: "numeric" }));
        }
      })
      .catch(() => setFetchFailed(true));
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[var(--blue-dim)] flex items-center justify-center">
        <CalendarDays size={18} className="text-[var(--blue)]" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-[var(--text-muted)] mb-0.5">考試倒數</div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {daysLeft ?? "--"}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">天</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-[var(--text-muted)]">考試日期</div>
        <div className="text-sm font-medium text-[var(--text-secondary)]">
          {fetchFailed ? "載入失敗" : (examDateStr ?? "尚未設定")}
        </div>
      </div>
    </div>
  );
}
