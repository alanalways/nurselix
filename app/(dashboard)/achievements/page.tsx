"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import AchievementBadge from "@/components/achievements/AchievementBadge";

interface AchievementItem {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

interface AchievementsData {
  total: number;
  earnedCount: number;
  items: AchievementItem[];
}

/** Lucide-icon-name -> emoji fallback so the UI always shows something pretty. */
const ICON_TO_EMOJI: Record<string, string> = {
  flame: "🔥",
  pill: "💊",
  zap: "⚡",
  sparkles: "✨",
  trophy: "🏆",
  crown: "👑",
  compass: "🧭",
  award: "🥇",
  star: "⭐",
};

function iconOf(icon: string): string {
  if (ICON_TO_EMOJI[icon]) return ICON_TO_EMOJI[icon];
  if (icon.length <= 2) return icon; // already an emoji
  return "🏅";
}

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/achievements", { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!data) return <div className="p-6 text-[var(--error)]">載入失敗</div>;

  const unlocked = data.items.filter((a) => a.earned);
  const locked = data.items.filter((a) => !a.earned);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">成就</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          已解鎖 <span className="text-[var(--gold)] font-semibold">{data.earnedCount}</span> / {data.total} 個成就
        </p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[var(--text-secondary)]">成就進度</span>
          <span className="text-[var(--gold)] font-semibold">{data.earnedCount}/{data.total}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)]"
            initial={{ width: 0 }}
            animate={{ width: `${data.total > 0 ? (data.earnedCount / data.total) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {unlocked.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">已解鎖 🏅</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlocked.map((a) => (
              <AchievementBadge
                key={a.id}
                icon={iconOf(a.icon)}
                name={a.name}
                description={a.description}
                earnedAt={a.earnedAt ? new Date(a.earnedAt).toLocaleDateString("zh-TW") : undefined}
                locked={false}
              />
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-muted)] mb-3">尚未解鎖</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {locked.map((a) => (
              <AchievementBadge
                key={a.id}
                icon={iconOf(a.icon)}
                name={a.name}
                description={a.description}
                locked={true}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
