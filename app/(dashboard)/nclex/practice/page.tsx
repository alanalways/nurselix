"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import SessionStarter from "@/components/nclex/SessionStarter";

const DOMAIN_OPTIONS: { key: string; label: string }[] = [
  { key: "__ALL__", label: "全部 Domain" },
  { key: "Management of Care", label: "Management of Care" },
  { key: "Safety & Infection Control", label: "Safety & Infection Control" },
  { key: "Health Promotion & Maintenance", label: "Health Promotion & Maintenance" },
  { key: "Psychosocial Integrity", label: "Psychosocial Integrity" },
  { key: "Basic Care & Comfort", label: "Basic Care & Comfort" },
  { key: "Pharmacological & Parenteral", label: "Pharmacological & Parenteral" },
  { key: "Reduction of Risk Potential", label: "Reduction of Risk Potential" },
  { key: "Physiological Adaptation", label: "Physiological Adaptation" },
];

export default function PracticePage() {
  const [started, setStarted] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState("__ALL__");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<("EASY" | "MEDIUM" | "HARD")[]>([]);

  if (started) {
    return (
      <SessionStarter
        mode="PRACTICE"
        title="練習模式"
        targetCount={count}
        domainFilter={selectedDomain === "__ALL__" ? undefined : [selectedDomain]}
        difficultyFilter={difficulty.length > 0 ? difficulty : undefined}
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">練習模式設定</h1>
        <p className="text-[var(--text-secondary)] mt-1">答題後立即顯示解析，快速累積答題技巧</p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-[var(--text-primary)]">選擇 Domain</h2>
        <div className="flex flex-wrap gap-2">
          {DOMAIN_OPTIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => setSelectedDomain(d.key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedDomain === d.key
                  ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--gold)]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
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

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-[var(--text-primary)]">難易度</h2>
        <div className="flex gap-2">
          {[
            { key: "EASY" as const, label: "Easy", variant: "success" as const },
            { key: "MEDIUM" as const, label: "Medium", variant: "gold" as const },
            { key: "HARD" as const, label: "Hard", variant: "error" as const },
          ].map((d) => (
            <button
              key={d.key}
              onClick={() => setDifficulty((prev) => prev.includes(d.key) ? prev.filter(x => x !== d.key) : [...prev, d.key])}
              className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
                difficulty.includes(d.key)
                  ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)]"
              }`}
            >
              <Badge variant={d.variant}>{d.label}</Badge>
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)]">不選擇則包含所有難易度</p>
      </div>

      <Button fullWidth size="lg" onClick={() => setStarted(true)}>
        開始練習（{count} 題）
      </Button>
    </motion.div>
  );
}
