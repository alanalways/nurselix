"use client";
import { useEffect, useState } from "react";
import { Loader2, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, MetaText, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

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

export default function AnalyticsTab() {
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
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 text-[var(--j-ink-dim)] py-6 italic" style={FONT_DISPLAY}>
      <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} /> Reading the numbers…
    </div>
  );
  if (error || !data) return (
    <div className="text-[var(--j-red)] py-6 italic" style={FONT_DISPLAY}>{error ?? "無資料"}</div>
  );

  const mauChart = data.mauDaily.map(d => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
  }));

  return (
    <div className="space-y-8">
      {/* Domain error rates */}
      <div>
        <SectionLabel className="mb-3">Domain · 各 domain 錯誤率</SectionLabel>
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-5">
          <MetaText className="block mb-4">基於已答過的題目計算</MetaText>
          {data.domainBreakdown.length === 0 ? (
            <p className="text-sm italic text-[var(--j-ink-dim)] text-center py-8" style={FONT_DISPLAY}>
              — Awaiting reader responses.
            </p>
          ) : (
            <div className="space-y-2">
              {data.domainBreakdown.map(d => (
                <div key={d.domain} className="flex items-center gap-3">
                  <span className="text-sm text-[var(--j-ink)] w-44 shrink-0" style={FONT_ZH}>{d.domain}</span>
                  <div className="flex-1 h-4 bg-[var(--j-bg-inset)] overflow-hidden relative">
                    <div className={cn(
                      "h-full transition-all",
                      d.errorRate > 50 ? "bg-[var(--j-red)]"
                      : d.errorRate > 30 ? "bg-[#c77a28]"
                      : "bg-[var(--j-phosphor)]"
                    )}
                      style={{ width: `${d.errorRate}%` }} />
                  </div>
                  <span className={cn(
                    "text-xs italic w-12 text-right",
                    d.errorRate > 50 ? "text-[var(--j-red)]"
                    : d.errorRate > 30 ? "text-[#c77a28]"
                    : "text-[var(--j-phosphor)]"
                  )} style={FONT_DISPLAY}>
                    {d.errorRate}%
                  </span>
                  <span className="text-xs text-[var(--j-ink-muted)] w-28 text-right" style={FONT_MONO}>
                    {d.correct}/{d.attempts} · {d.items} 題
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAU Chart */}
      <div>
        <SectionLabel className="mb-3">Activity · 近 30 天 DAU / 答題數</SectionLabel>
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-5">
          {data.mauDaily.every(d => d.dau === 0) ? (
            <div className="h-40 flex items-center justify-center gap-3 text-[var(--j-ink-muted)]">
              <BarChart2 size={32} className="opacity-30" />
              <span className="text-sm italic" style={FONT_DISPLAY}>Awaiting traffic.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mauChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--j-line)" />
                <XAxis dataKey="dateLabel" tick={{ fill: "var(--j-ink-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
                <YAxis yAxisId="left" tick={{ fill: "var(--j-ink-dim)", fontSize: 11, fontFamily: "var(--font-mono)" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--j-ink-dim)", fontSize: 11, fontFamily: "var(--font-mono)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--j-bg-card)", border: "1px solid var(--j-line-strong)", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: 11 }}
                  labelStyle={{ color: "var(--j-ink)" }} />
                <Line yAxisId="left" type="monotone" dataKey="dau" stroke="var(--j-phosphor)" strokeWidth={2} dot={false} name="DAU" />
                <Line yAxisId="right" type="monotone" dataKey="questions" stroke="var(--j-ink)" strokeWidth={2} dot={false} name="答題數" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* API Cost */}
      {data.apiCost && (
        <div>
          <SectionLabel className="mb-3">Cost · Claude API 費用（近 30 天）</SectionLabel>
          <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <CostStat label="總費用 TWD" value={`NT$${data.apiCost.totalCostTwd}`} accent />
              <CostStat label="總費用 USD" value={`$${data.apiCost.totalCostUsd}`} />
              <CostStat label="API 呼叫" value={String(data.apiCost.totalCalls)} />
            </div>

            {data.apiCost.byModel.length > 0 && (
              <div className="space-y-1.5 border-t border-[var(--j-line)] pt-3">
                {data.apiCost.byModel.map(m => (
                  <div key={m.model} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--j-ink-dim)]" style={FONT_MONO}>{m.model}</span>
                    <span className="text-[var(--j-ink)] italic" style={FONT_DISPLAY}>
                      ${m.costUsd} · NT${Math.round(m.costUsd * 32 * 10) / 10}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {data.apiCost.daily.some(d => d.costUsd > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.apiCost.daily.map(d => ({
                  ...d,
                  dateLabel: new Date(d.date).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
                  costTwd: Math.round(d.costUsd * 32 * 100) / 100,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--j-line)" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "var(--j-ink-dim)", fontSize: 9, fontFamily: "var(--font-mono)" }} />
                  <YAxis tick={{ fill: "var(--j-ink-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--j-bg-card)", border: "1px solid var(--j-line-strong)", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: 11 }}
                    formatter={val => [`NT$${val}`, "費用"]} />
                  <Bar dataKey="costTwd" fill="var(--j-phosphor)" name="費用 (TWD)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm italic text-[var(--j-ink-dim)] text-center py-4" style={FONT_DISPLAY}>
                — No API calls in the last 30 days.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Weakest questions */}
      <div>
        <SectionLabel className="mb-3">Weakest · 最弱 10 題（錯誤率最高，≥5 次嘗試）</SectionLabel>
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-5">
          {data.weakestQuestions.length === 0 ? (
            <p className="text-sm italic text-[var(--j-ink-dim)] text-center py-8" style={FONT_DISPLAY}>
              — Awaiting answer history.
            </p>
          ) : (
            <div className="space-y-2">
              {data.weakestQuestions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-3 p-3 border border-[var(--j-line)]">
                  <span className="text-xs italic text-[var(--j-ink-muted)] w-6 mt-0.5" style={FONT_DISPLAY}>#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--j-ink)] line-clamp-2" style={FONT_ZH}>{q.stem}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {q.domain && <Pill tone="muted">{q.domain}</Pill>}
                      <Pill tone="muted">{q.difficulty}</Pill>
                      <MetaText>{q.correct}/{q.attempts} 對</MetaText>
                    </div>
                  </div>
                  <span className="italic text-2xl text-[var(--j-red)] flex-shrink-0" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                    {q.errorRate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CostStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-[var(--j-line)] bg-[var(--j-bg)] p-3 text-center">
      <div className={cn(
        "italic text-xl",
        accent ? "text-[var(--j-phosphor)]" : "text-[var(--j-ink)]"
      )} style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{value}</div>
      <MetaText className="block mt-1">{label}</MetaText>
    </div>
  );
}
