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

function applyToDOM(theme: "dark" | "light", fontSize: "small" | "medium" | "large") {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-fontsize", fontSize);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      fontSize: "medium",
      setTheme: (theme) => {
        set({ theme });
        applyToDOM(theme, get().fontSize);
      },
      setFontSize: (fontSize) => {
        set({ fontSize });
        applyToDOM(get().theme, fontSize);
      },
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },
    }),
    {
      name: "nurslix-theme",
      // After Zustand rehydrates from localStorage, immediately apply to DOM
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        applyToDOM(state.theme, state.fontSize);
      },
    }
  )
);
