"use client";

import { useState, useEffect, useCallback } from "react";

export type BilingualMode = "en" | "zh" | "both";

const STORAGE_KEY = "nurslix-bilingual-mode";
const DEFAULT: BilingualMode = "both";

/**
 * Cross-question bilingual display preference.
 *
 * Persists to localStorage so the user's choice survives page reloads and
 * question changes within a session. Default is "both" — the new positioning
 * is "English reading bridge", so the most useful default is showing both
 * languages side-by-side until the user is fluent enough to switch to "en"
 * only.
 *
 * Returns `[mode, setMode, ready]`. `ready` is false on the first render
 * before localStorage has been read (SSR-safe), so consumers can avoid a
 * flash of incorrect content by gating display on it.
 */
export function useBilingualMode(): [BilingualMode, (m: BilingualMode) => void, boolean] {
  const [mode, setModeState] = useState<BilingualMode>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh" || stored === "both") {
      setModeState(stored);
    }
    setReady(true);
  }, []);

  const setMode = useCallback((m: BilingualMode) => {
    setModeState(m);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, m);
    }
  }, []);

  return [mode, setMode, ready];
}

export function shouldShowEn(mode: BilingualMode): boolean {
  return mode !== "zh";
}

export function shouldShowZh(mode: BilingualMode): boolean {
  return mode !== "en";
}
