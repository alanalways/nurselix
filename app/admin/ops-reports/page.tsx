"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Play, RefreshCw, Loader2, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface Report {
  id: string;
  period: string;
  periodType: string;
  status: string;
  model: string;
  durationMs: number;
  error: string | null;
  triggeredBy: string | null;
  createdAt: string;
  summaryZh: string | null;
}

const statusBadge = {
  pending:  { variant: "muted" as const,   label: "等待中" },
  running:  { variant: "gold" as const,    label: "執行中" },
  done:     { variant: "success" as const, label: "完成" },
  error:    { variant: "error" as const,   label: "失敗" },
};

export default function OpsReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ops/run", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10s while any report is running
  useEffect(() => {
    const running = reports.some((r) => r.status === "running" || r.status === "pending");
    if (!running) return;
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [reports, load]);

  const trigger = async (periodType: "manual" | "weekly" | "daily") => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await fetch("/api/admin/ops/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodType }),
      });
      const body = await res.json();
      setTriggerResult(body.message ?? "已啟動");
      setTimeout(load, 1500);
    } catch {
      setTriggerResult("啟動失敗");
    } finally {
      setTriggering(false);
    }
  };

  const latestRunning = reports.find((r) => r.status === "running");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5 max-w-4xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Bot size={20} className="text-[var(--gold)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Agent 週報</h1>
          {latestRunning && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--gold)] animate-pulse">
              <Loader2 size={12} className="animate-spin" /> 執行中…
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
        >
          <RefreshCw size={13} /> 重新整理
        </button>
      </div>

      {/* Trigger buttons */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">手動觸發 Agent Team</p>
        <div className="flex flex-wrap gap-2">
          {(["manual", "daily", "weekly"] as const).map((type) => (
            <button
              key={type}
              onClick={() => trigger(type)}
              disabled={triggering || !!latestRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--gold)] text-[#080E1A] text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
            >
              {triggering ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {{ manual: "手動分析", daily: "日報", weekly: "週報" }[type]}
            </button>
          ))}
        </div>
        {triggerResult && <p className="text-xs text-[var(--text-secondary)]">{triggerResult}</p>}
        {latestRunning && (
          <p className="text-xs text-[var(--warning)]">Agent 正在執行中，請稍候（約 1–3 分鐘）…</p>
        )}
      </div>

      {/* Report list */}
      {loading && reports.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[var(--gold)]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">尚無報告，點擊上方按鈕啟動第一次分析</div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const badge = statusBadge[r.status as keyof typeof statusBadge] ?? { variant: "muted" as const, label: r.status };
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
                {/* Row header */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-elevated)] transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                >
                  <div className="flex items-center gap-3">
                    {r.status === "done"    && <CheckCircle size={16} className="text-[var(--success)]" />}
                    {r.status === "error"   && <XCircle size={16} className="text-[var(--error)]" />}
                    {r.status === "running" && <Loader2 size={16} className="animate-spin text-[var(--gold)]" />}
                    {r.status === "pending" && <Clock size={16} className="text-[var(--text-muted)]" />}
                    <div>
                      <span className="font-semibold text-[var(--text-primary)] mr-2">{r.period}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>{new Date(r.createdAt).toLocaleString("zh-TW")}</span>
                    {r.durationMs > 0 && <span>{(r.durationMs / 1000).toFixed(0)}s</span>}
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                    {r.status === "error" && r.error && (
                      <p className="text-sm text-[var(--error)] font-mono mb-3">{r.error}</p>
                    )}
                    {r.status === "running" && !r.summaryZh && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Agent team 執行中，請稍候…</span>
                      </div>
                    )}
                    {r.summaryZh ? (
                      <div className="prose prose-sm max-w-none text-[var(--text-secondary)] whitespace-pre-wrap font-noto-sans leading-relaxed">
                        {r.summaryZh}
                      </div>
                    ) : r.status !== "running" && r.status !== "error" ? (
                      <p className="text-sm text-[var(--text-muted)]">報告尚未產生</p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
