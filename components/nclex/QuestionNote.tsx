"use client";

import { useState } from "react";
import { StickyNote, Save } from "lucide-react";

export default function QuestionNote({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        <div className="mt-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="寫下你的筆記..."
            rows={3}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--gold-dim)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[#080E1A] transition-colors"
            >
              <Save size={12} />
              {saved ? "已儲存 ✓" : "儲存"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
