"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];
const mockDays = [true, true, true, true, true, false, false]; // last 7 days

export default function StreakCard() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)]">連續學習</h3>
        <div className="flex items-center gap-1 text-[var(--warning)]">
          <Flame size={18} />
          <span className="text-lg font-bold font-mono">7</span>
          <span className="text-sm">天</span>
        </div>
      </div>
      <div className="flex gap-2">
        {weekDays.map((day, i) => (
          <div key={day} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                mockDays[i]
                  ? "bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A]"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              }`}
            >
              {mockDays[i] ? "✓" : ""}
            </motion.div>
            <span className="text-[10px] text-[var(--text-muted)]">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
