/**
 * Admin: list / search / delete vocabulary entries.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { VOCAB_CATEGORIES } from "@/lib/vocab/generateBatch";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category") ?? "";
  const tier = url.searchParams.get("tier");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? "30")));

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (tier) where.tier = Number(tier);
  if (search) {
    where.OR = [
      { word:         { contains: search, mode: "insensitive" } },
      { definitionZh: { contains: search, mode: "insensitive" } },
      { definitionEn: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.vocabularyWord.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vocabularyWord.count({ where }),
  ]);

  return NextResponse.json({ rows, total, page, pageSize, categories: VOCAB_CATEGORIES });
}

const patchSchema = z.object({
  id: z.string().min(1),
  word: z.string().min(1).optional(),
  definitionEn: z.string().min(1).optional(),
  definitionZh: z.string().min(1).optional(),
  exampleEn: z.string().optional(),
  exampleZh: z.string().optional(),
  synonyms: z.array(z.string()).optional(),
  memoryHook: z.string().optional(),
  category: z.string().optional(),
  tier: z.number().int().min(1).max(3).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  status: z.enum(["DRAFT", "APPROVED", "ARCHIVED"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const updated = await prisma.vocabularyWord.update({ where: { id }, data, select: { id: true } });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.vocabularyWord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
