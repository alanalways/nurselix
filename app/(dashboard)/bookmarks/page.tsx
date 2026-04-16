"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Search } from "lucide-react";

export default function BookmarksPage() {
  const [search, setSearch] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">收藏題目</h1>
          <p className="text-[var(--text-secondary)] mt-1">共 0 道收藏題目</p>
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

      {/* Empty State */}
      <div className="text-center py-16 text-[var(--text-muted)]">
        <Bookmark size={48} className="mx-auto mb-4 opacity-30" />
        <p className="font-medium text-[var(--text-secondary)]">尚無收藏題目</p>
        <p className="text-sm mt-1">答題時點擊書籤圖示即可收藏</p>
      </div>
    </motion.div>
  );
}
