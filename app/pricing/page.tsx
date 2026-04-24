"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Mail, Loader2, Sparkles, Send, ChevronDown } from "lucide-react";
import Button from "@/components/ui/Button";
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
    <div className="j-page min-h-screen" style={{ background: "var(--j-bg)", color: "var(--j-ink)" }}>
      {/* Journal top bar */}
      <nav
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--j-line)", background: "var(--j-bg-card)" }}
      >
        <a href="/" className="j-display" style={{ fontStyle: "italic", fontSize: 20 }}>
          Nurslix<span style={{ color: "var(--j-phosphor)" }}>⌁</span>Journal
        </a>
        {authSession ? (
          <a href="/home" className="j-mono j-btn" style={{ fontSize: 11, color: "var(--j-ink-muted)" }}>
            ← Reader{"'"}s Desk
          </a>
        ) : (
          <a href="/login" className="j-mono j-btn" style={{ fontSize: 11, color: "var(--j-ink-muted)" }}>
            登入
          </a>
        )}
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        {/* Masthead */}
        <div style={{ borderBottom: "1px solid var(--j-line)", paddingBottom: 32 }}>
          <div className="j-mono" style={{ color: "var(--j-ink-muted)", marginBottom: 10 }}>
            — Subscribe · Vol. 14 —
          </div>
          <h1
            className="j-display"
            style={{ fontSize: "clamp(40px, 7vw, 80px)", fontStyle: "italic", lineHeight: 1.02, margin: 0 }}
          >
            Choose your<br />reading plan.
          </h1>
          <p className="j-zh" style={{ fontSize: 17, color: "var(--j-ink-dim)", marginTop: 16, maxWidth: 520 }}>
            選擇最適合你的備考計畫，隨時可升降級。
          </p>
        </div>

        {/* Beta banner */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5"
          style={{ border: "1px solid var(--j-phosphor-line)", background: "var(--j-phosphor-soft)" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: "var(--j-phosphor)" }} />
            <span className="j-zh" style={{ fontWeight: 600 }}>
              Beta 階段限時免費體驗，全功能開放至 5/1
            </span>
          </div>
          <span className="j-mono" style={{ fontSize: 11, color: "var(--j-ink-dim)" }}>
            距離正式定價還有{" "}
            <span style={{ color: "var(--j-phosphor)", fontWeight: 600 }}>
              {formatRemaining(remaining)}
            </span>
          </span>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center gap-0" style={{ borderBottom: "1px solid var(--j-line)", paddingBottom: 0 }}>
          {(["monthly", "quarterly", "yearly"] as Billing[]).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className="j-mono j-btn"
              style={{
                padding: "10px 20px",
                fontSize: 11,
                borderBottom: billing === b ? "2px solid var(--j-ink)" : "2px solid transparent",
                color: billing === b ? "var(--j-ink)" : "var(--j-ink-muted)",
                background: "transparent",
              }}
            >
              {b === "monthly" ? "月付" : b === "quarterly" ? "季付 −10%" : "年付 −20%"}
            </button>
          ))}
        </div>
        {billing === "quarterly" && (
          <p className="j-mono" style={{ fontSize: 11, color: "var(--j-ink-muted)", marginTop: -8 }}>
            季付一次付清 3 個月
          </p>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: "1px solid var(--j-line)" }}>
          {plans.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative flex flex-col p-7"
              style={{
                borderRight: i < 3 ? "1px solid var(--j-line)" : "none",
                borderTop: isCurrentPlan(plan.key) ? `3px solid var(--j-phosphor)` : plan.highlight ? "3px solid var(--j-ink)" : "3px solid transparent",
                background: plan.highlight ? "var(--j-bg-inset)" : "var(--j-bg-card)",
              }}
            >
              {isCurrentPlan(plan.key) && (
                <div className="j-mono" style={{ fontSize: 9, color: "var(--j-phosphor)", marginBottom: 6 }}>
                  ✓ 目前方案
                </div>
              )}
              {!isCurrentPlan(plan.key) && plan.highlight && (
                <div className="j-mono" style={{ fontSize: 9, color: "var(--j-ink-muted)", marginBottom: 6 }}>
                  ✦ 推薦
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <h3 className="j-display" style={{ fontSize: 28, fontStyle: "italic" }}>{plan.name}</h3>
                <p className="j-zh" style={{ fontSize: 13, color: "var(--j-ink-muted)", marginTop: 4 }}>{plan.description}</p>
              </div>

              <div style={{ marginBottom: 24 }}>
                {plan.prices.monthly === 0 ? (
                  <div className="j-display" style={{ fontSize: 36, fontStyle: "italic" }}>免費</div>
                ) : betaActive ? (
                  <div>
                    <div className="select-none" aria-hidden="true" style={{ opacity: 0.4, textDecoration: "line-through" }}>
                      <span className="j-mono" style={{ fontSize: 20 }}>
                        NT${billing === "yearly" ? plan.yearlyTotal : billing === "quarterly" ? plan.quarterlyTotal : plan.prices.monthly}
                      </span>
                    </div>
                    <div
                      className="inline-flex items-center gap-1 j-mono"
                      style={{
                        fontSize: 10,
                        padding: "4px 10px",
                        border: "1px solid var(--j-phosphor-line)",
                        color: "var(--j-phosphor)",
                        marginTop: 6,
                      }}
                    >
                      <Sparkles size={10} />
                      Beta 限時免費
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="j-display" style={{ fontSize: 36, fontStyle: "italic" }}>
                      NT${billing === "yearly" ? plan.yearlyTotal : billing === "quarterly" ? plan.quarterlyTotal : plan.prices.monthly}
                    </div>
                    <div className="j-mono" style={{ fontSize: 10, color: "var(--j-ink-muted)", marginTop: 4 }}>
                      /{billing === "monthly" ? "月" : billing === "quarterly" ? "季" : "年"}
                      {billing === "quarterly" && ` · 約 NT$${plan.prices.quarterly}/月`}
                      {billing === "yearly" && ` · 約 NT$${plan.prices.yearly}/月`}
                    </div>
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 flex-1" style={{ marginBottom: 24 }}>
                {plan.features.filter(f => f.text).map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2 j-zh" style={{ fontSize: 13 }}>
                    {f.included
                      ? <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--j-phosphor)" }} />
                      : <X size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--j-ink-muted)" }} />
                    }
                    <span style={{ color: f.included ? "var(--j-ink)" : "var(--j-ink-muted)" }}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isDisabled(plan.key)}
                onClick={() => !isDisabled(plan.key) && handleSubscribe(plan.key)}
                className="j-mono j-btn w-full"
                style={{
                  padding: "12px",
                  fontSize: 11,
                  border: "1px solid var(--j-ink)",
                  background: plan.highlight && !isCurrentPlan(plan.key) ? "var(--j-ink)" : "transparent",
                  color: plan.highlight && !isCurrentPlan(plan.key) ? "var(--j-bg)" : "var(--j-ink)",
                  opacity: isDisabled(plan.key) ? 0.45 : 1,
                  cursor: isDisabled(plan.key) ? "not-allowed" : "pointer",
                }}
              >
                {loadingPlan === plan.key
                  ? <Loader2 size={13} className="animate-spin inline" />
                  : getButtonLabel(plan.key)}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Feature Table */}
        <div>
          <div className="j-mono" style={{ color: "var(--j-ink-muted)", marginBottom: 8 }}>— 完整功能對照 —</div>
          <h2 className="j-display" style={{ fontSize: "clamp(24px,4vw,40px)", fontStyle: "italic", marginBottom: 24 }}>
            What{"'"}s in each issue
          </h2>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-4">
            {["Free", "Basic", "Plus", "Premium"].map((planName, pi) => {
              const key = (["free", "basic", "pro", "elite"] as const)[pi];
              const highlight = planName === "Plus";
              return (
                <div
                  key={planName}
                  style={{
                    border: `1px solid ${highlight ? "var(--j-ink)" : "var(--j-line)"}`,
                    padding: 20,
                    background: "var(--j-bg-card)",
                  }}
                >
                  <div className="j-display" style={{ fontStyle: "italic", fontSize: 22, marginBottom: 12 }}>
                    {planName} {highlight && <span style={{ color: "var(--j-phosphor)" }}>✦</span>}
                  </div>
                  <ul className="space-y-2">
                    {featureTable.map((row) => (
                      <li key={row.feature} className="flex justify-between items-start gap-3 j-zh" style={{ fontSize: 13 }}>
                        <span style={{ color: "var(--j-ink-muted)" }}>{row.feature}</span>
                        <span style={{ color: "var(--j-ink)", fontWeight: 500 }}>{row[key]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Desktop: comparison table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--j-line-strong)" }}>
                  <th className="text-left py-3 px-4 j-mono" style={{ fontSize: 10, color: "var(--j-ink-muted)", width: "32%" }}>功能</th>
                  {["Free", "Basic", "Plus ✦", "Premium"].map((h) => (
                    <th key={h} className="py-3 px-4 text-center j-display" style={{ fontStyle: "italic", fontSize: 18, color: "var(--j-ink)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureTable.map((row, i) => (
                  <tr
                    key={row.feature}
                    style={{ borderBottom: "1px solid var(--j-line)", background: i % 2 === 0 ? "var(--j-bg-card)" : "transparent" }}
                  >
                    <td className="py-3 px-4 j-zh" style={{ fontSize: 13, color: "var(--j-ink-dim)" }}>{row.feature}</td>
                    {[row.free, row.basic, row.pro, row.elite].map((val, vi) => (
                      <td key={vi} className="py-3 px-4 text-center j-zh" style={{ fontSize: 13, color: "var(--j-ink)" }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Beta Subscribe */}
        <div
          className="p-10 text-center"
          style={{ border: "1px solid var(--j-phosphor-line)", background: "var(--j-phosphor-soft)" }}
        >
          <div className="j-mono" style={{ color: "var(--j-phosphor)", marginBottom: 8 }}>— 訂閱通知 —</div>
          <h2 className="j-display" style={{ fontSize: "clamp(28px,4vw,48px)", fontStyle: "italic", marginBottom: 8 }}>
            Stay on the list.
          </h2>
          <p className="j-zh" style={{ fontSize: 15, color: "var(--j-ink-dim)", marginBottom: 28 }}>
            有新功能、優惠活動時第一個知道
          </p>
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
              <div
                className="w-full max-w-md p-6 space-y-5"
                style={{
                  background: "var(--j-bg-card)",
                  border: "1px solid var(--j-line-strong)",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.16)",
                }}
              >
                {requestDone ? (
                  <div className="text-center space-y-4 py-4">
                    <div
                      className="w-14 h-14 flex items-center justify-center mx-auto"
                      style={{ border: "1px solid var(--j-phosphor)", background: "var(--j-phosphor-soft)" }}
                    >
                      <Check size={28} style={{ color: "var(--j-phosphor)" }} />
                    </div>
                    <div>
                      <h3 className="j-display" style={{ fontSize: 22, fontStyle: "italic" }}>申請已送出！</h3>
                      <p className="j-zh" style={{ fontSize: 14, color: "var(--j-ink-dim)", marginTop: 6 }}>
                        我們會盡快透過 Threads 私訊傳送匯款資訊給你。
                      </p>
                    </div>
                    <Button fullWidth onClick={() => setRequestModal(null)}>關閉</Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="j-display" style={{ fontSize: 22, fontStyle: "italic" }}>
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
