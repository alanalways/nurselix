"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, RotateCw, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface Card {
  wordId: string;
  word: string;
  partOfSpeech: string | null;
  definitionEn: string;
  definitionZh: string;
  exampleEn: string | null;
  exampleZh: string | null;
  memoryHook: string | null;
  synonyms: string[];
  category: string;
  choices?: { key: string; text: string }[];
  correctKey?: string;
}

interface SessionPayload {
  sessionId: string;
  mode: "FLASHCARD" | "QUIZ" | "SPELLING" | "DEFINITION";
  cards: Card[];
}

type Result = "again" | "hard" | "good" | "easy";

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function VocabPracticePage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionIdFromUrl = params.get("sid");

  const [payload, setPayload] = useState<SessionPayload | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [spellInput, setSpellInput] = useState("");
  const [spellChecked, setSpellChecked] = useState(false);
  const [summary, setSummary] = useState<{ totalWords: number; correctCount: number; accuracy: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    const cached = sessionStorage.getItem("vocab-session");
    if (cached) {
      const parsed = JSON.parse(cached) as SessionPayload;
      if (!sessionIdFromUrl || parsed.sessionId === sessionIdFromUrl) {
        setPayload(parsed);
        return;
      }
    }
    // No valid cache — send user back to /vocab
    router.replace("/vocab");
  }, [router, sessionIdFromUrl]);

  const current = payload?.cards[idx];
  const isLast = payload && idx >= payload.cards.length - 1;

  const isSpellingCorrect = useMemo(() => {
    if (!current) return false;
    return normalize(spellInput) === normalize(current.word);
  }, [spellInput, current]);

  const isChoiceCorrect = selected && current?.correctKey && selected === current.correctKey;

  const submitReview = async (result: Result, correct: boolean) => {
    if (!payload || !current || submitting) return;
    setSubmitting(true);
    try {
      const timeSpent = Math.round((Date.now() - startedAt) / 1000);
      await fetch("/api/vocab/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: payload.sessionId,
          wordId: current.wordId,
          result,
          correct,
          timeSpentSec: timeSpent,
        }),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const advance = async (result: Result, correct: boolean) => {
    await submitReview(result, correct);
    if (!payload) return;
    if (isLast) {
      // finish session
      const res = await fetch(`/api/vocab/session/${payload.sessionId}/finish`, { method: "POST" });
      if (res.ok) {
        const body = await res.json();
        setSummary({ totalWords: body.totalWords, correctCount: body.correctCount, accuracy: body.accuracy });
      }
      sessionStorage.removeItem("vocab-session");
      return;
    }
    setIdx((i) => i + 1);
    setRevealed(false);
    setSelected(null);
    setSpellInput("");
    setSpellChecked(false);
  };

  if (!payload || !current) {
    return (
      <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[var(--gold)]" /></div>
    );
  }

  if (summary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 max-w-2xl mx-auto space-y-6"
      >
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] mx-auto flex items-center justify-center text-[#080E1A]">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">練習完成！</h1>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
              <div className="text-2xl font-bold font-mono text-[var(--gold)]">{summary.totalWords}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">練習字數</div>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
              <div className="text-2xl font-bold font-mono text-[var(--success)]">{summary.correctCount}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">答對</div>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
              <div className={`text-2xl font-bold font-mono ${summary.accuracy >= 80 ? "text-[var(--success)]" : summary.accuracy >= 60 ? "text-[var(--warning)]" : "text-[var(--error)]"}`}>
                {summary.accuracy}%
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">正確率</div>
            </div>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => router.push("/vocab")}>回單字首頁</Button>
            <Button variant="gold" onClick={() => router.replace("/vocab")}>再練一組</Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/vocab")} className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)] flex items-center gap-1">
          <ArrowLeft size={16} /> 返回
        </button>
        <div className="text-xs text-[var(--text-muted)] font-mono">
          {idx + 1} / {payload.cards.length}
        </div>
      </div>
      {/* progress */}
      <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)]"
          initial={{ width: 0 }}
          animate={{ width: `${((idx + 1) / payload.cards.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.wordId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-4">
            <Badge variant="muted">{current.category}</Badge>
            {current.partOfSpeech && <Badge variant="gold">{current.partOfSpeech}</Badge>}
          </div>

          {/* FLASHCARD */}
          {payload.mode === "FLASHCARD" && (
            <FlashcardView card={current} revealed={revealed} onReveal={() => setRevealed(true)} />
          )}

          {/* QUIZ */}
          {payload.mode === "QUIZ" && current.choices && (
            <ChoiceView
              prompt={<span className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">{current.word}</span>}
              subtitle="選擇最正確的中文定義"
              choices={current.choices}
              selected={selected}
              correctKey={current.correctKey ?? null}
              revealed={selected !== null}
              onSelect={(k) => { if (selected === null) setSelected(k); }}
            />
          )}

          {/* DEFINITION */}
          {payload.mode === "DEFINITION" && current.choices && (
            <ChoiceView
              prompt={<p className="text-lg md:text-xl text-[var(--text-primary)] leading-relaxed">{current.definitionEn}</p>}
              subtitle="根據英文定義選擇正確的單字"
              choices={current.choices}
              selected={selected}
              correctKey={current.correctKey ?? null}
              revealed={selected !== null}
              onSelect={(k) => { if (selected === null) setSelected(k); }}
            />
          )}

          {/* SPELLING */}
          {payload.mode === "SPELLING" && (
            <SpellingView
              card={current}
              value={spellInput}
              setValue={setSpellInput}
              checked={spellChecked}
              isCorrect={isSpellingCorrect}
              onCheck={() => setSpellChecked(true)}
            />
          )}

          {/* Reveal details */}
          {((payload.mode === "FLASHCARD" && revealed) ||
            (payload.mode !== "FLASHCARD" && payload.mode !== "SPELLING" && selected !== null) ||
            (payload.mode === "SPELLING" && spellChecked)) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="mt-5 pt-5 border-t border-[var(--border-subtle)] space-y-3"
            >
              {payload.mode !== "FLASHCARD" && (
                <div className="flex items-center gap-2">
                  {payload.mode === "SPELLING"
                    ? isSpellingCorrect
                      ? <Badge variant="success"><CheckCircle2 size={12} className="inline mr-1" />拼寫正確</Badge>
                      : <Badge variant="error"><XCircle size={12} className="inline mr-1" />正確：{current.word}</Badge>
                    : isChoiceCorrect
                      ? <Badge variant="success"><CheckCircle2 size={12} className="inline mr-1" />答對</Badge>
                      : <Badge variant="error"><XCircle size={12} className="inline mr-1" />答錯</Badge>}
                </div>
              )}

              <DetailBlock card={current} />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        {payload.mode === "FLASHCARD" && !revealed && (
          <Button variant="gold" onClick={() => setRevealed(true)}>顯示答案</Button>
        )}

        {payload.mode === "SPELLING" && !spellChecked && (
          <Button variant="gold" onClick={() => setSpellChecked(true)} disabled={spellInput.trim().length === 0}>檢查拼字</Button>
        )}

        {(payload.mode === "FLASHCARD" && revealed) && (
          <Sm2Buttons onPick={(r) => advance(r, r === "good" || r === "easy")} disabled={submitting} />
        )}

        {(payload.mode === "QUIZ" || payload.mode === "DEFINITION") && selected !== null && (
          <Sm2Buttons
            onPick={(r) => advance(r, !!isChoiceCorrect)}
            disabled={submitting}
            defaultResult={isChoiceCorrect ? "good" : "again"}
          />
        )}

        {payload.mode === "SPELLING" && spellChecked && (
          <Sm2Buttons
            onPick={(r) => advance(r, isSpellingCorrect)}
            disabled={submitting}
            defaultResult={isSpellingCorrect ? "good" : "again"}
          />
        )}
      </div>
    </div>
  );
}

function Sm2Buttons({ onPick, disabled, defaultResult }: { onPick: (r: Result) => void; disabled: boolean; defaultResult?: Result }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onPick("again")}
        disabled={disabled}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-[rgba(231,76,60,0.15)] border border-[var(--error)] text-[var(--error)] hover:bg-[rgba(231,76,60,0.25)] disabled:opacity-50"
      >
        <RotateCw size={14} className="inline mr-1" /> 再來一次 (&lt;1 天)
      </button>
      <button
        onClick={() => onPick("hard")}
        disabled={disabled}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-[rgba(243,156,18,0.15)] border border-[var(--warning)] text-[var(--warning)] hover:bg-[rgba(243,156,18,0.25)] disabled:opacity-50"
      >
        有點難
      </button>
      <button
        onClick={() => onPick("good")}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 ${
          defaultResult === "good"
            ? "bg-[var(--gold)] border-[var(--gold)] text-[#080E1A]"
            : "bg-[rgba(46,204,113,0.15)] border-[var(--success)] text-[var(--success)] hover:bg-[rgba(46,204,113,0.25)]"
        }`}
      >
        記得
      </button>
      <button
        onClick={() => onPick("easy")}
        disabled={disabled}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--blue-dim)] border border-[var(--blue)] text-[var(--blue)] hover:opacity-90 disabled:opacity-50"
      >
        太簡單
      </button>
    </div>
  );
}

function FlashcardView({ card, revealed, onReveal }: { card: Card; revealed: boolean; onReveal: () => void }) {
  return (
    <div className="text-center space-y-4" onClick={onReveal}>
      <div className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight py-6">
        {card.word}
      </div>
      {!revealed && (
        <p className="text-sm text-[var(--text-muted)]">點擊「顯示答案」查看中文釋義與例句</p>
      )}
    </div>
  );
}

function ChoiceView({
  prompt, subtitle, choices, selected, correctKey, revealed, onSelect,
}: {
  prompt: React.ReactNode;
  subtitle: string;
  choices: { key: string; text: string }[];
  selected: string | null;
  correctKey: string | null;
  revealed: boolean;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center py-3">{prompt}</div>
      <p className="text-xs text-center text-[var(--text-muted)]">{subtitle}</p>
      <div className="grid gap-2">
        {choices.map((c) => {
          const isSelected = selected === c.key;
          const isCorrect = revealed && correctKey === c.key;
          const isWrong = revealed && isSelected && correctKey !== c.key;
          return (
            <button
              key={c.key}
              onClick={() => onSelect(c.key)}
              disabled={revealed}
              className={`text-left px-4 py-3 rounded-xl border transition-all ${
                isCorrect
                  ? "border-[var(--success)] bg-[rgba(46,204,113,0.15)] text-[var(--success)]"
                  : isWrong
                  ? "border-[var(--error)] bg-[rgba(231,76,60,0.15)] text-[var(--error)]"
                  : isSelected
                  ? "border-[var(--gold)] bg-[var(--gold-dim)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--gold)]"
              } disabled:cursor-default`}
            >
              <span className="inline-block w-6 font-mono font-bold text-[var(--gold)]">{c.key}.</span>
              <span className="text-sm text-[var(--text-primary)]">{c.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpellingView({
  card, value, setValue, checked, isCorrect, onCheck,
}: {
  card: Card; value: string; setValue: (v: string) => void; checked: boolean; isCorrect: boolean; onCheck: () => void;
}) {
  return (
    <div className="space-y-4 text-center">
      <div className="py-4">
        <div className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{card.definitionZh}</div>
        {card.exampleZh && <p className="text-sm text-[var(--text-muted)] mt-2">「{card.exampleZh}」</p>}
      </div>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !checked) onCheck(); }}
        disabled={checked}
        placeholder="輸入英文單字…"
        className="w-full max-w-md mx-auto px-4 py-3 text-center text-lg font-mono rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--gold)] outline-none disabled:opacity-75"
      />
      {checked && !isCorrect && (
        <p className="text-sm text-[var(--error)]">正確拼法：<span className="font-mono font-bold">{card.word}</span></p>
      )}
    </div>
  );
}

function DetailBlock({ card }: { card: Card }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs text-[var(--text-muted)]">中文定義</span>
        <p className="text-[var(--text-primary)] mt-1">{card.definitionZh}</p>
      </div>
      <div>
        <span className="text-xs text-[var(--text-muted)]">英文定義</span>
        <p className="text-[var(--text-secondary)] mt-1">{card.definitionEn}</p>
      </div>
      {card.exampleEn && (
        <div>
          <span className="text-xs text-[var(--text-muted)]">例句</span>
          <p className="text-[var(--text-primary)] mt-1">{card.exampleEn}</p>
          {card.exampleZh && <p className="text-[var(--text-secondary)] text-xs mt-0.5">{card.exampleZh}</p>}
        </div>
      )}
      {card.synonyms.length > 0 && (
        <div>
          <span className="text-xs text-[var(--text-muted)]">同義詞</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {card.synonyms.map((s) => <Badge key={s} variant="muted">{s}</Badge>)}
          </div>
        </div>
      )}
      {card.memoryHook && (
        <div className="px-3 py-2 bg-[var(--gold-dim)] border border-[var(--gold)]/40 rounded-lg">
          <span className="text-xs text-[var(--gold)] font-semibold">記憶訣竅</span>
          <p className="text-[var(--text-primary)] mt-0.5">{card.memoryHook}</p>
        </div>
      )}
    </div>
  );
}
