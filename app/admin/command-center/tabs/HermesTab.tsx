"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { SectionLabel, MetaText, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

interface Turn {
  id: string;
  role: string;
  content: string;
  questionId: string | null;
  citedUrls?: { url: string; title?: string }[] | null;
  rating: number | null;
  createdAt: string;
  session: { userId: string };
}

interface TopAsked {
  questionId: string;
  asks: number;
  stem: string;
  errorRate: number | null;
}

export default function HermesTab() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [top, setTop] = useState<TopAsked[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, tp] = await Promise.all([
        fetch("/api/admin/hermes/turns?limit=50", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/hermes/top-asked", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setTurns(t.turns || []);
      setTop(tp.topAsked || []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, [load]);

  async function rate(id: string, r: number) {
    await fetch(`/api/admin/hermes/turns/${id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: r }),
    });
    load();
  }

  return (
    <div className="space-y-8">
      <div className="border-y border-[var(--j-line)] py-3 flex items-center gap-3">
        <SectionLabel className="!mt-0">Hermes 對話</SectionLabel>
        <span className="text-sm italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
          {turns.length} recent turns
        </span>
        <button
          onClick={load}
          className="ml-auto text-xs text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1"
          style={FONT_MONO}
        >
          <RefreshCw size={12} /> refresh
        </button>
      </div>

      {loading ? (
        <div
          className="flex items-center gap-2 italic text-[var(--j-ink-dim)] py-4"
          style={FONT_DISPLAY}
        >
          <Loader2 className="animate-spin" size={16} /> Loading...
        </div>
      ) : (
        <>
          <section>
            <SectionLabel className="mb-3">Top 20 most-asked questions</SectionLabel>
            <div className="space-y-1">
              {top.map((t) => (
                <a
                  key={t.questionId}
                  href={`/admin/questions/${t.questionId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block py-2 border-b border-[var(--j-line)]/50 hover:bg-[var(--j-phosphor-soft)]"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="italic text-[var(--j-phosphor)]" style={FONT_DISPLAY}>
                      {t.asks}
                    </span>
                    <MetaText>{t.questionId.slice(0, 8)}</MetaText>
                    <span className="text-sm text-[var(--j-ink)] truncate" style={FONT_ZH}>
                      {t.stem.slice(0, 120)}
                    </span>
                  </div>
                </a>
              ))}
              {top.length === 0 && (
                <MetaText>還沒有任何對話 — 等學員開始問</MetaText>
              )}
            </div>
          </section>

          <section>
            <SectionLabel className="mb-3">Recent turns</SectionLabel>
            <div className="space-y-3">
              {turns.map((t) => (
                <div key={t.id} className="border border-[var(--j-line)] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill tone={t.role === "assistant" ? "phosphor" : "muted"}>{t.role}</Pill>
                    <MetaText>
                      {new Date(t.createdAt).toLocaleString("zh-TW", { hour12: false })}
                    </MetaText>
                    {t.questionId && <MetaText>q={t.questionId.slice(0, 8)}</MetaText>}
                    <MetaText>user={t.session.userId.slice(0, 8)}</MetaText>
                    {t.role === "assistant" && (
                      <span className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => rate(t.id, 1)}
                          className={`p-1 ${
                            t.rating === 1 ? "text-[var(--j-phosphor)]" : "text-[var(--j-ink-dim)]"
                          }`}
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          onClick={() => rate(t.id, -1)}
                          className={`p-1 ${
                            t.rating === -1 ? "text-[var(--j-red)]" : "text-[var(--j-ink-dim)]"
                          }`}
                        >
                          <ThumbsDown size={14} />
                        </button>
                      </span>
                    )}
                  </div>
                  <div
                    className="text-sm text-[var(--j-ink)] whitespace-pre-wrap"
                    style={FONT_ZH}
                  >
                    {t.content.slice(0, 600)}
                  </div>
                  {t.citedUrls && t.citedUrls.length > 0 && (
                    <div className="mt-2 text-[10px] text-[var(--j-phosphor)]" style={FONT_MONO}>
                      sources: {t.citedUrls.map((u) => u.url).join(" · ").slice(0, 200)}
                    </div>
                  )}
                </div>
              ))}
              {turns.length === 0 && (
                <MetaText>還沒有任何對話</MetaText>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
