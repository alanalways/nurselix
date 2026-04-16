"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ClipboardList, X } from "lucide-react";
import Button from "@/components/ui/Button";

export default function AssessmentPrompt() {
  const [dismissed, setDismissed] = useState(false);
  const [hasAssessment, setHasAssessment] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        setHasAssessment(body.assessmentTheta !== null);
      } catch {
        setHasAssessment(null);
      }
    })();
  }, []);

  // Don't show if user already completed an assessment
  if (dismissed || hasAssessment === true) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative bg-gradient-to-r from-[var(--gold-dim)] to-[var(--blue-dim)] border border-[var(--gold)] rounded-xl p-5"
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--gold-dim)] border border-[var(--gold)] flex items-center justify-center flex-shrink-0">
          <ClipboardList size={22} className="text-[var(--gold)]" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">先做一個評估，找出你的備考弱點！</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            約 5-8 分鐘，CAT 演算法精準評估你的 NCLEX 能力值，找出最需要加強的 domain。
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push("/nclex/assessment")}>
              開始評估（約 5-8 分鐘）
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              稍後再做
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
