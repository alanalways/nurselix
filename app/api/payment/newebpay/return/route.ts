import { NextRequest, NextResponse } from "next/server";
import { decryptTradeInfo } from "@/lib/payment/newebpay";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const status = params.get("Status");
    const tradeInfo = params.get("TradeInfo") ?? "";

    if (status !== "SUCCESS" || !tradeInfo) {
      return NextResponse.redirect(`${SITE_URL}/payment/failed?reason=${encodeURIComponent(status ?? "unknown")}`);
    }

    const decrypted = decryptTradeInfo(tradeInfo);
    const trade = JSON.parse(decrypted) as { MerchantOrderNo: string };

    const order = await prisma.order.findFirst({
      where: { paymentRef: trade.MerchantOrderNo },
      select: { id: true, status: true },
    });

    const orderId = order?.id ?? "";
    return NextResponse.redirect(`${SITE_URL}/payment/success?orderId=${orderId}`);
  } catch (err) {
    console.error("[payment/return]", err);
    return NextResponse.redirect(`${SITE_URL}/payment/failed?reason=error`);
  }
}
