/**
 * Ops Agent Gemini client — reuses the existing key rotation from generateBatch.
 * Picks the first available key and uses gemini-2.5-flash for agent reasoning
 * (supports function calling required by LangGraph tool nodes).
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getApiKeys } from "@/lib/generateBatch";

export const OPS_MODEL = process.env.OPS_MODEL ?? "gemini-2.5-flash";

let _keyIndex = 0;

/** Round-robin pick from available Gemini API keys. */
export function pickGeminiKey(): string {
  const keys = getApiKeys();
  if (!keys.length) throw new Error("No Gemini API keys configured (GEMINI_API_KEY or GEMINI_API_KEY_1..10)");
  const key = keys[_keyIndex % keys.length];
  _keyIndex++;
  return key;
}

/** Create a ChatGoogleGenerativeAI instance for one agent invocation. */
export function createOpsLLM(opts?: { temperature?: number }) {
  return new ChatGoogleGenerativeAI({
    model: OPS_MODEL,
    apiKey: pickGeminiKey(),
    temperature: opts?.temperature ?? 0.3,
    maxRetries: 2,
  });
}
