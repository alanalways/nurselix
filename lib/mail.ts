import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn("[mail] GMAIL_USER or GMAIL_APP_PASSWORD missing — mail sending disabled");
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail({ to, subject, html, text }: SendMailParams): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) return false;

  const from = process.env.GMAIL_USER
    ? `Nurslix <${process.env.GMAIL_USER}>`
    : "Nurslix";

  try {
    await tx.sendMail({
      from,
      to,
      subject,
      text: text ?? stripHtml(html),
      html,
    });
    return true;
  } catch (err) {
    console.error("[mail] send failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ============================================================================
// Templates
// ============================================================================

export function passwordResetMail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Nurslix 密碼重設連結",
    html: `
      <div style="font-family: 'Noto Sans TC', Arial, sans-serif; max-width:540px; margin:0 auto; padding:32px; background:#0D1525; color:#EDF0F7; border-radius:12px;">
        <div style="text-align:center; margin-bottom:24px;">
          <div style="display:inline-block; padding:12px 18px; background:linear-gradient(135deg,#C9A84C,#E8C66A); border-radius:10px; font-size:22px; font-weight:700; color:#080E1A; letter-spacing:1px;">Nurslix</div>
        </div>
        <h2 style="margin:0 0 12px 0; color:#C9A84C;">重設密碼</h2>
        <p style="line-height:1.7; color:#8A9BB5;">您剛剛在 Nurslix 申請了密碼重設。請點擊下方按鈕設定新密碼，連結將於 <strong style="color:#EDF0F7;">1 小時後失效</strong>。</p>
        <p style="text-align:center; margin:28px 0;">
          <a href="${resetUrl}" style="display:inline-block; padding:12px 28px; background:#C9A84C; color:#080E1A; text-decoration:none; border-radius:8px; font-weight:600;">重設我的密碼</a>
        </p>
        <p style="font-size:12px; color:#4A5A70; line-height:1.6;">如果按鈕無法使用，請複製下列連結到瀏覽器：<br/>${resetUrl}</p>
        <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:24px 0;">
        <p style="font-size:12px; color:#4A5A70;">如果您沒有申請此操作，可以安全忽略此信。</p>
      </div>
    `,
  };
}

export function weeklyReportMail(stats: {
  name: string;
  questionsDone: number;
  accuracy: number;
  streak: number;
  topDomain: string;
  weakDomain: string;
}): { subject: string; html: string } {
  return {
    subject: "Nurslix 本週學習週報",
    html: `
      <div style="font-family:'Noto Sans TC', Arial, sans-serif; max-width:600px; margin:0 auto; padding:32px; background:#0D1525; color:#EDF0F7; border-radius:12px;">
        <h2 style="color:#C9A84C;">${stats.name}，這是你本週的備考進度</h2>
        <div style="display:flex; gap:16px; margin:24px 0;">
          <div style="flex:1; background:#132035; padding:16px; border-radius:10px; text-align:center;">
            <div style="font-size:28px; color:#C9A84C; font-weight:700;">${stats.questionsDone}</div>
            <div style="font-size:13px; color:#8A9BB5;">練習題數</div>
          </div>
          <div style="flex:1; background:#132035; padding:16px; border-radius:10px; text-align:center;">
            <div style="font-size:28px; color:#2ECC71; font-weight:700;">${stats.accuracy}%</div>
            <div style="font-size:13px; color:#8A9BB5;">正確率</div>
          </div>
          <div style="flex:1; background:#132035; padding:16px; border-radius:10px; text-align:center;">
            <div style="font-size:28px; color:#4A90D9; font-weight:700;">${stats.streak}</div>
            <div style="font-size:13px; color:#8A9BB5;">連續天數</div>
          </div>
        </div>
        <p style="color:#8A9BB5; line-height:1.7;">強項：<strong style="color:#2ECC71;">${stats.topDomain}</strong></p>
        <p style="color:#8A9BB5; line-height:1.7;">建議加強：<strong style="color:#F39C12;">${stats.weakDomain}</strong></p>
      </div>
    `,
  };
}
