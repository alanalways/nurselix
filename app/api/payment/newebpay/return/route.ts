import { NextRequest, NextResponse } from "next/server";
import { decryptTradeInfo, genTradeSha } from "@/lib/payment/newebpay";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const status = params.get("Status");
    const tradeInfo = params.get("TradeInfo") ?? "";
    const tradeSha = params.get("TradeSha") ?? "";

    if (status !== "SUCCESS" || !tradeInfo) {
      return NextResponse.redirect(`${SITE_URL}/payment/failed?reason=${encodeURIComponent(status ?? "unknown")}`);
    }

    // Verify signature to prevent forged return payloads
    const expectedSha = genTradeSha(tradeInfo);
    if (tradeSha.toUpperCase() !== expectedSha.toUpperCase()) {
      console.error("[payment/return] TradeSha mismatch — possible forgery");
      return NextResponse.redirect(`${SITE_URL}/payment/failed?reason=invalid_signature`);
    }

    const decrypted = decryptTradeInfo(tradeInfo);
    let trade: { MerchantOrderNo: string };
    try {
      trade = JSON.parse(decrypted);
    } catch {
      console.error("[payment/return] Failed to parse decrypted trade info");
      return NextResponse.redirect(`${SITE_URL}/payment/failed?reason=parse_error`);
    }

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
