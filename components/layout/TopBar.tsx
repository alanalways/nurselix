"use client";

import { Bell, Search } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import FontSizeControl from "@/components/ui/FontSizeControl";
import Badge from "@/components/ui/Badge";

// Mock user data for Phase 1
const mockUser = {
  displayName: "護理師小明",
  plan: "PRO" as const,
  avatarUrl: null as string | null,
};

export default function TopBar({ title }: { title?: string }) {
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
        <FontSizeControl />
        <ThemeToggle />
        <button className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--gold)]" />
        </button>
        {/* Avatar */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center text-xs font-bold text-[#080E1A]">
            {mockUser.displayName[0]}
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-medium text-[var(--text-primary)] leading-tight">{mockUser.displayName}</span>
            <Badge variant="gold" className="text-[10px]">{mockUser.plan}</Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
