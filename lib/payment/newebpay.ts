import crypto from "node:crypto";
import qs from "node:querystring";

const MERCHANT_ID = process.env.NEWEBPAY_MERCHANT_ID ?? "";
const HASH_KEY = process.env.NEWEBPAY_HASH_KEY ?? "";
const HASH_IV = process.env.NEWEBPAY_HASH_IV ?? "";
const API_URL = process.env.NEWEBPAY_API_URL ?? "https://core.newebpay.com/MPG/mpg_gateway";
const VERSION = process.env.NEWEBPAY_VERSION ?? "2.0";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

function pad32(s: string): Buffer {
  const buf = Buffer.alloc(32, 0);
  Buffer.from(s).copy(buf);
  return buf;
}

function pad16(s: string): Buffer {
  const buf = Buffer.alloc(16, 0);
  Buffer.from(s).copy(buf);
  return buf;
}

export function encryptTradeInfo(tradeInfoStr: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", pad32(HASH_KEY), pad16(HASH_IV));
  return cipher.update(tradeInfoStr, "utf8", "hex") + cipher.final("hex");
}

export function decryptTradeInfo(encrypted: string): string {
  const decipher = crypto.createDecipheriv("aes-256-cbc", pad32(HASH_KEY), pad16(HASH_IV));
  return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
}

export function genTradeSha(encryptedTradeInfo: string): string {
  const raw = `HashKey=${HASH_KEY}&${encryptedTradeInfo}&HashIV=${HASH_IV}`;
  return crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
}

export interface TradeParams {
  merchantOrderNo: string;
  amount: number;
  itemDesc: string;
  email: string;
}

export function buildPaymentForm(params: TradeParams): string {
  const tradeInfoObj: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    RespondType: "JSON",
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    Version: VERSION,
    MerchantOrderNo: params.merchantOrderNo,
    Amt: String(params.amount),
    ItemDesc: params.itemDesc,
    Email: params.email,
    NotifyURL: `${SITE_URL}/api/payment/newebpay/notify`,
    ReturnURL: `${SITE_URL}/api/payment/newebpay/return`,
    CustomerURL: `${SITE_URL}/pricing?cancelled=1`,
    LoginType: "0",
  };

  const tradeInfoStr = qs.stringify(tradeInfoObj);
  const tradeInfo = encryptTradeInfo(tradeInfoStr);
  const tradeSha = genTradeSha(tradeInfo);

  const fields = { MerchantID: MERCHANT_ID, TradeInfo: tradeInfo, TradeSha: tradeSha, Version: VERSION };
  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
    .join("");

  return `<form id="npForm" method="post" action="${API_URL}">${inputs}</form>
<script>document.getElementById('npForm').submit();</script>`;
}

export const PLAN_AMOUNTS: Record<string, Record<string, number>> = {
  BASIC:  { monthly: 299, quarterly: 807,  yearly: 2868 },
  PRO:    { monthly: 399, quarterly: 1077, yearly: 3190 },
  ELITE:  { monthly: 699, quarterly: 1887, yearly: 5590 },
};

export const PLAN_LABELS: Record<string, string> = {
  BASIC: "Basic 方案",
  PRO:   "Plus 方案",
  ELITE: "Premium 方案",
};
