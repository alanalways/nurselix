"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Brain, BookOpen, Calendar, BarChart3,
  Trophy, Bookmark, Settings, ChevronLeft, ChevronRight,
  LogOut, Star, Shield, Sparkles, Zap, Globe, Library
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Badge from "@/components/ui/Badge";
import { signOut, useSession } from "next-auth/react";
import { isPaymentPublic } from "@/lib/utils/paymentFlag";

const navItems = [
  { href: "/home", icon: LayoutDashboard, label: "Reader's Desk" },
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
  { href: "/toeic", icon: Star, label: "TOEIC", badge: null },
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
      className="hidden md:flex flex-col h-full border-r overflow-hidden flex-shrink-0"
      style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 p-4 border-b h-16 flex-shrink-0"
        style={{ borderColor: "var(--j-line)" }}
      >
        <Link href="/" className="flex items-center gap-2 overflow-hidden min-w-0">
          <span
            className="j-display flex-shrink-0"
            style={{ fontSize: 22, fontStyle: "italic", color: "var(--j-phosphor)" }}
          >
            ⌁
          </span>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="j-display whitespace-nowrap"
                style={{ fontStyle: "italic", fontSize: 18, letterSpacing: "-0.01em" }}
              >
                Nurslix<span style={{ color: "var(--j-phosphor)" }}>⌁</span>Journal
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));
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
                <item.icon size={17} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 whitespace-nowrap j-zh"
                      style={{ fontSize: 14 }}
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

        <div
          className="pt-3 mt-3 border-t"
          style={{ borderColor: "var(--j-line)" }}
        >
          {secondaryItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "sidebar-link opacity-50",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={17} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 whitespace-nowrap j-zh"
                      style={{ fontSize: 14 }}
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
      <div className="p-3 border-t space-y-0.5" style={{ borderColor: "var(--j-line)" }}>
        {isElite && (
          <Link href="/nclex/ai-report">
            <div
              className={cn(
                "sidebar-link",
                pathname === "/nclex/ai-report" && "active",
                collapsed && "justify-center px-0"
              )}
              style={{ color: "var(--j-phosphor)" }}
              title={collapsed ? "AI 分析" : undefined}
            >
              <Sparkles size={17} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 j-zh" style={{ fontSize: 14 }}>AI 分析</span>
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
                "sidebar-link",
                pathname.startsWith("/admin") && "active",
                collapsed && "justify-center px-0"
              )}
              style={{ color: "var(--j-phosphor)" }}
              title={collapsed ? "管理後台" : undefined}
            >
              <Shield size={17} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 j-zh" style={{ fontSize: 14 }}>管理後台</span>
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
                "sidebar-link",
                pathname === "/pricing" && "active",
                collapsed && "justify-center px-0"
              )}
              style={{ color: "var(--j-phosphor)", border: "1px solid var(--j-phosphor-line)" }}
              title={collapsed ? "升級方案" : undefined}
            >
              <Zap size={16} className="flex-shrink-0" />
              {!collapsed && (
                <span className="flex-1 j-mono" style={{ fontSize: 11 }}>
                  {plan === "FREE" ? "Subscribe →" : "Upgrade →"}
                </span>
              )}
            </div>
          </Link>
        )}
        <Link href="/settings">
          <div className={cn("sidebar-link", collapsed && "justify-center px-0")} title={collapsed ? "設定" : undefined}>
            <Settings size={17} />
            {!collapsed && <span className="j-zh" style={{ fontSize: 14 }}>設定</span>}
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn("sidebar-link w-full", collapsed && "justify-center px-0")}
          style={{ color: "var(--j-ink-muted)" }}
          title={collapsed ? "登出" : undefined}
        >
          <LogOut size={17} />
          {!collapsed && <span className="j-zh" style={{ fontSize: 14 }}>登出</span>}
        </button>
        {onCollapse && (
          <button
            onClick={() => onCollapse(!collapsed)}
            className="sidebar-link w-full justify-center mt-1"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>
    </motion.aside>
  );
}
