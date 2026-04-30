"use client";
/**
 * RepairsTab — Agent 自動產生的修復提議審查與一鍵套用。
 *
 * 流程：
 *  1. propose-repairs cron (05:00 UTC) 寫入 QuestionVersion (snapshot.applied=false)
 *  2. 這個 tab 列出未套用的 proposals
 *  3. admin 看 diff、按 Apply 或 Reject，或 Bulk Apply 高信心的批次
 */
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Eye, Check, X, Zap, ChevronDown, ChevronRight } from "lucide-react";
import { SectionLabel, MetaText, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

interface Proposal {
  proposalId: string;
  questionId: string;
  createdAt: string;
  confidence: number;
  changeSummary: string;
  proposed: Record<string, any>;
  verdict?: any;
  issueId?: string;
  question: {
    id: string;
    stem: string;
    stemZh?: string;
    optionA?: string; optionB?: string; optionC?: string; optionD?: string; optionE?: string; optionF?: string;
    correctAnswer?: string;
    correctAnswers?: string[];
    explanationZh?: string;
    optionRationales?: any;
    status?: string;
    module?: string;
    difficulty?: string;
  };
}

interface Stats { total: number; highConfidence: number; mediumConfidence: number; lowConfidence: number; }

const FIELD_LABELS: Record<string, string> = {
  stem: "題幹 (EN)",
  stemZh: "題幹 (ZH)",
  optionA: "選項 A", optionB: "選項 B", optionC: "選項 C", optionD: "選項 D",
  optionE: "選項 E", optionF: "選項 F",
  correctAnswer: "正確答案",
  correctAnswers: "答案陣列",
  explanationZh: "解析 (ZH)",
  explanationEn: "解析 (EN)",
  optionRationales: "選項分析",
};

function confidenceTone(conf: number): "phosphor" | "warning" | "muted" {
  if (conf >= 90) return "phosphor";
  if (conf >= 70) return "warning";
  return "muted";
}

function formatValue(v: any): string {
  if (v === null || v === undefined) return "(無)";
  if (typeof v === "string") return v;
  return JSON.stringify(v, null, 2);
}

export default function RepairsTab() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [minConfidence, setMinConfidence] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/repair-proposals?minConfidence=${minConfidence}&limit=100`, { cache: "no-store" });
      const j = await r.json();
      setItems(j.proposals || []);
      setStats(j.stats || null);
    } finally { setLoading(false); }
  }, [minConfidence]);
  useEffect(() => { load(); }, [load]);

  const showToast = (s: string) => { setToast(s); setTimeout(() => setToast(null), 3500); };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const apply = async (p: Proposal) => {
    if (!confirm(`套用此修復到題目 ${p.questionId.slice(0, 8)}？\n\n變更摘要：\n${p.changeSummary}\n\n影響欄位：${Object.keys(p.proposed).join(", ")}`)) return;
    setBusy(prev => new Set(prev).add(p.proposalId));
    try {
      const r = await fetch(`/api/admin/repair-proposals/${p.proposalId}/apply`, { method: "POST" });
      const j = await r.json();
      if (j.ok) {
        showToast(`✓ 已套用 ${j.applied?.length} 個欄位到題目`);
        await load();
      } else {
        showToast(`✗ 失敗: ${j.error}`);
      }
    } catch (e: any) { showToast(`✗ 錯誤: ${e.message}`); }
    finally {
      setBusy(prev => { const n = new Set(prev); n.delete(p.proposalId); return n; });
    }
  };

  const reject = async (p: Proposal) => {
    const reason = prompt("拒絕理由（簡短說明）", "agent 建議不正確");
    if (!reason) return;
    setBusy(prev => new Set(prev).add(p.proposalId));
    try {
      const r = await fetch(`/api/admin/repair-proposals/${p.proposalId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, alsoCloseIssue: false }),
      });
      const j = await r.json();
      if (j.ok) { showToast("✓ 已拒絕"); await load(); }
      else showToast(`✗ ${j.error}`);
    } catch (e: any) { showToast(`✗ ${e.message}`); }
    finally {
      setBusy(prev => { const n = new Set(prev); n.delete(p.proposalId); return n; });
    }
  };

  const bulkApply = async (threshold: number) => {
    const candidates = items.filter(i => i.confidence >= threshold);
    if (candidates.length === 0) { alert(`沒有信心度 ≥ ${threshold} 的提議`); return; }
    if (!confirm(`一鍵套用所有信心度 ≥ ${threshold} 的修復共 ${candidates.length} 件？\n\n建議先預覽 (dry-run) 再套用。`)) return;
    setBulkBusy(true);
    try {
      const r = await fetch("/api/admin/repair-proposals/bulk-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minConfidence: threshold, dryRun: false, limit: 100 }),
      });
      const j = await r.json();
      if (j.ok) {
        showToast(`✓ 套用 ${j.applied} 件，失敗 ${j.failed} 件`);
        await load();
      } else {
        showToast(`✗ ${j.error}`);
      }
    } catch (e: any) { showToast(`✗ ${e.message}`); }
    finally { setBulkBusy(false); }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 border border-[var(--j-line-strong)] bg-[var(--j-bg)] shadow-lg italic"
          style={FONT_DISPLAY}>
          {toast}
        </div>
      )}

      {/* Stats + filter + bulk actions */}
      <div className="border-y border-[var(--j-line)] py-4 flex flex-wrap items-center gap-4">
        <SectionLabel className="!mt-0">Mending desk</SectionLabel>
        {stats && (
          <span className="text-sm italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
            {stats.total} pending · <span className="text-[var(--j-phosphor)]">{stats.highConfidence}</span> high · {stats.mediumConfidence} medium · {stats.lowConfidence} low
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-[var(--j-ink-dim)] uppercase tracking-wider" style={FONT_MONO}>min</label>
          <select value={minConfidence} onChange={e => setMinConfidence(Number(e.target.value))}
            className="border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-1 text-sm" style={FONT_MONO}>
            <option value={0}>all</option>
            <option value={70}>≥ 70</option>
            <option value={80}>≥ 80</option>
            <option value={90}>≥ 90</option>
            <option value={95}>≥ 95</option>
          </select>
          <button onClick={() => bulkApply(95)} disabled={bulkBusy}
            className="px-3 py-1.5 text-xs flex items-center gap-1 border border-[var(--j-phosphor-line)] text-[var(--j-phosphor)] hover:bg-[var(--j-phosphor-soft)] italic disabled:opacity-50 transition"
            style={FONT_DISPLAY}>
            {bulkBusy ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />}
            apply all ≥95
          </button>
          <button onClick={load} className="text-xs text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1 px-2 py-1.5 transition" style={FONT_MONO}>
            <RefreshCw size={12} /> refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--j-ink-dim)] py-4 italic" style={FONT_DISPLAY}>
          <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} /> Reading the mending pile…
        </div>
      ) : items.length === 0 ? (
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-12 text-center italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
          — No pending repairs at the bench.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(p => {
            const isOpen = expanded.has(p.proposalId);
            const isBusy = busy.has(p.proposalId);
            const fields = Object.keys(p.proposed || {});
            return (
              <article key={p.proposalId} className="border border-[var(--j-line)] hover:border-[var(--j-line-strong)] transition-colors">
                {/* Header row */}
                <div className="grid grid-cols-[40px_100px_1fr_auto] gap-3 items-center p-3">
                  <button onClick={() => toggleExpand(p.proposalId)}
                    className="text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex justify-center transition">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex flex-col gap-1">
                    <Pill tone={confidenceTone(p.confidence)}>conf {p.confidence}</Pill>
                    <MetaText>{new Date(p.createdAt).toLocaleDateString("zh-TW")}</MetaText>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[var(--j-ink)] italic mb-1" style={FONT_DISPLAY}>
                      {p.changeSummary}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <MetaText>qid={p.questionId.slice(0, 8)}</MetaText>
                      {p.question?.module && <Pill>{p.question.module}</Pill>}
                      {p.question?.status && <Pill tone={p.question.status === "APPROVED" ? "phosphor" : "warning"}>{p.question.status}</Pill>}
                      <span className="text-xs text-[var(--j-ink-dim)]" style={FONT_MONO}>
                        {fields.length} field{fields.length !== 1 ? "s" : ""}: {fields.slice(0, 3).join(",")}{fields.length > 3 ? `+${fields.length - 3}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => apply(p)} disabled={isBusy}
                      className="px-3 py-1.5 text-xs flex items-center gap-1 border border-[var(--j-phosphor-line)] text-[var(--j-phosphor)] hover:bg-[var(--j-phosphor-soft)] italic disabled:opacity-50 transition"
                      style={FONT_DISPLAY}>
                      {isBusy ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />} apply
                    </button>
                    <button onClick={() => reject(p)} disabled={isBusy}
                      className="px-3 py-1.5 text-xs flex items-center gap-1 border border-[var(--j-line)] text-[var(--j-ink-dim)] hover:border-[var(--j-red)] hover:text-[var(--j-red)] italic disabled:opacity-50 transition"
                      style={FONT_DISPLAY}>
                      <X size={12} /> reject
                    </button>
                    <Link href={`/admin/questions/${p.questionId}`} target="_blank"
                      className="px-3 py-1.5 text-xs flex items-center gap-1 border border-[var(--j-line)] text-[var(--j-ink-dim)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] italic transition"
                      style={FONT_DISPLAY}>
                      <Eye size={12} /> open
                    </Link>
                  </div>
                </div>

                {/* Expanded diff view */}
                {isOpen && (
                  <div className="border-t border-[var(--j-line)] bg-[var(--j-bg-card)] p-4">
                    {p.verdict?.reasoning && (
                      <div className="mb-3 pl-3 border-l-2 border-[var(--j-phosphor-line)] text-sm text-[var(--j-ink-dim)]" style={FONT_ZH}>
                        <span className="text-[var(--j-phosphor)] text-[10px] tracking-wider uppercase mr-2" style={FONT_MONO}>verifier</span>
                        {p.verdict.reasoning}
                      </div>
                    )}
                    <div className="space-y-3">
                      {Object.entries(p.proposed).map(([field, newValue]) => {
                        const oldValue = (p.question as any)?.[field];
                        return (
                          <div key={field} className="grid grid-cols-[140px_1fr_1fr] gap-3 text-xs">
                            <div className="text-[var(--j-ink-dim)] uppercase tracking-wider pt-1" style={FONT_MONO}>
                              {FIELD_LABELS[field] || field}
                            </div>
                            <div className="border-l-2 border-[var(--j-red)]/40 pl-2 text-[var(--j-ink-dim)] line-through opacity-70" style={FONT_ZH}>
                              <pre className="whitespace-pre-wrap break-words" style={{ fontFamily: "inherit" }}>{formatValue(oldValue).slice(0, 500)}</pre>
                            </div>
                            <div className="border-l-2 border-[var(--j-phosphor)] pl-2 text-[var(--j-ink)]" style={FONT_ZH}>
                              <pre className="whitespace-pre-wrap break-words" style={{ fontFamily: "inherit" }}>{formatValue(newValue).slice(0, 500)}</pre>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
