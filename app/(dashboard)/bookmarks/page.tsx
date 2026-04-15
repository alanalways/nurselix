"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Search, Trash2, StickyNote } from "lucide-react";
import Badge from "@/components/ui/Badge";

const mockBookmarks = Array.from({ length: 8 }, (_, i) => ({
  id: `bm-${i}`,
  stem: `A ${55 + i}-year-old client with ${["diabetes", "hypertension", "COPD", "renal failure"][i % 4]} asks about medication management. The nurse should prioritize which teaching point?`,
  domain: ["Pharmacological", "Management of Care", "Basic Care & Comfort", "Health Promotion"][i % 4],
  difficulty: ["EASY", "MEDIUM", "HARD"][i % 3] as "EASY" | "MEDIUM" | "HARD",
  note: i % 3 === 0 ? "記住優先順序：ABC 原則" : "",
  savedAt: `2026/01/${String(10 + i).padStart(2, "0")}`,
}));

const diffBadge = { EASY: "success" as const, MEDIUM: "gold" as const, HARD: "error" as const };

export default function BookmarksPage() {
  const [search, setSearch] = useState("");
  const filtered = mockBookmarks.filter(b =>
    b.stem.toLowerCase().includes(search.toLowerCase()) ||
    b.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">收藏題目</h1>
          <p className="text-[var(--text-secondary)] mt-1">共 {mockBookmarks.length} 道收藏題目</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5">
        <Search size={16} className="text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋題目或 Domain..."
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((bm, i) => (
          <motion.div
            key={bm.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--gold)] transition-colors group"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed line-clamp-2">{bm.stem}</p>
              <button className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--error)] transition-all">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="muted">{bm.domain}</Badge>
              <Badge variant={diffBadge[bm.difficulty]}>{bm.difficulty}</Badge>
              <span className="text-xs text-[var(--text-muted)]">收藏於 {bm.savedAt}</span>
            </div>
            {bm.note && (
              <div className="mt-2 flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
                <StickyNote size={12} className="text-[var(--gold)] mt-0.5 flex-shrink-0" />
                {bm.note}
              </div>
            )}
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <Bookmark size={40} className="mx-auto mb-3 opacity-30" />
            <p>找不到符合的收藏題目</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
