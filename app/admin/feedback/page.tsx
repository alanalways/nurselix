"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

export default function AdminFeedbackPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">用戶回饋</h1>
        <div className="text-right">
          <div className="text-3xl font-bold text-[var(--text-muted)]">--</div>
          <div className="text-xs text-[var(--text-muted)]">平均評分</div>
        </div>
      </div>

      {/* Rating Distribution - empty */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">評分分布</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((r) => (
            <div key={r} className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-muted)] w-6">{r}★</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--bg-overlay)]" />
              <span className="text-xs text-[var(--text-muted)] w-8 text-right">0</span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-10 flex flex-col items-center text-center gap-3">
        <MessageSquare size={40} className="text-[var(--text-muted)] opacity-30" />
        <p className="text-[var(--text-secondary)] font-medium">尚無用戶回饋</p>
        <p className="text-sm text-[var(--text-muted)]">用戶完成考試後提交的回饋將顯示在這裡</p>
      </div>
    </motion.div>
  );
}
