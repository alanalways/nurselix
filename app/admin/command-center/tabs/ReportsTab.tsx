"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, MessageSquareWarning, Eye, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";

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

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  IN_REVIEW: "bg-blue-100 text-blue-800",
  reviewed: "bg-blue-100 text-blue-800",
  RESOLVED_FIXED: "bg-emerald-100 text-emerald-800",
  RESOLVED_INVALID: "bg-gray-100 text-gray-700",
  RESOLVED_DUPLICATE: "bg-gray-100 text-gray-700",
  resolved: "bg-emerald-100 text-emerald-800",
};

export default function ReportsTab() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dedupRunning, setDedupRunning] = useState(false);
  const [triageRunning, setTriageRunning] = useState(false);

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

  const triggerTriage = async () => {
    if (!confirm("立即用 AI agent 處理 PENDING 回報（最多 30 筆，需要 NIM 額度）？")) return;
    setTriageRunning(true);
    try {
      // No CRON_SECRET on client — call admin-callable triage endpoint
      // Fallback: just hit cron endpoint with secret if available (server-side proxied)
      const r = await fetch("/api/admin/marketing/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "_unused_for_triage" }),
      });
      // Just notify user; actual triage runs via cron / server. This is a stub for now.
      alert("已觸發。實際 triage 會在下一次 cron（每天 04:00 UTC）執行；要立即跑，請從 GitHub Actions 手動觸發 cron-report-triage.yml。");
    } finally { setTriageRunning(false); }
  };

  const pendingCount = items.filter(r => r.status === "PENDING" || r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center bg-white border rounded-lg p-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">所有狀態</option>
          <option value="PENDING">PENDING（待處理）</option>
          <option value="pending">pending（舊版）</option>
          <option value="IN_REVIEW">IN_REVIEW（複核中）</option>
          <option value="RESOLVED_FIXED">RESOLVED_FIXED（已修復）</option>
          <option value="RESOLVED_INVALID">RESOLVED_INVALID（無效）</option>
          <option value="RESOLVED_DUPLICATE">RESOLVED_DUPLICATE（重複）</option>
          <option value="resolved">resolved（舊版）</option>
        </select>
        <span className="text-sm text-gray-600">共 {items.length} 筆，待處理 {pendingCount}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={dedup} disabled={dedupRunning}
            className="px-3 py-1 border rounded hover:bg-gray-50 text-sm disabled:opacity-50">
            {dedupRunning ? <Loader2 className="animate-spin inline" size={14} /> : null} 清除重複
          </button>
          <button onClick={load} className="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-sm">
            <RefreshCw size={14} /> 重新整理
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> 載入中...</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 bg-white border rounded-lg p-8 text-center">尚無回報</div>
      ) : (
        <div className="space-y-2">
          {items.map(r => (
            <div key={r.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MessageSquareWarning size={18} className="text-gray-500 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[r.status] || "bg-gray-100"}`}>{r.status}</span>
                    {r.reasonCategory && <Badge>{r.reasonCategory}</Badge>}
                    {r.triageVerdict && <Badge>AI: {r.triageVerdict}</Badge>}
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> {new Date(r.createdAt).toLocaleString("zh-TW")}</span>
                  </div>
                  <div className="text-sm font-medium">{r.reason}</div>
                  {r.detail && <div className="text-sm text-gray-600 mt-1">{r.detail}</div>}
                  {r.triageNotes && (
                    <div className="text-xs text-gray-700 mt-2 bg-gray-50 rounded p-2 border-l-2 border-blue-300">
                      <span className="font-semibold">AI 分流結論：</span>{r.triageNotes}
                    </div>
                  )}
                  {r.question && (
                    <div className="text-sm text-gray-700 mt-2 line-clamp-2">{r.question.stem.slice(0, 180)}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {r.user?.email && <span>by {r.user.email}</span>}
                    {r.question && <span> · qid={r.questionId.slice(0,8)}{r.question.domain ? ` · ${r.question.domain}` : ""}</span>}
                  </div>
                </div>
                <Link href={`/admin/questions/${r.questionId}`} target="_blank"
                  className="px-2 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-xs h-fit">
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
