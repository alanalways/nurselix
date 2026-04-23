"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Zap, Sparkles, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { isPaymentPublic } from "@/lib/utils/paymentFlag";

const UPSELL_CONFIG: Record<string, { show: boolean; title: string; desc: string; cta: string; badge: string; color: string }> = {
  FREE: {
    show: true,
    title: "7 天 Pro 免費體驗",
    desc: "解鎖 CAT 智能考試、Mock 全真模擬、無限答題，體驗完整備考系統。",
    cta: "立即免費試用",
    badge: "免費",
    color: "from-[var(--gold)] to-[var(--gold-light)]",
  },
  BASIC: {
    show: true,
    title: "升級 Pro，解鎖 CAT & Mock",
    desc: "Pro 方案支援自適應 CAT 考試與 5 小時全真 Mock 模擬，讓備考更有效率。",
    cta: "升級 Pro",
    badge: "Pro",
    color: "from-[var(--blue)] to-[var(--gold)]",
  },
  PRO: {
    show: true,
    title: "解鎖 Elite AI 學習分析",
    desc: "Elite 方案提供 Claude AI 週報分析與個人化 4 週學習計畫，精準攻克弱點。",
    cta: "升級 Elite",
    badge: "Elite",
    color: "from-purple-500 to-[var(--gold)]",
  },
  ELITE: { show: false, title: "", desc: "", cta: "", badge: "", color: "" },
};

export default function UpgradeBanner() {
  const { data: session } = useSession();
  const plan = (session?.user as any)?.plan ?? "FREE";
  const [dismissed, setDismissed] = useState(false);
  const config = UPSELL_CONFIG[plan];

  if (!config?.show || dismissed || !isPaymentPublic()) return null;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[var(--gold)] bg-gradient-to-r ${config.color} p-[1px]`}>
      <div className="rounded-[calc(1rem-1px)] bg-[var(--bg-surface)] px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center flex-shrink-0">
          {plan === "PRO" ? <Sparkles size={18} className="text-[#080E1A]" /> : <Zap size={18} className="text-[#080E1A]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-[var(--text-primary)]">{config.title}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] font-bold">{config.badge}</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] truncate">{config.desc}</p>
        </div>
        <Link
          href="/pricing"
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
        >
          {config.cta} <ChevronRight size={14} />
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
