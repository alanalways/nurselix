import { anthropic } from "@/lib/ai/claude";
import { calcCostUsd } from "@/lib/ai/costCalc";

export const VOCAB_CATEGORIES = [
  "Pharmacology",
  "Assessment",
  "Pathophysiology",
  "Lab Values & Diagnostics",
  "Procedures & Skills",
  "Medical-Surgical",
  "Maternal-Newborn",
  "Pediatric",
  "Mental Health",
  "Patient Safety & Priority",
  "NCLEX Test-Taking Language",
  "Nursing Process & Delegation",
] as const;

export type VocabCategory = typeof VOCAB_CATEGORIES[number];

export interface GeneratedWord {
  word: string;
  partOfSpeech: string;
  definitionEn: string;
  definitionZh: string;
  category: string;
  tier: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  exampleEn: string;
  exampleZh: string;
  synonyms: string[];
  memoryHook: string;
}

const SYSTEM_PROMPT = `你是資深 NCLEX-RN 護理教育專家，專精於為英語為第二語言的台灣護理師準備 NCLEX 字彙。

規則：
1. 只收錄 NCLEX-RN 考試相關詞彙（護理、藥理、病理、解剖、評估、檢驗、流程、NCLEX 答題語言）
2. 絕對不要收錄日常生活英文、TOEIC、IELTS 或會話英文
3. 絕對不要加入音標（IPA、KK、Jyutping）
4. 中文釋義使用繁體中文，簡潔專業
5. 每個字必須附：詞性、英定義、中定義、例句 EN、例句 ZH、同義詞、記憶訣竅
6. 記憶訣竅使用字根字首 (-itis, dys-, hemo-) 或臨床情境，不可加音標
7. 必須以純 JSON 陣列輸出，無 markdown、無說明文字
8. 每批產出 {count} 個不同的字，禁止重複已提供的單字
9. difficulty: EASY(Tier1基礎) / MEDIUM(Tier2臨床) / HARD(Tier3進階)`;

const FEW_SHOT: GeneratedWord[] = [
  {
    word: "auscultate",
    partOfSpeech: "verb",
    definitionEn: "To listen to internal body sounds with a stethoscope for clinical assessment.",
    definitionZh: "聽診，使用聽診器聆聽體內聲音以進行臨床評估。",
    category: "Assessment",
    tier: 1,
    difficulty: "EASY",
    exampleEn: "Auscultate the lungs before administering the beta-blocker.",
    exampleZh: "給予乙型阻斷劑前先聽診肺部。",
    synonyms: ["listen with stethoscope"],
    memoryHook: "ausc- (to hear) → 讓身體透過聲音說話。",
  },
  {
    word: "furosemide",
    partOfSpeech: "noun",
    definitionEn: "A loop diuretic that increases urine output to treat fluid overload and hypertension.",
    definitionZh: "呋塞米（袢利尿劑），用於治療體液過多與高血壓，能增加尿量。",
    category: "Pharmacology",
    tier: 1,
    difficulty: "MEDIUM",
    exampleEn: "Monitor potassium levels closely while the patient receives furosemide.",
    exampleZh: "病患使用呋塞米期間應密切監測血鉀濃度。",
    synonyms: ["Lasix", "loop diuretic"],
    memoryHook: "Lasix = Lasts Six hours，流失 K+（鉀）。",
  },
  {
    word: "ischemia",
    partOfSpeech: "noun",
    definitionEn: "Insufficient blood supply to a tissue, causing oxygen deprivation and possible cell damage.",
    definitionZh: "缺血，組織血液供應不足導致缺氧及可能的細胞損傷。",
    category: "Pathophysiology",
    tier: 2,
    difficulty: "MEDIUM",
    exampleEn: "Chest pain from myocardial ischemia often radiates to the left arm.",
    exampleZh: "心肌缺血引起的胸痛常放射至左臂。",
    synonyms: ["reduced blood flow"],
    memoryHook: "is- (not) + -hem (血) → 血液無法到達組織。",
  },
];

export function buildVocabPrompt(opts: {
  category: string;
  tier: number;
  count: number;
  existingWords: string[];
}): string {
  const { category, tier, count, existingWords } = opts;
  const tierDesc = tier === 1 ? "基礎 Tier 1 (必會核心字)" : tier === 2 ? "臨床 Tier 2 (專科常用)" : "進階 Tier 3 (細專科與少見但重要)";
  const exclusion = existingWords.length > 0
    ? `\n已收錄禁止重複的單字（小寫）：\n${existingWords.slice(0, 400).join(", ")}\n`
    : "";

  return `請產生 ${count} 個 NCLEX-RN 的英文單字，類別必須全部屬於「${category}」，難度層級 ${tierDesc}。
${exclusion}
要求：
- 每個物件符合 GeneratedWord 介面
- category 欄位必須填 "${category}"
- tier 填 ${tier}
- 同義詞陣列至少 1 個；若真的沒有可填 []
- memoryHook 為字根/字首/臨床聯想，不含任何音標
- 例句 EN 需符合 NCLEX 臨床情境，例句 ZH 為繁體中文翻譯
- 只輸出 JSON 陣列，開頭 [ 結尾 ]`;
}

const MODEL = "claude-sonnet-4-6";

export interface BatchResult {
  words: GeneratedWord[];
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
  costUsd: number;
  raw: string;
}

export async function generateVocabBatch(opts: {
  category: string;
  tier: number;
  count: number;
  existingWords: string[];
}): Promise<BatchResult> {
  const prompt = buildVocabPrompt(opts);

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT.replace("{count}", String(opts.count)),
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: `以下為格式範例（這些字已收錄，不可重複）：\n${JSON.stringify(FEW_SHOT, null, 2)}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: prompt }],
  });

  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "[]";
  const usage = {
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    cacheReadTokens: (msg.usage as any).cache_read_input_tokens ?? 0,
    cacheWriteTokens: (msg.usage as any).cache_creation_input_tokens ?? 0,
  };
  const costUsd = calcCostUsd(MODEL, usage);

  let parsed: GeneratedWord[] = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    parsed = match ? JSON.parse(match[0]) : [];
  } catch {
    parsed = [];
  }

  const clean = parsed
    .filter((w): w is GeneratedWord =>
      !!w && typeof w.word === "string" && w.word.length > 0 &&
      typeof w.definitionZh === "string" && w.definitionZh.length > 0 &&
      typeof w.definitionEn === "string" && w.definitionEn.length > 0,
    )
    .map((w) => ({
      ...w,
      word: w.word.trim().toLowerCase(),
      category: opts.category,
      tier: opts.tier,
      difficulty: (w.difficulty ?? "MEDIUM") as "EASY" | "MEDIUM" | "HARD",
      synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
      memoryHook: (w.memoryHook ?? "").replace(/\[[^\]]*\]/g, "").trim(), // strip any stray phonetic brackets
    }));

  return { words: clean, usage, costUsd, raw };
}
