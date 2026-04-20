import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { Difficulty } from "@prisma/client";
import { MODEL_PRIORITY, MODEL_RPD as _MODEL_RPD } from "@/lib/geminiModels";

export { MODEL_PRIORITY as AUTO_MODEL_PRIORITY };
export { _MODEL_RPD as MODEL_RPD };

export const VALID_DOMAINS = [
  "Management of Care",
  "Safety & Infection Control",
  "Health Promotion & Maintenance",
  "Psychosocial Integrity",
  "Basic Care & Comfort",
  "Pharmacological and Parenteral Therapies",
  "Reduction of Risk Potential",
  "Physiological Adaptation",
];

export const DOMAIN_TARGETS: Record<string, number> = {
  "Management of Care": 1540,
  "Safety & Infection Control": 1210,
  "Health Promotion & Maintenance": 1210,
  "Psychosocial Integrity": 990,
  "Basic Care & Comfort": 990,
  "Pharmacological and Parenteral Therapies": 1540,
  "Reduction of Risk Potential": 1540,
  "Physiological Adaptation": 1980,
};


const IRT: Record<string, { a: number; b: number }> = {
  EASY: { a: 0.8, b: -1.0 },
  MEDIUM: { a: 1.0, b: 0.0 },
  HARD: { a: 1.2, b: 1.0 },
};

const ADVERB_RE =
  /(aggressively|fiercely|deeply|essentially|completely|entirely|absolutely|violently|purely|flawlessly|strictly|exclusively|thoroughly|directly|heavily|perfectly|smoothly|cleanly|safely|incredibly|seamlessly|magically)/gi;

function isGibberish(en: string) {
  return (en.match(ADVERB_RE) ?? []).length > 15 || en.length > 800;
}

function validate(q: Record<string, unknown>): string | null {
  if (!q.stem || !q.optionA || !q.optionB || !q.optionC || !q.optionD)
    return "missing required fields";
  if (!q.explanationZh) return "missing explanationZh";
  if (!q.usTwDifference) return "missing usTwDifference";
  if (q.domain && !VALID_DOMAINS.includes(q.domain as string))
    return `invalid domain: ${q.domain}`;
  if (q.questionType === "MCQ" && q.correctAnswers !== null && q.correctAnswers !== undefined)
    return "MCQ correctAnswers must be null";
  if (q.questionType === "SATA" && q.correctAnswer !== null && q.correctAnswer !== undefined)
    return "SATA correctAnswer must be null";
  if (
    q.questionType === "SATA" &&
    (!Array.isArray(q.correctAnswers) || (q.correctAnswers as string[]).length < 2)
  )
    return "SATA needs ≥2 correctAnswers";
  const rationales = q.optionRationales as Record<string, { en?: string }> | undefined;
  if (rationales) {
    for (const letter of ["A", "B", "C", "D", "E"]) {
      const en = rationales[letter]?.en ?? "";
      if (isGibberish(en)) return `option ${letter} rationale gibberish`;
    }
  }
  return null;
}

export function getApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`]?.trim();
    if (k) keys.push(k);
  }
  const single = process.env.GEMINI_API_KEY?.trim();
  if (single && !keys.includes(single)) keys.push(single);
  return keys;
}

function buildPrompt(domain: string, count: number): string {
  const sataCount = Math.round(count * 0.2);
  const mcqCount = count - sataCount;
  return `你是一位 NCLEX-RN 護理考題命題專家。請生成 ${count} 道高品質護理考題，輸出 JSON 物件 { "questions": [...] }。

【題目分配】
- ${mcqCount} 題 MCQ（單選），${sataCount} 題 SATA（多選，Select All That Apply）
- 難度比例：EASY 30% / MEDIUM 50% / HARD 20%
- Domain：${domain}

【JSON Schema — 每題必須完全符合此格式】

MCQ 範例：
{
  "stem": "A nurse is caring for a 68-year-old male client admitted with COPD exacerbation. SpO2 is 87%. Which action should the nurse take first?",
  "stemZh": "一位 68 歲男性因慢性阻塞性肺病急性發作入院，SpO2 87%。護理師應優先採取哪項措施？",
  "questionType": "MCQ",
  "domain": "${domain}",
  "difficulty": "MEDIUM",
  "optionA": "Administer oxygen at 2 L/min via nasal cannula",
  "optionB": "Prepare for immediate intubation",
  "optionC": "Notify the physician",
  "optionD": "Obtain an arterial blood gas sample",
  "optionE": null,
  "correctAnswer": "A",
  "correctAnswers": null,
  "explanationZh": "COPD 急性發作首重低流量氧氣（1-2 L/min）將 SpO2 維持在 88-92%。COPD 病人依賴缺氧驅動呼吸，高流量氧氣會抑制呼吸中樞。B（插管）為保守治療無效後的選項；C（通知醫師）、D（抽血氣）均為後續步驟，緊急處置以穩定 ABC 為先。",
  "optionRationales": {
    "A": { "en": "Low-flow oxygen corrects hypoxemia while preserving the hypoxic drive in COPD.", "zh": "低流量氧氣維持 SpO2 88-92%，同時保留缺氧驅動，是 COPD 急性發作的標準首選。" },
    "B": { "en": "Immediate intubation is not indicated; conservative management should be tried first.", "zh": "插管為侵入性操作，保守治療無效才考慮，非首選。" },
    "C": { "en": "Physician notification is important but not the first action.", "zh": "通知醫師重要但非第一步，應先穩定缺氧再回報。" },
    "D": { "en": "ABG is valuable but oxygen delivery takes priority.", "zh": "血氣分析有診斷價值，但等報告會延誤缺氧處置。" }
  },
  "usTwDifference": "美國護理師可依 protocol 自行調整氧流量；台灣多需醫囑授權，但緊急情況可先給氧再補開醫囑。",
  "irtA": 1.0, "irtB": 0.0, "irtC": 0.20
}

SATA 範例：
{
  "stem": "A nurse is reviewing discharge instructions for a client with heart failure. Which instructions should the nurse include? (Select all that apply.)",
  "stemZh": "護理師向心臟衰竭病人進行出院指導，應包含哪些內容？（選所有適合的）",
  "questionType": "SATA",
  "domain": "${domain}",
  "difficulty": "MEDIUM",
  "optionA": "Weigh yourself daily at the same time each morning",
  "optionB": "Limit fluid intake to 2 liters per day",
  "optionC": "Discontinue diuretics if dizziness occurs",
  "optionD": "Report weight gain of more than 2 lbs in 24 hours",
  "optionE": "Reduce sodium intake to less than 2 g per day",
  "correctAnswer": null,
  "correctAnswers": ["A", "B", "D", "E"],
  "explanationZh": "心衰竭出院四大重點：每日量體重（監測液體滯留最敏感指標）、限水 1.5-2 L/day、限鈉 <2 g/day、體重 24 小時增加 >2 lbs 立即回報。C 錯誤：頭暈不可自行停利尿劑，應調整起身速度或回診，擅自停藥導致液體堆積。",
  "optionRationales": {
    "A": { "en": "Daily weight monitoring detects fluid retention early.", "zh": "每日固定時間量體重，是偵測液體滯留最早期的指標，比水腫更早出現。" },
    "B": { "en": "Fluid restriction prevents fluid overload.", "zh": "限水 1.5-2 L/day 可降低前負荷，減少心衰竭再入院率。" },
    "C": { "en": "Diuretics must not be stopped without provider guidance.", "zh": "擅自停利尿劑會加速液體堆積，頭暈應回診調整劑量，不可自行停藥。" },
    "D": { "en": "Weight gain >2 lbs/24h signals acute decompensation.", "zh": "24 小時 >2 lbs 或一週 >5 lbs 為失代償紅旗，需立即聯繫醫療團隊。" },
    "E": { "en": "Low-sodium diet reduces fluid retention.", "zh": "限鈉 <2 g/day 減少液體滯留，需教導病人識別食品標示中的隱藏鈉。" }
  },
  "usTwDifference": "美國護理師主導心衰竭病例管理門診；台灣以醫師為主，護理師衛教時間較短，返家後結構化追蹤較少。",
  "irtA": 1.0, "irtB": 0.0, "irtC": 0.20
}

【IRT 規則（必須嚴格遵守）】
- EASY：irtA=0.8, irtB=-1.0, irtC=0.20
- MEDIUM：irtA=1.0, irtB=0.0, irtC=0.20
- HARD：irtA=1.2, irtB=1.0, irtC=0.20

【必填規則】
- MCQ：correctAnswer=單一字母（A/B/C/D），correctAnswers=null，optionE=null
- SATA：correctAnswer=null，correctAnswers=[至少2個字母]，optionE 必須有內容
- 每題都必須有：stem、stemZh、questionType、domain、difficulty、optionA-D、correctAnswer、correctAnswers、explanationZh、optionRationales（A-D 各含 en 和 zh）、usTwDifference、irtA、irtB、irtC

【解析長度要求】
- explanationZh：80-150 字繁體中文，說明核心概念與為何正確答案對（簡潔即可，後續可補強）
- optionRationales 每個選項的 zh：20-50 字，說明機轉或理由，不可只寫「對」或「錯」
- usTwDifference：30-80 字，描述台美臨床或執業範圍差異；無差異才留空字串

【禁止事項】
- explanationZh 開頭不可都用相同模板（避免「此題的重點是」、「根據臨床原則」）
- 不可在解析中直接複製題幹或選項文字
- 不可使用填空式題幹（如 "37F presents with..."）

請直接輸出 JSON 物件，從 { 開始，到 } 結束，不要任何前後說明。`;
}

const stemHash = (s: string) =>
  createHash("sha1").update(s.trim().toLowerCase()).digest("hex");

export async function pickAutoDomain(): Promise<string> {
  const counts = await prisma.question.groupBy({
    by: ["domain"],
    _count: { id: true },
    where: { domain: { not: null } },
  });
  const countMap: Record<string, number> = {};
  for (const row of counts) {
    if (row.domain) countMap[row.domain] = row._count.id;
  }
  let minPct = Infinity;
  let chosen = VALID_DOMAINS[0];
  for (const [d, target] of Object.entries(DOMAIN_TARGETS)) {
    const pct = (countMap[d] ?? 0) / target;
    if (pct < minPct) {
      minPct = pct;
      chosen = d;
    }
  }
  return chosen;
}

export interface BatchResult {
  ok: boolean;
  domain: string;
  model: string;
  total: number;
  passed: number;
  rejected: number;
  duplicates: number;
  inserted: number;
  error?: string;
  badReasons?: { idx: number; reason: string }[];
}

export async function runOneBatch(params: {
  domain: string;
  model: string; // specific id or "auto"
  count?: number;
  adminId?: string;
}): Promise<BatchResult> {
  const count = params.count ?? 50;
  const requestedModel = params.model;
  const domain = params.domain;

  const base: Omit<BatchResult, "ok"> = {
    domain,
    model: requestedModel,
    total: 0,
    passed: 0,
    rejected: 0,
    duplicates: 0,
    inserted: 0,
  };

  if (!VALID_DOMAINS.includes(domain)) {
    return { ...base, ok: false, error: `Invalid domain: ${domain}` };
  }

  const apiKeys = getApiKeys();
  if (!apiKeys.length) {
    return {
      ...base,
      ok: false,
      error: "未設定 Gemini API Key（GEMINI_API_KEY_1 ~ GEMINI_API_KEY_10）",
    };
  }

  const modelQueue =
    requestedModel === "auto"
      ? [...MODEL_PRIORITY]
      : [requestedModel];

  const prompt = buildPrompt(domain, count);
  let rawText = "";
  let lastError = "";
  let usedModel = requestedModel;

  outer: for (const model of modelQueue) {
    for (const key of apiKeys) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 65536,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(110_000),
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
        if (rawText) {
          usedModel = model;
          break outer;
        }
        lastError = `${model}: empty response`;
      } catch (err) {
        lastError = `${model}: ${String(err)}`;
      }
    }
    // All keys exhausted for this model; in auto mode try the next tier.
  }

  base.model = usedModel;

  if (!rawText) {
    return { ...base, ok: false, error: `所有 API Key / 模型都失敗：${lastError}` };
  }

  let questions: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(rawText);
    questions = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
  } catch {
    return { ...base, ok: false, error: "Gemini 回傳 JSON 解析失敗" };
  }

  const good: Record<string, unknown>[] = [];
  const badReasons: { idx: number; reason: string }[] = [];
  for (let i = 0; i < questions.length; i++) {
    const reason = validate(questions[i]);
    if (reason) badReasons.push({ idx: i, reason });
    else good.push(questions[i]);
  }

  const existingHashes = new Set<string>();
  let cursor: string | undefined;
  do {
    const batch = await prisma.question.findMany({
      select: { id: true, stem: true },
      take: 2000,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    for (const q of batch) existingHashes.add(stemHash(q.stem));
    cursor = batch.length === 2000 ? batch[batch.length - 1].id : undefined;
  } while (cursor);

  const deduped: Record<string, unknown>[] = [];
  let duplicates = 0;
  for (const q of good) {
    if (existingHashes.has(stemHash(String(q.stem)))) duplicates++;
    else deduped.push(q);
  }

  let inserted = 0;
  if (deduped.length > 0) {
    const adminId = params.adminId ?? "admin";
    const now = new Date();
    try {
      const result = await prisma.question.createMany({
        data: deduped.map((q) => {
          const diff: Difficulty = (
            ["EASY", "MEDIUM", "HARD"].includes(q.difficulty as string) ? q.difficulty : "MEDIUM"
          ) as Difficulty;
          const irt = IRT[diff];
          const cas =
            Array.isArray(q.correctAnswers) && (q.correctAnswers as string[]).length
              ? (q.correctAnswers as string[]).map((s) => s.toUpperCase())
              : String(q.correctAnswer ?? "A")
                  .toUpperCase()
                  .split(",")
                  .map((s) => s.trim());
          const ca = (q.correctAnswer as string | null)?.toUpperCase() ?? cas.join(",");
          return {
            stem: String(q.stem),
            stemZh: (q.stemZh as string) ?? null,
            optionA: String(q.optionA),
            optionB: String(q.optionB),
            optionC: String(q.optionC),
            optionD: String(q.optionD),
            optionE: (q.optionE as string) ?? null,
            correctAnswer: ca,
            correctAnswers: cas,
            explanationZh: String(q.explanationZh),
            optionRationales: (q.optionRationales as object) ?? undefined,
            usTwDifference: (q.usTwDifference as string) ?? null,
            domain: (q.domain as string) ?? null,
            questionType: q.questionType === "SATA" ? "SATA" : "MCQ",
            difficulty: diff,
            tags: [],
            irtA: (q.irtA as number) ?? irt.a,
            irtB: (q.irtB as number) ?? irt.b,
            irtC: 0.2,
            status: "APPROVED" as const,
            createdBy: adminId,
            createdAt: now,
            updatedAt: now,
          };
        }),
        skipDuplicates: true,
      });
      inserted = result.count;
    } catch (err) {
      return { ...base, ok: false, error: `DB 寫入失敗：${String(err)}` };
    }
  }

  return {
    ok: true,
    domain,
    model: usedModel,
    total: questions.length,
    passed: good.length,
    rejected: badReasons.length,
    duplicates,
    inserted,
    badReasons: badReasons.slice(0, 5),
  };
}
