"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import {
  LayoutDashboard, FileWarning, MessageSquareWarning, ScanSearch,
  ShieldCheck, Megaphone, Bot, Users as UsersIcon, Volume2, Library, BarChart3,
  LogOut, Menu, X,
} from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import { cn } from "@/lib/utils/cn";
import Badge from "@/components/ui/Badge";
import ThemeToggle from "@/components/ui/ThemeToggle";

// Single command-center page with 11 tabs. Sidebar items map to ?tab=KEY.
// Roman numeral kicker matches the editorial design (I-XI).
const adminNav = [
  { tab: "overview",   roman: "I",    icon: LayoutDashboard,      label: "總覽" },
  { tab: "quality",    roman: "II",   icon: FileWarning,          label: "品質" },
  { tab: "reports",    roman: "III",  icon: MessageSquareWarning, label: "回報" },
  { tab: "spot-check", roman: "IV",   icon: ScanSearch,           label: "抽查" },
  { tab: "audit",      roman: "V",    icon: ShieldCheck,          label: "審核" },
  { tab: "marketing",  roman: "VI",   icon: Megaphone,            label: "行銷部" },
  { tab: "agents",     roman: "VII",  icon: Bot,                  label: "Agent" },
  { tab: "users",      roman: "VIII", icon: UsersIcon,            label: "使用者" },
  { tab: "toeic",      roman: "IX",   icon: Volume2,              label: "TOEIC" },
  { tab: "vocab",      roman: "X",    icon: Library,              label: "詞庫" },
  { tab: "analytics",  roman: "XI",   icon: BarChart3,            label: "數據" },
] as const;

function SidebarNav({ pendingReports, pendingIssues, marketingDrafts }: {
  pendingReports: number | null;
  pendingIssues: number | null;
  marketingDrafts: number | null;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const activeTab = pathname.startsWith("/admin/command-center") ? (sp.get("tab") || "overview") : null;

  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      {adminNav.map((item) => {
        const active = activeTab === item.tab;
        const badgeText =
          item.tab === "reports" && pendingReports && pendingReports > 0
            ? String(pendingReports)
            : item.tab === "quality" && pendingIssues && pendingIssues > 0
            ? String(pendingIssues)
            : item.tab === "marketing" && marketingDrafts && marketingDrafts > 0
            ? String(marketingDrafts)
            : null;
        return (
          <Link key={item.tab} href={`/admin/command-center?tab=${item.tab}`}>
            <div className={cn("sidebar-link", active && "active")}>
              <item.icon size={15} className="flex-shrink-0" />
              <span className="text-[10px] tracking-wider opacity-50 font-mono w-7 flex-shrink-0">{item.roman}</span>
              <span className="flex-1">{item.label}</span>
              {badgeText && (
                <Badge variant="error" className="text-[10px]">{badgeText}</Badge>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayoutClient({
  children,
  email,
}: { children: React.ReactNode; email: string }) {
  const pathname = usePathname();
  const [pendingReports, setPendingReports] = useState<number | null>(null);
  const [pendingIssues, setPendingIssues] = useState<number | null>(null);
  const [marketingDrafts, setMarketingDrafts] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/admin/command-center", { cache: "no-store" });
        if (r.ok && alive) {
          const j = await r.json();
          setPendingReports(j.reports?.pendingCount ?? 0);
          setPendingIssues(j.issues?.openCount ?? 0);
          setMarketingDrafts(j.marketing?.drafts?.length ?? 0);
        }
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [pathname]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const sidebarContent = (
    <>
      <Link href="/admin/command-center?tab=overview" className="flex items-center gap-2 p-4 border-b border-[var(--border-subtle)] h-16 hover:bg-[var(--bg-elevated)] transition">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
          <NurslixIconSquare size={22} className="text-[#080E1A]" />
        </div>
        <div>
          <div className="font-bold text-sm text-gradient-gold">Nurslix</div>
          <Badge variant="error" className="text-[9px] px-1">Admin</Badge>
        </div>
      </Link>

      <Suspense fallback={<nav className="flex-1 p-3" />}>
        <SidebarNav
          pendingReports={pendingReports}
          pendingIssues={pendingIssues}
          marketingDrafts={marketingDrafts}
        />
      </Suspense>

      <div className="p-3 border-t border-[var(--border-subtle)] space-y-2">
        <Link href="/" className="sidebar-link text-xs">
          ← 回到主站
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-link w-full text-[var(--error)] hover:text-[var(--error)]"
        >
          <LogOut size={16} />
          <span>登出</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--bg-base)] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] z-50">
            {sidebarContent}
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              aria-label={mobileOpen ? "關閉選單" : "開啟選單"}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="font-semibold text-[var(--text-primary)] text-sm md:text-base">Nurslix Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)] hidden md:inline">{email}</span>
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center text-xs font-bold text-[#080E1A]">
              管
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
