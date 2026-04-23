import { NextRequest, NextResponse } from "next/server";
import { decryptTradeInfo, genTradeSha } from "@/lib/payment/newebpay";
import { prisma } from "@/lib/prisma";
import { sendMail, subscriptionConfirmedMail } from "@/lib/mail";

// NewebPay calls this endpoint directly (no user session)
// Must return plain text "1|OK" on success, "0|FAIL" on error

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const status = params.get("Status");
    const tradeInfo = params.get("TradeInfo") ?? "";
    const tradeSha = params.get("TradeSha") ?? "";

    // Verify TradeSha
    const expected = genTradeSha(tradeInfo);
    if (expected !== tradeSha) {
      console.error("[notify] TradeSha mismatch");
      return new NextResponse("0|FAIL", { status: 400 });
    }

    if (status !== "SUCCESS") {
      return new NextResponse("1|OK");
    }

    // Decrypt and parse trade result
    const decrypted = decryptTradeInfo(tradeInfo);
    let trade: { MerchantOrderNo: string; TradeNo: string; Amt: string; PayTime: string };
    try {
      trade = JSON.parse(decrypted);
    } catch (parseErr) {
      console.error("[notify] Failed to parse decrypted trade info:", parseErr);
      return new NextResponse("0|FAIL", { status: 400 });
    }

    const merchantOrderNo = trade.MerchantOrderNo;
    if (!merchantOrderNo) {
      console.error("[notify] Missing MerchantOrderNo in trade info");
      return new NextResponse("0|FAIL", { status: 400 });
    }

    // Find order and validate fields before committing anything.
    const order = await prisma.order.findFirst({
      where: { paymentRef: merchantOrderNo },
      include: { user: { select: { email: true, name: true } } },
    } as any);

    if (!order) {
      console.warn("[notify] Order not found for", merchantOrderNo);
      return new NextResponse("0|FAIL", { status: 404 });
    }

    // Idempotency: already processed — tell NewebPay to stop retrying.
    if ((order as any).status === "paid") {
      console.log("[notify] Order already paid, skipping:", merchantOrderNo);
      return new NextResponse("1|OK");
    }

    const billing = (order as any).billing as string | null;
    const plan = (order as any).plan as string | null;

    if (!billing || !plan) {
      console.error("[notify] Order missing billing or plan for", merchantOrderNo, { billing, plan });
      return new NextResponse("0|FAIL", { status: 422 });
    }

    const paidAt = new Date();
    const daysMap: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };
    const days = daysMap[billing] ?? 30;
    const subscriptionEndsAt = new Date(paidAt.getTime() + days * 24 * 60 * 60 * 1000);

    // Atomic update: only succeeds if status is still "pending".
    // If two webhooks race, only one will update (count=1), the other gets count=0.
    const { count } = await prisma.order.updateMany({
      where: { id: (order as any).id, status: "pending" },
      data: { status: "paid", paymentRef: trade.TradeNo, paidAt },
    });

    if (count === 0) {
      // Concurrent webhook beat us to it — safe to acknowledge.
      console.log("[notify] Concurrent webhook resolved for:", merchantOrderNo);
      return new NextResponse("1|OK");
    }

    // Upgrade user plan
    await prisma.user.update({
      where: { id: (order as any).userId },
      data: {
        plan,
        subscriptionEndsAt,
      } as any,
    });

    // Send confirmation email
    const userEmail = (order as any).user?.email;
    const userName = (order as any).user?.name ?? "同學";
    if (userEmail) {
      const mail = subscriptionConfirmedMail({
        name: userName,
        plan,
        billing,
        amount: (order as any).amount ?? 0,
        endsAt: subscriptionEndsAt.toLocaleDateString("zh-TW"),
      });
      sendMail({ to: userEmail, ...mail }).catch(() => {});
    }

    return new NextResponse("1|OK");
  } catch (err) {
    console.error("[payment/notify]", err);
    return new NextResponse("0|FAIL", { status: 500 });
  }
}
