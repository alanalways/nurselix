import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const body = await req.json();
  const data: any = {};
  if (body.status) {
    data.status = body.status;
    if (body.status === "approved") data.approvedAt = new Date();
    if (body.status === "published") data.publishedAt = new Date();
  }
  if (body.publishedUrl) data.publishedUrl = body.publishedUrl;
  if (body.title !== undefined) data.title = body.title;
  if (body.body !== undefined) data.body = body.body;
  const updated = await prisma.marketingContent.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item: updated });
}
