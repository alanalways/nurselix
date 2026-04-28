"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Eye, Filter } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

interface Issue {
  id: string;
  questionId: string;
  ruleId: string;
  severity: string;
  detail: string;
  status: string;
  detectedAt: string;
  question: {
    id: string;
    stem: string;
    stemZh?: string;
    status: string;
    correctAnswer: string;
    difficulty?: string;
    module?: string;
    attemptCount?: number;
    correctCount?: number;
  };
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "border-red-500/40 bg-red-500/10 text-red-400",
  HIGH: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  LOW: "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)]",
};

const SELECT_CLS = "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-[var(--gold)]";
const BTN_CLS = "px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--gold)] hover:border-[var(--gold)]/40 flex items-center gap-1 text-sm transition";

export default function QualityTab() {
  const [items, setItems] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<string>("");
  const [ruleId, setRuleId] = useState<string>("");
  const [status, setStatus] = useState<string>("OPEN");
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severity) params.set("severity", severity);
      if (ruleId) params.set("ruleId", ruleId);
      params.set("status", status);
      params.set("limit", "100");
      const r = await fetch(`/api/admin/quality-issues?${params}`, { cache: "no-store" });
      const j = await r.json();
      setItems(j.issues || []);
    } finally { setLoading(false); }
  }, [severity, ruleId, status]);
  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, action: "RESOLVED" | "IGNORED") => {
    setResolving(id);
    try {
      await fetch(`/api/admin/quality-issues/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, resolution: action === "IGNORED" ? "Manually marked as false positive" : "Manually resolved" }),
      });
      setItems(prev => prev.filter(x => x.id !== id));
    } finally { setResolving(null); }
  };

  const allRules = Array.from(new Set(items.map(i => i.ruleId))).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
        <Filter size={15} className="text-[var(--text-muted)]" />
        <select value={severity} onChange={e => setSeverity(e.target.value)} className={SELECT_CLS}>
          <option value="">所有嚴重度</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select value={ruleId} onChange={e => setRuleId(e.target.value)} className={SELECT_CLS}>
          <option value="">所有規則</option>
          {allRules.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className={SELECT_CLS}>
          <option value="OPEN">OPEN</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="IGNORED">IGNORED</option>
          <option value="AUTO_ARCHIVED">AUTO_ARCHIVED</option>
        </select>
        <button onClick={load} className={cn(BTN_CLS, "ml-auto")}>
          <RefreshCw size={14} /> 重新整理
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--text-muted)] py-4">
          <Loader2 className="animate-spin text-[var(--gold)]" size={18} /> 載入中...
        </div>
      ) : items.length === 0 ? (
        <div className="text-[var(--text-muted)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
          <div className="text-sm">沒有符合條件的 issue</div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hover:border-[var(--border-subtle)]/80 transition">
              <div className="flex items-start gap-3">
                <span className={cn("text-[10px] px-2 py-1 rounded border font-mono", SEVERITY_STYLES[it.severity] || SEVERITY_STYLES.LOW)}>
                  {it.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge>{it.ruleId}</Badge>
                    <Badge>{it.status}</Badge>
                    <Badge>Q.{it.question.status}</Badge>
                    {it.question.difficulty && <Badge>{it.question.difficulty}</Badge>}
                    <span className="text-xs text-[var(--text-muted)]">{new Date(it.detectedAt).toLocaleString("zh-TW")}</span>
                  </div>
                  <div className="text-sm text-[var(--text-primary)] mb-1">{it.detail}</div>
                  <div className="text-sm text-[var(--text-secondary)] line-clamp-2">{it.question.stemZh || it.question.stem.slice(0, 200)}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">id={it.questionId.slice(0, 8)} · ans={it.question.correctAnswer}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <Link href={`/admin/questions/${it.questionId}`} target="_blank" className={cn(BTN_CLS, "text-xs")}>
                    <Eye size={12} /> 編輯
                  </Link>
                  {it.status === "OPEN" && (
                    <>
                      <button onClick={() => resolve(it.id, "RESOLVED")} disabled={resolving === it.id}
                        className="px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 text-xs disabled:opacity-50 transition">
                        <CheckCircle2 size={12} /> 已解決
                      </button>
                      <button onClick={() => resolve(it.id, "IGNORED")} disabled={resolving === it.id}
                        className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-1 text-xs disabled:opacity-50 transition">
                        <XCircle size={12} /> 假陽性
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
