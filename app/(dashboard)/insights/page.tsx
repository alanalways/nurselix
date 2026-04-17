"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, Minus, Target, AlertCircle, Brain, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";

interface Profile {
  domainMastery: Record<string, number>;
  topWeaknesses: string[];
  behaviorPatterns: string[];
  mistakeCounts: Record<string, number>;
  confidenceBand: "low" | "developing" | "stable" | "high";
  recentTrend: "improving" | "stable" | "declining";
  insightSummary: string | null;
  thetaHistory: number[];
  sessionsAnalysed: number;
  updatedAt: string;
}

const BEHAVIOR_LABELS: Record<string, string> = {
  always_picks_safety_not_best: "總是選最安全而非最佳答案",
  sata_underselects: "SATA 題目勾選過少",
  sata_overselects: "SATA 題目勾選過多",
  changes_correct_answer: "常改掉原本對的答案",
  skips_long_stems: "遇到長題幹容易跳過細節",
  ignores_priority_cues: "忽略優先順序關鍵字",
  delegation_confusion: "授權分工判斷混亂",
  med_calculation_errors: "藥物計算錯誤",
};

const CONFIDENCE_META: Record<string, { label: string; color: string; desc: string }> = {
  low: { label: "信心偏低", color: "text-[var(--error)]", desc: "θ < −1，需要系統性補強" },
  developing: { label: "發展中", color: "text-[var(--warning)]", desc: "−1 ≤ θ < 0，仍在建立基礎" },
  stable: { label: "穩定", color: "text-[var(--gold)]", desc: "0 ≤ θ < 1，接近通過水準" },
  high: { label: "高信心", color: "text-[var(--success)]", desc: "θ ≥ 1，通過機率高" },
};

const TREND_META: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  improving: { label: "進步中", icon: TrendingUp, color: "text-[var(--success)]" },
  stable: { label: "持平", icon: Minus, color: "text-[var(--text-secondary)]" },
  declining: { label: "下滑", icon: TrendingDown, color: "text-[var(--error)]" },
};

export default function InsightsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          setProfile(body.profile);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[var(--gold)]" size={24} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
          <Sparkles className="mx-auto text-[var(--gold)] mb-4" size={32} />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Hermes AI 還沒開始分析你</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            完成至少 1 次 NCLEX 測驗後，Hermes AI 就會自動分析你的錯誤模式、信心水準與行為習慣，並生成個人化洞察。
          </p>
          <Link href="/nclex" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] font-semibold hover:opacity-90 transition">
            <Brain size={16} /> 開始一場測驗 <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const confidence = CONFIDENCE_META[profile.confidenceBand] ?? CONFIDENCE_META.developing;
  const trend = TREND_META[profile.recentTrend] ?? TREND_META.stable;
  const TrendIcon = trend.icon;

  const sortedMistakes = Object.entries(profile.mistakeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const sortedDomains = Object.entries(profile.domainMastery)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6 max-w-6xl mx-auto"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
          <Sparkles size={18} className="text-[#080E1A]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Hermes AI 洞察</h1>
          <p className="text-sm text-[var(--text-muted)]">
            已分析 {profile.sessionsAnalysed} 次測驗 · 最後更新 {new Date(profile.updatedAt).toLocaleString("zh-TW")}
          </p>
        </div>
      </div>

      {/* Insight Summary */}
      {profile.insightSummary && (
        <div className="rounded-2xl border border-[var(--gold)] bg-gradient-to-br from-[var(--gold-dim)] to-[var(--bg-surface)] p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="text-[var(--gold)] flex-shrink-0 mt-1" size={20} />
            <div>
              <div className="text-xs text-[var(--gold)] font-semibold mb-1">AI 學習總結</div>
              <p className="text-base text-[var(--text-primary)] leading-relaxed">{profile.insightSummary}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Confidence + Trend */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="text-sm text-[var(--text-muted)] mb-3">整體狀態</div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">信心水準</span>
                <span className={`text-sm font-semibold ${confidence.color}`}>{confidence.label}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{confidence.desc}</p>
            </div>
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">近期趨勢</span>
                <span className={`flex items-center gap-1 text-sm font-semibold ${trend.color}`}>
                  <TrendIcon size={14} /> {trend.label}
                </span>
              </div>
              {profile.thetaHistory.length >= 2 && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  最近 {profile.thetaHistory.length} 次 θ：{profile.thetaHistory.slice(-5).map((t) => t.toFixed(2)).join(" → ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Top Weaknesses */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-[var(--error)]" />
            <span className="text-sm text-[var(--text-muted)]">主要弱點</span>
          </div>
          {profile.topWeaknesses.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">尚未有足夠資料判斷</p>
          ) : (
            <ul className="space-y-2">
              {profile.topWeaknesses.map((w, i) => (
                <li key={w} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--error)]/15 text-[var(--error)] flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Behaviour Patterns */}
      {profile.behaviorPatterns.length > 0 && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-[var(--warning)]" />
            <span className="text-sm text-[var(--text-muted)]">偵測到的答題行為模式</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.behaviorPatterns.map((p) => (
              <Badge key={p} variant="warning">
                {BEHAVIOR_LABELS[p] ?? p}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mistake Types */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="text-sm text-[var(--text-muted)] mb-4">錯誤類型分布</div>
          {sortedMistakes.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">尚未有資料</p>
          ) : (
            <div className="space-y-3">
              {sortedMistakes.map(([type, count]) => {
                const max = sortedMistakes[0][1] || 1;
                const pct = (count / max) * 100;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[var(--text-primary)]">{type}</span>
                      <span className="text-[var(--text-muted)]">{count} 次</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--gold)] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weakest Domains */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="text-sm text-[var(--text-muted)] mb-4">最弱的 Domain（正確率）</div>
          {sortedDomains.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">尚未有資料</p>
          ) : (
            <div className="space-y-3">
              {sortedDomains.map(([domain, mastery]) => {
                const pct = Math.round(mastery * 100);
                return (
                  <div key={domain}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[var(--text-primary)]">{domain}</span>
                      <span className={pct < 60 ? "text-[var(--error)]" : "text-[var(--text-muted)]"}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct < 60 ? "bg-[var(--error)]" : pct < 80 ? "bg-[var(--warning)]" : "bg-[var(--success)]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-[var(--text-muted)] text-center pt-4">
        Hermes AI 每完成一次測驗後自動更新 · 使用 Claude Haiku（分析）+ Sonnet（總結）
      </div>
    </motion.div>
  );
}
