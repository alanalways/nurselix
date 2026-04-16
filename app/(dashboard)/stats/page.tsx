"use client";

import { motion } from "framer-motion";
import DomainRadarChart from "@/components/dashboard/RadarChart";
import HeatMap from "@/components/dashboard/HeatMap";

const domains = [
  "管理照護", "安全感控", "健康促進", "心理完整",
  "基本照護", "藥理用藥", "降低風險", "生理適應",
];

const summaryStats = [
  { label: "總答題數", value: "0" },
  { label: "整體正確率", value: "--" },
  { label: "學習天數", value: "0 天" },
  { label: "最長連續", value: "0 天" },
  { label: "本月答題", value: "0" },
  { label: "平均每天", value: "-- 題" },
];

export default function StatsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-5xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">學習統計</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {summaryStats.map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
            <div className="text-lg font-bold font-mono text-[var(--gold)]">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Domain Bar - empty state */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">各 Domain 正確率</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">答題後此圖將自動更新</p>
        <div className="space-y-2">
          {domains.map((domain) => (
            <div key={domain} className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-secondary)] w-20 shrink-0">{domain}</span>
              <div className="flex-1 h-5 bg-[var(--bg-elevated)] rounded-full" />
              <span className="text-xs font-mono text-[var(--text-muted)] w-8 text-right">--</span>
            </div>
          ))}
        </div>
      </div>

      {/* Radar + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DomainRadarChart />
        <HeatMap />
      </div>
    </motion.div>
  );
}
