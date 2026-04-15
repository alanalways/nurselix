"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/utils/cn";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  show: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (type, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-[var(--success)]" />,
  error: <XCircle size={18} className="text-[var(--error)]" />,
  warning: <AlertCircle size={18} className="text-[var(--warning)]" />,
  info: <Info size={18} className="text-[var(--blue)]" />,
};

const borders: Record<ToastType, string> = {
  success: "border-l-[var(--success)]",
  error: "border-l-[var(--error)]",
  warning: "border-l-[var(--warning)]",
  info: "border-l-[var(--blue)]",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl",
              "bg-[var(--bg-elevated)] border border-[var(--border-default)] border-l-4 shadow-xl",
              borders[t.type]
            )}
          >
            {icons[t.type]}
            <p className="flex-1 text-sm text-[var(--text-primary)]">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const { show } = useToastStore();
  return {
    success: (msg: string) => show("success", msg),
    error: (msg: string) => show("error", msg),
    warning: (msg: string) => show("warning", msg),
    info: (msg: string) => show("info", msg),
  };
}
