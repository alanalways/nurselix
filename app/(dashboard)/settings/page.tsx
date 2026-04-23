"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Bell, CalendarDays, User, Shield, LogOut, CreditCard, Zap, AlertCircle } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useThemeStore } from "@/store/themeStore";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, fontSize, setTheme, setFontSize } = useThemeStore();
  const [dailyGoal, setDailyGoal] = useState(10);
  const [notification, setNotification] = useState(true);
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const plan = (session?.user as any)?.plan ?? "FREE";
  const isPaid = plan !== "FREE";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/user/me");
        if (!res.ok) {
          if (alive) setLoadError("無法載入個人資料，部分欄位可能為預設值");
          return;
        }
        const u = await res.json();
        if (!alive) return;
        if (u.subscriptionEndsAt) setSubscriptionEndsAt(u.subscriptionEndsAt);
        if (u.trialEndsAt) setTrialEndsAt(u.trialEndsAt);
        if (u.settings?.dailyGoal) setDailyGoal(u.settings.dailyGoal);
        if (u.examDate) setExamDate(u.examDate.slice(0, 10));
      } catch (err) {
        console.warn("[settings] load user failed:", err);
        if (alive) setLoadError("無法載入個人資料，部分欄位可能為預設值");
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleCancelSubscription = async () => {
    if (!confirm(`確定要取消 ${plan} 訂閱嗎？到期前仍可繼續使用所有功能。`)) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/user/subscription/cancel", { method: "POST" });
      const body = await res.json();
      if (!res.ok) { setCancelError(body.error ?? "取消失敗"); return; }
      setCancelDone(true);
    } catch {
      setCancelError("網路錯誤，請稍後重試");
    } finally {
      setCancelling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Save user-level settings and profile (examDate) in parallel.
      const [settingsRes, profileRes] = await Promise.all([
        fetch("/api/user/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dailyGoal, notification, theme, fontSize }),
        }),
        fetch("/api/user/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examDate: examDate || null }),
        }),
      ]);
      if (!settingsRes.ok || !profileRes.ok) {
        const failed = !settingsRes.ok ? settingsRes : profileRes;
        const body = await failed.json().catch(() => ({}));
        setSaveError(body.error ?? "儲存失敗，請重試");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("網路錯誤，請稍後重試");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  const initials = session?.user?.name
    ? session.user.name.slice(0, 1).toUpperCase()
    : "護";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-2xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">設定</h1>

      {loadError && (
        <div className="rounded-xl border border-[var(--warning)] bg-[rgba(243,156,18,0.1)] px-4 py-2.5 text-sm text-[var(--warning)] flex items-center gap-2">
          <AlertCircle size={14} />
          {loadError}
        </div>
      )}

      {/* Profile */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User size={16} className="text-[var(--gold)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">個人資料</h2>
        </div>
        <div className="flex items-center gap-4">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center text-2xl font-bold text-[#080E1A]">
              {initials}
            </div>
          )}
          <div>
            <div className="font-semibold text-[var(--text-primary)]">
              {session?.user?.name || "用戶"}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {session?.user?.email || ""}
            </div>
          </div>
        </div>
      </section>

      {/* Display */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-5">
        <h2 className="font-semibold text-[var(--text-primary)]">顯示設定</h2>

        {/* Theme */}
        <div>
          <label className="text-sm text-[var(--text-secondary)] block mb-2">介面主題</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-colors ${
                theme === "dark" ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"
              }`}
            >
              <Moon size={16} /> 深色
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-colors ${
                theme === "light" ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"
              }`}
            >
              <Sun size={16} /> 淺色
            </button>
          </div>
        </div>

        {/* Font size */}
        <div>
          <label className="text-sm text-[var(--text-secondary)] block mb-2">字體大小</label>
          <div className="flex gap-2">
            {(["small", "medium", "large"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
                  fontSize === s ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"
                }`}
              >
                {s === "small" ? "小" : s === "medium" ? "中" : "大"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Learning */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-5">
        <h2 className="font-semibold text-[var(--text-primary)]">學習設定</h2>

        {/* Daily Goal */}
        <div>
          <label className="text-sm text-[var(--text-secondary)] block mb-2">每日答題目標</label>
          <div className="flex gap-2">
            {[10, 20, 30, 50].map((n) => (
              <button
                key={n}
                onClick={() => setDailyGoal(n)}
                className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
                  dailyGoal === n ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"
                }`}
              >
                {n} 題
              </button>
            ))}
          </div>
        </div>

        {/* Exam Date */}
        <div>
          <label className="text-sm text-[var(--text-secondary)] block mb-2 flex items-center gap-2">
            <CalendarDays size={14} className="text-[var(--gold)]" />
            考試預定日期
          </label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--gold)] transition-colors"
          />
        </div>

        {/* Notification */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
              <Bell size={14} className="text-[var(--gold)]" />
              學習提醒通知
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">每天早上 08:00 發送提醒</div>
          </div>
          <button
            onClick={() => setNotification(!notification)}
            className={`relative w-12 h-6 rounded-full transition-colors ${notification ? "bg-[var(--gold)]" : "bg-[var(--bg-overlay)]"}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notification ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>
      </section>

      {/* Subscription Management */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-[var(--gold)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">方案管理</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[var(--text-secondary)]">目前方案</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-semibold text-[var(--text-primary)]">{plan}</span>
              <Badge variant={plan === "ELITE" ? "elite" : plan === "PRO" ? "gold" : plan === "BASIC" ? "blue" : "muted"}>
                {plan}
              </Badge>
            </div>
          </div>
          {!isPaid && (
            <Link href="/pricing">
              <Button size="sm" variant="gold">
                <Zap size={14} /> 升級方案
              </Button>
            </Link>
          )}
        </div>

        {isPaid && (subscriptionEndsAt || trialEndsAt) && (
          <div className="bg-[var(--bg-elevated)] rounded-xl p-4 space-y-1">
            <div className="text-xs text-[var(--text-muted)]">
              {subscriptionEndsAt ? "訂閱到期日" : "試用到期日"}
            </div>
            <div className="font-semibold text-[var(--text-primary)]">
              {new Date(subscriptionEndsAt ?? trialEndsAt!).toLocaleDateString("zh-TW", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              到期後自動降級為 Free 方案，不會自動扣款
            </div>
          </div>
        )}

        {cancelError && (
          <div className="flex items-center gap-2 text-sm text-[var(--error)] bg-[rgba(231,76,60,0.10)] rounded-lg px-3 py-2">
            <AlertCircle size={14} /> {cancelError}
          </div>
        )}

        {cancelDone ? (
          <div className="text-sm text-[var(--success)] bg-[rgba(46,204,113,0.10)] rounded-lg px-3 py-2">
            ✓ 訂閱已取消，到期前仍可使用所有功能。取消確認信已寄送至你的信箱。
          </div>
        ) : isPaid && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">取消訂閱</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">取消後到期前仍可繼續使用</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              loading={cancelling}
              onClick={handleCancelSubscription}
              className="text-[var(--error)] hover:text-[var(--error)] border border-[var(--error)] hover:bg-[rgba(231,76,60,0.10)]"
            >
              取消訂閱
            </Button>
          </div>
        )}

        {!isPaid && (
          <p className="text-xs text-[var(--text-muted)]">免費方案無需取消，隨時可升級。</p>
        )}
      </section>

      {/* Account */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-[var(--blue)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">帳號安全</h2>
        </div>
        <button className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors block">更改密碼</button>
        <button className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors block">連結 Google 帳號</button>
      </section>

      {saveError && (
        <p className="text-sm text-[var(--error)] text-center">{saveError}</p>
      )}
      <div className="flex gap-3">
        <Button fullWidth loading={saving} onClick={handleSave}>
          {saved ? "已儲存 ✓" : "儲存設定"}
        </Button>
        <Button
          variant="ghost"
          loading={loggingOut}
          onClick={handleLogout}
          className="flex items-center gap-2 text-[var(--error)] hover:text-[var(--error)]"
        >
          <LogOut size={16} /> 登出
        </Button>
      </div>
    </motion.div>
  );
}
