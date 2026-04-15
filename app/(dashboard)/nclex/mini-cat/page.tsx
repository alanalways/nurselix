"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Target, CalendarDays } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ExamShell from "@/components/nclex/ExamShell";

export default function MiniCatPage() {
  const [started, setStarted] = useState(false);
  const nextAvailable = new Date();
  nextAvailable.setDate(nextAvailable.getDate() + 23);

  if (started) {
    return (
      <ExamShell
        mode="MINI_CAT"
        title="Mini CAT 體驗"
        totalQuestions={15}
        showTheta={false}
        showExplanationAfterAnswer={false}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mini CAT 體驗</h1>
          <p className="text-[var(--text-secondary)] mt-1">免費用戶每月一次 CAT 模式體驗</p>
        </div>
        <Badge variant="gold">每月一次</Badge>
      </div>

      {/* Status Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--gold)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[var(--gold-dim)] flex items-center justify-center">
            <Target size={20} className="text-[var(--gold)]" />
          </div>
          <div>
            <div className="font-semibold text-[var(--text-primary)]">本月體驗次數</div>
            <div className="text-sm text-[var(--gold)]">尚未使用 — 可立即開始</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <CalendarDays size={14} />
          <span>下次重置：{nextAvailable.toLocaleDateString("zh-TW")}</span>
        </div>
      </div>

      {/* Description */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-2 text-sm text-[var(--text-secondary)]">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">Mini CAT 說明</h3>
        {[
          "共 15 題，使用 CAT 自適應演算法出題",
          "答題中不顯示對錯（與正式 CAT 相同體驗）",
          "結束後顯示整體能力等級評估",
          "升級 Pro 即可無限使用完整 CAT 考試",
        ].map((s) => (
          <p key={s} className="flex items-start gap-2">
            <span className="text-[var(--gold)] mt-0.5">•</span>{s}
          </p>
        ))}
      </div>

      <Button fullWidth size="lg" onClick={() => setStarted(true)}>
        開始 Mini CAT（15 題）
      </Button>

      <div className="text-center">
        <p className="text-sm text-[var(--text-muted)]">想要無限 CAT 考試？</p>
        <button className="text-sm text-[var(--gold)] hover:underline mt-1">
          升級至 Pro 方案 →
        </button>
      </div>
    </motion.div>
  );
}
