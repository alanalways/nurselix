/**
 * GET /api/cron/marketing-daily
 *
 * Daily: marketing team agents produce content drafts.
 * Triggered by .github/workflows/cron-marketing-daily.yml at 10:00 UTC.
 */
import { NextRequest, NextResponse } from "next/server";
import { generateSocialPost, saveSocialPost } from "@/lib/agents/marketing/socialAgent";
import { generateSeoArticle, saveSeoArticle } from "@/lib/agents/marketing/seoAgent";
import { collectAnalyticsSnapshot, analyzeAndAdvise } from "@/lib/agents/marketing/analyticsAgent";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const NCLEX_TOPICS = [
  { topic: "急性心肌梗塞護理重點", keyword: "急性心肌梗塞 護理" },
  { topic: "敗血症一小時 bundle 處置流程", keyword: "敗血症 bundle" },
  { topic: "DKA 急救順序：補液、胰島素、鉀離子", keyword: "DKA 護理" },
  { topic: "顱內壓升高的禁忌動作", keyword: "顱內壓 護理" },
  { topic: "肝性腦病變的 lactulose 機轉", keyword: "肝性腦病變" },
  { topic: "甲狀腺風暴急救 protocol", keyword: "甲狀腺風暴" },
  { topic: "DVT 病人為何不能按摩", keyword: "DVT 護理" },
  { topic: "中央靜脈導管 (CVC) 換接頭防空氣栓塞", keyword: "CVC 護理" },
];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = Date.now();
  const results: any[] = [];

  // Pick today's topic by day-of-month modulo
  const day = new Date().getDate();
  const topic = NCLEX_TOPICS[day % NCLEX_TOPICS.length];

  // 1) Threads (primary platform — your ICP is on Threads/IG)
  try {
    const post = await generateSocialPost({ topic: topic.topic, platform: "threads", includeCTA: true });
    const saved = await saveSocialPost({ ...post, platform: "threads", topic: topic.topic });
    results.push({ task: "social_threads", ok: true, id: saved.id });
  } catch (e: any) { results.push({ task: "social_threads", ok: false, error: e.message }); }

  // 2) Instagram
  try {
    const post = await generateSocialPost({ topic: topic.topic, platform: "instagram", includeCTA: true });
    const saved = await saveSocialPost({ ...post, platform: "instagram", topic: topic.topic });
    results.push({ task: "social_ig", ok: true, id: saved.id });
  } catch (e: any) { results.push({ task: "social_ig", ok: false, error: e.message }); }

  // 3) Weekly SEO article (only on Mondays to save quota)
  if (new Date().getDay() === 1) {
    try {
      const article = await generateSeoArticle({ topic: topic.topic, keyword: topic.keyword, wordCount: 1200 });
      const saved = await saveSeoArticle(article);
      results.push({ task: "seo_article", ok: true, id: saved.id });
    } catch (e: any) { results.push({ task: "seo_article", ok: false, error: e.message }); }
  }

  // 4) Analytics insight (every Friday)
  if (new Date().getDay() === 5) {
    try {
      const snapshot = await collectAnalyticsSnapshot();
      const advice = await analyzeAndAdvise(snapshot);
      const saved = await prisma.marketingContent.create({
        data: {
          contentType: "AD_COPY",
          platform: "internal",
          title: `Marketing analytics ${new Date().toISOString().slice(0,10)}`,
          body: advice.analysis,
          meta: { snapshot } as any,
          modelUsed: advice.modelUsed,
          status: "draft",
        },
      });
      results.push({ task: "analytics", ok: true, id: saved.id });
    } catch (e: any) { results.push({ task: "analytics", ok: false, error: e.message }); }
  }

  return NextResponse.json({ ok: true, durationMs: Date.now() - start, results });
}
