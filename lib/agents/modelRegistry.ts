/**
 * Model Registry — central definition of which model each agent task uses,
 * with fallback chain. Tested 2026-04-27 against actual NIM availability.
 *
 * Fallback strategy: try main → fallback1 → fallback2 → throw
 *
 * Why these models:
 * - DeepSeek-V4-Pro: fastest tested (5.8s), 1M context, best for quality reasoning
 * - Kimi-K2.5: multimodal (can read screenshots in reports), 256K context
 * - MiniMax-M2.7: cheap & fast for content generation
 * - Gemini 3.x: free tier fallback (anthropic NOT used here — kept for Hermes only)
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
  /** Avg latency seen in 2026-04-27 test (ms). null = untested. */
  avgLatencyMs?: number | null;
  /** Notes for ops staff. */
  notes?: string;
}

export interface AgentModelConfig {
  task: AgentTask;
  primary: ModelOption;
  fallbacks: ModelOption[];
}

// ---------- Verified working models on NIM (2026-04-27 test) ----------

const NIM = {
  deepseekV4Pro: { provider: "nvidia" as const, modelId: "deepseek-ai/deepseek-v4-pro", avgLatencyMs: 5800,
    notes: "Tested OK: 5.8s, 1M ctx. Best reasoning available." },
  kimiK25: { provider: "nvidia" as const, modelId: "moonshotai/kimi-k2.5", avgLatencyMs: 17600,
    notes: "Tested OK: 17.6s, 256K ctx, multimodal." },
  minimaxM27: { provider: "nvidia" as const, modelId: "minimaxai/minimax-m2.7", avgLatencyMs: 27600,
    notes: "Tested OK: 27.6s, 200K ctx. Cheap; slower than expected." },
};

const GEMINI = {
  flash3Preview: { provider: "gemini" as const, modelId: "gemini-3-flash-preview", avgLatencyMs: null,
    notes: "Free tier ~20-100/day per key. With 10 keys: ~200-1000/day." },
  flashLite31Preview: { provider: "gemini" as const, modelId: "gemini-3.1-flash-lite-preview", avgLatencyMs: null,
    notes: "Free tier ~1000/day per key. With 10 keys: ~10,000/day." },
  flash25: { provider: "gemini" as const, modelId: "gemini-2.5-flash", avgLatencyMs: null,
    notes: "Stable fallback. ~250/day per key." },
};

// ---------- Agent configurations ----------

export const AGENT_MODELS: Record<AgentTask, AgentModelConfig> = {
  "quality.verify": {
    task: "quality.verify",
    primary: NIM.deepseekV4Pro,
    fallbacks: [NIM.kimiK25, GEMINI.flash3Preview, GEMINI.flashLite31Preview],
  },
  "quality.repair": {
    task: "quality.repair",
    primary: NIM.deepseekV4Pro,
    fallbacks: [GEMINI.flash3Preview, GEMINI.flashLite31Preview],
  },
  "quality.health-report": {
    task: "quality.health-report",
    primary: NIM.minimaxM27,
    fallbacks: [GEMINI.flashLite31Preview, GEMINI.flash25],
  },
  "report.triage": {
    task: "report.triage",
    primary: NIM.kimiK25,
    fallbacks: [NIM.deepseekV4Pro, GEMINI.flash3Preview, GEMINI.flashLite31Preview],
  },
  "marketing.seo": {
    task: "marketing.seo",
    primary: NIM.minimaxM27,
    fallbacks: [GEMINI.flashLite31Preview, GEMINI.flash3Preview],
  },
  "marketing.social": {
    task: "marketing.social",
    primary: NIM.minimaxM27,
    fallbacks: [GEMINI.flashLite31Preview, GEMINI.flash25],
  },
  "marketing.email": {
    task: "marketing.email",
    primary: NIM.minimaxM27,
    fallbacks: [GEMINI.flashLite31Preview, GEMINI.flash25],
  },
  "marketing.analytics": {
    task: "marketing.analytics",
    primary: NIM.deepseekV4Pro,
    fallbacks: [NIM.minimaxM27, GEMINI.flash3Preview],
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
