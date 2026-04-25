"use client";

import { useEffect, useState } from "react";
import { Loader2, Volume2, Save, RefreshCw, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import AudioPlayer from "@/components/audio/AudioPlayer";

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

export default function AdminToeicPage() {
  const [list, setList] = useState<ToeicQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [refreshTick, setRefreshTick] = useState(0);

  // Form state
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

  const partInfo = PARTS.find((p) => p.key === domain);
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "TOEIC",
          stem: stem || (audioScript || "Listening question"),
          stemZh: stemZh || undefined,
          scenarioEn: scenarioEn || undefined,
          optionA, optionB, optionC, optionD,
          correctAnswer: correctAnswer.toUpperCase(),
          explanationZh,
          domain,
          questionType: "MCQ",
          difficulty: "MEDIUM",
          status: "DRAFT",
          audioScript: isListening ? audioScript : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      const newId = body.id as string;

      if (isListening && audioScript) {
        await generateTts(newId, audioScript, isMulti);
      }

      setStem(""); setStemZh(""); setScenarioEn("");
      setOptionA(""); setOptionB(""); setOptionC(""); setOptionD("");
      setExplanationZh(""); setAudioScript("");
      setCorrectAnswer("A");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "建立失敗");
    } finally {
      setSaving(false);
    }
  }

  async function generateTts(questionId: string, script: string, multi: boolean) {
    setGenTtsFor(questionId);
    setGenError(null);
    try {
      const res = await fetch("/api/admin/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          script,
          mode: multi ? "multi" : "single",
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setRefreshTick((t) => t + 1);
      setPreviewQId(questionId);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "TTS 失敗");
    } finally {
      setGenTtsFor(null);
    }
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">TOEIC 題庫管理</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          建立 TOEIC 題目；Part 1–4 可用 Gemini TTS 自動產生聽力音檔
        </p>
      </div>

      {/* Create form */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
      >
        <h2 className="font-semibold text-[var(--text-primary)]">新增題目</h2>

        {/* Part picker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PARTS.map((p) => (
            <button
              key={p.key}
              onClick={() => setDomain(p.key)}
              className="text-left p-2 rounded border text-sm transition"
              style={{
                borderColor: domain === p.key ? "var(--gold)" : "var(--border-subtle)",
                background: domain === p.key ? "var(--gold-dim)" : "transparent",
                color: domain === p.key ? "var(--gold)" : "var(--text-secondary)",
              }}
            >
              <div className="font-mono text-xs">{p.key}</div>
              <div className="text-[10px] mt-0.5 text-[var(--text-muted)]">
                {p.listening ? (p.multi ? "對話聽力" : "聽力") : "閱讀"}
              </div>
            </button>
          ))}
        </div>

        {/* Listening: audio script */}
        {isListening && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              <Volume2 size={14} className="inline mr-1" />
              音檔腳本 {isMulti && <span className="text-xs text-[var(--text-muted)] ml-2">（用「名字：」分行，最多 2 位）</span>}
            </label>
            <textarea
              value={audioScript}
              onChange={(e) => setAudioScript(e.target.value)}
              placeholder={isMulti
                ? "Mark: How was your shift today, Lisa?\nLisa: It was busy — three new admissions in the ICU."
                : "Please make sure all medications are documented before the end of the shift."}
              rows={5}
              className="w-full p-3 rounded-lg border bg-[var(--bg-base)] text-[var(--text-primary)] text-sm font-mono"
              style={{ borderColor: "var(--border-subtle)" }}
            />
          </div>
        )}

        {/* Reading: scenarioEn (passage) */}
        {!isListening && (domain === "Part 6" || domain === "Part 7") && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--text-primary)]">閱讀文章</label>
            <textarea
              value={scenarioEn}
              onChange={(e) => setScenarioEn(e.target.value)}
              rows={6}
              className="w-full p-3 rounded-lg border bg-[var(--bg-base)] text-[var(--text-primary)] text-sm"
              style={{ borderColor: "var(--border-subtle)" }}
            />
          </div>
        )}

        {/* Stem */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--text-primary)]">
            題幹 (English) {isListening && <span className="text-xs text-[var(--text-muted)]">（聽力題建議只放問題，不要重述音檔）</span>}
          </label>
          <textarea
            value={stem}
            onChange={(e) => setStem(e.target.value)}
            rows={2}
            className="w-full p-3 rounded-lg border bg-[var(--bg-base)] text-[var(--text-primary)] text-sm"
            style={{ borderColor: "var(--border-subtle)" }}
          />
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["A", "B", "C", "D"] as const).map((letter) => (
            <Input
              key={letter}
              label={`選項 ${letter}`}
              value={letter === "A" ? optionA : letter === "B" ? optionB : letter === "C" ? optionC : optionD}
              onChange={(e) => {
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
          <label className="text-sm font-semibold text-[var(--text-primary)]">正確答案</label>
          <div className="flex gap-2">
            {["A", "B", "C", "D"].map((l) => (
              <button
                key={l}
                onClick={() => setCorrectAnswer(l)}
                className="w-10 h-10 rounded-lg border font-mono font-bold transition"
                style={{
                  borderColor: correctAnswer === l ? "var(--success)" : "var(--border-subtle)",
                  background: correctAnswer === l ? "rgba(46,204,113,0.12)" : "transparent",
                  color: correctAnswer === l ? "var(--success)" : "var(--text-secondary)",
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Explanation + Stem ZH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--text-primary)]">中文題幹（選填）</label>
            <textarea
              value={stemZh}
              onChange={(e) => setStemZh(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-lg border bg-[var(--bg-base)] text-[var(--text-primary)] text-sm"
              style={{ borderColor: "var(--border-subtle)" }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--text-primary)]">中文解析</label>
            <textarea
              value={explanationZh}
              onChange={(e) => setExplanationZh(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-lg border bg-[var(--bg-base)] text-[var(--text-primary)] text-sm"
              style={{ borderColor: "var(--border-subtle)" }}
            />
          </div>
        </div>

        {genError && (
          <p className="text-sm text-[var(--error)]">TTS 錯誤：{genError}</p>
        )}

        <Button onClick={createQuestion} disabled={saving || !optionA || !optionB || !optionC || !optionD || !explanationZh}>
          {saving ? <><Loader2 size={14} className="animate-spin mr-1" /> 儲存中…</> : <><Save size={14} className="mr-1" /> 儲存題目{isListening && audioScript ? "並產生音檔" : ""}</>}
        </Button>
      </div>

      {/* Existing questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">既有題目</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm p-2 rounded border bg-[var(--bg-base)]"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <option value="">全部 Parts</option>
            {PARTS.map((p) => <option key={p.key} value={p.key}>{p.key}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">載入中…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">尚無 TOEIC 題目</p>
        ) : (
          <div className="space-y-2">
            {list.map((q) => (
              <div
                key={q.id}
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {q.domain && <Badge variant="muted">{q.domain}</Badge>}
                      <Badge variant={q.status === "APPROVED" ? "success" : "muted"}>{q.status}</Badge>
                      {q.hasAudio && <Badge variant="blue">🔊 {q.audioDurationSec?.toFixed(1)}s</Badge>}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] truncate">{q.stem}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => regenerateExisting(q)}
                            disabled={genTtsFor === q.id}>
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
