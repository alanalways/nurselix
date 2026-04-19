"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, Calendar } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface StatsData {
  streak: number;
  totalQuestions: number;
  totalCorrect: number;
  totalMinutes: number;
  accuracy: number;
  examDate: string | null;
  daysToExam: number | null;
  assessmentTheta: number | null;
  assessmentAt: string | null;
  heatmap: { date: string; count: number; accuracy: number }[];
  domainBreakdown: { domain: string; done: number; correct: number; accuracy: number }[];
}

const DOMAIN_ZH: Record<string, string> = {
  "Management of Care": "管理照護",
  "Safety & Infection Control": "安全感控",
  "Health Promotion & Maintenance": "健康促進",
  "Psychosocial Integrity": "心理完整",
  "Basic Care & Comfort": "基本照護",
  "Pharmacological & Parenteral": "藥理用藥",
  "Reduction of Risk Potential": "降低風險",
  "Physiological Adaptation": "生理適應",
};

const ALL_DOMAINS = Object.keys(DOMAIN_ZH);

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!data) return <div className="p-6 text-[var(--text-muted)] text-sm">載入失敗，請重新整理</div>;

  // Radar chart data: fill zero for domains not yet attempted
  const radarData = ALL_DOMAINS.map((en) => {
    const found = data.domainBreakdown.find((d) => d.domain === en);
    return {
      domain: DOMAIN_ZH[en] ?? en,
      value: found?.accuracy ?? 0,
    };
  });

  // Heatmap grid — 30 days, 5 cols × 6 rows
  const maxCount = Math.max(1, ...data.heatmap.map((d) => d.count));
  const cellColor = (count: number): string => {
    if (count === 0) return "var(--bg-elevated)";
    const intensity = Math.min(1, count / maxCount);
    if (intensity > 0.75) return "var(--gold)";
    if (intensity > 0.5) return "rgba(201, 168, 76, 0.7)";
    if (intensity > 0.25) return "rgba(201, 168, 76, 0.4)";
    return "rgba(201, 168, 76, 0.2)";
  };

  const weekStudyDays = data.heatmap.slice(-7).filter((d) => d.count > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-5xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">學習統計</h1>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "累計掌握", value: data.totalCorrect.toLocaleString() },
          { label: "總答題數", value: data.totalQuestions.toLocaleString() },
          { label: "連續天數", value: `${data.streak} 天` },
          { label: "本週學習", value: `${weekStudyDays}/7 天` },
          { label: "累計時長", value: `${Math.round(data.totalMinutes / 60)} 時` },
          { label: "考前倒數", value: data.daysToExam !== null ? `${data.daysToExam} 天` : "未設定" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
            <div className="text-lg font-bold font-mono text-[var(--gold)]">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {data.assessmentTheta !== null && (
        <div className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--blue-dim)] border border-[var(--gold)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-[var(--gold)]" />
            <div>
              <div className="text-sm text-[var(--text-muted)]">最近評估能力</div>
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                θ = {data.assessmentTheta.toFixed(2)}
              </div>
              {data.assessmentAt && (
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {new Date(data.assessmentAt).toLocaleDateString("zh-TW")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">各 Domain 掌握度</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          {data.totalQuestions === 0 ? "答題後此圖將自動更新" : `基於近 30 天 ${data.totalQuestions} 題練習`}
        </p>
        <div className="space-y-2">
          {ALL_DOMAINS.map((en) => {
            const found = data.domainBreakdown.find((d) => d.domain === en);
            const zh = DOMAIN_ZH[en];
            return (
              <div key={en} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)] w-20 shrink-0">{zh}</span>
                <div className="flex-1 h-5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      (found?.accuracy ?? 0) >= 70 ? "bg-[var(--success)]" : (found?.accuracy ?? 0) >= 50 ? "bg-[var(--gold)]" : "bg-[var(--warning)]"
                    }`}
                    style={{ width: `${found?.accuracy ?? 0}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-[var(--text-muted)] w-16 text-right">
                  {found ? `${found.correct}/${found.done}` : "--"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-3">八大 Domain 雷達圖</h3>
          {data.totalQuestions === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <div className="text-4xl mb-1">🎯</div>
              <p className="text-sm font-medium text-[var(--text-primary)]">完成第一題後雷達圖就會出現</p>
              <p className="text-xs text-[var(--text-muted)]">持續練習，追蹤你八大 Domain 的掌握度</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border-default)" />
                <PolarAngleAxis dataKey="domain" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <Radar
                  name="掌握度"
                  dataKey="value"
                  stroke="var(--gold)"
                  fill="var(--gold)"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-[var(--gold)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">近 30 天熱力圖</h3>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {data.heatmap.map((d) => (
              <div
                key={d.date}
                title={`${d.date} · ${d.count} 題${d.count > 0 ? ` · ${d.accuracy}% 正確率` : ""}`}
                className="aspect-square rounded border border-[var(--border-subtle)]"
                style={{ backgroundColor: cellColor(d.count) }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-[var(--text-muted)]">
            <span>較少</span>
            <div className="flex gap-1">
              {[0, 0.25, 0.5, 0.75, 1].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: cellColor(i * maxCount) }}
                />
              ))}
            </div>
            <span>較多</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
