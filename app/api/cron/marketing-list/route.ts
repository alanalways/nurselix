/**
 * GET /api/cron/marketing-list
 *
 * Lists existing marketing drafts so you can copy-paste into Threads/IG
 * manually. Read-only.
 *
 * Query params:
 *   ?platform=threads,instagram   Optional — filter by platform
 *   ?status=draft                  Optional — defaults to draft
 *   ?take=20                       Optional — max 50
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const platformFilter = url.searchParams.get("platform");
  const status = url.searchParams.get("status") ?? "draft";
  const take = Math.max(1, Math.min(50, Number(url.searchParams.get("take") ?? "20")));

  const where: Record<string, unknown> = { status };
  if (platformFilter) {
    where.platform = { in: platformFilter.split(",").map((s) => s.trim()) };
  }

  const rows = await prisma.marketingContent.findMany({
    where,
    orderBy: { generatedAt: "desc" },
    take,
    select: {
      id: true,
      platform: true,
      contentType: true,
      title: true,
      body: true,
      modelUsed: true,
      status: true,
      generatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    count: rows.length,
    drafts: rows,
  });
}
