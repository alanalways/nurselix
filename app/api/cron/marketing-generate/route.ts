/**
 * GET /api/cron/marketing-generate
 *
 * On-demand social post generation. Lets you trigger a fresh batch any time
 * without waiting for the daily cron. Generates Threads + Instagram drafts
 * for the topic supplied (or rotates today's NCLEX topic by default).
 *
 * Guarded by CRON_SECRET. AI never publishes anywhere — output is saved as
 * MarketingContent rows with status='draft' for admin review.
 *
 * Query params:
 *   ?topic=<string>   Optional — overrides today's auto-picked topic
 *   ?platforms=threads,instagram   Optional — defaults to both
 *   ?count=2          Optional — drafts per platform (1-3). Default 1.
 */
import { NextRequest, NextResponse } from "next/server";
import { generateSocialPost, saveSocialPost, type SocialPlatform } from "@/lib/agents/marketing/socialAgent";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const NCLEX_TOPICS = [
  { topic: "急性心肌梗塞護理重點", keyword: "急性心肌梗塞 護理" },
  { topic: "敗血症一小時 bundle 處置流程", keyword: "敗血症 bundle" },
  { topic: "DKA 急救順序：補液、胰島素、鉀離子", keyword: "DKA 護理" },
  { topic: "顱內壓升高的禁忌動作", keyword: "顱內壓 護理" },
  { topic: "肝性腦病變的 lactulose 機轉", keyword: "肝性腦病變" },
  { topic: "甲狀腺風暴急救 protocol", keyword: "甲狀腺風暴" },
  { topic: "DVT 病人為何不能按摩", keyword: "DVT 護理" },
  { topic: "中央靜脈導管 (CVC) 換接頭防空氣栓塞", keyword: "CVC 護理" },
  { topic: "Priority setting 的 ABC 法則考點", keyword: "Priority setting ABC" },
  { topic: "ABG 三步驟判讀法", keyword: "ABG 判讀" },
  { topic: "高血鉀 EKG 變化與處置順序", keyword: "高血鉀 EKG" },
  { topic: "Suction 該抽幾秒？常見錯誤", keyword: "Suction 抽痰" },
];

const ALLOWED_PLATFORMS = new Set<SocialPlatform>(["threads", "instagram", "facebook", "x", "linkedin"]);

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const topicOverride = url.searchParams.get("topic");
  const platformsParam = url.searchParams.get("platforms") ?? "threads,instagram";
  const count = Math.max(1, Math.min(3, Number(url.searchParams.get("count") ?? "1")));

  const platforms = platformsParam
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is SocialPlatform => ALLOWED_PLATFORMS.has(p as SocialPlatform));

  if (platforms.length === 0) {
    return NextResponse.json({ error: "No valid platforms. Use threads, instagram, facebook, x, linkedin." }, { status: 400 });
  }

  const day = new Date().getDate();
  const topic = topicOverride ?? NCLEX_TOPICS[day % NCLEX_TOPICS.length].topic;

  const start = Date.now();
  const results: Array<{ platform: string; ok: boolean; id?: string; preview?: string; error?: string }> = [];

  for (const platform of platforms) {
    for (let i = 0; i < count; i++) {
      try {
        const post = await generateSocialPost({ topic, platform, includeCTA: true });
        const saved = await saveSocialPost({ ...post, platform, topic });
        results.push({
          platform,
          ok: true,
          id: saved.id,
          preview: post.body.slice(0, 80) + (post.body.length > 80 ? "…" : ""),
        });
      } catch (e: any) {
        results.push({ platform, ok: false, error: e.message?.slice(0, 200) });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    topic,
    durationMs: Date.now() - start,
    generated: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
