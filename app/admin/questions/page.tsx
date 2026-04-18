"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Check, Archive, Eye, Loader2, Upload, Trash2, Sparkles, ChevronDown, StopCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface QuestionRow {
  id: string;
  stem: string;
  stemZh: string | null;
  domain: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  status: "APPROVED" | "DRAFT" | "ARCHIVED";
  questionType: string;
  attemptCount: number;
  correctCount: number;
  errorRate: number | null;
  createdAt: string;
}

const VALID_DOMAINS = [
  "Management of Care",
  "Safety & Infection Control",
  "Health Promotion & Maintenance",
  "Psychosocial Integrity",
  "Basic Care & Comfort",
  "Pharmacological and Parenteral Therapies",
  "Reduction of Risk Potential",
  "Physiological Adaptation",
];

const DOMAIN_TARGETS: Record<string, number> = {
  "Management of Care": 1540,
  "Safety & Infection Control": 1210,
  "Health Promotion & Maintenance": 1210,
  "Psychosocial Integrity": 990,
  "Basic Care & Comfort": 990,
  "Pharmacological and Parenteral Therapies": 1540,
  "Reduction of Risk Potential": 1540,
  "Physiological Adaptation": 1980,
};

// Free-tier RPD per project per model
const MODEL_RPD: Record<string, number> = {
  "gemini-3.1-flash-lite-preview": 1500,
  "gemini-3-flash-preview": 1500,
  "gemini-2.5-flash-lite": 1000,
  "gemini-2.5-flash": 20,
  "gemini-2.5-pro": 100,
};

const statusBadge = {
  APPROVED: "success" as const,
  DRAFT: "warning" as const,
  ARCHIVED: "muted" as const,
};
const diffBadge = { EASY: "success" as const, MEDIUM: "gold" as const, HARD: "error" as const };

export default function AdminQuestionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [truncating, setTruncating] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);

  // AI generation state
  const [genOpen, setGenOpen] = useState(false);
  const [genModel, setGenModel] = useState("gemini-3.1-flash-lite-preview");
  const [genDomain, setGenDomain] = useState("auto");
  const [generating, setGenerating] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [genLog, setGenLog] = useState<string[]>([]);
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({});
  const [keysCount, setKeysCount] = useState<number | null>(null);
  const stopRef = useRef(false);

  // Background job state
  const [bgTarget, setBgTarget] = useState(11000);
  const [bgJob, setBgJob] = useState<{
    id: string;
    status: "RUNNING" | "STOPPED" | "COMPLETED" | "FAILED";
    target: number;
    model: string;
    domain: string;
    batchCount: number;
    inserted: number;
    rejected: number;
    duplicates: number;
    errors: number;
    lastMessage: string | null;
    startedAt: string;
    updatedAt: string;
    inMemoryActive?: boolean;
  } | null>(null);
  const [bgStarting, setBgStarting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "30" });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (statusFilter !== "全部") params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/admin/questions?${params}`, { cache: "no-store" });
      if (res.ok) {
        const body = await res.json();
        setRows(body.rows);
        setTotal(body.total);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/questions?stats=1", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setDomainCounts(body.domains ?? {});
    }
  }, []);

  const loadGenConfig = useCallback(async () => {
    const res = await fetch("/api/admin/questions/generate", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setKeysCount(body.keys ?? 0);
    }
  }, []);

  const loadBgJob = useCallback(async () => {
    const res = await fetch("/api/admin/questions/generate/job", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setBgJob(body.job ?? null);
    }
  }, []);

  useEffect(() => {
    if (genOpen) {
      loadStats();
      loadGenConfig();
      loadBgJob();
    }
  }, [genOpen, loadStats, loadGenConfig, loadBgJob]);

  // Poll job status + stats when a background job is running
  useEffect(() => {
    if (!genOpen) return;
    if (!bgJob || bgJob.status !== "RUNNING") return;
    const t = setInterval(() => {
      loadBgJob();
      loadStats();
    }, 3000);
    return () => clearInterval(t);
  }, [genOpen, bgJob, loadBgJob, loadStats]);

  const handleStartBg = async () => {
    if (bgStarting) return;
    setBgStarting(true);
    try {
      const res = await fetch("/api/admin/questions/generate/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: bgTarget, model: genModel, domain: genDomain }),
      });
      const body = await res.json();
      if (res.ok) {
        setBgJob(body.job);
      } else {
        const ts = new Date().toLocaleTimeString("zh-TW");
        setGenLog((prev) => [`[${ts}] ✗ 啟動背景任務失敗：${body.error}`, ...prev.slice(0, 49)]);
      }
    } finally {
      setBgStarting(false);
    }
  };

  const handleStopBg = async () => {
    const res = await fetch("/api/admin/questions/generate/job", { method: "DELETE" });
    if (res.ok) {
      await loadBgJob();
    }
  };

  const bulkUpdate = async (newStatus: "APPROVED" | "ARCHIVED") => {
    if (selected.size === 0 || acting) return;
    setActing(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), status: newStatus }),
      });
      if (res.ok) { setSelected(new Set()); await load(); }
    } finally { setActing(false); }
  };

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));

  const totalPages = Math.max(1, Math.ceil(total / 30));

  const handleTruncate = async () => {
    if (!window.confirm(`⚠️ 確定要刪除全部 ${total} 道題目嗎？此操作無法復原！`)) return;
    setTruncating(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/questions?confirm=TRUNCATE_ALL", { method: "DELETE" });
      const body = await res.json();
      setImportResult(res.ok ? `🗑 已刪除 ${body.deleted} 題` : `✗ 刪除失敗：${body.error}`);
      if (res.ok) await load();
    } catch (err) {
      setImportResult(`✗ 刪除失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally { setTruncating(false); }
  };

  const handleImportUrl = async () => {
    if (!urlInput.trim() || importingUrl) return;
    setImportingUrl(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/questions/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const body = await res.json();
      if (res.ok) {
        const parts = [`✓ 匯入 ${body.inserted} 題`];
        if (body.rejected) parts.push(`過濾 ${body.rejected} 題壞題`);
        if (body.duplicates) parts.push(`跳過 ${body.duplicates} 題重複`);
        setImportResult(parts.join("，"));
        setUrlInput("");
        await load();
      } else {
        setImportResult(`✗ 失敗：${body.error}`);
      }
    } catch (err) {
      setImportResult(`✗ 失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally { setImportingUrl(false); }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      setImportResult(null);
      try {
        const text = await file.text();
        const questions = JSON.parse(text);
        const arr = Array.isArray(questions) ? questions : questions.questions ?? [];
        let totalInserted = 0;
        const BATCH = 500;
        for (let i = 0; i < arr.length; i += BATCH) {
          const res = await fetch("/api/admin/questions/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questions: arr.slice(i, i + BATCH) }),
          });
          const body = await res.json();
          if (res.ok) totalInserted += body.inserted ?? 0;
        }
        setImportResult(`✓ 成功匯入 ${totalInserted} / ${arr.length} 題`);
        await load();
      } catch (err) {
        setImportResult(`✗ 匯入失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
      } finally { setImporting(false); }
    };
    input.click();
  };

  const runOneBatch = async (): Promise<boolean> => {
    const res = await fetch("/api/admin/questions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: genDomain, model: genModel }),
    });
    const body = await res.json();
    const ts = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (res.ok) {
      const msg = `[${ts}] ✓ ${body.domain} · 生成${body.total} 通過${body.passed} 入庫${body.inserted} 過濾${body.rejected} 重複${body.duplicates}`;
      setGenLog((prev) => [msg, ...prev.slice(0, 49)]);
      await loadStats();
      await load();
      return true;
    } else {
      setGenLog((prev) => [`[${ts}] ✗ ${body.error ?? "未知錯誤"}`, ...prev.slice(0, 49)]);
      return false;
    }
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    stopRef.current = false;
    try {
      await runOneBatch();
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoGen = async () => {
    if (autoMode) {
      stopRef.current = true;
      setAutoMode(false);
      return;
    }
    setAutoMode(true);
    stopRef.current = false;
    setGenerating(true);
    try {
      while (!stopRef.current) {
        const ok = await runOneBatch();
        if (!ok) break;
        if (stopRef.current) break;
        // Small pause between batches to avoid hammering
        await new Promise((r) => setTimeout(r, 2000));
      }
    } finally {
      setGenerating(false);
      setAutoMode(false);
    }
  };

  const totalTarget = 11000;
  const totalGenerated = Object.values(domainCounts).reduce((a, b) => a + b, 0);
  const overallPct = Math.min(100, Math.round((totalGenerated / totalTarget) * 100));

  const capacityPerDay =
    keysCount != null && keysCount > 0
      ? `${(keysCount * (MODEL_RPD[genModel] ?? 20) * 50).toLocaleString()} 題/天`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">題庫管理</h1>
          <p className="text-sm text-[var(--text-secondary)]">共 {total} 題</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="danger" onClick={handleTruncate} disabled={truncating || total === 0}>
            {truncating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            清空題庫
          </Button>
          <Button size="sm" variant="outline" onClick={handleImport} disabled={importing}>
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            匯入 JSON
          </Button>
          <Button size="sm" onClick={() => router.push("/admin/questions/new")}>
            <Plus size={14} /> 新增題目
          </Button>
        </div>
      </div>

      {/* URL import row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 flex-1">
          <Upload size={14} className="text-[var(--text-muted)] shrink-0" />
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleImportUrl(); }}
            placeholder="貼上 Google Drive 分享連結，自動過濾壞題後匯入..."
            className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none flex-1"
          />
        </div>
        <Button size="sm" variant="blue" onClick={handleImportUrl} disabled={importingUrl || !urlInput.trim()}>
          {importingUrl ? <Loader2 size={14} className="animate-spin" /> : null}
          {importingUrl ? "匯入中..." : "從網址匯入"}
        </Button>
      </div>

      {importResult && (
        <div className={`px-4 py-2 rounded-lg text-sm ${
          importResult.startsWith("✓") || importResult.startsWith("🗑")
            ? "bg-[rgba(46,204,113,0.12)] text-[var(--success)]"
            : "bg-[rgba(231,76,60,0.12)] text-[var(--error)]"
        }`}>
          {importResult}
        </div>
      )}

      {/* AI Generation Panel */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <button
          onClick={() => setGenOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[var(--gold)]" />
            <span className="font-semibold text-sm text-[var(--text-primary)]">AI 自動生成題目</span>
            {keysCount != null && genOpen && (
              <span className="text-xs text-[var(--text-muted)] ml-1">
                {keysCount > 0
                  ? `${keysCount} 組 Key · ${capacityPerDay}`
                  : "⚠️ 未設定 API Key"}
              </span>
            )}
          </div>
          <ChevronDown
            size={15}
            className={`text-[var(--text-muted)] transition-transform ${genOpen ? "rotate-180" : ""}`}
          />
        </button>

        {genOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-[var(--border-subtle)]">
            {/* Controls */}
            <div className="flex flex-wrap gap-2 pt-3">
              <select
                value={genModel}
                onChange={(e) => setGenModel(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="gemini-3.1-flash-lite-preview">3.1 Flash Lite Preview（1,500 RPD/key，最新）</option>
                <option value="gemini-3-flash-preview">3 Flash Preview（1,500 RPD/key）</option>
                <option value="gemini-2.5-flash-lite">2.5 Flash Lite（1,000 RPD/key）</option>
                <option value="gemini-2.5-flash">2.5 Flash（20 RPD/key）</option>
                <option value="gemini-2.5-pro">2.5 Pro（100 RPD/key）</option>
              </select>

              <select
                value={genDomain}
                onChange={(e) => setGenDomain(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none flex-1 min-w-0"
              >
                <option value="auto">自動（最缺的 Domain）</option>
                {VALID_DOMAINS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating || (keysCount ?? 0) === 0}
              >
                {generating && !autoMode
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Sparkles size={14} />}
                生成一批 (50題)
              </Button>

              <Button
                size="sm"
                variant={autoMode ? "danger" : "outline"}
                onClick={handleAutoGen}
                disabled={(keysCount ?? 0) === 0 || bgJob?.status === "RUNNING"}
              >
                {autoMode
                  ? <><StopCircle size={14} /> 停止連續</>
                  : "連續生成（前景）"}
              </Button>
            </div>

            {/* Background job panel */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    背景任務（關閉瀏覽器也繼續跑）
                  </span>
                  {bgJob && (
                    <Badge
                      variant={
                        bgJob.status === "RUNNING" ? "gold"
                        : bgJob.status === "COMPLETED" ? "success"
                        : bgJob.status === "FAILED" ? "error"
                        : "muted"
                      }
                    >
                      {bgJob.status === "RUNNING" ? "執行中"
                       : bgJob.status === "COMPLETED" ? "已完成"
                       : bgJob.status === "FAILED" ? "已失敗"
                       : "已停止"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--text-muted)]">目標題數</label>
                  <input
                    type="number"
                    value={bgTarget}
                    onChange={(e) => setBgTarget(Math.max(1, Number(e.target.value) || 1))}
                    disabled={bgJob?.status === "RUNNING"}
                    className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-2 py-1 text-sm text-[var(--text-primary)] outline-none w-24 font-mono disabled:opacity-60"
                  />
                  {bgJob?.status === "RUNNING" ? (
                    <Button size="sm" variant="danger" onClick={handleStopBg}>
                      <StopCircle size={14} /> 停止背景
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="blue"
                      onClick={handleStartBg}
                      disabled={bgStarting || (keysCount ?? 0) === 0}
                    >
                      {bgStarting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      啟動背景任務
                    </Button>
                  )}
                </div>
              </div>

              {bgJob && (
                <div className="text-xs space-y-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
                    <div>
                      <span className="text-[var(--text-muted)]">批次</span>{" "}
                      <span className="text-[var(--text-primary)]">{bgJob.batchCount}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">入庫</span>{" "}
                      <span className="text-[var(--success)]">{bgJob.inserted}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">過濾</span>{" "}
                      <span className="text-[var(--warning)]">{bgJob.rejected}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">重複</span>{" "}
                      <span className="text-[var(--text-muted)]">{bgJob.duplicates}</span>
                      {bgJob.errors > 0 && (
                        <>
                          {" · "}
                          <span className="text-[var(--error)]">錯 {bgJob.errors}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {bgJob.lastMessage && (
                    <p className="text-[var(--text-secondary)] font-mono">{bgJob.lastMessage}</p>
                  )}
                  <p className="text-[var(--text-muted)]">
                    模型 {bgJob.model} · Domain {bgJob.domain} · 目標 {bgJob.target.toLocaleString()} 題
                    {bgJob.status === "RUNNING" && !bgJob.inMemoryActive && (
                      <span className="text-[var(--error)] ml-2">
                        ⚠️ 背景程序未在執行（可能被重啟），請重新啟動
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* No API key warning */}
            {keysCount === 0 && (
              <div className="bg-[rgba(231,76,60,0.08)] border border-[rgba(231,76,60,0.2)] rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="font-semibold text-[var(--error)]">未設定 Gemini API Key</p>
                <p className="text-[var(--text-secondary)]">請在 Zeabur 環境變數加入：</p>
                <code className="block bg-[var(--bg-overlay)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] mt-1">
                  GEMINI_API_KEY_1 = AIza...<br />
                  GEMINI_API_KEY_2 = AIza...<br />
                  GEMINI_API_KEY_3 = AIza...<br />
                  （最多 GEMINI_API_KEY_10，逐一輪替）
                </code>
                <p className="text-xs text-[var(--text-muted)] pt-1">
                  取得方式：<strong>aistudio.google.com</strong> → Get API Key → Create API Key（每個 Google Project 各建一組）
                </p>
              </div>
            )}

            {/* Overall progress */}
            <div>
              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                <span>總進度</span>
                <span className="font-mono">{totalGenerated.toLocaleString()} / {totalTarget.toLocaleString()} 題 ({overallPct}%)</span>
              </div>
              <div className="w-full bg-[var(--bg-overlay)] rounded-full h-2">
                <div
                  className="bg-[var(--gold)] h-2 rounded-full transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>

            {/* Per-domain progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {VALID_DOMAINS.map((d) => {
                const count = domainCounts[d] ?? 0;
                const target = DOMAIN_TARGETS[d];
                const pct = Math.min(100, Math.round((count / target) * 100));
                return (
                  <div key={d} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] truncate w-44 shrink-0">{d}</span>
                    <div className="flex-1 bg-[var(--bg-overlay)] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct >= 100 ? "bg-[var(--success)]" : "bg-[var(--gold)]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[var(--text-secondary)] w-20 text-right shrink-0">
                      {count}/{target}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Generation log */}
            {genLog.length > 0 && (
              <div className="bg-[var(--bg-overlay)] rounded-lg p-3 space-y-0.5 max-h-32 overflow-y-auto">
                {genLog.map((log, i) => (
                  <p key={i} className={`text-xs font-mono ${log.includes("✓") ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                    {log}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 flex-1 max-w-sm">
          <Search size={14} className="text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜尋題目 / domain..."
            className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none flex-1"
          />
        </div>
        <div className="flex gap-1">
          {["全部", "APPROVED", "DRAFT", "ARCHIVED"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                statusFilter === s
                  ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                  : "border-[var(--border-default)] text-[var(--text-muted)]"
              }`}
            >
              {s === "全部" ? "全部" : s === "APPROVED" ? "已審核" : s === "DRAFT" ? "草稿" : "封存"}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="ml-auto flex gap-2">
            <span className="text-xs text-[var(--text-muted)] self-center">已選 {selected.size}</span>
            <Button size="sm" variant="outline" onClick={() => bulkUpdate("APPROVED")} disabled={acting}>
              <Check size={14} /> 批次核准
            </Button>
            <Button size="sm" variant="ghost" onClick={() => bulkUpdate("ARCHIVED")} disabled={acting}>
              <Archive size={14} /> 批次封存
            </Button>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[var(--gold)]" />
            <p className="text-sm text-[var(--text-secondary)]">載入中...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)] text-sm">沒有符合的題目</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                    className="accent-[var(--gold)]"
                  />
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">題目</th>
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium hidden md:table-cell">Domain</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">難度</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">狀態</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium hidden lg:table-cell">錯誤率</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => toggleOne(q.id)}
                      className="accent-[var(--gold)]"
                    />
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <p className="text-[var(--text-primary)] line-clamp-1">{q.stem}</p>
                    <span className="text-xs text-[var(--text-muted)]">
                      {q.questionType} · {new Date(q.createdAt).toLocaleDateString("zh-TW")}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-xs text-[var(--text-secondary)]">{q.domain ?? "—"}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={diffBadge[q.difficulty]}>{q.difficulty}</Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={statusBadge[q.status]}>
                      {q.status === "APPROVED" ? "已審核" : q.status === "DRAFT" ? "草稿" : "封存"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center hidden lg:table-cell">
                    {q.errorRate !== null ? (
                      <span className={`font-mono text-sm ${q.errorRate > 50 ? "text-[var(--error)]" : q.errorRate > 30 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                        {q.errorRate}%
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => router.push(`/admin/questions/${q.id}`)}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
                        title="檢視 / 編輯"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
        <div>共 {total.toLocaleString()} 道題目</div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>上一頁</Button>
            <span className="font-mono">{page} / {totalPages}</span>
            <Button size="sm" variant="ghost" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>下一頁</Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
