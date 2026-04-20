"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Library, ArrowRight, X, Brain, RotateCcw } from "lucide-react";

/**
 * One-time feature announcement.
 * Bump WHATS_NEW_KEY whenever a new major feature ships.
 */
const WHATS_NEW_KEY = "nurslix.seen.2026-04-vocab-v2";

export default function WhatsNewBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(WHATS_NEW_KEY)) {
        const t = setTimeout(() => setShow(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage blocked — silently ignore
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(WHATS_NEW_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--gold)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--gold-dim)]/30 shadow-2xl overflow-hidden"
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Gold accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-[var(--gold)] via-[var(--gold-light)] to-[var(--gold)]" />

              <div className="relative p-6">
                <button
                  onClick={dismiss}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  aria-label="關閉"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--gold)] mb-3">
                  <Sparkles size={13} /> 詞庫大升級
                </div>

                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Library size={24} className="text-[#080E1A]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">NCLEX 單字詞庫</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      4,500+ 護理必考詞彙・12 大類・全繁中釋義
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 text-sm text-[var(--text-secondary)] mb-5">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--gold)] mt-0.5 flex-shrink-0">•</span>
                    <span>涵蓋藥理、病理、評估、內外科、婦幼、精神、檢驗等 12 大類，每類數百個高頻詞</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Brain size={13} className="text-[var(--gold)] mt-0.5 flex-shrink-0" />
                    <span>4 種練習模式：單字卡、定義選字、中文選義、拼字闖關</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <RotateCcw size={13} className="text-[var(--gold)] mt-0.5 flex-shrink-0" />
                    <span>SM-2 間隔記憶排程・每個詞都有詞源記憶法・按你的遺忘曲線複習</span>
                  </li>
                </ul>

                <div className="flex gap-2">
                  <button
                    onClick={dismiss}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    稍後再看
                  </button>
                  <Link
                    href="/vocab"
                    onClick={dismiss}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                  >
                    開始背單字 <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
