"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, CheckCircle, Phone, XCircle, Clock, Loader2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface UpgradeRequest {
  id: string;
  plan: string;
  billing: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string | null; plan: string };
}

const PLAN_LABEL: Record<string, string> = { BASIC: "Basic", PRO: "Plus", ELITE: "Premium" };
const BILLING_LABEL: Record<string, string> = { monthly: "月付", quarterly: "季付", yearly: "年付" };

const STATUS_CONFIG: Record<string, { label: string; variant: "muted" | "gold" | "success" | "error"; icon: React.ReactNode }> = {
  pending:   { label: "待處理", variant: "error",   icon: <Clock size={12} /> },
  contacted: { label: "已聯繫", variant: "gold",    icon: <Phone size={12} /> },
  completed: { label: "已完成", variant: "success", icon: <CheckCircle size={12} /> },
  cancelled: { label: "已取消", variant: "muted",   icon: <XCircle size={12} /> },
};

export default function UpgradeRequestsPage() {
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/upgrade-requests");
      const data = await res.json();
      if (res.ok) setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id + status);
    try {
      const res = await fetch("/api/admin/upgrade-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)
        );
      }
    } finally {
      setUpdating(null);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const others = requests.filter((r) => r.status !== "pending");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">升級申請</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">用戶申請升級後在此查看，手動傳送匯款資訊</p>
        </div>
        <Button variant="outline" onClick={fetchRequests} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          重新整理
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : (
        <>
          {/* Pending — needs action */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--error)] animate-pulse" />
                待處理（{pending.length}）
              </h2>
              {pending.map((req, i) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  i={i}
                  updating={updating}
                  onUpdate={updateStatus}
                />
              ))}
            </div>
          )}

          {/* Others */}
          {others.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                歷史紀錄（{others.length}）
              </h2>
              {others.map((req, i) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  i={i}
                  updating={updating}
                  onUpdate={updateStatus}
                />
              ))}
            </div>
          )}

          {requests.length === 0 && (
            <div className="text-center py-20 text-[var(--text-muted)]">
              目前沒有升級申請
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RequestCard({
  req,
  i,
  updating,
  onUpdate,
}: {
  req: UpgradeRequest;
  i: number;
  updating: string | null;
  onUpdate: (id: string, status: string) => void;
}) {
  const statusCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
  const isPending = req.status === "pending";
  const isContacted = req.status === "contacted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--text-primary)]">
              {req.user.name ?? "（未命名）"}
            </span>
            <span className="text-sm text-[var(--text-muted)]">{req.user.email}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="gold">{PLAN_LABEL[req.plan] ?? req.plan}</Badge>
            <Badge variant="muted">{BILLING_LABEL[req.billing] ?? req.billing}</Badge>
            <Badge variant={statusCfg.variant} className="flex items-center gap-1">
              {statusCfg.icon}
              {statusCfg.label}
            </Badge>
            <span className="text-xs text-[var(--text-muted)]">
              目前方案：{req.user.plan}
            </span>
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)] shrink-0 text-right">
          {new Date(req.createdAt).toLocaleString("zh-TW", {
            month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit",
          })}
        </div>
      </div>

      {/* User's note */}
      {req.note && (
        <div className="bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)]">
          {req.note}
        </div>
      )}

      {/* Action buttons */}
      {(isPending || isContacted) && (
        <div className="flex items-center gap-2 flex-wrap">
          {isPending && (
            <Button
              size="sm"
              variant="gold"
              disabled={!!updating}
              onClick={() => onUpdate(req.id, "contacted")}
            >
              {updating === req.id + "contacted" ? <Loader2 size={12} className="animate-spin" /> : <Phone size={12} />}
              標記已聯繫
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={!!updating}
            onClick={() => onUpdate(req.id, "completed")}
          >
            {updating === req.id + "completed" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            已完成付款
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!updating}
            onClick={() => onUpdate(req.id, "cancelled")}
            className="text-[var(--error)] border-[var(--error)]/30 hover:bg-[var(--error)]/10"
          >
            {updating === req.id + "cancelled" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            取消
          </Button>
        </div>
      )}
    </motion.div>
  );
}
