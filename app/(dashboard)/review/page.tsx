"use client";

import { motion } from "framer-motion";
import { CheckCircle, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ReviewPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">錯題複習</h1>
          <p className="text-[var(--text-secondary)] mt-1">SM-2 間隔複習，0 題等待今日複習</p>
        </div>
        <Button size="sm" disabled>
          <RefreshCw size={14} /> 開始今日複習（0）
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "錯題總數", value: "0", color: "text-[var(--error)]" },
          { label: "今日待複習", value: "0", color: "text-[var(--warning)]" },
          { label: "已掌握", value: "0", color: "text-[var(--success)]" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(46,204,113,0.15)] flex items-center justify-center">
          <CheckCircle size={28} className="text-[var(--success)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)] text-lg">尚無錯題記錄</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">開始練習後，答錯的題目會自動出現在這裡</p>
        </div>
      </div>
    </motion.div>
  );
}
