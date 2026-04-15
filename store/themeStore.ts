"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  theme: "dark" | "light";
  fontSize: "small" | "medium" | "large";
  setTheme: (theme: "dark" | "light") => void;
  setFontSize: (size: "small" | "medium" | "large") => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      fontSize: "medium",
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", theme);
        }
      },
      setFontSize: (fontSize) => {
        set({ fontSize });
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-fontsize", fontSize);
        }
      },
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },
    }),
    { name: "nurslix-theme" }
  )
);
