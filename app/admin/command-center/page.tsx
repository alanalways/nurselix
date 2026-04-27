"use client";
/**
 * Unified Admin Command Center
 *
 * Replaces the scattered (garbage-scan / content-audit / quality / spot-check / reports)
 * pages with a single dashboard. The original pages still work, but link from here.
 */
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw,
  FileWarning, MessageSquareWarning, History, Bot, Megaphone,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import Badge from "@/components/ui/Badge";

interface DashboardData {
  timestamp: string;
  health: {
    today: any;
    trend: any[];
  };
  questions: { total: number; approved: number; draft: number; archived: number };
  issues: { openCount: number; critical: any[] };
  reports: { pendingCount: number; totalCount: number; recent: any[] };
  recentChanges: any[];
  agentStatus: any[];
  marketing: { drafts: any[] };
}

export default function CommandCenter() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/command-center", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setData(j);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  if (loading && !data) {
    return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> 載入指揮中心...</div>;
  }
  if (error) {
    return <div className="p-8 text-red-600">錯誤：{error} <button onClick={load} className="underline ml-2">重試</button></div>;
  }
  if (!data) return null;

  const score = data.health.today?.healthScore ?? null;
  const yesterday = data.health.trend?.[1]?.healthScore ?? null;
  const scoreDelta = score !== null && yesterday !== null ? score - yesterday : null;

  const scoreColor =
    score === null ? "bg-gray-400" :
    score >= 90 ? "bg-emerald-500" :
    score >= 70 ? "bg-amber-500" : "bg-red-500";
  const scoreLabel =
    score === null ? "—" :
    score >= 90 ? "✅ 良好" :
    score >= 70 ? "⚠️ 注意" : "🚨 警示";

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">指揮中心</h1>
          <p className="text-sm text-gray-500 mt-1">最後更新：{new Date(data.timestamp).toLocaleString("zh-TW")}</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded border hover:bg-gray-50 flex items-center gap-2">
          <RefreshCw size={16} /> 重新整理
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg text-white ${scoreColor}`}>
          <div className="text-sm opacity-80">健康度</div>
          <div className="text-3xl font-bold flex items-center gap-2">
            {score !== null ? `${score}/100` : "—"}
            {scoreDelta !== null && (
              scoreDelta > 0 ? <TrendingUp size={20} /> : scoreDelta < 0 ? <TrendingDown size={20} /> : <Minus size={20} />
            )}
          </div>
          <div className="text-sm mt-1">{scoreLabel}</div>
        </div>
        <Stat label="題庫總數" value={data.questions.total} hint={`核可 ${data.questions.approved} / 草稿 ${data.questions.draft} / 封存 ${data.questions.archived}`} />
        <Stat label="待處理問題" value={data.issues.openCount} hint={`Critical ${data.issues.critical?.length ?? 0} 題`} warning={data.issues.openCount > 50} />
        <Stat label="待處理回報" value={data.reports.pendingCount} hint={`累計 ${data.reports.totalCount}`} warning={data.reports.pendingCount > 5} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/admin/questions/quality" icon={<FileWarning size={18} />} label="題庫品質" />
        <QuickAction href="/admin/reports" icon={<MessageSquareWarning size={18} />} label="使用者回報" />
        <QuickAction href="/admin/agents" icon={<Bot size={18} />} label="Agent 狀態" />
        <QuickAction href="/admin/command-center/marketing" icon={<Megaphone size={18} />} label="行銷部" />
      </div>

      {/* 7-day trend */}
      <Section title="近 7 天健康度趨勢" icon={<Activity size={18} />}>
        <TrendChart data={data.health.trend} />
      </Section>

      {/* Critical issues */}
      <Section title={`待處理 Critical 問題 (${data.issues.critical?.length ?? 0})`} icon={<AlertTriangle size={18} />}>
        {data.issues.critical?.length === 0 ? (
          <div className="text-emerald-600 flex items-center gap-2"><CheckCircle2 size={18} /> 沒有 Critical 問題</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr><th className="py-2">題目 ID</th><th>規則</th><th>嚴重度</th><th>偵測詳情</th><th>動作</th></tr>
            </thead>
            <tbody>
              {data.issues.critical?.slice(0, 10).map((i: any) => (
                <tr key={i.id} className="border-t hover:bg-gray-50">
                  <td className="py-2"><Link className="text-blue-600 hover:underline" href={`/admin/questions/${i.questionId}`}>{i.questionId.slice(0, 8)}</Link></td>
                  <td><Badge>{i.ruleId}</Badge></td>
                  <td><span className="text-red-600 font-medium">{i.severity}</span></td>
                  <td className="text-xs text-gray-600 max-w-md truncate">{i.detail}</td>
                  <td><Link href={`/admin/questions/${i.questionId}`} className="text-blue-600 hover:underline">編輯</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Recent reports */}
      <Section title="最近使用者回報" icon={<MessageSquareWarning size={18} />}>
        {data.reports.recent.length === 0 ? <div className="text-gray-500">尚無回報</div> : (
          <ul className="space-y-2">
            {data.reports.recent.slice(0, 6).map((r: any) => (
              <li key={r.id} className="border-b pb-2 text-sm">
                <span className="text-gray-500 mr-2">{new Date(r.createdAt).toLocaleDateString("zh-TW")}</span>
                <Badge>{r.status}</Badge>
                <span className="ml-2 font-medium">{r.reason}</span>
                {r.detail && <span className="text-gray-600"> — {r.detail}</span>}
                <Link className="ml-2 text-blue-600 hover:underline" href={`/admin/questions/${r.questionId}`}>查看題目</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recent agent changes */}
      <Section title="最近自動修改" icon={<History size={18} />}>
        {data.recentChanges.length === 0 ? <div className="text-gray-500">尚無修改</div> : (
          <ul className="space-y-2">
            {data.recentChanges.slice(0, 6).map((v: any) => (
              <li key={v.id} className="border-b pb-2 text-sm">
                <span className="text-gray-500 mr-2">{new Date(v.createdAt).toLocaleString("zh-TW")}</span>
                {v.agentInitiated && <Badge>agent</Badge>}
                <span className="ml-2 text-gray-700">{v.changedBy}</span>
                <span className="ml-2">{v.reason}</span>
                <Link className="ml-2 text-blue-600 hover:underline" href={`/admin/questions/${v.questionId}`}>題目</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Marketing drafts */}
      <Section title={`行銷部草稿 (${data.marketing.drafts.length})`} icon={<Megaphone size={18} />}>
        {data.marketing.drafts.length === 0 ? <div className="text-gray-500">尚無草稿</div> : (
          <ul className="space-y-2">
            {data.marketing.drafts.slice(0, 5).map((m: any) => (
              <li key={m.id} className="border-b pb-2 text-sm">
                <Badge>{m.contentType}</Badge>
                <Badge>{m.platform || "—"}</Badge>
                <span className="ml-2 font-medium">{m.title || "(無標題)"}</span>
                <span className="ml-2 text-gray-500">{new Date(m.generatedAt).toLocaleDateString("zh-TW")}</span>
                <Link className="ml-2 text-blue-600 hover:underline" href={`/admin/command-center/marketing#${m.id}`}>查看</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, hint, warning }: { label: string; value: number; hint?: string; warning?: boolean }) {
  return (
    <div className={`p-4 rounded-lg border ${warning ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="p-3 border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium">
      {icon} {label}
    </Link>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg bg-white">
      <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold">
        {icon} {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TrendChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="text-gray-500">尚無數據</div>;
  const max = 100;
  const sorted = data.slice().reverse(); // oldest first
  return (
    <div className="flex items-end gap-2 h-32">
      {sorted.map(d => {
        const h = (d.healthScore / max) * 100;
        const color = d.healthScore >= 90 ? "bg-emerald-500" : d.healthScore >= 70 ? "bg-amber-500" : "bg-red-500";
        return (
          <div key={d.period} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-xs">{d.healthScore}</div>
            <div className={`w-full ${color} rounded-t transition-all`} style={{ height: `${h}%` }} />
            <div className="text-[10px] text-gray-500">{d.period.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}
