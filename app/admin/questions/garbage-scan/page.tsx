"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Archive, Loader2, ExternalLink, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface FlaggedQuestion {
  id: string;
  stem: string;
  domain: string | null;
  status: string;
  adverbCount: number;
  flagReason: string[];
  createdBy: string | null;
  createdAt: string;
}

interface ScanResult {
  totalScanned: number;
  flaggedCount: number;
  byCreator: Record<string, number>;
  flagged: FlaggedQuestion[];
}

export default function GarbageScanPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [minAdverbs, setMinAdverbs] = useState(5);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);

  const scan = async () => {
    setScanning(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({
        minAdverbs: String(minAdverbs),
        includeArchived: includeArchived ? "1" : "0",
      });
      const res = await fetch(`/api/admin/questions/garbage-scan?${params}`, { cache: "no-store" });
      if (res.ok) setResult(await res.json());
    } finally {
      setScanning(false);
    }
  };

  const toggleAll = () => {
    if (!result) return;
    if (selected.size === result.flagged.length) setSelected(new Set());
    else setSelected(new Set(result.flagged.map((f) => f.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const archiveSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`確定要將 ${selected.size} 題封存（ARCHIVE）嗎？`)) return;
    setArchiving(true);
    try {
      const res = await fetch("/api/admin/questions/garbage-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const body = await res.json();
      if (res.ok) {
        alert(`已封存 ${body.archived} 題`);
        await scan();
      } else {
        alert(body.error ?? "失敗");
      }
    } finally {
      setArchiving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5 max-w-5xl"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">垃圾題目掃描</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          偵測 LLM 生成失控的雜訊副詞污染題（gracefully、smartly、securely 等堆疊）和 rationale 含「無關雜訊」的題目
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-[var(--text-secondary)]">
            最少副詞數
            <input
              type="number"
              value={minAdverbs}
              onChange={(e) => setMinAdverbs(Math.max(1, parseInt(e.target.value) || 5))}
              className="ml-2 w-16 px-2 py-1 rounded border bg-[var(--bg-base)]"
              style={{ borderColor: "var(--border-subtle)" }}
            />
          </label>
          <label className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            含 ARCHIVED
          </label>
          <Button onClick={scan} disabled={scanning}>
            {scanning ? <><Loader2 size={14} className="animate-spin mr-1.5" />掃描中…</>
                      : <><Search size={14} className="mr-1.5" />開始掃描</>}
          </Button>
        </div>
      </div>

      {result && (
        <>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3">
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <span className="text-[var(--text-secondary)]">掃描 {result.totalScanned} 題</span>
              <span className="font-semibold text-[var(--error)]">標記 {result.flaggedCount} 題</span>
            </div>
            {Object.keys(result.byCreator).length > 0 && (
              <div className="text-xs text-[var(--text-muted)]">
                建立者分布：
                {Object.entries(result.byCreator)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([c, n]) => (
                    <span key={c} className="ml-2 font-mono">
                      {(c ?? "—").slice(0, 12)}={n}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {result.flagged.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--gold)]"
              >
                {selected.size === result.flagged.length ? "取消全選" : "全選"}
              </button>
              <span className="text-xs text-[var(--text-muted)]">已選 {selected.size}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={selected.size === 0 || archiving}
                onClick={archiveSelected}
              >
                {archiving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Archive size={14} className="mr-1.5" />}
                批量封存（{selected.size}）
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {result.flagged.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border p-3 flex items-start gap-3"
                style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(f.id)}
                  onChange={() => toggle(f.id)}
                  className="mt-1 flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[var(--text-muted)]">{f.id.slice(0, 8)}</span>
                    <Badge variant={f.status === "APPROVED" ? "success" : "muted"}>{f.status}</Badge>
                    <Badge variant="error">
                      <AlertTriangle size={10} className="inline mr-1" />
                      {f.adverbCount} 雜訊
                    </Badge>
                    {f.flagReason.map((r) => (
                      <span key={r} className="text-xs text-[var(--warning)]">• {r}</span>
                    ))}
                    {f.domain && <span className="text-xs text-[var(--text-secondary)]">{f.domain}</span>}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{f.stem}</p>
                </div>
                <a
                  href={`/admin/questions/${f.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs text-[var(--text-muted)] hover:text-[var(--gold)] flex items-center gap-1"
                >
                  <ExternalLink size={12} />查看
                </a>
              </div>
            ))}
          </div>

          {result.flagged.length === 0 && (
            <p className="text-center py-12 text-sm text-[var(--text-muted)]">
              ✅ 沒有發現雜訊污染題
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
