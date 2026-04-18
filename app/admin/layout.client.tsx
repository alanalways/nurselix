"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, BookOpen, Users, BarChart3,
  Flag, MessageSquare, Bot, LogOut, Sparkles, Activity, FlaskConical, Menu, X
} from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import { cn } from "@/lib/utils/cn";
import Badge from "@/components/ui/Badge";
import ThemeToggle from "@/components/ui/ThemeToggle";

const adminNav = [
  { href: "/admin", icon: LayoutDashboard, label: "總覽" },
  { href: "/admin/live", icon: Activity, label: "即時監控" },
  { href: "/admin/questions", icon: BookOpen, label: "題庫管理" },
  { href: "/admin/questions/quality", icon: Sparkles, label: "題目品質" },
  { href: "/admin/questions/spot-check", icon: FlaskConical, label: "人工抽查" },
  { href: "/admin/users", icon: Users, label: "用戶管理" },
  { href: "/admin/analytics", icon: BarChart3, label: "數據分析" },
  { href: "/admin/reports", icon: Flag, label: "題目回報" },
  { href: "/admin/feedback", icon: MessageSquare, label: "用戶回饋" },
  { href: "/admin/agents", icon: Bot, label: "Hermes 狀態" },
];

export default function AdminLayoutClient({
  children,
  email,
}: { children: React.ReactNode; email: string }) {
  const pathname = usePathname();
  const [pendingReports, setPendingReports] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/reports?status=pending", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        if (alive) setPendingReports(body.rows?.length ?? 0);
      } catch {
        // ignore
      }
    })();
    return () => { alive = false; };
  }, [pathname]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 p-4 border-b border-[var(--border-subtle)] h-16">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
          <NurslixIconSquare size={22} className="text-[#080E1A]" />
        </div>
        <div>
          <div className="font-bold text-sm text-gradient-gold">Nurslix</div>
          <Badge variant="error" className="text-[9px] px-1">Admin</Badge>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {adminNav.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const badgeText = item.href === "/admin/reports" && pendingReports && pendingReports > 0
            ? String(pendingReports)
            : null;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn("sidebar-link", active && "active")}>
                <item.icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badgeText && (
                  <Badge variant="error" className="text-[10px]">{badgeText}</Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

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
