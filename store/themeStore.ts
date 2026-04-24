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
  // Journal theme system owns data-journal-theme; we only sync font size here.
  // Setting data-theme="dark" would leak night-mode --j-line values into
  // light presets (autumn/winter/summer/nurse) when both attributes coexist.
  // The pre-paint inline script in layout.tsx restores data-journal-theme from
  // nj.theme.preset before first paint, so we don't need to do it here.
  document.documentElement.setAttribute("data-fontsize", fontSize);
  // Keep data-theme in sync for legacy CSS selectors ([data-theme="dark"]).
  document.documentElement.setAttribute("data-theme", theme);
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
