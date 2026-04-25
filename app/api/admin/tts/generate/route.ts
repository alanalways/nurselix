import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { generateAuto, generateMultiSpeaker, generateSingleSpeaker, type GeminiVoice } from "@/lib/tts/gemini";

const VOICES: GeminiVoice[] = [
  "Zephyr","Puck","Charon","Kore","Fenrir","Leda","Orus","Aoede","Callirhoe","Autonoe",
  "Enceladus","Iapetus","Umbriel","Algieba","Despina","Erinome","Algenib","Rasalgethi",
  "Laomedeia","Achernar","Alnilam","Schedar","Gacrux","Pulcherrima","Achird",
  "Zubenelgenubi","Vindemiatrix","Sadachbia","Sadaltager","Sulafat",
];

const schema = z.object({
  questionId: z.string().uuid(),
  script: z.string().min(1).max(8000).optional(), // override audioScript
  mode: z.enum(["auto", "single", "multi"]).default("auto"),
  voice: z.enum(VOICES as [GeminiVoice, ...GeminiVoice[]]).optional(),
  speakers: z.array(z.object({
    name: z.string().min(1).max(20),
    voice: z.enum(VOICES as [GeminiVoice, ...GeminiVoice[]]),
  })).max(2).optional(),
  model: z.string().optional(),
  replace: z.boolean().default(true),  // delete old assets before saving
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad input" }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: input.questionId },
    select: { id: true, audioScript: true, stem: true },
  });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const script = (input.script ?? question.audioScript ?? "").trim();
  if (!script) {
    return NextResponse.json({ error: "No script provided (set audioScript or pass script)" }, { status: 400 });
  }

  try {
    const result = input.mode === "single"
      ? await generateSingleSpeaker({ script, voice: input.voice ?? "Kore", model: input.model })
      : input.mode === "multi"
        ? await generateMultiSpeaker({
            script,
            speakers: input.speakers ?? [
              { name: "Speaker A", voice: "Kore" },
              { name: "Speaker B", voice: "Puck" },
            ],
            model: input.model,
          })
        : await generateAuto({ script, model: input.model });

    const scriptHash = createHash("sha1").update(script).digest("hex");

    if (input.replace) {
      await prisma.audioAsset.deleteMany({ where: { questionId: question.id } });
    }

    const asset = await prisma.audioAsset.create({
      data: {
        questionId: question.id,
        data: new Uint8Array(result.wav),
        mimeType: "audio/wav",
        durationSec: result.durationSec,
        sampleRate: result.sampleRate,
        voicesUsed: result.voicesUsed,
        scriptHash,
        modelUsed: result.modelUsed,
      },
      select: { id: true, durationSec: true, voicesUsed: true, modelUsed: true, createdAt: true },
    });

    await prisma.question.update({
      where: { id: question.id },
      data: {
        audioScript: input.script ?? question.audioScript,
        audioDurationSec: result.durationSec,
        hasAudio: true,
      },
    });

    return NextResponse.json({
      ok: true,
      asset,
      audioUrl: `/api/audio/${asset.id}`,
      bytes: result.wav.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TTS failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
