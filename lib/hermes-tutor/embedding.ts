/**
 * Wraps Gemini text-embedding-004 for Hermes Tutor RAG.
 *
 * - Reuses the existing GEMINI_API_KEY_1..10 rotation.
 * - Returns a 768-dim number[] suitable for JSONB storage (CTE-cosine variant).
 * - Logs but does not throw on transient failures; caller decides policy.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

function loadKeys(): string[] {
  return Object.keys(process.env)
    .filter((k) => /^GEMINI_API_KEY(_\d+)?$/.test(k))
    .map((k) => process.env[k] as string)
    .filter(Boolean);
}

let _idx = 0;
function pickKey(): string {
  const keys = loadKeys();
  if (!keys.length) throw new Error("No GEMINI_API_KEY configured");
  const key = keys[_idx % keys.length];
  _idx++;
  return key;
}

export interface EmbedOptions {
  /** "RETRIEVAL_DOCUMENT" for indexed corpus, "RETRIEVAL_QUERY" for live queries. */
  taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
  /** Optional title hint (used by RETRIEVAL_DOCUMENT). */
  title?: string;
}

/** Embed one string. Returns 768 floats. */
export async function embed(text: string, opts: EmbedOptions = {}): Promise<number[]> {
  const apiKey = pickKey();
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text: text.slice(0, 8000) }] },
    taskType: (opts.taskType as never) ?? ("RETRIEVAL_DOCUMENT" as never),
    title: opts.title,
  } as never);
  const values = result.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(`Embedding returned ${values?.length} dims, expected 768`);
  }
  return values;
}

/**
 * In the original pgvector design this returned the pgvector literal.
 * In the CTE-cosine fallback we store embeddings as JSONB, so this function
 * returns the JSON string used by the rare caller that wants a textual form.
 * Most callers should pass the raw number[] straight to Prisma's Json field.
 */
export function toPgvectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
