"use client";

import { Bell, Search, Shield, Zap, LogOut, Settings, ChevronDown } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import FontSizeControl from "@/components/ui/FontSizeControl";
import Badge from "@/components/ui/Badge";
import { useSession, signOut } from "next-auth/react";
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        {title && (
          <h1 className="font-semibold text-[var(--text-primary)]">{title}</h1>
        )}
      </div>

      {/* Center - Search (desktop) */}
      <div className="hidden md:flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 w-72">
        <Search size={15} className="text-[var(--text-muted)]" />
        <input
          placeholder="搜尋題目、標籤..."
          className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none flex-1"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {plan === "FREE" && (
          <Link
            href="/pricing"
            className="hidden md:flex items-center gap-1.5 px-3 h-9 rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] font-semibold text-xs hover:opacity-90 transition-opacity"
          >
            <Zap size={13} />
            <span>免費試用 Pro 7天</span>
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            className="hidden md:flex items-center gap-1.5 px-3 h-10 rounded-full bg-[var(--gold-dim)] border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[#080E1A] transition-colors text-xs font-semibold"
            title="進入管理後台"
          >
            <Shield size={14} />
            <span>管理後台</span>
          </Link>
        )}
        <FontSizeControl />
        <ThemeToggle />
        <button className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--gold)]" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
          >
            {user?.image ? (
              <Image
                src={user.image}
                alt={displayName}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center text-xs font-bold text-[#080E1A]">
                {initial}
              </div>
            )}
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium text-[var(--text-primary)] leading-tight">{displayName}</span>
              <Badge variant={planVariant[plan] ?? "muted"} className="text-[10px] cursor-pointer">{plan}</Badge>
            </div>
            <ChevronDown size={14} className="hidden md:block text-[var(--text-muted)]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl z-50 py-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{displayName}</div>
                <div className="text-xs text-[var(--text-muted)] truncate">{user?.email}</div>
              </div>
              <nav className="py-1">
                <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <Settings size={14} className="text-[var(--text-muted)]" />
                  設定
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                    <Shield size={14} className="text-[var(--gold)]" />
                    管理後台
                  </Link>
                )}
              </nav>
              <div className="border-t border-[var(--border-subtle)] py-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
                >
                  <LogOut size={14} />
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
