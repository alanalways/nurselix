"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bot, Loader2, RefreshCw, ExternalLink, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

interface AgentsData {
  timestamp: string;
  services: { database: { healthy: boolean }; redis: { healthy: boolean } };
  hermesJobs: {
    pending: number; running: number; retryable: number; done: number; exhausted: number;
    lastSuccessAt: string | null;
    recentExhausted: { id: string; sessionId: string; attempts: number; error: string | null; updatedAt: string }[];
  };
}

const CRON_WORKFLOWS = [
  { name: "Quality Deep Scan", file: "cron-quality-scan.yml", time: "每日 03:00 UTC（台 11:00）", desc: "18 規則掃描題庫 + 寫入 QualityHealthReport" },
  { name: "Report Triage", file: "cron-report-triage.yml", time: "每日 04:00 UTC（台 12:00）", desc: "Kimi-K2.5 處理 PENDING 回報" },
  { name: "Error Rate Recompute", file: "cron-error-rate-recompute.yml", time: "每日 05:00 UTC（台 13:00）", desc: "重算 errorRate 欄位" },
  { name: "Daily Health Report", file: "cron-daily-health-report.yml", time: "每日 09:00 UTC（台 17:00）", desc: "MiniMax 生成健康度敘事" },
  { name: "Marketing Daily", file: "cron-marketing-daily.yml", time: "每日 10:00 UTC（台 18:00）", desc: "產社群貼文 + 週一 SEO + 週五 analytics" },
  { name: "Ops Daily", file: "cron-ops.yml", time: "每日 02:00 UTC（台 10:00）", desc: "現有 ops 報表（CTO/PM/Ops agents）" },
];

const REPO = "alanalways/nurselix";

const BTN_CLS = "px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--gold)] hover:border-[var(--gold)]/40 flex items-center gap-1 text-sm transition disabled:opacity-50";

export default function AgentControlTab() {
  const [data, setData] = useState<AgentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/agents", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const retry = async () => {
    if (!confirm("立即重試所有 retryable 的 Hermes Job？")) return;
    setRetrying(true);
    try {
      await fetch("/api/admin/hermes/retry", { method: "POST" });
      await load();
    } finally { setRetrying(false); }
  };

  return (
    <div className="space-y-4">
      {/* 服務健康度 */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)]">
          <Activity size={16} className="text-[var(--gold)]" /> 服務健康度
        </div>
        <div className="p-5">
          {loading && !data ? (
            <Loader2 className="animate-spin text-[var(--gold)]" size={18} />
          ) : data && (
            <div className="grid grid-cols-2 gap-3">
              <ServiceCard name="PostgreSQL" healthy={data.services.database.healthy} />
              <ServiceCard name="Redis" healthy={data.services.redis.healthy} />
            </div>
          )}
        </div>
      </div>

      {/* Hermes Job Queue */}
      {data && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)]">
              <Bot size={16} className="text-[var(--gold)]" /> Hermes 教學 Agent (Anthropic Haiku 4.5)
            </span>
            <button onClick={load} className={cn(BTN_CLS, "text-xs")}>
              <RefreshCw size={12} /> 重新整理
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-5 divide-x divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              <Stat label="Pending" value={data.hermesJobs.pending} color="text-[var(--text-muted)]" />
              <Stat label="Running" value={data.hermesJobs.running} color="text-blue-400" />
              <Stat label="Retryable" value={data.hermesJobs.retryable} color="text-amber-400" />
              <Stat label="Done" value={data.hermesJobs.done} color="text-emerald-400" />
              <Stat label="Exhausted" value={data.hermesJobs.exhausted} color="text-red-400" />
            </div>
            {data.hermesJobs.lastSuccessAt && (
              <div className="text-xs text-[var(--text-muted)]">最後成功：{new Date(data.hermesJobs.lastSuccessAt).toLocaleString("zh-TW")}</div>
            )}
            {data.hermesJobs.retryable > 0 && (
              <button onClick={retry} disabled={retrying}
                className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-500/25 text-sm disabled:opacity-50 flex items-center gap-1 transition">
                {retrying ? <Loader2 className="animate-spin" size={14} /> : null} 立即重試
              </button>
            )}
            {data.hermesJobs.recentExhausted?.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2 text-red-400">最近失敗 (exhausted)</div>
                <ul className="text-xs space-y-1">
                  {data.hermesJobs.recentExhausted.slice(0, 3).map(j => (
                    <li key={j.id} className="text-[var(--text-secondary)] font-mono">
                      {j.sessionId.slice(0, 8)} · {j.attempts} 次嘗試 · {j.error?.slice(0, 60)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cron Workflows */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)]">
          <Clock size={16} className="text-[var(--gold)]" /> Cron Workflows
        </div>
        <div className="p-5 space-y-3">
          <div className="text-xs text-[var(--text-muted)]">手動觸發在 GitHub Actions 頁面：點 workflow 名稱進去，按右上角「Run workflow」</div>
          <div className="grid gap-2">
            {CRON_WORKFLOWS.map(w => (
              <div key={w.file} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 flex items-center gap-3 hover:border-[var(--gold)]/30 transition">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2 flex-wrap text-[var(--text-primary)]">
                    {w.name}
                    <Badge>{w.time}</Badge>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{w.desc}</div>
                </div>
                <Link href={`https://github.com/${REPO}/actions/workflows/${w.file}`} target="_blank"
                  className={cn(BTN_CLS, "text-xs flex-shrink-0")}>
                  <ExternalLink size={12} /> GitHub
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model Registry */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)]">
          Agent Teams 模型分配
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--text-muted)] text-xs uppercase">
              <tr><th className="py-2 pr-3">任務</th><th className="pr-3">主模型</th><th>備援</th></tr>
            </thead>
            <tbody>
              {[
                ["題庫品質審查", "deepseek-ai/deepseek-v4-pro", "kimi-k2.5 → gemini-3-flash"],
                ["修補建議", "deepseek-ai/deepseek-v4-pro", "gemini-3-flash → gemini-3.1-flash-lite"],
                ["健康度報告", "minimaxai/minimax-m2.7", "gemini-3.1-flash-lite → gemini-2.5-flash"],
                ["使用者回報判讀", "moonshotai/kimi-k2.5", "deepseek-v4-pro → gemini-3-flash"],
                ["行銷文案", "minimaxai/minimax-m2.7", "gemini-3.1-flash-lite → gemini-2.5-flash"],
                ["行銷分析", "deepseek-ai/deepseek-v4-pro", "minimax-m2.7 → gemini-3-flash"],
                ["Hermes 教學（既有，不動）", "claude-haiku-4-5-20251001", "—"],
              ].map(([task, primary, fallback]) => (
                <tr key={task} className="border-t border-[var(--border-subtle)]/50">
                  <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{task}</td>
                  <td className="text-[var(--gold)] font-mono text-xs pr-3">{primary}</td>
                  <td className="text-[var(--text-muted)] font-mono text-xs">{fallback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ name, healthy }: { name: string; healthy: boolean }) {
  return (
    <div className={cn(
      "p-3 rounded-xl border flex items-center gap-2",
      healthy
        ? "bg-emerald-500/5 border-emerald-500/30"
        : "bg-red-500/5 border-red-500/30"
    )}>
      {healthy ? <CheckCircle2 size={18} className="text-emerald-400" /> : <XCircle size={18} className="text-red-400" />}
      <div>
        <div className="font-medium text-sm text-[var(--text-primary)]">{name}</div>
        <div className="text-xs text-[var(--text-muted)]">{healthy ? "正常" : "異常"}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center py-3">
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
    </div>
  );
}
