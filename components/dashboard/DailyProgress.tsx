"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function DailyProgress() {
  const [done, setDone] = useState(0);
  const [goal, setGoal] = useState(10);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [statsRes, settingsRes] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/user/settings", { cache: "no-store" }),
        ]);
        if (!alive) return;
        if (!statsRes.ok && !settingsRes.ok) {
          setFetchFailed(true);
          return;
        }
        if (statsRes.ok) {
          const s = await statsRes.json();
          const today = s.heatmap?.at(-1);
          if (alive) setDone(today?.count ?? 0);
        }
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (alive && settings.dailyGoal) setGoal(settings.dailyGoal);
        }
      } catch {
        if (alive) setFetchFailed(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const pct = goal > 0 ? Math.min(100, (done / goal) * 100) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const completed = done >= goal;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 flex items-center gap-5">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-overlay)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--gold)" />
              <stop offset="100%" stopColor="var(--gold-light)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono text-[var(--gold)]">{done}</span>
          <span className="text-xs text-[var(--text-muted)]">/{goal}</span>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">今日進度</h3>
        {fetchFailed ? (
          <p className="text-sm text-[var(--error)] flex items-center gap-1.5">
            <AlertCircle size={14} /> 載入失敗，請重新整理
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              今天完成了 <span className="text-[var(--gold)] font-semibold">{done}</span> / {goal} 題目標
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {completed ? "🎉 今日目標已達成！" : "開始答題達成今日目標！"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
