/**
 * Wrap Gemini 2.5 Flash with the google_search grounding tool.
 *
 * Streams text tokens via an async iterator and resolves grounding
 * metadata (cited URLs) when the stream completes.
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

export interface GeminiTurn {
  systemPrompt: string;
  messages: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
}

export interface CitedUrl {
  url: string;
  title?: string;
}

export async function* streamGeminiResponse(turn: GeminiTurn): AsyncGenerator<
  | { kind: "text"; text: string }
  | { kind: "done"; citedUrls: CitedUrl[]; modelUsed: string; durationMs: number },
  void,
  unknown
> {
  const start = Date.now();
  const apiKey = pickKey();
  const client = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.HERMES_MODEL ?? "gemini-2.5-flash";
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: turn.systemPrompt,
    tools: [{ googleSearch: {} } as never],
  });

  const result = await model.generateContentStream({ contents: turn.messages });
  let citedUrls: CitedUrl[] = [];

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield { kind: "text", text };
  }
  const final = await result.response;
  const grounding = (final as { groundingMetadata?: unknown }).groundingMetadata as
    | { groundingChunks?: Array<{ web?: { uri: string; title?: string } }> }
    | undefined;
  if (grounding?.groundingChunks) {
    citedUrls = grounding.groundingChunks
      .map((c) => c.web)
      .filter((w): w is { uri: string; title?: string } => !!w?.uri)
      .map((w) => ({ url: w.uri, title: w.title }));
  }

  yield { kind: "done", citedUrls, modelUsed: modelName, durationMs: Date.now() - start };
}
