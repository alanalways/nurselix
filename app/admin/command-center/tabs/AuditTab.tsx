"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Play, RefreshCw, AlertTriangle, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, MetaText, JournalCta, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

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

const VERDICT_TONE: Record<string, "phosphor" | "warning" | "danger" | "muted"> = {
  CORRECT: "phosphor",
  NEEDS_REVIEW: "warning",
  ERROR: "danger",
};

const SELECT_CLS = "border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--j-phosphor)]";

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
    if (!confirm(`啟動 AI 內容審核（範圍：${scope}）？\n會用 Gemini 對題目逐一檢查臨床正確性,可能消耗大量 API 額度。`)) return;
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
    <div className="space-y-6">
      {/* Setup */}
      <div className="border-y border-[var(--j-line)] py-4">
        <SectionLabel className="mb-3">Audit setup · 審核設定</SectionLabel>
        <p className="text-sm text-[var(--j-ink-dim)] mb-4 max-w-2xl" style={FONT_ZH}>
          用 Gemini 對題目逐一檢查臨床正確性。可選範圍：被回報過、已核可、全部。
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={scope} onChange={e => setScope(e.target.value as any)} className={SELECT_CLS} style={FONT_MONO}>
            <option value="reported">僅含待審回報（reported）</option>
            <option value="approved">所有 APPROVED 題（approved）</option>
            <option value="all">全部題目（all）</option>
          </select>
          <JournalCta primary onClick={start} disabled={starting || job?.status === "running"}>
            {starting ? <Loader2 className="animate-spin inline mr-1" size={13} /> : <Play size={13} className="inline mr-1" />}
            Start audit
          </JournalCta>
          <button onClick={load} className="text-sm text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition" style={FONT_MONO}>
            <RefreshCw size={13} /> refresh
          </button>
          {job && job.status !== "running" && (
            <button onClick={clear} className="text-sm italic text-[var(--j-red)] hover:underline flex items-center gap-1 transition" style={FONT_DISPLAY}>
              <X size={13} /> clear
            </button>
          )}
        </div>
      </div>

      {!job ? (
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-12 text-center italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
          — No audit yet. Press start to begin.
        </div>
      ) : (
        <>
          {/* Status */}
          <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-5">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Pill>{job.status}</Pill>
              <Pill tone="muted">{job.scope}</Pill>
              <MetaText>started · {new Date(job.startedAt).toLocaleString("zh-TW")}</MetaText>
              {job.finishedAt && <MetaText>finished · {new Date(job.finishedAt).toLocaleString("zh-TW")}</MetaText>}
            </div>
            {job.status === "running" && (
              <div className="space-y-2">
                <div className="text-sm text-[var(--j-ink-dim)]" style={FONT_ZH}>{job.message}</div>
                <div className="w-full bg-[var(--j-bg-inset)] h-1">
                  <div className="bg-[var(--j-phosphor)] h-1 transition-all" style={{ width: `${(job.done / Math.max(1, job.total)) * 100}%` }} />
                </div>
                <MetaText>{job.done} / {job.total} · errors {job.errors}</MetaText>
              </div>
            )}
            {job.status === "done" && (
              <div className="text-sm text-[var(--j-ink-dim)]" style={FONT_ZH}>
                Done · 總共 <span className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>{job.total}</span> 題,
                需複審 <span className="italic text-[#c77a28]" style={FONT_DISPLAY}>{job.results.filter(r => r.verdict === "NEEDS_REVIEW").length}</span>,
                正確 <span className="italic text-[var(--j-phosphor)]" style={FONT_DISPLAY}>{job.results.filter(r => r.verdict === "CORRECT").length}</span>,
                錯誤 <span className="italic text-[var(--j-red)]" style={FONT_DISPLAY}>{job.errors}</span>
              </div>
            )}
          </div>

          {job.results.length > 0 && (
            <>
              <div className="border-y border-[var(--j-line)] py-3 flex gap-3 items-center flex-wrap">
                <SectionLabel className="!mt-0">Filter</SectionLabel>
                {(["all", "NEEDS_REVIEW", "CORRECT", "ERROR"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={cn(
                      "px-2 py-1 text-xs italic transition border",
                      filter === f
                        ? "border-[var(--j-phosphor)] text-[var(--j-phosphor)] bg-[var(--j-phosphor-soft)]"
                        : "border-transparent text-[var(--j-ink-dim)] hover:text-[var(--j-ink)]"
                    )}
                    style={FONT_DISPLAY}>
                    {f === "all" ? "all" : f.toLowerCase()} · {f === "all" ? job.results.length : job.results.filter(r => r.verdict === f).length}
                  </button>
                ))}
              </div>

              <div>
                {filtered.map((r, i) => (
                  <article key={`${r.questionId}-${i}`} className="grid grid-cols-[100px_1fr_auto] gap-4 py-4 border-b border-[var(--j-line)]/60">
                    <Pill tone={VERDICT_TONE[r.verdict || ""] || "muted"}>{r.verdict || "?"}</Pill>
                    <div className="min-w-0">
                      <MetaText className="block mb-1.5">qid={r.questionId.slice(0, 8)}</MetaText>
                      {r.issues && r.issues.length > 0 && (
                        <div>
                          <div className="italic text-[#c77a28] flex items-center gap-1 mb-1" style={FONT_DISPLAY}>
                            <AlertTriangle size={13} /> issues found
                          </div>
                          <ul className="list-disc list-inside text-sm text-[var(--j-ink-dim)] space-y-0.5" style={FONT_ZH}>
                            {r.issues.map((iss, k) => <li key={k}>{iss}</li>)}
                          </ul>
                        </div>
                      )}
                      {r.suggestion && (
                        <div className="text-sm mt-2 pl-3 border-l-2 border-[var(--j-phosphor-line)]" style={FONT_ZH}>
                          <span className="italic text-[var(--j-phosphor)]" style={FONT_DISPLAY}>建議 · </span>
                          <span className="text-[var(--j-ink-dim)]">{r.suggestion}</span>
                        </div>
                      )}
                      {r.error && <div className="text-sm text-[var(--j-red)] mt-1" style={FONT_ZH}>錯誤：{r.error}</div>}
                    </div>
                    <Link href={`/admin/questions/${r.questionId}`} target="_blank"
                      className="px-3 py-1.5 text-xs italic text-[var(--j-ink-dim)] border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition h-fit"
                      style={FONT_DISPLAY}>
                      <Eye size={12} /> open
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
