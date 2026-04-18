"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function ResetPasswordInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const email = search.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const tokenMissing = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("密碼至少需要 8 個字元");
      return;
    }
    if (password !== confirm) {
      setError("兩次輸入的密碼不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "重設失敗，請重新申請");
        setLoading(false);
        return;
      }

      setDone(true);
      setLoading(false);
      setTimeout(() => router.push("/login"), 2500);
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

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">設定新密碼</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          {email ? (
            <>請為 <span className="text-[var(--text-primary)]">{email}</span> 設定新密碼。</>
          ) : (
            "請設定新密碼。"
          )}
        </p>

        {tokenMissing && (
          <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 p-4 mb-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-[var(--error)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">連結無效</p>
                <p className="text-[var(--text-secondary)]">
                  缺少必要參數。請從電子郵件中的連結點擊進入，或重新申請密碼重設。
                </p>
              </div>
            </div>
          </div>
        )}

        {error && !tokenMissing && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {done ? (
          <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-[var(--success)] flex-shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p className="font-semibold text-[var(--text-primary)] mb-1">密碼已成功重設</p>
                <p className="text-[var(--text-secondary)]">即將為你跳轉到登入頁…</p>
              </div>
            </div>
          </div>
        ) : (
          !tokenMissing && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="新密碼"
                type="password"
                placeholder="至少 8 個字元"
                icon={<Lock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="確認新密碼"
                type="password"
                placeholder="再次輸入密碼"
                icon={<Lock size={16} />}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <Button variant="gold" fullWidth loading={loading} type="submit">
                重設密碼
              </Button>
            </form>
          )
        )}

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          <Link href="/login" className="text-[var(--gold)] hover:underline">
            返回登入
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-base)]" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
