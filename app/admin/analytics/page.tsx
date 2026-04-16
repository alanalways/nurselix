"use client";

import { motion } from "framer-motion";
import { BarChart2 } from "lucide-react";

const domains = [
  "Pharmacological", "Physiological Adapt.", "Management of Care",
  "Safety & Infection", "Psychosocial", "Basic Care",
  "Reduction of Risk", "Health Promotion",
];

export default function AdminAnalyticsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">數據分析</h1>

      {/* Domain Error Rates - empty state */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">各 Domain 錯誤率</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">答題資料累積後將顯示統計圖表</p>
        <div className="space-y-2">
          {domains.map((domain) => (
            <div key={domain} className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-secondary)] w-36 shrink-0">{domain}</span>
              <div className="flex-1 h-5 bg-[var(--bg-elevated)] rounded-full" />
              <span className="text-xs font-mono text-[var(--text-muted)] w-8 text-right">--</span>
            </div>
          ))}
        </div>
      </div>

      {/* MAU Chart - empty state */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">本月每日活躍用戶（MAU）</h3>
        <div className="h-40 flex items-center justify-center gap-3 text-[var(--text-muted)]">
          <BarChart2 size={32} className="opacity-30" />
          <span className="text-sm">尚無足夠資料</span>
        </div>
      </div>

      {/* Weakest Questions - empty state */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">最弱 10 題（錯誤率最高）</h3>
        <div className="text-center py-8 text-[var(--text-muted)]">
          <p className="text-sm">答題記錄累積後將自動顯示</p>
        </div>
      </div>
    </motion.div>
  );
}
