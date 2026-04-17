"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Calendar } from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const STORAGE_KEY = "nurslix_onboarded_";

export default function OnboardingModal() {
  const { data: session, update: updateSession } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    const key = STORAGE_KEY + session.user.id;
    const done = localStorage.getItem(key);
    if (!done) {
      setName(session.user.name ?? "");
      setOpen(true);
    }
  }, [session?.user?.id, session?.user?.name]);

  async function handleSave() {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || session.user.name,
          examDate: examDate || null,
        }),
      });
      await updateSession();
      localStorage.setItem(STORAGE_KEY + session.user.id, "1");
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  function handleSkip() {
    if (!session?.user?.id) return;
    localStorage.setItem(STORAGE_KEY + session.user.id, "1");
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
                  <NurslixIconSquare size={24} className="text-[#080E1A]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">歡迎來到 Nurslix！</h2>
                  <p className="text-sm text-[var(--text-secondary)]">花 30 秒完成基本設定</p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
                    你希望我們叫你什麼？
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：護理師小明、Alan、佳慧..."
                    className="w-full px-4 py-3 rounded-xl border bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-[var(--border-default)] focus:border-[var(--gold)] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
                    <Calendar size={14} className="inline mr-1" />
                    NCLEX 考試日期（選填）
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-[var(--gold)] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  onClick={handleSave}
                  loading={saving}
                  fullWidth
                  className="gap-2"
                >
                  開始使用 <ChevronRight size={16} />
                </Button>
                <button
                  onClick={handleSkip}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-1"
                >
                  稍後再設定
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
