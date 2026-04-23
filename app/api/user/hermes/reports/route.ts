import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = (session.user as any).plan ?? "FREE";
  if (plan === "FREE" || plan === "BASIC") {
    return NextResponse.json({ reports: [], locked: true });
  }

  const { searchParams } = new URL(req.url);
  const pageRaw = parseInt(searchParams.get("page") ?? "1");
  const page = Math.max(1, Number.isNaN(pageRaw) ? 1 : pageRaw);
  const pageSize = 10;

  const [reports, total] = await Promise.all([
    prisma.hermesReport.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        insightSummary: true,
        nextActions: true,
        studyPlan: true,
        keyInsight: true,
        confidenceBand: true,
        recentTrend: true,
        mistakeTypes: true,
        weakDomains: true,
        createdAt: true,
      },
    }),
    prisma.hermesReport.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ reports, total, page, pageSize, locked: false });
}
