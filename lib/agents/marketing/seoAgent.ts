/**
 * SEO Article Agent — generates blog articles for nclex / nursing keywords.
 * Uses MiniMax-M2.7 (cheap, fast).
 */
import { runAgent } from "../runAgent";
import { prisma } from "@/lib/prisma";

export interface SeoArticleSpec {
  topic: string;
  /** Primary keyword (zh) */
  keyword: string;
  /** Secondary keywords */
  relatedKeywords?: string[];
  /** Target word count (Chinese chars) */
  wordCount?: number;
  /** Tone: professional | friendly | exam-prep */
  tone?: "professional" | "friendly" | "exam-prep";
}

const SYSTEM_PROMPT = `你是 Nurslix（NCLEX-RN 護理考試備考平台）的 SEO 內容主筆。
你寫的每一篇文章都要：
1. 為台灣護理師赴美 NCLEX-RN 考試準備而寫
2. 提供實質學習價值（不要空話）
3. 自然嵌入關鍵字（避免堆疊）
4. 結構化 Markdown：H2/H3 分節、列點、重點粗體
5. 結尾自然引導到 Nurslix 平台
6. 繁體中文，必要時保留英文專有名詞

只輸出 markdown 文章本體，不要 code block 包裹。`;

export async function generateSeoArticle(spec: SeoArticleSpec): Promise<{ title: string; body: string; meta: any; modelUsed: string }> {
  const wordCount = spec.wordCount ?? 1200;
  const tone = spec.tone ?? "exam-prep";

  const userPrompt = `請寫一篇 SEO 部落格文章。

主題：${spec.topic}
主要關鍵字：${spec.keyword}
${spec.relatedKeywords?.length ? `相關關鍵字：${spec.relatedKeywords.join(", ")}` : ""}
目標字數：約 ${wordCount} 中文字
語氣：${tone}

請從一個吸引人的標題開始（H1，必須含主要關鍵字），然後寫文章本體。`;

  const result = await runAgent("marketing.seo", {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.7,
    timeoutMs: 120_000,
  });

  // Parse first H1 as title
  const text = result.text.trim();
  const titleMatch = text.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : spec.topic;
  const body = titleMatch ? text.replace(/^#\s+.+\n+/, "") : text;

  // Generate meta tags via simple extraction (or model could provide)
  const meta = {
    keyword: spec.keyword,
    relatedKeywords: spec.relatedKeywords ?? [],
    wordCount: body.length,
    description: text.split("\n").find(l => l.trim() && !l.startsWith("#"))?.slice(0, 155) ?? "",
  };

  return { title, body, meta, modelUsed: result.modelUsed };
}

/** Save the generated article as MarketingContent draft. */
export async function saveSeoArticle(article: { title: string; body: string; meta: any; modelUsed: string }) {
  return await prisma.marketingContent.create({
    data: {
      contentType: "SEO_ARTICLE",
      platform: "blog",
      title: article.title,
      body: article.body,
      meta: article.meta as any,
      modelUsed: article.modelUsed,
      status: "draft",
    },
  });
}
