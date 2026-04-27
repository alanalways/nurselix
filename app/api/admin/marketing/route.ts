import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const url = new URL(req.url);
  const contentType = url.searchParams.get("contentType");
  const status = url.searchParams.get("status");
  const where: any = {};
  if (contentType && contentType !== "all") where.contentType = contentType;
  if (status && status !== "all") where.status = status;
  const items = await prisma.marketingContent.findMany({
    where, take: 50, orderBy: { generatedAt: "desc" },
  });
  return NextResponse.json({ items });
}
