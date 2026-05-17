/**
 * Admin Hermes endpoint — 考試倒數提醒。
 * 掃描 examDate 在 7、3、1 天內的使用者，寄送衝刺信。
 * Auth: Bearer HERMES_ADMIN_API_KEY 或 CRON_SECRET。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, examReminderMail } from "@/lib/mail";
import { ipRateLimit, getClientIp } from "@/lib/utils/rateLimit";

function verifyAdminSecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const hermesKey = process.env.HERMES_ADMIN_API_KEY;
  const cronKey = process.env.CRON_SECRET;
  if (hermesKey && auth === `Bearer ${hermesKey}`) return true;
  if (cronKey && auth === `Bearer ${cronKey}`) return true;
  return false;
}

const REMINDER_DAYS = [7, 3, 1];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function POST(req: NextRequest) {
  // Defence-in-depth: rate-limit by IP before auth check so a leaked secret
  // can't be brute-fired to drain mail quota.
  const rl = await ipRateLimit(getClientIp(req), { limit: 30, windowSec: 3600 });
  if (!rl.success) return NextResponse.json({ error: "rate limited" }, { status: 429 });

  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in8Days = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      examDate: { gte: now, lt: in8Days },
      email: { not: "" },
      isActive: true,
    },
    select: { id: true, email: true, name: true, examDate: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.email || !user.examDate) { skipped++; continue; }
    const daysLeft = daysBetween(now, user.examDate);
    if (!REMINDER_DAYS.includes(daysLeft)) { skipped++; continue; }

    const mail = examReminderMail({
      name: user.name ?? "同學",
      daysLeft,
      examDate: formatDate(user.examDate),
    });

    const ok = await sendMail({ to: user.email, ...mail });
    if (ok) sent++; else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped, scanned: users.length });
}
