"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ExamShell from "@/components/nclex/ExamShell";

const mockErrors = [
  { domain: "Pharmacological", count: 23, nextReview: "今天" },
  { domain: "Physiological Adaptation", count: 15, nextReview: "今天" },
  { domain: "Management of Care", count: 8, nextReview: "明天" },
  { domain: "Safety & Infection Control", count: 5, nextReview: "3 天後" },
];

export default function ErrorChallengePage() {
  const [started, setStarted] = useState(false);
  const todayCount = mockErrors.filter(e => e.nextReview === "今天").reduce((s, e) => s + e.count, 0);

  if (started) {
    return (
      <ExamShell
        mode="ERROR_CHALLENGE"
        title="錯題挑戰"
        totalQuestions={todayCount}
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">錯題挑戰</h1>
        <p className="text-[var(--text-secondary)] mt-1">SM-2 間隔複習演算法，精準攻克你的弱點</p>
      </div>

      {/* Today's Queue */}
      <div className="bg-[rgba(243,156,18,0.10)] border border-[var(--warning)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-[var(--warning)]" />
          <span className="font-semibold text-[var(--warning)]">今日待複習</span>
          <Badge variant="warning">{todayCount} 題</Badge>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          SM-2 演算法根據你的作答記錄，安排今天最需要複習的題目。
        </p>
      </div>

      {/* Domain Breakdown */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">錯題分布</h3>
        <div className="space-y-3">
          {mockErrors.map((e) => (
            <div key={e.domain} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{e.domain}</div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <Clock size={10} />
                  下次複習：{e.nextReview}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-[var(--error)]">{e.count} 題</span>
                {e.nextReview === "今天" && (
                  <Badge variant="warning">今天</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SM-2 Info */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4 flex gap-3">
        <RefreshCw size={16} className="text-[var(--blue)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-secondary)]">
          SM-2 間隔複習：答對後自動延長複習間隔（1天→6天→指數增長），
          錯了就重置，確保你真正記住每一道題。
        </p>
      </div>

      <Button fullWidth size="lg" onClick={() => setStarted(true)} disabled={todayCount === 0}>
        開始今日錯題挑戰（{todayCount} 題）
      </Button>
    </motion.div>
  );
}
