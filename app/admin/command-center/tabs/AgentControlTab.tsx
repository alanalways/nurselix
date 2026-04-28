"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bot, Loader2, RefreshCw, ExternalLink, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";

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
      <div className="bg-white border rounded-lg p-4">
        <div className="font-semibold mb-3 flex items-center gap-2"><Activity size={18} /> 服務健康度</div>
        {loading && !data ? <Loader2 className="animate-spin" /> : data && (
          <div className="grid grid-cols-2 gap-2">
            <ServiceCard name="PostgreSQL" healthy={data.services.database.healthy} />
            <ServiceCard name="Redis" healthy={data.services.redis.healthy} />
          </div>
        )}
      </div>

      {/* Hermes Job Queue */}
      {data && (
        <div className="bg-white border rounded-lg p-4">
          <div className="font-semibold mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2"><Bot size={18} /> Hermes 教學 Agent (Anthropic Haiku 4.5)</span>
            <button onClick={load} className="px-2 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-xs">
              <RefreshCw size={12} /> 重新整理
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 mb-3">
            <Stat label="Pending" value={data.hermesJobs.pending} color="amber" />
            <Stat label="Running" value={data.hermesJobs.running} color="blue" />
            <Stat label="Retryable" value={data.hermesJobs.retryable} color="orange" />
            <Stat label="Done" value={data.hermesJobs.done} color="emerald" />
            <Stat label="Exhausted" value={data.hermesJobs.exhausted} color="red" />
          </div>
          {data.hermesJobs.lastSuccessAt && (
            <div className="text-xs text-gray-500">最後成功：{new Date(data.hermesJobs.lastSuccessAt).toLocaleString("zh-TW")}</div>
          )}
          {data.hermesJobs.retryable > 0 && (
            <button onClick={retry} disabled={retrying}
              className="mt-2 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm disabled:opacity-50 flex items-center gap-1">
              {retrying ? <Loader2 className="animate-spin" size={14} /> : null} 立即重試
            </button>
          )}
          {data.hermesJobs.recentExhausted?.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-1 text-red-600">最近失敗 (exhausted)</div>
              <ul className="text-xs space-y-1">
                {data.hermesJobs.recentExhausted.slice(0, 3).map(j => (
                  <li key={j.id} className="text-gray-600">
                    {j.sessionId.slice(0, 8)} · {j.attempts} 次嘗試 · {j.error?.slice(0, 60)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Cron / Agent Workflows */}
      <div className="bg-white border rounded-lg p-4">
        <div className="font-semibold mb-3 flex items-center gap-2"><Clock size={18} /> Cron Workflows</div>
        <div className="text-xs text-gray-600 mb-3">手動觸發在 GitHub Actions 頁面：點 workflow 名稱進去，按右上角「Run workflow」</div>
        <div className="grid gap-2">
          {CRON_WORKFLOWS.map(w => (
            <div key={w.file} className="border rounded p-3 flex items-center gap-3 hover:bg-gray-50">
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  {w.name}
                  <Badge>{w.time}</Badge>
                </div>
                <div className="text-xs text-gray-600 mt-1">{w.desc}</div>
              </div>
              <Link href={`https://github.com/${REPO}/actions/workflows/${w.file}`} target="_blank"
                className="px-2 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-xs">
                <ExternalLink size={12} /> GitHub
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Model Registry 摘要 */}
      <div className="bg-white border rounded-lg p-4">
        <div className="font-semibold mb-3">Agent Teams 模型分配</div>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr><th className="py-2">任務</th><th>主模型</th><th>備援</th></tr>
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
              <tr key={task} className="border-t">
                <td className="py-2 font-medium">{task}</td>
                <td className="text-emerald-700 font-mono text-xs">{primary}</td>
                <td className="text-gray-600 font-mono text-xs">{fallback}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServiceCard({ name, healthy }: { name: string; healthy: boolean }) {
  return (
    <div className={`p-3 rounded border flex items-center gap-2 ${healthy ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
      {healthy ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
      <div>
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-gray-600">{healthy ? "正常" : "異常"}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    amber: "text-amber-600", blue: "text-blue-600", orange: "text-orange-600", emerald: "text-emerald-600", red: "text-red-600",
  };
  return (
    <div className="border rounded p-2 text-center">
      <div className={`text-2xl font-bold ${colorMap[color] || ""}`}>{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
