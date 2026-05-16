"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";

interface Props {
  sessionId: string;
  /** Delay before showing the prompt, ms. Defaults to 4000 so the user sees their result first. */
  delayMs?: number;
}

const STORAGE_PREFIX = "feedback-shown-";

export default function FeedbackPrompt({ sessionId, delayMs = 4000 }: Props) {
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${STORAGE_PREFIX}${sessionId}`;
    if (window.localStorage.getItem(key)) return;
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [sessionId, delayMs]);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, String(Date.now()));
    }
    setVisible(false);
  }

  async function submit() {
    if (rating < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          sessionId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setSubmitted(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, String(Date.now()));
      }
      window.setTimeout(() => setVisible(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送出失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", damping: 22, stiffness: 240 }}
          className="fixed inset-x-0 bottom-4 z-50 px-4 flex justify-center pointer-events-none"
        >
          <div className="pointer-events-auto w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-5">
            {submitted ? (
              <div className="flex items-center gap-3 py-2">
                <CheckCircle2 size={22} className="text-[var(--success)] shrink-0" />
                <p className="text-[var(--text-primary)]">謝謝你的回饋！</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">這次練習怎麼樣？</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">花 5 秒幫我改進題庫</p>
                  </div>
                  <button
                    onClick={dismiss}
                    aria-label="關閉"
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div
                  className="flex items-center gap-1 mb-3"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = (hoverRating || rating) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} 顆星`}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        className="p-1.5 transition-transform hover:scale-110"
                      >
                        <Star
                          size={26}
                          className={
                            filled
                              ? "fill-[var(--gold)] text-[var(--gold)]"
                              : "text-[var(--text-muted)]"
                          }
                        />
                      </button>
                    );
                  })}
                </div>

                {rating > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3"
                  >
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, 500))}
                      placeholder={
                        rating <= 2
                          ? "哪裡讓你失望？（選填，我會看）"
                          : rating >= 4
                          ? "什麼地方做得好？（選填）"
                          : "想到什麼就寫（選填）"
                      }
                      rows={2}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="gold"
                        size="sm"
                        loading={submitting}
                        disabled={submitting}
                        onClick={submit}
                      >
                        送出回饋
                      </Button>
                      <Button variant="ghost" size="sm" onClick={dismiss}>
                        下次再說
                      </Button>
                    </div>
                    {error && (
                      <p className="text-xs text-[var(--error)]">{error}</p>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
