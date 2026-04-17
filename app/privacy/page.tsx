import Link from "next/link";
import { Stethoscope } from "lucide-react";

export const metadata = {
  title: "隱私權政策 | Nurslix",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <nav className="border-b border-[var(--border-subtle)] px-6 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
            <Stethoscope size={16} className="text-[#080E1A]" />
          </div>
          <span className="font-bold text-lg text-gradient-gold">Nurslix</span>
        </Link>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12 space-y-6 text-[var(--text-secondary)] leading-relaxed">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">隱私權政策</h1>
        <p className="text-sm text-[var(--text-muted)]">最後更新：2026 年 4 月</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">1. 我們收集的資料</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-[var(--text-primary)]">帳戶資料</strong>：email、姓名、密碼（經 bcrypt 雜湊儲存，我們看不到原始密碼）</li>
            <li><strong className="text-[var(--text-primary)]">學習紀錄</strong>：答題歷程、分數、θ 能力值、錯題統計</li>
            <li><strong className="text-[var(--text-primary)]">使用行為</strong>：登入時間、使用的功能、考試模式</li>
            <li><strong className="text-[var(--text-primary)]">付款紀錄</strong>：訂單編號、方案、金額（實際付款資訊由藍新金流處理，Nurslix 不儲存信用卡資訊）</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">2. 資料用途</h2>
          <p>我們僅在以下情境使用您的資料：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>提供個人化學習體驗與 AI 分析</li>
            <li>處理訂閱與付款</li>
            <li>寄送訂單確認、學習週報等服務通知</li>
            <li>改善平台功能（以匿名統計方式）</li>
          </ul>
          <p><strong className="text-[var(--text-primary)]">我們不會將您的個人資料出售、出租或交換給第三方</strong>。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">3. AI 模型與資料</h2>
          <p>Hermes AI 使用 Anthropic Claude API 分析您的答題紀錄，資料會以加密方式傳送至 Anthropic。Anthropic 依其政策<strong className="text-[var(--text-primary)]">不會將 API 資料用於模型訓練</strong>。</p>
          <p>傳送給 Claude 的資料僅包含答題的 domain/difficulty/正確與否等統計資訊，<strong className="text-[var(--text-primary)]">不含您的個人識別資訊（如 email、姓名）</strong>。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">4. 第三方服務</h2>
          <p>我們使用以下第三方服務：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-[var(--text-primary)]">Google OAuth</strong>：登入驗證</li>
            <li><strong className="text-[var(--text-primary)]">藍新金流 (NewebPay)</strong>：付款處理</li>
            <li><strong className="text-[var(--text-primary)]">Gmail SMTP</strong>：寄送交易相關 email</li>
            <li><strong className="text-[var(--text-primary)]">Anthropic Claude API</strong>：AI 分析</li>
            <li><strong className="text-[var(--text-primary)]">Zeabur</strong>：雲端主機與資料庫</li>
          </ul>
          <p>各服務均遵循各自的隱私權政策。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">5. Cookie 使用</h2>
          <p>我們使用必要的 cookie 維持登入狀態與記住您的偏好設定，不使用追蹤型廣告 cookie。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">6. 資料保護</h2>
          <p>所有資料傳輸均採 HTTPS 加密，密碼經 bcrypt 雜湊儲存。資料庫每日自動備份，備份檔亦加密儲存。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">7. 您的權利</h2>
          <p>根據《個人資料保護法》，您有權：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>查詢、閱覽您的個人資料</li>
            <li>請求補充或更正（設定頁可直接修改）</li>
            <li>請求停止使用或刪除（刪除帳號後資料立即移除，備份於 30 天內清除）</li>
            <li>請求製作複本（匯出學習資料）</li>
          </ul>
          <p>如需行使上述權利，請透過「設定 → 客服」聯繫我們。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">8. 未成年使用者</h2>
          <p>本服務不主動針對 13 歲以下使用者。若您未滿 18 歲，請在家長或監護人同意下使用本服務。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">9. 政策更新</h2>
          <p>若本政策有重大變更，我們會以 email 通知並在平台內公告。繼續使用本服務即視為同意更新後的政策。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">10. 聯絡方式</h2>
          <p>隱私權相關問題請透過「設定 → 客服」與我們聯繫。</p>
        </section>

        <div className="pt-8 text-sm">
          <Link href="/" className="text-[var(--gold)] hover:underline">← 返回首頁</Link>
        </div>
      </article>
    </div>
  );
}
