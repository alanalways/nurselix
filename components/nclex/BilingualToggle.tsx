"use client";

import { Languages } from "lucide-react";
import type { BilingualMode } from "./useBilingualMode";

interface Props {
  mode: BilingualMode;
  onChange: (m: BilingualMode) => void;
  size?: "sm" | "md";
}

const OPTIONS: { value: BilingualMode; label: string; title: string }[] = [
  { value: "en",   label: "EN",     title: "只顯示英文（練閱讀）" },
  { value: "both", label: "中/EN",  title: "中英對照（推薦）" },
  { value: "zh",   label: "中",     title: "只顯示中文（先理解內容）" },
];

export default function BilingualToggle({ mode, onChange, size = "sm" }: Props) {
  const padding = size === "sm" ? "px-2 py-0.5" : "px-3 py-1";
  const iconSize = size === "sm" ? 12 : 14;
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <div
      className="inline-flex items-center gap-0.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-0.5"
      role="radiogroup"
      aria-label="語言顯示模式"
    >
      <Languages size={iconSize} className="text-[var(--text-muted)] ml-1 mr-0.5" />
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={mode === opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={`${padding} ${textSize} rounded font-medium transition-colors ${
            mode === opt.value
              ? "bg-[var(--gold)] text-[#080E1A]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
