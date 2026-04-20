/**
 * Client-safe Gemini model constants — NO server-only imports.
 *
 * RPM / RPD values are per API key, read directly from Google AI Studio
 * rate-limit dashboard (aistudio.google.com/rate-limit).
 *
 * Models with RPD = 0 on the free tier are excluded.
 * Effective daily quota with 10 rotating keys = RPD × 10.
 */

export interface GeminiModelInfo {
  id: string;
  label: string;
  series: string;
  rpmPerKey: number;
  rpdPerKey: number;
  note: string;
}

// Ordered by priority: 3.1 series first (highest RPD), then by RPM desc
export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: "gemini-3.1-flash-lite-preview",
    label: "3.1 Flash Lite",
    series: "3.1",
    rpmPerKey: 15,
    rpdPerKey: 500,
    note: "最高配額，500 RPD/key · 15 RPM/key",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "2.5 Flash Lite",
    series: "2.5",
    rpmPerKey: 10,
    rpdPerKey: 20,
    note: "20 RPD/key · 10 RPM/key",
  },
  {
    id: "gemini-3-flash-preview",
    label: "3 Flash Preview",
    series: "3.0",
    rpmPerKey: 5,
    rpdPerKey: 20,
    note: "20 RPD/key · 5 RPM/key",
  },
  {
    id: "gemini-2.5-flash",
    label: "2.5 Flash",
    series: "2.5",
    rpmPerKey: 5,
    rpdPerKey: 20,
    note: "20 RPD/key · 5 RPM/key",
  },
];

/** Ordered model IDs for auto-fallback (first = highest priority) */
export const MODEL_PRIORITY: string[] = GEMINI_MODELS.map((m) => m.id);

/** Free-tier RPD per API key, keyed by model ID */
export const MODEL_RPD: Record<string, number> = Object.fromEntries(
  GEMINI_MODELS.map((m) => [m.id, m.rpdPerKey])
);
