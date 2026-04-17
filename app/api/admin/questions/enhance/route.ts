import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { anthropic } from "@/lib/ai/claude";
import { calcCostUsd } from "@/lib/ai/costCalc";

const SYSTEM_PROMPT = `你是資深 NCLEX-RN 護理教學專家，擅長以繁體中文為 NCLEX 題目撰寫詳細、精確、有臨床實用性的解析，目標讀者是準備赴美執業的台灣護理師。

撰寫原則：
1. 解析必須涵蓋：核心概念、為什麼正確答案對、臨床思路（priority / safety / ABC 等）
2. 每個選項的分析要精確說明「為什麼對」或「為什麼錯」
3. 若台美臨床做法有差異（藥物、劑量、routine order、scope of practice），必須點出
4. 語氣專業但易懂，避免過度艱深的中文
5. 專有名詞：第一次用「中文（英文）」格式，後續用中文即可
6. 不要寫空話、不要複述題目，重點在教學`;

const MODEL = "claude-sonnet-4-6";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const questionId = body.questionId as string | undefined;
  if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!q) return NextResponse.json({ error: "question not found" }, { status: 404 });

  const correctLetters = q.correctAnswers.length > 0 ? q.correctAnswers : q.correctAnswer.split(",").map((s) => s.trim());
  const options: Record<string, string> = {
    A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD,
    ...(q.optionE ? { E: q.optionE } : {}),
    ...(q.optionF ? { F: q.optionF } : {}),
  };

  const optionsText = Object.entries(options)
    .map(([k, v]) => `${k}. ${v}${correctLetters.includes(k) ? "  ← 正確答案" : ""}`)
    .join("\n");

  const userPrompt = `題型：${q.questionType === "SATA" ? "複選題 (SATA)" : "單選題 (SBA)"}
Domain：${q.domain ?? "未分類"}　難度：${q.difficulty}

題幹 (EN)：
${q.stem}

${q.stemZh ? `題幹 (中)：\n${q.stemZh}\n` : ""}
選項：
${optionsText}

正確答案：${correctLetters.join(", ")}

現有解析（可能過短或欠缺）：
${q.explanationZh || "（無）"}

請輸出 JSON（只輸出 JSON，無其他文字）：
{
  "explanationZh": "<400-600 字繁體中文詳細解析：核心概念 + 臨床思路 + 為何此答案最佳>",
  "optionRationales": {
    "A": "<選項 A 為什麼對/錯，80-150 字繁中>",
    "B": "...",
    "C": "...",
    "D": "..."${q.optionE ? ',\n    "E": "..."' : ""}${q.optionF ? ',\n    "F": "..."' : ""}
  },
  "usTwDifference": "<若台美臨床做法不同，簡述差異（50-150 字）。若無顯著差異，回傳空字串>",
  "stemZh": "${q.stemZh ? "" : "<若原本無中文題幹，請產生繁體中文翻譯（不超過原文長度的 1.2 倍）>"}"
}`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
  const usage = {
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    cacheReadTokens: (msg.usage as any).cache_read_input_tokens ?? 0,
    cacheWriteTokens: (msg.usage as any).cache_creation_input_tokens ?? 0,
  };
  const costUsd = calcCostUsd(MODEL, usage);

  let parsed: any = {};
  try {
    parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
  } catch {
    return NextResponse.json({ error: "Claude response parse failed", raw }, { status: 500 });
  }

  // Log API usage
  await prisma.apiUsageLog.create({
    data: {
      model: MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      purpose: "question_enhance",
      costUsd,
    },
  });

  return NextResponse.json({
    ok: true,
    questionId,
    preview: {
      explanationZh: parsed.explanationZh ?? "",
      optionRationales: parsed.optionRationales ?? {},
      usTwDifference: parsed.usTwDifference ?? "",
      stemZh: parsed.stemZh ?? q.stemZh ?? "",
    },
    current: {
      explanationZh: q.explanationZh,
      optionRationales: q.optionRationales,
      usTwDifference: q.usTwDifference,
      stemZh: q.stemZh,
    },
    costUsd: Math.round(costUsd * 10000) / 10000,
  });
}

/** PATCH: apply the approved enhancement to the question. */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const { questionId, explanationZh, optionRationales, usTwDifference, stemZh } = body as {
    questionId: string;
    explanationZh?: string;
    optionRationales?: Record<string, string>;
    usTwDifference?: string;
    stemZh?: string;
  };
  if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

  // Merge rationales keeping structure { "A": { zh: "...", en: "..." } }
  let mergedRationales: any = undefined;
  if (optionRationales) {
    const existing = (await prisma.question.findUnique({
      where: { id: questionId },
      select: { optionRationales: true },
    }))?.optionRationales as Record<string, { en?: string | null; zh?: string | null }> | null;

    mergedRationales = { ...(existing ?? {}) };
    for (const [letter, text] of Object.entries(optionRationales)) {
      mergedRationales[letter] = {
        en: mergedRationales[letter]?.en ?? null,
        zh: text,
      };
    }
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      ...(explanationZh ? { explanationZh } : {}),
      ...(mergedRationales ? { optionRationales: mergedRationales } : {}),
      ...(usTwDifference !== undefined ? { usTwDifference: usTwDifference || null } : {}),
      ...(stemZh ? { stemZh } : {}),
    },
    select: { id: true, explanationZh: true },
  });

  return NextResponse.json({ ok: true, questionId: updated.id });
}
