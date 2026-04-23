/**
 * Nurslix Journal theme manager.
 *
 * The Journal design ships with six preset palettes plus a live "mixing table"
 * that lets users tweak any color. All tokens live on `--j-*` CSS custom
 * properties on <html>; rewriting them cascades through every component.
 *
 * Persistence uses two keys:
 *   - `nj.theme.preset`  — preset id or "custom"
 *   - `nj.theme`         — JSON blob of individual overrides (only written when
 *                          the user picks a color in the mixing table)
 */

export type JournalThemeTokens = {
  bg: string;
  bgDeep: string;
  bgCard: string;
  bgInset: string;
  ink: string;
  inkDim: string;
  inkMuted: string;
  phosphor: string;
  marker: string;
  hand: string;
};

export type JournalPreset = {
  id: string;
  name: string;
  subtitle: string;
  t: JournalThemeTokens;
};

export const JOURNAL_DEFAULTS: JournalThemeTokens = {
  bg: "#f3efe4",
  bgDeep: "#ebe6d6",
  bgCard: "#f8f5ec",
  bgInset: "#e4dfcf",
  ink: "#1a1d1b",
  inkDim: "#6a6a5e",
  inkMuted: "#9a968a",
  phosphor: "#2d7a3e",
  marker: "rgba(255,235,90,0.45)",
  hand: "#2d7a3e",
};

export const JOURNAL_PRESETS: JournalPreset[] = [
  {
    id: "spring",
    name: "Spring",
    subtitle: "米白 · 螢光綠",
    t: JOURNAL_DEFAULTS,
  },
  {
    id: "night",
    name: "Deep Night",
    subtitle: "黑紙 · 螢光綠",
    t: {
      bg: "#15181a", bgDeep: "#0f1113", bgCard: "#1e2224", bgInset: "#0b0d0f",
      ink: "#ece7d8", inkDim: "#9a968a", inkMuted: "#6a6a5e",
      phosphor: "#4ad06a", marker: "rgba(255,235,90,0.18)", hand: "#4ad06a",
    },
  },
  {
    id: "autumn",
    name: "Autumn",
    subtitle: "羊皮紙 · 酒紅",
    t: {
      bg: "#f0e6d2", bgDeep: "#e5d9bf", bgCard: "#f6eed8", bgInset: "#dccfb0",
      ink: "#2b1d17", inkDim: "#6d5749", inkMuted: "#9f8b7a",
      phosphor: "#a83b2b", marker: "rgba(255,200,80,0.45)", hand: "#a83b2b",
    },
  },
  {
    id: "winter",
    name: "Winter",
    subtitle: "冷灰 · 鋼藍",
    t: {
      bg: "#eef1f3", bgDeep: "#e1e6ea", bgCard: "#f5f7f9", bgInset: "#d8dde2",
      ink: "#161a1f", inkDim: "#5a636c", inkMuted: "#8a929a",
      phosphor: "#2a58a0", marker: "rgba(120,190,255,0.35)", hand: "#2a58a0",
    },
  },
  {
    id: "summer",
    name: "Summer",
    subtitle: "純白 · 珊瑚橘",
    t: {
      bg: "#fafaf7", bgDeep: "#f0efe8", bgCard: "#ffffff", bgInset: "#e8e7df",
      ink: "#1f1a16", inkDim: "#6c6458", inkMuted: "#9f978a",
      phosphor: "#e2553a", marker: "rgba(255,210,130,0.45)", hand: "#e2553a",
    },
  },
  {
    id: "nurse",
    name: "Nurse Pink",
    subtitle: "護理粉 · 暖灰",
    t: {
      bg: "#f5ecea", bgDeep: "#ebdfdc", bgCard: "#faf2f1", bgInset: "#e5d6d2",
      ink: "#2b2320", inkDim: "#6f605c", inkMuted: "#a09190",
      phosphor: "#b8546a", marker: "rgba(255,185,200,0.45)", hand: "#b8546a",
    },
  },
];

const TOKEN_KEYS: (keyof JournalThemeTokens)[] = [
  "bg", "bgDeep", "bgCard", "bgInset", "ink", "inkDim", "inkMuted",
  "phosphor", "marker", "hand",
];

function cssVarName(k: keyof JournalThemeTokens): string {
  // bgDeep → --j-bg-deep
  return "--j-" + k.replace(/([A-Z])/g, "-$1").toLowerCase();
}

/** Apply a full token set to document.documentElement. */
export function applyJournalTheme(t: Partial<JournalThemeTokens>): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  TOKEN_KEYS.forEach((k) => {
    const v = t[k];
    if (v) root.style.setProperty(cssVarName(k), v);
  });
  // derived lines
  if (t.ink) {
    const rgb = hexToRgb(t.ink);
    if (rgb) {
      root.style.setProperty("--j-line", `rgba(${rgb.join(",")},0.15)`);
      root.style.setProperty("--j-line-strong", `rgba(${rgb.join(",")},0.42)`);
    }
  }
  if (t.phosphor) {
    const rgb = hexToRgb(t.phosphor);
    if (rgb) {
      root.style.setProperty("--j-phosphor-soft", `rgba(${rgb.join(",")},0.10)`);
      root.style.setProperty("--j-phosphor-line", `rgba(${rgb.join(",")},0.40)`);
    }
  }
}

export function applyPreset(presetId: string): void {
  if (typeof document === "undefined") return;
  const preset = JOURNAL_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  document.documentElement.setAttribute("data-journal-theme", presetId);
  // clear any per-token custom overrides so preset shows through cleanly
  TOKEN_KEYS.forEach((k) => document.documentElement.style.removeProperty(cssVarName(k)));
  document.documentElement.style.removeProperty("--j-line");
  document.documentElement.style.removeProperty("--j-line-strong");
  document.documentElement.style.removeProperty("--j-phosphor-soft");
  document.documentElement.style.removeProperty("--j-phosphor-line");
  try {
    localStorage.setItem("nj.theme.preset", presetId);
    localStorage.removeItem("nj.theme");
  } catch { /* quota / private mode */ }
}

export function saveCustomTheme(t: JournalThemeTokens): void {
  try {
    localStorage.setItem("nj.theme", JSON.stringify(t));
    localStorage.setItem("nj.theme.preset", "custom");
  } catch { /* quota */ }
}

export function loadJournalTheme(): JournalThemeTokens {
  if (typeof window === "undefined") return { ...JOURNAL_DEFAULTS };
  try {
    const raw = localStorage.getItem("nj.theme");
    if (raw) return { ...JOURNAL_DEFAULTS, ...JSON.parse(raw) };
    const presetId = localStorage.getItem("nj.theme.preset");
    const preset = JOURNAL_PRESETS.find((p) => p.id === presetId);
    if (preset) return { ...preset.t };
  } catch { /* ignore */ }
  return { ...JOURNAL_DEFAULTS };
}

export function loadActivePresetId(): string {
  if (typeof window === "undefined") return "spring";
  try {
    return localStorage.getItem("nj.theme.preset") || "spring";
  } catch {
    return "spring";
  }
}

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function toHex(c: string): string {
  if (!c) return "#000000";
  if (c.startsWith("#")) {
    if (c.length === 4) return "#" + c.slice(1).split("").map((x) => x + x).join("");
    return c.slice(0, 7);
  }
  const m = c.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return "#" + [m[1], m[2], m[3]].map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
  return "#000000";
}
