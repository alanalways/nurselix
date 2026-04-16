"use client";

import { useEffect, useState } from "react";
import { StickyNote, Save, Loader2 } from "lucide-react";

export default function QuestionNote({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTs, setSavedTs] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/notes?questionId=${encodeURIComponent(questionId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => setContent(body.note?.content ?? ""))
      .finally(() => setLoading(false));
  }, [open, questionId]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, content }),
      });
      setSavedTs(Date.now());
      setTimeout(() => setSavedTs(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
      >
        <StickyNote size={12} />
        筆記
      </button>

      {open && (
        <div className="mt-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 w-72">
          {loading ? (
            <div className="py-4 flex justify-center">
              <Loader2 size={16} className="animate-spin text-[var(--gold)]" />
            </div>
          ) : (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="寫下你的筆記..."
                rows={4}
                className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--gold-dim)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[#080E1A] transition-colors"
                >
                  <Save size={12} />
                  {saving ? "儲存中..." : savedTs ? "已儲存 ✓" : "儲存"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
