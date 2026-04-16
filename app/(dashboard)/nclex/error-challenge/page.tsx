"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ErrorChallengePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">錯題挑戰</h1>
        <p className="text-[var(--text-secondary)] mt-1">SM-2 間隔複習演算法，精準攻克你的弱點</p>
      </div>

      {/* No Review Items */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(46,204,113,0.15)] flex items-center justify-center">
          <CheckCircle size={28} className="text-[var(--success)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)] text-lg">今日無待複習題目</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">先去練習題目，錯題會自動加入複習清單</p>
        </div>
      </div>

      {/* SM-2 Info */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4 flex gap-3">
        <RefreshCw size={16} className="text-[var(--blue)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-secondary)]">
          SM-2 間隔複習：答對後自動延長複習間隔（1天→6天→指數增長），
          錯了就重置，確保你真正記住每一道題。
        </p>
      </div>

      <Button fullWidth size="lg" disabled>
        <AlertTriangle size={16} /> 今日無待複習（0 題）
      </Button>
    </motion.div>
  );
}
