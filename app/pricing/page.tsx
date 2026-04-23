"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Star, Mail, Loader2, Sparkles, Send, ChevronDown } from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Footer from "@/components/ui/Footer";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Billing = "monthly" | "quarterly" | "yearly";

// Beta free-access window. Prices go live at this instant (Asia/Taipei).
const BETA_END_MS = new Date("2026-05-01T00:00:00+08:00").getTime();

function formatRemaining(ms: number): string {
  if (ms <= 0) return "已結束";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${days} 天 ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

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

  // Upgrade request modal state
  const [requestModal, setRequestModal] = useState<{ plan: string; planName: string } | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [requestBilling, setRequestBilling] = useState<Billing>("monthly");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // null = pre-hydration; we assume beta is active until we can compare on the
  // client so SSR + client render agree (Date.now() on the server would drift).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const betaActive = now === null ? true : now < BETA_END_MS;
  const remaining = now === null ? BETA_END_MS - Date.now() : BETA_END_MS - now;

  const handleSubscribe = (planKey: string) => {
    if (planKey === "FREE") return;
    if (!authSession) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }
    const planName = plans.find((p) => p.key === planKey)?.name ?? planKey;
    setRequestBilling(billing);
    setRequestNote("");
    setRequestDone(false);
    setRequestError(null);
    setRequestModal({ plan: planKey, planName });
  };

  const submitUpgradeRequest = async () => {
    if (!requestModal) return;
    setRequestLoading(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/user/upgrade-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: requestModal.plan, billing: requestBilling, note: requestNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRequestError(data.error ?? "發生錯誤，請重試");
        return;
      }
      setRequestDone(true);
    } catch {
      setRequestError("網路錯誤，請稍後再試");
    } finally {
      setRequestLoading(false);
    }
  };

  const getButtonLabel = (planKey: string) => {
    if (planKey === "FREE") return "免費使用";
    if (!userPlan) return "申請升級";
    if (planKey === userPlan) return "目前方案";
    const currentIdx = PLAN_ORDER.indexOf(userPlan);
    const targetIdx = PLAN_ORDER.indexOf(planKey);
    return targetIdx > currentIdx ? "申請升級" : "申請降級";
  };

  const isCurrentPlan = (planKey: string) => userPlan === planKey;
  const isDisabled = (planKey: string) =>
    loadingPlan !== null || planKey === "FREE" || isCurrentPlan(planKey);

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

        <div className="rounded-2xl border border-[var(--gold)] bg-gradient-to-r from-[var(--gold-dim)] to-[var(--blue-dim)] px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--gold)]" />
            <span className="font-semibold text-[var(--text-primary)]">
              Beta 階段限時免費體驗，全功能開放至 5/1
            </span>
          </div>
          <span className="text-sm text-[var(--text-secondary)]">
            距離正式定價還有{" "}
            <span className="font-mono font-semibold text-[var(--gold)]">
              {formatRemaining(remaining)}
            </span>
          </span>
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
                ) : betaActive ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1 select-none" aria-hidden="true">
                      <span className="text-3xl font-bold text-[var(--text-muted)] blur-sm line-through opacity-60">
                        NT${
                          billing === "yearly" ? plan.yearlyTotal
                          : billing === "quarterly" ? plan.quarterlyTotal
                          : plan.prices.monthly
                        }
                      </span>
                      <span className="text-sm text-[var(--text-muted)] blur-sm opacity-60">
                        /{billing === "monthly" ? "月" : billing === "quarterly" ? "季" : "年"}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--gold-dim)] border border-[var(--gold)]">
                      <Sparkles size={12} className="text-[var(--gold)]" />
                      <span className="text-sm font-semibold text-[var(--gold)]">Beta 限時免費</span>
                    </div>
                  </div>
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
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">完整功能對照</h2>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-4">
            {["Free", "Basic", "Plus", "Premium"].map((planName, pi) => {
              const key = (["free", "basic", "pro", "elite"] as const)[pi];
              const highlight = planName === "Plus";
              return (
                <div
                  key={planName}
                  className={`rounded-xl border p-4 ${
                    highlight
                      ? "border-[var(--gold)] bg-[var(--gold-dim)]/30"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                  }`}
                >
                  <div className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
                    {planName} {highlight && <span className="text-[var(--gold)]">⭐</span>}
                  </div>
                  <ul className="space-y-2 text-sm">
                    {featureTable.map((row) => (
                      <li key={row.feature} className="flex justify-between items-start gap-3">
                        <span className="text-[var(--text-muted)]">{row.feature}</span>
                        <span className="text-[var(--text-primary)] font-medium text-right shrink-0">{row[key]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Desktop: comparison table */}
          <div className="hidden md:block overflow-x-auto">
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

      {/* Upgrade Request Modal */}
      <AnimatePresence>
        {requestModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => !requestLoading && setRequestModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                {requestDone ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-14 h-14 rounded-full bg-[rgba(46,204,113,0.15)] border border-[var(--success)] flex items-center justify-center mx-auto">
                      <Check size={28} className="text-[var(--success)]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">申請已送出！</h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        我們會盡快透過 Threads 私訊傳送匯款資訊給你。
                      </p>
                    </div>
                    <Button fullWidth onClick={() => setRequestModal(null)}>關閉</Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">
                        申請升級至 {requestModal.planName}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        送出後我們會傳送匯款帳號給你，完成匯款後升級生效。
                      </p>
                    </div>

                    {/* Billing period */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">付款週期</label>
                      <div className="relative">
                        <select
                          value={requestBilling}
                          onChange={(e) => setRequestBilling(e.target.value as Billing)}
                          className="w-full appearance-none bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--gold)] pr-8"
                        >
                          <option value="monthly">月付</option>
                          <option value="quarterly">季付（省 10%）</option>
                          <option value="yearly">年付（省 20%）</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      </div>
                    </div>

                    {/* Optional note */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">留言給我們（選填）</label>
                      <textarea
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        placeholder="有任何問題或需要說明的都可以寫在這裡"
                        rows={3}
                        maxLength={500}
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--gold)] resize-none"
                      />
                    </div>

                    {requestError && (
                      <p className="text-sm text-[var(--error)]">{requestError}</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        fullWidth
                        onClick={() => setRequestModal(null)}
                        disabled={requestLoading}
                      >
                        取消
                      </Button>
                      <Button
                        variant="gold"
                        fullWidth
                        onClick={submitUpgradeRequest}
                        disabled={requestLoading}
                      >
                        {requestLoading
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Send size={14} />}
                        送出申請
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
