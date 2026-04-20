"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Library, Sparkles, Trash2, Search, Play, Square, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

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
}

export default function AdminVocabPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [rows, setRows] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tier, setTier] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Seed job controls
  const [seedTier, setSeedTier] = useState(1);
  const [seedPerCat, setSeedPerCat] = useState(50);
  const [seedBatch, setSeedBatch] = useState(15);
  const [seedCats, setSeedCats] = useState<string[]>([]);
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
    } finally {
      setLoading(false);
    }
  }

  async function loadJob() {
    const res = await fetch("/api/admin/vocab/seed-job", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setJob(body.job);
    }
  }

  useEffect(() => {
    loadOverview();
    loadJob();
  }, []);

  useEffect(() => {
    loadRows();
  }, [page, category, tier]);

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
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [job?.status]);

  const startSeed = async () => {
    setJobErr(null);
    const res = await fetch("/api/admin/vocab/seed-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: seedTier,
        totalPerCategory: seedPerCat,
        batchSize: seedBatch,
        categories: seedCats.length > 0 ? seedCats : undefined,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setJobErr(body.error ?? "啟動失敗");
      return;
    }
    setJob(body.job);
  };

  const stopSeed = async () => {
    const res = await fetch("/api/admin/vocab/seed-job", { method: "PATCH" });
    if (res.ok) {
      const body = await res.json();
      setJob(body.job);
    }
  };

  const clearJob = async () => {
    await fetch("/api/admin/vocab/seed-job", { method: "DELETE" });
    setJob(null);
  };

  const toggleCat = (c: string) => {
    setSeedCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const deleteWord = async (id: string) => {
    if (!confirm("刪除此單字？")) return;
    const res = await fetch(`/api/admin/vocab/words?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      loadOverview();
    }
  };

  const truncateAll = async () => {
    if (!confirm("清空整個 NCLEX 詞庫？此動作不可還原。")) return;
    const res = await fetch("/api/admin/vocab/seed?confirm=TRUNCATE_VOCAB", { method: "DELETE" });
    if (res.ok) { await loadOverview(); await loadRows(); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Library size={22} className="text-[var(--gold)]" /> NCLEX 單字詞庫
        </h1>
        <Button size="sm" variant="outline" onClick={truncateAll}>
          <Trash2 size={14} /> 清空詞庫
        </Button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="總字數"     value={overview.total} />
          <Stat label="類別數"     value={overview.byCategory.length} />
          <Stat label="Tier 1"     value={overview.byTier.find((t) => t.tier === 1)?.count ?? 0} />
          <Stat label="Tier 2 / 3" value={(overview.byTier.find((t) => t.tier === 2)?.count ?? 0) + (overview.byTier.find((t) => t.tier === 3)?.count ?? 0)} />
        </div>
      )}

      {/* Seed panel */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--gold)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">用 Claude 產生 NCLEX 單字（背景任務）</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FieldNum label="Tier (1~3)"        value={seedTier}   onChange={setSeedTier}   min={1} max={3} />
          <FieldNum label="每類別目標字數"      value={seedPerCat} onChange={setSeedPerCat} min={10} max={500} />
          <FieldNum label="批次大小 (5~30)"     value={seedBatch}  onChange={setSeedBatch}  min={5}  max={30} />
        </div>

        <div>
          <div className="text-xs text-[var(--text-muted)] mb-2">類別（不選＝全部）</div>
          <div className="flex flex-wrap gap-1.5">
            {overview?.categories.map((c) => (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={`px-3 py-1 rounded-full text-xs border transition ${
                  seedCats.includes(c)
                    ? "bg-[var(--gold-dim)] border-[var(--gold)] text-[var(--gold)] font-semibold"
                    : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--gold)]"
                }`}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {(!job || job.status !== "running") && (
            <Button size="sm" variant="gold" onClick={startSeed}>
              <Play size={14} /> 開始產生
            </Button>
          )}
          {job?.status === "running" && (
            <Button size="sm" variant="danger" onClick={stopSeed}>
              <Square size={14} /> 停止
            </Button>
          )}
          {job && job.status !== "running" && (
            <Button size="sm" variant="ghost" onClick={clearJob}>
              <RefreshCw size={14} /> 清除任務
            </Button>
          )}
        </div>

        {jobErr && <div className="text-sm text-[var(--error)]">{jobErr}</div>}

        {job && (
          <div className={`rounded-lg p-4 border ${
            job.status === "running" ? "border-[var(--blue)] bg-[var(--blue-dim)]/20"
            : job.status === "done"  ? "border-[var(--success)] bg-[rgba(46,204,113,0.10)]"
            : job.status === "failed" ? "border-[var(--error)] bg-[rgba(231,76,60,0.10)]"
            : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={
                  job.status === "running" ? "blue"
                  : job.status === "done" ? "success"
                  : job.status === "failed" ? "error" : "muted"
                }>{job.status}</Badge>
                {job.currentCategory && <span className="text-xs text-[var(--text-muted)]">目前：{job.currentCategory}</span>}
              </div>
              <div className="text-xs font-mono text-[var(--text-muted)]">$ {job.totalCostUsd.toFixed(4)}</div>
            </div>
            <div className="text-sm text-[var(--text-primary)]">{job.lastMessage}</div>
            <div className="mt-3 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] transition-all"
                style={{ width: `${job.totalTarget > 0 ? Math.min(100, (job.inserted / job.totalTarget) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1 font-mono">
              <span>{job.inserted} / {job.totalTarget} 插入</span>
              <span>{job.batchesDone} 批次 · {job.errors} 錯誤</span>
            </div>
          </div>
        )}
      </div>

      {/* Word browser */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); loadRows(); } }}
              placeholder="搜尋單字 / 中文 / 英文定義..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
            />
          </div>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-sm"
          >
            <option value="">所有類別</option>
            {overview?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={tier}
            onChange={(e) => { setTier(e.target.value); setPage(1); }}
            className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-sm"
          >
            <option value="">所有 Tier</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => { setPage(1); loadRows(); }}>搜尋</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs">
              <tr>
                <th className="text-left px-4 py-2">單字</th>
                <th className="text-left px-4 py-2">中文定義</th>
                <th className="text-left px-4 py-2">類別</th>
                <th className="text-left px-4 py-2">Tier</th>
                <th className="text-left px-4 py-2">難度</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="py-10 text-center">
                  <Loader2 className="animate-spin text-[var(--gold)] mx-auto" />
                </td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">沒有資料</td></tr>
              )}
              {!loading && rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/50">
                  <td className="px-4 py-2 font-mono font-semibold text-[var(--text-primary)]">{r.word}</td>
                  <td className="px-4 py-2 text-[var(--text-secondary)] max-w-sm truncate">{r.definitionZh}</td>
                  <td className="px-4 py-2"><Badge variant="muted" className="text-[10px]">{r.category}</Badge></td>
                  <td className="px-4 py-2 font-mono">{r.tier}</td>
                  <td className="px-4 py-2"><Badge variant={r.difficulty === "EASY" ? "success" : r.difficulty === "HARD" ? "error" : "gold"} className="text-[10px]">{r.difficulty}</Badge></td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteWord(r.id)} className="text-[var(--error)] hover:opacity-80">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 30 && (
          <div className="p-3 flex items-center justify-between text-sm text-[var(--text-muted)]">
            <span>共 {total} 筆</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一頁</Button>
              <span className="px-3 py-1">{page}</span>
              <Button size="sm" variant="ghost" disabled={page * 30 >= total} onClick={() => setPage((p) => p + 1)}>下一頁</Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="text-2xl font-bold font-mono text-[var(--gold)] mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

function FieldNum({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono"
      />
    </label>
  );
}
