/**
 * Email / Newsletter Agent — drafts EDM for subscribers.
 */
import { runAgent } from "../runAgent";
import { prisma } from "@/lib/prisma";

export interface EmailSpec {
  /** "weekly_newsletter" | "trial_ending" | "feature_announcement" | "win_back" | "exam_reminder" */
  campaign: string;
  /** Audience segment description */
  audience?: string;
  /** Specific data to include (stats, new features, study tips) */
  payload?: Record<string, any>;
}

const SYSTEM_PROMPT = `你是 Nurslix EDM 撰寫員。每封信必須：
1. 主旨行：≤ 30 字，引發開信
2. 開頭一句切重點，不要客套
3. 中段提供價值（學習提示、考試資訊、新功能、優惠）
4. 結尾明確 CTA（一個動作）
5. 繁體中文，溫暖但專業
6. 加 P.S. 補充一個小驚喜或溫馨提醒

格式：
SUBJECT: <主旨>
---
<信件本體 markdown>`;

export async function generateEmail(spec: EmailSpec): Promise<{ subject: string; body: string; modelUsed: string }> {
  const userPrompt = `Campaign：${spec.campaign}
${spec.audience ? `對象：${spec.audience}` : ""}
${spec.payload ? `資料：\n${JSON.stringify(spec.payload, null, 2)}` : ""}

請寫出 EDM。`;

  const result = await runAgent("marketing.email", {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.6,
    timeoutMs: 60_000,
  });

  // Parse "SUBJECT: ...\n---\n..."
  const text = result.text.trim();
  const subjectMatch = text.match(/^SUBJECT:\s*(.+)$/m);
  const subject = subjectMatch ? subjectMatch[1].trim() : `Nurslix - ${spec.campaign}`;
  const body = text.replace(/^SUBJECT:.+\n+---\n+/, "").trim();

  return { subject, body, modelUsed: result.modelUsed };
}

export async function saveEmailDraft(email: { subject: string; body: string; campaign: string; modelUsed: string }) {
  return await prisma.marketingContent.create({
    data: {
      contentType: "EMAIL",
      platform: "newsletter",
      title: email.subject,
      body: email.body,
      meta: { campaign: email.campaign },
      modelUsed: email.modelUsed,
      status: "draft",
    },
  });
}
