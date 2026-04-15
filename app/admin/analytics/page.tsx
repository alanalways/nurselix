"use client";

import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const domainErrorRates = [
  { domain: "Pharmacological", errorRate: 55, attempts: 3420 },
  { domain: "Physiological Adapt.", errorRate: 42, attempts: 2890 },
  { domain: "Management of Care", errorRate: 28, attempts: 4100 },
  { domain: "Safety & Infection", errorRate: 35, attempts: 2100 },
  { domain: "Psychosocial", errorRate: 38, attempts: 1800 },
  { domain: "Basic Care", errorRate: 25, attempts: 1650 },
  { domain: "Reduction of Risk", errorRate: 40, attempts: 2200 },
  { domain: "Health Promotion", errorRate: 22, attempts: 1500 },
];

const weakestQuestions = [
  { id: "Q-234", stem: "Furosemide dosing in renal impairment...", domain: "Pharmacological", errorRate: 78 },
  { id: "Q-089", stem: "Priority assessment for ARDS patient...", domain: "Physiological Adapt.", errorRate: 75 },
  { id: "Q-156", stem: "Delegation to unlicensed assistive...", domain: "Management of Care", errorRate: 72 },
  { id: "Q-312", stem: "SATA: Signs of hyperkalemia...", domain: "Pharmacological", errorRate: 70 },
  { id: "Q-178", stem: "Insulin drip rate calculation...", domain: "Pharmacological", errorRate: 68 },
];

const monthlyActive = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  users: Math.floor(Math.random() * 30) + 40,
}));

export default function AdminAnalyticsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">數據分析</h1>

      {/* Domain Error Rates */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">各 Domain 錯誤率</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={domainErrorRates} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
            <XAxis type="number" domain={[0, 80]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <YAxis type="category" dataKey="domain" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={110} />
            <Tooltip
              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8 }}
              labelStyle={{ color: "var(--text-primary)" }}
              formatter={(v) => [`${v}%`, "錯誤率"]}
            />
            <Bar dataKey="errorRate" fill="var(--error)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* MAU Chart */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">本月每日活躍用戶（MAU）</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthlyActive}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8 }}
              labelStyle={{ color: "var(--text-primary)" }}
            />
            <Line type="monotone" dataKey="users" stroke="var(--blue)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Weakest Questions */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">最弱 10 題（錯誤率最高）</h3>
        <div className="space-y-3">
          {weakestQuestions.map((q, i) => (
            <div key={q.id} className="flex items-center gap-4 p-3 bg-[var(--bg-elevated)] rounded-xl">
              <span className="text-lg font-bold font-mono text-[var(--text-muted)] w-6">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--text-primary)] truncate">{q.stem}</div>
                <div className="text-xs text-[var(--text-muted)]">{q.id} · {q.domain}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold font-mono text-[var(--error)]">{q.errorRate}%</div>
                <div className="text-xs text-[var(--text-muted)]">錯誤率</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
