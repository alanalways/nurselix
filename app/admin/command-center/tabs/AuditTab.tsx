"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Play, RefreshCw, ShieldCheck, AlertTriangle, X, Eye } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

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

const VERDICT_STYLES: Record<string, string> = {
  CORRECT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  NEEDS_REVIEW: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ERROR: "bg-red-500/15 text-red-400 border-red-500/30",
};

const SELECT_CLS = "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-[var(--gold)]";
const BTN_CLS = "px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--gold)] hover:border-[var(--gold)]/40 flex items-center gap-1 text-sm transition disabled:opacity-50";
const PRIMARY_BTN_CLS = "px-3 py-1.5 rounded-lg bg-[var(--gold)] text-[#080E1A] font-semibold hover:opacity-90 flex items-center gap-1 text-sm transition disabled:opacity-50";

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
    if (!confirm(`啟動 AI 內容審核（範圍：${scope}）？\n會用 Gemini 對題目逐一檢查臨床正確性，可能消耗大量 API 額度。`)) return;
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
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
        <div className="font-semibold flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <ShieldCheck size={16} className="text-[var(--gold)]" /> AI 內容審核
        </div>
        <div className="text-sm text-[var(--text-muted)]">用 Gemini 檢查題目臨床正確性，可選範圍：被回報過、已核可、全部。</div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={scope} onChange={e => setScope(e.target.value as any)} className={SELECT_CLS}>
            <option value="reported">僅含待審回報（reported）</option>
            <option value="approved">所有 APPROVED 題（approved）</option>
            <option value="all">全部題目（all）</option>
          </select>
          <button onClick={start} disabled={starting || job?.status === "running"} className={PRIMARY_BTN_CLS}>
            {starting ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />} 啟動審核
          </button>
          <button onClick={load} className={BTN_CLS}>
            <RefreshCw size={14} /> 重新整理
          </button>
          {job && job.status !== "running" && (
            <button onClick={clear} className={cn(BTN_CLS, "text-red-400 hover:text-red-300")}>
              <X size={14} /> 清除
            </button>
          )}
        </div>
      </div>

      {!job ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center text-[var(--text-muted)] text-sm">
          尚無審核工作
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge>{job.status}</Badge>
              <Badge>{job.scope}</Badge>
              <span className="text-sm text-[var(--text-muted)]">啟動於 {new Date(job.startedAt).toLocaleString("zh-TW")}</span>
              {job.finishedAt && <span className="text-sm text-[var(--text-muted)]">完成於 {new Date(job.finishedAt).toLocaleString("zh-TW")}</span>}
            </div>
            {job.status === "running" && (
              <div className="space-y-1">
                <div className="text-sm text-[var(--text-secondary)]">{job.message}</div>
                <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2">
                  <div className="bg-[var(--gold)] h-2 rounded-full transition-all" style={{ width: `${(job.done / Math.max(1, job.total)) * 100}%` }} />
                </div>
                <div className="text-xs text-[var(--text-muted)]">{job.done} / {job.total}（錯誤 {job.errors}）</div>
              </div>
            )}
            {job.status === "done" && (
              <div className="text-sm text-[var(--text-secondary)]">
                完成：總共 {job.total} 題，需複審 {job.results.filter(r => r.verdict === "NEEDS_REVIEW").length}，正確 {job.results.filter(r => r.verdict === "CORRECT").length}，錯誤 {job.errors}
              </div>
            )}
          </div>

          {job.results.length > 0 && (
            <>
              <div className="flex gap-2 items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 flex-wrap">
                <span className="text-sm text-[var(--text-muted)]">過濾：</span>
                {(["all", "NEEDS_REVIEW", "CORRECT", "ERROR"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-xs transition",
                      filter === f
                        ? "bg-[var(--gold)]/15 text-[var(--gold)] font-medium border border-[var(--gold)]/30"
                        : "border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}>
                    {f === "all" ? "全部" : f}（{f === "all" ? job.results.length : job.results.filter(r => r.verdict === f).length}）
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filtered.map((r, i) => (
                  <div key={`${r.questionId}-${i}`} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                    <div className="flex items-start gap-3">
                      <span className={cn("text-[10px] px-2 py-1 rounded border font-mono", VERDICT_STYLES[r.verdict || ""] || "bg-[var(--bg-elevated)]")}>
                        {r.verdict || "?"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[var(--text-muted)] mb-1 font-mono">qid={r.questionId.slice(0, 8)}</div>
                        {r.issues && r.issues.length > 0 && (
                          <div className="text-sm">
                            <div className="font-medium text-amber-400 flex items-center gap-1 mb-1">
                              <AlertTriangle size={14} /> 發現問題
                            </div>
                            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-0.5">
                              {r.issues.map((iss, k) => <li key={k}>{iss}</li>)}
                            </ul>
                          </div>
                        )}
                        {r.suggestion && (
                          <div className="text-sm mt-2 bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
                            <span className="font-medium text-blue-400">建議：</span>
                            <span className="text-[var(--text-secondary)]">{r.suggestion}</span>
                          </div>
                        )}
                        {r.error && <div className="text-sm text-[var(--error)] mt-1">錯誤：{r.error}</div>}
                      </div>
                      <Link href={`/admin/questions/${r.questionId}`} target="_blank" className={cn(BTN_CLS, "text-xs h-fit")}>
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
