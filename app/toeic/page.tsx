"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

export default function ToeicPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--blue-dim)] to-[var(--gold-dim)] border border-[var(--blue)] flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">📝</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">TOEIC 模組</h1>
          <Badge variant="blue">即將推出</Badge>
        </div>

        <p className="text-[var(--text-secondary)] mb-2 leading-relaxed">
          TOEIC 閱讀與聽力練習模組正在開發中。
          我們將提供針對醫護人員的 TOEIC 備考題庫。
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          預計與 IELTS 模組同步推出
        </p>

        {!subscribed ? (
          <div className="space-y-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="your@email.com"
              icon={<Mail size={16} />}
              label="訂閱上線通知"
            />
            <Button
              fullWidth
              disabled={!email}
              onClick={() => setSubscribed(true)}
            >
              搶先收到上線通知
            </Button>
          </div>
        ) : (
          <div className="bg-[var(--gold-dim)] border border-[var(--gold)] rounded-xl p-4">
            <p className="text-[var(--gold)] font-semibold">✓ 已訂閱！上線時我們會通知你</p>
          </div>
        )}

        <div className="mt-8">
          <a href="/" className="text-sm text-[var(--gold)] hover:underline">
            ← 回到 NCLEX 備考
          </a>
        </div>
      </motion.div>
    </div>
  );
}
