"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, Search, Check, Archive, Eye, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface QuestionRow {
  id: string;
  stem: string;
  stemZh: string | null;
  domain: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  status: "APPROVED" | "DRAFT" | "ARCHIVED";
  questionType: string;
  attemptCount: number;
  correctCount: number;
  errorRate: number | null;
  createdAt: string;
}

const statusBadge = {
  APPROVED: "success" as const,
  DRAFT: "warning" as const,
  ARCHIVED: "muted" as const,
};

const diffBadge = { EASY: "success" as const, MEDIUM: "gold" as const, HARD: "error" as const };

export default function AdminQuestionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "30",
    });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (statusFilter !== "全部") params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/admin/questions?${params}`, { cache: "no-store" });
      if (res.ok) {
        const body = await res.json();
        setRows(body.rows);
        setTotal(body.total);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const bulkUpdate = async (newStatus: "APPROVED" | "ARCHIVED") => {
    if (selected.size === 0 || acting) return;
    setActing(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), status: newStatus }),
      });
      if (res.ok) {
        setSelected(new Set());
        await load();
      }
    } finally {
      setActing(false);
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">題庫管理</h1>
        <Button size="sm" onClick={() => router.push("/admin/questions/new")}>
          <Plus size={14} /> 新增題目
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 flex-1 max-w-sm">
          <Search size={14} className="text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜尋題目 / domain..."
            className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none flex-1"
          />
        </div>
        <div className="flex gap-1">
          {["全部", "APPROVED", "DRAFT", "ARCHIVED"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                statusFilter === s ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]" : "border-[var(--border-default)] text-[var(--text-muted)]"
              }`}
            >
              {s === "全部" ? "全部" : s === "APPROVED" ? "已審核" : s === "DRAFT" ? "草稿" : "封存"}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="ml-auto flex gap-2">
            <span className="text-xs text-[var(--text-muted)] self-center">已選 {selected.size}</span>
            <Button size="sm" variant="outline" onClick={() => bulkUpdate("APPROVED")} disabled={acting}>
              <Check size={14} /> 批次核准
            </Button>
            <Button size="sm" variant="ghost" onClick={() => bulkUpdate("ARCHIVED")} disabled={acting}>
              <Archive size={14} /> 批次封存
            </Button>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[var(--gold)]" />
            <p className="text-sm text-[var(--text-secondary)]">載入中...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)] text-sm">
            沒有符合的題目
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                    className="accent-[var(--gold)]"
                  />
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">題目</th>
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium hidden md:table-cell">Domain</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">難度</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">狀態</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium hidden lg:table-cell">錯誤率</th>
                <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => toggleOne(q.id)}
                      className="accent-[var(--gold)]"
                    />
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <p className="text-[var(--text-primary)] line-clamp-1">{q.stem}</p>
                    <span className="text-xs text-[var(--text-muted)]">
                      {q.questionType} · {new Date(q.createdAt).toLocaleDateString("zh-TW")}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-xs text-[var(--text-secondary)]">{q.domain ?? "—"}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={diffBadge[q.difficulty]}>{q.difficulty}</Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={statusBadge[q.status]}>
                      {q.status === "APPROVED" ? "已審核" : q.status === "DRAFT" ? "草稿" : "封存"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center hidden lg:table-cell">
                    {q.errorRate !== null ? (
                      <span className={`font-mono text-sm ${q.errorRate > 50 ? "text-[var(--error)]" : q.errorRate > 30 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                        {q.errorRate}%
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => router.push(`/admin/questions/${q.id}`)}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
                        title="檢視 / 編輯"
                      >
                        <Eye size={14} />
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
        <div>共 {total.toLocaleString()} 道題目</div>
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
