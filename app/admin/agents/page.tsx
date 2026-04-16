"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, CheckCircle, Clock, AlertCircle, Loader2, Copy } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface AgentsData {
  timestamp: string;
  services: {
    database: { healthy: boolean };
    redis: { healthy: boolean };
    minio: { healthy: boolean | null; note?: string };
  };
  hermes: {
    lastBackupAt: string | null;
    cronTasks: Array<{ id: string; schedule: string; description: string }>;
  };
}

export default function AdminAgentsPage() {
  const [data, setData] = useState<AgentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/agents", { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!data) return <div className="p-6 text-[var(--error)]">載入失敗</div>;

  const services = [
    { name: "PostgreSQL", healthy: data.services.database.healthy },
    { name: "Redis", healthy: data.services.redis.healthy },
    { name: "MinIO", healthy: data.services.minio.healthy },
  ];

  const allHealthy = services.every((s) => s.healthy !== false);

  const cronText = data.hermes.cronTasks
    .map((t) => `${t.schedule} - ${t.description}`)
    .join("\n");

  const copy = () => {
    navigator.clipboard.writeText(cronText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Hermes 任務狀態</h1>
        <Badge variant={allHealthy ? "success" : "error"}>
          {allHealthy ? "全部正常" : "有異常"}
        </Badge>
      </div>

      <div className="bg-gradient-to-r from-[var(--blue-dim)] to-[var(--gold-dim)] border border-[var(--blue)] rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--blue-dim)] border border-[var(--blue)] flex items-center justify-center">
            <Bot size={24} className="text-[var(--blue)]" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Hermes AI Agent</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              自動化維護機器人 · {data.hermes.cronTasks.length} 個排程任務
            </p>
            {data.hermes.lastBackupAt && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                最近備份：{new Date(data.hermes.lastBackupAt).toLocaleString("zh-TW")}
              </p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${allHealthy ? "bg-[var(--success)]" : "bg-[var(--error)]"}`} />
            <span className={`text-sm font-medium ${allHealthy ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
              {allHealthy ? "Online" : "Degraded"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {services.map((s) => (
          <div key={s.name} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--text-primary)]">{s.name}</span>
              {s.healthy === null
                ? <AlertCircle size={18} className="text-[var(--text-muted)]" />
                : s.healthy
                  ? <CheckCircle size={18} className="text-[var(--success)]" />
                  : <AlertCircle size={18} className="text-[var(--error)]" />}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {s.healthy === null ? "未檢查" : s.healthy ? "連線正常" : "連線失敗"}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)]">排程任務清單</h3>
          <button
            onClick={copy}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--gold)]"
          >
            <Copy size={12} /> {copied ? "已複製" : "複製 crontab"}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border-subtle)]">
            <tr>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">任務 ID</th>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Cron</th>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">描述</th>
            </tr>
          </thead>
          <tbody>
            {data.hermes.cronTasks.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                <td className="py-3 px-4 font-mono text-xs text-[var(--blue)]">{t.id}</td>
                <td className="py-3 px-4 font-mono text-xs text-[var(--gold)]">{t.schedule}</td>
                <td className="py-3 px-4 text-[var(--text-secondary)]">{t.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">接入 Hermes</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          請參考專案根目錄的 <code className="font-mono text-[var(--gold)]">HERMES_SETUP.md</code>，
          裡面包含完整的 Hermes 安裝指令、Telegram 通知設定，以及上面所有 cron 任務的完整指令。
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          上次檢查：<Clock size={11} className="inline" /> {new Date(data.timestamp).toLocaleString("zh-TW")}
        </p>
      </div>
    </motion.div>
  );
}
