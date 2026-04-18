"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Archive, Check, Loader2, Sparkles, Wand2, X } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface ScanRow {
  id: string;
  stem: string;
  stemZh: string | null;
  domain: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  questionType: string;
  explanationLength: number;
  issues: string[];
}

interface Summary {
  totalApproved: number;
  missingExplanation: number;
  shortExplanation: number;
  missingRationales: number;
  missingStemZh: number;
  garbledChinese: number;
}

interface EnhancePreview {
  questionId: string;
  preview: {
    explanationZh: string;
    optionRationales: Record<string, string>;
    usTwDifference: string;
    stemZh: string;
  };
  current: {
    explanationZh: string;
    optionRationales: any;
    usTwDifference: string | null;
    stemZh: string | null;
  };
  costUsd: number;
}

const ISSUE_LABELS: Record<string, string> = {
  missing_explanation: "缺解析",
  short_explanation: "解析過短",
  missing_rationales: "缺選項分析",
  missing_stem_zh: "缺中文題幹",
  garbled_chinese: "中文亂碼",
};

const ISSUE_COLORS: Record<string, "error" | "warning" | "muted"> = {
  missing_explanation: "error",
  short_explanation: "warning",
  missing_rationales: "warning",
  missing_stem_zh: "muted",
  garbled_chinese: "error",
};

export default function QuestionQualityPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [issueFilter, setIssueFilter] = useState<string>("missing_explanation");
  const [loading, setLoading] = useState(true);
  const [enhancing, setEnhancing] = useState<string | null>(null);
  const [preview, setPreview] = useState<EnhancePreview | null>(null);
  const [applying, setApplying] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/questions/scan?issue=${issueFilter}&pageSize=50`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setRows(data.rows);
      }
    } finally {
      setLoading(false);
    }
  }, [issueFilter]);

  useEffect(() => { load(); }, [load]);

  const handleEnhance = async (id: string) => {
    setEnhancing(id);
    setPreview(null);
    try {
      const res = await fetch("/api/admin/questions/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id }),
      });
      const data = await res.json();
      if (res.ok) setPreview(data);
      else alert(data.error ?? "AI 強化失敗");
    } catch (e: any) {
      alert("網路錯誤：" + e.message);
    } finally {
      setEnhancing(null);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    setApplying(true);
    try {
      const res = await fetch("/api/admin/questions/enhance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: preview.questionId,
          explanationZh: preview.preview.explanationZh,
          optionRationales: preview.preview.optionRationales,
          usTwDifference: preview.preview.usTwDifference,
          stemZh: preview.preview.stemZh,
        }),
      });
      if (res.ok) {
        setPreview(null);
        await load();
      } else {
        alert("套用失敗");
      }
    } finally {
      setApplying(false);
    }
  };

  const filters = [
    { key: "missing_explanation", label: "缺解析", count: summary?.missingExplanation },
    { key: "short_explanation",   label: "解析過短", count: summary?.shortExplanation },
    { key: "missing_rationales",  label: "缺選項分析", count: summary?.missingRationales },
    { key: "missing_stem_zh",     label: "缺中文題幹", count: summary?.missingStemZh },
    { key: "garbled_chinese",     label: "中文亂碼", count: summary?.garbledChinese },
  ];

  const handleArchiveCurrent = async () => {
    if (!summary) return;
    const count =
      issueFilter === "missing_explanation" ? summary.missingExplanation :
      issueFilter === "short_explanation"   ? summary.shortExplanation :
      issueFilter === "missing_rationales"  ? summary.missingRationales :
      issueFilter === "missing_stem_zh"     ? summary.missingStemZh :
      issueFilter === "garbled_chinese"     ? summary.garbledChinese :
      0;
    if (count === 0) { alert("此類別沒有題目"); return; }
    if (!confirm(`確定要將這 ${count} 道「${ISSUE_LABELS[issueFilter]}」的題目全部封存嗎？\n\n封存後題目不會出現在練習與評估，但仍可從後台還原。`)) return;

    setArchiving(true);
    setArchiveResult(null);
    try {
      const res = await fetch("/api/admin/questions/archive-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues: [issueFilter] }),
      });
      const data = await res.json();
      if (res.ok) {
        setArchiveResult(`✅ 已封存 ${data.archived} 道題目`);
        await load();
      } else {
        setArchiveResult(`❌ 封存失敗：${data.error ?? "unknown"}`);
      }
    } catch (e: any) {
      setArchiveResult(`❌ 網路錯誤：${e.message}`);
    } finally {
      setArchiving(false);
    }
  };

  const handleArchiveAll = async () => {
    if (!summary) return;
    const total =
      summary.missingExplanation +
      summary.shortExplanation +
      summary.missingRationales +
      summary.missingStemZh +
      summary.garbledChinese;
    if (total === 0) { alert("目前沒有問題題目"); return; }
    if (!confirm(`確定要將所有問題題目（總計約 ${total} 道，可能有重複）全部封存嗎？\n\n封存後題目不會出現在練習與評估，但仍可從後台還原。`)) return;

    setArchiving(true);
    setArchiveResult(null);
    try {
      const res = await fetch("/api/admin/questions/archive-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issues: ["missing_explanation", "short_explanation", "missing_rationales", "missing_stem_zh", "garbled_chinese"],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setArchiveResult(`✅ 已封存 ${data.archived} 道題目（去除重複後）`);
        await load();
      } else {
        setArchiveResult(`❌ 封存失敗：${data.error ?? "unknown"}`);
      }
    } catch (e: any) {
      setArchiveResult(`❌ 網路錯誤：${e.message}`);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
          <Sparkles size={18} className="text-[#080E1A]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">題目品質檢查</h1>
          <p className="text-sm text-[var(--text-muted)]">
            掃描題庫中解析過短、缺欄位等問題，AI 協助補強
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{summary.totalApproved}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">已核准題目</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4">
            <div className="text-2xl font-bold text-[var(--error)]">{summary.missingExplanation}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">缺解析</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4">
            <div className="text-2xl font-bold text-[var(--warning)]">{summary.shortExplanation}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">解析過短</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4">
            <div className="text-2xl font-bold text-[var(--warning)]">{summary.missingRationales}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">缺選項分析</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4">
            <div className="text-2xl font-bold text-[var(--text-muted)]">{summary.missingStemZh}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">缺中文題幹</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4">
            <div className="text-2xl font-bold text-[var(--error)]">{summary.garbledChinese}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">中文亂碼</div>
          </div>
        </div>
      )}

      {/* Batch archive actions */}
      {summary && (
        <div className="flex items-center gap-2 flex-wrap p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <AlertCircle size={18} className="text-[var(--warning)]" />
          <span className="text-sm text-[var(--text-secondary)]">批次處理：</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleArchiveCurrent}
            disabled={archiving}
          >
            {archiving
              ? <><Loader2 size={14} className="animate-spin" /> 處理中</>
              : <><Archive size={14} /> 封存此類別</>}
          </Button>
          <Button
            size="sm"
            variant="gold"
            onClick={handleArchiveAll}
            disabled={archiving}
          >
            <Archive size={14} /> 封存所有問題題目
          </Button>
          {archiveResult && (
            <span className="text-xs text-[var(--text-secondary)] ml-2">{archiveResult}</span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setIssueFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              issueFilter === f.key
                ? "bg-[var(--gold)] text-[#080E1A]"
                : "bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--gold)]"
            }`}
          >
            {f.label} {f.count !== undefined && <span className="ml-1 opacity-70">({f.count})</span>}
          </button>
        ))}
      </div>

      {/* Question list */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="animate-spin text-[var(--gold)]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <Check size={32} className="mx-auto mb-2 text-[var(--success)]" /> 此類別目前沒有問題題目
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {rows.map((q) => (
              <div key={q.id} className="p-4 flex items-start gap-4 hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant={q.difficulty === "HARD" ? "error" : q.difficulty === "MEDIUM" ? "gold" : "success"}>
                      {q.difficulty}
                    </Badge>
                    <span className="text-xs text-[var(--text-muted)]">{q.domain ?? "未分類"}</span>
                    <span className="text-xs text-[var(--text-muted)]">· {q.questionType}</span>
                    <span className="text-xs text-[var(--text-muted)]">· 解析 {q.explanationLength} 字</span>
                    {q.issues.map((i) => (
                      <Badge key={i} variant={ISSUE_COLORS[i] ?? "muted"}>{ISSUE_LABELS[i] ?? i}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-[var(--text-primary)] line-clamp-2">{q.stemZh ?? q.stem}</p>
                  <div className="text-xs text-[var(--text-muted)] mt-1 font-mono truncate">{q.id}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEnhance(q.id)}
                  disabled={enhancing === q.id}
                  className="flex-shrink-0"
                >
                  {enhancing === q.id
                    ? <><Loader2 size={14} className="animate-spin" /> 生成中</>
                    : <><Wand2 size={14} /> AI 強化</>}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhancement preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="text-[var(--gold)]" size={18} />
                <h3 className="font-semibold text-[var(--text-primary)]">AI 強化預覽</h3>
                <Badge variant="muted">費用 ${preview.costUsd}（≈ NT${Math.round(preview.costUsd * 32 * 10) / 10}）</Badge>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="w-8 h-8 rounded-lg hover:bg-[var(--bg-elevated)] flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Explanation */}
              <section>
                <h4 className="text-sm font-semibold text-[var(--gold)] mb-2">詳細解析（新）</h4>
                <div className="rounded-lg bg-[var(--bg-elevated)] p-4 text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                  {preview.preview.explanationZh}
                </div>
                {preview.current.explanationZh && (
                  <details className="mt-2">
                    <summary className="text-xs text-[var(--text-muted)] cursor-pointer">原解析</summary>
                    <div className="mt-1 rounded-lg bg-[var(--bg-base)] p-3 text-xs text-[var(--text-muted)] whitespace-pre-wrap">
                      {preview.current.explanationZh}
                    </div>
                  </details>
                )}
              </section>

              {/* Option rationales */}
              {Object.keys(preview.preview.optionRationales).length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-[var(--gold)] mb-2">各選項分析</h4>
                  <div className="space-y-2">
                    {Object.entries(preview.preview.optionRationales).map(([letter, text]) => (
                      <div key={letter} className="rounded-lg bg-[var(--bg-elevated)] p-3">
                        <span className="text-xs font-bold text-[var(--gold)] mr-2">{letter}.</span>
                        <span className="text-sm text-[var(--text-primary)]">{text}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* US-TW difference */}
              {preview.preview.usTwDifference && (
                <section>
                  <h4 className="text-sm font-semibold text-[var(--gold)] mb-2">台美臨床差異</h4>
                  <div className="rounded-lg bg-[var(--gold-dim)] p-3 text-sm text-[var(--text-primary)] leading-relaxed">
                    {preview.preview.usTwDifference}
                  </div>
                </section>
              )}

              {/* Stem ZH if newly generated */}
              {preview.preview.stemZh && !preview.current.stemZh && (
                <section>
                  <h4 className="text-sm font-semibold text-[var(--gold)] mb-2">中文題幹（新增）</h4>
                  <div className="rounded-lg bg-[var(--bg-elevated)] p-3 text-sm text-[var(--text-primary)]">
                    {preview.preview.stemZh}
                  </div>
                </section>
              )}
            </div>

            <div className="sticky bottom-0 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] p-4 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setPreview(null)}>取消</Button>
              <Button variant="gold" onClick={handleApply} loading={applying}>
                <Check size={14} /> 套用到題庫
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
