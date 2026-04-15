"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, TrendingUp, Clock, Target } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";

interface ResultCardProps {
  mode: string;
  totalQuestions: number;
  correctCount: number;
  totalTimeSec: number;
  theta?: number;
  passFail?: "PASS" | "FAIL";
  domainStats?: { domain: string; correct: number; total: number }[];
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} 小時 ${m} 分`;
  return `${m} 分 ${sec % 60} 秒`;
}

export default function ResultCard({ mode, totalQuestions, correctCount, totalTimeSec, theta, passFail, domainStats }: ResultCardProps) {
  const accuracy = Math.round((correctCount / totalQuestions) * 100);
  const isPass = passFail === "PASS";

  return (
    <div className="space-y-4">
      {/* Pass/Fail Banner (CAT/Mock) */}
      {passFail && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`rounded-2xl p-6 text-center border-2 ${
            isPass
              ? "border-[var(--success)] bg-[rgba(46,204,113,0.10)]"
              : "border-[var(--error)] bg-[rgba(231,76,60,0.10)]"
          }`}
        >
          {isPass
            ? <CheckCircle size={48} className="text-[var(--success)] mx-auto mb-3" />
            : <XCircle size={48} className="text-[var(--error)] mx-auto mb-3" />
          }
          <div className={`text-4xl font-bold mb-1 ${isPass ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
            {passFail}
          </div>
          <p className="text-[var(--text-secondary)]">
            {isPass ? "恭喜！你通過了 NCLEX 模擬考試 🎉" : "還需要繼續加油！繼續練習你一定可以的"}
          </p>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Target, label: "正確率", value: `${accuracy}%`, color: "text-[var(--success)]", bg: "bg-[rgba(46,204,113,0.15)]" },
          { icon: CheckCircle, label: "答對題數", value: `${correctCount}/${totalQuestions}`, color: "text-[var(--blue)]", bg: "bg-[var(--blue-dim)]" },
          { icon: Clock, label: "總用時", value: formatTime(totalTimeSec), color: "text-[var(--gold)]", bg: "bg-[var(--gold-dim)]" },
          ...(theta !== undefined ? [{ icon: TrendingUp, label: "能力值 θ", value: theta.toFixed(2), color: "text-[var(--text-primary)]", bg: "bg-[var(--bg-overlay)]" }] : []),
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Domain Breakdown */}
      {domainStats && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">各 Domain 成績</h3>
          <div className="space-y-3">
            {domainStats.map((d) => {
              const pct = Math.round((d.correct / d.total) * 100);
              return (
                <div key={d.domain}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-secondary)]">{d.domain}</span>
                    <span className={`font-semibold font-mono ${pct >= 70 ? "text-[var(--success)]" : pct >= 50 ? "text-[var(--warning)]" : "text-[var(--error)]"}`}>
                      {d.correct}/{d.total} ({pct}%)
                    </span>
                  </div>
                  <Progress value={pct} size="sm" color={pct >= 70 ? "success" : pct >= 50 ? "gold" : "error"} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
