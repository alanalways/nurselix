"use client";

import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const REASONS = ["答案有誤", "解析不清楚", "題目有錯誤", "選項不完整", "其他"];

const SESSION_KEY = "reported_questions";

function getReported(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markReported(questionId: string) {
  try {
    const s = getReported();
    s.add(questionId);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(s)));
  } catch {
    // ignore
  }
}

export default function ReportButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyReported, setAlreadyReported] = useState(false);

  useEffect(() => {
    setAlreadyReported(getReported().has(questionId));
  }, [questionId]);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, reason: selected, detail: detail || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "回報失敗");
        return;
      }
      markReported(questionId);
      setAlreadyReported(true);
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setSelected("");
        setDetail("");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "網路錯誤");
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyReported) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--success)] opacity-70 cursor-default select-none">
        <Flag size={12} />
        已回報
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
      >
        <Flag size={12} />
        回報問題
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="回報題目問題" size="sm">
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">✓</div>
            <p className="text-[var(--success)] font-semibold">感謝你的回報！</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">我們會盡快審核並修正。</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">請選擇問題類型：</p>
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                    selected === r
                      ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--gold)]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="補充說明（選填）"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--gold)] resize-none"
            />
            {error && <p className="text-sm text-[var(--error)]">{error}</p>}
            <Button fullWidth disabled={!selected || submitting} onClick={handleSubmit}>
              {submitting ? "送出中..." : "送出回報"}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
