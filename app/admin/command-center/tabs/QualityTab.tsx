"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Eye, Filter } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, MetaText, JournalRow, JournalCta, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

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

const SEVERITY_TONE: Record<string, "danger" | "warning" | "neutral" | "muted"> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "neutral",
  LOW: "muted",
};

const SELECT_CLS = "border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--j-phosphor)]";

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
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="border-y border-[var(--j-line)] py-3 flex flex-wrap items-center gap-3">
        <Filter size={14} className="text-[var(--j-ink-muted)]" />
        <select value={severity} onChange={e => setSeverity(e.target.value)} className={SELECT_CLS} style={FONT_MONO}>
          <option value="">所有嚴重度</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select value={ruleId} onChange={e => setRuleId(e.target.value)} className={SELECT_CLS} style={FONT_MONO}>
          <option value="">所有規則</option>
          {allRules.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className={SELECT_CLS} style={FONT_MONO}>
          <option value="OPEN">OPEN</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="IGNORED">IGNORED</option>
          <option value="AUTO_ARCHIVED">AUTO_ARCHIVED</option>
        </select>
        <button onClick={load} className="ml-auto text-sm text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition" style={FONT_MONO}>
          <RefreshCw size={13} /> refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-[var(--j-ink-dim)] py-4 italic" style={FONT_DISPLAY}>
          <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} /> Reading the page proofs…
        </div>
      ) : items.length === 0 ? (
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-12 text-center">
          <CheckCircle2 size={32} className="mx-auto text-[var(--j-phosphor)] mb-3" />
          <div className="italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>— No errata. The page is clean.</div>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-[var(--j-ink-dim)] italic" style={FONT_DISPLAY}>
            {items.length} entries · sorted by severity then detected time
          </div>
          {items.map(it => (
            <article key={it.id} className="grid grid-cols-[80px_1fr_auto] gap-4 py-4 border-b border-[var(--j-line)]/60 hover:bg-[var(--j-phosphor-soft)] transition-colors">
              <div className="flex flex-col gap-1.5">
                <Pill tone={SEVERITY_TONE[it.severity] || "muted"}>{it.severity}</Pill>
                <MetaText className="!text-[var(--j-ink-muted)]">{new Date(it.detectedAt).toLocaleDateString("zh-TW")}</MetaText>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <Pill>{it.ruleId}</Pill>
                  <Pill tone="muted">Q.{it.question.status}</Pill>
                  {it.question.difficulty && <Pill tone="muted">{it.question.difficulty}</Pill>}
                </div>
                <div className="text-[var(--j-ink)] mb-1 leading-snug" style={FONT_ZH}>
                  {it.detail}
                </div>
                <div className="text-sm text-[var(--j-ink-dim)] line-clamp-2 mb-1.5" style={FONT_ZH}>
                  {it.question.stemZh || it.question.stem.slice(0, 220)}
                </div>
                <MetaText>id={it.questionId.slice(0, 8)} · ans={it.question.correctAnswer}</MetaText>
              </div>

              <div className="flex flex-col gap-1.5">
                <Link href={`/admin/questions/${it.questionId}`} target="_blank"
                  className="px-3 py-1.5 text-xs text-[var(--j-ink-dim)] border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] flex items-center gap-1 italic transition"
                  style={FONT_DISPLAY}>
                  <Eye size={12} /> open
                </Link>
                {it.status === "OPEN" && (
                  <>
                    <button onClick={() => resolve(it.id, "RESOLVED")} disabled={resolving === it.id}
                      className="px-3 py-1.5 text-xs italic text-[var(--j-phosphor)] border border-[var(--j-phosphor-line)] hover:bg-[var(--j-phosphor-soft)] flex items-center gap-1 disabled:opacity-50 transition"
                      style={FONT_DISPLAY}>
                      <CheckCircle2 size={12} /> resolved
                    </button>
                    <button onClick={() => resolve(it.id, "IGNORED")} disabled={resolving === it.id}
                      className="px-3 py-1.5 text-xs italic text-[var(--j-ink-muted)] border border-[var(--j-line)] hover:text-[var(--j-ink)] flex items-center gap-1 disabled:opacity-50 transition"
                      style={FONT_DISPLAY}>
                      <XCircle size={12} /> false alarm
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
