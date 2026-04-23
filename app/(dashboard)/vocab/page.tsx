"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen, Loader2, Layers, ListChecks, Keyboard, Sparkles,
  CheckCircle2, Clock, Target, Library,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface Overview {
  totalWords: number;
  learned: number;
  mastered: number;
  dueNow: number;
  notStarted: number;
  byCategory: { category: string; count: number }[];
  recentSessions: { id: string; mode: string; totalWords: number; correctCount: number; startedAt: string; endedAt: string | null }[];
}

const MODE_CARDS: { id: "FLASHCARD" | "QUIZ" | "SPELLING" | "DEFINITION"; title: string; desc: string; icon: any }[] = [
  { id: "FLASHCARD",  title: "單字卡",   desc: "看英文 → 翻面看中文＋例句，最輕鬆的記憶法",  icon: Layers },
  { id: "QUIZ",       title: "中義選擇", desc: "英文 → 選正確中文定義（4 選 1）",              icon: ListChecks },
  { id: "DEFINITION", title: "定義選字", desc: "讀英文定義 → 選正確單字（訓練臨床辨識）",       icon: Sparkles },
  { id: "SPELLING",   title: "拼字測驗", desc: "看中文 → 親手拼出英文（最紮實）",               icon: Keyboard },
];

export default function VocabHomePage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/vocab/overview", { cache: "no-store" });
      if (res.ok) setData(await res.json());
      else setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const startSession = async (mode: string) => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/vocab/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          category: selectedCategory || undefined,
          tier: selectedTier || undefined,
          count: 15,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "無法開始練習");
        return;
      }
      // Cache session in sessionStorage and navigate
      sessionStorage.setItem("vocab-session", JSON.stringify(body));
      router.push(`/vocab/practice?sid=${body.sessionId}`);
    } catch (e: any) {
      setError(e.message ?? "網路錯誤");
    } finally {
      setStarting(false);
    }
  };

  const progressPct = data && data.totalWords > 0
    ? Math.round((data.learned / data.totalWords) * 100)
    : 0;
  const masteredPct = data && data.totalWords > 0
    ? Math.round((data.mastered / data.totalWords) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-5xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <BookOpen size={22} className="text-[var(--gold)]" /> NCLEX 單字
        </h1>
        <p className="text-[var(--text-secondary)] mt-1 text-sm">
          護理專用詞庫（藥理、病理、評估、流程），用 SM-2 記憶演算法幫你長期記住每一個 NCLEX 關鍵字。
        </p>
      </div>

      {loading && (
        <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[var(--gold)]" /></div>
      )}

      {!loading && loadError && (
        <div className="py-10 flex flex-col items-center gap-3 text-center">
          <p className="text-[var(--text-muted)] text-sm">載入詞庫資料失敗</p>
          <button
            onClick={loadOverview}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            重試
          </button>
        </div>
      )}

      {!loading && data && data.totalWords === 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-10 text-center">
          <Library size={40} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-primary)] font-semibold">詞庫尚未建立</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">請聯絡管理員至後台點擊「一鍵建立 NCLEX 詞庫」</p>
        </div>
      )}

      {!loading && data && data.totalWords > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Library}    label="詞庫總量" value={data.totalWords} sub={`${data.byCategory.length} 類`} color="text-[var(--gold)]" />
            <StatCard icon={Target}     label="已學習"   value={data.learned}    sub={`${progressPct}% 覆蓋`}         color="text-[var(--blue)]" />
            <StatCard icon={CheckCircle2} label="已掌握"  value={data.mastered}   sub={`${masteredPct}%`}              color="text-[var(--success)]" />
            <StatCard icon={Clock}      label="今日到期" value={data.dueNow}     sub="SM-2 安排複習"                 color="text-[var(--warning)]" />
          </div>

          {/* Filter */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
            <div>
              <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">類別（可留空＝全部）</div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip active={!selectedCategory} onClick={() => setSelectedCategory("")}>全部</FilterChip>
                {data.byCategory.map((c) => (
                  <FilterChip key={c.category} active={selectedCategory === c.category} onClick={() => setSelectedCategory(c.category)}>
                    {c.category} <span className="opacity-60 ml-1">{c.count}</span>
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">難度層級</div>
              <div className="flex gap-1.5">
                {[{ v: 0, l: "全部" }, { v: 1, l: "Tier 1 基礎" }, { v: 2, l: "Tier 2 臨床" }, { v: 3, l: "Tier 3 進階" }].map((t) => (
                  <FilterChip key={t.v} active={selectedTier === t.v} onClick={() => setSelectedTier(t.v)}>{t.l}</FilterChip>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-[rgba(231,76,60,0.12)] text-[var(--error)] text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">選擇練習模式</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MODE_CARDS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => startSession(m.id)}
                  disabled={starting}
                  className="text-left bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--gold)] transition-colors disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--gold-dim)] flex items-center justify-center text-[var(--gold)] flex-shrink-0">
                      <m.icon size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{m.title}</div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{m.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {data.recentSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">最近練習</h2>
              <div className="space-y-2">
                {data.recentSessions.map((s) => {
                  const accuracy = s.totalWords > 0 ? Math.round((s.correctCount / s.totalWords) * 100) : 0;
                  return (
                    <div key={s.id} className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="muted">{s.mode}</Badge>
                        <span className="text-sm text-[var(--text-primary)]">{s.totalWords} 字</span>
                        <span className="text-xs text-[var(--text-muted)]">{new Date(s.startedAt).toLocaleString("zh-TW")}</span>
                      </div>
                      <Badge variant={accuracy >= 80 ? "success" : accuracy >= 60 ? "gold" : "error"}>
                        正確率 {accuracy}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: number; sub: string; color: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Icon size={14} /> {label}
      </div>
      <div className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
        active
          ? "bg-[var(--gold-dim)] border-[var(--gold)] text-[var(--gold)] font-semibold"
          : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--gold)]"
      }`}
    >
      {children}
    </button>
  );
}
