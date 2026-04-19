"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, CalendarDays, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";

interface BriefingData {
  todayDone: number;
  dailyGoal: number;
  daysToExam: number | null;
  streak: number;
}

export default function TodayBriefing() {
  const [data, setData] = useState<BriefingData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, settingsRes] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/user/settings", { cache: "no-store" }),
        ]);
        const stats = statsRes.ok ? await statsRes.json() : null;
        const settings = settingsRes.ok ? await settingsRes.json() : null;
        if (stats) {
          setData({
            todayDone: stats.heatmap?.at(-1)?.count ?? 0,
            dailyGoal: settings?.dailyGoal ?? 10,
            daysToExam: stats.daysToExam ?? null,
            streak: stats.streak ?? 0,
          });
        }
      } catch {
        // silent
      }
    })();
  }, []);

  const pct = data ? Math.min(100, (data.todayDone / data.dailyGoal) * 100) : 0;
  const remaining = data ? Math.max(0, data.dailyGoal - data.todayDone) : null;
  const done = data?.todayDone ?? 0;
  const goalMet = data ? done >= data.dailyGoal : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden"
    >
      {/* Gold progress stripe */}
      <div className="h-1 bg-[var(--bg-elevated)]">
        <motion.div
          className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      <div className="p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Today stats */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--gold-dim)] flex items-center justify-center flex-shrink-0">
                <Target size={18} className="text-[var(--gold)]" />
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">今日進度</div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
                  {done}
                  <span className="text-sm text-[var(--text-muted)] font-normal"> / {data?.dailyGoal ?? "--"}</span>
                </div>
              </div>
            </div>

            {data?.daysToExam != null && (
              <div className="flex items-center gap-2 pl-4 border-l border-[var(--border-subtle)]">
                <CalendarDays size={16} className="text-[var(--blue)] flex-shrink-0" />
                <div>
                  <div className="text-xs text-[var(--text-muted)]">考試倒數</div>
                  <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
                    {data.daysToExam}
                    <span className="text-sm text-[var(--text-muted)] font-normal"> 天</span>
                  </div>
                </div>
              </div>
            )}

            {(data?.streak ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 pl-4 border-l border-[var(--border-subtle)]">
                <Flame size={16} className="text-[var(--warning)] flex-shrink-0" />
                <div>
                  <div className="text-xs text-[var(--text-muted)]">連續</div>
                  <div className="text-lg font-bold font-mono text-[var(--text-primary)]">
                    {data?.streak}
                    <span className="text-sm text-[var(--text-muted)] font-normal"> 天</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <Link
            href="/nclex/practice"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            {goalMet ? "繼續練習" : `再答 ${remaining} 題`}
            <ChevronRight size={14} />
          </Link>
        </div>

        {goalMet && (
          <p className="text-xs text-[var(--success)] mt-3">🎉 今日目標已達成！你已累積掌握 {done} 題。</p>
        )}
      </div>
    </motion.div>
  );
}
