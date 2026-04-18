"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User, AlertCircle } from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 fields
  const [examDate, setExamDate] = useState("");
  const [dailyGoal, setDailyGoal] = useState(10);
  const [nursingStatus, setNursingStatus] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number | "">("");

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    if (password.length < 8) {
      setError("密碼至少需要 8 個字元");
      return;
    }
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, email, password,
        examDate: examDate || undefined,
        dailyGoal,
        nursingStatus: nursingStatus || undefined,
        specialty: specialty || undefined,
        yearsOfExperience: typeof yearsOfExperience === "number" ? yearsOfExperience : undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "註冊失敗，請稍後再試");
      setLoading(false);
      return;
    }

    // Auto sign-in after successful registration
    await signIn("credentials", { email, password, callbackUrl: "/" });
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
            <NurslixIconSquare size={24} className="text-[#080E1A]" />
          </div>
          <span className="text-2xl font-bold text-gradient-gold">Nurslix</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">建立帳號</h1>
          <Badge variant="success">7天 Pro 免費試用</Badge>
        </div>
        <p className="text-[var(--text-secondary)] mb-6">加入 Nurslix，開始你的 NCLEX 備考之旅</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s ? "bg-[var(--gold)] text-[#080E1A]" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              }`}>
                {step > s ? "✓" : s}
              </div>
              {s < 2 && <div className={`h-px transition-colors ${step > s ? "bg-[var(--gold)]" : "bg-[var(--border-subtle)]"}`} style={{ width: 40 }} />}
            </div>
          ))}
          <span className="text-xs text-[var(--text-muted)] ml-2">
            {step === 1 ? "基本資料" : "設定偏好"}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--gold)] transition-colors mb-4 disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? "連接中..." : "使用 Google 帳號快速註冊"}
            </button>

            <div className="relative flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[var(--border-subtle)]" />
              <span className="text-xs text-[var(--text-muted)]">或</span>
              <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            </div>

            <form onSubmit={handleStep1} className="space-y-4">
              <Input
                label="姓名（顯示名稱）"
                placeholder="護理師小明"
                icon={<User size={16} />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="電子郵件"
                type="email"
                placeholder="your@email.com"
                icon={<Mail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="密碼"
                type="password"
                placeholder="至少 8 個字元"
                icon={<Lock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="確認密碼"
                type="password"
                placeholder="再次輸入密碼"
                icon={<Lock size={16} />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button variant="gold" fullWidth type="submit">
                下一步
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
                目前身份
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["護生", "RN", "LPN", "NP", "轉職中", "其他"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNursingStatus(s)}
                    className={`py-2 rounded-xl border text-sm transition-colors ${
                      nursingStatus === s
                        ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                        : "border-[var(--border-default)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
                主要科別（選填）
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--gold)] transition-colors"
              >
                <option value="">不指定</option>
                <option value="ICU">加護病房 (ICU)</option>
                <option value="ER">急診 (ER)</option>
                <option value="Med-Surg">內外科 (Med-Surg)</option>
                <option value="Pediatrics">兒科 (Pediatrics)</option>
                <option value="OB">婦產 (OB/L&D)</option>
                <option value="OR">手術室 (OR/PACU)</option>
                <option value="Psych">精神科 (Psych)</option>
                <option value="Oncology">腫瘤科 (Oncology)</option>
                <option value="LTC">長照 (LTC)</option>
                <option value="Public Health">公衛 / 居家護理</option>
                <option value="Student">在學中</option>
                <option value="Other">其他</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
                年資（選填）
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 3, 5, 10, 15].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setYearsOfExperience(n)}
                    className={`py-2 rounded-xl border text-sm transition-colors ${
                      yearsOfExperience === n
                        ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                        : "border-[var(--border-default)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {n === 0 ? "無" : n === 15 ? "15+" : `${n}年`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
                考試預定日期（選填）
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--gold)] transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
                每日答題目標
              </label>
              <div className="flex gap-2">
                {[10, 20, 30, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDailyGoal(n)}
                    className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
                      dailyGoal === n
                        ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                        : "border-[var(--border-default)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {n} 題
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" type="button" onClick={() => setStep(1)} className="flex-1">
                上一步
              </Button>
              <Button variant="gold" fullWidth loading={loading} type="submit" className="flex-1">
                完成註冊
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          已有帳號？{" "}
          <Link href="/login" className="text-[var(--gold)] hover:underline font-medium">
            立即登入
          </Link>
        </p>

        <p className="text-center text-xs text-[var(--text-muted)] mt-8">
          註冊即表示您同意我們的{" "}
          <Link href="/terms" className="text-[var(--gold)] hover:underline">服務條款</Link>
          {" "}與{" "}
          <Link href="/privacy" className="text-[var(--gold)] hover:underline">隱私權政策</Link>
        </p>
      </motion.div>
    </div>
  );
}
