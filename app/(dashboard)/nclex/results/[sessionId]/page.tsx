"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ResultsPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-3xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">考試結果</h1>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--blue-dim)] flex items-center justify-center">
          <AlertCircle size={28} className="text-[var(--blue)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)] text-lg">找不到考試記錄</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Session ID: {params.sessionId}</p>
        </div>
      </div>

      <Button variant="gold" onClick={() => router.push("/nclex")}>
        <Home size={16} /> 回到 NCLEX
      </Button>
    </motion.div>
  );
}
