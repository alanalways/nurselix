"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Brain, BookOpen, Calendar, BarChart3,
  Trophy, Bookmark, Settings, ChevronLeft, ChevronRight,
  LogOut, Star, Shield, Sparkles, Zap, Globe, Library
} from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import { cn } from "@/lib/utils/cn";
import Badge from "@/components/ui/Badge";
import { signOut, useSession } from "next-auth/react";
import { isPaymentPublic } from "@/lib/utils/paymentFlag";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "儀表板" },
  { href: "/nclex", icon: Brain, label: "NCLEX 練習", badge: "主要" },
  { href: "/review", icon: BookOpen, label: "錯題複習" },
  { href: "/vocab", icon: Library, label: "單字詞庫" },
  { href: "/daily-challenge", icon: Calendar, label: "每日挑戰" },
  { href: "/insights", icon: Sparkles, label: "AI 洞察", badge: "Hermes" },
  { href: "/stats", icon: BarChart3, label: "學習統計" },
  { href: "/achievements", icon: Trophy, label: "成就" },
  { href: "/bookmarks", icon: Bookmark, label: "收藏題目" },
  { href: "/nursing-career", icon: Globe, label: "RN 職業指南" },
];

const secondaryItems = [
  { href: "/toeic", icon: Star, label: "TOEIC", badge: "即將推出" },
  { href: "/ielts", icon: Star, label: "IELTS", badge: "即將推出" },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (v: boolean) => void;
}

export default function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const plan = (session?.user as any)?.plan ?? "FREE";
  const isElite = plan === "ELITE";

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="hidden md:flex flex-col h-full border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border-subtle)] h-16">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center flex-shrink-0">
          <NurslixIconSquare size={22} className="text-[#080E1A]" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="font-bold text-lg text-gradient-gold whitespace-nowrap"
            >
              Nurslix
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "sidebar-link",
                  active && "active",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && item.badge && (
                  <Badge variant="gold" className="text-[10px] px-1.5 py-0.5">{item.badge}</Badge>
                )}
              </div>
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
          {secondaryItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "sidebar-link opacity-50",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && item.badge && (
                  <Badge variant="muted" className="text-[10px] px-1.5 py-0.5">{item.badge}</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[var(--border-subtle)] space-y-1">
        {isElite && (
          <Link href="/nclex/ai-report">
            <div
              className={cn(
                "sidebar-link text-[var(--gold)]",
                pathname === "/nclex/ai-report" && "active",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? "AI 分析" : undefined}
            >
              <Sparkles size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">AI 分析</span>
                  <Badge variant="gold" className="text-[10px] px-1.5 py-0.5">Elite</Badge>
                </>
              )}
            </div>
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin">
            <div
              className={cn(
                "sidebar-link text-[var(--gold)]",
                pathname.startsWith("/admin") && "active",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? "管理後台" : undefined}
            >
              <Shield size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">管理後台</span>
                  <Badge variant="gold" className="text-[10px] px-1.5 py-0.5">Admin</Badge>
                </>
              )}
            </div>
          </Link>
        )}
        {!isElite && isPaymentPublic() && (
          <Link href="/pricing">
            <div
              className={cn(
                "sidebar-link relative overflow-hidden",
                "border border-[var(--gold)] bg-gradient-to-r from-[var(--gold-dim)] to-transparent",
                "text-[var(--gold)] hover:bg-[var(--gold-dim)]",
                pathname === "/pricing" && "active",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? "升級方案" : undefined}
            >
              <Zap size={16} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 font-semibold">
                    {plan === "FREE" ? "開始免費試用" : "升級方案"}
                  </span>
                  <Badge variant="gold" className="text-[10px] px-1.5 py-0.5">
                    {plan === "FREE" ? "Pro 7天免費" : "升級"}
                  </Badge>
                </>
              )}
            </div>
          </Link>
        )}
        <Link href="/settings">
          <div className={cn("sidebar-link", collapsed && "justify-center px-0")}>
            <Settings size={18} />
            {!collapsed && <span>設定</span>}
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn("sidebar-link w-full hover:text-[var(--error)]", collapsed && "justify-center px-0")}
        >
          <LogOut size={18} />
          {!collapsed && <span>登出</span>}
        </button>
        {onCollapse && (
          <button
            onClick={() => onCollapse(!collapsed)}
            className="sidebar-link w-full justify-center mt-1"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>
    </motion.aside>
  );
}
