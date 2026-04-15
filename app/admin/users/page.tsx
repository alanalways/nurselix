"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, UserX, Shield } from "lucide-react";
import Badge from "@/components/ui/Badge";

const mockUsers = Array.from({ length: 12 }, (_, i) => ({
  id: `user-${i}`,
  email: `user${i + 1}@example.com`,
  displayName: `護理師 ${i + 1}`,
  plan: ["FREE", "BASIC", "PRO", "ELITE"][i % 4],
  role: i === 0 ? "ADMIN" : "STUDENT",
  isActive: i !== 5,
  questionsAnswered: Math.floor(Math.random() * 500) + 10,
  lastLogin: `2026/01/${String(10 + i).padStart(2, "0")}`,
  createdAt: `2025/12/${String(10 + i).padStart(2, "0")}`,
}));

const planBadge = { FREE: "muted" as const, BASIC: "blue" as const, PRO: "gold" as const, ELITE: "elite" as const };

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");

  const filtered = mockUsers.filter(u =>
    u.email.includes(search) || u.displayName.includes(search)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">用戶管理</h1>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "總用戶", value: mockUsers.length },
          { label: "Pro/Elite", value: mockUsers.filter(u => u.plan === "PRO" || u.plan === "ELITE").length },
          { label: "今日活躍", value: 23 },
          { label: "本月新增", value: 8 },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold font-mono text-[var(--gold)]">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 max-w-xs">
        <Search size={14} className="text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋用戶..."
          className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border-subtle)]">
            <tr>
              <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">用戶</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">方案</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium hidden md:table-cell">答題數</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium hidden lg:table-cell">最後登入</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">狀態</th>
              <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--gold-dim)] flex items-center justify-center text-xs text-[var(--gold)] font-bold">
                      {u.displayName[0]}
                    </div>
                    <div>
                      <div className="text-[var(--text-primary)] font-medium">{u.displayName}</div>
                      <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={planBadge[u.plan as keyof typeof planBadge]}>{u.plan}</Badge>
                </td>
                <td className="py-3 px-4 text-center hidden md:table-cell font-mono text-[var(--text-secondary)]">
                  {u.questionsAnswered}
                </td>
                <td className="py-3 px-4 text-center hidden lg:table-cell text-[var(--text-muted)] text-xs">
                  {u.lastLogin}
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={u.isActive ? "success" : "error"}>
                    {u.isActive ? "活躍" : "停用"}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors" title="調整方案">
                      <Shield size={13} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors" title="停用帳號">
                      <UserX size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
