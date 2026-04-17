import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { ACHIEVEMENT_DEFS } from "@/lib/nclex/achievementDefs";

export async function POST() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  let inserted = 0;
  let updated = 0;

  for (const def of ACHIEVEMENT_DEFS) {
    const existing = await prisma.achievement.findUnique({ where: { key: def.key } });
    if (existing) {
      if (existing.name !== def.name || existing.description !== def.description || existing.icon !== def.icon) {
        await prisma.achievement.update({
          where: { key: def.key },
          data: { name: def.name, description: def.description, icon: def.icon },
        });
        updated++;
      }
    } else {
      await prisma.achievement.create({
        data: { key: def.key, name: def.name, description: def.description, icon: def.icon },
      });
      inserted++;
    }
  }

  const total = await prisma.achievement.count();

  return NextResponse.json({
    ok: true,
    inserted,
    updated,
    total,
    message: `✓ ${inserted} 新增, ${updated} 更新, 共 ${total} 個成就`,
  });
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const total = await prisma.achievement.count();
  return NextResponse.json({ total, expected: ACHIEVEMENT_DEFS.length });
}
