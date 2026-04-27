import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
