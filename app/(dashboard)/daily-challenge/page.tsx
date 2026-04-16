"use client";

import { motion } from "framer-motion";
import { Calendar, Zap } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function DailyChallengePage() {
  const today = new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={18} className="text-[var(--gold)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">每日挑戰</h1>
            <Badge variant="gold">今日</Badge>
          </div>
          <p className="text-[var(--text-secondary)]">{today}</p>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--gold-dim)] flex items-center justify-center">
          <Zap size={28} className="text-[var(--gold)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)] text-lg">今日題目即將上線</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">每日挑戰功能正在準備中，敬請期待！</p>
        </div>
      </div>
    </motion.div>
  );
}
