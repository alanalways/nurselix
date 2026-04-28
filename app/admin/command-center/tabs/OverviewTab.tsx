"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw,
  History, MessageSquareWarning, Megaphone, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
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
    <div className="flex items-center gap-2 text-[var(--text-muted)] py-6">
      <Loader2 className="animate-spin text-[var(--gold)]" size={18} /> 載入指揮中心...
    </div>
  );
  if (error) return (
    <div className="text-[var(--error)] py-6">
      錯誤：{error} <button onClick={load} className="underline ml-2 text-[var(--gold)]">重試</button>
    </div>
  );
  if (!data) return null;

  const score = data.health.today?.healthScore ?? null;
  const yesterday = data.health.trend?.[1]?.healthScore ?? null;
  const scoreDelta = score !== null && yesterday !== null ? score - yesterday : null;
  const scoreColor = score === null
    ? "from-[var(--bg-elevated)] to-[var(--bg-elevated)] text-[var(--text-muted)]"
    : score >= 90 ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400"
    : score >= 70 ? "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400"
    : "from-red-500/20 to-red-500/5 border-red-500/30 text-red-400";
  const scoreLabel = score === null ? "—" : score >= 90 ? "✅ 良好" : score >= 70 ? "⚠️ 注意" : "🚨 警示";

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={load}
          className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--gold)] hover:border-[var(--gold)]/40 flex items-center gap-2 text-sm transition">
          <RefreshCw size={14} /> 重新整理
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn("p-4 rounded-xl border bg-gradient-to-br", scoreColor)}>
          <div className="text-xs opacity-70">健康度</div>
          <div className="text-3xl font-bold flex items-center gap-2 mt-1">
            {score !== null ? `${score}` : "—"}
            {score !== null && <span className="text-base opacity-60">/100</span>}
            {scoreDelta !== null && (scoreDelta > 0 ? <TrendingUp size={18} /> : scoreDelta < 0 ? <TrendingDown size={18} /> : <Minus size={18} />)}
          </div>
          <div className="text-xs mt-1 opacity-80">{scoreLabel}</div>
        </div>
        <Stat label="題庫總數" value={data.questions.total}
          hint={`核可 ${data.questions.approved} / 草稿 ${data.questions.draft} / 封存 ${data.questions.archived}`} />
        <Stat label="待處理問題" value={data.issues.openCount}
          hint={`Critical ${data.issues.critical?.length ?? 0} 題`}
          warning={data.issues.openCount > 50}
          onClick={() => onJump("quality")} />
        <Stat label="待處理回報" value={data.reports.pendingCount}
          hint={`累計 ${data.reports.totalCount}`}
          warning={data.reports.pendingCount > 5}
          onClick={() => onJump("reports")} />
      </div>

      <Section title="近 7 天健康度趨勢" icon={<Activity size={16} className="text-[var(--gold)]" />}>
        <TrendChart data={data.health.trend} />
      </Section>

      <Section title={`待處理 Critical 問題 (${data.issues.critical?.length ?? 0})`}
        icon={<AlertTriangle size={16} className="text-[var(--error)]" />}>
        {data.issues.critical?.length === 0 ? (
          <div className="text-emerald-400 flex items-center gap-2 text-sm py-2">
            <CheckCircle2 size={16} /> 沒有 Critical 問題
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--text-muted)] text-xs uppercase">
                <tr><th className="py-2 pr-2">題目 ID</th><th className="pr-2">規則</th><th className="pr-2">嚴重度</th><th>偵測詳情</th></tr>
              </thead>
              <tbody>
                {data.issues.critical?.slice(0, 10).map((i: any) => (
                  <tr key={i.id} className="border-t border-[var(--border-subtle)]/50 hover:bg-[var(--bg-elevated)]/30">
                    <td className="py-2 pr-2">
                      <Link className="text-[var(--gold)] hover:underline font-mono text-xs" href={`/admin/questions/${i.questionId}`}>
                        {i.questionId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="pr-2"><Badge>{i.ruleId}</Badge></td>
                    <td className="pr-2"><span className="text-[var(--error)] font-medium text-xs">{i.severity}</span></td>
                    <td className="text-xs text-[var(--text-secondary)] max-w-md truncate">{i.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="最近使用者回報" icon={<MessageSquareWarning size={16} className="text-[var(--gold)]" />}>
        {data.reports.recent.length === 0 ? <div className="text-[var(--text-muted)] text-sm">尚無回報</div> : (
          <ul className="space-y-2">
            {data.reports.recent.slice(0, 6).map((r: any) => (
              <li key={r.id} className="border-b border-[var(--border-subtle)]/50 pb-2 text-sm">
                <span className="text-[var(--text-muted)] text-xs mr-2">{new Date(r.createdAt).toLocaleDateString("zh-TW")}</span>
                <Badge>{r.status}</Badge>
                <span className="ml-2 font-medium text-[var(--text-primary)]">{r.reason}</span>
                {r.detail && <span className="text-[var(--text-secondary)]"> — {r.detail}</span>}
                <Link className="ml-2 text-[var(--gold)] hover:underline text-xs" href={`/admin/questions/${r.questionId}`}>查看題目</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="最近自動修改" icon={<History size={16} className="text-[var(--gold)]" />}>
        {data.recentChanges.length === 0 ? <div className="text-[var(--text-muted)] text-sm">尚無修改</div> : (
          <ul className="space-y-2">
            {data.recentChanges.slice(0, 6).map((v: any) => (
              <li key={v.id} className="border-b border-[var(--border-subtle)]/50 pb-2 text-sm">
                <span className="text-[var(--text-muted)] text-xs mr-2">{new Date(v.createdAt).toLocaleString("zh-TW")}</span>
                {v.agentInitiated && <Badge>agent</Badge>}
                <span className="ml-2 text-[var(--text-secondary)]">{v.changedBy}</span>
                <span className="ml-2 text-[var(--text-primary)]">{v.reason}</span>
                <Link className="ml-2 text-[var(--gold)] hover:underline text-xs" href={`/admin/questions/${v.questionId}`}>題目</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`行銷部草稿 (${data.marketing.drafts.length})`}
        icon={<Megaphone size={16} className="text-[var(--gold)]" />}>
        {data.marketing.drafts.length === 0 ? <div className="text-[var(--text-muted)] text-sm">尚無草稿</div> : (
          <ul className="space-y-2">
            {data.marketing.drafts.slice(0, 5).map((m: any) => (
              <li key={m.id} className="border-b border-[var(--border-subtle)]/50 pb-2 text-sm">
                <Badge>{m.contentType}</Badge>
                <Badge>{m.platform || "—"}</Badge>
                <span className="ml-2 font-medium text-[var(--text-primary)]">{m.title || "(無標題)"}</span>
                <span className="ml-2 text-[var(--text-muted)] text-xs">{new Date(m.generatedAt).toLocaleDateString("zh-TW")}</span>
                <button onClick={() => onJump("marketing")} className="ml-2 text-[var(--gold)] hover:underline text-xs">查看</button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, hint, warning, onClick }: { label: string; value: number; hint?: string; warning?: boolean; onClick?: () => void }) {
  const className = cn(
    "p-4 rounded-xl border text-left transition",
    warning
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-[var(--border-subtle)] bg-[var(--bg-surface)]",
    onClick && "hover:border-[var(--gold)]/40 hover:shadow-lg cursor-pointer w-full"
  );
  const inner = (
    <>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{value}</div>
      {hint && <div className="text-xs text-[var(--text-muted)] mt-1">{hint}</div>}
    </>
  );
  if (onClick) {
    return <button onClick={onClick} className={className}>{inner}</button>;
  }
  return <div className={className}>{inner}</div>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2 font-semibold text-[var(--text-primary)] text-sm">
        {icon} {title}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TrendChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="text-[var(--text-muted)] text-sm">尚無數據</div>;
  // Pad to 7 days
  const sorted = data.slice().reverse();
  return (
    <div className="flex items-end gap-2 h-32">
      {sorted.map(d => {
        const h = (d.healthScore / 100) * 100;
        const color = d.healthScore >= 90 ? "bg-emerald-500" : d.healthScore >= 70 ? "bg-amber-500" : "bg-red-500";
        return (
          <div key={d.period} className="flex-1 flex flex-col items-center gap-1 min-w-[30px]">
            <div className="text-xs text-[var(--text-secondary)]">{d.healthScore}</div>
            <div className={cn(color, "w-full rounded-t transition-all")} style={{ height: `${h}%` }} />
            <div className="text-[10px] text-[var(--text-muted)]">{d.period.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}
