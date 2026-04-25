"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import SessionStarter from "@/components/nclex/SessionStarter";

const PART_OPTIONS = [
  { key: "__ALL__", label: "全部 Parts (5 / 6 / 7)" },
  { key: "Part 5", label: "Part 5 — Incomplete Sentences" },
  { key: "Part 6", label: "Part 6 — Text Completion" },
  { key: "Part 7", label: "Part 7 — Reading Comprehension" },
];

function ToeicPracticeInner() {
  const searchParams = useSearchParams();
  const initialPart = searchParams.get("part") ?? "__ALL__";

  const [started, setStarted] = useState(false);
  const [selectedPart, setSelectedPart] = useState(initialPart);
  const [count, setCount] = useState(10);

  if (started) {
    return (
      <SessionStarter
        mode="PRACTICE"
        module="TOEIC"
        title="TOEIC 練習"
        targetCount={count}
        domainFilter={selectedPart === "__ALL__" ? undefined : [selectedPart]}
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">TOEIC 練習設定</h1>
        <p className="text-[var(--text-secondary)] mt-1">選擇 Part 與題數後開始練習，答題後立即顯示中文解析</p>
      </div>

      {/* Part Filter */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
      >
        <label className="text-sm font-semibold text-[var(--text-primary)]">題目類型</label>
        <div className="grid grid-cols-1 gap-2">
          {PART_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSelectedPart(opt.key)}
              className="text-left p-3 rounded-lg border transition-all duration-150"
              style={{
                borderColor: selectedPart === opt.key ? "var(--gold)" : "var(--border-subtle)",
                background: selectedPart === opt.key ? "var(--gold-dim)" : "transparent",
                color: selectedPart === opt.key ? "var(--gold)" : "var(--text-secondary)",
              }}
            >
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
      >
        <label className="text-sm font-semibold text-[var(--text-primary)]">題數</label>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 20, 30].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className="px-4 py-2 rounded-lg border text-sm font-mono font-medium transition-all duration-150"
              style={{
                borderColor: count === n ? "var(--gold)" : "var(--border-subtle)",
                background: count === n ? "var(--gold-dim)" : "transparent",
                color: count === n ? "var(--gold)" : "var(--text-secondary)",
              }}
            >
              {n} 題
            </button>
          ))}
        </div>
      </div>

      <Button fullWidth onClick={() => setStarted(true)}>
        開始練習
      </Button>
    </motion.div>
  );
}

export default function ToeicPracticePage() {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--text-muted)]">載入中…</div>}>
      <ToeicPracticeInner />
    </Suspense>
  );
}
