"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, MetaText, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

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

const ROLE_TONE: Record<string, "muted" | "phosphor" | "danger"> = {
  STUDENT: "muted",
  MODERATOR: "phosphor",
  ADMIN: "danger",
};

const PLAN_TONE: Record<string, "muted" | "neutral" | "phosphor" | "warning"> = {
  FREE: "muted",
  BASIC: "neutral",
  PRO: "phosphor",
  ELITE: "warning",
};

const SELECT_CLS = "border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-0.5 text-xs focus:outline-none focus:border-[var(--j-phosphor)]";

export default function UsersTab() {
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
    } finally { setLoading(false); }
  }, [debouncedSearch, page]);
  useEffect(() => { load(); }, [load]);

  const updatePlan = async (id: string, plan: UserRow["plan"]) => {
    setSaving(id); setSaveError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "更新方案失敗");
        return;
      }
      await load();
    } catch { setSaveError("網路錯誤，請稍後重試"); }
    finally { setSaving(null); }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    if (!confirm(isActive ? "確定要停用此帳號？" : "確定要啟用此帳號？")) return;
    setSaving(id); setSaveError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "更新帳號狀態失敗");
        return;
      }
      await load();
    } catch { setSaveError("網路錯誤，請稍後重試"); }
    finally { setSaving(null); }
  };

  const summary = {
    total,
    proElite: rows.filter(u => u.plan === "PRO" || u.plan === "ELITE").length,
    admin: rows.filter(u => u.role === "ADMIN").length,
    inactive: rows.filter(u => !u.isActive).length,
  };
  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="border-y border-[var(--j-line)] py-4">
        <SectionLabel className="mb-3">Readership · 讀者統計</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="總讀者" value={summary.total} hint="all-time" />
          <Stat label="Pro/Elite" value={summary.proElite} hint="當頁" />
          <Stat label="Admin" value={summary.admin} hint="當頁" />
          <Stat label="停用" value={summary.inactive} hint="當頁" />
        </div>
      </div>

      {saveError && (
        <div className="border-l-2 border-[var(--j-red)] bg-[var(--j-red)]/8 px-4 py-2 text-sm text-[var(--j-red)] italic" style={FONT_DISPLAY}>
          {saveError}
        </div>
      )}

      {/* Search + refresh */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-[var(--j-line)] px-3 py-1.5 max-w-sm flex-1">
          <Search size={13} className="text-[var(--j-ink-muted)]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="search email / name…"
            className="bg-transparent text-sm text-[var(--j-ink)] placeholder:italic placeholder:text-[var(--j-ink-muted)] outline-none flex-1"
            style={FONT_DISPLAY} />
        </div>
        <button onClick={load} className="text-sm text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition" style={FONT_MONO}>
          <RefreshCw size={13} /> refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-[var(--j-ink-dim)] py-4 italic" style={FONT_DISPLAY}>
          <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} /> Reading the subscriber list…
        </div>
      ) : rows.length === 0 ? (
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-12 text-center italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
          — No matching readers.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-[var(--j-line)]">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--j-line-strong)]">
                <tr className="text-left text-[10px] tracking-[0.15em] uppercase text-[var(--j-ink-dim)]" style={FONT_MONO}>
                  <th className="py-3 px-4">Reader</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Activity</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u, i) => (
                  <tr key={u.id} className={cn(
                    "hover:bg-[var(--j-phosphor-soft)] transition",
                    i < rows.length - 1 && "border-b border-[var(--j-line)]"
                  )}>
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="italic text-[var(--j-ink)]" style={FONT_DISPLAY}>{u.name || "—"}</div>
                      <div className="text-xs text-[var(--j-ink-dim)] truncate max-w-[240px]" style={FONT_MONO}>{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Pill tone={ROLE_TONE[u.role]}>{u.role}</Pill>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.plan}
                        onChange={e => updatePlan(u.id, e.target.value as UserRow["plan"])}
                        disabled={saving === u.id}
                        className={cn(SELECT_CLS, "italic")}
                        style={FONT_DISPLAY}>
                        <option value="FREE">FREE</option>
                        <option value="BASIC">BASIC</option>
                        <option value="PRO">PRO</option>
                        <option value="ELITE">ELITE</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-[var(--j-ink-dim)]" style={FONT_MONO}>
                        {u.answerCount} answers · {u.sessionCount} sessions
                      </div>
                      {u.lastLogin && (
                        <div className="text-[10px] text-[var(--j-ink-muted)]" style={FONT_MONO}>
                          last · {new Date(u.lastLogin).toLocaleDateString("zh-TW")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--j-ink-dim)]" style={FONT_MONO}>
                      {new Date(u.createdAt).toLocaleDateString("zh-TW")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => toggleActive(u.id, u.isActive)} disabled={saving === u.id}
                        className={cn(
                          "px-2 py-1 text-xs italic border transition disabled:opacity-50",
                          u.isActive
                            ? "border-[var(--j-line)] text-[var(--j-ink-dim)] hover:border-[var(--j-red)] hover:text-[var(--j-red)]"
                            : "border-[var(--j-phosphor-line)] text-[var(--j-phosphor)] hover:bg-[var(--j-phosphor-soft)]"
                        )}
                        style={FONT_DISPLAY}>
                        {u.isActive ? "deactivate" : "reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <MetaText>page {page} / {totalPages} · {total} total</MetaText>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-2 py-1 border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] disabled:opacity-30 disabled:hover:border-[var(--j-line)] transition">
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="px-2 py-1 border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] disabled:opacity-30 disabled:hover:border-[var(--j-line)] transition">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-4">
      <div className="text-xs text-[var(--j-ink-dim)]" style={FONT_ZH}>{label}</div>
      <div className="italic text-2xl text-[var(--j-ink)] mt-1" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-[var(--j-ink-muted)] mt-1" style={FONT_MONO}>{hint}</div>}
    </div>
  );
}
