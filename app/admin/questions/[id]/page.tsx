"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Archive } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface QuestionFull {
  id: string;
  stem: string;
  stemZh: string | null;
  scenarioEn: string | null;
  scenarioZh: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string | null;
  optionF: string | null;
  correctAnswer: string;
  correctAnswers: string[];
  explanationZh: string;
  explanationEn: string | null;
  usTwDifference: string | null;
  domain: string | null;
  subDomain: string | null;
  questionType: "MCQ" | "SATA" | "ORDERED" | "MATRIX" | "BOWTIE" | "DROPDOWN" | "HIGHLIGHT";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  status: "APPROVED" | "DRAFT" | "ARCHIVED";
  tags: string[];
  attemptCount: number;
  correctCount: number;
}

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [q, setQ] = useState<QuestionFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/questions/${params.id}`, { cache: "no-store" });
        if (!res.ok) {
          setError(`載入失敗 (${res.status})`);
          return;
        }
        setQ(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "網路錯誤");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const save = async () => {
    if (!q || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stem: q.stem,
          stemZh: q.stemZh,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          optionE: q.optionE,
          optionF: q.optionF,
          correctAnswer: q.correctAnswer,
          correctAnswers: q.correctAnswer.split(",").map((s) => s.trim().toUpperCase()),
          explanationZh: q.explanationZh,
          explanationEn: q.explanationEn,
          usTwDifference: q.usTwDifference,
          domain: q.domain,
          questionType: q.questionType,
          difficulty: q.difficulty,
          status: q.status,
          tags: q.tags,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
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

  const archive = async () => {
    if (!q) return;
    if (!confirm("確定要封存這道題目嗎？封存後將不會再出現在考試中。")) return;
    await fetch(`/api/admin/questions/${params.id}`, { method: "DELETE" });
    router.push("/admin/questions");
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[var(--gold)]" />
        <p className="text-sm text-[var(--text-secondary)]">載入題目...</p>
      </div>
    );
  }

  if (error || !q) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--error)] mb-4">{error ?? "找不到題目"}</p>
        <Button onClick={() => router.push("/admin/questions")}>回列表</Button>
      </div>
    );
  }

  const update = <K extends keyof QuestionFull>(k: K, v: QuestionFull[K]) => setQ({ ...q, [k]: v });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-4xl mx-auto space-y-5"
    >
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">編輯題目</h1>
        <Badge variant={q.status === "APPROVED" ? "success" : q.status === "DRAFT" ? "warning" : "muted"}>{q.status}</Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={archive}><Archive size={14} /> 封存</Button>
          <Button onClick={save} disabled={saving}><Save size={14} /> {saving ? "儲存中..." : "儲存"}</Button>
        </div>
      </div>

      {error && (
        <div className="bg-[rgba(231,76,60,0.10)] border border-[var(--error)] rounded-lg p-3 text-sm text-[var(--error)]">{error}</div>
      )}

      {/* Statistics */}
      <div className="flex gap-3 text-xs text-[var(--text-muted)]">
        <span>嘗試 {q.attemptCount}</span>
        <span>答對 {q.correctCount}</span>
        {q.attemptCount > 0 && (
          <span className="text-[var(--warning)]">
            錯誤率 {Math.round(((q.attemptCount - q.correctCount) / q.attemptCount) * 100)}%
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select label="題型" value={q.questionType} onChange={(v) => update("questionType", v as QuestionFull["questionType"])}
          options={["MCQ", "SATA", "ORDERED", "MATRIX", "BOWTIE", "DROPDOWN", "HIGHLIGHT"]}/>
        <Select label="難度" value={q.difficulty} onChange={(v) => update("difficulty", v as QuestionFull["difficulty"])}
          options={["EASY", "MEDIUM", "HARD"]}/>
        <Select label="狀態" value={q.status} onChange={(v) => update("status", v as QuestionFull["status"])}
          options={["DRAFT", "APPROVED", "ARCHIVED"]}/>
        <Input label="Domain" value={q.domain ?? ""} onChange={(v) => update("domain", v || null)} />
      </div>

      <Textarea label="題幹 Stem (EN)" value={q.stem} onChange={(v) => update("stem", v)} rows={4} />
      <Textarea label="題幹 Stem (ZH) 選填" value={q.stemZh ?? ""} onChange={(v) => update("stemZh", v || null)} rows={3} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="選項 A" value={q.optionA} onChange={(v) => update("optionA", v)} />
        <Input label="選項 B" value={q.optionB} onChange={(v) => update("optionB", v)} />
        <Input label="選項 C" value={q.optionC} onChange={(v) => update("optionC", v)} />
        <Input label="選項 D" value={q.optionD} onChange={(v) => update("optionD", v)} />
        <Input label="選項 E（SATA 用）" value={q.optionE ?? ""} onChange={(v) => update("optionE", v || null)} />
        <Input label="選項 F（SATA 用）" value={q.optionF ?? ""} onChange={(v) => update("optionF", v || null)} />
      </div>

      <Input label="正確答案（單選填 D；SATA 填 B,C,E）" value={q.correctAnswer} onChange={(v) => update("correctAnswer", v.toUpperCase())} />

      <Textarea label="中文解析" value={q.explanationZh} onChange={(v) => update("explanationZh", v)} rows={6} />
      <Textarea label="英文解析（選填）" value={q.explanationEn ?? ""} onChange={(v) => update("explanationEn", v || null)} rows={4} />
      <Textarea label="台美差異提示（選填）" value={q.usTwDifference ?? ""} onChange={(v) => update("usTwDifference", v || null)} rows={3} />
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
