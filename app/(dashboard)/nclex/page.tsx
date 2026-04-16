"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Zap, BookOpen, GraduationCap, AlertTriangle, Target, ChevronRight, TrendingUp, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Progress from "@/components/ui/Progress";

const modes = [
  {
    icon: Brain,
    title: "CAT 智能考試",
    titleEn: "Computer Adaptive Test",
    desc: "85-150 題，自適應選題，2026 NCLEX 規格，直到達到 95% 信心水準停止",
    href: "/nclex/cat",
    badge: "Pro",
    badgeVariant: "gold" as const,
    color: "text-[var(--blue)]",
    bg: "bg-[var(--blue-dim)]",
    time: "約 5 小時",
  },
  {
    icon: Zap,
    title: "練習模式",
    titleEn: "Practice Mode",
    desc: "答題後立即顯示對錯與中文解析，快速累積答題技巧",
    href: "/nclex/practice",
    badge: "免費",
    badgeVariant: "success" as const,
    color: "text-[var(--gold)]",
    bg: "bg-[var(--gold-dim)]",
    time: "自由設定",
  },
  {
    icon: BookOpen,
    title: "Tutor 模式",
    titleEn: "Tutor Mode",
    desc: "詳細解說每一題，含學習重點提示與台美差異，深度理解知識點",
    href: "/nclex/tutor",
    badge: "Basic+",
    badgeVariant: "blue" as const,
    color: "text-[var(--success)]",
    bg: "bg-[rgba(46,204,113,0.15)]",
    time: "自由設定",
  },
  {
    icon: GraduationCap,
    title: "Mock 考試",
    titleEn: "Mock Exam",
    desc: "全真模擬 NCLEX 環境，5 小時限時，答題中不顯示對錯",
    href: "/nclex/mock",
    badge: "Pro",
    badgeVariant: "gold" as const,
    color: "text-[var(--error)]",
    bg: "bg-[rgba(231,76,60,0.10)]",
    time: "5 小時",
  },
  {
    icon: AlertTriangle,
    title: "錯題挑戰",
    titleEn: "Error Challenge",
    desc: "SM-2 間隔複習演算法，攻克你最弱的題目",
    href: "/nclex/error-challenge",
    badge: null,
    badgeVariant: "muted" as const,
    color: "text-[var(--warning)]",
    bg: "bg-[rgba(243,156,18,0.10)]",
    time: "自由設定",
  },
  {
    icon: Target,
    title: "Mini CAT 體驗",
    titleEn: "Mini CAT",
    desc: "免費用戶每月一次體驗，15 題快速評估你的能力值",
    href: "/nclex/mini-cat",
    badge: "每月一次",
    badgeVariant: "muted" as const,
    color: "text-[var(--text-secondary)]",
    bg: "bg-[var(--bg-overlay)]",
    time: "約 15 分鐘",
  },
];

const domains = [
  { name: "Management of Care", zh: "管理照護", pct: 0, done: 0, total: 0 },
  { name: "Safety & Infection Control", zh: "安全感染控制", pct: 0, done: 0, total: 0 },
  { name: "Health Promotion", zh: "健康促進與維護", pct: 0, done: 0, total: 0 },
  { name: "Psychosocial Integrity", zh: "心理社會完整性", pct: 0, done: 0, total: 0 },
  { name: "Basic Care & Comfort", zh: "基本照護與舒適", pct: 0, done: 0, total: 0 },
  { name: "Pharmacological", zh: "藥理與腸外用藥", pct: 0, done: 0, total: 0 },
  { name: "Reduction of Risk", zh: "降低風險潛力", pct: 0, done: 0, total: 0 },
  { name: "Physiological Adaptation", zh: "生理適應", pct: 0, done: 0, total: 0 },
];

export default function NclexPage() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-4 md:p-6 max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">NCLEX 練習</h1>
          <p className="text-[var(--text-secondary)] mt-1">選擇你的練習模式開始備考</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <TrendingUp size={16} className="text-[var(--text-muted)]" />
          <span>能力值：<span className="text-[var(--text-muted)] font-semibold font-mono">θ = --</span></span>
        </div>
      </div>

      {/* Mode Cards */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">練習模式</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modes.map((m, i) => (
            <motion.div
              key={m.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3, boxShadow: "var(--glow-gold)" }}
              onClick={() => router.push(m.href)}
              className="cursor-pointer p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--gold)] transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${m.bg} flex items-center justify-center`}>
                  <m.icon size={22} className={m.color} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  {m.badge && <Badge variant={m.badgeVariant}>{m.badge}</Badge>}
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Clock size={10} />{m.time}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-0.5">{m.title}</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">{m.titleEn}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{m.desc}</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-[var(--gold)]">
                開始 <ChevronRight size={12} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Domain Progress */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">各 Domain 進度</h2>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <div className="space-y-4">
            {domains.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{d.zh}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-2">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{d.done}/{d.total} 題</span>
                    <span className={`text-sm font-semibold font-mono ${d.pct >= 70 ? "text-[var(--success)]" : d.pct >= 50 ? "text-[var(--warning)]" : "text-[var(--error)]"}`}>
                      {d.pct}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={d.pct}
                  size="sm"
                  color={d.pct >= 70 ? "success" : d.pct >= 50 ? "gold" : "error"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/nclex/assessment")}>
          重做初始評估
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.push("/review")}>
          查看錯題本
        </Button>
      </div>
    </motion.div>
  );
}
