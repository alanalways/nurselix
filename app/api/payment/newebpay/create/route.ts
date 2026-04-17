import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPaymentForm, PLAN_AMOUNTS, PLAN_LABELS } from "@/lib/payment/newebpay";

const schema = z.object({
  plan: z.enum(["BASIC", "PRO", "ELITE"]),
  billing: z.enum(["monthly", "quarterly", "yearly"]),
});

const BILLING_LABEL: Record<string, string> = {
  monthly: "月付",
  quarterly: "季付",
  yearly: "年付",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { plan, billing } = schema.parse(body);

    const amount = PLAN_AMOUNTS[plan]?.[billing];
    if (!amount) return NextResponse.json({ error: "無效方案" }, { status: 400 });

    const merchantOrderNo = `NX${Date.now()}`.slice(0, 30);

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        plan: plan as "BASIC" | "PRO" | "ELITE",
        billing,
        amount,
        currency: "TWD",
        status: "pending",
      },
    });

    const formHtml = buildPaymentForm({
      merchantOrderNo,
      amount,
      itemDesc: `Nurslix ${PLAN_LABELS[plan]} (${BILLING_LABEL[billing]})`,
      email: session.user.email,
    });

    // Store merchantOrderNo → orderId mapping in order's paymentRef temporarily
    await prisma.order.update({ where: { id: order.id }, data: { paymentRef: merchantOrderNo } });

    return NextResponse.json({ formHtml, orderId: order.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    console.error("[payment/create]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
