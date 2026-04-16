"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";

interface BookmarkButtonProps {
  questionId: string;
  /** Initial bookmarked state, if already known from server data. */
  initial?: boolean;
}

export default function BookmarkButton({ questionId, initial = false }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [saving, setSaving] = useState(false);

  // Sync when the question changes
  useEffect(() => {
    setBookmarked(initial);
  }, [questionId, initial]);

  const toggle = async () => {
    if (saving) return;
    const previous = bookmarked;
    setBookmarked(!previous); // optimistic
    setSaving(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      if (!res.ok) {
        setBookmarked(previous); // rollback
        return;
      }
      const body = await res.json();
      setBookmarked(body.bookmarked);
    } catch {
      setBookmarked(previous);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`flex items-center gap-1.5 text-xs transition-colors ${
        bookmarked
          ? "text-[var(--gold)] hover:text-[var(--gold-light)]"
          : "text-[var(--text-muted)] hover:text-[var(--gold)]"
      }`}
      title={bookmarked ? "取消收藏" : "收藏題目"}
    >
      <Bookmark size={12} fill={bookmarked ? "currentColor" : "none"} />
      {bookmarked ? "已收藏" : "收藏"}
    </button>
  );
}
