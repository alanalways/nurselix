"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "送出失敗，請稍後再試");
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError("網路錯誤，請稍後再試");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
            <NurslixIconSquare size={24} className="text-[#080E1A]" />
          </div>
          <span className="text-2xl font-bold text-gradient-gold">Nurslix</span>
        </div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">忘記密碼</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          輸入註冊時的電子郵件，我們會寄送重設密碼連結給你。
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {sent ? (
          <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-5 mb-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-[var(--success)] flex-shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p className="font-semibold text-[var(--text-primary)] mb-1">重設信件已送出</p>
                <p className="text-[var(--text-secondary)]">
                  如果 <span className="text-[var(--text-primary)]">{email}</span> 已註冊 Nurslix，你會在幾分鐘內收到重設連結。連結有效期為 1 小時。
                </p>
                <p className="text-[var(--text-muted)] mt-2 text-xs">
                  收不到信？請檢查垃圾信件匣，或確認電子郵件拼寫無誤。
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="電子郵件"
              type="email"
              placeholder="your@email.com"
              icon={<Mail size={16} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button variant="gold" fullWidth loading={loading} type="submit">
              寄送重設連結
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors"
        >
          <ArrowLeft size={14} />
          返回登入
        </Link>
      </motion.div>
    </div>
  );
}
