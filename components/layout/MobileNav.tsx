"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Brain, BookOpen, BarChart3, Trophy } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/", icon: LayoutDashboard, label: "首頁" },
  { href: "/nclex", icon: Brain, label: "NCLEX" },
  { href: "/review", icon: BookOpen, label: "錯題" },
  { href: "/stats", icon: BarChart3, label: "統計" },
  { href: "/achievements", icon: Trophy, label: "成就" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors duration-150",
                active ? "text-[var(--gold)]" : "text-[var(--text-muted)]"
              )}
            >
              <tab.icon size={20} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
