"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">編輯題目 #{params.id}</h1>
      </div>
      <div className="text-center py-16 text-[var(--text-muted)]">
        <p className="mb-4">載入題目中...</p>
        <Button variant="ghost" onClick={() => router.push("/admin/questions/new")}>
          使用新增表單作為參考
        </Button>
      </div>
    </motion.div>
  );
}
