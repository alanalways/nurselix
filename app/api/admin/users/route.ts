import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const plan = url.searchParams.get("plan") ?? "";
  const role = url.searchParams.get("role") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? "30")));

  const where: Record<string, unknown> = {};
  if (plan && ["FREE", "BASIC", "PRO", "ELITE"].includes(plan)) where.plan = plan;
  if (role && ["STUDENT", "MODERATOR", "ADMIN"].includes(role)) where.role = role;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name:  { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, email: true, name: true, image: true, role: true, plan: true,
        isActive: true, lastLogin: true, createdAt: true,
        trialEndsAt: true,
        _count: { select: { answers: true, sessions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      answerCount: r._count.answers,
      sessionCount: r._count.sessions,
    })),
    total,
    page,
    pageSize,
  });
}
