import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-journal-theme="night"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Journal stack — serif editorial display + mono labels + handwriting
        display: ["'Instrument Serif'", "'Noto Serif TC'", "Georgia", "serif"],
        serif: ["'Noto Serif TC'", "'Source Han Serif TC'", "serif"],
        mono: ["'JetBrains Mono'", "'IBM Plex Mono'", "'SF Mono'", "Menlo", "monospace"],
        hand: ["'Caveat'", "'Kalam'", "cursive"],
        // Legacy aliases — keep existing className usages working
        sora: ["'Instrument Serif'", "'Noto Serif TC'", "serif"],
        "noto-serif": ["'Noto Serif TC'", "serif"],
        "noto-sans": ["'Noto Serif TC'", "serif"],
      },
      colors: {
        // Journal tokens
        paper:      "var(--j-bg)",
        "paper-deep": "var(--j-bg-deep)",
        "paper-card": "var(--j-bg-card)",
        "paper-inset": "var(--j-bg-inset)",
        ink:        "var(--j-ink)",
        "ink-dim":  "var(--j-ink-dim)",
        "ink-muted":"var(--j-ink-muted)",
        phosphor:   "var(--j-phosphor)",
        marker:     "var(--j-marker)",
        hand:       "var(--j-hand)",
        // Legacy aliases — mapped onto the Journal palette
        "bg-base":     "var(--j-bg)",
        "bg-surface":  "var(--j-bg-card)",
        "bg-elevated": "var(--j-bg-deep)",
        "bg-overlay":  "var(--j-bg-inset)",
        gold:          "var(--j-phosphor)",
        "gold-light":  "var(--j-phosphor)",
        "text-primary":   "var(--j-ink)",
        "text-secondary": "var(--j-ink-dim)",
        "text-muted":     "var(--j-ink-muted)",
        success:       "var(--success)",
        error:         "var(--error)",
        warning:       "var(--warning)",
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
