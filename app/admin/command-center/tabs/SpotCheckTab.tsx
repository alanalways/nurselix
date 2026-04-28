"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Shuffle, Flag, Eye, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

interface Q {
  id: string;
  stem: string;
  stemZh?: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  optionE?: string;
  correctAnswer: string;
  correctAnswers?: string[];
  explanationZh?: string;
  domain?: string;
  difficulty?: string;
  createdBy?: string;
}

const SELECT_CLS = "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-[var(--gold)]";
const INPUT_CLS = "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-[var(--gold)] placeholder:text-[var(--text-muted)]";
const BTN_CLS = "px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--gold)] hover:border-[var(--gold)]/40 flex items-center gap-1 text-sm transition disabled:opacity-50";
const PRIMARY_BTN_CLS = "px-3 py-1.5 rounded-lg bg-[var(--gold)] text-[#080E1A] font-semibold hover:opacity-90 flex items-center gap-1 text-sm transition disabled:opacity-50";

export default function SpotCheckTab() {
  const [n, setN] = useState(20);
  const [domain, setDomain] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flagged, setFlagged] = useState<Record<string, string>>({});

  const sample = async () => {
    setLoading(true);
    setQuestions([]);
    setIdx(0);
    setShowAnswer(false);
    try {
      const params = new URLSearchParams();
      params.set("n", String(n));
      if (domain) params.set("domain", domain);
      if (difficulty) params.set("difficulty", difficulty);
      if (createdBy) params.set("createdBy", createdBy);
      const r = await fetch(`/api/admin/questions/sample?${params}`, { cache: "no-store" });
      const j = await r.json();
      setQuestions(j.sample || []);
    } finally { setLoading(false); }
  };

  const flag = (id: string, note?: string) => setFlagged(prev => ({ ...prev, [id]: note || "flagged" }));
  const unflag = (id: string) => setFlagged(prev => { const n = { ...prev }; delete n[id]; return n; });

  const exportFlagged = () => {
    const flaggedQs = questions.filter(q => flagged[q.id]);
    const csv = ["id,stem,domain,difficulty,note", ...flaggedQs.map(q => `${q.id},"${q.stem.replace(/"/g, '""').slice(0,100)}",${q.domain || ""},${q.difficulty || ""},"${flagged[q.id]}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `spot-check-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const q = questions[idx];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
        <div className="font-semibold text-[var(--text-primary)] text-sm">抽樣設定</div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
            樣本數
            <select value={n} onChange={e => setN(Number(e.target.value))} className={SELECT_CLS}>
              <option value={10}>10</option><option value={20}>20</option>
              <option value={50}>50</option><option value={100}>100</option>
            </select>
          </label>
          <input type="text" placeholder="domain" value={domain} onChange={e => setDomain(e.target.value)}
            className={cn(INPUT_CLS, "w-40")} />
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={SELECT_CLS}>
            <option value="">所有難度</option>
            <option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option>
          </select>
          <input type="text" placeholder="createdBy" value={createdBy} onChange={e => setCreatedBy(e.target.value)}
            className={cn(INPUT_CLS, "w-40")} />
          <button onClick={sample} disabled={loading} className={PRIMARY_BTN_CLS}>
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Shuffle size={14} />} 抽樣
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center text-[var(--text-muted)] text-sm">
          設定條件後按「抽樣」開始
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--text-muted)]">{idx + 1} / {questions.length}</div>
            <div className="flex gap-2">
              <button onClick={() => { setIdx(Math.max(0, idx - 1)); setShowAnswer(false); }} disabled={idx === 0}
                className={cn(BTN_CLS, "px-2 py-1.5")}><ChevronLeft size={14} /></button>
              <button onClick={() => { setIdx(Math.min(questions.length - 1, idx + 1)); setShowAnswer(false); }} disabled={idx === questions.length - 1}
                className={cn(BTN_CLS, "px-2 py-1.5")}><ChevronRight size={14} /></button>
            </div>
          </div>

          {q && (
            <>
              <div className="flex flex-wrap gap-2">
                {q.domain && <Badge>{q.domain}</Badge>}
                {q.difficulty && <Badge>{q.difficulty}</Badge>}
                <span className="text-xs text-[var(--text-muted)] font-mono">{q.id.slice(0, 8)}</span>
              </div>
              <div>
                <div className="text-xs font-medium mb-1 text-[var(--text-muted)] uppercase">題幹</div>
                <div className="text-sm text-[var(--text-primary)]">{q.stem}</div>
                {q.stemZh && <div className="text-sm text-[var(--text-secondary)] mt-1">{q.stemZh}</div>}
              </div>
              <div className="space-y-1">
                {[["A", q.optionA], ["B", q.optionB], ["C", q.optionC], ["D", q.optionD], ...(q.optionE ? [["E", q.optionE]] : [])].map(([k, v]) => (
                  <div key={k as string} className={cn(
                    "text-sm p-3 rounded-lg border",
                    showAnswer && q.correctAnswer.includes(k as string)
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                      : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  )}>
                    <span className="font-semibold mr-2 text-[var(--gold)]">{k}.</span> {v}
                  </div>
                ))}
              </div>
              {showAnswer ? (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-sm">
                  <div className="font-semibold text-blue-400">正確答案：{q.correctAnswer}</div>
                  {q.explanationZh && <div className="mt-2 text-[var(--text-secondary)] whitespace-pre-wrap">{q.explanationZh}</div>}
                </div>
              ) : (
                <button onClick={() => setShowAnswer(true)} className="text-sm text-[var(--gold)] hover:underline">顯示答案與解析</button>
              )}
              <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                {flagged[q.id] ? (
                  <button onClick={() => unflag(q.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-1 text-sm transition">
                    <Flag size={14} fill="currentColor" /> 已標記（取消）
                  </button>
                ) : (
                  <button onClick={() => {
                    const note = prompt("為何標記？") || "flagged";
                    flag(q.id, note);
                  }} className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-1 text-sm transition">
                    <Flag size={14} /> 標記為可疑
                  </button>
                )}
                <Link href={`/admin/questions/${q.id}`} target="_blank" className={BTN_CLS}>
                  <Eye size={14} /> 編輯
                </Link>
                <span className="ml-auto text-xs text-[var(--text-muted)]">已標記 {Object.keys(flagged).length} 題</span>
                {Object.keys(flagged).length > 0 && (
                  <button onClick={exportFlagged} className={BTN_CLS}>
                    <Download size={14} /> 匯出 CSV
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
