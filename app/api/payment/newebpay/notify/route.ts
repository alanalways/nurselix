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
    const trade = JSON.parse(decrypted) as {
      MerchantOrderNo: string;
      TradeNo: string;
      Amt: string;
      PayTime: string;
    };

    const merchantOrderNo = trade.MerchantOrderNo;

    // Find order by paymentRef (we stored merchantOrderNo there)
    const order = await prisma.order.findFirst({
      where: { paymentRef: merchantOrderNo, status: "pending" },
      include: { user: { select: { email: true, name: true } } },
    } as any);

    if (!order) {
      console.warn("[notify] Order not found for", merchantOrderNo);
      return new NextResponse("0|FAIL", { status: 404 });
    }

    const paidAt = new Date();
    const billing = (order as any).billing as string;
    const subscriptionEndsAt = billing === "yearly"
      ? new Date(paidAt.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update order
    await prisma.order.update({
      where: { id: (order as any).id },
      data: { status: "paid", paymentRef: trade.TradeNo, paidAt },
    });

    // Upgrade user plan
    await prisma.user.update({
      where: { id: (order as any).userId },
      data: {
        plan: (order as any).plan,
        subscriptionEndsAt,
      } as any,
    });

    // Send confirmation email
    const userEmail = (order as any).user?.email;
    const userName = (order as any).user?.name ?? "同學";
    if (userEmail) {
      const mail = subscriptionConfirmedMail({
        name: userName,
        plan: (order as any).plan,
        billing,
        amount: (order as any).amount,
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
