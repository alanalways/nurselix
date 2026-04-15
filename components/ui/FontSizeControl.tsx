"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils/cn";

type FontSize = "small" | "medium" | "large";

const sizes: { key: FontSize; label: string }[] = [
  { key: "small", label: "小" },
  { key: "medium", label: "中" },
  { key: "large", label: "大" },
];

export default function FontSizeControl() {
  const { fontSize, setFontSize } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-fontsize", fontSize);
  }, [fontSize]);

  return (
    <div className="flex items-center gap-1 bg-[var(--bg-elevated)] rounded-lg p-1">
      {sizes.map((s) => (
        <button
          key={s.key}
          onClick={() => setFontSize(s.key)}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150",
            fontSize === s.key
              ? "bg-[var(--gold-dim)] text-[var(--gold)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
