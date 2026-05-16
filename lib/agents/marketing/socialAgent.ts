/**
 * Social Media Post Agent — generates short-form posts for X / Threads / IG / FB.
 */
import { runAgent } from "../runAgent";
import { prisma } from "@/lib/prisma";

export type SocialPlatform = "x" | "threads" | "instagram" | "facebook" | "linkedin";

export interface SocialSpec {
  topic: string;
  platform: SocialPlatform;
  /** A nursing tip / fact / mnemonic to base the post on */
  hook?: string;
  /** Whether to include CTA to Nurslix */
  includeCTA?: boolean;
}

const PLATFORM_LIMITS: Record<SocialPlatform, { maxChars: number; style: string }> = {
  x:         { maxChars: 280,  style: "punchy, single-thread or thread of ≤5" },
  threads:   { maxChars: 500,  style: "conversational, can be longer than X" },
  instagram: { maxChars: 2200, style: "story-driven, emoji-friendly, line breaks for readability, hashtags at end" },
  facebook:  { maxChars: 1500, style: "warm community tone, can include question to engage" },
  linkedin:  { maxChars: 1300, style: "professional, insight-focused, suitable for nursing professionals" },
};

const SYSTEM_PROMPT = `你是 Nurslix 社群編輯。寫給準備 NCLEX-RN 的台灣護理師看。

每則貼文必須：
1. 第一句話就抓住注意力（hook）— 例如「DKA 第一步打 insulin？錯了。」
2. 提供一個具體的護理知識/考點/技巧（不要空泛）
3. 符合該平台的風格與字數限制
4. 繁體中文為主，英文術語自然保留（不用翻譯）
5. **絕對不要寫得像廣告**。寫成「同學跟同學聊」的口氣
6. 避免空洞用詞：「掌握」「精通」「全面」「優質」這類詞一律不用
7. 適度使用 emoji（1-3 個），不要堆疊
8. 如果要 CTA，寫一句口語的引導（例：「我做了個 14k 題的免費題庫，連結放第一則回覆」）

不要寫的東西：
- ❌ 不要承諾「保證通過 NCLEX」「100% 過考」
- ❌ 不要編造醫學數據（不確定就不寫）
- ❌ 不要提及其他人的真實姓名／email
- ❌ 不要寫競品名（UWorld / Kaplan 等）的負面內容

只輸出貼文本體（含必要的 hashtag），不要解釋、不要前言、不要 markdown 標題。`;

export async function generateSocialPost(spec: SocialSpec): Promise<{ body: string; modelUsed: string }> {
  const limit = PLATFORM_LIMITS[spec.platform];
  const userPrompt = `平台：${spec.platform}（最多 ${limit.maxChars} 字符，風格：${limit.style}）
主題：${spec.topic}
${spec.hook ? `Hook 素材：${spec.hook}` : ""}
${spec.includeCTA ? "結尾加自然 CTA 引導至 Nurslix（一句話即可）" : ""}

寫出貼文。`;

  const result = await runAgent("marketing.social", {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.8,
    timeoutMs: 60_000,
  });

  return { body: result.text.trim(), modelUsed: result.modelUsed };
}

export async function saveSocialPost(post: { body: string; platform: SocialPlatform; topic: string; modelUsed: string }) {
  return await prisma.marketingContent.create({
    data: {
      contentType: "SOCIAL_POST",
      platform: post.platform,
      title: post.topic,
      body: post.body,
      modelUsed: post.modelUsed,
      status: "draft",
    },
  });
}
