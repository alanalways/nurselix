"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, RefreshCw, AlertCircle, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Flag, Shuffle, BookOpen, Filter,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface Question {
  id: string;
  stem: string;
  options: Record<string, string>;
  correctAnswer: string;
  correctAnswers: string[];
  questionType: string;
  difficulty: string;
  domain: string | null;
  explanationZh: string | null;
  createdBy: string | null;
}

type Verdict = "ok" | "flag" | null;

const DIFFICULTY_VARIANT: Record<string, any> = {
  EASY: "success",
  MEDIUM: "gold",
  HARD: "error",
};

const DOMAINS = [
  "Management of Care",
  "Safety & Infection Control",
  "Health Promotion & Maintenance",
  "Psychosocial Integrity",
  "Basic Care & Comfort",
  "Pharmacological & Parenteral",
  "Reduction of Risk Potential",
  "Physiological Adaptation",
];

export default function SpotCheckPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [n, setN] = useState(20);
  const [domain, setDomain] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [createdBy, setCreatedBy] = useState("core-import");

  const [showAnswer, setShowAnswer] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setVerdicts({});
    setNotes({});
    setIdx(0);
    setShowAnswer(false);
    try {
      const params = new URLSearchParams({ n: String(n) });
      if (domain) params.set("domain", domain);
      if (difficulty) params.set("difficulty", difficulty);
      if (createdBy) params.set("createdBy", createdBy);
      const res = await fetch(`/api/admin/questions/sample?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setQuestions(data.questions);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  };

  const setVerdict = (id: string, v: Verdict) => {
    setVerdicts((prev) => ({ ...prev, [id]: v }));
    if (idx < questions.length - 1) {
      setTimeout(() => { setIdx((i) => i + 1); setShowAnswer(false); }, 300);
    }
  };

  const q = questions[idx] ?? null;
  const answered = Object.keys(verdicts).length;
  const flagged = Object.values(verdicts).filter((v) => v === "flag").length;
  const ok = Object.values(verdicts).filter((v) => v === "ok").length;

  const correctLetters: string[] = q
    ? (q.correctAnswers?.length > 0
        ? (q.correctAnswers.length === 1 && q.correctAnswers[0].includes(",")
            ? q.correctAnswers[0].split(",").map((s) => s.trim())
            : q.correctAnswers)
        : q.correctAnswer.split(",").map((s) => s.trim()))
    : [];

  const exportFlagged = () => {
    const rows = Object.entries(verdicts)
      .filter(([, v]) => v === "flag")
      .map(([id]) => {
        const q = questions.find((q) => q.id === id);
        return { id, note: notes[id] ?? "", domain: q?.domain, difficulty: q?.difficulty, stem: q?.stem?.slice(0, 80) };
      });
    const csv = ["id,domain,difficulty,note,stem"]
      .concat(rows.map((r) => `${r.id},${r.domain ?? ""},${r.difficulty ?? ""},"${r.note}","${r.stem}"`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `flagged-questions-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">人工抽查</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            隨機抽取題目，逐題標記「OK」或「有問題」，找出需要人工修正的題目
          </p>
        </div>
        {flagged > 0 && (
          <Button size="sm" variant="outline" onClick={exportFlagged}>
            <Flag size={14} /> 匯出 {flagged} 筆問題題目 (CSV)
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[var(--text-secondary)]">
          <Filter size={14} /> 抽樣設定
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">抽取題數</label>
            <select
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:border-[var(--gold)] outline-none"
            >
              {[10, 20, 50, 100].map((v) => <option key={v} value={v}>{v} 題</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:border-[var(--gold)] outline-none"
            >
              <option value="">全部</option>
              {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">難度</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:border-[var(--gold)] outline-none"
            >
              <option value="">全部</option>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">來源</label>
            <select
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:border-[var(--gold)] outline-none"
            >
              <option value="">全部</option>
              <option value="core-import">core-import（AI 生成）</option>
              <option value="pool-import">pool-import（原始題庫）</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <Button variant="gold" size="sm" onClick={load} loading={loading}>
            <Shuffle size={14} /> 開始抽樣
          </Button>
          {total !== null && (
            <span className="text-xs text-[var(--text-muted)] ml-3">
              此篩選條件共 {total.toLocaleString()} 題，隨機抽取 {questions.length} 題
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {questions.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">
              第 {idx + 1} / {questions.length} 題 · 已審核 {answered} 題
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[var(--success)] text-xs">
                <CheckCircle2 size={12} /> {ok} OK
              </span>
              <span className="flex items-center gap-1 text-[var(--error)] text-xs">
                <Flag size={12} /> {flagged} 有問題
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full bg-[var(--gold)] transition-all duration-300"
              style={{ width: `${(answered / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-16 gap-3">
          <Loader2 className="animate-spin text-[var(--gold)]" size={28} />
          <p className="text-sm text-[var(--text-secondary)]">隨機抽樣中...</p>
        </div>
      )}

      {/* Question card */}
      {!loading && q && (
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5"
          >
            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={DIFFICULTY_VARIANT[q.difficulty] ?? "muted"} className="text-xs">
                {q.difficulty}
              </Badge>
              <Badge variant="muted" className="text-xs">{q.questionType}</Badge>
              {q.domain && <Badge variant="blue" className="text-xs">{q.domain}</Badge>}
              {q.createdBy && (
                <Badge variant={q.createdBy === "core-import" ? "warning" : "muted"} className="text-xs">
                  {q.createdBy === "core-import" ? "AI 生成" : q.createdBy}
                </Badge>
              )}
              {verdicts[q.id] && (
                <Badge variant={verdicts[q.id] === "ok" ? "success" : "error"} className="text-xs">
                  {verdicts[q.id] === "ok" ? "✓ OK" : "⚑ 已標記"}
                </Badge>
              )}
            </div>

            {/* Stem */}
            <div className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-sora">
              {q.stem}
            </div>

            {/* Options */}
            {q.options && (
              <div className="space-y-2">
                {Object.entries(q.options as Record<string, string>).map(([letter, text]) => {
                  const isCorrect = correctLetters.includes(letter.toUpperCase());
                  return (
                    <div
                      key={letter}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-sm transition-colors ${
                        showAnswer && isCorrect
                          ? "border-[var(--success)] bg-[var(--success)]/10"
                          : "border-[var(--border-default)]"
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                        {letter}
                      </span>
                      <span className="text-[var(--text-primary)]">{text}</span>
                      {showAnswer && isCorrect && (
                        <CheckCircle2 size={14} className="text-[var(--success)] flex-shrink-0 ml-auto mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Answer toggle */}
            <button
              onClick={() => setShowAnswer((v) => !v)}
              className="text-xs text-[var(--gold)] hover:underline"
            >
              {showAnswer ? "隱藏答案" : "顯示正確答案"}
            </button>

            {/* Explanation */}
            {showAnswer && q.explanationZh && (
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] text-sm text-[var(--text-secondary)] leading-relaxed">
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">中文解析</div>
                {q.explanationZh}
              </div>
            )}

            {/* Note field */}
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">備註（選填，供後續修正參考）</label>
              <textarea
                value={notes[q.id] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="例：答案有誤、題幹模糊、選項重複..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] outline-none resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setVerdict(q.id, "ok")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[var(--success)] text-[var(--success)] font-semibold text-sm hover:bg-[var(--success)]/10 transition-colors"
              >
                <CheckCircle2 size={16} /> 題目正確 (OK)
              </button>
              <button
                onClick={() => setVerdict(q.id, "flag")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[var(--error)] text-[var(--error)] font-semibold text-sm hover:bg-[var(--error)]/10 transition-colors"
              >
                <XCircle size={16} /> 有問題（標記）
              </button>
            </div>

            {/* Nav */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { setIdx((i) => Math.max(0, i - 1)); setShowAnswer(false); }}
                disabled={idx === 0}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--gold)] disabled:opacity-30"
              >
                <ChevronLeft size={14} /> 上一題
              </button>
              <span className="text-xs text-[var(--text-muted)] font-mono">{q.id.slice(0, 8)}…</span>
              <button
                onClick={() => { setIdx((i) => Math.min(questions.length - 1, i + 1)); setShowAnswer(false); }}
                disabled={idx === questions.length - 1}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--gold)] disabled:opacity-30"
              >
                下一題 <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Done */}
      {!loading && questions.length > 0 && answered === questions.length && (
        <div className="bg-[var(--bg-surface)] border border-[var(--success)]/30 rounded-xl p-6 text-center space-y-3">
          <CheckCircle2 size={32} className="text-[var(--success)] mx-auto" />
          <div className="text-lg font-bold text-[var(--text-primary)]">抽查完成！</div>
          <div className="text-sm text-[var(--text-secondary)]">
            共審核 {answered} 題 · 正確 {ok} 題 · 有問題 {flagged} 題
            （問題率 {answered > 0 ? Math.round((flagged / answered) * 100) : 0}%）
          </div>
          {flagged > 0 && (
            <Button size="sm" variant="gold" onClick={exportFlagged}>
              <Flag size={14} /> 匯出 {flagged} 筆問題清單 (CSV)
            </Button>
          )}
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm text-[var(--gold)] hover:underline mx-auto"
          >
            <RefreshCw size={13} /> 再抽一批
          </button>
        </div>
      )}

      {!loading && questions.length === 0 && !error && (
        <div className="flex flex-col items-center py-20 gap-4 text-center">
          <BookOpen size={40} className="text-[var(--text-muted)]" />
          <p className="text-[var(--text-secondary)]">按「開始抽樣」按鈕開始審查題目</p>
        </div>
      )}
    </div>
  );
}
