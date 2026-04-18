"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Star, Mail, Loader2 } from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Footer from "@/components/ui/Footer";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Billing = "monthly" | "quarterly" | "yearly";

const plans = [
  {
    key: "FREE",
    name: "Free",
    prices: { monthly: 0, quarterly: 0, yearly: 0 },
    quarterlyTotal: 0,
    yearlyTotal: 0,
    description: "試用看看 Nurslix",
    features: [
      { text: "每日 10 題練習", included: true },
      { text: "7天 Plus 免費試用", included: true },
      { text: "Mini CAT 體驗（每月一次）", included: true },
      { text: "每日挑戰", included: true },
      { text: "練習模式", included: true },
      { text: "Tutor 模式", included: false },
      { text: "CAT / Mock 考試", included: false },
      { text: "錯題本（50題）", included: true },
    ],
    highlight: false,
  },
  {
    key: "BASIC",
    name: "Basic",
    prices: { monthly: 299, quarterly: 269, yearly: 239 },
    quarterlyTotal: 807,   // 269 × 3
    yearlyTotal: 2868,     // 239 × 12
    description: "每日穩定練習",
    features: [
      { text: "每日 100 題練習", included: true },
      { text: "練習模式 + Tutor 模式", included: true },
      { text: "錯題本（500題）", included: true },
      { text: "台美差異提示", included: true },
      { text: "考前倒數計時器", included: true },
      { text: "基本雷達圖", included: true },
      { text: "CAT / Mock 考試", included: false },
      { text: "AI 學習分析", included: false },
    ],
    highlight: false,
  },
  {
    key: "PRO",
    name: "Plus",
    prices: { monthly: 399, quarterly: 359, yearly: 266 },
    quarterlyTotal: 1077,  // 359 × 3
    yearlyTotal: 3190,     // 266 × 12
    description: "認真備考的最佳選擇",
    features: [
      { text: "無限答題", included: true },
      { text: "全模式（CAT + Mock + Tutor）", included: true },
      { text: "無限錯題本", included: true },
      { text: "完整能力雷達圖 + 弱點分析", included: true },
      { text: "學習週報 email", included: true },
      { text: "考前倒數 + 提醒通知", included: true },
      { text: "Hermes AI 學習分析", included: true },
      { text: "AI 個人學習計畫（每月）", included: false },
    ],
    highlight: true,
  },
  {
    key: "ELITE",
    name: "Premium",
    prices: { monthly: 699, quarterly: 629, yearly: 466 },
    quarterlyTotal: 1887,  // 629 × 3
    yearlyTotal: 5590,     // 466 × 12
    description: "全方位 AI 備考支援",
    features: [
      { text: "Plus 所有功能", included: true },
      { text: "Hermes AI 每週弱點報告", included: true },
      { text: "AI 個人學習計畫（每月）", included: true },
      { text: "優先客服支援", included: true },
      { text: "Premium 成就徽章", included: true },
      { text: "早期新功能搶先體驗", included: true },
      { text: "∞ 一切功能無上限", included: true },
      { text: "", included: true },
    ],
    highlight: false,
  },
];

const featureTable = [
  { feature: "每日題數", free: "10 題", basic: "100 題", pro: "無限", elite: "無限" },
  { feature: "7天 Plus 試用", free: "✅ 一次", basic: "❌", pro: "❌", elite: "❌" },
  { feature: "Mini CAT 體驗", free: "每月一次", basic: "✅", pro: "✅", elite: "✅" },
  { feature: "練習模式", free: "✅", basic: "✅", pro: "✅", elite: "✅" },
  { feature: "Tutor 模式", free: "❌", basic: "✅", pro: "✅", elite: "✅" },
  { feature: "CAT 模式", free: "❌", basic: "❌", pro: "✅", elite: "✅" },
  { feature: "Mock 考試", free: "❌", basic: "❌", pro: "✅", elite: "✅" },
  { feature: "錯題本", free: "50 題", basic: "500 題", pro: "無限", elite: "無限" },
  { feature: "台美差異提示", free: "❌", basic: "✅", pro: "✅", elite: "✅" },
  { feature: "能力雷達圖", free: "❌", basic: "基本", pro: "完整", elite: "完整" },
  { feature: "學習週報 email", free: "❌", basic: "❌", pro: "✅", elite: "✅" },
  { feature: "Hermes AI 學習分析", free: "❌", basic: "❌", pro: "✅", elite: "✅" },
  { feature: "Hermes AI 弱點週報", free: "❌", basic: "❌", pro: "❌", elite: "每週" },
  { feature: "AI 個人學習計畫", free: "❌", basic: "❌", pro: "❌", elite: "每月一份" },
  { feature: "優先客服", free: "❌", basic: "❌", pro: "❌", elite: "✅" },
];

const PLAN_ORDER = ["FREE", "BASIC", "PRO", "ELITE"];

export default function PricingPage() {
  const { data: authSession } = useSession();
  const router = useRouter();
  const userPlan = (authSession?.user as any)?.plan ?? null;

  const [billing, setBilling] = useState<Billing>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [betaEmail, setBetaEmail] = useState("");
  const [betaSubscribed, setBetaSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const handleSubscribe = async (planKey: string) => {
    if (!authSession) {
      router.push("/login?callbackUrl=/pricing");
      return;
    }
    if (billing === "quarterly") return;
    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/payment/newebpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, billing }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "發生錯誤，請重試");
        return;
      }
      // Inject form and auto-submit → redirects to NewebPay
      const div = document.createElement("div");
      div.innerHTML = data.formHtml;
      document.body.appendChild(div);
    } catch {
      alert("網路錯誤，請稍後再試");
    } finally {
      setLoadingPlan(null);
    }
  };

  const getButtonLabel = (planKey: string) => {
    if (!userPlan) return planKey === "FREE" ? "免費使用" : "立即訂閱";
    if (planKey === userPlan) return "目前方案";
    const currentIdx = PLAN_ORDER.indexOf(userPlan);
    const targetIdx = PLAN_ORDER.indexOf(planKey);
    if (planKey === "FREE") return "降級";
    return targetIdx > currentIdx ? "升級" : "降級";
  };

  const isCurrentPlan = (planKey: string) => userPlan === planKey;
  const isDisabled = (planKey: string) =>
    planKey === "FREE" ||
    isCurrentPlan(planKey) ||
    loadingPlan !== null;

  const submitBeta = async () => {
    if (!betaEmail || subscribing) return;
    setSubscribing(true);
    setSubscribeError(null);
    try {
      const res = await fetch("/api/beta-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: betaEmail }),
      });
      const body = await res.json();
      if (!res.ok) { setSubscribeError(body.error ?? "訂閱失敗"); return; }
      setBetaSubscribed(true);
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : "網路錯誤");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <nav className="border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
            <NurslixIconSquare size={20} className="text-[#080E1A]" />
          </div>
          <span className="font-bold text-lg text-gradient-gold">Nurslix</span>
        </a>
        {authSession ? (
          <a href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)]">← 返回主站</a>
        ) : (
          <a href="/login" className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)]">登入</a>
        )}
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3">選擇你的方案</h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            選擇最適合你的備考計畫，隨時可升降級
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-2">
          {(["monthly", "quarterly", "yearly"] as Billing[]).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
                billing === b
                  ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)]"
              }`}
            >
              {b === "monthly" ? "月付" : b === "quarterly" ? (
                <span className="flex items-center gap-1">季付 <Star size={12} className="text-[var(--gold)]" /></span>
              ) : "年付"}
              {b === "quarterly" && <span className="ml-1 text-xs text-[var(--success)]">省 10%</span>}
              {b === "yearly" && <span className="ml-1 text-xs text-[var(--success)]">省 20%</span>}
            </button>
          ))}
        </div>
        {billing === "quarterly" && (
          <p className="text-center text-sm text-[var(--text-muted)]">季付一次付清 3 個月，省 10%</p>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                isCurrentPlan(plan.key)
                  ? "border-[var(--success)] bg-[rgba(46,204,113,0.05)]"
                  : plan.highlight
                  ? "border-[var(--gold)] bg-gradient-to-b from-[var(--gold-dim)] to-[var(--bg-surface)]"
                  : "border-[var(--border-default)] bg-[var(--bg-surface)]"
              }`}
            >
              {isCurrentPlan(plan.key) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="success">✓ 目前方案</Badge>
                </div>
              )}
              {!isCurrentPlan(plan.key) && plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="gold">⭐ 推薦</Badge>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.prices.monthly === 0 ? (
                  <div className="text-3xl font-bold text-[var(--text-primary)]">免費</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-[var(--text-primary)]">
                        NT${
                          billing === "yearly" ? plan.yearlyTotal
                          : billing === "quarterly" ? plan.quarterlyTotal
                          : plan.prices.monthly
                        }
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        /{billing === "monthly" ? "月" : billing === "quarterly" ? "季" : "年"}
                      </span>
                    </div>
                    {billing === "quarterly" && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">約 NT${plan.prices.quarterly}/月</p>
                    )}
                    {billing === "yearly" && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">約 NT${plan.prices.yearly}/月</p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.filter(f => f.text).map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-sm">
                    {f.included
                      ? <Check size={14} className="text-[var(--success)] flex-shrink-0 mt-0.5" />
                      : <X size={14} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                    }
                    <span className={f.included ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                fullWidth
                variant={isCurrentPlan(plan.key) ? "outline" : plan.highlight ? "gold" : "outline"}
                disabled={isDisabled(plan.key)}
                onClick={() => !isDisabled(plan.key) && handleSubscribe(plan.key)}
              >
                {loadingPlan === plan.key
                  ? <Loader2 size={14} className="animate-spin" />
                  : getButtonLabel(plan.key)}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Feature Table */}
        <div className="overflow-x-auto">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">完整功能對照</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium w-1/3">功能</th>
                {["Free", "Basic", "Plus ⭐", "Premium"].map((h) => (
                  <th key={h} className="py-3 px-4 text-center text-[var(--text-secondary)] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureTable.map((row, i) => (
                <tr key={row.feature} className={`border-b border-[var(--border-subtle)] ${i % 2 === 0 ? "bg-[var(--bg-surface)]" : ""}`}>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{row.feature}</td>
                  {[row.free, row.basic, row.pro, row.elite].map((val, vi) => (
                    <td key={vi} className="py-3 px-4 text-center text-[var(--text-secondary)]">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Beta Subscribe */}
        <div className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--blue-dim)] border border-[var(--gold)] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">收到最新消息通知</h2>
          <p className="text-[var(--text-secondary)] mb-6">有新功能、優惠活動時第一個知道</p>
          {!betaSubscribed ? (
            <>
              <div className="flex gap-2 max-w-md mx-auto">
                <Input
                  value={betaEmail}
                  onChange={(e) => setBetaEmail(e.target.value)}
                  type="email"
                  placeholder="your@email.com"
                  icon={<Mail size={16} />}
                  className="flex-1"
                />
                <Button disabled={!betaEmail || subscribing} onClick={submitBeta}>
                  {subscribing ? "訂閱中..." : "訂閱"}
                </Button>
              </div>
              {subscribeError && (
                <p className="text-sm text-[var(--error)] mt-3">{subscribeError}</p>
              )}
            </>
          ) : (
            <div className="bg-[var(--gold-dim)] border border-[var(--gold)] rounded-xl px-6 py-3 inline-block">
              <p className="text-[var(--gold)] font-semibold">✓ 已訂閱！感謝你的支持</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
