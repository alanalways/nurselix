"use client";

import { CalendarDays } from "lucide-react";

export default function ExamCountdown() {
  // Mock: exam date set to 30 days from now
  const examDate = new Date();
  examDate.setDate(examDate.getDate() + 30);
  const daysLeft = 30;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[var(--blue-dim)] flex items-center justify-center">
        <CalendarDays size={18} className="text-[var(--blue)]" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-[var(--text-muted)] mb-0.5">考試倒數</div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">{daysLeft}</span>
          <span className="text-sm text-[var(--text-secondary)]">天</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-[var(--text-muted)]">考試日期</div>
        <div className="text-sm font-medium text-[var(--text-secondary)]">
          {examDate.toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
        </div>
      </div>
    </div>
  );
}
