"use client";

import { motion } from "framer-motion";

export default function DailyProgress() {
  const done = 0;
  const goal = 10;
  const pct = goal > 0 ? (done / goal) * 100 : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 flex items-center gap-5">
      {/* Circle */}
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

      {/* Text */}
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">今日進度</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          今天完成了 <span className="text-[var(--gold)] font-semibold">{done}</span> / {goal} 題目標
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">開始答題達成今日目標！</p>
      </div>
    </div>
  );
}
