"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, MetaText, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

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
  { name: "Quality Deep Scan", file: "cron-quality-scan.yml", time: "03:00 UTC · 11:00 TWN", desc: "18 規則掃描題庫 · 寫入 QualityHealthReport" },
  { name: "Report Triage", file: "cron-report-triage.yml", time: "04:00 UTC · 12:00 TWN", desc: "Kimi-K2.5 處理 PENDING 回報" },
  { name: "Error Rate Recompute", file: "cron-error-rate-recompute.yml", time: "05:00 UTC · 13:00 TWN", desc: "重算 errorRate 欄位" },
  { name: "Daily Health Report", file: "cron-daily-health-report.yml", time: "09:00 UTC · 17:00 TWN", desc: "MiniMax 生成健康度敘事" },
  { name: "Marketing Daily", file: "cron-marketing-daily.yml", time: "10:00 UTC · 18:00 TWN", desc: "社群 + 週一 SEO + 週五 analytics" },
  { name: "Ops Daily", file: "cron-ops.yml", time: "02:00 UTC · 10:00 TWN", desc: "現有 ops 報表（CTO/PM/Ops agents）" },
];

const REPO = "alanalways/nurselix";

const MODEL_TABLE: Array<[string, string, string]> = [
  ["題庫品質審查", "deepseek-ai/deepseek-v4-pro", "kimi-k2.5 → gemini-3-flash"],
  ["修補建議", "deepseek-ai/deepseek-v4-pro", "gemini-3-flash → flash-lite"],
  ["健康度敘事", "minimaxai/minimax-m2.7", "gemini-3.1-flash-lite → 2.5-flash"],
  ["使用者回報判讀", "moonshotai/kimi-k2.5", "deepseek-v4-pro → gemini-3-flash"],
  ["行銷文案", "minimaxai/minimax-m2.7", "gemini-3.1-flash-lite → 2.5-flash"],
  ["行銷分析", "deepseek-ai/deepseek-v4-pro", "minimax-m2.7 → gemini-3-flash"],
  ["Hermes 教學（不動）", "claude-haiku-4-5-20251001", "—"],
];

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
    <div className="space-y-10">
      {/* Services */}
      <div>
        <SectionLabel className="mb-3">Health · 服務狀態</SectionLabel>
        {loading && !data ? (
          <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} />
        ) : data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ServiceCard name="PostgreSQL" healthy={data.services.database.healthy} />
            <ServiceCard name="Redis" healthy={data.services.redis.healthy} />
          </div>
        )}
      </div>

      {/* Hermes queue */}
      {data && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <SectionLabel>Hermes · Anthropic Haiku 4.5 教學 agent</SectionLabel>
            <button onClick={load} className="text-xs text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition" style={FONT_MONO}>
              <RefreshCw size={11} /> refresh
            </button>
          </div>
          <div className="grid grid-cols-5 border border-[var(--j-line)]">
            {[
              ["pending", data.hermesJobs.pending, "text-[var(--j-ink-muted)]"],
              ["running", data.hermesJobs.running, "text-[var(--j-phosphor)]"],
              ["retryable", data.hermesJobs.retryable, "text-[#c77a28]"],
              ["done", data.hermesJobs.done, "text-[var(--j-phosphor)]"],
              ["exhausted", data.hermesJobs.exhausted, "text-[var(--j-red)]"],
            ].map(([label, val, color], i, arr) => (
              <div key={label as string} className={cn(
                "py-4 px-2 text-center",
                i < arr.length - 1 && "border-r border-[var(--j-line)]"
              )}>
                <div className={cn("italic text-2xl mb-1", color as string)} style={FONT_DISPLAY}>{val as number}</div>
                <MetaText>{label as string}</MetaText>
              </div>
            ))}
          </div>
          {data.hermesJobs.lastSuccessAt && (
            <MetaText className="block mt-2">
              last success · {new Date(data.hermesJobs.lastSuccessAt).toLocaleString("zh-TW")}
            </MetaText>
          )}
          {data.hermesJobs.retryable > 0 && (
            <button onClick={retry} disabled={retrying}
              className="mt-3 px-4 py-2 text-sm italic text-[#c77a28] border border-[#c77a28]/40 hover:bg-[#c77a28]/10 disabled:opacity-50 flex items-center gap-1 transition"
              style={FONT_DISPLAY}>
              {retrying ? <Loader2 className="animate-spin" size={13} /> : null} retry now
            </button>
          )}
          {data.hermesJobs.recentExhausted?.length > 0 && (
            <div className="mt-4">
              <SectionLabel className="!mt-0 mb-2 !text-[var(--j-red)]">Recent failures</SectionLabel>
              <ul className="space-y-1">
                {data.hermesJobs.recentExhausted.slice(0, 3).map(j => (
                  <li key={j.id} className="text-xs text-[var(--j-ink-dim)]" style={FONT_MONO}>
                    {j.sessionId.slice(0, 8)} · {j.attempts}× tries · {j.error?.slice(0, 60)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Cron */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <SectionLabel>Cron · 排程任務</SectionLabel>
          <MetaText>trigger from GitHub Actions</MetaText>
        </div>
        <div className="border border-[var(--j-line)]">
          {CRON_WORKFLOWS.map((w, i) => (
            <div key={w.file} className={cn(
              "grid grid-cols-[1fr_auto] gap-4 px-4 py-3 items-center hover:bg-[var(--j-phosphor-soft)] transition",
              i < CRON_WORKFLOWS.length - 1 && "border-b border-[var(--j-line)]"
            )}>
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>{w.name}</span>
                  <MetaText>{w.time}</MetaText>
                </div>
                <div className="text-xs text-[var(--j-ink-dim)]" style={FONT_ZH}>{w.desc}</div>
              </div>
              <Link href={`https://github.com/${REPO}/actions/workflows/${w.file}`} target="_blank"
                className="px-3 py-1.5 text-xs italic text-[var(--j-ink-dim)] border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition"
                style={FONT_DISPLAY}>
                <ExternalLink size={11} /> github
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Model registry */}
      <div>
        <SectionLabel className="mb-3">Model registry · agent teams 模型分配</SectionLabel>
        <div className="border border-[var(--j-line)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--j-line-strong)]">
              <tr className="text-left text-[10px] tracking-[0.15em] uppercase text-[var(--j-ink-dim)]" style={FONT_MONO}>
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Primary</th>
                <th className="py-3 px-4">Fallback chain</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_TABLE.map(([task, primary, fallback], i) => (
                <tr key={task} className={cn("hover:bg-[var(--j-phosphor-soft)] transition", i < MODEL_TABLE.length - 1 && "border-b border-[var(--j-line)]")}>
                  <td className="py-3 px-4 text-[var(--j-ink)] italic" style={FONT_DISPLAY}>{task}</td>
                  <td className="py-3 px-4 text-xs text-[var(--j-phosphor)]" style={FONT_MONO}>{primary}</td>
                  <td className="py-3 px-4 text-xs text-[var(--j-ink-muted)]" style={FONT_MONO}>{fallback}</td>
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
      "px-4 py-3 border flex items-center gap-3",
      healthy
        ? "border-[var(--j-phosphor-line)] bg-[var(--j-phosphor-soft)]"
        : "border-[var(--j-red)]/40 bg-[var(--j-red)]/10"
    )}>
      {healthy ? <CheckCircle2 size={16} className="text-[var(--j-phosphor)]" /> : <XCircle size={16} className="text-[var(--j-red)]" />}
      <div>
        <div className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>{name}</div>
        <MetaText>{healthy ? "running · 正常" : "down · 異常"}</MetaText>
      </div>
    </div>
  );
}
