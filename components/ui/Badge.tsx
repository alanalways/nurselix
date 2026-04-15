"use client";

import { cn } from "@/lib/utils/cn";

type BadgeVariant = "gold" | "blue" | "success" | "error" | "warning" | "muted" | "pro" | "elite";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  gold: "bg-[var(--gold-dim)] text-[var(--gold)] border border-[var(--gold)]",
  blue: "bg-[var(--blue-dim)] text-[var(--blue)] border border-[var(--blue)]",
  success: "bg-[rgba(46,204,113,0.15)] text-[var(--success)] border border-[var(--success)]",
  error: "bg-[rgba(231,76,60,0.15)] text-[var(--error)] border border-[var(--error)]",
  warning: "bg-[rgba(243,156,18,0.15)] text-[var(--warning)] border border-[var(--warning)]",
  muted: "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-default)]",
  pro: "bg-gradient-to-r from-[var(--gold-dim)] to-[var(--blue-dim)] text-[var(--gold)] border border-[var(--gold)]",
  elite: "bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A]",
};

export default function Badge({ children, variant = "muted", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
