import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { Difficulty } from "@prisma/client";

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

export const MODEL_RPD: Record<string, number> = {
  "gemini-3.1-flash-lite-preview": 1500,
  "gemini-3-flash-preview": 1500,
  "gemini-2.5-flash-lite": 1000,
  "gemini-2.5-flash": 20,
  "gemini-2.5-pro": 100,
};

// Auto-mode priority: smartest first, fallback to faster/cheaper tiers on
// rate-limit. Keeps output quality high when quota is available.
export const AUTO_MODEL_PRIORITY = [
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash-lite",
];

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
  "explanationZh": "COPD 急性發作的首要處置：先用低流量氧氣（1-2 L/min 鼻導管）把 SpO2 拉回 88-92% 的安全區間，這是 ABC 優先原則的 A（Airway）和 B（Breathing）。為什麼不能給高流量氧氣？COPD 病人長期 CO2 滯留，靠的是缺氧驅動（hypoxic drive）來維持呼吸，氧氣太高會抑制呼吸中樞造成 CO2 麻醉。這題的陷阱在 B（立即插管），看到 SpO2 87% 很容易恐慌，但只要意識清楚、還能自主呼吸，都應先嘗試保守治療；通知醫師（C）和抽血氣（D）都是後續動作，緊急處置永遠以穩定生命徵象為優先。",
  "optionRationales": {
    "A": { "en": "Low-flow oxygen corrects hypoxemia while preserving the hypoxic drive in COPD.", "zh": "低流量氧氣（1-2 L/min）把 SpO2 拉到 88-92% 的安全區間，同時避免抑制缺氧驅動呼吸，是 COPD 急性發作的標準首要處置。" },
    "B": { "en": "Immediate intubation is not indicated; conservative management should be tried first.", "zh": "立即插管屬於侵入性處置，需在保守治療無效（例如 SpO2 無法回升、意識改變、CO2 持續上升）才考慮，不是首選。" },
    "C": { "en": "Physician notification is important but not the first action; oxygen delivery is the priority.", "zh": "通知醫師固然必要，但在病人缺氧的當下必須先給氧救命，再回報，符合 ABC 原則。" },
    "D": { "en": "ABG is valuable but obtaining oxygen first addresses the immediate hypoxemia.", "zh": "血氣分析能提供 PaO2 / PaCO2 / pH 等關鍵資料，但抽血和等報告都要時間，不能讓病人一直缺氧。" }
  },
  "usTwDifference": "美國護理師在標準氧氣 protocol（如 COPD 維持 SpO2 88-92%）下可直接調整流量，不需逐次醫囑；台灣多數醫院仍要求 PRN 氧氣也需醫囑，護理師可先給氧但需立即通報並補開醫囑。",
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
  "explanationZh": "心臟衰竭出院指導的四大支柱：每日量體重、限水、限鈉、警訊回報。每日同時間（起床排尿後）量重是監測液體滯留最敏感的指標，比水腫更早出現。液體限制通常 1.5-2 L/day、鈉限制 < 2 g/day 可降低前負荷，減少再入院率。24 小時體重增加 >2 lbs（約 0.9 kg）或一週 >5 lbs 是急性失代償的紅旗，必須立即回報。C 是明確錯誤：利尿劑造成的姿勢性低血壓應透過緩慢起身、評估用藥時間來改善，擅自停藥會讓液體再次堆積，極可能在數天內回到急診。整個教育重點在『病人自我監測 + 早期介入』。",
  "optionRationales": {
    "A": { "en": "Daily weight monitoring detects fluid retention early.", "zh": "同時間量體重是監測液體滯留最敏感的指標，能比水腫早 24-48 小時發現失代償。" },
    "B": { "en": "Fluid restriction prevents fluid overload in heart failure.", "zh": "限制 1.5-2 L/day 可降低前負荷，特別是 NYHA III-IV 級病人一定要落實。" },
    "C": { "en": "Diuretics must not be stopped without provider guidance.", "zh": "擅自停利尿劑會讓液體快速堆積，頭暈應從起身速度和用藥時間調整，必要時回診調整劑量。" },
    "D": { "en": "Weight gain >2 lbs in 24 hours indicates fluid retention.", "zh": "24 小時 >2 lbs 或一週 >5 lbs 是急性失代償紅旗，需立即回報醫療團隊。" },
    "E": { "en": "Low-sodium diet reduces fluid retention.", "zh": "鈉 < 2 g/day 減少液體滯留，但需指導病人閱讀包裝標示，外食是最大陷阱。" }
  },
  "usTwDifference": "美國心衰竭管理強調病人自我監測（每日量重、填日誌、症狀管理 app）與護理師主導的門診；台灣多由心臟內科醫師主導，護理師出院衛教較短，返家後以傳統門診追蹤為主，較少結構化的病例管理系統。",
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

【解析長度要求（關鍵！）】
- explanationZh 必須 200-400 字繁體中文，且內容結構化：核心概念 → 為何正確答案對 → 為何其他選項錯 → 臨床思路/安全優先原則
- optionRationales 每個選項的 zh 必須 50-120 字，不可只寫「對」或「錯」，要解釋機轉或為什麼
- usTwDifference 必須 60-150 字，描述具體的臨床作業或護理執業範圍差異，若完全無差異才留空字串
- 以上長度不足一律視為不合格題目，請重寫該題

【禁止事項】
- 每題 usTwDifference 必須獨特，描述內容不可重複
- explanationZh 開頭不可都一樣（避免「此題的重點是」、「根據臨床原則」等模板開頭）
- optionRationales 的 en 欄位每個不可超過 150 字
- 不可使用填空式題幹（如 "37F presents with..."）
- 不可在解析中直接複製題幹或選項文字

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
      ? [...AUTO_MODEL_PRIORITY]
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
