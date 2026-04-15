"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Filter, SortAsc, Clock, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";

const mockErrors = Array.from({ length: 12 }, (_, i) => ({
  id: `err-${i}`,
  stem: `A ${50 + i}-year-old client presents with ${["chest pain", "shortness of breath", "hypertension", "diabetes complications"][i % 4]}. Which nursing intervention is the priority?`,
  domain: ["Pharmacological", "Management of Care", "Physiological Adaptation", "Safety & Infection Control"][i % 4],
  difficulty: ["EASY", "MEDIUM", "HARD"][i % 3] as "EASY" | "MEDIUM" | "HARD",
  wrongCount: Math.floor(Math.random() * 5) + 1,
  nextReview: ["今天", "明天", "3天後", "1週後"][i % 4],
  interval: [1, 6, 14, 30][i % 4],
}));

const diffBadge = {
  EASY: "success" as const,
  MEDIUM: "gold" as const,
  HARD: "error" as const,
};

export default function ReviewPage() {
  const [filter, setFilter] = useState("全部");
  const todayCount = mockErrors.filter(e => e.nextReview === "今天").length;

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
          <p className="text-[var(--text-secondary)] mt-1">SM-2 間隔複習，{todayCount} 題等待今日複習</p>
        </div>
        <Button size="sm" onClick={() => {}}>
          <RefreshCw size={14} /> 開始今日複習（{todayCount}）
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "錯題總數", value: mockErrors.length, color: "text-[var(--error)]" },
          { label: "今日待複習", value: todayCount, color: "text-[var(--warning)]" },
          { label: "已掌握", value: 42, color: "text-[var(--success)]" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["全部", "今天", "本週", "藥理", "生理適應", "管理照護"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap border transition-colors ${
              filter === f
                ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--gold)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {mockErrors.map((err, i) => (
          <motion.div
            key={err.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--gold)] transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm text-[var(--text-primary)] line-clamp-2 leading-relaxed">{err.stem}</p>
              <Badge variant={diffBadge[err.difficulty]}>{err.difficulty}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="text-[var(--text-secondary)]">{err.domain}</span>
              <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-[var(--error)]" />答錯 {err.wrongCount} 次</span>
              <span className="flex items-center gap-1"><Clock size={10} />複習：{err.nextReview}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
