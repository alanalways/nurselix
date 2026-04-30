"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, DisplayTitle, MetaText, PaperCard, JournalRow, JournalCta, Pill, StatNumber, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";
import type { TabKey } from "./types";

interface AuditSession {
  id: string;
  label: string;
  status: string;
  targetTotal: number;
  processedCount: number;
  changedCount: number;
  unchangedCount: number;
  flaggedCount: number;
  startedAt: string;
  finishedAt: string | null;
}

interface DashboardData {
  timestamp: string;
  health: { today: any; trend: any[] };
  questions: { total: number; approved: number; draft: number; archived: number };
  issues: { openCount: number; critical: any[] };
  reports: { pendingCount: number; totalCount: number; recent: any[] };
  recentChanges: any[];
  agentStatus: any[];
  marketing: { drafts: any[] };
  auditProgress?: {
    nclexTotal: number;
    auditedCount: number;
    auditPercent: number;
    remaining: number;
    agentIssuesTotal: number;
    severityBreakdown: Record<string, { open: number; resolved: number }>;
    manualResolvedCount: number;
    last24hFindings: number;
    heartbeat?: {
      at: string;
      qid?: string;
      verdict?: string | null;
      modelUsed?: string | null;
      done?: number;
      total?: number;
      ok?: number;
      fix?: number;
      unc?: number;
      err?: number;
      workers?: number;
      updatedAt: string;
      ageSeconds: number;
      ageMinutes: number;
      status: "alive" | "stale" | "dead";
    } | null;
  };
}

export default function OverviewTab({ onJump }: { onJump: (k: TabKey) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAudit, setActiveAudit] = useState<AuditSession | null>(null);

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

  const loadAudit = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/audit-sessions", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      const sessions: AuditSession[] = j?.sessions ?? [];
      const active = sessions.find(s => s.status === "ACTIVE") ?? null;
      setActiveAudit(active);
    } catch { /* silent — KPI optional */ }
  }, []);
  useEffect(() => { loadAudit(); const t = setInterval(loadAudit, 30_000); return () => clearInterval(t); }, [loadAudit]);

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

  const auditHb = data.auditProgress?.heartbeat;
  const auditDead = auditHb?.status === "dead";

  return (
    <div className="space-y-12">
      {/* Editorial grid: 2fr / 1fr */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-14">
        {/* LEFT — lead story + features */}
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <SectionLabel>Today's Lead</SectionLabel>
            {auditDead && auditHb && (
              <button
                onClick={() => onJump("agents")}
                className="italic text-[var(--j-red)] border border-[var(--j-red)] bg-[var(--j-red)]/8 px-3 py-1.5 text-[12px] tracking-wide hover:bg-[var(--j-red)]/15 hover:-translate-y-px transition-all cursor-pointer"
                style={FONT_DISPLAY}
                title="點擊跳到 Agent 控制台"
              >
                ⚠ NIM 審題系統卡住超過 30 分鐘 (上次活動: {auditHb.ageMinutes}m ago)
              </button>
            )}
          </div>
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

          {/* NIM Audit Progress — live worker on Zeabur */}
          {data.auditProgress && (() => {
            const hb = data.auditProgress.heartbeat;
            const dotColor = !hb ? "var(--j-ink-dim)"
              : hb.status === "alive" ? "var(--j-phosphor)"
              : hb.status === "stale" ? "#d4a017"
              : "var(--j-red)";
            const dotPulse = hb?.status === "alive";
            return (
            <div className="border border-[var(--j-line-strong)] p-4 mb-5 bg-[var(--j-bg-card)]">
              <SectionLabel className="!mt-0 mb-3 flex items-center gap-2">
                <span className={cn("w-1.5 h-1.5 rounded-full", dotPulse && "animate-pulse")}
                  style={{ background: dotColor }} />
                NIM Audit · 自動審題
              </SectionLabel>

              {/* Heartbeat status — TRUTH source for "is NIM alive" */}
              <div className="border-b border-[var(--j-line)] pb-3 mb-3">
                {hb ? (
                  <>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] tracking-[0.1em] uppercase" style={{ ...FONT_MONO, color: dotColor }}>
                        {hb.status === "alive" ? "ALIVE · 正在審題" : hb.status === "stale" ? "SLOW · 變慢" : "DOWN · 卡住了"}
                      </span>
                      <span className="text-[10px] text-[var(--j-ink-dim)]" style={FONT_MONO}>
                        {hb.ageMinutes < 1 ? `${hb.ageSeconds}s` : `${hb.ageMinutes}m`} ago
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--j-ink-dim)] mt-1" style={FONT_ZH}>
                      最後審題: <span className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>{new Date(hb.updatedAt).toLocaleString("zh-TW", { hour12: false })}</span>
                      {hb.workers && <span className="ml-2">· workers={hb.workers}</span>}
                    </div>
                    {hb.status !== "alive" && (
                      <div className="text-[10px] text-[var(--j-red)] mt-1" style={FONT_ZH}>
                        {hb.status === "dead" ? "→ 去 Zeabur 看 audit-worker logs" : "→ NIM 回應變慢，先觀察 5-10 分鐘"}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] text-[var(--j-ink-dim)]" style={FONT_ZH}>
                    <span className="italic" style={FONT_DISPLAY}>等待 audit-worker 第一筆心跳…</span>
                  </div>
                )}
              </div>

              {/* big % */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="italic tracking-tight text-[var(--j-ink)] leading-none"
                  style={{ fontFamily: "var(--font-display)", fontSize: "2.8rem", letterSpacing: "-0.03em" }}>
                  {data.auditProgress.auditPercent}%
                </span>
                <span className="text-xs text-[var(--j-ink-dim)]" style={FONT_MONO}>
                  {data.auditProgress.auditedCount.toLocaleString()} / {data.auditProgress.nclexTotal.toLocaleString()}
                </span>
              </div>
              {/* progress bar */}
              <div className="h-1.5 bg-[var(--j-line)] mb-3 overflow-hidden">
                <div className="h-full bg-[var(--j-phosphor)] transition-all"
                  style={{ width: `${Math.min(100, data.auditProgress.auditPercent)}%` }} />
              </div>
              <div className="text-[11px] text-[var(--j-ink-dim)] mb-3" style={FONT_ZH}>
                剩 <span className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>{data.auditProgress.remaining.toLocaleString()}</span> 題未審。
                過去 24h 新發現 <span className="italic text-[var(--j-phosphor)]" style={FONT_DISPLAY}>{data.auditProgress.last24hFindings}</span> 件問題。
              </div>
              {/* severity breakdown */}
              <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-[var(--j-line)] pt-3" style={FONT_MONO}>
                {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(sev => {
                  const b = data.auditProgress!.severityBreakdown[sev] || { open: 0, resolved: 0 };
                  const tone = sev === "CRITICAL" ? "var(--j-red)" : sev === "HIGH" ? "var(--j-ink)" : "var(--j-ink-dim)";
                  return (
                    <div key={sev} className="flex justify-between items-baseline">
                      <span style={{ color: tone, fontSize: "9px", letterSpacing: "0.1em" }}>{sev}</span>
                      <span className="text-[var(--j-ink)] italic" style={FONT_DISPLAY}>
                        {b.open}<span className="text-[var(--j-ink-dim)] not-italic" style={FONT_MONO}>/{b.open + b.resolved}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-[var(--j-line)] pt-3 mt-3 text-[10px] text-[var(--j-ink-dim)] flex justify-between" style={FONT_MONO}>
                <span>已修補</span>
                <span className="text-[var(--j-phosphor)] italic" style={FONT_DISPLAY}>
                  {data.auditProgress.manualResolvedCount.toLocaleString()} resolved
                </span>
              </div>
            </div>
            );
          })()}

          {/* Claude Manual Audit — active session progress */}
          <div className="border border-[var(--j-line-strong)] p-4 mb-5 bg-[var(--j-bg-card)]">
            <SectionLabel className="!mt-0 mb-3">● 人工審題 · Claude</SectionLabel>
            {activeAudit ? (() => {
              const target = Math.max(1, activeAudit.targetTotal);
              const pct = Math.min(100, Math.round((activeAudit.processedCount / target) * 100));
              return (
                <>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="italic tracking-tight text-[var(--j-ink)] leading-none"
                      style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", letterSpacing: "-0.03em" }}>
                      {activeAudit.processedCount.toLocaleString()}
                    </span>
                    <span className="text-xs text-[var(--j-ink-dim)]" style={FONT_MONO}>
                      / {activeAudit.targetTotal.toLocaleString()}
                    </span>
                    <span className="ml-auto text-[11px] italic text-[var(--j-phosphor)]" style={FONT_DISPLAY}>
                      {pct}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--j-ink-dim)] mb-3 tracking-wider uppercase truncate" style={FONT_MONO}>
                    {activeAudit.label}
                  </div>
                  <div className="h-1.5 bg-[var(--j-line)] mb-3 overflow-hidden">
                    <div className="h-full bg-[var(--j-phosphor)] transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] border-t border-[var(--j-line)] pt-3" style={FONT_MONO}>
                    <div className="flex flex-col">
                      <span className="text-[9px] tracking-[0.1em] uppercase text-[var(--j-ink-dim)]">edited</span>
                      <span className="text-[var(--j-ink)] italic" style={FONT_DISPLAY}>
                        {activeAudit.changedCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] tracking-[0.1em] uppercase text-[var(--j-ink-dim)]">unchanged</span>
                      <span className="text-[var(--j-ink)] italic" style={FONT_DISPLAY}>
                        {activeAudit.unchangedCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] tracking-[0.1em] uppercase text-[var(--j-red)]">flagged</span>
                      <span className="text-[var(--j-ink)] italic" style={FONT_DISPLAY}>
                        {activeAudit.flaggedCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              );
            })() : (
              <div className="py-2 text-[12px] italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
                — 暫無進行中審題
              </div>
            )}
          </div>

          {/* Agent teams — recent hermes jobs */}
          <div className="border border-[var(--j-line-strong)] p-4 mb-5 bg-[var(--j-bg-card)]">
            <SectionLabel className="!mt-0 mb-3">● Agent teams · 工人們</SectionLabel>
            {!data.agentStatus || data.agentStatus.length === 0 ? (
              <div className="py-2 text-[12px] italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
                — No agent jobs yet
              </div>
            ) : (
              <div>
                {data.agentStatus.slice(0, 5).map((job: any) => {
                  const tone =
                    job.status === "running" ? "phosphor"
                    : job.status === "done" ? "muted"
                    : job.status === "error" ? "danger"
                    : "warning";
                  const sid = typeof job.sessionId === "string" && job.sessionId.length >= 8
                    ? job.sessionId.slice(-8)
                    : (job.sessionId || "—");
                  const errSummary = typeof job.error === "string"
                    ? job.error.split("\n")[0].slice(0, 80)
                    : null;
                  return (
                    <div key={job.id} className="py-2 border-b border-[var(--j-line)]/60 last:border-b-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <Pill tone={tone}>{job.status}</Pill>
                        <span className="text-[var(--j-ink-dim)] text-[11px]" style={FONT_MONO}>
                          {sid}
                        </span>
                        <MetaText className="ml-auto">
                          {new Date(job.createdAt).toLocaleString("zh-TW", { hour12: false })}
                        </MetaText>
                      </div>
                      {job.status === "error" && errSummary && (
                        <div className="text-[10px] text-[var(--j-red)] mt-1 italic" style={FONT_DISPLAY}>
                          {errSummary}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
    <div style={{ width: "100%", height: 80 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sorted} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="period"
            tickFormatter={(p: string) => (typeof p === "string" ? p.slice(5) : "")}
            tick={{ fontSize: 9, fill: "var(--j-ink-dim)", fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--j-line)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            hide
          />
          <Tooltip
            cursor={{ stroke: "var(--j-line-strong)", strokeDasharray: "2 2" }}
            contentStyle={{
              background: "var(--j-ink, #111)",
              border: "none",
              borderRadius: 0,
              padding: "6px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
            labelStyle={{ display: "none" }}
            itemStyle={{ color: "var(--j-bg, #f3efe4)" }}
            formatter={(value: any, _name: any, item: any) => {
              const period = item?.payload?.period ?? "";
              return [`score: ${value} · ${period}`, ""];
            }}
            separator=""
          />
          <Line
            type="monotone"
            dataKey="healthScore"
            stroke="var(--j-phosphor, #1a8b56)"
            strokeWidth={2}
            dot={{ r: 2, fill: "var(--j-phosphor, #1a8b56)", strokeWidth: 0 }}
            activeDot={{ r: 3.5, fill: "var(--j-phosphor, #1a8b56)", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
