import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getApiKeys, AUTO_MODEL_PRIORITY } from "@/lib/generateBatch";

/**
 * Batch-enhance short / incomplete explanations using Gemini's large context.
 * Accepts `{ ids: string[] }` (max 30). Sends all questions in one prompt,
 * writes enhanced fields back in a transaction.
 *
 * Why Gemini instead of Claude: 1-2M input context comfortably fits 20-30
 * questions at once, cutting API round-trips and cost compared to the
 * one-at-a-time `enhance/route.ts` Claude endpoint.
 */

const SYSTEM_INSTRUCTION = `你是資深 NCLEX-RN 護理教學專家，擅長以繁體中文為 NCLEX 題目撰寫詳細、精確、有臨床實用性的解析，目標讀者是準備赴美執業的台灣護理師。

撰寫原則：
1. 解析必須涵蓋：核心概念、為什麼正確答案對、每個錯誤選項為什麼錯、臨床思路（priority / safety / ABC 等）
2. 每個選項的分析要精確說明機轉或理由，不可只寫「對」或「錯」
3. 若台美臨床做法有差異（藥物、劑量、routine order、scope of practice），必須點出
4. 語氣專業但易懂，專有名詞第一次用「中文（英文）」格式
5. 不要寫空話、不要複述題幹、不要模板化開頭`;

const MAX_IDS = 30;

function buildPrompt(
  questions: Array<{
    id: string;
    stem: string;
    stemZh: string | null;
    questionType: string;
    domain: string | null;
    difficulty: string;
    options: Record<string, string>;
    correctLetters: string[];
    currentExplanation: string;
    hasStemZh: boolean;
  }>
): string {
  const items = questions.map((q, idx) => {
    const optsText = Object.entries(q.options)
      .map(([k, v]) => `${k}. ${v}${q.correctLetters.includes(k) ? "  ← 正確答案" : ""}`)
      .join("\n");
    return `═══ 題目 ${idx + 1} ═══
id: ${q.id}
questionType: ${q.questionType}
domain: ${q.domain ?? "未分類"}
difficulty: ${q.difficulty}

題幹 (EN):
${q.stem}
${q.stemZh ? `\n題幹 (中):\n${q.stemZh}` : ""}

選項:
${optsText}

正確答案: ${q.correctLetters.join(", ")}

現有解析（可能過短或不完整）:
${q.currentExplanation || "（無）"}`;
  }).join("\n\n");

  const outputSchema = questions.map((q) => {
    const letters = Object.keys(q.options);
    const rationaleKeys = letters.map((l) => `      "${l}": "<該選項為什麼對/錯，50-120 字繁中，解釋機轉而非「對」或「錯」>"`).join(",\n");
    return `    {
      "id": "${q.id}",
      "explanationZh": "<200-400 字繁中：核心概念 → 為何正確答案對 → 為何其他選項錯 → 臨床思路/安全優先>",
      "optionRationales": {
${rationaleKeys}
      },
      "usTwDifference": "<60-150 字具體描述台美差異，若完全無差異才留空字串>"${!q.hasStemZh ? `,
      "stemZh": "<請補上繁體中文題幹翻譯，長度不超過英文原文 1.2 倍>"` : ""}
    }`;
  }).join(",\n");

  return `你將為下列 ${questions.length} 道 NCLEX 題目撰寫更完整的繁體中文解析。

${items}

【長度要求（關鍵）】
- explanationZh：必須 200-400 字繁中，結構化分段（核心概念 → 為何對 → 為何錯 → 臨床思路）
- optionRationales 每個 zh：必須 50-120 字，解釋機轉或臨床理由
- usTwDifference：60-150 字，描述具體台美臨床作業或 scope of practice 差異；完全無差異才留空字串

【禁止】
- 模板化開頭（「此題的重點是」、「根據臨床原則」）
- 直接複製題幹或選項文字到解析
- 空話、廢話、重複

請嚴格輸出以下 JSON（只輸出 JSON，從 { 開始到 } 結束）：
{
  "results": [
${outputSchema}
  ]
}`;
}

interface EnhancedItem {
  id: string;
  explanationZh?: string;
  optionRationales?: Record<string, string>;
  usTwDifference?: string;
  stemZh?: string;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? (body.ids as string[]).slice(0, MAX_IDS) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required (max 30)" }, { status: 400 });
  }

  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    return NextResponse.json(
      { error: "未設定 Gemini API Key（GEMINI_API_KEY_1 ~ GEMINI_API_KEY_10）" },
      { status: 500 }
    );
  }

  const rows = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      stem: true,
      stemZh: true,
      questionType: true,
      domain: true,
      difficulty: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      optionE: true,
      optionF: true,
      correctAnswer: true,
      correctAnswers: true,
      explanationZh: true,
    },
  });

  if (rows.length === 0) {
    return NextResponse.json({ error: "no questions found" }, { status: 404 });
  }

  const prepared = rows.map((q) => {
    const opts: Record<string, string> = {
      A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD,
      ...(q.optionE ? { E: q.optionE } : {}),
      ...(q.optionF ? { F: q.optionF } : {}),
    };
    const correctLetters =
      q.correctAnswers.length > 0
        ? q.correctAnswers
        : q.correctAnswer.split(",").map((s) => s.trim());
    return {
      id: q.id,
      stem: q.stem,
      stemZh: q.stemZh,
      questionType: q.questionType,
      domain: q.domain,
      difficulty: q.difficulty,
      options: opts,
      correctLetters,
      currentExplanation: q.explanationZh,
      hasStemZh: !!q.stemZh,
    };
  });

  const prompt = buildPrompt(prepared);

  let rawText = "";
  let lastError = "";
  let usedModel = "";
  let usageMeta: { inputTokens: number; outputTokens: number } | null = null;

  outer: for (const model of AUTO_MODEL_PRIORITY) {
    for (const key of apiKeys) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 65536,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(180_000),
          }
        );

        if (resp.status === 429) {
          lastError = `${model} key ${key.slice(0, 8)}… rate limited`;
          continue;
        }
        if (!resp.ok) {
          const errBody = await resp.text().catch(() => "");
          lastError = `${model} key ${key.slice(0, 8)}… HTTP ${resp.status}: ${errBody.slice(0, 200)}`;
          continue;
        }

        const data = await resp.json();
        rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        usageMeta = {
          inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        };
        if (rawText) {
          usedModel = model;
          break outer;
        }
        lastError = `${model}: empty response`;
      } catch (err) {
        lastError = `${model}: ${String(err)}`;
      }
    }
  }

  if (!rawText) {
    return NextResponse.json({ error: `所有 API Key / 模型都失敗：${lastError}` }, { status: 502 });
  }

  let parsed: { results?: EnhancedItem[] } = {};
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const m = rawText.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch { /* fallthrough */ }
    }
  }

  const results = Array.isArray(parsed.results) ? parsed.results : [];
  if (results.length === 0) {
    return NextResponse.json({ error: "Gemini 回傳 JSON 無 results 欄位", raw: rawText.slice(0, 500) }, { status: 500 });
  }

  const byId = new Map(rows.map((q) => [q.id, q]));
  let enhanced = 0;
  let skipped = 0;
  const errors: Array<{ id: string; reason: string }> = [];

  for (const r of results) {
    const q = byId.get(r.id);
    if (!q) { errors.push({ id: r.id ?? "?", reason: "id 不在批次中" }); continue; }
    if (!r.explanationZh || r.explanationZh.length < 150) {
      errors.push({ id: r.id, reason: `explanationZh 仍過短 (${r.explanationZh?.length ?? 0} 字)` });
      skipped++;
      continue;
    }

    let mergedRationales: any = undefined;
    if (r.optionRationales) {
      const existing = (q as any).optionRationales as Record<string, { en?: string | null; zh?: string | null }> | null;
      mergedRationales = { ...(existing ?? {}) };
      for (const [letter, text] of Object.entries(r.optionRationales)) {
        mergedRationales[letter] = {
          en: mergedRationales[letter]?.en ?? null,
          zh: text,
        };
      }
    }

    try {
      await prisma.question.update({
        where: { id: r.id },
        data: {
          explanationZh: r.explanationZh,
          ...(mergedRationales ? { optionRationales: mergedRationales } : {}),
          ...(r.usTwDifference !== undefined ? { usTwDifference: r.usTwDifference || null } : {}),
          ...(r.stemZh && !q.stemZh ? { stemZh: r.stemZh } : {}),
        },
      });
      enhanced++;
    } catch (err) {
      errors.push({ id: r.id, reason: String(err).slice(0, 100) });
    }
  }

  if (usageMeta) {
    await prisma.apiUsageLog.create({
      data: {
        model: usedModel,
        inputTokens: usageMeta.inputTokens,
        outputTokens: usageMeta.outputTokens,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        purpose: "question_enhance_batch",
        costUsd: 0,
      },
    }).catch(() => { /* non-critical */ });
  }

  return NextResponse.json({
    ok: true,
    model: usedModel,
    requested: ids.length,
    returned: results.length,
    enhanced,
    skipped,
    errors: errors.slice(0, 10),
  });
}
