import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  plan: z.enum(["BASIC", "PRO", "ELITE"]),
  billing: z.enum(["monthly", "quarterly", "yearly"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const input = schema.parse(body);

    // One pending/contacted request at a time per user
    const existing = await prisma.upgradeRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["pending", "contacted"] },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "你已有一筆申請處理中，請等待管理員聯繫" },
        { status: 409 },
      );
    }

    const request = await prisma.upgradeRequest.create({
      data: {
        userId: session.user.id,
        plan: input.plan as any,
        billing: input.billing,
        note: input.note ?? null,
      },
    });

    return NextResponse.json({ ok: true, id: request.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("[upgrade-request POST]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
