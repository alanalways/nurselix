"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Bell, CalendarDays, User, Shield, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import { useThemeStore } from "@/store/themeStore";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, fontSize, setTheme, setFontSize } = useThemeStore();
  const [dailyGoal, setDailyGoal] = useState(10);
  const [notification, setNotification] = useState(true);
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyGoal, notification, theme, fontSize }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
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

      {/* Account */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-[var(--blue)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">帳號安全</h2>
        </div>
        <button className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors block">更改密碼</button>
        <button className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors block">連結 Google 帳號</button>
      </section>

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
