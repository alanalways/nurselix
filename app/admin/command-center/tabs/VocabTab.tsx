"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Trash2, Search, Play, Square, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, MetaText, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

interface OverviewResponse {
  total: number;
  categories: string[];
  byCategory: { category: string; count: number }[];
  byTier: { tier: number; count: number }[];
}

interface WordRow {
  id: string;
  word: string;
  definitionZh: string;
  category: string;
  tier: number;
  difficulty: string;
  status: string;
  updatedAt: string;
}

interface SeedJob {
  id: string;
  status: "running" | "done" | "failed" | "stopped";
  inserted: number;
  totalTarget: number;
  batchesDone: number;
  errors: number;
  currentCategory: string | null;
  lastMessage: string;
  totalCostUsd: number;
  provider?: "claude" | "gemini";
}

const SELECT_CLS = "border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--j-phosphor)]";
const NUM_INPUT_CLS = "w-full px-3 py-2 border border-[var(--j-line)] bg-[var(--j-bg)] text-[var(--j-ink)] focus:outline-none focus:border-[var(--j-phosphor)]";

export default function VocabTab() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [rows, setRows] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tier, setTier] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [seedTier, setSeedTier] = useState(1);
  const [seedPerCat, setSeedPerCat] = useState(50);
  const [seedBatch, setSeedBatch] = useState(15);
  const [seedCats, setSeedCats] = useState<string[]>([]);
  const [seedProvider, setSeedProvider] = useState<"claude" | "gemini">("claude");
  const [job, setJob] = useState<SeedJob | null>(null);
  const [jobErr, setJobErr] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadOverview() {
    const res = await fetch("/api/admin/vocab/seed", { cache: "no-store" });
    if (res.ok) setOverview(await res.json());
  }

  async function loadRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (search) params.set("q", search);
      if (category) params.set("category", category);
      if (tier) params.set("tier", tier);
      const res = await fetch(`/api/admin/vocab/words?${params}`, { cache: "no-store" });
      if (res.ok) {
        const body = await res.json();
        setRows(body.rows ?? []);
        setTotal(body.total ?? 0);
      }
    } finally { setLoading(false); }
  }

  async function loadJob() {
    const res = await fetch("/api/admin/vocab/seed-job", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setJob(body.job);
    }
  }

  useEffect(() => { loadOverview(); loadJob(); }, []);
  useEffect(() => { loadRows(); }, [page, category, tier]);

  useEffect(() => {
    if (job?.status === "running") {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        const res = await fetch("/api/admin/vocab/seed-job", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          setJob(body.job);
          if (body.job && body.job.status !== "running") {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            loadOverview();
            loadRows();
          }
        }
      }, 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [job?.status]);

  const startSeed = async () => {
    setJobErr(null);
    const res = await fetch("/api/admin/vocab/seed-job", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: seedTier, totalPerCategory: seedPerCat, batchSize: seedBatch,
        categories: seedCats.length > 0 ? seedCats : undefined,
        provider: seedProvider,
      }),
    });
    const body = await res.json();
    if (!res.ok) { setJobErr(body.error ?? "啟動失敗"); return; }
    setJob(body.job);
  };

  const stopSeed = async () => {
    const res = await fetch("/api/admin/vocab/seed-job", { method: "PATCH" });
    if (res.ok) { const body = await res.json(); setJob(body.job); }
  };

  const clearJob = async () => {
    await fetch("/api/admin/vocab/seed-job", { method: "DELETE" });
    setJob(null);
  };

  const toggleCat = (c: string) => {
    setSeedCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const deleteWord = async (id: string) => {
    if (!confirm("刪除此單字？")) return;
    const res = await fetch(`/api/admin/vocab/words?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) { setRows(prev => prev.filter(r => r.id !== id)); loadOverview(); }
  };

  const truncateAll = async () => {
    if (!confirm("清空整個 NCLEX 詞庫？此動作不可還原。")) return;
    const res = await fetch("/api/admin/vocab/seed?confirm=TRUNCATE_VOCAB", { method: "DELETE" });
    if (res.ok) { await loadOverview(); await loadRows(); }
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      {overview && (
        <div className="border-y border-[var(--j-line)] py-4">
          <SectionLabel className="mb-3 flex items-center justify-between">
            <span>The lexicon · NCLEX 單字</span>
            <button onClick={truncateAll} className="text-[10px] text-[var(--j-red)] hover:underline italic" style={FONT_DISPLAY}>
              <Trash2 size={11} className="inline mr-1" /> truncate
            </button>
          </SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="總字數" value={overview.total} />
            <Stat label="類別數" value={overview.byCategory.length} />
            <Stat label="Tier 1" value={overview.byTier.find(t => t.tier === 1)?.count ?? 0} />
            <Stat label="Tier 2 / 3" value={(overview.byTier.find(t => t.tier === 2)?.count ?? 0) + (overview.byTier.find(t => t.tier === 3)?.count ?? 0)} />
          </div>
        </div>
      )}

      {/* Seed panel */}
      <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--j-phosphor)]" />
            <span className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>產生 NCLEX 單字 · 背景任務</span>
          </div>
          <div className="flex border border-[var(--j-line)]">
            {(["claude", "gemini"] as const).map(p => (
              <button key={p} onClick={() => setSeedProvider(p)}
                className={cn(
                  "px-3 py-1 text-xs italic transition",
                  seedProvider === p
                    ? "bg-[var(--j-ink)] text-[var(--j-bg)]"
                    : "text-[var(--j-ink-dim)] hover:text-[var(--j-ink)]"
                )}
                style={FONT_DISPLAY}>
                {p === "claude" ? "Claude" : "Gemini"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FieldNum label="Tier (1~3)" value={seedTier} onChange={setSeedTier} min={1} max={3} />
          <FieldNum label="每類別目標字數" value={seedPerCat} onChange={setSeedPerCat} min={10} max={500} />
          <FieldNum label="批次大小 (5~30)" value={seedBatch} onChange={setSeedBatch} min={5} max={30} />
        </div>

        <div>
          <MetaText className="block mb-2">categories · 不選＝全部</MetaText>
          <div className="flex flex-wrap gap-1.5">
            {overview?.categories.map(c => (
              <button key={c} onClick={() => toggleCat(c)}
                className={cn(
                  "px-3 py-1 text-xs italic border transition",
                  seedCats.includes(c)
                    ? "bg-[var(--j-phosphor-soft)] border-[var(--j-phosphor)] text-[var(--j-phosphor)]"
                    : "border-[var(--j-line)] text-[var(--j-ink-dim)] hover:border-[var(--j-phosphor-line)]"
                )}
                style={FONT_DISPLAY}>{c}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {(!job || job.status !== "running") && (
            <Button size="sm" variant="gold" onClick={startSeed}><Play size={14} /> 開始產生</Button>
          )}
          {job?.status === "running" && (
            <Button size="sm" variant="danger" onClick={stopSeed}><Square size={14} /> 停止</Button>
          )}
          {job && job.status !== "running" && (
            <Button size="sm" variant="ghost" onClick={clearJob}><RefreshCw size={14} /> 清除任務</Button>
          )}
        </div>

        {jobErr && <div className="text-sm text-[var(--j-red)] italic" style={FONT_DISPLAY}>{jobErr}</div>}

        {job && (
          <div className={cn(
            "border p-4",
            job.status === "running" ? "border-[var(--j-phosphor)] bg-[var(--j-phosphor-soft)]"
            : job.status === "done" ? "border-[var(--j-phosphor)] bg-[var(--j-phosphor-soft)]"
            : job.status === "failed" ? "border-[var(--j-red)] bg-[var(--j-red)]/8"
            : "border-[var(--j-line)] bg-[var(--j-bg-inset)]"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Pill tone={
                  job.status === "running" ? "phosphor"
                  : job.status === "done" ? "phosphor"
                  : job.status === "failed" ? "danger" : "muted"
                }>{job.status}</Pill>
                {job.currentCategory && <MetaText>目前 · {job.currentCategory}</MetaText>}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--j-ink-dim)]" style={FONT_MONO}>
                <Pill tone="muted">{job.provider ?? "claude"}</Pill>
                <span>$ {job.totalCostUsd.toFixed(4)}</span>
              </div>
            </div>
            <div className="text-sm text-[var(--j-ink)]" style={FONT_ZH}>{job.lastMessage}</div>
            <div className="mt-3 h-1 bg-[var(--j-bg-inset)] overflow-hidden">
              <div className="h-full bg-[var(--j-phosphor)] transition-all"
                style={{ width: `${job.totalTarget > 0 ? Math.min(100, (job.inserted / job.totalTarget) * 100) : 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-[var(--j-ink-dim)] mt-1" style={FONT_MONO}>
              <span>{job.inserted} / {job.totalTarget} inserted</span>
              <span>{job.batchesDone} batches · {job.errors} errors</span>
            </div>
          </div>
        )}
      </div>

      {/* Word browser */}
      <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)]">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-[var(--j-line)]">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search size={14} className="text-[var(--j-ink-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setPage(1); loadRows(); } }}
              placeholder="search word / 中文 / english…"
              className="flex-1 bg-transparent text-sm text-[var(--j-ink)] placeholder:italic placeholder:text-[var(--j-ink-muted)] outline-none"
              style={FONT_DISPLAY} />
          </div>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className={SELECT_CLS} style={FONT_MONO}>
            <option value="">所有類別</option>
            {overview?.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={tier} onChange={e => { setTier(e.target.value); setPage(1); }} className={SELECT_CLS} style={FONT_MONO}>
            <option value="">所有 Tier</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => { setPage(1); loadRows(); }}>搜尋</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--j-line)]">
              <tr className="text-left text-[10px] tracking-[0.15em] uppercase text-[var(--j-ink-dim)]" style={FONT_MONO}>
                <th className="px-4 py-2">Word</th>
                <th className="px-4 py-2">中文定義</th>
                <th className="px-4 py-2">類別</th>
                <th className="px-4 py-2">Tier</th>
                <th className="px-4 py-2">難度</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="py-10 text-center">
                  <Loader2 className="animate-spin text-[var(--j-phosphor)] mx-auto" />
                </td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>— No entries.</td></tr>
              )}
              {!loading && rows.map(r => (
                <tr key={r.id} className="border-t border-[var(--j-line)]/60 hover:bg-[var(--j-phosphor-soft)] transition">
                  <td className="px-4 py-2 font-mono font-semibold text-[var(--j-ink)]">{r.word}</td>
                  <td className="px-4 py-2 text-[var(--j-ink-dim)] max-w-sm truncate" style={FONT_ZH}>{r.definitionZh}</td>
                  <td className="px-4 py-2"><Pill tone="muted">{r.category}</Pill></td>
                  <td className="px-4 py-2 font-mono text-[var(--j-ink-dim)]">{r.tier}</td>
                  <td className="px-4 py-2">
                    <Pill tone={r.difficulty === "EASY" ? "phosphor" : r.difficulty === "HARD" ? "danger" : "warning"}>{r.difficulty}</Pill>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteWord(r.id)} className="text-[var(--j-red)] hover:opacity-80">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 30 && (
          <div className="p-3 flex items-center justify-between text-sm border-t border-[var(--j-line)]">
            <MetaText>{total} entries</MetaText>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一頁</Button>
              <span className="px-3 py-1 text-[var(--j-ink-dim)]" style={FONT_MONO}>{page}</span>
              <Button size="sm" variant="ghost" disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}>下一頁</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-4">
      <div className="text-xs text-[var(--j-ink-dim)]" style={FONT_ZH}>{label}</div>
      <div className="italic text-2xl text-[var(--j-ink)] mt-1" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function FieldNum({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <label className="block">
      <MetaText className="block">{label}</MetaText>
      <input type="number" min={min} max={max} value={value}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className={NUM_INPUT_CLS + " mt-1 font-mono"} />
    </label>
  );
}
