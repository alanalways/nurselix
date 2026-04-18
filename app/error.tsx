"use client";

import { useRouter } from "next/navigation";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 text-center bg-[var(--bg-base)]">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center text-[#080E1A] font-bold text-lg">
        N
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)]">頁面發生錯誤</h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm">
        我們已自動記錄此問題。請嘗試重試，或返回首頁。
      </p>
      {error.digest && (
        <p className="text-xs text-[var(--text-muted)] font-mono">ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] font-semibold text-sm"
        >
          重試
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] text-sm hover:border-[var(--gold)]"
        >
          回首頁
        </button>
      </div>
    </div>
  );
}
