"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flag, Loader2, Trash2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface ReportRow {
  id: string;
  questionId: string;
  reason: string;
  detail: string | null;
  status: "pending" | "reviewed" | "resolved";
  createdAt: string;
  user: { email: string; name: string | null } | null;
  question: { id: string; stem: string; domain: string | null; difficulty: string } | null;
}

const statusMap = {
  pending: { label: "待審核", variant: "warning" as const },
  reviewed: { label: "已審核", variant: "blue" as const },
  resolved: { label: "已解決", variant: "success" as const },
};

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<"pending" | "reviewed" | "resolved" | "全部">("pending");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [deduping, setDeduping] = useState(false);
  const [dedupMsg, setDedupMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "全部") params.set("status", filter);
    try {
      const res = await fetch(`/api/admin/reports?${params}`, { cache: "no-store" });
      if (res.ok) {
        const body = await res.json();
        setRows(body.rows);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: "reviewed" | "resolved") => {
    setActing(id);
    try {
      await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setActing(null);
    }
  };

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  const runDedup = async () => {
    setDeduping(true);
    setDedupMsg(null);
    try {
      const res = await fetch("/api/admin/reports?action=dedup", { method: "POST" });
      const body = await res.json();
      setDedupMsg(body.message ?? "完成");
      await load();
    } catch {
      setDedupMsg("清理失敗");
    } finally {
      setDeduping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">題目回報管理</h1>
        {filter === "pending" && (
          <div className="flex items-center gap-1 bg-[rgba(243,156,18,0.15)] border border-[var(--warning)] rounded-lg px-3 py-1.5">
            <Flag size={14} className="text-[var(--warning)]" />
            <span className="text-sm text-[var(--warning)] font-semibold">{pendingCount} 待處理</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={runDedup}
          disabled={deduping}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--error)] hover:text-[var(--error)] transition-colors disabled:opacity-40"
        >
          {deduping ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          清理重複回報
        </button>
        {dedupMsg && <span className="text-xs text-[var(--text-muted)]">{dedupMsg}</span>}
      </div>

      <div className="flex gap-2">
        {(["pending", "reviewed", "resolved", "全部"] as const).map((s) => (
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

      {loading ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[var(--gold)]" />
          <p className="text-sm text-[var(--text-secondary)]">載入回報...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-[var(--text-muted)] text-sm">
          目前沒有{filter === "全部" ? "" : statusMap[filter].label}的回報
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {r.question?.id.substring(0, 8) ?? "—"}
                    </span>
                    <Badge variant={statusMap[r.status].variant}>{statusMap[r.status].label}</Badge>
                    {r.question?.domain && (
                      <span className="text-xs text-[var(--text-secondary)]">{r.question.domain}</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-primary)] line-clamp-1">
                    {r.question?.stem ?? "（題目已刪除）"}
                  </p>
                </div>
                <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-3">
                  {new Date(r.createdAt).toLocaleString("zh-TW")}
                </span>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded-lg p-3 mb-3">
                <div className="text-xs text-[var(--gold)] mb-1">{r.reason}</div>
                {r.detail && (
                  <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{r.detail}</div>
                )}
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-[var(--text-muted)]">
                  回報者：{r.user?.email ?? "（匿名）"}
                </span>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => r.question && window.open(`/admin/questions/${r.question.id}`, "_blank")}
                    >
                      查看題目
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(r.id, "reviewed")}
                      disabled={acting === r.id}
                    >
                      標記已審核
                    </Button>
                    <Button
                      size="sm"
                      variant="gold"
                      onClick={() => updateStatus(r.id, "resolved")}
                      disabled={acting === r.id}
                    >
                      標記已解決
                    </Button>
                  </div>
                )}
                {r.status === "reviewed" && (
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() => updateStatus(r.id, "resolved")}
                    disabled={acting === r.id}
                  >
                    標記已解決
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
