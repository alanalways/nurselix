"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import SessionStarter from "@/components/nclex/SessionStarter";

export default function TutorPage() {
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(10);

  if (started) {
    return (
      <SessionStarter
        mode="TUTOR"
        title="Tutor 模式"
        targetCount={count}
        showExplanationAfterAnswer
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tutor 模式設定</h1>
        <p className="text-[var(--text-secondary)] mt-1">每題詳細解說，含學習重點與台美差異，深度理解</p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-[var(--text-primary)]">Tutor 模式特色</h2>
          <Badge variant="blue">Basic+</Badge>
        </div>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          {[
            "答題後立即顯示對錯與完整中文解析",
            "每題含「學習重點提示」，強化記憶",
            "有台美臨床差異的題目會特別標示",
            "可隨時記筆記、收藏或回報問題",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-[var(--gold)] mt-0.5">•</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-[var(--text-primary)]">題數設定</h2>
        <div className="flex gap-2">
          {[10, 20, 30, 50].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`flex-1 py-2 rounded-xl text-sm border font-medium transition-colors ${
                count === n
                  ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--gold)]"
              }`}
            >
              {n} 題
            </button>
          ))}
        </div>
      </div>

      <Button fullWidth size="lg" onClick={() => setStarted(true)}>
        開始 Tutor 模式（{count} 題）
      </Button>
    </motion.div>
  );
}
