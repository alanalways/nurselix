"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen, FileText, AlignLeft, ChevronRight,
  Clock, Target, TrendingUp
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const parts = [
  {
    part: "Part 5",
    title: "Incomplete Sentences",
    titleZh: "不完整句子",
    desc: "選出最適合填入空格的單字或詞組，測驗文法與詞彙能力",
    questions: 30,
    icon: FileText,
    color: "text-[var(--blue)]",
    bg: "bg-[var(--blue-dim)]",
    href: "/toeic/practice?part=Part+5",
    badge: "文法・詞彙",
    badgeVariant: "blue" as const,
  },
  {
    part: "Part 6",
    title: "Text Completion",
    titleZh: "篇章填空",
    desc: "閱讀短篇文章並填入最適合的字詞或句子",
    questions: 16,
    icon: AlignLeft,
    color: "text-[var(--gold)]",
    bg: "bg-[var(--gold-dim)]",
    href: "/toeic/practice?part=Part+6",
    badge: "閱讀・文脈",
    badgeVariant: "gold" as const,
  },
  {
    part: "Part 7",
    title: "Reading Comprehension",
    titleZh: "閱讀理解",
    desc: "閱讀單篇或多篇文章後回答相關問題，測驗整體閱讀能力",
    questions: 54,
    icon: BookOpen,
    color: "text-[var(--success)]",
    bg: "bg-[rgba(46,204,113,0.15)]",
    href: "/toeic/practice?part=Part+7",
    badge: "閱讀・推論",
    badgeVariant: "success" as const,
  },
];

const TOEIC_BANDS = [
  { range: "860–990", level: "C1", desc: "高級專業應用", color: "var(--gold)" },
  { range: "730–855", level: "B2", desc: "進階職場英語", color: "var(--blue)" },
  { range: "470–725", level: "B1", desc: "中級溝通能力", color: "var(--success)" },
  { range: "220–465", level: "A2", desc: "基礎英語能力", color: "var(--warning)" },
];

export default function ToeicPage() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-4 md:p-6 max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">TOEIC 閱讀練習</h1>
            <Badge variant="blue">閱讀模組</Badge>
          </div>
          <p className="text-[var(--text-secondary)]">
            針對台灣護理師的 TOEIC 備考題庫 — Part 5 / 6 / 7 閱讀全覆蓋
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <TrendingUp size={16} className="text-[var(--text-muted)]" />
          <span>最近分數：<span className="text-[var(--text-muted)] font-semibold font-mono">---</span></span>
        </div>
      </div>

      {/* Quick Start */}
      <div
        className="rounded-xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
      >
        <div className="flex-1">
          <h2 className="font-semibold text-[var(--text-primary)] mb-1">快速練習</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            混合 Part 5 / 6 / 7 各類題型，隨機抽題即時練習
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-[var(--text-muted)] flex items-center gap-1">
            <Clock size={14} />10 題
          </div>
          <Button onClick={() => router.push("/toeic/practice")}>
            開始練習 <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>

      {/* Part Cards */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">按 Part 練習</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {parts.map((p, i) => (
            <motion.div
              key={p.part}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3, boxShadow: "var(--glow-gold)" }}
              onClick={() => router.push(p.href)}
              className="cursor-pointer p-5 rounded-xl border bg-[var(--bg-surface)] hover:border-[var(--gold)] transition-all duration-200"
              style={{ borderColor: "var(--border-default)" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${p.bg} flex items-center justify-center`}>
                  <p.icon size={22} className={p.color} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={p.badgeVariant}>{p.badge}</Badge>
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Target size={10} />{p.questions} 題型
                  </span>
                </div>
              </div>
              <p className="text-xs font-mono text-[var(--text-muted)] mb-0.5">{p.part}</p>
              <h3 className="font-semibold text-[var(--text-primary)] mb-0.5">{p.titleZh}</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">{p.title}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{p.desc}</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-[var(--gold)]">
                開始練習 <ChevronRight size={12} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* About TOEIC Reading */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">TOEIC 閱讀測驗說明</h2>
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 rounded-lg bg-[var(--bg-overlay)]">
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">100</div>
              <div className="text-[var(--text-muted)] mt-1">閱讀題數</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-overlay)]">
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">75</div>
              <div className="text-[var(--text-muted)] mt-1">分鐘時限</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-overlay)]">
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">495</div>
              <div className="text-[var(--text-muted)] mt-1">閱讀滿分</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">分數對照</h3>
            <div className="space-y-2">
              {TOEIC_BANDS.map((b) => (
                <div key={b.range} className="flex items-center gap-3 text-sm">
                  <span
                    className="font-mono font-semibold w-24 flex-shrink-0"
                    style={{ color: b.color }}
                  >{b.range}</span>
                  <span className="font-semibold text-[var(--text-primary)] w-8">{b.level}</span>
                  <span className="text-[var(--text-secondary)]">{b.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] border-t pt-4" style={{ borderColor: "var(--j-line)" }}>
            本平台目前提供 TOEIC 閱讀部分（Part 5–7）練習，題目融合護理職場情境。
            聽力部分（Part 1–4）規劃於後續版本推出。
          </p>
        </div>
      </div>
    </motion.div>
  );
}
