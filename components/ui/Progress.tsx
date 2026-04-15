"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface ProgressProps {
  value: number; // 0-100
  max?: number;
  className?: string;
  color?: "gold" | "blue" | "success" | "error";
  showLabel?: boolean;
  label?: string;
  size?: "sm" | "md";
}

const colorMap = {
  gold: "from-[var(--gold)] to-[var(--gold-light)]",
  blue: "from-[var(--blue)] to-[#6BB8FF]",
  success: "from-[var(--success)] to-[#5DDE92]",
  error: "from-[var(--error)] to-[#FF7A6B]",
};

export default function Progress({
  value,
  max = 100,
  className,
  color = "gold",
  showLabel,
  label,
  size = "md",
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-[var(--bg-overlay)] overflow-hidden",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", colorMap[color])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
