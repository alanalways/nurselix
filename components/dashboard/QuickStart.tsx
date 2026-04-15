"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Zap, BookOpen, GraduationCap, Target, AlertTriangle } from "lucide-react";
import Badge from "@/components/ui/Badge";

const modes = [
  {
    icon: Brain,
    title: "CAT 智能考試",
    desc: "自適應題目，精準評估你的能力值",
    href: "/nclex/cat",
    badge: "Pro",
    badgeVariant: "gold" as const,
    gradient: "from-[var(--blue-dim)] to-transparent",
    border: "border-[var(--blue)]",
  },
  {
    icon: Zap,
    title: "練習模式",
    desc: "立即看解析，快速累積答題技巧",
    href: "/nclex/practice",
    badge: "免費",
    badgeVariant: "success" as const,
    gradient: "from-[var(--gold-dim)] to-transparent",
    border: "border-[var(--gold)]",
  },
  {
    icon: BookOpen,
    title: "Tutor 模式",
    desc: "詳細解說每一題，深度理解知識點",
    href: "/nclex/tutor",
    badge: "Basic+",
    badgeVariant: "blue" as const,
    gradient: "from-[rgba(46,204,113,0.10)] to-transparent",
    border: "border-[var(--success)]",
  },
  {
    icon: GraduationCap,
    title: "Mock 考試",
    desc: "全真模擬 NCLEX 考試環境（5小時）",
    href: "/nclex/mock",
    badge: "Pro",
    badgeVariant: "gold" as const,
    gradient: "from-[rgba(231,76,60,0.10)] to-transparent",
    border: "border-[var(--error)]",
  },
  {
    icon: AlertTriangle,
    title: "錯題挑戰",
    desc: "攻克你的弱點題目，SM-2 間隔複習",
    href: "/nclex/error-challenge",
    badge: null,
    badgeVariant: "muted" as const,
    gradient: "from-[rgba(243,156,18,0.10)] to-transparent",
    border: "border-[var(--warning)]",
  },
  {
    icon: Target,
    title: "Mini CAT 體驗",
    desc: "免費用戶每月一次 15 題體驗測驗",
    href: "/nclex/mini-cat",
    badge: "每月一次",
    badgeVariant: "muted" as const,
    gradient: "from-[var(--bg-elevated)] to-transparent",
    border: "border-[var(--border-default)]",
  },
];

export default function QuickStart() {
  const router = useRouter();

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">快速開始</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modes.map((m, i) => (
          <motion.div
            key={m.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -3, boxShadow: "var(--glow-gold)" }}
            onClick={() => router.push(m.href)}
            className={`cursor-pointer p-4 rounded-xl border bg-[var(--bg-surface)] bg-gradient-to-br ${m.gradient} border-[var(--border-default)] hover:${m.border} transition-all duration-200`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center">
                <m.icon size={20} className="text-[var(--text-primary)]" />
              </div>
              {m.badge && <Badge variant={m.badgeVariant}>{m.badge}</Badge>}
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">{m.title}</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{m.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
