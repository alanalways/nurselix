"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bot, CheckCircle, AlertCircle, Loader2, RefreshCw,
  ExternalLink, Clock, XCircle, Activity,
} from "lucide-react";
import Badge from "@/components/ui/Badge";

interface AgentsData {
  timestamp: string;
  services: {
    database: { healthy: boolean };
    redis:    { healthy: boolean };
  };
  hermesJobs: {
    pending:       number;
    running:       number;
    retryable:     number;
    done:          number;
    exhausted:     number;
    lastSuccessAt: string | null;
    recentExhausted: {
      id: string;
      sessionId: string;
      attempts: number;
      error: string | null;
      updatedAt: string;
    }[];
  };
  githubActionsUrl: string;
}

export default function AdminAgentsPage() {
  const [data, setData]       = useState<AgentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agents", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryResult(null);
    try {
      const res = await fetch("/api/admin/hermes/retry", { method: "POST" });
      const body = await res.json();
      setRetryResult(`重試完成：${body.succeeded} 成功 / ${body.failed} 失敗（共掃 ${body.scanned} 筆）`);
      await load();
    } catch {
      setRetryResult("重試請求失敗");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-[var(--gold)]" size={24} />
      </div>
    );
  }

  if (!data) return <div className="p-6 text-[var(--error)]">載入失敗</div>;

  const { services, hermesJobs } = data;
  const servicesOk = services.database.healthy && services.redis.healthy;
  const hasIssues  = hermesJobs.exhausted > 0 || hermesJobs.retryable > 0 || !servicesOk;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5 max-w-4xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Agent 狀態</h1>
          <Badge variant={hasIssues ? "error" : "success"}>
            {hasIssues ? "需要注意" : "全部正常"}
          </Badge>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
        >
          <RefreshCw size={13} /> 重新整理
        </button>
      </div>

      {/* Services */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: "PostgreSQL", healthy: services.database.healthy },
          { name: "Redis",      healthy: services.redis.healthy },
        ].map((s) => (
          <div key={s.name} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 flex items-center justify-between">
            <span className="font-medium text-[var(--text-primary)]">{s.name}</span>
            {s.healthy
              ? <CheckCircle size={18} className="text-[var(--success)]" />
              : <AlertCircle size={18} className="text-[var(--error)]" />}
          </div>
        ))}
      </div>

      {/* Hermes Job Queue */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <Bot size={16} className="text-[var(--gold)]" />
          <span className="font-semibold text-[var(--text-primary)]">Hermes AI Job Queue</span>
          {hermesJobs.lastSuccessAt && (
            <span className="ml-auto text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Clock size={11} />
              最近成功：{new Date(hermesJobs.lastSuccessAt).toLocaleString("zh-TW")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-5 divide-x divide-[var(--border-subtle)]">
          {[
            { label: "等待中",   count: hermesJobs.pending,   color: "text-[var(--text-muted)]" },
            { label: "執行中",   count: hermesJobs.running,   color: "text-[var(--blue)]" },
            { label: "可重試",   count: hermesJobs.retryable, color: "text-[var(--warning)]" },
            { label: "已完成",   count: hermesJobs.done,      color: "text-[var(--success)]" },
            { label: "已放棄",   count: hermesJobs.exhausted, color: "text-[var(--error)]" },
          ].map((s) => (
            <div key={s.label} className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {(hermesJobs.retryable > 0 || hermesJobs.running > 0) && (
          <div className="px-5 py-3 border-t border-[var(--border-subtle)] flex items-center gap-3">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--gold)] text-[#080E1A] text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {retrying ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
              立即重試失敗任務
            </button>
            {retryResult && <span className="text-sm text-[var(--text-secondary)]">{retryResult}</span>}
          </div>
        )}
      </div>

      {/* Exhausted jobs detail */}
      {hermesJobs.recentExhausted.length > 0 && (
        <div className="rounded-2xl border border-[var(--error)]/30 bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--error)]/20 flex items-center gap-2">
            <XCircle size={15} className="text-[var(--error)]" />
            <span className="font-semibold text-[var(--text-primary)]">已放棄的 Jobs（已超過 3 次重試）</span>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {hermesJobs.recentExhausted.map((j) => (
              <div key={j.id} className="px-5 py-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-[var(--text-muted)]">Session: {j.sessionId.slice(0, 16)}…</span>
                  <span className="text-[var(--text-muted)]">
                    {new Date(j.updatedAt).toLocaleString("zh-TW")} · {j.attempts} 次
                  </span>
                </div>
                {j.error && (
                  <p className="text-xs text-[var(--error)] font-mono truncate">{j.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GitHub Actions link */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-[var(--text-primary)]">Cron 排程（GitHub Actions）</div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            trial-expiry · finalize-sessions · weekly-report · exam-reminder · hermes-retry
          </div>
        </div>
        <a
          href={data.githubActionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[var(--gold)] hover:underline flex-shrink-0"
        >
          查看執行紀錄 <ExternalLink size={12} />
        </a>
      </div>

      <div className="text-xs text-[var(--text-muted)]">
        最後更新：{new Date(data.timestamp).toLocaleString("zh-TW")}
      </div>
    </motion.div>
  );
}
