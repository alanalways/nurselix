"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, MessageSquareWarning, Eye, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

interface Report {
  id: string;
  userId: string;
  questionId: string;
  reason: string;
  detail?: string | null;
  status: string;
  reasonCategory?: string | null;
  triageVerdict?: string | null;
  triageNotes?: string | null;
  triagedAt?: string | null;
  createdAt: string;
  user?: { email?: string; name?: string };
  question?: { id: string; stem: string; domain?: string; difficulty?: string };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  IN_REVIEW: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  reviewed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  RESOLVED_FIXED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  RESOLVED_INVALID: "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]",
  RESOLVED_DUPLICATE: "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const SELECT_CLS = "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-[var(--gold)]";
const BTN_CLS = "px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--gold)] hover:border-[var(--gold)]/40 flex items-center gap-1 text-sm transition";

export default function ReportsTab() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dedupRunning, setDedupRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/admin/reports?${params}`, { cache: "no-store" });
      const j = await r.json();
      setItems(j.rows || []);
    } finally { setLoading(false); }
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  const dedup = async () => {
    if (!confirm("這會把相同使用者對同題目的舊 pending 回報自動標記為 resolved（重複）。繼續？")) return;
    setDedupRunning(true);
    try {
      await fetch("/api/admin/reports?action=dedup", { method: "POST" });
      await load();
    } finally { setDedupRunning(false); }
  };

  const pendingCount = items.filter(r => r.status === "PENDING" || r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={SELECT_CLS}>
          <option value="">所有狀態</option>
          <option value="PENDING">PENDING（待處理）</option>
          <option value="pending">pending（舊版）</option>
          <option value="IN_REVIEW">IN_REVIEW（複核中）</option>
          <option value="RESOLVED_FIXED">RESOLVED_FIXED（已修復）</option>
          <option value="RESOLVED_INVALID">RESOLVED_INVALID（無效）</option>
          <option value="RESOLVED_DUPLICATE">RESOLVED_DUPLICATE（重複）</option>
        </select>
        <span className="text-sm text-[var(--text-muted)]">共 {items.length} 筆，待處理 {pendingCount}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={dedup} disabled={dedupRunning} className={cn(BTN_CLS, "disabled:opacity-50")}>
            {dedupRunning ? <Loader2 className="animate-spin" size={14} /> : null} 清除重複
          </button>
          <button onClick={load} className={BTN_CLS}>
            <RefreshCw size={14} /> 重新整理
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--text-muted)] py-4">
          <Loader2 className="animate-spin text-[var(--gold)]" size={18} /> 載入中...
        </div>
      ) : items.length === 0 ? (
        <div className="text-[var(--text-muted)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center text-sm">尚無回報</div>
      ) : (
        <div className="space-y-2">
          {items.map(r => (
            <div key={r.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="flex items-start gap-3">
                <MessageSquareWarning size={18} className="text-[var(--text-muted)] mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn("text-[10px] px-2 py-1 rounded border font-mono", STATUS_STYLES[r.status] || "bg-[var(--bg-elevated)] text-[var(--text-muted)]")}>
                      {r.status}
                    </span>
                    {r.reasonCategory && <Badge>{r.reasonCategory}</Badge>}
                    {r.triageVerdict && <Badge>AI: {r.triageVerdict}</Badge>}
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Clock size={11} /> {new Date(r.createdAt).toLocaleString("zh-TW")}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{r.reason}</div>
                  {r.detail && <div className="text-sm text-[var(--text-secondary)] mt-1">{r.detail}</div>}
                  {r.triageNotes && (
                    <div className="text-xs text-[var(--text-secondary)] mt-2 bg-[var(--bg-elevated)] rounded-lg p-2 border-l-2 border-blue-500/40">
                      <span className="font-semibold text-blue-400">AI 分流結論：</span>{r.triageNotes}
                    </div>
                  )}
                  {r.question && (
                    <div className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">{r.question.stem.slice(0, 180)}</div>
                  )}
                  <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                    {r.user?.email && <span>by {r.user.email}</span>}
                    {r.question && <span> · qid={r.questionId.slice(0,8)}{r.question.domain ? ` · ${r.question.domain}` : ""}</span>}
                  </div>
                </div>
                <Link href={`/admin/questions/${r.questionId}`} target="_blank" className={cn(BTN_CLS, "text-xs h-fit")}>
                  <Eye size={12} /> 題目
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
