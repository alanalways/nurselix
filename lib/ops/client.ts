/**
 * Ops Agent LLM client — supports two providers with env-var auto-detection:
 *
 *   1. NVIDIA NIM (OpenAI-compatible) — preferred when NVIDIA_NIM_API_KEY is set.
 *      Default model: zai-org/glm-4.5-air (GLM 4.5 Air, supports function calling).
 *      Override via OPS_MODEL env var, e.g. "zai-org/glm-4.6", "deepseek-ai/deepseek-v3",
 *      "meta/llama-3.3-70b-instruct", etc.
 *
 *   2. Google Gemini (via @langchain/google-genai) — fallback when NVIDIA key is
 *      not present. Reuses the existing GEMINI_API_KEY_1..10 rotation.
 *      Default model: gemini-2.5-flash.
 *
 * To switch providers, just set/unset NVIDIA_NIM_API_KEY in env.
 * To pin a specific model, set OPS_MODEL.
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getApiKeys } from "@/lib/generateBatch";

export type OpsProvider = "nvidia" | "gemini";

export const OPS_PROVIDER: OpsProvider = process.env.NVIDIA_NIM_API_KEY ? "nvidia" : "gemini";

const DEFAULT_MODELS: Record<OpsProvider, string> = {
  nvidia: "z-ai/glm-5.1",
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

  // 60s timeout per LLM call, 1 retry. Rationale: ops cron has a 5min Zeabur
  // budget per request and CTO+PM+COO+CEO each may make 4-6 tool-call rounds
  // (LLM → tool → LLM). With the old maxRetries=2 + no explicit timeout, a
  // single hung call could eat 3min and starve the next agent. 60s × (1+1)
  // = 120s worst case per LLM call, leaving ~3min for the rest of the chain.
  if (OPS_PROVIDER === "nvidia") {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_NIM_API_KEY is required when OPS_PROVIDER=nvidia");
    return new ChatOpenAI({
      model: OPS_MODEL,
      apiKey,
      configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
      temperature,
      maxRetries: 1,
      timeout: 60_000,
    });
  }

  return new ChatGoogleGenerativeAI({
    model: OPS_MODEL,
    apiKey: pickGeminiKey(),
    temperature,
    maxRetries: 1,
  });
}
