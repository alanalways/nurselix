import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [all, mine] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { key: "asc" } }),
    prisma.userAchievement.findMany({
      where: { userId: session.user.id },
      include: { achievement: true },
      orderBy: { earnedAt: "desc" },
    }),
  ]);

  const mySet = new Map(mine.map((m) => [m.achievementId, m.earnedAt]));

  return NextResponse.json({
    total: all.length,
    earnedCount: mine.length,
    items: all.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      earned: mySet.has(a.id),
      earnedAt: mySet.get(a.id) ?? null,
    })),
  });
}
