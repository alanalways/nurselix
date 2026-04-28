"use client";
/**
 * Unified Admin Command Center — single-page with tabs.
 *
 * Embeds inside the existing AdminLayoutClient (which has the outer
 * sidebar + header). This component renders ONLY the inner content with
 * horizontal tabs at the top, matching the dark Nurslix theme.
 */
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileWarning, MessageSquareWarning, ScanSearch,
  ShieldCheck, Megaphone, Bot, Loader2,
} from "lucide-react";
import { TAB_LABELS, TAB_DESCRIPTIONS, type TabKey } from "./tabs/types";
import OverviewTab from "./tabs/OverviewTab";
import QualityTab from "./tabs/QualityTab";
import ReportsTab from "./tabs/ReportsTab";
import SpotCheckTab from "./tabs/SpotCheckTab";
import AuditTab from "./tabs/AuditTab";
import MarketingTab from "./tabs/MarketingTab";
import AgentControlTab from "./tabs/AgentControlTab";
import { cn } from "@/lib/utils/cn";

const TAB_ICONS: Record<TabKey, any> = {
  overview: LayoutDashboard,
  quality: FileWarning,
  reports: MessageSquareWarning,
  "spot-check": ScanSearch,
  audit: ShieldCheck,
  marketing: Megaphone,
  agents: Bot,
};

const TAB_ORDER: TabKey[] = [
  "overview", "quality", "reports", "spot-check", "audit", "marketing", "agents",
];

function CommandCenterInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = (sp.get("tab") as TabKey) || "overview";
  const [counts, setCounts] = useState<Partial<Record<TabKey, number>>>({});

  const loadCounts = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/command-center", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setCounts({
        quality: j.issues?.openCount,
        reports: j.reports?.pendingCount,
        marketing: j.marketing?.drafts?.length,
      });
    } catch {}
  }, []);
  useEffect(() => { loadCounts(); const t = setInterval(loadCounts, 60_000); return () => clearInterval(t); }, [loadCounts]);

  const switchTab = (k: TabKey) => router.replace(`/admin/command-center?tab=${k}`);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">指揮中心</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">{TAB_DESCRIPTIONS[tab]}</p>
      </div>

      {/* Horizontal tabs */}
      <div className="border-b border-[var(--border-subtle)] mb-6 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {TAB_ORDER.map(k => {
            const Icon = TAB_ICONS[k];
            const active = tab === k;
            const count = counts[k];
            return (
              <button
                key={k}
                onClick={() => switchTab(k)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-[var(--gold)] text-[var(--gold)] font-semibold"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon size={15} />
                <span>{TAB_LABELS[k]}</span>
                {count !== undefined && count > 0 && (
                  <span className={cn(
                    "ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                    active
                      ? "bg-[var(--gold)]/20 text-[var(--gold)]"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {tab === "overview" && <OverviewTab onJump={switchTab} />}
        {tab === "quality" && <QualityTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "spot-check" && <SpotCheckTab />}
        {tab === "audit" && <AuditTab />}
        {tab === "marketing" && <MarketingTab />}
        {tab === "agents" && <AgentControlTab />}
      </div>
    </div>
  );
}

export default function CommandCenter() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center gap-2 text-[var(--text-muted)]">
        <Loader2 className="animate-spin text-[var(--gold)]" size={20} /> 載入中...
      </div>
    }>
      <CommandCenterInner />
    </Suspense>
  );
}
