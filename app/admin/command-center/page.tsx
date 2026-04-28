"use client";
/**
 * Unified Admin Command Center — single-page with tabs.
 *
 * Replaces the 5 scattered admin pages with a single dashboard. Tab
 * selection is driven by ?tab= query param so old URLs / bookmarks can
 * redirect cleanly.
 */
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileWarning, MessageSquareWarning, ScanSearch,
  ShieldCheck, Megaphone, Bot, ChevronRight, Loader2,
} from "lucide-react";
import { TAB_LABELS, TAB_DESCRIPTIONS, type TabKey } from "./tabs/types";
import OverviewTab from "./tabs/OverviewTab";
import QualityTab from "./tabs/QualityTab";
import ReportsTab from "./tabs/ReportsTab";
import SpotCheckTab from "./tabs/SpotCheckTab";
import AuditTab from "./tabs/AuditTab";
import MarketingTab from "./tabs/MarketingTab";
import AgentControlTab from "./tabs/AgentControlTab";

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

  // Fetch per-tab badge counts (e.g., open issues, pending reports)
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
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Sidebar */}
      <aside className="lg:w-60 border-r bg-white">
        <div className="p-4 border-b">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" /> 返回管理首頁
          </Link>
          <h1 className="text-lg font-bold mt-2">指揮中心</h1>
        </div>
        <nav className="p-2 space-y-1">
          {TAB_ORDER.map(k => {
            const Icon = TAB_ICONS[k];
            const active = tab === k;
            const count = counts[k];
            return (
              <button
                key={k}
                onClick={() => switchTab(k)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left transition ${
                  active ? "bg-emerald-50 text-emerald-700 font-medium" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1">{TAB_LABELS[k]}</span>
                {count !== undefined && count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    active ? "bg-emerald-200 text-emerald-800" : "bg-gray-200 text-gray-700"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6 max-w-[1400px] mx-auto">
          <div className="mb-4">
            <h2 className="text-xl font-bold">{TAB_LABELS[tab]}</h2>
            <p className="text-sm text-gray-600 mt-1">{TAB_DESCRIPTIONS[tab]}</p>
          </div>
          {tab === "overview" && <OverviewTab onJump={switchTab} />}
          {tab === "quality" && <QualityTab />}
          {tab === "reports" && <ReportsTab />}
          {tab === "spot-check" && <SpotCheckTab />}
          {tab === "audit" && <AuditTab />}
          {tab === "marketing" && <MarketingTab />}
          {tab === "agents" && <AgentControlTab />}
        </div>
      </main>
    </div>
  );
}

export default function CommandCenter() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> 載入中...</div>}>
      <CommandCenterInner />
    </Suspense>
  );
}
