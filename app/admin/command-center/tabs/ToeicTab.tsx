"use client";
import { useEffect, useState } from "react";
import { Loader2, Volume2, Save, RefreshCw, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { SectionLabel, MetaText, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";
import { cn } from "@/lib/utils/cn";

const PARTS = [
  { key: "Part 1", label: "Part 1 — Photographs", listening: true },
  { key: "Part 2", label: "Part 2 — Question-Response", listening: true },
  { key: "Part 3", label: "Part 3 — Conversations", listening: true, multi: true },
  { key: "Part 4", label: "Part 4 — Short Talks", listening: true },
  { key: "Part 5", label: "Part 5 — Incomplete Sentences", listening: false },
  { key: "Part 6", label: "Part 6 — Text Completion", listening: false },
  { key: "Part 7", label: "Part 7 — Reading Comprehension", listening: false },
];

interface ToeicQuestion {
  id: string;
  stem: string;
  domain: string | null;
  status: string;
  hasAudio?: boolean;
  audioDurationSec?: number | null;
}

const TEXTAREA_CLS = "w-full p-3 border bg-[var(--j-bg)] text-[var(--j-ink)] text-sm border-[var(--j-line)] focus:outline-none focus:border-[var(--j-phosphor)] placeholder:text-[var(--j-ink-muted)] placeholder:italic";

export default function ToeicTab() {
  const [list, setList] = useState<ToeicQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [refreshTick, setRefreshTick] = useState(0);

  const [domain, setDomain] = useState("Part 5");
  const [stem, setStem] = useState("");
  const [stemZh, setStemZh] = useState("");
  const [scenarioEn, setScenarioEn] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanationZh, setExplanationZh] = useState("");
  const [audioScript, setAudioScript] = useState("");
  const [saving, setSaving] = useState(false);
  const [genTtsFor, setGenTtsFor] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [previewQId, setPreviewQId] = useState<string | null>(null);

  const partInfo = PARTS.find(p => p.key === domain);
  const isListening = !!partInfo?.listening;
  const isMulti = !!partInfo?.multi;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/questions?module=TOEIC&pageSize=100${filter ? `&domain=${encodeURIComponent(filter)}` : ""}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (alive) setList(body.items ?? body.questions ?? []);
      } catch {
        if (alive) setList([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [filter, refreshTick]);

  async function createQuestion() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "TOEIC",
          stem: stem || (audioScript || "Listening question"),
          stemZh: stemZh || undefined,
          scenarioEn: scenarioEn || undefined,
          optionA, optionB, optionC, optionD,
          correctAnswer: correctAnswer.toUpperCase(),
          explanationZh, domain, questionType: "MCQ", difficulty: "MEDIUM", status: "DRAFT",
          audioScript: isListening ? audioScript : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      const newId = body.id as string;
      if (isListening && audioScript) await generateTts(newId, audioScript, isMulti);
      setStem(""); setStemZh(""); setScenarioEn("");
      setOptionA(""); setOptionB(""); setOptionC(""); setOptionD("");
      setExplanationZh(""); setAudioScript(""); setCorrectAnswer("A");
      setRefreshTick(t => t + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "建立失敗");
    } finally { setSaving(false); }
  }

  async function generateTts(questionId: string, script: string, multi: boolean) {
    setGenTtsFor(questionId); setGenError(null);
    try {
      const res = await fetch("/api/admin/tts/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, script, mode: multi ? "multi" : "single" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setRefreshTick(t => t + 1);
      setPreviewQId(questionId);
    } catch (err) { setGenError(err instanceof Error ? err.message : "TTS 失敗"); }
    finally { setGenTtsFor(null); }
  }

  async function regenerateExisting(q: ToeicQuestion) {
    if (!q.hasAudio) {
      const script = prompt("輸入要產生的腳本（雙人對話用「Joe: …\\nJane: …」格式）：");
      if (!script) return;
      await generateTts(q.id, script, partInfo?.multi ?? false);
      return;
    }
    if (confirm("這題已有音檔，重新產生會覆蓋。繼續？")) {
      const script = prompt("輸入新腳本（留空則重用原腳本）：");
      if (!script) return;
      await generateTts(q.id, script, partInfo?.multi ?? false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Compose form */}
      <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-6 space-y-5">
        <SectionLabel className="!mt-0">Compose · 新增題目</SectionLabel>

        {/* Part picker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PARTS.map(p => (
            <button key={p.key} onClick={() => setDomain(p.key)}
              className={cn(
                "text-left p-2 border text-sm transition",
                domain === p.key
                  ? "border-[var(--j-phosphor)] bg-[var(--j-phosphor-soft)] text-[var(--j-phosphor)]"
                  : "border-[var(--j-line)] text-[var(--j-ink-dim)] hover:border-[var(--j-phosphor-line)]"
              )}>
              <div className="font-mono text-xs">{p.key}</div>
              <div className="text-[10px] mt-0.5 text-[var(--j-ink-muted)]" style={FONT_MONO}>
                {p.listening ? (p.multi ? "對話聽力" : "聽力") : "閱讀"}
              </div>
            </button>
          ))}
        </div>

        {/* Listening: audio script */}
        {isListening && (
          <div className="space-y-2">
            <label className="text-sm flex items-center gap-1 italic text-[var(--j-ink)]" style={FONT_DISPLAY}>
              <Volume2 size={14} /> 音檔腳本
              {isMulti && <span className="text-xs text-[var(--j-ink-muted)] ml-2 not-italic" style={FONT_MONO}>用「名字：」分行</span>}
            </label>
            <textarea value={audioScript} onChange={e => setAudioScript(e.target.value)}
              placeholder={isMulti
                ? "Mark: How was your shift today, Lisa?\nLisa: It was busy — three new admissions in the ICU."
                : "Please make sure all medications are documented before the end of the shift."}
              rows={5} className={cn(TEXTAREA_CLS, "font-mono")} />
          </div>
        )}

        {/* Reading: scenarioEn */}
        {!isListening && (domain === "Part 6" || domain === "Part 7") && (
          <div className="space-y-2">
            <label className="text-sm italic text-[var(--j-ink)]" style={FONT_DISPLAY}>閱讀文章</label>
            <textarea value={scenarioEn} onChange={e => setScenarioEn(e.target.value)} rows={6} className={TEXTAREA_CLS} />
          </div>
        )}

        {/* Stem */}
        <div className="space-y-2">
          <label className="text-sm italic text-[var(--j-ink)]" style={FONT_DISPLAY}>
            題幹（English）
            {isListening && <span className="text-xs text-[var(--j-ink-muted)] ml-2 not-italic" style={FONT_MONO}>聽力題建議只放問題</span>}
          </label>
          <textarea value={stem} onChange={e => setStem(e.target.value)} rows={2} className={TEXTAREA_CLS} />
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["A","B","C","D"] as const).map(letter => (
            <Input key={letter} label={`選項 ${letter}`}
              value={letter === "A" ? optionA : letter === "B" ? optionB : letter === "C" ? optionC : optionD}
              onChange={e => {
                const v = e.target.value;
                if (letter === "A") setOptionA(v);
                else if (letter === "B") setOptionB(v);
                else if (letter === "C") setOptionC(v);
                else setOptionD(v);
              }}
            />
          ))}
        </div>

        {/* Correct answer */}
        <div className="flex items-center gap-3">
          <label className="text-sm italic text-[var(--j-ink)]" style={FONT_DISPLAY}>正確答案</label>
          <div className="flex gap-2">
            {["A","B","C","D"].map(l => (
              <button key={l} onClick={() => setCorrectAnswer(l)}
                className={cn(
                  "w-10 h-10 border font-mono font-bold transition",
                  correctAnswer === l
                    ? "border-[var(--j-phosphor)] bg-[var(--j-phosphor-soft)] text-[var(--j-phosphor)]"
                    : "border-[var(--j-line)] text-[var(--j-ink-dim)] hover:border-[var(--j-phosphor-line)]"
                )}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Explanation + StemZh */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm italic text-[var(--j-ink)]" style={FONT_DISPLAY}>中文題幹（選填）</label>
            <textarea value={stemZh} onChange={e => setStemZh(e.target.value)} rows={2} className={TEXTAREA_CLS} />
          </div>
          <div className="space-y-2">
            <label className="text-sm italic text-[var(--j-ink)]" style={FONT_DISPLAY}>中文解析</label>
            <textarea value={explanationZh} onChange={e => setExplanationZh(e.target.value)} rows={2} className={TEXTAREA_CLS} />
          </div>
        </div>

        {genError && (
          <p className="text-sm text-[var(--j-red)] italic" style={FONT_DISPLAY}>TTS 錯誤：{genError}</p>
        )}

        <Button onClick={createQuestion} disabled={saving || !optionA || !optionB || !optionC || !optionD || !explanationZh}>
          {saving
            ? <><Loader2 size={14} className="animate-spin mr-1" /> 儲存中…</>
            : <><Save size={14} className="mr-1" /> 儲存題目{isListening && audioScript ? "並產生音檔" : ""}</>}
        </Button>
      </div>

      {/* Existing list */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <SectionLabel className="!mt-0">Catalogue · 既有題目</SectionLabel>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--j-phosphor)]"
            style={FONT_MONO}>
            <option value="">全部 Parts</option>
            {PARTS.map(p => <option key={p.key} value={p.key}>{p.key}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[var(--j-ink-dim)] py-4 italic" style={FONT_DISPLAY}>
            <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} /> Loading TOEIC items…
          </div>
        ) : list.length === 0 ? (
          <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-12 text-center italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
            — No TOEIC questions yet.
          </div>
        ) : (
          <div className="space-y-2">
            {list.map(q => (
              <div key={q.id} className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-3 hover:border-[var(--j-phosphor-line)] transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {q.domain && <Pill tone="muted">{q.domain}</Pill>}
                      <Pill tone={q.status === "APPROVED" ? "phosphor" : "muted"}>{q.status}</Pill>
                      {q.hasAudio && <Pill tone="phosphor">🔊 {q.audioDurationSec?.toFixed(1)}s</Pill>}
                    </div>
                    <p className="text-sm text-[var(--j-ink-dim)] truncate" style={FONT_ZH}>{q.stem}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => regenerateExisting(q)} disabled={genTtsFor === q.id}>
                      {genTtsFor === q.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : q.hasAudio ? <RefreshCw size={14} /> : <Volume2 size={14} />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPreviewQId(q.id === previewQId ? null : q.id)}>
                      {previewQId === q.id ? <Check size={14} /> : "試聽"}
                    </Button>
                  </div>
                </div>
                {previewQId === q.id && q.hasAudio && (
                  <div className="mt-3">
                    <AudioPlayer questionId={q.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
