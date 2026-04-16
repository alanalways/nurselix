"use client";

import { motion } from "framer-motion";
import { BookOpen, Target, Clock, Flame } from "lucide-react";

const stats = [
  { icon: BookOpen, label: "今日答題",   value: "0",  sub: "/ 10 題目標", color: "text-[var(--blue)]",    bg: "bg-[var(--blue-dim)]" },
  { icon: Target,   label: "整體正確率", value: "--", sub: "尚無資料",     color: "text-[var(--success)]", bg: "bg-[rgba(46,204,113,0.15)]" },
  { icon: Clock,    label: "學習時間",   value: "0h", sub: "今日",         color: "text-[var(--gold)]",    bg: "bg-[var(--gold-dim)]" },
  { icon: Flame,    label: "連續天數",   value: "0",  sub: "天 🔥",        color: "text-[var(--warning)]", bg: "bg-[rgba(243,156,18,0.15)]" },
];

export default function StatsOverview() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4"
        >
          <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
            <s.icon size={18} className={s.color} />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">{s.value}</div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">{s.sub}</div>
        </motion.div>
      ))}
    </div>
  );
}
