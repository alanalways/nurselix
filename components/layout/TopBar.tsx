"use client";

import { Bell, Search, Shield, LogOut, Settings, ChevronDown, Zap } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { useSession, signOut } from "next-auth/react";
import { isPaymentPublic } from "@/lib/utils/paymentFlag";
import Image from "next/image";
import type { BadgeVariant } from "@/components/ui/Badge";
import { useState, useRef, useEffect } from "react";

const planVariant: Record<string, BadgeVariant> = {
  FREE: "muted",
  BASIC: "blue",
  PRO: "gold",
  ELITE: "elite",
};

export default function TopBar({ title }: { title?: string }) {
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name ?? "使用者";
  const plan = (user as any)?.plan ?? "FREE";
  const isAdmin = (user as any)?.role === "ADMIN";
  const initial = displayName[0]?.toUpperCase() ?? "U";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <header
      className="h-14 flex items-center justify-between px-5 border-b flex-shrink-0"
      style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
    >
      {/* Left — running head */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="j-mono" style={{ color: "var(--j-ink-muted)", fontSize: 11 }}>
          {title ? `— ${title} —` : "— Reader's Desk —"}
        </span>
      </div>

      {/* Center — search */}
      <div
        className="hidden md:flex items-center gap-2 px-3 py-1.5 w-64"
        style={{ border: "1px solid var(--j-line)", background: "var(--j-bg-inset)" }}
      >
        <Search size={13} style={{ color: "var(--j-ink-muted)" }} />
        <input
          placeholder="搜尋題目、標籤…"
          className="bg-transparent text-sm outline-none flex-1 j-zh"
          style={{ color: "var(--j-ink)", fontSize: 13 }}
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {plan === "FREE" && isPaymentPublic() && (
          <Link
            href="/pricing"
            className="hidden md:flex items-center gap-1.5 j-mono j-btn"
            style={{
              padding: "6px 12px",
              border: "1px solid var(--j-phosphor-line)",
              color: "var(--j-phosphor)",
              fontSize: 11,
            }}
          >
            <Zap size={12} />
            Subscribe
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            className="hidden md:flex items-center gap-1 j-mono j-btn"
            style={{ padding: "6px 12px", border: "1px solid var(--j-line)", color: "var(--j-ink-dim)", fontSize: 11 }}
          >
            <Shield size={12} />
            Admin
          </Link>
        )}

        <button
          className="relative w-9 h-9 flex items-center justify-center j-btn"
          style={{ border: "1px solid var(--j-line)", color: "var(--j-ink-muted)" }}
          aria-label="通知"
        >
          <Bell size={15} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--j-phosphor)" }}
          />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 j-btn"
            style={{ border: "1px solid transparent" }}
          >
            {user?.image ? (
              <Image
                src={user.image}
                alt={displayName}
                width={28}
                height={28}
                className="w-7 h-7 rounded-full object-cover"
                style={{ border: "1px solid var(--j-line)" }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center j-mono"
                style={{
                  background: "var(--j-phosphor-soft)",
                  border: "1px solid var(--j-phosphor-line)",
                  color: "var(--j-phosphor)",
                  fontSize: 11,
                }}
              >
                {initial}
              </div>
            )}
            <div className="hidden md:flex flex-col items-start">
              <span className="j-zh leading-tight" style={{ fontSize: 13, color: "var(--j-ink)" }}>
                {displayName}
              </span>
              <Badge variant={planVariant[plan] ?? "muted"} className="text-[10px] cursor-pointer">
                {plan}
              </Badge>
            </div>
            <ChevronDown size={12} className="hidden md:block" style={{ color: "var(--j-ink-muted)" }} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-11 w-52 z-50 py-1"
              style={{
                background: "var(--j-bg-card)",
                border: "1px solid var(--j-line-strong)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--j-line)" }}>
                <div className="j-zh text-sm truncate" style={{ color: "var(--j-ink)" }}>
                  {displayName}
                </div>
                <div className="j-mono truncate" style={{ fontSize: 10, color: "var(--j-ink-muted)", marginTop: 2 }}>
                  {user?.email}
                </div>
              </div>
              <nav className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 j-btn j-zh"
                  style={{ fontSize: 13, color: "var(--j-ink)" }}
                >
                  <Settings size={13} style={{ color: "var(--j-ink-muted)" }} />
                  設定
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 j-btn j-zh"
                    style={{ fontSize: 13, color: "var(--j-ink)" }}
                  >
                    <Shield size={13} style={{ color: "var(--j-phosphor)" }} />
                    管理後台
                  </Link>
                )}
              </nav>
              <div className="border-t py-1" style={{ borderColor: "var(--j-line)" }}>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 j-btn j-zh"
                  style={{ fontSize: 13, color: "var(--j-red)" }}
                >
                  <LogOut size={13} />
                  登出
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
