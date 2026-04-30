/**
 * Ops Agent LLM client — supports two providers with env-var auto-detection:
 *
 *   1. NVIDIA NIM (OpenAI-compatible) — preferred when NVIDIA_NIM_API_KEY is set.
 *      Default model: meta/llama-3.3-70b-instruct (~0.76s/call, supports
 *      function calling). Verified live on NIM catalog 2026-04-30.
 *
 *   2. Google Gemini (via @langchain/google-genai) — fallback when NVIDIA key is
 *      not present. Reuses the existing GEMINI_API_KEY_1..10 rotation.
 *      Default model: gemini-2.5-flash.
 *
 * To switch providers, just set/unset NVIDIA_NIM_API_KEY in env.
 * To pin a specific model, set OPS_MODEL (must exist on NIM catalog —
 * z-ai/glm-5.1 was 19s/call so was retired).
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getApiKeys } from "@/lib/generateBatch";

export type OpsProvider = "nvidia" | "gemini";

export const OPS_PROVIDER: OpsProvider = process.env.NVIDIA_NIM_API_KEY ? "nvidia" : "gemini";

// Benchmarked live on NIM 2026-04-30 (4 workloads × 7 models):
//   ✓ deepseek-v3.1-terminus  4/4 14.6s  ← chosen for ops (most consistent)
//   ✓ minimax-m2.5            4/4 12.4s  (faster but emits <think> reasoning)
//   ✓ deepseek-v4-flash       4/4 18.1s
//   ⚠ deepseek-v4-pro         2/4 (HTTP 429 rate-limit on later calls)
//   ⚠ minimax-m2.7            2/4 (empty content on simple+strict-json)
//   ✗ deepseek-v3.2           0/4 (every workload 60s timeout)
//   ✗ deepseek-coder-6.7b     0/4 (404 — chat completions not supported)
// Ops Team needs reliable multi-round tool-calling more than raw speed,
// so we pick the most consistent model rather than the fastest.
const DEFAULT_MODELS: Record<OpsProvider, string> = {
  nvidia: "deepseek-ai/deepseek-v3.1-terminus",
  gemini: "gemini-2.5-flash",
};

export const OPS_MODEL = process.env.OPS_MODEL ?? DEFAULT_MODELS[OPS_PROVIDER];

// ─── Gemini key rotation (unchanged) ──────────────────────────────────────────

let _keyIndex = 0;

export function pickGeminiKey(): string {
  const keys = getApiKeys();
  if (!keys.length) throw new Error("No Gemini API keys configured (GEMINI_API_KEY or GEMINI_API_KEY_1..10)");
  const key = keys[_keyIndex % keys.length];
  _keyIndex++;
  return key;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Create a chat model instance for one agent invocation. */
export function createOpsLLM(opts?: { temperature?: number }): BaseChatModel {
  const temperature = opts?.temperature ?? 0.3;

  // 180s per LLM call (matching audit-worker's NIM timeout — DeepSeek V4 Pro
  // can take 30-60s on cold starts, occasionally more). maxRetries=0 because
  // agentLoop already wraps every invoke in Promise.race with the wall-clock
  // budget; retries here would just stack against that budget.
  if (OPS_PROVIDER === "nvidia") {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_NIM_API_KEY is required when OPS_PROVIDER=nvidia");
    return new ChatOpenAI({
      model: OPS_MODEL,
      apiKey,
      configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
      temperature,
      maxRetries: 0,
      timeout: 180_000,
    });
  }

  return new ChatGoogleGenerativeAI({
    model: OPS_MODEL,
    apiKey: pickGeminiKey(),
    temperature,
    maxRetries: 1,
  });
}
