"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import Button from "@/components/ui/Button";

function FailedContent() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason");

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-10 text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(231,76,60,0.15)] flex items-center justify-center">
            <XCircle size={36} className="text-[var(--error)]" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">付款未完成</h1>
          <p className="text-[var(--text-secondary)] mt-2">
            {reason === "cancel"
              ? "你已取消付款，若要訂閱可隨時再試。"
              : "付款過程中發生問題，若已扣款請聯繫我們。"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button fullWidth variant="gold" onClick={() => router.push("/pricing")}>
            返回方案頁
          </Button>
          <Button fullWidth variant="ghost" onClick={() => router.push("/")}>
            返回首頁
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense>
      <FailedContent />
    </Suspense>
  );
}
