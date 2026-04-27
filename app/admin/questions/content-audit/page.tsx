"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle, XCircle, Loader2, Play, Trash2, ExternalLink, RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { AuditJob } from "@/app/api/admin/questions/content-audit/route";
import type { AuditVerdict } from "@/lib/geminiAudit";

const SCOPES = [
  { key: "reported", label: "僅回報題目", desc: "有 pending/reviewed 回報的題目（快，建議先跑）" },
  { key: "approved", label: "所有已發布題目", desc: "全部 APPROVED 狀態的題目（較慢）" },
  { key: "all", label: "全部題目", desc: "包含 DRAFT / ARCHIVED（最慢）" },
] as const;

const verdictStyle: Record<AuditVerdict, { variant: "success" | "warning" | "error"; label: string; icon: typeof CheckCircle }> = {
  CORRECT:      { variant: "success", label: "正確",   icon: CheckCircle },
  NEEDS_REVIEW: { variant: "warning", label: "待複審", icon: AlertTriangle },
  ERROR:        { variant: "error",   label: "有錯誤", icon: XCircle },
};

export default function ContentAuditPage() {
  const [job, setJob] = useState<AuditJob | null>(null);
  const [scope, setScope] = useState<"reported" | "approved" | "all">("reported");
  const [starting, setStarting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [verdictFilter, setVerdictFilter] = useState<AuditVerdict | "ALL">("ALL");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/questions/content-audit", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setJob(data.job ?? null);
      return data.job as AuditJob | null;
    } catch {
      return null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const j = await fetchJob();
      if (j?.status !== "running") {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 4000);
  }, [fetchJob]);

  useEffect(() => {
    fetchJob().then((j) => {
      if (j?.status === "running") startPolling();
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchJob, startPolling]);

  const startAudit = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/admin/questions/content-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const body = await res.json();
      if (!res.ok) { alert(body.error ?? "啟動失敗"); return; }
      await fetchJob();
      startPolling();
    } finally {
      setStarting(false);
    }
  };

  const clearJob = async () => {
    setClearing(true);
    try {
      await fetch("/api/admin/questions/content-audit", { method: "DELETE" });
      setJob(null);
    } finally {
      setClearing(false);
    }
  };

  const filteredResults = job?.results.filter(
    (r) => verdictFilter === "ALL" || r.verdict === verdictFilter
  ) ?? [];

  const errorCount   = job?.results.filter((r) => r.verdict === "ERROR").length ?? 0;
  const reviewCount  = job?.results.filter((r) => r.verdict === "NEEDS_REVIEW").length ?? 0;
  const correctCount = job?.results.filter((r) => r.verdict === "CORRECT").length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6 max-w-5xl"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI 內容審核</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          使用 Gemini 逐題驗證臨床正確性——答案是否符合 NCLEX 標準、有無事實錯誤
        </p>
      </div>

      {/* Start panel */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">選擇審核範圍</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              disabled={job?.status === "running"}
              className="text-left p-3 rounded-lg border transition"
              style={{
                borderColor: scope === s.key ? "var(--gold)" : "var(--border-subtle)",
                background: scope === s.key ? "var(--gold-dim)" : "transparent",
                color: scope === s.key ? "var(--gold)" : "var(--text-secondary)",
                opacity: job?.status === "running" ? 0.4 : 1,
              }}
            >
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="text-xs mt-0.5 text-[var(--text-muted)]">{s.desc}</div>
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            onClick={startAudit}
            disabled={starting || job?.status === "running"}
          >
            {starting
              ? <><Loader2 size={14} className="animate-spin mr-1.5" />啟動中…</>
              : <><Play size={14} className="mr-1.5" />開始 AI 審核</>}
          </Button>
          {job && job.status !== "running" && (
            <button
              onClick={clearJob}
              disabled={clearing}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--error)] transition"
            >
              <Trash2 size={14} />清除結果
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {job && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {job.status === "running" && <Loader2 size={15} className="animate-spin text-[var(--gold)]" />}
              {job.status === "done"    && <CheckCircle size={15} className="text-[var(--success)]" />}
              {job.status === "failed"  && <XCircle size={15} className="text-[var(--error)]" />}
              <span className="text-sm font-semibold text-[var(--text-primary)]">{job.message}</span>
            </div>
            {job.status === "running" && (
              <button onClick={fetchJob} className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--gold)]">
                <RefreshCw size={12} />刷新
              </button>
            )}
          </div>

          {job.total > 0 && (
            <div className="space-y-1">
              <div className="h-2 rounded-full overflow-hidden bg-[var(--bg-overlay)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((job.done / job.total) * 100)}%`,
                    background: "var(--gold)",
                  }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {job.done} / {job.total} 題（範圍：{job.scope}）
              </p>
            </div>
          )}

          {job.status === "done" && job.results.length > 0 && (
            <div className="flex gap-3 flex-wrap pt-1">
              {[
                { verdict: "ERROR"        as AuditVerdict, count: errorCount,   emoji: "❌" },
                { verdict: "NEEDS_REVIEW" as AuditVerdict, count: reviewCount,  emoji: "⚠️" },
                { verdict: "CORRECT"      as AuditVerdict, count: correctCount, emoji: "✅" },
              ].map(({ verdict, count, emoji }) => (
                <button
                  key={verdict}
                  onClick={() => setVerdictFilter(verdictFilter === verdict ? "ALL" : verdict)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition"
                  style={{
                    borderColor: verdictFilter === verdict ? "var(--gold)" : "var(--border-subtle)",
                    background: verdictFilter === verdict ? "var(--gold-dim)" : "transparent",
                    color: "var(--text-secondary)",
                  }}
                >
                  {emoji} {verdict === "ERROR" ? "有錯誤" : verdict === "NEEDS_REVIEW" ? "待複審" : "正確"} {count}
                </button>
              ))}
              <button
                onClick={() => setVerdictFilter("ALL")}
                className="px-3 py-1.5 rounded-lg text-sm border transition"
                style={{
                  borderColor: verdictFilter === "ALL" ? "var(--gold)" : "var(--border-subtle)",
                  background: verdictFilter === "ALL" ? "var(--gold-dim)" : "transparent",
                  color: "var(--text-secondary)",
                }}
              >
                全部 {job.results.length}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {filteredResults.length > 0 && (
        <div className="space-y-2">
          {filteredResults.map((r) => {
            const style = verdictStyle[r.verdict];
            const Icon = style.icon;
            return (
              <div
                key={r.id}
                className="rounded-xl border p-4 space-y-2"
                style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={
                      r.verdict === "ERROR" ? "text-[var(--error)]"
                      : r.verdict === "NEEDS_REVIEW" ? "text-[var(--warning)]"
                      : "text-[var(--success)]"
                    } />
                    <Badge variant={style.variant}>{style.label}</Badge>
                    <span className="text-xs font-mono text-[var(--text-muted)]">{r.id.substring(0, 8)}</span>
                  </div>
                  <a
                    href={`/admin/questions/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition flex-shrink-0"
                  >
                    <ExternalLink size={12} />查看題目
                  </a>
                </div>

                {r.issues.length > 0 && (
                  <ul className="space-y-0.5 pl-1">
                    {r.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-1.5">
                        <span className="text-[var(--error)] flex-shrink-0 mt-0.5">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}
                {r.suggestion && (
                  <div className="rounded-lg p-2.5 text-sm text-[var(--text-secondary)]"
                       style={{ background: "var(--bg-elevated)" }}>
                    <span className="font-semibold text-[var(--gold)] mr-1">建議修正：</span>
                    {r.suggestion}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {job?.status === "done" && filteredResults.length === 0 && (
        <p className="text-center text-sm text-[var(--text-muted)] py-8">
          {verdictFilter === "ALL" ? "沒有結果" : `沒有「${verdictStyle[verdictFilter as AuditVerdict]?.label}」的題目`}
        </p>
      )}
    </motion.div>
  );
}
