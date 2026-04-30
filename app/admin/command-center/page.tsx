"use client";
/**
 * Command Center — Journal-style editorial dashboard.
 * Embeds inside AdminLayoutClient (outer sidebar + header).
 * Visual language follows /design-pack/Nurslix Journal: cream paper,
 * phosphor green, Instrument Serif italic display, JetBrains Mono labels.
 */
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TAB_LABELS, TAB_DESCRIPTIONS, type TabKey } from "./tabs/types";
import OverviewTab from "./tabs/OverviewTab";
import QualityTab from "./tabs/QualityTab";
import RepairsTab from "./tabs/RepairsTab";
import ReportsTab from "./tabs/ReportsTab";
import SpotCheckTab from "./tabs/SpotCheckTab";
import AuditTab from "./tabs/AuditTab";
import MarketingTab from "./tabs/MarketingTab";
import AgentControlTab from "./tabs/AgentControlTab";
import UsersTab from "./tabs/UsersTab";
import ToeicTab from "./tabs/ToeicTab";
import VocabTab from "./tabs/VocabTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import { MastheadRule, MetaText } from "./tabs/journal-ui";
import { cn } from "@/lib/utils/cn";

const TAB_ORDER: TabKey[] = [
  "overview", "quality", "repairs", "reports", "spot-check", "audit", "marketing", "agents",
  "users", "toeic", "vocab", "analytics",
];

const TAB_KICKER: Record<TabKey, string> = {
  overview: "I",
  quality: "II",
  repairs: "III",
  reports: "IV",
  "spot-check": "V",
  audit: "VI",
  marketing: "VII",
  agents: "VIII",
  users: "IX",
  toeic: "X",
  vocab: "XI",
  analytics: "XII",
};

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
        repairs: j.repairProposals?.unappliedCount,
        reports: j.reports?.pendingCount,
        marketing: j.marketing?.drafts?.length,
      });
    } catch {}
  }, []);
  useEffect(() => { loadCounts(); const t = setInterval(loadCounts, 60_000); return () => clearInterval(t); }, [loadCounts]);

  const switchTab = (k: TabKey) => router.replace(`/admin/command-center?tab=${k}`);

  const today = new Date();
  const dateStr = `${today.getFullYear()} / ${String(today.getMonth()+1).padStart(2,'0')} / ${String(today.getDate()).padStart(2,'0')}`;
  const weekday = ['週日','週一','週二','週三','週四','週五','週六'][today.getDay()];

  return (
    <div className="bg-[var(--j-bg)] text-[var(--j-ink)] min-h-full">
      <div className="max-w-[1240px] mx-auto px-6 md:px-10 pt-8 pb-16">
        {/* Front-page masthead */}
        <MastheadRule
          left={<>The Editor's Desk · Command Center · Vol.17 № {String(today.getDate()).padStart(2,'0')}</>}
          right={<>{dateStr} · {weekday}</>}
          double
        />

        {/* Issue title */}
        <div className="pt-8 pb-6">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--j-phosphor)]"
              style={{ fontFamily: "var(--font-mono)" }}>
              — {TAB_KICKER[tab]} ·
            </span>
            <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--j-phosphor)]"
              style={{ fontFamily: "var(--font-mono)" }}>
              {TAB_LABELS[tab]}
            </span>
          </div>
          <h1 className="italic tracking-tight text-[var(--j-ink)] leading-[0.95]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.025em" }}>
            {TAB_HEADLINES[tab]}
          </h1>
          <p className="mt-4 text-base text-[var(--j-ink-dim)] max-w-2xl leading-relaxed"
            style={{ fontFamily: "var(--font-zh)" }}>
            {TAB_DESCRIPTIONS[tab]}
          </p>
        </div>

        {/* Editorial tab nav */}
        <nav className="border-y border-[var(--j-line)] py-3 mb-10 overflow-x-auto">
          <div className="flex gap-6 min-w-max items-center">
            {TAB_ORDER.map((k, i) => {
              const active = tab === k;
              const count = counts[k];
              return (
                <button
                  key={k}
                  onClick={() => switchTab(k)}
                  className={cn(
                    "group flex items-baseline gap-2 text-sm transition-colors whitespace-nowrap py-1",
                    "border-b-2",
                    active
                      ? "border-[var(--j-phosphor)] text-[var(--j-phosphor)]"
                      : "border-transparent text-[var(--j-ink-dim)] hover:text-[var(--j-ink)]"
                  )}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span className="text-[9px] tracking-[0.2em] uppercase opacity-70" style={{ fontFamily: "var(--font-mono)" }}>
                    {TAB_KICKER[k]}
                  </span>
                  <span className={cn(active && "italic")}>{TAB_LABELS[k]}</span>
                  {count !== undefined && count > 0 && (
                    <span className="text-[9px] tracking-[0.1em] px-1.5 py-px ml-1 border border-current opacity-80" style={{ fontFamily: "var(--font-mono)" }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div>
          {tab === "overview" && <OverviewTab onJump={switchTab} />}
          {tab === "quality" && <QualityTab />}
          {tab === "repairs" && <RepairsTab />}
          {tab === "reports" && <ReportsTab />}
          {tab === "spot-check" && <SpotCheckTab />}
          {tab === "audit" && <AuditTab />}
          {tab === "marketing" && <MarketingTab />}
          {tab === "agents" && <AgentControlTab />}
          {tab === "users" && <UsersTab />}
          {tab === "toeic" && <ToeicTab />}
          {tab === "vocab" && <VocabTab />}
          {tab === "analytics" && <AnalyticsTab />}
        </div>
      </div>
    </div>
  );
}

const TAB_HEADLINES: Record<TabKey, string> = {
  overview: "Today's edition.",
  quality: "Where the cracks are.",
  repairs: "The mending desk.",
  reports: "Letters from readers.",
  "spot-check": "Read one. Then another.",
  audit: "What the editor flagged.",
  marketing: "The press room.",
  agents: "Compositors at work.",
  users: "The readership.",
  toeic: "The English edition.",
  vocab: "The lexicon.",
  analytics: "The numbers desk.",
};

export default function CommandCenter() {
  return (
    <Suspense fallback={
      <div className="p-12 flex items-center gap-3 text-[var(--j-ink-dim)] bg-[var(--j-bg)]">
        <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={20} />
        <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>Loading the issue…</span>
      </div>
    }>
      <CommandCenterInner />
    </Suspense>
  );
}
