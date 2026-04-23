import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "contacted", "completed", "cancelled"]),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const requests = await prisma.upgradeRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, plan: true } },
    },
  });

  const pending = requests.filter((r) => r.status === "pending").length;
  return NextResponse.json({ requests, pending });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const { id, status } = patchSchema.parse(body);

    const updated = await prisma.upgradeRequest.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({ ok: true, request: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    console.error("[admin/upgrade-requests PATCH]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
