"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface AchievementBadgeProps {
  icon: string;
  name: string;
  description: string;
  earnedAt?: string;
  locked?: boolean;
}

export default function AchievementBadge({ icon, name, description, earnedAt, locked }: AchievementBadgeProps) {
  return (
    <motion.div
      whileHover={locked ? {} : { y: -3, boxShadow: "var(--glow-gold)" }}
      className={cn(
        "rounded-xl border p-4 flex items-start gap-3 transition-all",
        locked
          ? "border-[var(--border-subtle)] bg-[var(--bg-elevated)] opacity-40 grayscale"
          : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--gold)]"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0",
        locked ? "bg-[var(--bg-overlay)]" : "bg-[var(--gold-dim)]"
      )}>
        {locked ? "🔒" : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[var(--text-primary)] text-sm">{name}</div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{description}</div>
        {earnedAt && !locked && (
          <div className="text-xs text-[var(--gold)] mt-1">✓ {earnedAt} 解鎖</div>
        )}
      </div>
    </motion.div>
  );
}
