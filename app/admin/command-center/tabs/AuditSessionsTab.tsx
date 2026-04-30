"use client";
/**
 * AuditSessionsTab — Claude 親自審題的 session 進度與 rollback。
 * 視覺風格延用 journal-ui（cream paper + phosphor green + serif italic）。
 *
 * 資料來源：
 *   GET  /api/admin/audit-sessions            列出所有 session
 *   GET  /api/admin/audit-sessions/[id]       取得單一 session 與最近 decisions
 *   POST /api/admin/audit-sessions/[id]/rollback  rollback 整個 session 的所有改動
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils/cn";
import {
  SectionLabel,
  DisplayTitle,
  MetaText,
  PaperCard,
  JournalRow,
  JournalCta,
  Pill,
  StatNumber,
  ReaderText,
  FONT_DISPLAY,
  FONT_ZH,
  FONT_MONO,
} from "./journal-ui";

interface AuditSession {
  id: string;
  label: string | null;
  status: "ACTIVE" | "COMPLETED" | "ROLLED_BACK" | "PAUSED" | string;
  targetTotal: number;
  processedCount: number;
  changedCount: number;
  unchangedCount: number;
  flaggedCount: number;
  startedAt: string;
  finishedAt: string | null;
  notes: string | null;
}

interface AuditDecision {
  id: string;
  questionId: string;
  decision: string;
  confidence: number | null;
  reasoning: string | null;
  changeSummary: string | null;
  rolledBack: boolean;
  createdAt: string;
}

const REFRESH_MS = 30_000;

function statusTone(status: string): "phosphor" | "muted" | "danger" | "warning" | "neutral" {
  switch (status) {
    case "ACTIVE":      return "phosphor";
    case "COMPLETED":   return "muted";
    case "ROLLED_BACK": return "danger";
    case "PAUSED":      return "warning";
    default:            return "neutral";
  }
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("zh-TW", { hour12: false }); }
  catch { return iso; }
}

function fmtDuration(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 1) return `${h}h ${m}m`;
  if (m >= 1) return `${m}m`;
  return `${s}s`;
}

function truncate(s: string | null | undefined, n = 80): string {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function AuditSessionsTab() {
  const [sessions, setSessions] = useState<AuditSession[] | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<AuditDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/audit-sessions", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const list: AuditSession[] = j.sessions ?? [];
      setSessions(list);
      setError(null);

      // Active session 的最近 decisions
      const active = list.find(s => s.status === "ACTIVE") ?? list[0];
      if (active) {
        try {
          const dr = await fetch(`/api/admin/audit-sessions/${active.id}`, { cache: "no-store" });
          if (dr.ok) {
            const dj = await dr.json();
            setRecentDecisions((dj.recentDecisions ?? []).slice(0, 20));
          }
        } catch { /* ignore decision fetch errors */ }
      } else {
        setRecentDecisions([]);
      }
    } catch (e: any) {
      setError(e?.message ?? "fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const activeSession = useMemo(
    () => sessions?.find(s => s.status === "ACTIVE") ?? null,
    [sessions],
  );
  const historicalSessions = useMemo(
    () => (sessions ?? []).filter(s => s.status !== "ACTIVE"),
    [sessions],
  );

  const handleRollback = useCallback(async (s: AuditSession) => {
    const label = s.label || s.id.slice(-8);
    if (!confirm(`確定 rollback session "${label}" 的所有改動嗎？此動作會把該 session 編輯過的題目還原回原始版本。`)) return;
    setRollingBackId(s.id);
    try {
      const r = await fetch(`/api/admin/audit-sessions/${s.id}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
      showToast(`✓ 已 rollback ${j.rolledBack ?? 0} 件${j.failed ? ` · 失敗 ${j.failed}` : ""}`);
      load();
    } catch (e: any) {
      showToast(`✗ rollback 失敗：${e?.message ?? "unknown"}`);
    } finally {
      setRollingBackId(null);
    }
  }, [load, showToast]);

  // Loading state
  if (loading && !sessions) {
    return (
      <div className="flex items-center gap-2 text-[var(--j-ink-dim)] py-6 italic" style={FONT_DISPLAY}>
        <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} />
        Reading audit sessions…
      </div>
    );
  }

  // Error state with retry
  if (error && !sessions) {
    return (
      <div className="py-6 space-y-3">
        <div className="text-[var(--j-red)]" style={FONT_ZH}>錯誤：{error}</div>
        <JournalCta onClick={() => { setLoading(true); load(); }}>retry</JournalCta>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 px-4 py-3 border border-[var(--j-line-strong)] bg-[var(--j-bg)] shadow-lg italic"
          style={FONT_DISPLAY}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[var(--j-line-strong)] pb-4">
        <SectionLabel>● Audit Sessions · Claude 親自審題</SectionLabel>
        <div className="flex items-baseline justify-between gap-4 flex-wrap mt-2">
          <DisplayTitle size="lg">Setting the type…</DisplayTitle>
          <button
            onClick={load}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] transition"
            style={FONT_MONO}
          >
            <RefreshCw size={12} /> refresh
          </button>
        </div>
        <ReaderText dim className="mt-3 max-w-[640px] text-sm">
          Claude 親自重新審查 14323 NCLEX 題目的進度。每 30 秒自動更新。
        </ReaderText>
      </header>

      {/* Empty state */}
      {sessions && sessions.length === 0 && (
        <div className="py-10 text-center text-[var(--j-ink-dim)] italic" style={FONT_DISPLAY}>
          — 還沒有 audit session 記錄
        </div>
      )}

      {/* Active session block */}
      {activeSession && (
        <ActiveSessionPanel session={activeSession} />
      )}

      {/* Recent decisions */}
      {activeSession && (
        <RecentDecisions decisions={recentDecisions} />
      )}

      {/* Historical sessions */}
      {historicalSessions.length > 0 && (
        <section>
          <SectionLabel>Historical · 過往 session</SectionLabel>
          <div className="mt-3 border-t border-[var(--j-line-strong)]">
            {historicalSessions.map(s => {
              const pct = s.targetTotal > 0
                ? Math.round((s.processedCount / s.targetTotal) * 100)
                : 0;
              const isBusy = rollingBackId === s.id;
              const canRollback = s.status !== "ROLLED_BACK" && s.changedCount > 0;
              return (
                <JournalRow key={s.id}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <Pill tone={statusTone(s.status)}>{s.status}</Pill>
                      <span className="italic text-[var(--j-ink)] text-base" style={FONT_DISPLAY}>
                        {s.label || s.id.slice(-8)}
                      </span>
                      <MetaText>{s.id.slice(-8)}</MetaText>
                      <span className="text-[var(--j-ink-dim)] text-xs" style={FONT_MONO}>
                        {fmtDateTime(s.startedAt)}
                      </span>
                      {s.finishedAt && (
                        <span className="text-[var(--j-ink-dim)] text-xs" style={FONT_MONO}>
                          → {fmtDateTime(s.finishedAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-3 flex-wrap justify-end">
                      <span className="text-xs text-[var(--j-ink-dim)]" style={FONT_MONO}>
                        <span className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>
                          {s.processedCount.toLocaleString()}
                        </span>
                        /{s.targetTotal.toLocaleString()} ({pct}%)
                      </span>
                      <span className="text-xs text-[var(--j-phosphor)]" style={FONT_MONO}>
                        edited {s.changedCount}
                      </span>
                      <span className="text-xs text-[var(--j-ink-dim)]" style={FONT_MONO}>
                        unchanged {s.unchangedCount}
                      </span>
                      <span className="text-xs" style={{ ...FONT_MONO, color: "#c77a28" }}>
                        flagged {s.flaggedCount}
                      </span>
                      <button
                        onClick={() => canRollback && !isBusy && handleRollback(s)}
                        disabled={!canRollback || isBusy}
                        className={cn(
                          "px-3 py-1 text-[10px] tracking-[0.15em] uppercase border transition",
                          canRollback && !isBusy
                            ? "border-[var(--j-red)]/40 text-[var(--j-red)] hover:bg-[var(--j-red)]/8 cursor-pointer"
                            : "border-[var(--j-line)] text-[var(--j-ink-muted)] cursor-not-allowed opacity-50",
                        )}
                        style={FONT_MONO}
                        title={canRollback ? "rollback 此 session 的所有改動" : "無法 rollback"}
                      >
                        {isBusy ? "…" : "rollback"}
                      </button>
                    </div>
                  </div>
                  {s.notes && (
                    <div className="mt-1 text-xs text-[var(--j-ink-dim)] italic" style={FONT_DISPLAY}>
                      {truncate(s.notes, 120)}
                    </div>
                  )}
                </JournalRow>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/* ----------------------------- Active session ---------------------------- */

function ActiveSessionPanel({ session }: { session: AuditSession }) {
  const target = Math.max(1, session.targetTotal);
  const processed = session.processedCount;
  const remaining = Math.max(0, target - processed);
  const pct = Math.min(100, Math.round((processed / target) * 100));

  // 預估剩餘時間 = remaining / rate
  const startedAtMs = new Date(session.startedAt).getTime();
  const elapsedMs = Date.now() - startedAtMs;
  const ratePerMs = processed > 0 && elapsedMs > 0 ? processed / elapsedMs : 0;
  const etaMs = ratePerMs > 0 ? remaining / ratePerMs : 0;
  const etaLabel = ratePerMs > 0 ? fmtDuration(etaMs) : "—";

  const pieData = [
    { name: "edited",    value: session.changedCount,   color: "var(--j-phosphor)" },
    { name: "unchanged", value: session.unchangedCount, color: "var(--j-ink)" },
    { name: "flagged",   value: session.flaggedCount,   color: "#c77a28" },
    { name: "remaining", value: remaining,              color: "var(--j-line)" },
  ];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
      {/* LEFT — progress card */}
      <PaperCard className="p-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Pill tone="phosphor">ACTIVE</Pill>
            <span className="italic text-[var(--j-ink)] text-xl" style={FONT_DISPLAY}>
              {session.label || session.id.slice(-8)}
            </span>
          </div>
          <MetaText>{session.id.slice(-12)}</MetaText>
        </div>

        {/* Big % */}
        <div className="flex items-baseline gap-3 mb-3">
          <span
            className="italic tracking-tight text-[var(--j-ink)] leading-none"
            style={{ fontFamily: "var(--font-display)", fontSize: "3.6rem", letterSpacing: "-0.03em" }}
          >
            {pct}%
          </span>
          <span className="text-sm text-[var(--j-ink-dim)]" style={FONT_MONO}>
            {processed.toLocaleString()} / {target.toLocaleString()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-[var(--j-line)] mb-4 overflow-hidden">
          <div
            className="h-full bg-[var(--j-phosphor)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-4 border-t border-[var(--j-line)] pt-4 mb-4">
          <div>
            <MetaText>edited</MetaText>
            <StatNumber value={session.changedCount.toLocaleString()} />
          </div>
          <div>
            <MetaText>unchanged</MetaText>
            <StatNumber value={session.unchangedCount.toLocaleString()} />
          </div>
          <div>
            <MetaText>flagged</MetaText>
            <div className="flex items-baseline gap-2">
              <span
                className="italic tracking-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "2.25rem",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: "#c77a28",
                }}
              >
                {session.flaggedCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Time meta */}
        <div className="grid grid-cols-2 gap-4 text-xs border-t border-[var(--j-line)] pt-3">
          <div>
            <MetaText>started</MetaText>
            <div className="italic text-[var(--j-ink)] mt-1 text-sm" style={FONT_DISPLAY}>
              {fmtDateTime(session.startedAt)}
            </div>
          </div>
          <div>
            <MetaText>eta · 剩餘</MetaText>
            <div className="italic text-[var(--j-phosphor)] mt-1 text-sm" style={FONT_DISPLAY}>
              {etaLabel} · {remaining.toLocaleString()} 題
            </div>
          </div>
        </div>

        {session.notes && (
          <div className="mt-4 pt-3 border-t border-[var(--j-line)] text-xs text-[var(--j-ink-dim)]" style={FONT_ZH}>
            {session.notes}
          </div>
        )}
      </PaperCard>

      {/* RIGHT — pie chart */}
      <PaperCard className="p-6">
        <SectionLabel className="!mt-0 mb-2">Composition · 進度組成</SectionLabel>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={1}
                stroke="var(--j-bg-card)"
                strokeWidth={1}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--j-bg)",
                  border: "1px solid var(--j-line-strong)",
                  borderRadius: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--j-ink)",
                }}
                formatter={(v: any, name: any) => [String(v), String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]" style={FONT_MONO}>
          {pieData.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2 h-2 inline-block" style={{ background: d.color }} />
              <span className="text-[var(--j-ink-dim)] uppercase tracking-wider">{d.name}</span>
              <span className="ml-auto italic text-[var(--j-ink)]" style={FONT_DISPLAY}>
                {d.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </PaperCard>
    </section>
  );
}

/* ---------------------------- Recent decisions --------------------------- */

function RecentDecisions({ decisions }: { decisions: AuditDecision[] }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <SectionLabel>Recent decisions · 最近 20 筆</SectionLabel>
        <MetaText>auto-refresh 30s</MetaText>
      </div>
      <div className="border-t-2 border-[var(--j-line-strong)]">
        {decisions.length === 0 ? (
          <div className="py-4 text-sm italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
            — 此 session 還沒有 decision 記錄
          </div>
        ) : (
          <>
            {/* Header row */}
            <div
              className="hidden md:grid grid-cols-[110px_110px_70px_1fr_140px] gap-3 py-2 border-b border-[var(--j-line)] text-[10px] tracking-[0.15em] uppercase text-[var(--j-ink-muted)]"
              style={FONT_MONO}
            >
              <span>question</span>
              <span>decision</span>
              <span>conf.</span>
              <span>reasoning</span>
              <span className="text-right">at</span>
            </div>
            {decisions.map(d => {
              const tone =
                d.decision === "EDIT" || d.decision === "EDITED" ? "phosphor"
                : d.decision === "FLAG" || d.decision === "FLAGGED" ? "warning"
                : d.decision === "ROLLBACK" || d.rolledBack ? "danger"
                : "muted";
              const conf = d.confidence != null ? `${Math.round(d.confidence * 100)}%` : "—";
              return (
                <a
                  key={d.id}
                  href={`/admin/questions/${d.questionId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <JournalRow>
                    <div className="grid grid-cols-1 md:grid-cols-[110px_110px_70px_1fr_140px] gap-3 items-baseline">
                      <span className="text-[var(--j-ink-dim)] text-xs" style={FONT_MONO}>
                        {d.questionId.slice(-8)}
                      </span>
                      <Pill tone={tone}>{d.decision}</Pill>
                      <span className="text-xs italic text-[var(--j-ink)]" style={FONT_DISPLAY}>
                        {conf}
                      </span>
                      <span className="text-sm text-[var(--j-ink)]" style={FONT_ZH}>
                        {truncate(d.reasoning ?? d.changeSummary, 80)}
                      </span>
                      <span className="text-[10px] text-[var(--j-ink-dim)] md:text-right" style={FONT_MONO}>
                        {fmtDateTime(d.createdAt)}
                      </span>
                    </div>
                  </JournalRow>
                </a>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
