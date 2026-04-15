"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Check, X, Eye, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const mockQuestions = Array.from({ length: 15 }, (_, i) => ({
  id: `q-${i}`,
  stem: `A ${55 + i}-year-old patient presents with ${["chest pain", "shortness of breath", "altered mental status", "severe headache"][i % 4]} and requires immediate nursing intervention. Which action should the nurse take first?`,
  domain: ["Management of Care", "Pharmacological", "Physiological Adaptation", "Safety & Infection Control"][i % 4],
  difficulty: ["EASY", "MEDIUM", "HARD"][i % 3],
  status: ["APPROVED", "DRAFT", "APPROVED", "DRAFT", "ARCHIVED"][i % 5],
  type: ["MCQ", "SATA", "MCQ", "Dropdown"][i % 4],
  attemptCount: Math.floor(Math.random() * 500) + 10,
  errorRate: Math.round(Math.random() * 60) + 20,
  createdAt: `2026/01/${String(i + 1).padStart(2, "0")}`,
}));

const statusBadge = {
  APPROVED: "success" as const,
  DRAFT: "warning" as const,
  ARCHIVED: "muted" as const,
};

const diffBadge = { EASY: "success" as const, MEDIUM: "gold" as const, HARD: "error" as const };

export default function AdminQuestionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");

  const filtered = mockQuestions.filter(q => {
    const matchSearch = q.stem.toLowerCase().includes(search.toLowerCase()) || q.domain.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "全部" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

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

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋題目..."
            className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none flex-1"
          />
        </div>
        <div className="flex gap-1">
          {["全部", "APPROVED", "DRAFT", "ARCHIVED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                statusFilter === s ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]" : "border-[var(--border-default)] text-[var(--text-muted)]"
              }`}
            >
              {s === "全部" ? "全部" : s === "APPROVED" ? "已審核" : s === "DRAFT" ? "草稿" : "封存"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border-subtle)]">
            <tr>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">題目</th>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium hidden md:table-cell">Domain</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">難度</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">狀態</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium hidden lg:table-cell">錯誤率</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q, i) => (
              <tr key={q.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                <td className="py-3 px-4">
                  <p className="text-[var(--text-primary)] line-clamp-1 max-w-xs">{q.stem}</p>
                  <span className="text-xs text-[var(--text-muted)]">{q.type} · {q.createdAt}</span>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <span className="text-xs text-[var(--text-secondary)]">{q.domain}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={diffBadge[q.difficulty as keyof typeof diffBadge]}>{q.difficulty}</Badge>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={statusBadge[q.status as keyof typeof statusBadge]}>
                    {q.status === "APPROVED" ? "已審核" : q.status === "DRAFT" ? "草稿" : "封存"}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-center hidden lg:table-cell">
                  <span className={`font-mono text-sm ${q.errorRate > 50 ? "text-[var(--error)]" : q.errorRate > 30 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                    {q.errorRate}%
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => router.push(`/admin/questions/${q.id}`)} className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                      <Pencil size={14} />
                    </button>
                    {q.status === "DRAFT" && (
                      <button className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--success)] transition-colors">
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-[var(--text-muted)] text-center">
        共 {filtered.length} 道題目
      </div>
    </motion.div>
  );
}
