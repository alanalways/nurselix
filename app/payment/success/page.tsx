"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { NurslixIcon } from "@/components/ui/NurslixIcon";
import Button from "@/components/ui/Button";
import confetti from "canvas-confetti";

function SuccessContent() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId");

  useEffect(() => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-10 text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(46,204,113,0.15)] flex items-center justify-center">
            <CheckCircle size={36} className="text-[var(--success)]" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">付款成功！</h1>
          <p className="text-[var(--text-secondary)] mt-2">
            你的方案已啟用，現在可以開始備考了。
          </p>
          {orderId && (
            <p className="text-xs text-[var(--text-muted)] mt-2">訂單編號：{orderId}</p>
          )}
        </div>

        <div className="flex items-center gap-2 justify-center text-[var(--gold)]">
          <NurslixIcon size={16} />
          <span className="font-semibold">Nurslix</span>
        </div>

        <div className="flex flex-col gap-3">
          <Button fullWidth variant="gold" onClick={() => router.push("/nclex")}>
            開始練習
          </Button>
          <Button fullWidth variant="ghost" onClick={() => router.push("/")}>
            返回首頁
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
