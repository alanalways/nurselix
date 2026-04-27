import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
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
