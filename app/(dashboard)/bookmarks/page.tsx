"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Search, Loader2 } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface BookmarkRow {
  id: string;
  note: string | null;
  createdAt: string;
  question: {
    id: string;
    stem: string;
    stemZh: string | null;
    domain: string | null;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    questionType: string;
  };
}

const diffBadge = { EASY: "success" as const, MEDIUM: "gold" as const, HARD: "error" as const };

export default function BookmarksPage() {
  const [rows, setRows] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/bookmarks", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          setRows(body.rows);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      r.question.stem.toLowerCase().includes(q) ||
      (r.question.stemZh?.toLowerCase().includes(q) ?? false) ||
      (r.question.domain?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">收藏題目</h1>
        <p className="text-[var(--text-secondary)] mt-1">共 {rows.length} 道收藏題目</p>
      </div>

      <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5">
        <Search size={16} className="text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋題目或 Domain..."
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />
      </div>

      {loading ? (
        <div className="py-10 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[var(--gold)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Bookmark size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium text-[var(--text-secondary)]">
            {rows.length === 0 ? "尚無收藏題目" : "沒有符合的結果"}
          </p>
          <p className="text-sm mt-1">答題時點擊書籤圖示即可收藏</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--gold)] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={diffBadge[r.question.difficulty]}>{r.question.difficulty}</Badge>
                    <Badge variant="muted">{r.question.questionType}</Badge>
                    {r.question.domain && (
                      <span className="text-xs text-[var(--text-secondary)]">{r.question.domain}</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-primary)] line-clamp-2" title={r.question.stem}>{r.question.stem}</p>
                  {r.question.stemZh && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1" title={r.question.stemZh}>{r.question.stemZh}</p>
                  )}
                  {r.note && (
                    <div className="text-xs text-[var(--gold)] mt-2 bg-[var(--gold-dim)] rounded p-2">
                      📝 {r.note}
                    </div>
                  )}
                </div>
                <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                  {new Date(r.createdAt).toLocaleDateString("zh-TW")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
