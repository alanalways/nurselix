"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, TrendingUp, TrendingDown, Minus, Target,
  AlertCircle, Brain, Loader2, ArrowRight, CheckCircle2,
  Calendar, Zap, BookOpen, History, Lock, Library,
} from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";

interface StudyPlanDay {
  day: number;
  focus: string;
  questions: number;
}

interface HermesReport {
  id: string;
  type: string;
  insightSummary: string | null;
  nextActions: string[];
  keyInsight: string | null;
  confidenceBand: string | null;
  recentTrend: string | null;
  weakDomains: string[];
  createdAt: string;
}

interface VocabSuggestion {
  dueCount: number;
  masteredCount: number;
  totalVocab: number;
  recommendedCategories: string[];
  suggestions: { id: string; word: string; definitionZh: string; category: string; tier: number; reason: string }[];
}

interface Profile {
  domainMastery: Record<string, number>;
  topWeaknesses: string[];
  behaviorPatterns: string[];
  mistakeCounts: Record<string, number>;
  confidenceBand: "low" | "developing" | "stable" | "high";
  recentTrend: "improving" | "stable" | "declining";
  insightSummary: string | null;
  nextActions: string[];
  studyPlan: StudyPlanDay[];
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

const CONFIDENCE_META: Record<string, { label: string; color: string; desc: string; barColor: string }> = {
  low:        { label: "信心偏低", color: "text-[var(--error)]",   barColor: "bg-[var(--error)]",   desc: "θ < −1，需要系統性補強" },
  developing: { label: "發展中",   color: "text-[var(--warning)]", barColor: "bg-[var(--warning)]", desc: "−1 ≤ θ < 0，仍在建立基礎" },
  stable:     { label: "穩定",     color: "text-[var(--gold)]",    barColor: "bg-[var(--gold)]",    desc: "0 ≤ θ < 1，接近通過水準" },
  high:       { label: "高信心",   color: "text-[var(--success)]", barColor: "bg-[var(--success)]", desc: "θ ≥ 1，通過機率高" },
};

const TREND_META: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  improving: { label: "進步中", icon: TrendingUp,  color: "text-[var(--success)]" },
  stable:    { label: "持平",   icon: Minus,       color: "text-[var(--text-secondary)]" },
  declining: { label: "下滑",   icon: TrendingDown, color: "text-[var(--error)]" },
};

const DAY_LABELS = ["", "明天", "後天", "第 3 天"];

export default function InsightsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<HermesReport[]>([]);
  const [reportsLocked, setReportsLocked] = useState(false);
  const [vocab, setVocab] = useState<VocabSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, reportsRes, vocabRes] = await Promise.all([
          fetch("/api/user/profile", { cache: "no-store" }),
          fetch("/api/user/hermes/reports", { cache: "no-store" }),
          fetch("/api/hermes/vocab-suggest", { cache: "no-store" }),
        ]);
        if (profileRes.ok) {
          const body = await profileRes.json();
          setProfile(body.profile);
        }
        if (reportsRes.ok) {
          const body = await reportsRes.json();
          setReports(body.reports ?? []);
          setReportsLocked(body.locked ?? false);
        }
        if (vocabRes.ok) {
          setVocab(await vocabRes.json());
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
            完成至少 1 次 NCLEX 測驗後，Hermes AI 就會自動分析你的錯誤模式、信心水準與行為習慣，並生成個人化洞察與學習計劃。
          </p>
          <Link
            href="/nclex"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] font-semibold hover:opacity-90 transition"
          >
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

  const nextActions = Array.isArray(profile.nextActions) ? profile.nextActions : [];
  const studyPlan   = Array.isArray(profile.studyPlan)   ? profile.studyPlan   : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6 max-w-6xl mx-auto"
    >
      {/* Header */}
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

      {/* AI Insight Summary */}
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

      {/* Next Actions + Study Plan — two column */}
      {(nextActions.length > 0 || studyPlan.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Today's Actions */}
          {nextActions.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className="text-[var(--gold)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">今日行動清單</span>
              </div>
              <ul className="space-y-3">
                {nextActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-[var(--gold)] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--text-primary)] leading-snug">{action}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/nclex"
                className="mt-4 flex items-center gap-1.5 text-xs text-[var(--gold)] hover:underline"
              >
                馬上開始練習 <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* 3-Day Study Plan */}
          {studyPlan.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-[var(--gold)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">3 天學習計劃</span>
              </div>
              <div className="space-y-3">
                {studyPlan.map((d) => (
                  <div key={d.day} className="flex items-start gap-3">
                    <div className="w-14 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-[var(--gold)]">{DAY_LABELS[d.day] ?? `Day ${d.day}`}</div>
                      <div className="text-xs text-[var(--text-muted)]">{d.questions} 題</div>
                    </div>
                    <div className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] leading-snug">
                      {d.focus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vocab recommendation */}
      {vocab && vocab.totalVocab > 0 && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Library size={16} className="text-[var(--gold)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">今日 NCLEX 單字</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[var(--warning)]">{vocab.dueCount} 到期</span>
              <span className="text-[var(--success)]">{vocab.masteredCount} 已掌握</span>
              <span className="text-[var(--text-muted)]">/ {vocab.totalVocab}</span>
            </div>
          </div>
          {vocab.recommendedCategories.length > 0 && (
            <div className="text-xs text-[var(--text-muted)] mb-3">
              根據你的弱點領域，建議優先攻克：
              {vocab.recommendedCategories.map((c) => (
                <Badge key={c} variant="gold" className="ml-1.5 text-[10px]">{c}</Badge>
              ))}
            </div>
          )}
          {vocab.suggestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {vocab.suggestions.map((w) => (
                <div key={w.id} className="px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-[var(--text-primary)]">{w.word}</div>
                    <div className="text-xs text-[var(--text-secondary)] truncate">{w.definitionZh}</div>
                  </div>
                  <Badge variant={w.reason === "due" ? "warning" : "muted"} className="text-[10px] flex-shrink-0">
                    {w.reason === "due" ? "到期" : `T${w.tier}`}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] py-2">沒有待複習的單字，太棒了！</p>
          )}
          <Link
            href="/vocab"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--gold)] hover:underline"
          >
            進入單字練習 <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Confidence + Trend | Top Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="text-sm text-[var(--text-muted)] mb-4">整體狀態</div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[var(--text-secondary)]">信心水準</span>
                <span className={`text-sm font-semibold ${confidence.color}`}>{confidence.label}</span>
              </div>
              <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${confidence.barColor}`}
                  style={{ width: profile.confidenceBand === "low" ? "25%" : profile.confidenceBand === "developing" ? "50%" : profile.confidenceBand === "stable" ? "75%" : "95%" }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">{confidence.desc}</p>
            </div>
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">近期趨勢</span>
                <span className={`flex items-center gap-1 text-sm font-semibold ${trend.color}`}>
                  <TrendIcon size={14} /> {trend.label}
                </span>
              </div>
              {profile.thetaHistory.length >= 2 && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  近 {Math.min(profile.thetaHistory.length, 5)} 次 θ：{profile.thetaHistory.slice(-5).map((t) => t.toFixed(2)).join(" → ")}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-[var(--error)]" />
            <span className="text-sm text-[var(--text-muted)]">主要弱點（Top 3）</span>
          </div>
          {profile.topWeaknesses.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">尚未有足夠資料判斷</p>
          ) : (
            <ul className="space-y-2.5">
              {profile.topWeaknesses.map((w, i) => (
                <li key={w} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--error)]/15 text-[var(--error)] flex items-center justify-center text-xs font-bold flex-shrink-0">
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

      {/* Mistake Types | Weakest Domains */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-muted)]">錯誤類型分布</span>
          </div>
          {sortedMistakes.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">尚未有資料</p>
          ) : (
            <div className="space-y-3">
              {sortedMistakes.map(([type, count]) => {
                const max = sortedMistakes[0][1] || 1;
                const pct = Math.round((count / max) * 100);
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

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="text-sm text-[var(--text-muted)] mb-4">下一步可突破的 Domain</div>
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
                      <span className="text-[var(--text-muted)]">掌握度 {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct < 60 ? "bg-[var(--warning)]" : pct < 80 ? "bg-[var(--gold)]" : "bg-[var(--success)]"}`}
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

      {/* Report History */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-[var(--gold)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">歷史分析報告</span>
          {reportsLocked && (
            <Badge variant="muted" className="ml-auto flex items-center gap-1">
              <Lock size={10} /> Plus 以上方案解鎖
            </Badge>
          )}
        </div>

        {reportsLocked ? (
          <div className="text-center py-6">
            <Lock size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)] mb-3">升級到 Plus 即可存取完整歷史報告</p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] text-sm font-semibold hover:opacity-90 transition"
            >
              查看方案 <ArrowRight size={14} />
            </Link>
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">完成測驗後 Hermes 會自動生成報告</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.type === "weekly" ? "gold" : "muted"}>
                      {r.type === "weekly" ? "週報" : "測驗分析"}
                    </Badge>
                    {r.confidenceBand && (
                      <span className={`text-xs font-medium ${
                        r.confidenceBand === "high" ? "text-[var(--success)]"
                        : r.confidenceBand === "stable" ? "text-[var(--gold)]"
                        : r.confidenceBand === "developing" ? "text-[var(--warning)]"
                        : "text-[var(--error)]"
                      }`}>
                        {r.confidenceBand === "high" ? "高信心" : r.confidenceBand === "stable" ? "穩定" : r.confidenceBand === "developing" ? "發展中" : "信心偏低"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                    {new Date(r.createdAt).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {r.insightSummary && (
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed mb-2">{r.insightSummary}</p>
                )}
                {r.weakDomains.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.weakDomains.map((d) => (
                      <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-[var(--error)]/10 text-[var(--error)]">{d}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-[var(--text-muted)] text-center pt-4">
        Hermes AI 每完成一次測驗後自動更新 · 使用 Claude Haiku（分析）+ Sonnet（總結）
      </div>
    </motion.div>
  );
}
