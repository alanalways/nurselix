"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, Zap, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import OptionButton from "@/components/nclex/OptionButton";

const mockChallenge = {
  date: new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" }),
  totalAttempts: 1247,
  correctRate: 68,
  question: {
    id: "daily-1",
    stem: "A nurse is preparing to administer a blood transfusion. The client's blood type is A positive. Which blood type is safe to transfuse if A positive is unavailable?",
    optionA: "O negative",
    optionB: "B positive",
    optionC: "AB positive",
    optionD: "O positive",
    correctAnswer: "A",
    explanationZh: "O 型 Rh 陰性（O negative）是「萬用供血者」（Universal Donor），可以安全輸給任何血型的病人，包括 A 型、B 型、AB 型，以及 Rh 陽性或陰性的患者。這是因為 O 型血沒有 A 或 B 抗原，不會引發受血者的免疫反應。選項 D 的 O positive 雖然沒有 A/B 抗原，但含有 Rh 因子，對 Rh 陰性的病人可能造成溶血反應。",
    domain: "Physiological Adaptation",
    difficulty: "MEDIUM" as const,
    tags: ["blood transfusion", "blood types"],
  },
};

export default function DailyChallengePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const q = mockChallenge.question;
  const options = [
    { label: "A", text: q.optionA, key: "A" },
    { label: "B", text: q.optionB, key: "B" },
    { label: "C", text: q.optionC, key: "C" },
    { label: "D", text: q.optionD, key: "D" },
  ];

  const getState = (key: string) => {
    if (!confirmed) return selected === key ? "selected" : "default";
    if (key === q.correctAnswer) return "correct";
    if (key === selected) return "incorrect";
    return "default";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={18} className="text-[var(--gold)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">每日挑戰</h1>
            <Badge variant="gold">今日</Badge>
          </div>
          <p className="text-[var(--text-secondary)]">{mockChallenge.date}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
            <Users size={14} />
            <span>{mockChallenge.totalAttempts.toLocaleString()} 人作答</span>
          </div>
          <div className="text-sm text-[var(--success)] mt-0.5">全站正確率 {mockChallenge.correctRate}%</div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="muted">{q.domain}</Badge>
          <Badge variant="gold">{q.difficulty}</Badge>
        </div>
        <p className="text-[var(--text-primary)] leading-relaxed font-sora">{q.stem}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((opt) => (
          <OptionButton
            key={opt.key}
            label={opt.label}
            text={opt.text}
            state={getState(opt.key) as "default" | "selected" | "correct" | "incorrect"}
            disabled={confirmed}
            onClick={() => !confirmed && setSelected(opt.key)}
          />
        ))}
      </div>

      {/* Result */}
      {confirmed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-[var(--gold)]" />
            <h3 className="font-semibold text-[var(--text-primary)] font-noto-serif">解析</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-noto-sans">
            {q.explanationZh}
          </p>
        </motion.div>
      )}

      {/* Action */}
      {!confirmed ? (
        <Button fullWidth disabled={!selected} onClick={() => setConfirmed(true)}>
          <Zap size={16} /> 確認作答
        </Button>
      ) : (
        <div className="text-center text-sm text-[var(--text-muted)]">
          明天再來新的每日挑戰！
        </div>
      )}
    </motion.div>
  );
}
