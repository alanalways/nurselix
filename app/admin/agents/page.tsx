"use client";

import { motion } from "framer-motion";
import { Bot, CheckCircle, Clock, AlertCircle, Activity } from "lucide-react";
import Badge from "@/components/ui/Badge";

const tasks = [
  { name: "Health Ping", schedule: "每 5 分鐘", lastRun: "3 分鐘前", status: "success", nextRun: "2 分鐘後" },
  { name: "PostgreSQL 備份 → MinIO", schedule: "每天 03:00", lastRun: "昨晚 03:00", status: "success", nextRun: "今晚 03:00" },
  { name: "資料庫清理", schedule: "每天 04:00", lastRun: "昨晚 04:00", status: "success", nextRun: "今晚 04:00" },
  { name: "學習週報生成", schedule: "每週一 08:00", lastRun: "上週一 08:00", status: "success", nextRun: "下週一 08:00" },
  { name: "AI 新題生成", schedule: "每月 1 日", lastRun: "2026/01/01", status: "success", nextRun: "2026/02/01" },
  { name: "每日計數重置 (Redis)", schedule: "每天 00:00", lastRun: "今天 00:00", status: "success", nextRun: "明天 00:00" },
  { name: "考前提醒 email", schedule: "每天 08:00", lastRun: "今天 08:00", status: "success", nextRun: "明天 08:00" },
];

const statusMap = {
  success: { icon: CheckCircle, color: "text-[var(--success)]", badge: "success" as const },
  running: { icon: Activity, color: "text-[var(--blue)]", badge: "blue" as const },
  error: { icon: AlertCircle, color: "text-[var(--error)]", badge: "error" as const },
};

export default function AdminAgentsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Hermes 任務狀態</h1>
        <Badge variant="success">全部正常</Badge>
      </div>

      {/* Hermes Status Card */}
      <div className="bg-gradient-to-r from-[var(--blue-dim)] to-[var(--gold-dim)] border border-[var(--blue)] rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--blue-dim)] border border-[var(--blue)] flex items-center justify-center">
            <Bot size={24} className="text-[var(--blue)]" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Hermes AI Agent</h2>
            <p className="text-sm text-[var(--text-secondary)]">自動化維護機器人 · 7 個排程任務運行中</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-sm text-[var(--success)] font-medium">Online</span>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border-subtle)]">
            <tr>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">任務名稱</th>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium hidden md:table-cell">排程</th>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium hidden lg:table-cell">上次執行</th>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium hidden lg:table-cell">下次執行</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">狀態</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const s = statusMap[t.status as keyof typeof statusMap];
              return (
                <tr key={t.name} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <s.icon size={14} className={s.color} />
                      <span className="text-[var(--text-primary)] font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-[var(--text-muted)] text-xs">{t.schedule}</td>
                  <td className="py-3 px-4 hidden lg:table-cell text-[var(--text-secondary)] text-xs">{t.lastRun}</td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Clock size={11} />{t.nextRun}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={s.badge}>
                      {t.status === "success" ? "成功" : t.status === "running" ? "執行中" : "錯誤"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Log Preview */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">最近執行日誌</h3>
        <div className="font-mono text-xs text-[var(--success)] bg-[var(--bg-base)] rounded-lg p-4 space-y-1 max-h-48 overflow-y-auto">
          <p>[2026-04-15 08:00:02] ✓ Health ping: all services healthy (4ms, 1ms, 12ms)</p>
          <p>[2026-04-15 08:00:00] ✓ Exam reminder emails sent: 23 users</p>
          <p>[2026-04-15 04:00:03] ✓ DB cleanup: 142 expired tokens removed</p>
          <p>[2026-04-15 03:00:11] ✓ PostgreSQL backup completed → MinIO (2.3GB)</p>
          <p>[2026-04-15 00:00:01] ✓ Daily question counts reset in Redis</p>
          <p>[2026-04-14 08:00:02] ✓ Health ping: all services healthy</p>
        </div>
      </div>
    </motion.div>
  );
}
