"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface OptionButtonProps {
  label: string;
  text: string;
  state?: "default" | "selected" | "correct" | "incorrect";
  disabled?: boolean;
  onClick?: () => void;
}

export default function OptionButton({ label, text, state = "default", disabled, onClick }: OptionButtonProps) {
  const stateClass = {
    default: "",
    selected: "selected",
    correct: "correct",
    incorrect: "incorrect",
  }[state];

  const labelBg = {
    default: "bg-[var(--bg-overlay)] text-[var(--text-muted)]",
    selected: "bg-[var(--gold)] text-[#080E1A]",
    correct: "bg-[var(--success)] text-white",
    incorrect: "bg-[var(--error)] text-white",
  }[state];

  return (
    <motion.button
      className={cn("option-button", stateClass)}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.99 }}
      layout
    >
      {/* Label badge — scales with font */}
      <span
        className={cn("w-7 h-7 rounded-lg font-bold flex items-center justify-center flex-shrink-0 transition-colors", labelBg)}
        style={{ fontSize: "calc(0.75rem * var(--font-scale))" }}
      >
        {label}
      </span>
      {/* Option text — scales with font */}
      <span
        className="leading-relaxed font-sora"
        style={{ fontSize: "calc(0.9375rem * var(--font-scale))" }}
      >
        {text}
      </span>
    </motion.button>
  );
}
