/**
 * Unified agent runner with automatic fallback chain.
 *
 * Use this for any "non-Hermes" agent task. Hermes uses Anthropic Haiku 4.5
 * via lib/ai/claude.ts and is unaffected.
 *
 * Calls primary → falls back to next on TIMEOUT/error → throws if all fail.
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getModelChain, type AgentTask, type ModelOption } from "./modelRegistry";
import { getApiKeys } from "@/lib/generateBatch";

let _geminiKeyIdx = 0;
function pickGeminiKey(): string {
  const keys = getApiKeys();
  if (!keys.length) throw new Error("No Gemini API keys configured");
  const key = keys[_geminiKeyIdx % keys.length];
  _geminiKeyIdx++;
  return key;
}

function buildLLM(opt: ModelOption, temperature: number, timeoutMs: number): BaseChatModel {
  if (opt.provider === "nvidia") {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_NIM_API_KEY not set");
    return new ChatOpenAI({
      model: opt.modelId,
      apiKey,
      configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
      temperature,
      maxRetries: 1, // we handle our own fallback
      timeout: timeoutMs,
    });
  }
  return new ChatGoogleGenerativeAI({
    model: opt.modelId,
    apiKey: pickGeminiKey(),
    temperature,
    maxRetries: 1,
  });
}

export interface RunAgentOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  /** Timeout per attempt (ms). Default 60s. */
  timeoutMs?: number;
}

export interface RunAgentResult {
  text: string;
  modelUsed: string;
  providerUsed: string;
  attempts: { modelId: string; ok: boolean; ms: number; error?: string }[];
  totalMs: number;
}

/**
 * Run an agent task with automatic fallback chain.
 *
 * Example:
 *   const r = await runAgent("quality.verify", {
 *     systemPrompt: "You are a NCLEX nurse expert. Output JSON only.",
 *     userPrompt: JSON.stringify(question),
 *     temperature: 0.2,
 *   });
 */
export async function runAgent(
  task: AgentTask,
  options: RunAgentOptions
): Promise<RunAgentResult> {
  const chain = getModelChain(task);
  const temperature = options.temperature ?? 0.3;
  const timeoutMs = options.timeoutMs ?? 60_000;

  const messages = [
    ...(options.systemPrompt ? [{ role: "system" as const, content: options.systemPrompt }] : []),
    { role: "user" as const, content: options.userPrompt },
  ];

  const attempts: RunAgentResult["attempts"] = [];
  const startAll = Date.now();

  for (const opt of chain) {
    const start = Date.now();
    try {
      const llm = buildLLM(opt, temperature, timeoutMs);
      const res = await llm.invoke(messages);
      const text = typeof res.content === "string"
        ? res.content
        : Array.isArray(res.content)
          ? res.content.map((c: any) => c.text || "").join("")
          : "";
      const ms = Date.now() - start;
      attempts.push({ modelId: opt.modelId, ok: true, ms });
      return {
        text,
        modelUsed: opt.modelId,
        providerUsed: opt.provider,
        attempts,
        totalMs: Date.now() - startAll,
      };
    } catch (e: any) {
      const ms = Date.now() - start;
      attempts.push({ modelId: opt.modelId, ok: false, ms, error: e.message || String(e) });
      // continue to next fallback
    }
  }

  throw new Error(
    `All models failed for task ${task}. Attempts: ${JSON.stringify(attempts, null, 2)}`
  );
}

/**
 * JSON-only convenience wrapper. Forces strict JSON output and parses it.
 */
export async function runAgentJSON<T = any>(
  task: AgentTask,
  options: RunAgentOptions
): Promise<{ data: T } & Omit<RunAgentResult, "text">> {
  const enriched = {
    ...options,
    userPrompt: options.userPrompt + "\n\n請只輸出 JSON，不要包 markdown code block。",
  };
  const result = await runAgent(task, enriched);
  // Strip code fences if model added them despite instruction
  let text = result.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n/, "").replace(/\n```\s*$/, "");
  }
  let data: T;
  try {
    data = JSON.parse(text);
  } catch (e: any) {
    throw new Error(`Agent ${task} returned non-JSON: ${text.slice(0, 200)}`);
  }
  return { data, modelUsed: result.modelUsed, providerUsed: result.providerUsed, attempts: result.attempts, totalMs: result.totalMs };
}
