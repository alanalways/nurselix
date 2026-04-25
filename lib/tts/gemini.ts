/**
 * Gemini TTS service — calls the Generative Language REST API to turn
 * a text script into 16-bit PCM audio (single or multi-speaker).
 *
 * Uses the same key rotation as the question-generation pipeline
 * (GEMINI_API_KEY_1..10 + GEMINI_API_KEY).
 */

import { getApiKeys } from "@/lib/generateBatch";
import { pcmToWav, estimateDurationSec } from "./wav";

export type GeminiVoice =
  | "Zephyr" | "Puck" | "Charon" | "Kore" | "Fenrir" | "Leda"
  | "Orus" | "Aoede" | "Callirhoe" | "Autonoe" | "Enceladus" | "Iapetus"
  | "Umbriel" | "Algieba" | "Despina" | "Erinome" | "Algenib" | "Rasalgethi"
  | "Laomedeia" | "Achernar" | "Alnilam" | "Schedar" | "Gacrux" | "Pulcherrima"
  | "Achird" | "Zubenelgenubi" | "Vindemiatrix" | "Sadachbia" | "Sadaltager" | "Sulafat";

export const TTS_MODEL_DEFAULT = "gemini-2.5-flash-preview-tts";

interface SingleSpeakerInput {
  script: string;
  voice: GeminiVoice;
  model?: string;
}

interface MultiSpeakerInput {
  script: string;                          // "Joe: Hi\nJane: Hello"
  speakers: { name: string; voice: GeminiVoice }[];   // up to 2
  model?: string;
}

export interface TtsResult {
  wav: Buffer;
  durationSec: number;
  voicesUsed: string[];
  modelUsed: string;
  sampleRate: number;
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
  error?: { message?: string };
}

async function callTts(model: string, body: object): Promise<{ pcm: Buffer; sampleRate: number }> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("未設定 Gemini API Key（GEMINI_API_KEY 或 GEMINI_API_KEY_1..10）");
  }

  let lastError: Error | null = null;
  // Round-robin start position, then walk through every available key.
  const start = Math.floor(Math.random() * keys.length);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(start + i) % keys.length];
    try {
      const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as GeminiResponse;
      if (!res.ok) {
        const msg = json?.error?.message ?? `HTTP ${res.status}`;
        // Retry on rate-limit / transient errors with the next key.
        if (res.status === 429 || res.status >= 500) {
          lastError = new Error(`Key ${i + 1}: ${msg}`);
          continue;
        }
        throw new Error(msg);
      }

      const part = json?.candidates?.[0]?.content?.parts?.[0];
      const b64 = part?.inlineData?.data;
      if (!b64) {
        lastError = new Error("Gemini did not return audio bytes");
        continue;
      }
      const mime = part?.inlineData?.mimeType ?? "audio/L16;rate=24000";
      const sampleRate = parseSampleRate(mime);
      const pcm = Buffer.from(b64, "base64");
      return { pcm, sampleRate };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("All Gemini API keys failed");
}

function parseSampleRate(mime: string): number {
  // e.g. "audio/L16;codec=pcm;rate=24000"
  const m = /rate=(\d+)/.exec(mime);
  return m ? parseInt(m[1], 10) : 24000;
}

export async function generateSingleSpeaker(input: SingleSpeakerInput): Promise<TtsResult> {
  const model = input.model ?? TTS_MODEL_DEFAULT;
  const body = {
    contents: [{ parts: [{ text: input.script }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: input.voice },
        },
      },
    },
  };
  const { pcm, sampleRate } = await callTts(model, body);
  return {
    wav: pcmToWav(pcm, sampleRate),
    durationSec: estimateDurationSec(pcm.length, sampleRate),
    voicesUsed: [input.voice],
    modelUsed: model,
    sampleRate,
  };
}

export async function generateMultiSpeaker(input: MultiSpeakerInput): Promise<TtsResult> {
  if (input.speakers.length < 1 || input.speakers.length > 2) {
    throw new Error("Gemini TTS supports 1–2 speakers per request");
  }
  const model = input.model ?? TTS_MODEL_DEFAULT;
  const body = {
    contents: [{ parts: [{ text: input.script }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: input.speakers.map((s) => ({
            speaker: s.name,
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: s.voice },
            },
          })),
        },
      },
    },
  };
  const { pcm, sampleRate } = await callTts(model, body);
  return {
    wav: pcmToWav(pcm, sampleRate),
    durationSec: estimateDurationSec(pcm.length, sampleRate),
    voicesUsed: input.speakers.map((s) => s.voice),
    modelUsed: model,
    sampleRate,
  };
}

/**
 * Auto-detects single vs multi-speaker from a script's "Name:" markers.
 * Up to 2 distinct speakers → multi; otherwise → single (uses first voice).
 */
export async function generateAuto(opts: {
  script: string;
  defaultVoice?: GeminiVoice;
  voiceMap?: Record<string, GeminiVoice>;
  model?: string;
}): Promise<TtsResult> {
  const speakers = detectSpeakers(opts.script);
  const defaultVoice: GeminiVoice = opts.defaultVoice ?? "Kore";
  const voiceMap = opts.voiceMap ?? {};

  if (speakers.length >= 2) {
    const fallbacks: GeminiVoice[] = ["Kore", "Puck"];
    const picks = speakers.slice(0, 2).map((name, i) => ({
      name,
      voice: (voiceMap[name] ?? fallbacks[i]) as GeminiVoice,
    }));
    return generateMultiSpeaker({ script: opts.script, speakers: picks, model: opts.model });
  }

  return generateSingleSpeaker({
    script: opts.script,
    voice: speakers[0] ? (voiceMap[speakers[0]] ?? defaultVoice) : defaultVoice,
    model: opts.model,
  });
}

function detectSpeakers(script: string): string[] {
  const re = /^([A-Za-z][A-Za-z0-9_ ]{0,15}):/gm;
  const seen: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(script)) !== null) {
    const name = m[1].trim();
    if (!seen.includes(name)) seen.push(name);
  }
  return seen;
}
