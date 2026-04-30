/**
 * Model Registry — central definition of which model each agent task uses,
 * with fallback chain. Re-tested 2026-04-30 against actual NIM availability
 * via scripts/bench-nim-models.mjs (4 workloads × 7 candidates).
 *
 * Fallback strategy: try primary → fallback1 → fallback2 → throw
 *
 * 2026-04-30 benchmark results (all 4 workloads = simple/tools/zh-json/strict-json):
 *   ✓ deepseek-v3.1-terminus  4/4 14.6s  ← most consistent, no rate-limits
 *   ✓ minimax-m2.5            4/4 12.4s  (fastest but emits <think> reasoning)
 *   ✓ deepseek-v4-flash       4/4 18.1s  (zh-json slower at 7.5s)
 *   ⚠ deepseek-v4-pro         2/4       (HTTP 429 rate-limit on later calls)
 *   ⚠ minimax-m2.7            2/4       (empty content on simple+strict-json)
 *   ✗ deepseek-v3.2           0/4       (every workload hit 60s timeout)
 *   ✗ deepseek-coder-6.7b     0/4       (404 — chat completions unsupported)
 *   ✗ moonshotai/kimi-k2.5    410 Gone  (EOL'd late April)
 *
 * Free tier daily caps (with 10 keys rotation):
 * - gemini-3-flash-preview: ~200-1000/day total
 * - gemini-3.1-flash-lite-preview: ~10,000/day total
 */

export type AgentTask =
  | "quality.verify" // 題庫品質審查（最嚴肅，需要 reasoning）
  | "quality.repair" // 修補建議
  | "quality.health-report" // 每日健康度報告
  | "report.triage" // 使用者回報判讀
  | "marketing.seo" // SEO 文章
  | "marketing.social" // 社群短文
  | "marketing.email" // EDM
  | "marketing.analytics"; // 使用者行為分析

export type ProviderId = "nvidia" | "gemini";

export interface ModelOption {
  provider: ProviderId;
  /** Exact model ID for the provider's API. */
  modelId: string;
  /** Avg latency observed in last bench (ms). null = untested. */
  avgLatencyMs?: number | null;
  /** Notes for ops staff. */
  notes?: string;
}

export interface AgentModelConfig {
  task: AgentTask;
  primary: ModelOption;
  fallbacks: ModelOption[];
}

// ---------- Verified working NIM models (benchmark 2026-04-30) ----------

const NIM = {
  // ⭐ Best all-rounder for quality + ops: 4/4 pass, no 429s, balanced 2-5s/call
  v31Terminus: {
    provider: "nvidia" as const,
    modelId: "deepseek-ai/deepseek-v3.1-terminus",
    avgLatencyMs: 3650,
    notes: "Bench 2026-04-30: 4/4 pass, total 14.6s, zh-json 3.2s, tools 4.7s, no rate-limits.",
  },
  // ⭐ Fastest all-rounder, but content has <think> prefix (need to strip in caller)
  minimaxM25: {
    provider: "nvidia" as const,
    modelId: "minimaxai/minimax-m2.5",
    avgLatencyMs: 3100,
    notes: "Bench 2026-04-30: 4/4 pass, total 12.4s. Note: content prefixed with <think>...</think> reasoning block — strip if you need clean output.",
  },
  // Backup all-rounder, slightly slower on zh-json
  v4Flash: {
    provider: "nvidia" as const,
    modelId: "deepseek-ai/deepseek-v4-flash",
    avgLatencyMs: 4500,
    notes: "Bench 2026-04-30: 4/4 pass, total 18.1s, zh-json 7.5s.",
  },
  // For audit-worker only — strongest reasoning when latency is OK
  v4Pro: {
    provider: "nvidia" as const,
    modelId: "deepseek-ai/deepseek-v4-pro",
    avgLatencyMs: 5800,
    notes: "Bench 2026-04-30: passed simple+tools but hit HTTP 429 on later calls. Use ONLY in audit-worker (which has retry+back-off). Do NOT use for HTTP cron.",
  },
};

const GEMINI = {
  flash3Preview: { provider: "gemini" as const, modelId: "gemini-3-flash-preview", avgLatencyMs: null,
    notes: "Free tier ~20-100/day per key. With 10 keys: ~200-1000/day." },
  flashLite31Preview: { provider: "gemini" as const, modelId: "gemini-3.1-flash-lite-preview", avgLatencyMs: null,
    notes: "Free tier ~1000/day per key. With 10 keys: ~10,000/day." },
  flash25: { provider: "gemini" as const, modelId: "gemini-2.5-flash", avgLatencyMs: null,
    notes: "Stable fallback. ~250/day per key." },
};

// ---------- Agent configurations (informed by 2026-04-30 bench) ----------
//
// Strategy:
//   - quality.verify (the strictest reasoning task) gets v3.1-terminus primary
//     because its 4/4 with no rate-limits. v4-flash as fallback.
//   - quality.repair / triage need similar reasoning — same chain.
//   - marketing tasks generate Chinese long-form content — minimax-m2.5 is the
//     fastest 4/4 in our test and has good Asian-language quality, but its
//     <think> prefix needs stripping (caller responsibility).
//   - health-report is summarisation — v3.1-terminus is plenty.

export const AGENT_MODELS: Record<AgentTask, AgentModelConfig> = {
  "quality.verify": {
    task: "quality.verify",
    primary: NIM.v31Terminus,
    fallbacks: [NIM.v4Flash, GEMINI.flash3Preview, GEMINI.flashLite31Preview],
  },
  "quality.repair": {
    task: "quality.repair",
    primary: NIM.v31Terminus,
    fallbacks: [NIM.v4Flash, GEMINI.flash3Preview, GEMINI.flashLite31Preview],
  },
  "quality.health-report": {
    task: "quality.health-report",
    primary: NIM.v31Terminus,
    fallbacks: [GEMINI.flashLite31Preview, GEMINI.flash25],
  },
  "report.triage": {
    task: "report.triage",
    primary: NIM.v31Terminus,
    fallbacks: [NIM.v4Flash, GEMINI.flash3Preview, GEMINI.flashLite31Preview],
  },
  "marketing.seo": {
    task: "marketing.seo",
    primary: NIM.minimaxM25,
    fallbacks: [NIM.v31Terminus, GEMINI.flashLite31Preview],
  },
  "marketing.social": {
    task: "marketing.social",
    primary: NIM.minimaxM25,
    fallbacks: [NIM.v31Terminus, GEMINI.flashLite31Preview, GEMINI.flash25],
  },
  "marketing.email": {
    task: "marketing.email",
    primary: NIM.minimaxM25,
    fallbacks: [NIM.v31Terminus, GEMINI.flashLite31Preview, GEMINI.flash25],
  },
  "marketing.analytics": {
    task: "marketing.analytics",
    primary: NIM.v31Terminus,
    fallbacks: [NIM.v4Flash, GEMINI.flash3Preview],
  },
};

export function getAgentConfig(task: AgentTask): AgentModelConfig {
  const cfg = AGENT_MODELS[task];
  if (!cfg) throw new Error(`Unknown agent task: ${task}`);
  return cfg;
}

/** Get all candidate models for a task in order (primary → fallbacks). */
export function getModelChain(task: AgentTask): ModelOption[] {
  const cfg = getAgentConfig(task);
  return [cfg.primary, ...cfg.fallbacks];
}
