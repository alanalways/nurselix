"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

export default function ProgressBar({ current, total, showLabel = true }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>{current} / {total} 題</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="w-full h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
