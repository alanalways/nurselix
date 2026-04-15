"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

export default function IeltsPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[rgba(46,204,113,0.15)] to-[var(--blue-dim)] border border-[var(--success)] flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🌍</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">IELTS 模組</h1>
          <Badge variant="success">即將推出</Badge>
        </div>

        <p className="text-[var(--text-secondary)] mb-2 leading-relaxed">
          IELTS 醫護英語專項練習模組正在開發中。
          針對護理師移民英語能力需求，提供口說、閱讀、寫作練習。
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          預計與 TOEIC 模組同步推出
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
          <div className="bg-[rgba(46,204,113,0.12)] border border-[var(--success)] rounded-xl p-4">
            <p className="text-[var(--success)] font-semibold">✓ 已訂閱！上線時我們會通知你</p>
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
