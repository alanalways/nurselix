import Link from "next/link";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";

export const metadata = {
  title: "服務條款 | Nurslix",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <nav className="border-b border-[var(--border-subtle)] px-6 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
            <NurslixIconSquare size={20} className="text-[#080E1A]" />
          </div>
          <span className="font-bold text-lg text-gradient-gold">Nurslix</span>
        </Link>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12 space-y-6 text-[var(--text-secondary)] leading-relaxed">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">服務條款</h1>
        <p className="text-sm text-[var(--text-muted)]">最後更新：2026 年 4 月</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">1. 接受條款</h2>
          <p>使用 Nurslix 平台（以下簡稱「本服務」）即表示您同意遵守本服務條款。若您不同意，請勿使用本服務。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">2. 服務性質</h2>
          <p>本服務為教育性質之 NCLEX-RN 線上備考與學習輔助平台，提供模擬試題、學習分析與 AI 輔助工具。<strong className="text-[var(--text-primary)]">本服務不是官方考試</strong>，亦不保證使用者能通過任何考試。</p>
          <p>NCLEX-RN® 為美國 National Council of State Boards of Nursing (NCSBN) 的註冊商標。本平台與 NCSBN 無任何隸屬、贊助、授權或背書關係。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">3. 醫療免責</h2>
          <p>本服務所載臨床情境題目、解析及 AI 分析僅供考試練習之用，<strong className="text-[var(--text-primary)]">不構成醫療建議、診斷或治療依據</strong>。使用者不得將本服務內容用於實際臨床決策、病患照護或醫療諮詢。</p>
          <p>任何實際臨床問題應尋求合格醫療人員之建議。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">4. 帳戶與密碼</h2>
          <p>您須對自己的帳戶與密碼妥善保管，並對所有以該帳戶進行之活動負責。若發現未授權使用，請立即通知我們。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">5. 訂閱與付款</h2>
          <p>付費方案採單次付款，不自動續訂。訂閱期間結束後，您的方案會自動降級為 Free。您可隨時在設定中取消訂閱，已支付的費用不予退費（除非法律另有規定）。</p>
          <p>付款由第三方金流（藍新金流）處理，Nurslix 不儲存您的信用卡資訊。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">6. 智慧財產權</h2>
          <p>本服務所有題目、解析、UI、商標等內容之著作權與其他智慧財產權均屬 Nurslix 所有，<strong className="text-[var(--text-primary)]">未經書面同意不得複製、散布、公開傳輸或作商業用途</strong>。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">7. 使用限制</h2>
          <p>您不得：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>以自動化程式、爬蟲或任何方式大量下載題庫內容</li>
            <li>分享帳號、重製或散布本服務之任何內容</li>
            <li>進行任何可能損害本服務安全性或穩定性的行為</li>
            <li>假冒他人身分或提供不實資料</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">8. 服務變更與中止</h2>
          <p>我們保留隨時修改、暫停或終止本服務之權利，若有重大變更將提前以 email 通知。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">9. 責任限制</h2>
          <p>在法律允許的最大範圍內，Nurslix 對因使用或無法使用本服務而造成之任何直接、間接、偶然、衍生性損害不負賠償責任。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">10. 聯絡方式</h2>
          <p>如有任何問題，請透過服務內「設定 → 客服」與我們聯繫。</p>
        </section>

        <div className="pt-8 text-sm">
          <Link href="/" className="text-[var(--gold)] hover:underline">← 返回首頁</Link>
        </div>
      </article>
    </div>
  );
}
