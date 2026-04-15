"use client";

import { motion } from "framer-motion";
import AchievementBadge from "@/components/achievements/AchievementBadge";

const achievements = [
  { icon: "🔥", name: "連續 3 天", description: "連續 3 天完成每日目標", earnedAt: "2026/01/15", locked: false },
  { icon: "🔥", name: "連續 7 天", description: "連續 7 天完成每日目標", earnedAt: "2026/01/21", locked: false },
  { icon: "🔥", name: "連續 30 天", description: "連續 30 天完成每日目標", locked: true },
  { icon: "🔥", name: "連續 100 天", description: "連續 100 天完成每日目標", locked: true },
  { icon: "💊", name: "藥理達人", description: "藥理 Domain 答對率超過 80%", locked: true },
  { icon: "⚡", name: "速度之星", description: "平均每題答題時間少於 30 秒", earnedAt: "2026/01/18", locked: false },
  { icon: "✨", name: "完美主義", description: "某次練習全部答對（10 題以上）", locked: true },
  { icon: "🎯", name: "百題勇者", description: "累計完成 100 道題目", earnedAt: "2026/01/12", locked: false },
  { icon: "🏆", name: "千題傳奇", description: "累計完成 1,000 道題目", locked: true },
  { icon: "📚", name: "全科通才", description: "八大 Domain 各答對率超過 60%", locked: true },
  { icon: "🌟", name: "初次評估", description: "完成初始能力評估", earnedAt: "2026/01/10", locked: false },
  { icon: "🎉", name: "首次 Pass", description: "在 Mock 考試中首次通過", locked: true },
];

const unlocked = achievements.filter(a => !a.locked);
const locked = achievements.filter(a => a.locked);

export default function AchievementsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">成就</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          已解鎖 <span className="text-[var(--gold)] font-semibold">{unlocked.length}</span> / {achievements.length} 個成就
        </p>
      </div>

      {/* Progress */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[var(--text-secondary)]">成就進度</span>
          <span className="text-[var(--gold)] font-semibold">{unlocked.length}/{achievements.length}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)]"
            initial={{ width: 0 }}
            animate={{ width: `${(unlocked.length / achievements.length) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">已解鎖 🏅</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlocked.map((a) => (
              <AchievementBadge key={a.name} {...a} />
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-muted)] mb-3">尚未解鎖</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {locked.map((a) => (
            <AchievementBadge key={a.name} {...a} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
