"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, DisplayTitle, MetaText, PaperCard, JournalRow, JournalCta, Pill, StatNumber, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";
import type { TabKey } from "./types";

interface DashboardData {
  timestamp: string;
  health: { today: any; trend: any[] };
  questions: { total: number; approved: number; draft: number; archived: number };
  issues: { openCount: number; critical: any[] };
  reports: { pendingCount: number; totalCount: number; recent: any[] };
  recentChanges: any[];
  agentStatus: any[];
  marketing: { drafts: any[] };
}

export default function OverviewTab({ onJump }: { onJump: (k: TabKey) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/command-center", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  if (loading && !data) return (
    <div className="flex items-center gap-2 text-[var(--j-ink-dim)] py-6 italic" style={FONT_DISPLAY}>
      <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} /> Reading today's edition…
    </div>
  );
  if (error) return (
    <div className="text-[var(--j-red)] py-6">
      錯誤：{error} <button onClick={load} className="underline ml-2 italic" style={FONT_DISPLAY}>retry</button>
    </div>
  );
  if (!data) return null;

  const score = data.health.today?.healthScore ?? null;
  const yesterday = data.health.trend?.[1]?.healthScore ?? null;
  const scoreDelta = score !== null && yesterday !== null ? score - yesterday : null;
  const scoreLabel = score === null ? "—"
    : score >= 90 ? "良好 · in good order"
    : score >= 70 ? "注意 · keep an eye"
    : "警示 · attention";

  return (
    <div className="space-y-12">
      {/* Editorial grid: 2fr / 1fr */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-14">
        {/* LEFT — lead story + features */}
        <div>
          <SectionLabel className="mb-4">Today's Lead</SectionLabel>
          <h2 className="italic tracking-tight text-[var(--j-ink)] leading-[0.92] mb-4"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 5vw, 4.5rem)", letterSpacing: "-0.025em" }}>
            {score !== null && score >= 90 ? "All in order today." : score !== null && score >= 70 ? "A few notes to attend." : "Some things to read closely."}
          </h2>
          <p className="text-base lg:text-[17px] leading-[1.8] text-[var(--j-ink-dim)] mb-8 max-w-[560px]" style={FONT_ZH}>
            題庫 <span className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>{data.questions.total.toLocaleString()}</span> 題,
            待處理問題 <span className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>{data.issues.openCount}</span> 件,
            其中 <span className="italic text-[var(--j-red)]" style={FONT_DISPLAY}>{data.issues.critical?.length ?? 0}</span> 件需立即處置。
            最近 <span className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>{data.recentChanges.length}</span> 筆自動修改剛剛入庫。
          </p>

          <div className="flex flex-wrap gap-2 mb-12">
            <JournalCta primary onClick={() => onJump("quality")}>翻到 品質 · Inspect quality →</JournalCta>
            <JournalCta onClick={() => onJump("reports")}>讀者來信 · Reader letters</JournalCta>
            <button onClick={load} className="px-3 py-2 text-sm text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition" style={FONT_MONO}>
              <RefreshCw size={13} /> refresh
            </button>
          </div>

          {/* Critical issues column */}
          <div className="border-t-2 border-[var(--j-line-strong)] pt-6 mb-12">
            <div className="flex justify-between items-baseline mb-4">
              <SectionLabel>Critical · 急件</SectionLabel>
              <span className="text-[13px] italic text-[var(--j-ink-dim)] cursor-pointer hover:text-[var(--j-phosphor)]"
                onClick={() => onJump("quality")} style={FONT_DISPLAY}>
                see all {data.issues.openCount} →
              </span>
            </div>
            {data.issues.critical?.length === 0 ? (
              <div className="py-3 text-sm italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
                — Nothing on the wire. 沒有 critical 問題。
              </div>
            ) : (
              <div>
                {data.issues.critical?.slice(0, 6).map((i: any) => (
                  <Link key={i.id} href={`/admin/questions/${i.questionId}`} target="_blank">
                    <JournalRow>
                      <div className="grid grid-cols-[60px_120px_1fr] gap-4 items-baseline">
                        <span className="text-[var(--j-red)] text-[10px] tracking-[0.15em] uppercase" style={FONT_MONO}>{i.severity}</span>
                        <span className="text-[var(--j-ink-dim)] text-[10px] tracking-wider uppercase" style={FONT_MONO}>{i.ruleId}</span>
                        <span className="text-[var(--j-ink)] text-sm truncate" style={FONT_ZH}>{i.detail}</span>
                      </div>
                    </JournalRow>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent reports */}
          <div className="border-t border-[var(--j-line)] pt-6 mb-12">
            <div className="flex justify-between items-baseline mb-4">
              <SectionLabel>Letters · 讀者來信</SectionLabel>
              <span className="text-[13px] italic text-[var(--j-ink-dim)] cursor-pointer hover:text-[var(--j-phosphor)]"
                onClick={() => onJump("reports")} style={FONT_DISPLAY}>
                go to mailbox →
              </span>
            </div>
            {data.reports.recent.length === 0 ? (
              <div className="py-3 text-sm italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>— Empty post bag.</div>
            ) : (
              <div>
                {data.reports.recent.slice(0, 5).map((r: any) => (
                  <Link key={r.id} href={`/admin/questions/${r.questionId}`} target="_blank">
                    <JournalRow>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <MetaText>{new Date(r.createdAt).toLocaleDateString("zh-TW")}</MetaText>
                        <Pill tone={r.status === "PENDING" || r.status === "pending" ? "warning" : "muted"}>{r.status}</Pill>
                        <span className="text-[var(--j-ink)] italic" style={FONT_DISPLAY}>{r.reason}</span>
                        {r.detail && <span className="text-[var(--j-ink-dim)] text-sm" style={FONT_ZH}>— {r.detail}</span>}
                      </div>
                    </JournalRow>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent auto changes */}
          <div className="border-t border-[var(--j-line)] pt-6">
            <div className="flex justify-between items-baseline mb-4">
              <SectionLabel>Recent edits · 自動修改</SectionLabel>
              <MetaText>by agents</MetaText>
            </div>
            {data.recentChanges.length === 0 ? (
              <div className="py-3 text-sm italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>— No recent edits.</div>
            ) : (
              <div>
                {data.recentChanges.slice(0, 5).map((v: any) => (
                  <Link key={v.id} href={`/admin/questions/${v.questionId}`} target="_blank">
                    <JournalRow>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <MetaText>{new Date(v.createdAt).toLocaleString("zh-TW")}</MetaText>
                        {v.agentInitiated && <Pill tone="phosphor">agent</Pill>}
                        <span className="text-[var(--j-ink-dim)] text-xs" style={FONT_MONO}>{v.changedBy}</span>
                        <span className="text-[var(--j-ink)] text-sm" style={FONT_ZH}>{v.reason}</span>
                      </div>
                    </JournalRow>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — newspaper sidebar */}
        <aside>
          {/* Health score — the big number */}
          <PaperCard dark className="mb-5">
            <MetaText className="!text-[rgba(243,239,228,0.5)]">Health Score · today</MetaText>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="italic tracking-tight text-[var(--j-phosphor)] leading-none"
                style={{ fontFamily: "var(--font-display)", fontSize: "5rem", letterSpacing: "-0.04em" }}>
                {score !== null ? score : "—"}
              </span>
              {scoreDelta !== null && (
                <span className="text-[11px] text-[var(--j-phosphor)] tracking-wider" style={FONT_MONO}>
                  {scoreDelta > 0 ? <TrendingUp size={12} className="inline mr-1" /> : scoreDelta < 0 ? <TrendingDown size={12} className="inline mr-1" /> : <Minus size={12} className="inline mr-1" />}
                  {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                </span>
              )}
            </div>
            <div className="border-t border-[rgba(243,239,228,0.2)] pt-3 mt-4 text-xs text-[rgba(243,239,228,0.75)] leading-[1.65]" style={FONT_ZH}>
              {score !== null ? (
                <>當前題庫 <span className="text-[var(--j-phosphor)]">{scoreLabel}</span>。
                  待處理 <span className="italic text-[var(--j-bg)]" style={FONT_DISPLAY}>{data.issues.openCount}</span> 件,
                  Critical <span className="italic text-[var(--j-bg)]" style={FONT_DISPLAY}>{data.issues.critical?.length ?? 0}</span> 件。</>
              ) : (
                <>今日尚未產生健康度快照。下一次自動掃描 <span className="italic">03:00 UTC</span>。</>
              )}
            </div>
          </PaperCard>

          {/* Stats stack */}
          <div className="border border-[var(--j-line-strong)] mb-5">
            {[
              ["題庫總數", data.questions.total.toLocaleString(), `核可 ${data.questions.approved}`],
              ["草稿", String(data.questions.draft), "drafts"],
              ["封存", String(data.questions.archived), "archived"],
              ["待處理回報", String(data.reports.pendingCount), `累計 ${data.reports.totalCount}`],
            ].map(([k, v, u], i) => (
              <div key={i} className={cn(
                "grid grid-cols-[1fr_auto] px-4 py-3 items-baseline",
                i < 3 && "border-b border-[var(--j-line)]"
              )}>
                <div className="text-sm text-[var(--j-ink-dim)]" style={FONT_ZH}>{k}</div>
                <StatNumber value={v} unit={u} />
              </div>
            ))}
          </div>

          {/* 7-day chart */}
          <div className="border border-[var(--j-line)] p-4 mb-5">
            <SectionLabel className="mb-3 !mt-0">Last 7 days</SectionLabel>
            <TrendChart data={data.health.trend} />
          </div>

          {/* Marketing drafts shortcut */}
          <div onClick={() => onJump("marketing")}
            className="bg-[var(--j-bg-card)] border border-[var(--j-line-strong)] p-5 cursor-pointer transition-all hover:-translate-y-px hover:border-[var(--j-phosphor)]">
            <SectionLabel className="!mt-0 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--j-phosphor)]" />
              Press Room
            </SectionLabel>
            <div className="italic tracking-tight text-[var(--j-ink)] mb-2"
              style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "-0.01em" }}>
              {data.marketing.drafts.length} drafts pending
            </div>
            <div className="text-xs text-[var(--j-ink-dim)] leading-[1.6]" style={FONT_ZH}>
              行銷部產生的內容草稿,等你審稿與發布 →
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return (
    <div className="text-[var(--j-ink-muted)] text-xs italic py-2" style={{ fontFamily: "var(--font-display)" }}>
      尚無數據 · 等待第一次掃描
    </div>
  );
  const sorted = data.slice().reverse();
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {sorted.map((d, i) => {
        const h = Math.max(8, (d.healthScore / 100) * 60);
        const isLast = i === sorted.length - 1;
        return (
          <div key={d.period} className="flex flex-col items-center gap-1">
            <div className="w-full h-[60px] flex items-end">
              <div className={cn(
                "w-full transition-all",
                isLast ? "bg-[var(--j-phosphor)]" : "bg-[var(--j-ink)] opacity-75"
              )} style={{ height: `${h}px` }} />
            </div>
            <div className="text-[9px] text-[var(--j-ink-dim)]" style={{ fontFamily: "var(--font-mono)" }}>
              {d.period.slice(8, 10)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
