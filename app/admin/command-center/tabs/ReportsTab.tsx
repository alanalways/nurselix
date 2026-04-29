"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Eye, Clock, Mail } from "lucide-react";
import { SectionLabel, MetaText, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

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

const STATUS_TONE: Record<string, "warning" | "phosphor" | "muted" | "neutral"> = {
  PENDING: "warning",
  pending: "warning",
  IN_REVIEW: "phosphor",
  reviewed: "phosphor",
  RESOLVED_FIXED: "phosphor",
  RESOLVED_INVALID: "muted",
  RESOLVED_DUPLICATE: "muted",
  resolved: "phosphor",
};

const SELECT_CLS = "border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--j-phosphor)]";

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

  // "unread" = pending AND not yet triaged. After NIM triage runs the row
  // either transitions to IN_REVIEW or stays PENDING-but-triaged (UNCERTAIN).
  // Either way it's no longer unread.
  const unreadCount = items.filter(r =>
    (r.status === "PENDING" || r.status === "pending") && !r.triagedAt
  ).length;
  const triagedCount = items.filter(r => r.triagedAt).length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="border-y border-[var(--j-line)] py-3 flex flex-wrap items-center gap-3">
        <Mail size={14} className="text-[var(--j-ink-muted)]" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={SELECT_CLS} style={FONT_MONO}>
          <option value="">所有狀態</option>
          <option value="PENDING">PENDING（待處理）</option>
          <option value="pending">pending（舊版）</option>
          <option value="IN_REVIEW">IN_REVIEW（複核中）</option>
          <option value="RESOLVED_FIXED">RESOLVED_FIXED（已修復）</option>
          <option value="RESOLVED_INVALID">RESOLVED_INVALID（無效）</option>
          <option value="RESOLVED_DUPLICATE">RESOLVED_DUPLICATE（重複）</option>
        </select>
        <span className="text-sm italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
          {items.length} letters · {unreadCount} unread{triagedCount > 0 && ` · ${triagedCount} AI-triaged`}
        </span>
        <div className="ml-auto flex gap-3 text-sm">
          <button onClick={dedup} disabled={dedupRunning}
            className="text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1 italic disabled:opacity-50 transition"
            style={FONT_DISPLAY}>
            {dedupRunning ? <Loader2 className="animate-spin" size={13} /> : null} merge duplicates
          </button>
          <button onClick={load} className="text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition" style={FONT_MONO}>
            <RefreshCw size={13} /> refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--j-ink-dim)] py-4 italic" style={FONT_DISPLAY}>
          <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} /> Reading the post bag…
        </div>
      ) : items.length === 0 ? (
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-12 text-center italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
          — Empty post bag.
        </div>
      ) : (
        <div>
          {items.map(r => (
            <article key={r.id} className="grid grid-cols-[100px_1fr_auto] gap-4 py-4 border-b border-[var(--j-line)]/60 hover:bg-[var(--j-phosphor-soft)] transition-colors">
              <div className="flex flex-col gap-1.5">
                <Pill tone={STATUS_TONE[r.status] || "muted"}>{r.status}</Pill>
                <MetaText className="flex items-center gap-1">
                  <Clock size={10} /> {new Date(r.createdAt).toLocaleDateString("zh-TW")}
                </MetaText>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  {r.reasonCategory && <Pill>{r.reasonCategory}</Pill>}
                  {r.triageVerdict && <Pill tone="phosphor">AI · {r.triageVerdict}</Pill>}
                </div>
                <div className="italic text-[var(--j-ink)] mb-1" style={FONT_DISPLAY}>{r.reason}</div>
                {r.detail && <div className="text-sm text-[var(--j-ink-dim)] mb-1.5" style={FONT_ZH}>{r.detail}</div>}
                {r.triageNotes && (
                  <div className="text-xs text-[var(--j-ink-dim)] mt-2 pl-3 border-l-2 border-[var(--j-phosphor-line)]" style={FONT_ZH}>
                    <span className="text-[var(--j-phosphor)]" style={FONT_MONO}>EDITOR · </span>
                    {r.triageNotes}
                  </div>
                )}
                {r.question && (
                  <div className="text-sm text-[var(--j-ink-dim)] mt-2 line-clamp-2" style={FONT_ZH}>{r.question.stem.slice(0, 200)}</div>
                )}
                <MetaText className="mt-2 block">
                  {r.user?.email && <span>by {r.user.email}</span>}
                  {r.question && <span> · qid={r.questionId.slice(0,8)}{r.question.domain ? ` · ${r.question.domain}` : ""}</span>}
                </MetaText>
              </div>

              <Link href={`/admin/questions/${r.questionId}`} target="_blank"
                className="px-3 py-1.5 text-xs text-[var(--j-ink-dim)] border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] flex items-center gap-1 italic transition h-fit"
                style={FONT_DISPLAY}>
                <Eye size={12} /> open
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
