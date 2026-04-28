"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Eye, Filter } from "lucide-react";
import Badge from "@/components/ui/Badge";

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

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-gray-100 text-gray-700 border-gray-300",
};

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

  // Compute rule list for filter
  const allRules = Array.from(new Set(items.map(i => i.ruleId))).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center bg-white border rounded-lg p-3">
        <Filter size={16} className="text-gray-500" />
        <select value={severity} onChange={e => setSeverity(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">所有嚴重度</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select value={ruleId} onChange={e => setRuleId(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">所有規則</option>
          {allRules.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="OPEN">OPEN</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="IGNORED">IGNORED</option>
          <option value="AUTO_ARCHIVED">AUTO_ARCHIVED</option>
        </select>
        <button onClick={load} className="ml-auto px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-sm">
          <RefreshCw size={14} /> 重新整理
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> 載入中...</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 bg-white border rounded-lg p-8 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
          <div>沒有符合條件的 issue</div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className={`text-xs px-2 py-1 rounded border ${SEVERITY_COLORS[it.severity] || "bg-gray-100"}`}>{it.severity}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge>{it.ruleId}</Badge>
                    <Badge>{it.status}</Badge>
                    <Badge>Q.status={it.question.status}</Badge>
                    {it.question.difficulty && <Badge>{it.question.difficulty}</Badge>}
                    <span className="text-xs text-gray-500">{new Date(it.detectedAt).toLocaleString("zh-TW")}</span>
                  </div>
                  <div className="text-sm text-gray-800 mb-1">{it.detail}</div>
                  <div className="text-sm text-gray-700 font-medium line-clamp-2">{it.question.stemZh || it.question.stem.slice(0, 200)}</div>
                  <div className="text-xs text-gray-500 mt-1">id={it.questionId.slice(0, 8)} · ans={it.question.correctAnswer}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <Link href={`/admin/questions/${it.questionId}`} target="_blank"
                    className="px-2 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-xs">
                    <Eye size={12} /> 編輯題目
                  </Link>
                  {it.status === "OPEN" && (
                    <>
                      <button onClick={() => resolve(it.id, "RESOLVED")} disabled={resolving === it.id}
                        className="px-2 py-1 border rounded text-emerald-700 hover:bg-emerald-50 flex items-center gap-1 text-xs disabled:opacity-50">
                        <CheckCircle2 size={12} /> 標記已解決
                      </button>
                      <button onClick={() => resolve(it.id, "IGNORED")} disabled={resolving === it.id}
                        className="px-2 py-1 border rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1 text-xs disabled:opacity-50">
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
