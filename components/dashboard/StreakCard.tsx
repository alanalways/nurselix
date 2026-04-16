"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

const WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function StreakCard() {
  const [streak, setStreak] = useState(0);
  const [recent7, setRecent7] = useState<boolean[]>([false, false, false, false, false, false, false]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        setStreak(body.streak ?? 0);

        // Take last 7 entries from heatmap; map to boolean active
        const last7 = (body.heatmap as { date: string; count: number }[] | undefined)?.slice(-7) ?? [];
        const now = new Date();
        const dowToday = now.getUTCDay(); // 0-6 (Sun..Sat)

        // Align to Sun=0..Sat=6 ordering for WEEK_DAYS
        const aligned = Array(7).fill(false);
        for (let i = 0; i < last7.length; i++) {
          const dateObj = new Date(last7[i].date);
          const dow = dateObj.getUTCDay();
          aligned[dow] = last7[i].count > 0;
        }

        // For nicer display we keep as Sun..Sat; compute today index & show 
        // last 7 days ending today
        const active7: boolean[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setUTCDate(d.getUTCDate() - i);
          const key = d.toISOString().substring(0, 10);
          const row = last7.find((r) => r.date === key);
          active7.push(!!(row && row.count > 0));
        }
        setRecent7(active7);

        // silence unused warning
        void dowToday;
        void aligned;
      } catch {
        // ignore
      }
    })();
  }, []);

  // Labels for the last 7 days matching active7 ordering
  const now = new Date();
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    labels.push(WEEK_DAYS[d.getUTCDay()]);
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)]">連續學習</h3>
        <div className={`flex items-center gap-1 ${streak > 0 ? "text-[var(--warning)]" : "text-[var(--text-muted)]"}`}>
          <Flame size={18} className={streak > 0 ? "animate-pulse" : ""} />
          <span className="text-lg font-bold font-mono">{streak}</span>
          <span className="text-sm">天</span>
        </div>
      </div>
      <div className="flex gap-2">
        {recent7.map((active, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                active
                  ? "bg-[var(--gold-dim)] text-[var(--gold)] border border-[var(--gold)]"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              }`}
            >
              {active ? "✓" : ""}
            </motion.div>
            <span className="text-[10px] text-[var(--text-muted)]">{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
