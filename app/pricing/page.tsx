"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Star, Mail, Stethoscope } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

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
      { text: "7天 Pro 免費試用", included: true },
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
    prices: { monthly: 99, quarterly: 65, yearly: 79 },
    quarterlyTotal: 195,
    yearlyTotal: 948,
    description: "每日穩定練習",
    features: [
      { text: "每日 50 題練習", included: true },
      { text: "練習模式 + Tutor 模式", included: true },
      { text: "錯題本（200題）", included: true },
      { text: "台美差異提示", included: true },
      { text: "考前倒數計時器", included: true },
      { text: "基本雷達圖", included: true },
      { text: "CAT / Mock 考試", included: false },
      { text: "AI 學習計畫", included: false },
    ],
    highlight: false,
  },
  {
    key: "PRO",
    name: "Pro",
    prices: { monthly: 249, quarterly: 164, yearly: 199 },
    quarterlyTotal: 492,
    yearlyTotal: 2388,
    description: "認真備考的最佳選擇",
    features: [
      { text: "無限答題", included: true },
      { text: "全模式（CAT + Mock + Tutor）", included: true },
      { text: "無限錯題本", included: true },
      { text: "完整能力雷達圖 + 弱點分析", included: true },
      { text: "學習週報 email", included: true },
      { text: "考前倒數 + 提醒通知", included: true },
      { text: "AI 弱點週報", included: false },
      { text: "AI 個人學習計畫（每月）", included: false },
    ],
    highlight: true,
  },
  {
    key: "ELITE",
    name: "Elite",
    prices: { monthly: 498, quarterly: 328, yearly: 398 },
    quarterlyTotal: 984,
    yearlyTotal: 4776,
    description: "全方位 AI 備考支援",
    features: [
      { text: "Pro 所有功能", included: true },
      { text: "AI 弱點週報（每週）", included: true },
      { text: "AI 個人學習計畫（每月）", included: true },
      { text: "優先客服支援", included: true },
      { text: "Elite 成就徽章", included: true },
      { text: "早期新功能搶先體驗", included: true },
      { text: "∞ 一切功能", included: true },
      { text: "", included: true },
    ],
    highlight: false,
  },
];

const featureTable = [
  { feature: "每日題數", free: "10 題", basic: "50 題", pro: "無限", elite: "無限" },
  { feature: "7天 Pro 試用", free: "✅ 一次", basic: "❌", pro: "❌", elite: "❌" },
  { feature: "Mini CAT 體驗", free: "每月一次", basic: "✅", pro: "✅", elite: "✅" },
  { feature: "練習模式", free: "✅", basic: "✅", pro: "✅", elite: "✅" },
  { feature: "Tutor 模式", free: "❌", basic: "✅", pro: "✅", elite: "✅" },
  { feature: "CAT 模式", free: "❌", basic: "❌", pro: "✅", elite: "✅" },
  { feature: "Mock 考試", free: "❌", basic: "❌", pro: "✅", elite: "✅" },
  { feature: "錯題本", free: "50 題", basic: "200 題", pro: "無限", elite: "無限" },
  { feature: "台美差異提示", free: "❌", basic: "✅", pro: "✅", elite: "✅" },
  { feature: "能力雷達圖", free: "❌", basic: "基本", pro: "完整", elite: "完整" },
  { feature: "學習週報 email", free: "❌", basic: "❌", pro: "✅", elite: "✅" },
  { feature: "AI 弱點週報", free: "❌", basic: "❌", pro: "❌", elite: "✅" },
  { feature: "AI 個人學習計畫", free: "❌", basic: "❌", pro: "❌", elite: "每月一份" },
  { feature: "優先客服", free: "❌", basic: "❌", pro: "❌", elite: "✅" },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("quarterly");
  const [betaEmail, setBetaEmail] = useState("");
  const [betaSubscribed, setBetaSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

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
      if (!res.ok) {
        setSubscribeError(body.error ?? "訂閱失敗");
        return;
      }
      setBetaSubscribed(true);
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : "網路錯誤");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
            <Stethoscope size={16} className="text-[#080E1A]" />
          </div>
          <span className="font-bold text-lg text-gradient-gold">Nurslix</span>
        </a>
        <a href="/login" className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)]">登入</a>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <h1 className="text-4xl font-bold text-[var(--text-primary)]">選擇你的方案</h1>
            <Badge variant="warning">Beta 測試中</Badge>
          </div>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            所有方案目前為 Beta 測試階段，付費功能即將開放
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
                <span className="flex items-center gap-1">季付 <Star size={12} className="text-[var(--gold)]" /> 推薦</span>
              ) : "年付"}
              {b === "quarterly" && <span className="ml-1 text-xs text-[var(--gold)]">省 34%</span>}
              {b === "yearly" && <span className="ml-1 text-xs text-[var(--success)]">省 20%</span>}
            </button>
          ))}
        </div>

        {billing === "quarterly" && (
          <p className="text-center text-sm text-[var(--text-muted)]">季付方案研擬當中，即將開放</p>
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
                plan.highlight
                  ? "border-[var(--gold)] bg-gradient-to-b from-[var(--gold-dim)] to-[var(--bg-surface)]"
                  : "border-[var(--border-default)] bg-[var(--bg-surface)]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="gold">⭐ 推薦</Badge>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.prices[billing] === 0 ? (
                  <div className="text-3xl font-bold text-[var(--text-primary)]">免費</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-[var(--text-primary)]">
                        NT${billing === "quarterly" ? plan.quarterlyTotal : billing === "yearly" ? plan.yearlyTotal : plan.prices.monthly}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        /{billing === "monthly" ? "月" : billing === "quarterly" ? "季" : "年"}
                      </span>
                    </div>
                    {billing !== "monthly" && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        約 NT${plan.prices[billing]}/月
                      </p>
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
                variant={plan.highlight ? "gold" : plan.key === "FREE" ? "outline" : "outline"}
                disabled
              >
                {plan.key === "FREE" ? "目前方案" : "即將開放"}
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
                {["Free", "Basic", "Pro ⭐", "Elite"].map((h) => (
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
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">搶先收到正式上線通知</h2>
          <p className="text-[var(--text-secondary)] mb-6">Beta 測試期間完全免費，正式上線時通知你</p>
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
    </div>
  );
}
