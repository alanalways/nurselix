"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Brain, BookOpen, BarChart3, UserCircle, X, LogOut, Settings, Shield, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";

const planVariant: Record<string, BadgeVariant> = {
  FREE: "muted",
  BASIC: "blue",
  PRO: "gold",
  ELITE: "elite",
};

const tabs = [
  { href: "/", icon: LayoutDashboard, label: "首頁" },
  { href: "/nclex", icon: Brain, label: "NCLEX" },
  { href: "/review", icon: BookOpen, label: "錯題" },
  { href: "/stats", icon: BarChart3, label: "統計" },
  { href: "/achievements", icon: Trophy, label: "成就" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = session?.user;
  const displayName = user?.name ?? "使用者";
  const plan = (user as any)?.plan ?? "FREE";
  const isAdmin = (user as any)?.role === "ADMIN";
  const initial = displayName[0]?.toUpperCase() ?? "U";

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] pb-safe">
        <div className="flex items-center justify-around px-1 py-2">
          {tabs.map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors duration-150",
                  active ? "text-[var(--gold)]" : "text-[var(--text-muted)]"
                )}
              >
                <tab.icon size={20} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}

          {/* User tab */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[var(--text-muted)] transition-colors duration-150"
          >
            {user?.image ? (
              <Image src={user.image} alt={displayName} width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <UserCircle size={20} />
            )}
            <span className="text-[10px] font-medium">我的</span>
          </button>
        </div>
      </nav>

      {/* User drawer */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-surface)] rounded-t-3xl border-t border-[var(--border-subtle)] pb-safe">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
            </div>

            {/* Close button */}
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]"
            >
              <X size={16} />
            </button>

            {/* User info */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-subtle)]">
              {user?.image ? (
                <Image src={user.image} alt={displayName} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center text-base font-bold text-[#080E1A]">
                  {initial}
                </div>
              )}
              <div>
                <div className="font-semibold text-[var(--text-primary)]">{displayName}</div>
                <div className="text-xs text-[var(--text-muted)]">{user?.email}</div>
                <Badge variant={planVariant[plan] ?? "muted"} className="text-[10px] mt-0.5">{plan}</Badge>
              </div>
            </div>

            {/* Menu items */}
            <nav className="px-3 py-3 space-y-1">
              {plan === "FREE" && (
                <Link href="/pricing" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--gold)]/15 to-[var(--gold-light)]/10 border border-[var(--gold)]/30 text-[var(--gold)] font-semibold text-sm">
                  <Zap size={16} />
                  免費試用 Plus 7 天
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <Shield size={16} className="text-[var(--gold)]" />
                  管理後台
                </Link>
              )}
              <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                <Settings size={16} className="text-[var(--text-muted)]" />
                設定
              </Link>
            </nav>

            <div className="px-3 pb-4">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--error)]/40 text-[var(--error)] text-sm font-semibold hover:bg-[var(--error)]/10 transition-colors"
              >
                <LogOut size={16} />
                登出
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
