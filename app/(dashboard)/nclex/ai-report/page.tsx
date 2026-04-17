"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Brain, TrendingUp, TrendingDown, Calendar, RefreshCw, Lock } from "lucide-react";
import Link from "next/link";

interface WeeklyReport {
  report: string;
  weakDomains: { domain: string; done: number; accuracy: number }[];
  strongDomains: { domain: string; done: number; accuracy: number }[];
  totalDone: number;
  accuracy: number;
  generatedAt: string;
}

interface LearningPlanWeek {
  week: number;
  theme: string;
  focusDomains: string[];
  dailyGoal: number;
  tasks: string[];
  tips: string;
}

interface LearningPlan {
  weeks: LearningPlanWeek[];
  generatedAt: string;
}

export default function AiReportPage() {
  const { data: session } = useSession();
  const isElite = (session?.user as any)?.plan === "ELITE";

  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [reportError, setReportError] = useState("");
  const [planError, setPlanError] = useState("");

  async function fetchWeeklyReport() {
    setLoadingReport(true);
    setReportError("");
    try {
      const res = await fetch("/api/ai/weekly-report");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "無法生成報告");
      setWeeklyReport(data);
    } catch (e: any) {
      setReportError(e.message);
    } finally {
      setLoadingReport(false);
    }
  }

  async function fetchLearningPlan() {
    setLoadingPlan(true);
    setPlanError("");
    try {
      const res = await fetch("/api/ai/learning-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "無法生成計畫");
      setLearningPlan(data);
    } catch (e: any) {
      setPlanError(e.message);
    } finally {
      setLoadingPlan(false);
    }
  }

  if (!isElite) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-6 px-4">
        <div className="w-16 h-16 rounded-full bg-[var(--gold-dim)] border border-[var(--gold)] flex items-center justify-center mx-auto">
          <Lock size={28} className="text-[var(--gold)]" />
        </div>
        <h1 className="text-2xl font-bold">AI 學習分析</h1>
        <p className="text-[var(--text-secondary)]">此功能為 Elite 方案專屬。升級後即可獲得 AI 週報分析與個人化學習計畫。</p>
        <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] font-semibold hover:opacity-90 transition-opacity">
          <Sparkles size={16} />
          升級至 Elite
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--gold-dim)] border border-[var(--gold)] flex items-center justify-center">
          <Sparkles size={20} className="text-[var(--gold)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI 學習分析</h1>
          <p className="text-sm text-[var(--text-secondary)]">由 Claude AI 分析您的學習數據，提供個人化建議</p>
        </div>
      </div>

      {/* Weekly Report Section */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-[var(--gold)]" />
            <h2 className="font-semibold text-lg">AI 週報分析</h2>
          </div>
          <button
            onClick={fetchWeeklyReport}
            disabled={loadingReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold-dim)] border border-[var(--gold)] text-[var(--gold)] text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingReport ? "animate-spin" : ""} />
            {loadingReport ? "生成中..." : weeklyReport ? "重新生成" : "生成報告"}
          </button>
        </div>

        {reportError && <p className="text-sm text-[var(--error)]">{reportError}</p>}

        {weeklyReport ? (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="flex-1 bg-[var(--bg-card)] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[var(--gold)]">{weeklyReport.totalDone}</div>
                <div className="text-[var(--text-secondary)]">近 30 天題數</div>
              </div>
              <div className="flex-1 bg-[var(--bg-card)] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[var(--gold)]">{weeklyReport.accuracy}%</div>
                <div className="text-[var(--text-secondary)]">整體正確率</div>
              </div>
            </div>

            {weeklyReport.weakDomains.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-[var(--error)]">
                  <TrendingDown size={14} />弱點領域
                </div>
                <div className="space-y-1.5">
                  {weeklyReport.weakDomains.map((d) => (
                    <div key={d.domain} className="flex items-center gap-3 text-sm">
                      <span className="flex-1 text-[var(--text-secondary)]">{d.domain}</span>
                      <div className="w-24 h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--error)] rounded-full" style={{ width: `${d.accuracy}%` }} />
                      </div>
                      <span className="w-10 text-right text-[var(--error)]">{d.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weeklyReport.strongDomains.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-[var(--success)]">
                  <TrendingUp size={14} />優勢領域
                </div>
                <div className="space-y-1.5">
                  {weeklyReport.strongDomains.map((d) => (
                    <div key={d.domain} className="flex items-center gap-3 text-sm">
                      <span className="flex-1 text-[var(--text-secondary)]">{d.domain}</span>
                      <div className="w-24 h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--success)] rounded-full" style={{ width: `${d.accuracy}%` }} />
                      </div>
                      <span className="w-10 text-right text-[var(--success)]">{d.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[var(--bg-card)] rounded-lg p-4 space-y-3">
              {weeklyReport.report.split("\n\n").filter(Boolean).map((para, i) => (
                <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed">{para}</p>
              ))}
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              生成時間：{new Date(weeklyReport.generatedAt).toLocaleString("zh-TW")}
            </p>
          </div>
        ) : (
          !loadingReport && (
            <p className="text-sm text-[var(--text-secondary)]">點擊「生成報告」取得您的 AI 學習分析。</p>
          )
        )}
      </section>

      {/* Learning Plan Section */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[var(--gold)]" />
            <h2 className="font-semibold text-lg">個人化學習計畫</h2>
          </div>
          <button
            onClick={fetchLearningPlan}
            disabled={loadingPlan}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold-dim)] border border-[var(--gold)] text-[var(--gold)] text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingPlan ? "animate-spin" : ""} />
            {loadingPlan ? "生成中..." : learningPlan ? "重新生成" : "生成計畫"}
          </button>
        </div>

        {planError && <p className="text-sm text-[var(--error)]">{planError}</p>}

        {learningPlan?.weeks?.length ? (
          <div className="space-y-4">
            {learningPlan.weeks.map((week) => (
              <div key={week.week} className="bg-[var(--bg-card)] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-[var(--gold)] uppercase tracking-wider">第 {week.week} 週</span>
                    <h3 className="font-semibold">{week.theme}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[var(--gold)]">{week.dailyGoal}</div>
                    <div className="text-xs text-[var(--text-secondary)]">每日目標</div>
                  </div>
                </div>

                {week.focusDomains?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {week.focusDomains.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded-full bg-[var(--gold-dim)] border border-[var(--gold)] text-[var(--gold)] text-xs">{d}</span>
                    ))}
                  </div>
                )}

                <ul className="space-y-1.5">
                  {week.tasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-0.5 w-4 h-4 rounded-full border border-[var(--border-subtle)] flex-shrink-0 flex items-center justify-center text-[10px] text-[var(--text-muted)]">{i + 1}</span>
                      {task}
                    </li>
                  ))}
                </ul>

                {week.tips && (
                  <div className="pt-2 border-t border-[var(--border-subtle)]">
                    <p className="text-xs text-[var(--text-muted)] italic">💡 {week.tips}</p>
                  </div>
                )}
              </div>
            ))}
            <p className="text-xs text-[var(--text-muted)]">
              生成時間：{new Date(learningPlan.generatedAt).toLocaleString("zh-TW")}
            </p>
          </div>
        ) : (
          !loadingPlan && (
            <p className="text-sm text-[var(--text-secondary)]">點擊「生成計畫」取得您的 4 週個人化備考計畫。</p>
          )
        )}
      </section>
    </div>
  );
}
