"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import ExamShell from "@/components/nclex/ExamShell";

export default function MockPage() {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <ExamShell
        mode="MOCK"
        title="Mock 考試"
        totalQuestions={130}
        showCountdown
        countdownSec={18000}
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
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mock 考試</h1>
        <p className="text-[var(--text-secondary)] mt-1">全真模擬 NCLEX-RN 考試環境</p>
      </div>

      {/* Warning */}
      <div className="bg-[rgba(243,156,18,0.10)] border border-[var(--warning)] rounded-xl p-5 flex gap-3">
        <AlertTriangle size={20} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-[var(--warning)]">考試注意事項</p>
          <ul className="text-[var(--text-secondary)] space-y-1">
            <li>• 答題中不顯示對錯，結束後才能查看</li>
            <li>• 共 <span className="text-[var(--text-primary)] font-semibold">130 題</span>，限時 <span className="text-[var(--text-primary)] font-semibold">5 小時</span></li>
            <li>• 可使用暫停功能，但暫停期間計時不停</li>
            <li>• 確保網路穩定，中途離開進度自動儲存</li>
          </ul>
        </div>
      </div>

      {/* Rules */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-[var(--text-primary)]">NCLEX-RN 2026 規格</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "題數範圍", value: "85–150 題" },
            { label: "時間限制", value: "5 小時" },
            { label: "通過標準", value: "θ > 0.00" },
            { label: "題型", value: "MCQ + NGN" },
          ].map((r) => (
            <div key={r.label} className="bg-[var(--bg-elevated)] rounded-lg p-3">
              <div className="text-[var(--text-muted)] text-xs mb-1">{r.label}</div>
              <div className="font-semibold text-[var(--text-primary)]">{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Clock size={14} />
        <span>預計需要 3-5 小時，請確認你有足夠時間</span>
      </div>

      <Button fullWidth size="lg" variant="gold" onClick={() => setStarted(true)}>
        開始 Mock 考試
      </Button>
      <Button fullWidth size="md" variant="ghost" onClick={() => window.history.back()}>
        取消
      </Button>
    </motion.div>
  );
}
