"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flag, CheckCircle, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const mockReports = [
  { id: "r1", questionId: "Q-102", stem: "A client receiving warfarin therapy...", reason: "答案有誤", detail: "選項 B 應該是正確答案，原題目的解析有誤", reporter: "user@example.com", status: "pending", createdAt: "2026/01/14" },
  { id: "r2", questionId: "Q-089", stem: "Priority assessment for ARDS...", reason: "解析不清楚", detail: "解析沒有說明為什麼排除選項 C", reporter: "nurse@example.com", status: "pending", createdAt: "2026/01/13" },
  { id: "r3", questionId: "Q-234", stem: "Furosemide dosing calculation...", reason: "題目有錯誤", detail: "劑量數字有誤，應為 40mg 而非 80mg", reporter: "student@example.com", status: "reviewed", createdAt: "2026/01/10" },
];

const statusMap = { pending: { label: "待審核", variant: "warning" as const }, reviewed: { label: "已審核", variant: "blue" as const }, resolved: { label: "已解決", variant: "success" as const } };

export default function AdminReportsPage() {
  const [filter, setFilter] = useState("pending");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">題目回報管理</h1>
        <div className="flex items-center gap-1 bg-[rgba(243,156,18,0.15)] border border-[var(--warning)] rounded-lg px-3 py-1.5">
          <Flag size={14} className="text-[var(--warning)]" />
          <span className="text-sm text-[var(--warning)] font-semibold">{mockReports.filter(r => r.status === "pending").length} 待處理</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["pending", "reviewed", "resolved", "全部"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filter === s ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]" : "border-[var(--border-default)] text-[var(--text-muted)]"
            }`}
          >
            {s === "pending" ? "待審核" : s === "reviewed" ? "已審核" : s === "resolved" ? "已解決" : "全部"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {mockReports.filter(r => filter === "全部" || r.status === filter).map((r) => (
          <div key={r.id} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-[var(--text-muted)]">{r.questionId}</span>
                  <Badge variant={statusMap[r.status as keyof typeof statusMap].variant}>
                    {statusMap[r.status as keyof typeof statusMap].label}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--text-primary)] line-clamp-1">{r.stem}</p>
              </div>
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-3">{r.createdAt}</span>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 mb-3">
              <div className="text-xs text-[var(--gold)] mb-1">{r.reason}</div>
              <div className="text-sm text-[var(--text-secondary)]">{r.detail}</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">回報者：{r.reporter}</span>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">查看題目</Button>
                  <Button size="sm" variant="outline">標記已審核</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
