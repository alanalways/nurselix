"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, hover, glow, onClick }: CardProps) {
  const base = cn(
    "rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5",
    glow && "glow-gold",
    onClick && "cursor-pointer",
    className
  );

  if (hover) {
    return (
      <motion.div
        className={base}
        whileHover={{ y: -4, boxShadow: "var(--glow-gold)", borderColor: "var(--gold)" }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={base} onClick={onClick}>
      {children}
    </div>
  );
}
