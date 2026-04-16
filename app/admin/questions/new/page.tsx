"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import Button from "@/components/ui/Button";

const DOMAINS = [
  "Management of Care", "Safety & Infection Control", "Health Promotion & Maintenance",
  "Psychosocial Integrity", "Basic Care & Comfort", "Pharmacological & Parenteral",
  "Reduction of Risk Potential", "Physiological Adaptation",
];

interface Draft {
  stem: string;
  stemZh: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  optionF: string;
  correctAnswer: string;
  explanationZh: string;
  explanationEn: string;
  usTwDifference: string;
  domain: string;
  questionType: "MCQ" | "SATA";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  status: "DRAFT" | "APPROVED";
}

export default function NewQuestionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [d, setD] = useState<Draft>({
    stem: "",
    stemZh: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    optionF: "",
    correctAnswer: "A",
    explanationZh: "",
    explanationEn: "",
    usTwDifference: "",
    domain: "Management of Care",
    questionType: "MCQ",
    difficulty: "MEDIUM",
    status: "DRAFT",
  });

  const handleSave = async () => {
    if (saving) return;
    if (!d.stem || !d.optionA || !d.optionB || !d.optionC || !d.optionD || !d.correctAnswer || !d.explanationZh) {
      setError("請填寫必填欄位：題幹、四個選項、正確答案、中文解析");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        stem: d.stem,
        optionA: d.optionA,
        optionB: d.optionB,
        optionC: d.optionC,
        optionD: d.optionD,
        correctAnswer: d.correctAnswer.toUpperCase(),
        correctAnswers: d.correctAnswer.toUpperCase().split(",").map((s) => s.trim()).filter(Boolean),
        explanationZh: d.explanationZh,
        domain: d.domain,
        questionType: d.questionType,
        difficulty: d.difficulty,
        status: d.status,
      };
      if (d.stemZh) payload.stemZh = d.stemZh;
      if (d.optionE) payload.optionE = d.optionE;
      if (d.optionF) payload.optionF = d.optionF;
      if (d.explanationEn) payload.explanationEn = d.explanationEn;
      if (d.usTwDifference) payload.usTwDifference = d.usTwDifference;

      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      router.push("/admin/questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "網路錯誤");
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-4xl mx-auto space-y-5"
    >
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">新增題目</h1>
        <div className="ml-auto flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? "儲存中..." : "儲存"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-[rgba(231,76,60,0.10)] border border-[var(--error)] rounded-lg p-3 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select label="題型" value={d.questionType} onChange={(v) => update("questionType", v as Draft["questionType"])} options={["MCQ", "SATA"]} />
        <Select label="難度" value={d.difficulty} onChange={(v) => update("difficulty", v as Draft["difficulty"])} options={["EASY", "MEDIUM", "HARD"]} />
        <Select label="狀態" value={d.status} onChange={(v) => update("status", v as Draft["status"])} options={["DRAFT", "APPROVED"]} />
        <Select label="Domain" value={d.domain} onChange={(v) => update("domain", v)} options={DOMAINS} />
      </div>

      <Textarea label="題幹 Stem (EN) *" value={d.stem} onChange={(v) => update("stem", v)} rows={4} />
      <Textarea label="題幹 Stem (ZH) 選填" value={d.stemZh} onChange={(v) => update("stemZh", v)} rows={3} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="選項 A *" value={d.optionA} onChange={(v) => update("optionA", v)} />
        <Input label="選項 B *" value={d.optionB} onChange={(v) => update("optionB", v)} />
        <Input label="選項 C *" value={d.optionC} onChange={(v) => update("optionC", v)} />
        <Input label="選項 D *" value={d.optionD} onChange={(v) => update("optionD", v)} />
        <Input label="選項 E（SATA 用）" value={d.optionE} onChange={(v) => update("optionE", v)} />
        <Input label="選項 F（SATA 用）" value={d.optionF} onChange={(v) => update("optionF", v)} />
      </div>

      <Input label="正確答案（MCQ 填 D；SATA 填 B,C,E） *" value={d.correctAnswer} onChange={(v) => update("correctAnswer", v.toUpperCase())} />

      <Textarea label="中文解析 *（300 字以上建議）" value={d.explanationZh} onChange={(v) => update("explanationZh", v)} rows={6} />
      <Textarea label="英文解析（選填）" value={d.explanationEn} onChange={(v) => update("explanationEn", v)} rows={3} />
      <Textarea label="台美差異提示（選填）" value={d.usTwDifference} onChange={(v) => update("usTwDifference", v)} rows={3} />
    </motion.div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs text-[var(--text-muted)] mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--gold)] outline-none"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="block text-xs text-[var(--text-muted)] mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--gold)] outline-none font-mono"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-xs text-[var(--text-muted)] mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--gold)] outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
