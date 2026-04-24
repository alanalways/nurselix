"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Brain, BookOpen, BarChart3, UserCircle, X, LogOut, Settings, Shield, Zap, Library } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { isPaymentPublic } from "@/lib/utils/paymentFlag";
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
  { href: "/home", icon: LayoutDashboard, label: "首頁" },
  { href: "/nclex", icon: Brain, label: "NCLEX" },
  { href: "/vocab", icon: Library, label: "單字" },
  { href: "/review", icon: BookOpen, label: "錯題" },
  { href: "/stats", icon: BarChart3, label: "統計" },
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

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-safe"
        style={{ background: "var(--j-bg-card)", borderTop: "1px solid var(--j-line)" }}
      >
        <div className="flex items-center justify-around px-1 py-2">
          {tabs.map((tab) => {
            const active = tab.href === "/home" ? pathname === "/home" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <tab.icon
                  size={20}
                  style={{ color: active ? "var(--j-phosphor)" : "var(--j-ink-muted)" }}
                />
                <span
                  className="j-mono"
                  style={{
                    fontSize: 9,
                    color: active ? "var(--j-phosphor)" : "var(--j-ink-muted)",
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
          >
            {user?.image ? (
              <Image
                src={user.image}
                alt={displayName}
                width={20}
                height={20}
                className="w-5 h-5 rounded-full object-cover"
                style={{ border: "1px solid var(--j-line)" }}
              />
            ) : (
              <UserCircle size={20} style={{ color: "var(--j-ink-muted)" }} />
            )}
            <span className="j-mono" style={{ fontSize: 9, color: "var(--j-ink-muted)" }}>
              我的
            </span>
          </button>
        </div>
      </nav>

      {/* User drawer */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe"
            style={{
              background: "var(--j-bg-card)",
              borderTop: "1px solid var(--j-line-strong)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "var(--j-line-strong)" }}
              />
            </div>

            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 j-btn"
              style={{ border: "1px solid var(--j-line)", color: "var(--j-ink-muted)" }}
            >
              <X size={15} />
            </button>

            {/* User info */}
            <div
              className="flex items-center gap-3 px-5 py-4 border-b"
              style={{ borderColor: "var(--j-line)" }}
            >
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={displayName}
                  width={44}
                  height={44}
                  className="w-11 h-11 rounded-full object-cover"
                  style={{ border: "1px solid var(--j-line)" }}
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center j-mono"
                  style={{
                    background: "var(--j-phosphor-soft)",
                    border: "1px solid var(--j-phosphor-line)",
                    color: "var(--j-phosphor)",
                    fontSize: 16,
                  }}
                >
                  {initial}
                </div>
              )}
              <div>
                <div className="j-zh font-semibold" style={{ color: "var(--j-ink)" }}>
                  {displayName}
                </div>
                <div className="j-mono" style={{ fontSize: 10, color: "var(--j-ink-muted)" }}>
                  {user?.email}
                </div>
                <Badge variant={planVariant[plan] ?? "muted"} className="text-[10px] mt-0.5">
                  {plan}
                </Badge>
              </div>
            </div>

            <nav className="px-3 py-3 space-y-1">
              {plan === "FREE" && isPaymentPublic() && (
                <Link
                  href="/pricing"
                  className="flex items-center gap-3 px-4 py-3 j-btn j-mono"
                  style={{
                    fontSize: 12,
                    border: "1px solid var(--j-phosphor-line)",
                    color: "var(--j-phosphor)",
                  }}
                >
                  <Zap size={15} />
                  Subscribe →
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-4 py-3 j-btn j-zh"
                  style={{ fontSize: 14, color: "var(--j-ink)" }}
                >
                  <Shield size={15} style={{ color: "var(--j-phosphor)" }} />
                  管理後台
                </Link>
              )}
              <Link
                href="/settings"
                className={cn("flex items-center gap-3 px-4 py-3 j-btn j-zh")}
                style={{ fontSize: 14, color: "var(--j-ink)" }}
              >
                <Settings size={15} style={{ color: "var(--j-ink-muted)" }} />
                設定
              </Link>
            </nav>

            <div className="px-3 pb-4">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-2 py-3 j-btn j-zh"
                style={{
                  fontSize: 14,
                  border: "1px solid var(--j-red)",
                  color: "var(--j-red)",
                  opacity: 0.85,
                }}
              >
                <LogOut size={15} />
                登出
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
