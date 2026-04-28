/**
 * POST /api/admin/marketing/run
 * body: { task: "social_x" | "social_ig" | "seo_article" | "analytics" | "email" }
 *
 * Manually trigger one marketing-team agent run.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { generateSocialPost, saveSocialPost } from "@/lib/agents/marketing/socialAgent";
import { generateSeoArticle, saveSeoArticle } from "@/lib/agents/marketing/seoAgent";
import { collectAnalyticsSnapshot, analyzeAndAdvise } from "@/lib/agents/marketing/analyticsAgent";
import { generateEmail, saveEmailDraft } from "@/lib/agents/marketing/emailAgent";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { task, payload } = await req.json();

  try {
    if (task === "social_x" || task === "social_ig") {
      const platform = task === "social_x" ? "x" : "instagram";
      const topic = payload?.topic || "今日 NCLEX 重點";
      const post = await generateSocialPost({ topic, platform: platform as any, includeCTA: true });
      const saved = await saveSocialPost({ ...post, platform: platform as any, topic });
      return NextResponse.json({ ok: true, id: saved.id });
    }
    if (task === "seo_article") {
      const topic = payload?.topic || "NCLEX 護理重點";
      const keyword = payload?.keyword || topic;
      const article = await generateSeoArticle({ topic, keyword, wordCount: 1200 });
      const saved = await saveSeoArticle(article);
      return NextResponse.json({ ok: true, id: saved.id });
    }
    if (task === "analytics") {
      const snap = await collectAnalyticsSnapshot();
      const advice = await analyzeAndAdvise(snap);
      const saved = await prisma.marketingContent.create({
        data: {
          contentType: "AD_COPY", platform: "internal",
          title: `Marketing analytics ${new Date().toISOString().slice(0,10)}`,
          body: advice.analysis, meta: { snapshot: snap } as any,
          modelUsed: advice.modelUsed, status: "draft",
        },
      });
      return NextResponse.json({ ok: true, id: saved.id, snapshot: snap });
    }
    if (task === "email") {
      const campaign = payload?.campaign || "weekly_newsletter";
      const email = await generateEmail({ campaign, audience: payload?.audience, payload: payload?.data });
      const saved = await saveEmailDraft({ ...email, campaign });
      return NextResponse.json({ ok: true, id: saved.id });
    }
    return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
