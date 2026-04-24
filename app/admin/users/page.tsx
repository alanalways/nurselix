"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, UserX, Loader2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "STUDENT" | "MODERATOR" | "ADMIN";
  plan: "FREE" | "BASIC" | "PRO" | "ELITE";
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  trialEndsAt: string | null;
  answerCount: number;
  sessionCount: number;
}

const roleBadge = { STUDENT: "muted" as const, MODERATOR: "blue" as const, ADMIN: "error" as const };

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "30" });
    if (debouncedSearch) params.set("q", debouncedSearch);
    try {
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      if (res.ok) {
        const body = await res.json();
        setRows(body.rows);
        setTotal(body.total);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);

  const updatePlan = async (id: string, plan: UserRow["plan"]) => {
    setSaving(id);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "更新方案失敗");
        return;
      }
      await load();
    } catch {
      setSaveError("網路錯誤，請稍後重試");
    } finally {
      setSaving(null);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    if (!confirm(isActive ? "確定要停用此帳號？" : "確定要啟用此帳號？")) return;
    setSaving(id);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "更新帳號狀態失敗");
        return;
      }
      await load();
    } catch {
      setSaveError("網路錯誤，請稍後重試");
    } finally {
      setSaving(null);
    }
  };

  const summary = {
    total,
    proElite: rows.filter((u) => u.plan === "PRO" || u.plan === "ELITE").length,
    admin: rows.filter((u) => u.role === "ADMIN").length,
    inactive: rows.filter((u) => !u.isActive).length,
  };

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">用戶管理</h1>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "總用戶", value: summary.total },
          { label: "Pro/Elite (當頁)", value: summary.proElite },
          { label: "Admin (當頁)", value: summary.admin },
          { label: "停用 (當頁)", value: summary.inactive },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold font-mono text-[var(--gold)]">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {saveError && (
        <div className="bg-[rgba(231,76,60,0.1)] border border-[var(--error)] rounded-xl px-4 py-2 text-sm text-[var(--error)]">
          {saveError}
        </div>
      )}

      <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 max-w-sm">
        <Search size={14} className="text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜尋 email / 姓名..."
          className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none flex-1"
        />
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[var(--gold)]" />
            <p className="text-sm text-[var(--text-secondary)]">載入中...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)] text-sm">沒有符合的用戶</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border-subtle)]">
              <tr>
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">用戶</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">角色</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">方案</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium hidden md:table-cell">答題數</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium hidden lg:table-cell">註冊日</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">狀態</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--gold-dim)] flex items-center justify-center text-xs text-[var(--gold)] font-bold">
                        {(u.name ?? u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[var(--text-primary)] font-medium">{u.name ?? "—"}</div>
                        <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={roleBadge[u.role]}>{u.role}</Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <select
                      value={u.plan}
                      onChange={(e) => updatePlan(u.id, e.target.value as UserRow["plan"])}
                      disabled={saving === u.id}
                      className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--gold)] outline-none"
                    >
                      {["FREE", "BASIC", "PRO", "ELITE"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-center hidden md:table-cell font-mono text-[var(--text-secondary)]">
                    {u.answerCount}
                  </td>
                  <td className="py-3 px-4 text-center hidden lg:table-cell text-[var(--text-muted)] text-xs">
                    {new Date(u.createdAt).toLocaleDateString("zh-TW")}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={u.isActive ? "success" : "error"}>
                      {u.isActive ? "活躍" : "停用"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => toggleActive(u.id, u.isActive)}
                        disabled={saving === u.id}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                        title={u.isActive ? "停用帳號" : "啟用帳號"}
                      >
                        {saving === u.id ? <Loader2 size={13} className="animate-spin" /> : <UserX size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
        <div>共 {total.toLocaleString()} 名用戶</div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>上一頁</Button>
            <span className="font-mono">{page} / {totalPages}</span>
            <Button size="sm" variant="ghost" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>下一頁</Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
