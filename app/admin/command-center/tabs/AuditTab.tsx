"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Play, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, X, Eye } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface AuditResult {
  questionId: string;
  verdict?: "CORRECT" | "NEEDS_REVIEW" | "ERROR";
  issues?: string[];
  suggestion?: string;
  error?: string;
}

interface AuditJob {
  id: string;
  status: "running" | "done" | "failed";
  scope: string;
  total: number;
  done: number;
  errors: number;
  results: AuditResult[];
  startedAt: string;
  finishedAt?: string;
  message: string;
}

const VERDICT_COLOR: Record<string, string> = {
  CORRECT: "bg-emerald-100 text-emerald-700",
  NEEDS_REVIEW: "bg-amber-100 text-amber-700",
  ERROR: "bg-red-100 text-red-700",
};

export default function AuditTab() {
  const [job, setJob] = useState<AuditJob | null>(null);
  const [scope, setScope] = useState<"reported" | "approved" | "all">("reported");
  const [filter, setFilter] = useState<"all" | "CORRECT" | "NEEDS_REVIEW" | "ERROR">("NEEDS_REVIEW");
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/questions/content-audit", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        setJob(j.job || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (job?.status === "running") load();
    }, 4000);
    return () => clearInterval(interval);
  }, [load, job?.status]);

  const start = async () => {
    if (job?.status === "running") {
      alert("已有一個審核工作正在進行");
      return;
    }
    if (!confirm(`啟動 AI 內容審核（範圍：${scope}）？\n\n會用 Gemini 對題目逐一檢查臨床正確性。可能消耗大量 API 額度。`)) return;
    setStarting(true);
    try {
      const r = await fetch("/api/admin/questions/content-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      if (r.ok) await load();
      else alert("啟動失敗：" + (await r.text()));
    } finally { setStarting(false); }
  };

  const clear = async () => {
    if (job?.status === "running") {
      alert("無法清除進行中的工作");
      return;
    }
    if (!confirm("清除目前審核結果？")) return;
    await fetch("/api/admin/questions/content-audit", { method: "DELETE" });
    setJob(null);
  };

  const filtered = job?.results?.filter(r => filter === "all" || r.verdict === filter) || [];

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="font-semibold flex items-center gap-2"><ShieldCheck size={18} /> AI 內容審核</div>
        <div className="text-sm text-gray-600">用 Gemini 檢查題目臨床正確性。可選範圍：被回報過、已核可、全部。</div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={scope} onChange={e => setScope(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
            <option value="reported">僅含待審回報（reported）</option>
            <option value="approved">所有 APPROVED 題（approved）</option>
            <option value="all">全部題目（all）</option>
          </select>
          <button onClick={start} disabled={starting || job?.status === "running"}
            className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1 text-sm disabled:opacity-50">
            {starting ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />} 啟動審核
          </button>
          <button onClick={load} className="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-sm">
            <RefreshCw size={14} /> 重新整理
          </button>
          {job && job.status !== "running" && (
            <button onClick={clear} className="px-3 py-1 border rounded text-red-600 hover:bg-red-50 flex items-center gap-1 text-sm">
              <X size={14} /> 清除
            </button>
          )}
        </div>
      </div>

      {!job ? (
        <div className="text-gray-500 bg-white border rounded-lg p-8 text-center">尚無審核工作</div>
      ) : (
        <>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge>{job.status}</Badge>
              <Badge>{job.scope}</Badge>
              <span className="text-sm text-gray-600">啟動於 {new Date(job.startedAt).toLocaleString("zh-TW")}</span>
              {job.finishedAt && <span className="text-sm text-gray-600">完成於 {new Date(job.finishedAt).toLocaleString("zh-TW")}</span>}
            </div>
            {job.status === "running" && (
              <div className="space-y-1">
                <div className="text-sm text-gray-700">{job.message}</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(job.done / Math.max(1, job.total)) * 100}%` }} />
                </div>
                <div className="text-xs text-gray-500">{job.done} / {job.total}（錯誤 {job.errors}）</div>
              </div>
            )}
            {job.status === "done" && (
              <div className="text-sm">
                完成：總共 {job.total} 題，需複審 {job.results.filter(r => r.verdict === "NEEDS_REVIEW").length}，正確 {job.results.filter(r => r.verdict === "CORRECT").length}，錯誤 {job.errors}
              </div>
            )}
          </div>

          {job.results.length > 0 && (
            <>
              <div className="flex gap-2 items-center bg-white border rounded-lg p-3">
                <span className="text-sm text-gray-600">過濾：</span>
                {(["all", "NEEDS_REVIEW", "CORRECT", "ERROR"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-2 py-1 rounded text-xs ${filter === f ? "bg-emerald-100 text-emerald-700 font-medium" : "border hover:bg-gray-50"}`}>
                    {f === "all" ? "全部" : f}（{f === "all" ? job.results.length : job.results.filter(r => r.verdict === f).length}）
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filtered.map((r, i) => (
                  <div key={`${r.questionId}-${i}`} className="bg-white border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${VERDICT_COLOR[r.verdict || ""] || "bg-gray-100"}`}>
                        {r.verdict || "?"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">qid={r.questionId.slice(0, 8)}</div>
                        {r.issues && r.issues.length > 0 && (
                          <div className="text-sm">
                            <div className="font-medium text-amber-700 flex items-center gap-1 mb-1"><AlertTriangle size={14} /> 發現問題</div>
                            <ul className="list-disc list-inside text-gray-700">
                              {r.issues.map((iss, k) => <li key={k}>{iss}</li>)}
                            </ul>
                          </div>
                        )}
                        {r.suggestion && (
                          <div className="text-sm mt-2 bg-blue-50 rounded p-2">
                            <span className="font-medium">建議：</span>{r.suggestion}
                          </div>
                        )}
                        {r.error && <div className="text-sm text-red-600 mt-1">錯誤：{r.error}</div>}
                      </div>
                      <Link href={`/admin/questions/${r.questionId}`} target="_blank"
                        className="px-2 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-xs h-fit">
                        <Eye size={12} /> 編輯
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
