"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart2, Loader2, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface AnalyticsData {
  domainBreakdown: Array<{
    domain: string; attempts: number; correct: number; items: number; errorRate: number;
  }>;
  weakestQuestions: Array<{
    id: string; stem: string; domain: string | null; difficulty: string;
    attempts: number; correct: number; errorRate: number;
  }>;
  mauDaily: Array<{ date: string; dau: number; questions: number }>;
  apiCost: {
    daily: Array<{ date: string; costUsd: number; calls: number }>;
    totalCostUsd: number;
    totalCostTwd: number;
    totalCalls: number;
    byModel: Array<{ model: string; costUsd: number }>;
  };
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics", { cache: "no-store" });
        if (!res.ok) {
          setError(`載入失敗 (${res.status})`);
          return;
        }
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "網路錯誤");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[var(--gold)]" />
        <p className="text-sm text-[var(--text-secondary)]">載入數據分析...</p>
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-6 text-[var(--error)]">{error ?? "無資料"}</div>;
  }

  const mauChart = data.mauDaily.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">數據分析</h1>

      {/* Domain Error Rates */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">各 Domain 錯誤率</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">基於已答過的題目計算</p>
        {data.domainBreakdown.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">答題資料累積後將顯示</p>
        ) : (
          <div className="space-y-2">
            {data.domainBreakdown.map((d) => (
              <div key={d.domain} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)] w-44 shrink-0">{d.domain}</span>
                <div className="flex-1 h-5 bg-[var(--bg-elevated)] rounded-full overflow-hidden relative">
                  <div
                    className={`h-full transition-all ${
                      d.errorRate > 50 ? "bg-[var(--error)]" : d.errorRate > 30 ? "bg-[var(--warning)]" : "bg-[var(--success)]"
                    }`}
                    style={{ width: `${d.errorRate}%` }}
                  />
                </div>
                <span className={`text-xs font-mono w-10 text-right ${
                  d.errorRate > 50 ? "text-[var(--error)]" : d.errorRate > 30 ? "text-[var(--warning)]" : "text-[var(--success)]"
                }`}>
                  {d.errorRate}%
                </span>
                <span className="text-xs text-[var(--text-muted)] w-28 text-right">
                  {d.correct}/{d.attempts} · {d.items} 題
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAU Chart */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">近 30 天 DAU / 答題數</h3>
        {data.mauDaily.every((d) => d.dau === 0) ? (
          <div className="h-40 flex items-center justify-center gap-3 text-[var(--text-muted)]">
            <BarChart2 size={32} className="opacity-30" />
            <span className="text-sm">尚無足夠資料</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mauChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="dateLabel" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8 }}
                labelStyle={{ color: "var(--text-primary)" }}
              />
              <Line yAxisId="left" type="monotone" dataKey="dau" stroke="var(--gold)" strokeWidth={2} dot={false} name="DAU" />
              <Line yAxisId="right" type="monotone" dataKey="questions" stroke="var(--blue)" strokeWidth={2} dot={false} name="答題數" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* API Cost Section */}
      {data.apiCost && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-[var(--gold)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">Claude API 費用（近 30 天）</h3>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[var(--bg-elevated)] p-3 text-center">
              <div className="text-xl font-bold text-[var(--gold)]">NT${data.apiCost.totalCostTwd}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">總費用（TWD）</div>
            </div>
            <div className="rounded-lg bg-[var(--bg-elevated)] p-3 text-center">
              <div className="text-xl font-bold text-[var(--text-primary)]">${data.apiCost.totalCostUsd}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">總費用（USD）</div>
            </div>
            <div className="rounded-lg bg-[var(--bg-elevated)] p-3 text-center">
              <div className="text-xl font-bold text-[var(--text-primary)]">{data.apiCost.totalCalls}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">API 呼叫次數</div>
            </div>
          </div>

          {/* Per-model cost */}
          {data.apiCost.byModel.length > 0 && (
            <div className="space-y-1.5">
              {data.apiCost.byModel.map((m) => (
                <div key={m.model} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)] font-mono text-xs">{m.model}</span>
                  <span className="text-[var(--text-primary)]">${m.costUsd} USD · NT${Math.round(m.costUsd * 32 * 10) / 10}</span>
                </div>
              ))}
            </div>
          )}

          {/* Daily cost chart */}
          {data.apiCost.daily.some((d) => d.costUsd > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.apiCost.daily.map((d) => ({
                ...d,
                dateLabel: new Date(d.date).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
                costTwd: Math.round(d.costUsd * 32 * 100) / 100,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="dateLabel" tick={{ fill: "var(--text-muted)", fontSize: 9 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8 }}
                  formatter={(val) => [`NT$${val}`, "費用"]}
                />
                <Bar dataKey="costTwd" fill="var(--gold)" radius={[3, 3, 0, 0]} name="費用 (TWD)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">尚無 API 使用紀錄</p>
          )}
        </div>
      )}

      {/* Weakest Questions */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">最弱 10 題（錯誤率最高，至少 5 次嘗試）</h3>
        {data.weakestQuestions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">答題記錄累積後將自動顯示</p>
        ) : (
          <div className="space-y-2">
            {data.weakestQuestions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-elevated)]">
                <span className="text-xs font-mono text-[var(--text-muted)] w-6 mt-0.5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] line-clamp-2">{q.stem}</p>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {q.domain ?? "—"} · {q.difficulty} · {q.correct}/{q.attempts} 次答對
                  </div>
                </div>
                <span className="text-lg font-bold font-mono text-[var(--error)] flex-shrink-0">{q.errorRate}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
