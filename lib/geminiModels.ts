/**
 * Client-safe Gemini model constants.
 * NO server-only imports here — this file is used by both client components
 * and server code.
 *
 * Free-tier RPD (requests per day per API key) based on Google AI docs:
 *   gemini-3.x preview : ~1,500 RPD  (preview models have generous free quota)
 *   gemini-2.5-pro     :    100 RPD
 *   gemini-2.5-flash   :     20 RPD  (reduced Dec 2025)
 *   gemini-2.5-flash-lite: 1,000 RPD
 */

export interface GeminiModelInfo {
  id: string;
  label: string;
  series: string;
  rpdPerKey: number;
  note: string;
}

// Ordered by user-specified priority: 3.1 → 3.0 → 2.5-pro → 2.5-flash → 2.5-flash-lite
export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: "gemini-3.1-pro-preview",
    label: "3.1 Pro Preview",
    series: "3.1",
    rpdPerKey: 1500,
    note: "最新 3.1 Pro，1,500 RPD/key",
  },
  {
    id: "gemini-3.1-flash-lite-preview",
    label: "3.1 Flash Lite Preview",
    series: "3.1",
    rpdPerKey: 1500,
    note: "3.1 Flash Lite，1,500 RPD/key",
  },
  {
    id: "gemini-3-flash-preview",
    label: "3 Flash Preview",
    series: "3.0",
    rpdPerKey: 1500,
    note: "3.0 Flash，1,500 RPD/key",
  },
  {
    id: "gemini-2.5-pro",
    label: "2.5 Pro",
    series: "2.5",
    rpdPerKey: 100,
    note: "最高品質，100 RPD/key",
  },
  {
    id: "gemini-2.5-flash",
    label: "2.5 Flash",
    series: "2.5",
    rpdPerKey: 20,
    note: "20 RPD/key（Dec 2025 調降後）",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "2.5 Flash Lite",
    series: "2.5",
    rpdPerKey: 1000,
    note: "1,000 RPD/key，速度最快",
  },
];

/** Ordered model IDs for auto-fallback (first = highest priority) */
export const MODEL_PRIORITY: string[] = GEMINI_MODELS.map((m) => m.id);

/** Free-tier RPD per API key, keyed by model ID */
export const MODEL_RPD: Record<string, number> = Object.fromEntries(
  GEMINI_MODELS.map((m) => [m.id, m.rpdPerKey])
);
