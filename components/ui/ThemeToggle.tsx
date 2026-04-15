"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full flex items-center justify-center
        bg-[var(--bg-elevated)] border border-[var(--border-default)]
        text-[var(--text-secondary)] hover:text-[var(--gold)] hover:border-[var(--gold)]
        transition-colors duration-150"
      aria-label="切換主題"
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </motion.div>
    </motion.button>
  );
}
