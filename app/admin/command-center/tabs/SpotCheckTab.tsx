"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Shuffle, Flag, Eye, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, MetaText, JournalCta, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

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

const SELECT_CLS = "border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--j-phosphor)]";
const INPUT_CLS = "border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--j-phosphor)] placeholder:text-[var(--j-ink-muted)] placeholder:italic";

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
    <div className="space-y-6">
      {/* Setup */}
      <div className="border-y border-[var(--j-line)] py-4">
        <SectionLabel className="mb-3">Sample setup · 抽樣設定</SectionLabel>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm text-[var(--j-ink-dim)] flex items-center gap-2" style={FONT_ZH}>
            樣本數
            <select value={n} onChange={e => setN(Number(e.target.value))} className={SELECT_CLS} style={FONT_MONO}>
              <option value={10}>10</option><option value={20}>20</option>
              <option value={50}>50</option><option value={100}>100</option>
            </select>
          </label>
          <input type="text" placeholder="domain" value={domain} onChange={e => setDomain(e.target.value)}
            className={cn(INPUT_CLS, "w-40")} />
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={SELECT_CLS} style={FONT_MONO}>
            <option value="">所有難度</option>
            <option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option>
          </select>
          <input type="text" placeholder="createdBy" value={createdBy} onChange={e => setCreatedBy(e.target.value)}
            className={cn(INPUT_CLS, "w-40")} />
          <JournalCta primary onClick={sample} disabled={loading}>
            {loading ? <Loader2 className="animate-spin inline mr-1" size={13} /> : <Shuffle size={13} className="inline mr-1" />}
            Draw a sample
          </JournalCta>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-12 text-center italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
          — Set conditions, then draw a sample to begin reading.
        </div>
      ) : (
        <article className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <MetaText>
              {idx + 1} / {questions.length} · drawn {questions.length} of {n}
            </MetaText>
            <div className="flex gap-2">
              <button onClick={() => { setIdx(Math.max(0, idx - 1)); setShowAnswer(false); }} disabled={idx === 0}
                className="px-2 py-1.5 border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] disabled:opacity-30 disabled:hover:border-[var(--j-line)] transition">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => { setIdx(Math.min(questions.length - 1, idx + 1)); setShowAnswer(false); }} disabled={idx === questions.length - 1}
                className="px-2 py-1.5 border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] disabled:opacity-30 disabled:hover:border-[var(--j-line)] transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {q && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {q.domain && <Pill>{q.domain}</Pill>}
                {q.difficulty && <Pill tone="muted">{q.difficulty}</Pill>}
                <MetaText>{q.id.slice(0, 8)}</MetaText>
              </div>

              {/* Stem */}
              <div className="mb-6">
                <SectionLabel className="mb-2">Stem</SectionLabel>
                <p className="text-[var(--j-ink)] leading-[1.7]" style={FONT_ZH}>{q.stem}</p>
                {q.stemZh && <p className="text-[var(--j-ink-dim)] mt-2 leading-[1.7]" style={FONT_ZH}>{q.stemZh}</p>}
              </div>

              {/* Options */}
              <div className="space-y-2 mb-6">
                {[["A", q.optionA], ["B", q.optionB], ["C", q.optionC], ["D", q.optionD], ...(q.optionE ? [["E", q.optionE]] : [])].map(([k, v]) => {
                  const isCorrect = showAnswer && q.correctAnswer.includes(k as string);
                  return (
                    <div key={k as string} className={cn(
                      "flex gap-3 p-3 border transition",
                      isCorrect
                        ? "border-[var(--j-phosphor)] bg-[var(--j-phosphor-soft)]"
                        : "border-[var(--j-line)] bg-transparent"
                    )}>
                      <span className={cn("italic w-6 flex-shrink-0", isCorrect ? "text-[var(--j-phosphor)]" : "text-[var(--j-ink-dim)]")} style={FONT_DISPLAY}>
                        {k}.
                      </span>
                      <span className="text-[var(--j-ink)]" style={FONT_ZH}>{v}</span>
                    </div>
                  );
                })}
              </div>

              {/* Answer + explanation */}
              {showAnswer ? (
                <div className="border-l-2 border-[var(--j-phosphor)] pl-4 mb-6">
                  <SectionLabel className="mb-2">Editor's note · 解析</SectionLabel>
                  <div className="italic text-[var(--j-ink)] mb-2" style={FONT_DISPLAY}>正確答案 · {q.correctAnswer}</div>
                  {q.explanationZh && <p className="text-[var(--j-ink-dim)] leading-[1.8] whitespace-pre-wrap" style={FONT_ZH}>{q.explanationZh}</p>}
                </div>
              ) : (
                <button onClick={() => setShowAnswer(true)} className="text-sm italic text-[var(--j-phosphor)] hover:underline mb-6 block" style={FONT_DISPLAY}>
                  reveal answer & note →
                </button>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--j-line)]">
                {flagged[q.id] ? (
                  <button onClick={() => unflag(q.id)}
                    className="px-3 py-1.5 text-sm italic text-[var(--j-red)] border border-[var(--j-red)] flex items-center gap-1 transition"
                    style={FONT_DISPLAY}>
                    <Flag size={13} fill="currentColor" /> flagged · click to clear
                  </button>
                ) : (
                  <button onClick={() => {
                    const note = prompt("Why are you flagging this?") || "flagged";
                    flag(q.id, note);
                  }} className="px-3 py-1.5 text-sm italic text-[var(--j-red)] border border-[var(--j-line)] hover:border-[var(--j-red)] flex items-center gap-1 transition"
                    style={FONT_DISPLAY}>
                    <Flag size={13} /> mark as suspect
                  </button>
                )}
                <Link href={`/admin/questions/${q.id}`} target="_blank"
                  className="px-3 py-1.5 text-sm italic text-[var(--j-ink-dim)] border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition"
                  style={FONT_DISPLAY}>
                  <Eye size={13} /> edit
                </Link>
                <span className="ml-auto text-xs italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
                  flagged · {Object.keys(flagged).length}
                </span>
                {Object.keys(flagged).length > 0 && (
                  <button onClick={exportFlagged}
                    className="px-3 py-1.5 text-sm italic text-[var(--j-ink-dim)] border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition"
                    style={FONT_DISPLAY}>
                    <Download size={13} /> export csv
                  </button>
                )}
              </div>
            </>
          )}
        </article>
      )}
    </div>
  );
}
