"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import ExamShell from "@/components/nclex/ExamShell";

export default function AssessmentPage() {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <ExamShell
        mode="ASSESSMENT"
        title="初始評估"
        showCountdown
        countdownSec={600}
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">初始能力評估</h1>
        <p className="text-[var(--text-secondary)] mt-1">讓我們了解你目前的 NCLEX 能力，找出備考弱點</p>
      </div>

      {/* Description */}
      <div className="bg-gradient-to-br from-[var(--gold-dim)] to-[var(--blue-dim)] border border-[var(--gold)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--gold-dim)] border border-[var(--gold)] flex items-center justify-center">
            <ClipboardList size={22} className="text-[var(--gold)]" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">評估流程說明</h2>
            <p className="text-sm text-[var(--text-secondary)]">約 5–8 分鐘完成</p>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          {[
            "CAT 演算法出題，八大 Domain 各保底 1 題",
            "達到測量精度（SE < 0.40）自動停止",
            "最多 25 題，超過 10 分鐘也會停止",
            "答題中不顯示對錯，保持專注",
            "結束後顯示你的能力評估報告",
          ].map((s) => (
            <li key={s} className="flex items-start gap-2">
              <CheckCircle size={14} className="text-[var(--gold)] mt-0.5 flex-shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Plan-based result preview */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">評估結果深度（依方案）</h3>
        <div className="space-y-2 text-sm">
          {[
            { plan: "Free / Basic", desc: "整體能力等級（優秀/良好/及格邊緣/需加強）", locked: false },
            { plan: "Pro", desc: "完整八大 Domain 答對率 + 弱點排行 + 推薦練習", locked: false },
            { plan: "Elite", desc: "Pro 所有內容 + AI 30天個人學習計畫（email 寄出）", locked: false },
          ].map((p) => (
            <div key={p.plan} className="flex items-start gap-2 p-3 rounded-lg bg-[var(--bg-elevated)]">
              <span className="text-[var(--gold)] font-medium w-20 flex-shrink-0">{p.plan}</span>
              <span className="text-[var(--text-secondary)]">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <Button fullWidth size="lg" onClick={() => setStarted(true)}>
        開始初始評估
      </Button>
    </motion.div>
  );
}
