"use client";

import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import DomainRadarChart from "@/components/dashboard/RadarChart";
import HeatMap from "@/components/dashboard/HeatMap";

const weeklyData = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 13 + i);
  return {
    date: d.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
    questions: Math.floor(Math.random() * 30) + 5,
    accuracy: Math.floor(Math.random() * 30) + 55,
  };
});

const domainBar = [
  { domain: "管理照護", correct: 72 },
  { domain: "安全感控", correct: 65 },
  { domain: "健康促進", correct: 80 },
  { domain: "心理完整", correct: 58 },
  { domain: "基本照護", correct: 75 },
  { domain: "藥理用藥", correct: 45 },
  { domain: "降低風險", correct: 62 },
  { domain: "生理適應", correct: 70 },
];

const summaryStats = [
  { label: "總答題數", value: "1,247" },
  { label: "整體正確率", value: "71%" },
  { label: "學習天數", value: "34 天" },
  { label: "最長連續", value: "12 天" },
  { label: "本月答題", value: "342" },
  { label: "平均每天", value: "10.1 題" },
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

      {/* Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">每日答題數（近 14 天）</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8 }}
                labelStyle={{ color: "var(--text-primary)" }}
              />
              <Line type="monotone" dataKey="questions" stroke="var(--gold)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">正確率趨勢（近 14 天）</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8 }}
                labelStyle={{ color: "var(--text-primary)" }}
              />
              <Line type="monotone" dataKey="accuracy" stroke="var(--success)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Domain Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">各 Domain 正確率</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={domainBar} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <YAxis type="category" dataKey="domain" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={70} />
            <Tooltip
              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8 }}
              labelStyle={{ color: "var(--text-primary)" }}
            />
            <Bar dataKey="correct" fill="var(--gold)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DomainRadarChart />
        <HeatMap />
      </div>
    </motion.div>
  );
}
