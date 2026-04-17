"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Stethoscope, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("電子郵件或密碼錯誤，請確認後再試");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-base)]">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto w-full"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
              <Stethoscope size={24} className="text-[#080E1A]" />
            </div>
            <span className="text-3xl font-bold text-gradient-gold">Nurslix</span>
          </div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3 leading-tight">
            台灣護理師<br />NCLEX-RN 備考平台
          </h2>
          <p className="text-[var(--text-secondary)] mb-6 leading-relaxed text-sm">
            Nurslix 是專為想赴美執業的台灣護理師設計的 NCLEX 智能備考平台。結合 IRT 自適應測驗與 Claude AI，精準評估你的實力，找出盲點，用最少時間通過考試。
          </p>

          <div className="mb-6">
            <div className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wider">產品亮點</div>
            <div className="space-y-2.5">
              {[
                { t: "CAT 自適應測驗", d: "IRT 三參數模型，如真實 NCLEX" },
                { t: "Hermes AI 學習分析", d: "Claude Haiku + Sonnet 找出你的弱點" },
                { t: "八大 Domain 能力雷達圖", d: "實時追蹤每個領域的掌握度" },
                { t: "SM-2 錯題間隔複習", d: "科學遺忘曲線，記住就不再錯" },
                { t: "台美臨床差異提示", d: "標註每題在台灣 vs. 美國的做法不同處" },
                { t: "14,500+ 題庫", d: "全英文題幹、繁中解析" },
              ].map((f) => (
                <div key={f.t} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[var(--gold-dim)] flex items-center justify-center text-[var(--gold)] text-xs flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <div className="text-[var(--text-primary)] font-medium">{f.t}</div>
                    <div className="text-xs text-[var(--text-muted)]">{f.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <div className="text-xs text-[var(--gold)] font-semibold mb-1">7 天 Plus 免費試用</div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              註冊即可體驗完整 Plus 方案 7 天，含 CAT、Mock、Hermes AI 分析。無需信用卡。
            </p>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <div className="max-w-md mx-auto w-full mt-8 pt-6 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] leading-relaxed space-y-2">
          <p className="font-semibold text-[var(--text-secondary)]">免責聲明</p>
          <p>
            Nurslix 為教育輔助平台，提供模擬試題與學習分析，<span className="text-[var(--text-secondary)]">不保證通過 NCLEX-RN 考試</span>，通過率因個人努力而異。
          </p>
          <p>
            本站所有臨床情境題目僅為考試練習，<span className="text-[var(--text-secondary)]">不構成任何醫療建議</span>，不得作為實際臨床決策依據。
          </p>
          <p>
            NCLEX-RN® 為美國 NCSBN 的註冊商標，本平台與 NCSBN 無任何官方關係。
          </p>
          <p className="text-[var(--text-muted)]">
            © 2026 Nurslix · <a href="/pricing" className="hover:text-[var(--gold)]">方案</a> · <a href="/terms" className="hover:text-[var(--gold)]">服務條款</a> · <a href="/privacy" className="hover:text-[var(--gold)]">隱私權</a>
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
              <Stethoscope size={20} className="text-[#080E1A]" />
            </div>
            <span className="text-2xl font-bold text-gradient-gold">Nurslix</span>
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">歡迎回來</h1>
          <p className="text-[var(--text-secondary)] mb-8">登入繼續你的備考旅程</p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--gold)] transition-colors mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "連接中..." : "使用 Google 帳號登入"}
          </button>

          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-xs text-[var(--text-muted)]">或</span>
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          </div>

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
            <Input
              label="密碼"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={16} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-[var(--gold)] hover:underline">
                忘記密碼？
              </Link>
            </div>
            <Button variant="gold" fullWidth loading={loading} type="submit">
              登入
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
            還沒有帳號？{" "}
            <Link href="/register" className="text-[var(--gold)] hover:underline font-medium">
              免費註冊
            </Link>
          </p>

          <p className="text-center text-xs text-[var(--text-muted)] mt-6 leading-relaxed">
            登入即表示你同意我們的{" "}
            <Link href="/terms" className="text-[var(--text-secondary)] hover:text-[var(--gold)] underline">服務條款</Link>
            {" 與 "}
            <Link href="/privacy" className="text-[var(--text-secondary)] hover:text-[var(--gold)] underline">隱私權政策</Link>
            。本服務為教育輔助平台，不構成醫療建議。
          </p>
        </motion.div>
      </div>
    </div>
  );
}
